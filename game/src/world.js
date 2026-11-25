// Game world: state, logic, orders, cooking, scoring, shifts.
// Uses deterministic RNG seeded per session for reproducibility.

import { createRng } from './math.js';
import { ingredientByKey, recipeById, unlockedRecipes, plateMatchesRecipe } from './recipes.js';
import { playChop, playDing, playCoin, playBuzz, playServe, startSizzle, stopSizzle } from './audio.js';

export const EVENT_OVER = 1;
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const SHIFT_DURATION = 90;     // seconds per shift
const TOTAL_SHIFTS = 3;
const MAX_ORDERS = { 0: 3, 1: 4, 2: 5 }; // per shift
const PATIENCE_BASE = { 0: 30, 1: 24, 2: 18 }; // seconds
const ORDER_SPAWN = { 0: 12, 1: 9, 2: 7 }; // seconds between orders

const COOK_TIME = 3.0; // patty cook time
export const BURN_TIME = 5.5; // patty burn time
const CHOP_CLICKS = 6; // rapid clicks to chop

export class World {
  static SCREEN_TITLE = 'title';
  static SCREEN_PLAY = 'play';
  static SCREEN_OVER = 'over';
  constructor(width, height, seed = 1) {
    this.width = width;
    this.height = height;
    this.rng = createRng(seed);
    this.seed = seed;

    // Persistent across shift restarts (localStorage)
    this.bestScore = parseInt(localStorage.getItem('emberthyme_best') || '0', 10);

    // Session state
    this.state = SCREEN_TITLE;
    this.shift = 0;
    this.shiftTime = SHIFT_DURATION;
    this.totalTime = SHIFT_DURATION * TOTAL_SHIFTS;
    this.score = 0;
    this.coins = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.orders = [];
    this.nextOrderId = 1;
    this.nextOrderTime = 0;
    this.plate = [];
    this.grill = [null, null, null]; // each slot: {key:'patty', cooked:0, burning:false}
    this.chop = { target: null, clicks: 0, ready: false };
    this.messages = []; // coin/combo popups
    this.particles = [];
    this.tutorialStep = 0;
    this.tutorialSeen = false;
    this.muted = false;
    this.selectedIngredient = null;
    this.serveReady = false;

    // Customer emotes (drawn on canvas near order tickets)
    this.customers = [];
  }

  // ---- lifecycle ----
  reset() {
    this.shift = 0;
    this.shiftTime = SHIFT_DURATION;
    this.totalTime = SHIFT_DURATION * TOTAL_SHIFTS;
    this.score = 0;
    this.coins = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.orders = [];
    this.nextOrderId = 1;
    this.nextOrderTime = this.rng.range(3, 6);
    this.plate = [];
    this.grill = [null, null, null];
    this.chop = { target: null, clicks: 0, ready: false };
    this.messages = [];
    this.particles = [];
    this.tutorialStep = 0;
    this.tutorialSeen = false;
    this.muted = false;
    this.selectedIngredient = null;
    this.serveReady = false;
    this.customers = [];
    this._auto = null;   // autopilot state for deterministic shot staging
    this._autoMode = 'play';
    this.state = SCREEN_PLAY;
    this.spawnInitialOrders();
  }

  // For shot staging: run an autopilot for N steps and return final screen.
  stageShot(name) {
    this.reset();
    this._auto = null;
    this._autoMode = name;
    if (name === 'start') {
      this.state = SCREEN_TITLE;
      return { screen: SCREEN_TITLE, best: this.bestScore };
    }
    const limit = name === 'end' ? this.totalTime : 45;
    for (let i = 0; i < limit * 30; i++) {
      if (this.step(1/30, 0, true) & EVENT_OVER) break;
    }
    return { screen: this.state === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY, best: this.bestScore };
  }

