import type { Metadata } from 'next';
import { getAllPages, sortPages } from '@/lib/content';
import ShowMoreSection from '@/components/ShowMoreSection';

export const metadata: Metadata = { title: 'Events' };

export default function EventsPage() {
  const hackathons = sortPages(getAllPages('events/hackathons'));
  const workshops = sortPages(getAllPages('events/workshops-and-seminars'));

  return (
    <>
      <h1>All Events</h1>
      <section>
        <p>
          Browse upcoming and past events by category. Click &quot;Show
          more&quot; to expand the full list in each section.
        </p>
      </section>

      <section className="events-section">
        <h2>Hackathons</h2>
        <ShowMoreSection
          initial={hackathons.slice(0, 3)}
          rest={hackathons.slice(3)}
        />
      </section>

      <section className="events-section">
        <h2>Workshops &amp; Seminars</h2>
        <ShowMoreSection
          initial={workshops.slice(0, 3)}
          rest={workshops.slice(3)}
        />
      </section>
    </>
  );
}
