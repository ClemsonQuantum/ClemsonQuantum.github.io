// Scroll choreography for the v4 stage: section cues -> animated channels.
//
// A cue is any element carrying data-stage="<scene>" in the page markdown:
//   <div class="scq4-slot" data-stage="atom" data-stage-orbital="1"></div>
//   <div class="scq4-slot" data-stage="qubits"></div>
//   <div class="scq4-slot" data-stage="blackhole" data-stage-incl="80"></div>
//   <div class="hackathon-section" data-stage="none"></div>
// Slot scenes (atom, qubits, blackhole) sit on invisible slots that
// CSS lays out where the object should be while that section is centered in
// the viewport, so the choreography is responsive CSS rather than numbers in
// markdown. A slot hidden by CSS (small screens) falls back to a faint
// companion behind the text. "none" cues go on sections.
//
// Every slot object has its own placement channels (x, y, radius, opacity),
// listed once in SLOT_OBJECTS. While another scene has the stage an object
// waits just outside the viewport: it leaves upward (above the top edge) and
// arrives from below, under its next slot, so it always travels with the
// direction of scrolling (and reverses when scrolling back up).
//
// Attributes: data-stage-orbital = hydrogen ladder coordinate (0 = 1s ...
// 3 = 4f; lib/physics/hydrogen.mjs; carries over between cues, so the atom
// keeps its orbital while away); data-stage-sun = how far the atom has
// collapsed into a sun (0..1, atom cues; default 0); data-stage-incl = black
// hole viewing inclination in degrees; data-stage-hold = extra scroll, as a fraction of the viewport height, over
// which the cue holds still (it becomes two cues that far apart);
// data-stage-stay (on a "none" cue) = the objects fade out where they are
// instead of leaving the viewport. Omitted values carry over from the
// previous cue.

import { LADDER_MAX } from '@/lib/physics/hydrogen.mjs';
import {
  CUE_HOLD,
  EXIT_Y_OVER_RADIUS,
  HOLE_COMPANION,
  HOLE_DEFAULT_INCLINATION_DEG,
  MOBILE_COMPANION,
  QUBITS_COMPANION,
  type Companion,
} from './config';

export type StageScene = 'atom' | 'blackhole' | 'qubits' | 'none';
const SCENES: StageScene[] = ['atom', 'blackhole', 'qubits', 'none'];

// Animated channels. Positions and radii are CSS px of the viewport.
export interface Channels {
  ax: number; // atom center x
  ay: number; // atom center y
  ar: number; // atom slot radius
  orbital: number; // hydrogen ladder coordinate
  atom: number; // atom opacity
  sun: number; // atom collapsed into a sun, 0..1
  bx: number; // black hole center x
  by: number; // black hole center y
  br: number; // black hole slot radius
  incl: number; // black hole inclination, rad
  hole: number; // black hole opacity
  qx: number; // entangled qubits center x
  qy: number; // entangled qubits center y
  qr: number; // entangled qubits slot radius
  qubits: number; // entangled qubits opacity
}

export const CHANNEL_KEYS: (keyof Channels)[] = [
  'ax', 'ay', 'ar', 'orbital', 'atom', 'sun',
  'bx', 'by', 'br', 'incl', 'hole',
  'qx', 'qy', 'qr', 'qubits',
];

type SlotScene = 'atom' | 'blackhole' | 'qubits';

// One object that travels between slots: its channels and phone companion.
export interface SlotObject {
  scene: SlotScene;
  x: keyof Channels;
  y: keyof Channels;
  r: keyof Channels;
  op: keyof Channels;
  companion: Companion;
}

export const SLOT_OBJECTS: readonly SlotObject[] = [
  { scene: 'atom', x: 'ax', y: 'ay', r: 'ar', op: 'atom', companion: MOBILE_COMPANION },
  { scene: 'blackhole', x: 'bx', y: 'by', r: 'br', op: 'hole', companion: HOLE_COMPANION },
  { scene: 'qubits', x: 'qx', y: 'qy', r: 'qr', op: 'qubits', companion: QUBITS_COMPANION },
];

const SLOT_SCENES = new Set<StageScene>(SLOT_OBJECTS.map((o) => o.scene));

// Every opacity channel (what reduced motion fades, and what "empty" means).
export const OPACITY_KEYS: (keyof Channels)[] = SLOT_OBJECTS.map((o) => o.op);

