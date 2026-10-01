// Tunables for the SC Quantathon v4 scroll stage, kept in one place so no
// component carries magic numbers. Physics constants live with the physics
// (lib/physics/*.mjs); these are display and motion choices.

// The hero's sky (components/scq4/ConstellationSky.tsx, lib/physics/sky.mjs):
// the real sky over Clemson at the reader's time, as a slow time-lapse (one
// sidereal hour per real minute; the Earth itself turns once per sidereal
// day). Zenith at the hero's center, horizon through its corners. Stars are
// dots whose AREA follows their flux (dot style in CSS px: the reference
// magnitude's radius, clamps, and the alpha floor for faint stars); stick
// figures are hairlines. Ink on paper, blackbody colors in the dark theme.
export const SKY_SIDEREAL_HOURS_PER_MINUTE = 1;
export const SKY_FRAME_MS = 1000 / 30;
export const SKY_DOT_STYLE = { refMag: 0, refRadius: 2.6, rMin: 0.9, rMax: 3.2, alphaMin: 0.3 };
export const SKY_STAR_ALPHA = { light: 0.85, dark: 0.95 };
export const SKY_LINE_ALPHA = { light: 0.18, dark: 0.22 };
export const SKY_LINE_PX = 1;
export const SKY_ALPHA_BUCKETS = 6; // stars are filled in this many alpha groups
export const SKY_COLOR_BINS = 12; // and, in the dark theme, color groups
export const SKY_TEMP_RANGE = [3000, 22000] as const; // K, the star color table
export const SKY_EDGE_PX = 8; // stars this far outside the canvas still draw

// Hydrogen cloud sampling: forward-CDF lookup tables, sized with the physics
// in lib/physics/hydrogen.mjs (header, point 6) so scripts/verify-hydrogen.mjs
// checks exactly what ships.
export {
  ANGULAR_TABLE_COLS,
  ANGULAR_TABLE_ROWS,
  ANGULAR_TOP_OVER_R95,
  RADIAL_TABLE_SIZE,
  RADIAL_TAIL_U,
} from '@/lib/physics/hydrogen.mjs';
// Rebuild tables only when the smoothed ladder coordinate has moved at least
// this much since the last build (a rebuild costs well under a millisecond).
export const LADDER_REBUILD_STEP = 0.004;

// Dots per device class. The Canvas 2D fallback draws far fewer.
export const POINTS_DESKTOP = 24000;
export const POINTS_MOBILE = 9000;
export const POINTS_FALLBACK = 5000;
export const MOBILE_QUERY = '(max-width: 767px)';

// Sprite size (CSS px) and the fraction of a slot's radius that the cloud's
// 95th-percentile radius fills, so ~5% of the haze spills softly past it.
export const DOT_DIAMETER_PX = 2.4;
export const CLOUD_R95_OF_SLOT = 0.86;

// Orientation: the symmetry axis leans toward the viewer (tilt), the atom
// turns slowly about the vertical (yaw rate), seen from slightly above.
export const ATOM_TILT = 0.4; // rad
export const ATOM_ELEVATION = 0.22; // rad
export const IDLE_YAW_RATE = 0.1; // rad/s
export const STATIC_YAW = 0.6; // rad, used when motion is reduced
export const IDLE_BOB_AMPLITUDE = 0.006; // fraction of viewport height
export const IDLE_BOB_RATE = 0.8; // rad/s

// Pointer parallax (fine pointers only): extra yaw/elevation at the edges.
export const PARALLAX_YAW = 0.18; // rad
export const PARALLAX_ELEVATION = 0.1; // rad

// Motion: every channel follows a critically damped spring (zeta = 1) with
// this natural frequency, so the object settles in ~1 s with no overshoot.
export const SPRING_OMEGA = 4.2; // rad/s
// Fraction of the scroll distance between two cues spent holding still at
// each end; the move happens in the middle (1 - 2 * HOLD).
export const CUE_HOLD = 0.2;

// Where an object waits while another scene has the stage, in radii past the
// viewport edge: it leaves upward and arrives from below (stageTimeline.ts).
export const EXIT_Y_OVER_RADIUS = -1.4;

// A cue whose slot is hidden (phones and tablets) falls back to a faint
// companion behind the text, centered horizontally: y is a fraction of the
// viewport height, r of its width.
export interface Companion {
  y: number;
  r: number;
  opacity: number;
}
export const MOBILE_COMPANION: Companion = { y: 0.32, r: 0.3, opacity: 0.42 };

