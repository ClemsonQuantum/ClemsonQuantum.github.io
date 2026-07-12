interface ConstellationDividerProps {
  /** Footer variant: wider, slightly faded. */
  wide?: boolean;
}

// Decorative "mini Bloch sphere" constellation divider: hairline wires run in
// from both sides through small constellation dots to a central sphere with an
// equator and a state-vector arrow. Replaces the old radial-gradient
// entangled-pair flourish. Strokes/fills use the theme tokens, so light/dark
// recolor automatically. Draw-in: every path carries pathLength={1} so the
// stroke-dash CSS (see "Constellation divider" section in style.css) can
// animate dashoffset 1 -> 0 when ScrollReveal flips reveal-init to reveal-in;
// above-the-fold instances and reduced-motion visitors get it fully drawn.
export default function ConstellationDivider({
  wide = false,
}: ConstellationDividerProps) {
  return (
    <svg
      className={`constellation-divider${wide ? ' constellation-divider--wide' : ''}`}
      viewBox="0 0 260 36"
      aria-hidden="true"
      focusable="false"
    >
      {/* Entanglement waves in from each edge: a sine built from smooth
          quadratic half-waves (10.5px each, ~3px amplitude), linking the
          constellation dots to the sphere like a shared wavefunction. */}
      <path
        className="cd-path"
        pathLength={1}
        d="M4 18 q5.25 -6.5 10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0"
      />
      <path
        className="cd-path"
        pathLength={1}
        d="M151 18 q5.25 -6.5 10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0 t10.5 0"
        style={{ '--cd-delay': '0.15s' } as React.CSSProperties}
      />
      {/* Constellation dots on the wave nodes (zero crossings) */}
      <circle className="cd-dot" cx="35.5" cy="18" r="2.3" />
      <circle
        className="cd-dot cd-dot--violet"
        cx="224.5"
        cy="18"
        r="2.3"
        style={{ '--cd-delay': '0.2s' } as React.CSSProperties}
      />
      {/* Bloch sphere: outline, equator, state vector */}
      <circle
        className="cd-path cd-sphere"
        pathLength={1}
        cx="130"
        cy="18"
        r="13"
        style={{ '--cd-delay': '0.3s' } as React.CSSProperties}
      />
      <ellipse
        className="cd-path cd-sphere"
        pathLength={1}
        cx="130"
        cy="18"
        rx="13"
        ry="4.6"
        style={{ '--cd-delay': '0.45s' } as React.CSSProperties}
      />
      <path
        className="cd-path cd-vector"
        pathLength={1}
        d="M130 18 L137.6 8.4"
        style={{ '--cd-delay': '0.65s' } as React.CSSProperties}
      />
      <circle
        className="cd-dot cd-dot--vector"
        cx="137.6"
        cy="8.4"
        r="2.5"
        style={{ '--cd-delay': '0.8s' } as React.CSSProperties}
      />
    </svg>
  );
}
