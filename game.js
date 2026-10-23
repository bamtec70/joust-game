/* JOUST - web recreation of Williams 1982 Joust. All graphics drawn and all
   sounds synthesized in code. No ROM data, samples or extracted images. */
(() => {
"use strict";
const W = 292, H = 240;
const cv = document.getElementById("game");
const ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;
const Q = new URLSearchParams(location.search);
const DEBUG = Q.has("debug") || Q.has("wave");

/* ---------------- font (5x7) ---------------- */
const FD = {
A:"01110 10001 10001 11111 10001 10001 10001",B:"11110 10001 10001 11110 10001 10001 11110",
C:"01110 10001 10000 10000 10000 10001 01110",D:"11110 10001 10001 10001 10001 10001 11110",
E:"11111 10000 10000 11110 10000 10000 11111",F:"11111 10000 10000 11110 10000 10000 10000",
G:"01110 10001 10000 10111 10001 10001 01111",H:"10001 10001 10001 11111 10001 10001 10001",
I:"01110 00100 00100 00100 00100 00100 01110",J:"00111 00010 00010 00010 00010 10010 01100",
K:"10001 10010 10100 11000 10100 10010 10001",L:"10000 10000 10000 10000 10000 10000 11111",
M:"10001 11011 10101 10101 10001 10001 10001",N:"10001 10001 11001 10101 10011 10001 10001",
O:"01110 10001 10001 10001 10001 10001 01110",P:"11110 10001 10001 11110 10000 10000 10000",
Q:"01110 10001 10001 10001 10101 10010 01101",R:"11110 10001 10001 11110 10100 10010 10001",
S:"01111 10000 10000 01110 00001 00001 11110",T:"11111 00100 00100 00100 00100 00100 00100",
U:"10001 10001 10001 10001 10001 10001 01110",V:"10001 10001 10001 10001 10001 01010 00100",
W:"10001 10001 10001 10101 10101 10101 01010",X:"10001 10001 01010 00100 01010 10001 10001",
Y:"10001 10001 01010 00100 00100 00100 00100",Z:"11111 00001 00010 00100 01000 10000 11111",
0:"01110 10011 10101 10101 10101 11001 01110",1:"00100 01100 00100 00100 00100 00100 01110",
2:"01110 10001 00001 00010 00100 01000 11111",3:"11110 00001 00001 01110 00001 00001 11110",
4:"00010 00110 01010 10010 11111 00010 00010",5:"11111 10000 11110 00001 00001 10001 01110",
6:"00110 01000 10000 11110 10001 10001 01110",7:"11111 00001 00010 00100 01000 01000 01000",
8:"01110 10001 10001 01110 10001 10001 01110",9:"01110 10001 10001 01111 00001 00010 01100",
".":"00000 00000 00000 00000 00000 01100 01100",":":"00000 01100 01100 00000 01100 01100 00000",
"-":"00000 00000 00000 11111 00000 00000 00000",'"':"01010 01010 00000 00000 00000 00000 00000",
"(":"00010 00100 01000 01000 01000 00100 00010",")":"01000 00100 00010 00010 00010 00100 01000",
",":"00000 00000 00000 00000 01100 00100 01000","!":"00100 00100 00100 00100 00100 00000 00100",
"/":"00001 00010 00010 00100 01000 01000 10000","_":"00000 00000 00000 00000 00000 00000 11111",
"?":"01110 10001 00001 00010 00100 00000 00100","'":"00100 00100 00000 00000 00000 00000 00000"};
const FONT = {};
for (const k in FD) FONT[k] = FD[k].split(" ").map(r => parseInt(r, 2));
function text(s, x, y, col, sc = 1, align = "left") {
  s = String(s).toUpperCase();
  const w = s.length * 6 * sc - sc;
  if (align === "center") x = Math.round(x - w / 2); else if (align === "right") x -= w;
  ctx.fillStyle = col;
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]]; if (!g) continue;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++)
      if (g[r] & (16 >> c)) ctx.fillRect(x + (i * 6 + c) * sc, y + r * sc, sc, sc);
  }
}

/* ---------------- sprites (hand-authored) ---------------- */
// bird body facing right, 16 wide. Head on the right.
const BODY = [
"...........hhh..",
"..........hhhhe.",
"..........hh.bb.",
".........hh.....",
"tt......bbb.....",
".tbbbbbbbbb.....",
"..bbbbbbbbb.....",
"...bbbbbbb......",
".....bbbb......."];
const BUZZ_BODY = [
"...........hhh..",
"..........hhrhbb",
"..........hh..b.",
".........hh.....",
"tt.......bb.....",
"ttbbbbbbbbb.....",
".tbbbbbbbbb.....",
"...bbbbbbb......",
".....bbbb......."];
const STORK_BODY = [
"............hh..",
"...........hhhbbb",
"...........hh...",
"..........hh....",
"tt........hh....",
".tbbbbbbbbbb....",
"..bbbbbbbbb.....",
"...bbbbbbb......",
".....bbbb......."];
const LEGS = {
 stand:["......l.l.......","......l.l.......","......l.l.......",".....ll.ll......"],
 run1: [".....l...l......","....l.....l.....","...l.......l....","..ll.......ll..."],
 run2: [".......ll.......","......l..l......","......l..l......",".....ll..ll....."],
 run3: ["......l.l.......",".....l...l......","....l.....l.....","...ll....ll....."],
 fly:  [".....llll.......","........ll......"],
};
const WING_UP = ["...w............","..www...........","..wwww..........",".wwwww.........."];
const WING_DN = [".wwwwww.........","..wwwww.........","...www.........."];
const RIDER = [
"..kk....",
".kkkk...",
"..ss....",
".aaaa...",
".aaaa...",
"..aa...."];
const EGG = [".ee.","eeee","eEee","eeee",".ee."];
const PTERO = [
["............................",
 "ww......................hh..",
 ".www.................hhhhhhh",
 "..wwwww...........hhhhhm....",
 "...wwwwwwwbbbbbbbbbbhhh.....",
 ".....wwwwbbbbbbbbbb..........",
 "..........bbbbbbb...........",
 "............ll..............",
 "...........l..l............."],
["............................",
 "........................hh..",
 "......................hhhhhh",
 "...................hhhhh....",
 "..........bbbbbbbbbbhhh.mmm.",
 ".....wwwwbbbbbbbbbb.....m...",
 "...wwwwwwwbbbbbbb...........",
 ".wwwww......ll..............",
 "ww.........l..l............."]];
const HAND = ["..h.h.h.","..h.h.h.","..hhhhh.",".hhhhhh.","hh.hhhh.","..hhhh..","..hhhh..","..hhhh..","..hhhh..","..hhhh..","..hhhh..","..hhhh..","..hhhh..","..hhhh..","..hhhh..","..hhhh..","..hhhh.."];

function blit(rows, x, y, pal, flip) {
  const w = rows[0].length;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]; if (ch === ".") continue;
      const col = pal[ch]; if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(flip ? x + (w - 1 - c) : x + c), Math.round(y + r), 1, 1);
    }
  }
}

const MOUNTS = {
  ostrich: { body: BODY, pal: { b: "#f8e000", h: "#f8e000", e: "#ffffff", t: "#d8b000", l: "#e08030", w: "#c8a000" } },
  stork:   { body: STORK_BODY, pal: { b: "#e8e8ff", h: "#e8e8ff", e: "#ffffff", t: "#a0a0d8", l: "#f0a040", w: "#a0a0ff" } },
  buzzard: { body: BUZZ_BODY, pal: { b: "#20b040", h: "#20b040", e: "#ffffff", r: "#ff2020", t: "#108020", l: "#f0f000", w: "#108828" } },
};
const RIDERS = {
  p1: { k: "#f8f800", s: "#ffd0a0", a: "#3070ff" },
  p2: { k: "#ffffff", s: "#ffd0a0", a: "#3070ff" },
  B:  { k: "#ff2020", s: "#ffd0a0", a: "#d02020" },
  H:  { k: "#d0d0d0", s: "#ffd0a0", a: "#909090" },
  S:  { k: "#3060ff", s: "#ffd0a0", a: "#2040d0" },
};
const ETYPES = {
  B: { pts: 500, spd: 1.05, name: "BOUNDER" },
  H: { pts: 750, spd: 1.45, name: "HUNTER" },
  S: { pts: 1500, spd: 1.85, name: "SHADOW LORD" },
};