export interface Cue {
  anchor: number; // scroll offset (px) at which this cue is fully in effect
  ch: Channels;
}

interface Placement {
  x: number;
  y: number;
  r: number;
}

interface RawCue {
  scene: StageScene;
  anchor: number;
  slot: Placement | null; // null when the cue has no visible slot
  orbital: number | null;
  sun: number | null;
  incl: number | null;
  hold: number; // px of scroll to hold still over (0 = none)
  stay: boolean; // fade out in place rather than leave
}

function numberAttr(el: HTMLElement, key: string): number | null {
  const raw = el.dataset[key];
  if (raw === undefined) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    console.warn(`[scq4] ignoring non-numeric data-${key}="${raw}"`);
    return null;
  }
  return value;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// A slot's anchor is the scroll offset that puts its center at the viewport
// center, clamped to what the page can actually scroll to; the placement is
// where the slot then sits on screen (below the center when the page ends
// first, so the object rests where its slot really is).
function readRaw(root: ParentNode, scrollY: number, vh: number, maxScroll: number): RawCue[] {
  const out: RawCue[] = [];
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-stage]'))) {
    const scene = el.dataset.stage as StageScene;
    if (!SCENES.includes(scene)) {
      console.warn(`[scq4] ignoring unknown data-stage="${el.dataset.stage}"`);
      continue;
    }
    const rect = el.getBoundingClientRect();
    const isSlotScene = SLOT_SCENES.has(scene);
    const hasSlot = isSlotScene && rect.width > 0 && rect.height > 0;
    let anchor: number;
    let slot: Placement | null = null;
    if (hasSlot) {
      const centerDoc = rect.top + scrollY + rect.height / 2;
      anchor = clamp(centerDoc - vh / 2, 0, maxScroll);
      slot = {
        x: rect.left + rect.width / 2,
        y: centerDoc - anchor,
        r: Math.min(rect.width, rect.height) / 2,
      };
    } else {
      // A slot hidden by CSS (small screens) anchors at its section's
      // center. Section-wide cues sit on the section itself, and a marker
      // inside one at its own position.
      const box = isSlotScene
        ? ((el.closest('.hackathon-section, .hackathon-hero') as HTMLElement | null) ?? el).getBoundingClientRect()
        : rect;
      anchor = clamp(box.top + scrollY + box.height / 2 - vh / 2, 0, maxScroll);
    }
    const orbital = numberAttr(el, 'stageOrbital');
    const sun = numberAttr(el, 'stageSun');
    const incl = numberAttr(el, 'stageIncl');
    const hold = numberAttr(el, 'stageHold');
    out.push({
      scene,
      anchor,
      slot,
      orbital: orbital === null ? null : Math.min(LADDER_MAX, Math.max(0, orbital)),
      sun: sun === null ? null : Math.min(1, Math.max(0, sun)),
      incl: incl === null ? null : (Math.min(89, Math.max(0, incl)) * Math.PI) / 180,
      hold: hold === null ? 0 : Math.max(0, hold) * vh,
      stay: el.hasAttribute('data-stage-stay'),
    });
  }
  return out.sort((a, b) => a.anchor - b.anchor);
}

