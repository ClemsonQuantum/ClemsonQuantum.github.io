// Cloud drawing shared by the Fall Fest hero sky (CloudSky.tsx) and the
// faint page-wide layer (PageClouds.tsx): a cloud is a handful of soft puffs,
// rendered ONCE to an offscreen sprite (radial-gradient edges, so no per-frame
// ctx.filter) and blitted every frame.

export interface Puff {
  dx: number; // px, relative to the cloud centre
  dy: number;
  r: number;
}

export interface CloudSprite {
  canvas: HTMLCanvasElement | null;
  w: number; // CSS px
  h: number;
}

/** 4–6 puffs about `base` px in radius: domed top, flatter base. */
export function makePuffs(base: number): Puff[] {
  const n = 4 + Math.floor(Math.random() * 3);
  // Puffs shrink toward the ends and sit lower.
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * 2 - 1; // -1..1 across the cloud
    return {
      dx: t * base * 1.4 + (Math.random() - 0.5) * base * 0.4,
      dy: -Math.abs(t) * base * 0.15 + (Math.random() - 0.7) * base * 0.35,
      r: base * (0.55 + Math.random() * 0.45) * (1 - Math.abs(t) * 0.35),
    };
  });
}

/** Draws the puffs in `rgb` ("r, g, b") at `alpha` onto a sprite at `dpr`. */
export function renderCloudSprite(
  puffs: Puff[],
  rgb: string,
  alpha: number,
  dpr: number,
): CloudSprite {
  const w = Math.ceil(Math.max(...puffs.map((p) => Math.abs(p.dx) + p.r)) * 2 + 8);
  const h = Math.ceil(Math.max(...puffs.map((p) => Math.abs(p.dy) + p.r)) * 2 + 8);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  const g = canvas.getContext('2d');
  if (!g) return { canvas: null, w, h };
  g.scale(dpr, dpr);
  g.translate(w / 2, h / 2);
  for (const p of puffs) {
    const grad = g.createRadialGradient(p.dx, p.dy, p.r * 0.2, p.dx, p.dy, p.r);
    grad.addColorStop(0, `rgba(${rgb}, ${alpha})`);
    grad.addColorStop(0.65, `rgba(${rgb}, ${alpha * 0.8})`);
    grad.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(p.dx, p.dy, p.r, 0, Math.PI * 2);
    g.fill();
  }
  return { canvas, w, h };
}
