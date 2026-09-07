// Tuning constants shared by the decorative canvas and entrance components.

// Cap on the canvas backing-store scale: above 2x the extra pixels cost fill
// rate on high-DPI phones with no visible gain (QuantumCanvas, FallingLeaves).
export const MAX_DPR = 2;

// Delay between successive items in a staggered entrance, in milliseconds
// (ScrollReveal cards, TitleReveal words).
export const STAGGER_MS = 60;
