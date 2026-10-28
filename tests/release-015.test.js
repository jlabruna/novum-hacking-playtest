import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generate,newRun,advance,ice,extract,skipNode,sentryChoice,useSpecial,eligible,modernStreamlined,traceLimit} from '../src/engine.js';
import {preset,migrateSettings} from '../src/profile.js';
import {timeline,statusPanel,contextControls,gameContent} from '../src/game-ui.js';
import {runMetrics,configurationGroups,report} from '../src/report.js';
import {gameVisibility} from '../src/view.js';
import {SoundEffects} from '../src/audio.js';

const profile=()=>preset(1,'Console Test');
const network=(elements=[],alert=0,target=10)=>({seed:'v15',difficulty:'Hard',tier:1,dv:14,ruleset:'streamlined',target,alert,assumptions:'streamlined-test-2',elements:elements.map(([type,pos],i)=>({type,pos,id:`${type}-${i}`,status:'active'}))});
const run=(elements=[],alert=0,target=10)=>newRun(network(elements,alert,target),profile());
const element=(s,type)=>s.network.elements.find(e=>e.type===type);
test('v0.1.5 generation, Alert, versioned rulesets and full network visibility',()=>{
  for(const alert of [0,1,2,3]){const s=run([],alert);assert.equal(s.trace,alert);assert.equal(s.startingTrace,alert);assert.equal(s.alert,alert);assert.equal(s.network.dv,14);assert.equal(traceLimit(s),8);assert.equal(s.charges,3);assert.equal(modernStreamlined(s),true)}
  for(const difficulty of ['Easy','Standard','Hard']){const n=generate('repro',difficulty,2,{ruleset:'streamlined',target:10,alert:3});assert.deepEqual(n,generate('repro',difficulty,2,{ruleset:'streamlined',target:10,alert:3}));assert.equal(n.elements.filter(e=>e.type==='barrier').length,0);assert.ok(n.elements.every(e=>e.pos>0&&e.pos<10))}
  const old=network();old.assumptions='streamlined-test-1';const v14=newRun(old,profile());assert.equal(traceLimit(v14),6);assert.equal(v14.trace,0);
  const canonical=newRun(generate('original','Easy',1),profile());assert.equal(traceLimit(canonical),6);assert.ok(canonical.network.elements.some(e=>e.type==='barrier'));
  const s=run([['node',4],['ice',5]]);s.visibility='fog';assert.equal(gameVisibility(s),false);
  const html=timeline(s.network,0,{fog:gameVisibility(s),pursuit:null});assert.equal((html.match(/class="track-cell /g)||[]).length,10);assert.match(html,/RESOURCE/);assert.match(html,/ICE/);assert.match(html,/OBJECTIVE/);
  assert.equal(migrateSettings(null).defaultAlert,0);assert.equal(migrateSettings({defaultAlert:2}).defaultAlert,2);
  assert.throws(()=>generate('x','Easy',1,{ruleset:'streamlined',alert:4}),/Alert/);
});
test('Basic Programs use new Trace values, natural overrides and immutable modifiers',()=>{
  for(const [kind,die,expected] of [['cautious',20,[2,2,true]],['cautious',1,[0,2,false]],['aggressive',20,[3,2,true]],['aggressive',1,[0,3,false]]]){const s=run();advance(s,kind,die);assert.deepEqual([s.breach,s.trace,s.events[0].success],expected);assert.equal(s.net,1)}
  const s=run();s.modifiers={cautious:2,aggressive:0};advance(s,'cautious',6);assert.equal(s.events[0].total,14);assert.equal(s.events[0].success,true);
  assert.match(contextControls(run()),/TRACE \+2 success \/ \+2 failure/);assert.doesNotMatch(contextControls(run()),/TUNNEL/);
});
test('Trace eight, detection permanence, Memory expenditure and Fortify consumption',()=>{
  const s=run([],3);s.breach=5;advance(s,'cautious',1);assert.equal(s.trace,5);useSpecial(s,'trace');assert.equal(s.trace,3);assert.equal(s.alert,3);assert.equal(s.charges,2);
  advance(s,'aggressive',1);assert.equal(s.trace,6);advance(s,'aggressive',1);assert.equal(s.trace,8);assert.equal(s.pursuit,1);assert.throws(()=>useSpecial(s,'trace'),/Trace cannot undo detection/);assert.equal(s.charges,2);
  const f=run();f.breach=4;f.trace=6;useSpecial(f,'fortify');assert.equal(f.fortify,3);assert.equal(f.charges,2);advance(f,'cautious',1);assert.equal(f.pursuit,1);advance(f,'cautious',1);assert.equal(f.pursuit,2);advance(f,'cautious',1);assert.equal(f.pursuit,2);assert.equal(f.fortify,null);assert.equal(f.charges,2);assert.ok(f.events.some(e=>e.kind==='fortify-block'));
  assert.match(statusPanel(s),/TRACE <strong>8 \/ 8/);assert.match(statusPanel(s),/DETECTED/);assert.match(statusPanel(s),/MEMORY/);
});
test('multiple nodes preserve movement and require independent NET Actions; skip and failure are final',()=>{
  const s=run([['node',3],['node',4]]);s.breach=2;advance(s,'aggressive',20);assert.equal(s.pending.type,'stream15Node');assert.equal(s.net,1);
  const restored=structuredClone(s);extract(restored,20);assert.equal(restored.net,2);assert.equal(restored.pending.type,'stream15Node');assert.equal(restored.pending.id,'node-1');
  skipNode(restored);assert.equal(restored.pending,null);assert.equal(restored.breach,5);assert.equal(restored.net,2);assert.deepEqual(restored.network.elements.map(e=>e.status),['extracted','skipped']);
  const f=run([['node',1]]);advance(f,'cautious',20);extract(f,1);assert.equal(element(f,'node').status,'failed');assert.equal(f.trace,3);assert.equal(f.net,2);assert.equal(f.breach,2);
  const o=run([['node',1]]);advance(o,'cautious',20);extract(o,null,true);assert.equal(o.charges,2);assert.equal(o.net,2);assert.equal(o.trace,3);assert.equal(element(o,'node').status,'extracted');
});
test('post-detection extraction adds immediate Pursuit and its separate NET Action advance',()=>{
  const s=run([['node',3]]);s.breach=2;s.trace=8;s.pursuit=0;advance(s,'aggressive',20);
  assert.equal(s.pending.type,'stream15Node');assert.equal(s.pursuit,0);
  extract(s,20);assert.equal(s.net,2);assert.equal(s.pursuit,3);
  assert.equal(s.events[0].security,'+1 immediate Pursuit');assert.equal(s.events[0].success,true);
  assert.equal(s.events[1].actual,3);assert.equal(s.breach,5);
});
test('post-detection Sentry adds immediate Pursuit without converting Basic Trace',()=>{
  const s=run([['sentry',3]]);s.breach=2;s.trace=8;s.pursuit=0;
  advance(s,'aggressive',20);assert.equal(s.pending.type,'stream15Sentry');assert.equal(s.pursuit,0);
  sentryChoice(s,false);assert.equal(s.breach,4);assert.equal(s.pursuit,2);
  assert.match(s.events[0].sentryEffect,/immediate Pursuit/);
});
test('Sentry costs one movement and one security, Spoof prevents both, consumed cannot retrigger',()=>{
  const s=run([['sentry',3]]);s.breach=2;advance(s,'aggressive',20);assert.equal(s.pending.type,'stream15Sentry');sentryChoice(s,false);assert.equal(s.breach,4);assert.equal(s.trace,3);assert.equal(element(s,'sentry').status,'crossed');assert.equal(s.events.at(-1).lostToSentry,1);assert.equal(s.net,1);
  const spoof=run([['sentry',3]]);spoof.breach=2;advance(spoof,'aggressive',20);sentryChoice(spoof,true);assert.equal(spoof.breach,5);assert.equal(spoof.trace,2);assert.equal(spoof.charges,2);assert.equal(element(spoof,'sentry').status,'spoofed');
  const near=run([['sentry',9]]);near.breach=8;advance(near,'aggressive',20);sentryChoice(near,false);assert.equal(near.breach,9);assert.equal(near.status,'active');advance(near,'cautious',20);assert.equal(near.status,'success');
});
test('ICE interruptions, bypass, pursuit and basic action timing',()=>{
  const s=run([['ice',3],['ice',4]]);s.breach=2;advance(s,'aggressive',20);assert.equal(s.pending.type,'stream15Ice');ice(s,'Attack','Attack');assert.equal(s.net,1);ice(s,'Attack','Exploit');assert.equal(s.pending.id,'ice-1');ice(s,null,null,true);assert.equal(s.breach,5);assert.equal(s.net,1);assert.equal(s.charges,2);assert.equal(s.events[0].iceEncounters,2);
  const loss=run([['ice',3]]);loss.breach=2;advance(loss,'aggressive',20);ice(loss,'Attack','Defend');assert.equal(loss.breach,3);assert.equal(loss.trace,3);assert.equal(loss.net,1);assert.equal(loss.events[0].lostToIce,2);advance(loss,'cautious',1);assert.equal(loss.pending,null);advance(loss,'cautious',20);assert.equal(loss.pending.type,'stream15Ice');
  const detected=run([['ice',3]]);detected.breach=2;detected.trace=8;detected.pursuit=0;advance(detected,'aggressive',20);ice(detected,'Attack','Defend');assert.equal(detected.pursuit,2);assert.equal(detected.net,1);
});
test('version and Alert separate comparisons and preserve legacy sessions',()=>{
  const modern=run([],2),legacy=run();legacy.assumptions='streamlined-test-1';legacy.appVersion='0.1.4';legacy.alert=null;legacy.startingTrace=0;
  const groups=configurationGroups([modern,legacy]);assert.equal(groups.length,2);assert.ok(groups.some(g=>g.key.includes('Alert 2')));assert.ok(groups.some(g=>g.key.includes('streamlined-test-1')));
  const text=report([modern,legacy]);assert.match(text,/Alert=2 startingTrace=2 traceLimit=8/);assert.match(text,/streamlined-test-1/);assert.match(text,/Export schema 4/);
  assert.equal(runMetrics(modern).startingTrace,2);assert.match(gameContent(modern,'events'),/NETWORK \/ BREACH TRACK/);
});
test('sound gain is louder but bounded, volume zero silent, active run screen responsive',()=>{
  let levels=[],starts=0;class Audio{constructor(){this.currentTime=0;this.destination={};this.state='running'}createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},start(){starts++},stop(){}}}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(v){levels.push(v)},exponentialRampToValueAtTime(){}},connect(){}}}}
  const sound=new SoundEffects(Audio);sound.arm({sound:true});sound.play('detection',{sound:true,volume:100});assert.ok(levels.every(x=>x>0&&x<=.45));assert.ok(levels.some(x=>x>.3));const before=starts;sound.play('ice',{sound:true,volume:0});assert.equal(starts,before);
  const css=readFileSync('style.css','utf8');assert.match(css,/track-cols/);assert.match(css,/grid-template-columns:repeat\(var\(--track-cols\)/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/safe-area-inset-top/);
});
