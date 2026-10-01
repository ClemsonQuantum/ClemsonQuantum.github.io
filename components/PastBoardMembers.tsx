'use client';

import { useEffect, useState } from 'react';
import SiteImage from './SiteImage';

// Only the fields the archive shows. The page (a server component) reads
// data/past-board-members.json and passes these, so reference-only fields
// like `profile` never reach the browser bundle.
export interface PastBoardMemberCard {
  name: string;
  role: string;
  tenure: string;
  image?: string;
}

export default function PastBoardMembers({
  members,
}: {
  members: PastBoardMemberCard[];
}) {
  const [expanded, setExpanded] = useState(false);

  // Search results for past members link to #past-board, so arriving on that
  // hash opens the list. It starts collapsed either way, so hydration matches.
  useEffect(() => {
    const openOnHash = () => {
      if (window.location.hash === '#past-board') setExpanded(true);
    };
    openOnHash();
    window.addEventListener('hashchange', openOnHash);
    return () => window.removeEventListener('hashchange', openOnHash);
  }, []);

  if (members.length === 0) return null;

  return (
    <section id="past-board" className="about-page__section about-past-board">
      <div className="about-past-board__header">
        <div>
          <h2>Past board members</h2>
          <p>Previous student officers who helped build Clemson Quantum Club.</p>
        </div>
        <button
          type="button"
          className="view-all-link"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls="past-board-list"
        >
          {expanded ? 'Hide past board members' : 'Show past board members'}
        </button>
      </div>
      {/* Always in the DOM (hidden while collapsed) so the button's
          aria-controls points at a real element. */}
      <ul id="past-board-list" className="about-past-board__list" hidden={!expanded}>
        {members.map((m) => (
          <li key={`${m.name}-${m.tenure}`} className="about-past-board__item">
            {/* Rendered as a fixed 52px circle regardless of source size.
                Decorative: the h3 beside it already announces the name. */}
            <SiteImage
              className="about-past-board__avatar"
              src={m.image || '/images/blank-profile.svg'}
              alt=""
              width={52}
              height={52}
            />
            <div>
              <h3>{m.name}</h3>
              <p>{m.role}</p>
              <span>{m.tenure}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
