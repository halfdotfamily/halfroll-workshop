import {createPandoraEnhancements as createLegacyEnhancements} from './legacy-pandora-blast-vfx.js';
import * as current16Motion from './courier-rules/motion-v3.js';
import * as current15Motion from './race-rules/motion-v3.js';
import {EFFECT_TIME_SCALE} from './presentation-timing.js';
import {renderCardArt as legacyArt} from '../world/route/card-art.js';
import {generatedCardArt} from './card-library/art-samples.js';
import {buildCardVfx} from './card-library/vfx.js';
import {RULES_VERSION} from './card-library/rules.js';
import * as currentMotion from './owner-presentation-motion.js';
import * as current14Motion from './board-rules/motion-v3.js';
import {createPandoraEnhancements as createCinemaEnhancements} from './pandora-blast-vfx.js';

/** Saved reusable items retain their original picture and rules. */
export function renderCardArt(card){
 return card?.oneShot ? generatedCardArt(card.artId||card.id)||legacyArt(card) : legacyArt(card);
}

/** Create the new presenter only for a matching game, and dispose it on exit. */
export function buildVersionedCardVfx(scene,options){
 let active=null,version=null;
 function select(state){
  if([RULES_VERSION,'local-cards-v8','local-cards-v9','local-cards-v10','local-cards-v11','local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'].includes(state.rulesVersion)){
   if(version!==state.rulesVersion){active?.destroy();active=null;version=state.rulesVersion;}
   const modernBox=['local-cards-v15','local-cards-v16'].includes(state.rulesVersion);
   const motionApi=state.rulesVersion==='local-cards-v16'?current16Motion:modernBox?current15Motion:state.rulesVersion==='local-cards-v14'?current14Motion:currentMotion;
   active??=buildCardVfx(scene,state.rulesVersion!==RULES_VERSION?{...options,presentationTimeScale:EFFECT_TIME_SCALE,motionApi,enhancements:(modernBox?createCinemaEnhancements:createLegacyEnhancements)({motionApi,...(modernBox?{boxKind:'pandora-box'}:{})})}:options);
  }
  else if(active){active.destroy();active=null;}
 }
 return{
  legacyState(state){select(state);return active?.legacyState(state)??state;},
  sync(state,...args){select(state);active?.sync(['local-cards-v14','local-cards-v15','local-cards-v16'].includes(state.rulesVersion)?{...state,rulesVersion:'local-cards-v12'}:state,...args);},
  update(...args){active?.update(...args);},
  placeHeadScenes(...args){active?.placeHeadScenes(...args);},
  sample(track,age,duration,fallback){return active?.sample(track,age,duration,fallback)??fallback;},
  decorate(...args){active?.decorate(...args);},
  debug(){return active?.debug()??{active:0,versioned:true};},
  destroy(){active?.destroy();active=null;},
 };
}
