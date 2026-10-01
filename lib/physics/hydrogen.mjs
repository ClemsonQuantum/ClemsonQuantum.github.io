// @ts-check
/**
 * Hydrogen electron densities for the SC Quantathon v4 scroll stage.
 *
 * Units: atomic units throughout (a0 = hbar = m_e = e^2/(4 pi eps0) = 1), so
 * radii are in Bohr radii.
 *
 * Derivation
 * ----------
 * 1. States. psi_nlm(r, theta, phi) = R_nl(r) Y_lm(theta, phi). Only m = 0 is
 *    used, so every density below is axially symmetric about z and phi is
 *    uniform on [0, 2 pi). The rungs are the maximal-l states l = n - 1 (no
 *    radial nodes; m = 0, so not the "circular" |m| = l states); radial
 *    functions from Griffiths & Schroeter,
 *    Introduction to Quantum Mechanics, 3rd ed., Table 4.7:
 *      R_10 = 2 e^{-r}
 *      R_21 = r e^{-r/2} / (2 sqrt 6)
 *      R_32 = 4 r^2 e^{-r/3} / (81 sqrt 30)
 *      R_43 = r^3 e^{-r/4} / (768 sqrt 35)
 *    Zonal harmonics with c = cos(theta), normalized so int Y_l0^2 dOmega = 1:
 *      Y_00 = 1/(2 sqrt pi)          Y_10 = sqrt(3/(4 pi)) c
 *      Y_20 = sqrt(5/(16 pi))(3c^2 - 1)
 *      Y_30 = sqrt(7/(16 pi))(5c^3 - 3c)
 *
 * 2. The ladder. Scrolling moves through psi = cos(b) psi_a + sin(b) psi_b
 *    between neighbouring rungs (a, b) = (1s, 2p), (2p, 3d), (3d, 4f). The
 *    rungs are orthonormal, so every state on the path is normalized. The
 *    mixing angle b follows a smoothstep, so each pure orbital holds briefly
 *    before the next transition begins.
 *
 * 3. Radial marginal (exact, no cross term). With the volume element
 *    r^2 dr dc dphi, the density is p(r, c) = r^2 (A Y_a + B Y_b)^2, where
 *    A = cos(b) R_a(r) and B = sin(b) R_b(r). Because
 *    int_{-1}^{1} Y_a0 Y_b0 dc = delta_ab / (2 pi), integrating out c and phi
 *    leaves P(r) = cos^2(b) r^2 R_a^2 + sin^2(b) r^2 R_b^2.
 *    For l = n - 1, r^2 R_{n,n-1}^2 is exactly the Gamma(k = 2n + 1,
 *    rate = 2/n) density, e.g. 4 r^2 e^{-2r} for 1s. Its CDF is closed form
 *    for integer k:
 *      F_n(r) = 1 - e^{-x} sum_{j=0}^{k-1} x^j / j!,   x = 2r/n,
 *    so F(r) = cos^2(b) F_a(r) + sin^2(b) F_b(r) exactly.
 *
 * 4. Angular conditional (exact polynomial CDF). Given r, the density in c is
 *    p(c | r) proportional to q(c)^2 with q = A Y_a + B Y_b, a polynomial of
 *    degree <= 3. Its CDF int_{-1}^{c} q^2 is an exact polynomial of degree
 *    <= 7 (monotone because q^2 >= 0).
 *
 * 5. Smooth sampling (Knothe-Rosenblatt transport). Each dot keeps fixed
 *    uniforms (u_r, u_c, u_phi) and is placed at r = F^{-1}(u_r),
 *    c = F_{c|r}^{-1}(u_c), phi = 2 pi u_phi. The map is continuous in the
 *    ladder coordinate, so the cloud morphs without flicker. At every scroll
 *    position the dots are a transport of the uniforms to |psi|^2.
 *
 * 6. Lookup tables. The renderer tabulates the FORWARD CDFs, F(r) on evenly
 *    spaced radii and F(c | r) on evenly spaced c per radial row, and inverts
 *    them per dot: a binary search finds the cell with F_k <= u < F_{k+1},
 *    then linear interpolation inside it. Every cell then holds exactly its
 *    probability. (Inverse tables u -> r and u -> c interpolated linearly in
 *    u do not: the inverse CDFs have cube-root cusps at the angular nodes,
 *    which interpolation smears into the nodal planes and cones, and the
 *    radial inverse's last cell spreads its dots evenly over the far tail.)
 *
 * 7. Angular nodes. Y_l0 is proportional to the Legendre polynomial P_l(c),
 *    c = cos(theta), so the nodal cones sit at theta_k = arccos(c_k), the
 *    roots of the module's own polynomial RUNGS[l].Y. P_l has exactly l
 *    simple roots, all in (-1, 1): if it changed sign at only k < l points
 *    x_1 ... x_k there, then q(c) = (c - x_1) ... (c - x_k), of degree k < l,
 *    would give P_l q one sign on (-1, 1), so int_{-1}^{1} P_l q dc could not
 *    vanish, against the orthogonality of P_l to every polynomial of lower
 *    degree. By Rolle's theorem p' vanishes between consecutive roots of p,
 *    so p' also has only real, simple roots inside (-1, 1), interlaced with
 *    those of p. They cut [-1, 1] into l pieces, on each of which p is
 *    monotone and changes sign once. angularNodes bisects each piece down to
 *    adjacent doubles, recursing on p' for the cuts. Closed forms:
 *      l = 0: no node;  l = 1: c = 0 (the equatorial plane);
 *      l = 2: c = +-1/sqrt(3), theta = 54.7356 and 125.2644 deg;
 *      l = 3: c = 0 and +-sqrt(3/5), theta = 39.2315, 90 and 140.7685 deg.
 *
 * 8. Line wavelengths (SI, nm). Electron and proton orbit their common centre
 *    of mass; separating that motion leaves one particle of reduced mass
 *    mu = m_e m_p / (m_e + m_p) = m_e / (1 + m_e/m_p) in the Coulomb field.
 *    The Bohr levels scale with that mass, so
 *      E_n = -h c R_H / n^2,   R_H = R_inf / (1 + m_e/m_p),
 *    where R_inf = m_e e^4 / (8 eps0^2 h^3 c) is the Rydberg constant for an
 *    infinitely heavy nucleus (both inputs CODATA 2018; R_H = 10967758.34
 *    m^-1). A photon between levels n1 < n2 carries E_{n2} - E_{n1}, so
 *      1 / lambda_vac = R_H (1/n1^2 - 1/n2^2) = R_H (n2 - n1)(n2 + n1) / (n1 n2)^2,
 *    the factored form being free of cancellation for neighbouring levels.
 *    Limits: n2 -> infinity gives the series limit lambda = n1^2 / R_H
 *    (91.1763 nm Lyman, 364.7053 nm Balmer, 820.5870 nm Paschen). With
 *    n2 = n1 + 1, lambda = n1^2 (n1 + 1)^2 / ((2 n1 + 1) R_H), which tends to
 *    n1^3 / (2 R_H) as n1 grows: the correspondence limit, in which the photon
 *    frequency approaches the classical orbit frequency 2 c R_H / n1^3.
 *    Neglected (scripts/verify-hydrogen.mjs puts both back against NIST):
 *    Fine structure. Dirac's levels are
 *      E_nj = E_n [1 + (alpha^2 / n^2)(n / (j + 1/2) - 3/4)],
 *    a shift of (alpha^2 / n^3)(1 / (j + 1/2) - 3/(4n)) Rydberg, of order
 *    alpha^2/n^3 (alpha^2 = 5.3e-5), i.e. alpha^2/n relative to the level. It
 *    splits each line into components lying 0.0015 to 0.0020 nm shortward of
 *    the Bohr value for Ly-alpha, from 0.0173 nm shortward to 0.0031 nm
 *    longward for H-alpha, and from 0.047 nm shortward to 0.007 nm longward
 *    for Pa-alpha (relative shifts up to 2.6e-5). The Lamb shift (QED: 8.17
 *    GHz for 1s, 0.0004 nm at Ly-alpha) and hyperfine structure (1.42 GHz for
 *    1s) are smaller still.
 *
 * 9. Air wavelengths and labels. NIST ASD quotes vacuum wavelengths where the
 *    vacuum wavenumber is at least 50000 cm^-1 or at most 5000 cm^-1 (lambda_vac
 *    <= 200 nm or >= 2000 nm) and wavelengths in standard air (dry, 15 C,
 *    101325 Pa, 0.033% CO2) in between, lambda_air = lambda_vac / n, with
 *    the dispersion formula of Peck & Reeder:
 *      n - 1 = 1e-8 (8060.51 + 2480990 / (132.274 - s^2) + 17455.7 / (39.32957 - s^2)),
 *    s = 1 / lambda_vac in um^-1. Its two terms are far-ultraviolet
 *    resonances (poles at 86.9 and 159.5 nm), so n falls monotonically with
 *    wavelength: n - 1 = 3.39e-4 at 185 nm, 2.76e-4 at H-alpha, and 2.7261e-4
 *    as lambda -> infinity. Peck & Reeder fitted data from 185 to 1700 nm;
 *    NIST extrapolates the formula to 2000 nm, and so does airRefractiveIndex.
 *    Across that extension the formula moves n by only 1.5e-7 (0.0003 nm of
 *    wavelength at 2000 nm, 0.0002 nm at Pa-alpha), so even a true index that
 *    stopped dispersing at 1700 nm would differ by less, and Ciddor's
 *    independent formula (1996) agrees with it to 5e-9 there. Bands use the
 *    conventional edges on the quoted wavelength: ultraviolet below 380 nm,
 *    visible from 380 to 750 nm, infrared above. No hydrogen line lies within
 *    the air-vacuum difference (0.1 to 0.2 nm) of an edge, so quoting the
 *    vacuum value instead would never change a label.
 *
 * 10. The ladder's transitions. Each step 1s -> 2p -> 3d -> 4f raises n and l
 *    by one at m = 0, an electric-dipole transition with amplitude
 *    <n' l' m'| r |n l m>. Write r through z = r cos(theta) and
 *    x +- i y = r sin(theta) e^{+-i phi}. The phi integral
 *    int e^{-i m' phi} e^{i q phi} e^{i m phi} dphi (q = 0 for z, +-1 for
 *    x +- i y) vanishes unless m' = m + q, so from m = 0 to m' = 0 only z
 *    contributes: Delta m = 0. Bonnet's recursion
 *      (2l + 1) c P_l(c) = (l + 1) P_{l+1}(c) + l P_{l-1}(c)
 *    makes cos(theta) Y_l0 a combination of Y_{l+1,0} and Y_{l-1,0} only, so
 *    the angular integral vanishes unless l' = l +- 1. The radial integral
 *    int R_{n+1,l+1} R_{n,l} r^3 dr is strictly positive (both l = n - 1
 *    functions are nodeless and positive), so each step is allowed, not
 *    merely unforbidden. The transition dipole points along z, the
 *    quantization axis, so the light is pi-polarized: linear, in the plane of
 *    z and the line of sight, with intensity proportional to sin^2(theta) and
 *    none emitted along the axis (oscillating-dipole radiation; Jackson,
 *    Classical Electrodynamics, 3rd ed., Sec. 9.2). Climbing the ladder absorbs
 *    the photon; falling back emits it. The Bohr step energies depend only on
 *    n, so the three steps are Ly-alpha (ultraviolet), H-alpha (visible) and
 *    Pa-alpha (infrared).
 *
 * Sources for points 8 to 10: CODATA 2018 (E. Tiesinga et al., Rev. Mod. Phys.
 * 93, 025010 (2021)); E. R. Peck & K. Reeder, J. Opt. Soc. Am. 62, 958 (1972);
 * NIST Atomic Spectra Database (A. Kramida, Yu. Ralchenko, J. Reader and the
 * NIST ASD Team), H I lines and its help page on air wavelengths; P. E. Ciddor,
 * Appl. Opt. 35, 1566 (1996).
 *
 * Validation: scripts/verify-hydrogen.mjs (npm run verify:physics) checks normalization,
 * orthogonality, the Gamma-CDF identity against quadrature, <r> =
 * (3n^2 - l(l + 1))/2, table monotonicity, and, through the shipped seeds and
 * lookups, the sampled moments, the emptiness of the nodes, and the tail. It
 * also checks the angular nodes against P_l, the line wavelengths and their
 * limits against NIST ASD (with the fine structure added back), the air index
 * against Ciddor, the ladder transitions, and spectralSrgb
 * (lib/physics/blackbody.mjs) against the CIE 1931 table.
 */

