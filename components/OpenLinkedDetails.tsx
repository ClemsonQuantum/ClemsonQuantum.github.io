'use client';

import { useEffect } from 'react';

// Opens the <details> row a same-page link points at, so "Challenge" in a Fall
// Fest session lands on that challenge already expanded. Works for a link
// clicked on the page (opened before the browser jumps, so the jump lands on
// the open row), an address that arrives with the #id, and back/forward.
// Renders nothing; MarkdownDiv mounts it with the .qff-challenges list.
function openTarget(hash: string): void {
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // A malformed escape (#%zz): look the id up as written.
  }
  const target = id ? document.getElementById(id) : null;
  const details = target?.closest('details');
  if (details && !details.open) details.open = true;
}

export default function OpenLinkedDetails() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (link) openTarget(link.getAttribute('href') ?? '');
    };
    const onHashChange = () => openTarget(location.hash);
    openTarget(location.hash);
    document.addEventListener('click', onClick, true);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);
  return null;
}
