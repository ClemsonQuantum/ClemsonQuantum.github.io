'use client';

import { useState } from 'react';

export interface EventCardData {
  title: string;
  date?: string;
  location: string;
  backgroundImage: string;
  backLines: string[];
  link?: string;
}

export default function EventCard({
  title,
  location,
  backgroundImage,
  backLines,
  link,
}: EventCardData) {
  const [open, setOpen] = useState(false);

  return (
    <div className="event-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="event-card-image"
        src={backgroundImage}
        alt={title}
      />
      <div className="event-card-body">
        <h3>{title}</h3>
        <p className="event-card-location">{location}</p>
        <button
          className="event-card-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Hide details' : 'Details'}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className="event-card-details" data-open={open}>
          <div className="event-card-details-inner">
            {backLines.map((line, i) =>
              line.startsWith('http') ? null : <p key={i}>{line}</p>
            )}
            {link && (
              <a href={link} target="_blank" rel="noopener">
                Apply Here
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
