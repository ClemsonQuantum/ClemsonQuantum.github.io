'use client';

import { useState } from 'react';
import SiteImage from './SiteImage';
import pastBoardMembers from '@/data/past-board-members.json';

interface PastBoardMember {
  name: string;
  role: string;
  years: string;
  image?: string;
}

export default function PastBoardMembers() {
  const [expanded, setExpanded] = useState(false);
  const members = pastBoardMembers as PastBoardMember[];

  if (members.length === 0) return null;

  return (
    <section className="about-page__section">
      <h2>Past Board Members</h2>
      <button
        className="about-past-board__toggle"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {expanded ? 'Hide past board' : 'Show past board'}
      </button>
      {expanded && (
        <ul className="about-past-board__list">
          {members.map((m) => (
            <li key={`${m.name}-${m.years}`} className="about-past-board__item">
              <SiteImage
                className="about-past-board__avatar"
                src={m.image || '/images/blank-profile.svg'}
                alt={m.name}
              />
              <span>
                {m.name} &mdash; {m.role} ({m.years})
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