// Frame-time clamp so a long pause never produces one giant step.
export const MAX_FRAME_DT = 0.05; // s
// Frame pacing: at most 60 fps (high-refresh displays skip frames), and 30
// fps while the only thing on stage is the settled atom, whose idle turn
// moves its dots under a pixel per frame. The slack absorbs rAF jitter.
export const ACTIVE_FRAME_MS = 1000 / 60;
export const IDLE_FRAME_MS = 1000 / 30;
export const FRAME_SLACK_MS = 2;

// Black hole (lib/physics/schwarzschild.mjs, components/scq4/blackHoleScene.ts).
// The disk's outer edge (22 M) fits inside the slot radius at this scale.
export const HOLE_M_PER_SLOT_RADIUS = 24;
export const HOLE_DEFAULT_INCLINATION_DEG = 78;
// 0.5-1.0 keeps the Doppler contrast visible; 1.6 saturates the disk.
export const HOLE_EXPOSURE = 0.75;
// Radius of the rendered disc of lensed stars, in slot radii (its outer 15%
// fades to transparent), and pointer parallax of the star field.
export const HOLE_VIEW_RADIUS = 1.45;
export const HOLE_PARALLAX_AZIMUTH = 0.15; // rad at the viewport edge
// Coordinate time (units of M) per second of wall clock: the inner disk edge
// (Omega = 6^-1.5 rad/M) turns once in ~6 s, the outer edge in ~40 s.
export const HOLE_M_PER_SECOND = 15;
export const HOLE_STAR_YAW_RATE = 0.01; // rad/s, slow camera orbit
// Below 1024px a black hole cue's companion sits behind body text; at 0.2
// even the disk's brightest pixel keeps text and links at 4.5:1 or better.
export const HOLE_COMPANION: Companion = { y: 0.28, r: 0.34, opacity: 0.2 };
// Loading, for readers who get near the first place the hole appears: once
// it is within HOLE_BUILD_WAKE_VIEWPORTS below the viewport, the tables are
// built in idle-time slices of at most HOLE_BUILD_SLICE_MS (a
// requestIdleCallback timeout keeps them moving on a busy page; without it,
// slices are HOLE_BUILD_GAP_MS apart). Within HOLE_COMPILE_WAKE_VIEWPORTS the
// shader compiles, and its status is polled every HOLE_POLL_MS.
export const HOLE_BUILD_WAKE_VIEWPORTS = 3;
export const HOLE_COMPILE_WAKE_VIEWPORTS = 1.5;
export const HOLE_BUILD_SLICE_MS = 6;
export const HOLE_IDLE_TIMEOUT_MS = 200;
export const HOLE_BUILD_GAP_MS = 16;
export const HOLE_POLL_MS = 50;
// At this device pixel ratio and up, the ray tracer takes one sample per
// device pixel (still four per CSS pixel), except near the photon ring.
export const HOLE_SPARSE_MIN_DPR = 2;

// Entangled qubits (components/scq4/qubitsLayer.ts): two Bloch spheres on a
// diagonal of the slot, sphere centers this far from its middle (fractions of
// the slot radius; the first up and left, the second down and right).
export const QUBITS_SPHERE_OF_SLOT = 0.38; // sphere radius / slot radius
export const QUBITS_OFFSET_X = 0.44;
export const QUBITS_OFFSET_Y = 0.3;
// The hairline between the spheres: its alpha at full entanglement (x ink,
// scaled by the concurrence C) and its bow, as a fraction of its length.
export const QUBITS_LINK_ALPHA = 0.55;
export const QUBITS_LINK_BOW = 0.16;
export const QUBITS_COMPANION: Companion = { y: 0.3, r: 0.36, opacity: 0.3 };

// Bloch-sphere glyph (components/scq4/blochGlyph.ts) for the qubit pair:
// hairline widths (CSS px), ink alphas, and the dash of the equator's far
// half.
export const BLOCH_LINE_PX = 1;
export const BLOCH_ARROW_PX = 2;
export const BLOCH_TIP_PX = 2.6; // radius of the arrow's tip dot
export const BLOCH_OUTLINE_ALPHA = 0.34;
export const BLOCH_FRONT_ALPHA = 0.3;
export const BLOCH_BACK_ALPHA = 0.14;
export const BLOCH_AXIS_ALPHA = 0.16;
export const BLOCH_DASH_PX = [3, 4];
export const BLOCH_EQUATOR_SAMPLES = 64;

// Soft halo behind the atom (shading), as a fraction of the slot radius.
export const ATOM_HALO_RADIUS = 1.35;

