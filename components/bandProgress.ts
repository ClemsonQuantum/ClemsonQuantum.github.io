// Scroll progress of the Fall Fest band ("A decade on the cloud"), shared by
// everything that moves with it: the cryostat, the 2016–2026 counter, and the
// gradient phrase (through --band-p, which Cryostat sets on the band).
// 0 while the band's top is at or below the bottom of the window, 1 once its
// top is just under the sticky nav (END_GAP px below it; below the window's
// top edge on short screens, where the nav scrolls away). Measured from the
// window and the nav on every call, so it follows any screen size.

const END_GAP = 12; // px between the nav and the band's top at the finish

/** The band an element sits in (the element itself outside one). */
export function bandOf(el: Element): Element {
  return el.closest('.qff-band') ?? el;
}

export function bandProgress(band: Element): number {
  const vh = window.innerHeight;
  const top = band.getBoundingClientRect().top;
  const nav = document.querySelector('.nav');
  const end = Math.max(0, nav?.getBoundingClientRect().bottom ?? 0) + END_GAP;
  return Math.min(1, Math.max(0, (vh - top) / Math.max(1, vh - end)));
}

/** Whether the band is anywhere on screen. */
export function bandOnScreen(band: Element): boolean {
  const r = band.getBoundingClientRect();
  return r.top < window.innerHeight && r.bottom > 0;
}
