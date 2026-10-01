// @ts-check
/**
 * Two qubits under Heisenberg exchange in a uniform field: the entangled
 * pair on the SC Quantathon v4 stage (components/scq4/qubitsLayer.ts). Pure
 * and deterministic. scripts/verify-entangle.mjs checks every formula below
 * against exp(-iHt) and against the exact statevector (lib/physics/qubits.mjs).
 *
 * Conventions
 * -----------
 * 1. Units: hbar = 1; times in s, rates (J, omega) in rad/s, angles in rad.
 *
 * 2. Qubit A is q0 and B is q1 of a two-qubit register in the big-endian
 *    order of qubits.mjs: the basis is |00>, |01>, |10>, |11> with A's bit
 *    first.
 *
 * 3. Hamiltonian
 *        H = (J/4) sigma_A . sigma_B + (omega/2) (Z_A + Z_B),
 *    with sigma_A . sigma_B = X_A X_B + Y_A Y_B + Z_A Z_B. The first term is
 *    J S_A . S_B for S = sigma/2 (the exchange Hamiltonian of Loss and
 *    DiVincenzo); J > 0 is antiferromagnetic. Time evolution is
 *    U(t) = exp(-i H t).
 *
 * 4. A Bloch vector r = (<X>, <Y>, <Z>) is that of a qubit's reduced state,
 *    rho = (1 + r . sigma)/2, as in qubits.mjs. R_z(phi) is the
 *    counterclockwise turn by phi about +z (seen from +z):
 *        R_z(phi) (x, y, z) = (x cos phi - y sin phi, x sin phi + y cos phi, z),
 *    which is what the unitary exp(-i phi Z/2) does to r: |0> + |1> goes to
 *    |0> + e^{i phi}|1>, whose azimuth is +phi.
 *
 * Derivation
 * ----------
 * 1. Exchange is a SWAP. On the basis above Z_A Z_B = diag(1, -1, -1, 1).
 *    X_A X_B and Y_A Y_B each send |01> to |10> and |10> to |01> with
 *    amplitude 1 (Y|0> = i|1> and Y|1> = -i|0>, so Y_A Y_B |01> =
 *    (i)(-i)|10>), and they send |00> to |11> (and back) with amplitudes 1
 *    and (i)(i) = -1, which cancel. So
 *        sigma_A . sigma_B = |00><00| + |11><11| - |01><01| - |10><10|
 *                            + 2 (|01><10| + |10><01|)
 *                          = 2 SWAP - 1,
 *    because SWAP fixes |00> and |11> and exchanges |01> and |10> (Dirac's
 *    exchange identity). The triplets (SWAP = +1) give +1 and the singlet
 *    (SWAP = -1) gives -3.
 *
 * 2. The two terms commute, since SWAP (Z_A + Z_B) SWAP = Z_B + Z_A. So
 *        U(t) = exp(-i omega t (Z_A + Z_B)/2) exp(-i (J t/4) (2 SWAP - 1)).
 *    SWAP^2 = 1 splits the exponential series into even powers (multiples of
 *    1) and odd powers (multiples of SWAP): exp(-i x SWAP) =
 *    cos(x) 1 - i sin(x) SWAP. With x = J t/2,
 *        U(t) = F(t) e^{i J t/4} [cos(J t/2) 1 - i sin(J t/2) SWAP],
 *        F(t) = exp(-i omega t (Z_A + Z_B)/2) = Rz(omega t) (x) Rz(omega t),
 *    where Rz(phi) = exp(-i phi Z/2) as in qubits.mjs.
 *
 * 3. Product input |a> (x) |b>, where |v> = cos(theta/2)|0> +
 *    e^{i phi} sin(theta/2)|1> has the Bloch vector v = (sin theta cos phi,
 *    sin theta sin phi, cos theta) (qubits.mjs, point 4). Set aside the
 *    global phase e^{i J t/4} and F (point 6 applies F). With
 *    c = cos(J t/2), s = sin(J t/2) and SWAP |a>|b> = |b>|a>,
 *        |psi> = c |a>|b> - i s |b>|a>.
 *
 * 4. Reduced state of A. Expand |psi><psi| and trace out B with
 *    Tr_B(|u><v|) = <v|u> and <a|a> = <b|b> = 1:
 *        rho_A = c^2 |a><a| + s^2 |b><b| + i s c <a|b> |a><b| - i s c <b|a> |b><a|.
 *    Its Bloch vector r_k = Tr(rho_A sigma_k) follows from
 *    Tr(|a><b| sigma_k) = <b|sigma_k|a>:
 *        r_A,k = c^2 a_k + s^2 b_k + i s c (w_k - conj w_k)
 *              = c^2 a_k + s^2 b_k - 2 s c Im w_k,
 *    where w_k = <a|b><b|sigma_k|a> = Tr(P_b sigma_k P_a) and
 *    P_v = |v><v| = (1 + v . sigma)/2. With Tr sigma_k = 0,
 *    Tr(sigma_j sigma_k) = 2 delta_jk and Tr(sigma_i sigma_k sigma_j) =
 *    2i eps_ikj (repeated indices summed),
 *        w_k = (1/4) [2 a_k + 2 b_k + 2i eps_ikj b_i a_j]
 *            = (a_k + b_k)/2 + (i/2) (a x b)_k,
 *    because eps_ikj b_i a_j = eps_kji a_j b_i = (a x b)_k. So
 *    Im w = (a x b)/2 and, with 2 s c = sin(J t),
 *        r_A = cos^2(J t/2) a + sin^2(J t/2) b - (1/2) sin(J t) a x b.
 *    Sign check at short times: with [S_j, S_k] = i eps_jkl S_l the
 *    exchange term gives dS_A/dt = i [J S_A . S_B, S_A] = -J S_A x S_B, so
 *    from a product state dr_A/dt = -(J/2) a x b at t = 0: the linear term
 *    above.
 *
 * 5. B by symmetry. Relabeling A and B turns |psi> into c|b>|a> - i s|a>|b>,
 *    the same form with a and b exchanged, and b x a = -a x b:
 *        r_B = sin^2(J t/2) a + cos^2(J t/2) b + (1/2) sin(J t) a x b.
 *
 * 6. The field. F is a product of one-qubit unitaries, so it turns each
 *    reduced state rigidly: Rz(phi) rho Rz(phi)^dagger has the Bloch vector
 *    R_z(phi) r (convention 4). F commutes with the exchange part, so
 *        r_A(t) = R_z(omega t) [cos^2(J t/2) a + sin^2(J t/2) b - (1/2) sin(J t) a x b],
 *        r_B(t) = R_z(omega t) [sin^2(J t/2) a + cos^2(J t/2) b + (1/2) sin(J t) a x b].
 *    Their sum is r_A + r_B = R_z(omega t) (a + b): the exchange term
 *    conserves the total spin S_A + S_B, and the field turns it about z.
 *
 * 7. Entanglement. Let d = a . b; a x b is perpendicular to a and b, and
 *    |a x b|^2 = 1 - d^2. With c^4 + s^4 = 1 - 2 c^2 s^2,
 *        |r_A|^2 = |c^2 a + s^2 b|^2 + s^2 c^2 |a x b|^2
 *                = c^4 + s^4 + 2 c^2 s^2 d + s^2 c^2 (1 - d^2)
 *                = 1 - s^2 c^2 (1 - d)^2,
 *    and the same for r_B. For a pure two-qubit state the Wootters
 *    concurrence is C = 2 |psi_00 psi_11 - psi_01 psi_10| = 2 sqrt(det rho_A),
 *    and det rho_A = (1 - |r_A|^2)/4 (eigenvalues (1 +- |r|)/2), so
 *    C^2 = 1 - |r_A|^2 (the tangle of Coffman, Kundu and Wootters):
 *        C(t) = |sin(J t)| (1 - a . b)/2,     |r_A| = |r_B| = sqrt(1 - C^2).
 *    The same from amplitudes: with a, b as 2-component spinors the
 *    coefficient matrix is Psi = c a b^T - i s b a^T, and for 2x2 matrices
 *    det(u v^T + w z^T) = det[u w] det[v z], so
 *    det Psi = (-i s c det[a b]) (det[b a]) = i s c det[a b]^2. The
 *    Lagrange identity gives |det[a b]|^2 = 1 - |<a|b>|^2 = (1 - a . b)/2,
 *    and C = 2 |det Psi| agrees. F maps Psi to Rz Psi Rz^T, which keeps
 *    det Psi (det Rz = 1), so the field never changes C.
 *    The peak C_max = (1 - a . b)/2 = 1 - |<a|b>|^2 comes when |sin J t| = 1,
 *    first at J t = pi/2, i.e. t* = pi/(2|J|). There the exchange part is
 *    the sqrt(SWAP) gate of Loss and DiVincenzo, up to a phase.
 *
 * 8. Seamless loop. Take J = 2 pi m / L and omega = 2 pi n / L with whole
 *    numbers m, n >= 1. At t = L the exchange part is
 *        e^{i pi m/2} [cos(pi m) 1 - i sin(pi m) SWAP] = e^{i pi m/2} (-1)^m 1
 *                                                     = (-i)^m 1,
 *    and F(L) = exp(-i pi n (Z_A + Z_B)) = 1, because Z_A + Z_B has the
 *    eigenvalues 2, 0, 0, -2 and e^{-2 pi i n} = 1. So U(L) = (-i)^m 1, a
 *    global phase (U(L) = -1 for the shipped m = 2, and +-i for odd m): the
 *    state, both Bloch vectors and C repeat exactly at t = L, and the loop
 *    has no seam. Everything drawn depends on t only through J t and
 *    omega t, so a shorter period L/k would need k to divide both m and n;
 *    with gcd(m, n) = 1 the figure repeats only after the full L. C alone
 *    has period pi/J = L/(2m), and its first peak is t* = L/(4m)
 *    (ENTANGLE_MAX_TIME).
 *
 * Limiting cases (each checked by the verify script)
 * - J = 0: C = 0 at all times and each vector only precesses,
 *   r_A = R_z(omega t) a, r_B = R_z(omega t) b.
 * - a = b: SWAP|a>|a> = |a>|a>, so the state stays a product: C = 0 and
 *   r_A = r_B = R_z(omega t) a.
 * - a = +z, b = -z, omega = 0: |01> -> c|01> - i s|10>, so r_A = cos(J t) z,
 *   r_B = -cos(J t) z and C = |sin J t|, a Bell state at J t = pi/2.
 * - omega = 0, J t = pi: a full SWAP, r_A = b and r_B = a.
 *
 * Sources: P. A. M. Dirac, Proc. R. Soc. A 123, 714 (1929) (the exchange
 * operator in terms of spins); D. Loss and D. P. DiVincenzo, Phys. Rev. A
 * 57, 120 (1998) (H = J S_A . S_B, SWAP and sqrt(SWAP)); W. K. Wootters,
 * Phys. Rev. Lett. 80, 2245 (1998) (concurrence); V. Coffman, J. Kundu and
 * W. K. Wootters, Phys. Rev. A 61, 052306 (2000) (tangle; C^2 = 4 det rho_A
 * for pure states); M. A. Nielsen and I. L. Chuang, Quantum Computation and
 * Quantum Information (2010), Sec. 2.4 (reduced density operator, Bloch
 * vector) and Sec. 4.2 (rotation operators).
 *
 * Validation: scripts/verify-entangle.mjs (closed form against the
 * statevector and against exp(-iHt) for 256 seeded random cases, the
 * identities, the limits above, the loop, and the shipped pair).
 */

