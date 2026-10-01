// @ts-check
/**
 * Physics checks for lib/physics/hydrogen.mjs (the v4 page's electron cloud).
 * Run: node scripts/verify-hydrogen.mjs   (also part of npm run verify:physics)
 *
 * Checks, in atomic units:
 *  1. Normalization: int_0^inf R_nl^2 r^2 dr = 1 for every rung.
 *  2. Mean radius: <r> = (3n^2 - l(l+1)) / 2.
 *  3. The closed-form radial CDF (Gamma, integer shape) matches quadrature.
 *  4. Zonal harmonics are orthonormal: 2 pi int Y_a Y_b dc = delta_ab.
 *  5. Every ladder state is normalized: ca^2 + cb^2 = 1.
 *  6. The radial quantile inverts the CDF: |F(Q(u)) - u| < 1e-12.
 *  7. The angular CDF runs 0 -> 1 monotonically; the forward lookup tables
 *     are monotone with exact ends.
 *  8. End-to-end transport with the shipped seeds, table sizes, and lookups
 *     (the shader's path): <r> and <cos^2 theta> of every rung, the angular
 *     nodes stay empty and the far radial tail holds only what the exact
 *     density puts there (Poisson counts), and a mixed state's <r>.
 *  9. Angular nodes: Legendre's P_l and the module's own polynomial vanish
 *     at every angularNodes(l) root; closed forms; none for l = 0.
 * 10. Line wavelengths: R_H, the series and correspondence limits, and the
 *     NIST ASD fine-structure-averaged lines (Ly-alpha, H-alpha, Pa-alpha).
 * 11. Fine structure added back (Dirac, order alpha^2) puts the Bohr lines on
 *     NIST's individual components, up to the 1s Lamb shift.
 * 12. Air index: normal dispersion, its infrared limit, agreement with
 *     Ciddor (1996); the vacuum/air switches at 200 and 2000 nm; band labels.
 * 13. The ladder's transitions: order, Delta n = Delta l = +1, pi
 *     polarization, and the dipole selection rule as integrals.
 * 14. spectralSrgb (lib/physics/blackbody.mjs): channel ranges, hues, and
 *     agreement with the CIE 1931 table from 380 to 780 nm.
 * Fails loudly (non-zero exit) on the first violation.
 */

import assert from 'node:assert/strict';
import {
  LAMBDA_MAX_NM,
  LAMBDA_MIN_NM,
  SPECTRAL_FIT_MAX_NM,
  SPECTRAL_FIT_MIN_NM,
  spectralSrgb,
  srgbEncode,
  xyzToLinearSrgb,
} from '../lib/physics/blackbody.mjs';
import {
  AIR_INDEX_MAX_NM,
  AIR_INDEX_MIN_NM,
  AIR_WAVELENGTH_MAX_NM,
  AIR_WAVELENGTH_MIN_NM,
  ANGULAR_TABLE_COLS,
  ANGULAR_TABLE_ROWS,
  ANGULAR_TOP_OVER_R95,
  ELECTRON_PROTON_MASS_RATIO,
  LADDER_MAX,
  LADDER_TRANSITIONS,
  RADIAL_TABLE_SIZE,
  RADIAL_TAIL_U,
  RUNGS,
  RYDBERG_INF_PER_M,
  VISIBLE_MAX_NM,
  VISIBLE_MIN_NM,
  airRefractiveIndex,
  angularCdf,
  angularNodes,
  buildAngularCdfTable,
  buildRadialCdfTable,
  ladderState,
  r3Seeds,
  radialCdf,
  radialQuantile,
  rungRadialCdf,
  rydbergHydrogen,
  sampleCosTheta,
  sampleRadius,
  spectroscopicWavelength,
  transitionWavelength,
  vacuumWavelengthNm,
} from '../lib/physics/hydrogen.mjs';

// The stage's dot counts: POINTS_DESKTOP and POINTS_MOBILE in
// components/scq4/config.ts.
const SHIPPED_POINTS = [24000, 9000];

const TOL_QUAD = 1e-9; // Simpson on a fine grid
const TOL_EXACT = 1e-12;
const STEPS = 11;
let step = 0;
/** @param {string} msg */
const log = (msg) => console.log(`[${++step}/${STEPS}] ${msg}`);

/**
 * Composite Simpson on [a, b] with n (even) intervals.
 * @param {(x: number) => number} f
 * @param {number} a
 * @param {number} b
 * @param {number} n
 * @returns {number}
 */
function simpson(f, a, b, n) {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

/**
 * Polynomial product (coefficients lowest order first).
 * @param {number[]} p
 * @param {number[]} q
 * @returns {number[]}
 */
const pmul = (p, q) => {
  const out = new Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => (out[i + j] += a * b)));
  return out;
};
/**
 * Exact integral of a polynomial over [a, b].
 * @param {number[]} p
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
const pintegral = (p, a, b) =>
  p.reduce((s, c, k) => s + (c * (b ** (k + 1) - a ** (k + 1))) / (k + 1), 0);

/**
 * Real roots in (-1, 1) of a zonal harmonic's polynomial (degree <= 3), found
 * by scanning for sign changes and bisecting.
 * @param {number[]} p coefficients, lowest order first
 * @returns {number[]}
 */
function zonalNodes(p) {
  /** @param {number} x */
  const f = (x) => p.reduce((s, c, k) => s + c * x ** k, 0);
  const roots = [];
  const STEPS_SCAN = 2000;
  for (let i = 0; i < STEPS_SCAN; i++) {
    let lo = -1 + (2 * i) / STEPS_SCAN;
    let hi = -1 + (2 * (i + 1)) / STEPS_SCAN;
    if (f(lo) === 0) {
      roots.push(lo);
      continue;
    }
    if (f(lo) * f(hi) >= 0) continue;
    for (let it = 0; it < 80; it++) {
      const mid = 0.5 * (lo + hi);
      if (f(lo) * f(mid) <= 0) hi = mid;
      else lo = mid;
    }
    roots.push(0.5 * (lo + hi));
  }
  return roots;
}

