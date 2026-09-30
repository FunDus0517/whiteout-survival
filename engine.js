(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./content.js'), require('./arena-model.js')); else root.Winter = factory(root.WinterContent,root.Expedition); })(typeof globalThis !== 'undefined' ? globalThis : this, function (C,A) {
  'use strict';
  const VERSION = 1;
  const names = {wood:'木材',food:'食物',parts:'零件',meds:'急救包',warmth:'保暖',health:'生命',hope:'士气'};
  const locations = [
    {id:'forest',name:'北坡林地',sub:'林场留下的木料',tag:'木材丰富',icon:'tree',unlock:1,base:{wood:7,food:1},cold:7,lines:['林场堆料棚塌了一半。你从防水布下面拖出几捆干柴。','北坡有棵倒下的白桦。树芯还干着，锯开能烧。','木料冻在一起。你敲了很久，带回的量够炉子再烧一晚。']},
    {id:'town',name:'旧居民区',sub:'废弃楼房与商店',tag:'食物 · 零件',icon:'building',unlock:1,base:{food:5,parts:3},cold:10,lines:['便利店的时钟停在三点十五分。货架后面，还有几罐没被发现的食物。','你撬开旧工具柜。铁锈底下，那些零件依然完好。','302 室的门打不开。你撬开厨房窗户，在水槽下找到罐头。']},
    {id:'station',name:'气象观测站',sub:'拆取电台零件',tag:'稀有零件',icon:'radio',unlock:2,base:{parts:7,wood:2},cold:12,lines:['你拆下备用电源的外壳。里面的线路，或许能让无线电再次说话。','记录本的最后一行写着：不要放弃监听。你把它郑重放进背包。','天线已经折了。室内机还在，你拆下接收模块装进背包。']},
    {id:'lake',name:'水库冰面',sub:'旧渔场的捕捞点',tag:'大量食物',icon:'wave',unlock:3,base:{food:9,wood:1},cold:13,lines:['旧冰洞又冻住了。凿开以后，网里捞上来几条鱼。','渔具棚里还有一张网。修补几个破洞，勉强能用。','风太大，收网时差点滑倒。今天的鱼够吃两顿。']}
  ];
  const upgrades = [
    {id:'stove',name:'铸铁炉',icon:'flame',desc:'每级降低每夜燃料消耗 1，并额外恢复保暖。',costs:[{wood:10,parts:3},{wood:16,parts:6}]},
    {id:'walls',name:'保温墙',icon:'home',desc:'每级减少外出失温 2，夜间也更暖和。',costs:[{wood:12,parts:2},{wood:18,parts:5}]},
    {id:'trap',name:'捕猎陷阱',icon:'tree',desc:'每级在过夜时自动收获 3 份食物。',costs:[{wood:8,parts:4},{wood:12,parts:6}]},
    {id:'radio',name:'求救无线电',icon:'radio',desc:'修复至 2 级，守过第 7 夜，即可联系救援。',costs:[{wood:4,parts:6},{wood:8,parts:12}]}
  ];
  const events = [
    {title:'站台上还有个人',text:'一位机械师蜷缩在废弃站台。他的手冻得握不住扳手，但仍护着怀里的工具。带他回家，就多了一张需要吃饭的嘴，也多了一双能一起熬过长夜的手。',options:[{label:'分给他食物，一起回家',cost:{food:3},gain:{hope:12},companion:true,note:'机械师林远加入。每次探索额外获得 1 零件，每夜多消耗 1 食物。'},{label:'标出避风路线，指向另一处营地',gain:{hope:3},note:'你在他的地图上标出一条背风路线。他沿着路标离开了站台。'}]},
    {title:'一只未上锁的铁箱',text:'积雪下面露出一个救灾铁箱。铰链已经冻死。你可以用些木材生火化冰，也可以试着徒手撬开。',options:[{label:'生火，完整取出物资',cost:{wood:3},gain:{food:5,meds:1},note:'热气升起，里面的绷带依然干燥。'},{label:'徒手撬开箱盖',gain:{parts:4,health:-8},note:'指节被划破，但你拿到了关键零件。'}]},
    {title:'窗台下的罐头',text:'「如果你看到这封信，窗台下的罐头留给你。请替我看一次春天。」字迹有些模糊。你把信叠好，放进了内袋。',options:[{label:'收下馈赠，记住这个约定',gain:{food:4,hope:9},note:'四个罐头，保质期还剩半年。信一起带走了。'},{label:'用零件修好门，留下补给',cost:{parts:2},gain:{hope:18},note:'门锁修好了，你在门板上标记了储物位置。'}]},
    {title:'风雪中的岔路',text:'一阵突如其来的白雾封住了回程。近路要翻过冰坡，绕行则会消耗更多体温。远处，避难所的灯还亮着。',options:[{label:'沿着标记，稳妥绕行',gain:{warmth:-8,wood:3},note:'你带着沿路拾起的木料，平安回到了门前。'},{label:'翻越冰坡，带回遗落的背包',gain:{health:-10,parts:4,food:3},note:'膝盖擦伤了。背包里的食物让这趟冒险有了回报。'}]},
    {title:'一个尚有信号的频段',text:'静电声里，突然传来几秒钢琴。那是一个你几乎忘记的旋律。也许远方还有人，也许那只是旧时代的自动广播。',options:[{label:'停下来，听完这首曲子',gain:{hope:14,warmth:-3},note:'乐曲在第二段断了。你记下了收到广播的时刻。'},{label:'追踪信号，寻找设备',gain:{parts:5,warmth:-7},note:'你找到了一个尚有余电的发射器。'}]},
    {title:'苗圃的玻璃棚',text:'破碎的玻璃棚里，几株绿叶仍顽强地活着。旁边的种植箱里还藏着耐寒的块茎。你第一次在白色以外，看见了春天。',options:[{label:'收集块茎，今晚加餐',gain:{food:6,hope:3},note:'块茎没冻坏。把发黑的地方削掉就能吃。'},{label:'带回种子与栽培记录',gain:{food:2,hope:12,parts:2},note:'你把种子装进纸袋，按笔记上的要求收进内袋。'}]},
    {title:'一头受困的小鹿',text:'废弃铁丝缠住了它的后腿。它没有挣扎，只是望着你，呼吸在空气里凝成白雾。',options:[{label:'用工具剪断铁丝',cost:{parts:1},gain:{hope:15,wood:3},note:'它回头看了你一眼，然后消失在松林里。'},{label:'耐心安抚，徒手解开铁丝',gain:{hope:10,warmth:-4},note:'铁丝解开了，手也冻僵了。它一瘸一拐地跑进林子。'}]},
    {title:'巡逻者的交易',text:'一个拖着雪橇的陌生人向你举起空着的双手。他有多余的药物，但炉子已经两天没有点燃。',options:[{label:'用 4 木材换取急救包',cost:{wood:4},gain:{meds:1,hope:4},note:'他道谢时，声音比风更轻。'},{label:'交换路况情报',gain:{parts:2,hope:4},note:'临别时，他递给你两枚备用保险丝。'}]}
  ];
  locations.push(...C.locations); events.push(...C.events);
  const recipes=C.recipes,trades=C.trades,quests=C.quests;
  const weather = ['细雪','晴冷','强风','大雪','冰雾','暴风雪','极夜寒潮'];
  function fresh(seed) {return {version:VERSION,seed:(seed||Date.now())>>>0,day:1,ap:6,wood:14,food:10,parts:4,meds:1,warmth:78,health:100,hope:86,levels:{stove:0,walls:0,trap:0,radio:0},visits:{},expeditions:0,companion:false,rescueSeen:false,eventBag:[],gear:{axe:false,coat:false,boots:false,pack:false,spear:false,crossbow:false},run:null,kills:0,claimed:[],traded:[],tradeCount:0,crewRole:'scout',pending:null,outcome:null,logs:[{day:1,text:'09 号值班室：炉子能用，电台无响应。柜里找到十份口粮和一个急救包。'}]};}
  function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
  function log(s,text){s.logs.unshift({day:s.day,text});s.logs=s.logs.slice(0,100);}
  function clamp(s){for(const k of ['warmth','health','hope'])s[k]=Math.max(0,Math.min(100,s[k]));for(const k of ['wood','food','parts','meds'])s[k]=Math.max(0,Math.floor(s[k]));if(s.health<=0)s.outcome='lost';else if(s.day>=8&&s.levels.radio===2)s.outcome='won';}
  function apply(s,gain){for(const [k,v]of Object.entries(gain||{}))s[k]+=v;clamp(s);}
  function afford(s,cost){return Object.entries(cost||{}).every(([k,v])=>s[k]>=v);}
  function pay(s,cost){for(const [k,v]of Object.entries(cost||{}))s[k]-=v;}
  function costText(cost){return Object.entries(cost||{}).map(([k,v])=>`${v} ${names[k]}`).join(' · ');}
  function gainText(gain){return Object.entries(gain||{}).filter(([,v])=>v!==0).map(([k,v])=>`${v>0?'+':''}${v} ${names[k]}`).join('  ');}
  function blocked(s){return s.run?'正在外出，请先撤离或退回营地。':s.outcome?'本次旅程已结束。':s.pending!==null?'请先完成眼前的选择。':null;}
  function explore(s,id,approach='normal'){let error=blocked(s);if(error)return {error};if(!['normal','careful','bold'].includes(approach))return {error:'请选择有效的搜寻策略。'};const l=locations.find(x=>x.id===id);if(!l||s.day<l.unlock)return {error:'这里的道路尚未开放。'};if(s.ap<=0)return {error:'天已经黑了。回到炉火旁，结束今天吧。'};if((s.visits[id]||0)>=3)return {error:'这一带今天已搜寻完，明天再来。'};
    s.ap--;s.visits[id]=(s.visits[id]||0)+1;s.expeditions++;const gain={};for(const[k,v]of Object.entries(l.base))gain[k]=v+Math.floor(random(s)*3);if(s.companion&&s.crewRole==='scout')gain.parts=(gain.parts||0)+1;
    const streak=s.expeditions%3===0;if(streak){gain.wood=(gain.wood||0)+3;gain.food=(gain.food||0)+2;}gain.warmth=-coldCost(s,l,approach);gain.hope=s.hope>=35?1:0;if(s.hope>=75)gain[Object.keys(l.base)[0]]+=2;
    if(approach==='careful')for(const k of Object.keys(l.base))gain[k]=Math.max(1,Math.floor(gain[k]*.75));
    if(approach==='bold'){for(const k of Object.keys(l.base))gain[k]+=k==='meds'?1:4;gain.health=-(s.gear.boots?3:6);}
    if(s.gear.axe&&l.base.wood)gain.wood=(gain.wood||0)+3;
    if(s.gear.pack){gain.food=(gain.food||0)+2;gain.parts=(gain.parts||0)+1;}
    apply(s,gain);if(s.warmth<=0)apply(s,{health:-15});let narrative=l.lines[Math.floor(random(s)*l.lines.length)];log(s,narrative);if(streak)log(s,'探索补给奖励：每累计 3 次探索，额外获得 3 木材、2 食物。');
    if(!s.outcome){if(s.expeditions===3&&!s.rescueSeen){s.pending=0;s.rescueSeen=true;}else if(s.expeditions%2===0){if(!s.eventBag.length)s.eventBag=Array.from({length:events.length-1},(_,i)=>i+1);const n=Math.floor(random(s)*s.eventBag.length);s.pending=s.eventBag.splice(n,1)[0];}}
    return {gain,narrative,streak,event:s.pending!==null};
  }
  function choose(s,index){if(s.run)return {error:'请先结束外出行程。'};if(s.pending===null||s.outcome)return {error:'当前没有待处理事件。'};const event=events[s.pending],option=event.options[index];if(!option||!afford(s,option.cost))return {error:'物资不足，选择另一个方案。'};pay(s,option.cost);apply(s,option.gain);if(option.companion)s.companion=true;s.pending=null;log(s,option.note);return {gain:option.gain,narrative:option.note};}
  function upgrade(s,id){const error=blocked(s);if(error)return {error};const u=upgrades.find(x=>x.id===id);if(!u)return {error:'未知设施。'};const cost=u.costs[s.levels[id]];if(!cost)return {error:'已经升至最高等级。'};if(s.ap<=0)return {error:'今天的行动已用尽，明天再建造。'};if(!afford(s,cost))return {error:'物资不足，再去荒野找一找。'};pay(s,cost);s.ap--;s.levels[id]++;apply(s,{hope:5});log(s,`${u.name}已升至 ${s.levels[id]} 级。已投入使用。`);return {narrative:`${u.name}升级成功`,gain:{hope:5}};}
  function supply(s,type){const error=blocked(s);if(error)return {error};const items={stoke:{cost:{wood:3},gain:{warmth:24},full:s.warmth===100},eat:{cost:{food:2},gain:{health:6,warmth:6,hope:5},full:s.health===100&&s.warmth===100&&s.hope===100},heal:{cost:{meds:1},gain:{health:35},full:s.health===100}};const a=items[type];if(!a)return {error:'未知行动。'};if(a.full)return {error:'状态已经很好，先留着物资吧。'};if(!afford(s,a.cost))return {error:'所需物资不足。'};pay(s,a.cost);apply(s,a.gain);return {gain:a.gain,narrative:{stoke:'炉火重新亮起来。',eat:'热食吃完了，身体状态有所恢复。',heal:'伤口处理好了。你可以继续前行。'}[type]};}
  function nightCost(s){return {wood:Math.max(2,5+Math.floor((s.day-1)/3)-s.levels.stove),food:3+(s.companion?1:0)};}
  function rest(s){const error=blocked(s);if(error)return {error};const costs=nightCost(s),fuel=Math.min(costs.wood,s.wood),food=Math.min(costs.food,s.food);s.wood-=fuel;s.food-=food;const fed=food===costs.food,warm=fuel===costs.wood;const gain={warmth:warm?20+s.levels.stove*5+s.levels.walls*4:-25,health:(fed?10:-18)+(warm?0:-15),hope:fed&&warm?5:-12,food:s.levels.trap*3,wood:s.companion&&s.crewRole==='camp'?4:0};apply(s,gain);if(s.warmth<=0)apply(s,{health:-15});s.day++;s.ap=6;s.visits={};s.traded=[];clamp(s);const narrative=warm&&fed?'燃料与口粮够用。夜间没有失温，体力已恢复。':'燃料或口粮不足。夜间受冻、挨饿，身体状态下降。';log(s,narrative);return {narrative,gain,costs,previousDay:s.day-1};}


  function beginRun(s,id,approach='normal',entryId){
    const error=blocked(s);if(error)return {error};const l=locations.find(x=>x.id===id);
    if(!l||s.day<l.unlock)return {error:'这里的道路尚未开放。'};
    if(!['normal','careful','bold'].includes(approach))return {error:'搜寻策略无效。'};
    if(s.ap<=0)return {error:'今天的行动已用尽。'};
    if((s.visits[id]||0)>=3)return {error:'这里今天已搜寻三次，明天再来。'};
    random(s);const run=A.create({seed:s.seed,location:l,entryId,day:s.day,approach,health:s.health,warmth:Math.max(0,s.warmth-Math.ceil(coldCost(s,l,approach)/2)),meds:s.meds,gear:s.gear,levels:s.levels});
    if(!A.valid(run))return {error:'场景暂时无法载入，请稍后再试。'};
    s.ap--;s.visits[id]=(s.visits[id]||0)+1;run.locationId=l.id;run.locationName=l.name;run.approach=approach;s.run=run;
    log(s,`前往${l.name}。本次选择${approach==='careful'?'稳妥':approach==='bold'?'深入':'标准'}搜寻，物资需撤离后入库。`);
    return {narrative:'已进入搜刮区域',run};
  }
  function finishRun(s,evacuated){
    const run=s.run;if(!run)return {error:'当前没有外出行程。'};
    if(evacuated&&!A.canExtract(run))return {error:'请在撤离圈内连续停留 5 秒。'};
    const healthy=run.status!=='dead'&&run.player.health>0;
    s.health=Math.max(0,Math.min(100,Math.floor(run.player.health)));s.warmth=Math.max(0,Math.min(100,Math.floor(run.player.warmth)));s.meds-=Math.max(0,Math.min(999,s.meds)-run.player.meds);
    const gain={};const hasLoot=A.weight(run)>0;
    if(evacuated&&healthy){for(const k of ['wood','food','parts','meds'])if(run.loot[k]>0)gain[k]=run.loot[k];if(hasLoot){s.expeditions++;s.kills+=run.kills;
      if(s.companion&&s.crewRole==='scout')gain.parts=(gain.parts||0)+1;
      if(s.gear.pack){gain.food=(gain.food||0)+2;gain.parts=(gain.parts||0)+1;}
      if(s.expeditions%3===0){gain.wood=(gain.wood||0)+3;gain.food=(gain.food||0)+2;}
      if(s.hope>=75){const l=locations.find(x=>x.id===run.locationId);if(l){const k=Object.keys(l.base)[0];gain[k]=(gain[k]||0)+2;}}gain.hope=2;
    }}
    s.run=null;apply(s,gain);clamp(s);
    const narrative=!healthy?'你没能从这片区域回来。':!evacuated?'你放下背包，撤回了营地。受伤和消耗已保留。':hasLoot?`从${run.locationName}撤离，带回 ${gainText(gain)}。`:'空包撤离。没有获得搜寻进度或阶段奖励。';
    log(s,narrative);
    if(!s.outcome&&evacuated&&healthy&&hasLoot){if(s.expeditions===3&&!s.rescueSeen){s.pending=0;s.rescueSeen=true;}else if(s.expeditions%2===0){if(!s.eventBag.length)s.eventBag=Array.from({length:events.length-1},(_,i)=>i+1);const n=Math.floor(random(s)*s.eventBag.length);s.pending=s.eventBag.splice(n,1)[0];}}
    return {narrative,gain,extracted:evacuated&&healthy,streak:evacuated&&healthy&&hasLoot&&s.expeditions%3===0,event:s.pending!==null,kills:run.kills};
  }
  function coldCost(s,l,approach='normal'){const base=Math.max(2,l.cold+s.day-1-s.levels.walls*2-(s.gear.coat?4:0)-(s.gear.boots?2:0));return approach==='careful'?Math.max(1,Math.ceil(base*.6)):approach==='bold'?base+4:base;}
  function migrate(s){if(!s||s.version!==VERSION)return s;const defaults={gear:{axe:false,coat:false,boots:false,pack:false,spear:false,crossbow:false},run:null,kills:0,claimed:[],traded:[],tradeCount:0,crewRole:'scout'};for(const [k,v]of Object.entries(defaults))if(s[k]===undefined)s[k]=v;if(s.gear&&typeof s.gear==='object'){if(s.gear.spear===undefined)s.gear.spear=false;if(s.gear.crossbow===undefined)s.gear.crossbow=false;}if(s.run!==null)s.run=A.upgrade(s.run);if(s.run!==null&&!A.valid(s.run)){s.run=null;s.recoveredRun=true;}return s;}
  function craft(s,id){const error=blocked(s);if(error)return {error};const r=recipes.find(x=>x.id===id);if(!r)return {error:'没有这张配方。'};if(s.ap<=0)return {error:'制作需要 1 次行动，明天再来。'};if(r.gear&&s.gear[id])return {error:'这件装备已经制好了。'};if(!afford(s,r.cost))return {error:'材料不足。'};pay(s,r.cost);s.ap--;if(r.gear)s.gear[id]=true;apply(s,r.gain||{hope:3});log(s,`制成${r.name}。${r.desc}`);return {narrative:`${r.name}已制成`,gain:r.gain||{hope:3},crafted:id};}
  function offers(s){return [0,1,2].map(i=>trades[((s.day-2)*2+i+trades.length*2)%trades.length]);}
  function trade(s,id){const error=blocked(s);if(error)return {error};if(s.day<2)return {error:'商队第 2 天抵达。'};const t=offers(s).find(x=>x.id===id);if(!t)return {error:'今天没有这笔交换。'};if(s.traded.includes(id))return {error:'这批物资今天已换完。'};if(!afford(s,t.cost))return {error:'交换所需物资不足。'};pay(s,t.cost);apply(s,t.gain);s.traded.push(id);s.tradeCount++;log(s,`与商队交换：付出 ${costText(t.cost)}，获得 ${gainText(t.gain)}。`);return {narrative:'交换完成',gain:t.gain};}
  function progress(s,q){if(['walls','radio'].includes(q.metric))return s.levels[q.metric];if(q.metric==='gear')return Object.values(s.gear).filter(Boolean).length;if(q.metric==='companion')return s.companion?1:0;return s[q.metric];}
  function claim(s,id){const error=blocked(s);if(error)return {error};const q=quests.find(x=>x.id===id);if(!q||s.claimed.includes(id)||progress(s,q)<q.target)return {error:'目标尚未完成，或补给已领取。'};s.claimed.push(id);apply(s,q.reward);log(s,`目标完成：${q.name}。从储备箱领到 ${gainText(q.reward)}。`);return {narrative:'目标补给已领取',gain:q.reward};}
  function assign(s,role){const error=blocked(s);if(error)return {error};if(!s.companion||!['scout','camp'].includes(role))return {error:'林远尚未加入，或分工无效。'};s.crewRole=role;return {narrative:role==='scout'?'林远会协助搜寻，每次额外带回 1 零件。':'林远留守劈柴，每夜额外获得 4 木材。'};}
  function valid(s){if(!s||s.version!==VERSION)return false;for(const k of ['day','ap','wood','food','parts','meds','warmth','health','hope','expeditions','seed'])if(!Number.isSafeInteger(s[k])||s[k]<0||s[k]>10000000000000)return false;if(s.day<1||s.ap>6||['warmth','health','hope'].some(k=>s[k]>100))return false;if(!s.levels||upgrades.some(u=>![0,1,2].includes(s.levels[u.id])))return false;if(!s.visits||typeof s.visits!=='object'||Object.entries(s.visits).some(([k,v])=>!locations.some(l=>l.id===k)||!Number.isInteger(v)||v<0||v>3))return false;if(!Array.isArray(s.logs)||s.logs.length>100||s.logs.some(l=>typeof l.text!=='string'||!Number.isInteger(l.day)))return false;if(!Array.isArray(s.eventBag)||s.eventBag.some(n=>!Number.isInteger(n)||n<1||n>=events.length))return false;if(!s.gear||['axe','coat','boots','pack','spear','crossbow'].some(k=>typeof s.gear[k]!=='boolean')||!Array.isArray(s.claimed)||s.claimed.some(id=>!quests.some(q=>q.id===id))||!Array.isArray(s.traded)||s.traded.some(id=>!trades.some(t=>t.id===id))||!Number.isSafeInteger(s.tradeCount)||s.tradeCount<0||!['scout','camp'].includes(s.crewRole))return false;if(s.run!==null&&(s.pending!==null||s.outcome!==null))return false;if(!Number.isSafeInteger(s.kills)||s.kills<0||(s.run!==null&&!A.valid(s.run)))return false;return [true,false].includes(s.companion)&&[true,false].includes(s.rescueSeen)&&(s.pending===null||(Number.isInteger(s.pending)&&s.pending>=0&&s.pending<events.length))&&[null,'won','lost'].includes(s.outcome);}
  return {VERSION,names,locations,upgrades,events,weather,fresh,explore,choose,upgrade,supply,rest,nightCost,costText,gainText,afford,valid,beginRun,finishRun,recipes,trades,quests,coldCost,migrate,craft,offers,trade,progress,claim,assign};
});
