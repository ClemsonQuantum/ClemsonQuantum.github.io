'use client';

import { useId, useState, useSyncExternalStore } from 'react';

// "View PDF" on the Governing Documents rows. Pressing it opens the PDF in the
// browser's own viewer right below its row, like the papers on the
// student-work pages, and pressing it again closes it; the frame loads only
// once opened. A link to the row's anchor (About's View PDF links to
// /governing-documents/#constitution) arrives with that viewer already
// open. Under it, "Open in a new tab" and "Download" cover phones whose
// browsers don't show PDFs inside a page.
// Before the page's scripts run (and with them off) it is the plain link it
// replaces, which opens the PDF in a new tab.
//
// It renders the button and the panel as two siblings, so the row (a
// wrapping flex line) puts the panel on a line of its own under the button.

const noSubscribe = () => () => {};
const onHashChange = (callback: () => void) => {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
};

export default function PdfViewerToggle({
  href,
  title,
  size,
  anchor,
  className,
}: {
  /** The PDF's site path, e.g. "/documents/Clemson Quantum Club Bylaws.pdf". */
  href: string;
  /** The document's name, for screen readers and the frame's title. */
  title: string;
  /** "195 KB", shown on the closed button. */
  size: string | null;
  /** The row's id: a link to #anchor opens this viewer. */
  anchor?: string;
  /** The row's own button or link classes. */
  className: string;
}) {
  // False on the server and during hydration, true once scripts run.
  const live = useSyncExternalStore(noSubscribe, () => true, () => false);
  // Linked to directly (#anchor), the viewer starts open; once pressed, the
  // reader's own choice wins.
  const linked = useSyncExternalStore(
    onHashChange,
    () => Boolean(anchor) && window.location.hash === `#${anchor}`,
    () => false,
  );
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? linked;
  const panelId = useId();
  const url = encodeURI(href);
  const label = `View PDF${size ? ` (${size})` : ''}`;

  if (!live) {
    return (
      <a className={className} href={url} target="_blank" rel="noopener noreferrer">
        {label}
        <span className="sr-only"> ({title}, opens in a new tab)</span>
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setChoice(!open)}
      >
        {open ? 'Close PDF' : label}
        <span className="sr-only"> ({title})</span>
      </button>
      <div id={panelId} className="pdf-panel" hidden={!open}>
        {open && (
          <>
            <div className="pdf-panel__frame-box">
              {/* #navpanes=0 opens Chrome's viewer with its thumbnail sidebar
                  closed, as on the student-work pages. */}
              <iframe className="pdf-panel__frame" src={`${url}#navpanes=0`} title={`${title} (PDF)`} />
            </div>
            <p className="pdf-panel__links">
              <a href={url} target="_blank" rel="noopener noreferrer">
                Open in a new tab<span className="sr-only"> ({title})</span>
              </a>
              <span aria-hidden="true"> · </span>
              <a href={url} download>
                Download<span className="sr-only"> {title}</span>
              </a>
            </p>
          </>
        )}
      </div>
    </>
  );
}
