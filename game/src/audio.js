// WebAudio synthesizer: no audio files, every sound made from oscillators.
let ctx = null;
let masterGain = null;
let musicTimer = null;
let musicPlaying = true;
let sizzleNode = null;
let sizzleGain = null;
let muted = false;

export function ensureAudio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.5;
  masterGain.connect(ctx.destination);
  return ctx;
}

export function setMuted(v) {
  muted = v;
  if (masterGain) masterGain.gain.value = v ? 0 : 0.5;
}

export function isMuted() { return muted; }

export function playTone(freq, dur, type = 'sine', vol = 0.12, slide = 0) {
  if (muted || !ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ctx.currentTime + dur);
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g).connect(masterGain);
  o.start();
  o.stop(ctx.currentTime + dur);
}

export function playChop() {
  ensureAudio();
  playTone(180, 0.06, 'square', 0.15, -60);
  playTone(90, 0.08, 'triangle', 0.1, -20);
}

export function startSizzle() {
  if (muted || !ctx || sizzleNode) return;
  ensureAudio();
  sizzleNode = ctx.createOscillator();
  sizzleGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2200;
  filter.Q.value = 6;
  sizzleNode.type = 'sawtooth';
  sizzleNode.frequency.value = 90;
  sizzleGain.gain.value = 0.05;
  sizzleNode.connect(filter).connect(sizzleGain).connect(masterGain);
  sizzleNode.start();
  // modulate
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 7;
  lfoGain.gain.value = 40;
  lfo.connect(lfoGain).connect(sizzleNode.frequency);
  lfo.start();
}

export function stopSizzle() {
  if (sizzleNode) {
    try { sizzleNode.stop(); } catch (e) {}
    sizzleNode = null;
    sizzleGain = null;
  }
}

export function playDing() {
  ensureAudio();
  playTone(880, 0.12, 'sine', 0.18);
  setTimeout(() => playTone(1320, 0.15, 'sine', 0.16), 80);
}

export function playCoin() {
  ensureAudio();
  playTone(988, 0.08, 'sine', 0.14);
  setTimeout(() => playTone(1318, 0.12, 'sine', 0.14), 60);
}

export function playBuzz() {
  ensureAudio();
  playTone(120, 0.18, 'sawtooth', 0.15, -40);
}

export function playServe() {
  ensureAudio();
  playTone(660, 0.1, 'sine', 0.16);
  setTimeout(() => playTone(880, 0.12, 'sine', 0.16), 90);
  setTimeout(() => playTone(1320, 0.16, 'sine', 0.18), 180);
}

export function toggleMusic() {
  musicPlaying = !musicPlaying;
  if (musicPlaying) startMusic(); else stopMusic();
  return musicPlaying;
}

export function isMusicPlaying() { return musicPlaying; }

// Simple cheerful melody loop.
const MELODY = [
  [523, 0.18], [587, 0.18], [659, 0.18], [698, 0.18],
  [784, 0.36], [698, 0.18], [659, 0.18],
  [587, 0.36], [523, 0.18], [587, 0.18],
  [659, 0.18], [587, 0.18], [523, 0.36],
];

function startMusic() {
  if (muted) return;
  ensureAudio();
  if (musicTimer) return;
  let idx = 0;
  let nextTime = ctx.currentTime + 0.1;
  const schedule = () => {
    if (!musicPlaying || muted) { musicTimer = null; return; }
    while (nextTime < ctx.currentTime + 0.5) {
      const [f, d] = MELODY[idx % MELODY.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.06, nextTime);
      g.gain.exponentialRampToValueAtTime(0.0001, nextTime + d);
      o.connect(g).connect(masterGain);
      o.start(nextTime);
      o.stop(nextTime + d);
      nextTime += d;
      idx++;
    }
    musicTimer = setTimeout(schedule, 200);
  };
  schedule();
}

function stopMusic() {
  if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
}

export function startMusicIfEnabled() {
  if (musicPlaying && !muted) startMusic();
}

export function initAudio() {
  ensureAudio();
  if (ctx.state === 'suspended') ctx.resume();
  if (musicPlaying) startMusic();
}