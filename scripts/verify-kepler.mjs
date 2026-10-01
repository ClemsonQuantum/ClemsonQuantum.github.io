// @ts-check
/**
 * Verification for lib/physics/kepler.mjs, the planet positions behind the
 * SC Quantathon v4 orrery. Run with `node scripts/verify-kepler.mjs`; it
 * needs no network and exits non-zero on the first failed assertion.
 *
 * Checks
 *   1. Table 1 transcription: PLANETS equals JPL's printed block (embedded
 *      below verbatim), digit for digit.
 *   2. Julian dates: the Unix epoch, J2000.0, and Table 1's interval ends.
 *   3. Kepler's equation: |E - e sin E - M| < 1e-12 rad over a grid of M for
 *      e in {0, 0.2, 0.9} (0.99 and 0.999 as stress cases), the exact limits
 *      (e = 0; M = 0 and pi), oddness in M, and M outside (-pi, pi].
 *   4. Rotation: the I = 0 and polar-orbit limits, and orthonormal P, Q with
 *      P x Q = (sin I sin Omega, -sin I cos Omega, cos I) for every planet.
 *   5. Ellipse geometry: every orbitPath point has r = a (1 - e cos E) and
 *      lies in the orbit plane; perihelion a (1 - e) and aphelion a (1 + e);
 *      the node sits at longitude Omega; planetPosition solves Kepler.
 *   6. Sidereal periods from the L rates vs the published periods (0.1%).
 *   7. Kepler's third law with the two-body mass term vs the L-rate periods.
 *   8. Saturn's ring plane (IAU pole, rotated to the ecliptic) vs Meeus.
 *   9. Positions vs JPL Horizons (DE441) at five epochs across 1800-2050.
 *  10. Failure modes: bad inputs throw with diagnostic numbers.
 */

import assert from 'node:assert/strict';

import {
  DAYS_PER_CENTURY,
  JD_J2000,
  KEPLER_TOLERANCE,
  PLANETS,
  SATURN_POLE_ECLIPTIC,
  TABLE1_JD_END,
  TABLE1_JD_START,
  julianDateFromUnixMs,
  orbitBasis,
  orbitPath,
  orbitPoint,
  orbitalState,
  planetPosition,
  siderealPeriodDays,
  solveKepler,
} from '../lib/physics/kepler.mjs';

/** @typedef {import('../lib/physics/kepler.mjs').PlanetKey} PlanetKey */

const STEPS = 10;
const DEG = Math.PI / 180;
const ARCSEC = DEG / 3600;
const AU_KM = 149597870.7; // IAU 2012 (km)
const EXACT = 1e-12; // geometric identities, relative to the orbit size

let stepNo = 0;
/** @param {string} title */
function step(title) {
  stepNo += 1;
  console.log(`[${stepNo}/${STEPS}] ${title}`);
}
/** @param {string} line */
function detail(line) {
  console.log(`        ${line}`);
}

/**
 * Assert |actual - expected| <= tol, reporting all three numbers.
 *
 * @param {number} actual
 * @param {number} expected
 * @param {number} tol
 * @param {string} what
 */
function near(actual, expected, tol, what) {
  const err = Math.abs(actual - expected);
  assert.ok(err <= tol, `${what}: got ${actual}, expected ${expected}, |diff| = ${err} > tol ${tol}`);
}

/** Wrap an angle to (-pi, pi]. @param {number} x */
function wrapPi(x) {
  return x - 2 * Math.PI * Math.ceil((x - Math.PI) / (2 * Math.PI));
}

console.log(`[setup] node ${process.version}, lib/physics/kepler.mjs, ${PLANETS.length} planets (JPL Table 1)`);

