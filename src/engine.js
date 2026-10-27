import {normaliseModifiers} from './modifiers.js?v=0.1.4';
export const APP_VERSION='0.1.4', CANON='2026-10-27-r4', ASSUMPTIONS='test-1', STREAMLINED_ASSUMPTIONS='streamlined-test-1';
export const COUNTS={Easy:{barrier:1,ice:0,sentry:0,node:1},Standard:{barrier:2,ice:1,sentry:1,node:2},Hard:{barrier:2,ice:2,sentry:1,node:3}};
export const STREAMLINED_COUNTS=Object.fromEntries(Object.entries(COUNTS).map(([k,v])=>[k,{...v,barrier:0}]));
export const ruleset=run=>run.ruleset??run.network?.ruleset??'canonical';
export const breachTarget=run=>run.target??run.network?.target??10;
export const DV={1:14,2:16,3:18,4:20};
export const PROGRAMS=['trace','fortify','bypass','override','spoof'];
export function hashSeed(value){let h=2166136261;for(const c of String(value)){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0||1}
export function rng(seed){let n=hashSeed(seed);return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296}}
export function generate(seed,difficulty='Standard',tier=1,options={}){if(!COUNTS[difficulty]||!DV[tier])throw Error('Invalid network');const mode=options.ruleset??'canonical',target=mode==='streamlined'?(options.target??10):10;if(!['canonical','streamlined'].includes(mode)||![8,10].includes(target))throw Error('Invalid ruleset or objective');const rand=rng(seed),positions=Array.from({length:target-1},(_,i)=>i+1);for(let i=positions.length-1;i>0;i--){let j=Math.floor(rand()*(i+1));[positions[i],positions[j]]=[positions[j],positions[i]]}let elements=[],index=0;for(const [type,count] of Object.entries(mode==='streamlined'?STREAMLINED_COUNTS[difficulty]:COUNTS[difficulty]))for(let i=0;i<count;i++)elements.push({id:`${type}-${i+1}`,type,pos:positions[index++],status:'active'});return {seed:String(seed),difficulty,tier,dv:DV[tier],...(mode==='streamlined'?{ruleset:mode,target}:{}),elements:elements.sort((a,b)=>a.pos-b.pos||a.id.localeCompare(b.id))}}
export function newRun(network,hacker){const mode=ruleset({network}),target=breachTarget({network});return {schema:2,id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,appVersion:APP_VERSION,canon:CANON,assumptions:mode==='streamlined'?STREAMLINED_ASSUMPTIONS:ASSUMPTIONS,started:new Date().toISOString(),ruleset:mode,target,network:structuredClone(network),hacker:structuredClone(hacker),modifiers:normaliseModifiers(mode==='streamlined'?hacker.streamlinedModifiers??{cautious:2,aggressive:0}:hacker.modifiers),iceState:hashSeed(`${network.seed}/ice`),breach:0,trace:0,pursuit:null,charges:3,fortify:null,net:0,main:0,slots:0,status:'active',pending:null,events:[]}}
export function rollIce(s){let n=s.iceState;n^=n<<13;n^=n>>>17;n^=n<<5;s.iceState=n>>>0;return ['Attack','Exploit','Defend'][s.iceState%3]}
export function snapshot(s){return {breach:s.breach,trace:s.trace,pursuit:s.pursuit,charges:s.charges,net:s.net,main:s.main}}
function log(s,kind,detail,before){s.events.push({index:s.events.length+1,time:new Date().toISOString(),kind,before,after:snapshot(s),...detail})}
function net(s){if(s.slots===0)s.main++;s.net++;s.slots=(s.slots+1)%2}
function trace(s,n){s.trace=Math.min(6,s.trace+n);if(s.trace>=6&&s.pursuit===null)s.pursuit=0}
function pursuit(s,n=1){if(s.pursuit===null)return;for(let i=0;i<n;i++){let next=s.pursuit+1;if(s.fortify!==null&&next===s.fortify){s.fortify=null;continue}s.pursuit=next}}
function finishNet(s){if(s.breach>=breachTarget(s)){s.status='success';s.finished=new Date().toISOString();return}pursuit(s);if(s.pursuit!==null&&s.pursuit>=s.breach){s.status='ejected';s.finished=new Date().toISOString()}}
export function check(die,bonus,dv){return die===20||die!==1&&die+bonus>=dv}
export function eligible(s,name){return s.status==='active'&&s.charges>0&&Number(s.hacker.programs?.[name]||0)>=s.network.tier}
export function spend(s,name){if(!eligible(s,name))throw Error('Program unavailable or incompatible');s.charges--}
function activeAt(s,pos,type){return s.network.elements.find(e=>e.pos===pos&&e.type===type&&e.status==='active')}
export function useSpecial(s,name){if(s.status!=='active'||s.pending)throw Error('Resolve pending decision');let before=snapshot(s);spend(s,name);if(name==='trace'){if(s.pursuit!==null){s.charges++;throw Error('Trace cannot undo detection')}s.trace=Math.max(0,s.trace-2)}else if(name==='fortify'){let pos=s.breach-1;if(pos<=0||s.pursuit!==null&&pos<=s.pursuit){s.charges++;throw Error('No position behind Hacker ahead of Pursuit')}s.fortify=pos}else{ s.charges++;throw Error('Use this program at its encounter')}log(s,name,{fortify:s.fortify},before);return s}
export function advance(s,kind,die){if(ruleset(s)==='streamlined')return advanceStreamlined(s,kind,die);if(s.status!=='active'||s.pending)throw Error('Resolve pending decision');if(!['cautious','aggressive','tunnel'].includes(kind))throw Error('Unknown Program');let before=snapshot(s),barrier=activeAt(s,s.breach,'barrier');if(activeAt(s,s.breach,'node'))throw Error('Extract or skip the Resource Node first');if(kind==='tunnel'&&!barrier)throw Error('Tunnel requires current Barrier');if(kind!=='tunnel'&&(barrier||activeAt(s,s.breach,'ice')))throw Error('Resolve blocker first');if(!Number.isInteger(die)||die<1||die>20)throw Error('d20 required');net(s);let int=Number(s.hacker.int),programRank=Number(s.hacker.program),baseBonus=int+programRank,playtestModifier=kind==='tunnel'?0:normaliseModifiers(s.modifiers)[kind],total=die+baseBonus+playtestModifier;let success=check(die,baseBonus+playtestModifier,s.network.dv);let gain=success?(kind==='aggressive'?3:kind==='cautious'?2:1):0;trace(s,success?(kind==='aggressive'?2:1):(kind==='aggressive'?3:2));if(kind==='tunnel'&&success)barrier.status='cleared';let proposed=Math.min(10,s.breach+gain);let blocker=s.network.elements.filter(e=>e.status==='active'&&['barrier','ice'].includes(e.type)&&e.pos>s.breach&&e.pos<=proposed).sort((a,b)=>a.pos-b.pos)[0];if(blocker)proposed=blocker.pos;let nodes=s.network.elements.filter(e=>e.status==='active'&&e.type==='node'&&e.pos>s.breach&&e.pos<=proposed);let detail={program:kind,die,int,programRank,baseBonus,playtestModifier,total,dv:s.network.dv,success,proposed,blocker:blocker?.id||null};if(nodes.length&&success){s.pending={type:'nodePass',nodes:nodes.map(e=>e.id),proposed,detail,before};return s}return resolveMove(s,proposed,detail,before,[])}
function resolveMove(s,pos,detail,before,skipped){let old=s.breach;s.breach=pos;for(let e of s.network.elements.filter(e=>e.type==='sentry'&&e.status==='active'&&e.pos>old&&e.pos<=pos)){if(eligible(s,'spoof')){s.pending={type:'sentry',id:e.id,detail:{...detail,skipped},before};return s}detail.sentry=e.id;detail.sentryEffect=applySentry(s,e)}for(let id of skipped){let e=s.network.elements.find(e=>e.id===id);if(e)e.status='skipped'}finishNet(s);log(s,detail.program||'advance',{...detail,actual:s.breach-old,skipped},before);return s}
function applySentry(s,e){e.status='crossed';if(s.pursuit===null){trace(s,2);return '+2 Trace'}pursuit(s);return '+1 Pursuit'}
export function nodePass(s,stop=false){let p=s.pending;if(p?.type==='streamNode')return streamlinedNode(s,stop);if(p?.type!=='nodePass')throw Error('No node decision');s.pending=null;let first=s.network.elements.find(e=>e.id===p.nodes[0]);let skipped=stop?[]:p.nodes;if(stop){p.detail.nodeStop=first.id;p.detail.discarded=p.proposed-first.pos}return resolveMove(s,stop?first.pos:p.proposed,p.detail,p.before,skipped)}
export function sentryChoice(s,spoof=false){let p=s.pending;if(p?.type==='streamSentry')return streamlinedSentry(s,spoof);if(p?.type!=='sentry')throw Error('No sentry decision');let e=s.network.elements.find(e=>e.id===p.id);s.pending=null;let sentryEffect;if(spoof){spend(s,'spoof');e.status='spoofed';sentryEffect='prevented'}else sentryEffect=applySentry(s,e);let next=s.network.elements.filter(x=>x.type==='sentry'&&x.status==='active'&&x.pos<=s.breach&&x.pos>p.before.breach)[0];if(next&&eligible(s,'spoof')){s.pending={...p,id:next.id};return s}if(next)applySentry(s,next);for(let id of p.detail.skipped||[]){let n=s.network.elements.find(x=>x.id===id);if(n)n.status='skipped'}finishNet(s);log(s,p.detail.program,{...p.detail,actual:s.breach-p.before.breach,sentry:e.id,sentryEffect,spoof},p.before);return s}
export function extract(s,die,override=false){if(s.status!=='active'||s.pending)throw Error('Not available');let e=activeAt(s,s.breach,'node');if(!e)throw Error('No node here');let before=snapshot(s);if(override)spend(s,'override');else if(!Number.isInteger(die)||die<1||die>20)throw Error('d20 required');net(s);let success=override||check(die,Number(s.hacker.int)+Number(s.hacker.program),s.network.dv);e.status=success?'extracted':'failed';trace(s,success?1:2);finishNet(s);log(s,'extract',{node:e.id,override,die:override?null:die,total:override?null:die+Number(s.hacker.int)+Number(s.hacker.program),dv:s.network.dv,success},before);return s}
export function skipNode(s){let e=activeAt(s,s.breach,'node');if(!e)throw Error('No node');let b=snapshot(s);e.status='skipped';log(s,'skip',{node:e.id},b)}
export function ice(s,choice,randomChoice,bypass=false){if(ruleset(s)==='streamlined')return streamlinedIce(s,choice,randomChoice,bypass);if(s.status!=='active'||s.pending&&s.pending.type!=='ice')throw Error('Not available');let e=activeAt(s,s.breach,'ice');if(!e)throw Error('No ICE');let p=s.pending,before=p?.before||snapshot(s);if(!p)net(s);if(bypass){spend(s,'bypass');e.status='cleared';s.pending=null;finishNet(s);log(s,'ice',{ice:e.id,bypass:true,result:'win'},before);return s}if(!['Attack','Exploit','Defend'].includes(choice)||!['Attack','Exploit','Defend'].includes(randomChoice))throw Error('Invalid choice');let result=choice===randomChoice?'draw':({Attack:'Exploit',Exploit:'Defend',Defend:'Attack'}[choice]===randomChoice?'win':'loss');if(result==='draw'){s.pending={type:'ice',before,rounds:[...(p?.rounds||[]),{choice,opponent:randomChoice,result}]};return s}s.pending=null;if(result==='win')e.status='cleared';else if(s.pursuit===null)trace(s,1);else pursuit(s);finishNet(s);log(s,'ice',{ice:e.id,result,rounds:[...(p?.rounds||[]),{choice,opponent:randomChoice,result}]},before);return s}

