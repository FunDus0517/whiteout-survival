const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../updates.js'),'utf8');
async function fixture({registration,native=false,remote={version:'1.0.1',notes:'New snow'},offline=false}={}){
  let reloads=0,requested;
  const location={protocol:'https:',hostname:'fundus0517.github.io',pathname:'/whiteout-survival/',reload(){reloads++;}};
  const window={WhiteoutRelease:{version:'1.0.0',remoteManifest:'https://fundus0517.github.io/whiteout-survival/version.json',releaseUrl:'https://github.com/FunDus0517/whiteout-survival/releases'},Capacitor:{isNativePlatform:()=>native}};
  const navigator={serviceWorker:{register:async()=>registration,addEventListener(){}}};
  const context={window,navigator,location,document:{baseURI:'https://fundus0517.github.io/whiteout-survival/'},URL,AbortSignal,setTimeout,clearTimeout,fetch:async url=>{requested=url;if(offline)throw Error('offline');return{ok:true,json:async()=>remote};}};
  vm.runInNewContext(source,context);await Promise.resolve();
  return{api:window.WhiteoutUpdates,reloads:()=>reloads,requested:()=>requested};
}
test('update checks handle version order and unavailable networks without reloading',async()=>{
  const f=await fixture(),status=await f.api.check();
  assert.equal(status.available,true);assert.equal(status.current,'1.0.0');
  assert.equal(f.api.newer('1.0.10','1.0.9'),true);assert.equal(f.api.newer('1.0.0','1.0.1'),false);
  const off=await fixture({offline:true});assert.equal((await off.api.check()).ok,false);assert.equal(off.reloads(),0);
});
test('web update waits for the complete new cache before requesting activation',async()=>{
  const worker=new EventTarget();worker.state='installing';const messages=[];
  worker.postMessage=m=>messages.push(m);
  const r={installing:worker,waiting:null,update:async()=>{}},f=await fixture({registration:r});
  const promise=f.api.apply();await Promise.resolve();
  assert.equal(messages.length,0);assert.equal(f.reloads(),0);
  r.waiting=worker;worker.state='installed';worker.dispatchEvent(new Event('statechange'));
  assert.equal(await promise,true);assert.deepEqual(messages,['ACTIVATE_UPDATE']);assert.equal(f.reloads(),0);
});
test('a failed new cache does not replace the playable old version',async()=>{
  const worker=new EventTarget();worker.state='installing';worker.postMessage=()=>assert.fail('Must not activate incomplete cache');
  const f=await fixture({registration:{installing:worker,waiting:null,update:async()=>{}}});
  const promise=f.api.apply();await Promise.resolve();worker.state='redundant';worker.dispatchEvent(new Event('statechange'));
  await assert.rejects(promise,/download failed/);assert.equal(f.reloads(),0);
});
test('native update checks the public manifest and does not attempt web cache activation',async()=>{
  const f=await fixture({native:true});const status=await f.api.check();
  assert.equal(status.native,true);assert.equal(status.available,true);assert.equal(f.requested(),'https://fundus0517.github.io/whiteout-survival/version.json');
  assert.equal(await f.api.apply(),false);assert.equal(f.reloads(),0);
});
