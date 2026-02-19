import type { Metadata } from 'next';
import Gallery from '@/components/Gallery';
import EventCard from '@/components/EventCard';
import OrganizerRow from '@/components/OrganizerRow';
import PeopleCard from '@/components/PeopleCard';
import galleryItems from '@/data/gallery.json';
import eventCards from '@/data/event-cards.json';
import boardMembers from '@/data/board-members.json';

export const metadata: Metadata = { title: 'Home' };

export default function HomePage() {
  const sortedEvents = [...eventCards].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date > a.date ? 1 : b.date < a.date ? -1 : 0;
  });

  return (
    <>
      <h1>Welcome to the Clemson Quantum Club!</h1>

      <section>
        <p>
          The Clemson Quantum Club is a student-led organization dedicated to
          exploring and advancing the field of quantum computing and quantum
          information science. We welcome students from all backgrounds and
          majors who are interested in the fascinating world of quantum
          technologies.
        </p>
        <p style={{ marginTop: '1rem' }}>
          Join us for engaging talks, hands-on workshops, and collaborative
          projects that aim to demystify quantum computing and empower the next
          generation of quantum innovators.
        </p>
      </section>

      <h1 style={{ marginTop: '3rem' }}>News</h1>
      <Gallery items={galleryItems} />

      <h1 style={{ marginTop: '3.5rem' }}>Events</h1>
      <div className="event-cards-grid">
        {sortedEvents.map((card, i) => (
          <EventCard key={i} {...card} />
        ))}
      </div>

      <h1 style={{ marginTop: '4rem' }}>Executive Board</h1>
      <div className="organizer-cards">
        {boardMembers.map((m, i) => (
          <OrganizerRow
            key={i}
            name={m.name}
            role={m.role}
            description={m.description}
            imageSrc={m.image}
            linkedin={m.linkedin}
            github={m.github}
          />
        ))}
      </div>

      <div className="people-cards-grid">
        {boardMembers.map((m, i) => (
          <PeopleCard
            key={i}
            name={m.name}
            role={m.role}
            description={m.description}
            imageSrc={m.image}
            linkedin={m.linkedin}
            github={m.github}
          />
        ))}
      </div>
    </>
  );
}
