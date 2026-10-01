// @ts-check
/**
 * Physics checks for lib/physics/schwarzschild.mjs and lib/physics/blackbody.mjs
 * (the v4 page's black hole). Run: node scripts/verify-blackhole.mjs
 *
 * Checks, in geometrized units G = c = M = 1:
 *  1. Tables: sizes, the impact-parameter map's round trip, cold build time.
 *  2. Capture threshold: b = b_c (1 - 1e-3) is captured, b_c (1 + 1e-3) escapes.
 *  3. Deflection: the tabulated escape angle Phi(b) against an independent
 *     quadrature of the orbit integral (below), relative error of Phi - pi
 *     < 1e-5 for every row with b >= 8.
 *  4. Weak field: (Phi - pi) b / 4 -> 1, and the series used beyond B_MAX.
 *  5. Page–Thorne flux: F(6) = 0, positivity, the closed form against
 *     quadrature of Page & Thorne's integral form, the large-r limit, and the
 *     location of the maximum.
 *  6. Redshift convention (screen-right recedes) and the disk-crossing angle.
 *  7. Blackbody colors: 6504 K within 0.01 of D65; 1500 K red; 20000 K blue.
 *  8. Table sanity: sentinels, monotonicity, periapsis, loud failures.
 *  9. Strong deflection (Bozza 2002): just outside the photon ring,
 *     Phi + ln(b/b_c - 1) -> ln[216 (7 - 4 sqrt 3)]; and the table built one
 *     row at a time (geodesicTableRows, as the stage does in idle time) is
 *     bit-identical to the one-shot build.
 * 10. Luminance: Y(T) / Y(T_peak) is 1 at T_peak and rises with T, with
 *     d ln Y / d ln T ~ 5.73, 4.07, 3.22 at 4500, 6500, 8500 K (what the
 *     disk's visual brightness follows, instead of the bolometric T^4).
 * Fails loudly (non-zero exit) on the first violation.
 *
 * Orbit integral. For b > b_c the ray turns at u_2, the smallest positive root
 * of P(u) = 1/b^2 - u^2 + 2u^3 = 2 (u - u_1)(u_2 - u)(u_3 - u), u_1 < 0 < u_2 < u_3,
 * and by symmetry Phi = 2 int_0^{u_2} du / sqrt(P(u)). With u = u_2 (1 - t^2),
 * du = -2 u_2 t dt and u_2 - u = u_2 t^2, the endpoint singularity cancels:
 *   Phi = 2 int_0^1 sqrt(2 u_2) dt / sqrt((u - u_1)(u_3 - u)),
 * a smooth integrand, done with composite Gauss–Legendre. u_1 and u_3 come from
 * deflating the cubic: 2u^3 - u^2 + 1/b^2 = (u - u_2)(2u^2 + (2u_2 - 1) u + 2u_2^2 - u_2).
 *
 * Page–Thorne integral form. For a = 0 in the equatorial plane,
 * F = (1 / (4 pi r)) (-Omega') / (E - Omega L)^2 int_6^r (E - Omega L) L' dr, with
 * E = (1 - 2/r)/sqrt(1 - 3/r), L = r/sqrt(r - 3), Omega = r^(-3/2). Then
 * E - Omega L = sqrt(1 - 3/r), L' = (r - 6)/(2 (r - 3)^(3/2)), so
 *   F = 3/(8 pi) I(r) / (r^(5/2) (r - 3)),  I(r) = int_6^r (s - 6) / (2 sqrt(s) (s - 3)) ds,
 * which the closed form must reproduce (substituting s = y^2 gives it exactly).
 */

import assert from 'node:assert/strict';

