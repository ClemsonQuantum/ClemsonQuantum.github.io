// @ts-check
/**
 * Schwarzschild photon orbits and a thin Page–Thorne accretion disk for the
 * SC Quantathon v4 black hole.
 *
 * Units: geometrized, G = c = M = 1, so every length and time is in units of
 * the hole's mass M (the horizon is r = 2).
 *
 * Derivation
 * ----------
 * 1. Photon orbits. A photon in the Schwarzschild metric moves in a plane
 *    through the hole with conserved energy E = (1 - 2/r) dt/dl and angular
 *    momentum L = r^2 dphi/dl (l an affine parameter). The null condition
 *    g_mn p^m p^n = 0 reads
 *      (dr/dl)^2 = E^2 - (1 - 2/r) L^2 / r^2.
 *    With u = 1/r, du/dphi = -(1/r^2)(dr/dl)/(dphi/dl) = -(dr/dl)/L, so
 *      (du/dphi)^2 = 1/b^2 - u^2 + 2u^3 =: P(u),   b = L/E (impact parameter).
 *    Differentiating, 2 u' u'' = (-2u + 6u^2) u', hence
 *      u'' + u = 3u^2.
 *    Flat space is u'' + u = 0, whose solutions are the straight lines
 *    u = sin(phi)/b; the 3u^2 term is the entire relativistic bending.
 *
 * 2. Critical orbit. A turning point is a root of P. P has a double root
 *    (P = P' = 0) where P' = -2u + 6u^2 = 0, i.e. u = 1/3 (the photon sphere
 *    r = 3), and then 1/b^2 = u^2 - 2u^3 = 1/27: b_c = 3 sqrt 3 ~ 5.196. For
 *    b > b_c the ray turns at the smallest positive root of P and escapes; for
 *    b < b_c no root lies in (0, 1/2) and it crosses the horizon u = 1/2.
 *    Massive particles have their innermost stable circular orbit (ISCO) at
 *    r = 6, the disk's inner edge.
 *
 * 3. Backward tracing. Each pixel's ray is traced from the observer at
 *    infinity back toward the hole: u(0) = 0, u'(0) = 1/b (the far field of
 *    sin(phi)/b), integrating u'' = 3u^2 - u with classical RK4 in increasing
 *    phi, the angle swept in the orbital plane from the observer's direction.
 *    The ray is captured once u >= 1/2 and has escaped once u returns to 0
 *    (u' < 0, after the turning point). The escape angle Phi(b) is located
 *    inside the last step by Newton's method on the RK4 map. Flat space gives
 *    Phi = pi, so Phi - pi is the deflection; Phi grows like -ln(b - b_c) as
 *    b -> b_c+ (the ray winds around the photon sphere).
 *
 * 4. Tables. For nb impact parameters and nPhi angles phi_k = k PHI_MAX /
 *    (nPhi - 1), PHI_MAX = 3 pi, the table stores u(phi_k; b) as float32,
 *    row-major (one row per b). After capture every later entry is 1.0, after
 *    escape every later entry is -1.0; live entries lie in [0, 1/2), so the
 *    sentinels are unambiguous. 3 pi covers the disk crossings of image orders
 *    n = 0, 1, 2 (point 7). A second table holds Phi(b), or -1 for captured
 *    rays; rays near b_c are integrated past PHI_MAX until they escape.
 *
 * 5. Impact-parameter grid. Near b_c, Phi ~ -ln(b - b_c), so the images of
 *    order n >= 1 crowd into a thin ring. The rows are uniform in
 *      s(b) = s_c + asinh((b - b_c) / c) / k,   s in [0, 1],
 *    whose analytic inverse is
 *      b(s) = b_c + c sinh(k (s - s_c)).
 *    For |b - b_c| >> c, s is linear in ln|b - b_c|, hence linear in Phi, so
 *    every image order gets rows in proportion to its winding; inside
 *    |b - b_c| < c the map is linear with row spacing ~ c k / (nb - 1).
 *    b(0) = 0 fixes k s_c = asinh(b_c / c). s_c is then snapped to the nearest
 *    half-row, so b_c lies exactly midway between two rows and no row sits on
 *    the unstable photon orbit; B_MAX = b(1) = b_c + c sinh(k (1 - s_c)).
 *    With c = 1e-4 and nb = 512: k ~ 25.0, s_c ~ 0.4628, B_MAX ~ 38.4.
 *
 * 6. Observer and disk. The disk lies in z = 0 with normal +z and rotates
 *    counterclockwise about +z. The observer is at infinity in direction
 *    o = (sin i, 0, cos i) (i = 0 face-on, pi/2 edge-on). Screen axes: right
 *    e1 = (0, 1, 0), up e2 = (-cos i, 0, sin i) (the projection of +z), and o
 *    toward the viewer; (e1, e2, o) is right-handed. A pixel at screen offset
 *    (X, Y) (units of M, Y up) has b = hypot(X, Y), alpha = atan2(Y, X), and
 *    s_hat = cos(alpha) e1 + sin(alpha) e2. Its orbital plane is spanned by o
 *    and s_hat, and the ray's position direction at sweep angle phi is
 *      n(phi) = cos(phi) o + sin(phi) s_hat.
 *
 * 7. Disk crossings (Luminet 1979). n_z = cos(phi) cos i + sin(phi) sin(alpha)
 *    sin i vanishes first at
 *      phi_0 = arccos(-sin(alpha) sin i / sqrt(cos^2 i + sin^2(alpha) sin^2 i))
 *    in (0, pi), then at phi_n = phi_0 + n pi (image order n). For
 *    0 <= i < pi/2 this equals atan2(sin(alpha) sin i, cos i) + pi/2 (cosine of
 *    the latter: -sin(atan2(B, A)) = -B / sqrt(A^2 + B^2)), which is what the
 *    code evaluates because it stays well conditioned near 0 and pi. A
 *    crossing hits the disk when 6 <= r = 1/u(phi_n) <= R_OUT; the hit's disk
 *    azimuth is atan2(n_y, n_x).
 *
 * 8. Redshift. A Keplerian emitter at r >= 6 has Omega = dphi/dt = r^(-3/2);
 *    g_mn u^m u^n = -1 with u^phi = Omega u^t gives u^t = 1/sqrt(1 - 3/r).
 *    With p_t = -E and p_phi = L_z,
 *      g = nu_obs / nu_emit = E / (-p_m u^m) = sqrt(1 - 3/r) / (1 - Omega L_z/E).
 *    At the observer the photon travels along +o from position D o + b s_hat,
 *    so L_z/E = (b s_hat x o)_z = -b sin i cos(alpha) (right-handed screen
 *    axes: e1 x o = -e2, e2 x o = e1), conserved along the ray for every image
 *    order. Therefore
 *      g = sqrt(1 - 3/r) / (1 + Omega b sin i cos(alpha)):
 *    the screen-right side (alpha = 0) recedes (redshift) and the left side
 *    approaches (blueshift, brighter).
 *
 * 9. Disk flux (Page & Thorne 1974, their f(x) for spin a = 0). With
 *    x = sqrt(r) and accretion rate 1, each face emits, per unit proper area,
 *      F(r) = 3/(8 pi) [x - sqrt6 + (sqrt3/2) ln( (x + sqrt3)(sqrt6 - sqrt3)
 *             / ((x - sqrt3)(sqrt6 + sqrt3)) )] / (x^5 (x^2 - 3)),   r >= 6.
 *    (Their general-spin roots x1, x2, x3 become sqrt3, 0, -sqrt3; the x2 = 0
 *    term vanishes with a.) The bracket is evaluated as
 *      d + (sqrt3/2)[log1p(d / (sqrt6 + sqrt3)) - log1p(d / (sqrt6 - sqrt3))],
 *    d = x - sqrt6, so F(6) = 0 exactly and the double zero at the ISCO keeps
 *    full precision. For large r the log term tends to its value at d -> inf,
 *    ln(3 - 2 sqrt2) sqrt3/2 = -sqrt3 ln(1 + sqrt2), so the bracket tends to
 *    x - C, C = sqrt6 + sqrt3 ln(1 + sqrt2) ~ 3.976, and
 *      F 8 pi r^3 / 3 = 1 - C/sqrt(r) + 6/r - 3C/r^(3/2) + O(r^-2)
 *    (expanding ln((1 + a)/(1 - a)) with a = sqrt3/x). The Newtonian thin disk
 *    with the same inner edge, 3/(8 pi r^3) (1 - sqrt(6/r)), has C = sqrt6 and no
 *    further terms. The C/sqrt(r) term is the inner-boundary (zero-torque)
 *    correction, 4% at r = 1e4, so the leading-order limit 3/(8 pi r^3) is
 *    reached within 1% only beyond r ~ 1.6e5.
 *
 * 10. Temperature. Each face is a blackbody, sigma T^4 = F, so
 *    T(r) = T_PEAK (F(r) / F_max)^(1/4). T_PEAK = 6500 K is a display choice
 *    (the physical value scales with M and the accretion rate); every ratio,
 *    the radial profile and all Doppler and gravitational shifts, is exact.
 *    I_nu / nu^3 is invariant along rays, so a blackbody at T seen with
 *    frequency ratio g is a blackbody at g T with bolometric intensity
 *    proportional to (g T)^4 (see lib/physics/blackbody.mjs).
 *
 * 11. Sky. An escaping ray arrives from the asymptotic direction
 *    d = n(Phi) = cos(Phi) o + sin(Phi) s_hat on the celestial sphere (the
 *    unlensed d = -o is straight behind the hole). Beyond the table
 *    (b > B_MAX) Phi comes from the weak-deflection series (Keeton & Petters
 *    2005, Phys. Rev. D 72, 104006)
 *      Phi = pi + 4/b + 15 pi/(4 b^2) + 128/(3 b^3) + 3465 pi/(64 b^4)
 *            + 3584/(5 b^5) + O(b^-6),
 *    accurate to ~1e-6 rad at b = B_MAX (the verification confirms the
 *    b^-5 coefficient against quadrature).
 *
 * References
 * ----------
 * J.-P. Luminet, "Image of a spherical black hole with thin accretion disk",
 *   A&A 75, 228 (1979).
 * D. N. Page & K. S. Thorne, "Disk-accretion onto a black hole. I. Time-averaged
 *   structure of accretion disk", ApJ 191, 499 (1974).
 * C. R. Keeton & A. O. Petters, Phys. Rev. D 72, 104006 (2005).
 *
 * Validation: scripts/verify-blackhole.mjs checks the capture threshold, the
 * tabulated deflection against an independent quadrature of the orbit
 * integral, the weak-field limit, the Page–Thorne flux, the redshift sign
 * convention, and the tables' monotonicity and build time.
 */

