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
import { walkContentFiles } from './walk-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT_ROOT = path.join(ROOT, 'content');
const OUT_DIR = path.join(ROOT, 'public', 'calendar');
const DOMAIN = fs.readFileSync(path.join(ROOT, 'public', 'CNAME'), 'utf-8').trim();
const TIME_ZONE = 'America/New_York';

/**
 * Clemson local date and time -> the same instant in UTC.
 * Two passes of "format the guess in New York, correct by the difference"
 * settle on the right offset for that date (EST or EDT).
 *
 * @param {string} date YYYY-MM-DD
 * @param {string} time HH:MM (24-hour)
 * @returns {Date}
 */
function clemsonToUtc(date, time) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wanted = Date.UTC(y, m - 1, d, h, mi);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  let t = wanted;
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    t += wanted - shown;
  }
  return new Date(t);
}

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
  const location = typeof data.location === 'string' ? data.location : 'Clemson University';
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
      `DESCRIPTION:${icsText(`Session ${i + 1} of ${sessions.length}. Rooms, materials, and the challenge: ${pageUrl}`)}`,
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
