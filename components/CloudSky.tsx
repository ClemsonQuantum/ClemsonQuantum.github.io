'use client';

import { useEffect, useRef } from 'react';
// MAX_DPR caps the canvas backing-store scale (shared with QuantumCanvas).
import { MAX_DPR } from '@/lib/animation';

type Layer = 0 | 1 | 2;

interface Puff {
  dx: number; // px, relative to the cloud centre
  dy: number;
  r: number;
}

interface Cloud {
  x: number; // centre, px
  y: number;
  layer: Layer; // 0 far, 1 mid, 2 near (parallax)
  puffs: Puff[];
  phase: number; // vertical bob phase
  bobAmp: number; // px
  bobFreq: number; // rad/s
  spriteW: number; // CSS px of the pre-rendered sprite
  spriteH: number;
  sprite: HTMLCanvasElement | null;
}

interface Bird {
  x: number;
  y: number;
  dir: 1 | -1;
  speed: number; // px/s
  size: number; // half wingspan, px
  phase: number;
  flapHz: number;
  glide: number; // fraction of the slow envelope spent gliding
  bob: number; // px
  wait: number; // s until respawn once off-screen
}

interface CloudSkyProps {
  /** px of parent width per cloud — higher = emptier sky. */
  pxPerCloud?: number;
  /** Hard ceiling on the cloud count regardless of width. */
  maxClouds?: number;
  /**
   * Distant bird silhouettes (original two-arc glyphs). Off by default: the
   * Fall Fest page ships clouds only until IBM's sticker kit is on hand.
   */
  birds?: boolean;
}

// Parallax layers: far → near.
const LAYER_SPEED = [4, 8, 14]; // px/s
const LAYER_SCALE = [0.55, 0.8, 1];
const LAYER_ALPHA = [0.55, 0.75, 1]; // × --qff-cloud-alpha
const LAYER_BAND: [number, number][] = [
  [0.04, 0.4],
  [0.15, 0.65],
  [0.3, 0.9],
]; // y as a fraction of the hero height

