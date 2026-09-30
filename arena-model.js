(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./world-data.js'));
  else root.Expedition = factory(root.WhiteoutWorld);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (World) {
  'use strict';

  const VERSION = 4, WIDTH = World.WIDTH, HEIGHT = World.HEIGHT, RADIUS = 24, GRID = 24, CAMP_RADIUS = 360;
  const LEGACY_OFFSET = { x: 384, y: 256 };
  const KEYS = ['wood', 'food', 'parts', 'meds'];
  const LEGACY_OBSTACLES = [
    { x: 554, y: 331, w: 445, h: 265 },
    { x: 1419, y: 346, w: 310, h: 245 },
    { x: 854, y: 896, w: 300, h: 210 },
    { x: 1449, y: 796, w: 335, h: 245 }
  ];
  const V2_OBSTACLES = [
    { x: 510, y: 240, w: 470, h: 270 },
    { x: 1405, y: 255, w: 305, h: 210 },
    { x: 824, y: 893, w: 310, h: 205 },
    { x: 1425, y: 778, w: 335, h: 225 },
    { x: 78, y: 413, w: 198, h: 138 },
    { x: 88, y: 750, w: 190, h: 140 },
    { x: 980, y: 40, w: 350, h: 108 },
    { x: 2000, y: 495, w: 180, h: 220 }
  ];
  const OBSTACLES = World.OBSTACLES;
  const NODE_POINTS = [[310, 670], [280, 410], [660, 260], [660, 430], [900, 150], [990, 410], [1440, 380], [990, 650], [820, 900], [1380, 900]].map(p => [p[0] + LEGACY_OFFSET.x, p[1] + LEGACY_OFFSET.y]);
  const ENEMY_POINTS = [[1124, 686], [1284, 586], [2230, 450], [1814, 716], [140, 1060], [1660, 1360], [1320, 230], [1244, 826], [370, 580], [1960, 1340], [830, 200], [2160, 980], [1070, 1450], [150, 730], [1850, 260], [540, 1380]];
  const PERIPHERAL_NODES = [
    { x: 170, y: 590, region: 'works', name: '西侧锯木台', rewards: { wood: 3 } },
    { x: 190, y: 970, region: 'works', name: '旧修理棚工具箱', rewards: { parts: 2, wood: 1 } },
    { x: 300, y: 1250, region: 'works', name: '围栏后的板料', rewards: { wood: 3 } },
    { x: 780, y: 150, region: 'works', name: '北线检修工具', rewards: { parts: 2, wood: 1 } },
    { x: 1260, y: 190, region: 'supplies', name: '检修员的口粮', rewards: { food: 3 } },
    { x: 1800, y: 160, region: 'medical', name: '值班救护柜', rewards: { meds: 1, food: 1 } },
    { x: 2120, y: 420, region: 'supplies', name: '东线食品架', rewards: { food: 3 } },
    { x: 2140, y: 830, region: 'supplies', name: '货运粮箱', rewards: { food: 2, wood: 1 } },
    { x: 2070, y: 1250, region: 'medical', name: '运输急救箱', rewards: { meds: 1, parts: 1 } },
    { x: 950, y: 1400, region: 'works', name: '南侧干木料架', rewards: { wood: 3 } },
    { x: 1450, y: 1390, region: 'works', name: '废车工具包', rewards: { parts: 2, wood: 1 } },
    { x: 1830, y: 1400, region: 'supplies', name: '路班备用口粮', rewards: { food: 3 } }
  ];
  const KIND = { wood: ['woodpile', '木料堆'], food: ['supply', '食品箱'], parts: ['toolbox', '工具箱'], meds: ['medical', '急救箱'] };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const amount = n => Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;

  function random(run) {
    let n = run.rngState | 0;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    run.rngState = n >>> 0;
    return run.rngState / 4294967296;
  }

  function blockedOn(x, y, radius, width, height, obstacles) {
    if (x < radius || y < radius || x > width - radius || y > height - radius) return true;
    return obstacles.some(o => {
      const px = clamp(x, o.x, o.x + o.w), py = clamp(y, o.y, o.y + o.h);
      return (x - px) ** 2 + (y - py) ** 2 < radius ** 2;
    });
  }

  function mapData(run) { return run.mapLayout==='base'?World.BASE:run.mapLayout==='expedition'?World:run.mapLayout==='world'?World.LEGACY_WORLD:null; }
  function runObstacles(run) { const data=mapData(run);return run.obstacles || (data?data.OBSTACLES:run.mapLayout === 'legacy' ? LEGACY_OBSTACLES : V2_OBSTACLES); }
  function blocked(x, y, radius, run) {
    const data=mapData(run);
    if(run.mapLayout==='base'&&!data.walkable(x,y,radius))return true;
    if(run.mapLayout==='expedition'&&data.terrainBlocked(x,y,radius))return true;
    if (run.camp && run.mapLayout==='world' && Math.hypot(x-data.SPAWN.x,y-data.SPAWN.y)>CAMP_RADIUS-radius) return true;
    if (run.mapLayout === 'legacy' && (x < LEGACY_OFFSET.x + radius || y < LEGACY_OFFSET.y + radius || x > LEGACY_OFFSET.x + 1536 - radius || y > LEGACY_OFFSET.y + 1024 - radius)) return true;
    return blockedOn(x, y, radius, run.width, run.height, runObstacles(run));
  }

  function move(body, dx, dy, radius, run) {
    // Axis separation lets the character slide along a wall without entering it.
    const data=mapData(run);
    const forbidden = (x,y) => blocked(x,y,radius,run) || body !== run.player && data && !run.camp && Math.hypot(x-data.SPAWN.x,y-data.SPAWN.y)<data.SAFE_RADIUS+radius;
    if (!forbidden(body.x + dx, body.y)) body.x += dx;
    if (!forbidden(body.x, body.y + dy)) body.y += dy;
    if (Math.hypot(dx, dy) > .01) body.angle = Math.atan2(dy, dx);
  }

  function gridRoute(from, to, radius, run) {
    const cols = Math.ceil(run.width / GRID), rows = Math.ceil(run.height / GRID);
    const cell = p => ({ x: clamp(Math.floor(p.x / GRID), 0, cols - 1), y: clamp(Math.floor(p.y / GRID), 0, rows - 1) });
    const start = cell(from), goal = cell(to), idx = (x, y) => y * cols + x;
    const center = (x, y) => ({ x: x * GRID + GRID / 2, y: y * GRID + GRID / 2 });
    if (blocked(to.x, to.y, radius, run)) return null;
    if (clearSegment(from, to, radius, run)) return [{x:to.x,y:to.y}];
    // A goal beside a wall can share a grid cell whose center is obstructed.
    // Choose the nearest reachable center, then finish at the exact destination.
    const candidates = [];
    for (let y = goal.y - 1; y <= goal.y + 1; y++) for (let x = goal.x - 1; x <= goal.x + 1; x++) {
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const p = center(x, y);
      if (!blocked(p.x, p.y, radius, run) && clearSegment(p, to, radius, run)) candidates.push({ x, y, d: distance(p, to) });
    }
    candidates.sort((a, b) => a.d - b.d);
    if (!candidates.length) return null;
    const dest = candidates[0], target = idx(dest.x, dest.y), origin = idx(start.x, start.y);
    const prev = new Int32Array(cols * rows).fill(-1), queue = [origin];
    prev[origin] = origin;
    for (let q = 0; q < queue.length && prev[target] === -1; q++) {
      const current = queue[q], x = current % cols, y = Math.floor(current / cols);
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const ni = idx(nx, ny), p = center(nx, ny);
        if (prev[ni] !== -1 || blocked(p.x, p.y, radius, run)) continue;
        const parent = current === origin ? from : center(x, y);
        if (!clearSegment(parent, p, radius, run)) continue;
        prev[ni] = current; queue.push(ni);
      }
    }
    if (prev[target] === -1) return null;
    const reversed = [];
    for (let n = target; n !== origin; n = prev[n]) reversed.push(center(n % cols, Math.floor(n / cols)));
    const raw = [from, ...reversed.reverse(), to], route = [];
    let anchor = 0;
    while (anchor < raw.length - 1) {
      let next = anchor + 1;
      for (let i = next + 1; i < raw.length; i++) {
        if (clearSegment(raw[anchor], raw[i], radius, run)) next = i;
        else break;
      }
      route.push({ x: raw[next].x, y: raw[next].y }); anchor = next;
    }
    return route;
  }

  function clearSegment(a, b, radius, run) {
    const steps = Math.max(1, Math.ceil(distance(a, b) / 8));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (blocked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, radius, run)) return false;
    }
    return true;
  }

  function resourceNode(id, x, y, rewards) {
    const entries = KEYS.filter(k => rewards[k] > 0), primary = entries.sort((a, b) => rewards[b] - rewards[a])[0] || 'parts';
    const total = KEYS.reduce((n, k) => n + (rewards[k] || 0), 0);
    return { id, x, y, kind: KIND[primary][0], name: id === 'cache-0' ? '路边补给' : KIND[primary][1], rewards: Object.assign({ wood: 0, food: 0, parts: 0, meds: 0 }, rewards), remaining: total, total };
  }

  function create(config) {
    config = config || {};
    const seed = ((amount(config.seed) || 17383) >>> 0) || 17383;
    const gear = Object.assign({}, config.gear || {}), levels = Object.assign({}, config.levels || {});
    const loc = typeof config.location === 'object' && config.location ? config.location : { id: typeof config.location === 'string' ? config.location : 'forest', name: '北坡林地', base: { wood: 7, food: 1 }, cold: 7 };
    const approach = ['careful', 'normal', 'bold'].includes(config.approach) ? config.approach : 'normal';
    const data=config.camp===true?World.BASE:World;
    const run = {
      version: VERSION, width: data.WIDTH, height: data.HEIGHT, mapLayout: config.camp===true?'base':'expedition', camp: config.camp === true, seed, rngState: seed,
      day: clamp(amount(config.day) || 1, 1, 1000), approach, locationId: loc.id || 'forest', locationName: loc.name || '荒废街区',
      player: { x: data.SPAWN.x, y: data.SPAWN.y, angle: -.8, health: clamp(Number.isFinite(config.health) ? config.health : 100, 0, 100), warmth: clamp(Number.isFinite(config.warmth) ? config.warmth : 75, 0, 100), meds: clamp(amount(config.meds), 0, 999), attackCooldown: 0, invulnerable: 0 },
      loot: { wood: 0, food: 0, parts: 0, meds: 0 }, capacity: gear.pack ? 28 : 18, elapsed: 0, kills: 0,
      enemies: [], nodes: [], effects: [], noise: { x: data.SPAWN.x, y: data.SPAWN.y, radius: 0, time: 0 },
      extraction: { x: data.SPAWN.x, y: data.SPAWN.y, radius: 90 }, obstacles: data.OBSTACLES.map(o => Object.assign({}, o)), facilities: data.FACILITIES.map(f=>Object.assign({},f)), gear, levels, ammo: gear.crossbow ? 8 : 0,
      // Longer optional routes get a small cold allowance without changing combat speed.
      coldRate: clamp(.045 + (Number(loc.cold) || 7) * .0015, .045, .075) * (approach === 'careful' ? .65 : approach === 'bold' ? 1.15 : 1) * (gear.coat ? .6 : 1) * (gear.boots ? .88 : 1),
      path: [], snowTracks:[], snowStep:0, status: 'active'
    };
    run.extractionProgress=0;
    if(!run.camp){const entry=World.ENTRY_POINTS.find(p=>p.id===config.entryId)||World.ENTRY_POINTS[0];run.entryId=entry.id;run.player.x=entry.x;run.player.y=entry.y;run.noise.x=entry.x;run.noise.y=entry.y;run.extraction={...World.EXIT};}
    if (run.player.health === 0) run.status = 'dead';
    if (run.camp) return run;
    const base=loc.base||{wood:7,food:1}, primary=KEYS.filter(k=>base[k]).sort((a,b)=>base[b]-base[a])[0]||'wood';
    World.CACHES.forEach(cache=>{
      const rewards=Object.assign({},cache.rewards);
      if(cache.id!=='cache-0'){
        for(const key of KEYS)if(rewards[key]&&key!=='meds')rewards[key]=Math.max(1,Math.round(rewards[key]*(approach==='careful'?.75:approach==='bold'?1.3:1)));
        if(rewards[primary]&&primary!=='meds')rewards[primary]++;
        if(gear.axe&&rewards.wood)rewards.wood++;
      }
      const node=resourceNode(cache.id,cache.x,cache.y,rewards);node.name=cache.name;node.region=cache.region;if(cache.buildingId)node.buildingId=cache.buildingId;run.nodes.push(node);
    });
    const count = clamp((approach === 'careful' ? 24 : approach === 'bold' ? 36 : 30) + Math.floor((run.day - 1) / 2), 24, 44);
    for (let i = 0; i < count; i++) {
      const candidates=World.ENEMY_SPAWNS.filter(p=>distance(p,run.player)>320&&distance(p,run.extraction)>200);
      const p = candidates[i%candidates.length], type = p.type;
      const maxHealth = type === 'wolf' ? 38 : 48 + Math.min(12, (run.day - 1) * 2);
      run.enemies.push({ id: 'enemy-' + i, type, x: p.x, y: p.y, angle: random(run) * Math.PI * 2, health: maxHealth, maxHealth, state: 'wander', attackCooldown: 0, windup: 0, hitTime: 0, homeX: p.x, homeY: p.y, wanderAngle: random(run) * Math.PI * 2, wanderTime: 1 + random(run) * 3, path: [], routeTime: 0, lastSeen: 0 });
    }
    return run;
  }

  function weight(run) { return KEYS.reduce((n, k) => n + amount(run.loot[k]), 0); }
  function goTo(run, x, y) {
    if (run.status !== 'active') return { ok: false, error: '已经无法移动' };
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, error: '无法到达这里' };
    if (run.camp && blocked(x,y,RADIUS,run)) return { ok: false, error: '先从基地出口出发' };
    const path = gridRoute(run.player, { x, y }, RADIUS, run);
    if (!path) return { ok: false, error: '这里被建筑挡住了' };
    run.path = path; return { ok: true, path };
  }

  function follow(body, path, speed, dt, radius, run) {
    let available = speed * dt;
    while (path.length && available > 0) {
      const goal = path[0], dx = goal.x - body.x, dy = goal.y - body.y, d = Math.hypot(dx, dy);
      if (d < 2) { path.shift(); continue; }
      const step = Math.min(d, available), before = { x: body.x, y: body.y };
      move(body, dx / d * step, dy / d * step, radius, run);
      available -= step;
      if (distance(body, before) < .01) break;
      if (step >= d - .001) path.shift();
    }
  }

  function effect(run, type, x, y, duration, extra) {
    run.effects.push(Object.assign({ type, x, y, time: duration, duration }, extra || {}));
    if (run.effects.length > 60) run.effects.splice(0, run.effects.length - 60);
  }

  function emitNoise(run, radius) {
    run.noise = { x: run.player.x, y: run.player.y, radius, time: 2.6 };
  }

  function tickStep(run, dt, input) {
    const p = run.player;
    run.elapsed += dt;
    p.attackCooldown = Math.max(0, p.attackCooldown - dt); p.invulnerable = Math.max(0, p.invulnerable - dt);
    run.noise.time = Math.max(0, run.noise.time - dt);
    run.effects.forEach(e => e.time -= dt); run.effects = run.effects.filter(e => e.time > 0);
    const ix = Number(input.x) || 0, iy = Number(input.y) || 0, mag = Math.hypot(ix, iy);
    const data=mapData(run);
    const speed = data && !run.camp ? run.mapLayout==='world'?(run.gear.boots?255:240)*(data.onRoad(p.x,p.y)?1.35:1):(run.gear.boots ? 225 : 210)*(data.onRoad(p.x,p.y)?1.25:1) : run.gear.boots ? 205 : 190;
    const before={x:p.x,y:p.y};
    if (mag > .05) {
      run.path = [];
      move(p, ix / mag * speed * dt, iy / mag * speed * dt, RADIUS, run);
    } else if (run.path && run.path.length) follow(p, run.path, speed, dt, RADIUS, run);
    const walked=distance(before,p);
    if(['base','expedition'].includes(run.mapLayout)&&walked>.01){
      run.snowStep=(run.snowStep||0)+walked;
      if(run.snowStep>=22){run.snowStep%=22;const data=mapData(run),inside=run.camp?p.y<450:data.BUILDINGS.some(b=>p.x>b.x&&p.x<b.x+b.w&&p.y>b.y&&p.y<b.y+b.h);
        if(!inside){run.snowTracks=run.snowTracks||[];const side=run.snowTracks.length%2?1:-1;run.snowTracks.push({x:p.x-Math.sin(p.angle)*5*side,y:p.y+Math.cos(p.angle)*5*side,angle:p.angle,time:run.elapsed,side});if(run.snowTracks.length>2400)run.snowTracks.shift();}
      }
    }
    if (run.camp) return;
    p.warmth = Math.max(0, p.warmth - run.coldRate * dt);
    if (p.warmth <= 0) p.health = Math.max(0, p.health - .6 * dt);
    for (const e of run.enemies) {
      if (e.health <= 0) { e.state = 'dead'; continue; }
      e.attackCooldown = Math.max(0, e.attackCooldown - dt); e.hitTime = Math.max(0, e.hitTime - dt); e.routeTime -= dt;
      const d = distance(e, p), sight = e.type === 'wolf' ? 285 : 225;
      const safe = data&&!run.camp&&Math.hypot(p.x-data.SPAWN.x,p.y-data.SPAWN.y)<data.SAFE_RADIUS;
      const seesPlayer = !safe && d < sight && clearSegment(e, p, 8, run), hears = !safe && run.noise.time > 0 && distance(e, run.noise) < run.noise.radius;
      if(safe)e.lastSeen=0;
      if (seesPlayer) e.lastSeen = 4;
      else e.lastSeen = Math.max(0, e.lastSeen - dt);
      if (e.windup > 0) {
        e.windup = Math.max(0,e.windup-dt); e.state = 'attack';
        if (e.windup <= 0) {
          if (!safe && distance(e, p) < 64 && p.invulnerable <= 0) {
            const damage = e.type === 'wolf' ? 6 : 8;
            p.health = Math.max(0, p.health - damage); p.invulnerable = .9;
            effect(run, 'hit', p.x, p.y, .45, { damage, target: 'player' });
          }
          e.attackCooldown = e.type === 'wolf' ? 1.45 : 1.7;
          e.state = 'chase';
        }
        continue;
      }
      if (e.hitTime > 0) continue;
      if (d < 54 && e.attackCooldown <= 0 && (seesPlayer || e.lastSeen > 0)) {
        e.windup = e.type === 'wolf' ? .48 : .58; e.state = 'attack'; e.angle = Math.atan2(p.y - e.y, p.x - e.x); continue;
      }
      if (seesPlayer || e.lastSeen > 0 || hears) {
        e.state = 'chase';
        const target = seesPlayer || e.lastSeen > 0 ? p : run.noise;
        if (e.routeTime <= 0 || !e.path || !e.path.length) {
          e.path = clearSegment(e, target, 22, run) ? [{ x: target.x, y: target.y }] : gridRoute(e, target, 22, run) || [];
          e.routeTime = .6;
        }
        // Leave enough room for the attack warning, instead of overlapping the player.
        if (d > 47 || target !== p) follow(e, e.path, e.type === 'wolf' ? 95 : 55, dt, 22, run);
      } else {
        e.state = 'wander'; e.path = []; e.wanderTime -= dt;
        if (e.wanderTime <= 0) { e.wanderAngle = random(run) * Math.PI * 2; e.wanderTime = 1.5 + random(run) * 3; }
        if (Math.hypot(e.x - e.homeX, e.y - e.homeY) > 85) e.wanderAngle = Math.atan2(e.homeY - e.y, e.homeX - e.x);
        move(e, Math.cos(e.wanderAngle) * 14 * dt, Math.sin(e.wanderAngle) * 14 * dt, 22, run);
      }
    }
    if (p.health <= 0) { p.health = 0; run.status = 'dead'; run.path = []; }
    run.extractionProgress=inExtraction(run)?Math.min(5,(run.extractionProgress||0)+dt):0;
  }

  function tick(run, dt, input) {
    if (run.status !== 'active' || !Number.isFinite(dt) || dt <= 0) return run;
    let remaining = Math.min(dt, .25);
    while (remaining > .000001 && run.status === 'active') {
      const step = Math.min(.05, remaining); tickStep(run, step, input || {}); remaining -= step;
    }
    return run;
  }

  function attack(run) {
    if (run.camp) return { ok: false, error: '在营地使用工作台准备装备' };
    if (run.status !== 'active') return { ok: false, error: '已经无法战斗' };
    const p = run.player;
    if (p.attackCooldown > .000001) return { ok: false, error: '正在收招' };
    const ranged = !!run.gear.crossbow && run.ammo > 0;
    const range = ranged ? 280 : run.gear.spear ? 120 : 82;
    const damage = ranged ? 42 : run.gear.axe ? 32 : run.gear.spear ? 28 : 20;
    const target = run.enemies.filter(e => e.health > 0 && distance(e, p) <= range && clearSegment(p, e, 6, run)).sort((a, b) => distance(a, p) - distance(b, p))[0];
    p.attackCooldown = ranged ? .8 : .5;
    emitNoise(run, ranged ? 330 : 270);
    if (target) p.angle = Math.atan2(target.y - p.y, target.x - p.x);
    const attackEffect = { angle: p.angle, range };
    if (target) { attackEffect.toX = target.x; attackEffect.toY = target.y; }
    effect(run, ranged && target ? 'shot' : 'slash', p.x, p.y, ranged ? .28 : .32, attackEffect);
    // An empty swing does not waste a bolt.
    if (!target) return { ok: true, damage: 0, killed: false };
    if (ranged) run.ammo--;
    target.health = Math.max(0, target.health - damage); target.hitTime = .24; target.windup = 0; target.state = 'chase'; target.lastSeen = 4;
    effect(run, 'hit', target.x, target.y, .4, { damage, target: target.id });
    const killed = target.health === 0;
    if (killed) {
      target.state = 'dead'; target.path = []; run.kills++;
      effect(run, 'death', target.x, target.y, .65, { target: target.id });
      run.nodes.push(resourceNode('drop-' + target.id, target.x, target.y, { parts: 1 }));
    }
    return { ok: true, damage, killed, target: target.id };
  }

  function nearestNode(run) {
    const data=mapData(run);
    return run.nodes.filter(n => n.remaining > 0 && (!n.buildingId||data&&data.BUILDINGS.some(b=>b.id===n.buildingId&&run.player.x>b.x&&run.player.x<b.x+b.w&&run.player.y>b.y&&run.player.y<b.y+b.h)) && distance(n, run.player) <= 75 && clearSegment(run.player, n, 6, run)).sort((a, b) => distance(a, run.player) - distance(b, run.player))[0] || null;
  }

  function gather(run) {
    if (run.camp) return { ok: false, error: '物资需要出发搜刮后带回' };
    if (run.status !== 'active') return { ok: false, error: '已经无法搜寻' };
    const n = nearestNode(run);
    if (!n) return { ok: false, error: '靠近物资后再搜寻' };
    let free = run.capacity - weight(run);
    if (free <= 0) return { ok: false, error: '背包已满，先撤回或丢弃物资' };
    const gain = { wood: 0, food: 0, parts: 0, meds: 0 };
    for (const key of KEYS) {
      const take = Math.min(free, n.rewards[key]);
      gain[key] = take; run.loot[key] += take; n.rewards[key] -= take; n.remaining -= take; free -= take;
    }
    n.opened=true;
    effect(run, 'open', n.x, n.y, 1.1, { nodeId:n.id });
    effect(run, 'loot', n.x, n.y, .85, { gain: Object.assign({}, gain), amount: KEYS.reduce((sum, key) => sum + gain[key], 0) });
    emitNoise(run, 135);
    return { ok: true, gain, node: n.id, remaining: n.remaining };
  }

  function heal(run) {
    if (run.camp) return { ok: false, error: '通过营地补给处理伤口' };
    if (run.status !== 'active') return { ok: false, error: '已经无法治疗' };
    if (run.player.health >= 100) return { ok: false, error: '目前没有伤口' };
    if (!run.player.meds && !run.loot.meds) return { ok: false, error: '没有急救包' };
    if (run.player.meds) run.player.meds--; else run.loot.meds--;
    const before = run.player.health; run.player.health = Math.min(100, before + 35);
    effect(run, 'heal', run.player.x, run.player.y, .9, { amount: run.player.health - before });
    return { ok: true, gain: { health: run.player.health - before } };
  }

  function drop(run, key, requested) {
    if (run.camp) return { ok: false, error: '通过营地仓库整理物资' };
    if (run.status !== 'active') return { ok: false, error: '已经无法整理背包' };
    if (!KEYS.includes(key)) return { ok: false, error: '没有这种物资' };
    const n = Math.min(run.loot[key], amount(requested === undefined ? 1 : requested));
    if (!n) return { ok: false, error: '背包里没有这种物资' };
    run.loot[key] -= n;
    return { ok: true, dropped: { [key]: n } };
  }

  function inExtraction(run) { return !run.camp && run.status === 'active' && run.player.health > 0 && distance(run.player, run.extraction) <= run.extraction.radius; }
  function canExtract(run) { return inExtraction(run)&&(run.extractionProgress||0)>=5; }

  function valid(run, legacy) {
    if(!run)return false;
    const layout = run && run.mapLayout === undefined ? 'current' : run && run.mapLayout;
    const data=mapData(run);
    const width = legacy ? 1536 : data?data.WIDTH:2304, height = legacy ? 1024 : data?data.HEIGHT:1536;
    const obstacles = legacy ? LEGACY_OBSTACLES.map(o => ({ x: o.x - LEGACY_OFFSET.x, y: o.y - LEGACY_OFFSET.y, w: o.w, h: o.h })) : layout === 'legacy' ? LEGACY_OBSTACLES : data?data.OBSTACLES:V2_OBSTACLES;
    const finite = (v, max) => Number.isFinite(v) && v >= 0 && v <= max;
    const point = p => p && finite(p.x, width) && finite(p.y, height) && (!run.camp || layout!=='world' || Math.hypot(p.x-data.SPAWN.x,p.y-data.SPAWN.y)<=CAMP_RADIUS-RADIUS) && (legacy || layout !== 'legacy' || p.x >= LEGACY_OFFSET.x && p.y >= LEGACY_OFFSET.y && p.x <= LEGACY_OFFSET.x + 1536 && p.y <= LEGACY_OFFSET.y + 1024);
    const quantity = v => Number.isSafeInteger(v) && v >= 0 && v <= 100000;
    if ((legacy ? run.version!==1 : ![2,3,VERSION].includes(run.version)) || run.width !== width || run.height !== height || !['active', 'dead'].includes(run.status)) return false;
    if (!['legacy','current','world','expedition','base'].includes(layout) || run.version===2&&layout==='world') return false;
    if(run.camp!==undefined&&typeof run.camp!=='boolean'||run.camp&&!['world','base'].includes(layout))return false;
    if (run.obstacles !== undefined && (!Array.isArray(run.obstacles) || run.obstacles.length !== obstacles.length || run.obstacles.some((o, i) => !o || ['x', 'y', 'w', 'h'].some(k => o[k] !== obstacles[i][k])))) return false;
    if (!Number.isSafeInteger(run.seed) || run.seed < 0 || run.seed > 4294967295 || !Number.isSafeInteger(run.rngState) || run.rngState < 0 || run.rngState > 4294967295) return false;
    if (!Number.isSafeInteger(run.day) || run.day < 1 || run.day > 1000 || !['careful', 'normal', 'bold'].includes(run.approach)) return false;
    if (typeof run.locationId !== 'string' || typeof run.locationName !== 'string' || run.locationId.length > 80 || run.locationName.length > 120) return false;
    if (!point(run.player) || !finite(run.player.health, 100) || !finite(run.player.warmth, 100) || !quantity(run.player.meds) || !finite(run.player.attackCooldown, 10) || !finite(run.player.invulnerable, 10) || !Number.isFinite(run.player.angle)) return false;
    if (!run.loot || KEYS.some(k => !quantity(run.loot[k])) || ![18, 28].includes(run.capacity) || weight(run) > run.capacity || !finite(run.elapsed, 10000000) || !quantity(run.kills) || !quantity(run.ammo) || run.ammo > 8 || !finite(run.coldRate, 1)) return false;
    if (!run.gear || Object.values(run.gear).some(v => typeof v !== 'boolean') || !run.levels || Object.values(run.levels).some(v => !Number.isSafeInteger(v) || v < 0 || v > 2)) return false;
    if (!point(run.extraction) || !finite(run.extraction.radius, 200) || run.extraction.radius < 1 || !point(run.noise) || !finite(run.noise.radius, 1000) || !finite(run.noise.time, 10)) return false;
    if(run.extractionProgress!==undefined&&!finite(run.extractionProgress,5))return false;
    if (!Array.isArray(run.enemies) || (run.camp?run.enemies.length!==0:run.enemies.length<1) || run.enemies.length > 48 || run.enemies.some(e => !point(e) || !['zombie', 'wolf'].includes(e.type) || !['wander', 'chase', 'attack', 'dead'].includes(e.state) || typeof e.id !== 'string' || !finite(e.health, 1000) || !finite(e.maxHealth, 1000) || e.maxHealth < 1 || e.health > e.maxHealth || !Number.isFinite(e.angle) || !finite(e.attackCooldown, 10) || !finite(e.windup, 10) || !finite(e.hitTime, 10) || !finite(e.lastSeen, 10) || !Number.isFinite(e.routeTime) || !point({ x: e.homeX, y: e.homeY }) || !Number.isFinite(e.wanderAngle) || !finite(e.wanderTime, 10))) return false;
    if (!Array.isArray(run.nodes) || (run.camp?run.nodes.length!==0:run.nodes.length<(layout==='world'?72:10)) || run.nodes.length > 160 || run.nodes.some(n => !point(n) || typeof n.id !== 'string' || typeof n.kind !== 'string' || typeof n.name !== 'string' || !quantity(n.remaining) || !quantity(n.total) || n.remaining > n.total || !n.rewards || KEYS.some(k => !quantity(n.rewards[k])) || KEYS.reduce((sum, key) => sum + n.rewards[key], 0) !== n.remaining)) return false;
    if(run.facilities!==undefined&&(!Array.isArray(run.facilities)||run.facilities.length!==5||run.facilities.some((f,i)=>!point(f)||f.id!==World.FACILITIES[i].id||typeof f.name!=='string')))return false;
    if(run.camp&&!run.facilities)return false;
    if (!Array.isArray(run.effects) || run.effects.length > 60 || run.effects.some(e => !point(e) || typeof e.type !== 'string' || !finite(e.time, 10) || !finite(e.duration, 10) || e.toX !== undefined && !point({ x: e.toX, y: e.y }) || e.toY !== undefined && !point({ x: e.x, y: e.toY }))) return false;
    if (run.path !== undefined && (!Array.isArray(run.path) || run.path.length > 2000 || run.path.some(p => !point(p)))) return false;
    if(run.weatherLevel!==undefined&&(!Number.isInteger(run.weatherLevel)||run.weatherLevel<1||run.weatherLevel>4))return false;
    if(run.snowTracks!==undefined&&(!Array.isArray(run.snowTracks)||run.snowTracks.length>2400||run.snowTracks.some(f=>!point(f)||!Number.isFinite(f.angle)||!finite(f.time,10000000)||![1,-1].includes(f.side))))return false;
    if (run.enemies.some(e => e.path !== undefined && (!Array.isArray(e.path) || e.path.length > 2000 || e.path.some(p => !point(p))))) return false;
    const collides = (p, radius) => legacy ? blockedOn(p.x, p.y, radius, width, height, obstacles) : blocked(p.x, p.y, radius, run);
    if (collides(run.player, RADIUS) || run.enemies.some(e => collides(e, 22)) || run.nodes.some(n => collides(n, 1))) return false;
    return !(run.status === 'active' && run.player.health <= 0) && !(run.status === 'dead' && run.player.health > 0);
  }

  function upgrade(run) {
    if(!run)return run;
    if(run.version===2||run.version===3){if(valid(run))run.version=VERSION;return run;}
    if (run.version !== 1 || !valid(run, true)) return run;
    const translate = p => { p.x += LEGACY_OFFSET.x; p.y += LEGACY_OFFSET.y; };
    translate(run.player); translate(run.noise); translate(run.extraction);
    if (run.path) run.path.forEach(translate);
    run.nodes.forEach(translate);
    run.enemies.forEach(e => {
      translate(e); e.homeX += LEGACY_OFFSET.x; e.homeY += LEGACY_OFFSET.y;
      if (e.path) e.path.forEach(translate);
    });
    run.effects.forEach(e => {
      translate(e);
      if (e.toX !== undefined) e.toX += LEGACY_OFFSET.x;
      if (e.toY !== undefined) e.toY += LEGACY_OFFSET.y;
    });
    // The migrated run keeps its economy, depleted caches, enemy count and cold rate.
    run.obstacles = LEGACY_OBSTACLES.map(o => Object.assign({}, o));
    run.width = 2304; run.height = 1536; run.version = VERSION; run.mapLayout = 'legacy';
    return run;
  }

  function weather(run){const level=run.weatherLevel||[1,2,3,4,3,2][Math.floor(run.elapsed/180)%6];return{level,name:['小雪','中雪','大雪','特大雪'][level-1],visibility:[800,620,450,300][level-1],density:[28,65,125,220][level-1],coverTime:[1800,900,480,240][level-1]};}
  return { VERSION, WIDTH, HEIGHT, CAMP_RADIUS, OBSTACLES, V2_OBSTACLES, LEGACY_OBSTACLES, LEGACY_OFFSET, create, upgrade, tick, goTo, attack, gather, nearestNode, heal, drop, canExtract, inExtraction, valid, weight, regionAt:World.regionAt, mapData,weather };
});
