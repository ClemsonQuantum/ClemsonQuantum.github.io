'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion, runWhileVisible } from '@/lib/animation';
import { readBirdColors, soarerSprites, soarerSpriteWidth, type SpriteSet } from './birdSprites';
import { makePuffs, renderCloudSprite, type CloudSprite, type Puff } from './cloudArt';
import type { SoarerSpecies } from './soarerArt';
import {
  makeSoarer,
  soarerFlying,
  soarerPose,
  stepSoarer,
  type Soarer,
  type SoarerSky,
} from './soarerFlight';

// Faint clouds behind the whole Qiskit Fall Fest page (MarkdownDiv renders it
// for <div class="qff-page-clouds">). One viewport-sized canvas, appended to
// <body> so position: fixed can't be trapped by a transformed ancestor;
// z-index -1 (qff.css) keeps it behind all content. Three layers drift
// sideways and rise with the scroll at different rates, wrapping from top to
// bottom, so clouds keep passing as the reader moves down the page. Colors
// come from --qff-page-cloud-rgb / --qff-page-cloud-alpha, read at the
// sentinel because the canvas itself sits outside .qff-page. Now and then one
// gliding bird (soarerFlight.ts) crosses the screen behind the near clouds,
// faint like them (--qff-page-soarer-alpha). Same discipline as CloudSky: the
// loop runs only while the tab is visible and motion is allowed, capped at
// 30 frames a second at rest and 60 while the page scrolls (so the parallax
// keeps up with the text); reduced motion gets one still frame and no bird.

// Far → near: sideways speed (px/s), share of the scroll each layer rises
// by, size, and opacity.
const LAYERS = [
  { speed: 10, parallax: 0.1, scale: 0.75, alpha: 0.6 },
  { speed: 16, parallax: 0.2, scale: 1, alpha: 0.8 },
  { speed: 26, parallax: 0.3, scale: 1.3, alpha: 1 },
] as const;
const PX2_PER_CLOUD = 130_000; // viewport area per cloud
const MIN_CLOUDS = 4;
const MAX_CLOUDS = 14;
// Soft-edged clouds look the same at 1x, so the big sprites and the
// full-screen canvas skip high-DPI resolution.
const DPR = 1;
const FRAME_MS = 1000 / 30 - 2;
const FRAME_MS_SCROLL = 1000 / 60 - 2;

interface PageCloud {
  layer: number;
  x: number; // centre, px
  y: number; // centre within the wrap band, before scroll
  puffs: Puff[];
  sprite: CloudSprite;
}

