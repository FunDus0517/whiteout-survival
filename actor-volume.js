(function(root){'use strict';
function draw(c,b,kind,time,base){
 const zombie=kind==='zombie',scale=base?1.25:1,theta=b.angle||0,cos=Math.cos(theta),sin=Math.sin(theta),moving=b.moving,phase=(time||0)*.011,step=moving?Math.sin(phase):0;
 c.save();c.translate(b.x,b.y);c.scale(scale,scale);
 const project=(x,y,z)=>({x:x*cos-y*sin,y:(x*sin+y*cos)*.47-z});
 const ellipse=(p,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(p.x,p.y,rx,ry,0,0,Math.PI*2);c.fill();};
 function limb(a,d,width,light,dark){const p=project(...a),q=project(...d),g=c.createLinearGradient(p.x-width,p.y,q.x+width,q.y);g.addColorStop(0,light);g.addColorStop(.55,light);g.addColorStop(1,dark);c.strokeStyle=g;c.lineWidth=width;c.lineCap='round';c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}
 function box(x,y,z,w,d,h,colors){
  const pts=[[x-w/2,y-d/2,z],[x+w/2,y-d/2,z],[x+w/2,y+d/2,z],[x-w/2,y+d/2,z],[x-w/2,y-d/2,z+h],[x+w/2,y-d/2,z+h],[x+w/2,y+d/2,z+h],[x-w/2,y+d/2,z+h]];
  const faces=[[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]];
  faces.map((ids,i)=>({ids,i,depth:ids.reduce((a,n)=>a+pts[n][0]*sin+pts[n][1]*cos,0)/4})).sort((a,b)=>a.depth-b.depth).forEach(f=>{const p=f.ids.map(n=>project(...pts[n]));c.fillStyle=colors[f.i%colors.length];c.beginPath();p.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.fill();});
 }
 ellipse({x:4,y:3},17,5,'#142a4145');ellipse({x:0,y:1},10,3,'#0a1e335a');
 if(b.health<=0){c.rotate(1.3);c.scale(1,.75);}
 const legs=[-1,1].sort((a,b)=>project(a*5,0,0).y-project(b*5,0,0).y);
 for(const side of legs){const stride=step*side*7,lift=moving?Math.max(0,step*side)*4:0;limb([side*5,0,28],[side*5,stride/2,14+lift],7,'#606663','#273a40');limb([side*5,stride/2,14+lift],[side*5,stride,3+lift],6,'#4b5556','#26383e');box(side*5,stride+2,0,7,12,4+lift,['#243038','#33444c','#152a32','#283e48','#576369']);}
 const cloth=zombie?['#747c77','#424f52']:['#88775b','#414844'];
 const back=project(0,-6,34);box(0,-7,31,16,10,22,['#3c5157','#253b45','#4c5c5b','#283a43','#738078']);
 const arms=[-1,1].sort((a,b)=>project(a*12,0,0).y-project(b*12,0,0).y);
 const rear=arms[0];function arm(side){const swing=step*side*5,attack=b.attackCooldown>0?Math.sin(b.attackCooldown*5)*7:0;limb([side*10,0,48],[side*13,swing,35],8,cloth[0],cloth[1]);limb([side*13,swing,35],[side*11,5+swing+attack,25+attack],6,cloth[0],cloth[1]);ellipse(project(side*11,5+swing+attack,24+attack),3.5,3.5,'#293a42');}
 arm(rear);
 const left=project(-9,0,28),right=project(9,0,28),top=project(0,0,53);
 const coat=c.createLinearGradient(left.x-5,top.y,right.x+8,left.y);coat.addColorStop(0,zombie?'#88948a':'#b0a07a');coat.addColorStop(.35,cloth[0]);coat.addColorStop(1,cloth[1]);c.fillStyle=coat;
 c.beginPath();c.moveTo(top.x-7,top.y);c.quadraticCurveTo(left.x-6,top.y+6,left.x-3,left.y);c.quadraticCurveTo((left.x+right.x)/2,left.y+5,right.x+3,right.y);c.quadraticCurveTo(right.x+5,top.y+6,top.x+7,top.y);c.closePath();c.fill();
 limb([0,4,30],[0,4,48],.8,'#dbceaa7a','#514c3c');box(-6,4,34,5,2,7,[cloth[1],cloth[0],cloth[1],cloth[0],cloth[0]]);
 arm(arms[1]);
 const hood=project(0,0,58),glow=c.createRadialGradient(hood.x-3,hood.y-4,1,hood.x,hood.y,10);glow.addColorStop(0,zombie?'#939b8c':'#c4ab77');glow.addColorStop(.65,zombie?'#656f69':'#988057');glow.addColorStop(1,'#3a4244');c.fillStyle=glow;c.beginPath();c.ellipse(hood.x,hood.y,8,9,0,0,Math.PI*2);c.fill();
 if(sin>-.25){const face=project(0,5,57);ellipse(face,5.4,5.7,zombie?'#727875':'#363d3d');ellipse({x:face.x+1,y:face.y+2},3,2,zombie?'#a19484':'#82715b');}
 const snow=project(-3,0,65);limb([-6,-1,64],[2,-1,65],1.2,'#e9ece69f','#e0e8e98a');
 if(!zombie){const hand=project(11,5+step*5,25);limb([11,5+step*5,24],[15,8,13],1.8,'#977858','#594638');box(15,8,13,6,3,5,['#949e9c','#697f87','#9aa9ac','#485e66','#c2cbca']);}
 c.restore();
}
root.WhiteoutVolumeActors={draw};
})(typeof window!=='undefined'?window:globalThis);
