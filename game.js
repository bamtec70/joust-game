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

  // Logical playfield (classic landscape ratio ~19:11 arcade-ish)
  const VW = 960;
  const VH = 540;
  const SCALE = 2;
  canvas.width = VW * SCALE;
  canvas.height = VH * SCALE;
  ctx.imageSmoothingEnabled = false;

  const overlay = document.getElementById("overlay");
  const $title = document.getElementById("overlay-title");
  const $sub = document.getElementById("overlay-sub");
  const $hint = document.getElementById("overlay-hint");
  const $score = document.getElementById("score");
  const $high = document.getElementById("high-score");
  const $wave = document.getElementById("wave");
  const $lives = document.getElementById("lives");

  // ── Colors (Williams-ish warm rock / lava) ───────────────────────────────
  const C = {
    black: "#000000",
    sky: "#000010",
    rock: "#c07040",
    rockDk: "#804020",
    rockLt: "#e0a060",
    lava: "#ff4000",
    lavaHot: "#ffcc00",
    yellow: "#ffe040",
    player: "#ffe020",
    playerDk: "#c0a000",
    white: "#ffffff",
    bounder: "#d0d0e0",
    hunter: "#ff4040",
    shadow: "#8060ff",
    egg: "#40e040",
    ptero: "#c0a080",
    hand: "#ff8060",
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

  // ── Platforms (classic-ish Joust layout, logical coords) ─────────────────
  // {x, y, w, h} solid tops
  const PLATFORMS = [
    // bottom island pieces with lava gaps
    { x: 0, y: VH - 48, w: 200, h: 48 },
    { x: 280, y: VH - 48, w: 400, h: 48 },
    { x: 760, y: VH - 48, w: 200, h: 48 },
    // mid floaters
    { x: 80, y: VH - 180, w: 160, h: 18 },
    { x: 400, y: VH - 200, w: 160, h: 18 },
    { x: 720, y: VH - 180, w: 160, h: 18 },
    // upper
    { x: 220, y: VH - 320, w: 140, h: 16 },
    { x: 600, y: VH - 320, w: 140, h: 16 },
    // top center perch
    { x: 380, y: VH - 420, w: 200, h: 16 },
  ];

  // Lava zones on bottom (between islands)
  const LAVA = [
    { x: 200, y: VH - 40, w: 80, h: 40 },
    { x: 680, y: VH - 40, w: 80, h: 40 },
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
  const GRAV = 520;
  const FLAP_VY = -210;
  const MAX_FALL = 320;
  const MAX_RISE = -280;
  const ACCEL_X = 380;
  const MAX_VX = 200;
  const GROUND_FRIC = 0.82;
  const AIR_DRAG = 0.995;

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
      onGround: false,
      grab: null,
    };
    if (safe) {
      // sit on center bottom platform
      player.x = 480;
      player.y = VH - 70;
      player.vy = 0;
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
    for (let i = 0; i < count; i++) {
      const type = enemyTypeForWave(n, i);
      // spawn near edges / upper air
      const side = i % 2 === 0 ? 40 : VW - 40;
      const ey = 80 + (i % 4) * 50;
      enemies.push(makeEnemy(type, side, ey));
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
      // AI flap
      r.flapT -= dt;
      if (r.flapT <= 0) {
        r.flapT = r.type === "shadow" ? rnd(80, 160) : r.type === "hunter" ? rnd(120, 220) : rnd(160, 320);
        r.vy = Math.min(r.vy, 0) + FLAP_VY * (r.type === "shadow" ? 1.05 : 0.95);
        r.flapFrame = 1;
      }
    }

    r.vx = clamp(r.vx, -MAX_VX, MAX_VX);
    r.vy += GRAV * (dt / 1000);
    r.vy = clamp(r.vy, MAX_RISE, MAX_FALL);
    if (!r.onGround) r.vx *= Math.pow(AIR_DRAG, dt / 16);
    else r.vx *= Math.pow(GROUND_FRIC, dt / 16);

    r.x = wrapX(r.x + r.vx * (dt / 1000));
    r.y += r.vy * (dt / 1000);

    // ceiling
    if (r.y < 40) {
      r.y = 40;
      r.vy = Math.max(0, r.vy);
    }

    // platforms
    r.onGround = false;
    const foot = r.y + 12;
    for (const p of PLATFORMS) {
      if (r.x > p.x - 4 && r.x < p.x + p.w + 4) {
        // land on top
        if (r.vy >= 0 && foot >= p.y && foot <= p.y + 14 && r.y < p.y + 8) {
          r.y = p.y - 12;
          r.vy = 0;
          r.onGround = true;
        }
        // hit underside
        if (r.vy < 0 && r.y - 10 < p.y + p.h && r.y > p.y && foot > p.y + p.h) {
          r.y = p.y + p.h + 10;
          r.vy = 20;
        }
      }
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
    e.aiT = e.type === "bounder" ? rnd(300, 700) : rnd(180, 400);

    if (!player || !player.alive) {
      e.vx = (chance(0.5) ? 1 : -1) * (50 + wave * 4);
      e.face = Math.sign(e.vx) || 1;
      return;
    }

    const dx = wrapDelta(e.x, player.x);
    if (e.type === "bounder") {
      // wander, sometimes chase
      if (chance(0.35)) {
        e.vx = Math.sign(dx || 1) * (55 + wave * 3);
      } else {
        e.vx = (chance(0.5) ? 1 : -1) * (50 + wave * 2);
      }
    } else if (e.type === "hunter") {
      e.vx = Math.sign(dx || 1) * (70 + wave * 4);
      // try to get above or meet player
      if (player.y < e.y - 20) e.flapT = 0; // flap soon
    } else if (e.type === "shadow") {
      e.vx = Math.sign(dx || 1) * (90 + wave * 5);
      // stay high when close
      if (Math.abs(dx) < 120 && e.y > 100) e.flapT = 0;
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

  // ── Draw ─────────────────────────────────────────────────────────────────
  function fillRect(x, y, w, h, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  function drawBackground() {
    // sky
    fillRect(0, 0, VW, VH, C.sky);
    // stars
    ctx.fillStyle = "#445";
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 97) % VW);
      const sy = 20 + ((i * 53) % (VH - 100));
      fillRect(sx, sy, 1, 1, i % 3 === 0 ? "#668" : "#334");
    }
  }

  function drawLava() {
    const pulse = 0.5 + 0.5 * Math.sin(lavaAnim / 120);
    for (const L of LAVA) {
      fillRect(L.x, L.y, L.w, L.h, C.lava);
      fillRect(L.x, L.y, L.w, 4, C.lavaHot);
      // bubbles
      for (let i = 0; i < 3; i++) {
        const bx = L.x + ((lavaAnim / 30 + i * 20) % L.w);
        fillRect(bx, L.y + 6 + pulse * 4, 4, 3, C.lavaHot);
      }
    }
    // lava between platforms on bottom strip
    fillRect(0, VH - 20, VW, 20, "#401000");
    for (const L of LAVA) {
      fillRect(L.x - 4, VH - 24, L.w + 8, 24, C.lava);
    }
  }

  function drawPlatforms() {
    for (const p of PLATFORMS) {
      // rock body
      fillRect(p.x, p.y, p.w, p.h, C.rock);
      fillRect(p.x, p.y, p.w, 3, C.rockLt);
      fillRect(p.x, p.y + p.h - 3, p.w, 3, C.rockDk);
      // texture speckles
      for (let i = 0; i < p.w; i += 12) {
        fillRect(p.x + i + 2, p.y + 5, 3, 2, C.rockDk);
        fillRect(p.x + i + 6, p.y + 9, 2, 2, C.rockLt);
      }
    }
  }

  function drawRider(r, color, dark) {
    if (!r.alive) return;
    const x = r.x;
    const y = r.y;
    const f = r.face;
    const flap = r.flapFrame > 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(f, 1);

    // ostrich / buzzard body
    fillRect(-10, -2, 18, 10, color);
    fillRect(-14, 0, 8, 6, dark || color);
    // neck + head
    fillRect(4, -10, 6, 10, color);
    fillRect(8, -12, 8, 6, color);
    fillRect(14, -10, 5, 3, C.yellow); // beak
    // wing
    if (flap) {
      fillRect(-8, -14, 14, 6, dark || color);
      fillRect(-4, -18, 10, 5, color);
    } else {
      fillRect(-6, 2, 12, 5, dark || color);
    }
    // legs
    fillRect(-4, 8, 3, 6, C.yellow);
    fillRect(4, 8, 3, 6, C.yellow);
    // knight
    fillRect(-2, -16, 6, 8, C.white);
    fillRect(-1, -20, 4, 4, C.white); // helm
    // lance
    fillRect(6, -14, 16, 2, C.white);
    fillRect(20, -15, 3, 4, C.yellow);

    ctx.restore();
  }

  function drawEgg(egg) {
    fillRect(egg.x - 5, egg.y - 6, 10, 12, C.egg);
    fillRect(egg.x - 3, egg.y - 4, 6, 3, "#80ff80");
    fillRect(egg.x - 2, egg.y + 2, 4, 2, "#208020");
  }

  function drawPtero() {
    if (!ptero || !ptero.alive) return;
    const x = ptero.x;
    const y = ptero.y;
    const flap = Math.sin(ptero.frame / 100) > 0;
    ctx.save();
    ctx.translate(x, y);
    if (ptero.vx < 0) ctx.scale(-1, 1);
    // body
    fillRect(-16, -6, 32, 12, C.ptero);
    fillRect(12, -4, 14, 6, C.ptero); // head
    fillRect(22, -2, 8, 3, C.white); // beak / mouth
    // wings
    if (flap) {
      fillRect(-20, -18, 24, 8, "#a08060");
      fillRect(0, -16, 20, 7, "#a08060");
    } else {
      fillRect(-20, 4, 24, 8, "#a08060");
      fillRect(0, 6, 20, 7, "#a08060");
    }
    ctx.restore();
  }

  function drawHands() {
    for (const h of hands) {
      fillRect(h.x - 8, h.y - 10, 16, 20, C.hand);
      fillRect(h.x - 10, h.y - 16, 5, 12, C.hand);
      fillRect(h.x + 5, h.y - 16, 5, 12, C.hand);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / 400, 0, 1);
      fillRect(p.x, p.y, p.size || 2, p.size || 2, p.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawMessages() {
    if (messageT > 0 && message) {
      ctx.fillStyle = C.yellow;
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.fillText(message, VW / 2, VH * 0.4);
    }
  }

  function render() {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.imageSmoothingEnabled = false;

    drawBackground();
    drawLava();
    drawPlatforms();
    drawHands();
    for (const egg of eggs) if (!egg.dead) drawEgg(egg);
    for (const e of enemies) {
      if (!e.alive) continue;
      const col =
        e.type === "hunter" ? C.hunter : e.type === "shadow" ? C.shadow : C.bounder;
      const dk =
        e.type === "hunter" ? "#a02020" : e.type === "shadow" ? "#4030a0" : "#808090";
      drawRider(e, col, dk);
    }
    if (player && player.alive) {
      if (!(invuln > 0 && ((invuln / 70) | 0) % 2 === 0)) {
        drawRider(player, C.player, C.playerDk);
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
