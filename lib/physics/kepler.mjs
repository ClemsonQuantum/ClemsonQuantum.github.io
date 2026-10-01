// @ts-check
/**
 * Heliocentric planet positions for the SC Quantathon v4 orrery, from JPL's
 * approximate Keplerian elements.
 *
 * Units: au and days (Julian dates) in the API, degrees in the element table,
 * radians inside the solver. Output frame: heliocentric, mean ecliptic and
 * equinox of J2000 (x toward the J2000 vernal equinox, z toward the north
 * ecliptic pole, y = z cross x, so the frame is right-handed).
 *
 * Source
 * ------
 * E. M. Standish, "Keplerian Elements for Approximate Positions of the Major
 * Planets", JPL Solar System Dynamics (after Standish & Williams 1992),
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html, Table 1: "Keplerian
 * elements and their rates, with respect to the mean ecliptic and equinox of
 * J2000, valid for the time-interval 1800 AD - 2050 AD". Copied digit for
 * digit from the page on 2026-09-30; scripts/verify-kepler.mjs re-checks the
 * transcription against JPL's printed block. The page's nominal Table 1
 * errors in heliocentric longitude / latitude / distance are
 *   Mercury  15" /  1" /    1000 km      Jupiter 400" / 10" /  600000 km
 *   Venus    20" /  1" /    4000 km      Saturn  600" / 25" / 1500000 km
 *   EM Bary  20" /  8" /    6000 km      Uranus   50" /  2" / 1000000 km
 *   Mars     40" /  2" /   25000 km      Neptune  10" /  1" /  200000 km
 * "EM Bary" is the Earth-Moon barycentre. Earth's centre stays within
 * 4900 km of it (the Moon's distance / 82.3, at most 3.3e-5 au, or 7" seen
 * from the Sun), so it stands in for Earth.
 *
 * Method (JPL's recipe from the same page, each step derived)
 * ------
 * 1. Time. T = (JD - 2451545.0) / 36525 Julian centuries from J2000.0. JPL's
 *    JD is on the TDB scale; julianDateFromUnixMs returns the UTC-based JD,
 *    which trails TDB by 69.2 s in 2026 (32.184 s + 37 leap seconds, i.e.
 *    8.0e-4 d). Mercury, the fastest planet, sweeps at most 6.4 deg/d (at
 *    perihelion), so the lag moves it by at most 18", the size of the
 *    table's own error. Every other planet moves less.
 * 2. Elements. q = q0 + qdot T for each q in (a, e, I, L, varpi, Omega).
 * 3. Angles. omega = varpi - Omega (argument of perihelion) and M = L - varpi
 *    (mean anomaly). Table 1 carries no b T^2 + c cos(fT) + s sin(fT) terms
 *    (those belong to Table 2b, 3000 BC - 3000 AD). M is reduced to
 *    (-180, 180] deg.
 * 4. Kepler's equation, M = E - e sin E, with E the eccentric anomaly.
 *    Derivation: put the centre of the ellipse at the origin and draw the
 *    auxiliary circle of radius a around it. The orbit point at eccentric
 *    angle E is (a cos E, b sin E), b = a sqrt(1 - e^2), and the Sun (a
 *    focus) is at (a e, 0). Squeezing the circle by b/a along y scales every
 *    area by b/a, so the area swept from perihelion as seen from the Sun is
 *      (b/a) [ a^2 E / 2 - (1/2)(a e)(a sin E) ] = (a b / 2)(E - e sin E),
 *    the circular sector seen from the centre minus the triangle
 *    centre-focus-point. Kepler's second law makes that area grow uniformly
 *    in time and reach pi a b after one period, so
 *    (E - e sin E) / (2 pi) = t / P = M / (2 pi).
 *    Solution: f(E) = E - e sin E - M has f'(E) = 1 - e cos E >= 1 - e > 0,
 *    so the root is unique. f is odd under (E, M) -> (-E, -M), so solve for
 *    m = |M| in [0, pi] and restore the sign. There f(m) = -e sin m <= 0 and
 *    f(m + e) = e (1 - sin(m + e)) >= 0, so the root lies in [m, m + e].
 *    Newton's step E <- E - f / f' starts from JPL's guess E0 = m + e sin m
 *    (inside that bracket). Any step that would leave the shrinking bracket
 *    bisects instead, so even e -> 1 near m = 0, where f' ~ 1 - e is small,
 *    cannot diverge. The loop stops when |f(E)| < 1e-12 rad (JPL's suggested
 *    1e-6 deg is 1.7e-8 rad) and throws after 50 steps.
 *    Limits: e = 0 gives E = M at once (uniform circular motion), and m = 0
 *    and m = pi (perihelion and aphelion) give E = M for every e.
 * 5. Orbital plane, with x' from the Sun toward perihelion:
 *      x' = a (cos E - e),   y' = a sqrt(1 - e^2) sin E,   z' = 0,
 *    which is the point (a cos E, b sin E) shifted by the focus offset a e.
 *    Then x'^2 + y'^2 = a^2 [(cos E - e)^2 + (1 - e^2) sin^2 E]
 *                     = a^2 [1 - 2 e cos E + e^2 cos^2 E] = a^2 (1 - e cos E)^2,
 *    so r = a (1 - e cos E): a (1 - e) at E = 0 (perihelion, on +x'),
 *    a (1 + e) at E = pi (aphelion), and a for every E when e = 0.
 * 6. Ecliptic J2000. r_ecl = Rz(Omega) Rx(I) Rz(omega) r' as active
 *    rotations (JPL writes the same matrix as the frame rotations
 *    R_z(-Omega) R_x(-I) R_z(-omega)): turn by omega within the orbit plane,
 *    tilt by I about the line of nodes, turn by Omega about the ecliptic
 *    pole. With w = omega, O = Omega, p = x' cos w - y' sin w and
 *    q = x' sin w + y' cos w:
 *      x = p cos O - q cos I sin O,   y = p sin O + q cos I cos O,   z = q sin I.
 *    Expanding p and q gives JPL's matrix, r_ecl = x' P + y' Q, with
 *      P = ( cos w cos O - sin w sin O cos I,  cos w sin O + sin w cos O cos I,  sin w sin I)
 *      Q = (-sin w cos O - cos w sin O cos I, -sin w sin O + cos w cos O cos I,  cos w sin I)
 *    Checks: I = 0 gives z = 0 and a plain turn by w + O = varpi, so the
 *    perihelion sits at ecliptic longitude varpi. At argument of latitude
 *    u = w + nu = 0 (nu the true anomaly) the position is r (cos O, sin O, 0)
 *    with dz/du = r sin I > 0, the ascending node. P x Q =
 *    (sin I sin O, -sin I cos O, cos I) is the orbit normal, free of w.
 *    (EM Bary's tiny negative I with Omega = 0 is the fit's way of writing a
 *    node at 180 deg; the formulas take it as is.)
 *
 * Saturn's ring plane (for the orrery's rings)
 * ------
 * The rings lie in Saturn's equator. The IAU WGCCRE 2009 report (Archinal et
 * al. 2011, Celest. Mech. Dyn. Astron. 109, 101) puts Saturn's north pole at
 * RA 40.589 deg, Dec 83.537 deg (ICRF, J2000). Its drifts of -0.036 and
 * -0.004 deg per century are dropped: 0.01 deg by 2026, 0.02 deg by 2050.
 * The unit vector (cos d cos a, cos d sin a, sin d) goes
 * from equatorial to ecliptic by the transpose of JPL's equatorial rotation
 * Rx(eps), with eps = 84381.448" (the IAU 1976 obliquity that Horizons uses;
 * JPL's page rounds it to 23.43928 deg):
 *   x_ecl = x_eq,   y_ecl = cos eps y_eq + sin eps z_eq,
 *   z_ecl = -sin eps y_eq + cos eps z_eq.
 * Checks: eps = 0 is the identity, and the celestial pole (0, 0, 1) lands at
 * ecliptic longitude 90 deg and latitude 90 deg - eps, as it must.
 *
 * Validation: scripts/verify-kepler.mjs checks the Table 1 transcription, the
 * Kepler residual, the limits above, the periods, Kepler's third law, the
 * ring plane against Meeus, and positions against JPL Horizons (DE441).
 */

