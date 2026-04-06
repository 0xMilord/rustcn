/**
 * WASM wrapper for the markdown parser engine.
 *
 * Provides a clean TypeScript interface over the wasm-bindgen exports.
 */

import { getWasmModule } from './singleton.js';

/**
 * Render options for the markdown parser.
 */
export interface MarkdownOptions {
  /** Sanitize HTML output (remove dangerous tags) */
  sanitize?: boolean;
  /** Allow raw HTML in markdown */
  allowHtml?: boolean;
  /** Convert line breaks to <br> */
  breaks?: boolean;
  /** Prefix for heading IDs */
  idPrefix?: string;
}

/**
 * WASM-backed markdown parser.
 *
 * @example
 * ```ts
 * const parser = new WasmMarkdown();
 * const html = await parser.render('# Hello\n\n**World**');
 * ```
 */
export class WasmMarkdown {
  /**
   * Render markdown to HTML.
   */
  async render(markdown: string, options?: MarkdownOptions): Promise<string> {
    const handle = await getWasmModule('markdown');
    const { MarkdownParser } = handle.exports as any;

    const parser = new MarkdownParser();
    const optionsJson = options ? JSON.stringify(options) : undefined;
    const html = optionsJson
      ? parser.render(markdown, optionsJson)
      : parser.render(markdown);

    parser.free?.();
    return html;
  }

  /**
   * Render markdown with a custom prefix for heading IDs.
   */
  async renderWithPrefix(markdown: string, prefix: string): Promise<string> {
    const handle = await getWasmModule('markdown');
    const { MarkdownParser } = handle.exports as any;

    const parser = new MarkdownParser();
    const html = parser.renderWithPrefix(markdown, prefix);

    parser.free?.();
    return html;
  }

  /**
   * Get the byte size of markdown text (for threshold checking).
   */
  async estimatedSize(markdown: string): Promise<number> {
    const handle = await getWasmModule('markdown');
    const { MarkdownParser } = handle.exports as any;

    const parser = new MarkdownParser();
    const size = parser.estimatedSize(markdown);

    parser.free?.();
    return size;
  }
}
