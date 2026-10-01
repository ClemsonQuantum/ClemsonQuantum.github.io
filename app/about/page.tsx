import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/og';
import Link from 'next/link';
import SiteImage from '@/components/SiteImage';
import PastBoardMembers from '@/components/PastBoardMembers';
import { formatMonthRange } from '@/lib/dates.mjs';
import pastBoardMembers from '@/data/past-board-members.json';

// Formatted here at build time (a bad month fails the build) and trimmed to
// the card fields; `profile` is reference-only and stays out of the page.
const pastBoardCards = pastBoardMembers.map((m) => ({
  name: m.name,
  role: m.role,
  tenure: formatMonthRange(m.start, m.end),
  image: m.image,
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
      'In workshops and study groups, members write and run their own quantum circuits.',
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
  'Meet faculty and join student research, including two quantum computing Creative Inquiry teams.',
];

export default function AboutPage() {
  return (
    <article className="about-page">
      <header className="about-page__hero">
        <div className="about-page__hero-copy">
          <h1>Student-led quantum computing at Clemson</h1>
        </div>
      </header>

      <div className="about-page__photo">
        {/* The page's largest image, in the first screen: load it eagerly. */}
        <SiteImage
          src="/images/club-photo.webp"
          alt="Clemson Quantum Club members"
          loading="eager"
          fetchPriority="high"
        />
      </div>

      <section className="about-page__section about-page__section--intro">
        <div>
          <h2>Who we are</h2>
        </div>
        <p>
          Clemson Quantum Club is a student organization for any Clemson
          student who wants to learn and use quantum computing. Members come
          from computer science, physics, engineering, mathematics, and other
          majors; some are new to the subject and some are Ph.D. students
          doing quantum research. Members can also join Clemson’s two quantum
          computing Creative Inquiry research teams: Hands-on Quantum Computing
          and Quantum Optimization for Resilient Systems.
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
        <ul className="about-page__activity-list">
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
            including one the club hosts every fall.
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

      <PastBoardMembers members={pastBoardCards} />
    </article>
  );
}
