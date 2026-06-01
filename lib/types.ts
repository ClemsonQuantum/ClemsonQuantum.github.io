export interface Author {
  name: string;
  affiliation?: string;
}

export interface PageMeta {
  slug: string;
  title: string;
  date: string | null;
  summary: string | null;
  image: string | null;
  external_url: string | null;
  link: string | null;
  cta_label: string | null;
  type: string | null;
  authors: Author[] | null;
  href: string;
  isExternal: boolean;
  excerpt: string;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
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
 */
export function isUpcoming(item: Pick<PageMeta, 'date'>): boolean {
  if (!item.date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return item.date >= today;
}
