import * as THREE from 'three';
import {
  WEAPONS, BUY_ITEMS, ECON, BHOP, MATCH_WIN_ROUNDS, BUY_TIME, ROUND_TIME,
  MAP_BOXES, WAYPOINTS, WAY_EDGES, PLAYER_SPAWN, BOT_SPAWNS, BOT_NAMES, CT_BOT_NAMES,
} from './config.js';
import { sfx } from './audio.js';

// ---------------------------------------------------------------- DOM
const $ = (id) => document.getElementById(id);
const canvas = $('game');
const els = {
  hud: $('hud'), scoreCT: $('scoreCT'), scoreT: $('scoreT'), timer: $('timer'),
  roundLabel: $('roundLabel'), enemies: $('enemies'), killfeed: $('killfeed'),
  hitmarker: $('hitmarker'), speedo: $('speedo'), banner: $('banner'), bannerMain: $('bannerMain'),
  bannerSub: $('bannerSub'), hp: $('hp'), armor: $('armor'), money: $('money'),
  weapon: $('weapon'), ammo: $('ammo'), buymenu: $('buymenu'),
  scoreboard: $('scoreboard'), vignette: $('vignette'), scope: $('scope'),
  overlay: $('overlay'), overlayMsg: $('overlayMsg'),
  matchOverlay: $('matchOverlay'), matchResult: $('matchResult'),
  matchScore: $('matchScore'), matchStats: $('matchStats'), againBtn: $('againBtn'),
  spectateBtn: $('spectateBtn'), spectateBar: $('spectateBar'),
  camBtn: $('camBtn'), exitBtn: $('exitBtn'),
  touchUI: $('touchUI'), touchBtn: $('touchBtn'), joyZone: $('joyZone'),
  aimZone: $('aimZone'), joyBase: $('joyBase'), joyKnob: $('joyKnob'),
  btnFire: $('btnFire'), btnJump: $('btnJump'), btnReload: $('btnReload'),
  btnScope: $('btnScope'), btnBuy: $('btnBuy'), btnPause: $('btnPause'),
  wpnRow: $('wpnRow'),
};

// ---------------------------------------------------------------- renderer / scene
// PS1 presentation: render at a low internal resolution and let CSS upscale
// with nearest-neighbor; snap vertices to a coarse grid for the affine
// wobble; hard 1-tap shadows. The HUD stays crisp — only the world is 1997.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
const PIXEL_H = 432; // internal vertical resolution — the retro dial
function sizeRenderer() {
  const s = Math.max(1, window.innerHeight / PIXEL_H);
  renderer.setPixelRatio(1);
  renderer.setSize(Math.round(window.innerWidth / s), Math.round(window.innerHeight / s), false);
}
sizeRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;

// vertex snapping, injected into every material's vertex stage
THREE.ShaderChunk.project_vertex = THREE.ShaderChunk.project_vertex.replace(
  'gl_Position = projectionMatrix * mvPosition;',
  `gl_Position = projectionMatrix * mvPosition;
  if (gl_Position.w > 0.0) {
    vec2 psxGrid = vec2(640.0, 360.0);
    vec3 psxNdc = gl_Position.xyz / gl_Position.w;
    psxNdc.xy = (floor((psxNdc.xy * 0.5 + 0.5) * psxGrid + 0.5) / psxGrid) * 2.0 - 1.0;
    gl_Position.xyz = psxNdc * gl_Position.w;
  }`,
);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc9b287);
scene.fog = new THREE.Fog(0xc9b287, 60, 160);

const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.1, 300);
camera.rotation.order = 'YXZ';
scene.add(camera);

scene.add(new THREE.HemisphereLight(0xfff3d6, 0x6b5a3a, 0.95));
const sun = new THREE.DirectionalLight(0xfff0d0, 1.6);
sun.position.set(35, 60, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -70;
sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70;
sun.shadow.camera.bottom = -70;
sun.shadow.camera.far = 160;
scene.add(sun);

const muzzleLight = new THREE.PointLight(0xffc070, 0, 9);
scene.add(muzzleLight);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  sizeRenderer();
});

// ---------------------------------------------------------------- map
// All surfaces are tiny generated canvases with nearest filtering — chunky
// low-budget texels, like the disc only had room for 64x64s.
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function speckle(g, w, h, n, alpha) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = Math.random() * alpha;
    g.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 1 + (Math.random() * 2 | 0), 1 + (Math.random() * 2 | 0));
  }
  g.globalAlpha = 1;
}

function shade(hex, f) {
  const ch = (s) => Math.min(255, Math.round(((hex >> s) & 255) * f));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// worn concrete panels
function wallTex(color) {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = shade(color, 1);
    g.fillRect(0, 0, w, h);
    g.strokeStyle = shade(color, 0.72);
    g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
    g.fillStyle = shade(color, 0.8);
    speckle(g, w, h, 260, 0.35);
    g.fillStyle = shade(color, 1.18);
    speckle(g, w, h, 120, 0.25);
    g.fillStyle = 'rgba(40,30,15,0.25)';
    g.fillRect(0, h - 8, w, 8); // grime line at the ground
  });
}

// inflatable vinyl: top sheen, vertical seams, ground weld band
function vinylTex(color) {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = shade(color, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle = shade(color, 1.25);
    g.fillRect(0, 4, w, 7);
    g.strokeStyle = shade(color, 0.7);
    g.lineWidth = 1;
    for (let x = 0; x <= w; x += 16) {
      g.beginPath();
      g.moveTo(x + 0.5, 0);
      g.lineTo(x + 0.5, h);
      g.stroke();
    }
    g.fillStyle = shade(color, 0.78);
    g.fillRect(0, h - 6, w, 6);
    g.fillStyle = shade(color, 0.85);
    speckle(g, w, h, 140, 0.2);
  });
}

// plywood planks
function plankTex(color) {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = shade(color, 1);
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      g.fillStyle = shade(color, 0.62);
      g.fillRect(0, y, w, 2);
      g.fillStyle = shade(color, 0.9 + (y % 32 ? 0.16 : 0));
      g.fillRect(0, y + 2, w, 14);
    }
    g.fillStyle = shade(color, 0.75);
    speckle(g, w, h, 220, 0.3);
  });
}

// the floor is one 1m≈5px canvas with painted, worn speedball field markings
const floorTex = canvasTex(256, 352, (g, w, h) => {
  g.fillStyle = '#a08a5e';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#6e5c39';
  speckle(g, w, h, 2600, 0.3);
  g.fillStyle = '#bba877';
  speckle(g, w, h, 1400, 0.25);
  g.strokeStyle = '#e8e2c8';
  g.globalAlpha = 0.42;
  g.lineWidth = 2;
  g.strokeRect(10, 10, w - 20, h - 20); // field boundary
  g.beginPath();
  g.moveTo(10, h / 2);
  g.lineTo(w - 10, h / 2); // the 50
  g.stroke();
  g.beginPath();
  g.arc(w / 2, h / 2, 30, 0, Math.PI * 2); // center circle
  g.stroke();
  g.globalAlpha = 1;
  g.fillStyle = '#a08a5e';
  speckle(g, w, h, 700, 0.5); // chip the paint
});

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 70),
  new THREE.MeshLambertMaterial({ map: floorTex }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const KIND_TEX = {
  wall: wallTex(0xb39b72),
  pillar: plankTex(0x9c8259),
  crate: plankTex(0x8a6a3f),
  crateLow: plankTex(0x7c7245),
  bunkerRed: vinylTex(0xd03a2f),
  bunkerBlue: vinylTex(0x2f6fd0),
  bunkerYellow: vinylTex(0xe0b33a),
};
const WALLS = []; // { min:Vector3, max:Vector3 }

for (const [x, z, w, d, h, y, kind] of MAP_BOXES) {
  // per-box texture repeat keeps texel density roughly world-scaled
  const tex = KIND_TEX[kind].clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, Math.round(Math.max(w, d) / 3)), Math.max(1, Math.round(h / 3)));
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ map: tex }),
  );
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  WALLS.push({
    min: new THREE.Vector3(x - w / 2, y, z - d / 2),
    max: new THREE.Vector3(x + w / 2, y + h, z + d / 2),
  });
}

