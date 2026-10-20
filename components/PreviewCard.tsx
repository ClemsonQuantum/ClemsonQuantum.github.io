import type { CSSProperties } from 'react';
import SiteImage from './SiteImage';
import type { PageMeta } from '@/lib/types';
import { formatDate } from '@/lib/dates.mjs';

// Card images that don't simply fill the 16:9 slot, by file name. A poster is
// squarer than 16:9 and shows whole over a blurred copy of itself; a logo is
// wide on white and shows whole on a white slot; a still image is a 16:9
// graphic with text near its edges. All three skip the scroll drift, whose
// zoom would crop them (style.css, "Card images").
const IMAGE_FIT: Record<string, 'poster' | 'logo' | 'still'> = {
  'scq-v1-graphic.webp': 'poster',
  'scq-v2-graphic.webp': 'poster',
  'iquhack-2026.webp': 'poster',
  'building-quantum-talent.webp': 'poster',
  'tiger-prowl.webp': 'logo',
  'scq-v3-banner.webp': 'still',
  'quantum-era-clemson.webp': 'still',
  'yquantum-2025.webp': 'still',
  'nyuad-2025.jpg': 'still',
  'iquhack-2025.jpg': 'still',
};

// Names never break across lines, so card titles and summaries show these
// with no-break spaces. Display only: frontmatter, search, and page titles
// keep plain spaces.
const NAMES =
  /\b(?:SC Quantathon(?: v\d)?|SC Quantum|Abu Dhabi|Dr\. Rong Ge|Alice & Bob|Fall Fest PLUS|Clemson Quantum Club|Clemson University|The Wolfpack|Watt Family Innovation Center|Savannah River)\b/g;
const keepNames = (text: string) => text.replace(NAMES, (name) => name.replace(/ /g, '\u00a0'));

interface PreviewCardProps {
  item: PageMeta;
  kind: 'news' | 'event';
  metaLabel?: string | null;
  showFooter?: boolean;
  /** In the first screen (an archive grid's first row): skip lazy loading. */
  eager?: boolean;
}

export default function PreviewCard({
  item,
  kind,
  metaLabel,
  showFooter = true,
  eager = false,
}: PreviewCardProps) {
  // News cards credit the outlet (the validator requires `source` on news).
  const footerLabel = kind === 'news' ? item.source : metaLabel;
  const summary = item.summary ?? item.excerpt;
  // `dateDisplay` lets a card show custom text (e.g. "TBD") in the date slot
  // while a real `date` is still used for sorting and the Upcoming badge.
  const dateText = item.dateDisplay ?? (item.date ? formatDate(item.date) : null);
  // Event cards get the Upcoming badge from the build-time `isUpcoming` flag
  // (resolved in getAllPages, so server HTML and client hydration always agree).
  const badge = kind === 'event' && item.isUpcoming ? 'Upcoming' : null;
  const fit = item.image ? IMAGE_FIT[item.image.split('/').pop() ?? ''] : undefined;
  const framed = fit === 'poster' || fit === 'logo';

  return (
    <a
      className="preview-card"
      href={item.href}
      {...(item.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {item.image && (
        <div
          className={framed ? `preview-card__media preview-card__media--${fit}` : 'preview-card__media'}
          style={fit === 'poster' ? ({ '--card-image': `url(${item.image})` } as CSSProperties) : undefined}
        >
          {/* Decorative here — the adjacent h3 already announces the title,
              so a non-empty alt would read it twice. */}
          <SiteImage
            className={fit ? 'preview-card__image preview-card__image--still' : 'preview-card__image'}
            src={item.image}
            alt=""
            {...(eager ? { loading: 'eager' as const } : {})}
          />
        </div>
      )}
      <div className="preview-card__body">
        <div className="preview-card__meta">
          {dateText && (
            <span className="preview-card__date">{dateText}</span>
          )}
          {badge && (
            <span className="preview-card__badge">{badge}</span>
          )}
        </div>
        <h3 className="preview-card__title">
          {keepNames(item.title)}
          {item.isExternal && <span className="sr-only"> (opens in a new tab)</span>}
        </h3>
        {summary && <p className="preview-card__summary">{keepNames(summary)}</p>}
        {showFooter && footerLabel && (
          <div className="preview-card__footer">
            <span className="preview-card__label">
              {footerLabel}
              {/* ↑ turned 45°: the loaded Source Sans subset has ↑ and ↓ but not ↗. */}
              {item.isExternal && (
                <>
                  {' '}
                  <span
                    aria-hidden="true"
                    style={{ display: 'inline-block', transform: 'rotate(45deg)' }}
                  >
                    ↑
                  </span>
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </a>
  );
}