const SQRT3 = Math.sqrt(3);
const SQRT6 = Math.sqrt(6);

/** Critical impact parameter b_c = 3 sqrt 3 (M). */
export const B_CRIT = 3 * SQRT3;
/** Photon sphere radius (M). */
export const R_PHOTON_SPHERE = 3;
/** Horizon radius (M). */
export const R_HORIZON = 2;
/** u = 1/r at the horizon; a ray reaching it is captured. */
export const U_HORIZON = 1 / R_HORIZON;
/** Innermost stable circular orbit (M), the disk's inner edge. */
export const R_ISCO = 6;
/** Largest tabulated sweep angle: crossings of image orders 0, 1, 2. */
export const PHI_MAX = 3 * Math.PI;
/** Half-width c of the linear core of the impact-parameter grid (M). */
export const B_CORE = 1e-4;
/** Outer end of the impact-parameter grid before the half-row snap (M). */
export const B_MAX_TARGET = 40;
/** Default table size: impact parameters (rows). */
export const GEODESIC_NB = 512;
/** Default table size: sweep-angle samples per row. */
export const GEODESIC_NPHI = 1024;
/** RK4 steps per table sample (step = PHI_MAX / (nPhi - 1) / this ~ 1.2e-3 rad). */
export const RK4_SUBSTEPS = 8;
/** A ray still orbiting after this sweep angle (rad) is reported as an error. */
export const SWEEP_LIMIT = 64;
/** Table sentinel: the ray fell through the horizon before this angle. */
export const U_CAPTURED = 1;
/** Table sentinel: the ray escaped to infinity before this angle. */
export const U_ESCAPED = -1;
/** Escape-angle table entry of a captured ray. */
export const PHI_CAPTURED = -1;
/** Outer radius of the disk (M). A model choice, not a physical edge. */
export const DISK_R_OUT = 22;
/** Temperature of the hottest ring (K). A display choice; see header, point 10. */
export const DISK_T_PEAK = 6500;

