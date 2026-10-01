'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
// Not lib/content: content.ts pulls in Node's `fs`, which can't be bundled
// into a client component.
import { formatDate } from '@/lib/dates.mjs';
import { capitalize } from '@/lib/types';
import type { PageMeta } from '@/lib/types';
import { WORK_TYPES } from '@/lib/work-types.mjs';
import FilterButtons from './FilterButtons';

const ALL = 'all';

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
    // Every known type gets a tab, even with no entries yet; other types
    // found in the data are appended.
    return {
      types: Array.from(new Set([...WORK_TYPES, ...tally.keys()])),
      counts: tally,
    };
  }, [works]);

  const [filter, setFilter] = useState<string>(ALL);
  const visible = filter === ALL ? works : works.filter((w) => w.type === filter);

  return (
    <>
      <FilterButtons
        label="Filter by type"
        options={[
          { value: ALL, text: 'All', count: works.length },
          ...types.map((t) => ({ value: t, text: pluralLabel(t), count: counts.get(t) ?? 0 })),
        ]}
        value={filter}
        onChange={setFilter}
      />

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
                {p.authors?.map((a) => a.name).join(', ')}
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
