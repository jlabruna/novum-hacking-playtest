import test from 'node:test';
import assert from 'node:assert/strict';
import {COUNTS,STREAMLINED_COUNTS,generate,newRun,advance,ice,nodePass,sentryChoice,extract,eligible,ruleset,breachTarget} from '../src/engine.js';
import {preset,migrateHacker} from '../src/profile.js';
import {mapCells} from '../src/view.js';
import {contextControls,statusPanel,gameContent,timeline} from '../src/game-ui.js';
import {configurationGroups,runMetrics,report} from '../src/report.js';
const hacker=()=>preset(1,'Test');
const network=(items=[],target=10)=>({seed:'stream-test',difficulty:'Hard',tier:1,dv:14,ruleset:'streamlined',assumptions:'streamlined-test-1',target,elements:items.map(([type,pos],i)=>({id:`${type}-${i}`,type,pos,status:'active'}))});
const run=(items=[],target=10)=>newRun(network(items,target),hacker());
const element=(s,type,pos)=>s.network.elements.find(e=>e.type===type&&e.pos===pos);

test('canonical generation and engine remain identical while Streamlined removes every Barrier',()=>{
  for(const difficulty of Object.keys(COUNTS))for(let tier=1;tier<=4;tier++){
    const old=generate('same-seed',difficulty,tier),explicit=generate('same-seed',difficulty,tier,{ruleset:'canonical',target:10});
    assert.deepEqual(old,explicit);assert.equal(old.elements.filter(x=>x.type==='barrier').length,COUNTS[difficulty].barrier);
    const fresh=generate('same-seed',difficulty,tier,{ruleset:'streamlined',target:8});
    assert.deepEqual(fresh,generate('same-seed',difficulty,tier,{ruleset:'streamlined',target:8}));
    assert.equal(fresh.elements.filter(x=>x.type==='barrier').length,0);
    assert.equal(fresh.elements.filter(x=>x.type==='node').length,COUNTS[difficulty].node);
    assert.equal(fresh.elements.filter(x=>x.type==='ice').length,COUNTS[difficulty].ice);
    assert.ok(fresh.elements.every(e=>e.pos>0&&e.pos<8));assert.equal(new Set(fresh.elements.map(e=>e.pos)).size,fresh.elements.length);
  }
  const canonical=newRun(generate('canonical','Easy',1),hacker());assert.deepEqual([ruleset(canonical),breachTarget(canonical),canonical.modifiers.cautious],['canonical',10,0]);
  advance(canonical,'cautious',20);assert.equal(canonical.network.elements.some(e=>e.type==='barrier'),true);
  const legacy=structuredClone(canonical);delete legacy.ruleset;delete legacy.target;assert.deepEqual([ruleset(legacy),breachTarget(legacy)],['canonical',10]);
});

test('Streamlined defaults, adjustable modifiers, no Tunnel and natural override',()=>{
  const s=run();assert.deepEqual(s.modifiers,{cautious:2,aggressive:0});assert.equal(s.charges,3);
  assert.throws(()=>advance(s,'tunnel',20),/Streamlined/);assert.doesNotMatch(contextControls(s),/TUNNEL/);
  advance(s,'cautious',6);assert.deepEqual([s.breach,s.trace,s.events[0].total,s.events[0].success],[2,1,14,true]);
  let a=run();a.modifiers={cautious:-6,aggressive:6};advance(a,'aggressive',1);assert.equal(a.events[0].success,false);
  let b=run();b.modifiers={cautious:-6,aggressive:-6};advance(b,'cautious',20);assert.equal(b.events[0].success,true);
  assert.deepEqual(migrateHacker({...hacker(),streamlinedModifiers:undefined}).streamlinedModifiers,{cautious:2,aggressive:0});
});

