'use client';

import { useState } from 'react';
import SiteImage from './SiteImage';

export interface PeopleCardData {
  name: string;
  role: string;
  description: string;
  imageSrc: string;
  linkedin?: string;
  github?: string;
}

export default function PeopleCard({
  name,
  role,
  description,
  imageSrc,
  linkedin,
  github,
}: PeopleCardData) {
  const [open, setOpen] = useState(false);

  return (
    <div className="people-card">
      <div
        className="people-card-header"
        onClick={() => setOpen((o) => !o)}
      >
        <SiteImage className="people-card-avatar" src={imageSrc} alt={name} />
        <div className="people-card-info">
          <h3>{name}</h3>
          <p>{role}</p>
        </div>
        <button
          className="people-card-expand"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          {open ? 'Less' : 'More'}
        </button>
      </div>

      <div className="people-card-details" data-open={open}>
        <div className="people-card-details-inner">
          <div className="people-card-details-content">
            <p>
              {description.split('\n').map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))}
            </p>
            {(linkedin || github) && (
              <div className="people-card-links">
                {linkedin && (
                  <a href={linkedin} target="_blank" rel="noopener noreferrer">
                    <SiteImage src="/images/linkedin.png" alt="LinkedIn" />
                  </a>
                )}
                {github && (
                  <a href={github} target="_blank" rel="noopener noreferrer">
                    <SiteImage src="/images/github.svg" alt="GitHub" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