// ---------------------------------------------------------------------------
step('Table 1 transcription matches JPL digit for digit');
// Verbatim from https://ssd.jpl.nasa.gov/planets/approx_pos.html, Table 1
// ("valid for the time-interval 1800 AD - 2050 AD"), fetched 2026-09-30.
const JPL_TABLE1 = `
               a              e               I                L            long.peri.      long.node.
           au, au/Cy     rad, rad/Cy     deg, deg/Cy      deg, deg/Cy      deg, deg/Cy     deg, deg/Cy
-----------------------------------------------------------------------------------------------------------
Mercury   0.38709927      0.20563593      7.00497902      252.25032350     77.45779628     48.33076593
          0.00000037      0.00001906     -0.00594749   149472.67411175      0.16047689     -0.12534081
Venus     0.72333566      0.00677672      3.39467605      181.97909950    131.60246718     76.67984255
          0.00000390     -0.00004107     -0.00078890    58517.81538729      0.00268329     -0.27769418
EM Bary   1.00000261      0.01671123     -0.00001531      100.46457166    102.93768193      0.0
          0.00000562     -0.00004392     -0.01294668    35999.37244981      0.32327364      0.0
Mars      1.52371034      0.09339410      1.84969142       -4.55343205    -23.94362959     49.55953891
          0.00001847      0.00007882     -0.00813131    19140.30268499      0.44441088     -0.29257343
Jupiter   5.20288700      0.04838624      1.30439695       34.39644051     14.72847983    100.47390909
         -0.00011607     -0.00013253     -0.00183714     3034.74612775      0.21252668      0.20469106
Saturn    9.53667594      0.05386179      2.48599187       49.95424423     92.59887831    113.66242448
         -0.00125060     -0.00050991      0.00193609     1222.49362201     -0.41897216     -0.28867794
Uranus   19.18916464      0.04725744      0.77263783      313.23810451    170.95427630     74.01692503
         -0.00196176     -0.00004397     -0.00242939      428.48202785      0.40805281      0.04240589
Neptune  30.06992276      0.00859048      1.77004347      -55.12002969     44.96476227    131.78422574
          0.00026291      0.00005105      0.00035372      218.45945325     -0.32241464     -0.00508664
------------------------------------------------------------------------------------------------------
EM Bary = Earth/Moon Barycenter
`;
{
  // Numeric rows: "Mercury   0.387...", "EM Bary   1.000...", or an indented rate row.
  const rows = JPL_TABLE1.split('\n').filter((l) => /^(?:[A-Z][A-Za-z]*(?: [A-Z][a-z]+)?)?\s+-?\d/.test(l));
  assert.equal(rows.length, 2 * PLANETS.length, `expected ${2 * PLANETS.length} numeric rows, found ${rows.length}`);
  /** @param {string} line */
  const numbers = (line) => (line.match(/-?\d+\.\d+/g) ?? []).map(Number);
  const cols = /** @type {const} */ (['a', 'e', 'I', 'L', 'varpi', 'Omega']);
  PLANETS.forEach((p, i) => {
    const label = rows[2 * i].replace(/\s+-?\d.*$/, '');
    const expectLabel = p.key === 'earth' ? 'EM Bary' : p.name;
    assert.equal(label, expectLabel, `row ${i}: JPL label "${label}" vs PLANETS "${expectLabel}"`);
    const values = numbers(rows[2 * i]);
    const rates = numbers(rows[2 * i + 1]);
    assert.equal(values.length, 6, `${p.name}: ${values.length} values in JPL row`);
    assert.equal(rates.length, 6, `${p.name}: ${rates.length} rates in JPL row`);
    cols.forEach((c, j) => {
      assert.equal(p.elements[c], values[j], `${p.name} ${c}: module ${p.elements[c]} vs JPL ${values[j]}`);
      assert.equal(p.rates[c], rates[j], `${p.name} ${c} rate: module ${p.rates[c]} vs JPL ${rates[j]}`);
    });
  });
  detail(`8 planets x (6 elements + 6 rates) = 96 numbers identical to JPL's block`);
}

// ---------------------------------------------------------------------------
step('Julian dates from Unix time');
{
  assert.equal(julianDateFromUnixMs(0), 2440587.5, 'Unix epoch');
  assert.equal(julianDateFromUnixMs(Date.UTC(2000, 0, 1, 12)), JD_J2000, 'J2000.0 = 2000-01-01T12:00');
  assert.equal(julianDateFromUnixMs(Date.UTC(1800, 0, 1)), TABLE1_JD_START, 'Table 1 start, 1800-01-01');
  assert.equal(julianDateFromUnixMs(Date.UTC(2050, 0, 1)), TABLE1_JD_END, 'Table 1 end, 2050-01-01');
  detail(`1970-01-01 -> 2440587.5, 2000-01-01T12:00 -> ${JD_J2000}, 1800/2050 -> ${TABLE1_JD_START}/${TABLE1_JD_END}`);
}

