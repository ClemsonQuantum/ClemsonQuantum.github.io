import EmailIcon from './icons/EmailIcon';
import WebsiteIcon from './icons/WebsiteIcon';
import { GitHubIcon, LinkedInIcon } from './icons/ChannelIcons';

/**
 * A person's icon links (board member and faculty cards) in one fixed order:
 * Email, LinkedIn, GitHub, Website. Renders nothing when the person has none.
 * Class names come from `classPrefix` (`board-member` or `faculty-card`):
 * `__links` on the row, `__link` on each link, `__link-icon` on each icon.
 */
export default function PersonLinks({
  name,
  email,
  linkedin,
  github,
  website,
  classPrefix,
}: {
  name: string;
  email?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  classPrefix: 'board-member' | 'faculty-card';
}) {
  if (!email && !linkedin && !github && !website) return null;
  const linkClass = `${classPrefix}__link`;
  const iconClass = `${classPrefix}__link-icon`;
  const offsite = { target: '_blank', rel: 'noopener noreferrer' };
  return (
    <div className={`${classPrefix}__links`}>
      {email && (
        <a className={linkClass} href={`mailto:${email}`} aria-label={`Email ${name}`}>
          <EmailIcon className={iconClass} />
        </a>
      )}
      {linkedin && (
        <a className={linkClass} href={linkedin} {...offsite} aria-label={`${name} on LinkedIn (opens in a new tab)`}>
          <LinkedInIcon className={`${iconClass} link-icon--brand`} />
        </a>
      )}
      {github && (
        <a className={linkClass} href={github} {...offsite} aria-label={`${name} on GitHub (opens in a new tab)`}>
          <GitHubIcon className={`${iconClass} link-icon--brand`} />
        </a>
      )}
      {website && (
        <a className={linkClass} href={website} {...offsite} aria-label={`${name}’s website (opens in a new tab)`}>
          <WebsiteIcon className={iconClass} />
        </a>
      )}
    </div>
  );
}
