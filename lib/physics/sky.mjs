// @ts-check
/**
 * The real sky over Clemson for the SC Quantathon v4 hero background: where
 * every naked-eye star and constellation figure stands at a given instant,
 * drawn on a chart of the sky held overhead.
 *
 * Units and conventions
 * ---------------------
 * Angles are degrees in the API (right ascension too, never hours) and
 * radians inside. Instants are JavaScript Dates (UTC). Vectors are unit
 * vectors in one of two right-handed frames:
 *   EQJ  J2000 mean equator and equinox (the ICRS to within 0.03"): x toward
 *        the J2000 vernal equinox (RA 0, Dec 0), z toward the J2000 north
 *        celestial pole, y = z cross x (RA 90 deg). Star catalogs live here.
 *   HOR  the observer's horizon, as in astronomy-engine: x north, y west,
 *        z zenith (x cross y = z). Altitude h = asin(z); azimuth from north
 *        through east A = atan2(-y, x).
 * Matrices are plain row-major Float64Array(9) acting on column vectors:
 * out = M v means out[i] = M[3 i] v[0] + M[3 i + 1] v[1] + M[3 i + 2] v[2].
 * The chart is the horizon plane seen from below: X to the right (west),
 * Y up (north), the zenith at the center and the horizon at radius 1.
 *
 * Derivation
 * ----------
 * 1. Directions (equatorialUnit). A star at right ascension a and
 *    declination d lies along u = (cos d cos a, cos d sin a, sin d): the
 *    equator is z = 0, a turns about z from x toward y, and d tilts toward
 *    z. Limits: (a, d) = (0, 0) gives x; d = 90 deg gives z for every a.
 *
 * 2. Horizon frame (horizonMatrix). astronomy-engine's Rotation_EQJ_HOR
 *    composes three rotations. Its source (precession_rot, nutation_rot and
 *    Rotation_EQD_HOR) reproduces the explicit products below to 1e-16, which
 *    was checked when this module was written; scripts/verify-sky.mjs
 *    re-checks step c through the exported matrices at every run:
 *    a. Precession P, J2000 to the mean equator of date: the four-rotation
 *       form P = R3(chi_A) R1(-omega_A) R3(-psi_A) R1(eps_0), with the IAU
 *       2006 (P03) polynomials of Capitaine, Wallace & Chapront (2003) in TT
 *       centuries and eps_0 = 84381.406". R1 and R3 are frame rotations about
 *       x and z, e.g. R3(t) = [[cos t, sin t, 0], [-sin t, cos t, 0], [0, 0, 1]].
 *    b. Nutation N, mean to true equator of date:
 *       N = R1(-eps_true) R3(-dpsi) R1(eps_mean), with dpsi and deps from the
 *       five largest luni-solar terms of IAU 2000B (McCarthy & Luzum 2003);
 *       each dropped term is under 0.08".
 *    c. Earth rotation and the observer. The zenith of an observer at
 *       latitude phi (geodetic; the deflection of the vertical is ignored)
 *       and east longitude lambda has declination phi and hour angle 0, so
 *       its right ascension in the true equator of date is the local
 *       apparent sidereal time LAST = GAST + lambda:
 *         z = (cos phi cos LAST, cos phi sin LAST, sin phi).
 *       North is the celestial pole p = (0, 0, 1) with its zenith part
 *       removed: p - (p . z) z = cos phi (-sin phi cos LAST,
 *       -sin phi sin LAST, cos phi), which normalizes to
 *         n = (-sin phi cos LAST, -sin phi sin LAST, cos phi).
 *       West completes the right-handed triad, w = z cross n:
 *         w = (sin LAST, -cos LAST, 0),
 *       the point of the equator at hour angle +6 h (RA = LAST - 90 deg),
 *       where stars set. A vector's horizontal components are its
 *       projections, v_HOR = (n . v, w . v, z . v), so
 *         M = [n; w; z] N P      (rows n, w, z),
 *       and each row of M is that horizon direction written in J2000.
 *       The zenith row is the textbook altitude formula (Meeus 13.6)
 *         sin h = sin phi sin d + cos phi cos d cos H,   H = LAST - a,
 *       and the west row is cos d sin H, so a star crosses the meridian
 *       (H = 0) at h = 90 deg - |phi - d|.
 *       GAST = ERA(UT1) + GMST polynomial(TT) + dpsi cos eps_A (the
 *       equation of the equinoxes), the IERS 2003 form. astronomy-engine
 *       takes UT1 = UTC; |UT1 - UTC| < 0.9 s turns the sky by < 0.004 deg.
 *       Limits: phi = 90 deg gives z = (0, 0, 1), so altitude = declination;
 *       phi = 0 puts the pole on the horizon at the north point, n = (0, 0, 1).
 *    Not applied: refraction (it lifts stars by 0.57 deg on the horizon and
 *    by 0.03 deg at 30 deg altitude), aberration (under 0.006 deg), polar
 *    motion, and proper motion after J2000 (under 0.04 deg by 2030 for the
 *    fastest stars here, epsilon Indi and 40 Eridani). On a chart 1000 px
 *    across, 0.05 deg is under half a pixel.
 *
 * 3. Matrix layout. astronomy-engine's RotateVector computes
 *    out_j = sum_i rot[i][j] v_i, so its rot holds the transpose of the
 *    matrix acting on column vectors: M[j][i] = rot[i][j] (rowMajor below).
 *
 * 4. Chart (stereoFromHorizon). Project the sphere from the nadir
 *    S = (0, 0, -1) through v = (x, y, z) onto the horizon plane z = 0:
 *    the line S + s (v - S) reaches z = 0 at s = 1 / (1 + z), at the point
 *    (x, y) / (1 + z). (Projecting onto the tangent plane at the zenith,
 *    z = 1, doubles this; halving it puts the horizon at radius 1.) At
 *    zenith distance zeta, r = sin zeta / (1 + cos zeta) = tan(zeta / 2):
 *    0 at the zenith, 1 on the horizon, infinite at the nadir. The chart
 *    takes X = y / (1 + z) (west to the right) and Y = x / (1 + z) (north
 *    up), the sky as seen lying on your back with your head to the north,
 *    so east is on the left as on any chart held overhead. Swapping the
 *    axes is a reflection: it turns the outside view of a globe into the
 *    inside view of the sky.
 *    Conformality: on the sphere ds^2 = d zeta^2 + sin^2 zeta dA^2. On the
 *    chart the radial scale is dr / d zeta = 1 / (2 cos^2(zeta / 2)) and the
 *    tangential scale is r / sin zeta = tan(zeta / 2) / (2 sin(zeta / 2)
 *    cos(zeta / 2)) = 1 / (2 cos^2(zeta / 2)). They are equal, so angles and
 *    small shapes are kept, at the scale k = 1 / (1 + z): 1/2 at the zenith
 *    and 1 on the horizon (figures near the horizon draw twice as large).
 *    Circles stay circles: the inverse map is v = (2P, 2Q, 1 - rho^2) /
 *    (1 + rho^2) with rho^2 = P^2 + Q^2, and a circle on the sphere,
 *    c . v = k with |c| = 1, becomes
 *      (c_z + k) rho^2 - 2 c_x P - 2 c_y Q + (k - c_z) = 0,
 *    a circle in (P, Q), or a line when it passes through the nadir
 *    (c_z + k = 0). The axis swap keeps circles circles.
 *    Points below the horizon (z < 0) would land outside the unit disc;
 *    they are returned as (NaN, NaN), so the caller skips them with one
 *    test (x !== x, or Number.isNaN).
 *
 * 5. Speed (siderealSpeedup). The sky turns once per sidereal day,
 *    SIDEREAL_DAY_S = 86164.0905 s = 86400 s / 1.00273790935 (Meeus ch. 12),
 *    so one sidereal hour lasts SIDEREAL_DAY_S / 24 = 3590.17 s. Advancing
 *    k sidereal hours per real minute needs the time multiplier
 *      speedup = k (SIDEREAL_DAY_S / 24) / 60 s = 59.836 k.
 *    Limits: k = 0 freezes the sky; k = 1 / 59.836 is real time. (This day
 *    is measured against the equinox; against the stars it is 8.4 ms
 *    longer because of precession, a 1e-7 difference.)
 *
 * 6. Dots (magnitudeFlux, starDot). Pogson's scale: 5 magnitudes are a
 *    factor 100 in flux, so F(m) = 100^(-m / 5) = 10^(-0.4 m) relative to a
 *    magnitude-0 star. A dot whose area pi r^2 is proportional to F has
 *      r(m) = refRadius sqrt(F(m) / F(refMag)) = refRadius 10^(-0.2 (m - refMag)).
 *    r is capped at rMax, where the few brightest stars saturate. Below rMin
 *    a dot would shrink under a pixel and alias, so it keeps r = rMin and
 *    fades instead, alpha = (r(m) / rMin)^2: the drawn light
 *    alpha pi rMin^2 = pi r(m)^2 stays proportional to F, down to the floor
 *    alphaMin. Limits: m = refMag gives r = refRadius (inside the clamps);
 *    each 5 mag fainter divides area x alpha by 100 until a clamp is hit.
 *
 * 7. Colors (bvToTemperature). Ballesteros (2012) averages two two-band
 *    blackbody estimators: one equals T at low temperature but tends to 2 T
 *    at high temperature, the other agrees with it at low temperature and
 *    becomes negligible at high temperature, so their mean tracks T in both
 *    regimes (his Eqs. 8-12). Each estimator is inversely proportional to
 *    ln(I_a / I_b) plus a constant. In the Johnson B and V bands
 *    B - V = -2.5 log10(I_B / I_V) + const, so
 *    ln(I_B / I_V) = -0.4 ln 10 (B - V) + const = -0.921 (B - V) + const,
 *    and each estimator becomes 1 / (0.92 (B - V) + offset). With his
 *    fine-tuned constants (Eq. 14):
 *      T = 4600 K [1 / (0.92 (B-V) + 1.7) + 1 / (0.92 (B-V) + 0.62)].
 *    The Sun, B-V = 0.65, gives 5778 K; B-V = 0 gives 10,125 K. The paper
 *    states no validity range, so the clamp to BV_RANGE = [-0.4, 2.0] is
 *    ours: it spans the colors of normal stars (O stars reach -0.33; red
 *    giants and supergiants about +1.9, Betelgeuse +1.85), stays clear of
 *    the pole at B-V = -0.62 / 0.92 = -0.674 where the second term diverges
 *    (and turns negative beyond it), and catalog values redder than 2.0
 *    belong to carbon stars and reddened long-period variables, whose
 *    spectra are not blackbody-like. The ends map to 21,700 K and 3,170 K.
 *
 * 8. Constellation lines (subdivideGreatCircle). A straight chord between
 *    two stars would not follow the sphere, and interpolating RA and Dec
 *    breaks across RA 0/360 and near the poles, so lines follow great
 *    circles. For unit a, b at angle theta = atan2(|a x b|, a . b) (accurate
 *    at every angle, unlike acos), write b = cos theta a + sin theta e with
 *    e the unit vector perpendicular to a in their plane. The point at arc
 *    length s from a is
 *      cos s a + sin s e = [sin(theta - s) a + sin s b] / sin theta,
 *    spherical linear interpolation (Shoemake 1985), a unit vector because
 *    a and e are orthonormal. n = ceil(theta / maxDeg) equal steps keep
 *    every gap at theta / n <= maxDeg. Limits: s = 0 and s = theta give a
 *    and b (written exactly); theta -> 0 tends to linear interpolation;
 *    theta = 180 deg has no unique great circle and throws.
 *
 * 9. Data (decodeSkyData). lib/physics/sky-data.json, built by
 *    scripts/build-sky-data.mjs from d3-celestial, stores integers (see
 *    SKY_DATA_FORMAT): RA and Dec in centidegrees (J2000), magnitudes in
 *    tenths, B-V in hundredths with 999 for a missing value, decoded as
 *    0.6. Its meta records the source commit, file hashes, license and
 *    credits.
 *
 * References
 * ----------
 * D. Cross, Astronomy Engine 2.1.19 (MIT), https://github.com/cosinekitty/astronomy
 * N. Capitaine, P. T. Wallace & J. Chapront, A&A 412, 567 (2003): P03 precession.
 * D. D. McCarthy & B. J. Luzum, Celest. Mech. Dyn. Astron. 85, 37 (2003): IAU 2000B.
 * J. Meeus, Astronomical Algorithms, 2nd ed. (Willmann-Bell, 1998), ch. 12, 13, 21.
 * F. J. Ballesteros, "New insights into black bodies", EPL 97, 34008 (2012),
 *   arXiv:1201.1809, Eq. 14.
 * N. Pogson, MNRAS 17, 12 (1856): the magnitude scale.
 * K. Shoemake, "Animating rotation with quaternion curves", Computer
 *   Graphics 19(3), 245 (1985).
 * J. P. Snyder, Map Projections: A Working Manual, USGS Professional Paper
 *   1395 (1987): the stereographic projection.
 *
 * Validation: scripts/verify-sky.mjs checks sidereal time and horizontal
 * coordinates against Meeus's worked examples, Vega's culmination and
 * Polaris's daily circle against spherical astronomy written out
 * independently of astronomy-engine, the chart's fixed points, orientation,
 * conformality and circles, the color, flux and dot laws, the great-circle
 * subdivision, and the integrity and provenance of sky-data.json.
 */

