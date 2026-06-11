// Weapon, map, and bot data. Units are meters-ish; +x east, +z south.

// `skin` + `energy` drive the Destiny-style exotic viewmodels: skin is the name
// shown in the HUD, energy tints the glow accents, tracers, and muzzle flash.
// `spread` is movement/air inaccuracy only (radians) — still, grounded shots
// have zero bloom; `recoil` scales the deterministic spray climb + sway.
export const WEAPONS = {
  knife:  { name: 'Knife',      skin: 'Severance Edge',     energy: 0x4dff88, slot: 'knife',     price: 0,    dmg: 55,  rpm: 150, mag: Infinity, reserve: Infinity, spread: 0,     reload: 0,   auto: false, melee: true,  recoil: 0,    killAward: 1500 },
  pistol: { name: 'P9 Sidearm', skin: 'Pale Vestige',       energy: 0xeef2ff, slot: 'secondary', price: 0,    dmg: 26,  rpm: 360, mag: 12, reserve: 36,  spread: 0.014, reload: 1.9, auto: false, melee: false, recoil: 0.55, killAward: 300 },
  deagle: { name: 'Big Iron',   skin: 'Sundown Verdict',    energy: 0xff7a1a, slot: 'secondary', price: 650,  dmg: 54,  rpm: 240, mag: 7,  reserve: 35,  spread: 0.026, reload: 2.2, auto: false, melee: false, recoil: 2.0,  killAward: 300 },
  smg:    { name: 'Wasp SMG',   skin: 'Static Hymn',        energy: 0x35c8ff, slot: 'primary',   price: 1250, dmg: 17,  rpm: 780, mag: 25, reserve: 100, spread: 0.018, reload: 2.4, auto: true,  melee: false, recoil: 0.55, killAward: 600 },
  rifle:  { name: 'Bulldog AR', skin: 'Void Doctrine',      energy: 0x9a4dff, slot: 'primary',   price: 2700, dmg: 34,  rpm: 600, mag: 30, reserve: 90,  spread: 0.022, reload: 2.5, auto: true,  melee: false, recoil: 0.85, killAward: 300 },
  sniper: { name: 'Long Tom',   skin: "Stargazer's Lament", energy: 0x7ad8ff, slot: 'primary',   price: 4750, dmg: 115, rpm: 41,  mag: 5,  reserve: 30,  spread: 0.050, reload: 3.2, auto: false, melee: false, recoil: 2.4,  killAward: 100 },
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
// Speedball (MW2019 Gunfight homage): a tight symmetrical paintball arena.
// Low snake run down the west side, dorito stand-ups down the east, can
// bunkers at the 50, climbable center bunker, mirrored spawn cover each end.
// 2.2 high = cover, 1.1 high = jumpable.
export const MAP_BOXES = [
  // outer walls
  [0, -34, 50, 2, 5, 0, 'wall'],
  [0, 34, 50, 2, 5, 0, 'wall'],
  [-24, 0, 2, 70, 5, 0, 'wall'],
  [24, 0, 2, 70, 5, 0, 'wall'],
  // center bunker, mountable via the low steps on either side
  [0, 0, 4, 4, 2.2, 0, 'bunkerRed'],
  [0, 4.5, 3, 2, 1.1, 0, 'bunkerYellow'],
  [0, -4.5, 3, 2, 1.1, 0, 'bunkerYellow'],
  // cans at the 50
  [-8, 6, 2, 2, 3, 0, 'bunkerYellow'],
  [8, 6, 2, 2, 3, 0, 'bunkerYellow'],
  [-8, -6, 2, 2, 3, 0, 'bunkerYellow'],
  [8, -6, 2, 2, 3, 0, 'bunkerYellow'],
  // snake: long low run along the west lane, gap at the 50
  [-16, 9, 2, 14, 1.1, 0, 'bunkerRed'],
  [-16, -9, 2, 14, 1.1, 0, 'bunkerRed'],
  // doritos: stand-up bunkers along the east lane
  [16, -11, 3, 3, 2.2, 0, 'bunkerBlue'],
  [16, 0, 3, 3, 2.2, 0, 'bunkerBlue'],
  [16, 11, 3, 3, 2.2, 0, 'bunkerBlue'],
  // CT (south) spawn cover
  [0, 22, 5, 2, 2.2, 0, 'bunkerBlue'],
  [-13, 23, 3, 3, 2.2, 0, 'bunkerBlue'],
  [13, 23, 3, 3, 2.2, 0, 'bunkerBlue'],
  [-4, 15, 4, 2, 1.1, 0, 'bunkerYellow'],
  [4, 15, 4, 2, 1.1, 0, 'bunkerYellow'],
  // T (north) spawn cover, mirrored
  [0, -22, 5, 2, 2.2, 0, 'bunkerRed'],
  [-13, -23, 3, 3, 2.2, 0, 'bunkerRed'],
  [13, -23, 3, 3, 2.2, 0, 'bunkerRed'],
  [-4, -15, 4, 2, 1.1, 0, 'bunkerYellow'],
  [4, -15, 4, 2, 1.1, 0, 'bunkerYellow'],
];

// Bot navigation graph: [x, z] nodes + undirected edges (straight lines are clear).
export const WAYPOINTS = [
  [0, 29],    // 0  CT spawn
  [-19, 27],  // 1  SW corner
  [19, 27],   // 2  SE corner
  [-20, 0],   // 3  west lane, behind the snake
  [20, 0],    // 4  east lane, behind the doritos
  [-19, -27], // 5  NW corner
  [19, -27],  // 6  NE corner
  [0, -29],   // 7  T spawn
  [0, 10],    // 8  mid, south of center
  [0, -10],   // 9  mid, north of center
  [-11, 10],  // 10 inner SW
  [11, 10],   // 11 inner SE
  [-11, -10], // 12 inner NW
  [11, -10],  // 13 inner NE
  [-12, 0],   // 14 snake gap, inner side
];
export const WAY_EDGES = [
  [0, 1], [0, 2], [0, 10], [0, 11],
  [1, 3], [3, 5], [2, 4], [4, 6],
  [5, 7], [6, 7], [7, 12], [7, 13],
  [8, 10], [8, 11], [9, 12], [9, 13],
  [10, 12], [11, 13],
  [3, 14], [14, 10], [14, 12],
  [4, 11], [4, 13],
  [1, 10], [2, 11], [5, 12], [6, 13],
];

export const PLAYER_SPAWN = { x: 0, z: 30, yaw: 0 };
export const BOT_SPAWNS = [[-16, -30], [-8, -30], [0, -30], [8, -30], [16, -30]];
export const BOT_NAMES = ['Anton', 'Igor', 'Pavel', 'Dmitri', 'Slava'];
// CT squad used by spectate (bots vs bots) mode.
export const CT_BOT_NAMES = ['Price', 'Soap', 'Gaz', 'Ghost', 'Roach'];
