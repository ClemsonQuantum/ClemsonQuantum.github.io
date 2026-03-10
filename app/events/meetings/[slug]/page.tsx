import type { Metadata } from 'next';
import { getAllPages, getPageBySlug } from '@/lib/content';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPages('events/meetings').map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySlug('events/meetings', slug);
  if (!page || !page.data) return { title: String(slug) };
  return { title: String(page.data.title ?? slug) };
}

export default async function MeetingPage({ params }: Props) {
  const { slug } = await params;
  const page = getPageBySlug('events/meetings', slug);
  if (!page || !page.content) {
    return (
      <div className="page-content">
        <h1>Not Found</h1>
        <p>This page could not be found.</p>
      </div>
    );
  }
  const { content } = page;

  return (
    <div className="page-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
