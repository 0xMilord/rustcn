//! Result parity tests: WASM engine output must match JS fallback output.
//!
//! These tests validate the core guarantee: correctness first, speed second.

#[cfg(test)]
mod validator_parity {
    use rustcn_engine_form_validator::{Validator, schema::ValidationSchema, types::ValidationResult};

    fn make_schema() -> String {
        r#"{"fields": {
            "email": {"required": true, "field_type": "email", "rules": [], "error_message": null},
            "name": {"required": true, "field_type": "string", "rules": [{"MinLength": 2}, {"MaxLength": 50}], "error_message": null},
            "age": {"required": false, "field_type": "number", "rules": [{"MinValue": 0}, {"MaxValue": 150}], "error_message": null}
        }}"#
    }

    #[test]
    fn test_valid_data_parity() {
        let validator = Validator::new(&make_schema()).unwrap();
        let data = r#"{"email": "test@test.com", "name": "John", "age": 30}"#;
        let result = validator.validate(data).unwrap();
        let parsed: ValidationResult = serde_json::from_str(&result).unwrap();

        assert!(parsed.valid, "Valid data should produce valid result");
        assert_eq!(parsed.field_count, 3);
        assert!(parsed.errors.is_empty());
    }

    #[test]
    fn test_invalid_email_parity() {
        let validator = Validator::new(&make_schema()).unwrap();
        let data = r#"{"email": "not-valid", "name": "John"}"#;
        let result = validator.validate(data).unwrap();
        let parsed: ValidationResult = serde_json::from_str(&result).unwrap();

        assert!(!parsed.valid);
        assert!(parsed.errors.contains_key("email"), "Invalid email should produce email error");
    }

    #[test]
    fn test_missing_required_parity() {
        let validator = Validator::new(&make_schema()).unwrap();
        let data = r#"{}"#;
        let result = validator.validate(data).unwrap();
        let parsed: ValidationResult = serde_json::from_str(&result).unwrap();

        assert!(!parsed.valid);
        assert!(parsed.errors.contains_key("email"), "Missing required email should error");
        assert!(parsed.errors.contains_key("name"), "Missing required name should error");
    }

    #[test]
    fn test_field_validation_parity() {
        let validator = Validator::new(&make_schema()).unwrap();
        let result = validator.validate_field("email", "\"bad-email\"").unwrap();
        assert!(!result.valid);
        assert!(!result.errors.is_empty());
    }

    #[test]
    fn test_single_field_valid_parity() {
        let validator = Validator::new(&make_schema()).unwrap();
        let result = validator.validate_field("email", "\"test@test.com\"").unwrap();
        assert!(result.valid);
        assert!(result.errors.is_empty());
    }

    #[test]
    fn test_name_length_rules_parity() {
        let validator = Validator::new(&make_schema()).unwrap();

        // Too short
        let result = validator.validate_field("name", "\"A\"").unwrap();
        assert!(!result.valid);

        // Valid
        let result = validator.validate_field("name", "\"John\"").unwrap();
        assert!(result.valid);

        // Too long (51 chars)
        let result = validator.validate_field("name", &format!("\"{}\"", "A".repeat(51))).unwrap();
        assert!(!result.valid);
    }

    #[test]
    fn test_age_bounds_parity() {
        let validator = Validator::new(&make_schema()).unwrap();

        // Negative
        let result = validator.validate_field("age", "-5").unwrap();
        assert!(!result.valid);

        // Valid
        let result = validator.validate_field("age", "42").unwrap();
        assert!(result.valid);

        // Over max
        let result = validator.validate_field("age", "200").unwrap();
        assert!(!result.valid);
    }

    #[test]
    fn test_empty_schema_parity() {
        let validator = Validator::new(r#"{"fields": {}}"#).unwrap();
        let result = validator.validate("{}").unwrap();
        let parsed: ValidationResult = serde_json::from_str(&result).unwrap();
        assert!(parsed.valid);
        assert_eq!(parsed.field_count, 0);
    }
}

#[cfg(test)]
mod table_parity {
    use rustcn_engine_data_table::table::DataTable;
    use rustcn_engine_data_table::types::{SortDirection, TableResult};

