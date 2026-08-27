'use client';

import { useEffect, useState } from 'react';

// Static export bakes new Date() in at build time, so the footer year would
// freeze at the last deploy. Render the build year for SSR, then correct it
// client-side (useEffect avoids a hydration mismatch when they differ).
export default function CopyrightYear() {
  const [year, setYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return <>{year}</>;
}
