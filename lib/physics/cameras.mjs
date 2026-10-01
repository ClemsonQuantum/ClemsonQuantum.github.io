// @ts-check
/**
 * Camera bases for the site's 3D figures, kept in one place so
 * scripts/verify-cameras.mjs can check that every one is a proper,
 * right-handed rotation seen from the side it claims (a mirrored camera
 * shipped once in BlochSphere.tsx and no test could see it).
 *
 * Convention: a camera is three orthonormal row vectors in scene
 * coordinates: right (screen x), up (screen y, pointing up), and toward (out
 * of the screen, at the viewer). Right-handed means right x up = toward, or
 * det[right; up; toward] = +1. A point p lands on screen at
 * (right . p, up . p) with y up, and toward . p is its depth (larger =
 * nearer).
 *
 * Perspective (projectPerspective, orbitScreenExtents)
 * ----------
 * 1. Projection. A pinhole camera sits at distance D along +toward from the
 *    origin, looking back at it. A point p with camera coordinates
 *    (u, v, w) = (right . p, up . p, toward . p) lies D - w in front of the
 *    pinhole, so by similar triangles it shows at s (u, v) in the reference
 *    plane through the origin (w = 0), with s = D / (D - w). Points in that
 *    plane keep s = 1, nearer ones (w > 0) grow, farther ones shrink, and
 *    s -> 1 for every point as D -> infinity (the orthographic view above).
 *    The formula needs w < D: the point in front of the camera. Canvas y
 *    runs DOWN, so the screen offset from the projected origin is
 *    (dx, dy) = (s R u, -s R v) for R pixels per scene unit at w = 0.
 * 2. Orbit extents. A circular orbit p(E) = a (cos E P + sin E Q), with P and
 *    Q from kepler.mjs orbitBasis, has camera coordinates linear in
 *    (cos E, sin E): v(E) = a (vP cos E + vQ sin E) with vP = up . P and
 *    vQ = up . Q, and likewise u(E) and w(E). The screen height is dy = -f
 *    with f = v / (D - w), and
 *      f' (D - w)^2 = v' (D - w) + v w' = a D (vQ cos E - vP sin E) + a^2 (vP wQ - vQ wP),
 *    since the cos E sin E terms cancel and cos^2 E + sin^2 E = 1. Writing
 *    vQ cos E - vP sin E = Rv cos(E + psi), Rv = hypot(vP, vQ),
 *    psi = atan2(vP, vQ), f is stationary exactly at
 *      E = -psi +- arccos(k),   k = a (vQ wP - vP wQ) / (D Rv).
 *    By Cauchy-Schwarz |vQ wP - vP wQ| <= Rv hypot(wP, wQ), so
 *    |k| <= a hypot(wP, wQ) / D < 1 whenever the orbit's deepest point (depth
 *    a hypot(wP, wQ)) is in front of the camera; the two roots are then the
 *    top and the bottom. The same algebra with u gives the left and right
 *    edges. orbitScreenExtents projects these four points, so its extents
 *    are exact to rounding; its evenly spaced samples only cover the
 *    degenerate case Rv = 0 (a coordinate that is identically 0). Limits: as
 *    D -> infinity, k -> 0 and the extents become the orthographic half-axes
 *    a Rv and a Ru; a face-on orbit (toward = P x Q) has w = 0 and shows as
 *    the circle of radius a.
 */

/**
 * @typedef {object} CameraBasis
 * @property {[number, number, number]} u screen right, in scene coordinates
 * @property {[number, number, number]} v screen up
 * @property {[number, number, number]} w toward the viewer (u x v)
 */

/** The entangled-qubit Bloch spheres: blochCamera's elevation and azimuth
 * (rad). */
export const QUBIT_VIEW_ELEVATION = 0.35; // ~20 deg above the equator
export const QUBIT_VIEW_AZIMUTH = 0.6; // ~34 deg about +z