import { MakeTime, Observer, Rotation_EQD_EQJ, Rotation_EQJ_HOR, SiderealTime, e_tilt } from 'astronomy-engine';

/**
 * Where the sky is computed: Tillman Hall, Clemson University, Clemson, SC
 * (degrees, meters). Wikidata Q21072763 (NRHP 77001235), coordinate location
 * 34.679868 N, 82.837388 W, retrieved 2026-09-30, rounded to 1e-4 deg
 * (11 m). height is a sea-level placeholder: it does not change any
 * direction computed here.
 */
export const CLEMSON = Object.freeze({ latitude: 34.6799, longitude: -82.8374, height: 0 });

/** Faintest V magnitude kept in sky-data.json, apart from constellation-line stars. */
export const SKY_MAG_LIMIT = 5;

/**
 * B-V interval in which bvToTemperature evaluates Ballesteros's fit; values
 * outside are clamped to its ends (header, point 7).
 */
export const BV_RANGE = /** @type {readonly [number, number]} */ (Object.freeze([-0.4, 2.0]));

/** Mean sidereal day, one turn of the sky against the equinox (s of UT1), header point 5. */
export const SIDEREAL_DAY_S = 86164.0905;

/** decodeSkyData splits constellation lines into great-circle steps no longer than this (deg). */
export const LINE_SUBDIVIDE_DEG = 2;

