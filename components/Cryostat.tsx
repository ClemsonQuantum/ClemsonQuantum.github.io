'use client';

import { Children, useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { watchActive } from '@/lib/animation';
import { bandOf, bandOnScreen, bandProgress } from './bandProgress';

// The dilution refrigerator on the Qiskit Fall Fest band, drawn inline so its
// parts can move as the reader scrolls past (MarkdownDiv renders it for a
// <div class="qff-cryostat">). The original static drawings it was built from
// are in docs/archive (qff-cryostat.svg, qff-cryostat-dark.svg).
//
// One number drives everything: --p, the band's scroll progress
// (bandProgress.ts: 0 as the band's top enters the window, 1 once it is just
// under the nav). It is also set on the band as --band-p for the gradient
// phrase. CSS splits it in two (qff.css, "Scroll-driven cryostat"): the
// first half assembles the fridge (plates stack, rods and cables draw in,
// the chip appears), the second half cools it (a frost glow runs down the
// stages, each turning cold with its temperature label, and the chip pulses
// once it reaches 10 mK). The server renders --p = 1, the finished cold
// state, which is also what reduced-motion readers, print, and no-JS see.
// If the band is already on screen when the page loads, it stays finished
// until it has left the screen once, instead of taking itself apart.

const DEFAULT_LABEL =
  'Line illustration of a dilution refrigerator, the chandelier that keeps a quantum processor cold';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

// The flange and the four plates, top to bottom: their temperature, plate
// rectangle, how cold their color gets (--chill), and the sideways offset
// each plate assembles from (--dx).
const STAGES = [
  { label: '300 K', x: 30, y: 22, w: 260, h: 16, chill: 0.2, dx: 0 },
  { label: '50 K', x: 42, y: 60, w: 236, h: 12, chill: 0.45, dx: -26 },
  { label: '4 K', x: 62, y: 140, w: 196, h: 12, chill: 0.7, dx: 22 },
  { label: '1 K', x: 82, y: 220, w: 156, h: 12, chill: 0.88, dx: -18 },
  { label: '10 mK', x: 102, y: 300, w: 116, h: 12, chill: 1, dx: 14 },
] as const;

// Heat exchangers hanging under a plate (index into STAGES).
const CAPSULES = [
  { stage: 1, x: 90, y: 74, w: 28 },
  { stage: 1, x: 202, y: 74, w: 28 },
  { stage: 2, x: 114, y: 154, w: 24 },
  { stage: 2, x: 182, y: 154, w: 24 },
  { stage: 3, x: 140, y: 234, w: 40 },
] as const;

const RODS = [
  { x: 60, y1: 38, y2: 140 },
  { x: 126, y1: 38, y2: 300 },
  { x: 194, y1: 38, y2: 300 },
  { x: 260, y1: 38, y2: 140 },
] as const;

// Coaxial lines as zigzags: x = cx + amp * sin(k * pi / 4), the same points
// the static drawing uses.
function zigzag(cx: number, y0: number, y1: number, amp: number, segments: number): string {
  const step = (y1 - y0) / segments;
  let d = '';
  for (let k = 0; k <= segments; k++) {
    const x = cx + amp * Math.sin((k * Math.PI) / 4);
    d += `${k === 0 ? 'M' : 'L'}${x.toFixed(1)} ${(y0 + k * step).toFixed(1)}`;
  }
  return d;
}

const COAX = [
  { d: zigzag(42, 38, 300, 6, 40), wire: false },
  { d: zigzag(278, 38, 300, 6, 40), wire: false },
  { d: zigzag(74, 152, 300, 5, 24), wire: true },
  { d: zigzag(246, 152, 300, 5, 24), wire: true },
];

const CHIP_DOTS = [152, 160, 168].flatMap((cx) => [396, 404, 412].map((cy) => ({ cx, cy })));

export default function Cryostat({
  label = DEFAULT_LABEL,
  children,
}: {
  label?: string;
  /** Decorations drawn inside the art box (e.g. a hummingbird at the chip). */
  children?: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frostId = `${useId()}-frost`;
  // Markdown hands over the whitespace between tags too; skip the deco box
  // when that is all there is.
  const hasDeco = Children.toArray(children).some(
    (child) => typeof child !== 'string' || child.trim() !== '',
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const band = bandOf(root) as HTMLElement;
    let listening = false;
    let frame = 0;
    let last = -1;
    let armed = false;

    const measure = () => {
      frame = 0;
      if (!armed) {
        if (bandOnScreen(band)) return;
        armed = true;
      }
      const p = Math.round(bandProgress(band) * 1000) / 1000;
      if (p === last) return;
      last = p;
      root.style.setProperty('--p', String(p));
      if (band !== root) band.style.setProperty('--band-p', String(p));
      // A gap between the two thresholds keeps the pulse from flickering.
      if (p >= 0.99) root.dataset.cold = '';
      else if (p < 0.96) delete root.dataset.cold;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const update = (active: boolean, reduced: boolean) => {
      if (reduced) {
        // Finished and cold, no motion: let the CSS defaults (1) show.
        root.style.removeProperty('--p');
        band.style.removeProperty('--band-p');
        delete root.dataset.cold;
        last = -1;
      } else {
        // Settle the value even on an anchor jump straight past the art.
        measure();
      }
      if (active && !reduced && !listening) {
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        listening = true;
      } else if ((!active || reduced) && listening) {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        listening = false;
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const stopWatching = watchActive(band, update, '20% 0px');
    return () => {
      stopWatching();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className="qff-cryostat" role="img" aria-label={label}>
      <div className="qff-cryostat__frame">
        <svg
          className="qff-cryostat__svg"
          viewBox="0 0 320 440"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <radialGradient id={frostId}>
              <stop offset="0" className="qff-cryostat__frost" />
              <stop offset="1" className="qff-cryostat__frost qff-cryostat__frost--edge" />
            </radialGradient>
          </defs>

          <path className="qff-cryostat__draw qff-cryostat__hanger" d="M160 6V22" pathLength={1} />

          {RODS.map((rod, i) => (
            <path
              key={rod.x}
              className="qff-cryostat__draw qff-cryostat__rod"
              style={{ '--i': i } as Vars}
              d={`M${rod.x} ${rod.y1}V${rod.y2}`}
              pathLength={1}
              strokeOpacity={0.7}
            />
          ))}

          {STAGES.map((stage, k) => (
            <g
              key={stage.label}
              className={k === 0 ? 'qff-cryostat__stage qff-cryostat__flange' : 'qff-cryostat__stage'}
              style={{ '--k': k, '--i': Math.max(0, k - 1), '--chill': stage.chill, '--dx': stage.dx } as Vars}
            >
              <rect
                className="qff-cryostat__halo"
                x={stage.x - 24}
                y={stage.y - 18}
                width={stage.w + 48}
                height={stage.h + 36}
                fill={`url(#${frostId})`}
              />
              <rect
                className="qff-cryostat__plate"
                x={stage.x}
                y={stage.y}
                width={stage.w}
                height={stage.h}
                rx={2}
              />
              {CAPSULES.filter((c) => c.stage === k).map((c) => (
                <g key={c.x}>
                  <rect
                    className="qff-cryostat__plate"
                    x={c.x}
                    y={c.y}
                    width={c.w}
                    height={54}
                    rx={c.w / 2}
                  />
                  <path
                    className="qff-cryostat__capsule-line"
                    d={`M${c.x + 6} ${c.y + 8}V${c.y + 46}`}
                    strokeOpacity={0.5}
                  />
                </g>
              ))}
              <path
                className="qff-cryostat__leader"
                d={`M${stage.x + stage.w + 6} ${stage.y + stage.h / 2}H316`}
              />
            </g>
          ))}

          {COAX.map((line, i) => (
            <path
              key={line.d}
              className={line.wire ? 'qff-cryostat__draw qff-cryostat__coax qff-cryostat__coax--wire' : 'qff-cryostat__draw qff-cryostat__coax'}
              style={{ '--i': i % 2 } as Vars}
              d={line.d}
              pathLength={1}
              strokeOpacity={line.wire ? 0.8 : 0.6}
            />
          ))}

          <path className="qff-cryostat__draw qff-cryostat__stem" d="M160 312V356" pathLength={1} />
          <rect className="qff-cryostat__holder" x={130} y={356} width={60} height={30} rx={2} />
          <circle className="qff-cryostat__glow" cx={160} cy={404} r={26} />
          <g className="qff-cryostat__chip">
            <rect x={144} y={388} width={32} height={32} rx={2} />
            {CHIP_DOTS.map((dot) => (
              <circle key={`${dot.cx}-${dot.cy}`} className="qff-cryostat__qubit" cx={dot.cx} cy={dot.cy} r={1.6} />
            ))}
          </g>
          <path className="qff-cryostat__draw qff-cryostat__lead" d="M144 404H130" pathLength={1} />
          <path className="qff-cryostat__draw qff-cryostat__lead" d="M176 404H190" pathLength={1} />
        </svg>

        {STAGES.map((stage, k) => (
          <span
            key={stage.label}
            className="qff-cryostat__temp"
            aria-hidden="true"
            style={{ '--k': k, '--y': stage.y + stage.h / 2 } as Vars}
          >
            {stage.label}
          </span>
        ))}

        {hasDeco && <div className="qff-cryostat__deco">{children}</div>}
      </div>
    </div>
  );
}