/** @typedef {import('./qubits.mjs').Vec3} Vec3 */

/**
 * Largest allowed | |v| - 1 | for an input Bloch vector. Loose enough for
 * vectors built from rounded angles, tight enough to catch a vector that
 * is not on the sphere.
 */
export const UNIT_TOL = 1e-9;

/** Length of entangledPair's output: [rA.x, rA.y, rA.z, rB.x, rB.y, rB.z, C]. */
export const PAIR_OUT_LENGTH = 7;

// Shipped pair (ENTANGLE_PAIR). a and b are given by round Bloch angles:
// a . b = cos(pi/3) cos(3pi/4) + sin(pi/3) sin(3pi/4) cos(5pi/6)
//       = -sqrt(2)/4 - 3 sqrt(2)/8 = -5 sqrt(2)/8 = -0.8839,
// so C_max = 1/2 + 5 sqrt(2)/16 = 0.9419 and |a x b| = sqrt(7/32) = 0.468.
// a sits 60 deg from +z and b 45 deg from -z, so both precess on wide
// circles about z.
const PAIR_THETA_A = Math.PI / 3; // rad
const PAIR_PHI_A = 0; // rad
const PAIR_THETA_B = (3 * Math.PI) / 4; // rad
const PAIR_PHI_B = (5 * Math.PI) / 6; // rad
const PAIR_LOOP_S = 48; // s, one seamless loop
const PAIR_EXCHANGE_TURNS = 2; // m: J L = 2 pi m, a full swap every L/(2m) = 12 s
const PAIR_FIELD_TURNS = 3; // n: omega L = 2 pi n, one precession turn every L/n = 16 s

