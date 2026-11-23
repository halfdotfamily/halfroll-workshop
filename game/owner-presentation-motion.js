// Shared presentation timing. Resolved destinations never come from this module.
import * as original from './card-effects/motion-v3.js';
import {sampleSixSeven,SIX_SEVEN_MS} from './presentation-timing.js';
export * from './card-effects/motion-v3.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function createOwnerMotion(bombardiro={...original.CARD_TIMELINES.bombardiro,impactMs:original.CARD_TIMELINES.bombardiro.impactMs+420,arriveMs:original.CARD_TIMELINES.bombardiro.arriveMs+160}){
 const CARD_TIMELINES=Object.freeze({...original.CARD_TIMELINES,bombardiro:Object.freeze({...bombardiro})});
 function pandoraOriginalAge(age){
  const ms=Math.max(0,age*1000),a=CARD_TIMELINES.bombardiro,b=original.CARD_TIMELINES.bombardiro;let x=0,y=0;
  for(const key of ['dropMs','impactMs','arriveMs','durationMs']){if(ms<=a[key])return (y+clamp((ms-x)/Math.max(1,a[key]-x))*(b[key]-y))/1000;x=a[key];y=b[key];}return b.durationMs/1000;
 }
 function cardMotionFrame(kind,age,options){const f=original.cardMotionFrame(kind,kind==='bombardiro'?pandoraOriginalAge(age):age,options);return kind==='bombardiro'&&f?{...f,age:Math.max(0,age)}:f;}
 function sampleCardMotion(track,age,motion,options){const kind=track?.localCardId||original.kindOf(motion),delay=track?.localEffectDelayMs??original.effectDelayMs(motion);return original.sampleCardMotion(track,kind==='bombardiro'&&age*1000>=delay?delay/1000+pandoraOriginalAge(age-delay/1000):age,motion,options);}
 function cardPresentationMs(motion,options){return original.kindOf(motion)==='bombardiro'&&!motion.effect?.pending&&!motion.effect?.blocked&&!motion.effect?.reflected&&!options?.reduced?original.effectDelayMs(motion)+CARD_TIMELINES.bombardiro.durationMs:original.cardPresentationMs(motion,options);}
 function prepareCardMotion(motion,options){const copy=original.prepareCardMotion(motion,options);if(original.kindOf(motion)==='bombardiro')copy.durationMs=cardPresentationMs(copy,options);return copy;}
 return {...original,CARD_TIMELINES,pandoraOriginalAge,cardMotionFrame,sampleCardMotion,cardPresentationMs,prepareCardMotion};
}
const legacyMotion=createOwnerMotion();
export const {CARD_TIMELINES,pandoraOriginalAge,cardMotionFrame,sampleCardMotion,cardPresentationMs,prepareCardMotion}=legacyMotion;
export const SIX_SEVEN_FINAL_POP_MS=220;
export const SIX_SEVEN_STRIKE_APPEAR_MS=220;
export const SIX_SEVEN_FINAL_POP_HEIGHT=1.2;
export function sampleSixSevenTransfer(age){
 const transfers=(SIX_SEVEN_MS-SIX_SEVEN_FINAL_POP_MS-SIX_SEVEN_STRIKE_APPEAR_MS)/1000,cycle=clamp(age/transfers)*4,index=Math.min(3,Math.floor(cycle)),phase=cycle-index,from=index%2?1:-1,to=-from,pop=smooth((age-transfers)/(SIX_SEVEN_FINAL_POP_MS/1000)),float=clamp((age-transfers-SIX_SEVEN_FINAL_POP_MS/1000)/(SIX_SEVEN_STRIKE_APPEAR_MS/1000));
 return{fromHand:from<0?0:1,toHand:to<0?0:1,phase,pop,finalPopStart:transfers,side:(from+(to-from)*smooth(phase))*1.25*smooth(age/.12),dy:(.4+Math.sin(phase*Math.PI)*2.3)*smooth(age/.1)+(SIX_SEVEN_FINAL_POP_HEIGHT-.4)*pop+Math.sin(float*Math.PI)*.25,roll:from*Math.sin(phase*Math.PI)*.24};
}
export function sampleSixSevenImpact(track,age,durationMs){
 const pose=sampleSixSeven(track,age,durationMs);if(!track.sixSeven||track.to===track.landing)return pose;
 const contact=SIX_SEVEN_MS/1000;
 if(age<contact){const pass=sampleSixSevenTransfer(age),compression=smooth((age-(contact-.1))/.1);return {...pose,dy:pass.dy,roll:pass.roll,handoffSide:pass.side,impactScaleX:1+compression*.22,impactScaleY:1-compression*.26};}
 const u=clamp((age-contact)/Math.max(.001,durationMs/1000-contact)),air=clamp(u/.86),flight=1-(1-air)**2,land=clamp((u-.86)/.14),landing=Math.sin(land*Math.PI),release=Math.exp(-u*25),stretch=Math.sin(clamp(u/.15)*Math.PI);
 return {...pose,pos:track.landing+(track.to-track.landing)*flight,dy:Math.sin(air*Math.PI)*3+SIX_SEVEN_FINAL_POP_HEIGHT*(1-air)+landing*.16,roll:-Math.sin(air*Math.PI)*1.15,handoffSide:-1.25*(1-smooth(air)),impactScaleX:1+release*.22-stretch*.1+landing*.18,impactScaleY:1-release*.26+stretch*.25-landing*.22,stage:u<1?'knockback':'settled'};
}
export function sixSevenHandStrike(age){const contact=SIX_SEVEN_MS/1000,t=age-contact,lead=SIX_SEVEN_STRIKE_APPEAR_MS/1000;return{appear:smooth((t+lead)/.08),windup:smooth((t+lead)/.12),strike:smooth((t+.1)/.1),follow:smooth(t/.14),compression:Math.exp(-((t/.045)**2)),recoil:t>=0?Math.sin(t*20)*Math.exp(-t*5):0,fade:smooth((t-.45)/.22),active:t>=-lead&&t<.67};}
