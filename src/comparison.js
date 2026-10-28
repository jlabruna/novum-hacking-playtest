import {ruleset,breachTarget,memoryCapacity} from './engine.js?v=0.2.1';
import {visibility} from './profile.js?v=0.2.1';
import {modifierKey} from './modifiers.js?v=0.2.1';

const avg=values=>values.length?(values.reduce((n,x)=>n+x,0)/values.length).toFixed(2):'—';
const rate=runs=>runs.length?`${runs.filter(x=>x.status==='success').length}/${runs.length} (${(100*runs.filter(x=>x.status==='success').length/runs.length).toFixed(1)}%)`:'0/0 (—)';
export function runMetrics(run){
  const events=run.events||[],basic=events.filter(e=>['cautious','aggressive','tunnel'].includes(e.kind));
  const ice=events.filter(e=>e.kind==='ice');
  const rounds=basic.flatMap(e=>e.iceRounds||[]).concat(ice.flatMap(e=>e.rounds||[]));
  return {
    programChecks:events.filter(e=>e.die!=null).length,programSuccesses:events.filter(e=>e.die!=null&&e.success).length,
    iceEncounters:basic.reduce((n,e)=>n+(e.iceEncounters||0),0)+ice.length,
    iceConfrontations:rounds.length,iceWins:basic.reduce((n,e)=>n+(e.iceWins||0),0)+ice.filter(e=>e.result==='win'&&!e.bypass).length,
    iceLosses:basic.reduce((n,e)=>n+(e.iceLosses||0),0)+ice.filter(e=>e.result==='loss').length,
    iceDraws:rounds.filter(r=>r.result==='draw').length,
    iceBypasses:basic.reduce((n,e)=>n+(e.iceBypasses||0),0)+ice.filter(e=>e.bypass).length,
    iceInterruptions:basic.filter(e=>e.interruptedByIce).length,
    movementLostToIce:basic.reduce((n,e)=>n+(e.lostToIce||0),0),
    movementPreservedAfterIce:basic.reduce((n,e)=>n+(e.preservedAfterIce||0),0),
    movementLostToSentries:basic.reduce((n,e)=>n+(e.lostToSentry||0),0),
    sentriesTriggered:basic.reduce((n,e)=>n+(e.sentriesTriggered||0),0)+events.filter(e=>e.sentry&&!e.spoof&&!e.sentriesTriggered).length,
    sentriesSpoofed:basic.reduce((n,e)=>n+(e.sentriesSpoofed||0),0)+events.filter(e=>e.sentry&&e.spoof&&!e.sentriesSpoofed).length,
    nodesEncountered:basic.reduce((n,e)=>n+(e.nodesEncountered?.length||0),0),
    nodesFailed:run.network.elements.filter(e=>e.type==='node'&&e.status==='failed').length,
    detected:run.pursuit!==null,startingAlert:run.alert??0,startingTrace:run.startingTrace??0,
    cautiousActions:basic.filter(e=>e.kind==='cautious').length,cautiousActual:basic.filter(e=>e.kind==='cautious').reduce((n,e)=>n+(e.actual||0),0),
    aggressiveActions:basic.filter(e=>e.kind==='aggressive').length,aggressiveActual:basic.filter(e=>e.kind==='aggressive').reduce((n,e)=>n+(e.actual||0),0),
    netActions:run.net,mainActions:run.main,chargesUsed:memoryCapacity(run)-run.charges,
    nodeAttempts:events.filter(e=>e.kind==='extract').length,nodeExtracted:run.network.elements.filter(e=>e.type==='node'&&e.status==='extracted').length,
    nodeSkipped:run.network.elements.filter(e=>e.type==='node'&&e.status==='skipped').length,
    earlyEjection:run.status==='ejected'&&run.breach<breachTarget(run)/2
  };
}
export function configurationGroups(runs){
  const map=new Map();
  for(const run of runs){const mode=ruleset(run),target=breachTarget(run),modifiers=modifierKey(run),difficulty=run.network.difficulty,tier=run.network.tier,fog=visibility(run);
    const key=`${mode} [${run.assumptions??'legacy'}] / Alert ${run.alert??'legacy 0'} / Breach ${target} / Cautious/Aggressive ${modifiers} / ${difficulty} T${tier} / ${fog}`;
    if(!map.has(key))map.set(key,[]);map.get(key).push(run)}
  return [...map].sort(([a],[b])=>a.localeCompare(b)).map(([key,group])=>{
    const m=group.map(runMetrics),sum=k=>m.reduce((n,x)=>n+x[k],0),basic=sum('cautiousActions')+sum('aggressiveActions');
    return {key,runs:group.length,success:group.filter(x=>x.status==='success').length,rate:rate(group),
      checksAvg:avg(m.map(x=>x.programChecks)),iceAvg:avg(m.map(x=>x.iceConfrontations)),
      interactionsAvg:avg(m.map(x=>x.programChecks+x.iceConfrontations+x.iceBypasses)),
      netAvg:avg(m.map(x=>x.netActions)),mainAvg:avg(m.map(x=>x.mainActions)),chargesAvg:avg(m.map(x=>x.chargesUsed)),
      breachPerBasic:basic?((sum('cautiousActual')+sum('aggressiveActual'))/basic).toFixed(2):'—',
      cautiousPerAction:sum('cautiousActions')?(sum('cautiousActual')/sum('cautiousActions')).toFixed(2):'—',
      aggressivePerAction:sum('aggressiveActions')?(sum('aggressiveActual')/sum('aggressiveActions')).toFixed(2):'—',
      lostIceAvg:avg(m.map(x=>x.movementLostToIce)),lostSentryAvg:avg(m.map(x=>x.movementLostToSentries)),memoryAvg:avg(m.map(x=>x.chargesUsed)),detected:sum('detected'),nodesAvg:avg(m.map(x=>x.nodeExtracted)),sentriesAvg:avg(m.map(x=>x.sentriesTriggered)),earlyEjections:sum('earlyEjection')};
  });
}
export function rulesetGroups(runs){const keys=new Map();for(const run of runs){const key=`${ruleset(run)} [${run.assumptions??'legacy'}] / Alert ${run.alert??'legacy 0'} / Breach ${breachTarget(run)}`;if(!keys.has(key))keys.set(key,[]);keys.get(key).push(run)}return [...keys].map(([key,group])=>({key,runs:group.length,rate:rate(group)}))}
