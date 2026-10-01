// The Quantathon Committee as a planetary system (v4 page, 768 px and up).
//
// ScrollStage collapses the atom into a sun at the committee's sun slot; this
// module owns everything around that sun:
//   - the Director (the list item marked .scq4-director) rides the sun: their
//     photo fills the limb-darkened disk, name and role beneath;
//   - every other organizer is an aria-hidden copy of their photo, name and
//     role on a circular orbit (Kepler III, tilted like a real planet's
//     orbit), drawn in perspective and lit from the sun;
//   - the reader can turn the view: drag (touch: sideways only, so vertical
//     swipes still scroll), click or tap a side, or use the arrow keys;
//   - the system is sized to fit the screen both while pinned and when it
//     comes to rest above the end of the page, where it keeps orbiting;
//   - the black hole's place in the far background (ScrollStage draws it).
// The list in the page stays the accessible content; nothing here is read.

import { orbitBasis, PLANETS, type OrbitBasis } from '@/lib/physics/kepler.mjs';
import { orbitScreenExtents, orreryView, projectPerspective } from '@/lib/physics/cameras.mjs';
import {
  HOLE_BACKDROP_INCLINATION_DEG,
  HOLE_BACKDROP_MARGIN,
  HOLE_BACKDROP_MIN_OF_SYSTEM,
  HOLE_BACKDROP_OF_SYSTEM,
  HOLE_BACKDROP_OPACITY,
  HOLE_BACKDROP_PARALLAX,
  HOLE_BACKDROP_X,
  HOLE_BACKDROP_YAW_FOLLOW,
  SUN_LIMB_DARKENING,
  SUN_LIMB_STOPS,
  SYSTEM_CAMERA_DISTANCE,
  SYSTEM_CLICK_STEP,
  SYSTEM_DRAG_ELEVATION_PER_RADIUS,
  SYSTEM_DRAG_THRESHOLD_PX,
  SYSTEM_DRAG_YAW_PER_RADIUS,
  SYSTEM_ELEVATION,
  SYSTEM_ELEVATION_MAX,
  SYSTEM_ELEVATION_MIN,
  SYSTEM_FAR_NAME_ALPHA,
  SYSTEM_INERTIA_TAU,
  SYSTEM_KEY_ELEVATION_STEP,
  SYSTEM_KEY_STEP,
  SYSTEM_LABEL_YIELD,
  SYSTEM_NAV_GAP,
  SYSTEM_ORBITS,
  SYSTEM_ORBIT_ALPHA,
  SYSTEM_ORBIT_FAR,
  SYSTEM_ORBIT_SAMPLES,
  SYSTEM_ORBIT_STAGGER,
  SYSTEM_PHASE_START,
  SYSTEM_PHASE_STEP,
  SYSTEM_PLANETS,
  SYSTEM_RADIUS_OF_VIEWPORT,
  SYSTEM_REST_GAP,
  SYSTEM_REST_MIN_SCALE,
  SYSTEM_ROLE_FADE_FROM,
  SYSTEM_ROLE_FADE_TO,
  SYSTEM_SHADE_MAX,
  SYSTEM_SHADE_SOFTNESS,
  SYSTEM_SIDE_ROOM,
  SYSTEM_VELOCITY_WINDOW_MS,
} from './config';

type RGB = [number, number, number];

export interface CommitteeColors {
  ink: RGB; // orbit lines
  shade: RGB; // a body's night side
}

// Where the backdrop black hole goes this frame (CSS px), for ScrollStage.
export interface HolePose {
  x: number;
  y: number;
  r: number; // radius of its rendered disc (lensed sky included)
  incl: number; // rad
  azimuth: number; // rad, added to the hole's own slow drift
  opacity: number;
}

export interface CommitteeLayout {
  vw: number;
  vh: number;
  navH: number; // height of the sticky nav (0 if it scrolls away)
  maxScroll: number;
}