/** Julian date of J2000.0 (2000 January 1, 12:00 TDB). */
export const JD_J2000 = 2451545.0;
/** Days per Julian century. */
export const DAYS_PER_CENTURY = 36525;
/** Julian date of the Unix epoch (1970 January 1, 00:00 UTC). */
export const JD_UNIX_EPOCH = 2440587.5;
/** Start of Table 1's fit interval, 1800 January 1, 00:00, as a Julian date. */
export const TABLE1_JD_START = 2378496.5;
/** End of Table 1's fit interval, 2050 January 1, 00:00, as a Julian date. */
export const TABLE1_JD_END = 2469807.5;
/** Kepler solver: stop once |E - e sin E - M| falls below this (rad). */
export const KEPLER_TOLERANCE = 1e-12;
/** Kepler solver: throw if Newton has not converged after this many steps. */
export const KEPLER_MAX_ITERATIONS = 50;
/** Mean obliquity of the ecliptic at J2000, IAU 1976 (arcsec). */
export const OBLIQUITY_J2000_ARCSEC = 84381.448;
/** Saturn's north pole, ICRF J2000, IAU WGCCRE 2009: right ascension (deg). */
export const SATURN_POLE_RA_DEG = 40.589;
/** Saturn's north pole, ICRF J2000, IAU WGCCRE 2009: declination (deg). */
export const SATURN_POLE_DEC_DEG = 83.537;

