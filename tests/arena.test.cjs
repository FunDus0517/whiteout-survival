const { test } = require('node:test');
const assert = require('node:assert/strict');
const A = require('../arena-model.js');
const World = require('../world-data.js');

const OFFSET = { x: 384, y: 256 };
const at = (body, x, y) => Object.assign(body, { x: x + OFFSET.x, y: y + OFFSET.y });
const worldMake = config => A.create(Object.assign({ seed: 123, day: 1, location: { id: 'forest', name: '北坡林地', base: { wood: 7, food: 1 }, cold: 7 }, health: 100, warmth: 75, meds: 1, gear: {}, levels: {} }, config));
const oldPoints = [[310,670],[280,410],[660,260],[660,430],[900,150],[990,410],[1440,380],[990,650],[820,900],[1380,900]].map(p=>[p[0]+384,p[1]+256]);
const oldOuter = [[170,590],[190,970],[300,1250],[780,150],[1260,190],[1800,160],[2120,420],[2140,830],[2070,1250],[950,1400],[1450,1390],[1830,1400]];
const oldEnemyPoints = [[1124,686],[1284,586],[2230,450],[1814,716],[140,1060],[1660,1360],[1320,230],[1244,826],[370,580],[1960,1340],[830,200],[2160,980],[1070,1450],[150,730],[1850,260],[540,1380]];
function make(config) {
  const r=worldMake(config), count=Math.min(16,(r.approach==='careful'?6:r.approach==='bold'?10:8)+Math.floor((r.day-1)/2));
  r.version=2;r.width=2304;r.height=1536;r.mapLayout='current';delete r.facilities;delete r.camp;
  Object.assign(r.player,{x:510,y:980});r.extraction={x:510,y:980,radius:70};Object.assign(r.noise,{x:510,y:980});
  r.obstacles=A.V2_OBSTACLES.map(o=>({...o}));r.coldRate=.1125*.85*(r.approach==='careful'?.65:r.approach==='bold'?1.15:1);
  r.nodes=[...oldPoints,...oldOuter].map((p,i)=>{const rewards=i===0?{wood:3,food:2,parts:0,meds:0}:i===15||i===18?{wood:0,food:1,parts:0,meds:1}:i>=10?{wood:r.approach==='bold'?3:2,food:0,parts:1,meds:0}:{wood:2,food:1,parts:1,meds:0};const total=Object.values(rewards).reduce((a,b)=>a+b,0);return{id:i<10?'cache-'+i:'outer-cache-'+(i-10),x:p[0],y:p[1],kind:'supply',name:'旧地图补给 '+i,rewards,remaining:total,total,region:i%3===0?'works':i%3===1?'supplies':'medical'};});
  r.enemies=r.enemies.slice(0,count).map((e,i)=>{const p=oldEnemyPoints[i],type=i===6||i===7?'wolf':'zombie',health=type==='wolf'?38:48+Math.min(12,(r.day-1)*2);return{...e,type,x:p[0],y:p[1],homeX:p[0],homeY:p[1],health,maxHealth:health};});
  return r;
}
function advance(run, seconds, input) { for (let i = 0; i < Math.round(seconds * 20); i++) A.tick(run, .05, input || {}); }
function isolated(run) { run.enemies.forEach(e => { e.health = 0; e.state = 'dead'; }); return run; }
function inBuilding(p, run) { return (run ? run.obstacles : A.V2_OBSTACLES).some(o => p.x > o.x && p.x < o.x + o.w && p.y > o.y && p.y < o.y + o.h); }

function legacyFixture() {
  const r = make(), originalEnemies = [[740,430],[900,330],[1420,160],[1430,460],[940,800],[1230,900],[790,180],[860,570]];
  r.nodes = r.nodes.slice(0, 10);
  const subtract = p => { p.x -= OFFSET.x; p.y -= OFFSET.y; };
  Object.assign(r.player, { x: 220, y: 790 }); Object.assign(r.extraction, { x: 210, y: 790 }); Object.assign(r.noise, { x: 220, y: 790 }); r.nodes.forEach(subtract);
  r.enemies.forEach((e, i) => { e.x = e.homeX = originalEnemies[i][0]; e.y = e.homeY = originalEnemies[i][1]; });
  r.obstacles = A.LEGACY_OBSTACLES.map(o => ({ x: o.x - OFFSET.x, y: o.y - OFFSET.y, w: o.w, h: o.h }));
  r.width = 1536; r.height = 1024; r.version = 1; r.coldRate = .1125; delete r.mapLayout;
  return r;
}

