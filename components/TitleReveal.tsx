'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { STAGGER_MS, prefersReducedMotion } from '@/lib/animation';

// One-time "wave-function settle" entrance for page titles: the first h1 in
// <main> is split into per-word spans that either blur-settle or fade-rise
// into place (variant picked at random per page view), staggered by STAGGER_MS.
// Headless, like ScrollReveal: mutates the already-hydrated static h1 (React
// never re-renders these server-rendered titles), keyed on pathname so client
// navigations animate too. The full title is kept in an sr-only span and the
// SSR HTML stays plain text, so SEO and screen readers see the real heading.
// Bails on reduced motion, on titles that contain markup, and on titles with
// a hyphen, dash or slash.
//
// The first page's h1 has already painted from the static HTML by the time
// any effect runs, so splitting it would blank it and fade it back in. It is
// left whole (data-title-reveal="static") and the CSS fades it in with the
// first paint instead. Client navigations split before paint (layout effect).
let firstLoad = true;

export default function TitleReveal() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const first = firstLoad;
    firstLoad = false;
    if (prefersReducedMotion()) return;

    const h1 = document.querySelector<HTMLHeadingElement>('main h1');
    // Text-only titles only — splitting nested markup isn't worth the risk.
    if (!h1 || h1.dataset.titleReveal || h1.childElementCount > 0) return;
    const text = h1.textContent ?? '';
    if (!text.trim()) return;
    // Inline-block word spans can't break after a hyphen, dash or slash the
    // way the plain title can, so those titles keep their direct-load wrap
    // (the CSS fades them in whole instead).
    if (/[-\u2010\u2013/]/.test(text)) return;
    if (first) {
      h1.dataset.titleReveal = 'static';
      return;
    }

    h1.dataset.titleReveal = 'done';

    const variant = Math.random() < 0.5 ? 'tr-word--blur' : 'tr-word--fade';
    const fragment = document.createDocumentFragment();
    // The animated words are aria-hidden; this copy keeps the heading's real
    // text for assistive tech (the DecadeCounter pattern).
    const label = document.createElement('span');
    label.className = 'sr-only';
    label.textContent = text;
    fragment.appendChild(label);
    let wordIndex = 0;
    // A no-break space stays inside its word span, so the words it joins
    // never land on different lines.
    for (const part of text.split(/([^\S\u00a0]+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        fragment.appendChild(document.createTextNode(part));
        continue;
      }
      const span = document.createElement('span');
      span.className = `tr-word ${variant}`;
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--tr-delay', `${wordIndex * STAGGER_MS}ms`);
      span.textContent = part;
      fragment.appendChild(span);
      wordIndex += 1;
    }
    h1.replaceChildren(fragment);
  }, [pathname]);

  return null;
}
