import type { Metadata } from 'next';

// Next replaces (not merges) the root layout's openGraph when a page declares
// its own, so every page-level object must re-carry the shared fields.
// LinkedIn in particular needs image width/height to render a large card.
export function pageOpenGraph(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
}): NonNullable<Metadata['openGraph']> {
  return {
    title: opts.title,
    description: opts.description,
    url: opts.url,
    siteName: 'Clemson Quantum Club',
    locale: 'en_US',
    type: 'website',
    images: opts.image
      ? [opts.image]
      : [
          {
            url: '/images/og-card.png',
            width: 1200,
            height: 630,
            alt: 'Clemson Quantum Club logo over a starfield',
          },
        ],
  };
}
