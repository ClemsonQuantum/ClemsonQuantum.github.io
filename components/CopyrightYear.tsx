'use client';

import { useEffect, useState } from 'react';

// Static export bakes new Date() in at build time, so the footer year would
// freeze at the last deploy. Render the build year for SSR, then correct it
// client-side (useEffect avoids a hydration mismatch when they differ).
export default function CopyrightYear() {
  const [year, setYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    // Intentional mount-only setState: SSR bakes the build year; this
    // corrects it to the visitor's year without a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setYear(new Date().getFullYear());
  }, []);

  return <>{year}</>;
}
