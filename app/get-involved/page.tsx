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
            rel="noopener"
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
            rel="noopener"
          >
            TigerQuest listing
          </a>
          .
        </p>
      </section>

      <section id="contact-form">
        <h2>Contact Club Leadership</h2>
        <p>
          If you&apos;re interested in joining, volunteering, or collaborating,
          use the form below and we&apos;ll get back to you within a few days.
        </p>

        <form
          action={`https://formspree.io/f/${siteConfig.formspreeId}`}
          method="POST"
        >
          <label htmlFor="name">Name</label>
          <br />
          <input type="text" id="name" name="name" required />
          <br />

          <label htmlFor="email">Email</label>
          <br />
          <input type="email" id="email" name="email" required />
          <br />

          <label htmlFor="message">Message</label>
          <br />
          <textarea id="message" name="message" rows={5} required></textarea>
          <br />

          <label htmlFor="role">I&apos;m a</label>
          <br />
          <select id="role" name="role">
            <option value="student">Student</option>
            <option value="researcher">Researcher</option>
            <option value="industry">Industry</option>
            <option value="other">Other</option>
          </select>
          <br />

          <button type="submit">Send</button>
        </form>

        <p>
          If you prefer email, contact us at{' '}
          <a href={`mailto:${siteConfig.contactEmail}`}>
            {siteConfig.contactEmail}
          </a>
          .
        </p>
      </section>
    </>
  );
}
