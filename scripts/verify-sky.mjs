// @ts-check
/**
 * Verification for lib/physics/sky.mjs and lib/physics/sky-data.json, the
 * real sky over Clemson behind the SC Quantathon v4 hero. Run with
 * `node scripts/verify-sky.mjs`; it needs no network, runs every check, and
 * exits non-zero if any fails.
 *
 * Checks (tolerances in brackets)
 *   1. Sidereal time vs Meeus Examples 12.a, 12.b and 13.b: apparent and
 *      mean [0.05 s], the mean through the equation of the equinoxes; one
 *      turn per SIDEREAL_DAY_S; siderealSpeedup.
 *   2. horizonMatrix and ofDateToJ2000Matrix are proper rotations, and their
 *      product has the north, west and zenith rows derived in sky.mjs header
 *      step 2c at LAST = GAST + longitude, at the pole and the equator too [1e-12].
 *   3. Venus from the US Naval Observatory vs Meeus Example 13.b: altitude
 *      and azimuth from an apparent place of date, taken to J2000 and back
 *      through horizonMatrix [0.002 deg].
 *   4. Vega's culmination and Polaris's daily circle at Clemson against
 *      spherical astronomy written out below (Meeus 12.4 sidereal time and
 *      21.2-21.4 precession, themselves checked against Meeus 12.a and 21.b),
 *      independent of astronomy-engine [0.05 deg; Polaris 1 deg and 0.01 deg].
 *   5. The chart: fixed points and orientation, r = tan(zeta / 2), NaN below
 *      the horizon, conformality (singular values equal [1e-9]), circles to
 *      circles, diurnal motion counterclockwise and closed after a sidereal day.
 *   6. bvToTemperature: the Sun [5778 +- 20 K], B-V = 0, monotonic, clamped.
 *   7. magnitudeFlux and starDot: 100 per 5 mag [1e-12], clamps,
 *      monotonic, drawn light proportional to flux through the fade.
 *   8. subdivideGreatCircle: exact ends, unit length, even spacing within
 *      maxDeg, on the great circle.
 *   9. lib/physics/sky-data.json: counts, the magnitude cut, Polaris and
 *      Sirius, every line vertex on a stored star, provenance; decodeSkyData.
 *  10. Failure modes throw RangeError with diagnostics.
 * Random inputs come from a seeded generator (SEED), printed at [setup].
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BV_RANGE,
  CLEMSON,
  DEFAULT_STAR_STYLE,
  LINE_SUBDIVIDE_DEG,
  SIDEREAL_DAY_S,
  SKY_DATA_FORMAT,
  SKY_MAG_LIMIT,
  bvToTemperature,
  decodeSkyData,
  equatorialUnit,
  greenwichSiderealTime,
  horizonMatrix,
  magnitudeFlux,
  ofDateToJ2000Matrix,
  siderealSpeedup,
  starDot,
  stereoFromHorizon,
  subdivideGreatCircle,
} from '../lib/physics/sky.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = path.join(REPO_ROOT, 'lib', 'physics', 'sky-data.json');

const SEED = 20260930;
const DEG = Math.PI / 180;
const ARCSEC = DEG / 3600;
const SECONDS_PER_HOUR = 3600;
const MS_PER_S = 1000;
const MS_PER_DAY = 86400000;
const JD_UNIX_EPOCH = 2440587.5;
const JD_J2000 = 2451545.0;
const DAYS_PER_CENTURY = 36525;
const DAYS_PER_YEAR = 365.25;
const DEG_PER_HOUR = 15;
const EXACT = 1e-12;

/** @typedef {[number, number, number]} V3 */

/**
 * @param {number} h
 * @param {number} m
 * @param {number} s
 * @returns {number} hours
 */
const hms = (h, m, s) => h + m / 60 + s / SECONDS_PER_HOUR;
/**
 * @param {1 | -1} sign
 * @param {number} d
 * @param {number} m
 * @param {number} s
 * @returns {number} degrees
 */
const dms = (sign, d, m, s) => sign * (d + m / 60 + s / SECONDS_PER_HOUR);
/** @param {number} x @returns {number} x wrapped to [0, 360) */
const mod360 = (x) => ((x % 360) + 360) % 360;
/** @param {number} x @returns {number} x wrapped to (-12, 12] (hours) */
const wrapHours = (x) => x - 24 * Math.ceil((x - 12) / 24);
/** @param {number} x @returns {number} x wrapped to (-180, 180] (degrees) */
const wrap180 = (x) => x - 360 * Math.ceil((x - 180) / 360);
/** @param {number} hours @returns {string} */
function fmtHms(hours) {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = (hours - h - m / 60) * SECONDS_PER_HOUR;
  return `${h}h${String(m).padStart(2, '0')}m${s.toFixed(4).padStart(7, '0')}s`;
}
/** @param {ArrayLike<number>} M row-major 3x3 @param {ArrayLike<number>} v @returns {V3} */
const mul = (M, v) => [
  M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
  M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
  M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
];
/**
 * Row-major 3x3 product A B.
 *
 * @param {ArrayLike<number>} A
 * @param {ArrayLike<number>} B
 * @returns {number[]}
 */
const matMul = (A, B) =>
  Array.from({ length: 9 }, (_, k) => {
    const i = Math.floor(k / 3);
    const j = k % 3;
    return A[3 * i] * B[j] + A[3 * i + 1] * B[3 + j] + A[3 * i + 2] * B[6 + j];
  });
/**
 * Largest deviation of a row-major 3x3 matrix from a proper rotation:
 * max(|R R^T - I|, |det R - 1|).
 *
 * @param {ArrayLike<number>} R
 * @returns {number}
 */
function rotationError(R) {
  let worst = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const rr = R[3 * i] * R[3 * j] + R[3 * i + 1] * R[3 * j + 1] + R[3 * i + 2] * R[3 * j + 2];
      worst = Math.max(worst, Math.abs(rr - (i === j ? 1 : 0)));
    }
  }
  const det =
    R[0] * (R[4] * R[8] - R[5] * R[7]) - R[1] * (R[3] * R[8] - R[5] * R[6]) + R[2] * (R[3] * R[7] - R[4] * R[6]);
  return Math.max(worst, Math.abs(det - 1));
}
/** @param {ArrayLike<number>} a @param {ArrayLike<number>} b */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** @param {ArrayLike<number>} a @param {ArrayLike<number>} b @returns {V3} */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** @param {ArrayLike<number>} a */
const norm = (a) => Math.hypot(a[0], a[1], a[2]);
/** Angle between unit vectors (deg), atan2(|a x b|, a . b). @param {ArrayLike<number>} a @param {ArrayLike<number>} b */
const sepDeg = (a, b) => Math.atan2(norm(cross(a, b)), dot(a, b)) / DEG;
/** @param {Date} date */
const julianDate = (date) => date.getTime() / MS_PER_DAY + JD_UNIX_EPOCH;
/** @param {Date} date @param {number} seconds */
const addSeconds = (date, seconds) => new Date(date.getTime() + seconds * MS_PER_S);

/**
 * Assert |actual - expected| <= tol, reporting all three numbers.
 *
 * @param {number} actual
 * @param {number} expected
 * @param {number} tol
 * @param {string} what
 */
