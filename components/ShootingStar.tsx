'use client';

import { useEffect, useRef } from 'react';

const MIN_DELAY_MS = 12000; // spawn cadence averages ~15 s
const MAX_DELAY_MS = 18000;
const CLEANUP_MS = 3000; // > animation duration; also catches never-started runs

// Occasional "paw comet" for the dark-mode sky: a tiny tiger-paw head with a
// gradient tail streaks across the viewport roughly every 15 seconds, at a
// random position and heading. Headless spawner — renders one fixed,
// pointer-transparent layer and appends a short-lived streak node per cycle.
// Spawning skips in light mode, hidden tabs, and under reduced motion (the
// streak CSS is additionally gated behind the same media queries).
export default function ShootingStar() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timeoutId = 0;
    const cleanupIds = new Set<number>();

    function spawn() {
      if (darkQuery.matches && !motionQuery.matches && !document.hidden && layer) {
        const star = document.createElement('div');
        star.className = 'shooting-star';
        star.style.setProperty('--ss-x', `${5 + Math.random() * 70}vw`);
        star.style.setProperty('--ss-y', `${4 + Math.random() * 62}vh`);
        star.style.setProperty('--ss-angle', `${Math.round(Math.random() * 360)}deg`);
        layer.appendChild(star);
        // Timed removal instead of animationend: still cleans up if the
        // animation never runs (scheme/motion flipped mid-cycle). Tracked so
        // unmount doesn't leave a dangling timer.
        cleanupIds.add(
          window.setTimeout(() => star.remove(), CLEANUP_MS)
        );
      }
      timeoutId = window.setTimeout(
        spawn,
        MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)
      );
    }

    timeoutId = window.setTimeout(
      spawn,
      MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS)
    );

    return () => {
      window.clearTimeout(timeoutId);
      for (const id of cleanupIds) window.clearTimeout(id);
    };
  }, []);

  return <div ref={layerRef} className="shooting-star-layer" aria-hidden="true" />;
}
