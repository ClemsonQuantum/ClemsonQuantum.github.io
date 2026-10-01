'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { watchActive } from '@/lib/animation';

// How often a board on screen re-reads the sheet, the shortest gap between
// two reads when it scrolls in and out, and how many rows show before
// "Show all".
const REFRESH_MS = 60_000;
const MIN_GAP_MS = 15_000;
const VISIBLE_ROWS = 10;
// The refresh animation: rows slide to their new rank, new rows fade in.
const MOVE_MS = 450;
const FADE_MS = 400;

interface LeaderboardProps {
  /** A Google Sheet tab published to the web as CSV (File > Share > Publish
   *  to web > that tab > CSV). Empty until the challenge opens. */
  src?: string;
  /** "desc" ranks the highest score first, "asc" the lowest; omit to keep
   *  the sheet's own row order. */
  sort?: 'asc' | 'desc';
  /** Heading of the score column, e.g. "Qubits" or "Points". */
  scoreLabel?: string;
  /** Rows ranked this high or better are marked (the overall top 5). */
  highlight?: number;
  /** What the table is, for screen readers. */
  label: string;
  /** Shown while there is no sheet yet. */
  emptyMessage?: string;
}

interface Row {
  key: string; // the name, plus "#2", "#3"… for repeats
  rank: number;
  name: string;
  score: string;
}

/** RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF line ends. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "92%" -> 92, "0.031" -> 0.031; NaN for a header cell like "Score". */
function numeric(score: string): number {
  return Number.parseFloat(score.replace(/[%,\s]/g, ''));
}

/** First column is the name, second the score. A first row whose score
 *  isn't a number is a header and is skipped. Equal scores share a rank. */
function toRows(table: string[][], sort?: 'asc' | 'desc'): Row[] {
  let entries = table
    .map((cells) => ({ name: (cells[0] ?? '').trim(), score: (cells[1] ?? '').trim() }))
    .filter((e) => e.name !== '');
  if (entries.length > 0 && Number.isNaN(numeric(entries[0].score))) entries = entries.slice(1);
  if (sort) {
    const dir = sort === 'asc' ? 1 : -1;
    entries = [...entries].sort((a, b) => {
      const x = numeric(a.score);
      const y = numeric(b.score);
      // Rows without a number sort last.
      if (Number.isNaN(x) || Number.isNaN(y)) return Number(Number.isNaN(x)) - Number(Number.isNaN(y));
      return (x - y) * dir;
    });
  }
  const seen = new Map<string, number>();
  let prevScore = Number.NaN;
  let prevRank = 0;
  return entries.map((e, i) => {
    const n = (seen.get(e.name) ?? 0) + 1;
    seen.set(e.name, n);
    const score = numeric(e.score);
    // Same score as the row above: same rank (1, 2, 2, 4).
    const rank = sort && i > 0 && score === prevScore ? prevRank : i + 1;
    prevScore = score;
    prevRank = rank;
    return { key: n === 1 ? e.name : `${e.name}#${n}`, rank, name: e.name, score: e.score };
  });
}