function near(actual, expected, tol, what) {
  const err = Math.abs(actual - expected);
  assert.ok(err <= tol, `${what}: got ${actual}, expected ${expected}, |diff| = ${err} > tol ${tol}`);
}

/**
 * mulberry32: a small seeded generator, uniform in [0, 1).
 *
 * @param {number} seed
 * @returns {() => number}
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Altitude, azimuths and the hour-angle frame of a horizontal vector
 * (x north, y west, z zenith) seen from latitude phi: with the north, west
 * and zenith rows of sky.mjs header point 2c, cos d sin H = y,
 * cos d cos H = cos phi z - sin phi x, sin d = sin phi z + cos phi x.
 *
 * @param {V3} h
 * @param {number} phiDeg
 */
function horizontal(h, phiDeg) {
  const sp = Math.sin(phiDeg * DEG);
  const cp = Math.cos(phiDeg * DEG);
  return {
    alt: Math.asin(h[2]) / DEG,
    azNorthEast: mod360(Math.atan2(-h[1], h[0]) / DEG),
    azSouthWest: mod360(Math.atan2(h[1], -h[0]) / DEG),
    hourAngle: Math.atan2(h[1], cp * h[2] - sp * h[0]) / DEG,
    dec: Math.asin(sp * h[2] + cp * h[0]) / DEG,
  };
}

// ---------------------------------------------------------------------------
// Spherical astronomy written out from Meeus, independent of astronomy-engine.
// ---------------------------------------------------------------------------

/**
 * Greenwich mean sidereal time, Meeus (12.4):
 * theta0 = 280.46061837 + 360.98564736629 (JD - 2451545) + 0.000387933 T^2 - T^3 / 38710000 deg.
 *
 * @param {Date} date UT
 * @returns {number} degrees in [0, 360)
 */
function meeusGmstDeg(date) {
  const d = julianDate(date) - JD_J2000;
  const T = d / DAYS_PER_CENTURY;
  return mod360(280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - (T * T * T) / 38710000);
}

/**
 * Rigorous precession from J2000 to the mean equator of date, Meeus
 * (21.2)-(21.4) with the starting epoch J2000 (IAU 1976 angles):
 *   zeta  = 2306.2181" t + 0.30188" t^2 + 0.017998" t^3
 *   z     = 2306.2181" t + 1.09468" t^2 + 0.018203" t^3
 *   theta = 2004.3109" t - 0.42665" t^2 - 0.041833" t^3
 *   A = cos d0 sin(a0 + zeta)
 *   B = cos theta cos d0 cos(a0 + zeta) - sin theta sin d0
 *   C = sin theta cos d0 cos(a0 + zeta) + cos theta sin d0
 *   a = atan2(A, B) + z,  d = asin(C).
 *
 * @param {number} alpha0Deg J2000 right ascension (deg)
 * @param {number} delta0Deg J2000 declination (deg)
 * @param {number} jd Julian date of the target equinox
 * @returns {{ alpha: number, delta: number }} degrees, mean equator and equinox of date
 */
function meeusPrecess(alpha0Deg, delta0Deg, jd) {
  const t = (jd - JD_J2000) / DAYS_PER_CENTURY;
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t * t * t) * ARCSEC;
  const z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t * t * t) * ARCSEC;
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t * t * t) * ARCSEC;
  const a0 = alpha0Deg * DEG;
  const d0 = delta0Deg * DEG;
  const A = Math.cos(d0) * Math.sin(a0 + zeta);
  const B = Math.cos(theta) * Math.cos(d0) * Math.cos(a0 + zeta) - Math.sin(theta) * Math.sin(d0);
  const C = Math.sin(theta) * Math.cos(d0) * Math.cos(a0 + zeta) + Math.cos(theta) * Math.sin(d0);
  return { alpha: mod360((Math.atan2(A, B) + z) / DEG), delta: Math.asin(C) / DEG };
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/** @type {[string, () => string[]][]} */
const checks = [];

checks.push(['Sidereal time vs Meeus Examples 12.a, 12.b and 13.b', () => {
  const out = [];
  const TOL_S = 0.05;
  const at0h = new Date(Date.UTC(1987, 3, 10, 0, 0, 0));
  const at1921 = new Date(Date.UTC(1987, 3, 10, 19, 21, 0));
  // Meeus, Astronomical Algorithms, 2nd ed.: 12.a (mean at 0h), 12.b (apparent
  // at 0h with dpsi = -3.788" and eps = 23 deg 26' 36.85"; mean at 19h21m),
  // 13.b (apparent at 19h21m, used for Venus below).
  /** @type {[string, Date, 'mean' | 'apparent', number][]} */
  const REFS = [
    ['12.a mean     1987-04-10 00:00 UT', at0h, 'mean', hms(13, 10, 46.3668)],
    ['12.b apparent 1987-04-10 00:00 UT', at0h, 'apparent', hms(13, 10, 46.1351)],
    ['12.b mean     1987-04-10 19:21 UT', at1921, 'mean', hms(8, 34, 57.0896)],
    ['13.b apparent 1987-04-10 19:21 UT', at1921, 'apparent', hms(8, 34, 56.853)],
  ];
  for (const [label, date, kind, ref] of REFS) {
    const got = greenwichSiderealTime(date)[kind];
    const diff = wrapHours(got - ref) * SECONDS_PER_HOUR;
    assert.ok(Math.abs(diff) <= TOL_S, `${label}: ${fmtHms(got)} vs Meeus ${fmtHms(ref)}, diff ${diff} s > ${TOL_S} s`);
    out.push(`${label}: ${fmtHms(got)}  Meeus ${fmtHms(ref)}  diff ${diff >= 0 ? '+' : ''}${diff.toFixed(4)} s`);
  }
  // The equation of the equinoxes, from astronomy-engine's five-term nutation,
  // vs Meeus's full IAU 1980 series: dpsi cos eps / 15 = -0.2317 s at 0h.
  const ee = greenwichSiderealTime(at0h).equationOfEquinoxes;
  near(ee, -0.2317, 0.02, 'equation of the equinoxes at 1987-04-10 0h (s)');
  out.push(`equation of the equinoxes at 0h: ${ee.toFixed(4)} s  Meeus -0.2317 s (five-term nutation)`);
  // One turn per SIDEREAL_DAY_S. Dates hold whole milliseconds, so compare the
  // advance with the elapsed time actually represented.
  let worstMean = 0;
  let worstApparent = 0;
  for (const start of [at0h, new Date(Date.UTC(2000, 0, 1, 12)), new Date(Date.UTC(2026, 8, 30, 3, 0, 0))]) {
    const end = addSeconds(start, SIDEREAL_DAY_S);
    const elapsed = (end.getTime() - start.getTime()) / MS_PER_S;
    const expect = (24 * elapsed) / SIDEREAL_DAY_S;
    const g0 = greenwichSiderealTime(start);
    const g1 = greenwichSiderealTime(end);
    const dMean = wrapHours(g1.mean - g0.mean - expect) * SECONDS_PER_HOUR;
    const dApp = wrapHours(g1.apparent - g0.apparent - expect) * SECONDS_PER_HOUR;
    worstMean = Math.max(worstMean, Math.abs(dMean));
    worstApparent = Math.max(worstApparent, Math.abs(dApp));
    assert.ok(Math.abs(dMean) <= 1e-3, `mean sidereal time after one SIDEREAL_DAY_S from ${start.toISOString()}: off by ${dMean} s`);
    assert.ok(Math.abs(dApp) <= 0.02, `apparent sidereal time after one SIDEREAL_DAY_S from ${start.toISOString()}: off by ${dApp} s`);
  }
  out.push(`after SIDEREAL_DAY_S = ${SIDEREAL_DAY_S} s: mean back within ${worstMean.toExponential(1)} s, apparent ${worstApparent.toExponential(1)} s (nutation drift)`);
  // siderealSpeedup(1): a real minute at that rate is one sidereal hour.
  const k = siderealSpeedup(1);
  near(k, SIDEREAL_DAY_S / (24 * 60), EXACT, 'siderealSpeedup(1) = SIDEREAL_DAY_S / 1440');
  near(k, 59.836, 1e-3, 'siderealSpeedup(1)');
  near(siderealSpeedup(0), 0, 0, 'siderealSpeedup(0)');
  near(siderealSpeedup(-2), -2 * k, EXACT, 'siderealSpeedup is linear');
  const t0 = new Date(Date.UTC(2026, 8, 30, 3, 0, 0));
  const t1 = addSeconds(t0, 60 * k);
  const advance = wrapHours(greenwichSiderealTime(t1).mean - greenwichSiderealTime(t0).mean);
  near(advance * SECONDS_PER_HOUR, SECONDS_PER_HOUR, 2e-3, 'mean sidereal advance over 60 s x siderealSpeedup(1) (s)');
  out.push(`siderealSpeedup(1) = ${k.toFixed(6)}; 60 s x that advances GMST by ${(advance * SECONDS_PER_HOUR).toFixed(4)} s`);
  return out;
}]);

