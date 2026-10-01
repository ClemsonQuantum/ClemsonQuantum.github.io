// @ts-check
/**
 * Verifies lib/physics/entangle.mjs, the entangled pair on the SC Quantathon
 * v4 stage. Every check compares the closed form in the module header with
 * an independent computation at TOL = 1e-12:
 *  - the exact statevector (lib/physics/qubits.mjs: Ry, Rz, CNOT, partial
 *    trace), and
 *  - U(t) = exp(-iHt) itself, by scaling and squaring a Taylor series, so
 *    the factorization of U(t) and the sign of the a x b term are tested
 *    against the Hamiltonian, not against the derivation.
 *
 * Usage: node scripts/verify-entangle.mjs   (exit code 1 on any failure)
 *
 * Random inputs come from a seeded PRNG (mulberry32), so every run draws the
 * same cases; the seed is printed in the [setup] line.
 */

import assert from 'node:assert/strict';
import os from 'node:os';

import {
  ENTANGLE_MAX_TIME,
  ENTANGLE_PAIR,
  PAIR_OUT_LENGTH,
  UNIT_TOL,
  blochFromAngles,
  concurrenceMax,
  entangledPair,
  loopRates,
} from '../lib/physics/entangle.mjs';
import {
  I2,
  Ry,
  Rz,
  TOL,
  X,
  Y,
  Z,
  applySingle,
  blochVector,
  cloneState,
  cnot,
  normSquared,
  zeroState,
} from '../lib/physics/qubits.mjs';

/** @typedef {import('../lib/physics/qubits.mjs').StateVector} StateVector */
/** @typedef {import('../lib/physics/qubits.mjs').Mat2} Mat2 */
/** @typedef {import('../lib/physics/qubits.mjs').Vec3} Vec3 */
/** @typedef {{ re: Float64Array, im: Float64Array }} Op4 row-major 4x4 complex */

const SEED = 20260930;
const QUBITS = 2;
const DIM = 2 ** QUBITS;
const RANDOM_CASES = 256; // (a, b, J, omega, t) draws for the closed-form check
const RANDOM_OPERATORS = 64; // (J, omega, t) draws for U(t) = exp(-iHt)
const RANDOM_PREPS = 200; // product-state preparations
const RATE_MAX = 2; // rad/s, |J| and |omega| drawn from [-RATE_MAX, RATE_MAX]
const TIME_MAX = 12; // s, t drawn from [-TIME_MAX, TIME_MAX] (|Ht| <= 42)
const EXPM_SCALED_NORM = 0.5; // scale A by 2^-s until ||A||_inf <= this
const EXPM_TERMS = 24; // Taylor terms: truncation <= 0.5^25 / 25! ~ 2e-33
const SIGN_MARGIN = 0.1; // the flipped-sign formula must miss by more than this
const SLOPE_STEP = 1e-6; // s, central-difference step for dr/dt at t = 0
// Central difference: truncation ~ |d^3 r/dt^3| h^2 / 6 <= 1e-12 for rates
// <= 2 rad/s, rounding ~ 1e-16 / h = 1e-10.
const SLOPE_TOL = 1e-8;
const LOOP_CASES = /** @type {Array<[number, number, number]>} */ ([
  [48, 2, 3], // shipped
  [48, 1, 1],
  [30, 3, 5],
  [10, 1, 2],
  [7.5, 5, 4],
  [100, 4, 7],
]);
const MIN_PERIOD_DIVISORS = 12; // the shipped frame at L/k differs from t = 0 for k = 2..12
const MIN_PERIOD_GAP = 0.05; // ... by at least this much
const SHIPPED_DOT_RANGE = [-0.9, -0.85];
const SHIPPED_CMAX_RANGE = [0.925, 0.95];
const SHIPPED_MIN_CROSS = 0.3;
const SHIPPED_MIN_TRANSVERSE = 0.5; // sqrt(x^2 + y^2): at least 30 deg off the z axis
const RISE_SAMPLES = 600; // samples of C on (0, t*] to show t* is the first peak

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * mulberry32: small, fast, seedable 32-bit PRNG with values in [0, 1).
 *
 * @param {number} seed
 * @returns {() => number}
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);

/** @param {number} lo @param {number} hi */
const uniform = (lo, hi) => lo + (hi - lo) * rand();

/**
 * Bloch angles uniform on the sphere: cos(theta) ~ U[-1, 1], phi ~ U[0, 2 pi).
 *
 * @returns {{ theta: number, phi: number }}
 */
function randomAngles() {
  return { theta: Math.acos(1 - 2 * rand()), phi: 2 * Math.PI * rand() };
}

/** @param {ArrayLike<number>} a @param {ArrayLike<number>} b */
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** @param {ArrayLike<number>} a @param {ArrayLike<number>} b @returns {Vec3} */
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** @param {ArrayLike<number>} v */
const norm3 = (v) => Math.hypot(v[0], v[1], v[2]);

/**
 * Counterclockwise turn by phi about +z (module convention 4).
 *
 * @param {ArrayLike<number>} v
 * @param {number} phi
 * @returns {Vec3}
 */
function rotZ(v, phi) {
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]];
}

/**
 * Largest componentwise |u - v| over the first n entries.
 *
 * @param {ArrayLike<number>} u
 * @param {ArrayLike<number>} v
 * @param {number} [n]
 * @returns {number}
 */
function vecDistance(u, v, n = Math.min(u.length, v.length)) {
  let worst = 0;
  for (let k = 0; k < n; k++) worst = Math.max(worst, Math.abs(u[k] - v[k]));
  return worst;
}

