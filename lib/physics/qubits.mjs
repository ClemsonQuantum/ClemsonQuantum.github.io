// @ts-check
/**
 * Three-qubit statevector simulator, written for a teleportation figure that
 * was dropped from the SC Quantathon v4 page. scripts/verify-entangle.mjs
 * still uses its gates as the exact reference. Pure and deterministic.
 *
 * Conventions
 * -----------
 * 1. Storage. An n-qubit state |psi> = sum_k a_k |k> is { re, im }, two
 *    Float64Arrays of length 2^n with a_k = re[k] + i im[k].
 *
 * 2. Qubit order (big-endian, as in Nielsen & Chuang). Qubit q is bit
 *    (n - 1 - q) of the basis index k, so q0 is the MOST significant bit and
 *    a ket |b0 b1 b2> reads left to right as k written in binary:
 *        k = 4 b0 + 2 b1 + b2,     e.g. |100> is index 4 (q0 = 1).
 *    The mask of qubit q is m_q = 2^(n - 1 - q). Qiskit uses the reverse
 *    (little-endian) order. scripts/verify-qubits.mjs pins this down.
 *
 * 3. Matrices. A single-qubit operator is a row-major 2x2 complex matrix
 *    [[u00, u01], [u10, u11]] stored as { re: [4], im: [4] }:
 *        H = [[1, 1], [1, -1]] / sqrt 2     X = [[0, 1], [1, 0]]
 *        Y = [[0, -i], [i, 0]]              Z = [[1, 0], [0, -1]]
 *        S = [[1, 0], [0, i]]
 *        Rx(t) = exp(-i t X/2) = [[c, -i s], [-i s, c]]
 *        Ry(t) = exp(-i t Y/2) = [[c, -s], [s, c]]
 *        Rz(t) = exp(-i t Z/2) = [[e^{-it/2}, 0], [0, e^{+it/2}]]
 *    with c = cos(t/2), s = sin(t/2) (N&C Eqs. 4.4-4.6).
 *
 * Derivation
 * ----------
 * 1. Single-qubit gate U on qubit q. Split each index into the bit b of q and
 *    the rest. U mixes only the pair (b = 0, b = 1) with the rest fixed: for
 *    every i with bit q clear and j = i | m_q,
 *        a'_i = u00 a_i + u01 a_j,        a'_j = u10 a_i + u11 a_j.
 *    Each pair is mapped by the unitary U, so sum |a|^2 is preserved.
 *
 * 2. Controlled gate. C(U) = (I - P) (x) I + P (x) U, where P projects the
 *    control qubits onto |1...1>. Step 1 then runs only over the i whose
 *    control bits are all set (i & M_c = M_c):
 *        CNOT(c -> t) = C_c(X): swap a_i and a_j where bit c = 1;
 *        CZ(a, b)     = C_a(Z): negate a_k where bits a and b are both 1,
 *                       which is symmetric in a and b.
 *
 * 3. Reduced state (partial trace). Write |psi> = sum_{b,e} a_{b,e} |b>_q |e>
 *    with e the other n - 1 bits. Then
 *        rho_q = Tr_rest |psi><psi| = sum_e (<e| psi)(psi |e>)
 *              = sum_{b,b'} ( sum_e a_{b,e} conj(a_{b',e}) ) |b><b'|,
 *    so, with i over the indices with bit q clear and j = i | m_q,
 *        rho_00 = sum_i |a_i|^2,     rho_11 = sum_i |a_j|^2,
 *        rho_01 = sum_i a_i conj(a_j),     rho_10 = conj(rho_01).
 *
 * 4. Bloch vector. rho = (I + r . sigma) / 2 gives r_k = Tr(rho sigma_k):
 *        x = rho_01 + rho_10         = 2 Re rho_01
 *        y = i rho_01 - i rho_10     = -2 Im rho_01
 *        z = rho_00 - rho_11.
 *    The eigenvalues of rho are (1 +- |r|)/2, so |r| <= 1, with equality iff
 *    rho is pure. For a pure global state, |r_q| < 1 iff qubit q is entangled
 *    with the others, and |r_q| = 0 iff it is maximally entangled.
 *    Check: |psi> = cos(t/2)|0> + e^{ip} sin(t/2)|1> has
 *    rho_01 = cos(t/2) sin(t/2) e^{-ip} = (sin t / 2) e^{-ip}, so
 *    r = (sin t cos p, sin t sin p, cos t), the usual Bloch angles.
 *
 * 5. Teleportation (Bennett et al. 1993) with deferred measurement (N&C
 *    Sec. 4.4). Input |psi> = alpha|0> + beta|1> on q0 with alpha = cos(t/2),
 *    beta = e^{ip} sin(t/2); q1 = q2 = |0>. Kets are |q0 q1 q2>, and in the
 *    grouped lines the last factor is q2.
 *      step 0  |psi>|0>|0>
 *      step 1  H(q1):          |psi> (|0> + |1>) |0> / sqrt 2
 *      step 2  CNOT(q1 -> q2): |psi> (|00> + |11>) / sqrt 2            (Bell pair)
 *      step 3  CNOT(q0 -> q1): [alpha|0>(|00> + |11>) + beta|1>(|10> + |01>)] / sqrt 2
 *      step 4  H(q0), then regroup by (q0 q1):
 *                1/2 [ |00>(alpha|0> + beta|1>) + |01>(alpha|1> + beta|0>)
 *                    + |10>(alpha|0> - beta|1>) + |11>(alpha|1> - beta|0>) ]
 *              = 1/2 sum_{m0,m1} |m0 m1> X^{m1} Z^{m0} |psi>
 *              (term by term: X|psi> = alpha|1> + beta|0>, Z|psi> = alpha|0>
 *              - beta|1>, XZ|psi> = alpha|1> - beta|0>).
 *      step 5  CNOT(q1 -> q2) applies X to q2 exactly when m1 = 1, and
 *              X X^{m1} = I there: 1/2 sum |m0 m1> Z^{m0} |psi>. This is the
 *              X correction, controlled coherently instead of by a measured
 *              bit.
 *      step 6  CZ(q0, q2) applies Z to q2 exactly when m0 = 1 (Z Z = I):
 *              1/2 sum |m0 m1> |psi> = |+> |+> |psi>.
 *    So q2 ends in |psi> for every input, with no measurement and no
 *    randomness; measuring q0 and q1 now would give uniform bits and leave
 *    q2 untouched.
 *
 * 6. Reduced Bloch vectors per step. With r the input's vector, ex = (1,0,0)
 *    and ez = (0,0,1):
 *        step   q0              q1    q2
 *        0      r               ez    ez
 *        1      r               ex    ez
 *        2      r               0     0             (Bell pair)
 *        3      (0, 0, cos t)   0     0
 *        4      (cos t, 0, 0)   0     0
 *        5      (cos t, 0, 0)   ex    (0, 0, cos t)
 *        6      ex              ex    r
 *    Worked entries:
 *    - step 2: Tr_q2 |Phi+><Phi+| = I/2 for q1 and likewise for q2.
 *    - step 3, q0: the (q1 q2) factors Phi+ = (|00> + |11>)/sqrt 2 and
 *      Psi+ = (|10> + |01>)/sqrt 2 are orthogonal, so
 *      rho_01 = alpha conj(beta) <Psi+|Phi+> = 0 and
 *      z = |alpha|^2 - |beta|^2 = cos t. For q1 and q2, rho_{q1 q2} =
 *      |alpha|^2 |Phi+><Phi+| + |beta|^2 |Psi+><Psi+|, and each term traces
 *      to I/2.
 *    - step 4, q0: rho_01 = 1/4 sum_{m1} <X^{m1} Z psi | X^{m1} psi>
 *      = 1/2 <psi|Z|psi> = cos(t)/2, so x = cos t; rho_00 = rho_11 = 1/2.
 *      q2 = 1/4 sum over the four Pauli images of |psi><psi| = I/2.
 *    - step 5: the state factors as |+>_q1 (x) (|0>|psi> + |1> Z|psi>)/sqrt 2
 *      on (q0, q2), so q1 = ex, q0 is as in step 4, and
 *      q2 = (rho + Z rho Z)/2 is the dephased input (0, 0, cos t).
 *    Limits: t = 0 (|0>) never entangles q0 (it stays ez until step 4 turns
 *    it to ex); t = pi/2 (the equator) leaves q0 maximally mixed from step 3
 *    through step 5.
 *
 * 7. Frames between steps (fractional gates). Every gate used here (H, X, Z,
 *    hence CNOT = C(X) and CZ = C(Z)) is Hermitian and squares to I, so
 *    G = P+ - P- with spectral projectors P+- = (I +- G)/2, and
 *        G^f = P+ + e^{i pi f} P-  =  e^{i pi f/2} exp(-i (pi f/2) G)
 *    is unitary for every real f, with G^0 = I and G^1 = G. (Expand
 *    exp(-i a G) = cos a I - i sin a G and multiply by e^{i a}, a = pi f/2.)
 *    For a single-qubit G = n . sigma this is a rotation by pi f about the
 *    axis n, up to a global phase. C(U) has -1 eigenspace P (x) P-(U), so
 *    C(U)^f = C(U^f). The figure shows G_{k+1}^f |psi_k> at circuit position
 *    k + f: a genuine pure 3-qubit state at every frame. A vector therefore
 *    leaves the sphere's surface only while a two-qubit gate is actually
 *    changing entanglement, and a local gate (H) turns it rigidly.
 *
 * Fidelity. For the pure input |psi> and q2's reduced state rho,
 *    F = <psi|rho|psi> = (1 + r_in . r_q2) / 2.
 *
 * Sources: C. H. Bennett et al., Phys. Rev. Lett. 70, 1895 (1993);
 * M. A. Nielsen and I. L. Chuang, Quantum Computation and Quantum
 * Information, 10th anniversary ed. (2010): Sec. 1.3.7 (teleportation),
 * Sec. 2.4 (density operator, reduced density operator; Bloch vector of a
 * mixed state, Ex. 2.72), Sec. 4.2 (rotation operators), Sec. 4.4 (principle
 * of deferred measurement).
 *
 * Validation: scripts/verify-qubits.mjs checks the bit order, unitarity,
 * norm preservation, the step table above, Bell-pair mixedness, and
 * teleportation fidelity 1 to 1e-12 for 200 seeded random inputs.
 */