  // ---- main step ----
  step(dt, inputDir, auto = false) {
    if (this.state === SCREEN_TITLE || this.state === SCREEN_OVER) return 0;
    let flags = 0;

    // Autopilot for deterministic shot staging: plays the game so staged
    // scenes are not empty (mid-assembly plate, ready dish, or served dishes).
    if (auto) this.autoPilot(dt);

    // Timers
    this.shiftTime -= dt;
    this.totalTime -= dt;
    this.comboTimer = Math.max(0, this.comboTimer - dt);

    // Shift transitions
    if (this.shiftTime <= 0) {
      if (this.shift < TOTAL_SHIFTS - 1) {
        this.shift++;
        this.shiftTime = SHIFT_DURATION;
        this.orders = [];
        this.nextOrderTime = this.rng.range(2, 4);
        this.customers = [];
        this.spawnInitialOrders();
      } else {
        this.endShift();
        flags |= EVENT_OVER;
        return flags;
      }
    }

    // Spawn orders
    this.nextOrderTime -= dt;
    if (this.nextOrderTime <= 0 && this.orders.length < MAX_ORDERS[this.shift]) {
      this.spawnOrder();
      this.nextOrderTime = ORDER_SPAWN[this.shift] + this.rng.range(-2, 2);
    }

    // Update orders patience
    for (const o of this.orders) {
      o.patience = Math.max(0, o.patience - dt);
      if (o.patience <= 0 && o.status === 'waiting') {
        // Order abandoned
        o.status = 'left';
        this.combo = 0;
        this.comboTimer = 0;
      }
    }
    this.orders = this.orders.filter((o) => o.status !== 'left');

    // Grill cooking
    for (const slot of this.grill) {
      if (slot && slot.key === 'patty' && !slot.burning) {
        slot.cooked += dt;
        if (slot.cooked >= BURN_TIME) {
          slot.burning = true;
          slot.cooked = BURN_TIME;
        }
      }
    }
    // Sizzle sound when any patty cooking
    const anyCooking = this.grill.some((s) => s && s.key === 'patty' && !s.burning);
    if (anyCooking) startSizzle(); else stopSizzle();
    if (anyCooking && this.rng.next() < 0.35) {
      const slot = this.grill.find((s) => s && s.key === 'patty' && !s.burning);
      if (slot) {
        const i = this.grill.indexOf(slot);
        const gx = 40 + 340 * 0.62 + 12 + i * 44;
        const gy = this.height * 0.55 + 35;
        this.spawnParticle(gx + 15, gy - 6, '#fbbf24', (this.rng.next() - 0.5) * 20, -30, 0.3 + this.rng.next() * 0.4, 2);
      }
    }

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Messages update
    for (let i = this.messages.length - 1; i >= 0; i--) {
      this.messages[i].life -= dt;
      if (this.messages[i].life <= 0) this.messages.splice(i, 1);
    }

    // Tutorial auto-advance
    if (!this.tutorialSeen && this.tutorialStep < 5 && auto === false) {
      // wait for player actions; handled in input
    }

    // Serve check (auto not used for serve)
    this.updateServeReady();

    return flags;
  }

  // ---- autopilot: deterministic scripted play for shot staging ----
  // Plays a fixed recipe (burger: bun, cooked patty, cheese, lettuce, tomato,
  // bun) using the same inputs a player would, seeded via the world RNG.
  autoPilot(dt) {
    if (this.state !== SCREEN_PLAY) return;
    const mode = this._autoMode || 'play';
    let a = this._auto;
    if (!a) a = this._auto = { phase: 0, wait: 0, served: 0 };
    if (a.wait > 0) { a.wait -= dt; return; }

    const KEY = { bun: 'Digit1', patty: 'Digit2', cheese: 'Digit3', lettuce: 'Digit4', tomato: 'Digit5' };

    switch (a.phase) {
      case 0: // bottom bun on the plate
        this.selectIngredient(KEY.bun);
        this.addToPlate();
        a.phase = 1;
        break;
      case 1: // put a raw patty on grill slot 0
        this.selectIngredient(KEY.patty);
        this.clickGrillSlot(0);
        a.phase = 2;
        a.wait = 0.05;
        break;
      case 2: // wait for the patty to cook (take it before it burns)
        {
          const slot = this.grill[0];
          if (slot && slot.key === 'patty' && !slot.burning && slot.cooked >= COOK_TIME) {
            a.phase = 3;
          } else if (slot && slot.burning) {
            this.grill[0] = null;
            a.phase = 1;
          } else {
            a.wait = 0.1;
          }
        }
        break;
      case 3: // cooked patty onto the plate
        this.selectIngredient(KEY.patty);
        this.addToPlate();
        a.phase = 4;
        break;
      case 4: // cheese
        this.selectIngredient(KEY.cheese);
        this.addToPlate();
        a.phase = mode === 'play' ? 9 : 5;
        break;
      case 5: // lettuce
        this.selectIngredient(KEY.lettuce);
        this.addToPlate();
        a.phase = 6;
        break;
      case 6: // tomato
        this.selectIngredient(KEY.tomato);
        this.addToPlate();
        a.phase = 7;
        break;
      case 7: // top bun -> complete burger, plate matches a waiting order
        this.selectIngredient(KEY.bun);
        this.addToPlate();
        a.phase = 8;
        break;
      case 8: // full plate: end shot serves and repeats; serve shot serves one then holds one ready
        if (mode === 'end' && this.serveReady) {
          this.serve();
          a.phase = 0;
          a.wait = 0.05;
        } else if (mode === 'serve' && this.serveReady) {
          if (a.served < 1) { // serve one dish so score > 0, then hold next ready
            this.serve();
            a.served++;
            a.phase = 0;
            a.wait = 0.05;
          }
          // else: hold the ready plate (don't serve)
        }
        break;
      case 9: // play shot: hold the mid-assembly plate
        break;
    }
  }

