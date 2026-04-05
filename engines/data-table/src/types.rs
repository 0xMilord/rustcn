//! Type definitions for the data table engine.

use serde::{Deserialize, Serialize};

/// Sort direction.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SortDirection {
    Asc,
    Desc,
}

/// A filter condition for table data.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterCondition {
    /// The column to filter on.
    pub column: String,
    /// The operator: eq, neq, gt, gte, lt, lte, contains, startswith, endswith.
    pub operator: String,
    /// The value to compare against.
    pub value: serde_json::Value,
}

/// A column definition.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnDef {
    /// The data key for this column.
    pub key: String,
    /// The display label.
    pub label: String,
    /// Whether this column is sortable.
    #[serde(default = "default_true")]
    pub sortable: bool,
}

fn default_true() -> bool { true }

/// Paginated data with metadata.
#[derive(Debug, Clone)]
pub struct PagedData {
    pub rows: Vec<serde_json::Value>,
    pub total_pages: usize,
    pub current_page: usize,
    pub page_size: usize,
}

/// Result of a table execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableResult {
    /// The paginated rows to display.
    pub rows: Vec<serde_json::Value>,
    /// Total rows before filtering.
    #[serde(rename = "total_rows")]
    pub total_rows: usize,
    /// Total rows after filtering.
    #[serde(rename = "filtered_rows")]
    pub filtered_rows: usize,
    /// Current page number (1-indexed).
    pub page: usize,
    /// Rows per page.
    #[serde(rename = "page_size")]
    pub page_size: usize,
    /// Total number of pages.
    #[serde(rename = "total_pages")]
    pub total_pages: usize,
    /// Column definitions.
    pub columns: Vec<ColumnDef>,
    /// Time taken to execute in milliseconds.
    #[serde(rename = "execution_time_ms")]
    pub execution_time_ms: f64,
}

impl rustcn_engine_core::Engine for crate::table::DataTable {
    fn name(&self) -> &str { "data-table" }

    fn execute(&self, _input: &str) -> Result<String, rustcn_engine_core::EngineError> {
        self.execute()
            .map(|r| serde_json::to_string(&r).unwrap_or_default())
    }

    fn estimated_data_size(&self) -> usize {
        self.rows.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_table_result_serialization() {
        let result = TableResult {
            rows: vec![serde_json::json!({"name": "Alice"})],
            total_rows: 100,
            filtered_rows: 50,
            page: 1,
            page_size: 25,
            total_pages: 2,
            columns: vec![ColumnDef { key: "name".to_string(), label: "Name".to_string(), sortable: true }],
            execution_time_ms: 5.2,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("total_rows"));
        assert!(json.contains("filtered_rows"));
        assert!(json.contains("execution_time_ms"));
    }

    #[test]
    fn test_filter_condition_serialization() {
        let filter = FilterCondition {
            column: "status".to_string(),
            operator: "eq".to_string(),
            value: serde_json::Value::String("active".to_string()),
        };
        let json = serde_json::to_string(&filter).unwrap();
        assert!(json.contains("status"));
        assert!(json.contains("eq"));
    }

    #[test]
    fn test_column_def_defaults() {
        let col = ColumnDef { key: "id".to_string(), label: "ID".to_string(), sortable: true };
        assert!(col.sortable);
    }
}
