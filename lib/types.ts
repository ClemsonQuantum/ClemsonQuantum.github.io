export interface Author {
  name: string;
  affiliation?: string;
}

export interface PageMeta {
  slug: string;
  title: string;
  date: string | null;
  dateDisplay: string | null;
  summary: string | null;
  image: string | null;
  external_url: string | null;
  source_url: string | null;
  cta_label: string | null;
  source: string | null;
  type: string | null;
  authors: Author[] | null;
  href: string;
  isExternal: boolean;
  /** Resolved at build time in getAllPages so client components never
   * recompute it against the visitor's clock (hydration mismatch). */
  isUpcoming: boolean;
  excerpt: string;
}

/** Capitalize the first letter ("poster" -> "Poster"). */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  // Non-ISO placeholders like "TBD" would otherwise render "Invalid Date".
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Single source of truth for whether an event shows the "Upcoming" badge:
 * true when the entry is dated today or later (compared in UTC at build time).
 * Call only from server/build code (getAllPages) — calling it in a client
 * component would compare against the visitor's clock and desync hydration.
 */
export function isUpcoming(item: Pick<PageMeta, 'date'>): boolean {
  if (!item.date) return false;
  // "TBD" (allowed with a dateDisplay override) is explicitly an announced
  // future event. Previously this only worked because "TBD" happens to sort
  // above any YYYY-MM-DD string.
  if (item.date === 'TBD') return true;
  const today = new Date().toISOString().slice(0, 10);
  return item.date >= today;
}