console.log('[setup] hydrogen rungs:', RUNGS.map((r) => r.label).join(', '));

// 1-3. Radial functions.
for (const rung of RUNGS) {
  const { n, l, R, label } = rung;
  const upper = 60 * n * n; // far past the tail (e^{-2r/n} ~ 1e-50)
  const norm = simpson((r) => R(r) ** 2 * r * r, 0, upper, 400000);
  assert.ok(Math.abs(norm - 1) < TOL_QUAD, `${label}: norm ${norm}`);
  const mean = simpson((r) => R(r) ** 2 * r ** 3, 0, upper, 400000);
  const expected = (3 * n * n - l * (l + 1)) / 2;
  assert.ok(Math.abs(mean - expected) < 1e-7, `${label}: <r> ${mean} vs ${expected}`);
  for (const r of [0.5, 1, 3, 8, 20]) {
    const quad = simpson((x) => R(x) ** 2 * x * x, 0, r, 200000);
    const closed = rungRadialCdf(n, r);
    assert.ok(Math.abs(quad - closed) < TOL_QUAD, `${label}: CDF(${r}) ${closed} vs ${quad}`);
  }
}
log('radial functions normalized; <r> = (3n^2 - l(l+1))/2; Gamma CDF matches quadrature');

// 4. Orthonormal zonal harmonics.
for (let a = 0; a < RUNGS.length; a++) {
  for (let b = 0; b < RUNGS.length; b++) {
    const g = 2 * Math.PI * pintegral(pmul(RUNGS[a].Y, RUNGS[b].Y), -1, 1);
    assert.ok(Math.abs(g - (a === b ? 1 : 0)) < TOL_EXACT, `Y${a}.Y${b} = ${g}`);
  }
}
log('zonal harmonics orthonormal to 1e-12');

// 5-6. Ladder states and the radial quantile.
for (let s = 0; s <= LADDER_MAX; s += 0.125) {
  const st = ladderState(s);
  assert.ok(Math.abs(st.ca ** 2 + st.cb ** 2 - 1) < TOL_EXACT, `ladder ${s} not normalized`);
  for (const u of [1e-6, 0.01, 0.25, 0.5, 0.75, 0.99, 1 - 1e-6]) {
    const r = radialQuantile(st, u);
    assert.ok(Math.abs(radialCdf(st, r) - u) < TOL_EXACT, `quantile(${u}) at s=${s}`);
  }
}
log('ladder states normalized; radial quantile inverts the CDF to 1e-12');

// 7. Forward CDF tables (the renderer's lookups, header point 6).
for (let s = 0; s <= LADDER_MAX; s += 0.25) {
  const st = ladderState(s);
  for (const r of [0.3, 2, 6, 15]) {
    const F = angularCdf(st, r);
    if (F === null) continue;
    assert.ok(Math.abs(F(-1)) < TOL_EXACT && Math.abs(F(1) - 1) < TOL_EXACT, `F ends at s=${s}`);
    let prev = -1;
    for (let c = -1; c <= 1; c += 0.01) {
      const v = F(c);
      assert.ok(v >= prev - TOL_EXACT, `angular CDF not monotone at s=${s}, r=${r}, c=${c}`);
      prev = v;
    }
  }
  const r95 = radialQuantile(st, 0.95);
  const rMax = radialQuantile(st, RADIAL_TAIL_U);
  const radial = buildRadialCdfTable(st, RADIAL_TABLE_SIZE, rMax);
  assert.equal(radial[0], 0, `radial table must start at 0 (s=${s})`);
  assert.ok(Math.abs(radial[RADIAL_TABLE_SIZE - 1] - RADIAL_TAIL_U) < 1e-7, `radial table end at s=${s}`);
  for (let k = 1; k < RADIAL_TABLE_SIZE; k++) {
    assert.ok(radial[k] >= radial[k - 1], `radial table not monotone at s=${s}, k=${k}`);
  }
  const ROWS = ANGULAR_TABLE_ROWS;
  const COLS = ANGULAR_TABLE_COLS;
  const angular = buildAngularCdfTable(st, ROWS, COLS, r95 * ANGULAR_TOP_OVER_R95);
  for (let i = 0; i < ROWS; i++) {
    assert.ok(angular[i * COLS] === 0 && angular[i * COLS + COLS - 1] === 1, `angular row ${i} ends (s=${s})`);
    for (let j = 1; j < COLS; j++) {
      assert.ok(angular[i * COLS + j] >= angular[i * COLS + j - 1], `angular row ${i} not monotone (s=${s})`);
    }
  }
}
log('angular CDFs run 0 -> 1 monotonically; forward lookup tables monotone with exact ends');

// 8. End-to-end transport with the SHIPPED seeds, table sizes, and lookups
// (sampleRadius / sampleCosTheta, which the vertex shader mirrors): moments,
// empty angular nodes, and the radial tail, each against the exact density.
/**
 * @param {number} s ladder coordinate
 * @param {number} count dots
 */
function transport(s, count) {
  const st = ladderState(s);
  const r95 = radialQuantile(st, 0.95);
  const rMax = radialQuantile(st, RADIAL_TAIL_U);
  const rTop = r95 * ANGULAR_TOP_OVER_R95;
  const radial = buildRadialCdfTable(st, RADIAL_TABLE_SIZE, rMax);
  const angular = buildAngularCdfTable(st, ANGULAR_TABLE_ROWS, ANGULAR_TABLE_COLS, rTop);
  const seeds = r3Seeds(count);
  const r = new Float64Array(count);
  const c = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    r[i] = sampleRadius(radial, rMax, seeds[3 * i]);
    c[i] = sampleCosTheta(angular, ANGULAR_TABLE_ROWS, ANGULAR_TABLE_COLS, seeds[3 * i + 1], r[i] / rTop);
  }
  return { st, r, c, r95 };
}