import {
  blackbodyChromaticity,
  blackbodyRGB,
  blackbodyTableTemperature,
  blackbodyXYZ,
  buildBlackbodyTable,
  buildLuminanceTable,
  planckRadiance,
} from '../lib/physics/blackbody.mjs';
import {
  B_CRIT,
  DISK_R_OUT,
  FLUX_ASYMPTOTIC_C,
  GEODESIC_NB,
  GEODESIC_NPHI,
  PHI_CAPTURED,
  PHI_MAX,
  R_ISCO,
  U_CAPTURED,
  U_ESCAPED,
  U_HORIZON,
  WEAK_FIELD_COEFFS,
  bOfS,
  buildFluxTable,
  buildGeodesicTable,
  diskCrossingPhi0,
  diskRedshift,
  geodesicTableRows,
  keplerOmega,
  observerBasis,
  pageThorneFlux,
  pageThorneFluxPeak,
  rayDirection,
  sOfB,
  traceRay,
  turningPointU,
  weakFieldSweep,
} from '../lib/physics/schwarzschild.mjs';

const STEPS = 10;
let step = 0;
/** @param {string} msg */
const log = (msg) => console.log(`[${++step}/${STEPS}] ${msg}`);

// Tolerances (see the header for what each check compares).
const TOL_DEFLECTION = 1e-5; // relative, tabulated vs quadrature
const TOL_BUILD_MS = 200;
const TOL_D65 = 0.01;
const TOL_CLOSED_FORM = 1e-10; // Page–Thorne closed form vs quadrature (relative)
const TOL_NEWTONIAN = 0.01;
const TOL_SERIES_AT_BMAX = 1e-5; // rad, series vs table at the table's edge
const TOL_ANGLE = 1e-12;
const D65 = [0.3127, 0.329];

// ---------------------------------------------------------------------------
// Quadrature helpers (independent of the RK4 integrator under test)
// ---------------------------------------------------------------------------

/**
 * Gauss–Legendre nodes and weights on [-1, 1] (Newton on P_n).
 *
 * @param {number} n
 * @returns {{ x: Float64Array, w: Float64Array }}
 */
function gaussLegendre(n) {
  const x = new Float64Array(n);
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let dp = 1;
    for (let it = 0; it < 100; it++) {
      let p0 = 1;
      let p1 = z;
      for (let k = 2; k <= n; k++) {
        const p2 = ((2 * k - 1) * z * p1 - (k - 1) * p0) / k;
        p0 = p1;
        p1 = p2;
      }
      dp = (n * (z * p1 - p0)) / (z * z - 1);
      const dz = p1 / dp;
      z -= dz;
      if (Math.abs(dz) < 1e-15) break;
    }
    x[i] = z;
    w[i] = 2 / ((1 - z * z) * dp * dp);
  }
  return { x, w };
}
const GL = gaussLegendre(48);

/**
 * Composite Gauss–Legendre on [a, b] with `panels` panels.
 *
 * @param {(t: number) => number} f
 * @param {number} a
 * @param {number} b
 * @param {number} panels
 */
function integrate(f, a, b, panels) {
  let sum = 0;
  for (let p = 0; p < panels; p++) {
    const lo = a + ((b - a) * p) / panels;
    const hi = a + ((b - a) * (p + 1)) / panels;
    for (let i = 0; i < GL.x.length; i++) {
      sum += 0.5 * (hi - lo) * GL.w[i] * f(0.5 * (hi - lo) * GL.x[i] + 0.5 * (hi + lo));
    }
  }
  return sum;
}

/**
 * Escape angle by quadrature of the orbit integral (header).
 *
 * @param {number} b impact parameter, > b_c
 */
function sweepByQuadrature(b) {
  const u2 = turningPointU(b);
  const B = 2 * u2 - 1;
  const C = 2 * u2 * u2 - u2;
  const q = -0.5 * (B + Math.sign(B) * Math.sqrt(B * B - 8 * C));
  const roots = [q / 2, C / q].sort((p, r) => p - r);
  const [u1, u3] = roots;
  assert.ok(u1 < 0 && u3 > u2, `cubic roots out of order at b = ${b}: ${u1}, ${u2}, ${u3}`);
  const f = (/** @type {number} */ t) => {
    const u = u2 * (1 - t * t);
    return Math.sqrt(2 * u2) / Math.sqrt((u - u1) * (u3 - u));
  };
  return 2 * integrate(f, 0, 1, 16);
}

