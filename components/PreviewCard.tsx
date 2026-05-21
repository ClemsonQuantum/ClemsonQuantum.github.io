import SiteImage from './SiteImage';
import type { PageMeta } from '@/lib/types';
import { formatDate } from '@/lib/types';

interface PreviewCardProps {
  item: PageMeta;
  kind: 'news' | 'event';
  badge?: string | null;
  metaLabel?: string | null;
}

function getSourceLabel(item: PageMeta): string | null {
  if (!item.isExternal) {
    return 'Clemson Quantum';
  }

  if (item.cta_label?.startsWith('Read on ')) {
    return item.cta_label.replace(/^Read on /, '');
  }

  if (!item.external_url) {
    return 'External';
  }

  try {
    const host = new URL(item.external_url).hostname.replace(/^www\./, '');
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
}: PreviewCardProps) {
  const footerLabel = kind === 'news' ? getSourceLabel(item) : metaLabel;
  const summary = item.summary ?? item.excerpt;
  const actionLabel = kind === 'news' ? 'Read story' : 'View details';

  return (
    <a
      className={`preview-card preview-card--${kind}`}
      href={item.href}
      {...(item.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {item.image && (
        <div className="preview-card__media">
          <SiteImage
            className="preview-card__image"
            src={item.image}
            alt={item.title}
          />
        </div>
      )}
      <div className="preview-card__body">
        <div className="preview-card__meta">
          {item.date && (
            <span className="preview-card__date">{formatDate(item.date)}</span>
          )}
          {badge && <span className="preview-card__badge">{badge}</span>}
        </div>
        <h3 className="preview-card__title">
          {item.title}
          {item.isExternal && (
            <span className="preview-card__external" aria-hidden="true">↗</span>
          )}
        </h3>
        {summary && <p className="preview-card__summary">{summary}</p>}
        <div className="preview-card__footer">
          <span className="preview-card__label">{footerLabel}</span>
          <span className="preview-card__action">
            {actionLabel} <span aria-hidden="true">&rarr;</span>
          </span>
        </div>
      </div>
    </a>
  );
}
