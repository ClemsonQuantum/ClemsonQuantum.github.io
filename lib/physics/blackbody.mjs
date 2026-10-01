// @ts-check
/**
 * Blackbody colors for the SC Quantathon v4 black hole (disk and stars).
 *
 * Units: SI (lambda in m, T in K) inside Planck's law; wavelengths are quoted
 * in nm where the color-matching fit is defined.
 *
 * Derivation
 * ----------
 * 1. Planck's law. The spectral radiance of a blackbody is
 *      B_lambda(T) = (2 h c^2 / lambda^5) / (exp(h c / (lambda k_B T)) - 1),
 *    evaluated with expm1 for the denominator (no cancellation when
 *    h c / (lambda k_B T) is small).
 *
 * 2. Tristimulus values. X = int B_lambda(T) xbar(lambda) dlambda, and likewise
 *    Y with ybar and Z with zbar, over 380-780 nm by composite Simpson with
 *    1 nm steps (the CMFs are negligible outside this band). Only ratios are
 *    used below, so the overall scale is irrelevant.
 *
 * 3. Color-matching functions. The CIE 1931 2-degree observer is replaced by
 *    the multi-lobe piecewise-Gaussian fit of Wyman, Sloan & Shirley (2013):
 *      xbar = 1.056 g(599.8, 37.9, 31.0) + 0.362 g(442.0, 16.0, 26.7)
 *             - 0.065 g(501.1, 20.4, 26.2)
 *      ybar = 0.821 g(568.8, 46.9, 40.5) + 0.286 g(530.9, 16.3, 31.1)
 *      zbar = 1.217 g(437.0, 11.8, 36.0) + 0.681 g(459.0, 26.0, 13.8)
 *    with g(lambda; mu, s1, s2) = exp(-(lambda - mu)^2 / (2 s^2)), s = s1 for
 *    lambda < mu and s2 otherwise (lambda, mu, s in nm).
 *
 * 4. Display primaries. XYZ -> linear sRGB with the IEC 61966-2-1 matrix
 *      [ 3.2406 -1.5372 -0.4986 ]
 *      [-0.9689  1.8758  0.0415 ]
 *      [ 0.0557 -0.2040  1.0570 ]
 *    (D65 white point). Very red and very blue blackbodies fall outside the
 *    sRGB gamut; their negative components are clipped to 0.
 *
 * 5. Chromaticity and luminance. blackbodyRGB(T) returns the linear sRGB
 *    color scaled so its largest channel is 1. Brightness comes separately
 *    from the luminance Y(T) (point 2): what an eye or a camera sees, not the
 *    bolometric sigma T^4, whose slope d ln Y / d ln T runs from ~5.7 at
 *    4500 K through ~4.1 at 6500 K to ~3.2 at 8500 K.
 *
 * 6. Shifts. I_nu / nu^3 is invariant along a ray, so a blackbody at T seen
 *    with frequency ratio g = nu_obs / nu_emit is exactly a blackbody at g T:
 *    its color is blackbodyRGB(g T) and its luminance Y(g T). The renderer
 *    shades with L = Y(T_obs) / Y(T_PEAK) (buildLuminanceTable), tone-maps
 *    1 - exp(-exposure L), and applies the sRGB transfer curve (srgbEncode).
 *
 * 7. Spectral colors (spectralSrgb). Monochromatic light at lambda has
 *    XYZ = (xbar, ybar, zbar)(lambda). Every spectral color lies outside the
 *    sRGB triangle, so at least one of its linear channels is negative.
 *    Adding equal-energy white (X = Y = Z; in linear sRGB the matrix's row
 *    sums W = (1.2048, 0.9484, 0.9087), all positive) moves the chromaticity
 *    along the straight line toward (1/3, 1/3), which keeps the dominant
 *    wavelength. The least amount that clears every channel,
 *    t = max_i(-rgb_i / W_i), leaves the most negative channel at exactly 0
 *    (on the gamut edge). The result is scaled so its largest channel is 1,
 *    then sRGB-encoded.
 *    The fit of point 3 is made for integrals, and its point values drift in
 *    the far tails: at 700 nm its xbar/ybar is 1.32 against the CIE table's
 *    2.77, and at 380 nm its xbar is 6.9 times too small and its ybar 6.4
 *    times too large. Used directly it would paint 700 nm orange, 780 nm
 *    green and 380 nm sky blue. The true spectral locus barely moves there:
 *    CIE 1931 chromaticity changes by under 0.003 from 380 to 420 nm and by
 *    under 0.009 from 650 to 780 nm, where it settles at (0.7347, 0.2653).
 *    So spectralSrgb evaluates the fit at lambda clamped to
 *    [SPECTRAL_FIT_MIN_NM, SPECTRAL_FIT_MAX_NM] = [420, 650] nm. Against the
 *    CIE 1931 table, every color from 380 to 780 nm then agrees within 0.043
 *    per linear channel (within 0.03 per encoded channel in the held tails).
 *    The largest encoded gap, 0.12 near 464 nm, is where the color crosses
 *    the blue primary about 1 nm before the CIE table's crossing, and the
 *    steep sRGB curve near 0 magnifies the small channel. H-alpha (656.3 nm) comes
 *    out (1, 0, 0.295) encoded: red, with the touch of blue that the red-blue
 *    gamut edge requires (the CIE table gives (1, 0, 0.31)).
 *
 * References
 * ----------
 * C. Wyman, P.-P. Sloan & P. Shirley, "Simple Analytic Approximations to the
 *   CIE XYZ Color Matching Functions", JCGT 2(2), 1-11 (2013).
 * IEC 61966-2-1:1999, Multimedia systems - Colour measurement - Default RGB
 *   colour space - sRGB.
 * CIE 015:2018, Colorimetry, 4th ed., Table 1 (CIE 1931 standard colorimetric
 *   observer), the reference for point 7.
 *
 * Validation: scripts/verify-blackhole.mjs checks that 6504 K lands within
 * 0.01 of the D65 chromaticity (0.3127, 0.3290), that 1500 K is red-dominant
 * and 20000 K blue-dominant. scripts/verify-hydrogen.mjs checks spectralSrgb
 * against the CIE 1931 table and its hues.
 */

