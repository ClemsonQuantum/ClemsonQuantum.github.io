import type { ComponentPropsWithoutRef } from 'react';
import type { ModalFormField } from './ModalFormButton';
import { LazyModalFormButton } from './lazyWidgets';
import { markdownProps } from './markdownProps';

export const PARTICIPANT_FIELDS: ModalFormField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
];

// Fallback name for a #participant-updates sign-up whose marker link has no
// data-event. The content validator requires data-event, so this is only a
// safety net that never names the wrong event.
const DEFAULT_UPDATES_EVENT = 'the event';

// Render the #participant-updates marker link as an in-page modal form
// instead of a mailto: link. Every other link renders as a normal anchor
// with all of its authored attributes (class, target, rel, id, aria-*,
// data-*, download); only react-markdown's `node` prop is dropped.
export default function MarkdownLink(
  props: ComponentPropsWithoutRef<'a'> & { node?: unknown },
) {
  const { className, children, rest, data } = markdownProps(props);
  if (rest.href === '#participant-updates') {
    // e.g. <a href="#participant-updates" data-event="SC Quantathon v4">, so
    // the title, email subject, and confirmation name the right event.
    const eventName = data('event') ?? DEFAULT_UPDATES_EVENT;
    return (
      <LazyModalFormButton
        label={children}
        title={`Get ${eventName} updates`}
        subtitle="Leave your name and email and we’ll send you updates about the event."
        subject={`${eventName}: Participant updates sign-up`}
        subjectTemplate={`{name} has requested participant updates for ${eventName}`}
        successMessage={`You’re signed up. We’ll email ${eventName} updates to you.`}
        submitLabel="Notify me"
        fields={PARTICIPANT_FIELDS}
        className={className}
      />
    );
  }
  return (
    <a className={className} {...rest}>
      {children}
    </a>
  );
}
