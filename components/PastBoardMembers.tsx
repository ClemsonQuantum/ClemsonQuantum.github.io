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
    <section className="home-past-board">
      <h2 className="section-heading">Past Board Members</h2>
      <div className="more-container">
        <button
          className="show-more"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide past board' : 'Show past board'}
        </button>
        {expanded && (
          <ul className="home-past-board__list">
            {members.map((m) => (
              <li key={`${m.name}-${m.years}`} className="home-past-board__item">
                <SiteImage
                  className="home-past-board__avatar"
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
      </div>
    </section>
  );
}
