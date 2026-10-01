'use client';

import { useEffect, useRef } from 'react';
import '@/assets/css/scq4-archive.css';
import { ladderState, stateLabel } from '@/lib/physics/hydrogen.mjs';
import { MAX_DPR } from '@/lib/animation';
import type { PendingProgram } from '@/lib/webgl';
import {
  ACTIVE_FRAME_MS,
  ATOM_ELEVATION,
  ATOM_HALO_RADIUS,
  ATOM_TILT,
  CLOUD_R95_OF_SLOT,
  DOT_DIAMETER_PX,
  FRAME_SLACK_MS,
  HOLE_BUILD_GAP_MS,
  HOLE_BUILD_SLICE_MS,
  HOLE_BUILD_WAKE_VIEWPORTS,
  HOLE_COMPILE_WAKE_VIEWPORTS,
  HOLE_EXPOSURE,
  HOLE_IDLE_TIMEOUT_MS,
  HOLE_M_PER_SECOND,
  HOLE_M_PER_SLOT_RADIUS,
  HOLE_PARALLAX_AZIMUTH,
  HOLE_PATCH_OF_DISC,
  HOLE_POLL_MS,
  HOLE_SPARSE_MIN_DPR,
  HOLE_STAR_YAW_RATE,
  HOLE_VIEW_RADIUS,
  IDLE_BOB_AMPLITUDE,
  IDLE_BOB_RATE,
  IDLE_FRAME_MS,
  IDLE_YAW_RATE,
  LADDER_REBUILD_STEP,
  MAX_FRAME_DT,
  MOBILE_QUERY,
  PARALLAX_ELEVATION,
  PARALLAX_YAW,
  POINTS_DESKTOP,
  POINTS_FALLBACK,
  POINTS_MOBILE,
  SPRING_OMEGA,
  STATIC_YAW,
  SUN_CLOUD_FADE,
  SUN_DISK_OF_SLOT,
  SUN_GLOW_OF_DISK,
  SUN_LIMB_DARKENING,
  SUN_LIMB_STOPS,
  SUN_MORPH_FROM,
  SYSTEM_FADE_FROM,
  SYSTEM_INNER_PERIOD,
  SYSTEM_TURNS_PER_VIEWPORT,
} from './config';
import {
  atomRotation,
  buildTables,
  createAtomCanvas2D,
  createAtomGL,
  type AtomCanvasScene,
  type AtomDraw,
  type AtomGLScene,
  type AtomTables,
  type CloudStyle,
} from './atomRenderer';
import {
  blackHoleTableSteps,
  createBlackHoleScene,
  startBlackHoleProgram,
  type BlackHoleScene,
  type BlackHoleTables,
} from './blackHoleScene';
import { createCommitteeSystem, type CommitteeSystem, type HolePose } from './committeeSystem';
import { motionPaused, onMotionChange } from './motion';
import { drawNodeRings, type ArmatureDraw } from './orbitalArmature';
import { QUBITS_STILL_TIME, drawQubitPair } from './qubitsLayer';
import {
  CHANNEL_KEYS,
  OPACITY_KEYS,
  SLOT_OBJECTS,
  readCues,
  sampleCues,
  springStep,
  type Channels,
  type Cue,
} from './stageTimeline';

declare global {
  interface Window {
    // Development-only verification hook (the Browser pane may never run
    // rAF): renders the settled frame for a scroll offset and reports state.
    __scq4Stage?: {
      renderAt: (
        scrollY: number,
        opts?: { t?: number; yaw?: number; elevation?: number },
      ) => Record<string, unknown>;
    };
  }
}

type RGB = [number, number, number];

const ZERO: Channels = {
  ax: 0, ay: 0, ar: 0, orbital: 0, atom: 0, sun: 0,
  bx: 0, by: 0, br: 0, incl: 0, hole: 0,
  qx: 0, qy: 0, qr: 0, qubits: 0,
};

// An object this faint is invisible: below it, position changes snap
// instead of animating, so a fast scroll never sweeps a ghost across the
// screen between its exit (above) and its next entrance (below).
const INVISIBLE = 0.01;