test('seeded creation is serializable, deterministic, cloned, and all entities spawn outside buildings', () => {
  const gear = { axe: true }, levels = { radio: 1 }, run = make({ gear, levels });
  assert.ok(A.valid(run)); assert.deepEqual(run, make({ gear, levels }));
  run.gear.axe = false; run.levels.radio = 2;
  assert.equal(gear.axe, true); assert.equal(levels.radio, 1);
  for (let seed = 1; seed <= 30; seed++) {
    const r = make({ seed, day: 7, approach: 'bold' });
    assert.ok(A.valid(r)); assert.equal(r.nodes.length, 22);
    assert.ok([r.player, ...r.enemies, ...r.nodes].every(p => !inBuilding(p)));
    assert.ok(r.enemies.every(e => Math.hypot(e.x - r.player.x, e.y - r.player.y) > 340));
  }
});

test('moving cannot pass through buildings or leave map even at large input and delta', () => {
  const r = isolated(make()); r.player.x = 790; r.player.y = 980;
  advance(r, 3, { x: 999, y: 0 }); assert.ok(r.player.x <= 800.001);
  assert.ok(!inBuilding(r.player)); r.player.x = 24; r.player.y = 900;
  advance(r, 2, { x: -1, y: 0 }); assert.equal(r.player.x, 24);
  A.tick(r, 100, { x: 1, y: 0 }); assert.ok(r.player.x < 80);
});

test('tap routes reach first supplies and detour around buildings; keyboard cancels the route', () => {
  const r = isolated(make()); const first = r.nodes[0];
  assert.ok(A.goTo(r, first.x, first.y).ok); advance(r, 2);
  assert.ok(A.nearestNode(r)); assert.equal(r.path.length, 0);
  assert.ok(A.gather(r).ok); assert.equal(r.loot.wood, 3); assert.equal(r.loot.food, 2);
  assert.ok(A.goTo(r, 880 + OFFSET.x, 950 + OFFSET.y).ok); advance(r, 7); assert.ok(Math.hypot(r.player.x - 880 - OFFSET.x, r.player.y - 950 - OFFSET.y) < 3);
  assert.ok(A.goTo(r, 1400 + OFFSET.x, 430 + OFFSET.y).ok); A.tick(r, .05, { x: 1, y: 0 }); assert.equal(r.path.length, 0);
  assert.equal(A.goTo(r, 600 + OFFSET.x, 700 + OFFSET.y).ok, false);
});

test('all supply nodes have reachable routes without crossing painted buildings', () => {
  const r = isolated(make());
  for (const node of r.nodes) {
    assert.ok(A.goTo(r, node.x, node.y).ok, node.id); advance(r, 15);
    assert.ok(Math.hypot(r.player.x - node.x, r.player.y - node.y) < 3, node.id);
    assert.ok(!inBuilding(r.player));
  }
});

