import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/og';
import Link from 'next/link';
import SiteImage from '@/components/SiteImage';
import PastBoardMembers from '@/components/PastBoardMembers';
import { getAllPages } from '@/lib/content';
import { formatMonthRange } from '@/lib/dates.mjs';
import { getGoverningDocuments } from '@/lib/governingDocuments';
import pastBoardMembers from '@/data/past-board-members.json';

// Formatted here at build time (a bad month fails the build) and trimmed to
// the card fields; `profile` is reference-only and stays out of the page.
const pastBoardCards = pastBoardMembers.map((m) => ({
  name: m.name,
  role: m.role,
  tenure: formatMonthRange(m.start, m.end),
  image: m.image,
  linkedin: m.linkedin,
}));

export const metadata: Metadata = pageMetadata({
  title: 'About',
  description:
    'Who Clemson Quantum Club is, what members do, and who has led the club since 2024.',
  path: '/about/',
});

const focusAreas = [
  {
    title: 'Open to every student',
    text:
      'Any student can come to any meeting.',
  },
  {
    title: 'Write and run circuits',
    text:
      'In workshops and study sessions, members write and run their own quantum circuits.',
  },
  {
    title: 'Connect with people',
    text:
      'Meet students, researchers, and people from industry at club events and hackathons.',
  },
];

const memberActivities = [
  'Attend beginner-friendly meetings and discussion sessions.',
  'Practice with tools such as Qiskit, PennyLane, and Cirq.',
  'Build teams for quantum hackathons and campus events.',
  'Meet faculty and join student research, including two quantum computing Creative\u00a0Inquiry teams.',
];

export default function AboutPage() {
  // Quick fact under "Who we are": every published entry on the Hackathons
  // page whose last day has passed. Drafts (staged events) never count, in
  // the dev server either; unlisted pages are already out of getAllPages.
  // Like the Upcoming badges, it is counted when the site is built.
  const hackathonsAttended = getAllPages('events/hackathons').filter(
    (p) => !p.draft && !p.isUpcoming,
  ).length;

  return (
    <article className="about-page">
      <header className="about-page__hero">
        <div className="about-page__hero-copy">
          <h1>Student-led quantum computing at Clemson</h1>
        </div>
      </header>

      <div className="about-page__photo">
        {/* The page's largest image, in the first screen: load it eagerly.
            The <picture> keeps React from emitting a preload hint for it,
            which link prefetch would apply on every page that links here. */}
        <picture>
          <SiteImage
            src="/images/club-photo.webp"
            alt="Clemson Quantum Club members"
            loading="eager"
            fetchPriority="high"
          />
        </picture>
      </div>

      <section className="about-page__section about-page__section--intro">
        <div>
          <h2>Who we are</h2>
          <dl className="about-page__facts">
            <div>
              <dt>Founded</dt>
              <dd>2024</dd>
            </div>
            <div>
              <dt>Hackathons attended</dt>
              <dd>{hackathonsAttended}</dd>
            </div>
          </dl>
        </div>
        <p>
          Clemson Quantum Club is a student organization for any Clemson
          student who wants to learn and use quantum computing. Members come
          from computer science, physics, engineering, mathematics, and other
          majors; some are new to the subject and some are Ph.D. students
          doing quantum research. Members can also join Clemson’s two quantum
          computing Creative&nbsp;Inquiry research teams: Hands&#x2011;on&nbsp;Quantum&nbsp;Computing
          and Quantum&nbsp;Optimization for Resilient&nbsp;Systems.
        </p>
      </section>

      <section className="about-page__section">
        <div className="about-page__section-heading">
          <h2>Why join</h2>
        </div>
        <ol className="about-page__why-list" role="list">
          {focusAreas.map((area, i) => (
            <li key={area.title} className="about-page__why-item">
              <span className="about-page__why-num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3>{area.title}</h3>
                <p>{area.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-page__section about-page__section--split">
        <div>
          <h2>What members do</h2>
          <p>Meetings mix discussion with coding.</p>
        </div>
        <ul className="about-page__activity-list" role="list">
          {memberActivities.map((activity) => (
            <li key={activity}>{activity}</li>
          ))}
        </ul>
      </section>

      <section className="about-page__section about-page__section--split">
        <div>
          <h2>Events and resources</h2>
          <p>
            Members participate in workshops, student projects, and hackathons,
            including one the club hosts every&nbsp;fall.
          </p>
        </div>
        <div className="about-page__link-panel">
          <Link href="/events/">Events</Link>
          <Link href="/events/workshops-and-seminars/">Workshops &amp; Seminars</Link>
          <Link href="/resources/learning-resources/">Learning Resources</Link>
          <Link href="/resources/student-work-and-projects/">
            Student Work &amp; Projects
          </Link>
        </div>
      </section>

      <section className="about-page__section about-page__section--split">
        <div>
          <h2>How the club is run</h2>
          <p>
            The Constitution, Bylaws, and Code of Conduct set out how the club
            works.
          </p>
        </div>
        {/* The three documents themselves, each with a small button to open
            it; a PDF that isn't uploaded yet says "Coming soon". */}
        <ul className="about-page__docs" role="list">
          {getGoverningDocuments().map((doc) => (
            <li key={doc.title} className="about-page__doc">
              <span className="about-page__doc-title">{doc.title}</span>
              {!doc.isPdf ? (
                <Link className="hackathon-cta hackathon-cta--ghost about-page__doc-btn" href={doc.href}>
                  View page
                  <span className="sr-only"> ({doc.title})</span>
                </Link>
              ) : doc.available ? (
                <a
                  className="hackathon-cta hackathon-cta--ghost about-page__doc-btn"
                  href={encodeURI(doc.href)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View PDF{doc.size && ` (${doc.size})`}
                  <span className="sr-only"> ({doc.title}, opens in a new tab)</span>
                </a>
              ) : (
                <span className="about-page__doc-soon">Coming soon</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <PastBoardMembers members={pastBoardCards} />
    </article>
  );
}
