//! Types for the markdown parser.

use serde::{Deserialize, Serialize};

/// Options for markdown rendering.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderOptions {
    /// Whether to sanitize HTML output.
    #[serde(default = "default_true")]
    pub sanitize: bool,
    /// Whether to allow raw HTML in markdown.
    #[serde(default)]
    pub allow_html: bool,
    /// Convert line breaks to <br>.
    #[serde(default)]
    pub breaks: bool,
    /// Prefix for heading IDs.
    #[serde(default)]
    pub id_prefix: String,
}

impl Default for RenderOptions {
    fn default() -> Self {
        Self { sanitize: true, allow_html: false, breaks: true, id_prefix: String::new() }
    }
}

fn default_true() -> bool { true }

/// Result of a markdown render operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderResult {
    /// The rendered HTML.
    pub html: String,
    /// Number of bytes in the input.
    #[serde(rename = "input_bytes")]
    pub input_bytes: usize,
    /// Time taken to parse in milliseconds.
    #[serde(rename = "parse_time_ms")]
    pub parse_time_ms: f64,
    /// Number of blocks parsed.
    #[serde(rename = "block_count")]
    pub block_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_options_defaults() {
        let opts = RenderOptions::default();
        assert!(opts.sanitize);
        assert!(!opts.allow_html);
        assert!(opts.breaks);
        assert!(opts.id_prefix.is_empty());
    }

    #[test]
    fn test_render_options_from_json() {
        let json = r#"{"sanitize": false, "allow_html": true, "id_prefix": "doc-"}"#;
        let opts: RenderOptions = serde_json::from_str(json).unwrap();
        assert!(!opts.sanitize);
        assert!(opts.allow_html);
        assert_eq!(opts.id_prefix, "doc-");
    }

    #[test]
    fn test_render_result_serialization() {
        let result = RenderResult {
            html: "<p>test</p>".to_string(),
            input_bytes: 100,
            parse_time_ms: 2.5,
            block_count: 5,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("html"));
        assert!(json.contains("input_bytes"));
        assert!(json.contains("parse_time_ms"));
        assert!(json.contains("block_count"));
    }
}
