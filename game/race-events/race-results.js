import {completeFinishRanks as validate,rankedPlayers,FINISH_CELEBRATION_MS} from '../race-results.js';
import {economics} from '../engine.js';
export {rankedPlayers,FINISH_CELEBRATION_MS};
export const FULL_RACE_VERSION='local-cards-v11';
export const isFullRace=value=>(typeof value==='string'?value:value?.rulesVersion)===FULL_RACE_VERSION;
export function completeFinishRanks(match){if(!isFullRace(match))throw Error('Unknown local rules.');return validate({...match,rulesVersion:'match-coins-v6'});}
// Preview-only arithmetic; this module cannot submit or authorize payment.
export function settle(state){completeFinishRanks(state);const slots=economics(state.count,state.buyIn).slots;state.payouts=state.players.map(p=>slots[(p.finishPlace??state.count)-1]??0);return state;}
