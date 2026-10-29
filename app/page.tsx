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
        {/* The two paragraphs are the same length (about 415 characters
            each), so on desktop (1100px and wider; the columns stop growing
            at 1120px) both run seven lines and end together. Keep them even
            when editing either one. */}
        <div className="home-hero__intro">
          <p>
            Clemson Quantum Club is a student-led group at Clemson&nbsp;University
            that helps students learn and work with quantum computing at any
            level. Since the club started in 2024, members have competed in
            quantum hackathons around the country, attended conferences, and
            presented posters and papers. Members can also join Clemson’s two
            quantum computing Creative&nbsp;Inquiry research teams. Any student
            is welcome at club meetings.
          </p>
          {/* &nbsp; and the word joiner (&#x2060;) keep the names and the
              hackathon's dates on one line. */}
          <p>
            Each fall the club hosts a free student quantum hackathon, open to
            every major and skill level, and runs seminars and workshops on
            campus, including Qiskit&nbsp;Fall&nbsp;Fest with IBM&nbsp;Quantum. The
            next hackathon, SC&nbsp;Quantathon&nbsp;v4, is October&nbsp;22–&#x2060;24,&nbsp;2027.
            Teams spend a full weekend working on challenges written by companies and
            national labs, learn new quantum tools, and meet professionals from
            industry and research along the way.
          </p>
        </div>
      </section>

      {/* Featured-event band. Which event it shows, and the extra facts beside
          its dates, are set by FEATURED_EVENT in lib/featured.ts; the title,
          dates, image (16:9, 1200×675, with an optional 4:3 phone crop), and
          Register link come from that event's frontmatter. It disappears on its own once the event ends. */}
      {featured && (
        <section className="home-featured" aria-labelledby="featured-event">
          <div className="home-featured__inner">
            {featured.image && (
              <Link
                href={featured.href}
                // No prefetch, as in the Header: prefetching the event page would
                // preload its stylesheet and images on the homepage.
                prefetch={false}
                className={
                  featured.imageMobile
                    ? 'home-featured__art home-featured__art--phone'
                    : 'home-featured__art'
                }
                aria-label={`${featured.title} event page`}
              >
                {/* Above-the-fold LCP candidate: override SiteImage's lazy default.
                    The <picture> keeps React from emitting a preload hint for
                    it, which link prefetch would apply on every page that
                    links home. */}
                <picture>
                  {/* Below 768px the band is one column and the art spans the
                      phone's width, so the 4:3 crop shows the badge larger. */}
                  {featured.imageMobile && (
                    <source media="(max-width: 767px)" srcSet={featured.imageMobile} />
                  )}
                  <SiteImage
                    src={featured.image}
                    // Decorative: the link's aria-label names it, and the
                    // dates are the first fact beside it.
                    alt=""
                    className="home-featured__image"
                    width={1200}
                    height={675}
                    loading="eager"
                    fetchPriority="high"
                  />
                </picture>
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
                  prefetch={false}
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
                    <span className="sr-only"> (opens in a new tab)</span>
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
              // The band's image is already loaded, so the card reuses it,
              // except on phones when the band shows its phone crop instead.
              fullImage={!!featured && !featured.imageMobile && item.href === featured.href}
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
