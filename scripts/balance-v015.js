// Deterministic exploratory simulation. Policy choices are explicit, not game rules.
import {generate,newRun,advance,ice,rollIce,sentryChoice,extract,skipNode,useSpecial,eligible,rng} from '../src/engine.js';
import {preset} from '../src/profile.js';
import {runMetrics} from '../src/comparison.js';

const count=Number(process.argv[2]??150);
if(!Number.isInteger(count)||count<1||count>5000)throw Error('Batch size must be 1-5000');
const difficulties=['Easy','Standard','Hard'],programPolicies=['cautious','aggressive','mixed'],nodePolicies=['skip','selective','all'];
const results=[];
for(const difficulty of difficulties)for(let alert=0;alert<=3;alert++)for(const program of programPolicies)for(const nodes of nodePolicies){
  let runs=[];
  for(let i=0;i<count;i++){
    const seed=`balance-v15/${difficulty}/${alert}/${program}/${nodes}/${i}`;
    const random=rng(seed+'/dice'),die=()=>Math.floor(random()*20)+1;
    const session=newRun(generate(seed,difficulty,1,{ruleset:'streamlined',alert,target:10}),preset(1,'T1 competent'));
    session.visibility='full';
    for(let step=0;step<100&&session.status==='active';step++){
      if(session.pending?.type==='stream15Node'){
        const attempt=nodes==='all'||nodes==='selective'&&session.breach<6&&session.trace<5;
        if(!attempt)skipNode(session);
        else if(eligible(session,'override')&&session.trace>=6)extract(session,null,true);
        else extract(session,die());
      }else if(session.pending?.type==='stream15Sentry'){
        sentryChoice(session,eligible(session,'spoof')&&session.charges>1);
      }else if(session.pending?.type==='stream15Ice'){
        if(!session.pending.rounds.length&&eligible(session,'bypass')&&session.charges>0)ice(session,null,null,true);
        else ice(session,'Attack',rollIce(session));
      }else{
        if(eligible(session,'trace')&&session.trace>=5&&session.pursuit===null)useSpecial(session,'trace');
        const kind=program==='mixed'?session.breach>=6?'aggressive':'cautious':program;
        advance(session,kind,die());
      }
    }
    if(session.status==='active')session.status='cutoff';
    runs.push(session);
  }
  const avg=fn=>Number((runs.reduce((n,x)=>n+fn(x),0)/runs.length).toFixed(2));
  results.push({difficulty,alert,program,nodes,runs:count,completed:runs.filter(x=>x.status==='success').length,completionPct:avg(x=>x.status==='success'?100:0),
    avgNet:avg(x=>x.net),avgMain:avg(x=>x.main),detectedPct:avg(x=>x.pursuit!==null?100:0),
    avgMemoryUsed:avg(x=>3-x.charges),avgResources:avg(x=>runMetrics(x).nodeExtracted),
    avgIceEncounters:avg(x=>runMetrics(x).iceEncounters),avgIceWins:avg(x=>runMetrics(x).iceWins),
    avgSentryPenalty:avg(x=>runMetrics(x).movementLostToSentries),ejected:runs.filter(x=>x.status==='ejected').length,
    cutoffs:runs.filter(x=>x.status==='cutoff').length});
}
console.log(JSON.stringify({assumptions:'streamlined-test-2',sampleSizePerConfiguration:count,policy:'T1 INT3 Program3 vs T1; Trace Removal at 5+ while undetected; ICE Bypass if available; Sentry Spoof while >1 Memory; Override only at Trace 6+; Attack ICE; Mixed Cautious until Breach6, then Aggressive; Selective node only before Breach6 and Trace5',results},null,2));
