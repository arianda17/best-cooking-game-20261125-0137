// Main entry: game loop, UI wiring, shot staging, screen management.
import { World } from './world.js';
import { createRng } from './math.js';
import { initCanvas, drawKitchen, drawStoveAndGrill, drawOrderBoard, drawIngredients, drawPlate, drawParticles, drawUI } from './render.js';
import { setupInput } from './input.js';
import { initAudio, ensureAudio, toggleMusic, isMuted, setMuted, startMusicIfEnabled } from './audio.js';
import { INGREDIENTS } from './recipes.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
let world = null;
let width = 1280;
let height = 720;

const params = new URLSearchParams(location.search);
const shotName = params.get('shot') || null;
const seed = parseInt(params.get('seed') || '1', 10);

let paused = false;
let lastTime = 0;
let started = false;

function init() {
  initCanvas(canvas);
  world = new World(width, height, seed);
  setupUI();
  setupInput(world, canvas,
    () => { if (world.getState() === World.SCREEN_PLAY) serve(); },
    () => { togglePause(); },
    () => { toggleMute(); },
    () => { restart(); }
  );

  requestAnimationFrame(loop);

  if (shotName) {
    const res = stageShot(shotName, world);
    // keep loop running a bit for animation frames
    started = true;
    if (shotName === 'start' || shotName === 'title') {
      showTitle();
    } else {
      hideTitle();
      hideEnd();
      hidePause();
      if (shotName === 'end') showEnd();
    }
  } else {
    showTitle();
  }
}

function setupUI() {
  const bar = document.getElementById('ingredient-bar');
  if (bar) {
    INGREDIENTS.forEach((ing) => {
      const btn = document.createElement('button');
      btn.className = 'ing-btn';
      btn.innerHTML = `<span class="ing-icon">${ing.icon}</span><span class="ing-key">${ing.keyCode.replace('Digit','')}</span>`;
      btn.title = ing.label;
      btn.onclick = () => {
        world.clickIngredient(ing.key);
        world.selectIngredient(ing.keyCode);
        refreshUI();
      };
      bar.appendChild(btn);
    });
  }

  document.querySelectorAll('.grill-slot').forEach((slot, i) => {
    slot.onclick = () => { world.clickGrillSlot(i); refreshUI(); };
  });

  const chopBoard = document.querySelector('.chop-board');
  if (chopBoard) chopBoard.onclick = () => { world.clickChop(); refreshUI(); };

  const serveBtn = document.getElementById('serve-btn');
  if (serveBtn) serveBtn.onclick = () => { serve(); };

  const startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.onclick = () => { startGame(); };

  const resumeBtn = document.getElementById('resume-btn');
  if (resumeBtn) resumeBtn.onclick = () => { togglePause(); };

  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) restartBtn.onclick = () => { restart(); };

  const muteBtn = document.getElementById('mute-btn');
  if (muteBtn) muteBtn.onclick = () => { toggleMute(); muteBtn.textContent = isMuted() ? '🔇 Music' : '🔊 Music'; };
}

function startGame() {
  hideTitle();
  ensureAudio();
  initAudio();
  startMusicIfEnabled();
  world.reset();
  started = true;
  world.setTutorialSeen(false);
}

function serve() {
  if (world.getState() !== World.SCREEN_PLAY) return;
  const ok = world.serve();
  if (ok) {
    for (let i = 0; i < 6; i++) {
      world.spawnParticle(width - 110, height - 140, '#fbbf24', (Math.random()-0.5)*80, -60-Math.random()*40, 0.5+Math.random()*0.5, 3);
    }
  }
  refreshUI();
}

function togglePause() {
  if (world.getState() !== World.SCREEN_PLAY) return;
  paused = !paused;
  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.classList.toggle('hidden', !paused);
}

function toggleMute() {
  const m = world.toggleMute();
  setMuted(m);
  const btn = document.getElementById('mute-btn');
  if (btn) btn.textContent = m ? '🔇 Music' : '🔊 Music';
}

function restart() {
  world.reset();
  paused = false;
  started = true;
  hideEnd();
  hidePause();
}

