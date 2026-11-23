// One clock for presentation and the authoritative action gate. No outcome RNG.
import * as previous from '../card-library/motion-v2.js';
import {walkDurationMs,sampleCellWalk,effectTimeMs} from '../presentation-timing.js';

const frozen=entries=>Object.freeze(Object.fromEntries(Object.entries(entries).map(([id,t])=>[id,Object.freeze(Object.fromEntries(Object.entries(t).map(([key,value])=>[key,effectTimeMs(value)])))])));
export const BOMBARDIRO_PLAYBACK_RATE=.65;
const slowed=timeline=>Object.fromEntries(Object.entries(timeline).map(([key,value])=>[key,Math.round(value/BOMBARDIRO_PLAYBACK_RATE)]));
export const CARD_TIMELINES=frozen({
 bonk:{releaseMs:160,impactMs:330,arriveMs:690,durationMs:1000},
 hook:{releaseMs:170,catchMs:470,pullMs:620,arriveMs:1110,retractMs:1300,durationMs:1400},
 swap:{releaseMs:180,impactMs:600,swapMs:600,arriveMs:1050,durationMs:1400},
 pump:{releaseMs:140,impactMs:300,arriveMs:770,durationMs:1050},
 'to-the-moon':{releaseMs:200,impactMs:500,arriveMs:1450,durationMs:1900},
 'pocket-rocket':{releaseMs:200,impactMs:760,arriveMs:1250,durationMs:1650},
 gigachad:{releaseMs:150,impactMs:360,arriveMs:740,durationMs:1100},
 'rug-pull':{releaseMs:140,impactMs:310,arriveMs:730,durationMs:1000},
 reverse:{releaseMs:120,impactMs:300,arriveMs:720,durationMs:1000},
 gamba:{releaseMs:180,impactMs:1000,arriveMs:1550,durationMs:1850},
 'trade-offer':{releaseMs:180,impactMs:430,arriveMs:1000,durationMs:1350},
 'network-down':{releaseMs:180,impactMs:460,arriveMs:950,durationMs:1300},
 bombardiro:slowed({releaseMs:280,dropMs:1000,impactMs:1420,arriveMs:1950,durationMs:2200}),
 stonks:{releaseMs:120,impactMs:360,arriveMs:770,durationMs:1050},
 'free-mint':{releaseMs:120,impactMs:360,arriveMs:850,durationMs:1150},
 wormhole:{releaseMs:120,impactMs:450,arriveMs:1200,durationMs:1600},
 jackpot:{releaseMs:120,impactMs:360,arriveMs:850,durationMs:1150},
 'not-stonks':{releaseMs:120,impactMs:360,arriveMs:780,durationMs:1050},
 mimic:{releaseMs:120,impactMs:380,arriveMs:950,durationMs:1300},
 'paper-hands':{releaseMs:120,impactMs:360,arriveMs:1050,durationMs:1400},
 rekt:{releaseMs:120,impactMs:500,arriveMs:1130,durationMs:1500},
 airdrop:{releaseMs:100,impactMs:1200,arriveMs:1550,durationMs:1800},
 draw:{releaseMs:100,impactMs:340,arriveMs:850,durationMs:1150},
 well:{releaseMs:100,impactMs:500,arriveMs:1150,durationMs:1450},
});
export const clamp=n=>Math.max(0,Math.min(1,n));
const span=(n,a,b)=>clamp((n-a)/Math.max(1,b-a));
const smooth=n=>n*n*(3-2*n);
export const kindOf=motion=>typeof motion==='string'?motion:motion?.effect?.blocked?'gigachad':motion?.effect?.reflected?'reverse':motion?.effect?.eventId||motion?.effect?.cardId||motion?.effect?.kind;
export const effectDelayMs=motion=>motion?.effect?.cardId?0:Math.max(0,...(motion?.tracks||[]).map(walkDurationMs));
export function cardPresentationMs(motion,{reduced=false}={}){
 const t=CARD_TIMELINES[kindOf(motion)];
 if(!t||motion?.effect?.pending)return Number(motion?.durationMs)||0;
 if(motion?.effect?.blocked||motion?.effect?.reflected)return Number(motion.durationMs)||t.durationMs;
 return effectDelayMs(motion)+(reduced?120:t.durationMs);
}
export function prepareCardMotion(motion,{reduced=false}={}){
 if(!motion)return motion;
 const copy=structuredClone(motion),kind=kindOf(copy);
 if(!CARD_TIMELINES[kind]||copy.effect?.pending)return copy;
 copy.durationMs=cardPresentationMs(copy,{reduced});copy.localPresentation='card-cinema-v3';
 const delay=effectDelayMs(copy);
 copy.tracks=copy.tracks.map(t=>({...t,localCardId:kind,localActorId:copy.effect.actorId,localTargetId:copy.effect.targetId,localEffectDelayMs:delay}));
 return copy;
}
export function cardMotionFrame(kind,age,{reduced=false}={}){
 const t=CARD_TIMELINES[kind];if(!t)return null;
 const ms=Math.max(0,Number(age)||0)*1000,done=ms>=t.durationMs;
 const f={kind,age:ms/1000,durationMs:t.durationMs,done,anticipation:span(ms,0,t.releaseMs),action:span(ms,t.releaseMs,t.impactMs??t.catchMs),travel:span(ms,t.impactMs??t.pullMs,t.arriveMs),recover:span(ms,t.arriveMs,t.durationMs)};
 f.progress=smooth(f.travel);f.impact=span(ms,t.impactMs??t.catchMs,(t.impactMs??t.catchMs)+100);
 f.stage=done?'settled':ms<t.releaseMs?'anticipation':ms<(t.impactMs??t.catchMs)?'action':ms<t.arriveMs?'result':'recover';
 if(kind==='hook')Object.assign(f,{cast:span(ms,t.releaseMs,t.catchMs),tension:span(ms,t.catchMs,t.pullMs),brake:span(ms,t.arriveMs,t.durationMs),retract:span(ms,t.arriveMs,t.retractMs),progress:smooth(span(ms,t.pullMs,t.arriveMs)),stage:done?'settled':ms<t.releaseMs?'anticipation':ms<t.catchMs?'cast':ms<t.pullMs?'tension':ms<t.arriveMs?'pull':ms<t.retractMs?'brake':'retract'});
 if(kind==='bombardiro')Object.assign(f,{drop:span(ms,t.dropMs,t.impactMs),blast:span(ms,t.impactMs,t.durationMs),stage:done?'settled':ms<t.releaseMs?'opening':ms<t.dropMs?'flyover':ms<t.impactMs?'drop':ms<t.arriveMs?'blast':'recover'});
 if(kind==='swap')f.progress=ms<t.swapMs?0:1;
 if(kind==='gamba')f.stage=done?'settled':ms<t.releaseMs?'anticipation':ms<t.impactMs?'spin':ms<t.arriveMs?'reveal':'land';
 if(reduced)Object.assign(f,{stage:'settled',done:true,progress:1,travel:1,recover:1,reduced:true});
 return f;
}
// Reuse the old bounded pose sampler, mapping phase boundaries, not outcomes.
function previousAge(kind,ms){
 const a=CARD_TIMELINES[kind],b=previous.CARD_TIMELINES[kind];if(!b)return null;
 const keys=kind==='hook'?['releaseMs','catchMs','pullMs','arriveMs','retractMs','durationMs']:kind==='bombardiro'?['dropMs','impactMs','arriveMs','durationMs']:['releaseMs','impactMs','arriveMs','durationMs'];
 let x=0,y=0;for(const key of keys){if(ms<=a[key])return (y+span(ms,x,a[key])*(b[key]-y))/1000;x=a[key];y=b[key];}return b.durationMs/1000;
}
export function sampleCardMotion(track,age,motion,{reduced=false}={}){
 const kind=track?.localCardId||kindOf(motion),t=CARD_TIMELINES[kind];if(!t||motion?.effect?.pending)return null;
 const delay=track.localEffectDelayMs??effectDelayMs(motion),ms=Math.max(0,age*1000-delay);
 if(!reduced&&age*1000<delay)return {...sampleCellWalk(track,Math.max(0,age)),cardId:kind,stage:'walk',done:false,roll:0,lean:0,scaleX:1,scaleY:1,arm:0,feet:0};
 const defense=motion?.effect?.blocked||motion?.effect?.reflected,gate=defense?Math.max(120,(motion.durationMs||t.durationMs)-delay):t.durationMs,scaled=ms*t.durationMs/gate;
 const frame=cardMotionFrame(kind,scaled/1000,{reduced}),from=Number(motion?.effect?.cardId?track.from:track.landing??track.from)||0,to=Number(track.to)||0,delta=to-from;
 const neutral={...frame,cardId:kind,pos:to,dy:0,roll:0,lean:0,scaleX:1,scaleY:1,arm:0,feet:0,walking:false};
 const id=String(track.playerId),effect=motion?.effect||{},affected=id===String(effect.actorId)||id===String(effect.targetId)||effect.targets?.some(t=>String(t.playerId)===id);
 if(!affected)return {...neutral,cardId:null};
 if(reduced||frame.done)return neutral;
 const oldAge=previousAge(kind,scaled);
 let pose=oldAge===null?{...neutral,pos:from+delta*frame.progress,done:false}:previous.sampleCardMotion({...track,from,landing:from,localCardId:kind,localEventId:null,localEffectDelayMs:0},oldAge,{effect:{cardId:kind,actorId:motion?.effect?.actorId}},{reduced});
 pose={...pose,...frame,cardId:kind};
 if(kind==='pump')pose.dy+=1.05*(scaled<t.impactMs?span(scaled,t.releaseMs,t.impactMs):1-frame.travel);
 if(kind==='to-the-moon')pose.dy+=.35*(scaled<t.impactMs?span(scaled,t.releaseMs,t.impactMs):1-frame.travel);
 if(oldAge===null){const air=Math.sin(frame.progress*Math.PI);pose.dy=delta?air*(kind==='wormhole'?1.4:.65):0;pose.roll=delta?air*.18:0;}
 if(kind==='wormhole'){
  const emerge=smooth(span(scaled,t.arriveMs-300,t.arriveMs)),size=scaled<t.impactMs?1-.965*smooth(frame.action):.035+.965*emerge;
  pose.pos=scaled<t.impactMs?from:to;pose.scaleX=pose.scaleY=size;pose.dy=scaled<t.impactMs?0:Math.sin(emerge*Math.PI)*.22;pose.roll=0;
 }
 if(kind==='bonk'||kind==='pocket-rocket'||kind==='rekt'||kind==='mimic'){
  const hit=Math.sin(span(scaled,t.impactMs,t.impactMs+140)*Math.PI);if(delta){pose.scaleX=1+hit*.2;pose.scaleY=1-hit*.24;}
 }
 if(kind==='network-down'){
  // The hit is a short bounded shudder, never a move or a persistent shake.
  const victim=id===String(effect.targetId),shock=span(scaled,t.impactMs,t.arriveMs),envelope=Math.sin(shock*Math.PI)*(1-shock);
  pose.pos=to;pose.dy=victim?.1*envelope:0;pose.roll=victim?Math.sin(shock*Math.PI*7)*.1*envelope:0;
  pose.scaleX=1+(victim?.06*envelope:0);pose.scaleY=1-(victim?.06*envelope:0);pose.arm=victim?0:.7*Math.sin(frame.action*Math.PI);
 }
 return pose;
}