/** Absolute tolerance for the physics checks (CLAUDE.md, Sec. 5.1). */
export const TOL = 1e-12;

/** Largest register this module will allocate (2^16 amplitudes). */
export const MAX_QUBITS = 16;

/**
 * @typedef {object} StateVector
 * @property {Float64Array} re real parts, length 2^n
 * @property {Float64Array} im imaginary parts, length 2^n
 */

/**
 * @typedef {object} Mat2
 * @property {readonly number[]} re row-major real parts [u00, u01, u10, u11]
 * @property {readonly number[]} im row-major imaginary parts
 */

/** @typedef {[number, number, number]} Vec3 */

/**
 * @typedef {object} GateSpec
 * @property {string} name 'init' (no gate), 'H', 'X', 'Z', 'CNOT' or 'CZ'
 * @property {readonly number[]} targets target qubit (exactly one for a gate)
 * @property {readonly number[]} controls control qubits (empty for one-qubit
 *   gates; for CZ the first qubit, as CZ is symmetric)
 */

/**
 * @typedef {object} TeleportStep
 * @property {string} label short spoken label, e.g. "CNOT q0 to q1"
 * @property {GateSpec} gate the gate applied to reach this step
 * @property {Vec3[]} bloch reduced Bloch vectors of q0, q1, q2 after it
 */

