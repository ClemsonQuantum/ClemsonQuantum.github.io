// @ts-check
/**
 * Builds lib/physics/sky-data.json, the star and constellation-line table
 * behind the Clemson night-sky hero (lib/physics/sky.mjs), from d3-celestial.
 *
 * Inputs (pinned)
 * ------
 * d3-celestial by Olaf Frohn (BSD-3-Clause), commit D3_CELESTIAL_COMMIT
 * (master on 2026-09-30, last changed 2022-07-05). Each file must match its
 * SHA-256 in INPUTS; to move to another commit, update the commit and the
 * hashes together.
 *   data/stars.6.json               5044 stars to V = 6 as GeoJSON points:
 *                                   id = Hipparcos number, properties.mag (V)
 *                                   and properties.bv (B-V as a string, ""
 *                                   when missing); positions from XHIP
 *                                   (Anderson & Francis 2012) at J2000
 *   data/stars.8.json               the same to V = 8.5 (41411 stars; stars.6
 *                                   is an exact subset), read only for line
 *                                   vertices that stars.6 lacks (Mira)
 *   data/constellations.lines.json  89 MultiLineStrings (Serpens in two
 *                                   parts) whose vertices are star positions
 *   LICENSE                         the BSD-3-Clause notice, embedded in meta
 * Download them into scripts/.sky-cache/ (not committed; add it to
 * .gitignore if it lives in the working tree):
 *   mkdir -p scripts/.sky-cache
 *   for f in data/stars.6.json data/stars.8.json data/constellations.lines.json LICENSE; do
 *     curl -fsSL -o "scripts/.sky-cache/$(basename "$f")" \
 *       "https://raw.githubusercontent.com/ofrohn/d3-celestial/7e720a3de062059d4c5400a379146a601d9010e0/$f"
 *   done
 * then run
 *   node scripts/build-sky-data.mjs [--stars P] [--stars-deep P] [--lines P] [--license P] [--out P]
 * Paths given on the command line are relative to the current directory;
 * the defaults are scripts/.sky-cache/<file name> and lib/physics/sky-data.json.
 *
 * Steps
 * -----
 * 1. Coordinates. GeoJSON needs longitudes in [-180, 180], so d3-celestial
 *    stores RA from 0 to 12 h as 0 to 180 deg and RA from 12 to 24 h as -180
 *    to 0 deg. Inverting: ra = lon + 360 deg when lon < 0, else lon, which
 *    lands in [0, 360). Dec is the latitude. Check: lon = -90 is RA 270 deg
 *    (18 h), and lon = -180 and 180 are both RA 180 deg (12 h).
 * 2. Selection. Every star with V <= SKY_MAG_LIMIT (5.0), plus every stars.6
 *    star within SKY_DATA_FORMAT.lineMatchDeg (0.05 deg = 3') of a line
 *    vertex, whatever its magnitude, so no figure ends at a missing dot.
 *    Separations come from unit vectors as atan2(|a x b|, a . b), which keeps
 *    full precision at small angles where acos(a . b) loses it. The source's
 *    vertices sit within 0.009 deg of their stars. A vertex with no stars.6
 *    star in reach takes the nearest stars.8 star within the same radius:
 *    only Mira (o Ceti, HIP 10826, V = 6.47 in XHIP, a long-period variable
 *    that swings between about V = 2 and 10). A vertex still unmatched throws.
 * 3. Encoding (SKY_DATA_FORMAT): ra -> round(100 ra) mod 36000,
 *    dec -> round(100 dec), mag -> round(10 mag), B-V -> round(100 B-V) or
 *    999 when missing. Rounding moves a star by at most 0.005 deg per
 *    coordinate (18"), far below a pixel, and a magnitude by at most 0.05.
 * 4. Order. Stars are sorted by (mag, ra, dec, bv) as stored, so the file is
 *    deterministic and any brighter-than cut is a prefix. Lines keep the
 *    source order.
 * 5. Output. { meta, stars, lines }: meta (pretty-printed) records the commit,
 *    the input hashes, the full BSD-3 notice, credits, units and layout; the
 *    integer arrays are written eight stars or one polyline per text line,
 *    compact but diffable. The text is parsed back and compared before it is
 *    written.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { constants as zlibConstants, gzipSync } from 'node:zlib';

import { SKY_DATA_FORMAT, SKY_MAG_LIMIT, equatorialUnit } from '../lib/physics/sky.mjs';

/** d3-celestial commit the inputs come from. */
const D3_CELESTIAL_COMMIT = '7e720a3de062059d4c5400a379146a601d9010e0';
const D3_CELESTIAL_REPO = 'https://github.com/ofrohn/d3-celestial';

