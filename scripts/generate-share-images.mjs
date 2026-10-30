// @ts-check
// Link-preview copies of WebP page images. LinkedIn (and some other sites
// that draw link previews) doesn't reliably show a WebP og:image, so for
// every page with its own URL whose front-matter `image` is a .webp, this
// writes a JPEG twin at the same size, public/images/share/<name>.jpg, and
// lists it in data/share-images.json. lib/slugPage.tsx then gives og:image
// the JPEG; the page itself keeps showing the WebP.
//
// Like the phone thumbnails (generate-thumbnails.mjs), the copies and the
// list are committed, so the deploy never needs the image library. Each
// entry keeps a hash of its source, so a replaced image gets a new copy on
// the next `npm run dev` or `npm run build`. Drafts and pages that link out
// (no page of their own) are skipped. If sharp (installed with Next.js) is
// missing, the script warns and those pages keep the WebP preview.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { externalDestination, isDraft, parseFrontmatter } from '../lib/content-shared.mjs';
import { walkContentFiles } from './walk-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SHARE_DIR = path.join(PUBLIC, 'images', 'share');
const MANIFEST = path.join(ROOT, 'data', 'share-images.json');
// The content folders whose entries get pages of their own.
const PAGE_DIRS = ['events', 'resources'];
const QUALITY = 86;

/** @typedef {{ hash: string, jpg: string }} Share */

/** @type {Record<string, Share>} */
const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf-8')) : {};

const images = new Set();
for (const dir of PAGE_DIRS) {
  for (const file of walkContentFiles(path.join(ROOT, 'content', dir))) {
    /** @type {any} */
    let data;
    try {
      ({ data } = parseFrontmatter(fs.readFileSync(file, 'utf-8')));
    } catch (err) {
      console.error(`[error] ${path.relative(ROOT, file)}: front matter failed to parse (${err instanceof Error ? err.message : err})`);
      process.exit(1);
    }
    if (isDraft(data) || externalDestination(data) || typeof data.image !== 'string') continue;
    if (/^\/images\/[^/]+\.webp$/i.test(data.image) && fs.existsSync(path.join(PUBLIC, data.image))) {
      images.add(data.image);
    }
  }
}

/** @type {any} */
let sharp = null;
let sharpTried = false;
async function loadSharp() {
  if (!sharpTried) {
    sharpTried = true;
    try {
      const name = 'sharp'; // a variable, so typechecking never needs sharp installed
      sharp = (await import(name)).default;
    } catch {
      console.warn('[warn] share images: sharp is not installed; new or changed WebP page images keep a WebP link preview');
    }
  }
  return sharp;
}

/** @type {Record<string, Share>} */
const next = {};
let made = 0;
for (const src of [...images].sort()) {
  const buf = fs.readFileSync(path.join(PUBLIC, src));
  const hash = crypto.createHash('sha1').update(buf).digest('hex');
  const old = previous[src];
  if (old && old.hash === hash && fs.existsSync(path.join(PUBLIC, old.jpg))) {
    next[src] = old;
    continue;
  }
  const lib = await loadSharp();
  if (!lib) continue;
  const jpg = `/images/share/${path.basename(src).replace(/\.webp$/i, '')}.jpg`;
  fs.mkdirSync(SHARE_DIR, { recursive: true });
  // Same pixels as the page image; any transparency goes on white, since a
  // JPEG has none.
  await lib(buf, { autoOrient: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(path.join(PUBLIC, jpg));
  next[src] = { hash, jpg };
  made++;
}

// Drop copies whose page image is gone, changed format, or is no longer used.
const keep = new Set(Object.values(next).map((s) => path.basename(s.jpg)));
if (fs.existsSync(SHARE_DIR)) {
  for (const name of fs.readdirSync(SHARE_DIR)) {
    if (!keep.has(name)) fs.rmSync(path.join(SHARE_DIR, name));
  }
}

const json = `${JSON.stringify(next, null, 2)}\n`;
if (!fs.existsSync(MANIFEST) || fs.readFileSync(MANIFEST, 'utf-8') !== json) fs.writeFileSync(MANIFEST, json);
console.log(`Share images: ${Object.keys(next).length} WebP page image(s), ${made} new → public/images/share/`);
