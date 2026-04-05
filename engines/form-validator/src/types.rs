//! Result types for validation operations.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Result of a full validation operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    /// Whether all fields passed validation.
    pub valid: bool,
    /// Map of field names to their error messages.
    pub errors: HashMap<String, Vec<String>>,
    /// Number of fields checked.
    pub field_count: usize,
    /// Time taken to validate in milliseconds.
    pub validation_time_ms: f64,
}

/// Result of a single field validation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldResult {
    /// Whether the field passed validation.
    pub valid: bool,
    /// Error messages for this field.
    pub errors: Vec<String>,
    /// The field name that was checked.
    pub field_name: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_result_serialization() {
        let result = ValidationResult {
            valid: false,
            errors: {
                let mut m = HashMap::new();
                m.insert("email".to_string(), vec!["Invalid email".to_string()]);
                m
            },
            field_count: 3,
            validation_time_ms: 0.5,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("valid"));
        assert!(json.contains("errors"));
        assert!(json.contains("field_count"));
        assert!(json.contains("validation_time_ms"));
    }

    #[test]
    fn test_field_result_serialization() {
        let result = FieldResult {
            valid: false,
            errors: vec!["Too short".to_string()],
            field_name: "name".to_string(),
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("field_name"));
    }

    #[test]
    fn test_roundtrip_validation_result() {
        let original = ValidationResult {
            valid: true,
            errors: HashMap::new(),
            field_count: 0,
            validation_time_ms: 0.1,
        };
        let json = serde_json::to_string(&original).unwrap();
        let parsed: ValidationResult = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.valid, original.valid);
        assert_eq!(parsed.field_count, original.field_count);
    }

    #[test]
    fn test_roundtrip_field_result() {
        let original = FieldResult {
            valid: false,
            errors: vec!["Error 1".to_string(), "Error 2".to_string()],
            field_name: "test_field".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let parsed: FieldResult = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.valid, original.valid);
        assert_eq!(parsed.field_name, original.field_name);
        assert_eq!(parsed.errors.len(), original.errors.len());
    }

    #[test]
    fn test_validation_result_valid_only() {
        let result = ValidationResult {
            valid: true,
            errors: HashMap::new(),
            field_count: 5,
            validation_time_ms: 0.0,
        };
        let json = serde_json::to_string(&result).unwrap();
        let parsed: ValidationResult = serde_json::from_str(&json).unwrap();
        assert!(parsed.valid);
        assert!(parsed.errors.is_empty());
    }

    #[test]
    fn test_field_result_debug_format() {
        let result = FieldResult {
            valid: false,
            errors: vec!["Required".to_string()],
            field_name: "email".to_string(),
        };
        let debug_str = format!("{:?}", result);
        assert!(debug_str.contains("email"));
        assert!(debug_str.contains("Required"));
    }

    #[test]
    fn test_validation_result_debug_format() {
        let result = ValidationResult {
            valid: false,
            errors: {
                let mut m = HashMap::new();
                m.insert("email".to_string(), vec!["Invalid".to_string()]);
                m
            },
            field_count: 1,
            validation_time_ms: 1.0,
        };
        let debug_str = format!("{:?}", result);
        assert!(debug_str.contains("false"));
        assert!(debug_str.contains("email"));
    }
}
