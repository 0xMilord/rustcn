//! WASM bindings for the data table engine.
//!
//! Exposes a `DataTable` struct callable from JavaScript via wasm-bindgen.
//!
//! # Usage from JavaScript
//! ```js
//! const table = DataTable.new(rowsJson, columnsJson);
//! const result = table.sortBy("name", "asc").filter(filterJson).paginate(1, 25).execute();
//! ```

use rustcn_engine_core::Engine;
use wasm_bindgen::prelude::*;

mod table;
mod types;

use table::DataTable as CoreTable;

/// A high-performance data table engine powered by Rust WASM.
/// Use this for tables with 1000+ rows where JavaScript sorting/filtering
/// becomes sluggish. For smaller datasets, the JS fallback will be faster.
#[wasm_bindgen]
pub struct DataTable {
    inner: CoreTable,
}

#[wasm_bindgen]
impl DataTable {
    /// Create a new data table from rows (JSON array) and optional column definitions.
    ///
    /// # Rows format
    /// JSON array of objects: `[{"name": "Alice", "age": 30}, ...]`
    ///
    /// # Columns format (optional)
    /// JSON array of column definitions: `[{"key": "name", "label": "Name", "sortable": true}]`
    #[wasm_bindgen(constructor)]
    pub fn new(rows_json: &str, columns_json: Option<&str>) -> Result<DataTable, JsValue> {
        CoreTable::new(rows_json, columns_json)
            .map(|inner| DataTable { inner })
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Add a sort specification. Call multiple times for multi-column sort.
    ///
    /// Direction: "asc" or "desc".
    #[wasm_bindgen(js_name = sortBy)]
    pub fn sort_by(&self, column: &str, direction: &str) -> Result<DataTable, JsValue> {
        let dir = direction.to_lowercase();
        let dir = if dir == "desc" { types::SortDirection::Desc } else { types::SortDirection::Asc };
        self.inner.sort_by(column, dir)
            .map(|table| DataTable { inner: table })
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Add filter conditions as a JSON array.
    ///
    /// # Filter format
    /// `[{"column": "status", "operator": "eq", "value": "active"}, ...]`
    /// Operators: "eq", "neq", "gt", "gte", "lt", "lte", "contains", "startswith", "endswith"
    #[wasm_bindgen]
    pub fn filter(&self, filters_json: &str) -> Result<DataTable, JsValue> {
        self.inner.filter(filters_json)
            .map(|table| DataTable { inner: table })
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Set pagination: page number (1-indexed) and page size.
    #[wasm_bindgen]
    pub fn paginate(&self, page: usize, page_size: usize) -> Result<DataTable, JsValue> {
        self.inner.paginate(page, page_size)
            .map(|table| DataTable { inner: table })
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Execute all operations and return the result as JSON.
    ///
    /// Returns: `{ rows: [...], total_rows: N, page: 1, page_size: 25, total_pages: N, execution_time_ms: 0.5 }`
    #[wasm_bindgen]
    pub fn execute(&self) -> Result<String, JsValue> {
        self.inner.execute()
            .map(|r| serde_json::to_string(&r).unwrap_or_default())
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Returns the total row count of the original data.
    #[wasm_bindgen(js_name = rowCount)]
    pub fn row_count(&self) -> usize {
        self.inner.estimated_data_size()
    }

    /// Returns the engine name identifier.
    #[wasm_bindgen(js_name = engineName)]
    pub fn engine_name(&self) -> String {
        self.inner.name().to_string()
    }
}