/**
 * Largest |a_k - b_k| over two states.
 *
 * @param {StateVector} a
 * @param {StateVector} b
 * @returns {number}
 */
function stateDistance(a, b) {
  let worst = 0;
  for (let k = 0; k < a.re.length; k++) worst = Math.max(worst, Math.hypot(a.re[k] - b.re[k], a.im[k] - b.im[k]));
  return worst;
}

/**
 * <a|b>.
 *
 * @param {StateVector} a
 * @param {StateVector} b
 * @returns {[number, number]} [re, im]
 */
function overlap(a, b) {
  let re = 0;
  let im = 0;
  for (let k = 0; k < a.re.length; k++) {
    re += a.re[k] * b.re[k] + a.im[k] * b.im[k];
    im += a.re[k] * b.im[k] - a.im[k] * b.re[k];
  }
  return [re, im];
}

/**
 * Concurrence of a pure two-qubit state from its amplitudes (Wootters):
 * C = 2 |psi_00 psi_11 - psi_01 psi_10| (indices 0, 3, 1, 2).
 *
 * @param {StateVector} st
 * @returns {number}
 */
function concurrenceFromAmplitudes(st) {
  const { re, im } = st;
  const pr = re[0] * re[3] - im[0] * im[3] - (re[1] * re[2] - im[1] * im[2]);
  const pi = re[0] * im[3] + im[0] * re[3] - (re[1] * im[2] + im[1] * re[2]);
  return 2 * Math.hypot(pr, pi);
}

// --- 4x4 complex operators (independent of the module under test) ---------

/** @returns {Op4} */
const op4Zero = () => ({ re: new Float64Array(16), im: new Float64Array(16) });

/** @returns {Op4} */
function op4Identity() {
  const M = op4Zero();
  for (let k = 0; k < DIM; k++) M.re[5 * k] = 1;
  return M;
}

/**
 * Kronecker product A (x) B: (A (x) B)[2 r1 + r2][2 c1 + c2] =
 * A[r1][c1] B[r2][c2], with A on q0 (the most significant bit).
 *
 * @param {Mat2} A
 * @param {Mat2} B
 * @returns {Op4}
 */
function kron(A, B) {
  const M = op4Zero();
  for (let r1 = 0; r1 < 2; r1++) {
    for (let c1 = 0; c1 < 2; c1++) {
      for (let r2 = 0; r2 < 2; r2++) {
        for (let c2 = 0; c2 < 2; c2++) {
          const ar = A.re[2 * r1 + c1];
          const ai = A.im[2 * r1 + c1];
          const br = B.re[2 * r2 + c2];
          const bi = B.im[2 * r2 + c2];
          const k = 4 * (2 * r1 + r2) + (2 * c1 + c2);
          M.re[k] = ar * br - ai * bi;
          M.im[k] = ar * bi + ai * br;
        }
      }
    }
  }
  return M;
}

/**
 * Linear combination sum_j (cr_j + i ci_j) M_j.
 *
 * @param {Array<[number, number, Op4]>} terms
 * @returns {Op4}
 */
function combo(terms) {
  const out = op4Zero();
  for (const [cr, ci, M] of terms) {
    for (let k = 0; k < 16; k++) {
      out.re[k] += cr * M.re[k] - ci * M.im[k];
      out.im[k] += cr * M.im[k] + ci * M.re[k];
    }
  }
  return out;
}

/**
 * Matrix product A B.
 *
 * @param {Op4} A
 * @param {Op4} B
 * @returns {Op4}
 */
function op4Mul(A, B) {
  const out = op4Zero();
  for (let r = 0; r < DIM; r++) {
    for (let c = 0; c < DIM; c++) {
      let re = 0;
      let im = 0;
      for (let k = 0; k < DIM; k++) {
        const ar = A.re[4 * r + k];
        const ai = A.im[4 * r + k];
        const br = B.re[4 * k + c];
        const bi = B.im[4 * k + c];
        re += ar * br - ai * bi;
        im += ar * bi + ai * br;
      }
      out.re[4 * r + c] = re;
      out.im[4 * r + c] = im;
    }
  }
  return out;
}

/**
 * Conjugate transpose.
 *
 * @param {Op4} A
 * @returns {Op4}
 */
function op4Adjoint(A) {
  const out = op4Zero();
  for (let r = 0; r < DIM; r++) {
    for (let c = 0; c < DIM; c++) {
      out.re[4 * r + c] = A.re[4 * c + r];
      out.im[4 * r + c] = -A.im[4 * c + r];
    }
  }
  return out;
}

/**
 * Largest entrywise modulus |A - B|.
 *
 * @param {Op4} A
 * @param {Op4} B
 * @returns {number}
 */
function op4Distance(A, B) {
  let worst = 0;
  for (let k = 0; k < 16; k++) worst = Math.max(worst, Math.hypot(A.re[k] - B.re[k], A.im[k] - B.im[k]));
  return worst;
}

/**
 * M |psi> as a new state.
 *
 * @param {Op4} M
 * @param {StateVector} psi
 * @returns {StateVector}
 */
function op4Apply(M, psi) {
  const out = zeroState(QUBITS);
  out.re[0] = 0;
  for (let r = 0; r < DIM; r++) {
    let re = 0;
    let im = 0;
    for (let c = 0; c < DIM; c++) {
      const mr = M.re[4 * r + c];
      const mi = M.im[4 * r + c];
      re += mr * psi.re[c] - mi * psi.im[c];
      im += mr * psi.im[c] + mi * psi.re[c];
    }
    out.re[r] = re;
    out.im[r] = im;
  }
  return out;
}

