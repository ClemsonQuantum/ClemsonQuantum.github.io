// Ray-traced Schwarzschild black hole with a thin Page–Thorne accretion disk
// for the v4 stage.
//
// All general relativity is precomputed on the CPU (lib/physics/
// schwarzschild.mjs): photon orbits u(phi; b) traced back from a distant
// observer, their escape angles, the disk's flux profile, and blackbody
// colors (lib/physics/blackbody.mjs). The fragment shader only looks things
// up. For each pixel (screen offset X, Y in units of M):
//   1. b = hypot(X, Y), alpha = atan2(Y, X); the ray's orbital plane holds the
//      observer direction o and s_hat = cos(alpha) e1 + sin(alpha) e2.
//   2. It meets the disk plane at phi_n = phi_0 + n pi (n = 0, 1, 2; Luminet
//      1979); r = 1 / u(phi_n; b) from the table. A crossing with
//      6 <= r <= R_OUT hits the (opaque) disk; image orders are composited
//      front to back, so the n = 1, 2 images show through the ISCO gap and
//      form the thin photon ring.
//   3. A hit shines as a blackbody at T_obs = g T(r), g = sqrt(1 - 3/r) /
//      (1 + Omega b sin i cos alpha): color blackbody(T_obs) and luminance
//      L = Y(T_obs) / Y(T_PEAK), what a camera sees (Luminet 1979 plotted
//      the bolometric (T_obs / T_PEAK)^4, which understates the Doppler
//      contrast in visible light), tone-mapped 1 - exp(-exposure L).
//      Each sample's color is sRGB-encoded on its own and then weighted by
//      its coverage, because 2D compositing blends encoded, premultiplied
//      values (encoding after the weighting would brighten partly covered
//      pixels, such as the disk's faded outer edge).
//   4. Rays that miss: b < b_c fell into the hole (black); b > b_c arrive from
//      the sky direction d = cos(Phi) o + sin(Phi) s_hat, where a procedural
//      star field is looked up in the frame Rz(azimuth) d (increasing azimuth
//      orbits the camera counterclockwise about +z). Each star is a small
//      Gaussian on the sky blurred by the pixel's footprint there (the
//      Jacobian dFdx/dFdy of d), so lensing stretches and dims stars exactly.
//      For an observer at infinity the unlensed sky collapses to the single
//      point -o, so the whole view lies inside that point's Einstein ring:
//      visible stars sit in the outer view and fade (demagnified) toward the
//      shadow.
// scripts/render-blackhole-preview.mjs is a CPU port of this shader (same
// formulas, same tables) used for visual checks.
//
// Lookups: the tables are R32F textures read with texelFetch and
// interpolated by hand (linear filtering of R32F is not guaranteed). The
// geodesic table interpolates w = b u between rows (smooth in b even where
// u ~ 1/b), never across b_c, and never averages a sentinel (captured +1,
// escaped -1) with a live value: the nearest sample wins. Beyond the table
// (b > B_MAX) no disk crossing is possible (periapsis > R_OUT) and the escape
// angle comes from the weak-deflection series.
//
// Disk texture: brightness is modulated by +-20% procedural streaks advected
// exactly with the Keplerian angular velocity, pattern(r, phi - Omega(r) t),
// with phi measured in the hole's frame (the camera azimuth turns the disk
// texture and the stars together).
// Differential rotation would wind any pattern below the pixel scale, so two
// copies run on staggered cycles of FLOW_CYCLE and crossfade (each is
// unsheared at mid-cycle and fresh noise every cycle). The light-travel-time
// delay between pixels is omitted: for a statistically uniform texture it
// only adds a fixed phase per pixel, which changes nothing visible.

import { buildBlackbodyTable, buildLuminanceTable } from '@/lib/physics/blackbody.mjs';
import {
  DISK_R_OUT,
  DISK_T_PEAK,
  R_ISCO,
  WEAK_FIELD_COEFFS,
  buildFluxTable,
  geodesicTableRows,
  type ImpactMap,
} from '@/lib/physics/schwarzschild.mjs';
import { createFloatTexture, startProgram, updateFloatTexture, type PendingProgram } from '@/lib/webgl';

// ---------------------------------------------------------------------------
// Display choices (physics constants live in lib/physics/*.mjs)
// ---------------------------------------------------------------------------

// Blackbody color table: log-spaced temperatures. Below 1000 K the disk is
// invisible anyway ((1000 / 6500)^4 < 6e-4 of the peak intensity).
export const BLACKBODY_T_MIN = 1000; // K
export const BLACKBODY_T_MAX = 40000; // K
export const BLACKBODY_TABLE_SIZE = 256;
// Normalized flux profile F / F_max on [R_ISCO, DISK_R_OUT].
export const FLUX_TABLE_SIZE = 256;