/**
 * @typedef {object} InputFile
 * @property {string} repoPath path inside the d3-celestial repository
 * @property {'stars' | 'stars-deep' | 'lines' | 'license'} flag command-line option that overrides the default path
 * @property {string} sha256 pinned hash at D3_CELESTIAL_COMMIT
 */

/** @type {Readonly<Record<'stars' | 'starsDeep' | 'lines' | 'license', InputFile>>} */
const INPUTS = Object.freeze({
  stars: {
    repoPath: 'data/stars.6.json',
    flag: 'stars',
    sha256: '0297b8fa3adfbce1dc26566f61c4abcc1df4f29c6a28729ca06b56d1c6d25602',
  },
  starsDeep: {
    repoPath: 'data/stars.8.json',
    flag: 'stars-deep',
    sha256: 'e3ec6cde89bae0dde064d91c1edb9ec53c3c40d5c12fdf5d30f9a4de5dbc2143',
  },
  lines: {
    repoPath: 'data/constellations.lines.json',
    flag: 'lines',
    sha256: '294f66bef5d5cf50b1e17f16d2efa1d97a15131612c68dd935adef6e7373e13c',
  },
  license: {
    repoPath: 'LICENSE',
    flag: 'license',
    sha256: 'a8c79239001ad4bea243d1796b85084e1fc39309c5c5a663930a1b46320254c6',
  },
});

const CREDITS = Object.freeze([
  'Star positions: XHIP (Anderson and Francis 2012) via d3-celestial',
  'Constellation lines: IAU and Sky & Telescope (CC BY 4.0) via d3-celestial',
]);
const STAR_SOURCE =
  'XHIP: An Extended Hipparcos Compilation, E. Anderson and C. Francis, Astronomy Letters 38, 331 (2012), ' +
  'VizieR V/137D; converted to GeoJSON at J2000 by Olaf Frohn (d3-celestial data/stars.6.json, data/stars.8.json)';
const LINE_SOURCE =
  "Alan MacRobert's constellation figures on the IAU constellation charts, produced with Sky & Telescope " +
  'magazine (Roger Sinnott and Rick Fienberg), https://www.iau.org/public/themes/constellations/ ' +
  '(page archived 2022-12-31 at web.archive.org), released under CC BY 4.0, ' +
  'https://creativecommons.org/licenses/by/4.0/. Modified: some lines changed by Olaf Frohn in ' +
  'd3-celestial (data/constellations.lines.json), and vertices rounded to 0.01 deg here.';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = path.join(REPO_ROOT, 'scripts', '.sky-cache');
const DEFAULT_OUT = path.join(REPO_ROOT, 'lib', 'physics', 'sky-data.json');

const DEG = Math.PI / 180;
const FULL_TURN_DEG = 360;
const HALF_TURN_DEG = 180;
const QUARTER_TURN_DEG = 90;
const STARS_PER_TEXT_LINE = 8;
const STEPS = 5;

let stepNo = 0;
/** @param {string} title */
function step(title) {
  stepNo += 1;
  console.log(`[${stepNo}/${STEPS}] ${title}`);
}
/** @param {string} line */
function detail(line) {
  console.log(`        ${line}`);
}

/**
 * @param {boolean} ok
 * @param {string} message
 * @returns {asserts ok}
 */
function check(ok, message) {
  if (!ok) throw new Error(`[build-sky-data] ${message}`);
}

/**
 * One parsed catalog star.
 *
 * @typedef {object} Star
 * @property {number} hip Hipparcos number
 * @property {number} ra right ascension (deg), [0, 360)
 * @property {number} dec declination (deg)
 * @property {number} mag V magnitude
 * @property {number | null} bv B-V, null when missing
 * @property {Float64Array} u J2000 unit vector
 */

