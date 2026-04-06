/**
 * Rust Search Engine — WASM-powered fuzzy search for large option sets.
 *
 * Provides fast fuzzy matching for 10k+ options:
 * - Fuzzy string matching with scoring
 * - Grouped option filtering
 * - Multi-result sorting
 *
 * Falls back to native JS for small option sets (<1000 items).
 */

import { getWasmModule } from '../../bindings/src/wasm/singleton.js';

export interface SelectOption {
  id: string;
  label: string;
  value: string;
  group?: string;
  disabled?: boolean;
  description?: string;
}

export interface SearchResult {
  option: SelectOption;
  score: number;
}

export interface SearchConfig {
  query: string;
  maxResults?: number;
  includeDisabled?: boolean;
}

export interface RustSearchEngine {
  fuzzySearch(options: SelectOption[], config: SearchConfig): SearchResult[];
  getOptionCount(): number;
}

// Threshold: use WASM for 1000+ options
const WASM_THRESHOLD_OPTIONS = 1000;

/**
 * Native JS fuzzy search implementation.
 * Used when the option count is below the WASM threshold.
 */
class JsSearchEngine implements RustSearchEngine {
  /**
   * Simple fuzzy match scoring.
   * Returns a score (higher = better match), or -1 if no match.
   */
  private fuzzyScore(query: string, text: string): number {
    if (!query) return 0;
    const q = query.toLowerCase();
    const t = text.toLowerCase();

    // Exact match = highest score
    if (t === q) return 100;
    if (t.startsWith(q)) return 90;
    if (t.includes(q)) return 80;

    // Fuzzy: all query chars found in order
    let qi = 0;
    let score = 0;
    let lastMatchIdx = -1;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
      if (t[ti] === q[qi]) {
        // Bonus for consecutive matches
        if (lastMatchIdx === ti - 1) {
          score += 10;
        } else {
          score += 5;
        }
        // Bonus for word boundary matches
        if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '-' || t[ti - 1] === '_') {
          score += 5;
        }
        lastMatchIdx = ti;
        qi++;
      }
    }
    return qi === q.length ? score : -1;
  }

  fuzzySearch(options: SelectOption[], config: SearchConfig): SearchResult[] {
    const { query, maxResults = 50, includeDisabled = false } = config;

    if (!query) {
      const filtered = includeDisabled
        ? options
        : options.filter((opt) => !opt.disabled);
      return filtered.slice(0, maxResults).map((opt) => ({ option: opt, score: 0 }));
    }

    const results: SearchResult[] = [];

    for (const option of options) {
      if (!includeDisabled && option.disabled) continue;

      const searchText = `${option.label} ${option.value}${option.description ? ' ' + option.description : ''}${option.group ? ' ' + option.group : ''}`;
      const score = this.fuzzyScore(query, searchText);

      if (score >= 0) {
        results.push({ option, score });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, maxResults);
  }

  getOptionCount(): number {
    return 0; // Not tracked in stateless mode
  }
}

/**
 * WASM-backed search engine for large option sets.
 */
export class WasmSearchEngine implements RustSearchEngine {
  private options: SelectOption[] = [];
  private optionsJson: string = '';

  constructor(options?: SelectOption[]) {
    if (options) {
      this.setOptions(options);
    }
  }

  setOptions(options: SelectOption[]): void {
    this.options = options;
    this.optionsJson = JSON.stringify(options);
  }

  async fuzzySearchAsync(config: SearchConfig): Promise<SearchResult[]> {
    try {
      const handle = await getWasmModule('search-engine');
      const { SearchEngine } = handle.exports as any;

      const configJson = JSON.stringify(config);
      const engine = new SearchEngine(this.optionsJson, configJson);
      const resultJson = engine.search();
      const results = JSON.parse(resultJson) as SearchResult[];

      engine.free?.();
      return results;
    } catch {
      // Fallback to JS
      const jsEngine = new JsSearchEngine();
      return jsEngine.fuzzySearch(this.options, config);
    }
  }

  fuzzySearch(options: SelectOption[], config: SearchConfig): SearchResult[] {
    // Sync version uses JS fallback
    const jsEngine = new JsSearchEngine();
    return jsEngine.fuzzySearch(options, config);
  }

  getOptionCount(): number {
    return this.options.length;
  }
}

/**
 * Factory to get the appropriate search engine based on option count.
 */
export function getSearchEngine(optionCount: number): RustSearchEngine {
  if (optionCount >= WASM_THRESHOLD_OPTIONS) {
    return new WasmSearchEngine();
  }
  return new JsSearchEngine();
}

// Export JS engine for direct use
export { JsSearchEngine };
