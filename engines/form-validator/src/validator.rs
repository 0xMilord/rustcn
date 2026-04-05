//! Core form validation engine.
//!
//! Validates JSON data against a declarative schema with support for:
//! - Required field checks
//! - Type validation (string, email, number, boolean)
//! - Length constraints (min, max)
//! - Value constraints (min, max for numbers)
//! - Regex pattern matching

use rustcn_engine_core::EngineError;
use crate::schema::{FieldSchema, ValidationRule};
use crate::types::{FieldResult, ValidationResult};
use crate::rules;

/// A schema-based form validator.
pub struct Validator {
    pub(crate) schema: crate::schema::ValidationSchema,
}

impl Validator {
    /// Create a validator from a JSON schema string.
    pub fn new(schema_json: &str) -> Result<Self, EngineError> {
        let schema: crate::schema::ValidationSchema =
            serde_json::from_str(schema_json).map_err(|e| {
                EngineError::ValidationError(format!("Invalid schema JSON: {}", e))
            })?;
        Ok(Self { schema })
    }

    /// Validate all fields in a JSON data string.
    pub fn validate(&self, data_json: &str) -> Result<ValidationResult, EngineError> {
        let data: serde_json::Value = serde_json::from_str(data_json).map_err(|e| {
            EngineError::ValidationError(format!("Invalid data JSON: {}", e))
        })?;

        let start = web_time::Instant::now();
        let mut errors = std::collections::HashMap::new();
        let mut field_count = 0;

        for (field_name, field_schema) in &self.schema.fields {
            field_count += 1;
            let value = get_nested_field(&data, field_name);
            let field_errors = validate_field_impl(field_name, field_schema, &value);
            if !field_errors.is_empty() {
                errors.insert(field_name.clone(), field_errors);
            }
        }

        let validation_time_ms = start.elapsed().as_secs_f64() * 1000.0;

        Ok(ValidationResult {
            valid: errors.is_empty(),
            errors,
            field_count,
            validation_time_ms,
        })
    }

    /// Validate a single field value.
    pub fn validate_field(&self, field_name: &str, value_str: &str) -> Result<FieldResult, EngineError> {
        let field_schema = self.schema.fields.get(field_name).ok_or_else(|| {
            EngineError::ValidationError(format!("Unknown field: {}", field_name))
        })?;

        let value: serde_json::Value = serde_json::from_str(value_str)
            .unwrap_or(serde_json::Value::String(value_str.to_string()));

        let errs = validate_field_impl(field_name, field_schema, &value);

        Ok(FieldResult {
            valid: errs.is_empty(),
            errors: errs,
            field_name: field_name.to_string(),
        })
    }
}

/// Get a possibly nested field value using dot notation (e.g., "address.city").
fn get_nested_field(data: &serde_json::Value, path: &str) -> Option<&serde_json::Value> {
    let mut current = data;
    for part in path.split('.') {
        current = current.get(part)?;
    }
    Some(current)
}

