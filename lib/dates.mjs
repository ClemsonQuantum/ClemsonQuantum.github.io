// @ts-check
// Date helpers shared by the site and the pre-build scripts
// (generate-search-index.mjs). Dependency-free on purpose: client components
// import it, so nothing heavy may come in here.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "2024-08" -> "Aug 2024". Spelled out from a fixed table rather than
 * toLocaleDateString: ICU versions disagree on short month names ("Sep" vs
 * "Sept"). Throws on anything but YYYY-MM so a typo in the data fails the
 * build instead of rendering garbage.
 *
 * @param {string} month
 * @returns {string}
 */
export function formatMonth(month) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!match) throw new Error(`Expected a YYYY-MM month, got "${month}"`);
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

/**
 * "2024-08", "2026-10" -> "Aug 2024 – Oct 2026"; throws if end precedes start.
 *
 * @param {string} start YYYY-MM
 * @param {string} end YYYY-MM
 * @returns {string}
 */
export function formatMonthRange(start, end) {
  const range = `${formatMonth(start)} – ${formatMonth(end)}`;
  if (end < start) throw new Error(`Range ends before it starts: ${range}`);
  return range;
}

/**
 * "2026-11-24" -> "November 24, 2026". Read as UTC so the day can't shift
 * with the machine's time zone.
 *
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  const d = new Date(dateStr);
  // Non-ISO placeholders like "TBD" would otherwise render "Invalid Date".
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * "2026-11-24" -> "Nov 24". String math from the fixed table, so every build
 * machine prints the same thing.
 *
 * @param {string} iso YYYY-MM-DD
 * @returns {string}
 */
export function formatShortDate(iso) {
  const match = /^\d{4}-(0[1-9]|1[0-2])-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Expected a YYYY-MM-DD date, got "${iso}"`);
  return `${MONTHS[Number(match[1]) - 1]} ${Number(match[2])}`;
}

/**
 * Today's date in Clemson (America/New_York) as YYYY-MM-DD. UTC would make
 * a build after 8 PM Eastern flip events to past early.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function todayInClemson(now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