/**
 * exp(A) by scaling and squaring a Taylor series (Moler and Van Loan, SIAM
 * Rev. 45, 3 (2003), method 3): exp(A) = (exp(A / 2^s))^(2^s) with
 * ||A / 2^s||_inf <= EXPM_SCALED_NORM.
 *
 * @param {Op4} A
 * @returns {Op4}
 */
function expm4(A) {
  let norm = 0;
  for (let r = 0; r < DIM; r++) {
    let row = 0;
    for (let c = 0; c < DIM; c++) row += Math.hypot(A.re[4 * r + c], A.im[4 * r + c]);
    norm = Math.max(norm, row);
  }
  const squarings = norm > EXPM_SCALED_NORM ? Math.ceil(Math.log2(norm / EXPM_SCALED_NORM)) : 0;
  const B = combo([[2 ** -squarings, 0, A]]);
  let term = op4Identity();
  let sum = op4Identity();
  for (let k = 1; k <= EXPM_TERMS; k++) {
    term = combo([[1 / k, 0, op4Mul(term, B)]]);
    sum = combo([[1, 0, sum], [1, 0, term]]);
  }
  for (let s = 0; s < squarings; s++) sum = op4Mul(sum, sum);
  return sum;
}

// --- The model, built from Pauli matrices ----------------------------------

const XX = kron(X, X);
const YY = kron(Y, Y);
const ZZ = kron(Z, Z);
const ZA = kron(Z, I2);
const ZB = kron(I2, Z);
const ID4 = op4Identity();
const SIGMA_DOT = combo([[1, 0, XX], [1, 0, YY], [1, 0, ZZ]]);

/** SWAP as the permutation |01> <-> |10>. */
const SWAP = (() => {
  const M = op4Zero();
  M.re[0] = 1; // <00|SWAP|00>
  M.re[4 * 1 + 2] = 1; // <01|SWAP|10>
  M.re[4 * 2 + 1] = 1; // <10|SWAP|01>
  M.re[15] = 1; // <11|SWAP|11>
  return M;
})();

/**
 * H = (J/4) sigma_A . sigma_B + (omega/2)(Z_A + Z_B), built from Pauli
 * Kronecker products.
 *
 * @param {number} J
 * @param {number} omega
 * @returns {Op4}
 */
const hamiltonian = (J, omega) => combo([[J / 4, 0, SIGMA_DOT], [omega / 2, 0, ZA], [omega / 2, 0, ZB]]);

/**
 * The module's factorization (header, point 2):
 * U(t) = [Rz(omega t) (x) Rz(omega t)] e^{iJt/4} [cos(Jt/2) 1 - i sin(Jt/2) SWAP].
 *
 * @param {number} J
 * @param {number} omega
 * @param {number} t
 * @returns {Op4}
 */
function factoredU(J, omega, t) {
  const field = kron(Rz(omega * t), Rz(omega * t));
  const pr = Math.cos((J * t) / 4);
  const pi = Math.sin((J * t) / 4);
  const c = Math.cos((J * t) / 2);
  const s = Math.sin((J * t) / 2);
  // e^{iJt/4} (c 1 - i s SWAP) = (pr + i pi) c 1 + (pr + i pi)(-i s) SWAP
  const exchange = combo([[pr * c, pi * c, ID4], [pi * s, -pr * s, SWAP]]);
  return op4Mul(field, exchange);
}

// --- The statevector route ---------------------------------------------------

/**
 * |a>|b> prepared as Ry(theta) then Rz(phi) on each qubit of |00>.
 *
 * @param {number} thA
 * @param {number} phA
 * @param {number} thB
 * @param {number} phB
 * @returns {StateVector}
 */
function productState(thA, phA, thB, phB) {
  const st = zeroState(QUBITS);
  applySingle(st, Ry(thA), 0);
  applySingle(st, Rz(phA), 0);
  applySingle(st, Ry(thB), 1);
  applySingle(st, Rz(phB), 1);
  return st;
}

/**
 * SWAP as three CNOTs (q0 -> q1, q1 -> q0, q0 -> q1). Mutates and returns.
 *
 * @param {StateVector} st
 * @returns {StateVector}
 */
function swapByCnots(st) {
  cnot(st, 0, 1);
  cnot(st, 1, 0);
  cnot(st, 0, 1);
  return st;
}

/**
 * SWAP as the amplitude permutation |01> <-> |10> (indices 1 and 2).
 *
 * @param {StateVector} st
 * @returns {StateVector} new state
 */
function swapByPermutation(st) {
  const out = cloneState(st);
  out.re[1] = st.re[2];
  out.im[1] = st.im[2];
  out.re[2] = st.re[1];
  out.im[2] = st.im[1];
  return out;
}

/**
 * Exact evolution of a two-qubit state: the exchange part
 * e^{iJt/4} (cos(Jt/2) psi - i sin(Jt/2) SWAP psi), then Rz(omega t) on
 * both qubits (qubits.mjs gates).
 *
 * @param {StateVector} psi0
 * @param {number} J
 * @param {number} omega
 * @param {number} t
 * @param {'cnot' | 'permutation'} method how SWAP psi is formed
 * @returns {StateVector}
 */
