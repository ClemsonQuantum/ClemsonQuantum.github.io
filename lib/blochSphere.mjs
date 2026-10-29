// @ts-check
/**
 * Camera and state readout for the learning-resources Bloch sphere (components/BlochSphere.tsx),
 * kept apart from lib/physics/cameras.mjs so the live page doesn't load the
 * shelved v4 stage's cameras. scripts/verify-bloch-sphere.mjs checks it.
 *
 * Convention (as in cameras.mjs): a camera is three orthonormal row vectors
 * in scene coordinates, right u (screen x), up v (screen y, pointing up) and
 * toward w (out of the screen, at the viewer), with u x v = w. A point p
 * lands on screen at (u . p, v . p) with y up; w . p is its depth.
 */

/**
 * @typedef {object} CameraBasis
 * @property {[number, number, number]} u screen right, in scene coordinates
 * @property {[number, number, number]} v screen up
 * @property {[number, number, number]} w toward the viewer (u x v)
 */

/** The learning-resources Bloch sphere: camera on the -y side, this far
 * above the equator (rad). */
export const BLOCH_SPHERE_TILT = 0.35;

/**
 * The learning-resources Bloch sphere's camera: on the -y side, `tilt`
 * above the equator, with +x to the right. The same basis as
 * blochCamera(tilt, -pi/2) in lib/physics/cameras.mjs, written with exact
 * axes.
 *   u = (1, 0, 0),  v = (0, sin t, cos t),  w = (0, -cos t, sin t)
 *
 * @param {number} tilt rad
 * @returns {CameraBasis}
 */
export function blochSphereCamera(tilt) {
  const s = Math.sin(tilt);
  const c = Math.cos(tilt);
  return { u: [1, 0, 0], v: [0, s, c], w: [0, -c, s] };
}

/**
 * @typedef {object} QubitState
 * @property {number} a0 amplitude of |0>, cos(theta/2) (real, >= 0)
 * @property {number} a1 magnitude of the |1> amplitude, sin(theta/2) (>= 0)
 * @property {number} phase relative phase phi of the |1> amplitude, rad in [0, 2 pi)
 * @property {number} p0 probability of measuring 0, cos^2(theta/2) = (1 + cos theta) / 2
 * @property {number} p1 probability of measuring 1, sin^2(theta/2) = (1 - cos theta) / 2
 */

/**
 * The state a point on the Bloch sphere stands for, in the convention the
 * sphere is drawn in (global phase chosen so the |0> amplitude is real):
 *   |psi> = cos(theta/2)|0> + e^{i phi} sin(theta/2)|1>
 * so P(0) = cos^2(theta/2) and P(1) = sin^2(theta/2), which sum to 1, and the
 * Bloch vector's z = cos theta = P(0) - P(1). Checked by
 * scripts/verify-bloch-sphere.mjs (normalization, the poles and equator,
 * |+> and |->).
 *
 * @param {number} theta polar angle, rad in [0, pi]
 * @param {number} phi azimuth, rad
 * @returns {QubitState}
 */
export function blochState(theta, phi) {
  if (!Number.isFinite(theta) || !Number.isFinite(phi) || theta < 0 || theta > Math.PI) {
    throw new RangeError(`blochState: theta must lie in [0, pi] and phi be finite (theta ${theta}, phi ${phi})`);
  }
  const a0 = Math.cos(theta / 2);
  const a1 = Math.sin(theta / 2);
  const tau = 2 * Math.PI;
  return { a0, a1, phase: ((phi % tau) + tau) % tau, p0: a0 * a0, p1: a1 * a1 };
}
