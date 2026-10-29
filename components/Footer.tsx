import Link from 'next/link';
import siteConfig from '@/data/site-config.json';
import { CHANNELS } from '@/lib/site';
import ClubLogo from '@/components/ClubLogo';
import CopyrightYear from '@/components/CopyrightYear';
import ConstellationDivider from '@/components/ConstellationDivider';
import { CHANNEL_ICONS } from '@/components/icons/ChannelIcons';

export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-brand">
          <Link href="/" className="footer-logo-link" aria-label="Clemson Quantum Club home">
            <ClubLogo className="footer-logo" />
          </Link>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <Link href="/about/">About</Link>
          <Link href="/news/">News</Link>
          <Link href="/events/">Events</Link>
          <Link href="/resources/">Resources</Link>
          <Link href="/get-involved/">Get Involved</Link>
          <Link href="/governing-documents/">Governing Documents</Link>
        </nav>

        <div className="footer-social">
          {CHANNELS.map(({ id, label, href }) => {
            const Icon = CHANNEL_ICONS[id];
            return (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} (opens in a new tab)`}
              >
                <Icon className="footer-social__icon" />
              </a>
            );
          })}
        </div>
      </div>

      <ConstellationDivider wide />

      <p className="footer-copy">
        &copy; <CopyrightYear buildYear={new Date().getFullYear()} /> Clemson Quantum Club<span className="footer-copy__sep"> &middot;{' '}</span>
        <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
      </p>
    </footer>
  );
}
