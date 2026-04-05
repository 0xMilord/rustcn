/// Threshold-based cost model for deciding between WASM and JavaScript execution.
///
/// Crossing the JavaScript-WASM boundary incurs serialization and
/// deserialization overhead. For small inputs, this overhead dominates
/// execution time, making native JavaScript execution faster despite
/// WASM's superior compute performance.
///
/// `ThresholdCheck` provides engine-specific thresholds that represent
/// the approximate minimum data size at which WASM execution becomes
/// beneficial.
///
/// # Thresholds
///
/// | Engine          | Threshold     | Rationale                                    |
/// |-----------------|---------------|----------------------------------------------|
/// | Form validator  | 10+ fields    | Validation logic is fast; serialization dominates |
/// | Data table      | 1000+ rows    | Row iteration benefits from WASM speed       |
/// | Markdown        | 10 KB+        | Parsing overhead requires larger documents   |
///
/// # Example
///
/// ```
/// use rustcn_engine_core::threshold::ThresholdCheck;
///
/// // A small form with 5 fields should NOT use WASM
/// assert!(!ThresholdCheck::should_use_wasm("form-validator", 5));
///
/// // A large table with 2000 rows SHOULD use WASM
/// assert!(ThresholdCheck::should_use_wasm("data-table", 2000));
///
/// // A large markdown document SHOULD use WASM
/// assert!(ThresholdCheck::should_use_wasm("markdown", 20_000));
/// ```
pub struct ThresholdCheck;

impl ThresholdCheck {
    /// Minimum number of fields for form validation to benefit from WASM.
    ///
    /// Form validation logic executes quickly per field. The serialization
    /// overhead of crossing the JS-WASM boundary dominates unless there are
    /// enough fields to amortize the fixed cost. Empirically, 10 fields is
    /// the approximate crossover point.
    pub const FORM_VALIDATOR_MIN_FIELDS: usize = 10;

    /// Minimum number of rows for data table operations to benefit from WASM.
    ///
    /// Table operations (sorting, filtering, aggregation) scale with row
    /// count. WASM's execution speed advantage becomes meaningful at around
    /// 1000 rows, where the compute time exceeds the serialization overhead.
    pub const DATA_TABLE_MIN_ROWS: usize = 1000;

    /// Minimum size in bytes for markdown processing to benefit from WASM.
    ///
    /// Markdown parsing and rendering has moderate per-byte cost. Documents
    /// smaller than 10 KB are faster to process in JavaScript because the
    /// serialization overhead outweighs the compute benefit.
    pub const MARKDOWN_MIN_BYTES: usize = 10_240;

    /// Returns `true` if the data size justifies WASM execution for the
    /// given engine.
    ///
    /// The `data_size` parameter is interpreted differently depending on
    /// the engine:
    ///
    /// - `form-validator`: number of fields
    /// - `data-table`: number of rows
    /// - `markdown`: size in bytes
    ///
    /// For unrecognized engine names, this function returns `false` to
    /// default to JavaScript execution (the safer choice).
    ///
    /// # Examples
    ///
    /// ```
    /// use rustcn_engine_core::threshold::ThresholdCheck;
    ///
    /// assert!(ThresholdCheck::should_use_wasm("form-validator", 15));
    /// assert!(!ThresholdCheck::should_use_wasm("form-validator", 3));
    ///
    /// assert!(ThresholdCheck::should_use_wasm("data-table", 5000));
    /// assert!(!ThresholdCheck::should_use_wasm("data-table", 100));
    ///
    /// assert!(ThresholdCheck::should_use_wasm("markdown", 15_000));
    /// assert!(!ThresholdCheck::should_use_wasm("markdown", 1024));
    ///
    /// // Unknown engine defaults to false
    /// assert!(!ThresholdCheck::should_use_wasm("unknown-engine", 999_999));
    /// ```
    pub fn should_use_wasm(engine_name: &str, data_size: usize) -> bool {
        let threshold = Self::threshold_for(engine_name);
        data_size >= threshold
    }

