'use client';

import { useEffect, useRef } from 'react';

interface ConstellationDividerProps {
  /** Footer variant: wider, slightly faded. */
  wide?: boolean;
}

// Projection geometry, shared with BlochSphere.tsx: the Bloch vector
// (x, y, z) = (sin theta cos phi, sin theta sin phi, cos theta) is drawn with an
// orthographic camera tilted TILT rad above the equator —
//   sx = CX + R x,  sy = CY - R (z cos TILT - y sin TILT).
const CX = 130;
const CY = 18;
const R = 12.3; // vector length in the 260x36 viewBox (sphere outline r=13)
const TILT = 0.361; // rad; = asin(4.6/13), matching the equator's ry

// Start angles chosen so the vector's first projected point is exactly the
// server-rendered tip (137.6, 8.4), so the ambient loop begins seamlessly:
//   x = sin theta cos phi = 0.61789,  z cos TILT - y sin TILT = 0.78049
//   sx = 130 + 12.3 * 0.61789 = 137.6,  sy = 18 - 12.3 * 0.78049 = 8.4  (checks)
const INITIAL_THETA = 0.701628;
const INITIAL_PHI = -0.293362;

// Wander limits: keep the tip off the polar caps (where phi motion stops
// reading) and hold angular speed low — peak MAX_OMEGA sends a full pi sweep to
// >6 s, so it precesses gently instead of jittering.
const THETA_MIN = 0.45;
const THETA_MAX = Math.PI - 0.45;
const MAX_OMEGA = 0.28; // rad/s peak target speed per angle
const RETARGET_MIN_S = 2; // fresh random target every 2-4 s
const RETARGET_MAX_S = 4;
const EASE_TAU = 1.5; // s time constant for easing omega toward its target

const randOmega = () => (Math.random() * 2 - 1) * MAX_OMEGA;
const randInterval = () =>
  RETARGET_MIN_S + Math.random() * (RETARGET_MAX_S - RETARGET_MIN_S);

