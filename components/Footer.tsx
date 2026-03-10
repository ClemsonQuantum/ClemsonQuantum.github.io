import siteConfig from '@/data/site-config.json';

export default function Footer() {
  return (
    <footer>
      <div className="footer-links">
        <a href={siteConfig.discordInvite} target="_blank" rel="noopener noreferrer">Discord</a>
        <a href={siteConfig.tigerquestUrl} target="_blank" rel="noopener noreferrer">TigerQuest</a>
        <a href={`mailto:${siteConfig.contactEmail}`}>Contact</a>
      </div>
      <p className="footer-copy">
        &copy; {new Date().getFullYear()} Clemson Quantum
      </p>
    </footer>
  );
}
