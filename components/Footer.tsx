import siteConfig from '@/data/site-config.json';

export default function Footer() {
  return (
    <footer>
      <div className="footer-links">
        <a href={siteConfig.discordInvite} target="_blank" rel="noopener noreferrer">Discord</a>
        <a href={siteConfig.linkedinUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href={`mailto:${siteConfig.contactEmail}`}>Contact</a>
      </div>
      <p className="footer-copy">
        &copy; {new Date().getFullYear()} Clemson Quantum Club
      </p>
    </footer>
  );
}
