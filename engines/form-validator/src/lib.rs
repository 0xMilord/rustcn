//! WASM entry point for the form validator engine.
//!
//! Exposes a `Validator` struct callable from JavaScript via wasm-bindgen.
//!
//! # Usage from JavaScript
//! ```js
//! const validator = Validator.new('{"fields":{"email":{"required":true,"field_type":"email","rules":[],"error_message":null}}}');
//! const result = validator.validate('{"email":"test@test.com"}');
//! ```

use rustcn_engine_core::Engine;
use wasm_bindgen::prelude::*;

mod validator;
mod schema;
mod rules;
mod types;

use validator::Validator as CoreValidator;

/// A schema-based form validator powered by Rust.
/// Use this for multi-step forms, checkout flows, and complex wizard forms
/// where validation logic is too heavy for client-side JavaScript.
///
/// For datasets under 10 fields, the JS fallback will be faster --
/// the rustcn loader handles this dispatch automatically.
#[wasm_bindgen]
pub struct Validator {
    inner: CoreValidator,
}

#[wasm_bindgen]
impl Validator {
    /// Create a new validator from a JSON schema string.
    ///
    /// # Schema format
    /// Each key is a field name. Each value defines validation rules:
    /// - `required`: boolean
    /// - `field_type`: "string" | "email" | "number" | "boolean"
    /// - `rules`: array of rule objects
    ///
    /// # Example
    /// ```json
    /// {
    ///   "fields": {
    ///     "email": { "required": true, "field_type": "email", "rules": [], "error_message": null },
    ///     "age": { "required": false, "field_type": "number", "rules": [{"rule":"min_value","value":18}], "error_message": null }
    ///   }
    /// }
    /// ```
    #[wasm_bindgen(constructor)]
    pub fn new(schema_json: &str) -> Result<Validator, JsValue> {
        CoreValidator::new(schema_json)
            .map(|inner| Validator { inner })
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Validate all fields in a JSON data string.
    ///
    /// Returns a JSON string with `{ valid: true }` or `{ valid: false, errors: { field: ["msg"] } }`.
    /// Includes `validation_time_ms` and `field_count` for profiling.
    #[wasm_bindgen]
    pub fn validate(&self, data_json: &str) -> Result<String, JsValue> {
        self.inner
            .validate(data_json)
            .map(|r| serde_json::to_string(&r).unwrap_or_default())
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Validate a single field value.
    ///
    /// Returns JSON: `{ valid: true, field_name: "email" }` or
    /// `{ valid: false, errors: ["msg"], field_name: "email" }`.
    #[wasm_bindgen(js_name = validateField)]
    pub fn validate_field(&self, field_name: &str, value: &str) -> Result<String, JsValue> {
        self.inner
            .validate_field(field_name, value)
            .map(|r| serde_json::to_string(&r).unwrap_or_default())
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Returns the number of fields in the schema.
    /// Used by the rustcn loader to determine if WASM execution is worthwhile.
    #[wasm_bindgen(js_name = fieldCount)]
    pub fn field_count(&self) -> usize {
        self.inner.estimated_data_size()
    }

    /// Returns the engine name identifier.
    #[wasm_bindgen(js_name = engineName)]
    pub fn engine_name(&self) -> String {
        self.inner.name().to_string()
    }
}

impl Engine for CoreValidator {
    fn name(&self) -> &str {
        "form-validator"
    }

    fn execute(&self, input: &str) -> Result<String, rustcn_engine_core::EngineError> {
        self.validate(input)
            .map(|r| serde_json::to_string(&r).unwrap_or_default())
    }

    fn estimated_data_size(&self) -> usize {
        self.schema.field_count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_schema() -> String {
        r#"{
            "fields": {
                "email": {
                    "required": true,
                    "field_type": "email",
                    "rules": [],
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
        }"#
        .to_string()
    }

    #[test]
    fn test_validator_new_valid_schema() {
        let schema = test_schema();
        let v = Validator::new(&schema);
        assert!(v.is_ok());
    }

    #[test]
    fn test_validator_new_invalid_schema() {
        let result = Validator::new("not json");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_valid_data() {
        let schema = test_schema();
        let v = Validator::new(&schema).unwrap();
        let data = r#"{"email": "test@test.com", "name": "John"}"#;
        let result = v.validate(data);
        assert!(result.is_ok());
        let json: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
        assert_eq!(json["valid"], true);
    }

    #[test]
    fn test_validate_invalid_data() {
        let schema = test_schema();
        let v = Validator::new(&schema).unwrap();
        let data = r#"{"email": "bad", "name": "A"}"#;
        let result = v.validate(data).unwrap();
        let json: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(json["valid"], false);
    }

    #[test]
    fn test_validate_field() {
        let schema = test_schema();
        let v = Validator::new(&schema).unwrap();
        let result = v.validate_field("email", "\"test@test.com\"").unwrap();
        let json: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(json["valid"], true);
    }

    #[test]
    fn test_field_count() {
        let schema = test_schema();
        let v = Validator::new(&schema).unwrap();
        assert_eq!(v.field_count(), 2);
    }

    #[test]
    fn test_engine_name() {
        let schema = test_schema();
        let v = Validator::new(&schema).unwrap();
        assert_eq!(v.engine_name(), "form-validator");
    }

    #[test]
    fn test_engine_trait_impl() {
        let schema = test_schema();
        let core = CoreValidator::new(&schema).unwrap();
        assert_eq!(core.name(), "form-validator");
        assert_eq!(core.estimated_data_size(), 2);
    }

    #[test]
    fn test_engine_execute() {
        let schema = test_schema();
        let core = CoreValidator::new(&schema).unwrap();
        let result = core.execute(r#"{"email": "a@b.com", "name": "Test"}"#);
        assert!(result.is_ok());
        let output: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
        assert_eq!(output["valid"], true);
    }
}
