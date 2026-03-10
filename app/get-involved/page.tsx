import type { Metadata } from 'next';
import siteConfig from '@/data/site-config.json';

export const metadata: Metadata = { title: 'Get Involved' };

export default function GetInvolvedPage() {
  return (
    <>
      <h1>Get Involved</h1>
      <section>
        <p>
          Join us! Below are the regular meeting details and ways to get in
          touch with club leadership.
        </p>
      </section>

      <section id="meetings">
        <h2>Meeting Time</h2>
        <p>
          We meet weekly on {siteConfig.meetingDay} at {siteConfig.meetingTime}.
        </p>

        <h2>Location</h2>
        <p>
          {siteConfig.location} ({siteConfig.locationNote}).
        </p>

        <h2>Discord</h2>
        <p>
          Join our community on Discord for announcements, help, and project
          chat:{' '}
          <a
            href={siteConfig.discordInvite}
            target="_blank"
            rel="noopener noreferrer"
          >
            Join the Discord
          </a>
          .
        </p>

        <h2>TigerQuest</h2>
        <p>
          Find our event sign-ups and official listings on TigerQuest:{' '}
          <a
            href={siteConfig.tigerquestUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            TigerQuest listing
          </a>
          .
        </p>
      </section>

      <section id="contact">
        <h2>Contact Club Leadership</h2>
        <p>
          If you&apos;re interested in joining, volunteering, or collaborating,
          reach out and we&apos;ll get back to you within a few days.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="cta-button"
          >
            Email us at {siteConfig.contactEmail}
          </a>
        </p>
      </section>
    </>
  );
}