// Read every cue under `root` and resolve it to a full channel vector.
// `maxScroll` is the page's largest scroll offset.
export function readCues(
  root: ParentNode,
  scrollY: number,
  vw: number,
  vh: number,
  maxScroll: number,
): Cue[] {
  const raw = readRaw(root, scrollY, vh, maxScroll);
  const companionOf = (c: Companion): Placement => ({ x: vw / 2, y: vh * c.y, r: vw * c.r });

  // Where each object is active, cue by cue (null = somewhere else).
  const active: (Placement | null)[][] = raw.map((c) =>
    SLOT_OBJECTS.map((o) => (c.scene === o.scene ? (c.slot ?? companionOf(o.companion)) : null)),
  );
  // An object waiting below the viewport waits under its NEXT placement, so
  // it rises straight in; one leaving goes straight up from its last.
  const nextAt: (Placement | null)[][] = raw.map(() => SLOT_OBJECTS.map(() => null));
  SLOT_OBJECTS.forEach((o, j) => {
    let next: Placement | null = null;
    for (let i = raw.length - 1; i >= 0; i--) {
      if (active[i][j]) next = active[i][j];
      nextAt[i][j] = next;
    }
  });

  const lastAt: (Placement | null)[] = SLOT_OBJECTS.map(() => null);
  const wasActive: boolean[] = SLOT_OBJECTS.map(() => false);
  let orbital = 0;
  let sun = 0;
  let incl = (HOLE_DEFAULT_INCLINATION_DEG * Math.PI) / 180;

  const cues = raw.flatMap((c, i): Cue[] => {
    if (c.orbital !== null) orbital = c.orbital;
    // Atom cues set how far it has become a sun (default: not at all);
    // other cues leave it as it was, so it exits looking the same.
    if (c.scene === 'atom') sun = c.sun ?? 0;
    if (c.incl !== null) incl = c.incl;
    const ch: Channels = {
      ax: 0, ay: 0, ar: 0, orbital, atom: 0, sun,
      bx: 0, by: 0, br: 0, incl, hole: 0,
      qx: 0, qy: 0, qr: 0, qubits: 0,
    };
    SLOT_OBJECTS.forEach((o, j) => {
      const here = active[i][j];
      let at: Placement;
      let opacity = 0;
      if (here) {
        at = here;
        opacity = c.slot ? 1 : o.companion.opacity;
      } else if (wasActive[j] && lastAt[j]) {
        const last = lastAt[j] as Placement;
        // Leaving: straight up and out, or fading where it is.
        at = c.stay ? last : { ...last, y: last.r * EXIT_Y_OVER_RADIUS };
      } else {
        const next = nextAt[i][j] ?? lastAt[j] ?? companionOf(o.companion);
        at = { ...next, y: vh - next.r * EXIT_Y_OVER_RADIUS };
      }
      ch[o.x] = at.x;
      ch[o.y] = at.y;
      ch[o.r] = at.r;
      ch[o.op] = opacity;
      wasActive[j] = !!here;
      if (here) lastAt[j] = here;
    });
    if (c.hold <= 0) return [{ anchor: c.anchor, ch }];
    const half = c.hold / 2;
    return [
      { anchor: clamp(c.anchor - half, 0, maxScroll), ch },
      { anchor: clamp(c.anchor + half, 0, maxScroll), ch: { ...ch } },
    ];
  });
  return cues.sort((a, b) => a.anchor - b.anchor);
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (u: number) => u * u * (3 - 2 * u);

// Target channels at a scroll offset: hold each cue for CUE_HOLD of the gap
// on either side, and ease between neighbours in the middle. With `reduced`
// (prefers-reduced-motion) nothing travels or turns: each object
// fades out at the nearer cue's pose and back in at the next one's.
export function sampleCues(cues: Cue[], scrollY: number, reduced = false): Channels | null {
  if (cues.length === 0) return null;
  const first = cues[0];
  const last = cues[cues.length - 1];
  // Before the first anchor the objects ride with their slots (a hero slot
  // that sits below the viewport center, as on phones), then hold.
  if (scrollY <= first.anchor) {
    const lift = first.anchor - scrollY;
    const out = { ...first.ch };
    for (const o of SLOT_OBJECTS) out[o.y] += lift;
    return out;
  }
  if (scrollY >= last.anchor) return { ...last.ch };
  let k = 0;
  while (k < cues.length - 2 && scrollY >= cues[k + 1].anchor) k++;
  const a = cues[k];
  const b = cues[k + 1];
  const span = b.anchor - a.anchor;
  const t = span > 0 ? (scrollY - a.anchor) / span : 1;
  const u = smoothstep(clamp01((t - CUE_HOLD) / (1 - 2 * CUE_HOLD)));
  if (reduced) {
    const near = u < 0.5 ? a.ch : b.ch;
    const fade = Math.abs(2 * u - 1);
    const out = { ...near };
    for (const key of OPACITY_KEYS) out[key] *= fade;
    return out;
  }
  const out = { ...a.ch };
  for (const key of CHANNEL_KEYS) out[key] = a.ch[key] + (b.ch[key] - a.ch[key]) * u;
  return out;
}

// One exact step of a critically damped spring (zeta = 1) toward a fixed
// target: e(t) = (e0 + (v0 + w e0) t) e^{-w t}. Exact for any dt, so motion
// is frame-rate independent and never overshoots.
export function springStep(
  x: number,
  v: number,
  target: number,
  omega: number,
  dt: number,
): [number, number] {
  const e = x - target;
  const b = v + omega * e;
  const k = Math.exp(-omega * dt);
  return [target + (e + b * dt) * k, (v - omega * b * dt) * k];
}
