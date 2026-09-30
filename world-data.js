(function(root,factory){
if(typeof module==='object'&&module.exports)module.exports=factory(require('./world-v3-data.js'));else root.WhiteoutWorld=factory(root.WhiteoutWorldV3);
})(typeof globalThis!=='undefined'?globalThis:this,function(Legacy){
'use strict';
const VERSION=2,WIDTH=3072,HEIGHT=2048,SPAWN={x:770,y:1590},SAFE_RADIUS=145;
const ENTRY_POINTS=[{id:'west-town',name:'河西路口',x:770,y:1590},{id:'forest-road',name:'林场入口',x:854,y:286},{id:'east-city',name:'东城街口',x:2900,y:1240}];
const EXIT={x:430,y:1256,radius:90,name:'河谷集合点'};
const REGIONS=[{id:'forest',name:'西岭林场',x:0,y:0,w:1600,h:1100,tint:'#526d70'},{id:'mountain',name:'黑脊山口',x:1600,y:0,w:1472,h:1100,tint:'#65737e'},{id:'suburb',name:'河西旧镇',x:0,y:1100,w:1900,h:948,tint:'#83968f'},{id:'city',name:'东岸旧城',x:1900,y:1100,w:1172,h:948,tint:'#72838a'}];
const road=(id,width,points)=>({id,width:Math.max(104,width),points:points.map(p=>({x:p[0]*2,y:p[1]*2}))});
const ROADS=[
road('valley-highway',65,[[85,545],[490,545],[790,545],[1000,545],[1490,540]]),
road('western-pass',54,[[215,548],[214,449],[259,341],[319,208],[355,153],[427,143],[548,169],[684,182],[715,239],[770,301],[814,319],[915,318],[987,295],[1050,313],[1130,331],[1220,349],[1307,390],[1446,344]]),
road('ridge-climb',54,[[1450,540],[1411,468],[1330,438],[1270,421],[1307,390]]),
road('town-route',54,[[215,547],[215,628],[289,670],[349,698],[411,759],[440,810],[590,814],[788,813],[994,811],[1045,737],[1040,648],[1090,626],[1225,622],[1450,620]]),
road('west-lanes',45,[[230,677],[335,608],[425,640],[505,708],[586,731],[650,764],[788,813]]),
road('town-cross',45,[[335,608],[358,545]]),
road('city-west',48,[[1001,545],[1040,648],[1100,721],[1108,821],[1064,891]]),
road('city-east',48,[[1184,548],[1208,630],[1228,717],[1249,805],[1310,887],[1418,861],[1440,726],[1450,620],[1450,540]]),
road('city-market',48,[[1040,648],[1208,630],[1450,620]]),road('city-middle',48,[[1100,721],[1228,717],[1440,726]]),road('city-south',48,[[994,811],[1108,821],[1249,805],[1418,861]])];
const poly=(id,kind,points)=>({id,kind,points:points.map(p=>({x:p[0]*2,y:p[1]*2})),blocking:true});
const TERRAIN=[
poly('river','water',[[812,0],[936,0],[931,173],[918,287],[952,359],[925,440],[967,528],[1015,610],[1000,698],[1022,795],[1000,882],[1070,1024],[921,1024],[879,891],[872,770],[850,680],[824,573],[808,491],[839,409],[806,335],[820,221]]),
poly('west-cliff','ridge',[[292,247],[360,216],[435,260],[440,360],[539,412],[573,501],[300,499],[219,433]]),
poly('middle-ridge','ridge',[[720,42],[789,26],[827,207],[798,297],[744,288],[691,214]]),
poly('black-ridge','ridge',[[995,12],[1475,8],[1480,154],[1390,224],[1414,329],[1330,399],[1260,290],[1191,277],[1115,246],[1050,272],[989,219]]),
poly('river-shoulder','ridge',[[946,345],[1051,348],[1181,398],[1170,487],[976,509],[925,465]]),
poly('southern-cliff','ridge',[[625,849],[770,861],[799,972],[690,1019],[582,930]])];
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/l)):0;return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
function inPoly(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
function onRoad(x,y,margin=0){return ROADS.some(r=>r.points.some((p,i)=>i&&segmentDistance(x,y,r.points[i-1],p)<=r.width/2+margin));}
function regionAt(x,y){return REGIONS.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h)||REGIONS[0];}
const BUILDINGS=[];
function building(region,kind,name,px,py,w=170,h=112){BUILDINGS.push({id:'room-'+BUILDINGS.length,region,kind,name,x:px*2-w/2,y:py*2-h,w,h,doorWidth:76,enterable:true,roofHeight:70});}
[[414,115],[540,133],[641,136],[695,479]].forEach((p,i)=>building('forest','cabin',['护林员木屋','旧伐木棚','北坡猎屋','林场仓房'][i],...p));
[[1001,260],[1131,290],[1308,364],[1458,446]].forEach((p,i)=>building('mountain',i===2?'station':'cabin',['山口值班房','巡山队补给屋','废弃索道站','岩壁避风屋'][i],...p,180,116));
[[300,659],[366,710],[465,697],[527,755],[603,760],[730,796]].forEach((p,i)=>building('suburb',i%3===0?'grocery':'house',['旧粮店','空置民房','路班宿舍','河西杂货铺','河岸民房','桥头修理屋'][i],...p));
[[1108,683],[1255,683],[1390,683],[1118,885],[1265,882],[1395,887]].forEach((p,i)=>building('city',i===2?'clinic':i%4===0?'warehouse':'apartment',['东城五金铺','旧公寓','街角诊所','食品仓房','旧维修库','车站宿舍'][i],...p,170,120));
function shell(b){const t=9,g=b.doorWidth||76,d=b.x+b.w/2;return[{x:b.x,y:b.y,w:b.w,h:t},{x:b.x,y:b.y,w:t,h:b.h},{x:b.x+b.w-t,y:b.y,w:t,h:b.h},{x:b.x,y:b.y+b.h-t,w:d-g/2-b.x,h:t},{x:d+g/2,y:b.y+b.h-t,w:b.x+b.w-d-g/2,h:t}];}
const OBSTACLES=BUILDINGS.flatMap(shell),FACILITIES=Legacy.FACILITIES.map(f=>({...f,x:SPAWN.x,y:SPAWN.y}));
function terrainBlocked(x,y,r=0){
if(onRoad(x,y,-r))return false;
if(BUILDINGS.some(b=>x>b.x-40&&x<b.x+b.w+40&&y>b.y-35&&y<b.y+b.h+55))return false;
return TERRAIN.some(t=>inPoly(x,y,t.points)||r>0&&t.points.some((p,i)=>segmentDistance(x,y,p,t.points[(i+1)%t.points.length])<r));
}
function walkable(x,y,r=24){return x>=r&&y>=r&&x<=WIDTH-r&&y<=HEIGHT-r&&!terrainBlocked(x,y,r)&&!OBSTACLES.some(o=>Math.hypot(x-Math.max(o.x,Math.min(x,o.x+o.w)),y-Math.max(o.y,Math.min(y,o.y+o.h)))<r);}
const rewards={forest:{wood:3,parts:1},mountain:{parts:3,wood:1},suburb:{food:2,wood:1},city:{food:2,parts:2}};
const CACHES=[{id:'cache-0',x:850,y:1630,region:'suburb',kind:'supply',name:'路边补给箱',rewards:{wood:3,food:2}}];
BUILDINGS.forEach((b,i)=>{
CACHES.push({id:'room-cache-'+i,x:b.x+b.w*.5,y:b.y+b.h*.49,region:b.region,buildingId:b.id,name:b.kind==='clinic'?'诊室药柜':b.kind==='warehouse'?'维修库工具箱':b.name+'储物箱',rewards:b.kind==='clinic'?{meds:2,food:1}:rewards[b.region]});
CACHES.push({id:'door-cache-'+i,x:b.x+b.w*.5,y:b.y+b.h+42,region:b.region,name:b.name+'门边木料',rewards:{wood:2}});
});
ROADS.forEach((r,i)=>r.points.forEach((p,j)=>{if(j%2===0&&Math.hypot(p.x-SPAWN.x,p.y-SPAWN.y)>220){const area=regionAt(p.x,p.y);CACHES.push({id:'road-cache-'+i+'-'+j,x:p.x,y:p.y,region:area.id,name:area.name+'遗留背包',rewards:rewards[area.id]});}}));
const unique=[];for(const n of CACHES)if(walkable(n.x,n.y,24)&&!unique.some(q=>Math.hypot(q.x-n.x,q.y-n.y)<42))unique.push(n);CACHES.splice(0,CACHES.length,...unique);
const ENEMY_SPAWNS=[];for(const road of ROADS)for(const p of road.points)if(Math.hypot(p.x-SPAWN.x,p.y-SPAWN.y)>340&&walkable(p.x,p.y,24)&&!ENEMY_SPAWNS.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<60))ENEMY_SPAWNS.push({x:p.x,y:p.y,type:regionAt(p.x,p.y).id==='forest'&&ENEMY_SPAWNS.length%4===0?'wolf':'zombie'});
while(ENEMY_SPAWNS.length<44){const p=CACHES[(ENEMY_SPAWNS.length*7)%CACHES.length];ENEMY_SPAWNS.push(Math.hypot(p.x-SPAWN.x,p.y-SPAWN.y)>340?{x:p.x,y:p.y,type:'zombie'}:{...ENEMY_SPAWNS[0]});}
const BASE_POLYGON=[[400,450],[510,410],[510,307],[990,307],[992,455],[1108,450],[1250,633],[1250,748],[1060,801],[614,766],[368,634]].map(p=>({x:p[0],y:p[1]}));
const BASE_OBSTACLES=[{x:565,y:350,w:91,h:34},{x:807,y:366,w:117,h:61},{x:1037,y:354,w:63,h:58},{x:509,y:330,w:49,h:36}];
const BASE_FACILITIES=[{id:'stove',x:542,y:402,name:'铸铁炉'},{id:'workbench',x:860,y:452,name:'工作台'},{id:'radio',x:1073,y:480,name:'求救电台'},{id:'bed',x:687,y:338,name:'床铺'},{id:'gate',x:1190,y:718,name:'基地出口'}];
const BASE={WIDTH:1536,HEIGHT:1024,SPAWN:{x:768,y:623},SAFE_RADIUS:0,REGIONS:[{id:'base',name:'山腰避难所',x:0,y:0,w:1536,h:1024}],ROADS:[],BUILDINGS:[],SCENERY:[],TERRAIN:[],OBSTACLES:BASE_OBSTACLES,FACILITIES:BASE_FACILITIES,WALK_POLYGON:BASE_POLYGON,regionAt:()=>({id:'base',name:'山腰避难所'})};
BASE.walkable=(x,y,r=24)=>inPoly(x,y,BASE_POLYGON)&&!BASE_POLYGON.some((p,i)=>segmentDistance(x,y,p,BASE_POLYGON[(i+1)%BASE_POLYGON.length])<r)&&!BASE_OBSTACLES.some(o=>Math.hypot(x-Math.max(o.x,Math.min(x,o.x+o.w)),y-Math.max(o.y,Math.min(y,o.y+o.h)))<r);
BASE.onRoad=()=>false;
return{VERSION,WIDTH,HEIGHT,SPAWN,ENTRY_POINTS,EXIT,SAFE_RADIUS,REGIONS,ROADS,BUILDINGS,OBSTACLES,SCENERY:[],TERRAIN,CACHES,ENEMY_SPAWNS,FACILITIES,BASE,LEGACY_WORLD:Legacy,regionAt,onRoad,walkable,terrainBlocked,inPoly,segmentDistance,shell};
});
