// @ts-check
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  externalDestination,
  isDraft,
  isUnlisted,
  parseFrontmatter,
} from '../lib/content-shared.mjs';
import { WORK_TYPES } from '../lib/work-types.mjs';
import { walkContentFiles } from './walk-content.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const CONTENT_ROOT = path.join(REPO_ROOT, 'content');
const PUBLIC_ROOT = path.join(REPO_ROOT, 'public');

const URL_FIELDS = ['external_url', 'source_url', 'link', 'registration_url'];

// Frontmatter fields that must point at an existing file under public/.
const ASSET_FIELDS = ['image', 'image_mobile', 'pdf'];

// Matches site-local asset references (/images/... or /files/...) inside
// markdown bodies and JSON strings (validateCss has its own url() pattern).
const LOCAL_ASSET_RE = /\/(?:images|files)\/[^\s"'`<>()\\,]+/g;

/**
 * @param {string} ref site-local URL path (/images/x.webp)
 * @returns {boolean}
 */
function assetExists(ref) {
  // Strip query strings / fragments before hitting the filesystem.
  const clean = decodeURI(ref.split(/[?#]/)[0]);
  return fs.existsSync(path.join(PUBLIC_ROOT, clean));
}

/**
 * @param {string} text
 * @param {string} relPath
 * @param {string[]} problems
 */
function checkLocalAssetRefs(text, relPath, problems) {
  for (const ref of text.match(LOCAL_ASSET_RE) ?? []) {
    if (!assetExists(ref)) {
      problems.push(`${relPath}: referenced asset "${ref}" not found under public/`);
    }
  }
}

/**
 * @param {string} str
 * @returns {boolean}
 */
function isValidIsoDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

/**
 * Every opening tag of one element type that carries a class, e.g. each
 * `<div class="… qff-leaderboard …">` in a page body.
 *
 * @param {string} html
 * @param {string} tagName
 * @param {string} className
 * @returns {string[]}
 */
function tagsWithClass(html, tagName, className) {
  const re = new RegExp(`<${tagName}\\b[^>]*\\bclass="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'g');
  return [...html.matchAll(re)].map((m) => m[0]);
}

/**
 * One attribute's value in an opening tag, or undefined when it's absent.
 *
 * @param {string} tag
 * @param {string} name
 * @returns {string | undefined}
 */
function attrOf(tag, name) {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
}

// Alt text that only looks like a description: a generic word ("image",
// "photo"), a number, a file or camera name, or a template's [PLACEHOLDER].
// An empty alt is fine: it marks a decorative image.
const GENERIC_ALTS = new Set([
  'alt', 'banner', 'graphic', 'icon', 'image', 'img', 'logo', 'photo', 'pic',
  'picture', 'placeholder', 'screenshot', 'tbd', 'test', 'todo', 'untitled',
]);

/**
 * @param {string} alt
 * @returns {boolean}
 */
function isPlaceholderAlt(alt) {
  const a = alt.trim().toLowerCase().replace(/[.!]+$/, '');
  if (a === '') return false;
  return (
    GENERIC_ALTS.has(a) ||
    /^\d+$/.test(a) ||
    /\.(?:avif|gif|heic|jpe?g|png|svg|webp)$/.test(a) ||
    /^(?:img|dsc|dscn|pxl)[-_ ]?\d/.test(a) ||
    /^\[.*\]$/.test(a)
  );
}

/**
 * @typedef {{ rel: string, data: any, content: string }} ParsedPage
 * `rel` is the POSIX path under content/ (events/hackathons/x.md).
 */

/**
 * Check one content file. Returns its parsed front matter and body so the
 * cross-file checks reuse them, or null when the front matter doesn't parse.
 *
 * @param {string} fullPath
 * @param {string[]} problems
 * @returns {ParsedPage | null}
 */
function validateFile(fullPath, problems) {
  const relPath = path.relative(REPO_ROOT, fullPath);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  let data;
  let content;
  try {
    ({ data, content } = parseFrontmatter(raw));
  } catch (err) {
    problems.push(`${relPath}: front matter failed to parse (${err instanceof Error ? err.message : err})`);
    return null;
  }

  if (typeof data.title !== 'string' || data.title.trim() === '') {
    problems.push(`${relPath}: missing or empty "title"`);
  }

  // The file name is the page's URL slug.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(path.basename(fullPath))) {
    problems.push(`${relPath}: file names must be lowercase kebab-case (e.g. my-event-2026.md)`);
  }

  // Valid dates: a YYYY-MM-DD string (the yaml package parses unquoted
  // dates as plain strings), or the documented "TBD" placeholder, which is
  // legit only alongside a dateDisplay override (see content/README.md).
  const date = data.date;
  if (date === 'TBD') {
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

  // Hosted event pages build schema.org Event data from `end_date` and
  // `registration_url` (lib/slugPage.tsx): an end date must be a real calendar
  // day on or after `date`, and the registration link must be an absolute URL
  // (the generic URL_FIELDS check below also admits site-local paths, which
  // structured data cannot use).
  if (data.end_date !== undefined) {
    const endDate = data.end_date;
    if (typeof endDate !== 'string' || !isValidIsoDate(endDate)) {
      problems.push(`${relPath}: "end_date" must be YYYY-MM-DD (got "${endDate}")`);
    } else if (typeof date !== 'string' || !isValidIsoDate(date)) {
      problems.push(`${relPath}: "end_date" requires "date" to be YYYY-MM-DD (got "${date}")`);
    } else if (endDate < date) {
      problems.push(`${relPath}: "end_date" (${endDate}) is before "date" (${date})`);
    }
  }
  if (data.registration_url !== undefined) {
    const value = data.registration_url;
    if (typeof value !== 'string' || !value.includes('://')) {
      problems.push(`${relPath}: "registration_url" must be an absolute URL (got "${value}")`);
    }
  }

  // `calendar` feeds scripts/generate-calendars.mjs (the add-to-calendar
  // file): 24-hour start and end times with end after start, and at least one
  // session, each a real day inside the event's date range with a title. A
  // session may set its own `start` and `end` (together) and its own
  // `location` when it differs from the rest: a later session, another room.
  if (data.calendar !== undefined) {
    const cal = data.calendar;
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    /** @param {unknown} a @param {unknown} b */
    const span = (a, b) => typeof a === 'string' && hhmm.test(a) && typeof b === 'string' && hhmm.test(b) && b > a;
    if (typeof cal !== 'object' || cal === null || Array.isArray(cal)) {
      problems.push(`${relPath}: "calendar" must be a block with start, end and sessions`);
    } else {
      if (typeof cal.start !== 'string' || !hhmm.test(cal.start) || typeof cal.end !== 'string' || !hhmm.test(cal.end)) {
        problems.push(`${relPath}: "calendar" start and end must be quoted 24-hour times like "17:00"`);
      } else if (cal.end <= cal.start) {
        problems.push(`${relPath}: "calendar" end (${cal.end}) must be after start (${cal.start})`);
      }
      if (!Array.isArray(cal.sessions) || cal.sessions.length === 0) {
        problems.push(`${relPath}: "calendar" needs at least one entry under sessions`);
      } else {
        const last = typeof data.end_date === 'string' ? data.end_date : date;
        cal.sessions.forEach((/** @type {any} */ s, /** @type {number} */ i) => {
          if (!s || typeof s.date !== 'string' || !isValidIsoDate(s.date)) {
            problems.push(`${relPath}: calendar session ${i + 1} needs a YYYY-MM-DD date`);
          } else if (typeof date === 'string' && isValidIsoDate(date) && (s.date < date || s.date > last)) {
            problems.push(`${relPath}: calendar session ${i + 1} (${s.date}) is outside the event's dates (${date} to ${last})`);
          }
          if (!s || typeof s.title !== 'string' || s.title.trim() === '') {
            problems.push(`${relPath}: calendar session ${i + 1} needs a title`);
          }
          if (s && (s.start !== undefined || s.end !== undefined) && !span(s.start, s.end)) {
            problems.push(`${relPath}: calendar session ${i + 1}: its own "start" and "end" go together, as quoted 24-hour times with end after start`);
          }
          if (s && s.location !== undefined && (typeof s.location !== 'string' || s.location.trim() === '')) {
            problems.push(`${relPath}: calendar session ${i + 1}: "location" must be text, e.g. "McAdams Hall 107"`);
          }
        });
        // Fall Fest pages show the same sessions as the qff-day rows in the
        // sessions list (the challenge rows after it don't count): same count
        // and order, and each row's line starts with the day ("Mon, Nov 9"),
        // carries the same <time datetime> and the session's time ("5:00–6:00
        // PM"), and has the same title. Anything else in the line (a "Seminar"
        // label, a room) is free.
        const page = content.replace(/<!--[\s\S]*?-->/g, '');
        const from = page.indexOf('<div class="qff-days">');
        const to = from < 0 ? -1 : page.indexOf('qff-challenges', from);
        const sessionList = from < 0 ? '' : page.slice(from, to < 0 ? undefined : to);
        const rows = [...sessionList.matchAll(/<span class="qff-day-meta">([\s\S]*?)<\/span>\s*<span class="qff-day-title">([^<]*)<\/span>/g)];
        if (rows.length === 0 && /class="[^"]*\bqff-page\b/.test(page)) {
          problems.push(`${relPath}: "calendar" is set but no session rows were found in <div class="qff-days">; each session needs a row that matches it`);
        }
        if (rows.length > 0 && span(cal.start, cal.end)) {
          if (rows.length !== cal.sessions.length) {
            problems.push(`${relPath}: "calendar" has ${cal.sessions.length} session(s) but the page has ${rows.length} session row(s)`);
          }
          /** @param {string} t */
          const clock = (t) => `${Number(t.slice(0, 2)) % 12 || 12}:${t.slice(3)}`;
          /** @param {string} t */
          const half = (t) => (t < '12:00' ? 'AM' : 'PM');
          /** "5:00–6:00 PM", or "11:00 AM–1:00 PM" across noon. @param {string} a @param {string} b */
          const shown = (a, b) => half(a) === half(b)
            ? `${clock(a)}–${clock(b)} ${half(b)}`
            : `${clock(a)} ${half(a)}–${clock(b)} ${half(b)}`;
          rows.forEach(([, meta, title], i) => {
            const s = cal.sessions[i];
            if (!s || typeof s.date !== 'string' || !isValidIsoDate(s.date)) return;
            const day = new Date(`${s.date}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
            const time = span(s.start, s.end) ? shown(s.start, s.end) : shown(cal.start, cal.end);
            const want = `${day} · ${time}`;
            // Text as read: tags gone, no-break spaces and word joiners
            // (typed or as &nbsp;) counted as the plain spaces they look like.
            const got = meta.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/⁠/g, '').replace(/\s+/g, ' ').trim();
            const stamp = /<time\b[^>]*\bdatetime="([^"]*)"/.exec(meta)?.[1];
            if (!got.startsWith(day) || !got.includes(time) || (stamp !== undefined && stamp !== s.date) || title.trim() !== s.title) {
              problems.push(`${relPath}: calendar session ${i + 1} (${want}, "${s.title}") doesn't match session row ${i + 1} (${got}${stamp ? `, datetime ${stamp}` : ''}, "${title.trim()}")`);
            }
          });
        }
      }
    }
  }

  // `unlisted` hides a live page from every listing (lib/content-shared.mjs
  // isUnlisted). Only a real boolean counts: YAML 1.2 reads `yes`/`on` as
  // strings, so a typo there would otherwise leave the page publicly listed.
  // `draft` keeps a page out of production builds (lib/content-shared.mjs
  // hiddenAsDraft); same literal-boolean rule as `unlisted`.
  if (data.draft !== undefined && typeof data.draft !== 'boolean') {
    problems.push(`${relPath}: "draft" must be true or false (got "${data.draft}")`);
  }
  if (data.unlisted !== undefined && typeof data.unlisted !== 'boolean') {
    problems.push(`${relPath}: "unlisted" must be true or false (got "${data.unlisted}")`);
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

  // Every image in a body says what it shows, or has alt="" when it is
  // decorative (a logo beside its own name, say).
  const body = content.replace(/<!--[\s\S]*?-->/g, '');
  for (const [tag] of body.matchAll(/<img\b[^>]*>/g)) {
    const alt = /\salt="([^"]*)"/.exec(tag)?.[1];
    if (alt === undefined) {
      problems.push(`${relPath}: an <img> has no alt (use alt="" if it is decorative): ${tag.slice(0, 80)}`);
    } else if (isPlaceholderAlt(alt)) {
      problems.push(`${relPath}: alt="${alt}" is a placeholder; describe the image, or use alt="" if it is decorative`);
    }
  }
  for (const [, alt] of body.matchAll(/!\[([^\]]*)\]\(/g)) {
    if (isPlaceholderAlt(alt)) {
      problems.push(`${relPath}: image alt "${alt}" is a placeholder; describe the image, or leave it empty if it is decorative`);
    }
  }

  // <time datetime> in a body (schedule days, Fall Fest session rows) must be
  // a real YYYY-MM-DD inside the event's dates, so a page copied from last
  // year can't keep last year's machine-readable dates.
  const firstDay = typeof date === 'string' && isValidIsoDate(date) ? date : null;
  const lastDay = typeof data.end_date === 'string' ? data.end_date : firstDay;
  for (const [, dt] of body.matchAll(/<time\b[^>]*\bdatetime="([^"]*)"/g)) {
    if (!isValidIsoDate(dt)) {
      problems.push(`${relPath}: <time datetime="${dt}"> must be a real YYYY-MM-DD date`);
    } else if (firstDay && lastDay && (dt < firstDay || dt > lastDay)) {
      problems.push(`${relPath}: <time datetime="${dt}"> is outside the event's dates (${firstDay} to ${lastDay})`);
    }
  }

  // Update sign-up links (#participant-updates) must name their event with
  // data-event: the modal's title and email subject use it.
  for (const [tag] of content.matchAll(/<a\b[^>]*href="#participant-updates"[^>]*>/g)) {
    if (!attrOf(tag, 'data-event')) {
      problems.push(`${relPath}: a #participant-updates link needs data-event="[EVENT NAME]"`);
    }
  }

  // Live leaderboards (components/Leaderboard.tsx): a data-src, once set,
  // must be a published Google Sheet CSV (the only source the production
  // Content-Security-Policy in app/layout.tsx lets the page fetch), and
  // data-sort can only be asc or desc. The link must be the tab's published
  // CSV (…/spreadsheets/d/e/…/pub?…output=csv): an /edit or /pubhtml link
  // loads a web page the board can't read. No two boards share a tab.
  /** @type {Set<string>} */
  const boardSources = new Set();
  for (const tag of tagsWithClass(content, 'div', 'qff-leaderboard')) {
    const src = attrOf(tag, 'data-src') ?? '';
    if (src !== '' && !src.startsWith('https://docs.google.com/')) {
      problems.push(
        `${relPath}: qff-leaderboard data-src must be a published Google Sheet link (https://docs.google.com/…) (got "${src}")`,
      );
    } else if (src !== '' && !/^https:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[^/]+\/pub\?\S*\boutput=csv\b/.test(src)) {
      problems.push(
        `${relPath}: qff-leaderboard data-src must be the tab's published CSV link (File > Share > Publish to web > the tab > Comma-separated values), which ends in output=csv (got "${src}")`,
      );
    }
    if (src !== '' && boardSources.has(src)) {
      problems.push(`${relPath}: two leaderboards use the same data-src; each board needs its own published tab (got "${src}")`);
    }
    if (src !== '') boardSources.add(src);
    const sort = attrOf(tag, 'data-sort');
    if (sort !== undefined && sort !== 'asc' && sort !== 'desc') {
      problems.push(`${relPath}: qff-leaderboard data-sort must be "asc" or "desc" (got "${sort}")`);
    }
  }

  // Fall Fest art (components/Cryostat.tsx, HummingbirdZone.tsx, CloudSky):
  // the cryostat needs its alt text, and bird counts and colors must be ones
  // the components draw.
  for (const tag of tagsWithClass(content, 'div', 'qff-cryostat')) {
    if (!attrOf(tag, 'data-label')) {
      problems.push(`${relPath}: qff-cryostat needs a data-label (its alt text)`);
    }
  }
  for (const tag of tagsWithClass(content, 'span', 'qff-bird-zone')) {
    const birds = attrOf(tag, 'data-birds');
    if (birds !== undefined && !/^[1-4]$/.test(birds)) {
      problems.push(`${relPath}: qff-bird-zone data-birds must be 1–4 (got "${birds}")`);
    }
    const variant = attrOf(tag, 'data-variant');
    if (variant !== undefined && variant !== 'pink' && variant !== 'lavender') {
      problems.push(`${relPath}: qff-bird-zone data-variant must be "pink" or "lavender" (got "${variant}")`);
    }
  }
  if (tagsWithClass(content, 'div', 'qff-page-clouds').length > 1) {
    problems.push(`${relPath}: only one qff-page-clouds per page (each adds a full-screen canvas)`);
  }
  for (const [, count] of content.matchAll(/\bdata-hummingbirds="([^"]*)"/g)) {
    if (!/^[0-3]$/.test(count)) {
      problems.push(`${relPath}: data-hummingbirds must be 0–3 (got "${count}")`);
    }
  }
  for (const [, count] of content.matchAll(/\bdata-soarers="([^"]*)"/g)) {
    if (!/^[0-3]$/.test(count)) {
      problems.push(`${relPath}: data-soarers must be 0–3 (got "${count}")`);
    }
  }

  // Countdowns (components/EventCountdown.tsx): data-target is required and
  // data-end optional, both ISO 8601 with an explicit UTC offset. One that
  // doesn't parse shows "--" forever, or sticks on the live message.
  const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/;
  for (const tag of tagsWithClass(content, 'div', 'event-countdown')) {
    for (const attr of ['data-target', 'data-end']) {
      const value = attrOf(tag, attr);
      if (value === undefined) {
        if (attr === 'data-target') problems.push(`${relPath}: event-countdown needs a data-target`);
      } else if (!ISO_WITH_OFFSET.test(value) || Number.isNaN(Date.parse(value))) {
        problems.push(
          `${relPath}: event-countdown ${attr} "${value}" must be ISO 8601 with a UTC offset, e.g. 2027-10-22T17:00:00-04:00`,
        );
      } else {
        // Its days match the front matter, so new dates can't leave the hero
        // counting down to the old ones.
        const day = attr === 'data-target' ? date : data.end_date;
        if (typeof day === 'string' && isValidIsoDate(day) && value.slice(0, 10) !== day) {
          problems.push(
            `${relPath}: event-countdown ${attr} is on ${value.slice(0, 10)} but the front matter's ${attr === 'data-target' ? '"date"' : '"end_date"'} is ${day}`,
          );
        }
      }
    }
  }

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

  // Content renders raw HTML (rehype-raw) under a CSP that allows inline
  // scripts, so script tags, inline event handlers, and javascript: URLs
  // must never appear in content. Comments are skipped (they hold examples).
  const html = content.replace(/<!--[\s\S]*?-->/g, '');
  if (/<script\b/i.test(html)) {
    problems.push(`${relPath}: <script> is not allowed in content`);
  }
  if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) {
    problems.push(`${relPath}: inline event handlers (onclick= and the like) are not allowed in content`);
  }
  if (/\b(?:href|src)\s*=\s*["']?\s*javascript:/i.test(html)) {
    problems.push(`${relPath}: javascript: URLs are not allowed in content`);
  }

  // path.relative uses backslashes on Windows; normalize before matching.
  const posixPath = relPath.split(path.sep).join('/');

  // Meetings and news have no [slug] routes, so every entry must link out or
  // its card would 404 (see content/README.md).
  if (posixPath.includes('content/events/meetings/')) {
    if (typeof data.external_url !== 'string' || !data.external_url.includes('://')) {
      problems.push(
        `${relPath}: meetings have no detail pages, so "external_url" must be an absolute link (https://…)`
      );
    }
  }
  if (posixPath.includes('content/news/')) {
    if (typeof data.source_url !== 'string' || !data.source_url.includes('://')) {
      problems.push(
        `${relPath}: news entries have no detail pages, so "source_url" must be an absolute link (https://…)`
      );
    }
    if (typeof data.source !== 'string' || !data.source.trim()) {
      problems.push(`${relPath}: news entries need "source" (the outlet shown on the card)`);
    }
  }

  // Same-page links (href="#…") must land on an id in this page. The
  // update sign-up link is handled by the page template, not an id.
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  for (const [, frag] of html.matchAll(/\bhref="#([^"]+)"/g)) {
    if (frag !== 'participant-updates' && !ids.has(frag)) {
      problems.push(`${relPath}: link to "#${frag}" matches no id on the page`);
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

  return { rel: path.relative(CONTENT_ROOT, fullPath).split(path.sep).join('/'), data, content };
}

/**
 * data/*.json: every /images/ or /files/ string value must exist under public/.
 *
 * @param {string[]} problems
 * @returns {number} how many JSON files were checked
 */
function validateDataJson(problems) {
  const dataDir = path.join(REPO_ROOT, 'data');
  let count = 0;
  for (const entry of fs.readdirSync(dataDir)) {
    if (!entry.endsWith('.json')) continue;
    count += 1;
    const relPath = path.relative(REPO_ROOT, path.join(dataDir, entry));
    const raw = fs.readFileSync(path.join(dataDir, entry), 'utf-8');
    try {
      JSON.parse(raw);
    } catch (err) {
      problems.push(`${relPath}: invalid JSON (${err instanceof Error ? err.message : err})`);
      continue;
    }
    checkLocalAssetRefs(raw, relPath, problems);
  }
  return count;
}

// The stylesheet references assets two ways: url(...) values and [src$=],
// [src*=] and [src^=] attribute selectors, which silently stop matching when
// an image is renamed (a .png converted to .webp, say).
/** @param {string[]} problems */
function validateCss(problems) {
  const cssPath = path.join(REPO_ROOT, 'assets', 'css', 'style.css');
  const relPath = path.relative(REPO_ROOT, cssPath);
  const css = fs.readFileSync(cssPath, 'utf-8');

  for (const [, ref] of css.matchAll(/url\(\s*['"]?(\/(?:images|files|fonts)\/[^'")]+)['"]?\s*\)/g)) {
    if (!assetExists(ref)) {
      problems.push(`${relPath}: url() asset "${ref}" not found under public/`);
    }
  }

  /** @type {string[]} */
  const publicFiles = [];
  (function collect(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(fullPath);
      else publicFiles.push(fullPath);
    }
  })(PUBLIC_ROOT);

  // Compare against each file's URL path (/images/x.webp), which is what an
  // img src holds.
  const publicUrls = publicFiles.map((f) => `/${path.relative(PUBLIC_ROOT, f).split(path.sep).join('/')}`);
  /** @type {Record<string, (url: string, v: string) => boolean>} */
  const MATCHERS = {
    '$': (url, v) => url.endsWith(v),
    '*': (url, v) => url.includes(v),
    '^': (url, v) => url.startsWith(v),
  };
  for (const [, op, value] of css.matchAll(/\[src([$*^])=["']([^"']+)["']\]/g)) {
    if (!publicUrls.some((url) => MATCHERS[op](url, value))) {
      problems.push(`${relPath}: [src${op}="${value}"] matches no file under public/`);
    }
  }
}

