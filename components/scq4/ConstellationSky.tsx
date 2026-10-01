'use client';

import { useEffect, useRef } from 'react';
import '@/assets/css/scq4-archive.css';
import { MAX_DPR } from '@/lib/animation';
import { buildBlackbodyTable, srgbEncode } from '@/lib/physics/blackbody.mjs';
import {
  MAX_FRAME_DT,
  SKY_ALPHA_BUCKETS,
  SKY_COLOR_BINS,
  SKY_DOT_STYLE,
  SKY_EDGE_PX,
  SKY_FRAME_MS,
  SKY_LINE_ALPHA,
  SKY_LINE_PX,
  SKY_SIDEREAL_HOURS_PER_MINUTE,
  SKY_STAR_ALPHA,
  SKY_TEMP_RANGE,
} from './config';
import { motionPaused, onMotionChange } from './motion';

type RGB = [number, number, number];
type SkyModule = typeof import('@/lib/physics/sky.mjs');

declare global {
  interface Window {
    // Development-only check hook: draws the sky for an instant and reports
    // where two reference stars land (CSS px within the canvas).
    __scq4Sky?: {
      renderAt: (iso: string) => {
        drawn: number;
        polaris: [number, number] | null;
        vega: [number, number] | null;
      };
    };
  }
}

// Reference stars for the dev hook (J2000, degrees).
const POLARIS = { ra: 37.9546, dec: 89.2641 };
const VEGA = { ra: 279.2347, dec: 38.7837 };

function parseRgb(value: string, fallback: RGB): RGB {
  const parts = value.split(',').map((v) => Number(v.trim()));
  return parts.length === 3 && parts.every(Number.isFinite) ? (parts as RGB) : fallback;
}

