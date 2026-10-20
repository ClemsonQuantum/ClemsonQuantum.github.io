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
  source: string | null;
  type: string | null;
  authors: Author[] | null;
  href: string;
  isExternal: boolean;
  /** Resolved at build time in getAllPages so client components never
   * recompute it against the visitor's clock (hydration mismatch). */
  isUpcoming: boolean;
  /** `unlisted: true` in frontmatter: the page is generated (see
   * getRoutablePages) but getAllPages keeps it out of every listing. */
  unlisted: boolean;
  /** `draft: true` in frontmatter. Production builds never load drafts, so
   * this is only ever true in the dev server; checks that must match the
   * published site (like the About page's hackathon count) filter on it. */
  draft: boolean;
  excerpt: string;
}

/** Capitalize the first letter ("poster" -> "Poster"). */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
