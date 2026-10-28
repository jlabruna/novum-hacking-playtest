import test from 'node:test';
import assert from 'node:assert/strict';
import {CUES,CUE_LENGTHS,SoundEffects,selectCue} from '../src/audio.js';
import {migrateSettings} from '../src/profile.js';
import {readFileSync} from 'node:fs';

const before=(overrides={})=>({status:'active',pursuit:null,eventsLength:0,iceWins:0,iceLosses:0,iceBypasses:0,...overrides});
const after=(overrides={})=>({status:'active',pursuit:null,events:[],pending:null,...overrides});
test('all thirteen original cues have bounded positive recipes and their approved durations',()=>{
  assert.deepEqual(Object.keys(CUES).sort(),Object.keys(CUE_LENGTHS).sort());
  for(const [cue,recipe] of Object.entries(CUES)){
    assert.ok(recipe.master>0&&recipe.master<=.62,cue);
    assert.ok(recipe.tones.length+recipe.noises.length>0,cue);
    for(const t of recipe.tones)assert.ok(t.start+t.length<=CUE_LENGTHS[cue]+.01,cue);
  }
  assert.equal(CUES.detection.tones[0].from,104);
  assert.equal(CUES.ejected.tones[0].from,143);
  assert.equal(CUES.success.delay,true);
});
test('terminal and detection transitions override rolls; ordinary navigation never repeats terminals',()=>{
  assert.equal(selectCue('cautious',before(),after({status:'success',pursuit:0})),'success');
  assert.equal(selectCue('cautious',before(),after({status:'ejected',pursuit:0})),'ejected');
  assert.equal(selectCue('cautious',before(),after({pursuit:0,events:[{kind:'cautious',success:false}]})),'detection');
  assert.equal(selectCue('inspect:1',before({status:'success'}),after({status:'success'})),'button');
});
test('resolved ICE, nodes, specialist allocation, sentries and Pursuit select distinct cues',()=>{
  assert.equal(selectCue('ice:Attack',before(),after({pending:{detail:{iceWins:1}}})),'iceWin');
  assert.equal(selectCue('ice:Attack',before(),after({events:[{kind:'aggressive',iceLosses:1}]})),'iceLoss');
  assert.equal(selectCue('ice:Attack',before(),after({pending:{detail:{iceDraws:1}}})),'ice');
  assert.equal(selectCue('bypass',before(),after({pending:{detail:{iceBypasses:1}}})),'iceWin');
  assert.equal(selectCue('ice:Attack',before(),after({events:[{kind:'ice',result:'win'}]})),'iceWin');
  assert.equal(selectCue('ice:Attack',before(),after({events:[{kind:'ice',result:'loss'}]})),'iceLoss');
  assert.equal(selectCue('aggressive',before(),after({pending:{type:'stream15Ice',detail:{program:'aggressive',success:true}}})),'ice');
  assert.equal(selectCue('extract',before(),after({events:[{kind:'extract',success:true}]})),'resource');
  assert.equal(selectCue('extract',before(),after({events:[{kind:'extract',success:false}]})),'programFailure');
  assert.equal(selectCue('override',before(),after({events:[{kind:'extract',success:true}]})),'resource');
  assert.equal(selectCue('trace',before(),after()),'memory');
  assert.equal(selectCue('spoof',before(),after()),'memory');
  assert.equal(selectCue('acceptSentry',before(),after()),'sentry');
  assert.equal(selectCue('cautious',before({pursuit:1}),after({pursuit:2,events:[{kind:'cautious',success:true}]})),'pursuit');
  assert.equal(selectCue('aggressive',before(),after({events:[{kind:'aggressive',success:true}]})),'programSuccess');
});

function fakeAudio(){
  const state={starts:0,stops:0,disconnects:0,peak:0,resumes:0,samples:[]};
  const param=(level=false)=>({setValueAtTime(v){if(level)state.peak=Math.max(state.peak,Math.abs(v))},linearRampToValueAtTime(v){if(level)state.peak=Math.max(state.peak,Math.abs(v))},exponentialRampToValueAtTime(v){if(level)state.peak=Math.max(state.peak,Math.abs(v))}});
  const node=()=>({gain:param(true),frequency:param(),Q:param(),threshold:param(),ratio:param(),attack:param(),release:param(),delayTime:param(),connect(){},disconnect(){state.disconnects++},start(){state.starts++},stop(){state.stops++}});
  class Audio{
    constructor(){this.currentTime=0;this.sampleRate=22050;this.state='running';this.destination=node()}
    createGain(){return node()}createOscillator(){return node()}createBufferSource(){return node()}
    createBiquadFilter(){return node()}createDynamicsCompressor(){return node()}
    createWaveShaper(){return node()}createDelay(){return node()}
    createBuffer(channels,length){const data=new Float32Array(length);state.samples.push(data);return {getChannelData(){return data}}}
    resume(){state.resumes++;this.state='running';return Promise.resolve()}
  }
  return {Audio,state};
}
test('audio unlock, zero/mute, rapid replacement and cleanup keep gameplay independent',async()=>{
  const {Audio,state}=fakeAudio(),sound=new SoundEffects(Audio);
  sound.arm({sound:true});assert.equal(sound.context.state,'running');
  sound.play('button',{sound:true,volume:0});assert.equal(state.starts,0);
  sound.play('button',{sound:false,volume:100});assert.equal(state.starts,0);
  sound.play('detection',{sound:true,volume:100});assert.ok(state.starts>=3);
  assert.ok(state.peak<=1,'gain staging must remain bounded');
  const prior=state.stops;
  sound.play('ejected',{sound:true,volume:50});assert.ok(state.stops>prior,'old cue stopped before new cue');
  sound.context.state='suspended';sound.arm({sound:true});await Promise.resolve();assert.equal(state.resumes,1);
  sound.stop();assert.ok(state.disconnects>0);assert.equal(sound.nodes.length,0);
  assert.equal(state.samples.length,1,'one cached noise buffer per context');
  assert.ok(state.samples[0].some(x=>x!==0));
});
test('audio context failure does not interrupt play and stored preferences survive',()=>{
  const sound=new SoundEffects(class {constructor(){throw Error('blocked')}});sound.arm({sound:true});assert.doesNotThrow(()=>sound.play('success',{sound:true,volume:100}));
  assert.equal(migrateSettings({sound:false,volume:74,defaultAlert:3}).volume,74);
  assert.equal(migrateSettings({sound:false,volume:74}).sound,false);
  assert.match(readFileSync('public/sw.js','utf8'),/novum-intrusion-0\.2\.1/);
  assert.match(readFileSync('src/app.js','utf8'),/eventsLength:run\.events\?\.length/);
});