/**
 * @typedef {object} InputPreset
 * @property {string} id stable key
 * @property {string} ket display ket, e.g. "|+i⟩"
 * @property {number} theta polar angle (rad)
 * @property {number} phi azimuth (rad)
 */

// ---------------------------------------------------------------------------
// 2x2 complex matrices
// ---------------------------------------------------------------------------

/**
 * Build a frozen 2x2 complex matrix from row-major parts.
 *
 * @param {number[]} re [u00, u01, u10, u11] real parts
 * @param {number[]} im [u00, u01, u10, u11] imaginary parts
 * @returns {Mat2}
 */
export function mat2(re, im) {
  if (re.length !== 4 || im.length !== 4) {
    throw new RangeError(`mat2 needs 4 real and 4 imaginary parts, got ${re.length} and ${im.length}`);
  }
  return Object.freeze({ re: Object.freeze([...re]), im: Object.freeze([...im]) });
}

const R2 = Math.SQRT1_2;

/** Identity. */
export const I2 = mat2([1, 0, 0, 1], [0, 0, 0, 0]);
/** Hadamard. */
export const H = mat2([R2, R2, R2, -R2], [0, 0, 0, 0]);
/** Pauli X (NOT). */
export const X = mat2([0, 1, 1, 0], [0, 0, 0, 0]);
/** Pauli Y. */
export const Y = mat2([0, 0, 0, 0], [0, -1, 1, 0]);
/** Pauli Z. */
export const Z = mat2([1, 0, 0, -1], [0, 0, 0, 0]);
/** Phase gate S = diag(1, i). */
export const S = mat2([1, 0, 0, 0], [0, 0, 0, 1]);

