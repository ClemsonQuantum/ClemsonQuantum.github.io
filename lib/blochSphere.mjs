// @ts-check
/**
 * Camera for the learning-resources Bloch sphere (components/BlochSphere.tsx),
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
