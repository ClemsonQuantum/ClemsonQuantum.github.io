import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import EventArchive from '@/components/EventArchive';
import ConstellationDivider from '@/components/ConstellationDivider';

export const metadata: Metadata = {
  title: 'Meetings',
  description:
    'Biweekly Clemson Quantum Club meetings — beginner-friendly discussion and hands-on quantum computing sessions, open to all majors.',
};

export default function MeetingsPage() {
  const meetings = sortPages(getAllPages('events/meetings'));

  return (
    <div className="archive-page">
      <header className="archive-hero archive-hero--events">
        <h1 className="archive-hero__title">Meetings</h1>
        <ConstellationDivider />
      </header>
      <EventArchive items={meetings} />
    </div>
  );
}
