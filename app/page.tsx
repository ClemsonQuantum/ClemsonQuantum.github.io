import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPages, sortPages, formatDate } from '@/lib/content';
import SiteImage from '@/components/SiteImage';
import ScrollReveal from '@/components/ScrollReveal';
import BoardMember from '@/components/BoardMember';
import boardMembers from '@/data/board-members.json';

export const metadata: Metadata = { title: 'Home' };

export default function HomePage() {
  const recentNews = sortPages(getAllPages('news')).slice(0, 6);

  const today = new Date().toISOString().slice(0, 10);
  const allEvents = sortPages([
    ...getAllPages('events/hackathons'),
    ...getAllPages('events/workshops-and-seminars'),
  ]).slice(0, 6);

  return (
    <>
      <ScrollReveal>
        <section className="home-hero">
          <div className="home-hero__content">
            <h1 className="home-hero__title">
              Quantum computing, accessible at Clemson.
            </h1>
            <p className="home-hero__subtitle">
              A student-led club building real quantum circuits, winning
              hackathons, and connecting Clemson students to the quantum
              industry — no prior experience required.
            </p>
            <div className="home-hero__ctas">
              <Link
                href="/get-involved/"
                className="home-hero__cta home-hero__cta--primary"
              >
                Join the Club
              </Link>
              <Link
                href="/events/hackathons/"
                className="home-hero__cta home-hero__cta--secondary"
              >
                See Our Work
              </Link>
            </div>
          </div>
          <div className="home-hero__visual">
            <SiteImage
              src="/images/image-4.jpg"
              alt="The Clemson Quantum team at MIT iQuHack 2025, holding a Clemson Tiger paw flag in front of an iQuHACK display"
              className="home-hero__image"
            />
          </div>
        </section>
      </ScrollReveal>

      <hr className="section-divider" />

      <ScrollReveal>
        <h2 className="section-heading">News</h2>
      </ScrollReveal>
      <div className="home-news-grid">
        {recentNews.map((item, i) => (
          <ScrollReveal key={item.slug} delay={Math.min(i + 1, 3)}>
            <a
              className="home-news-item"
              href={item.href}
              {...(item.isExternal ? { target: '_blank', rel: 'noopener' } : {})}
            >
              {item.image && (
                <SiteImage className="home-news-item__img" src={item.image} alt={item.title} loading="lazy" />
              )}
              <div className="home-news-item__body">
                {item.date && (
                  <span className="home-news-item__date">{formatDate(item.date)}</span>
                )}
                <h3 className="home-news-item__title">
                  {item.title}
                  {item.isExternal && (
                    <span className="home-news-item__external-icon" aria-hidden="true">↗</span>
                  )}
                </h3>
                {item.summary && (
                  <p className="home-news-item__summary">{item.summary}</p>
                )}
              </div>
            </a>
          </ScrollReveal>
        ))}
      </div>
      <Link href="/news/" className="view-all-link">
        View all news <span aria-hidden="true">&rarr;</span>
      </Link>

      <ScrollReveal>
        <h2 className="section-heading">Events</h2>
      </ScrollReveal>
      <div className="home-news-grid">
        {allEvents.map((item, i) => {
          const upcoming = item.date !== null && item.date >= today;
          return (
            <ScrollReveal key={item.slug} delay={Math.min(i + 1, 3)}>
              <a
                className={`home-news-item home-event-item${upcoming ? ' home-event-item--upcoming' : ''}`}
                href={item.href}
                {...(item.isExternal ? { target: '_blank', rel: 'noopener' } : {})}
              >
                {item.image && (
                  <SiteImage className="home-news-item__img" src={item.image} alt={item.title} loading="lazy" />
                )}
                <div className="home-news-item__body">
                  {(item.date || upcoming) && (
                    <div className="home-event-item__top-row">
                      {item.date && (
                        <span className="home-event-item__date-prominent">{formatDate(item.date)}</span>
                      )}
                      {upcoming && (
                        <span className="home-event-item__badge">Upcoming</span>
                      )}
                    </div>
                  )}
                  <h3 className="home-news-item__title">
                    {item.title}
                    {item.isExternal && (
                      <span className="home-news-item__external-icon" aria-hidden="true">↗</span>
                    )}
                  </h3>
                  {item.summary && (
                    <p className="home-news-item__summary">{item.summary}</p>
                  )}
                </div>
              </a>
            </ScrollReveal>
          );
        })}
      </div>
      <Link href="/events/" className="view-all-link">
        View all events <span aria-hidden="true">&rarr;</span>
      </Link>

      <ScrollReveal>
        <h2 className="section-heading">Executive Board</h2>
      </ScrollReveal>
      <div className="board-members-list">
        {boardMembers.map((m) => (
          <BoardMember
            key={m.name}
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
