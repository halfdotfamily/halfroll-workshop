// New card and bidirectional NUKE are versioned separately from authored v11 tables.
import {CARDS as PREVIOUS,STARTER_ITEMS,boardForProfile as previousBoard} from '../race-events/rules.js';
export {EVENTS,LATE_EVENTS,BOARD_PROFILES,FINISH_CARD_ZONE,COLLECT_BELOW,SHOP_MILESTONES,LATE_PANDORA_START,PANDORA_ADDITIONS,FINAL_SUPPLY,pandoraEventAt} from '../race-events/rules.js';
export {STARTER_ITEMS};
export const RULES_VERSION='local-cards-v12';
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const CARDS=freeze([...PREVIOUS.map(card=>card.id==='reverse'?{...structuredClone(card),text:'Reflect BONK!, RUG PULL!, TRADE OFFER or NETWORK DOWN! back to its sender.'}:card.id==='pocket-rocket'?{...structuredClone(card),text:'Send a rival within 6 tiles, ahead or behind, back 5. Shields block it.',effect:{...card.effect,aheadOnly:false}}:structuredClone(card)),{
 id:'network-down',name:'NETWORK DOWN!',purchaseCost:4,type:'prank',cost:0,copies:3,oneShot:true,persistent:false,timing:'Before rolling or after landing',
 text:'Shock a rival within 6 tiles. They skip their next turn. Shields block; REVERSE reflects. No repeat stun until after their next normal turn.',
 effect:{kind:'networkDown',range:6,skipTurns:1},
}]);
const boards=new Map();
export function boardForProfile(id='baseline'){
 if(!boards.has(id)){
  const board=structuredClone(previousBoard(id));board.version=RULES_VERSION;board.deck.file='game/throne-rules/rules.js';
  board.deck.designCount=CARDS.length;board.deck.totalCards=CARDS.reduce((n,c)=>n+c.copies,0);board.deck.copiesPerDesign=null;
  board.deck.copiesByDesign=Object.fromEntries(CARDS.map(c=>[c.id,c.copies]));
  board.turn.networkDown={range:6,skipPersonalTurns:1,recovery:'through-next-normal-turn',stackable:false};
  boards.set(id,freeze(board));
 }
 return boards.get(id);
}
export const BOARD=boardForProfile('baseline');
