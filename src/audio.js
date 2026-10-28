export const DEFAULT_AUDIO=Object.freeze({sound:true,volume:25});

// One outcome per interaction. A saved or inspected run is never a new outcome.
export function selectCue(action,before,after){
  if(action==='acceptEjection'&&after?.status==='ejected')return 'ejected';
  if(action==='useBackdoor'&&after?.status==='active')return 'memory';
  if(before?.status==='active'&&after?.status==='success')return 'success';
  if(before?.status==='active'&&after?.status==='ejected')return 'ejected';
  if(before?.pursuit==null&&after?.pursuit!=null)return 'detection';
  const pending=after?.pending?.detail;
  const event=after?.events?.length>(before?.eventsLength??0)?after.events.at(-1):null;
  const count=k=>Math.max(pending?.[k]??0,event?.[k]??0);
  if(action.startsWith('ice:')||action==='bypass'){
    if(event?.kind==='ice'&&event.result==='loss'||count('iceLosses')>(before?.iceLosses??0))return 'iceLoss';
    if(event?.kind==='ice'&&event.result==='win'||count('iceWins')>(before?.iceWins??0)||count('iceBypasses')>(before?.iceBypasses??0))return 'iceWin';
    return 'ice';
  }
  if(['cautious','aggressive'].includes(action)&&
    (after?.pending?.type==='streamIce'||after?.pending?.type==='stream15Ice'||
      event?.success&&after?.network?.elements?.some(x=>x.type==='ice'&&x.status==='active'&&x.pos===after.breach)))
    return 'ice';
  if((action==='extract'||action==='override')&&event?.kind==='extract'&&event.success)return 'resource';
  if(action==='acceptSentry')return 'sentry';
  if(action==='spoof'||action==='trace'||action==='fortify'||action==='override')return 'memory';
  if(after?.pursuit!=null&&before?.pursuit!=null&&after.pursuit>before.pursuit)return 'pursuit';
  if(['cautious','aggressive','tunnel','extract'].includes(action)){
    const success=pending?.program===action?pending.success:event?.kind===action||action==='extract'&&event?.kind==='extract'?event.success:null;
    if(success!=null)return success?'programSuccess':'programFailure';
  }
  return 'button';
}

