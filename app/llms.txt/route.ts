import siteConfig from '@/data/site-config.json';
import { getAllPages, sortPages } from '@/lib/content';
import { formatDate } from '@/lib/dates.mjs';
import { STATIC_PAGES } from '@/lib/routes.mjs';
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site';
import type { PageMeta } from '@/lib/types';

export const dynamic = 'force-static'; // required by output: 'export'

// /llms.txt (the llmstxt.org proposal): a short Markdown map of the site for
// language-model tools. It is built from the same lists as the sitemap and
// search, so it names only pages that exist.

// The display joins (no-break spaces, word joiners) mean nothing here.
const plain = (s: string) => s.replace(/\u00a0/g, ' ').replace(/\u2060/g, '');

const link = (title: string, path: string, note: string) =>
  `- [${plain(title)}](${SITE_URL}${path}): ${plain(note)}`;

/** Content entries with a page on this site (not the external cards), in
 *  the order the archives show them: upcoming first, then newest. */
const ownPages = (dirs: string[]): PageMeta[] =>
  sortPages(dirs.flatMap((dir) => getAllPages(dir)).filter((page) => !page.isExternal));

export function GET() {
  const events = ownPages(['events/hackathons', 'events/workshops-and-seminars']).map((page) => {
    const dateText = page.dateDisplay ?? (page.date ? formatDate(page.date) : null);
    const summary = page.summary ?? page.excerpt;
    return link(page.title, page.href, dateText ? `${dateText}. ${summary}` : summary);
  });
  const work = ownPages(['resources/student-work-and-projects']).map((page) =>
    link(page.title, page.href, page.summary ?? page.excerpt),
  );

  const body = [
    '# Clemson Quantum Club',
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    plain(
      `Meetings: ${siteConfig.meetingDay} at ${siteConfig.meetingTime} in ${siteConfig.location}, ` +
        `open to every student. Email: ${siteConfig.contactEmail}. ` +
        `News and events are also in an Atom feed: ${SITE_URL}/feed.xml`,
    ),
    '',
    '## Pages',
    '',
    link('Home', '/', 'Upcoming events, the board, and how to join.'),
    ...STATIC_PAGES.map((page) => link(page.title, page.path, page.excerpt)),
    '',
    '## Events with their own pages',
    '',
    ...events,
    '',
    '## Student work',
    '',
    ...work,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
