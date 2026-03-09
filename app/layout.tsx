import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getNavData } from '@/lib/navData';

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
        url: '/images/logo.png',
        width: 512,
        height: 512,
        alt: 'Clemson Quantum Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Clemson Quantum',
    description:
      'Student-led quantum computing club at Clemson University.',
    images: ['/images/logo.png'],
  },
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=search&display=swap"
        />
      </head>
      <body>
        <Header navData={navData} />
        <main>{children}</main>
        <Footer />
        <script src="/assets/js/main.js" defer></script>
      </body>
    </html>
  );
}
