import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPages, sortPages } from '@/lib/content';
import PreviewCard from '@/components/PreviewCard';

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
        <div className="home-section__header">
          <div>
            <h2 className="home-section__title">Hackathons</h2>
          </div>
          <Link href="/events/hackathons/" className="view-all-link">
            View all hackathons
          </Link>
        </div>
        <div className="preview-grid">
          {hackathons.slice(0, 3).map((item) => (
            <PreviewCard
              key={item.slug}
              item={item}
              kind="event"
              metaLabel="Hackathon"
            />
          ))}
        </div>
      </section>

      <section className="archive-section">
        <div className="home-section__header">
          <div>
            <h2 className="home-section__title">Workshops &amp; Seminars</h2>
          </div>
          <Link
            href="/events/workshops-and-seminars/"
            className="view-all-link"
          >
            View all workshops &amp; seminars
          </Link>
        </div>
        <div className="preview-grid">
          {workshops.slice(0, 3).map((item) => (
            <PreviewCard
              key={item.slug}
              item={item}
              kind="event"
              metaLabel="Workshop"
            />
          ))}
        </div>
      </section>

      <section className="archive-section">
        <div className="home-section__header">
          <div>
            <h2 className="home-section__title">Meetings</h2>
          </div>
          <Link href="/events/meetings/" className="view-all-link">
            View all meetings
          </Link>
        </div>
        <div className="preview-grid">
          {meetings.slice(0, 3).map((item) => (
            <PreviewCard
              key={item.slug}
              item={item}
              kind="event"
              metaLabel="Meeting"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