// The disk's opacity ramps from 1 to 0 over its outer DISK_EDGE_FADE (M).
export const DISK_EDGE_FADE = 4;
// The rendered disc's alpha fades to 0 over this outer fraction of its radius.
export const VIEW_EDGE_FADE = 0.15;
// Largest inclination drawn: exactly edge-on, rays in the disk plane are
// degenerate (the disk has zero thickness).
export const INCLINATION_MAX = Math.PI / 2 - 1e-3;
// Four samples per pixel on a rotated grid (device px from the pixel center).
// On dense displays (the caller's `sparse` flag) one centered sample is
// taken, except within RING_BAND_M of b_c, where the higher-order photon
// rings are thinner than a device pixel.
export const RING_BAND_M = 1.5;
export const SUPERSAMPLE_OFFSETS: readonly (readonly [number, number])[] = [
  [-0.375, -0.125],
  [0.125, -0.375],
  [0.375, 0.125],
  [-0.125, 0.375],
];

// Disk flow texture (brightness modulation, not temperature).
export const FLOW_AMPLITUDE = 0.2; // max fractional modulation (+-20%)
export const FLOW_GAIN = 1.8; // noise contrast before clamping to +-1
export const FLOW_CYCLE = 160; // M, one advection cycle (see header)
export const FLOW_AZIMUTH_CELLS = 9; // noise cells around the disk, first octave
export const FLOW_RADIAL_CELLS = 28; // noise cells per e-fold of radius (streaks: long in azimuth)
export const FLOW_OCTAVE_WEIGHTS: readonly [number, number] = [0.65, 0.35];
export const FLOW_SEED = 0x6a09e667;

// Star field: one star per cube-face cell with this probability; each star
// is a Gaussian of angular radius STAR_RADIUS on the sky (conserved surface
// brightness under lensing), blurred by the pixel footprint (STAR_FILTER_PX).
export const STAR_RADIUS = 2.5e-4; // rad
export const STAR_FILTER_PX = 0.5; // px, Gaussian sigma of the anti-aliasing filter
export const STAR_T_MIN = 3000; // K
export const STAR_T_MAX = 12000; // K
export const STAR_CELL_MARGIN = 0.2; // stars sit >= this (cells) from a cell edge
export const STAR_BRIGHTNESS_POWER = 3; // brightness = layer brightness * rand^power
export interface StarLayer {
  cells: number; // cells per cube-face edge
  probability: number; // chance a cell holds a star
  brightness: number; // peak surface brightness (linear sRGB) of the brightest star
  seed: number;
}
export const STAR_LAYERS: readonly StarLayer[] = [
  { cells: 56, probability: 0.3, brightness: 0.45, seed: 0x3c6ef372 },
  { cells: 18, probability: 0.45, brightness: 1.0, seed: 0xa54ff53a },
];

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export interface BlackHoleTables {
  geodesic: Float32Array; // u(phi_k; b_j) at [j * nPhi + k]; +1 captured, -1 escaped
  escape: Float32Array; // nb escape angles Phi(b_j) (rad), -1 for captured rays
  nb: number; // rows; row j sits at b = b(j / (nb - 1)), see `map`
  nPhi: number; // samples per row; sample k sits at phi = k * phiMax / (nPhi - 1)
  phiMax: number; // rad (3 pi)
  map: ImpactMap; // b(s) = b_c + c sinh(k (s - s_c)), s(b) = s_c + asinh((b - b_c) / c) / k
  blackbody: Float32Array; // BLACKBODY_TABLE_SIZE x (r, g, b), linear sRGB, max channel 1
  luminance: Float32Array; // BLACKBODY_TABLE_SIZE values of Y(T) / Y(tPeak), same temperatures
  tMin: number; // K, first blackbody entry; entry k at tMin (tMax / tMin)^(k / (n - 1))
  tMax: number; // K
  flux: Float32Array; // FLUX_TABLE_SIZE samples of F / F_max, uniform in r on [rIn, rOut]
  rIn: number; // M (the ISCO)
  rOut: number; // M (the disk's outer edge)
  tPeak: number; // K, temperature of the hottest ring (display choice)
  buildMs: number; // compute time of the build
}

// The tables built in steps small enough for idle time: one geodesic row per
// step (~0.15 ms on a laptop), then the blackbody and flux tables. Returns
// the finished tables; buildBlackHoleTables drains it at once.
export function* blackHoleTableSteps(): Generator<void, BlackHoleTables, void> {
  const rows = geodesicTableRows();
  let step = rows.next();
  while (!step.done) {
    yield;
    step = rows.next();
  }
  const geo = step.value;
  yield;
  let t0 = performance.now();
  const blackbody = buildBlackbodyTable(BLACKBODY_T_MIN, BLACKBODY_T_MAX, BLACKBODY_TABLE_SIZE);
  let colorMs = performance.now() - t0;
  yield;
  t0 = performance.now();
  const luminance = buildLuminanceTable(BLACKBODY_T_MIN, BLACKBODY_T_MAX, BLACKBODY_TABLE_SIZE, DISK_T_PEAK);
  const flux = buildFluxTable(FLUX_TABLE_SIZE, R_ISCO, DISK_R_OUT);
  colorMs += performance.now() - t0;
  return {
    geodesic: geo.u,
    escape: geo.escape,
    nb: geo.nb,
    nPhi: geo.nPhi,
    phiMax: geo.phiMax,
    map: geo.map,
    blackbody,
    luminance,
    tMin: BLACKBODY_T_MIN,
    tMax: BLACKBODY_T_MAX,
    flux,
    rIn: R_ISCO,
    rOut: DISK_R_OUT,
    tPeak: DISK_T_PEAK,
    buildMs: geo.buildMs + colorMs,
  };
}

