// Offscreen sprites for the birds the Fall Fest canvases draw (CloudSky's
// hero sky and PageClouds' page-wide layer): one sprite per wing pose, facing
// right, drawn once at the current size and DPR and blitted every frame.
// Colors come from the --qff-hb-* and --qff-soar-* tokens, read from an
// element inside .qff-page so dark mode and the band can re-ink them.
import {
  HB_EYE,
  HB_HEAD,
  HB_PATHS,
  HB_PIVOT,
  HB_VIEW,
  HB_WING_POSES,
  type HummingbirdVariant,
} from './hummingbirdArt';
import {
  SOARER_ART,
  SOARER_PARTS,
  SOARER_SPECIES,
  SOARER_VIEW,
  SOARER_WING_POSES,
  type SoarerPart,
  type SoarerShape,
  type SoarerSpecies,
} from './soarerArt';

// View units of empty margin around the art: room for the hummingbird's
// lowered wing, and for a soarer's long wing at full stroke.
const HB_PAD = 2;
const SOAR_PAD = 7;

export const HB_VARIANTS = ['pink', 'lavender'] as const satisfies readonly HummingbirdVariant[];

export type SpriteSet<K extends string> = Partial<Record<K, HTMLCanvasElement[]>>;

export interface BirdColors {
  hummer: Partial<Record<HummingbirdVariant, Record<'back' | 'body' | 'throat' | 'wing', string>>>;
  beak: string;
  eye: string;
  soarer: Partial<Record<SoarerSpecies, Record<SoarerPart, string>>>;
}

export function readBirdColors(el: Element): BirdColors {
  const styles = getComputedStyle(el);
  const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  const colors: BirdColors = {
    hummer: {},
    beak: token('--qff-hb-beak', '#161616'),
    eye: token('--qff-hb-eye', '#161616'),
    soarer: {},
  };
  for (const v of HB_VARIANTS) {
    colors.hummer[v] = {
      back: token(`--qff-hb-${v}-back`, '#6929c4'),
      body: token(`--qff-hb-${v}-body`, '#be95ff'),
      throat: token(`--qff-hb-${v}-throat`, '#ff7eb6'),
      wing: token(`--qff-hb-${v}-wing`, '#d4bbff'),
    };
  }
  for (const s of SOARER_SPECIES) {
    const parts = {} as Record<SoarerPart, string>;
    for (const part of SOARER_PARTS) parts[part] = token(`--qff-soar-${s}-${part}`, '#be95ff');
    colors.soarer[s] = parts;
  }
  return colors;
}

function poseSprites(
  view: { w: number; h: number },
  pad: number,
  width: number,
  dpr: number,
  angles: readonly number[],
  draw: (g: CanvasRenderingContext2D, angle: number) => void,
): HTMLCanvasElement[] {
  const scale = width / view.w;
  return angles.map((angle) => {
    const s = document.createElement('canvas');
    s.width = Math.max(1, Math.round((view.w + 2 * pad) * scale * dpr));
    s.height = Math.max(1, Math.round((view.h + 2 * pad) * scale * dpr));
    const g = s.getContext('2d');
    if (!g) return s;
    g.scale(scale * dpr, scale * dpr);
    g.translate(pad, pad);
    draw(g, angle);
    return s;
  });
}

function rotated(g: CanvasRenderingContext2D, pivot: { x: number; y: number }, angle: number, paint: () => void) {
  g.save();
  g.translate(pivot.x, pivot.y);
  g.rotate((angle * Math.PI) / 180);
  g.translate(-pivot.x, -pivot.y);
  paint();
  g.restore();
}

/** CSS px a sprite for a bird `width` wide takes, padding included. */
export const hummerSpriteWidth = (width: number) => ((HB_VIEW.w + 2 * HB_PAD) / HB_VIEW.w) * width;
export const soarerSpriteWidth = (width: number) =>
  ((SOARER_VIEW.w + 2 * SOAR_PAD) / SOARER_VIEW.w) * width;

export function hummerSprites(colors: BirdColors, width: number, dpr: number): SpriteSet<HummingbirdVariant> {
  const out: SpriteSet<HummingbirdVariant> = {};
  for (const v of HB_VARIANTS) {
    const c = colors.hummer[v];
    if (!c) continue;
    out[v] = poseSprites(HB_VIEW, HB_PAD, width, dpr, HB_WING_POSES, (g, angle) => {
      const fill = (d: string, color: string) => {
        g.fillStyle = color;
        g.fill(new Path2D(d));
      };
      const dot = (cx: number, cy: number, r: number, color: string) => {
        g.fillStyle = color;
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.fill();
      };
      fill(HB_PATHS.tail, c.back);
      fill(HB_PATHS.body, c.body);
      dot(HB_HEAD.cx, HB_HEAD.cy, HB_HEAD.r, c.back);
      fill(HB_PATHS.gorget, c.throat);
      fill(HB_PATHS.beak, colors.beak);
      dot(HB_EYE.cx, HB_EYE.cy, HB_EYE.r, colors.eye);
      rotated(g, HB_PIVOT, angle, () => {
        g.globalAlpha = 0.75; // a wing in motion reads lighter
        fill(HB_PATHS.wing, c.wing);
      });
    });
  }
  return out;
}

function paintShape(g: CanvasRenderingContext2D, shape: SoarerShape, color: string) {
  g.fillStyle = color;
  if ('d' in shape) {
    g.fill(new Path2D(shape.d));
  } else {
    const [cx, cy, r] = shape.circle;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }
}

export function soarerSprites(colors: BirdColors, width: number, dpr: number): SpriteSet<SoarerSpecies> {
  const out: SpriteSet<SoarerSpecies> = {};
  for (const s of SOARER_SPECIES) {
    const c = colors.soarer[s];
    if (!c) continue;
    const art = SOARER_ART[s];
    out[s] = poseSprites(SOARER_VIEW, SOAR_PAD, width, dpr, SOARER_WING_POSES, (g, angle) => {
      for (const shape of art.body) paintShape(g, shape, c[shape.part]);
      rotated(g, art.pivot, angle, () => {
        for (const shape of art.wing) paintShape(g, shape, c[shape.part]);
      });
    });
  }
  return out;
}
