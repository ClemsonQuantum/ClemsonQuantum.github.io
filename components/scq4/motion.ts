// Pause state for the v4 scroll stage. Nothing sets it today, so
// motionPaused() is always false. ScrollStage and ConstellationSky read it
// through these two hooks, so a pause control could come back without
// touching them: it would flip `paused` and dispatch EVENT.

const EVENT = 'scq4-motion';
const paused = false;

export function motionPaused(): boolean {
  return paused;
}

export function onMotionChange(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
