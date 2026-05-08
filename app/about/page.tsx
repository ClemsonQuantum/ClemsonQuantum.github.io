import type { Metadata } from 'next';
import Link from 'next/link';
import siteConfig from '@/data/site-config.json';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about the Clemson Quantum Club — our mission, what we do, and how to get involved.',
};

export default function AboutPage() {
  return (
    <article className="about-page">
      <header className="about-page__header">
        <h1>About the Clemson Quantum Club</h1>
        <p className="about-page__tagline">
          Making quantum computing accessible to every student at Clemson.
        </p>
      </header>

      <section className="about-page__section">
        <h2>Our Mission</h2>
        <p>
          The Clemson Quantum Club (CQC) is a student-led organization on a
          mission to make quantum computing accessible to every student at
          Clemson University. Whether you study computer science, physics,
          engineering, mathematics, or any other field, quantum technologies are
          shaping the future — and we believe everyone deserves a seat at the
          table.
        </p>
      </section>

      <section className="about-page__section">
        <h2>What We Do</h2>
        <p>
          We host weekly meetings, hands-on coding workshops, and study groups
          that take students from zero quantum knowledge to writing and running
          real quantum circuits. Our members learn industry tools like IBM
          Qiskit, PennyLane, and Cirq through guided bootcamps and collaborative
          projects.
        </p>
        <p>
          CQC regularly sends teams to quantum hackathons across the country and
          around the world — including MIT&apos;s iQuHACK, the NYUAD International
          Hackathon in Abu Dhabi, and the SC Quantathon series where Clemson
          teams have taken home top honors. In 2026, we are bringing our own
          hackathon to Clemson with{' '}
          <Link href="/events/hackathons/2026-SC-Quantathon-v3/">
            SC Quantathon v3
          </Link>
          , a 48-hour event open to students from any university.
        </p>
        <p>
          Beyond competitions, we connect students with research opportunities,
          industry mentors, and a growing network of quantum enthusiasts. No
          prior experience is required — just curiosity and a willingness to
          learn.
        </p>
      </section>

      <section className="about-page__section about-page__section--cta">
        <h2>Get Involved</h2>
        <p>
          We meet weekly on {siteConfig.meetingDay} at {siteConfig.meetingTime}{' '}
          in {siteConfig.location}. Drop in any time — there&apos;s no
          application or commitment required to attend.
        </p>
        <div className="about-page__ctas">
          <Link href="/get-involved/" className="cta-button">
            Meeting details &amp; contact
          </Link>
          <a
            href={siteConfig.discordInvite}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-button cta-button--outline"
          >
            Join our Discord
          </a>
        </div>
      </section>
    </article>
  );
}