/**
 * Rotation about x: Rx(t) = exp(-i t X / 2) = [[c, -i s], [-i s, c]].
 *
 * @param {number} t angle (rad)
 * @returns {Mat2}
 */
export function Rx(t) {
  const c = Math.cos(t / 2);
  const s = Math.sin(t / 2);
  return mat2([c, 0, 0, c], [0, -s, -s, 0]);
}

/**
 * Rotation about y: Ry(t) = exp(-i t Y / 2) = [[c, -s], [s, c]].
 *
 * @param {number} t angle (rad)
 * @returns {Mat2}
 */
export function Ry(t) {
  const c = Math.cos(t / 2);
  const s = Math.sin(t / 2);
  return mat2([c, -s, s, c], [0, 0, 0, 0]);
}

/**
 * Rotation about z: Rz(t) = exp(-i t Z / 2) = diag(e^{-it/2}, e^{+it/2}).
 *
 * @param {number} t angle (rad)
 * @returns {Mat2}
 */
export function Rz(t) {
  const c = Math.cos(t / 2);
  const s = Math.sin(t / 2);
  return mat2([c, 0, 0, c], [-s, 0, 0, s]);
}

/**
 * Matrix product A B.
 *
 * @param {Mat2} A
 * @param {Mat2} B
 * @returns {Mat2}
 */
export function matMul(A, B) {
  const re = [0, 0, 0, 0];
  const im = [0, 0, 0, 0];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      for (let k = 0; k < 2; k++) {
        const ar = A.re[2 * r + k];
        const ai = A.im[2 * r + k];
        const br = B.re[2 * k + c];
        const bi = B.im[2 * k + c];
        re[2 * r + c] += ar * br - ai * bi;
        im[2 * r + c] += ar * bi + ai * br;
      }
    }
  }
  return mat2(re, im);
}

/**
 * Conjugate transpose U^dagger.
 *
 * @param {Mat2} U
 * @returns {Mat2}
 */
export function adjoint(U) {
  return mat2([U.re[0], U.re[2], U.re[1], U.re[3]], [-U.im[0], -U.im[2], -U.im[1], -U.im[3]]);
}

/**
 * Largest entrywise modulus |A - B|.
 *
 * @param {Mat2} A
 * @param {Mat2} B
 * @returns {number}
 */
export function matDistance(A, B) {
  let worst = 0;
  for (let k = 0; k < 4; k++) {
    worst = Math.max(worst, Math.hypot(A.re[k] - B.re[k], A.im[k] - B.im[k]));
  }
  return worst;
}

