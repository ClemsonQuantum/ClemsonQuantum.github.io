'use client';

import { useEffect, useState } from 'react';

const JOKES = [
  'You measured this URL and its wavefunction collapsed to nothing.',
  "Until you clicked, this page both existed and didn't. Sorry, it didn't.",
  "This page seems to have tunneled through the site's boundary. It's on the other side now.",
];

// Random 404 one-liner. SSR and the first client render both show JOKES[0]
// (static export needs matching hydration); the random pick swaps in after
// mount, so each visit collapses to a different joke.
export default function NotFoundJoke() {
  const [joke, setJoke] = useState(JOKES[0]);

  useEffect(() => {
    // Intentional mount-only setState: SSR renders a fixed joke; the random
    // pick happens client-side so hydration always matches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJoke(JOKES[Math.floor(Math.random() * JOKES.length)]);
  }, []);

  return <p className="qf-404__joke">{joke}</p>;
}
