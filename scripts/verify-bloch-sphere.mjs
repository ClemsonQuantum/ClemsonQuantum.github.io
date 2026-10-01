// @ts-check
/**
 * Checks for the learning-resources Bloch sphere's camera (lib/blochSphere.mjs,
 * drawn by components/BlochSphere.tsx). The one physics check prebuild runs:
 * it guards the only live figure; the full suite is npm run verify:physics.
 * Run: node scripts/verify-bloch-sphere.mjs   (exit code 1 on any failure)
 *
 * State |psi> = cos(theta/2)|0> + e^{i phi} sin(theta/2)|1> has the Bloch
 * vector p = (sin theta cos phi, sin theta sin phi, cos theta). With camera
 * rows (u, v, w) the SVG draws p at (CX + R u.p, CY - R v.p). For the tilt t,
 *   u = (1, 0, 0),  v = (0, sin t, cos t),  w = (0, -cos t, sin t).
 *  1. Proper rotation: orthonormal rows and det[u; v; w] = u x v . w = +1.
 *     A mirrored camera (det -1) once shipped and read as phi turning
 *     clockwise; nothing else on the page would show it.
 *  2. The textbook basis blochCamera(t, -pi/2):
 *       u = (-sin az, cos az, 0), v = (-sin t cos az, -sin t sin az, cos t)
 *     at az = -pi/2 gives u = (1, 0, 0), v = (0, sin t, cos t), as above.
 *  3. Viewer above the equator (w.z = sin t > 0), so |0> (p = +z, v.p =
 *     cos t > 0) is drawn above the center and |1> below it.
 *  4. Increasing phi runs counterclockwise on screen (y up): the equator
 *     point (cos phi, sin t sin phi) has 2D angular momentum
 *     x y' - y x' = sin t (cos^2 phi + sin^2 phi) = sin t > 0.
 *  5. Front/back cue: the far half of the equator (y > 0, depth w.p =
 *     -y cos t < 0) projects above the center (v.p = y sin t > 0), so the
 *     dashed upper arc is the back.
 *  6. The SVG's closed forms: equator semi-axes (R, R sin t), pole offset
 *     R cos t, and the meridian at phi_m = pi/2 - t, whose half-width
 *     cos(phi_m) = sin t equals the equator's half-height.
 * Limits: at t -> 0 the equator collapses to a line (sin t -> 0) and the
 * poles reach the rim (cos t -> 1); at t -> pi/2 the view is from the pole
 * and the equator is a full circle. Both are checked on the closed forms.
 */

import assert from 'node:assert/strict';
import { BLOCH_SPHERE_TILT, blochSphereCamera } from '../lib/blochSphere.mjs';

const TOL = 1e-12;
const SAMPLES = 360; // equator points per sampled check
const STEPS = 6;
let step = 0;
/** @param {string} msg */
const log = (msg) => console.log(`[${++step}/${STEPS}] ${msg}`);

/** @typedef {readonly number[]} V3 */
/** @param {V3} a @param {V3} b */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** @param {V3} a @param {V3} b @returns {number[]} */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** @param {number} theta @param {number} phi @returns {number[]} */
const bloch = (theta, phi) => [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];

const t = BLOCH_SPHERE_TILT;
console.log(`[setup] node ${process.version}; lib/blochSphere.mjs, tilt ${t} rad; tol ${TOL}`);
assert.ok(Number.isFinite(t) && t > 0 && t < Math.PI / 2, `tilt must lie in (0, pi/2), got ${t}`);

const cams = [t, 0.05, 0.6, 1.5].map((tilt) => ({ tilt, ...blochSphereCamera(tilt) }));

// 1. Proper rotation.
for (const { tilt, u, v, w } of cams) {
  for (const [label, r] of /** @type {[string, V3][]} */ ([['u', u], ['v', v], ['w', w]])) {
    assert.ok(Math.abs(dot(r, r) - 1) < TOL, `tilt ${tilt}: |${label}| = ${Math.sqrt(dot(r, r))}`);
  }
  assert.ok(Math.abs(dot(u, v)) < TOL && Math.abs(dot(u, w)) < TOL && Math.abs(dot(v, w)) < TOL, `tilt ${tilt}: rows not orthogonal`);
  const det = dot(cross(u, v), w);
  assert.ok(Math.abs(det - 1) < TOL, `tilt ${tilt}: det[u; v; w] = ${det} (a mirror if -1)`);
}
log('orthonormal rows, det +1 (no mirror) at the shipped tilt and three others');

// 2. Equal to the textbook basis at azimuth -pi/2.
for (const { tilt, u, v } of cams) {
  const az = -Math.PI / 2;
  const refU = [-Math.sin(az), Math.cos(az), 0];
  const refV = [-Math.sin(tilt) * Math.cos(az), -Math.sin(tilt) * Math.sin(az), Math.cos(tilt)];
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(u[i] - refU[i]) < TOL && Math.abs(v[i] - refV[i]) < TOL, `tilt ${tilt}: basis differs from blochCamera(tilt, -pi/2) at entry ${i}`);
  }
}
log('equal to the textbook Bloch camera blochCamera(tilt, -pi/2)');