// ---------------------------------------------------------------------------
// 1. Tables
// ---------------------------------------------------------------------------

const table = buildGeodesicTable();
const warm = buildGeodesicTable();
const { map, nb, nPhi } = table;
const rowB = Float64Array.from({ length: nb }, (_, j) => bOfS(map, j / (nb - 1)));
console.log(
  `[setup] geodesic table ${nb} x ${nPhi} (${((table.u.byteLength + table.escape.byteLength) / 1048576).toFixed(2)} MB float32), ` +
    `phi in [0, 3 pi], b in [0, ${map.bMax.toFixed(4)}]`,
);
console.log(
  `[setup] b(s) = b_c + c sinh(k (s - s_c)): b_c = ${B_CRIT.toFixed(6)}, c = ${map.core}, ` +
    `k = ${map.k.toFixed(6)}, s_c = ${map.sCrit.toFixed(6)} (row ${map.jCrit})`,
);
assert.equal(nb, GEODESIC_NB);
assert.equal(nPhi, GEODESIC_NPHI);
assert.equal(table.u.length, nb * nPhi);
assert.equal(table.phiMax, PHI_MAX);
assert.equal(rowB[0], 0);
assert.ok(Math.abs(rowB[nb - 1] - map.bMax) < 1e-12, `last row b = ${rowB[nb - 1]} vs B_MAX = ${map.bMax}`);
for (let j = 0; j < nb; j++) {
  const s = j / (nb - 1);
  if (j > 0) {
    assert.ok(rowB[j] > rowB[j - 1], `b grid not increasing at row ${j}`);
    assert.ok(Math.abs(sOfB(map, rowB[j]) - s) < 1e-12, `s(b(s)) != s at row ${j}`);
  }
}
assert.ok(table.buildMs < TOL_BUILD_MS, `cold build took ${table.buildMs.toFixed(1)} ms (limit ${TOL_BUILD_MS})`);
log(
  `tables built: cold ${table.buildMs.toFixed(1)} ms, warm ${warm.buildMs.toFixed(1)} ms (< ${TOL_BUILD_MS}); ` +
    `s(b(s)) = s to 1e-12; rows next to b_c at b - b_c = +-${(rowB[Math.ceil(map.jCrit)] - B_CRIT).toExponential(3)}`,
);

// ---------------------------------------------------------------------------
// 2. Capture threshold
// ---------------------------------------------------------------------------

const below = traceRay(B_CRIT * (1 - 1e-3));
const above = traceRay(B_CRIT * (1 + 1e-3));
assert.equal(below.fate, 'captured', `b_c (1 - 1e-3) ${below.fate}`);
assert.equal(above.fate, 'escaped', `b_c (1 + 1e-3) ${above.fate}`);
assert.ok(above.uMax < 1 / 3 && above.uMax > 0.3, `near-critical periapsis u = ${above.uMax}`);
log(
  `b_c (1 - 1e-3) captured after ${below.phiEnd.toFixed(3)} rad; b_c (1 + 1e-3) escapes at ` +
    `Phi = ${above.phiEnd.toFixed(4)} rad after skimming r = ${(1 / above.uMax).toFixed(4)} (photon sphere r = 3)`,
);

// ---------------------------------------------------------------------------
// 3. Deflection vs quadrature
// ---------------------------------------------------------------------------