// Streamlined resolves all encounters inside the single Basic Program NET Action.
// The pending movement is persisted so a reload cannot spend another action or
// forget the intended destination while an ICE/node/Sentry choice is open.
function advanceStreamlined(s,kind,die){
  if(s.status!=='active'||s.pending)throw Error('Resolve pending decision');
  if(!['cautious','aggressive'].includes(kind))throw Error('Streamlined permits only Cautious and Aggressive');
  if(activeAt(s,s.breach,'node'))throw Error('Extract or skip the Resource Node first');
  if(!Number.isInteger(die)||die<1||die>20)throw Error('d20 required');
  const before=snapshot(s),int=Number(s.hacker.int),programRank=Number(s.hacker.program),baseBonus=int+programRank;
  const playtestModifier=normaliseModifiers(s.modifiers)[kind],total=die+baseBonus+playtestModifier;
  const success=check(die,baseBonus+playtestModifier,s.network.dv),gain=success?(kind==='aggressive'?3:2):0;
  net(s);trace(s,success?(kind==='aggressive'?2:1):(kind==='aggressive'?3:2));
  const intended=Math.min(breachTarget(s),s.breach+gain);
  const detail={program:kind,die,int,programRank,baseBonus,playtestModifier,total,dv:s.network.dv,success,proposed:intended,
    iceEncounters:0,iceRounds:[],iceWins:0,iceLosses:0,iceBypasses:0,iceDraws:0,lostToIce:0,preservedAfterIce:0,interruptedByIce:false,skipped:[]};
  if(!success){finishNet(s);log(s,kind,{...detail,actual:0},before);return s}
  const origin=s.breach,atIce=!!activeAt(s,origin,'ice');
  s.pending={type:'streamMove',before,origin,intended,cursor:atIce?origin-1:origin,nodeDecisionMade:false,detail};
  return continueStreamlined(s);
}
function finishStreamlined(s,p){
  s.pending=null;finishNet(s);
  log(s,p.detail.program,{...p.detail,actual:s.breach-p.origin},p.before);
  return s;
}
function continueStreamlined(s){
  const p=s.pending;
  if(!p||p.type!=='streamMove')throw Error('No pending Streamlined movement');
  for(let pos=p.cursor+1;pos<=p.intended;pos++){
    p.cursor=pos;s.breach=pos;
    const ice=activeAt(s,pos,'ice');
    if(ice){p.type='streamIce';p.id=ice.id;p.rounds=[];p.detail.iceEncounters++;return s}
    const node=activeAt(s,pos,'node');
    if(node){if(p.nodeDecisionMade){node.status='skipped';p.detail.skipped.push(node.id)}else{p.type='streamNode';p.id=node.id;return s}}
    const sentry=activeAt(s,pos,'sentry');
    if(sentry){if(eligible(s,'spoof')){p.type='streamSentry';p.id=sentry.id;return s}
      p.detail.sentry=sentry.id;p.detail.sentryEffect=applySentry(s,sentry)}
  }
  s.breach=p.intended;return finishStreamlined(s,p);
}
function streamlinedNode(s,stop){
  const p=s.pending,e=s.network.elements.find(x=>x.id===p.id);p.type='streamMove';p.nodeDecisionMade=true;
  if(stop){p.detail.nodeStop=e.id;p.detail.discarded=p.intended-e.pos;return finishStreamlined(s,p)}
  e.status='skipped';p.detail.skipped.push(e.id);return continueStreamlined(s);
}
function streamlinedSentry(s,spoof){
  const p=s.pending,e=s.network.elements.find(x=>x.id===p.id);
  if(spoof){spend(s,'spoof');e.status='spoofed';p.detail.sentryEffect='prevented';p.detail.spoof=true}
  else p.detail.sentryEffect=applySentry(s,e);
  p.detail.sentry=e.id;p.type='streamMove';return continueStreamlined(s);
}
function streamlinedIce(s,choice,randomChoice,bypass){
  const p=s.pending;
  if(s.status!=='active'||p?.type!=='streamIce')throw Error('No pending Streamlined ICE');
  const e=s.network.elements.find(x=>x.id===p.id);
  if(!e||e.status!=='active')throw Error('ICE already resolved');
  if(bypass){if(p.rounds.length)throw Error('Bypass must be chosen before confrontation');spend(s,'bypass');e.status='cleared';p.detail.iceBypasses++;p.detail.preservedAfterIce+=p.intended-e.pos;p.type='streamMove';return continueStreamlined(s)}
  if(!['Attack','Exploit','Defend'].includes(choice)||!['Attack','Exploit','Defend'].includes(randomChoice))throw Error('Invalid ICE choice');
  const result=choice===randomChoice?'draw':({Attack:'Exploit',Exploit:'Defend',Defend:'Attack'}[choice]===randomChoice?'win':'loss');
  const round={ice:e.id,pos:e.pos,choice,opponent:randomChoice,result};p.rounds.push(round);p.detail.iceRounds.push(round);
  if(result==='draw'){p.detail.iceDraws++;return s}
  if(result==='win'){e.status='cleared';p.detail.iceWins++;p.detail.preservedAfterIce+=p.intended-e.pos;p.type='streamMove';return continueStreamlined(s)}
  p.detail.iceLosses++;p.detail.interruptedByIce=true;p.detail.lostToIce=p.intended-e.pos;
  if(s.pursuit===null)trace(s,1);else pursuit(s);
  return finishStreamlined(s,p);
}
export function abandon(s){if(s.status!=='active')return;if(s.pending){let p=s.pending;log(s,'interrupted-action',{pending:p.type,...(p.detail||{}),rounds:p.rounds},p.before||snapshot(s))}s.pending=null;s.status='abandoned';s.finished=new Date().toISOString();let b=snapshot(s);log(s,'abandon',{},b)}
