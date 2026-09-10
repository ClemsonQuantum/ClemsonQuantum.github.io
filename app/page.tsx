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
        <div className="home-hero__intro">
          <p>
            Clemson Quantum Club is a student-led club at Clemson University
            that helps students learn and work with quantum computing at any
            level. Members compete in hackathons, attend conferences, and tune
            into seminars. Anyone can drop into a meeting, with no application,
            no dues, and no prior quantum background.
          </p>
          <p>
            SC Quantathon is South Carolina’s student quantum hackathon,
            founded by SC Quantum in 2024. Clemson teams have competed every
            year, and in 2026 Clemson Quantum Club hosts the third edition on
            campus. It is open to all skill levels and a great way to explore
            quantum computing, get familiar with ML and AI, learn new skills,
            and meet professionals.
          </p>
        </div>
      </section>

      {/* TEMPORARY: SCQv3 featured-event band. After the event, delete this
          whole <section> and the .home-featured* CSS block. Nothing needs
          restoring — the hero above is self-contained and carries no image. */}
      <section className="home-featured" aria-labelledby="featured-event">
        <div className="home-featured__inner">
          <Link
            href="/events/hackathons/sc-quantathon-v3-2026/"
            className="home-featured__art"
            aria-label="SC Quantathon v3 event page"
          >
            {/* Above-the-fold LCP candidate — override SiteImage's lazy default. */}
            <SiteImage
              src="/images/scq-v3-banner.webp"
              alt="SC Quantathon v3, September 25–27, 2026 at Clemson University"
              className="home-featured__image"
              width={1200}
              height={675}
              loading="eager"
              fetchPriority="high"
            />
          </Link>
          <div className="home-featured__body">
            <p className="home-featured__label">Featured event</p>
            <h2 id="featured-event" className="home-featured__title">
              SC Quantathon v3
            </h2>
            <dl className="home-featured__facts">
              <div className="home-featured__fact">
                <dt>Dates</dt>
                <dd>September 25–27, 2026</dd>
              </div>
              <div className="home-featured__fact">
                <dt>Venue</dt>
                <dd>Watt Family Innovation Center</dd>
              </div>
              <div className="home-featured__fact">
                <dt>Teams</dt>
                <dd>3–5 students</dd>
              </div>
              <div className="home-featured__fact">
                <dt>Cost</dt>
                <dd>Free, meals provided</dd>
              </div>
            </dl>
            <div className="home-featured__cta-row">
              <Link
                href="/events/hackathons/sc-quantathon-v3-2026/"
                className="hackathon-cta hackathon-cta-outline hackathon-cta--violet hackathon-cta--rect"
              >
                See More
              </Link>
              <a
                href="https://forms.gle/vWRNfTQMNQBrGFUh7"
                target="_blank"
                rel="noopener noreferrer"
                className="hackathon-cta hackathon-cta--orange hackathon-cta--rect"
              >
                Apply Now
              </a>
            </div>
          </div>
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
