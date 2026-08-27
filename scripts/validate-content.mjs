import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { WORK_TYPES } from '../lib/content-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const CONTENT_ROOT = path.join(REPO_ROOT, 'content');
const PUBLIC_ROOT = path.join(REPO_ROOT, 'public');

const URL_FIELDS = ['external_url', 'source_url', 'link'];

// Frontmatter fields that must point at an existing file under public/.
const ASSET_FIELDS = ['image', 'pdf'];

// Matches site-local asset references (/images/... or /files/...) inside
// markdown bodies, JSON strings, and CSS url() values.
const LOCAL_ASSET_RE = /\/(?:images|files)\/[^\s"'`<>()\\,]+/g;

function assetExists(ref) {
  // Strip query strings / fragments before hitting the filesystem.
  const clean = decodeURI(ref.split(/[?#]/)[0]);
  return fs.existsSync(path.join(PUBLIC_ROOT, clean));
}

function checkLocalAssetRefs(text, relPath, problems) {
  for (const ref of text.match(LOCAL_ASSET_RE) ?? []) {
    if (!assetExists(ref)) {
      problems.push(`${relPath}: referenced asset "${ref}" not found under public/`);
    }
  }
}

function isValidIsoDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

function validateFile(fullPath, problems) {
  const relPath = path.relative(REPO_ROOT, fullPath);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  let data;
  let content;
  try {
    ({ data, content } = matter(raw));
  } catch (err) {
    problems.push(`${relPath}: front matter failed to parse (${err.message})`);
    return;
  }

  if (typeof data.title !== 'string' || data.title.trim() === '') {
    problems.push(`${relPath}: missing or empty "title"`);
  }

  // Valid dates: a real Date (gray-matter parses unquoted YYYY-MM-DD), a
  // YYYY-MM-DD string, or the documented "TBD" placeholder — which is legit
  // only alongside a dateDisplay override (see ibm-fall-fest-2026.md).
  const date = data.date;
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) {
      problems.push(`${relPath}: "date" is not a valid date`);
    }
  } else if (date === 'TBD') {
    if (typeof data.dateDisplay !== 'string' || data.dateDisplay.trim() === '') {
      problems.push(`${relPath}: date "TBD" requires "dateDisplay" to be set`);
    }
  } else if (typeof date === 'string') {
    if (!isValidIsoDate(date)) {
      problems.push(`${relPath}: "date" must be YYYY-MM-DD or TBD (got "${date}")`);
    }
  } else {
    problems.push(`${relPath}: missing "date"`);
  }

  for (const field of ASSET_FIELDS) {
    const value = data[field];
    if (typeof value === 'string' && value.startsWith('/')) {
      if (!assetExists(value)) {
        problems.push(`${relPath}: ${field} "${value}" not found under public/`);
      }
    }
  }

  // Local image/file links inside the markdown body must exist too.
  checkLocalAssetRefs(content, relPath, problems);

  for (const field of URL_FIELDS) {
    const value = data[field];
    // Site-local paths (e.g. link: "/files/x.pdf") are legitimate; anything
    // else must parse as an absolute URL — a typo like "htp:/x" or a bare
    // "example.com" would otherwise be silently treated as an internal page.
    if (typeof value === 'string' && !value.startsWith('/')) {
      try {
        new URL(value);
      } catch {
        problems.push(`${relPath}: "${field}" is not a valid URL ("${value}")`);
      }
    }
  }

  // path.relative uses backslashes on Windows; normalize before matching.
  const posixPath = relPath.split(path.sep).join('/');

  // Meetings and news have no [slug] routes, so every entry must link out or
  // its card would 404 (see content/README.md).
  if (posixPath.includes('content/events/meetings/')) {
    if (typeof data.external_url !== 'string' || !data.external_url.includes('://')) {
      problems.push(
        `${relPath}: meetings have no detail pages, so "external_url" is required`
      );
    }
  }
  if (posixPath.includes('content/news/')) {
    if (typeof data.source_url !== 'string' || !data.source_url.includes('://')) {
      problems.push(
        `${relPath}: news entries have no detail pages, so "source_url" is required`
      );
    }
  }

  // Student-work "type" drives the filter tabs; a typo would silently create
  // a new tab.
  if (posixPath.includes('student-work-and-projects/') && data.type !== undefined) {
    if (!WORK_TYPES.includes(data.type)) {
      problems.push(
        `${relPath}: "type" must be one of ${WORK_TYPES.join(', ')} (got "${data.type}")`
      );
    }
  }
}

function walkDir(dir, problems, count = { files: 0 }) {
  if (!fs.existsSync(dir)) return count;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, problems, count);
    } else if (
      entry.name.endsWith('.md') &&
      !entry.name.startsWith('_') &&
      entry.name.toLowerCase() !== 'readme.md'
    ) {
      count.files += 1;
      validateFile(fullPath, problems);
    }
  }
  return count;
}

// data/*.json: every /images/ or /files/ string value must exist under public/.
function validateDataJson(problems) {
  const dataDir = path.join(REPO_ROOT, 'data');
  let count = 0;
  if (!fs.existsSync(dataDir)) return count;
  for (const entry of fs.readdirSync(dataDir)) {
    if (!entry.endsWith('.json')) continue;
    count += 1;
    const relPath = path.relative(REPO_ROOT, path.join(dataDir, entry));
    const raw = fs.readFileSync(path.join(dataDir, entry), 'utf-8');
    try {
      JSON.parse(raw);
    } catch (err) {
      problems.push(`${relPath}: invalid JSON (${err.message})`);
      continue;
    }
    checkLocalAssetRefs(raw, relPath, problems);
  }
  return count;
}

// The stylesheet references assets two ways: url(...) values and [src$="..."]
// attribute selectors (which silently stop matching when an image is renamed —
// e.g. a .png converted to .webp).
function validateCss(problems) {
  const cssPath = path.join(REPO_ROOT, 'assets', 'css', 'style.css');
  if (!fs.existsSync(cssPath)) return 0;
  const relPath = path.relative(REPO_ROOT, cssPath);
  const css = fs.readFileSync(cssPath, 'utf-8');

  for (const [, ref] of css.matchAll(/url\(\s*['"]?(\/(?:images|files)\/[^'")]+)['"]?\s*\)/g)) {
    if (!assetExists(ref)) {
      problems.push(`${relPath}: url() asset "${ref}" not found under public/`);
    }
  }

  const publicFiles = [];
  (function collect(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(fullPath);
      else publicFiles.push(fullPath);
    }
  })(PUBLIC_ROOT);

  for (const [, suffix] of css.matchAll(/\[src\$=["']([^"']+)["']\]/g)) {
    if (!publicFiles.some((f) => f.endsWith(suffix))) {
      problems.push(`${relPath}: [src$="${suffix}"] matches no file under public/`);
    }
  }
  return 1;
}

const problems = [];
const { files } = walkDir(CONTENT_ROOT, problems);
const dataFiles = validateDataJson(problems);
validateCss(problems);

if (problems.length > 0) {
  console.error(`Content validation failed — ${problems.length} problem(s):`);
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}
console.log(`[ok] ${files} content files, ${dataFiles} data files, and CSS asset refs validated`);