// Newton refinement of the escape angle inside the final RK4 step.
const ESCAPE_NEWTON_ITERATIONS = 4;
// Golden-section search for the flux maximum: bracket (M) and tolerance.
const FLUX_PEAK_BRACKET = [R_ISCO, 30];
const FLUX_PEAK_TOL = 1e-11;
const GOLDEN = (Math.sqrt(5) - 1) / 2;
// Bisection steps for the periapsis root (interval 1/3 -> 1/3 * 2^-64, below 1 ulp).
const TURNING_POINT_BISECTIONS = 64;

/**
 * @param {boolean} ok
 * @param {string} message
 */
function check(ok, message) {
  if (!ok) throw new RangeError(`[schwarzschild] ${message}`);
}

/**
 * @param {number} n
 * @param {string} name
 * @param {number} min
 */
function requireInt(n, name, min) {
  check(Number.isInteger(n) && n >= min, `${name} must be an integer >= ${min}, got ${n}`);
}

/**
 * @param {number} b
 */
function requireImpact(b) {
  check(Number.isFinite(b) && b >= 0, `impact parameter b must be finite and >= 0, got ${b}`);
}

/**
 * @param {number} incl
 */
function requireInclination(incl) {
  check(
    Number.isFinite(incl) && incl >= 0 && incl < Math.PI / 2,
    `inclination must lie in [0, pi/2), got ${incl} rad`,
  );
}