let worstDefl = 0;
let worstDeflB = 0;
let rowsChecked = 0;
for (let j = 0; j < nb; j++) {
  const b = rowB[j];
  if (b < 8) continue;
  const exact = sweepByQuadrature(b);
  const rel = Math.abs(table.escape[j] - exact) / (exact - Math.PI);
  if (rel > worstDefl) {
    worstDefl = rel;
    worstDeflB = b;
  }
  rowsChecked += 1;
  assert.ok(rel < TOL_DEFLECTION, `deflection at b = ${b}: table ${table.escape[j]} vs quadrature ${exact} (rel ${rel})`);
}
// The same comparison for the float64 integrator on a few rays near b_c.
let worstNear = 0;
for (const b of [5.25, 5.5, 6, 7]) {
  const rel = Math.abs(traceRay(b).phiEnd - sweepByQuadrature(b)) / (sweepByQuadrature(b) - Math.PI);
  worstNear = Math.max(worstNear, rel);
  assert.ok(rel < TOL_DEFLECTION, `deflection at b = ${b}: rel ${rel}`);
}
log(
  `deflection Phi - pi matches quadrature: ${rowsChecked} table rows b in [8, ${map.bMax.toFixed(2)}], ` +
    `worst rel err ${worstDefl.toExponential(2)} (b = ${worstDeflB.toFixed(2)}); ` +
    `traceRay at b = 5.25-7: ${worstNear.toExponential(2)}`,
);

// ---------------------------------------------------------------------------
// 4. Weak field
// ---------------------------------------------------------------------------

const weak = [1e2, 1e3, 1e4].map((b) => ({ b, ratio: ((sweepByQuadrature(b) - Math.PI) * b) / 4 }));
for (const { b, ratio } of weak) {
  // Leading correction: (Phi - pi) b / 4 = 1 + (15 pi / 16) / b + O(b^-2).
  const expected = 1 + (15 * Math.PI) / 16 / b;
  assert.ok(Math.abs(ratio - expected) < 100 / (b * b), `weak field at b = ${b}: ratio ${ratio} vs ${expected}`);
}
assert.ok(Math.abs(weak[2].ratio - 1) < 1e-3, `(Phi - pi) b / 4 at b = 1e4: ${weak[2].ratio}`);
const seriesGap = Math.abs(weakFieldSweep(map.bMax) - table.escape[nb - 1]);
assert.ok(seriesGap < TOL_SERIES_AT_BMAX, `series vs table at B_MAX: ${seriesGap} rad`);
// The b^-5 coefficient (3584/5): residual of the 4-term series times b^5 -> 716.8.
const b5 = 400;
const fourTerm =
  Math.PI + WEAK_FIELD_COEFFS.slice(0, 4).reduce((s, c, k) => s + c / b5 ** (k + 1), 0);
const c5 = (sweepByQuadrature(b5) - fourTerm) * b5 ** 5;
assert.ok(Math.abs(c5 / WEAK_FIELD_COEFFS[4] - 1) < 0.02, `b^-5 coefficient ${c5} vs ${WEAK_FIELD_COEFFS[4]}`);
log(
  `weak field: (Phi - pi) b / 4 = ${weak.map((w) => `${w.ratio.toFixed(6)} (b = ${w.b})`).join(', ')} -> 1; ` +
    `series vs table at B_MAX: ${seriesGap.toExponential(2)} rad; b^-5 coefficient ${c5.toFixed(1)} (3584/5 = 716.8)`,
);

// ---------------------------------------------------------------------------
// 5. Page–Thorne flux
// ---------------------------------------------------------------------------

