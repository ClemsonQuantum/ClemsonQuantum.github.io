// @ts-check
/**
 * Camera checks for the site's 3D figures (lib/physics/cameras.mjs).
 * Run: node scripts/verify-cameras.mjs   (also part of npm run verify:physics)
 *
 * Every camera must be a proper rotation seen from the side it claims:
 *  1. Orthonormal rows, and det[right; up; toward] = +1 (no mirror).
 *  2. The viewer sits where the figure says (above the equator or ecliptic:
 *     toward . z > 0).
 *  3. A positive turn about +z (increasing Bloch phi, prograde orbits) runs
 *     counterclockwise on screen, as seen from the north.
 *  4. Figure-specific directions: the textbook Bloch view (the entangled
 *     qubits) puts +x at the lower left; the atom's symmetry axis leans
 *     toward the viewer.
 *  5. projectPerspective: scale 1 at depth 0, the orthographic limit, nearer
 *     points larger, screen y down, and RangeError at or behind the camera.
 *  6. orbitScreenExtents against a 20000-sample brute force for random
 *     orbits, views and distances; the face-on, edge-on and orthographic
 *     limits in closed form.
 * Random cases come from a seeded PRNG (mulberry32); the seed is printed in
 * the [setup] line.
 * Fails loudly (non-zero exit) on the first violation.
 */

import assert from 'node:assert/strict';
import {
  BLOCH_SPHERE_TILT,
  QUBIT_VIEW_AZIMUTH,
  QUBIT_VIEW_ELEVATION,
  atomRotation,
  blochCamera,
  blochSphereCamera,
  orbitScreenExtents,
  orreryView,
  projectPerspective,
} from '../lib/physics/cameras.mjs';
import { orbitBasis } from '../lib/physics/kepler.mjs';

const TOL = 1e-12;
const TOL_F32 = 1e-6; // atomRotation returns float32
const STEPS = 6;
let step = 0;
/** @param {string} msg */
const log = (msg) => console.log(`[${++step}/${STEPS}] ${msg}`);

const SEED = 20260930;
const TRIALS = 200; // random orbits / views per check
const BRUTE_SAMPLES = 20000; // brute-force orbit samples
/**
 * mulberry32: small, seedable 32-bit PRNG with values in [0, 1).
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
const rand = mulberry32(SEED);
console.log(`[setup] cameras: seed ${SEED}, ${TRIALS} random cases per check, brute force ${BRUTE_SAMPLES} orbit samples`);

/** @typedef {[number, number, number]} V3 */

/** @param {V3} a @param {V3} b */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** @param {V3} a @param {V3} b @returns {V3} */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Checks 1-3 for a camera given as rows (right, up, toward).
 * @param {string} name
 * @param {V3} right
 * @param {V3} up
 * @param {V3} toward
 * @param {number} tol
 */
function checkCamera(name, right, up, toward, tol) {
  for (const [label, v] of /** @type {[string, V3][]} */ ([['right', right], ['up', up], ['toward', toward]])) {
    assert.ok(Math.abs(dot(v, v) - 1) < tol, `${name}: |${label}| = ${Math.sqrt(dot(v, v))}`);
  }
  assert.ok(Math.abs(dot(right, up)) < tol, `${name}: right . up = ${dot(right, up)}`);
  assert.ok(Math.abs(dot(right, toward)) < tol, `${name}: right . toward = ${dot(right, toward)}`);
  assert.ok(Math.abs(dot(up, toward)) < tol, `${name}: up . toward = ${dot(up, toward)}`);
  const det = dot(cross(right, up), toward);
  assert.ok(Math.abs(det - 1) < tol, `${name}: det[right; up; toward] = ${det} (a mirror if -1)`);
  assert.ok(toward[2] > 0, `${name}: the viewer is not above the equator (toward . z = ${toward[2]})`);
  // Signed area of the projected unit circle in the z = 0 plane, traced by
  // increasing angle about +z: positive = counterclockwise with y up.
  const N = 360;
  let area = 0;
  for (let k = 0; k < N; k++) {
    const a0 = (2 * Math.PI * k) / N;
    const a1 = (2 * Math.PI * (k + 1)) / N;
    /** @type {V3} */
    const p0 = [Math.cos(a0), Math.sin(a0), 0];
    /** @type {V3} */
    const p1 = [Math.cos(a1), Math.sin(a1), 0];
    area += 0.5 * (dot(right, p0) * dot(up, p1) - dot(right, p1) * dot(up, p0));
  }
  assert.ok(area > 0, `${name}: a positive turn about +z runs clockwise on screen (signed area ${area})`);
  return area;
}

