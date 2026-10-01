'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, runWhileVisible } from '@/lib/animation';
import Hummingbird from './Hummingbird';
import { hoverBob, lean, smoothstep, type HummingbirdVariant } from './hummingbirdArt';

// The Fall Fest hummingbirds, free to roam the whole page. Each inline
// <span class="qff-bird-zone"> (at the end of a heading's eyebrow) is a home:
// its birds start in the empty space beside and above that line, hover and
// dart about, and every so often cruise off somewhere else, to a spot on
// screen or anywhere on the page.
//
// They keep apart. Each bird puts up with a few others close by (0 to
// ALLOW_MAX, rolled at random each time it stops); when more crowd in, it and
// the nearest one turn away from each other. Destinations favor empty space:
// a trip to the screen being read happens only while that screen holds fewer
// than its share of birds, and other trips head for the screen-tall stretch
// of page with the fewest, so most of the page has a bird somewhere instead
// of the flock gathering in one place. They stay out of the hero, whose sky
// has its own birds. The layer sits behind the page content (qff.css,
// "Roaming hummingbirds"), so a bird passes under text instead of covering
// it, and out of sight behind the dark band. MarkdownDiv
// renders it inside .qff-page. Motion runs only while the tab is visible and
// motion is allowed; with reduced motion each bird rests beside its home.

interface Home {
  count: number;
  variant: HummingbirdVariant;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Flyer {
  el: HTMLSpanElement;
  home: number;
  x: number; // px, top-left inside the layer
  y: number;
  dir: 1 | -1;
  mode: 'hover' | 'move';
  t: number; // s in this mode
  dur: number; // s the mode lasts
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  phase: number;
  allow: number; // other birds it puts up with close by
  cool: number; // s before it checks for crowding again
}

const GAP = 14; // px between a heading's text and its home patch
const HOME_RISE = 64; // px a home patch reaches above its line
const HOP = { x: 180, y: 120 }; // px reach of a nearby hop
const TRIP_ON_SCREEN = 0.2; // share of moves that cruise to a spot on screen
const TRIP_ANYWHERE = 0.06; // share that cruise to anywhere on the page
const LEAN = 0.16; // rad at mid-move
const NEAR = 140; // px between two birds that counts as close
const ALLOW_MAX = 2; // most others a bird puts up with close by
const TURN_COOL = 0.9; // s after turning away before a bird checks again
const TURN_REACH = { min: 180, max: 380 }; // px a bird flies off when it turns away
const SAMPLES = 8; // spots tried when picking where to go

function readHomes(page: Element): Home[] {
  return [...page.querySelectorAll('.qff-bird-zone:not(.qff-bird-zone--box)')].map((zone) => {
    const n = Number(zone.getAttribute('data-birds') ?? 1);
    return {
      count: Number.isInteger(n) ? Math.min(Math.max(n, 1), 4) : 1,
      variant: zone.getAttribute('data-variant') === 'lavender' ? 'lavender' : 'pink',
    };
  });
}

export default function PageBirds() {
  const rootRef = useRef<HTMLDivElement>(null);
  const birdRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);

