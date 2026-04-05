//! Schema definition types for the form validator.
//!
//! Supports declarative validation rules with nested field paths.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A complete validation schema.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationSchema {
    /// Map of field names to their validation rules.
    pub fields: HashMap<String, FieldSchema>,
}

impl ValidationSchema {
    /// Returns the number of fields in this schema.
    pub fn field_count(&self) -> usize {
        self.fields.len()
    }
}

/// Validation rules for a single field.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldSchema {
    /// Whether this field must be present.
    pub required: bool,
    /// The expected data type.
    #[serde(rename = "field_type")]
    pub field_type: FieldType,
    /// Additional validation rules.
    #[serde(default)]
    pub rules: Vec<ValidationRule>,
    /// Optional custom error message override.
    #[serde(default)]
    pub error_message: Option<String>,
}

/// Supported field types.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FieldType {
    String,
    Email,
    Number,
    Boolean,
}

/// Individual validation rules.
/// Serialized as tagged enums for JSON parsing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "rule", content = "value", rename_all = "snake_case")]
pub enum ValidationRule {
    MinLength(usize),
    MaxLength(usize),
    Pattern(String),
    MinValue(f64),
    MaxValue(f64),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_schema() {
        let json = r#"{
            "fields": {
                "email": {
                    "required": true,
                    "field_type": "email",
                    "rules": [],
                    "error_message": null
                }
            }
        }"#;
        let schema: ValidationSchema = serde_json::from_str(json).unwrap();
        assert_eq!(schema.fields.len(), 1);
        assert!(schema.fields["email"].required);
        assert_eq!(schema.fields["email"].field_type, FieldType::Email);
    }

    #[test]
    fn test_parse_with_rules() {
        let json = r#"{
            "fields": {
                "name": {
                    "required": true,
                    "field_type": "string",
                    "rules": [
                        {"rule": "min_length", "value": 2},
                        {"rule": "max_length", "value": 50}
                    ],
                    "error_message": "Please enter a valid name"
                }
            }
        }"#;
        let schema: ValidationSchema = serde_json::from_str(json).unwrap();
        let name = &schema.fields["name"];
        assert_eq!(name.rules.len(), 2);
        assert_eq!(
            name.error_message,
            Some("Please enter a valid name".to_string())
        );
    }

    #[test]
    fn test_field_count() {
        let json = r#"{
            "fields": {
                "a": {"required": true, "field_type": "string", "rules": [], "error_message": null},
                "b": {"required": true, "field_type": "string", "rules": [], "error_message": null}
            }
        }"#;
        let schema: ValidationSchema = serde_json::from_str(json).unwrap();
        assert_eq!(schema.field_count(), 2);
    }

    #[test]
    fn test_all_field_types() {
        assert_eq!(
            serde_json::to_string(&FieldType::Email).unwrap(),
            "\"email\""
        );
        assert_eq!(
            serde_json::to_string(&FieldType::Number).unwrap(),
            "\"number\""
        );
        assert_eq!(
            serde_json::to_string(&FieldType::String).unwrap(),
            "\"string\""
        );
        assert_eq!(
            serde_json::to_string(&FieldType::Boolean).unwrap(),
            "\"boolean\""
        );
    }

    #[test]
    fn test_validation_rules_serde() {
        let rules = vec![
            ValidationRule::MinLength(5),
            ValidationRule::MaxLength(100),
            ValidationRule::MinValue(0.0),
            ValidationRule::MaxValue(1.0),
            ValidationRule::Pattern("^[a-z]+$".to_string()),
        ];
        let json = serde_json::to_string(&rules).unwrap();
        let parsed: Vec<ValidationRule> = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.len(), 5);
    }

    #[test]
    fn test_empty_fields_schema() {
        let json = r#"{"fields": {}}"#;
        let schema: ValidationSchema = serde_json::from_str(json).unwrap();
        assert_eq!(schema.field_count(), 0);
        assert!(schema.fields.is_empty());
    }

    #[test]
    fn test_schema_field_not_found() {
        let json = r#"{
            "fields": {
                "name": {
                    "required": true,
                    "field_type": "string",
                    "rules": [],
                    "error_message": null
                }
            }
        }"#;
        let schema: ValidationSchema = serde_json::from_str(json).unwrap();
        assert!(schema.fields.get("email").is_none());
    }

    #[test]
    fn test_field_schema_default_rules() {
        let json = r#"{
            "fields": {
                "name": {
                    "required": false,
                    "field_type": "string",
                    "error_message": "custom"
                }
            }
        }"#;
        let schema: ValidationSchema = serde_json::from_str(json).unwrap();
        let field = &schema.fields["name"];
        assert!(field.rules.is_empty());
        assert_eq!(field.error_message, Some("custom".to_string()));
    }

    #[test]
    fn test_validation_schema_clone() {
        let json = r#"{
            "fields": {
                "email": {
                    "required": true,
                    "field_type": "email",
                    "rules": [],
                    "error_message": null
                }
            }
        }"#;
        let schema: ValidationSchema = serde_json::from_str(json).unwrap();
        let cloned = schema.clone();
        assert_eq!(schema.field_count(), cloned.field_count());
    }
}