// ---------------------------------------------------------------------------
// Impact-parameter grid (header, point 5)
// ---------------------------------------------------------------------------

/**
 * Parameters of the analytic impact-parameter map b(s) = b_c + c sinh(k (s - s_c)).
 *
 * @typedef {object} ImpactMap
 * @property {number} nb number of rows; row j sits at s = j / (nb - 1)
 * @property {number} bCrit b_c (M)
 * @property {number} core c, half-width of the linear core (M)
 * @property {number} k slope of the asinh map
 * @property {number} sCrit s_c = s(b_c), a half-row: s_c (nb - 1) = m + 1/2
 * @property {number} jCrit s_c (nb - 1), the fractional row of b_c
 * @property {number} bMax b(1) (M), the last row
 */

/**
 * Build the impact-parameter map for a table with nb rows (header, point 5).
 *
 * @param {number} [nb] rows (>= 4)
 * @returns {ImpactMap}
 */
export function makeImpactMap(nb = GEODESIC_NB) {
  requireInt(nb, 'nb', 4);
  const kBelow = Math.asinh(B_CRIT / B_CORE); // k s_c, from b(0) = 0
  const kAbove = Math.asinh((B_MAX_TARGET - B_CRIT) / B_CORE); // k (1 - s_c)
  const sNatural = kBelow / (kBelow + kAbove);
  // Snap b_c to the nearest half-row so no row sits on the photon orbit.
  const jCrit = Math.round(sNatural * (nb - 1) - 0.5) + 0.5;
  const sCrit = jCrit / (nb - 1);
  const k = kBelow / sCrit;
  const bMax = B_CRIT + B_CORE * Math.sinh(k * (1 - sCrit));
  return { nb, bCrit: B_CRIT, core: B_CORE, k, sCrit, jCrit, bMax };
}

/**
 * Impact parameter of grid coordinate s: b(s) = b_c + c sinh(k (s - s_c)).
 *
 * @param {ImpactMap} map
 * @param {number} s grid coordinate in [0, 1]
 * @returns {number} b (M), clamped at 0 (b(0) = 0 up to rounding)
 */
export function bOfS(map, s) {
  if (s <= 0) return 0;
  return Math.max(0, map.bCrit + map.core * Math.sinh(map.k * (s - map.sCrit)));
}

/**
 * Grid coordinate of impact parameter b: s(b) = s_c + asinh((b - b_c) / c) / k.
 *
 * @param {ImpactMap} map
 * @param {number} b impact parameter (M), >= 0
 * @returns {number} s (> 1 beyond B_MAX)
 */
export function sOfB(map, b) {
  return map.sCrit + Math.asinh((b - map.bCrit) / map.core) / map.k;
}

// ---------------------------------------------------------------------------
// Photon orbits (header, points 1-4)
// ---------------------------------------------------------------------------

/**
 * One classical RK4 step of u' = v, v' = 3u^2 - u.
 *
 * @param {number} u
 * @param {number} v
 * @param {number} h step (rad)
 * @param {Float64Array} out receives [u, v] after the step
 */
