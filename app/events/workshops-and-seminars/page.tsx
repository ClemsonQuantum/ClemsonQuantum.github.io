import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import { getAllPages, sortPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';
import ConstellationDivider from '@/components/ConstellationDivider';

export const metadata: Metadata = {
  title: 'Workshops & Seminars',
  description:
    'Workshops and seminars from the Clemson Quantum Club, including the IBM Qiskit Fall Fest series and hands-on quantum programming sessions.',
  openGraph: pageOpenGraph({
    title: 'Workshops & Seminars | Clemson Quantum Club',
    description:
      'Workshops and seminars from the Clemson Quantum Club, including the IBM Qiskit Fall Fest series and hands-on quantum programming sessions.',
    url: '/events/workshops-and-seminars/',
  }),
};

export default function WorkshopsPage() {
  const workshops = sortPages(getAllPages('events/workshops-and-seminars'));

  return (
    <div className="archive-page">
      <header className="archive-hero archive-hero--events">
        <h1 className="archive-hero__title">Workshops &amp; Seminars</h1>
        <ConstellationDivider />
      </header>
      {/* Card titles are h3s; this hidden h2 keeps the heading
          hierarchy contiguous for assistive tech. */}
      <h2 className="sr-only">All workshops and seminars</h2>
      <EventArchive items={workshops} />
    </div>
  );
}
