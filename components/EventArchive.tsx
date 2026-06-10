'use client';

import { useState } from 'react';
// lib/types only — lib/content uses Node fs and cannot enter a client bundle.
import type { PageMeta } from '@/lib/types';
import PreviewCard from './PreviewCard';

const ALL = 'all';
const SEASON_ORDER: Record<string, number> = { Fall: 2, Summer: 1, Spring: 0 };

function semesterOf(date: string): string {
  const [y, m] = date.split('-').map(Number);
  if (m >= 8) return `Fall ${y}`;
  if (m <= 5) return `Spring ${y}`;
  return `Summer ${y}`;
}

function semesterRank(label: string): number {
  const [season, year] = label.split(' ');
  return Number(year) * 10 + (SEASON_ORDER[season] ?? 0);
}

// Term-filtered archive grid. Shared by the event archive pages and the News
// page — the semester tabs derive purely from each item's `date`, so it works
// for any dated content. `kind`/`showFooter`/`emptyText` default to the event
// behavior, so existing event pages need no changes.
export default function EventArchive({
  items,
  metaLabel,
  kind = 'event',
  showFooter = true,
  emptyText = 'No events yet — check back soon.',
}: {
  items: PageMeta[];
  metaLabel?: string;
  kind?: 'news' | 'event';
  showFooter?: boolean;
  emptyText?: string;
}) {
  // Distinct semesters among dated items, newest-first. Undated items contribute
  // no tab and surface only under All.
  const semesters = Array.from(
    new Set(
      items.filter((i) => i.date).map((i) => semesterOf(i.date as string))
    )
  ).sort((a, b) => semesterRank(b) - semesterRank(a));

  const [filter, setFilter] = useState<string>(ALL);
  const visible =
    filter === ALL
      ? items
      : items.filter((i) => i.date && semesterOf(i.date) === filter);

  return (
    <>
      {semesters.length > 0 && (
        <div className="sw-filter" role="tablist" aria-label="Filter by semester">
          <button
            type="button"
            role="tab"
            aria-selected={filter === ALL}
            className={`sw-filter__btn${filter === ALL ? ' is-active' : ''}`}
            onClick={() => setFilter(ALL)}
          >
            All <span className="sw-filter__count">{items.length}</span>
          </button>
          {semesters.map((s) => {
            const count = items.filter(
              (i) => i.date && semesterOf(i.date) === s
            ).length;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={filter === s}
                className={`sw-filter__btn${filter === s ? ' is-active' : ''}`}
                onClick={() => setFilter(s)}
              >
                {s} <span className="sw-filter__count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="sw-empty">{emptyText}</p>
      ) : (
        <div className="preview-grid">
          {visible.map((item) => (
            <PreviewCard
              key={item.slug}
              item={item}
              kind={kind}
              metaLabel={metaLabel}
              showFooter={showFooter}
            />
          ))}
        </div>
      )}
    </>
  );
}