const SQRT_PI = Math.sqrt(Math.PI);

/**
 * @typedef {object} Rung
 * @property {string} label spectroscopic label, e.g. "2p"
 * @property {number} n principal quantum number
 * @property {number} l orbital quantum number (= n - 1 here)
 * @property {(r: number) => number} R radial function R_nl(r)
 * @property {number[]} Y coefficients of Y_l0 in powers of c = cos(theta),
 *   lowest order first
 */

/** @type {Rung[]} */
export const RUNGS = [
  { label: '1s', n: 1, l: 0, R: (r) => 2 * Math.exp(-r), Y: [1 / (2 * SQRT_PI)] },
  {
    label: '2p',
    n: 2,
    l: 1,
    R: (r) => (r * Math.exp(-r / 2)) / (2 * Math.sqrt(6)),
    Y: [0, Math.sqrt(3 / (4 * Math.PI))],
  },
  {
    label: '3d',
    n: 3,
    l: 2,
    R: (r) => (4 * r * r * Math.exp(-r / 3)) / (81 * Math.sqrt(30)),
    Y: [-Math.sqrt(5 / (16 * Math.PI)), 0, 3 * Math.sqrt(5 / (16 * Math.PI))],
  },
  {
    label: '4f',
    n: 4,
    l: 3,
    R: (r) => (r * r * r * Math.exp(-r / 4)) / (768 * Math.sqrt(35)),
    Y: [0, -3 * Math.sqrt(7 / (16 * Math.PI)), 0, 5 * Math.sqrt(7 / (16 * Math.PI))],
  },
];

