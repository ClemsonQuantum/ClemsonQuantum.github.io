'use client';

import { useEffect, useRef } from 'react';

// Geometry: |psi> = cos(theta/2)|0> + e^{i phi} sin(theta/2)|1> maps to the
// Bloch vector (x, y, z) = (sin theta cos phi, sin theta sin phi, cos theta).
// The SVG uses an orthographic projection with the camera tilted TILT rad
// above the equator:  sx = R x,  sy = -R (z cos TILT - y sin TILT).
const R = 88; // sphere radius, px in the 240x240 viewBox
const CX = 120;
const CY = 122;
const TILT = 0.35; // rad (~20 deg)
const AUTO_RATE = 0.35; // rad/s of idle phi precession
const RESUME_MS = 2000; // idle time before auto-rotation resumes
const KEY_STEP = (5 * Math.PI) / 180;
const DRAG_RATE = 0.012; // rad per dragged px

const INITIAL_THETA = (60 * Math.PI) / 180;
const INITIAL_PHI = (35 * Math.PI) / 180;

function clampTheta(theta: number): number {
  return Math.min(Math.PI - 0.02, Math.max(0.02, theta));
}

function toDeg(rad: number): number {
  return Math.round((rad * 180) / Math.PI);
}

function project(theta: number, phi: number): { sx: number; sy: number } {
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(theta);
  return {
    sx: CX + R * x,
    sy: CY - R * (z * Math.cos(TILT) - y * Math.sin(TILT)),
  };
}

// Interactive Bloch sphere for the learning-resources page. Idle behavior is
// a slow phi precession (rAF gated on visibility + on-screen + reduced
// motion, mirroring QuantumCanvas); dragging or arrow keys move the state
// vector directly, and auto-rotation resumes ~2 s after the last interaction.
// Angles live in refs and every update writes the SVG/readout directly (like
// ConstellationDivider) — per-frame React state would re-render the whole
// figure at 60 fps. Initial angles are constants, so static-export hydration
// always matches.
export default function BlochSphere() {
  const stageRef = useRef<HTMLDivElement>(null);
  const vectorRef = useRef<SVGLineElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const angles = useRef({ theta: INITIAL_THETA, phi: INITIAL_PHI });
  const lastInteraction = useRef(0);
  const dragFrom = useRef<{ x: number; y: number } | null>(null);

  const render = () => {
    const { theta, phi } = angles.current;
    const { sx, sy } = project(theta, phi);
    vectorRef.current?.setAttribute('x2', sx.toFixed(2));
    vectorRef.current?.setAttribute('y2', sy.toFixed(2));
    tipRef.current?.setAttribute('cx', sx.toFixed(2));
    tipRef.current?.setAttribute('cy', sy.toFixed(2));
    if (readoutRef.current) {
      readoutRef.current.textContent = `θ = ${toDeg(theta)}° · φ = ${toDeg(phi)}°`;
    }
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
      if (time - lastInteraction.current > RESUME_MS && !dragFrom.current) {
        angles.current.phi =
          (angles.current.phi + AUTO_RATE * dt) % (Math.PI * 2);
        render();
      }
      schedule();
    }

    function schedule() {
      const running = intersecting && !document.hidden && !motionQuery.matches;
      if (running && rafId === 0) {
        rafId = requestAnimationFrame(frame);
      }
    }

    function updateRunning() {
      const running = intersecting && !document.hidden && !motionQuery.matches;
      if (!running && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (running && rafId === 0) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    }

    const intersectionObserver = new IntersectionObserver((entries) => {
      intersecting = entries[0]?.isIntersecting ?? true;
      updateRunning();
    });
    intersectionObserver.observe(stage);
    const onVisibility = () => updateRunning();
    document.addEventListener('visibilitychange', onVisibility);
    motionQuery.addEventListener('change', updateRunning);

    lastTime = performance.now();
    schedule();

    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', updateRunning);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragFrom.current = { x: e.clientX, y: e.clientY };
    lastInteraction.current = performance.now();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const from = dragFrom.current;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    dragFrom.current = { x: e.clientX, y: e.clientY };
    lastInteraction.current = performance.now();
    angles.current.phi =
      (angles.current.phi + dx * DRAG_RATE + Math.PI * 2) % (Math.PI * 2);
    angles.current.theta = clampTheta(angles.current.theta + dy * DRAG_RATE);
    render();
  };

  const onPointerUp = () => {
    dragFrom.current = null;
    lastInteraction.current = performance.now();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const a = angles.current;
    let handled = true;
    if (e.key === 'ArrowLeft') a.phi = (a.phi - KEY_STEP + Math.PI * 2) % (Math.PI * 2);
    else if (e.key === 'ArrowRight') a.phi = (a.phi + KEY_STEP) % (Math.PI * 2);
    else if (e.key === 'ArrowUp') a.theta = clampTheta(a.theta - KEY_STEP);
    else if (e.key === 'ArrowDown') a.theta = clampTheta(a.theta + KEY_STEP);
    else handled = false;
    if (handled) {
      lastInteraction.current = performance.now();
      render();
      e.preventDefault();
    }
  };

  // Server-rendered position; identical on hydration since it's constants.
  const { sx, sy } = project(INITIAL_THETA, INITIAL_PHI);
  const poleY = R * Math.cos(TILT);

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
        aria-label="Interactive Bloch sphere. The arrow shows a qubit state. Drag, or use the arrow keys, to rotate it."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <svg viewBox="0 0 240 240" aria-hidden="true" focusable="false">
          {/* Sphere outline + tilted equator + a meridian for depth */}
          <circle className="bloch-outline" cx={CX} cy={CY} r={R} />
          <ellipse
            className="bloch-equator"
            cx={CX}
            cy={CY}
            rx={R}
            ry={R * Math.sin(TILT)}
          />
          <ellipse
            className="bloch-meridian"
            cx={CX}
            cy={CY}
            rx={R * Math.sin(TILT)}
            ry={R}
          />
          {/* Z axis and basis-state labels */}
          <line
            className="bloch-axis"
            x1={CX}
            y1={CY - poleY}
            x2={CX}
            y2={CY + poleY}
          />
          <text className="bloch-label" x={CX} y={CY - poleY - 8} textAnchor="middle">
            |0&#x27E9;
          </text>
          <text className="bloch-label" x={CX} y={CY + poleY + 16} textAnchor="middle">
            |1&#x27E9;
          </text>
          {/* State vector */}
          <line ref={vectorRef} className="bloch-vector" x1={CX} y1={CY} x2={sx} y2={sy} />
          <circle ref={tipRef} className="bloch-tip" cx={sx} cy={sy} r={5} />
        </svg>
      </div>
      {/* No aria-live: the idle precession changes this ~20x/s, which would
          flood screen readers with a nonstop announcement queue. */}
      <p ref={readoutRef} className="bloch-readout">
        &theta; = {toDeg(INITIAL_THETA)}&deg; &middot; &phi; = {toDeg(INITIAL_PHI)}&deg;
      </p>
      <figcaption className="bloch-caption">
        Every qubit state lives somewhere on this sphere. Go ahead, drag it.
      </figcaption>
    </figure>
  );
}
