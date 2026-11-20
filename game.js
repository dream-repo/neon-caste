'use strict';
/* NEON CASTE – Part 1: The Gutter
 * Single-page canvas action RPG. All dialogue lives in story.js (const STORY).
 * Data tables below (RANKS, ENEMIES, CONTRACTS, WEAPONS, MODS, IMPLANTS, SKILLS, PERKS)
 * are written so WARRIOR / ELITE / RULER can be appended later.
 * Every entity has its own draw function (draw_<kind>) so real art can be swapped in.
 * Hidden test flags: ?debug=1 (cheat panel), ?bot=1 (autoplayer in fights),
 * ?bot=1&auto=1 (bot also drives the hub), ?speed=N (sim speed for bot), ?gender=m|f, ?choice=evict|fight
 */
const W = 640, H = 360, LANE_Y = [270, 314], XMIN = 26, XMAX = 614;
const Q = new URLSearchParams(location.search);
const DEBUG = Q.get('debug') === '1', BOT = Q.get('bot') === '1', AUTO = BOT && Q.get('auto') === '1';
const SPEED = Math.max(1, Math.min(20, +(Q.get('speed') || 1)));
const SAVE_KEY = 'neoncaste_p1_save_v2';
const SAVE_KEY_LEGACY = 'neoncaste_p1_save';
const $ = s => document.querySelector(s);
const rnd = Math.random;
const R = (a, b) => a + rnd() * (b - a);
const RI = (a, b) => Math.floor(R(a, b + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- DATA
const RANKS = [
  { id: 'hobo', district: 'gutter', rankXp: 1600, fenceMult: 1, docMult: 1, sellMult: 0.35 },
  { id: 'citizen', district: 'blocks', rankXp: 3000, fenceMult: 1.6, docMult: 1.35, sellMult: 0.45 },
  { id: 'warrior', locked: true }, { id: 'elite', locked: true }, { id: 'ruler', locked: true }
];
const DISTRICTS = {
  gutter: { name: 'THE GUTTER', sub: 'Kessel Street · Sector 9' },
  blocks: { name: 'THE BLOCKS', sub: 'Arcology Ring 3 · Sector 9' }
};
// ai: melee | ranged | hound | drone | cop | collector | mech | rival
const ENEMIES = {
  junkie:   { name: 'Junkie', ai: 'melee', hp: 50, dmg: 7, spd: 100, range: 38, windup: .5, cd: 1.15, xp: 12, cr: 7, mech: 0, draw: 'junkie' },
  bruiser:  { name: 'Bruiser', ai: 'melee', hp: 130, dmg: 13, spd: 70, range: 44, windup: .7, cd: 1.6, xp: 26, cr: 16, mech: 0, draw: 'bruiser', armor: .15 },
  scavver:  { name: 'Scavver', ai: 'ranged', hp: 44, dmg: 9, spd: 85, range: 32, windup: .55, cd: 2.4, xp: 14, cr: 8, mech: 0, draw: 'scavver', keep: [150, 240] },
  hound:    { name: 'Gutter Hound', ai: 'hound', hp: 40, dmg: 8, spd: 165, range: 40, windup: .55, cd: 1.7, xp: 14, cr: 6, mech: 1, draw: 'hound' },
  drone:    { name: 'Enforcer Drone', ai: 'drone', hp: 55, dmg: 9, spd: 80, range: 0, windup: .8, cd: 2.4, xp: 18, cr: 11, mech: 1, draw: 'drone', keep: [170, 260] },
  cop:      { name: 'Block Cop', ai: 'cop', hp: 110, dmg: 11, spd: 80, range: 42, windup: .6, cd: 1.5, xp: 26, cr: 16, mech: 0, draw: 'cop', shield: 1 },
  puppet:   { name: 'Ad-Puppet', ai: 'melee', hp: 75, dmg: 9, spd: 75, range: 36, windup: .55, cd: 1.3, xp: 22, cr: 9, mech: 1, draw: 'puppet', erratic: 1 },
  collector:{ name: 'Debt Collector', ai: 'collector', hp: 95, dmg: 14, spd: 75, range: 36, windup: .8, cd: 2.6, xp: 30, cr: 22, mech: 0, draw: 'collector', keep: [110, 190] },
  mech:     { name: 'Riot Mech', ai: 'mech', hp: 760, dmg: 20, spd: 55, range: 56, windup: .9, cd: 1.9, xp: 160, cr: 120, mech: 1, draw: 'mech', armor: .45, boss: 1 },
  wren1:    { name: 'Nero', ai: 'rival', hp: 320, dmg: 10, spd: 135, range: 42, windup: .38, cd: .95, xp: 120, cr: 60, mech: 0, draw: 'wren', boss: 1 },
  wren2:    { name: 'Nero', ai: 'rival', hp: 580, dmg: 11, spd: 150, range: 46, windup: .34, cd: .85, xp: 260, cr: 160, mech: 0, draw: 'wren', boss: 1, gun: 1, lunge: 1 }
};
const CONTRACTS = [
  { id: 'c_junk', district: 'gutter', lvl: 1, pool: ['junkie'], count: [3, 4], unlock: 'g1' },
  { id: 'c_scav', district: 'gutter', lvl: 2, pool: ['scavver', 'junkie', 'scavver'], count: [3, 4], unlock: 'g2' },
  { id: 'c_hound', district: 'gutter', lvl: 3, pool: ['hound', 'hound', 'scavver', 'junkie'], count: [4, 5], unlock: 'g2' },
  { id: 'c_drone', district: 'gutter', lvl: 4, pool: ['drone', 'junkie', 'hound', 'scavver'], count: [4, 5], unlock: 'g3' },
  { id: 'c_cop', district: 'blocks', lvl: 5, pool: ['cop', 'cop', 'junkie', 'drone'], count: [3, 4], unlock: 'proof' },
  { id: 'c_pup', district: 'blocks', lvl: 6, pool: ['puppet', 'puppet', 'drone'], count: [4, 5], unlock: 'b1' },
  { id: 'c_debt', district: 'blocks', lvl: 7, pool: ['collector', 'cop', 'puppet'], count: [3, 5], unlock: 'b1' },
  { id: 'c_mech', district: 'blocks', lvl: 8, list: ['mech', 'cop'], unlock: 'b2', boss: 1 }
];
const MISSIONS = [
  { id: 'g1', rank: 0, rec: 1, intro: 'g1_intro', win: 'g1_win', fight: { list: ['junkie', 'junkie', 'junkie'], lvl: 1, noElite: 1, maxActive: 2, tutorial: 1 }, reward: { creds: 40, scrap: 8, give: [['pipe', 'common']] } },
  { id: 'g2', rank: 0, rec: 2, intro: 'g2_intro', win: 'g2_win', fight: { list: ['scavver', 'junkie', 'hound', 'scavver'], lvl: 2, noElite: 1 }, reward: { creds: 60, scrap: 10, give: [['rust', 'common']], ammo: 12 } },
  { id: 'g3', rank: 0, rec: 3, intro: 'g3_intro', win: 'g3_win', fight: { list: ['wren1'], lvl: 3, boss: 1 }, reward: { creds: 80, scrap: 12, chrome: 1 } },
  { id: 'proof', rank: 0, rec: 4, proof: 1 },
  { id: 'b1', rank: 1, rec: 5, intro: 'b1_intro', win: 'b1_win', fight: { list: ['cop', 'junkie', 'cop', 'drone', 'cop'], lvl: 5 }, reward: { creds: 140, scrap: 16, chrome: 1 } },
  { id: 'b2', rank: 1, rec: 6, intro: 'b2_intro', win: 'b2_win', fight: { list: ['puppet', 'puppet', 'puppet', 'drone', 'mech'], lvl: 6, boss: 1 }, reward: { creds: 200, scrap: 20, chrome: 2 } },
  { id: 'b3', rank: 1, rec: 7, intro: 'b3_intro', win: 'b3_win', fight: { list: ['wren2', 'collector', 'collector'], lvl: 7, boss: 1, maxActive: 2 }, reward: { creds: 250, scrap: 20, chrome: 2 }, final: 1 }
];
const PROOF_FIGHT = { list: ['bruiser', 'bruiser', 'collector', 'junkie', 'bruiser'], lvl: 4, maxActive: 3, eliteFirst: 1, district: 'gutter', title: 'Pell\'s Crew' };

const WEAPONS = {
  fists:  { name: 'Bare Fists', type: 'melee', dmg: 8, spd: 1.05, range: 36, val: 0, look: 'fists' },
  pipe:   { name: 'Lead Pipe', type: 'melee', dmg: 12, spd: .95, range: 44, val: 40, look: 'pipe' },
  dust:   { name: 'Knuckle Dusters', type: 'melee', dmg: 10, spd: 1.22, range: 36, val: 55, look: 'dust' },
  machete:{ name: 'Machete', type: 'melee', dmg: 15, spd: 1.0, range: 48, val: 90, look: 'machete' },
  baton:  { name: 'Shock Baton', type: 'melee', dmg: 14, spd: 1.08, range: 46, val: 120, look: 'baton', rank: 0 },
  katana: { name: 'Mono-Katana', type: 'melee', dmg: 21, spd: 1.12, range: 56, val: 320, look: 'katana', rank: 1 },
  hammer: { name: 'Slab Hammer', type: 'melee', dmg: 27, spd: .8, range: 50, val: 300, look: 'hammer', rank: 1 },
  rust:   { name: 'Rust Pistol', type: 'gun', dmg: 14, rate: .38, val: 50, look: 'pistol' },
  scatter:{ name: 'Scatter Pistol', type: 'gun', dmg: 8, rate: .7, pellets: 3, val: 110, look: 'scatter' },
  smg:    { name: 'Hammer SMG', type: 'gun', dmg: 7, rate: .13, val: 160, look: 'smg' },
  rail:   { name: 'Rail Pistol', type: 'gun', dmg: 32, rate: .85, pierce: 1, val: 340, look: 'rail', rank: 1 }
};
const RARITY = {
  common: { name: 'Common', mult: 1, col: '#cfd8e3', val: 1 },
  tuned: { name: 'Tuned', mult: 1.2, col: '#36f3ff', val: 2.2 },
  bm: { name: 'Black-Market', mult: 1.45, col: '#ff4fd8', val: 4 }
};
const MODS = {
  dmg:   { name: 'DMG+', full: 'Damage mod (+15% damage)', scrap: 12, chrome: 0 },
  spd:   { name: 'SPD+', full: 'Speed mod (+12% speed / fire rate)', scrap: 12, chrome: 0 },
  shock: { name: 'SHOCK', full: 'Shock: 25% chance to stun 0.8 s', scrap: 16, chrome: 1, elem: 1, col: '#7fd8ff' },
  burn:  { name: 'BURN', full: 'Burn: hits ignite for +35% damage over 2 s', scrap: 16, chrome: 1, elem: 1, col: '#ff8a3c' },
  emp:   { name: 'EMP', full: 'EMP: +70% vs drones, mechs, puppets; shreds shields', scrap: 16, chrome: 1, elem: 1, col: '#b48cff' }
};
const AMMO_CRAFT = { scrap: 5, rounds: 10 };
const IMPLANTS = {
  mantis: { name: 'Mantis Edge', power: 1, cd: 6, cr: 110, chrome: 1, hum: 10, rank: 0, desc: 'POWER · Forearm blades. Lunge 170 px, hitting everything in the lane for 2.6× melee damage.' },
  pulse:  { name: 'Pulse Shield', power: 1, cd: 12, cr: 100, chrome: 1, hum: 8, rank: 0, desc: 'POWER · 3 s field that blocks every projectile and halves melee damage.' },
  plating:{ name: 'Subdermal Plating', cr: 140, chrome: 1, hum: 8, rank: 0, desc: 'PASSIVE · +30 max HP.' },
  synapse:{ name: 'Synaptic Booster', cr: 150, chrome: 1, hum: 8, rank: 0, desc: 'PASSIVE · +30 stamina, +20% stamina regen.' },
  overclock: { name: 'Overclock', power: 1, cd: 14, cr: 260, chrome: 2, hum: 14, rank: 1, desc: 'POWER · Reflex spike. Enemies move at 30% speed for 2 s.' },
  static: { name: 'Static Hand', power: 1, cd: 10, cr: 280, chrome: 2, hum: 14, rank: 1, desc: 'POWER · Chain-shock the 3 nearest enemies for heavy damage and a 1.2 s stun.' }
};
const SKILLS = {
  street: { name: 'STREET', col: '#ff8a5c', sub: 'melee', nodes: [
    { n: 'Brawler', d: '+15% melee damage.' },
    { n: 'Follow-Through', d: '3rd LIGHT hit knocks down.' },
    { n: 'Quick Charge', d: 'HEAVY charges 40% faster.' },
    { n: 'Bone Breaker', d: '+35% HEAVY damage.' },
    { n: 'Second Breath', d: 'Melee hits restore 2 HP.' },
    { n: 'Gutter King', d: 'LIGHT combo gains a 4th spin hit that strikes both sides.' } ] },
  iron: { name: 'IRON', col: '#ffcf4a', sub: 'ranged', nodes: [
    { n: 'Steady Hand', d: '+15% gun damage.' },
    { n: 'Hand-Loader', d: 'Ammo crafting yields +50% rounds.' },
    { n: 'Quickdraw', d: '+25% fire rate.' },
    { n: 'Weak Spot', d: '20% chance for 2× critical shots.' },
    { n: 'Lucky Brass', d: '30% chance a shot costs no ammo.' },
    { n: 'Overpenetration', d: 'Shots pierce through every enemy in the lane.' } ] },
  ghost: { name: 'GHOST', col: '#7dff9b', sub: 'evasion', nodes: [
    { n: 'Light Feet', d: 'DODGE costs 30% less stamina.' },
    { n: 'Second Wind', d: '+35% stamina regen.' },
    { n: 'Long Shadow', d: 'DODGE goes farther, i-frames last 40% longer.' },
    { n: 'Parry', d: 'BLOCK just before a melee hit: no damage, attacker stunned.' },
    { n: 'Ghost Strike', d: 'First hit after a DODGE deals +80%.' },
    { n: 'Afterimage', d: 'A dodge through an attack slows time for 1 s.' } ] }
};
const PERKS = {
  irongut: { n: 'Iron Gut', d: '+25 max HP.' },
  scrounger: { n: 'Scrounger', d: '+30% scrap from fights.' },
  shark: { n: 'Loan Shark', d: '+25% creds from fights.' },
  second: { n: 'Second Chance', d: 'Once per fight, survive a lethal hit and heal 30%.' },
  cold: { n: 'Cold Blood', d: 'Power cooldowns -25%.' },
  hollow: { n: 'Hollow Points', d: '+20% gun damage.' },
  skin: { n: 'Thick Skin', d: 'Take 12% less damage.' },
  bargain: { n: 'Bargain Hunter', d: 'Fence and Ripperdoc prices -15%.' }
};

// ---------------------------------------------------------------- SAVE / STATE
let S = null; // save state
let uidC = 1;
function mkWeapon(base, rar, noRoll) {
  const b = WEAPONS[base], r = RARITY[rar];
  const roll = noRoll ? 1 : R(.9, 1.12);
  const w = { uid: Date.now().toString(36) + (uidC++) + RI(0, 999), base, rar, mods: [null, null, null],
    dmg: Math.round(b.dmg * r.mult * roll), spd: +(b.spd ? b.spd * (noRoll ? 1 : R(.95, 1.08)) : 1).toFixed(2) };
  if (rar === 'bm' && rnd() < .7) w.mods[0] = pick(['shock', 'burn', 'emp']);
  return w;
}
function wName(w) { return (w.rar === 'common' ? '' : RARITY[w.rar].name + ' ') + WEAPONS[w.base].name; }
function wVal(w) { return Math.round((WEAPONS[w.base].val || 10) * RARITY[w.rar].val * (w.dmg / (WEAPONS[w.base].dmg || 1)) + w.mods.filter(Boolean).length * 12); }
function newSave(gender) {
  const f = mkWeapon('fists', 'common', true);
  return { v: 2, gender, rank: 0, level: 1, xp: 0, rankXp: 0, skillPts: 0, hum: 100, creds: 15, scrap: 4, chrome: 0, ammo: 0,
    weapons: [f], melee: f.uid, gun: null, skills: { street: 0, iron: 0, ghost: 0 }, perks: [], implants: [], power: null,
    done: {}, flags: {}, fence: [], fightsSinceStock: 0, stats: { fights: 0, wins: 0, losses: 0, kos: 0, time: 0 }, seenTips: {} };
}
function save(quiet) {
  if (!S) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); if (!quiet) toast('Saved'); } catch (e) { toast('Save failed'); }
}
function migrateSave(s) {
  if (!s || typeof s !== 'object') return s;
  // Rewrite leftover cached display strings from pre-rename saves.
  const oldHero = ['Sa', 'ble'].join('');
  const oldRival = ['Wr', 'en'].join('');
  const out = JSON.parse(JSON.stringify(s)
    .replace(new RegExp(oldHero + ' Vance', 'g'), 'Charlie Vance')
    .replace(new RegExp(oldHero, 'g'), 'Charlie')
    .replace(new RegExp(oldRival, 'g'), 'Nero'));
  out.v = 2;
  return out;
}
function loadSave() {
  try {
    let j = localStorage.getItem(SAVE_KEY);
    let fromLegacy = false;
    if (!j) { j = localStorage.getItem(SAVE_KEY_LEGACY); fromLegacy = !!j; }
    if (!j) return null;
    const raw = JSON.parse(j);
    const s = migrateSave(raw);
    if (fromLegacy || raw.v !== 2) {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {}
    }
    return s;
  } catch (e) { return null; }
}
const getW = uid => S.weapons.find(w => w.uid === uid);
const has = (b, i) => S.skills[b] >= i; // node i (1-based) owned
const perk = p => S.perks.includes(p);
const rankD = () => RANKS[S.rank];
const district = () => rankD().district;
function maxHp() { return 100 + 9 * (S.level - 1) + (perk('irongut') ? 25 : 0) + (S.implants.includes('plating') ? 30 : 0); }
function maxSta() { return 100 + (S.implants.includes('synapse') ? 30 : 0); }
function xpNeed(l) { return 80 + 60 * (l - 1); }
function setHum(v) {
  S.hum = clamp(v, -50, 100);
  if (S.hum <= 0) S.flags.dark = 1;
}
const COND = {
  lowHum: () => S.hum < 50, highHum: () => S.hum >= 50, evicted: () => S.flags.proof === 'evict', fought: () => S.flags.proof === 'fight',
  citizen: () => S.rank >= 1, hobo: () => S.rank === 0, dark: () => !!S.flags.dark, tookCrate: () => !!S.flags.tookCrate, leftCrate: () => !!S.flags.leftCrate
};
function fmt(t) {
  const f = S && S.gender === 'f';
  return t.replace(/\{(they|them|their|They|Their|kid)\}/g, (m, k) => ({
    they: f ? 'she' : 'he', them: f ? 'her' : 'him', their: f ? 'her' : 'his', They: f ? 'She' : 'He', Their: f ? 'Her' : 'His', kid: f ? 'girl' : 'boy' }[k]));
}
function priceMult(kind) {
  let m = kind === 'doc' ? rankD().docMult : rankD().fenceMult;
  if (S.hum < 50) m *= kind === 'doc' ? 1.25 : 0.88; // Iris charges a "conscience fee"; Dex is scared of you
  if (perk('bargain')) m *= .85;
  return m;
}

// ---------------------------------------------------------------- CANVAS / VIEW
const cv = $('#cv'), ctx = cv.getContext('2d');
let DPR = 1, VW = 0, VH = 0, view = { x: 0, y: 0, s: 1 }, mode = 'title';
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  computeView();
}
function computeView() {
  const portrait = VH > VW * 1.1;
  if (mode === 'fight') {
    if (portrait) {
      const s = VW / W, top = 58, bottom = VH - 215;
      view = { s, x: 0, y: Math.max(top, top + ((bottom - top) - H * s) / 2 - 10) };
    } else {
      const s = Math.min(VW / W, VH / H);
      view = { s, x: (VW - W * s) / 2, y: (VH - H * s) / 2 };
    }
  } else {
    const s = Math.max(VW / W, VH / H) * (portrait ? 1 : 1);
    view = { s, x: (VW - W * s) / 2, y: portrait ? (VH - H * s) * .55 : (VH - H * s) / 2 };
  }
}
addEventListener('resize', resize);

