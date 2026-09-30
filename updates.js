(function(root){'use strict';let registration=null,waiting=false;
const release=root.WhiteoutRelease||{version:'1.0.0'},native=()=>!!(root.Capacitor&&root.Capacitor.isNativePlatform());
const newer=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if(x[i]>y[i])return true;if(x[i]<y[i])return false;}return false;};
async function installUpdate(r){
  await r.update();const worker=r.installing;if(!worker)return;
  if(worker.state==='installed')return;
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>finish(Error('Update download timed out')),60000);
    function finish(error){clearTimeout(timer);worker.removeEventListener('statechange',changed);error?reject(error):resolve();}
    function changed(){if(worker.state==='installed')finish();else if(worker.state==='redundant')finish(Error('Update download failed'));}
    worker.addEventListener('statechange',changed);changed();
  });
}
async function check(){try{const url=native()?release.remoteManifest:new URL('version.json',document.baseURI).href;const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('HTTP '+response.status);const remote=await response.json();if(!/^\d+\.\d+\.\d+$/.test(remote.version))throw Error('Invalid version');if(registration)await registration.update();waiting=!!(registration&&registration.waiting);return{ok:true,current:release.version,version:remote.version,available:newer(remote.version,release.version)||waiting,native:native(),notes:String(remote.notes||''),url:release.releaseUrl};}catch(_){return{ok:false,error:'暂时无法连接更新服务。当前游戏与存档仍可正常使用。'};}}
async function apply(){if(native())return false;if(registration){await installUpdate(registration);if(registration.waiting){registration.waiting.postMessage('ACTIVATE_UPDATE');return true;}}location.reload();return true;}
root.WhiteoutUpdates={check,apply,current:release.version,isNative:native,newer};
if('serviceWorker' in navigator&&!native()&&/^https?:$/.test(location.protocol)&&(!['localhost','127.0.0.1'].includes(location.hostname)||location.pathname.includes('/dist/'))){navigator.serviceWorker.register('./sw.js').then(r=>{registration=r;}).catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());}
})(window);
