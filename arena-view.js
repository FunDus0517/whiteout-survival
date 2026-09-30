(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ExpeditionView = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const NAMES = { wood: '木材', food: '食物', parts: '零件', meds: '急救包' };
  const ICONS = {
    pause: '<path d="M9 5v14M15 5v14"/>',
    bag: '<path d="M5 8h14v12H5zM8 8V5a4 4 0 0 1 8 0v3M9 13h6"/>',
    exit: '<path d="M10 5H4v14h6M9 12h11M16 8l4 4-4 4"/>',
    attack: '<path d="M5 19 18 6M14 4l6 6M4 15l5 5M11 9l4 4"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    heal: '<path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5z"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    wood: '<path d="m4 15 9-9 7 7-9 9zM7 12l7 7M14 8l-4 4"/>',
    food: '<path d="M7 5h10v15H7zM7 8h10M7 16h10M9 3h6"/>',
    parts: '<path d="m14 4-4 4 2 4 4 2 4-4a7 7 0 0 1-9 8l-5 5-3-3 5-5a7 7 0 0 1 6-11Z"/>',
    fire: '<path d="M12 3c3 5 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 0 4 3 3 3-4Z"/>',
    radio: '<path d="M4 8h16v12H4zM6 8l11-5M7 12h10M7 16h3"/><circle cx="16" cy="16" r="1"/>',
    bed: '<path d="M4 8v12M20 12v8M4 16h16M7 12h13v4M5 9h4v4H5z"/>',
    rotate: '<path d="M7 3h10v18H7zM3 9l-2 3 3 2M21 15l2-3-3-2"/>'
  };
  const svg = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.bag) + '</svg>';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const imageAsset = url => new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('无法加载 ' + url)); img.src = url;
  });
  // Each contour excludes snow and ground shadows. Its wall base owns depth.
  const CURRENT_BUILDINGS = [
    { y: 332, points: [[353,159],[591,163],[600,279],[599,317],[584,321],[579,332],[541,326],[537,317],[415,323],[373,325],[352,317],[345,287]] },
    { y: 315, points: [[958,175],[1086,182],[1082,242],[1133,253],[1131,284],[1126,303],[1069,305],[1065,315],[1005,303],[953,295],[942,269],[939,252]] },
    { y: 709, points: [[555,597],[700,605],[706,626],[750,640],[745,678],[718,695],[697,704],[690,708],[645,702],[560,698],[551,671]] },
    { y: 656, points: [[977,515],[1078,521],[1132,511],[1147,606],[1131,621],[1135,656],[1069,655],[959,641],[950,611],[963,537]] },
    { y: 369, points: [[59,273],[121,273],[174,283],[172,332],[167,359],[153,365],[57,355],[49,336]] },
    { y: 591, points: [[65,502],[139,500],[180,511],[177,549],[172,588],[127,588],[58,575],[51,553]] },
    { y: 88, points: [[653,27],[793,29],[791,61],[791,86],[704,85],[650,75]] },
    { y: 463, points: [[1342,328],[1407,323],[1425,387],[1450,388],[1450,439],[1404,458],[1353,450],[1340,403]] }
  ];
  const LEGACY_BUILDINGS = [
    { y: 330, points: [[234,76],[548,81],[559,240],[553,302],[481,309],[476,331],[394,329],[390,306],[356,306],[357,319],[287,315],[282,296],[235,295],[222,281],[225,245]] },
    { y: 283, points: [[1086,95],[1253,107],[1246,169],[1289,181],[1304,204],[1303,249],[1240,258],[1236,281],[1103,270],[1053,251],[1048,216]] },
    { y: 812, points: [[488,653],[674,664],[696,696],[745,711],[753,749],[730,782],[698,790],[683,807],[626,810],[620,793],[491,791],[480,767]] },
    { y: 743, points: [[1118,551],[1240,559],[1329,548],[1335,674],[1322,692],[1320,739],[1229,738],[1106,721],[1097,687],[1105,565]] }
  ];

  function create(options) {
    const { run } = options, Model = window.Expedition, host = document.getElementById('expedition');
    if (!run || !Model || !host) throw new Error('搜刮场景尚未准备好');
    const reduceMotion = options.motion === false || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isWorld=['world','base','expedition'].includes(run.mapLayout),camp=run.camp===true,World=Model.mapData(run)||window.WhiteoutWorld;
    const campStatus=options.campStatus||{},facilities=run.facilities||(World&&World.FACILITIES)||[],guideKey=camp?'whiteout-camp-guide-v1':isWorld?'whiteout-world-guide-v1':'whiteout-arena-guide-v1';
    let active = false, paused = true, requestedPause = !!options.paused, disposed = false, ready = false, ended = false, raf = 0, lastTime = 0, saveClock = 0, hudClock = 0;
    let mapImage = null, mapBackdrop = null, sprites = null, pane = '', nearest = null, selectedId = null, pointerId = null, heldAttack = false, mapSelection = null;
    let foregrounds = [];
    let worldArt=null,overviewArt=null,nearFacility=null;
    let mapMode='base',travelArt=null,travelOverview=null;
    let viewWidth = 1, viewHeight = 1, zoom = 1, previousHealth = run.player.health, walking = false, footClock = 0;
    let lastTarget = null, notice = '', noticeUntil = 0, previousDanger = false, damageFlash = 0;
    const camera = { x: run.player.x, y: run.player.y }, movement = { x: 0, y: 0 }, keys = new Set(), footsteps = [];
    const cameraInsets = { top: 270, bottom: 200, side: 80 }, backdropPadding = 320;
    const abort = new AbortController(), signal = abort.signal, snow = Array.from({ length: reduceMotion ? 12 : 34 }, (_, i) => ({ x: (i * .6180339887) % 1, y: (i * .382 + .12) % 1, speed: 12 + i % 5 * 8, size: i % 3 === 0 ? 1.5 : .8 }));
    let resizeObserver = null, previousFocus = null;

    host.innerHTML = '<canvas class="arena-canvas" tabindex="0" aria-label="俯视搜刮场景。使用方向键或 W A S D 移动，空格攻击，E 搜索，H 治疗。也可点击地面移动。"></canvas>' +
      '<div class="arena-vignette" aria-hidden="true"></div><div class="arena-damage" aria-hidden="true"></div>' +
      '<header class="arena-hud"><div class="arena-heading"><div><span class="arena-kicker">外出搜刮</span><h1>' + escape(run.locationName || '林业站后场') + '</h1></div><button type="button" class="arena-icon arena-pause" aria-label="暂停游戏">' + svg('pause') + '</button></div>' +
      '<div class="arena-status"><div class="arena-vital"><span>生命 <strong class="arena-hp-value"></strong></span><div class="arena-meter"><i class="arena-hp-bar"></i></div></div><div class="arena-vital"><span>保暖 <strong class="arena-warmth-value"></strong></span><div class="arena-meter"><i class="arena-warmth-bar"></i></div></div>' +
      '<button type="button" class="arena-bag" aria-label="打开背包">' + svg('bag') + '<span class="arena-bag-value"></span></button></div>' +
      '<div class="arena-route"><span class="arena-objective">撤离圈内连续停留 5 秒</span></div></header><div class="arena-extraction-status" role="status" hidden></div>' +
      '<button type="button" class="arena-radar" aria-label="打开区域地图"><canvas width="192" height="192" aria-hidden="true"></canvas><span>区域地图</span></button><button type="button" class="arena-weather" aria-label="查看降雪强度">小雪</button>' +
      '<div class="arena-notice" role="status" aria-live="polite"></div><div class="arena-live arena-sr" aria-live="polite" aria-atomic="true"></div>' +
      '<div class="arena-context" aria-hidden="true"></div><div class="arena-controls"><div class="arena-stick" role="group" aria-label="移动摇杆"><div class="arena-stick-ring"><i></i></div><span>移动</span></div>' +
      '<div class="arena-keyboard-hint"><span>W A S D · 移动</span><span>空格 · 攻击　E · 搜索　H · 治疗</span></div>' +
      '<div class="arena-actions"><button type="button" class="arena-search">' + svg('search') + '<span>搜索</span></button><button type="button" class="arena-heal">' + svg('heal') + '<span>治疗</span></button>' +
      '<button type="button" class="arena-attack" aria-label="攻击，按住可连续攻击">' + svg('attack') + '<span>攻击</span><i></i></button></div></div>' +
      '<div class="arena-loading"><span class="arena-loader"></span><strong>进入雪场</strong><span>正在准备场景</span></div><div class="arena-pane" hidden></div>';
    if(isWorld)host.classList.add('arena-world');if(camp)host.classList.add('arena-camp');
    if(isWorld){
      host.insertAdjacentHTML('beforeend','<div class="arena-orientation-note">'+svg('rotate')+'<span>横屏更好操作</span></div>');
      if(camp){
        host.insertAdjacentHTML('beforeend','<div class="arena-camp-stock" aria-label="营地库存">'+Object.keys(NAMES).map(k=>'<span>'+svg(k==='meds'?'heal':k)+'<strong data-camp-stock="'+k+'">0</strong></span>').join('')+'</div><nav class="arena-camp-toolbar" aria-label="营地设施">'+facilities.filter(f=>f.id!=='gate').map(f=>'<button type="button" data-arena-facility="'+escape(f.id)+'" aria-label="'+escape(f.name)+'" title="'+escape(f.name)+'">'+svg(f.id==='stove'?'fire':f.id==='bed'?'bed':f.id==='radio'?'radio':'parts')+'<span>'+escape(f.id==='stove'?'炉子':f.id==='workbench'?'制作':f.id==='radio'?'电台':'休息')+'</span></button>').join('')+'</nav>');
      }
    }
    const $ = selector => host.querySelector(selector), canvas = $('.arena-canvas'), ctx = canvas.getContext('2d'), radar = $('.arena-radar canvas'), radarCtx = radar.getContext('2d');
    const el = { hp: $('.arena-hp-value'), warmth: $('.arena-warmth-value'), hpBar: $('.arena-hp-bar'), warmthBar: $('.arena-warmth-bar'), bag: $('.arena-bag'), bagValue: $('.arena-bag-value'), search: $('.arena-search'), heal: $('.arena-heal'), attack: $('.arena-attack'), return: $('.arena-return'), objective: $('.arena-objective'), context: $('.arena-context'), pane: $('.arena-pane'), live: $('.arena-live'), notice: $('.arena-notice'), loading: $('.arena-loading'), stick: $('.arena-stick'), knob: $('.arena-stick i'), damage: $('.arena-damage') };
    if(camp){el.heal.hidden=true;el.attack.hidden=true;$('.arena-keyboard-hint').innerHTML='<span>W A S D · 移动</span><span>E · 使用设施　M · 地图</span>';canvas.setAttribute('aria-label','可移动的安全营地。W A S D 或摇杆移动，靠近设施按 E 使用，也可点击下方设施图标。');}

    function listen(target, name, fn, extra) { target.addEventListener(name, fn, Object.assign({ signal }, extra)); }
    function save() { if (active && options.onSave) options.onSave(run); }
    function externalPanel(){
      const modal=document.getElementById('modal');if(modal&&modal.open)return true;
      const hint=document.getElementById('orientation-hint');if(!hint||hint.hidden)return false;
      const style=window.getComputedStyle(hint);return style.display!=='none'&&style.visibility!=='hidden';
    }
    function suspendPanel(){if(!active||ended)return;paused=requestedPause=true;pane='facility';releaseInputs();el.pane.hidden=true;el.pane.innerHTML='';host.classList.add('is-paused');lastTime=0;save();}
    function openFacility(id){if(!camp||!active||!ready||externalPanel())return;if(id==='gate'){mapMode='explore';setPane('map');return;}suspendPanel();if(active&&options.onFacility)options.onFacility(id);else if(active)resume();}
    function closestFacility(){return facilities.filter(f=>f.id!=='gate'&&distance(f,run.player)<=(f.radius||100)).sort((a,b)=>distance(a,run.player)-distance(b,run.player))[0]||null;}
    function updateCampStatus(values){if(values)Object.assign(campStatus,values);if(Number.isFinite(campStatus.health))run.player.health=clamp(campStatus.health,0,100);if(Number.isFinite(campStatus.warmth))run.player.warmth=clamp(campStatus.warmth,0,100);if(active)updateHud();}
    function announce(message, warning) {
      if (!active || !message) return;
      notice = message; noticeUntil = performance.now() + 2700; el.notice.textContent = message;
      el.notice.classList.toggle('is-danger', !!warning); el.notice.classList.add('is-visible');
      el.live.textContent = message;
      if (options.onMessage) options.onMessage(message);
    }
    function releaseInputs() {
      movement.x = movement.y = 0; keys.clear(); heldAttack = false; pointerId = null;
      el.knob.style.transform = ''; el.stick.classList.remove('is-moving');
    }
    function resize() {
      if (!active) return;
      const rect = host.getBoundingClientRect(); viewWidth = Math.max(1, rect.width); viewHeight = Math.max(1, rect.height);
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(viewWidth * dpr); canvas.height = Math.round(viewHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      zoom=run.mapLayout==='base'?Math.max(viewWidth/run.width,viewHeight/run.height):run.mapLayout==='expedition'?(viewHeight>viewWidth?.8:viewHeight<=520?.74:.85):(isWorld||worldArt?.95:1);
      const hudRect = $('.arena-hud').getBoundingClientRect(), controlsRect = $('.arena-controls').getBoundingClientRect();
      let hudBottom=hudRect.bottom;const stock=$('.arena-camp-stock'),toolbar=$('.arena-camp-toolbar');
      if(stock)hudBottom=Math.max(hudBottom,stock.getBoundingClientRect().bottom);
      if(toolbar&&viewHeight>viewWidth)hudBottom=Math.max(hudBottom,toolbar.getBoundingClientRect().bottom);
      if(viewHeight>viewWidth)hudBottom=Math.max(hudBottom,$('.arena-radar').getBoundingClientRect().bottom);
      cameraInsets.top = Math.max(isWorld||worldArt?72:100, hudBottom - rect.top + (isWorld||worldArt?62:92));
      cameraInsets.bottom = Math.max(90, rect.bottom - controlsRect.top + 40);
      camera.x = run.player.x; camera.y = run.player.y; updateCamera(1); draw(performance.now());
    }
    function updateCamera(dt) {
      const halfW = viewWidth / zoom / 2, halfH = viewHeight / zoom / 2;
      const side = cameraInsets.side / zoom, top = cameraInsets.top / zoom, bottom = cameraInsets.bottom / zoom;
      const bounded=run.mapLayout==='base'||run.mapLayout==='expedition';
      const minX = halfW - (bounded?0:side), maxX = run.width - halfW + (bounded?0:side);
      const minY = halfH - (bounded?0:top), maxY = run.height - halfH + (bounded?0:bottom);
      // The camera may leave the map; the model still owns all movement boundaries.
      // Bias its resting point toward the usable space between the HUD and controls.
      const targetX = minX > maxX ? run.width / 2 : clamp(run.player.x, minX, maxX);
      const desiredY = run.player.y - (top - bottom) / 2 - (camp?95:0);
      const targetY = minY > maxY ? run.height / 2 : clamp(desiredY, minY, maxY);
      const smooth = reduceMotion ? 1 : 1 - Math.exp(-Math.max(dt, .016) * 10);
      camera.x += (targetX - camera.x) * smooth; camera.y += (targetY - camera.y) * smooth;
    }
    function prepareBackdrop() {
      const pad = backdropPadding, art = document.createElement('canvas');
      art.width = run.width + pad * 2; art.height = run.height + pad * 2;
      const paint = art.getContext('2d'), width = run.width, height = run.height;
      paint.fillStyle = '#566873'; paint.fillRect(0, 0, art.width, art.height);
      // Stretch only narrow snow strips at the edges, then soften them once.
      paint.filter = 'blur(32px)';
      paint.drawImage(mapImage, 0, 0, 72, height, 0, pad, pad + 24, height);
      paint.drawImage(mapImage, width - 72, 0, 72, height, pad + width - 24, pad, pad + 24, height);
      paint.drawImage(mapImage, 0, 0, width, 72, pad, 0, width, pad + 24);
      paint.drawImage(mapImage, 0, height - 72, width, 72, pad, pad + height - 24, width, pad + 24);
      [[0,0,0,0],[width-72,0,pad+width,0],[0,height-72,0,pad+height],[width-72,height-72,pad+width,pad+height]].forEach(p => paint.drawImage(mapImage,p[0],p[1],72,72,p[2],p[3],pad,pad));
      paint.filter = 'none'; paint.fillStyle = 'rgba(116,136,145,.32)'; paint.fillRect(0,0,art.width,art.height);
      const crisp = document.createElement('canvas'); crisp.width=width; crisp.height=height;
      const layer=crisp.getContext('2d'); layer.drawImage(mapImage,0,0,width,height);
      layer.globalCompositeOperation='destination-out';
      [[0,0,32,0,0,0,32,height],[width,0,width-32,0,width-32,0,32,height],[0,0,0,32,0,0,width,32],[0,height,0,height-32,0,height-32,width,32]].forEach(p=>{
        const fade=layer.createLinearGradient(p[0],p[1],p[2],p[3]);fade.addColorStop(0,'rgba(0,0,0,1)');fade.addColorStop(1,'rgba(0,0,0,0)');layer.fillStyle=fade;layer.fillRect(p[4],p[5],p[6],p[7]);
      });
      paint.drawImage(crisp,pad,pad);
      mapBackdrop=art;
    }
    function prepareMap(image, legacyImage) {
      const art = document.createElement('canvas'); art.width=run.width; art.height=run.height;
      const paint=art.getContext('2d'); paint.drawImage(image,0,0,run.width,run.height);
      if(legacyImage) {
        // A resumed expedition keeps its original terrain and wall coordinates.
        const old=document.createElement('canvas'); old.width=1536; old.height=1024;
        const layer=old.getContext('2d'); layer.drawImage(legacyImage,0,0);
        layer.globalCompositeOperation='destination-out';
        [[0,0,32,0,0,0,32,1024],[1536,0,1504,0,1504,0,32,1024],[0,0,0,32,0,0,1536,32],[0,1024,0,992,0,992,1536,32]].forEach(p=>{
          const fade=layer.createLinearGradient(p[0],p[1],p[2],p[3]);fade.addColorStop(0,'#000');fade.addColorStop(1,'transparent');layer.fillStyle=fade;layer.fillRect(p[4],p[5],p[6],p[7]);
        });
        paint.drawImage(old,384,256);
      }
      mapImage=art;
      const outlines = legacyImage ? LEGACY_BUILDINGS.map(b=>({y:b.y+256,points:b.points.map(p=>[p[0]+384,p[1]+256])})) : CURRENT_BUILDINGS.map(b=>({y:b.y*1.5,points:b.points.map(p=>[p[0]*1.5,p[1]*1.5])}));
      foregrounds=outlines.map(b=>{
        const x=Math.floor(Math.min(...b.points.map(p=>p[0]))),y=Math.floor(Math.min(...b.points.map(p=>p[1])));
        const width=Math.ceil(Math.max(...b.points.map(p=>p[0]))-x),height=Math.ceil(Math.max(...b.points.map(p=>p[1]))-y);
        const layer=document.createElement('canvas');layer.width=width;layer.height=height;
        const c=layer.getContext('2d');c.beginPath();b.points.forEach((p,i)=>i?c.lineTo(p[0]-x,p[1]-y):c.moveTo(p[0]-x,p[1]-y));c.closePath();c.clip();
        c.drawImage(art,x,y,width,height,0,0,width,height);
        return {y:b.y,foreground:layer,x,top:y};
      });
      prepareBackdrop();
    }
    function regionName(point) {
      if(isWorld&&World&&World.regionAt){const region=World.regionAt(point.x,point.y);return region&&region.name||'北境';}
      if(point.x<384)return '西侧生活区';if(point.x>1920)return '东侧货场';
      if(point.y<256)return '北侧料场';if(point.y>1280)return '南侧林道';return '中央林业站';
    }
    function drawOverview() {
      const overview=el.pane.querySelector('.arena-overview');if(!overview||(!mapImage&&!worldArt))return;
      if(camp&&mapMode==='explore'){drawTravelMap(overview);return;}
      const c=overview.getContext('2d'),sx=overview.width/run.width,sy=overview.height/run.height;
      c.clearRect(0,0,overview.width,overview.height);c.drawImage(worldArt?overviewArt:mapImage,0,0,overview.width,overview.height);c.fillStyle='rgba(8,19,26,.13)';c.fillRect(0,0,overview.width,overview.height);
      const dot=(p,color,r)=>{c.fillStyle=color;c.beginPath();c.arc(p.x*sx,p.y*sy,r,0,Math.PI*2);c.fill();};
      (isWorld?(World.REGIONS||[]).map(r=>[r.x+r.w/2,r.y+r.h/2,r.name]):[[180,1120,'生活区'],[1140,190,'料场'],[2130,1100,'货场'],[1390,1430,'林道']]).forEach(p=>{
        const x=p[0]*sx,y=p[1]*sy;c.font='500 25px -apple-system,sans-serif';c.textAlign='center';
        const labelWidth=Math.max(98,c.measureText(p[2]).width+20);c.fillStyle='rgba(15,29,37,.8)';c.fillRect(x-labelWidth/2,y-23,labelWidth,34);c.fillStyle='#d9e3e6';c.fillText(p[2],x,y+2);
      });
      c.strokeStyle='rgba(241,198,139,.8)';c.lineWidth=3;c.setLineDash([7,6]);
      if(run.path&&run.path.length){c.beginPath();c.moveTo(run.player.x*sx,run.player.y*sy);run.path.forEach(p=>c.lineTo(p.x*sx,p.y*sy));c.stroke();}c.setLineDash([]);
      run.nodes.filter(n=>n.remaining>0).forEach(n=>dot(n,'#c9e0cf',5));
      if(camp)facilities.forEach(f=>dot(f,'#c9e0cf',7));
      run.enemies.filter(e=>e.health>0&&distance(e,run.player)<420).forEach(e=>dot(e,'#e39580',5));
      dot(run.extraction,'#f0ba76',10);dot(run.player,'#203540',11);dot(run.player,'#fff',7);
      if(mapSelection){c.strokeStyle='#ffdc9d';c.lineWidth=3;c.beginPath();c.arc(mapSelection.x*sx,mapSelection.y*sy,14,0,Math.PI*2);c.stroke();}
    }
    function drawTravelMap(overview){
      const w=window.WhiteoutWorld,c=overview.getContext('2d');
      if(!travelArt){travelArt=window.WhiteoutArt.create(Model.create({seed:1}));travelArt.ready.then(()=>{if(!active||disposed)return;travelOverview=document.createElement('canvas');travelOverview.width=960;travelOverview.height=640;travelArt.drawOverview(travelOverview.getContext('2d'),960,640);if(pane==='map'&&mapMode==='explore')drawOverview();});}
      c.fillStyle='#29424d';c.fillRect(0,0,960,640);if(travelOverview)c.drawImage(travelOverview,0,0,960,640);
      c.fillStyle='#e4bd77';c.beginPath();c.arc(w.EXIT.x/w.WIDTH*960,w.EXIT.y/w.HEIGHT*640,13,0,Math.PI*2);c.fill();
      c.font='600 18px -apple-system,sans-serif';c.fillStyle='#fff2cc';c.textAlign='center';c.fillText('撤离圈',w.EXIT.x/w.WIDTH*960,w.EXIT.y/w.HEIGHT*640+34);
    }
    function selectMapPoint(event) {
      if(pane!=='map'||!active)return;
      const overview=event.target.closest('.arena-overview');if(!overview)return;
      if(camp&&mapMode==='explore'){const rect=overview.getBoundingClientRect(),w=window.WhiteoutWorld,x=(event.clientX-rect.left)/rect.width*w.WIDTH,y=(event.clientY-rect.top)/rect.height*w.HEIGHT;const entry=w.ENTRY_POINTS.find(p=>Math.hypot((p.x-x)*rect.width/w.WIDTH,(p.y-y)*rect.height/w.HEIGHT)<28);if(entry&&options.onDepart)options.onDepart(entry.id);return;}
      const rect=overview.getBoundingClientRect(),point={x:clamp((event.clientX-rect.left)/rect.width*run.width,24,run.width-24),y:clamp((event.clientY-rect.top)/rect.height*run.height,24,run.height-24)};
      const choices=camp?facilities.filter(f=>f.id!=='gate'):run.nodes.filter(n=>n.remaining>0).concat([{...run.extraction,id:'extract-zone',name:'撤离圈'}]);
      const node=choices.filter(n=>distance(n,point)<run.width/rect.width*15).sort((a,b)=>distance(a,point)-distance(b,point))[0];
      mapSelection=node?{x:node.x,y:node.y,id:node.id,name:node.name}:{x:point.x,y:point.y,name:regionName(point)};
      el.pane.querySelector('.arena-map-caption').textContent='已标记'+mapSelection.name+'，选择前往后开始移动。';
      el.pane.querySelector('[data-arena-map-go]').disabled=false;drawOverview();
    }
    function screenPoint(world) { return { x: (world.x - camera.x) * zoom + viewWidth / 2, y: (world.y - camera.y) * zoom + viewHeight / 2 }; }
    function worldPoint(event) {
      const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left - viewWidth / 2) / zoom + camera.x, y: (event.clientY - rect.top - viewHeight / 2) / zoom + camera.y };
    }
    function tryMove(x, y) {
      if (!active || paused || !ready || externalPanel()) return;
      const result = Model.goTo(run, x, y); if (result && result.error) announce(result.error);
      else lastTarget = { x, y, time: performance.now() };
      save();
    }
    function action(name) {
      if (!active || paused || !ready || run.status !== 'active') return;
      if(externalPanel())return;
      if(camp){if(name==='gather'){nearFacility=closestFacility();if(nearFacility)openFacility(nearFacility.id);else announce('靠近设施后使用');}return;}
      const audioNode=name==='gather'?Model.nearestNode(run):null;
      const result = Model[name](run);
      if (result && result.error) { if (!(name === 'attack' && run.player.attackCooldown > 0)) announce(result.error); return; }
      if (name === 'gather' && result && result.gain) {
        if(options.onAudio)options.onAudio('open',audioNode&&String(audioNode.id).startsWith('drop-')?'drop':audioNode&&audioNode.kind);
        const found = Object.keys(NAMES).filter(k => result.gain[k]).map(k => NAMES[k] + ' +' + result.gain[k]).join(' · ');
        announce(found || '这里已经搜完了');
      } else if (name === 'heal') announce('已包扎伤口');
      else if (name === 'attack' && result && result.killed) announce('威胁已清除');
      if(options.onAudio&&name!=='gather'&&result&&result.ok)options.onAudio(name);
      save(); if (active) updateHud();
    }
    function returnToExit() {
      if (paused || !ready || !active) return;
      if(camp){openFacility('gate');return;}
      if (Model.canExtract(run)) { ended = true; releaseInputs(); save(); if (active && options.onExit) options.onExit(true); }
      else { selectedId = null; tryMove(run.extraction.x, run.extraction.y); announce('沿原路返回出口'); }
    }

    function setPane(kind, persist = true) {
      pane = kind; paused = true; requestedPause = true; releaseInputs(); previousFocus = document.activeElement;
      el.pane.hidden = false; host.classList.add('is-paused');
      let body = '';
      if(kind==='weather'){
        body='<span class="arena-kicker">降雪强度</span><h2 id="arena-pane-title">雪越大，视野越短</h2><div class="arena-weather-options">'+['小雪','中雪','大雪','特大雪'].map((name,i)=>'<button type="button" data-snow-level="'+(i+1)+'" class="arena-neutral-button">'+name+'<small>'+['道路清晰','风雪渐密','远处难辨','近处也需留意'][i]+'</small></button>').join('')+'</div><button type="button" class="arena-primary" data-arena-pane="resume">返回游戏</button>';
      } else if (kind === 'guide') {
        body = '<span class="arena-kicker">'+(camp?'安全营地':'外出搜刮')+'</span><h2 id="arena-pane-title">'+(camp?'先在营地走走':'带着物资回来')+'</h2><div class="arena-quick-guide"><div>'+svg('arrow')+'<strong>移动</strong><small>摇杆 / WASD</small></div><div>'+svg('search')+'<strong>'+(camp?'使用设施':'搜索物资')+'</strong><small>靠近后按 E</small></div><div>'+svg(camp?'parts':'attack')+'<strong>'+(camp?'制作装备':'应对危险')+'</strong><small>'+(camp?'工作台':'按住攻击')+'</small></div></div><button type="button" class="arena-primary" data-arena-pane="enter">开始</button>';
      } else if (kind === 'bag') {
        if(camp){body='<span class="arena-kicker">营地库存</span><h2 id="arena-pane-title">补给</h2><div class="arena-camp-inventory">'+Object.keys(NAMES).map(k=>'<div>'+svg(k==='meds'?'heal':k)+'<span>'+NAMES[k]+'</span><strong>'+Math.max(0,Math.floor(campStatus[k]||0))+'</strong></div>').join('')+'</div><button type="button" class="arena-primary" data-arena-pane="resume">返回营地</button>';}
        else {
        body = '<span class="arena-kicker">随身物资</span><h2 id="arena-pane-title">背包 <span class="arena-bag-total">' + Model.weight(run) + ' / ' + run.capacity + '</span></h2><p>空间有限。丢弃的物资无法找回。</p><div class="arena-inventory">' +
          Object.keys(NAMES).map(k => '<div class="arena-inventory-row"><span class="arena-inventory-icon">' + svg(k === 'meds' ? 'heal' : k) + '</span><div><strong>' + NAMES[k] + '</strong><span class="arena-item-' + k + '">' + run.loot[k] + '</span></div><button type="button" data-arena-drop="' + k + '" ' + (!run.loot[k] ? 'disabled' : '') + '>丢弃 1</button></div>').join('') + '</div><div class="arena-bag-foot"><span>备用急救包 <strong>' + run.player.meds + '</strong></span><span>已清除威胁 <strong>' + run.kills + '</strong></span></div><button type="button" class="arena-primary" data-arena-pane="resume">收好背包</button>';}
      } else if (kind === 'map') {
        mapSelection=null;
        body='<div class="arena-map-heading"><div><span class="arena-kicker">路线规划 · 已暂停</span><h2 id="arena-pane-title">区域地图</h2></div><button type="button" class="arena-icon" data-arena-pane="resume" aria-label="关闭区域地图">'+svg('close')+'</button></div><div class="arena-map-layout"><canvas class="arena-overview" width="960" height="640" role="img" aria-label="完整雪场地图，可点击补给点或地面规划路线"></canvas><div class="arena-map-details"><p class="arena-map-caption">点选补给或地面，再选择前往。随时可返回出口撤离。</p><div class="arena-map-legend"><span class="is-player">你的位置</span><span class="is-supply">剩余补给</span><span class="is-exit">撤离出口</span><span class="is-threat">附近危险</span></div><p>剩余补给 '+run.nodes.filter(n=>n.remaining>0).length+' 处 · 背包 '+Model.weight(run)+' / '+run.capacity+'</p><div class="arena-map-actions"><button type="button" class="arena-primary" data-arena-map-go disabled>前往标记</button><button type="button" class="arena-neutral-button" data-arena-pane="resume">返回搜刮</button></div></div></div>';
      } else if (kind === 'retreat') {
        body = '<span class="arena-kicker">提前撤回</span><h2 id="arena-pane-title">放弃这趟搜到的物资？</h2><p>角色可以返回营地。背包中的 ' + Model.weight(run) + ' 份物资会留在雪场，生命与保暖按当前状态结算。</p><button type="button" class="arena-primary" data-arena-pane="pause">继续这趟搜刮</button><button type="button" class="arena-danger-button" data-arena-pane="abandon">放弃背包，撤回营地</button>';
      } else {
        body = camp?'<span class="arena-kicker">已暂停</span><h2 id="arena-pane-title">营地</h2><button type="button" class="arena-primary" data-arena-pane="resume">继续</button><button type="button" class="arena-neutral-button" data-arena-pane="map">区域地图</button>':'<span class="arena-kicker">已暂停</span><h2 id="arena-pane-title">' + escape(regionName(run.player)) + '</h2><p>背包 ' + Model.weight(run) + ' / ' + run.capacity + ' · 清除 ' + run.kills + '</p><button type="button" class="arena-primary" data-arena-pane="resume">继续搜刮</button><button type="button" class="arena-neutral-button" data-arena-pane="bag">整理背包</button><button type="button" class="arena-danger-button" data-arena-pane="retreat">撤回营地</button>';
      }
      el.pane.innerHTML = '<div class="arena-dialog'+(kind==='map'?' is-map':'')+'" role="dialog" aria-modal="true" aria-labelledby="arena-pane-title">' + body + '</div>';
      if(kind==='map'&&camp){
        el.pane.querySelector('.arena-map-heading').insertAdjacentHTML('afterend','<div class="arena-map-tabs"><button data-arena-map-mode="base" aria-pressed="'+(mapMode==='base')+'">基地地图</button><button data-arena-map-mode="explore" aria-pressed="'+(mapMode==='explore')+'">探索地图</button></div>');
        const map=el.pane.querySelector('.arena-overview');
        if(mapMode==='explore'){const wrap=document.createElement('div');wrap.className='arena-departure-map';map.replaceWith(wrap);wrap.appendChild(map);wrap.insertAdjacentHTML('beforeend',window.WhiteoutWorld.ENTRY_POINTS.map(p=>'<button class="arena-entry-point" data-entry-point="'+p.id+'" style="left:'+p.x/window.WhiteoutWorld.WIDTH*100+'%;top:'+p.y/window.WhiteoutWorld.HEIGHT*100+'%" '+((campStatus.ap||0)<1?'disabled':'')+' aria-label="'+p.name+'，进入探索"><i>↗</i><span>'+p.name+'</span></button>').join(''));el.pane.querySelector('[data-arena-map-go]').hidden=true;}
        el.pane.querySelector('.is-supply').textContent=mapMode==='explore'?'出发点':'营地设施';
        el.pane.querySelector('.arena-map-caption').textContent=mapMode==='explore'?'直接点地图上的出发点进入探索。物资需在黄色撤离圈内停留 5 秒后入库。':'点选设施可规划路线。切到探索地图后点出发点外出。';
        el.pane.querySelector('.arena-map-details>p:not(.arena-map-caption)').textContent=mapMode==='explore'?'消耗 1 次行动 · 剩余 '+(campStatus.ap||0)+' 次':'营地设施 4 处';
        el.pane.querySelector('[data-arena-pane="resume"].arena-neutral-button').textContent='返回营地';
      }
      if(kind==='map'&&!camp)el.pane.querySelector('.arena-map-caption').textContent='点选地点后前往。黄色撤离圈需连续停留 5 秒，离圈重新计时。';
      if(kind==='map')drawOverview();
      const focus = el.pane.querySelector('button:not(:disabled)'); if (focus) focus.focus({ preventScroll: true });
      if (persist) save();
    }
    function resume() {
      if (!active || document.hidden || ended || disposed || externalPanel()) return;
      requestedPause = false;
      if (!ready) return;
      pane = ''; paused = false; requestedPause = false; el.pane.hidden = true; el.pane.innerHTML = ''; host.classList.remove('is-paused'); lastTime = 0;
      const focus = previousFocus && previousFocus.isConnected ? previousFocus : canvas; focus.focus({ preventScroll: true });
    }
    function pause(settings) { requestedPause = true; if (active && ready && !ended){if(externalPanel()||(settings&&settings.panel))suspendPanel();else setPane('pause');} }

    function updateHud() {
      if(camp){
        const health=Math.ceil(Number.isFinite(campStatus.health)?campStatus.health:run.player.health),warmth=Math.ceil(Number.isFinite(campStatus.warmth)?campStatus.warmth:run.player.warmth);
        el.hp.textContent=health+'%';el.warmth.textContent=warmth+'%';el.hpBar.style.width=health+'%';el.warmthBar.style.width=warmth+'%';
        $('.arena-heading h1').textContent='山腰避难所';$('.arena-heading .arena-kicker').textContent='第 '+(campStatus.day||run.day||1)+' 日 · 行动 '+(campStatus.ap===undefined?'—':campStatus.ap);
        Object.keys(NAMES).forEach(k=>{const count=$('[data-camp-stock="'+k+'"]');if(count)count.textContent=Math.max(0,Math.floor(campStatus[k]||0));});
        el.bagValue.textContent='库存';el.bag.setAttribute('aria-label','查看营地库存');el.objective.textContent='地图 → 探索地图 → 点出发点';
        nearFacility=closestFacility();el.search.disabled=!nearFacility||!ready;el.search.querySelector('span').textContent='使用';
        el.search.dataset.target=nearFacility?nearFacility.name:'';el.search.setAttribute('aria-label',nearFacility?'使用'+nearFacility.name:'靠近营地设施后使用');
        el.context.classList.remove('is-visible');$('.arena-radar span').textContent='营地 · 地图';
        if(performance.now()>noticeUntil)el.notice.classList.remove('is-visible');return;
      }
      const health = Math.ceil(run.player.health), warmth = Math.ceil(run.player.warmth), weight = Model.weight(run), full = weight >= run.capacity;
      el.hp.textContent = health + '%'; el.warmth.textContent = warmth + '%';
      el.hpBar.style.width = health + '%'; el.warmthBar.style.width = warmth + '%';
      el.hpBar.classList.toggle('is-low', health < 35); el.warmthBar.classList.toggle('is-low', warmth < 20);
      el.bagValue.textContent = weight + ' / ' + run.capacity; el.bag.classList.toggle('is-full', full);
      el.bag.setAttribute('aria-label', '打开背包，已装 ' + weight + ' 份，可装 ' + run.capacity + ' 份');
      nearest = Model.nearestNode(run);
      el.search.disabled = !nearest || full || !ready; el.search.querySelector('span').textContent = full ? '包已满' : '搜索';
      el.search.setAttribute('aria-label', full ? '背包已满，请整理背包或撤离' : nearest ? '搜索' + nearest.name : '靠近物资后搜索');
      el.heal.disabled = run.player.health >= 100 || run.player.meds + run.loot.meds <= 0 || !ready;
      el.heal.setAttribute('aria-label', '治疗，剩余急救包 ' + (run.player.meds + run.loot.meds));
      const ranged = run.gear.crossbow && run.ammo > 0;
      el.attack.querySelector('span').textContent = ranged ? '弩击' : '攻击';
      el.attack.style.setProperty('--cooldown', Math.max(0, run.player.attackCooldown) / (ranged ? .8 : .5));
      const extraction=$('.arena-extraction-status');extraction.hidden=!Model.inExtraction(run);extraction.textContent='正在撤离 · '+Math.max(0,5-(run.extractionProgress||0)).toFixed(1)+' 秒';
      $('.arena-radar span').textContent=regionName(run.player)+' · 地图';
      if(isWorld){$('.arena-heading h1').textContent=regionName(run.player);$('.arena-heading .arena-kicker').textContent='第 '+run.day+' 日 · 外出';}
      el.objective.textContent = full ? '背包已满，可以撤离了' : run.player.warmth < 20 ? '体温过低，尽快返回出口' : '搜集物资，带回营地';
      const threat = run.enemies.some(e => e.health > 0 && (e.state === 'chase' || e.state === 'attack') && distance(e, run.player) < 340);
      if (threat && !previousDanger) announce('有东西发现了你，准备应战', true);
      previousDanger = threat;
      host.classList.toggle('has-danger', threat);
      if (run.player.health < previousHealth - .5) { damageFlash = reduceMotion ? .35 : .7; el.live.textContent = '受到攻击，生命剩余 ' + health + '%'; }
      previousHealth = run.player.health;
      const chosen = nearest || run.nodes.find(n => n.id === selectedId && n.remaining > 0);
      if (chosen) { el.context.textContent = chosen.name + (nearest ? ' · 点击搜索' : ' · 靠近搜索'); const p = screenPoint(chosen); el.context.style.transform = 'translate(' + p.x + 'px,' + (p.y - 47 * zoom) + 'px) translate(-50%,-100%)'; el.context.classList.add('is-visible'); }
      else el.context.classList.remove('is-visible');
      if (performance.now() > noticeUntil) el.notice.classList.remove('is-visible');
    }

    function shadow(x, y, width, opacity) {
      ctx.save(); ctx.translate(x,y); ctx.scale(1,.33);
      const shade=ctx.createRadialGradient(0,0,0,0,0,width);
      shade.addColorStop(0,'rgba(7,15,20,'+opacity+')');
      shade.addColorStop(.48,'rgba(7,15,20,'+(opacity*.58)+')');
      shade.addColorStop(1,'rgba(7,15,20,0)');
      ctx.fillStyle=shade;ctx.beginPath();ctx.arc(0,0,width,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    function drawNode(node, now) {
      if (node.remaining <= 0) return;
      const near = nearest && nearest.id === node.id, selected = selectedId === node.id;
      shadow(node.x, node.y + 5, 19, .4);
      ctx.save(); ctx.translate(node.x, node.y);
      if (near || selected) { ctx.strokeStyle = near ? '#efc18e' : 'rgba(221,232,233,.7)'; ctx.lineWidth = 1.7; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.ellipse(0, 3, 31, 13, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      if (node.kind === 'woodpile') {
        ctx.strokeStyle = '#211e1b'; ctx.lineWidth = 10; [[-14,-10,12,-14],[-11,-3,15,-6],[-13,3,11,0]].forEach(p => { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.stroke(); });
        ctx.strokeStyle = '#b79a72'; ctx.lineWidth = 3; [[-14,-12,12,-16],[-11,-5,15,-8],[-13,1,11,-2]].forEach(p => { ctx.beginPath(); ctx.moveTo(p[0],p[1]); ctx.lineTo(p[2],p[3]); ctx.stroke(); });
      } else {
        ctx.fillStyle = node.kind === 'medical' ? '#73847f' : node.kind === 'toolbox' ? '#717982' : '#a38c6d';
        ctx.fillRect(-14,-23,28,25); ctx.fillStyle = '#c3ccc7'; ctx.fillRect(-15,-25,30,5);
        ctx.strokeStyle = '#252a2b'; ctx.lineWidth = 2; ctx.strokeRect(-14,-23,28,25); ctx.beginPath(); ctx.moveTo(-14,-9); ctx.lineTo(14,-9); ctx.stroke();
        if (node.kind === 'medical') { ctx.fillStyle = '#e2ece6'; ctx.fillRect(-2,-20,4,13); ctx.fillRect(-6,-16,12,4); }
        else { ctx.fillStyle = '#322f2a'; ctx.fillRect(-3,-12,6,6); }
      }
      const alpha = reduceMotion ? .9 : .7 + Math.sin(now / 720 + node.x) * .15;
      ctx.fillStyle = 'rgba(248,210,154,' + alpha + ')'; ctx.beginPath(); ctx.arc(0,-35,3,0,Math.PI*2); ctx.fill(); ctx.restore();
    }
    function drawWolf(enemy, now) {
      ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.scale(Math.cos(enemy.angle) < 0 ? -1 : 1, 1);
      const moving = enemy.state === 'wander' || enemy.state === 'chase';
      const stride = reduceMotion || !moving ? 0 : Math.sin(now / 145 + enemy.x) * 3.4;
      const hit = enemy.hitTime > 0;
      shadow(-2,2,25,.24); shadow(0,1,18,.27);
      // Rear limbs remain darker; the bent hocks and separate paws read at phone scale.
      function leg(x, hip, swing, front, far) {
        const knee = x + (front ? 1 : -3), paw = x + swing + (front ? 3 : -5);
        ctx.fillStyle = hit ? (far ? '#969997' : '#c1c5c2') : (far ? '#39434a' : '#748087');
        ctx.beginPath(); ctx.moveTo(x-3,hip); ctx.quadraticCurveTo(knee-4,-8,knee-1,-5);
        ctx.lineTo(paw-2,0); ctx.lineTo(paw+5,0); ctx.lineTo(paw+6,-2); ctx.lineTo(paw+1,-3);
        ctx.lineTo(knee+3,-7); ctx.lineTo(x+4,hip); ctx.closePath(); ctx.fill();
        if (!far) { ctx.strokeStyle='rgba(179,189,190,.34)'; ctx.lineWidth=.9; ctx.beginPath(); ctx.moveTo(x-1,hip+2); ctx.lineTo(knee,-7); ctx.lineTo(paw,-2); ctx.stroke(); }
      }
      leg(-10,-16,-stride,false,true); leg(7,-18,stride,true,true);
      ctx.fillStyle=hit?'#b4bab6':'#616d74';
      ctx.beginPath(); ctx.moveTo(-20,-23); ctx.quadraticCurveTo(-28,-20,-36,-14);
      ctx.lineTo(-35,-10); ctx.lineTo(-30,-12); ctx.quadraticCurveTo(-22,-13,-16,-20); ctx.closePath(); ctx.fill();
      const fur=ctx.createLinearGradient(-6,-30,0,-8);
      fur.addColorStop(0,hit?'#cdd2cd':'#a8b1b1'); fur.addColorStop(.38,hit?'#bcc3bc':'#78858b'); fur.addColorStop(1,hit?'#8c9590':'#414e56');
      ctx.fillStyle=fur; ctx.beginPath(); ctx.moveTo(-22,-20); ctx.quadraticCurveTo(-20,-29,-10,-28);
      ctx.lineTo(-5,-30); ctx.lineTo(-3,-28); ctx.lineTo(1,-30); ctx.lineTo(3,-28);
      ctx.quadraticCurveTo(11,-31,18,-24); ctx.quadraticCurveTo(20,-14,12,-10);
      ctx.quadraticCurveTo(4,-12,-4,-12); ctx.quadraticCurveTo(-13,-9,-20,-14); ctx.closePath(); ctx.fill();
      ctx.fillStyle=hit?'#d0d4cc':'#9aa6a7'; ctx.beginPath(); ctx.moveTo(10,-25);
      ctx.quadraticCurveTo(19,-28,20,-19); ctx.lineTo(15,-9); ctx.lineTo(12,-13); ctx.lineTo(9,-12); ctx.lineTo(11,-18); ctx.closePath(); ctx.fill();
      leg(-17,-17,stride,false,false); leg(14,-19,-stride,true,false);
      const head=ctx.createLinearGradient(18,-36,23,-17);
      head.addColorStop(0,hit?'#d1d4ce':'#abb4b1'); head.addColorStop(1,hit?'#99a29b':'#616e74');
      ctx.fillStyle=head; ctx.beginPath(); ctx.moveTo(12,-24); ctx.lineTo(13,-37); ctx.lineTo(19,-30);
      ctx.lineTo(23,-35); ctx.lineTo(26,-27); ctx.quadraticCurveTo(29,-23,34,-23);
      ctx.lineTo(38,-20); ctx.lineTo(34,-17); ctx.lineTo(27,-17); ctx.lineTo(25,-13);
      ctx.lineTo(18,-16); ctx.lineTo(13,-16); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#4b565c'; ctx.beginPath(); ctx.moveTo(14,-33); ctx.lineTo(15,-27); ctx.lineTo(18,-29); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(23,-32); ctx.lineTo(23,-27); ctx.lineTo(25,-27); ctx.closePath(); ctx.fill();
      ctx.fillStyle=hit?'#dde0d6':'#bac1b9'; ctx.beginPath(); ctx.moveTo(28,-22); ctx.lineTo(36,-20); ctx.lineTo(33,-18); ctx.lineTo(26,-18); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#252e33'; ctx.beginPath(); ctx.moveTo(36,-22); ctx.lineTo(39,-20); ctx.lineTo(37,-18); ctx.lineTo(35,-19); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(33,44,49,.72)'; ctx.lineWidth=.7; ctx.beginPath(); ctx.moveTo(29,-17); ctx.lineTo(35,-18); ctx.stroke();
      ctx.fillStyle='#343c40'; ctx.fillRect(26,-25,2.5,1.5); ctx.fillStyle='#b4a888'; ctx.fillRect(27,-25,.8,.8);
      // Fine guard hairs and a soft snow light break up the flat silhouette.
      ctx.lineWidth=.8; ctx.strokeStyle='rgba(211,220,214,.32)';
      [[-19,-24,-14,-26],[-15,-26,-10,-27],[-9,-27,-4,-26],[-3,-28,2,-26],[4,-27,9,-25],[10,-27,14,-24],[-16,-21,-10,-23],[-8,-21,-2,-23],[1,-22,6,-20],[15,-22,18,-18],[18,-29,23,-27]].forEach(p=>{ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[2],p[3]);ctx.stroke();});
      ctx.strokeStyle='rgba(205,215,214,.47)'; ctx.lineWidth=.85; ctx.beginPath(); ctx.moveTo(-21,-21);
      ctx.quadraticCurveTo(-19,-28,-9,-28); ctx.lineTo(1,-29); ctx.quadraticCurveTo(9,-30,14,-27); ctx.stroke();
      ctx.restore();
    }
    const actorFeet = [
      { y:[465,463,462], x:[259,356.5,338.5] },
      { y:[457,450,444], x:[242,357,326] }
    ];
    let actorAtlas = null, actorAtlasSource = null;
    function tonedActorAtlas() {
      if (!sprites || actorAtlasSource === sprites) return actorAtlas || sprites;
      const art=document.createElement('canvas');art.width=sprites.naturalWidth||1536;art.height=sprites.naturalHeight||1024;
      const paint=art.getContext('2d');paint.filter='saturate(.88) contrast(.93)';paint.drawImage(sprites,0,0);
      paint.filter='none';paint.globalCompositeOperation='source-atop';paint.fillStyle='rgba(150,180,195,.045)';paint.fillRect(0,0,art.width,art.height);
      actorAtlas=art;actorAtlasSource=sprites;return actorAtlas;
    }
    function drawActor(body, player, now) {
      if (!player && body.health <= 0) return;
      if (!player && body.type === 'wolf') drawWolf(body, now);
      else {
        const moving = player ? walking : body.state === 'chase' || body.state === 'wander';
        const frame = reduceMotion || !moving ? 0 : Math.floor(now / 170) % 2 + 1;
        const row=player?0:1,scale=player?.16:.15,size=512*scale,feet=actorFeet[row],facing=Math.cos(body.angle)<0?-1:1;
        const footX=sprites?(feet.x[frame]-256)*scale*facing:0;
        shadow(body.x,body.y+1,player?23:21,.32);
        shadow(body.x+footX,body.y+.3,player?5.2:4.8,.63);
        ctx.save(); ctx.translate(body.x,body.y);ctx.scale(facing,1);
        if (player && body.invulnerable > 0 && !reduceMotion) ctx.globalAlpha = .63 + .27 * Math.sin(now / 42);
        // Every frame shares the same body axis; only its transparent foot margin differs.
        if(sprites)ctx.drawImage(tonedActorAtlas(),frame*512,row*512,512,512,-256*scale,-feet.y[frame]*scale,size,size);
        else { ctx.fillStyle = player ? '#bc6d3c' : '#7f827a'; ctx.beginPath(); ctx.ellipse(0,-29,13,25,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#373d42'; ctx.beginPath(); ctx.arc(0,-59,8,0,Math.PI*2); ctx.fill(); }
        ctx.restore();
      }
      if (!player && (body.state === 'chase' || body.state === 'attack' || body.health < body.maxHealth)) {
        const barY = body.y - (body.type === 'wolf' ? 48 : 70);
        ctx.fillStyle = 'rgba(12,20,26,.8)'; ctx.fillRect(body.x-19,barY,38,4);
        ctx.fillStyle = '#d89a88'; ctx.fillRect(body.x-19,barY,38*body.health/body.maxHealth,4);
        if (body.windup > 0) { ctx.strokeStyle = '#ed9886'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(235,112,88,.13)'; ctx.beginPath(); ctx.arc(body.x,body.y,34,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.fillStyle='#f3b0a0'; ctx.font='bold 17px sans-serif'; ctx.textAlign='center'; ctx.fillText('!',body.x,barY-7); }
      }
    }
    function drawEffects() {
      for (const effect of run.effects) {
        const progress = 1 - effect.time / effect.duration, alpha = clamp(effect.time / effect.duration,0,1);
        ctx.save(); ctx.globalAlpha = alpha;
        if (effect.type === 'slash') {
          ctx.strokeStyle = '#f9e0b6'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); const angle=effect.angle||0, range=Math.min(effect.range||72,104);
          ctx.arc(effect.x,effect.y-20,range*.64,angle-.75+progress*.6,angle+.7+progress*.4); ctx.stroke();
        } else if (effect.type === 'shot') {
          ctx.strokeStyle='#e9dfc3'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(effect.x,effect.y-29); ctx.lineTo(effect.toX||effect.x,effect.toY===undefined?effect.y:effect.toY-20); ctx.stroke();
        } else if (effect.type === 'hit' || effect.type === 'loot' || effect.type === 'heal') {
          ctx.font='600 15px -apple-system, sans-serif'; ctx.textAlign='center'; ctx.fillStyle=effect.type==='hit'?'#efb29e':effect.type==='heal'?'#c0dfcb':'#f7d3a0';
          const label = effect.type==='hit' ? '−'+effect.damage : effect.type==='heal' ? '+'+Math.round(effect.amount||0) : '+'+(effect.amount||1);
          ctx.fillText(label,effect.x,effect.y-66-(reduceMotion?0:progress*24));
        } else if (effect.type === 'death'&&!worldArt) { shadow(effect.x,effect.y,23,.25); }
        ctx.restore();
      }
    }
    function drawRadar() {
      const size=192,center=96,extent=camp?430:560,scale=88/extent,p=run.player;
      radarCtx.clearRect(0,0,size,size);radarCtx.save();radarCtx.beginPath();radarCtx.arc(center,center,91,0,Math.PI*2);radarCtx.clip();
      radarCtx.fillStyle='#233c4c';radarCtx.fillRect(0,0,size,size);
      if(overviewArt)radarCtx.drawImage(overviewArt,center-p.x*scale,center-p.y*scale,run.width*scale,run.height*scale);
      radarCtx.fillStyle='#1423322b';radarCtx.fillRect(0,0,size,size);
      const point=n=>({x:center+(n.x-p.x)*scale,y:center+(n.y-p.y)*scale});
      const dot=(n,color,r)=>{const q=point(n);radarCtx.beginPath();radarCtx.arc(q.x,q.y,r,0,Math.PI*2);radarCtx.fillStyle=color;radarCtx.fill();};
      if(!camp)dot(run.extraction,'#e2be7f',5);
      run.nodes.filter(n=>n.remaining>0&&distance(n,p)<extent).forEach(n=>dot(n,'#e2e8d4',2.3));
      if(camp)facilities.forEach(f=>dot(f,'#f4d5a0',3.3));
      run.enemies.filter(e=>e.health>0&&distance(e,p)<Math.min(420,Model.weather(run).visibility)).forEach(e=>dot(e,'#e99b87',3));
      radarCtx.save();radarCtx.translate(center,center);radarCtx.rotate(p.angle+Math.PI/2);
      radarCtx.shadowColor='#90d6fb';radarCtx.shadowBlur=8;radarCtx.fillStyle='#eef9ff';radarCtx.strokeStyle='#163f55';radarCtx.lineWidth=2;
      radarCtx.beginPath();radarCtx.moveTo(0,-12);radarCtx.lineTo(8,9);radarCtx.lineTo(0,5);radarCtx.lineTo(-8,9);radarCtx.closePath();radarCtx.fill();radarCtx.stroke();radarCtx.restore();radarCtx.restore();
      radarCtx.strokeStyle='#dceafa9c';radarCtx.lineWidth=2;radarCtx.beginPath();radarCtx.arc(center,center,91,0,Math.PI*2);radarCtx.stroke();
      radarCtx.fillStyle='#f2f7f6';radarCtx.font='600 13px -apple-system,sans-serif';radarCtx.textAlign='center';radarCtx.fillText('N',96,19);
      radar.dataset.playerX=p.x.toFixed(2);radar.dataset.playerY=p.y.toFixed(2);radar.dataset.angle=p.angle.toFixed(3);
    }
    function draw(now) {
      ctx.clearRect(0,0,viewWidth,viewHeight); ctx.fillStyle='#566873';ctx.fillRect(0,0,viewWidth,viewHeight);
      ctx.save(); ctx.translate(viewWidth/2,viewHeight/2);ctx.scale(zoom,zoom);ctx.translate(-camera.x,-camera.y);
      const bounds={x:camera.x-viewWidth/zoom/2,y:camera.y-viewHeight/zoom/2,w:viewWidth/zoom,h:viewHeight/zoom};
      if(worldArt)worldArt.drawGround(ctx,bounds);else if(mapBackdrop)ctx.drawImage(mapBackdrop,-backdropPadding,-backdropPadding);else if(mapImage)ctx.drawImage(mapImage,0,0,run.width,run.height);
      if(!camp){const exit=run.extraction,progress=(run.extractionProgress||0)/5;ctx.fillStyle='rgba(218,170,107,.12)';ctx.strokeStyle='rgba(232,189,129,.65)';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(exit.x,exit.y,exit.radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#fff0c4';ctx.lineWidth=4;ctx.beginPath();ctx.arc(exit.x,exit.y,exit.radius,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);ctx.stroke();
      ctx.fillStyle='#f3e5b8';ctx.font='600 14px -apple-system,sans-serif';ctx.textAlign='center';ctx.fillText('撤离 · 停留 5 秒',exit.x,exit.y+exit.radius+21);}
      const weather=Model.weather(run);
      (run.snowTracks||[]).forEach(f=>{const alpha=clamp(1-(run.elapsed-f.time)/weather.coverTime,0,1);
        if(alpha<=0||f.x<bounds.x-10||f.x>bounds.x+bounds.w+10||f.y<bounds.y-10||f.y>bounds.y+bounds.h+10)return;
        ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle+Math.PI/2);ctx.globalAlpha=alpha;
        ctx.fillStyle='#58758d88';ctx.beginPath();ctx.ellipse(0,0,3.7,6.5,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#e5eef1a3';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(-.3,-.5,4,6.5,0,.1,Math.PI*.95);ctx.stroke();
        ctx.strokeStyle='#2946595c';ctx.lineWidth=.7;for(let y=-4;y<5;y+=3){ctx.beginPath();ctx.moveTo(-2,y);ctx.lineTo(2,y);ctx.stroke();}ctx.restore();
      });
      if(lastTarget&&now-lastTarget.time<950&&!reduceMotion){ctx.strokeStyle='rgba(236,212,173,'+(1-(now-lastTarget.time)/950)+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(lastTarget.x,lastTarget.y,9+(now-lastTarget.time)/70,4+(now-lastTarget.time)/180,0,0,Math.PI*2);ctx.stroke();}
      const visible=(e)=>{const margin=e.type==='building'?160:128,x=e.x-(e.w?0:margin),y=e.y-margin,w=(e.w||0)+margin*2,h=(e.h||0)+margin*2;return x+w>bounds.x&&x<bounds.x+bounds.w&&y+h>bounds.y&&y<bounds.y+bounds.h;};
      const scenery=worldArt?worldArt.structures.filter(visible).map(s=>({y:Number.isFinite(s.sortY)?s.sortY:s.y+(s.h||0),structure:s})):foregrounds;
      const entities=[...scenery,...run.nodes.filter(n=>(n.remaining>0||worldArt&&!String(n.id).startsWith('drop-'))&&(!worldArt||visible(n))).map(n=>({y:n.y,node:n})),...run.enemies.filter(e=>(worldArt||e.health>0)&&(!worldArt||visible(e))).map(e=>({y:e.y,actor:e})),{y:run.player.y,actor:run.player,player:true}].sort((a,b)=>a.y-b.y);
      entities.forEach(e=>{
        if(e.structure)worldArt.drawStructure(ctx,e.structure);
        else if(e.foreground)ctx.drawImage(e.foreground,e.x,e.top);
        else if(e.node){if(worldArt)worldArt.drawNode(ctx,e.node,reduceMotion?0:now,!!(nearest&&nearest.id===e.node.id||selectedId===e.node.id));else drawNode(e.node,now);}
        else if(worldArt){const body=Object.assign({},e.actor,{moving:e.player?walking:e.actor.state==='wander'||e.actor.state==='chase'});worldArt.drawActor(ctx,body,e.player?'player':e.actor.type,reduceMotion?0:now);if(!e.player&&body.health>0&&(body.state==='chase'||body.state==='attack'||body.health<body.maxHealth)){const y=body.y-(body.type==='wolf'?38:54);ctx.fillStyle='#23424bc4';ctx.fillRect(body.x-15,y,30,3);ctx.fillStyle='#ba7e6d';ctx.fillRect(body.x-15,y,30*body.health/body.maxHealth,3);if(body.windup>0){ctx.strokeStyle='#cb816c';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(body.x,body.y,31,12,0,0,Math.PI*2);ctx.stroke();}}}
        else drawActor(e.actor,!!e.player,now);
      });drawEffects();ctx.restore();
      if(ready){
        const weather=Model.weather(run),level=weather.level,indoor=worldArt&&worldArt.isIndoor&&worldArt.isIndoor();
        $('.arena-weather').textContent=weather.name;$('.arena-weather').dataset.level=String(level);
        if(!camp&&!indoor){const p=screenPoint(run.player),r=weather.visibility*zoom,fog=ctx.createRadialGradient(p.x,p.y,r*.25,p.x,p.y,r);
          fog.addColorStop(0,'#b7cbd400');fog.addColorStop(.5,'#b7cbd417');fog.addColorStop(1,'rgba(177,199,211,'+(.25+level*.16)+')');ctx.fillStyle=fog;ctx.fillRect(0,0,viewWidth,viewHeight);}
        if(!indoor){ctx.fillStyle='rgba(238,247,252,'+(.35+level*.1)+')';const count=reduceMotion?Math.min(10,weather.density):weather.density;
          for(let i=0;i<count;i++){const f=snow[i%snow.length],offset=Math.floor(i/snow.length),speed=f.speed*(.6+level*.4),t=reduceMotion?0:now;
            const x=((f.x+offset*.213)*viewWidth+t*speed*.00045*level)%(viewWidth+20),y=((f.y+offset*.371)*viewHeight+t*speed*.002)%(viewHeight+20);
            ctx.beginPath();ctx.ellipse(x,y,f.size*(1+level*.2),f.size*(1+level*.5),-.35,0,Math.PI*2);ctx.fill();}
          if(walking&&!reduceMotion){const p=screenPoint(run.player);ctx.fillStyle='#eaf4f555';for(let i=0;i<4;i++){const k=(now*.002+i*.25)%1;ctx.beginPath();ctx.arc(p.x-7+i*4,p.y-k*14,1.5*(1-k),0,Math.PI*2);ctx.fill();}}
        }
      }
      drawRadar();el.damage.style.opacity=String(clamp(damageFlash,0,.7));
    }
    function frame(now) {
      if(!active||!host.isConnected)return;
      const dt=lastTime?Math.min(.05,Math.max(0,(now-lastTime)/1000)):0;lastTime=now;
      if(externalPanel()&&!paused)suspendPanel();
      if(!active)return;
      if(ready&&!paused&&!ended&&!externalPanel()){
        const ix=movement.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
        const iy=movement.y+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
        const before={x:run.player.x,y:run.player.y};Model.tick(run,dt,{x:ix,y:iy});walking=distance(before,run.player)>.1;
        if(!camp&&heldAttack&&run.player.attackCooldown<=0)action('attack');
        if(!active)return;
        if(walking){footClock+=dt;if(footClock>.25){footClock=0;if(options.onAudio)options.onAudio('step',worldArt&&worldArt.isIndoor&&worldArt.isIndoor()?'indoor':'snow');}}
        saveClock+=dt;if(saveClock>=2){saveClock=0;save();if(!active)return;}
        if(!camp&&run.status==='dead'&&!ended){ended=true;releaseInputs();save();if(active&&options.onDeath)options.onDeath(run);if(!active)return;}
        if(!camp&&Model.canExtract(run)&&!ended){ended=true;releaseInputs();save();if(active&&options.onExit)options.onExit(true);if(!active)return;}
      }else walking=false;
      while(footsteps.length&&now-footsteps[0].time>4500)footsteps.shift();
      damageFlash=Math.max(0,damageFlash-dt*1.8);updateCamera(dt);draw(now);hudClock+=dt;
      if(hudClock>.12||lastTime===0){hudClock=0;updateHud();}
      if(active)raf=requestAnimationFrame(frame);
    }

    listen(canvas,'pointerup',event=>{
      if(paused||!ready||event.button>0||externalPanel())return;
      const point=worldPoint(event),node=(camp?facilities:run.nodes.filter(n=>n.remaining>0)).filter(n=>distance(n,point)<34).sort((a,b)=>distance(a,point)-distance(b,point))[0];
      selectedId=node?node.id:null;tryMove(node?node.x:point.x,node?node.y:point.y);updateHud();
    });
    listen(el.stick,'pointerdown',event=>{
      if(paused||!ready||pointerId!==null||externalPanel())return;event.preventDefault();pointerId=event.pointerId;el.stick.setPointerCapture(pointerId);el.stick.classList.add('is-moving');updateStick(event);
    });
    function updateStick(event){if(event.pointerId!==pointerId)return;const r=el.stick.querySelector('.arena-stick-ring').getBoundingClientRect(),dx=event.clientX-r.left-r.width/2,dy=event.clientY-r.top-r.height/2,mag=Math.hypot(dx,dy),travel=r.width*.33,scale=mag>travel?travel/mag:1;movement.x=mag<7?0:dx*scale/travel;movement.y=mag<7?0:dy*scale/travel;el.knob.style.transform='translate('+dx*scale+'px,'+dy*scale+'px)';}
    listen(el.stick,'pointermove',updateStick);['pointerup','pointercancel','lostpointercapture'].forEach(name=>listen(el.stick,name,event=>{if(event.pointerId===pointerId){pointerId=null;movement.x=movement.y=0;el.knob.style.transform='';el.stick.classList.remove('is-moving');}}));
    listen(el.attack,'pointerdown',event=>{if(event.button>0||paused||!ready)return;event.preventDefault();el.attack.setPointerCapture(event.pointerId);heldAttack=true;action('attack');});
    ['pointerup','pointercancel','lostpointercapture'].forEach(name=>listen(el.attack,name,()=>{heldAttack=false;}));
    listen(el.attack,'click',event=>{if(event.detail===0)action('attack');});
    listen(el.search,'click',()=>action('gather'));listen(el.heal,'click',()=>action('heal'));listen(el.bag,'click',()=>{if(ready)setPane('bag');});listen($('.arena-pause'),'click',pause);
    listen($('.arena-radar'),'click',()=>{if(ready&&!ended)setPane('map');});
    if(camp)listen($('.arena-camp-toolbar'),'click',event=>{const button=event.target.closest('[data-arena-facility]');if(button)openFacility(button.dataset.arenaFacility);});
    listen($('.arena-weather'),'click',()=>{if(active&&ready&&!externalPanel())setPane('weather');});
    listen(el.pane,'pointerup',selectMapPoint);
    listen(el.pane,'click',event=>{
      const button=event.target.closest('button');if(!button||!active)return;
      if(button.dataset.entryPoint){if(camp&&options.onDepart)options.onDepart(button.dataset.entryPoint);return;}
      if(button.dataset.arenaMapMode){mapMode=button.dataset.arenaMapMode;setPane('map');return;}
      if(button.hasAttribute('data-arena-map-go')){
        if(!mapSelection)return;const result=Model.goTo(run,mapSelection.x,mapSelection.y);
        if(result&&result.error){el.pane.querySelector('.arena-map-caption').textContent=result.error+(camp?'':' 请改选道路或补给点。');return;}
        selectedId=mapSelection.id||null;lastTarget={x:mapSelection.x,y:mapSelection.y,time:performance.now()};const name=mapSelection.name;resume();save();announce('正在前往'+name);return;
      }
      const drop=button.dataset.arenaDrop;
      if(drop){const result=Model.drop(run,drop,1);if(result&&result.error)announce(result.error);else{el.pane.querySelector('.arena-item-'+drop).textContent=run.loot[drop];button.disabled=!run.loot[drop];el.pane.querySelector('.arena-bag-total').textContent=Model.weight(run)+' / '+run.capacity;save();updateHud();}return;}
      if(button.dataset.snowLevel){run.weatherLevel=Number(button.dataset.snowLevel);resume();save();return;}
      const next=button.dataset.arenaPane;
      if(next==='resume')resume();else if(next==='enter'){try{localStorage.setItem(guideKey,'1');}catch(_){}resume();}
      else if(next==='abandon'){ended=true;save();if(active&&options.onExit)options.onExit(false);}else if(next)setPane(next);
    });
    listen(window,'keydown',event=>{
      if(!active||!ready||externalPanel())return;const key=event.key.toLowerCase();
      if(key==='tab'&&pane){const buttons=Array.from(el.pane.querySelectorAll('button:not(:disabled)'));if(buttons.length){const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}return;}
      if(!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','j','e','h','m','escape'].includes(key))return;
      event.preventDefault();if(key==='escape'){if(pane==='guide')return;if(paused)resume();else pause();return;}if(paused)return;
      if(key==='m'){if(!event.repeat)setPane('map');}else if(key===' '||key==='j'){if(!camp){if(!event.repeat)action('attack');heldAttack=true;}}else if(key==='e'){if(!event.repeat)action('gather');}else if(key==='h'){if(!event.repeat)action('heal');}else keys.add(key);
    });
    listen(window,'keyup',event=>{const key=event.key.toLowerCase();keys.delete(key);if(key===' '||key==='j')heldAttack=false;});
    listen(window,'blur',()=>{releaseInputs();if(active&&!ended&&pane!=='guide')pause();});listen(window,'resize',resize);listen(document,'visibilitychange',()=>{if(document.hidden){releaseInputs();if(active&&ready&&!ended&&pane!=='guide')pause();save();}});
    listen(host,'contextmenu',event=>event.preventDefault());

    function assetsReady(){
      ready=true;el.loading.hidden=true;updateHud();resize();
      let guideSeen=false;try{guideSeen=localStorage.getItem(guideKey)==='1';}catch(_){}
      if(requestedPause)setPane('pause',false);else if(guideSeen)resume();else setPane('guide',false);
    }
    function worldLoadFailure(){
      el.loading.innerHTML='<strong>场景尚未准备好</strong><button type="button" class="arena-primary arena-retry">重新进入</button>';
      el.loading.querySelector('.arena-retry').addEventListener('click',()=>{el.loading.innerHTML='<span class="arena-loader"></span><strong>进入场景</strong>';loadAssets();},{once:true,signal});
    }
    async function loadAssets(){
      if(window.WhiteoutArt&&typeof window.WhiteoutArt.create==='function'){
        try{
          worldArt=window.WhiteoutArt.create(run);if(worldArt.ready)await worldArt.ready;if(!active)return;overviewArt=document.createElement('canvas');overviewArt.width=960;overviewArt.height=640;
          worldArt.drawOverview(overviewArt.getContext('2d'),960,640);host.classList.add('arena-world');
          if(!$('.arena-orientation-note'))host.insertAdjacentHTML('beforeend','<div class="arena-orientation-note">'+svg('rotate')+'<span>横屏更好操作</span></div>');
          assetsReady();return;
        }catch(error){if(worldArt&&worldArt.dispose)worldArt.dispose();worldArt=null;overviewArt=null;if(isWorld){worldLoadFailure();return;}}
      }else if(isWorld){worldLoadFailure();return;}
      const legacy=run.mapLayout==='legacy';
      const result=await Promise.allSettled([imageAsset('assets/scavenge-district-v2.png'),imageAsset('assets/survivor-zombie-sprites.png'),legacy?imageAsset('assets/scavenge-depot.png'):Promise.resolve(null)]);
      if(!active)return;
      if(result[0].status==='rejected'||result[2].status==='rejected'){
        el.loading.innerHTML='<strong>雪场暂时未能加载</strong><span>请检查本地页面是否仍在运行。</span><button type="button" class="arena-primary arena-retry">重新加载场景</button><button type="button" class="arena-neutral-button arena-load-exit">返回营地</button>';
        el.loading.querySelector('.arena-retry').addEventListener('click',()=>{el.loading.innerHTML='<span class="arena-loader"></span><strong>进入雪场</strong>';loadAssets();},{once:true,signal});
        el.loading.querySelector('.arena-load-exit').addEventListener('click',()=>{ended=true;if(options.onExit)options.onExit(false);},{once:true,signal});return;
      }
      prepareMap(result[0].value,result[2].value);if(result[1].status==='fulfilled')sprites=result[1].value;
      assetsReady();
    }
    function start(){
      if(active||ended||disposed)return;active=true;host.hidden=false;document.body.classList.add('on-expedition');
      resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;if(resizeObserver)resizeObserver.observe(host);
      resize();updateHud();raf=requestAnimationFrame(frame);loadAssets();
    }
    function stop(){
      if(disposed)return;active=false;disposed=true;releaseInputs();cancelAnimationFrame(raf);abort.abort();if(resizeObserver)resizeObserver.disconnect();
      if(worldArt&&worldArt.dispose)worldArt.dispose();worldArt=null;overviewArt=null;
      if(travelArt&&travelArt.dispose)travelArt.dispose();travelArt=null;travelOverview=null;
      host.hidden=true;host.classList.remove('is-paused','has-danger','arena-world','arena-camp');document.body.classList.remove('on-expedition');host.innerHTML='';
    }
    return { start, stop, pause, resume, closePanel:resume, updateCampStatus, isPaused:()=>requestedPause||!!pane||ended||disposed };
  }
  return { create };
});