// ---------------------------------------------------------------- BACKGROUNDS
let T = 0; // global time
const rain = Array.from({ length: 130 }, () => ({ x: R(-200, 840), y: R(-300, 700), v: R(520, 760), l: R(8, 16) }));
const dust = Array.from({ length: 40 }, () => ({ x: R(-100, 740), y: R(-100, 400), v: R(4, 14), a: R(0, 6) }));
let skyCache = {};
function mkSkyline(seed, kind) {
  const c = document.createElement('canvas'); c.width = 1100; c.height = 520; const g = c.getContext('2d');
  let s = seed; const sr = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  if (kind === 'gutter') {
    for (let layer = 0; layer < 2; layer++) {
      let x = 0;
      while (x < 1100) {
        const w = 30 + sr() * 70, h = (layer ? 120 : 200) + sr() * (layer ? 160 : 240);
        g.fillStyle = layer ? '#0c0a1a' : '#130f26'; g.fillRect(x, 520 - h, w, h);
        for (let wy = 520 - h + 8; wy < 510; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 7)
          if (sr() < (layer ? .16 : .1)) { g.fillStyle = sr() < .5 ? 'rgba(255,90,210,.55)' : sr() < .5 ? 'rgba(80,230,255,.5)' : 'rgba(255,200,120,.45)'; g.fillRect(wx, wy, 3, 4); }
        x += w + sr() * 6;
      }
    }
  } else {
    // Blocks: interior far wall with stacked habitation pods
    g.fillStyle = '#0d1424'; g.fillRect(0, 0, 1100, 520);
    for (let y = 20; y < 520; y += 34) for (let x = 0; x < 1100; x += 46) {
      g.fillStyle = sr() < .5 ? '#111a2e' : '#0f1729'; g.fillRect(x + 2, y + 2, 42, 30);
      if (sr() < .3) { g.fillStyle = sr() < .6 ? 'rgba(120,220,255,.35)' : 'rgba(255,220,160,.3)'; g.fillRect(x + 8, y + 10, 30, 10); }
    }
  }
  return c;
}
function neonText(g, txt, x, y, size, col, flick) {
  const on = !flick || Math.sin(T * 13 + x) > -0.85 || Math.sin(T * 3.1 + y) > .2;
  g.font = `900 ${size}px ui-monospace,Menlo,Consolas,monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (!on) { g.fillStyle = 'rgba(80,80,100,.5)'; g.fillText(txt, x, y); return; }
  g.globalAlpha = .35; g.fillStyle = col; g.fillText(txt, x - 1, y); g.fillText(txt, x + 1, y); g.fillText(txt, x, y + 1);
  g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillText(txt, x, y);
  g.globalAlpha = .9; g.fillStyle = col; g.fillText(txt, x, y); g.globalAlpha = 1;
}
function glowBlob(g, x, y, r, col, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1;
}
function drawBG_gutter(g, px) {
  const par = (px - 320) * -0.04;
  let gr = g.createLinearGradient(0, -300, 0, 250); gr.addColorStop(0, '#05030c'); gr.addColorStop(.6, '#160a2a'); gr.addColorStop(1, '#3a1240');
  g.fillStyle = gr; g.fillRect(-400, -400, 1440, 660);
  // the Spire
  const sx = 330 + par * .3;
  g.fillStyle = '#0b0718'; g.beginPath(); g.moveTo(sx - 34, 240); g.lineTo(sx - 12, -260); g.lineTo(sx + 12, -260); g.lineTo(sx + 34, 240); g.fill();
  g.fillStyle = '#0e0a20'; g.fillRect(sx - 4, -400, 8, 150);
  for (let y = -240; y < 230; y += 14) { g.fillStyle = (y / 14 | 0) % 3 ? 'rgba(54,243,255,.18)' : 'rgba(255,63,210,.2)'; const w = 10 + (y + 260) * .045; g.fillRect(sx - w, y, w * 2, 2); }
  if (Math.sin(T * 3) > 0) glowBlob(g, sx, -255, 14, '#ff2050', 1);
  glowBlob(g, sx, 20, 80, 'rgba(255,63,210,.35)', .6);
  if (!skyCache.gutter) skyCache.gutter = mkSkyline(7, 'gutter');
  g.drawImage(skyCache.gutter, -230 + par, -280, 1100, 520);
  // mid haze
  gr = g.createLinearGradient(0, 120, 0, 245); gr.addColorStop(0, 'rgba(255,63,210,0)'); gr.addColorStop(1, 'rgba(255,63,210,.18)');
  g.fillStyle = gr; g.fillRect(-400, 120, 1440, 125);
  // alley walls
  const wl = par * 1.6;
  g.fillStyle = '#0a0812'; g.fillRect(-400 + wl, -400, 470, 645); g.fillRect(560 + wl, -400, 500, 645);
  g.fillStyle = '#120d1e'; for (let y = -380; y < 240; y += 26) { g.fillRect(-400 + wl, y, 470, 2); g.fillRect(560 + wl, y, 500, 2); }
  // fire escape
  g.strokeStyle = '#1d1730'; g.lineWidth = 2; for (let y = -60; y < 220; y += 60) { g.strokeRect(20 + wl, y, 46, 4); g.beginPath(); g.moveTo(20 + wl, y + 4); g.lineTo(66 + wl, y + 60); g.stroke(); }
  // signs
  g.fillStyle = '#16061a'; g.fillRect(36 + wl, 40, 34, 120);
  g.save(); g.translate(53 + wl, 100); for (let i = 0; i < 5; i++) neonText(g, 'RAMEN'[i], 0, -46 + i * 23, 18, '#ff3fd2', true); g.restore();
  neonText(g, 'THE LADLE', 600 + wl, 120, 15, '#ffb347', false);
  neonText(g, 'PAWN·24H', 600 + wl, 60, 12, '#36f3ff', true);
  g.fillStyle = 'rgba(54,243,255,.6)'; g.fillRect(565 + wl, 152, 70, 2);
  // ground
  gr = g.createLinearGradient(0, 240, 0, 420); gr.addColorStop(0, '#120c1c'); gr.addColorStop(1, '#06050b');
  g.fillStyle = gr; g.fillRect(-400, 240, 1440, 600);
  // puddle reflections
  g.globalAlpha = .22 + .06 * Math.sin(T * 2);
  g.fillStyle = '#ff3fd2'; g.fillRect(40 + wl, 252, 26, 60); g.fillStyle = '#ffb347'; g.fillRect(560 + wl, 250, 80, 3);
  g.fillStyle = '#36f3ff'; g.fillRect(sx - 3, 248, 6, 40); g.globalAlpha = 1;
  g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
  for (const ly of LANE_Y) { g.beginPath(); g.moveTo(-400, ly + 6); g.lineTo(1040, ly + 6); g.stroke(); }
  for (let i = 0; i < 6; i++) { const x = (i * 137 + 50) % 640; g.fillStyle = 'rgba(120,140,200,.06)'; g.beginPath(); g.ellipse(x, 296 + (i % 2) * 30, 40, 5, 0, 0, 7); g.fill(); }
  // fire barrels
  for (const bx of [92 + wl * .5, 548 + wl * .5]) drawBarrel(g, bx, 250);
}
function drawBarrel(g, x, y) {
  glowBlob(g, x, y - 34, 70, 'rgba(255,140,40,.55)', .55 + .1 * Math.sin(T * 17 + x));
  g.fillStyle = '#2a1c18'; g.fillRect(x - 11, y - 28, 22, 28); g.fillStyle = '#3a2620'; g.fillRect(x - 11, y - 20, 22, 3); g.fillRect(x - 11, y - 9, 22, 3);
  for (let i = 0; i < 4; i++) {
    const fx = x - 8 + i * 5, h = 14 + 9 * Math.abs(Math.sin(T * (9 + i * 2) + i * 2));
    g.fillStyle = i % 2 ? '#ffcf4a' : '#ff6a20'; g.beginPath(); g.moveTo(fx - 4, y - 28); g.lineTo(fx + Math.sin(T * 10 + i) * 2, y - 28 - h); g.lineTo(fx + 4, y - 28); g.fill();
  }
}
const ADS = ['SMILEFEED · BE HAPPIER', 'CITIZENSHIP IS A PRIVILEGE', 'RENT IS FREEDOM', 'REPORT UNLICENSED KINDNESS', 'THE SPIRE SEES YOU · SMILE'];
function drawBG_blocks(g, px) {
  const par = (px - 320) * -0.03;
  if (!skyCache.blocks) skyCache.blocks = mkSkyline(11, 'blocks');
  g.fillStyle = '#070a12'; g.fillRect(-400, -400, 1440, 660);
  g.drawImage(skyCache.blocks, -230 + par, -290, 1100, 520);
  // ceiling light strips
  for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(200,240,255,.5)'; g.fillRect(-60 + i * 150 + par, -6, 80, 3); glowBlob(g, -20 + i * 150 + par, 0, 60, 'rgba(160,220,255,.25)', .5); }
  // pillars
  const wl = par * 1.6;
  for (const x of [-30, 196, 416, 640]) {
    g.fillStyle = '#0f1626'; g.fillRect(x + wl, -400, 44, 645); g.fillStyle = 'rgba(54,243,255,.55)'; g.fillRect(x + 20 + wl, -400, 3, 645);
  }
  // ad screens
  for (let i = 0; i < 2; i++) {
    const x = 34 + i * 220 + wl + (i ? 30 : 0), y = 40, w = 150, h = 84, col = i ? '#ff3fd2' : '#36f3ff';
    g.fillStyle = '#050710'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, i ? '#3a0a34' : '#06303a'); gr.addColorStop(1, '#0a0a1a');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const txt = ADS[(Math.floor(T / 4) + i * 2) % ADS.length];
    const tw = txt.length * 9; const ox = x + w - ((T * 50 + i * 90) % (tw + w));
    neonText(g, txt, ox + tw / 2, y + h / 2 + 18, 12, col, false);
    neonText(g, i ? '☺' : '▲', x + w / 2, y + 30, 26, col, false);
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let sy = y; sy < y + h; sy += 3) g.fillRect(x, sy, w, 1);
    g.restore();
  }
  // checkpoint gate (right)
  const gx = 520 + wl;
  g.fillStyle = '#121a2c'; g.fillRect(gx, 70, 12, 175); g.fillRect(gx + 88, 70, 12, 175); g.fillRect(gx, 62, 100, 14);
  const red = Math.sin(T * 4) > 0;
  glowBlob(g, gx + 50, 69, 30, red ? 'rgba(255,40,80,.8)' : 'rgba(40,255,140,.6)', .8);
  g.fillStyle = 'rgba(255,40,80,.25)'; const scan = 80 + (Math.sin(T * 1.7) * .5 + .5) * 150; g.fillRect(gx + 12, scan, 76, 2);
  neonText(g, 'CHECKPOINT 9', gx + 50, 54, 9, '#ff5a7a', true);
  // floor
  const gr2 = g.createLinearGradient(0, 240, 0, 420); gr2.addColorStop(0, '#1a2338'); gr2.addColorStop(1, '#070a12');
  g.fillStyle = gr2; g.fillRect(-400, 240, 1440, 600);
  g.strokeStyle = 'rgba(120,180,255,.08)'; g.lineWidth = 1;
  for (let i = -10; i < 20; i++) { g.beginPath(); g.moveTo(320 + i * 40, 245); g.lineTo(320 + i * 120 + par * 3, 520); g.stroke(); }
  for (const y of [258, 284, 330, 380]) { g.beginPath(); g.moveTo(-400, y); g.lineTo(1040, y); g.stroke(); }
  g.globalAlpha = .12; g.fillStyle = '#36f3ff'; g.fillRect(34 + wl, 250, 150, 30); g.fillStyle = '#ff3fd2'; g.fillRect(284 + wl, 250, 150, 30); g.globalAlpha = 1;
}
function drawWeather(g, dt, kind) {
  if (kind === 'gutter') {
    g.strokeStyle = 'rgba(170,200,255,.28)'; g.lineWidth = 1; g.beginPath();
    for (const r of rain) {
      r.y += r.v * dt; r.x -= r.v * dt * .12;
      if (r.y > 420) { r.y = R(-300, -10); r.x = R(-200, 860); }
      g.moveTo(r.x, r.y); g.lineTo(r.x + r.l * .12, r.y - r.l);
    }
    g.stroke();
  } else {
    g.fillStyle = 'rgba(200,230,255,.25)';
    for (const d of dust) { d.y -= d.v * dt; d.a += dt; if (d.y < -120) d.y = 420; g.fillRect(d.x + Math.sin(d.a) * 6, d.y, 1.5, 1.5); }
  }
}
function drawBG(g, dist, px) { (dist === 'blocks' ? drawBG_blocks : drawBG_gutter)(g, px); }

// ---------------------------------------------------------------- FIGURE RENDERING
// angles: 0 = straight down, +PI/2 = forward (facing), PI = straight up
function lp(ox, oy, a, l, f) { return [ox + Math.sin(a) * l * f, oy + Math.cos(a) * l]; }
function strokePath(g, pts, w, col) {
  g.lineWidth = w; g.strokeStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke();
}
function poseBase() { return { lean: .06, crouch: 2, hF: .3, kF: .3, hB: -.22, kB: .15, sF: .6, eF: 1.9, sB: .4, eB: 2.0, head: 0 }; }
function poseFor(e) {
  const p = poseBase(), t = e.anim || 0, st = e.state, ph = e.ph || 0;
  p.lean += Math.sin(t * 2.4) * .02; p.crouch += Math.sin(t * 2.4) * 1.2;
  if (e.moving && (st === 'idle' || st === 'walk' || st === 'approach' || st === 'keep')) {
    const w = t * (e.walkRate || 11);
    p.hF = .45 * Math.sin(w); p.hB = -.45 * Math.sin(w); p.kF = .6 * Math.max(0, Math.sin(w + 1.6)); p.kB = .6 * Math.max(0, -Math.sin(w + 1.6));
    p.crouch = 3 + Math.abs(Math.sin(w)) * 2; p.lean = .12;
  }
  const armed = e.look && e.look.weapon && !['fists', 'dust', 'none'].includes(e.look.weapon);
  if (st === 'light' || st === 'attack' || st === 'heavy' || st === 'spin') {
    const heavy = st === 'heavy', k = e.comboIdx || 0;
    const wind = heavy ? .25 : .35, hit = heavy ? .5 : .6;
    let a;
    if (ph < wind) a = ph / wind; else if (ph < hit) a = 1 + (ph - wind) / (hit - wind); else a = 2;
    if (armed || heavy) {
      const up = heavy ? 2.95 : 2.6, dn = heavy ? .5 : .75;
      p.sF = a < 1 ? lerp(.8, up, a) : a < 2 ? lerp(up, dn, a - 1) : dn; p.eF = a < 1 ? .6 : .15;
      p.lean = a < 1 ? -.15 : .3; p.crouch = heavy ? 7 : 4; p.hF = .55; p.kF = .4; p.hB = -.45;
    } else if (k === 1) {
      p.sB = a < 1 ? .4 : a < 2 ? lerp(.4, 1.6, a - 1) : 1.6; p.eB = a < 1 ? 2.2 : .05; p.lean = .3; p.sF = .4; p.eF = 2.1; p.hF = .5; p.hB = -.4;
    } else {
      p.sF = a < 1 ? lerp(.6, .3, a) : a < 2 ? lerp(.3, k === 2 ? 1.95 : 1.58, a - 1) : (k === 2 ? 1.95 : 1.58);
      p.eF = a < 1 ? 2.3 : .05; p.lean = a < 1 ? -.05 : .28; p.hF = .55; p.hB = -.4;
    }
    if (st === 'spin') { p.sF = 1.6; p.eF = .1; p.sB = 1.6; p.eB = .1; }
  } else if (st === 'charge') {
    p.sF = 2.95; p.eF = .5; p.sB = 2.4; p.eB = .8; p.lean = -.25; p.crouch = 7 + Math.sin(T * 40) * .8; p.hF = .55; p.kF = .5; p.hB = -.5;
  } else if (st === 'block') {
    p.sF = 1.25; p.eF = 2.35; p.sB = 1.15; p.eB = 2.4; p.crouch = 5; p.lean = -.06;
  } else if (st === 'dodge' || st === 'lunge' || st === 'power') {
    p.lean = .6; p.crouch = 11; p.hF = .9; p.kF = 1.3; p.hB = -.7; p.kB = .3;
    if (st === 'dodge') { p.sF = -.3; p.eF = .6; p.sB = -.5; p.eB = .5; } else { p.sF = 1.55; p.eF = .05; p.sB = 1.5; p.eB = .1; }
  } else if (st === 'hurt' || st === 'stun') {
    p.lean = -.35 + Math.sin(t * 30) * .05; p.sF = .2; p.eF = .4; p.sB = -.3; p.eB = .4; p.head = -.3;
  } else if (st === 'windup') {
    if (armed) { p.sF = 2.5; p.eF = .6; p.lean = -.15; } else { p.sF = .3; p.eF = 2.4; p.lean = -.12; }
    p.crouch = 5;
  }
  if (e.shootT > 0) { p.sB = Math.PI / 2 + (e.aimA || 0); p.eB = 0; }
  return p;
}
// look: {glow, body, trim, sw, hw, lw, scale, hair, weapon, extras}
function drawHumanoid(g, e, look) {
  const p = poseFor(e), f = e.face, sc = look.scale || 1;
  g.save(); g.translate(e.x, e.y);
  if (e.state === 'down' || e.state === 'ko' || e.state === 'dead') { g.translate(-f * 6, -4); g.rotate(-f * 1.45 * Math.min(1, (e.downP || 1))); }
  g.scale(sc, sc);
  const lw = look.lw || 7, glow = e.glowCol || look.glow, body = look.body, trim = look.trim || glow;
  const hip = [0, -46 + p.crouch];
  const sh = lp(hip[0], hip[1], Math.PI - p.lean, 30, f);
  const hd = lp(sh[0], sh[1], Math.PI - p.lean - p.head * .3, 13, f);
  const legF = [...hip, ...lp(hip[0], hip[1], p.hF, 23, f)]; legF.push(...lp(legF[2], legF[3], p.hF - p.kF, 23, f));
  const legB = [...hip, ...lp(hip[0], hip[1], p.hB, 23, f)]; legB.push(...lp(legB[2], legB[3], p.hB - p.kB, 23, f));
  const armF = [...sh, ...lp(sh[0], sh[1], p.sF, 16, f)]; armF.push(...lp(armF[2], armF[3], p.sF + p.eF, 16, f));
  const armB = [...sh, ...lp(sh[0], sh[1], p.sB, 16, f)]; armB.push(...lp(armB[2], armB[3], p.sB + p.eB, 16, f));
  const sw = look.sw || 10, hw = look.hw || 8;
  const ang = p.lean * f; const cx = Math.cos(ang), sx = Math.sin(ang);
  const torso = [hip[0] - hw * cx, hip[1] - hw * sx, hip[0] + hw * cx, hip[1] + hw * sx, sh[0] + sw * cx, sh[1] + sw * sx, sh[0] - sw * cx, sh[1] - sw * sx];
  g.lineCap = 'round'; g.lineJoin = 'round';
  // shadow
  g.globalAlpha = .35; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, 22, 4, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  // glow pass
  g.globalAlpha = .2;
  for (const L of [armB, legB, legF, armF]) strokePath(g, L, lw + 9, glow);
  g.fillStyle = glow; g.beginPath(); g.arc(hd[0], hd[1], 13, 0, 7); g.fill();
  strokePath(g, [...torso, torso[0], torso[1]], 12, glow);
  g.globalAlpha = 1;
  const part = (pts, w, dim) => { strokePath(g, pts, w + 3, dim ? shade(glow) : glow); strokePath(g, pts, w - .5, dim ? '#05060a' : body); };
  const boot = (L, dim) => { const fx = L[4], fy = L[5]; strokePath(g, [fx - f * 2, fy - 1, fx + f * 7, fy - 1], lw + 2, dim ? shade(glow) : glow); strokePath(g, [fx - f * 2, fy - 1, fx + f * 7, fy - 1], lw - 1.5, dim ? '#05060a' : '#1c2233'); };
  const fist = (L, dim) => { g.fillStyle = dim ? '#05060a' : body; g.strokeStyle = dim ? shade(glow) : glow; g.lineWidth = 2; g.beginPath(); g.arc(L[4], L[5], lw * .62, 0, 7); g.fill(); g.stroke(); };
  if (look.back) look.back(g, e, sh, hip, f, p, glow);
  part(armB, lw - 1, 1); fist(armB, 1);
  if (e.shootT > 0 && look.gun) drawGunAt(g, armB[4], armB[5], p.sB + p.eB, f, look.gun, e.flashT > 0);
  part(legB, lw, 1); boot(legB, 1);
  // torso
  g.fillStyle = body; g.strokeStyle = glow; g.lineWidth = 2.5; g.beginPath(); g.moveTo(torso[0], torso[1]);
  for (let i = 2; i < 8; i += 2) g.lineTo(torso[i], torso[i + 1]); g.closePath(); g.fill(); g.stroke();
  if (look.torso) look.torso(g, e, sh, hip, f, p, glow);
  // head
  g.fillStyle = body; g.beginPath(); g.arc(hd[0], hd[1], 9, 0, 7); g.fill(); g.strokeStyle = glow; g.lineWidth = 2.5; g.stroke();
  if (look.head) look.head(g, e, hd, f, glow, p);
  part(legF, lw); boot(legF);
  part(armF, lw); fist(armF);
  if (look.weapon) drawMelee(g, armF[4], armF[5], p.sF + p.eF, f, look.weapon, e);
  if (look.front) look.front(g, e, armF, f, glow, p);
  g.restore();
}
function shade(c) { return c.length === 7 ? c + '88' : c; }
function drawMelee(g, x, y, a, f, kind, e) {
  const wa = a + .6, dx = Math.sin(wa) * f, dy = Math.cos(wa);
  g.lineCap = 'round';
  const L = (len, w, col, glowc) => {
    if (glowc) { g.globalAlpha = .35; g.strokeStyle = glowc; g.lineWidth = w + 6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * len, y + dy * len); g.stroke(); g.globalAlpha = 1; }
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x - dx * 4, y - dy * 4); g.lineTo(x + dx * len, y + dy * len); g.stroke();
  };
  switch (kind) {
    case 'pipe': L(30, 4, '#8b93a6'); break;
    case 'machete': L(10, 4, '#3b2a20'); g.strokeStyle = '#d7e3ef'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + dx * 10, y + dy * 10); g.lineTo(x + dx * 34, y + dy * 34); g.stroke(); break;
    case 'baton': L(30, 4, '#bff6ff', '#36f3ff'); break;
    case 'katana': L(9, 3, '#222'); g.globalAlpha = .4; g.strokeStyle = '#ff3fd2'; g.lineWidth = 7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * 50, y + dy * 50); g.stroke(); g.globalAlpha = 1;
      g.strokeStyle = '#f2f6ff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + dx * 8, y + dy * 8); g.lineTo(x + dx * 52, y + dy * 52); g.stroke(); break;
    case 'hammer': L(34, 4, '#5a5f6e'); g.save(); g.translate(x + dx * 34, y + dy * 34); g.rotate(Math.atan2(dy, dx)); g.fillStyle = '#7b8396'; g.fillRect(-6, -10, 12, 20); g.restore(); break;
    case 'dust': g.fillStyle = '#ffcf4a'; g.fillRect(x - 4, y - 4, 8, 8); break;
    case 'shiv': L(14, 3, '#cfd6e0'); break;
    case 'bottle': g.fillStyle = 'rgba(120,255,160,.8)'; g.fillRect(x - 3, y - 12, 6, 12); break;
    case 'blades': g.strokeStyle = '#ff3fd2'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * 36, y + dy * 36); g.stroke(); break;
  }
  if (e && e.elemCol && kind !== 'fists') { g.globalAlpha = .5 + .3 * Math.sin(T * 20); g.fillStyle = e.elemCol; g.beginPath(); g.arc(x + dx * 22, y + dy * 22, 3, 0, 7); g.fill(); g.globalAlpha = 1; }
}
function drawGunAt(g, x, y, a, f, kind, flash) {
  g.save(); g.translate(x, y); g.scale(f, 1); g.rotate(Math.PI / 2 - a);
  const len = kind === 'smg' ? 18 : kind === 'rail' ? 22 : kind === 'shotgun' ? 26 : 14;
  g.fillStyle = '#1b2030'; g.strokeStyle = kind === 'rail' ? '#36f3ff' : '#8b93a6'; g.lineWidth = 1.5;
  g.fillRect(-2, -3, len, 6); g.strokeRect(-2, -3, len, 6); g.fillRect(0, 2, 4, 7);
  if (flash) { g.fillStyle = '#fff6b0'; g.beginPath(); g.moveTo(len, -6); g.lineTo(len + 16, 0); g.lineTo(len, 6); g.fill(); glowBlob(g, len + 6, 0, 18, 'rgba(255,220,120,.9)', .8); }
  g.restore();
}
// --- per-entity looks (one draw function per entity kind)
function hairFor(gender) {
  return (g, e, hd, f, glow) => {
    g.fillStyle = '#0d1018'; g.strokeStyle = glow; g.lineWidth = 2;
    if (gender === 'f') {
      g.beginPath(); g.arc(hd[0], hd[1] - 1, 10, Math.PI * .9, Math.PI * 2.05); g.fill(); g.stroke();
      const sway = Math.sin(T * 5 + e.x * .05) * 3;
      g.beginPath(); g.moveTo(hd[0] - f * 8, hd[1] - 4); g.quadraticCurveTo(hd[0] - f * 20, hd[1] + 2 + sway, hd[0] - f * 16, hd[1] + 16 + sway); g.lineWidth = 5; g.strokeStyle = glow; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#0d1018'; g.stroke();
    } else {
      g.beginPath(); g.moveTo(hd[0] - f * 10, hd[1] - 2); g.lineTo(hd[0] - f * 6, hd[1] - 13); g.lineTo(hd[0], hd[1] - 10); g.lineTo(hd[0] + f * 4, hd[1] - 14); g.lineTo(hd[0] + f * 10, hd[1] - 5); g.closePath(); g.fill(); g.stroke();
    }
    // cyber visor
    g.fillStyle = glow; g.fillRect(hd[0] + (f > 0 ? 1 : -9), hd[1] - 2, 8, 2.5);
  };
}
function lookPlayer() {
  const fem = S && S.gender === 'f', wpn = getW(S.melee), gw = S.gun ? getW(S.gun) : null;
  return { glow: '#36f3ff', body: '#0a1424', sw: fem ? 8 : 11, hw: fem ? 10 : 7.5, lw: fem ? 6 : 7.5, head: hairFor(fem ? 'f' : 'm'),
    weapon: WEAPONS[wpn.base].look, gun: gw ? WEAPONS[gw.base].look : 'pistol',
    torso: (g, e, sh, hip, f, p, glow) => { g.strokeStyle = '#ff3fd2'; g.lineWidth = 2; g.beginPath(); g.moveTo(sh[0] - f * 6, sh[1] + 2); g.lineTo(hip[0] + f * 2, hip[1] - 4); g.stroke(); } };
}
const LOOKS = {
  junkie: { body: '#1a1020', sw: 9, hw: 7, lw: 6, weapon: 'shiv', head: (g, e, hd, f, glow) => { g.fillStyle = '#251530'; g.strokeStyle = glow; g.lineWidth = 2; g.beginPath(); g.arc(hd[0] - f * 2, hd[1] - 1, 12, Math.PI * .75, Math.PI * 2.25); g.fill(); g.stroke(); g.fillStyle = '#7dff9b'; g.fillRect(hd[0] + f * 3 - 1, hd[1], 3, 2); } },
  bruiser: { body: '#1c1414', sw: 14, hw: 10, lw: 9, scale: 1.18, weapon: 'pipe', head: (g, e, hd, f, glow) => { g.fillStyle = glow; g.fillRect(hd[0] - 8, hd[1] - 9, 16, 3); } },
  scavver: { body: '#1d1a12', sw: 9, hw: 7, lw: 6, weapon: 'bottle', back: (g, e, sh, hip, f, p, glow) => { g.fillStyle = '#2b2416'; g.strokeStyle = glow; g.lineWidth = 2; g.fillRect(sh[0] - f * 18 - 7, sh[1], 14, 24); g.strokeRect(sh[0] - f * 18 - 7, sh[1], 14, 24); g.fillStyle = 'rgba(120,255,160,.7)'; g.fillRect(sh[0] - f * 18 - 5, sh[1] - 8, 4, 9); g.fillRect(sh[0] - f * 18 + 1, sh[1] - 6, 4, 7); },
    head: (g, e, hd, f) => { g.fillStyle = '#ffcf4a'; g.beginPath(); g.arc(hd[0] + f * 4, hd[1] - 1, 3, 0, 7); g.fill(); g.beginPath(); g.arc(hd[0] - f * 2, hd[1] - 1, 3, 0, 7); g.fill(); } },
  cop: { body: '#0e1530', sw: 12, hw: 8, lw: 8, scale: 1.06, weapon: 'baton', head: (g, e, hd, f, glow) => { g.fillStyle = '#1a2547'; g.strokeStyle = glow; g.lineWidth = 2; g.beginPath(); g.arc(hd[0], hd[1] - 1, 11, Math.PI, 0); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,60,90,.9)'; g.fillRect(hd[0] + (f > 0 ? -2 : -8), hd[1] - 2, 10, 3); },
    front: (g, e, arm, f, glow) => { if (!e.shieldUp) return; const x = arm[4] + f * 6, y = arm[5]; g.fillStyle = 'rgba(120,170,255,.25)'; g.strokeStyle = '#9fc0ff'; g.lineWidth = 2; g.fillRect(x - 4, y - 30, 8, 52); g.strokeRect(x - 4, y - 30, 8, 52); g.fillStyle = '#fff'; g.fillRect(x - 1, y - 20, 2, 8); } },
  puppet: { body: '#1a1a24', sw: 10, hw: 8, lw: 6.5, head: (g, e, hd, f, glow) => { g.fillStyle = '#05070c'; g.fillRect(hd[0] - 11, hd[1] - 11, 22, 20); g.strokeStyle = glow; g.lineWidth = 2; g.strokeRect(hd[0] - 11, hd[1] - 11, 22, 20); neonText(g, Math.sin(T * 7 + e.x) > 0 ? '☺' : '$', hd[0], hd[1] - 1, 13, '#36f3ff', false); } },
  collector: { body: '#151018', sw: 11, hw: 9, lw: 7.5, gun: 'shotgun', torso: (g, e, sh, hip, f, p, glow) => { g.fillStyle = '#151018'; g.strokeStyle = glow; g.lineWidth = 2; g.beginPath(); g.moveTo(hip[0] - 11, hip[1] - 4); g.lineTo(hip[0] + 11, hip[1] - 4); g.lineTo(hip[0] + 14, hip[1] + 26); g.lineTo(hip[0] - 14, hip[1] + 26); g.closePath(); g.fill(); g.stroke(); },
    head: (g, e, hd, f, glow) => { g.fillStyle = '#0a0a10'; g.strokeStyle = glow; g.lineWidth = 2; g.fillRect(hd[0] - 14, hd[1] - 8, 28, 3); g.fillRect(hd[0] - 8, hd[1] - 16, 16, 9); g.strokeRect(hd[0] - 8, hd[1] - 16, 16, 9); } },
  wren: { body: '#1a0c12', sw: 9, hw: 8.5, lw: 6.5, weapon: 'pipe', gun: 'pistol', head: (g, e, hd, f, glow) => {
      g.fillStyle = '#ff6b5e'; g.beginPath(); g.moveTo(hd[0] - f * 9, hd[1] - 5); g.lineTo(hd[0] - f * 4, hd[1] - 17); g.lineTo(hd[0] + f * 1, hd[1] - 11); g.lineTo(hd[0] + f * 5, hd[1] - 18); g.lineTo(hd[0] + f * 9, hd[1] - 6); g.fill();
      const s = Math.sin(T * 6) * 4; g.strokeStyle = '#ff3b3b'; g.lineWidth = 4; g.beginPath(); g.moveTo(hd[0], hd[1] + 9); g.quadraticCurveTo(hd[0] - f * 18, hd[1] + 12 + s, hd[0] - f * 30, hd[1] + 6 - s); g.stroke(); } }
};
function drawEnemy(g, e) {
  const fn = DRAW[e.def.draw]; if (fn) fn(g, e); else drawHumanoid(g, e, Object.assign({ glow: e.glowCol }, LOOKS[e.def.draw] || LOOKS.junkie));
}
const DRAW = {
  hound(g, e) {
    const f = e.face, t = e.anim * (e.moving ? 14 : 3), lunge = e.state === 'lunge', down = e.state === 'ko' || e.state === 'down';
    g.save(); g.translate(e.x, e.y); if (down) { g.rotate(f * .25); g.translate(0, 2); }
    g.globalAlpha = .35; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, 24, 4, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    const len = lunge ? 30 : 22, by = -24 + (e.state === 'windup' ? 5 : 0);
    g.lineCap = 'round';
    const legs = [[len - 6, 0], [len - 12, 1.5], [-len + 8, 3], [-len + 14, 4.5]];
    for (const [lx, o] of legs) { const sw = Math.sin(t + o) * (e.moving || lunge ? 8 : 1); g.strokeStyle = e.glowCol; g.lineWidth = 6; g.beginPath(); g.moveTo(lx * f * .5, by + 4); g.lineTo((lx * .5 + sw) * f, 0); g.stroke(); g.strokeStyle = '#141018'; g.lineWidth = 3; g.stroke(); }
    g.globalAlpha = .2; g.fillStyle = e.glowCol; g.beginPath(); g.ellipse(0, by, len * .7 + 6, 13, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    g.fillStyle = '#141018'; g.strokeStyle = e.glowCol; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, by, len * .7, 9, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(f * (len * .7 + 6), by - 6, 10, 7, f * .3, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#ff2050'; g.fillRect(f * (len * .7 + 9) - 2, by - 9, 4, 3);
    g.strokeStyle = e.glowCol; g.lineWidth = 2; g.beginPath(); g.moveTo(-f * len * .7, by - 2); g.lineTo(-f * (len * .7 + 12), by - 10 + Math.sin(t) * 3); g.stroke();
    for (let i = -2; i <= 2; i++) { g.fillStyle = '#5a6278'; g.fillRect(i * 6 * f - 2, by - 12, 4, 4); }
    g.restore();
  },
  drone(g, e) {
    const f = e.face, y = e.y - 78 + Math.sin(e.anim * 3) * 4, down = e.state === 'ko';
    g.save(); g.translate(e.x, down ? e.y - 10 : y); if (down) g.rotate(.5);
    if (!down) { g.globalAlpha = .25; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, e.y - y, 18, 3, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
    g.globalAlpha = .2; g.fillStyle = e.glowCol; g.beginPath(); g.ellipse(0, 0, 30, 14, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = e.glowCol; g.lineWidth = 2; g.beginPath(); g.moveTo(-26, -4); g.lineTo(26, -4); g.stroke();
    for (const rx of [-26, 26]) { g.fillStyle = 'rgba(200,220,255,.25)'; g.beginPath(); g.ellipse(rx, -7, 12 * Math.abs(Math.sin(T * 40 + rx)), 2, 0, 0, 7); g.fill(); }
    g.fillStyle = '#121828'; g.beginPath(); g.ellipse(0, 0, 18, 9, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, -4, 9, Math.PI, 0); g.fill(); g.stroke();
    glowBlob(g, f * 9, 2, 8, 'rgba(255,30,60,1)', e.state === 'windup' ? 1 : .6); g.fillStyle = '#ff3050'; g.beginPath(); g.arc(f * 9, 2, 3, 0, 7); g.fill();
    g.restore();
  },
  mech(g, e) {
    const f = e.face, t = e.anim * (e.moving ? 6 : 1.5), down = e.state === 'ko';
    g.save(); g.translate(e.x, e.y); if (down) { g.rotate(-f * .3); g.translate(0, 10); }
    g.globalAlpha = .4; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, 40, 6, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    const by = -78 + (e.state === 'windup' ? 6 : 0) + Math.sin(t) * 1.5;
    g.lineCap = 'round';
    for (const [o, d] of [[0, 1], [Math.PI, 0]]) {
      const sw = Math.sin(t + o) * (e.moving ? 10 : 0);
      g.strokeStyle = d ? e.glowCol : shade(e.glowCol); g.lineWidth = 17; g.beginPath(); g.moveTo(d ? 8 * f : -8 * f, by + 30); g.lineTo(sw * f + (d ? 12 : -6) * f, by + 56); g.lineTo(sw * f + (d ? 8 : -10) * f, 0); g.stroke();
      g.strokeStyle = '#1b2236'; g.lineWidth = 12; g.stroke();
      g.fillStyle = '#1b2236'; g.fillRect(sw * f + (d ? 8 : -10) * f - 12, -6, 24, 6);
    }
    g.globalAlpha = .2; g.fillStyle = e.glowCol; g.fillRect(-34, by - 34, 68, 68); g.globalAlpha = 1;
    g.fillStyle = '#18203a'; g.strokeStyle = e.glowCol; g.lineWidth = 3; g.fillRect(-28, by - 28, 56, 58); g.strokeRect(-28, by - 28, 56, 58);
    g.fillStyle = 'rgba(255,220,80,.9)'; g.fillRect(-28, by + 18, 56, 5); g.fillStyle = '#18203a'; for (let i = -24; i < 28; i += 10) g.fillRect(i, by + 18, 5, 5);
    g.fillStyle = e.state === 'windup' ? '#ff3050' : '#36f3ff'; g.fillRect(f > 0 ? 2 : -22, by - 18, 20, 7);
    // shoulder + cannon arm
    g.fillStyle = '#222b48'; g.fillRect(f * 22 - 12, by - 34, 24, 18); g.strokeRect(f * 22 - 12, by - 34, 24, 18);
    const ax = f * 30, ay = by - 2 + (e.attackKind === 'stomp' && e.state === 'windup' ? -20 : 0);
    g.fillStyle = '#2a3354'; g.fillRect(f > 0 ? ax : ax - 46, ay - 7, 46, 14); g.strokeRect(f > 0 ? ax : ax - 46, ay - 7, 46, 14);
    if (e.flashT > 0) glowBlob(g, ax + f * 50, ay, 22, 'rgba(255,220,120,.9)', 1);
    g.restore();
  }
};

// ---------------------------------------------------------------- INPUT STATE
const IN = { l: 0, r: 0, u: 0, d: 0, light: 0, heavy: 0, block: 0, dodge: 0, shoot: 0, power: 0 };
const PR = {}; // edge-pressed this frame
function press(k) { if (!IN[k]) PR[k] = 1; IN[k] = 1; }
function release(k) { IN[k] = 0; }
function clearInput() { for (const k in IN) IN[k] = 0; for (const k in PR) delete PR[k]; }

// ---------------------------------------------------------------- FIGHT
let F = null;
function weaponStats() {
  const mw = getW(S.melee) || S.weapons[0], gw = S.gun ? getW(S.gun) : null;
  const cnt = (w, m) => w.mods.filter(x => x === m).length;
  const elem = w => w.mods.find(m => m && MODS[m].elem) || null;
  const m = { dmg: mw.dmg * (1 + .15 * cnt(mw, 'dmg')) * (has('street', 1) ? 1.15 : 1), spd: mw.spd * (1 + .12 * cnt(mw, 'spd')), range: WEAPONS[mw.base].range, elem: elem(mw), look: WEAPONS[mw.base].look };
  let g = null;
  if (gw) {
    const b = WEAPONS[gw.base];
    g = { dmg: gw.dmg * (1 + .15 * cnt(gw, 'dmg')) * (has('iron', 1) ? 1.15 : 1) * (perk('hollow') ? 1.2 : 1), rate: b.rate / (1 + .12 * cnt(gw, 'spd')) / (has('iron', 3) ? 1.25 : 1),
      pellets: b.pellets || 1, pierce: b.pierce || has('iron', 6), elem: elem(gw), look: b.look };
  }
  return { m, g };
}
function lvlScale(lvl, boss) { return { hp: 1 + (boss ? .08 : .2) * (lvl - 1), dmg: 1 + .1 * (lvl - 1) }; }
function startFight(cfg, onEnd) {
  const ws = weaponStats();
  mode = 'fight'; computeView();
  const P = { x: 140, y: LANE_Y[1], lane: 1, face: 1, hp: maxHp(), maxHp: maxHp(), sta: maxSta(), maxSta: maxSta(), state: 'idle', st: 0, ph: 0, anim: 0,
    comboIdx: 0, buf: 0, chargeT: 0, invT: 0, vx: 0, powerCd: 0, shootCd: 0, shootT: 0, flashT: 0, aimA: 0, pulseT: 0, ghostReady: 0, secondUsed: 0, staDelay: 0,
    hitSet: null, blockT: 0, ws, elemCol: ws.m.elem ? MODS[ws.m.elem].col : null };
  const list = cfg.list ? cfg.list.slice() : Array.from({ length: RI(cfg.count[0], cfg.count[1]) }, () => pick(cfg.pool));
  F = { cfg, dist: cfg.district || district(), p: P, enemies: [], queue: list, projs: [], parts: [], floats: [], fxs: [], pickups: [],
    hitstop: 0, shake: 0, slowT: 0, t: 0, spawnT: .3, maxActive: cfg.maxActive || 3, over: false, overT: 0, won: false,
    loot: { creds: 0, scrap: 0, chrome: 0, xp: 0, items: [], elites: 0 }, combo: 0, comboT: 0, bestCombo: 0, banner: { txt: 'FIGHT!', t: 1.1 }, target: null, onEnd,
    total: list.length, eliteCount: 0, tip: cfg.tutorial ? 0 : -1, title: cfg.title || '' };
  if (cfg.eliteFirst) F.forceElite = 1;
  showScreen('fight');
}
function spawnEnemy(id) {
  const def = ENEMIES[id], sc = lvlScale(F.cfg.lvl || 1, def.boss);
  let elite = !def.boss && !F.cfg.noElite && (F.forceElite || rnd() < .15);
  if (F.forceElite) F.forceElite = 0;
  const side = F.enemies.length % 2 === 0 ? (F.p.x < 320 ? 1 : -1) : (rnd() < .5 ? 1 : -1);
  const lane = def.ai === 'drone' ? RI(0, 1) : RI(0, 1);
  const hp = Math.round(def.hp * sc.hp * (elite ? 1.6 : 1));
  const e = { id, def, x: side > 0 ? 680 : -40, y: LANE_Y[lane], lane, face: -side, hp, maxHp: hp, dmg: def.dmg * sc.dmg * (elite ? 1.25 : 1), elite,
    state: 'enter', st: 0, ph: 0, anim: R(0, 5), cd: R(.6, 1.4), vx: 0, laneT: R(.3, .9), glowCol: elite ? '#ffcf4a' : '#ff3fd2', shieldUp: !!def.shield, shieldT: 0,
    burn: 0, burnD: 0, stag: 0, combo: 0, w: def.ai === 'mech' ? 30 : def.ai === 'hound' ? 22 : 14, alive: true, gunCd: R(1.5, 3) };
  if (id === 'wren2') { e.look = Object.assign({}, LOOKS.wren, { weapon: 'katana' }); }
  if (def.boss) F.boss = e;
  if (elite) F.eliteCount++;
  F.enemies.push(e);
  return e;
}
const aliveEnemies = () => F.enemies.filter(e => e.alive);
function nearestEnemy(x, lane, pref) {
  let best = null, bd = 1e9;
  for (const e of F.enemies) { if (!e.alive || e.state === 'enter' && (e.x < 0 || e.x > W)) continue; const d = Math.abs(e.x - x) + (e.lane !== lane ? (pref ? 140 : 60) : 0); if (d < bd) { bd = d; best = e; } }
  return best;
}
function addFloat(x, y, txt, col, size) { F.floats.push({ x, y, txt, col: col || '#fff', t: 0, size: size || 14 }); }
function sparks(x, y, n, col, spd) {
  for (let i = 0; i < n && F.parts.length < 220; i++) { const a = R(0, Math.PI * 2), v = R(.3, 1) * (spd || 220); F.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: 0, life: R(.2, .45), col, s: R(1.5, 3), g: 400 }); }
}
function shake(a) { F.shake = Math.max(F.shake, a); }
function stop(t) { F.hitstop = Math.max(F.hitstop, t); }

// ---- damage to enemies
function hurtEnemy(e, dmg, o) {
  if (!e.alive) return false;
  const P = F.p;
  const front = (P.x - e.x) * e.face > 0; // attacker in front of enemy
  let elem = o.elem;
  // shields
  if (e.shieldUp && front && !o.guardBreak && elem !== 'emp') {
    dmg *= .15; addFloat(e.x, e.y - 90, 'BLOCKED', '#9fc0ff', 11); sparks(e.x + e.face * 10, e.y - 50, 6, '#9fc0ff');
    stop(.03); if (o.src === 'melee') { P.state = 'hurt'; P.st = .18; P.vx = -P.face * 120; }
  } else if (e.shieldUp && (o.guardBreak || elem === 'emp') && front) {
    e.shieldUp = false; e.shieldT = 4.5; e.state = 'stun'; e.st = 1; addFloat(e.x, e.y - 95, 'GUARD BREAK', '#ffcf4a', 13); sparks(e.x, e.y - 50, 14, '#9fc0ff', 300);
  }
  if (e.def.armor && !o.heavy && o.src !== 'power') dmg *= 1 - e.def.armor;
  if (elem === 'emp' && (e.def.mech || e.def.shield)) { dmg *= 1.7; sparks(e.x, e.y - 50, 6, '#b48cff'); }
  if (o.ghost) dmg *= 1.8;
  dmg = Math.max(1, Math.round(dmg * R(.92, 1.08)));
  e.hp -= dmg;
  F.combo++; F.comboT = 1.8; F.bestCombo = Math.max(F.bestCombo, F.combo);
  addFloat(e.x + R(-8, 8), e.y - (e.def.ai === 'drone' ? 100 : e.def.ai === 'mech' ? 130 : 95), (o.crit ? 'CRIT ' : '') + dmg, o.crit ? '#ffcf4a' : o.heavy ? '#ff8a5c' : '#ffffff', o.heavy || o.crit ? 18 : 14);
  sparks(e.x - (e.x - P.x > 0 ? 8 : -8), e.y - (e.def.ai === 'drone' ? 78 : 50), o.heavy ? 14 : 7, o.heavy ? '#ffb347' : '#fff3c0');
  F.fxs.push({ k: 'hit', x: e.x, y: e.y - (e.def.ai === 'drone' ? 78 : 50), t: 0, life: .12, r: o.heavy ? 26 : 16 });
  stop(o.heavy ? .085 : .05); shake(o.heavy ? 6 : 2.5);
  if (elem === 'shock' && rnd() < .25) { e.state = 'stun'; e.st = .8; addFloat(e.x, e.y - 112, 'SHOCKED', '#7fd8ff', 11); }
  if (elem === 'burn') { e.burn = 2; e.burnD = dmg * .35 / 2; }
  if (e.def.ai === 'mech') { e.stag += dmg; if (e.stag > 110) { e.stag = 0; e.state = 'stun'; e.st = 1.3; addFloat(e.x, e.y - 150, 'STAGGERED', '#ffcf4a', 15); } }
  if (e.hp <= 0) { koEnemy(e); return true; }
  const boss = e.def.boss;
  const kb = (o.kb || 90) * (boss ? .3 : 1);
  e.vx = Math.sign(e.x - P.x || 1) * kb;
  if (o.knockdown && !boss) { e.state = 'down'; e.st = 1.1; e.downP = 0; }
  else if (o.stun) { e.state = 'stun'; e.st = o.stun; }
  else if (!boss || o.heavy) { if (e.state !== 'stun' && e.state !== 'down' && !(boss && e.state === 'windup' && e.def.ai === 'mech')) { e.state = 'hurt'; e.st = boss ? .15 : .28; } }
  if (e.def.ai === 'rival' && rnd() < .25 && e.state === 'hurt') { e.wantDodge = 1; }
  return true;
}
function koEnemy(e) {
  e.alive = false; e.state = 'ko'; e.st = 0; e.downP = 0; e.vx = Math.sign(e.x - F.p.x || 1) * 160;
  stop(.12); shake(e.def.boss ? 12 : 5);
  addFloat(e.x, e.y - 110, e.def.boss ? 'K.O.!' : 'K.O.', e.elite ? '#ffcf4a' : '#ff3fd2', e.def.boss ? 26 : 16);
  S.stats.kos++;
  const sc = 1 + .15 * ((F.cfg.lvl || 1) - 1), el = e.elite ? 2.2 : 1;
  const cr = Math.round(e.def.cr * .8 * sc * el * R(.8, 1.2) * (perk('shark') ? 1.25 : 1));
  const scrap = Math.round((RI(1, 2) + (e.elite ? 2 : 0) + (e.def.boss ? 6 : 0) + (e.def.mech ? 1 : 0)) * (perk('scrounger') ? 1.3 : 1));
  const xp = Math.round(e.def.xp * sc * (e.elite ? 2 : 1));
  F.loot.creds += cr; F.loot.scrap += scrap; F.loot.xp += xp;
  if (e.elite) F.loot.elites++;
  if (rnd() < (e.def.boss ? 1 : e.elite ? .25 : .04)) { const c = e.def.boss ? RI(1, 2) : 1; F.loot.chrome += c; F.pickups.push({ x: e.x, y: e.y - 40, k: 'chrome', t: 0 }); }
  for (let i = 0; i < Math.min(6, 2 + (cr / 10 | 0)); i++) F.pickups.push({ x: e.x + R(-10, 10), y: e.y - 40, k: i % 3 ? 'cred' : 'scrap', t: -i * .05, vx: R(-80, 80), vy: R(-160, -60) });
  sparks(e.x, e.y - 50, 18, e.elite ? '#ffcf4a' : '#ff3fd2', 280);
  if (F.target === e) F.target = null;
}
// ---- damage to player
function hurtPlayer(dmg, src, o) {
  const P = F.p; o = o || {};
  if (F.over || P.state === 'dead') return;
  if (P.invT > 0 || P.state === 'dodge' || P.state === 'power') {
    if (P.state === 'dodge' && has('ghost', 6) && !P.afterUsed) { P.afterUsed = 1; F.slowT = Math.max(F.slowT, 1); addFloat(P.x, P.y - 100, 'AFTERIMAGE', '#7dff9b', 13); }
    return;
  }
  const front = src ? (src.x - P.x) * P.face > 0 : true;
  if (P.pulseT > 0) { if (o.proj) { sparks(P.x, P.y - 50, 8, '#ff3fd2'); return; } dmg *= .5; }
  if (P.state === 'block' && front && !o.unblockable) {
    if (has('ghost', 4) && P.blockT < .18 && o.melee && src) {
      addFloat(P.x, P.y - 100, 'PARRY!', '#7dff9b', 16); src.state = 'stun'; src.st = 1; sparks(P.x + P.face * 14, P.y - 55, 14, '#7dff9b', 300); stop(.1); shake(4); return;
    }
    dmg *= o.proj ? .3 : .2; P.sta -= 12; P.staDelay = .6;
    sparks(P.x + P.face * 14, P.y - 55, 6, '#8aa4ff');
    if (P.sta <= 0) { P.sta = 0; P.state = 'hurt'; P.st = .6; addFloat(P.x, P.y - 100, 'GUARD BROKEN', '#ff6b5e', 13); }
  }
  if (perk('skin')) dmg *= .88;
  dmg = Math.max(1, Math.round(dmg));
  P.hp -= dmg;
  addFloat(P.x, P.y - 96, '-' + dmg, '#ff5a6e', 14);
  shake(o.knockdown ? 8 : 4); stop(.05);
  if (P.state !== 'block') {
    sparks(P.x, P.y - 50, 8, '#ff5a6e');
    if (o.knockdown) { P.state = 'down'; P.st = .9; P.downP = 0; P.vx = (src ? Math.sign(P.x - src.x) : -P.face) * 200; }
    else { P.state = 'hurt'; P.st = .26; P.vx = (src ? Math.sign(P.x - src.x) : -P.face) * 110; }
    P.comboIdx = 0; P.buf = 0;
  }
  if (P.hp <= 0) {
    if (perk('second') && !P.secondUsed) { P.secondUsed = 1; P.hp = Math.round(P.maxHp * .3); P.invT = 1.2; addFloat(P.x, P.y - 115, 'SECOND CHANCE', '#7dff9b', 15); return; }
    P.hp = 0; P.state = 'dead'; P.st = 0; P.downP = 0; F.over = true; F.won = false; F.overT = 2; F.banner = { txt: 'DOWN', t: 2, col: '#ff5a6e' };
  }
}

// ---- player update
function playerAttackHit(kind) {
  const P = F.p, ws = P.ws.m;
  let mult = kind === 'heavy' ? (1.8 + 1.2 * P.chargeT) * (has('street', 4) ? 1.35 : 1) : [1, 1, 1.4, 1.6][P.comboIdx];
  const range = ws.range + (kind === 'heavy' ? 8 : 0), both = kind === 'spin';
  let any = false;
  for (const e of F.enemies) {
    if (!e.alive || e.lane !== P.lane) continue;
    const dx = (e.x - P.x) * P.face;
    if ((both ? Math.abs(dx) : dx) < range + e.w && (both || dx > -12)) {
      const ghost = P.ghostReady; P.ghostReady = 0;
      const kd = (kind === 'heavy' && P.chargeT > .6) || (kind === 'light' && P.comboIdx === 2 && has('street', 2)) || both;
      hurtEnemy(e, ws.dmg * mult, { src: 'melee', heavy: kind === 'heavy', guardBreak: kind === 'heavy', kb: kind === 'heavy' ? 260 : P.comboIdx === 2 ? 170 : 70, knockdown: kd, elem: ws.elem, ghost });
      any = true;
      if (has('street', 5)) P.hp = Math.min(P.maxHp, P.hp + 2);
    }
  }
  F.fxs.push({ k: 'arc', x: P.x + P.face * 18, y: P.y - 58, f: P.face, t: 0, life: .14, r: range * .8, heavy: kind === 'heavy', both, col: ws.elem ? MODS[ws.elem].col : '#bff8ff' });
  if (!any && kind === 'heavy') shake(2);
}
function doShoot() {
  const P = F.p, g = P.ws.g;
  if (!g) { addFloat(P.x, P.y - 100, 'NO GUN', '#9fb3c8', 11); P.shootCd = .5; return; }
  if (S.ammo <= 0) { addFloat(P.x, P.y - 100, 'NO AMMO · craft at bench', '#ffb347', 11); P.shootCd = .6; return; }
  let t = F.target && F.target.alive ? F.target : nearestEnemy(P.x, P.lane, false);
  if (!t) return;
  F.target = t;
  P.face = t.x >= P.x ? 1 : -1;
  const ty = t.def.ai === 'drone' ? t.y - 78 : t.y - 52, sy = P.y - 62;
  const dx = t.x - P.x, dy = ty - sy, d = Math.hypot(dx, dy) || 1;
  P.aimA = clamp(-Math.atan2(dy, Math.abs(dx)), -.6, .6) * -1;
  for (let i = 0; i < g.pellets; i++) {
    const spr = g.pellets > 1 ? (i - 1) * .06 : 0;
    const ang = Math.atan2(dy, dx) + spr;
    const crit = has('iron', 4) && rnd() < .2;
    F.projs.push({ k: 'pb', x: P.x + P.face * 22, y: sy, vx: Math.cos(ang) * 950, vy: Math.sin(ang) * 950, lane: t.lane, dmg: g.dmg * (crit ? 2 : 1), crit, pierce: g.pierce, elem: g.elem, life: .7, hit: [] });
  }
  if (!(has('iron', 5) && rnd() < .3)) S.ammo--;
  P.shootCd = g.rate; P.shootT = .22; P.flashT = .06; shake(1.5);
}
function doPower() {
  const P = F.p, id = S.power;
  if (!id) { addFloat(P.x, P.y - 100, 'NO IMPLANT · see Ripperdoc', '#c9a0ff', 11); P.powerCd = .6; return; }
  if (P.powerCd > 0) return;
  const imp = IMPLANTS[id];
  P.powerCd = imp.cd * (perk('cold') ? .75 : 1);
  addFloat(P.x, P.y - 112, imp.name.toUpperCase(), '#ff3fd2', 14);
  if (id === 'mantis') { const t = nearestEnemy(P.x, P.lane, true); if (t && t.lane === P.lane) P.face = t.x > P.x ? 1 : -1; P.state = 'power'; P.st = .3; P.vx = 560 * P.face; P.hitSet = []; }
  else if (id === 'pulse') { P.pulseT = 3; }
  else if (id === 'overclock') { F.slowT = 2; }
  else if (id === 'static') {
    const list = aliveEnemies().sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x)).slice(0, 3);
    let px = P.x, py = P.y - 60;
    for (const e of list) {
      const ey = e.def.ai === 'drone' ? e.y - 78 : e.y - 55;
      F.fxs.push({ k: 'bolt', x1: px, y1: py, x2: e.x, y2: ey, t: 0, life: .35 }); px = e.x; py = ey;
      hurtEnemy(e, Math.max(30, P.ws.m.dmg * 2.4), { src: 'power', stun: 1.2, elem: 'shock' });
    }
  }
}
function updatePlayer(dt) {
  const P = F.p; P.anim += dt;
  for (const k of ['invT', 'shootCd', 'shootT', 'flashT', 'powerCd', 'pulseT', 'staDelay']) if (P[k] > 0) P[k] -= dt;
  P.y += clamp(LANE_Y[P.lane] - P.y, -260 * dt, 260 * dt);
  if (P.vx) { P.x += P.vx * dt; P.vx *= Math.pow(.0008, dt); if (Math.abs(P.vx) < 5) P.vx = 0; }
  P.x = clamp(P.x, XMIN, XMAX);
  if (P.state === 'dead') { P.downP = Math.min(1, (P.downP || 0) + dt * 4); return; }
  const regen = 34 * (has('ghost', 2) ? 1.35 : 1) * (S.implants.includes('synapse') ? 1.2 : 1);
  if (P.state !== 'block' && P.staDelay <= 0) P.sta = Math.min(P.maxSta, P.sta + regen * dt);
  if (F.over && F.won) { P.state = 'idle'; P.moving = 0; return; }
  const dodgeCost = 22 * (has('ghost', 1) ? .7 : 1);
  const canDodge = () => PR.dodge && P.sta >= dodgeCost * .6;
  const startDodge = () => {
    const dir = IN.l ? -1 : IN.r ? 1 : P.face; P.face = dir;
    P.state = 'dodge'; P.st = .28 * (has('ghost', 3) ? 1.4 : 1); P.vx = 340 * dir; P.sta -= dodgeCost; P.staDelay = .5; P.afterUsed = 0;
    if (has('ghost', 5)) P.ghostReady = 1;
    if (IN.u && P.lane > 0) P.lane = 0; else if (IN.d && P.lane < 1) P.lane = 1;
  };
  const faceNearest = () => { if (IN.l) P.face = -1; else if (IN.r) P.face = 1; else { const t = nearestEnemy(P.x, P.lane, true); if (t && t.lane === P.lane) P.face = t.x > P.x ? 1 : -1; } };
  P.moving = 0;
  switch (P.state) {
    case 'hurt': P.st -= dt; if (P.st <= 0) P.state = 'idle'; break;
    case 'down': P.st -= dt; P.downP = Math.min(1, (P.downP || 0) + dt * 5); if (P.st <= 0) { P.state = 'idle'; P.invT = .9; } break;
    case 'dodge': P.st -= dt; if (P.st <= 0) { P.state = 'idle'; P.vx *= .2; } break;
    case 'power': {
      P.st -= dt; P.invT = .1;
      for (const e of F.enemies) if (e.alive && e.lane === P.lane && Math.abs(e.x - P.x) < 34 + e.w && !P.hitSet.includes(e)) { P.hitSet.push(e); hurtEnemy(e, P.ws.m.dmg * 2.6, { src: 'power', heavy: true, guardBreak: true, kb: 200, knockdown: true }); }
      if (P.st <= 0) { P.state = 'idle'; P.vx = 0; }
      break;
    }
    case 'light': case 'spin': {
      const dur = (P.state === 'spin' ? .36 : .32) / P.ws.m.spd;
      const prev = P.ph; P.ph += dt / dur;
      if (prev < .45 && P.ph >= .45) playerAttackHit(P.state === 'spin' ? 'spin' : 'light');
      if (PR.light && P.ph > .3) P.buf = 1;
      if (canDodge()) { startDodge(); break; }
      const maxC = has('street', 6) ? 4 : 3;
      if ((P.buf && P.ph >= .72) || P.ph >= 1) {
        if (P.buf && P.comboIdx < maxC - 1) { P.comboIdx++; P.buf = 0; P.ph = 0; faceNearest(); P.state = P.comboIdx === 3 ? 'spin' : 'light'; P.x += P.face * 6; }
        else if (P.ph >= 1) { P.state = 'idle'; P.comboIdx = 0; P.buf = 0; P.recoverT = .08; }
      }
      break;
    }
    case 'charge':
      P.chargeT = Math.min(1, P.chargeT + dt / (.7 / (has('street', 3) ? 1.4 : 1)));
      if (!IN.heavy) { P.state = 'heavy'; P.ph = 0; P.comboIdx = 0; }
      if (canDodge()) startDodge();
      break;
    case 'heavy': { const prev = P.ph; P.ph += dt / .42; if (prev < .5 && P.ph >= .5) { P.x += P.face * 10; playerAttackHit('heavy'); } if (P.ph >= 1) { P.state = 'idle'; P.chargeT = 0; } break; }
    case 'block':
      P.blockT += dt;
      if (!IN.block) P.state = 'idle';
      if (canDodge()) startDodge();
      break;
    default: {
      if (P.recoverT > 0) { P.recoverT -= dt; }
      if (canDodge()) { startDodge(); break; }
      if (PR.power) { doPower(); if (P.state === 'power') break; }
      if (PR.heavy) { faceNearest(); P.state = 'charge'; P.chargeT = 0; break; }
      if (PR.light) { faceNearest(); P.state = 'light'; P.ph = 0; P.comboIdx = 0; P.buf = 0; break; }
      if (IN.block) { P.state = 'block'; P.blockT = 0; break; }
      if ((PR.shoot || IN.shoot) && P.shootCd <= 0) doShoot();
      if (PR.u && P.lane > 0) P.lane = 0;
      if (PR.d && P.lane < 1) P.lane = 1;
      const mv = (IN.r ? 1 : 0) - (IN.l ? 1 : 0);
      if (mv) { P.x += mv * 165 * (P.shootT > 0 ? .5 : 1) * dt; if (P.shootT <= 0) P.face = mv; P.moving = 1; P.state = 'walk'; } else P.state = 'idle';
    }
  }
}

// ---- enemy AI
function attackers() { return F.enemies.filter(e => e.alive && (e.state === 'windup' || e.state === 'attack' || e.state === 'lunge')).length; }
function enemyFace(e, P, slow) { const want = P.x > e.x ? 1 : -1; if (want !== e.face) { e.turnT = (e.turnT || 0) + (slow || 0); if (!slow || e.turnT > slow) { e.face = want; e.turnT = 0; } } }
function enemyMelee(e, dmgMul, o) {
  const P = F.p, dx = (P.x - e.x) * e.face;
  if (P.lane === e.lane && dx > -10 && dx < e.def.range + 10) hurtPlayer(e.dmg * (dmgMul || 1), e, Object.assign({ melee: 1 }, o || {}));
}
function updateEnemy(e, dt) {
  const P = F.p, d = e.def;
  e.anim += dt; e.st -= dt; e.cd -= dt; e.moving = 0;
  if (e.vx) { e.x += e.vx * dt; e.vx *= Math.pow(.002, dt); if (Math.abs(e.vx) < 4) e.vx = 0; }
  e.y += clamp(LANE_Y[e.lane] - e.y, -150 * dt, 150 * dt);
  if (e.flashT > 0) e.flashT -= dt;
  if (e.burn > 0 && e.alive) { e.burn -= dt; e.hp -= e.burnD * dt; if (rnd() < .3) F.parts.push({ x: e.x + R(-8, 8), y: e.y - R(20, 80), vx: 0, vy: -60, t: 0, life: .4, col: '#ff8a3c', s: 2.5, g: 0 }); if (e.hp <= 0) koEnemy(e); }
  if (e.shieldT > 0) { e.shieldT -= dt; if (e.shieldT <= 0 && d.shield) e.shieldUp = true; }
  if (e.state === 'ko') { e.downP = Math.min(1, (e.downP || 0) + dt * 4); return; }
  if (!e.alive) return;
  const dx = P.x - e.x, adx = Math.abs(dx);
  const sameLane = P.lane === e.lane;
  const moveTo = (tx, spd) => { const m = clamp(tx - e.x, -spd * dt, spd * dt); if (Math.abs(m) > .3) { e.x += m; e.moving = 1; } };
  const laneFollow = (rate) => { if (e.lane !== P.lane) { e.laneT -= dt; if (e.laneT <= 0) { e.lane = P.lane; e.laneT = R(.4, 1) * (rate || 1); } } };
  switch (e.state) {
    case 'enter': moveTo(e.x < 320 ? 70 : 570, d.spd * 1.1); e.face = e.x < 320 ? 1 : -1; if (e.x > 50 && e.x < 590) { e.state = 'idle'; e.st = R(.2, .6); } return;
    case 'hurt': if (e.st <= 0) e.state = 'idle'; return;
    case 'stun': if (e.st <= 0) e.state = 'idle'; return;
    case 'down': e.downP = Math.min(1, (e.downP || 0) + dt * 5); if (e.st <= 0) { e.state = 'idle'; e.downP = 0; e.cd = Math.max(e.cd, .6); } return;
    case 'windup':
      if (e.st <= 0) { e.state = 'attack'; e.st = .18; enemyStrike(e); }
      return;
    case 'attack': if (e.st <= 0) { e.state = 'recover'; e.st = d.ai === 'mech' ? .7 : .35; } return;
    case 'lunge': {
      e.x += e.vx * dt; e.vx *= Math.pow(.2, dt);
      if (!e.hitDone && P.lane === e.lane && Math.abs(P.x - e.x) < 26) { e.hitDone = 1; hurtPlayer(e.dmg * (d.ai === 'rival' ? 1.4 : 1), e, { melee: 1 }); }
      if (e.st <= 0) { e.state = 'recover'; e.st = .5; e.vx = 0; }
      e.x = clamp(e.x, XMIN, XMAX); return;
    }
    case 'recover': if (e.st <= 0) { e.state = 'idle'; } return;
    case 'block': if (e.st <= 0) e.state = 'idle'; return;
  }
  // idle / approach decision
  const slowCd = F.boss && F.boss.def.ai === 'mech' && F.boss.hp < F.boss.maxHp * .5 ? .75 : 1;
  const canAttack = e.cd <= 0 && attackers() < (d.boss ? 3 : 2);
  const tele = (t, kind) => { e.state = 'windup'; e.st = t; e.attackKind = kind; e.cd = d.cd * R(.85, 1.2) * slowCd; };
  switch (d.ai) {
    case 'melee': case 'cop': {
      enemyFace(e, P, d.ai === 'cop' ? .55 : 0);
      laneFollow(d.ai === 'cop' ? 1.4 : 1);
      if (d.erratic && rnd() < dt * .8) { e.vx = R(-120, 120); }
      if (adx > d.range * .8 || !sameLane) moveTo(P.x - Math.sign(dx) * d.range * .7, d.spd * (adx > 200 ? 1.15 : 1));
      else if (canAttack && sameLane) tele(d.windup * R(.9, 1.1), 'melee');
      break;
    }
    case 'ranged': {
      enemyFace(e, P);
      const want = clamp(e.x, 40, 600);
      if (adx < d.keep[0]) moveTo(e.x - Math.sign(dx) * 60, d.spd);
      else if (adx > d.keep[1]) moveTo(P.x - Math.sign(dx) * d.keep[1], d.spd);
      else if (want !== e.x) moveTo(want, d.spd);
      if (rnd() < dt * .3 && e.lane !== P.lane) e.lane = P.lane;
      if (canAttack && adx < 330) tele(d.windup, 'throw');
      else if (adx < 34 && sameLane && e.cd <= 0) tele(.4, 'melee');
      break;
    }
    case 'hound': {
      enemyFace(e, P); laneFollow(.6);
      if (adx > 120 || !sameLane) moveTo(P.x - Math.sign(dx) * 100, d.spd);
      else if (canAttack) tele(d.windup, 'lunge');
      else moveTo(P.x - Math.sign(dx) * 130, d.spd * .5);
      break;
    }
    case 'drone': {
      enemyFace(e, P);
      if (e.lane !== P.lane) { e.laneT -= dt; if (e.laneT <= 0) { e.lane = P.lane; e.laneT = R(1.2, 2); } }
      const tx = clamp(P.x - Math.sign(dx || 1) * 210, 40, 600);
      moveTo(tx, d.spd);
      if (canAttack && sameLane) { tele(d.windup, 'laser'); e.aimX = P.x; }
      break;
    }
    case 'collector': {
      enemyFace(e, P); laneFollow(1.2);
      if (adx < d.keep[0]) moveTo(e.x - Math.sign(dx) * 60, d.spd); else if (adx > d.keep[1] || !sameLane) moveTo(P.x - Math.sign(dx) * 150, d.spd);
      if (canAttack && sameLane && adx < 230) tele(d.windup, 'shotgun');
      else if (adx < 34 && sameLane && e.cd <= 0) tele(.45, 'melee');
      break;
    }
    case 'mech': {
      enemyFace(e, P, .8); laneFollow(1.6);
      if (canAttack) {
        const r = rnd();
        if (adx < d.range + 10 && sameLane && r < .55) tele(d.windup, 'slam');
        else if (r < .75 || !sameLane) tele(1.05, 'stomp');
        else if (sameLane) tele(.75, 'burst');
        else moveTo(P.x, d.spd);
      } else if (adx > d.range) moveTo(P.x - Math.sign(dx) * d.range * .8, d.spd);
      break;
    }
    case 'rival': {
      enemyFace(e, P); laneFollow(.5);
      // react to player's attack windups
      if ((P.state === 'light' || P.state === 'charge') && sameLane && adx < 70 && rnd() < dt * (P.state === 'charge' ? 2.5 : 3.5)) {
        if (P.state === 'charge' || rnd() < .4) { e.state = 'lunge'; e.vx = -Math.sign(dx) * 330; e.st = .22; e.hitDone = 1; return; }
        e.state = 'block'; e.st = .5; return;
      }
      if (e.wantDodge) { e.wantDodge = 0; e.lane = 1 - e.lane; e.vx = -Math.sign(dx) * 260; break; }
      e.gunCd -= dt;
      if (d.gun && e.gunCd <= 0 && adx > 150) { e.gunCd = R(2, 3.2); tele(.45, 'shot'); break; }
      if (d.lunge && canAttack && adx > 110 && adx < 240 && sameLane && rnd() < .5) { tele(.45, 'lunge'); break; }
      if (adx > d.range * .8 || !sameLane) moveTo(P.x - Math.sign(dx) * d.range * .7, d.spd);
      else if (canAttack) { e.combo = RI(1, 3); tele(d.windup, 'combo'); }
      break;
    }
  }
  e.x = clamp(e.x, XMIN, XMAX);
}
function enemyStrike(e) {
  const P = F.p, d = e.def, k = e.attackKind;
  if (k === 'melee' || k === 'combo') {
    enemyMelee(e);
    if (k === 'combo' && --e.combo > 0) { e.state = 'windup'; e.st = .22; e.attackKind = 'combo'; }
  } else if (k === 'slam') { enemyMelee(e, 1, { knockdown: 1 }); shake(7); sparks(e.x + e.face * 50, e.y, 12, '#ffcf4a'); }
  else if (k === 'throw') {
    const tx = P.x + (IN.l ? -40 : IN.r ? 40 : 0);
    F.projs.push({ k: 'bottle', x0: e.x, x: e.x, x1: clamp(tx, XMIN, XMAX), lane: P.lane, y0: e.y - 70, t: 0, dur: .85, dmg: e.dmg, src: e });
  } else if (k === 'lunge') { e.state = 'lunge'; e.st = d.ai === 'rival' ? .3 : .35; e.vx = e.face * (d.ai === 'rival' ? 520 : 400); e.hitDone = 0; }
  else if (k === 'laser') { F.projs.push({ k: 'laser', x: e.x + e.face * 12, y: e.y - 76, vx: e.face * 560, lane: e.lane, dmg: e.dmg, src: e, life: 1.4 }); e.flashT = .08; }
  else if (k === 'shot') { F.projs.push({ k: 'laser', x: e.x + e.face * 20, y: e.y - 62, vx: e.face * 620, lane: e.lane, dmg: e.dmg * .8, src: e, life: 1.2, col: '#ff6b5e' }); e.shootT = .25; e.flashT = .08; e.aimA = 0; }
  else if (k === 'shotgun') {
    e.shootT = .3; e.flashT = .1; shake(3);
    for (let i = 0; i < 8; i++) F.parts.push({ x: e.x + e.face * 30, y: e.y - 62, vx: e.face * R(300, 520), vy: R(-80, 80), t: 0, life: .3, col: '#ffcf4a', s: 2, g: 0 });
    const dx = (P.x - e.x) * e.face;
    if (P.lane === e.lane && dx > 0 && dx < 230) hurtPlayer(e.dmg * (dx < 120 ? 1 : .6), e, { proj: 1, knockdown: dx < 80 });
  } else if (k === 'stomp') {
    shake(9);
    for (const lane of [0, 1]) for (const dir of [-1, 1]) F.projs.push({ k: 'wave', x: e.x + dir * 30, lane, vx: dir * 270, dmg: e.dmg * .8, src: e, life: 2.4, hitP: 0 });
  } else if (k === 'burst') {
    for (let i = 0; i < 3; i++) F.projs.push({ k: 'laser', x: e.x + e.face * 60, y: e.y - 80, vx: e.face * 430, lane: e.lane, dmg: e.dmg * .45, src: e, life: 2, delay: i * .18, col: '#ffcf4a' });
    e.flashT = .3;
  }
}
function updateProjs(dt, es) {
  const P = F.p;
  for (const p of F.projs) {
    const d = p.k === 'pb' ? dt : dt * es;
    if (p.delay > 0) { p.delay -= d; continue; }
    if (p.k === 'pb') {
      p.x += p.vx * d; p.y += p.vy * d; p.life -= d;
      for (const e of F.enemies) {
        if (!e.alive || e.lane !== p.lane || p.hit.includes(e)) continue;
        const ey = e.def.ai === 'drone' ? e.y - 78 : e.y - 52;
        if (Math.abs(e.x - p.x) < e.w + 6 && Math.abs(ey - p.y) < 40) {
          p.hit.push(e);
          hurtEnemy(e, p.dmg, { src: 'gun', crit: p.crit, elem: p.elem, kb: 40 });
          if (!p.pierce) { p.life = 0; break; }
        }
      }
    } else if (p.k === 'bottle') {
      p.t += d; const u = p.t / p.dur; p.x = lerp(p.x0, p.x1, u);
      if (u >= 1) {
        p.life = 0;
        for (let i = 0; i < 8; i++) F.parts.push({ x: p.x, y: LANE_Y[p.lane] - 4, vx: R(-120, 120), vy: R(-180, -40), t: 0, life: .4, col: '#7dff9b', s: 2, g: 500 });
        if (P.lane === p.lane && Math.abs(P.x - p.x) < 28) hurtPlayer(p.dmg, p.src, { proj: 1 });
      }
    } else if (p.k === 'laser') {
      p.x += p.vx * d; p.life -= d;
      if (P.lane === p.lane && Math.abs(P.x - p.x) < 14) { p.life = 0; hurtPlayer(p.dmg, p.src, { proj: 1 }); sparks(p.x, p.y, 5, p.col || '#ff3050'); }
    } else if (p.k === 'wave') {
      p.x += p.vx * d; p.life -= d;
      if (!p.hitP && P.lane === p.lane && Math.abs(P.x - p.x) < 16) { p.hitP = 1; hurtPlayer(p.dmg, p.src, { proj: 1, knockdown: 1 }); }
    }
    if (p.x < -60 || p.x > W + 60) p.life = 0;
  }
  F.projs = F.projs.filter(p => p.life === undefined || p.life > 0);
}
function stepFight(dt) {
  if (!F) return;
  F.t += dt; S.stats.time += dt;
  if (F.banner.t > 0) F.banner.t -= dt;
  if (F.hitstop > 0) { F.hitstop -= dt; return; }
  const es = F.slowT > 0 ? .3 : 1; if (F.slowT > 0) F.slowT -= dt;
  F.shake *= Math.pow(.001, dt);
  if (F.comboT > 0) { F.comboT -= dt; if (F.comboT <= 0) F.combo = 0; }
  if (F.tip >= 0) F.tip += dt;
  updatePlayer(dt);
  for (const e of F.enemies) updateEnemy(e, dt * es);
  // separation
  const al = F.enemies.filter(e => e.alive && e.state !== 'enter');
  for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) {
    const a = al[i], b = al[j]; if (a.lane !== b.lane) continue;
    const dd = b.x - a.x, m = (a.w + b.w) * .9; if (Math.abs(dd) < m) { const push = (m - Math.abs(dd)) * .5 * Math.sign(dd || 1); a.x -= push; b.x += push; }
  }
  updateProjs(dt, es);
  for (const p of F.parts) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; }
  F.parts = F.parts.filter(p => p.t < p.life);
  for (const f of F.floats) { f.t += dt; f.y -= 34 * dt; }
  F.floats = F.floats.filter(f => f.t < .9);
  for (const f of F.fxs) f.t += dt; F.fxs = F.fxs.filter(f => f.t < f.life);
  for (const k of F.pickups) {
    k.t += dt; if (k.t < 0) continue;
    if (k.t < .35 && k.vx !== undefined) { k.x += k.vx * dt; k.y += k.vy * dt; k.vy += 600 * dt; }
    else { const tx = F.p.x, ty = F.p.y - 50; k.x += (tx - k.x) * Math.min(1, dt * 9); k.y += (ty - k.y) * Math.min(1, dt * 9); if (Math.abs(tx - k.x) < 10 && Math.abs(ty - k.y) < 10) k.done = 1; }
  }
  F.pickups = F.pickups.filter(k => !k.done);
  // KO'd fade out
  for (const e of F.enemies) if (!e.alive) e.koT = (e.koT || 0) + dt;
  F.enemies = F.enemies.filter(e => e.alive || e.koT < 1.6);
  // spawning
  if (!F.over) {
    F.spawnT -= dt;
    const alive = aliveEnemies().length;
    if (F.queue.length && alive < F.maxActive && F.spawnT <= 0) { spawnEnemy(F.queue.shift()); F.spawnT = alive === 0 ? .4 : 1.2; }
    if (!F.queue.length && aliveEnemies().length === 0) { F.over = true; F.won = true; F.overT = 1.6; F.banner = { txt: F.cfg.boss ? 'K.O.' : 'CLEAR', t: 1.6, col: '#36f3ff' }; }
  } else {
    F.overT -= dt;
    if (F.overT <= 0 && !F.ended) { F.ended = true; endFight(F.won); }
  }
}

// ---------------------------------------------------------------- FIGHT RENDER
function renderFight(g, dt) {
  const P = F.p;
  const sx = (rnd() - .5) * F.shake * 2, sy = (rnd() - .5) * F.shake * 2;
  g.setTransform(DPR * view.s, 0, 0, DPR * view.s, DPR * (view.x + sx * view.s), DPR * (view.y + sy * view.s));
  drawBG(g, F.dist, P.x);
  if (F.slowT > 0) { g.fillStyle = 'rgba(80,0,120,.18)'; g.fillRect(-400, -400, 1440, 1200); }
  // target reticle
  if (F.target && F.target.alive) { const t = F.target, ty = t.def.ai === 'drone' ? t.y - 78 : t.y - 50; g.strokeStyle = 'rgba(255,207,74,.8)'; g.lineWidth = 1.5; g.beginPath(); g.arc(t.x, ty, 20 + Math.sin(T * 8) * 2, 0, 7); g.stroke(); g.beginPath(); g.moveTo(t.x - 26, ty); g.lineTo(t.x - 14, ty); g.moveTo(t.x + 14, ty); g.lineTo(t.x + 26, ty); g.stroke(); }
  // telegraphs under actors
  for (const e of F.enemies) {
    if (e.state !== 'windup' || !e.alive) continue;
    if (e.attackKind === 'laser') { g.strokeStyle = `rgba(255,40,70,${.3 + .5 * Math.abs(Math.sin(T * 25))})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(e.x, e.y - 76); g.lineTo(e.face > 0 ? W + 40 : -40, e.y - 76); g.stroke(); }
    if (e.attackKind === 'stomp') { g.strokeStyle = `rgba(255,207,74,${.4 + .4 * Math.sin(T * 20)})`; g.lineWidth = 3; g.beginPath(); g.ellipse(e.x, e.y, 60 * clamp(1 - e.st, .05, 1), 10 * clamp(1 - e.st, .05, 1), 0, 0, 7); g.stroke(); }
    if (e.attackKind === 'shotgun' || e.attackKind === 'burst') { g.fillStyle = 'rgba(255,207,74,.12)'; g.beginPath(); g.moveTo(e.x + e.face * 20, e.y - 62); g.lineTo(e.x + e.face * 230, e.y - 90); g.lineTo(e.x + e.face * 230, e.y - 34); g.fill(); }
    if (e.attackKind === 'throw') { g.strokeStyle = 'rgba(125,255,155,.35)'; g.setLineDash([4, 5]); g.beginPath(); g.ellipse(F.p.x, LANE_Y[F.p.lane], 22, 5, 0, 0, 7); g.stroke(); g.setLineDash([]); }
  }
  for (const p of F.projs) if (p.k === 'bottle') { g.strokeStyle = 'rgba(125,255,155,.5)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(p.x1, LANE_Y[p.lane], 20, 4, 0, 0, 7); g.stroke(); }
  // actors sorted by depth
  const actors = F.enemies.slice(); actors.push(P);
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) {
    if (a === P) { drawPlayerActor(g, P); continue; }
    const fade = a.alive ? 1 : Math.max(0, 1 - Math.max(0, a.koT - .7) / .9);
    g.globalAlpha = fade;
    const tel = a.state === 'windup' && a.alive;
    const base = a.glowCol;
    if (tel && Math.sin(T * 30) > 0) a.glowCol = '#ffffff';
    if (a.state === 'stun' || a.state === 'hurt') a.glowCol = '#ffffff';
    drawEnemy(g, a);
    a.glowCol = base;
    if (a.state === 'stun' && a.alive) for (let i = 0; i < 3; i++) { const an = T * 5 + i * 2.1; g.fillStyle = '#ffcf4a'; g.fillRect(a.x + Math.cos(an) * 12 - 1.5, a.y - (a.def.ai === 'drone' ? 100 : 104) + Math.sin(an) * 3, 3, 3); }
    if (tel) { g.fillStyle = '#ff3050'; g.font = '900 16px ui-monospace,monospace'; g.textAlign = 'center'; g.fillText('!', a.x, a.y - (a.def.ai === 'drone' ? 102 : a.def.ai === 'mech' ? 150 : 108)); }
    g.globalAlpha = 1;
    // hp bar
    if (a.alive && !a.def.boss && a.hp < a.maxHp) { const bw = 34, by = a.y - (a.def.ai === 'drone' ? 96 : a.def.ai === 'hound' ? 46 : 100); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(a.x - bw / 2, by, bw, 4); g.fillStyle = a.elite ? '#ffcf4a' : '#ff3fd2'; g.fillRect(a.x - bw / 2, by, bw * a.hp / a.maxHp, 4); }
  }
  // projectiles
  for (const p of F.projs) {
    if (p.delay > 0) continue;
    if (p.k === 'pb') { g.strokeStyle = p.crit ? '#ffcf4a' : '#fff6b0'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .02, p.y - p.vy * .02); g.stroke(); }
    else if (p.k === 'bottle') { const u = p.t / p.dur, y = lerp(p.y0, LANE_Y[p.lane] - 6, u) - Math.sin(u * Math.PI) * 70; g.save(); g.translate(p.x, y); g.rotate(p.t * 14); g.fillStyle = '#7dff9b'; g.fillRect(-2.5, -6, 5, 12); g.restore(); }
    else if (p.k === 'laser') { const c = p.col || '#ff3050'; g.globalAlpha = .4; g.strokeStyle = c; g.lineWidth = 7; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - Math.sign(p.vx) * 22, p.y); g.stroke(); g.globalAlpha = 1; g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
    else if (p.k === 'wave') { const y = LANE_Y[p.lane]; g.strokeStyle = 'rgba(255,207,74,.8)'; g.lineWidth = 3; g.beginPath(); g.ellipse(p.x, y - 8, 8, 16, 0, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,207,74,.25)'; g.fillRect(p.x - Math.sign(p.vx) * 30, y - 4, Math.sign(p.vx) * 30, 6); }
  }
  // fx
  for (const f of F.fxs) {
    const u = f.t / f.life;
    if (f.k === 'arc') {
      g.globalAlpha = 1 - u; g.strokeStyle = f.col; g.lineWidth = f.heavy ? 6 : 3.5; g.beginPath();
      if (f.both) g.arc(f.x - f.f * 18, f.y, f.r, 0, Math.PI * 2);
      else { const a0 = f.f > 0 ? -1.2 : Math.PI + 1.2, a1 = f.f > 0 ? 1.0 : Math.PI - 1.0; g.arc(f.x, f.y, f.r * (0.8 + u * .3), Math.min(a0, a1), Math.max(a0, a1)); }
      g.stroke(); g.globalAlpha = 1;
    } else if (f.k === 'hit') { glowBlob(g, f.x, f.y, f.r * (1 + u), 'rgba(255,255,255,.9)', 1 - u); }
    else if (f.k === 'bolt') {
      g.strokeStyle = `rgba(127,216,255,${1 - u})`; g.lineWidth = 3; g.beginPath(); g.moveTo(f.x1, f.y1);
      for (let i = 1; i < 6; i++) g.lineTo(lerp(f.x1, f.x2, i / 6) + R(-8, 8), lerp(f.y1, f.y2, i / 6) + R(-8, 8)); g.lineTo(f.x2, f.y2); g.stroke();
    }
  }
  for (const p of F.parts) { g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.col; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  g.globalAlpha = 1;
  for (const k of F.pickups) { if (k.t < 0) continue; g.fillStyle = k.k === 'chrome' ? '#ff7ff0' : k.k === 'scrap' ? '#c0c9d6' : '#ffe46b'; g.beginPath(); g.arc(k.x, k.y, k.k === 'chrome' ? 4 : 2.5, 0, 7); g.fill(); }
  // floats
  g.textAlign = 'center';
  for (const f of F.floats) { g.globalAlpha = 1 - Math.max(0, f.t - .5) / .4; g.font = `900 ${f.size}px ui-monospace,Menlo,monospace`; g.fillStyle = '#000'; g.fillText(f.txt, f.x + 1, f.y + 1); g.fillStyle = f.col; g.fillText(f.txt, f.x, f.y); }
  g.globalAlpha = 1;
  drawWeather(g, dt, F.dist);
  // boss bar
  if (F.boss) {
    const b = F.boss, bw = 300; g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(170, 8, bw, 10); g.fillStyle = b.def.ai === 'mech' ? '#ffcf4a' : '#ff3fd2'; g.fillRect(170, 8, bw * Math.max(0, b.hp) / b.maxHp, 10);
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.strokeRect(170, 8, bw, 10);
    g.font = '800 10px ui-monospace,monospace'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(b.def.name.toUpperCase() + (b.def.ai === 'rival' ? ' · RIVAL' : ' · MINI-BOSS'), 320, 31);
  } else {
    g.font = '700 10px ui-monospace,monospace'; g.fillStyle = 'rgba(200,220,255,.7)'; g.textAlign = 'center';
    g.fillText(`${F.title ? F.title + ' · ' : ''}ENEMIES ${F.queue.length + aliveEnemies().length}/${F.total}`, 320, 16);
  }
  if (F.combo >= 2) { g.textAlign = 'right'; g.font = '900 22px ui-monospace,monospace'; g.fillStyle = '#ff3fd2'; g.fillText(F.combo + ' HITS', 628, 56); g.font = '700 9px ui-monospace,monospace'; g.fillStyle = '#ffb3ee'; g.fillText('COMBO', 628, 68); }
  if (F.banner.t > 0) {
    const a = Math.min(1, F.banner.t * 3); g.globalAlpha = a; g.textAlign = 'center'; g.font = '900 54px ui-monospace,Menlo,monospace';
    g.fillStyle = '#000'; g.fillText(F.banner.txt, 323, 173); g.fillStyle = F.banner.col || '#ff3fd2'; g.fillText(F.banner.txt, 320, 170); g.globalAlpha = 1;
  }
  if (F.tip >= 0 && F.tip < 22) {
    const tips = TOUCH ? ['◀ ▶ move · ▲ ▼ change lane', 'LIGHT ×3 = combo · hold HEAVY, release to smash', 'They flash white before hitting: BLOCK or DODGE'] : ['A/D move · W/S change lane', 'J ×3 = combo · hold K, release to smash', 'They flash white before hitting: L block · Space dodge'];
    const i = Math.min(2, Math.floor(F.tip / 7));
    g.textAlign = 'center'; g.font = '700 13px ui-monospace,monospace'; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(120, 40, 400, 24); g.fillStyle = '#bff8ff'; g.fillText(tips[i], 320, 57);
  }
  // vignette
  const vg = g.createRadialGradient(320, 200, 180, 320, 200, 420); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = vg; g.fillRect(-400, -400, 1440, 1200);
  updateFightHud();
}
function drawPlayerActor(g, P) {
  const look = lookPlayer();
  if (P.invT > 0 && P.state !== 'power' && Math.sin(T * 40) > 0) g.globalAlpha = .5;
  if (P.state === 'dodge') { g.globalAlpha = .25; drawHumanoid(g, { ...P, x: P.x - P.vx * .05 }, look); g.globalAlpha = .6; }
  if (P.state === 'power' && S.power === 'mantis') look.weapon = 'blades';
  if (P.state === 'charge') { glowBlob(g, P.x, P.y - 60, 30 + P.chargeT * 30, P.chargeT >= 1 ? 'rgba(255,207,74,.8)' : 'rgba(255,138,92,.6)', .5 + .3 * Math.sin(T * 30)); }
  drawHumanoid(g, P, look);
  g.globalAlpha = 1;
  if (P.pulseT > 0) { g.strokeStyle = `rgba(255,63,210,${.5 + .3 * Math.sin(T * 20)})`; g.lineWidth = 2.5; g.beginPath(); g.ellipse(P.x, P.y - 48, 34, 56, 0, 0, 7); g.stroke(); }
  if (P.state === 'block') { g.strokeStyle = 'rgba(138,164,255,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(P.x + P.face * 6, P.y - 55, 30, P.face > 0 ? -1 : Math.PI - 1, P.face > 0 ? 1 : Math.PI + 1); g.stroke(); }
}
let hudCache = {};
function setTxt(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateFightHud() {
  const P = F.p;
  $('#hpb i').style.width = (100 * Math.max(0, P.hp) / P.maxHp) + '%';
  $('#stb i').style.width = (100 * P.sta / P.maxSta) + '%';
  setTxt('#fRank', STORY.ranks[S.rank]);
  $('#fRank').className = 'badge ' + RANKS[S.rank].id;
  setTxt('#fAmmo', S.gun ? '▮ ' + S.ammo : '▮ —');
  setTxt('#fCr', '¢ ' + (S.creds + F.loot.creds));
  setTxt('#fHum', '♥ ' + Math.round(S.hum));
  $('#fHum').classList.toggle('low', S.hum < 50);
  const pc = $('#pcd');
  if (!S.power) { setTxt('#pcd', '—'); pc.style.background = 'none'; }
  else { const cd = IMPLANTS[S.power].cd * (perk('cold') ? .75 : 1), r = Math.max(0, P.powerCd) / cd; setTxt('#pcd', r > 0 ? Math.ceil(P.powerCd) + 's' : 'RDY'); pc.style.background = `conic-gradient(rgba(255,63,210,.7) ${(1 - r) * 360}deg, rgba(20,20,40,.8) 0)`; }
  const pb = document.querySelector('.ab.power'); if (pb) pb.classList.toggle('cd', !S.power || P.powerCd > 0);
  const sb = document.querySelector('.ab.shoot'); if (sb) sb.classList.toggle('cd', !S.gun || S.ammo <= 0);
}

// ---------------------------------------------------------------- RESULTS / PROGRESSION
function rollWeapon(eliteBonus) {
  const pool = Object.keys(WEAPONS).filter(k => k !== 'fists' && (WEAPONS[k].rank || 0) <= S.rank);
  const r = rnd();
  const rar = r < .07 + eliteBonus * .06 ? 'bm' : r < .38 + eliteBonus * .08 ? 'tuned' : 'common';
  return mkWeapon(pick(pool), rar);
}
function grantXp(xp) {
  S.xp += xp; S.rankXp += xp; const ups = [];
  while (S.xp >= xpNeed(S.level)) { S.xp -= xpNeed(S.level); S.level++; S.skillPts++; ups.push(S.level); }
  return ups;
}
function endFight(won) {
  const L = F.loot, cfg = F.cfg, onEnd = F.onEnd;
  S.stats.fights++;
  let res;
  if (won) {
    S.stats.wins++;
    const chance = cfg.boss ? 1 : .22 + .25 * L.elites;
    if (rnd() < chance) L.items.push(rollWeapon(L.elites + (cfg.boss ? 1 : 0)));
    if (cfg.bonus) { L.creds += cfg.bonus.creds || 0; L.scrap += cfg.bonus.scrap || 0; L.chrome += cfg.bonus.chrome || 0; }
    S.creds += L.creds; S.scrap += L.scrap; S.chrome += L.chrome;
    for (const w of L.items) S.weapons.push(w);
    const ups = grantXp(L.xp);
    res = { won, loot: L, ups, combo: F.bestCombo, time: F.t };
  } else {
    S.stats.losses++;
    const lost = Math.floor(S.creds * .2); S.creds -= lost;
    res = { won, lost, time: F.t };
  }
  S.fightsSinceStock++;
  if (S.fightsSinceStock >= 3) restockFence();
  if (BOT && !won) BOTS.grind = 2;
  if (BOT) BOTS.log.push({ ev: 'fight', title: cfg.title, won, t: Math.round(F.t), hp: Math.round(100 * F.p.hp / F.p.maxHp), lvl: S.level });
  save(true);
  F = null; mode = 'hub'; clearInput();
  showResults(res, () => onEnd && onEnd(won));
}

// ---------------------------------------------------------------- UI: SCREENS
const TOUCH = ('ontouchstart' in window) || matchMedia('(pointer:coarse)').matches;
let paused = false;
function showScreen(name) {
  $('#title').classList.toggle('hidden', name !== 'title');
  $('#hub').classList.toggle('hidden', name !== 'hub');
  $('#fhud').classList.toggle('hidden', name !== 'fight');
  $('#controls').classList.toggle('hidden', name !== 'fight');
  $('#dpad').classList.toggle('hidden', !TOUCH); $('#acts').classList.toggle('hidden', !TOUCH); $('#keys').classList.toggle('hidden', TOUCH);
  if (name !== 'fight') { mode = name; paused = false; $('#pause').classList.add('hidden'); }
  computeView(); hudCache = {};
  if (name === 'hub') refreshHub();
}
let toastT = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 1800); }

