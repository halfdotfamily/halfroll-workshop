// V4 timing revision. Saved v9 economics, boards and turn timing stay immutable.
import {CARDS as PREVIOUS,boardForProfile as previousBoard} from '../race-foundation/rules.js';
export {EVENTS,LATE_EVENTS,STARTER_ITEMS,BOARD_PROFILES,FINISH_CARD_ZONE,COLLECT_BELOW,SHOP_MILESTONES,LATE_PANDORA_START,PANDORA_ADDITIONS,FINAL_SUPPLY,pandoraEventAt} from '../race-foundation/rules.js';
export const RULES_VERSION='local-cards-v10';
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const CARDS=freeze(PREVIOUS.map(card=>{
 const c=structuredClone(card);
 if(c.timing!=='Reaction')c.timing='Before rolling or after landing';
 if(c.id==='swap'){c.effect.range=10;c.text='Swap places with a rival within 10 tiles.';}
 return c;
}));
const boards=new Map();
export function boardForProfile(id='baseline'){
 if(!boards.has(id)){
  const board=structuredClone(previousBoard(id));board.version=RULES_VERSION;board.deck.file='game/race-turns/rules.js';
  board.turn.order=['optional-card-before-roll','normal-die','normal-move','landing-effect-or-throne-trial','optional-checkpoint-shop','one-optional-card-or-low-balance-collect-if-unused','pass'];
  board.turn.cardActionLimit=1;board.turn.diceModePinned='personal-turn-start';
  boards.set(id,freeze(board));
 }
 return boards.get(id);
}
export const BOARD=boardForProfile('baseline');
