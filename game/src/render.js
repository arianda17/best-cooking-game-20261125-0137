// Canvas renderer: kitchen, order board, ingredients, plate, grill, chop board,
// particles, steam, faces, day/night lighting. All drawn with canvas 2D shapes.

import { lerp, clamp, dist } from './math.js';
import { ingredientByKey } from './recipes.js';
import { BURN_TIME } from './world.js';

let ctx = null;
let width = 1280;
let height = 720;

const KITCHEN_WALL = '#4a3f35';
const KITCHEN_FLOOR = '#3a322a';
const COUNTER = '#2a2420';
const GOLD = '#c9a962';
const PAPER = '#f5e8d0';

export function initCanvas(canvas) {
  const c = canvas;
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  c.width = width * dpr;
  c.height = height * dpr;
  ctx = c.getContext('2d', { alpha: false });
  ctx.scale(dpr, dpr);
  ctx.textBaseline = 'middle';
  ctx.imageSmoothingEnabled = false;
}

export function resizeCanvas(canvas) {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  c.width = width * dpr;
  c.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function rect(x, y, w, h, color, radius = 0) {
  ctx.fillStyle = color;
  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
}

function strokeRect(x, y, w, h, color, lw = 2, radius = 0) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  if (radius > 0) { ctx.roundRect(x, y, w, h, radius); } else { ctx.rect(x, y, w, h); }
  ctx.stroke();
}

function line(x1, y1, x2, y2, color, lw = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.stroke();
}