  // ---- order spawning ----
  spawnInitialOrders() {
    const n = 2 + this.shift;
    for (let i = 0; i < n; i++) this.spawnOrder();
  }

  spawnOrder() {
    const available = unlockedRecipes(this.score);
    if (!available.length) return;
    const recipe = this.rng.pick(available);
    const patience = PATIENCE_BASE[this.shift] + this.rng.range(-3, 3);
    const order = {
      id: this.nextOrderId++,
      recipe,
      patience,
      maxPatience: patience,
      status: 'waiting',
      arrivalTime: this.totalTime,
    };
    this.orders.push(order);
    this.customers.push({ id: order.id, mood: 'happy', x: 0 });
  }

  // ---- ingredient selection (keyboard 1-9 / click ingredient bar) ----
  selectIngredient(key) {
    const ing = INGREDIENTS.find((i) => i.keyCode === key);
    if (!ing) return;
    this.selectedIngredient = ing.key;
    this.playChopSound();
  }

  playChopSound() { playChop(); }

  // Click an ingredient on the counter (HTML button or canvas area)
  clickIngredient(key) {
    const ing = ingredientByKey(key);
    if (!ing) return;
    this.selectedIngredient = key;
    this.playChopSound();
  }

  // ---- plate assembly ----
  addToPlate() {
    if (!this.selectedIngredient) return;
    const ing = ingredientByKey(this.selectedIngredient);
    if (!ing) return;

    // Apply cook/chop state if applicable
    let cooked = false, chopped = false;
    if (this.selectedIngredient === 'patty') {
      // Find a cooked patty on grill
      for (const slot of this.grill) {
        if (slot && slot.key === 'patty' && slot.cooked >= COOK_TIME && !slot.burning) {
          cooked = true;
          slot.cooked = 0; slot.key = null; // consumed
          break;
        }
      }
      if (!cooked) { // raw patty placed
        this.selectedIngredient = null;
        return;
      }
    } else if (this.selectedIngredient === 'onion' || this.selectedIngredient === 'tomato') {
      if (this.chop.ready && this.chop.target === this.selectedIngredient) {
        chopped = true;
        this.chop = { target: null, clicks: 0, ready: false };
      } else {
        // place unchopped — allowed but won't match recipes needing chopped
      }
    }

    this.plate.push({ key: this.selectedIngredient, cooked, chopped });
    this.selectedIngredient = null;
    this.updateServeReady();
    playDing();
  }

  clearPlate() {
    this.plate = [];
    this.serveReady = false;
  }

  updateServeReady() {
    // Check if current plate matches any waiting order
    this.serveReady = this.orders.some((o) => o.status === 'waiting' && plateMatchesRecipe(this.plate, o.recipe.needs));
  }

  // ---- grill interaction ----
  clickGrillSlot(index) {
    if (index < 0 || index >= this.grill.length) return;
    const slot = this.grill[index];
    if (!slot || !slot.key) {
      // Place raw patty if selected
      if (this.selectedIngredient === 'patty') {
        this.grill[index] = { key: 'patty', cooked: 0, burning: false };
        this.selectedIngredient = null;
        playDing();
      }
    } else if (slot.key === 'patty') {
      // Take patty if cooked enough
      if (slot.cooked >= COOK_TIME && !slot.burning) {
        this.selectedIngredient = 'patty';
        this.grill[index] = null;
        playDing();
      } else if (slot.burning) {
        // Clear burnt
        this.grill[index] = null;
        playBuzz();
      }
    }
  }