// Ray vs AABB (slab method). Returns distance along dir, or null.
function rayBox(o, d, box, maxT) {
  let t0 = 0;
  let t1 = maxT;
  for (const a of ['x', 'y', 'z']) {
    const inv = 1 / d[a];
    let ta = (box.min[a] - o[a]) * inv;
    let tb = (box.max[a] - o[a]) * inv;
    if (ta > tb) [ta, tb] = [tb, ta];
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return null;
  }
  return t0 > 0.001 ? t0 : null;
}

function rayWalls(o, d, maxT) {
  let best = null;
  for (const w of WALLS) {
    const t = rayBox(o, d, w, maxT);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

const _vs = new THREE.Vector3();
function raySphere(o, d, c, r) {
  const oc = _vs.copy(o).sub(c);
  const b = oc.dot(d);
  const disc = b * b - (oc.lengthSq() - r * r);
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t > 0.001 ? t : null;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

// ---------------------------------------------------------------- particles
const PARTICLE_N = 320;
const pPos = new Float32Array(PARTICLE_N * 3);
const pCol = new Float32Array(PARTICLE_N * 3);
const pVel = new Float32Array(PARTICLE_N * 3);
const pLife = new Float32Array(PARTICLE_N);
pPos.fill(-999);
const pGeom = new THREE.BufferGeometry();
pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeom.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const points = new THREE.Points(pGeom, new THREE.PointsMaterial({
  size: 0.14, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false,
}));
points.frustumCulled = false;
scene.add(points);
let pNext = 0;

function spawnParticles(p, color, count, speed) {
  const c = new THREE.Color(color);
  for (let i = 0; i < count; i++) {
    const j = pNext;
    pNext = (pNext + 1) % PARTICLE_N;
    pPos[j * 3] = p.x; pPos[j * 3 + 1] = p.y; pPos[j * 3 + 2] = p.z;
    pVel[j * 3] = (Math.random() - 0.5) * speed;
    pVel[j * 3 + 1] = Math.random() * speed * 0.8;
    pVel[j * 3 + 2] = (Math.random() - 0.5) * speed;
    pCol[j * 3] = c.r; pCol[j * 3 + 1] = c.g; pCol[j * 3 + 2] = c.b;
    pLife[j] = 0.35 + Math.random() * 0.25;
  }
}

function updateParticles(dt) {
  for (let j = 0; j < PARTICLE_N; j++) {
    if (pLife[j] <= 0) continue;
    pLife[j] -= dt;
    if (pLife[j] <= 0) { pPos[j * 3 + 1] = -999; continue; }
    pVel[j * 3 + 1] -= 9 * dt;
    pPos[j * 3] += pVel[j * 3] * dt;
    pPos[j * 3 + 1] += pVel[j * 3 + 1] * dt;
    pPos[j * 3 + 2] += pVel[j * 3 + 2] * dt;
  }
  pGeom.attributes.position.needsUpdate = true;
  pGeom.attributes.color.needsUpdate = true;
}

// ---------------------------------------------------------------- tracers
const tracers = [];
function spawnTracer(from, to, color = 0xffd27a) {
  const geom = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
  const line = new THREE.Line(geom, mat);
  scene.add(line);
  tracers.push({ line, t: 0.07 });
}

function updateTracers(dt) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tr = tracers[i];
    tr.t -= dt;
    if (tr.t <= 0) {
      scene.remove(tr.line);
      tr.line.geometry.dispose();
      tr.line.material.dispose();
      tracers.splice(i, 1);
    } else {
      tr.line.material.opacity = tr.t / 0.07;
    }
  }
}

// ---------------------------------------------------------------- player
const GRAVITY = -12;
const PLAYER_HALF = 0.42;
const PLAYER_HEIGHT = 1.8;
const EYE = 1.62;

const player = {
  pos: new THREE.Vector3(PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z),
  vy: 0, yaw: PLAYER_SPAWN.yaw, pitch: 0, grounded: true,
  hp: 100, armor: 0, money: ECON.start, alive: true, speedMult: 1,
  load: { primary: null, secondary: null, knife: { id: 'knife' } },
  cur: 'secondary',
  cooldown: 0, reloading: 0, switchT: 0, zoomed: false, sprayI: 0, sprayCool: 0,
  recoilP: 0, recoilY: 0,
  kills: 0, deaths: 0, shots: 0, hits: 0,
};

function freshInst(id) {
  return { id, mag: WEAPONS[id].mag, reserve: WEAPONS[id].reserve };
}

function resetLoadout() {
  player.load.primary = null;
  player.load.secondary = freshInst('pistol');
  player.cur = 'secondary';
}

function curInst() { return player.load[player.cur]; }
function curSpec() { return WEAPONS[curInst().id]; }

function switchSlot(slot) {
  if (!player.load[slot] || player.cur === slot) return;
  player.cur = slot;
  player.reloading = 0;
  player.switchT = 0.35;
  player.sprayI = 0;
  setZoom(false);
  buildViewModel(curInst().id);
  updateHUD();
}

function giveWeapon(id) {
  const slot = WEAPONS[id].slot;
  player.load[slot] = freshInst(id);
  player.cur = slot;
  player.switchT = 0.35;
  setZoom(false);
  buildViewModel(id);
}

function playerOverlap(box) {
  const p = player.pos;
  return p.x + PLAYER_HALF > box.min.x && p.x - PLAYER_HALF < box.max.x
    && p.z + PLAYER_HALF > box.min.z && p.z - PLAYER_HALF < box.max.z
    && p.y + PLAYER_HEIGHT > box.min.y && p.y < box.max.y;
}

function resolveAxis(axis) {
  for (const box of WALLS) {
    if (!playerOverlap(box)) continue;
    const center = (box.min[axis] + box.max[axis]) / 2;
    if (player.pos[axis] < center) player.pos[axis] = box.min[axis] - PLAYER_HALF;
    else player.pos[axis] = box.max[axis] + PLAYER_HALF;
  }
}

function resolveVertical() {
  for (const box of WALLS) {
    if (!playerOverlap(box)) continue;
    if (player.vy <= 0 && player.pos.y > box.max.y - 0.7) {
      player.pos.y = box.max.y;
      player.vy = 0;
      player.grounded = true;
    } else if (player.vy > 0) {
      player.pos.y = box.min.y - PLAYER_HEIGHT;
      player.vy = 0;
    }
  }
}

const keys = {};
let mouseDown = false;
let deathT = 0;
let groundTime = 0;
let bobPhase = 0;
let bobAmp = 0;
let vmPitchKick = 0;

function updatePlayer(dt) {
  const canMove = state === 'live' || state === 'over';
  let f = 0;
  let r = 0;
  if (player.alive && canMove) {
    f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    if (touchMode) { f += joy.f; r += joy.r; }
    const len = Math.hypot(f, r) || 1;
    const speed = (curSpec().melee ? 7.6 : 6.8) * player.speedMult;
    const sy = Math.sin(player.yaw);
    const cy = Math.cos(player.yaw);
    const dx = (f / len) * -sy + (r / len) * cy;
    const dz = (f / len) * -cy + (r / len) * -sy;
    player.pos.x += dx * speed * dt;
    resolveAxis('x');
    player.pos.z += dz * speed * dt;
    resolveAxis('z');
    if (keys.Space && player.grounded) {
      // bhop: a hop chained inside the window banks speed; holding Space re-hops on landing
      if (groundTime < BHOP.window) player.speedMult = Math.min(BHOP.cap, player.speedMult * BHOP.gain);
      player.vy = 5.4;
      player.grounded = false;
    }
  }
  player.vy += GRAVITY * dt;
  player.pos.y += player.vy * dt;
  const wasGrounded = player.grounded;
  const fallVy = player.vy;
  player.grounded = false;
  resolveVertical();
  if (player.pos.y <= 0) {
    player.pos.y = 0;
    player.vy = 0;
    player.grounded = true;
  }
  if (player.alive && player.grounded && !wasGrounded) sfx.land(fallVy < -8);
  groundTime = player.grounded ? groundTime + dt : 0;
  if (groundTime > BHOP.window) player.speedMult = Math.max(1, player.speedMult - dt * 2.5);

  // weapon timers
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.switchT = Math.max(0, player.switchT - dt);
  player.sprayCool -= dt;
  if (player.sprayCool <= 0) player.sprayI = 0; // pause in fire resets the spray pattern
  if (player.reloading > 0) {
    player.reloading -= dt;
    if (player.reloading <= 0) {
      player.reloading = 0;
      const inst = curInst();
      const spec = WEAPONS[inst.id];
      const take = Math.min(spec.mag - inst.mag, inst.reserve);
      inst.mag += take;
      inst.reserve -= take;
      updateHUD();
    }
  }

  if (mouseDown && player.alive && state === 'live' && curSpec().auto) fire();

  // walk wobble: bob phase advances with footsteps, amplitude eases in/out
  const isMoving = player.alive && (f !== 0 || r !== 0);
  bobAmp += ((isMoving && player.grounded ? 1 : 0) - bobAmp) * Math.min(1, dt * 8);
  if (isMoving && player.grounded) {
    const prevPhase = bobPhase;
    bobPhase += dt * 6.5 * player.speedMult;
    // a footstep lands on each half-cycle of the bob
    if (Math.floor(prevPhase / Math.PI) !== Math.floor(bobPhase / Math.PI)) sfx.step();
  }

  // view punch recovers on its own once the gun rests, CS-style — the spray
  // climbs while you hold the trigger, then the camera glides back to your aim
  if (player.cooldown <= 0) {
    const rec = Math.pow(0.0005, dt);
    player.recoilP *= rec;
    player.recoilY *= rec;
  }

  // camera
  if (player.alive) {
    camera.position.set(
      player.pos.x,
      player.pos.y + EYE + Math.sin(bobPhase * 2) * 0.035 * bobAmp,
      player.pos.z,
    );
    camera.rotation.set(
      Math.max(-1.55, Math.min(1.55, player.pitch + player.recoilP)),
      player.yaw + player.recoilY,
      Math.sin(bobPhase) * 0.005 * bobAmp,
    );
    if (!player.zoomed) {
      // subtle fov stretch sells bhop speed
      const tf = 74 + (player.speedMult - 1) * 10;
      if (Math.abs(camera.fov - tf) > 0.05) {
        camera.fov += (tf - camera.fov) * Math.min(1, dt * 8);
        camera.updateProjectionMatrix();
      }
    }
  } else {
    deathT = Math.min(1, deathT + dt * 2.2);
    camera.position.set(player.pos.x, player.pos.y + EYE - deathT * 1.1, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, deathT * 0.5);
  }

  // decay effects
  vmKick = Math.max(0, vmKick - dt * 0.6);
  vmPitchKick *= Math.pow(0.002, dt);
  muzzleLight.intensity *= Math.pow(0.0001, dt);
  if (muzzleLight.intensity < 0.05) muzzleLight.intensity = 0;
  vignetteFlash = Math.max(0, vignetteFlash - dt * 1.8);
  if (player.alive) els.vignette.style.opacity = vignetteFlash;

  // viewmodel: recoil kick + walk sway
  if (vmGroup.visible) {
    vmGroup.position.set(
      0.3 + Math.sin(bobPhase) * 0.015 * bobAmp,
      -0.3 - Math.abs(Math.sin(bobPhase * 2)) * 0.012 * bobAmp + (player.grounded ? 0 : 0.012),
      vmBaseZ + vmKick,
    );
    vmGroup.rotation.set(vmPitchKick, 0, Math.sin(bobPhase) * 0.03 * bobAmp);
  }

  // bhop speedometer
  setText(els.speedo, `≫ ${player.speedMult.toFixed(2)}×`);
  els.speedo.style.opacity = player.speedMult > 1.02 ? 0.9 : 0;
}

let vignetteFlash = 0;

function damagePlayer(d) {
  if (!player.alive) return;
  if (player.armor > 0) {
    player.hp -= Math.round(d * 0.55);
    player.armor = Math.max(0, player.armor - Math.round(d * 0.5));
  } else {
    player.hp -= Math.round(d);
  }
  vignetteFlash = 0.75;
  sfx.damage();
  if (player.hp <= 0) {
    player.hp = 0;
    playerDie();
  }
  updateHUD();
}

function playerDie() {
  player.alive = false;
  player.deaths++;
  deathT = 0;
  setZoom(false);
  vmGroup.visible = false;
  els.vignette.classList.add('dead');
  addKillfeed('Terrorists ⟶ you', true);
  banner('YOU DIED', '', true);
  setTimeout(() => { if (state === 'live') endRound(false); }, 1700);
}

// ---------------------------------------------------------------- viewmodel
const vmGroup = new THREE.Group();
camera.add(vmGroup);
let vmKick = 0;
const vmBaseZ = -0.55;

function vmMat(color, glow = 0) {
  const m = new THREE.MeshLambertMaterial({ color });
  if (glow) {
    m.emissive.setHex(color);
    m.emissiveIntensity = glow;
    m.color.setHex(0x15151a);
  }
  return m;
}

function vmBox(g, w, h, d, x, y, z, color, glow = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), vmMat(color, glow));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

