(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WhiteoutArt=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ACTOR_BOXES=[[134,27,414,483],[159,22,358,491],[97,15,368,484],[159,23,421,470],[133,24,351,474],[2,175,479,448]];
const BUILDING_BOXES=[[40,55,492,460],[6,21,500,469],[36,32,475,464],[23,3,500,419],[17,14,496,442],[15,5,512,465]];
const LOOT_BOXES=[[26,82,501,445],[21,75,495,470],[51,61,485,491],[29,73,490,455],[16,38,495,458],[35,26,485,453]];
const assets={};function asset(name){if(assets[name])return assets[name];assets[name]=new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>{delete assets[name];reject(new Error('场景资源无法加载'));};i.src='assets/'+name;});return assets[name];}
const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
const line=(c,x,y,xx,yy,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();};
function create(run){
const host=typeof window!=='undefined'?window:globalThis,World=host.WhiteoutWorld,Model=host.Expedition;
if(!['base','expedition'].includes(run.mapLayout)){
const Old=host.WhiteoutArtV3||(typeof require==='function'?require('./world-art-v3.js'):null);
if(!Old)throw new Error('旧场景美术未加载');return Old.create(run);
}
const world=Model.mapData(run),base=run.mapLayout==='base';
let plate=null,actors=null,buildings=null,loot=null,disposed=false;const roomLayers=new Map(),roofAlpha=new Map();
const structures=base?[{type:'occluder',x:395,y:26,w:636,h:280,sortY:308,points:[[395,189],[579,31],[1000,189],[1031,256],[422,227]]},{type:'occluder',x:404,y:690,w:710,h:178,sortY:789,points:[[405,736],[603,760],[1064,702],[1112,760],[1034,860],[527,834]]}]:world.BUILDINGS.map(b=>({...b,type:'building',sortY:b.y+b.h}));
const ready=typeof Image==='undefined'?Promise.resolve():Promise.all([asset(base?'refuge-v4.png':'valley-v4.png'),asset('actors-v4.png'),asset('buildings-v4.png'),asset('loot-v4.png')]).then(a=>{if(!disposed)[plate,actors,buildings,loot]=a;});
function sprite(c,img,boxes,index,x,y,height,flip=false,width=null){if(!img)return;const b=boxes[index],sx=(index%3)*512+b[0],sy=Math.floor(index/3)*512+b[1],sw=b[2]-b[0],sh=b[3]-b[1],h=height,w=width||sw/sh*h;c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.drawImage(img,sx,sy,sw,sh,-w/2,-h,w,h);c.restore();}
function indoor(b,p=run.player){return p.x>b.x+8&&p.x<b.x+b.w-8&&p.y>b.y+8&&p.y<b.y+b.h+4;}
function roomCanvas(b){if(roomLayers.has(b.id))return roomLayers.get(b.id);const tile=document.createElement('canvas');tile.width=b.w;tile.height=b.h;const c=tile.getContext('2d');
c.fillStyle='#70533c';c.fillRect(0,0,b.w,b.h);if(plate&&base)c.drawImage(plate,667,331,110,55,0,0,b.w,b.h);
for(let y=0;y<b.h;y+=9){c.fillStyle=y%18?'#94735b':'#806148';c.fillRect(7,y,b.w-14,8);for(let x=0;x<b.w;x+=37)line(c,x+(y%18?12:0),y,x+(y%18?12:0),y+8,'#45393260');}
c.fillStyle='#493d31';c.fillRect(12,12,b.w-24,17);c.fillStyle='#baa07a';for(let x=17;x<b.w-20;x+=18)c.fillRect(x,13,10,10);
c.fillStyle=b.kind==='clinic'?'#9ba69a':'#5e6557';c.fillRect(15,b.h*.35,31,b.h*.38);c.fillStyle='#bbb6a1';c.fillRect(17,b.h*.35+3,27,12);line(c,18,b.h*.35+18,44,b.h*.35+18,'#dad6c3',2);
c.fillStyle='#9b8160';c.fillRect(b.w-45,b.h*.34,29,29);c.fillStyle='#443d32';c.fillRect(b.w-41,b.h*.34+5,21,13);
c.fillStyle='#ad836d44';c.fillRect(b.w*.35,b.h*.56,b.w*.35,b.h*.28);line(c,b.w*.35,b.h*.56,b.w*.7,b.h*.56,'#bd987074',2);
roomLayers.set(b.id,tile);return tile;}
function drawGround(c,bounds){c.fillStyle='#263a45';c.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);if(plate)c.drawImage(plate,0,0,run.width,run.height);
if(!base){for(const b of world.BUILDINGS){if(indoor(b)){c.drawImage(roomCanvas(b),b.x,b.y,b.w,b.h);c.fillStyle='#dfae6916';c.fillRect(b.x+9,b.y+9,b.w-18,b.h-18);}}}
if(base){const t=typeof performance==='undefined'?0:performance.now();const g=c.createRadialGradient(541,367,0,541,367,110);g.addColorStop(0,'rgba(255,166,75,'+(.1+Math.sin(t*.003)*.018)+')');g.addColorStop(1,'#ffad5700');c.fillStyle=g;c.fillRect(431,270,220,220);}
}
function drawStructure(c,s){
if(s.type==='occluder'){if(!plate)return;c.save();c.beginPath();s.points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.clip();c.drawImage(plate,0,0,run.width,run.height);c.restore();return;}
if(s.type!=='building')return;
const inside=indoor(s),prior=roofAlpha.has(s.id)?roofAlpha.get(s.id):1,target=inside?0:1,alpha=Math.abs(target-prior)<.015?target:prior+(target-prior)*.18;roofAlpha.set(s.id,alpha);
if(alpha<1){c.save();c.globalAlpha=1-alpha;if(!inside)c.drawImage(roomCanvas(s),s.x,s.y,s.w,s.h);
c.fillStyle='#403c35';c.fillRect(s.x,s.y-22,s.w,27);c.fillStyle='#977c60';c.fillRect(s.x+6,s.y-17,s.w-12,17);line(c,s.x,s.y,s.x+s.w,s.y,'#c8b396',2);line(c,s.x,s.y,s.x,s.y+s.h,'#7b6751',7);line(c,s.x+s.w,s.y,s.x+s.w,s.y+s.h,'#574e45',7);
const glow=c.createRadialGradient(s.x+s.w*.7,s.y+15,1,s.x+s.w*.7,s.y+15,100);glow.addColorStop(0,'#d7a86629');glow.addColorStop(1,'#d7a86600');c.fillStyle=glow;c.fillRect(s.x,s.y,s.w,s.h);c.restore();}
if(alpha>.01){const idx=s.kind==='cabin'||s.kind==='house'?0:s.kind==='apartment'?1:s.kind==='clinic'?2:s.kind==='warehouse'?3:s.kind==='station'?5:4;
ellipse(c,s.x+s.w*.55,s.y+s.h+2,s.w*.55,14,'#1527343f');c.save();c.globalAlpha=alpha;if(host.WhiteoutVolumeBuildings)host.WhiteoutVolumeBuildings.draw(c,s,1,typeof performance==='undefined'?0:performance.now());sprite(c,buildings,BUILDING_BOXES,idx,s.x+s.w/2,s.y+s.h+3,s.h*1.83,false,s.w*1.17);c.restore();}
}
function drawActor(c,body,kind,time){if(host.WhiteoutVolumeActors&&kind!=='wolf'){host.WhiteoutVolumeActors.draw(c,body,kind,time,base);return;}if(!actors)return;const player=kind==='player',wolf=kind==='wolf',a=body.angle||0,side=Math.abs(Math.cos(a))>.65,back=Math.sin(a)<-.4;
let index=player?(side?1:back?2:0):(wolf?5:side?4:3);let h=base?88:wolf?36:67;
c.save();c.translate(body.x,body.y);ellipse(c,2,1,wolf?19:12,wolf?5:4,'#152d465f');
if(body.health<=0){c.globalAlpha=.72;c.rotate(Math.PI/2);sprite(c,actors,ACTOR_BOXES,index,-h*.4,12,h*.85);c.restore();return;}
const sway=body.moving?Math.sin((time||0)*.012)*.012:Math.sin((time||0)*.002)*.003;
c.transform(1,0,sway,1,0,0);sprite(c,actors,ACTOR_BOXES,index,0,1,h,side&&Math.cos(a)<0);c.restore();
}
function drawNode(c,n,time,near){if(!loot)return;if(n.buildingId){const b=world.BUILDINGS.find(b=>b.id===n.buildingId);if(b&&!indoor(b))return;}
const wood=n.kind==='woodpile',index=n.id.startsWith('drop-')?4:n.remaining===0?5:wood?0:n.kind==='supply'?1:n.kind==='medical'?3:2;
ellipse(c,n.x+1,n.y+1,wood?22:15,5,'#17344a50');const effect=run.effects.find(e=>e.type==='open'&&e.nodeId===n.id),progress=effect?Math.min(1,(effect.duration-effect.time)/.8):n.opened||n.remaining===0?1:0;
c.save();c.translate(n.x,n.y);const shake=effect?Math.sin(progress*18)*(1-progress)*2:0;c.translate(shake,0);sprite(c,loot,LOOT_BOXES,index,0,1,wood?29:31);
if(effect&&index!==5){c.save();c.translate(0,-18);c.rotate(-progress*.75);c.fillStyle=wood?'#d4c2a0':index===3?'#c5c5b5':'#a18b6b';c.fillRect(-13,-3,26,5);line(c,-12,-3,12,-3,'#e1d8c4',1);c.restore();for(let i=0;i<5;i++)ellipse(c,(i-2)*7*progress,-20-progress*(10+i*3),1.3,1.3,'#e3e8df'+Math.floor((1-progress)*180).toString(16).padStart(2,'0'));}
if(near&&n.remaining>0){c.strokeStyle='#f7edd0a0';c.lineWidth=1;c.setLineDash([2,5]);c.beginPath();c.ellipse(0,2,23,8,0,0,Math.PI*2);c.stroke();c.setLineDash([]);}c.restore();
}
function drawOverview(c,w,h){c.fillStyle='#263b48';c.fillRect(0,0,w,h);if(plate)c.drawImage(plate,0,0,w,h);if(!base){c.save();c.scale(w/run.width,h/run.height);for(const b of world.BUILDINGS){const i=b.kind==='cabin'||b.kind==='house'?0:b.kind==='apartment'?1:b.kind==='clinic'?2:b.kind==='warehouse'?3:b.kind==='station'?5:4;sprite(c,buildings,BUILDING_BOXES,i,b.x+b.w/2,b.y+b.h,b.h*1.83,false,b.w*1.17);}c.restore();}}
return{structures,ready,drawGround,drawStructure,drawActor,drawNode,drawOverview,isIndoor:()=>base?run.player.y<450:world.BUILDINGS.some(b=>indoor(b)),dispose(){disposed=true;roomLayers.clear();roofAlpha.clear();}};
}
return{create};
});