// The orbital's armature (components/scq4/orbitalArmature.ts): hairline
// rings where the pure state's cloud is empty (its angular nodes, drawn as
// latitude circles on the sphere holding 95% of the electron) and its
// symmetry axis. They show only near a pure rung: from ARMATURE_PURITY_FROM
// of the dominant rung's probability (a blend's nodes are not cones).
export const ARMATURE_PURITY_FROM = 0.97;
export const ARMATURE_FRONT_ALPHA = 0.3; // x ink, near half of a ring
export const ARMATURE_BACK_ALPHA = 0.13; // far half, dashed
export const ARMATURE_AXIS_ALPHA = 0.22;
export const ARMATURE_AXIS_REACH = 1.18; // axis half-length / ring radius
export const ARMATURE_LINE_PX = 1;
export const ARMATURE_DASH_PX = [2, 4];
export const ARMATURE_RING_SAMPLES = 96;
// The light at each step of the ladder: a short wave packet that travels
// toward the atom perpendicular to its axis and oscillates along it (each
// step is a Delta l = 1, Delta m = 0 transition, polarized along the axis).
// Its position follows the step's progress, so climbing (scrolling down)
// shows absorption and descending shows emission. Drawn wavelengths are
// compressed (lambda^PHOTON_LAMBDA_EXPONENT, 656.3 nm drawn at the reference
// length); the label carries the true value.
export const PHOTON_LAMBDA_REF_NM = 656.3;
export const PHOTON_LAMBDA_REF_PX = 16;
export const PHOTON_LAMBDA_EXPONENT = 0.5;
export const PHOTON_AMPLITUDE_PX = 7;
export const PHOTON_SIGMA_OF_RADIUS = 0.2; // envelope sigma / ring radius
export const PHOTON_START_OF_RADIUS = 2.3; // packet center's start / ring radius
export const PHOTON_END_OF_RADIUS = 0.35; // and where it is absorbed
export const PHOTON_FADE_IN = [0.04, 0.18] as const; // of the step's progress
export const PHOTON_FADE_OUT = [0.46, 0.68] as const;
export const PHOTON_LINE_PX = 1.5;
export const PHOTON_SAMPLES = 72;
export const PHOTON_CARRIER_HZ = 0.8; // the carrier's drift along the packet (display only)
export const PHOTON_LABEL_GAP_PX = 14; // label offset from the packet