/* ---------------- playfield ---------------- */
// ledge surfaces at native 292x240, measured from the reference capture
const LEDGES = [
  { id: "TL", x0: 0, x1: 30, y: 62 }, { id: "TR", x0: 246, x1: 292, y: 62 },
  { id: "C1", x0: 80, x1: 168, y: 74, pad: [100, 126] },
  { id: "R2", x0: 196, x1: 250, y: 121, pad: [219, 245] },
  { id: "L3", x0: 0, x1: 60, y: 131, pad: [10, 40] }, { id: "R3", x0: 252, x1: 292, y: 131 },
  { id: "C4", x0: 100, x1: 164, y: 155 },
  { id: "BASE", x0: 48, x1: 234, y: 203, pad: [113, 141], base: true },
  { id: "BL", x0: 0, x1: 48, y: 203, bridge: true }, { id: "BR", x0: 234, x1: 292, y: 203, bridge: true },
];
const PADS = { C1: { x: 113, y: 74 }, R2: { x: 232, y: 121 }, L3: { x: 25, y: 131 }, BASE: { x: 127, y: 203 } };
const LAVA_Y = 227;
function ledgeActive(l, wave) {
  if (l.bridge) return !bridgeGone;
  if (l.id === "C4") return !(wave >= 6 && wave % 10 !== 0) ;
  if (l.id === "TL" || l.id === "TR") return !(wave >= 8 && wave % 10 !== 0);
  if (l.id === "R3") return !(wave >= 11 && wave % 10 !== 0);
  return true;
}
// deterministic rock underside per ledge
function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }
function drawLedge(l, alpha) {
  const len = l.x1 - l.x0;
  for (let x = l.x0; x < l.x1; x++) {
    const u = (x - l.x0) / len, edge = Math.min(u, 1 - u);
    const seed = (x >> 1) * 31 + l.y * 7;
    const depth = Math.max(2, Math.round(2 + edge * 7 + hash(seed) * 2 - (l.x0 === 0 || l.x1 === 292 ? 0 : 0)));
    const isPad = l.pad && x >= l.pad[0] && x < l.pad[1] && !l.base;
    ctx.fillStyle = isPad ? "#9aa0a8" : "#f0a040"; ctx.fillRect(x, l.y, 1, 1);
    ctx.fillStyle = isPad ? "#6a7078" : "#d06818"; ctx.fillRect(x, l.y + 1, 1, 1);
    for (let d = 2; d < depth; d++) {
      const h = hash(((x >> 1) * 31 + l.y * 7) + (d >> 1) * 977);
      ctx.fillStyle = h < 0.06 ? "#000" : h < 0.5 ? "#a04a08" : h < 0.8 ? "#d06818" : "#6a3404";
      ctx.fillRect(x, l.y + d, 1, 1);
    }
  }
}
let baseCache = null;
function buildBase() {
  // central cliff: wide top slab holding the HUD, tapering into a root-like trunk
  const c = document.createElement("canvas"); c.width = W; c.height = H - 203;
  const g = c.getContext("2d");
  const span = y => y < 18 ? [48 + Math.max(0, 6 - y) * 0 + (y > 12 ? (y - 12) * 2 : 0), 234 - (y > 12 ? (y - 12) * 2 : 0)]
                           : [60 + (y - 18) * 1.6, 222 - (y - 18) * 1.6];
  for (let y = 0; y < c.height; y++) {
    const [a, b] = span(y);
    for (let x = Math.round(a); x < b; x++) {
      const h = hash((x >> 1) * 131 + (y >> 1) * 17);
      let col = y < 18 ? (h < 0.05 ? "#000" : h < 0.5 ? "#a05010" : h < 0.85 ? "#c86818" : "#e08028") : (h < 0.6 ? "#8a5a10" : "#7a4a08");
      if (y < 1) col = "#f0a040"; else if (y < 2) col = "#d06818";
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
  }
  // roots spreading out from the trunk toward the lava
  for (let i = 0; i < 16; i++) {
    const dir = i < 8 ? -1 : 1;
    let rx = dir < 0 ? 80 + i * 4 : 160 + (i - 8) * 4, ry = 18 + (i % 4) * 2;
    for (let s = 0; s < 26; s++) {
      g.fillStyle = s % 4 ? "#c86818" : "#e09038";
      g.fillRect(Math.round(rx), Math.round(ry), 2, 1);
      rx += dir * (0.8 + hash(i * 7 + s) * 1.2); ry += 0.35 + hash(i * 13 + s) * 0.4;
    }
  }
  g.fillStyle = "#3a1a04"; g.fillRect(64, 7, 76, 11); g.fillRect(144, 7, 74, 11);
  g.fillStyle = "#6a3404"; g.fillRect(64, 7, 76, 1); g.fillRect(144, 7, 74, 1);
  return c;
}
/* ---------------- audio (Web Audio synthesis) ---------------- */
localStorage.removeItem("joust_mute"); /* build 31: legacy key could be stuck on; sound is ON by default */
let AC = null, master = null, muted = localStorage.getItem("joust_mute_v31") === "1";
function audio() {
  if (!AC) {
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = muted ? 0 : 0.35; master.connect(AC.destination); } catch (e) { AC = null; }
  }
  if (AC && AC.state !== "running" && AC.resume) AC.resume().catch(() => {});
  if (master) master.gain.value = muted ? 0 : 0.35;
  return AC;
}
let noiseBuf = null;
function noise() {
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const n = AC.createBufferSource(); n.buffer = noiseBuf; n.loop = true; return n;
}
function env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
function tone(type, f0, f1, dur, vol, delay = 0) {
  if (!audio() || muted) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, 0.004, vol, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function nburst(dur, vol, fc, q = 1, delay = 0, fc1) {
  if (!audio() || muted) return;
  const t = AC.currentTime + delay, n = noise(), f = AC.createBiquadFilter(), g = AC.createGain();
  f.type = "bandpass"; f.frequency.setValueAtTime(fc, t); if (fc1) f.frequency.exponentialRampToValueAtTime(fc1, t + dur); f.Q.value = q;
  env(g, t, 0.003, vol, dur); n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + dur + 0.02);
}
const SFX = {
  // measured: buzzy ~215 Hz pulses, bright harmonics (centroid ~2.3 kHz), ~60 ms
  flap() { tone("square", 230, 160, 0.07, 0.22); nburst(0.06, 0.25, 2300, 0.8); },
  step() { tone("square", 215, 200, 0.025, 0.12); },
  skid() { nburst(0.25, 0.25, 2600, 2, 0, 900); },
  // collision clank: short metallic two-tone
  clank() { tone("square", 1250, 1180, 0.09, 0.15); tone("square", 1730, 1650, 0.09, 0.12); nburst(0.05, 0.2, 4000, 3); },
  // kill thunk: measured ~180 Hz falling to 107 Hz over ~0.2 s
  thunk() { tone("square", 185, 105, 0.2, 0.32); nburst(0.08, 0.25, 1500, 1); },
  // egg collect: quick rising chirps
  egg() { [880, 1175, 1480, 1760].forEach((f, i) => tone("square", f, f * 1.02, 0.05, 0.13, i * 0.045)); },
  // player materialize: alternating ~1000 Hz and rising 1180->1790 Hz, 120 ms cycle, 1.8 s decay
  spawn() {
    if (!audio() || muted) return;
    for (let i = 0; i < 15; i++) {
      const v = 0.18 * (1 - i / 15);
      tone("square", 1005, 1005, 0.06, v, i * 0.12);
      tone("square", 1180 + i * 42, 1180 + i * 42, 0.06, v, i * 0.12 + 0.06);
    }
  },
  // enemy materialize: ~780 Hz wobble, ~0.85 s
  enemySpawn() {
    if (!audio() || muted) return;
    for (let i = 0; i < 14; i++) tone("square", i % 2 ? 730 : 795, i % 2 ? 730 : 795, 0.06, 0.07, i * 0.06);
  },
  death() { tone("sawtooth", 900, 60, 0.9, 0.25); nburst(0.6, 0.15, 800, 1, 0.1, 200); },
  lava() { nburst(0.7, 0.35, 400, 0.7, 0, 120); tone("sawtooth", 140, 40, 0.7, 0.2); },
  troll() { tone("sawtooth", 70, 55, 0.35, 0.25); nburst(0.35, 0.2, 250, 1); },
  hatch() { tone("square", 1500, 2200, 0.08, 0.08); tone("square", 1500, 2200, 0.08, 0.08, 0.12); },
  buzz() { tone("sawtooth", 400, 700, 0.2, 0.08); },
  ptero() { if (!audio() || muted) return; tone("sawtooth", 1600, 500, 0.45, 0.2); tone("square", 1900, 700, 0.45, 0.08, 0.02); },
  pteroDie() { tone("square", 300, 2000, 0.3, 0.2); tone("square", 2000, 200, 0.5, 0.2, 0.3); },
  coin() { tone("square", 130, 110, 0.5, 0.3); tone("triangle", 260, 220, 0.45, 0.2); },
  extra() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone("square", f, f, 0.08, 0.14, i * 0.08)); },
  crumble() { nburst(1.2, 0.3, 300, 0.6, 0, 90); tone("sawtooth", 90, 40, 1.0, 0.15); },
  bonus() { [392, 523, 659, 784].forEach((f, i) => tone("square", f, f, 0.12, 0.13, i * 0.1)); },
};

