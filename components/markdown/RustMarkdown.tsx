/**
 * RustMarkdown — A markdown renderer component.
 *
 * For production use with the WASM engine, import from `@rustcn/react`.
 * This standalone version uses a lightweight JS parser.
 */

import React, { useMemo } from 'react';

export interface RustMarkdownProps {
  content: string;
  className?: string;
  allowHtml?: boolean;
}

/**
 * Lightweight Markdown parser (supports headings, bold, italic, code, links, lists, hr).
 * For production with large docs, use the WASM-powered version from @rustcn/react.
 */
function parseMarkdown(md: string): string {
  let html = md;

  // Escape HTML (unless allowHtml)
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks (```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted rounded-md p-4 overflow-x-auto text-sm font-mono"><code class="language-$1">$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-5 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline underline-offset-4 hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-md" />');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="my-4" />');

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ml-4">$1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc space-y-1 my-2">$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-muted pl-4 italic text-muted-foreground">$1</blockquote>');

  // Paragraphs (lines not already wrapped)
  html = html.replace(/^(?!<[a-z])((?!<\/).+)$/gm, '<p class="my-2">$1</p>');

  // Line breaks
  html = html.replace(/\n{2,}/g, '</p><p class="my-2">');

  return html;
}

export function RustMarkdown({ content, className, allowHtml }: RustMarkdownProps) {
  const html = useMemo(() => {
    let parsed = parseMarkdown(content);
    if (!allowHtml) {
      // Sanitize: remove any script tags, event handlers, javascript: URLs
      parsed = parsed.replace(/<script[\s\S]*?<\/script>/gi, '');
      parsed = parsed.replace(/\s+on\w+="[^"]*"/gi, '');
      parsed = parsed.replace(/javascript:/gi, '');
    }
    return parsed;
  }, [content, allowHtml]);

  return (
    <div
      className={`prose prose-sm max-w-none ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
