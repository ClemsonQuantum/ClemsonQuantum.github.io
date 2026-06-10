'use client';

import { useState } from 'react';
// Import from lib/types (not lib/content) — content.ts pulls in Node's `fs`,
// which can't be bundled into a client component.
import { formatDate } from '@/lib/types';
import type { PageMeta } from '@/lib/types';

const ALL = 'all';
// Categories always offered, even with no entries of that type. Other types
// found in the data are appended.
const KNOWN_TYPES = ['poster', 'paper'];

function pluralLabel(type: string): string {
  const cap = type.charAt(0).toUpperCase() + type.slice(1);
  return cap.endsWith('s') ? cap : `${cap}s`;
}

export default function StudentWorkList({ works }: { works: PageMeta[] }) {
  const presentTypes = works
    .map((w) => w.type)
    .filter((t): t is string => Boolean(t));
  const types = Array.from(new Set([...KNOWN_TYPES, ...presentTypes]));

  const [filter, setFilter] = useState<string>(ALL);
  const visible = filter === ALL ? works : works.filter((w) => w.type === filter);

  return (
    <>
      <div className="sw-filter" role="tablist" aria-label="Filter by type">
        <button
          type="button"
          role="tab"
          aria-selected={filter === ALL}
          className={`sw-filter__btn${filter === ALL ? ' is-active' : ''}`}
          onClick={() => setFilter(ALL)}
        >
          All <span className="sw-filter__count">{works.length}</span>
        </button>
        {types.map((t) => {
          const count = works.filter((w) => w.type === t).length;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={filter === t}
              className={`sw-filter__btn${filter === t ? ' is-active' : ''}`}
              onClick={() => setFilter(t)}
            >
              {pluralLabel(t)} <span className="sw-filter__count">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p className="sw-empty">
          No {filter === ALL ? 'submissions' : pluralLabel(filter).toLowerCase()}{' '}
          yet — check back soon.
        </p>
      ) : (
        <div className="sw-list">
          {visible.map((p) => (
            <article key={p.slug} className="sw-item">
              {p.type && (
                <span className="sw-type">
                  {p.type.charAt(0).toUpperCase() + p.type.slice(1)}
                </span>
              )}
              <h3 className="sw-title">
                <a href={`/resources/student-work-and-projects/${p.slug}/`}>
                  {p.title}
                </a>
              </h3>
              <p className="sw-meta">
                {p.date && <span>{formatDate(p.date)}</span>}
                {p.date && p.authors && <span> · </span>}
                {p.authors &&
                  p.authors.map((a, i) => (
                    <span key={i}>
                      {a.name}
                      {i < p.authors!.length - 1 ? ', ' : ''}
                    </span>
                  ))}
              </p>
              {(p.summary || p.excerpt) && (
                <p className="sw-summary">{p.summary ?? p.excerpt}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
