//! Core data table engine.
//!
//! Supports sorting (single and multi-column), filtering with various operators,
//! and pagination. Designed for datasets of 1000+ rows where JavaScript
//! performance starts to degrade.

use rustcn_engine_core::EngineError;
use crate::types::{TableResult, SortDirection, FilterCondition, ColumnDef};

/// A high-performance data table.
pub struct DataTable {
    /// Original data rows.
    rows: Vec<serde_json::Value>,
    /// Column definitions.
    columns: Vec<ColumnDef>,
    /// Sort specifications (order matters for multi-column).
    sort_specs: Vec<(String, SortDirection)>,
    /// Filter conditions (all must match -- AND logic).
    filters: Vec<FilterCondition>,
    /// Pagination: (page, page_size). None = all rows.
    pagination: Option<(usize, usize)>,
}

impl DataTable {
    /// Create a new table from JSON rows and optional column definitions.
    pub fn new(rows_json: &str, columns_json: Option<&str>) -> Result<Self, EngineError> {
        let rows: Vec<serde_json::Value> = serde_json::from_str(rows_json)
            .map_err(|e| EngineError::ValidationError(format!("Invalid rows JSON: {}", e)))?;

        let columns: Vec<ColumnDef> = match columns_json {
            Some(json) if !json.is_empty() => serde_json::from_str(json)
                .map_err(|e| EngineError::ValidationError(format!("Invalid columns JSON: {}", e)))?,
            _ => {
                // Auto-generate columns from first row keys
                rows.first()
                    .map(|r| {
                        r.as_object()
                            .map(|obj| {
                                obj.keys()
                                    .map(|k| ColumnDef {
                                        key: k.clone(),
                                        label: k.clone(),
                                        sortable: true,
                                    })
                                    .collect()
                            })
                            .unwrap_or_default()
                    })
                    .unwrap_or_default()
            }
        };

        Ok(Self {
            rows,
            columns,
            sort_specs: Vec::new(),
            filters: Vec::new(),
            pagination: None,
        })
    }

    /// Add a sort specification.
    pub fn sort_by(mut self, column: &str, direction: SortDirection) -> Result<Self, EngineError> {
        // Verify column exists
        let has_column = self.rows.first()
            .and_then(|r| r.get(column))
            .is_some() || self.columns.iter().any(|c| c.key == column);

        if !has_column && !self.rows.is_empty() {
            return Err(EngineError::ValidationError(format!("Sort column '{}' not found in data", column)));
        }

        self.sort_specs.push((column.to_string(), direction));
        Ok(self)
    }

    /// Add filter conditions from JSON.
    pub fn filter(mut self, filters_json: &str) -> Result<Self, EngineError> {
        let filters: Vec<FilterCondition> = serde_json::from_str(filters_json)
            .map_err(|e| EngineError::ValidationError(format!("Invalid filters JSON: {}", e)))?;
        self.filters = filters;
        Ok(self)
    }

    /// Set pagination.
    pub fn paginate(mut self, page: usize, page_size: usize) -> Result<Self, EngineError> {
        if page == 0 {
            return Err(EngineError::ValidationError("Page number must be >= 1".to_string()));
        }
        if page_size == 0 {
            return Err(EngineError::ValidationError("Page size must be >= 1".to_string()));
        }
        self.pagination = Some((page, page_size));
        Ok(self)
    }

    /// Execute all operations and return the result.
    pub fn execute(&self) -> Result<TableResult, EngineError> {
        use web_time::Instant;
        let start = Instant::now();

        let total_rows = self.rows.len();

        // Step 1: Filter
        let filtered = if self.filters.is_empty() {
            self.rows.clone()
        } else {
            self.rows.iter()
                .filter(|row| self.matches_all_filters(row))
                .cloned()
                .collect()
        };

        let filtered_count = filtered.len();

        // Step 2: Sort
        let sorted = if self.sort_specs.is_empty() {
            filtered
        } else {
            let mut data = filtered;
            // Stable sort by all sort specs in reverse order (last spec = primary)
            for (column, direction) in self.sort_specs.iter().rev() {
                let dir = *direction;
                data.sort_by(|a, b| {
                    let va = a.get(column);
                    let vb = b.get(column);
                    compare_values(va, vb, dir)
                });
            }
            data
        };

        // Step 3: Paginate
        let (page, page_size, total_pages, paged_rows) = match self.pagination {
            Some((page, page_size)) => {
                let total_pages = (sorted.len() + page_size - 1) / page_size;
                let clamped_page = page.min(total_pages.max(1));
                let start_idx = (clamped_page - 1) * page_size;
                let end_idx = (start_idx + page_size).min(sorted.len());
                let rows: Vec<serde_json::Value> = sorted[start_idx..end_idx].to_vec();
                (clamped_page, page_size, total_pages, rows)
            }
            None => (1, sorted.len(), 1, sorted),
        };

        let execution_time_ms = start.elapsed().as_secs_f64() * 1000.0;

        Ok(TableResult {
            rows: paged_rows,
            total_rows,
            filtered_rows: filtered_count,
            page,
            page_size,
            total_pages,
            columns: self.columns.clone(),
            execution_time_ms,
        })
    }

