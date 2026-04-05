//! Core library for rustcn engine plugins.
//!
//! This crate provides the foundational types and traits that all rustcn
//! engine implementations share. It includes:
//!
//! - [`Engine`] -- the trait all engines must implement
//! - [`EngineError`] -- a unified error type
//! - [`MemoryPool`] -- a pre-allocated buffer pool for WASM
//! - [`EngineConfig`] -- runtime configuration
//! - [`ThresholdCheck`] -- cost model for WASM vs JavaScript decisions
//!
//! # Quick start
//!
//! ```
//! use rustcn_engine_core::Engine;
//! use rustcn_engine_core::EngineError;
//!
//! struct MyEngine;
//!
//! impl Engine for MyEngine {
//!     fn name(&self) -> &str {
//!         "my-engine"
//!     }
//!
//!     fn execute(&self, input: &str) -> Result<String, EngineError> {
//!         Ok(format!("processed: {}", input))
//!     }
//!
//!     fn estimated_data_size(&self) -> usize {
//!         0
//!     }
//! }
//!
//! let engine = MyEngine;
//! assert_eq!(engine.name(), "my-engine");
//! ```
//!
//! # WASM compilation
//!
//! This crate compiles to both `cdylib` (for WASM targets) and `rlib`
//! (for native testing). The `wasm-bindgen` integration is handled
//! internally; consumers only need to depend on this crate.

pub mod config;
pub mod error;
pub mod memory;
pub mod threshold;

// Re-exports for convenient access
pub use config::EngineConfig;
pub use error::EngineError;
pub use memory::MemoryPool;
pub use threshold::ThresholdCheck;

/// Trait implemented by all rustcn engine plugins.
///
/// Every engine -- whether it runs as WASM in the browser or natively
/// in a CLI -- must implement this trait. It provides a uniform interface
/// for discovery, execution, and resource estimation.
///
/// # Execution model
///
/// Engines receive input as a UTF-8 string (typically JSON-encoded) and
/// return output as a UTF-8 string. This design ensures compatibility
/// across the JavaScript-WASM boundary, where strings are the lowest-
/// common-denominator for data exchange.
///
/// # Thread safety
///
/// The trait does not require `Send` or `Sync` because WASM runs in a
/// single-threaded context. If an engine is also used natively in a
/// multi-threaded Rust application, the implementor may add those bounds
/// separately.
///
/// # Example
///
/// ```
/// use rustcn_engine_core::{Engine, EngineError};
///
/// #[derive(Default)]
/// struct UppercaseEngine;
///
/// impl Engine for UppercaseEngine {
///     fn name(&self) -> &str {
///         "uppercase"
///     }
///
///     fn execute(&self, input: &str) -> Result<String, EngineError> {
///         if input.is_empty() {
///             return Err(EngineError::ValidationError(
///                 "input must not be empty".to_string(),
///             ));
///         }
///         Ok(input.to_uppercase())
///     }
///
///     fn estimated_data_size(&self) -> usize {
///         0
///     }
/// }
///
/// let engine = UppercaseEngine::default();
/// let result = engine.execute("hello").unwrap();
/// assert_eq!(result, "HELLO");
/// ```
pub trait Engine {
    /// Returns the canonical name of this engine.
    ///
    /// The name is used for logging, threshold checks, and engine
    /// discovery. It should be a stable, lowercase identifier such as
    /// `"form-validator"` or `"data-table"`.
    ///
    /// # Example
    ///
    /// ```
    /// use rustcn_engine_core::{Engine, EngineError};
    ///
    /// struct MyEngine;
    /// impl Engine for MyEngine {
    ///     fn name(&self) -> &str { "my-engine" }
    ///     fn execute(&self, _input: &str) -> Result<String, EngineError> {
    ///         Ok(String::new())
    ///     }
    ///     fn estimated_data_size(&self) -> usize { 0 }
    /// }
    ///
    /// assert_eq!(MyEngine.name(), "my-engine");
    /// ```
    fn name(&self) -> &str;

    /// Executes the engine on the given input and returns the result.
    ///
    /// The input is typically a JSON-encoded string containing the data
    /// the engine needs to operate. The output is also a JSON-encoded
    /// string.
    ///
    /// # Errors
    ///
    /// Returns [`EngineError`] if execution fails for any reason,
    /// including validation errors, serialization failures, or internal
    /// errors.
    ///
    /// # Example
    ///
    /// ```
    /// use rustcn_engine_core::{Engine, EngineError};
    ///
    /// struct EchoEngine;
    /// impl Engine for EchoEngine {
    ///     fn name(&self) -> &str { "echo" }
    ///     fn execute(&self, input: &str) -> Result<String, EngineError> {
    ///         Ok(input.to_string())
    ///     }
    ///     fn estimated_data_size(&self) -> usize { input.len() }
    /// }
    ///
    /// let engine = EchoEngine;
    /// assert_eq!(engine.execute("test").unwrap(), "test");
    /// ```
    fn execute(&self, input: &str) -> Result<String, EngineError>;

    /// Returns an estimate of the data size this engine is working with.
    ///
    /// The meaning of "data size" is engine-specific:
    ///
    /// - For form validators, this might be the number of fields
    /// - For data tables, the number of rows
    /// - For markdown processors, the document size in bytes
    ///
    /// This value is used by [`ThresholdCheck`] to decide whether WASM
    /// execution is beneficial.
    fn estimated_data_size(&self) -> usize;

