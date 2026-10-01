// The entangled pair on the stage (Sponsors, Where to Stay): two qubits under
// Heisenberg exchange in a uniform field, lib/physics/entangle.mjs. Each
// sphere's arrow is that qubit's own (reduced) Bloch vector. The pair is
// always in a pure state, so each arrow's length is sqrt(1 - C^2), where C is
// the pair's concurrence: as the qubits entangle, both arrows shrink toward
// the center at once, while the hairline between the spheres strengthens with
// C. The field turns both arrows about z the whole time. Time is exact and
// loops seamlessly (ENTANGLE_PAIR's rates are whole turns per loop).

import {
  ENTANGLE_MAX_TIME,
  ENTANGLE_PAIR,
  entangledPair,
  loopRates,
} from '@/lib/physics/entangle.mjs';
import {
  QUBIT_VIEW_AZIMUTH,
  QUBIT_VIEW_ELEVATION,
  blochCamera,
} from '@/lib/physics/cameras.mjs';
import { drawBlochGlyph, type RGB } from './blochGlyph';
import {
  BLOCH_LINE_PX,
  QUBITS_LINK_ALPHA,
  QUBITS_LINK_BOW,
  QUBITS_OFFSET_X,
  QUBITS_OFFSET_Y,
  QUBITS_SPHERE_OF_SLOT,
} from './config';

const CAMERA = blochCamera(QUBIT_VIEW_ELEVATION, QUBIT_VIEW_AZIMUTH);
const RATES = loopRates(ENTANGLE_PAIR.L, ENTANGLE_PAIR.m, ENTANGLE_PAIR.n);
// First moment of maximal entanglement (J t = pi / 2): the still frame
// shown when motion is reduced, so the picture still says "entangled".
export const QUBITS_STILL_TIME = ENTANGLE_MAX_TIME;

export interface QubitColors {
  ink: RGB;
  a: RGB;
  b: RGB;
}

export interface QubitPairDraw {
  x: number; // slot center, CSS px
  y: number;
  r: number; // slot radius, CSS px
  opacity: number;
  t: number; // s of the pair's own clock
  colors: QubitColors;
}

const state = new Float64Array(7);
const rgba = (c: RGB, alpha: number) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;

/** Draw the pair; returns the concurrence C at time t. */
export function drawQubitPair(ctx: CanvasRenderingContext2D, d: QubitPairDraw): number {
  const { L } = ENTANGLE_PAIR;
  const t = ((d.t % L) + L) % L;
  entangledPair(ENTANGLE_PAIR.a, ENTANGLE_PAIR.b, RATES.J, RATES.omega, t, state);
  const C = state[6];
  if (d.opacity <= 0.002 || d.r <= 0) return C;
  const rho = d.r * QUBITS_SPHERE_OF_SLOT;
  const ax = d.x - d.r * QUBITS_OFFSET_X;
  const ay = d.y - d.r * QUBITS_OFFSET_Y;
  const bx = d.x + d.r * QUBITS_OFFSET_X;
  const by = d.y + d.r * QUBITS_OFFSET_Y;

  // The link: a bowed hairline from sphere to sphere, as strong as C.
  if (C > 0.002) {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const gap = rho * 1.12;
    const sx = ax + ux * gap;
    const sy = ay + uy * gap;
    const ex = bx - ux * gap;
    const ey = by - uy * gap;
    const bow = (len - 2 * gap) * QUBITS_LINK_BOW;
    ctx.save();
    ctx.lineWidth = BLOCH_LINE_PX;
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(d.colors.ink, QUBITS_LINK_ALPHA * C * d.opacity);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + ex) / 2 + uy * bow, (sy + ey) / 2 - ux * bow, ex, ey);
    ctx.stroke();
    ctx.restore();
  }

  drawBlochGlyph(ctx, ax, ay, rho, CAMERA, state, { ink: d.colors.ink, arrow: d.colors.a, opacity: d.opacity }, 0);
  drawBlochGlyph(ctx, bx, by, rho, CAMERA, state, { ink: d.colors.ink, arrow: d.colors.b, opacity: d.opacity }, 3);
  return C;
}
