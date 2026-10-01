import type { Metadata } from 'next';

const SITE_NAME = 'Clemson Quantum Club';

export interface OgImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

// The share card for every page without an image of its own.
const DEFAULT_OG_IMAGE: OgImage = {
  url: '/images/og-card.png',
  width: 1200,
  height: 630,
  alt: 'Clemson Quantum Club logo over a starfield',
};

// Event banners (front-matter `image` on hosted event pages and the homepage
// featured band) are 16:9 at this size.
export const BANNER_SIZE = { width: 1200, height: 675 };

// Next replaces (not merges) the root layout's openGraph when a page declares
// its own, so every page-level object must re-carry the shared fields.
// LinkedIn in particular needs image width/height to render a large card. A
// page's own image carries no alt: the only text on hand is the page title,
// which og:title already gives.
export function pageOpenGraph(opts: {
  title: string;
  description: string;
  url: string;
  image?: OgImage;
}): NonNullable<Metadata['openGraph']> {
  return {
    title: opts.title,
    description: opts.description,
    url: opts.url,
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
    images: [opts.image ?? DEFAULT_OG_IMAGE],
  };
}

/**
 * A page's title, description and Open Graph tags from one set of values.
 * `title` goes through the root layout's "%s | Clemson Quantum Club"
 * template; Next doesn't apply that template to openGraph, so og:title gets
 * the same suffix here.
 */
export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: OgImage;
}): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    openGraph: pageOpenGraph({
      title: `${opts.title} | ${SITE_NAME}`,
      description: opts.description,
      url: opts.path,
      image: opts.image,
    }),
  };
}
