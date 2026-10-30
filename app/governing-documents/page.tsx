import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMetadata } from '@/lib/og';
import { formatDate } from '@/lib/dates.mjs';
import siteConfig from '@/data/site-config.json';
import PdfViewerToggle from '@/components/PdfViewerToggle';
import { getGoverningDocuments, governingDocumentsUpdated } from '@/lib/governingDocuments';

export const metadata: Metadata = pageMetadata({
  title: 'Governing Documents',
  description:
    'The Clemson Quantum Club Constitution, Bylaws, and Code of Conduct.',
  path: '/governing-documents/',
});

export default function GoverningDocumentsPage() {
  return (
    <article className="about-page">
      <header className="about-page__hero">
        <div className="about-page__hero-copy">
          <h1>Governing Documents</h1>
          <p className="about-page__tagline">
            Clemson&nbsp;Quantum&nbsp;Club is a Delegated Student Organization
            (DSO) at Clemson&nbsp;University, advised by Dr.&nbsp;Rong&nbsp;Ge
            of the School&nbsp;of&nbsp;Computing. These documents govern how the
            club is run. Official copies are also posted on&nbsp;TigerQuest.
          </p>
        </div>
      </header>

      <section className="about-page__section" aria-label="Documents">
        <ul className="gov-docs" role="list">
          {/* View PDF opens the document in a viewer below its row
              (PdfViewerToggle.tsx); a PDF that isn't uploaded yet shows
              "Coming soon" (lib/governingDocuments.ts). */}
          {getGoverningDocuments().map((doc) => {
            return (
              <li key={doc.title} id={doc.anchor} className="gov-docs__item">
                <div>
                  <h2 className="gov-docs__title">{doc.title}</h2>
                  <p className="gov-docs__desc">{doc.description}</p>
                </div>
                {!doc.isPdf ? (
                  <Link className="gov-docs__link" href={doc.href}>
                    View page
                    <span className="sr-only"> ({doc.title})</span>
                  </Link>
                ) : doc.available ? (
                  <PdfViewerToggle
                    className="gov-docs__link"
                    href={doc.href}
                    title={doc.title}
                    size={doc.size}
                    anchor={doc.anchor}
                  />
                ) : (
                  <span className="gov-docs__soon">Coming soon</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="gov-docs__footer">
          Last updated:{' '}
          <time dateTime={governingDocumentsUpdated}>
            {formatDate(governingDocumentsUpdated).replace(/ /g, '\u00a0')}
          </time>
          <span className="gov-docs__sep" aria-hidden="true">&nbsp;· </span>
          <a href={siteConfig.tigerquestUrl} target="_blank" rel="noopener noreferrer">
            View&nbsp;on&nbsp;TigerQuest
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </section>
    </article>
  );
}
