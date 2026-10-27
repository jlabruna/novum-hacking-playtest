export const DEFAULT_AUDIO=Object.freeze({sound:true,volume:25});
export function selectCue(action,before,after){
  if(before?.status==='active'&&after?.status==='success')return 'success';
  if(before?.status==='active'&&after?.status==='ejected')return 'ejected';
  if(before?.pursuit===null&&after?.pursuit!==null&&after?.pursuit!==undefined)return 'detection';
  if(action.startsWith('ice:')||action==='bypass')return 'ice';
  if(['cautious','aggressive','tunnel','extract'].includes(action)){
    const event=after?.events?.at(-1),pending=after?.pending;
    const success=pending?.detail?.program===action?pending.detail.success:event?.kind===action||action==='extract'&&event?.kind==='extract'?event.success:null;
    if(success!==null&&success!==undefined)return success?'programSuccess':'programFailure';
  }
  return 'button';
}
const patterns={button:[[510,.045]],programSuccess:[[480,.085],[640,.11]],programFailure:[[430,.095],[330,.13]],
  ice:[[360,.095],[400,.095]],detection:[[480,.12],[370,.15]],success:[[440,.10],[550,.10],[660,.16]],ejected:[[360,.12],[270,.14],[190,.19]]};
export class SoundEffects{
  constructor(AudioContextType=globalThis.AudioContext||globalThis.webkitAudioContext){this.AudioContextType=AudioContextType;this.context=null;this.nodes=[]}
  arm(settings){if(settings?.sound===false||!this.AudioContextType)return;try{this.context??=new this.AudioContextType();if(this.context.state==='suspended')this.context.resume().catch(()=>{})}catch{this.context=null}}
  play(cue,settings){if(settings?.sound===false||!this.context||!patterns[cue])return;
    try{for(const node of this.nodes){try{node.stop()}catch{}}this.nodes=[];
      let at=this.context.currentTime+.004,volume=Math.max(0,Math.min(100,Number(settings?.volume??25)))/100;
      for(const [hz,duration] of patterns[cue]){let oscillator=this.context.createOscillator(),gain=this.context.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(hz,at);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume*.075,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);oscillator.connect(gain);gain.connect(this.context.destination);oscillator.start(at);oscillator.stop(at+duration+.005);this.nodes.push(oscillator);at+=duration*.72}
    }catch{/* Audio is supplementary. */}}
}
