import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import vm from 'node:vm';
import {get,put,backup,restore} from '../src/storage.js';

test('IndexedDB retains an active run and detailed history through export/import',async()=>{
  const values=new Map(),db={objectStoreNames:{contains:()=>true},createObjectStore:()=>{},close:()=>{},transaction:()=>{let tx={oncomplete:null,onerror:null,objectStore:()=>({get:key=>{let q={result:undefined,onsuccess:null,onerror:null};queueMicrotask(()=>{q.result=structuredClone(values.get(key));q.onsuccess?.()});return q},put:(value,key)=>{values.set(key,structuredClone(value));queueMicrotask(()=>tx.oncomplete?.())}})};return tx}};
  globalThis.indexedDB={open:()=>{let q={result:db,onupgradeneeded:null,onsuccess:null,onerror:null};queueMicrotask(()=>q.onsuccess?.());return q}};
  let active={schema:1,id:'active',events:[{kind:'cautious',die:12,before:{breach:0},after:{breach:2}}]};
  await put('active',active);await put('runs',[{...active,id:'finished',status:'success'}]);await put('hacker',{name:'Tester'});await put('settings',{largeText:true});
  let copy=await backup();assert.equal(copy.format,'novum-intrusion-backup');assert.deepEqual(copy.active,active);assert.equal(copy.runs[0].events[0].die,12);
  await put('runs',[]);await restore(JSON.parse(JSON.stringify(copy)));assert.equal((await get('runs')).length,1);assert.equal((await get('active')).id,'active');
  await assert.rejects(restore({schema:2,runs:[]}),/Unsupported/);delete globalThis.indexedDB;
});

test('offline shell pre-caches every required static asset under a relative Pages path',async()=>{
  const source=readFileSync('public/sw.js','utf8'),listeners={},saved=new Map(),cache={addAll:async urls=>{for(let u of urls){assert.ok(existsSync(u==='./'?'index.html':u.replace(/^\.\//,''))||existsSync(`public/${u.replace(/^\.\//,'')}`),u);saved.set(u,{body:`cached ${u}`})}},put:async(k,v)=>saved.set(k,v)};
  const caches={open:async()=>cache,keys:async()=>['novum-intrusion-0.1.1'],delete:async()=>true,match:async request=>saved.get(request.url)||saved.get(request.url.replace('https://example.test/novum-hacking-playtest/','./'))};
  const self={location:{origin:'https://example.test'},addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
  vm.runInNewContext(source,{self,caches,fetch:async()=>{throw Error('offline')},URL});
  let install;listeners.install({waitUntil:p=>install=p});await install;
  for(let path of ['./','./index.html','./style.css','./src/app.js','./src/engine.js','./src/storage.js','./src/report.js','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'])assert.ok(saved.has(path),path);
  let response;listeners.fetch({request:{method:'GET',url:'https://example.test/novum-hacking-playtest/src/engine.js'},respondWith:p=>response=p});assert.equal((await response).body,'cached ./src/engine.js');
});

test('iPhone viewport, safe-area, manifest and Pages workflow are packaged',()=>{
  let html=readFileSync('index.html','utf8'),css=readFileSync('style.css','utf8'),manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8')),workflow=readFileSync('.github/workflows/pages.yml','utf8');
  assert.match(html,/viewport-fit=cover/);assert.match(html,/apple-touch-icon/);assert.match(css,/safe-area-inset-bottom/);assert.match(css,/input\[hidden\]\{display:none!important\}/);assert.match(css,/@media\(max-width:600px\)/);assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'./');assert.ok(manifest.icons.some(x=>x.sizes==='192x192'));assert.match(workflow,/npm run verify/);assert.match(workflow,/actions\/deploy-pages/);
});