// The learning-resources sphere's camera lives in lib/blochSphere.mjs so the
// live page doesn't load this module; re-exported for verify-cameras.mjs.
export { BLOCH_SPHERE_TILT, blochSphereCamera } from '../blochSphere.mjs';

/**
 * Textbook Bloch-sphere camera: `elevation` above the equator, turned by
 * `azimuth` about +z, so +x points toward the viewer's lower left, +y to
 * the right, and +z up.
 *   u = (-sin az, cos az, 0)
 *   v = (-sin el cos az, -sin el sin az, cos el)
 *   w = u x v = (cos el cos az, cos el sin az, sin el)
 *
 * @param {number} elevation rad
 * @param {number} azimuth rad
 * @returns {CameraBasis}
 */
export function blochCamera(elevation, azimuth) {
  const se = Math.sin(elevation);
  const ce = Math.cos(elevation);
  const sa = Math.sin(azimuth);
  const ca = Math.cos(azimuth);
  return {
    u: [-sa, ca, 0],
    v: [-se * ca, -se * sa, ce],
    w: [ce * ca, ce * sa, se],
  };
}

/**
 * Orrery camera (the committee's planetary system, committeeSystem.ts): the
 * ecliptic turned by `yaw` about +z, seen from
 * `elevation` above it. Writes the rows (right, up, toward) into `out`.
 *   right  = (cos y, -sin y, 0)
 *   up     = (sin e sin y, sin e cos y, cos e)
 *   toward = (-cos e sin y, -cos e cos y, sin e)
 *
 * @param {number} yaw rad
 * @param {number} elevation rad (> 0: above the ecliptic's north side)
 * @param {Float64Array} [out] 9 entries, row-major
 * @returns {Float64Array}
 */
export function orreryView(yaw, elevation, out = new Float64Array(9)) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const ce = Math.cos(elevation);
  const se = Math.sin(elevation);
  out[0] = c;
  out[1] = -s;
  out[2] = 0;
  out[3] = se * s;
  out[4] = se * c;
  out[5] = ce;
  out[6] = -ce * s;
  out[7] = -ce * c;
  out[8] = se;
  return out;
}

/**
 * View rotation for the hydrogen atom (components/scq4/atomRenderer.ts).
 * Atom coordinates (X, Y, Z) have Z along the orbital's symmetry axis.
 * M = Elev * Yaw * Tilt:
 *   Tilt: about X by `tilt` (lean the axis toward the viewer)
 *   Yaw:  about the vertical by `yaw` (the slow turn)
 *   Elev: about X by `elev` (seen from slightly above)
 * View space is x right, y up, z toward the viewer: (X', Z', -Y') of M p.
 * The permutation (x, y, z) -> (x, z, -y) has determinant +1, so the result
 * is a proper rotation.
 *
 * @param {number} tilt rad
 * @param {number} yaw rad
 * @param {number} elev rad
 * @returns {Float32Array} 3x3, column-major (for GLSL mat3)
 */
export function atomRotation(tilt, yaw, elev) {
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const ce = Math.cos(elev);
  const se = Math.sin(elev);
  // Yaw * Tilt, rows.
  const yt = [
    [cy, -sy * ct, sy * st],
    [sy, cy * ct, -cy * st],
    [0, st, ct],
  ];
  // Elev * (Yaw * Tilt), rows.
  const m = [
    yt[0],
    [0, 1, 2].map((j) => ce * yt[1][j] - se * yt[2][j]),
    [0, 1, 2].map((j) => se * yt[1][j] + ce * yt[2][j]),
  ];
  const view = [m[0], m[2], m[1].map((v) => -v)];
  // Column-major for GLSL: column j is (view[0][j], view[1][j], view[2][j]).
  return new Float32Array([
    view[0][0], view[1][0], view[2][0],
    view[0][1], view[1][1], view[2][1],
    view[0][2], view[1][2], view[2][2],
  ]);
}

// ---------------------------------------------------------------------------
// Perspective (header, perspective points 1 and 2).
// ---------------------------------------------------------------------------