/**
 * Integer encoding of lib/physics/sky-data.json (header, point 9). The build
 * script copies it into the file's meta.format, and decodeSkyData refuses a
 * file whose format differs.
 */
export const SKY_DATA_FORMAT = Object.freeze({
  /** stored units per degree of RA or Dec (centidegrees) */
  angleScale: 100,
  /** stored units per magnitude (tenths) */
  magScale: 10,
  /** stored units per magnitude of B-V (hundredths) */
  bvScale: 100,
  /** stored B-V when the catalog has none */
  bvMissing: 999,
  /** B-V that decodeSkyData puts in its place: a solar-like white, about 5,970 K */
  bvMissingAs: 0.6,
  /** integers per star: ra, dec, mag, bv */
  fieldsPerStar: 4,
  /** every constellation-line vertex has a stored star within this angle (deg) */
  lineMatchDeg: 0.05,
});

/**
 * A starting style for starDot, for a chart about 1000 px across: magnitude 0
 * has a 2 px radius, Sirius saturates at 3 px, magnitude 2.6 reaches the
 * 0.6 px floor, and magnitude-5 stars draw at 11% opacity. Tune per layout.
 *
 * @type {Readonly<StarStyle>}
 */
export const DEFAULT_STAR_STYLE = Object.freeze({ refMag: 0, refRadius: 2, rMin: 0.6, rMax: 3, alphaMin: 0.1 });

