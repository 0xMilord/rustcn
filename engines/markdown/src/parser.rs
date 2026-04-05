//! Core markdown parser.
//!
//! Parses markdown text into an AST, then renders to HTML.
//! Supports: headings, emphasis, code, links, images, lists, blockquotes, tables, HR.

use rustcn_engine_core::EngineError;
use crate::types::{RenderOptions, RenderResult};
use crate::html::HtmlRenderer;
use crate::sanitize::sanitize_html;

/// Markdown AST nodes.
#[derive(Debug, Clone)]
enum Block {
    Heading { level: u8, content: Vec<Inline> },
    Paragraph { content: Vec<Inline> },
    CodeBlock { lang: String, code: String },
    List { ordered: bool, items: Vec<Vec<Inline>> },
    BlockQuote { content: Vec<Block> },
    Table { headers: Vec<Vec<Inline>>, rows: Vec<Vec<Vec<Inline>>> },
    ThematicDiv,
}

#[derive(Debug, Clone)]
enum Inline {
    Text(String),
    Emphasis(Vec<Inline>),
    Strong(Vec<Inline>),
    Strikethrough(Vec<Inline>),
    Code(String),
    Link { text: String, url: String },
    Image { alt: String, url: String },
}

/// A markdown parser that renders to HTML.
pub struct MarkdownParser {
    sanitize: bool,
    allow_html: bool,
}

impl MarkdownParser {
    pub fn new() -> Self {
        Self { sanitize: true, allow_html: false }
    }

    pub fn render(&self, markdown: &str, options: &RenderOptions) -> Result<String, EngineError> {
        use web_time::Instant;
        let start = Instant::now();

        let blocks = self.parse_blocks(markdown);
        let mut renderer = HtmlRenderer::new(options);
        let html = renderer.render(&blocks);

        let final_html = if self.sanitize && options.sanitize {
            sanitize_html(&html)
        } else {
            html
        };

        let parse_time_ms = start.elapsed().as_secs_f64() * 1000.0;

        let result = RenderResult {
            html: final_html,
            input_bytes: markdown.len(),
            parse_time_ms,
            block_count: blocks.len(),
        };

        serde_json::to_string(&result).map_err(|e| EngineError::SerializationError(e.to_string()))
    }

    pub fn render_with_prefix(&self, markdown: &str, prefix: &str) -> Result<String, EngineError> {
        let blocks = self.parse_blocks(markdown);
        let mut renderer = HtmlRenderer::new(&RenderOptions { id_prefix: prefix.to_string(), ..Default::default() });
        let html = renderer.render(&blocks);
        let final_html = if self.sanitize { sanitize_html(&html) } else { html };
        Ok(final_html)
    }