// The real sky over Clemson behind the v4 hero: stars down to magnitude 5
// and the constellations' stick figures, at the reader's own time, turning
// as a slow time-lapse about the celestial pole (lib/physics/sky.mjs does the
// astronomy: sidereal time, precession, nutation, the horizon frame, and a
// stereographic projection from the zenith). The catalog loads after the
// page, so the hero never waits on it. Like the site's other canvases it
// runs only on screen, in a visible tab, and without reduced motion (then a
// single still frame of the sky right now). Mounted by MarkdownDiv for the
// `.scq4-hero--sky` sentinel, as the hero's first child.
export default function ConstellationSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !parent || !ctx) return;

    let sky: SkyModule | null = null;
    let stars: Float64Array = new Float64Array(0); // unit vectors, J2000
    let dots: { r: number; a: number; bin: number }[] = [];
    let lines: Float64Array[] = [];
    const matrix = new Float64Array(9);
    const v = new Float64Array(3);
    const xy = new Float64Array(2);
    let width = 0;
    let height = 0;
    let dark = false;
    let ink: RGB = [22, 32, 51];
    let colors: string[] = [];
    let disposed = false;
    let rafId = 0;
    let lastDraw = 0;
    let intersecting = true;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const schemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    let reduced = motionQuery.matches;
    // Sky time = the moment the page opened + the sped-up time it has run
    // (it stands still while off screen, hidden, or paused).
    const opened = Date.now();
    let elapsedMs = 0;
    let speedup = 1;

    function readTheme() {
      if (!canvas) return;
      const cs = getComputedStyle(canvas);
      dark = schemeQuery.matches;
      ink = parseRgb(cs.getPropertyValue('--scq4-ink-rgb'), ink);
    }

    // Star colors: a few blackbody bins over the stars' temperature range.
    function buildColors() {
      const [tMin, tMax] = SKY_TEMP_RANGE;
      const table = buildBlackbodyTable(tMin, tMax, SKY_COLOR_BINS);
      colors = [];
      for (let k = 0; k < SKY_COLOR_BINS; k++) {
        const c = [0, 1, 2].map((i) => Math.round(255 * srgbEncode(table[3 * k + i])));
        colors.push(`${c[0]}, ${c[1]}, ${c[2]}`);
      }
    }

    function resize() {
      if (!canvas || !parent || !ctx) return;
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(skyDate());
    }

    function skyDate() {
      return new Date(opened + elapsedMs);
    }

    // Zenith at the canvas center, horizon through its corners.
    function project(u: ArrayLike<number>, offset: number): boolean {
      if (!sky) return false;
      const x = u[offset];
      const y = u[offset + 1];
      const z = u[offset + 2];
      v[0] = matrix[0] * x + matrix[1] * y + matrix[2] * z;
      v[1] = matrix[3] * x + matrix[4] * y + matrix[5] * z;
      v[2] = matrix[6] * x + matrix[7] * y + matrix[8] * z;
      sky.stereoFromHorizon(v, xy, 0);
      if (!Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) return false;
      const scale = Math.hypot(width, height) / 2;
      xy[0] = width / 2 + xy[0] * scale;
      xy[1] = height / 2 - xy[1] * scale;
      return true;
    }

    function draw(date: Date): number {
      if (!ctx || disposed) return 0;
      ctx.clearRect(0, 0, width, height);
      if (!sky || width <= 0 || height <= 0) return 0;
      sky.horizonMatrix(date, sky.CLEMSON, matrix);

      // Stick figures: one hairline path.
      const lineAlpha = dark ? SKY_LINE_ALPHA.dark : SKY_LINE_ALPHA.light;
      ctx.lineWidth = SKY_LINE_PX;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(${ink.join(', ')}, ${lineAlpha})`;
      ctx.beginPath();
      for (const poly of lines) {
        let pen = false;
        for (let i = 0; i < poly.length; i += 3) {
          if (!project(poly, i)) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(xy[0], xy[1]);
          else ctx.moveTo(xy[0], xy[1]);
          pen = true;
        }
      }
      ctx.stroke();

      // Stars: grouped by alpha bucket (and color bin in the dark theme),
      // one fill per group.
      const starAlpha = dark ? SKY_STAR_ALPHA.dark : SKY_STAR_ALPHA.light;
      const groups = new Map<number, number[]>();
      let drawn = 0;
      for (let i = 0; i < dots.length; i++) {
        if (!project(stars, 3 * i)) continue;
        const x = xy[0];
        const y = xy[1];
        if (x < -SKY_EDGE_PX || y < -SKY_EDGE_PX || x > width + SKY_EDGE_PX || y > height + SKY_EDGE_PX) continue;
        const d = dots[i];
        const bucket = Math.min(SKY_ALPHA_BUCKETS - 1, Math.floor(d.a * SKY_ALPHA_BUCKETS));
        const key = (dark ? d.bin : 0) * SKY_ALPHA_BUCKETS + bucket;
        let list = groups.get(key);
        if (!list) groups.set(key, (list = []));
        list.push(x, y, d.r);
        drawn++;
      }
      for (const [key, list] of groups) {
        const bucket = key % SKY_ALPHA_BUCKETS;
        const bin = Math.floor(key / SKY_ALPHA_BUCKETS);
        const alpha = ((bucket + 0.5) / SKY_ALPHA_BUCKETS) * starAlpha;
        const rgb = dark ? colors[bin] : ink.join(', ');
        ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        for (let k = 0; k < list.length; k += 3) {
          ctx.moveTo(list[k] + list[k + 2], list[k + 1]);
          ctx.arc(list[k], list[k + 1], list[k + 2], 0, 2 * Math.PI);
        }
        ctx.fill();
      }
      return drawn;
    }

    // At most SKY_FRAME_MS apart; the first frame after a restart only draws.
    function frame(time: number) {
      rafId = 0;
      if (disposed) return;
      if (!lastDraw || time - lastDraw >= SKY_FRAME_MS - 2) {
        const dt = lastDraw ? Math.min(time - lastDraw, MAX_FRAME_DT * 1000) : 0;
        lastDraw = time;
        elapsedMs += dt * speedup;
        draw(skyDate());
      }
      schedule();
    }

    function running() {
      return !!sky && intersecting && !document.hidden && !reduced && !motionPaused();
    }

    function schedule() {
      if (disposed || rafId || !running()) return;
      rafId = requestAnimationFrame(frame);
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      lastDraw = 0;
    }

    const onMotion = () => {
      reduced = motionQuery.matches;
      stop();
      draw(skyDate());
      schedule();
    };
    const onPause = () => {
      if (motionPaused()) stop();
      else schedule();
    };
    const onScheme = () => {
      readTheme();
      draw(skyDate());
    };
    const onVisibility = () => (document.hidden ? stop() : schedule());

    readTheme();
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    const intersectionObserver = new IntersectionObserver((entries) => {
      intersecting = entries[0]?.isIntersecting ?? true;
      if (intersecting) schedule();
      else stop();
    });
    intersectionObserver.observe(canvas);
    motionQuery.addEventListener('change', onMotion);
    schemeQuery.addEventListener('change', onScheme);
    document.addEventListener('visibilitychange', onVisibility);
    const offPause = onMotionChange(onPause);

    // The astronomy and the catalog arrive after the page.
    Promise.all([import('@/lib/physics/sky.mjs'), import('@/lib/physics/sky-data.json')])
      .then(([mod, data]) => {
        if (disposed) return;
        const decoded = mod.decodeSkyData(data.default ?? data);
        stars = decoded.stars;
        lines = decoded.lines;
        const [tMin, tMax] = SKY_TEMP_RANGE;
        const span = Math.log(tMax / tMin);
        dots = Array.from(decoded.mag, (mag, i) => {
          const { r, alpha } = mod.starDot(mag, SKY_DOT_STYLE);
          const T = mod.bvToTemperature(decoded.bv[i]);
          const bin = Math.round(((SKY_COLOR_BINS - 1) * Math.log(Math.min(tMax, Math.max(tMin, T)) / tMin)) / span);
          return { r, a: alpha, bin };
        });
        speedup = mod.siderealSpeedup(SKY_SIDEREAL_HOURS_PER_MINUTE);
        buildColors();
        sky = mod;
        draw(skyDate());
        schedule();
      })
      .catch((err) => console.warn('[scq4] the sky could not load; the hero continues without it.', err));

    if (process.env.NODE_ENV !== 'production') {
      window.__scq4Sky = {
        renderAt(iso: string) {
          const date = new Date(iso);
          const drawnStars = draw(date);
          const where = (s: { ra: number; dec: number }): [number, number] | null => {
            if (!sky) return null;
            const u = sky.equatorialUnit(s.ra, s.dec);
            return project(u, 0) ? [xy[0], xy[1]] : null;
          };
          return { drawn: drawnStars, polaris: where(POLARIS), vega: where(VEGA) };
        },
      };
    }

    return () => {
      disposed = true;
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      motionQuery.removeEventListener('change', onMotion);
      schemeQuery.removeEventListener('change', onScheme);
      document.removeEventListener('visibilitychange', onVisibility);
      offPause();
      if (process.env.NODE_ENV !== 'production') delete window.__scq4Sky;
    };
  }, []);

  return <canvas ref={canvasRef} className="scq4-sky" aria-hidden="true" />;
}
