import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import ShowMoreSection from '@/components/ShowMoreSection';

export const metadata: Metadata = { title: 'Events' };

export default function EventsPage() {
  const hackathons = sortPages(getAllPages('events/hackathons'));
  const workshops = sortPages(getAllPages('events/workshops-and-seminars'));
  const meetings = sortPages(getAllPages('events/meetings'));

  return (
    <div className="archive-page">
      <header className="archive-hero archive-hero--events">
        <h1 className="archive-hero__title">Events</h1>
        <p className="archive-hero__lead">
          Browse Clemson Quantum hackathons, workshops, seminars, and club
          meetings across the archive.
        </p>
      </header>

      <section className="archive-section">
        <h2>Hackathons</h2>
        <ShowMoreSection
          initial={hackathons.slice(0, 3)}
          rest={hackathons.slice(3)}
          kind="event"
          metaLabel="Hackathon"
        />
      </section>

      <section className="archive-section">
        <h2>Workshops &amp; Seminars</h2>
        <ShowMoreSection
          initial={workshops.slice(0, 3)}
          rest={workshops.slice(3)}
          kind="event"
          metaLabel="Workshop"
        />
      </section>

      <section className="archive-section">
        <h2>Meetings</h2>
        <ShowMoreSection
          initial={meetings.slice(0, 3)}
          rest={meetings.slice(3)}
          kind="event"
          metaLabel="Meeting"
        />
      </section>
    </div>
  );
}
