'use client';

import { useState } from 'react';
import SiteImage from './SiteImage';
import EmailIcon from './icons/EmailIcon';

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
  const [open, setOpen] = useState(false);
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
          <button
            className="board-member__toggle"
            aria-expanded={open}
            aria-label={open ? `Hide details about ${name}` : `Show details about ${name}`}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Less' : 'More'}
          </button>
        </div>
        <div className="board-member__details" data-open={open}>
          <div className="board-member__details-inner">
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
                    <SiteImage
                      src="/images/linkedin.png"
                      alt=""
                      className="board-member__link-icon"
                    />
                  </a>
                )}
                {github && (
                  <a
                    href={github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${name} on GitHub`}
                  >
                    <SiteImage
                      src="/images/github.svg"
                      alt=""
                      className="board-member__link-icon"
                    />
                  </a>
                )}
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${name} website`}
                  >
                    <svg
                      className="board-member__link-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18" />
                      <path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
