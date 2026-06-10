import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getNavData } from '@/lib/navData';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    template: '%s | Clemson Quantum',
    default: 'Clemson Quantum',
  },
  description:
    'The Clemson Quantum Club (CQC) is a student-led organization making quantum computing accessible at Clemson University. Workshops, hackathons, research, and community.',
  metadataBase: new URL('https://clemsonquantum.com'),
  openGraph: {
    title: 'Clemson Quantum',
    description:
      'Student-led quantum computing club at Clemson University — workshops, hackathons, and research.',
    url: 'https://clemsonquantum.com',
    siteName: 'Clemson Quantum',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/logo-light.png',
        width: 1144,
        height: 779,
        alt: 'Clemson Quantum Club Logo',
      },
    ],
  },
  icons: {
    // Full CQC logo (atom + letters + wordmark) on a square canvas. The .ico
    // frames are exact downscales of favicon-512.png so every size shows the
    // mark at the same relative scale. favicon.ico at the site root is what
    // Google/crawlers prefer; the PNG provides a high-res variant.
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-icon.png',
  },
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
            Allows: self for everything, Web3Forms for form submits (connect-src),
            and YouTube for the embedded video (frame-src). 'unsafe-inline' is
            required for Next's inline hydration scripts and inline styles. */}
        {process.env.NODE_ENV === 'production' && (
          <meta
            httpEquiv="Content-Security-Policy"
            content="default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: https:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.web3forms.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; form-action 'self' mailto:"
          />
        )}
        <meta name="theme-color" content="#2d1054" />
      </head>
      <body className={`${inter.variable} ${playfair.variable}`}>
        <a href="#main" className="skip-link">Skip to main content</a>
        <Header navData={navData} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
