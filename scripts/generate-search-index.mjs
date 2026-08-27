import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import {
  externalDestination,
  normalizeDate,
  plainText,
} from '../lib/content-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.join(__dirname, '..', 'content');
const OUTPUT = path.join(__dirname, '..', 'public', 'search.json');

function walkDir(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, results);
    } else if (
      entry.name.endsWith('.md') &&
      !entry.name.startsWith('_') &&
      entry.name.toLowerCase() !== 'readme.md'
    ) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data, content } = matter(raw);
      const relDir = path.relative(CONTENT_ROOT, path.dirname(fullPath));
      const slug = entry.name.replace(/\.md$/, '');
      // The external-destination rule, markdown stripping, and date
      // normalization are shared with lib/content.ts via lib/content-shared.mjs
      // so search results can't link to pages the site never generates.
      const url =
        externalDestination(data) ?? `/${relDir}/${slug}/`.replace(/\\/g, '/');
      // Summary first: for external entries the body is a stub while the
      // summary is the hand-written one-liner (matches PreviewCard).
      const excerpt = plainText(data.summary || content.trim() || '').slice(0, 300);
      const date = normalizeDate(data.date);
      // Searchable-but-hidden text: author/mentor names, outlet, and type, so
      // a query like "valentine mohaugen" surfaces the papers they wrote even
      // when no name appears in the summary.
      const meta = [
        ...(Array.isArray(data.authors)
          ? data.authors.map((a) => a?.name ?? a)
          : []),
        ...(Array.isArray(data.mentors) ? data.mentors : []),
        data.source,
        data.type,
      ]
        .filter((v) => typeof v === 'string')
        .join(' ');
      results.push({
        title: data.title ?? slug,
        url,
        excerpt,
        meta,
        date,
      });
    }
  }
  return results;
}

// People are searchable too: board members and faculty link to the sections
// that render them.
function peopleEntries() {
  const read = (file) =>
    JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf-8'));
  const entries = [];
  for (const m of read('board-members.json')) {
    entries.push({
      title: `${m.name} — ${m.role}`,
      url: '/#board',
      excerpt: plainText(m.description ?? '').slice(0, 300),
      meta: 'board member officer',
      date: null,
    });
  }
  for (const m of read('past-board-members.json')) {
    entries.push({
      title: `${m.name} — ${m.role} (${m.years})`,
      url: '/about/',
      excerpt: 'Past Clemson Quantum Club board member.',
      meta: 'past board member alumni',
      date: null,
    });
  }
  for (const f of read('faculty.json')) {
    entries.push({
      title: `${f.name} — ${f.role}`,
      url: '/resources/#faculty',
      excerpt: plainText(f.description ?? '').slice(0, 300),
      meta: 'faculty professor research',
      date: null,
    });
  }
  return entries;
}

const index = [...walkDir(CONTENT_ROOT), ...peopleEntries()];
fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2));
console.log(`Search index: ${index.length} entries → public/search.json`);