// Decorative "Decade on the Cloud" sky for the Qiskit Fall Fest hero: a few
// soft clouds drift across at three parallax speeds. Each cloud is rendered
// ONCE to an offscreen sprite (radial-gradient puffs, so the edges stay soft
// without a per-frame ctx.filter) and blitted every frame. Colors come from
// --qff-cloud-rgb / --qff-cloud-alpha resolved AT THE CANVAS, so the .qff-page
// light/dark token swap recolors the sky (white cumulus on periwinkle by day,
// faint lavender wisps over the galaxy at night). Same rAF discipline as
// QuantumCanvas: runs only while on screen, tab visible, and motion allowed;
// reduced motion draws a single scattered frame. One unconditional draw() at
// mount means a hidden tab still shows a composed sky, not an empty canvas.
export default function CloudSky({
  pxPerCloud = 220,
  maxClouds = 9,
  birds = false,
}: CloudSkyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !parent || !ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let clouds: Cloud[] = [];
    let flock: Bird[] = [];
    let cloudRgb = '255, 255, 255';
    let cloudAlpha = 0.55;
    let birdRgb = '49, 19, 94';
    let birdAlpha = 0;
    let rafId = 0;
    let lastTime = 0;
    let elapsed = 0; // s — bob/flap clock (never jumps while paused)
    let intersecting = true;
    let reducedMotion = false;
    const flockDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;

    function readThemeColors() {
      if (!canvas) return;
      // Resolved at the canvas, not documentElement, so the scoped .qff-page
      // token re-map reaches the sky.
      const styles = getComputedStyle(canvas);
      const rgb = styles.getPropertyValue('--qff-cloud-rgb').trim();
      const alpha = parseFloat(styles.getPropertyValue('--qff-cloud-alpha'));
      const bRgb = styles.getPropertyValue('--qff-bird-rgb').trim();
      const bAlpha = parseFloat(styles.getPropertyValue('--qff-bird-alpha'));
      if (rgb) cloudRgb = rgb;
      if (Number.isFinite(alpha)) cloudAlpha = alpha;
      if (bRgb) birdRgb = bRgb;
      birdAlpha = Number.isFinite(bAlpha) ? bAlpha : 0;
    }

    function renderSprite(c: Cloud) {
      const xs = c.puffs.map((p) => Math.abs(p.dx) + p.r);
      const ys = c.puffs.map((p) => Math.abs(p.dy) + p.r);
      c.spriteW = Math.ceil(Math.max(...xs) * 2 + 8);
      c.spriteH = Math.ceil(Math.max(...ys) * 2 + 8);
      const s = document.createElement('canvas');
      s.width = Math.max(1, Math.round(c.spriteW * dpr));
      s.height = Math.max(1, Math.round(c.spriteH * dpr));
      const g = s.getContext('2d');
      if (!g) return;
      g.scale(dpr, dpr);
      g.translate(c.spriteW / 2, c.spriteH / 2);
      const a = cloudAlpha * LAYER_ALPHA[c.layer];
      for (const p of c.puffs) {
        const grad = g.createRadialGradient(p.dx, p.dy, p.r * 0.2, p.dx, p.dy, p.r);
        grad.addColorStop(0, `rgba(${cloudRgb}, ${a})`);
        grad.addColorStop(0.65, `rgba(${cloudRgb}, ${a * 0.8})`);
        grad.addColorStop(1, `rgba(${cloudRgb}, 0)`);
        g.fillStyle = grad;
        g.beginPath();
        g.arc(p.dx, p.dy, p.r, 0, Math.PI * 2);
        g.fill();
      }
      c.sprite = s;
    }

    function bandY(layer: Layer) {
      const [lo, hi] = LAYER_BAND[layer];
      return height * (lo + Math.random() * (hi - lo));
    }

    function makeCloud(layer: Layer, anywhere: boolean): Cloud {
      const base =
        (26 + Math.random() * 22) * LAYER_SCALE[layer] * (width < 640 ? 0.75 : 1);
      const n = 4 + Math.floor(Math.random() * 3);
      // Domed top, flatter base: puffs shrink toward the ends and sit lower.
      const puffs: Puff[] = Array.from({ length: n }, (_, i) => {
        const t = (i / (n - 1)) * 2 - 1; // -1..1 across the cloud
        return {
          dx: t * base * 1.4 + (Math.random() - 0.5) * base * 0.4,
          dy: -Math.abs(t) * base * 0.15 + (Math.random() - 0.7) * base * 0.35,
          r: base * (0.55 + Math.random() * 0.45) * (1 - Math.abs(t) * 0.35),
        };
      });
      const c: Cloud = {
        x: anywhere ? Math.random() * width : -base * 3,
        y: bandY(layer),
        layer,
        puffs,
        phase: Math.random() * Math.PI * 2,
        bobAmp: 2 + Math.random() * 2,
        bobFreq: 0.15 + Math.random() * 0.15,
        spriteW: 0,
        spriteH: 0,
        sprite: null,
      };
      renderSprite(c);
      return c;
    }

    function makeBird(parked: boolean): Bird {
      const size = 5 + Math.random() * 4;
      return {
        x: flockDir > 0 ? -24 : width + 24,
        y: height * (0.08 + Math.random() * 0.45),
        dir: flockDir,
        speed: 16 + Math.random() * 12,
        size,
        phase: Math.random() * Math.PI * 2,
        flapHz: 2.2 + Math.random() * 1,
        glide: 0.35 + Math.random() * 0.3,
        bob: 1 + Math.random() * 2,
        wait: parked ? 2 + Math.random() * 7 : 0,
      };
    }

    function seed(anywhere: boolean) {
      const count = Math.min(
        maxClouds,
        Math.max(4, Math.round(width / pxPerCloud)),
      );
      clouds = Array.from({ length: count }, (_, i) =>
        makeCloud((i % 3) as Layer, anywhere),
      );
      // Sort far → near once so draw order needs no per-frame sort.
      clouds.sort((a, b) => a.layer - b.layer);
      const slots = birds ? (width < 640 ? 2 : 3) : 0;
      flock = Array.from({ length: slots }, (_, i) => {
        const b = makeBird(i > 0);
        if (anywhere && i === 0) b.x = width * 0.3;
        return b;
      });
    }

    function resize() {
      if (!canvas || !parent || !ctx) return;
      const prevWidth = width;
      const prevHeight = height;
      const prevDpr = dpr;
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (clouds.length === 0 || prevWidth === 0 || prevHeight === 0) {
        seed(true);
      } else {
        // Rescale in place instead of reseeding so resizes don't "pop".
        for (const c of clouds) {
          c.x *= width / prevWidth;
          c.y *= height / prevHeight;
          if (dpr !== prevDpr) renderSprite(c);
        }
        for (const b of flock) {
          b.x *= width / prevWidth;
          b.y *= height / prevHeight;
        }
      }
      // Setting canvas.width wiped the bitmap; repaint now rather than waiting
      // for the loop, which may be paused (reduced motion, hidden tab).
      draw();
    }

    function drawBird(b: Bird) {
      if (!ctx) return;
      const env = 0.5 + 0.5 * Math.sin(elapsed * 0.35 + b.phase * 2);
      const flap =
        env > b.glide
          ? Math.sin(elapsed * b.flapHz * Math.PI * 2 + b.phase)
          : 0.25; // glide: wings held slightly up
      const lift = b.size * 0.7 * flap;
      const y = b.y + Math.sin(elapsed * 0.9 + b.phase) * b.bob;
      ctx.save();
      ctx.translate(b.x, y);
      if (b.dir < 0) ctx.scale(-1, 1);
      ctx.strokeStyle = `rgba(${birdRgb}, ${birdAlpha})`;
      ctx.lineWidth = Math.max(1, b.size * 0.16);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-b.size, -lift);
      ctx.quadraticCurveTo(-b.size * 0.5, b.size * 0.18, 0, 0);
      ctx.quadraticCurveTo(b.size * 0.5, b.size * 0.18, b.size, -lift);
      ctx.stroke();
      ctx.restore();
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const c of clouds) {
        if (!c.sprite) continue;
        const y = c.y + Math.sin(c.bobFreq * elapsed + c.phase) * c.bobAmp;
        ctx.drawImage(
          c.sprite,
          c.x - c.spriteW / 2,
          y - c.spriteH / 2,
          c.spriteW,
          c.spriteH,
        );
      }
      if (birdAlpha > 0) {
        for (const b of flock) {
          if (b.wait <= 0) drawBird(b);
        }
      }
    }

    function step(dt: number) {
      for (const c of clouds) {
        c.x += LAYER_SPEED[c.layer] * dt;
        if (c.x > width + c.spriteW / 2) {
          c.x = -c.spriteW / 2;
          c.y = bandY(c.layer);
        }
      }
      for (let i = 0; i < flock.length; i++) {
        const b = flock[i];
        if (b.wait > 0) {
          b.wait -= dt;
          if (b.wait <= 0) flock[i] = makeBird(false);
          continue;
        }
        b.x += b.dir * b.speed * dt;
        if ((b.dir > 0 && b.x > width + 24) || (b.dir < 0 && b.x < -24)) {
          b.wait = 2 + Math.random() * 7;
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
      for (const c of clouds) renderSprite(c);
      draw();
    };
    const onVisibilityChange = () => updateRunning();

    readThemeColors();
    reducedMotion = motionQuery.matches;
    // resize() seeds and paints once regardless of the running gate, so a
    // hidden tab (or a page that never gets focus) still shows a composed sky.
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

    updateRunning();

    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      motionQuery.removeEventListener('change', onMotionChange);
      schemeQuery.removeEventListener('change', onSchemeChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pxPerCloud, maxClouds, birds]);

  return <canvas ref={canvasRef} className="cloud-sky" aria-hidden="true" />;
}