  // The homes are in the page's markup; read them once it has mounted.
  useEffect(() => {
    const page = rootRef.current?.parentElement;
    if (page) setHomes(readHomes(page));
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const page = root?.parentElement;
    if (!root || !page || homes.length === 0) return;
    const layerEl = root;
    const pageEl = page;
    const zones = [...page.querySelectorAll('.qff-bird-zone:not(.qff-bird-zone--box)')];
    let width = 0;
    let height = 0;
    let birdW = 0;
    let birdH = 0;
    let patches: Rect[] = [];
    // The dark band, where a bird would vanish, and the hero, whose sky has
    // its own birds (CloudSky): no bird picks a spot in either.
    let offLimits: Rect[] = [];
    const flyers: Flyer[] = [];
    let elapsed = 0;

    const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
    const maxX = () => Math.max(0, width - birdW);
    const maxY = () => Math.max(0, height - birdH);
    const clampX = (x: number) => Math.min(Math.max(x, 0), maxX());
    const clampY = (y: number) => Math.min(Math.max(y, 0), maxY());

    // A home patch, in layer px: from the end of the heading's text to the
    // right edge of its column, and from a little above the line to its bottom.
    function measurePatch(zone: Element, layer: DOMRect): Rect {
      const z = zone.getBoundingClientRect();
      const line = zone.parentElement;
      const block = line?.getBoundingClientRect() ?? z;
      const column = line?.parentElement;
      const right = column
        ? column.getBoundingClientRect().right - parseFloat(getComputedStyle(column).paddingRight)
        : block.right;
      const left = Math.min(z.left + GAP, right - birdW - 20);
      return {
        left: left - layer.left,
        top: block.top - HOME_RISE - layer.top,
        right: right - birdW - layer.left,
        bottom: block.bottom - birdH - layer.top,
      };
    }

    function render(f: Flyer, tilt = 0, bob = 0) {
      f.el.style.transform =
        `translate(${f.x.toFixed(1)}px, ${(f.y + bob).toFixed(1)}px) ` +
        `scaleX(${f.dir}) rotate(${tilt.toFixed(3)}rad)`;
    }

    const rollAllow = () => Math.floor(Math.random() * (ALLOW_MAX + 1));

    function hover(f: Flyer) {
      f.mode = 'hover';
      f.t = 0;
      f.dur = rand(0.6, 2.2);
      f.allow = rollAllow();
    }

    const isOffLimits = (x: number, y: number) =>
      offLimits.some((r) => x + birdW > r.left && x < r.right && y + birdH > r.top && y < r.bottom);

    // Where another bird will be: where it's headed while it flies, else
    // where it is.
    const spotOf = (g: Flyer) => (g.mode === 'move' ? { x: g.x1, y: g.y1 } : { x: g.x, y: g.y });

    // Try a few spots and keep the best one: never behind the band or in the
    // hero (offLimits), within the bird's tolerance for company if any spot
    // is, and then the emptiest (spread) or the first that fits.
    function pickSpot(gen: () => [number, number], self: Flyer, spread: boolean) {
      let best: [number, number] | null = null;
      let bestScore = Infinity;
      for (let i = 0; i < SAMPLES; i++) {
        const [x, y] = gen();
        if (isOffLimits(x, y)) continue;
        let close = 0;
        let nearest = Infinity;
        for (const g of flyers) {
          if (g === self) continue;
          const s = spotOf(g);
          const d = Math.hypot(s.x - x, s.y - y);
          if (d < NEAR) close++;
          nearest = Math.min(nearest, d);
        }
        const over = Math.max(0, close - self.allow);
        const score = over * 1e6 + (spread ? -Math.min(nearest, 1e5) : i);
        if (score < bestScore) {
          bestScore = score;
          best = [x, y];
        }
      }
      return best;
    }

    // Short hops are quick darts, long trips a cruise.
    function flyTo(f: Flyer, x1: number, y1: number) {
      f.mode = 'move';
      f.t = 0;
      f.x0 = f.x;
      f.y0 = f.y;
      f.x1 = x1;
      f.y1 = y1;
      const dx = x1 - f.x0;
      const dist = Math.hypot(dx, y1 - f.y0);
      if (Math.abs(dx) > 4) f.dir = dx > 0 ? 1 : -1;
      f.dur = Math.max(0.3, dist / (dist < 90 ? 300 : Math.min(340, 140 + dist * 0.06)));
    }

    // Spots in the screen-tall slice of the page with the fewest birds (a
    // random one of the emptiest), so long trips fill the gaps. A slice that
    // is mostly hero or band doesn't count.
    function emptiestScreen(self: Flyer, vh: number): () => [number, number] {
      const n = Math.max(1, Math.ceil(height / vh));
      const counts = new Array<number>(n).fill(0);
      for (const g of flyers) {
        if (g !== self) counts[Math.min(n - 1, Math.max(0, Math.floor(spotOf(g).y / vh)))]++;
      }
      counts.forEach((_, i) => {
        const blocked = offLimits.reduce(
          (sum, r) => sum + Math.max(0, Math.min(r.bottom, (i + 1) * vh) - Math.max(r.top, i * vh)),
          0,
        );
        if (blocked > vh * 0.7) counts[i] = Infinity;
      });
      const least = Math.min(...counts);
      const slices = counts.flatMap((c, i) => (c === least ? [i] : []));
      const slice = slices[Math.floor(Math.random() * slices.length)];
      return () => [rand(0, maxX()), clampY(rand(slice * vh, (slice + 1) * vh - birdH))];
    }

    // Mostly short hops nearby; now and then a cruise to a spot on screen or
    // to the emptiest part of the page. A screen that already holds its
    // share of birds sends the trip to the emptiest part instead.
    function move(f: Flyer, top: number) {
      const vh = window.innerHeight;
      const roll = Math.random();
      let spot: [number, number] | null;
      if (roll < TRIP_ANYWHERE + TRIP_ON_SCREEN) {
        const onScreen = flyers.filter((g) => {
          if (g === f) return false;
          const s = spotOf(g);
          return s.y + birdH > -top && s.y < -top + vh;
        }).length;
        const share = Math.ceil((flyers.length * vh) / Math.max(height, vh));
        spot =
          roll < TRIP_ANYWHERE || onScreen >= share
            ? pickSpot(emptiestScreen(f, vh), f, true)
            : pickSpot(() => [rand(0, maxX()), clampY(rand(-top, -top + vh - birdH))], f, true);
      } else {
        spot = pickSpot(
          () => [clampX(f.x + rand(-HOP.x, HOP.x)), clampY(f.y + rand(-HOP.y, HOP.y))],
          f,
          false,
        );
      }
      const [x1, y1] = spot ?? [f.x, f.y];
      flyTo(f, x1, y1);
    }

    // Too many birds close by: fly off away from the nearest one, a little to
    // one side, to a spot that isn't crowded.
    function turnAway(f: Flyer, from: Flyer) {
      const dx = f.x - from.x;
      const dy = f.y - from.y;
      const away = Math.hypot(dx, dy) > 1 ? Math.atan2(dy, dx) : rand(0, Math.PI * 2);
      const spot = pickSpot(
        () => {
          const a = away + rand(-0.7, 0.7);
          const r = rand(TURN_REACH.min, TURN_REACH.max);
          return [clampX(f.x + Math.cos(a) * r), clampY(f.y + Math.sin(a) * r)];
        },
        f,
        true,
      );
      if (spot) flyTo(f, spot[0], spot[1]);
      f.cool = TURN_COOL;
    }

    function restAtHome(f: Flyer, i: number, ofHome: number) {
      const p = patches[f.home];
      f.x = clampX(p.left + ((p.right - p.left) * (i + 0.5)) / ofHome);
      f.y = clampY((p.top + p.bottom) / 2);
    }

    // Measure the layer, the birds and the homes. First time (or with
    // reduced motion) the birds are placed at home; after that a resize only
    // keeps them inside the layer.
    function layout(placeAtHome: boolean) {
      if (!root) return;
      const layer = root.getBoundingClientRect();
      width = layer.width;
      height = layer.height;
      const els = birdRefs.current.filter((el): el is HTMLSpanElement => el !== null);
      birdW = els[0]?.offsetWidth ?? 0;
      birdH = els[0]?.offsetHeight ?? 0;
      patches = zones.map((zone) => measurePatch(zone, layer));
      offLimits = [...pageEl.querySelectorAll('.qff-band, .qff-hero')].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          left: r.left - layer.left,
          top: r.top - layer.top,
          right: r.right - layer.left,
          bottom: r.bottom - layer.top,
        };
      });
      if (flyers.length === 0) {
        let k = 0;
        homes.forEach((home, h) => {
          for (let i = 0; i < home.count; i++, k++) {
            const el = els[k];
            if (!el) continue;
            flyers.push({
              el,
              home: h,
              x: 0,
              y: 0,
              dir: i % 2 === 0 ? 1 : -1,
              mode: 'hover',
              t: 0,
              dur: rand(0.3, 1.5),
              x0: 0,
              y0: 0,
              x1: 0,
              y1: 0,
              phase: Math.random() * Math.PI * 2,
              allow: rollAllow(),
              cool: 0,
            });
          }
        });
        placeAtHome = true;
      }
      const seen = new Map<number, number>();
      for (const f of flyers) {
        const i = seen.get(f.home) ?? 0;
        seen.set(f.home, i + 1);
        if (placeAtHome) restAtHome(f, i, homes[f.home]?.count ?? 1);
        f.x = clampX(f.x);
        f.y = clampY(f.y);
        if (f.mode === 'move') hover(f);
        render(f);
      }
      root.dataset.ready = '';
    }

    function step(dt: number) {
      // The layer's top in the viewport, for trips to a spot on screen.
      const top = layerEl.getBoundingClientRect().top;
      for (const f of flyers) {
        f.t += dt;
        if (f.mode === 'move') {
          const k = Math.min(1, f.t / f.dur);
          const e = smoothstep(k);
          f.x = f.x0 + (f.x1 - f.x0) * e;
          f.y = f.y0 + (f.y1 - f.y0) * e;
          render(f, lean(k, LEAN));
          if (k >= 1) hover(f);
        } else {
          render(f, 0, hoverBob(elapsed, f.phase));
          if (f.t >= f.dur) move(f, top);
        }
      }
      // Crowding: a bird with more others close by than it puts up with
      // turns away from the nearest, and that one turns away too.
      for (const f of flyers) f.cool = Math.max(0, f.cool - dt);
      for (const f of flyers) {
        if (f.cool > 0) continue;
        let close = 0;
        let nearest: Flyer | null = null;
        let nearestD = Infinity;
        for (const g of flyers) {
          if (g === f) continue;
          const d = Math.hypot(g.x - f.x, g.y - f.y);
          if (d >= NEAR) continue;
          close++;
          if (d < nearestD) {
            nearestD = d;
            nearest = g;
          }
        }
        if (nearest && close > f.allow) {
          turnAway(f, nearest);
          if (nearest.cool === 0) turnAway(nearest, f);
        }
      }
    }

    layout(true);

    const stop = runWhileVisible(
      root,
      (dt, t) => {
        elapsed = t;
        step(dt);
      },
      {
        // Reduced motion: put the birds back at their homes.
        onMotionChange: () => layout(true),
        // The CSS wing flutter runs only while this is set (qff.css).
        onRunningChange: (running) => root.toggleAttribute('data-flying', running),
      },
    );
    // The page grows and shrinks as rows open; keep the birds inside it
    // (with reduced motion, back beside their homes).
    const ro = new ResizeObserver(() => layout(prefersReducedMotion()));
    ro.observe(root);
    return () => {
      stop();
      ro.disconnect();
    };
  }, [homes]);

  let k = 0;
  return (
    <div ref={rootRef} className="qff-page-birds" aria-hidden="true">
      {homes.map((home, h) =>
        Array.from({ length: home.count }, (_, i) => {
          const index = k++;
          const variant: HummingbirdVariant =
            i % 2 === 0 ? home.variant : home.variant === 'pink' ? 'lavender' : 'pink';
          return (
            <span
              key={`${h}-${i}`}
              ref={(el) => {
                birdRefs.current[index] = el;
              }}
              className="qff-bird-zone__bird"
            >
              <Hummingbird variant={variant} />
            </span>
          );
        }),
      )}
    </div>
  );
}
