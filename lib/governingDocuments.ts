import fs from 'node:fs';
import path from 'node:path';
import governingDocuments from '@/data/governing-documents.json';

export interface GoverningDocument {
  title: string;
  description: string;
  /** The readable path from data/governing-documents.json. */
  href: string;
  /** The row's id on /governing-documents/ ("constitution"), which About
   *  links to so that document's viewer opens on arrival. */
  anchor: string;
  /** A PDF in public/documents/ rather than a site page. */
  isPdf: boolean;
  /** False for a PDF that isn't uploaded yet: show "Coming soon". */
  available: boolean;
  /** An uploaded PDF's size for its button, "120 KB" or "1.4 MB"; else null. */
  size: string | null;
}

// Decimal units, as Finder shows file sizes. The unit follows the rounded
// value, so 999,700 bytes reads "1.0 MB", not "1000 KB".
function fileSize(bytes: number): string {
  const kb = Math.round(bytes / 1000);
  return kb < 1000 ? `${Math.max(1, kb)}\u00a0KB` : `${(bytes / 1_000_000).toFixed(1)}\u00a0MB`;
}

// The Constitution, Bylaws and Code of Conduct, for the Governing Documents
// page and the About page. PDFs live in public/documents/ under their exact
// filenames (spaces and all); callers link with encodeURI(href). Read on each
// call so `next dev` notices a newly added file on the next request; the
// static export checks once, at build time.
export function getGoverningDocuments(): GoverningDocument[] {
  return governingDocuments.documents.map((doc) => {
    const isPdf = doc.href.endsWith('.pdf');
    const file = path.join(process.cwd(), 'public', doc.href);
    // An empty file (a placeholder made by hand) counts as not uploaded yet.
    const stat = isPdf && fs.existsSync(file) ? fs.statSync(file) : null;
    const uploaded = stat !== null && stat.size > 0;
    return {
      ...doc,
      anchor: doc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      isPdf,
      available: !isPdf || uploaded,
      size: uploaded ? fileSize(stat.size) : null,
    };
  });
}

export const governingDocumentsUpdated = governingDocuments.lastUpdated;
