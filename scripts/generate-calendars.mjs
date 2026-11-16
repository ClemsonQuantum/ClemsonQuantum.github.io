// @ts-check
// Add-to-calendar files: every content page with a `calendar:` block in its
// front matter (see content/README.md) gets public/calendar/<slug>.ics, one
// event per session. Runs before dev and build like the search index, and its
// output is gitignored the same way, so a date or title change ships with the
// next normal push (no scheduled rebuilds).
//
// Times in the front matter are Clemson local time; the file stores them in
// UTC (so no VTIMEZONE block is needed), converted per date, so a session on
// either side of a daylight saving change lands at the right hour. Each event
// has a stable UID, so importing the file again updates it instead of adding
// a duplicate.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isDraft, parseFrontmatter } from '../lib/content-shared.mjs';
import { clemsonToUtc } from '../lib/dates.mjs';
import { walkContentFiles } from './walk-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT_ROOT = path.join(ROOT, 'content');
const OUT_DIR = path.join(ROOT, 'public', 'calendar');
const DOMAIN = fs.readFileSync(path.join(ROOT, 'public', 'CNAME'), 'utf-8').trim();

/** @param {Date} d */
const icsTime = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** RFC 5545 text escaping. @param {string} s */
const icsText = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/**
 * Fold a content line at 75 octets (RFC 5545 3.1), never inside a UTF-8 character.
 * @param {string} line
 */
function fold(line) {
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
const stamp = icsTime(new Date());
let files = 0;
let events = 0;

for (const fullPath of walkContentFiles(CONTENT_ROOT)) {
  const { data } = parseFrontmatter(fs.readFileSync(fullPath, 'utf-8'));
  if (!data.calendar || isDraft(data)) continue;
  const { start, end, sessions } = data.calendar;
  const slug = path.basename(fullPath, '.md');
  const subdir = path.relative(CONTENT_ROOT, path.dirname(fullPath)).replace(/\\/g, '/');
  const pageUrl = `https://${DOMAIN}/${subdir}/${slug}/`;
  // `online_url` (a Zoom room, say) goes first in every entry's notes, where
  // calendar apps turn it into a link. An event with the link and no
  // `location` is online only: the link is also each entry's place, and the
  // notes say nothing about rooms.
  const onlineUrl = typeof data.online_url === 'string' && data.online_url.includes('://') ? data.online_url : null;
  const venue = typeof data.location === 'string' && data.location.trim() ? data.location : null;
  const location = venue ?? onlineUrl ?? 'Clemson University';
  const online = onlineUrl ? `Join online: ${onlineUrl}\n` : '';
  const more = venue || !onlineUrl ? 'Rooms, materials, and the challenge' : 'Materials and the challenge';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Clemson Quantum Club//${DOMAIN}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText(data.title)}`,
  ];
  // A session can set its own start and end (a later session) and its own
  // location (another room); the validator checks both.
  sessions.forEach((/** @type {{date: string, title: string, start?: string, end?: string, location?: string}} */ s, /** @type {number} */ i) => {
    const own = typeof s.start === 'string' && typeof s.end === 'string';
    const room = typeof s.location === 'string' && s.location.trim() ? s.location : location;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${slug}-session-${i + 1}@${DOMAIN}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsTime(clemsonToUtc(s.date, own ? s.start : start))}`,
      `DTEND:${icsTime(clemsonToUtc(s.date, own ? s.end : end))}`,
      `SUMMARY:${icsText(`${data.title}: ${s.title}`)}`,
      `LOCATION:${icsText(room)}`,
      `DESCRIPTION:${icsText(`Session ${i + 1} of ${sessions.length}. ${online}${more}: ${pageUrl}`)}`,
      `URL:${pageUrl}`,
      'END:VEVENT',
    );
    events++;
  });
  lines.push('END:VCALENDAR');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `${slug}.ics`), `${lines.map(fold).join('\r\n')}\r\n`);
  files++;
}

console.log(`Calendars: ${files} file(s), ${events} event(s) → public/calendar/`);