/** Largest ladder coordinate (the last rung). */
export const LADDER_MAX = RUNGS.length - 1;

/**
 * @typedef {object} LadderState
 * @property {number} a index of the lower rung in RUNGS
 * @property {number} b index of the upper rung (a + 1)
 * @property {number} ca amplitude cos(beta) on rung a
 * @property {number} cb amplitude sin(beta) on rung b
 */

/**
 * State at ladder coordinate s in [0, LADDER_MAX]: integer s is a pure rung;
 * in between, a smoothstep-weighted rotation from rung floor(s) to the next.
 *
 * @param {number} s ladder coordinate (clamped to [0, LADDER_MAX])
 * @returns {LadderState}
 */
export function ladderState(s) {
  const L = Math.min(LADDER_MAX - 1e-9, Math.max(0, s));
  const a = Math.floor(L);
  const t = L - a;
  const beta = (t * t * (3 - 2 * t) * Math.PI) / 2;
  return { a, b: a + 1, ca: Math.cos(beta), cb: Math.sin(beta) };
}

/**
 * Exact radial CDF of rung n: Gamma(k = 2n + 1, rate = 2/n) at radius r.
 *
 * @param {number} n principal quantum number of an l = n - 1 rung
 * @param {number} r radius (Bohr radii), r >= 0
 * @returns {number} P(radius <= r)
 */