// 1. The entangled-qubit spheres: the textbook Bloch view.
{
  const { u, v, w } = blochCamera(QUBIT_VIEW_ELEVATION, QUBIT_VIEW_AZIMUTH);
  checkCamera('qubit Bloch view', u, v, w, TOL);
  /** @type {V3} */
  const xAxis = [1, 0, 0];
  assert.ok(dot(xAxis, u) < 0 && dot(xAxis, v) < 0, 'qubit Bloch view: +x should point to the lower left');
  assert.ok(dot([0, 1, 0], u) > 0, 'qubit Bloch view: +y should point right');
  assert.ok(dot([0, 0, 1], v) > 0, 'qubit Bloch view: +z should point up');
  for (const el of [0.1, 0.35, 1.2]) {
    for (const az of [-2, -0.5, 0, 0.6, 2.5]) {
      const c = blochCamera(el, az);
      checkCamera(`blochCamera(${el}, ${az})`, c.u, c.v, c.w, TOL);
    }
  }
}
log('qubit Bloch view: right-handed, seen from above the equator, +x lower left, phi counterclockwise');

// 2. Learning-resources Bloch sphere: blochCamera(tilt, -pi/2) with exact axes.
{
  const { u, v, w } = blochSphereCamera(BLOCH_SPHERE_TILT);
  checkCamera('Bloch sphere', u, v, w, TOL);
  const ref = blochCamera(BLOCH_SPHERE_TILT, -Math.PI / 2);
  for (const [a, b] of [[u, ref.u], [v, ref.v], [w, ref.w]]) {
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(a[i] - b[i]) < TOL, 'Bloch sphere: basis differs from blochCamera(tilt, -pi/2)');
  }
}
log('learning-resources Bloch sphere: right-handed, camera on -y above the equator, phi counterclockwise');

// 3. Orrery: north up, prograde counterclockwise, at any yaw.
for (const el of [0.2, 0.5, 1.4]) {
  for (const yaw of [-1, 0, 0.7, 3]) {
    const m = orreryView(yaw, el);
    /** @type {V3} */
    const right = [m[0], m[1], m[2]];
    /** @type {V3} */
    const up = [m[3], m[4], m[5]];
    /** @type {V3} */
    const toward = [m[6], m[7], m[8]];
    checkCamera(`orreryView(${yaw}, ${el})`, right, up, toward, TOL);
    assert.ok(up[2] > 0, `orrery: ecliptic north should point up the screen (yaw ${yaw}, el ${el})`);
  }
}
log('orrery: right-handed, north up, prograde orbits counterclockwise at every yaw and elevation');

// 4. Atom: a proper rotation; its symmetry axis leans toward the viewer.
for (const tilt of [0.1, 0.4, 1]) {
  for (const yaw of [0, 0.8, 2, 5]) {
    for (const elev of [0, 0.22, 0.5]) {
      const M = atomRotation(tilt, yaw, elev); // column-major
      /** @param {number} r @returns {V3} */
      const row = (r) => [M[r], M[3 + r], M[6 + r]];
      const right = row(0);
      const up = row(1);
      const toward = row(2);
      for (const [label, v] of /** @type {[string, V3][]} */ ([['x', right], ['y', up], ['z', toward]])) {
        assert.ok(Math.abs(dot(v, v) - 1) < TOL_F32, `atom (${tilt}, ${yaw}, ${elev}): row ${label} not unit`);
      }
      const det = dot(cross(right, up), toward);
      assert.ok(Math.abs(det - 1) < TOL_F32, `atom (${tilt}, ${yaw}, ${elev}): det ${det}`);
    }
  }
  // With no yaw or elevation, the axis (atom Z) is tipped toward the viewer.
  const M = atomRotation(tilt, 0, 0);
  const axisToward = M[8]; // view z of atom Z (column 2, row 2)
  assert.ok(axisToward > 0, `atom: the symmetry axis leans away from the viewer at tilt ${tilt}`);
}
log('atom: proper rotations (det +1) at every tilt, yaw and elevation; the symmetry axis leans toward the viewer');

