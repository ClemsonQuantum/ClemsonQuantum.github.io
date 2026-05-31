import type { Metadata } from 'next';
import Link from 'next/link';
import siteConfig from '@/data/site-config.json';

export const metadata: Metadata = {
  title: 'Get Involved',
  description:
    'Join the Clemson Quantum Club — meeting times, Discord, TigerQuest, and how to reach the team. Open to all majors and experience levels.',
};

const meetingDayDisplay =
  siteConfig.meetingDay.charAt(0).toUpperCase() + siteConfig.meetingDay.slice(1);

// The contact form posts directly to Formspree. Until a real form ID is set in
// data/site-config.json (replacing the "your-form-id" placeholder), the form is
// shown but clearly marked as not-yet-live, and the direct links remain the
// primary way to reach the team.
const formReady =
  Boolean(siteConfig.formspreeId) && siteConfig.formspreeId !== 'your-form-id';
const formAction = `https://formspree.io/f/${siteConfig.formspreeId}`;

export default function GetInvolvedPage() {
  return (
    <article className="about-page">
      <header className="about-page__hero">
        <div className="about-page__hero-copy">
          <p className="about-page__eyebrow">Join the club</p>
          <h1>Get involved with Clemson Quantum</h1>
          <p className="about-page__tagline">
            No application, dues, or prior quantum background required. Drop into
            a meeting, join our Discord, or send us a message — students from
            every major and experience level are welcome.
          </p>
          <div className="about-page__hero-actions">
            <a
              href={siteConfig.discordInvite}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-button"
            >
              Join the Discord
            </a>
            <a href="#contact" className="cta-button cta-button--outline">
              Contact the team
            </a>
          </div>
        </div>
        <aside className="about-page__meeting-card" aria-label="Meeting details">
          <p className="about-page__card-label">Where to find us</p>
          <dl>
            <div>
              <dt>When</dt>
              <dd>
                {meetingDayDisplay}, {siteConfig.meetingTime}
              </dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>
                {siteConfig.location} ({siteConfig.locationNote})
              </dd>
            </div>
            <div>
              <dt>Who</dt>
              <dd>Open to students from any major and experience level</dd>
            </div>
          </dl>
        </aside>
      </header>

      <section className="about-page__section about-page__section--split">
        <div>
          <h2>Ways to join</h2>
          <p>
            The club lives on Discord and meets in person on a biweekly basis.
            Pick whichever way is easiest to get started — there is no wrong
            door, and no commitment required to show up.
          </p>
        </div>
        <div className="about-page__link-panel">
          <a
            href={siteConfig.discordInvite}
            target="_blank"
            rel="noopener noreferrer"
          >
            Join the Discord community
          </a>
          <a
            href={siteConfig.tigerquestUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Find us on TigerQuest
          </a>
          <a
            href={siteConfig.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow us on LinkedIn
          </a>
          <Link href="/events/">Browse upcoming events</Link>
        </div>
      </section>

      <section
        id="contact"
        className="about-page__section about-page__section--split"
      >
        <div>
          <h2>Contact the team</h2>
          <p>
            Interested in joining, volunteering, sponsoring, or collaborating?
            Send us a note and we&apos;ll get back to you within a few days. You
            can also email{' '}
            <a href={`mailto:${siteConfig.contactEmail}`}>
              {siteConfig.contactEmail}
            </a>{' '}
            directly.
          </p>
        </div>
        <div>
          {!formReady && (
            <p className="form-note">
              Our contact form is being set up. In the meantime, the fastest way
              to reach us is the{' '}
              <a
                href={siteConfig.discordInvite}
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord
              </a>{' '}
              or email above.
            </p>
          )}
          <form action={formAction} method="POST">
            <label htmlFor="gi-name">Name</label>
            <input id="gi-name" type="text" name="name" autoComplete="name" required />

            <label htmlFor="gi-email">Email</label>
            <input
              id="gi-email"
              type="email"
              name="email"
              autoComplete="email"
              required
            />

            <label htmlFor="gi-message">Message</label>
            <textarea id="gi-message" name="message" rows={5} required />

            <input
              type="hidden"
              name="_subject"
              value="New message from the Clemson Quantum website"
            />
            <button type="submit">Send message</button>
          </form>
        </div>
      </section>
    </article>
  );
}
