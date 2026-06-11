# CUBESTRIKE

A Counter-Strike 1.6–style tactical FPS homage that runs entirely in the browser.
No engine download, no install, no build step — one HTML file, a few JS modules, and
[three.js](https://threejs.org) from a CDN.

**▶ Play it: https://lucasdreyer.github.io/cubestrike/** (desktop + mouse required)

## What's in the box

- **Pointer-lock FPS movement** — WASD, jump, real AABB collision, you can hop up onto the low crates
- **A dust-colored blockout map** — mid doors, two side lanes, crates, and long sightlines
- **5 weapons + knife** — pistol, hand cannon, SMG, auto rifle, and a bolt sniper with a working scope (RMB)
- **The CS economy** — $800 pistol round, kill rewards ($300 rifle / $600 SMG / $1500 knife / $100 sniper), win and loss bonuses, $16,000 cap
- **Buy menu** — press the number keys during the buy phase, just like 1.6
- **Round system** — first to 8 rounds wins the match; survive and you keep your guns, die and you're back on pistol
- **Bots** — 5 terrorists with waypoint navigation, line-of-sight checks, reaction time, and aim that gets worse with distance
- **Headshots** — 4× damage, separate head hitbox
- **Synthesized audio** — every sound is generated with WebAudio at runtime; there are zero asset files in this repo

## Controls

| Key | Action |
|---|---|
| WASD | Move |
| Mouse | Aim / LMB shoot |
| RMB | Scope (sniper) |
| Space | Jump |
| R | Reload |
| B | Buy menu (during buy phase) |
| 1 / 2 / 3 | Primary / pistol / knife |
| Tab (hold) | Scoreboard |
| Esc | Pause |

## Run it locally

It's ES modules, so it needs any static file server (opening `index.html` directly via
`file://` won't work):

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## How it works

- `js/game.js` — renderer, player physics, hitscan shooting, bot AI, round state machine, HUD
- `js/config.js` — all the tunable data: weapon stats, map blockout boxes, bot nav graph, economy
- `js/audio.js` — WebAudio synth for gunshots, hitmarkers, and round jingles
- The map is a list of axis-aligned boxes; collision and bullet traces are slab-method ray/AABB tests against the same list
- Bots navigate a hand-placed waypoint graph with BFS and switch to engage mode when a wall raycast says they can see you

## Roadmap

- [ ] Bomb plant / defuse objective
- [ ] Radar
- [ ] Friendly CT bots
- [ ] WebRTC multiplayer (ambitious, but the hitscan model is server-friendly)

## A note on the homage

This is a from-scratch fan tribute to the *feel* of Counter-Strike 1.6. It contains no
Valve code, assets, models, sounds, maps, or names — everything is original and
synthesized. Counter-Strike is a trademark of Valve Corporation, which has nothing to
do with this project.

## License

[MIT](LICENSE)