test('expanded map adds meaningful outer caches without increasing bag capacity or doubling enemies', () => {
  const r = make();
  assert.equal(r.width, 2304); assert.equal(r.height, 1536); assert.equal(r.version, 2); assert.equal(r.mapLayout, 'current');
  assert.deepEqual(r.extraction, { x: 510, y: 980, radius: 70 }); assert.equal(r.player.x, 510); assert.equal(r.player.y, 980);
  assert.equal(r.obstacles.length, 8);
  assert.equal(r.nodes.length, 22); assert.equal(r.enemies.length, 8); assert.equal(r.capacity, 18);
  assert.deepEqual(r.nodes[0].rewards, { wood: 3, food: 2, parts: 0, meds: 0 });
  const outer = r.nodes.slice(10);
  assert.ok(outer.every(n => n.total >= 2 && n.total <= 4));
  assert.equal(outer.filter(n => n.rewards.meds).length, 2);
  assert.ok(outer.filter(n => n.rewards.meds).every(n => n.rewards.meds === 1));
  assert.deepEqual(new Set(outer.map(n => n.region)), new Set(['works', 'supplies', 'medical']));
  assert.ok(r.enemies.some(e => e.x < OFFSET.x)); assert.ok(r.enemies.some(e => e.x > OFFSET.x + 1536));
  assert.ok(r.enemies.some(e => e.y < OFFSET.y)); assert.ok(r.enemies.some(e => e.y > OFFSET.y + 1024));
  assert.ok(Math.abs(r.coldRate - .1125 * .85) < .000001);
});

test('legacy active runs translate every coordinate while preserving consumed caches, injuries and economy', () => {
  const old = legacyFixture();
  old.player.health = 71; old.player.warmth = 38; old.player.meds = 0;
  old.loot.wood = 3; old.loot.food = 1; old.kills = 1; old.ammo = 5; old.elapsed = 33.4;
  old.nodes[0].rewards = { wood: 1, food: 0, parts: 0, meds: 0 }; old.nodes[0].remaining = 1;
  old.enemies[0].health = 0; old.enemies[0].state = 'dead';
  old.enemies[1].health = 36; old.enemies[1].state = 'chase'; old.enemies[1].attackCooldown = .6;
  old.path = [{ x: 310, y: 670 }, { x: 390, y: 500 }];
  old.enemies[1].path = [{ x: 850, y: 410 }];
  old.noise = { x: 280, y: 700, time: 1.4, radius: 270 };
  old.effects = [{ type: 'shot', x: 220, y: 790, toX: 330, toY: 790, time: .2, duration: .28 }];
  const before = JSON.parse(JSON.stringify(old)); assert.ok(A.valid(old, true)); assert.equal(A.valid(old), false);
  const upgraded = A.upgrade(old); assert.equal(upgraded, old); assert.ok(A.valid(upgraded));
  assert.equal(upgraded.version, A.VERSION); assert.equal(upgraded.width, 2304); assert.equal(upgraded.height, 1536);
  for (const [a, b] of [[upgraded.player, before.player], [upgraded.noise, before.noise], [upgraded.extraction, before.extraction], ...upgraded.nodes.map((n, i) => [n, before.nodes[i]]), ...upgraded.enemies.map((n, i) => [n, before.enemies[i]]), ...upgraded.path.map((n, i) => [n, before.path[i]])]) {
    assert.equal(a.x, b.x + OFFSET.x); assert.equal(a.y, b.y + OFFSET.y);
  }
  assert.deepEqual(upgraded.enemies[1].path, [{ x: 1234, y: 666 }]);
  assert.equal(upgraded.enemies[1].homeX, before.enemies[1].homeX + OFFSET.x);
  assert.equal(upgraded.enemies[1].homeY, before.enemies[1].homeY + OFFSET.y);
  assert.deepEqual(upgraded.effects[0], { type: 'shot', x: 604, y: 1046, toX: 714, toY: 1046, time: .2, duration: .28 });
  assert.deepEqual(upgraded.loot, before.loot); assert.equal(upgraded.nodes.length, 10); assert.equal(upgraded.enemies.length, 8);
  assert.deepEqual(upgraded.nodes.map(n => [n.total, n.remaining, n.rewards]), before.nodes.map(n => [n.total, n.remaining, n.rewards]));
  for (const key of ['seed', 'rngState', 'elapsed', 'kills', 'ammo', 'capacity', 'coldRate']) assert.equal(upgraded[key], before[key]);
  for (const key of ['health', 'warmth', 'meds', 'angle', 'attackCooldown', 'invulnerable']) assert.equal(upgraded.player[key], before.player[key]);
  const once = JSON.stringify(upgraded); A.upgrade(upgraded); assert.equal(JSON.stringify(upgraded), once);
  const restored = JSON.parse(once); A.tick(upgraded, .05); A.tick(restored, .05); assert.deepEqual(upgraded, restored);
});