function vmCyl(g, r, len, x, y, z, color, { glow = 0, seg = 12, axis = 'z' } = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), vmMat(color, glow));
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  else if (axis === 'x') m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

const GUNMETAL = 0x23252b;
const PLATE = 0x3a3d45;
const GOLD = 0xc9a227;
const IVORY = 0xd8d2c2;

// Exotic skins: angular sci-fi frames with emissive energy accents per weapon.
function buildViewModel(id) {
  vmGroup.clear();
  vmGroup.position.set(0.3, -0.3, vmBaseZ);
  const energy = WEAPONS[id].energy;
  if (id === 'knife') {
    // Severance Edge — strand energy blade
    vmBox(vmGroup, 0.035, 0.05, 0.2, 0, -0.02, 0.1, GUNMETAL);
    vmBox(vmGroup, 0.07, 0.018, 0.04, 0, 0.005, -0.005, PLATE);            // guard
    vmBox(vmGroup, 0.014, 0.022, 0.3, 0, 0.028, -0.17, PLATE);             // spine
    vmBox(vmGroup, 0.01, 0.05, 0.3, 0, -0.005, -0.17, energy, 1.4);        // blade
  } else if (id === 'pistol') {
    // Pale Vestige — kinetic sidearm
    vmBox(vmGroup, 0.07, 0.09, 0.28, 0, 0.02, -0.06, GUNMETAL);
    vmBox(vmGroup, 0.075, 0.035, 0.3, 0, 0.085, -0.07, PLATE);             // slide
    vmBox(vmGroup, 0.078, 0.01, 0.18, 0, 0.062, -0.08, energy, 1.2);       // energy slit
    vmCyl(vmGroup, 0.015, 0.05, 0, 0.06, -0.235, PLATE);                   // barrel
    vmBox(vmGroup, 0.06, 0.13, 0.07, 0, -0.07, 0.05, IVORY);               // grip
  } else if (id === 'deagle') {
    // Sundown Verdict — solar hand cannon
    vmBox(vmGroup, 0.07, 0.08, 0.32, 0, 0.035, -0.1, GUNMETAL);
    vmCyl(vmGroup, 0.026, 0.3, 0, 0.075, -0.16, PLATE, { seg: 8 });        // octagonal barrel
    vmCyl(vmGroup, 0.03, 0.02, 0, 0.075, -0.305, energy, { glow: 1.5 });   // muzzle ring
    vmCyl(vmGroup, 0.05, 0.055, 0, 0, 0, GUNMETAL, { axis: 'x' });         // cylinder drum
    vmCyl(vmGroup, 0.018, 0.06, 0, 0, 0, energy, { glow: 1.5, axis: 'x' }); // glowing chambers
    vmBox(vmGroup, 0.012, 0.05, 0.2, 0.042, 0.07, -0.12, GOLD);            // gold filigree
    vmBox(vmGroup, 0.012, 0.05, 0.2, -0.042, 0.07, -0.12, GOLD);
    vmBox(vmGroup, 0.02, 0.045, 0.02, 0, 0.09, 0.06, GOLD);                // hammer
    vmBox(vmGroup, 0.055, 0.14, 0.07, 0, -0.085, 0.07, IVORY);             // grip
  } else if (id === 'smg') {
    // Static Hymn — arc SMG
    vmBox(vmGroup, 0.075, 0.1, 0.42, 0, 0, -0.12, GUNMETAL);
    vmBox(vmGroup, 0.082, 0.05, 0.2, 0, 0.04, -0.32, PLATE);               // shroud
    vmCyl(vmGroup, 0.02, 0.18, 0.05, 0.04, -0.32, energy, { glow: 1.2 });  // arc coils
    vmCyl(vmGroup, 0.02, 0.18, -0.05, 0.04, -0.32, energy, { glow: 1.2 });
    vmCyl(vmGroup, 0.014, 0.08, 0, 0.04, -0.45, PLATE);                    // barrel
    vmBox(vmGroup, 0.078, 0.012, 0.3, 0, -0.048, -0.15, energy, 1.0);      // belly strip
    vmBox(vmGroup, 0.05, 0.16, 0.06, 0, -0.12, -0.02, PLATE);              // mag
    vmBox(vmGroup, 0.05, 0.07, 0.12, 0, -0.01, 0.12, GUNMETAL);            // stock
  } else if (id === 'rifle') {
    // Void Doctrine — void auto rifle
    vmBox(vmGroup, 0.08, 0.1, 0.55, 0, 0, -0.18, GUNMETAL);
    vmBox(vmGroup, 0.06, 0.04, 0.42, 0, 0.075, -0.18, PLATE);              // top rail
    vmBox(vmGroup, 0.085, 0.045, 0.09, 0, 0.01, -0.02, energy, 1.3);       // void core
    vmCyl(vmGroup, 0.018, 0.26, 0, 0.02, -0.57, PLATE);                    // barrel
    vmBox(vmGroup, 0.05, 0.05, 0.06, 0, 0.02, -0.71, GUNMETAL);            // muzzle brake
    vmBox(vmGroup, 0.052, 0.012, 0.06, 0, 0.048, -0.71, energy, 1.3);
    vmBox(vmGroup, 0.083, 0.012, 0.16, 0, 0.038, -0.32, energy, 0.9);      // vent slit
    vmBox(vmGroup, 0.05, 0.17, 0.07, 0, -0.125, -0.06, PLATE).rotation.x = 0.25; // canted mag
    vmBox(vmGroup, 0.045, 0.06, 0.1, 0, -0.07, -0.34, GUNMETAL);           // foregrip
  } else if (id === 'sniper') {
    // Stargazer's Lament — stasis rail sniper
    vmBox(vmGroup, 0.08, 0.1, 0.6, 0, 0, -0.18, GUNMETAL);
    vmCyl(vmGroup, 0.016, 0.5, 0, 0.02, -0.68, PLATE);                     // rail barrel
    vmCyl(vmGroup, 0.034, 0.016, 0, 0.02, -0.52, energy, { glow: 1.4 });   // coil rings
    vmCyl(vmGroup, 0.034, 0.016, 0, 0.02, -0.66, energy, { glow: 1.4 });
    vmCyl(vmGroup, 0.034, 0.016, 0, 0.02, -0.8, energy, { glow: 1.4 });
    vmCyl(vmGroup, 0.036, 0.24, 0, 0.1, -0.16, PLATE);                     // scope
    vmCyl(vmGroup, 0.03, 0.012, 0, 0.1, -0.038, energy, { glow: 1.5 });    // lens
    vmBox(vmGroup, 0.012, 0.07, 0.1, 0.05, -0.02, 0.06, energy, 0.8);      // crystal fins
    vmBox(vmGroup, 0.012, 0.07, 0.1, -0.05, -0.02, 0.06, energy, 0.8);
    vmBox(vmGroup, 0.05, 0.09, 0.14, 0, -0.03, 0.1, PLATE);                // stock
  }
  vmGroup.visible = true;
}

