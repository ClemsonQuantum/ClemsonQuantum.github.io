// How the gliding birds (soarerArt.ts) fly, shared by CloudSky and
// PageClouds: straight across their sky at a steady speed, rising and falling
// gently and banking with it, gliding most of the time with a short burst of
// flaps every few seconds. Once a bird leaves one side it waits, then comes
// back from either side as a new random species.
import {
  SOARER_GLIDE_POSE,
  SOARER_SPECIES,
  type SoarerSpecies,
} from './soarerArt';

export interface Soarer {
  species: SoarerSpecies;
  x: number; // centre, px
  y0: number; // centre of the rise and fall, px
  dir: 1 | -1;
  speed: number; // px/s
  amp: number; // px of rise and fall
  freq: number; // rad/s
  phase: number;
  flap: number; // s left in the current burst of flaps
  calm: number; // s until the next burst
  wait: number; // s until it flies in again (0 while flying)
  flown: boolean; // has flown in once (later flights pick a new species)
}

/** The band a soarer may fly in, and how it moves there. */
export interface SoarerSky {
  width: number;
  top: number; // px, highest centre line
  bottom: number; // px, lowest centre line
  birdW: number; // px, sprite width (for leaving fully off screen)
  speed: readonly [number, number]; // px/s
  wait: readonly [number, number]; // s between crossings
}

const FLAP_HZ = 3;
const FLAP_CYCLE = [SOARER_GLIDE_POSE, 0, SOARER_GLIDE_POSE, 2]; // glide, up, glide, down
const between = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pickSpecies = () => SOARER_SPECIES[Math.floor(Math.random() * SOARER_SPECIES.length)];

export function makeSoarer(sky: SoarerSky, wait: number, species = pickSpecies()): Soarer {
  const s: Soarer = {
    species,
    x: 0,
    y0: 0,
    dir: 1,
    speed: 0,
    amp: 0,
    freq: 0,
    phase: Math.random() * Math.PI * 2,
    flap: 0,
    calm: 0,
    wait,
    flown: false,
  };
  if (wait <= 0) launchSoarer(s, sky);
  return s;
}

export function launchSoarer(s: Soarer, sky: SoarerSky) {
  if (s.flown) s.species = pickSpecies();
  s.flown = true;
  s.dir = Math.random() < 0.5 ? 1 : -1;
  s.x = s.dir > 0 ? -sky.birdW : sky.width + sky.birdW;
  s.amp = Math.min(6, (sky.bottom - sky.top) / 3);
  s.y0 = between(sky.top + s.amp, Math.max(sky.top + s.amp, sky.bottom - s.amp));
  s.speed = between(...sky.speed);
  s.freq = between(1, 1.6);
  s.flap = 0;
  s.calm = between(1, 3);
  s.wait = 0;
}

/** Holds a soarer still in view, gliding (reduced motion). */
export function parkSoarer(s: Soarer, sky: SoarerSky, xFraction: number) {
  s.x = sky.width * xFraction;
  s.y0 = (sky.top + sky.bottom) / 2;
  s.amp = 0;
  s.flap = 0;
  s.wait = 0;
}

export function stepSoarer(s: Soarer, dt: number, sky: SoarerSky) {
  if (s.wait > 0) {
    s.wait -= dt;
    if (s.wait <= 0) launchSoarer(s, sky);
    return;
  }
  s.x += s.dir * s.speed * dt;
  if (s.flap > 0) {
    s.flap -= dt;
  } else if ((s.calm -= dt) <= 0) {
    s.flap = between(0.7, 1.4);
    s.calm = between(2.5, 6);
  }
  const gone = s.dir > 0 ? s.x > sky.width + sky.birdW : s.x < -sky.birdW;
  if (gone) s.wait = between(...sky.wait);
}

export function soarerFlying(s: Soarer) {
  return s.wait <= 0;
}

/** Centre y, bank angle (rad, nose down while descending) and wing pose. */
export function soarerPose(s: Soarer, elapsed: number) {
  const angle = elapsed * s.freq + s.phase;
  const vy = s.amp * s.freq * Math.cos(angle);
  return {
    y: s.y0 + s.amp * Math.sin(angle),
    lean: Math.atan2(vy, Math.max(1, s.speed)) * 0.8,
    pose: s.flap > 0 ? FLAP_CYCLE[Math.floor(elapsed * FLAP_HZ * FLAP_CYCLE.length) % FLAP_CYCLE.length] : SOARER_GLIDE_POSE,
  };
}