    fn parse_blocks(&self, markdown: &str) -> Vec<Block> {
        let mut blocks = Vec::new();
        let mut lines = markdown.lines().peekable();

        while let Some(line) = lines.next() {
            let trimmed = line.trim();
            if trimmed.is_empty() { continue; }

            // Code block
            if trimmed.starts_with("```") {
                let lang = trimmed.strip_prefix("```").unwrap_or("").trim();
                let mut code = String::new();
                while let Some(&next) = lines.peek() {
                    if next.trim().starts_with("```") { lines.next(); break; }
                    code.push_str(lines.next().unwrap());
                    code.push('\n');
                }
                blocks.push(Block::CodeBlock { lang: lang.to_string(), code: code.trim_end().to_string() });
                continue;
            }

            // Heading
            if let Some((level, content)) = parse_heading(trimmed) {
                blocks.push(Block::Heading { level, content: parse_inlines(content) });
                continue;
            }

            // Thematic break
            if trimmed == "---" || trimmed == "***" || trimmed == "___" {
                blocks.push(Block::ThematicDiv);
                continue;
            }

            // Blockquote
            if trimmed.starts_with("> ") || trimmed == ">" {
                let mut quote_lines = Vec::new();
                let content = trimmed.strip_prefix("> ").unwrap_or(trimmed.strip_prefix(">").unwrap_or(""));
                quote_lines.push(content);
                while let Some(&next) = lines.peek() {
                    let n = next.trim();
                    if n.starts_with("> ") || n == ">" {
                        let c = n.strip_prefix("> ").unwrap_or(n.strip_prefix(">").unwrap_or(""));
                        quote_lines.push(c);
                        lines.next();
                    } else { break; }
                }
                let inner = self.parse_blocks(&quote_lines.join("\n"));
                blocks.push(Block::BlockQuote { content: inner });
                continue;
            }

            // Table (simplified: header | separator | rows)
            if trimmed.contains('|') && lines.peek().map(|l| l.contains('|')).unwrap_or(false) {
                let header_cells = parse_table_row(trimmed);
                let sep = lines.next().unwrap_or("");
                if !sep.contains('|') { /* not a table */ }
                else {
                    let mut rows = Vec::new();
                    while let Some(&next) = lines.peek() {
                        if !next.contains('|') { break; }
                        let row_cells = parse_table_row(lines.next().unwrap());
                        rows.push(row_cells);
                    }
                    let headers: Vec<Vec<Inline>> = header_cells.into_iter().map(|c| parse_inlines(&c)).collect();
                    let row_data: Vec<Vec<Vec<Inline>>> = rows.into_iter()
                        .map(|cells| cells.into_iter().map(|c| parse_inlines(&c)).collect())
                        .collect();
                    blocks.push(Block::Table { headers, rows: row_data });
                    continue;
                }
            }

            // Unordered list
            if trimmed.starts_with("- ") || trimmed.starts_with("* ") {
                let mut items = Vec::new();
                let first = trimmed.strip_prefix("- ").unwrap_or_else(|| trimmed.strip_prefix("* ").unwrap());
                items.push(parse_inlines(first));
                while let Some(&next) = lines.peek() {
                    let n = next.trim();
                    if n.starts_with("- ") {
                        let item = n.strip_prefix("- ").unwrap();
                        items.push(parse_inlines(item));
                        lines.next();
                    } else if n.starts_with("* ") {
                        let item = n.strip_prefix("* ").unwrap();
                        items.push(parse_inlines(item));
                        lines.next();
                    } else { break; }
                }
                blocks.push(Block::List { ordered: false, items });
                continue;
            }

            // Ordered list
            if trimmed.chars().take_while(|c| c.is_ascii_digit()).count() > 0
               && trimmed.contains(". ")
               && trimmed.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false) {
                let mut items = Vec::new();
                if let Some(pos) = trimmed.find(". ") {
                    items.push(parse_inlines(&trimmed[pos + 2..]));
                }
                while let Some(&next) = lines.peek() {
                    let n = next.trim();
                    if let Some(pos) = n.find(". ") {
                        if n.chars().take(pos).all(|c| c.is_ascii_digit()) {
                            items.push(parse_inlines(&n[pos + 2..]));
                            lines.next();
                            continue;
                        }
                    }
                    break;
                }
                blocks.push(Block::List { ordered: true, items });
                continue;
            }

            // Paragraph (default)
            let mut para_lines = vec![trimmed];
            while let Some(&next) = lines.peek() {
                if next.trim().is_empty() { break; }
                if parse_heading(next.trim()).is_some() { break; }
                if next.trim().starts_with("```") { break; }
                if next.trim() == "---" { break; }
                para_lines.push(lines.next().unwrap().trim());
            }
            let content = parse_inlines(&para_lines.join(" "));
            blocks.push(Block::Paragraph { content });
        }

        blocks
    }
}

impl rustcn_engine_core::Engine for MarkdownParser {
    fn name(&self) -> &str { "markdown" }
    fn execute(&self, input: &str) -> Result<String, rustcn_engine_core::EngineError> {
        self.render(input, &crate::types::RenderOptions::default())
    }
    fn estimated_data_size(&self) -> usize { 0 } // Determined at call time
}

