//! WASM bindings for the markdown parser engine.
//!
//! Exposes a `MarkdownParser` struct callable from JavaScript via wasm-bindgen.

use rustcn_engine_core::Engine;
use wasm_bindgen::prelude::*;

mod parser;
mod html;
mod sanitize;
mod types;

use parser::MarkdownParser as CoreParser;

/// A high-performance Markdown parser powered by Rust WASM.
/// Use this for rendering Markdown content at scale (50 KB+ docs)
/// where JavaScript parsers become sluggish.
///
/// For small documents, the JS fallback will be faster.
#[wasm_bindgen]
pub struct MarkdownParser {
    inner: CoreParser,
}

#[wasm_bindgen]
impl MarkdownParser {
    /// Create a new markdown parser.
    #[wasm_bindgen(constructor)]
    pub fn new() -> MarkdownParser {
        MarkdownParser { inner: CoreParser::new() }
    }

    /// Parse markdown text to HTML.
    ///
    /// # Supported syntax
    /// - Headings (h1-h6)
    /// - Bold, italic, strikethrough
    /// - Code blocks and inline code
    /// - Links and images
    /// - Ordered and unordered lists
    /// - Blockquotes
    /// - Tables
    /// - Horizontal rules
    ///
    /// # Options
    /// Pass a JSON options string or null for defaults:
    /// `{ "sanitize": true, "allow_html": false, "breaks": true }`
    #[wasm_bindgen]
    pub fn render(&self, markdown: &str, options_json: Option<&str>) -> Result<String, JsValue> {
        let options = if let Some(json) = options_json {
            serde_json::from_str(json).map_err(|e| JsValue::from_str(&e.to_string()))?
        } else {
            types::RenderOptions::default()
        };
        self.inner.render(markdown, &options)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Render markdown with a custom prefix for headings (for ID generation).
    #[wasm_bindgen(js_name = renderWithPrefix)]
    pub fn render_with_prefix(&self, markdown: &str, prefix: &str) -> Result<String, JsValue> {
        self.inner.render_with_prefix(markdown, prefix)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Returns the engine name identifier.
    #[wasm_bindgen(js_name = engineName)]
    pub fn engine_name(&self) -> String {
        self.inner.name().to_string()
    }

    /// Returns the estimated data size (byte count of input).
    #[wasm_bindgen(js_name = estimatedSize)]
    pub fn estimated_size(&self, markdown: &str) -> usize {
        markdown.len()
    }
}
