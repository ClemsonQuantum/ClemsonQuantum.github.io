import { PageMeta, formatDate } from '@/lib/types';

interface NewsCardProps {
  item: PageMeta;
}

export default function NewsCard({ item }: NewsCardProps) {
  const href = item.href;
  const isExternal = item.isExternal;

  return (
    <article className="news-card">
      <div className="news-card__layout">
        <div className="news-card__content">
          {item.date && (
            <p className="news-card__meta">{formatDate(item.date)}</p>
          )}
          <h2 className="news-card__title">
            <a
              href={href}
              {...(isExternal ? { target: '_blank', rel: 'noopener' } : {})}
            >
              {item.title}
            </a>
          </h2>
          {item.summary && (
            <p className="news-card__summary">{item.summary}</p>
          )}
          {!item.summary && item.excerpt && (
            <p className="news-card__summary">{item.excerpt}</p>
          )}
          {item.cta_label && (
            <a
              className="news-card__link"
              href={href}
              {...(isExternal ? { target: '_blank', rel: 'noopener' } : {})}
            >
              {item.cta_label}
            </a>
          )}
        </div>
        {item.image && (
          <div className="news-card__image" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt={item.title} loading="lazy" />
          </div>
        )}
      </div>
    </article>
  );
}
