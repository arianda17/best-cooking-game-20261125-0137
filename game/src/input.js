// Input handling: keyboard, mouse, touch.
import { World } from './world.js';

export function setupInput(world, canvas, onServe, onPause, onMute, onRestart) {
  const keys = new Set();
  let mouseDown = false;
  let lastTap = 0;

  function getCanvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches?.[0]?.clientX ?? 0)) - rect.left;
    const y = (e.clientY || (e.touches?.[0]?.clientY ?? 0)) - rect.top;
    return { x, y };
  }

  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    keys.add(e.code);

    // Prevent default for game keys
    if (['Space', 'KeyP', 'KeyR', 'KeyM', 'Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9'].includes(e.code)) {
      e.preventDefault();
    }

    switch (e.code) {
      case 'Space':
        if (world.getState() === World.SCREEN_PLAY) onServe();
        break;
      case 'KeyP':
        if (world.getState() === World.SCREEN_PLAY || world.getState() === World.SCREEN_TITLE) onPause();
        break;
      case 'KeyR':
        if (world.getState() === World.SCREEN_OVER) onRestart();
        break;
      case 'KeyM':
        onMute();
        break;
      default:
        // 1-9 ingredient select handled in main loop
        break;
    }
  });

  window.addEventListener('keyup', (e) => keys.delete(e.code));

  // Mouse/Touch
  canvas.addEventListener('pointerdown', (e) => {
    mouseDown = true;
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap - serve
      if (world.getState() === World.SCREEN_PLAY) onServe();
    }
    lastTap = now;
  });

  canvas.addEventListener('pointerup', () => { mouseDown = false; });
  canvas.addEventListener('pointerleave', () => { mouseDown = false; });

  // Ingredient clicks on HTML buttons are handled by main.js event listeners
  // Canvas clicks for grill/chop/plate areas could be added here if needed

  return {
    isKeyDown: (code) => keys.has(code),
    consumeKey: (code) => keys.delete(code),
  };
}