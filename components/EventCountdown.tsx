'use client';

import { Fragment, useEffect, useState } from 'react';

interface EventCountdownProps {
  /** Event start, ISO 8601 with explicit UTC offset (e.g. 2026-09-25T17:00:00-04:00). */
  target: string;
  /** Event end, same format. After this the countdown shows a wrap-up message. */
  end?: string;
  /** Static, human-readable start date announced to screen readers. */
  srSummary?: string;
  /** Wrap-up copy shown once `end` has passed. */
  endedMessage?: string;
  /** Copy shown between `target` and `end`. */
  liveMessage?: string;
}

const UNITS = ['Days', 'Hours', 'Minutes', 'Seconds'] as const;

function splitRemaining(ms: number): string[] {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [days, hours, minutes, seconds].map((v) => String(v).padStart(2, '0'));
}

// Live countdown to an event start. `now` stays null on the server and on the
// first client render so the static-export HTML and the hydrated DOM match
// exactly (placeholder digits) — the real clock only starts inside useEffect.
export default function EventCountdown({
  target,
  end,
  srSummary,
  endedMessage = 'This event has wrapped. Thanks for coming!',
  liveMessage = 'Happening now',
}: EventCountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  const targetMs = Date.parse(target);
  const endMs = end ? Date.parse(end) : targetMs;
  const ended = now !== null && now >= endMs;

  useEffect(() => {
    // An unparsable target renders null below, but without this guard the
    // interval would still tick setState forever ("ended" can never be true
    // against NaN).
    if (ended || Number.isNaN(targetMs)) return;
    // Intentional mount-only setState: the clock must start client-side so
    // the SSR placeholder digits hydrate cleanly.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ended, targetMs]);

  if (Number.isNaN(targetMs)) return null;

  if (ended) {
    return (
      <div className="event-countdown" role="timer" aria-live="off">
        <span className="event-countdown-done">{endedMessage}</span>
      </div>
    );
  }

  if (now !== null && now >= targetMs) {
    return (
      <div className="event-countdown" role="timer" aria-live="off">
        <span className="event-countdown-live">{liveMessage}</span>
      </div>
    );
  }

  const digits = now === null ? UNITS.map(() => '--') : splitRemaining(targetMs - now);

  return (
    <div className="event-countdown" role="timer" aria-live="off">
      <span className="event-countdown-label" aria-hidden="true">
        Event starts in
      </span>
      {srSummary ? <span className="sr-only">{srSummary}</span> : null}
      <div className="event-countdown-units" aria-hidden="true">
        {UNITS.map((unit, i) => (
          <Fragment key={unit}>
            {i > 0 && <span className="event-countdown-sep">:</span>}
            <div className="event-countdown-unit">
              <span className="event-countdown-num">{digits[i]}</span>
              <span className="event-countdown-unit-label">{unit}</span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
