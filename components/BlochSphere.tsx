'use client';

import { useEffect, useRef } from 'react';
import { BLOCH_SPHERE_TILT, blochSphereCamera, blochState } from '@/lib/blochSphere.mjs';

// Geometry: |psi> = cos(theta/2)|0> + e^{i phi} sin(theta/2)|1> maps to the
// Bloch vector (x, y, z) = (sin theta cos phi, sin theta sin phi, cos theta).
// The SVG uses an orthographic projection with the camera on the -y side,
// tilted TILT rad above the equator:  sx = R x,  sy = -R (z cos TILT + y sin TILT).
// That camera is right-handed (screen right = +x, up = (0, sin, cos), toward
// the viewer = (0, -cos, sin); lib/blochSphere.mjs, checked by
// scripts/verify-bloch-sphere.mjs), so phi increases counterclockwise seen
// from +z, as it should. The dashed far half of the equator is the
// front/back cue; without it the sphere reads as its mirror image.
const R = 88; // sphere radius, px in the 240x240 viewBox
const CX = 120;
const CY = 122;
const TILT = BLOCH_SPHERE_TILT; // rad (~20 deg)
const CAMERA = blochSphereCamera(TILT);
const AUTO_RATE = 0.35; // rad/s of idle phi precession
// Idle theta drift, so the amplitudes and odds change as well as the phase:
// a sway built from two slow sines of unrelated periods (it looks unplanned
// and never quite repeats), plus a pull back toward the equator that keeps
// it clear of the poles.
const WANDER_RATE = 0.5; // rad/s through the sway's phase
const THETA_SWAY = 0.25; // rad/s, the sway's peak speed
const THETA_PULL = 0.1; // 1/s, toward theta = pi/2
const RESUME_MS = 2000; // idle time before auto-rotation resumes
const KEY_STEP = (5 * Math.PI) / 180;
// Keyboard moves are announced once the keys settle, not on every repeat.
const ANNOUNCE_DELAY_MS = 300;
const DRAG_RATE = 0.012; // rad per dragged px
const GLIDE_MS = 450; // the arrow's glide to a pole when its label is pressed

const INITIAL_THETA = (60 * Math.PI) / 180;
const INITIAL_PHI = (35 * Math.PI) / 180;
// The drawn meridian's longitude: at 90 deg - TILT its projection is as wide
// as the equator is tall.
const MERIDIAN_PHI = Math.PI / 2 - TILT;
const MERIDIAN_SEGMENTS = 72;

// Interaction timing for the idle precession. A module-level helper: the
// React Compiler lint treats a direct performance.now() in the component's
// handlers as an impure call during render.
const nowMs = () => performance.now();

function clampTheta(theta: number): number {
  return Math.min(Math.PI - 0.02, Math.max(0.02, theta));
}

function toDeg(rad: number): number {
  return Math.round((rad * 180) / Math.PI);
}

// An azimuth in whole degrees, 0–359: a phi just under 2π rounds to 360,
// which would read as a different angle from the 0° beside it.
function azimuthDeg(rad: number): number {
  return toDeg(rad) % 360;
}

// The state the arrow stands for (lib/blochSphere.mjs blochState):
// |psi> = cos(theta/2)|0> + e^{i phi} sin(theta/2)|1>, P(0) = cos^2(theta/2).
function stateText(theta: number, phi: number) {
  const st = blochState(theta, phi);
  return {
    a0: st.a0.toFixed(2),
    a1: st.a1.toFixed(2),
    phase: `${azimuthDeg(st.phase)}°`,
    p0: st.p0.toFixed(2),
    p1: st.p1.toFixed(2),
    p0Pct: `${(st.p0 * 100).toFixed(1)}%`,
    p1Pct: `${(st.p1 * 100).toFixed(1)}%`,
  };
}

function projectPoint(x: number, y: number, z: number): { sx: number; sy: number } {
  const { u, v } = CAMERA;
  return {
    sx: CX + R * (x * u[0] + y * u[1] + z * u[2]),
    sy: CY - R * (x * v[0] + y * v[1] + z * v[2]),
  };
}

function project(theta: number, phi: number): { sx: number; sy: number } {
  return projectPoint(
    Math.sin(theta) * Math.cos(phi),
    Math.sin(theta) * Math.sin(phi),
    Math.cos(theta),
  );
}