function setZoom(on) {
  const can = on && curInst().id === 'sniper';
  player.zoomed = can;
  camera.fov = can ? 24 : 74;
  camera.updateProjectionMatrix();
  els.scope.classList.toggle('hidden', !can);
  vmGroup.visible = !can && player.alive;
}

// ---------------------------------------------------------------- shooting
function fire() {
  if (paused || state !== 'live' || !player.alive) return;
  if (player.cooldown > 0 || player.switchT > 0 || player.reloading > 0) return;
  const inst = curInst();
  const spec = WEAPONS[inst.id];

  if (spec.melee) {
    player.cooldown = 60 / spec.rpm;
    sfx.knife();
    vmKick = 0.1;
    vmPitchKick = -0.35;
    const dir = camera.getWorldDirection(_v2).clone();
    const origin = camera.position;
    const hit = hitScan(origin, dir, 2.6);
    if (hit && hit.bot) hurtBot(hit.bot, spec.dmg * (hit.head ? 4 : 1), hit.head, 'knife');
    return;
  }

  if (inst.mag <= 0) {
    // auto-reload instead of dry-firing when there's ammo left
    if (inst.reserve > 0) startReload();
    else {
      sfx.dry();
      player.cooldown = 0.25;
    }
    return;
  }

  inst.mag--;
  player.shots++;
  player.cooldown = 60 / spec.rpm;
  sfx.shot(inst.id);
  vmKick = 0.07;
  vmPitchKick = Math.min(0.3, vmPitchKick + 0.05 + spec.recoil * 0.03);
  muzzleLight.color.setHex(spec.energy);
  muzzleLight.intensity = 2.6;
  const fwd = camera.getWorldDirection(_v2).clone();
  muzzleLight.position.copy(camera.position).addScaledVector(fwd, 1.2);

  // no bloom: a still, grounded shot goes exactly where the crosshair points.
  // moving, jumping, and noscoping cost accuracy — that's the anti-laser tax.
  let sp = 0;
  const moving = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || Math.hypot(joy.f, joy.r) > 0.2;
  if (moving) sp += spec.spread * 2.2;
  if (!player.grounded) sp += spec.spread * 4;
  if (inst.id === 'sniper' && !player.zoomed) sp += spec.spread * 3;
  if (player.zoomed) sp *= 0.12;
  const dir = fwd.clone();
  if (sp > 0) {
    dir.x += (Math.random() - 0.5) * 2 * sp;
    dir.y += (Math.random() - 0.5) * 2 * sp;
    dir.z += (Math.random() - 0.5) * 2 * sp;
  }
  dir.normalize();

  const origin = camera.position;
  const hit = hitScan(origin, dir, 200);
  const end = _v1.copy(origin).addScaledVector(dir, hit ? hit.t : 200).clone();

  const tipStart = origin.clone().addScaledVector(fwd, 1.0).add(
    new THREE.Vector3(Math.cos(player.yaw) * 0.22, -0.18, -Math.sin(player.yaw) * 0.22),
  );
  spawnTracer(tipStart, end, spec.energy);

  if (hit && hit.bot) {
    hurtBot(hit.bot, spec.dmg * (hit.head ? 4 : 1), hit.head, inst.id);
    spawnParticles(end, 0x7a1f12, 6, 2.2);
  } else if (hit) {
    spawnParticles(end, 0xcbb088, 5, 1.8);
  }

  // deterministic spray: the climb steepens through a burst and the muzzle
  // sways in a fixed per-weapon pattern — learnable and controllable, no RNG
  const i = player.sprayI++;
  player.sprayCool = 60 / spec.rpm + 0.22;
  player.recoilP = Math.min(0.45, player.recoilP + spec.recoil * 0.012 * (1 + Math.min(i, 12) * 0.07));
  player.recoilY += Math.sin(i * 0.8) * spec.recoil * 0.005;

  if (inst.mag === 0 && inst.reserve > 0) startReload(); // mag ran dry mid-fight

  updateHUD();
}