assert.equal(pageThorneFlux(R_ISCO), 0, 'F(6) must be exactly 0');
for (let k = 1; k <= 400; k++) {
  const r = R_ISCO * 10 ** ((6 * k) / 400); // 6 .. 6e6, log-spaced
  assert.ok(pageThorneFlux(r) > 0, `F(${r}) = ${pageThorneFlux(r)} <= 0`);
}
let worstClosed = 0;
for (const r of [6.001, 6.5, 8, 9.55, 12, 22, 100, 1e4]) {
  const I = integrate((s) => (s - 6) / (2 * Math.sqrt(s) * (s - 3)), R_ISCO, r, 64);
  const quad = ((3 / (8 * Math.PI)) * I) / (r ** 2.5 * (r - 3));
  const rel = Math.abs(pageThorneFlux(r) - quad) / quad;
  worstClosed = Math.max(worstClosed, rel);
  assert.ok(rel < TOL_CLOSED_FORM, `closed form vs integral form at r = ${r}: rel ${rel}`);
}
const newton = (/** @type {number} */ r) => pageThorneFlux(r) / (3 / (8 * Math.PI * r ** 3));
// F 8 pi r^3 / 3 = 1 - C/sqrt(r) + 6/r - 3C/r^(3/2) + O(r^-2), C = sqrt6 + sqrt3 ln(1 + sqrt2).
const C = FLUX_ASYMPTOTIC_C;
const series = (/** @type {number} */ r) => 1 - C / Math.sqrt(r) + 6 / r - (3 * C) / r ** 1.5;
assert.ok(Math.abs(newton(1e4) - series(1e4)) < 1e-6, `asymptotic series at r = 1e4: ${newton(1e4)} vs ${series(1e4)}`);
assert.ok(Math.abs(newton(1e6) - 1) < TOL_NEWTONIAN, `Newtonian limit at r = 1e6: ratio ${newton(1e6)}`);
const peak = pageThorneFluxPeak();
assert.ok(peak.r > 9.5 && peak.r < 9.6, `flux maximum at r = ${peak.r}`);
const fluxTable = buildFluxTable(256, R_ISCO, DISK_R_OUT);
assert.equal(fluxTable[0], 0);
assert.ok(Math.max(...fluxTable) <= 1 && Math.max(...fluxTable) > 0.999, 'flux table not normalized to its peak');
log(
  `Page–Thorne: F(6) = 0, F > 0 on (6, 6e6]; closed form = integral form to ${worstClosed.toExponential(1)}; ` +
    `F / (3/(8 pi r^3)) = ${newton(1e4).toFixed(4)} at r = 1e4 (= 1 - C/sqrt r + 6/r - 3C/r^1.5, ` +
    `C = ${C.toFixed(4)}), ${newton(1e6).toFixed(4)} at r = 1e6; ` +
    `maximum at r = ${peak.r.toFixed(4)} M (F_max = ${peak.flux.toExponential(4)})`,
);

// ---------------------------------------------------------------------------
// 6. Redshift convention and disk crossings
// ---------------------------------------------------------------------------

