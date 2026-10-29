import type { Metadata } from 'next';
import Link from 'next/link';
// A direct import on purpose: this root not-found boundary ships with every
// route, and a next/dynamic wrapper here pulls the whole lazyWidgets registry
// and the dynamic-import runtime into that shared chunk, which outweighs the
// canvas itself (measured 2026-10-28: 3,969 bytes with the canvas inline,
// 7,058 bytes with the lazy wrapper).
import QuantumCanvas from '@/components/QuantumCanvas';
import NotFoundJoke from '@/components/NotFoundJoke';

// canonical: null drops the layout's './' canonical, which resolved to
// /_not-found/ (a URL that doesn't exist) on the exported 404 page.
export const metadata: Metadata = {
  title: 'Page Not Found',
  alternates: { canonical: null },
};

// Quantum 404: a small entangled-qubit cluster drifting above the headline
// (QuantumCanvas already handles reduced motion with a single static frame),
// a randomized physics one-liner, and a single route back to certainty.
export default function NotFound() {
  return (
    <section className="qf-404">
      <div className="qf-404__canvas">
        <QuantumCanvas pxPerParticle={22} maxCount={26} />
      </div>
      <h1 className="qf-404__title">This page is in a superposition</h1>
      <NotFoundJoke />
      <Link href="/" className="hackathon-cta qf-404__cta">
        Collapse back to the homepage <span aria-hidden="true">&rarr;</span>
      </Link>
    </section>
  );
}
