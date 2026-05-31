import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import PreviewCard from '@/components/PreviewCard';

export const metadata: Metadata = { title: 'News' };

export default function NewsPage() {
  const items = sortPages(getAllPages('news'));

  return (
    <div className="archive-page">
      <header className="archive-hero">
        <h1 className="archive-hero__title">News</h1>
        <p className="archive-hero__lead">
          Recent coverage featuring the club, its members, and Clemson
          Quantum-related work.
        </p>
      </header>
      <div className="preview-grid">
        {items.map((item) => (
          <PreviewCard key={item.slug} item={item} kind="news" />
        ))}
      </div>
    </div>
  );
}