function evolveStatevector(psi0, J, omega, t, method) {
  const sw = method === 'cnot' ? swapByCnots(cloneState(psi0)) : swapByPermutation(psi0);
  const c = Math.cos((J * t) / 2);
  const s = Math.sin((J * t) / 2);
  const pr = Math.cos((J * t) / 4);
  const pi = Math.sin((J * t) / 4);
  const out = cloneState(psi0);
  for (let k = 0; k < DIM; k++) {
    // c psi - i s SWAP psi
    const xr = c * psi0.re[k] + s * sw.im[k];
    const xi = c * psi0.im[k] - s * sw.re[k];
    out.re[k] = pr * xr - pi * xi;
    out.im[k] = pr * xi + pi * xr;
  }
  applySingle(out, Rz(omega * t), 0);
  applySingle(out, Rz(omega * t), 1);
  return out;
}

/**
 * A random case: start angles, the module's start vectors and rates.
 *
 * @returns {{ thA: number, phA: number, thB: number, phB: number, a: Vec3, b: Vec3, J: number, omega: number, t: number }}
 */
function randomCase() {
  const A = randomAngles();
  const B = randomAngles();
  return {
    thA: A.theta,
    phA: A.phi,
    thB: B.theta,
    phB: B.phi,
    a: blochFromAngles(A.theta, A.phi),
    b: blochFromAngles(B.theta, B.phi),
    J: uniform(-RATE_MAX, RATE_MAX),
    omega: uniform(-RATE_MAX, RATE_MAX),
    t: uniform(-TIME_MAX, TIME_MAX),
  };
}

/** @type {Array<[string, () => string]>} */
const checks = [];

/**
 * Register a check; the callback returns a one-line diagnostic.
 *
 * @param {string} name
 * @param {() => string} fn
 */
function check(name, fn) {
  checks.push([name, fn]);
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

check('two-qubit operators: dim 4, SWAP = 3 CNOTs, sigma.sigma = 2 SWAP - 1, commuting terms, H Hermitian', () => {
  assert.equal(zeroState(QUBITS).re.length, 2 ** QUBITS, 'Hilbert space dimension must be 2^2 = 4');
  // SWAP from three CNOTs equals the permutation, on the basis and on random states.
  for (let k = 0; k < DIM; k++) {
    const e = zeroState(QUBITS);
    e.re[0] = 0;
    e.re[k] = 1;
    const d = stateDistance(swapByCnots(cloneState(e)), swapByPermutation(e));
    assert.ok(d <= TOL, `CNOT SWAP differs from the permutation on basis state ${k} by ${d}`);
  }
  let worstSwap = 0;
  for (let r = 0; r < RANDOM_PREPS; r++) {
    const { theta: t1, phi: p1 } = randomAngles();
    const { theta: t2, phi: p2 } = randomAngles();
    const st = productState(t1, p1, t2, p2);
    // Entangle it first so SWAP acts on a generic state.
    cnot(st, 0, 1);
    applySingle(st, Ry(uniform(0, Math.PI)), 1);
    worstSwap = Math.max(worstSwap, stateDistance(swapByCnots(cloneState(st)), swapByPermutation(st)));
  }
  assert.ok(worstSwap <= TOL, `three CNOTs differ from the SWAP permutation by ${worstSwap}`);
  // Dirac's identity and the commuting terms (header, points 1–2).
  const dirac = op4Distance(SIGMA_DOT, combo([[2, 0, SWAP], [-1, 0, ID4]]));
  assert.ok(dirac <= TOL, `sigma_A . sigma_B differs from 2 SWAP - 1 by ${dirac}`);
  assert.ok(op4Distance(op4Mul(SWAP, SWAP), ID4) <= TOL, 'SWAP^2 must be 1');
  const field = combo([[1, 0, ZA], [1, 0, ZB]]);
  const comm = op4Distance(op4Mul(SWAP, field), op4Mul(field, SWAP));
  assert.ok(comm <= TOL, `[SWAP, Z_A + Z_B] = ${comm}, want 0`);
  assert.ok(op4Distance(op4Mul(op4Mul(SWAP, ZA), SWAP), ZB) <= TOL, 'SWAP Z_A SWAP must be Z_B');
  // Triplet +1 and singlet -3.
  const singlet = zeroState(QUBITS);
  singlet.re[0] = 0;
  singlet.re[1] = Math.SQRT1_2;
  singlet.re[2] = -Math.SQRT1_2;
  const sig = op4Apply(SIGMA_DOT, singlet);
  for (let k = 0; k < DIM; k++) {
    assert.ok(Math.abs(sig.re[k] + 3 * singlet.re[k]) <= TOL && Math.abs(sig.im[k]) <= TOL, 'singlet must have sigma.sigma = -3');
  }
  for (const k of [0, 3]) {
    const e = zeroState(QUBITS);
    e.re[0] = 0;
    e.re[k] = 1;
    assert.ok(stateDistance(op4Apply(SIGMA_DOT, e), e) <= TOL, `|${k.toString(2).padStart(2, '0')}> is a triplet: sigma.sigma = +1`);
  }
  let worstHerm = 0;
  for (let r = 0; r < RANDOM_OPERATORS; r++) {
    const H = hamiltonian(uniform(-RATE_MAX, RATE_MAX), uniform(-RATE_MAX, RATE_MAX));
    worstHerm = Math.max(worstHerm, op4Distance(H, op4Adjoint(H)));
  }
  assert.ok(worstHerm <= TOL, `H is not Hermitian: |H - H^dagger| = ${worstHerm}`);
  return `|sigma.sigma - (2 SWAP - 1)| = ${dirac.toExponential(2)}, |[SWAP, Z_A + Z_B]| = ${comm.toExponential(2)}, CNOT SWAP ${worstSwap.toExponential(2)}, |H - H^dagger| = ${worstHerm.toExponential(2)}`;
});

check(`U(t) factorization equals exp(-iHt) for ${RANDOM_OPERATORS} random (J, omega, t)`, () => {
  let worst = 0;
  let worstUnitary = 0;
  for (let r = 0; r < RANDOM_OPERATORS; r++) {
    const J = uniform(-RATE_MAX, RATE_MAX);
    const omega = uniform(-RATE_MAX, RATE_MAX);
    const t = uniform(-TIME_MAX, TIME_MAX);
    const exact = expm4(combo([[0, -t, hamiltonian(J, omega)]]));
    worstUnitary = Math.max(worstUnitary, op4Distance(op4Mul(op4Adjoint(exact), exact), ID4));
    const err = op4Distance(factoredU(J, omega, t), exact);
    worst = Math.max(worst, err);
    assert.ok(err <= TOL, `J ${J}, omega ${omega}, t ${t}: factored U differs from exp(-iHt) by ${err}`);
  }
  assert.ok(worstUnitary <= TOL, `exp(-iHt) not unitary to ${worstUnitary}`);
  return `max |U_factored - exp(-iHt)| = ${worst.toExponential(2)}, max |U^dagger U - 1| = ${worstUnitary.toExponential(2)}`;
});

check('product states: Ry(theta) then Rz(phi) gives blochFromAngles(theta, phi)', () => {
  const presets = [
    [0, 0],
    [Math.PI, 0],
    [Math.PI / 2, 0],
    [Math.PI / 2, Math.PI / 2],
    [Math.PI / 2, Math.PI],
    [Math.PI / 2, -Math.PI / 2],
  ];
  /** @type {Vec3[]} */
  const axes = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0]];
  presets.forEach(([th, ph], k) => {
    const err = vecDistance(blochFromAngles(th, ph), axes[k]);
    assert.ok(err <= TOL, `blochFromAngles(${th}, ${ph}) off its axis by ${err}`);
  });
  let worst = 0;
  const angles = presets.map(([theta, phi]) => ({ theta, phi }));
  for (let r = 0; r < RANDOM_PREPS; r++) angles.push(randomAngles());
  for (let r = 0; r < angles.length; r++) {
    const A = angles[r];
    const B = angles[(r * 7 + 3) % angles.length];
    const st = productState(A.theta, A.phi, B.theta, B.phi);
    assert.ok(Math.abs(normSquared(st) - 1) <= TOL, 'prepared state is not normalized');
    const eA = vecDistance(blochVector(st, 0), blochFromAngles(A.theta, A.phi));
    const eB = vecDistance(blochVector(st, 1), blochFromAngles(B.theta, B.phi));
    worst = Math.max(worst, eA, eB);
    assert.ok(eA <= TOL && eB <= TOL, `prepared Bloch vectors off by ${Math.max(eA, eB)}`);
    assert.ok(concurrenceFromAmplitudes(st) <= TOL, 'a product state must have C = 0');
  }
  return `${angles.length} preparations, max deviation ${worst.toExponential(2)}`;
});

