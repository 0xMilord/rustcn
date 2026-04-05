/**
 * RustCommand — A command palette with fuzzy search.
 *
 * Features:
 * - Fuzzy search on large item sets (10k+ items)
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Grouped items
 * - Instant feedback (no debounce)
 *
 * Copy-paste this component into your project. You own it.
 */

import React, { useState, useMemo, useCallback, useEffect, useRef, ReactNode } from 'react';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  group?: string;
  shortcut?: string;
  icon?: ReactNode;
  onSelect?: () => void;
}

export interface RustCommandProps {
  items: CommandItem[];
  placeholder?: string;
  filterLimit?: number;
  onSelect?: (item: CommandItem) => void;
  className?: string;
}

/**
 * Simple fuzzy match scoring.
 * Returns a score (higher = better match), or -1 if no match.
 */
function fuzzyScore(query: string, text: string): number {
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
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Bonus for consecutive matches and word boundaries
      score += (ti > 0 && t[ti - 1] === ' ') || ti === 0 ? 10 : 5;
      qi++;
    }
  }
  return qi === q.length ? score : -1;
}

export function RustCommand({
  items,
  placeholder = 'Type a command or search...',
  filterLimit = 50,
  onSelect,
  className,
}: RustCommandProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Filter and score items
  const filtered = useMemo(() => {
    if (!query) return items.slice(0, filterLimit);
    const scored = items
      .map(item => ({ item, score: fuzzyScore(query, item.label + ' ' + (item.description ?? '')) }))
      .filter(x => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, filterLimit);
    return scored;
  }, [items, query, filterLimit]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[selectedIndex]?.item;
      if (item) {
        item.onSelect?.();
        onSelect?.(item);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      inputRef.current?.blur();
    }
  }, [filtered, selectedIndex, onSelect]);

  // Group items
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filtered>();
    for (const x of filtered) {
      const group = x.item.group ?? 'General';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(x);
    }
    return groups;
  }, [filtered]);

  return (
    <div className={`border rounded-lg bg-background shadow-lg ${className ?? ''}`}>
      <div className="flex items-center border-b px-3">
        <svg className="mr-2 h-4 w-4 shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Search commands"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-list"
          aria-activedescendant={filtered[selectedIndex] ? `command-${filtered[selectedIndex].item.id}` : undefined}
        />
      </div>
      <div ref={listRef} className="max-h-[300px] overflow-auto" role="listbox" id="command-list">
        {filtered.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">No results found.</div>
        )}
        {Array.from(grouped.entries()).map(([groupName, groupItems]) => (
          <div key={groupName}>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{groupName}</div>
            {groupItems.map(({ item }, idx) => {
              const globalIdx = filtered.findIndex(f => f.item.id === item.id);
              const isSelected = globalIdx === selectedIndex;
              return (
                <div
                  key={item.id}
                  id={`command-${item.id}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${
                    isSelected ? 'bg-accent text-accent-foreground' : ''
                  }`}
                  onClick={() => {
                    item.onSelect?.();
                    onSelect?.(item);
                  }}
                  onMouseEnter={() => setSelectedIndex(globalIdx)}
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.description && <span className="ml-2 text-xs text-muted-foreground">{item.description}</span>}
                  {item.shortcut && (
                    <span className="ml-auto text-xs text-muted-foreground">{item.shortcut}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="border-t px-2 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        <div className="flex gap-2">
          <kbd className="px-1 py-0.5 bg-muted rounded">up down</kbd> navigate
          <kbd className="px-1 py-0.5 bg-muted rounded">enter</kbd> select
          <kbd className="px-1 py-0.5 bg-muted rounded">esc</kbd> clear
        </div>
      </div>
    </div>
  );
}