/**
 * @typedef {Float64Array | Float32Array | number[]} NumericArray
 */

/**
 * An observing site (the astronomy-engine Observer fields).
 *
 * @typedef {object} Site
 * @property {number} latitude geodetic latitude (deg, north positive), in [-90, 90]
 * @property {number} longitude east longitude (deg, west negative)
 * @property {number} height above mean sea level (m); no effect on directions
 */

/**
 * Dot style for starDot (header, point 6). Radii are in px.
 *
 * @typedef {object} StarStyle
 * @property {number} refMag magnitude drawn at refRadius
 * @property {number} refRadius radius of a refMag star (px), > 0
 * @property {number} rMin smallest radius drawn (px), > 0; fainter stars fade instead
 * @property {number} rMax largest radius drawn (px), >= rMin
 * @property {number} alphaMin opacity floor for the faintest stars, in [0, 1]
 */

const DEG = Math.PI / 180;
const HOURS_PER_DAY = 24;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;
// Pogson: log10 of the flux ratio per magnitude, since 100^(1/5) = 10^0.4.
const POGSON = 0.4;
// Ballesteros (2012), Eq. 14: T = SCALE [1 / (SLOPE bv + OFFSET_1) + 1 / (SLOPE bv + OFFSET_2)].
const BALLESTEROS_SCALE_K = 4600;
const BALLESTEROS_SLOPE = 0.92;
const BALLESTEROS_OFFSET_1 = 1.7;
const BALLESTEROS_OFFSET_2 = 0.62;
// |B-V| at or above this is the missing-value sentinel read without decoding (999 / 100).
const BV_SENTINEL = SKY_DATA_FORMAT.bvMissing / SKY_DATA_FORMAT.bvScale;
// Inputs to subdivideGreatCircle must be unit vectors to this tolerance.
const UNIT_TOLERANCE = 1e-9;
// |a x b| below this with a . b < 0 means antipodal: no unique great circle.
const ANTIPODAL_SIN = 1e-9;
const MATRIX_SIZE = 9;

/**
 * @param {boolean} ok
 * @param {string} message
 * @returns {asserts ok}
 */
function check(ok, message) {
  if (!ok) throw new RangeError(`[sky] ${message}`);
}

/**
 * @param {Date} date
 * @param {string} where
 */
function checkDate(date, where) {
  check(date instanceof Date && Number.isFinite(date.getTime()), `${where}: need a valid Date, got ${String(date)}`);
}