const TAU = 2 * Math.PI;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const rgba = (c: RGB, alpha: number) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha.toFixed(3)})`;
const smoothstep01 = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

function parseRgb(value: string, fallback: RGB): RGB {
  const parts = value.split(',').map((v) => Number(v.trim()));
  return parts.length === 3 && parts.every(Number.isFinite) ? (parts as RGB) : fallback;
}

function parseAlpha(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// The v4 page's scroll stage: a fixed full-viewport canvas behind the page
// content where the hydrogen electron cloud travels between section slots,
// the entangled qubits take their sections, and at the
// committee the atom becomes a sun with the organizers in orbit and a black
// hole far behind (see stageTimeline.ts for the choreography and
// committeeSystem.ts for the system).
//
// WebGL scenes render into an OFFSCREEN canvas that is copied into the
// visible 2D canvases every frame: some embedded browsers never composite a
// WebGL canvas placed in the page, while a 2D canvas always shows.
// Mounted by MarkdownDiv for the `.scq4-stage` sentinel.
export default function ScrollStage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nucleusRef = useRef<HTMLSpanElement>(null);
  const psiRef = useRef<HTMLSpanElement>(null);
  const systemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const back = backRef.current;
    const display = canvasRef.current;
    const nucleus = nucleusRef.current;
    const psi = psiRef.current;
    const systemLayer = systemRef.current;
    const ctx = display?.getContext('2d') ?? null;
    const backCtx = back?.getContext('2d') ?? null;
    if (!root || !back || !backCtx || !display || !ctx || !nucleus || !psi || !systemLayer) return;
    const pageEl = root.closest<HTMLElement>('.scq4-page');
    const page: ParentNode = pageEl ?? document;

    const mobileQuery = window.matchMedia(MOBILE_QUERY);
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const fineQuery = window.matchMedia('(pointer: fine)');

    // Offscreen WebGL2 for the GPU scenes; Canvas 2D fallback otherwise.
    const glCanvas = document.createElement('canvas');
    // A software rasterizer would ray-trace the black hole on the CPU, so
    // such devices get the Canvas 2D atom instead.
    const gl = glCanvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: true,
    });
    let atomGL: AtomGLScene | null = null;
    let atom2D: AtomCanvasScene | null = null;
    if (gl) {
      try {
        atomGL = createAtomGL(gl, mobileQuery.matches ? POINTS_MOBILE : POINTS_DESKTOP);
      } catch (err) {
        console.warn('[scq4] WebGL2 atom failed; using the Canvas 2D fallback.', err);
      }
    }
    if (!atomGL) atom2D = createAtomCanvas2D(POINTS_FALLBACK);
    // The black hole needs WebGL2; without it the stage simply omits it. As
    // the reader nears the first place it appears, its ray-tracing tables are
    // built in idle-time slices, then its shader is compiled (off the main
    // thread where the driver allows). Whichever finishes last uploads.
    let holeGL: BlackHoleScene | null = null;
    let holeFailed = !gl;
    let holeReady = false;
    let holeSteps: Generator<void, BlackHoleTables, void> | null = null;
    let holeTables: BlackHoleTables | null = null;
    let holeIdle: { id: number; idle: boolean } | null = null;
    let holePending: PendingProgram | null = null;
    let holePoll = 0;
    let backShown = true;
    let maxScroll = 0;

    let reduced = motionQuery.matches;
    let paused = motionPaused();
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let dpr = 1;
    let cues: Cue[] = [];
    let target: Channels = { ...ZERO };
    let current: Channels = { ...ZERO };
    const velocity: Channels = { ...ZERO };
    for (const k of CHANNEL_KEYS) velocity[k] = 0;
    const pointerTarget = { x: 0, y: 0 };
    const pointer = { x: 0, y: 0, vx: 0, vy: 0 };
    // Clocks (s), frozen when motion is reduced or paused. The idle clock
    // turns the atom and the black hole; each object's own clock runs only
    // while it is on stage, so it opens where it began however long the
    // reader took to get there.
    let clock = 0;
    let systemClock = 0;
    let qubitsClock = 0;
    let tables: AtomTables | null = null;
    let builtOrbital = Number.NaN;
    let contextLost = false;
    // Set on cleanup. Promise callbacks (fonts.ready) can't be cancelled, and
    // under React StrictMode / Fast Refresh the next mount may reuse objects,
    // so every deferred callback must check it before drawing.
    let disposed = false;

    let cloud: CloudStyle = { rgb: [109, 40, 217], alpha: 0.16, additive: false, dotPx: DOT_DIAMETER_PX };
    let haloRgb: RGB = [109, 40, 217];
    let haloAlpha = 0.07;
    let stageColors: { ink: RGB } = { ink: [22, 32, 51] };
    let sunCore: RGB = [255, 200, 120];
    let sunLimb: RGB = [214, 96, 14];
    let sunGlow: RGB = [236, 120, 30];
    let sunGlowAlpha = 0.22;
    let shadeRgb: RGB = [22, 32, 51];
    let qubitA: RGB = [245, 102, 0];
    let qubitB: RGB = [109, 40, 217];
    let patchRgb: RGB = [11, 16, 32];
    let patchAlpha = 1;
    let holeExposure = HOLE_EXPOSURE;
    // Whether the committee shows the black hole behind it (dark theme only).
    let holeBackdrop = false;

    // The committee's planetary system (the Director as the sun, the other
    // organizers in orbit, the black hole far behind), from 768 px.
    const systemEl = pageEl?.querySelector<HTMLElement>('.scq4-system') ?? null;
    const committee: CommitteeSystem | null = systemEl
      ? createCommitteeSystem({ systemEl, layer: systemLayer, requestFrame: () => requestFrame() })
      : null;
    let systemAlphaNow = 0;

    function readStyle() {
      const cs = getComputedStyle(display as HTMLCanvasElement);
      cloud = {
        rgb: parseRgb(cs.getPropertyValue('--scq4-cloud-rgb'), cloud.rgb),
        alpha: parseAlpha(cs.getPropertyValue('--scq4-cloud-alpha'), cloud.alpha),
        additive: cs.getPropertyValue('--scq4-cloud-blend').trim() === 'add',
        dotPx: DOT_DIAMETER_PX * dpr,
      };
      haloRgb = parseRgb(cs.getPropertyValue('--scq4-halo-rgb'), haloRgb);
      haloAlpha = parseAlpha(cs.getPropertyValue('--scq4-halo-alpha'), haloAlpha);
      stageColors = { ink: parseRgb(cs.getPropertyValue('--scq4-ink-rgb'), stageColors.ink) };
      sunCore = parseRgb(cs.getPropertyValue('--scq4-sun-core-rgb'), sunCore);
      sunLimb = parseRgb(cs.getPropertyValue('--scq4-sun-limb-rgb'), sunLimb);
      sunGlow = parseRgb(cs.getPropertyValue('--scq4-sun-glow-rgb'), sunGlow);
      sunGlowAlpha = parseAlpha(cs.getPropertyValue('--scq4-sun-glow-alpha'), sunGlowAlpha);
      shadeRgb = parseRgb(cs.getPropertyValue('--scq4-shade-rgb'), shadeRgb);
      qubitA = parseRgb(cs.getPropertyValue('--scq4-qubit-a-rgb'), qubitA);
      qubitB = parseRgb(cs.getPropertyValue('--scq4-qubit-b-rgb'), qubitB);
      patchRgb = parseRgb(cs.getPropertyValue('--scq4-hole-patch-rgb'), patchRgb);
      patchAlpha = parseAlpha(cs.getPropertyValue('--scq4-hole-patch-alpha'), patchAlpha);
      holeExposure = parseAlpha(cs.getPropertyValue('--scq4-hole-exposure'), holeExposure);
      holeBackdrop = cs.getPropertyValue('--scq4-hole-backdrop').trim() === 'show';
    }

    // How far the atom has become a sun: the last part of the approach.
    function sunMorph() {
      return smoothstep01((current.sun - SUN_MORPH_FROM) / (1 - SUN_MORPH_FROM));
    }

    // Orbital time of the system: its own clock plus scroll from its anchor.
    function systemTau() {
      if (!committee || reduced) return 0;
      return (
        (TAU / SYSTEM_INNER_PERIOD) * systemClock +
        ((window.scrollY - committee.anchor) / vh) * SYSTEM_TURNS_PER_VIEWPORT * TAU
      );
    }

    function drawSunGlow(x: number, y: number, slotR: number, alpha: number) {
      if (!ctx || alpha <= 0.002) return;
      const R = slotR * SUN_DISK_OF_SLOT;
      const G = R * SUN_GLOW_OF_DISK;
      const grad = ctx.createRadialGradient(x, y, R * 0.8, x, y, G);
      grad.addColorStop(0, rgba(sunGlow, sunGlowAlpha * alpha));
      grad.addColorStop(0.35, rgba(sunGlow, sunGlowAlpha * 0.4 * alpha));
      grad.addColorStop(1, rgba(sunGlow, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, G, 0, TAU);
      ctx.fill();
    }

    // Limb-darkened photosphere: I(mu) / I(1) = 1 - u (1 - mu), mu = cos of
    // the angle from the disk center's normal, shaded from the core color at
    // the center to the limb color where I = 1 - u.
    function drawSunDisk(x: number, y: number, slotR: number, alpha: number) {
      if (!ctx || alpha <= 0.002) return;
      const R = slotR * SUN_DISK_OF_SLOT;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, R);
      for (let k = 0; k <= SUN_LIMB_STOPS; k++) {
        const rho = k / SUN_LIMB_STOPS;
        const mu = Math.sqrt(Math.max(0, 1 - rho * rho));
        const bright = 1 - SUN_LIMB_DARKENING * (1 - mu);
        const t = (bright - (1 - SUN_LIMB_DARKENING)) / SUN_LIMB_DARKENING;
        grad.addColorStop(rho, rgba(mixRgb(sunLimb, sunCore, t), alpha));
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, R, 0, TAU);
      ctx.fill();
    }

    function ensureTables(force = false) {
      if (disposed) return;
      if (!force && tables && Math.abs(current.orbital - builtOrbital) < LADDER_REBUILD_STEP) return;
      const st = ladderState(current.orbital);
      tables = buildTables(st);
      atomGL?.setTables(tables);
      atom2D?.setTables(tables);
      builtOrbital = current.orbital;
      const label = stateLabel(st);
      if (psi && psi.textContent !== label) psi.textContent = label;
    }

    function drawHalo(c: CanvasRenderingContext2D, x: number, y: number, radius: number, opacity: number) {
      if (opacity <= 0.002 || radius <= 0) return;
      const [r, g, b] = haloRgb;
      const R = radius * ATOM_HALO_RADIUS;
      const grad = c.createRadialGradient(x, y, 0, x, y, R);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(haloAlpha * opacity).toFixed(3)})`);
      grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${(haloAlpha * opacity * 0.35).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      c.fillStyle = grad;
      c.fillRect(x - R, y - R, 2 * R, 2 * R);
    }

    function failHole(err: unknown) {
      holeFailed = true;
      holeSteps = null;
      holeTables = null;
      console.warn('[scq4] black hole scene failed; the stage continues without it.', err);
    }

    // Scroll offset from which the hole may be on screen, or null if the
    // page never shows it: its first cue, or the committee's runway coming
    // into view (when the system has room for it in the background).
    function holeFirstScroll(): number | null {
      const cue = cues.find((c) => c.ch.hole > 0);
      const fromCue = cue ? cue.anchor : null;
      const fromSystem =
        holeBackdrop && committee?.hasBackdrop ? Math.max(0, committee.runwayTop - vh) : null;
      if (fromCue === null) return fromSystem;
      if (fromSystem === null) return fromCue;
      return Math.min(fromCue, fromSystem);
    }

    function holeWanted() {
      return !holeFailed && !holeReady && holeFirstScroll() !== null;
    }

    // The hole's first appearance is within `viewports` of scrolling (or
    // already reached, e.g. after an anchor jump).
    function holeWake(viewports: number) {
      const first = holeFirstScroll();
      return first !== null && window.scrollY + vh * viewports >= first;
    }

    // Tables: ~75 ms of work on a laptop (several times that on a phone), so
    // they are built a few milliseconds at a time in idle periods. Safari has
    // no requestIdleCallback; short timeouts stand in.
    function scheduleHoleBuild() {
      if (disposed || holeIdle || holeTables || !holeWanted()) return;
      if (!holeSteps && !holeWake(HOLE_BUILD_WAKE_VIEWPORTS)) return;
      holeSteps ??= blackHoleTableSteps();
      const run = (deadline?: IdleDeadline) => {
        holeIdle = null;
        if (disposed || !holeSteps) return;
        const budget =
          deadline && !deadline.didTimeout
            ? Math.min(deadline.timeRemaining(), HOLE_BUILD_SLICE_MS)
            : HOLE_BUILD_SLICE_MS;
        const until = performance.now() + Math.max(1, budget);
        try {
          let step = holeSteps.next();
          while (!step.done && performance.now() < until) step = holeSteps.next();
          if (step.done) {
            holeTables = step.value;
            holeSteps = null;
            finishHole();
            return;
          }
        } catch (err) {
          failHole(err);
          return;
        }
        scheduleHoleBuild();
      };
      holeIdle =
        typeof window.requestIdleCallback === 'function'
          ? { id: window.requestIdleCallback(run, { timeout: HOLE_IDLE_TIMEOUT_MS }), idle: true }
          : { id: window.setTimeout(run, HOLE_BUILD_GAP_MS), idle: false };
    }

    // Shader: compiled once the hole is nearer still.
    function maybeCompileHole() {
      if (!gl || holeGL || holePending || !holeWanted()) return;
      if (!holeWake(HOLE_COMPILE_WAKE_VIEWPORTS)) return;
      try {
        holePending = startBlackHoleProgram(gl);
      } catch (err) {
        failHole(err);
        return;
      }
      pollHole();
    }

    function pollHole() {
      holePoll = 0;
      if (disposed || !gl || !holePending) return;
      let program: WebGLProgram | null;
      try {
        program = holePending.poll();
      } catch (err) {
        holePending = null;
        failHole(err);
        return;
      }
      if (!program) {
        holePoll = window.setTimeout(pollHole, HOLE_POLL_MS);
        return;
      }
      holePending = null;
      try {
        holeGL = createBlackHoleScene(gl, program);
      } catch (err) {
        failHole(err);
        return;
      }
      finishHole();
    }

    function finishHole() {
      if (disposed || !holeGL || !holeTables || holeReady) return;
      holeGL.setTables(holeTables);
      holeTables = null; // the GPU holds them now
      holeReady = true;
      draw();
      schedule();
    }

    // Ray-trace the hole into the GL canvas at (cx, cy) CSS px with a
    // rendered disc of radius viewR CSS px. Returns false if nothing drew.
    function renderHole(
      W: number,
      H: number,
      cx: number,
      cy: number,
      viewR: number,
      incl: number,
      azimuth: number,
      opacity: number,
      exposure: number,
    ): boolean {
      if (!gl || !holeGL || !holeReady || opacity <= 0.002) return false;
      const still = reduced;
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      holeGL.draw({
        viewportW: W,
        viewportH: H,
        cx: cx * dpr,
        cy: cy * dpr,
        pxPerM: (viewR / HOLE_VIEW_RADIUS / HOLE_M_PER_SLOT_RADIUS) * dpr,
        viewRadiusPx: Math.max(1, viewR * dpr),
        inclination: incl,
        azimuth: (still ? 0 : clock * HOLE_STAR_YAW_RATE) + azimuth,
        time: still ? 0 : clock * HOLE_M_PER_SECOND,
        opacity,
        exposure,
        sparse: dpr >= HOLE_SPARSE_MIN_DPR,
      });
      return true;
    }

    // A black hole cue's hole: copied from the GL canvas onto the stage.
    function drawCueHole(W: number, H: number) {
      const hole = clamp01(current.hole);
      const viewR = current.br * HOLE_VIEW_RADIUS;
      const azimuth = pointer.x * HOLE_PARALLAX_AZIMUTH;
      if (!ctx || !renderHole(W, H, current.bx, current.by, viewR, current.incl, azimuth, hole, HOLE_EXPOSURE)) return;
      const x0 = Math.max(0, Math.floor((current.bx - viewR) * dpr));
      const y0 = Math.max(0, Math.floor((current.by - viewR) * dpr));
      const x1 = Math.min(W, Math.ceil((current.bx + viewR) * dpr));
      const y1 = Math.min(H, Math.ceil((current.by + viewR) * dpr));
      if (x1 <= x0 || y1 <= y0) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(glCanvas, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // The committee's far-off black hole, on the back canvas (under every
    // body): in the light theme over a soft patch of night, so its lensed
    // stars and disk read on paper; the dark page is night already.
    function drawBackdrop(pose: HolePose | null, W: number, H: number) {
      if (!back || !backCtx) return;
      const patchR = pose ? pose.r * HOLE_PATCH_OF_DISC : 0;
      const size = Math.ceil(2 * patchR * dpr);
      if (!pose || size < 2 || !holeReady) {
        if (backShown) {
          back.style.opacity = '0';
          backShown = false;
        }
        return;
      }
      if (back.width !== size || back.height !== size) {
        back.width = size;
        back.height = size;
        back.style.width = back.style.height = `${size / dpr}px`;
      }
      back.style.transform = `translate(${(pose.x - patchR).toFixed(1)}px, ${(pose.y - patchR).toFixed(1)}px)`;
      if (!backShown) {
        back.style.opacity = '1';
        backShown = true;
      }
      backCtx.setTransform(1, 0, 0, 1, 0, 0);
      backCtx.clearRect(0, 0, size, size);
      const alpha = patchAlpha * pose.opacity;
      if (alpha > 0.002) {
        const c = size / 2;
        const grad = backCtx.createRadialGradient(c, c, 0, c, c, c);
        // Smoothstep falloff over the outer 45%, so the patch has no edge.
        for (const [at, a] of [[0, 1], [0.55, 1], [0.7, 0.84], [0.8, 0.5], [0.9, 0.16], [1, 0]] as const) {
          grad.addColorStop(at, rgba(patchRgb, alpha * a));
        }
        backCtx.fillStyle = grad;
        backCtx.fillRect(0, 0, size, size);
      }
      const azimuth = pose.azimuth;
      if (!renderHole(W, H, pose.x, pose.y, pose.r, pose.incl, azimuth, pose.opacity, holeExposure)) return;
      // Copy the hole's square from the GL canvas (clipped to it).
      const sx = Math.round((pose.x - patchR) * dpr);
      const sy = Math.round((pose.y - patchR) * dpr);
      const x0 = Math.max(0, sx);
      const y0 = Math.max(0, sy);
      const x1 = Math.min(W, sx + size);
      const y1 = Math.min(H, sy + size);
      if (x1 <= x0 || y1 <= y0) return;
      backCtx.drawImage(glCanvas, x0, y0, x1 - x0, y1 - y0, x0 - sx, y0 - sy, x1 - x0, y1 - y0);
    }

    // m: how far the atom has collapsed into a sun (the shader contracts the
    // cloud inside out).
    function atomDraw(cy: number, m: number, rot: Float32Array): AtomDraw | null {
      if (!tables) return null;
      const opacity = clamp01(current.atom);
      if (opacity <= 0.002) return null;
      return {
        cx: current.ax * dpr,
        cy: cy * dpr,
        pxPerBohr: ((current.ar * CLOUD_R95_OF_SLOT) / tables.r95) * dpr,
        rot,
        opacity,
        collapse: m,
      };
    }

    function atomRot() {
      const yaw = (reduced ? STATIC_YAW : IDLE_YAW_RATE * clock) + pointer.x * PARALLAX_YAW;
      const elev = ATOM_ELEVATION + pointer.y * PARALLAX_ELEVATION;
      return atomRotation(ATOM_TILT, yaw, elev);
    }

    // The cloud's dots warm to the sun's glow color and thin into a corona.
    function cloudStyle(m: number): CloudStyle {
      if (m <= 0) return cloud;
      return {
        ...cloud,
        rgb: mixRgb(cloud.rgb, sunGlow, m),
        alpha: cloud.alpha * (1 - SUN_CLOUD_FADE * m),
      };
    }

    function draw() {
      if (disposed || contextLost) return;
      if (!tables) ensureTables(true);
      if (!tables || !ctx || !nucleus || !psi || !display) return;
      const W = display.width;
      const H = display.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (gl && (glCanvas.width !== W || glCanvas.height !== H)) {
        glCanvas.width = W;
        glCanvas.height = H;
      }

      const opacity = clamp01(current.atom);
      const m = sunMorph();
      // A forming sun holds still at the center of its orbits.
      const bob = reduced ? 0 : IDLE_BOB_AMPLITUDE * vh * Math.sin(IDLE_BOB_RATE * clock) * (1 - m);
      const atomY = current.ay + bob;
      const form = smoothstep01((m - SYSTEM_FADE_FROM) / (1 - SYSTEM_FADE_FROM));
      const systemAlpha = committee?.active ? opacity * form : 0;
      systemAlphaNow = systemAlpha;
      const tau = systemTau();
      const sunR = current.ar * SUN_DISK_OF_SLOT;
      const systemColors = { ink: stageColors.ink, shade: shadeRgb };

      // Far background: the committee's black hole (back canvas).
      drawBackdrop(holeBackdrop ? (committee?.backdropPose(current.ax, atomY, systemAlpha) ?? null) : null, W, H);
      if (committee && systemAlpha > 0.002) {
        committee.drawOrbits(ctx, current.ax, atomY, systemAlpha, form, tau, false, systemColors);
      }
      // The orbital's armature (node rings, axis), far halves behind the
      // cloud. It belongs to the full-strength atom, like the caption.
      const rot = atomRot();
      const armature: ArmatureDraw = {
        cx: current.ax,
        cy: atomY,
        radiusPx: current.ar * CLOUD_R95_OF_SLOT,
        rot,
        orbital: current.orbital,
        alpha: clamp01((opacity - 0.5) * 2) * (1 - m),
        ink: stageColors.ink,
      };
      drawNodeRings(ctx, armature, 'back');
      drawHalo(ctx, current.ax, atomY, current.ar, opacity * (1 - m));
      drawSunGlow(current.ax, atomY, current.ar, opacity * m);

      const a = atomDraw(atomY, m, rot);
      const style = cloudStyle(m);
      drawCueHole(W, H);
      if (gl && atomGL && a) {
        gl.viewport(0, 0, W, H);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        atomGL.draw(a, style, W, H);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(glCanvas, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else if (atom2D && a) {
        atom2D.draw(ctx, a, style);
      }
      drawNodeRings(ctx, armature, 'front');
      drawSunDisk(current.ax, atomY, current.ar, opacity * m);
      if (committee && systemAlpha > 0.002) {
        committee.drawOrbits(ctx, current.ax, atomY, systemAlpha, form, tau, true, systemColors);
      }

      // The entangled qubits.
      const qubits = clamp01(current.qubits);
      if (qubits > 0.002) {
        drawQubitPair(ctx, {
          x: current.qx,
          y: current.qy,
          r: current.qr,
          opacity: qubits,
          t: reduced ? QUBITS_STILL_TIME : qubitsClock,
          colors: { ink: stageColors.ink, a: qubitA, b: qubitB },
        });
      }

      committee?.update(current.ax, atomY, systemAlpha, opacity * m, sunR, tau, systemColors);
      // The system takes the pointer only while it holds still (pinned, or
      // at rest above the page end).
      committee?.setLive(
        systemAlpha > 0.95 && Math.abs(current.ay - target.ay) < 2 && Math.abs(velocity.ay) < 4,
      );

      nucleus.style.transform = `translate(${current.ax.toFixed(2)}px, ${atomY.toFixed(2)}px)`;
      nucleus.style.opacity = (opacity * (1 - m)).toFixed(3);
      psi.style.transform = `translate(${current.ax.toFixed(2)}px, ${(atomY + current.ar * 1.02).toFixed(2)}px) translateX(-50%)`;
      // The caption belongs to the full-strength atom only: it fades out as
      // the atom drops toward a faint companion (opacity <= 0.5) or becomes
      // a sun.
      psi.style.opacity = (clamp01((opacity - 0.5) * 2) * (1 - m)).toFixed(3);
    }

    // Target channels at a scroll offset. At the committee, the system also
    // rides up with the page near its end and comes to rest above it.
    function targetAt(scrollY: number): Channels | null {
      const next = sampleCues(cues, scrollY, reduced);
      if (next && committee?.active && next.sun > 0) {
        next.ay = Math.min(next.ay, committee.pushLimit(scrollY));
      }
      return next;
    }

    function retarget() {
      const next = targetAt(window.scrollY);
      if (next) target = next;
    }

    let initialized = false;
    function layout() {
      if (disposed || !display) return;
      // The fixed stage box excludes a classic (non-overlay) scrollbar, so
      // the canvas is sized from its box, not from innerWidth.
      const box = display.getBoundingClientRect();
      vw = box.width || window.innerWidth;
      vh = box.height || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, atomGL ? MAX_DPR : 1);
      const w = Math.max(1, Math.round(vw * dpr));
      const h = Math.max(1, Math.round(vh * dpr));
      // Assigning a size clears and reallocates the canvas; skip it if equal.
      if (display.width !== w) display.width = w;
      if (display.height !== h) display.height = h;
      readStyle();
      const scroller = document.scrollingElement ?? document.documentElement;
      maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      cues = readCues(page, window.scrollY, vw, vh, maxScroll);
      // The sticky nav covers the top of the viewport (it scrolls away on
      // short screens), so the system keeps clear of it.
      const nav = document.querySelector<HTMLElement>('.nav');
      const navPosition = nav ? getComputedStyle(nav).position : '';
      const navH =
        nav && (navPosition === 'sticky' || navPosition === 'fixed') ? nav.getBoundingClientRect().height : 0;
      committee?.layout({ vw, vh, navH, maxScroll });
      scheduleHoleBuild();
      maybeCompileHole();
      retarget();
      if (!initialized || reduced) {
        current = { ...target };
        initialized = true;
      }
      // The tables depend only on the orbital, never on the viewport.
      ensureTables();
      draw();
    }

    // Animation loop, gated like the site's other canvases: stops while the
    // tab is hidden, under reduced motion, once the stage is empty and
    // settled, and once settled while the reader has paused motion; scroll
    // and pointer input restart it. Time comes from the rAF timestamps only;
    // lastTime = 0 marks a restart (first frame: dt = 0).
    let rafId = 0;
    let lastTime = 0;
    function settled() {
      return CHANNEL_KEYS.every(
        (k) => Math.abs(current[k] - target[k]) < 0.05 && Math.abs(velocity[k]) < 0.05,
      );
    }
    function stageEmpty() {
      return OPACITY_KEYS.every((k) => current[k] <= 0.002 && target[k] <= 0.002);
    }
    const shows = (k: keyof Channels) => current[k] > 0.002 || target[k] > 0.002;
    // Settled, with only slow motion on stage (the atom's idle turn, the
    // qubits' precession, the system's orbits and its far-off black hole):
    // 30 fps is enough. A black hole cue's large disk keeps 60, and so does
    // turning the system by hand.
    function idlePace() {
      return !shows('hole') && !committee?.interacting() && settled();
    }
    function frame(time: number) {
      rafId = 0;
      if (disposed) return;
      const interval = idlePace() ? IDLE_FRAME_MS : ACTIVE_FRAME_MS;
      if (lastTime && time - lastTime < interval - FRAME_SLACK_MS) {
        // Too soon (high-refresh display): the time carries to the next frame.
        rafId = requestAnimationFrame(frame);
        return;
      }
      const dt = lastTime ? Math.min(Math.max(0, time - lastTime) / 1000, MAX_FRAME_DT) : 0;
      lastTime = time;
      if (!paused) {
        clock += dt;
        if (committee?.active && current.atom * sunMorph() > 0.002) systemClock += dt;
        if (current.qubits > 0.002) qubitsClock += dt;
      }
      committee?.step(dt, reduced);
      for (const k of CHANNEL_KEYS) {
        [current[k], velocity[k]] = springStep(current[k], velocity[k], target[k], SPRING_OMEGA, dt);
      }
      // An invisible object jumps straight to where it is going.
      for (const o of SLOT_OBJECTS) {
        if (current[o.op] >= INVISIBLE || target[o.op] >= INVISIBLE) continue;
        for (const k of [o.x, o.y, o.r]) {
          current[k] = target[k];
          velocity[k] = 0;
        }
      }
      [pointer.x, pointer.vx] = springStep(pointer.x, pointer.vx, pointerTarget.x, SPRING_OMEGA, dt);
      [pointer.y, pointer.vy] = springStep(pointer.y, pointer.vy, pointerTarget.y, SPRING_OMEGA, dt);
      ensureTables();
      draw();
      schedule();
    }
    function schedule() {
      if (disposed || rafId) return;
      const quiet = settled() && !committee?.interacting();
      if (contextLost || document.hidden || reduced || (stageEmpty() && quiet) || (paused && quiet)) {
        lastTime = 0;
        return;
      }
      rafId = requestAnimationFrame(frame);
    }
    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      lastTime = 0;
    }

    // Reduced motion: no springs, no idle motion; redraw once per scroll frame.
    let staticPending = 0;
    function drawStaticSoon() {
      if (staticPending) return;
      staticPending = requestAnimationFrame(() => {
        staticPending = 0;
        current = { ...target };
        committee?.step(0, true);
        ensureTables();
        draw();
      });
    }

    // Something asked for a frame (turning the system by hand).
    function requestFrame() {
      if (disposed || contextLost) return;
      if (reduced) drawStaticSoon();
      else schedule();
    }

    const onScroll = () => {
      retarget();
      scheduleHoleBuild();
      maybeCompileHole();
      requestFrame();
    };
    const onPointer = (e: PointerEvent) => {
      if (reduced || !fineQuery.matches) return;
      pointerTarget.x = (e.clientX / vw) * 2 - 1;
      pointerTarget.y = (e.clientY / vh) * 2 - 1;
      schedule();
    };
    const onVisibility = () => (document.hidden ? stop() : schedule());
    const onMotion = () => {
      reduced = motionQuery.matches;
      if (reduced) {
        stop();
        pointerTarget.x = pointerTarget.y = pointer.x = pointer.y = 0;
      }
      layout();
      schedule();
    };
    const onPause = () => {
      paused = motionPaused();
      // Resuming restarts the clocks; pausing lets the loop stop once still.
      schedule();
    };
    const onScheme = () => {
      readStyle();
      // Switching to dark brings in the hole's backdrop; start its build.
      scheduleHoleBuild();
      draw();
    };

    // Cue boxes move when the page reflows (fonts, FAQ rows opening, images),
    // so re-read them on any size change of the page, batched per frame.
    let layoutPending = 0;
    const requestLayout = () => {
      if (disposed || layoutPending) return;
      layoutPending = requestAnimationFrame(() => {
        layoutPending = 0;
        layout();
        schedule();
      });
    };
    const resizeObserver = new ResizeObserver(requestLayout);
    if (pageEl) resizeObserver.observe(pageEl);
    window.addEventListener('resize', requestLayout);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    motionQuery.addEventListener('change', onMotion);
    darkQuery.addEventListener('change', onScheme);
    const offPause = onMotionChange(onPause);

    // If the GPU drops the context (driver reset, memory pressure), the stage
    // goes quiet and the page stays fully readable; nothing is rebuilt.
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      stop();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, display.width, display.height);
      backCtx.clearRect(0, 0, back.width, back.height);
      nucleus.style.opacity = '0';
      psi.style.opacity = '0';
    };
    glCanvas.addEventListener('webglcontextlost', onContextLost);

    if (process.env.NODE_ENV !== 'production') {
      window.__scq4Stage = {
        renderAt(scrollY: number, opts = {}) {
          const settledTarget = targetAt(scrollY);
          if (settledTarget) {
            current = { ...settledTarget };
            for (const k of CHANNEL_KEYS) velocity[k] = 0;
          }
          if (opts.t !== undefined) clock = systemClock = qubitsClock = opts.t;
          if (committee && (opts.yaw !== undefined || opts.elevation !== undefined)) {
            const v = committee.view();
            committee.setView(opts.yaw ?? v.yaw, opts.elevation ?? v.elevation);
          }
          ensureTables(true);
          draw();
          return {
            ...current,
            label: psi.textContent,
            renderer: atomGL ? 'webgl2' : 'canvas2d',
            cues: cues.length,
            maxScroll,
            systemAlpha: systemAlphaNow,
            committee: committee ? committee.inspect() : null,
            holeReady,
          };
        },
      };
    }

    // Layout (and a first frame) right away, so even a hidden tab shows the
    // composed stage; fonts can shift the slots, so re-read once they load.
    layout();
    schedule();
    document.fonts?.ready.then(requestLayout).catch(() => {});

    return () => {
      disposed = true;
      stop();
      if (staticPending) cancelAnimationFrame(staticPending);
      if (layoutPending) cancelAnimationFrame(layoutPending);
      resizeObserver.disconnect();
      window.removeEventListener('resize', requestLayout);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', onMotion);
      darkQuery.removeEventListener('change', onScheme);
      offPause();
      glCanvas.removeEventListener('webglcontextlost', onContextLost);
      if (holeIdle) {
        if (holeIdle.idle) window.cancelIdleCallback(holeIdle.id);
        else window.clearTimeout(holeIdle.id);
      }
      if (holePoll) window.clearTimeout(holePoll);
      holePending?.cancel();
      atomGL?.dispose();
      holeGL?.dispose();
      committee?.dispose();
      // Release the GPU context and the offscreen buffers now rather than at
      // garbage collection (Fast Refresh and StrictMode remount the stage).
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      glCanvas.width = glCanvas.height = 0;
      back.width = back.height = 0;
      systemLayer.replaceChildren();
      if (process.env.NODE_ENV !== 'production') delete window.__scq4Stage;
    };
  }, []);

  return (
    <div ref={rootRef} className="scq4-stage" aria-hidden="true">
      <canvas ref={backRef} className="scq4-stage-back" />
      <div ref={systemRef} className="scq4-system-layer" />
      <canvas ref={canvasRef} className="scq4-stage-canvas" />
      <span ref={nucleusRef} className="scq4-nucleus" />
      <span ref={psiRef} className="scq4-psi" />
    </div>
  );
}
