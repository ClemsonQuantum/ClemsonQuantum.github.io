// @ts-check
/**
 * CPU reference renderer for the v4 black hole (components/scq4/blackHoleScene.ts).
 *
 * A line-by-line JavaScript port of the scene's fragment shader: same tables
 * (built by the scene's own buildBlackHoleTables), same constants, same hash,
 * same lookup and sentinel rules, same formulas. Each pixel comes out as the
 * shader writes it: premultiplied, sRGB-encoded RGBA whose empty sky is
 * transparent (only the disk, the stars and the shadow are drawn). The
 * script composites that "over" a flat backdrop, the page's navy night band
 * rgb(11, 16, 32), on encoded values as the browser does, renders frames to
 * 24-bit BMP and converts them to PNG with macOS `sips`, for visual checks
 * without a browser.
 *
 * Run:
 *   node scripts/render-blackhole-preview.mjs [outDir] [--size=320] [--incl=75,85]
 *     [--pxPerM=<px>] [--exposure=0.8] [--time=0] [--azimuth=0]
 * outDir defaults to $TMPDIR/scq4-blackhole-preview. The scene module is
 * TypeScript; Node strips its types natively, and a resolve hook maps the
 * repo's "@/..." import alias.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { srgbEncode } from '../lib/physics/blackbody.mjs';
import { B_CRIT, R_ISCO, WEAK_FIELD_COEFFS } from '../lib/physics/schwarzschild.mjs';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Resolve the tsconfig alias "@/x" -> <repo>/x(.ts) for the scene module, and
// declare .ts files as ES modules (the package has no "type" field).
registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = specifier;
    if (specifier.startsWith('@/')) {
      const rel = specifier.slice(2);
      target = pathToFileURL(path.join(REPO_ROOT, path.extname(rel) ? rel : `${rel}.ts`)).href;
    }
    const resolved = nextResolve(target, context);
    return resolved.url.endsWith('.ts') ? { ...resolved, format: 'module-typescript' } : resolved;
  },
});
const scene = await import(pathToFileURL(path.join(REPO_ROOT, 'components/scq4/blackHoleScene.ts')).href);

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const DEFAULTS = {
  size: 320, // px (square frame)
  incl: [75, 85], // deg
  viewRadiusM: 25, // M: the view circle spans the disk (R_OUT = 22) plus lensing
  exposure: 0.8,
  time: 0, // M
  azimuth: 0, // rad
};

/** @type {Record<string, string>} */
const flags = {};
/** @type {string[]} */
const positional = [];
for (const arg of process.argv.slice(2)) {
  const m = /^--([^=]+)=(.*)$/.exec(arg);
  if (m) flags[m[1]] = m[2];
  else positional.push(arg);
}
const outDir = positional[0] ?? path.join(os.tmpdir(), 'scq4-blackhole-preview');
const size = Number(flags.size ?? DEFAULTS.size);
const inclinations = (flags.incl ?? DEFAULTS.incl.join(',')).split(',').map(Number);
const pxPerM = Number(flags.pxPerM ?? (0.5 * size) / DEFAULTS.viewRadiusM);
const exposure = Number(flags.exposure ?? DEFAULTS.exposure);
const time = Number(flags.time ?? DEFAULTS.time);
const azimuth = Number(flags.azimuth ?? DEFAULTS.azimuth);
for (const [name, v] of Object.entries({ size, pxPerM, exposure, time, azimuth })) {
  if (!Number.isFinite(v)) throw new RangeError(`[preview] option ${name} is not a number: ${v}`);
}
if (!inclinations.every((d) => Number.isFinite(d) && d >= 0 && d < 90)) {
  throw new RangeError(`[preview] inclinations must lie in [0, 90) deg, got ${inclinations}`);
}

// ---------------------------------------------------------------------------
// Shader port (mirrors FRAGMENT_SHADER in blackHoleScene.ts, function by function)
// ---------------------------------------------------------------------------

/**
 * @typedef {[number, number, number]} Vec3
 */

/** @param {number} x @param {number} lo @param {number} hi */
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
/** @param {number} a @param {number} b @param {number} t */
const mix = (a, b, t) => a + (b - a) * t;
/** @param {number} e0 @param {number} e1 @param {number} x */
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
/** @param {Vec3} a @param {Vec3} b @returns {number} */
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** @param {Vec3} a @param {Vec3} b @returns {Vec3} */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** @param {Vec3} a @returns {Vec3} */
const normalize = (a) => {
  const n = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / n, a[1] / n, a[2] / n];
};
/** GLSL mod(): x - y floor(x / y). @param {number} x @param {number} y */
const glslMod = (x, y) => x - y * Math.floor(x / y);