/**
 * @param {NumericArray} out
 * @param {number} size
 * @param {string} where
 */
function checkOut(out, size, where) {
  check(out != null && out.length >= size, `${where}: output needs ${size} entries, got ${out?.length}`);
}

/**
 * astronomy-engine RotationMatrix to a row-major matrix acting on column
 * vectors (header, point 3): M[j][i] = rot[i][j].
 *
 * @param {number[][]} rot
 * @param {NumericArray} out 9 entries
 * @returns {NumericArray}
 */
function rowMajor(rot, out) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) out[3 * j + i] = rot[i][j];
  }
  return out;
}

/**
 * J2000 unit vector of a direction given by right ascension and declination
 * (header, point 1), written into out[offset .. offset + 2].
 *
 * @param {number} raDeg right ascension (deg), any finite value
 * @param {number} decDeg declination (deg), in [-90, 90]
 * @param {NumericArray} [out] receives x, y, z (default: a new Float64Array(3))
 * @param {number} [offset] index of x in out (default 0)
 * @returns {NumericArray} out
 * @throws {RangeError} for a non-finite RA or a declination outside [-90, 90]
 */
export function equatorialUnit(raDeg, decDeg, out = new Float64Array(3), offset = 0) {
  check(Number.isFinite(raDeg), `equatorialUnit: right ascension must be finite, got ${raDeg}`);
  check(Number.isFinite(decDeg) && Math.abs(decDeg) <= 90, `equatorialUnit: declination must lie in [-90, 90] deg, got ${decDeg}`);
  checkOut(out, offset + 3, 'equatorialUnit');
  const a = raDeg * DEG;
  const d = decDeg * DEG;
  const c = Math.cos(d);
  out[offset] = c * Math.cos(a);
  out[offset + 1] = c * Math.sin(a);
  out[offset + 2] = Math.sin(d);
  return out;
}

/**
 * Rotation from J2000 (EQJ) to the horizon frame (x north, y west, z zenith)
 * of `observer` at `date`, including precession, nutation and the Earth's
 * rotation as astronomy-engine's Rotation_EQJ_HOR (header, point 2). Row i
 * of the result is the north point, the west point and the zenith, in turn,
 * as J2000 unit vectors. No refraction.
 *
 * @param {Date} date the instant (UTC, taken as UT1)
 * @param {Readonly<Site>} [observer] default CLEMSON
 * @param {NumericArray} [out] 9 entries, row-major (default: a new Float64Array(9))
 * @returns {NumericArray} out
 * @throws {RangeError} for an invalid Date, a latitude outside [-90, 90], or
 *   a non-finite longitude or height
 */
export function horizonMatrix(date, observer = CLEMSON, out = new Float64Array(MATRIX_SIZE)) {
  checkDate(date, 'horizonMatrix');
  const { latitude, longitude, height } = observer;
  check(Number.isFinite(latitude) && Math.abs(latitude) <= 90, `horizonMatrix: latitude must lie in [-90, 90] deg, got ${latitude}`);
  check(Number.isFinite(longitude), `horizonMatrix: longitude must be finite, got ${longitude}`);
  check(Number.isFinite(height), `horizonMatrix: height must be finite, got ${height}`);
  checkOut(out, MATRIX_SIZE, 'horizonMatrix');
  return rowMajor(Rotation_EQJ_HOR(MakeTime(date), new Observer(latitude, longitude, height)).rot, out);
}

/**
 * Rotation from the true equator and equinox of date (astronomy-engine's
 * EQD, the frame of apparent RA and Dec in almanacs) to J2000: (N P)^T in
 * the notation of header point 2. For checking against published apparent
 * places (scripts/verify-sky.mjs).
 *
 * @param {Date} date the instant (UTC, taken as UT1)
 * @param {NumericArray} [out] 9 entries, row-major (default: a new Float64Array(9))
 * @returns {NumericArray} out
 * @throws {RangeError} for an invalid Date
 */
export function ofDateToJ2000Matrix(date, out = new Float64Array(MATRIX_SIZE)) {
  checkDate(date, 'ofDateToJ2000Matrix');
  checkOut(out, MATRIX_SIZE, 'ofDateToJ2000Matrix');
  return rowMajor(Rotation_EQD_EQJ(MakeTime(date)).rot, out);
}

/**
 * Greenwich sidereal time.
 *
 * @typedef {object} GreenwichSidereal
 * @property {number} apparent GAST (sidereal hours, in [0, 24))
 * @property {number} mean GMST = GAST - equation of the equinoxes (sidereal hours, in [0, 24))
 * @property {number} equationOfEquinoxes dpsi cos eps_A (s of time)
 */

