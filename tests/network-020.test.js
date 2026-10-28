import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generate,newRun,advance,ice,extract,skipNode,sentryChoice,useSpecial,eligible,resolveBackdoor,abandon,traceLimit,memoryCapacity,ruleset} from '../src/engine.js';
import {preset,migrateHacker} from '../src/profile.js';
import {setupContent} from '../src/setup-ui.js';
import {gameContent,contextControls} from '../src/game-ui.js';
import {report} from '../src/report.js';

const profile=feat=>({...preset(1,'Factor'),int:5,program:5,feat});
const network=(elements=[],alert=0,tier=1)=>({seed:'network-020',difficulty:'Standard',tier,dv:12+2*tier,ruleset:'network',target:10,alert,assumptions:'network-canon-1',elements:elements.map(([type,pos],i)=>({id:`${type}-${i}`,type,pos,status:'active'}))});
const run=(feat=0,elements=[],alert=0,tier=1)=>newRun(network(elements,alert,tier),profile(feat));

test('new playable setup has one canon ruleset, fixed Breach 10, Trace 8, Alert and independent tier DV',()=>{
  const app=readFileSync('src/app.js','utf8');assert.doesNotMatch(app,/id="ruleset"|id="target"/);assert.match(app,/ruleset:'network'/);
  for(const tier of [1,2,3,4])for(const alert of [0,1,2,3]){
    const n=generate('same','Standard',tier,{ruleset:'network',alert});const s=newRun(n,profile(0));
    assert.equal(n.target,10);assert.equal(n.dv,12+2*tier);assert.equal(s.trace,alert);assert.equal(s.alert,alert);assert.equal(traceLimit(s),8);assert.equal(s.ruleset,'network');
    assert.equal(n.elements.some(e=>e.type==='barrier'),false);assert.deepEqual(n,generate('same','Standard',tier,{ruleset:'network',alert}));
  }
  assert.throws(()=>generate('bad','Easy',1,{ruleset:'network',target:8}),/Invalid/);
});

test('canonical Basic Programs keep approved numbers and never change external Alert',()=>{
  const s=run(0,[],2);advance(s,'cautious',20);assert.deepEqual([s.breach,s.trace,s.alert,s.net,s.main],[2,4,2,1,1]);
  advance(s,'aggressive',1);assert.deepEqual([s.breach,s.trace,s.alert,s.net,s.main],[2,7,2,2,1]);
  assert.throws(()=>advance(s,'tunnel',20),/Streamlined/);
  const t=run(0);advance(t,'aggressive',20);assert.deepEqual([t.breach,t.trace],[3,2]);
});

test('feat positions are sequential selections and determine actual Memory and Program access at every tier',()=>{
  for(const [feat,capacity] of [[0,0],[1,2],[2,2],[4,3],[6,3],[8,3],[10,3]]){
    const s=run(feat,[],0,4);assert.equal(memoryCapacity(s),capacity);assert.equal(s.charges,capacity);
    assert.equal(eligible(s,'trace'),feat>=1);assert.equal(eligible(s,'fortify'),feat>=1);assert.equal(eligible(s,'spoof'),feat>=1);assert.equal(eligible(s,'override'),feat>=1);assert.equal(eligible(s,'bypass'),feat>=6);
  }
  assert.throws(()=>newRun(network(),{...profile(3),feat:3}),/Invalid feat progression/);
  const none=run(0);none.trace=3;assert.throws(()=>useSpecial(none,'trace'),/unavailable/i);
  const foundation=run(1);foundation.trace=3;useSpecial(foundation,'trace');assert.equal(foundation.charges,1);assert.equal(foundation.trace,1);
  assert.doesNotMatch(setupContent(profile(6)),/id="p-trace"|purchase|software tier/i);
});

test('feat choices snapshot into runs and historical run metadata remains distinct',()=>{
  const p=profile(1),s=newRun(network(),p);p.feat=10;assert.equal(s.hacker.feat,1);assert.equal(s.charges,2);
  const old=migrateHacker({...preset(2),feat:undefined});assert.equal(old.feat,0);
  const historical=newRun(generate('old','Easy',1,{ruleset:'streamlined',alert:1}),preset(1));historical.appVersion='0.1.6';
  const text=report([s,historical]);assert.match(text,/ruleset=network/);assert.match(text,/app=0.1.6/);assert.match(text,/streamlined-test-2/);
});

