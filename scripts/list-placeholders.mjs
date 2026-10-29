// @ts-check
// What is still waiting for real information: `npm run todo`.
//
// Lists, page by page with line numbers, every visible placeholder in the
// content (TBD, "to be announced", "will be posted here", "Sponsor coming
// soon"), the Fall Fest file chips that are not links yet, and the
// leaderboards without a sheet, and committee photos still pending; then
// board members without a headshot or with TBD text, Governing Documents
// PDFs not uploaded yet, and new files git doesn't have yet (they must go in
// the same commit as the pages that use them). Drafts are included and
// marked, since they are where most of the open details live. HTML comments
// are skipped (they are notes to the editor, not page text), and so are the
// templates. It only reads files and always exits 0.
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isDraft, parseFrontmatter } from '../lib/content-shared.mjs';
import { walkContentFiles } from './walk-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');

const PLACEHOLDER =
  /\bTBD\b|to be announced|will be (?:announced|posted)|announced here|posted here|coming soon/i;

/** Blank out HTML comments but keep their newlines, so line numbers hold. */
const dropComments = (/** @type {string} */ text) =>
  text.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ' '));

/** A line as readers see it: tags removed, spaces squeezed, clipped. */
function shown(/** @type {string} */ line) {
  const text = line.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/ ([.,;:!?)])/g, '$1').trim();
  const at = text.search(PLACEHOLDER);
  if (text.length <= 110) return text;
  const from = Math.max(0, Math.min(at - 40, text.length - 110));
  return `${from > 0 ? '…' : ''}${text.slice(from, from + 110)}…`;
}

/** @type {string[]} */
const out = [];
let count = 0;

for (const file of walkContentFiles(CONTENT)) {
  const raw = fs.readFileSync(file, 'utf-8');
  const { data } = parseFrontmatter(raw);
  const lines = dropComments(raw).split('\n');
  /** @type {string[]} */
  const items = [];
  /** @type {number[]} */
  const chips = [];
  /** @type {number[]} */
  const boards = [];
  lines.forEach((line, i) => {
    const n = i + 1;
    if (/<span class="qff-day-resource">/.test(line)) chips.push(n);
    if (/class="qff-leaderboard"[^>]*data-src=""/.test(line)) boards.push(n);
    else if (/hackathon-team-photo--pending/.test(line)) items.push(`  ${String(n).padStart(4)}  committee photo pending (swap the empty circle for an <img class="hackathon-team-photo">)`);
    else if (PLACEHOLDER.test(line)) items.push(`  ${String(n).padStart(4)}  ${shown(line)}`);
  });
  if (chips.length) items.push(`        ${chips.length} file chip(s) still plain text (Notebook, Slides, Files): lines ${chips.join(', ')}`);
  if (boards.length) items.push(`        ${boards.length} leaderboard(s) without a sheet (data-src=""): lines ${boards.join(', ')}`);
  if (!items.length) continue;
  count += items.length;
  const rel = path.relative(ROOT, file);
  out.push('', `${data.title ?? rel}${isDraft(data) ? '  [draft, local only]' : ''}`, `  ${rel}`, ...items);
}

/** @param {string} name */
const readJSON = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', name), 'utf-8'));

/** @type {string[]} */
const people = [];
for (const m of readJSON('board-members.json')) {
  if (!m.image) people.push(`  ${m.name}: no headshot yet. Run: npm run headshot -- <photo> "${m.name}"`);
  if (PLACEHOLDER.test(m.description ?? '')) people.push(`  ${m.name}: "${m.description.replace(/\n/g, ' / ')}"`);
}
if (people.length) {
  count += people.length;
  out.push('', 'Board (data/board-members.json)', ...people);
}

/** @type {string[]} */
const docs = [];
for (const d of readJSON('governing-documents.json').documents) {
  if (d.href.endsWith('.pdf') && !fs.existsSync(path.join(ROOT, 'public', d.href))) {
    docs.push(`  ${d.title}: put the PDF at public${d.href} (it shows "Coming soon" until then)`);
  }
}
if (docs.length) {
  count += docs.length;
  out.push('', 'Governing Documents (data/governing-documents.json)', ...docs);
}

// New files git doesn't track yet, grouped by folder. Skipped without git.
try {
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n')
    .filter(Boolean);
  if (untracked.length) {
    /** @type {Map<string, string[]>} */
    const byDir = new Map();
    for (const f of untracked) {
      const dir = path.posix.dirname(f);
      byDir.set(dir, [...(byDir.get(dir) ?? []), path.posix.basename(f)]);
    }
    out.push('', 'Not in git yet (add these in the same commit as the changes that use them)');
    for (const [dir, names] of [...byDir].sort()) {
      out.push(names.length > 4 ? `  ${dir}/ (${names.length} files)` : `  ${names.map((n) => `${dir === '.' ? '' : `${dir}/`}${n}`).join(', ')}`);
    }
  }
} catch {
  // not a git checkout
}

console.log(count ? `${count} open item(s):${out.join('\n')}\n` : `Nothing is waiting for information.${out.join('\n')}\n`);
