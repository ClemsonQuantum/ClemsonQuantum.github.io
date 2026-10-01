// Original gliding birds for the Qiskit Fall Fest 2026 sky (a gull, a swallow
// and a falcon), drawn for this site in the same flat geometric style as
// hummingbirdArt.ts. CloudSky flies them over the hero and PageClouds sends
// one through the page-wide cloud layer now and then. Each faces right in a
// 64 x 32 box; the near wing is drawn raised and turns about the shoulder
// (pivot). Part names map to --qff-soar-<species>-<part> color tokens.

export type SoarerSpecies = 'gull' | 'swallow' | 'falcon';

export type SoarerPart = 'body' | 'back' | 'wing' | 'accent' | 'beak' | 'eye';

export type SoarerShape =
  | { part: SoarerPart; d: string }
  | { part: SoarerPart; circle: [cx: number, cy: number, r: number] };

export interface SoarerArt {
  pivot: { x: number; y: number };
  /** Drawn first, in order: tail, body, patches, head, beak, eye. */
  body: SoarerShape[];
  /** Drawn on top, rotated about the pivot for each wing pose. */
  wing: SoarerShape[];
}

export const SOARER_VIEW = { w: 64, h: 32 } as const;

export const SOARER_PARTS: readonly SoarerPart[] = ['body', 'back', 'wing', 'accent', 'beak', 'eye'];

export const SOARER_SPECIES: readonly SoarerSpecies[] = ['gull', 'swallow', 'falcon'];

/** Wing angles in degrees about the pivot: raised, gliding (the drawn
 *  shape, a shallow V), lowered. */
export const SOARER_WING_POSES = [24, 0, -30] as const;
export const SOARER_GLIDE_POSE = 1;

export const SOARER_ART: Record<SoarerSpecies, SoarerArt> = {
  // Long bent wings with dark tips, a square tail, a pale body.
  gull: {
    pivot: { x: 31, y: 15 },
    body: [
      { part: 'back', d: 'M12 17L4 15.4L4.4 21.2L12 19.8Z' },
      { part: 'body', d: 'M10 18C16 14 30 13 42 14C48 14.5 52 16 54 18C50 20.5 44 21.6 36 21.6C26 21.6 16 21 10 18Z' },
      { part: 'body', circle: [52, 16.4, 3.6] },
      { part: 'beak', d: 'M55.2 15.5L61.4 16.7L55.3 18.1Z' },
      { part: 'eye', circle: [53.2, 15.5, 0.7] },
    ],
    wing: [
      { part: 'wing', d: 'M31 15L24 6L8 3L21 10.5L27 16.5Z' },
      { part: 'accent', d: 'M14.5 4.2L8 3L13.2 6.8Z' },
    ],
  },
  // Slim and swept, with a deep forked tail and a pink throat.
  swallow: {
    pivot: { x: 32, y: 15 },
    body: [
      { part: 'back', d: 'M18 16.6L2 12L10 17.6L2 23.6L18 19Z' },
      { part: 'body', d: 'M16 17C22 13.5 34 12.5 44 14C48 14.7 50.5 16 51.5 17.6C48 19.6 42 20.6 34 20.6C26 20.6 20 19.6 16 17Z' },
      { part: 'back', circle: [49.5, 15.8, 3.2] },
      { part: 'accent', d: 'M47 17.4C48.8 19.6 51.6 19.4 52.6 17.2C51 18 48.8 18.2 47 17.4Z' },
      { part: 'beak', d: 'M52.5 15.3L56.2 16.2L52.5 17.1Z' },
      { part: 'eye', circle: [50.6, 15, 0.65] },
    ],
    wing: [{ part: 'wing', d: 'M33 15C30 10 24 5.5 13 3C19.5 7 25 11 28 16.5Z' }],
  },
  // Compact, with pointed wings, a short tail, a pink breast and a dark stripe
  // under the eye.
  falcon: {
    pivot: { x: 28, y: 15 },
    body: [
      { part: 'back', d: 'M16 17.6L4 16.2L4.8 20.8L16 20.4Z' },
      { part: 'body', d: 'M14 18C19 13.5 30 12.5 40 13.8C45 14.4 48 16 49 18C46 21 39 22.4 30 22.4C23 22.4 17 21 14 18Z' },
      { part: 'accent', d: 'M33 19C38 21.8 44 21.4 47.5 18.8C42 19.8 37.5 19.9 33 19Z' },
      { part: 'back', circle: [46.5, 16, 3.8] },
      { part: 'eye', d: 'M45.8 17.2L47.2 20.4L48.6 17.6Z' },
      { part: 'beak', d: 'M50 15.3L53.8 16.6L52.2 18.3L50 17.6Z' },
      { part: 'eye', circle: [47.7, 15.3, 0.8] },
    ],
    wing: [{ part: 'wing', d: 'M29 15L21 5L6 1.5L19 9.5L25 16.5Z' }],
  },
};
