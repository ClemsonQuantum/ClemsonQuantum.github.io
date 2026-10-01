// What goes with the hydrogen cloud on the stage canvas:
//   - its armature: hairline latitude rings where the pure state's cloud is
//     empty (the angular nodes of Y_l0, lib/physics/hydrogen.mjs) and its
//     symmetry axis, drawn with the atom's own rotation, far halves before the
//     cloud and near halves after it;
//   - the light at each step of the ladder 1s -> 2p -> 3d -> 4f: every step is
//     an electric-dipole transition with Delta l = +1, Delta m = 0, so its
//     photon is linearly polarized along the atom's axis and travels
//     perpendicular to it. The packet's position follows the step's progress,
//     so climbing the ladder shows the photon absorbed and descending shows it
//     emitted. Its label carries the real wavelength.

import { spectralSrgb } from '@/lib/physics/blackbody.mjs';
import { LADDER_TRANSITIONS, angularNodes, ladderState, RUNGS } from '@/lib/physics/hydrogen.mjs';
import {
  ARMATURE_AXIS_ALPHA,
  ARMATURE_AXIS_REACH,
  ARMATURE_BACK_ALPHA,
  ARMATURE_DASH_PX,
  ARMATURE_FRONT_ALPHA,
  ARMATURE_LINE_PX,
  ARMATURE_PURITY_FROM,
  ARMATURE_RING_SAMPLES,
  PHOTON_AMPLITUDE_PX,
  PHOTON_CARRIER_HZ,
  PHOTON_END_OF_RADIUS,
  PHOTON_FADE_IN,
  PHOTON_FADE_OUT,
  PHOTON_LABEL_GAP_PX,
  PHOTON_LAMBDA_EXPONENT,
  PHOTON_LAMBDA_REF_NM,
  PHOTON_LAMBDA_REF_PX,
  PHOTON_LINE_PX,
  PHOTON_SAMPLES,
  PHOTON_SIGMA_OF_RADIUS,
  PHOTON_START_OF_RADIUS,
} from './config';

type RGB = [number, number, number];

export interface ArmatureDraw {
  cx: number; // atom center, CSS px
  cy: number;
  radiusPx: number; // the cloud's 95% radius on screen
  rot: Float32Array; // atomRotation: 3x3 column-major, view x right, y up, z toward
  orbital: number; // ladder coordinate
  alpha: number; // overall opacity
  ink: RGB;
}

export interface PhotonPose {
  points: Float64Array; // x, y pairs (CSS px) along the packet
  count: number;
  alpha: number;
  color: RGB;
  label: string;
  labelX: number;
  labelY: number;
}