test('legacy upgrade accepts missing transient paths and leaves invalid or unknown versions untouched', () => {
  const r = legacyFixture(); delete r.path; r.enemies.forEach(e => delete e.path);
  assert.ok(A.valid(A.upgrade(r)));
  for (const corrupt of [r => r.width = 1400, r => r.player.health = 101, r => r.effects = [{ type: 'shot', x: 220, y: 790, toX: Infinity, time: .2, duration: .3 }]]) {
    const broken = legacyFixture(); corrupt(broken); const before = JSON.stringify(broken);
    assert.equal(A.upgrade(broken), broken); assert.equal(JSON.stringify(broken), before); assert.equal(A.valid(broken), false);
  }
  assert.equal(A.upgrade(null), null); assert.deepEqual(A.upgrade({ version: 99 }), { version: 99 });
});

test('old and current sessions use their own painted walls for tap routes and directional movement', () => {
  const current = isolated(make()), legacy = isolated(A.upgrade(legacyFixture()));
  Object.assign(current.player, { x: 470, y: 300 }); Object.assign(legacy.player, { x: 470, y: 300 });
  assert.ok(A.valid(current)); assert.ok(A.valid(legacy));
  assert.equal(A.goTo(current, 600, 300).ok, false); assert.equal(A.goTo(legacy, 600, 300).ok, true);
  advance(legacy, 2); assert.ok(Math.hypot(legacy.player.x - 600, legacy.player.y - 300) < 3);
  assert.equal(A.goTo(current, 600, 550).ok, true); assert.equal(A.goTo(legacy, 600, 550).ok, false);
  Object.assign(current.player, { x: 470, y: 300 }); Object.assign(legacy.player, { x: 470, y: 300 });
  advance(current, 1, { x: 1, y: 0 }); advance(legacy, 1, { x: 1, y: 0 });
  assert.ok(current.player.x <= 486); assert.ok(legacy.player.x > 650);
  assert.ok(A.valid(current)); assert.ok(A.valid(legacy));
  const defaultLayout = make(); delete defaultLayout.mapLayout; assert.ok(A.valid(defaultLayout));
  defaultLayout.mapLayout = 'unknown'; assert.equal(A.valid(defaultLayout), false);
});

test('new sessions can enter the outer district while legacy sessions cannot route beyond the old map', () => {
  const current = isolated(make({ gear: { crossbow: true } })), legacy = isolated(A.upgrade(legacyFixture()));
  for (const destination of [{ x: 170, y: 590 }, { x: 1260, y: 190 }, { x: 1960, y: 590 }, { x: 1830, y: 1400 }]) {
    assert.equal(A.goTo(current, destination.x, destination.y).ok, true);
    assert.equal(A.goTo(legacy, destination.x, destination.y).ok, false);
  }
  // The current map still blocks a bolt fired through the east-side building.
  Object.assign(current.player, { x: 1960, y: 590 });
  Object.assign(current.enemies[0], { x: 2210, y: 590, health: 48, state: 'wander' });
  assert.ok(A.valid(current)); assert.equal(A.attack(current).damage, 0); assert.equal(current.ammo, 8);
  assert.ok(A.valid(legacy));
});

