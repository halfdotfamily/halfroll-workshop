// New local matches only. Keep the v7 engine/catalogue unchanged for saved games.
import {CARDS as PREVIOUS,BOARD as PREVIOUS_BOARD,boardForProfile as oldBoardForProfile} from '../card-library/rules.js';
export {EVENTS,STARTER_ITEMS,BOARD_PROFILES,pandoraEventAt} from '../card-library/rules.js';
export const RULES_VERSION='local-cards-v8';
export const FINISH_CARD_ZONE=6;
export const CARDS=Object.freeze(PREVIOUS.map(c=>c.id==='send-it'
 ?Object.freeze({...c,id:'gamba',name:'GAMBA!',text:'50/50: move forward 9 or back 5. The only card that can reach the throne.',effect:{kind:'gamba'}})
 :c.id==='pocket-rocket'?Object.freeze({...c,name:'NUKE IT!',artId:'nuke-it'}):c));
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function upgrade(board){const result=structuredClone(board);result.version=RULES_VERSION;result.deck.file='game/card-effects/rules.js';return freeze(result);}
export const BOARD=upgrade(PREVIOUS_BOARD);
const boards=new Map();
export function boardForProfile(id='baseline'){if(!boards.has(id))boards.set(id,upgrade(oldBoardForProfile(id)));return boards.get(id);}
