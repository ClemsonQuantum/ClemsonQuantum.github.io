'use client';

import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
// lib/types only — lib/content uses Node fs and cannot enter a client bundle.
import type { PageMeta } from '@/lib/types';
import FilterButtons from './FilterButtons';
import PreviewCard from './PreviewCard';

const ALL = 'all';
const SEASON_ORDER: Record<string, number> = { Fall: 2, Summer: 1, Spring: 0 };

// Returns null for non-ISO dates (e.g. a "TBD" placeholder), so those items
// contribute no semester tab and surface only under All.
function semesterOf(date: string): string | null {
  const [y, m] = date.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
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
// behavior.
export default function EventArchive({
  items,
  kind = 'event',
  showFooter = true,
  emptyText = 'No events yet. Check back soon.',
}: {
  items: PageMeta[];
  kind?: 'news' | 'event';
  showFooter?: boolean;
  emptyText?: string;
}) {
  // Distinct semesters among dated items (newest-first) with per-semester
  // counts, memoized so filter clicks don't recompute them.
  const { semesters, counts } = useMemo(() => {
    const tally = new Map<string, number>();
    for (const item of items) {
      const s = item.date ? semesterOf(item.date) : null;
      if (s) tally.set(s, (tally.get(s) ?? 0) + 1);
    }
    return {
      semesters: Array.from(tally.keys()).sort(
        (a, b) => semesterRank(b) - semesterRank(a)
      ),
      counts: tally,
    };
  }, [items]);

  const [filter, setFilter] = useState<string>(ALL);
  // Spoken after each filter change (not on load): how many cards now show.
  const [status, setStatus] = useState('');
  const visible =
    filter === ALL
      ? items
      : items.filter((i) => i.date && semesterOf(i.date) === filter);

  const noun = (n: number) =>
    kind === 'news' ? (n === 1 ? 'news story' : 'news stories') : n === 1 ? 'event' : 'events';

  // A term change glides the cards to their new places (a view transition,
  // each card named by its slug) where the browser supports it and motion is
  // allowed; otherwise the grid simply updates.
  const choose = (value: string) => {
    const n = value === ALL ? items.length : (counts.get(value) ?? 0);
    const apply = () => {
      setFilter(value);
      setStatus(value === ALL ? `Showing all ${n} ${noun(n)}` : `Showing ${n} ${noun(n)} from ${value}`);
    };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition === 'function' && !reduced) {
      document.startViewTransition(() => flushSync(apply));
    } else {
      apply();
    }
  };

  return (
    <>
      {/* One term only: All and that term would show the same cards. */}
      {semesters.length > 1 && (
        <FilterButtons
          label="Filter by semester"
          options={[
            { value: ALL, text: 'All', count: items.length },
            ...semesters.map((s) => ({ value: s, text: s, count: counts.get(s) ?? 0 })),
          ]}
          value={filter}
          onChange={choose}
        />
      )}
      <p className="sr-only" role="status">
        {status}
      </p>

      {visible.length === 0 ? (
        <p className="sw-empty">{emptyText}</p>
      ) : (
        <div className="preview-grid">
          {/* The first row (three cards on desktop) is in the first screen. */}
          {visible.map((item, i) => (
            <PreviewCard
              key={item.slug}
              item={item}
              kind={kind}
              showFooter={showFooter}
              eager={i < 3}
              transitionName={`card-${item.slug}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