export function rungRadialCdf(n, r) {
  if (r <= 0) return 0;
  const x = (2 * r) / n;
  const k = 2 * n + 1;
  // Accumulate sum_{j=0}^{k-1} x^j / j! term by term (small integer k).
  let term = 1;
  let sum = 1;
  for (let j = 1; j < k; j++) {
    term *= x / j;
    sum += term;
  }
  return 1 - Math.exp(-x) * sum;
}

/**
 * Exact radial CDF of a ladder state (no cross term; see header, point 3).
 *
 * @param {LadderState} st
 * @param {number} r radius (Bohr radii)
 * @returns {number}
 */
export function radialCdf(st, r) {
  const { a, b, ca, cb } = st;
  return ca * ca * rungRadialCdf(RUNGS[a].n, r) + cb * cb * rungRadialCdf(RUNGS[b].n, r);
}

/**
 * Invert the radial CDF by bisection: the radius r with F(r) = u.
 *
 * @param {LadderState} st
 * @param {number} u probability in [0, 1]
 * @returns {number} radius (Bohr radii)
 */
export function radialQuantile(st, u) {
  if (u <= 0) return 0;
  // The 4f rung (the widest) keeps < 1e-12 of its probability beyond ~140 a0.
  let lo = 0;
  let hi = 160;
  for (let it = 0; it < 60; it++) {
    const mid = 0.5 * (lo + hi);
    if (radialCdf(st, mid) < u) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * Multiply two polynomials given as coefficient arrays (lowest order first).
 *
 * @param {number[]} p
 * @param {number[]} q
 * @returns {number[]}
 */
function polyMul(p, q) {
  const out = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) out[i + j] += p[i] * q[j];
  }
  return out;
}

/**
 * Angular conditional CDF c -> P(cos(theta) <= c | r) for q = A Y_a + B Y_b.
 * Returns null where q vanishes identically (e.g. r = 0 for p/d/f mixtures),
 * where every c is equally likely.
 *
 * @param {LadderState} st
 * @param {number} r radius (Bohr radii)
 * @returns {((c: number) => number) | null}
 */
export function angularCdf(st, r) {
  const Ya = RUNGS[st.a].Y;
  const Yb = RUNGS[st.b].Y;
  const A = st.ca * RUNGS[st.a].R(r);
  const B = st.cb * RUNGS[st.b].R(r);
  const q = new Array(Math.max(Ya.length, Yb.length)).fill(0);
  Ya.forEach((y, k) => (q[k] += A * y));
  Yb.forEach((y, k) => (q[k] += B * y));
  const q2 = polyMul(q, q);
  // Antiderivative of q^2, then F(c) = I(c) - I(-1), normalized by I(1) - I(-1).
  const I = [0, ...q2.map((coef, k) => coef / (k + 1))];
  const evalI = (/** @type {number} */ c) => {
    let v = 0;
    for (let k = I.length - 1; k >= 0; k--) v = v * c + I[k];
    return v;
  };
  const I0 = evalI(-1);
  const total = evalI(1) - I0;
  if (!(total > 0)) return null;
  return (c) => (evalI(c) - I0) / total;
}

// ---------------------------------------------------------------------------
// Lookup tables and the per-dot sampler (header, point 6). The WebGL vertex
// shader in components/scq4/atomRenderer.ts mirrors sampleRadius and
// sampleCosTheta line for line; the Canvas 2D fallback and the verifier call
// them directly.
// ---------------------------------------------------------------------------

/** Radial table entries: F(r) at evenly spaced radii on [0, rMax]. */
export const RADIAL_TABLE_SIZE = 384;
/** Angular table: rows of radii on [0, rTop] by columns of c on [-1, 1]. */
export const ANGULAR_TABLE_ROWS = 96;
export const ANGULAR_TABLE_COLS = 64;
/** rTop = this x the state's 95th-percentile radius; rarer dots reuse the
 * last row, where the conditional has converged. */
export const ANGULAR_TOP_OVER_R95 = 2.2;
/** The radial table ends at this quantile (rMax); rarer dots sit at rMax. */
export const RADIAL_TAIL_U = 1 - 1e-6;

/**
 * Forward radial CDF table: entry k is F(r_k), r_k = rMax k / (n - 1).
 *
 * @param {LadderState} st
 * @param {number} n entries (>= 2)
 * @param {number} rMax radius of the last entry (Bohr radii), e.g. the
 *   RADIAL_TAIL_U quantile
 * @returns {Float32Array}
 */