/** Entries of a row-major 3x3 view (rows right, up, toward). */
const VIEW_ENTRIES = 9;
/** Entries of a projectPerspective result: dx, dy, depth, scale. */
const PROJECTION_ENTRIES = 4;
/** Fewest guard samples orbitScreenExtents accepts. */
const MIN_ORBIT_SAMPLES = 3;
const TWO_PI = 2 * Math.PI;

/**
 * @param {ArrayLike<number>} view
 * @param {string} fn caller, for the message
 */
function checkView(view, fn) {
  if (!view || view.length !== VIEW_ENTRIES) {
    throw new RangeError(`[cameras] ${fn}: view must hold ${VIEW_ENTRIES} row-major entries, got ${view ? view.length : view}`);
  }
}

/**
 * Perspective projection (header, perspective point 1): the camera sits
 * `distance` scene units along +toward from the origin, looking back at it.
 *
 * @param {ArrayLike<number>} view rows (right, up, toward), row-major, 9
 *   entries, e.g. from orreryView
 * @param {number} x scene point (scene units)
 * @param {number} y
 * @param {number} z
 * @param {number} distance camera distance from the origin (scene units),
 *   finite and > 0
 * @param {number} radiusPx pixels per scene unit in the reference plane
 *   through the origin (depth 0), finite and >= 0 (0, a layout with no room,
 *   puts every point on the projected origin)
 * @param {Float64Array} [out] receives the result (4 entries); allocated if
 *   omitted
 * @returns {Float64Array} [dx, dy, depth, scale]: the screen offset from the
 *   projected origin (px, y DOWN as on a canvas), depth = toward . p (scene
 *   units, larger = nearer) and scale = distance / (distance - depth) (1 at
 *   depth 0, > 1 nearer, < 1 farther)
 * @throws {RangeError} if the point is at or behind the camera
 *   (depth >= distance) or its depth is not finite, for a distance that is
 *   not finite and positive, a radiusPx that is negative or not finite, or a
 *   view without 9 entries
 */
export function projectPerspective(view, x, y, z, distance, radiusPx, out = new Float64Array(PROJECTION_ENTRIES)) {
  checkView(view, 'projectPerspective');
  if (!(Number.isFinite(distance) && distance > 0)) {
    throw new RangeError(`[cameras] projectPerspective: distance must be finite and > 0, got ${distance}`);
  }
  if (!(Number.isFinite(radiusPx) && radiusPx >= 0)) {
    throw new RangeError(`[cameras] projectPerspective: radiusPx must be finite and >= 0, got ${radiusPx}`);
  }
  const depth = view[6] * x + view[7] * y + view[8] * z;
  if (!(Number.isFinite(depth) && depth < distance)) {
    throw new RangeError(
      `[cameras] projectPerspective: point (${x}, ${y}, ${z}) has depth ${depth}; ` +
        `it must be in front of the camera at distance ${distance}`,
    );
  }
  const scale = distance / (distance - depth);
  const k = scale * radiusPx;
  out[0] = k * (view[0] * x + view[1] * y + view[2] * z);
  out[1] = -k * (view[3] * x + view[4] * y + view[5] * z);
  out[2] = depth;
  out[3] = scale;
  return out;
}

/**
 * @typedef {object} ScreenExtents
 * @property {number} top smallest (most negative) dy: the orbit's highest
 *   point on screen, y down
 * @property {number} bottom largest dy: its lowest point
 * @property {number} halfWidth largest |dx|
 */