/**
 * Throw unless every named value is a finite number.
 *
 * @param {Record<string, number>} values
 * @throws {RangeError} naming the first non-finite value
 */
function assertFinite(values) {
  for (const [name, v] of Object.entries(values)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new RangeError(`${name} must be a finite number, got ${v}`);
    }
  }
}

/**
 * Throw unless v is a finite 3-vector of unit length (within UNIT_TOL).
 *
 * @param {ArrayLike<number>} v
 * @param {string} name for the message
 * @throws {RangeError} on a short, non-finite or non-unit vector
 */
function assertUnit(v, name) {
  if (!v || v.length < 3) {
    throw new RangeError(`${name} must be a 3-vector, got length ${v ? v.length : v}`);
  }
  const x = v[0];
  const y = v[1];
  const z = v[2];
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    throw new RangeError(`${name} must be finite, got (${x}, ${y}, ${z})`);
  }
  const len = Math.hypot(x, y, z);
  if (Math.abs(len - 1) > UNIT_TOL) {
    throw new RangeError(`${name} must be a unit Bloch vector: |${name}| = ${len} (off by ${Math.abs(len - 1).toExponential(2)})`);
  }
}

/**
 * Unit Bloch vector at polar angle theta (from +z) and azimuth phi (from +x
 * toward +y): (sin theta cos phi, sin theta sin phi, cos theta), the state
 * cos(theta/2)|0> + e^{i phi} sin(theta/2)|1>.
 *
 * @param {number} theta polar angle (rad)
 * @param {number} phi azimuth (rad)
 * @returns {Vec3}
 * @throws {RangeError} if an angle is not finite
 */
