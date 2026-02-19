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
  description: 'Clemson Quantum Club Website',
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=search"
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
