import SiteImage from './SiteImage';

export interface OrganizerData {
  name: string;
  role: string;
  description: string;
  imageSrc: string;
  linkedin?: string;
  github?: string;
}

export default function OrganizerRow({
  name,
  role,
  description,
  imageSrc,
  linkedin,
  github,
}: OrganizerData) {
  return (
    <div className="organizer-row">
      <SiteImage
        src={imageSrc}
        alt={name}
        className="organizer-row__avatar"
      />
      <div>
        <h2>
          {name} | <span>{role}</span>
        </h2>
        <p className="organizer-description">
          {description.split('\n').map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </p>
        <div className="organizer-row__links">
          {linkedin && (
            <a href={linkedin} target="_blank" rel="noopener">
              <SiteImage
                src="/images/linkedin.png"
                alt="LinkedIn Profile"
                className="organizer-row__link-icon"
              />
            </a>
          )}
          {github && (
            <a href={github} target="_blank" rel="noopener">
              <SiteImage
                src="/images/github cat.png"
                alt="GitHub Profile"
                className="organizer-row__link-icon"
              />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
