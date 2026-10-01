// @ts-check
/**
 * Verifies lib/physics/qubits.mjs, the statevector simulator that
 * verify-entangle.mjs uses as its reference. Every check compares against an
 * analytical result (the derivation in the module header) at TOL = 1e-12.
 *
 * Usage: node scripts/verify-qubits.mjs   (exit code 1 on any failure)
 *
 * Random inputs come from a seeded PRNG (mulberry32), so every run draws the
 * same states; the seed is printed in the [setup] line.
 */

import assert from 'node:assert/strict';
import os from 'node:os';

import {
  H,
  I2,
  INPUT_PRESETS,
  MAX_QUBITS,
  Rx,
  Ry,
  Rz,
  S,
  TELEPORT_LAST_STEP,
  TELEPORT_QUBITS,
  TELEPORT_STEPS,
  TOL,
  X,
  Y,
  Z,
  adjoint,
  applyControlled,
  applyGate,
  applySingle,
  blochLength,
  blochVector,
  cloneState,
  cnot,
  cz,
  inputBloch,
  isHermitian,
  isUnitary,
  mat2,
  matDistance,
  matMul,
  matPow,
  normSquared,
  numQubits,
  reducedDensity,
  teleportInitialState,
  teleportationBlochAt,
  teleportationStates,
  teleportationSteps,
  zeroState,
} from '../lib/physics/qubits.mjs';

/** @typedef {import('../lib/physics/qubits.mjs').StateVector} StateVector */
/** @typedef {import('../lib/physics/qubits.mjs').Mat2} Mat2 */
/** @typedef {import('../lib/physics/qubits.mjs').Vec3} Vec3 */

const SEED = 20260930;
const RANDOM_INPUTS = 200; // teleportation inputs, uniform on the Bloch sphere
const RANDOM_REGISTERS = 50; // generic (entangled) 3-qubit states
const ANGLE_SAMPLES = 13; // rotation angles per axis in [-2 pi, 2 pi]
const POWER_SAMPLES = 11; // fractional exponents in [0, 1]
const PATH_SAMPLES_PER_STEP = 16; // fractional frames per gate
const LEFT_LIMIT_EPS = 1e-9; // circuit-position offset for continuity checks
const LEFT_LIMIT_TOL = 1e-6; // |dr| allowed at that offset (Lipschitz ~ pi)

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

/**
 * Standard normal deviate (Box-Muller); 1 - u keeps log away from 0.
 *
 * @returns {number}
 */
