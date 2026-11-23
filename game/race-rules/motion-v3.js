// One deterministic server/client clock: original plane, five-second falling box.
import * as plane from '../throne-rules/motion-v3.js';
import * as box from '../board-rules/motion-v3.js';
export * from '../throne-rules/motion-v3.js';
export const CARD_TIMELINES=Object.freeze({...plane.CARD_TIMELINES,'pandora-box':box.CARD_TIMELINES.bombardiro});
export const PANDORA_FALL_MS=box.PANDORA_FALL_MS,pandoraOriginalAge=box.pandoraOriginalAge;
const isBox=m=>plane.kindOf(m)==='pandora-box';
const alias=m=>({...m,effect:{...m.effect,eventId:'bombardiro'}});
export function cardPresentationMs(m,options){return isBox(m)?box.cardPresentationMs(alias(m),options):plane.cardPresentationMs(m,options);}
export function prepareCardMotion(m,options){
 if(!m||!isBox(m))return plane.prepareCardMotion(m,options);
 const copy=box.prepareCardMotion(alias(m),options);copy.effect.eventId='pandora-box';copy.tracks=copy.tracks.map(t=>({...t,localCardId:'pandora-box'}));return copy;
}
export function cardMotionFrame(kind,age,options){return kind==='pandora-box'?{...box.cardMotionFrame('bombardiro',age,options),kind}:plane.cardMotionFrame(kind,age,options);}
export function sampleCardMotion(track,age,m,options){return track?.localCardId==='pandora-box'?box.sampleCardMotion({...track,localCardId:'bombardiro'},age,alias(m),options):plane.sampleCardMotion(track,age,m,options);}