check(`closed form equals the exact evolution for ${RANDOM_CASES} random (a, b, J, omega, t)`, () => {
  let worstRoutes = 0;
  let worstExpm = 0;
  let worstBloch = 0;
  let worstC = 0;
  let flippedMiss = 0;
  const out = new Float64Array(PAIR_OUT_LENGTH);
  for (let r = 0; r < RANDOM_CASES; r++) {
    const { thA, phA, thB, phB, a, b, J, omega, t } = randomCase();
    const psi0 = productState(thA, phA, thB, phB);
    const viaCnots = evolveStatevector(psi0, J, omega, t, 'cnot');
    const viaPerm = evolveStatevector(psi0, J, omega, t, 'permutation');
    const viaExpm = op4Apply(expm4(combo([[0, -t, hamiltonian(J, omega)]])), psi0);
    worstRoutes = Math.max(worstRoutes, stateDistance(viaCnots, viaPerm));
    worstExpm = Math.max(worstExpm, stateDistance(viaCnots, viaExpm));
    entangledPair(a, b, J, omega, t, out);
    const rA = blochVector(viaCnots, 0);
    const rB = blochVector(viaCnots, 1);
    const eBloch = Math.max(vecDistance(out.subarray(0, 3), rA), vecDistance(out.subarray(3, 6), rB));
    worstBloch = Math.max(worstBloch, eBloch);
    assert.ok(eBloch <= TOL, `case ${r}: Bloch vectors differ from the statevector by ${eBloch}`);
    const eC = Math.abs(out[6] - concurrenceFromAmplitudes(viaCnots));
    worstC = Math.max(worstC, eC);
    assert.ok(eC <= TOL, `case ${r}: C = ${out[6]} but 2|psi00 psi11 - psi01 psi10| = ${concurrenceFromAmplitudes(viaCnots)}`);
    // The opposite sign of the a x b term must be caught.
    const n = cross3(a, b);
    const c2 = Math.cos((J * t) / 2) ** 2;
    const s2 = Math.sin((J * t) / 2) ** 2;
    const k = Math.sin(J * t) / 2;
    const wrongA = [0, 1, 2].map((i) => c2 * a[i] + s2 * b[i] + k * n[i]);
    flippedMiss = Math.max(flippedMiss, vecDistance(rotZ(wrongA, omega * t), rA));
  }
  assert.ok(worstRoutes <= TOL, `CNOT and permutation SWAP routes differ by ${worstRoutes}`);
  assert.ok(worstExpm <= TOL, `statevector route differs from exp(-iHt)|ab> by ${worstExpm}`);
  assert.ok(flippedMiss > SIGN_MARGIN, `a flipped a x b sign would pass (max miss ${flippedMiss}): the check cannot see the sign`);
  return (
    `seed ${SEED}: Bloch ${worstBloch.toExponential(2)}, C ${worstC.toExponential(2)}, ` +
    `CNOT vs permutation ${worstRoutes.toExponential(2)}, vs exp(-iHt) ${worstExpm.toExponential(2)}; ` +
    `the opposite a x b sign would miss by up to ${flippedMiss.toFixed(3)}`
  );
});

