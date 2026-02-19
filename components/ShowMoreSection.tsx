'use client';

import { useState } from 'react';
import type { PageMeta } from '@/lib/types';
import NewsCard from './NewsCard';

interface ShowMoreSectionProps {
  initial: PageMeta[];
  rest: PageMeta[];
}

export default function ShowMoreSection({
  initial,
  rest,
}: ShowMoreSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="news-cards">
        {initial.map((item) => (
          <NewsCard key={item.slug} item={item} />
        ))}
      </div>

      {rest.length > 0 && (
        <div className="more-container">
          <button
            className="show-more"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
          {expanded && (
            <div className="more-list">
              <div className="news-cards">
                {rest.map((item) => (
                  <NewsCard key={item.slug} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
