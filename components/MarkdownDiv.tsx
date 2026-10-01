import type { ComponentPropsWithoutRef } from 'react';
import EventCountdown from './EventCountdown';
import { markdownProps } from './markdownProps';
import SponsorCarousel from './SponsorCarousel';
import {
  LazyCloudSky,
  LazyCryostat,
  LazyLeaderboard,
  LazyOpenLinkedDetails,
  LazyPageBirds,
  LazyPageClouds,
  LazyQuantumCanvas,
} from './lazyWidgets';
import { LazyConstellationSky, LazyScrollStage } from './scq4/lazy';

// Render marker divs as interactive client components, dispatched on sentinel
// classes so pages that don't opt in render exactly as before. Part of
// EVENT_COMPONENTS (eventComponents.ts), used by both event slug routes:
//   .hackathon-hero--quantum  → animated qubit-particle canvas behind the hero
//   .qff-hero--sky            → drifting-clouds canvas behind the Qiskit Fall
//                               Fest hero (CloudSky); data-hummingbirds and
//                               data-soarers (0–3 each) set how many
//                               hummingbirds and gliding birds fly above the copy
//   .event-countdown          → live countdown (data-target / data-end, plus
//                               optional data-sr-summary, data-ended-message
//                               and data-live-message)
//   .qff-leaderboard          → live leaderboard read from a published Google
//                               Sheet CSV (data-src; data-sort asc|desc,
//                               data-score-label, data-highlight, data-label,
//                               data-empty); see content/README.md
//   .qff-page                 → the Fall Fest page wrapper; adds the layer
//                               where the hummingbirds roam the whole page
//                               (PageBirds), starting from each inline
//                               .qff-bird-zone
//   .qff-page-clouds          → faint clouds drifting behind the whole page
//                               (PageClouds; one per page)
//   .qff-challenges           → the Fall Fest challenge list; a same-page
//                               link to one of its rows (#challenge-3) opens
//                               that row before the jump (OpenLinkedDetails)
//   .qff-cryostat             → the Fall Fest band's dilution refrigerator,
//                               assembled and cooled by scroll (Cryostat;
//                               data-label is its alt text; children are
//                               decorations drawn inside the art box)
//   .sponsor-carousel         → endless strip of the sponsor logos inside it
//                               (SponsorCarousel); add sponsor-carousel--reverse
//                               to scroll a second row the other way
//   .scq4-stage               → SC Quantathon v4 scroll stage (fixed canvas
//                               driven by data-stage cues; see
//                               components/scq4/stageTimeline.ts)
//   .scq4-hero--sky           → the real sky over Clemson behind the v4 hero
//                               (ConstellationSky)
// The canvases and Fall Fest widgets come from lazyWidgets.tsx, so only the
// pages that use one download it.
// MarkdownDiv runs on the server at build time (static export), so this is
// "had the event ended when the site was built?". EventCountdown uses it to
// render the wrap-up message in the HTML instead of flashing "--" digits.
function endedBy(iso: string): boolean {
  const ms = Date.parse(iso);
  return !Number.isNaN(ms) && Date.now() >= ms;
}

export default function MarkdownDiv(
  props: ComponentPropsWithoutRef<'div'> & { node?: unknown },
) {
  const { className, children, rest, classes, data: attr } = markdownProps(props);
  // data-hummingbirds / data-soarers: whole numbers 0–3 (the validator checks).
  const birdCount = (name: string) => {
    const n = Number(attr(name) ?? 0);
    return Number.isInteger(n) ? Math.min(Math.max(n, 0), 3) : 0;
  };
  if (classes.includes('qff-leaderboard')) {
    const sort = attr('sort');
    const highlight = Number(attr('highlight'));
    return (
      <LazyLeaderboard
        src={attr('src')}
        sort={sort === 'asc' || sort === 'desc' ? sort : undefined}
        scoreLabel={attr('score-label')}
        highlight={Number.isFinite(highlight) && highlight > 0 ? highlight : undefined}
        label={attr('label') ?? 'Leaderboard'}
        emptyMessage={attr('empty')}
      />
    );
  }
  if (classes.includes('qff-page-clouds')) {
    return <LazyPageClouds />;
  }
  if (classes.includes('qff-page')) {
    return (
      <div className={className} {...rest}>
        {children}
        <LazyPageBirds />
      </div>
    );
  }
  if (classes.includes('qff-challenges')) {
    return (
      <div className={className} {...rest}>
        <LazyOpenLinkedDetails />
        {children}
      </div>
    );
  }
  if (classes.includes('qff-cryostat')) {
    return <LazyCryostat label={attr('label')}>{children}</LazyCryostat>;
  }
  if (classes.includes('sponsor-carousel')) {
    return (
      <SponsorCarousel reverse={classes.includes('sponsor-carousel--reverse')}>
        {children}
      </SponsorCarousel>
    );
  }
  if (classes.includes('scq4-stage')) {
    return <LazyScrollStage />;
  }
  if (classes.includes('scq4-hero--sky')) {
    return (
      <div className={className} {...rest}>
        <LazyConstellationSky />
        {children}
      </div>
    );
  }
  if (classes.includes('qff-hero--sky')) {
    return (
      <div className={className} {...rest}>
        <LazyCloudSky hummingbirds={birdCount('hummingbirds')} soarers={birdCount('soarers')} />
        {children}
      </div>
    );
  }
  if (classes.includes('hackathon-hero--quantum')) {
    return (
      <div className={className} {...rest}>
        <LazyQuantumCanvas />
        {children}
      </div>
    );
  }
  if (classes.includes('event-countdown')) {
    const target = attr('target');
    if (!target) return null;
    const end = attr('end');
    return (
      <EventCountdown
        target={target}
        end={end}
        endedAtBuild={endedBy(end ?? target)}
        srSummary={attr('sr-summary')}
        endedMessage={attr('ended-message')}
        liveMessage={attr('live-message')}
      />
    );
  }
  return (
    <div className={className} {...rest}>
      {children}
    </div>
  );
}