// ---------------------------------------------------------------------------
step("Kepler's equation: residual, limits, symmetry");
{
  const GRID = 4000;
  const ECC = [0, 0.2, 0.9];
  const STRESS = [0.99, 0.999];
  for (const e of [...ECC, ...STRESS]) {
    let worst = 0;
    for (let k = 0; k <= GRID; k++) {
      // M from -pi to pi inclusive, plus near-zero points where e -> 1 is hardest.
      for (const M of [-Math.PI + (2 * Math.PI * k) / GRID, (k - GRID / 2) * 1e-9]) {
        const E = solveKepler(M, e);
        const r = Math.abs(E - e * Math.sin(E) - M);
        worst = Math.max(worst, r);
        assert.ok(r < KEPLER_TOLERANCE, `e = ${e}, M = ${M}: residual ${r} rad`);
        near(solveKepler(-M, e), -E, 0, `oddness E(-M) = -E(M) at e = ${e}, M = ${M}`);
      }
    }
    detail(`e = ${String(e).padEnd(5)} ${2 * (GRID + 1)} values of M: max |E - e sin E - M| = ${worst.toExponential(2)} rad${STRESS.includes(e) ? ' (stress)' : ''}`);
  }
  for (const e of [0.2, 0.9]) {
    assert.equal(solveKepler(0, e), 0, `M = 0 is perihelion (E = 0) at e = ${e}`);
    assert.equal(solveKepler(Math.PI, e), Math.PI, `M = pi is aphelion (E = pi) at e = ${e}`);
  }
  for (let k = -10; k <= 10; k++) assert.equal(solveKepler(k * 0.3, 0), k * 0.3, 'e = 0 gives E = M');
  // Outside (-pi, pi]: E(M + 2 pi k) = E(M) + 2 pi k solves the equation for the M given.
  for (const M of [-40, -7, 3.5, 7, 40]) {
    const E = solveKepler(M, 0.6);
    near(E - 0.6 * Math.sin(E), M, 1e-12, `unreduced M = ${M}`);
  }
  detail('M = 0 -> E = 0 and M = pi -> E = pi (any e); e = 0 -> E = M; |M| up to 40 rad solved in place');
}

// ---------------------------------------------------------------------------
step('Rotation to the ecliptic: limits and orthonormality');
{
  for (const [O, w] of [[0.3, 1.1], [2.5, -0.7], [-1.2, 3.0]]) {
    const b = orbitBasis(0, O, w);
    near(b.Px, Math.cos(O + w), EXACT, 'I = 0: Px = cos varpi');
    near(b.Py, Math.sin(O + w), EXACT, 'I = 0: Py = sin varpi');
    near(b.Qx, -Math.sin(O + w), EXACT, 'I = 0: Qx = -sin varpi');
    near(b.Qy, Math.cos(O + w), EXACT, 'I = 0: Qy = cos varpi');
    near(b.Pz, 0, 0, 'I = 0: Pz = 0');
    near(b.Qz, 0, 0, 'I = 0: Qz = 0');
  }
  const polar = orbitBasis(Math.PI / 2, 0, 0);
  near(polar.Px, 1, EXACT, 'polar orbit: P = x');
  near(polar.Qz, 1, EXACT, 'polar orbit: Q = z (heading north at the node)');
  near(Math.hypot(polar.Py, polar.Pz, polar.Qx, polar.Qy), 0, EXACT, 'polar orbit: other components vanish');
  const epochs = [TABLE1_JD_START, JD_J2000, TABLE1_JD_END];
  for (const p of PLANETS) {
    for (const jd of epochs) {
      const s = orbitalState(p.key, jd);
      near(Math.hypot(s.Px, s.Py, s.Pz), 1, EXACT, `${p.name} |P|`);
      near(Math.hypot(s.Qx, s.Qy, s.Qz), 1, EXACT, `${p.name} |Q|`);
      near(s.Px * s.Qx + s.Py * s.Qy + s.Pz * s.Qz, 0, EXACT, `${p.name} P.Q`);
      const n = [s.Py * s.Qz - s.Pz * s.Qy, s.Pz * s.Qx - s.Px * s.Qz, s.Px * s.Qy - s.Py * s.Qx];
      near(n[0], Math.sin(s.I) * Math.sin(s.Omega), EXACT, `${p.name} normal x`);
      near(n[1], -Math.sin(s.I) * Math.cos(s.Omega), EXACT, `${p.name} normal y`);
      near(n[2], Math.cos(s.I), EXACT, `${p.name} normal z`);
    }
  }
  detail('I = 0 -> a turn by varpi in the ecliptic; I = 90 deg -> Q along +z; P, Q orthonormal and');
  detail('P x Q = (sin I sin Omega, -sin I cos Omega, cos I) for 8 planets at 1800, 2000, 2050');
}