/* ---------------- state ---------------- */
let mode = "attract", modeT = 0, attractPage = 0, credits = 0, paused = false;
let players = [], enemies = [], eggs = [], fx = [], pops = [], buzzards = [], pteros = [], hands = [];
let wave = 1, waveType = "", waveT = 0, waveState = "intro", waveStateT = 0, spawnQueue = [], eggStreak = 0;
let bridgeGone = false, bridgeBurn = 0, trollOn = false, nextPtero = 0, glad = false, teamBroken = false;
let frame = 0, pteroCount = 0, crumble = [];
const keys = {};
const DEFAULT_TABLE = [["WMS", 20000], ["JDN", 17500], ["BKN", 15000], ["CRB", 12500], ["MRS", 10000], ["PJR", 7500], ["KFL", 5000], ["WTP", 2500]];
let table;
try { table = JSON.parse(localStorage.getItem("joust_table_v2")) || DEFAULT_TABLE.slice(); } catch (e) { table = DEFAULT_TABLE.slice(); }
let high = Math.max(Number(localStorage.getItem("joust_hi_v1") || 0), table[0][1]);
let entry = null;

function waveKind(w) {
  if (w % 5 === 0) return "egg";
  if (w >= 8 && (w - 8) % 5 === 0) return "ptero";
  const m = w % 5;
  if (m === 2) return "survival";
  if (m === 3) return players.length > 1 ? "team" : "regular";
  if (m === 4) return "gladiator";
  return "regular";
}
function waveEnemies(w) {
  const n = Math.min(3 + Math.floor((w - 1) / 2) + (w > 1 ? 1 : 0), 8);
  const hFrac = Math.min(1, Math.max(0, (w - 2) / 6)), sFrac = Math.min(0.75, Math.max(0, (w - 6) / 12));
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = (i + 0.5) / n;
    out.push(r < sFrac ? "S" : r < sFrac + hFrac * (1 - sFrac) ? "H" : "B");
  }
  return out.reverse();
}

/* ---------------- entities ---------------- */
function makeRider(kind, x, y, face) {
  return { kind, x, y, vx: 0, vy: 0, face, ground: null, anim: 0, flapT: 0, alive: true, mat: 0, grabbed: null, escapes: 0 };
}
function newPlayer(idx) {
  const p = makeRider(idx ? "p2" : "p1", 0, 0, 1);
  p.idx = idx; p.mount = idx ? "stork" : "ostrich"; p.score = 0; p.lives = 5; p.nextExtra = 20000; p.state = "wait"; p.stateT = 0; p.diedThisWave = false; p.input = { dir: 0, flap: 0 };
  return p;
}
function spawnPlayer(p) {
  const pad = p.idx ? PADS.C1 : PADS.BASE;
  Object.assign(p, { x: pad.x + (p.idx ? 0 : 0), y: pad.y, vx: 0, vy: 0, face: p.idx ? -1 : 1, ground: null, state: "spawn", stateT: 0, mat: 0, grabbed: null, alive: true });
  SFX.spawn();
}
function freePads() {
  return Object.keys(PADS).filter(k => k !== "BASE" || players.every(p => p.state !== "spawn"));
}
function spawnEnemy(type, padKey) {
  const keysP = freePads().filter(k => k !== "BASE");
  const key = padKey || keysP[Math.floor(Math.random() * keysP.length)];
  const pad = PADS[key];
  const e = makeRider(type, pad.x + (Math.random() * 10 - 5), pad.y, Math.random() < 0.5 ? -1 : 1);
  e.type = type; e.mount = "buzzard"; e.state = "spawn"; e.stateT = 0; e.targetY = 60; e.thinkT = 0;
  enemies.push(e); SFX.enemySpawn();
  return e;
}
function addScore(p, pts, x, y) {
  if (!p) return;
  p.score += pts;
  if (x !== undefined) pops.push({ x, y, s: String(pts), t: 0 });
  while (p.score >= p.nextExtra) { p.lives++; p.nextExtra += 20000; SFX.extra(); }
  if (p.score > high) { high = p.score; localStorage.setItem("joust_hi_v1", String(high)); }
}

/* ---------------- game flow ---------------- */
function startGame(nPlayers, startWave = 1) {
  players = []; for (let i = 0; i < nPlayers; i++) players.push(newPlayer(i));
  mode = "play"; wave = startWave; bridgeGone = startWave >= 3; bridgeBurn = 0;
  beginWave();
}
function beginWave() {
  enemies = []; eggs = []; buzzards = []; pteros = []; hands = []; fx = []; spawnQueue = []; eggStreak = 0;
  waveType = waveKind(wave); waveT = 0; waveState = "intro"; waveStateT = 0; teamBroken = false; glad = waveType === "gladiator";
  trollOn = wave >= 3;
  if (wave === 3 && !bridgeGone) bridgeBurn = 1;
  nextPtero = waveType === "ptero" ? 60 * 3 : 60 * Math.max(25, 75 - wave * 4);
  pteroCount = waveType === "ptero" ? 3 : 0;
  crumble = LEDGES.filter(l => !l.bridge && wave > 1 && ledgeActive(l, wave - 1) && !ledgeActive(l, wave)).map(l => ({ l, t: 0 }));
  for (const p of players) { p.diedThisWave = false; if (p.lives > 0 && p.state !== "spawn" && p.state !== "alive") { p.lives--; spawnPlayer(p); } }
  if (waveType === "egg") {
    const spots = [];
    for (const l of LEDGES) if (ledgeActive(l, wave)) {
      const n = l.base ? 4 : (l.x1 - l.x0) > 60 ? 2 : 1;
      for (let i = 0; i < n; i++) spots.push({ x: l.x0 + (l.x1 - l.x0) * (i + 1) / (n + 1), y: l.y });
    }
    spots.slice(0, 12).forEach((s, i) => eggs.push({ x: s.x, y: s.y, vx: 0, vy: 0, t: 0, hatchAt: 60 * (6 + i * 0.9), ground: true, type: wave >= 15 ? "S" : wave >= 10 ? "H" : "B", hatched: 0 }));
  } else {
    const list = waveEnemies(wave);
    list.forEach((t, i) => spawnQueue.push({ t: 40 + i * (i < 3 ? 25 : 110), type: t }));
  }
}
function waveTitle() {
  return { ptero: "PTERODACTYL WAVE", survival: "SURVIVAL WAVE", egg: "EGG WAVE", team: "TEAM WAVE", gladiator: "GLADIATOR WAVE", regular: "" }[waveType];
}
function waveSub() {
  return { ptero: "BEWARE OF THE PTERODACTYLS", survival: "3000 FOR NOT DYING", egg: "COLLECT THE EGGS", team: "3000 FOR TEAMWORK", gladiator: "3000 FOR FIRST UNSEATING", regular: "" }[waveType];
}
function endWave() {
  waveState = "bonus"; waveStateT = 0;
  for (const p of players) {
    p.bonus = 0;
    if (waveType === "survival" && !p.diedThisWave && p.lives >= 0) p.bonus = 3000;
    if (waveType === "team" && !teamBroken && !p.diedThisWave) p.bonus = 3000;
    if (p.bonus) { addScore(p, p.bonus); SFX.bonus(); }
  }
}
function gameOver() {
  mode = "over"; modeT = 0;
}
function afterGameOver() {
  const best = players.map(p => p.score).filter(s => s > table[table.length - 1][1]);
  if (best.length) { entry = { pi: players.findIndex(p => p.score === Math.max(...best)), letters: [0, 0, 0], pos: 0 }; mode = "entry"; modeT = 0; flapQueue = [0, 0]; /* build 31: no stale flap may skip initial 1 */ }
  else { mode = "attract"; modeT = 0; attractPage = 1; }
}
function entryArmed() { return mode === "entry" && entry && modeT >= 30; } /* 0.5 s guard */
function entryNext() { if (!entryArmed()) return; SFX.egg(); if (entry.pos < 2) entry.pos++; else finishEntry(); }
function entryShift(d) { if (entryArmed()) entry.letters[entry.pos] = (entry.letters[entry.pos] + d + 26) % 26; }
function finishEntry() {
  const name = entry.letters.map(i => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i]).join("");
  table.push([name, players[entry.pi].score]); table.sort((a, b) => b[1] - a[1]); table = table.slice(0, 8);
  localStorage.setItem("joust_table_v2", JSON.stringify(table));
  entry = null; mode = "attract"; modeT = 0; attractPage = 1;
}