checks.push(['horizonMatrix: proper rotations with the derived north, west and zenith rows', () => {
  // sky.mjs header step 2c: in the true equator of date, with LAST = GAST + lambda,
  //   n = (-sin phi cos LAST, -sin phi sin LAST, cos phi)
  //   w = (sin LAST, -cos LAST, 0)
  //   z = (cos phi cos LAST, cos phi sin LAST, sin phi),
  // so horizonMatrix (J2000 -> HOR) times ofDateToJ2000Matrix (of date -> J2000)
  // must be the matrix with rows n, w, z.
  const sites = [
    CLEMSON,
    { latitude: 90, longitude: 0, height: 0 },
    { latitude: 0, longitude: 120, height: 0 },
    { latitude: -45, longitude: -70.5, height: 2500 },
  ];
  const dates = [
    new Date(Date.UTC(1987, 3, 10, 19, 21)),
    new Date(Date.UTC(2000, 0, 1, 12)),
    new Date(Date.UTC(2026, 9, 1, 3, 30)),
    new Date(Date.UTC(2050, 5, 21)),
  ];
  let worstRotation = 0;
  let worstRow = 0;
  for (const date of dates) {
    const toJ2000 = ofDateToJ2000Matrix(date);
    worstRotation = Math.max(worstRotation, rotationError(toJ2000));
    const last0 = DEG_PER_HOUR * greenwichSiderealTime(date).apparent;
    for (const site of sites) {
      const H = horizonMatrix(date, site);
      worstRotation = Math.max(worstRotation, rotationError(H));
      const E = matMul(H, toJ2000);
      const L = (last0 + site.longitude) * DEG;
      const phi = site.latitude * DEG;
      const expect = [
        -Math.sin(phi) * Math.cos(L), -Math.sin(phi) * Math.sin(L), Math.cos(phi),
        Math.sin(L), -Math.cos(L), 0,
        Math.cos(phi) * Math.cos(L), Math.cos(phi) * Math.sin(L), Math.sin(phi),
      ];
      for (let k = 0; k < 9; k++) worstRow = Math.max(worstRow, Math.abs(E[k] - expect[k]));
    }
  }
  assert.ok(worstRotation <= EXACT, `not a proper rotation: max(|R R^T - I|, |det R - 1|) = ${worstRotation}`);
  assert.ok(worstRow <= EXACT, `horizonMatrix x ofDateToJ2000Matrix differs from [n; w; z] by ${worstRow}`);
  return [
    `${dates.length} dates x ${sites.length} sites (Clemson, the pole, the equator, 45 S): orthonormal with det +1 to ${worstRotation.toExponential(1)};`,
    `rows equal n, w, z at LAST = 15 GAST + longitude to ${worstRow.toExponential(1)}`,
  ];
}]);

checks.push(['Venus from the USNO vs Meeus Example 13.b', () => {
  const TOL = 0.002;
  const date = new Date(Date.UTC(1987, 3, 10, 19, 21, 0));
  // Meeus 13.b: observer 38 55' 17" N, 77 03' 56" W; Venus apparent place of
  // date alpha = 23h09m16.641s, delta = -6 43' 11.61". Results: A = 68.0337 deg
  // measured westward from the south, h = 15.1249 deg; no refraction
  // (horizonMatrix applies none either).
  const usno = { latitude: dms(1, 38, 55, 17), longitude: -dms(1, 77, 3, 56), height: 0 };
  const alpha = hms(23, 9, 16.641) * DEG_PER_HOUR;
  const delta = dms(-1, 6, 43, 11.61);
  const ofDate = equatorialUnit(alpha, delta);
  const j2000 = mul(ofDateToJ2000Matrix(date), ofDate);
  near(norm(j2000), 1, EXACT, 'EQD -> EQJ keeps unit length');
  const hor = horizontal(mul(horizonMatrix(date, usno), j2000), usno.latitude);
  near(hor.alt, 15.1249, TOL, 'Venus altitude (deg)');
  near(hor.azSouthWest, 68.0337, TOL, 'Venus azimuth from south, westward (deg)');
  near(hor.azNorthEast, mod360(68.0337 + 180), TOL, 'Venus azimuth from north, eastward (deg)');
  near(hor.dec, delta, 1e-9, 'declination of date survives EQD -> EQJ -> HOR (deg)');
  // The hour angle inside horizonMatrix is the one greenwichSiderealTime implies.
  const gast = greenwichSiderealTime(date).apparent;
  near(hor.hourAngle, wrap180(DEG_PER_HOUR * gast + usno.longitude - alpha), 1e-9, 'H = 15 GAST + longitude - alpha (deg)');
  return [
    `h = ${hor.alt.toFixed(5)} deg (Meeus 15.1249), A = ${hor.azSouthWest.toFixed(5)} deg from S westward (Meeus 68.0337),`,
    `A = ${hor.azNorthEast.toFixed(5)} deg from N through E; H = ${hor.hourAngle.toFixed(6)} deg = 15 GAST + longitude - alpha`,
  ];
}]);