// ---------------------------------------------------------------------------
step('Ellipse geometry of orbitPath and planetPosition');
{
  const SAMPLES = 256;
  const jd = julianDateFromUnixMs(Date.UTC(2026, 8, 30));
  for (const p of PLANETS) {
    const s = orbitalState(p.key, jd);
    const path = orbitPath(p.key, jd, SAMPLES);
    assert.equal(path.length, SAMPLES * 3, `${p.name}: path length`);
    const nx = Math.sin(s.I) * Math.sin(s.Omega);
    const ny = -Math.sin(s.I) * Math.cos(s.Omega);
    const nz = Math.cos(s.I);
    for (let k = 0; k < SAMPLES; k++) {
      const [x, y, z] = [path[3 * k], path[3 * k + 1], path[3 * k + 2]];
      const E = (2 * Math.PI * k) / SAMPLES;
      near(Math.hypot(x, y, z), s.a * (1 - s.e * Math.cos(E)), EXACT * s.a, `${p.name} r(E) at k = ${k}`);
      near(x * nx + y * ny + z * nz, 0, EXACT * s.a, `${p.name} in-plane at k = ${k}`);
    }
    near(Math.hypot(path[0], path[1], path[2]), s.a * (1 - s.e), EXACT * s.a, `${p.name} perihelion`);
    const h = 3 * (SAMPLES / 2);
    near(Math.hypot(path[h], path[h + 1], path[h + 2]), s.a * (1 + s.e), EXACT * s.a, `${p.name} aphelion`);
    // The node: argument of latitude u = omega + nu = 0, i.e. true anomaly nu = -omega.
    const nu = -s.omega;
    const En = 2 * Math.atan2(Math.sqrt(1 - s.e) * Math.sin(nu / 2), Math.sqrt(1 + s.e) * Math.cos(nu / 2));
    const node = [0, 0, 0];
    orbitPoint(s, En, node);
    near(node[2], 0, EXACT * s.a, `${p.name} node z`);
    near(wrapPi(Math.atan2(node[1], node[0]) - s.Omega), 0, 1e-10, `${p.name} node longitude = Omega`);
    const after = [0, 0, 0];
    orbitPoint(s, En + 1e-3, after);
    assert.equal(Math.sign(after[2]), Math.sign(Math.sin(s.I)), `${p.name}: z climbs through the node as sin I`);
    const pos = planetPosition(p.key, jd);
    near(Math.hypot(pos.x, pos.y, pos.z), s.a * (1 - s.e * Math.cos(s.E)), EXACT * s.a, `${p.name} planet r`);
    near(s.E - s.e * Math.sin(s.E), s.M, KEPLER_TOLERANCE, `${p.name} planet solves Kepler`);
  }
  detail(`${SAMPLES} points x 8 planets: r = a (1 - e cos E) and in-plane to 1e-12 a;`);
  detail('perihelion a (1 - e), aphelion a (1 + e); the u = 0 point sits at longitude Omega');
}

