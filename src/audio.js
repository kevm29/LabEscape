// Effets sonores synthétisés (aucun fichier audio nécessaire).
let ctx = null;
let master = null;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

function tone(freq, dur, { type = 'sine', vol = 0.3, delay = 0, slide = 0 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur, { vol = 0.25, freq = 1200, q = 0.8, type = 'bandpass', delay = 0, sweep = 0 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t0);
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(50, freq + sweep), t0 + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

export const sfx = {
  click: () => tone(1800, 0.05, { type: 'square', vol: 0.06 }),
  pickup: () => { tone(660, 0.12, { vol: 0.15 }); tone(990, 0.18, { vol: 0.12, delay: 0.08 }); },
  swoosh: () => noise(0.45, { vol: 0.3, freq: 600, sweep: 1800, q: 0.6 }),
  cloth: () => { noise(0.35, { vol: 0.25, freq: 900, q: 0.4 }); noise(0.3, { vol: 0.2, freq: 1400, q: 0.5, delay: 0.3 }); },
  snap: () => { noise(0.07, { vol: 0.5, freq: 2500, q: 1.5, type: 'highpass' }); tone(180, 0.08, { vol: 0.15, type: 'triangle' }); },
  plastic: () => { tone(2400, 0.04, { type: 'triangle', vol: 0.08 }); tone(3100, 0.04, { type: 'triangle', vol: 0.06, delay: 0.05 }); },
  buzzer: () => { tone(140, 0.5, { type: 'sawtooth', vol: 0.18 }); tone(147, 0.5, { type: 'square', vol: 0.08 }); },
  whistle: () => { tone(2100, 0.18, { vol: 0.12 }); tone(2100, 0.3, { vol: 0.12, delay: 0.22 }); },
  key: () => tone(1320, 0.07, { type: 'square', vol: 0.07 }),
  error: () => { tone(320, 0.15, { type: 'square', vol: 0.1 }); tone(220, 0.25, { type: 'square', vol: 0.1, delay: 0.15 }); },
  success: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { vol: 0.12, delay: i * 0.1 })); },
  water: () => noise(1.6, { vol: 0.18, freq: 3000, q: 0.3, type: 'lowpass' }),
  magnet: () => { tone(880, 0.1, { vol: 0.12 }); tone(1320, 0.1, { vol: 0.12, delay: 0.1 }); tone(1760, 0.25, { vol: 0.1, delay: 0.2 }); },
};