test('ICE win preserves full Aggressive movement and records one NET action',()=>{
  const s=run([['ice',3]]);s.breach=2;advance(s,'aggressive',10);
  assert.deepEqual([s.breach,s.net,s.trace,s.pending.type,s.pending.intended],[3,1,2,'streamIce',5]);
  assert.match(contextControls(s),/ICE ENCOUNTER/);assert.match(contextControls(s),/ICE BYPASS/);
  ice(s,'Attack','Exploit');assert.deepEqual([s.breach,s.net,s.trace,s.pending,s.status],[5,1,2,null,'active']);
  assert.equal(element(s,'ice',3).status,'cleared');assert.deepEqual([s.events[0].actual,s.events[0].iceEncounters,s.events[0].iceWins,s.events[0].preservedAfterIce],[3,1,1,2]);
  assert.deepEqual([runMetrics(s).programChecks,runMetrics(s).iceConfrontations],[1,1]);
});

test('ICE defeat discards remainder; failed retry cannot confront and successful retry can',()=>{
  const s=run([['ice',3]]);s.breach=2;advance(s,'aggressive',10);ice(s,'Attack','Defend');
  assert.deepEqual([s.breach,s.net,s.trace,s.pending,s.events[0].lostToIce],[3,1,3,null,2]);assert.equal(element(s,'ice',3).status,'active');
  assert.match(contextControls(s),/CAUTIOUS/);assert.doesNotMatch(contextControls(s),/ICE confrontation/);
  advance(s,'cautious',1);assert.deepEqual([s.net,s.trace,s.pending],[2,5,null]);
  advance(s,'cautious',10);assert.equal(s.pending.type,'streamIce');assert.equal(s.net,3);assert.equal(s.breach,3);
  ice(s,'Attack','Exploit');assert.equal(s.breach,5);assert.equal(s.net,3);
});

test('draws, bypass, tier incompatibility and charge accounting',()=>{
  const s=run([['ice',3]]);s.breach=2;advance(s,'aggressive',10);ice(s,'Attack','Attack');assert.equal(s.pending.type,'streamIce');assert.equal(s.net,1);assert.equal(s.trace,2);
  assert.doesNotMatch(contextControls(s),/ICE BYPASS/);ice(s,'Attack','Exploit');assert.equal(s.breach,5);assert.equal(runMetrics(s).iceDraws,1);assert.equal(runMetrics(s).iceConfrontations,2);
  const b=run([['ice',3]]);b.breach=2;advance(b,'aggressive',10);ice(b,null,null,true);
  assert.deepEqual([b.breach,b.charges,b.net,b.trace,runMetrics(b).iceBypasses,runMetrics(b).iceConfrontations],[5,2,1,2,1,0]);
  const t=run([['ice',3]]);t.network.tier=2;t.network.dv=16;t.breach=2;advance(t,'aggressive',20);assert.equal(eligible(t,'bypass'),false);assert.match(contextControls(t),/Program tier too low/);
  assert.throws(()=>ice(t,null,null,true),/unavailable/i);assert.equal(t.charges,3);
});

test('two ICE resolve in position order without duplicate Pursuit; defeat stops before later ICE',()=>{
  const s=run([['ice',3],['ice',4]]);s.breach=2;s.trace=6;s.pursuit=0;advance(s,'aggressive',10);ice(s,'Attack','Exploit');assert.equal(s.pending.id,element(s,'ice',4).id);ice(s,'Attack','Exploit');assert.deepEqual([s.breach,s.pursuit,s.net,s.events[0].iceEncounters],[5,1,1,2]);
  const first=run([['ice',3],['ice',4]]);first.breach=2;advance(first,'aggressive',10);ice(first,'Attack','Defend');assert.equal(first.breach,3);assert.equal(element(first,'ice',4).status,'active');assert.equal(first.events[0].iceEncounters,1);
  const second=run([['ice',3],['ice',4]]);second.breach=2;advance(second,'aggressive',10);ice(second,'Attack','Exploit');ice(second,'Attack','Defend');assert.deepEqual([second.breach,second.events[0].lostToIce,second.events[0].iceWins,second.events[0].iceLosses],[4,1,1,1]);
});