// ---------------------------------------------------------------- DIALOGUE / CARDS
let DLG = null, typing = null;
function runScene(key, done) {
  DLG = { steps: (STORY.scenes[key] || []).slice(), i: 0, done, act: null };
  nextStep();
}
function nextStep() {
  const D = DLG; if (!D) return;
  while (D.i < D.steps.length) { const st = D.steps[D.i]; if (st.if && !COND[st.if]()) { D.i++; continue; } break; }
  if (D.i >= D.steps.length) { $('#dialog').classList.add('hidden'); $('#dimmer').classList.add('hidden'); DLG = null; if (D.done) D.done(D.act); return; }
  const st = D.steps[D.i++];
  if (st.card) { $('#dialog').classList.add('hidden'); showCard(st, nextStep); return; }
  $('#dialog').classList.remove('hidden'); $('#dimmer').classList.remove('hidden');
  const ch = $('#dCh'); ch.innerHTML = '';
  if (st.choice) {
    $('#dMore').classList.add('hidden');
    $('#dTx').textContent = 'Choose:'; $('#dTx').className = 'tx narr'; setPortrait('sable');
    D.choosing = true;
    st.choice.filter(o => !o.if || COND[o.if]()).forEach((o, idx) => {
      const b = document.createElement('button'); b.className = 'btn' + (idx ? ' mg' : ' pri'); b.textContent = '▸ ' + fmt(o.t);
      b.onclick = ev => { ev.stopPropagation(); chooseOpt(o); };
      ch.appendChild(b);
    });
    return;
  }
  D.choosing = false;
  $('#dMore').classList.remove('hidden');
  setPortrait(st.s);
  const txt = fmt(st.t), el = $('#dTx'); el.className = 'tx' + (st.s === 'narr' ? ' narr' : '');
  if (BOT) { el.textContent = txt; typing = null; return; }
  typing = { txt, n: 0 }; el.textContent = '';
}
function chooseOpt(o) {
  const D = DLG; if (!D) return;
  D.choosing = false;
  if (o.fx) applyFx(o.fx);
  if (o.act) D.act = o.act;
  if (o.go) { D.steps = STORY.scenes[o.go].slice(); D.i = 0; }
  else { D.steps = []; D.i = 0; }
  nextStep();
}
function applyFx(fx) {
  if (fx.creds) S.creds += fx.creds;
  if (fx.hum) setHum(S.hum + fx.hum);
  if (fx.flag) S.flags[fx.flag] = 1;
}
function setPortrait(k) {
  const c = STORY.cast[k] || STORY.cast.narr, pt = $('#dPt');
  pt.textContent = c.init; pt.style.color = c.col; pt.style.visibility = c.init ? 'visible' : 'hidden';
  $('#dNm').textContent = c.name; $('#dNm').style.color = c.col;
}
function advanceDialog() {
  if (!DLG || DLG.choosing) return;
  if (typing) { $('#dTx').textContent = typing.txt; typing = null; return; }
  nextStep();
}
$('#dBox').addEventListener('click', advanceDialog);
let cardCb = null, cardAt = 0;
function showCard(st, cb) {
  const c = $('#card'); c.className = st.big ? 'big fadein' : 'fadein';
  $('#cA').textContent = fmt(st.card); $('#cB').textContent = fmt(st.sub || '');
  cardCb = cb; cardAt = performance.now();
}
function closeCard() { if (!cardCb || performance.now() - cardAt < 350) return; const cb = cardCb; cardCb = null; $('#card').className = 'hidden'; cb(); }
$('#card').addEventListener('click', closeCard);