function circle(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function text(str, x, y, size, color, align = 'center', font = 'system-ui') {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

function drawCustomerFace(cx, cy, size, mood) {
  // Simple face drawn in code: skin, eyes, mouth that changes with patience mood.
  ctx.fillStyle = '#f2d2b4';
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();
  // hair
  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.3, size * 0.9, Math.PI, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.arc(cx - size * 0.35, cy - size * 0.1, size * 0.18, 0, Math.PI * 2);
  ctx.arc(cx + size * 0.35, cy - size * 0.1, size * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // mouth depends on mood
  ctx.strokeStyle = '#8d4e2d';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'happy') {
    ctx.arc(cx, cy + size * 0.25, size * 0.35, 0, Math.PI);
  } else if (mood === 'impatient') {
    ctx.moveTo(cx - size * 0.3, cy + size * 0.2);
    ctx.lineTo(cx, cy + size * 0.35);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.2);
  } else {
    ctx.moveTo(cx - size * 0.35, cy + size * 0.3);
    ctx.lineTo(cx + size * 0.35, cy + size * 0.3);
  }
  ctx.stroke();
}

export function drawKitchen(world) {
  const t = world.getShiftTime();
  const shift = world.getShift();
  // Day/night lighting: shift 1 warm day, shift 2 amber evening, shift 3 deep night.
  const night = shift === 2 ? 1 : shift === 1 ? 0.5 : 0;
  const sky = lerp('#f5e6c9', '#2a223a', night);
  const floor = lerp(KITCHEN_FLOOR, '#1e1610', night);
  const counter = lerp(COUNTER, '#1e1914', night);
  const glow = night > 0 ? `rgba(201,169,98,${night * 0.15})` : 'transparent';

  // Walls
  rect(0, 0, width, height, sky);
  // backsplash
  rect(0, height * 0.42, width, height * 0.28, counter);
  rect(0, height * 0.70, width, height * 0.30, floor);

  // overhead tile line
  strokeRect(0, height * 0.42, width, 1, '#5a4a3e', 1);

  // ambient glow
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

export function drawStoveAndGrill(world) {
  const gx = 40, gy = height * 0.55;
  const gw = 340, gh = 250;
  // stove body
  rect(gx, gy, gw, gh, '#1a1612', 8);
  strokeRect(gx, gy, gw, gh, '#4a3f35', 3, 8);
  // burners
  ['#3a3028', '#2a221c'].forEach((c, i) => {
    circle(gx + 70 + i * 150, gy + 70, 26, c);
    strokeCircle(gx + 70 + i * 150, gy + 70, 26, '#5a4a3e', 2);
  });
  // grill plate area (right side of stove)
  const grillX = gx + gw * 0.62, grillY = gy + gh * 0.5;
  rect(grillX, grillY, 150, 70, '#25201a', 6);
  strokeRect(grillX, grillY, 150, 70, '#6b5238', 2, 6);
  // grill grate lines
  ctx.strokeStyle = '#8b7355'; ctx.lineWidth = 2;
  for (let i = 0; i <= 5; i++) {
    ctx.beginPath(); ctx.moveTo(grillX, grillY + i * 14); ctx.lineTo(grillX + 150, grillY + i * 14); ctx.stroke();
  }
  // patties on grill
  const grill = world.getGrill();
  grill.forEach((slot, i) => {
    const px = grillX + 12 + i * 44;
    const py = grillY + 35;
    if (slot) {
      const cooked = slot.cooked / BURN_TIME;
      const c = slot.burning ? '#5d2e1a' : cooked < 0.5 ? '#a64d2b' : '#d97a2e';
      rect(px, py, 30, 16, c, 4);
      // sizzle particles
      for (let k = 0; k < 2; k++) {
        world.spawnParticleIfNeeded && world.spawnParticleIfNeeded(px + 15, py - 6);
      }
      // steam
      drawSteam(px + 15, py - 14, 0.5 + Math.sin(Date.now() / 200 + i) * 0.3);
    } else {
      rect(px, py, 30, 16, '#1a1612', 4);
    }
  });
  // label
  text('GRILL', gx + gw / 2, gy + gh - 18, 12, GOLD);
}

function strokeCircle(x, y, r, color, lw) {
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
}

function drawSteam(x, y, scale) {
  const time = Date.now() / 400;
  for (let k = 0; k < 2; k++) {
    const t = (time + k * 1.5) % 1.2;
    const sy = y - t * 40;
    const sx = x + Math.sin(t * 3) * 6;
    ctx.fillStyle = `rgba(220,220,220,${(1 - t) * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 6 * scale * (1 - t), 10 * scale * (1 - t), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawOrderBoard(world) {
  const orders = world.getOrders();
  const startX = 20;
  let x = startX;
  ctx.font = '14px system-ui';
  for (const o of orders) {
    const patiencePct = clamp(o.patience / Math.max(o.maxPatience, 1), 0, 1);
    const mood = patiencePct > 0.5 ? 'happy' : patiencePct > 0.2 ? 'impatient' : 'angry';
    const w = 160;
    rect(x, 60, w, 90, '#2a2622', 8);
    strokeRect(x, 60, w, 90, mood === 'angry' ? '#ef4444' : mood === 'impatient' ? '#fbbf24' : '#4ade80', 2, 8);

    // customer face
    drawCustomerFace(x + 28, 95, 20, mood);

    // dish icon + name
    text(o.recipe.emoji, x + w - 30, 72, 24);
    text(o.recipe.label, x + 56, 74, 12, PAPER);

    // patience bar
    rect(x + 10, 108, w - 20, 6, '#3a342e', 3);
    rect(x + 10, 108, (w - 20) * patiencePct, 6, mood === 'angry' ? '#ef4444' : mood === 'impatient' ? '#fbbf24' : '#4ade80', 3);

    // time left
    text(Math.ceil(o.patience) + 's', x + w / 2, 128, 11, '#a89884');

    x += w + 12;
  }
  // label
  text('ORDERS', 20, 40, 14, '#a89884', 'left');
}

export function drawIngredients(world) {
  // Drawn by HTML buttons; draw a small counter label + underline accents on canvas.
  text('COUNTER', 20, height - 66, 13, '#887864', 'left');
}

export function drawPlate(world) {
  const plate = world.getPlate();
  const cx = width - 110, cy = height - 140;
  // plate
  ctx.fillStyle = '#f5e8d0';
  ctx.beginPath(); ctx.ellipse(cx, cy, 56, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9a962'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, cy, 56, 30, 0, 0, Math.PI * 2); ctx.stroke();
  // rim shine
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.ellipse(cx - 18, cy - 10, 22, 12, 0, 0, Math.PI * 2); ctx.fill();

  let layers = 0;
  for (const item of plate) {
    const ing = ingredientByKey(item.key);
    if (!ing) continue;
    layers++;
    const y = cy - 8 - layers * 10;
    // layer height varies by type
    const h = item.key === 'patty' ? 9 : 7;
    // draw rounded pill
    const w = 52;
    ctx.fillStyle = item.key === 'patty-cooked' ? '#d97a2e' : ing.color;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, y - h / 2, w, h, 4);
    ctx.fill();
    // little highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx - w / 2 + 8, y - h / 2 + h / 3, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (layers === 0) {
    text('plate', cx, cy, 11, '#887864');
  }
  text('PLATE', cx, cy + 52, 10, '#887864');
}

export function drawParticles(world) {
  for (const p of world.getParticles()) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function drawUI(world) {
  // Timer
  const t = world.getTotalTime();
  const mins = Math.floor(t / 60);
  const secs = Math.floor(t % 60);
  const warning = t < 30;
  const el = document.getElementById('shift-timer');
  if (el) {
    el.textContent = `Shift ${world.getShift() + 1}/3  ${mins}:${String(secs).padStart(2, '0')}`;
    el.classList.toggle('warning', warning);
  }
}

export function drawPause(world) {
  // overlay handled by main.js
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

export { rect, strokeRect, line, circle, text };