// Internal links (href="/…") in content and data must point at a page the
// PUBLISHED site has: a static route under app/, or a content page that gets
// its own route (not external, not a draft). A draft page may link to other
// drafts, since both stay local; a published page may not.
/**
 * @param {ParsedPage[]} pages
 * @param {string[]} problems
 */
function validateInternalLinks(pages, problems) {
  const APP_ROOT = path.join(REPO_ROOT, 'app');
  /** @type {Set<string>} */
  const routes = new Set();
  /** @type {string[]} */
  const slugCollections = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'page.tsx') {
        const rel = path.relative(APP_ROOT, dir).split(path.sep).join('/');
        if (rel.endsWith('[slug]')) slugCollections.push(rel.slice(0, -'/[slug]'.length));
        else routes.add(rel === '' ? '/' : `/${rel}/`);
      }
    }
  })(APP_ROOT);

  for (const page of pages) {
    const subdir = path.posix.dirname(page.rel);
    if (slugCollections.includes(subdir) && !externalDestination(page.data) && !isDraft(page.data)) {
      routes.add(`/${subdir}/${path.posix.basename(page.rel, '.md')}/`);
    }
  }

  // /calendar/<page>.ics exists only for a published page with a calendar
  // block (scripts/generate-calendars.mjs); check() skips paths with an extension.
  const calendars = new Set(
    pages.filter((p) => p.data.calendar && !isDraft(p.data)).map((p) => path.posix.basename(p.rel, '.md')),
  );
  /**
   * @param {string} where
   * @param {string} href
   */
  const check = (where, href) => {
    const target = href.split(/[?#]/)[0];
    const ics = /^\/calendar\/([^/]+)\.ics$/.exec(target);
    if (ics && !calendars.has(ics[1])) {
      problems.push(`${where}: link to "${href}" has no calendar block on a published page`);
      return;
    }
    if (target === '' || /^\/(?:images|files)\//.test(target) || path.posix.extname(target)) return;
    const normalized = target.endsWith('/') ? target : `${target}/`;
    if (!routes.has(normalized)) {
      problems.push(`${where}: link to "${href}" has no page on the published site`);
    }
  };
  for (const page of pages) {
    if (isDraft(page.data)) continue;
    const html = page.content.replace(/<!--[\s\S]*?-->/g, '');
    for (const [, href] of html.matchAll(/\bhref="(\/[^"]*)"/g)) check(`content/${page.rel}`, href);
    for (const [, href] of html.matchAll(/\]\((\/[^)\s]*)\)/g)) check(`content/${page.rel}`, href);
  }
  const schedule = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'meeting-schedule.json'), 'utf-8'));
  for (const m of schedule.meetings ?? []) {
    if (typeof m.href === 'string' && m.href.startsWith('/')) check('data/meeting-schedule.json', m.href);
  }
  // Governing Documents rows: a page href (/code-of-conduct/) must resolve;
  // PDF paths have an extension, so check() skips them (a missing PDF shows
  // "Coming soon"). lastUpdated is the page's "Last updated" date.
  const govDocs = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data', 'governing-documents.json'), 'utf-8'));
  for (const doc of govDocs.documents ?? []) {
    if (typeof doc.href === 'string' && doc.href.startsWith('/')) check('data/governing-documents.json', doc.href);
  }
  if (typeof govDocs.lastUpdated !== 'string' || !isValidIsoDate(govDocs.lastUpdated)) {
    problems.push(`data/governing-documents.json: "lastUpdated" must be YYYY-MM-DD (got "${govDocs.lastUpdated}")`);
  }
  // The PDFs themselves. A name that matches only when case is ignored works
  // on a Mac (its disk ignores case) but not in the Linux build, which then
  // shows "Coming soon" or a 404, so that fails here. A PDF no row names is
  // probably a misnamed upload (…Bylaws.pdf.pdf), so that gets a warning.
  const docsDir = path.join(REPO_ROOT, 'public', 'documents');
  const onDisk = fs.existsSync(docsDir) ? fs.readdirSync(docsDir).filter((f) => /\.pdf$/i.test(f)) : [];
  /** @type {string[]} */
  const named = (govDocs.documents ?? [])
    .map((/** @type {{ href?: unknown }} */ d) => d.href)
    .filter((/** @type {unknown} */ h) => typeof h === 'string' && h.startsWith('/documents/') && h.endsWith('.pdf'))
    .map((/** @type {string} */ h) => h.slice('/documents/'.length));
  for (const name of named) {
    const near = onDisk.find((f) => f !== name && f.toLowerCase() === name.toLowerCase());
    if (!onDisk.includes(name) && near) {
      problems.push(`public/documents/${near}: rename it "${name}" exactly; capital letters must match data/governing-documents.json, and the live build is case-sensitive`);
    }
  }
  for (const f of onDisk) {
    if (!named.some((n) => n.toLowerCase() === f.toLowerCase())) {
      console.warn(`[warn] public/documents/${f}: no row in data/governing-documents.json uses it; check its name`);
    }
  }
}