// ---------------------------------------------------------------- PANELS
let panelName = null, panelLock = false;
function openPanel(name, title, html, lock) {
  panelName = name; panelLock = !!lock;
  $('#pTitle').textContent = title; $('#pBody').innerHTML = html;
  $('#pClose').classList.toggle('hidden', !!lock);
  $('#panel').classList.remove('hidden');
}
function closePanel() { if (panelLock) return; $('#panel').classList.add('hidden'); panelName = null; refreshHub(); }
$('#pClose').onclick = closePanel;
$('#panel').addEventListener('click', e => { if (e.target.id === 'panel') closePanel(); });
$('#pBody').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) panelAction(b.dataset.act, b.dataset); });
document.querySelectorAll('#hub [data-p]').forEach(b => b.onclick = () => hubButton(b.dataset.p));

function statLine() {
  return `<span class="badge ${RANKS[S.rank].id}">${STORY.ranks[S.rank]}</span>
  <span class="stat">LV <b>${S.level}</b></span>
  <span class="stat" style="flex:1;min-width:70px">XP <span class="bar"><i style="width:${100 * S.xp / xpNeed(S.level)}%"></i></span></span>
  <span class="stat k-hu ${S.hum < 50 ? 'low' : ''}">♥ <b>${Math.round(S.hum)}</b></span>
  <span class="stat k-cr">¢ <b>${S.creds}</b></span><span class="stat k-sc">⚙ <b>${S.scrap}</b></span>
  <span class="stat k-ch">◆ <b>${S.chrome}</b></span><span class="stat k-am">▮ <b>${S.gun ? S.ammo : '—'}</b></span>`;
}
function curMission() { return MISSIONS.find(m => !S.done[m.id] && m.rank <= S.rank) || null; }
function refreshHub() {
  if (!S || mode !== 'hub') return;
  $('#hubTop').innerHTML = statLine();
  const D = DISTRICTS[district()];
  $('#hubDist').innerHTML = `${D.name}<small>${D.sub} · ${S.gender === 'f' ? 'Charlie (she/her)' : 'Charlie (he/him)'}</small>`;
  const need = RANKS[S.rank].rankXp, pct = Math.min(100, 100 * S.rankXp / need);
  $('#hubRank').innerHTML = S.rank === 0
    ? `<span>RANK XP</span><span class="bar" style="max-width:220px"><i style="width:${pct}%;background:${pct >= 100 ? '#ffcf4a' : 'var(--mg)'}"></i></span><span>${Math.min(S.rankXp, need)}/${need} ${pct >= 100 ? '· PROOF READY' : '→ PROOF'}</span>`
    : `<span>RANK XP</span><span class="bar" style="max-width:220px"><i style="width:${pct}%"></i></span><span>${Math.min(S.rankXp, need)}/${need} → WARRIOR (Part 2)</span>`;
  const m = curMission();
  let html;
  if (m) {
    const T2 = STORY.missions[m.id];
    const lock = m.proof && S.rankXp < RANKS[0].rankXp;
    html = `<div class="lbl">STORY · ${esc(T2.giver)}${lock ? ' · LOCKED' : ''}</div><div class="tt">▶ ${esc(T2.title)}</div><div class="ds">${esc(T2.desc)} ${lock ? `<br><b style="color:#ffcf4a">Earn Rank XP in fights: ${S.rankXp}/${RANKS[0].rankXp}</b>` : `<span style="color:#7f97b0">· Rec. Lv ${m.rec}</span>`}</div>`;
  } else html = `<div class="lbl">PART 1 COMPLETE</div><div class="tt">To be continued: WARRIOR</div><div class="ds">Keep fighting contracts, crafting and building Charlie. Humanity ${Math.round(S.hum)}${S.flags.dark ? ' · the dark path is open' : ''}.</div>`;
  $('#hubObj').innerHTML = html;
  $('#bSkills').innerHTML = 'Skills' + (S.skillPts ? '<span class="dot"></span>' : '');
}
$('#hubObj').onclick = () => { const m = curMission(); if (m) startMission(m); else openStory(); };
function hubButton(p) {
  if (p === 'fight') openFightList();
  else if (p === 'story') openStory();
  else if (p === 'craft') openCraft();
  else if (p === 'skills') openSkills();
  else if (p === 'doc') openDoc();
  else if (p === 'fence') openFence();
  else if (p === 'save') openSave();
}
function npcLine(k) {
  const set = STORY.talk[k][S.rank ? 'citizen' : 'hobo'][S.hum < 50 ? 'cold' : 'warm'];
  const c = STORY.cast[k];
  return `<div class="npcline"><div class="pt" style="color:${c.col}">${c.init}</div><div><b style="color:${c.col}">${c.name}</b><br>${esc(fmt(pick(set)))}</div></div>`;
}
function enemyNames(c) { return [...new Set((c.list || c.pool).map(id => ENEMIES[id].name))].join(', '); }
function openFightList() {
  let html = `<div class="tip">Each win pays creds, scrap and XP. Elites (gold outline) pay double and drop better gear. Losing costs 20% of your carried creds.</div>`;
  const groups = S.rank ? ['blocks', 'gutter'] : ['gutter'];
  for (const dist of groups) {
    html += `<div class="sec">${DISTRICTS[dist].name}${dist === 'gutter' && S.rank ? ' · BACK DOWN' : ''}</div>`;
    for (const c of CONTRACTS.filter(c => c.district === dist)) {
      const T2 = STORY.contracts[c.id], ok = S.done[c.unlock];
      const unl = c.unlock === 'proof' ? 'reaching CITIZEN' : '"' + STORY.missions[c.unlock].title + '"';
      html += `<div class="card ${ok ? '' : 'locked'}"><div class="row"><span class="nm">${esc(T2.name)}</span><span class="meta">· Lv ${c.lvl}${c.boss ? ' · MINI-BOSS' : ''}</span></div>
        <div class="meta">${esc(T2.desc)}<br>Enemies: ${enemyNames(c)}</div>
        <div class="row">${ok ? `<button class="btn ${c.lvl > S.level + 1 ? 'mg' : 'pri'}" data-act="contract" data-id="${c.id}">Fight${c.lvl > S.level + 1 ? ' (tough)' : ''}</button>` : `<span class="meta">🔒 Unlocks after ${unl}</span>`}</div></div>`;
    }
  }
  if (S.rank === 0) html += `<div class="card locked"><div class="nm">THE BLOCKS</div><div class="meta">Block Cops, Ad-Puppets, Debt Collectors, Riot Mech. Reach CITIZEN to unlock.</div></div>`;
  openPanel('fight', 'FIGHT', html);
}
function startContract(id) {
  const c = CONTRACTS.find(x => x.id === id);
  closePanel();
  startFight({ ...c, district: c.district, title: STORY.contracts[id].name }, won => { if (!won) runScene(S.rank ? 'lose_citizen' : 'lose_hobo', () => showScreen('hub')); else showScreen('hub'); });
}
function openStory() {
  const m = curMission();
  let html = '';
  if (m) {
    const T2 = STORY.missions[m.id], lock = m.proof && S.rankXp < RANKS[0].rankXp;
    html += `<div class="card"><div class="lbl" style="font-size:10px;color:var(--mg);letter-spacing:.2em;font-weight:800">CURRENT JOB · ${esc(T2.giver)}</div><div class="nm" style="font-size:17px">${esc(T2.title)}</div><div class="meta">${esc(T2.desc)}</div>
      <div class="row"><button class="btn pri" data-act="mission">${lock ? 'See Pell' : 'Start'}</button><span class="meta">Recommended Lv ${m.rec} · You: Lv ${S.level}</span></div></div>`;
  } else html += `<div class="card"><div class="nm">Part 1 complete.</div><div class="meta">The Warrior Proof is waiting. So is Mama Ox.</div><button class="btn" data-act="replayEnd">Replay the ending</button></div>`;
  const doneList = MISSIONS.filter(x => S.done[x.id]).map(x => STORY.missions[x.id].title);
  if (doneList.length) html += `<div class="meta">Done: ${doneList.map(esc).join(' · ')}</div>`;
  html += `<div class="sec">TALK</div><div class="row" style="display:flex;gap:6px;flex-wrap:wrap">${['ox', 'dex', 'iris', 'wren'].map(k => `<button class="btn sm" data-act="talk" data-id="${k}">${STORY.cast[k].name}</button>`).join('')}</div><div id="talkOut"></div>`;
  html += `<div class="tip">Humanity ${Math.round(S.hum)}/100. ${S.hum < 50 ? 'People have started to flinch when you walk in. Prices have changed.' : 'People down here still look you in the eye.'}${S.flags.dark ? ' <b style="color:#ff6b5e">Your Humanity hit zero. A darker path is flagged.</b>' : ''}</div>`;
  openPanel('story', 'STORY', html);
}
// ---- crafting
let craftSel = null;
function weaponCard(w, opts) {
  const b = WEAPONS[w.base], eq = w.uid === S.melee || w.uid === S.gun, r = RARITY[w.rar];
  const stat = b.type === 'melee' ? `DMG ${w.dmg} · SPD ${w.spd.toFixed(2)} · REACH ${b.range}` : `DMG ${w.dmg}${b.pellets ? '×' + b.pellets : ''} · RATE ${(1 / b.rate).toFixed(1)}/s${b.pierce ? ' · PIERCE' : ''}`;
  let h = `<div class="card ${eq ? 'eq' : ''}"><div class="row"><span class="nm" style="color:${r.col}">${esc(wName(w))}</span><span class="meta">${b.type === 'melee' ? 'MELEE' : 'GUN'}${eq ? ' · EQUIPPED' : ''}</span></div><div class="meta">${stat}</div>`;
  if (opts.slots) {
    h += `<div class="slots">${w.mods.map((m, i) => m ? `<div class="slot full" style="color:${MODS[m].col || '#bff8ff'}">${MODS[m].name} <button class="btn sm" style="padding:2px 6px;margin-left:4px" data-act="strip" data-uid="${w.uid}" data-i="${i}" title="Remove">✕</button></div>`
      : `<button class="slot" data-act="slot" data-uid="${w.uid}" data-i="${i}">+ MOD</button>`).join('')}</div>`;
    if (craftSel && craftSel.uid === w.uid) {
      const hasElem = w.mods.some(m => m && MODS[m].elem);
      h += `<div class="row">${Object.keys(MODS).map(k => { const M = MODS[k], ok = S.scrap >= M.scrap && S.chrome >= M.chrome && !(M.elem && hasElem);
        return `<button class="btn sm" ${ok ? '' : 'disabled'} data-act="mod" data-uid="${w.uid}" data-i="${craftSel.i}" data-m="${k}" title="${esc(M.full)}">${M.name} ${M.scrap}⚙${M.chrome ? ' ' + M.chrome + '◆' : ''}</button>`; }).join('')}</div>
        <div class="meta">${Object.values(MODS).map(M => M.full).join(' · ')}. One element per weapon.</div>`;
    }
  }
  h += `<div class="row">`;
  if (opts.equip && !eq) h += `<button class="btn sm pri" data-act="equip" data-uid="${w.uid}">Equip</button>`;
  if (opts.salvage && !eq && w.base !== 'fists') h += `<button class="btn sm" data-act="salvage" data-uid="${w.uid}">Salvage +${salvageVal(w)}⚙</button>`;
  if (opts.sell && !eq && w.base !== 'fists') h += `<button class="btn sm gd" data-act="sell" data-uid="${w.uid}">Sell ¢${sellVal(w)}</button>`;
  if (opts.buy) h += `<button class="btn sm gd" ${S.creds >= opts.buy ? '' : 'disabled'} data-act="buy" data-uid="${w.uid}">Buy ¢${opts.buy}</button>`;
  return h + `</div></div>`;
}
const salvageVal = w => Math.max(2, Math.round(wVal(w) / 14));
const sellVal = w => Math.max(1, Math.round(wVal(w) * rankD().sellMult * (S.hum < 50 ? 1.1 : 1)));
const ammoYield = () => Math.round(AMMO_CRAFT.rounds * (has('iron', 2) ? 1.5 : 1));
function openCraft() {
  let html = `<div class="topbar">${statLine()}</div>
  <div class="card"><div class="nm">Ammo press</div><div class="meta">${AMMO_CRAFT.scrap} scrap → ${ammoYield()} rounds. You have ${S.ammo} rounds${S.gun ? '' : ' (no gun equipped yet)'}.</div>
  <div class="row"><button class="btn sm pri" ${S.scrap >= AMMO_CRAFT.scrap ? '' : 'disabled'} data-act="ammo" data-n="1">Press ×1</button><button class="btn sm" ${S.scrap >= AMMO_CRAFT.scrap * 5 ? '' : 'disabled'} data-act="ammo" data-n="5">Press ×5</button></div></div>
  <div class="sec">WEAPONS · 3 MOD SLOTS EACH</div>`;
  const ws = S.weapons.slice().sort((a, b) => ((b.uid === S.melee || b.uid === S.gun) - (a.uid === S.melee || a.uid === S.gun)));
  for (const w of ws) html += weaponCard(w, { slots: w.base !== 'fists', equip: 1, salvage: 1 });
  openPanel('craft', 'CRAFT BENCH', html);
}
function openSkills() {
  let html = `<div class="topbar">${statLine()}</div><div class="tip"><b style="color:#fff">${S.skillPts}</b> skill point${S.skillPts === 1 ? '' : 's'} available. You earn 1 per level. Each branch unlocks in order.</div><div class="tree">`;
  for (const bk in SKILLS) {
    const B = SKILLS[bk];
    html += `<div class="branch"><h4 style="color:${B.col}">${B.name} <small style="color:#7f97b0">${B.sub}</small></h4>`;
    B.nodes.forEach((n, i) => {
      const own = S.skills[bk] > i, av = S.skills[bk] === i && S.skillPts > 0;
      html += `<button class="node ${own ? 'own' : av ? 'av' : 'lk'}" ${av ? `data-act="skill" data-b="${bk}"` : 'disabled'}><b>${i + 1}. ${n.n}${own ? ' ✓' : ''}</b>${n.d}</button>`;
    });
    html += `</div>`;
  }
  html += `</div><div class="sec">PERKS</div><div class="meta">${S.perks.length ? S.perks.map(p => `<b>${PERKS[p].n}</b>: ${PERKS[p].d}`).join('<br>') : 'Pick a perk at each rank-up.'}</div>`;
  openPanel('skills', 'SKILLS', html);
}
function openDoc() {
  let html = npcLine('iris') + `<div class="tip">Implants give powers, but every install costs <b style="color:#7dff9b">Humanity</b>. Below 50, people turn cold and prices shift. At 0, a darker ending is flagged. Equip ONE power for fights.${S.rank ? ' Citizen rates apply.' : ''}</div><div class="topbar">${statLine()}</div>`;
  for (const k in IMPLANTS) {
    const I = IMPLANTS[k], own = S.implants.includes(k), cost = Math.round(I.cr * priceMult('doc')), rankOk = I.rank <= S.rank;
    const ok = !own && rankOk && S.creds >= cost && S.chrome >= I.chrome;
    html += `<div class="card ${own ? 'eq' : rankOk ? '' : 'locked'}"><div class="row"><span class="nm" style="color:${I.power ? '#ff7ff0' : '#bff8ff'}">${I.name}</span>${own ? '<span class="meta">· INSTALLED</span>' : ''}${!rankOk ? '<span class="meta">· CITIZEN ONLY</span>' : ''}</div>
      <div class="meta">${esc(I.desc)}${I.cd ? ` Cooldown ${I.cd}s.` : ''}</div><div class="row">`;
    if (!own) html += `<button class="btn sm pri" ${ok ? '' : 'disabled'} data-act="install" data-id="${k}">Install ¢${cost} · ${I.chrome}◆ · −${I.hum}♥</button>`;
    else if (I.power) html += S.power === k ? `<span class="meta" style="color:#ff7ff0">EQUIPPED POWER</span>` : `<button class="btn sm mg" data-act="power" data-id="${k}">Equip power</button>`;
    html += `</div></div>`;
  }
  openPanel('doc', 'RIPPERDOC · DOC IRIS', html);
}
function restockFence() {
  S.fightsSinceStock = 0;
  S.fence = Array.from({ length: 4 }, () => rollWeapon(S.rank ? 1 : 0));
}
function openFence() {
  if (!S.fence || !S.fence.length) restockFence();
  const pm = priceMult('fence');
  const scrapP = Math.round(30 * pm), chromeP = Math.round(95 * pm);
  let html = npcLine('dex') + `<div class="topbar">${statLine()}</div><div class="tip">Stock turns over every 3 fights and after rank-ups.${S.rank ? ' Citizen markup in effect.' : ''}${S.hum < 50 ? ' Dex is nervous around you: lower prices.' : ''}</div>
   <div class="card"><div class="nm">Supplies</div><div class="row"><button class="btn sm gd" ${S.creds >= scrapP ? '' : 'disabled'} data-act="buyScrap" data-p="${scrapP}">Scrap ×10 · ¢${scrapP}</button><button class="btn sm gd" ${S.creds >= chromeP ? '' : 'disabled'} data-act="buyChrome" data-p="${chromeP}">Chrome ×1 · ¢${chromeP}</button></div></div><div class="sec">BUY</div>`;
  for (const w of S.fence) html += weaponCard(w, { buy: Math.round(wVal(w) * pm) });
  const sellable = S.weapons.filter(w => w.uid !== S.melee && w.uid !== S.gun && w.base !== 'fists');
  html += `<div class="sec">SELL</div>` + (sellable.length ? sellable.map(w => weaponCard(w, { sell: 1 })).join('') : '<div class="meta">Nothing to sell. Equipped gear can\'t be sold.</div>');
  openPanel('fence', 'FENCE · DEX', html);
}
function openSave() {
  const st = S.stats;
  let html = `<div class="card"><div class="meta">Fights ${st.fights} · Wins ${st.wins} · Losses ${st.losses} · K.O.s ${st.kos} · Fight time ${Math.round(st.time / 60)} min</div>
   <div class="row"><button class="btn pri" data-act="saveNow">Save now</button><button class="btn" data-act="quit">Quit to title</button></div><div class="meta">The game also auto-saves after every fight and story choice.</div></div>`;
  if (DEBUG) html += `<div class="sec">DEBUG</div><div class="row" style="display:flex;flex-wrap:wrap;gap:6px">
    <button class="btn sm" data-act="dbg" data-k="xp">+300 XP</button><button class="btn sm" data-act="dbg" data-k="rxp">+1000 Rank XP</button><button class="btn sm" data-act="dbg" data-k="cr">+1000 ¢</button>
    <button class="btn sm" data-act="dbg" data-k="sc">+60 ⚙</button><button class="btn sm" data-act="dbg" data-k="ch">+6 ◆</button><button class="btn sm" data-act="dbg" data-k="am">+40 ammo</button>
    <button class="btn sm" data-act="dbg" data-k="hum">−30 ♥</button><button class="btn sm" data-act="dbg" data-k="loot">Random weapon</button></div>`;
  openPanel('save', 'SAVE', html);
}
function panelAction(act, d) {
  const w = d.uid ? (getW(d.uid) || (act === 'buy' ? (S.fence || []).find(x => x.uid === d.uid) : null)) : null;
  switch (act) {
    case 'contract': return startContract(d.id);
    case 'mission': { closePanel(); const m = curMission(); if (m) startMission(m); return; }
    case 'replayEnd': closePanel(); return runScene('teaser', () => showScreen('hub'));
    case 'talk': $('#talkOut').innerHTML = npcLine(d.id); return;
    case 'ammo': { const n = +d.n; S.scrap -= AMMO_CRAFT.scrap * n; S.ammo += ammoYield() * n; toast(`+${ammoYield() * n} rounds`); return openCraft(); }
    case 'slot': craftSel = craftSel && craftSel.uid === d.uid && craftSel.i === +d.i ? null : { uid: d.uid, i: +d.i }; return openCraft();
    case 'mod': { const M = MODS[d.m]; S.scrap -= M.scrap; S.chrome -= M.chrome; w.mods[+d.i] = d.m; craftSel = null; toast(M.name + ' installed'); save(true); return openCraft(); }
    case 'strip': w.mods[+d.i] = null; return openCraft();
    case 'equip': { if (WEAPONS[w.base].type === 'melee') S.melee = w.uid; else S.gun = w.uid; toast(wName(w) + ' equipped'); save(true); return panelName === 'results' ? null : openCraft(); }
    case 'salvage': S.scrap += salvageVal(w); S.weapons = S.weapons.filter(x => x !== w); toast('Salvaged'); return openCraft();
    case 'skill': if (S.skillPts > 0) { S.skillPts--; S.skills[d.b]++; const n = SKILLS[d.b].nodes[S.skills[d.b] - 1]; toast(n.n + ' learned'); save(true); } return openSkills();
    case 'install': {
      const I = IMPLANTS[d.id], cost = Math.round(I.cr * priceMult('doc'));
      S.creds -= cost; S.chrome -= I.chrome; S.implants.push(d.id); setHum(S.hum - I.hum);
      if (I.power && !S.power) S.power = d.id;
      toast(`${I.name} installed · −${I.hum} Humanity`); save(true); return openDoc();
    }
    case 'power': S.power = d.id; save(true); return openDoc();
    case 'buy': { const price = Math.round(wVal(w) * priceMult('fence')); if (S.creds < price) return; S.creds -= price; S.fence = S.fence.filter(x => x !== w); S.weapons.push(w); toast('Bought ' + wName(w)); save(true); return openFence(); }
    case 'sell': S.creds += sellVal(w); S.weapons = S.weapons.filter(x => x !== w); toast('Sold'); save(true); return openFence();
    case 'buyScrap': S.creds -= +d.p; S.scrap += 10; return openFence();
    case 'buyChrome': S.creds -= +d.p; S.chrome += 1; return openFence();
    case 'saveNow': save(); return;
    case 'quit': save(true); closePanel(); S = null; showScreen('title'); updateTitle(); return;
    case 'dbg': {
      const k = d.k; if (k === 'xp') grantXp(300); if (k === 'rxp') S.rankXp += 1000; if (k === 'cr') S.creds += 1000; if (k === 'sc') S.scrap += 60; if (k === 'ch') S.chrome += 6; if (k === 'am') S.ammo += 40; if (k === 'hum') setHum(S.hum - 30);
      if (k === 'loot') S.weapons.push(rollWeapon(2));
      toast('debug: ' + k); return openSave();
    }
    case 'perk': S.perks.push(d.id); panelLock = false; $('#panel').classList.add('hidden'); panelName = null; toast(PERKS[d.id].n + ' acquired'); return perkCb && perkCb();
    case 'resDone': panelLock = false; $('#panel').classList.add('hidden'); panelName = null; return resCb && resCb();
    case 'resEquip': { if (WEAPONS[w.base].type === 'melee') S.melee = w.uid; else S.gun = w.uid; save(true); d.el && 0; toast(wName(w) + ' equipped'); const b = document.querySelector(`[data-act="resEquip"][data-uid="${w.uid}"]`); if (b) { b.textContent = 'Equipped'; b.disabled = true; } return; }
  }
}
let resCb = null, perkCb = null;
function showResults(r, cb) {
  resCb = cb;
  let html;
  if (r.won) {
    const L = r.loot;
    html = `<div class="res-big" style="color:#36f3ff;text-shadow:0 0 14px #36f3ff">VICTORY</div>
    <div class="lootgrid"><div class="k-cr"><b>+${L.creds}</b>creds</div><div class="k-sc"><b>+${L.scrap}</b>scrap</div><div class="k-ch"><b>+${L.chrome}</b>chrome</div><div><b>+${L.xp}</b>XP</div></div>
    <div class="meta" style="text-align:center">Best combo ${r.combo} · ${Math.round(r.time)} s${L.elites ? ` · ${L.elites} elite${L.elites > 1 ? 's' : ''} down` : ''} · Rank XP ${S.rankXp}/${RANKS[S.rank].rankXp}</div>`;
    if (r.ups.length) html += `<div class="card eq"><div class="nm" style="color:#ffcf4a">LEVEL UP → ${S.level}</div><div class="meta">+${r.ups.length} skill point${r.ups.length > 1 ? 's' : ''}. Max HP up. Spend points in SKILLS.</div></div>`;
    for (const w of L.items) {
      const b = WEAPONS[w.base], cur = b.type === 'melee' ? getW(S.melee) : S.gun ? getW(S.gun) : null;
      html += `<div class="sec">LOOT DROP</div>` + weaponCard(w, {}).replace(/<div class="row"><\/div><\/div>$/, '') +
        `<div class="row"><button class="btn sm pri" data-act="resEquip" data-uid="${w.uid}">Equip</button><span class="meta">${cur ? 'Current: ' + esc(wName(cur)) + ' (DMG ' + cur.dmg + ')' : 'No gun equipped'}</span></div></div>`;
    }
  } else {
    html = `<div class="res-big" style="color:#ff5a6e">K.O.</div><div class="tip" style="text-align:center">${esc(STORY.loseLine)}<br>Lost <b class="k-cr">¢${r.lost}</b> (20% of carried creds).</div>
      <div class="tip">Tips: block when enemies flash white · lane-switch away from lasers and bottles · spend skill points · craft mods and ammo · buy an implant.</div>`;
  }
  html += `<button class="btn pri" style="padding:14px" data-act="resDone">Continue</button>`;
  openPanel('results', r.won ? 'FIGHT RESULTS' : 'DEFEAT', html, true);
}
function perkChoice(cb) {
  perkCb = cb;
  const opts = Object.keys(PERKS).filter(p => !S.perks.includes(p)).sort(() => rnd() - .5).slice(0, 3);
  const html = `<div class="tip">New rank, new edge. Pick one perk. It's permanent.</div>` + opts.map(p => `<button class="node av" data-act="perk" data-id="${p}"><b>${PERKS[p].n}</b>${PERKS[p].d}</button>`).join('');
  openPanel('perk', 'RANK-UP PERK', html, true);
}