const deg = Math.PI / 180;
const gRight = diskRedshift(8, 8, 0, 80 * deg);
const gLeft = diskRedshift(8, 8, Math.PI, 80 * deg);
assert.ok(gRight < gLeft, `right side must be redder: g(alpha = 0) = ${gRight}, g(alpha = pi) = ${gLeft}`);
assert.ok(gRight < 1 && gLeft > 1, `expected red/blue shifts, got ${gRight}, ${gLeft}`);
// Face-on: only gravitational + transverse Doppler, sqrt(1 - 3/r).
assert.ok(Math.abs(diskRedshift(8, 8, 1.1, 0) - Math.sqrt(1 - 3 / 8)) < 1e-15, 'face-on redshift');
// Geometry behind the sign: the alpha = 0 ray (flat-space limit) meets the disk
// at phi_0 = pi/2, i.e. at +y; counterclockwise rotation moves the gas there
// along -x, away from the observer at +x.
const incl = 80 * deg;
const { o } = observerBasis(incl);
const hit = rayDirection(diskCrossingPhi0(0, incl), 0, incl);
assert.ok(Math.abs(hit[0]) < TOL_ANGLE && Math.abs(hit[1] - 1) < TOL_ANGLE, `alpha = 0 hit at ${hit}`);
const vGas = [-keplerOmega(8) * 8 * hit[1], keplerOmega(8) * 8 * hit[0], 0]; // Omega z x r
assert.ok(vGas[0] * o[0] + vGas[1] * o[1] < 0, 'gas on the screen-right side must recede');
// L_z = (b s_hat x o)_z = -b sin i cos alpha, from the vectors themselves.
for (const alpha of [0.3, 1.9, -2.4]) {
  const { e1, e2 } = observerBasis(incl);
  const s = [0, 1, 2].map((k) => Math.cos(alpha) * e1[k] + Math.sin(alpha) * e2[k]);
  const lz = s[0] * o[1] - s[1] * o[0];
  assert.ok(Math.abs(lz + Math.sin(incl) * Math.cos(alpha)) < 1e-15, `L_z at alpha = ${alpha}`);
}
// phi_0: the atan2 form equals Luminet's arccos form, and n_z vanishes there.
let worstPhi0 = 0;
for (let k = 0; k < 2000; k++) {
  const i = 1e-3 + ((k % 40) / 40) * (Math.PI / 2 - 2e-3); // [1e-3, pi/2 - 1e-3]
  const alpha = -Math.PI + (2 * Math.PI * ((k * 0.618034) % 1));
  const phi0 = diskCrossingPhi0(alpha, i);
  const B = Math.sin(alpha) * Math.sin(i);
  const luminet = Math.acos(-B / Math.sqrt(Math.cos(i) ** 2 + B * B));
  worstPhi0 = Math.max(worstPhi0, Math.abs(phi0 - luminet));
  for (const n of [0, 1, 2]) {
    const nz = rayDirection(phi0 + n * Math.PI, alpha, i)[2];
    assert.ok(Math.abs(nz) < TOL_ANGLE, `n_z(phi_${n}) = ${nz} at alpha = ${alpha}, i = ${i}`);
  }
  assert.ok(phi0 > 0 && phi0 < Math.PI, `phi_0 = ${phi0} outside (0, pi)`);
}
assert.ok(worstPhi0 < 1e-7, `atan2 vs arccos phi_0: ${worstPhi0}`);
log(
  `redshift at i = 80 deg, r = 8, b = 8: g(right) = ${gRight.toFixed(4)} < g(left) = ${gLeft.toFixed(4)} ` +
    `(right recedes); L_z = -b sin i cos alpha; phi_0 atan2 form = Luminet arccos form (max diff ` +
    `${worstPhi0.toExponential(1)}), n_z(phi_n) = 0`,
);

// ---------------------------------------------------------------------------
// 7. Blackbody colors
// ---------------------------------------------------------------------------

const [x65, y65] = blackbodyChromaticity(6504);
const dist65 = Math.hypot(x65 - D65[0], y65 - D65[1]);
assert.ok(dist65 < TOL_D65, `6504 K at (${x65}, ${y65}), ${dist65} from D65`);
const red = blackbodyRGB(1500);
const blue = blackbodyRGB(20000);
assert.ok(red[0] === 1 && red[0] > red[1] && red[1] > red[2], `1500 K not red-dominant: ${red}`);
assert.ok(blue[2] === 1 && blue[2] > blue[1] && blue[1] > blue[0], `20000 K not blue-dominant: ${blue}`);
const bbTable = buildBlackbodyTable(1000, 40000, 64);
for (let k = 1; k < 64; k++) {
  const prev = bbTable[3 * k - 1] / bbTable[3 * k - 3];
  const cur = bbTable[3 * k + 2] / bbTable[3 * k];
  assert.ok(cur >= prev, `blue/red ratio not increasing with T at entry ${k}`);
}
// Wien's law as a check on Planck: the peak of B_lambda sits at 2.8978e-3 m K / T.
const T5800 = 5800;
let lamPeak = 0;
let bPeak = 0;
for (let nm = 300; nm <= 700; nm += 0.01) {
  const v = planckRadiance(nm * 1e-9, T5800);
  if (v > bPeak) {
    bPeak = v;
    lamPeak = nm;
  }
}
assert.ok(Math.abs(lamPeak * 1e-9 * T5800 - 2.897772e-3) < 1e-7, `Wien peak ${lamPeak} nm at 5800 K`);
log(
  `blackbody: 6504 K at (${x65.toFixed(4)}, ${y65.toFixed(4)}), ${dist65.toFixed(4)} from D65; ` +
    `1500 K rgb = (${red.map((v) => v.toFixed(3)).join(', ')}); 20000 K rgb = (${blue
      .map((v) => v.toFixed(3))
      .join(', ')}); Wien peak ${lamPeak.toFixed(2)} nm at 5800 K`,
);

