import fs from 'fs';
import path from 'path';
import type { PageMeta } from './types';
import { todayInClemson } from './dates.mjs';
import {
  externalDestination,
  hiddenAsDraft,
  isDraft,
  isUnlisted,
  normalizeDate,
  parseFrontmatter,
  plainText,
} from './content-shared.mjs';

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

function readCachedPages(contentSubdir: string): PageMeta[] {
  if (process.env.NODE_ENV === 'production' && pageCache.has(contentSubdir)) {
    return pageCache.get(contentSubdir)!;
  }
  const pages = readAllPages(contentSubdir);
  if (process.env.NODE_ENV === 'production') {
    pageCache.set(contentSubdir, pages);
  }
  return pages;
}

// Every page that should appear in a listing: archives, nav, homepage,
// sitemap. Unlisted pages (`unlisted: true`) are filtered out here, at the
// source, so a new listing can't forget the check.
export function getAllPages(contentSubdir: string): PageMeta[] {
  return readCachedPages(contentSubdir).filter((p) => !p.unlisted);
}

// Every page that gets a URL, unlisted ones included. Only page generation
// (generateStaticParams) should call this; listings use getAllPages.
export function getRoutablePages(contentSubdir: string): PageMeta[] {
  return readCachedPages(contentSubdir);
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

  return files.flatMap((filename): PageMeta[] => {
    const slug = filename.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
    const { data, content } = parseFrontmatter(raw);
    // Drafts exist only in the dev server (see hiddenAsDraft): a production
    // build never generates, lists, or indexes them.
    if (hiddenAsDraft(data)) return [];

    // The external-destination rule is shared with generate-search-index.mjs
    // (see lib/content-shared.mjs) so search results and generated pages
    // can't disagree.
    const destination = externalDestination(data);
    const isExternal = destination !== null;

    const internalHref = `/${contentSubdir}/${slug}/`;
    const date = normalizeDate(data.date);

    return [{
      slug,
      title: data.title ?? slug,
      date,
      dateDisplay: data.dateDisplay ?? null,
      summary: data.summary ?? null,
      image: data.image ?? null,
      source: data.source ?? null,
      type: data.type ?? null,
      authors: data.authors ?? null,
      href: destination ?? internalHref,
      isExternal,
      isUpcoming: isUpcoming({ date, endDate: normalizeDate(data.end_date) }),
      unlisted: isUnlisted(data),
      draft: isDraft(data),
      excerpt: makeExcerpt(content),
    }];
  });
}

/**
 * Single source of truth for whether an event shows the "Upcoming" badge:
 * true until the event's last day (`end_date`, else `date`) has passed in
 * Clemson, so a multi-day event still counts while it runs. Resolved here at
 * build time and stored on PageMeta; a client component comparing against
 * the visitor's clock would desync hydration.
 */
function isUpcoming(item: Pick<PageMeta, 'date'> & { endDate?: string | null }): boolean {
  if (!item.date) return false;
  // "TBD" (allowed with a dateDisplay override) is an announced future
  // event; it must not depend on "TBD" sorting above YYYY-MM-DD strings.
  if (item.date === 'TBD') return true;
  return (item.endDate ?? item.date) >= todayInClemson();
}

export function sortPages<T extends PageMeta>(pages: T[]): T[] {
  // Upcoming entries lead, soonest first (the next event is the first card),
  // then announced-but-unscheduled "TBD" ones, then everything past, newest
  // first. isUpcoming is resolved at build time in getAllPages; news and
  // student work are all past, so they keep plain newest-first order.
  const group = (p: T) => (p.date === 'TBD' ? 1 : p.isUpcoming ? 0 : 2);
  const dated = pages
    .filter((p) => p.date !== null)
    .sort((a, b) => {
      const byGroup = group(a) - group(b);
      if (byGroup) return byGroup;
      const byDate = a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0;
      return (
        (group(a) === 0 ? byDate : -byDate) ||
        // Deterministic tie-break so build output doesn't depend on
        // filesystem order for same-day entries.
        a.title.localeCompare(b.title)
      );
    });
  const undated = pages
    .filter((p) => p.date === null)
    .sort((a, b) => a.title.localeCompare(b.title));
  return [...dated, ...undated];
}

// A content directory's listed pages in display order (see sortPages).
export function getSortedPages(contentSubdir: string): PageMeta[] {
  return sortPages(getAllPages(contentSubdir));
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