export function blochFromAngles(theta, phi) {
  assertFinite({ theta, phi });
  const s = Math.sin(theta);
  return [s * Math.cos(phi), s * Math.sin(phi), Math.cos(theta)];
}

/**
 * Largest concurrence the pair reaches from the product state |a>|b>:
 * C_max = (1 - a . b)/2 = 1 - |<a|b>|^2 (header, point 7). 0 for a = b,
 * 1 for antipodal vectors.
 *
 * @param {ArrayLike<number>} a unit Bloch vector of A at t = 0
 * @param {ArrayLike<number>} b unit Bloch vector of B at t = 0
 * @returns {number} in [0, 1] (up to UNIT_TOL)
 * @throws {RangeError} if a or b is not a finite unit 3-vector
 */
export function concurrenceMax(a, b) {
  assertUnit(a, 'a');
  assertUnit(b, 'b');
  return (1 - (a[0] * b[0] + a[1] * b[1] + a[2] * b[2])) / 2;
}

/**
 * Reduced Bloch vectors of both qubits and their concurrence at time t,
 * starting from the product state |a>|b> (header, points 6 and 7):
 *   r_A = R_z(omega t) [cos^2(Jt/2) a + sin^2(Jt/2) b - (1/2) sin(Jt) a x b]
 *   r_B = R_z(omega t) [sin^2(Jt/2) a + cos^2(Jt/2) b + (1/2) sin(Jt) a x b]
 *   C   = |sin(J t)| (1 - a . b)/2.
 * Exact for every real J, omega and t (no time stepping), so any t may be
 * drawn directly. |r_A| = |r_B| = sqrt(1 - C^2).
 *
 * @param {ArrayLike<number>} a unit Bloch vector of qubit A at t = 0
 * @param {ArrayLike<number>} b unit Bloch vector of qubit B at t = 0
 * @param {number} J exchange rate (rad/s); > 0 antiferromagnetic
 * @param {number} omega field (Larmor) rate (rad/s); turns both vectors about +z
 * @param {number} t time (s)
 * @param {Float64Array} [out] at least PAIR_OUT_LENGTH entries
 * @returns {Float64Array} `out` = [rA.x, rA.y, rA.z, rB.x, rB.y, rB.z, C]
 * @throws {RangeError} if a or b is not a finite unit 3-vector, if J, omega
 *   or t is not finite, or if `out` is too short
 */
