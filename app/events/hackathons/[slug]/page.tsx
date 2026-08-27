import type { ComponentPropsWithoutRef } from 'react';
import { createSlugPage } from '@/lib/slugPage';
import ModalFormButton, {
  type ModalFormField,
} from '@/components/ModalFormButton';
import EventCountdown from '@/components/EventCountdown';
import QuantumCanvas from '@/components/QuantumCanvas';

const PARTICIPANT_FIELDS: ModalFormField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
];

const SPONSOR_FIELDS: ModalFormField[] = [
  { name: 'name', label: 'Your name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  {
    name: 'organization',
    label: 'Organization / company',
    type: 'text',
    required: true,
  },
  {
    name: 'message',
    label: 'How you’d like to support (optional)',
    multiline: true,
  },
];

// Render marker links (#participant-updates, #sponsor) as in-page modal forms
// instead of mailto: links. Every other link renders as a normal anchor,
// preserving its class/target/rel (e.g. the "Apply Now" link).
function MarkdownLink({
  href,
  children,
  className,
  target,
  rel,
  title,
}: ComponentPropsWithoutRef<'a'>) {
  if (href === '#participant-updates') {
    return (
      <ModalFormButton
        label={children}
        title="Get SC Quantathon v3 updates"
        subtitle="Drop your name and email and we’ll keep you posted on the event."
        subject="SC Quantathon v3: Participant updates sign-up"
        subjectTemplate="{name} has requested participant updates for SC Quantathon v3"
        successMessage="You’re on the list! We’ll email SC Quantathon v3 updates to you."
        submitLabel="Notify me"
        fields={PARTICIPANT_FIELDS}
      />
    );
  }
  if (href === '#sponsor') {
    return (
      <ModalFormButton
        label={children}
        title="Sponsor SC Quantathon v3"
        subtitle="Tell us a bit about you and we’ll follow up with sponsorship details."
        subject="SC Quantathon v3: Sponsorship inquiry"
        subjectTemplate="{name} from {organization} is interested in sponsoring SC Quantathon v3"
        successMessage="Thanks for your interest in sponsoring SC Quantathon v3! We’ll be in touch soon."
        submitLabel="Get in touch"
        fields={SPONSOR_FIELDS}
      />
    );
  }
  return (
    <a href={href} className={className} target={target} rel={rel} title={title}>
      {children}
    </a>
  );
}

// Render marker divs as interactive client components, dispatched on sentinel
// classes so pages that don't opt in render exactly as before:
//   .hackathon-hero--quantum  → animated qubit-particle canvas behind the hero
//   .event-countdown          → live countdown (data-target / data-end, plus
//                               optional data-ended-message / data-live-message
//                               for per-event wrap-up and live copy)
function MarkdownDiv(props: ComponentPropsWithoutRef<'div'> & { node?: unknown }) {
  // Strip react-markdown's `node` prop so it is never spread onto the DOM.
  const { node, className, children, ...rest } = props;
  void node;
  const classes = className?.split(/\s+/) ?? [];
  if (classes.includes('hackathon-hero--quantum')) {
    return (
      <div className={className} {...rest}>
        <QuantumCanvas />
        {children}
      </div>
    );
  }
  if (classes.includes('event-countdown')) {
    const data = rest as Record<string, unknown>;
    const target = data['data-target'] ?? data['dataTarget'];
    const end = data['data-end'] ?? data['dataEnd'];
    const srSummary = data['data-sr-summary'] ?? data['dataSrSummary'];
    const endedMessage =
      data['data-ended-message'] ?? data['dataEndedMessage'];
    const liveMessage = data['data-live-message'] ?? data['dataLiveMessage'];
    if (typeof target !== 'string') return null;
    return (
      <EventCountdown
        target={target}
        end={typeof end === 'string' ? end : undefined}
        srSummary={typeof srSummary === 'string' ? srSummary : undefined}
        endedMessage={
          typeof endedMessage === 'string' ? endedMessage : undefined
        }
        liveMessage={typeof liveMessage === 'string' ? liveMessage : undefined}
      />
    );
  }
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}

const page = createSlugPage('events/hackathons', {
  components: { a: MarkdownLink, div: MarkdownDiv },
});

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
