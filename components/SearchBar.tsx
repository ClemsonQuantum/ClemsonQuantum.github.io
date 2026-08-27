'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SearchResult {
  title: string;
  url: string;
  excerpt: string;
  /** Hidden searchable text: author/mentor names, outlet, type. */
  meta?: string;
}

// Word-based AND matching: every query word must appear somewhere in the
// entry (title, hidden meta, or excerpt), so "valentine mohaugen paper" finds
// a paper authored by Valentine even when no field contains that exact
// phrase. Title and author hits rank above body hits.
function rankResults(index: SearchResult[], query: string): SearchResult[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return index
    .map((item) => {
      const title = item.title.toLowerCase();
      const meta = (item.meta ?? '').toLowerCase();
      const excerpt = (item.excerpt ?? '').toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (title.includes(t)) score += 3;
        else if (meta.includes(t)) score += 2;
        else if (excerpt.includes(t)) score += 1;
        else return null; // AND semantics: every word must match somewhere
      }
      return { item, score };
    })
    .filter((r): r is { item: SearchResult; score: number } => r !== null)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item)
    .slice(0, 8);
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [indexData, setIndexData] = useState<SearchResult[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listboxId = 'search-listbox';

  useEffect(() => {
    fetch('/search.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((parsed) => {
        // Guard the shape so a bad response can't make .filter() throw later.
        if (Array.isArray(parsed)) setIndexData(parsed);
        else console.warn('[search] Unexpected search index shape');
      })
      .catch(() => {
        console.warn('[search] Failed to load search index');
      });
  }, []);

  // Results are derived, not mirrored into state (activeIndex resets in the
  // input's onChange instead).
  const results = useMemo(
    () =>
      indexData && query.trim() ? rankResults(indexData, query.trim()) : [],
    [indexData, query]
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setQuery('');
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Escape must work even with zero results, so the "No results" panel
      // is dismissible from the keyboard.
      if (e.key === 'Escape') {
        setQuery('');
        setActiveIndex(-1);
        inputRef.current?.blur();
        return;
      }
      if (results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
          break;
        case 'Enter':
          if (activeIndex >= 0 && results[activeIndex]) {
            const url = results[activeIndex].url;
            setQuery('');
            // External results (news/attended events) leave the site; internal
            // ones keep the SPA transition.
            if (url.includes('://')) window.location.href = url;
            else router.push(url);
          }
          break;
      }
    },
    [results, activeIndex, router]
  );

  const hasMinQuery = query.trim().length >= 1;
  const hasResults = results.length > 0;
  const isOpen = hasMinQuery;

  return (
    <div className="search search-container" ref={containerRef}>
      <svg
        className="search-icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <input
        ref={inputRef}
        className="search-input"
        type="search"
        placeholder="Search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen && hasResults}
        aria-autocomplete="list"
        // Only reference the listbox while it exists — the empty-state panel
        // is a status region, not a listbox.
        aria-controls={isOpen && hasResults ? listboxId : undefined}
        aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
        aria-label="Search site content"
      />
      {isOpen && hasResults && (
        <div className="search-results-dropdown" role="listbox" id={listboxId}>
          {results.map((r, i) => {
            const shared = {
              id: `search-option-${i}`,
              className: `search-item${i === activeIndex ? ' search-item--active' : ''}`,
              role: 'option',
              'aria-selected': i === activeIndex,
              onClick: () => {
                setQuery('');
              },
            };
            // Internal results keep the SPA transition via next/link;
            // external ones (news, attended events) are plain anchors.
            return r.url.includes('://') ? (
              <a key={`${r.url}-${r.title}`} href={r.url} {...shared}>
                <div className="search-item-title">{r.title}</div>
              </a>
            ) : (
              <Link key={`${r.url}-${r.title}`} href={r.url} {...shared}>
                <div className="search-item-title">{r.title}</div>
              </Link>
            );
          })}
        </div>
      )}
      {/* Only claim "no results" once the index has actually loaded. */}
      {isOpen && !hasResults && indexData !== null && (
        <div className="search-results-dropdown search-results-dropdown--empty" role="status">
          <div className="search-empty">No results for &ldquo;{query.trim()}&rdquo;</div>
        </div>
      )}
    </div>
  );
}