/**
 * Whether U^dagger U = I entrywise within tol.
 *
 * @param {Mat2} U
 * @param {number} [tol]
 * @returns {boolean}
 */
export function isUnitary(U, tol = TOL) {
  return matDistance(matMul(adjoint(U), U), I2) <= tol;
}

/**
 * Whether U = U^dagger entrywise within tol.
 *
 * @param {Mat2} U
 * @param {number} [tol]
 * @returns {boolean}
 */
export function isHermitian(U, tol = TOL) {
  return matDistance(U, adjoint(U)) <= tol;
}

/**
 * Fractional power of a Hermitian involution (G = G^dagger, G^2 = I):
 * G^f = (I + G)/2 + e^{i pi f} (I - G)/2 (header, point 7). Unitary for all
 * real f; G^0 = I and G^1 = G.
 *
 * @param {Mat2} G Hermitian involution (H, X, Y, Z)
 * @param {number} f exponent
 * @returns {Mat2}
 * @throws {RangeError} if f is not finite or G is not a Hermitian involution
 */
export function matPow(G, f) {
  if (!Number.isFinite(f)) throw new RangeError(`matPow exponent must be finite, got ${f}`);
  const herm = matDistance(G, adjoint(G));
  const invol = matDistance(matMul(G, G), I2);
  if (herm > TOL || invol > TOL) {
    throw new RangeError(
      `matPow needs a Hermitian involution: |G - G^dagger| = ${herm.toExponential(2)}, |G^2 - I| = ${invol.toExponential(2)}`,
    );
  }
  const cr = Math.cos(Math.PI * f);
  const ci = Math.sin(Math.PI * f);
  const re = [0, 0, 0, 0];
  const im = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) {
    const id = k === 0 || k === 3 ? 1 : 0;
    const pPlusRe = (id + G.re[k]) / 2;
    const pPlusIm = G.im[k] / 2;
    const pMinusRe = (id - G.re[k]) / 2;
    const pMinusIm = -G.im[k] / 2;
    re[k] = pPlusRe + cr * pMinusRe - ci * pMinusIm;
    im[k] = pPlusIm + cr * pMinusIm + ci * pMinusRe;
  }
  return mat2(re, im);
}

// ---------------------------------------------------------------------------
// Statevectors
// ---------------------------------------------------------------------------

/**
 * Number of qubits of a state, validating that its length is 2^n.
 *
 * @param {StateVector} state
 * @returns {number}
 * @throws {RangeError} on mismatched or non-power-of-two lengths
 */
export function numQubits(state) {
  const dim = state.re.length;
  if (state.im.length !== dim) {
    throw new RangeError(`re and im lengths differ: ${dim} vs ${state.im.length}`);
  }
  const n = Math.log2(dim);
  if (!Number.isInteger(n) || n < 1 || n > MAX_QUBITS) {
    throw new RangeError(`statevector length ${dim} is not 2^n for 1 <= n <= ${MAX_QUBITS}`);
  }
  return n;
}

/**
 * The all-zero state |0...0> of n qubits.
 *
 * @param {number} n number of qubits, 1..MAX_QUBITS
 * @returns {StateVector}
 */
export function zeroState(n) {
  if (!Number.isInteger(n) || n < 1 || n > MAX_QUBITS) {
    throw new RangeError(`qubit count must be an integer in 1..${MAX_QUBITS}, got ${n}`);
  }
  const re = new Float64Array(2 ** n);
  const im = new Float64Array(2 ** n);
  re[0] = 1;
  return { re, im };
}

/**
 * Independent copy of a state.
 *
 * @param {StateVector} state
 * @returns {StateVector}
 */
export function cloneState(state) {
  return { re: Float64Array.from(state.re), im: Float64Array.from(state.im) };
}

/**
 * Squared norm <psi|psi>.
 *
 * @param {StateVector} state
 * @returns {number}
 */
export function normSquared(state) {
  let sum = 0;
  for (let k = 0; k < state.re.length; k++) sum += state.re[k] * state.re[k] + state.im[k] * state.im[k];
  return sum;
}

