'use strict';
(() => {
  const W = window.Winter, A = window.Expedition, V = window.ExpeditionView;
  const $ = selector => document.querySelector(selector);
  const KEY = 'whiteout-save-v4', LEGACY_KEYS = ['whiteout-save-v3','whiteout-save-v2','whiteout-save-v1'], PREF = 'whiteout-preferences-v1';
  const modal = $('#modal'), content = $('#modal-content'), media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const paths = {
    flame:'M12 3c0 5-6 6-6 12a6 6 0 0 0 12 0c0-3-2-5-3-6 0 4-3 4-3 1V3Z',
    wood:'m4 17 12-12 5 5L9 22H4v-5Zm0 0 5 5M16 5l-1-2-4 1L2 13v4h2',
    food:'M6 6h12v15H6V6Zm0 4h12M8 3h8v3H8V3Zm2 11h4v4h-4v-4Z',
    parts:'m14 3 1 4 4 1 2 4-2 4-4 1-1 4h-4l-1-4-4-1-2-4 2-4 4-1 1-4h4Zm-2 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    meds:'M8 5V2h8v3M3 5h18v16H3V5Zm9 5v7m-3-3.5h6',
    home:'m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7',
    radio:'M5 9h14v12H5V9Zm3-3 9-4M9 12h6M9 16v2m6-2v2M2 10v10m20-10v10',
    moon:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z',
    compass:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM16 8l-2.5 5.5L8 16l2.5-5.5L16 8Z',
    heart:'M12 21 3 12C-2 6 6 0 12 7c6-7 14-1 9 5l-9 9Z',
    close:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L19 6',arrow:'M4 12h16m-6-6 6 6-6 6',
    book:'M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (paths[name] || paths.parts) + '"/></svg>';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state = W.fresh(), prefs = {motion:true,sound:true}, lastRevision = 0, lastWriteId = '', syncing = false, operation = 0, storageOK = true, loadMessage = '', importLegacy = false;
  let arenaController = null, sceneRun = null, sceneMode = '', campStatus = {}, dialogOwner = null, modalMode = '', facility = '', workTab = 'craft', bedTab = 'rest', approach = 'normal';
  const pages = {recipe:0,trade:0,quest:0,log:0};
  let toastTimer, audioContext = null, audioGain = null, ignoredCloseEvents = 0, rotationOwner = null;
  try {
    const current = localStorage.getItem(KEY), old = current ? null : LEGACY_KEYS.map(key => localStorage.getItem(key)).find(Boolean), raw = current || old;
    if (raw) {
      const parsed = W.migrate(JSON.parse(raw));
      if (W.valid(parsed)) { state = parsed; lastRevision = revisionOf(parsed); lastWriteId = writeOf(parsed); importLegacy = !current && !!old; }
      else loadMessage = '存档无法读取，已进入新的营地。';
    }
    const stored = JSON.parse(localStorage.getItem(PREF) || 'null'); if (stored) {prefs.motion = stored.motion !== false;prefs.sound=stored.sound!==false;}
  } catch { storageOK = false; loadMessage = '存档无法读取。本次进度可能无法保存。'; }
  function revisionOf(s) { return Number.isSafeInteger(s.revision) && s.revision >= 0 ? s.revision : 0; }
  function writeOf(s) { return typeof s.writeId === 'string' ? s.writeId : ''; }
  function reduceMotion() { return !prefs.motion || media.matches; }
  function toast(message) {
    if (!message) return; clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3600);
  }
  function owned(owner) { return !!owner && owner.controller === arenaController && owner.run === sceneRun && owner.state === state; }
  function ownerNow() { return {controller:arenaController,run:sceneRun,state}; }
  function rotationVisible() {
    return window.innerWidth <= 600 && window.innerHeight > window.innerWidth && !document.body.classList.contains('portrait-accepted');
  }
  function resumeScene(owner) {
    if (!owned(owner) || modal.open || state.outcome || state.pending !== null) return;
    if (rotationVisible()) {
      rotationOwner = owner; owner.controller.pause({panel:true}); return;
    }
    rotationOwner = null; owner.controller.resume();
  }
  function updateOrientation() {
    if (!arenaController) return;
    if (rotationVisible()) {
      if (rotationOwner && owned(rotationOwner)) return;
      rotationOwner = null;
      const alreadyPaused = typeof arenaController.isPaused === 'function' ? arenaController.isPaused() : true;
      if (!alreadyPaused && !modal.open && !state.outcome && state.pending === null) {
        const owner = ownerNow(); rotationOwner = owner; owner.controller.pause({panel:true});
        if (!owned(owner)) rotationOwner = null;
      }
    } else if (rotationOwner) {
      const owner = rotationOwner; rotationOwner = null;
      if (!document.hidden) resumeScene(owner);
    }
  }
  function stopScene() {
    const old = arenaController; arenaController = null; sceneRun = null; sceneMode = ''; rotationOwner = null; if (old) old.stop();
  }
  function syncLatest() {
    if (syncing) return true;
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return true;
      const latest = W.migrate(JSON.parse(raw)), revision = revisionOf(latest), writeId = writeOf(latest);
      if ((revision !== lastRevision || writeId !== lastWriteId) && W.valid(latest)) {
        syncing = true; operation++; closeDialog(false); stopScene(); state = latest; lastRevision = revision; lastWriteId = writeId;
        try { mountScene(true); } finally { syncing = false; }
        toast('已同步另一个窗口的进度。'); return false;
      }
    } catch { /* A malformed external write cannot replace a valid local campaign. */ }
    return true;
  }
  function save() {
    if (syncing || !syncLatest()) return false;
    try {
      state.revision = lastRevision + 1;
      state.writeId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Date.now() + '-' + Math.random();
      localStorage.setItem(KEY, JSON.stringify(state)); lastRevision = state.revision; lastWriteId = state.writeId; storageOK = true;
    } catch { if (storageOK) toast('进度暂时无法保存，请保持页面打开。'); storageOK = false; }
    return true;
  }
  function updateCamp() {
    Object.assign(campStatus,{day:state.day,ap:state.ap,wood:state.wood,food:state.food,parts:state.parts,meds:state.meds,health:state.health,warmth:state.warmth,radioLevel:state.levels.radio});
    if (sceneMode === 'camp' && sceneRun) {
      sceneRun.player.health = Math.max(1,state.health); sceneRun.player.warmth = state.warmth; sceneRun.player.meds = state.meds;
      sceneRun.gear = Object.assign({},state.gear); sceneRun.levels = Object.assign({},state.levels);
      if (arenaController && arenaController.updateCampStatus) arenaController.updateCampStatus(campStatus);
    }
  }
  function mountScene(paused = false) {
    if (arenaController) return;
    const campaign = state, isCamp = !campaign.run;
    const run = isCamp ? A.create({camp:true,seed:campaign.seed,day:campaign.day,health:Math.max(1,campaign.health),warmth:campaign.warmth,meds:campaign.meds,gear:campaign.gear,levels:campaign.levels}) : campaign.run;
    sceneRun = run; sceneMode = isCamp ? 'camp' : 'expedition'; campStatus = {}; updateCamp();
    let controller;
    const ownsScene = () => arenaController === controller && sceneRun === run && state === campaign;
    const finish = evacuated => {
      if (!syncLatest() || !ownsScene()) return;
      if (isCamp) { toast('营地场景已暂停。'); return; }
      const result = W.finishRun(state,!!evacuated); if (result.error) { toast(result.error); return; }
      stopScene(); if (!save() || state !== campaign) return; mountScene(!!state.outcome || state.pending !== null);
      tone(); toast(result.extracted ? '已回营地 · ' + (W.gainText(result.gain) || '空手返回') : result.narrative);
    };
    controller = V.create({
      run,campStatus,paused:paused || !!state.outcome || state.pending !== null,motion:!reduceMotion(),onAudio:(kind,variant)=>{if(window.WhiteoutAudio){window.WhiteoutAudio.setEnabled(prefs.sound);window.WhiteoutAudio.play(kind,variant);}},
      onDepart:entryId=>{
        if(!syncLatest()||!ownsScene()||!isCamp||!canAct())return;
        const location=chooseLocation();if(!location){toast('今日附近搜寻已完成，先准备过夜。');return;}
        const result=W.beginRun(state,location.id,approach,entryId);if(result.error){toast(result.error);return;}
        if(!save()||!ownsScene())return;stopScene();mountScene(false);
      },
      onFacility:id => {
        if (!syncLatest() || !ownsScene() || !isCamp) return;
        if (state.outcome) { showEnding(); return; } if (state.pending !== null) { showEvent(); return; }
        facility = id; showFacility();
      },
      onSave:() => ownsScene() ? (isCamp ? true : save()) : false,onExit:finish,onDeath:() => finish(false)
    });
    arenaController = controller; if (ownsScene()) controller.start();
    if (state.outcome) showEnding(); else if (state.pending !== null) showEvent();
    updateOrientation();
  }
  function closeDialog(resume = true) {
    const owner = dialogOwner; dialogOwner = null; modalMode = '';
    if (modal.open) { ignoredCloseEvents++; modal.close(); }
    if (resume) resumeScene(owner);
  }
  function showDialog(html,mode,owner = ownerNow()) {
    if (!owned(owner)) return;
    dialogOwner = owner; modalMode = mode; owner.controller.pause({panel:true});
    if (!owned(owner)) return;
    content.innerHTML = html;
    if (!modal.open) modal.showModal();
    requestAnimationFrame(() => { if (modal.open) (content.querySelector('[autofocus],button:not(:disabled),input') || modal).focus(); });
  }
  function heading(title,glyph,subtitle = '',closable = true,tools = '') {
    return '<header class="facility-header"><div class="facility-title"><span class="facility-glyph">' + icon(glyph) + '</span><div><h2 id="modal-title">' + esc(title) + '</h2>' + (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') + '</div></div><div class="facility-header-tools">' + tools + (closable ? '<button class="shell-icon" data-close aria-label="关闭并继续游戏">' + icon('close') + '</button>' : '') + '</div></header>';
  }
  function stock() {
    return '<div class="facility-stock" aria-label="营地库存">' + ['wood','food','parts','meds'].map(k => '<span>' + icon(k) + '<b>' + state[k] + '</b><small>' + W.names[k] + '</small></span>').join('') + '<span class="action-stock">行动 <b>' + state.ap + '</b><small>/ 6</small></span></div>';
  }
  function tabs(items,selected,kind) {
    return '<nav class="shell-tabs" aria-label="设施选项">' + items.map(([id,name]) => '<button data-tab="' + kind + '" data-value="' + id + '" class="' + (id === selected ? 'selected' : '') + '" aria-pressed="' + (id === selected) + '">' + name + '</button>').join('') + '</nav>';
  }
  function pager(kind,count,size) {
    const total = Math.max(1,Math.ceil(count / size)); pages[kind] = Math.max(0,Math.min(total - 1,pages[kind]));
    return '<div class="shell-pager"><button data-page="' + kind + '" data-step="-1" aria-label="上一页" ' + (!pages[kind] ? 'disabled' : '') + '>‹</button><span>' + (pages[kind] + 1) + ' / ' + total + '</span><button data-page="' + kind + '" data-step="1" aria-label="下一页" ' + (pages[kind] >= total - 1 ? 'disabled' : '') + '>›</button></div>';
  }
  const costText = cost => esc(W.costText(cost)), disabled = condition => condition ? 'disabled' : '';
  function canAct() { return state.ap > 0 && !state.outcome && state.pending === null && !state.run; }
  function meters() {
    return '<div class="supply-vitals">' + [['health','生命'],['warmth','保暖'],['hope','士气']].map(([key,name]) => '<div><span>' + name + '</span><b>' + state[key] + '<small> / 100</small></b><i><em style="width:' + state[key] + '%"></em></i></div>').join('') + '</div>';
  }
  function supplyPanel() {
    const items = [
      ['stoke','添柴','flame','保暖 +24',{wood:3},state.warmth === 100],
      ['eat','热食','food','生命 +6 · 保暖 +6 · 士气 +5',{food:2},state.health === 100 && state.warmth === 100 && state.hope === 100],
      ['heal','急救','meds','生命 +35',{meds:1},state.health === 100]
    ];
    return meters() + '<div class="shell-cards three">' + items.map(([id,name,glyph,effect,cost,full]) => '<article class="shell-card"><h3>' + icon(glyph) + name + '</h3><p>' + effect + '</p><footer><span>' + costText(cost) + '</span><button class="shell-button" data-supply="' + id + '" ' + disabled(full || !W.afford(state,cost)) + '>' + (full ? '无需使用' : '使用') + '</button></footer></article>').join('') + '</div><p class="shell-note">不消耗行动。营地内不会随时间扣除物资或保暖。</p>';
  }
  function craftPanel() {
    return '<div class="shell-cards four">' + W.recipes.slice(pages.recipe * 4,pages.recipe * 4 + 4).map(r => {
      const has = r.gear && state.gear[r.id];
      return '<article class="shell-card ' + (has ? 'is-owned' : '') + '"><h3>' + icon(r.icon) + esc(r.name) + (has ? '<small>已装备</small>' : '') + '</h3><p>' + esc(r.desc) + '</p><footer><span>' + costText(r.cost) + '</span><button class="shell-button" data-craft="' + r.id + '" ' + disabled(has || !canAct() || !W.afford(state,r.cost)) + '>' + (has ? '已制作' : '制作') + '</button></footer></article>';
    }).join('') + '</div>';
  }
  function buildPanel() {
    return '<div class="shell-cards three">' + W.upgrades.filter(u => u.id !== 'radio').map(u => {
      const cost = u.costs[state.levels[u.id]];
      return '<article class="shell-card"><h3>' + icon(u.id === 'stove' ? 'flame' : u.id === 'walls' ? 'home' : 'compass') + esc(u.name) + '<small>' + state.levels[u.id] + ' / 2 级</small></h3><p>' + esc(u.desc) + '</p><footer><span>' + (cost ? costText(cost) : '已完成全部改建') + '</span><button class="shell-button" data-upgrade="' + u.id + '" ' + disabled(!cost || !canAct() || !W.afford(state,cost)) + '>' + (cost ? '升级' : '已完成') + '</button></footer></article>';
    }).join('') + '</div>';
  }
  function tradePanel() {
    const offers = W.offers(state);
    return '<div class="shell-cards two">' + offers.slice(pages.trade * 2,pages.trade * 2 + 2).map(t => {
      const done = state.traded.includes(t.id);
      return '<article class="shell-card"><h3>' + icon('parts') + esc(t.name) + '</h3><p>' + esc(W.gainText(t.gain)) + '</p><footer><span>' + costText(t.cost) + '</span><button class="shell-button" data-trade="' + t.id + '" ' + disabled(state.day < 2 || done || !W.afford(state,t.cost)) + '>' + (done ? '已交换' : '交换') + '</button></footer></article>';
    }).join('') + '</div>';
  }
  function questPanel() {
    return '<div class="shell-cards two">' + W.quests.slice(pages.quest * 2,pages.quest * 2 + 2).map(q => {
      const progress = Math.min(q.target,W.progress(state,q)), done = state.claimed.includes(q.id);
      return '<article class="shell-card"><h3>' + esc(q.name) + '<small>' + (done ? '已领取' : progress + ' / ' + q.target) + '</small></h3><p>' + esc(q.desc) + '</p><div class="quest-meter"><i style="width:' + progress / q.target * 100 + '%"></i></div><footer><span>' + esc(W.gainText(q.reward)) + '</span><button class="shell-button" data-claim="' + q.id + '" ' + disabled(done || progress < q.target) + '>领取</button></footer></article>';
    }).join('') + '</div>';
  }
  function logPanel() {
    const paging = pager('log',state.logs.length,3);
    return '<div class="catalog-label"><span>行动记录</span>' + paging + '</div><div class="shell-log">' + state.logs.slice(pages.log * 3,pages.log * 3 + 3).map(l => '<article><time>第 ' + l.day + ' 天</time><p>' + esc(l.text) + '</p></article>').join('') + '</div>';
  }
  function restPanel() {
    const cost = W.nightCost(state), enough = W.afford(state,cost);
    return '<div class="rest-layout"><div><h3>准备过夜</h3><p>' + (state.ap ? '还有 ' + state.ap + ' 次行动，过夜会结束今天。' : '今天的行动已用完。') + '</p><div class="night-supplies">' + icon('wood') + '<b>' + cost.wood + '</b><span>木材</span>' + icon('food') + '<b>' + cost.food + '</b><span>食物</span></div><p class="shell-note">' + (enough ? '物资够用，休息后恢复体力与保暖。' : '储备不足，过夜会失温或挨饿。') + (state.levels.trap ? ' 陷阱收获 ' + state.levels.trap * 3 + ' 食物，在本夜消耗之后到账。' : '') + '</p></div><div class="rest-summary"><span>当前进度</span><strong>' + Math.min(7,state.day - 1) + '<small> / 7 夜</small></strong><p>求救电台 ' + state.levels.radio + ' / 2 级</p><button class="shell-button primary" data-confirm-night>' + (enough ? '确认过夜' : '冒险过夜') + icon('moon') + '</button></div></div>';
  }
  function crewPanel() {
    return '<p class="shell-note">林远每夜多消耗 1 食物。调整分工不消耗行动。</p><div class="shell-cards two">' + [['scout','随行协助','带物资成功撤离后额外获得 1 零件。'],['camp','营地劈柴','每次过夜额外获得 4 木材。']].map(([id,name,text]) => '<article class="shell-card"><h3>' + icon('home') + name + '</h3><p>' + text + '</p><footer><span>' + (state.crewRole === id ? '当前分工' : '') + '</span><button class="shell-button" data-assign="' + id + '" ' + disabled(state.crewRole === id) + '>安排</button></footer></article>').join('') + '</div>';
  }
  function chooseLocation() {
    const eligible = W.locations.filter(l => state.day >= l.unlock && (state.visits[l.id] || 0) < 3), night = W.nightCost(state), radio = W.upgrades.find(u => u.id === 'radio');
    const needParts = radio.costs[state.levels.radio] ? radio.costs[state.levels.radio].parts : 8;
    const weights = {wood:state.wood < night.wood + 8 ? 3 : .55,food:state.food < night.food + 5 ? 3 : .55,parts:state.parts < needParts ? 2 : .7,meds:state.health < 65 && !state.meds ? 6 : 1};
    const score = l => Object.entries(l.base).reduce((n,[k,v]) => n + v * weights[k],0) / (1 + (state.visits[l.id] || 0) * .2);
    return eligible.sort((a,b) => score(b) - score(a))[0];
  }
  function gatePanel() {
    const location = chooseLocation(), strategies = [['careful','稳妥','敌人较少，降温较慢，物资储量较少。'],['normal','标准','常规物资与危险，适合日常补给。'],['bold','深入','更多物资，更多敌人，失温更快。']];
    return '<p class="shell-note">一次外出可探索整片雪地。返回营地出口撤离后，背包物资才入库。</p><div class="shell-cards three strategies">' + strategies.map(([id,name,text]) => '<button class="shell-card strategy ' + (approach === id ? 'selected' : '') + '" data-approach="' + id + '" aria-pressed="' + (approach === id) + '"><span>' + icon('compass') + name + '</span><p>' + text + '</p><i>' + (approach === id ? '已选择' : '选择') + '</i></button>').join('') + '</div><div class="departure-bar"><div><strong>' + (state.ap ? '准备出发' : '今天的行动已用完') + '</strong><span>' + (location ? '本次优先补给：' + Object.keys(location.base).map(k => W.names[k]).join(' · ') + ' · 消耗 1 次行动' : '附近今日搜寻已完成，过夜后再出发') + '</span></div><button class="shell-button primary" data-depart ' + disabled(!canAct() || !location) + '>进入雪地' + icon('arrow') + '</button></div>';
  }
  function radioPanel() {
    const upgrade = W.upgrades.find(u => u.id === 'radio'), cost = upgrade.costs[state.levels.radio];
    return '<div class="radio-layout"><div class="signal-display" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div><h3>求救电台 · ' + state.levels.radio + ' / 2 级</h3><p>' + (state.levels.radio === 2 ? '电台可以联系北线救援。守过第七夜后抵达救援阶段。' : '修复供电与发射组件，守过七夜后联系救援。') + '</p><div class="radio-progress"><span>已守过 ' + Math.min(7,state.day - 1) + ' / 7 夜</span><span>' + (cost ? costText(cost) + ' · 1 次行动' : '设备已修复') + '</span></div><button class="shell-button primary" data-upgrade="radio" ' + disabled(!cost || !canAct() || !W.afford(state,cost)) + '>' + (cost ? '修复电台' : '电台就绪') + icon('radio') + '</button></div></div>';
  }
  function showFacility() {
    if (sceneMode !== 'camp' || state.run || state.pending !== null || state.outcome) return;
    let html;
    if (facility === 'stove') html = heading('铸铁炉','flame','身体与补给') + stock() + supplyPanel();
    else if (facility === 'workbench') {
      const tools = workTab === 'craft' ? pager('recipe',W.recipes.length,4) : workTab === 'trade' ? pager('trade',W.offers(state).length,2) : workTab === 'quests' ? pager('quest',W.quests.length,2) : '';
      const caption = workTab === 'craft' || workTab === 'build' ? '消耗 1 次行动' : workTab === 'trade' ? (state.day < 2 ? '商队第 2 天抵达' : '每日轮换 · 不耗行动') : '完成目标领取补给';
      html = heading('工作台','parts','第 ' + state.day + ' 天 · ' + caption,true,tools) + stock() + tabs([['craft','制作'],['build','改建'],['trade','交换'],['quests','目标']],workTab,'work') + ({craft:craftPanel,build:buildPanel,trade:tradePanel,quests:questPanel}[workTab] || craftPanel)();
    }
    else if (facility === 'bed') html = heading('床铺','moon','第 ' + state.day + ' 天') + stock() + tabs([['rest','过夜'],['log','记录'],...(state.companion ? [['crew','同伴']] : [])],bedTab,'bed') + (bedTab === 'log' ? logPanel() : bedTab === 'crew' && state.companion ? crewPanel() : restPanel());
    else if (facility === 'radio') html = heading('求救电台','radio','北线救援') + stock() + radioPanel();
    else if (facility === 'gate') html = heading('营地出口','compass','第 ' + state.day + ' 天 · ' + state.ap + ' 次行动可用') + stock() + gatePanel();
    else return;
    showDialog(html,'facility');
  }
  function showEvent() {
    if (state.pending === null || state.outcome) return; const event = W.events[state.pending];
    showDialog(heading(event.title,'book','回营地后的发现',false) + stock() + '<p class="event-copy">' + esc(event.text) + '</p><div class="shell-cards two">' + event.options.map((option,index) => '<button class="shell-card event-choice" data-choice="' + index + '" ' + disabled(!W.afford(state,option.cost)) + '><strong>' + esc(option.label) + '</strong><p>' + (option.cost ? '消耗 ' + costText(option.cost) + '<br>' : '') + esc(W.gainText(option.gain)) + (option.companion ? ' · 林远加入营地' : '') + '</p>' + icon('arrow') + '</button>').join('') + '</div><p class="shell-note">选择不消耗行动，会自动保存。</p>','event');
  }
  function showEnding() {
    const won = state.outcome === 'won';
    showDialog(heading(won ? '救援抵达' : '本次生存结束',won ? 'radio' : 'heart',won ? '北线已收到营地信号' : '生命耗尽',false) + '<div class="ending-layout"><div><h3>' + (won ? '七夜之后，等到了车队。' : '进度已保留。') + '</h3><p>' + (won ? '本阶段生存目标完成。可以查看这段行程的行动记录。' : '本局已结束。查看记录可以回顾物资与身体状态的变化。') + '</p></div><div class="ending-stats"><span><b>' + Math.max(0,state.day - 1) + '</b>过夜</span><span><b>' + state.expeditions + '</b>成功搜刮</span><span><b>' + state.kills + '</b>消灭威胁</span></div></div><footer class="shell-footer"><span>当前存档保留，不会自动开始新局。</span><button class="shell-button" data-end-record>查看记录' + icon('book') + '</button></footer>','ending');
  }
  function showEndRecords() {
    showDialog(heading('行动记录','book','本局进度',false) + logPanel() + '<div class="shell-footer"><span>记录与营地库存已保留。</span><button class="shell-button" data-back-ending>返回结算</button></div>','end-record');
  }
  async function checkUpdates(){
    if(!window.WhiteoutUpdates)return;
    showDialog(heading('游戏更新','radio','当前版本 '+window.WhiteoutUpdates.current)+'<div class="update-status"><h3>正在检查</h3><p>连接发布服务，请稍候。</p></div>','updates');
    const result=await window.WhiteoutUpdates.check();if(modalMode!=='updates')return;
    const content=result.ok?result.available?'<h3>发现新版本 '+esc(result.version)+'</h3><p>'+esc(result.notes)+'</p>':'<h3>已是最新版本</h3><p>当前安装版本 '+esc(result.current)+'</p>':'<h3>暂时连接不上</h3><p>'+esc(result.error)+'</p>';
    const action=result.ok&&result.available?(result.native?'<a class="shell-button primary" href="'+esc(result.url)+'" target="_blank" rel="noopener">查看新版安装包</a>':'<button class="shell-button primary" data-update-apply>保存并重启更新</button>'):'';
    showDialog(heading('游戏更新','radio','存档会继续保留')+'<div class="update-status">'+content+'</div><div class="shell-footer">'+action+'<button class="shell-button" data-close>返回游戏</button></div>','updates');
  }
  function showSettings() {
    showDialog(heading('设置','parts','操作与显示') + '<div class="settings-grid"><div class="settings-controls"><label><span>动态效果<small>同时尊重系统“减少动态效果”</small></span><input id="motion-toggle" type="checkbox" ' + (prefs.motion ? 'checked' : '') + '></label><label><span>环境音效<small>踩雪、开箱与环境声</small></span><input id="audio-toggle" type="checkbox" ' + (prefs.sound ? 'checked' : '') + '></label><p class="shell-note">' + (storageOK ? '进度自动保存在当前浏览器。' : '当前进度无法保存，请保持页面打开。') + '<br>不同设备、浏览器与访问地址各有独立存档。</p></div><div class="control-guide"><h3>操作</h3><p>移动：摇杆、点击地面或 WASD<br>互动 / 搜索：靠近后点按钮或 E<br>攻击：按住按钮、空格或 J<br>急救：按钮或 H　暂停：Esc</p><p>营地设施可直接点快捷图标。外出物资须回到出口撤离，放弃行程会丢弃背包。地图与切到后台会暂停。</p></div></div><div class="shell-footer"><span>版本 ' + esc(window.WhiteoutUpdates ? window.WhiteoutUpdates.current : '1.0.0') + '</span><button class="shell-button" data-update-check>检查更新</button><button class="shell-button primary" data-close>继续游戏</button></div>','settings');
  }
  function mutate(action,after) {
    const owner = dialogOwner;
    if (!syncLatest() || !owned(owner) || sceneMode !== 'camp' || state.run || state.outcome) return;
    const campaign = state, result = action(campaign); if (result.error) { toast(result.error); return; }
    if (!save() || campaign !== state || !owned(owner)) return;
    updateCamp(); tone(); toast(result.narrative || W.gainText(result.gain));
    if (state.outcome) showEnding(); else if (state.pending !== null) showEvent(); else if (after) after(result); else showFacility();
  }
  function depart() {
    const owner = dialogOwner; if (!syncLatest() || !owned(owner) || sceneMode !== 'camp' || !canAct()) return;
    const location = chooseLocation(); if (!location) { toast('今日附近搜寻已完成，先准备过夜。'); return; }
    const campaign = state, token = ++operation, result = W.beginRun(state,location.id,approach);
    if (result.error) { toast(result.error); return; } if (!save() || campaign !== state || token !== operation || !owned(owner)) return;
    closeDialog(false); stopScene(); mountScene(false);
  }
  function applyPrefs() {
    if(window.WhiteoutAudio)window.WhiteoutAudio.setEnabled(prefs.sound);
    document.body.classList.toggle('reduced-motion',reduceMotion());
    try { localStorage.setItem(PREF,JSON.stringify({motion:prefs.motion,sound:prefs.sound})); } catch { /* Preferences never mutate a campaign. */ }
  }
  async function toggleSound() {
    try {
      if (!audioContext) {
        const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) { toast('浏览器暂不支持音效。'); return; }
        audioContext = new Audio(); audioGain = audioContext.createGain(); audioGain.gain.value = 0; audioGain.connect(audioContext.destination);
        const buffer = audioContext.createBuffer(1,audioContext.sampleRate * 3,audioContext.sampleRate), samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * .2;
        const wind = audioContext.createBufferSource(), filter = audioContext.createBiquadFilter(); wind.buffer = buffer; wind.loop = true; filter.type = 'lowpass'; filter.frequency.value = 340;
        wind.connect(filter); filter.connect(audioGain); wind.start();
      }
      await audioContext.resume(); prefs.sound = !prefs.sound; audioGain.gain.setTargetAtTime(prefs.sound ? .2 : 0,audioContext.currentTime,.3); applyPrefs();
    } catch { prefs.sound = false; applyPrefs(); toast('音效无法开启，可继续静音游玩。'); }
  }
  function tone() {
    if (!audioContext || !prefs.sound) return;
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(); oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(520,audioContext.currentTime); oscillator.frequency.exponentialRampToValueAtTime(780,audioContext.currentTime + .12);
    gain.gain.setValueAtTime(.035,audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime + .3);
    oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + .31);
  }
  document.addEventListener('click',event => {
    const button = event.target.closest('button'); if (!button || button.disabled) return;
    if(button.hasAttribute('data-update-check')){checkUpdates();return;}
    if(button.hasAttribute('data-update-apply')){if(syncLatest()&&save()){button.disabled=true;window.WhiteoutUpdates.apply().catch(()=>{button.disabled=false;toast('更新未完成，请稍后重试。');});}return;}
    if (button.id === 'portrait-continue') { document.body.classList.add('portrait-accepted'); updateOrientation(); return; }
    if (button.id === 'scene-settings') {
      if (!syncLatest()) return; if (state.outcome) showEnding(); else if (state.pending !== null) showEvent(); else showSettings(); return;
    }
    if (!modal.contains(button)) return;
    const owner = dialogOwner; if (!syncLatest() || !owned(owner)) return;
    if (button.hasAttribute('data-close')) { closeDialog(); return; }
    if (button.dataset.tab) { if (button.dataset.tab === 'work') workTab = button.dataset.value; if (button.dataset.tab === 'bed') bedTab = button.dataset.value; showFacility(); return; }
    if (button.dataset.page) { const kind = button.dataset.page; if (kind in pages) pages[kind] += Number(button.dataset.step); if (modalMode === 'end-record') showEndRecords(); else showFacility(); return; }
    if (button.dataset.approach) { approach = button.dataset.approach; showFacility(); return; }
    if (button.hasAttribute('data-depart')) { depart(); return; }
    if (button.dataset.supply) { mutate(s => W.supply(s,button.dataset.supply)); return; }
    if (button.dataset.craft) { mutate(s => W.craft(s,button.dataset.craft)); return; }
    if (button.dataset.upgrade) { mutate(s => W.upgrade(s,button.dataset.upgrade)); return; }
    if (button.dataset.trade) { mutate(s => W.trade(s,button.dataset.trade)); return; }
    if (button.dataset.claim) { mutate(s => W.claim(s,button.dataset.claim)); return; }
    if (button.dataset.assign) { mutate(s => W.assign(s,button.dataset.assign)); return; }
    if (button.dataset.choice !== undefined) { mutate(s => W.choose(s,Number(button.dataset.choice)),() => closeDialog()); return; }
    if (button.hasAttribute('data-confirm-night')) {
      mutate(s => W.rest(s),result => showDialog(heading('第 ' + state.day + ' 天','moon','夜间结算') + '<div class="morning-summary"><h3>' + esc(result.narrative) + '</h3><p>' + esc(W.gainText(result.gain)) + '</p><span>行动恢复到 6 次，今日搜寻与交换已重置。</span></div><div class="shell-footer"><span>记得为下一夜保留燃料与口粮。</span><button class="shell-button primary" data-close>返回营地</button></div>','morning')); return;
    }
    if (button.hasAttribute('data-end-record')) { showEndRecords(); return; }
    if (button.hasAttribute('data-back-ending')) showEnding();
  });
  document.addEventListener('change',async event => {
    if (!modal.contains(event.target) || !owned(dialogOwner) || !syncLatest()) return;
    if (event.target.id === 'audio-toggle') { await toggleSound(); if (modalMode === 'settings') showSettings(); }
    if (event.target.id === 'motion-toggle') {
      prefs.motion = event.target.checked; applyPrefs(); closeDialog(false); stopScene(); mountScene(true);
      if (!state.outcome && state.pending === null) showSettings();
    }
  });
  modal.addEventListener('cancel',event => { if (['event','ending','end-record'].includes(modalMode)) event.preventDefault(); });
  modal.addEventListener('close',() => {
    if (ignoredCloseEvents) { ignoredCloseEvents--; return; }
    const owner = dialogOwner; dialogOwner = null; modalMode = ''; resumeScene(owner);
  });
  window.addEventListener('storage',event => { if (event.key === KEY) syncLatest(); });
  window.addEventListener('resize',() => {
    if (window.innerWidth > window.innerHeight) document.body.classList.remove('portrait-accepted');
    updateOrientation();
  });
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) rotationOwner = null;
    if (audioContext) { if (document.hidden) audioContext.suspend().catch(() => {}); else if (prefs.sound) audioContext.resume().catch(() => {}); }
  });
  window.addEventListener('blur',() => { rotationOwner = null; });
  const motionChanged = () => { applyPrefs(); closeDialog(false); stopScene(); mountScene(true); toast('动态效果设置已更新。'); };
  if (media.addEventListener) media.addEventListener('change',motionChanged); else media.addListener(motionChanged);
  if (state.recoveredRun) { delete state.recoveredRun; loadMessage = '外出记录无法恢复，已保留营地库存。'; importLegacy = true; }
  applyPrefs(); if (importLegacy) save(); mountScene(!!state.run || !!state.outcome || state.pending !== null); if (loadMessage) toast(loadMessage);
})();