fn parse_heading(line: &str) -> Option<(u8, &str)> {
    if line.starts_with("###### ") { Some((6, &line[7..])) }
    else if line.starts_with("##### ") { Some((5, &line[6..])) }
    else if line.starts_with("#### ") { Some((4, &line[5..])) }
    else if line.starts_with("### ") { Some((3, &line[4..])) }
    else if line.starts_with("## ") { Some((2, &line[3..])) }
    else if line.starts_with("# ") { Some((1, &line[2..])) }
    else { None }
}

fn parse_inlines(text: &str) -> Vec<Inline> {
    let mut inlines = Vec::new();
    let mut remaining = text;

    while !remaining.is_empty() {
        // Inline code
        if let Some(pos) = remaining.find('`') {
            if pos > 0 {
                inlines.extend(parse_emphasis_and_links(&remaining[..pos]));
            }
            remaining = &remaining[pos + 1..];
            if let Some(end) = remaining.find('`') {
                inlines.push(Inline::Code(remaining[..end].to_string()));
                remaining = &remaining[end + 1..];
            } else {
                inlines.push(Inline::Text(remaining.to_string()));
                remaining = "";
            }
        } else {
            inlines.extend(parse_emphasis_and_links(remaining));
            remaining = "";
        }
    }

    inlines
}

fn parse_emphasis_and_links(text: &str) -> Vec<Inline> {
    // Simplified: handle **bold**, *italic*, [link](url), ![img](url)
    let mut result = Vec::new();
    let mut remaining = text;

    while !remaining.is_empty() {
        if remaining.starts_with("**") {
            if let Some(end) = remaining[2..].find("**") {
                result.push(Inline::Strong(parse_inlines(&remaining[2..2 + end])));
                remaining = &remaining[4 + end..];
                continue;
            }
        }
        if remaining.starts_with("*") && !remaining.starts_with("* ") && remaining.len() > 1 {
            if let Some(end) = remaining[1..].find('*') {
                result.push(Inline::Emphasis(parse_inlines(&remaining[1..1 + end])));
                remaining = &remaining[2 + end..];
                continue;
            }
        }
        if remaining.starts_with("![") {
            if let Some(close) = remaining.find(']') {
                let alt = &remaining[2..close];
                if remaining[close..].starts_with("](") {
                    if let Some(end) = remaining[close + 2..].find(')') {
                        let url = &remaining[close + 2..close + 2 + end];
                        result.push(Inline::Image { alt: alt.to_string(), url: url.to_string() });
                        remaining = &remaining[close + 3 + end..];
                        continue;
                    }
                }
            }
        }
        if remaining.starts_with('[') {
            if let Some(close) = remaining.find(']') {
                let link_text = &remaining[1..close];
                if remaining[close..].starts_with("](") {
                    if let Some(end) = remaining[close + 2..].find(')') {
                        let url = &remaining[close + 2..close + 2 + end];
                        result.push(Inline::Link { text: link_text.to_string(), url: url.to_string() });
                        remaining = &remaining[close + 3 + end..];
                        continue;
                    }
                }
            }
        }
        // Plain text until next special char
        let end = remaining.find(&['*', '[', '`'][..]).unwrap_or(remaining.len());
        if end > 0 {
            result.push(Inline::Text(remaining[..end].to_string()));
            remaining = &remaining[end..];
        } else if end == 0 {
            result.push(Inline::Text(remaining[..1].to_string()));
            remaining = &remaining[1..];
        } else {
            result.push(Inline::Text(remaining.to_string()));
            remaining = "";
        }
    }

    result
}