// Original deterministic Web Audio recipes. Times are seconds, levels are pre-master.
// The six Planning-approved cues retain their specified components and pitch contours.
export const CUE_LENGTHS=Object.freeze({
  button:.15,programSuccess:.25,programFailure:.32,ice:.27,iceWin:.39,iceLoss:.31,
  sentry:.25,memory:.18,resource:.36,pursuit:.20,detection:.70,success:1.6,ejected:.35
});
const tone=(type,from,to,start,length,level,attack=.005,filter=0,hold=0)=>({type,from,to,start,length,level,attack,filter,hold});
const noise=(freq,start,length,level,attack=.002,release=.052,q=.65)=>({freq,start,length,level,attack,release,q});
export const CUES=Object.freeze({
  button:{master:.48,tones:[tone('triangle',220,105,0,.085,.38),tone('sine',750,510,.018,.118,.16),tone('triangle',1250,980,.006,.027,.07)],noises:[noise(1600,0,.075,.15)]},
  programSuccess:{master:.58,tones:[tone('triangle',310,190,0,.095,.27),tone('sine',710,980,.034,.145,.095),tone('sine',1130,1360,.085,.125,.075),tone('triangle',190,128,.105,.145,.22)],noises:[noise(2400,0,.045,.21),noise(3300,.107,.075,.055)]},
  programFailure:{master:.58,tones:[tone('sawtooth',270,125,0,.115,.30,.005,780),tone('triangle',490,280,.043,.145,.12),tone('triangle',155,69,.115,.205,.32),tone('sine',92,55,.165,.12,.10)],noises:[noise(1100,0,.052,.34),noise(550,.072,.11,.17)]},
  success:{master:.47,delay:true,tones:[tone('triangle',185,295,0,1.36,.16,.16),tone('sine',365,550,.13,1.32,.105,.16),tone('sine',550,730,.29,1.12,.07,.13),tone('sine',750,920,.54,.92,.045,.12),tone('triangle',147,185,.58,1,.085,.12)],noises:[noise(1550,0,1.42,.095,.23,.65)]},
  ejected:{master:.55,shape:true,tones:[
    tone('sawtooth',143,143,0,.078,.43,.005,620,.052),tone('square',215.93,215.93,0,.078,.12,.005,620,.052),
    tone('sawtooth',143,143,.089,.07,.43,.005,620,.045),tone('square',215.93,215.93,.089,.07,.12,.005,620,.045),
    tone('sawtooth',94,94,.18,.17,.43,.005,620,.142),tone('square',141.94,141.94,.18,.17,.12,.005,620,.142)
  ],noises:[noise(1180,0,.057,.16),noise(430,.18,.12,.11)]},
  detection:{master:.62,compress:true,tones:[tone('sawtooth',104,104,0,.7,.32,.024,560,.4),tone('triangle',155.6,155.6,0,.7,.16,.024,650,.4),tone('sine',208,208,0,.7,.065,.024,900,.4)],noises:[]},
  ice:{master:.43,tones:[tone('sawtooth',170,143,0,.23,.19,.007,710),tone('triangle',277,254,.045,.18,.09)],noises:[noise(840,0,.12,.18)]},
  iceWin:{master:.55,tones:[tone('triangle',225,315,0,.27,.23),tone('sine',590,780,.05,.24,.10),tone('triangle',135,157,.16,.21,.12)],noises:[noise(2100,.01,.075,.13)]},
  iceLoss:{master:.53,tones:[tone('sawtooth',230,122,0,.15,.26,.005,650),tone('triangle',122,79,.09,.21,.22)],noises:[noise(920,0,.075,.22)]},
  sentry:{master:.47,tones:[tone('triangle',196,169,0,.19,.24),tone('sine',405,355,.042,.16,.10)],noises:[noise(1050,0,.072,.15)]},
  memory:{master:.39,tones:[tone('triangle',295,182,0,.15,.19),tone('sine',810,615,.022,.11,.07)],noises:[noise(1350,0,.05,.11)]},
  resource:{master:.52,tones:[tone('triangle',215,275,0,.27,.23),tone('sine',680,890,.045,.24,.10),tone('sine',1030,1100,.14,.18,.045)],noises:[noise(1600,0,.055,.15)]},
  pursuit:{master:.52,tones:[tone('sawtooth',125,102,0,.16,.26,.004,490),tone('triangle',188,153,.02,.16,.11)],noises:[noise(480,0,.065,.10)]}
});
const set=(param,value,time)=>param.setValueAtTime(value,time);
function envelope(param,at,start,length,peak,attack,hold){
  const rise=Math.min(Math.max(attack,.002),length*.65);
  set(param,.0001,at+start);
  param.linearRampToValueAtTime(peak,at+start+rise);
  if(hold) set(param,peak,at+start+Math.min(hold,length-.025));
  param.exponentialRampToValueAtTime(.0001,at+start+length);
}