// ---------------------------------------------------------------- MISSIONS
function giveReward(rw) {
  const got = [];
  if (rw.creds) { S.creds += rw.creds; got.push('¢' + rw.creds); }
  if (rw.scrap) { S.scrap += rw.scrap; got.push(rw.scrap + ' scrap'); }
  if (rw.chrome) { S.chrome += rw.chrome; got.push(rw.chrome + ' chrome'); }
  if (rw.ammo) { S.ammo += rw.ammo; got.push(rw.ammo + ' rounds'); }
  for (const [b, r] of rw.give || []) {
    const w = mkWeapon(b, r, true); S.weapons.push(w); got.push(wName(w));
    if (WEAPONS[b].type === 'melee') { const cur = getW(S.melee); if (!cur || cur.base === 'fists') S.melee = w.uid; } else if (!S.gun) S.gun = w.uid;
  }
  if (got.length) toast('Job paid: ' + got.join(', '));
}
function missionDistrict(m) { return m.rank ? 'blocks' : 'gutter'; }
function startMission(m) {
  if (m.proof) return startProof();
  runScene(m.intro, () => {
    startFight({ ...m.fight, district: missionDistrict(m), title: STORY.missions[m.id].title }, won => {
      if (!won) return runScene(S.rank ? 'lose_citizen' : 'lose_hobo', () => showScreen('hub'));
      S.done[m.id] = 1; giveReward(m.reward); restockFence(); save(true);
      runScene(m.win, () => {
        if (m.final) return runScene('teaser', () => { S.flags.won = 1; S.done.teaser = 1; save(true); showScreen('hub'); });
        save(true); showScreen('hub');
      });
    });
  });
}
function startProof() {
  if (S.rankXp < RANKS[0].rankXp) return runScene('proof_locked', () => { toast(`Rank XP ${S.rankXp}/${RANKS[0].rankXp}`); showScreen('hub'); });
  runScene(S.flags.proofHeard ? 'proof_return' : 'proof_intro', act => {
    if (act === 'evict') {
      setHum(S.hum - 25); S.creds += 150; S.flags.proof = 'evict'; save(true);
      runScene('proof_evict', rankUp);
    } else if (act === 'fight') {
      save(true);
      runScene('proof_fight_intro', () => startFight(Object.assign({}, PROOF_FIGHT), won => {
        if (!won) return runScene('lose_hobo', () => showScreen('hub'));
        S.flags.proof = 'fight'; setHum(S.hum + 10); S.creds += 100;
        runScene('proof_fight_win', rankUp);
      }));
    } else showScreen('hub');
  });
}
function rankUp() {
  S.rank = 1; S.done.proof = 1; S.rankXp = 0; save(true);
  runScene('rankup', () => perkChoice(() => { restockFence(); save(true); mode = 'hub'; runScene('blocks_arrive', () => { save(true); showScreen('hub'); }); }));
}