/**
 * Row r (0 right, 1 up, 2 toward) of a row-major view.
 * @param {ArrayLike<number>} m
 * @param {number} r
 * @returns {V3}
 */
const viewRow = (m, r) => [m[3 * r], m[3 * r + 1], m[3 * r + 2]];
/**
 * A uniform random point in the ball of radius `radius`.
 * @param {number} radius
 * @returns {V3}
 */
const randomInBall = (radius) => {
  for (;;) {
    /** @type {V3} */
    const p = [2 * rand() - 1, 2 * rand() - 1, 2 * rand() - 1];
    if (dot(p, p) <= 1) return [radius * p[0], radius * p[1], radius * p[2]];
  }
};
/** @param {V3} a @param {number} s @param {V3} b @returns {V3} a + s b */
const axpy = (a, s, b) => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]];

// 5. projectPerspective (cameras.mjs header, perspective point 1).
const ORTHO_DISTANCE = 1e9;
const TOL_ORTHO = 1e-9; // relative; the points below have |p| <= 0.5, so |w| / (D - w) <= 5e-10
{
  const out = new Float64Array(4);
  for (let trial = 0; trial < TRIALS; trial++) {
    const view = orreryView((2 * rand() - 1) * Math.PI, 0.05 + 1.5 * rand());
    const right = viewRow(view, 0);
    const up = viewRow(view, 1);
    const toward = viewRow(view, 2);
    const R = 50 + 400 * rand();
    const D = 2 + 5 * rand();
    // In the reference plane (depth 0): scale 1, offset R (u, -v), screen y down.
    const alpha = 2 * rand() - 1;
    const beta = 2 * rand() - 1;
    const p0 = axpy(axpy([0, 0, 0], alpha, right), beta, up);
    projectPerspective(view, p0[0], p0[1], p0[2], D, R, out);
    assert.ok(Math.abs(out[3] - 1) < TOL && Math.abs(out[2]) < TOL, `depth 0 must keep scale 1, got scale ${out[3]}, depth ${out[2]}`);
    assert.ok(Math.abs(out[0] - R * alpha) < TOL * R, `dx ${out[0]} != R u = ${R * alpha}`);
    assert.ok(Math.abs(out[1] + R * beta) < TOL * R, `dy ${out[1]} != -R v = ${-R * beta} (screen y runs down)`);
    // Orthographic limit: a far camera reproduces (R u, -R v).
    const p = randomInBall(0.5);
    projectPerspective(view, p[0], p[1], p[2], ORTHO_DISTANCE, R, out);
    const size = R * Math.hypot(p[0], p[1], p[2]);
    assert.ok(Math.abs(out[0] - R * dot(right, p)) <= TOL_ORTHO * size, `orthographic limit, dx: ${out[0]} vs ${R * dot(right, p)}`);
    assert.ok(Math.abs(out[1] + R * dot(up, p)) <= TOL_ORTHO * size, `orthographic limit, dy: ${out[1]} vs ${-R * dot(up, p)}`);
    // Nearer than the origin projects larger, by exactly D / (D - h).
    const h = 0.9 * D * rand();
    const nearPt = axpy(p0, h, toward);
    const farPt = axpy(p0, -h, toward);
    const near = projectPerspective(view, nearPt[0], nearPt[1], nearPt[2], D, R);
    const far = projectPerspective(view, farPt[0], farPt[1], farPt[2], D, R);
    assert.ok(Math.abs(near[3] - D / (D - h)) < TOL * near[3] && Math.abs(far[3] - D / (D + h)) < TOL, `scales ${near[3]}, ${far[3]} at depth +-${h}`);
    assert.ok(near[3] >= 1 && far[3] <= 1 && Math.hypot(near[0], near[1]) >= Math.hypot(far[0], far[1]), 'a nearer point must project larger');
  }
  // At or behind the camera (the identity view, so depth = z exactly).
  const identity = Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
  assert.equal(projectPerspective(identity, 0, 0, 1.999, 2, 1)[3] > 1, true, 'a point just in front of the camera projects');
  assert.throws(() => projectPerspective(identity, 0, 0, 2, 2, 1), RangeError, 'a point at the camera must throw');
  assert.throws(() => projectPerspective(identity, 0.3, 0.1, 3, 2, 1), RangeError, 'a point behind the camera must throw');
  assert.throws(() => projectPerspective(identity, Number.NaN, 0, 0, 2, 1), RangeError, 'a NaN point must throw');
  for (const d of [0, -1, Number.NaN, Infinity]) {
    assert.throws(() => projectPerspective(identity, 0, 0, 0, d, 1), RangeError, `distance ${d} must throw`);
  }
  for (const r of [-2, Number.NaN, Infinity]) {
    assert.throws(() => projectPerspective(identity, 0, 0, 0, 2, r), RangeError, `radiusPx ${r} must throw`);
  }
  // A layout with no room (radiusPx = 0) is allowed: every point lands on the origin.
  const collapsed = projectPerspective(identity, 0.4, -0.7, 0.5, 2, 0);
  assert.ok(collapsed[0] === 0 && collapsed[1] === 0 && collapsed[2] === 0.5 && collapsed[3] === 2 / 1.5, `radiusPx 0: ${collapsed}`);
  assert.throws(() => projectPerspective(new Float64Array(8), 0, 0, 0, 2, 1), RangeError, 'a short view must throw');
}
log(`projectPerspective: scale 1 at depth 0, screen y down, orthographic within ${TOL_ORTHO} at D = ${ORTHO_DISTANCE}, nearer points larger by D/(D - h), RangeError at or behind the camera`);

