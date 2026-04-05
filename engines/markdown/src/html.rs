//! HTML renderer for Markdown AST.

use crate::parser::{Block, Inline};
use crate::types::RenderOptions;

pub struct HtmlRenderer {
    options: RenderOptions,
}

impl HtmlRenderer {
    pub fn new(options: &RenderOptions) -> Self {
        Self { options: options.clone() }
    }

    pub fn render(&self, blocks: &[Block]) -> String {
        let mut html = String::new();
        for block in blocks {
            html.push_str(&self.render_block(block));
        }
        html
    }

    fn render_block(&self, block: &Block) -> String {
        match block {
            Block::Heading { level, content } => {
                let text = self.render_inlines(content);
                let id = self.make_id(&text);
                format!("<h{} id=\"{}\">{}</h{}>\n", level, id, text, level)
            }
            Block::Paragraph { content } => {
                format!("<p>{}</p>\n", self.render_inlines(content))
            }
            Block::CodeBlock { lang, code } => {
                let escaped = escape_html(code);
                if lang.is_empty() {
                    format!("<pre><code>{}</code></pre>\n", escaped)
                } else {
                    format!("<pre><code class=\"language-{}\">{}</code></pre>\n", lang, escaped)
                }
            }
            Block::List { ordered, items } => {
                let tag = if *ordered { "ol" } else { "ul" };
                let items_html = items.iter()
                    .map(|inlines| format!("<li>{}</li>", self.render_inlines(inlines)))
                    .collect::<Vec<_>>()
                    .join("\n");
                format!("<{}>\n{}</{}>\n", tag, items_html, tag)
            }
            Block::BlockQuote { content } => {
                let inner = content.iter().map(|b| self.render_block(b)).collect::<String>();
                format!("<blockquote>{}</blockquote>\n", inner)
            }
            Block::Table { headers, rows } => {
                let header_html = headers.iter()
                    .map(|h| format!("<th>{}</th>", self.render_inlines(h)))
                    .collect::<Vec<_>>()
                    .join("");
                let rows_html = rows.iter().map(|row| {
                    let cells = row.iter()
                        .map(|c| format!("<td>{}</td>", self.render_inlines(c)))
                        .collect::<Vec<_>>()
                        .join("");
                    format!("<tr>{}</tr>", cells)
                }).collect::<Vec<_>>().join("\n");
                format!("<table>\n<thead><tr>{}</tr></thead>\n<tbody>\n{}</tbody>\n</table>\n", header_html, rows_html)
            }
            Block::ThematicDiv => String::from("<hr />\n"),
        }
    }

    fn render_inlines(&self, inlines: &[Inline]) -> String {
        inlines.iter().map(|i| self.render_inline(i)).collect::<String>()
    }

    fn render_inline(&self, inline: &Inline) -> String {
        match inline {
            Inline::Text(t) => escape_html(t),
            Inline::Emphasis(inner) => format!("<em>{}</em>", self.render_inlines(inner)),
            Inline::Strong(inner) => format!("<strong>{}</strong>", self.render_inlines(inner)),
            Inline::Strikethrough(inner) => format!("<del>{}</del>", self.render_inlines(inner)),
            Inline::Code(c) => format!("<code>{}</code>", escape_html(c)),
            Inline::Link { text, url } => {
                let safe_url = escape_html(url);
                format!("<a href=\"{}\" target=\"_blank\" rel=\"noopener noreferrer\">{}</a>", safe_url, escape_html(text))
            }
            Inline::Image { alt, url } => {
                format!("<img src=\"{}\" alt=\"{}\" />", escape_html(url), escape_html(alt))
            }
        }
    }

    fn make_id(&self, text: &str) -> String {
        let prefix = &self.options.id_prefix;
        let id: String = text.chars()
            .filter(|c| c.is_alphanumeric() || *c == ' ')
            .collect::<String>()
            .trim()
            .to_lowercase()
            .replace(' ', "-");
        format!("{}{}", prefix, id)
    }
}

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
     .replace('<', "&lt;")
     .replace('>', "&gt;")
     .replace('"', "&quot;")
}
