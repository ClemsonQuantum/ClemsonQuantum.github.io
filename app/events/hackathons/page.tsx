import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import { getAllPages, sortPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';
import ConstellationDivider from '@/components/ConstellationDivider';

export const metadata: Metadata = {
  title: 'Hackathons',
  description:
    'Quantum hackathons the Clemson Quantum Club hosts and competes in, including SC Quantathon, MIT iQuHack, and YQuantum.',
  openGraph: pageOpenGraph({
    title: 'Hackathons | Clemson Quantum Club',
    description:
      'Quantum hackathons the Clemson Quantum Club hosts and competes in, including SC Quantathon, MIT iQuHack, and YQuantum.',
    url: '/events/hackathons/',
  }),
};

export default function HackathonsPage() {
  const hackathons = sortPages(getAllPages('events/hackathons'));

  return (
    <div className="archive-page">
      <header className="archive-hero archive-hero--events">
        <h1 className="archive-hero__title">Hackathons</h1>
        <ConstellationDivider />
      </header>
      {/* Card titles are h3s; this hidden h2 keeps the heading
          hierarchy contiguous for assistive tech. */}
      <h2 className="sr-only">All hackathons</h2>
      <EventArchive items={hackathons} />
    </div>
  );
}