function rk4Step(u, v, h, out) {
  const k1u = v;
  const k1v = u * (3 * u - 1);
  const u2 = u + 0.5 * h * k1u;
  const v2 = v + 0.5 * h * k1v;
  const k2u = v2;
  const k2v = u2 * (3 * u2 - 1);
  const u3 = u + 0.5 * h * k2u;
  const v3 = v + 0.5 * h * k2v;
  const k3u = v3;
  const k3v = u3 * (3 * u3 - 1);
  const u4 = u + h * k3u;
  const v4 = v + h * k3v;
  const k4u = v4;
  const k4v = u4 * (3 * u4 - 1);
  out[0] = u + (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
  out[1] = v + (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
}

/**
 * Fate of one backward-traced ray.
 *
 * @typedef {object} RayFate
 * @property {'captured' | 'escaped'} fate
 * @property {number} phiEnd sweep angle (rad) of the capture step, or the
 *   escape angle Phi(b) located to RK4 accuracy
 * @property {number} uMax largest u reached (1/r of periapsis for escaping rays)
 */

/**
 * Integrate u'' = 3u^2 - u from the observer (u = 0, u' = 1/b) until the ray
 * is captured (u >= 1/2) or escapes (u back to 0). When `row` is given,
 * row[k] receives u at phi = k * sampleEvery * h, then the sentinel.
 *
 * @param {number} b impact parameter (M), > 0
 * @param {number} h RK4 step (rad)
 * @param {Float32Array | null} row samples to fill, or null
 * @param {number} sampleEvery RK4 steps per sample
 * @returns {RayFate}
 */
function integrateRay(b, h, row, sampleEvery) {
  const state = new Float64Array(2);
  const probe = new Float64Array(2);
  const nSamples = row ? row.length : 0;
  let u = 0;
  let v = 1 / b;
  let uMax = 0;
  let step = 0;
  let next = 1;
  if (row && nSamples > 0) row[0] = 0;
  const maxSteps = Math.ceil(SWEEP_LIMIT / h);
  while (step < maxSteps) {
    rk4Step(u, v, h, state);
    const un = state[0];
    const vn = state[1];
    step += 1;
    if (un >= U_HORIZON) {
      if (row) row.fill(U_CAPTURED, Math.min(next, nSamples));
      return { fate: 'captured', phiEnd: step * h, uMax: un };
    }
    if (un <= 0 && vn < 0) {
      // Escaped inside this step: Newton on tau -> u(phi_prev + tau) = 0,
      // each evaluation a single RK4 step of length tau from the last state.
      let tau = (h * u) / (u - un);
      for (let it = 0; it < ESCAPE_NEWTON_ITERATIONS; it++) {
        rk4Step(u, v, tau, probe);
        tau -= probe[0] / probe[1];
      }
      if (row) row.fill(U_ESCAPED, Math.min(next, nSamples));
      return { fate: 'escaped', phiEnd: (step - 1) * h + tau, uMax };
    }
    u = un;
    v = vn;
    if (u > uMax) uMax = u;
    if (row && next < nSamples && step === next * sampleEvery) {
      row[next] = u;
      next += 1;
    }
  }
  throw new Error(
    `[schwarzschild] ray b = ${b} (b - b_c = ${b - B_CRIT}) still orbiting at phi = ${SWEEP_LIMIT} rad`,
  );
}

/**
 * Default RK4 step: the table's sample spacing / RK4_SUBSTEPS (~1.15e-3 rad).
 */
export const RK4_STEP = PHI_MAX / (GEODESIC_NPHI - 1) / RK4_SUBSTEPS;

/**
 * Trace a single ray back from the observer (header, point 3).
 *
 * @param {number} b impact parameter (M), >= 0
 * @param {number} [h] RK4 step (rad), default RK4_STEP
 * @returns {RayFate}
 */
export function traceRay(b, h = RK4_STEP) {
  requireImpact(b);
  check(Number.isFinite(h) && h > 0 && h < 0.1, `RK4 step must lie in (0, 0.1) rad, got ${h}`);
  if (b === 0) return { fate: 'captured', phiEnd: 0, uMax: Infinity };
  return integrateRay(b, h, null, 1);
}

/**
 * Tabulated photon orbits (header, point 4).
 *
 * @typedef {object} GeodesicTable
 * @property {Float32Array} u nb x nPhi, row-major: u(phi_k; b_j) at
 *   [j * nPhi + k], with the sentinels U_CAPTURED / U_ESCAPED
 * @property {Float32Array} escape nb escape angles Phi(b_j) (rad), or
 *   PHI_CAPTURED (-1) for captured rays
 * @property {ImpactMap} map row j sits at b = bOfS(map, j / (nb - 1))
 * @property {number} nb
 * @property {number} nPhi
 * @property {number} phiMax PHI_MAX: sample k sits at phi = k phiMax / (nPhi - 1)
 * @property {number} buildMs compute time of the build (ms)
 */

/**
 * Integrate the geodesic table one impact-parameter row at a time (header,
 * points 3-5), so a caller can spread the work over idle time: each
 * `next()` traces one row and yields the number of rows done; the generator
 * returns the finished table. Rows are independent, so the result does not
 * depend on how the calls are spaced (buildGeodesicTable drains it at once).
 *
 * @param {number} [nb] impact-parameter rows (>= 4)
 * @param {number} [nPhi] sweep-angle samples per row (>= 16)
 * @param {number} [substeps] RK4 steps per sample (>= 1)
 * @returns {Generator<number, GeodesicTable, void>}
 */
export function* geodesicTableRows(nb = GEODESIC_NB, nPhi = GEODESIC_NPHI, substeps = RK4_SUBSTEPS) {
  requireInt(nb, 'nb', 4);
  requireInt(nPhi, 'nPhi', 16);
  requireInt(substeps, 'substeps', 1);
  let buildMs = 0; // compute time only, not the gaps between rows
  let t0 = performance.now();
  const map = makeImpactMap(nb);
  const u = new Float32Array(nb * nPhi);
  const escape = new Float32Array(nb);
  const h = PHI_MAX / (nPhi - 1) / substeps;
  for (let j = 0; j < nb; j++) {
    const b = bOfS(map, j / (nb - 1));
    const row = u.subarray(j * nPhi, (j + 1) * nPhi);
    if (b === 0) {
      // The radial ray: phi never advances; it is captured at once.
      row.fill(U_CAPTURED);
      row[0] = 0;
      escape[j] = PHI_CAPTURED;
    } else {
      const fate = integrateRay(b, h, row, substeps);
      const expectCaptured = j < map.jCrit;
      if ((fate.fate === 'captured') !== expectCaptured) {
        throw new Error(
          `[schwarzschild] row ${j} (b = ${b}, b - b_c = ${b - B_CRIT}) ${fate.fate}, ` +
            `expected ${expectCaptured ? 'capture' : 'escape'}`,
        );
      }
      escape[j] = fate.fate === 'escaped' ? fate.phiEnd : PHI_CAPTURED;
    }
    buildMs += performance.now() - t0;
    yield j + 1;
    t0 = performance.now();
  }
  return { u, escape, map, nb, nPhi, phiMax: PHI_MAX, buildMs };
}

/**
 * Integrate every row of the geodesic table at once (header, points 3-5).
 *
 * @param {number} [nb] impact-parameter rows (>= 4)
 * @param {number} [nPhi] sweep-angle samples per row (>= 16)
 * @param {number} [substeps] RK4 steps per sample (>= 1)
 * @returns {GeodesicTable}
 */
export function buildGeodesicTable(nb = GEODESIC_NB, nPhi = GEODESIC_NPHI, substeps = RK4_SUBSTEPS) {
  const rows = geodesicTableRows(nb, nPhi, substeps);
  let step = rows.next();
  while (!step.done) step = rows.next();
  return step.value;
}

/**
 * Smallest positive root of P(u) = 1/b^2 - u^2 + 2u^3, i.e. 1/r of the
 * periapsis of an escaping ray (b > b_c), by bisection on (0, 1/3).
 *
 * @param {number} b impact parameter (M), > b_c
 * @returns {number}
 */
export function turningPointU(b) {
  check(Number.isFinite(b) && b > B_CRIT, `turning point needs b > b_c = ${B_CRIT}, got ${b}`);
  // P(0) = 1/b^2 > 0, P(1/3) = 1/b^2 - 1/27 < 0, and P' = 2u(3u - 1) < 0 on
  // (0, 1/3): exactly one root there. 64 halvings reach double precision
  // (Newton is avoided: P' -> 0 at the double root as b -> b_c).
  const P = (/** @type {number} */ u) => 1 / (b * b) - u * u + 2 * u * u * u;
  let lo = 0;
  let hi = 1 / 3;
  for (let it = 0; it < TURNING_POINT_BISECTIONS; it++) {
    const mid = 0.5 * (lo + hi);
    if (P(mid) > 0) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** Coefficients of the weak-deflection series in powers of 1/b (header, point 11). */
export const WEAK_FIELD_COEFFS = [4, (15 * Math.PI) / 4, 128 / 3, (3465 * Math.PI) / 64, 3584 / 5];

/**
 * Weak-deflection series for the escape angle (header, point 11):
 * Phi = pi + sum_k WEAK_FIELD_COEFFS[k] / b^(k + 1).
 *
 * @param {number} b impact parameter (M); accurate to ~1e-6 rad for b >= 38
 * @returns {number} Phi (rad)
 */
export function weakFieldSweep(b) {
  check(Number.isFinite(b) && b > 0, `weak-field series needs b > 0, got ${b}`);
  const x = 1 / b;
  let sum = 0;
  for (let k = WEAK_FIELD_COEFFS.length - 1; k >= 0; k--) sum = x * (WEAK_FIELD_COEFFS[k] + sum);
  return Math.PI + sum;
}

// ---------------------------------------------------------------------------
// Observer geometry, disk crossings, redshift (header, points 6-8)
// ---------------------------------------------------------------------------

/**
 * Observer direction and screen axes for inclination i (header, point 6).
 *
 * @param {number} incl inclination (rad), [0, pi/2)
 * @returns {{ o: [number, number, number], e1: [number, number, number], e2: [number, number, number] }}
 */
export function observerBasis(incl) {
  requireInclination(incl);
  const si = Math.sin(incl);
  const ci = Math.cos(incl);
  return { o: [si, 0, ci], e1: [0, 1, 0], e2: [-ci, 0, si] };
}

/**
 * Sweep angle of the first disk-plane crossing, phi_0 in (0, pi) (header,
 * point 7). Crossing n is at phi_0 + n pi.
 *
 * @param {number} alpha screen polar angle atan2(Y, X) (rad)
 * @param {number} incl inclination (rad), [0, pi/2)
 * @returns {number}
 */
export function diskCrossingPhi0(alpha, incl) {
  requireInclination(incl);
  check(Number.isFinite(alpha), `alpha must be finite, got ${alpha}`);
  return Math.atan2(Math.sin(alpha) * Math.sin(incl), Math.cos(incl)) + Math.PI / 2;
}

/**
 * Position direction n(phi) = cos(phi) o + sin(phi) s_hat of a ray (header,
 * point 6); at the escape angle Phi it is the sky direction the ray came from.
 *
 * @param {number} phi sweep angle (rad)
 * @param {number} alpha screen polar angle (rad)
 * @param {number} incl inclination (rad), [0, pi/2)
 * @returns {[number, number, number]}
 */
export function rayDirection(phi, alpha, incl) {
  const { o, e1, e2 } = observerBasis(incl);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  /** @param {number} k */
  const comp = (k) => cp * o[k] + sp * (ca * e1[k] + sa * e2[k]);
  return [comp(0), comp(1), comp(2)];
}

/**
 * Keplerian angular velocity Omega = r^(-3/2) (coordinate time).
 *
 * @param {number} r radius (M), >= 6
 * @returns {number}
 */
export function keplerOmega(r) {
  check(Number.isFinite(r) && r >= R_ISCO, `Keplerian disk needs r >= ${R_ISCO}, got ${r}`);
  return r ** -1.5;
}

/**
 * Frequency ratio g = nu_obs / nu_emit of a Keplerian emitter seen along the
 * pixel (b, alpha) (header, point 8):
 * g = sqrt(1 - 3/r) / (1 + Omega b sin i cos alpha).
 *
 * @param {number} r emission radius (M), >= 6
 * @param {number} b impact parameter (M)
 * @param {number} alpha screen polar angle (rad)
 * @param {number} incl inclination (rad), [0, pi/2)
 * @returns {number}
 */
export function diskRedshift(r, b, alpha, incl) {
  requireImpact(b);
  requireInclination(incl);
  const denom = 1 + keplerOmega(r) * b * Math.sin(incl) * Math.cos(alpha);
  check(denom > 0, `redshift denominator ${denom} <= 0 (r = ${r}, b = ${b}, alpha = ${alpha})`);
  return Math.sqrt(1 - 3 / r) / denom;
}

// ---------------------------------------------------------------------------
// Page–Thorne disk (header, points 9-10)
// ---------------------------------------------------------------------------

/**
 * Page–Thorne flux of a thin disk around a Schwarzschild hole, accretion rate 1
 * (header, point 9). Exactly 0 at the ISCO.
 *
 * @param {number} r radius (M), >= 6
 * @returns {number} F(r) (units of M_dot / M^2 with G = c = 1)
 */
export function pageThorneFlux(r) {
  check(Number.isFinite(r) && r >= R_ISCO, `Page–Thorne flux needs r >= ${R_ISCO} (ISCO), got ${r}`);
  const x = Math.sqrt(r);
  const d = x - SQRT6;
  const bracket = d + (SQRT3 / 2) * (Math.log1p(d / (SQRT6 + SQRT3)) - Math.log1p(d / (SQRT6 - SQRT3)));
  return ((3 / (8 * Math.PI)) * bracket) / (x ** 5 * (x * x - 3));
}

/** Asymptotic constant C = sqrt6 + sqrt3 ln(1 + sqrt2) of the flux (header, point 9). */
export const FLUX_ASYMPTOTIC_C = SQRT6 + SQRT3 * Math.log(1 + Math.SQRT2);

/** @type {{ r: number, flux: number } | null} */
let fluxPeakCache = null;

/**
 * Radius and value of the flux maximum, by golden-section search.
 *
 * @returns {{ r: number, flux: number }}
 */
export function pageThorneFluxPeak() {
  if (fluxPeakCache) return fluxPeakCache;
  let [lo, hi] = FLUX_PEAK_BRACKET;
  let x1 = hi - GOLDEN * (hi - lo);
  let x2 = lo + GOLDEN * (hi - lo);
  let f1 = pageThorneFlux(x1);
  let f2 = pageThorneFlux(x2);
  while (hi - lo > FLUX_PEAK_TOL) {
    if (f1 < f2) {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + GOLDEN * (hi - lo);
      f2 = pageThorneFlux(x2);
    } else {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - GOLDEN * (hi - lo);
      f1 = pageThorneFlux(x1);
    }
  }
  const r = 0.5 * (lo + hi);
  fluxPeakCache = { r, flux: pageThorneFlux(r) };
  return fluxPeakCache;
}

/**
 * Local effective temperature T(r) = T_PEAK (F / F_max)^(1/4) (header, point 10).
 *
 * @param {number} r radius (M), >= 6
 * @param {number} [tPeak] temperature of the hottest ring (K)
 * @returns {number} K
 */
export function diskTemperature(r, tPeak = DISK_T_PEAK) {
  check(Number.isFinite(tPeak) && tPeak > 0, `tPeak must be > 0 K, got ${tPeak}`);
  return tPeak * Math.sqrt(Math.sqrt(pageThorneFlux(r) / pageThorneFluxPeak().flux));
}

/**
 * Normalized flux profile F(r) / F_max at n radii r_k = rIn + (rOut - rIn) k / (n - 1).
 * Its fourth root is T / T_PEAK; it also equals the emitted bolometric
 * intensity relative to the hottest ring.
 *
 * @param {number} n samples (>= 2)
 * @param {number} [rIn] first radius (M), >= 6
 * @param {number} [rOut] last radius (M), > rIn
 * @returns {Float32Array}
 */
export function buildFluxTable(n, rIn = R_ISCO, rOut = DISK_R_OUT) {
  requireInt(n, 'n', 2);
  check(rIn >= R_ISCO && rOut > rIn, `flux table needs ${R_ISCO} <= rIn < rOut, got [${rIn}, ${rOut}]`);
  const fMax = pageThorneFluxPeak().flux;
  const out = new Float32Array(n);
  for (let k = 0; k < n; k++) out[k] = pageThorneFlux(rIn + ((rOut - rIn) * k) / (n - 1)) / fMax;
  return out;
}
