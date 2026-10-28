import {PROGRAMS} from './engine.js?v=0.2.1';
import {normaliseModifiers} from './modifiers.js?v=0.2.1';

export const PRESETS={1:{int:3,program:3},2:{int:4,program:4},3:{int:5,program:5},4:{int:5,program:6}};
export function preset(tier,name='Example Hacker'){
  const n=Number(tier);
  if(!PRESETS[n])throw Error('Unknown Hacker tier');
  return {name,tier:n,custom:false,...PRESETS[n],feat:0,programs:Object.fromEntries(PROGRAMS.map(k=>[k,n])),modifiers:normaliseModifiers(),streamlinedModifiers:{cautious:2,aggressive:0}};
}
export function migrateHacker(saved){
  if(!saved)return preset(1);
  // v0.1.1 profiles were manually configured. Preserve their exact values.
  return {name:saved.name??'Example Hacker',int:saved.int??3,program:saved.program??4,feat:[0,1,2,4,6,8,10].includes(Number(saved.feat))?Number(saved.feat):0,
    programs:Object.fromEntries(PROGRAMS.map(k=>[k,saved.programs?.[k]??0])),
    tier:PRESETS[saved.tier]?Number(saved.tier):null,custom:saved.custom??true,modifiers:normaliseModifiers(saved.modifiers),
    streamlinedModifiers:saved.streamlinedModifiers?normaliseModifiers(saved.streamlinedModifiers):{cautious:2,aggressive:0}};
}
export function migrateSettings(saved){return {largeText:!!saved?.largeText,fog:saved?.fog??false,sound:saved?.sound??true,volume:saved?.volume!=null&&Number.isFinite(Number(saved.volume))?Math.max(0,Math.min(100,Number(saved.volume))):25,defaultAlert:Number.isInteger(saved?.defaultAlert)&&saved.defaultAlert>=0&&saved.defaultAlert<=3?saved.defaultAlert:0}}
export function visibility(run){return run.visibility??'legacy-full'}