/**
 * A Poisson count is consistent with its expectation (4 sigma, plus a small
 * allowance for the tables' cell-level discretization).
 * @param {number} count
 * @param {number} expected
 */
const poissonOk = (count, expected) => Math.abs(count - expected) <= 4 * Math.sqrt(expected) + 3;

const NODE_HALF_WIDTH = 0.05; // |c - node| slab
const TAIL_OVER_R95 = 2.5;
const summary = [];
for (const count of SHIPPED_POINTS) {
  for (let a = 0; a < RUNGS.length; a++) {
    const { label, n, l, Y } = RUNGS[a];
    const { r, c, r95 } = transport(a, count);
    let sumR = 0;
    let sumC2 = 0;
    for (let i = 0; i < count; i++) {
      sumR += r[i];
      sumC2 += c[i] * c[i];
    }
    const meanR = sumR / count;
    const meanC2 = sumC2 / count;
    const Y2 = pmul(Y, Y);
    const norm = pintegral(Y2, -1, 1);
    const exactC2 = pintegral(pmul(Y2, [0, 0, 1]), -1, 1) / norm;
    const exactR = (3 * n * n - l * (l + 1)) / 2;
    assert.ok(Math.abs(meanR / exactR - 1) < 0.01, `${label} (${count} dots): <r> ${meanR} vs ${exactR}`);
    assert.ok(Math.abs(meanC2 - exactC2) < 0.004, `${label} (${count} dots): <cos^2> ${meanC2} vs ${exactC2}`);
    // Nodes of Y_l0 (roots of its polynomial in c) must stay (nearly) empty.
    for (const node of zonalNodes(Y)) {
      const inSlab = c.reduce((k, v) => k + (Math.abs(v - node) < NODE_HALF_WIDTH ? 1 : 0), 0);
      const expected =
        (count * pintegral(Y2, Math.max(-1, node - NODE_HALF_WIDTH), Math.min(1, node + NODE_HALF_WIDTH))) / norm;
      assert.ok(
        poissonOk(inSlab, expected),
        `${label} (${count} dots): ${inSlab} dots within ${NODE_HALF_WIDTH} of the node c = ${node.toFixed(4)}, exact ${expected.toFixed(2)}`,
      );
    }
    // Far tail: no smeared shell of stray dots.
    const rTail = TAIL_OVER_R95 * r95;
    const beyond = r.reduce((k, v) => k + (v > rTail ? 1 : 0), 0);
    const expectedTail = count * (1 - rungRadialCdf(n, rTail));
    assert.ok(
      poissonOk(beyond, expectedTail),
      `${label} (${count} dots): ${beyond} dots beyond ${TAIL_OVER_R95} r95, exact ${expectedTail.toFixed(2)}`,
    );
    if (count === SHIPPED_POINTS[0]) summary.push(`${label} <r>=${meanR.toFixed(3)} (${exactR}) tail=${beyond}`);
  }
}
// A mixed state: the radial marginal has no cross term (header, point 3).
{
  const count = SHIPPED_POINTS[0];
  const { st, r } = transport(0.5, count);
  const exact = st.ca ** 2 * 1.5 + st.cb ** 2 * 5;
  const mean = r.reduce((sum, v) => sum + v, 0) / count;
  assert.ok(Math.abs(mean / exact - 1) < 0.01, `1s+2p mixture <r> ${mean} vs ${exact}`);
}
log(`shipped seeds through the shipped lookups: moments, empty nodes, and tails match (${summary.join('; ')})`);

// 9. Angular nodes (header, point 7). Legendre's P_l is written out here,
// independently of the module's coefficient table.
/** @type {((c: number) => number)[]} */
const LEGENDRE = [() => 1, (c) => c, (c) => (3 * c * c - 1) / 2, (c) => (5 * c * c * c - 3 * c) / 2];
const TOL_ANGLE = 1e-10; // rad, against the closed forms
const DEG_PER_RAD = 180 / Math.PI;
/**
 * A coefficient list (lowest order first) evaluated at c.
 * @param {number[]} p
 * @param {number} c
 */
const peval = (p, c) => p.reduce((s, coef, j) => s + coef * c ** j, 0);
assert.equal(angularNodes(0).length, 0, 'l = 0 (1s) must have no angular node');
/** @type {string[]} */
const nodeSummary = [];
for (let l = 1; l <= LADDER_MAX; l++) {
  const nodes = angularNodes(l);
  assert.equal(nodes.length, l, `Y_${l}0 must have ${l} nodes, got ${nodes.length}`);
  for (let k = 0; k < l; k++) {
    const th = nodes[k];
    assert.ok(th > 0 && th < Math.PI && (k === 0 || th > nodes[k - 1]), `l = ${l}: nodes ${Array.from(nodes)} not ascending in (0, pi)`);
    const c = Math.cos(th);
    assert.ok(Math.abs(LEGENDRE[l](c)) < TOL_EXACT, `P_${l}(cos ${th}) = ${LEGENDRE[l](c)}`);
    assert.ok(Math.abs(peval(RUNGS[l].Y, c)) < TOL_EXACT, `the module's Y_${l}0(cos ${th}) = ${peval(RUNGS[l].Y, c)}`);
    // Parity (-1)^l: nodes pair up as theta and pi - theta.
    assert.ok(Math.abs(th + nodes[l - 1 - k] - Math.PI) < TOL_EXACT, `l = ${l}: nodes not symmetric about the equator`);
  }
  nodeSummary.push(`l=${l}: ${Array.from(nodes, (t) => (t * DEG_PER_RAD).toFixed(4)).join(', ')}`);
}
{
  const [p] = angularNodes(1);
  const d = angularNodes(2);
  const f = angularNodes(3);
  assert.ok(Math.abs(p - Math.PI / 2) < TOL_ANGLE, `2p node ${p} rad, expected pi/2`);
  assert.ok(Math.abs(d[0] - Math.acos(1 / Math.sqrt(3))) < TOL_ANGLE, `3d node ${d[0]} rad, expected arccos(1/sqrt 3) = 54.7356 deg`);
  assert.ok(Math.abs(f[0] - Math.acos(Math.sqrt(3 / 5))) < TOL_ANGLE, `4f node ${f[0]} rad, expected arccos(sqrt(3/5)) = 39.2315 deg`);
  assert.ok(Math.abs(f[1] - Math.PI / 2) < TOL_ANGLE, `4f node ${f[1]} rad, expected pi/2`);
}
for (const bad of [-1, LADDER_MAX + 1, 1.5, Number.NaN]) {
  assert.throws(() => angularNodes(bad), RangeError, `angularNodes(${bad}) must throw`);
}
log(`angular nodes: P_l and the module's Y_l0 vanish to 1e-12 at every root (${nodeSummary.join('; ')} deg), closed forms to 1e-10 rad; l = 0 has none`);