const MS_PER_DAY = 86400000;
const DEG_PER_REV = 360;
const DEG = Math.PI / 180;
const TWO_PI = 2 * Math.PI;
const ARCSEC_PER_DEG = 3600;
const ELEMENT_COUNT = 6;

/**
 * @typedef {'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'} PlanetKey
 */

/**
 * Six Keplerian elements (one Table 1 row), or their rates per Julian
 * century. JPL's column names are in quotes.
 *
 * @typedef {object} Elements
 * @property {number} a semi-major axis, au ("a")
 * @property {number} e eccentricity, dimensionless ("e"; JPL labels it rad)
 * @property {number} I inclination to the J2000 ecliptic, deg ("I")
 * @property {number} L mean longitude, deg ("L")
 * @property {number} varpi longitude of perihelion, deg ("long.peri.")
 * @property {number} Omega longitude of the ascending node, deg ("long.node.")
 */

/**
 * @typedef {object} Planet
 * @property {PlanetKey} key
 * @property {string} name display name
 * @property {Readonly<Elements>} elements values at J2000.0
 * @property {Readonly<Elements>} rates change per Julian century
 */

/**
 * One frozen planet entry from a Table 1 row pair, in JPL's column order
 * (a, e, I, L, long.peri., long.node.).
 *
 * @param {PlanetKey} key
 * @param {string} name
 * @param {readonly number[]} values the row at J2000.0
 * @param {readonly number[]} rates the rate row, per Julian century
 * @returns {Readonly<Planet>}
 */
function planet(key, name, values, rates) {
  if (values.length !== ELEMENT_COUNT || rates.length !== ELEMENT_COUNT) {
    throw new Error(
      `[kepler] ${key}: a Table 1 row needs ${ELEMENT_COUNT} values, got ${values.length} and ${rates.length} rates`,
    );
  }
  /** @type {(v: readonly number[]) => Readonly<Elements>} */
  const el = (v) => Object.freeze({ a: v[0], e: v[1], I: v[2], L: v[3], varpi: v[4], Omega: v[5] });
  return Object.freeze({ key, name, elements: el(values), rates: el(rates) });
}

/**
 * JPL Table 1, in order from the Sun: each planet's row at J2000.0, then its
 * rate row per Julian century, with the columns as printed:
 *   a (au)   e   I (deg)   L (deg)   long.peri. (deg)   long.node. (deg)
 * "Earth" is JPL's "EM Bary" row (see the header).
 *
 * @type {ReadonlyArray<Readonly<Planet>>}
 */