test('legacy movement and save validation keep characters and enemies inside the original map with radius clearance', () => {
  const run = isolated(A.upgrade(legacyFixture()));
  Object.assign(run.player, { x: 408, y: 1046 }); assert.ok(A.valid(run));
  advance(run, 1, { x: -1, y: 0 }); assert.equal(run.player.x, 408);
  Object.assign(run.player, { x: 1200, y: 280 }); advance(run, 1, { x: 0, y: -1 }); assert.equal(run.player.y, 280);
  Object.assign(run.player, { x: 1896, y: 1200 }); advance(run, 1, { x: 1, y: 0 }); assert.equal(run.player.x, 1896);
  Object.assign(run.player, { x: 1200, y: 1256 }); advance(run, 1, { x: 0, y: 1 }); assert.equal(run.player.y, 1256);
  const enemy = run.enemies[0];
  Object.assign(enemy, { x: 406, y: 1100, health: 48, state: 'wander', homeX: 406, homeY: 1100, wanderAngle: Math.PI, wanderTime: 4 });
  advance(run, 1); assert.equal(enemy.x, 406); assert.ok(A.valid(run));
  for (const corrupt of [r => r.player.x = 407, r => r.enemies[0].x = 405, r => r.nodes[0].x = 383, r => r.path = [{ x: 1930, y: 1200 }], r => r.noise.x = 2000, r => r.enemies[0].homeX = 2000, r => r.effects = [{ type: 'shot', x: 1200, y: 1256, toX: 2000, toY: 1256, time: .2, duration: .3 }]]) {
    const broken = JSON.parse(JSON.stringify(run)); corrupt(broken); assert.equal(A.valid(broken), false);
  }
});

test('gather pays only remaining resources, respects pack capacity and cannot duplicate a cache', () => {
  const r = isolated(make()); at(r.player, 310, 670);
  r.loot.wood = 17; const gain = A.gather(r);
  assert.ok(gain.ok); assert.equal(A.weight(r), 18); assert.equal(r.nodes[0].remaining, 4);
  const before = JSON.stringify(r); assert.equal(A.gather(r).ok, false); assert.equal(JSON.stringify(r), before);
  assert.ok(A.drop(r, 'wood', 5).ok); assert.ok(A.gather(r).ok); assert.equal(r.nodes[0].remaining, 0);
  const after = JSON.stringify(r); assert.equal(A.gather(r).ok, false); assert.equal(JSON.stringify(r), after);
  assert.equal(make({ gear: { pack: true } }).capacity, 28);
});

test('zombies chase on sight, telegraph contact attacks, can be dodged, and respect cooldowns', () => {
  const r = isolated(make()), e = r.enemies[0];
  e.health = e.maxHealth; e.x = r.player.x + 130; e.y = r.player.y; e.homeX = e.x; e.homeY = e.y;
  A.tick(r, .05); assert.equal(e.state, 'chase'); const x = e.x; advance(r, .5); assert.ok(e.x < x);
  e.x = r.player.x + 50; e.y = r.player.y; A.tick(r, .05); assert.equal(e.state, 'attack'); assert.equal(r.player.health, 100);
  advance(r, .7, { x: -1, y: 0 }); assert.equal(r.player.health, 100);
  e.x = r.player.x + 49; e.y = r.player.y; e.attackCooldown = 0; advance(r, .7); assert.equal(r.player.health, 92);
  advance(r, .7); assert.equal(r.player.health, 92);
});

test('combat has range and cooldown, kills enemies once, and creates one collectible parts drop', () => {
  const r = isolated(make({ gear: { axe: true } })), e = r.enemies[0]; e.health = e.maxHealth; e.x = r.player.x + 60; e.y = r.player.y;
  assert.equal(A.attack(r).damage, 32); assert.equal(A.attack(r).ok, false);
  advance(r, .5); assert.equal(A.attack(r).killed, true); assert.equal(r.kills, 1);
  assert.equal(r.nodes.filter(n => n.id === 'drop-' + e.id).length, 1);
  advance(r, .5); A.attack(r); assert.equal(r.kills, 1);
  assert.ok(A.gather(r).ok); assert.equal(r.loot.parts, 1);
  const far = make(); far.enemies.forEach(z => { z.health = 0; z.state = 'dead'; }); assert.equal(A.attack(far).damage, 0);
});

test('spear and crossbow extend range; spent arrows fall back to melee and buildings stop attacks', () => {
  const r = isolated(make({ gear: { spear: true, crossbow: true } })), e = r.enemies[0]; e.health = e.maxHealth; e.x = r.player.x + 230; e.y = r.player.y;
  assert.equal(A.attack(r).damage, 42); assert.equal(r.ammo, 7);
  r.ammo = 0; r.player.attackCooldown = 0; e.health = 48; e.x = r.player.x + 110;
  assert.equal(A.attack(r).damage, 28);
  r.player.attackCooldown = 0; Object.assign(r.player, { x: 1960, y: 590 }); Object.assign(e, { x: 2210, y: 590 }); r.ammo = 8;
  assert.equal(A.attack(r).damage, 0); assert.equal(r.ammo, 8);
});

