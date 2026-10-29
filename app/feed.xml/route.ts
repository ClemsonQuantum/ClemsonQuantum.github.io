import { getAllPages } from '@/lib/content';
import { formatDate, todayInClemson } from '@/lib/dates.mjs';
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static'; // required by output: 'export'

// An Atom feed of the club's news and events at /feed.xml, which the root
// layout links for feed readers. It is built with the site from the same
// listings as the archives (no drafts or unlisted pages), so a new story or
// event reaches subscribers with the next normal push.
const SECTIONS = [
  { dir: 'news', label: 'News' },
  { dir: 'events/hackathons', label: 'Hackathon' },
  { dir: 'events/workshops-and-seminars', label: 'Workshop or seminar' },
  { dir: 'events/meetings', label: 'Meeting' },
];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The display joins (no-break spaces, word joiners) mean nothing in a reader.
const plain = (s: string) => s.replace(/\u00a0/g, ' ').replace(/\u2060/g, '');

// Entry ids come from the content file (folder and name), not the link, so
// an entry keeps its id when its link changes (a page that becomes an
// external card, say) and readers don't show it twice.
const TAG = `tag:${new URL(SITE_URL).host},2026:`;

export function GET() {
  const today = todayInClemson();
  const entries = SECTIONS.flatMap(({ dir, label }) =>
    getAllPages(dir).map((page) => {
      // Atom requires an `updated` time, and the only date on an entry is
      // its event or publication day. An upcoming or TBD event has not
      // happened yet, so it takes the build day instead of a future date.
      const day = page.date && ISO_DAY.test(page.date) && page.date <= today ? page.date : today;
      const summary = page.summary ?? page.excerpt;
      // Events lead with their dates, since `updated` is not the event day.
      const dateText = page.dateDisplay ?? (page.date ? formatDate(page.date) : null);
      const text = dir === 'news' || !dateText ? summary : `${dateText}. ${summary}`;
      return {
        day,
        date: page.date ?? '',
        xml: [
          '  <entry>',
          `    <title>${xml(plain(page.title))}</title>`,
          `    <link rel="alternate" href="${xml(page.isExternal ? page.href : `${SITE_URL}${page.href}`)}"/>`,
          `    <id>${TAG}/${dir}/${page.slug}</id>`,
          // Noon UTC is the same calendar day in every US time zone.
          `    <updated>${day}T12:00:00Z</updated>`,
          `    <category term="${label}"/>`,
          `    <summary>${xml(plain(text))}</summary>`,
          '  </entry>',
        ].join('\n'),
      };
    }),
  );
  // Newest first; upcoming events all share the build day, so among them the
  // soonest comes first.
  entries.sort((a, b) => b.day.localeCompare(a.day) || a.date.localeCompare(b.date));

  const body = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    '  <title>Clemson Quantum Club</title>',
    `  <subtitle>${xml(SITE_DESCRIPTION)}</subtitle>`,
    `  <link rel="self" href="${SITE_URL}/feed.xml"/>`,
    `  <link rel="alternate" type="text/html" href="${SITE_URL}/"/>`,
    `  <id>${SITE_URL}/feed.xml</id>`,
    `  <updated>${entries[0]?.day ?? today}T12:00:00Z</updated>`,
    '  <author><name>Clemson Quantum Club</name></author>',
    `  <icon>${SITE_URL}/favicon-512.png</icon>`,
    ...entries.map((e) => e.xml),
    '</feed>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}
