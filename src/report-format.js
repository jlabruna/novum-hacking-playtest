import {APP_VERSION,CANON,ASSUMPTIONS} from './engine.js?v=0.1.3';
import {visibility} from './profile.js?v=0.1.3';
import {normaliseModifiers,modifierKey,signed} from './modifiers.js?v=0.1.3';
import {stats} from './report.js?v=0.1.3';

const completion=runs=>`${runs.filter(x=>x.status==='success').length}/${runs.length} (${runs.length?(100*runs.filter(x=>x.status==='success').length/runs.length).toFixed(1):'—'}%)`;
export function modifierGroups(runs){
  const map=new Map();for(const run of runs){const key=modifierKey(run);if(!map.has(key))map.set(key,[]);map.get(key).push(run)}
  return [...map].sort(([a],[b])=>a.localeCompare(b)).map(([key,group])=>({key,runs:group.length,success:group.filter(x=>x.status==='success').length,rate:completion(group),canonical:key==='+0 / +0',
    difficulty:Object.fromEntries(['Easy','Standard','Hard'].map(k=>[k,completion(group.filter(x=>x.network.difficulty===k))])),
    tier:Object.fromEntries([1,2,3,4].map(k=>[k,completion(group.filter(x=>x.network.tier===k))])),
    visibility:Object.fromEntries(['fog','full','legacy-full'].map(k=>[k,completion(group.filter(x=>visibility(x)===k))]))}));
}
export function report(runs,detailed=false,generated=new Date()){
  const s=stats(runs),groups=modifierGroups(runs),mixed=groups.length>1;
  const out=[`NOVUM NETWORK INTRUSION — ${detailed?'DETAILED':'SUMMARY'} PLAYTEST DATA`,
    `Exported at: ${generated.toISOString()}`,
    `App ${APP_VERSION} | Canon ${CANON} | TEST-ONLY assumptions ${ASSUMPTIONS} | Schema 1`,
    'TEST-ONLY roll modifiers (Cautious / Aggressive):',
    ...groups.map(g=>`  ${g.key}: ${g.runs} runs, ${g.success} success, completion ${g.rate} · ${g.canonical?'canonical modifiers':'modified playtest'}`),
    `Visibility: fog ${runs.filter(x=>visibility(x)==='fog').length}, full ${runs.filter(x=>visibility(x)==='full').length}, legacy full/unspecified ${runs.filter(x=>visibility(x)==='legacy-full').length} (variant results should be compared separately)`,
    `Runs ${s.runs} | Outcomes: ${s.success} success, ${runs.filter(x=>x.status==='ejected').length} ejected, ${runs.filter(x=>x.status==='abandoned').length} abandoned | ${mixed?'MIXED MODIFIER CONDITIONS · combined completion':'Completion'} ${s.rate}`,
    'Per-configuration context:',
    ...groups.map(g=>`  ${g.key} | Difficulty ${Object.entries(g.difficulty).map(([k,v])=>`${k} ${v}`).join('; ')} | Network tier ${Object.entries(g.tier).map(([k,v])=>`T${k} ${v}`).join('; ')} | Visibility ${Object.entries(g.visibility).map(([k,v])=>`${k} ${v}`).join('; ')}`),
    `Difficulty (all runs): ${Object.entries(s.byDifficulty).map(([k,v])=>`${k} ${v}`).join('; ')}`,
    `Tier (all runs): ${Object.entries(s.byTier).map(([k,v])=>`T${k} ${v}`).join('; ')}`,
    `Successful NET actions avg/median ${s.netAvg}/${s.netMedian}; physical Main-action rounds avg/median ${s.roundAvg}/${s.roundMedian}`,
    `Rewards avg ${s.rewardsAvg}; attempts ${s.nodes.attempted}/${s.nodes.available} available; extracted ${s.nodes.extracted}; skipped ${s.nodes.skipped}; left uncollected ${s.nodes.abandoned}`,
    `Charges spent avg ${s.chargesAvg}; Program checks ${s.checks.success}/${s.checks.total}; ICE W/L/draw ${s.ice.wins}/${s.ice.losses}/${s.ice.draws}; Sentries encountered ${s.sentries}`,
    `NET actions: Barrier ${s.actions.barrier}; ICE ${s.actions.ice}; Reward ${s.actions.reward}. Specialist charge spending: ${Object.entries(s.charges).map(([k,v])=>`${k} ${v}`).join(', ')}`,
    `Programs: ${Object.entries(s.programs).map(([k,v])=>`${k} ${v.uses} uses, ${v.wins}/${v.rolls} successful checks`).join('; ')||'none'}`,
    'TEST-ONLY: objective completion wins before same-action Pursuit catch; detection action advances Pursuit; Fortify sits one segment behind Hacker and blocks one arrival; only earliest crossed node offers a stop, later nodes are passed. Initial connection and rewards are scenario abstractions; enemy Hackers excluded.'
  ];
  for(const x of runs){const m=normaliseModifiers(x.modifiers);
    out.push(`RUN ${x.id} ${x.started}→${x.finished||'in progress'} ${x.status} | ${x.network.difficulty} T${x.network.tier} DV${x.network.dv} seed=${x.network.seed} | app=${x.appVersion??'legacy'} visibility=${visibility(x)} | INT${x.hacker.int} Program${x.hacker.program} specialists=${JSON.stringify(x.hacker.programs)} | TEST-ONLY modifiers Cautious ${signed(m.cautious)}, Aggressive ${signed(m.aggressive)}${x.modifiers?'':' (legacy +0/+0)'} | B${x.breach} T${x.trace} P${x.pursuit??'inactive'} charges=${x.charges} Main=${x.main} NET=${x.net} | network=${x.network.elements.map(e=>`${e.type}@${e.pos}:${e.status}`).join(',')}`);
    if(detailed)for(const e of x.events){const breakdown=['cautious','aggressive'].includes(e.kind)&&e.die!=null&&e.playtestModifier!==undefined?`d20 ${e.die} + INT ${e.int} + Program ${e.programRank} (base ${e.baseBonus}) + TEST-ONLY ${signed(e.playtestModifier)} = ${e.total} vs DV ${e.dv} ${e.success?'SUCCESS':'FAILURE'}`:`${e.die??''} ${e.total??''}/${e.dv??''} ${e.success??''}`;
      out.push(`  #${e.index} ${e.time} ${e.kind} ${breakdown} ${JSON.stringify(e.before)} -> ${JSON.stringify(e.after)} ${JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k])=>!['index','time','kind','die','total','dv','success','before','after','int','programRank','baseBonus','playtestModifier'].includes(k))))}`)}
  }
  return out.join('\n');
}
