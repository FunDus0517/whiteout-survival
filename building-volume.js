(function(root){'use strict';
function draw(c,b,alpha,time){
 c.save();c.globalAlpha=alpha;
 const x=b.x,y=b.y,w=b.w,h=b.h;
 c.save();c.shadowColor='#0a243e45';c.shadowBlur=12;
 c.fillStyle='#26445c22';c.beginPath();c.moveTo(x+10,y+h-12);c.lineTo(x+w,y+h-14);c.lineTo(x+w+39,y+h+21);c.lineTo(x+44,y+h+30);c.closePath();c.fill();c.restore();
 const contact=c.createRadialGradient(x+w/2,y+h,3,x+w/2,y+h,w*.58);contact.addColorStop(0,'#142d4554');contact.addColorStop(.65,'#294a6229');contact.addColorStop(1,'#294a6200');
 c.fillStyle=contact;c.save();c.translate(x+w/2,y+h);c.scale(1,.2);c.fillRect(-w*.65,-w*.65,w*1.3,w*1.3);c.restore();
 if(b.kind==='cabin'||b.kind==='house'){const t=(time||0)*.00025;for(let i=0;i<4;i++){const phase=(t+i/4)%1;c.fillStyle='rgba(199,213,220,'+((1-phase)*.08)+')';c.beginPath();c.ellipse(x+w*.7+phase*15,y+h-190-phase*34,4+phase*9,3+phase*7,-.3,0,Math.PI*2);c.fill();}}
 c.restore();
}
root.WhiteoutVolumeBuildings={draw};
})(typeof window!=='undefined'?window:globalThis);
