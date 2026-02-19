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
  const { data } = getPageBySlug('events/workshops-and-seminars', slug);
  return { title: String(data.title ?? slug) };
}

export default async function WorkshopPage({ params }: Props) {
  const { slug } = await params;
  const { content } = getPageBySlug('events/workshops-and-seminars', slug);

  return (
    <div className="page-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
