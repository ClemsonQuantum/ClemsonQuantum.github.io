import type { Metadata } from 'next';
import { getAllPages, getPageBySlug, formatDate } from '@/lib/content';
import SiteImage from '@/components/SiteImage';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPages('news').map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySlug('news', slug);
  if (!page || !page.data) {
    return { title: String(slug) };
  }
  return { title: String(page.data.title ?? slug) };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const page = getPageBySlug('news', slug);
  if (!page || !page.data || !page.content) {
    return (
      <div className="page-content">
        <h1>Not Found</h1>
        <p>This article could not be found.</p>
      </div>
    );
  }
  const { data, content } = page;
  const date = data.date ? String(data.date) : null;
  // `source_url` links to the original article on the detail page WITHOUT making
  // the card itself external (unlike `external_url`, which `lib/content` treats as
  // the card's destination). `external_url` still works for fully off-site items.
  const linkUrl =
    (typeof data.external_url === 'string' ? data.external_url : null) ??
    (typeof data.source_url === 'string' ? data.source_url : null);
  const ctaLabel =
    typeof data.cta_label === 'string' ? data.cta_label : 'Read Full Article';
  const image = typeof data.image === 'string' ? data.image : null;

  return (
    <div className="page-content">
      <h1>{String(data.title ?? slug)}</h1>
      {date && (
        <p className="meta">{formatDate(date)}</p>
      )}
      {image && (
        <SiteImage
          src={image}
          alt={String(data.title ?? '')}
          className="article-hero-img"
        />
      )}
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
      {linkUrl && (
        <p className="news-external-cta">
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hackathon-cta"
          >
            {ctaLabel} <span aria-hidden="true">&rarr;</span>
          </a>
        </p>
      )}
    </div>
  );
}