/**
 * Bit mask of qubit q in an n-qubit index (q0 is the most significant bit).
 *
 * @param {number} n
 * @param {number} q
 * @returns {number}
 */
export function qubitMask(n, q) {
  if (!Number.isInteger(q) || q < 0 || q >= n) {
    throw new RangeError(`qubit index ${q} out of range for ${n} qubits`);
  }
  return 1 << (n - 1 - q);
}

/**
 * Apply U to `target`, conditioned on every qubit in `controls` being |1>
 * (header, points 1-2). Mutates and returns `state`.
 *
 * @param {StateVector} state
 * @param {Mat2} U single-qubit unitary
 * @param {readonly number[]} controls control qubits (may be empty)
 * @param {number} target target qubit
 * @returns {StateVector}
 */
export function applyControlled(state, U, controls, target) {
  const n = numQubits(state);
  const mt = qubitMask(n, target);
  let mc = 0;
  for (const c of controls) {
    const m = qubitMask(n, c);
    if (m === mt) throw new RangeError(`control ${c} equals the target`);
    if (mc & m) throw new RangeError(`control ${c} is listed twice`);
    mc |= m;
  }
  const [u00r, u01r, u10r, u11r] = U.re;
  const [u00i, u01i, u10i, u11i] = U.im;
  const { re, im } = state;
  for (let i = 0; i < re.length; i++) {
    if ((i & mt) !== 0 || (i & mc) !== mc) continue;
    const j = i | mt;
    const ar = re[i];
    const ai = im[i];
    const br = re[j];
    const bi = im[j];
    re[i] = u00r * ar - u00i * ai + u01r * br - u01i * bi;
    im[i] = u00r * ai + u00i * ar + u01r * bi + u01i * br;
    re[j] = u10r * ar - u10i * ai + u11r * br - u11i * bi;
    im[j] = u10r * ai + u10i * ar + u11r * bi + u11i * br;
  }
  return state;
}

/**
 * Apply a single-qubit gate. Mutates and returns `state`.
 *
 * @param {StateVector} state
 * @param {Mat2} U
 * @param {number} target
 * @returns {StateVector}
 */
export function applySingle(state, U, target) {
  return applyControlled(state, U, [], target);
}

/**
 * CNOT with `control` -> `target`. Mutates and returns `state`.
 *
 * @param {StateVector} state
 * @param {number} control
 * @param {number} target
 * @returns {StateVector}
 */
export function cnot(state, control, target) {
  return applyControlled(state, X, [control], target);
}

/**
 * Controlled-Z on qubits a and b (symmetric). Mutates and returns `state`.
 *
 * @param {StateVector} state
 * @param {number} a
 * @param {number} b
 * @returns {StateVector}
 */
export function cz(state, a, b) {
  return applyControlled(state, Z, [a], b);
}

/**
 * Reduced density matrix of qubit q (header, point 3). rho_10 is the
 * conjugate of rho_01.
 *
 * @param {StateVector} state
 * @param {number} q
 * @returns {{ r00: number, r11: number, re01: number, im01: number }}
 */
export function reducedDensity(state, q) {
  const n = numQubits(state);
  const m = qubitMask(n, q);
  const { re, im } = state;
  let r00 = 0;
  let r11 = 0;
  let re01 = 0;
  let im01 = 0;
  for (let i = 0; i < re.length; i++) {
    if (i & m) continue;
    const j = i | m;
    r00 += re[i] * re[i] + im[i] * im[i];
    r11 += re[j] * re[j] + im[j] * im[j];
    // a_i conj(a_j)
    re01 += re[i] * re[j] + im[i] * im[j];
    im01 += im[i] * re[j] - re[i] * im[j];
  }
  return { r00, r11, re01, im01 };
}

/**
 * Write the reduced Bloch vector of qubit q into out[offset .. offset + 2]
 * (header, point 4).
 *
 * @param {StateVector} state
 * @param {number} q
 * @param {Float64Array | number[]} out
 * @param {number} offset
 */