test('noise attracts enemies beyond normal sight and a safer approach lowers pressure and cold', () => {
  const r = isolated(make()), e = r.enemies[0]; e.health = e.maxHealth; e.x = r.player.x - 250; e.y = r.player.y;
  A.tick(r, .05); assert.equal(e.state, 'wander'); A.attack(r); A.tick(r, .05); assert.equal(e.state, 'chase');
  const careful = make({ approach: 'careful' }), normal = make(), bold = make({ approach: 'bold' });
  assert.ok(careful.enemies.length < normal.enemies.length); assert.ok(bold.enemies.length > normal.enemies.length);
  assert.ok(careful.coldRate < normal.coldRate); assert.ok(bold.nodes.reduce((n, p) => n + p.total, 0) > normal.nodes.reduce((n, p) => n + p.total, 0));
});

test('extraction requires a living character in its zone; cold eventually causes death', () => {
  const r = isolated(make()); r.extractionProgress=5; assert.equal(A.canExtract(r), true);
  r.player.x += 100; assert.equal(A.canExtract(r), false);
  r.player.x = 510; r.player.health = .01; r.player.warmth = 0; A.tick(r, .05);
  assert.equal(r.status, 'dead'); assert.equal(A.canExtract(r), false); assert.ok(A.valid(r));
  const old = JSON.stringify(r); A.tick(r, .2, { x: 1, y: 0 }); assert.equal(JSON.stringify(r), old);
});
test('extraction requires five continuous simulation seconds and leaving resets progress',()=>{
 const r=A.create({seed:12});r.enemies.forEach(e=>e.health=0);r.coldRate=0;r.player.x=r.extraction.x;r.player.y=r.extraction.y;
 assert.equal(A.canExtract(r),false);
 for(let i=0;i<80;i++)A.tick(r,.05,{});assert.equal(A.canExtract(r),false);assert.ok(r.extractionProgress>3.9);
 r.player.x+=110;A.tick(r,.05,{});assert.equal(r.extractionProgress,0);
 r.player.x-=110;for(let i=0;i<101;i++)A.tick(r,.05,{});
 assert.equal(A.canExtract(r),true);assert.ok(A.valid(r));const restored=A.upgrade(JSON.parse(JSON.stringify(r)));assert.equal(restored.extractionProgress,5);
 restored.player.health=0;A.tick(restored,.05,{});assert.equal(A.canExtract(restored),false);
});
test('every map entry starts away from extraction and has a walkable route to it',()=>{
 for(const entry of World.ENTRY_POINTS){const r=A.create({seed:55,entryId:entry.id});assert.ok(A.valid(r));assert.equal(r.player.x,entry.x);assert.ok(Math.hypot(entry.x-r.extraction.x,entry.y-r.extraction.y)>r.extraction.radius*2);assert.ok(A.goTo(r,r.extraction.x,r.extraction.y).ok);}
});

test('healing consumes carried medicine before new loot; drop cannot create negative counts', () => {
  const r = make(); r.player.health = 30; r.loot.meds = 1;
  assert.ok(A.heal(r).ok); assert.equal(r.player.health, 65); assert.equal(r.player.meds, 0); assert.equal(r.loot.meds, 1);
  assert.ok(A.heal(r).ok); assert.equal(r.player.health, 100); assert.equal(r.loot.meds, 0); assert.equal(A.heal(r).ok, false);
  r.loot.food = 4; assert.ok(A.drop(r, 'food', 20).ok); assert.equal(r.loot.food, 0);
  assert.equal(A.drop(r, 'food', -5).ok, false); assert.equal(A.drop(r, 'health', 3).ok, false); assert.ok(A.valid(r));
});