    /// Check if a row matches all filter conditions (AND logic).
    fn matches_all_filters(&self, row: &serde_json::Value) -> bool {
        self.filters.iter().all(|f| self.matches_filter(row, f))
    }

    /// Check if a row matches a single filter condition.
    fn matches_filter(&self, row: &serde_json::Value, condition: &FilterCondition) -> bool {
        let value = row.get(&condition.column);
        match value {
            None => false,
            Some(v) => apply_operator(v, &condition.operator, &condition.value),
        }
    }
}

/// Compare two JSON values for sorting.
fn compare_values(a: Option<&serde_json::Value>, b: Option<&serde_json::Value>, direction: SortDirection) -> std::cmp::Ordering {
    let order = match (a, b) {
        (None, None) => std::cmp::Ordering::Equal,
        (None, Some(_)) => std::cmp::Ordering::Less,
        (Some(_), None) => std::cmp::Ordering::Greater,
        (Some(va), Some(vb)) => {
            // Try numeric comparison first
            if let (Some(na), Some(nb)) = (va.as_f64(), vb.as_f64()) {
                return na.partial_cmp(&nb).unwrap_or(std::cmp::Ordering::Equal);
            }
            // Fall back to string comparison
            let sa = va.as_str().map(|s| s.to_lowercase()).unwrap_or_default();
            let sb = vb.as_str().map(|s| s.to_lowercase()).unwrap_or_default();
            sa.cmp(&sb)
        }
    };

    match direction {
        SortDirection::Asc => order,
        SortDirection::Desc => order.reverse(),
    }
}

/// Apply a filter operator to a value.
fn apply_operator(value: &serde_json::Value, operator: &str, target: &serde_json::Value) -> bool {
    match operator {
        "eq" => value == target,
        "neq" => value != target,
        "gt" => compare_nums(value, target).map(|o| o == std::cmp::Ordering::Greater).unwrap_or(false),
        "gte" => compare_nums(value, target).map(|o| o != std::cmp::Ordering::Less).unwrap_or(false),
        "lt" => compare_nums(value, target).map(|o| o == std::cmp::Ordering::Less).unwrap_or(false),
        "lte" => compare_nums(value, target).map(|o| o != std::cmp::Ordering::Greater).unwrap_or(false),
        "contains" => {
            let s = value.as_str().unwrap_or("");
            let t = target.as_str().unwrap_or("");
            s.to_lowercase().contains(&t.to_lowercase())
        }
        "startswith" => {
            let s = value.as_str().unwrap_or("");
            let t = target.as_str().unwrap_or("");
            s.to_lowercase().starts_with(&t.to_lowercase())
        }
        "endswith" => {
            let s = value.as_str().unwrap_or("");
            let t = target.as_str().unwrap_or("");
            s.to_lowercase().ends_with(&t.to_lowercase())
        }
        _ => true,
    }
}