export default function Leaderboard({
  src,
  sort,
  scoreLabel = 'Score',
  highlight,
  label,
  emptyMessage = 'Opens when the challenge is released.',
}: LeaderboardProps) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [updated, setUpdated] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  // Where each row sat and what it scored at the last render. On a refresh,
  // rows that moved slide from there to their new place (FLIP), changed
  // scores flash, and new rows fade in. The first table and reduced motion
  // get none of it.
  const lastLayout = useRef<Map<string, { top: number; score: string }> | null>(null);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || rows === null) return; // the loading rows don't count
    const previous = lastLayout.current;
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = new Map<string, { top: number; score: string }>();
    for (const tr of body.querySelectorAll<HTMLTableRowElement>('tr[data-key]')) {
      const key = tr.dataset.key ?? '';
      const score = tr.dataset.score ?? '';
      next.set(key, { top: tr.offsetTop, score });
      if (!previous || !animate) continue;
      const before = previous.get(key);
      if (!before) {
        tr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: 'ease-out' });
        continue;
      }
      const dy = before.top - tr.offsetTop;
      if (Math.abs(dy) > 0.5) {
        tr.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], {
          duration: MOVE_MS,
          easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        });
      }
      if (before.score !== score) {
        // Restart the CSS flash (qff.css, "qff-leaderboard-flash").
        delete tr.dataset.flash;
        void tr.offsetWidth;
        tr.dataset.flash = '';
      }
    }
    lastLayout.current = next;
  }, [rows, showAll]);

  useEffect(() => {
    const root = rootRef.current;
    if (!src || !root) return;
    let cancelled = false;
    let timer = 0;
    let lastLoad = 0;
    async function load() {
      lastLoad = Date.now();
      try {
        const res = await fetch(src as string, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = toRows(parseCsv(await res.text()), sort);
        if (cancelled) return;
        setRows(next);
        setFailed(false);
        setUpdated(
          new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        );
      } catch {
        // Keep the last good table on screen if a refresh fails.
        if (!cancelled) setFailed(true);
      }
    }
    // Read the sheet only while the board is on screen and the tab is
    // visible: right away when it shows, then every minute. A board inside a
    // closed session row has no box, so it never counts as on screen.
    // Reduced motion doesn't matter here: the scores still update.
    const sync = (active: boolean) => {
      if (active && !timer) {
        if (Date.now() - lastLoad > MIN_GAP_MS) void load();
        timer = window.setInterval(() => void load(), REFRESH_MS);
      } else if (!active && timer) {
        window.clearInterval(timer);
        timer = 0;
      }
    };
    const stopWatching = watchActive(root, sync);
    return () => {
      cancelled = true;
      stopWatching();
      window.clearInterval(timer);
    };
  }, [src, sort]);

  if (!src) return <p className="qff-leaderboard qff-leaderboard__note">{emptyMessage}</p>;

  const loading = rows === null;
  const shown = rows === null ? [] : showAll ? rows : rows.slice(0, VISIBLE_ROWS);
  const table = (
    <table className="qff-leaderboard__table">
      <caption className="sr-only">{label}</caption>
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Name</th>
          <th scope="col">{scoreLabel}</th>
        </tr>
      </thead>
      <tbody ref={bodyRef}>
        {/* While loading, empty rows hold the table's final height. */}
        {loading &&
          Array.from({ length: VISIBLE_ROWS }, (_, i) => (
            <tr key={i} aria-hidden="true">
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          ))}
        {shown.map((row) => (
          <tr
            key={row.key}
            data-key={row.key}
            data-score={row.score}
            className={highlight && row.rank <= highlight ? 'qff-leaderboard__top' : undefined}
            onAnimationEnd={(e) => delete e.currentTarget.dataset.flash}
          >
            <td>{row.rank}</td>
            <td>{row.name}</td>
            <td>{row.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <div ref={rootRef} className="qff-leaderboard" aria-busy={loading || undefined}>
      {rows !== null && rows.length === 0 ? (
        <p className="qff-leaderboard__note">No scores yet.</p>
      ) : (
        table
      )}
      <p className="qff-leaderboard__meta">
        {rows !== null && rows.length > VISIBLE_ROWS && (
          <button type="button" className="qff-leaderboard__more" onClick={() => setShowAll(!showAll)}>
            {showAll ? `Show top ${VISIBLE_ROWS}` : `Show all ${rows.length}`}
          </button>
        )}
        {loading && (
          <span>{failed ? 'The leaderboard couldn’t load. It will try again in a minute.' : 'Loading the leaderboard…'}</span>
        )}
        {updated && <span>Updated {updated}{failed ? ', retrying' : ''}</span>}
      </p>
    </div>
  );
}
