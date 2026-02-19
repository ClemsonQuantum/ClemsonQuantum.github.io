import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPages, sortPages, formatDate } from '@/lib/content';
import OrganizerRow from '@/components/OrganizerRow';
import PeopleCard from '@/components/PeopleCard';
import boardMembers from '@/data/board-members.json';

export const metadata: Metadata = { title: 'Home' };

export default function HomePage() {
  const recentNews = sortPages(getAllPages('news')).slice(0, 3);

  const allEvents = sortPages([
    ...getAllPages('events/hackathons'),
    ...getAllPages('events/workshops-and-seminars'),
  ]).slice(0, 6);

  return (
    <>
      <h1>Welcome to the Clemson Quantum Club!</h1>

      <section className="home-about">
        <p>
          The Clemson Quantum Club (CQC) is a student-led organization on a
          mission to make quantum computing accessible to every student at
          Clemson University. Whether you study computer science, physics,
          engineering, mathematics, or any other field, quantum technologies are
          shaping the future — and we believe everyone deserves a seat at the
          table.
        </p>
        <p style={{ marginTop: '1rem' }}>
          We host weekly meetings, hands-on coding workshops, and study groups
          that take students from zero quantum knowledge to writing and running
          real quantum circuits. Our members learn industry tools like IBM
          Qiskit, PennyLane, and Cirq through guided bootcamps and
          collaborative projects.
        </p>
        <p style={{ marginTop: '1rem' }}>
          CQC regularly sends teams to quantum hackathons across the country
          and around the world — including MIT&apos;s iQuHACK, the NYUAD
          International Hackathon in Abu Dhabi, and the SC Quantathon series
          where Clemson teams have taken home top honors. In 2026, we are
          bringing our own hackathon to Clemson with SC Quantathon v3, a
          48-hour event open to students from any university.
        </p>
        <p style={{ marginTop: '1rem' }}>
          Beyond competitions, we connect students with research opportunities,
          industry mentors, and a growing network of quantum enthusiasts. No
          prior experience is required — just curiosity and a willingness to
          learn.
        </p>
      </section>

      <h2 className="section-heading" style={{ marginTop: '3rem' }}>News</h2>
      <div className="home-news-grid">
        {recentNews.map((item) => (
          <a
            key={item.slug}
            className="home-news-item"
            href={item.href}
            {...(item.isExternal ? { target: '_blank', rel: 'noopener' } : {})}
          >
            {item.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="home-news-item__img" src={item.image} alt={item.title} loading="lazy" />
            )}
            <div className="home-news-item__body">
              {item.date && (
                <span className="home-news-item__date">{formatDate(item.date)}</span>
              )}
              <h3 className="home-news-item__title">{item.title}</h3>
              {item.summary && (
                <p className="home-news-item__summary">{item.summary}</p>
              )}
            </div>
          </a>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <Link href="/news/" className="view-all-link">View all news &rarr;</Link>
      </div>

      <h2 className="section-heading" style={{ marginTop: '3.5rem' }}>Events</h2>
      <div className="home-news-grid">
        {allEvents.map((item) => (
          <a
            key={item.slug}
            className="home-news-item"
            href={item.href}
            {...(item.isExternal ? { target: '_blank', rel: 'noopener' } : {})}
          >
            {item.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="home-news-item__img" src={item.image} alt={item.title} loading="lazy" />
            )}
            <div className="home-news-item__body">
              {item.date && (
                <span className="home-news-item__date">{formatDate(item.date)}</span>
              )}
              <h3 className="home-news-item__title">{item.title}</h3>
              {item.summary && (
                <p className="home-news-item__summary">{item.summary}</p>
              )}
            </div>
          </a>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <Link href="/events/" className="view-all-link">View all events &rarr;</Link>
      </div>

      <h2 className="section-heading" style={{ marginTop: '4rem' }}>Executive Board</h2>
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
