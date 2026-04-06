/**
 * Server-side Markdown component.
 * Fetches and renders markdown on the server, sends HTML to client.
 *
 * Demonstrates the SSR pattern:
 * 1. Server fetches content (no WASM needed)
 * 2. Server renders to HTML (using lightweight JS parser)
 * 3. Client receives pre-rendered HTML (fast initial paint)
 * 4. Client can re-render with WASM engine on interaction
 */
export async function ServerMarkdown({ content }: { content: string }) {
  // Lightweight server-side markdown → HTML conversion
  // In production, you could use the Rust WASM engine via Node.js runtime
  // For this example, we use a simple JS parser
  const html = simpleMarkdownToHtml(content);

  return (
    <article
      className="prose prose-gray max-w-none dark:prose-invert
        [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-4
        [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:mb-3 [&>h2]:mt-8
        [&>p]:mb-4 [&>p]:leading-relaxed
        [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4
        [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600 [&>blockquote]:dark:border-gray-700 [&>blockquote]:dark:text-gray-400
        [&>pre]:bg-gray-100 [&>pre]:p-4 [&>pre]:rounded-lg [&>pre]:mb-4 [&>pre]:dark:bg-gray-900
        [&>code]:bg-gray-100 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm [&>code]:dark:bg-gray-900
        [&>hr]:my-8 [&>hr]:border-gray-300 [&>hr]:dark:border-gray-700"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Simple markdown to HTML converter (server-side only) */
function simpleMarkdownToHtml(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let inCodeBlock = false;
  let codeContent = '';
  let codeLang = '';

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre><code class="language-${codeLang}">${escapeHtml(codeContent.trim())}</code></pre>\n`;
        codeContent = '';
        codeLang = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    if (line.startsWith('# ')) {
      html += `<h1>${inlineFormat(line.slice(2))}</h1>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${inlineFormat(line.slice(3))}</h2>\n`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${inlineFormat(line.slice(4))}</h3>\n`;
    } else if (line.startsWith('> ')) {
      html += `<blockquote>${inlineFormat(line.slice(2))}</blockquote>\n`;
    } else if (line.startsWith('- ')) {
      html += `<li>${inlineFormat(line.slice(2))}</li>\n`;
    } else if (line.startsWith('---')) {
      html += '<hr>\n';
    } else if (line.trim()) {
      html += `<p>${inlineFormat(line)}</p>\n`;
    }
  }

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  return html;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
