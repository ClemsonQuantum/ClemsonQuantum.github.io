import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/og';
import { getSortedPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';
import ArchiveHeader from '@/components/ArchiveHeader';

export const metadata: Metadata = pageMetadata({
  title: 'Workshops & Seminars',
  description:
    'Workshops and seminars from Clemson Quantum Club, including the Qiskit Fall Fest series.',
  path: '/events/workshops-and-seminars/',
});

export default function WorkshopsPage() {
  const workshops = getSortedPages('events/workshops-and-seminars');

  return (
    <div className="archive-page">
      <ArchiveHeader title="Workshops & Seminars" />
      {/* Card titles are h3s; this hidden h2 keeps the heading
          hierarchy contiguous for assistive tech. */}
      <h2 className="sr-only">All workshops and seminars</h2>
      <EventArchive items={workshops} />
    </div>
  );
}
