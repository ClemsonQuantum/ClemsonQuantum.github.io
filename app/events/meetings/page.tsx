import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import { getAllPages, sortPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';
import ConstellationDivider from '@/components/ConstellationDivider';

export const metadata: Metadata = {
  title: 'Meetings',
  description:
    'Biweekly Clemson Quantum Club meetings with beginner-friendly discussion and hands-on quantum computing sessions, open to all majors.',
  openGraph: pageOpenGraph({
    title: 'Meetings | Clemson Quantum Club',
    description:
      'Biweekly Clemson Quantum Club meetings with beginner-friendly discussion and hands-on quantum computing sessions, open to all majors.',
    url: '/events/meetings/',
  }),
};

export default function MeetingsPage() {
  const meetings = sortPages(getAllPages('events/meetings'));

  return (
    <div className="archive-page">
      <header className="archive-hero archive-hero--events">
        <h1 className="archive-hero__title">Meetings</h1>
        <ConstellationDivider />
      </header>
      {/* Card titles are h3s; this hidden h2 keeps the heading
          hierarchy contiguous for assistive tech. */}
      <h2 className="sr-only">All meetings</h2>
      <EventArchive items={meetings} />
    </div>
  );
}
