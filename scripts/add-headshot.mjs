// @ts-check
// Add or replace a board member's headshot in one step:
//
//   npm run headshot -- ~/Downloads/photo.jpg "Daniela Solano"
//
// The photo (JPG, PNG or WebP at any size; an iPhone HEIC is converted
// first with macOS's sips) is turned upright from its camera data, cropped
// to a square around its most detailed region (usually the face; add
// --center for a plain center crop), resized to 360×360 (the 120px card
// circle at 3x), and saved as a JPEG at public/images/<first-last>.jpg, with
// any transparency on white. Then that person's "image" in
// data/board-members.json is pointed at it. Only that one value changes, so
// the rest of the file keeps its exact text. Check the board on the homepage
// with `npm run dev`, and run it again with --center if the crop missed.
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BOARD = path.join(ROOT, 'data', 'board-members.json');
const SIZE = 360; // px, square
const QUALITY = 82;

const args = process.argv.slice(2);
const center = args.includes('--center');
const [input, name] = args.filter((a) => a !== '--center');

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  console.error(`[error] ${message}`);
  process.exit(1);
}

if (!input || !name) {
  fail('usage: npm run headshot -- <photo file> "<Full Name>" [--center]');
}
const source = path.resolve(input.replace(/^~(?=\/)/, process.env.HOME ?? '~'));
if (!fs.existsSync(source)) fail(`no file at ${source}`);

const raw = fs.readFileSync(BOARD, 'utf-8');
/** @type {{ name: string, image: string }[]} */
const board = JSON.parse(raw);
const member = board.find((m) => m.name.toLowerCase() === name.toLowerCase());
if (!member) {
  fail(`no board member named "${name}" in data/board-members.json. Names: ${board.map((m) => m.name).join(', ')}`);
}

// "Daniela Solano" -> daniela-solano.jpg, like the other headshots.
const slug = member.name
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const ref = `/images/${slug}.jpg`;
const dest = path.join(ROOT, 'public', ref);

let sharp;
try {
  const lib = 'sharp'; // a variable, so typechecking never needs sharp installed
  sharp = (await import(lib)).default;
} catch {
  fail('sharp is not installed (it comes with Next.js): run npm install first');
}

// sharp's prebuilt library can't decode HEIC (iPhone photos); sips can.
let photo = source;
if (/\.hei[cf]$/i.test(source)) {
  if (process.platform !== 'darwin') fail('HEIC photos need converting to JPG first (on a Mac, Preview > Export)');
  photo = path.join(os.tmpdir(), `headshot-${process.pid}.jpg`);
  try {
    execFileSync('sips', ['-s', 'format', 'jpeg', source, '--out', photo], { stdio: 'ignore' });
  } catch {
    fail(`couldn't convert ${source} with sips; export it as JPG and try again`);
  }
}

let meta;
let info;
try {
  meta = await sharp(photo).metadata();
  info = await sharp(photo)
    .rotate()
    .resize(SIZE, SIZE, { fit: 'cover', position: center ? 'centre' : sharp.strategy.attention })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(dest);
} catch (err) {
  fail(`couldn't read ${source} as an image (${err instanceof Error ? err.message : err}); try exporting it as JPG`);
} finally {
  if (photo !== source) fs.rmSync(photo, { force: true });
}
const shortSide = Math.min(meta.width ?? 0, meta.height ?? 0);
console.log(`[done]  ${path.relative(ROOT, dest)}: ${info.width}×${info.height}, ${Math.round(info.size / 1000)} KB (${center ? 'center' : 'detail'} crop)`);
if (shortSide && shortSide < SIZE) {
  console.log(`[warn]  the photo's shorter side is ${shortSide}px, so it was enlarged; a larger original will look sharper`);
}

// Point this member's "image" at the file, changing only that value.
const at = raw.indexOf(`"name": ${JSON.stringify(member.name)}`);
const next = raw.indexOf('"name":', at + 1);
const end = next === -1 ? raw.length : next;
const block = raw.slice(at, end);
const updated = block.replace(/"image": "[^"]*"/, `"image": "${ref}"`);
if (at === -1 || updated === block) {
  if (member.image === ref) console.log(`[done]  data/board-members.json already uses ${ref}`);
  else fail(`could not find ${member.name}'s "image" field; set it to "${ref}" by hand`);
} else {
  fs.writeFileSync(BOARD, raw.slice(0, at) + updated + raw.slice(end));
  console.log(`[done]  data/board-members.json: ${member.name} now uses ${ref}${member.image ? ` (was ${member.image})` : ''}`);
}
