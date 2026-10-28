import {normaliseModifiers,signed} from './modifiers.js?v=0.2.0';

export function modifierControls(value,{prefix='m',title='Playtest roll modifiers',reset='resetModifiers',defaults='+0 / +0'}={}){
  const m=normaliseModifiers(value);
  return `<div class="modifier-settings"><h2>${title}</h2><p class="muted">TEST-ONLY check bonuses. Defaults ${defaults}; each value is limited to −6…+6.</p>
    ${['cautious','aggressive'].map(k=>`<div class="modifier-row"><span>${k.toUpperCase()}</span><div class="step-controls"><button type="button" data-action="mod:${prefix}:${k}:-1" aria-label="Decrease ${title} ${k} roll modifier" ${m[k]<=-6?'disabled':''}>−</button><output id="${prefix}-${k}" data-value="${m[k]}">${signed(m[k])}</output><button type="button" data-action="mod:${prefix}:${k}:1" aria-label="Increase ${title} ${k} roll modifier" ${m[k]>=6?'disabled':''}>+</button></div></div>`).join('')}
    <button type="button" class="quiet" data-action="${reset}">RESET TO ${prefix==='m'?'CANONICAL':'STREAMLINED'} DEFAULTS</button></div>`;
}