// Nearest hit among walls and bots: { t, bot|null, head }
function hitScan(origin, dir, maxT) {
  let best = null;
  const wallT = rayWalls(origin, dir, maxT);
  if (wallT !== null) best = { t: wallT, bot: null, head: false };
  for (const bot of bots) {
    if (!bot.alive) continue;
    const headT = raySphere(origin, dir, _v1.set(bot.pos.x, 1.85, bot.pos.z), 0.3);
    const bodyBox = {
      min: _boxMin.set(bot.pos.x - 0.45, 0, bot.pos.z - 0.45),
      max: _boxMax.set(bot.pos.x + 0.45, 1.7, bot.pos.z + 0.45),
    };
    const bodyT = rayBox(origin, dir, bodyBox, maxT);
    let t = null;
    let head = false;
    if (headT !== null && (bodyT === null || headT < bodyT)) { t = headT; head = true; } else if (bodyT !== null) t = bodyT;
    if (t !== null && t < maxT && (best === null || t < best.t)) best = { t, bot, head };
  }
  return best;
}
const _boxMin = new THREE.Vector3();
const _boxMax = new THREE.Vector3();

function startReload() {
  const inst = curInst();
  const spec = WEAPONS[inst.id];
  if (spec.melee || player.reloading > 0 || inst.mag >= spec.mag || inst.reserve <= 0) return;
  player.reloading = spec.reload;
  player.sprayI = 0;
  setZoom(false);
  sfx.reload();
  updateHUD();
}

function hurtBot(bot, dmg, head, weaponId) {
  bot.hp -= dmg;
  bot.alert = true;
  player.hits++;
  sfx.hit(head);
  els.hitmarker.classList.add('show');
  els.hitmarker.classList.toggle('head', head);
  clearTimeout(hitmarkT);
  hitmarkT = setTimeout(() => els.hitmarker.classList.remove('show'), 90);
  bot.flash(0.1);
  if (bot.hp <= 0) killBot(bot, head, weaponId);
}
let hitmarkT = 0;

function killBot(bot, head, weaponId) {
  bot.die();
  player.kills++;
  const award = WEAPONS[weaponId]?.killAward ?? 300;
  player.money = Math.min(ECON.cap, player.money + award);
  sfx.kill();
  addKillfeed(`you ⟶ ${bot.name}${head ? ' [HEAD]' : ''}  +$${award}`);
  updateHUD();
  if (bots.every((b) => !b.alive) && state === 'live') endRound(true);
}

// ---------------------------------------------------------------- bots
const ADJ = WAYPOINTS.map(() => []);
for (const [a, b] of WAY_EDGES) { ADJ[a].push(b); ADJ[b].push(a); }

function nearestWp(x, z) {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < WAYPOINTS.length; i++) {
    const d = (WAYPOINTS[i][0] - x) ** 2 + (WAYPOINTS[i][1] - z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function bfsPath(from, to) {
  if (from === to) return [to];
  const prev = new Array(WAYPOINTS.length).fill(-1);
  const q = [from];
  prev[from] = from;
  while (q.length) {
    const n = q.shift();
    for (const m of ADJ[n]) {
      if (prev[m] !== -1) continue;
      prev[m] = n;
      if (m === to) {
        const path = [to];
        let cur = to;
        while (cur !== from) { cur = prev[cur]; path.unshift(cur); }
        return path;
      }
      q.push(m);
    }
  }
  return [from];
}

const botGeo = {
  torso: new THREE.BoxGeometry(0.85, 1.0, 0.45),
  leg: new THREE.BoxGeometry(0.3, 0.7, 0.3),
  head: new THREE.SphereGeometry(0.26, 12, 10),
  band: new THREE.BoxGeometry(0.56, 0.1, 0.56),
  gun: new THREE.BoxGeometry(0.09, 0.11, 0.85),
};

class Bot {
  constructor(name, x, z, team = 'T') {
    this.name = name;
    this.team = team;
    this.pos = new THREE.Vector3(x, 0, z);
    this.yaw = Math.atan2(x, z); // face arena center
    this.hp = 100;
    this.alive = true;
    this.alert = false;
    this.hadLOS = false;
    this.reactT = 0;
    this.fireT = 0.6;
    this.repathT = 0;
    this.path = null;
    this.pathI = 0;
    this.strafePhase = Math.random() * 6;
    this.deadT = 0;
    this.flashT = 0;
    this.walkT = Math.random() * 6;

    const g = new THREE.Group();
    this.torsoMat = new THREE.MeshLambertMaterial({ color: team === 'CT' ? 0x5d6e8e : 0x8f7a4e });
    const legMat = new THREE.MeshLambertMaterial({ color: 0x4a4438 });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xc8987a });
    const bandMat = new THREE.MeshLambertMaterial({ color: team === 'CT' ? 0x2a5ab0 : 0xb03a2a });
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x222220 });
    const torso = new THREE.Mesh(botGeo.torso, this.torsoMat);
    torso.position.y = 1.2;
    const legL = new THREE.Mesh(botGeo.leg, legMat);
    legL.position.set(-0.2, 0.35, 0);
    const legR = new THREE.Mesh(botGeo.leg, legMat);
    legR.position.set(0.2, 0.35, 0);
    const head = new THREE.Mesh(botGeo.head, headMat);
    head.position.y = 1.85;
    const band = new THREE.Mesh(botGeo.band, bandMat);
    band.position.y = 1.95;
    const gun = new THREE.Mesh(botGeo.gun, gunMat);
    gun.position.set(0.26, 1.32, -0.45);
    for (const m of [torso, legL, legR, head, band, gun]) m.castShadow = true;
    g.add(torso, legL, legR, head, band, gun);
    g.position.copy(this.pos);
    g.rotation.y = this.yaw;
    scene.add(g);
    this.mesh = g;
  }

  // Nearest live enemy: the player in normal play, opposing bots in spectate.
  getTarget() {
    if (!spectating) return player.alive ? player : null;
    let best = null;
    let bd = Infinity;
    for (const b of bots) {
      if (b === this || !b.alive || b.team === this.team) continue;
      const d = (b.pos.x - this.pos.x) ** 2 + (b.pos.z - this.pos.z) ** 2;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  canSee(tgt) {
    if (!tgt) return false;
    const from = new THREE.Vector3(this.pos.x, 1.78, this.pos.z);
    const eyeY = tgt === player ? tgt.pos.y + EYE : 1.78;
    const to = new THREE.Vector3(tgt.pos.x, eyeY, tgt.pos.z);
    const d = to.sub(from);
    const dist = d.length();
    d.normalize();
    // ~200° awareness — only directly behind is a blind spot
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    if (fx * d.x + fz * d.z < -0.2) return false;
    const wallT = rayWalls(from, d, dist);
    return wallT === null;
  }

  flash(t) {
    this.flashT = t;
    this.torsoMat.emissive.setHex(0x661111);
  }

  die() {
    this.alive = false;
    this.deadT = 0;
  }

  fireAt(tgt) {
    const from = new THREE.Vector3(this.pos.x, 1.5, this.pos.z);
    const isPlayer = tgt === player;
    const aimY = isPlayer ? tgt.pos.y + EYE - 0.25 : 1.3;
    const target = new THREE.Vector3(tgt.pos.x, aimY, tgt.pos.z);
    const dist = from.distanceTo(target);
    sfx.shot('enemy', camera.position.distanceTo(from));
    const chance = Math.max(0.08, 0.55 - dist * 0.0055);
    if (Math.random() < chance) {
      spawnTracer(from, target, 0xffb060);
      if (isPlayer) damagePlayer(9 + Math.random() * 9);
      else this.damageBot(tgt, 9 + Math.random() * 9);
    } else {
      const miss = target.clone();
      miss.x += (Math.random() - 0.5) * 3;
      miss.y += (Math.random() - 0.5) * 2;
      miss.z += (Math.random() - 0.5) * 3;
      spawnTracer(from, miss, 0xffb060);
      if (isPlayer && Math.random() < 0.6) sfx.whiz();
    }
  }

  damageBot(tgt, dmg) {
    tgt.hp -= dmg;
    tgt.alert = true;
    tgt.flash(0.1);
    if (tgt.hp <= 0) {
      tgt.die();
      spawnParticles({ x: tgt.pos.x, y: 1.2, z: tgt.pos.z }, 0x7a1f12, 6, 2.2);
      addKillfeed(`${this.name} ⟶ ${tgt.name}`, tgt.team === 'CT');
      checkSpectateRoundEnd();
    }
  }

  update(dt) {
    if (!this.alive) {
      this.deadT += dt;
      // crumple, then sink away
      this.mesh.rotation.x = -Math.PI / 2 * Math.min(1, this.deadT * 4);
      if (this.deadT > 2.5) this.mesh.position.y -= dt * 1.5;
      return;
    }
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.torsoMat.emissive.setHex(0x000000);
    }

    const tgt = this.getTarget();
    const los = this.canSee(tgt);
    if (los && !this.hadLOS) this.reactT = 0.45 + Math.random() * 0.3;
    this.hadLOS = los;

    if (los) {
      this.alert = true;
      const desired = Math.atan2(-(tgt.pos.x - this.pos.x), -(tgt.pos.z - this.pos.z));
      let dy = desired - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, dt * 10);
      if (this.reactT > 0) {
        this.reactT -= dt;
      } else {
        this.fireT -= dt;
        if (this.fireT <= 0) {
          this.fireAt(tgt);
          this.fireT = 0.55 + Math.random() * 0.5;
        }
      }
      // strafe in place
      this.strafePhase += dt * 2.4;
      const px = Math.cos(this.yaw);
      const pz = -Math.sin(this.yaw);
      this.pos.x += px * Math.cos(this.strafePhase) * 2.0 * dt;
      this.pos.z += pz * Math.cos(this.strafePhase) * 2.0 * dt;
    } else {
      this.fireT = Math.max(this.fireT, 0.25);
      if (this.alert && tgt) {
        this.repathT -= dt;
        if (this.repathT <= 0 || !this.path || this.pathI >= this.path.length) {
          this.path = bfsPath(nearestWp(this.pos.x, this.pos.z), nearestWp(tgt.pos.x, tgt.pos.z));
          this.pathI = 0;
          this.repathT = 2;
        }
      } else if (!this.path || this.pathI >= this.path.length) {
        const goal = Math.floor(Math.random() * WAYPOINTS.length);
        this.path = bfsPath(nearestWp(this.pos.x, this.pos.z), goal);
        this.pathI = 0;
      }
      if (this.path && this.pathI < this.path.length) {
        const [tx, tz] = WAYPOINTS[this.path[this.pathI]];
        const dx = tx - this.pos.x;
        const dz = tz - this.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.8) {
          this.pathI++;
        } else {
          const speed = this.alert ? 5.2 : 4.2;
          this.pos.x += (dx / dist) * speed * dt;
          this.pos.z += (dz / dist) * speed * dt;
          const desired = Math.atan2(-dx, -dz);
          let dy = desired - this.yaw;
          while (dy > Math.PI) dy -= Math.PI * 2;
          while (dy < -Math.PI) dy += Math.PI * 2;
          this.yaw += dy * Math.min(1, dt * 8);
          this.walkT += dt * 10;
        }
      }
    }

    this.mesh.position.set(this.pos.x, Math.abs(Math.sin(this.walkT)) * 0.05, this.pos.z);
    this.mesh.rotation.y = this.yaw;
  }

  dispose() {
    scene.remove(this.mesh);
    this.torsoMat.dispose();
  }
}

