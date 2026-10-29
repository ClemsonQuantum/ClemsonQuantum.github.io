import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/og';
import siteConfig from '@/data/site-config.json';
import meetingSchedule from '@/data/meeting-schedule.json';
import ClubLogo from '@/components/ClubLogo';
import ContactForm from '@/components/ContactForm';
import { CHANNEL_ICONS } from '@/components/icons/ChannelIcons';
import { formatShortDate, todayInClemson } from '@/lib/dates.mjs';
import { CHANNELS, type ChannelId } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Get Involved',
  description:
    'Join Clemson Quantum Club: meeting times, Discord, GroupMe, TigerQuest, and how to reach the team. Open to students of every major and experience level.',
  path: '/get-involved/',
});

// Past/next markers resolve at build time against today's date in Clemson,
// the same rule as isUpcoming() in lib/content.ts. They refresh with each
// deploy; never compare dates client-side here (hydration mismatch).
type Meeting = { date: string; title: string; href?: string };

const todayIso = todayInClemson();
const meetings: (Meeting & { isPast: boolean })[] = meetingSchedule.meetings.map(
  (m) => ({ ...m, isPast: m.date < todayIso }),
);
const nextIndex = meetings.findIndex((m) => !m.isPast);

// Each channel's call to action on this page (the footer shows bare names).
const CHANNEL_TEXT: Record<ChannelId, string> = {
  discord: 'Join the Discord community',
  groupme: 'Get announcements on GroupMe',
  linkedin: 'Connect with us on LinkedIn',
  github: 'See our code on GitHub',
  tigerquest: 'Find us on TigerQuest',
  instagram: 'Follow us on Instagram',
};

export default function GetInvolvedPage() {
  return (
    <article className="about-page">
      <header className="about-page__hero">
        <div className="about-page__hero-copy">
          <h1>Get involved</h1>
          <p className="about-page__tagline">
            Drop into a meeting, join our Discord or GroupMe, or send us an&nbsp;email.
          </p>
        </div>
        <aside className="about-page__meeting-card" aria-label="Meeting details">
          <p className="about-page__card-label">Where to find us</p>
          <dl>
            <div>
              <dt>When</dt>
              <dd>
                {siteConfig.meetingDay} at {siteConfig.meetingTime}
              </dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>{siteConfig.location}</dd>
            </div>
            <div>
              <dt>Who</dt>
              <dd>Open to every student, from any major and experience level</dd>
            </div>
          </dl>
        </aside>
      </header>

      <section
        className="about-page__section"
        aria-labelledby="gi-schedule-heading"
      >
        <h2 id="gi-schedule-heading">{meetingSchedule.semester} schedule</h2>
        <div className="gi-schedule-layout">
          <ol className="gi-schedule" role="list">
          {meetings.map((m, i) => (
            <li
              key={m.date}
              className={`gi-schedule__item${
                m.isPast ? ' gi-schedule__item--past' : ''
              }${i === nextIndex ? ' gi-schedule__item--next' : ''}`}
            >
              <time className="gi-schedule__date" dateTime={m.date}>
                {formatShortDate(m.date)}
              </time>
              <span className="gi-schedule__title">
                {m.href ? <a href={m.href}>{m.title}</a> : m.title}
                {m.isPast && <span className="sr-only"> (already held)</span>}
                {i === nextIndex && (
                  <span className="sr-only"> (next meeting)</span>
                )}
              </span>
            </li>
          ))}
          </ol>
          <div className="gi-schedule-aside">
            {/* Logo spot — swap this image to feature event art instead. */}
            <ClubLogo alt="" large eager />
          </div>
        </div>
      </section>

      <section className="about-page__section">
        <h2>Ways to join</h2>
        {/* Three steps, styled like the About page's "Why join" list. */}
        <ol className="about-page__why-list gi-join-steps" role="list">
          <li className="about-page__why-item">
            <span className="about-page__why-num" aria-hidden="true">01</span>
            <div>
              <h3>Come to a meeting</h3>
              <p>
                {siteConfig.meetingDay} at {siteConfig.meetingTime} in{' '}
                {siteConfig.location}. Open to every student, from any major and
                experience&nbsp;level.
              </p>
            </div>
          </li>
          <li className="about-page__why-item">
            <span className="about-page__why-num" aria-hidden="true">02</span>
            <div>
              <h3>Join Discord or GroupMe</h3>
              <p>
                Most club conversation happens on Discord, and announcements go
                out on&nbsp;GroupMe.
              </p>
            </div>
          </li>
          <li className="about-page__why-item">
            <span className="about-page__why-num" aria-hidden="true">03</span>
            <div>
              <h3>Become a member on TigerQuest</h3>
              <p>
                <a href={siteConfig.tigerquestUrl} target="_blank" rel="noopener noreferrer">
                  Join Clemson&nbsp;Quantum&nbsp;Club on TigerQuest
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>{' '}
                to be listed as an official&nbsp;member.
              </p>
            </div>
          </li>
        </ol>
        <div className="gi-channels">
          {CHANNELS.map(({ id, href }) => {
            const Icon = CHANNEL_ICONS[id];
            return (
              <a
                key={id}
                className="gi-channel"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon className="gi-channel__icon" />
                <span>{CHANNEL_TEXT[id]}</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            );
          })}
        </div>
      </section>

      <section
        id="contact"
        className="about-page__section about-page__section--split"
      >
        <div>
          <h2>Contact the team</h2>
          <p>
            Write to us about joining, collaborating, or sponsoring, and we’ll
            get back to you within a few days. You
            can also email{' '}
            <a href={`mailto:${siteConfig.contactEmail}`}>
              {siteConfig.contactEmail}
            </a>{' '}
            directly.
          </p>
        </div>
        <div>
          <ContactForm />
        </div>
      </section>
    </article>
  );
}