/* ---------------- physics ---------------- */
const GRAV = 0.04, FLAP = -0.95, MAXUP = -2.2, MAXDN = 2.6, MAXVX = 1.75;
function activeLedges() { return LEDGES.filter(l => ledgeActive(l, wave)); }
function onLedge(x, l) { return x >= l.x0 - 2 && x <= l.x1 + 2; }
function moveBody(b, isRider) {
  const prevY = b.y;
  if (b.ground) {
    const l = b.ground;
    if (!ledgeActive(l, wave) || !onLedge(b.x, l)) { b.ground = null; }
    else { b.y = l.y; b.vy = 0; }
  }
  if (!b.ground) { b.vy = Math.min(MAXDN, b.vy + GRAV); }
  b.x += b.vx; b.y += b.vy;
  if (b.x < 0) b.x += W; if (b.x >= W) b.x -= W;
  if (b.y < 16 && isRider) { b.y = 16; b.vy = Math.abs(b.vy) * 0.5; }
  if (b.ground) return;
  for (const l of activeLedges()) {
    if (!onLedge(b.x, l)) continue;
    if (b.vy >= 0 && prevY <= l.y + 0.5 && b.y >= l.y) { b.y = l.y; b.vy = 0; b.ground = l; if (isRider) b.landT = frame; return; }
    const bottom = l.y + (l.base ? 40 : 7), top = b.y - (isRider ? 18 : 5);
    if (b.vy < 0 && top < bottom && top - b.vy >= bottom - 0.5 && b.x > l.x0 + 1 && b.x < l.x1 - 1) { b.y = bottom + (isRider ? 18 : 5); b.vy = 0.6; }
    else if (b.y > l.y + 2 && top < bottom && isRider) {
      // side collision with ledge body
      if (b.x - b.vx < l.x0 || b.x - b.vx > l.x1) { b.x -= b.vx; b.vx = -b.vx * 0.8; }
    }
  }
}
function riderControl(r, dir, flap) {
  if (flap && !r.grabbed) {
    r.vy = Math.max(MAXUP, r.vy + FLAP); r.flapT = 8; r.ground = null;
    if (dir) { r.face = dir; r.vx = Math.max(-MAXVX, Math.min(MAXVX, r.vx + dir * 0.32)); }
    if (r.kind[0] === "p") SFX.flap();
  }
  if (r.ground) {
    if (dir) {
      if (Math.sign(r.vx) === -dir && Math.abs(r.vx) > 0.6) { r.vx += dir * 0.07; r.skid = true; if (frame % 12 === 0 && r.kind[0] === "p") SFX.skid(); }
      else { r.skid = false; r.face = dir; r.vx = Math.max(-MAXVX, Math.min(MAXVX, r.vx + dir * 0.06)); }
    } else { r.skid = false; r.vx *= 0.94; if (Math.abs(r.vx) < 0.05) r.vx = 0; }
    if (Math.abs(r.vx) > 0.2) { r.anim += Math.abs(r.vx) * 0.18; if (r.kind[0] === "p" && Math.floor(r.anim) !== Math.floor(r.anim - Math.abs(r.vx) * 0.18) && Math.floor(r.anim) % 2 === 0) SFX.step(); }
  } else if (dir && r.kind[0] !== "p") r.face = dir;
  else if (dir) r.face = dir;
  if (r.flapT > 0) r.flapT--;
}