export interface CommitteeSystem {
  /** Laid out and showing (768 px and up, with at least one orbiting body). */
  readonly active: boolean;
  /** Scroll offset at which the sun slot is centered (the system's anchor). */
  readonly anchor: number;
  /** Document y of the runway's top, for loading the black hole in time. */
  readonly runwayTop: number;
  /** Whether there is room for the black hole in the background. */
  readonly hasBackdrop: boolean;
  layout(m: CommitteeLayout): void;
  /** Largest sun-center y (CSS px) that keeps the system above the page end. */
  pushLimit(scrollY: number): number;
  /** Advance drag inertia; true while the view is still turning. */
  step(dt: number, reduced: boolean): boolean;
  interacting(): boolean;
  drawOrbits(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    alpha: number,
    form: number,
    tau: number,
    near: boolean,
    colors: CommitteeColors,
  ): void;
  update(
    cx: number,
    cy: number,
    alpha: number,
    sunAlpha: number,
    sunR: number,
    tau: number,
    colors: CommitteeColors,
  ): void;
  backdropPose(cx: number, cy: number, alpha: number): HolePose | null;
  setLive(live: boolean): void;
  view(): { yaw: number; elevation: number };
  setView(yaw: number, elevation: number): void;
  /** Layout numbers, for the stage's development hook. */
  inspect(): Record<string, unknown>;
  dispose(): void;
}

interface Body {
  el: HTMLDivElement;
  shade: HTMLSpanElement;
  name: HTMLSpanElement;
  role: HTMLSpanElement;
  a: number; // orbit radius / system radius
  phase0: number; // rad, angle along the orbit at time zero
  basis: OrbitBasis;
  // Per frame:
  x: number;
  y: number;
  depth: number; // toward the viewer, in system radii
  nameW: number; // measured label widths (px)
  roleW: number;
  labelAlpha: number;
}

