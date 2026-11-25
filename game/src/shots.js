// Shot staging for deterministic screenshots.
// URL params: ?shot=start|play|serve|end&seed=1

import { World } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const SCREEN_SERVE = 'serve';

export function stageShot(name, world) {
  world.reset();
  world._auto = null;
  world._autoMode = name;
  if (name === 'start' || name === 'title') {
    world.state = SCREEN_TITLE;
    return { screen: SCREEN_TITLE, best: world.getBestScore() };
  }

  // play/serve/end run the game for a while with autopilot
  const LIMITS = {
    play: 28,      // mid-game: 28 seconds into shift 1
    serve: 42,     // serve moment: after a couple dishes
    end: 270,      // end of all shifts
  };
  const limit = LIMITS[name] ?? LIMITS.play;
  const horizon = name === 'end' ? 0.15 : 0.5;

  for (let i = 0; i < limit * 30; i++) {
    if (world.step(1/30, 0, true) & 1) break;
  }

  const over = world.getState() === SCREEN_OVER;
  return {
    screen: over ? SCREEN_OVER : name === 'serve' ? SCREEN_SERVE : SCREEN_PLAY,
    best: world.getBestScore()
  };
}