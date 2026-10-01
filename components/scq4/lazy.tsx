'use client';

import dynamic from 'next/dynamic';

// The v4 scroll stage and real-sky hero, each in its own chunk that a page
// downloads only when it renders them. The split has to happen here, in a
// Client Component: MarkdownDiv is a Server Component, and Next does not
// code-split a Client Component that a Server Component imports (see
// "Lazy Loading" in node_modules/next/dist/docs). Imported directly, both
// rode along on every event page.
export const LazyScrollStage = dynamic(() => import('./ScrollStage'));
export const LazyConstellationSky = dynamic(() => import('./ConstellationSky'));
