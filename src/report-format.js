import {APP_VERSION,CANON,ASSUMPTIONS,STREAMLINED_ASSUMPTIONS,NETWORK_ASSUMPTIONS,ruleset,breachTarget,traceLimit,memoryCapacity,currentRules} from './engine.js?v=0.2.0';
import {visibility} from './profile.js?v=0.2.0';
import {normaliseModifiers,modifierKey,signed} from './modifiers.js?v=0.2.0';
import {stats} from './report.js?v=0.2.0';
import {configurationGroups,rulesetGroups,runMetrics} from './comparison.js?v=0.2.0';
export {configurationGroups,rulesetGroups,runMetrics} from './comparison.js?v=0.2.0';

const completion=runs=>`${runs.filter(x=>x.status==='success').length}/${runs.length} (${runs.length?(100*runs.filter(x=>x.status==='success').length/runs.length).toFixed(1):'—'}%)`;
export function modifierGroups(runs){
  const map=new Map();for(const run of runs){const key=modifierKey(run);if(!map.has(key))map.set(key,[]);map.get(key).push(run)}
  return [...map].sort(([a],[b])=>a.localeCompare(b)).map(([key,group])=>({key,runs:group.length,success:group.filter(x=>x.status==='success').length,rate:completion(group),canonical:key==='+0 / +0',
    difficulty:Object.fromEntries(['Easy','Standard','Hard'].map(k=>[k,completion(group.filter(x=>x.network.difficulty===k))])),
    tier:Object.fromEntries([1,2,3,4].map(k=>[k,completion(group.filter(x=>x.network.tier===k))])),
    visibility:Object.fromEntries(['fog','full','legacy-full'].map(k=>[k,completion(group.filter(x=>visibility(x)===k))]))}));
}
export function report(runs,detailed=false,generated=new Date()){
  const s=stats(runs),groups=modifierGroups(runs),configurations=configurationGroups(runs),mixed=configurations.length>1;
  const out=[`NOVUM NETWORK INTRUSION — ${detailed?'DETAILED':'SUMMARY'} PLAYTEST DATA`,
    `Exported at: ${generated.toISOString()}`,
    `App ${APP_VERSION} | Canon ${CANON} | Current assumptions ${NETWORK_ASSUMPTIONS}; historical ${ASSUMPTIONS} / ${STREAMLINED_ASSUMPTIONS} | Export schema 4`,
    'Program check modifiers (Cautious / Aggressive; nondefault values are diagnostic):',
    'Current Network Intrusion: Breach 10, Trace 8, external Facility Alert 0-3, feat-derived Memory and specialist access. Historical runs retain their saved version and ruleset.',
    ...groups.map(g=>`  ${g.key}: ${g.runs} runs, ${g.success} success, completion ${g.rate} · ${g.canonical?'zero roll modifiers':'modified playtest'}`),
    `Visibility: fog ${runs.filter(x=>visibility(x)==='fog').length}, full ${runs.filter(x=>visibility(x)==='full').length}, legacy full/unspecified ${runs.filter(x=>visibility(x)==='legacy-full').length} (variant results should be compared separately)`,
    `Runs ${s.runs} | Outcomes: ${s.success} success, ${runs.filter(x=>x.status==='ejected').length} ejected, ${runs.filter(x=>x.status==='abandoned').length} abandoned | ${mixed?'MIXED PLAYTEST CONDITIONS · combined completion':'Completion'} ${s.rate}`,
    'Ruleset / target overview:',
    ...rulesetGroups(runs).map(g=>`  ${g.key}: ${g.runs} runs, completion ${g.rate}`),
    'Exact playtest configurations (ruleset, objective, modifiers, difficulty, tier, visibility):',
    ...configurations.map(g=>`  ${g.key}: ${g.rate}; Program checks/run ${g.checksAvg}; ICE confrontations/run ${g.iceAvg}; interactions/run ${g.interactionsAvg}; NET/run ${g.netAvg}; Main/run ${g.mainAvg}; Memory/charges used ${g.memoryAvg}; detected ${g.detected}; nodes extracted/run ${g.nodesAvg}; Sentries triggered/run ${g.sentriesAvg}; actual Breach/Basic ${g.breachPerBasic} (Cautious ${g.cautiousPerAction}, Aggressive ${g.aggressivePerAction}); ICE movement lost/run ${g.lostIceAvg}; Sentry movement lost/run ${g.lostSentryAvg}; early ejections ${g.earlyEjections}`),
    'Per-modifier context (all modes combined; compare exact configurations above):',
    ...groups.map(g=>`  ${g.key} | Difficulty ${Object.entries(g.difficulty).map(([k,v])=>`${k} ${v}`).join('; ')} | Network tier ${Object.entries(g.tier).map(([k,v])=>`T${k} ${v}`).join('; ')} | Visibility ${Object.entries(g.visibility).map(([k,v])=>`${k} ${v}`).join('; ')}`),
    `Difficulty (all runs): ${Object.entries(s.byDifficulty).map(([k,v])=>`${k} ${v}`).join('; ')}`,
    `Tier (all runs): ${Object.entries(s.byTier).map(([k,v])=>`T${k} ${v}`).join('; ')}`,
    `Successful NET actions avg/median ${s.netAvg}/${s.netMedian}; physical Main-action rounds avg/median ${s.roundAvg}/${s.roundMedian}`,
    `Rewards avg ${s.rewardsAvg}; attempts ${s.nodes.attempted}/${s.nodes.available} available; extracted ${s.nodes.extracted}; skipped ${s.nodes.skipped}; left uncollected ${s.nodes.abandoned}`,
    `Charges spent avg ${s.chargesAvg}; Program checks ${s.checks.success}/${s.checks.total}; ICE W/L/draw ${s.ice.wins}/${s.ice.losses}/${s.ice.draws}; Sentries encountered ${s.sentries}`,
    `NET actions: Barrier ${s.actions.barrier}; ICE ${s.actions.ice}; Reward ${s.actions.reward}. Specialist charge spending: ${Object.entries(s.charges).map(([k,v])=>`${k} ${v}`).join(', ')}`,
    `Programs: ${Object.entries(s.programs).map(([k,v])=>`${k} ${v.uses} uses, ${v.wins}/${v.rolls} successful checks`).join('; ')||'none'}`,
    'Objective completion wins before same-action Pursuit catch. Current runs use the published 2026-10-29-r1 procedure; older modes remain historical. Initial connection and rewards are scenario abstractions; enemy Hackers are excluded.'
  ];
  for(const x of runs){const m=normaliseModifiers(x.modifiers),metrics=runMetrics(x);
    out.push(`RUN ${x.id} ${x.started}→${x.finished||'in progress'} ${x.status} | ${x.network.difficulty} T${x.network.tier} DV${x.network.dv} seed=${x.network.seed} | app=${x.appVersion??'legacy'} canon=${x.canon??'historical'} assumptions=${x.assumptions??ASSUMPTIONS} ruleset=${ruleset(x)} target=${breachTarget(x)} Alert=${x.alert??'legacy 0'} startingTrace=${x.startingTrace??0} traceLimit=${traceLimit(x)} visibility=${visibility(x)} | INT${x.hacker.int} Program${x.hacker.program} ${currentRules(x)?`feat=${x.hacker.feat} backdoorUsed=${!!x.backdoorUsed} terminal=${x.terminalId}`:`specialists=${JSON.stringify(x.hacker.programs)}`} | modifiers Cautious ${signed(m.cautious)}, Aggressive ${signed(m.aggressive)}${x.modifiers?'':' (legacy +0/+0)'} | B${x.breach} T${x.trace} P${x.pursuit??'inactive'} Memory/charges=${x.charges} spent=${memoryCapacity(x)-x.charges} Main=${x.main} NET=${x.net} | checks=${metrics.programSuccesses}/${metrics.programChecks} ICE encounters=${metrics.iceEncounters} confrontations=${metrics.iceConfrontations} W/L/draw=${metrics.iceWins}/${metrics.iceLosses}/${metrics.iceDraws} bypass=${metrics.iceBypasses} interruptions=${metrics.iceInterruptions} lost=${metrics.movementLostToIce} preserved=${metrics.movementPreservedAfterIce} actual Cautious=${metrics.cautiousActual}/${metrics.cautiousActions} Aggressive=${metrics.aggressiveActual}/${metrics.aggressiveActions} nodes encountered/attempted/extracted/failed/skipped=${metrics.nodesEncountered}/${metrics.nodeAttempts}/${metrics.nodeExtracted}/${metrics.nodesFailed}/${metrics.nodeSkipped} sentries triggered/spoofed=${metrics.sentriesTriggered}/${metrics.sentriesSpoofed} Sentry movement lost=${metrics.movementLostToSentries} detected=${metrics.detected} | network=${x.network.elements.map(e=>`${e.type}@${e.pos}:${e.status}`).join(',')}`);
    if(detailed)for(const e of x.events){const breakdown=['cautious','aggressive'].includes(e.kind)&&e.die!=null&&e.playtestModifier!==undefined?`d20 ${e.die} + INT ${e.int} + Program ${e.programRank} (base ${e.baseBonus}) + TEST-ONLY ${signed(e.playtestModifier)} = ${e.total} vs DV ${e.dv} ${e.success?'SUCCESS':'FAILURE'}`:`${e.die??''} ${e.total??''}/${e.dv??''} ${e.success??''}`;
      out.push(`  #${e.index} ${e.time} ${e.kind} ${breakdown} ${JSON.stringify(e.before)} -> ${JSON.stringify(e.after)} ${JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k])=>!['index','time','kind','die','total','dv','success','before','after','int','programRank','baseBonus','playtestModifier'].includes(k))))}`)}
  }
  return out.join('\n');
}