let bots = [];

function spawnBots() {
  for (const b of bots) b.dispose();
  bots = BOT_SPAWNS.map(([x, z], i) => new Bot(`Bot_${BOT_NAMES[i]}`, x, z, 'T'));
  // spectate mode fields a mirrored CT squad on the player's side of the map
  if (spectating) {
    bots.push(...BOT_SPAWNS.map(([x, z], i) => new Bot(`Bot_${CT_BOT_NAMES[i]}`, -x, -z, 'CT')));
  }
}

// ---------------------------------------------------------------- rounds / economy
let state = 'menu'; // menu | buy | live | over | matchend
let paused = false;
let spectating = false;
let tState = 0;
let round = 0;
let ctScore = 0;
let tScore = 0;
let survivedLast = true;

function startMatch() {
  ctScore = 0;
  tScore = 0;
  round = 0;
  player.money = ECON.start;
  player.kills = 0;
  player.deaths = 0;
  player.shots = 0;
  player.hits = 0;
  player.armor = 0;
  survivedLast = false; // forces fresh pistol loadout
  els.hud.classList.remove('hidden');
  startRound();
}

function startRound() {
  round++;
  player.pos.set(PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z);
  player.yaw = PLAYER_SPAWN.yaw;
  player.pitch = 0;
  player.vy = 0;
  player.speedMult = 1;
  player.hp = 100;
  player.alive = true;
  player.cooldown = 0;
  player.reloading = 0;
  player.sprayI = 0;
  player.recoilP = 0;
  player.recoilY = 0;
  deathT = 0;
  els.vignette.classList.remove('dead');
  els.vignette.style.opacity = 0;
  if (!survivedLast) {
    resetLoadout();
    player.armor = 0;
  } else {
    for (const slot of ['primary', 'secondary']) {
      const inst = player.load[slot];
      if (inst) { inst.mag = WEAPONS[inst.id].mag; inst.reserve = WEAPONS[inst.id].reserve; }
    }
  }
  setZoom(false);
  buildViewModel(curInst().id);
  spawnBots();
  if (spectating) {
    // no buy phase, no viewmodel — straight to the bot fight
    vmGroup.visible = false;
    specCam = -1;
    setSpecLabel();
    state = 'live';
    tState = ROUND_TIME;
    openBuyMenu(false);
    banner(`ROUND ${round}`, 'bots vs bots', false, 1.8);
  } else {
    state = 'buy';
    tState = BUY_TIME;
    openBuyMenu(true);
    banner(`ROUND ${round}`, 'buy your gear', false, 1.8);
  }
  sfx.roundStart();
  updateHUD();
}

function checkSpectateRoundEnd() {
  if (!spectating || state !== 'live') return;
  if (!bots.some((b) => b.alive && b.team === 'T')) endRound(true);
  else if (!bots.some((b) => b.alive && b.team === 'CT')) endRound(false);
}

function goLive() {
  state = 'live';
  tState = ROUND_TIME;
  openBuyMenu(false);
  banner('GO GO GO', '', false, 1.2);
}

function endRound(win) {
  if (state !== 'live') return;
  state = 'over';
  tState = 3.2;
  survivedLast = player.alive;
  if (win) {
    ctScore++;
    player.money = Math.min(ECON.cap, player.money + ECON.win);
    banner('COUNTER-TERRORISTS WIN', `+$${ECON.win}`);
    sfx.win();
  } else {
    tScore++;
    player.money = Math.min(ECON.cap, player.money + ECON.loss);
    banner('TERRORISTS WIN', `+$${ECON.loss}`, true);
    sfx.lose();
  }
  updateHUD();
}

function matchEnd() {
  state = 'matchend';
  document.exitPointerLock();
  const won = ctScore > tScore;
  if (spectating) {
    els.matchResult.textContent = won ? 'CT WIN THE MATCH' : 'T WIN THE MATCH';
    els.matchStats.textContent = 'spectator match — bots only';
    els.againBtn.textContent = 'SPECTATE AGAIN';
  } else {
    els.matchResult.textContent = won ? 'MATCH WON' : 'MATCH LOST';
    const acc = player.shots ? Math.round((player.hits / player.shots) * 100) : 0;
    els.matchStats.textContent = `Kills ${player.kills} · Deaths ${player.deaths} · Accuracy ${acc}%`;
    els.againBtn.textContent = 'PLAY AGAIN';
  }
  els.matchScore.textContent = `${ctScore} — ${tScore}`;
  els.matchOverlay.classList.remove('hidden');
  els.hud.classList.add('hidden');
}