export function buildRadialCdfTable(st, n, rMax) {
  const out = new Float32Array(n);
  for (let k = 1; k < n; k++) out[k] = radialCdf(st, (rMax * k) / (n - 1));
  out[0] = 0;
  return out;
}

/**
 * Forward angular CDF table, row-major [row][column]: row i is the radius
 * rTop i / (rows - 1), column j is c_j = -1 + 2 j / (cols - 1), and the
 * entry is P(cos(theta) <= c_j | r). Where q vanishes identically (r = 0 for
 * p/d/f mixtures) every c is equally likely.
 *
 * @param {LadderState} st
 * @param {number} rows radial rows (>= 2)
 * @param {number} cols columns of c (>= 2)
 * @param {number} rTop radius of the last row (Bohr radii)
 * @returns {Float32Array}
 */
export function buildAngularCdfTable(st, rows, cols, rTop) {
  const out = new Float32Array(rows * cols);
  for (let i = 0; i < rows; i++) {
    const F = angularCdf(st, (rTop * i) / (rows - 1));
    for (let j = 1; j < cols - 1; j++) {
      const c = -1 + (2 * j) / (cols - 1);
      out[i * cols + j] = F === null ? (c + 1) / 2 : F(c);
    }
    // Exact ends, so a search always brackets u in [0, 1].
    out[i * cols] = 0;
    out[i * cols + cols - 1] = 1;
  }
  return out;
}

/**
 * Radius for the uniform u through a forward radial CDF table: find the cell
 * with table[k] <= u < table[k + 1] by bisection, interpolate inside it.
 *
 * @param {ArrayLike<number>} table forward CDF (buildRadialCdfTable)
 * @param {number} rMax radius of the last entry
 * @param {number} u uniform in [0, 1]
 * @returns {number} radius (Bohr radii)
 */
export function sampleRadius(table, rMax, u) {
  const n = table.length;
  if (!(u > 0)) return 0;
  if (u >= table[n - 1]) return rMax;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid] <= u) lo = mid;
    else hi = mid;
  }
  const f0 = table[lo];
  const f1 = table[hi];
  const t = f1 > f0 ? (u - f0) / (f1 - f0) : 0;
  return ((lo + t) * rMax) / (n - 1);
}

/**
 * cos(theta) for the uniform u at normalized radius rn = r / rTop through a
 * forward angular CDF table. The two radial rows around rn are blended (a
 * mixture of CDFs is a CDF), then searched like sampleRadius.
 *
 * @param {ArrayLike<number>} table forward CDF (buildAngularCdfTable)
 * @param {number} rows
 * @param {number} cols
 * @param {number} u uniform in [0, 1]
 * @param {number} rn r / rTop (clamped to [0, 1])
 * @returns {number} cos(theta) in [-1, 1]
 */
export function sampleCosTheta(table, rows, cols, u, rn) {
  const y = Math.min(1, Math.max(0, rn)) * (rows - 1);
  const j0 = Math.min(Math.floor(y), rows - 1);
  const j1 = Math.min(j0 + 1, rows - 1);
  const w = y - j0;
  const F = (/** @type {number} */ k) => table[j0 * cols + k] * (1 - w) + table[j1 * cols + k] * w;
  const uc = Math.min(1, Math.max(0, u));
  let lo = 0;
  let hi = cols - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (F(mid) <= uc) lo = mid;
    else hi = mid;
  }
  const f0 = F(lo);
  const f1 = F(hi);
  const t = f1 > f0 ? Math.min(1, Math.max(0, (uc - f0) / (f1 - f0))) : 0.5;
  return -1 + (2 * (lo + t)) / (cols - 1);
}

// Quasi-random seeds from the R3 sequence (Roberts 2018): x_i = frac(0.5 +
// i * (1/g, 1/g^2, 1/g^3)), g the positive root of g^4 = g + 1. Fills the
// unit cube more evenly than pseudo-random numbers, so the haze has no clumps.
// R3 is a Kronecker lattice, though, and at tens of thousands of dots its
// rows survive the smooth transport as faint moire streaks. So each seed is
// nudged by a hashed offset of up to half a lattice cell (N^(-1/3)) per axis
// (randomized quasi-Monte Carlo): the regularity breaks, the even coverage
// stays, and the result is still deterministic.
const R3_G = 1.2207440846057595;

/**
 * mulberry32: a small, well-mixed 32-bit PRNG, used only for the jitter.
 *
 * @param {number} seed
 * @returns {() => number} uniform in [0, 1)
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

/**
 * The cloud's fixed uniforms (u_r, u_c, u_phi) per dot, interleaved.
 *
 * @param {number} count dots
 * @returns {Float32Array} length 3 count
 */
export function r3Seeds(count) {
  const a1 = 1 / R3_G;
  const a2 = a1 / R3_G;
  const a3 = a2 / R3_G;
  const cell = 1 / Math.cbrt(count);
  const rand = mulberry32(0x5c4a7e);
  const wrap = (/** @type {number} */ v) => v - Math.floor(v);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    out[3 * i] = wrap(0.5 + (i + 1) * a1 + (rand() - 0.5) * cell);
    out[3 * i + 1] = wrap(0.5 + (i + 1) * a2 + (rand() - 0.5) * cell);
    out[3 * i + 2] = wrap(0.5 + (i + 1) * a3 + (rand() - 0.5) * cell);
  }
  return out;
}

