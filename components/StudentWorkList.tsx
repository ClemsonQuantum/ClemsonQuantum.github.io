'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
// Import from lib/types (not lib/content) — content.ts pulls in Node's `fs`,
// which can't be bundled into a client component.
import { capitalize, formatDate } from '@/lib/types';
import { WORK_TYPES } from '@/lib/content-shared.mjs';
import type { PageMeta } from '@/lib/types';

const ALL = 'all';
// Categories always offered, even with no entries of that type. Other types
// found in the data are appended.
const KNOWN_TYPES = WORK_TYPES;

function pluralLabel(type: string): string {
  const label = capitalize(type);
  return label.endsWith('s') ? label : `${label}s`;
}

export default function StudentWorkList({ works }: { works: PageMeta[] }) {
  // Type tabs and their counts, memoized so filter clicks don't recompute.
  const { types, counts } = useMemo(() => {
    const tally = new Map<string, number>();
    for (const w of works) {
      if (w.type) tally.set(w.type, (tally.get(w.type) ?? 0) + 1);
    }
    return {
      types: Array.from(new Set([...KNOWN_TYPES, ...tally.keys()])),
      counts: tally,
    };
  }, [works]);

  const [filter, setFilter] = useState<string>(ALL);
  const visible = filter === ALL ? works : works.filter((w) => w.type === filter);

  return (
    <>
      {/* Toggle-button group, not tabs — there are no tabpanels and no
          arrow-key semantics; aria-pressed reflects the active filter. */}
      <div className="sw-filter" role="group" aria-label="Filter by type">
        <button
          type="button"
          aria-pressed={filter === ALL}
          className={`sw-filter__btn${filter === ALL ? ' is-active' : ''}`}
          onClick={() => setFilter(ALL)}
        >
          All <span className="sw-filter__count">{works.length}</span>
        </button>
        {types.map((t) => {
          const count = counts.get(t) ?? 0;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={filter === t}
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
          yet. Check back soon.
        </p>
      ) : (
        <div className="sw-list">
          {visible.map((p) => (
            <article key={p.slug} className="sw-item">
              {p.type && (
                <span className="sw-type">{capitalize(p.type)}</span>
              )}
              <h3 className="sw-title">
                {/* p.href resolves external entries to their destination and
                    internal ones to the generated detail page. */}
                <Link href={p.href}>
                  {p.title}
                </Link>
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
