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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={name}
        style={{
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          objectFit: 'cover',
          objectPosition: 'center',
          marginRight: '32px',
          background: '#fff',
          flexShrink: 0,
        }}
      />
      <div>
        <h2>
          {name} | <span>{role}</span>
        </h2>
        <p className="organizer-description">{description}</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {linkedin && (
            <a href={linkedin} target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/linkedin.png"
                alt="LinkedIn Profile"
                style={{ height: '32px' }}
              />
            </a>
          )}
          {github && (
            <a href={github} target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/github cat.png"
                alt="GitHub Profile"
                style={{ height: '32px' }}
              />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
