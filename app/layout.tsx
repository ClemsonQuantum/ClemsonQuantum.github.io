import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getNavData } from '@/lib/navData';

const fraunces = Fraunces({
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
  metadataBase: new URL('https://clemsonquantum.github.io'),
  openGraph: {
    title: 'Clemson Quantum',
    description:
      'Student-led quantum computing club at Clemson University — workshops, hackathons, and research.',
    url: 'https://clemsonquantum.github.io',
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
    // Match the header brand logo: light wordmark by default, dark variant
    // swapped in by browsers that honor the favicon color-scheme media query.
    icon: [
      { url: '/images/logo-light.png', media: '(prefers-color-scheme: light)' },
      { url: '/images/logo-dark.png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/images/logo-light.png',
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
        <meta name="theme-color" content="#2d1054" />
      </head>
      <body className={`${inter.variable} ${fraunces.variable}`}>
        <a href="#main" className="skip-link">Skip to main content</a>
        <Header navData={navData} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