// ---------------------------------------------------------------- TITLE
function updateTitle() { const s = loadSave(); $('#bCont').disabled = !s; $('#bNew').textContent = s ? 'New Game (overwrites save)' : 'New Game'; }
$('#bNew').onclick = () => {
  const g = Q.get('gender') === 'f' || Q.get('gender') === 'm' ? Q.get('gender') : (rnd() < .5 ? 'f' : 'm');
  S = newSave(g); restockFence(); save(true);
  mode = 'hub'; $('#title').classList.add('hidden'); computeView();
  runScene('intro', () => { save(true); showScreen('hub'); toast(`Charlie rolled ${g === 'f' ? 'female (she/her)' : 'male (he/him)'}`); });
};
$('#bCont').onclick = () => { const s = loadSave(); if (!s) return; S = s; showScreen('hub'); toast('Welcome back, Charlie'); };

// ---------------------------------------------------------------- INPUT
const KEYMAP = { a: 'l', arrowleft: 'l', d: 'r', arrowright: 'r', w: 'u', arrowup: 'u', s: 'd', arrowdown: 'd', j: 'light', k: 'heavy', l: 'block', ' ': 'dodge', i: 'shoot', u: 'power' };
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (!$('#card').classList.contains('hidden') && (k === 'enter' || k === ' ' || k === 'j')) { closeCard(); e.preventDefault(); return; }
  if (DLG && (k === 'enter' || k === ' ' || k === 'j')) { advanceDialog(); e.preventDefault(); return; }
  if (mode === 'fight' && F) {
    if (k === 'escape' || k === 'p') { togglePause(); return; }
    const a = KEYMAP[k]; if (a) { if (!e.repeat) press(a); e.preventDefault(); }
  } else if (k === 'escape' && panelName) closePanel();
});
addEventListener('keyup', e => { const a = KEYMAP[e.key.toLowerCase()]; if (a) release(a); });
addEventListener('blur', clearInput);
// action buttons (multi-touch via pointer events)
document.querySelectorAll('.ab').forEach(b => {
  const a = b.dataset.a;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); press(a); b.classList.add('on'); });
  const up = e => { release(a); b.classList.remove('on'); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
});
// d-pad: one pointer, slide-able
(() => {
  const pad = $('#dpad'); let pid = null;
  const els = { u: pad.querySelector('.u'), d: pad.querySelector('.dn'), l: pad.querySelector('.l'), r: pad.querySelector('.r') };
  const set = (e) => {
    const rc = pad.getBoundingClientRect(), x = e.clientX - rc.left - rc.width / 2, y = e.clientY - rc.top - rc.height / 2;
    const dead = 14, st = { l: x < -dead && Math.abs(x) > Math.abs(y) * .55, r: x > dead && Math.abs(x) > Math.abs(y) * .55, u: y < -dead && Math.abs(y) > Math.abs(x) * .7, d: y > dead && Math.abs(y) > Math.abs(x) * .7 };
    for (const k in st) { if (st[k]) press(k); else release(k); els[k].classList.toggle('on', st[k]); }
  };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); pid = e.pointerId; pad.setPointerCapture(pid); set(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === pid) set(e); });
  const end = e => { if (e.pointerId !== pid) return; pid = null; for (const k in els) { release(k); els[k].classList.remove('on'); } };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
})();
// tap/click an enemy to retarget the gun
cv.addEventListener('pointerdown', e => {
  if (mode !== 'fight' || !F) return;
  const lx = (e.clientX - view.x) / view.s, ly = (e.clientY - view.y) / view.s;
  let best = null, bd = 70;
  for (const en of F.enemies) { if (!en.alive) continue; const ey = en.def.ai === 'drone' ? en.y - 78 : en.y - 50; const d = Math.hypot(en.x - lx, ey - ly); if (d < bd) { bd = d; best = en; } }
  if (best) { F.target = best; addFloat(best.x, best.y - 120, 'TARGET', '#ffcf4a', 10); }
});
function togglePause() { paused = !paused; $('#pause').classList.toggle('hidden', !paused); clearInput(); }
$('#pauseB').onclick = togglePause;
$('#bResume').onclick = togglePause;
$('#bFlee').onclick = () => { if (!F) return; togglePause(); F.p.hp = 0; F.p.state = 'dead'; F.over = true; F.won = false; F.overT = .3; };
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'fight' && F && !paused && !BOT) togglePause(); });

