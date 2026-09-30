(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WhiteoutWorldV3 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1, WIDTH = 6144, HEIGHT = 4096;
  const SPAWN = { x: 900, y: 3000 }, SAFE_RADIUS = 260;
  const REGIONS = [
    { id: 'forest', name: '北坡林场', x: 0, y: 0, w: 3072, h: 2048, tint: '#839c94' },
    { id: 'mountain', name: '石脊山区', x: 3072, y: 0, w: 3072, h: 2048, tint: '#8995a0' },
    { id: 'suburb', name: '西郊住宅区', x: 0, y: 2048, w: 3072, h: 2048, tint: '#a5a599' },
    { id: 'city', name: '东城旧街', x: 3072, y: 2048, w: 3072, h: 2048, tint: '#9a9b9d' }
  ];
  const road = (id, width, points) => ({ id, width, points: points.map(p => ({ x: p[0], y: p[1] })) });
  const ROADS = [
    road('county-road', 140, [[280,2450],[3040,2450],[5860,2450]]),
    road('north-south', 120, [[3040,220],[3040,1500],[3040,2450],[3040,3880]]),
    road('camp-road', 110, [[900,3000],[900,2450]]),
    road('suburb-lane', 100, [[1800,2450],[1800,3850]]),
    road('suburb-cross', 100, [[300,3450],[1800,3450],[3040,3450]]),
    road('forest-track', 82, [[900,2450],[900,1450],[1450,650],[2800,850],[3040,1500]]),
    road('western-track', 76, [[400,700],[400,2000],[900,2450]]),
    road('ridge-pass', 86, [[3040,1500],[3800,1300],[4600,850],[5520,650]]),
    road('mountain-link', 90, [[3800,1300],[4250,2000],[4400,2450]]),
    road('city-west', 108, [[3520,2450],[3520,3880]]),
    road('city-center', 108, [[4400,2450],[4400,3880]]),
    road('city-east', 108, [[5280,2450],[5280,3880]]),
    road('city-market', 110, [[3040,3050],[5900,3050]]),
    road('city-terminal', 110, [[3040,3650],[5900,3650]])
  ];
  const FACILITIES = [
    { id: 'stove', x: 810, y: 2900, name: '铸铁炉' },
    { id: 'workbench', x: 1060, y: 2910, name: '工作台' },
    { id: 'radio', x: 1060, y: 3090, name: '求救电台' },
    { id: 'bed', x: 780, y: 3120, name: '床铺' },
    { id: 'gate', x: 900, y: 2760, name: '营地出口' }
  ];
  function segmentDistance(x, y, a, b) {
    const dx = b.x-a.x, dy = b.y-a.y, len = dx*dx+dy*dy;
    const t = len ? Math.max(0, Math.min(1, ((x-a.x)*dx+(y-a.y)*dy)/len)) : 0;
    return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
  }
  function onRoad(x, y, margin) { return ROADS.some(r => r.points.some((p,i) => i && segmentDistance(x,y,r.points[i-1],p) <= r.width/2+(margin||0))); }
  function regionAt(x, y) { return REGIONS.find(r => x>=r.x && x<r.x+r.w && y>=r.y && y<r.y+r.h) || REGIONS[0]; }
  const BUILDINGS = [];
  function building(region, kind, name, x, y, w, h) {
    const id = region + '-building-' + BUILDINGS.length;
    BUILDINGS.push({ id, region, kind, name, x, y, w, h, roofHeight: kind==='apartment'?55:kind==='warehouse'?30:22 });
  }
  building('suburb','shelter','林业站安全屋',650,2780,120,70);
  [[650,1000,180,150],[1740,1130,240,170],[2240,420,190,160],[2340,1500,260,180],[520,1600,160,140]].forEach((p,i)=>building('forest','cabin',['旧伐木棚','护林员木屋','山口工具房','林场堆料棚','西线猎棚'][i],...p));
  [[3440,450,230,170],[3840,860,280,180],[4740,1400,250,190],[5530,1200,260,180],[5100,300,190,150],[3500,1680,220,170],[5800,1750,220,180]].forEach((p,i)=>building('mountain',i===2?'station':'cabin',['石脊猎屋','巡山队值班房','山顶观测站','废弃索道站','北线工具房','山口检查站','东坡避风屋'][i],...p));
  [[250,2180,240,160],[1260,2190,250,160],[2080,2150,300,190],[2570,2160,240,170],[310,2680,230,180],[1270,2700,250,190],[2140,2720,250,180],[2590,2720,230,180],[310,3210,230,150],[1300,3160,250,180],[2120,3160,260,180],[2590,3170,220,180],[350,3680,260,180],[1230,3690,260,180],[2130,3680,250,180],[2590,3680,230,180]].forEach((p,i)=>building('suburb',i%5===0?'garage':'house',['郊区修车房','空置民房','旧粮店','路班宿舍'][i%4]+' '+(i+1),...p));
  for (const y of [2140,2670,3240,3820]) for (const x of [3180,3620,3970,4520,4850,5400,5680]) {
    const i=BUILDINGS.length; building('city',i%5===0?'warehouse':i%4===0?'clinic':'apartment',['旧公寓','五金铺','食品库','街角诊室'][i%4]+' '+(i-27),x,y,210,170);
  }
  const OBSTACLES = BUILDINGS.map(b=>({x:b.x,y:b.y,w:b.w,h:b.h}));
  function walkable(x,y,radius) {
    const r=radius||24;
    return x>=r && y>=r && x<=WIDTH-r && y<=HEIGHT-r && !OBSTACLES.some(o=>Math.hypot(x-Math.max(o.x,Math.min(x,o.x+o.w)),y-Math.max(o.y,Math.min(y,o.y+o.h)))<r);
  }
  const CACHES = [{id:'cache-0',x:1190,y:2960,region:'suburb',kind:'supply',name:'撤离路边补给',rewards:{wood:3,food:2}}];
  const supplies = {forest:{wood:3,parts:1},mountain:{parts:3,wood:1},suburb:{food:2,wood:1},city:{food:2,parts:2}};
  BUILDINGS.forEach((b,i)=>{
    if(b.kind==='shelter')return;
    const rewards=Object.assign({},supplies[b.region]);
    if(b.kind==='clinic') { rewards.food=1;rewards.parts=1;rewards.meds=1; }
    CACHES.push({id:'world-cache-'+i,x:b.x+b.w/2,y:b.y+b.h+55,region:b.region,kind:b.kind==='clinic'?'medical':b.region==='forest'?'woodpile':'supply',name:b.name+'外的补给',rewards});
  });
  const OPEN_POINTS = {
    forest:[[300,400],[800,550],[1170,900],[1400,1300],[1700,1600],[2100,850],[2650,400],[2700,1250],[550,1930],[1300,1880]],
    mountain:[[3200,200],[3680,260],[4240,430],[4580,650],[4900,1050],[5320,900],[5890,620],[5700,1600],[4700,1850],[4000,1780]],
    suburb:[[580,2400],[1460,2510],[1640,2850],[2300,2480],[2940,2760],[540,3550],[1050,3560],[1950,3870]],
    city:[[3400,2500],[4240,2600],[5100,2900],[5520,3160],[3400,3550],[4300,3730],[5940,3400],[5940,3910]]
  };
  for(const [region,points] of Object.entries(OPEN_POINTS)) points.forEach((p,i)=>CACHES.push({id:region+'-trail-cache-'+i,x:p[0],y:p[1],region,kind:region==='forest'?'woodpile':region==='mountain'?'toolbox':'supply',name:({forest:'林间木料',mountain:'巡山设备箱',suburb:'路边生活补给',city:'街道储物箱'})[region]+' '+(i+1),rewards:Object.assign({},supplies[region])}));
  const ENEMY_SPAWNS = [];
  CACHES.filter(n=>Math.hypot(n.x-SPAWN.x,n.y-SPAWN.y)>760).forEach((n,i)=>{
    if(ENEMY_SPAWNS.length>=44)return;
    const candidates=[[n.x+100,n.y+100],[n.x-110,n.y+80],[n.x+130,n.y-100],[n.x,n.y+150]];
    const p=candidates.find(p=>walkable(p[0],p[1],24)&&Math.hypot(p[0]-SPAWN.x,p[1]-SPAWN.y)>650);
    if(p)ENEMY_SPAWNS.push({x:p[0],y:p[1],type:n.region==='forest'||n.region==='mountain'&&i%3===0?'wolf':'zombie',region:n.region});
  });
  // Interleave regions so the first 24–36 enemies populate the whole district.
  const groups=['suburb','city','forest','mountain'].map(id=>ENEMY_SPAWNS.filter(e=>e.region===id)); ENEMY_SPAWNS.length=0;
  for(let i=0;groups.some(g=>i<g.length);i++)for(const group of groups)if(group[i])ENEMY_SPAWNS.push(group[i]);
  const SCENERY=[];
  let seed=928173; const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<780;i++) {
    const x=80+rand()*(WIDTH-160),y=80+rand()*(HEIGHT-160),region=regionAt(x,y).id;
    if(!walkable(x,y,60)||onRoad(x,y,55)||Math.hypot(x-SPAWN.x,y-SPAWN.y)<SAFE_RADIUS+75||CACHES.some(n=>Math.hypot(n.x-x,n.y-y)<80))continue;
    const kind=region==='forest'?(i%4?'pine':'birch'):region==='mountain'?'rock':i%3?'pine':'lamp';
    SCENERY.push({id:'scenery-'+i,kind,x,y,size:kind==='rock'?28+rand()*35:35+rand()*30,region});
  }
  let carIndex=0;
  for(const x of [3520,4400,5280])for(const y of [2930,3500,3740])for(const side of [-1,1]){
    const px=x+side*100;
    if(carIndex<15&&walkable(px,y,45)){SCENERY.push({id:'abandoned-car-'+carIndex++,kind:'car',x:px,y,size:32,region:'city'});}
  }
  [[3320,800],[3660,1550],[4400,430],[5020,1750],[5870,940]].forEach((p,i)=>{if(walkable(p[0],p[1],105)&&!onRoad(p[0],p[1],105)&&!CACHES.some(n=>Math.hypot(n.x-p[0],n.y-p[1])<150))SCENERY.push({id:'ridge-rock-'+i,kind:'rock',x:p[0],y:p[1],size:90,region:'mountain'});});
  return {VERSION,WIDTH,HEIGHT,SPAWN,SAFE_RADIUS,REGIONS,ROADS,BUILDINGS,OBSTACLES,SCENERY,CACHES,ENEMY_SPAWNS,FACILITIES,regionAt,onRoad,walkable};
});
