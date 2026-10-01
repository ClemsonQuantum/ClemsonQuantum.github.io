// Tuning constants and the run-or-pause gate shared by the decorative canvas,
// scroll-driven and entrance components.

// Cap on the canvas backing-store scale: above 2x the extra pixels cost fill
// rate on high-DPI phones with no visible gain (QuantumCanvas, CloudSky).
export const MAX_DPR = 2;

// Delay between successive items in a staggered entrance, in milliseconds
// (ScrollReveal cards, TitleReveal words).
export const STAGGER_MS = 60;

// Longest step a frame may advance, in seconds, so the first frame after a
// stall (a long task, a throttled tab) doesn't make everything jump.
const MAX_FRAME_DT = 0.05;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** The visitor's reduced-motion preference right now. Browser only. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION).matches;
}

/**
 * Report whether a component is worth running. `active` is true while `el`
 * is on screen (IntersectionObserver with `rootMargin`) and the tab is
 * visible; `reduced` is the reduced-motion preference, kept separate because
 * not everything stops for it (a leaderboard keeps refreshing). Pass null
 * for an element that is on screen whenever it is mounted, such as a fixed
 * full-screen canvas: only the tab gates it then.
 *
 * onChange runs once right away (inactive until the observer's first
 * report) and again whenever either value may have changed. Returns the
 * cleanup, for a useEffect.
 */
export function watchActive(
  el: Element | null,
  onChange: (active: boolean, reduced: boolean) => void,
  rootMargin = '0px',
): () => void {
  const motion = window.matchMedia(REDUCED_MOTION);
  let onScreen = el === null;
  const report = () => onChange(onScreen && !document.hidden, motion.matches);
  const observer = el
    ? new IntersectionObserver(
        (entries) => {
          onScreen = entries[entries.length - 1]?.isIntersecting ?? onScreen;
          report();
        },
        { rootMargin },
      )
    : null;
  if (el && observer) observer.observe(el);
  document.addEventListener('visibilitychange', report);
  motion.addEventListener('change', report);
  report();
  return () => {
    observer?.disconnect();
    document.removeEventListener('visibilitychange', report);
    motion.removeEventListener('change', report);
  };
}

/**
 * Call onFrame(dt, elapsed) on animation frames while `target` is active
 * (see watchActive) and motion is allowed. `dt` is the seconds since the
 * previous frame, 0 on the first frame after a start or resume and at most
 * MAX_FRAME_DT; `elapsed` sums them, so it stands still while paused.
 *
 * Options:
 *   rootMargin      passed to watchActive
 *   frameMs         skip a frame that comes sooner than this after the last
 *                   one (the next dt spans the skipped time). A function is
 *                   read on every frame, for a cap that changes.
 *   onMotionChange  the reduced-motion preference changed (not called at
 *                   start): redraw the still frame, or reseed for motion
 *   onRunningChange the loop started or stopped
 *
 * Returns the cleanup, for a useEffect.
 */
export function runWhileVisible(
  target: Element | null,
  onFrame: (dt: number, elapsed: number) => void,
  {
    rootMargin,
    frameMs = 0,
    onMotionChange,
    onRunningChange,
  }: {
    rootMargin?: string;
    frameMs?: number | (() => number);
    onMotionChange?: (reduced: boolean) => void;
    onRunningChange?: (running: boolean) => void;
  } = {},
): () => void {
  const minGap = typeof frameMs === 'function' ? frameMs : () => frameMs;
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let running = false;
  let reduced: boolean | null = null;

  function tick(time: number) {
    raf = 0;
    if (!last || time - last >= minGap()) {
      const dt = last ? Math.min((time - last) / 1000, MAX_FRAME_DT) : 0;
      last = time;
      elapsed += dt;
      onFrame(dt, elapsed);
    }
    // onFrame may have stopped the loop (an unmount during the frame).
    if (running && !raf) raf = requestAnimationFrame(tick);
  }

  function setRunning(next: boolean) {
    if (next === running) return;
    running = next;
    if (next) {
      last = 0;
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    onRunningChange?.(next);
  }

  const stopWatching = watchActive(
    target,
    (active, isReduced) => {
      const changed = reduced !== null && isReduced !== reduced;
      reduced = isReduced;
      if (changed) onMotionChange?.(isReduced);
      setRunning(active && !isReduced);
    },
    rootMargin,
  );
  return () => {
    stopWatching();
    running = false;
    cancelAnimationFrame(raf);
  };
}