// ---------------------------------------------------------------- BOT (hidden ?bot=1)
const BOTSK = +(Q.get('skill') || .8);
const BOTS = { heavyHold: 0, laneCd: 0, lightCd: 0, hubT: 0, log: [], simTime: 0, lines: 0 };
function botControl(dt) {
  for (const k in IN) IN[k] = 0;
  if (!F || F.over) return;
  const P = F.p; BOTS.laneCd -= dt; BOTS.lightCd -= dt;
  const t = nearestEnemy(P.x, P.lane, false); if (!t) return;
  const dx = t.x - P.x, adx = Math.abs(dx), range = P.ws.m.range;
  const laneSwap = () => { if (BOTS.laneCd <= 0) { press(P.lane ? 'u' : 'd'); BOTS.laneCd = .5; } };
  const proj = F.projs.find(p => p.k !== 'pb' && p.lane === P.lane && !(p.delay > 0) && ((p.k === 'bottle' && Math.abs(p.x1 - P.x) < 34 && p.t / p.dur > .45) || (p.vx && (p.x - P.x) * Math.sign(p.vx) < 0 && Math.abs(p.x - P.x) < 110)));
  if (proj) { if (proj.k === 'wave') { if (P.sta > 20) press('dodge'); } else laneSwap(); return; }
  const threat = F.enemies.find(e => e.alive && e.state === 'windup' && e.lane === P.lane && e.st < .3 &&
    Math.abs(e.x - P.x) < (['laser', 'shotgun', 'burst', 'shot', 'throw'].includes(e.attackKind) ? 700 : e.attackKind === 'lunge' ? 260 : e.def.range + 40));
  if (threat) {
    if (['laser', 'shotgun', 'burst', 'shot'].includes(threat.attackKind)) { laneSwap(); return; }
    if (threat.attackKind === 'stomp') { if (threat.st < .15 && P.sta > 20) press('dodge'); return; }
    if (rnd() < BOTSK && P.sta > 25) { IN.block = 1; return; }
  }
  if (P.state === 'charge') { BOTS.heavyHold -= dt; if (BOTS.heavyHold > 0) IN.heavy = 1; return; }
  if (S.power && P.powerCd <= 0 && (aliveEnemies().length >= 2 || F.boss) && adx < 200 && t.lane === P.lane) { press('power'); return; }
  if (t.lane !== P.lane && t.def.ai !== 'drone') { laneSwap(); }
  else if (t.def.ai === 'drone' && t.lane !== P.lane) laneSwap();
  if (adx > range + 4) {
    if (S.gun && S.ammo > 0 && adx > 150 && P.shootCd <= 0) { press('shoot'); return; }
    IN[dx > 0 ? 'r' : 'l'] = 1;
  } else {
    P.face = dx > 0 ? 1 : -1;
    const shielded = t.shieldUp && (P.x - t.x) * t.face > 0;
    if ((shielded || (t.def.boss && rnd() < .02)) && P.state === 'idle') { press('heavy'); BOTS.heavyHold = .45; return; }
    if (BOTS.lightCd <= 0) { press('light'); BOTS.lightCd = .1 / BOTSK; }
  }
}
function botHub() {
  if (!AUTO || !S || mode !== 'hub') return;
  if (cardCb) return closeCard();
  if (DLG) { if (DLG.choosing) { const st = DLG.steps[DLG.i - 1]; const opts = st.choice.filter(o => !o.if || COND[o.if]()); const want = Q.get('choice') || 'fight'; chooseOpt(opts.find(o => o.act === want) || opts[opts.length - 1]); } else { BOTS.lines++; advanceDialog(); } return; }
  if (panelName === 'results') return panelAction('resDone', {});
  if (panelName === 'perk') { const b = document.querySelector('[data-act="perk"]'); return panelAction('perk', { id: b.dataset.id }); }
  if (panelName) closePanel();
  // spend points
  const order = ['street', 'ghost', 'iron', 'street', 'ghost', 'street', 'iron'];
  while (S.skillPts > 0) { const b = order.find(x => S.skills[x] < 6 && (S.skills[x] <= Math.min(S.skills.street, S.skills.ghost, S.skills.iron) + 2)) || 'street'; if (S.skills[b] >= 6) break; S.skillPts--; S.skills[b]++; }
  // equip best
  const melees = S.weapons.filter(w => WEAPONS[w.base].type === 'melee'), guns = S.weapons.filter(w => WEAPONS[w.base].type === 'gun');
  S.melee = melees.sort((a, b) => b.dmg * b.spd - a.dmg * a.spd)[0].uid;
  if (guns.length) S.gun = guns.sort((a, b) => b.dmg * (WEAPONS[b.base].pellets || 1) / WEAPONS[b.base].rate - a.dmg * (WEAPONS[a.base].pellets || 1) / WEAPONS[a.base].rate)[0].uid;
  // implants
  for (const k of ['mantis', 'plating', 'synapse', 'static']) { const I = IMPLANTS[k], c = Math.round(I.cr * priceMult('doc')); if (!S.implants.includes(k) && I.rank <= S.rank && S.creds >= c + 40 && S.chrome >= I.chrome) { S.creds -= c; S.chrome -= I.chrome; S.implants.push(k); setHum(S.hum - I.hum); if (I.power) S.power = k; BOTS.log.push({ ev: 'implant', k, t: BOTS.simTime }); } }
  // mods: dmg mod on melee
  const mw = getW(S.melee); const fi = mw.mods.indexOf(null); if (mw.base !== 'fists' && fi >= 0 && S.scrap >= 30) { S.scrap -= 12; mw.mods[fi] = 'dmg'; }
  while (S.gun && S.ammo < 30 && S.scrap >= 10) { S.scrap -= AMMO_CRAFT.scrap; S.ammo += ammoYield(); }
  const m = curMission();
  if (BOTS.grind > 0) BOTS.grind--;
  else if (m && (m.proof ? S.rankXp >= RANKS[0].rankXp : S.level >= m.rec)) { BOTS.log.push({ ev: 'mission', id: m.id, lvl: S.level, t: Math.round(BOTS.simTime), fights: S.stats.fights }); return startMission(m); }
  if (!m && S.flags.won) { BOTS.done = 1; return; }
  const cs = CONTRACTS.filter(c => S.done[c.unlock] && c.district === district() && c.lvl <= S.level + 1);
  const c = cs.length ? cs[cs.length - 1] : CONTRACTS.filter(c => S.done[c.unlock]).slice(-1)[0];
  startContract(c.id);
}

