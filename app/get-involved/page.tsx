import type { Metadata } from 'next';
import type { ComponentType } from 'react';
import siteConfig from '@/data/site-config.json';
import ContactForm from '@/components/ContactForm';
import {
  DiscordIcon,
  LinkedInIcon,
  TigerQuestIcon,
  GitHubIcon,
  GroupMeIcon,
  InstagramIcon,
} from '@/components/icons/ChannelIcons';

export const metadata: Metadata = {
  title: 'Get Involved',
  description:
    'Join the Clemson Quantum Club — meeting times, Discord, TigerQuest, and how to reach the team. Open to all majors and experience levels.',
};

const meetingDayDisplay =
  siteConfig.meetingDay.charAt(0).toUpperCase() + siteConfig.meetingDay.slice(1);

const channels: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { href: siteConfig.discordInvite, label: 'Join the Discord community', Icon: DiscordIcon },
  { href: siteConfig.linkedinUrl, label: 'Follow us on LinkedIn', Icon: LinkedInIcon },
  { href: siteConfig.tigerquestUrl, label: 'Find us on TigerQuest', Icon: TigerQuestIcon },
  { href: siteConfig.githubUrl, label: 'See our code on GitHub', Icon: GitHubIcon },
  { href: siteConfig.groupmeUrl, label: 'Join the GroupMe', Icon: GroupMeIcon },
  { href: siteConfig.instagramUrl, label: 'Follow us on Instagram', Icon: InstagramIcon },
];

export default function GetInvolvedPage() {
  return (
    <article className="about-page">
      <header className="about-page__hero">
        <div className="about-page__hero-copy">
          <h1>Get involved with Clemson Quantum Club</h1>
          <p className="about-page__tagline">
            No application, dues, or prior quantum background required. Drop into
            a meeting, join our Discord, or send us a message — students from
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

      <section className="about-page__section">
        <h2>Ways to join</h2>
        <p className="gi-channels-intro">
          The club lives on Discord and meets in person on a biweekly basis.
          Pick whichever way is easiest to get started — there is no wrong door,
          and no commitment required to show up.
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