fn parse_table_row(line: &str) -> Vec<String> {
    let trimmed = line.trim().strip_prefix('|').unwrap_or(line.trim());
    let trimmed = trimmed.strip_suffix('|').unwrap_or(trimmed);
    trimmed.split('|').map(|c| c.trim().to_string()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_heading_simple() {
        assert_eq!(parse_heading("# Hello"), Some((1, "Hello")));
        assert_eq!(parse_heading("## World"), Some((2, "World")));
        assert_eq!(parse_heading("###### Deep"), Some((6, "Deep")));
        assert_eq!(parse_heading("Not a heading"), None);
    }

    #[test]
    fn test_parse_inlines_simple() {
        let inlines = parse_inlines("Hello world");
        assert_eq!(inlines.len(), 1);
        match &inlines[0] { Inline::Text(t) => assert_eq!(t, "Hello world"), _ => panic!() }
    }

    #[test]
    fn test_parse_bold() {
        let inlines = parse_inlines("**bold text**");
        assert_eq!(inlines.len(), 1);
        match &inlines[0] { Inline::Strong(inner) => assert_eq!(inner.len(), 1), _ => panic!("Expected Strong") }
    }

    #[test]
    fn test_parse_link() {
        let inlines = parse_inlines("[Google](https://google.com)");
        assert_eq!(inlines.len(), 1);
        match &inlines[0] {
            Inline::Link { text, url } => {
                assert_eq!(text, "Google");
                assert_eq!(url, "https://google.com");
            }
            _ => panic!("Expected Link"),
        }
    }

    #[test]
    fn test_parse_inline_code() {
        let inlines = parse_inlines("Use `code` here");
        assert_eq!(inlines.len(), 3);
        match &inlines[1] { Inline::Code(c) => assert_eq!(c, "code"), _ => panic!("Expected Code") }
    }

    #[test]
    fn test_parse_table_row() {
        let cells = parse_table_row("| Name | Age | City |");
        assert_eq!(cells, vec!["Name", "Age", "City"]);
    }

    #[test]
    fn test_full_render() {
        let parser = MarkdownParser::new();
        let md = "# Hello\n\nThis is **bold** and *italic*.\n\n- Item 1\n- Item 2\n";
        let result = parser.render(md, &crate::types::RenderOptions::default()).unwrap();
        let parsed: RenderResult = serde_json::from_str(&result).unwrap();
        assert!(!parsed.html.is_empty());
        assert!(parsed.html.contains("<h1"));
        assert!(parsed.html.contains("<strong>"));
        assert!(parsed.html.contains("<ul>"));
    }

    #[test]
    fn test_render_code_block() {
        let parser = MarkdownParser::new();
        let md = "```\nfn main() {}\n```";
        let result = parser.render(md, &crate::types::RenderOptions::default()).unwrap();
        let parsed: RenderResult = serde_json::from_str(&result).unwrap();
        assert!(parsed.html.contains("<pre"));
        assert!(parsed.html.contains("fn main()"));
    }

    #[test]
    fn test_render_link() {
        let parser = MarkdownParser::new();
        let md = "[Click here](https://example.com)";
        let result = parser.render(md, &crate::types::RenderOptions::default()).unwrap();
        let parsed: RenderResult = serde_json::from_str(&result).unwrap();
        assert!(parsed.html.contains("<a"));
        assert!(parsed.html.contains("https://example.com"));
    }

    #[test]
    fn test_render_blockquote() {
        let parser = MarkdownParser::new();
        let md = "> This is a quote";
        let result = parser.render(md, &crate::types::RenderOptions::default()).unwrap();
        let parsed: RenderResult = serde_json::from_str(&result).unwrap();
        assert!(parsed.html.contains("<blockquote"));
    }

    #[test]
    fn test_render_thematic_div() {
        let parser = MarkdownParser::new();
        let md = "---";
        let result = parser.render(md, &crate::types::RenderOptions::default()).unwrap();
        let parsed: RenderResult = serde_json::from_str(&result).unwrap();
        assert!(parsed.html.contains("<hr"));
    }

    #[test]
    fn test_empty_input() {
        let parser = MarkdownParser::new();
        let result = parser.render("", &crate::types::RenderOptions::default()).unwrap();
        let parsed: RenderResult = serde_json::from_str(&result).unwrap();
        assert!(parsed.html.is_empty() || parsed.html == "");
    }

    #[test]
    fn test_render_with_prefix() {
        let parser = MarkdownParser::new();
        let md = "# Title";
        let html = parser.render_with_prefix(md, "doc-").unwrap();
        assert!(html.contains("doc-"));
    }
}
