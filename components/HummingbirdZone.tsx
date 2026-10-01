'use client';

import { useEffect, useRef } from 'react';
import { runWhileVisible } from '@/lib/animation';
import Hummingbird from './Hummingbird';
import { hoverBob, lean, smoothstep, type HummingbirdVariant } from './hummingbirdArt';

// A boxed patch where a few hummingbirds fly around: each hovers, then darts
// or cruises to another point in the patch, turning to face the way it goes.
// MarkdownSpan renders it for <span class="qff-bird-zone qff-bird-zone--box">,
// which qff.css positions inside a picture (the hero's sky tile, the cryostat
// drawing). The other hummingbirds roam the whole page (PageBirds).
// Birds that don't fit (each needs about 4,000 px² of patch) stay out. Motion
// runs only while the patch is on screen, the tab is visible, and motion is
// allowed; with reduced motion the birds are placed once and stay still.

interface Flyer {
  el: HTMLSpanElement;
  x: number; // px, top-left inside the patch
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
}

const PER_BIRD = 4000; // px² of patch each bird needs
const LEAN = 0.16; // rad at mid-move

export default function HummingbirdZone({
  count = 1,
  variant = 'pink',
  className = '',
}: {
  count?: number;
  /** Colour of the first bird; the rest alternate. */
  variant?: HummingbirdVariant;
  className?: string;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const areaRef = useRef<HTMLSpanElement>(null);
  const birdRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const area = areaRef.current;
    if (!root || !area) return;
    let width = 0;
    let height = 0;
    let birdW = 0;
    let birdH = 0;
    let flyers: Flyer[] = [];
    let elapsed = 0;

    const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
    const maxX = () => Math.max(0, width - birdW);
    const maxY = () => Math.max(0, height - birdH);

    function render(f: Flyer, tilt = 0, bob = 0) {
      f.el.style.transform =
        `translate(${f.x.toFixed(1)}px, ${(f.y + bob).toFixed(1)}px) ` +
        `scaleX(${f.dir}) rotate(${tilt.toFixed(3)}rad)`;
    }

    function hover(f: Flyer) {
      f.mode = 'hover';
      f.t = 0;
      f.dur = rand(0.6, 2.2);
    }

    // Short hops are quick darts; long ones a slower cruise.
    function move(f: Flyer) {
      f.mode = 'move';
      f.t = 0;
      f.x0 = f.x;
      f.y0 = f.y;
      f.x1 = rand(0, maxX());
      f.y1 = rand(0, maxY());
      const dx = f.x1 - f.x0;
      const dist = Math.hypot(dx, f.y1 - f.y0);
      if (Math.abs(dx) > 4) f.dir = dx > 0 ? 1 : -1;
      f.dur = Math.max(0.3, dist / (dist < 90 ? 300 : 140));
    }

    function layout() {
      if (!root || !area) return;
      const r = area.getBoundingClientRect();
      width = r.width;
      height = r.height;
      const els = birdRefs.current.filter((el): el is HTMLSpanElement => el !== null);
      // Measure with every bird shown (a hidden one measures 0), then hide
      // the ones that don't fit.
      els.forEach((el) => {
        el.hidden = false;
      });
      birdW = els[0]?.offsetWidth ?? 0;
      birdH = els[0]?.offsetHeight ?? 0;
      const fit =
        width >= birdW + 20 ? Math.max(1, Math.floor((width * Math.max(height, birdH)) / PER_BIRD)) : 0;
      const n = Math.min(count, fit);
      els.forEach((el, i) => {
        el.hidden = i >= n;
      });
      const keep = flyers.slice(0, n);
      flyers = els.slice(0, n).map((el, i) => {
        // Spread out across the patch; keep a bird where it was if it still fits.
        const old = keep[i];
        const f: Flyer = old ?? {
          el,
          x: (maxX() * (i + 0.5)) / n,
          y: maxY() / 2,
          dir: i % 2 === 0 ? 1 : -1,
          mode: 'hover',
          t: 0,
          dur: rand(0.3, 1.5),
          x0: 0,
          y0: 0,
          x1: 0,
          y1: 0,
          phase: Math.random() * Math.PI * 2,
        };
        f.x = Math.min(f.x, maxX());
        f.y = Math.min(f.y, maxY());
        if (f.mode === 'move') hover(f);
        render(f);
        return f;
      });
      root.dataset.ready = '';
    }

    function step(dt: number) {
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
          if (f.t >= f.dur) move(f);
        }
      }
    }

    layout();

    const stop = runWhileVisible(
      root,
      (dt, t) => {
        elapsed = t;
        step(dt);
      },
      {
        rootMargin: '10% 0px',
        // Reduced motion: put the birds back in their resting places.
        onMotionChange: layout,
        // The CSS wing flutter runs only while this is set (qff.css).
        onRunningChange: (running) => root.toggleAttribute('data-flying', running),
      },
    );
    const ro = new ResizeObserver(layout);
    ro.observe(root);
    // Phones fire resize when the toolbar collapses; only a width change
    // can move the patch (the ResizeObserver covers the rest).
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      layout();
    };
    window.addEventListener('resize', onResize);
    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [count]);

  const other: HummingbirdVariant = variant === 'pink' ? 'lavender' : 'pink';
  return (
    <span
      ref={rootRef}
      className={`qff-bird-zone qff-bird-zone--box${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <span ref={areaRef} className="qff-bird-zone__area">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              birdRefs.current[i] = el;
            }}
            className="qff-bird-zone__bird"
          >
            <Hummingbird variant={i % 2 === 0 ? variant : other} />
          </span>
        ))}
      </span>
    </span>
  );
}
