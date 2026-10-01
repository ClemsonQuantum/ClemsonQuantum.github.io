import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/og';
import { getSortedPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';
import ArchiveHeader from '@/components/ArchiveHeader';

export const metadata: Metadata = pageMetadata({
  title: 'Hackathons',
  description:
    'Quantum hackathons Clemson Quantum Club hosts and competes in, including SC Quantathon, MIT’s iQuHack, and YQuantum.',
  path: '/events/hackathons/',
});

export default function HackathonsPage() {
  const hackathons = getSortedPages('events/hackathons');

  return (
    <div className="archive-page">
      <ArchiveHeader title="Hackathons" />
      {/* Card titles are h3s; this hidden h2 keeps the heading
          hierarchy contiguous for assistive tech. */}
      <h2 className="sr-only">All hackathons</h2>
      <EventArchive items={hackathons} />
    </div>
  );
}