/** Planck constant (J s), exact in the 2019 SI. */
export const PLANCK_H = 6.62607015e-34;
/** Speed of light (m/s), exact. */
export const LIGHT_C = 299792458;
/** Boltzmann constant (J/K), exact in the 2019 SI. */
export const BOLTZMANN_K = 1.380649e-23;

/** Integration band and step of the tristimulus integrals (nm). */
export const LAMBDA_MIN_NM = 380;
export const LAMBDA_MAX_NM = 780;
export const LAMBDA_STEP_NM = 1;

const NM = 1e-9; // m per nm

/**
 * One lobe of the multi-lobe fit: [weight, mu, sigma below mu, sigma above mu] (nm).
 *
 * @typedef {[number, number, number, number]} Lobe
 */

/** @type {Lobe[]} */
const XBAR_LOBES = [
  [1.056, 599.8, 37.9, 31.0],
  [0.362, 442.0, 16.0, 26.7],
  [-0.065, 501.1, 20.4, 26.2],
];
/** @type {Lobe[]} */
const YBAR_LOBES = [
  [0.821, 568.8, 46.9, 40.5],
  [0.286, 530.9, 16.3, 31.1],
];
/** @type {Lobe[]} */
const ZBAR_LOBES = [
  [1.217, 437.0, 11.8, 36.0],
  [0.681, 459.0, 26.0, 13.8],
];

/** XYZ -> linear sRGB, IEC 61966-2-1 (rows R, G, B). */
export const XYZ_TO_SRGB = [
  [3.2406, -1.5372, -0.4986],
  [-0.9689, 1.8758, 0.0415],
  [0.0557, -0.204, 1.057],
];

