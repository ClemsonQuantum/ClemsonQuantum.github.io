import type { CSSProperties } from 'react';
import SiteImage from './SiteImage';
import type { PageMeta } from '@/lib/types';
import { formatDate } from '@/lib/dates.mjs';
import thumbnails from '@/data/thumbnails.json';

// Phone copies of the card images (scripts/generate-thumbnails.mjs). Below
// 768px the card is a compact row that draws its image at 96px (72px under
// 360px), so a <source> limited to those widths offers the phone copy; wider
// screens always get the full image.
const THUMBS: Record<string, { thumb: string; thumbWidth: number }> = thumbnails;
const PHONE_SIZES = '(max-width: 359px) 72px, 96px';

// Card images that don't simply fill the 16:9 slot, by file name. A poster
// (squarer than 16:9, or a wide graphic with text at its sides) shows whole
// over a blurred copy of itself; a logo is wide on white and shows whole on a
// white slot; a still image is a graphic with text or figures near its edges.
// All three skip the scroll drift, whose zoom would crop them (style.css,
// "Card images").
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
  'ibm-fall-fest-2025.webp': 'still',
};

// Names never break across lines, so card titles and summaries show these
// with no-break spaces. Display only: frontmatter, search, and page titles
// keep plain spaces.
const NAMES =
  /\b(?:SC Quantathon(?: v\d)?|SC Quantum|Abu Dhabi|Dr\. Rong Ge|Alice & Bob|Fall Fest PLUS|Qiskit Fall Fest|Clemson Quantum Club|Clemson University|The Wolfpack|Watt Family Innovation Center|Savannah River|Duke Quantum Information Society|Google Quantum AI|Yale University|Social Good|Cambridge, MA|McAdams Hall|CUhackit \d{4})\b/g;
const keepNames = (text: string) => text.replace(NAMES, (name) => name.replace(/ /g, '\u00a0'));

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

interface PreviewCardProps {
  item: PageMeta;
  kind: 'news' | 'event';
  metaLabel?: string | null;
  showFooter?: boolean;
  /** In the first screen (an archive grid's first row): skip lazy loading. */
  eager?: boolean;
  /** The full image is already on the page (the homepage featured band):
      reuse it on phones too instead of loading the phone copy as well. */
  fullImage?: boolean;
  /** view-transition-name, so the archive's term filter can glide this card. */
  transitionName?: string;
}

export default function PreviewCard({
  item,
  kind,
  metaLabel,
  showFooter = true,
  eager = false,
  fullImage = false,
  transitionName,
}: PreviewCardProps) {
  // News cards credit the outlet (the validator requires `source` on news).
  const footerLabel = kind === 'news' ? item.source : metaLabel;
  const summary = item.summary ?? item.excerpt;
  // `dateDisplay` lets a card show custom text (e.g. "TBD") in the date slot
  // while a real `date` is still used for sorting and the Upcoming badge.
  // A word joiner after the en dash keeps a day range ("24–25") whole at
  // large text sizes. Display only, like keepNames.
  const dateText =
    (item.dateDisplay ?? (item.date ? formatDate(item.date) : null))?.replace(
      /(\d)–(\d)/g,
      '$1–\u2060$2',
    ) ?? null;
  // Event cards get the Upcoming badge from the build-time `isUpcoming` flag
  // (resolved in getAllPages, so server HTML and client hydration always agree).
  const badge = kind === 'event' && item.isUpcoming ? 'Upcoming' : null;
  const fit = item.image ? IMAGE_FIT[item.image.split('/').pop() ?? ''] : undefined;
  const framed = fit === 'poster' || fit === 'logo';
  const thumb = item.image && !fullImage ? THUMBS[item.image] : undefined;

  return (
    <a
      className="preview-card"
      style={transitionName ? ({ viewTransitionName: transitionName } as CSSProperties) : undefined}
      href={item.href}
      {...(item.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {item.image && (
        <div
          className={framed ? `preview-card__media preview-card__media--${fit}` : 'preview-card__media'}
          style={
            fit === 'poster'
              ? ({
                  '--card-image': `url(${item.image})`,
                  ...(thumb ? { '--card-image-thumb': `url(${thumb.thumb})` } : {}),
                } as CSSProperties)
              : undefined
          }
        >
          {/* Decorative here — the adjacent h3 already announces the title,
              so a non-empty alt would read it twice. The <picture> keeps
              React from emitting a preload hint for an eager image, which
              link prefetch would apply on every page that links here. */}
          <picture>
            {/* Below 768px (the compact row, where style.css also swaps the
                poster backdrop to the phone copy) the card takes the phone
                copy; wider screens always take the full image. */}
            {thumb && (
              <source
                media="(max-width: 767px)"
                srcSet={`${thumb.thumb} ${thumb.thumbWidth}w`}
                sizes={PHONE_SIZES}
              />
            )}
            <SiteImage
              className={fit ? 'preview-card__image preview-card__image--still' : 'preview-card__image'}
              src={item.image}
              alt=""
              {...(eager ? { loading: 'eager' as const, fetchPriority: 'high' as const } : {})}
            />
          </picture>
        </div>
      )}
      <div className="preview-card__body">
        <div className="preview-card__meta">
          {/* A <time> for real dates; a range ("November 9–20, 2026") carries
              its first day. Placeholder text ("Dates TBD") stays a span. */}
          {dateText &&
            (item.date && ISO_DAY.test(item.date) && /\d/.test(dateText) ? (
              <time className="preview-card__date" dateTime={item.date}>
                {dateText}
              </time>
            ) : (
              <span className="preview-card__date">{dateText}</span>
            ))}
          {badge && (
            <span className="preview-card__badge">{badge}</span>
          )}
        </div>
        <h3 className="preview-card__title">
          {/* No-break hyphens too, so a compound (Real-World) stays whole. */}
          {keepNames(item.title).replace(/(\w)-(?=\w)/g, '$1\u2011')}
          {item.isExternal && <span className="sr-only"> (opens in a new tab)</span>}
        </h3>
        {summary && <p className="preview-card__summary">{keepNames(summary)}</p>}
        {showFooter && footerLabel && (
          <div className="preview-card__footer">
            <span className="preview-card__label">
              {footerLabel}
              {/* ↗ drawn as ↑ turned 45°, the site's diagonal-arrow style (as in .lr-item__title::after). */}
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
