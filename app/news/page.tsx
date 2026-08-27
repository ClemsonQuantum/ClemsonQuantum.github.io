import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import { getAllPages, sortPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';
import ConstellationDivider from '@/components/ConstellationDivider';

export const metadata: Metadata = {
  title: 'News',
  description:
    'News and press coverage of the Clemson Quantum Club, from hackathon results to research spotlights and quantum computing milestones at Clemson University.',
  openGraph: pageOpenGraph({
    title: 'News | Clemson Quantum Club',
    description:
      'News and press coverage of the Clemson Quantum Club, from hackathon results to research spotlights and quantum computing milestones at Clemson University.',
    url: '/news/',
  }),
};

export default function NewsPage() {
  const items = sortPages(getAllPages('news'));

  return (
    <div className="archive-page">
      <header className="archive-hero">
        <h1 className="archive-hero__title">News</h1>
        <ConstellationDivider />
      </header>
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