export const PLANETS = Object.freeze([
  planet('mercury', 'Mercury',
    [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
    [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]),
  planet('venus', 'Venus',
    [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
    [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]),
  planet('earth', 'Earth',
    [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]),
  planet('mars', 'Mars',
    [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]),
  planet('jupiter', 'Jupiter',
    [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]),
  planet('saturn', 'Saturn',
    [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]),
  planet('uranus', 'Uranus',
    [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
    [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]),
  planet('neptune', 'Neptune',
    [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]),
]);

/** @type {ReadonlyMap<string, Readonly<Planet>>} */
const BY_KEY = new Map(PLANETS.map((p) => [p.key, p]));

/**
 * The Table 1 entry for a key; throws on anything else.
 *
 * @param {string} key
 * @returns {Readonly<Planet>}
 */
function lookup(key) {
  const p = BY_KEY.get(key);
  if (!p) {
    throw new RangeError(
      `[kepler] unknown planet key "${key}"; expected one of ${[...BY_KEY.keys()].join(', ')}`,
    );
  }
  return p;
}

/**
 * Julian date from a Unix timestamp: JD = ms / 86400000 + 2440587.5. The
 * result is UTC-based (Unix time skips leap seconds); header step 1 shows why
 * that is close enough to JPL's TDB.
 *
 * @param {number} ms milliseconds since 1970-01-01T00:00:00Z, e.g. Date.now()
 * @returns {number} Julian date (days)
 */
export function julianDateFromUnixMs(ms) {
  if (!Number.isFinite(ms)) {
    throw new RangeError(`[kepler] julianDateFromUnixMs: ms must be finite, got ${ms}`);
  }
  return ms / MS_PER_DAY + JD_UNIX_EPOCH;
}

/**
 * Eccentric anomaly E solving Kepler's equation E - e sin E = M by bracketed
 * Newton iteration to |residual| < KEPLER_TOLERANCE (header, step 4). Any
 * finite M is accepted; the result solves the equation for the M given,
 * since E(M + 2 pi k) = E(M) + 2 pi k.
 *
 * @param {number} Mrad mean anomaly (rad)
 * @param {number} e eccentricity, 0 <= e < 1 (elliptic orbits only)
 * @returns {number} eccentric anomaly E (rad)
 * @throws {RangeError} for a non-finite M, or e outside [0, 1)
 * @throws {Error} if not converged after KEPLER_MAX_ITERATIONS steps
 */
export function solveKepler(Mrad, e) {
  if (!Number.isFinite(Mrad)) {
    throw new RangeError(`[kepler] solveKepler: M must be finite, got ${Mrad}`);
  }
  if (!(e >= 0 && e < 1)) {
    throw new RangeError(`[kepler] solveKepler: need 0 <= e < 1 (elliptic), got e = ${e}`);
  }
  // Reduce to (-pi, pi]: Mr = M - 2 pi k. Then solve for m = |Mr| in [0, pi].
  const k = Math.ceil((Mrad - Math.PI) / TWO_PI);
  const Mr = Mrad - TWO_PI * k;
  const sign = Mr < 0 ? -1 : 1;
  const m = Math.abs(Mr);
  let lo = m;
  let hi = m + e;
  let E = m + e * Math.sin(m);
  let residual = Number.NaN;
  for (let it = 0; it < KEPLER_MAX_ITERATIONS; it++) {
    residual = E - e * Math.sin(E) - m;
    if (Math.abs(residual) < KEPLER_TOLERANCE) return sign * E + TWO_PI * k;
    if (residual > 0) hi = E;
    else lo = E;
    const next = E - residual / (1 - e * Math.cos(E));
    E = next > lo && next < hi ? next : 0.5 * (lo + hi);
  }
  throw new Error(
    `[kepler] solveKepler: no convergence in ${KEPLER_MAX_ITERATIONS} steps ` +
      `(M = ${Mrad} rad, e = ${e}, E = ${E}, residual = ${residual} rad)`,
  );
}

/**
 * Unit vectors P (toward perihelion) and Q (90 deg further along the motion)
 * of an orbit, in the J2000 ecliptic frame: the first two columns of JPL's
 * rotation Rz(Omega) Rx(I) Rz(omega) (header, step 6).
 *
 * @typedef {object} OrbitBasis
 * @property {number} Px
 * @property {number} Py
 * @property {number} Pz
 * @property {number} Qx
 * @property {number} Qy
 * @property {number} Qz
 */

/**
 * @param {number} I inclination (rad)
 * @param {number} Omega longitude of the ascending node (rad)
 * @param {number} omega argument of perihelion (rad)
 * @returns {OrbitBasis}
 */
export function orbitBasis(I, Omega, omega) {
  const cw = Math.cos(omega);
  const sw = Math.sin(omega);
  const cO = Math.cos(Omega);
  const sO = Math.sin(Omega);
  const cI = Math.cos(I);
  const sI = Math.sin(I);
  return {
    Px: cw * cO - sw * sO * cI,
    Py: cw * sO + sw * cO * cI,
    Pz: sw * sI,
    Qx: -sw * cO - cw * sO * cI,
    Qy: -sw * sO + cw * cO * cI,
    Qz: cw * sI,
  };
}

/**
 * Osculating orbit of one planet at one date (header, steps 1-6).
 *
 * @typedef {object} OrbitState
 * @property {PlanetKey} key
 * @property {number} T Julian centuries from J2000.0
 * @property {number} a semi-major axis (au)
 * @property {number} e eccentricity
 * @property {number} b semi-minor axis a sqrt(1 - e^2) (au)
 * @property {number} I inclination (rad)
 * @property {number} Omega longitude of the ascending node (rad)
 * @property {number} omega argument of perihelion (rad)
 * @property {number} M mean anomaly, reduced to (-pi, pi] (rad)
 * @property {number} E eccentric anomaly at this date (rad)
 * @property {number} Px unit vector toward perihelion, ecliptic J2000
 * @property {number} Py
 * @property {number} Pz
 * @property {number} Qx unit vector 90 deg past perihelion along the motion
 * @property {number} Qy
 * @property {number} Qz
 */

/**
 * @param {PlanetKey} key
 * @param {number} jd Julian date (TDB; a UTC-based JD is fine, header step 1)
 * @returns {OrbitState}
 * @throws {RangeError} for an unknown key, a non-finite date, or a date so far
 *   outside the fit that a <= 0 or e leaves [0, 1)
 */
export function orbitalState(key, jd) {
  const p = lookup(key);
  if (!Number.isFinite(jd)) {
    throw new RangeError(`[kepler] ${key}: Julian date must be finite, got ${jd}`);
  }
  const T = (jd - JD_J2000) / DAYS_PER_CENTURY;
  const el = p.elements;
  const rt = p.rates;
  const a = el.a + rt.a * T;
  const e = el.e + rt.e * T;
  const Ideg = el.I + rt.I * T;
  const L = el.L + rt.L * T;
  const varpi = el.varpi + rt.varpi * T;
  const OmegaDeg = el.Omega + rt.Omega * T;
  if (!(a > 0 && e >= 0 && e < 1)) {
    throw new RangeError(
      `[kepler] ${key} at JD ${jd} (T = ${T} centuries): elements left the elliptic range, a = ${a} au, e = ${e}`,
    );
  }
  // M = L - varpi, reduced to (-180, 180] deg.
  const Mdeg = L - varpi;
  const M = (Mdeg - DEG_PER_REV * Math.ceil((Mdeg - DEG_PER_REV / 2) / DEG_PER_REV)) * DEG;
  const I = Ideg * DEG;
  const Omega = OmegaDeg * DEG;
  const omega = (varpi - OmegaDeg) * DEG;
  return {
    key: p.key,
    T,
    a,
    e,
    b: a * Math.sqrt(1 - e * e),
    I,
    Omega,
    omega,
    M,
    E: solveKepler(M, e),
    ...orbitBasis(I, Omega, omega),
  };
}

/**
 * Position on the osculating ellipse of `st` at eccentric anomaly E, written
 * into out[offset], out[offset + 1], out[offset + 2] without allocating:
 * r = x' P + y' Q with x' = a (cos E - e), y' = b sin E (header, steps 5-6).
 *
 * @param {OrbitState} st
 * @param {number} E eccentric anomaly (rad)
 * @param {Float64Array | number[]} out receives x, y, z (au)
 * @param {number} [offset] index of x in `out` (default 0)
 */
export function orbitPoint(st, E, out, offset = 0) {
  const xp = st.a * (Math.cos(E) - st.e);
  const yp = st.b * Math.sin(E);
  out[offset] = xp * st.Px + yp * st.Qx;
  out[offset + 1] = xp * st.Py + yp * st.Qy;
  out[offset + 2] = xp * st.Pz + yp * st.Qz;
}

/**
 * Heliocentric position of a planet, mean ecliptic and equinox of J2000.
 *
 * @param {PlanetKey} key
 * @param {number} jd Julian date
 * @returns {{ x: number, y: number, z: number }} position (au)
 */
export function planetPosition(key, jd) {
  const st = orbitalState(key, jd);
  const xp = st.a * (Math.cos(st.E) - st.e);
  const yp = st.b * Math.sin(st.E);
  return {
    x: xp * st.Px + yp * st.Qx,
    y: xp * st.Py + yp * st.Qy,
    z: xp * st.Pz + yp * st.Qz,
  };
}

/**
 * The osculating ellipse at `jd` as a closed polyline: `samples` points at
 * E = 2 pi k / samples, k = 0 .. samples - 1. Point 0 is perihelion and the
 * last point joins back to it. Steps in E are shortest in arc length
 * (ds/dE = a sqrt(1 - e^2 cos^2 E), b at E = 0 and pi) at the ends of the
 * major axis, where the ellipse bends hardest.
 *
 * @param {PlanetKey} key
 * @param {number} jd Julian date
 * @param {number} samples number of points, an integer >= 3
 * @returns {Float64Array} [x0, y0, z0, x1, y1, z1, ...] in au, length samples * 3
 */
export function orbitPath(key, jd, samples) {
  if (!Number.isInteger(samples) || samples < 3) {
    throw new RangeError(`[kepler] orbitPath: samples must be an integer >= 3, got ${samples}`);
  }
  const st = orbitalState(key, jd);
  const out = new Float64Array(samples * 3);
  for (let k = 0; k < samples; k++) orbitPoint(st, (TWO_PI * k) / samples, out, 3 * k);
  return out;
}

/**
 * Sidereal period from Table 1's mean-longitude rate. L gains 360 deg per
 * orbit, so P = 360 / (Ldot / 36525) days with Ldot in deg per Julian
 * century. The frame is tied to the fixed J2000 equinox, so no precession
 * enters.
 *
 * @param {PlanetKey} key
 * @returns {number} period (days)
 */
export function siderealPeriodDays(key) {
  return (DEG_PER_REV * DAYS_PER_CENTURY) / lookup(key).rates.L;
}

/**
 * Turn an equatorial (ICRF / J2000) vector into the J2000 ecliptic frame, the
 * inverse of JPL's step-6 equatorial rotation (header, "Saturn's ring
 * plane").
 *
 * @param {number} x equatorial x (toward the equinox)
 * @param {number} y equatorial y
 * @param {number} z equatorial z (toward the celestial north pole)
 * @returns {{ x: number, y: number, z: number }} the same vector, ecliptic J2000
 */
export function eclipticFromEquatorial(x, y, z) {
  const eps = (OBLIQUITY_J2000_ARCSEC / ARCSEC_PER_DEG) * DEG;
  const c = Math.cos(eps);
  const s = Math.sin(eps);
  return { x, y: c * y + s * z, z: -s * y + c * z };
}

/**
 * Unit vector along Saturn's north pole, which is the normal of its ring
 * plane, in the J2000 ecliptic frame (header, "Saturn's ring plane").
 *
 * @type {Readonly<{ x: number, y: number, z: number }>}
 */
export const SATURN_POLE_ECLIPTIC = Object.freeze(
  eclipticFromEquatorial(
    Math.cos(SATURN_POLE_DEC_DEG * DEG) * Math.cos(SATURN_POLE_RA_DEG * DEG),
    Math.cos(SATURN_POLE_DEC_DEG * DEG) * Math.sin(SATURN_POLE_RA_DEG * DEG),
    Math.sin(SATURN_POLE_DEC_DEG * DEG),
  ),
);