test('save restoration preserves paths, random wandering, enemy attacks and future rewards', () => {
  const a = make({ day: 5, gear: { spear: true, pack: true } }); A.goTo(a, 660 + OFFSET.x, 430 + OFFSET.y); advance(a, 3);
  const b = JSON.parse(JSON.stringify(a)); assert.ok(A.valid(b));
  for (let i = 0; i < 150; i++) {
    if (i % 20 === 0) { assert.deepEqual(A.attack(a), A.attack(b)); assert.deepEqual(A.gather(a), A.gather(b)); }
    A.tick(a, .05, { x: i > 90 ? -1 : 0, y: i > 90 ? 1 : 0 }); A.tick(b, .05, { x: i > 90 ? -1 : 0, y: i > 90 ? 1 : 0 });
  }
  assert.deepEqual(a, b); assert.ok(A.valid(a));
});

test('saving during an active attack effect preserves the entire serializable run', () => {
  const r = make(); A.attack(r);
  const restored = JSON.parse(JSON.stringify(r));
  assert.deepEqual(r, restored); assert.ok(A.valid(restored));
  A.tick(r, .05); A.tick(restored, .05); assert.deepEqual(r, restored);
});

test('corrupt saves and excess limits are rejected; absent transient paths are accepted', () => {
  for (const change of [r => r.loot.wood = 19, r => r.enemies = [], r => r.nodes = [], r => r.player.x = 1000, r => r.player.health = 101, r => r.rngState = NaN, r => r.nodes[0].remaining = 999, r => r.ammo = 9, r => r.enemies[0].health = Infinity, r => r.gear.axe = 'yes']) {
    const r = make(); change(r); assert.equal(A.valid(r), false);
  }
  const r = make(); delete r.path; r.enemies.forEach(e => delete e.path); assert.ok(A.valid(r)); A.tick(r, .05); assert.ok(A.valid(r));
});


