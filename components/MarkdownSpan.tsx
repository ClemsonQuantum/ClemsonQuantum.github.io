import type { ComponentPropsWithoutRef } from 'react';
import { LazyDecadeCounter, LazyHummingbirdZone } from './lazyWidgets';
import { markdownProps } from './markdownProps';
import { ShareButton } from './ShareButton';

// Marker spans on the event routes, dispatched on sentinel classes like
// MarkdownDiv:
//   .qff-bird-zone  → home of 1–4 hummingbirds (data-birds; data-variant
//                     pink|lavender colors the first): inline, it stays an
//                     empty marker and the page-wide layer (PageBirds) flies
//                     its birds from there; with qff-bird-zone--box, a patch
//                     positioned by qff.css keeps its birds inside
//                     (HummingbirdZone). Decorative, hidden from assistive
//                     tech ("Hummingbirds" in qff.css)
//   .qff-decade     → a year range whose end year counts up as it scrolls
//                     into view (DecadeCounter); data-from and data-to
//   .share-button   → a "Share" text button for the page (ShareButton:
//                     the share sheet on phones, else copies the link);
//                     data-title names the event, other classes style it
// Every other span renders as written.
export default function MarkdownSpan(
  props: ComponentPropsWithoutRef<'span'> & { node?: unknown },
) {
  const { className, children, rest, classes, data } = markdownProps(props);
  if (classes.includes('qff-bird-zone')) {
    if (!classes.includes('qff-bird-zone--box')) {
      return <span className={className} {...rest} aria-hidden="true" />;
    }
    const birds = Number(data('birds') ?? 1);
    return (
      <LazyHummingbirdZone
        count={Number.isInteger(birds) ? Math.min(Math.max(birds, 1), 4) : 1}
        variant={data('variant') === 'lavender' ? 'lavender' : 'pink'}
        className={classes
          .filter((c) => c !== 'qff-bird-zone' && c !== 'qff-bird-zone--box')
          .join(' ')}
      />
    );
  }
  if (classes.includes('share-button')) {
    return (
      <ShareButton
        title={data('title') ?? 'this event'}
        className={classes.filter((c) => c !== 'share-button').join(' ')}
      />
    );
  }
  if (classes.includes('qff-decade')) {
    const from = Number(data('from'));
    const to = Number(data('to'));
    if (Number.isInteger(from) && Number.isInteger(to) && to > from) {
      return <LazyDecadeCounter from={from} to={to} />;
    }
  }
  return (
    <span className={className} {...rest}>
      {children}
    </span>
  );
}
