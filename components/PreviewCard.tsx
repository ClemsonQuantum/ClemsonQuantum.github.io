import SiteImage from './SiteImage';
import type { PageMeta } from '@/lib/types';
import { formatDate } from '@/lib/types';

interface PreviewCardProps {
  item: PageMeta;
  kind: 'news' | 'event';
  badge?: string | null;
  metaLabel?: string | null;
  showFooter?: boolean;
}

function getSourceLabel(item: PageMeta): string | null {
  // An explicit `source` credits the original publisher (e.g. an internally
  // hosted recap of a Clemson News or SC Quantum article still names the outlet).
  if (item.source) {
    return item.source;
  }

  if (!item.isExternal) {
    return 'Clemson Quantum Club';
  }

  if (item.cta_label?.startsWith('Read on ')) {
    return item.cta_label.replace(/^Read on /, '');
  }

  // News entries go external via source_url; events via external_url.
  const destination = item.external_url ?? item.source_url;
  if (!destination) {
    return 'External';
  }

  try {
    const host = new URL(destination).hostname.replace(/^www\./, '');
    if (host === 'news.clemson.edu') return 'Clemson News';
    if (host === 'scquantum.org') return 'SC Quantum';
    return host
      .replace(/\.[^.]+$/, '')
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'External';
  }
}

export default function PreviewCard({
  item,
  kind,
  badge,
  metaLabel,
  showFooter = true,
}: PreviewCardProps) {
  const footerLabel = kind === 'news' ? getSourceLabel(item) : metaLabel;
  const summary = item.summary ?? item.excerpt;
  // `dateDisplay` lets a card show custom text (e.g. "TBD") in the date slot
  // while a real `date` is still used for sorting and the Upcoming badge.
  const dateText = item.dateDisplay ?? (item.date ? formatDate(item.date) : null);
  // Badge resolution is centralized here: an explicit `badge` overrides;
  // otherwise event cards use the build-time `isUpcoming` flag (resolved in
  // getAllPages, so server HTML and client hydration always agree).
  const effectiveBadge =
    badge ?? (kind === 'event' && item.isUpcoming ? 'Upcoming' : null);

  return (
    <a
      className={`preview-card preview-card--${kind}`}
      href={item.href}
      {...(item.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {item.image && (
        <div className="preview-card__media">
          {/* Decorative here — the adjacent h3 already announces the title,
              so a non-empty alt would read it twice. */}
          <SiteImage
            className="preview-card__image"
            src={item.image}
            alt=""
          />
        </div>
      )}
      <div className="preview-card__body">
        <div className="preview-card__meta">
          {dateText && (
            <span className="preview-card__date">{dateText}</span>
          )}
          {effectiveBadge && (
            <span className="preview-card__badge">{effectiveBadge}</span>
          )}
        </div>
        <h3 className="preview-card__title">{item.title}</h3>
        {summary && <p className="preview-card__summary">{summary}</p>}
        {showFooter && footerLabel && (
          <div className="preview-card__footer">
            <span className="preview-card__label">{footerLabel}</span>
          </div>
        )}
      </div>
    </a>
  );
}
