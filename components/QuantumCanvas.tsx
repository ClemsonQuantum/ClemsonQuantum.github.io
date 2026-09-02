'use client';

import { useEffect, useRef } from 'react';

const MAX_DPR = 2;
const LINK_DIST = 110; // px — max distance for an "entanglement" line
const MOUSE_DIST = 140; // px — cursor influence radius

interface Particle {
  x: number;
  y: number;
  vx: number; // px/s
  vy: number; // px/s
  r: number;
  phase: number;
  color: 0 | 1; // index into the two theme triplets
}

interface QuantumCanvasProps {
  /** px of parent width per particle — higher = sparser field. */
  pxPerParticle?: number;
  /** Hard ceiling on the particle count regardless of width. */
  maxCount?: number;
}

// Decorative "entangled qubits" backdrop (SC Quantathon v3 hero, homepage hero):
// drifting particles joined by proximity lines, gently repelled by the cursor.
// Colors come from the CSS tokens (--color-accent-rgb / --color-violet-rgb),
// re-read when the OS color scheme flips, since dark mode on this site is a
// pure CSS media-query token swap with no JS theme signal. The rAF loop only
// runs while the canvas is on screen, the tab is visible, and the visitor has
// not requested reduced motion (then a single static frame is drawn instead).
// The canvas sizes itself from its parent element, so it must be a direct
// child of the hero it decorates.
export default function QuantumCanvas({
  pxPerParticle = 28,
  maxCount = 60,
}: QuantumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !parent || !ctx) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    const colors: [string, string] = ['245, 102, 0', '109, 40, 217'];
    let mouse: { x: number; y: number } | null = null;
    let rafId = 0;
    let lastTime = 0;
    let intersecting = true;
    let reducedMotion = false;

    function readThemeColors() {
      if (!canvas) return;
      // Resolved at the canvas, not documentElement, so scoped token re-maps
      // (e.g. the Qiskit Fall Fest page's .qff-page palette) reach the
      // particles; everywhere else the inherited values are the root tokens.
      const styles = getComputedStyle(canvas);
      const accent = styles.getPropertyValue('--color-accent-rgb').trim();
      const violet = styles.getPropertyValue('--color-violet-rgb').trim();
      if (accent) colors[0] = accent;
      if (violet) colors[1] = violet;
    }

    function seedParticles() {
      const count = Math.min(maxCount, Math.max(24, Math.round(width / pxPerParticle)));
      particles = Array.from({ length: count }, (_, i) => {
        const speed = 9 + Math.random() * 13; // px/s
        const angle = Math.random() * Math.PI * 2;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 1.5 + Math.random() * 1.5,
          phase: Math.random() * Math.PI * 2,
          color: (i % 2) as 0 | 1,
        };
      });
    }

    function resize() {
      if (!canvas || !parent || !ctx) return;
      const prevWidth = width;
      const prevHeight = height;
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particles.length === 0 || prevWidth === 0 || prevHeight === 0) {
        // Also reseed after a zero-size first measure — rescaling from a 0×0
        // frame would strand every particle at the origin.
        seedParticles();
      } else if (prevWidth > 0 && prevHeight > 0) {
        // Rescale in place instead of reseeding so resizes don't "pop".
        for (const p of particles) {
          p.x *= width / prevWidth;
          p.y *= height / prevHeight;
        }
      }
      if (reducedMotion) draw(0);
    }

    function draw(time: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Entanglement lines between nearby particles.
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist >= LINK_DIST) continue;
          const alpha = (1 - dist / LINK_DIST) * 0.28;
          ctx.strokeStyle = `rgba(${colors[a.color]}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Faint lines from the cursor to nearby particles.
      if (mouse) {
        for (const p of particles) {
          const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (dist >= MOUSE_DIST) continue;
          const alpha = (1 - dist / MOUSE_DIST) * 0.2;
          ctx.strokeStyle = `rgba(${colors[p.color]}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }

      // Qubit dots with a slow radius pulse.
      for (const p of particles) {
        const pulse = 1 + 0.25 * Math.sin(time / 1000 + p.phase);
        ctx.fillStyle = `rgba(${colors[p.color]}, 0.55)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function step(dt: number) {
      const margin = 12;
      for (const p of particles) {
        if (mouse) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.5 && dist < MOUSE_DIST) {
            const force = (1 - dist / MOUSE_DIST) * 60; // px/s² equivalent nudge
            p.vx += (dx / dist) * force * dt;
            p.vy += (dy / dist) * force * dt;
          }
        }
        // Cap speed so repeated repulsion can't fling particles around.
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > 40) {
          p.vx = (p.vx / speed) * 40;
          p.vy = (p.vy / speed) * 40;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -margin) p.x = width + margin;
        if (p.x > width + margin) p.x = -margin;
        if (p.y < -margin) p.y = height + margin;
        if (p.y > height + margin) p.y = -margin;
      }
    }

    function frame(time: number) {
      rafId = 0;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      step(dt);
      draw(time);
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
    const schemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const onMotionChange = () => {
      reducedMotion = motionQuery.matches;
      if (reducedMotion) draw(0);
      updateRunning();
    };
    const onSchemeChange = () => {
      readThemeColors();
      if (reducedMotion) draw(0);
    };
    const onVisibilityChange = () => updateRunning();
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse = { x: event.clientX - rect.x, y: event.clientY - rect.y };
    };
    const onPointerLeave = () => {
      mouse = null;
    };

    readThemeColors();
    reducedMotion = motionQuery.matches;
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    const intersectionObserver = new IntersectionObserver((entries) => {
      intersecting = entries[0]?.isIntersecting ?? true;
      updateRunning();
    });
    intersectionObserver.observe(canvas);

    motionQuery.addEventListener('change', onMotionChange);
    schemeQuery.addEventListener('change', onSchemeChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    parent.addEventListener('pointermove', onPointerMove);
    parent.addEventListener('pointerleave', onPointerLeave);

    if (reducedMotion) {
      draw(0);
    } else {
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      motionQuery.removeEventListener('change', onMotionChange);
      schemeQuery.removeEventListener('change', onSchemeChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      parent.removeEventListener('pointermove', onPointerMove);
      parent.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [pxPerParticle, maxCount]);

  return <canvas ref={canvasRef} className="quantum-canvas" aria-hidden="true" />;
}
