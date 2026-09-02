'use client';

import { useEffect, useRef } from 'react';

const MAX_DPR = 2;

interface Leaf {
  anchorX: number; // sway centerline (px)
  y: number;
  vy: number; // px/s fall speed
  drift: number; // px/s slow horizontal wind
  swayAmp: number; // px
  swayFreq: number; // rad/s
  spinAmp: number; // rad
  spinFreq: number; // rad/s
  phase: number;
  size: number; // half-length of the leaf blade (px)
  color: 0 | 1;
  alpha: number;
}

interface FallingLeavesProps {
  /** px of parent width per leaf — higher = sparser fall. */
  pxPerLeaf?: number;
  /** Hard ceiling on the leaf count regardless of width. */
  maxCount?: number;
}

// Decorative autumn drift for the Qiskit Fall Fest hero: sparse leaves sway
// down the banner on top of the QuantumCanvas particle field (MarkdownDiv
// layers both when the hero carries .qff-hero--leaves). Colors come from
// --color-accent-rgb / --color-violet-rgb resolved AT THE CANVAS, so the
// .qff-page token re-map renders them Fall Fest pink/purple while the same
// component would pick up site colors anywhere else. Same rAF discipline as
// QuantumCanvas: runs only while on screen, tab visible, and motion allowed —
// reduced motion draws a single scattered frame. No pointer interaction.
export default function FallingLeaves({
  pxPerLeaf = 110,
  maxCount = 16,
}: FallingLeavesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !parent || !ctx) return;

    let width = 0;
    let height = 0;
    let leaves: Leaf[] = [];
    const colors: [string, string] = ['245, 102, 0', '109, 40, 217'];
    let rafId = 0;
    let lastTime = 0;
    let elapsed = 0; // s — sway/spin clock (never jumps while paused)
    let intersecting = true;
    let reducedMotion = false;

    function readThemeColors() {
      if (!canvas) return;
      // Resolved at the canvas, not documentElement, so scoped token re-maps
      // (e.g. .qff-page) reach the leaves.
      const styles = getComputedStyle(canvas);
      const accent = styles.getPropertyValue('--color-accent-rgb').trim();
      const violet = styles.getPropertyValue('--color-violet-rgb').trim();
      if (accent) colors[0] = accent;
      if (violet) colors[1] = violet;
    }

    function makeLeaf(i: number, spawnAnywhere: boolean): Leaf {
      const size = 7 + Math.random() * 7;
      return {
        anchorX: Math.random() * width,
        y: spawnAnywhere
          ? Math.random() * height
          : -size * 2 - Math.random() * height * 0.4,
        vy: 14 + Math.random() * 14,
        drift: -6 + Math.random() * 12,
        swayAmp: 10 + Math.random() * 22,
        swayFreq: 0.5 + Math.random() * 0.7,
        spinAmp: 0.5 + Math.random() * 0.6,
        spinFreq: 0.4 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        size,
        color: (i % 2) as 0 | 1,
        alpha: 0.35 + Math.random() * 0.35,
      };
    }

    function seedLeaves() {
      const count = Math.min(
        maxCount,
        Math.max(6, Math.round(width / pxPerLeaf)),
      );
      leaves = Array.from({ length: count }, (_, i) => makeLeaf(i, true));
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
      if (leaves.length === 0 || prevWidth === 0 || prevHeight === 0) {
        seedLeaves();
      } else {
        // Rescale in place instead of reseeding so resizes don't "pop".
        for (const leaf of leaves) {
          leaf.anchorX *= width / prevWidth;
          leaf.y *= height / prevHeight;
        }
      }
      if (reducedMotion) draw();
    }

    function drawLeaf(leaf: Leaf) {
      if (!ctx) return;
      const sway = leaf.swayAmp * Math.sin(leaf.swayFreq * elapsed + leaf.phase);
      const rot =
        leaf.spinAmp * Math.sin(leaf.spinFreq * elapsed + leaf.phase * 1.7);
      const h = leaf.size;
      const w = h * 0.62;
      ctx.save();
      ctx.translate(leaf.anchorX + sway, leaf.y);
      ctx.rotate(rot);
      // Blade: pointed oval (two mirrored quadratics tip-to-base).
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.quadraticCurveTo(w, 0, 0, h);
      ctx.quadraticCurveTo(-w, 0, 0, -h);
      ctx.fillStyle = `rgba(${colors[leaf.color]}, ${leaf.alpha})`;
      ctx.fill();
      // Midrib + stem give it the "leaf" read at small sizes.
      ctx.strokeStyle = `rgba(${colors[leaf.color]}, ${leaf.alpha * 0.9})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.55);
      ctx.lineTo(0, h * 1.35);
      ctx.stroke();
      ctx.restore();
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const leaf of leaves) drawLeaf(leaf);
    }

    function step(dt: number) {
      const margin = 24;
      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        leaf.y += leaf.vy * dt;
        leaf.anchorX += leaf.drift * dt;
        if (leaf.anchorX < -margin) leaf.anchorX = width + margin;
        if (leaf.anchorX > width + margin) leaf.anchorX = -margin;
        if (leaf.y > height + margin) {
          leaves[i] = makeLeaf(i, false);
        }
      }
    }

    function frame(time: number) {
      rafId = 0;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      elapsed += dt;
      step(dt);
      draw();
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
      if (reducedMotion) draw();
      updateRunning();
    };
    const onSchemeChange = () => {
      readThemeColors();
      if (reducedMotion) draw();
    };
    const onVisibilityChange = () => updateRunning();

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

    if (reducedMotion) {
      draw();
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
    };
  }, [pxPerLeaf, maxCount]);

  return (
    <canvas ref={canvasRef} className="falling-leaves" aria-hidden="true" />
  );
}