function writeBloch(state, q, out, offset) {
  const { r00, r11, re01, im01 } = reducedDensity(state, q);
  out[offset] = 2 * re01;
  out[offset + 1] = -2 * im01;
  out[offset + 2] = r00 - r11;
}

/**
 * Reduced Bloch vector r = (Tr rho X, Tr rho Y, Tr rho Z) of qubit q.
 *
 * @param {StateVector} state
 * @param {number} q
 * @returns {Vec3}
 */
export function blochVector(state, q) {
  /** @type {Vec3} */
  const out = [0, 0, 0];
  writeBloch(state, q, out, 0);
  return out;
}

/**
 * Euclidean length of a Bloch vector.
 *
 * @param {ArrayLike<number>} v
 * @param {number} [offset]
 * @returns {number}
 */
export function blochLength(v, offset = 0) {
  return Math.hypot(v[offset], v[offset + 1], v[offset + 2]);
}

// ---------------------------------------------------------------------------
// Teleportation
// ---------------------------------------------------------------------------

/**
 * Bloch vector of cos(theta/2)|0> + e^{i phi} sin(theta/2)|1>.
 *
 * @param {number} theta polar angle (rad)
 * @param {number} phi azimuth (rad)
 * @returns {Vec3}
 */
export function inputBloch(theta, phi) {
  return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
}

/** Qubits in the teleportation register. */
export const TELEPORT_QUBITS = 3;

/**
 * One frozen entry of TELEPORT_STEPS.
 *
 * @param {string} label
 * @param {string} name
 * @param {number[]} targets
 * @param {number[]} controls
 * @returns {Readonly<{ label: string, gate: Readonly<GateSpec> }>}
 */
function stepSpec(label, name, targets, controls) {
  const gate = Object.freeze({ name, targets: Object.freeze([...targets]), controls: Object.freeze([...controls]) });
  return Object.freeze({ label, gate });
}

/**
 * The protocol (header, point 5). Step 0 is the input; steps 1..6 each apply
 * one gate. Labels are terse enough to announce: "Step 3 of 6: CNOT q0 to q1".
 */
export const TELEPORT_STEPS = Object.freeze([
  stepSpec('Input state', 'init', [], []),
  stepSpec('H on q1', 'H', [1], []),
  stepSpec('CNOT q1 to q2', 'CNOT', [2], [1]),
  stepSpec('CNOT q0 to q1', 'CNOT', [1], [0]),
  stepSpec('H on q0', 'H', [0], []),
  stepSpec('CNOT q1 to q2', 'CNOT', [2], [1]),
  stepSpec('CZ q0 and q2', 'CZ', [2], [0]),
]);

/** Index of the last step (6). */
export const TELEPORT_LAST_STEP = TELEPORT_STEPS.length - 1;

/**
 * Input presets for the figure. Expected Bloch vectors: |0> -> +z,
 * |1> -> -z, |+> -> +x, |+i> -> +y (checked by verify-qubits.mjs).
 *
 * @type {readonly InputPreset[]}
 */
export const INPUT_PRESETS = Object.freeze([
  Object.freeze({ id: 'zero', ket: '|0⟩', theta: 0, phi: 0 }),
  Object.freeze({ id: 'one', ket: '|1⟩', theta: Math.PI, phi: 0 }),
  Object.freeze({ id: 'plus', ket: '|+⟩', theta: Math.PI / 2, phi: 0 }),
  Object.freeze({ id: 'plus-i', ket: '|+i⟩', theta: Math.PI / 2, phi: Math.PI / 2 }),
]);

/**
 * Target unitary of a named gate (its controls come from the GateSpec).
 *
 * @param {string} name
 * @returns {Mat2}
 */
function gateBase(name) {
  switch (name) {
    case 'H':
      return H;
    case 'X':
    case 'CNOT':
      return X;
    case 'Z':
    case 'CZ':
      return Z;
    default:
      throw new RangeError(`unknown gate "${name}"`);
  }
}