/**
 * Greenwich apparent and mean sidereal time from astronomy-engine (header,
 * point 2c). GAST is SiderealTime; GMST subtracts the equation of the
 * equinoxes from its nutation model (e_tilt().ee).
 *
 * @param {Date} date the instant (UTC, taken as UT1)
 * @returns {GreenwichSidereal}
 * @throws {RangeError} for an invalid Date
 */
export function greenwichSiderealTime(date) {
  checkDate(date, 'greenwichSiderealTime');
  const time = MakeTime(date);
  const apparent = SiderealTime(time);
  const equationOfEquinoxes = e_tilt(time).ee;
  const mean = apparent - equationOfEquinoxes / SECONDS_PER_HOUR;
  return { apparent, mean: mean - HOURS_PER_DAY * Math.floor(mean / HOURS_PER_DAY), equationOfEquinoxes };
}

/**
 * Chart position of a horizontal unit vector (x north, y west, z zenith):
 * X = y / (1 + z) (west to the right), Y = x / (1 + z) (north up), the
 * stereographic projection from the nadir with the horizon at radius 1
 * (header, point 4). Below the horizon (z < 0, or a NaN input) both outputs
 * are NaN. No input checks: this runs once per star per frame.
 *
 * @param {ArrayLike<number>} v horizontal unit vector, v[0..2]
 * @param {NumericArray} [out] receives X, Y (default: a new Float64Array(2))
 * @param {number} [offset] index of X in out (default 0)
 * @returns {NumericArray} out
 */
export function stereoFromHorizon(v, out = new Float64Array(2), offset = 0) {
  const z = v[2];
  if (z >= 0) {
    const s = 1 / (1 + z);
    out[offset] = v[1] * s;
    out[offset + 1] = v[0] * s;
  } else {
    out[offset] = Number.NaN;
    out[offset + 1] = Number.NaN;
  }
  return out;
}

/**
 * Multiplier of real time that advances the sky by `siderealHoursPerMinute`
 * sidereal hours per real minute (header, point 5): 1 gives 59.836.
 *
 * @param {number} siderealHoursPerMinute finite; 0 freezes, negative runs backward
 * @returns {number} simulated seconds per real second
 * @throws {RangeError} for a non-finite rate
 */
export function siderealSpeedup(siderealHoursPerMinute) {
  check(Number.isFinite(siderealHoursPerMinute), `siderealSpeedup: rate must be finite, got ${siderealHoursPerMinute}`);
  return (siderealHoursPerMinute * SIDEREAL_DAY_S) / (HOURS_PER_DAY * SECONDS_PER_MINUTE);
}

/**
 * Flux relative to a magnitude-0 star, 10^(-0.4 m) (header, point 6).
 *
 * @param {number} m magnitude
 * @returns {number}
 * @throws {RangeError} for a non-finite magnitude
 */
export function magnitudeFlux(m) {
  check(Number.isFinite(m), `magnitudeFlux: magnitude must be finite, got ${m}`);
  return 10 ** (-POGSON * m);
}

/**
 * Dot for a star of magnitude `mag` (header, point 6): area proportional to
 * flux, radius clamped to [rMin, rMax]; below rMin the dot keeps rMin and
 * fades, so the drawn light keeps following the flux down to alphaMin.
 *
 * @param {number} mag magnitude
 * @param {Readonly<StarStyle>} [style] default DEFAULT_STAR_STYLE
 * @returns {{ r: number, alpha: number }} radius (px) and opacity in [alphaMin, 1]
 * @throws {RangeError} for a non-finite magnitude or an invalid style
 */
export function starDot(mag, style = DEFAULT_STAR_STYLE) {
  check(Number.isFinite(mag), `starDot: magnitude must be finite, got ${mag}`);
  const { refMag, refRadius, rMin, rMax, alphaMin } = style;
  check(Number.isFinite(refMag), `starDot: style.refMag must be finite, got ${refMag}`);
  check(Number.isFinite(refRadius) && refRadius > 0, `starDot: style.refRadius must be > 0, got ${refRadius}`);
  check(Number.isFinite(rMin) && rMin > 0, `starDot: style.rMin must be > 0, got ${rMin}`);
  check(Number.isFinite(rMax) && rMax >= rMin, `starDot: style.rMax must be >= rMin (${rMin}), got ${rMax}`);
  check(alphaMin >= 0 && alphaMin <= 1, `starDot: style.alphaMin must lie in [0, 1], got ${alphaMin}`);
  const r = refRadius * Math.sqrt(magnitudeFlux(mag - refMag));
  if (r >= rMin) return { r: Math.min(r, rMax), alpha: 1 };
  const ratio = r / rMin;
  return { r: rMin, alpha: Math.max(alphaMin, ratio * ratio) };
}

