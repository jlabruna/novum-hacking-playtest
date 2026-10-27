import {normaliseModifiers,signed} from './modifiers.js?v=0.1.3';

export function modifierControls(value){
  const m=normaliseModifiers(value);
  return `<div class="modifier-settings"><h2>Playtest roll modifiers</h2><p class="muted">TEST-ONLY check bonuses. Canonical defaults are +0 / +0; each value is limited to −6…+6.</p>
    ${['cautious','aggressive'].map(k=>`<div class="modifier-row"><span>${k.toUpperCase()}</span><div class="step-controls"><button type="button" data-action="mod:${k}:-1" aria-label="Decrease ${k} roll modifier" ${m[k]<=-6?'disabled':''}>−</button><output id="m-${k}" data-value="${m[k]}">${signed(m[k])}</output><button type="button" data-action="mod:${k}:1" aria-label="Increase ${k} roll modifier" ${m[k]>=6?'disabled':''}>+</button></div></div>`).join('')}
    <button type="button" class="quiet" data-action="resetModifiers">RESET TO CANONICAL DEFAULTS</button></div>`;
}
