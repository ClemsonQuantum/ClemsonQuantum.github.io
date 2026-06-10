import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';

export const metadata: Metadata = {
  title: 'Hackathons',
  description:
    'Quantum hackathons the Clemson Quantum Club hosts and competes in, including SC Quantathon, MIT iQuHACK, and YQuantum.',
};

export default function HackathonsPage() {
  const hackathons = sortPages(getAllPages('events/hackathons'));

  return (
    <div className="archive-page">
      <header className="archive-hero archive-hero--events">
        <h1 className="archive-hero__title">Hackathons</h1>
      </header>
      <EventArchive items={hackathons} />
    </div>
  );
}
