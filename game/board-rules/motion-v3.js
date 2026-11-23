export * from '../throne-rules/motion-v3.js';
import {CARD_TIMELINES as previous} from '../throne-rules/motion-v3.js';
import {createOwnerMotion} from '../owner-presentation-motion.js';
// New local v14 alone waits for the full five-second descent. Saved versions
// retain their existing gates. No radius, RNG or resolved destination changes.
export const PANDORA_FALL_MS=5000;
const old=previous.bombardiro,impactMs=PANDORA_FALL_MS+52;
const motion=createOwnerMotion({...old,impactMs,arriveMs:impactMs+old.arriveMs-old.impactMs,durationMs:impactMs+old.durationMs-old.impactMs});
export const {CARD_TIMELINES,pandoraOriginalAge,cardMotionFrame,sampleCardMotion,cardPresentationMs,prepareCardMotion}=motion;
