'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Below-the-fold elements matching these component classes get a gentle
// fade-and-rise entrance as they scroll into view. Only component classes —
// never `.page-content` descendants, whose markdown-injected markup must not
// pick up layout side effects.
const REVEAL_SELECTOR = [
  '.preview-card',
  '.home-section__header',
  '.board-member',
  '.about-page__section',
  '.gi-channel',
  '.faculty-card',
].join(', ');

const STAGGER_MS = 60;
const STAGGER_CAP_MS = 240;

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    // The CSS is additionally wrapped in prefers-reduced-motion: no-preference;
    // bailing here means reduced-motion users never even get elements hidden.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

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
    const elements = document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
    elements.forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add('reveal-init');
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
      // Never leave anything hidden across client-side navigations.
      elements.forEach((el) => el.classList.remove('reveal-init'));
    };
  }, [pathname]);

  return null;
}
