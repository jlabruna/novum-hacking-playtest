import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newRun,advance,nodePass,extract,ice,check} from '../src/engine.js';
import {preset,migrateHacker,migrateSettings} from '../src/profile.js';
import {normaliseModifiers,requireModifiers} from '../src/modifiers.js';
import {modifierControls} from '../src/modifier-ui.js';
import {contextControls,statusPanel,gameContent,eventsPanel,specialistPanel} from '../src/game-ui.js';
import {report} from '../src/report.js';
import {modifierGroups} from '../src/report-format.js';
import {SoundEffects,selectCue} from '../src/audio.js';
import {get,put,backup,restore,clearCompletedRuns} from '../src/storage.js';

const network=(elements=[],dv=14)=>({seed:'013',difficulty:'Standard',tier:1,dv,elements:elements.map(([type,pos],i)=>({id:`${type}-${i}`,type,pos,status:'active'}))});
const hacker=()=>({...preset(1),name:'Regression'});
const run=(elements=[],modifiers={cautious:0,aggressive:0})=>newRun(network(elements),{...hacker(),modifiers});

test('test-only modifier bounds, independent setup and safe legacy defaults',()=>{
  assert.deepEqual(normaliseModifiers(),{cautious:0,aggressive:0});
  assert.deepEqual(migrateHacker({name:'Legacy',int:3,program:3,programs:{}}).modifiers,{cautious:0,aggressive:0});
  assert.deepEqual(requireModifiers({cautious:'-6',aggressive:'6'}),{cautious:-6,aggressive:6});
  for(const value of [-7,7,1.5,NaN])assert.throws(()=>requireModifiers({cautious:value,aggressive:0}));
  assert.match(modifierControls({cautious:2,aggressive:-2}),/TEST-ONLY/);
  assert.match(modifierControls({cautious:2,aggressive:-2}),/RESET TO CANONICAL DEFAULTS/);
  assert.equal(migrateSettings(null).volume,25);assert.equal(migrateSettings({sound:false,volume:0}).sound,false);
});

test('Cautious and Aggressive apply only their snapshotted check modifier, including natural overrides',()=>{
  const profile={...hacker(),modifiers:{cautious:2,aggressive:-2}},s=newRun(network(),profile);
  profile.modifiers.cautious=-6;
  assert.deepEqual(s.modifiers,{cautious:2,aggressive:-2});
  assert.match(contextControls(s),/CAUTIOUS[^<]*TEST-ONLY ROLL \+2/);
  assert.match(contextControls(s),/AGGRESSIVE[^<]*TEST-ONLY ROLL −2/);
  assert.doesNotMatch(specialistPanel(s),/TRACE REMOVAL/);
  advance(s,'cautious',6);let e=s.events.at(-1);
  assert.match(specialistPanel(s),/TRACE REMOVAL/);
  assert.deepEqual([e.die,e.int,e.programRank,e.baseBonus,e.playtestModifier,e.total,e.dv,e.success,e.after.breach,e.after.trace],[6,3,3,6,2,14,14,true,2,1]);
  advance(s,'aggressive',9);e=s.events.at(-1);
  assert.deepEqual([e.playtestModifier,e.total,e.success,e.after.breach,e.after.trace],[ -2,13,false,2,4]);
  const legacy=run();advance(legacy,'cautious',6);assert.equal(legacy.events.at(-1).success,false);
  const low=run([],{cautious:6,aggressive:6});advance(low,'cautious',1);assert.equal(low.events.at(-1).success,false);
  const high=run([],{cautious:-6,aggressive:-6});advance(high,'aggressive',20);assert.equal(high.events.at(-1).success,true);
  assert.equal(check(1,100,14),false);assert.equal(check(20,-100,14),true);
});

test('Tunnel, extraction and ICE do not receive Basic Program test modifiers or altered charges',()=>{
  const s=run([['barrier',2],['node',3],['ice',4]],{cautious:6,aggressive:-6});advance(s,'cautious',20);
  advance(s,'tunnel',6);let e=s.events.at(-1);assert.deepEqual([e.playtestModifier,e.total,e.success,e.after.trace],[0,12,false,3]);
  const n=run([['node',1]],{cautious:6,aggressive:6});advance(n,'cautious',20);
  assert.equal(n.pending.type,'nodePass');nodePass(n,true);extract(n,6);
  assert.equal(n.events.at(-1).kind,'extract');assert.equal(n.events.at(-1).total,12);
  assert.equal(n.events.at(-1).success,false);
  const i=run([['ice',1]],{cautious:6,aggressive:6});advance(i,'cautious',20);
  const charges=i.charges;ice(i,'Attack','Exploit');assert.equal(i.charges,charges);
  assert.equal(i.events.at(-1).kind,'ice');
});

test('full-width Trace and terminal result are prominent while contextual tabs remain',()=>{
  const s=run();for(let n=0;n<=6;n++){s.trace=n;const html=statusPanel(s);assert.match(html,new RegExp(`TRACE <strong>${n} / 6`));assert.equal((html.match(/<i class=/g)||[]).length,26);assert.equal((html.match(/class="track-row trace-row"/g)||[]).length,1)}
  assert.match(statusPanel(s),/DETECTED/);
  s.status='success';s.breach=10;let html=gameContent(s,'events');assert.match(html,/ACCESS GRANTED/);assert.match(html,/NEW NETWORK/);assert.doesNotMatch(html,/VIEW PLAYTEST LOG/);assert.match(html,/RECENT EVENTS/);
  s.status='ejected';s.breach=4;html=gameContent(s,'map');assert.match(html,/EJECTED/);assert.match(html,/FINAL BREACH 4 \/ 10/);assert.match(html,/NETWORK MAP/);
  assert.match(eventsPanel(s,'events'),/RECENT EVENTS/);
});

