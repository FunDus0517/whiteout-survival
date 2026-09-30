import {readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..'),out=join(root,'dist'),pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
if(out!==join(root,'dist'))throw Error('Invalid output directory');
await rm(out,{recursive:true,force:true});await mkdir(join(out,'assets'),{recursive:true});
const files=['index.html','arena.css','game-shell.css','content.js','world-v3-data.js','world-data.js','world-art-v3.js','world-art.js','actor-volume.js','building-volume.js','arena-model.js','engine.js','arena-view.js','audio.js','app.js','updates.js','version.js','manifest.webmanifest'];
const assets=['mark.svg','icon.png','refuge-v4.png','valley-v4.png','actors-v4.png','buildings-v4.png','loot-v4.png','scavenge-depot.png','scavenge-district-v2.png','survivor-zombie-sprites.png'];
for(const file of [...files,...assets.map(f=>'assets/'+f)])await copyFile(join(root,file),join(out,file));
const version={version:pkg.version,build:process.env.GITHUB_SHA?.slice(0,8)||'local',releaseUrl:'https://github.com/FunDus0517/whiteout-survival/releases',notes:'独立基地、可进入的房间、冬季河谷、脚印和四档降雪'};
await writeFile(join(out,'version.json'),JSON.stringify(version,null,2));
await writeFile(join(out,'version.js'),'window.WhiteoutRelease='+JSON.stringify({...version,remoteManifest:'https://fundus0517.github.io/whiteout-survival/version.json'})+';');
const cacheFiles=[...files,...assets.map(f=>'assets/'+f),'version.json'].map(f=>'./'+f);
const sw="const CACHE="+JSON.stringify('whiteout-'+pkg.version+'-'+version.build)+";const FILES="+JSON.stringify(cacheFiles)+";\n"+
"self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));\n"+
"self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('whiteout-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\n"+
"self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});\n"+
"self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;if(url.pathname.endsWith('/version.json')){event.respondWith(fetch(event.request));return;}event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));});\n";
await writeFile(join(out,'sw.js'),sw);await writeFile(join(out,'.nojekyll'),'');
console.log('Built '+files.length+' game files and '+assets.length+' assets. Version '+pkg.version);
