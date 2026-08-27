import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import Link from 'next/link';
import SiteImage from '@/components/SiteImage';
import PastBoardMembers from '@/components/PastBoardMembers';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about the Clemson Quantum Club, a student-led community for accessible quantum computing education, events, and peer support at Clemson.',
  openGraph: pageOpenGraph({
    title: 'About | Clemson Quantum Club',
    description:
      'Learn about the Clemson Quantum Club, a student-led community for accessible quantum computing education, events, and peer support at Clemson.',
    url: '/about/',
  }),
};

const focusAreas = [
  {
    title: 'Open to everyone',
    text:
      'Drop into any meeting. No application, no dues, no prior quantum background.',
  },
  {
    title: 'Hands-on learning',
    text:
      'Workshops and study groups help members move from core concepts to writing and running quantum circuits.',
  },
  {
    title: 'Connect with people',
    text:
      'Attend events and network with students, industry partners, and academic institutions.',
  },
];

const memberActivities = [
  'Attend beginner-friendly meetings and discussion sessions.',
  'Practice with tools such as Qiskit, PennyLane, and Cirq.',
  'Build teams for quantum hackathons and campus events.',
  'Connect with faculty, student research pathways, and the Creative Inquiry program.',
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
        <SiteImage src="/images/club-photo.webp" alt="Clemson Quantum Club members" />
      </div>

      <section className="about-page__section about-page__section--intro">
        <div>
          <h2>Who we are</h2>
        </div>
        <p>
          Clemson Quantum Club is an interdisciplinary student organization for
          students who want to understand, use, and discuss quantum computing.
          The club is designed for beginners and experienced students alike:
          computer science, physics, engineering, mathematics, and other fields
          all have a place in the conversation.
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
          <p>
            Club meetings combine approachable discussion with hands-on work.
            Members use the club to learn fundamentals, prepare for events, find
            teammates, and stay connected to the quantum computing community at
            Clemson.
          </p>
        </div>
        <ul className="about-page__activity-list">
          {memberActivities.map((activity) => (
            <li key={activity}>{activity}</li>
          ))}
        </ul>
      </section>

      <section className="about-page__section about-page__section--split">
        <div>
          <h2>Events and pathways</h2>
          <p>
            Members participate in workshops, student projects, and hackathons,
            from MIT iQuHack to SC Quantathon, the student-focused quantum
            hackathon series we help run at Clemson.
          </p>
        </div>
        <div className="about-page__link-panel">
          <Link href="/events/">Browse events</Link>
          <Link href="/events/workshops-and-seminars/">Workshops &amp; seminars</Link>
          <Link href="/resources/learning-resources/">Learning resources</Link>
          <Link href="/resources/student-work-and-projects/">
            Student work &amp; projects
          </Link>
        </div>
      </section>

      <PastBoardMembers />
    </article>
  );
}