// 6. orbitScreenExtents (cameras.mjs header, perspective point 2).
const TOL_BRUTE = 1e-6; // relative; 20000 samples miss a smooth extremum by ~1e-8
/**
 * Brute-force extents: many evenly spaced orbit points through projectPerspective.
 * @param {Float64Array} view
 * @param {import('../lib/physics/kepler.mjs').OrbitBasis} b
 * @param {number} a
 * @param {number} D
 * @param {number} n
 */
function bruteExtents(view, b, a, D, n) {
  const out = new Float64Array(4);
  let top = Infinity;
  let bottom = -Infinity;
  let halfWidth = 0;
  for (let k = 0; k < n; k++) {
    const E = (2 * Math.PI * k) / n;
    const c = Math.cos(E);
    const s = Math.sin(E);
    projectPerspective(view, a * (c * b.Px + s * b.Qx), a * (c * b.Py + s * b.Qy), a * (c * b.Pz + s * b.Qz), D, 1, out);
    top = Math.min(top, out[1]);
    bottom = Math.max(bottom, out[1]);
    halfWidth = Math.max(halfWidth, Math.abs(out[0]));
  }
  return { top, bottom, halfWidth };
}
{
  let worst = 0;
  for (let trial = 0; trial < TRIALS; trial++) {
    const basis = orbitBasis(Math.PI * rand(), 2 * Math.PI * rand(), 2 * Math.PI * rand());
    const view = orreryView((2 * rand() - 1) * Math.PI, (2 * rand() - 1) * 1.5);
    const a = 0.2 + 3 * rand();
    const D = a * (1.05 + 8 * rand()); // beyond the orbit's deepest point (<= a)
    const ours = orbitScreenExtents(view, basis, a, D, 16);
    const brute = bruteExtents(view, basis, a, D, BRUTE_SAMPLES);
    const size = Math.max(Math.abs(brute.top), Math.abs(brute.bottom), brute.halfWidth);
    for (const key of /** @type {const} */ (['top', 'bottom', 'halfWidth'])) {
      const rel = Math.abs(ours[key] - brute[key]) / size;
      worst = Math.max(worst, rel);
      assert.ok(rel < TOL_BRUTE, `trial ${trial}: ${key} ${ours[key]} vs brute force ${brute[key]} (relative ${rel})`);
    }
    // The closed form finds the true extremes, so the samples never lie outside them,
    // and the guard-sample count does not matter.
    assert.ok(
      ours.top <= brute.top + TOL * size && ours.bottom >= brute.bottom - TOL * size && ours.halfWidth >= brute.halfWidth - TOL * size,
      `trial ${trial}: brute-force samples lie outside the closed-form extents`,
    );
    const coarse = orbitScreenExtents(view, basis, a, D, 3);
    for (const key of /** @type {const} */ (['top', 'bottom', 'halfWidth'])) {
      assert.ok(Math.abs(coarse[key] - ours[key]) < TOL * size, `trial ${trial}: ${key} depends on the sample count`);
    }
  }
  // Face-on: an ecliptic orbit seen from straight above is the circle of radius a.
  const a = 2;
  const D = 5;
  const ecliptic = orbitBasis(0, 0.4, 1.1);
  for (const yaw of [0, 0.7, 2]) {
    const e = orbitScreenExtents(orreryView(yaw, Math.PI / 2), ecliptic, a, D, 8);
    assert.ok(
      Math.abs(e.top + a) < TOL * a && Math.abs(e.bottom - a) < TOL * a && Math.abs(e.halfWidth - a) < TOL * a,
      `face-on orbit must give -top = bottom = halfWidth = a, got ${JSON.stringify(e)}`,
    );
  }
  // Edge-on: the camera in the orbit plane sees a line (top = bottom = 0) whose
  // ends are the tangent points, halfWidth = D a / sqrt(D^2 - a^2).
  const edge = orbitScreenExtents(orreryView(0.3, 0), ecliptic, a, D, 8);
  const tangent = (D * a) / Math.sqrt(D * D - a * a);
  assert.ok(Math.abs(edge.top) < TOL && Math.abs(edge.bottom) < TOL, `edge-on orbit must be flat, got ${JSON.stringify(edge)}`);
  assert.ok(Math.abs(edge.halfWidth - tangent) < TOL * tangent, `edge-on half-width ${edge.halfWidth} vs tangent ${tangent}`);
  // Nearly edge-on: thin, with the near half (bottom) magnified past the far half.
  const tilt = 0.01;
  const thin = orbitScreenExtents(orreryView(0.3, tilt), ecliptic, a, D, 8);
  const bound = (D * a * Math.sin(tilt)) / (D - a * Math.cos(tilt));
  assert.ok(thin.top < 0 && thin.bottom > -thin.top && thin.bottom <= bound + TOL, `nearly edge-on orbit ${JSON.stringify(thin)}, bound ${bound}`);
  // Orthographic limit: the half-axes a hypot(up . P, up . Q) and a hypot(right . P, right . Q).
  {
    const view = orreryView(-0.8, 0.45);
    const b = orbitBasis(0.6, 1.2, 2.1);
    const P = /** @type {V3} */ ([b.Px, b.Py, b.Pz]);
    const Q = /** @type {V3} */ ([b.Qx, b.Qy, b.Qz]);
    const halfHeight = a * Math.hypot(dot(viewRow(view, 1), P), dot(viewRow(view, 1), Q));
    const halfWidth = a * Math.hypot(dot(viewRow(view, 0), P), dot(viewRow(view, 0), Q));
    const far = orbitScreenExtents(view, b, a, ORTHO_DISTANCE, 8);
    assert.ok(
      Math.abs(far.top + halfHeight) < TOL_BRUTE * a && Math.abs(far.bottom - halfHeight) < TOL_BRUTE * a && Math.abs(far.halfWidth - halfWidth) < TOL_BRUTE * a,
      `orthographic extents ${JSON.stringify(far)} vs half-axes ${halfHeight}, ${halfWidth}`,
    );
  }
  // Failure modes: the orbit reaching the camera, and bad inputs.
  assert.throws(() => orbitScreenExtents(orreryView(0.3, 0), ecliptic, a, 0.5 * a, 8), RangeError, 'an orbit through the camera must throw');
  for (const n of [2, 3.5, Number.NaN]) {
    assert.throws(() => orbitScreenExtents(orreryView(0.3, 0.5), ecliptic, a, D, n), RangeError, `samples ${n} must throw`);
  }
  for (const r of [0, -1, Number.NaN]) {
    assert.throws(() => orbitScreenExtents(orreryView(0.3, 0.5), ecliptic, r, D, 8), RangeError, `radius ${r} must throw`);
  }
  assert.throws(() => orbitScreenExtents(orreryView(0.3, 0.5), { ...ecliptic, Qz: Number.NaN }, a, D, 8), RangeError, 'a NaN basis must throw');
  log(`orbitScreenExtents: within ${worst.toExponential(1)} of a ${BRUTE_SAMPLES}-sample brute force (${TRIALS} random cases), never inside it; face-on circle, edge-on tangent width, orthographic half-axes`);
}

console.log('[done] cameras: all checks passed');