checks.push(["Vega's culmination and Polaris's circle at Clemson, independent of astronomy-engine", () => {
  const out = [];
  // Self-checks of the formulas above. Meeus 12.a: 1987-04-10 0h UT, mean 13h10m46.3668s.
  const gmst = meeusGmstDeg(new Date(Date.UTC(1987, 3, 10))) / DEG_PER_HOUR;
  near(wrapHours(gmst - hms(13, 10, 46.3668)) * SECONDS_PER_HOUR, 0, 1e-3, 'Meeus (12.4) reproduces Example 12.a (s)');
  // Meeus 21.b: theta Persei, J2000 2h44m11.986s +49 13' 42.48", proper motion
  // +0.03425 s and -0.0895" per year, to 2028 Nov 13.19 TD (JD 2462088.69):
  // 2h46m11.331s +49 20' 54.54".
  {
    const jd = 2462088.69;
    const years = (jd - JD_J2000) / DAYS_PER_YEAR;
    const a0 = (hms(2, 44, 11.986) + (0.03425 * years) / SECONDS_PER_HOUR) * DEG_PER_HOUR;
    const d0 = dms(1, 49, 13, 42.48) - (0.0895 * years) / SECONDS_PER_HOUR;
    const p = meeusPrecess(a0, d0, jd);
    near(wrapHours(p.alpha / DEG_PER_HOUR - hms(2, 46, 11.331)) * SECONDS_PER_HOUR, 0, 0.002, 'Meeus 21.b right ascension (s)');
    near((p.delta - dms(1, 49, 20, 54.54)) * SECONDS_PER_HOUR, 0, 0.02, 'Meeus 21.b declination (arcsec)');
    out.push(`Meeus formulas reproduce 12.a and 21.b: theta Per ${fmtHms(p.alpha / DEG_PER_HOUR)} ${p.delta.toFixed(6)} deg`);
  }
  const phi = CLEMSON.latitude;
  const day = new Date(Date.UTC(2026, 9, 1));
  // Vega, J2000: 18h36m56.3s, +38 47' 01". Its meridian transit is where the
  // local mean sidereal time equals its RA of date (the equation of the
  // equinoxes, < 1.2 s or 0.005 deg, is left out).
  {
    const TOL = 0.05;
    const a2000 = hms(18, 36, 56.3) * DEG_PER_HOUR;
    const d2000 = dms(1, 38, 47, 1);
    const { alpha, delta } = meeusPrecess(a2000, d2000, julianDate(day));
    const h0 = mod360(meeusGmstDeg(day) + CLEMSON.longitude - alpha);
    const transit = addSeconds(day, ((mod360(360 - h0) / 360.98564736629) * MS_PER_DAY) / MS_PER_S);
    const u = equatorialUnit(a2000, d2000);
    /** @param {Date} t */
    const at = (t) => horizontal(mul(horizonMatrix(t), u), phi);
    const top = at(transit);
    const expectAlt = 90 - Math.abs(phi - delta);
    near(top.alt, expectAlt, TOL, 'Vega altitude at transit vs 90 - |phi - delta| (deg)');
    near(top.hourAngle, 0, TOL, 'Vega hour angle at the computed transit (deg)');
    near(top.azNorthEast > 180 ? top.azNorthEast - 360 : top.azNorthEast, 0, 1, 'Vega culminates due north of the zenith (delta > phi)');
    for (const minutes of [-10, 10]) {
      assert.ok(at(addSeconds(transit, 60 * minutes)).alt < top.alt, `Vega is not at its highest at transit (${minutes} min)`);
    }
    out.push(`Vega transits ${transit.toISOString()}: h = ${top.alt.toFixed(4)} deg, 90 - |phi - delta| = ${expectAlt.toFixed(4)} deg ` +
      `(diff ${(top.alt - expectAlt).toExponential(1)}), H = ${top.hourAngle.toExponential(1)} deg`);
    out.push(`  delta of date: Meeus ${delta.toFixed(5)} deg, horizonMatrix ${top.dec.toFixed(5)} deg (nutation, < 0.003 deg)`);
  }
  // Polaris, J2000: 2h31m49.09s, +89 15' 50.8". Over a day its altitude swings
  // between phi - p and phi + p, p = 90 deg - delta (header of sky.mjs, 2c).
  {
    const a2000 = hms(2, 31, 49.09) * DEG_PER_HOUR;
    const d2000 = dms(1, 89, 15, 50.8);
    const { delta } = meeusPrecess(a2000, d2000, julianDate(day));
    const u = equatorialUnit(a2000, d2000);
    const SAMPLES = 240;
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (let k = 0; k < SAMPLES; k++) {
      const alt = horizontal(mul(horizonMatrix(addSeconds(day, (86400 * k) / SAMPLES)), u), phi).alt;
      assert.ok(Math.abs(alt - phi) <= 1, `Polaris strays ${alt - phi} deg from altitude phi at sample ${k}`);
      lo = Math.min(lo, alt);
      hi = Math.max(hi, alt);
    }
    near((hi + lo) / 2, phi, 0.01, 'Polaris mid-altitude vs latitude (deg)');
    near((hi - lo) / 2, 90 - delta, 0.01, 'Polaris altitude half-range vs polar distance (deg)');
    out.push(`Polaris on 2026-10-01: altitude ${lo.toFixed(4)} to ${hi.toFixed(4)} deg; mid ${((hi + lo) / 2).toFixed(4)} (phi ${phi}), ` +
      `half-range ${((hi - lo) / 2).toFixed(4)} (90 - delta ${(90 - delta).toFixed(4)})`);
  }
  return out;
}]);

