import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/og';
import { formatDate } from '@/lib/dates.mjs';
import siteConfig from '@/data/site-config.json';
import governingDocuments from '@/data/governing-documents.json';

export const metadata: Metadata = pageMetadata({
  title: 'Governing Documents',
  description:
    'The Clemson Quantum Club Constitution, Bylaws, and Code of Conduct.',
  path: '/governing-documents/',
});

// PDFs live in public/documents/ under their exact filenames (spaces and
// all); the href in data/governing-documents.json is the readable path and
// encodeURI makes the link. A PDF that isn't there yet shows "Coming soon".
// Checked inside the component so `next dev` notices a newly added file on
// the next request; the static export checks once, at build time.
function pdfExists(href: string): boolean {
  return fs.existsSync(path.join(process.cwd(), 'public', href));
}

export default function GoverningDocumentsPage() {
  return (
    <article className="about-page">
      <header className="about-page__hero">
        <div className="about-page__hero-copy">
          <h1>Governing Documents</h1>
          <p className="about-page__tagline">
            Clemson Quantum Club is a Delegated Student Organization (DSO) at
            Clemson University, advised by Dr. Rong Ge of the School of
            Computing. These documents govern how the club is run. Official
            copies are also posted on TigerQuest.
          </p>
        </div>
      </header>

      <section className="about-page__section" aria-label="Documents">
        <ul className="gov-docs" role="list">
          {governingDocuments.documents.map((doc) => {
            const isPdf = doc.href.endsWith('.pdf');
            return (
              <li key={doc.title} className="gov-docs__item">
                <div>
                  <h2 className="gov-docs__title">{doc.title}</h2>
                  <p className="gov-docs__desc">{doc.description}</p>
                </div>
                {!isPdf ? (
                  <Link className="gov-docs__link" href={doc.href}>
                    View page
                    <span className="sr-only"> ({doc.title})</span>
                  </Link>
                ) : pdfExists(doc.href) ? (
                  <a
                    className="gov-docs__link"
                    href={encodeURI(doc.href)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View PDF
                    <span className="sr-only"> ({doc.title}, opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="gov-docs__soon">Coming soon</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="gov-docs__footer">
          Last updated:{' '}
          <time dateTime={governingDocuments.lastUpdated}>
            {formatDate(governingDocuments.lastUpdated)}
          </time>
          <span aria-hidden="true"> · </span>
          <a href={siteConfig.tigerquestUrl} target="_blank" rel="noopener noreferrer">
            View on TigerQuest
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </section>
    </article>
  );
}
