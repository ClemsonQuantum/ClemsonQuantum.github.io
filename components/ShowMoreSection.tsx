'use client';

import { useState } from 'react';
import type { PageMeta } from '@/lib/types';
import PreviewCard from './PreviewCard';

interface ShowMoreSectionProps {
  initial: PageMeta[];
  rest: PageMeta[];
  kind: 'news' | 'event';
  metaLabel?: string;
}

export default function ShowMoreSection({
  initial,
  rest,
  kind,
  metaLabel,
}: ShowMoreSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="preview-grid">
        {initial.map((item) => (
          <PreviewCard
            key={item.slug}
            item={item}
            kind={kind}
            metaLabel={metaLabel}
          />
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
              <div className="preview-grid">
                {rest.map((item) => (
                  <PreviewCard
                    key={item.slug}
                    item={item}
                    kind={kind}
                    metaLabel={metaLabel}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