const TAU = 2 * Math.PI;
const DEG = Math.PI / 180;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (lo: number, hi: number, v: number) => {
  const t = clamp01((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};
const rgba = (c: RGB, alpha: number) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${clamp01(alpha).toFixed(3)})`;

function cloneText(member: Element, selector: string): string {
  return member.querySelector(selector)?.textContent?.trim() ?? '';
}

function makeDisc(member: Element, className: string): HTMLSpanElement {
  const disc = document.createElement('span');
  disc.className = className;
  const photo = member.querySelector('.hackathon-team-photo');
  if (photo instanceof HTMLImageElement) {
    const img = document.createElement('img');
    img.src = photo.currentSrc || photo.src;
    img.alt = '';
    img.decoding = 'async';
    disc.append(img);
  } else {
    disc.classList.add(`${className}--pending`);
  }
  return disc;
}

export function createCommitteeSystem(opts: {
  systemEl: HTMLElement;
  layer: HTMLElement;
  requestFrame: () => void;
}): CommitteeSystem | null {
  const { systemEl, layer, requestFrame } = opts;
  const members = Array.from(systemEl.querySelectorAll<HTMLElement>('.hackathon-team-member'));
  const director = members.find((m) => m.classList.contains('scq4-director')) ?? null;
  if (!director && process.env.NODE_ENV !== 'production') {
    console.warn('[scq4] no .scq4-director in the committee list; everyone orbits.');
  }
  const orbiting = members.filter((m) => m !== director);
  if (orbiting.length === 0) return null;

  // Orbiting copies (text via textContent only).
  const bodies: Body[] = orbiting.map((member, i) => {
    const el = document.createElement('div');
    el.className = 'scq4-body';
    const disc = makeDisc(member, 'scq4-body-disc');
    const shade = document.createElement('span');
    shade.className = 'scq4-body-shade';
    disc.append(shade);
    const name = document.createElement('span');
    name.className = 'scq4-body-name';
    name.textContent = cloneText(member, '.hackathon-team-name');
    const role = document.createElement('span');
    role.className = 'scq4-body-role';
    role.textContent = cloneText(member, '.hackathon-team-role');
    el.append(disc, name, role);
    layer.append(el);
    const k = Math.min(i, SYSTEM_ORBITS.length - 1);
    const key = SYSTEM_PLANETS[Math.min(i, SYSTEM_PLANETS.length - 1)];
    const planet = PLANETS.find((p) => p.key === key);
    const basis = orbitBasis(
      (planet?.elements.I ?? 0) * DEG,
      (planet?.elements.Omega ?? 0) * DEG,
      0,
    );
    return {
      el, shade, name, role,
      a: SYSTEM_ORBITS[k],
      phase0: SYSTEM_PHASE_START + i * SYSTEM_PHASE_STEP,
      basis,
      x: 0, y: 0, depth: 0, nameW: 0, roleW: 0, labelAlpha: 1,
    };
  });

  // The Director rides the sun.
  let sunEl: HTMLDivElement | null = null;
  let sunPhoto: HTMLSpanElement | null = null;
  if (director) {
    sunEl = document.createElement('div');
    sunEl.className = 'scq4-sun-body';
    if (director.querySelector('img.hackathon-team-photo')) {
      sunPhoto = makeDisc(director, 'scq4-sun-photo');
      const limb = document.createElement('span');
      limb.className = 'scq4-sun-limb';
      // The photosphere's limb darkening, I(mu)/I(1) = 1 - u (1 - mu), laid
      // over the photo (multiply), so the face reads as the sun's disk.
      const stops: string[] = [];
      for (let k = 0; k <= SUN_LIMB_STOPS; k++) {
        const rho = k / SUN_LIMB_STOPS;
        const mu = Math.sqrt(Math.max(0, 1 - rho * rho));
        const g = Math.round(255 * (1 - SUN_LIMB_DARKENING * (1 - mu)));
        stops.push(`rgb(${g}, ${g}, ${g}) ${(rho * 100).toFixed(1)}%`);
      }
      limb.style.background = `radial-gradient(circle closest-side, ${stops.join(', ')})`;
      sunPhoto.append(limb);
      sunEl.append(sunPhoto);
    }
    const name = document.createElement('span');
    name.className = 'scq4-sun-name';
    name.textContent = cloneText(director, '.hackathon-team-name');
    const role = document.createElement('span');
    role.className = 'scq4-sun-role';
    role.textContent = cloneText(director, '.hackathon-team-role');
    sunEl.append(name, role);
    layer.append(sunEl);
  }

  // The hit area for turning the view: a focusable ellipse over the system,
  // in the page flow above the stage, moved to the drawn system each frame.
  const hit = document.createElement('div');
  hit.className = 'scq4-system-hit';
  hit.tabIndex = 0;
  hit.setAttribute('role', 'application');
  hit.setAttribute('aria-roledescription', 'interactive diagram');
  hit.setAttribute(
    'aria-label',
    'Committee orbits. Drag, or use the left and right arrow keys, to turn them.',
  );
  systemEl.append(hit);

  const orbitRadii = Array.from(new Set(bodies.map((b) => b.a))).sort((x, y) => x - y);
  const viewM = new Float64Array(9);
  const extentView = new Float64Array(9);
  const proj = new Float64Array(4);
  const geo = {
    active: false,
    anchor: 0,
    runwayTop: 0,
    limitDoc: 0, // document y the system stays above at rest (the footer's top)
    Rpin: 0, // system radius (px) while pinned at the viewport center
    navTop: 0, // px from the viewport's top kept clear (nav plus gap)
    vw: 0,
    vh: 0,
    elMin: SYSTEM_ELEVATION_MIN,
    elMax: SYSTEM_ELEVATION_MAX,
    bodyHalf: 0, // px, half a body's disc
    labelBelow: 0, // px from a body's center to the bottom of its labels
    holeFrac: 0, // the black hole's disc radius / system radius (0: none)
  };
  // The view: yaw is free, elevation clamped to [elMin, elMax].
  const cam = { yaw: 0, elevation: SYSTEM_ELEVATION, vYaw: 0, vElev: 0 };
  let live = false;
  let sunCenter = { x: 0, y: 0 };
  let lastR = 0; // radius drawn last frame (px), for turning by drag

  // Extents (system radii, from the sun; screen y down) of all orbits seen
  // at an elevation: how far they reach up, down, and to either side. The
  // orbits are turned by yaw, but the extents are taken over a full turn
  // (the bodies sweep every yaw anyway), so they depend on elevation only.
  const extentCache = new Map<number, { top: number; bottom: number; half: number }>();
  function extents(elevation: number) {
    const key = Math.round(elevation * 1e4);
    const cached = extentCache.get(key);
    if (cached) return cached;
    let top = 0;
    let bottom = 0;
    let half = 0;
    const YAWS = 16;
    for (let k = 0; k < YAWS; k++) {
      orreryView((TAU * k) / YAWS, elevation, extentView);
      for (const b of bodies) {
        const e = orbitScreenExtents(extentView, b.basis, b.a, SYSTEM_CAMERA_DISTANCE, 96);
        top = Math.min(top, e.top);
        bottom = Math.max(bottom, e.bottom);
        half = Math.max(half, e.halfWidth);
      }
    }
    const out = { top: -top, bottom, half };
    if (extentCache.size > 256) extentCache.clear();
    extentCache.set(key, out);
    return out;
  }

  // How far the drawn system reaches from the sun (px) at radius R: up to
  // the top of the highest disc, down to the bottom of the lowest labels,
  // and out to the side of the widest disc.
  function reach(R: number, elevation: number) {
    const e = extents(elevation);
    return {
      up: R * e.top + geo.bodyHalf,
      down: R * e.bottom + geo.labelBelow,
      side: R * e.half + geo.bodyHalf,
    };
  }

  // The radius at a sun position: full size, unless the sun has been pushed
  // so high (at the page end, on a short screen) that the system would reach
  // the nav; then just small enough to clear it.
  function radiusAt(cy: number) {
    const e = extents(cam.elevation);
    const fit = (cy - geo.navTop - geo.bodyHalf) / Math.max(e.top, 1e-6);
    return Math.max(geo.Rpin * SYSTEM_REST_MIN_SCALE, Math.min(geo.Rpin, fit));
  }

  function measure() {
    const probe = bodies[0];
    const disc = probe.el.querySelector<HTMLElement>('.scq4-body-disc');
    geo.bodyHalf = (disc?.offsetHeight ?? 72) / 2;
    geo.labelBelow = probe.role.offsetTop + probe.role.offsetHeight;
    for (const b of bodies) {
      b.nameW = b.name.offsetWidth;
      b.roleW = b.role.offsetWidth;
    }
  }

  function layout(m: CommitteeLayout) {
    const slot = systemEl.querySelector<HTMLElement>('.scq4-slot--sun');
    const r = slot?.getBoundingClientRect();
    geo.active = !!r && r.width > 0;
    if (geo.active && r) {
      geo.vw = m.vw;
      geo.vh = m.vh;
      geo.navTop = m.navH + SYSTEM_NAV_GAP;
      const sy = window.scrollY;
      geo.anchor = Math.min(m.maxScroll, Math.max(0, r.top + sy + r.height / 2 - m.vh / 2));
      const box = systemEl.getBoundingClientRect();
      geo.runwayTop = box.top + sy;
      const footer = document.querySelector('footer');
      geo.limitDoc = (footer ? footer.getBoundingClientRect().top : box.bottom) + sy;
      measure();
      // Pinned at the viewport center, the system clears the nav above and
      // the screen's edge below, and leaves room for labels at the sides.
      const e0 = extents(SYSTEM_ELEVATION);
      const upRoom = m.vh / 2 - geo.navTop;
      const downRoom = m.vh / 2 - SYSTEM_NAV_GAP;
      geo.Rpin = Math.max(
        0,
        Math.min(
          m.vw * SYSTEM_RADIUS_OF_VIEWPORT,
          (m.vw / 2 - SYSTEM_SIDE_ROOM) / Math.max(e0.half, 1e-6),
          (upRoom - geo.bodyHalf) / Math.max(e0.top, 1e-6),
          (downRoom - geo.labelBelow) / Math.max(e0.bottom, 1e-6),
        ),
      );
      geo.active = geo.Rpin > 0;
      if (geo.active) {
        // The tallest view that still fits pinned, found by bisection.
        const fits = (el: number) => {
          const h = reach(geo.Rpin, el);
          return h.up <= upRoom && h.down <= downRoom;
        };
        let lo = SYSTEM_ELEVATION;
        let hi = SYSTEM_ELEVATION_MAX;
        if (fits(hi)) lo = hi;
        else for (let k = 0; k < 24; k++) {
          const mid = (lo + hi) / 2;
          if (fits(mid)) lo = mid;
          else hi = mid;
        }
        geo.elMin = SYSTEM_ELEVATION_MIN;
        geo.elMax = Math.max(SYSTEM_ELEVATION, lo);
        cam.elevation = Math.min(geo.elMax, Math.max(geo.elMin, cam.elevation));
        placeBackdrop();
      }
    }
    hit.classList.toggle('is-active', geo.active);
  }

  // The hole's size: the larger disc if it stays inside the viewport's right
  // edge however the view turns, else the smaller one, else none.
  function placeBackdrop() {
    geo.holeFrac = 0;
    for (const frac of [HOLE_BACKDROP_OF_SYSTEM, HOLE_BACKDROP_MIN_OF_SYSTEM]) {
      const right =
        geo.vw / 2 +
        geo.Rpin * (HOLE_BACKDROP_X + 2 * frac + HOLE_BACKDROP_PARALLAX) +
        HOLE_BACKDROP_MARGIN;
      if (right <= geo.vw - SYSTEM_NAV_GAP) {
        geo.holeFrac = frac;
        return;
      }
    }
  }

  // Largest sun-center y (px) at which the whole system, shrinking at the
  // page end if it must, stays above the footer. The system's bottom grows
  // with the sun's y (the radius never shrinks as the sun moves down), so
  // bisection finds it.
  function pushLimit(scrollY: number) {
    if (!geo.active) return Infinity;
    const floor = geo.limitDoc - scrollY - SYSTEM_REST_GAP;
    const e = extents(cam.elevation);
    const bottomAt = (cy: number) => cy + radiusAt(cy) * e.bottom + geo.labelBelow;
    let lo = geo.navTop;
    let hi = Math.max(lo, 2 * geo.vh);
    if (bottomAt(hi) <= floor) return hi;
    if (bottomAt(lo) > floor) return lo;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (bottomAt(mid) <= floor) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  // ---- Interaction ---------------------------------------------------------
  type Sample = { t: number; x: number; y: number };
  let pointerId: number | null = null;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let samples: Sample[] = [];
  let reducedNow = false;

  function clampElevation(el: number) {
    return Math.min(geo.elMax, Math.max(geo.elMin, el));
  }

  // A glide that coasts exactly `angle` (rad) under exponential decay:
  // integral of v0 e^(-t / tau) = v0 tau.
  function glide(yawAngle: number, elevAngle = 0) {
    if (reducedNow) {
      cam.yaw += yawAngle;
      cam.elevation = clampElevation(cam.elevation + elevAngle);
    } else {
      cam.vYaw += yawAngle / SYSTEM_INERTIA_TAU;
      cam.vElev += elevAngle / SYSTEM_INERTIA_TAU;
    }
    requestFrame();
  }

  const onDown = (e: PointerEvent) => {
    if (!live || e.button !== 0) return;
    pointerId = e.pointerId;
    dragging = false;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    samples = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }];
    cam.vYaw = 0;
    cam.vElev = 0;
    try {
      hit.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers can't be captured.
    }
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    if (!dragging) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < SYSTEM_DRAG_THRESHOLD_PX) return;
      dragging = true;
      hit.classList.add('is-dragging');
    }
    const R = Math.max(lastR, 1);
    cam.yaw += ((e.clientX - lastX) / R) * SYSTEM_DRAG_YAW_PER_RADIUS;
    if (e.pointerType === 'mouse') {
      cam.elevation = clampElevation(
        cam.elevation + ((e.clientY - lastY) / R) * SYSTEM_DRAG_ELEVATION_PER_RADIUS,
      );
    }
    lastX = e.clientX;
    lastY = e.clientY;
    samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    while (samples.length > 2 && e.timeStamp - samples[0].t > SYSTEM_VELOCITY_WINDOW_MS) samples.shift();
    requestFrame();
  };
  const endPointer = (e: PointerEvent, cancelled: boolean) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    hit.classList.remove('is-dragging');
    if (dragging) {
      dragging = false;
      const first = samples[0];
      const dt = (e.timeStamp - first.t) / 1000;
      if (!reducedNow && dt > 0) {
        const R = Math.max(lastR, 1);
        cam.vYaw = ((e.clientX - first.x) / R / dt) * SYSTEM_DRAG_YAW_PER_RADIUS;
        cam.vElev =
          e.pointerType === 'mouse'
            ? ((e.clientY - first.y) / R / dt) * SYSTEM_DRAG_ELEVATION_PER_RADIUS
            : 0;
      }
      requestFrame();
      return;
    }
    if (cancelled) return;
    // A click or tap without a drag: glide a step toward that side.
    glide(e.clientX >= sunCenter.x ? SYSTEM_CLICK_STEP : -SYSTEM_CLICK_STEP);
  };
  const onUp = (e: PointerEvent) => endPointer(e, false);
  const onCancel = (e: PointerEvent) => endPointer(e, true);
  const onKey = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case 'ArrowLeft':
        glide(-SYSTEM_KEY_STEP);
        break;
      case 'ArrowRight':
        glide(SYSTEM_KEY_STEP);
        break;
      case 'ArrowUp':
        glide(0, SYSTEM_KEY_ELEVATION_STEP);
        break;
      case 'ArrowDown':
        glide(0, -SYSTEM_KEY_ELEVATION_STEP);
        break;
      case 'Home':
        cam.vYaw = cam.vElev = 0;
        glide(-cam.yaw, SYSTEM_ELEVATION - cam.elevation);
        break;
      default:
        return;
    }
    e.preventDefault();
  };
  // Focusing the system while it is off screen brings it into view.
  const onFocus = () => {
    if (live || !geo.active) return;
    const behavior: ScrollBehavior = reducedNow ? 'auto' : 'smooth';
    window.scrollTo({ top: geo.anchor, behavior });
  };
  hit.addEventListener('pointerdown', onDown);
  hit.addEventListener('pointermove', onMove);
  hit.addEventListener('pointerup', onUp);
  hit.addEventListener('pointercancel', onCancel);
  hit.addEventListener('keydown', onKey);
  hit.addEventListener('focus', onFocus);

  function step(dt: number, reduced: boolean) {
    reducedNow = reduced;
    if (dragging) return true;
    if (reduced) {
      cam.vYaw = cam.vElev = 0;
      return false;
    }
    const moving = Math.abs(cam.vYaw) > 1e-3 || Math.abs(cam.vElev) > 1e-3;
    if (!moving) {
      cam.vYaw = cam.vElev = 0;
      return false;
    }
    // Exact exponential decay over the step: displacement v0 tau (1 - e^-dt/tau).
    const k = Math.exp(-dt / SYSTEM_INERTIA_TAU);
    cam.yaw += cam.vYaw * SYSTEM_INERTIA_TAU * (1 - k);
    const el = cam.elevation + cam.vElev * SYSTEM_INERTIA_TAU * (1 - k);
    cam.elevation = clampElevation(el);
    if (cam.elevation !== el) cam.vElev = 0;
    cam.vYaw *= k;
    cam.vElev *= k;
    return true;
  }

  // ---- Drawing ---------------------------------------------------------------
  function bodyAngle(b: Body, tau: number) {
    return b.phase0 + tau * (SYSTEM_ORBITS[0] / b.a) ** 1.5;
  }

  // Orbit lines: the half behind the sun (far) or in front (near). While
  // the system forms (form < 1) each orbit draws itself in from its
  // organizer, inner orbits first.
  function drawOrbits(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    alpha: number,
    form: number,
    tau: number,
    near: boolean,
    colors: CommitteeColors,
  ) {
    if (!geo.active || alpha <= 0.002) return;
    orreryView(cam.yaw, cam.elevation, viewM);
    const R = radiusAt(cy);
    const span = 1 + (orbitRadii.length - 1) * SYSTEM_ORBIT_STAGGER;
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(colors.ink, SYSTEM_ORBIT_ALPHA * (near ? 1 : SYSTEM_ORBIT_FAR) * alpha);
    ctx.beginPath();
    for (const b of bodies) {
      const j = orbitRadii.indexOf(b.a);
      const drawn = clamp01(form * span - j * SYSTEM_ORBIT_STAGGER);
      if (drawn <= 0) continue;
      const start = bodyAngle(b, tau);
      const samples = Math.ceil(SYSTEM_ORBIT_SAMPLES * drawn);
      let pen = false;
      for (let k = 0; k <= samples; k++) {
        const th = start - (TAU * drawn * k) / samples;
        const c = Math.cos(th);
        const s = Math.sin(th);
        const px = b.a * (c * b.basis.Px + s * b.basis.Qx);
        const py = b.a * (c * b.basis.Py + s * b.basis.Qy);
        const pz = b.a * (c * b.basis.Pz + s * b.basis.Qz);
        projectPerspective(viewM, px, py, pz, SYSTEM_CAMERA_DISTANCE, R, proj);
        if ((proj[2] >= 0) !== near) {
          pen = false;
          continue;
        }
        const X = cx + proj[0];
        const Y = cy + proj[1];
        if (pen) ctx.lineTo(X, Y);
        else ctx.moveTo(X, Y);
        pen = true;
      }
    }
    ctx.stroke();
  }

  // Bodies, the Director's sun, labels, and the hit area.
  function update(
    cx: number,
    cy: number,
    alpha: number,
    sunAlpha: number,
    sunR: number,
    tau: number,
    colors: CommitteeColors,
  ) {
    sunCenter = { x: cx, y: cy };
    const showing = geo.active && alpha > 0.002;
    if (!showing) {
      for (const b of bodies) b.el.style.opacity = '0';
      if (sunEl) sunEl.style.opacity = '0';
      hit.style.visibility = 'hidden';
      return;
    }
    hit.style.visibility = '';
    orreryView(cam.yaw, cam.elevation, viewM);
    const R = radiusAt(cy);
    lastR = R;
    const D = SYSTEM_CAMERA_DISTANCE;
    for (const b of bodies) {
      const th = bodyAngle(b, tau);
      const c = Math.cos(th);
      const s = Math.sin(th);
      const px = b.a * (c * b.basis.Px + s * b.basis.Qx);
      const py = b.a * (c * b.basis.Py + s * b.basis.Qy);
      const pz = b.a * (c * b.basis.Pz + s * b.basis.Qz);
      projectPerspective(viewM, px, py, pz, D, R, proj);
      b.x = cx + proj[0];
      b.y = cy + proj[1];
      b.depth = proj[2];
      const scale = proj[3];
      // Phase from the sun: cos(alpha) = -p_hat . (camera - p)_hat; the lit
      // fraction of the disc is (1 + cos alpha) / 2, the dark side facing
      // away from the sun on screen.
      const wx = viewM[6] * D - px;
      const wy = viewM[7] * D - py;
      const wz = viewM[8] * D - pz;
      const cosA = -(px * wx + py * wy + pz * wz) / (b.a * Math.hypot(wx, wy, wz));
      const lit = ((1 + cosA) / 2) * 100;
      const away = (Math.atan2(b.x - cx, -(b.y - cy)) * 180) / Math.PI;
      b.shade.style.background = `linear-gradient(${away.toFixed(1)}deg, ${rgba(colors.shade, 0)} ${(lit - SYSTEM_SHADE_SOFTNESS).toFixed(1)}%, ${rgba(colors.shade, SYSTEM_SHADE_MAX)} ${(lit + SYSTEM_SHADE_SOFTNESS).toFixed(1)}%)`;
      b.el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      b.el.style.zIndex = b.depth < 0 ? '0' : '3';
      // Behind the sun: fade while the disc overlaps the sun's on screen.
      const overlap = Math.hypot(b.x - cx, b.y - cy) - (sunR + geo.bodyHalf * scale);
      const hidden = b.depth < 0 ? 1 - smoothstep(-geo.bodyHalf, geo.bodyHalf, overlap) : 0;
      b.el.style.opacity = (alpha * (1 - 0.85 * hidden)).toFixed(3);
      b.labelAlpha = 1;
    }
    // Labels: far names dim, far roles fade; the farther of two overlapping
    // labels yields.
    for (const b of bodies) {
      const d = b.depth / b.a;
      b.labelAlpha = SYSTEM_FAR_NAME_ALPHA + (1 - SYSTEM_FAR_NAME_ALPHA) * smoothstep(-1, 1, d);
    }
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const p = bodies[i];
        const q = bodies[j];
        const w = (Math.max(p.nameW, p.roleW) + Math.max(q.nameW, q.roleW)) / 2;
        const ox = w - Math.abs(p.x - q.x);
        const oy = geo.labelBelow - Math.abs(p.y - q.y);
        if (ox <= 0 || oy <= 0) continue;
        const frac = Math.min(ox / Math.max(w, 1), oy / Math.max(geo.labelBelow, 1));
        const far = p.depth < q.depth ? p : q;
        far.labelAlpha *= 1 - smoothstep(0, SYSTEM_LABEL_YIELD, frac);
      }
    }
    for (const b of bodies) {
      b.name.style.opacity = b.labelAlpha.toFixed(3);
      const roleVisible = smoothstep(SYSTEM_ROLE_FADE_FROM, SYSTEM_ROLE_FADE_TO, b.depth / b.a);
      b.role.style.opacity = (b.labelAlpha * roleVisible).toFixed(3);
    }
    if (sunEl) {
      sunEl.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
      sunEl.style.setProperty('--scq4-sun-r', `${sunR.toFixed(1)}px`);
      sunEl.style.opacity = sunAlpha.toFixed(3);
    }
    // The hit ellipse follows the drawn system.
    const h = reach(R, cam.elevation);
    const w = 2 * h.side;
    const top = cy - h.up;
    hit.style.width = `${Math.round(w)}px`;
    hit.style.height = `${Math.round(h.up + h.down)}px`;
    hit.style.transform = `translate(${(cx - w / 2).toFixed(1)}px, ${top.toFixed(1)}px)`;
  }

  // The hole's place this frame: its top level with the system's top, its
  // left edge out past the orbits' upper right, shifting a little as the
  // view turns (it is far behind the system).
  function backdropPose(cx: number, cy: number, alpha: number): HolePose | null {
    if (!geo.active || geo.holeFrac <= 0 || alpha <= 0.002) return null;
    const R = radiusAt(cy);
    const r = geo.holeFrac * R;
    const shift = -HOLE_BACKDROP_PARALLAX * R * Math.sin(cam.yaw);
    return {
      x: cx + R * HOLE_BACKDROP_X + HOLE_BACKDROP_MARGIN + r + shift,
      y: cy - reach(R, cam.elevation).up + r,
      r,
      incl: HOLE_BACKDROP_INCLINATION_DEG * DEG,
      azimuth: HOLE_BACKDROP_YAW_FOLLOW * cam.yaw,
      opacity: alpha * HOLE_BACKDROP_OPACITY,
    };
  }

  function setLive(next: boolean) {
    if (live === next) return;
    live = next;
    hit.classList.toggle('is-live', live);
    if (!live && pointerId !== null) {
      try {
        hit.releasePointerCapture(pointerId);
      } catch {
        // already released
      }
      pointerId = null;
      dragging = false;
      hit.classList.remove('is-dragging');
    }
  }

  systemEl.classList.add('scq4-system--live');

  return {
    get active() {
      return geo.active;
    },
    get anchor() {
      return geo.anchor;
    },
    get runwayTop() {
      return geo.runwayTop;
    },
    get hasBackdrop() {
      return geo.active && geo.holeFrac > 0;
    },
    layout,
    pushLimit,
    step,
    interacting: () => dragging || Math.abs(cam.vYaw) > 1e-3 || Math.abs(cam.vElev) > 1e-3,
    drawOrbits,
    update,
    backdropPose,
    setLive,
    view: () => ({ yaw: cam.yaw, elevation: cam.elevation }),
    setView(yaw: number, elevation: number) {
      cam.yaw = yaw;
      cam.elevation = clampElevation(elevation);
      cam.vYaw = cam.vElev = 0;
    },
    inspect() {
      const R = radiusAt(sunCenter.y);
      return {
        ...geo,
        R,
        sun: sunCenter,
        extents: extents(cam.elevation),
        reach: reach(R, cam.elevation),
        live,
        yaw: cam.yaw,
        elevation: cam.elevation,
      };
    },
    dispose() {
      hit.removeEventListener('pointerdown', onDown);
      hit.removeEventListener('pointermove', onMove);
      hit.removeEventListener('pointerup', onUp);
      hit.removeEventListener('pointercancel', onCancel);
      hit.removeEventListener('keydown', onKey);
      hit.removeEventListener('focus', onFocus);
      hit.remove();
      for (const b of bodies) b.el.remove();
      sunEl?.remove();
      systemEl.classList.remove('scq4-system--live');
    },
  };
}
