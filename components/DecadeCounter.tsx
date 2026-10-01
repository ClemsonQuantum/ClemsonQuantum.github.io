'use client';

import { useEffect, useRef } from 'react';
import { watchActive } from '@/lib/animation';
import { bandOf, bandOnScreen, bandProgress } from './bandProgress';

// The "2016–2026" eyebrow on the Fall Fest band: as the band scrolls in, the
// end year counts up from the start year in step with the cryostat beside it
// (both read bandProgress.ts). MarkdownSpan renders it for
// <span class="qff-decade" data-from="2016" data-to="2026">. The server
// renders the finished range, screen readers always get the full range, and
// reduced motion keeps it still. Like the cryostat, a counter whose band is
// on screen when the page loads stays finished until it has left once.
export default function DecadeCounter({ from, to }: { from: number; to: number }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const yearRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const year = yearRef.current;
    if (!root || !year) return;
    const band = bandOf(root);
    let armed = false;
    let listening = false;
    let frame = 0;

    const measure = () => {
      frame = 0;
      if (!armed) {
        if (bandOnScreen(band)) return;
        armed = true;
      }
      const text = String(Math.round(from + bandProgress(band) * (to - from)));
      if (year.textContent !== text) year.textContent = text;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const listen = (on: boolean) => {
      if (on === listening) return;
      listening = on;
      if (on) {
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
      } else {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const stopWatching = watchActive(
      band,
      (active, reduced) => {
        if (reduced) {
          listen(false);
          year.textContent = String(to);
          return;
        }
        measure();
        listen(active);
      },
      '20% 0px',
    );
    return () => {
      stopWatching();
      listen(false);
      cancelAnimationFrame(frame);
    };
  }, [from, to]);

  return (
    <span ref={rootRef} className="qff-decade">
      <span aria-hidden="true">
        {from}–<span ref={yearRef}>{to}</span>
      </span>
      <span className="sr-only">
        {from}–{to}
      </span>
    </span>
  );
}
