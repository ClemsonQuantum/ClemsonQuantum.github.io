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
