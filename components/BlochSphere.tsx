'use client';

import { useEffect, useRef, useState } from 'react';

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

// Interactive Bloch sphere for the learning-resources page. Idle behavior is
// a slow phi precession (rAF gated on visibility + on-screen + reduced
// motion, mirroring QuantumCanvas); dragging or arrow keys move the state
// vector directly, and auto-rotation resumes ~5 s after the last interaction.
// Initial angles are constants, so static-export hydration always matches.
export default function BlochSphere() {
  const [theta, setTheta] = useState(INITIAL_THETA);
  const [phi, setPhi] = useState(INITIAL_PHI);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastInteraction = useRef(0);
  const dragFrom = useRef<{ x: number; y: number } | null>(null);

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
        setPhi((p) => (p + AUTO_RATE * dt) % (Math.PI * 2));
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
    setPhi((p) => (p + dx * DRAG_RATE + Math.PI * 2) % (Math.PI * 2));
    setTheta((t) => clampTheta(t + dy * DRAG_RATE));
  };

  const onPointerUp = () => {
    dragFrom.current = null;
    lastInteraction.current = performance.now();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let handled = true;
    if (e.key === 'ArrowLeft') setPhi((p) => (p - KEY_STEP + Math.PI * 2) % (Math.PI * 2));
    else if (e.key === 'ArrowRight') setPhi((p) => (p + KEY_STEP) % (Math.PI * 2));
    else if (e.key === 'ArrowUp') setTheta((t) => clampTheta(t - KEY_STEP));
    else if (e.key === 'ArrowDown') setTheta((t) => clampTheta(t + KEY_STEP));
    else handled = false;
    if (handled) {
      lastInteraction.current = performance.now();
      e.preventDefault();
    }
  };

  // Bloch vector -> screen point.
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(theta);
  const sx = CX + R * x;
  const sy = CY - R * (z * Math.cos(TILT) - y * Math.sin(TILT));
  const poleY = R * Math.cos(TILT);

  return (
    <figure className="bloch-figure">
      <div
        ref={stageRef}
        className="bloch-stage"
        tabIndex={0}
        role="img"
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
          <line className="bloch-vector" x1={CX} y1={CY} x2={sx} y2={sy} />
          <circle className="bloch-tip" cx={sx} cy={sy} r={5} />
        </svg>
      </div>
      <p className="bloch-readout" aria-live="polite">
        &theta; = {toDeg(theta)}&deg; &middot; &phi; = {toDeg(phi)}&deg;
      </p>
      <figcaption className="bloch-caption">
        Every qubit state lives somewhere on this sphere &mdash; drag it.
      </figcaption>
    </figure>
  );
}
