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
    <section className="about-page__section about-past-board">
      <div className="about-past-board__header">
        <div>
          <h2>Past board members</h2>
          <p>Previous student officers who helped build Clemson Quantum Club.</p>
        </div>
        <button
          className="view-all-link"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide archive' : 'View archive'}
        </button>
      </div>
      {expanded && (
        <ul className="about-past-board__list">
          {members.map((m) => (
            <li key={`${m.name}-${m.years}`} className="about-past-board__item">
              <SiteImage
                className="about-past-board__avatar"
                src={m.image || '/images/blank-profile.svg'}
                alt={m.name}
              />
              <div>
                <h3>{m.name}</h3>
                <p>{m.role}</p>
                <span>{m.years}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
