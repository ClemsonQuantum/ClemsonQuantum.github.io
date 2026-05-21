import type { Metadata } from 'next';
import Link from 'next/link';
import siteConfig from '@/data/site-config.json';
import PastBoardMembers from '@/components/PastBoardMembers';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about the Clemson Quantum Club, a student-led community for accessible quantum computing education, events, and peer support at Clemson.',
};

const focusAreas = [
  {
    title: 'Biweekly access',
    text:
      'Students can drop into biweekly meetings without an application, dues, or prior quantum computing background.',
  },
  {
    title: 'Hands-on learning',
    text:
      'Workshops and study groups help members move from core concepts to writing and running quantum circuits.',
  },
  {
    title: 'Community pathways',
    text:
      'Members find peers for projects, hackathon teams, research conversations, and course planning.',
  },
];

const memberActivities = [
  'Attend beginner-friendly meetings and discussion sessions.',
  'Practice with tools such as Qiskit, PennyLane, and Cirq.',
  'Build teams for quantum hackathons and campus events.',
  'Connect with faculty, student research pathways, and the Creative Inquiry program.',
];

const meetingDayDisplay =
  siteConfig.meetingDay.charAt(0).toUpperCase() + siteConfig.meetingDay.slice(1);

export default function AboutPage() {
  return (
    <article className="about-page">
      <header className="about-page__hero">
        <div className="about-page__hero-copy">
          <h1>Student-led quantum computing at Clemson</h1>
          <p className="about-page__tagline">
            Clemson Quantum Club brings students together to learn quantum
            computing through biweekly meetings, practical workshops, peer
            support, and team-based events.
          </p>
          <div className="about-page__hero-actions">
            <Link href="/get-involved/" className="cta-button cta-button--outline">
              Get involved
            </Link>
            <a
              href={siteConfig.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-button cta-button--outline"
            >
              Join Discord
            </a>
          </div>
        </div>
        <aside className="about-page__meeting-card" aria-label="Meeting details">
          <p className="about-page__card-label">Biweekly meetings</p>
          <dl>
            <div>
              <dt>When</dt>
              <dd>
                {meetingDayDisplay}, {siteConfig.meetingTime}
              </dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>{siteConfig.location}</dd>
            </div>
            <div>
              <dt>Who</dt>
              <dd>Open to students from any major and experience level</dd>
            </div>
          </dl>
        </aside>
      </header>

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
        <div className="about-page__focus-grid">
          {focusAreas.map((area) => (
            <div key={area.title} className="about-page__focus-card">
              <h3>{area.title}</h3>
              <p>{area.text}</p>
            </div>
          ))}
        </div>
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
            Members participate in workshops, hackathons, and student projects,
            including events connected to MIT iQuHACK and the SC Quantathon
            series. Clemson Quantum is also preparing to host{' '}
            <Link href="/events/hackathons/2026-SC-Quantathon-v3/">
              SC Quantathon v3
            </Link>
            , a student-focused quantum hackathon at Clemson.
          </p>
        </div>
        <div className="about-page__link-panel">
          <Link href="/events/">Browse events</Link>
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
