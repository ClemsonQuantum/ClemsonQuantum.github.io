import type { ComponentPropsWithoutRef } from 'react';
import EventCountdown from './EventCountdown';
import FallingLeaves from './FallingLeaves';
import QuantumCanvas from './QuantumCanvas';

// Render marker divs as interactive client components, dispatched on sentinel
// classes so pages that don't opt in render exactly as before. Shared by the
// event slug routes (hackathons and workshops-and-seminars):
//   .hackathon-hero--quantum  → animated qubit-particle canvas behind the hero
//   .qff-hero--leaves         → on that same hero, also layers the drifting
//                               autumn-leaves canvas (Qiskit Fall Fest pages)
//   .event-countdown          → live countdown (data-target / data-end, plus
//                               optional data-ended-message / data-live-message
//                               for per-event wrap-up and live copy)
export default function MarkdownDiv(
  props: ComponentPropsWithoutRef<'div'> & { node?: unknown },
) {
  // Strip react-markdown's `node` prop so it is never spread onto the DOM.
  const { node, className, children, ...rest } = props;
  void node;
  const classes = className?.split(/\s+/) ?? [];
  if (classes.includes('hackathon-hero--quantum')) {
    return (
      <div className={className} {...rest}>
        <QuantumCanvas />
        {classes.includes('qff-hero--leaves') && <FallingLeaves />}
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
