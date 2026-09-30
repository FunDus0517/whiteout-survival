(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WhiteoutArtV3 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Every object uses a ground coordinate, a north-west light and the same oblique camera.
  const TILE = 512;
  const COLORS = { forest:'#acbfc4', mountain:'#b8c5ca', suburb:'#b2c3c7', city:'#a6bac0' };
  const hash = (x,y,s=0) => { const n=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return n-Math.floor(n); };
  const ellipse = (c,x,y,rx,ry,color) => { c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);c.fillStyle=color;c.fill(); };
  const polygon = (c,points,color,stroke) => { c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();} };
  const line = (c,x1,y1,x2,y2,color,width=1) => { c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke(); };
  function shadow(c,x,y,rx,ry,alpha=.23) {
    c.save();c.translate(x+3,y+2);c.scale(1,ry/rx);
    const g=c.createRadialGradient(0,0,1,0,0,rx);g.addColorStop(0,`rgba(33,56,64,${alpha})`);g.addColorStop(1,'rgba(33,56,64,0)');
    c.fillStyle=g;c.beginPath();c.arc(0,0,rx,0,Math.PI*2);c.fill();c.restore();
  }
  function create(run) {
    const sharedWorld=window.WhiteoutWorldV3 || window.WhiteoutWorld.LEGACY_WORLD;
    if(!sharedWorld)throw new Error('世界地形尚未加载');
    // An unfinished old expedition keeps its exact walls, nodes and rewards, with refreshed art.
    const oldRun=run.mapLayout!=='world';
    const oldBounds=run.mapLayout==='legacy'?{x:384,y:256,w:1536,h:1024}:{x:0,y:0,w:run.width,h:run.height};
    const oldRegion={id:'forest',name:'旧林业站',x:0,y:0,w:run.width,h:run.height};
    const oldWalls=run.obstacles||(window.Expedition&&(run.mapLayout==='legacy'?window.Expedition.LEGACY_OBSTACLES:window.Expedition.V2_OBSTACLES))||[];
    const oldBuildings=oldWalls.map((b,i)=>Object.assign({id:'old-building-'+i,kind:i%2?'warehouse':'cabin',region:'forest',roofHeight:48},b));
    const oldScenery=[];
    if(oldRun){for(let i=0;i<115;i++){
      const x=oldBounds.x+55+hash(i,12)*Math.max(1,oldBounds.w-110),y=oldBounds.y+55+hash(36,i)*Math.max(1,oldBounds.h-110);
      if(oldBuildings.some(b=>x>b.x-80&&x<b.x+b.w+80&&y>b.y-80&&y<b.y+b.h+80)||(run.nodes||[]).some(n=>Math.hypot(n.x-x,n.y-y)<80)||Math.hypot(x-run.extraction.x,y-run.extraction.y)<170)continue;
      oldScenery.push({id:'old-tree-'+i,x,y,kind:i%4?'pine':'rock',size:35+hash(i,91)*30,region:'forest'});
    }}
    const world=oldRun?{SPAWN:run.extraction,REGIONS:[oldRegion],BUILDINGS:oldBuildings,SCENERY:oldScenery,FACILITIES:[],
      ROADS:[{width:70,points:[{x:run.extraction.x,y:run.extraction.y},{x:oldBounds.x+80,y:oldBounds.y+oldBounds.h-70},{x:oldBounds.x+oldBounds.w-60,y:oldBounds.y+oldBounds.h-70}]}],regionAt:()=>oldRegion}:sharedWorld;
    const cache=new Map();
    const structures=(world.BUILDINGS||[]).map(b=>Object.assign({type:'building',sortY:b.y+b.h},b))
      .concat((world.SCENERY||[]).map(s=>Object.assign({type:'scenery',sortY:s.y},s)))
      .concat((world.FACILITIES||[]).map(f=>Object.assign({type:'facility',sortY:f.y},f)));
    function region(x,y){return world.regionAt(x,y)||{id:'suburb',name:'郊区'};}
    function boundsFrom(c){const t=c.getTransform();return{x:-t.e/t.a,y:-t.f/t.d,w:c.canvas.width/t.a,h:c.canvas.height/t.d};}
    function groundTile(tx,ty){
      const key=tx+','+ty;
      if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
      const tile=document.createElement('canvas');tile.width=tile.height=TILE;const c=tile.getContext('2d'),x=tx*TILE,y=ty*TILE;
      c.translate(-x,-y);
      const r=region(x+256,y+256),g=c.createLinearGradient(0,0,run.width,run.height);
      g.addColorStop(0,'#becfce');g.addColorStop(1,'#9fb7c1');c.fillStyle=g;c.fillRect(x,y,512,512);
      // Global gradients continue across chunk boundaries; no square texture seams.
      for(const area of world.REGIONS||[]){
        const tint=c.createRadialGradient(area.x+area.w*.5,area.y+area.h*.5,100,area.x+area.w*.5,area.y+area.h*.5,area.w*.8);
        tint.addColorStop(0,area.id==='forest'?'#577e691d':area.id==='mountain'?'#5e788d20':area.id==='city'?'#5774821c':'#c2c7a81b');tint.addColorStop(1,'#839c9400');c.fillStyle=tint;c.fillRect(x,y,512,512);
      }
      // Snow drifts are world-seeded, so tile edges and saved games never rearrange.
      for(let i=0;i<165;i++){
        const px=x+hash(tx,ty,i)*512,py=y+hash(ty,tx,i+800)*512,sz=hash(tx+2,ty-1,i+45);
        ellipse(c,px,py,9+sz*39,2+sz*8,`rgba(231,240,239,${.025+sz*.05})`);
        if(i%3===0)line(c,px-7,py+5,px+15,py+1,'#6c8a9512',.7);
        if(i%7===0)polygon(c,[[px,py],[px+4,py-2],[px+7,py+1],[px+2,py+2]],'#6a879528');
      }
      if(r.id==='mountain'){
        for(const peak of world.SCENERY||[]){
          if(peak.kind!=='rock'||peak.size<80||Math.abs(peak.x-(x+256))>670||Math.abs(peak.y-(y+256))>420)continue;
          const hillside=c.createRadialGradient(peak.x-35,peak.y-40,20,peak.x,peak.y,370);hillside.addColorStop(0,'#e8eee02b');hillside.addColorStop(.6,'#60849920');hillside.addColorStop(1,'#60849900');c.fillStyle=hillside;c.fillRect(peak.x-370,peak.y-370,740,740);
          for(let j=0;j<6;j++){
            c.beginPath();c.moveTo(peak.x-300+j*15,peak.y+45+j*16);c.bezierCurveTo(peak.x-90,peak.y-60+j*8,peak.x+110,peak.y-50+j*15,peak.x+310-j*12,peak.y+5+j*22);
            c.strokeStyle=j%2?'#597b8b18':'#e6eddf54';c.lineWidth=j%2?6:2;c.stroke();
          }
        }
        for(let i=0;i<7;i++){
          const px=x+hash(tx,ty,i+190)*512,py=y+hash(ty,tx,i+310)*512;
          c.beginPath();c.moveTo(px-160,py+35);c.bezierCurveTo(px-80,py-26,px+50,py-33,px+180,py-15);c.strokeStyle='#57768514';c.lineWidth=6+i;c.stroke();
          c.strokeStyle='#eaf0eb22';c.lineWidth=2;c.stroke();
        }
      }
      for(const b of world.BUILDINGS||[]){
        if(b.x+b.w+65<x||b.x-65>x+512||b.y+b.h+45<y||b.y-40>y+512)continue;
        c.fillStyle=b.region==='city'?'#859da535':'#839b9e18';c.fillRect(b.x-30,b.y-22,b.w+60,b.h+58);
        for(let i=0;i<5;i++)line(c,b.x+b.w*.6-6+i*3,b.y+b.h+8,b.x+b.w*.6-4+i*3,b.y+b.h+32,'#708b9660',1);
      }
      for(const road of world.ROADS||[]){
        const points=road.points||[];if(points.length<2)continue;
        const draw=(width,color,offset=0)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y+offset):c.moveTo(p.x,p.y+offset));c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.strokeStyle=color;c.stroke();};
        draw(road.width+26,'#d4dfde8f',3);draw(road.width+11,'#738e9930',4);draw(road.width,'#738a9285');draw(road.width-8,'#899fa6');
        // Packed snow, wheel tracks, and a narrow strip of untouched snow between lanes.
        draw(Math.max(4,road.width*.16),'#c2d0d16b',-road.width*.23);draw(Math.max(3,road.width*.14),'#627e8960',road.width*.24);
        draw(2,'#dde5df60',-road.width*.43);draw(2,'#dbe5e040',road.width*.43);
      }
      const camp=world.SPAWN;
      if(x<camp.x+330&&x+512>camp.x-330&&y<camp.y+280&&y+512>camp.y-280){
        polygon(c,[[camp.x-225,camp.y-155],[camp.x-130,camp.y-217],[camp.x+130,camp.y-177],[camp.x+230,camp.y-91],[camp.x+209,camp.y+122],[camp.x+67,camp.y+168],[camp.x-203,camp.y+153],[camp.x-262,camp.y+37]],'#b1bbae35');
        for(const f of world.FACILITIES||[]){
          line(c,camp.x,camp.y,f.x,f.y,'#70878037',13);line(c,camp.x,camp.y,f.x,f.y,'#d3d9c554',3);
        }
        // Physical perimeter markers rather than a floating extraction circle.
        for(let i=0;i<12;i++){const a=i/12*Math.PI*2,px=camp.x+245*Math.cos(a),py=camp.y+160*Math.sin(a);ellipse(c,px,py,4,2,'#48616d42');line(c,px,py,px,py-8,'#637a7c',2);}
      }
      c.fillStyle='#eef4ed18';
      for(let i=0;i<300;i++)c.fillRect(x+hash(tx,ty,i+900)*512,y+hash(ty,tx,i+1100)*512,1,1);
      cache.set(key,tile);if(cache.size>24)cache.delete(cache.keys().next().value);
      return tile;
    }
    function drawGround(c,bounds){
      const b=bounds||boundsFrom(c);c.fillStyle='#9caeb8';c.fillRect(b.x,b.y,b.w,b.h);
      const minX=Math.max(0,Math.floor(b.x/TILE)),maxX=Math.min(Math.ceil(run.width/TILE)-1,Math.floor((b.x+b.w)/TILE));
      const minY=Math.max(0,Math.floor(b.y/TILE)),maxY=Math.min(Math.ceil(run.height/TILE)-1,Math.floor((b.y+b.h)/TILE));
      for(let ty=minY;ty<=maxY;ty++)for(let tx=minX;tx<=maxX;tx++)c.drawImage(groundTile(tx,ty),tx*TILE,ty*TILE);
    }
    function building(c,b){
      const x=b.x,y=b.y,w=b.w,h=b.h,z=Math.min(100,Math.max(b.kind==='apartment'?78:48,b.roofHeight||h*.28));
      const city=b.region==='city',shed=b.kind==='warehouse'||b.kind==='workshop',metal=shed||city;
      const wall=city?'#647880':shed?'#536a72':'#756f63',wallLight=city?'#8da09f':'#929282';
      const rx=-z*.18,ry=-z;
      // Cast shadow shares the terrain light direction; the front wall starts at its collision footprint.
      polygon(c,[[x+w,y],[x+w+z*.55,y+z*.33],[x+w+z*.55,y+h+z*.4],[x+z*.55,y+h+z*.4],[x,y+h],[x+w,y+h]],'#3b576727');
      polygon(c,[[x,y+h],[x+w,y+h],[x+w+rx,y+h+ry],[x+rx,y+h+ry]],wall,'#465e6366');
      polygon(c,[[x+w,y],[x+w,y+h],[x+w+rx,y+h+ry],[x+w+rx,y+ry]],'#455d69');
      if(!metal){for(let iy=y+h-z+6;iy<y+h-3;iy+=7)line(c,x+3,iy,x+w-3,iy,'#343b3629');}
      const doorX=x+w*.56,doorW=26;
      c.fillStyle='#344b53';c.fillRect(doorX,y+h-42,doorW,42);c.fillStyle='#5e6c67';c.fillRect(doorX+3,y+h-38,doorW-6,38);
      line(c,doorX+doorW-5,y+h-13,doorX+doorW-5,y+h-11,'#c4b899',2);
      polygon(c,[[doorX-5,y+h+1],[doorX+doorW+7,y+h+1],[doorX+doorW+12,y+h+6],[doorX-9,y+h+6]],'#d0dcda');
      const n=Math.max(1,Math.floor(w/64));
      for(let i=0;i<n;i++){
        const wx=x+17+i*(w-30)/n;if(wx+22>doorX&&wx<doorX+doorW)continue;
        c.fillStyle='#435c64';c.fillRect(wx,y+h-40,24,20);c.fillStyle=b.kind==='cabin'||b.kind==='shelter'?'#c6b084':'#9aacac';c.fillRect(wx+2,y+h-38,20,16);
        line(c,wx+12,y+h-38,wx+12,y+h-22,'#556870',1);line(c,wx+1,y+h-20,wx+26,y+h-20,'#d8e0d9',2);
      }
      const top=[[x+rx-5,y+ry-4],[x+w+rx+5,y+ry-4],[x+w+rx+5,y+h+ry+4],[x+rx-5,y+h+ry+4]];
      polygon(c,top,metal?'#81979c':'#8f9a98','#59768166');
      if(metal){for(let ix=x+rx+12;ix<x+w+rx;ix+=17)line(c,ix,y+ry,ix,y+h+ry,'#4b6b7b39',1.2);}
      // Roof snow has irregular shallow edges, rather than a separate white sticker.
      polygon(c,[[x+rx-5,y+ry-4],[x+w+rx+5,y+ry-4],[x+w+rx+5,y+h+ry-8],[x+w*.84+rx,y+h+ry-3],[x+w*.57+rx,y+h+ry-12],[x+w*.32+rx,y+h+ry-4],[x+rx-5,y+h+ry-7]],'#d4dfdc');
      if(!metal){
        const ridgeX=x+w*.5+rx;
        polygon(c,[[x+rx-5,y+ry-4],[ridgeX,y+ry-20],[ridgeX,y+h+ry-15],[x+rx-5,y+h+ry+3]],'#dee7dd');
        polygon(c,[[ridgeX,y+ry-20],[x+w+rx+5,y+ry-4],[x+w+rx+5,y+h+ry-5],[ridgeX,y+h+ry-15]],'#b9cecc');
        polygon(c,[[ridgeX,y+h+ry-15],[x+w+rx+5,y+h+ry-5],[x+w*.8+rx,y+h+ry+2],[x+w*.62+rx,y+h+ry-4]],'#829d9d');
        line(c,ridgeX,y+ry-20,ridgeX,y+h+ry-15,'#eef0de',2);
        polygon(c,[[x+rx-5,y+h+ry+4],[ridgeX,y+h+ry-15],[x+w+rx+5,y+h+ry+4]],wallLight);
        ellipse(c,ridgeX,y+h+ry-4,4,3,'#5e7475');
      }
      const roofTint=c.createLinearGradient(x,y+ry,x,y+h+ry);roofTint.addColorStop(0,'#f3f5e64a');roofTint.addColorStop(.55,'#d8e3dd0d');roofTint.addColorStop(1,'#6b93a42b');c.fillStyle=roofTint;c.fillRect(x+rx,y+ry,w,h-9);
      polygon(c,[[x+rx+7,y+h+ry-27],[x+w*.3+rx,y+h+ry-22],[x+w*.47+rx,y+h+ry-12],[x+w*.24+rx,y+h+ry-7],[x+rx+7,y+h+ry-8]],'#72949e44');
      for(let i=0;i<Math.floor(w*h/1100);i++){
        const px=x+rx+8+hash(b.x,b.y,i+8)*(w-16),py=y+ry+7+hash(b.y,b.x,i+14)*(h-20);
        ellipse(c,px,py,4+hash(b.x,b.y,i)*12,1,'#9ab5bb26');line(c,px-3,py-1,px+8,py-2,'#eef1e74a',.7);
      }
      line(c,x+rx-5,y+ry-4,x+w+rx+5,y+ry-4,'#ecf1e8',2);
      if(metal){line(c,x+rx,y+h*.5+ry,x+w+rx,y+h*.5+ry,'#e3e9df',2);line(c,x+rx,y+h*.5+ry+5,x+w+rx,y+h*.5+ry+5,'#829b9f55',1);}
      const chimneyX=x+w*.23+rx,chimneyY=y+h*.3+ry;
      c.fillStyle='#667c83';c.fillRect(chimneyX,chimneyY-10,10,17);c.fillStyle='#d4ddd6';c.fillRect(chimneyX-2,chimneyY-11,14,3);
      if(b.kind==='shelter'||b.kind==='cabin'){
        ellipse(c,chimneyX+5,chimneyY-21,6,8,'#e1e8e331');ellipse(c,chimneyX+9,chimneyY-34,10,8,'#e1e8e325');
      }
      for(let i=0;i<Math.floor(w/22);i++){const ix=x+hash(b.x,b.y,i)*w;polygon(c,[[ix,y+h+ry+3],[ix+2,y+h+ry+3],[ix+1,y+h+ry+8+hash(b.y,b.x,i)*6]],'#dce6e38f');}
      if(b.kind==='clinic'){
        c.fillStyle='#9c7462';c.fillRect(x+w-29,y+h-38,6,22);c.fillRect(x+w-37,y+h-30,22,6);
      }else if(city&&b.kind!=='apartment'){
        c.fillStyle='#4b6c72';c.fillRect(x+10,y+h-47,w*.38,10);line(c,x+15,y+h-43,x+Math.min(w*.34,60),y+h-43,'#abbcb0',1.5);
      }
      // Exterior life gives each block a readable silhouette without hidden collision walls.
      if(b.kind==='house'||b.kind==='cabin'){
        const px=x+w-12,py=y+h+14;shadow(c,px,py,12,4,.18);ellipse(c,px,py-5,7,5,'#758c75');ellipse(c,px-4,py-10,8,5,'#9aac90');ellipse(c,px-7,py-12,5,2,'#d7e1cd');
        const seed=hash(b.x,b.y);if(seed>.5){line(c,x+8,y+h+5,x+8,y+h+17,'#82907a',3);line(c,x+8,y+h+17,x+44,y+h+17,'#9aab91',3);line(c,x+44,y+h+17,x+44,y+h+8,'#82907a',3);line(c,x+8,y+h+15,x+44,y+h+15,'#d8e0cb',1);}
      }
      if(b.kind==='shelter'){
        const glow=c.createRadialGradient(x+w*.3,y+h+1,1,x+w*.3,y+h+1,60);glow.addColorStop(0,'#d1a46024');glow.addColorStop(1,'#d1a46000');c.fillStyle=glow;c.fillRect(x+w*.3-60,y+h-55,120,90);
        line(c,x+4,y+h+8,x+w+4,y+h+8,'#928d732b',4);
      }
    }
    function pine(c,s){
      const sz=s.size||60,h=sz*1.25,w=sz*.47,x=s.x,y=s.y;
      polygon(c,[[x-6,y],[x+w*.55,y+11],[x+w*1.4,y+h*.42],[x+w*.9,y+h*.43],[x-8,y+3]],'#45657420');
      line(c,x,y-18,x,y,'#5b655c',Math.max(3,sz*.055));ellipse(c,x,y+1,7,2,'#dce5df');
      for(let i=0;i<4;i++){
        const by=y-12-i*h*.18,ww=w*(1-i*.16),tip=by-h*.39;
        polygon(c,[[x,tip],[x+ww,by],[x+ww*.46,by+3],[x+ww*.15,by-1],[x,by+4],[x-ww*.54,by+2],[x-ww,by-1]],i%2?'#4d7272':'#42696b');
        polygon(c,[[x-1,tip],[x+ww*.76,by-7],[x+ww*.25,by-3],[x-ww*.13,by-6],[x-ww*.78,by-5]],i%2?'#bacfca':'#c8d9d0');
        line(c,x,tip+2,x-ww*.73,by-7,'#e1e9db9a',1.5);
      }
    }
    function birch(c,s){
      const z=s.size||55,x=s.x,y=s.y;shadow(c,x,y,18,6,.2);
      line(c,x,y,x-5,y-z,'#d4dcd6',4);line(c,x-5,y-z*.7,x-20,y-z*.96,'#8a9f9d',2);line(c,x-5,y-z*.6,x+15,y-z*.84,'#829997',2);
      for(let i=0;i<4;i++)line(c,x-3-i*.45,y-6-i*11,x+1-i*.45,y-7-i*11,'#627e82',1.8);
      for(let i=0;i<7;i++){const a=i*2.4;line(c,x-5,y-z*.75,x-5+Math.cos(a)*24,y-z*.8+Math.sin(a)*17,'#647f8375',1);}
      ellipse(c,x,y+1,7,2,'#e1e8df');
    }
    function rock(c,s){
      const z=s.size||28,x=s.x,y=s.y;shadow(c,x,y,z*.65,z*.22,.23);
      polygon(c,[[x-z*.7,y-4],[x-z*.54,y-z*.42],[x-z*.06,y-z*.66],[x+z*.51,y-z*.48],[x+z*.7,y-5],[x+z*.3,y+4],[x-z*.3,y+5]],'#718b97','#617d8644');
      polygon(c,[[x-z*.7,y-4],[x-z*.54,y-z*.42],[x-z*.06,y-z*.66],[x+z*.51,y-z*.48],[x+z*.26,y-z*.24],[x-z*.06,y-z*.19],[x-z*.5,y-z*.11]],'#d0dedb');
      polygon(c,[[x-z*.06,y-z*.19],[x+z*.26,y-z*.24],[x+z*.7,y-5],[x+z*.3,y+4]],'#617e89');ellipse(c,x-3,y+4,z*.54,2,'#d6e1da');
    }
    function car(c,s){
      c.save();c.translate(s.x,s.y);const z=(s.size||48)/48;
      c.scale(z,z);shadow(c,0,1,31,10,.28);c.fillStyle='#354f5d';c.fillRect(-25,-9,6,14);c.fillRect(20,-9,6,14);
      polygon(c,[[-24,1],[24,1],[29,-6],[25,-20],[-21,-20],[-28,-11]],s.region==='city'?'#7c8984':'#826d59','#4f687166');
      polygon(c,[[-15,-19],[14,-19],[18,-12],[-19,-12]],'#557381');polygon(c,[[-17,-23],[14,-23],[14,-19],[-15,-19]],'#c9d8d4');
      polygon(c,[[-28,-11],[-19,-12],[18,-12],[26,-9],[22,-5],[-24,-5]],'#b7cbc9');
      line(c,-23,-1,23,-1,'#627d83',2);c.fillStyle='#b7bca6';c.fillRect(-23,-5,5,3);c.fillRect(18,-5,5,3);ellipse(c,0,2,22,2,'#d7e2da');c.restore();
    }
    function lamp(c,s){
      line(c,s.x,s.y,s.x+25,s.y+12,'#47647725',4);line(c,s.x,s.y,s.x,s.y-48,'#667f85',3);line(c,s.x,s.y-48,s.x-10,s.y-51,'#7f9797',3);
      polygon(c,[[s.x-16,s.y-52],[s.x-7,s.y-52],[s.x-5,s.y-48],[s.x-17,s.y-48]],'#c4d0c7');ellipse(c,s.x,s.y,4,2,'#d6dfd7');
    }
    function crate(c,x,y,kind,open=false){
      shadow(c,x,y,24,8,.22);
      const med=kind==='meds'||kind==='medical',food=kind==='food'||kind==='supply',parts=kind==='parts'||kind==='toolbox';
      const a=med?'#b4bdb3':parts?'#637e82':food?'#8b856b':'#8e8169',b=med?'#81958f':parts?'#496775':food?'#6e7567':'#726d5c';
      polygon(c,[[x-18,y-12],[x+16,y-12],[x+18,y+1],[x-17,y+1]],b,'#516b7166');
      polygon(c,[[x-18,y-12],[x-14,y-19],[x+19,y-18],[x+16,y-12]],a);polygon(c,[[x+16,y-12],[x+19,y-18],[x+20,y-3],[x+18,y+1]],'#4a6770');
      if(open){polygon(c,[[x-17,y-13],[x+15,y-13],[x+15,y-10],[x-17,y-10]],'#334f59');polygon(c,[[x-15,y-21],[x+18,y-20],[x+16,y-27],[x-15,y-28]],a);}
      else{line(c,x-10,y-12,x-9,y,x-10<0?'#b9bea4':'#b9bea4',2);line(c,x+9,y-12,x+10,y,'#b9bea4',2);}
      if(med){c.fillStyle='#935e50';c.fillRect(x-3,y-10,5,9);c.fillRect(x-6,y-7,11,3);}
      else if(parts){line(c,x-3,y-17,x+5,y-17,'#b5c4bc',2);c.fillStyle='#b5c4bc';c.fillRect(x-5,y-7,4,3);}
      else{line(c,x-14,y-8,x+14,y-8,'#4d61554d');line(c,x-14,y-4,x+14,y-4,'#4d61554d');}
      polygon(c,[[x-18,y-18],[x-8,y-19],[x-6,y-16],[x+9,y-17],[x+18,y-17],[x+16,y-13],[x-17,y-14]],'#d7e0d2');
      ellipse(c,x,y+2,20,2,'#dbe4d633');
    }
    function logs(c,x,y,empty){
      shadow(c,x,y,26,7,.2);const n=empty?2:6;
      for(let i=0;i<n;i++){
        const row=Math.floor(i/3),ix=x-20+(i%3)*9,iy=y-row*6;
        polygon(c,[[ix,iy],[ix+23,iy-9],[ix+25,iy-13],[ix+1,iy-4]],'#706a56');
        line(c,ix+2,iy-4,ix+23,iy-12,'#b1a58a',2);ellipse(c,ix+2,iy-1,4,2.5,'#b7a889');ellipse(c,ix+2,iy-1,1.7,1,'#746e57');
        if(row===1)line(c,ix+2,iy-5,ix+22,iy-13,'#d1dbce',2);
      }
    }
    function facility(c,f){
      const x=f.x,y=f.y;
      if(f.id==='stove'){
        const glow=c.createRadialGradient(x,y,3,x,y,65);glow.addColorStop(0,'#d2a3632a');glow.addColorStop(1,'#d2a36300');c.fillStyle=glow;c.fillRect(x-65,y-65,130,130);
        shadow(c,x,y,23,7,.24);polygon(c,[[x-15,y],[x+14,y],[x+12,y-20],[x-13,y-20]],'#64756e');polygon(c,[[x-13,y-20],[x+12,y-20],[x+8,y-26],[x-16,y-25]],'#9ca69a');
        line(c,x+7,y-24,x+7,y-43,'#798a80',6);ellipse(c,x+7,y-44,5,2,'#c0ccc1');c.fillStyle='#c99150';c.fillRect(x-9,y-14,18,9);c.fillStyle='#e0bc7e';c.fillRect(x-5,y-10,8,4);logs(c,x-36,y+5,true);
      }else if(f.id==='workbench'){
        shadow(c,x,y,30,8,.22);line(c,x-21,y-15,x-21,y,'#6a705d',3);line(c,x+21,y-15,x+21,y,'#6a705d',3);
        polygon(c,[[x-28,y-16],[x+24,y-16],[x+31,y-24],[x-21,y-24]],'#a1997d');polygon(c,[[x-28,y-16],[x+24,y-16],[x+24,y-12],[x-28,y-12]],'#7a7d66');
        line(c,x-10,y-22,x+1,y-18,'#5b7276',3);line(c,x-10,y-22,x-8,y-27,'#bac7bf',4);crate(c,x+4,y-22,'parts',true);
      }else if(f.id==='radio'){
        shadow(c,x,y,18,5,.23);polygon(c,[[x-13,y],[x+12,y],[x+12,y-19],[x-13,y-19]],'#68817f');polygon(c,[[x-13,y-19],[x+12,y-19],[x+16,y-24],[x-9,y-24]],'#a9b9ad');
        c.fillStyle='#334e54';c.fillRect(x-9,y-15,13,6);line(c,x+8,y-21,x+10,y-60,'#718b88',2);line(c,x+3,y-57,x+17,y-57,'#bac8b9',2);ellipse(c,x+9,y-9,2,2,'#d6b889');
      }else if(f.id==='bed'){
        shadow(c,x,y,36,10,.2);polygon(c,[[x-34,y],[x+28,y],[x+25,y-21],[x-19,y-49]],'#829788');
        polygon(c,[[x-34,y],[x-19,y-49],[x+5,y-4]],'#b9c4ac');polygon(c,[[x-23,y],[x-17,y-24],[x-2,y]],'#48656a');
        line(c,x-19,y-49,x-34,y,'#d2d8c0',1.5);line(c,x-19,y-49,x+25,y-21,'#d2d8c0',1.5);ellipse(c,x,y+1,36,2,'#d6dfd7');
      }else if(f.id==='gate'){
        for(const d of [-30,30]){shadow(c,x+d,y,9,3,.2);line(c,x+d,y,x+d,y-35,'#7d8572',7);ellipse(c,x+d,y-35,5,2,'#d6dfd3');}
        line(c,x-65,y-26,x-31,y-26,'#a49b7c',6);line(c,x+31,y-26,x+65,y-26,'#a49b7c',6);
        polygon(c,[[x+37,y-27],[x+62,y-27],[x+62,y-41],[x+37,y-41]],'#566f71');line(c,x+43,y-34,x+55,y-34,'#d8dcc6',1.5);line(c,x+51,y-38,x+55,y-34,'#d8dcc6',1.5);line(c,x+51,y-30,x+55,y-34,'#d8dcc6',1.5);
      }
      // A real low sign is anchored to the snow, never a hovering loot beacon.
      line(c,x-37,y+7,x-37,y-6,'#78846f',2);c.fillStyle='#6b8079';c.fillRect(x-58,y-12,43,12);c.font='500 8px -apple-system, BlinkMacSystemFont, sans-serif';c.fillStyle='#e0e4d2';c.textAlign='center';c.fillText(f.name||f.id,x-36,y-3);
    }
    function drawStructure(c,s){
      if(s.type==='building')building(c,s);
      else if(s.type==='facility')facility(c,s);
      else if(s.kind==='pine')pine(c,s);
      else if(s.kind==='birch')birch(c,s);
      else if(s.kind==='rock')rock(c,s);
      else if(s.kind==='car')car(c,s);
      else if(s.kind==='lamp')lamp(c,s);
    }
    function drawNode(c,n,time,near){
      const kind=n.kind||Object.keys(n.rewards||{}).sort((a,b)=>(n.rewards[b]||0)-(n.rewards[a]||0))[0]||'parts';
      if(n.id&&n.id.startsWith('drop-')){
        shadow(c,n.x,n.y,12,4,.24);polygon(c,[[n.x-9,n.y],[n.x+8,n.y],[n.x+10,n.y-8],[n.x+3,n.y-12],[n.x-7,n.y-9]],'#67766c','#4d6871');line(c,n.x-4,n.y-5,n.x+4,n.y-8,'#b7b5a0',2);ellipse(c,n.x+4,n.y-2,2,1,'#c7ccc0');
      }else if(kind==='wood'||kind==='woodpile'||kind==='logs'||kind==='timber')logs(c,n.x,n.y,n.remaining===0);
      else crate(c,n.x,n.y,kind,n.remaining===0);
      if(near&&n.remaining>0){c.save();c.setLineDash([3,5]);c.lineWidth=1;c.strokeStyle='#e5e7d5a6';c.beginPath();c.ellipse(n.x,n.y+2,30,12,0,0,Math.PI*2);c.stroke();c.restore();}
    }
    function drawActor(c,body,kind,time){
      const player=kind==='player',wolf=kind==='wolf';
      c.save();c.translate(body.x,body.y);
      if(body.health<=0){
        shadow(c,0,1,21,7,.18);ellipse(c,0,-3,15,5,player?'#7f705e':'#6d827d');ellipse(c,14,-4,5,4,'#a1ada0');line(c,-14,-2,-24,2,'#536b70',4);c.restore();return;
      }
      const moving=!!body.moving;
      const t=Number(time)||0,phase=t*.009+(player?0:.7),step=moving?Math.sin(phase)*(wolf?3:3.5):0;
      const a=body.angle||0,fx=Math.cos(a),fy=Math.sin(a),back=fy<-.25,side=Math.abs(fx)>.5;
      shadow(c,1,1,wolf?21:17,wolf?6:5,.25);
      if(wolf){
        const flip=fx<0?-1:1;c.scale(flip,1);
        line(c,-10,-8,-12,step,'#4f6771',3);line(c,8,-8,10,-step,'#506b75',3);ellipse(c,-2,-11,17,8,'#849894');
        polygon(c,[[-13,-16],[-7,-22],[4,-20],[13,-14],[5,-13],[-9,-13]],'#bdccc4');polygon(c,[[10,-18],[18,-18],[25,-10],[19,-8],[10,-12]],'#91a69f');
        polygon(c,[[10,-18],[10,-25],[17,-19]],'#738f92');ellipse(c,21,-10,2,1,'#3f5961');line(c,-18,-12,-28,-6,'#879d97',5);line(c,-14,-16,-20,-13,'#c4d0c3',2);
        c.restore();return;
      }
      const coat=player?'#a28b63':'#7e9690',dark=player?'#766c57':'#526f79',light=player?'#b7a882':'#a8bab0';
      // The planted boot stays on y=0; motion bends the legs, not the entire sprite.
      const leftY=Math.max(0,step),rightY=Math.max(0,-step),dx=fx*step*.6,dy=fy*step*.45;
      line(c,-4,-17,-5+dx,-3+leftY+dy,'#49636c',5);line(c,4,-17,5-dx,-3+rightY-dy,'#526d75',5);
      ellipse(c,-5+dx,Math.min(2,leftY+dy),4.8,2.3,'#3b5761');ellipse(c,5-dx,Math.min(2,rightY-dy),4.8,2.3,'#3d5862');
      line(c,-7+dx,Math.min(1,leftY+dy),-3+dx,Math.min(1,leftY+dy),'#a6bcb96b',1);
      const reach=!player&&body.state==='attack'?7:0,arm=step*.45;
      line(c,-8,-31,-11+fx*reach,-19+arm+fy*reach,dark,5);line(c,8,-31,11+fx*reach,-20-arm+fy*reach,dark,5);
      ellipse(c,-11+fx*reach,-18+arm+fy*reach,2.8,2.3,'#7f8e7b');ellipse(c,11+fx*reach,-19-arm+fy*reach,2.8,2.3,'#8b9785');
      polygon(c,[[-7,-34],[6,-34],[9,-18],[3,-15],[-8,-17],[-10,-25]],coat,'#4b677366');
      polygon(c,[[-7,-34],[-2,-34],[-1,-17],[-8,-17],[-10,-25]],light);polygon(c,[[5,-33],[8,-24],[9,-18],[3,-15],[1,-17],[1,-33]],dark);
      line(c,-8,-19,8,-19,'#414f4959',2);
      if(back){polygon(c,[[-5,-31],[4,-31],[6,-20],[-5,-20]],'#596f6c');line(c,-4,-29,3,-29,'#a1b0a2',1);}
      else{line(c,-1,-31,0,-20,'#d1cbb080',1);ellipse(c,-4,-25,1,1,'#c1b89a');}
      if(!player){line(c,5,-28,3,-22,'#a5817059',2);line(c,-3,-32,-1,-28,'#a5817059',2);}
      ellipse(c,0,-36,5.7,6.6,back?'#778e86':'#a6ad91');
      polygon(c,[[-6,-39],[-4,-44],[2,-45],[7,-40],[4,-37],[-6,-38]],player?'#6a7970':'#597980');
      if(player){line(c,-6,-39,4,-40,'#c4ceb35c',2);polygon(c,[[-6,-34],[6,-34],[4,-30],[-3,-31]],'#687d78');}
      if(!back){const faceX=side?fx*2.5:0;line(c,faceX-1,-36,faceX+1,-36,'#455d58',1);line(c,faceX,-33,faceX+1,-33,'#717f6c',1);}
      if(player){
        line(c,11+fx*reach,-19-arm,15+fx*4,-27-arm,'#867757',2);line(c,15+fx*4,-27-arm,19+fx*4,-29-arm,'#aab9b5',3);
      }
      // Thin snow covers the sole contact, binding the actor to the same terrain material.
      line(c,-8,2,-2,2,'#d3ded06b',1);line(c,3,2,8,2,'#d3ded058',1);
      c.restore();
    }
    function drawOverview(c,width,height){
      const sx=width/run.width,sy=height/run.height;c.save();c.scale(sx,sy);c.fillStyle='#a8bec3';c.fillRect(0,0,run.width,run.height);
      for(const r of world.REGIONS||[]){c.fillStyle=COLORS[r.id]||COLORS.suburb;c.fillRect(r.x,r.y,r.w,r.h);}
      for(const road of world.ROADS||[]){c.beginPath();road.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.lineWidth=road.width+8;c.lineCap='round';c.lineJoin='round';c.strokeStyle='#6f8e99';c.stroke();}
      for(const s of world.SCENERY||[]){if(s.kind==='pine')ellipse(c,s.x,s.y,(s.size||60)*.4,(s.size||60)*.32,'#537e7799');else if(s.kind==='rock')ellipse(c,s.x,s.y,(s.size||30)*.7,(s.size||30)*.45,'#7494a28c');}
      for(const b of world.BUILDINGS||[]){c.fillStyle=b.region==='city'?'#66838d':'#81908a';c.fillRect(b.x,b.y,b.w,b.h);c.fillStyle='#dce5d1';c.fillRect(b.x+5,b.y+5,b.w-10,b.h-13);}
      ellipse(c,world.SPAWN.x,world.SPAWN.y,210,140,'#dbc89b');c.restore();
    }
    return {structures,drawGround,drawStructure,drawActor,drawNode,drawOverview,dispose(){cache.clear();}};
  }
  return {create};
});