/* ---------------- update ---------------- */
let flapQueue = [0, 0];
function update() {
  frame++; modeT++;
  if (mode === "attract") { if (modeT > 60 * 8) { modeT = 0; attractPage = (attractPage + 1) % 2; } return; }
  if (mode === "credit") return;
  if (mode === "over") { if (modeT > 180) afterGameOver(); return; }
  if (mode === "entry") return;
  if (paused) return;
  waveStateT++;
  for (const c of crumble) c.t++;
  if (waveStateT === 1 && crumble.length) SFX.crumble();
  if (bridgeBurn > 0) { bridgeBurn++; if (bridgeBurn > 120) { bridgeBurn = 0; bridgeGone = true; } }
  if (waveState === "intro" && waveStateT > 150) { waveState = "play"; waveStateT = 0; }
  if (waveState === "bonus") { if (waveStateT > 150) { wave++; beginWave(); } }
  if (waveState === "play") waveT++;

  // spawn queue
  if (waveState === "play") for (const s of spawnQueue) if (!s.done && waveT >= s.t) { s.done = true; spawnEnemy(s.type); }

  // players
  for (const p of players) {
    p.stateT++;
    const inp = p.input, fl = flapQueue[p.idx]; flapQueue[p.idx] = 0;
    if (p.state === "spawn") {
      p.mat = Math.min(1, p.stateT / 70);
      if (p.mat >= 1 && (inp.dir || fl || p.stateT > 60 * 6)) { p.state = "alive"; p.stateT = 0; }
      else continue;
    }
    if (p.state === "alive") {
      riderControl(p, inp.dir, fl);
      if (p.grabbed && fl) p.escapes++;
      moveBody(p, true);
    } else if (p.state === "dead") {
      if (p.stateT > 120) {
        if (p.lives > 0) { p.lives--; spawnPlayer(p); }
        else { p.state = "out"; if (players.every(q => q.state === "out")) gameOver(); }
      }
    }
  }
  // enemies
  for (const e of enemies) {
    e.stateT++;
    if (e.state === "spawn") { e.mat = Math.min(1, e.stateT / 60); if (e.stateT > 70) { e.state = "alive"; e.ground = LEDGES.find(l => Math.abs(l.y - e.y) < 1 && onLedge(e.x, l)) || null; } continue; }
    if (e.state !== "alive") continue;
    enemyAI(e);
    moveBody(e, true);
  }
  // riderless birds flying away
  for (const b of fx) if (b.kind === "loose") { b.x += b.vx; b.y += b.vy; b.vy = b.y > 150 ? -0.6 : b.vy * 0.98; b.flapT = (frame >> 3) & 1 ? 8 : 0; }
  fx = fx.filter(b => b.kind !== "loose" || (b.x > -20 && b.x < W + 20));
  for (const b of fx) b.t = (b.t || 0) + 1;
  fx = fx.filter(b => b.kind === "loose" || b.t < (b.life || 30));

  updateEggs(); updateBuzzards(); updatePtero(); updateTroll(); collisions();
  for (const p of pops) p.t++; pops = pops.filter(p => p.t < 70);

  // wave clear
  if (waveState === "play" && spawnQueue.every(s => s.done) && !enemies.length && !eggs.length && !buzzards.length) {
    pteros.forEach(pt => pt.leave = true);
    if (!pteros.length) endWave();
  }
}
function nearestPlayer(e) {
  let best = null, bd = 1e9;
  for (const p of players) if (p.state === "alive" || p.state === "spawn") {
    let dx = p.x - e.x; if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W;
    const d = Math.abs(dx) + Math.abs(p.y - e.y); if (d < bd) { bd = d; best = { p, dx }; }
  }
  return best;
}
function enemyAI(e) {
  const T = ETYPES[e.type];
  e.thinkT--;
  const np = nearestPlayer(e);
  if (e.thinkT <= 0) {
    e.thinkT = 40 + Math.random() * 90;
    const levels = [40, 60, 100, 120, 150, 185];
    if (e.type === "B") { e.targetY = levels[Math.floor(Math.random() * levels.length)]; if (Math.random() < 0.3) e.face = -e.face; }
    else if (np) {
      e.targetY = np.p.y - (e.type === "S" ? 16 : 8) + (Math.random() * 16 - 8);
      if (Math.random() < (e.type === "S" ? 0.8 : 0.55)) e.face = np.dx > 0 ? 1 : -1;
    }
    e.targetY = Math.max(30, Math.min(190, e.targetY));
  }
  let flap = false;
  const flapEvery = e.type === "S" ? 7 : e.type === "H" ? 9 : 12;
  if ((e.y > e.targetY && e.vy > -0.6 && frame % flapEvery === 0) || (e.y > 195 && e.vy > -1)) flap = true;
  if (e.ground && Math.random() < 0.01) flap = true;
  if (e.grabbed) { if (frame % 10 === 0) e.escapes++; flap = false; }
  // horizontal: seek speed in facing direction
  const want = e.face * T.spd;
  if (flap) { e.vy = Math.max(MAXUP, e.vy + FLAP * 0.95); e.flapT = 8; e.ground = null; }
  if (e.ground) e.vx += Math.sign(want - e.vx) * 0.05; else e.vx += (want - e.vx) * 0.02;
  if (e.ground && Math.abs(e.vx) > 0.2) e.anim += Math.abs(e.vx) * 0.18;
  if (e.flapT > 0) e.flapT--;
}
function unseat(e, by) {
  const T = ETYPES[e.type];
  addScore(by, T.pts, e.x, e.y - 20);
  SFX.thunk();
  if (glad && by) { glad = false; if (players.length === 1) addScore(by, 3000, e.x, e.y - 30); }
  eggs.push({ x: e.x, y: e.y - 10, vx: e.vx * 0.8, vy: e.vy - 0.8, t: 0, hatchAt: 60 * (5 + Math.random() * 3), ground: false, type: e.type, hatched: 0 });
  fx.push({ kind: "loose", x: e.x, y: e.y, vx: e.face * 1.6, vy: -0.5, face: e.face, mount: "buzzard", flapT: 0 });
  e.state = "gone";
}
function killPlayer(p, how) {
  if (p.state !== "alive") return;
  p.state = "dead"; p.stateT = 0; p.diedThisWave = true; p.grabbed = null;
  if (how === "lava") { SFX.lava(); fx.push({ kind: "splash", x: p.x, y: LAVA_Y, life: 40 }); }
  else { SFX.death(); fx.push({ kind: "loose", x: p.x, y: p.y, vx: p.face * 1.6, vy: -0.5, face: p.face, mount: p.mount, flapT: 0 }); }
}
function updateEggs() {
  for (const g of eggs) {
    g.t++;
    if (!g.ground) {
      const vy0 = g.vy;
      moveBody(g, false);
      if (g.ground) { if (vy0 > 0.8) { g.vy = -vy0 * 0.45; g.ground = null; g.y -= 1; } else g.ground = true; }
      g.vx *= 0.995;
      if (g.y > LAVA_Y + 4) g.dead = true;
    } else {
      if (g.ground !== true && !ledgeActive(g.ground, wave)) g.ground = null;
      g.vx *= 0.9; g.x += g.vx;
      if (g.ground === true) { const l = activeLedges().find(l => Math.abs(l.y - g.y) < 1 && onLedge(g.x, l)); g.ground = l || null; }
      if (g.ground && !onLedge(g.x, g.ground)) g.ground = null;
      if (g.t > g.hatchAt && !g.hatched) { g.hatched = 1; g.ht = 0; SFX.hatch(); }
      if (g.hatched) {
        g.ht++;
        if (g.ht === 120) { const side = Math.random() < 0.5 ? -1 : 1; buzzards.push({ x: side < 0 ? -12 : W + 12, y: 30 + Math.random() * 40, egg: g, face: -side }); SFX.buzz(); }
      }
    }
  }
  eggs = eggs.filter(g => !g.dead);
}
function updateBuzzards() {
  for (const b of buzzards) {
    const g = b.egg;
    if (g.dead) { b.x += b.face * 2; continue; }
    let dx = g.x - b.x, dy = (g.y - 2) - b.y;
    const d = Math.hypot(dx, dy) || 1, sp = 2.2;
    b.face = dx > 0 ? 1 : -1; b.x += dx / d * sp; b.y += dy / d * sp;
    if (d < 3) {
      g.dead = true; b.done = true;
      const up = { B: "H", H: "S", S: "S" }[g.type];
      const e = makeRider(up, g.x, g.y, b.face); e.type = up; e.mount = "buzzard"; e.state = "alive"; e.thinkT = 0; e.targetY = 60; e.vy = -1;
      enemies.push(e);
    }
  }
  buzzards = buzzards.filter(b => !b.done && b.x > -30 && b.x < W + 30);
  eggs = eggs.filter(g => !g.dead);
}
function updatePtero() {
  if (waveState === "play" && waveT > nextPtero && enemies.length) {
    nextPtero = waveT + (pteroCount > 1 ? 60 * 2 : 60 * 30); if (pteroCount > 0) pteroCount--;
    const side = Math.random() < 0.5 ? -1 : 1;
    pteros.push({ x: side < 0 ? -20 : W + 20, y: 40 + Math.random() * 100, vx: -side * 2.4, vy: 0, t: 0 });
    SFX.ptero();
  }
  for (const pt of pteros) {
    pt.t++;
    const np = nearestPlayer(pt);
    if (!pt.leave && np) {
      pt.vy += Math.sign(np.p.y - 14 - pt.y) * 0.06; pt.vy = Math.max(-1.4, Math.min(1.4, pt.vy));
      if (pt.t % 100 === 0 && Math.sign(np.dx) !== Math.sign(pt.vx)) pt.vx = -pt.vx;
    } else pt.vy = -0.5;
    pt.x += pt.vx; pt.y += pt.vy;
    if (pt.y > 190) pt.vy = -1; if (pt.y < 20) pt.vy = 0.5;
    if (!pt.leave) { if (pt.x < -24) pt.x += W + 48; if (pt.x > W + 24) pt.x -= W + 48; }
    if (pt.t % 90 === 0) SFX.ptero();
    for (const l of activeLedges()) if (onLedge(pt.x, l) && pt.y > l.y - 4 && pt.y < l.y + 8) pt.vy = pt.y < l.y + 2 ? -1 : 1;
  }
  pteros = pteros.filter(pt => !pt.dead && (!pt.leave || (pt.x > -40 && pt.x < W + 40)));
}
function updateTroll() {
  if (!trollOn || !bridgeGone) { hands = []; return; }
  const riders = players.filter(p => p.state === "alive").concat(enemies.filter(e => e.state === "alive"));
  for (const r of riders) {
    if (!r.grabbed && r.y > 210 && (r.x < 46 || r.x > 236) && Math.random() < 0.15) {
      r.grabbed = { t: 0 }; r.escapes = 0; hands.push({ r, t: 0 }); SFX.troll();
    }
  }
  for (const h of hands) {
    const r = h.r; h.t++;
    if (!r.grabbed || (r.state !== "alive")) { h.done = true; continue; }
    r.vx = 0; r.vy = 0.25; r.y = Math.min(r.y + 0.25, 240);
    if (r.escapes >= 6 + Math.min(6, wave >> 2)) { r.grabbed = null; r.vy = -2; h.done = true; continue; }
    if (r.y > 234) {
      h.done = true; r.grabbed = null;
      if (r.kind[0] === "p") killPlayer(r, "lava"); else { r.state = "gone"; SFX.lava(); }
    }
  }
  hands = hands.filter(h => !h.done);
}
function overlap(a, b, w = 11, h = 16) {
  let dx = Math.abs(a.x - b.x); if (dx > W / 2) dx = W - dx;
  return dx < w && Math.abs((a.y - 9) - (b.y - 9)) < h;
}
function joust(a, b) {
  // returns winner (the higher lance) or null for a bounce
  const dy = a.y - b.y;
  if (Math.abs(dy) <= 3) return null;
  return dy < 0 ? a : b;
}
function bounce(a, b) {
  let dx = a.x - b.x; if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W;
  const s = dx >= 0 ? 1 : -1;
  a.vx = s * Math.max(1, Math.abs(a.vx)); b.vx = -s * Math.max(1, Math.abs(b.vx));
  a.x += s * 2; b.x -= s * 2; SFX.clank();
}
function collisions() {
  for (const p of players) {
    if (p.state !== "alive") continue;
    if (p.y > LAVA_Y + 6) { killPlayer(p, "lava"); continue; }
    for (const e of enemies) {
      if (e.state !== "alive" || !overlap(p, e)) continue;
      const w = joust(p, e);
      if (!w) bounce(p, e); else if (w === p) unseat(e, p); else { killPlayer(p); break; }
    }
    if (p.state !== "alive") continue;
    for (const g of eggs) {
      if (g.dead) continue;
      let dx = Math.abs(p.x - g.x); if (dx > W / 2) dx = W - dx;
      if (dx < 8 && Math.abs(p.y - 4 - g.y) < 10) {
        g.dead = true;
        const val = [250, 500, 750, 1000][Math.min(3, eggStreak++)];
        const air = !g.ground;
        addScore(p, val + (air ? 500 : 0), g.x, g.y - 12);
        SFX.egg();
      }
    }
    for (const pt of pteros) {
      if (pt.dead) continue;
      let dx = p.x - pt.x; if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W;
      if (Math.abs(dx) < 15 && Math.abs((p.y - 10) - (pt.y + 4)) < 8) {
        const headDir = Math.sign(pt.vx);
        const mouthOpen = ((pt.t >> 3) & 1) === 1;
        const lanceY = p.y - 13, mouthY = pt.y + 4;
        const towardP = Math.sign(dx) === headDir, pFaces = p.face === -Math.sign(dx);
        if (mouthOpen && towardP && pFaces && Math.abs(lanceY - mouthY) <= 4) {
          pt.dead = true; addScore(p, 1000, pt.x, pt.y - 6); SFX.pteroDie(); fx.push({ kind: "burst", x: pt.x, y: pt.y + 4, life: 40 });
        } else killPlayer(p);
        break;
      }
    }
  }
  eggs = eggs.filter(g => !g.dead);
  enemies = enemies.filter(e => e.state !== "gone");
  // player vs player
  if (players.length > 1) {
    const [a, b] = players;
    if (a.state === "alive" && b.state === "alive" && overlap(a, b)) {
      const w = joust(a, b);
      if (!w) bounce(a, b);
      else {
        const l = w === a ? b : a;
        if (waveType === "team") teamBroken = true;
        addScore(w, glad ? 3000 : 1000, l.x, l.y - 20); glad = false;
        SFX.thunk(); killPlayer(l);
      }
    }
  }
}