// 10. Line wavelengths (header, point 8): R_H, both limits, and NIST ASD.
const NM_PER_M = 1e9;
const RH = rydbergHydrogen();
// The commonly quoted R_H = 1.09677583e7 m^-1; leaving out the reduced mass
// would be off by 5973 m^-1.
const RH_QUOTED = 1.09677583e7;
assert.ok(Math.abs(RH - RH_QUOTED) < 0.5, `R_H = ${RH} m^-1, expected ${RH_QUOTED}`);
assert.ok(Math.abs((RH * (1 + ELECTRON_PROTON_MASS_RATIO)) / RYDBERG_INF_PER_M - 1) < TOL_EXACT, 'R_H (1 + m_e/m_p) != R_inf');
// Series limit n2 -> infinity: lambda = n1^2 / R_H, approached as
// lambda(n1, n2) / limit - 1 = n1^2 / (n2^2 - n1^2).
const FAR_LEVEL = 1e6;
for (const n1 of [1, 2, 3, 4]) {
  const limit = (n1 * n1 * NM_PER_M) / RH;
  assert.ok(Math.abs(vacuumWavelengthNm(n1, Infinity) / limit - 1) < TOL_EXACT, `series limit of n1 = ${n1}`);
  const gap = vacuumWavelengthNm(n1, FAR_LEVEL) / limit - 1;
  const expected = (n1 * n1) / (FAR_LEVEL * FAR_LEVEL - n1 * n1);
  assert.ok(Math.abs(gap - expected) < 1e-14, `n1 = ${n1}: n2 = ${FAR_LEVEL} sits ${gap} from the limit, expected ${expected}`);
}
// Correspondence limit: lambda(n, n + 1) = n^2 (n + 1)^2 / ((2n + 1) R_H),
// whose ratio to the classical n^3 / (2 R_H) is 1 + 3/(2n) + O(1/n^2).
for (const n of [10, 100, 1000, 10000]) {
  const lam = vacuumWavelengthNm(n, n + 1);
  const exact = (n * n * (n + 1) * (n + 1) * NM_PER_M) / ((2 * n + 1) * RH);
  assert.ok(Math.abs(lam / exact - 1) < TOL_EXACT, `lambda(${n}, ${n + 1}) = ${lam}, closed form ${exact}`);
  const ratio = lam / ((n ** 3 * NM_PER_M) / (2 * RH));
  assert.ok(Math.abs(ratio - 1 - 3 / (2 * n)) < 1 / (n * n), `n = ${n}: ratio to the classical limit ${ratio}`);
}
for (const [n1, n2] of [[0, 2], [2, 2], [3, 2], [1.5, 3], [1, 2.5], [1, Number.NaN]]) {
  assert.throws(() => vacuumWavelengthNm(n1, n2), RangeError, `vacuumWavelengthNm(${n1}, ${n2}) must throw`);
}
// NIST ASD, H I, fine-structure-averaged ("unresolved") observed lines,
// retrieved 2026-09-30. Each tolerance covers the fine structure the module
// leaves out (header, point 8) yet stays well under the reduced-mass and air
// corrections, so dropping either makes the check fail (asserted below).
const NIST_LINES = [
  // Ly-alpha: fine structure puts both components 0.0015 to 0.0020 nm short of
  // the Bohr line, and the 1s Lamb shift brings them back by 0.0004 nm, so the
  // centroid should sit 0.001 to 0.002 nm short (it does: 0.0014). 0.01 nm is
  // 6.6x under the 0.066 nm reduced-mass correction.
  { name: 'Ly-alpha', n1: 1, n2: 2, nm: 121.56701, medium: 'vacuum', tol: 0.01 },
  // H-alpha: components span 0.0173 nm short to 0.0031 nm long of the Bohr
  // line, and NIST's intensity-weighted centroid lies 0.009 nm short. 0.015 nm
  // is 24x under the 0.357 nm reduced-mass and 12x under the 0.181 nm air
  // correction.
  { name: 'H-alpha', n1: 2, n2: 3, nm: 656.279, medium: 'air', tol: 0.015 },
  // Pa-alpha: components span 0.047 nm short to 0.007 nm long, and NIST quotes
  // the observed centroid to 0.01 nm. 0.05 nm covers the whole span and is 20x
  // under the 1.02 nm reduced-mass and 10x under the 0.512 nm air correction.
  { name: 'Pa-alpha', n1: 3, n2: 4, nm: 1875.13, medium: 'air', tol: 0.05 },
];
/** @type {string[]} */
const lineSummary = [];
for (const line of NIST_LINES) {
  const q = transitionWavelength(line.n1, line.n2);
  assert.equal(q.medium, line.medium, `${line.name}: NIST quotes it in ${line.medium}, got ${q.medium}`);
  const miss = q.nm - line.nm;
  assert.ok(Math.abs(miss) < line.tol, `${line.name}: ${q.nm} nm vs NIST ${line.nm} nm (tolerance ${line.tol} nm)`);
  // The check has teeth: with R_inf in place of R_H, or (air lines) quoted in vacuum, it fails.
  const vac = vacuumWavelengthNm(line.n1, line.n2);
  const vacNoRecoil = (vac * RH) / RYDBERG_INF_PER_M;
  const noRecoil = line.medium === 'air' ? vacNoRecoil / airRefractiveIndex(vacNoRecoil) : vacNoRecoil;
  assert.ok(Math.abs(noRecoil - line.nm) > line.tol, `${line.name}: the tolerance cannot see the reduced mass`);
  if (line.medium === 'air') assert.ok(Math.abs(vac - line.nm) > line.tol, `${line.name}: the tolerance cannot see the air correction`);
  lineSummary.push(`${line.name} ${q.nm.toFixed(4)} ${q.medium} (NIST ${line.nm}, ${miss >= 0 ? '+' : ''}${miss.toFixed(4)})`);
}
log(`line wavelengths: R_H = ${RH.toFixed(3)} m^-1; series and correspondence limits; ${lineSummary.join('; ')}`);