// ---------------------------------------------------------------------------
// 8. Table sanity
// ---------------------------------------------------------------------------

let worstPeri = 0;
for (let j = 0; j < nb; j++) {
  const row = table.u.subarray(j * nPhi, (j + 1) * nPhi);
  const captured = j < map.jCrit;
  const sentinel = captured ? U_CAPTURED : U_ESCAPED;
  assert.equal(table.escape[j] === PHI_CAPTURED, captured, `row ${j}: escape entry ${table.escape[j]}`);
  if (!captured) assert.ok(table.escape[j] > Math.PI, `row ${j}: Phi = ${table.escape[j]} <= pi`);
  if (j > map.jCrit + 1) assert.ok(table.escape[j] < table.escape[j - 1], `Phi(b) not decreasing at row ${j}`);
  assert.equal(row[0], 0, `row ${j}: u(0) = ${row[0]}`);
  let k = 1;
  let rising = true;
  let uMax = 0;
  for (; k < nPhi && row[k] !== sentinel; k++) {
    const u = row[k];
    assert.ok(u >= 0 && u < U_HORIZON, `row ${j}, sample ${k}: live u = ${u} outside [0, 1/2)`);
    if (u < row[k - 1]) {
      assert.ok(!captured, `captured row ${j} decreases at sample ${k}`);
      rising = false;
    } else {
      assert.ok(rising || u === row[k - 1], `escaping row ${j} rises again at sample ${k}`);
    }
    uMax = Math.max(uMax, u);
  }
  for (; k < nPhi; k++) assert.equal(row[k], sentinel, `row ${j}: live value after the sentinel at ${k}`);
  if (!captured && rowB[j] >= R_ISCO) {
    // Samples are dPhi apart, so the sampled maximum trails the true periapsis
    // by at most |u''| dPhi^2 / 8 ~ 1e-6.
    const gap = Math.abs(uMax - turningPointU(rowB[j]));
    worstPeri = Math.max(worstPeri, gap);
    assert.ok(gap < 1e-5, `row ${j}: sampled periapsis ${uMax} vs ${turningPointU(rowB[j])}`);
  }
}
assert.throws(() => pageThorneFlux(5.9), RangeError);
assert.throws(() => traceRay(-1), RangeError);
assert.throws(() => blackbodyRGB(0), RangeError);
assert.throws(() => diskRedshift(8, 8, 0, Math.PI / 2), RangeError);
log(
  `sentinels: rows below b_c captured (+1 after capture), above escaped (-1 after escape); Phi(b) decreasing; ` +
    `captured rows rise monotonically, escaping rows are unimodal; periapsis matches the cubic root ` +
    `(max gap ${worstPeri.toExponential(1)}); invalid inputs throw`,
);
// ---------------------------------------------------------------------------
// 9. Strong deflection and the row-at-a-time build
// ---------------------------------------------------------------------------

