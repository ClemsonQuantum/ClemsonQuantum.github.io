
import type { Metadata } from 'next';
import { getAllPages, getPageBySlug, formatDate } from '@/lib/content';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

type Author = { name: string };

export async function generateStaticParams() {
  return getAllPages('resources/student-work-and-projects').map((p) => ({
    slug: p.slug,
  }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySlug('resources/student-work-and-projects', slug);
  if (!page || !page.data) {
    return { title: String(slug) };
  }
  const { data } = page;
  return { title: String(data.title ?? slug) };
}

export default async function StudentWorkPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getPageBySlug('resources/student-work-and-projects', slug);
  if (!page || !page.data || !page.content) {
    return (
      <div className="page-content">
        <h1>Not Found</h1>
        <p>This student work/project could not be found.</p>
      </div>
    );
  }
  const { data, content } = page;
  const date: string | undefined = typeof data.date === 'string' ? data.date : undefined;
  const authors: Author[] = Array.isArray(data.authors) ? data.authors : [];

  return (
    <div className="page-content">
      <h1>{String(data.title ?? slug)}</h1>
      {(date || authors.length > 0) ? (
        <p className="meta">
          {date && <span>{formatDate(String(date))}</span>}
          {date && authors.length > 0 && (
            <span>&nbsp;&bull;&nbsp;</span>
          )}
          {authors.length > 0 &&
            authors.map((a: Author, i: number) => (
              <span key={i}>
                {a.name}
                {i < authors.length - 1 ? ', ' : ''}
              </span>
            ))}
        </p>
      ) : null}
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