check('identities: |r_A|^2 + C^2 = |r_B|^2 + C^2 = 1, r_A + r_B = R_z(omega t)(a + b), C <= C_max', () => {
  let worstTangle = 0;
  let worstSum = 0;
  let worstLen = 0;
  const out = new Float64Array(PAIR_OUT_LENGTH);
  for (let r = 0; r < RANDOM_CASES; r++) {
    const { a, b, J, omega, t } = randomCase();
    entangledPair(a, b, J, omega, t, out);
    const C = out[6];
    const lenA2 = out[0] ** 2 + out[1] ** 2 + out[2] ** 2;
    const lenB2 = out[3] ** 2 + out[4] ** 2 + out[5] ** 2;
    // Compared in squares: sqrt(1 - C^2) amplifies rounding near C = 1.
    const eT = Math.max(Math.abs(lenA2 + C * C - 1), Math.abs(lenB2 + C * C - 1));
    worstTangle = Math.max(worstTangle, eT);
    assert.ok(eT <= TOL, `|r|^2 + C^2 - 1 = ${eT} at case ${r}`);
    // Away from C = 1 the lengths themselves match sqrt(1 - C^2).
    if (C < 0.99) {
      const eL = Math.max(Math.abs(Math.sqrt(lenA2) - Math.sqrt(1 - C * C)), Math.abs(Math.sqrt(lenB2) - Math.sqrt(1 - C * C)));
      worstLen = Math.max(worstLen, eL);
      assert.ok(eL <= TOL, `|r| differs from sqrt(1 - C^2) by ${eL}`);
    }
    const sum = rotZ([a[0] + b[0], a[1] + b[1], a[2] + b[2]], omega * t);
    const eS = vecDistance([out[0] + out[3], out[1] + out[4], out[2] + out[5]], sum);
    worstSum = Math.max(worstSum, eS);
    assert.ok(eS <= TOL, `r_A + r_B differs from R_z(omega t)(a + b) by ${eS}`);
    assert.ok(C <= concurrenceMax(a, b) + TOL && C >= 0, `C = ${C} outside [0, C_max]`);
    assert.ok(lenA2 <= 1 + TOL && lenB2 <= 1 + TOL, 'a Bloch vector left the sphere');
  }
  return `max | |r|^2 + C^2 - 1 | = ${worstTangle.toExponential(2)}, | |r| - sqrt(1 - C^2) | = ${worstLen.toExponential(2)}, total spin ${worstSum.toExponential(2)}`;
});

check('limits: J = 0, a = b, (+z, -z) at omega = 0, full swap at J t = pi, Heisenberg slope at t = 0', () => {
  const out = new Float64Array(PAIR_OUT_LENGTH);
  let worst = 0;
  /** @param {number} e @param {string} what */
  const ok = (e, what) => {
    worst = Math.max(worst, e);
    assert.ok(e <= TOL, `${what}: off by ${e}`);
  };
  for (let r = 0; r < RANDOM_CASES; r++) {
    const { a, b, J, omega, t } = randomCase();
    // J = 0: pure precession, no entanglement.
    entangledPair(a, b, 0, omega, t, out);
    ok(out[6], 'J = 0 must give C = 0');
    ok(vecDistance(out.subarray(0, 3), rotZ(a, omega * t)), 'J = 0: r_A must be R_z(omega t) a');
    ok(vecDistance(out.subarray(3, 6), rotZ(b, omega * t)), 'J = 0: r_B must be R_z(omega t) b');
    // a = b: the symmetric product state never entangles.
    entangledPair(a, a, J, omega, t, out);
    ok(out[6], 'a = b must give C = 0');
    ok(vecDistance(out.subarray(0, 3), rotZ(a, omega * t)), 'a = b: r_A must be R_z(omega t) a');
    ok(vecDistance(out.subarray(3, 6), rotZ(a, omega * t)), 'a = b: r_B must be R_z(omega t) a');
    // a = +z, b = -z, omega = 0: r_A = cos(Jt) z, C = |sin Jt|.
    entangledPair([0, 0, 1], [0, 0, -1], J, 0, t, out);
    ok(vecDistance(out.subarray(0, 3), [0, 0, Math.cos(J * t)]), '(+z, -z): r_A must be cos(Jt) z');
    ok(vecDistance(out.subarray(3, 6), [0, 0, -Math.cos(J * t)]), '(+z, -z): r_B must be -cos(Jt) z');
    ok(Math.abs(out[6] - Math.abs(Math.sin(J * t))), '(+z, -z): C must be |sin Jt|');
    // omega = 0, J t = pi: a full SWAP.
    if (J !== 0) {
      entangledPair(a, b, J, 0, Math.PI / J, out);
      ok(vecDistance(out.subarray(0, 3), b), 'J t = pi: r_A must be b');
      ok(vecDistance(out.subarray(3, 6), a), 'J t = pi: r_B must be a');
    }
  }
  // The (+z, -z) Bell state at J t = pi/2: C = 1, both vectors at the center.
  entangledPair([0, 0, 1], [0, 0, -1], 1, 0, Math.PI / 2, out);
  ok(Math.abs(out[6] - 1), 'Bell point: C must be 1');
  ok(Math.hypot(out[0], out[1], out[2]), 'Bell point: r_A must vanish');
  // Heisenberg equation at t = 0, from the exact statevector (header, point 4):
  // dr_A/dt = omega z x a - (J/2) a x b and dr_B/dt = omega z x b + (J/2) a x b.
  let worstSlope = 0;
  for (let r = 0; r < RANDOM_CASES / 4; r++) {
    const { thA, phA, thB, phB, a, b, J, omega } = randomCase();
    const psi0 = productState(thA, phA, thB, phB);
    const plus = evolveStatevector(psi0, J, omega, SLOPE_STEP, 'permutation');
    const minus = evolveStatevector(psi0, J, omega, -SLOPE_STEP, 'permutation');
    const n = cross3(a, b);
    for (const [q, v, sign] of /** @type {Array<[number, Vec3, number]>} */ ([[0, a, -1], [1, b, 1]])) {
      const p = blochVector(plus, q);
      const m = blochVector(minus, q);
      const slope = [0, 1, 2].map((i) => (p[i] - m[i]) / (2 * SLOPE_STEP));
      const zx = cross3([0, 0, 1], v);
      const want = [0, 1, 2].map((i) => omega * zx[i] + sign * (J / 2) * n[i]);
      const e = vecDistance(slope, want);
      worstSlope = Math.max(worstSlope, e);
      assert.ok(e <= SLOPE_TOL, `dr/dt at t = 0 for q${q} off by ${e} (want omega z x v ${sign > 0 ? '+' : '-'} (J/2) a x b)`);
    }
  }
  return `max deviation ${worst.toExponential(2)}; Heisenberg slope ${worstSlope.toExponential(2)} (tol ${SLOPE_TOL})`;
});