// sRGB transfer curve (IEC 61966-2-1): linear segment and power segment.
const SRGB_LINEAR_LIMIT = 0.0031308;
const SRGB_LINEAR_SLOPE = 12.92;
const SRGB_GAMMA = 2.4;
const SRGB_OFFSET = 0.055;

/**
 * @param {boolean} ok
 * @param {string} message
 */
function check(ok, message) {
  if (!ok) throw new RangeError(`[blackbody] ${message}`);
}

/**
 * @param {number} T
 */
function checkTemperature(T) {
  check(Number.isFinite(T) && T > 0, `temperature must be finite and > 0 K, got ${T}`);
}

/**
 * @param {Lobe[]} lobes
 * @param {number} lambdaNm
 * @returns {number}
 */
function lobeSum(lobes, lambdaNm) {
  let sum = 0;
  for (const [w, mu, s1, s2] of lobes) {
    const t = (lambdaNm - mu) / (lambdaNm < mu ? s1 : s2);
    sum += w * Math.exp(-0.5 * t * t);
  }
  return sum;
}

/**
 * CIE 1931 2-degree color-matching functions, multi-lobe fit (header, point 3).
 *
 * @param {number} lambdaNm wavelength (nm)
 * @returns {[number, number, number]} [xbar, ybar, zbar]
 */
export function cieColorMatching(lambdaNm) {
  check(Number.isFinite(lambdaNm), `wavelength must be finite, got ${lambdaNm}`);
  return [lobeSum(XBAR_LOBES, lambdaNm), lobeSum(YBAR_LOBES, lambdaNm), lobeSum(ZBAR_LOBES, lambdaNm)];
}

/**
 * Planck spectral radiance B_lambda(T) (header, point 1).
 *
 * @param {number} lambdaM wavelength (m), > 0
 * @param {number} T temperature (K), > 0
 * @returns {number} W sr^-1 m^-3
 */
export function planckRadiance(lambdaM, T) {
  check(Number.isFinite(lambdaM) && lambdaM > 0, `wavelength must be > 0 m, got ${lambdaM}`);
  checkTemperature(T);
  const x = (PLANCK_H * LIGHT_C) / (lambdaM * BOLTZMANN_K * T);
  return (2 * PLANCK_H * LIGHT_C * LIGHT_C) / (lambdaM ** 5 * Math.expm1(x));
}

// Simpson weights and CMF samples on the integration grid, computed once.
const GRID_N = Math.round((LAMBDA_MAX_NM - LAMBDA_MIN_NM) / LAMBDA_STEP_NM); // even
const GRID = Array.from({ length: GRID_N + 1 }, (_, i) => {
  const lambdaNm = LAMBDA_MIN_NM + i * LAMBDA_STEP_NM;
  const simpson = i === 0 || i === GRID_N ? 1 : i % 2 ? 4 : 2;
  const [xb, yb, zb] = cieColorMatching(lambdaNm);
  return { lambdaM: lambdaNm * NM, w: (simpson * LAMBDA_STEP_NM) / 3, xb, yb, zb };
});

/**
 * Tristimulus values of a blackbody (header, point 2), arbitrary overall scale
 * (radiance in W sr^-1 m^-3 times nm).
 *
 * @param {number} T temperature (K), > 0
 * @returns {[number, number, number]} [X, Y, Z]
 */
export function blackbodyXYZ(T) {
  checkTemperature(T);
  let X = 0;
  let Y = 0;
  let Z = 0;
  for (const { lambdaM, w, xb, yb, zb } of GRID) {
    const B = w * planckRadiance(lambdaM, T);
    X += B * xb;
    Y += B * yb;
    Z += B * zb;
  }
  return [X, Y, Z];
}

/**
 * CIE xy chromaticity of a blackbody.
 *
 * @param {number} T temperature (K), > 0
 * @returns {[number, number]}
 */
