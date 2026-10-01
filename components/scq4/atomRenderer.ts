// Renders the hydrogen electron cloud for the v4 stage.
//
// Every dot carries fixed quasi-random uniforms (u_r, u_c, u_phi). The vertex
// shader maps them through the current state's forward-CDF tables (built on
// the CPU from the exact CDFs in lib/physics/hydrogen.mjs) with a binary
// search per table, so the GPU only does lookups. When the state changes, the
// tables change and the same dots glide to their new places. The Canvas 2D
// fallback runs the same lookups (sampleRadius, sampleCosTheta) in JavaScript
// with fewer dots.
//
// The stage (ScrollStage.tsx) owns the canvases: WebGL scenes draw into an
// OFFSCREEN WebGL2 canvas that is then copied into the visible 2D canvas,
// because some embedded browsers never composite a WebGL canvas that sits in
// the page, while a 2D canvas always shows.

import {
  buildAngularCdfTable,
  buildRadialCdfTable,
  r3Seeds,
  radialQuantile,
  sampleCosTheta,
  sampleRadius,
  type LadderState,
} from '@/lib/physics/hydrogen.mjs';
import { createFloatTexture, createProgram, updateFloatTexture } from '@/lib/webgl';
import {
  ANGULAR_TABLE_COLS,
  ANGULAR_TABLE_ROWS,
  ANGULAR_TOP_OVER_R95,
  RADIAL_TABLE_SIZE,
  RADIAL_TAIL_U,
  SUN_CLOUD_SQUEEZE,
  SUN_COLLAPSE_SPREAD,
  SUN_COLLAPSE_WIDTH,
} from './config';

export interface AtomTables {
  radialCdf: Float32Array; // RADIAL_TABLE_SIZE values of F(r), radii evenly spaced on [0, rMax]
  angularCdf: Float32Array; // ROWS x COLS values of F(cos theta | r), row-major
  rMax: number; // radius of the last radial entry (Bohr radii)
  rTop: number; // radius of the last angular row (Bohr radii)
  r95: number; // 95th-percentile radius (Bohr radii)
}

export function buildTables(st: LadderState): AtomTables {
  const r95 = radialQuantile(st, 0.95);
  const rMax = radialQuantile(st, RADIAL_TAIL_U);
  const rTop = r95 * ANGULAR_TOP_OVER_R95;
  return {
    radialCdf: buildRadialCdfTable(st, RADIAL_TABLE_SIZE, rMax),
    angularCdf: buildAngularCdfTable(st, ANGULAR_TABLE_ROWS, ANGULAR_TABLE_COLS, rTop),
    rMax,
    rTop,
    r95,
  };
}

// Bisection steps that narrow n table entries to one cell.
const searchSteps = (n: number) => Math.ceil(Math.log2(n - 1));

export interface AtomDraw {
  cx: number; // center, device px
  cy: number;
  pxPerBohr: number; // device px per Bohr radius
  rot: Float32Array; // 3x3 atom -> view rotation, column-major
  opacity: number; // 0..1
  collapse: number; // 0..1, how far the cloud has fallen into a sun (inside out)
}

// A dot's shrink factor as the cloud collapses into a sun: its delay grows
// with its radial quantile u (inner dots first). Mirrored in the shader.
export function collapseScale(u: number, collapse: number): number {
  const d = u * SUN_COLLAPSE_SPREAD;
  const x = Math.min(1, Math.max(0, (collapse * (SUN_COLLAPSE_SPREAD + SUN_COLLAPSE_WIDTH) - d) / SUN_COLLAPSE_WIDTH));
  const c = x * x * (3 - 2 * x);
  return 1 + (SUN_CLOUD_SQUEEZE - 1) * c;
}

export interface CloudStyle {
  rgb: [number, number, number]; // 0..255
  alpha: number; // per-dot peak alpha
  additive: boolean; // light-on-dark glow vs ink-on-paper
  dotPx: number; // sprite diameter, device px
}

// WebGL2 scene: draws into the caller's GL context (the caller clears).
export interface AtomGLScene {
  setTables(t: AtomTables): void;
  draw(d: AtomDraw, style: CloudStyle, viewportW: number, viewportH: number): void;
  dispose(): void;
}

// Canvas 2D fallback: draws straight into the visible display context.
export interface AtomCanvasScene {
  setTables(t: AtomTables): void;
  draw(ctx: CanvasRenderingContext2D, d: AtomDraw, style: CloudStyle): void;
}

// View rotation for the atom (M = Elev * Yaw * Tilt), shared with the camera
// checks in scripts/verify-cameras.mjs.
export { atomRotation } from '@/lib/physics/cameras.mjs';