export function entangledPair(a, b, J, omega, t, out = new Float64Array(PAIR_OUT_LENGTH)) {
  assertUnit(a, 'a');
  assertUnit(b, 'b');
  assertFinite({ J, omega, t });
  if (out.length < PAIR_OUT_LENGTH) {
    throw new RangeError(`out needs ${PAIR_OUT_LENGTH} entries, got ${out.length}`);
  }
  const ax = a[0];
  const ay = a[1];
  const az = a[2];
  const bx = b[0];
  const by = b[1];
  const bz = b[2];
  const dot = ax * bx + ay * by + az * bz;
  // a x b
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  const jt = J * t;
  const c = Math.cos(jt / 2);
  const s = Math.sin(jt / 2);
  const stay = c * c; // cos^2(Jt/2): weight on the qubit's own start vector
  const swap = s * s; // sin^2(Jt/2): weight on the partner's
  const sinJt = Math.sin(jt);
  const twist = sinJt / 2; // coefficient of a x b
  // Before the field turn (header, points 4 and 5).
  const uAx = stay * ax + swap * bx - twist * nx;
  const uAy = stay * ay + swap * by - twist * ny;
  const uAz = stay * az + swap * bz - twist * nz;
  const uBx = swap * ax + stay * bx + twist * nx;
  const uBy = swap * ay + stay * by + twist * ny;
  const uBz = swap * az + stay * bz + twist * nz;
  // R_z(omega t), counterclockwise about +z (convention 4).
  const phi = omega * t;
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  out[0] = cp * uAx - sp * uAy;
  out[1] = sp * uAx + cp * uAy;
  out[2] = uAz;
  out[3] = cp * uBx - sp * uBy;
  out[4] = sp * uBx + cp * uBy;
  out[5] = uBz;
  out[6] = (Math.abs(sinJt) * (1 - dot)) / 2;
  return out;
}

/**
 * Rates that close the loop: J = 2 pi m / L and omega = 2 pi n / L, so
 * U(L) = (-i)^m 1 is a global phase and the figure repeats exactly every L
 * seconds (header, point 8). With gcd(m, n) = 1 nothing repeats sooner.
 *
 * @param {number} L loop length (s), > 0
 * @param {number} m exchange turns per loop, whole number >= 1
 * @param {number} n field turns per loop, whole number >= 1
 * @returns {{ J: number, omega: number }} rates in rad/s
 * @throws {RangeError} if L is not a finite positive number or m, n are not
 *   whole numbers >= 1
 */
export function loopRates(L, m, n) {
  assertFinite({ L });
  if (!(L > 0)) throw new RangeError(`loop length L must be > 0 s, got ${L}`);
  for (const [name, k] of /** @type {Array<[string, number]>} */ ([['m', m], ['n', n]])) {
    if (!Number.isInteger(k) || k < 1) {
      throw new RangeError(`${name} must be a whole number >= 1 so the loop closes, got ${k}`);
    }
  }
  return { J: (2 * Math.PI * m) / L, omega: (2 * Math.PI * n) / L };
}

/**
 * The shipped pair: start vectors a (qubit A) and b (qubit B), loop length
 * L (s) and whole turns per loop m (exchange) and n (field), for loopRates.
 * a = blochFromAngles(pi/3, 0) and b = blochFromAngles(3pi/4, 5pi/6), so
 * a . b = -5 sqrt(2)/8 = -0.884, C_max = 0.942, |a x b| = 0.468, and both
 * vectors sit well off the z axis (60 deg and 135 deg from +z), so the
 * precession is plain to see. L = 48 s with m = 2, n = 3 (coprime):
 * A and B fully swap every 12 s and precess once every 16 s, and the whole
 * figure repeats only after 48 s.
 */
export const ENTANGLE_PAIR = Object.freeze({
  a: Object.freeze(blochFromAngles(PAIR_THETA_A, PAIR_PHI_A)),
  b: Object.freeze(blochFromAngles(PAIR_THETA_B, PAIR_PHI_B)),
  L: PAIR_LOOP_S,
  m: PAIR_EXCHANGE_TURNS,
  n: PAIR_FIELD_TURNS,
});

/**
 * First moment of maximal entanglement for the shipped pair (s):
 * J t* = pi/2, so t* = L/(4m) = 6 s, where C = C_max (header, point 7).
 * The reduced-motion still frame.
 */
export const ENTANGLE_MAX_TIME = ENTANGLE_PAIR.L / (4 * ENTANGLE_PAIR.m);