export function blackbodyChromaticity(T) {
  const [X, Y, Z] = blackbodyXYZ(T);
  const sum = X + Y + Z;
  check(sum > 0, `blackbody at ${T} K has no visible emission (X + Y + Z = ${sum})`);
  return [X / sum, Y / sum];
}

/**
 * XYZ -> linear sRGB (header, point 4); components may be negative.
 *
 * @param {[number, number, number]} xyz
 * @returns {[number, number, number]}
 */
export function xyzToLinearSrgb(xyz) {
  const [X, Y, Z] = xyz;
  const m = XYZ_TO_SRGB;
  return [
    m[0][0] * X + m[0][1] * Y + m[0][2] * Z,
    m[1][0] * X + m[1][1] * Y + m[1][2] * Z,
    m[2][0] * X + m[2][1] * Y + m[2][2] * Z,
  ];
}

/**
 * Linear sRGB chromaticity of a blackbody, largest channel = 1, negative
 * components clipped to 0 (header, point 5).
 *
 * @param {number} T temperature (K), > 0
 * @returns {[number, number, number]}
 */
export function blackbodyRGB(T) {
  const rgb = xyzToLinearSrgb(blackbodyXYZ(T)).map((c) => Math.max(0, c));
  const peak = Math.max(rgb[0], rgb[1], rgb[2]);
  check(peak > 0, `blackbody at ${T} K maps to black in sRGB`);
  return [rgb[0] / peak, rgb[1] / peak, rgb[2] / peak];
}

/**
 * Temperature of entry k in a table from buildBlackbodyTable (log-spaced):
 * T_k = tMin (tMax / tMin)^(k / (n - 1)).
 *
 * @param {number} tMin
 * @param {number} tMax
 * @param {number} n
 * @param {number} k
 * @returns {number} K
 */
export function blackbodyTableTemperature(tMin, tMax, n, k) {
  return tMin * (tMax / tMin) ** (k / (n - 1));
}

/**
 * Linear sRGB chromaticities at n log-spaced temperatures in [tMin, tMax]
 * (see blackbodyTableTemperature), interleaved: [r0, g0, b0, r1, g1, b1, ...].
 * Log spacing puts rows where the color changes fastest (low T).
 *
 * @param {number} tMin lowest temperature (K), > 0
 * @param {number} tMax highest temperature (K), > tMin
 * @param {number} n entries (>= 2)
 * @returns {Float32Array} length 3 n
 */
export function buildBlackbodyTable(tMin, tMax, n) {
  checkTemperature(tMin);
  checkTemperature(tMax);
  check(tMax > tMin, `tMax (${tMax}) must exceed tMin (${tMin})`);
  check(Number.isInteger(n) && n >= 2, `n must be an integer >= 2, got ${n}`);
  const out = new Float32Array(3 * n);
  for (let k = 0; k < n; k++) out.set(blackbodyRGB(blackbodyTableTemperature(tMin, tMax, n, k)), 3 * k);
  return out;
}

/**
 * Relative luminance at the same n log-spaced temperatures as
 * buildBlackbodyTable: entry k is Y(T_k) / Y(tRef), the brightness a camera
 * sees from a blackbody at T_k compared with one at tRef (header, point 5).
 *
 * @param {number} tMin lowest temperature (K), > 0
 * @param {number} tMax highest temperature (K), > tMin
 * @param {number} n entries (>= 2)
 * @param {number} tRef reference temperature (K), > 0
 * @returns {Float32Array} length n
 */
export function buildLuminanceTable(tMin, tMax, n, tRef) {
  checkTemperature(tMin);
  checkTemperature(tMax);
  check(tMax > tMin, `tMax (${tMax}) must exceed tMin (${tMin})`);
  check(Number.isInteger(n) && n >= 2, `n must be an integer >= 2, got ${n}`);
  const yRef = blackbodyXYZ(tRef)[1];
  check(yRef > 0, `blackbody at ${tRef} K has no luminance`);
  const out = new Float32Array(n);
  for (let k = 0; k < n; k++) out[k] = blackbodyXYZ(blackbodyTableTemperature(tMin, tMax, n, k))[1] / yRef;
  return out;
}

