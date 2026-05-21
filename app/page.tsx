import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPages, sortPages } from '@/lib/content';
import SiteImage from '@/components/SiteImage';
import BoardMember from '@/components/BoardMember';
import PreviewCard from '@/components/PreviewCard';
import boardMembers from '@/data/board-members.json';

export const metadata: Metadata = { title: 'Home' };

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

  const today = new Date().toISOString().slice(0, 10);
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

  const proofItems = [
    {
      value: `${hackathons.length + workshops.length + meetings.length}+`,
      label: 'Club events, competitions, and workshops in the current archive',
    },
    {
      value: `${newsItems.length}`,
      label: 'Recent news features highlighting Clemson Quantum work',
    },
    {
      value: `${boardMembers.length}`,
      label: 'Student leaders and faculty support shaping the club this year',
    },
  ];

  return (
    <>
      <section className="home-hero">
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">Clemson Quantum Club</p>
          <h1 className="home-hero__title">
            Quantum education, competition, and community at Clemson.
          </h1>
          <p className="home-hero__subtitle">
            Clemson Quantum is a student-led club connecting students to
            workshops, hackathons, research-minded peers, and the broader
            quantum ecosystem without requiring prior experience.
          </p>
          <div className="home-hero__ctas">
            <Link
              href="/get-involved/"
              className="home-hero__cta home-hero__cta--primary"
            >
              Join the club
            </Link>
            <Link
              href="/events/"
              className="home-hero__cta home-hero__cta--secondary"
            >
              Explore events
            </Link>
          </div>
        </div>
        <div className="home-hero__visual">
          <SiteImage
            src="/images/image-4.jpg"
            alt="Clemson Quantum members at MIT iQuHack 2025"
            className="home-hero__image"
          />
        </div>
      </section>

      <section className="home-proof">
        <div className="home-proof__intro">
          <p className="home-proof__eyebrow">What the club does</p>
          <h2 className="home-section__title">Built around learning by doing.</h2>
          <p className="home-section__lead">
            The club brings together quantum-curious students across disciplines
            through hands-on learning, team-based competition, and a growing
            network of collaborators at Clemson and beyond.
          </p>
        </div>
        <div className="home-proof__grid">
          {proofItems.map((item) => (
            <div key={item.label} className="home-proof__item">
              <span className="home-proof__value">{item.value}</span>
              <p className="home-proof__label">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__header">
          <div>
            <p className="home-section__eyebrow">Latest coverage</p>
            <h2 className="home-section__title">Recent news</h2>
          </div>
          <Link href="/news/" className="view-all-link">
            View all news <span aria-hidden="true">&rarr;</span>
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
            <p className="home-section__eyebrow">Competitions and programming</p>
            <h2 className="home-section__title">Recent events</h2>
          </div>
          <Link href="/events/" className="view-all-link">
            View all events <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <div className="preview-grid">
          {allEvents.map(({ item, metaLabel }) => {
            const upcoming = item.date !== null && item.date >= today;
            return (
              <PreviewCard
                key={item.slug}
                item={item}
                kind="event"
                metaLabel={metaLabel}
                badge={upcoming ? 'Upcoming' : null}
              />
            );
          })}
        </div>
      </section>

      <section className="home-section home-section--board">
        <div className="home-section__header">
          <div>
            <p className="home-section__eyebrow">Leadership</p>
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
          />
        ))}
        </div>
      </section>
    </>
  );
}