checks.push(['Chart: fixed points, orientation, conformality, circles, diurnal motion', () => {
  const out = [];
  const xy = new Float64Array(2);
  /** @param {ArrayLike<number>} v @returns {[number, number]} */
  const proj = (v) => {
    stereoFromHorizon(v, xy);
    return [xy[0], xy[1]];
  };
  assert.deepEqual(proj([0, 0, 1]), [0, 0], 'zenith -> (0, 0)');
  assert.deepEqual(proj([1, 0, 0]), [0, 1], 'north (x = 1) -> Y = 1, up');
  assert.deepEqual(proj([-1, 0, 0]), [0, -1], 'south -> Y = -1, down');
  assert.deepEqual(proj([0, -1, 0]), [-1, 0], 'east (y = -1) -> X = -1, left');
  assert.deepEqual(proj([0, 1, 0]), [1, 0], 'west (y = 1) -> X = 1, right');
  const below = proj([0, 0.6, -0.8]);
  assert.ok(Number.isNaN(below[0]) && Number.isNaN(below[1]), 'below the horizon -> NaN');
  const nan = proj([Number.NaN, 0, Number.NaN]);
  assert.ok(Number.isNaN(nan[0]) && Number.isNaN(nan[1]), 'NaN input -> NaN');
  const packed = new Float64Array(6).fill(7);
  stereoFromHorizon([0, 1, 0], packed, 2);
  assert.deepEqual([...packed], [7, 7, 1, 0, 7, 7], 'offset writes two entries in place');
  for (let k = 0; k < 360; k++) {
    const p = proj([Math.cos(k * DEG), Math.sin(k * DEG), 0]);
    near(Math.hypot(p[0], p[1]), 1, 1e-15, `horizon azimuth ${k} -> radius 1`);
  }
  for (let k = 0; k <= 90; k++) {
    const zeta = k * DEG;
    const p = proj([Math.sin(zeta) * Math.cos(0.7), Math.sin(zeta) * Math.sin(0.7), Math.cos(zeta)]);
    near(Math.hypot(p[0], p[1]), Math.tan(zeta / 2), 1e-15, `r = tan(zeta / 2) at zeta = ${k} deg`);
  }
  out.push('zenith (0, 0); N up, S down, E left, W right; horizon radius 1 and r = tan(zeta / 2) to 1e-15; NaN below');
  // Conformality: Jacobian on the (altitude, azimuth) unit tangents, by
  // central differences along great circles with Richardson extrapolation.
  const rand = mulberry32(SEED);
  const POINTS = 2000;
  const H_STEP = 1e-3;
  let worstRatio = 0;
  let worstScale = 0;
  /** @param {V3} v @param {V3} e @param {number} s @returns {V3} */
  const along = (v, e, s) => [Math.cos(s) * v[0] + Math.sin(s) * e[0], Math.cos(s) * v[1] + Math.sin(s) * e[1], Math.cos(s) * v[2] + Math.sin(s) * e[2]];
  /** @param {V3} v @param {V3} e @returns {[number, number]} */
  const derivative = (v, e) => {
    /** @param {number} s */
    const central = (s) => {
      const p = proj(along(v, e, s));
      const q = proj(along(v, e, -s));
      return [(p[0] - q[0]) / (2 * s), (p[1] - q[1]) / (2 * s)];
    };
    const d1 = central(H_STEP);
    const d2 = central(H_STEP / 2);
    return [(4 * d2[0] - d1[0]) / 3, (4 * d2[1] - d1[1]) / 3];
  };
  for (let i = 0; i < POINTS; i++) {
    const alt = (1 + 88 * rand()) * DEG;
    const az = 2 * Math.PI * rand();
    /** @type {V3} */
    const v = [Math.cos(alt) * Math.cos(az), Math.cos(alt) * Math.sin(az), Math.sin(alt)];
    /** @type {V3} */
    const eAlt = [-Math.sin(alt) * Math.cos(az), -Math.sin(alt) * Math.sin(az), Math.cos(alt)];
    /** @type {V3} */
    const eAz = [-Math.sin(az), Math.cos(az), 0];
    const [a, c] = derivative(v, eAlt);
    const [b, d] = derivative(v, eAz);
    // J = [[a, b], [c, d]] splits into a conformal part [[p, -q], [q, p]] and an
    // anticonformal part [[r, s], [s, -r]]; its singular values are |C| + |A| and
    // ||C| - |A||. (The textbook root of ||J||_F^4 - 4 det^2 cancels when they
    // are nearly equal and would lose half the digits.)
    const conformal = Math.hypot((a + d) / 2, (c - b) / 2);
    const anticonformal = Math.hypot((a - d) / 2, (b + c) / 2);
    const s1 = conformal + anticonformal;
    const s2 = Math.abs(conformal - anticonformal);
    worstRatio = Math.max(worstRatio, s1 / s2 - 1);
    worstScale = Math.max(worstScale, Math.abs(s1 * (1 + v[2]) - 1));
    // e_az x e_alt = +v points outward, so (e_az, e_alt) is right-handed seen
    // from outside the sphere; a chart of the sky seen from inside reverses it.
    assert.ok(b * c - a * d < 0, `the chart should mirror the outside view: det J(e_az, e_alt) = ${b * c - a * d}`);
  }
  assert.ok(worstRatio <= 1e-9, `conformality: singular value ratio - 1 = ${worstRatio}`);
  assert.ok(worstScale <= 1e-9, `scale 1 / (1 + z): relative error ${worstScale}`);
  out.push(`${POINTS} points (seed ${SEED}): sigma1 / sigma2 - 1 <= ${worstRatio.toExponential(1)}, |sigma (1 + z) - 1| <= ${worstScale.toExponential(1)}`);
  // Circles on the sphere map to circles: fit the circumcircle of three
  // projected points and measure every other point against it.
  const CIRCLES = 200;
  const PER_CIRCLE = 64;
  let worstCircle = 0;
  for (let i = 0; i < CIRCLES; i++) {
    const rho = (1 + 29 * rand()) * DEG;
    const alt = rho + 0.5 * DEG + (89 * DEG - rho) * rand();
    const az = 2 * Math.PI * rand();
    /** @type {V3} */
    const c = [Math.cos(alt) * Math.cos(az), Math.cos(alt) * Math.sin(az), Math.sin(alt)];
    /** @type {V3} */
    const e1 = [-Math.sin(alt) * Math.cos(az), -Math.sin(alt) * Math.sin(az), Math.cos(alt)];
    const e2 = cross(c, e1);
    const pts = [];
    for (let k = 0; k < PER_CIRCLE; k++) {
      const t = (2 * Math.PI * k) / PER_CIRCLE;
      /** @param {number} j */
      const at = (j) => Math.cos(rho) * c[j] + Math.sin(rho) * (Math.cos(t) * e1[j] + Math.sin(t) * e2[j]);
      pts.push(proj([at(0), at(1), at(2)]));
    }
    const [[ax, ay], [bx, by], [cx, cy]] = [pts[0], pts[PER_CIRCLE / 3 | 0], pts[(2 * PER_CIRCLE) / 3 | 0]];
    const dd = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / dd;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / dd;
    const R = Math.hypot(ax - ux, ay - uy);
    for (const [px, py] of pts) worstCircle = Math.max(worstCircle, Math.abs(Math.hypot(px - ux, py - uy) / R - 1));
  }
  assert.ok(worstCircle <= 1e-9, `circles: a projected point leaves the fitted circle by ${worstCircle} (relative)`);
  out.push(`${CIRCLES} small circles (1 to 30 deg) x ${PER_CIRCLE} points stay on their image circles to ${worstCircle.toExponential(1)}`);
  // Diurnal motion: circumpolar stars (delta > 90 - phi) trace closed,
  // counterclockwise loops around the pole on the chart over a sidereal day.
  const start = new Date(Date.UTC(2026, 9, 1));
  const STEPS_PER_DAY = 144;
  const M = new Float64Array(9);
  let worstGap = 0;
  let smallestArea = Number.POSITIVE_INFINITY;
  for (const dec of [60, 75, 89]) {
    for (const ra of [0, 120, 240]) {
      const u = equatorialUnit(ra, dec);
      /** @type {[number, number][]} */
      const path = [];
      for (let k = 0; k <= STEPS_PER_DAY; k++) {
        horizonMatrix(addSeconds(start, (SIDEREAL_DAY_S * k) / STEPS_PER_DAY), CLEMSON, M);
        const p = proj(mul(M, u));
        assert.ok(Number.isFinite(p[0]), `circumpolar star (${ra}, ${dec}) went below the horizon`);
        path.push(p);
      }
      const gap = Math.hypot(path[0][0] - path[STEPS_PER_DAY][0], path[0][1] - path[STEPS_PER_DAY][1]);
      worstGap = Math.max(worstGap, gap);
      let area = 0;
      for (let k = 0; k < STEPS_PER_DAY; k++) area += 0.5 * (path[k][0] * path[k + 1][1] - path[k + 1][0] * path[k][1]);
      assert.ok(area > 0, `star (${ra}, ${dec}) runs clockwise on the chart (signed area ${area})`);
      smallestArea = Math.min(smallestArea, area);
    }
  }
  assert.ok(worstGap <= 1e-5, `a circumpolar loop fails to close after SIDEREAL_DAY_S: gap ${worstGap}`);
  out.push(`circumpolar stars loop counterclockwise (smallest signed area ${smallestArea.toExponential(2)}) and close to ${worstGap.toExponential(1)} after SIDEREAL_DAY_S`);
  return out;
}]);

