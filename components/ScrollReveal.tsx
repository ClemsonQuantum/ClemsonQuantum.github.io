'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { STAGGER_MS } from '@/lib/animation';

// Below-the-fold elements matching these component classes get a gentle
// fade-and-rise entrance as they scroll into view. Only component classes —
// never generic `.page-content` descendants, whose markdown-injected markup
// must not pick up layout side effects. The `.hackathon-*` classes are a
// deliberate opt-in exception: stable hand-authored HTML on hosted event
// pages.
// Keep in step with the "Scroll motion (site-wide)" lists in
// assets/css/style.css: this is their fallback for browsers without
// animation-timeline, so an element missing here never animates there.
const REVEAL_SELECTOR = [
  '.preview-card',
  '.home-section__header',
  '.board-member',
  '.about-page__section',
  '.about-page__photo',
  '.gi-channel',
  '.gi-schedule__item',
  '.faculty-card',
  '.lr-item',
  '.lr-ongoing__item',
  '.course-group',
  '.sw-item',
  '.hackathon-spec',
  '.hackathon-track',
  '.hackathon-team-member',
  '.hackathon-video',
  '.hackathon-schedule-day',
  '.hackathon-hotel',
  '.hackathon-sponsor-tier',
  '.hackathon-venue',
  '.hackathon-faq-item',
  '.qff-ledger-row',
  '.qff-day',
  '.qff-faq-item',
  '.qff-team-member',
  '.constellation-divider',
].join(', ');

// Sections whose rows reveal one by one; the CSS leaves the section itself
// still (style.css, "Scroll motion"), so the fallback does too.
const REVEAL_SKIP = '.about-page__section:has(.gi-schedule__item, .gi-channel)';

const STAGGER_CAP_MS = 240;

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    // The CSS is additionally wrapped in prefers-reduced-motion: no-preference;
    // bailing here means reduced-motion users never even get elements hidden.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Browsers with scroll-driven animations get the scroll-linked motion in
    // style.css ("Scroll motion") instead; this one-shot entrance is the
    // fallback for the rest, so the two never animate the same element.
    if (CSS.supports('animation-timeline: view()')) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries.filter((entry) => entry.isIntersecting);
        entering.forEach((entry, i) => {
          const el = entry.target as HTMLElement;
          el.style.setProperty(
            '--reveal-delay',
            `${Math.min(i * STAGGER_MS, STAGGER_CAP_MS)}ms`
          );
          el.classList.add('reveal-in');
          observer.unobserve(el);
        });
      },
      // The huge top margin makes anything at or above the viewport count as
      // intersecting, so a fast scroll or anchor jump that skips right past an
      // element still reveals it instead of leaving it permanently hidden.
      { threshold: 0.1, rootMargin: '100000px 0px -5% 0px' }
    );

    // Hide only elements below the current viewport, so nothing above the fold
    // flashes or animates on load and the page is fully visible without JS.
    // All rects are read before any class is written, so the page lays out
    // once instead of once per element.
    const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)).filter(
      (el) => !el.matches(REVEAL_SKIP),
    );
    const fold = window.innerHeight;
    const below = elements.filter((el) => el.getBoundingClientRect().top > fold);
    below.forEach((el) => {
      el.classList.add('reveal-init');
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
      // Never leave anything hidden across client-side navigations.
      elements.forEach((el) => el.classList.remove('reveal-init'));
    };
  }, [pathname]);

  return null;
}