// Files kept out of git (.git/info/exclude, .gitignore) never reach the
// GitHub build, so a published page that uses one passes here and fails
// there. Drafts may use them; that is what the exclude list is for. Skipped
// where git isn't available.
/**
 * @param {ParsedPage[]} pages
 * @param {string[]} problems
 */
function validateCommittable(pages, problems) {
  /** @type {Map<string, string>} */
  const used = new Map(); // public/… path -> first page using it
  for (const page of pages) {
    if (isDraft(page.data)) continue;
    const refs = ASSET_FIELDS.map((f) => page.data[f]).filter((v) => typeof v === 'string' && v.startsWith('/'));
    for (const [ref] of page.content.replace(/<!--[\s\S]*?-->/g, '').matchAll(LOCAL_ASSET_RE)) refs.push(ref);
    for (const ref of refs) {
      const file = `public${decodeURI(ref.split(/[?#]/)[0])}`;
      if (!used.has(file)) used.set(file, `content/${page.rel}`);
    }
  }
  if (used.size === 0) return;
  let out = '';
  try {
    out = execFileSync('git', ['check-ignore', '--stdin'], { cwd: REPO_ROOT, input: [...used.keys()].join('\n'), encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch {
    // Exit 1 means nothing is ignored; any other failure (no git, not a
    // repository) skips the check.
    return;
  }
  for (const file of out.split('\n').filter(Boolean)) {
    problems.push(`${used.get(file)}: uses ${file}, which git ignores (.git/info/exclude or .gitignore), so the live build won't have it; remove its line from the exclude list and commit it`);
  }
}

// The homepage band's FEATURED_EVENT (lib/featured.ts) must name a published,
// listed page; otherwise only next build would notice, after this check.
// featured.ts is TypeScript, so its section and slug are read as text.
/**
 * @param {ParsedPage[]} pages
 * @param {string[]} problems
 */
function validateFeaturedEvent(pages, problems) {
  const relPath = 'lib/featured.ts';
  const src = fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf-8');
  const decl = /export const FEATURED_EVENT\b[\s\S]*?\}\s*\|\s*null\s*=\s*(null|\{[\s\S]*?section:\s*'([^']+)',\s*slug:\s*'([^']+)')/.exec(src);
  if (!decl) {
    problems.push(`${relPath}: couldn't read FEATURED_EVENT's section and slug`);
    return;
  }
  if (decl[1] === 'null') return;
  const [, , section, slug] = decl;
  const page = pages.find((p) => p.rel === `${section}/${slug}.md`);
  if (!page) {
    problems.push(`${relPath}: FEATURED_EVENT points at content/${section}/${slug}.md, which doesn't exist`);
    return;
  }
  if (isDraft(page.data) || isUnlisted(page.data)) {
    problems.push(`${relPath}: FEATURED_EVENT ${section}/${slug} is a draft or unlisted page`);
  }
}

/** @type {string[]} */
const problems = [];
const contentFiles = walkContentFiles(CONTENT_ROOT);
const pages = contentFiles.flatMap((fullPath) => validateFile(fullPath, problems) ?? []);
validateInternalLinks(pages, problems);
validateFeaturedEvent(pages, problems);
validateCommittable(pages, problems);
const files = contentFiles.length;
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
