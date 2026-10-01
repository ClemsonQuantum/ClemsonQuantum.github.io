'use client';

import dynamic from 'next/dynamic';

// Event-page widgets, each in its own chunk that a page downloads only when it
// renders one. The split has to happen in a Client Component (like
// scq4/lazy.tsx): MarkdownDiv and MarkdownSpan are Server Components, and a
// Client Component they import directly ships with every page of the route,
// so the Fall Fest canvases and birds rode along on every event page. SSR
// stays on, so the HTML is unchanged.
export const LazyCloudSky = dynamic(() => import('./CloudSky'));
export const LazyCryostat = dynamic(() => import('./Cryostat'));
export const LazyDecadeCounter = dynamic(() => import('./DecadeCounter'));
export const LazyHummingbirdZone = dynamic(() => import('./HummingbirdZone'));
export const LazyLeaderboard = dynamic(() => import('./Leaderboard'));
export const LazyModalFormButton = dynamic(() => import('./ModalFormButton'));
export const LazyOpenLinkedDetails = dynamic(() => import('./OpenLinkedDetails'));
export const LazyPageBirds = dynamic(() => import('./PageBirds'));
export const LazyPageClouds = dynamic(() => import('./PageClouds'));
export const LazyQuantumCanvas = dynamic(() => import('./QuantumCanvas'));
