import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';

export const metadata: Metadata = {
  title: 'Workshops & Seminars',
  description:
    'Workshops and seminars from the Clemson Quantum Club, including the IBM Qiskit Fall Fest series and hands-on quantum programming sessions.',
};

export default function WorkshopsPage() {
  const workshops = sortPages(getAllPages('events/workshops-and-seminars'));

  return (
    <div className="archive-page">
      <header className="archive-hero archive-hero--events">
        <h1 className="archive-hero__title">Workshops &amp; Seminars</h1>
      </header>
      <EventArchive items={workshops} />
    </div>
  );
}