// ---------------------------------------------------------------- spectate
// Touch-friendly bot-vs-bot mode: no pointer lock, camera driven by buttons.
let specCam = -1; // -1 = overview orbit, otherwise index into bots
let specOrbit = 0;

function setSpecLabel() {
  setText(els.camBtn, specCam < 0 ? 'CAM · OVERVIEW' : `CAM · ${bots[specCam].name}`);
}

function cycleSpecCam() {
  for (let i = specCam + 1; i < bots.length; i++) {
    if (bots[i].alive) { specCam = i; setSpecLabel(); return; }
  }
  specCam = -1;
  setSpecLabel();
}

function updateSpectateCam(dt) {
  if (specCam >= 0 && !bots[specCam]?.alive) cycleSpecCam();
  if (specCam < 0) {
    specOrbit += dt * 0.08;
    camera.position.set(Math.sin(specOrbit) * 30, 26, Math.cos(specOrbit) * 30);
    camera.lookAt(0, 0, 0);
  } else {
    const b = bots[specCam];
    const bx = Math.sin(b.yaw);
    const bz = Math.cos(b.yaw);
    camera.position.set(b.pos.x + bx * 4.2, 3.4, b.pos.z + bz * 4.2);
    camera.lookAt(b.pos.x - bx * 3, 1.3, b.pos.z - bz * 3);
  }
}

function enterSpectate() {
  spectating = true;
  specCam = -1;
  paused = false;
  els.overlay.classList.add('hidden');
  els.matchOverlay.classList.add('hidden');
  els.touchUI.classList.add('hidden');
  els.hud.classList.add('spectate');
  els.spectateBar.classList.remove('hidden');
  startMatch();
}

function exitSpectate() {
  spectating = false;
  state = 'menu';
  els.overlayMsg.textContent = JOIN_MSG;
  els.hud.classList.add('hidden');
  els.hud.classList.remove('spectate');
  els.spectateBar.classList.add('hidden');
  els.matchOverlay.classList.add('hidden');
  els.overlay.classList.remove('hidden');
}

// ---------------------------------------------------------------- HUD
const textCache = {};
function setText(el, v) {
  if (textCache[el.id] !== v) {
    textCache[el.id] = v;
    el.textContent = v;
  }
}

function updateHUD() {
  setText(els.hp, String(player.hp));
  els.hp.classList.toggle('low', player.hp <= 25);
  setText(els.armor, String(player.armor));
  setText(els.money, String(player.money));
  setText(els.scoreCT, `CT ${ctScore}`);
  setText(els.scoreT, `${tScore} T`);
  setText(els.roundLabel, `ROUND ${round}`);
  if (spectating) {
    const ct = bots.filter((b) => b.alive && b.team === 'CT').length;
    const t = bots.filter((b) => b.alive && b.team === 'T').length;
    setText(els.enemies, `ALIVE · CT ${ct} — ${t} T`);
  } else {
    const alive = bots.filter((b) => b.alive).length;
    setText(els.enemies, `ENEMIES ${alive}/${bots.length || 5}`);
  }
  const inst = curInst();
  const spec = WEAPONS[inst.id];
  setText(els.weapon, spec.skin.toUpperCase());
  setText(els.ammo, spec.melee ? '—' : `${inst.mag} / ${inst.reserve}`);
  els.ammo.classList.toggle('reloading', player.reloading > 0);
}

function updateTimer() {
  const t = Math.max(0, Math.ceil(tState));
  const m = Math.floor(t / 60);
  const s = String(t % 60).padStart(2, '0');
  setText(els.timer, `${m}:${s}`);
  els.timer.classList.toggle('low', state === 'live' && t <= 10);
}

let bannerT = 0;
function banner(main, sub = '', bad = false, dur = 2.6) {
  els.bannerMain.textContent = main;
  els.bannerMain.classList.toggle('bad', bad);
  els.bannerSub.textContent = sub;
  els.banner.classList.add('show');
  clearTimeout(bannerT);
  bannerT = setTimeout(() => els.banner.classList.remove('show'), dur * 1000);
}

function addKillfeed(text, bad = false) {
  const div = document.createElement('div');
  div.textContent = text;
  if (bad) div.classList.add('bad');
  els.killfeed.prepend(div);
  while (els.killfeed.children.length > 5) els.killfeed.lastChild.remove();
  setTimeout(() => div.remove(), 4500);
}

// ---------------------------------------------------------------- buy menu
let buyOpen = false;

function openBuyMenu(open) {
  buyOpen = open && state === 'buy';
  els.buymenu.classList.toggle('hidden', !buyOpen);
  if (buyOpen) renderBuyMenu();
}

function renderBuyMenu() {
  const rows = BUY_ITEMS.map((item, i) => {
    const spec = item.id === 'armor' ? item : WEAPONS[item.id];
    const owned = item.id === 'armor'
      ? player.armor >= 100
      : (player.load[WEAPONS[item.id].slot]?.id === item.id);
    const afford = player.money >= spec.price;
    const skin = item.id === 'armor' ? '' : ` <em>${WEAPONS[item.id].skin}</em>`;
    return `<div class="buy-item ${afford ? '' : 'dim'} ${owned ? 'owned' : ''}">
      <span class="key">${i + 1}</span><span class="name">${spec.name}${skin}</span>
      <span class="price">$${spec.price}</span></div>`;
  }).join('');
  els.buymenu.innerHTML = `<h2>BUY EQUIPMENT</h2>${rows}
    <div class="foot">${touchMode ? 'TAP AN ITEM TO BUY' : `PRESS 1-${BUY_ITEMS.length} TO BUY · B TO CLOSE`}</div>`;
  els.buymenu.querySelectorAll('.buy-item').forEach((el, i) => {
    el.addEventListener('click', () => purchase(i));
  });
}

function purchase(i) {
  const item = BUY_ITEMS[i];
  if (!item) return;
  const spec = item.id === 'armor' ? item : WEAPONS[item.id];
  if (player.money < spec.price) { sfx.dry(); return; }
  if (item.id === 'armor') {
    if (player.armor >= 100) return;
    player.armor = 100;
  } else {
    giveWeapon(item.id);
  }
  player.money -= spec.price;
  sfx.buy();
  renderBuyMenu();
  updateHUD();
}

// ---------------------------------------------------------------- scoreboard
function renderScoreboard() {
  const botRows = bots.map((b) => `<tr class="${b.alive ? '' : 'dead'}"><td>${b.name}</td><td>${b.team}</td><td>${b.alive ? 'alive' : 'dead'}</td></tr>`).join('');
  const youRow = spectating ? ''
    : `<tr class="you"><td>you · ${player.kills}K / ${player.deaths}D</td><td>CT</td><td>${player.alive ? 'alive' : 'dead'}</td></tr>`;
  els.scoreboard.innerHTML = `<h2>CUBESTRIKE — CT ${ctScore} : ${tScore} T</h2>
    <table><tr><th>PLAYER</th><th>TEAM</th><th>STATUS</th></tr>
    ${youRow}${botRows}</table>`;
}

// ---------------------------------------------------------------- touch controls
// CoD Mobile-style: dynamic joystick on the left half, drag-to-aim on the
// right, button cluster for fire/jump/reload/scope. Auto-enabled on coarse
// pointer devices; desktop can opt in from the menu.
const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
const JOIN_MSG = IS_TOUCH
  ? 'TAP TO JOIN — FIRST TO 8 ROUNDS WINS'
  : 'CLICK TO JOIN — FIRST TO 8 ROUNDS WINS';
let touchMode = false;
const joy = { id: null, f: 0, r: 0, baseX: 0, baseY: 0 };
let aimId = null;
let aimX = 0;
let aimY = 0;
const TOUCH_SENS = 0.0045;
const JOY_R = 48;

