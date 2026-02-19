import type { Metadata } from 'next';
import { getAllPages, getPageBySlug } from '@/lib/content';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPages('events/workshops-and-seminars').map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySlug('events/workshops-and-seminars', slug);
  if (!page || !page.data) return { title: String(slug) };
  const { data } = page;
  return { title: String(data.title ?? slug) };
}

export default async function WorkshopPage({ params }: Props) {
  const { slug } = await params;
  const page = getPageBySlug('events/workshops-and-seminars', slug);
  if (!page || !page.content) return <div>Page not found.</div>;
  const { content } = page;

  return (
    <div className="page-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
