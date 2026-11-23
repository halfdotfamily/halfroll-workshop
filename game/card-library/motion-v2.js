// Local presentation timing only. These values never select targets or outcomes.
import {walkDurationMs,sampleCellWalk} from '../presentation-timing.js';
export const CARD_TIMELINES=Object.freeze({
 hook:Object.freeze({durationMs:2000,releaseMs:260,catchMs:760,pullMs:1000,arriveMs:1640,retractMs:1900}),
 bombardiro:Object.freeze({durationMs:2800,dropMs:1000,impactMs:1550,arriveMs:2350}),
 bonk:Object.freeze({releaseMs:320,impactMs:620,arriveMs:1160,durationMs:1600}),
 swap:Object.freeze({releaseMs:320,impactMs:850,swapMs:850,arriveMs:1250,durationMs:1800}),
 pump:Object.freeze({releaseMs:220,impactMs:480,arriveMs:1180,durationMs:1600}),
 'to-the-moon':Object.freeze({releaseMs:300,impactMs:600,arriveMs:1850,durationMs:2300}),
 'pocket-rocket':Object.freeze({releaseMs:300,impactMs:1000,arriveMs:1700,durationMs:2300}),
 gigachad:Object.freeze({releaseMs:250,impactMs:700,arriveMs:1100,durationMs:1500}),
 'rug-pull':Object.freeze({releaseMs:320,impactMs:650,arriveMs:1350,durationMs:1800}),
 reverse:Object.freeze({releaseMs:250,impactMs:650,arriveMs:1120,durationMs:1500}),
 'send-it':Object.freeze({releaseMs:250,impactMs:470,arriveMs:1500,durationMs:1900}),
 gamba:Object.freeze({releaseMs:300,impactMs:1800,arriveMs:2550,durationMs:2950}),
 'trade-offer':Object.freeze({releaseMs:300,impactMs:650,arriveMs:1300,durationMs:1750}),
});
const STAGES=Object.freeze({bonk:['anticipation','swing','hit','recover'],swap:['anticipation','disappear','reappear','recover'],pump:['anticipation','compress','launch','land'],'to-the-moon':['anticipation','ignite','flight','land'],'pocket-rocket':['anticipation','flight','hit','recover'],gigachad:['anticipation','deploy','hold','recover'],'rug-pull':['anticipation','cast','pull','collect'],reverse:['anticipation','flip','return','recover'],'send-it':['anticipation','crouch','leap','land'],'trade-offer':['anticipation','offer','transfer','receive']});
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
const span=(ms,a,b)=>clamp((ms-a)/Math.max(1,b-a));
const idOf=motion=>typeof motion==='string'?motion:motion?.effect?.cardId||motion?.cardId||(motion?.effect?.eventId==='bombardiro'?'bombardiro':null);
const applicable=motion=>typeof motion==='string'||!motion?.effect?.pending&&!motion?.effect?.blocked&&!motion?.effect?.reflected;
const eventDelay=motion=>motion?.effect?.eventId==='bombardiro'?Math.max(0,...(motion.tracks||[]).map(walkDurationMs)):0;

export function cardPresentationMs(motion,{reduced=false}={}){
 const timeline=applicable(motion)&&CARD_TIMELINES[idOf(motion)];
 return timeline?eventDelay(motion)+(reduced?120:timeline.durationMs):Number(motion?.durationMs)||0;
}

/** Immutable adapter: retain authoritative endpoints, extend cosmetic playback. */
export function prepareCardMotion(motion,{reduced=false}={}){
 if(!motion)return motion;
 const copy=structuredClone(motion),cardId=idOf(motion);
 if(!CARD_TIMELINES[cardId]||!applicable(motion))return copy;
 copy.durationMs=cardPresentationMs(motion,{reduced});
 copy.localPresentation='card-cinema-v2';
 const delayMs=eventDelay(copy);
 copy.tracks=(copy.tracks||[]).map(track=>({...track,localCardId:cardId,localActorId:copy.effect?.actorId,localTargetId:copy.effect?.targetId,...(copy.effect?.eventId==='bombardiro'?{localEventId:'bombardiro',localEffectDelayMs:delayMs}:{})}));
 return copy;
}