// 11. Fine structure put back (header, point 8): Dirac levels to order alpha^2,
//   E_nj = -(R_H / n^2) [1 + (alpha^2 / n^2)(n / (j + 1/2) - 3/4)],
// carry our Bohr + Peck-Reeder lines onto NIST's Ritz wavelengths for single
// components, here the ladder's own stretched ones (j = l + 1/2 on both
// levels). What is left is the Lamb shift: 8.17 GHz for 1s, 0.0004 nm at
// Ly-alpha, and at most about 10 MHz (2e-5 nm at H-alpha) for p, d and f
// levels. Agreement to 1e-4 nm pins the air index at 656 and 1875 nm to
// 1e-7 of n.
const ALPHA = 7.2973525693e-3; // fine-structure constant, CODATA 2018
const LAMB_SHIFT_1S_HZ = 8.17e9; // raises 1s, so Ly-alpha is longer than Dirac's
const SPEED_OF_LIGHT = 299792458; // m/s, exact
/**
 * Dirac level in units of h c R_H (header, point 8).
 * @param {number} n
 * @param {number} jHalf j + 1/2
 */
const diracLevel = (n, jHalf) => -(1 + ((ALPHA * ALPHA) / (n * n)) * (n / jHalf - 0.75)) / (n * n);
const COMPONENTS = [
  { label: '1s1/2-2p3/2', n1: 1, j1: 1, n2: 2, j2: 2, ritz: 121.566823731, lambHz: LAMB_SHIFT_1S_HZ, tol: 2e-5 },
  { label: '2p3/2-3d5/2', n1: 2, j1: 2, n2: 3, j2: 3, ritz: 656.285177, lambHz: 0, tol: 1e-4 },
  { label: '3d5/2-4f7/2', n1: 3, j1: 3, n2: 4, j2: 4, ritz: 1875.11112, lambHz: 0, tol: 1e-4 },
];
/** @type {string[]} */
const componentSummary = [];
for (const cmp of COMPONENTS) {
  const vac = NM_PER_M / (RH * (diracLevel(cmp.n2, cmp.j2) - diracLevel(cmp.n1, cmp.j1)));
  const quoted = spectroscopicWavelength(vac).nm;
  // A lower level raised by h nu lengthens the line by lambda^2 nu / c (nm here).
  const lamb = (quoted * quoted * cmp.lambHz) / (SPEED_OF_LIGHT * NM_PER_M);
  const residual = quoted + lamb - cmp.ritz;
  assert.ok(
    Math.abs(residual) < cmp.tol,
    `${cmp.label}: Dirac ${quoted} nm + Lamb ${lamb} nm vs NIST Ritz ${cmp.ritz} nm (residual ${residual})`,
  );
  componentSummary.push(`${cmp.label} ${residual.toExponential(1)} nm`);
}
log(`fine structure put back: Dirac components land on NIST's Ritz values (${componentSummary.join('; ')}; Ly-alpha after the 1s Lamb shift)`);

