'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { prefersReducedMotion } from '@/lib/animation';

// Site search results open `page/?q=<query>` (SearchBar). On arrival this
// finds the query in the page content, opens a closed <details> row or a
// collapsed list that hides it, scrolls the first match to the middle of the
// window, and highlights every match through the CSS Custom Highlight API.
// The highlight is a Range overlay, not markup, so React-owned text is never
// touched. It clears on the next click or key press. Renders nothing; the
// root layout mounts it inside <Suspense> (useSearchParams needs one).

const HIGHLIGHT = 'search-hit';
// The search scope is <main>, so the site header and footer are already out.
const SKIP = 'script, style, noscript, svg, canvas, [aria-hidden="true"], .sr-only';

// The highlight's color. It is added from here, not style.css, because Next's
// CSS parser does not know ::highlight() yet and warned on every build (the
// rule did pass through). The accent token follows the page, so Fall Fest
// gets its own magenta.
const HIGHLIGHT_STYLE_ID = 'search-hit-style';
function addHighlightStyle() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `::highlight(${HIGHLIGHT}) { background-color: rgba(var(--color-accent-rgb), 0.28); }`;
  document.head.append(style);
}

// Content keeps names, times and ranges together with no-break spaces, no-break
// hyphens and word joiners; a typed query has plain spaces and hyphens.
function normalize(text: string): { flat: string; map: number[] } {
  let flat = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    // A typographic apostrophe matches a typed one (SearchBar folds the same).
    const c = text[i] === '’' || text[i] === '‘' ? "'" : text[i];
    if (c === '⁠') continue;
    flat += c === ' ' || c === ' ' ? ' ' : c === '‑' ? '-' : c.toLowerCase();
    map.push(i);
  }
  return { flat, map };
}

function findRanges(root: Element, needle: string): Range[] {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? '';
    if (!text.trim() || node.parentElement?.closest(SKIP)) continue;
    const { flat, map } = normalize(text);
    for (let at = flat.indexOf(needle); at !== -1; at = flat.indexOf(needle, at + needle.length)) {
      const range = document.createRange();
      range.setStart(node, map[at]);
      range.setEnd(node, map[at + needle.length - 1] + 1);
      ranges.push(range);
    }
  }
  return ranges;
}

// Opens what hides the match: closed <details> rows (Fall Fest sessions and
// challenges, FAQs) and lists collapsed behind an aria-controls toggle (the
// About page's past board). Returns true if anything changed.
function reveal(node: Node): boolean {
  let changed = false;
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (el instanceof HTMLDetailsElement && !el.open) {
      el.open = true;
      changed = true;
    }
    if (el.hidden && el.id) {
      const toggle = document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(el.id)}"][aria-expanded="false"]`);
      if (toggle) {
        toggle.click();
        changed = true;
      }
    }
  }
  return changed;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export default function SearchHighlight() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // A pasted or phone-typed ?q= can carry ’ or a no-break hyphen; fold it
  // the way normalize() folds the page text.
  const query = searchParams.get('q')?.trim().toLowerCase().replace(/[‘’]/g, "'").replace(/‑/g, '-') ?? '';

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    const clear = () => {
      if (typeof CSS !== 'undefined' && 'highlights' in CSS) CSS.highlights.delete(HIGHLIGHT);
    };

    (async () => {
      // Let the page render and any #hash jump finish first.
      await nextFrame();
      await nextFrame();
      if (cancelled) return;
      const root = document.querySelector('main') ?? document.body;
      // The whole query first, then its words, longest first.
      const words = query.split(/\s+/).filter((w) => w.length > 1).sort((a, b) => b.length - a.length);
      let ranges: Range[] = [];
      for (const needle of [query, ...words]) {
        ranges = findRanges(root, needle);
        if (ranges.length) break;
      }
      // The first match that is (or can be made) visible; a match inside
      // something hidden by CSS alone, such as a phone-only copy, is skipped.
      let box: DOMRect | null = null;
      let hit: Range | null = null;
      for (const range of ranges.slice(0, 20)) {
        if (reveal(range.startContainer)) {
          await nextFrame();
          await nextFrame();
          if (cancelled) return;
        }
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          box = rect;
          hit = range;
          break;
        }
      }
      if (!box || !hit) return;
      window.scrollTo({
        top: window.scrollY + box.top - window.innerHeight / 2 + box.height / 2,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      // A keyboard pick leaves focus in the header's search box (on the page
      // body once the phone drawer closes), so the next Tab would jump back
      // to the top. Focus the match instead: its link or <summary>, else its
      // block, which tabindex -1 keeps out of the Tab order.
      const at = hit.startContainer.parentElement;
      const target =
        at?.closest<HTMLElement>('a[href], summary') ??
        at?.closest<HTMLElement>('p, li, dt, dd, td, th, h1, h2, h3, h4, figcaption');
      if (target) {
        if (!target.matches('a[href], summary') && !target.hasAttribute('tabindex')) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
      if (typeof Highlight !== 'undefined' && 'highlights' in CSS) {
        addHighlightStyle();
        CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges));
      }
    })();

    window.addEventListener('pointerdown', clear, { once: true });
    window.addEventListener('keydown', clear, { once: true });
    return () => {
      cancelled = true;
      clear();
      window.removeEventListener('pointerdown', clear);
      window.removeEventListener('keydown', clear);
    };
  }, [query, pathname]);

  return null;
}