// ---------------------------------------------------------------------------
step('Sidereal periods from the L rates');
// Reference periods (days): NASA Planetary Fact Sheet for Mercury-Saturn;
// Uranus 30688.5 d and Neptune 60182 d as commonly quoted (the fact sheet
// gives 30685.4 d and 60189 d; both sets agree with the model within 0.02%).
{
  /** @type {Record<PlanetKey, number>} */
  const PUBLISHED = {
    mercury: 87.969,
    venus: 224.7,
    earth: 365.256,
    mars: 686.98,
    jupiter: 4332.59,
    saturn: 10759.22,
    uranus: 30688.5,
    neptune: 60182,
  };
  const TOL = 1e-3;
  for (const p of PLANETS) {
    const P = siderealPeriodDays(p.key);
    const rel = P / PUBLISHED[p.key] - 1;
    detail(`${p.name.padEnd(8)} 360 deg / Ldot = ${P.toFixed(3).padStart(10)} d   published ${String(PUBLISHED[p.key]).padStart(9)} d   ${(100 * rel).toFixed(4).padStart(8)}%`);
    assert.ok(Math.abs(rel) < TOL, `${p.name}: period ${P} d vs ${PUBLISHED[p.key]} d, rel ${rel}`);
  }
}

// ---------------------------------------------------------------------------
step("Kepler's third law: a and Ldot agree");
// P = 2 pi sqrt(a^3 / (k^2 (1 + m/M_sun))), k the Gaussian gravitational
// constant (IAU 1976), Sun/planet mass ratios from the IAU 2009 system of
// astronomical constants (Luzum et al. 2011). The fit's mean motions also
// absorb long-period perturbations (Uranus-Neptune most), hence the 0.1%.
{
  const K_GAUSS = 0.01720209895; // au^1.5 / day
  /** @type {Record<PlanetKey, number>} */
  const SUN_OVER_PLANET = {
    mercury: 6.0236e6,
    venus: 4.08523719e5,
    earth: 3.2890056e5,
    mars: 3.09870359e6,
    jupiter: 1.047348644e3,
    saturn: 3.4979018e3,
    uranus: 2.290298e4,
    neptune: 1.941226e4,
  };
  const TOL = 1e-3;
  for (const p of PLANETS) {
    const a = p.elements.a;
    const kepler = 2 * Math.PI * Math.sqrt(a ** 3 / (K_GAUSS ** 2 * (1 + 1 / SUN_OVER_PLANET[p.key])));
    const rel = siderealPeriodDays(p.key) / kepler - 1;
    detail(`${p.name.padEnd(8)} 2 pi sqrt(a^3 / GM) = ${kepler.toFixed(3).padStart(10)} d   vs 360 deg / Ldot: ${(100 * rel).toFixed(4).padStart(8)}%`);
    assert.ok(Math.abs(rel) < TOL, `${p.name}: third-law period ${kepler} d vs ${siderealPeriodDays(p.key)} d`);
  }
}

// ---------------------------------------------------------------------------
step("Saturn's ring plane vs Meeus");
// Meeus, Astronomical Algorithms (2nd ed., 1998), ch. 45: the ring plane's
// inclination and ascending node on the ecliptic are 28.075216 deg and
// 169.508470 deg at J2000. The IAU 2009 pole is a newer solution, so the two
// differ by a few hundredths of a degree; a wrong obliquity sign would be off
// by 8 deg.
{
  const n = SATURN_POLE_ECLIPTIC;
  near(Math.hypot(n.x, n.y, n.z), 1, EXACT, 'pole is a unit vector');
  const incl = Math.acos(n.z) / DEG;
  const node = ((Math.atan2(n.x, -n.y) / DEG) % 360 + 360) % 360;
  const TOL_DEG = 0.05;
  detail(`IAU pole -> ecliptic (${n.x.toFixed(6)}, ${n.y.toFixed(6)}, ${n.z.toFixed(6)})`);
  detail(`ring inclination ${incl.toFixed(4)} deg (Meeus 28.0752), node ${node.toFixed(4)} deg (Meeus 169.5085)`);
  near(incl, 28.075216, TOL_DEG, 'ring-plane inclination (deg)');
  near(node, 169.50847, TOL_DEG, 'ring-plane ascending node (deg)');
}

