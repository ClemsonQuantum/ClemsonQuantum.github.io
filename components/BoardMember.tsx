import SiteImage from './SiteImage';
import EmailIcon from './icons/EmailIcon';
import WebsiteIcon from './icons/WebsiteIcon';
import { LinkedInIcon, GitHubIcon } from './icons/ChannelIcons';

export interface BoardMemberData {
  name: string;
  role: string;
  description: string;
  imageSrc: string;
  email?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export default function BoardMember({
  name,
  role,
  description,
  imageSrc,
  email,
  linkedin,
  github,
  website,
}: BoardMemberData) {
  const lines = description.split('\n');

  return (
    <article className="board-member">
      <SiteImage className="board-member__avatar" src={imageSrc} alt={name} />
      <div className="board-member__body">
        <div className="board-member__head">
          <h3 className="board-member__name">
            {name}
            <span className="board-member__role"> | {role}</span>
          </h3>
        </div>
        <p className="board-member__description">
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
        </p>
        {(email || linkedin || github || website) && (
          <div className="board-member__links">
            {email && (
              <a
                href={`mailto:${email}`}
                aria-label={`Email ${name}`}
              >
                <EmailIcon className="board-member__link-icon" />
              </a>
            )}
            {linkedin && (
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} on LinkedIn`}
              >
                <LinkedInIcon className="board-member__link-icon link-icon--brand" />
              </a>
            )}
            {github && (
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} on GitHub`}
              >
                <GitHubIcon className="board-member__link-icon link-icon--brand" />
              </a>
            )}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} website`}
              >
                <WebsiteIcon className="board-member__link-icon" />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