export class SoundEffects{
  constructor(AudioContextType=globalThis.AudioContext||globalThis.webkitAudioContext){
    this.AudioContextType=AudioContextType;this.context=null;this.nodes=[];this.timer=null;this.noiseBuffer=null;
  }
  arm(settings){
    if(settings?.sound===false||!this.AudioContextType)return;
    try{this.context??=new this.AudioContextType();if(this.context.state==='suspended')Promise.resolve(this.context.resume()).catch(()=>{})}
    catch{this.context=null}
  }
  stop(){
    if(this.timer)clearTimeout(this.timer);this.timer=null;
    for(const node of this.nodes){try{node.stop?.()}catch{}try{node.disconnect?.()}catch{}}
    this.nodes=[];
  }
  makeNoise(ctx){
    if(this.noiseBuffer||!ctx.createBuffer)return this.noiseBuffer;
    const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*1.5),ctx.sampleRate),data=b.getChannelData(0);
    let seed=0x4e4f5655;
    for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=((seed/0x100000000)*2-1)*.75}
    return this.noiseBuffer=b;
  }
  play(cue,settings){
    const recipe=CUES[cue],ctx=this.context;
    if(!recipe||settings?.sound===false||!ctx)return;
    const volume=Math.max(0,Math.min(100,Number(settings?.volume??25)))/100;
    if(!Number.isFinite(volume)||volume===0){this.stop();return}
    try{
      this.stop();
      if(ctx.state==='suspended')Promise.resolve(ctx.resume()).catch(()=>{});
      const at=ctx.currentTime+.008, master=ctx.createGain();
      set(master.gain,recipe.master*Math.sqrt(volume),at);
      let bus=master;
      if(ctx.createDynamicsCompressor){
        const comp=ctx.createDynamicsCompressor();
        set(comp.threshold,recipe.compress?-13:-8,at);set(comp.ratio,recipe.compress?2.8:3,at);
        set(comp.attack,.008,at);set(comp.release,.13,at);
        master.connect(comp);bus=comp;this.nodes.push(comp);
      }
      if(recipe.shape&&ctx.createWaveShaper){
        const shaper=ctx.createWaveShaper(),curve=new Float32Array(1024);
        for(let i=0;i<curve.length;i++)curve[i]=Math.tanh(((i/(curve.length-1))*2-1)*1.75)/Math.tanh(1.75);
        shaper.curve=curve;shaper.oversample='2x';bus.connect(shaper);bus=shaper;this.nodes.push(shaper);
      }
      bus.connect(ctx.destination);this.nodes.push(master);
      if(recipe.delay&&ctx.createDelay){
        const delay=ctx.createDelay(.5),feedback=ctx.createGain(),wet=ctx.createGain();
        set(delay.delayTime,.18,at);set(feedback.gain,.14,at);set(wet.gain,.17,at);
        master.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(bus);
        this.nodes.push(delay,feedback,wet);
      }
      for(const t of recipe.tones){
        const osc=ctx.createOscillator(),amp=ctx.createGain();
        osc.type=t.type;set(osc.frequency,t.from,at+t.start);
        if(t.from!==t.to)osc.frequency.exponentialRampToValueAtTime(t.to,at+t.start+t.length);
        envelope(amp.gain,at,t.start,t.length,t.level,t.attack,t.hold);
        osc.connect(amp);
        if(t.filter&&ctx.createBiquadFilter){const f=ctx.createBiquadFilter();f.type='lowpass';set(f.frequency,t.filter,at);amp.connect(f);f.connect(master);this.nodes.push(f)}
        else amp.connect(master);
        osc.start(at+t.start);osc.stop(at+t.start+t.length+.005);
        this.nodes.push(osc,amp);
      }
      const noiseBuffer=this.makeNoise(ctx);
      for(const n of recipe.noises){
        if(!noiseBuffer||!ctx.createBufferSource||!ctx.createBiquadFilter)continue;
        const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();
        source.buffer=noiseBuffer;filter.type='bandpass';set(filter.frequency,n.freq,at+n.start);set(filter.Q,n.q,at+n.start);
        envelope(amp.gain,at,n.start,n.length,n.level,n.attack,0);
        source.connect(filter);filter.connect(amp);amp.connect(master);
        source.start(at+n.start);source.stop(at+n.start+n.length+.005);
        this.nodes.push(source,filter,amp);
      }
      // The success delay has finite feedback; disconnect it after its tail.
      this.timer=setTimeout(()=>this.stop(),(CUE_LENGTHS[cue]+(recipe.delay ? .65 : 0)+.12)*1000);
      this.timer.unref?.();
    }catch{this.stop()/* Audio is supplementary; game state never depends on it. */}
  }
}