/**
 * Human-readable state, e.g. "ψ = 0.71 |1s⟩ + 0.71 |2p⟩", or "ψ = |2p⟩"
 * for a pure rung (amplitudes below 0.005 print as pure).
 *
 * @param {LadderState} st
 * @returns {string}
 */
export function stateLabel(st) {
  const A = RUNGS[st.a].label;
  const B = RUNGS[st.b].label;
  if (st.cb < 0.005) return `ψ = |${A}⟩`;
  if (st.ca < 0.005) return `ψ = |${B}⟩`;
  return `ψ = ${st.ca.toFixed(2)} |${A}⟩ + ${st.cb.toFixed(2)} |${B}⟩`;
}

// ---------------------------------------------------------------------------
// Angular nodes (header, point 7).
// ---------------------------------------------------------------------------

/**
 * Horner evaluation of a polynomial given lowest order first.
 *
 * @param {readonly number[]} p coefficients
 * @param {number} x
 * @returns {number}
 */
function polyEval(p, x) {
  let v = 0;
  for (let k = p.length - 1; k >= 0; k--) v = v * x + p[k];
  return v;
}

/**
 * Coefficients of the derivative p' (lowest order first).
 *
 * @param {readonly number[]} p
 * @returns {number[]}
 */
function polyDerivative(p) {
  return p.slice(1).map((coef, k) => (k + 1) * coef);
}

/**
 * Ascending roots in (-1, 1) of a polynomial whose roots are all real, simple
 * and inside (-1, 1), as for every Legendre polynomial (header, point 7). The
 * roots of p' cut [-1, 1] into pieces on which p is monotone, and each piece
 * where p changes sign is bisected down to adjacent doubles. A piece without a
 * sign change is skipped, so a polynomial that breaks the premise returns too
 * few roots; callers check the count.
 *
 * @param {readonly number[]} p coefficients, lowest order first
 * @returns {number[]}
 */
function rootsInUnitInterval(p) {
  if (p.length < 2) return [];
  const cuts = [-1, ...rootsInUnitInterval(polyDerivative(p)), 1];
  const roots = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    let lo = cuts[i];
    let hi = cuts[i + 1];
    let fLo = polyEval(p, lo);
    const fHi = polyEval(p, hi);
    if (fLo === 0 || fHi === 0 || (fLo < 0) === (fHi < 0)) continue;
    for (;;) {
      const mid = 0.5 * (lo + hi);
      if (mid <= lo || mid >= hi) break; // lo and hi are adjacent doubles
      const fMid = polyEval(p, mid);
      if (fMid === 0) {
        lo = mid;
        hi = mid;
        break;
      }
      if ((fMid < 0) === (fLo < 0)) {
        lo = mid;
        fLo = fMid;
      } else {
        hi = mid;
      }
    }
    roots.push(Math.abs(polyEval(p, lo)) <= Math.abs(polyEval(p, hi)) ? lo : hi);
  }
  return roots;
}

/**
 * Polar angles of the nodal cones of Y_l0 (header, point 7): the roots of the
 * module's angular polynomial RUNGS[l].Y in c = cos(theta), as theta. For
 * l = 2 these are arccos(+-1/sqrt(3)) = 54.7356 and 125.2644 deg.
 *
 * @param {number} l orbital quantum number, an integer in 0..LADDER_MAX
 * @returns {Float64Array} the l node angles (rad), ascending in (0, pi); empty
 *   for l = 0
 * @throws {RangeError} if l is not an integer in 0..LADDER_MAX
 * @throws {Error} if the polynomial does not have l simple roots in (-1, 1)
 *   (a corrupted coefficient table)
 */
export function angularNodes(l) {
  if (!Number.isInteger(l) || l < 0 || l > LADDER_MAX) {
    throw new RangeError(`[hydrogen] angularNodes: l must be an integer in 0..${LADDER_MAX}, got ${l}`);
  }
  const rung = RUNGS[l];
  const cs = rootsInUnitInterval(rung.Y);
  if (rung.l !== l || cs.length !== l) {
    throw new Error(
      `[hydrogen] angularNodes: Y_${l}0 must have ${l} simple roots in (-1, 1), ` +
        `found ${cs.length} for rung ${rung.label} (l = ${rung.l})`,
    );
  }
  // c ascending means theta = arccos(c) descending, so read the roots backwards.
  return Float64Array.from(cs, (_, k) => Math.acos(cs[l - 1 - k]));
}

// ---------------------------------------------------------------------------
// Line wavelengths, air wavelengths and the ladder's transitions (header,
// points 8 to 10). SI units; wavelengths in nm.
// ---------------------------------------------------------------------------

