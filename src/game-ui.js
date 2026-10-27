import {eligible} from './engine.js?v=0.1.3';
import {mapCells,track,securityGap,gameVisibility} from './view.js?v=0.1.3';
import {normaliseModifiers,signed} from './modifiers.js?v=0.1.3';

const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='')=>`<button class="${cls}" data-action="${action}">${label}</button>`;

export function timeline(network,breach,{fog=false,preview=false}={}){
  return `<div class="timeline" aria-label="Network map">${mapCells(network,breach,{fog,preview}).map(cell=>`<div class="segment ${cell.passed?'passed':''} ${cell.current?'here':''} ${cell.concealed?'concealed':''}" ${cell.current?'aria-current="step"':''}><b>${cell.pos}</b><small>${cell.objective?'OBJECTIVE':cell.concealed?'?':cell.items.map(x=>x.label).join(' / ')||'·'}</small></div>`).join('')}</div>`;
}
function segments(value,max,kind){return `<div class="segments ${kind}" role="img" aria-label="${kind} ${value} of ${max}">${track(value,max).map(on=>`<i class="${on?'filled':''}"></i>`).join('')}</div>`}
export function statusPanel(run){
  const gap=securityGap(run),remaining=2-run.slots;
  return `<section class="panel status-panel" aria-label="Progress and security">
    <div class="track-row"><div class="track-label">BREACH <strong>${run.breach} / 10</strong></div>${segments(run.breach,10,'breach')}</div>
    <div class="track-row"><div class="track-label">PURSUIT <strong>${run.pursuit===null?'INACTIVE':`${run.pursuit} / 10`}</strong></div>${segments(run.pursuit??0,10,run.pursuit===null?'inactive':'pursuit')}</div>
    <div class="track-row trace-row"><div class="track-label">TRACE <strong>${run.trace} / 6 ${run.trace>=6?'· DETECTED':''}</strong></div>${segments(run.trace,6,'trace-track')}</div>
    <div class="gap-row"><span>SECURITY GAP</span><strong>${gap===null?'— INACTIVE':`${gap} ${gap===1?'segment':'segments'}`}</strong></div>
    <div class="resource-row"><span>CHARGES <b>${'◆'.repeat(run.charges)}${'◇'.repeat(3-run.charges)}</b></span></div>
    <div class="action-count">NET ACTIONS <strong>${remaining}/2 remaining</strong><span>MAIN ${run.main} · ROUND ${run.main||1}</span></div>
  </section>`;
}
export function contextControls(run){
  const n=run.network,p=run.pending,blocked=n.elements.find(e=>e.pos===run.breach&&e.status==='active'&&['barrier','ice'].includes(e.type)),node=n.elements.find(e=>e.pos===run.breach&&e.status==='active'&&e.type==='node');
  if(run.status!=='active')return '';
  if(p?.type==='nodePass')return `<h2>Resource decision</h2><p>Stop at ${n.elements.find(e=>e.id===p.nodes[0]).pos} and discard excess advancement, or pass up crossed nodes.</p><div class="action-grid">${button('STOP AT NODE','stopNode','primary')}${button('PASS NODES','passNode')}</div>`;
  if(p?.type==='sentry')return `<h2>Trace Sentry crossed</h2><p>Spoof before its effect, or accept the security response.</p><div class="action-grid">${eligible(run,'spoof')?button('SPOOF · 1 CHARGE','spoof','primary'):''}${button('ACCEPT EFFECT','acceptSentry')}</div>`;
  if(p?.type==='ice'||blocked?.type==='ice')return `<h2>ICE confrontation</h2><p>Commit a choice. ICE reveals after you choose. Ties replay without another NET Action.</p>${p?.rounds?.length?`<p class="metric">Last: ${escape(p.rounds.at(-1).choice)} / ${escape(p.rounds.at(-1).opponent)} · DRAW</p>`:''}<div class="three">${['Attack','Exploit','Defend'].map(x=>button(x.toUpperCase(),`ice:${x}`)).join('')}</div>${eligible(run,'bypass')&&p?.type!=='ice'?button('ICE BYPASS · 1 CHARGE','bypass','special-action'):''}`;
  if(blocked?.type==='barrier')return `<h2>Hardened Barrier</h2>${button('TUNNEL · 1 NET ACTION','tunnel','primary')}`;
  if(node)return `<h2>Resource Node · ${run.breach}</h2><p>Extract: 1 NET Action; success +1 Trace, failure +2 Trace. Or skip without an action.</p><div class="action-grid">${button('EXTRACT','extract','primary')}${eligible(run,'override')?button('OVERRIDE · 1 CHARGE','override','special-action'):''}${button('SKIP REWARD','skipNode')}</div>`;
  const m=normaliseModifiers(run.modifiers);
  return `<h2>Intrusion actions</h2><div class="action-grid">${button(`CAUTIOUS · +2 BREACH / +1 TRACE${m.cautious?` · TEST-ONLY ROLL ${signed(m.cautious)}`:''}`,'cautious','primary')}${button(`AGGRESSIVE · +3 BREACH / +2 TRACE${m.aggressive?` · TEST-ONLY ROLL ${signed(m.aggressive)}`:''}`,'aggressive')}</div>`;
}
export function specialistPanel(run){
  if(run.status!=='active'||run.pending)return '';
  const options=[eligible(run,'trace')&&run.pursuit===null?button('TRACE REMOVAL · 1 CHARGE','trace'):null,eligible(run,'fortify')&&run.breach>1&&run.breach-1>(run.pursuit??-1)?button('FORTIFY · 1 CHARGE','fortify'):null].filter(Boolean);
  return options.length?`<section class="panel specialists"><h3>Relevant specialist programs</h3><div class="action-grid">${options.join('')}</div></section>`:'';
}
export function eventsPanel(run,tab){
  const map=tab==='map',fog=gameVisibility(run);
  return `<section class="panel info-panel"><div class="tabs" role="tablist" aria-label="Intrusion information">${button('RECENT EVENTS','tab:events',`tab ${!map?'selected':''}`)}${button('NETWORK MAP','tab:map',`tab ${map?'selected':''}`)}</div><div role="tabpanel">${map?`${timeline(run.network,run.breach,{fog})}<p class="map-caption">${fog?'Fog of Network · future positions concealed':'Full network visibility'} · Objective at 10</p>`:`<div class="event-list">${run.events.slice(-4).reverse().map(e=>`<div class="event"><strong>#${e.index} ${escape(e.kind.toUpperCase())}</strong><span>${e.die!=null?`d20 ${e.die}${e.playtestModifier!==undefined&&['cautious','aggressive'].includes(e.kind)?` + ${e.baseBonus} ${signed(e.playtestModifier)} TEST-ONLY`:''} = ${e.total} vs DV ${e.dv} · ${e.success?'SUCCESS':'FAILED'}`:e.kind==='ice'?escape(e.rounds?.map(r=>`${r.choice}/${r.opponent}:${r.result}`).join(', ')||'BYPASS'):''}</span><small>B${e.after.breach} · T${e.after.trace} · P${e.after.pursuit??'—'}</small></div>`).join('')||'<p class="muted">No actions yet.</p>'}</div>`}</div></section>`;
}
export function gameContent(run,tab){
  const nodes=run.network.elements.filter(e=>e.type==='node'),ev=run.events;
  const result=run.status==='active'?'':`<section class="panel"><h2>Run summary</h2><p>${escape(run.hacker.name)} · INT ${run.hacker.int} · Program ${run.hacker.program} · ${run.net} NET Actions · ${run.main} Main Actions / equivalent rounds.</p><p>Program checks ${ev.filter(x=>x.die!=null&&x.success).length}/${ev.filter(x=>x.die!=null).length}; barriers cleared ${run.network.elements.filter(x=>x.type==='barrier'&&x.status==='cleared').length}; ICE won ${ev.filter(x=>x.kind==='ice'&&x.result==='win').length}, lost ${ev.filter(x=>x.kind==='ice'&&x.result==='loss').length}.</p><p>Nodes attempted ${ev.filter(x=>x.kind==='extract').length}, extracted ${nodes.filter(x=>x.status==='extracted').length}, skipped ${nodes.filter(x=>x.status==='skipped').length}, left ${nodes.filter(x=>x.status==='active').length}. Charges spent ${3-run.charges}; remaining ${run.charges}.</p>${button('PLAY AGAIN · SAME SEED','replay')}</section>`;
  const banner=run.status==='success'?`<section class="panel terminal success" role="status"><span class="terminal-mark">◇</span><div><strong>ACCESS GRANTED</strong><p>INTRUSION COMPLETE · Primary objective secured.</p><small>BREACH ${run.breach} / 10</small></div>${button('NEW NETWORK','new','primary')}</section>`:run.status==='ejected'?`<section class="panel terminal ejected" role="status"><span class="terminal-mark">◇</span><div><strong>EJECTED</strong><p>INTRUSION FAILED · Security overtook your position.</p><small>FINAL BREACH ${run.breach} / 10</small></div>${button('NEW NETWORK','new','primary')}</section>`:run.status==='abandoned'?`<section class="panel terminal abandoned" role="status"><div><strong>INTRUSION ABANDONED</strong><small>FINAL BREACH ${run.breach} / 10</small></div>${button('NEW NETWORK','new','primary')}</section>`:'';
  return `<div class="game-meta"><span>${escape(run.network.difficulty.toUpperCase())} · T${run.network.tier}</span><span>DV ${run.network.dv}</span></div>${banner}${statusPanel(run)}${run.status==='active'?`<section class="panel actions">${contextControls(run)}</section>${specialistPanel(run)}`:''}${eventsPanel(run,tab)}${result}${run.status==='active'?button('ABANDON INTRUSION','abandon','quiet'):button('DETAILED RUN LOG','runLog','quiet')}`;
}
