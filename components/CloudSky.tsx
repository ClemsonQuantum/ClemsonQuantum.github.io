'use client';

import { useEffect, useRef } from 'react';
// MAX_DPR caps the canvas backing-store scale (shared with QuantumCanvas).
import { MAX_DPR, prefersReducedMotion, runWhileVisible } from '@/lib/animation';
import {
  hummerSprites,
  hummerSpriteWidth,
  readBirdColors,
  soarerSprites,
  soarerSpriteWidth,
  type BirdColors,
  type SpriteSet,
} from './birdSprites';
import { makePuffs, renderCloudSprite, type Puff } from './cloudArt';
import { HB_VIEW, hoverBob, lean, smoothstep, type HummingbirdVariant } from './hummingbirdArt';
import { SOARER_SPECIES, SOARER_VIEW, type SoarerSpecies } from './soarerArt';
import {
  makeSoarer,
  parkSoarer,
  soarerFlying,
  soarerPose,
  stepSoarer,
  type Soarer,
  type SoarerSky,
} from './soarerFlight';

type Layer = 0 | 1 | 2;

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

// A hummingbird in the strip above the hero copy. It hovers, then moves on
// (a short fast dart or a longer cruise), always the way it faces, until it
// leaves the sky; after a pause ('away') it comes back from either side.
interface Hummer {
  variant: HummingbirdVariant;
  x: number; // centre, px
  y: number;
  dir: 1 | -1;
  mode: 'hover' | 'move' | 'away';
  t: number; // s spent in this mode
  dur: number; // s this mode lasts
  x0: number; // move start and end
  y0: number;
  x1: number;
  y1: number;
  phase: number;
}

interface CloudSkyProps {
  /** px of parent width per cloud — higher = emptier sky. */
  pxPerCloud?: number;
  /** Hard ceiling on the cloud count regardless of width. */
  maxClouds?: number;
  /**
   * Original hummingbirds (components/hummingbirdArt.ts) flying in the strip
   * between the top of the hero and its copy, drawn between the cloud
   * layers. One at most on phones; parked under reduced motion.
   */
  hummingbirds?: number;
  /**
   * Original gliding birds (components/soarerArt.ts: gull, swallow, falcon)
   * crossing the same strip, behind the mid clouds. One at most on phones;
   * parked under reduced motion.
   */
  soarers?: number;
}

// Wing pose per animation frame: up, level, down, level.
const HB_FLUTTER = [0, 1, 2, 1];
const HB_FLUTTER_FPS = 30;
const HB_LEAN = 0.14; // rad at mid-move
// Where birds hold still under reduced motion, as a fraction of the width,
// so no two share a spot.
const HB_PARK_X = [0.16, 0.62, 0.9];
const SOAR_PARK_X = [0.4, 0.78, 0.04];

// Parallax layers: far → near.
const LAYER_SPEED = [4, 8, 14]; // px/s
const LAYER_SCALE = [0.55, 0.8, 1];
const LAYER_ALPHA = [0.55, 0.75, 1]; // × --qff-cloud-alpha
const LAYER_BAND: [number, number][] = [
  [0.04, 0.4],
  [0.15, 0.65],
  [0.3, 0.9],
]; // y as a fraction of the hero height

// Frame budget: birds move a few px per frame, clouds about 0.1 px, so the
// sky redraws at most 60 times a second with birds in it and 30 without.
const FRAME_MS_BIRDS = 1000 / 60 - 2;
const FRAME_MS_CLOUDS = 1000 / 30 - 2;

