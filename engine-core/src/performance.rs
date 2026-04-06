/// Performance metrics for engine execution.
///
/// Tracks execution time, data size, and whether WASM or JS was used.
/// Used by DevTools and performance logging.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PerformanceMetrics {
    /// Engine name that produced these metrics
    pub engine: String,
    /// Whether WASM execution was used
    pub used_wasm: bool,
    /// Input data size (fields, rows, or bytes depending on engine)
    pub input_size: usize,
    /// Execution time in milliseconds
    pub execution_time_ms: f64,
    /// Serialization time in milliseconds (JS -> WASM boundary)
    pub serialize_time_ms: f64,
    /// Deserialization time in milliseconds (WASM -> JS boundary)
    pub deserialize_time_ms: f64,
    /// Total time including all overhead
    pub total_time_ms: f64,
}

impl PerformanceMetrics {
    /// Create a new metrics instance with basic data.
    pub fn new(engine: &str, used_wasm: bool, input_size: usize, execution_time_ms: f64) -> Self {
        Self {
            engine: engine.to_string(),
            used_wasm,
            input_size,
            execution_time_ms,
            serialize_time_ms: 0.0,
            deserialize_time_ms: 0.0,
            total_time_ms: execution_time_ms,
        }
    }

    /// Set serialization and deserialization times.
    pub fn with_overhead(mut self, serialize_ms: f64, deserialize_ms: f64) -> Self {
        self.serialize_time_ms = serialize_ms;
        self.deserialize_time_ms = deserialize_ms;
        self.total_time_ms = serialize_ms + self.execution_time_ms + deserialize_ms;
        self
    }

    /// Log the metrics to the console (browser or stdout).
    pub fn log(&self) {
        let mode = if self.used_wasm { "WASM" } else { "JS" };
        #[cfg(target_arch = "wasm32")]
        {
            web_sys::console::log_1(
                &format!(
                    "[rustcn] {} | {} | input: {} | exec: {:.2}ms | total: {:.2}ms",
                    self.engine, mode, self.input_size, self.execution_time_ms, self.total_time_ms
                )
                .into(),
            );
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            println!(
                "[rustcn] {} | {} | input: {} | exec: {:.2}ms | total: {:.2}ms",
                self.engine, mode, self.input_size, self.execution_time_ms, self.total_time_ms
            );
        }
    }

    /// Check if this execution was slower than the JS baseline would have been.
    /// Returns true if WASM was the wrong choice for this data size.
    pub fn was_wasm_worth_it(&self, threshold: usize) -> bool {
        self.input_size >= threshold
    }

    /// Get a human-readable summary.
    pub fn summary(&self) -> String {
        let mode = if self.used_wasm { "WASM" } else { "JS" };
        format!(
            "{} ({}) | {} rows/fields | {:.2}ms exec | {:.2}ms total",
            self.engine, mode, self.input_size, self.execution_time_ms, self.total_time_ms
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_metrics() {
        let m = PerformanceMetrics::new("test-engine", true, 1000, 5.0);
        assert_eq!(m.engine, "test-engine");
        assert!(m.used_wasm);
        assert_eq!(m.input_size, 1000);
        assert_eq!(m.execution_time_ms, 5.0);
        assert_eq!(m.serialize_time_ms, 0.0);
        assert_eq!(m.total_time_ms, 5.0);
    }

    #[test]
    fn test_with_overhead() {
        let m = PerformanceMetrics::new("test", true, 100, 3.0)
            .with_overhead(1.0, 0.5);
        assert_eq!(m.serialize_time_ms, 1.0);
        assert_eq!(m.deserialize_time_ms, 0.5);
        assert_eq!(m.total_time_ms, 4.5);
    }

    #[test]
    fn test_was_wasm_worth_it() {
        let m = PerformanceMetrics::new("test", true, 1000, 1.0);
        assert!(m.was_wasm_worth_it(500));
        assert!(!m.was_wasm_worth_it(2000));
    }

    #[test]
    fn test_summary() {
        let m = PerformanceMetrics::new("data-table", true, 10_000, 2.5);
        let s = m.summary();
        assert!(s.contains("data-table"));
        assert!(s.contains("WASM"));
        assert!(s.contains("10000"));
    }

    #[test]
    fn test_serialize_roundtrip() {
        let m = PerformanceMetrics::new("test", false, 50, 10.0)
            .with_overhead(0.5, 0.3);
        let json = serde_json::to_string(&m).unwrap();
        let restored: PerformanceMetrics = serde_json::from_str(&json).unwrap();
        assert_eq!(m.engine, restored.engine);
        assert_eq!(m.used_wasm, restored.used_wasm);
        assert_eq!(m.execution_time_ms, restored.execution_time_ms);
    }
}
