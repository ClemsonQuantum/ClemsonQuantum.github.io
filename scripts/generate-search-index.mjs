// @ts-check
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  externalDestination,
  isDraft,
  isUnlisted,
  parseFrontmatter,
  plainText,
} from '../lib/content-shared.mjs';
import { formatMonthRange } from '../lib/dates.mjs';
import { STATIC_PAGES } from '../lib/routes.mjs';
import { walkContentFiles } from './walk-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.join(__dirname, '..', 'content');
const OUTPUT = path.join(__dirname, '..', 'public', 'search.json');

// One search entry per markdown content file (same file set as
// validate-content.mjs, via walkContentFiles), minus drafts and unlisted
// pages (see isUnlisted in lib/content-shared.mjs).
function contentEntries() {
  const dated = walkContentFiles(CONTENT_ROOT).flatMap((fullPath) => {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const { data, content } = parseFrontmatter(raw);
    if (isUnlisted(data) || isDraft(data)) return [];
    const relDir = path.relative(CONTENT_ROOT, path.dirname(fullPath));
    const slug = path.basename(fullPath, '.md');
    // The external-destination rule and markdown stripping are shared with
    // lib/content.ts via lib/content-shared.mjs so search results can't link
    // to pages the site never generates.
    const subdir = relDir.replace(/\\/g, '/');
    const url = externalDestination(data) ?? `/${subdir}/${slug}/`;
    // Summary first: for external entries the body is a stub while the
    // summary is the hand-written one-liner (matches PreviewCard).
    const excerpt = plainText(data.summary || content.trim() || '').slice(0, 300);
    // Searchable-but-hidden text: author/mentor names, outlet, and type, so
    // a query like "valentine mohaugen" surfaces the papers they wrote even
    // when no name appears in the summary.
    const meta = [
      ...(Array.isArray(data.authors)
        ? data.authors.map((/** @type {any} */ a) => a?.name ?? a)
        : []),
      ...(Array.isArray(data.mentors) ? data.mentors : []),
      data.source,
      data.type,
    ]
      .filter((v) => typeof v === 'string')
      .join(' ');
    // The whole page body, markup stripped, so a page is findable by anything
    // it says and not just by its 300-character summary: "BB84" reaches
    // Qiskit Fall Fest 2026. SearchBar scores it like the summary, below
    // titles and names.
    const body = plainText(content);
    return [
      {
        date: String(data.date ?? ''),
        entry: { title: data.title ?? slug, url, excerpt, meta, body },
      },
    ];
  });
  // Newest first: SearchBar keeps index order for equal scores, so "fall
  // fest" lists this year's Fall Fest before the 2024 and 2025 cards.
  return dated.sort((a, b) => b.date.localeCompare(a.date)).map((d) => d.entry);
}

/** @param {string} file */
const readData = (file) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf-8'));

// The fixed pages (lib/routes.mjs, shared with the sitemap), so "discord",
// "join" or "code of conduct" find them. Get Involved also carries the
// meeting facts from data/site-config.json.
function staticEntries() {
  const site = readData('site-config.json');
  const meeting = [site.meetingDay, site.meetingTime, site.location, site.contactEmail].join(' ');
  return STATIC_PAGES.map((page) => ({
    title: page.title,
    url: page.path,
    excerpt: page.excerpt,
    meta: page.path === '/get-involved/' ? `${page.keywords} ${meeting}` : page.keywords,
  }));
}

/**
 * A person's bio as an excerpt, plus the full text as `body` when the
 * 300-character excerpt cuts it short, so the rest stays searchable.
 *
 * @param {string | undefined} description
 */
function bioFields(description) {
  const bio = plainText(description ?? '');
  return bio.length > 300 ? { excerpt: bio.slice(0, 300), body: bio } : { excerpt: bio };
}

// People are searchable too: board members and faculty link to the sections
// that render them.
function peopleEntries() {
  const entries = [];
  for (const m of readData('board-members.json')) {
    entries.push({
      title: `${m.name}, ${m.role}`,
      url: '/#board',
      ...bioFields(m.description),
      meta: 'board member officer',
    });
  }
  for (const m of readData('past-board-members.json')) {
    entries.push({
      title: `${m.name}, ${m.role} (${formatMonthRange(m.start, m.end)})`,
      // PastBoardMembers opens its collapsed list on this hash.
      url: '/about/#past-board',
      excerpt: 'Past Clemson Quantum Club board member.',
      meta: 'past board member alumni',
    });
  }
  for (const f of readData('faculty.json')) {
    entries.push({
      title: `${f.name}, ${f.role}`,
      url: '/resources/#faculty',
      ...bioFields(f.description),
      meta: 'faculty professor research',
    });
  }
  return entries;
}

const index = [...staticEntries(), ...contentEntries(), ...peopleEntries()];
fs.writeFileSync(OUTPUT, JSON.stringify(index));
console.log(`Search index: ${index.length} entries → public/search.json`);
