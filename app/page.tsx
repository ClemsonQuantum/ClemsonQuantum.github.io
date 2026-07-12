import Link from 'next/link';
import { getAllPages, sortPages } from '@/lib/content';
import SiteImage from '@/components/SiteImage';
import BoardMember from '@/components/BoardMember';
import PreviewCard from '@/components/PreviewCard';
import QuantumCanvas from '@/components/QuantumCanvas';
import ConstellationDivider from '@/components/ConstellationDivider';
import boardMembers from '@/data/board-members.json';

export default function HomePage() {
  const newsItems = sortPages(getAllPages('news'));
  const recentNews = newsItems.slice(0, 3);
  const hackathons = getAllPages('events/hackathons').map((item) => ({
    item,
    metaLabel: 'Hackathon',
  }));
  const workshops = getAllPages('events/workshops-and-seminars').map((item) => ({
    item,
    metaLabel: 'Workshop',
  }));
  const meetings = getAllPages('events/meetings').map((item) => ({
    item,
    metaLabel: 'Meeting',
  }));

  const allEvents = sortPages(
    [...hackathons, ...workshops, ...meetings].map((entry) => entry.item)
  )
    .slice(0, 3)
    .map((item) => ({
      item,
      metaLabel:
        hackathons.find((entry) => entry.item.slug === item.slug)?.metaLabel ??
        workshops.find((entry) => entry.item.slug === item.slug)?.metaLabel ??
        meetings.find((entry) => entry.item.slug === item.slug)?.metaLabel ??
        'Event',
    }));

  return (
    <>
      <section className="home-hero">
        {/* Sparser than the hackathon hero (34px/particle vs 28) so the
            headline and intro copy stay easy to read over the animation. */}
        <QuantumCanvas pxPerParticle={34} maxCount={48} />
        <h1 className="home-hero__title">Clemson Quantum Club</h1>
        <ConstellationDivider />
        <div className="home-hero__text">
          <p className="home-hero__subtitle">
            We&apos;re Clemson&apos;s student-led quantum computing club. We
            compete in hackathons, host workshops and seminars, and meet
            biweekly to learn and build together.
          </p>
          <p className="home-hero__subtitle">
            No prior experience is required &mdash; students from every major
            are welcome to pick up the fundamentals, join a hackathon team, and
            see what quantum computing can do.
          </p>
        </div>
        <div className="home-hero__visual">
          <SiteImage
            src="/images/iquhack-2025-team.jpg"
            alt="Clemson Quantum Club members at MIT iQuHack 2025"
            className="home-hero__image"
          />
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__header">
          <div>
            <h2 className="home-section__title">News</h2>
          </div>
          <Link href="/news/" className="view-all-link">
            View all news
          </Link>
        </div>
        <div className="preview-grid">
          {recentNews.map((item) => (
            <PreviewCard key={item.slug} item={item} kind="news" />
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__header">
          <div>
            <h2 className="home-section__title">Events</h2>
          </div>
          <Link href="/events/" className="view-all-link">
            View all events
          </Link>
        </div>
        <div className="preview-grid">
          {allEvents.map(({ item, metaLabel }) => (
            <PreviewCard
              key={item.slug}
              item={item}
              kind="event"
              metaLabel={metaLabel}
            />
          ))}
        </div>
      </section>

      <section className="home-section home-section--board">
        <div className="home-section__header">
          <div>
            <h2 className="home-section__title">Executive board</h2>
          </div>
        </div>
        <div className="board-members-list">
          {boardMembers.map((m) => (
            <BoardMember
              key={m.name}
              name={m.name}
              role={m.role}
              description={m.description}
              imageSrc={m.image}
              email={m.email}
              linkedin={m.linkedin}
              github={m.github}
              website={'website' in m ? m.website : undefined}
            />
          ))}
        </div>
      </section>
    </>
  );
}
