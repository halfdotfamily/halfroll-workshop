// Pandora's plane and falling box have separate, pinned outcomes. Saved v14 stays exact.
import {CARDS,STARTER_ITEMS,EVENTS as oldEvents,LATE_EVENTS as oldLate,boardForProfile as oldBoard,LATE_PANDORA_START} from '../board-rules/rules.js';
export {CARDS,STARTER_ITEMS,LATE_PANDORA_START};
export {BOARD_PROFILES,FINISH_CARD_ZONE,COLLECT_BELOW,SHOP_MILESTONES,PANDORA_ADDITIONS,FINAL_SUPPLY} from '../board-rules/rules.js';
export const RULES_VERSION='local-cards-v15';
function freeze(v){if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function split(pool){
 const pandora=pool.pandora.flatMap(event=>event.id!=='bombardiro'?[structuredClone(event)]:[
  {...structuredClone(event),name:'BOMBARDIRO CROCODILO!',weight:event.weight/2,probability:event.weight/200,text:'Every racer within 15 tiles, including you, moves a random amount from 8 back to 2 forward.',effects:[{kind:'bombardiro',range:15,min:-8,max:2}]},
  {id:'pandora-box',name:'PANDORA BOX!',polarity:'chaos',deck:'chaos',weight:event.weight/2,probability:event.weight/200,text:'Every racer within 15 tiles, including you, moves back 5–10 tiles.',effects:[{kind:'pandora-box',range:15,min:-10,max:-5}]}
 ]);
 return freeze({pandora,good:pandora.filter(e=>e.polarity==='good'),bad:pandora.filter(e=>e.polarity==='bad'),chaos:pandora.filter(e=>e.polarity==='chaos')});
}
export const EVENTS=split(oldEvents),LATE_EVENTS=split(oldLate);
export function pandoraEventAt(value,section=0){if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('Random value must be in [0, 1).');let boundary=0;return (section>=LATE_PANDORA_START?LATE_EVENTS:EVENTS).pandora.find(e=>(boundary+=e.weight)>value*100);}
const boards=new Map();
export function boardForProfile(id='baseline'){
 if(!boards.has(id)){const b=structuredClone(oldBoard(id));b.version=RULES_VERSION;b.deck.file='game/race-rules/rules.js';b.eventDecks={...b.eventDecks,file:'game/race-rules/rules.js',pandora:10,areaEvents:{bombardiro:{range:15,min:-8,max:2,earlyWeight:5,lateWeight:10},'pandora-box':{range:15,min:-10,max:-5,earlyWeight:5,lateWeight:10}},recipients:'unfinished-including-opener',radius:'inclusive-from-landing',outcomes:'independent-integer-inclusive',chainLanding:false};boards.set(id,freeze(b));}
 return boards.get(id);
}
export const BOARD=boardForProfile('baseline');