/**
 * Apply a named gate, optionally as the fractional power G^power (header,
 * point 7). 'init' is the identity. Mutates and returns `state`.
 *
 * @param {StateVector} state
 * @param {GateSpec} gate
 * @param {number} [power] exponent; 1 applies the gate itself
 * @returns {StateVector}
 */
export function applyGate(state, gate, power = 1) {
  if (gate.name === 'init') return state;
  const base = gateBase(gate.name);
  if (gate.targets.length !== 1) {
    throw new RangeError(`gate ${gate.name} needs exactly one target, got ${gate.targets.length}`);
  }
  const U = power === 1 ? base : matPow(base, power);
  return applyControlled(state, U, gate.controls, gate.targets[0]);
}

/**
 * The 3-qubit register |psi>|0>|0> with
 * |psi> = cos(theta/2)|0> + e^{i phi} sin(theta/2)|1> on q0.
 *
 * @param {number} theta polar angle (rad)
 * @param {number} phi azimuth (rad)
 * @returns {StateVector}
 */
export function teleportInitialState(theta, phi) {
  if (!Number.isFinite(theta) || !Number.isFinite(phi)) {
    throw new RangeError(`input angles must be finite, got theta = ${theta}, phi = ${phi}`);
  }
  const state = zeroState(TELEPORT_QUBITS);
  const q0One = qubitMask(TELEPORT_QUBITS, 0); // |100> = index 4
  const s = Math.sin(theta / 2);
  state.re[0] = Math.cos(theta / 2);
  state.re[q0One] = Math.cos(phi) * s;
  state.im[q0One] = Math.sin(phi) * s;
  return state;
}

/**
 * Statevectors after steps 0..6 (header, point 5).
 *
 * @param {number} theta input polar angle (rad)
 * @param {number} phi input azimuth (rad)
 * @returns {StateVector[]} length TELEPORT_STEPS.length
 */
export function teleportationStates(theta, phi) {
  const states = [teleportInitialState(theta, phi)];
  for (let k = 1; k < TELEPORT_STEPS.length; k++) {
    states.push(applyGate(cloneState(states[k - 1]), TELEPORT_STEPS[k].gate));
  }
  return states;
}

/**
 * Every step of the protocol with its gate and the reduced Bloch vectors of
 * q0, q1 and q2 after it (header, point 6).
 *
 * @param {number} theta input polar angle (rad)
 * @param {number} phi input azimuth (rad)
 * @returns {TeleportStep[]}
 */
export function teleportationSteps(theta, phi) {
  return teleportationStates(theta, phi).map((state, k) => {
    const { label, gate } = TELEPORT_STEPS[k];
    return {
      label,
      gate: { name: gate.name, targets: [...gate.targets], controls: [...gate.controls] },
      bloch: [blochVector(state, 0), blochVector(state, 1), blochVector(state, 2)],
    };
  });
}

/**
 * Reduced Bloch vectors of q0, q1, q2 at a fractional circuit position:
 * G_{k+1}^f |psi_k> for progress = k + f (header, point 7). Integer progress
 * gives the step states exactly.
 *
 * @param {StateVector[]} states output of teleportationStates
 * @param {number} progress circuit position, clamped to [0, TELEPORT_LAST_STEP]
 * @param {Float64Array} [out] length 9: [x0, y0, z0, x1, y1, z1, x2, y2, z2]
 * @returns {Float64Array} `out`
 */
export function teleportationBlochAt(states, progress, out = new Float64Array(9)) {
  if (states.length !== TELEPORT_STEPS.length) {
    throw new RangeError(`expected ${TELEPORT_STEPS.length} step states, got ${states.length}`);
  }
  if (!Number.isFinite(progress)) throw new RangeError(`progress must be finite, got ${progress}`);
  const p = Math.min(TELEPORT_LAST_STEP, Math.max(0, progress));
  const k = Math.floor(p);
  const f = p - k;
  let state = states[k];
  if (f > 0) {
    state = applyGate(cloneState(state), TELEPORT_STEPS[k + 1].gate, f);
  }
  for (let q = 0; q < TELEPORT_QUBITS; q++) writeBloch(state, q, out, 3 * q);
  return out;
}