// A true meridian: the great circle through both poles at MERIDIAN_PHI (and
// its opposite longitude), traced through the same projection so it meets
// the axis ends exactly.
function meridianPath(): string {
  const parts: string[] = [];
  for (let k = 0; k <= MERIDIAN_SEGMENTS; k++) {
    const t = (2 * Math.PI * k) / MERIDIAN_SEGMENTS;
    const s = Math.sin(t);
    const { sx, sy } = projectPoint(s * Math.cos(MERIDIAN_PHI), s * Math.sin(MERIDIAN_PHI), Math.cos(t));
    parts.push(`${k ? 'L' : 'M'} ${sx.toFixed(2)} ${sy.toFixed(2)}`);
  }
  return parts.join(' ');
}

// The equator's far half (y > 0) projects above the center and is dashed;
// the near half is solid, so the sphere reads front from back.
const EQUATOR_RY = (R * Math.sin(TILT)).toFixed(2);
const EQUATOR_BACK = `M ${CX - R} ${CY} A ${R} ${EQUATOR_RY} 0 0 1 ${CX + R} ${CY}`;
const EQUATOR_FRONT = `M ${CX - R} ${CY} A ${R} ${EQUATOR_RY} 0 0 0 ${CX + R} ${CY}`;
const MERIDIAN = meridianPath();

