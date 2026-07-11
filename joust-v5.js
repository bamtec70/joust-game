/**
 * JOUST — Williams Electronics 1982 style recreation
 * Landscape horizontal playfield, flap flight, lance height combat,
 * eggs, hatch, pterodactyl, lava troll. Touch + keyboard.
 */
(() => {
  "use strict";

  const canvas = document.getElementById("game");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  // Higher internal resolution for detailed smooth art when scaled to fill screen
  const VW = 960;
  const VH = 540;
  const SCALE = 2; // draw at 2× then CSS scales with smoothing
  canvas.width = VW * SCALE;
  canvas.height = VH * SCALE;
  ctx.imageSmoothingEnabled = true;
  try {
    ctx.imageSmoothingQuality = "high";
  } catch (_) {}

  const overlay = document.getElementById("overlay");
  const $title = document.getElementById("overlay-title");
  const $sub = document.getElementById("overlay-sub");
  const $hint = document.getElementById("overlay-hint");
  const $score = document.getElementById("score");
  const $high = document.getElementById("high-score");
  const $wave = document.getElementById("wave");
  const $lives = document.getElementById("lives");

  // ── Colors closer to Williams 16-color Joust feel ────────────────────────
  const C = {
    black: "#000000",
    sky: "#000000",
    skyGlow: "#1a0c18",
    rock: "#b85a28",
    rockMid: "#8a4020",
    rockDk: "#5a2810",
    rockLt: "#d87840",
    rockRim: "#f0a060",
    lava: "#e03000",
    lavaHot: "#ff9000",
    lavaCore: "#ffe060",
    yellow: "#ffff40",
    player: "#f0d020", // yellow ostrich
    playerDk: "#c09010",
    playerWing: "#e8c018",
    white: "#f0f0f0",
    bounder: "#70a848", // green buzzards (original palette choice)
    bounderDk: "#406828",
    hunter: "#e03830",
    hunterDk: "#901810",
    shadow: "#5050d0",
    shadowDk: "#282880",
    egg: "#40c040",
    ptero: "#c09070",
    pteroWing: "#a07050",
    hand: "#e06040",
    knight: "#e8e8e8",
    lance: "#d0d0d0",
  };

  // ── Audio ────────────────────────────────────────────────────────────────
  let AC = null;
  let muted = false;

  function unlockAudio() {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
    } catch (_) {}
  }

  function tone(freq, dur, type = "square", vol = 0.04, when = 0, slideTo) {
    if (muted || !AC) return;
    try {
      const t0 = AC.currentTime + when;
      const o = AC.createOscillator();
      const g = AC.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo != null) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(AC.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.03);
    } catch (_) {}
  }

  function noise(dur, vol = 0.05, when = 0, ff = 800) {
    if (muted || !AC) return;
    try {
      const n = Math.floor(AC.sampleRate * dur);
      const buf = AC.createBuffer(1, n, AC.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = AC.createBufferSource();
      src.buffer = buf;
      const f = AC.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = ff;
      const g = AC.createGain();
      const t0 = AC.currentTime + when;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f);
      f.connect(g);
      g.connect(AC.destination);
      src.start(t0);
      src.stop(t0 + dur + 0.03);
    } catch (_) {}
  }

  function sfx(name) {
    unlockAudio();
    if (muted || !AC) return;
    if (name === "flap") {
      tone(180, 0.06, "square", 0.03);
      tone(120, 0.05, "square", 0.02, 0.04);
    } else if (name === "kill") {
      noise(0.12, 0.06, 0, 600);
      tone(400, 0.12, "sawtooth", 0.04, 0, 80);
    } else if (name === "die") {
      noise(0.4, 0.08, 0, 400);
      tone(300, 0.45, "sawtooth", 0.05, 0, 50);
    } else if (name === "egg") {
      tone(660, 0.08, "square", 0.04);
      tone(880, 0.1, "square", 0.04, 0.08);
    } else if (name === "hatch") {
      tone(220, 0.1, "square", 0.04);
      tone(330, 0.12, "square", 0.035, 0.1);
    } else if (name === "wave") {
      [330, 392, 523, 659].forEach((f, i) => tone(f, 0.1, "square", 0.04, i * 0.09));
    } else if (name === "ptero") {
      tone(90, 0.4, "sawtooth", 0.05, 0, 200);
      noise(0.3, 0.04, 0.1, 300);
    } else if (name === "lava") {
      noise(0.35, 0.07, 0, 200);
      tone(100, 0.3, "sawtooth", 0.04, 0, 40);
    } else if (name === "bounce") {
      tone(200, 0.06, "square", 0.03);
    } else if (name === "extra") {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.08, "square", 0.04, i * 0.07));
    } else if (name === "start") {
      [262, 330, 392, 523].forEach((f, i) => tone(f, 0.1, "square", 0.04, i * 0.08));
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function pad(n) {
    return String(Math.floor(n) | 0).padStart(2, "0");
  }
  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }
  function chance(p) {
    return Math.random() < p;
  }
  function wrapX(x) {
    x %= VW;
    if (x < 0) x += VW;
    return x;
  }
  function wrapDelta(a, b) {
    let d = b - a;
    if (d > VW / 2) d -= VW;
    if (d < -VW / 2) d += VW;
    return d;
  }

  // ── Platforms — closer to classic single-screen Joust arena ─────────────
  // Bottom ledges with lava pits; floating rock shelves at mid/upper heights
  const PLATFORMS = [
    // bottom ground (left / center bridge early-wave style / right)
    { x: 0, y: VH - 52, w: 220, h: 52, kind: "ground" },
    { x: 300, y: VH - 52, w: 360, h: 52, kind: "ground" },
    { x: 740, y: VH - 52, w: 220, h: 52, kind: "ground" },
    // lower mid shelves
    { x: 40, y: VH - 168, w: 150, h: 22, kind: "float" },
    { x: 770, y: VH - 168, w: 150, h: 22, kind: "float" },
    // center mid
    { x: 360, y: VH - 195, w: 240, h: 22, kind: "float" },
    // upper side shelves
    { x: 100, y: VH - 300, w: 170, h: 20, kind: "float" },
    { x: 690, y: VH - 300, w: 170, h: 20, kind: "float" },
    // high center perch
    { x: 350, y: VH - 400, w: 260, h: 20, kind: "float" },
    // thin upper corners
    { x: 20, y: VH - 380, w: 90, h: 16, kind: "float" },
    { x: 850, y: VH - 380, w: 90, h: 16, kind: "float" },
  ];

  // Lava pits between bottom ground segments
  const LAVA = [
    { x: 220, y: VH - 44, w: 80, h: 44 },
    { x: 660, y: VH - 44, w: 80, h: 44 },
  ];

  // ── State ────────────────────────────────────────────────────────────────
  let state = "title";
  let score = 0;
  let high = 0;
  try {
    high = Number(localStorage.getItem("joust_hi_v1") || 0);
  } catch (_) {}
  let wave = 1;
  let lives = 3;
  let extrasAt = 0;

  let player = null;
  let enemies = [];
  let eggs = [];
  let particles = [];
  let ptero = null;
  let hands = []; // lava troll grabs

  let invuln = 0;
  let waveT = 0;
  let dieT = 0;
  let clearT = 0;
  let idleT = 0;
  let pteroTimer = 0;
  let message = "";
  let messageT = 0;
  let lavaAnim = 0;

  const keys = Object.create(null);
  let leftHeld = false;
  let rightHeld = false;
  let flapHeld = false;
  let flapPulse = false; // one flap this frame

  // ── Physics constants (arcade-paced) ─────────────────────────────────────
  const GRAV = 480;
  const FLAP_VY = -195;
  const MAX_FALL = 300;
  const MAX_RISE = -260;
  const ACCEL_X = 360;
  const MAX_VX = 185;
  const GROUND_FRIC = 0.82;
  const AIR_DRAG = 0.995;
  const RIDER_R = 10; // collision / sprite scale

  // ── HUD ──────────────────────────────────────────────────────────────────
  function hud() {
    if ($score) $score.textContent = pad(score);
    if ($high) $high.textContent = pad(high);
    if ($wave) $wave.textContent = String(wave);
    if ($lives) {
      let s = "";
      for (let i = 0; i < Math.max(0, lives); i++) s += "▲";
      $lives.textContent = s || "—";
    }
  }

  function addScore(n) {
    score += n;
    if (score > high) {
      high = score;
      try {
        localStorage.setItem("joust_hi_v1", String(high));
      } catch (_) {}
    }
    while (score >= (extrasAt + 1) * 20000) {
      extrasAt++;
      lives++;
      sfx("extra");
      flashMsg("EXTRA MOUNT!", 1500);
    }
    hud();
  }

  function showOV(title, sub, hint) {
    if (!overlay) return;
    overlay.classList.remove("hidden");
    if ($title) $title.textContent = title;
    if ($sub) $sub.textContent = sub || "";
    if ($hint) $hint.textContent = hint || "";
  }
  function hideOV() {
    if (overlay) overlay.classList.add("hidden");
  }
  function flashMsg(t, ms) {
    message = t;
    messageT = ms;
  }

  // ── Collision helpers ────────────────────────────────────────────────────
  function solidAt(x, y, r) {
    // feet / body against platform tops
    for (const p of PLATFORMS) {
      if (x + r > p.x && x - r < p.x + p.w && y + r > p.y && y + r < p.y + 12 && y < p.y + 4) {
        return p;
      }
    }
    return null;
  }

  function onLava(x, y) {
    for (const L of LAVA) {
      if (x > L.x && x < L.x + L.w && y > L.y - 8) return true;
    }
    // also between bottom platforms at ground level
    if (y > VH - 36) {
      let onPlat = false;
      for (const p of PLATFORMS) {
        if (p.y >= VH - 50 && x >= p.x && x <= p.x + p.w) onPlat = true;
      }
      if (!onPlat && y > VH - 28) return true;
    }
    return false;
  }

  // ── Entities ─────────────────────────────────────────────────────────────
  function spawnPlayer(safe) {
    player = {
      x: VW * 0.5,
      y: VH - 200,
      vx: 0,
      vy: 0,
      face: 1,
      alive: true,
      flapFrame: 0,
      walkPhase: 0,
      onGround: false,
      grab: null,
    };
    if (safe) {
      // sit on center bottom platform
      player.x = 480;
      player.y = VH - 64;
      player.vy = 0;
      player.onGround = true;
    }
    invuln = 2000;
  }

  function enemyTypeForWave(w, i) {
    // Bounder → Hunter → Shadow Lord mix ramps
    if (w <= 1) return "bounder";
    if (w === 2) return i % 3 === 0 ? "hunter" : "bounder";
    if (w === 3) return i % 2 === 0 ? "hunter" : "bounder";
    if (w < 6) {
      const r = i % 5;
      if (r === 0) return "shadow";
      if (r < 3) return "hunter";
      return "bounder";
    }
    const r = i % 4;
    if (r === 0) return "shadow";
    if (r < 3) return "hunter";
    return "bounder";
  }

  function makeEnemy(type, x, y) {
    return {
      type,
      x,
      y,
      vx: chance(0.5) ? 60 : -60,
      vy: 0,
      face: 1,
      alive: true,
      flapT: rnd(0, 200),
      flapFrame: 0,
      walkPhase: 0,
      aiT: rnd(200, 800),
      onGround: false,
      grab: null,
      id: Math.random(),
    };
  }

  function enemyPoints(type) {
    if (type === "bounder") return 500;
    if (type === "hunter") return 750;
    if (type === "shadow") return 1500;
    return 500;
  }

  function beginWave(n) {
    wave = n;
    enemies = [];
    eggs = [];
    ptero = null;
    hands = [];
    pteroTimer = 45000 - Math.min(20000, n * 2000);
    idleT = 0;

    const count = Math.min(4 + n, 12);
    // Spawn across platforms / mid air — NOT all stuck at the ceiling
    const spawnSpots = [
      { x: 120, y: VH - 200 },
      { x: 480, y: VH - 220 },
      { x: 820, y: VH - 200 },
      { x: 280, y: VH - 340 },
      { x: 680, y: VH - 340 },
      { x: 480, y: VH - 440 },
      { x: 60, y: VH - 100 },
      { x: 900, y: VH - 100 },
      { x: 200, y: VH - 280 },
      { x: 760, y: VH - 280 },
      { x: 400, y: VH - 150 },
      { x: 560, y: VH - 150 },
    ];
    for (let i = 0; i < count; i++) {
      const type = enemyTypeForWave(n, i);
      const spot = spawnSpots[i % spawnSpots.length];
      const e = makeEnemy(type, spot.x + rnd(-20, 20), spot.y + rnd(-10, 10));
      e.vy = rnd(20, 80); // start falling into the arena
      enemies.push(e);
    }

    state = "wave";
    waveT = 1600;
    showOV("WAVE " + wave, "PREPARE TO JOUST", "");
    sfx("wave");
    hud();
  }

  function beginGame() {
    unlockAudio();
    score = 0;
    lives = 3;
    wave = 1;
    extrasAt = 0;
    particles = [];
    spawnPlayer(true);
    beginWave(1);
    sfx("start");
  }

  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 200 + Math.random() * 400,
        color,
        size: 1 + ((Math.random() * 2) | 0),
      });
    }
  }

  function killPlayer() {
    if (!player || !player.alive || invuln > 0) return;
    burst(player.x, player.y, C.yellow, 16);
    burst(player.x, player.y, C.white, 8);
    sfx("die");
    player.alive = false;
    lives--;
    hud();
    state = "die";
    dieT = 1600;
  }

  function defeatEnemy(e) {
    if (!e.alive) return;
    e.alive = false;
    addScore(enemyPoints(e.type));
    sfx("kill");
    burst(e.x, e.y, e.type === "hunter" ? C.hunter : e.type === "shadow" ? C.shadow : C.bounder, 12);
    // drop egg
    eggs.push({
      x: e.x,
      y: e.y,
      vx: e.vx * 0.3,
      vy: -40,
      life: 8000, // hatch timer
      onGround: false,
      id: Math.random(),
    });
  }

  function collectEgg(egg) {
    egg.dead = true;
    addScore(250);
    sfx("egg");
    burst(egg.x, egg.y, C.egg, 8);
  }

  function hatchEgg(egg) {
    egg.dead = true;
    sfx("hatch");
    // remount as bounder near egg
    const type = wave >= 4 ? (chance(0.4) ? "hunter" : "bounder") : "bounder";
    enemies.push(makeEnemy(type, egg.x, egg.y - 20));
    burst(egg.x, egg.y, C.white, 6);
  }

  // ── Physics step for a rider ─────────────────────────────────────────────
  function stepRider(r, dt, isPlayer) {
    if (!r.alive || r.grab) return;

    // horizontal control
    if (isPlayer) {
      if (leftHeld || keys.ArrowLeft || keys.KeyA || keys.a) {
        r.face = -1;
        r.vx -= ACCEL_X * (dt / 1000);
      }
      if (rightHeld || keys.ArrowRight || keys.KeyD || keys.d) {
        r.face = 1;
        r.vx += ACCEL_X * (dt / 1000);
      }
      if (flapPulse || (flapHeld && Math.random() < 0.15)) {
        // continuous flap while held is slightly weaker spam
      }
      if (flapPulse) {
        r.vy = Math.min(r.vy, 0) + FLAP_VY;
        r.flapFrame = 1;
        sfx("flap");
      }
    } else {
      // AI: only flap when needed (too low, falling hard, or climbing to fight)
      r.flapT -= dt;
      if (r.flapT <= 0) {
        r.flapT = r.type === "shadow" ? rnd(140, 280) : r.type === "hunter" ? rnd(180, 360) : rnd(220, 480);
        const wantHeight =
          r.type === "shadow" ? VH * 0.28 : r.type === "hunter" ? VH * 0.42 : VH * 0.5;
        const tooLow = r.y > wantHeight + 40;
        const fallingFast = r.vy > 90;
        const nearFloor = r.y > VH - 140;
        if (tooLow || fallingFast || nearFloor || chance(0.25)) {
          r.vy = Math.min(r.vy, 40) + FLAP_VY * (r.type === "shadow" ? 0.95 : 0.88);
          r.flapFrame = 1;
        }
        // If too high, skip flapping so gravity brings them down
        if (r.y < 90) {
          r.flapT = rnd(200, 400);
        }
      }
    }

    r.vx = clamp(r.vx, -MAX_VX, MAX_VX);
    r.vy += GRAV * (dt / 1000);
    r.vy = clamp(r.vy, MAX_RISE, MAX_FALL);
    if (!r.onGround) r.vx *= Math.pow(AIR_DRAG, dt / 16);
    else r.vx *= Math.pow(GROUND_FRIC, dt / 16);

    r.x = wrapX(r.x + r.vx * (dt / 1000));
    r.y += r.vy * (dt / 1000);

    // ceiling — soft bounce down, don't pin riders at top
    if (r.y < 50) {
      r.y = 50;
      r.vy = Math.max(60, Math.abs(r.vy) * 0.5);
    }

    // platforms
    r.onGround = false;
    const foot = r.y + RIDER_R;
    for (const p of PLATFORMS) {
      if (r.x > p.x - 6 && r.x < p.x + p.w + 6) {
        // land on top
        if (r.vy >= 0 && foot >= p.y && foot <= p.y + 16 && r.y < p.y + 10) {
          r.y = p.y - RIDER_R;
          r.vy = 0;
          r.onGround = true;
        }
        // hit underside lightly
        if (
          r.vy < 0 &&
          r.y - RIDER_R < p.y + p.h &&
          r.y - RIDER_R > p.y &&
          foot > p.y + p.h
        ) {
          r.y = p.y + p.h + RIDER_R;
          r.vy = 30;
        }
      }
    }

    // Walking leg cycle when moving on a surface
    if (r.onGround && Math.abs(r.vx) > 10) {
      // Faster phase = clearer walk cycle
      r.walkPhase = (r.walkPhase || 0) + Math.abs(r.vx) * (dt / 1000) * 0.14;
    } else if (!r.onGround) {
      r.walkPhase = 0;
    }

    // lava
    if (onLava(r.x, r.y + 10)) {
      if (isPlayer) {
        sfx("lava");
        // troll grab
        hands.push({ x: r.x, y: VH - 20, life: 500, target: r });
        r.grab = 400;
        r.vy = 40;
      } else {
        // enemy dies in lava
        eDefeatSilent(r);
      }
    }

    if (r.flapFrame > 0) r.flapFrame -= dt / 80;
  }

  function eDefeatSilent(e) {
    e.alive = false;
    burst(e.x, e.y, C.lava, 8);
  }

  // ── AI ───────────────────────────────────────────────────────────────────
  function updateEnemyAI(e, dt) {
    if (!e.alive || e.grab) return;
    e.aiT -= dt;
    if (e.aiT > 0) return;
    e.aiT = e.type === "bounder" ? rnd(350, 800) : rnd(220, 500);

    if (!player || !player.alive) {
      e.vx = (chance(0.5) ? 1 : -1) * (50 + wave * 4);
      e.face = Math.sign(e.vx) || 1;
      return;
    }

    const dx = wrapDelta(e.x, player.x);
    if (e.type === "bounder") {
      if (chance(0.4)) e.vx = Math.sign(dx || 1) * (55 + wave * 3);
      else e.vx = (chance(0.5) ? 1 : -1) * (50 + wave * 2);
    } else if (e.type === "hunter") {
      e.vx = Math.sign(dx || 1) * (70 + wave * 4);
      // Prefer being slightly above player — flap only if clearly below
      if (e.y > player.y + 30) e.flapT = Math.min(e.flapT, 40);
    } else if (e.type === "shadow") {
      e.vx = Math.sign(dx || 1) * (90 + wave * 5);
      // Shadow lords prefer mid-high, not ceiling-camping
      if (e.y > VH * 0.35) e.flapT = Math.min(e.flapT, 50);
      if (e.y < 100) e.flapT = rnd(300, 500); // force coast downward
    }
    e.face = Math.sign(e.vx) || 1;
  }

  // ── Combat ───────────────────────────────────────────────────────────────
  function lanceY(r) {
    // lance roughly at rider torso height
    return r.y - 2;
  }

  function tryClash(a, b) {
    if (!a.alive || !b.alive) return;
    const dx = Math.abs(wrapDelta(a.x, b.x));
    const dy = Math.abs(a.y - b.y);
    if (dx > 22 || dy > 20) return;

    const ay = lanceY(a);
    const by = lanceY(b);
    const diff = by - ay; // positive if a is higher (smaller y)

    if (Math.abs(ay - by) < 5) {
      // equal — bounce
      const dir = Math.sign(wrapDelta(a.x, b.x)) || 1;
      a.vx = -dir * 120;
      b.vx = dir * 120;
      a.vy = -40;
      b.vy = -40;
      sfx("bounce");
      return;
    }
    if (ay < by - 4) {
      // a higher — a wins
      if (a === player) defeatEnemy(b);
      else if (b === player) killPlayer();
      else {
        // enemy vs enemy rare
        defeatEnemy(b);
      }
    } else if (by < ay - 4) {
      if (b === player) defeatEnemy(a);
      else if (a === player) killPlayer();
      else defeatEnemy(a);
    }
  }

  // ── Pterodactyl ──────────────────────────────────────────────────────────
  function spawnPtero() {
    ptero = {
      x: chance(0.5) ? -40 : VW + 40,
      y: 100 + Math.random() * 200,
      vx: chance(0.5) ? 140 : -140,
      frame: 0,
      alive: true,
    };
    if (ptero.vx > 0) ptero.x = -40;
    else ptero.x = VW + 40;
    sfx("ptero");
    flashMsg("PTERODACTYL!", 1200);
  }

  // ── Update ───────────────────────────────────────────────────────────────
  function update(dt) {
    lavaAnim += dt;
    if (messageT > 0) messageT -= dt;
    if (invuln > 0) invuln -= dt;

    if (state === "title" || state === "over" || state === "pause") {
      flapPulse = false;
      return;
    }

    if (state === "wave") {
      waveT -= dt;
      updateParticles(dt);
      if (waveT <= 0) {
        state = "play";
        hideOV();
      }
      flapPulse = false;
      return;
    }

    if (state === "die") {
      dieT -= dt;
      updateParticles(dt);
      if (dieT <= 0) {
        if (lives <= 0) {
          state = "over";
          showOV("GAME OVER", "SCORE " + pad(score), "PRESS FLAP OR TAP");
        } else {
          spawnPlayer(true);
          state = "play";
          hideOV();
        }
      }
      flapPulse = false;
      return;
    }

    if (state === "clear") {
      clearT -= dt;
      updateParticles(dt);
      if (clearT <= 0) beginWave(wave + 1);
      flapPulse = false;
      return;
    }

    if (state !== "play") {
      flapPulse = false;
      return;
    }

    // Player grab by lava
    if (player && player.grab) {
      player.grab -= dt;
      player.y += 40 * (dt / 1000);
      if (player.grab <= 0) {
        killPlayer();
      }
      flapPulse = false;
      updateParticles(dt);
      return;
    }

    stepRider(player, dt, true);
    flapPulse = false;

    // Enemies
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.grab) {
        e.grab -= dt;
        e.y += 50 * (dt / 1000);
        if (e.grab <= 0) eDefeatSilent(e);
        continue;
      }
      updateEnemyAI(e, dt);
      stepRider(e, dt, false);
      if (player && player.alive && invuln <= 0) tryClash(player, e);
    }
    enemies = enemies.filter((e) => e.alive);

    // Eggs
    for (const egg of eggs) {
      if (egg.dead) continue;
      egg.vy += GRAV * 0.9 * (dt / 1000);
      egg.x = wrapX(egg.x + egg.vx * (dt / 1000));
      egg.y += egg.vy * (dt / 1000);
      egg.vx *= 0.99;
      // land
      let landed = false;
      for (const p of PLATFORMS) {
        if (egg.x > p.x && egg.x < p.x + p.w && egg.y + 6 >= p.y && egg.y < p.y + 10 && egg.vy > 0) {
          egg.y = p.y - 6;
          egg.vy = -Math.abs(egg.vy) * 0.35;
          egg.vx *= 0.6;
          if (Math.abs(egg.vy) < 40) {
            egg.vy = 0;
            egg.onGround = true;
          }
          landed = true;
        }
      }
      if (onLava(egg.x, egg.y)) {
        egg.dead = true;
        burst(egg.x, egg.y, C.lava, 5);
      }
      egg.life -= dt;
      if (egg.onGround && egg.life < 3500) {
        // hatch
        hatchEgg(egg);
      }
      // collect
      if (player && player.alive && Math.abs(wrapDelta(player.x, egg.x)) < 16 && Math.abs(player.y - egg.y) < 16) {
        collectEgg(egg);
      }
    }
    eggs = eggs.filter((e) => !e.dead);

    // Pterodactyl
    idleT += dt;
    pteroTimer -= dt;
    if (!ptero && pteroTimer <= 0) {
      spawnPtero();
      pteroTimer = 35000;
    }
    if (ptero && ptero.alive) {
      ptero.x += ptero.vx * (dt / 1000);
      ptero.frame += dt;
      // gentle vertical weave
      ptero.y += Math.sin(ptero.frame / 200) * 0.4;
      if (ptero.x < -80 || ptero.x > VW + 80) {
        // reverse pass
        ptero.vx *= -1;
        ptero.y = 80 + Math.random() * 220;
      }
      if (player && player.alive && invuln <= 0) {
        if (Math.abs(wrapDelta(player.x, ptero.x)) < 28 && Math.abs(player.y - ptero.y) < 16) {
          // hit open mouth? rare — mostly die
          if (chance(0.08) && player.y < ptero.y + 4) {
            // lucky spear
            ptero.alive = false;
            addScore(1000);
            sfx("kill");
            burst(ptero.x, ptero.y, C.ptero, 20);
            flashMsg("PTERODACTYL DEFEATED!", 1500);
          } else {
            killPlayer();
          }
        }
      }
    }
    if (ptero && !ptero.alive) ptero = null;

    // Hands cleanup
    for (const h of hands) h.life -= dt;
    hands = hands.filter((h) => h.life > 0);

    // Wave clear
    if (enemies.length === 0 && eggs.length === 0) {
      state = "clear";
      clearT = 1800;
      showOV("WAVE " + wave, "COMPLETED", "");
      sfx("wave");
    }

    updateParticles(dt);
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
  }

  // ── Draw — Williams-style arena + animated walk cycle ───────────────────
  function fillRect(x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  }

  function oval(x, y, rx, ry, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.4, rx), Math.max(0.4, ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function rockShelf(p) {
    const { x, y, w, h } = p;
    const ground = p.kind === "ground";
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + 6);
    const steps = Math.max(4, (w / 28) | 0);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x + t * w;
      const jag = Math.sin(i * 1.7 + x * 0.01) * (ground ? 3 : 2.5);
      ctx.lineTo(px, y + jag + (i === 0 || i === steps ? 2 : 0));
    }
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, C.rockLt);
    g.addColorStop(0.35, C.rock);
    g.addColorStop(1, C.rockDk);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = C.rockRim;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x + t * w;
      const jag = Math.sin(i * 1.7 + x * 0.01) * (ground ? 3 : 2.5);
      if (i === 0) ctx.moveTo(px, y + jag);
      else ctx.lineTo(px, y + jag);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x + 4, y + h - 2, w - 8, 4);
    ctx.strokeStyle = "rgba(60,20,8,0.45)";
    ctx.lineWidth = 1;
    for (let i = 16; i < w - 12; i += 22) {
      ctx.beginPath();
      ctx.moveTo(x + i, y + 6);
      ctx.lineTo(x + i + 6, y + h * 0.55);
      ctx.stroke();
    }
    for (let i = 10; i < w - 10; i += 18) {
      oval(x + i, y + h * 0.4, 2.2, 1.3, C.rockMid);
    }
  }

  function drawBackground() {
    fillRect(0, 0, VW, VH, C.sky);
    const haze = ctx.createLinearGradient(0, VH * 0.55, 0, VH);
    haze.addColorStop(0, "rgba(40,10,30,0)");
    haze.addColorStop(0.7, "rgba(50,12,20,0.25)");
    haze.addColorStop(1, "rgba(80,20,10,0.4)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 35; i++) {
      const sx = (i * 89 + 13) % VW;
      const sy = 12 + ((i * 47) % (VH * 0.55));
      ctx.globalAlpha = 0.25 + (i % 4) * 0.1;
      oval(sx, sy, 0.7, 0.7, "#c8b8a0");
    }
    ctx.globalAlpha = 1;
  }

  function drawLava() {
    const pulse = 0.5 + 0.5 * Math.sin(lavaAnim / 130);
    fillRect(0, VH - 22, VW, 22, "#1a0500");
    for (const L of LAVA) {
      const glow = ctx.createRadialGradient(
        L.x + L.w / 2, L.y + 8, 4,
        L.x + L.w / 2, L.y + 10, L.w * 0.7
      );
      glow.addColorStop(0, "rgba(255,160,0,0.35)");
      glow.addColorStop(1, "rgba(255,40,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(L.x - 20, L.y - 30, L.w + 40, L.h + 40);
      const lg = ctx.createLinearGradient(0, L.y, 0, VH);
      lg.addColorStop(0, C.lavaCore);
      lg.addColorStop(0.2, C.lavaHot);
      lg.addColorStop(0.55, C.lava);
      lg.addColorStop(1, "#400800");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(L.x, L.y + 6);
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        ctx.lineTo(
          L.x + t * L.w,
          L.y + Math.sin(t * Math.PI * 3 + lavaAnim / 100) * 3 * pulse
        );
      }
      ctx.lineTo(L.x + L.w, VH);
      ctx.lineTo(L.x, VH);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const bx = L.x + 8 + ((lavaAnim / 35 + i * 14) % (L.w - 16));
        const by = L.y + 8 + ((i * 7 + lavaAnim / 50) % 18);
        oval(bx, by, 2 + (i % 2), 1.5, C.lavaCore);
      }
    }
  }

  function drawPlatforms() {
    for (const p of PLATFORMS) {
      if (p.kind !== "ground") rockShelf(p);
    }
    for (const p of PLATFORMS) {
      if (p.kind === "ground") rockShelf(p);
    }
  }

  // ── Detailed smooth sprites (HD remake quality, not 8-bit blocks) ────────
  function shade(base, amt) {
    // simple lighten/darken for #rrggbb
    if (!base || base[0] !== "#" || base.length < 7) return base;
    const n = parseInt(base.slice(1), 16);
    let r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    r = Math.max(0, Math.min(255, r + amt));
    g = Math.max(0, Math.min(255, g + amt));
    b = Math.max(0, Math.min(255, b + amt));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function ell(x, y, rx, ry, col) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.3, rx), Math.max(0.3, ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function gradEll(x, y, rx, ry, c0, c1, ang) {
    const g = ctx.createLinearGradient(
      x - Math.cos(ang || 0) * rx,
      y - Math.sin(ang || 0) * ry,
      x + Math.cos(ang || 0) * rx,
      y + Math.sin(ang || 0) * ry
    );
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function limb(x0, y0, x1, y1, thick, col) {
    ctx.strokeStyle = col;
    ctx.lineWidth = thick;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  function drawBirdLegs(r, walking) {
    const legCol = "#f0d040";
    const darkLeg = "#c0a020";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (!walking) {
      // Flight pose — legs swept back, bent
      limb(-4, 5, -7, 9, 2.2, legCol);
      limb(-7, 9, -9, 11, 2, darkLeg);
      limb(3, 5, 6, 9, 2.2, legCol);
      limb(6, 9, 8, 11, 2, darkLeg);
      // toes
      ell(-9, 11.5, 2.5, 1.1, legCol);
      ell(8, 11.5, 2.5, 1.1, legCol);
      return;
    }

    const phase = r.walkPhase || 0;
    const a = Math.sin(phase * Math.PI * 2);
    const b = Math.sin(phase * Math.PI * 2 + Math.PI);

    function walkLeg(hipX, swing, lift) {
      const kneeX = hipX + swing * 0.5;
      const kneeY = 7.5 - lift;
      const footX = hipX + swing * 1.05;
      const footY = 12.5 - lift * 0.2;
      // thigh
      limb(hipX, 4.5, kneeX, kneeY, 2.4, legCol);
      // shin
      limb(kneeX, kneeY, footX, footY, 2.1, darkLeg);
      // foot + toes
      ctx.strokeStyle = legCol;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(footX - 2.5, footY);
      ctx.lineTo(footX + 3.5, footY + 0.3);
      ctx.stroke();
      ell(footX + 2, footY + 0.2, 1.2, 0.7, legCol);
    }

    walkLeg(-3.5, a * 6, Math.max(0, -a) * 3.5);
    walkLeg(3.5, b * 6, Math.max(0, -b) * 3.5);
  }

  /**
   * High-detail mount + knight (smooth HD remake, still readable as Joust).
   */
  function drawRider(r, color, dark, wingCol) {
    if (!r.alive) return;
    const f = r.face;
    const flap = r.flapFrame > 0;
    const walking = !!(r.onGround && Math.abs(r.vx) > 8);
    const s = 1.2;

    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.scale(f * s, s);

    const mid = wingCol || shade(color, 30);
    const hi = shade(color, 55);
    const lo = dark || shade(color, -40);

    // ── Tail feathers ──
    ctx.fillStyle = lo;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-16, -2, -18, 2);
    ctx.quadraticCurveTo(-14, 5, -9, 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-10, 2);
    ctx.quadraticCurveTo(-15, 4, -17, 7);
    ctx.quadraticCurveTo(-12, 6, -8, 4);
    ctx.closePath();
    ctx.fill();

    // ── Body (smooth shaded ellipse stack) ──
    gradEll(0, 1.5, 10, 6.5, hi, lo, -0.4);
    gradEll(-6, 2.5, 5.5, 4.5, mid, lo, 0.5);
    gradEll(3, 1, 5, 4.5, hi, mid, -0.8);
    // belly
    ell(1, 4, 6, 3, shade(color, 20));

    // ── Neck (long S-curve, classic ostrich profile) ──
    ctx.strokeStyle = color;
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.bezierCurveTo(9, -4, 10, -9, 12, -12);
    ctx.stroke();
    ctx.strokeStyle = hi;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6.5, -0.5);
    ctx.bezierCurveTo(9, -4.5, 10.5, -9, 12, -11.5);
    ctx.stroke();

    // ── Head ──
    gradEll(13.5, -13, 5, 3.8, hi, lo, 0.3);
    // beak
    ctx.fillStyle = C.yellow;
    ctx.beginPath();
    ctx.moveTo(17, -13.5);
    ctx.lineTo(23, -12.2);
    ctx.lineTo(17, -10.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(C.yellow, -30);
    ctx.beginPath();
    ctx.moveTo(17, -12);
    ctx.lineTo(22, -12.2);
    ctx.lineTo(17, -11);
    ctx.closePath();
    ctx.fill();
    // eye with highlight
    ell(13.5, -14, 1.4, 1.4, "#1a1a1a");
    ell(14, -14.4, 0.55, 0.55, "#ffffff");
    ell(13.2, -13.6, 0.35, 0.35, "#444");

    // ── Wing ──
    if (flap) {
      // raised wing, feather layers
      ctx.fillStyle = lo;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.quadraticCurveTo(-8, -10, -2, -15);
      ctx.quadraticCurveTo(6, -14, 8, -8);
      ctx.quadraticCurveTo(4, -4, 0, 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = mid;
      ctx.beginPath();
      ctx.moveTo(-2, -1);
      ctx.quadraticCurveTo(-5, -9, 0, -13);
      ctx.quadraticCurveTo(5, -12, 6, -7);
      ctx.quadraticCurveTo(2, -3, 0, 0);
      ctx.closePath();
      ctx.fill();
      // feather tips
      ctx.strokeStyle = shade(color, -20);
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-1 + i, -6 - i);
        ctx.lineTo(-4 + i * 1.5, -12 - i);
        ctx.stroke();
      }
    } else if (r.onGround) {
      // folded wing
      gradEll(-3, 2, 7, 3.2, mid, lo, 0.2);
      ell(-1, 3, 4, 1.8, lo);
    } else {
      // glide
      ctx.fillStyle = lo;
      ctx.beginPath();
      ctx.moveTo(-5, 2);
      ctx.quadraticCurveTo(-10, 6, -4, 9);
      ctx.quadraticCurveTo(4, 8, 6, 4);
      ctx.quadraticCurveTo(2, 3, -2, 2);
      ctx.closePath();
      ctx.fill();
      ell(-2, 4, 5, 2, mid);
    }

    // ── Legs ──
    drawBirdLegs(r, walking);

    // ── KNIGHT (detailed humanoid, seated) ──
    const armor = "#e8e8f0";
    const armorDk = "#9a9aaa";
    const armorHi = "#ffffff";
    const leather = "#6a5040";

    // Saddle
    ell(0, -2, 5, 2.2, leather);
    ell(0, -2.5, 3.5, 1.2, shade(leather, 25));

    // Dangling legs (straddling saddle) — human proportions
    limb(-2.5, -3, -4, 2, 2.3, armor);
    limb(2.5, -3, 4.5, 2, 2.3, armor);
    // boots
    ell(-4.5, 2.5, 2.2, 1.4, "#4a4038");
    ell(5, 2.5, 2.2, 1.4, "#4a4038");
    ell(-5, 2.8, 1.2, 0.7, "#2a2420");
    ell(5.5, 2.8, 1.2, 0.7, "#2a2420");

    // Torso (armor breastplate — wider shoulders, tapered waist)
    ctx.fillStyle = armor;
    ctx.beginPath();
    ctx.moveTo(-4.5, -6);
    ctx.lineTo(-5, -12);
    ctx.lineTo(-2, -14);
    ctx.lineTo(2.5, -14);
    ctx.lineTo(5, -12);
    ctx.lineTo(4.5, -6);
    ctx.lineTo(2, -5);
    ctx.lineTo(-2, -5);
    ctx.closePath();
    ctx.fill();
    // chest highlight
    ctx.fillStyle = armorHi;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(-2, -12);
    ctx.lineTo(0.5, -13);
    ctx.lineTo(1, -7);
    ctx.lineTo(-1.5, -7);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // belt
    fillRect(-4, -6.5, 8.5, 1.5, leather);
    ell(0, -5.7, 1.2, 1, C.yellow);

    // Back arm
    limb(-4.5, -11, -7, -7, 2.2, armor);
    ell(-7.2, -6.5, 1.5, 1.5, armor);

    // Forward arm holding lance
    limb(4, -11.5, 8, -11, 2.3, armor);
    ell(8.5, -11, 1.6, 1.6, armor);

    // ── Head / helmet (NOT an egg: clear helm profile) ──
    // neck
    fillRect(-1, -15, 2.5, 2, armorDk);
    // helm dome
    gradEll(0.5, -17.5, 3.6, 3.8, armorHi, armorDk, 1.2);
    // face plate / visor area
    ell(1.2, -17, 2.2, 2.4, armorDk);
    // visor slit
    fillRect(-0.5, -17.5, 3.2, 1.1, "#1a1a22");
    fillRect(0, -17.3, 2.4, 0.4, "#445");
    // cheek guards
    ell(-2.2, -16.5, 1.3, 2, armor);
    ell(3.2, -16.5, 1.3, 2, armor);
    // plume / crest
    let plume = C.yellow;
    if (color === C.hunter) plume = C.hunter;
    else if (color === C.shadow) plume = "#8080ff";
    else if (color === C.bounder) plume = "#a0e050";
    ctx.fillStyle = plume;
    ctx.beginPath();
    ctx.moveTo(0, -20.5);
    ctx.quadraticCurveTo(-1.5, -24, 0.5, -26);
    ctx.quadraticCurveTo(2.5, -24, 1.5, -20.5);
    ctx.closePath();
    ctx.fill();
    ell(0.5, -21, 1.5, 1, shade(plume, 40));

    // ── Lance (long spear — defining Joust look) ──
    const lanceGrad = ctx.createLinearGradient(8, -12, 28, -13);
    lanceGrad.addColorStop(0, "#c8c8d0");
    lanceGrad.addColorStop(0.5, "#f0f0f8");
    lanceGrad.addColorStop(1, "#a0a0a8");
    ctx.strokeStyle = lanceGrad;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(8, -11.2);
    ctx.lineTo(26, -12.5);
    ctx.stroke();
    // spear tip
    ctx.fillStyle = C.yellow;
    ctx.beginPath();
    ctx.moveTo(25, -13.8);
    ctx.lineTo(30, -12.5);
    ctx.lineTo(25, -11.2);
    ctx.closePath();
    ctx.fill();
    // hand grip
    ell(8.5, -11, 1.8, 1.5, armor);

    ctx.restore();
  }


  function drawEgg(egg) {
    const g = ctx.createRadialGradient(egg.x - 1, egg.y - 2, 1, egg.x, egg.y, 7);
    g.addColorStop(0, "#80ff80");
    g.addColorStop(0.5, C.egg);
    g.addColorStop(1, "#206020");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(egg.x, egg.y, 5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(egg.x - 1, egg.y - 2, 2, 2.5, -0.4, 0, Math.PI);
    ctx.stroke();
  }

  function drawPtero() {
    if (!ptero || !ptero.alive) return;
    const flap = Math.sin(ptero.frame / 100) > 0;
    ctx.save();
    ctx.translate(ptero.x, ptero.y);
    if (ptero.vx < 0) ctx.scale(-1, 1);
    // body
    gradEll(0, 0, 15, 5.5, "#d8b090", "#806050", 0.4);
    // head
    gradEll(13, -1, 7, 3.5, "#d0a880", "#705040", 0.2);
    // jaws
    ctx.fillStyle = "#f0e0d0";
    ctx.beginPath();
    ctx.moveTo(18, -2);
    ctx.lineTo(28, -1);
    ctx.lineTo(18, 1);
    ctx.closePath();
    ctx.fill();
    fillRect(19, -0.8, 7, 1.2, "#401818");
    ell(15, -2, 1.2, 1.2, "#101010");
    // wings
    ctx.fillStyle = C.pteroWing;
    if (flap) {
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.quadraticCurveTo(-18, -14, -2, -16);
      ctx.quadraticCurveTo(8, -10, 6, -2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.quadraticCurveTo(12, -12, 20, -8);
      ctx.quadraticCurveTo(10, -2, 4, 1);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-4, 1);
      ctx.quadraticCurveTo(-18, 10, -2, 12);
      ctx.quadraticCurveTo(6, 6, 4, 1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, 1);
      ctx.quadraticCurveTo(14, 10, 20, 6);
      ctx.quadraticCurveTo(10, 2, 4, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawHands() {
    for (const h of hands) {
      const g = ctx.createRadialGradient(h.x, h.y, 2, h.x, h.y, 14);
      g.addColorStop(0, "#ff9060");
      g.addColorStop(1, "#a03018");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = -2; i <= 2; i++) {
        ell(h.x + i * 3.8, h.y - 11 - Math.abs(i) * 0.5, 1.8, 5, "#e07050");
        ell(h.x + i * 3.8, h.y - 15 - Math.abs(i), 1.3, 1.5, "#ffb080");
      }
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / 400, 0, 1);
      oval(p.x, p.y, (p.size || 2) * 0.55, (p.size || 2) * 0.55, p.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawMessages() {
    if (messageT > 0 && message) {
      ctx.fillStyle = C.yellow;
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(message, VW / 2, VH * 0.36);
    }
  }

  function render() {
    // Draw in logical space at SCALE× resolution for smooth HD look
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.imageSmoothingEnabled = true;
    try {
      ctx.imageSmoothingQuality = "high";
    } catch (_) {}
    drawBackground();
    drawLava();
    drawPlatforms();
    drawHands();
    for (const egg of eggs) if (!egg.dead) drawEgg(egg);
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.type === "hunter") drawRider(e, C.hunter, C.hunterDk, "#ff6860");
      else if (e.type === "shadow") drawRider(e, C.shadow, C.shadowDk, "#7878e8");
      else drawRider(e, C.bounder, C.bounderDk, "#90c060");
    }
    if (player && player.alive) {
      if (!(invuln > 0 && ((invuln / 70) | 0) % 2 === 0)) {
        drawRider(player, C.player, C.playerDk, C.playerWing);
      }
    }
    drawPtero();
    drawParticles();
    drawMessages();
  }


  // ── Loop ─────────────────────────────────────────────────────────────────
  let last = 0;
  function tick(ts) {
    if (!last) last = ts;
    let dt = ts - last;
    last = ts;
    if (dt > 50) dt = 50;
    try {
      update(dt);
      render();
    } catch (err) {
      console.error(err);
      showOV("ERROR", String(err.message || err).slice(0, 40), "RELOAD");
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ── Input ────────────────────────────────────────────────────────────────
  function startOrFlap() {
    unlockAudio();
    if (state === "title" || state === "over") beginGame();
    else if (state === "pause") {
      state = "play";
      hideOV();
    } else if (state === "play") {
      flapPulse = true;
    }
  }

  window.addEventListener(
    "keydown",
    (e) => {
      keys[e.code] = true;
      keys[e.key] = true;
      if (["ArrowLeft", "ArrowRight", " ", "ArrowUp"].includes(e.key)) e.preventDefault();
      unlockAudio();
      if (e.key === "m" || e.key === "M") {
        muted = !muted;
        return;
      }
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        if (state === "play") {
          state = "pause";
          showOV("PAUSED", "PRESS P OR FLAP", "");
        } else if (state === "pause") {
          state = "play";
          hideOV();
        }
        return;
      }
      if (e.code === "Space" || e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        startOrFlap();
        flapHeld = true;
      }
    },
    { passive: false }
  );
  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
    keys[e.key] = false;
    if (e.code === "Space" || e.key === " " || e.key === "ArrowUp") flapHeld = false;
  });

  function bindBtn(id, down, up) {
    const el = document.getElementById(id);
    if (!el) return;
    const d = (ev) => {
      ev.preventDefault();
      unlockAudio();
      down();
    };
    const u = (ev) => {
      ev.preventDefault();
      if (up) up();
    };
    el.addEventListener("pointerdown", d);
    el.addEventListener("pointerup", u);
    el.addEventListener("pointerleave", u);
    el.addEventListener("pointercancel", u);
  }

  bindBtn("btn-left", () => (leftHeld = true), () => (leftHeld = false));
  bindBtn("btn-right", () => (rightHeld = true), () => (rightHeld = false));
  bindBtn(
    "btn-flap",
    () => {
      flapHeld = true;
      startOrFlap();
    },
    () => {
      flapHeld = false;
    }
  );
  bindBtn(
    "btn-pause",
    () => {
      if (state === "play") {
        state = "pause";
        showOV("PAUSED", "TAP FLAP TO RESUME", "");
      } else if (state === "pause") {
        state = "play";
        hideOV();
      } else if (state === "title" || state === "over") beginGame();
    },
    () => {}
  );
  bindBtn(
    "btn-mute",
    () => {
      muted = !muted;
    },
    () => {}
  );

  // Tap canvas to flap / start
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    startOrFlap();
  });

  if (overlay) {
    overlay.addEventListener("click", () => startOrFlap());
  }

  // Resize canvas CSS is handle by CSS object-fit; logical size fixed
  hud();
  if ($high) $high.textContent = pad(high);
  showOV("JOUST", "INSERT COIN", "PRESS SPACE / FLAP OR TAP TO START");
})();