function startTouchPlay() {
  touchMode = true;
  paused = false;
  els.overlay.classList.add('hidden');
  els.matchOverlay.classList.add('hidden');
  els.touchUI.classList.remove('hidden');
  if (state === 'menu' || state === 'matchend') startMatch();
}

function resetTouchInputs() {
  joy.id = null;
  joy.f = 0;
  joy.r = 0;
  aimId = null;
  mouseDown = false;
  keys.Space = false;
  els.joyBase.classList.add('hidden');
}

function pauseTouch() {
  if (state === 'menu' || state === 'matchend') return;
  paused = true;
  resetTouchInputs();
  els.overlayMsg.textContent = 'PAUSED — TAP TO RESUME';
  els.overlay.classList.remove('hidden');
}

els.joyZone.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (joy.id !== null) return;
  joy.id = e.pointerId;
  joy.baseX = e.clientX;
  joy.baseY = e.clientY;
  els.joyBase.style.left = `${e.clientX}px`;
  els.joyBase.style.top = `${e.clientY}px`;
  els.joyKnob.style.transform = 'translate(-50%, -50%)';
  els.joyBase.classList.remove('hidden');
});

els.aimZone.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (aimId !== null) return;
  aimId = e.pointerId;
  aimX = e.clientX;
  aimY = e.clientY;
});

window.addEventListener('pointermove', (e) => {
  if (!touchMode) return;
  if (e.pointerId === joy.id) {
    let dx = e.clientX - joy.baseX;
    let dy = e.clientY - joy.baseY;
    const m = Math.hypot(dx, dy);
    if (m > JOY_R) { dx *= JOY_R / m; dy *= JOY_R / m; }
    els.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    joy.f = Math.abs(dy) < JOY_R * 0.18 ? 0 : -dy / JOY_R;
    joy.r = Math.abs(dx) < JOY_R * 0.18 ? 0 : dx / JOY_R;
  } else if (e.pointerId === aimId && player.alive && !paused) {
    const s = TOUCH_SENS * (player.zoomed ? 0.4 : 1);
    player.yaw -= (e.clientX - aimX) * s;
    player.pitch -= (e.clientY - aimY) * s;
    player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch));
    aimX = e.clientX;
    aimY = e.clientY;
  }
});

function releaseTouchPointer(e) {
  if (e.pointerId === joy.id) {
    joy.id = null;
    joy.f = 0;
    joy.r = 0;
    els.joyBase.classList.add('hidden');
  }
  if (e.pointerId === aimId) aimId = null;
}
window.addEventListener('pointerup', releaseTouchPointer);
window.addEventListener('pointercancel', releaseTouchPointer);

function bindBtn(el, down, up) {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    down();
  });
  if (up) {
    el.addEventListener('pointerup', (e) => { e.preventDefault(); up(); });
    el.addEventListener('pointercancel', up);
  }
}
bindBtn(els.btnFire, () => { mouseDown = true; fire(); }, () => { mouseDown = false; });
bindBtn(els.btnJump, () => { keys.Space = true; }, () => { keys.Space = false; });
bindBtn(els.btnReload, () => { if (state === 'live') startReload(); });
bindBtn(els.btnScope, () => setZoom(!player.zoomed));
bindBtn(els.btnBuy, () => openBuyMenu(!buyOpen));
bindBtn(els.btnPause, pauseTouch);
for (const b of els.wpnRow.children) bindBtn(b, () => switchSlot(b.dataset.slot));

els.touchBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.unlock();
  startTouchPlay();
});

if (IS_TOUCH) {
  els.overlayMsg.textContent = JOIN_MSG;
  els.touchBtn.classList.add('hidden'); // tap-to-join already goes touch
}

// ---------------------------------------------------------------- input
const SENS = 0.0022;

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas || !player.alive) return;
  const s = player.zoomed ? SENS * 0.4 : SENS;
  player.yaw -= e.movementX * s;
  player.pitch -= e.movementY * s;
  player.pitch = Math.max(-1.55, Math.min(1.55, player.pitch));
});

document.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas) return;
  if (e.button === 0) {
    mouseDown = true;
    fire();
  } else if (e.button === 2) {
    setZoom(!player.zoomed);
  }
});
document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') {
    e.preventDefault();
    if (state !== 'menu' && state !== 'matchend') {
      renderScoreboard();
      els.scoreboard.classList.remove('hidden');
    }
    return;
  }
  keys[e.code] = true;
  if (document.pointerLockElement !== canvas) return;

  if (buyOpen && e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (n >= 1 && n <= BUY_ITEMS.length) purchase(n - 1);
    return;
  }
  switch (e.code) {
    case 'Digit1': switchSlot('primary'); break;
    case 'Digit2': switchSlot('secondary'); break;
    case 'Digit3': switchSlot('knife'); break;
    case 'KeyR': if (state === 'live') startReload(); break;
    case 'KeyB': openBuyMenu(!buyOpen); break;
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Tab') {
    e.preventDefault();
    els.scoreboard.classList.add('hidden');
  }
  keys[e.code] = false;
});

// ---------------------------------------------------------------- pointer lock / overlays
els.overlay.addEventListener('click', () => {
  sfx.unlock();
  if (IS_TOUCH || touchMode) { startTouchPlay(); return; }
  canvas.requestPointerLock();
});

els.againBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.unlock();
  if (spectating) { enterSpectate(); return; }
  if (IS_TOUCH || touchMode) { startTouchPlay(); return; }
  canvas.requestPointerLock();
});

els.spectateBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.unlock();
  enterSpectate();
});
els.camBtn.addEventListener('click', cycleSpecCam);
els.exitBtn.addEventListener('click', exitSpectate);

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (locked) {
    els.overlay.classList.add('hidden');
    els.matchOverlay.classList.add('hidden');
    if (state === 'menu' || state === 'matchend') startMatch();
    paused = false;
  } else if (state !== 'menu' && state !== 'matchend') {
    paused = true;
    mouseDown = false;
    for (const k of Object.keys(keys)) keys[k] = false;
    els.overlayMsg.textContent = 'PAUSED — CLICK TO RESUME';
    els.overlay.classList.remove('hidden');
  }
});

// ---------------------------------------------------------------- main loop
let last = performance.now();
let orbitT = 0;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (state === 'menu' || state === 'matchend') {
    // idle orbit camera as the menu background
    orbitT += dt * 0.1;
    camera.position.set(Math.sin(orbitT) * 42, 26, Math.cos(orbitT) * 42);
    camera.lookAt(0, 0, 0);
    vmGroup.visible = false;
  } else if (!paused) {
    if (spectating) updateSpectateCam(dt);
    else updatePlayer(dt);
    if (state === 'buy') {
      tState -= dt;
      if (tState <= 0) goLive();
    } else if (state === 'live') {
      for (const bot of bots) bot.update(dt);
      tState -= dt;
      if (tState <= 0) endRound(true); // defenders held the site
    } else if (state === 'over') {
      // spectate keeps survivors animated between rounds; play mode freezes them
      for (const bot of bots) { if (spectating || !bot.alive) bot.update(dt); }
      tState -= dt;
      if (tState <= 0) {
        if (ctScore >= MATCH_WIN_ROUNDS || tScore >= MATCH_WIN_ROUNDS) matchEnd();
        else startRound();
      }
    }
    updateTimer();
    if (!els.scoreboard.classList.contains('hidden')) renderScoreboard();
  }

  updateParticles(dt);
  updateTracers(dt);
  renderer.render(scene, camera);
}

// Console cheats, in the spirit of sv_cheats 1. Open devtools and help yourself.
window.impulse101 = () => {
  player.money = ECON.cap;
  updateHUD();
  return `$${player.money}`;
};
window.cs_give = (id) => {
  if (!WEAPONS[id] || id === 'knife') return `usage: cs_give('${Object.keys(WEAPONS).filter((k) => k !== 'knife').join("' | '")}')`;
  giveWeapon(id);
  updateHUD();
  return WEAPONS[id].skin;
};

buildViewModel('pistol');
resetLoadout();
requestAnimationFrame(loop);
