export * from './throne-rules/motion-v3.js';
import {CARD_TIMELINES as previous} from './throne-rules/motion-v3.js';
import {createOwnerMotion} from './owner-presentation-motion.js';
export const PANDORA_FALL_MS=3620;
const old=previous.bombardiro,impactMs=PANDORA_FALL_MS;
const motion=createOwnerMotion({...old,impactMs,arriveMs:impactMs+old.arriveMs-old.impactMs,durationMs:impactMs+old.durationMs-old.impactMs});
export const {CARD_TIMELINES,pandoraOriginalAge,cardMotionFrame,sampleCardMotion,cardPresentationMs,prepareCardMotion}=motion;
