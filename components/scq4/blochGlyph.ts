// A hairline Bloch sphere for the stage's 2D canvas: the sphere's outline,
// its equator (far half dashed and fainter, near half solid), the z axis,
// and the state's Bloch vector as an arrow with a tip dot. A mixed state's
// vector is shorter than the radius (|r| < 1), so an entangled qubit's arrow
// visibly shrinks toward the center. Drawn by the entangled pair
// (qubitsLayer.ts).
//
// The camera is a basis from lib/physics/cameras.mjs (rows right u, up v,
// toward w): a point p lands at (u.p, v.p) with y up, and w.p is its depth.

import {
  BLOCH_ARROW_PX,
  BLOCH_AXIS_ALPHA,
  BLOCH_BACK_ALPHA,
  BLOCH_DASH_PX,
  BLOCH_EQUATOR_SAMPLES,
  BLOCH_FRONT_ALPHA,
  BLOCH_LINE_PX,
  BLOCH_OUTLINE_ALPHA,
  BLOCH_TIP_PX,
} from './config';

export type RGB = [number, number, number];
export type Vec3 = [number, number, number] | Float64Array;

export interface BlochCamera {
  u: readonly number[];
  v: readonly number[];
  w: readonly number[];
}

export interface BlochGlyphStyle {
  ink: RGB; // sphere lines
  arrow: RGB; // the state's arrow
  opacity: number; // overall, 0..1
}

const TAU = 2 * Math.PI;
const rgba = (c: RGB, alpha: number) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;

const dot = (a: readonly number[], x: number, y: number, z: number) => a[0] * x + a[1] * y + a[2] * z;

/**
 * Draw one Bloch sphere of radius `rho` (CSS px) centered at (cx, cy).
 * `vector` is the Bloch vector (length <= 1) starting at `offset`.
 */
export function drawBlochGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rho: number,
  cam: BlochCamera,
  vector: Vec3,
  style: BlochGlyphStyle,
  offset = 0,
): void {
  const { ink, arrow, opacity } = style;
  if (opacity <= 0.002 || rho <= 0) return;
  const sx = (x: number, y: number, z: number) => cx + rho * dot(cam.u, x, y, z);
  const sy = (x: number, y: number, z: number) => cy - rho * dot(cam.v, x, y, z);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outline (the sphere's silhouette).
  ctx.lineWidth = BLOCH_LINE_PX;
  ctx.strokeStyle = rgba(ink, BLOCH_OUTLINE_ALPHA * opacity);
  ctx.beginPath();
  ctx.arc(cx, cy, rho, 0, TAU);
  ctx.stroke();

  // Equator: far half dashed and faint, near half solid.
  for (const near of [false, true]) {
    ctx.setLineDash(near ? [] : BLOCH_DASH_PX);
    ctx.strokeStyle = rgba(ink, (near ? BLOCH_FRONT_ALPHA : BLOCH_BACK_ALPHA) * opacity);
    ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= BLOCH_EQUATOR_SAMPLES; k++) {
      const phi = (TAU * k) / BLOCH_EQUATOR_SAMPLES;
      const x = Math.cos(phi);
      const y = Math.sin(phi);
      if ((dot(cam.w, x, y, 0) >= 0) !== near) {
        pen = false;
        continue;
      }
      if (pen) ctx.lineTo(sx(x, y, 0), sy(x, y, 0));
      else ctx.moveTo(sx(x, y, 0), sy(x, y, 0));
      pen = true;
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // The z axis (the computational basis), pole to pole.
  ctx.strokeStyle = rgba(ink, BLOCH_AXIS_ALPHA * opacity);
  ctx.beginPath();
  ctx.moveTo(sx(0, 0, -1), sy(0, 0, -1));
  ctx.lineTo(sx(0, 0, 1), sy(0, 0, 1));
  ctx.stroke();

  // The state: an arrow from the center, as long as the Bloch vector.
  const x = vector[offset];
  const y = vector[offset + 1];
  const z = vector[offset + 2];
  const tx = sx(x, y, z);
  const ty = sy(x, y, z);
  ctx.lineWidth = BLOCH_ARROW_PX;
  ctx.strokeStyle = rgba(arrow, opacity);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.fillStyle = rgba(arrow, opacity);
  ctx.beginPath();
  ctx.arc(tx, ty, BLOCH_TIP_PX, 0, TAU);
  ctx.fill();
  ctx.restore();
}