const STRONG_LIMIT = Math.log(216 * (7 - 4 * Math.sqrt(3)));
let firstEscapeErr = NaN;
let strongRows = 0;
// The limit's next-order term is O(b/b_c - 1), so the allowed gap shrinks
// with it, plus the table's float32 rounding.
const STRONG_SLOPE = 10;
const STRONG_FLOOR = 1e-5;
for (let j = Math.ceil(map.jCrit); j < nb; j++) {
  const x = rowB[j] / B_CRIT - 1;
  if (x > 1e-3) break;
  const err = Math.abs(table.escape[j] + Math.log(x) - STRONG_LIMIT);
  if (Number.isNaN(firstEscapeErr)) firstEscapeErr = err;
  assert.ok(
    err < STRONG_SLOPE * x + STRONG_FLOOR,
    `row ${j} (b/b_c - 1 = ${x}): Phi + ln(b/b_c - 1) off the strong-deflection limit by ${err}`,
  );
  strongRows++;
}
assert.ok(strongRows >= 3, `only ${strongRows} rows within 1e-4 of b_c`);
const rows = geodesicTableRows();
let rowStep = rows.next();
let yields = 0;
while (!rowStep.done) {
  yields++;
  rowStep = rows.next();
}
const sliced = rowStep.value;
assert.equal(yields, nb, `row-at-a-time build yielded ${yields} times for ${nb} rows`);
assert.ok(
  sliced.u.every((v, i) => Object.is(v, table.u[i])) && sliced.escape.every((v, i) => Object.is(v, table.escape[i])),
  'row-at-a-time table differs from the one-shot build',
);
log(
  `strong deflection: Phi + ln(b/b_c - 1) -> ln[216 (7 - 4 sqrt 3)] = ${STRONG_LIMIT.toFixed(6)} ` +
    `(${strongRows} rows, first escaping row off by ${firstEscapeErr.toExponential(1)}); ` +
    `row-at-a-time build bit-identical (${yields} slices)`,
);

// ---------------------------------------------------------------------------
// 10. Luminance
// ---------------------------------------------------------------------------

const T_PEAK = 6500;
const LUM_N = 256;
const lum = buildLuminanceTable(1000, 40000, LUM_N, T_PEAK);
for (let k = 1; k < LUM_N; k++) assert.ok(lum[k] > lum[k - 1], `luminance not rising at entry ${k}`);
// At T_peak itself (between table entries): interpolate in log Y as the shader does.
const xPeak = (Math.log(T_PEAK / 1000) / Math.log(40000 / 1000)) * (LUM_N - 1);
const kPeak = Math.floor(xPeak);
const atPeak = Math.exp(
  Math.log(lum[kPeak]) + (Math.log(lum[kPeak + 1]) - Math.log(lum[kPeak])) * (xPeak - kPeak),
);
assert.ok(Math.abs(atPeak - 1) < 1e-3, `Y(T_peak) / Y(T_peak) interpolates to ${atPeak}`);
assert.ok(Math.abs(blackbodyTableTemperature(1000, 40000, LUM_N, kPeak) - T_PEAK) < 200, 'peak entry misplaced');
/** @param {number} T */
const slope = (T) => {
  const h = 1e-3;
  return (Math.log(blackbodyXYZ(T * (1 + h))[1]) - Math.log(blackbodyXYZ(T * (1 - h))[1])) / (Math.log(1 + h) - Math.log(1 - h));
};
const slopes = [4500, 6500, 8500].map(slope);
for (const [T, s, want] of /** @type {[number, number, number][]} */ ([[4500, slopes[0], 5.73], [6500, slopes[1], 4.07], [8500, slopes[2], 3.22]])) {
  assert.ok(Math.abs(s - want) < 0.1, `d ln Y / d ln T at ${T} K = ${s}, expected ~${want}`);
}
log(
  `luminance: Y(T)/Y(6500 K) rises monotonically and is 1 at the peak (${atPeak.toFixed(5)}); ` +
    `d ln Y / d ln T = ${slopes.map((v) => v.toFixed(2)).join(', ')} at 4500, 6500, 8500 K (bolometric: 4)`,
);

console.log('[done] black hole: all checks passed');