test('modifier-aware summary and detailed reports disclose exact conditions, contexts and export time',()=>{
  const a=run([],{cautious:2,aggressive:0});advance(a,'cautious',6);a.status='success';a.finished='2026-10-27T00:03:00.000Z';a.visibility='fog';
  const b=run();advance(b,'cautious',6);b.status='ejected';b.finished='2026-10-27T00:04:00.000Z';b.visibility='full';delete b.modifiers;b.appVersion='0.1.2';
  const groups=modifierGroups([a,b]);assert.equal(groups.length,2);assert.ok(groups.some(g=>g.key==='+2 / +0'&&g.success===1&&g.visibility.fog.includes('1/1')));
  const timestamp=new Date('2026-10-27T08:25:00Z');let summary=report([a,b],false,timestamp),detail=report([a,b],true,timestamp);
  assert.match(summary,/Exported at: 2026-10-27T08:25:00.000Z/);assert.match(summary,/MIXED PLAYTEST CONDITIONS/);
  assert.match(summary,/Cautious \+2, Aggressive \+0/);assert.match(summary,/legacy \+0\/\+0/);
  assert.match(summary,/Difficulty.*Standard/);assert.match(summary,/Network tier T1/);assert.match(summary,/Visibility fog/);
  assert.match(detail,/d20 6 \+ INT 3 \+ Program 3 \(base 6\) \+ TEST-ONLY \+2 = 14 vs DV 14 SUCCESS/);
  assert.match(detail,/2026-10-27T00:03:00.000Z/);
});

test('audio cue priority, detection transition, mute and graceful unavailable context',()=>{
  assert.equal(selectCue('cautious',{status:'active',pursuit:null},{status:'ejected',pursuit:1}),'ejected');
  assert.equal(selectCue('cautious',{status:'active',pursuit:null},{status:'success',pursuit:null}),'success');
  assert.equal(selectCue('cautious',{status:'active',pursuit:null},{status:'active',pursuit:0}),'detection');
  assert.equal(selectCue('ice:Attack',{status:'active',pursuit:0},{status:'active',pursuit:0}),'ice');
  assert.equal(selectCue('cautious',{status:'active',pursuit:null},{status:'active',pursuit:null,events:[{kind:'cautious',success:true}]}),'programSuccess');
  assert.equal(selectCue('aggressive',{status:'active',pursuit:null},{status:'active',pursuit:null,events:[{kind:'aggressive',success:false}]}),'programFailure');
  assert.equal(selectCue('new',null,null),'button');
  assert.doesNotThrow(()=>{const silent=new SoundEffects(null);silent.arm({sound:true});silent.play('success',{sound:true})});
  let created=0,started=0,stopped=0;class FakeContext{constructor(){created++;this.currentTime=0;this.state='suspended';this.destination={}}resume(){this.state='running';return Promise.resolve()}createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},start(){started++},stop(){stopped++}}}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}}
  const audio=new SoundEffects(FakeContext);audio.arm({sound:false});assert.equal(created,0);
  audio.arm({sound:true});audio.arm({sound:true});assert.equal(created,1);
  audio.play('success',{sound:false,volume:25});assert.equal(started,0);
  audio.play('success',{sound:true,volume:25});assert.equal(started,3);
  audio.play('button',{sound:true,volume:0});assert.equal(started,4);assert.ok(stopped>=7);
});

test('targeted clear preserves active run, config and new backup fields, including older backups',async()=>{
  const values=new Map(),db={objectStoreNames:{contains:()=>true},close(){},transaction(){const tx={objectStore:()=>({get:key=>{const q={};queueMicrotask(()=>{q.result=structuredClone(values.get(key));q.onsuccess?.()});return q},put:(v,k)=>{values.set(k,structuredClone(v));queueMicrotask(()=>tx.oncomplete?.())}})};return tx}};
  globalThis.indexedDB={open:()=>{const q={result:db};queueMicrotask(()=>q.onsuccess?.());return q}};
  try{const active=run([],{cautious:2,aggressive:0});await put('active',active);await put('runs',[{...run(),status:'success'}]);await put('hacker',{...hacker(),modifiers:{cautious:2,aggressive:-2}});await put('settings',{fog:false,sound:false,volume:40});
    const saved=await backup();await clearCompletedRuns();assert.deepEqual(await get('runs'),[]);assert.deepEqual(await get('active'),active);assert.deepEqual((await get('hacker')).modifiers,{cautious:2,aggressive:-2});assert.equal((await get('settings')).volume,40);
    await restore(saved);assert.equal((await get('runs')).length,1);assert.equal((await get('settings')).sound,false);
    await restore({...saved,hacker:{name:'old',int:3,program:3,programs:{}},settings:{fog:true}});
    assert.deepEqual(migrateHacker(await get('hacker')).modifiers,{cautious:0,aggressive:0});assert.equal(migrateSettings(await get('settings')).volume,25);
  }finally{delete globalThis.indexedDB}
});