/**
 * sRGB transfer curve (IEC 61966-2-1), linear light -> encoded, for c in [0, 1].
 *
 * @param {number} c linear value
 * @returns {number}
 */
export function srgbEncode(c) {
  const x = Math.min(1, Math.max(0, c));
  return x <= SRGB_LINEAR_LIMIT
    ? SRGB_LINEAR_SLOPE * x
    : (1 + SRGB_OFFSET) * x ** (1 / SRGB_GAMMA) - SRGB_OFFSET;
}

/** spectralSrgb evaluates the matching-function fit only on
 * [SPECTRAL_FIT_MIN_NM, SPECTRAL_FIT_MAX_NM] (nm) and holds the end colors
 * beyond, where the true spectral locus is stationary (header, point 7). */
export const SPECTRAL_FIT_MIN_NM = 420;
export const SPECTRAL_FIT_MAX_NM = 650;

/** Equal-energy white (X = Y = Z = 1) in linear sRGB: the matrix's row sums. */
const EQUAL_ENERGY_WHITE = xyzToLinearSrgb([1, 1, 1]);

/**
 * Encoded sRGB color of monochromatic light (header, point 7): CIE matching
 * functions (fit held at its trusted band edges) -> XYZ -> linear sRGB, plus
 * the least equal-energy white that clears every negative channel, largest
 * channel scaled to 1, then the sRGB transfer curve.
 *
 * @param {number} lambdaNm wavelength (nm) within LAMBDA_MIN_NM..LAMBDA_MAX_NM
 *   (380..780). CIE tabulates its matching functions against wavelength in
 *   standard air; air and vacuum wavelengths differ by under 0.3 nm here,
 *   well inside the fit's accuracy, so either may be passed.
 * @returns {[number, number, number]} encoded [r, g, b], each in [0, 1], the
 *   largest exactly 1 and the smallest exactly 0; e.g. about (1, 0, 0.295)
 *   for H-alpha at 656.3 nm and (0, 1, 0.53) for 530 nm
 * @throws {RangeError} outside 380..780 nm or for a non-finite wavelength
 */
export function spectralSrgb(lambdaNm) {
  check(
    Number.isFinite(lambdaNm) && lambdaNm >= LAMBDA_MIN_NM && lambdaNm <= LAMBDA_MAX_NM,
    `spectral color needs ${LAMBDA_MIN_NM} <= lambda <= ${LAMBDA_MAX_NM} nm, got ${lambdaNm}`,
  );
  const held = Math.min(SPECTRAL_FIT_MAX_NM, Math.max(SPECTRAL_FIT_MIN_NM, lambdaNm));
  const rgb = xyzToLinearSrgb(cieColorMatching(held));
  // Least white that clears every channel: t = max_i(-rgb_i / W_i); channel
  // `edge` is the one that sets it and lands exactly on the gamut edge.
  let t = 0;
  let edge = -1;
  for (let i = 0; i < 3; i++) {
    const need = -rgb[i] / EQUAL_ENERGY_WHITE[i];
    if (need > t) {
      t = need;
      edge = i;
    }
  }
  const lin = rgb.map((c, i) => (i === edge ? 0 : Math.max(0, c + t * EQUAL_ENERGY_WHITE[i])));
  const peak = Math.max(lin[0], lin[1], lin[2]);
  check(peak > 0, `spectral color at ${lambdaNm} nm maps to black (linear sRGB ${rgb.join(', ')})`);
  // The peak channel encodes to exactly 1 (srgbEncode(1) rounds to 1 - 2^-53).
  /** @param {number} c */
  const encode = (c) => (c === peak ? 1 : srgbEncode(c / peak));
  return [encode(lin[0]), encode(lin[1]), encode(lin[2])];
}