/** Rydberg constant for an infinitely heavy nucleus, R_inf (m^-1), CODATA 2018. */
export const RYDBERG_INF_PER_M = 10973731.568160;
/** Electron-to-proton mass ratio m_e / m_p, CODATA 2018. */
export const ELECTRON_PROTON_MASS_RATIO = 5.44617021487e-4;

const NM_PER_M = 1e9;
const NM_PER_UM = 1e3;

/**
 * Peck & Reeder (1972) standard-air dispersion (header, point 9):
 * n - 1 = REFRACTIVITY_UNIT (a + b1 / (c1 - s^2) + b2 / (c2 - s^2)), s in um^-1.
 */
const PECK_REEDER = Object.freeze({ a: 8060.51, b1: 2480990, c1: 132.274, b2: 17455.7, c2: 39.32957 });
const REFRACTIVITY_UNIT = 1e-8;

/** Air wavelengths are quoted only for AIR_WAVELENGTH_MIN_NM < lambda_vac <
 * AIR_WAVELENGTH_MAX_NM (vacuum wavenumber between 5000 and 50000 cm^-1);
 * vacuum wavelengths outside (NIST ASD; header, point 9). */
export const AIR_WAVELENGTH_MIN_NM = 200;
export const AIR_WAVELENGTH_MAX_NM = 2000;
/** Domain of airRefractiveIndex (vacuum nm): Peck & Reeder's fit starts at
 * 185 nm; it ends at 1700 nm and is extrapolated, as NIST does, to the
 * 2000 nm switch back to vacuum wavelengths. */
export const AIR_INDEX_MIN_NM = 185;
export const AIR_INDEX_MAX_NM = AIR_WAVELENGTH_MAX_NM;
/** Conventional band edges (nm): ultraviolet below VISIBLE_MIN_NM, infrared
 * above VISIBLE_MAX_NM. */
export const VISIBLE_MIN_NM = 380;
export const VISIBLE_MAX_NM = 750;

/**
 * Rydberg constant for hydrogen-1, reduced-mass corrected (header, point 8).
 *
 * @returns {number} R_H = R_inf / (1 + m_e/m_p) = 10967758.34 m^-1
 */
export function rydbergHydrogen() {
  return RYDBERG_INF_PER_M / (1 + ELECTRON_PROTON_MASS_RATIO);
}

/**
 * Vacuum wavelength of the Bohr line between levels n1 < n2,
 * 1 / lambda = R_H (1/n1^2 - 1/n2^2) (header, point 8). Fine structure, the
 * Lamb shift and hyperfine structure are left out: relative size of order
 * alpha^2/n, at most 2.6e-5 for the ladder's lines.
 *
 * @param {number} n1 lower principal quantum number, an integer >= 1
 * @param {number} n2 upper principal quantum number: an integer > n1, or
 *   Infinity for the series limit n1^2 / R_H
 * @returns {number} vacuum wavelength (nm), e.g. 121.568 for (1, 2)
 * @throws {RangeError} unless n1 is an integer >= 1 and n2 an integer > n1 or Infinity
 */
export function vacuumWavelengthNm(n1, n2) {
  if (!(Number.isInteger(n1) && n1 >= 1)) {
    throw new RangeError(`[hydrogen] vacuumWavelengthNm: n1 must be an integer >= 1, got ${n1}`);
  }
  if (!(n2 === Infinity || (Number.isInteger(n2) && n2 > n1))) {
    throw new RangeError(`[hydrogen] vacuumWavelengthNm: n2 must be an integer > n1 = ${n1}, or Infinity, got ${n2}`);
  }
  // 1/n1^2 - 1/n2^2 in factored form (no cancellation for neighbouring levels).
  const termGap = n2 === Infinity ? 1 / (n1 * n1) : ((n2 - n1) * (n2 + n1)) / (n1 * n1 * n2 * n2);
  return NM_PER_M / (rydbergHydrogen() * termGap);
}

/**
 * Refractive index of standard dry air (15 C, 101325 Pa, 0.033% CO2) from
 * Peck & Reeder (1972), the formula NIST ASD uses (header, point 9). The
 * argument is the VACUUM wavelength, as in the formula.
 *
 * @param {number} lambdaVacNm vacuum wavelength (nm), in
 *   AIR_INDEX_MIN_NM..AIR_INDEX_MAX_NM (185..2000)
 * @returns {number} n: 1.000339 at 185 nm, falling to 1.000273 at 2000 nm
 * @throws {RangeError} outside 185..2000 nm (below, the formula nears its
 *   poles at 159.5 and 86.9 nm; above, it would be extrapolated further than
 *   NIST does), or for a non-finite wavelength
 */
export function airRefractiveIndex(lambdaVacNm) {
  if (!(Number.isFinite(lambdaVacNm) && lambdaVacNm >= AIR_INDEX_MIN_NM && lambdaVacNm <= AIR_INDEX_MAX_NM)) {
    throw new RangeError(
      `[hydrogen] airRefractiveIndex: vacuum wavelength must be within ${AIR_INDEX_MIN_NM}..${AIR_INDEX_MAX_NM} nm, got ${lambdaVacNm}`,
    );
  }
  const s = NM_PER_UM / lambdaVacNm; // vacuum wavenumber, um^-1
  const s2 = s * s;
  const { a, b1, c1, b2, c2 } = PECK_REEDER;
  return 1 + REFRACTIVITY_UNIT * (a + b1 / (c1 - s2) + b2 / (c2 - s2));
}

