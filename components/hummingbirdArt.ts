// Original hummingbird drawing for the Qiskit Fall Fest 2026 page, shared by
// the inline SVG (Hummingbird.tsx) and the hero sky canvas (CloudSky.tsx) so
// both draw the same bird. Facing right in a 48 x 32 box: forked tail low at
// the left, body rising to the head, long beak to the right. The wing is
// drawn raised and turns about the shoulder (HB_PIVOT), which is also the
// bottom-right corner of its bounding box, so CSS can rotate it with
// transform-box: fill-box and transform-origin: 100% 100%.
//
// The flight math at the bottom is shared by every moving kind, the hero
// sky's birds (CloudSky), the roaming page birds (PageBirds) and the boxed
// patches' (HummingbirdZone), so tuning one can't quietly make them fly
// differently. Each keeps its own speeds and lean amount.

export type HummingbirdVariant = 'pink' | 'lavender';

export const HB_VIEW = { w: 48, h: 32 } as const;

export const HB_PIVOT = { x: 21.5, y: 13.8 } as const;

export const HB_PATHS = {
  tail: 'M14 19.4L3.2 25.6L8.4 25.9L6.4 30.8L17.4 22.8Z',
  body: 'M13 21.6C14.6 16.4 20.4 12.2 26.6 11.2C29.6 13.6 29.4 18.2 25.6 21C21.8 23.8 16.2 24.2 13 21.6Z',
  gorget: 'M26.4 12.6C27.6 16.4 31.6 16.6 33.6 12.4C31.4 13.8 28.6 13.9 26.4 12.6Z',
  beak: 'M33.4 8.4L46.8 6.2L33.8 10.4Z',
  wing: 'M21.5 13.8C20.2 8.2 15.6 3.4 9.4 1.4C11.4 6.4 15.4 11.6 21.5 13.8Z',
} as const;

export const HB_HEAD = { cx: 29.6, cy: 9.8, r: 4.4 } as const;

export const HB_EYE = { cx: 31, cy: 8.8, r: 1 } as const;

/** Wing angles in degrees about HB_PIVOT for the canvas flutter: up, level, down. */
export const HB_WING_POSES = [0, -40, -75] as const;

/** Ease in and out over a flight leg: k is the share of the leg's time gone (0–1). */
export function smoothstep(k: number): number {
  return k * k * (3 - 2 * k);
}

/** px a hovering bird bobs up and down at `elapsed` seconds. */
export function hoverBob(elapsed: number, phase: number): number {
  return Math.sin(elapsed * 3 + phase) * 1.5;
}

/** Radians a moving bird leans: nose down most at mid-leg, level at both ends. */
export function lean(k: number, amp: number): number {
  return amp * Math.sin(Math.PI * k);
}
