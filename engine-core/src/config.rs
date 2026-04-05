/// Configuration for engine behavior.
///
/// `EngineConfig` controls runtime behavior for all engine plugins,
/// including whether to enable WASM execution, whether to automatically
/// apply threshold checks, and whether to log performance metrics.
///
/// All fields are public for simple construction and modification. The
/// `Default` implementation provides a sensible baseline for production
/// use.
///
/// # Example
///
/// ```
/// use rustcn_engine_core::config::EngineConfig;
///
/// // Use defaults (WASM enabled, auto threshold, no perf logging)
/// let config = EngineConfig::default();
/// assert!(config.enable_wasm);
/// assert!(config.threshold_auto);
/// assert!(!config.log_performance);
///
/// // Customize
/// let custom = EngineConfig {
///     enable_wasm: false,
///     threshold_auto: true,
///     log_performance: true,
/// };
/// assert!(!custom.enable_wasm);
/// ```
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EngineConfig {
    /// Whether to enable WASM execution of engines.
    ///
    /// When `false`, engines will fall back to JavaScript execution
    /// regardless of data size. This is useful for debugging or on
    /// platforms where WASM is not supported.
    pub enable_wasm: bool,

    /// Whether to automatically apply threshold checks before execution.
    ///
    /// When `true`, the engine will check if input data size justifies
    /// WASM execution before crossing the boundary. Small inputs that
    /// would be slower in WASM due to serialization overhead are routed
    /// to JavaScript instead.
    pub threshold_auto: bool,

    /// Whether to log performance metrics after each execution.
    ///
    /// When `true`, engines should record and report execution time,
    /// data size, and whether WASM or JavaScript was used. This is
    /// disabled by default to avoid overhead in production.
    pub log_performance: bool,
}

impl Default for EngineConfig {
    /// Returns a configuration optimized for production use.
    ///
    /// - `enable_wasm`: `true` -- WASM execution is enabled
    /// - `threshold_auto`: `true` -- automatic threshold checks enabled
    /// - `log_performance`: `false` -- performance logging disabled to
    ///   avoid overhead
    fn default() -> Self {
        Self {
            enable_wasm: true,
            threshold_auto: true,
            log_performance: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = EngineConfig::default();
        assert!(config.enable_wasm);
        assert!(config.threshold_auto);
        assert!(!config.log_performance);
    }

    #[test]
    fn test_custom_config() {
        let config = EngineConfig {
            enable_wasm: false,
            threshold_auto: false,
            log_performance: true,
        };
        assert!(!config.enable_wasm);
        assert!(!config.threshold_auto);
        assert!(config.log_performance);
    }

    #[test]
    fn test_config_clone() {
        let original = EngineConfig {
            enable_wasm: false,
            threshold_auto: true,
            log_performance: true,
        };
        let cloned = original.clone();

        assert_eq!(original.enable_wasm, cloned.enable_wasm);
        assert_eq!(original.threshold_auto, cloned.threshold_auto);
        assert_eq!(original.log_performance, cloned.log_performance);
    }

    #[test]
    fn test_config_debug() {
        let config = EngineConfig::default();
        let debug_str = format!("{:?}", config);
        assert!(debug_str.contains("EngineConfig"));
        assert!(debug_str.contains("enable_wasm"));
        assert!(debug_str.contains("threshold_auto"));
        assert!(debug_str.contains("log_performance"));
    }

    #[test]
    fn test_config_serialize() {
        let config = EngineConfig {
            enable_wasm: true,
            threshold_auto: false,
            log_performance: true,
        };
        let json = serde_json::to_string(&config).expect("serialization should succeed");

        // Verify all fields are present in the JSON
        assert!(json.contains("\"enable_wasm\":true"));
        assert!(json.contains("\"threshold_auto\":false"));
        assert!(json.contains("\"log_performance\":true"));
    }

    #[test]
    fn test_config_deserialize() {
        let json = r#"{
            "enable_wasm": false,
            "threshold_auto": true,
            "log_performance": false
        }"#;
        let config: EngineConfig =
            serde_json::from_str(json).expect("deserialization should succeed");

        assert!(!config.enable_wasm);
        assert!(config.threshold_auto);
        assert!(!config.log_performance);
    }

    #[test]
    fn test_config_roundtrip() {
        let original = EngineConfig {
            enable_wasm: true,
            threshold_auto: true,
            log_performance: true,
        };
        let json = serde_json::to_string(&original).expect("serialize");
        let restored: EngineConfig = serde_json::from_str(&json).expect("deserialize");

        assert_eq!(original.enable_wasm, restored.enable_wasm);
        assert_eq!(original.threshold_auto, restored.threshold_auto);
        assert_eq!(original.log_performance, restored.log_performance);
    }

    #[test]
    fn test_config_all_true() {
        let config = EngineConfig {
            enable_wasm: true,
            threshold_auto: true,
            log_performance: true,
        };
        assert!(config.enable_wasm);
        assert!(config.threshold_auto);
        assert!(config.log_performance);
    }

    #[test]
    fn test_config_all_false() {
        let config = EngineConfig {
            enable_wasm: false,
            threshold_auto: false,
            log_performance: false,
        };
        assert!(!config.enable_wasm);
        assert!(!config.threshold_auto);
        assert!(!config.log_performance);
    }
}