export default function PageClouds() {
  const tokenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tokens = tokenRef.current;
    if (!tokens) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'qff-page-clouds-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) {
      canvas.remove();
      return;
    }
    const ctx: CanvasRenderingContext2D = context;
    const tokenEl: HTMLDivElement = tokens;

    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    let reduced = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let rgb = '218, 229, 252';
    let alpha = 0.4;
    let clouds: PageCloud[] = [];
    let glider: Soarer | null = null;
    let soarSprites: SpriteSet<SoarerSpecies> = {};
    let soarAlpha = 0.5;
    let elapsed = 0;
    let lastScroll = 0; // scrollY at the last draw

    const soarW = () => (width < 640 ? 48 : 72);
    const sky = (): SoarerSky => ({
      width,
      top: height * 0.15,
      bottom: height * 0.85,
      birdW: soarerSpriteWidth(soarW()),
      speed: [35, 55],
      wait: [12, 25],
    });

    // Clouds wrap through a band taller than the viewport by a margin, so
    // they slide fully off one edge before reappearing at the other.
    const margin = () => Math.max(160, height * 0.25);

    function readColors() {
      const styles = getComputedStyle(tokenEl);
      const r = styles.getPropertyValue('--qff-page-cloud-rgb').trim();
      const a = parseFloat(styles.getPropertyValue('--qff-page-cloud-alpha'));
      if (r) rgb = r;
      if (Number.isFinite(a)) alpha = a;
      const sa = parseFloat(styles.getPropertyValue('--qff-page-soarer-alpha'));
      if (Number.isFinite(sa)) soarAlpha = sa;
      soarSprites = soarerSprites(readBirdColors(tokenEl), soarW(), DPR);
    }

    function render(c: PageCloud) {
      c.sprite = renderCloudSprite(c.puffs, rgb, alpha * LAYERS[c.layer].alpha, DPR);
    }

    function makeCloud(layer: number): PageCloud {
      const base = (80 + Math.random() * 50) * LAYERS[layer].scale * (width < 640 ? 0.6 : 1);
      const c: PageCloud = {
        layer,
        x: Math.random() * width,
        y: Math.random() * (height + 2 * margin()),
        puffs: makePuffs(base),
        sprite: { canvas: null, w: 0, h: 0 },
      };
      render(c);
      return c;
    }

    function seed() {
      const count = Math.min(MAX_CLOUDS, Math.max(MIN_CLOUDS, Math.round((width * height) / PX2_PER_CLOUD)));
      clouds = Array.from({ length: count }, (_, i) => makeCloud(i % LAYERS.length));
      // Far layers first so near clouds draw on top.
      clouds.sort((a, b) => a.layer - b.layer);
      glider = reduced ? null : makeSoarer(sky(), 6 + Math.random() * 4);
    }

    function resize() {
      const prevWidth = width;
      const prevHeight = height;
      const prevMargin = margin();
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * DPR);
      canvas.height = Math.round(height * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (clouds.length === 0 || prevWidth === 0) {
        seed();
      } else {
        for (const c of clouds) c.x *= width / prevWidth;
        if (glider) glider.x *= width / prevWidth;
        // A phone toolbar showing or hiding changes the height and so the
        // wrap band; re-base each cloud so it stays where it is on screen
        // instead of the whole layer jumping (as HummingbirdZone avoids).
        if (height !== prevHeight) {
          const scroll = reduced ? 0 : window.scrollY;
          const prevBand = prevHeight + 2 * prevMargin;
          const m = margin();
          for (const c of clouds) {
            const shift = scroll * LAYERS[c.layer].parallax;
            const shown = ((((c.y - shift) % prevBand) + prevBand) % prevBand) - prevMargin;
            c.y = shown + m + shift;
          }
        }
      }
      // The bird's sprite size depends on the width (phone or not).
      if (!prevWidth || prevWidth < 640 !== width < 640) readColors();
      draw();
    }

    function drawGlider() {
      const poses = glider && soarSprites[glider.species];
      if (!glider || !poses || !soarerFlying(glider)) return;
      const { y, lean, pose } = soarerPose(glider, elapsed);
      const sprite = poses[pose];
      const w = soarerSpriteWidth(soarW());
      const h = (w * sprite.height) / sprite.width;
      ctx.save();
      ctx.globalAlpha = soarAlpha;
      ctx.translate(glider.x, y);
      ctx.scale(glider.dir, 1);
      ctx.rotate(lean);
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const m = margin();
      const band = height + 2 * m;
      const scroll = reduced ? 0 : window.scrollY;
      lastScroll = scroll;
      let glided = false;
      for (const c of clouds) {
        if (!glided && c.layer === LAYERS.length - 1) {
          drawGlider(); // behind the near clouds
          glided = true;
        }
        if (!c.sprite.canvas) continue;
        const raw = c.y - scroll * LAYERS[c.layer].parallax;
        const y = (((raw % band) + band) % band) - m;
        ctx.drawImage(c.sprite.canvas, c.x - c.sprite.w / 2, y - c.sprite.h / 2, c.sprite.w, c.sprite.h);
      }
      if (!glided) drawGlider();
    }

    function step(dt: number) {
      if (glider) stepSoarer(glider, dt, sky());
      for (const c of clouds) {
        c.x += LAYERS[c.layer].speed * dt;
        if (c.x - c.sprite.w / 2 > width) {
          c.x = -c.sprite.w / 2;
          c.y = Math.random() * (height + 2 * margin());
        }
      }
    }

    const onScheme = () => {
      readColors();
      for (const c of clouds) render(c);
      draw();
    };
    const onMotion = (nowReduced: boolean) => {
      reduced = nowReduced;
      if (reduced) glider = null;
      else glider ??= makeSoarer(sky(), 6);
      draw();
    };

    readColors();
    resize();
    // A fixed full-screen canvas is on screen whenever it is mounted, so
    // only the tab and the motion preference gate it (null target).
    const stop = runWhileVisible(
      null,
      (dt, t) => {
        elapsed = t;
        step(dt);
        draw();
      },
      {
        frameMs: () => (window.scrollY !== lastScroll ? FRAME_MS_SCROLL : FRAME_MS),
        onMotionChange: onMotion,
      },
    );
    window.addEventListener('resize', resize);
    scheme.addEventListener('change', onScheme);
    return () => {
      stop();
      window.removeEventListener('resize', resize);
      scheme.removeEventListener('change', onScheme);
      canvas.remove();
    };
  }, []);

  return <div ref={tokenRef} className="qff-page-clouds" aria-hidden="true" />;
}