// Interactive Bloch sphere for the learning-resources page. Idle behavior is
// a slow phi precession with a gentle theta drift, so the readout's numbers
// all change (rAF gated on visibility + on-screen + reduced motion,
// mirroring QuantumCanvas); dragging or arrow keys move the state
// vector directly, pressing the |0⟩ or |1⟩ label (or the 0 or 1 key) glides
// it to that pole (a jump with reduced motion), and auto-rotation resumes
// ~2 s after the last interaction.
// Angles live in refs and every update writes the SVG/readout directly (like
// ConstellationDivider) — per-frame React state would re-render the whole
// figure at 60 fps. Initial angles are constants, so static-export hydration
// always matches.
export default function BlochSphere() {
  const stageRef = useRef<HTMLDivElement>(null);
  const vectorRef = useRef<SVGLineElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const a0Ref = useRef<HTMLSpanElement>(null);
  const a1Ref = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<HTMLElement>(null);
  const p0Ref = useRef<HTMLSpanElement>(null);
  const p1Ref = useRef<HTMLSpanElement>(null);
  const p0BarRef = useRef<HTMLSpanElement>(null);
  const p1BarRef = useRef<HTMLSpanElement>(null);
  const announceRef = useRef<HTMLSpanElement>(null);
  const announceTimer = useRef(0);
  const angles = useRef({ theta: INITIAL_THETA, phi: INITIAL_PHI });
  const lastInteraction = useRef(0);
  const dragFrom = useRef<{ x: number; y: number } | null>(null);
  // A glide in progress toward a pole (theta from, theta to, start time),
  // and whether the animation loop that moves it is running.
  const glide = useRef<{ from: number; to: number; start: number } | null>(null);
  const loopRunning = useRef(false);
  const wander = useRef(0); // the idle theta sway's phase

  const render = () => {
    const { theta, phi } = angles.current;
    const { sx, sy } = project(theta, phi);
    vectorRef.current?.setAttribute('x2', sx.toFixed(2));
    vectorRef.current?.setAttribute('y2', sy.toFixed(2));
    tipRef.current?.setAttribute('cx', sx.toFixed(2));
    tipRef.current?.setAttribute('cy', sy.toFixed(2));
    if (readoutRef.current) {
      readoutRef.current.textContent = `θ = ${toDeg(theta)}° · φ = ${azimuthDeg(phi)}°`;
    }
    const t = stateText(theta, phi);
    if (a0Ref.current) a0Ref.current.textContent = t.a0;
    if (a1Ref.current) a1Ref.current.textContent = t.a1;
    if (phaseRef.current) phaseRef.current.textContent = t.phase;
    if (p0Ref.current) p0Ref.current.textContent = t.p0;
    if (p1Ref.current) p1Ref.current.textContent = t.p1;
    p0BarRef.current?.style.setProperty('width', t.p0Pct);
    p1BarRef.current?.style.setProperty('width', t.p1Pct);
  };

  // Everything is read when the announcement is made, so the angles and the
  // odds in one sentence always describe the same position.
  const announce = () => {
    window.clearTimeout(announceTimer.current);
    announceTimer.current = window.setTimeout(() => {
      const { theta, phi } = angles.current;
      const t = stateText(theta, phi);
      if (announceRef.current) {
        announceRef.current.textContent = `theta ${toDeg(theta)} degrees, phi ${azimuthDeg(phi)} degrees. Probability of 0 is ${t.p0}, of 1 is ${t.p1}.`;
      }
    }, ANNOUNCE_DELAY_MS);
  };

  // Pressing the |0⟩ or |1⟩ label (or the 0 or 1 key) sends the arrow to
  // that pole: an eased glide, or a jump with reduced motion or whenever the
  // animation loop isn't running (the sphere off screen, say). phi is kept,
  // so the precession picks up where it was.
  const goToPole = (theta: number) => {
    lastInteraction.current = nowMs();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !loopRunning.current || angles.current.theta === theta) {
      glide.current = null;
      angles.current.theta = theta;
      render();
      announce();
      return;
    }
    glide.current = { from: angles.current.theta, to: theta, start: nowMs() };
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let rafId = 0;
    let lastTime = 0;
    let intersecting = true;

    function frame(time: number) {
      rafId = 0;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      const g = glide.current;
      if (g) {
        const t = Math.min(1, Math.max(0, (time - g.start) / GLIDE_MS));
        angles.current.theta = g.from + (g.to - g.from) * (1 - (1 - t) ** 3);
        lastInteraction.current = time;
        render();
        if (t === 1) {
          glide.current = null;
          announce();
        }
      } else if (time - lastInteraction.current > RESUME_MS && !dragFrom.current) {
        const a = angles.current;
        a.phi = (a.phi + AUTO_RATE * dt) % (Math.PI * 2);
        wander.current += WANDER_RATE * dt;
        const w = wander.current;
        const sway = THETA_SWAY * (Math.sin(w) + 0.6 * Math.sin(2.3 * w + 1.1));
        a.theta = clampTheta(a.theta + (sway + THETA_PULL * (Math.PI / 2 - a.theta)) * dt);
        render();
      }
      schedule();
    }

    function schedule() {
      const running = intersecting && !document.hidden && !motionQuery.matches;
      if (running && rafId === 0) {
        rafId = requestAnimationFrame(frame);
      }
      loopRunning.current = rafId !== 0;
    }

    function updateRunning() {
      const running = intersecting && !document.hidden && !motionQuery.matches;
      if (!running && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
        // A glide the loop can no longer move ends at its pole now.
        const g = glide.current;
        if (g) {
          glide.current = null;
          angles.current.theta = g.to;
          render();
          announce();
        }
      } else if (running && rafId === 0) {
        lastTime = nowMs();
        rafId = requestAnimationFrame(frame);
      }
      loopRunning.current = rafId !== 0;
    }

    const intersectionObserver = new IntersectionObserver((entries) => {
      // The newest entry wins: one callback can carry several for the stage.
      intersecting = entries[entries.length - 1]?.isIntersecting ?? intersecting;
      updateRunning();
    });
    intersectionObserver.observe(stage);
    const onVisibility = () => updateRunning();
    document.addEventListener('visibilitychange', onVisibility);
    motionQuery.addEventListener('change', updateRunning);

    lastTime = nowMs();
    schedule();

    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      loopRunning.current = false;
      window.clearTimeout(announceTimer.current);
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', updateRunning);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    glide.current = null;
    dragFrom.current = { x: e.clientX, y: e.clientY };
    lastInteraction.current = nowMs();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const from = dragFrom.current;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    dragFrom.current = { x: e.clientX, y: e.clientY };
    lastInteraction.current = nowMs();
    angles.current.phi =
      (angles.current.phi + dx * DRAG_RATE + Math.PI * 2) % (Math.PI * 2);
    angles.current.theta = clampTheta(angles.current.theta + dy * DRAG_RATE);
    render();
  };

  const onPointerUp = () => {
    dragFrom.current = null;
    lastInteraction.current = nowMs();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Browser and system shortcuts (Ctrl/Cmd+0 resets the zoom) pass through.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const a = angles.current;
    let handled = true;
    if (e.key === 'ArrowLeft') a.phi = (a.phi - KEY_STEP + Math.PI * 2) % (Math.PI * 2);
    else if (e.key === 'ArrowRight') a.phi = (a.phi + KEY_STEP) % (Math.PI * 2);
    // Keys reach the poles exactly (only dragging stays off them), so Up at
    // |0⟩ stays put instead of stepping off to 1°.
    else if (e.key === 'ArrowUp') a.theta = Math.max(0, a.theta - KEY_STEP);
    else if (e.key === 'ArrowDown') a.theta = Math.min(Math.PI, a.theta + KEY_STEP);
    else if (e.key === '0' || e.key === '1') {
      e.preventDefault();
      goToPole(e.key === '0' ? 0 : Math.PI);
      return;
    } else handled = false;
    if (handled) {
      glide.current = null;
      lastInteraction.current = nowMs();
      render();
      e.preventDefault();
      announce();
    }
  };

  // Server-rendered position; identical on hydration since it's constants.
  const { sx, sy } = project(INITIAL_THETA, INITIAL_PHI);
  const poleY = R * Math.cos(TILT);
  const initial = stateText(INITIAL_THETA, INITIAL_PHI);

  return (
    <figure className="bloch-figure">
      <div
        ref={stageRef}
        className="bloch-stage"
        tabIndex={0}
        // role="application" so assistive tech passes the arrow keys through
        // to the handler instead of presenting this as a static image.
        role="application"
        aria-roledescription="interactive diagram"
        aria-label="Interactive Bloch sphere. The arrow shows a qubit state. Drag, or use the arrow keys, to rotate it; press 0 or 1 to send it to that pole."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <svg viewBox="0 0 240 240" aria-hidden="true" focusable="false">
          {/* Sphere outline, the equator (far half dashed), and a meridian */}
          <circle className="bloch-outline" cx={CX} cy={CY} r={R} />
          <path className="bloch-equator bloch-equator--back" d={EQUATOR_BACK} />
          <path className="bloch-equator" d={EQUATOR_FRONT} />
          <path className="bloch-meridian" d={MERIDIAN} />
          {/* Z axis and basis-state labels */}
          <line
            className="bloch-axis"
            x1={CX}
            y1={CY - poleY}
            x2={CX}
            y2={CY + poleY}
          />
          {/* Set off from the outline (R), not from the tilted pole inside it,
              so neither label touches the circle. Pressing a label sends the
              arrow to its pole; the clear rect is a larger hit area that
              stops short of the sphere, so it never takes a drag. */}
          <g className="bloch-pole" onPointerDown={(e) => e.stopPropagation()} onClick={() => goToPole(0)}>
            <rect x={CX - 18} y={CY - R - 26} width={36} height={24} fill="transparent" />
            <text className="bloch-label" x={CX} y={CY - R - 7} textAnchor="middle">
              |0&#x27E9;
            </text>
          </g>
          <g className="bloch-pole" onPointerDown={(e) => e.stopPropagation()} onClick={() => goToPole(Math.PI)}>
            <rect x={CX - 18} y={CY + R + 2} width={36} height={24} fill="transparent" />
            <text className="bloch-label" x={CX} y={CY + R + 15} textAnchor="middle">
              |1&#x27E9;
            </text>
          </g>
          {/* State vector */}
          <line ref={vectorRef} className="bloch-vector" x1={CX} y1={CY} x2={sx} y2={sy} />
          <circle ref={tipRef} className="bloch-tip" cx={sx} cy={sy} r={5} />
        </svg>
      </div>
      {/* Not a live region: the idle precession changes it ~20x/s. Keyboard
          moves are announced through the span below instead. */}
      <span ref={announceRef} className="sr-only" aria-live="polite" />
      <p ref={readoutRef} className="bloch-readout">
        &theta; = {toDeg(INITIAL_THETA)}&deg; &middot; &phi; = {toDeg(INITIAL_PHI)}&deg;
      </p>
      {/* The state and its measurement odds, updated with the arrow (refs, not
          React state, like the readout above). */}
      <p className="bloch-state">
        |&psi;&#x27E9; = <span ref={a0Ref}>{initial.a0}</span>&#x202F;|0&#x27E9; +{' '}
        <span ref={a1Ref}>{initial.a1}</span>&#x202F;e<sup>i&#x202F;<span ref={phaseRef}>{initial.phase}</span></sup>&#x202F;|1&#x27E9;
      </p>
      <div className="bloch-probs" aria-hidden="true">
        <span className="bloch-prob-label">P(0)</span>
        <span className="bloch-prob-track"><span ref={p0BarRef} className="bloch-prob-bar" style={{ width: initial.p0Pct }} /></span>
        <span ref={p0Ref} className="bloch-prob-value">{initial.p0}</span>
        <span className="bloch-prob-label">P(1)</span>
        <span className="bloch-prob-track"><span ref={p1BarRef} className="bloch-prob-bar bloch-prob-bar--one" style={{ width: initial.p1Pct }} /></span>
        <span ref={p1Ref} className="bloch-prob-value">{initial.p1}</span>
      </div>
    </figure>
  );
}
