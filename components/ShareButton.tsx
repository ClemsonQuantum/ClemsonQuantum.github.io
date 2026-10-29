'use client';

import { useEffect, useRef, useState } from 'react';

// A small Share text button for the hosted event heroes (via MarkdownSpan's
// .share-button): it opens the phone's share sheet for the current page, and
// copies the page's link where there is none. The confirmation is announced
// politely from a region beside the button, which empties when the label
// comes back, so only the confirmation is spoken. Without scripts it can't
// work, so a <noscript> style hides it, as the Header does for its menu
// button.

const RESET_MS = 2000;

type Status = 'idle' | 'done' | 'failed';

function useStatus() {
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const flash = (next: Status) => {
    setStatus(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('idle'), RESET_MS);
  };
  return [status, flash] as const;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const NOSCRIPT = '.copy-button{display:none}';

export function ShareButton({ title, className = '' }: { title: string; className?: string }) {
  const [status, flash] = useStatus();
  const message = status === 'done' ? 'Link copied' : status === 'failed' ? 'Copy failed' : '';
  const onClick = async () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // Closing the sheet is not a failure; anything else falls back to copying.
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    flash((await copyText(url)) ? 'done' : 'failed');
  };
  return (
    <>
      <button
        type="button"
        className={`copy-button share-button ${className}`.trim()}
        aria-label={`Share ${title}`}
        onClick={onClick}
      >
        <span aria-hidden={message ? true : undefined}>{message || 'Share'}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
      <noscript>
        <style>{NOSCRIPT}</style>
      </noscript>
    </>
  );
}
