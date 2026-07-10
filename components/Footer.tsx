import Link from 'next/link';
import siteConfig from '@/data/site-config.json';
import SiteImage from '@/components/SiteImage';
import {
  DiscordIcon,
  LinkedInIcon,
  GitHubIcon,
  InstagramIcon,
  TigerQuestIcon,
} from '@/components/icons/ChannelIcons';

const socialLinks = [
  { label: 'Discord', href: siteConfig.discordInvite, Icon: DiscordIcon },
  { label: 'LinkedIn', href: siteConfig.linkedinUrl, Icon: LinkedInIcon },
  { label: 'GitHub', href: siteConfig.githubUrl, Icon: GitHubIcon },
  { label: 'TigerQuest', href: siteConfig.tigerquestUrl, Icon: TigerQuestIcon },
  { label: 'Instagram', href: siteConfig.instagramUrl, Icon: InstagramIcon },
];

export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-brand">
          <Link href="/" className="footer-logo-link" aria-label="Clemson Quantum Club home">
            <picture>
              {/* Same light/dark logo swap as the header. */}
              <source
                srcSet="/images/logo-dark.png"
                media="(prefers-color-scheme: dark)"
              />
              <SiteImage
                src="/images/logo-light.png"
                alt="Clemson Quantum Club"
                className="footer-logo"
              />
            </picture>
          </Link>
          <p className="footer-meeting">
            {siteConfig.meetingDay} @ {siteConfig.meetingTime} &middot;{' '}
            {siteConfig.location}
          </p>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <Link href="/about/">About</Link>
          <Link href="/news/">News</Link>
          <Link href="/events/">Events</Link>
          <Link href="/resources/">Resources</Link>
          <Link href="/get-involved/">Get involved</Link>
        </nav>

        <div className="footer-social">
          {socialLinks.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
            >
              <Icon className="footer-social__icon" />
            </a>
          ))}
        </div>
      </div>

      <div className="footer-divider" aria-hidden="true" />

      <p className="footer-copy">
        &copy; {new Date().getFullYear()} Clemson Quantum Club &middot;{' '}
        <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
      </p>
    </footer>
  );
}