// The lookups mirror sampleRadius and sampleCosTheta (lib/physics/
// hydrogen.mjs) line for line. The loops run a fixed number of halvings;
// once the bracket is one cell wide, further steps leave it unchanged.
const VERTEX_SHADER = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
in vec3 aSeed;
uniform sampler2D uRadial; // F(r_k), r_k = uRMax k / (uRadialN - 1)
uniform sampler2D uAngular; // F(c_j | r_i): width uCols, height uRows
uniform int uRadialN;
uniform int uCols;
uniform int uRows;
uniform float uRMax;
uniform float uRTop;
uniform float uPxPerBohr;
uniform vec2 uCenter;
uniform vec2 uViewport;
uniform mat3 uRot;
uniform float uPointPx;
uniform float uCollapse; // 0..1, the cloud falling into a sun, inside out
out float vDepth;

const int RADIAL_STEPS = ${searchSteps(RADIAL_TABLE_SIZE)};
const int ANGULAR_STEPS = ${searchSteps(ANGULAR_TABLE_COLS)};
const float COLLAPSE_SPREAD = ${SUN_COLLAPSE_SPREAD.toFixed(6)};
const float COLLAPSE_WIDTH = ${SUN_COLLAPSE_WIDTH.toFixed(6)};
const float COLLAPSE_SQUEEZE = ${SUN_CLOUD_SQUEEZE.toFixed(6)};

float radialF(int k) {
  return texelFetch(uRadial, ivec2(k, 0), 0).r;
}

float radiusAt(float u) {
  if (u <= 0.0) return 0.0;
  if (u >= radialF(uRadialN - 1)) return uRMax;
  int lo = 0;
  int hi = uRadialN - 1;
  for (int it = 0; it < RADIAL_STEPS; it++) {
    int mid = (lo + hi) / 2;
    if (radialF(mid) <= u) lo = mid; else hi = mid;
  }
  float f0 = radialF(lo);
  float f1 = radialF(hi);
  float t = f1 > f0 ? (u - f0) / (f1 - f0) : 0.0;
  return (float(lo) + t) * uRMax / float(uRadialN - 1);
}

float angularF(int k, int j0, int j1, float w) {
  return mix(texelFetch(uAngular, ivec2(k, j0), 0).r,
             texelFetch(uAngular, ivec2(k, j1), 0).r, w);
}

float cosThetaAt(float u, float rn) {
  float y = clamp(rn, 0.0, 1.0) * float(uRows - 1);
  int j0 = min(int(floor(y)), uRows - 1);
  int j1 = min(j0 + 1, uRows - 1);
  float w = y - float(j0);
  float uc = clamp(u, 0.0, 1.0);
  int lo = 0;
  int hi = uCols - 1;
  for (int it = 0; it < ANGULAR_STEPS; it++) {
    int mid = (lo + hi) / 2;
    if (angularF(mid, j0, j1, w) <= uc) lo = mid; else hi = mid;
  }
  float f0 = angularF(lo, j0, j1, w);
  float f1 = angularF(hi, j0, j1, w);
  float t = f1 > f0 ? clamp((uc - f0) / (f1 - f0), 0.0, 1.0) : 0.5;
  return -1.0 + 2.0 * (float(lo) + t) / float(uCols - 1);
}