// 12. Air index and the quoting convention (header, point 9).
{
  let prev = Infinity;
  for (let lam = AIR_INDEX_MIN_NM; lam <= AIR_INDEX_MAX_NM; lam += 1) {
    const n = airRefractiveIndex(lam);
    assert.ok(n < prev, `air index must fall with wavelength (normal dispersion), not at ${lam} nm`);
    prev = n;
  }
}
// Red and infrared: about 1 + 2.7e-4, above and approaching the formula's
// s -> 0 limit; ultraviolet: rising toward the far-UV poles.
const PR_INFRARED_LIMIT = 1e-8 * (8060.51 + 2480990 / 132.274 + 17455.7 / 39.32957); // 2.72608e-4
const RED_IR_START_NM = 650;
for (let lam = RED_IR_START_NM; lam <= AIR_INDEX_MAX_NM; lam += 10) {
  const refractivity = airRefractiveIndex(lam) - 1;
  assert.ok(refractivity > PR_INFRARED_LIMIT && refractivity < 2.77e-4, `n - 1 = ${refractivity} at ${lam} nm`);
}
assert.ok(airRefractiveIndex(AIR_INDEX_MAX_NM) - 1 - PR_INFRARED_LIMIT < 4e-7, 'the index should be near its infrared limit by 2000 nm');
assert.ok(airRefractiveIndex(AIR_INDEX_MIN_NM) - 1 > 3.3e-4, 'the index should rise toward the ultraviolet');
// An independent formula: Ciddor (1996), Appl. Opt. 35, 1566, Eqs. (1) and
// (2), for the same standard air (15 C, 101325 Pa, dry) at NIST's 330 ppm CO2:
//   1e8 (n - 1) = [5792105 / (238.0185 - s^2) + 167917 / (57.362 - s^2)] (1 + 0.534e-6 (x_c - 450)).
// Ciddor's fit starts at 230 nm.
const CIDDOR_MIN_NM = 230;
const CO2_PPM = 330;
let worstCiddor = 0;
for (let lam = CIDDOR_MIN_NM; lam <= AIR_INDEX_MAX_NM; lam += 1) {
  const s2 = (1000 / lam) ** 2;
  const ciddor = 1e-8 * (5792105 / (238.0185 - s2) + 167917 / (57.362 - s2)) * (1 + 0.534e-6 * (CO2_PPM - 450));
  worstCiddor = Math.max(worstCiddor, Math.abs(airRefractiveIndex(lam) - 1 - ciddor));
}
assert.ok(worstCiddor < 1e-8, `Peck & Reeder and Ciddor differ by ${worstCiddor} in n`);
for (const bad of [AIR_INDEX_MIN_NM - 1, AIR_INDEX_MAX_NM + 1, Number.NaN]) {
  assert.throws(() => airRefractiveIndex(bad), RangeError, `airRefractiveIndex(${bad}) must throw`);
}
// The vacuum/air switches (NIST: vacuum where sigma >= 50000 or <= 5000 cm^-1).
const NUDGE_NM = 1e-9;
assert.equal(spectroscopicWavelength(AIR_WAVELENGTH_MIN_NM).medium, 'vacuum', 'exactly 200 nm is quoted in vacuum');
assert.equal(spectroscopicWavelength(AIR_WAVELENGTH_MIN_NM + NUDGE_NM).medium, 'air', 'just above 200 nm is quoted in air');
assert.equal(spectroscopicWavelength(AIR_WAVELENGTH_MAX_NM - NUDGE_NM).medium, 'air', 'just below 2000 nm is quoted in air');
assert.equal(spectroscopicWavelength(AIR_WAVELENGTH_MAX_NM).medium, 'vacuum', 'exactly 2000 nm is quoted in vacuum');
assert.equal(spectroscopicWavelength(150).nm, 150, 'a vacuum wavelength is quoted unchanged');
assert.ok(Math.abs(spectroscopicWavelength(500).nm - 500 / airRefractiveIndex(500)) < TOL_EXACT, 'air wavelength = vacuum / n');
for (const bad of [0, -5, Number.NaN, Infinity]) {
  assert.throws(() => spectroscopicWavelength(bad), RangeError, `spectroscopicWavelength(${bad}) must throw`);
}
// Lyman lines (below 121.6 nm) are all quoted in vacuum, Balmer lines
// (364.7 to 656.5 nm) all in air, Brackett-alpha (4051 nm) in vacuum again.
for (let n2 = 2; n2 <= 60; n2++) assert.equal(transitionWavelength(1, n2).medium, 'vacuum', `Lyman ${n2}`);
for (let n2 = 3; n2 <= 60; n2++) assert.equal(transitionWavelength(2, n2).medium, 'air', `Balmer ${n2}`);
assert.equal(transitionWavelength(4, 5).medium, 'vacuum', 'Brackett-alpha is beyond 2000 nm');
// Band labels, with the edges applied independently here, and the header's
// claim that no hydrogen line sits close enough to an edge or a switch for
// air versus vacuum to matter.
/** @param {number} nm */
const bandOf = (nm) => (nm < VISIBLE_MIN_NM ? 'ultraviolet' : nm > VISIBLE_MAX_NM ? 'infrared' : 'visible');
const SWITCH_CLEARANCE_NM = 1;
let linesChecked = 0;
for (let n1 = 1; n1 <= 10; n1++) {
  for (const n2 of [...Array.from({ length: 300 }, (_, k) => n1 + 1 + k), Infinity]) {
    const vac = vacuumWavelengthNm(n1, n2);
    const q = transitionWavelength(n1, n2);
    assert.equal(q.band, bandOf(q.nm), `line (${n1}, ${n2}): band ${q.band} at ${q.nm} nm`);
    assert.equal(bandOf(vac), q.band, `line (${n1}, ${n2}) changes band between vacuum (${vac} nm) and air (${q.nm} nm)`);
    for (const edge of [AIR_WAVELENGTH_MIN_NM, AIR_WAVELENGTH_MAX_NM]) {
      assert.ok(Math.abs(vac - edge) > SWITCH_CLEARANCE_NM, `line (${n1}, ${n2}) at ${vac} nm sits on the ${edge} nm switch`);
    }
    linesChecked++;
  }
}
assert.equal(transitionWavelength(2, 10).band, 'ultraviolet', 'H10 (379.79 nm air) is ultraviolet');
assert.equal(transitionWavelength(2, 9).band, 'visible', 'H9 (383.54 nm air) is visible');
assert.equal(transitionWavelength(3, Infinity).band, 'infrared', 'the Paschen limit (820.4 nm) is infrared');
log(
  `air index: monotone, n - 1 = ${(airRefractiveIndex(AIR_INDEX_MIN_NM) - 1).toExponential(3)} at 185 nm to ` +
    `${(airRefractiveIndex(AIR_INDEX_MAX_NM) - 1).toExponential(4)} at 2000 nm (limit ${PR_INFRARED_LIMIT.toExponential(4)}), ` +
    `Ciddor within ${worstCiddor.toExponential(1)}; vacuum/air switch at 200 and 2000 nm; bands of ${linesChecked} lines unchanged by the medium`,
);

// 13. The ladder's transitions (header, point 10).
assert.ok(Object.isFrozen(LADDER_TRANSITIONS), 'LADDER_TRANSITIONS must be frozen');
assert.equal(LADDER_TRANSITIONS.length, RUNGS.length - 1, 'one transition per ladder step');
const LADDER_LABELS = [
  ['ultraviolet', 'vacuum'],
  ['visible', 'air'],
  ['infrared', 'air'],
];
// <Y_{l+1,0}| cos(theta) |Y_l0> = (l + 1) / sqrt((2l + 1)(2l + 3)), the z
// (Delta m = 0) dipole's angular factor; every other rung pair gives 0.
/**
 * @param {number} a
 * @param {number} b
 */
