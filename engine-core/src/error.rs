/// Unified error type for all rustcn engine operations.
///
/// This enum provides a single error type that all engine implementations
/// can return, enabling consistent error handling across the WASM boundary.
/// Each variant represents a distinct failure mode in the engine pipeline.
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum EngineError {
    /// Failed to serialize or deserialize data across the WASM boundary.
    ///
    /// This error occurs when converting between Rust types and JavaScript
    /// values via `serde_json` or `serde-wasm-bindgen`.
    #[error("Serialization failed: {0}")]
    SerializationError(String),

    /// Input data failed engine-specific validation rules.
    ///
    /// Returned when the input does not satisfy the engine's requirements,
    /// such as invalid JSON structure, missing required fields, or
    /// constraint violations.
    #[error("Validation failed: {0}")]
    ValidationError(String),

    /// The engine has not been initialized before execution.
    ///
    /// Engines that require a setup phase (e.g., loading schemas,
    /// precomputing lookup tables) must be initialized before `execute`
    /// is called.
    #[error("Engine not initialized")]
    NotInitialized,

    /// Data size is below the threshold where WASM execution is beneficial.
    ///
    /// For small inputs, the serialization overhead of crossing the
    /// JavaScript-WASM boundary exceeds the execution speedup. The
    /// contained value is the actual data size in bytes.
    #[error("Data size below threshold for WASM execution: {0} bytes")]
    BelowThreshold(usize),

    /// An unexpected internal error occurred.
    ///
    /// This is a catch-all for errors that do not fit the other variants.
    /// It should be used sparingly; prefer more specific variants where
    /// possible.
    #[error("Internal error: {0}")]
    InternalError(String),
}

impl From<serde_json::Error> for EngineError {
    fn from(e: serde_json::Error) -> Self {
        EngineError::SerializationError(e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialization_error_display() {
        let err = EngineError::SerializationError("unexpected token".to_string());
        assert_eq!(
            format!("{}", err),
            "Serialization failed: unexpected token"
        );
    }

    #[test]
    fn test_validation_error_display() {
        let err = EngineError::ValidationError("missing field 'name'".to_string());
        assert_eq!(
            format!("{}", err),
            "Validation failed: missing field 'name'"
        );
    }

    #[test]
    fn test_not_initialized_display() {
        let err = EngineError::NotInitialized;
        assert_eq!(format!("{}", err), "Engine not initialized");
    }

    #[test]
    fn test_below_threshold_display() {
        let err = EngineError::BelowThreshold(512);
        assert_eq!(
            format!("{}", err),
            "Data size below threshold for WASM execution: 512 bytes"
        );
    }

    #[test]
    fn test_internal_error_display() {
        let err = EngineError::InternalError("division by zero".to_string());
        assert_eq!(format!("{}", err), "Internal error: division by zero");
    }

    #[test]
    fn test_from_serde_json_error() {
        // Create a serde_json error by attempting to parse invalid JSON
        let result: Result<serde_json::Value, _> = serde_json::from_str("{invalid}");
        let json_err = result.unwrap_err();
        let engine_err: EngineError = json_err.into();

        assert!(matches!(engine_err, EngineError::SerializationError(_)));
    }

    #[test]
    fn test_error_equality() {
        let err1 = EngineError::ValidationError("test".to_string());
        let err2 = EngineError::ValidationError("test".to_string());
        let err3 = EngineError::ValidationError("other".to_string());

        assert_eq!(err1, err2);
        assert_ne!(err1, err3);
    }

    #[test]
    fn test_error_debug() {
        let err = EngineError::NotInitialized;
        let debug_str = format!("{:?}", err);
        assert!(debug_str.contains("NotInitialized"));
    }

    #[test]
    fn test_all_variants_are_distinct() {
        let errors = vec![
            EngineError::SerializationError("a".to_string()),
            EngineError::ValidationError("b".to_string()),
            EngineError::NotInitialized,
            EngineError::BelowThreshold(0),
            EngineError::InternalError("c".to_string()),
        ];

        // Ensure no two variants compare equal
        for (i, a) in errors.iter().enumerate() {
            for (j, b) in errors.iter().enumerate() {
                if i == j {
                    assert_eq!(a, b);
                } else {
                    assert_ne!(a, b);
                }
            }
        }
    }
}