test('v4 uses two distinct maps, detailed room shells and reproducible supplies',()=>{
 const a=worldMake({gear:{pack:true}}),b=worldMake({gear:{pack:true}}),camp=worldMake({camp:true});assert.deepEqual(a,b);assert.ok(A.valid(a));assert.ok(A.valid(camp));
 assert.equal(a.version,A.VERSION);assert.equal(a.mapLayout,'expedition');assert.equal(a.width,3072);assert.equal(a.height,2048);assert.equal(camp.mapLayout,'base');assert.equal(camp.width,1536);assert.equal(camp.height,1024);
 assert.equal(a.nodes.length,63);assert.equal(a.enemies.length,30);assert.equal(a.capacity,28);assert.equal(World.BUILDINGS.length,20);assert.deepEqual(a.obstacles,World.BUILDINGS.flatMap(World.shell));
 assert.deepEqual(new Set(a.nodes.map(n=>n.region)),new Set(['forest','mountain','suburb','city']));assert.equal(a.nodes.filter(n=>n.buildingId).length,20);
});
test('all supplies and every room are reached by actual walking through doors',()=>{
 const run=isolated(worldMake());run.coldRate=0;
 for(const n of run.nodes){assert.ok(A.goTo(run,n.x,n.y).ok,n.id);let p=run.player,total=0;for(const q of run.path){total+=Math.hypot(q.x-p.x,q.y-p.y);p=q;}advance(run,Math.ceil(total/190)+3);assert.ok(distance(run.player,n)<3,n.id);assert.ok(A.valid(run));}
 function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
});
test('river gorge blocks free crossing, while all bridge and path endpoints are connected',()=>{
 const r=worldMake();assert.equal(A.goTo(r,1760,100).ok,false);
 for(const road of World.ROADS)for(const p of road.points){if(World.walkable(p.x,p.y,24))assert.ok(A.goTo(r,p.x,p.y).ok,road.id);}
});
test('base facilities are walkable, safe and remain in their own playable courtyard',()=>{
 const r=worldMake({camp:true,health:45,warmth:0});assert.deepEqual(r.facilities,World.BASE.FACILITIES);
 for(const f of r.facilities){assert.ok(A.goTo(r,f.x,f.y).ok);advance(r,5);assert.ok(Math.hypot(r.player.x-f.x,r.player.y-f.y)<3);}
 assert.equal(r.player.health,45);assert.equal(r.player.warmth,0);assert.equal(A.canExtract(r),false);assert.equal(A.goTo(r,0,0).ok,false);
 for(const op of [()=>A.attack(r),()=>A.gather(r),()=>A.heal(r),()=>A.drop(r,'food')])assert.equal(op().ok,false);
 assert.equal(r.nodes.length,0);assert.equal(r.enemies.length,0);assert.ok(A.valid(r));
});
test('snow compression persists through saving and all four snow levels reduce visibility',()=>{
 const r=isolated(worldMake());advance(r,2,{x:1,y:0});assert.ok(r.snowTracks.length>5);assert.deepEqual(JSON.parse(JSON.stringify(r)).snowTracks,r.snowTracks);assert.ok(A.valid(r));
 const levels=[1,2,3,4].map(level=>{r.weatherLevel=level;assert.ok(A.valid(r));return A.weather(r);});assert.deepEqual(levels.map(v=>v.name),['小雪','中雪','大雪','特大雪']);assert.ok(levels.every((v,i)=>!i||v.visibility<levels[i-1].visibility));
 r.weatherLevel=5;assert.equal(A.valid(r),false);
});
test('each successful search opens its container exactly once without duplicate resources',()=>{
 const r=isolated(worldMake()),n=r.nodes[0];Object.assign(r.player,{x:n.x,y:n.y});const gain=A.gather(r);assert.equal(gain.ok,true);assert.equal(n.opened,true);assert.ok(r.effects.some(e=>e.type==='open'&&e.nodeId===n.id));const cargo={...r.loot};A.gather(r);assert.deepEqual(r.loot,cargo);assert.ok(A.valid(r));
});
test('active exploration restores future movement, attacks and rewards deterministically',()=>{
 const a=worldMake({gear:{spear:true,pack:true}});A.goTo(a,World.CACHES[2].x,World.CACHES[2].y);advance(a,2);const b=JSON.parse(JSON.stringify(a));assert.ok(A.valid(b));
 for(let i=0;i<80;i++){if(i%20===0){assert.deepEqual(A.attack(a),A.attack(b));assert.deepEqual(A.gather(a),A.gather(b));}A.tick(a,.05);A.tick(b,.05);}assert.deepEqual(a,b);assert.ok(A.valid(a));
});
test('v2 upgrades preserve all data and old v3 world keeps its original map',()=>{
 const r=make();r.player.health=77;r.loot.food=3;const expected=JSON.parse(JSON.stringify(r));expected.version=A.VERSION;A.upgrade(r);assert.deepEqual(r,expected);assert.ok(A.valid(r));
 const data=World.LEGACY_WORLD,old=worldMake();old.version=3;old.mapLayout='world';old.width=data.WIDTH;old.height=data.HEIGHT;old.obstacles=data.OBSTACLES.map(o=>({...o}));old.facilities=data.FACILITIES.map(f=>({...f}));Object.assign(old.player,data.SPAWN);Object.assign(old.noise,data.SPAWN);Object.assign(old.extraction,data.SPAWN);
 old.nodes=data.CACHES.map(n=>{const rewards={wood:0,food:0,parts:0,meds:0,...n.rewards},total=Object.values(rewards).reduce((a,b)=>a+b,0);return{...n,kind:'supply',rewards,total,remaining:total};});
 old.enemies=old.enemies.map((e,i)=>({...e,x:data.ENEMY_SPAWNS[i].x,y:data.ENEMY_SPAWNS[i].y,homeX:data.ENEMY_SPAWNS[i].x,homeY:data.ENEMY_SPAWNS[i].y}));assert.ok(A.valid(old));const before=JSON.parse(JSON.stringify(old));before.version=A.VERSION;A.upgrade(old);assert.deepEqual(old,before);assert.equal(A.mapData(old),data);assert.ok(A.valid(old));
});