/**
 * Read an input, check its pinned hash, return the bytes and the hash.
 *
 * @param {InputFile} input
 * @param {string} file
 * @returns {{ bytes: Buffer, sha256: string }}
 */
function readPinned(input, file) {
  /** @type {Buffer} */
  let bytes;
  try {
    bytes = readFileSync(file);
  } catch (err) {
    throw new Error(
      `[build-sky-data] cannot read ${input.repoPath} at ${file} (${/** @type {Error} */ (err).message}); ` +
        'download the pinned inputs first, see the header of scripts/build-sky-data.mjs',
    );
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  check(
    sha256 === input.sha256,
    `${file}: SHA-256 ${sha256} does not match ${input.repoPath} at d3-celestial ${D3_CELESTIAL_COMMIT} ` +
      `(${input.sha256}); re-download it, or update D3_CELESTIAL_COMMIT and every hash together`,
  );
  return { bytes, sha256 };
}

/**
 * RA in [0, 360) from a GeoJSON longitude in [-180, 180] (header, step 1).
 *
 * @param {number} lon
 * @returns {number}
 */
function raFromLongitude(lon) {
  return lon < 0 ? lon + FULL_TURN_DEG : lon;
}

/**
 * @param {unknown} coords
 * @param {string} where
 * @returns {[number, number]} [ra, dec] in degrees
 */
function readLonLat(coords, where) {
  check(Array.isArray(coords) && coords.length === 2, `${where}: coordinates must be [lon, lat], got ${JSON.stringify(coords)}`);
  const [lon, lat] = /** @type {unknown[]} */ (coords);
  check(
    typeof lon === 'number' && Number.isFinite(lon) && Math.abs(lon) <= HALF_TURN_DEG,
    `${where}: longitude must be a number in [-180, 180], got ${String(lon)}`,
  );
  check(
    typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= QUARTER_TURN_DEG,
    `${where}: latitude must be a number in [-90, 90], got ${String(lat)}`,
  );
  return [raFromLongitude(/** @type {number} */ (lon)), /** @type {number} */ (lat)];
}

/**
 * @param {Buffer} bytes
 * @param {string} name
 * @returns {any[]} the GeoJSON features
 */
function readFeatures(bytes, name) {
  const json = JSON.parse(bytes.toString('utf8'));
  check(json?.type === 'FeatureCollection' && Array.isArray(json.features), `${name}: not a GeoJSON FeatureCollection`);
  return json.features;
}

/**
 * Parse a d3-celestial star file.
 *
 * @param {Buffer} bytes
 * @param {string} name
 * @returns {Star[]}
 */
function parseStars(bytes, name) {
  const seen = new Set();
  return readFeatures(bytes, name).map((f, i) => {
    const where = `${name} feature ${i} (id ${f?.id})`;
    check(Number.isInteger(f?.id) && f.id > 0, `${where}: id must be a positive Hipparcos number`);
    check(!seen.has(f.id), `${where}: duplicate Hipparcos number`);
    seen.add(f.id);
    check(f.geometry?.type === 'Point', `${where}: geometry must be a Point, got ${f.geometry?.type}`);
    const [ra, dec] = readLonLat(f.geometry.coordinates, where);
    const mag = f.properties?.mag;
    check(typeof mag === 'number' && Number.isFinite(mag), `${where}: mag must be a finite number, got ${String(mag)}`);
    const bvRaw = f.properties?.bv;
    const bvText = bvRaw == null ? '' : String(bvRaw).trim();
    const bv = bvText === '' ? null : Number(bvText);
    check(bv === null || Number.isFinite(bv), `${where}: bv must be a number or empty, got ${JSON.stringify(bvRaw)}`);
    return { hip: f.id, ra, dec, mag, bv, u: /** @type {Float64Array} */ (equatorialUnit(ra, dec)) };
  });
}

/**
 * Parse the constellation lines into polylines of [ra, dec] vertices (deg).
 *
 * @param {Buffer} bytes
 * @param {string} name
 * @returns {{ id: string, vertices: [number, number][] }[]} one entry per polyline, source order
 */
function parseLines(bytes, name) {
  /** @type {{ id: string, vertices: [number, number][] }[]} */
  const polylines = [];
  readFeatures(bytes, name).forEach((f, i) => {
    const where = `${name} feature ${i} (${f?.id})`;
    check(typeof f?.id === 'string' && f.id.length > 0, `${where}: id must be a constellation abbreviation`);
    check(f.geometry?.type === 'MultiLineString', `${where}: geometry must be a MultiLineString, got ${f.geometry?.type}`);
    check(Array.isArray(f.geometry.coordinates), `${where}: coordinates must be an array of lines`);
    /** @type {unknown[]} */ (f.geometry.coordinates).forEach((line, j) => {
      check(Array.isArray(line) && line.length >= 2, `${where} line ${j}: needs at least 2 vertices`);
      polylines.push({
        id: f.id,
        vertices: /** @type {unknown[]} */ (line).map((c, k) => readLonLat(c, `${where} line ${j} vertex ${k}`)),
      });
    });
  });
  return polylines;
}

/**
 * Angle between unit vectors (deg), atan2(|a x b|, a . b) (header, step 2).
 *
 * @param {Float64Array} a
 * @param {Float64Array} b
 * @returns {number}
 */
function separationDeg(a, b) {
  const cx = a[1] * b[2] - a[2] * b[1];
  const cy = a[2] * b[0] - a[0] * b[2];
  const cz = a[0] * b[1] - a[1] * b[0];
  return Math.atan2(Math.hypot(cx, cy, cz), a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / DEG;
}

/**
 * Stored integers for a star (header, step 3).
 *
 * @param {Star} s
 * @returns {[number, number, number, number]} [ra, dec, mag, bv]
 */
function encodeStar(s) {
  const { angleScale, magScale, bvScale, bvMissing } = SKY_DATA_FORMAT;
  return [
    Math.round(s.ra * angleScale) % (FULL_TURN_DEG * angleScale),
    Math.round(s.dec * angleScale),
    Math.round(s.mag * magScale),
    s.bv === null ? bvMissing : Math.round(s.bv * bvScale),
  ];
}

/**
 * @param {[number, number]} vertex [ra, dec] (deg)
 * @returns {[number, number]}
 */
function encodeVertex([ra, dec]) {
  const { angleScale } = SKY_DATA_FORMAT;
  return [Math.round(ra * angleScale) % (FULL_TURN_DEG * angleScale), Math.round(dec * angleScale)];
}

/**
 * JSON text: meta indented, star integers eight stars per line, one
 * polyline per line (header, step 5).
 *
 * @param {object} meta
 * @param {number[]} stars
 * @param {number[][]} lines
 * @returns {string}
 */
function serialize(meta, stars, lines) {
  const width = STARS_PER_TEXT_LINE * SKY_DATA_FORMAT.fieldsPerStar;
  const rows = [];
  for (let i = 0; i < stars.length; i += width) rows.push(stars.slice(i, i + width).join(','));
  // Indent meta, but keep arrays of plain numbers (the HIP lists) on one line.
  const metaText = JSON.stringify(meta, null, 2)
    .replace(/\[\s*(-?\d[\d.,\s-]*?)\s*\]/g, (_, body) => `[${body.split(/,\s*/).join(', ')}]`)
    .replace(/\n/g, '\n  ');
  const lineRows = lines.map((l) => `[${l.join(',')}]`);
  return `{\n  "meta": ${metaText},\n  "stars": [\n    ${rows.join(',\n    ')}\n  ],\n  "lines": [\n    ${lineRows.join(',\n    ')}\n  ]\n}\n`;
}

// ---------------------------------------------------------------------------
const { values: args } = parseArgs({
  options: {
    stars: { type: 'string' },
    'stars-deep': { type: 'string' },
    lines: { type: 'string' },
    license: { type: 'string' },
    out: { type: 'string' },
  },
  strict: true,
  allowPositionals: false,
});

/** @param {InputFile} input */
const inputPath = (input) => {
  const given = args[input.flag];
  return typeof given === 'string' ? path.resolve(given) : path.join(CACHE_DIR, path.basename(input.repoPath));
};
const outPath = typeof args.out === 'string' ? path.resolve(args.out) : DEFAULT_OUT;

console.log(`[setup] node ${process.version}; d3-celestial ${D3_CELESTIAL_COMMIT}`);
/** @type {Record<string, string>} */
const fileHashes = {};
/** @type {Partial<Record<keyof typeof INPUTS, Buffer>>} */
const bytesOf = {};
for (const [key, input] of /** @type {[keyof typeof INPUTS, InputFile][]} */ (Object.entries(INPUTS))) {
  const file = inputPath(input);
  const { bytes, sha256 } = readPinned(input, file);
  bytesOf[key] = bytes;
  fileHashes[input.repoPath] = sha256;
  const shown = file.startsWith(REPO_ROOT + path.sep) ? path.relative(REPO_ROOT, file) : file;
  console.log(`[setup] ${input.repoPath.padEnd(31)} ${String(bytes.length).padStart(8)} B  sha256 ${sha256}`);
  console.log(`[setup]   from ${shown}`);
}
/** @param {keyof typeof INPUTS} key */
const bytesFor = (key) => {
  const b = bytesOf[key];
  check(b !== undefined, `input ${key} was not read`);
  return /** @type {Buffer} */ (b);
};

// ---------------------------------------------------------------------------
step('Parse the GeoJSON inputs');
const stars = parseStars(bytesFor('stars'), INPUTS.stars.repoPath);
const deepStars = parseStars(bytesFor('starsDeep'), INPUTS.starsDeep.repoPath);
const polylines = parseLines(bytesFor('lines'), INPUTS.lines.repoPath);
const licenseText = bytesFor('license').toString('utf8').trim();
check(/Redistribution and use in source and binary forms/.test(licenseText), 'LICENSE does not read as a BSD notice');
const vertexCount = polylines.reduce((n, p) => n + p.vertices.length, 0);
detail(`${stars.length} stars in stars.6, ${deepStars.length} in stars.8, ${polylines.length} polylines with ${vertexCount} vertices`);
detail(`${stars.filter((s) => s.bv === null).length} stars.6 entries without B-V; V from ${Math.min(...stars.map((s) => s.mag))} to ${Math.max(...stars.map((s) => s.mag))}`);

// ---------------------------------------------------------------------------
step(`Select V <= ${SKY_MAG_LIMIT} plus every star within ${SKY_DATA_FORMAT.lineMatchDeg} deg of a line vertex`);
/** @type {Map<number, Star>} */
const selected = new Map(stars.filter((s) => s.mag <= SKY_MAG_LIMIT).map((s) => [s.hip, s]));
const brightCount = selected.size;
/** @type {Set<number>} */
const faintLineStars = new Set();
/** @type {Set<number>} */
const deepLineStars = new Set();
let worstNearest = 0;
for (const poly of polylines) {
  for (const [ra, dec] of poly.vertices) {
    const v = /** @type {Float64Array} */ (equatorialUnit(ra, dec));
    let nearest = Number.POSITIVE_INFINITY;
    for (const s of stars) {
      const sep = separationDeg(v, s.u);
      if (sep < nearest) nearest = sep;
      if (sep <= SKY_DATA_FORMAT.lineMatchDeg && !selected.has(s.hip)) {
        selected.set(s.hip, s);
        faintLineStars.add(s.hip);
      }
    }
    if (nearest <= SKY_DATA_FORMAT.lineMatchDeg) {
      worstNearest = Math.max(worstNearest, nearest);
      continue;
    }
    // No stars.6 star in reach: take the nearest stars.8 star within the same radius.
    let best = null;
    let bestSep = Number.POSITIVE_INFINITY;
    for (const s of deepStars) {
      const sep = separationDeg(v, s.u);
      if (sep < bestSep) {
        bestSep = sep;
        best = s;
      }
    }
    check(
      best !== null && bestSep <= SKY_DATA_FORMAT.lineMatchDeg,
      `${poly.id} vertex (${ra}, ${dec}) has no star within ${SKY_DATA_FORMAT.lineMatchDeg} deg ` +
        `(nearest stars.6 ${nearest.toFixed(4)} deg, stars.8 ${bestSep.toFixed(4)} deg)`,
    );
    const star = /** @type {Star} */ (best);
    worstNearest = Math.max(worstNearest, bestSep);
    if (!selected.has(star.hip)) selected.set(star.hip, star);
    deepLineStars.add(star.hip);
    detail(`${poly.id} vertex (${ra}, ${dec}): no stars.6 star within ${nearest.toFixed(3)} deg; stars.8 HIP ${star.hip}, V = ${star.mag}, at ${bestSep.toFixed(5)} deg`);
  }
}
detail(`${brightCount} stars with V <= ${SKY_MAG_LIMIT}, ${faintLineStars.size} fainter stars.6 stars on lines, ${deepLineStars.size} from stars.8`);
detail(`every vertex has a star within ${worstNearest.toFixed(5)} deg (limit ${SKY_DATA_FORMAT.lineMatchDeg})`);

// ---------------------------------------------------------------------------
step('Encode as integers and sort by (mag, ra, dec, bv)');
const encoded = [...selected.values()].map(encodeStar);
encoded.sort((p, q) => p[2] - q[2] || p[0] - q[0] || p[1] - q[1] || p[3] - q[3]);
const starInts = encoded.flat();
const lineInts = polylines.map((p) => p.vertices.flatMap(encodeVertex));
const missingBv = encoded.filter((e) => e[3] === SKY_DATA_FORMAT.bvMissing).length;
detail(`${encoded.length} stars, V from ${encoded[0][2] / SKY_DATA_FORMAT.magScale} to ${encoded[encoded.length - 1][2] / SKY_DATA_FORMAT.magScale}; ${missingBv} without B-V (stored ${SKY_DATA_FORMAT.bvMissing})`);

// ---------------------------------------------------------------------------
step('Serialize and check the round trip');
const meta = {
  source: `d3-celestial by Olaf Frohn, ${D3_CELESTIAL_REPO}`,
  commit: D3_CELESTIAL_COMMIT,
  files: fileHashes,
  license: licenseText,
  credits: CREDITS,
  starSource: STAR_SOURCE,
  lineSource: LINE_SOURCE,
  magLimit: SKY_MAG_LIMIT,
  units: {
    ra: 'centidegrees of J2000 right ascension, 0 <= ra < 36000',
    dec: 'centidegrees of J2000 declination, -9000 <= dec <= 9000',
    mag: 'tenths of a V magnitude (XHIP)',
    bv: `hundredths of a magnitude of B-V; ${SKY_DATA_FORMAT.bvMissing} = missing (decodeSkyData reads ${SKY_DATA_FORMAT.bvMissingAs})`,
  },
  layout: {
    stars: 'flat [ra, dec, mag, bv] per star, sorted by mag, then ra, then dec',
    lines:
      'one flat [ra, dec, ra, dec, ...] array per polyline, in source order; join the vertices along great ' +
      'circles (decodeSkyData), never by interpolating ra and dec',
  },
  format: SKY_DATA_FORMAT,
  count: encoded.length,
  lineCount: lineInts.length,
  lineVertexCount: vertexCount,
  faintLineStars: [...faintLineStars].sort((p, q) => p - q),
  deepLineStars: [...deepLineStars].sort((p, q) => p - q),
  generator: 'scripts/build-sky-data.mjs',
};
const text = serialize(meta, starInts, lineInts);
assert.deepEqual(JSON.parse(text), JSON.parse(JSON.stringify({ meta, stars: starInts, lines: lineInts })), 'serialized JSON does not parse back to the same data');
detail(`${text.length} characters; JSON.parse round trip identical`);

// ---------------------------------------------------------------------------
step(`Write ${path.relative(REPO_ROOT, outPath)}`);
writeFileSync(outPath, text);
const raw = Buffer.byteLength(text);
const gzDefault = gzipSync(text).length;
const gzBest = gzipSync(text, { level: zlibConstants.Z_BEST_COMPRESSION }).length;
detail(`${raw} B raw (${(raw / 1024).toFixed(1)} KiB), gzip ${gzDefault} B (${(gzDefault / 1024).toFixed(1)} KiB), gzip -9 ${gzBest} B`);
detail(`sha256 ${createHash('sha256').update(text).digest('hex')}`);
console.log(`[done]  ${encoded.length} stars and ${lineInts.length} polylines written.`);