// 3. Above the equator; |0> drawn above the center.
for (const { tilt, v, w } of cams) {
  assert.ok(w[2] > 0, `tilt ${tilt}: viewer below the equator (w.z = ${w[2]})`);
  const up0 = dot(v, bloch(0, 0));
  const up1 = dot(v, bloch(Math.PI, 0));
  assert.ok(up0 > 0 && up1 < 0, `tilt ${tilt}: |0> at v.p = ${up0}, |1> at ${up1}; |0> must be on top`);
}
log('viewer above the equator; |0> above the center, |1> below');

// 4. phi turns counterclockwise on screen (y up).
for (const { tilt, u, v } of cams) {
  let area = 0;
  for (let k = 0; k < SAMPLES; k++) {
    const p0 = bloch(Math.PI / 2, (2 * Math.PI * k) / SAMPLES);
    const p1 = bloch(Math.PI / 2, (2 * Math.PI * (k + 1)) / SAMPLES);
    area += 0.5 * (dot(u, p0) * dot(v, p1) - dot(u, p1) * dot(v, p0));
  }
  // The projected equator is an ellipse with semi-axes 1 and sin t: area pi sin t,
  // less the polygon's inscribed shortfall of O(1 / SAMPLES^2).
  const exact = Math.PI * Math.sin(tilt);
  assert.ok(area > 0, `tilt ${tilt}: increasing phi runs clockwise on screen (signed area ${area})`);
  assert.ok(Math.abs(area / exact - 1) < 1e-3, `tilt ${tilt}: signed area ${area} vs pi sin t = ${exact}`);
}
log('increasing phi runs counterclockwise on screen; signed area pi sin t');

// 5. The far half of the equator projects above the center.
for (const { tilt, v, w } of cams) {
  for (let k = 1; k < SAMPLES / 2; k++) {
    const phi = (2 * Math.PI * k) / SAMPLES; // 0 < phi < pi: y > 0
    const far = bloch(Math.PI / 2, phi);
    const near = bloch(Math.PI / 2, -phi);
    assert.ok(dot(w, far) < 0 && dot(v, far) > 0, `tilt ${tilt}, phi ${phi}: far point must be behind and above the center`);
    assert.ok(dot(w, near) > 0 && dot(v, near) < 0, `tilt ${tilt}, phi ${-phi}: near point must be in front and below the center`);
  }
}
log('far half of the equator (y > 0) behind and above the center: the dashed upper arc');

// 6. The SVG's closed forms (BlochSphere.tsx: EQUATOR_RY, poleY, MERIDIAN_PHI).
for (const { tilt, u, v } of cams) {
  let rx = 0;
  let ry = 0;
  let meridianHalfWidth = 0;
  const meridianPhi = Math.PI / 2 - tilt;
  for (let k = 0; k < SAMPLES; k++) {
    const a = (2 * Math.PI * k) / SAMPLES;
    const p = bloch(Math.PI / 2, a);
    rx = Math.max(rx, Math.abs(dot(u, p)));
    ry = Math.max(ry, Math.abs(dot(v, p)));
    const s = Math.sin(a); // great circle through both poles at meridianPhi
    meridianHalfWidth = Math.max(meridianHalfWidth, Math.abs(dot(u, [s * Math.cos(meridianPhi), s * Math.sin(meridianPhi), Math.cos(a)])));
  }
  // Every 90 deg is sampled, so the extremes are hit exactly.
  assert.ok(Math.abs(rx - 1) < TOL, `tilt ${tilt}: equator half-width ${rx}, expected 1`);
  assert.ok(Math.abs(ry - Math.sin(tilt)) < TOL, `tilt ${tilt}: equator half-height ${ry}, expected sin t = ${Math.sin(tilt)}`);
  assert.ok(Math.abs(dot(v, [0, 0, 1]) - Math.cos(tilt)) < TOL, `tilt ${tilt}: pole offset must be cos t`);
  assert.ok(Math.abs(meridianHalfWidth - ry) < TOL, `tilt ${tilt}: meridian half-width ${meridianHalfWidth} vs equator half-height ${ry}`);
}
// Limits of the closed forms.
const flat = blochSphereCamera(1e-9);
const top = blochSphereCamera(Math.PI / 2);
assert.ok(Math.abs(flat.v[1]) < 1e-8 && Math.abs(flat.v[2] - 1) < 1e-12, 'tilt -> 0: equator must flatten to a line, poles on the rim');
assert.ok(Math.abs(top.v[1] - 1) < TOL && Math.abs(top.v[2]) < TOL, 'tilt -> pi/2: equator must be a full circle, poles at the center');
log('equator semi-axes (1, sin t), pole offset cos t, meridian width = equator height; t -> 0 and t -> pi/2 limits');

console.log('[done] Bloch sphere: all checks passed');