test('nodes before and after ICE, earliest choice, extraction and stopped movement',()=>{
  const before=run([['node',3],['ice',4]]);before.breach=2;advance(before,'aggressive',10);assert.equal(before.pending.type,'streamNode');nodePass(before,true);assert.equal(before.breach,3);assert.equal(before.net,1);assert.equal(before.pending,null);assert.equal(before.events[0].discarded,2);assert.equal(before.events[0].iceEncounters,0);extract(before,10);assert.equal(before.net,2);
  const after=run([['ice',3],['node',4]]);after.breach=2;advance(after,'aggressive',10);ice(after,'Attack','Defend');assert.equal(after.pending,null);assert.equal(element(after,'node',4).status,'active');
  const win=run([['ice',3],['node',4],['node',5]]);win.breach=2;advance(win,'aggressive',10);ice(win,'Attack','Exploit');assert.equal(win.pending.type,'streamNode');nodePass(win,false);assert.equal(win.pending,null);assert.equal(win.breach,5);assert.equal(element(win,'node',4).status,'skipped');assert.equal(element(win,'node',5).status,'skipped');assert.deepEqual(win.events[0].skipped,[element(win,'node',4).id,element(win,'node',5).id]);
});

test('Sentries resolve once around ICE; detection, pursued ICE loss and objective precedence',()=>{
  const s=run([['sentry',3],['ice',4]]);s.breach=2;s.trace=3;advance(s,'aggressive',10);assert.equal(s.pending.type,'streamSentry');sentryChoice(s,false);assert.equal(s.pursuit,0);assert.equal(s.pending.type,'streamIce');ice(s,'Attack','Defend');assert.deepEqual([s.breach,s.pursuit,s.net,s.trace],[4,2,1,6]);assert.equal(s.events[0].sentryEffect,'+2 Trace');
  const t=run([['ice',3],['sentry',4]]);t.breach=2;advance(t,'aggressive',10);ice(t,'Attack','Exploit');assert.equal(t.pending.type,'streamSentry');sentryChoice(t,false);assert.equal(element(t,'sentry',4).status,'crossed');assert.equal(t.events[0].actual,3);
  const u=run([['ice',7]],8);u.breach=6;u.trace=5;u.pursuit=6;advance(u,'aggressive',20);assert.equal(u.pending.type,'streamIce');ice(u,'Attack','Exploit');assert.equal(u.breach,8);assert.equal(u.status,'success');assert.equal(u.pursuit,6);
});

test('Breach 8 changes internal completion, bars, map and reports; mixed history stays separate',()=>{
  const s=run([],8);s.breach=6;advance(s,'cautious',20);assert.equal(s.status,'success');assert.equal(s.breach,8);assert.match(statusPanel(s),/BREACH<\/small><strong>8<em> \/ 8/);assert.match(gameContent(s,'map'),/BREACH 8 \/ 8/);
  assert.equal(mapCells(s.network,0).length,9);assert.equal(mapCells(s.network,0).at(-1).objective,true);assert.match(timeline(s.network,0),/OBJECTIVE/);
  const ten=run([],10);ten.breach=6;advance(ten,'cautious',20);assert.equal(ten.status,'active');
  const historical=newRun(generate('old','Easy',1),hacker());delete historical.ruleset;delete historical.target;delete historical.modifiers;historical.appVersion='0.1.3';
  const groups=configurationGroups([s,ten,historical]);assert.equal(groups.length,3);assert.ok(groups.some(g=>g.key.includes('streamlined [streamlined-test-1]')&&g.key.includes('Breach 8')));assert.ok(groups.some(g=>g.key.includes('canonical [test-1]')&&g.key.includes('Breach 10')));
  const text=report([s,ten,historical],true,new Date('2026-10-27T08:25:00Z'));assert.match(text,/ruleset=streamlined target=8/);assert.match(text,/ruleset=canonical target=10/);assert.match(text,/MIXED PLAYTEST CONDITIONS/);assert.match(text,/Exported at: 2026-10-27T08:25:00.000Z/);
});