function showTitle() {
  const t = document.getElementById('title-overlay');
  if (t) t.classList.remove('hidden');
}

function hideTitle() {
  const t = document.getElementById('title-overlay');
  if (t) t.classList.add('hidden');
}

function hideEnd() {
  const e = document.getElementById('end-overlay');
  if (e) e.classList.add('hidden');
}

function hidePause() {
  const p = document.getElementById('pause-overlay');
  if (p) p.classList.add('hidden');
}

function showEnd() {
  const e = document.getElementById('end-overlay');
  if (e) e.classList.remove('hidden');
  const scoreEl = document.getElementById('end-score');
  if (scoreEl) scoreEl.textContent = world.getScore();
  const coinsEl = document.getElementById('end-coins');
  if (coinsEl) coinsEl.textContent = world.getCoins();
  const bestEl = document.getElementById('end-best');
  if (bestEl) bestEl.textContent = world.getBestScore();
  const comboEl = document.getElementById('end-combo');
  if (comboEl) comboEl.textContent = 'x' + world.getCombo();
}

function refreshUI() {
  const ingBtns = document.querySelectorAll('.ing-btn');
  ingBtns.forEach((btn, i) => {
    const ing = INGREDIENTS[i];
    btn.classList.toggle('selected', ing && world.getSelectedIngredient() === ing.key);
  });

  const serveBtn = document.getElementById('serve-btn');
  if (serveBtn) {
    serveBtn.classList.toggle('ready', world.getServeReady());
    serveBtn.disabled = !world.getServeReady();
  }

  const hudScore = document.getElementById('hud-score');
  if (hudScore) hudScore.textContent = world.getScore();
  const hudCoins = document.getElementById('hud-coins');
  if (hudCoins) hudCoins.textContent = world.getCoins();

  const comboEl = document.getElementById('hud-combo');
  if (comboEl) {
    if (world.getCombo() > 1) {
      comboEl.style.display = 'block';
      comboEl.textContent = 'Combo x' + world.getCombo();
    } else {
      comboEl.style.display = 'none';
    }
  }

  // Grill slots visual
  const grill = world.getGrill();
  grill.forEach((slot, i) => {
    const el = document.getElementById('grill-slot-' + i);
    if (!el) return;
    el.classList.toggle('cooking', !!slot && !slot.burning);
    el.classList.toggle('burnt', !!slot && slot.burning);
    let progress = el.querySelector('.grill-progress');
    if (progress) progress.remove();
    if (slot) {
      const prog = Math.min(slot.cooked / 5.5, 1);
      const bar = document.createElement('div');
      bar.className = 'grill-progress';
      bar.style.transform = `scaleX(${prog})`;
      el.appendChild(bar);
    }
  });

  // Chop progress
  const chopEl = document.getElementById('chop-progress');
  if (chopEl) {
    const chop = world.getChop();
    chopEl.style.transform = `scaleX(${Math.min(chop.clicks / 6, 1)})`;
  }
}

function loop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (world && world.getState() === World.SCREEN_PLAY && !paused) {
    world.step(dt, 0, false);
    if (world.getState() === World.SCREEN_OVER) {
      showEnd();
    }
  }

  renderFrame();
  refreshUI();
  requestAnimationFrame(loop);
}

function renderFrame() {
  drawKitchen(world);
  drawStoveAndGrill(world);
  drawOrderBoard(world);
  drawIngredients(world);
  drawPlate(world);
  drawParticles(world);
  drawUI(world);
}

window.world = world;
document.addEventListener('DOMContentLoaded', init);

// Handle keyboard ingredient select (1-9)
window.addEventListener('keydown', (e) => {
  if (e.code.startsWith('Digit')) {
    const d = parseInt(e.code.replace('Digit',''), 10);
    if (d >= 1 && d <= 9 && world && world.getState() === World.SCREEN_PLAY && !paused) {
      const ing = INGREDIENTS[d - 1];
      if (ing) {
        world.selectIngredient(ing.keyCode);
        world.clickIngredient(ing.key);
        refreshUI();
      }
    }
  }
});