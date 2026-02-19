import { PageMeta, formatDate } from '@/lib/types';

interface NewsCardProps {
  item: PageMeta;
}

export default function NewsCard({ item }: NewsCardProps) {
  const href = item.href;
  const isExternal = item.isExternal;

  return (
    <article className="article-item">
      <div className="article-item__layout">
        <div className="article-item__content">
          {item.date && (
            <p className="article-item__date">{formatDate(item.date)}</p>
          )}
          <h2 className="article-item__title">
            <a
              href={href}
              {...(isExternal ? { target: '_blank', rel: 'noopener' } : {})}
            >
              {item.title}
            </a>
          </h2>
          {(item.summary || item.excerpt) && (
            <p className="article-item__summary">
              {item.summary ?? item.excerpt}
            </p>
          )}
          {item.cta_label && (
            <a
              className="article-item__cta"
              href={href}
              {...(isExternal ? { target: '_blank', rel: 'noopener' } : {})}
            >
              {item.cta_label} &rarr;
            </a>
          )}
        </div>
        {item.image && (
          <div className="article-item__image" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt={item.title} loading="lazy" />
          </div>
        )}
      </div>
    </article>
  );
}
