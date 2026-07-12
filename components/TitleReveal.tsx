'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const STAGGER_MS = 69;

// One-time "wave-function settle" entrance for page titles: the first h1 in
// <main> is split into per-word spans that either blur-settle or fade-rise
// into place (variant picked at random per page view), staggered 69 ms apart.
// Headless, like ScrollReveal: mutates the already-hydrated static h1 (React
// never re-renders these server-rendered titles), keyed on pathname so client
// navigations animate too. The full title is preserved in aria-label and the
// SSR HTML stays plain text, so SEO and screen readers see the real heading.
// Bails on reduced motion and on titles that contain markup.
export default function TitleReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const h1 = document.querySelector<HTMLHeadingElement>('main h1');
    // Text-only titles only — splitting nested markup isn't worth the risk.
    if (!h1 || h1.dataset.titleReveal || h1.childElementCount > 0) return;
    const text = h1.textContent ?? '';
    if (!text.trim()) return;

    h1.dataset.titleReveal = 'done';
    h1.setAttribute('aria-label', text);

    const variant = Math.random() < 0.5 ? 'tr-word--blur' : 'tr-word--fade';
    const fragment = document.createDocumentFragment();
    let wordIndex = 0;
    for (const part of text.split(/(\s+)/)) {
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