const cosMatrix = (a, b) => 2 * Math.PI * pintegral(pmul(pmul(RUNGS[a].Y, [0, 1]), RUNGS[b].Y), -1, 1);
// <2p| r |1s> radial integral: 128 sqrt(6) / 243 Bohr radii.
const RADIAL_1S_2P = (128 * Math.sqrt(6)) / 243;
LADDER_TRANSITIONS.forEach((t, k) => {
  const lower = RUNGS[k];
  const upper = RUNGS[k + 1];
  assert.ok(Object.isFrozen(t), `transition ${k} must be frozen`);
  assert.deepEqual(
    [t.from, t.to, t.n1, t.n2, t.l1, t.l2],
    [lower.label, upper.label, lower.n, upper.n, lower.l, upper.l],
    `transition ${k} must be ${lower.label} -> ${upper.label}`,
  );
  assert.equal(t.n2 - t.n1, 1, `${t.from} -> ${t.to}: Delta n`);
  assert.equal(t.l2 - t.l1, 1, `${t.from} -> ${t.to}: Delta l must be +1`);
  assert.equal(t.polarization, 'pi', `${t.from} -> ${t.to}: m = 0 -> 0 light is pi-polarized`);
  const q = transitionWavelength(t.n1, t.n2);
  assert.deepEqual([t.nm, t.medium, t.band], [q.nm, q.medium, q.band], `${t.from} -> ${t.to}: wavelength`);
  assert.deepEqual([t.band, t.medium], LADDER_LABELS[k], `${t.from} -> ${t.to}: band and medium`);
  if (k > 0) {
    assert.equal(t.from, LADDER_TRANSITIONS[k - 1].to, 'the steps must chain up the ladder');
    assert.ok(t.nm > LADDER_TRANSITIONS[k - 1].nm, 'each step up the ladder takes a longer wavelength');
  }
  const l = lower.l;
  const expected = (l + 1) / Math.sqrt((2 * l + 1) * (2 * l + 3));
  assert.ok(Math.abs(cosMatrix(k, k + 1) - expected) < TOL_EXACT, `${t.from} -> ${t.to}: <cos theta> = ${cosMatrix(k, k + 1)}, expected ${expected}`);
  for (let b = 0; b < RUNGS.length; b++) {
    if (Math.abs(b - k) !== 1) assert.ok(Math.abs(cosMatrix(k, b)) < TOL_EXACT, `<${RUNGS[b].label}| cos theta |${lower.label}> must vanish (Delta l != +-1)`);
  }
  const radial = simpson((r) => lower.R(r) * upper.R(r) * r ** 3, 0, 60 * upper.n * upper.n, 400000);
  assert.ok(radial > 0, `${t.from} -> ${t.to}: radial integral ${radial} must be positive (allowed)`);
  if (k === 0) assert.ok(Math.abs(radial - RADIAL_1S_2P) < TOL_QUAD, `<2p| r |1s> = ${radial}, expected ${RADIAL_1S_2P}`);
});
log(
  `ladder transitions: ${LADDER_TRANSITIONS.map((t) => `${t.from}->${t.to} ${t.nm.toFixed(3)} nm ${t.medium} ${t.band}`).join(', ')}; ` +
    'Delta l = +1, pi; <cos theta> = (l+1)/sqrt((2l+1)(2l+3)), other pairs 0; radial integrals > 0',
);

// 14. spectralSrgb (lib/physics/blackbody.mjs, header point 7).
// CIE 1931 2-degree observer (CIE 015:2018, Table 1) rounded to 4 decimals,
// every 10 nm from 380 to 700 nm. Beyond 700 nm the table's chromaticity is
// constant at (0.73469, 0.26531).
const CIE_1931_10NM = [
  [0.0014, 0.0, 0.0065], [0.0042, 0.0001, 0.0201], [0.0143, 0.0004, 0.0679], [0.0435, 0.0012, 0.2074],
  [0.1344, 0.004, 0.6456], [0.2839, 0.0116, 1.3856], [0.3483, 0.023, 1.7471], [0.3362, 0.038, 1.7721],
  [0.2908, 0.06, 1.6692], [0.1954, 0.091, 1.2876], [0.0956, 0.139, 0.813], [0.032, 0.208, 0.4652],
  [0.0049, 0.323, 0.272], [0.0093, 0.503, 0.1582], [0.0633, 0.71, 0.0782], [0.1655, 0.862, 0.0422],
  [0.2904, 0.954, 0.0203], [0.4334, 0.995, 0.0087], [0.5945, 0.995, 0.0039], [0.7621, 0.952, 0.0021],
  [0.9163, 0.87, 0.0017], [1.0263, 0.757, 0.0011], [1.0622, 0.631, 0.0008], [1.0026, 0.503, 0.0003],
  [0.8544, 0.381, 0.0002], [0.6424, 0.265, 0.0], [0.4479, 0.175, 0.0], [0.2835, 0.107, 0.0],
  [0.1649, 0.061, 0.0], [0.0874, 0.032, 0.0], [0.0468, 0.017, 0.0], [0.0227, 0.0082, 0.0],
  [0.0114, 0.0041, 0.0],
];
const CIE_TABLE_STEP_NM = 10;
const CIE_TABLE_END_NM = LAMBDA_MIN_NM + CIE_TABLE_STEP_NM * (CIE_1931_10NM.length - 1); // 700
const CIE_TAIL_X = 0.73469;
const CIE_TAIL_Y = 0.26531;
/**
 * CIE 1931 XYZ (any overall scale) at a multiple of 10 nm in 380..780.
 * @param {number} lam
 * @returns {[number, number, number]}
 */