// ---------------------------------------------------------------- MAIN LOOP
let last = performance.now();
function renderScene(dt) {
  const g = ctx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#05060c'; g.fillRect(0, 0, cv.width, cv.height);
  if (mode === 'fight' && F) { renderFight(g, dt); return; }
  g.setTransform(DPR * view.s, 0, 0, DPR * view.s, DPR * view.x, DPR * view.y);
  const dist = S ? district() : 'gutter';
  drawBG(g, dist, 320 + Math.sin(T * .2) * 60);
  if (S && mode === 'hub') {
    const fake = { x: 330, y: LANE_Y[1] - 4, face: -1, state: 'idle', anim: T, glowCol: null };
    drawHumanoid(g, fake, lookPlayer());
    const npc = { x: 470, y: LANE_Y[0], face: -1, state: 'idle', anim: T + 1 };
    if (dist === 'gutter') drawHumanoid(g, npc, { glow: '#ffb347', body: '#1a1208', sw: 14, hw: 13, lw: 9, scale: 1.12, head: (g2, e, hd) => { g2.fillStyle = '#ffb347'; g2.fillRect(hd[0] - 10, hd[1] - 10, 20, 4); } });
    else drawHumanoid(g, { ...npc, x: 180, face: 1 }, Object.assign({ glow: '#ff3fd2' }, LOOKS.cop, { front: null }));
  }
  drawWeather(g, dt, dist);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, 'rgba(5,6,12,.55)'); gr.addColorStop(.4, 'rgba(5,6,12,0)'); gr.addColorStop(.75, 'rgba(5,6,12,.25)'); gr.addColorStop(1, 'rgba(5,6,12,.85)');
  g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
}
function loop(now) {
  const rdt = Math.min(.05, (now - last) / 1000); last = now; T += rdt;
  if (typing) { typing.n += rdt * 60; const n = Math.floor(typing.n); $('#dTx').textContent = typing.txt.slice(0, n); if (n >= typing.txt.length) typing = null; }
  if (mode === 'fight' && F && !paused) {
    const steps = BOT ? SPEED : 1;
    for (let i = 0; i < steps && F; i++) {
      const dt = BOT ? 1 / 60 : rdt;
      if (BOT) botControl(dt);
      BOTS.simTime += dt;
      stepFight(dt);
      for (const k in PR) delete PR[k];
    }
  }
  if (AUTO) { BOTS.hubT -= rdt; if (BOTS.hubT <= 0) { BOTS.hubT = .05; botHub(); } }
  renderScene(rdt);
  requestAnimationFrame(loop);
}
// test hooks
window.NC = { IN, fmt, get S() { return S; }, get F() { return F; }, get mode() { return mode; }, BOTS, startContract, startMission, curMission, runScene, panelAction, save, loadSave, grantXp, MISSIONS, CONTRACTS,
  winFight() { if (F) for (const e of F.enemies) if (e.alive) { e.hp = 1; hurtEnemy(e, 999, { src: 'power' }); } if (F) F.queue.length = 0; } };
resize(); updateTitle(); showScreen('title');
requestAnimationFrame(loop);