void main() {
  float r = radiusAt(aSeed.x);
  float c = cosThetaAt(aSeed.y, r / uRTop);
  float s = sqrt(max(0.0, 1.0 - c * c));
  float phi = 6.283185307179586 * aSeed.z;
  // Mirror of collapseScale: inner dots (small u_r) fall in first.
  float d = aSeed.x * COLLAPSE_SPREAD;
  float k = smoothstep(d, d + COLLAPSE_WIDTH, uCollapse * (COLLAPSE_SPREAD + COLLAPSE_WIDTH));
  float shrink = mix(1.0, COLLAPSE_SQUEEZE, k);
  vec3 q = uRot * (vec3(r * s * cos(phi), r * s * sin(phi), r * c) * shrink);
  vec2 px = uCenter + vec2(q.x, -q.y) * uPxPerBohr;
  gl_Position = vec4(px.x / uViewport.x * 2.0 - 1.0, 1.0 - px.y / uViewport.y * 2.0, 0.0, 1.0);
  gl_PointSize = uPointPx;
  vDepth = q.z / uRTop;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in float vDepth;
uniform vec3 uColor;
uniform float uAlpha;
out vec4 outColor;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float rr = dot(d, d);
  if (rr > 1.0) discard;
  // Gaussian sprite; the near half of the cloud reads slightly brighter.
  float a = uAlpha * exp(-3.0 * rr) * (0.72 + 0.28 * clamp(vDepth + 0.5, 0.0, 1.0));
  outColor = vec4(uColor * a, a);
}
`;

export function createAtomGL(gl: WebGL2RenderingContext, points: number): AtomGLScene {
  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  const loc = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    radial: loc('uRadial'),
    angular: loc('uAngular'),
    radialN: loc('uRadialN'),
    cols: loc('uCols'),
    rows: loc('uRows'),
    rMax: loc('uRMax'),
    rTop: loc('uRTop'),
    pxPerBohr: loc('uPxPerBohr'),
    center: loc('uCenter'),
    viewport: loc('uViewport'),
    rot: loc('uRot'),
    pointPx: loc('uPointPx'),
    collapse: loc('uCollapse'),
    color: loc('uColor'),
    alpha: loc('uAlpha'),
  };

  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vao || !buffer) throw new Error('[scq4] could not allocate WebGL buffers');
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, r3Seeds(points), gl.STATIC_DRAW);
  const seedLoc = gl.getAttribLocation(program, 'aSeed');
  gl.enableVertexAttribArray(seedLoc);
  gl.vertexAttribPointer(seedLoc, 3, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const radialTex = createFloatTexture(gl, RADIAL_TABLE_SIZE, 1, new Float32Array(RADIAL_TABLE_SIZE));
  const angularTex = createFloatTexture(
    gl,
    ANGULAR_TABLE_COLS,
    ANGULAR_TABLE_ROWS,
    new Float32Array(ANGULAR_TABLE_COLS * ANGULAR_TABLE_ROWS),
  );
  let rTop = 1;
  let rMax = 1;

  return {
    setTables(t) {
      updateFloatTexture(gl, radialTex, RADIAL_TABLE_SIZE, 1, t.radialCdf);
      updateFloatTexture(gl, angularTex, ANGULAR_TABLE_COLS, ANGULAR_TABLE_ROWS, t.angularCdf);
      rTop = t.rTop;
      rMax = t.rMax;
    },
    draw(d, style, viewportW, viewportH) {
      if (d.opacity <= 0.002) return;
      gl.viewport(0, 0, viewportW, viewportH);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, radialTex);
      gl.uniform1i(u.radial, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, angularTex);
      gl.uniform1i(u.angular, 1);
      gl.uniform1i(u.radialN, RADIAL_TABLE_SIZE);
      gl.uniform1i(u.cols, ANGULAR_TABLE_COLS);
      gl.uniform1i(u.rows, ANGULAR_TABLE_ROWS);
      gl.uniform1f(u.rMax, rMax);
      gl.uniform1f(u.rTop, rTop);
      gl.uniform1f(u.pxPerBohr, d.pxPerBohr);
      gl.uniform2f(u.center, d.cx, d.cy);
      gl.uniform2f(u.viewport, viewportW, viewportH);
      gl.uniformMatrix3fv(u.rot, false, d.rot);
      gl.uniform1f(u.pointPx, style.dotPx);
      gl.uniform1f(u.collapse, d.collapse);
      gl.uniform3f(u.color, style.rgb[0] / 255, style.rgb[1] / 255, style.rgb[2] / 255);
      gl.uniform1f(u.alpha, style.alpha * d.opacity);
      gl.enable(gl.BLEND);
      // Premultiplied output: additive glow on dark, "over" ink on paper.
      gl.blendFunc(gl.ONE, style.additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, 0, points);
      gl.bindVertexArray(null);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(radialTex);
      gl.deleteTexture(angularTex);
      gl.deleteProgram(program);
    },
  };
}

export function createAtomCanvas2D(points: number): AtomCanvasScene {
  const seeds = r3Seeds(points);
  let tables: AtomTables | null = null;

  return {
    setTables(t) {
      tables = t;
    },
    draw(ctx, d, style) {
      if (!tables || d.opacity <= 0.002) return;
      const { radialCdf, angularCdf, rMax, rTop } = tables;
      const R = d.rot;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = style.additive ? 'lighter' : 'source-over';
      ctx.fillStyle = `rgb(${style.rgb[0]}, ${style.rgb[1]}, ${style.rgb[2]})`;
      ctx.globalAlpha = Math.min(1, style.alpha * d.opacity * 1.6);
      const size = style.dotPx;
      for (let i = 0; i < points; i++) {
        const r = sampleRadius(radialCdf, rMax, seeds[3 * i]);
        const c = sampleCosTheta(angularCdf, ANGULAR_TABLE_ROWS, ANGULAR_TABLE_COLS, seeds[3 * i + 1], r / rTop);
        const s = Math.sqrt(Math.max(0, 1 - c * c));
        const phi = 2 * Math.PI * seeds[3 * i + 2];
        const shrink = d.collapse > 0 ? collapseScale(seeds[3 * i], d.collapse) : 1;
        const px = r * s * Math.cos(phi) * shrink;
        const py = r * s * Math.sin(phi) * shrink;
        const pz = r * c * shrink;
        const vx = R[0] * px + R[3] * py + R[6] * pz;
        const vy = R[1] * px + R[4] * py + R[7] * pz;
        ctx.fillRect(d.cx + vx * d.pxPerBohr - size / 2, d.cy - vy * d.pxPerBohr - size / 2, size, size);
      }
      ctx.restore();
    },
  };
}