export function cardMotionFrame(kind,age,{reduced=false}={}){
 const timeline=CARD_TIMELINES[kind];if(!timeline)return null;
 const ms=Math.max(0,Number.isFinite(Number(age))?Number(age):0)*1000;
 if(reduced)return {kind,age:ms/1000,stage:'settled',progress:1,anticipation:1,action:1,travel:1,impact:1,recover:1,done:true,durationMs:120,reduced:true};
 const done=ms>=timeline.durationMs;
 if(kind==='hook'){
  const stage=ms<timeline.releaseMs?'anticipation':ms<timeline.catchMs?'cast':ms<timeline.pullMs?'tension':ms<timeline.arriveMs?'pull':ms<timeline.retractMs?'brake':done?'settled':'retract';
  return {kind,age:ms/1000,stage,done,durationMs:timeline.durationMs,progress:smooth(span(ms,timeline.pullMs,timeline.arriveMs)),cast:span(ms,timeline.releaseMs,timeline.catchMs),tension:span(ms,timeline.catchMs,timeline.pullMs),brake:span(ms,timeline.arriveMs,timeline.durationMs),retract:span(ms,timeline.arriveMs,timeline.retractMs)};
 }
 if(kind==='bombardiro'){
  const stage=ms<timeline.dropMs?'flyover':ms<timeline.impactMs?'drop':ms<timeline.arriveMs?'blast':done?'settled':'recover';
  return {kind,age:ms/1000,stage,done,durationMs:timeline.durationMs,progress:smooth(span(ms,timeline.impactMs,timeline.arriveMs)),drop:span(ms,timeline.dropMs,timeline.impactMs),blast:span(ms,timeline.impactMs,timeline.durationMs),recover:span(ms,timeline.arriveMs,timeline.durationMs)};
 }
 if(kind==='gamba'){
  const travel=span(ms,timeline.impactMs,timeline.arriveMs);
  return {kind,age:ms/1000,stage:done?'settled':ms<timeline.releaseMs?'anticipation':ms<timeline.impactMs?'spin':ms<timeline.arriveMs?'reveal':'land',done,durationMs:timeline.durationMs,progress:smooth(travel),anticipation:span(ms,0,timeline.releaseMs),action:span(ms,timeline.releaseMs,timeline.impactMs),travel,recover:span(ms,timeline.arriveMs,timeline.durationMs)};
 }
 const phases=STAGES[kind],travel=span(ms,timeline.impactMs,timeline.arriveMs);
 const stage=done?'settled':ms<timeline.releaseMs?phases[0]:ms<timeline.impactMs?phases[1]:ms<timeline.arriveMs?phases[2]:phases[3];
 return {kind,age:ms/1000,stage,done,durationMs:timeline.durationMs,anticipation:span(ms,0,timeline.releaseMs),action:span(ms,timeline.releaseMs,timeline.impactMs),travel,impact:span(ms,timeline.impactMs,Math.min(timeline.arriveMs,timeline.impactMs+180)),recover:span(ms,timeline.arriveMs,timeline.durationMs),progress:kind==='swap'?(ms<timeline.swapMs?0:1):smooth(travel)};
}