/**
 * Screen extents of a circular orbit of radius `a` about the origin, in the
 * plane of P and Q, projected by projectPerspective with radiusPx = 1 (so in
 * scene units at the reference plane; multiply by the pixel scale), screen y
 * down (header, perspective point 2). Exact to rounding: the top, bottom and
 * side edges are found in closed form, and `samples` evenly spaced points
 * cover the degenerate case of a screen coordinate that is identically 0.
 *
 * @param {ArrayLike<number>} view rows (right, up, toward), row-major, 9
 *   entries, e.g. from orreryView
 * @param {import('./kepler.mjs').OrbitBasis} basis the orbit plane's P and Q
 *   (kepler.mjs orbitBasis); the orbit point at angle E is
 *   a (cos E P + sin E Q)
 * @param {number} a orbit radius (scene units), finite and > 0
 * @param {number} distance camera distance from the origin (scene units),
 *   greater than the orbit's deepest point
 * @param {number} samples evenly spaced guard samples, an integer >= 3
 * @returns {ScreenExtents} offsets from the projected origin (the orbit's
 *   centre)
 * @throws {RangeError} for a bad view, a, samples or basis, or if part of the
 *   orbit is at or behind the camera
 */
export function orbitScreenExtents(view, basis, a, distance, samples) {
  checkView(view, 'orbitScreenExtents');
  if (!(Number.isFinite(a) && a > 0)) {
    throw new RangeError(`[cameras] orbitScreenExtents: radius a must be finite and > 0, got ${a}`);
  }
  if (!(Number.isInteger(samples) && samples >= MIN_ORBIT_SAMPLES)) {
    throw new RangeError(`[cameras] orbitScreenExtents: samples must be an integer >= ${MIN_ORBIT_SAMPLES}, got ${samples}`);
  }
  const { Px, Py, Pz, Qx, Qy, Qz } = basis;
  if (![Px, Py, Pz, Qx, Qy, Qz].every(Number.isFinite)) {
    throw new RangeError(`[cameras] orbitScreenExtents: basis must be finite, got P = (${Px}, ${Py}, ${Pz}), Q = (${Qx}, ${Qy}, ${Qz})`);
  }
  // Components of P and Q along the view row starting at entry r.
  /** @param {number} r @returns {[number, number]} */
  const along = (r) => [
    view[r] * Px + view[r + 1] * Py + view[r + 2] * Pz,
    view[r] * Qx + view[r + 1] * Qy + view[r + 2] * Qz,
  ];
  const [uP, uQ] = along(0);
  const [vP, vQ] = along(3);
  const [wP, wQ] = along(6);
  const deepest = a * Math.hypot(wP, wQ);
  if (!(Number.isFinite(distance) && deepest < distance)) {
    throw new RangeError(
      `[cameras] orbitScreenExtents: the orbit of radius ${a} reaches depth ${deepest}; ` +
        `the camera distance (${distance}) must exceed it`,
    );
  }
  const out = new Float64Array(PROJECTION_ENTRIES);
  let top = Infinity;
  let bottom = -Infinity;
  let halfWidth = 0;
  /** @param {number} E orbit angle (rad) */
  const visit = (E) => {
    const c = Math.cos(E);
    const s = Math.sin(E);
    projectPerspective(view, a * (c * Px + s * Qx), a * (c * Py + s * Qy), a * (c * Pz + s * Qz), distance, 1, out);
    top = Math.min(top, out[1]);
    bottom = Math.max(bottom, out[1]);
    halfWidth = Math.max(halfWidth, Math.abs(out[0]));
  };
  for (let k = 0; k < samples; k++) visit((TWO_PI * k) / samples);
  // Closed-form stationary points of v / (D - w), then of u / (D - w).
  /** @type {[number, number][]} */
  const screenAxes = [
    [vP, vQ],
    [uP, uQ],
  ];
  for (const [cP, cQ] of screenAxes) {
    const reach = Math.hypot(cP, cQ);
    if (!(reach > 0)) continue; // identically 0 on screen: the samples hold it
    const kappa = (a * (cQ * wP - cP * wQ)) / (distance * reach); // k in the header
    if (!(Math.abs(kappa) <= 1)) continue; // |k| < 1 in exact arithmetic (header)
    const psi = Math.atan2(cP, cQ);
    const spread = Math.acos(kappa);
    visit(-psi + spread);
    visit(-psi - spread);
  }
  return { top, bottom, halfWidth };
}
