// Weapon, map, and bot data. Units are meters-ish; +x east, +z south.

// `skin` + `energy` drive the Destiny-style exotic viewmodels: skin is the name
// shown in the HUD, energy tints the glow accents, tracers, and muzzle flash.
export const WEAPONS = {
  knife:  { name: 'Knife',      skin: 'Severance Edge',     energy: 0x4dff88, slot: 'knife',     price: 0,    dmg: 55,  rpm: 150, mag: Infinity, reserve: Infinity, spread: 0,     reload: 0,   auto: false, melee: true,  recoil: 0,   killAward: 1500 },
  pistol: { name: 'P9 Sidearm', skin: 'Pale Vestige',       energy: 0xeef2ff, slot: 'secondary', price: 0,    dmg: 26,  rpm: 360, mag: 12, reserve: 36,  spread: 0.014, reload: 1.9, auto: false, melee: false, recoil: 0.5, killAward: 300 },
  deagle: { name: 'Big Iron',   skin: 'Sundown Verdict',    energy: 0xff7a1a, slot: 'secondary', price: 650,  dmg: 54,  rpm: 240, mag: 7,  reserve: 35,  spread: 0.020, reload: 2.2, auto: false, melee: false, recoil: 1.6, killAward: 300 },
  smg:    { name: 'Wasp SMG',   skin: 'Static Hymn',        energy: 0x35c8ff, slot: 'primary',   price: 1250, dmg: 17,  rpm: 780, mag: 25, reserve: 100, spread: 0.030, reload: 2.4, auto: true,  melee: false, recoil: 0.4, killAward: 600 },
  rifle:  { name: 'Bulldog AR', skin: 'Void Doctrine',      energy: 0x9a4dff, slot: 'primary',   price: 2700, dmg: 34,  rpm: 600, mag: 30, reserve: 90,  spread: 0.022, reload: 2.5, auto: true,  melee: false, recoil: 0.7, killAward: 300 },
  sniper: { name: 'Long Tom',   skin: "Stargazer's Lament", energy: 0x7ad8ff, slot: 'primary',   price: 4750, dmg: 115, rpm: 41,  mag: 5,  reserve: 30,  spread: 0.050, reload: 3.2, auto: false, melee: false, recoil: 2.4, killAward: 100 },
};

// Buy menu rows, in key order (1..n). 'armor' is special-cased.
export const BUY_ITEMS = [
  { id: 'deagle' },
  { id: 'smg' },
  { id: 'rifle' },
  { id: 'sniper' },
  { id: 'armor', name: 'Kevlar Vest', price: 650 },
];

export const ECON = { start: 800, win: 3250, loss: 1400, cap: 16000 };

// Bunny hopping: re-jumping within `window` seconds of landing multiplies move
// speed by `gain`, up to `cap`; staying grounded longer bleeds the bonus off.
export const BHOP = { gain: 1.12, cap: 1.9, window: 0.25 };

export const MATCH_WIN_ROUNDS = 8;
export const BUY_TIME = 6;
export const ROUND_TIME = 90;

// Map blockout: [x, z, width, depth, height, baseY, kind]
export const MAP_BOXES = [
  // outer walls
  [0, -36, 104, 2, 5, 0, 'wall'],
  [0, 36, 104, 2, 5, 0, 'wall'],
  [-51, 0, 2, 74, 5, 0, 'wall'],
  [51, 0, 2, 74, 5, 0, 'wall'],
  // mid wall with door gap at x 0..4, plus a lintel above the gap
  [-11, 0, 22, 2, 4, 0, 'wall'],
  [13, 0, 18, 2, 4, 0, 'wall'],
  [2, 0, 4, 2, 1.5, 2.5, 'wall'],
  // lane dividers
  [-30, -12, 2, 24, 4, 0, 'wall'],
  [30, 8, 2, 16, 4, 0, 'wall'],
  // pillar
  [-14, 10, 3, 3, 4, 0, 'pillar'],
  // crates (2.2 high = cover, 1.1 high = jumpable)
  [-42, -16, 4, 4, 2.2, 0, 'crate'],
  [-24, 6, 3, 3, 2.2, 0, 'crate'],
  [-8, -14, 4, 4, 2.2, 0, 'crate'],
  [8, 14, 3, 3, 2.2, 0, 'crate'],
  [18, -10, 4, 4, 2.2, 0, 'crate'],
  [38, 14, 3, 3, 2.2, 0, 'crate'],
  [42, -20, 4, 4, 2.2, 0, 'crate'],
  [24, 22, 3, 3, 2.2, 0, 'crate'],
  [6, -20, 4, 4, 2.2, 0, 'crate'],
  [6, -20, 2.6, 2.6, 1.5, 2.2, 'crate'],
  [-6, 20, 4, 4, 1.1, 0, 'crateLow'],
  [-34, 20, 3, 3, 1.1, 0, 'crateLow'],
];

// Bot navigation graph: [x, z] nodes + undirected edges (straight lines are clear).
export const WAYPOINTS = [
  [0, 28],    // 0  CT spawn
  [-38, 28],  // 1
  [38, 28],   // 2
  [-38, 2],   // 3
  [38, 2],    // 4
  [-38, -26], // 5
  [38, -26],  // 6
  [0, -28],   // 7  T spawn
  [2, 10],    // 8  mid door, south
  [2, -10],   // 9  mid door, north
  [-20, -26], // 10
  [20, -26],  // 11
  [-20, 14],  // 12
  [20, 14],   // 13
];
export const WAY_EDGES = [
  [0, 1], [0, 2], [0, 8], [0, 12], [0, 13],
  [1, 3], [3, 5], [2, 4], [4, 6],
  [5, 10], [10, 7], [6, 11], [11, 7],
  [8, 9], [9, 7], [12, 8], [13, 8],
  [1, 12], [2, 13], [9, 10], [9, 11],
];

export const PLAYER_SPAWN = { x: 0, z: 30, yaw: 0 };
export const BOT_SPAWNS = [[-40, -30], [-20, -30], [0, -30], [20, -30], [40, -30]];
export const BOT_NAMES = ['Anton', 'Igor', 'Pavel', 'Dmitri', 'Slava'];