check('seamless loop: psi(L) = (-i)^m psi(0) for whole m, n; the shipped figure repeats only after L', () => {
  let worstPhase = 0;
  let worstFrame = 0;
  const out0 = new Float64Array(PAIR_OUT_LENGTH);
  const outL = new Float64Array(PAIR_OUT_LENGTH);
  for (const [L, m, n] of LOOP_CASES) {
    const { J, omega } = loopRates(L, m, n);
    assert.ok(Math.abs(J * L - 2 * Math.PI * m) <= TOL * L && Math.abs(omega * L - 2 * Math.PI * n) <= TOL * L, 'loopRates must give J L = 2 pi m, omega L = 2 pi n');
    for (let r = 0; r < RANDOM_CASES / 8; r++) {
      const { thA, phA, thB, phB, a, b } = randomCase();
      const psi0 = productState(thA, phA, thB, phB);
      const psiL = evolveStatevector(psi0, J, omega, L, 'cnot');
      const [ore, oim] = overlap(psi0, psiL);
      // (-i)^m: 1, -i, -1, i for m mod 4 = 0, 1, 2, 3.
      const want = [[1, 0], [0, -1], [-1, 0], [0, 1]][m % 4];
      const e = Math.max(Math.abs(Math.hypot(ore, oim) - 1), Math.hypot(ore - want[0], oim - want[1]));
      worstPhase = Math.max(worstPhase, e);
      assert.ok(e <= TOL, `(L ${L}, m ${m}, n ${n}): <psi(0)|psi(L)> = ${ore} + ${oim}i, want (-i)^${m}`);
      entangledPair(a, b, J, omega, 0, out0);
      entangledPair(a, b, J, omega, L, outL);
      const f = vecDistance(out0, outL);
      worstFrame = Math.max(worstFrame, f);
      assert.ok(f <= TOL, `(L ${L}, m ${m}, n ${n}): frame at L differs from t = 0 by ${f}`);
    }
  }
  // No shorter loop for the shipped pair: the frame at L/k is not the start frame.
  const { a, b, L, m, n } = ENTANGLE_PAIR;
  const { J, omega } = loopRates(L, m, n);
  entangledPair(a, b, J, omega, 0, out0);
  let closest = Infinity;
  for (let k = 2; k <= MIN_PERIOD_DIVISORS; k++) {
    entangledPair(a, b, J, omega, L / k, outL);
    closest = Math.min(closest, vecDistance(out0, outL));
  }
  assert.ok(closest > MIN_PERIOD_GAP, `the shipped frame nearly repeats at some L/k (gap ${closest})`);
  return `${LOOP_CASES.length} (L, m, n) x ${RANDOM_CASES / 8} states: overlap ${worstPhase.toExponential(2)}, frames ${worstFrame.toExponential(2)}; shipped frame at L/k (k = 2..${MIN_PERIOD_DIVISORS}) stays >= ${closest.toFixed(3)} away`;
});

