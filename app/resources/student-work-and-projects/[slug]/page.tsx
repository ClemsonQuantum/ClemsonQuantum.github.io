import { notFound } from 'next/navigation';
import { getPageBySlug } from '@/lib/content';
import { normalizeDate } from '@/lib/content-shared.mjs';
import { formatDate } from '@/lib/dates.mjs';
import { createSlugPage } from '@/lib/slugPage';
import type { Author } from '@/lib/types';
import { capitalize } from '@/lib/types';
import SiteImage from '@/components/SiteImage';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Same static params, metadata and noindex rules as the event routes; this
// route keeps its own page body. No imageSize: poster images aren't banners.
const slugPage = createSlugPage('resources/student-work-and-projects');
export const generateStaticParams = slugPage.generateStaticParams;
export const generateMetadata = slugPage.generateMetadata;

const isPdf = (p: string) => /\.pdf($|\?)/i.test(p);
const isImage = (p: string) => /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(p);
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
};

export default async function StudentWorkProjectPage({ params }: PageProps) {
  const { slug } = await params;
  const { data, content } = getPageBySlug('resources/student-work-and-projects', slug);
  if (!data) notFound();

  const title = String(data.title ?? slug);
  const type = typeof data.type === 'string' ? data.type : null;
  const date = normalizeDate(data.date);
  const authors: Author[] = Array.isArray(data.authors)
    ? (data.authors as Author[])
    : [];
  const mentors: string[] = Array.isArray(data.mentors)
    ? (data.mentors as string[])
    : [];
  const image = typeof data.image === 'string' ? data.image : null;
  const pdf = typeof data.pdf === 'string' ? data.pdf : null;
  const link = typeof data.link === 'string' ? data.link : null;
  const localLink = link && !link.includes('://') ? link : null;
  const externalLink = link && link.includes('://') ? link : null;

  // Media slot: a poster image and an embedded PDF viewer can both render
  // (image first) — e.g. a poster image with the associated paper below;
  // falls back to a placeholder until a file is added.
  const pdfSrc = pdf ?? (localLink && isPdf(localLink) ? localLink : null);
  const imageSrc = image ?? (localLink && isImage(localLink) ? localLink : null);
  const mediaLabel =
    type === 'paper' ? 'Paper' : type === 'conference' ? 'Talk' : 'Poster';

  return (
    <article className="sw-detail">
      <header className="sw-detail__header">
        {type && <span className="sw-type">{capitalize(type)}</span>}
        <h1 className="sw-detail__title">{title}</h1>
        {(date || authors.length > 0) && (
          <p className="sw-detail__meta">
            {date && <span>{formatDate(date)}</span>}
            {date && authors.length > 0 && <span> · </span>}
            {authors.map((a, i) => (
              <span key={i}>
                {a.name}
                {a.affiliation ? ` (${a.affiliation})` : ''}
                {i < authors.length - 1 ? ', ' : ''}
              </span>
            ))}
          </p>
        )}
        {mentors.length > 0 && (
          <p className="sw-detail__mentors">Mentored by {mentors.join(', ')}</p>
        )}
      </header>

      {imageSrc && (
        <a
          className="sw-media sw-media--image"
          href={imageSrc}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open full-size ${mediaLabel.toLowerCase()}`}
        >
          {/* Intrinsic dimensions reserve layout space (both posters are
              4:3); CSS width:100%/height:auto keeps them responsive. */}
          {/* alt="" because the page h1 already carries the title; the link is labelled instead. */}
          <SiteImage
            src={imageSrc}
            alt=""
            className="sw-media__image"
            width={1600}
            height={1200}
            loading="eager"
            fetchPriority="high"
          />
        </a>
      )}
      {pdfSrc && (
        <div className="sw-media">
          <iframe
            className="sw-media__pdf"
            loading="lazy"
            src={pdfSrc}
            title={`${title} (PDF)`}
          />
        </div>
      )}
      {/* Conference talks have no file to preview, so they skip the
          placeholder instead of promising one. */}
      {!imageSrc && !pdfSrc && type !== 'conference' && (
        <div className="sw-media sw-media--placeholder">
          <span>{mediaLabel} preview coming soon</span>
        </div>
      )}

      {(pdfSrc || imageSrc || externalLink) && (
        <div className="sw-actions">
          {imageSrc && (
            <a className="sw-action" href={imageSrc} download>
              <span aria-hidden="true">↓</span> Download {mediaLabel.toLowerCase()}
            </a>
          )}
          {pdfSrc && (
            <a className="sw-action" href={pdfSrc} download>
              <span aria-hidden="true">↓</span> Download PDF
            </a>
          )}
          {externalLink && (
            <a
              className="sw-action"
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on {hostOf(externalLink)} <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}

      <div className="sw-detail__body">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {content ?? ''}
        </ReactMarkdown>
      </div>
    </article>
  );
}