const TAU = 2 * Math.PI;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (lo: number, hi: number, v: number) => {
  const t = clamp01((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};
const rgba = (c: RGB, a: number) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${clamp01(a).toFixed(3)})`;

// Node angles per rung, computed once.
const NODES: Float64Array[] = RUNGS.map((r) => angularNodes(r.l));

// Each step's light: its color (the visible one in its own spectral color,
// ultraviolet and infrared in the ink) and its label.
const STEPS = LADDER_TRANSITIONS.map((t) => {
  const visible = t.band === 'visible';
  const rgb = visible ? (spectralSrgb(t.nm).map((c) => Math.round(255 * c)) as RGB) : null;
  const nm = t.nm >= 1000 ? t.nm.toFixed(0) : t.nm.toFixed(1);
  return {
    nm: t.nm,
    rgb,
    label: visible ? `${nm} nm` : `${nm} nm ${t.band}`,
  };
});

// Purity of the state at ladder coordinate s: the dominant rung and its
// probability.
function dominant(s: number) {
  const st = ladderState(s);
  const pa = st.ca * st.ca;
  const pb = st.cb * st.cb;
  return pa >= pb ? { rung: st.a, p: pa } : { rung: st.b, p: pb };
}

// View-space image of an atom-frame point (rot is column-major).
function view(rot: Float32Array, x: number, y: number, z: number, out: Float64Array) {
  out[0] = rot[0] * x + rot[3] * y + rot[6] * z;
  out[1] = rot[1] * x + rot[4] * y + rot[7] * z;
  out[2] = rot[2] * x + rot[5] * y + rot[8] * z;
}

const scratch = new Float64Array(3);

/** Node rings and axis: `half` picks the far ('back') or near ('front') side. */
export function drawNodeRings(ctx: CanvasRenderingContext2D, d: ArmatureDraw, half: 'back' | 'front') {
  if (d.alpha <= 0.002 || d.radiusPx <= 0) return;
  const { rung, p } = dominant(d.orbital);
  const ringAlpha = d.alpha * smoothstep(ARMATURE_PURITY_FROM, 1, p);
  // The axis belongs to every state but the spherical 1s: it fades with the
  // state's 1s probability.
  const st = ladderState(d.orbital);
  const p1s = st.a === 0 ? st.ca * st.ca : 0;
  const axisAlpha = d.alpha * (1 - p1s);
  const front = half === 'front';
  const R = d.radiusPx;
  ctx.save();
  ctx.lineWidth = ARMATURE_LINE_PX;
  ctx.lineCap = 'round';
  if (!front) ctx.setLineDash(ARMATURE_DASH_PX);

  if (ringAlpha > 0.002) {
    ctx.strokeStyle = rgba(d.ink, (front ? ARMATURE_FRONT_ALPHA : ARMATURE_BACK_ALPHA) * ringAlpha);
    ctx.beginPath();
    for (const theta of NODES[rung]) {
      const s = Math.sin(theta);
      const c = Math.cos(theta);
      let pen = false;
      for (let k = 0; k <= ARMATURE_RING_SAMPLES; k++) {
        const phi = (TAU * k) / ARMATURE_RING_SAMPLES;
        view(d.rot, R * s * Math.cos(phi), R * s * Math.sin(phi), R * c, scratch);
        if ((scratch[2] >= 0) !== front) {
          pen = false;
          continue;
        }
        const X = d.cx + scratch[0];
        const Y = d.cy - scratch[1];
        if (pen) ctx.lineTo(X, Y);
        else ctx.moveTo(X, Y);
        pen = true;
      }
    }
    ctx.stroke();
  }

  // The axis: each half from the nucleus out to one pole and past the cloud;
  // the half pointing away from the viewer is the far one.
  if (axisAlpha > 0.002) {
    ctx.strokeStyle = rgba(d.ink, ARMATURE_AXIS_ALPHA * axisAlpha);
    ctx.beginPath();
    for (const sign of [1, -1]) {
      view(d.rot, 0, 0, sign * R * ARMATURE_AXIS_REACH, scratch);
      if ((scratch[2] >= 0) !== front) continue;
      ctx.moveTo(d.cx, d.cy);
      ctx.lineTo(d.cx + scratch[0], d.cy - scratch[1]);
    }
    ctx.stroke();
  }
  ctx.restore();
}

const packet = new Float64Array(2 * (PHOTON_SAMPLES + 1));

/**
 * The photon of the step in progress, or null at a pure rung. `fromLeft`
 * picks the side it travels on (away from the text), `time` drifts the
 * carrier (display only).
 */
export function photonPose(d: ArmatureDraw, fromLeft: boolean, time: number, ink: RGB): PhotonPose | null {
  const s = Math.min(STEPS.length, Math.max(0, d.orbital));
  const k = Math.min(STEPS.length - 1, Math.floor(s));
  const f = s - k;
  const alpha =
    d.alpha * smoothstep(PHOTON_FADE_IN[0], PHOTON_FADE_IN[1], f) *
    (1 - smoothstep(PHOTON_FADE_OUT[0], PHOTON_FADE_OUT[1], f));
  if (alpha <= 0.002 || d.radiusPx <= 0) return null;
  const step = STEPS[k];
  const R = d.radiusPx;
  // The atom's axis on screen (polarization), and the travel direction
  // perpendicular to it, pointing from the outer side toward the nucleus.
  view(d.rot, 0, 0, 1, scratch);
  let ax = scratch[0];
  let ay = -scratch[1];
  const alen = Math.hypot(ax, ay) || 1;
  ax /= alen;
  ay /= alen;
  let tx = -ay;
  let ty = ax;
  if ((tx > 0) !== fromLeft) {
    tx = -tx;
    ty = -ty;
  }
  // Packet center: from outside the cloud to absorption inside it.
  const progress = smoothstep(PHOTON_FADE_IN[0], PHOTON_FADE_OUT[1], f);
  const dist = R * (PHOTON_START_OF_RADIUS + (PHOTON_END_OF_RADIUS - PHOTON_START_OF_RADIUS) * progress);
  const px = d.cx - tx * dist;
  const py = d.cy - ty * dist;
  const sigma = R * PHOTON_SIGMA_OF_RADIUS;
  const lambda = PHOTON_LAMBDA_REF_PX * (step.nm / PHOTON_LAMBDA_REF_NM) ** PHOTON_LAMBDA_EXPONENT;
  const phase = TAU * PHOTON_CARRIER_HZ * time;
  for (let i = 0; i <= PHOTON_SAMPLES; i++) {
    const u = (3 * sigma * (2 * i - PHOTON_SAMPLES)) / PHOTON_SAMPLES;
    const amp = PHOTON_AMPLITUDE_PX * Math.exp(-(u * u) / (2 * sigma * sigma)) * Math.sin((TAU * u) / lambda - phase);
    packet[2 * i] = px + tx * u + ax * amp;
    packet[2 * i + 1] = py + ty * u + ay * amp;
  }
  return {
    points: packet,
    count: PHOTON_SAMPLES + 1,
    alpha,
    color: step.rgb ?? ink,
    label: step.label,
    labelX: px - ax * (PHOTON_AMPLITUDE_PX + PHOTON_LABEL_GAP_PX),
    labelY: py - ay * (PHOTON_AMPLITUDE_PX + PHOTON_LABEL_GAP_PX),
  };
}

export function drawPhoton(ctx: CanvasRenderingContext2D, pose: PhotonPose) {
  ctx.save();
  ctx.lineWidth = PHOTON_LINE_PX;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(pose.color, pose.alpha);
  ctx.beginPath();
  ctx.moveTo(pose.points[0], pose.points[1]);
  for (let i = 1; i < pose.count; i++) ctx.lineTo(pose.points[2 * i], pose.points[2 * i + 1]);
  ctx.stroke();
  ctx.restore();
}
