'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchResult {
  title: string;
  url: string;
  excerpt: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [indexData, setIndexData] = useState<SearchResult[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/search.json')
      .then((r) => r.json())
      .then(setIndexData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
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

  return (
    <div className="search" ref={containerRef} style={{ position: 'relative' }}>
      <span className="material-symbols-outlined">search</span>
      <input
        className="search-input"
        type="search"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 && (
        <div
          className="search-results"
          style={{
            display: 'block',
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {results.map((r, i) => (
            <a
              key={i}
              href={r.url}
              className="search-item"
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