/**
 * Color temperature from the B-V index, Ballesteros (2012) Eq. 14, with B-V
 * clamped to BV_RANGE (header, point 7).
 *
 * @param {number} bv B-V (mag)
 * @returns {number} temperature (K), from 3,169 K (B-V >= 2.0) to 21,707 K (B-V <= -0.4)
 * @throws {RangeError} for a non-finite value, or |B-V| >= 9.99, the
 *   sky-data.json missing-value sentinel read without decodeSkyData
 */
export function bvToTemperature(bv) {
  check(Number.isFinite(bv), `bvToTemperature: B-V must be finite, got ${bv}`);
  check(
    Math.abs(bv) < BV_SENTINEL,
    `bvToTemperature: B-V ${bv} looks like the missing-value sentinel (${SKY_DATA_FORMAT.bvMissing}); decode with decodeSkyData first`,
  );
  const x = BALLESTEROS_SLOPE * Math.min(BV_RANGE[1], Math.max(BV_RANGE[0], bv));
  return BALLESTEROS_SCALE_K * (1 / (x + BALLESTEROS_OFFSET_1) + 1 / (x + BALLESTEROS_OFFSET_2));
}

/**
 * @param {ArrayLike<number>} v
 * @param {string} name
 */
function checkUnit(v, name) {
  check(v != null && v.length >= 3, `subdivideGreatCircle: ${name} needs 3 components, got ${v?.length}`);
  const len = Math.hypot(v[0], v[1], v[2]);
  check(Math.abs(len - 1) <= UNIT_TOLERANCE, `subdivideGreatCircle: ${name} must be a unit vector, |${name}| = ${len}`);
}

/**
 * Points along the shorter great-circle arc from unit vector a to unit
 * vector b, evenly spaced no more than maxDeg apart (header, point 8). The
 * first and last points are copies of a and b; equal a and b give just
 * those two.
 *
 * @param {ArrayLike<number>} a start, unit vector
 * @param {ArrayLike<number>} b end, unit vector
 * @param {number} maxDeg largest step (deg), > 0
 * @returns {Float64Array} [x0, y0, z0, x1, ...], n + 1 points with n = max(1, ceil(theta / maxDeg))
 * @throws {RangeError} for maxDeg <= 0, non-unit inputs, or antipodal a and b
 */
export function subdivideGreatCircle(a, b, maxDeg) {
  check(Number.isFinite(maxDeg) && maxDeg > 0, `subdivideGreatCircle: maxDeg must be > 0, got ${maxDeg}`);
  checkUnit(a, 'a');
  checkUnit(b, 'b');
  const cx = a[1] * b[2] - a[2] * b[1];
  const cy = a[2] * b[0] - a[0] * b[2];
  const cz = a[0] * b[1] - a[1] * b[0];
  const sinTheta = Math.hypot(cx, cy, cz);
  const cosTheta = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  check(
    !(cosTheta < 0 && sinTheta < ANTIPODAL_SIN),
    `subdivideGreatCircle: a and b are antipodal (|a x b| = ${sinTheta}, a . b = ${cosTheta}); no unique great circle`,
  );
  const theta = Math.atan2(sinTheta, cosTheta);
  const n = Math.max(1, Math.ceil(theta / (maxDeg * DEG)));
  const out = new Float64Array(3 * (n + 1));
  for (let k = 1; k < n; k++) {
    const s = (theta * k) / n;
    const wa = Math.sin(theta - s) / sinTheta;
    const wb = Math.sin(s) / sinTheta;
    out[3 * k] = wa * a[0] + wb * b[0];
    out[3 * k + 1] = wa * a[1] + wb * b[1];
    out[3 * k + 2] = wa * a[2] + wb * b[2];
  }
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3 * n] = b[0];
  out[3 * n + 1] = b[1];
  out[3 * n + 2] = b[2];
  return out;
}

/**
 * Decoded star table and constellation figures.
 *
 * @typedef {object} SkyCatalog
 * @property {number} count number of stars N
 * @property {Float64Array} stars J2000 unit vectors [x0, y0, z0, x1, ...], length 3N, brightest first
 * @property {Float32Array} mag V magnitudes, length N
 * @property {Float32Array} bv B-V indices (a missing value reads SKY_DATA_FORMAT.bvMissingAs), length N
 * @property {Float64Array[]} lines constellation polylines as J2000 unit vectors, each
 *   [x0, y0, z0, ...] along great circles with steps no longer than the requested maxSegmentDeg
 */

