import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/og';
import { getSortedPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';
import ArchiveHeader from '@/components/ArchiveHeader';

export const metadata: Metadata = pageMetadata({
  title: 'News',
  description:
    'Press coverage of Clemson Quantum Club’s hackathon results and research, plus quantum computing news from Clemson University.',
  path: '/news/',
});

export default function NewsPage() {
  const items = getSortedPages('news');

  return (
    <div className="archive-page">
      <ArchiveHeader title="News" />
      {/* Card titles are h3s; this hidden h2 keeps the heading
          hierarchy contiguous for assistive tech. */}
      <h2 className="sr-only">All news coverage</h2>
      <EventArchive
        items={items}
        kind="news"
        showFooter={false}
        emptyText="No news yet. Check back soon."
      />
    </div>
  );
}
