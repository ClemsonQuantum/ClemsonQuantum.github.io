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

  // Sort the {item, metaLabel} pairs directly: recovering the label by slug
  // afterwards would mislabel (and key-collide) if two directories ever held
  // the same slug.
  const allEvents = [...hackathons, ...workshops, ...meetings];
  const sortedItems = sortPages(allEvents.map((entry) => entry.item));
  const topEvents = sortedItems
    .slice(0, 3)
    .map((item) => allEvents.find((entry) => entry.item === item)!);

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
            Clemson Quantum Club is a student-led club at Clemson University
            focused on giving students the opportunity to learn and interact
            with quantum computing at any level. We offer the opportunity to
            participate in hackathons, attend conferences, and tune into
            seminars.
          </p>
          <p className="home-hero__subtitle">
            SC Quantathon is a yearly quantum hackathon hosted by Clemson
            Quantum Club since 2024. It is open to all skill levels and
            it&apos;s a great opportunity to explore quantum computing, become
            familiar with ML and AI, learn new skills, and network with
            professionals.
          </p>
        </div>
        <div className="home-hero__visual">
          {/* Above-the-fold LCP candidate — override SiteImage's lazy default. */}
          <SiteImage
            src="/images/iquhack-2025-team.webp"
            alt="Clemson Quantum Club members at MIT iQuHack 2025"
            className="home-hero__image"
            width={1047}
            height={778}
            loading="eager"
            fetchPriority="high"
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
          {topEvents.map(({ item, metaLabel }) => (
            <PreviewCard
              // href is unique across event types; slugs alone could collide
              // between directories (e.g. cuhackit in two years/categories).
              key={item.href}
              item={item}
              kind="event"
              metaLabel={metaLabel}
            />
          ))}
        </div>
      </section>

      <section id="board" className="home-section home-section--board">
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
