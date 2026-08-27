import fs from 'fs';
import path from 'path';
import type { PageMeta } from './types';
import { isUpcoming } from './types';
import {
  externalDestination,
  normalizeDate,
  parseFrontmatter,
  plainText,
} from './content-shared.mjs';

export type { PageMeta, Author } from './types';
export { formatDate } from './types';

const CONTENT_ROOT = path.join(process.cwd(), 'content');

// Strip markdown/HTML to a plain-text preview capped at ~160 chars, cut at a
// word boundary. Used for card excerpts and as the SEO description fallback
// when a page has no `summary`.
export function makeExcerpt(content: string): string {
  const text = plainText(content);
  if (text.length <= 160) return text;
  const cut = text.slice(0, 160);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

// Content is immutable during a static export, but getNavData() re-reads the
// three event directories once per exported page. Cache per directory in
// production; skip in dev so `next dev` picks up content edits.
const pageCache = new Map<string, PageMeta[]>();

export function getAllPages(contentSubdir: string): PageMeta[] {
  if (process.env.NODE_ENV === 'production' && pageCache.has(contentSubdir)) {
    return pageCache.get(contentSubdir)!;
  }
  const pages = readAllPages(contentSubdir);
  if (process.env.NODE_ENV === 'production') {
    pageCache.set(contentSubdir, pages);
  }
  return pages;
}

function readAllPages(contentSubdir: string): PageMeta[] {
  const dir = path.join(CONTENT_ROOT, contentSubdir);
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    // readdir order is filesystem-dependent (APFS sorts, ext4 doesn't);
    // sort so builds are deterministic across machines.
    .sort();

  return files.map((filename) => {
    const slug = filename.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
    const { data, content } = parseFrontmatter(raw);

    // The external-destination rule is shared with generate-search-index.mjs
    // (see lib/content-shared.mjs) so search results and generated pages
    // can't disagree.
    const destination = externalDestination(data);
    const isExternal = destination !== null;

    const internalHref = `/${contentSubdir}/${slug}/`;

    return {
      slug,
      title: data.title ?? slug,
      date: normalizeDate(data.date),
      dateDisplay: data.dateDisplay ?? null,
      summary: data.summary ?? null,
      image: data.image ?? null,
      external_url: data.external_url ?? null,
      source_url: data.source_url ?? null,
      cta_label: data.cta_label ?? null,
      source: data.source ?? null,
      type: data.type ?? null,
      authors: data.authors ?? null,
      href: destination ?? internalHref,
      isExternal,
      isUpcoming: isUpcoming({ date: normalizeDate(data.date) }),
      excerpt: makeExcerpt(content),
    };
  });
}

export function sortPages(pages: PageMeta[]): PageMeta[] {
  // "TBD" placeholders sort first explicitly (announced-but-unscheduled events
  // lead the list); previously this only worked because "T" > "9" in ASCII.
  const rank = (p: PageMeta) => (p.date === 'TBD' ? 1 : 0);
  const dated = pages
    .filter((p) => p.date !== null)
    .sort(
      (a, b) =>
        rank(b) - rank(a) ||
        (b.date! > a.date! ? 1 : b.date! < a.date! ? -1 : 0) ||
        // Deterministic tie-break so build output doesn't depend on
        // filesystem order for same-day entries.
        a.title.localeCompare(b.title)
    );
  const undated = pages
    .filter((p) => p.date === null)
    .sort((a, b) => a.title.localeCompare(b.title));
  return [...dated, ...undated];
}

export function getPageBySlug(
  contentSubdir: string,
  slug: string
): { data: Record<string, unknown> | null; content: string | null } {
  const filepath = path.join(CONTENT_ROOT, contentSubdir, `${slug}.md`);
  if (!fs.existsSync(filepath)) {
    return { data: null, content: null };
  }
  const raw = fs.readFileSync(filepath, 'utf-8');
  return parseFrontmatter(raw) as { data: Record<string, unknown>; content: string };
}
