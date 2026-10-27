export const DEFAULT_MODIFIERS=Object.freeze({cautious:0,aggressive:0});
export function validModifier(value){return Number.isInteger(Number(value))&&Number(value)>=-6&&Number(value)<=6}
export function normaliseModifiers(value){
  return {cautious:validModifier(value?.cautious)?Number(value.cautious):0,
    aggressive:validModifier(value?.aggressive)?Number(value.aggressive):0};
}
export function requireModifiers(value){
  if(!validModifier(value?.cautious)||!validModifier(value?.aggressive))throw Error('Roll modifiers must be whole numbers from −6 to +6');
  return {cautious:Number(value.cautious),aggressive:Number(value.aggressive)};
}
export function signed(value){return Number(value)>=0?`+${Number(value)}`:String(Number(value)).replace('-', '−')}
export function modifierKey(run){let m=normaliseModifiers(run.modifiers);return `${signed(m.cautious)} / ${signed(m.aggressive)}`}