    fn sample_data() -> String {
        r#"[
            {"name": "Charlie", "age": 35, "status": "active"},
            {"name": "Alice", "age": 28, "status": "active"},
            {"name": "Bob", "age": 42, "status": "inactive"},
            {"name": "Diana", "age": 31, "status": "active"},
            {"name": "Eve", "age": 25, "status": "inactive"}
        ]"#
    }

    #[test]
    fn test_table_creation_parity() {
        let table = DataTable::new(&sample_data(), None).unwrap();
        assert_eq!(table.estimated_data_size(), 5);
    }

    #[test]
    fn test_sort_asc_parity() {
        let table = DataTable::new(&sample_data(), None).unwrap();
        let table = table.sort_by("name", SortDirection::Asc).unwrap();
        let result = table.execute().unwrap();
        let parsed: TableResult = serde_json::from_str(&result).unwrap();

        let names: Vec<&str> = parsed.rows.iter()
            .filter_map(|r| r["name"].as_str())
            .collect();
        assert_eq!(names, vec!["Alice", "Bob", "Charlie", "Diana", "Eve"]);
        assert_eq!(parsed.total_rows, 5);
        assert_eq!(parsed.filtered_rows, 5);
    }

    #[test]
    fn test_filter_parity() {
        let table = DataTable::new(&sample_data(), None).unwrap();
        let table = table.filter(r#"[{"column": "status", "operator": "eq", "value": "active"}]"#).unwrap();
        let result = table.execute().unwrap();
        let parsed: TableResult = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.filtered_rows, 3);
        assert_eq!(parsed.total_rows, 5);
        for row in &parsed.rows {
            assert_eq!(row["status"].as_str().unwrap(), "active");
        }
    }

    #[test]
    fn test_pagination_parity() {
        let table = DataTable::new(&sample_data(), None).unwrap();
        let table = table.sort_by("name", SortDirection::Asc).unwrap();
        let table = table.paginate(1, 2).unwrap();
        let result = table.execute().unwrap();
        let parsed: TableResult = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.rows.len(), 2);
        assert_eq!(parsed.page, 1);
        assert_eq!(parsed.page_size, 2);
        assert_eq!(parsed.total_pages, 3);

        let names: Vec<&str> = parsed.rows.iter()
            .filter_map(|r| r["name"].as_str())
            .collect();
        assert_eq!(names, vec!["Alice", "Bob"]);
    }

    #[test]
    fn test_filter_and_sort_parity() {
        let table = DataTable::new(&sample_data(), None).unwrap();
        let table = table.filter(r#"[{"column": "status", "operator": "eq", "value": "active"}]"#).unwrap();
        let table = table.sort_by("age", SortDirection::Asc).unwrap();
        let result = table.execute().unwrap();
        let parsed: TableResult = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.filtered_rows, 3);
        let ages: Vec<i64> = parsed.rows.iter()
            .filter_map(|r| r["age"].as_i64())
            .collect();
        assert_eq!(ages, vec![28, 31, 35]);
    }

    #[test]
    fn test_contains_filter_parity() {
        let table = DataTable::new(&sample_data(), None).unwrap();
        let table = table.filter(r#"[{"column": "name", "operator": "contains", "value": "li"}]"#).unwrap();
        let result = table.execute().unwrap();
        let parsed: TableResult = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.filtered_rows, 2); // Charlie, Alice
    }

    #[test]
    fn test_gt_filter_parity() {
        let table = DataTable::new(&sample_data(), None).unwrap();
        let table = table.filter(r#"[{"column": "age", "operator": "gt", "value": 30}]"#).unwrap();
        let result = table.execute().unwrap();
        let parsed: TableResult = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.filtered_rows, 3); // Charlie 35, Bob 42, Diana 31
    }

    #[test]
    fn test_empty_table_parity() {
        let table = DataTable::new("[]", None).unwrap();
        let result = table.execute().unwrap();
        let parsed: TableResult = serde_json::from_str(&result).unwrap();

        assert_eq!(parsed.rows.len(), 0);
        assert_eq!(parsed.total_rows, 0);
        assert_eq!(parsed.total_pages, 1);
        assert_eq!(parsed.page, 1);
    }

    #[test]
    fn test_multi_sort_parity() {
        let table = DataTable::new(&sample_data(), None).unwrap();
        let table = table.sort_by("status", SortDirection::Asc).unwrap();
        let table = table.sort_by("age", SortDirection::Desc).unwrap();
        let result = table.execute().unwrap();
        let parsed: TableResult = serde_json::from_str(&result).unwrap();

        let names: Vec<&str> = parsed.rows.iter()
            .filter_map(|r| r["name"].as_str())
            .collect();
        // Active by age desc: Charlie(35), Diana(31), Alice(28), then inactive: Bob(42), Eve(25)
        assert_eq!(names, vec!["Charlie", "Diana", "Alice", "Bob", "Eve"]);
    }
}

