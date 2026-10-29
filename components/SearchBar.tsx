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
  /** The page body (or a person's full bio) with markup stripped. */
  body?: string;
}

// Site copy has typographic apostrophes and no-break hyphens; a typed query
// has ' and -. Both sides are folded the same way (SearchHighlight too).
const fold = (text: string) =>
  text.toLowerCase().replace(/[‘’]/g, "'").replace(/‑/g, '-');

// Word-based AND matching: every query word must appear somewhere in the
// entry (title, hidden meta, excerpt, or body), so "valentine mohaugen paper"
// finds a paper authored by Valentine even when no field contains that exact
// phrase. Title hits rank above meta hits (names, outlet, type), which rank
// above summary and body hits.
function rankResults(index: SearchResult[], query: string): SearchResult[] {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return index
    .map((item) => {
      const title = fold(item.title);
      const meta = fold(item.meta ?? '');
      const excerpt = fold(item.excerpt ?? '');
      const body = fold(item.body ?? '');
      let score = 0;
      for (const t of tokens) {
        if (title.includes(t)) score += 3;
        else if (meta.includes(t)) score += 2;
        else if (excerpt.includes(t) || body.includes(t)) score += 1;
        else return null; // AND semantics: every word must match somewhere
      }
      return { item, score };
    })
    .filter((r): r is { item: SearchResult; score: number } => r !== null)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item)
    .slice(0, 8);
}

// Internal results carry the query, so the page they open can scroll to and
// highlight where it appears (SearchHighlight). Any #section anchor stays last.
function withQuery(url: string, query: string): string {
  if (url.includes('://') || !query) return url;
  const [path, hash] = url.split('#');
  return `${path}${path.includes('?') ? '&' : '?'}q=${encodeURIComponent(query)}${hash ? `#${hash}` : ''}`;
}

// onNavigate: the Header closes its phone drawer. A result on the page
// already shown (/#board from the homepage) keeps the pathname, so the
// Header's close-on-navigation never sees it.
export default function SearchBar({ onNavigate }: { onNavigate?: () => void }) {
  const [query, setQuery] = useState('');
  const [indexData, setIndexData] = useState<SearchResult[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const indexRequested = useRef(false);
  const router = useRouter();
  const listboxId = 'search-listbox';

  // The index loads on first focus or hover, not on every page view.
  const loadIndex = useCallback(() => {
    if (indexRequested.current) return;
    indexRequested.current = true;
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
        // Let the next focus try again.
        indexRequested.current = false;
        console.warn('[search] Failed to load search index');
      });
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setActiveIndex(-1);
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
        clear();
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [clear]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Escape must work even with zero results, so the "No results" panel
      // is dismissible from the keyboard. While there is text, it only clears
      // the box: the header's document listener would also close the phone
      // drawer around it.
      if (e.key === 'Escape') {
        if (query) e.nativeEvent.stopImmediatePropagation();
        clear();
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
        case 'Enter': {
          // With nothing highlighted, Enter (or the phone's Search key) opens
          // the top result.
          const url = withQuery(results[activeIndex >= 0 ? activeIndex : 0].url, query.trim());
          clear();
          onNavigate?.();
          // External results (news/attended events) leave the site; internal
          // ones keep the SPA transition.
          if (url.includes('://')) window.location.href = url;
          else router.push(url);
          break;
        }
      }
    },
    [query, results, activeIndex, router, clear, onNavigate]
  );

  const isOpen = query.trim().length >= 1;
  const hasResults = results.length > 0;

  return (
    <div
      className="search search-container"
      // The search landmark: screen-reader users can jump straight to it.
      role="search"
      ref={containerRef}
      // Keyboard focus leaving the search closes the panel, as an outside
      // click does. A null relatedTarget (Safari link clicks, blank-area
      // clicks) is left to the click listener so result clicks still work.
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && !e.currentTarget.contains(next)) clear();
      }}
    >
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
      {/* type="text", not "search": ARIA in HTML forbids role="combobox" on a
          search input, so the combobox pattern needs a text input. enterKeyHint
          still gives the mobile keyboard its Search key. */}
      <input
        className="search-input"
        name="q"
        type="text"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onFocus={loadIndex}
        onPointerEnter={loadIndex}
        role="combobox"
        aria-expanded={isOpen && hasResults}
        aria-autocomplete="list"
        // Only reference the listbox while it exists — the empty-state panel
        // is a status region, not a listbox.
        aria-controls={isOpen && hasResults ? listboxId : undefined}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
        aria-label="Search site content"
      />
      {isOpen && hasResults && (
        <div className="search-results-dropdown" role="listbox" id={listboxId} aria-label="Search results">
          {results.map((r, i) => {
            const shared = {
              id: `search-option-${i}`,
              className: `search-item${i === activeIndex ? ' search-item--active' : ''}`,
              role: 'option',
              'aria-selected': i === activeIndex,
              onClick: () => {
                clear();
                onNavigate?.();
              },
            };
            // Internal results keep the SPA transition via next/link, with no
            // prefetch, as in the Header: a prefetched route applies that
            // page's image preloads here. External ones (news, attended
            // events) are plain anchors.
            return r.url.includes('://') ? (
              <a key={`${r.url}-${r.title}`} href={r.url} {...shared}>
                <div className="search-item-title">{r.title}</div>
              </a>
            ) : (
              <Link key={`${r.url}-${r.title}`} href={withQuery(r.url, query.trim())} prefetch={false} {...shared}>
                <div className="search-item-title">{r.title}</div>
              </Link>
            );
          })}
        </div>
      )}
      {/* Only claim "no results" once the index has actually loaded. The
          status region stays mounted so the message is announced when it
          appears; a live region inserted together with its text often is not. */}
      <div role="status">
        {isOpen && !hasResults && indexData !== null && (
          <div className="search-results-dropdown">
            <div className="search-empty">No results for &ldquo;{query.trim()}&rdquo;</div>
          </div>
        )}
      </div>
    </div>
  );
}