/* ---------------- drawing ---------------- */
function drawBird(r, mountKey, riderKey, mat = 1) {
  const M = MOUNTS[mountKey], flip = r.face < 0;
  const x = Math.round(r.x - 8), y = Math.round(r.y - 13);
  if (mat < 1) {
    // materialize: sprite revealed from the feet up with shimmering scanlines
    ctx.save(); const shown = Math.round(22 * mat);
    ctx.beginPath(); ctx.rect(x - 2, r.y - shown, 20, shown + 1); ctx.clip();
  }
  let legs;
  if (r.ground) legs = r.skid ? LEGS.run3 : Math.abs(r.vx) > 0.2 ? [LEGS.run1, LEGS.run2, LEGS.run3, LEGS.run2][Math.floor(r.anim) % 4] : LEGS.stand;
  else legs = LEGS.fly;
  blit(M.body, x, y, M.pal, flip);
  blit(legs, x, y + 9, M.pal, flip);
  if (!r.ground) blit(r.flapT > 3 ? WING_DN : WING_UP, x + (flip ? 0 : 0), r.flapT > 3 ? y + 5 : y + 1, M.pal, flip);
  if (riderKey) {
    blit(RIDER, flip ? x + 6 : x + 2, y - 3, RIDERS[riderKey], flip);
    ctx.fillStyle = "#fff"; // lance
    const lx = flip ? x - 2 : x + 6, ly = y;
    ctx.fillRect(lx, ly, 12, 1);
  }
  if (mat < 1) {
    ctx.restore();
    const cols = ["#ff0", "#f0f", "#0ff", "#fff"];
    for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[(frame + i) & 3]; ctx.fillRect(x - 1, Math.round(r.y - 22 * mat) + i * 2 - 1, 18, 1); }
  }
}
function drawHUD() {
  const p1 = players[0], p2 = players[1];
  if (p1) {
    text(p1.score, 101, 211, "#f8e000", 1, "right");
    for (let i = 0; i < Math.min(p1.lives, 6); i++) drawLifeIcon(106 + i * 6, 211, "#f8e000");
  }
  if (p2) {
    text(p2.score, 185, 211, "#c8c8ff", 1, "right");
    for (let i = 0; i < Math.min(p2.lives, 5); i++) drawLifeIcon(190 + i * 6, 211, "#c8c8ff");
  }
}
function drawLifeIcon(x, y, col) {
  ctx.fillStyle = col;
  ctx.fillRect(x + 2, y, 2, 1); ctx.fillRect(x + 3, y + 1, 1, 2); ctx.fillRect(x, y + 3, 4, 2); ctx.fillRect(x + 1, y + 5, 1, 2); ctx.fillRect(x + 3, y + 5, 1, 2);
}
function drawPlayfield() {
  for (const l of LEDGES) {
    if (l.base) continue;
    if (l.bridge) {
      if (bridgeGone) continue;
      const burnX = bridgeBurn ? (bridgeBurn / 120) * 48 : 0;
      ctx.fillStyle = "#d06818";
      if (l.id === "BL") ctx.fillRect(0, l.y, 48 - burnX, 2); else ctx.fillRect(234 + burnX, l.y, 58 - burnX, 2);
      if (bridgeBurn) { ctx.fillStyle = frame & 4 ? "#ff0" : "#f40"; ctx.fillRect(l.id === "BL" ? 48 - burnX - 2 : 234 + burnX, l.y - 2, 3, 3); }
      continue;
    }
    if (!ledgeActive(l, wave)) continue;
    drawLedge(l);
  }
  for (const c of crumble) {
    if (c.t > 150) continue;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - c.t / 150);
    const l = c.l;
    for (let x = l.x0; x < l.x1; x += 2) { const h = hash(x * 7 + l.y), fall = Math.max(0, c.t - h * 60) ** 1.6 * 0.05;
      ctx.fillStyle = h < 0.5 ? "#d06818" : "#a04a08"; ctx.fillRect(x, l.y + fall, 2, 2 + ((h * 5) | 0)); }
    ctx.restore();
  }
  if (!baseCache) baseCache = buildBase();
  const lavaTop = (wave === 1 && waveState === "intro") ? H : (wave === 1 && waveT < 120) ? H - (H - LAVA_Y) * waveT / 120 : LAVA_Y;
  ctx.fillStyle = "#ff2600"; ctx.fillRect(0, lavaTop, W, H - lavaTop);
  if (lavaTop === LAVA_Y && (bridgeGone || mode !== "play")) { for (let x = 0; x < W; x += 4) { const h = (Math.sin(x * 0.3 + frame * 0.08) + 1) | 0; ctx.fillRect(x, LAVA_Y - h, 4, h); } }
  ctx.drawImage(baseCache, 0, 203);
  ctx.fillStyle = "#9aa0a8"; ctx.fillRect(113, 203, 28, 1); ctx.fillStyle = "#6a7078"; ctx.fillRect(113, 204, 28, 1);
}
function drawEgg(g) {
  const pal = { e: "#c8e8ff", E: "#6a90ff" };
  if (g.hatched) {
    // little knight standing next to shell
    const wob = g.ht < 120 ? ((frame >> 3) & 1) : 0;
    blit(RIDER, g.x - 3 + wob, g.y - 6, RIDERS[g.type]);
    blit([".ee.", "e..e"], g.x - 2, g.y - 2, pal);
  } else blit(EGG, g.x - 2, g.y - 5, pal);
}
function render() {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  if (mode === "attract") return attractPage === 0 ? drawTitle() : drawChampions();
  if (mode === "credit") return drawCredit();
  if (mode === "entry") return drawEntry();
  drawPlayfield();
  for (const g of eggs) drawEgg(g);
  for (const e of enemies) drawBird(e, "buzzard", e.type, e.state === "spawn" ? e.mat : 1);
  for (const b of buzzards) drawBird({ x: b.x, y: b.y + 8, face: b.face, flapT: (frame >> 3) & 1 ? 8 : 0 }, "buzzard", null);
  for (const b of fx) {
    if (b.kind === "loose") drawBird(b, b.mount, null);
    else if (b.kind === "splash") { ctx.fillStyle = b.t & 4 ? "#ff0" : "#f80"; for (let i = 0; i < 6; i++) ctx.fillRect(b.x - 6 + i * 2, b.y - (b.t % 12) - i % 3 * 2, 1, 2); }
    else if (b.kind === "burst") { ctx.fillStyle = ["#fff", "#ff0", "#f0f"][b.t % 3]; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, d = b.t * 0.6; ctx.fillRect(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 1, 1); } }
  }
  for (const p of players) if (p.state === "alive" || p.state === "spawn") drawBird(p, p.mount, p.kind, p.state === "spawn" ? p.mat : 1);
  for (const pt of pteros) {
    const fr = PTERO[(pt.t >> 3) & 1], flip = pt.vx < 0;
    blit(fr, pt.x - 14, pt.y - 4, { w: "#6080ff", b: "#4060e0", h: "#7090ff", m: "#ff4040", l: "#f0f000" }, flip);
  }
  for (const h of hands) {
    const r = h.r, top = Math.round(r.y - 2);
    blit(HAND.slice(0, Math.max(3, LAVA_Y + 2 - top)), r.x - 4, top, { h: "#c06010" });
  }
  drawHUD();
  for (const pp of pops) text(pp.s, pp.x, pp.y - pp.t * 0.15, "#fff", 1, "center");
  if (waveState === "intro") {
    text("WAVE " + wave, W / 2, 92, "#fff", 1, "center");
    const t = waveTitle();
    if (t) { text(t, W / 2, 104, "#ff0", 1, "center"); text(waveSub(), W / 2, 120, "#fff", 1, "center"); }
    else text("PREPARE TO JOUST", W / 2, 120, "#fff", 1, "center");
    if (bridgeBurn) text("BEWARE OF THE LAVA TROLL", W / 2, 140, "#f80", 1, "center");
  }
  if (waveState === "bonus") {
    text("WAVE " + wave + " COMPLETED", W / 2, 96, "#fff", 1, "center");
    players.forEach((p, i) => { if (p.bonus) text((players.length > 1 ? "P" + (i + 1) + " " : "") + "BONUS " + p.bonus, W / 2, 112 + i * 10, "#ff0", 1, "center"); });
  }
  if (mode === "over") text("GAME OVER", W / 2, 100, "#fff", 1, "center");
  if (paused) text("PAUSED", W / 2, 100, "#ff0", 1, "center");
  
}
function drawBorder(c1, c2) {
  for (let i = 0; i < W + H; i += 4) {
    ctx.fillStyle = ((i >> 2) + (frame >> 3)) & 1 ? c1 : c2;
    ctx.fillRect(i, 0, 3, 6); ctx.fillRect(W - 6, i, 6, 3);
  }
}
function drawLogo(x, y) {
  // chunky slanted JOUST logo: solid yellow strokes with a red inner stripe
  const s = "JOUST", sc = 7, total = s.length * 6 * sc;
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]], ox = x + i * 6 * sc - total / 2, bob = (i % 2 ? 4 : -2);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r] & (16 >> c)) {
      const px = Math.round(ox + c * sc + (6 - r) * 0.8), py = y + r * sc + bob;
      if (!pass) { ctx.fillStyle = "#f8f000"; ctx.fillRect(px, py, sc, sc); }
      else {
        ctx.fillStyle = "#c01010";
        const vert = (r > 0 && g[r - 1] & (16 >> c)) || (r < 6 && g[r + 1] & (16 >> c));
        if (vert) ctx.fillRect(px + 2, py, 3, sc); else ctx.fillRect(px, py + 2, sc, 3);
      }
    }
  }
}
function drawTitle() {
  const cols = [["#c01010", "#400"], ["#10a010", "#030"], ["#2030c0", "#002"]][Math.floor(frame / 180) % 3];
  drawBorder(cols[0], cols[1]);
  drawLogo(W / 2 - 2, 40);
  text("PRESENTED BY:", W / 2, 130, "#30a0ff", 1, "center");
  text("WILLIAMS ELECTRONICS INC.", W / 2, 147, "#30a0ff", 1, "center");
  text("EXTRA MOUNT EVERY", W / 2 - 40, 163, "#f8f000", 1, "center");
  text("20,000 POINTS", W / 2 + 64, 163, "#f02020", 1, "center");
  text("(C) 1982 WILLIAMS ELECTRONICS INC.", W / 2, 181, "#fff", 1, "center");
  text("WEB RECREATION - WTP ARCADE", W / 2, 199, "#666", 1, "center");
  text("CREDITS  " + credits, W / 2, 220, "#f02020", 1, "center");
  if (touchMode && (frame >> 5) & 1) text("TAP TO INSERT COIN", W / 2, 232, "#ff0", 1, "center");
}
function drawChampions() {
  drawBorder("#ff8000", "#c00000");
  text("JOUST CHAMPIONS", W / 2, 24, "#30a0ff", 1, "center");
  text("HIGH  " + high, W / 2, 40, "#ff0", 1, "center");
  table.forEach((t, i) => {
    const c = i === 0 ? "#ff0" : "#f02060";
    text((i + 1) + ")", 70, 60 + i * 16, c); text(t[0], 100, 60 + i * 16, c); text(t[1], 220, 60 + i * 16, c, 1, "right");
  });
  text("CREDITS  " + credits, W / 2, 220, "#20c060", 1, "center");
}
function drawCredit() {
  text('PRESS "SINGLE PLAY" TO START', W / 2, 80, "#fff", 1, "center");
  text('"SINGLE PLAY"', W / 2 - 15, 80, "#f8f000", 1, "center");
  text("OR", W / 2, 112, "#fff", 1, "center");
  text(credits > 1 ? 'PRESS "DUAL PLAY" (2) FOR TWO' : "INSERT ADDITIONAL COINS FOR", W / 2, 144, "#fff", 1, "center");
  text('"DUAL PLAY"', W / 2, 160, "#30a0ff", 1, "center");
  text("CREDITS  " + credits, W / 2, 220, "#20c060", 1, "center");
  if (touchMode && (frame >> 5) & 1) text("TAP TO START", W / 2, 190, "#ff0", 1, "center");
}
function drawEntry() {
  text("PLAYER " + (entry.pi + 1), W / 2, 50, "#ff0", 1, "center");
  text("YOU HAVE JOINED THE", W / 2, 70, "#fff", 1, "center");
  text("JOUST CHAMPIONS", W / 2, 82, "#30a0ff", 1, "center");
  text("ENTER YOUR INITIALS", W / 2, 106, "#fff", 1, "center");
  entry.letters.forEach((l, i) => {
    text("ABCDEFGHIJKLMNOPQRSTUVWXYZ"[l], W / 2 - 18 + i * 18, 130, i === entry.pos && (frame >> 4) & 1 ? "#f02020" : "#ff0", 2);
  });
  text("LEFT/RIGHT CHANGE - FLAP SELECTS", W / 2, 170, "#888", 1, "center");
}

