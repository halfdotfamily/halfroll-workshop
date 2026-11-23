// Local v14: published v12 board/cards, uniform pranks and independent Collect.
import {CARDS as PREVIOUS,STARTER_ITEMS,boardForProfile as previousBoard} from '../throne-rules/rules.js';
export {EVENTS,LATE_EVENTS,BOARD_PROFILES,FINISH_CARD_ZONE,COLLECT_BELOW,SHOP_MILESTONES,LATE_PANDORA_START,PANDORA_ADDITIONS,FINAL_SUPPLY,pandoraEventAt} from '../throne-rules/rules.js';
export {STARTER_ITEMS};
export const RULES_VERSION='local-cards-v14';
function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
export const CARDS=freeze(PREVIOUS.map(card=>{const c=structuredClone(card);if(c.type==='prank'&&Number.isFinite(c.effect.range)){c.effect.range=10;c.text=c.text.replace(/within \d+ tiles/g,'within 10 tiles');}return c;}));
const boards=new Map();
export function boardForProfile(id='baseline'){if(!boards.has(id)){const board=structuredClone(previousBoard(id));board.version=RULES_VERSION;board.deck.file='game/board-rules/rules.js';board.turn.networkDown.range=10;board.turn.prankRange=10;board.turn.order=board.turn.order.map(step=>step==='one-optional-card-or-low-balance-collect-if-unused'?'one-optional-card-and-one-optional-low-balance-collect':step);board.turn.collect={belowCoins:5,gain:2,perPersonalTurn:1,usesCardAction:false};board.turn.shopDecisionFloorMs=10000;board.turn.starterDraft={...board.turn.starterDraft,order:'parallel',uniqueAcrossPlayers:false};boards.set(id,freeze(board));}return boards.get(id);}
export const BOARD=boardForProfile('baseline');