/// Compare two values as numbers.
fn compare_nums(a: &serde_json::Value, b: &serde_json::Value) -> Option<std::cmp::Ordering> {
    let na = a.as_f64()?;
    let nb = b.as_f64()?;
    na.partial_cmp(&nb)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_rows() -> String {
        r#"[
            {"name": "Charlie", "age": 35, "status": "active"},
            {"name": "Alice", "age": 28, "status": "active"},
            {"name": "Bob", "age": 42, "status": "inactive"},
            {"name": "Diana", "age": 31, "status": "active"},
            {"name": "Eve", "age": 25, "status": "inactive"}
        ]"#.to_string()
    }

    #[test]
    fn test_create_table() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        assert_eq!(table.rows.len(), 5);
        assert_eq!(table.columns.len(), 3);
    }

    #[test]
    fn test_sort_asc() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        let table = table.sort_by("name", SortDirection::Asc).unwrap();
        let result = table.execute().unwrap();
        let names: Vec<&str> = result.rows.iter()
            .filter_map(|r| r["name"].as_str())
            .collect();
        assert_eq!(names, vec!["Alice", "Bob", "Charlie", "Diana", "Eve"]);
    }

    #[test]
    fn test_sort_desc() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        let table = table.sort_by("age", SortDirection::Desc).unwrap();
        let result = table.execute().unwrap();
        let ages: Vec<i64> = result.rows.iter()
            .filter_map(|r| r["age"].as_i64())
            .collect();
        assert_eq!(ages, vec![42, 35, 31, 28, 25]);
    }

    #[test]
    fn test_filter_eq() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        let table = table.filter(r#"[{"column": "status", "operator": "eq", "value": "active"}]"#).unwrap();
        let result = table.execute().unwrap();
        assert_eq!(result.filtered_rows, 3);
        assert_eq!(result.total_rows, 5);
    }

    #[test]
    fn test_filter_contains() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        let table = table.filter(r#"[{"column": "name", "operator": "contains", "value": "li"}]"#).unwrap();
        let result = table.execute().unwrap();
        // Charlie, Alice contain "li"
        assert_eq!(result.filtered_rows, 2);
    }

    #[test]
    fn test_filter_gt() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        let table = table.filter(r#"[{"column": "age", "operator": "gt", "value": 30}]"#).unwrap();
        let result = table.execute().unwrap();
        // Charlie 35, Bob 42, Diana 31
        assert_eq!(result.filtered_rows, 3);
    }

    #[test]
    fn test_pagination() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        let table = table.sort_by("name", SortDirection::Asc).unwrap();
        let table = table.paginate(1, 2).unwrap();
        let result = table.execute().unwrap();
        assert_eq!(result.rows.len(), 2);
        assert_eq!(result.total_pages, 3);
        assert_eq!(result.page, 1);
        assert_eq!(result.page_size, 2);
    }

    #[test]
    fn test_pagination_page_2() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        let table = table.sort_by("name", SortDirection::Asc).unwrap();
        let table = table.paginate(2, 2).unwrap();
        let result = table.execute().unwrap();
        assert_eq!(result.rows.len(), 2);
        assert_eq!(result.page, 2);
        let names: Vec<&str> = result.rows.iter()
            .filter_map(|r| r["name"].as_str())
            .collect();
        assert_eq!(names, vec!["Charlie", "Diana"]);
    }

    #[test]
    fn test_filter_and_sort_combined() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        let table = table.filter(r#"[{"column": "status", "operator": "eq", "value": "active"}]"#).unwrap();
        let table = table.sort_by("age", SortDirection::Asc).unwrap();
        let result = table.execute().unwrap();
        assert_eq!(result.filtered_rows, 3);
        let ages: Vec<i64> = result.rows.iter()
            .filter_map(|r| r["age"].as_i64())
            .collect();
        assert_eq!(ages, vec![28, 31, 35]);
    }

    #[test]
    fn test_empty_data() {
        let table = DataTable::new("[]", None).unwrap();
        let result = table.execute().unwrap();
        assert_eq!(result.rows.len(), 0);
        assert_eq!(result.total_rows, 0);
        assert_eq!(result.total_pages, 1);
    }

    #[test]
    fn test_invalid_sort_column() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        let result = table.sort_by("nonexistent", SortDirection::Asc);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_json() {
        let result = DataTable::new("not json", None);
        assert!(result.is_err());
    }

    #[test]
    fn test_pagination_zero_page() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        let result = table.paginate(0, 10);
        assert!(result.is_err());
    }

    #[test]
    fn test_multi_column_sort() {
        let table = DataTable::new(&sample_rows(), None).unwrap();
        let table = table.sort_by("status", SortDirection::Asc).unwrap();
        let table = table.sort_by("age", SortDirection::Desc).unwrap();
        let result = table.execute().unwrap();
        // Active sorted by age desc: Charlie(35), Diana(31), Alice(28)
        // Then inactive: Bob(42), Eve(25)
        let names: Vec<&str> = result.rows.iter()
            .filter_map(|r| r["name"].as_str())
            .collect();
        assert_eq!(names, vec!["Charlie", "Diana", "Alice", "Bob", "Eve"]);
    }
}