// The committee's planetary system (the .scq4-system block in the v4 page).
// The atom arrives at the sun slot, relaxes to 1s, and collapses into a sun:
// the morph runs over the last part of the approach (from SUN_MORPH_FROM of
// the sun channel), the cloud contracts to SUN_CLOUD_SQUEEZE of its size as
// a corona haze, and a limb-darkened disk forms under it with
// I(mu) / I(1) = 1 - u (1 - mu), u = SUN_LIMB_DARKENING (the Sun's value in
// visible light, Allen's Astrophysical Quantities).
export const SUN_MORPH_FROM = 0.35;
export const SUN_CLOUD_SQUEEZE = 0.8;
// The collapse runs inside out (as in Shu's 1977 model of protostar
// formation): a dot's delay grows with its radial quantile u_r, so the inner
// cloud falls in first and the outer shells last. Each dot takes
// SUN_COLLAPSE_WIDTH of the morph; delays span SUN_COLLAPSE_SPREAD.
export const SUN_COLLAPSE_SPREAD = 0.7;
export const SUN_COLLAPSE_WIDTH = 0.3;
export const SUN_CLOUD_FADE = 0; // corona dot alpha drops by this fraction
export const SUN_DISK_OF_SLOT = 0.36; // disk radius / sun slot radius
export const SUN_GLOW_OF_DISK = 2.6; // glow radius / disk radius
export const SUN_LIMB_DARKENING = 0.6;
export const SUN_LIMB_STOPS = 8; // gradient samples of I(mu) across the disk
// The Quantathon Director is the sun (.scq4-director on that list item);
// the other organizers orbit it in page order on circular, prograde orbits,
// radii as fractions of the system radius (a longer list reuses the last).
// Angular speed follows Kepler's third law, omega ~ a^(-3/2), so the inner
// organizers lap the outer ones. Each orbit is tilted like a real planet's
// (JPL inclination and ascending node, lib/physics/kepler.mjs), so turning
// the system shows that the orbits are not quite coplanar.
export const SYSTEM_ORBITS = [0.42, 0.6, 0.8, 1];
export const SYSTEM_PLANETS = ['mercury', 'venus', 'mars', 'jupiter'] as const;
// Camera: this far above the orbital plane by default; dragging (mouse) or
// the arrow keys change it within [MIN, MAX], and MAX shrinks if the taller
// view would not fit the screen. Perspective from this many system radii.
export const SYSTEM_ELEVATION = 0.42; // rad
export const SYSTEM_ELEVATION_MIN = 0.18; // rad
export const SYSTEM_ELEVATION_MAX = 0.75; // rad
export const SYSTEM_CAMERA_DISTANCE = 8;
// The organizers and orbit lines fade in over the second part of the sun's
// forming (from this fraction of the morph), after the heading has cleared.
export const SYSTEM_FADE_FROM = 0.4;
export const SYSTEM_RADIUS_OF_VIEWPORT = 0.4; // outer orbit radius / viewport width
export const SYSTEM_SIDE_ROOM = 100; // px kept clear left and right (name labels)
export const SYSTEM_NAV_GAP = 16; // px kept clear under the sticky nav
export const SYSTEM_REST_GAP = 24; // px between the resting system and the footer
// At the end of the page the system rides up and, where the screen is too
// short for it above the footer, shrinks just enough to fit (never below
// this fraction of its pinned size).
export const SYSTEM_REST_MIN_SCALE = 0.5;
export const SYSTEM_INNER_PERIOD = 60; // s, idle period of the innermost orbit
export const SYSTEM_TURNS_PER_VIEWPORT = 0.25; // inner-orbit turns per viewport of scroll
export const SYSTEM_SHADE_MAX = 0.5; // opacity of a body's night side
// Turning the view: a drag across one system radius turns it a quarter turn
// (vertical mouse drags tilt it); a click or tap without dragging glides a
// step toward that side, and the arrow keys glide smaller steps. Releases
// coast to a stop with this time constant (exponential decay), measured from
// the pointer's speed over the last window. Drags start past the threshold.
export const SYSTEM_DRAG_YAW_PER_RADIUS = Math.PI / 2; // rad per system radius dragged
export const SYSTEM_DRAG_ELEVATION_PER_RADIUS = 0.6; // rad per system radius dragged
export const SYSTEM_DRAG_THRESHOLD_PX = 6;
export const SYSTEM_CLICK_STEP = Math.PI / 6; // rad
export const SYSTEM_KEY_STEP = Math.PI / 12; // rad
export const SYSTEM_KEY_ELEVATION_STEP = 0.08; // rad
export const SYSTEM_INERTIA_TAU = 0.45; // s
export const SYSTEM_VELOCITY_WINDOW_MS = 80;
// Labels: a body on the far side dims its name to this and hides its role
// (fading over this depth range, in orbit radii toward the viewer); when two
// labels overlap, the farther one fades out over this overlap fraction.
export const SYSTEM_FAR_NAME_ALPHA = 0.55;
export const SYSTEM_ROLE_FADE_FROM = -0.05;
export const SYSTEM_ROLE_FADE_TO = 0.25;
export const SYSTEM_LABEL_YIELD = 0.35;
// The black hole far behind the system: its rendered disc's radius as a
// fraction of the system radius (shrinking to MIN where room is short), its
// inclination, where it sits (its top level with the system's, its left edge
// this fraction of the radius out from the sun plus the margin, so it adds
// no height; orbits and bodies pass in front of it, as they would of
// anything that far away), how much it shifts as the view turns (a far
// backdrop moves less than the orbits), and the soft patch of night under it
// in the light theme (radius in disc radii).
export const HOLE_BACKDROP_OF_SYSTEM = 0.13;
export const HOLE_BACKDROP_MIN_OF_SYSTEM = 0.1;
export const HOLE_BACKDROP_INCLINATION_DEG = 83;
export const HOLE_BACKDROP_X = 0.72;
export const HOLE_BACKDROP_MARGIN = 14; // px
export const HOLE_BACKDROP_PARALLAX = 0.12;
export const HOLE_BACKDROP_YAW_FOLLOW = 0.25;
export const HOLE_BACKDROP_OPACITY = 0.9;
export const HOLE_PATCH_OF_DISC = 1.35;
export const SYSTEM_SHADE_SOFTNESS = 15; // % of the disc across the terminator
export const SYSTEM_ORBIT_ALPHA = 0.2; // near half of an orbit line (x ink)
export const SYSTEM_ORBIT_FAR = 0.5; // far half = near alpha x this
export const SYSTEM_ORBIT_SAMPLES = 120;
// As the system forms, each orbit draws itself in from its organizer,
// inner orbits first (each starts this much of the fade later).
export const SYSTEM_ORBIT_STAGGER = 0.25;
// First organizer at the near point of its orbit; the rest follow at the
// golden angle, so no two start lined up.
export const SYSTEM_PHASE_START = -Math.PI / 2;
export const SYSTEM_PHASE_STEP = Math.PI * (3 - Math.sqrt(5));
