// @ts-check
// Phone-sized copies of the event and news card images. On phones a card
// shows its image as a 96px square (PreviewCard's compact row), so the full
// card art (up to ~80 KB each, about half a megabyte per archive page) is far
// more than the slot needs. For every card `image:` in content/events and
// content/news this writes public/images/thumbs/<name>.webp with its shorter
// side 288px (the 96px slot at 3x; never upscaled) and records both sizes in
// data/thumbnails.json, which PreviewCard reads to offer the pair as a srcset.
//
// The thumbnails and the manifest are committed. Each entry keeps a hash of
// its source image, so a replaced image gets a new thumbnail on the next
// `npm run dev` or `npm run build`, and an unchanged one is skipped without
// loading the image library. If sharp (installed with Next.js) is missing,
// the script warns and leaves that card on its full image. Drafts are
// skipped, so local-only art never ends up in git.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isDraft, parseFrontmatter } from '../lib/content-shared.mjs';
import { walkContentFiles } from './walk-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const THUMB_DIR = path.join(PUBLIC, 'images', 'thumbs');
const MANIFEST = path.join(ROOT, 'data', 'thumbnails.json');
const CARD_DIRS = ['events', 'news'];
const SHORT_SIDE = 288; // px: the 96px compact slot at 3x
const QUALITY = 78;

/** @typedef {{ src: string, hash: string, width: number, height: number, thumb: string, thumbWidth: number, thumbHeight: number }} Thumb */

/** @type {Record<string, Thumb>} */
const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf-8')) : {};

const images = new Set();
for (const dir of CARD_DIRS) {
  for (const file of walkContentFiles(path.join(ROOT, 'content', dir))) {
    /** @type {any} */
    let data;
    try {
      ({ data } = parseFrontmatter(fs.readFileSync(file, 'utf-8')));
    } catch (err) {
      console.error(`[error] ${path.relative(ROOT, file)}: front matter failed to parse (${err instanceof Error ? err.message : err})`);
      process.exit(1);
    }
    if (isDraft(data) || typeof data.image !== 'string') continue;
    if (/^\/images\/[^/]+\.(?:webp|jpe?g|png)$/i.test(data.image) && fs.existsSync(path.join(PUBLIC, data.image))) {
      images.add(data.image);
    }
  }
}

// Each phone copy is named after its image without the extension, so two
// card images that differ only in extension (or case) would share one file
// and a card would show the other's picture. Stop before writing anything.
/** @type {Map<string, string>} */
const byName = new Map();
for (const src of images) {
  const name = path.basename(src).replace(/\.[^.]+$/, '').toLowerCase();
  const other = byName.get(name);
  if (other) {
    console.error(`[error] thumbnails: ${other} and ${src} would share one phone copy; rename one of them`);
    process.exit(1);
  }
  byName.set(name, src);
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
      console.warn('[warn] thumbnails: sharp is not installed; new or changed card images keep their full size on phones');
    }
  }
  return sharp;
}

/** @type {Record<string, Thumb>} */
const next = {};
let made = 0;
for (const src of [...images].sort()) {
  const buf = fs.readFileSync(path.join(PUBLIC, src));
  const hash = crypto.createHash('sha1').update(buf).digest('hex');
  const old = previous[src];
  if (old && old.hash === hash && fs.existsSync(path.join(PUBLIC, old.thumb))) {
    next[src] = old;
    continue;
  }
  const lib = await loadSharp();
  if (!lib) continue;
  // A photo can be stored sideways with an EXIF rotation that browsers apply:
  // measure and draw it the way the page shows it.
  const meta = await lib(buf, { autoOrient: true }).metadata();
  const width = meta.autoOrient?.width ?? meta.width ?? 0;
  const height = meta.autoOrient?.height ?? meta.height ?? 0;
  // Already small: the full image is the phone image.
  if (Math.min(width, height) <= SHORT_SIDE) continue;
  const scale = SHORT_SIDE / Math.min(width, height);
  const thumbWidth = Math.round(width * scale);
  const thumbHeight = Math.round(height * scale);
  const thumb = `/images/thumbs/${path.basename(src).replace(/\.[^.]+$/, '')}.webp`;
  fs.mkdirSync(THUMB_DIR, { recursive: true });
  await lib(buf, { autoOrient: true }).resize(thumbWidth, thumbHeight).webp({ quality: QUALITY }).toFile(path.join(PUBLIC, thumb));
  next[src] = { src, hash, width, height, thumb, thumbWidth, thumbHeight };
  made++;
}

// Drop thumbnails whose card image is gone or no longer used.
const keep = new Set(Object.values(next).map((t) => path.basename(t.thumb)));
if (fs.existsSync(THUMB_DIR)) {
  for (const name of fs.readdirSync(THUMB_DIR)) {
    if (!keep.has(name)) fs.rmSync(path.join(THUMB_DIR, name));
  }
}

const json = `${JSON.stringify(next, null, 2)}\n`;
if (!fs.existsSync(MANIFEST) || fs.readFileSync(MANIFEST, 'utf-8') !== json) fs.writeFileSync(MANIFEST, json);
console.log(`Thumbnails: ${Object.keys(next).length} card image(s), ${made} new → public/images/thumbs/`);
