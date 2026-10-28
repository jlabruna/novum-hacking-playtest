import {writeFileSync} from 'node:fs';
import {generate,newRun,advance,ice,extract,skipNode,sentryChoice,useSpecial,eligible,rollIce,resolveBackdoor,rng} from '../src/engine.js';
import {preset} from '../src/profile.js';

const trials=Number(process.argv[2]||500),profiles=[0,1,4,6,10];
if(!Number.isInteger(trials)||trials<1||trials>100000)throw Error('Trials must be 1–100000');
const results=[];
for(const feat of profiles){
  const runs=[];
  for(let i=0;i<trials;i++){
    const seed=`canon-v020-${i}`,network=generate(seed,'Standard',1,{ruleset:'network',alert:0});
    const hacker={...preset(1),feat,int:3,program:3};
    const s=newRun(network,hacker),dice=rng(`${seed}/player-rolls`);
    const die=()=>Math.floor(dice()*20)+1;
    for(let steps=0;s.status==='active'||s.status==='backdoor-choice';steps++){
      if(steps>100)throw Error(`Simulation did not terminate: ${feat}/${seed}`);
      if(s.status==='backdoor-choice'){resolveBackdoor(s,true,0);continue}
      if(s.pending?.type==='stream15Ice'){if(eligible(s,'bypass')&&!s.pending.rounds.length)ice(s,null,null,true);else ice(s,['Attack','Exploit','Defend'][Math.floor(dice()*3)],rollIce(s));continue}
      if(s.pending?.type==='stream15Node'){if(eligible(s,'override'))extract(s,null,true);else extract(s,die());continue}
      if(s.pending?.type==='stream15Sentry'){sentryChoice(s,eligible(s,'spoof'));continue}
      if(eligible(s,'trace')&&s.trace>=4&&s.pursuit===null){useSpecial(s,'trace');continue}
      if(eligible(s,'fortify')&&s.pursuit!==null&&s.breach>1&&s.breach-1>s.pursuit&&s.fortify===null){useSpecial(s,'fortify');continue}
      advance(s,s.trace>=5?'aggressive':'cautious',die());
    }
    runs.push(s);
  }
  const count=(f)=>runs.filter(f).length,events=runs.flatMap(s=>s.events),success=count(s=>s.status==='success');
  const usages=Object.fromEntries(['trace','fortify','bypass','override','spoof','backdoor'].map(kind=>[kind,events.filter(e=>e.kind===kind||kind==='bypass'&&e.iceBypasses||kind==='override'&&e.kind==='extract'&&e.override||kind==='spoof'&&e.spoof).length]));
  results.push({feat,runs:trials,completion:success,completionRate:+(100*success/trials).toFixed(2),detected:count(s=>s.pursuit!==null||s.events.some(e=>e.after?.pursuit!==null)),ejected:count(s=>s.status==='ejected'),meanNet:+(runs.reduce((n,s)=>n+s.net,0)/trials).toFixed(2),meanNetSuccess:success?+(runs.filter(s=>s.status==='success').reduce((n,s)=>n+s.net,0)/success).toFixed(2):null,programUse:usages});
}
const output={version:'0.2.0',canon:'2026-10-29-r1',conditions:{difficulty:'Standard',tier:1,alert:0,int:3,program:3,seedPrefix:'canon-v020-',policy:'Cautious until Trace 5, then Aggressive; attempt each node, Override and Spoof when available, Bypass when available, Trace Removal at 4+, Fortify when viable, use Backdoor on ejection; deterministic player rolls and ICE.'},results};
writeFileSync('validation/balance-v020.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
