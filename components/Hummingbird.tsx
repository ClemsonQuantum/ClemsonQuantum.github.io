import { useId } from 'react';
import {
  HB_EYE,
  HB_HEAD,
  HB_PATHS,
  HB_VIEW,
  type HummingbirdVariant,
} from './hummingbirdArt';

// One decorative hummingbird as inline SVG, facing right (PageBirds and
// HummingbirdZone fly it and mirror it to turn). Colors come from the
// --qff-hb-* tokens through the variant class, so the band and dark mode can
// re-ink it; the wing flutter lives in qff.css ("Hummingbirds") and stops
// under reduced motion.
export default function Hummingbird({ variant = 'pink' }: { variant?: HummingbirdVariant }) {
  const wingId = `${useId()}-wing`;
  return (
    <svg
      className={`qff-hb qff-hb--${variant}`}
      viewBox={`0 0 ${HB_VIEW.w} ${HB_VIEW.h}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Solid at the shoulder, see-through at the tip: a wing in motion. */}
        <linearGradient id={wingId} x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" className="qff-hb__wing-root" />
          <stop offset="1" className="qff-hb__wing-tip" />
        </linearGradient>
      </defs>
      <path className="qff-hb__back" d={HB_PATHS.tail} />
      <path className="qff-hb__body" d={HB_PATHS.body} />
      <circle className="qff-hb__back" cx={HB_HEAD.cx} cy={HB_HEAD.cy} r={HB_HEAD.r} />
      <path className="qff-hb__throat" d={HB_PATHS.gorget} />
      <path className="qff-hb__beak" d={HB_PATHS.beak} />
      <circle className="qff-hb__eye" cx={HB_EYE.cx} cy={HB_EYE.cy} r={HB_EYE.r} />
      <path className="qff-hb__wing" d={HB_PATHS.wing} fill={`url(#${wingId})`} />
    </svg>
  );
}