/* ---------------- input ---------------- */
let touchMode = false;
function coin() { audio(); credits = Math.min(credits + 1, 9); SFX.coin(); if (mode === "attract") { mode = "credit"; modeT = 0; } }
function start(n) {
  audio();
  if (mode === "attract" && credits === 0) return coin();
  if ((mode === "attract" || mode === "credit") && credits >= n) { credits -= n; startGame(n); }
}
function flapPress(pi) {
  audio();
  if (mode === "attract") return coin();
  if (mode === "credit") return start(1);
  if (mode === "entry") { entryNext(); return; }
  if (mode === "play" && !paused) flapQueue[pi] = 1;
}
function updateInputs() {
  const d1 = (keys.ArrowRight || keys.KeyD || touchDir > 0 ? 1 : 0) - (keys.ArrowLeft || keys.KeyA || touchDir < 0 ? 1 : 0);
  const d2 = (keys.KeyL ? 1 : 0) - (keys.KeyJ ? 1 : 0);
  if (players[0]) players[0].input.dir = d1;
  if (players[1]) players[1].input.dir = d2;
}
addEventListener("keydown", e => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (mode === "entry" && (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "KeyA" || e.code === "KeyD")) {
    entryShift(e.code === "ArrowRight" || e.code === "KeyD" ? 1 : -1); return;
  }
  if (mode === "entry" && /^Key[A-Z]$/.test(e.code)) { if (entryArmed()) { entry.letters[entry.pos] = e.code.charCodeAt(3) - 65; entryNext(); } return; }
  if (e.code === "Digit5" || e.code === "Numpad5") return coin();
  if (e.code === "Enter" || e.code === "NumpadEnter") { if (mode === "entry") return entryNext(); return credits ? start(1) : coin(); }
  if (e.code === "Digit1") return start(1);
  if (e.code === "Digit2") return start(2);
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW" || e.code === "ControlLeft" || e.code === "ControlRight") return flapPress(0);
  if (e.code === "KeyI") return flapPress(1);
  if (e.code === "KeyP" && mode === "play") paused = !paused;
  if (e.code === "KeyM") toggleMute();
  if (e.code === "Backquote" && DEBUG && mode === "play") { wave++; beginWave(); }
});
addEventListener("keyup", e => { keys[e.code] = false; });
addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