// Decorative "Decade on the Cloud" sky for the Qiskit Fall Fest hero: a few
// soft clouds drift across at three parallax speeds (sprites from
// cloudArt.ts). Colors come from --qff-cloud-rgb / --qff-cloud-alpha and the
// bird tokens, resolved AT THE CANVAS, so the .qff-page light/dark token swap
// recolors the sky (white cumulus on periwinkle by day, faint lavender wisps
// over the galaxy at night). The loop runs through runWhileVisible
// (lib/animation.ts): only while on screen, tab visible, and motion allowed;
// reduced motion draws a single still frame. One unconditional draw() at mount means a hidden tab
// still shows a composed sky, not an empty canvas; the canvas fades in once
// that first frame is drawn (data-ready, qff.css).
export default function CloudSky({
  pxPerCloud = 220,
  maxClouds = 9,
  hummingbirds = 0,
  soarers = 0,
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
    let hummers: Hummer[] = [];
    let gliders: Soarer[] = [];
    let birdColors: BirdColors | null = null;
    let hbSprites: SpriteSet<HummingbirdVariant> = {};
    let soarSprites: SpriteSet<SoarerSpecies> = {};
    let hbW = 50; // px, hummingbird width
    let soarW = 84; // px, soarer width
    let laneTop = 0; // px, the strip the birds fly in
    let laneBottom = 0;
    let cloudRgb = '255, 255, 255';
    let cloudAlpha = 0.55;
    let elapsed = 0; // s, the bob/flap clock (stands still while paused)
    let reducedMotion = prefersReducedMotion();

    function readThemeColors() {
      if (!canvas) return;
      // Resolved at the canvas, not documentElement, so the scoped .qff-page
      // token re-map reaches the sky.
      const styles = getComputedStyle(canvas);
      const rgb = styles.getPropertyValue('--qff-cloud-rgb').trim();
      const alpha = parseFloat(styles.getPropertyValue('--qff-cloud-alpha'));
      if (rgb) cloudRgb = rgb;
      if (Number.isFinite(alpha)) cloudAlpha = alpha;
      birdColors = readBirdColors(canvas);
    }

    function renderBirdSprites() {
      if (!birdColors) return;
      hbSprites = hummerSprites(birdColors, hbW, dpr);
      soarSprites = soarerSprites(birdColors, soarW, dpr);
    }

    const hbSpriteW = () => hummerSpriteWidth(hbW);

    function soarerSky(): SoarerSky {
      const half = (soarW * SOARER_VIEW.h) / SOARER_VIEW.w / 2;
      return {
        width,
        top: laneTop + half,
        bottom: Math.max(laneTop + half, laneBottom - half),
        birdW: soarerSpriteWidth(soarW),
        speed: [40, 70],
        wait: [4, 10],
      };
    }

    function laneY() {
      const half = (hbW * HB_VIEW.h) / HB_VIEW.w / 2;
      const lo = laneTop + half;
      const hi = Math.max(lo, laneBottom - half);
      return lo + Math.random() * (hi - lo);
    }

    function hoverLeg(h: Hummer) {
      h.mode = 'hover';
      h.t = 0;
      h.dur = 0.8 + Math.random() * 1.8;
    }

    // Onward from where it is: 40% darts (short, fast), the rest cruises.
    function moveLeg(h: Hummer, cruise = false) {
      const dart = !cruise && Math.random() < 0.4;
      const dist = dart ? 50 + Math.random() * 70 : 150 + Math.random() * 160;
      h.mode = 'move';
      h.t = 0;
      h.x0 = h.x;
      h.y0 = h.y;
      h.x1 = h.x + h.dir * dist;
      h.y1 = laneY();
      h.dur = Math.max(0.25, dist / (dart ? 330 : 120));
    }

    function awayLeg(h: Hummer, wait = 3 + Math.random() * 6) {
      h.mode = 'away';
      h.t = 0;
      h.dur = wait;
    }

    function launch(h: Hummer) {
      h.dir = Math.random() < 0.5 ? 1 : -1;
      h.x = h.dir > 0 ? -hbSpriteW() : width + hbSpriteW();
      h.y = laneY();
      moveLeg(h, true);
    }

    // The strip runs from just under the hero's top edge to its copy (the
    // first element after the canvas); bird sizes follow its height.
    function measureLane() {
      if (!canvas || !parent) return;
      const top = parent.getBoundingClientRect().top;
      const content = canvas.nextElementSibling;
      laneTop = 6;
      laneBottom = content ? content.getBoundingClientRect().top - top - 6 : height * 0.12;
      const laneH = laneBottom - laneTop;
      hbW = Math.min(width < 640 ? 36 : 50, (laneH * HB_VIEW.w) / HB_VIEW.h);
      soarW = Math.min(width < 640 ? 60 : 84, (laneH * SOARER_VIEW.w) / SOARER_VIEW.h);
    }

    function seedBirds() {
      const phone = width < 640;
      const hbCount = hbW < 18 ? 0 : phone ? Math.min(1, hummingbirds) : hummingbirds;
      hummers = Array.from({ length: hbCount }, (_, i) => {
        const h: Hummer = {
          variant: i % 2 === 0 ? 'pink' : 'lavender',
          x: width * HB_PARK_X[i % HB_PARK_X.length],
          y: (laneTop + laneBottom) / 2,
          dir: i % 2 === 0 ? 1 : -1,
          mode: 'hover',
          t: 0,
          dur: 1.5,
          x0: 0,
          y0: 0,
          x1: 0,
          y1: 0,
          phase: Math.random() * Math.PI * 2,
        };
        // Reduced motion parks every bird in view; otherwise the first one
        // hovers in view and the rest arrive later.
        if (i > 0 && !reducedMotion) awayLeg(h, 2 + i * 3);
        return h;
      });
      const soarCount = soarW < 30 ? 0 : phone ? Math.min(1, soarers) : soarers;
      const sky = soarerSky();
      gliders = Array.from({ length: soarCount }, (_, i) => {
        const s = makeSoarer(sky, 1.5 + i * 6, SOARER_SPECIES[i % SOARER_SPECIES.length]);
        if (reducedMotion) parkSoarer(s, sky, SOAR_PARK_X[i % SOAR_PARK_X.length]);
        return s;
      });
      renderBirdSprites();
    }

    function renderSprite(c: Cloud) {
      const s = renderCloudSprite(c.puffs, cloudRgb, cloudAlpha * LAYER_ALPHA[c.layer], dpr);
      c.sprite = s.canvas;
      c.spriteW = s.w;
      c.spriteH = s.h;
    }

    function bandY(layer: Layer) {
      const [lo, hi] = LAYER_BAND[layer];
      return height * (lo + Math.random() * (hi - lo));
    }

    function makeCloud(layer: Layer, anywhere: boolean): Cloud {
      const base =
        (26 + Math.random() * 22) * LAYER_SCALE[layer] * (width < 640 ? 0.75 : 1);
      const puffs = makePuffs(base);
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

    function seedClouds() {
      const count = Math.min(maxClouds, Math.max(4, Math.round(width / pxPerCloud)));
      clouds = Array.from({ length: count }, (_, i) => makeCloud((i % 3) as Layer, true));
      // Sort far → near once so draw order needs no per-frame sort.
      clouds.sort((a, b) => a.layer - b.layer);
    }

    function resize() {
      if (!canvas || !parent || !ctx) return;
      const prevWidth = width;
      const prevHeight = height;
      const prevDpr = dpr;
      const prevSizes = `${hbW}/${soarW}`;
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      measureLane();
      if (clouds.length === 0 || prevWidth === 0 || prevHeight === 0) {
        seedClouds();
        seedBirds();
      } else {
        // Rescale in place instead of reseeding so resizes don't "pop".
        for (const c of clouds) {
          c.x *= width / prevWidth;
          c.y *= height / prevHeight;
          if (dpr !== prevDpr) renderSprite(c);
        }
        if (prevWidth < 640 !== width < 640) {
          // Crossing the phone width changes how many birds fly.
          seedBirds();
        } else {
          // Birds keep flying where they are; only the strip may move.
          for (const h of hummers) {
            h.x *= width / prevWidth;
            h.x1 *= width / prevWidth;
            h.y = Math.min(Math.max(h.y, laneTop), laneBottom);
          }
          const sky = soarerSky();
          for (const s of gliders) {
            s.x *= width / prevWidth;
            s.y0 = Math.min(Math.max(s.y0, sky.top), sky.bottom);
          }
          if (dpr !== prevDpr || prevSizes !== `${hbW}/${soarW}`) renderBirdSprites();
        }
      }
      // Setting canvas.width wiped the bitmap; repaint now rather than waiting
      // for the loop, which may be paused (reduced motion, hidden tab).
      draw();
      canvas.dataset.ready = '';
    }

    function drawHummer(h: Hummer) {
      const poses = hbSprites[h.variant];
      if (!ctx || !poses || h.mode === 'away') return;
      const moving = !reducedMotion;
      const pose = moving
        ? HB_FLUTTER[Math.floor(elapsed * HB_FLUTTER_FPS + h.phase * 4) % HB_FLUTTER.length]
        : 0;
      const sprite = poses[pose];
      const w = hbSpriteW();
      const hgt = (w * sprite.height) / sprite.width;
      // Bob while hovering; lean into a move.
      const bob = moving && h.mode === 'hover' ? hoverBob(elapsed, h.phase) : 0;
      const tilt = h.mode === 'move' ? lean(Math.min(1, h.t / h.dur), HB_LEAN) : 0;
      ctx.save();
      ctx.translate(h.x, h.y + bob);
      ctx.scale(h.dir, 1);
      ctx.rotate(tilt);
      ctx.drawImage(sprite, -w / 2, -hgt / 2, w, hgt);
      ctx.restore();
    }

    function drawSoarer(s: Soarer) {
      const poses = soarSprites[s.species];
      if (!ctx || !poses || !soarerFlying(s)) return;
      const { y, lean, pose } = soarerPose(s, elapsed);
      const sprite = poses[pose];
      const w = soarerSpriteWidth(soarW);
      const hgt = (w * sprite.height) / sprite.width;
      ctx.save();
      ctx.translate(s.x, y);
      ctx.scale(s.dir, 1);
      ctx.rotate(lean);
      ctx.drawImage(sprite, -w / 2, -hgt / 2, w, hgt);
      ctx.restore();
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      // Depth: far clouds, then the gliders, mid clouds, the hummingbirds,
      // and the near clouds on top.
      let gliding = false;
      let hovering = false;
      for (const c of clouds) {
        if (!gliding && c.layer >= 1) {
          for (const s of gliders) drawSoarer(s);
          gliding = true;
        }
        if (!hovering && c.layer === 2) {
          for (const h of hummers) drawHummer(h);
          hovering = true;
        }
        if (!c.sprite) continue;
        const y = c.y + Math.sin(c.bobFreq * elapsed + c.phase) * c.bobAmp;
        ctx.drawImage(c.sprite, c.x - c.spriteW / 2, y - c.spriteH / 2, c.spriteW, c.spriteH);
      }
      if (!gliding) for (const s of gliders) drawSoarer(s);
      if (!hovering) for (const h of hummers) drawHummer(h);
    }

    function step(dt: number) {
      for (const c of clouds) {
        c.x += LAYER_SPEED[c.layer] * dt;
        if (c.x > width + c.spriteW / 2) {
          c.x = -c.spriteW / 2;
          c.y = bandY(c.layer);
        }
      }
      for (const h of hummers) {
        h.t += dt;
        if (h.mode === 'away') {
          if (h.t >= h.dur) launch(h);
        } else if (h.mode === 'move') {
          const k = Math.min(1, h.t / h.dur);
          const e = smoothstep(k);
          h.x = h.x0 + (h.x1 - h.x0) * e;
          h.y = h.y0 + (h.y1 - h.y0) * e;
          if (k >= 1) {
            const gone = h.dir > 0 ? h.x > width + hbSpriteW() : h.x < -hbSpriteW();
            if (gone) awayLeg(h);
            else hoverLeg(h);
          }
        } else if (h.t >= h.dur) {
          moveLeg(h);
        }
      }
      const sky = soarerSky();
      for (const s of gliders) stepSoarer(s, dt, sky);
    }

    function birdsInView() {
      return hummers.some((h) => h.mode !== 'away') || gliders.some(soarerFlying);
    }

    const schemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const onMotionChange = (reduced: boolean) => {
      reducedMotion = reduced;
      seedBirds();
      draw();
    };
    const onSchemeChange = () => {
      readThemeColors();
      for (const c of clouds) renderSprite(c);
      renderBirdSprites();
      draw();
    };

    readThemeColors();
    // resize() seeds and paints once regardless of the running gate, so a
    // hidden tab (or a page that never gets focus) still shows a composed sky.
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    const stop = runWhileVisible(
      canvas,
      (dt, t) => {
        elapsed = t;
        step(dt);
        draw();
      },
      {
        frameMs: () => (birdsInView() ? FRAME_MS_BIRDS : FRAME_MS_CLOUDS),
        onMotionChange,
      },
    );
    schemeQuery.addEventListener('change', onSchemeChange);

    return () => {
      stop();
      resizeObserver.disconnect();
      schemeQuery.removeEventListener('change', onSchemeChange);
    };
  }, [pxPerCloud, maxClouds, hummingbirds, soarers]);

  return <canvas ref={canvasRef} className="cloud-sky" aria-hidden="true" />;
}
