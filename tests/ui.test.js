import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PROGRAMS,generate,newRun,advance,eligible} from '../src/engine.js';
import {PRESETS,preset,migrateHacker,migrateSettings,visibility} from '../src/profile.js';
import {mapCells,securityGap} from '../src/view.js';
import {timeline,contextControls,eventsPanel,statusPanel,specialistPanel} from '../src/game-ui.js';
import {setupContent} from '../src/setup-ui.js';
import {report} from '../src/report.js';

test('four Hacker presets set approved INT, Program, bonus and all specialist defaults',()=>{
  for(const [tier,expected] of Object.entries({1:[3,3,6],2:[4,4,8],3:[5,5,10],4:[5,6,11]})){
    const p=preset(tier,'Hacker');assert.deepEqual([p.int,p.program,p.int+p.program],expected);
    assert.equal(p.tier,Number(tier));assert.equal(p.custom,false);
    for(const k of PROGRAMS)assert.equal(p.programs[k],Number(tier));
    assert.match(setupContent(p),new RegExp(`d20 \\+ ${expected[0]} \\+ ${expected[1]} = d20 \\+ ${expected[2]}`));
  }
  assert.equal(PRESETS[4].program,6);
});

test('legacy manual profile and individual overrides survive migration without tier coercion',()=>{
  const old={name:'Old',int:2,program:5,programs:{trace:0,fortify:2,bypass:4,override:1,spoof:3}};
  assert.deepEqual(migrateHacker(old),{...old,tier:null,custom:true,modifiers:{cautious:0,aggressive:0},streamlinedModifiers:{cautious:2,aggressive:0}});
  const custom={...preset(3),custom:true,programs:{...preset(3).programs,spoof:0}};
  assert.deepEqual(migrateHacker(custom),custom);
  assert.equal(migrateSettings({largeText:true}).fog,false);
  assert.equal(migrateSettings({largeText:false,fog:false}).fog,false);
});

test('complete preview and optional fog conceal future contents, reveal reached cells, retain objective',()=>{
  const n=generate('fog-seed','Hard',2);const far=n.elements.find(e=>e.pos>1);
  const preview=mapCells(n,0,{fog:true,preview:true});
  assert.ok(preview[far.pos].items.length);assert.equal(preview[10].objective,true);
  const hidden=mapCells(n,0,{fog:true});assert.equal(hidden[far.pos].concealed,true);assert.deepEqual(hidden[far.pos].items,[]);
  assert.match(timeline(n,0,{fog:true}),/OBJECTIVE/);assert.doesNotMatch(timeline(n,0,{fog:true}),/BARRIER|RESOURCE|SENTRY|ICE/);
  const visible=mapCells(n,0,{fog:false});assert.ok(visible[far.pos].items.length);
  const reached=mapCells(n,far.pos,{fog:true});assert.ok(reached[far.pos].items.length);
});

test('matched ten-segment tracks show inactive Pursuit, live gap and six Trace positions',()=>{
  const r=newRun(generate('status','Easy',1),preset(1));
  assert.equal(securityGap(r),null);let html=statusPanel(r);
  assert.match(html,/PURSUIT <b>INACTIVE/);assert.match(html,/GAP <b>—/);
  assert.equal((html.match(/class="segments /g)||[]).length,1);
  assert.equal((html.match(/<i class=/g)||[]).length,6);
  r.breach=5;r.pursuit=2;r.trace=6;html=statusPanel(r);
  assert.equal(securityGap(r),3);assert.match(html,/GAP <b>3/);assert.match(html,/DETECTED/);
});

test('contextual options remain encounter-specific and tabs do not mutate run',()=>{
  const r=newRun(generate('contexts','Hard',1),preset(4));
  assert.match(contextControls(r),/CAUTIOUS/);assert.match(contextControls(r),/AGGRESSIVE/);
  assert.doesNotMatch(contextControls(r),/TUNNEL|ATTACK|EXTRACT/);
  const snapshot=structuredClone(r);
  assert.match(eventsPanel(r,'events'),/LATEST EVENTS/);assert.match(eventsPanel(r,'map'),/NETWORK DETAILS/);
  assert.deepEqual(r,snapshot);
  const barrier=r.network.elements.find(e=>e.type==='barrier');r.breach=barrier.pos;
  assert.match(contextControls(r),/TUNNEL/);assert.doesNotMatch(contextControls(r),/CAUTIOUS/);
  const ice=r.network.elements.find(e=>e.type==='ice');r.breach=ice.pos;
  assert.match(contextControls(r),/ATTACK/);assert.match(contextControls(r),/ICE BYPASS/);
  const node=r.network.elements.find(e=>e.type==='node');r.breach=node.pos;
  assert.match(contextControls(r),/EXTRACT/);assert.match(contextControls(r),/OVERRIDE/);
  r.breach=2;assert.match(specialistPanel(r),/FORTIFY/);
});

test('new runs log version and fog mode; old runs remain unspecified in exports',()=>{
  const r=newRun(generate('export','Easy',1),preset(1));r.visibility='fog';
  const old=structuredClone(r);delete old.visibility;old.appVersion='0.1.1';
  assert.equal(visibility(old),'legacy-full');
  const text=report([r,old]);assert.match(text,/fog 1, full 0, legacy full\/unspecified 1/);
  assert.match(text,/app=0.1.6 assumptions=test-1 ruleset=canonical target=10 Alert=legacy 0 startingTrace=0 traceLimit=6 visibility=fog/);assert.match(text,/app=0.1.1 assumptions=test-1 ruleset=canonical target=10 Alert=legacy 0 startingTrace=0 traceLimit=6 visibility=legacy-full/);
});

test('mobile status bar, bottom navigation, contextual layout and settings hooks are present',()=>{
  const css=readFileSync('style.css','utf8'),html=readFileSync('index.html','utf8'),app=readFileSync('src/app.js','utf8');
  assert.match(html,/viewport-fit=cover/);assert.match(css,/body\{padding-top:env\(safe-area-inset-top\)/);
  assert.match(css,/nav\{position:fixed/);assert.match(css,/safe-area-inset-bottom/);
  assert.match(app,/id="fog"/);assert.match(app,/run.visibility=modernStreamlined\(run\)\?'full':settings.fog\?'fog':'full'/);
  assert.match(app,/infoTab=a.slice\(4\)/);
  assert.match(html,/src\/app\.js\?v=0\.1\.6/);assert.match(html,/style\.css\?v=0\.1\.6/);
  assert.match(readFileSync('public/sw.js','utf8'),/e\.request\.mode==='navigate'/);
});
