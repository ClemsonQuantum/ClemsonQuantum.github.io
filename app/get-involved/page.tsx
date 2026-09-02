import type { Metadata } from 'next';
import { pageOpenGraph } from '@/lib/og';
import type { ComponentType } from 'react';
import siteConfig from '@/data/site-config.json';
import meetingSchedule from '@/data/meeting-schedule.json';
import ContactForm from '@/components/ContactForm';
import SiteImage from '@/components/SiteImage';
import {
  DiscordIcon,
  GroupMeIcon,
  LinkedInIcon,
  TigerQuestIcon,
  GitHubIcon,
  InstagramIcon,
} from '@/components/icons/ChannelIcons';

export const metadata: Metadata = {
  title: 'Get Involved',
  description:
    'Join the Clemson Quantum Club: meeting times, Discord, GroupMe, TigerQuest, and how to reach the team. Open to all majors and experience levels.',
  openGraph: pageOpenGraph({
    title: 'Get Involved | Clemson Quantum Club',
    description:
      'Join the Clemson Quantum Club: meeting times, Discord, GroupMe, TigerQuest, and how to reach the team. Open to all majors and experience levels.',
    url: '/get-involved/',
  }),
};

const meetingDayDisplay = siteConfig.meetingDay;

// Past/next markers resolve at build time (UTC date-string compare) — the same
// doctrine as isUpcoming() in lib/types.ts. They refresh with each deploy;
// never compare dates client-side here (hydration mismatch).
type Meeting = { date: string; title: string; href?: string };

const todayIso = new Date().toISOString().slice(0, 10);
const meetings: (Meeting & { isPast: boolean })[] = meetingSchedule.meetings.map(
  (m) => ({ ...m, isPast: m.date < todayIso }),
);
const nextIndex = meetings.findIndex((m) => !m.isPast);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// String math, not Date/toLocaleString — deterministic across build machines.
function shortDate(iso: string) {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

const channels: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { href: siteConfig.discordInvite, label: 'Join the Discord community', Icon: DiscordIcon },
  { href: siteConfig.groupmeUrl, label: 'Join the GroupMe chat', Icon: GroupMeIcon },
  { href: siteConfig.linkedinUrl, label: 'Follow us on LinkedIn', Icon: LinkedInIcon },
  { href: siteConfig.instagramUrl, label: 'Follow us on Instagram', Icon: InstagramIcon },
  { href: siteConfig.githubUrl, label: 'See our code on GitHub', Icon: GitHubIcon },
  { href: siteConfig.tigerquestUrl, label: 'Find us on TigerQuest', Icon: TigerQuestIcon },
];

export default function GetInvolvedPage() {
  return (
    <article className="about-page">
      <header className="about-page__hero">
        <div className="about-page__hero-copy">
          <h1>Get involved with Clemson Quantum Club</h1>
          <p className="about-page__tagline">
            No application, dues, or prior quantum background required. Drop into
            a meeting, join our Discord or GroupMe, or send us an email. Students from
            every major and experience level are welcome.
          </p>
        </div>
        <aside className="about-page__meeting-card" aria-label="Meeting details">
          <p className="about-page__card-label">Where to find us</p>
          <dl>
            <div>
              <dt>When</dt>
              <dd>
                {meetingDayDisplay} @ {siteConfig.meetingTime}
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

      <section
        className="about-page__section"
        aria-labelledby="gi-schedule-heading"
      >
        <h2 id="gi-schedule-heading">{meetingSchedule.semester} schedule</h2>
        <p className="gi-channels-intro">
          {meetingDayDisplay} at {siteConfig.meetingTime},{' '}
          {siteConfig.location}. Drop in for any of these; no prep or sign-up
          needed.
        </p>
        <div className="gi-schedule-layout">
          <ol className="gi-schedule">
          {meetings.map((m, i) => (
            <li
              key={m.date}
              className={`gi-schedule__item${
                m.isPast ? ' gi-schedule__item--past' : ''
              }${i === nextIndex ? ' gi-schedule__item--next' : ''}`}
            >
              <time className="gi-schedule__date" dateTime={m.date}>
                {shortDate(m.date)}
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
            <picture>
              <source
                srcSet="/images/logo-dark.png"
                media="(prefers-color-scheme: dark)"
                width={208}
                height={176}
              />
              <SiteImage
                src="/images/logo-light.png"
                alt=""
                width={258}
                height={176}
              />
            </picture>
          </div>
        </div>
      </section>

      <section className="about-page__section">
        <h2>Ways to join</h2>
        <p className="gi-channels-intro">
          The club mainly uses Discord, with updates sent on GroupMe, and meets
          in person every other week.
          Pick whichever way is easiest to get started. There&apos;s no wrong
          door, and no commitment required to show up.
        </p>
        <div className="gi-channels">
          {channels
            .filter(({ href }) => href && href !== '#')
            .map(({ href, label, Icon }) => (
            <a
              key={label}
              className="gi-channel"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon className="gi-channel__icon" />
              <span>{label}</span>
            </a>
          ))}
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
          <ContactForm />
        </div>
      </section>
    </article>
  );
}