    /// Returns `true` if this engine should use WASM execution based on
    /// its current data size and the configured thresholds.
    ///
    /// This is a convenience method that combines
    /// [`estimated_data_size`][Engine::estimated_data_size] with
    /// [`ThresholdCheck::should_use_wasm`].
    ///
    /// # Example
    ///
    /// ```
    /// use rustcn_engine_core::{Engine, EngineError, ThresholdCheck};
    ///
    /// struct BigEngine;
    /// impl Engine for BigEngine {
    ///     fn name(&self) -> &str { "data-table" }
    ///     fn execute(&self, _input: &str) -> Result<String, EngineError> {
    ///         Ok(String::new())
    ///     }
    ///     fn estimated_data_size(&self) -> usize { 5000 }
    /// }
    ///
    /// let engine = BigEngine;
    /// // 5000 rows >= 1000 threshold, so WASM should be used
    /// assert!(engine.should_use_wasm());
    /// ```
    fn should_use_wasm(&self) -> bool {
        ThresholdCheck::should_use_wasm(self.name(), self.estimated_data_size())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── Test engine implementations ────────────────────────────────

    #[derive(Default)]
    struct TestEngine {
        engine_name: String,
        data_size: usize,
        execute_result: Option<Result<String, EngineError>>,
    }

    impl TestEngine {
        fn new(name: &str, data_size: usize) -> Self {
            Self {
                engine_name: name.to_string(),
                data_size,
                execute_result: None,
            }
        }

        fn with_result(mut self, result: Result<String, EngineError>) -> Self {
            self.execute_result = Some(result);
            self
        }
    }

    impl Engine for TestEngine {
        fn name(&self) -> &str {
            &self.engine_name
        }

        fn execute(&self, _input: &str) -> Result<String, EngineError> {
            match &self.execute_result {
                Some(result) => result.clone(),
                None => Ok(format!("executed {} with size {}", self.name(), self.data_size)),
            }
        }

        fn estimated_data_size(&self) -> usize {
            self.data_size
        }
    }

    // ── Engine trait tests ─────────────────────────────────────────

    #[test]
    fn test_engine_name() {
        let engine = TestEngine::new("form-validator", 15);
        assert_eq!(engine.name(), "form-validator");
    }

    #[test]
    fn test_engine_execute_default() {
        let engine = TestEngine::new("data-table", 2000);
        let result = engine.execute(r#"{"rows": 2000}"#);
        assert!(result.is_ok());
        assert!(result
            .unwrap()
            .contains("executed data-table with size 2000"));
    }

    #[test]
    fn test_engine_execute_custom_result() {
        let engine = TestEngine::new("test").with_result(Ok("custom result".to_string()));
        let result = engine.execute("");
        assert_eq!(result.unwrap(), "custom result");
    }

    #[test]
    fn test_engine_execute_error() {
        let engine = TestEngine::new("test").with_result(Err(EngineError::NotInitialized));
        let result = engine.execute("");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), EngineError::NotInitialized);
    }

    #[test]
    fn test_engine_estimated_data_size() {
        let engine = TestEngine::new("markdown", 15_000);
        assert_eq!(engine.estimated_data_size(), 15_000);
    }

    #[test]
    fn test_engine_estimated_data_size_zero() {
        let engine = TestEngine::new("empty", 0);
        assert_eq!(engine.estimated_data_size(), 0);
    }

    // ── should_use_wasm integration ────────────────────────────────

    #[test]
    fn test_should_use_wasm_form_validator_above() {
        let engine = TestEngine::new("form-validator", 20);
        assert!(engine.should_use_wasm());
    }

    #[test]
    fn test_should_use_wasm_form_validator_below() {
        let engine = TestEngine::new("form-validator", 3);
        assert!(!engine.should_use_wasm());
    }

    #[test]
    fn test_should_use_wasm_data_table_above() {
        let engine = TestEngine::new("data-table", 5000);
        assert!(engine.should_use_wasm());
    }

    #[test]
    fn test_should_use_wasm_data_table_below() {
        let engine = TestEngine::new("data-table", 100);
        assert!(!engine.should_use_wasm());
    }

    #[test]
    fn test_should_use_wasm_markdown_above() {
        let engine = TestEngine::new("markdown", 20_000);
        assert!(engine.should_use_wasm());
    }

    #[test]
    fn test_should_use_wasm_markdown_below() {
        let engine = TestEngine::new("markdown", 1024);
        assert!(!engine.should_use_wasm());
    }

    #[test]
    fn test_should_use_wasm_unknown_engine() {
        // Unknown engine names always return false
        let engine = TestEngine::new("unknown-engine", usize::MAX);
        assert!(!engine.should_use_wasm());
    }

    // ── Re-export tests ────────────────────────────────────────────

    #[test]
    fn test_reexports_are_accessible() {
        // Verify that re-exported types are accessible from the crate root
        let _config = EngineConfig::default();
        let _pool = MemoryPool::new(4);
        let _threshold = ThresholdCheck::threshold_for("form-validator");
        let _error = EngineError::NotInitialized;

        // Verify they are the same types as the module versions
        let config_a = EngineConfig::default();
        let config_b = config::EngineConfig::default();
        assert_eq!(config_a.enable_wasm, config_b.enable_wasm);

        let pool_a = MemoryPool::new(2);
        let pool_b = memory::MemoryPool::new(2);
        assert_eq!(pool_a.capacity(), pool_b.capacity());
    }

    // ── Module visibility tests ────────────────────────────────────

    #[test]
    fn test_modules_are_public() {
        // All four modules should be publicly accessible
        let _ = config::EngineConfig::default();
        let _ = error::EngineError::NotInitialized;
        let _ = memory::MemoryPool::new(1);
        let _ = threshold::ThresholdCheck::FORM_VALIDATOR_MIN_FIELDS;
    }
}