checks.push(['bvToTemperature: Ballesteros (2012) Eq. 14', () => {
  const sun = bvToTemperature(0.65);
  near(sun, 5778, 20, 'the Sun, B-V = 0.65 (K)');
  const white = bvToTemperature(0);
  assert.ok(white >= 9500 && white <= 10700, `B-V = 0 should land near 10,000 K, got ${white}`);
  const GRID = 2400;
  let prev = Number.POSITIVE_INFINITY;
  for (let k = 0; k <= GRID; k++) {
    const T = bvToTemperature(BV_RANGE[0] + ((BV_RANGE[1] - BV_RANGE[0]) * k) / GRID);
    assert.ok(Number.isFinite(T) && T > 0 && T < prev, `not strictly decreasing at grid point ${k}: ${T} after ${prev}`);
    prev = T;
  }
  const [lo, hi] = BV_RANGE;
  assert.equal(bvToTemperature(lo - 0.6), bvToTemperature(lo), 'clamped below BV_RANGE');
  assert.equal(bvToTemperature(-0.674), bvToTemperature(lo), 'clamped at the pole of the fit (B-V = -0.674)');
  assert.equal(bvToTemperature(hi + 1.3), bvToTemperature(hi), 'clamped above BV_RANGE');
  near(bvToTemperature(lo), 21707, 1, 'T at B-V = -0.4 (K)');
  near(bvToTemperature(hi), 3169, 1, 'T at B-V = 2.0 (K)');
  const table = [-0.4, -0.2, 0, 0.3, 0.6, 0.65, 1, 1.5, 2].map((b) => `${b}: ${Math.round(bvToTemperature(b))} K`);
  return [
    `Sun (0.65) ${sun.toFixed(1)} K; B-V 0 -> ${white.toFixed(1)} K; strictly decreasing on ${GRID + 1} points; clamped outside [${lo}, ${hi}]`,
    `B-V -> T: ${table.join(', ')}`,
  ];
}]);

checks.push(['magnitudeFlux and starDot', () => {
  assert.equal(magnitudeFlux(0), 1, 'flux of magnitude 0');
  near(magnitudeFlux(1), 10 ** -0.4, 1e-15, 'one magnitude = 10^-0.4');
  let worst = 0;
  for (let m = -2; m <= 10; m += 0.25) worst = Math.max(worst, Math.abs(magnitudeFlux(m) / magnitudeFlux(m + 5) / 100 - 1));
  assert.ok(worst <= 1e-12, `5 magnitudes should be a factor 100 in flux; worst relative error ${worst}`);
  const custom = Object.freeze({ refMag: 1.5, refRadius: 1.2, rMin: 0.8, rMax: 4, alphaMin: 0.05 });
  for (const style of [DEFAULT_STAR_STYLE, custom]) {
    let prev = { r: Number.POSITIVE_INFINITY, alpha: 1, light: Number.POSITIVE_INFINITY };
    for (let k = 0; k <= 1000; k++) {
      const m = -2 + k * 0.01;
      const { r, alpha } = starDot(m, style);
      const light = alpha * r * r;
      assert.ok(r >= style.rMin && r <= style.rMax, `r = ${r} outside [${style.rMin}, ${style.rMax}] at m = ${m}`);
      assert.ok(alpha >= style.alphaMin && alpha <= 1, `alpha = ${alpha} outside [${style.alphaMin}, 1] at m = ${m}`);
      assert.ok(r <= prev.r && alpha <= prev.alpha && light <= prev.light * (1 + EXACT), `starDot not monotone at m = ${m}`);
      const rFree = style.refRadius * 10 ** (-0.2 * (m - style.refMag));
      if (rFree >= style.rMin && rFree <= style.rMax) near(r, rFree, EXACT * rFree, `r follows area ~ flux at m = ${m}`);
      if (rFree < style.rMin && alpha > style.alphaMin) {
        const expectLight = style.refRadius ** 2 * magnitudeFlux(m - style.refMag);
        near(light, expectLight, EXACT * expectLight, `drawn light ~ flux through the fade at m = ${m}`);
      }
      prev = { r, alpha, light };
    }
    const atRef = starDot(style.refMag, style);
    near(atRef.r, style.refRadius, EXACT, 'r(refMag) = refRadius');
    assert.equal(atRef.alpha, 1, 'alpha(refMag) = 1');
  }
  const shown = [-1.44, 0, 1, 2, 3, 4, 5, 6.47].map((m) => {
    const { r, alpha } = starDot(m);
    return `${m}: r ${r.toFixed(2)} a ${alpha.toFixed(2)}`;
  });
  return [`100 per 5 mag to ${worst.toExponential(1)}; monotone, clamped, light ~ flux through the fade (two styles)`, `DEFAULT_STAR_STYLE ${shown.join(', ')}`];
}]);

checks.push(['subdivideGreatCircle', () => {
  const quarter = subdivideGreatCircle([1, 0, 0], [0, 1, 0], 30);
  assert.equal(quarter.length, 12, 'x -> y in 30 deg steps: 4 points');
  for (let k = 0; k < 4; k++) {
    near(quarter[3 * k], Math.cos(k * 30 * DEG), 1e-15, `point ${k} x`);
    near(quarter[3 * k + 1], Math.sin(k * 30 * DEG), 1e-15, `point ${k} y`);
    assert.equal(quarter[3 * k + 2], 0, `point ${k} z`);
  }
  assert.equal(subdivideGreatCircle([0, 0, 1], [0, 0, 1], 2).length, 6, 'a = b gives the two endpoints');
  assert.equal(subdivideGreatCircle([1, 0, 0], [Math.cos(DEG), Math.sin(DEG), 0], 2).length, 6, 'theta <= maxDeg gives the two endpoints');
  const rand = mulberry32(SEED + 1);
  const PAIRS = 500;
  let worstUnit = 0;
  let worstPlane = 0;
  let worstEven = 0;
  for (let i = 0; i < PAIRS; i++) {
    const a = equatorialUnit(360 * rand(), Math.asin(2 * rand() - 1) / DEG);
    const b = equatorialUnit(360 * rand(), Math.asin(2 * rand() - 1) / DEG);
    if (sepDeg(a, b) > 179) continue;
    const maxDeg = [0.5, 2, 7][i % 3];
    const theta = sepDeg(a, b);
    const pts = subdivideGreatCircle(a, b, maxDeg);
    const n = Math.max(1, Math.ceil(theta / maxDeg));
    assert.equal(pts.length, 3 * (n + 1), `pair ${i}: expected ${n + 1} points for ${theta} deg at ${maxDeg}`);
    for (let j = 0; j < 3; j++) {
      assert.equal(pts[j], a[j], `pair ${i}: first point must be a exactly`);
      assert.equal(pts[3 * n + j], b[j], `pair ${i}: last point must be b exactly`);
    }
    const axis = cross(a, b);
    const axisLen = norm(axis);
    let prevAngle = -1;
    for (let k = 0; k <= n; k++) {
      const p = pts.subarray(3 * k, 3 * k + 3);
      worstUnit = Math.max(worstUnit, Math.abs(norm(p) - 1));
      if (axisLen > 1e-6) worstPlane = Math.max(worstPlane, Math.abs(dot(p, axis) / axisLen));
      const ang = sepDeg(a, p);
      assert.ok(ang > prevAngle, `pair ${i}: points do not advance monotonically at ${k}`);
      prevAngle = ang;
      if (k > 0) {
        const gap = sepDeg(pts.subarray(3 * k - 3, 3 * k), p);
        assert.ok(gap <= maxDeg + 1e-9, `pair ${i}: gap ${gap} deg > maxDeg ${maxDeg}`);
        worstEven = Math.max(worstEven, Math.abs(gap - theta / n));
      }
    }
  }
  assert.ok(worstUnit <= EXACT, `points leave the unit sphere by ${worstUnit}`);
  assert.ok(worstPlane <= EXACT, `points leave the great circle by ${worstPlane}`);
  assert.ok(worstEven <= 1e-9, `uneven steps: ${worstEven} deg`);
  return [`${PAIRS} random arcs to 179 deg (seed ${SEED + 1}): ends exact, |p| - 1 <= ${worstUnit.toExponential(1)}, off-plane <= ${worstPlane.toExponential(1)}, steps even to ${worstEven.toExponential(1)} deg`];
}]);