/** @typedef {'ultraviolet' | 'visible' | 'infrared'} SpectralBand */

/**
 * A wavelength as spectroscopists quote it.
 *
 * @typedef {object} QuotedWavelength
 * @property {number} nm the quoted wavelength (nm), in the medium below
 * @property {'vacuum' | 'air'} medium vacuum for lambda_vac <= 200 nm or
 *   >= 2000 nm, standard air in between
 * @property {SpectralBand} band from the quoted wavelength: ultraviolet below
 *   380 nm, visible from 380 to 750 nm, infrared above
 */

/**
 * Quote a vacuum wavelength by the NIST ASD convention (header, point 9):
 * unchanged in vacuum at or below 200 nm and at or above 2000 nm, divided by
 * the index of standard air in between; then label its band.
 *
 * @param {number} lambdaVacNm vacuum wavelength (nm), finite and > 0
 * @returns {QuotedWavelength}
 * @throws {RangeError} for a wavelength that is not finite and positive
 */
export function spectroscopicWavelength(lambdaVacNm) {
  if (!(Number.isFinite(lambdaVacNm) && lambdaVacNm > 0)) {
    throw new RangeError(`[hydrogen] spectroscopicWavelength: vacuum wavelength must be finite and > 0 nm, got ${lambdaVacNm}`);
  }
  const inAir = lambdaVacNm > AIR_WAVELENGTH_MIN_NM && lambdaVacNm < AIR_WAVELENGTH_MAX_NM;
  const nm = inAir ? lambdaVacNm / airRefractiveIndex(lambdaVacNm) : lambdaVacNm;
  /** @type {SpectralBand} */
  const band = nm < VISIBLE_MIN_NM ? 'ultraviolet' : nm > VISIBLE_MAX_NM ? 'infrared' : 'visible';
  return { nm, medium: inAir ? 'air' : 'vacuum', band };
}

/**
 * The hydrogen line between levels n1 < n2 as spectroscopists quote it
 * (header, points 8 and 9): Ly-alpha (1, 2) is 121.568 nm in vacuum,
 * H-alpha (2, 3) 656.288 nm in air, Pa-alpha (3, 4) 1875.115 nm in air.
 *
 * @param {number} n1 lower principal quantum number, an integer >= 1
 * @param {number} n2 upper principal quantum number, an integer > n1, or Infinity
 * @returns {QuotedWavelength}
 * @throws {RangeError} as vacuumWavelengthNm
 */
export function transitionWavelength(n1, n2) {
  return spectroscopicWavelength(vacuumWavelengthNm(n1, n2));
}

/**
 * One step of the orbital ladder (header, point 10).
 *
 * @typedef {object} LadderTransition
 * @property {string} from lower rung label, e.g. "1s"
 * @property {string} to upper rung label, e.g. "2p"
 * @property {number} n1 lower principal quantum number
 * @property {number} n2 upper principal quantum number (n1 + 1)
 * @property {number} l1 lower orbital quantum number
 * @property {number} l2 upper orbital quantum number (l1 + 1)
 * @property {number} nm quoted wavelength (nm), in `medium`
 * @property {'vacuum' | 'air'} medium
 * @property {SpectralBand} band
 * @property {'pi'} polarization Delta m = 0: linearly polarized along the
 *   quantization axis, sin^2(theta) pattern, nothing emitted along the axis
 */

/**
 * The ladder's three steps in order, 1s -> 2p, 2p -> 3d and 3d -> 4f, each an
 * m = 0 -> 0, Delta l = +1 electric-dipole (pi) transition (header, point 10):
 * Ly-alpha 121.568 nm (vacuum, ultraviolet), H-alpha 656.288 nm (air,
 * visible), Pa-alpha 1875.115 nm (air, infrared). Built from RUNGS; throws at
 * load if a step does not raise n and l by one.
 *
 * @type {ReadonlyArray<Readonly<LadderTransition>>}
 */
export const LADDER_TRANSITIONS = Object.freeze(
  RUNGS.slice(1).map((upper, k) => {
    const lower = RUNGS[k];
    if (upper.n !== lower.n + 1 || upper.l !== lower.l + 1) {
      throw new Error(
        `[hydrogen] ladder step ${lower.label} -> ${upper.label} must raise n and l by one ` +
          `(got n ${lower.n} -> ${upper.n}, l ${lower.l} -> ${upper.l})`,
      );
    }
    const { nm, medium, band } = transitionWavelength(lower.n, upper.n);
    return Object.freeze({
      from: lower.label,
      to: upper.label,
      n1: lower.n,
      n2: upper.n,
      l1: lower.l,
      l2: upper.l,
      nm,
      medium,
      band,
      polarization: /** @type {'pi'} */ ('pi'),
    });
  }),
);
