import type { Metadata } from 'next';
import { getAllPages, getPageBySlug, formatDate } from '@/lib/content';
import SiteImage from '@/components/SiteImage';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

type Author = { name: string; affiliation?: string };

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPages('resources/student-work-and-projects').map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySlug('resources/student-work-and-projects', slug);
  if (!page || !page.data) return { title: String(slug) };
  return { title: String(page.data.title ?? slug) };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
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
  const page = getPageBySlug('resources/student-work-and-projects', slug);

  if (!page || !page.data || !page.content) {
    return (
      <div className="sw-detail">
        <h1 className="sw-detail__title">Not Found</h1>
        <p>This student work / project could not be found.</p>
      </div>
    );
  }

  const { data, content } = page;
  const title = String(data.title ?? slug);
  const type = typeof data.type === 'string' ? data.type : null;
  const date = typeof data.date === 'string' ? data.date : null;
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

  // What to show in the media slot: an embedded PDF viewer takes precedence,
  // otherwise a poster image; falls back to a placeholder until a file is added.
  const pdfSrc = pdf ?? (localLink && isPdf(localLink) ? localLink : null);
  const imageSrc = image ?? (localLink && isImage(localLink) ? localLink : null);
  const mediaLabel = type === 'paper' ? 'Paper' : 'Poster';

  return (
    <article className="sw-detail">
      <header className="sw-detail__header">
        {type && <span className="sw-type">{cap(type)}</span>}
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

      {pdfSrc ? (
        <div className="sw-media">
          <iframe
            className="sw-media__pdf"
            src={pdfSrc}
            title={`${title} (PDF)`}
          />
        </div>
      ) : imageSrc ? (
        <a
          className="sw-media sw-media--image"
          href={imageSrc}
          target="_blank"
          rel="noopener noreferrer"
        >
          <SiteImage src={imageSrc} alt={title} className="sw-media__image" />
        </a>
      ) : (
        <div className="sw-media sw-media--placeholder">
          <span>{mediaLabel} preview coming soon</span>
        </div>
      )}

      {(pdfSrc || imageSrc || externalLink) && (
        <div className="sw-actions">
          {pdfSrc && (
            <a className="sw-action" href={pdfSrc} download>
              ↓ Download PDF
            </a>
          )}
          {imageSrc && (
            <a className="sw-action" href={imageSrc} download>
              ↓ Download {mediaLabel.toLowerCase()}
            </a>
          )}
          {externalLink && (
            <a
              className="sw-action sw-action--ghost"
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on {hostOf(externalLink)} ↗
            </a>
          )}
        </div>
      )}

      <div className="sw-detail__body">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
