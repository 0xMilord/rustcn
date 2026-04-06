/**
 * Combobox Search Engine — Reuses the shared search engine.
 *
 * For the combobox, we add additional features:
 * - Recent items tracking
 * - Popular item scoring
 * - Type-ahead suggestions
 */

import {
  JsSearchEngine,
  WasmSearchEngine,
  getSearchEngine,
  type SelectOption,
  type SearchResult,
  type SearchConfig,
  type RustSearchEngine,
} from '../select/search-engine.js';

export interface ComboboxOption extends SelectOption {
  /** Whether this item is recently used */
  recent?: boolean;
  /** Popularity score for ranking */
  popularity?: number;
  /** Keywords for additional matching */
  keywords?: string[];
}

export interface ComboboxSearchResult extends SearchResult {
  option: ComboboxOption;
  isRecent: boolean;
  isPopular: boolean;
}

export interface ComboboxSearchConfig extends SearchConfig {
  showRecents?: boolean;
  maxRecents?: number;
  weightRecent?: number;
  weightPopular?: number;
}

/**
 * Combobox-specific search engine that extends the base search engine
 * with recent/popular item handling.
 */
export class ComboboxSearchEngine {
  private baseEngine: RustSearchEngine;
  private recentIds: Set<string> = new Set();
  private maxRecents: number;

  constructor(options?: ComboboxOption[], maxRecents = 10) {
    this.maxRecents = maxRecents;
    this.baseEngine = getSearchEngine(options?.length ?? 0);
    if (options && options.length > 0) {
      (this.baseEngine as WasmSearchEngine).setOptions?.(options);
    }
  }

  /**
   * Mark an option as recently used.
   */
  markRecent(optionId: string): void {
    this.recentIds.add(optionId);
    // Trim to max
    if (this.recentIds.size > this.maxRecents) {
      const first = this.recentIds.values().next().value;
      if (first) this.recentIds.delete(first);
    }
  }

  /**
   * Get recent options.
   */
  getRecents(options: ComboboxOption[]): ComboboxOption[] {
    return options.filter((opt) => this.recentIds.has(opt.id)).slice(-this.maxRecents);
  }

  /**
   * Search with recent/popular boosting.
   */
  search(
    options: ComboboxOption[],
    config: ComboboxSearchConfig,
  ): ComboboxSearchResult[] {
    const {
      showRecents = true,
      weightRecent = 15,
      weightPopular = 10,
      ...baseConfig
    } = config;

    // If no query and showRecents, return recents first
    if (!baseConfig.query && showRecents) {
      const recents = this.getRecents(options);
      const nonRecents = options.filter((opt) => !this.recentIds.has(opt.id));

      const results: ComboboxSearchResult[] = [
        ...recents.map((opt) => ({
          option: opt,
          score: weightRecent + (opt.popularity ?? 0) * weightPopular / 100,
          isRecent: true,
          isPopular: (opt.popularity ?? 0) > 50,
        })),
        ...nonRecents
          .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
          .slice(0, baseConfig.maxResults ?? 50)
          .map((opt) => ({
            option: opt,
            score: (opt.popularity ?? 0) * weightPopular / 100,
            isRecent: false,
            isPopular: (opt.popularity ?? 0) > 50,
          })),
      ];

      return results.slice(0, baseConfig.maxResults ?? 50);
    }

    // Build enhanced search text with keywords
    const enhancedOptions: SelectOption[] = options.map((opt) => ({
      ...opt,
      label: `${opt.label}${opt.keywords ? ' ' + opt.keywords.join(' ') : ''}`,
    }));

    const baseResults = this.baseEngine.fuzzySearch(enhancedOptions, baseConfig);

    // Boost scores for recent and popular items
    const boostedResults: ComboboxSearchResult[] = baseResults.map((result) => {
      const comboboxOption = options.find((o) => o.id === result.option.id)!;
      let boostedScore = result.score;

      if (this.recentIds.has(comboboxOption.id)) {
        boostedScore += weightRecent;
      }
      if (comboboxOption.popularity) {
        boostedScore += (comboboxOption.popularity / 100) * weightPopular;
      }

      return {
        option: comboboxOption,
        score: boostedScore,
        isRecent: this.recentIds.has(comboboxOption.id),
        isPopular: (comboboxOption.popularity ?? 0) > 50,
      };
    });

    // Re-sort by boosted score
    boostedResults.sort((a, b) => b.score - a.score);

    return boostedResults.slice(0, baseConfig.maxResults ?? 50);
  }
}

// Re-export base types
export { JsSearchEngine, WasmSearchEngine, getSearchEngine };
export type { SelectOption, SearchResult, SearchConfig, RustSearchEngine };