  // ---- chop board ----
  clickChop() {
    if (!this.selectedIngredient) return;
    if (this.selectedIngredient !== 'onion' && this.selectedIngredient !== 'tomato') return;

    if (!this.chop.target || this.chop.target !== this.selectedIngredient) {
      this.chop = { target: this.selectedIngredient, clicks: 1, ready: false };
    } else {
      this.chop.clicks++;
      playChop();
    }
    if (this.chop.clicks >= CHOP_CLICKS) {
      this.chop.ready = true;
      playDing();
    }
  }

  // ---- serve ----
  serve() {
    if (!this.serveReady) { playBuzz(); return false; }
    // Find matching order (first waiting)
    const idx = this.orders.findIndex((o) => o.status === 'waiting' && plateMatchesRecipe(this.plate, o.recipe.needs));
    if (idx === -1) { playBuzz(); return false; }
    const order = this.orders[idx];
    order.status = 'served';

    // Score: base + tip based on patience %
    const tipMult = order.patience / order.maxPatience;
    const earned = Math.round(order.recipe.baseScore * (0.7 + 0.5 * tipMult));
    this.score += earned;
    this.coins += earned;

    // Combo
    this.combo++;
    this.comboTimer = 2.0;
    if (this.combo > 1) this.coins += this.combo * 10;

    // Popups
    this.spawnPopup(order.recipe.emoji + ' +' + earned, 'coin');
    if (this.combo > 1) this.spawnPopup('COMBO x' + this.combo, 'combo');

    playServe();
    playCoin();

    this.plate = [];
    this.serveReady = false;
    this.selectedIngredient = null;

    // Remove order after short delay (visual)
    setTimeout(() => {
      const i = this.orders.indexOf(order);
      if (i >= 0) this.orders.splice(i, 1);
    }, 600);

    return true;
  }

  spawnParticle(x, y, color, vx, vy, life, size = 3) {
    this.particles.push({ x, y, vx, vy, life, size, color });
  }

  spawnPopup(text, type) {
    this.messages.push({ text, type, life: type === 'coin' ? 1.0 : 0.8 });
  }

  // ---- end shift ----
  endShift() {
    this.state = SCREEN_OVER;
    stopSizzle();
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('emberthyme_best', String(this.bestScore));
    }
  }

  // ---- state accessors ----
  getState() { return this.state; }
  getShift() { return this.shift; }
  getShiftTime() { return this.shiftTime; }
  getTotalTime() { return this.totalTime; }
  getScore() { return this.score; }
  getCoins() { return this.coins; }
  getCombo() { return this.combo; }
  getOrders() { return this.orders; }
  getPlate() { return this.plate; }
  getGrill() { return this.grill; }
  getChop() { return this.chop; }
  getMessages() { return this.messages; }
  getParticles() { return this.particles; }
  getSelectedIngredient() { return this.selectedIngredient; }
  getServeReady() { return this.serveReady; }
  getBestScore() { return this.bestScore; }
  getTutorialStep() { return this.tutorialStep; }
  setTutorialStep(n) { this.tutorialStep = n; }
  setTutorialSeen(v) { this.tutorialSeen = v; }
  getCustomers() { return this.customers; }
  isMuted() { return this.muted; }
  toggleMute() { this.muted = !this.muted; return this.muted; }
}

// Aliases for import compatibility
export const INGREDIENTS = [
  { key: 'bun', label: 'Bun', keyCode: 'Digit1', color: '#c9a962', icon: '🥖' },
  { key: 'patty', label: 'Patty', keyCode: 'Digit2', color: '#5d4037', icon: '🍖' },
  { key: 'cheese', label: 'Cheese', keyCode: 'Digit3', color: '#f59e0b', icon: '🧀' },
  { key: 'lettuce', label: 'Lettuce', keyCode: 'Digit4', color: '#22c55e', icon: '🥬' },
  { key: 'tomato', label: 'Tomato', keyCode: 'Digit5', color: '#ef4444', icon: '🍅' },
  { key: 'onion', label: 'Onion', keyCode: 'Digit6', color: '#e5e7eb', icon: '🧅' },
  { key: 'egg', label: 'Egg', keyCode: 'Digit7', color: '#fef3c7', icon: '🥚' },
  { key: 'bread', label: 'Bread', keyCode: 'Digit8', color: '#d4a373', icon: '🍞' },
  { key: 'pasta', label: 'Pasta', keyCode: 'Digit9', color: '#f1f5f9', icon: '🍝' },
];