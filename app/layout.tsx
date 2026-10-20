import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Source_Sans_3,
  Source_Serif_4,
  Space_Grotesk,
} from 'next/font/google';
import '../assets/css/style.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';
import SearchHighlight from '@/components/SearchHighlight';
import ShootingStar from '@/components/ShootingStar';
import TitleReveal from '@/components/TitleReveal';
import { getNavData } from '@/lib/navData';
import { pageOpenGraph } from '@/lib/og';
import { CHANNELS, SITE_DESCRIPTION, SITE_URL } from '@/lib/site';

// Headings. Source Serif 4 is Adobe's companion to Source Sans 3 and the
// closest free match to Clemson's brand serif (Tiempos). Variable font with
// the optical-size axis, so titles get crisper display shapes and small
// headings sturdier text shapes automatically.
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  axes: ['opsz'],
});

// Variable font: no `weight` list, so the full 200–900 axis is available
// (the countdown digits use 800, which a fixed-weight font would not load).
const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
});

// IBM Plex: the Qiskit Fall Fest page's brand type. preload: false because
// only .qff-page rules reference these variables — the @font-face registers
// site-wide, but browsers fetch the files only on pages whose CSS uses them.
// Variable font, so no `weight` list: one set of files covers 100–700.
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-plex-sans',
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-plex-mono',
  preload: false,
});

// Space Grotesk: the SC Quantathon page titles only (.hackathon-hero-text
// h1). preload: false, so pages without that title never fetch it.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  preload: false,
});

export const metadata: Metadata = {
  title: {
    template: '%s | Clemson Quantum Club',
    default: 'Clemson Quantum Club',
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: './' },
  // app/manifest.ts; Next emits it as /manifest.webmanifest.
  manifest: '/manifest.webmanifest',
  verification: {
    // Google Search Console ownership proof — must stay even after
    // verification succeeds or the property gets unverified.
    google: 'LezK32umlm6oHpQDVC1UaFQhP8baavYfFI1T9G2_qU0',
  },
  openGraph: pageOpenGraph({
    title: 'Clemson Quantum Club',
    description: SITE_DESCRIPTION,
    url: '/',
  }),
  icons: {
    // The club logo, site-wide: Google shows this mark in results.
    // The .ico frames are exact downscales of favicon-512.png so every size
    // shows the mark at the same relative scale. favicon.ico at the site root
    // is what Google/crawlers prefer; the PNG provides a high-res variant.
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  // Native scrollbars and form controls follow the page's light/dark theme.
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f3ee' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
};

// Organization JSON-LD: gives search engines an authoritative logo signal so
// the mark shows up in result branding (Google reads Organization.logo). It
// is the plain logo, not the og-card share image. sameAs lists profile pages
// only, so no chat invite links.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Clemson Quantum Club',
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo-light.png`,
  sameAs: CHANNELS.filter(({ id }) => id !== 'discord' && id !== 'groupme').map(({ href }) => href),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navData = getNavData();

  return (
    <html lang="en">
      <head>
        {/* Content-Security-Policy is emitted only in production builds: the
            dev server needs eval for hot-reload, so a strict CSP would break it.
            GitHub Pages can't send HTTP headers, so a <meta> tag is used.
            Allows: self for everything, Web3Forms for form submits and published
            Google Sheets for the live leaderboards (connect-src; a published
            sheet redirects to googleusercontent.com), YouTube for the embedded
            video and OpenStreetMap map embeds (frame-src; Apple Maps is a plain link). 'unsafe-inline' is
            required for Next's inline hydration scripts and inline styles. */}
        {process.env.NODE_ENV === 'production' && (
          <meta
            httpEquiv="Content-Security-Policy"
            content="default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: https:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.web3forms.com https://docs.google.com https://*.googleusercontent.com; frame-src 'self' https://www.youtube-nocookie.com https://www.openstreetmap.org; form-action 'self' mailto:"
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body
        className={`${sourceSans.variable} ${sourceSerif.variable} ${plexSans.variable} ${plexMono.variable} ${spaceGrotesk.variable}`}
      >
        <a href="#main" className="skip-link">Skip to main content</a>
        <Header navData={navData} />
        <main id="main">{children}</main>
        <Footer />
        <ScrollReveal />
        <TitleReveal />
        <ShootingStar />
        {/* Search results open page/?q=…; this scrolls to and highlights the
            match. useSearchParams needs the Suspense boundary in a static export. */}
        <Suspense fallback={null}>
          <SearchHighlight />
        </Suspense>
      </body>
    </html>
  );
}
