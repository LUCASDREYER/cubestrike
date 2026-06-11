// All sound is synthesized with WebAudio — no audio files, no copyrighted samples.

let ctx = null;
let bus = null; // master compressor -> gain -> destination; glues layers, stops clipping

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;
    const master = ctx.createGain();
    master.gain.value = 0.9;
    comp.connect(master).connect(ctx.destination);
    bus = comp;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

let _noise = null;
function noiseBuf(c) {
  if (_noise) return _noise;
  const len = Math.floor(c.sampleRate * 0.5);
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  _noise = b;
  return b;
}

function burst({ freq = 900, sweep = 0, q = 1, dur = 0.12, vol = 0.25, type = 'bandpass', delay = 0 }) {
  const c = ac();
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf(c);
  src.playbackRate.value = 0.75 + Math.random() * 0.5; // decorrelates rapid repeats
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t);
  src.stop(t + dur + 0.05);
}

function tone({ freq = 440, dur = 0.1, vol = 0.15, type = 'square', delay = 0, slide = 0 }) {
  const c = ac();
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// Per-weapon shot layers: crack (snap transient), body (filtered report),
// thump (sub punch), and an optional tail that fakes a little room reverb.
const GUNS = {
  pistol: { crack: [5200, 0.020, 0.16], body: [1500, -900, 0.10, 0.26], thump: [150, -70, 0.07, 0.18] },
  deagle: { crack: [4200, 0.030, 0.20], body: [750, -500, 0.20, 0.40], thump: [95, -55, 0.16, 0.34], tail: 0.18 },
  smg:    { crack: [6000, 0.015, 0.12], body: [1900, -1100, 0.07, 0.20], thump: [170, -80, 0.05, 0.13] },
  rifle:  { crack: [5000, 0.020, 0.16], body: [1100, -650, 0.12, 0.30], thump: [130, -65, 0.09, 0.22] },
  sniper: { crack: [3600, 0.040, 0.24], body: [480, -330, 0.34, 0.46], thump: [70, -40, 0.30, 0.40], tail: 0.30 },
  enemy:  { crack: [4400, 0.020, 0.08], body: [900, -500, 0.12, 0.15], thump: [120, -60, 0.08, 0.09] },
};

export const sfx = {
  unlock() { ac(); },

  // dist (meters from camera) attenuates and muffles far-away fire
  shot(kind, dist = 0) {
    const gun = GUNS[kind] || GUNS.rifle;
    const att = dist ? Math.max(0.12, 1 - dist / 70) : 1;
    const far = dist > 25;
    const j = 0.92 + Math.random() * 0.16; // pitch jitter so volleys don't sound looped
    const [cf, cd, cv] = gun.crack;
    if (!far) burst({ freq: cf * j, type: 'highpass', dur: cd, vol: cv * att });
    const [bf, bs, bd, bv] = gun.body;
    burst({ freq: bf * j * (far ? 0.55 : 1), sweep: bs, dur: bd, vol: bv * att, q: 1.2 });
    const [tf, ts, td, tv] = gun.thump;
    tone({ freq: tf * j, dur: td, vol: tv * att, type: 'triangle', slide: ts });
    if (gun.tail) {
      burst({ freq: 600, sweep: -350, dur: gun.tail, vol: 0.10 * att, delay: 0.05 });
      burst({ freq: 350, sweep: -200, dur: gun.tail * 1.6, vol: 0.05 * att, delay: 0.12 });
    }
  },

  knife() {
    burst({ freq: 5200, type: 'highpass', dur: 0.07, vol: 0.08 });
    tone({ freq: 2300 + Math.random() * 400, dur: 0.10, vol: 0.05, type: 'triangle', slide: 700 });
  },

  dry() {
    burst({ freq: 2300, q: 6, dur: 0.02, vol: 0.10 });
    tone({ freq: 1100, dur: 0.025, vol: 0.07, delay: 0.035 });
  },

  // mag out, mag seat, slide rack
  reload() {
    burst({ freq: 1800, q: 5, dur: 0.03, vol: 0.12 });
    tone({ freq: 300, dur: 0.06, vol: 0.10, type: 'triangle', slide: -120 });
    burst({ freq: 900, q: 4, dur: 0.05, vol: 0.14, delay: 0.42 });
    tone({ freq: 220, dur: 0.07, vol: 0.12, delay: 0.42, type: 'triangle', slide: -80 });
    burst({ freq: 2600, q: 6, dur: 0.025, vol: 0.12, delay: 0.85 });
    burst({ freq: 2100, q: 6, dur: 0.035, vol: 0.14, delay: 0.95 });
  },

  hit(head) {
    if (head) {
      tone({ freq: 1700, dur: 0.07, vol: 0.20, slide: -500 }); // the dink
      tone({ freq: 2550, dur: 0.05, vol: 0.10, type: 'sine', delay: 0.01 });
    } else {
      tone({ freq: 750, dur: 0.045, vol: 0.16, type: 'sine', slide: -250 });
      burst({ freq: 900, dur: 0.03, vol: 0.06 });
    }
  },

  damage() {
    tone({ freq: 140, dur: 0.18, vol: 0.30, type: 'sawtooth', slide: -70 });
    burst({ freq: 240, type: 'lowpass', dur: 0.12, vol: 0.20 });
  },

  kill() {
    tone({ freq: 880, dur: 0.06, vol: 0.13, type: 'triangle' });
    tone({ freq: 1175, dur: 0.06, vol: 0.13, type: 'triangle', delay: 0.06 });
    tone({ freq: 1568, dur: 0.10, vol: 0.14, type: 'triangle', delay: 0.12 });
  },

  buy() {
    burst({ freq: 2400, q: 8, dur: 0.03, vol: 0.10 });
    tone({ freq: 1320, dur: 0.10, vol: 0.10, type: 'sine', delay: 0.05 });
    tone({ freq: 1760, dur: 0.12, vol: 0.10, type: 'sine', delay: 0.10 });
  },

  step() {
    burst({ freq: 260 + Math.random() * 120, type: 'lowpass', q: 0.7, dur: 0.05, vol: 0.05 + Math.random() * 0.02 });
  },

  land(hard) {
    burst({ freq: 300, type: 'lowpass', dur: 0.08, vol: hard ? 0.16 : 0.10 });
    tone({ freq: 110, dur: 0.07, vol: hard ? 0.14 : 0.08, type: 'triangle', slide: -40 });
  },

  whiz() {
    burst({ freq: 3800, sweep: -2600, q: 9, dur: 0.16, vol: 0.05 });
  },

  roundStart() {
    for (const [f, d] of [[660, 0], [660, 0.15], [990, 0.30]]) {
      tone({ freq: f, dur: d === 0.30 ? 0.18 : 0.10, vol: 0.15, delay: d });
      tone({ freq: f / 2, dur: 0.12, vol: 0.06, type: 'triangle', delay: d });
    }
  },

  win() {
    [523, 659, 784, 1047].forEach((f, i) => {
      tone({ freq: f, dur: 0.16, vol: 0.14, type: 'triangle', delay: i * 0.12 });
      tone({ freq: f * 1.5, dur: 0.16, vol: 0.05, type: 'sine', delay: i * 0.12 });
    });
  },

  lose() {
    [392, 330, 262, 196].forEach((f, i) => {
      tone({ freq: f, dur: 0.20, vol: 0.14, type: 'triangle', delay: i * 0.14 });
      tone({ freq: f / 2, dur: 0.22, vol: 0.07, type: 'sine', delay: i * 0.14 });
    });
  },
};
