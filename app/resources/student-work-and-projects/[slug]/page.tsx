type Author = { name: string };
import type { Metadata } from 'next';
import { getAllPages, getPageBySlug, formatDate } from '@/lib/content';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPages('resources/student-work-and-projects').map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { data } = getPageBySlug('resources/student-work-and-projects', slug);
  return { title: String(data.title ?? slug) };
}

export default async function StudentWorkDetailPage({ params }: Props) {
  const { slug } = await params;
  const { data, content } = getPageBySlug(
    'resources/student-work-and-projects',
    slug
  );

  if (!data || !content) {
    return (
      <div className="page-content">
        <h1>Not Found</h1>
        <p>This student work/project could not be found.</p>
      </div>
    );
  }

  const { date, authors } = data || {};

  return (
    <div className="page-content">
      <h1>{String(data.title ?? slug)}</h1>
      {(date || (authors && authors.length > 0)) && (
        <p className="meta">
          {date && <span>{formatDate(String(date))}</span>}
          {date && authors && authors.length > 0 && (
            <span>&nbsp;&bull;&nbsp;</span>
          )}
          {authors &&
            (authors as Author[]).map((a, i) => (
              <span key={i}>
                {a.name}
                {i < authors.length - 1 ? ', ' : ''}
              </span>
            ))}
        </p>
      )}
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