test('ICE Bypass works at T4 only with Security Subversion and costs one Memory, not another NET',()=>{
  const low=run(4,[['ice',3]],0,4);low.breach=2;advance(low,'aggressive',20);assert.equal(low.pending.type,'stream15Ice');assert.equal(eligible(low,'bypass'),false);assert.throws(()=>ice(low,null,null,true),/unavailable/i);
  const high=run(6,[['ice',3]],0,4);high.breach=2;advance(high,'aggressive',20);ice(high,null,null,true);assert.equal(high.breach,5);assert.equal(high.net,1);assert.equal(high.charges,2);assert.equal(high.network.elements[0].status,'cleared');
});

test('resource extraction, skipped nodes, Sentries and no Foundation preserve security costs',()=>{
  const s=run(0,[['node',1],['sentry',2]]);advance(s,'cautious',20);assert.equal(s.pending.type,'stream15Node');extract(s,20);assert.equal(s.network.elements[0].status,'extracted');assert.equal(s.net,2);assert.equal(s.pending.type,'stream15Sentry');sentryChoice(s,false);assert.equal(s.network.elements[1].status,'crossed');assert.equal(s.trace,4);assert.equal(s.breach,1);
  const t=run(1,[['node',1]]);advance(t,'cautious',20);skipNode(t);assert.equal(t.network.elements[0].status,'skipped');assert.equal(t.net,1);
});

test('Backdoor is a pending choice only on first qualifying Pursuit ejection',()=>{
  const low=run(8);low.breach=2;low.trace=8;low.pursuit=1;advance(low,'cautious',1);assert.equal(low.status,'ejected');assert.equal(low.lockout,'remainder-of-mission');
  const high=run(10);high.breach=2;high.trace=8;high.pursuit=1;advance(high,'cautious',1);assert.equal(high.status,'backdoor-choice');assert.equal(high.finished,undefined);assert.match(gameContent(high,'events'),/USE BACKDOOR/);assert.throws(()=>advance(high,'cautious',20));
  resolveBackdoor(high,false);assert.equal(high.status,'ejected');assert.equal(high.lockout,'remainder-of-mission');
  const voluntary=run(10);abandon(voluntary);assert.equal(voluntary.status,'abandoned');assert.equal(voluntary.lockout,'remainder-of-mission');assert.throws(()=>resolveBackdoor(voluntary,true),/unavailable/);
});

test('Backdoor restarts same terminal and layout, restores Memory, preserves collected nodes, reopens failed and skipped nodes once',()=>{
  const s=run(10,[['node',2],['node',4],['node',6],['ice',7],['sentry',8]],1);const layout=s.network.elements.map(e=>[e.id,e.type,e.pos]);const terminal=s.terminalId;
  s.network.elements[0].status='extracted';s.network.elements[1].status='failed';s.network.elements[2].status='skipped';s.network.elements[3].status='cleared';s.network.elements[4].status='crossed';
  s.breach=2;s.trace=8;s.pursuit=1;s.charges=0;advance(s,'cautious',1);assert.equal(s.status,'backdoor-choice');
  resolveBackdoor(s,true,3);assert.deepEqual([s.status,s.breach,s.trace,s.pursuit,s.charges,s.alert,s.backdoorUsed],['active',0,3,null,3,3,true]);
  assert.equal(s.terminalId,terminal);assert.deepEqual(s.network.elements.map(e=>[e.id,e.type,e.pos]),layout);
  assert.deepEqual(s.network.elements.map(e=>e.status),['extracted','active','active','active','active']);
  s.breach=2;s.trace=8;s.pursuit=1;advance(s,'cautious',1);assert.equal(s.status,'ejected');assert.equal(s.lockout,'remainder-of-mission');assert.throws(()=>resolveBackdoor(s,true),/unavailable/);
  assert.equal(s.network.elements.filter(e=>e.status==='extracted').length,1);
});

test('different terminal creates a new intrusion; legacy active engine path still works',()=>{
  const first=run(1);abandon(first);const second=run(1);assert.notEqual(second.terminalId,first.terminalId);assert.equal(second.trace,0);assert.equal(second.charges,2);
  const old=newRun(generate('old','Easy',1,{ruleset:'canonical'}),preset(1));assert.equal(ruleset(old),'canonical');assert.match(contextControls(old),/CAUTIOUS/);
});
