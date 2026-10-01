'use client';

import { useEffect, useState } from 'react';

// Static export bakes the year in at build time, so the footer would freeze
// at the last deploy. The server-rendered Footer passes the build year in;
// the first client render must use that same value (computing new Date() in
// a useState initializer runs again in the browser and mismatches the HTML
// whenever the visitor's year differs, e.g. from Jan 1 until a redeploy).
// The effect then corrects it to the visitor's year after hydration.
export default function CopyrightYear({ buildYear }: { buildYear: number }) {
  const [year, setYear] = useState(buildYear);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- after hydration (above)
    setYear(new Date().getFullYear());
  }, []);

  return <>{year}</>;
}
