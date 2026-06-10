import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import PreviewCard from '@/components/PreviewCard';

export const metadata: Metadata = {
  title: 'News',
  description:
    'News and press coverage of the Clemson Quantum Club — hackathon results, research spotlights, and quantum computing milestones at Clemson University.',
};

export default function NewsPage() {
  const items = sortPages(getAllPages('news'));

  return (
    <div className="archive-page">
      <header className="archive-hero">
        <h1 className="archive-hero__title">News</h1>
      </header>
      <div className="preview-grid">
        {items.map((item) => (
          <PreviewCard key={item.slug} item={item} kind="news" showFooter={false} />
        ))}
      </div>
    </div>
  );
}