export function buildBlackHoleTables(): BlackHoleTables {
  const steps = blackHoleTableSteps();
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

// ---------------------------------------------------------------------------
// Hashing and flow phases, shared with the shader (same bits in GLSL)
// ---------------------------------------------------------------------------

// PCG hash (Jarzynski & Olano, "Hash Functions for GPU Rendering", JCGT 9(3),
// 2020). Integer-exact, so GLSL and JavaScript agree bit for bit.
export function pcgHash(v: number): number {
  const state = (Math.imul(v >>> 0, 747796405) + 2891336453) >>> 0;
  const word = Math.imul(((state >>> ((state >>> 28) + 4)) ^ state) >>> 0, 277803737) >>> 0;
  return ((word >>> 22) ^ word) >>> 0;
}

export function hash3(a: number, b: number, c: number): number {
  return pcgHash((a + pcgHash((b + pcgHash(c)) >>> 0)) >>> 0);
}

// Top 24 bits as a float in [0, 1): exact in float32, so identical on the GPU.
export function unitFloat(h: number): number {
  return (h >>> 8) / 16777216;
}

export interface FlowPhases {
  tau: [number, number]; // M since each copy's mid-cycle (pattern unsheared at 0)
  weight: [number, number]; // crossfade weights, normalized so w0^2 + w1^2 = 1
  seed: [number, number]; // noise seed of each copy's current cycle
}

// Two copies of the flow pattern on cycles staggered by half a cycle; the
// triangle weights sum to 1, and dividing by sqrt(w0^2 + w1^2) keeps the
// blend's contrast constant. Computed in double precision on the CPU so long
// run times never lose float32 precision on the GPU.
export function flowPhases(time: number): FlowPhases {
  const tau: [number, number] = [0, 0];
  const raw: [number, number] = [0, 0];
  const seed: [number, number] = [0, 0];
  for (let k = 0; k < 2; k++) {
    const tk = time + 0.5 * k * FLOW_CYCLE;
    const cycle = Math.floor(tk / FLOW_CYCLE);
    const t = tk - cycle * FLOW_CYCLE;
    tau[k] = t - 0.5 * FLOW_CYCLE;
    raw[k] = 1 - Math.abs((2 * t) / FLOW_CYCLE - 1);
    seed[k] = hash3(cycle | 0, k, FLOW_SEED);
  }
  const norm = Math.hypot(raw[0], raw[1]);
  return { tau, weight: [raw[0] / norm, raw[1] / norm], seed };
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

// GLSL float literal (always with a decimal point or exponent).
function glf(x: number): string {
  const s = String(x);
  return /[.eE]/.test(s) ? s : `${s}.0`;
}

const VERTEX_SHADER = `#version 300 es
precision highp float;
uniform vec2 uViewport; // device px
uniform vec2 uCenter; // device px, origin top-left
uniform float uRadius; // device px
out vec2 vScreen; // offset from the hole's center, device px, y up
void main() {
  // Triangle strip over the view circle's bounding square.
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  vScreen = corner * uRadius;
  vec2 px = uCenter + vec2(vScreen.x, -vScreen.y);
  gl_Position = vec4(px.x / uViewport.x * 2.0 - 1.0, 1.0 - px.y / uViewport.y * 2.0, 0.0, 1.0);
}
`;

const SAMPLES = SUPERSAMPLE_OFFSETS.length;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

in vec2 vScreen;
out vec4 outColor;

uniform sampler2D uGeodesic; // u(phi; b): width nPhi, height nb
uniform sampler2D uEscape; // Phi(b): width nb
uniform sampler2D uBlackbody; // linear sRGB triplets: width 3 nT
uniform sampler2D uLuminance; // Y(T) / Y(T_PEAK): width nT, same temperatures
uniform sampler2D uFlux; // F / F_max: width nF
uniform vec4 uImpactMap; // (b_c, c, k, s_c)
uniform float uJCrit; // s_c (nb - 1), the half-integer row of b_c
uniform float uBMax; // M
uniform float uPhiMax; // rad
uniform vec2 uLogT; // (ln tMin, ln tMax) of the blackbody table
uniform vec2 uDiskR; // (r_in, r_out) of the flux table, M
uniform float uTPeak; // K
uniform float uPxPerM;
uniform float uRadius; // device px
uniform vec2 uIncl; // (sin i, cos i)
uniform vec2 uAzimuth; // (cos az, sin az)
uniform vec2 uFlowTau; // M since mid-cycle, per copy
uniform vec2 uFlowWeight; // normalized crossfade weights
uniform uvec2 uFlowSeed;
uniform float uOpacity;
uniform float uExposure;
uniform bool uSparse; // one sample per pixel outside the photon-ring band

const float PI = 3.141592653589793;
const float TWO_PI = 6.283185307179586;
const float R_ISCO = ${glf(R_ISCO)};
const float B_EPS = 1e-6;
const float DISK_EDGE_FADE = ${glf(DISK_EDGE_FADE)};
const float VIEW_EDGE_FADE = ${glf(VIEW_EDGE_FADE)};
const float FLOW_AMPLITUDE = ${glf(FLOW_AMPLITUDE)};
const float FLOW_GAIN = ${glf(FLOW_GAIN)};
const float FLOW_AZIMUTH_CELLS = ${glf(FLOW_AZIMUTH_CELLS)};
const float FLOW_RADIAL_CELLS = ${glf(FLOW_RADIAL_CELLS)};
const float FLOW_W0 = ${glf(FLOW_OCTAVE_WEIGHTS[0])};
const float FLOW_W1 = ${glf(FLOW_OCTAVE_WEIGHTS[1])};
const float STAR_RADIUS = ${glf(STAR_RADIUS)};
const float STAR_FILTER_PX = ${glf(STAR_FILTER_PX)};
const float STAR_T_MIN = ${glf(STAR_T_MIN)};
const float STAR_T_MAX = ${glf(STAR_T_MAX)};
const float STAR_CELL_MARGIN = ${glf(STAR_CELL_MARGIN)};
const float STAR_BRIGHTNESS_POWER = ${glf(STAR_BRIGHTNESS_POWER)};
const int SAMPLES = ${SAMPLES};
const float RING_BAND = ${glf(RING_BAND_M)};
const vec2 SS_OFFSETS[${SAMPLES}] = vec2[${SAMPLES}](${SUPERSAMPLE_OFFSETS.map(([x, y]) => `vec2(${glf(x)}, ${glf(y)})`).join(', ')});

// ---- hashing: PCG (Jarzynski & Olano 2020), bit-identical to the CPU ----
uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
uint hash3(uint a, uint b, uint c) { return pcg(a + pcg(b + pcg(c))); }
float unitFloat(uint h) { return float(h >> 8u) * (1.0 / 16777216.0); }

// ---- impact-parameter grid: s(b) = s_c + asinh((b - b_c) / c) / k ----
float asinhStable(float x) {
  float a = abs(x);
  return sign(x) * log(a + sqrt(a * a + 1.0));
}
float sOfB(float b) {
  return uImpactMap.w + asinhStable((b - uImpactMap.x) / uImpactMap.y) / uImpactMap.z;
}
float bOfRow(int j, float nbm1) {
  return max(0.0, uImpactMap.x + uImpactMap.y * sinh(uImpactMap.z * (float(j) / nbm1 - uImpactMap.w)));
}

// ---- geodesic table ----
bool isLive(float u) { return u > -0.5 && u < 0.75; }

float rowU(int j, int i0, float fx) {
  float a = texelFetch(uGeodesic, ivec2(i0, j), 0).r;
  float c = texelFetch(uGeodesic, ivec2(i0 + 1, j), 0).r;
  if (isLive(a) && isLive(c)) return mix(a, c, fx);
  return fx < 0.5 ? a : c;
}

// u at sweep angle phi for impact parameter b (row coordinate y). Live values
// interpolate w = b u between rows; sentinels pass through, never averaged.
float geodesicU(float phi, float b, float y) {
  ivec2 size = textureSize(uGeodesic, 0);
  float x = clamp(phi / uPhiMax, 0.0, 1.0) * float(size.x - 1);
  int i0 = min(int(x), size.x - 2);
  float fx = x - float(i0);
  float nbm1 = float(size.y - 1);
  float yc = clamp(y, 0.0, nbm1);
  int j0 = min(int(yc), size.y - 2);
  int j1 = j0 + 1;
  float fy = yc - float(j0);
  // Never mix a captured row with an escaping one.
  if (yc >= uJCrit && float(j0) < uJCrit) { j0 = j1; fy = 0.0; }
  else if (yc < uJCrit && float(j1) > uJCrit) { j1 = j0; fy = 0.0; }
  float u0 = rowU(j0, i0, fx);
  float u1 = rowU(j1, i0, fx);
  if (isLive(u0) && isLive(u1)) return mix(bOfRow(j0, nbm1) * u0, bOfRow(j1, nbm1) * u1, fy) / b;
  bool nearFirst = fy < 0.5;
  float un = nearFirst ? u0 : u1;
  return isLive(un) ? bOfRow(nearFirst ? j0 : j1, nbm1) * un / b : un;
}

// Escape angle Phi(b); -1 inside the shadow.
float sweepAngle(float b) {
  if (b >= uBMax) {
    float x = 1.0 / b;
    return PI + x * (${glf(WEAK_FIELD_COEFFS[0])} + x * (${glf(WEAK_FIELD_COEFFS[1])} + x * (${glf(
      WEAK_FIELD_COEFFS[2],
    )} + x * (${glf(WEAK_FIELD_COEFFS[3])} + x * ${glf(WEAK_FIELD_COEFFS[4])}))));
  }
  int nb = textureSize(uEscape, 0).x;
  float y = clamp(sOfB(b), 0.0, 1.0) * float(nb - 1);
  int j0 = min(int(y), nb - 2);
  float p0 = texelFetch(uEscape, ivec2(j0, 0), 0).r;
  float p1 = texelFetch(uEscape, ivec2(j0 + 1, 0), 0).r;
  if (p0 > 0.0 && p1 > 0.0) return mix(p0, p1, y - float(j0));
  return max(p0, p1); // next to b_c: the escaping neighbour (captured rows hold -1)
}

// ---- disk ----
float fluxAt(float r) {
  int n = textureSize(uFlux, 0).x;
  float x = clamp((r - uDiskR.x) / (uDiskR.y - uDiskR.x), 0.0, 1.0) * float(n - 1);
  int i = min(int(x), n - 2);
  return mix(texelFetch(uFlux, ivec2(i, 0), 0).r, texelFetch(uFlux, ivec2(i + 1, 0), 0).r, x - float(i));
}

vec3 bbTexel(int i) {
  return vec3(texelFetch(uBlackbody, ivec2(3 * i, 0), 0).r,
              texelFetch(uBlackbody, ivec2(3 * i + 1, 0), 0).r,
              texelFetch(uBlackbody, ivec2(3 * i + 2, 0), 0).r);
}

// Linear sRGB chromaticity of a blackbody at T (max channel 1).
vec3 blackbody(float T) {
  int n = textureSize(uBlackbody, 0).x / 3;
  float x = clamp((log(max(T, 1.0)) - uLogT.x) / (uLogT.y - uLogT.x), 0.0, 1.0) * float(n - 1);
  int i = min(int(x), n - 2);
  return mix(bbTexel(i), bbTexel(i + 1), x - float(i));
}

// Luminance of a blackbody at T relative to one at T_PEAK. Interpolated in
// log Y, where it is nearly linear in log T.
float luminance(float T) {
  int n = textureSize(uLuminance, 0).x;
  float x = clamp((log(max(T, 1.0)) - uLogT.x) / (uLogT.y - uLogT.x), 0.0, 1.0) * float(n - 1);
  int i = min(int(x), n - 2);
  float y0 = log(max(texelFetch(uLuminance, ivec2(i, 0), 0).r, 1e-30));
  float y1 = log(max(texelFetch(uLuminance, ivec2(i + 1, 0), 0).r, 1e-30));
  return exp(mix(y0, y1, x - float(i)));
}

// Value noise on an integer lattice, periodic in x with the given period.
float valueNoise(vec2 p, float period, uint seed) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  uint x0 = uint(mod(i.x, period));
  uint x1 = uint(mod(i.x + 1.0, period));
  uint y0 = uint(i.y);
  uint y1 = y0 + 1u;
  float v00 = unitFloat(hash3(x0, y0, seed));
  float v10 = unitFloat(hash3(x1, y0, seed));
  float v01 = unitFloat(hash3(x0, y1, seed));
  float v11 = unitFloat(hash3(x1, y1, seed));
  return 2.0 * mix(mix(v00, v10, w.x), mix(v01, v11, w.x), w.y) - 1.0;
}

// Brightness modulation 1 +- FLOW_AMPLITUDE, advected with the gas.
float flowModulation(float r, float phiDisk, float omega) {
  float lr = log(r) * FLOW_RADIAL_CELLS;
  float sum = 0.0;
  for (int k = 0; k < 2; k++) {
    float psi = phiDisk - omega * uFlowTau[k];
    float x = psi / TWO_PI * FLOW_AZIMUTH_CELLS;
    uint seed = uFlowSeed[k];
    sum += uFlowWeight[k] * (FLOW_W0 * valueNoise(vec2(x, lr), FLOW_AZIMUTH_CELLS, seed)
                           + FLOW_W1 * valueNoise(vec2(2.0 * x, 2.0 * lr), 2.0 * FLOW_AZIMUTH_CELLS, pcg(seed)));
  }
  return 1.0 + FLOW_AMPLITUDE * clamp(FLOW_GAIN * sum, -1.0, 1.0);
}

// Tone-mapped linear color of the disk at radius r seen along (b, cos alpha).
vec3 diskColor(float r, float b, float cosAlpha, float phiDisk) {
  float omega = pow(r, -1.5);
  float g = sqrt(1.0 - 3.0 / r) / (1.0 + omega * b * uIncl.x * cosAlpha);
  float f = fluxAt(r);
  float tObs = g * uTPeak * sqrt(sqrt(f));
  float lum = luminance(tObs) * flowModulation(r, phiDisk, omega);
  return blackbody(tObs) * (1.0 - exp(-uExposure * lum));
}

// Disk crossings of one sample, front to back over image orders 0, 1, 2:
// rgb = tone-mapped linear color (premultiplied by coverage), a = coverage.
vec4 shadeDisk(vec2 xy, vec3 O, vec3 E1, vec3 E2) {
  float b = length(xy);
  if (b >= uBMax) return vec4(0.0); // periapsis > R_OUT: no crossing can hit
  b = max(b, B_EPS);
  float ca = xy.x / b;
  float sa = xy.y / b;
  vec3 sHat = ca * E1 + sa * E2;
  // phi_0 = arccos(-sin(a) sin(i) / sqrt(cos^2 i + sin^2 a sin^2 i)) (Luminet 1979)
  float phi0 = atan(sa * uIncl.x, uIncl.y) + 0.5 * PI;
  float y = sOfB(b) * float(textureSize(uGeodesic, 0).y - 1);
  vec4 acc = vec4(0.0);
  for (int n = 0; n < 3; n++) {
    float phi = phi0 + float(n) * PI;
    float u = geodesicU(phi, b, y);
    if (!isLive(u)) break; // captured or escaped before this crossing
    if (u > 1.0 / R_ISCO || u < 1.0 / uDiskR.y) continue; // through the gap or past the edge
    float r = 1.0 / u;
    vec3 nrm = cos(phi) * O + sin(phi) * sHat;
    // Azimuth of the crossing in the hole's frame: Rz(azimuth) of the view
    // frame, as for the stars.
    vec2 nh = vec2(uAzimuth.x * nrm.x - uAzimuth.y * nrm.y, uAzimuth.y * nrm.x + uAzimuth.x * nrm.y);
    float a = 1.0 - smoothstep(uDiskR.y - DISK_EDGE_FADE, uDiskR.y, r);
    vec3 c = diskColor(r, b, ca, atan(nh.y, nh.x));
    acc.rgb += (1.0 - acc.a) * a * c;
    acc.a += (1.0 - acc.a) * a;
  }
  return acc;
}

// ---- sky ----
// Arrival direction of the ray through xy, in the star field's frame.
vec3 skyDirection(vec2 xy, vec3 O, vec3 E1, vec3 E2) {
  float b = max(length(xy), B_EPS);
  vec3 sHat = (xy.x * E1 + xy.y * E2) / b;
  float phi = sweepAngle(b);
  vec3 d = cos(phi) * O + sin(phi) * sHat;
  // Star-field frame = Rz(azimuth) * view frame (the camera orbits the hole).
  return vec3(uAzimuth.x * d.x - uAzimuth.y * d.y, uAzimuth.y * d.x + uAzimuth.x * d.y, d.z);
}

vec3 faceDirection(uint face, vec2 uv) {
  if (face == 0u) return vec3(1.0, uv.x, uv.y);
  if (face == 1u) return vec3(-1.0, uv.x, uv.y);
  if (face == 2u) return vec3(uv.x, 1.0, uv.y);
  if (face == 3u) return vec3(uv.x, -1.0, uv.y);
  if (face == 4u) return vec3(uv.x, uv.y, 1.0);
  return vec3(uv.x, uv.y, -1.0);
}

// One layer of stars: at most one per cube-face cell. cov = (m00, m11, m01)
// is the star's Gaussian (angular radius STAR_RADIUS) convolved with the
// pixel footprint, in the tangent basis (t1, t2) at d; the peak scales as
// STAR_RADIUS^2 / sqrt(det cov), which conserves each star's flux.
vec3 starLayer(vec3 d, vec3 t1, vec3 t2, vec3 cov, float cells, float probability, float brightness, uint seed) {
  vec3 a = abs(d);
  uint face;
  vec2 uv;
  if (a.x >= a.y && a.x >= a.z) { face = d.x > 0.0 ? 0u : 1u; uv = d.yz / a.x; }
  else if (a.y >= a.z) { face = d.y > 0.0 ? 2u : 3u; uv = d.xz / a.y; }
  else { face = d.z > 0.0 ? 4u : 5u; uv = d.xy / a.z; }
  vec2 cell = floor(clamp((uv * 0.5 + 0.5) * cells, vec2(0.0), vec2(cells - 1e-3)));
  uint h = hash3(face + seed, uint(cell.x), uint(cell.y));
  if (unitFloat(h) >= probability) return vec3(0.0);
  uint h1 = pcg(h);
  uint h2 = pcg(h1);
  uint h3 = pcg(h2);
  uint h4 = pcg(h3);
  vec2 jitter = STAR_CELL_MARGIN + (1.0 - 2.0 * STAR_CELL_MARGIN) * vec2(unitFloat(h1), unitFloat(h2));
  vec3 dStar = normalize(faceDirection(face, (cell + jitter) / cells * 2.0 - 1.0));
  vec3 delta = dStar - d;
  vec2 e = vec2(dot(delta, t1), dot(delta, t2));
  float det = cov.x * cov.y - cov.z * cov.z;
  float q = (cov.y * e.x * e.x - 2.0 * cov.z * e.x * e.y + cov.x * e.y * e.y) / det;
  // Fade stars whose blurred image would spill past their cell's margin.
  float spread = 3.0 * sqrt(0.5 * (cov.x + cov.y)) * cells * 0.5;
  float keep = 1.0 - smoothstep(0.5 * STAR_CELL_MARGIN, STAR_CELL_MARGIN, spread);
  float peak = STAR_RADIUS * STAR_RADIUS / sqrt(det);
  float intensity = brightness * pow(unitFloat(h3), STAR_BRIGHTNESS_POWER) * peak * exp(-0.5 * q) * keep;
  float T = STAR_T_MIN * pow(STAR_T_MAX / STAR_T_MIN, unitFloat(h4));
  return blackbody(T) * intensity;
}

vec3 stars(vec3 d, vec3 ddx, vec3 ddy) {
  vec3 helper = abs(d.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(helper, d));
  vec3 t2 = cross(d, t1);
  vec2 jx = vec2(dot(ddx, t1), dot(ddx, t2));
  vec2 jy = vec2(dot(ddy, t1), dot(ddy, t2));
  float s2 = STAR_FILTER_PX * STAR_FILTER_PX;
  float r2 = STAR_RADIUS * STAR_RADIUS;
  vec3 cov = vec3(r2 + s2 * (jx.x * jx.x + jy.x * jy.x),
                  r2 + s2 * (jx.y * jx.y + jy.y * jy.y),
                  s2 * (jx.x * jx.y + jy.x * jy.y));
  vec3 c = vec3(0.0);
${STAR_LAYERS.map(
  (l) =>
    `  c += starLayer(d, t1, t2, cov, ${glf(l.cells)}, ${glf(l.probability)}, ${glf(l.brightness)}, ${l.seed >>> 0}u);`,
).join('\n')}
  return c;
}

vec3 srgbEncode(vec3 c) {
  vec3 lo = 12.92 * c;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(0.0031308, c));
}