check('shipped ENTANGLE_PAIR: a . b, |a x b|, C_max, off the z axis, coprime loop, C(t*) = C_max', () => {
  const { a, b, L, m, n } = ENTANGLE_PAIR;
  assert.ok(Math.abs(norm3(a) - 1) <= TOL && Math.abs(norm3(b) - 1) <= TOL, 'shipped vectors must be unit');
  const d = dot3(a, b);
  const cross = norm3(cross3(a, b));
  const cMax = concurrenceMax(a, b);
  assert.ok(d >= SHIPPED_DOT_RANGE[0] && d <= SHIPPED_DOT_RANGE[1], `a . b = ${d} outside [${SHIPPED_DOT_RANGE}]`);
  assert.ok(Math.abs(d + (5 * Math.SQRT2) / 8) <= TOL, `a . b = ${d}, want -5 sqrt(2)/8 (header comment)`);
  assert.ok(cross >= SHIPPED_MIN_CROSS, `|a x b| = ${cross} < ${SHIPPED_MIN_CROSS}: too close to collinear`);
  assert.ok(cMax >= SHIPPED_CMAX_RANGE[0] && cMax <= SHIPPED_CMAX_RANGE[1], `C_max = ${cMax} outside [${SHIPPED_CMAX_RANGE}]`);
  assert.ok(Math.abs(cMax - (0.5 + (5 * Math.SQRT2) / 16)) <= TOL, `C_max = ${cMax}, want 1/2 + 5 sqrt(2)/16`);
  for (const [name, v] of /** @type {Array<[string, readonly number[]]>} */ ([['a', a], ['b', b]])) {
    const transverse = Math.hypot(v[0], v[1]);
    assert.ok(transverse >= SHIPPED_MIN_TRANSVERSE, `${name} is within 30 deg of the z axis (transverse ${transverse})`);
  }
  assert.ok(L > 0 && Number.isInteger(m) && Number.isInteger(n) && m >= 1 && n >= 1, `bad loop (L ${L}, m ${m}, n ${n})`);
  /** @param {number} x @param {number} y @returns {number} */
  const gcd = (x, y) => (y === 0 ? x : gcd(y, x % y));
  assert.equal(gcd(m, n), 1, `gcd(m, n) = ${gcd(m, n)}: the figure would repeat before L`);
  const { J, omega } = loopRates(L, m, n);
  assert.ok(Math.abs(ENTANGLE_MAX_TIME - L / (4 * m)) <= TOL, `ENTANGLE_MAX_TIME = ${ENTANGLE_MAX_TIME}, want L/(4m)`);
  assert.ok(Math.abs(J * ENTANGLE_MAX_TIME - Math.PI / 2) <= TOL, 'J t* must be pi/2');
  const out = entangledPair(a, b, J, omega, ENTANGLE_MAX_TIME);
  assert.ok(Math.abs(out[6] - cMax) <= TOL, `C(t*) = ${out[6]}, want C_max = ${cMax}`);
  const lenAtPeak = Math.hypot(out[0], out[1], out[2]);
  assert.ok(Math.abs(lenAtPeak - Math.sqrt(1 - cMax * cMax)) <= TOL, `|r_A(t*)| = ${lenAtPeak}, want sqrt(1 - C_max^2)`);
  // t* is the FIRST peak: C rises strictly on (0, t*].
  let prev = -1;
  for (let k = 1; k <= RISE_SAMPLES; k++) {
    const C = entangledPair(a, b, J, omega, (ENTANGLE_MAX_TIME * k) / RISE_SAMPLES)[6];
    assert.ok(C > prev, `C is not rising before t* (sample ${k}: ${C} <= ${prev})`);
    prev = C;
  }
  assert.ok(Object.isFrozen(ENTANGLE_PAIR) && Object.isFrozen(a) && Object.isFrozen(b), 'ENTANGLE_PAIR must be frozen');
  return `a . b = ${d.toFixed(5)}, |a x b| = ${cross.toFixed(3)}, C_max = ${cMax.toFixed(5)}, L = ${L} s, (m, n) = (${m}, ${n}), t* = ${ENTANGLE_MAX_TIME} s, |r(t*)| = ${lenAtPeak.toFixed(4)}`;
});

check('invalid input fails loudly', () => {
  const { a, b } = ENTANGLE_PAIR;
  const offSphere = 1 + 10 * UNIT_TOL;
  const guards = /** @type {Array<[string, () => unknown]>} */ ([
    ['non-unit a', () => entangledPair([offSphere, 0, 0], b, 1, 1, 1)],
    ['NaN in b', () => entangledPair(a, [Number.NaN, 0, 1], 1, 1, 1)],
    ['2-vector a', () => entangledPair([1, 0], b, 1, 1, 1)],
    ['NaN J', () => entangledPair(a, b, Number.NaN, 1, 1)],
    ['infinite t', () => entangledPair(a, b, 1, 1, Number.POSITIVE_INFINITY)],
    ['short out', () => entangledPair(a, b, 1, 1, 1, new Float64Array(PAIR_OUT_LENGTH - 1))],
    ['L = 0', () => loopRates(0, 1, 1)],
    ['L < 0', () => loopRates(-48, 2, 3)],
    ['NaN L', () => loopRates(Number.NaN, 2, 3)],
    ['m = 0', () => loopRates(48, 0, 3)],
    ['fractional n', () => loopRates(48, 2, 1.5)],
    ['NaN angle', () => blochFromAngles(Number.NaN, 0)],
    ['non-unit concurrenceMax input', () => concurrenceMax([2, 0, 0], a)],
  ]);
  for (const [what, fn] of guards) assert.throws(fn, RangeError, `${what} must throw RangeError`);
  return `${guards.length} guards throw RangeError`;
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log(
  `[setup] lib/physics/entangle.mjs: ${QUBITS} qubits (dim ${DIM}), tol ${TOL}, seed ${SEED}, ` +
    `${RANDOM_CASES} random cases; node ${process.version}, ${os.platform()}-${os.arch()}`,
);
let failed = 0;
checks.forEach(([name, fn], i) => {
  const tag = `[${i + 1}/${checks.length}]`;
  try {
    const detail = fn();
    console.log(`${tag} ${name}: ok (${detail})`);
  } catch (err) {
    failed++;
    console.error(`${tag} ${name}: FAILED`);
    console.error(err instanceof Error ? err.message : err);
  }
});
if (failed > 0) {
  console.error(`[fail] ${failed} of ${checks.length} checks failed`);
  process.exitCode = 1;
} else {
  console.log(`[done] ${checks.length}/${checks.length} checks passed`);
}