// Decorative "mini Bloch sphere" constellation divider: hairline wires run in
// from both sides through small constellation dots to a central sphere with an
// equator and a state-vector arrow. Replaces the old radial-gradient
// entangled-pair flourish. Strokes/fills use the theme tokens, so light/dark
// recolor automatically. Draw-in: every path carries pathLength={1} so the
// stroke-dash CSS (see "Constellation divider" section in style.css) can
// animate dashoffset 1 -> 0 when ScrollReveal flips reveal-init to reveal-in;
// above-the-fold instances and reduced-motion visitors get it fully drawn.
// Ambient motion (client effect below): once hydrated, the state vector wanders
// continuously — theta/phi ease toward fresh random targets every 2-4 s, seeded
// per instance so stacked dividers never sync, written straight to the vector's
// `d` and tip via refs (no per-frame React state, like ShootingStar). The rAF
// loop is gated like QuantumCanvas (on-screen + tab-visible + no reduced-motion);
// under reduced motion it never starts, leaving the byte-identical SSR position.
export default function ConstellationDivider({
  wide = false,
}: ConstellationDividerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const vectorRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const vector = vectorRef.current;
    const dot = dotRef.current;
    if (!svg || !vector || !dot) return;

    // Randomize the wave dots' quantum-jump timing per instance: a fresh
    // duration and a random starting phase (negative delay) each mount, so no
    // two dividers — or two visits — flash and relocate on the same beat.
    // Under reduced motion the CSS gate keeps the animation off entirely, so
    // these inline values are inert there.
    svg.querySelectorAll<SVGCircleElement>('.cd-dot--wave').forEach((waveDot) => {
      const duration = 12 + Math.random() * 10; // 12-22 s per cycle
      waveDot.style.animationDuration = `${duration.toFixed(2)}s`;
      waveDot.style.animationDelay = `${(-Math.random() * duration).toFixed(2)}s`;
    });

    const cosT = Math.cos(TILT);
    const sinT = Math.sin(TILT);

    // Wander state lives in the closure — never React state, so nothing
    // re-renders per frame; the loop mutates the DOM directly instead.
    let theta = INITIAL_THETA;
    let phi = INITIAL_PHI;
    let omegaTheta = randOmega();
    let omegaPhi = randOmega();
    let targetOmegaTheta = randOmega();
    let targetOmegaPhi = randOmega();
    let retargetIn = randInterval(); // s until the next fresh target

    let rafId = 0;
    let lastTime = 0;
    let intersecting = true;
    let reducedMotion = false;

    function render() {
      if (!vector || !dot) return;
      const sinTheta = Math.sin(theta);
      const x = sinTheta * Math.cos(phi);
      const y = sinTheta * Math.sin(phi);
      const z = Math.cos(theta);
      const sx = CX + R * x;
      const sy = CY - R * (z * cosT - y * sinT);
      vector.setAttribute('d', `M130 18 L${sx.toFixed(3)} ${sy.toFixed(3)}`);
      dot.setAttribute('cx', sx.toFixed(3));
      dot.setAttribute('cy', sy.toFixed(3));
    }

    function step(dt: number) {
      retargetIn -= dt;
      if (retargetIn <= 0) {
        targetOmegaTheta = randOmega();
        targetOmegaPhi = randOmega();
        retargetIn = randInterval();
      }
      // Ease angular velocity toward the target (smooth accel/decel).
      const k = 1 - Math.exp(-dt / EASE_TAU);
      omegaTheta += (targetOmegaTheta - omegaTheta) * k;
      omegaPhi += (targetOmegaPhi - omegaPhi) * k;

      theta += omegaTheta * dt;
      phi = (phi + omegaPhi * dt) % (Math.PI * 2);

      // Soft bounce off the polar caps: clamp to the limit and reflect the
      // velocity (and its target) so the tip eases back toward the equator.
      if (theta < THETA_MIN) {
        theta = THETA_MIN;
        omegaTheta = Math.abs(omegaTheta);
        targetOmegaTheta = Math.abs(targetOmegaTheta);
      } else if (theta > THETA_MAX) {
        theta = THETA_MAX;
        omegaTheta = -Math.abs(omegaTheta);
        targetOmegaTheta = -Math.abs(targetOmegaTheta);
      }
    }

    function frame(time: number) {
      rafId = 0;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      step(dt);
      render();
      scheduleFrame();
    }

    function scheduleFrame() {
      const running = intersecting && !document.hidden && !reducedMotion;
      if (running && rafId === 0) {
        rafId = requestAnimationFrame(frame);
      }
    }

    function updateRunning() {
      const running = intersecting && !document.hidden && !reducedMotion;
      if (!running && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (running && rafId === 0) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // On reduced motion the loop simply stops; the vector holds wherever it is.
    const onMotionChange = () => {
      reducedMotion = motionQuery.matches;
      updateRunning();
    };
    const onVisibilityChange = () => updateRunning();

    reducedMotion = motionQuery.matches;

    const intersectionObserver = new IntersectionObserver((entries) => {
      intersecting = entries[0]?.isIntersecting ?? true;
      updateRunning();
    });
    intersectionObserver.observe(svg);

    motionQuery.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    if (!reducedMotion) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      intersectionObserver.disconnect();
      motionQuery.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className={`constellation-divider${wide ? ' constellation-divider--wide' : ''}`}
      viewBox="0 0 260 36"
      aria-hidden="true"
      focusable="false"
    >
      {/* Entanglement waves in from each edge: a sine built from smooth
          quadratic half-waves (10.5px each, ~3px amplitude), linking the
          constellation dots to the sphere like a shared wavefunction. */}
      <path
        className="cd-path"
        pathLength={1}
        d="M4 18 q5.25 -6.5 10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0"
      />
      <path
        className="cd-path"
        pathLength={1}
        d="M151 18 q5.25 -6.5 10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0"
        style={{ '--cd-delay': '0.15s' } as React.CSSProperties}
      />
      {/* Constellation dots on the wave nodes (zero crossings). The
          cd-dot--wave class opts them into the ambient drift-and-twinkle
          animation (see "Ambient wave dots" in style.css); without motion-path
          support or with reduced motion they stay parked here. */}
      <circle className="cd-dot cd-dot--wave" cx="35.5" cy="18" r="2.3" />
      <circle
        className="cd-dot cd-dot--wave cd-dot--violet"
        cx="224.5"
        cy="18"
        r="2.3"
        style={{ '--cd-delay': '0.2s' } as React.CSSProperties}
      />
      {/* Bloch sphere: outline, equator, state vector */}
      <circle
        className="cd-path cd-sphere"
        pathLength={1}
        cx="130"
        cy="18"
        r="13"
        style={{ '--cd-delay': '0.3s' } as React.CSSProperties}
      />
      <ellipse
        className="cd-path cd-sphere"
        pathLength={1}
        cx="130"
        cy="18"
        rx="13"
        ry="4.6"
        style={{ '--cd-delay': '0.45s' } as React.CSSProperties}
      />
      <path
        ref={vectorRef}
        className="cd-path cd-vector"
        pathLength={1}
        d="M130 18 L137.6 8.4"
        style={{ '--cd-delay': '0.65s' } as React.CSSProperties}
      />
      <circle
        ref={dotRef}
        className="cd-dot cd-dot--vector"
        cx="137.6"
        cy="8.4"
        r="2.5"
        style={{ '--cd-delay': '0.8s' } as React.CSSProperties}
      />
    </svg>
  );
}