void main() {
  vec3 O = vec3(uIncl.x, 0.0, uIncl.y);
  vec3 E1 = vec3(0.0, 1.0, 0.0);
  vec3 E2 = vec3(-uIncl.y, 0.0, uIncl.x);
  // Sky direction at the pixel center and its screen derivatives, taken
  // before any branch so they are defined across the whole 2x2 quad.
  vec3 d = skyDirection(vScreen / uPxPerM, O, E1, E2);
  vec3 ddx = dFdx(d);
  vec3 ddy = dFdy(d);
  float rho = length(vScreen);
  if (rho > uRadius) discard;

  bool full = !uSparse || abs(rho / uPxPerM - uImpactMap.x) < RING_BAND;
  int n = full ? SAMPLES : 1;
  vec3 enc = vec3(0.0); // sRGB-encoded, premultiplied by coverage
  float sky = 0.0;
  float cover = 0.0; // opaque coverage: the disk, and the shadow
  for (int k = 0; k < SAMPLES; k++) {
    if (k >= n) break;
    vec2 xy = (vScreen + (full ? SS_OFFSETS[k] : vec2(0.0))) / uPxPerM;
    vec4 s = shadeDisk(xy, O, E1, E2);
    if (s.a > 0.0) enc += s.a * srgbEncode(clamp(s.rgb / s.a, 0.0, 1.0));
    if (length(xy) >= uImpactMap.x) {
      sky += 1.0 - s.a; // escaping and not blocked by the disk
      cover += s.a;
    } else {
      cover += 1.0; // captured: the black shadow (or disk in front of it)
    }
  }
  enc /= float(n);
  sky /= float(n);
  cover /= float(n);
  if (sky > 0.0) enc += sky * srgbEncode(clamp(stars(d, ddx, ddy), 0.0, 1.0));
  // The empty sky is left transparent so the page's night band shows through
  // as the sky: only light (disk, stars) and the shadow are drawn. Giving
  // light an alpha of its brightest channel keeps the output a valid
  // premultiplied color (rgb <= a), which 2D compositing requires. (The CPU
  // preview script composites the same output over the navy night band.)
  float coverage = max(cover, max(enc.r, max(enc.g, enc.b)));
  float alpha = uOpacity * (1.0 - smoothstep((1.0 - VIEW_EDGE_FADE) * uRadius, uRadius, rho));
  outColor = vec4(enc * alpha, coverage * alpha);
}
`;

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export interface BlackHoleDraw {
  viewportW: number; // drawing buffer size, device px
  viewportH: number;
  cx: number; // center of the hole, device px, origin top-left
  cy: number;
  pxPerM: number; // device px per M on the image plane
  viewRadiusPx: number; // radius of the rendered disc; alpha fades to 0 over the outer 15%
  inclination: number; // rad, 0 face-on; clamped to [0, INCLINATION_MAX]
  azimuth: number; // rad, camera orbit about the hole's axis (stars and disk texture)
  time: number; // coordinate time in units of M (disk flow)
  opacity: number; // 0..1, multiplies output alpha
  exposure: number; // tone-map exposure
  sparse: boolean; // one sample per pixel outside the photon-ring band (dense displays)
}

export interface BlackHoleScene {
  setTables(t: BlackHoleTables): void;
  draw(d: BlackHoleDraw): void;
  dispose(): void;
}

interface TableTexture {
  tex: WebGLTexture;
  w: number;
  h: number;
}

const DRAW_FIELDS: readonly (keyof BlackHoleDraw)[] = [
  'viewportW',
  'viewportH',
  'cx',
  'cy',
  'pxPerM',
  'viewRadiusPx',
  'inclination',
  'azimuth',
  'time',
  'opacity',
  'exposure',
];

// Compile and link the ray tracer without blocking (lib/webgl.ts
// startProgram); pass the linked program to createBlackHoleScene.
export function startBlackHoleProgram(gl: WebGL2RenderingContext): PendingProgram {
  return startProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
}

export function createBlackHoleScene(gl: WebGL2RenderingContext, program: WebGLProgram): BlackHoleScene {
  const loc = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    viewport: loc('uViewport'),
    center: loc('uCenter'),
    radius: loc('uRadius'),
    geodesic: loc('uGeodesic'),
    escape: loc('uEscape'),
    blackbody: loc('uBlackbody'),
    luminance: loc('uLuminance'),
    flux: loc('uFlux'),
    impactMap: loc('uImpactMap'),
    jCrit: loc('uJCrit'),
    bMax: loc('uBMax'),
    phiMax: loc('uPhiMax'),
    logT: loc('uLogT'),
    diskR: loc('uDiskR'),
    tPeak: loc('uTPeak'),
    pxPerM: loc('uPxPerM'),
    incl: loc('uIncl'),
    azimuth: loc('uAzimuth'),
    flowTau: loc('uFlowTau'),
    flowWeight: loc('uFlowWeight'),
    flowSeed: loc('uFlowSeed'),
    opacity: loc('uOpacity'),
    exposure: loc('uExposure'),
    sparse: loc('uSparse'),
  };
  // No attributes: the vertex shader builds the quad from gl_VertexID.
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('[scq4] could not allocate the black hole VAO');

  // Only the scalars are kept after upload; the 2 MB arrays live on the GPU.
  let tables: Omit<BlackHoleTables, 'geodesic' | 'escape' | 'blackbody' | 'luminance' | 'flux'> | null = null;
  const textures: Record<'geodesic' | 'escape' | 'blackbody' | 'luminance' | 'flux', TableTexture | null> = {
    geodesic: null,
    escape: null,
    blackbody: null,
    luminance: null,
    flux: null,
  };

  function upload(key: keyof typeof textures, w: number, h: number, data: Float32Array) {
    if (data.length !== w * h) {
      throw new RangeError(`[scq4] black hole ${key} table has ${data.length} entries, expected ${w} x ${h}`);
    }
    const current = textures[key];
    if (current && current.w === w && current.h === h) {
      updateFloatTexture(gl, current.tex, w, h, data);
      return;
    }
    if (current) gl.deleteTexture(current.tex);
    textures[key] = { tex: createFloatTexture(gl, w, h, data), w, h };
  }

  function bind(unit: number, key: keyof typeof textures, location: WebGLUniformLocation | null) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, textures[key]?.tex ?? null);
    gl.uniform1i(location, unit);
  }

  return {
    setTables(t) {
      upload('geodesic', t.nPhi, t.nb, t.geodesic);
      upload('escape', t.nb, 1, t.escape);
      upload('blackbody', t.blackbody.length, 1, t.blackbody);
      upload('luminance', t.luminance.length, 1, t.luminance);
      upload('flux', t.flux.length, 1, t.flux);
      const { geodesic, escape, blackbody, luminance, flux, ...scalars } = t;
      void geodesic;
      void escape;
      void blackbody;
      void luminance;
      void flux;
      tables = scalars;
    },
    draw(d) {
      const bad = DRAW_FIELDS.filter((key) => !Number.isFinite(d[key]));
      if (bad.length) {
        throw new RangeError(`[scq4] black hole draw: non-finite ${bad.map((k) => `${k}=${d[k]}`).join(', ')}`);
      }
      if (!tables || d.opacity <= 0.002 || d.viewRadiusPx <= 0 || d.pxPerM <= 0) return;
      const incl = Math.min(INCLINATION_MAX, Math.max(0, d.inclination));
      const flow = flowPhases(d.time);
      const { map } = tables;

      gl.viewport(0, 0, d.viewportW, d.viewportH);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      bind(0, 'geodesic', u.geodesic);
      bind(1, 'escape', u.escape);
      bind(2, 'blackbody', u.blackbody);
      bind(3, 'flux', u.flux);
      bind(4, 'luminance', u.luminance);
      gl.uniform2f(u.viewport, d.viewportW, d.viewportH);
      gl.uniform2f(u.center, d.cx, d.cy);
      gl.uniform1f(u.radius, d.viewRadiusPx);
      gl.uniform4f(u.impactMap, map.bCrit, map.core, map.k, map.sCrit);
      gl.uniform1f(u.jCrit, map.jCrit);
      gl.uniform1f(u.bMax, map.bMax);
      gl.uniform1f(u.phiMax, tables.phiMax);
      gl.uniform2f(u.logT, Math.log(tables.tMin), Math.log(tables.tMax));
      gl.uniform2f(u.diskR, tables.rIn, tables.rOut);
      gl.uniform1f(u.tPeak, tables.tPeak);
      gl.uniform1f(u.pxPerM, d.pxPerM);
      gl.uniform2f(u.incl, Math.sin(incl), Math.cos(incl));
      gl.uniform2f(u.azimuth, Math.cos(d.azimuth), Math.sin(d.azimuth));
      gl.uniform2f(u.flowTau, flow.tau[0], flow.tau[1]);
      gl.uniform2f(u.flowWeight, flow.weight[0], flow.weight[1]);
      gl.uniform2ui(u.flowSeed, flow.seed[0], flow.seed[1]);
      gl.uniform1f(u.opacity, Math.min(1, d.opacity));
      gl.uniform1f(u.exposure, d.exposure);
      gl.uniform1i(u.sparse, d.sparse ? 1 : 0);
      gl.enable(gl.BLEND);
      // Premultiplied output composited "over" whatever the caller drew.
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);
    },
    dispose() {
      for (const key of Object.keys(textures) as (keyof typeof textures)[]) {
        const t = textures[key];
        if (t) gl.deleteTexture(t.tex);
        textures[key] = null;
      }
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      tables = null;
    },
  };
}