/** Samples only an already chosen engine track, bounded to its endpoints. */
export function sampleCardMotion(track,age,motion,{reduced=false}={}){
 const kind=track?.localCardId||idOf(motion)||track?.cardId;
 if(!CARD_TIMELINES[kind]||!applicable(motion))return null;
 const event=motion?.effect?.eventId==='bombardiro'||track?.localEventId==='bombardiro',delayMs=event?(track.localEffectDelayMs??eventDelay(motion)):0;
 if(event&&!reduced&&age*1000<delayMs)return {kind,cardId:kind,stage:'walk',done:false,progress:0,...sampleCellWalk(track,Math.max(0,age)),roll:0,lean:0,scaleX:1,scaleY:1,arm:0,feet:0};
 const frame=cardMotionFrame(kind,event?Math.max(0,age-delayMs/1000):age,{reduced}),from=Number(event?(track.landing??track.from):track.from)||0,to=Number(track.to)||0,actorId=motion?.effect?.actorId??track.localActorId,isActor=String(track.playerId)===String(actorId),delta=to-from;
 if(reduced||frame.done)return {...frame,cardId:kind,pos:to,dy:0,roll:0,lean:0,scaleX:1,scaleY:1,arm:0,feet:0,walking:false};
 const progress=frame.progress,pos=from+delta*progress;
 if(kind==='hook'){
  const anticipation=frame.stage==='anticipation'?Math.sin(clamp(frame.age*1000/CARD_TIMELINES.hook.releaseMs)*Math.PI/2):0;
  const tension=frame.stage==='tension'?Math.sin(frame.tension*Math.PI)*.12:0;
  const pull=frame.stage==='pull'?Math.sin(progress*Math.PI):0;
  const brake=frame.stage==='brake'?Math.sin(clamp(frame.brake*3)*Math.PI):0;
  return {...frame,cardId:kind,pos,dy:pull*.14,roll:0,lean:anticipation*.14-tension-pull*.24+brake*.13,scaleX:1+(anticipation+brake)*.035,scaleY:1-(anticipation+brake)*.045,arm:frame.stage==='anticipation'?-anticipation:frame.stage==='cast'?frame.cast:frame.stage==='tension'||frame.stage==='pull'?1:1-frame.brake,feet:pull*.22+brake*.28,walking:false};
 }
 const air=progress<=0||progress>=1?0:Math.sin(progress*Math.PI),recovery=Math.sin((frame.recover||0)*Math.PI)*Math.exp(-(frame.recover||0)*3);
 if(kind==='bombardiro')return {...frame,cardId:kind,pos,dy:Math.abs(delta)>.001?air*(isActor?.8:1.05):0,roll:!isActor&&delta?air*.38:0,lean:isActor?-air*.13:air*.1,scaleX:1+recovery*.1,scaleY:1-recovery*.1,walking:false};
 const moving=Math.abs(delta)>.001,direction=Math.sign(delta),wind=Math.sin(frame.action*Math.PI),flight=Math.sin(frame.travel*Math.PI);
 const pose={...frame,cardId:kind,pos,dy:0,roll:0,lean:0,scaleX:1,scaleY:1,arm:0,feet:0,walking:false};
 switch(kind){
  case 'gamba':pose.dy=moving?air*.6:0;pose.lean=-direction*air*.16;pose.feet=air*.12;break;
  case 'bonk':pose.dy=moving?air*.55:0;pose.roll=air*.3;pose.lean=air*.2;pose.scaleX+=recovery*.16;pose.scaleY-=recovery*.18;break;
  case 'swap':{const size=frame.age*1000<CARD_TIMELINES.swap.swapMs?1-.965*smooth(frame.action):.035+.965*smooth(frame.travel);pose.scaleX=pose.scaleY=size;pose.roll=wind*.12-flight*.12;break;}
  case 'pump':pose.dy=moving?air*1.2:0;pose.lean=-air*.15;pose.scaleX+=wind*.13+recovery*.1;pose.scaleY-=wind*.2+recovery*.13;pose.feet=air*.18;break;
  case 'to-the-moon':pose.dy=moving?air*2.2:0;pose.lean=-air*.22;pose.scaleX+=wind*.07+recovery*.1;pose.scaleY-=wind*.12+recovery*.13;pose.feet=air*.12;break;
  case 'pocket-rocket':pose.dy=moving?air*.7:0;pose.lean=moving?air*.25:0;pose.roll=moving?air*.3:0;pose.scaleX+=recovery*.13;pose.scaleY-=recovery*.17;pose.feet=moving?air*.12:0;break;
  case 'gigachad':pose.lean=-wind*.14;pose.scaleX+=wind*.04;pose.scaleY-=wind*.05;pose.arm=Math.sin(Math.PI*span(frame.age*1000,CARD_TIMELINES.gigachad.releaseMs,CARD_TIMELINES.gigachad.durationMs))*.65;break;
  case 'rug-pull':pose.lean=wind*.12-flight*.2;pose.roll=flight*.06;break;
  case 'reverse':pose.lean=-wind*.12;pose.roll=flight*.15;break;
  case 'send-it':pose.dy=moving?air*(delta<0?.9:1.5):0;pose.lean=-direction*air*.23;pose.roll=delta<0?air*.35:air*.1;pose.scaleX+=wind*.12+recovery*.13;pose.scaleY-=wind*.18+recovery*.15;pose.feet=air*.2;break;
  case 'trade-offer':pose.lean=wind*.12-flight*.07;pose.arm=flight*.55;break;
 }
 return pose;
}
