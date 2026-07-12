import type { Metadata } from 'next';
import Link from 'next/link';
import QuantumCanvas from '@/components/QuantumCanvas';
import NotFoundJoke from '@/components/NotFoundJoke';

export const metadata: Metadata = { title: 'Page Not Found' };

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
        Return to a definite state &rarr;
      </Link>
    </section>
  );
}
