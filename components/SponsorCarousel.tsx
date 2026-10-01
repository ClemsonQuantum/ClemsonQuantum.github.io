import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

// Enough logos per half of the loop to span a wide screen even with one
// sponsor; the second half repeats the first so translateX(-50%) loops
// seamlessly.
const MIN_LOGOS_PER_HALF = 6;
// Scroll speed: seconds per logo, so the strip moves at the same pace however
// many sponsors there are.
const SECONDS_PER_LOGO = 5;

// Endless strip of sponsor logos (MarkdownDiv renders it for a
// <div class="sponsor-carousel">). Pure CSS, no client JavaScript. Every copy
// can be clicked (the one on screen is usually a repeat), but the repeats
// that fill the loop are aria-hidden and their links leave the Tab order, so
// screen readers and keyboard users meet each sponsor once. Hover pauses it;
// keyboard focus stops it at the start so the focused logo is on screen;
// reduced motion shows the logos once, still. `reverse` (class sponsor-carousel--reverse) scrolls it the other
// way, for a second row under the first.
export default function SponsorCarousel({
  children,
  reverse = false,
}: {
  children: ReactNode;
  reverse?: boolean;
}) {
  const logos = Children.toArray(children).filter(isValidElement);
  if (logos.length === 0) return null;
  // The repeats: same links, out of the Tab order.
  const repeats = logos.map((logo) =>
    cloneElement(logo as ReactElement<{ tabIndex?: number }>, { tabIndex: -1 }),
  );
  const copiesPerHalf = Math.max(1, Math.ceil(MIN_LOGOS_PER_HALF / logos.length));
  const copies = copiesPerHalf * 2;
  const duration = `${copiesPerHalf * logos.length * SECONDS_PER_LOGO}s`;

  return (
    <div
      className={reverse ? 'sponsor-carousel sponsor-carousel--reverse' : 'sponsor-carousel'}
      style={{ '--sponsor-carousel-duration': duration } as React.CSSProperties}
    >
      <div className="sponsor-carousel__track">
        {Array.from({ length: copies }, (_, copy) => (
          <div
            key={copy}
            className="sponsor-carousel__set"
            {...(copy > 0 ? { 'aria-hidden': true } : {})}
          >
            {copy > 0 ? repeats : logos}
          </div>
        ))}
      </div>
    </div>
  );
}