// ---------------------------------------------------------------------------
step('Positions vs JPL Horizons (DE441), 1850-2050');
// Heliocentric geometric positions, ecliptic and mean equinox of J2000, au,
// at 00:00 TDB (12:00 for J2000.0). JPL Horizons API, fetched 2026-09-30:
//   https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='<id>'
//   &EPHEM_TYPE='VECTORS'&CENTER='500@10'&REF_PLANE='ECLIPTIC'
//   &REF_SYSTEM='J2000'&VEC_TABLE='1'&OUT_UNITS='AU-D'
//   &TLIST='2396758.5 2424151.5 2451545.0 2469807.5' (and START_TIME='2026-09-30')
// Sources: DE441 (Mercury, Venus, EM Bary 3, Earth 399), mar099, jup365,
// sat441l, ura184, nep098. Table 1 models the Earth-Moon barycentre (id 3);
// Earth's centre (399) is also checked; it stays within 4900 km (7") of it.
{
  /** @type {[PlanetKey, number, number, number, number, number][]} [key, Horizons id, JD TDB, x, y, z] */
  const HORIZONS = [
    ['mercury', 199, 2396758.5, 2.567995726398442e-1, -3.372771758137295e-1, -5.115513477534905e-2], // 1850-01-01
    ['venus', 299, 2396758.5, -2.766106960762407e-1, -6.706343042048769e-1, 7.11223083313081e-3],
    ['earth', 3, 2396758.5, -2.109980549495346e-1, 9.603502646357958e-1, 3.212720205316658e-4],
    ['earth', 399, 2396758.5, -2.109767381779361e-1, 9.603300389630637e-1, 3.217310290690561e-4],
    ['mars', 499, 2396758.5, -1.410067703759164e-1, 1.577032262094699, 3.646758199238673e-2],
    ['jupiter', 599, 2396758.5, -5.236953315396144, 1.390861400189211, 1.119969796263136e-1],
    ['saturn', 699, 2396758.5, 9.295727636783619, 1.619518286408112, -3.968878227881629e-1],
    ['uranus', 799, 2396758.5, 1.770201801735177e1, 9.094914764473849, -1.964040072112561e-1],
    ['neptune', 899, 2396758.5, 2.744043644125908e1, -1.205867269172759e1, -3.838284059093681e-1],
    ['mercury', 199, 2424151.5, -1.812720425675449e-1, 2.670944148635643e-1, 3.846572819631387e-2], // 1925-01-01
    ['venus', 299, 2424151.5, -5.926628604987547e-1, -4.125751495627269e-1, 2.869377848616562e-2],
    ['earth', 3, 2424151.5, -1.898401957067066e-1, 9.647279399282227e-1, 1.619004519315701e-4],
    ['earth', 399, 2424151.5, -1.898712247406852e-1, 9.647282490142526e-1, 1.638712025781187e-4],
    ['mars', 499, 2424151.5, 9.384587162647617e-1, 1.136881580215595, 5.676748618351018e-4],
    ['jupiter', 599, 2424151.5, 2.666435773097841e-1, -5.238919929208655, 1.546000667966983e-2],
    ['saturn', 699, 2424151.5, -7.705560423139479, -6.073059793330996, 4.122351858885392e-1],
    ['uranus', 799, 2424151.5, 1.988792209360637e1, -2.879983485934241, -2.689969728416945e-1],
    ['neptune', 899, 2424151.5, -2.372073436673343e1, 1.852242681191101e1, 1.650267993859432e-1],
    ['mercury', 199, 2451545.0, -1.300936053754522e-1, -4.472876181353563e-1, -2.459830695805179e-2], // 2000-01-01.5
    ['venus', 299, 2451545.0, -7.18302296345389e-1, -3.265430819980606e-2, 4.101418202684621e-2],
    ['earth', 3, 2451545.0, -1.771587841839055e-1, 9.672193524609504e-1, -1.139275508446145e-6],
    ['earth', 399, 2451545.0, -1.771350992727098e-1, 9.672416867665306e-1, -4.085281582511366e-6],
    ['mars', 499, 2451545.0, 1.390715921746351, -1.341631815101244e-2, -3.446766277581799e-2],
    ['jupiter', 599, 2451545.0, 4.001177435589426, 2.938575782470499, -1.01785283451815e-1],
    ['saturn', 699, 2451545.0, 6.406410428378656, 6.569988452110556, -3.690759730763678e-1],
    ['uranus', 799, 2451545.0, 1.443185527592405e1, -1.373432340215935e1, -2.381417673271042e-1],
    ['neptune', 899, 2451545.0, 1.681204760586415e1, -2.499176325272639e1, 1.272225117089998e-1],
    ['mercury', 199, 2461313.5, -4.41025548682458e-2, -4.624109886039526e-1, -3.374519134481934e-2], // 2026-09-30
    ['venus', 299, 2461313.5, 7.185423794911527e-1, -1.023014512255372e-1, -4.286434074007082e-2],
    ['earth', 3, 2461313.5, 9.952155423119839e-1, 1.131541422598056e-1, -1.289048216932833e-5],
    ['earth', 399, 2461313.5, 9.951959773438157e-1, 1.131314298233008e-1, -1.556209268382008e-5],
    ['mars', 499, 2461313.5, 1.406718567268641e-1, 1.550388916691432, 2.904118177973171e-2],
    ['jupiter', 599, 2461313.5, -3.484665418091076, 4.001704094168551, 6.1341598483479e-2],
    ['saturn', 699, 2461313.5, 9.260507029184925, 1.761236729374587, -3.992975150185569e-1],
    ['uranus', 799, 2461313.5, 8.934261146037462, 1.726691598354777e1, -5.17151101028086e-2],
    ['neptune', 899, 2461313.5, 2.98377406965601e1, 1.377000311779916, -7.159584050277875e-1],
    ['mercury', 199, 2469807.5, -1.79514042484485e-1, 2.678117696735194e-1, 3.834830324254487e-2], // 2050-01-01
    ['venus', 299, 2469807.5, 1.417822235551292e-1, -7.133842157318016e-1, -1.80256677459316e-2],
    ['earth', 3, 2469807.5, -1.715829623696938e-1, 9.682682880886148e-1, -1.081487189538922e-4],
    ['earth', 399, 2469807.5, -1.716121680953062e-1, 9.682588196450419e-1, -1.09967048540747e-4],
    ['mars', 499, 2469807.5, -1.543231687780398, -5.035895204731804e-1, 2.720193305057832e-2],
    ['jupiter', 599, 2469807.5, -2.391045955156108, 4.66407353932232, 3.396562774577581e-2],
    ['saturn', 699, 2469807.5, 4.766226141432818, -8.773718298319354, -3.787765602192074e-2],
    ['uranus', 799, 2469807.5, -1.782323745057253e1, 4.071455414306206, 2.458503246256954e-1],
    ['neptune', 899, 2469807.5, 1.739820467380735e1, 2.419778367193252e1, -8.992415526060462e-1],
  ];
  // Tolerances: the caller's budget (0.1 deg for Earth and Mars, 0.5 deg for
  // Jupiter and Saturn), extended as 0.1 deg to the other planets, whose
  // Table 1 errors are smaller; distance within 0.5% for all.
  /** @type {Record<PlanetKey, number>} */
  const TOL_DEG = {
    mercury: 0.1,
    venus: 0.1,
    earth: 0.1,
    mars: 0.1,
    jupiter: 0.5,
    saturn: 0.5,
    uranus: 0.1,
    neptune: 0.1,
  };
  const TOL_DIST = 5e-3;
  // JPL's nominal Table 1 errors (lon ", lat ", distance 1000 km), for reference.
  /** @type {Record<PlanetKey, [number, number, number]>} */
  const JPL_NOMINAL = {
    mercury: [15, 1, 1],
    venus: [20, 1, 4],
    earth: [20, 8, 6],
    mars: [40, 2, 25],
    jupiter: [400, 10, 600],
    saturn: [600, 25, 1500],
    uranus: [50, 2, 1000],
    neptune: [10, 1, 200],
  };
  /** @type {Map<string, { lon: number, lat: number, dr: number, rel: number, n: number }>} */
  const worst = new Map();
  for (const [key, id, jd, x, y, z] of HORIZONS) {
    const p = planetPosition(key, jd);
    const r0 = Math.hypot(x, y, z);
    const r1 = Math.hypot(p.x, p.y, p.z);
    const dLon = Math.abs(wrapPi(Math.atan2(p.y, p.x) - Math.atan2(y, x)));
    const dLat = Math.abs(Math.asin(p.z / r1) - Math.asin(z / r0));
    const rel = Math.abs(r1 / r0 - 1);
    const where = `${key} (Horizons ${id}) at JD ${jd}`;
    assert.ok(dLon <= TOL_DEG[key] * DEG, `${where}: longitude off by ${(dLon / DEG).toFixed(5)} deg > ${TOL_DEG[key]}`);
    assert.ok(dLat <= TOL_DEG[key] * DEG, `${where}: latitude off by ${(dLat / DEG).toFixed(5)} deg > ${TOL_DEG[key]}`);
    assert.ok(rel <= TOL_DIST, `${where}: distance ${r1} au vs ${r0} au, rel ${rel}`);
    const label = id === 399 ? 'earth399' : key;
    const w = worst.get(label) ?? { lon: 0, lat: 0, dr: 0, rel: 0, n: 0 };
    worst.set(label, {
      lon: Math.max(w.lon, dLon / ARCSEC),
      lat: Math.max(w.lat, dLat / ARCSEC),
      dr: Math.max(w.dr, (Math.abs(r1 - r0) * AU_KM) / 1000),
      rel: Math.max(w.rel, rel),
      n: w.n + 1,
    });
  }
  detail('worst |error| over 1850, 1925, 2000, 2026-09-30, 2050; distance in 1000 km; JPL nominal lon/lat/dist');
  for (const [label, w] of worst) {
    const key = /** @type {PlanetKey} */ (label === 'earth399' ? 'earth' : label);
    const nom = JPL_NOMINAL[key];
    const name = label === 'earth399' ? 'Earth 399' : (PLANETS.find((p) => p.key === key)?.name ?? key);
    detail(
      `${name.padEnd(9)} lon ${w.lon.toFixed(1).padStart(5)}"  lat ${w.lat.toFixed(2).padStart(5)}"  dist ${w.dr.toFixed(1).padStart(6)} (${(100 * w.rel).toFixed(4)}%)   nominal ${nom[0]}" / ${nom[1]}" / ${nom[2]}`,
    );
  }
  detail(`all ${HORIZONS.length} vectors within budget: lon/lat 0.1 deg (0.5 deg Jupiter, Saturn), distance 0.5%`);
}