/// Validate a single field against its schema rules.
fn validate_field_impl(
    field_name: &str,
    schema: &FieldSchema,
    value: &Option<&serde_json::Value>,
) -> Vec<String> {
    let mut errors = Vec::new();
    let custom_msg = schema.error_message.clone();

    // Required check
    if schema.required {
        if let Err(e) = rules::required(value) {
            errors.push(
                custom_msg
                    .clone()
                    .unwrap_or_else(|| format!("{}: {}", field_name, e)),
            );
        }
    }

    // If no value and not required, skip further checks
    let Some(val) = value else { return errors };

    // Type check
    match &schema.field_type {
        crate::schema::FieldType::Email => {
            if let Some(s) = val.as_str() {
                if let Err(e) = rules::is_email(s) {
                    errors.push(
                        custom_msg
                            .clone()
                            .unwrap_or_else(|| format!("{}: {}", field_name, e)),
                    );
                }
            }
        }
        crate::schema::FieldType::Number => {
            if let Some(n) = val.as_f64() {
                for rule in &schema.rules {
                    match rule {
                        ValidationRule::MinValue(min) => {
                            if let Err(e) = rules::min_number(n, *min) {
                                errors.push(
                                    custom_msg
                                        .clone()
                                        .unwrap_or_else(|| format!("{}: {}", field_name, e)),
                                );
                            }
                        }
                        ValidationRule::MaxValue(max) => {
                            if let Err(e) = rules::max_number(n, *max) {
                                errors.push(
                                    custom_msg
                                        .clone()
                                        .unwrap_or_else(|| format!("{}: {}", field_name, e)),
                                );
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
        crate::schema::FieldType::String => {
            if let Some(s) = val.as_str() {
                for rule in &schema.rules {
                    match rule {
                        ValidationRule::MinLength(min) => {
                            if let Err(e) = rules::min_length(s, *min) {
                                errors.push(
                                    custom_msg
                                        .clone()
                                        .unwrap_or_else(|| format!("{}: {}", field_name, e)),
                                );
                            }
                        }
                        ValidationRule::MaxLength(max) => {
                            if let Err(e) = rules::max_length(s, *max) {
                                errors.push(
                                    custom_msg
                                        .clone()
                                        .unwrap_or_else(|| format!("{}: {}", field_name, e)),
                                );
                            }
                        }
                        ValidationRule::Pattern(pat) => {
                            if let Err(e) = rules::pattern_match(s, pat) {
                                errors.push(
                                    custom_msg
                                        .clone()
                                        .unwrap_or_else(|| format!("{}: {}", field_name, e)),
                                );
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
        crate::schema::FieldType::Boolean => {
            // Boolean type: value should be a boolean
            if !val.is_boolean() {
                errors.push(
                    custom_msg
                        .clone()
                        .unwrap_or_else(|| format!("{}: expected a boolean value", field_name)),
                );
            }
        }
    }

    errors
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_validator() -> Validator {
        let schema = r#"{
            "fields": {
                "email": {
                    "required": true,
                    "field_type": "email",
                    "rules": [],
                    "error_message": null
                },
                "age": {
                    "required": false,
                    "field_type": "number",
                    "rules": [
                        {"rule": "min_value", "value": 18},
                        {"rule": "max_value", "value": 120}
                    ],
                    "error_message": null
                },
                "name": {
                    "required": true,
                    "field_type": "string",
                    "rules": [
                        {"rule": "min_length", "value": 2},
                        {"rule": "max_length", "value": 50}
                    ],
                    "error_message": null
                }
            }
        }"#;
        Validator::new(schema).unwrap()
    }

    #[test]
    fn test_valid_data() {
        let v = make_validator();
        let data = r#"{"email": "test@test.com", "age": 25, "name": "John"}"#;
        let result = v.validate(data).unwrap();
        assert!(result.valid);
        assert!(result.errors.is_empty());
        assert_eq!(result.field_count, 3);
    }

    #[test]
    fn test_missing_required_field() {
        let v = make_validator();
        let data = r#"{"age": 25}"#;
        let result = v.validate(data).unwrap();
        assert!(!result.valid);
        assert!(result.errors.contains_key("email"));
        assert!(result.errors.contains_key("name"));
    }

    #[test]
    fn test_invalid_email() {
        let v = make_validator();
        let data = r#"{"email": "not-an-email", "name": "John"}"#;
        let result = v.validate(data).unwrap();
        assert!(!result.valid);
        assert!(result.errors.contains_key("email"));
    }

    #[test]
    fn test_age_out_of_range() {
        let v = make_validator();
        let data = r#"{"email": "test@test.com", "age": 15, "name": "John"}"#;
        let result = v.validate(data).unwrap();
        assert!(!result.valid);
        assert!(result.errors.contains_key("age"));
    }

    #[test]
    fn test_name_too_short() {
        let v = make_validator();
        let data = r#"{"email": "test@test.com", "name": "A"}"#;
        let result = v.validate(data).unwrap();
        assert!(!result.valid);
        assert!(result.errors.contains_key("name"));
    }

    #[test]
    fn test_validate_single_field() {
        let v = make_validator();
        let result = v.validate_field("email", "\"test@test.com\"").unwrap();
        assert!(result.valid);
    }

    #[test]
    fn test_validate_single_field_invalid() {
        let v = make_validator();
        let result = v.validate_field("email", "\"bad\"").unwrap();
        assert!(!result.valid);
        assert!(!result.errors.is_empty());
    }

    #[test]
    fn test_invalid_schema_json() {
        let result = Validator::new("not json");
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_data_json() {
        let v = make_validator();
        let result = v.validate("not json");
        assert!(result.is_err());
    }

    #[test]
    fn test_empty_data_with_no_required() {
        let schema = r#"{"fields": {}}"#;
        let v = Validator::new(schema).unwrap();
        let result = v.validate("{}").unwrap();
        assert!(result.valid);
        assert_eq!(result.field_count, 0);
    }

    #[test]
    fn test_nested_field_path() {
        let schema = r#"{
            "fields": {
                "address.city": {
                    "required": true,
                    "field_type": "string",
                    "rules": [
                        {"rule": "min_length", "value": 2}
                    ],
                    "error_message": null
                }
            }
        }"#;
        let v = Validator::new(schema).unwrap();
        let data = r#"{"address": {"city": "NYC"}}"#;
        let result = v.validate(data).unwrap();
        assert!(result.valid);
    }

    #[test]
    fn test_nested_field_path_missing() {
        let schema = r#"{
            "fields": {
                "address.city": {
                    "required": true,
                    "field_type": "string",
                    "rules": [],
                    "error_message": null
                }
            }
        }"#;
        let v = Validator::new(schema).unwrap();
        let data = r#"{"address": {}}"#;
        let result = v.validate(data).unwrap();
        assert!(!result.valid);
        assert!(result.errors.contains_key("address.city"));
    }

    #[test]
    fn test_custom_error_message() {
        let schema = r#"{
            "fields": {
                "email": {
                    "required": true,
                    "field_type": "email",
                    "rules": [],
                    "error_message": "Please provide a valid email address"
                }
            }
        }"#;
        let v = Validator::new(schema).unwrap();
        let data = r#"{"email": "bad"}"#;
        let result = v.validate(data).unwrap();
        assert!(!result.valid);
        let msgs = result.errors.get("email").unwrap();
        assert!(msgs.iter().any(|m| m.contains("Please provide a valid email address")));
    }

    #[test]
    fn test_boolean_field_valid() {
        let schema = r#"{
            "fields": {
                "agree": {
                    "required": true,
                    "field_type": "boolean",
                    "rules": [],
                    "error_message": null
                }
            }
        }"#;
        let v = Validator::new(schema).unwrap();
        let data = r#"{"agree": true}"#;
        let result = v.validate(data).unwrap();
        assert!(result.valid);
    }

    #[test]
    fn test_boolean_field_invalid() {
        let schema = r#"{
            "fields": {
                "agree": {
                    "required": true,
                    "field_type": "boolean",
                    "rules": [],
                    "error_message": null
                }
            }
        }"#;
        let v = Validator::new(schema).unwrap();
        let data = r#"{"agree": "yes"}"#;
        let result = v.validate(data).unwrap();
        assert!(!result.valid);
        assert!(result.errors.contains_key("agree"));
    }

    #[test]
    fn test_validate_unknown_field() {
        let v = make_validator();
        let result = v.validate_field("unknown", "\"value\"");
        assert!(result.is_err());
    }
}