/**
 * Build the per-frame shader closure (uniforms baked in).
 *
 * @param {import('../components/scq4/blackHoleScene.ts').BlackHoleTables} t
 * @param {{ pxPerM: number, radius: number, inclination: number, azimuth: number, time: number, opacity: number, exposure: number }} d
 */
function makeShader(t, d) {
  const { map } = t;
  const incl = Math.min(scene.INCLINATION_MAX, Math.max(0, d.inclination));
  const sinI = Math.sin(incl);
  const cosI = Math.cos(incl);
  const cosAz = Math.cos(d.azimuth);
  const sinAz = Math.sin(d.azimuth);
  /** @type {Vec3} */
  const O = [sinI, 0, cosI];
  /** @type {Vec3} */
  const E1 = [0, 1, 0];
  /** @type {Vec3} */
  const E2 = [-cosI, 0, sinI];
  const flow = scene.flowPhases(d.time);
  const logTMin = Math.log(t.tMin);
  const logTMax = Math.log(t.tMax);
  const nbm1 = t.nb - 1;
  const B_EPS = 1e-6;
  const Y_FLOOR = 1e-30; // keeps log Y finite in luminance()
  const { hash3, pcgHash: pcg, unitFloat } = scene;

  /** @param {number} x */
  const asinhStable = (x) => Math.sign(x) * Math.log(Math.abs(x) + Math.sqrt(x * x + 1));
  /** @param {number} b */
  const sOfB = (b) => map.sCrit + asinhStable((b - map.bCrit) / map.core) / map.k;
  /** @param {number} j */
  const bOfRow = (j) => Math.max(0, map.bCrit + map.core * Math.sinh(map.k * (j / nbm1 - map.sCrit)));
  /** @param {number} u */
  const isLive = (u) => u > -0.5 && u < 0.75;

  /** @param {number} j @param {number} i0 @param {number} fx */
  function rowU(j, i0, fx) {
    const a = t.geodesic[j * t.nPhi + i0];
    const c = t.geodesic[j * t.nPhi + i0 + 1];
    if (isLive(a) && isLive(c)) return mix(a, c, fx);
    return fx < 0.5 ? a : c;
  }

  /** @param {number} phi @param {number} b @param {number} y */
  function geodesicU(phi, b, y) {
    const x = clamp(phi / t.phiMax, 0, 1) * (t.nPhi - 1);
    const i0 = Math.min(Math.trunc(x), t.nPhi - 2);
    const fx = x - i0;
    const yc = clamp(y, 0, nbm1);
    let j0 = Math.min(Math.trunc(yc), t.nb - 2);
    let j1 = j0 + 1;
    let fy = yc - j0;
    if (yc >= map.jCrit && j0 < map.jCrit) {
      j0 = j1;
      fy = 0;
    } else if (yc < map.jCrit && j1 > map.jCrit) {
      j1 = j0;
      fy = 0;
    }
    const u0 = rowU(j0, i0, fx);
    const u1 = rowU(j1, i0, fx);
    if (isLive(u0) && isLive(u1)) return mix(bOfRow(j0) * u0, bOfRow(j1) * u1, fy) / b;
    const nearFirst = fy < 0.5;
    const un = nearFirst ? u0 : u1;
    return isLive(un) ? (bOfRow(nearFirst ? j0 : j1) * un) / b : un;
  }

  /** @param {number} b */
  function sweepAngle(b) {
    if (b >= map.bMax) {
      const x = 1 / b;
      const k = WEAK_FIELD_COEFFS;
      return Math.PI + x * (k[0] + x * (k[1] + x * (k[2] + x * (k[3] + x * k[4]))));
    }
    const y = clamp(sOfB(b), 0, 1) * nbm1;
    const j0 = Math.min(Math.trunc(y), t.nb - 2);
    const p0 = t.escape[j0];
    const p1 = t.escape[j0 + 1];
    if (p0 > 0 && p1 > 0) return mix(p0, p1, y - j0);
    return Math.max(p0, p1);
  }

  /** @param {number} r */
  function fluxAt(r) {
    const n = t.flux.length;
    const x = clamp((r - t.rIn) / (t.rOut - t.rIn), 0, 1) * (n - 1);
    const i = Math.min(Math.trunc(x), n - 2);
    return mix(t.flux[i], t.flux[i + 1], x - i);
  }

  /** @param {number} T @returns {Vec3} */
  function blackbody(T) {
    const n = t.blackbody.length / 3;
    const x = clamp((Math.log(Math.max(T, 1)) - logTMin) / (logTMax - logTMin), 0, 1) * (n - 1);
    const i = Math.min(Math.trunc(x), n - 2);
    const f = x - i;
    const bb = t.blackbody;
    return [mix(bb[3 * i], bb[3 * i + 3], f), mix(bb[3 * i + 1], bb[3 * i + 4], f), mix(bb[3 * i + 2], bb[3 * i + 5], f)];
  }

  /** Y(T) / Y(T_PEAK) on the blackbody table's log-T grid, interpolated in log Y. @param {number} T */
  function luminance(T) {
    const n = t.luminance.length;
    const x = clamp((Math.log(Math.max(T, 1)) - logTMin) / (logTMax - logTMin), 0, 1) * (n - 1);
    const i = Math.min(Math.trunc(x), n - 2);
    const y0 = Math.log(Math.max(t.luminance[i], Y_FLOOR));
    const y1 = Math.log(Math.max(t.luminance[i + 1], Y_FLOOR));
    return Math.exp(mix(y0, y1, x - i));
  }

  /** @param {number} px @param {number} py @param {number} period @param {number} seed */
  function valueNoise(px, py, period, seed) {
    const ix = Math.floor(px);
    const iy = Math.floor(py);
    const fx = px - ix;
    const fy = py - iy;
    const wx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const wy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const x0 = glslMod(ix, period) >>> 0;
    const x1 = glslMod(ix + 1, period) >>> 0;
    const y0 = iy >>> 0;
    const y1 = (y0 + 1) >>> 0;
    const v00 = unitFloat(hash3(x0, y0, seed));
    const v10 = unitFloat(hash3(x1, y0, seed));
    const v01 = unitFloat(hash3(x0, y1, seed));
    const v11 = unitFloat(hash3(x1, y1, seed));
    return 2 * mix(mix(v00, v10, wx), mix(v01, v11, wx), wy) - 1;
  }

  /** @param {number} r @param {number} phiDisk @param {number} omega */
  function flowModulation(r, phiDisk, omega) {
    const lr = Math.log(r) * scene.FLOW_RADIAL_CELLS;
    const [w0, w1] = scene.FLOW_OCTAVE_WEIGHTS;
    let sum = 0;
    for (let k = 0; k < 2; k++) {
      const psi = phiDisk - omega * flow.tau[k];
      const x = (psi / (2 * Math.PI)) * scene.FLOW_AZIMUTH_CELLS;
      const seed = flow.seed[k];
      sum +=
        flow.weight[k] *
        (w0 * valueNoise(x, lr, scene.FLOW_AZIMUTH_CELLS, seed) +
          w1 * valueNoise(2 * x, 2 * lr, 2 * scene.FLOW_AZIMUTH_CELLS, pcg(seed)));
    }
    return 1 + scene.FLOW_AMPLITUDE * clamp(scene.FLOW_GAIN * sum, -1, 1);
  }

  /** @param {number} r @param {number} b @param {number} cosAlpha @param {number} phiDisk @returns {Vec3} */
  function diskColor(r, b, cosAlpha, phiDisk) {
    const omega = r ** -1.5;
    const g = Math.sqrt(1 - 3 / r) / (1 + omega * b * sinI * cosAlpha);
    const f = fluxAt(r);
    const tObs = g * t.tPeak * Math.sqrt(Math.sqrt(f));
    const lum = luminance(tObs) * flowModulation(r, phiDisk, omega);
    const c = blackbody(tObs);
    const k = 1 - Math.exp(-d.exposure * lum);
    return [c[0] * k, c[1] * k, c[2] * k];
  }

  /** @param {number} x @param {number} y @returns {[number, number, number, number]} */
  function shadeDisk(x, y) {
    let b = Math.hypot(x, y);
    if (b >= map.bMax) return [0, 0, 0, 0];
    b = Math.max(b, B_EPS);
    const ca = x / b;
    const sa = y / b;
    /** @type {Vec3} */
    const sHat = [ca * E1[0] + sa * E2[0], ca * E1[1] + sa * E2[1], ca * E1[2] + sa * E2[2]];
    const phi0 = Math.atan2(sa * sinI, cosI) + 0.5 * Math.PI;
    const yRow = sOfB(b) * nbm1;
    const acc = [0, 0, 0, 0];
    for (let n = 0; n < 3; n++) {
      const phi = phi0 + n * Math.PI;
      const u = geodesicU(phi, b, yRow);
      if (!isLive(u)) break;
      if (u > 1 / R_ISCO || u < 1 / t.rOut) continue;
      const r = 1 / u;
      const cp = Math.cos(phi);
      const sp = Math.sin(phi);
      const nx = cp * O[0] + sp * sHat[0];
      const ny = cp * O[1] + sp * sHat[1];
      // Azimuth of the crossing in the hole's frame: Rz(azimuth), as for the sky.
      const hx = cosAz * nx - sinAz * ny;
      const hy = sinAz * nx + cosAz * ny;
      const a = 1 - smoothstep(t.rOut - scene.DISK_EDGE_FADE, t.rOut, r);
      const c = diskColor(r, b, ca, Math.atan2(hy, hx));
      const wgt = (1 - acc[3]) * a;
      acc[0] += wgt * c[0];
      acc[1] += wgt * c[1];
      acc[2] += wgt * c[2];
      acc[3] += wgt;
    }
    return /** @type {[number, number, number, number]} */ (acc);
  }

  /** @param {number} x @param {number} y @returns {Vec3} */
  function skyDirection(x, y) {
    const b = Math.max(Math.hypot(x, y), B_EPS);
    /** @type {Vec3} */
    const sHat = [(x * E1[0] + y * E2[0]) / b, (x * E1[1] + y * E2[1]) / b, (x * E1[2] + y * E2[2]) / b];
    const phi = sweepAngle(b);
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    /** @type {Vec3} */
    const dv = [cp * O[0] + sp * sHat[0], cp * O[1] + sp * sHat[1], cp * O[2] + sp * sHat[2]];
    return [cosAz * dv[0] - sinAz * dv[1], sinAz * dv[0] + cosAz * dv[1], dv[2]];
  }

  /** @param {number} face @param {number} u @param {number} v @returns {Vec3} */
  function faceDirection(face, u, v) {
    if (face === 0) return [1, u, v];
    if (face === 1) return [-1, u, v];
    if (face === 2) return [u, 1, v];
    if (face === 3) return [u, -1, v];
    if (face === 4) return [u, v, 1];
    return [u, v, -1];
  }

  /**
   * @param {Vec3} dv @param {Vec3} t1 @param {Vec3} t2 @param {Vec3} cov
   * @param {import('../components/scq4/blackHoleScene.ts').StarLayer} layer
   * @returns {Vec3}
   */
  function starLayer(dv, t1, t2, cov, layer) {
    const { cells, probability, brightness } = layer;
    const seed = layer.seed >>> 0;
    const a = [Math.abs(dv[0]), Math.abs(dv[1]), Math.abs(dv[2])];
    let face;
    let uu;
    let vv;
    if (a[0] >= a[1] && a[0] >= a[2]) {
      face = dv[0] > 0 ? 0 : 1;
      uu = dv[1] / a[0];
      vv = dv[2] / a[0];
    } else if (a[1] >= a[2]) {
      face = dv[1] > 0 ? 2 : 3;
      uu = dv[0] / a[1];
      vv = dv[2] / a[1];
    } else {
      face = dv[2] > 0 ? 4 : 5;
      uu = dv[0] / a[2];
      vv = dv[1] / a[2];
    }
    const cx = Math.floor(clamp((uu * 0.5 + 0.5) * cells, 0, cells - 1e-3));
    const cy = Math.floor(clamp((vv * 0.5 + 0.5) * cells, 0, cells - 1e-3));
    const h = hash3((face + seed) >>> 0, cx, cy);
    if (unitFloat(h) >= probability) return [0, 0, 0];
    const h1 = pcg(h);
    const h2 = pcg(h1);
    const h3 = pcg(h2);
    const h4 = pcg(h3);
    const m = scene.STAR_CELL_MARGIN;
    const jx = m + (1 - 2 * m) * unitFloat(h1);
    const jy = m + (1 - 2 * m) * unitFloat(h2);
    const dStar = normalize(faceDirection(face, ((cx + jx) / cells) * 2 - 1, ((cy + jy) / cells) * 2 - 1));
    /** @type {Vec3} */
    const delta = [dStar[0] - dv[0], dStar[1] - dv[1], dStar[2] - dv[2]];
    const ex = dot(delta, t1);
    const ey = dot(delta, t2);
    const det = cov[0] * cov[1] - cov[2] * cov[2];
    const q = (cov[1] * ex * ex - 2 * cov[2] * ex * ey + cov[0] * ey * ey) / det;
    const spread = 3 * Math.sqrt(0.5 * (cov[0] + cov[1])) * cells * 0.5;
    const keep = 1 - smoothstep(0.5 * m, m, spread);
    const peak = (scene.STAR_RADIUS * scene.STAR_RADIUS) / Math.sqrt(det);
    const intensity =
      brightness * unitFloat(h3) ** scene.STAR_BRIGHTNESS_POWER * peak * Math.exp(-0.5 * q) * keep;
    const T = scene.STAR_T_MIN * (scene.STAR_T_MAX / scene.STAR_T_MIN) ** unitFloat(h4);
    const c = blackbody(T);
    return [c[0] * intensity, c[1] * intensity, c[2] * intensity];
  }

  /** @param {Vec3} dv @param {Vec3} ddx @param {Vec3} ddy @returns {Vec3} */
  function stars(dv, ddx, ddy) {
    /** @type {Vec3} */
    const helper = Math.abs(dv[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const t1 = normalize(cross(helper, dv));
    const t2 = cross(dv, t1);
    const jx = [dot(ddx, t1), dot(ddx, t2)];
    const jy = [dot(ddy, t1), dot(ddy, t2)];
    const s2 = scene.STAR_FILTER_PX * scene.STAR_FILTER_PX;
    const r2 = scene.STAR_RADIUS * scene.STAR_RADIUS;
    /** @type {Vec3} */
    const cov = [
      r2 + s2 * (jx[0] * jx[0] + jy[0] * jy[0]),
      r2 + s2 * (jx[1] * jx[1] + jy[1] * jy[1]),
      s2 * (jx[0] * jx[1] + jy[0] * jy[1]),
    ];
    const c = [0, 0, 0];
    for (const layer of scene.STAR_LAYERS) {
      const s = starLayer(dv, t1, t2, cov, layer);
      c[0] += s[0];
      c[1] += s[1];
      c[2] += s[2];
    }
    return /** @type {Vec3} */ (c);
  }

  /**
   * Premultiplied, sRGB-encoded RGBA of the pixel whose center is at screen
   * offset (sx, sy) device px from the hole (y up). The empty sky is
   * transparent. The shader's optional sparse mode (uSparse: one sample per
   * pixel outside the photon-ring band) is not ported: the preview takes all
   * four samples everywhere.
   *
   * @param {number} sx @param {number} sy
   * @returns {[number, number, number, number]}
   */
  function shadePixel(sx, sy) {
    const dv = skyDirection(sx / d.pxPerM, sy / d.pxPerM);
    // Screen derivatives of the sky direction (forward differences, 1 px).
    const dx1 = skyDirection((sx + 1) / d.pxPerM, sy / d.pxPerM);
    const dy1 = skyDirection(sx / d.pxPerM, (sy + 1) / d.pxPerM);
    /** @type {Vec3} */
    const ddx = [dx1[0] - dv[0], dx1[1] - dv[1], dx1[2] - dv[2]];
    /** @type {Vec3} */
    const ddy = [dy1[0] - dv[0], dy1[1] - dv[1], dy1[2] - dv[2]];
    const rho = Math.hypot(sx, sy);
    if (rho > d.radius) return [0, 0, 0, 0];
    const enc = [0, 0, 0]; // sRGB-encoded, premultiplied by coverage
    let sky = 0;
    let cover = 0; // opaque coverage: the disk, and the shadow
    for (const [ox, oy] of scene.SUPERSAMPLE_OFFSETS) {
      const x = (sx + ox) / d.pxPerM;
      const y = (sy + oy) / d.pxPerM;
      const s = shadeDisk(x, y);
      // Encode each sample's unpremultiplied color, then weight by its coverage.
      if (s[3] > 0) {
        for (let c = 0; c < 3; c++) enc[c] += s[3] * srgbEncode(clamp(s[c] / s[3], 0, 1));
      }
      if (Math.hypot(x, y) >= B_CRIT) {
        sky += 1 - s[3];
        cover += s[3];
      } else {
        cover += 1; // captured: the shadow (or the disk in front of it)
      }
    }
    const ns = scene.SUPERSAMPLE_OFFSETS.length;
    for (let c = 0; c < 3; c++) enc[c] /= ns;
    sky /= ns;
    cover /= ns;
    if (sky > 0) {
      const st = stars(dv, ddx, ddy);
      for (let c = 0; c < 3; c++) enc[c] += sky * srgbEncode(clamp(st[c], 0, 1));
    }
    // Light's alpha is at least its brightest channel, so rgb <= a stays valid.
    const coverage = Math.max(cover, enc[0], enc[1], enc[2]);
    const alpha = d.opacity * (1 - smoothstep((1 - scene.VIEW_EDGE_FADE) * d.radius, d.radius, rho));
    return [enc[0] * alpha, enc[1] * alpha, enc[2] * alpha, coverage * alpha];
  }

  return { shadePixel };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

// Flat backdrop behind the frame: the page's navy night band (--scq4-night-rgb
// in assets/css/style.css), 8-bit sRGB.
const BACKDROP_RGB = [11, 16, 32];

/**
 * Encode a 24-bit BMP (BITMAPINFOHEADER, bottom-up rows, BGR).
 *
 * @param {number} w
 * @param {number} h
 * @param {Uint8Array} rgb top-down RGB rows
 * @returns {Buffer}
 */
function encodeBmp(w, h, rgb) {
  const rowBytes = Math.ceil((3 * w) / 4) * 4;
  const FILE_HEADER = 14;
  const INFO_HEADER = 40;
  const dataSize = rowBytes * h;
  const buf = Buffer.alloc(FILE_HEADER + INFO_HEADER + dataSize);
  buf.write('BM', 0, 'ascii');
  buf.writeUInt32LE(FILE_HEADER + INFO_HEADER + dataSize, 2);
  buf.writeUInt32LE(FILE_HEADER + INFO_HEADER, 10);
  buf.writeUInt32LE(INFO_HEADER, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22); // positive: bottom-up
  buf.writeUInt16LE(1, 26); // planes
  buf.writeUInt16LE(24, 28); // bits per pixel
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(dataSize, 34);
  const PPM = 2835; // 72 dpi
  buf.writeInt32LE(PPM, 38);
  buf.writeInt32LE(PPM, 42);
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 3;
    const dst = FILE_HEADER + INFO_HEADER + y * rowBytes;
    for (let x = 0; x < w; x++) {
      buf[dst + 3 * x] = rgb[src + 3 * x + 2];
      buf[dst + 3 * x + 1] = rgb[src + 3 * x + 1];
      buf[dst + 3 * x + 2] = rgb[src + 3 * x];
    }
  }
  return buf;
}

console.log(`[setup] Output directory: ${outDir}`);
fs.mkdirSync(outDir, { recursive: true });
const tables = scene.buildBlackHoleTables();
console.log(
  `[setup] tables: ${tables.nb} x ${tables.nPhi} geodesics, B_MAX = ${tables.map.bMax.toFixed(3)} M, ` +
    `built in ${tables.buildMs.toFixed(0)} ms; ${size} px frames at ${pxPerM.toFixed(3)} px/M`,
);

const radius = 0.5 * size;
inclinations.forEach((deg, idx) => {
  const t0 = performance.now();
  const { shadePixel } = makeShader(tables, {
    pxPerM,
    radius,
    inclination: (deg * Math.PI) / 180,
    azimuth,
    time,
    opacity: 1,
    exposure,
  });
  const rgb = new Uint8Array(size * size * 3);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Pixel center, as an offset from the hole's center (device px, y up).
      const [r, g, b, a] = shadePixel(px + 0.5 - radius, radius - (py + 0.5));
      const o = 3 * (py * size + px);
      // Premultiplied "over": src + (1 - src alpha) backdrop, on encoded values.
      rgb[o] = Math.round(255 * r + (1 - a) * BACKDROP_RGB[0]);
      rgb[o + 1] = Math.round(255 * g + (1 - a) * BACKDROP_RGB[1]);
      rgb[o + 2] = Math.round(255 * b + (1 - a) * BACKDROP_RGB[2]);
    }
  }
  const base = path.join(outDir, `blackhole-i${deg}-${size}`);
  fs.writeFileSync(`${base}.bmp`, encodeBmp(size, size, rgb));
  let out = `${base}.bmp`;
  try {
    execFileSync('sips', ['-s', 'format', 'png', `${base}.bmp`, '--out', `${base}.png`], { stdio: 'ignore' });
    out = `${base}.png`;
  } catch {
    console.log('[warn]  sips unavailable (macOS only); kept the BMP');
  }
  console.log(`[${idx + 1}/${inclinations.length}] i = ${deg} deg rendered in ${(performance.now() - t0).toFixed(0)} ms`);
  console.log(`[done]  Result saved: ${out}`);
});
