import {visibility} from './profile.js?v=0.1.4';
import {breachTarget} from './engine.js?v=0.1.4';

const names={barrier:'BARRIER',ice:'ICE',sentry:'SENTRY',node:'RESOURCE'};
export function shownElement(element,breach,fog,preview=false){return !fog||preview||element.pos<=breach}
export function mapCells(network,breach,{fog=false,preview=false}={}){
  const target=breachTarget({network});
  return Array.from({length:target+1},(_,pos)=>({pos,current:pos===breach,passed:pos<=breach,
    objective:pos===target,concealed:!!fog&&!preview&&pos>breach&&pos<target,
    items:!!fog&&!preview&&pos>breach&&pos<target?[]:network.elements.filter(e=>e.pos===pos).map(e=>({
      label:names[e.type]+(e.status==='active'?'':' ✓'),hidden:false}))}));
}
export function track(value,max=10){return Array.from({length:max},(_,i)=>i<value)}
export function securityGap(run){return run.pursuit===null?null:run.breach-run.pursuit}
export function gameVisibility(run){return visibility(run)==='fog'}