    /// Returns the threshold value for the given engine name.
    ///
    /// The comparison is case-sensitive and uses exact string matching.
    /// If the engine name is not recognized, `usize::MAX` is returned so
    /// that [`should_use_wasm`][ThresholdCheck::should_use_wasm] will
    /// always return `false` for unknown engines.
    ///
    /// # Examples
    ///
    /// ```
    /// use rustcn_engine_core::threshold::ThresholdCheck;
    ///
    /// assert_eq!(
    ///     ThresholdCheck::threshold_for("form-validator"),
    ///     ThresholdCheck::FORM_VALIDATOR_MIN_FIELDS
    /// );
    /// assert_eq!(
    ///     ThresholdCheck::threshold_for("data-table"),
    ///     ThresholdCheck::DATA_TABLE_MIN_ROWS
    /// );
    /// assert_eq!(
    ///     ThresholdCheck::threshold_for("markdown"),
    ///     ThresholdCheck::MARKDOWN_MIN_BYTES
    /// );
    /// assert_eq!(ThresholdCheck::threshold_for("unknown"), usize::MAX);
    /// ```
    pub fn threshold_for(engine_name: &str) -> usize {
        match engine_name {
            "form-validator" => Self::FORM_VALIDATOR_MIN_FIELDS,
            "data-table" => Self::DATA_TABLE_MIN_ROWS,
            "markdown" => Self::MARKDOWN_MIN_BYTES,
            _ => usize::MAX,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── threshold_for ──────────────────────────────────────────────

    #[test]
    fn test_threshold_for_form_validator() {
        assert_eq!(
            ThresholdCheck::threshold_for("form-validator"),
            ThresholdCheck::FORM_VALIDATOR_MIN_FIELDS
        );
    }

    #[test]
    fn test_threshold_for_data_table() {
        assert_eq!(
            ThresholdCheck::threshold_for("data-table"),
            ThresholdCheck::DATA_TABLE_MIN_ROWS
        );
    }

    #[test]
    fn test_threshold_for_markdown() {
        assert_eq!(
            ThresholdCheck::threshold_for("markdown"),
            ThresholdCheck::MARKDOWN_MIN_BYTES
        );
    }

    #[test]
    fn test_threshold_for_unknown_engine() {
        assert_eq!(ThresholdCheck::threshold_for("unknown"), usize::MAX);
    }

    #[test]
    fn test_threshold_for_empty_string() {
        assert_eq!(ThresholdCheck::threshold_for(""), usize::MAX);
    }

    #[test]
    fn test_threshold_case_sensitive() {
        assert_eq!(ThresholdCheck::threshold_for("Form-Validator"), usize::MAX);
        assert_eq!(ThresholdCheck::threshold_for("DATA-TABLE"), usize::MAX);
        assert_eq!(ThresholdCheck::threshold_for("Markdown"), usize::MAX);
    }

    #[test]
    fn test_threshold_for_various_unknown_names() {
        let unknowns = vec![
            "form_validator",
            "data_table",
            "md",
            "validator",
            "table",
            "pdf",
            "csv",
        ];
        for name in unknowns {
            assert_eq!(
                ThresholdCheck::threshold_for(name),
                usize::MAX,
                "Expected usize::MAX for unknown engine: {}",
                name
            );
        }
    }

    // ── should_use_wasm ────────────────────────────────────────────

    #[test]
    fn test_should_use_wasm_form_validator_at_threshold() {
        assert!(ThresholdCheck::should_use_wasm(
            "form-validator",
            ThresholdCheck::FORM_VALIDATOR_MIN_FIELDS
        ));
    }

    #[test]
    fn test_should_use_wasm_form_validator_above_threshold() {
        assert!(ThresholdCheck::should_use_wasm("form-validator", 100));
    }

    #[test]
    fn test_should_use_wasm_form_validator_below_threshold() {
        assert!(!ThresholdCheck::should_use_wasm("form-validator", 5));
    }

    #[test]
    fn test_should_use_wasm_form_validator_zero() {
        assert!(!ThresholdCheck::should_use_wasm("form-validator", 0));
    }

    #[test]
    fn test_should_use_wasm_form_validator_one_below() {
        assert!(!ThresholdCheck::should_use_wasm(
            "form-validator",
            ThresholdCheck::FORM_VALIDATOR_MIN_FIELDS - 1
        ));
    }

    #[test]
    fn test_should_use_wasm_data_table_at_threshold() {
        assert!(ThresholdCheck::should_use_wasm(
            "data-table",
            ThresholdCheck::DATA_TABLE_MIN_ROWS
        ));
    }

    #[test]
    fn test_should_use_wasm_data_table_above_threshold() {
        assert!(ThresholdCheck::should_use_wasm("data-table", 10_000));
    }

    #[test]
    fn test_should_use_wasm_data_table_below_threshold() {
        assert!(!ThresholdCheck::should_use_wasm("data-table", 500));
    }

    #[test]
    fn test_should_use_wasm_data_table_zero() {
        assert!(!ThresholdCheck::should_use_wasm("data-table", 0));
    }

    #[test]
    fn test_should_use_wasm_markdown_at_threshold() {
        assert!(ThresholdCheck::should_use_wasm(
            "markdown",
            ThresholdCheck::MARKDOWN_MIN_BYTES
        ));
    }

    #[test]
    fn test_should_use_wasm_markdown_above_threshold() {
        assert!(ThresholdCheck::should_use_wasm("markdown", 50_000));
    }

    #[test]
    fn test_should_use_wasm_markdown_below_threshold() {
        assert!(!ThresholdCheck::should_use_wasm("markdown", 1024));
    }

    #[test]
    fn test_should_use_wasm_markdown_zero() {
        assert!(!ThresholdCheck::should_use_wasm("markdown", 0));
    }

    #[test]
    fn test_should_use_wasm_unknown_engine() {
        // Unknown engines should always return false
        assert!(!ThresholdCheck::should_use_wasm("nonexistent", 0));
        assert!(!ThresholdCheck::should_use_wasm("nonexistent", usize::MAX));
    }

    #[test]
    fn test_should_use_wasm_boundary_conditions() {
        // Test boundary: exactly at threshold vs one below
        let engines = vec![
            ("form-validator", ThresholdCheck::FORM_VALIDATOR_MIN_FIELDS),
            ("data-table", ThresholdCheck::DATA_TABLE_MIN_ROWS),
            ("markdown", ThresholdCheck::MARKDOWN_MIN_BYTES),
        ];

        for (name, threshold) in engines {
            assert!(
                ThresholdCheck::should_use_wasm(name, threshold),
                "At threshold for {}: should be true",
                name
            );
            assert!(
                ThresholdCheck::should_use_wasm(name, threshold + 1),
                "Above threshold for {}: should be true",
                name
            );
            if threshold > 0 {
                assert!(
                    !ThresholdCheck::should_use_wasm(name, threshold - 1),
                    "Below threshold for {}: should be false",
                    name
                );
            }
        }
    }

    #[test]
    fn test_constants_have_expected_values() {
        assert_eq!(ThresholdCheck::FORM_VALIDATOR_MIN_FIELDS, 10);
        assert_eq!(ThresholdCheck::DATA_TABLE_MIN_ROWS, 1000);
        assert_eq!(ThresholdCheck::MARKDOWN_MIN_BYTES, 10_240);
    }

    #[test]
    fn test_large_inputs_for_known_engines() {
        // Very large inputs should definitely use WASM for known engines
        let large = 1_000_000_000;
        assert!(ThresholdCheck::should_use_wasm("form-validator", large));
        assert!(ThresholdCheck::should_use_wasm("data-table", large));
        assert!(ThresholdCheck::should_use_wasm("markdown", large));
    }
}
