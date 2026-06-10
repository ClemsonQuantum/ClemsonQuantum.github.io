import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';

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
      <EventArchive
        items={items}
        kind="news"
        showFooter={false}
        emptyText="No news yet — check back soon."
      />
    </div>
  );
}