checks.push(['lib/physics/sky-data.json: integrity, provenance, decodeSkyData', () => {
  /**
   * @typedef {object} SkyFile
   * @property {{ commit: string, files: Record<string, string>, license: string, credits: string[],
   *   magLimit: number, format: Record<string, number>, count: number, lineCount: number,
   *   lineVertexCount: number, faintLineStars: number[], deepLineStars: number[] }} meta
   * @property {number[]} stars
   * @property {number[][]} lines
   */
  const json = /** @type {SkyFile} */ (JSON.parse(readFileSync(DATA_PATH, 'utf8')));
  const { meta } = json;
  const F = SKY_DATA_FORMAT;
  assert.match(meta.commit, /^[0-9a-f]{40}$/, 'meta.commit is a full git SHA');
  for (const name of ['data/stars.6.json', 'data/stars.8.json', 'data/constellations.lines.json', 'LICENSE']) {
    assert.match(meta.files[name] ?? '', /^[0-9a-f]{64}$/, `meta.files["${name}"] is a SHA-256`);
  }
  assert.match(meta.license, /^Copyright \(c\) 2015, Olaf Frohn/, 'license names the copyright holder');
  assert.match(meta.license, /Redistribution and use in source and binary forms/, 'license is the BSD text');
  assert.match(meta.license, /3\. Neither the name of the copyright holder/, 'license is the three-clause BSD text');
  assert.ok(meta.credits.some((c) => /XHIP/.test(c)) && meta.credits.some((c) => /Sky & Telescope.*CC BY 4\.0/.test(c)), 'credits name XHIP and IAU / Sky & Telescope (CC BY 4.0)');
  assert.equal(meta.magLimit, SKY_MAG_LIMIT, 'meta.magLimit');
  assert.deepEqual(meta.format, { ...F }, 'meta.format matches SKY_DATA_FORMAT');
  const n = json.stars.length / F.fieldsPerStar;
  assert.ok(Number.isInteger(n) && n === meta.count, `stars hold ${json.stars.length} integers for meta.count ${meta.count}`);
  assert.ok(n >= 1620 && n <= 1720, `star count ${n} outside the expected 1620-1720 (1627 at V <= 5 plus line stars)`);
  assert.ok(json.stars.every(Number.isInteger), 'every stored star value is an integer');
  /** @param {number} i */
  const star = (i) => json.stars.slice(F.fieldsPerStar * i, F.fieldsPerStar * (i + 1));
  for (let i = 1; i < n; i++) {
    const [p, q] = [star(i - 1), star(i)];
    assert.ok(p[2] < q[2] || (p[2] === q[2] && (p[0] < q[0] || (p[0] === q[0] && p[1] <= q[1]))), `stars not sorted by (mag, ra, dec) at ${i}`);
  }
  const units = Array.from({ length: n }, (_, i) => equatorialUnit(star(i)[0] / F.angleScale, star(i)[1] / F.angleScale));
  const vertices = json.lines.flatMap((l) => Array.from({ length: l.length / 2 }, (_, k) => equatorialUnit(l[2 * k] / F.angleScale, l[2 * k + 1] / F.angleScale)));
  assert.equal(json.lines.length, meta.lineCount, 'meta.lineCount');
  assert.equal(vertices.length, meta.lineVertexCount, 'meta.lineVertexCount');
  // Every line vertex has a stored star within lineMatchDeg.
  let worstVertex = 0;
  for (const v of vertices) {
    let best = Number.POSITIVE_INFINITY;
    for (const u of units) best = Math.min(best, sepDeg(u, v));
    worstVertex = Math.max(worstVertex, best);
  }
  assert.ok(worstVertex <= F.lineMatchDeg, `a line vertex is ${worstVertex} deg from the nearest star (limit ${F.lineMatchDeg})`);
  // Stars fainter than the cut must be line stars.
  let faint = 0;
  for (let i = 0; i < n; i++) {
    if (star(i)[2] <= SKY_MAG_LIMIT * F.magScale) continue;
    faint += 1;
    const onLine = vertices.some((v) => sepDeg(units[i], v) <= F.lineMatchDeg);
    assert.ok(onLine, `star ${i} (${star(i).join(', ')}) is fainter than V = ${SKY_MAG_LIMIT} but not on a line`);
  }
  const listed = meta.faintLineStars.length + meta.deepLineStars.length;
  assert.ok(faint <= listed, `${faint} stars fainter than the cut, but meta lists only ${listed} line stars`);
  assert.deepEqual(meta.deepLineStars, [10826], 'only Mira (HIP 10826) comes from stars.8');
  // Landmarks: Polaris (HIP 11767) and Sirius (HIP 32349).
  /** @param {number} ra @param {number} dec */
  const nearest = (ra, dec) => {
    const v = equatorialUnit(ra, dec);
    let best = -1;
    let bestSep = Number.POSITIVE_INFINITY;
    units.forEach((u, i) => {
      const s = sepDeg(u, v);
      if (s < bestSep) [best, bestSep] = [i, s];
    });
    return { i: best, sep: bestSep, mag: star(best)[2] / F.magScale, bv: star(best)[3] };
  };
  const polaris = nearest(37.95, 89.26);
  assert.ok(polaris.sep <= 0.05, `no star within 0.05 deg of Polaris (nearest ${polaris.sep} deg)`);
  near(polaris.mag, 2.0, 0.1, 'Polaris V');
  const sirius = nearest(101.29, -16.72);
  assert.ok(sirius.sep <= 0.05, `no star within 0.05 deg of Sirius (nearest ${sirius.sep} deg)`);
  near(sirius.mag, -1.46, 0.1, 'Sirius V (stored in tenths; XHIP -1.44)');
  assert.equal(sirius.i, 0, 'Sirius is the brightest star, first in the file');
  // decodeSkyData.
  const sky = decodeSkyData(json);
  assert.equal(sky.count, n, 'decoded count');
  assert.equal(sky.lines.length, json.lines.length, 'decoded line count');
  let worstUnit = 0;
  for (let i = 0; i < n; i++) {
    worstUnit = Math.max(worstUnit, Math.abs(norm(sky.stars.subarray(3 * i, 3 * i + 3)) - 1));
    near(sky.mag[i], star(i)[2] / F.magScale, 1e-6, `decoded magnitude ${i}`);
    const expectBv = star(i)[3] === F.bvMissing ? F.bvMissingAs : star(i)[3] / F.bvScale;
    near(sky.bv[i], expectBv, 1e-6, `decoded B-V ${i}`);
    for (let j = 0; j < 3; j++) assert.equal(sky.stars[3 * i + j], units[i][j], `decoded vector ${i}`);
  }
  assert.ok(worstUnit <= EXACT, `decoded stars leave the unit sphere by ${worstUnit}`);
  const missing = json.stars.filter((x, k) => k % F.fieldsPerStar === 3 && x === F.bvMissing).length;
  let worstStep = 0;
  let decodedPoints = 0;
  let vertexAt = 0;
  sky.lines.forEach((line, p) => {
    const count = line.length / 3;
    decodedPoints += count;
    const first = vertices[vertexAt];
    vertexAt += json.lines[p].length / 2;
    const last = vertices[vertexAt - 1];
    for (let j = 0; j < 3; j++) {
      assert.equal(line[j], first[j], `line ${p} starts at its first vertex`);
      assert.equal(line[3 * (count - 1) + j], last[j], `line ${p} ends at its last vertex`);
    }
    for (let k = 1; k < count; k++) worstStep = Math.max(worstStep, sepDeg(line.subarray(3 * k - 3, 3 * k), line.subarray(3 * k, 3 * k + 3)));
  });
  assert.ok(worstStep <= LINE_SUBDIVIDE_DEG + 1e-9, `a decoded line step is ${worstStep} deg > ${LINE_SUBDIVIDE_DEG}`);
  const bright = json.stars.filter((x, k) => k % F.fieldsPerStar === 2 && x <= SKY_MAG_LIMIT * F.magScale).length;
  return [
    `commit ${meta.commit}; BSD-3 text, sha256 of ${Object.keys(meta.files).length} inputs, credits present`,
    `${n} stars (${bright} with stored V <= ${SKY_MAG_LIMIT}, ${faint} fainter, all on lines; meta lists ${meta.faintLineStars.length} + ${meta.deepLineStars.length} line stars); sorted`,
    `Polaris at ${polaris.sep.toFixed(4)} deg, V ${polaris.mag}; Sirius first at ${sirius.sep.toFixed(4)} deg, V ${sirius.mag} (XHIP -1.44, commonly -1.46)`,
    `${json.lines.length} polylines, ${vertices.length} vertices, each within ${worstVertex.toFixed(4)} deg of a star (limit ${F.lineMatchDeg})`,
    `decodeSkyData: ${sky.count} unit vectors (|u| - 1 <= ${worstUnit.toExponential(1)}), ${missing} missing B-V -> ${F.bvMissingAs}, ` +
      `${decodedPoints} line points, steps <= ${worstStep.toFixed(3)} deg`,
  ];
}]);

