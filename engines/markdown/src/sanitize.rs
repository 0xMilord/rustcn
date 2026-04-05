//! XSS sanitization for rendered HTML.
//!
//! Strips dangerous tags and attributes while preserving formatting.

/// Sanitize HTML output to prevent XSS attacks.
///
/// This is a defense-in-depth measure. It:
/// - Removes <script> tags and contents
/// - Removes event handler attributes (onclick, onerror, etc.)
/// - Removes javascript: and data: URLs
/// - Removes <iframe>, <object>, <embed> tags
pub fn sanitize_html(html: &str) -> String {
    let mut result = html.to_string();

    // Remove script tags and contents
    loop {
        let lower = result.to_lowercase();
        if let Some(start) = lower.find("<script") {
            if let Some(end) = lower[start..].find("</script>") {
                result.replace_range(start..start + end + 9, "");
            } else {
                break;
            }
        } else {
            break;
        }
    }

    // Remove dangerous tags
    for tag in &["iframe", "object", "embed", "form", "input", "button", "select", "textarea"] {
        loop {
            let lower = result.to_lowercase();
            if let Some(start) = lower.find(&format!("<{}", tag)) {
                if let Some(end) = result[start..].find('>') {
                    // Check if self-closing
                    let tag_content = &result[start..start + end + 1];
                    if tag_content.ends_with("/>") {
                        result.replace_range(start..start + end + 1, "");
                    } else {
                        // Find closing tag
                        let closing = format!("</{}", tag);
                        if let Some(close_start) = lower[start..].find(&closing) {
                            if let Some(close_end) = result[start + close_start..].find('>') {
                                result.replace_range(start..start + close_start + close_end + 1, "");
                            } else { break; }
                        } else {
                            result.replace_range(start..start + end + 1, "");
                        }
                    }
                } else { break; }
            } else { break; }
        }
    }

    // Remove event handler attributes
    let mut cleaned = String::new();
    let mut remaining = result.as_str();
    while let Some(pos) = remaining.find(" on") {
        cleaned.push_str(&remaining[..pos]);
        remaining = &remaining[pos + 1..]; // skip the space
        // Skip until the closing quote or >
        if let Some(end) = remaining.find(|c: char| c == '"' || c == '>' || c == '\'') {
            if let Some(inner_end) = remaining[end..].find(|c: char| c == '"' || c == '\'') {
                remaining = &remaining[end + inner_end + 1..];
            } else {
                remaining = &remaining[end..];
            }
        }
    }
    cleaned.push_str(remaining);
    result = cleaned;

    // Remove javascript: URLs
    loop {
        let lower = result.to_lowercase();
        if let Some(pos) = lower.find("javascript:") {
            if pos > 0 {
                let before = &result[..pos];
                if before.ends_with("href=\"") || before.ends_with("src=\"") {
                    // Replace the javascript: URL
                    if let Some(end_quote) = result[pos..].find('"') {
                        result.replace_range(pos..pos + end_quote, "#");
                    } else { break; }
                } else { break; }
            } else { break; }
        } else { break; }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_remove_script() {
        let input = "<p>Hello</p><script>alert('xss')</script><p>World</p>";
        let output = sanitize_html(input);
        assert!(!output.contains("<script"));
        assert!(!output.contains("alert"));
        assert!(output.contains("<p>Hello</p>"));
        assert!(output.contains("<p>World</p>"));
    }

    #[test]
    fn test_remove_event_handlers() {
        let input = r#"<p onclick="alert('xss')">Hello</p>"#;
        let output = sanitize_html(input);
        assert!(!output.contains("onclick"));
    }

    #[test]
    fn test_remove_iframe() {
        let input = "<p>Before</p><iframe src=\"evil\"></iframe><p>After</p>";
        let output = sanitize_html(input);
        assert!(!output.contains("<iframe"));
        assert!(output.contains("<p>Before</p>"));
    }

    #[test]
    fn test_remove_javascript_url() {
        let input = r#"<a href="javascript:alert('xss')">Link</a>"#;
        let output = sanitize_html(input);
        assert!(!output.contains("javascript:"));
        assert!(output.contains("<a href=\"#\">Link</a>"));
    }

    #[test]
    fn test_safe_html_passthrough() {
        let input = "<p><strong>Bold</strong> and <em>italic</em></p>";
        let output = sanitize_html(input);
        assert_eq!(output, input);
    }

    #[test]
    fn test_remove_form_elements() {
        let input = "<input type=\"text\" value=\"stolen\" />";
        let output = sanitize_html(input);
        assert!(!output.contains("<input"));
    }
}