/**
 * The compact sky-data.json shape (see scripts/build-sky-data.mjs).
 *
 * @typedef {object} SkyDataJson
 * @property {{ format: object }} meta provenance; meta.format must equal SKY_DATA_FORMAT
 * @property {ArrayLike<number>} stars [raCenti, decCenti, mag10, bv100] per star
 * @property {ArrayLike<ArrayLike<number>>} lines polylines [raCenti, decCenti, ...]
 */

/**
 * @param {number} raC
 * @param {number} decC
 * @param {string} where
 */
function checkStoredAngle(raC, decC, where) {
  const full = 360 * SKY_DATA_FORMAT.angleScale;
  const quarter = 90 * SKY_DATA_FORMAT.angleScale;
  check(Number.isInteger(raC) && raC >= 0 && raC < full, `decodeSkyData: ${where}: RA ${raC} is not an integer in [0, ${full})`);
  check(Number.isInteger(decC) && Math.abs(decC) <= quarter, `decodeSkyData: ${where}: Dec ${decC} is not an integer in [-${quarter}, ${quarter}]`);
}

/**
 * Unpack sky-data.json (header, point 9) into unit vectors, magnitudes,
 * colors and great-circle polylines ready for horizonMatrix and
 * stereoFromHorizon. Validates every number and fails loudly.
 *
 * @param {SkyDataJson} json the parsed lib/physics/sky-data.json
 * @param {number} [maxSegmentDeg] line subdivision step (deg), default LINE_SUBDIVIDE_DEG
 * @returns {SkyCatalog}
 * @throws {RangeError} on a format mismatch or any malformed entry
 */
export function decodeSkyData(json, maxSegmentDeg = LINE_SUBDIVIDE_DEG) {
  const fmt = /** @type {Record<string, unknown> | undefined} */ (json?.meta?.format);
  check(fmt != null, 'decodeSkyData: meta.format is missing; rebuild with scripts/build-sky-data.mjs');
  for (const [key, value] of Object.entries(SKY_DATA_FORMAT)) {
    check(fmt[key] === value, `decodeSkyData: meta.format.${key} is ${String(fmt[key])}, this module expects ${value}`);
  }
  const { angleScale, magScale, bvScale, bvMissing, bvMissingAs, fieldsPerStar } = SKY_DATA_FORMAT;
  const raw = json.stars;
  check(raw != null && raw.length % fieldsPerStar === 0, `decodeSkyData: stars length ${raw?.length} is not a multiple of ${fieldsPerStar}`);
  const count = raw.length / fieldsPerStar;
  const stars = new Float64Array(3 * count);
  const mag = new Float32Array(count);
  const bv = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const base = fieldsPerStar * i;
    const raC = raw[base];
    const decC = raw[base + 1];
    const m10 = raw[base + 2];
    const bv100 = raw[base + 3];
    checkStoredAngle(raC, decC, `star ${i}`);
    check(Number.isInteger(m10), `decodeSkyData: star ${i}: magnitude ${m10} is not an integer`);
    check(Number.isInteger(bv100), `decodeSkyData: star ${i}: B-V ${bv100} is not an integer`);
    equatorialUnit(raC / angleScale, decC / angleScale, stars, 3 * i);
    mag[i] = m10 / magScale;
    bv[i] = bv100 === bvMissing ? bvMissingAs : bv100 / bvScale;
  }
  check(json.lines != null && json.lines.length > 0, 'decodeSkyData: no constellation lines');
  /** @type {Float64Array[]} */
  const lines = [];
  for (let p = 0; p < json.lines.length; p++) {
    const poly = json.lines[p];
    check(poly != null && poly.length >= 4 && poly.length % 2 === 0, `decodeSkyData: line ${p} has ${poly?.length} numbers; need an even count >= 4`);
    const nv = poly.length / 2;
    const verts = new Float64Array(3 * nv);
    for (let k = 0; k < nv; k++) {
      checkStoredAngle(poly[2 * k], poly[2 * k + 1], `line ${p} vertex ${k}`);
      equatorialUnit(poly[2 * k] / angleScale, poly[2 * k + 1] / angleScale, verts, 3 * k);
    }
    /** @type {Float64Array[]} */
    const arcs = [];
    let total = 3;
    for (let k = 0; k + 1 < nv; k++) {
      const arc = subdivideGreatCircle(verts.subarray(3 * k, 3 * k + 3), verts.subarray(3 * k + 3, 3 * k + 6), maxSegmentDeg);
      arcs.push(arc);
      total += arc.length - 3;
    }
    const joined = new Float64Array(total);
    joined.set(arcs[0].subarray(0, 3), 0);
    let at = 3;
    for (const arc of arcs) {
      joined.set(arc.subarray(3), at); // each arc's first point is the previous arc's last
      at += arc.length - 3;
    }
    lines.push(joined);
  }
  return { count, stars, mag, bv, lines };
}
