/**
 * Pure JS markdown fallback.
 *
 * Implements the same HTML output format as the Rust engine for result parity.
 * This is a simplified parser — for full parity, use the WASM path.
 *
 * Supported syntax:
 * - Headings (h1-h6)
 * - Bold, italic, strikethrough
 * - Code blocks and inline code
 * - Links and images
 * - Ordered and unordered lists
 * - Blockquotes
 * - Horizontal rules
 * - Paragraphs
 */

export interface MarkdownOptions {
  sanitize?: boolean;
  allowHtml?: boolean;
  breaks?: boolean;
  idPrefix?: string;
}

const DEFAULT_OPTIONS: Required<MarkdownOptions> = {
  sanitize: true,
  allowHtml: false,
  breaks: true,
  idPrefix: '',
};

/**
 * Render markdown to HTML.
 * Output format matches the Rust engine exactly.
 */
export function renderMarkdown(markdown: string, options?: MarkdownOptions): string {
  const opts: Required<MarkdownOptions> = { ...DEFAULT_OPTIONS, ...options };
  const lines = markdown.split('\n');
  const blocks = parseBlocks(lines);
  return renderBlocks(blocks, opts);
}

/**
 * Render markdown with a custom prefix for heading IDs.
 */
export function renderMarkdownWithPrefix(markdown: string, prefix: string, options?: MarkdownOptions): string {
  const opts = { ...options, idPrefix: prefix };
  return renderMarkdown(markdown, opts);
}

// ─── Block Parser ───────────────────────────────────────────────────────────

type Block =
  | { type: 'heading'; level: number; content: Inline[] }
  | { type: 'paragraph'; content: Inline[] }
  | { type: 'codeBlock'; lang: string; code: string }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'blockquote'; content: Block[] }
  | { type: 'hr' };

type Inline =
  | { type: 'text'; text: string }
  | { type: 'emphasis'; content: Inline[] }
  | { type: 'strong'; content: Inline[] }
  | { type: 'strikethrough'; content: Inline[] }
  | { type: 'code'; code: string }
  | { type: 'link'; text: string; url: string }
  | { type: 'image'; alt: string; url: string };

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'codeBlock', lang, code: codeLines.join('\n') });
      i++; // skip closing ```
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = parseInline(headingMatch[2]);
      blocks.push({ type: 'heading', level, content });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: 'blockquote', content: parseBlocks(quoteLines) });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^[-*]\s+/, '')));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\d+\.\s+/, '')));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^(-{3,}|_{3,}|\*{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', content: parseInline(paraLines.join(' ')) });
  }

  return blocks;
}

// ─── Inline Parser ──────────────────────────────────────────────────────────

function parseInline(text: string): Inline[] {
  const inlines: Inline[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      inlines.push({ type: 'code', code: codeMatch[1] });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Image
    const imgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      inlines.push({ type: 'image', alt: imgMatch[1], url: imgMatch[2] });
      remaining = remaining.slice(imgMatch[0].length);
      continue;
    }

    // Link
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      inlines.push({ type: 'link', text: linkMatch[1], url: linkMatch[2] });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Strong (bold)
    const strongMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (strongMatch) {
      inlines.push({ type: 'strong', content: parseInline(strongMatch[1]) });
      remaining = remaining.slice(strongMatch[0].length);
      continue;
    }

    // Emphasis (italic)
    const emMatch = remaining.match(/^\*(.+?)\*/);
    if (emMatch) {
      inlines.push({ type: 'emphasis', content: parseInline(emMatch[1]) });
      remaining = remaining.slice(emMatch[0].length);
      continue;
    }

    // Strikethrough
    const strikeMatch = remaining.match(/^~~(.+?)~~/);
    if (strikeMatch) {
      inlines.push({ type: 'strikethrough', content: parseInline(strikeMatch[1]) });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // Plain text (until next markup)
    const nextMarkupIndex = remaining.slice(1).search(/[`!\[*~]/);
    if (nextMarkupIndex === -1) {
      inlines.push({ type: 'text', text: remaining });
      break;
    }
    inlines.push({ type: 'text', text: remaining.slice(0, nextMarkupIndex + 1) });
    remaining = remaining.slice(nextMarkupIndex + 1);
  }

  return inlines;
}

// ─── HTML Renderer ──────────────────────────────────────────────────────────

function renderBlocks(blocks: Block[], options: Required<MarkdownOptions>): string {
  return blocks.map((block) => renderBlock(block, options)).join('');
}

function renderBlock(block: Block, options: Required<MarkdownOptions>): string {
  switch (block.type) {
    case 'heading': {
      const text = renderInlines(block.content, options);
      const id = makeId(text, options.idPrefix);
      return `<h${block.level} id="${id}">${text}</h${block.level}>\n`;
    }

    case 'paragraph':
      return `<p>${renderInlines(block.content, options)}</p>\n`;

    case 'codeBlock': {
      const escaped = escapeHtml(block.code);
      if (block.lang) {
        return `<pre><code class="language-${block.lang}">${escaped}</code></pre>\n`;
      }
      return `<pre><code>${escaped}</code></pre>\n`;
    }

    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const itemsHtml = block.items
        .map((inlines) => `<li>${renderInlines(inlines, options)}</li>`)
        .join('\n');
      return `<${tag}>\n${itemsHtml}\n</${tag}>\n`;
    }

    case 'blockquote': {
      const inner = block.content.map((b) => renderBlock(b, options)).join('');
      return `<blockquote>\n${inner}</blockquote>\n`;
    }

    case 'hr':
      return '<hr>\n';
  }
}

function renderInlines(inlines: Inline[], options: Required<MarkdownOptions>): string {
  return inlines
    .map((inline) => {
      switch (inline.type) {
        case 'text':
          return escapeHtml(inline.text);
        case 'emphasis':
          return `<em>${renderInlines(inline.content, options)}</em>`;
        case 'strong':
          return `<strong>${renderInlines(inline.content, options)}</strong>`;
        case 'strikethrough':
          return `<del>${renderInlines(inline.content, options)}</del>`;
        case 'code':
          return `<code>${escapeHtml(inline.code)}</code>`;
        case 'link':
          return `<a href="${escapeAttr(inline.url)}">${escapeHtml(inline.text)}</a>`;
        case 'image':
          return `<img src="${escapeAttr(inline.url)}" alt="${escapeAttr(inline.alt)}">`;
      }
    })
    .join('');
}

function makeId(text: string, prefix: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return prefix ? `${prefix}-${slug}` : slug;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitize HTML output by removing dangerous tags and attributes.
 * Matches the Rust engine's sanitization logic.
 */
export function sanitizeHtml(html: string): string {
  return html
    // Remove script, iframe, object, embed, form tags
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*\S+/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, 'blocked:')
    // Remove self-closing dangerous tags
    .replace(/<(script|iframe|object|embed|form)[^>]*\/?>/gi, '');
}