// touch: arrow buttons (held, multi-touch) + tap anywhere else = one flap
let touchDir = 0; const heldDirs = new Map();
function recomputeTouchDir() { let d = 0; for (const v of heldDirs.values()) d = v; touchDir = d; document.querySelectorAll(".tbtn").forEach(b => b.classList.toggle("active", [...heldDirs.values()].includes(+b.dataset.dir))); }
document.querySelectorAll(".tbtn").forEach(btn => {
  btn.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); audio(); try { btn.setPointerCapture(e.pointerId); } catch (_) {} heldDirs.set(e.pointerId, +btn.dataset.dir); recomputeTouchDir();
    if (mode === "entry") entryShift(+btn.dataset.dir); });
  const up = e => { heldDirs.delete(e.pointerId); recomputeTouchDir(); };
  btn.addEventListener("pointerup", up); btn.addEventListener("pointercancel", up); btn.addEventListener("lostpointercapture", up);
  btn.addEventListener("contextmenu", e => e.preventDefault());
});
document.addEventListener("pointerdown", e => {
  if (e.pointerType === "touch" && !touchMode) { touchMode = true; document.body.classList.add("touch"); }
  if (e.target.closest("#topbar") || e.target.closest(".tbtn") || e.target.closest("#btn-flap")) return;
  if (e.pointerType === "mouse" && e.target !== cv) return;
  e.preventDefault();
  flapPress(0);
}, { passive: false });
if ("ontouchstart" in window || navigator.maxTouchPoints > 0) { touchMode = true; document.body.classList.add("touch"); }
["touchmove", "gesturestart", "gesturechange", "dblclick"].forEach(t => document.addEventListener(t, e => { if (!e.target.closest || !e.target.closest("#topbar")) e.preventDefault(); }, { passive: false }));
document.addEventListener("touchstart", e => { if (!e.target.closest("#topbar")) e.preventDefault(); }, { passive: false });
document.addEventListener("contextmenu", e => e.preventDefault());

const flapBtn = document.getElementById("btn-flap");
if (flapBtn) { flapBtn.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); audio(); flapBtn.classList.add("active"); flapPress(0); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(t => flapBtn.addEventListener(t, () => flapBtn.classList.remove("active"))); }
const muteBtn = document.getElementById("btn-mute");
function toggleMute() {
  muted = !muted; localStorage.setItem("joust_mute_v31", muted ? "1" : "0");
  if (master) master.gain.value = muted ? 0 : 0.35;
  muteBtn.textContent = muted ? "SOUND OFF" : "SOUND ON";
}
muteBtn.textContent = muted ? "SOUND OFF" : "SOUND ON";
muteBtn.addEventListener("click", e => { e.stopPropagation(); audio(); toggleMute(); muteBtn.blur(); });

/* ---------------- main loop (fixed 60 Hz) ---------------- */
let acc = 0, last = performance.now();
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { updateInputs(); update(); acc -= 1000 / 60; }
  render();
  requestAnimationFrame(loop);
}
if (Q.has("wave")) { credits = 1; credits--; startGame(Q.get("players") === "2" ? 2 : 1, Math.max(1, parseInt(Q.get("wave"), 10) || 1)); }
requestAnimationFrame(loop);

// test/debug hook (read-mostly)
window.JOUST = {
  build: 31, audio: () => (AC ? AC.state : "none"), entry: () => entry && { pos: entry.pos, letters: entry.letters.map(i => String.fromCharCode(65 + i)).join(""), t: modeT }, table: () => table.map(r => r.join(":")),
  get state() { return { mode, wave, crumbling: crumble.length, waveType, waveState, credits, enemies: enemies.length, eggs: eggs.length, pteros: pteros.length, bridgeGone, trollOn,
    players: players.map(p => ({ state: p.state, score: p.score, lives: p.lives, x: p.x, y: p.y })), ledges: activeLedges().map(l => l.id) }; },
  debug: DEBUG ? {
    skipIntro() { waveState = "play"; waveStateT = 0; for (const p of players) if (p.state === "spawn") { p.mat = 1; p.state = "alive"; } },
    enemyBelow() { const p = players[0]; const e = spawnEnemy("B"); Object.assign(e, { state: "alive", x: p.x, y: p.y + 8, vx: 0, vy: 0, ground: null, thinkT: 999, targetY: p.y + 8 }); return e; },
    eggAt() { const p = players[0]; eggs.push({ x: p.x + 3, y: p.y - 4, vx: 0, vy: 0, t: 0, hatchAt: 9999, ground: false, type: "B", hatched: 0 }); },
    clear() { spawnQueue.forEach(s => s.done = true); enemies = []; eggs = []; buzzards = []; },
    ptero() { nextPtero = 0; waveT = 1; },
    trollGrab() { const e = enemies.find(e => e.state === "alive") || spawnEnemy("H"); Object.assign(e, { state: "alive", x: 22, y: 214, vx: 0, vy: 0, ground: null, thinkT: 999, targetY: 230, grabbed: { t: 0 }, escapes: -99 }); hands.push({ r: e, t: 0 }); SFX.troll(); },
    nextWave() { wave++; beginWave(); },
    gotoWave(n) { wave = n; beginWave(); },
    setScore(n) { players[0].score = n; },
    endGame() { for (const p of players) { p.lives = 0; p.state = "out"; } gameOver(); },
  } : null,
};
  // -- Audio unlock (sound ON by default): first tap/click/key anywhere resumes Web Audio --
  (function () {
    function silentWav() {
      const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
      const s = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
      s(0, "RIFF"); v.setUint32(4, 36 + n, true); s(8, "WAVEfmt "); v.setUint32(16, 16, true);
      v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
      v.setUint16(32, 1, true); v.setUint16(34, 8, true); s(36, "data"); v.setUint32(40, n, true); b.fill(128, 44);
      let str = ""; for (let i = 0; i < b.length; i++) str += String.fromCharCode(b[i]);
      return "data:audio/wav;base64," + btoa(str);
    }
    let tag = null, kicked = null;
    function onGesture() {
      try { if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback"; } catch (_) {}
      try { if (!tag) { tag = new Audio(silentWav()); tag.setAttribute("playsinline", ""); tag.loop = true; tag.volume = 0.01; } if (tag.paused) { const p = tag.play(); if (p && p.catch) p.catch(function () {}); } } catch (_) {}
      try { audio(); } catch (_) {}
      try {
        const c = AC;
        if (c) {
          if (c.state !== "running" && c.resume) c.resume().catch(function () {});
          if (kicked !== c) { kicked = c; const sb = c.createBuffer(1, 1, 22050), src = c.createBufferSource(); src.buffer = sb; src.connect(c.destination); src.start(0); }
        }
      } catch (_) {}
    }
    ["pointerdown", "touchstart", "touchend", "mousedown", "click", "keydown"].forEach(function (t) {
      window.addEventListener(t, onGesture, { capture: true, passive: true });
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { try { const c = AC; if (c && c.state === "suspended") c.resume().catch(function () {}); } catch (_) {} } });
    window.__audioInfo = function () { const c = AC; return { ctx: c ? c.state : "none", muted: muted }; };
  })();

})();