checks.push(['Failure modes throw RangeError with diagnostics', () => {
  const date = new Date(Date.UTC(2026, 8, 30));
  const bad = new Date(Number.NaN);
  /** @type {[() => unknown, RegExp][]} */
  const cases = [
    [() => horizonMatrix(bad), /valid Date/],
    [() => horizonMatrix(date, { latitude: 91, longitude: 0, height: 0 }), /latitude must lie in \[-90, 90\] deg, got 91/],
    [() => horizonMatrix(date, { latitude: 10, longitude: Number.NaN, height: 0 }), /longitude must be finite/],
    [() => horizonMatrix(date, CLEMSON, new Float64Array(4)), /needs 9 entries, got 4/],
    [() => ofDateToJ2000Matrix(bad), /valid Date/],
    [() => greenwichSiderealTime(bad), /valid Date/],
    [() => equatorialUnit(Number.POSITIVE_INFINITY, 0), /right ascension must be finite/],
    [() => equatorialUnit(10, 90.5), /declination must lie in \[-90, 90\] deg, got 90.5/],
    [() => bvToTemperature(Number.NaN), /B-V must be finite/],
    [() => bvToTemperature(999), /missing-value sentinel/],
    [() => bvToTemperature(9.99), /missing-value sentinel/],
    [() => magnitudeFlux(Number.NaN), /magnitude must be finite/],
    [() => starDot(Number.NaN), /magnitude must be finite/],
    [() => starDot(1, { ...DEFAULT_STAR_STYLE, rMin: 0 }), /rMin must be > 0, got 0/],
    [() => starDot(1, { ...DEFAULT_STAR_STYLE, rMax: 0.1 }), /rMax must be >= rMin/],
    [() => starDot(1, { ...DEFAULT_STAR_STYLE, alphaMin: 1.5 }), /alphaMin must lie in \[0, 1\]/],
    [() => siderealSpeedup(Number.NaN), /rate must be finite/],
    [() => subdivideGreatCircle([1, 0, 0], [-1, 0, 0], 2), /antipodal/],
    [() => subdivideGreatCircle([1, 0, 0], [0, 2, 0], 2), /unit vector, \|b\| = 2/],
    [() => subdivideGreatCircle([1, 0, 0], [0, 1, 0], 0), /maxDeg must be > 0/],
    [() => decodeSkyData(/** @type {any} */ ({ meta: {}, stars: [], lines: [] })), /meta.format is missing/],
    [() => decodeSkyData({ meta: { format: { ...SKY_DATA_FORMAT, angleScale: 10 } }, stars: [], lines: [[0, 0, 1, 1]] }), /angleScale is 10/],
    [() => decodeSkyData({ meta: { format: SKY_DATA_FORMAT }, stars: [1, 2, 3], lines: [[0, 0, 1, 1]] }), /not a multiple of 4/],
    [() => decodeSkyData({ meta: { format: SKY_DATA_FORMAT }, stars: [36000, 0, 10, 50], lines: [[0, 0, 1, 1]] }), /RA 36000 is not an integer/],
    [() => decodeSkyData({ meta: { format: SKY_DATA_FORMAT }, stars: [100, 0, 10, 50], lines: [[0, 0, 1]] }), /even count >= 4/],
  ];
  for (const [fn, pattern] of cases) assert.throws(fn, (err) => err instanceof RangeError && pattern.test(err.message), `expected RangeError matching ${pattern}`);
  return [`${cases.length} bad inputs: invalid dates, sites, angles, colors, styles, rates, arcs and data files`];
}]);

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log(`[setup] node ${process.version}; lib/physics/sky.mjs at Clemson (${CLEMSON.latitude}, ${CLEMSON.longitude}); seed ${SEED}`);
let failed = 0;
checks.forEach(([name, fn], i) => {
  const tag = `[${i + 1}/${checks.length}]`;
  try {
    const lines = fn();
    console.log(`${tag} ${name}: ok`);
    for (const line of lines) console.log(`        ${line}`);
  } catch (err) {
    failed += 1;
    console.error(`${tag} ${name}: FAILED`);
    console.error(err instanceof Error ? err.message : err);
  }
});
if (failed > 0) {
  console.error(`[fail] ${failed} of ${checks.length} checks failed`);
  process.exitCode = 1;
} else {
  console.log(`[done] sky: ${checks.length}/${checks.length} checks passed`);
}
