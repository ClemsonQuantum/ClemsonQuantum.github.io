import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getAllPages, getPageBySlug, makeExcerpt } from '@/lib/content';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

// Next 15 PageProps: params is a Promise.
interface Props {
  params: Promise<{ slug: string }>;
}

interface Options {
  // Per-route not-found body; the two source pages rendered different fallbacks.
  notFound?: ReactNode;
}

// Shared static-export page factory for the markdown-backed event slug routes.
// `contentSubdir` selects the content directory passed to getAllPages/getPageBySlug.
export function createSlugPage(contentSubdir: string, options: Options = {}) {
  const notFound = options.notFound ?? (
    <div className="page-content">
      <h1>Not Found</h1>
      <p>This page could not be found.</p>
    </div>
  );

  async function generateStaticParams() {
    return getAllPages(contentSubdir).map((p) => ({ slug: p.slug }));
  }

  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const page = getPageBySlug(contentSubdir, slug);
    if (!page || !page.data) return { title: String(slug) };
    const title = String(page.data.title ?? slug);
    const description =
      (typeof page.data.summary === 'string' && page.data.summary) ||
      makeExcerpt(page.content ?? '');
    return {
      title,
      description,
      openGraph: { title, description, url: `/${contentSubdir}/${slug}/` },
    };
  }

  async function Page({ params }: Props) {
    const { slug } = await params;
    const page = getPageBySlug(contentSubdir, slug);
    if (!page || !page.data) return notFound;
    const { content } = page;

    return (
      <div className="page-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  return { generateStaticParams, generateMetadata, Page };
}
