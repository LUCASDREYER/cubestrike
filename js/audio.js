// All sound is synthesized with WebAudio — no audio files, no copyrighted samples.

let ctx = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
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

function burst({ freq = 900, q = 1, dur = 0.12, vol = 0.25, type = 'bandpass', delay = 0 }) {
  const c = ac();
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
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
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const SHOT = {
  pistol: [1400, 0.09, 0.30],
  deagle: [700, 0.16, 0.42],
  smg:    [1600, 0.07, 0.22],
  rifle:  [1000, 0.12, 0.35],
  sniper: [420, 0.30, 0.50],
  enemy:  [800, 0.12, 0.13],
};

export const sfx = {
  unlock() { ac(); },
  shot(kind) {
    const k = SHOT[kind] || SHOT.rifle;
    burst({ freq: k[0], dur: k[1], vol: k[2] });
    tone({ freq: 120, dur: 0.05, vol: k[2] * 0.5, type: 'square', slide: -60 });
  },
  knife() { burst({ freq: 3000, type: 'highpass', dur: 0.08, vol: 0.10 }); },
  dry() { tone({ freq: 1200, dur: 0.03, vol: 0.10 }); },
  reload() {
    tone({ freq: 500, dur: 0.04, vol: 0.12 });
    tone({ freq: 700, dur: 0.04, vol: 0.12, delay: 0.15 });
    tone({ freq: 900, dur: 0.05, vol: 0.12, delay: 0.55 });
  },
  hit(head) { tone({ freq: head ? 1200 : 700, dur: 0.05, vol: 0.18, type: 'sine' }); },
  damage() {
    tone({ freq: 160, dur: 0.15, vol: 0.28, type: 'sawtooth', slide: -80 });
    burst({ freq: 300, dur: 0.10, vol: 0.15 });
  },
  kill() {
    tone({ freq: 880, dur: 0.07, vol: 0.15 });
    tone({ freq: 1320, dur: 0.09, vol: 0.15, delay: 0.07 });
  },
  buy() {
    tone({ freq: 1000, dur: 0.05, vol: 0.12, type: 'sine' });
    tone({ freq: 1500, dur: 0.06, vol: 0.12, delay: 0.06, type: 'sine' });
  },
  roundStart() {
    tone({ freq: 660, dur: 0.10, vol: 0.15 });
    tone({ freq: 660, dur: 0.10, vol: 0.15, delay: 0.15 });
    tone({ freq: 990, dur: 0.18, vol: 0.18, delay: 0.30 });
  },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.16, vol: 0.15, type: 'triangle', delay: i * 0.12 })); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.20, vol: 0.15, type: 'triangle', delay: i * 0.14 })); },
};