#[cfg(test)]
mod markdown_parity {
    use rustcn_engine_markdown::parser::MarkdownParser;
    use rustcn_engine_markdown::types::{RenderOptions, RenderResult};

    #[test]
    fn test_basic_render_parity() {
        let parser = MarkdownParser::new();
        let md = "# Hello\n\nThis is **bold** and *italic*.\n";
        let result = parser.render(md, &RenderOptions::default()).unwrap();
        let parsed: RenderResult = serde_json::from_str(&result).unwrap();

        assert!(!parsed.html.is_empty());
        assert!(parsed.html.contains("<h1"));
        assert!(parsed.html.contains("<strong>"));
        assert!(parsed.html.contains("<em>"));
        assert!(parsed.parse_time_ms >= 0.0);
        assert!(parsed.input_bytes > 0);
    }

    #[test]
    fn test_code_block_parity() {
        let parser = MarkdownParser::new();
        let md = "```\nfn main() {}\n```";
        let result = parser.render(md, &RenderOptions::default()).unwrap();
        let parsed: RenderResult = serde_json::from_str(&result).unwrap();

        assert!(parsed.html.contains("<pre>"));
        assert!(parsed.html.contains("fn main()"));
    }

    #[test]
    fn test_link_parity() {
        let parser = MarkdownParser::new();
        let md = "[Google](https://google.com)";
        let result = parser.render(md, &RenderOptions::default()).unwrap();
        let parsed: RenderResult = serde_json::from_str(&result).unwrap();

        assert!(parsed.html.contains("<a"));
        assert!(parsed.html.contains("https://google.com"));
    }

    #[test]
    fn test_list_parity() {
        let parser = MarkdownParser::new();
        let md = "- Item 1\n- Item 2\n- Item 3";
        let result = parser.render(md, &RenderOptions::default()).unwrap();
        let parsed: RenderResult = serde_json::from_str(&result).unwrap();

        assert!(parsed.html.contains("<ul>"));
        assert!(parsed.html.contains("<li>Item 1</li>"));
    }

    #[test]
    fn test_sanitize_parity() {
        let parser = MarkdownParser::new();
        let md = "# Title\n\n<script>alert('xss')</script>\n\n<p>Safe</p>";
        let result = parser.render(md, &RenderOptions { sanitize: true, ..Default::default() }).unwrap();
        let parsed: RenderResult = serde_json::from_str(&result).unwrap();

        assert!(!parsed.html.contains("<script>"));
        assert!(!parsed.html.contains("alert"));
    }

    #[test]
    fn test_render_with_prefix_parity() {
        let parser = MarkdownParser::new();
        let md = "# Title";
        let html = parser.render_with_prefix(md, "doc-").unwrap();

        assert!(html.contains("doc-title"));
    }
}

#[cfg(test)]
mod engine_core_parity {
    use rustcn_engine_core::{ThresholdCheck, MemoryPool, EngineConfig};

    #[test]
    fn test_threshold_constants() {
        assert_eq!(ThresholdCheck::FORM_VALIDATOR_MIN_FIELDS, 10);
        assert_eq!(ThresholdCheck::DATA_TABLE_MIN_ROWS, 1000);
        assert_eq!(ThresholdCheck::MARKDOWN_MIN_BYTES, 10_240);
    }

    #[test]
    fn test_should_use_wasm() {
        assert!(ThresholdCheck::should_use_wasm("form-validator", 15));
        assert!(!ThresholdCheck::should_use_wasm("form-validator", 5));
        assert!(ThresholdCheck::should_use_wasm("data-table", 2000));
        assert!(!ThresholdCheck::should_use_wasm("data-table", 500));
        assert!(ThresholdCheck::should_use_wasm("markdown", 20_000));
        assert!(!ThresholdCheck::should_use_wasm("markdown", 5_000));
    }

    #[test]
    fn test_memory_pool() {
        let mut pool = MemoryPool::new(5);
        assert!(pool.is_empty());
        assert_eq!(pool.len(), 0);

        let buf = pool.acquire(100);
        assert_eq!(pool.len(), 1);
        assert_eq!(buf.len(), 100);

        let buf_to_release = pool.acquire(200);
        assert_eq!(buf_to_release.len(), 200);
        assert_eq!(pool.len(), 2);
    }

    #[test]
    fn test_engine_config_defaults() {
        let config = EngineConfig::default();
        assert!(config.enable_wasm);
        assert!(config.threshold_auto);
        assert!(!config.log_performance);
    }
}