// ---------------------------------------------------------------------------
step('Failure modes throw with diagnostics');
{
  const jd = JD_J2000;
  const unknown = /** @type {PlanetKey} */ (/** @type {unknown} */ ('pluto'));
  assert.throws(() => solveKepler(Number.NaN, 0.1), /M must be finite/);
  assert.throws(() => solveKepler(1, 1), /0 <= e < 1/);
  assert.throws(() => solveKepler(1, -0.01), /0 <= e < 1/);
  assert.throws(() => planetPosition(unknown, jd), /unknown planet key "pluto"/);
  assert.throws(() => planetPosition('mars', Number.NaN), /must be finite/);
  assert.throws(() => orbitPath('mars', jd, 2), /integer >= 3/);
  assert.throws(() => orbitPath('mars', jd, 10.5), /integer >= 3/);
  assert.throws(() => julianDateFromUnixMs(Number.POSITIVE_INFINITY), /must be finite/);
  // Venus's e falls through 0 about 165 centuries from J2000, far outside the fit.
  assert.throws(() => planetPosition('venus', JD_J2000 + 200 * DAYS_PER_CENTURY), /elliptic range/);
  detail('non-finite M or JD, e outside [0, 1), unknown key, bad sample count, elements past e = 0');
}

console.log(`[done]  ${stepNo}/${STEPS} checks passed.`);
