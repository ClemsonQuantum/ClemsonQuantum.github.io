import type { ComponentPropsWithoutRef } from 'react';
import { createSlugPage } from '@/lib/slugPage';
import ModalFormButton, {
  type ModalFormField,
} from '@/components/ModalFormButton';
import MarkdownDiv from '@/components/MarkdownDiv';

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

const page = createSlugPage('events/hackathons', {
  components: { a: MarkdownLink, div: MarkdownDiv },
});

export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