const cieXyz = (lam) => {
  if (lam > CIE_TABLE_END_NM) return [CIE_TAIL_X / CIE_TAIL_Y, 1, (1 - CIE_TAIL_X - CIE_TAIL_Y) / CIE_TAIL_Y];
  const [x, y, z] = CIE_1931_10NM[(lam - LAMBDA_MIN_NM) / CIE_TABLE_STEP_NM];
  return [x, y, z];
};
// The gamut step written out again here: least equal-energy white, then the
// largest channel scaled to 1 (linear light).
const WHITE_E = xyzToLinearSrgb([1, 1, 1]);
/** @param {[number, number, number]} xyz */
const referenceLinear = (xyz) => {
  const rgb = xyzToLinearSrgb(xyz);
  const t = Math.max(0, ...rgb.map((c, i) => -c / WHITE_E[i]));
  const lin = rgb.map((c, i) => Math.max(0, c + t * WHITE_E[i]));
  const peak = Math.max(...lin);
  return lin.map((c) => c / peak);
};
// Inverse sRGB curve (IEC 61966-2-1): the encoded value at the linear limit
// 0.0031308 is 12.92 x 0.0031308 = 0.04045.
const SRGB_ENCODED_LIMIT = 0.04045;
/** @param {number} c */
const srgbDecode = (c) => (c <= SRGB_ENCODED_LIMIT ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/**
 * HSV hue (deg) of an RGB triple.
 * @param {number[]} rgb
 */
const hueDeg = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (60 * h + 360) % 360;
};
// Contract on a fine grid: channels in [0, 1], largest exactly 1, smallest
// exactly 0 (the least white leaves one channel on the gamut edge).
for (let lam = LAMBDA_MIN_NM; lam <= LAMBDA_MAX_NM; lam += 0.5) {
  const c = spectralSrgb(lam);
  assert.ok(c.every((v) => v >= 0 && v <= 1), `spectralSrgb(${lam}) = ${c} leaves [0, 1]`);
  assert.equal(Math.max(...c), 1, `spectralSrgb(${lam}): the largest channel must be 1`);
  assert.equal(Math.min(...c), 0, `spectralSrgb(${lam}): the smallest channel must be 0 (least white)`);
}
// Against the CIE 1931 table: linear light everywhere, encoded in the held tails.
const TOL_CIE_LINEAR = 0.05; // the fit's own error in its band peaks at 0.043 (569 nm)
const TOL_CIE_TAILS = 0.035; // held tails: 0.022 (violet) and 0.030 (red)
let worstLinear = 0;
let worstLinearAt = 0;
let worstTail = 0;
let worstTailAt = 0;
for (let lam = LAMBDA_MIN_NM; lam <= LAMBDA_MAX_NM; lam += CIE_TABLE_STEP_NM) {
  const got = spectralSrgb(lam);
  const ref = referenceLinear(cieXyz(lam));
  const dLinear = Math.max(...got.map((c, i) => Math.abs(srgbDecode(c) - ref[i])));
  if (dLinear > worstLinear) [worstLinear, worstLinearAt] = [dLinear, lam];
  if (lam < SPECTRAL_FIT_MIN_NM || lam > SPECTRAL_FIT_MAX_NM) {
    const dEncoded = Math.max(...got.map((c, i) => Math.abs(c - srgbEncode(ref[i]))));
    if (dEncoded > worstTail) [worstTail, worstTailAt] = [dEncoded, lam];
  }
}
assert.ok(worstLinear < TOL_CIE_LINEAR, `spectralSrgb vs CIE 1931: ${worstLinear} per linear channel at ${worstLinearAt} nm`);
assert.ok(worstTail < TOL_CIE_TAILS, `spectralSrgb vs CIE 1931 in the held tails: ${worstTail} per encoded channel at ${worstTailAt} nm`);
// Hues in plausible ranges (HSV degrees; red wraps through 0).
const HUE_RANGES = [
  { nm: 450, name: 'blue-violet', lo: 240, hi: 280 },
  { nm: 470, name: 'blue', lo: 200, hi: 240 },
  { nm: 490, name: 'cyan', lo: 170, hi: 200 },
  { nm: 530, name: 'green', lo: 120, hi: 165 },
  { nm: 550, name: 'yellow-green', lo: 80, hi: 130 },
  { nm: 580, name: 'amber', lo: 35, hi: 65 },
  { nm: 600, name: 'orange', lo: 10, hi: 40 },
  { nm: 656.3, name: 'red', lo: 330, hi: 370 },
];
for (const { nm, name, lo, hi } of HUE_RANGES) {
  const h = hueDeg(spectralSrgb(nm));
  assert.ok((((h - lo) % 360) + 360) % 360 <= hi - lo, `${nm} nm should look ${name} (hue ${lo} to ${hi} deg), got ${h.toFixed(1)} deg`);
}
const hAlpha = spectralSrgb(656.3);
assert.ok(hAlpha[0] === 1 && hAlpha[1] === 0 && srgbDecode(hAlpha[2]) < 0.1, `656.3 nm must be red-dominated, got ${hAlpha}`);
const blue = spectralSrgb(450);
assert.ok(blue[2] === 1 && blue[2] > blue[0] && blue[2] > blue[1], `450 nm must be blue-dominant, got ${blue}`);
const green = spectralSrgb(530);
assert.ok(green[1] === 1 && green[1] > green[0] && green[1] > green[2], `530 nm must be green-dominant, got ${green}`);
for (const bad of [LAMBDA_MIN_NM - 0.1, LAMBDA_MAX_NM + 0.1, Number.NaN]) {
  assert.throws(() => spectralSrgb(bad), RangeError, `spectralSrgb(${bad}) must throw`);
}
/** @param {number[]} c */
const fmt = (c) => `(${c.map((v) => v.toFixed(3)).join(', ')})`;
log(
  `spectralSrgb: [0, 1], max 1, min 0; CIE 1931 within ${worstLinear.toFixed(3)} linear (at ${worstLinearAt} nm), ` +
    `${worstTail.toFixed(3)} encoded in the held tails (at ${worstTailAt} nm); 656.3 nm ${fmt(hAlpha)}, ` +
    `450 nm ${fmt(blue)}, 530 nm ${fmt(green)}`,
);
console.log('[done] hydrogen: all checks passed');
