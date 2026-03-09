'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SearchResult {
  title: string;
  url: string;
  excerpt: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [indexData, setIndexData] = useState<SearchResult[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = 'search-listbox';

  useEffect(() => {
    fetch('/search.json')
      .then((r) => r.json())
      .then(setIndexData)
      .catch(() => {
        console.warn('[search] Failed to load search index');
      });
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    const q = query.trim().toLowerCase();
    if (indexData) {
      setResults(
        indexData
          .filter(
            (i) =>
              i.title?.toLowerCase().includes(q) ||
              i.excerpt?.toLowerCase().includes(q)
          )
          .slice(0, 8)
      );
      setActiveIndex(-1);
    }
  }, [query, indexData]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setResults([]);
        setQuery('');
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
            window.location.href = results[activeIndex].url;
            setResults([]);
            setQuery('');
          }
          break;
        case 'Escape':
          setResults([]);
          setActiveIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [results, activeIndex]
  );

  const isOpen = results.length > 0;

  return (
    <div className="search search-container" ref={containerRef}>
      <span className="material-symbols-outlined" aria-hidden="true">search</span>
      <input
        ref={inputRef}
        className="search-input"
        type="search"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
        aria-label="Search site content"
      />
      {isOpen && (
        <div className="search-results-dropdown" role="listbox" id={listboxId}>
          {results.map((r, i) => (
            <a
              key={r.url}
              id={`search-option-${i}`}
              href={r.url}
              className={`search-item${i === activeIndex ? ' search-item--active' : ''}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => {
                setResults([]);
                setQuery('');
              }}
            >
              <div className="search-item-title">{r.title}</div>
              <div className="search-item-sub">
                {r.url.replace(/\/$/, '')}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