function gaussian() {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Input angles uniform on the sphere: cos(theta) ~ U[-1, 1], phi ~ U[0, 2 pi).
 *
 * @returns {{ theta: number, phi: number }}
 */
function randomInput() {
  return { theta: Math.acos(1 - 2 * rand()), phi: 2 * Math.PI * rand() };
}

/**
 * Haar-like random normalized n-qubit state (i.i.d. complex Gaussians).
 *
 * @param {number} n
 * @returns {StateVector}
 */
function randomState(n) {
  const state = zeroState(n);
  for (let k = 0; k < state.re.length; k++) {
    state.re[k] = gaussian();
    state.im[k] = gaussian();
  }
  const norm = Math.sqrt(normSquared(state));
  for (let k = 0; k < state.re.length; k++) {
    state.re[k] /= norm;
    state.im[k] /= norm;
  }
  return state;
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
  for (let k = 0; k < a.re.length; k++) {
    worst = Math.max(worst, Math.hypot(a.re[k] - b.re[k], a.im[k] - b.im[k]));
  }
  return worst;
}

/**
 * Largest componentwise |u - v|.
 *
 * @param {ArrayLike<number>} u
 * @param {ArrayLike<number>} v
 * @returns {number}
 */
function vecDistance(u, v) {
  let worst = 0;
  for (let k = 0; k < u.length; k++) worst = Math.max(worst, Math.abs(u[k] - v[k]));
  return worst;
}

/**
 * Basis index holding the (single) nonzero amplitude of a basis state.
 *
 * @param {StateVector} state
 * @returns {number}
 */
function basisIndex(state) {
  const hits = [];
  for (let k = 0; k < state.re.length; k++) {
    if (Math.hypot(state.re[k], state.im[k]) > 1 - TOL) hits.push(k);
  }
  assert.equal(hits.length, 1, `expected a basis state, found ${hits.length} unit amplitudes`);
  return hits[0];
}

/**
 * The analytic step table (module header, point 6) for input angles.
 *
 * @param {number} theta
 * @param {number} phi
 * @returns {Vec3[][]}
 */
function analyticTable(theta, phi) {
  const r = inputBloch(theta, phi);
  const c = Math.cos(theta);
  /** @type {Vec3} */ const ex = [1, 0, 0];
  /** @type {Vec3} */ const ez = [0, 0, 1];
  /** @type {Vec3} */ const zero = [0, 0, 0];
  return [
    [r, ez, ez],
    [r, ex, ez],
    [r, zero, zero],
    [[0, 0, c], zero, zero],
    [[c, 0, 0], zero, zero],
    [[c, 0, 0], ex, [0, 0, c]],
    [ex, ex, r],
  ];
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

check('Hilbert space and qubit order (q0 = most significant bit)', () => {
  const st = zeroState(TELEPORT_QUBITS);
  assert.equal(st.re.length, 2 ** TELEPORT_QUBITS, 'dimension must be 2^3 = 8');
  assert.equal(numQubits(st), TELEPORT_QUBITS);
  assert.equal(basisIndex(applySingle(zeroState(3), X, 0)), 0b100, 'X on q0 of |000> must give |100> = 4');
  assert.equal(basisIndex(applySingle(zeroState(3), X, 1)), 0b010, 'X on q1 of |000> must give |010> = 2');
  assert.equal(basisIndex(applySingle(zeroState(3), X, 2)), 0b001, 'X on q2 of |000> must give |001> = 1');
  assert.equal(basisIndex(cnot(applySingle(zeroState(3), X, 0), 0, 1)), 0b110, 'CNOT(q0 -> q1)|100> = |110>');
  assert.equal(basisIndex(cnot(applySingle(zeroState(3), X, 1), 0, 1)), 0b010, 'CNOT(q0 -> q1)|010> = |010>');
  assert.equal(basisIndex(cnot(applySingle(zeroState(3), X, 2), 2, 0)), 0b101, 'CNOT(q2 -> q0)|001> = |101>');
  // |1> on q0 only: the Bloch vectors read (-z, +z, +z) left to right.
  const one = teleportInitialState(Math.PI, 0);
  assert.ok(Math.abs(one.re[0b100] - 1) <= TOL, 'input |1> must sit at index 4');
  const b = [0, 1, 2].map((q) => blochVector(one, q));
  const err = vecDistance(b.flat(), [0, 0, -1, 0, 0, 1, 0, 0, 1]);
  assert.ok(err <= TOL, `Bloch vectors of |100> off by ${err}`);
  // CZ is diagonal: -1 exactly on |1?1>, for both argument orders.
  for (const [a, c] of [[0, 2], [2, 0]]) {
    const st2 = zeroState(3);
    st2.re.fill(1);
    cz(st2, a, c);
    const signs = Array.from(st2.re);
    assert.deepEqual(signs, [1, 1, 1, 1, 1, -1, 1, -1], `CZ(${a}, ${c}) sign pattern`);
  }
  return 'dim 8; X on q0/q1/q2 -> 4/2/1; CNOT and CZ index maps as expected';
});

check('gate matrices are unitary (and the fractional powers)', () => {
  let worst = 0;
  let count = 0;
  /** @param {Mat2} U @param {string} name */
  const unitary = (U, name) => {
    const err = matDistance(matMul(U, adjoint(U)), I2);
    worst = Math.max(worst, err);
    count++;
    assert.ok(isUnitary(U) && err <= TOL, `${name} is not unitary: |U U^dagger - I| = ${err}`);
  };
  for (const [name, U] of /** @type {Array<[string, Mat2]>} */ ([['I', I2], ['H', H], ['X', X], ['Y', Y], ['Z', Z], ['S', S]])) {
    unitary(U, name);
  }
  for (let k = 0; k < ANGLE_SAMPLES; k++) {
    const t = -2 * Math.PI + (4 * Math.PI * k) / (ANGLE_SAMPLES - 1);
    unitary(Rx(t), `Rx(${t.toFixed(3)})`);
    unitary(Ry(t), `Ry(${t.toFixed(3)})`);
    unitary(Rz(t), `Rz(${t.toFixed(3)})`);
    // exp(-i t sigma / 2) = cos(t/2) I - i sin(t/2) sigma.
    const c = Math.cos(t / 2);
    const s = Math.sin(t / 2);
    for (const [R, P, name] of /** @type {Array<[Mat2, Mat2, string]>} */ ([[Rx(t), X, 'Rx'], [Ry(t), Y, 'Ry'], [Rz(t), Z, 'Rz']])) {
      const expected = mat2(
        [0, 1, 2, 3].map((j) => c * I2.re[j] + s * P.im[j]),
        [0, 1, 2, 3].map((j) => c * I2.im[j] - s * P.re[j]),
      );
      const err = matDistance(R, expected);
      assert.ok(err <= TOL, `${name}(${t}) differs from cos I - i sin sigma by ${err}`);
    }
  }
  // H = (X + Z)/sqrt 2, and H, X, Y, Z are Hermitian involutions.
  const hFromPaulis = mat2([0, 1, 2, 3].map((j) => (X.re[j] + Z.re[j]) * Math.SQRT1_2), [0, 0, 0, 0]);
  assert.ok(matDistance(H, hFromPaulis) <= TOL, 'H must equal (X + Z)/sqrt 2');
  for (const [name, G] of /** @type {Array<[string, Mat2]>} */ ([['H', H], ['X', X], ['Y', Y], ['Z', Z]])) {
    assert.ok(isHermitian(G), `${name} must be Hermitian`);
    assert.ok(matDistance(matMul(G, G), I2) <= TOL, `${name}^2 must be I`);
    assert.ok(matDistance(matPow(G, 0), I2) <= TOL, `${name}^0 must be I`);
    assert.ok(matDistance(matPow(G, 1), G) <= TOL, `${name}^1 must be ${name}`);
    const half = matPow(G, 0.5);
    assert.ok(matDistance(matMul(half, half), G) <= TOL, `(${name}^1/2)^2 must be ${name}`);
    for (let k = 0; k < POWER_SAMPLES; k++) {
      const f = k / (POWER_SAMPLES - 1);
      const P = matPow(G, f);
      unitary(P, `${name}^${f.toFixed(2)}`);
      // G^f = e^{i pi f / 2} (cos(pi f/2) I - i sin(pi f/2) G)  (header, point 7)
      const a = (Math.PI * f) / 2;
      const [pr, pi] = [Math.cos(a), Math.sin(a)];
      const inner = mat2(
        [0, 1, 2, 3].map((j) => Math.cos(a) * I2.re[j] + Math.sin(a) * G.im[j]),
        [0, 1, 2, 3].map((j) => Math.cos(a) * I2.im[j] - Math.sin(a) * G.re[j]),
      );
      const expected = mat2(
        [0, 1, 2, 3].map((j) => pr * inner.re[j] - pi * inner.im[j]),
        [0, 1, 2, 3].map((j) => pr * inner.im[j] + pi * inner.re[j]),
      );
      const err = matDistance(P, expected);
      assert.ok(err <= TOL, `${name}^${f} differs from the exponential form by ${err}`);
    }
  }
  return `${count} matrices, max |U U^dagger - I| = ${worst.toExponential(2)}`;
});

check('norm preserved after every gate', () => {
  let worst = 0;
  let applications = 0;
  const powers = [0.137, 0.5, 0.861];
  for (let r = 0; r < RANDOM_REGISTERS; r++) {
    const st = randomState(TELEPORT_QUBITS);
    /** @param {string} what */
    const probe = (what) => {
      const err = Math.abs(normSquared(st) - 1);
      worst = Math.max(worst, err);
      applications++;
      assert.ok(err <= TOL, `norm drifted by ${err} after ${what}`);
    };
    const t = 2 * Math.PI * rand();
    for (let q = 0; q < TELEPORT_QUBITS; q++) {
      for (const [name, U] of /** @type {Array<[string, Mat2]>} */ ([['H', H], ['X', X], ['Y', Y], ['Z', Z], ['S', S], ['Rx', Rx(t)], ['Ry', Ry(t)], ['Rz', Rz(t)]])) {
        applySingle(st, U, q);
        probe(`${name} on q${q}`);
      }
    }
    for (let c = 0; c < TELEPORT_QUBITS; c++) {
      for (let tq = 0; tq < TELEPORT_QUBITS; tq++) {
        if (c === tq) continue;
        cnot(st, c, tq);
        probe(`CNOT q${c} -> q${tq}`);
        cz(st, c, tq);
        probe(`CZ q${c}, q${tq}`);
        for (const f of powers) {
          applyGate(st, { name: 'CNOT', targets: [tq], controls: [c] }, f);
          probe(`CNOT^${f} q${c} -> q${tq}`);
          applyGate(st, { name: 'CZ', targets: [tq], controls: [c] }, f);
          probe(`CZ^${f} q${c}, q${tq}`);
        }
      }
    }
    // Toffoli-style doubly controlled gate through the same code path.
    applyControlled(st, H, [0, 1], 2);
    probe('controlled-controlled-H');
  }
  // And along the protocol itself.
  for (let k = 0; k < RANDOM_INPUTS; k++) {
    const { theta, phi } = randomInput();
    for (const st of teleportationStates(theta, phi)) {
      const err = Math.abs(normSquared(st) - 1);
      worst = Math.max(worst, err);
      applications++;
      assert.ok(err <= TOL, `teleportation step norm drifted by ${err}`);
    }
  }
  return `${applications} gate applications, max |<psi|psi> - 1| = ${worst.toExponential(2)}`;
});

check('reduced density matrices are valid qubit states', () => {
  let worstTrace = 0;
  let worstLen = 0;
  let minEig = Infinity;
  for (let r = 0; r < RANDOM_REGISTERS; r++) {
    const st = randomState(TELEPORT_QUBITS);
    for (let q = 0; q < TELEPORT_QUBITS; q++) {
      const rho = reducedDensity(st, q);
      const len = blochLength(blochVector(st, q));
      worstTrace = Math.max(worstTrace, Math.abs(rho.r00 + rho.r11 - 1));
      worstLen = Math.max(worstLen, len);
      // Eigenvalues of [[r00, c], [conj c, r11]]: (tr +- sqrt((r00 - r11)^2 + 4|c|^2)) / 2.
      const disc = Math.hypot(rho.r00 - rho.r11, 2 * Math.hypot(rho.re01, rho.im01));
      const lo = (rho.r00 + rho.r11 - disc) / 2;
      minEig = Math.min(minEig, lo);
      // Same eigenvalue from the Bloch length: (1 - |r|)/2.
      assert.ok(Math.abs(lo - (1 - len) / 2) <= TOL, `eigenvalue ${lo} disagrees with (1 - |r|)/2 = ${(1 - len) / 2}`);
    }
  }
  assert.ok(worstTrace <= TOL, `trace off by ${worstTrace}`);
  assert.ok(worstLen <= 1 + TOL, `Bloch length ${worstLen} exceeds 1`);
  assert.ok(minEig >= -TOL, `negative eigenvalue ${minEig}`);
  return `max |Tr rho - 1| = ${worstTrace.toExponential(2)}, max |r| = ${worstLen.toFixed(6)}, min eigenvalue = ${minEig.toExponential(2)}`;
});

check('input presets sit on the expected axes', () => {
  /** @type {Record<string, Vec3>} */
  const expected = { zero: [0, 0, 1], one: [0, 0, -1], plus: [1, 0, 0], 'plus-i': [0, 1, 0] };
  let worst = 0;
  for (const p of INPUT_PRESETS) {
    const exp = expected[p.id];
    assert.ok(exp, `no expected vector for preset ${p.id}`);
    const fromState = blochVector(teleportInitialState(p.theta, p.phi), 0);
    const err = Math.max(vecDistance(inputBloch(p.theta, p.phi), exp), vecDistance(fromState, exp));
    worst = Math.max(worst, err);
    assert.ok(err <= TOL, `preset ${p.ket} off its axis by ${err}`);
  }
  return `${INPUT_PRESETS.map((p) => p.ket).join(' ')}: max deviation ${worst.toExponential(2)}`;
});

check('Bell pair after step 2: q1 and q2 maximally mixed', () => {
  let worst = 0;
  for (let k = 0; k < RANDOM_INPUTS; k++) {
    const { theta, phi } = randomInput();
    const steps = teleportationSteps(theta, phi);
    const len1 = blochLength(steps[2].bloch[1]);
    const len2 = blochLength(steps[2].bloch[2]);
    worst = Math.max(worst, len1, len2);
    assert.ok(len1 <= TOL && len2 <= TOL, `step 2 |r1| = ${len1}, |r2| = ${len2} (want 0)`);
    // The whole register is |psi> (x) (|00> + |11>)/sqrt 2.
    const st = teleportationStates(theta, phi)[2];
    const psi = teleportInitialState(theta, phi);
    const a0 = [psi.re[0], psi.im[0]];
    const a1 = [psi.re[4], psi.im[4]];
    const r2 = Math.SQRT1_2;
    const want = zeroState(3);
    want.re[0] = 0;
    for (const [b0, amp] of /** @type {Array<[number, number[]]>} */ ([[0, a0], [1, a1]])) {
      for (const e of [0b00, 0b11]) {
        want.re[4 * b0 + e] = amp[0] * r2;
        want.im[4 * b0 + e] = amp[1] * r2;
      }
    }
    const dist = stateDistance(st, want);
    assert.ok(dist <= TOL, `step 2 register differs from |psi>|Phi+> by ${dist}`);
  }
  return `${RANDOM_INPUTS} inputs, max |r_q1|, |r_q2| = ${worst.toExponential(2)}`;
});

check('per-step Bloch vectors match the analytic table', () => {
  let worst = 0;
  const inputs = [...INPUT_PRESETS.map((p) => ({ theta: p.theta, phi: p.phi }))];
  for (let k = 0; k < RANDOM_INPUTS; k++) inputs.push(randomInput());
  for (const { theta, phi } of inputs) {
    const steps = teleportationSteps(theta, phi);
    assert.equal(steps.length, TELEPORT_LAST_STEP + 1);
    const table = analyticTable(theta, phi);
    steps.forEach((s, k) => {
      assert.equal(s.label, TELEPORT_STEPS[k].label);
      for (let q = 0; q < TELEPORT_QUBITS; q++) {
        const err = vecDistance(s.bloch[q], table[k][q]);
        worst = Math.max(worst, err);
        assert.ok(err <= TOL, `step ${k} q${q}: got ${s.bloch[q]}, want ${table[k][q]} (off by ${err})`);
        assert.ok(blochLength(s.bloch[q]) <= 1 + TOL, `step ${k} q${q} Bloch length exceeds 1`);
      }
    });
  }
  return `${inputs.length} inputs x 7 steps x 3 qubits, max deviation ${worst.toExponential(2)}`;
});

check(`teleportation fidelity = 1 for ${RANDOM_INPUTS} random inputs`, () => {
  let worstF = 0;
  let worstState = 0;
  for (let k = 0; k < RANDOM_INPUTS; k++) {
    const { theta, phi } = randomInput();
    const rIn = inputBloch(theta, phi);
    const rOut = teleportationSteps(theta, phi)[TELEPORT_LAST_STEP].bloch[2];
    const F = (1 + rIn[0] * rOut[0] + rIn[1] * rOut[1] + rIn[2] * rOut[2]) / 2;
    worstF = Math.max(worstF, Math.abs(F - 1));
    assert.ok(Math.abs(F - 1) <= TOL, `input (theta ${theta}, phi ${phi}): fidelity ${F}`);
    // Stronger: the register is exactly |+>|+>|psi> (header, point 5, step 6).
    const final = teleportationStates(theta, phi)[TELEPORT_LAST_STEP];
    const psi = teleportInitialState(theta, phi);
    const want = zeroState(3);
    want.re[0] = 0;
    for (let m = 0; m < 4; m++) {
      want.re[2 * m] = psi.re[0] / 2;
      want.im[2 * m] = psi.im[0] / 2;
      want.re[2 * m + 1] = psi.re[4] / 2;
      want.im[2 * m + 1] = psi.im[4] / 2;
    }
    worstState = Math.max(worstState, stateDistance(final, want));
  }
  assert.ok(worstState <= TOL, `final register differs from |+>|+>|psi> by ${worstState}`);
  return `seed ${SEED}: max |F - 1| = ${worstF.toExponential(2)}, max |psi_6 - |+>|+>|psi>| = ${worstState.toExponential(2)}`;
});

check('fractional frames: |r| <= 1, exact at steps, continuous, H turns rigidly', () => {
  let worstLen = 0;
  let worstStep = 0;
  let worstRigid = 0;
  let worstLeft = 0;
  let frames = 0;
  const out = new Float64Array(9);
  const inputs = [...INPUT_PRESETS.map((p) => ({ theta: p.theta, phi: p.phi }))];
  for (let k = 0; k < RANDOM_INPUTS; k++) inputs.push(randomInput());
  for (const { theta, phi } of inputs) {
    const states = teleportationStates(theta, phi);
    const steps = teleportationSteps(theta, phi);
    for (let k = 0; k <= TELEPORT_LAST_STEP; k++) {
      teleportationBlochAt(states, k, out);
      const err = vecDistance(out, steps[k].bloch.flat());
      worstStep = Math.max(worstStep, err);
      assert.ok(err <= TOL, `progress ${k} differs from step ${k} by ${err}`);
      if (k > 0) {
        teleportationBlochAt(states, k - LEFT_LIMIT_EPS, out);
        worstLeft = Math.max(worstLeft, vecDistance(out, steps[k].bloch.flat()));
      }
    }
    for (let i = 0; i <= TELEPORT_LAST_STEP * PATH_SAMPLES_PER_STEP; i++) {
      const p = i / PATH_SAMPLES_PER_STEP;
      teleportationBlochAt(states, p, out);
      frames++;
      for (let q = 0; q < TELEPORT_QUBITS; q++) {
        const len = blochLength(out, 3 * q);
        worstLen = Math.max(worstLen, len);
        assert.ok(len <= 1 + TOL, `progress ${p}: |r_q${q}| = ${len} exceeds 1`);
      }
      // Local gates (H on q1 at step 1, H on q0 at step 4) rotate one qubit's
      // vector rigidly and leave the others fixed.
      const k = Math.min(Math.floor(p), TELEPORT_LAST_STEP - 1);
      const gate = TELEPORT_STEPS[k + 1].gate;
      if (gate.controls.length === 0 && gate.name !== 'init') {
        const target = gate.targets[0];
        for (let q = 0; q < TELEPORT_QUBITS; q++) {
          const before = steps[k].bloch[q];
          const now = out.subarray(3 * q, 3 * q + 3);
          const err = q === target ? Math.abs(blochLength(now) - blochLength(before)) : vecDistance(now, before);
          worstRigid = Math.max(worstRigid, err);
          assert.ok(err <= TOL, `local gate ${gate.name} at progress ${p}: q${q} moved non-rigidly by ${err}`);
        }
      }
    }
  }
  assert.ok(worstLeft <= LEFT_LIMIT_TOL, `path jumps at a step: left limit off by ${worstLeft}`);
  return `${frames} frames, max |r| = ${worstLen.toFixed(12)}, step match ${worstStep.toExponential(2)}, H rigidity ${worstRigid.toExponential(2)}, left-limit gap ${worstLeft.toExponential(2)}`;
});

check('invalid input fails loudly', () => {
  assert.throws(() => matPow(S, 0.5), RangeError, 'S is not Hermitian, so S^f must throw');
  assert.throws(() => cnot(zeroState(3), 1, 1), RangeError, 'control = target must throw');
  assert.throws(() => applySingle(zeroState(3), X, 3), RangeError, 'qubit 3 of 3 must throw');
  assert.throws(() => teleportInitialState(Number.NaN, 0), RangeError, 'NaN angle must throw');
  assert.throws(() => numQubits({ re: new Float64Array(6), im: new Float64Array(6) }), RangeError, 'length 6 must throw');
  assert.throws(() => zeroState(MAX_QUBITS + 1), RangeError, 'oversized register must throw');
  assert.throws(() => applyGate(zeroState(3), { name: 'T', targets: [0], controls: [] }), RangeError, 'unknown gate must throw');
  assert.throws(() => teleportationBlochAt(teleportationStates(0, 0), Number.NaN), RangeError, 'NaN progress must throw');
  // cloneState really copies.
  const a = zeroState(2);
  const b = cloneState(a);
  b.re[0] = 0;
  assert.equal(a.re[0], 1, 'cloneState must not alias');
  return '8 guards throw RangeError';
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log(
  `[setup] lib/physics/qubits.mjs: ${TELEPORT_QUBITS} qubits (dim ${2 ** TELEPORT_QUBITS}), tol ${TOL}, ` +
    `seed ${SEED}, ${RANDOM_INPUTS} random inputs; node ${process.version}, ${os.platform()}-${os.arch()}`,
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
