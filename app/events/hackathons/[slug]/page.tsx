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

// Render the #participant-updates marker link as an in-page modal form
// instead of a mailto: link. Every other link renders as a normal anchor,
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
