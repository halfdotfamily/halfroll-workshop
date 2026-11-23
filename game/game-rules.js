export * from './race-rules/engine.js';
export {completeFinishRanks, rankedPlayers} from './race-rules/race-results.js';
export const isNewRules = version => version === 'local-cards-v15';
