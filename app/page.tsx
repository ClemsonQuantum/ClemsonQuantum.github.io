import Link from 'next/link';
import { getAllPages, getSortedPages, sortPages } from '@/lib/content';
import { getFeaturedEvent, isAfterFeatured } from '@/lib/featured';
import SiteImage from '@/components/SiteImage';
import BoardMember from '@/components/BoardMember';
import PreviewCard from '@/components/PreviewCard';
import QuantumCanvas from '@/components/QuantumCanvas';
import ConstellationDivider from '@/components/ConstellationDivider';
import boardMembers from '@/data/board-members.json';

export default function HomePage() {
  const featured = getFeaturedEvent();
  const newsItems = getSortedPages('news');
  const recentNews = newsItems.slice(0, 3);
  const hackathons = getAllPages('events/hackathons').map((item) => ({
    ...item,
    metaLabel: 'Hackathon',
  }));
  const workshops = getAllPages('events/workshops-and-seminars').map((item) => ({
    ...item,
    metaLabel: 'Workshop',
  }));
  const meetings = getAllPages('events/meetings').map((item) => ({
    ...item,
    metaLabel: 'Meeting',
  }));

  // Each page carries its own label, so sorting can't separate the types.
  // Nothing dated after the featured event: the band below the hero is the
  // next thing coming up (lib/featured.ts).
  const allEvents = [...hackathons, ...workshops, ...meetings].filter(
    (item) => !isAfterFeatured(item, featured),
  );
  const topEvents = sortPages(allEvents).slice(0, 3);

  return (
    <>
      <section className="home-hero">
        {/* Sparser than the hackathon hero (34px/particle vs 28) so the
            headline and intro copy stay easy to read over the animation. */}
        <QuantumCanvas pxPerParticle={34} maxCount={48} />
        <h1 className="home-hero__title">Clemson Quantum Club</h1>
        <ConstellationDivider />
        <div className="home-hero__intro">
          <p>
            Clemson Quantum Club is a student-led group at Clemson University
            that helps students learn and work with quantum computing at any
            level. Since the club started in 2024, members have competed in
            quantum hackathons around the country, attended conferences, tuned
            in to seminars, and presented posters and papers. Members can also
            join Clemson’s two quantum computing Creative Inquiry research
            teams. Any student is welcome at club meetings.
          </p>
          <p>
            Each fall the club runs seminars and workshops on campus and hosts
            a student quantum hackathon, open to every skill level. The next
            one, SC Quantathon v4, is October 22–24, 2027. Teams spend a
            weekend working on challenges written by companies and
            national labs, learn new tools, and meet professionals from
            industry and research along the way.
          </p>
        </div>
      </section>

      {/* Featured-event band. Which event it shows, and the extra facts beside
          its dates, are set by FEATURED_EVENT in lib/featured.ts; the title,
          dates, image (16:9, 1200×675), and Register link come from that
          event's frontmatter. It disappears on its own once the event ends. */}
      {featured && (
        <section className="home-featured" aria-labelledby="featured-event">
          <div className="home-featured__inner">
            {featured.image && (
              <Link
                href={featured.href}
                className="home-featured__art"
                aria-label={`${featured.title} event page`}
              >
                {/* Above-the-fold LCP candidate: override SiteImage's lazy default. */}
                <SiteImage
                  src={featured.image}
                  alt={`${featured.title}, ${featured.dateText}`}
                  className="home-featured__image"
                  width={1200}
                  height={675}
                  loading="eager"
                  fetchPriority="high"
                />
              </Link>
            )}
            <div>
              <p className="home-featured__label">Featured event</p>
              <h2 id="featured-event" className="home-featured__title">
                {featured.title}
              </h2>
              <dl className="home-featured__facts">
                <div className="home-featured__fact">
                  <dt>Dates</dt>
                  <dd>{featured.dateText}</dd>
                </div>
                {featured.facts.map(({ label, value }) => (
                  <div className="home-featured__fact" key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="home-featured__cta-row">
                <Link
                  href={featured.href}
                  className="hackathon-cta hackathon-cta--ghost"
                >
                  Event details
                </Link>
                {featured.registrationUrl && (
                  <a
                    href={featured.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hackathon-cta hackathon-cta--primary"
                  >
                    Register
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="home-section__header">
          <h2 className="home-section__title">News</h2>
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
          <h2 className="home-section__title">Events</h2>
          <Link href="/events/" className="view-all-link">
            View all events
          </Link>
        </div>
        <div className="preview-grid">
          {topEvents.map((item) => (
            <PreviewCard
              // href is unique across event types; slugs alone could collide
              // between directories (e.g. cuhackit in two years/categories).
              key={item.href}
              item={item}
              kind="event"
              metaLabel={item.metaLabel}
            />
          ))}
        </div>
      </section>

      <section id="board" className="home-section home-section--board">
        <div className="home-section__header">
          <h2 className="home-section__title">Executive board</h2>
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
