// Local economy/endgame revision. Saved v7/v8 boards remain immutable.
import {CARDS as PREVIOUS,BOARD as PREVIOUS_BOARD,BOARD_PROFILES,boardForProfile as oldBoardForProfile,EVENTS as PREVIOUS_EVENTS,STARTER_ITEMS} from '../card-effects/rules.js';
export {BOARD_PROFILES,STARTER_ITEMS};
export const RULES_VERSION='local-cards-v9';
export const FINISH_CARD_ZONE=6;
export const COLLECT_BELOW=5;
export const SHOP_MILESTONES=Object.freeze([48,72,96,120]);
export const LATE_PANDORA_START=84;
export const PANDORA_ADDITIONS=Object.freeze([86,93,98,102,107,115,120,125,133,139]);
export const FINAL_SUPPLY=Object.freeze({draw:Object.freeze([109,122,126,131,140]),market:Object.freeze([113,129,136])});
const prices={bonk:2,hook:3,swap:4,pump:2,'to-the-moon':5,'pocket-rocket':4,gigachad:2,'rug-pull':1,reverse:2,gamba:3,'trade-offer':3};
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const CARDS=freeze(PREVIOUS.map(c=>({...structuredClone(c),purchaseCost:prices[c.id]})));
export const EVENTS=freeze(structuredClone(PREVIOUS_EVENTS));
const weights={stonks:6,'free-mint':12,wormhole:19,jackpot:3,'not-stonks':6,mimic:16,'paper-hands':10,rekt:8,bombardiro:20};
export const LATE_EVENTS=freeze({pandora:EVENTS.pandora.map(e=>({...structuredClone(e),weight:weights[e.id],probability:weights[e.id]/100}))});
export function pandoraEventAt(value,section=0){
 if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('Random value must be in [0, 1).');
 let boundary=0;return (section>=LATE_PANDORA_START?LATE_EVENTS:EVENTS).pandora.find(e=>(boundary+=e.weight)>value*100);
}
function upgrade(board){
 const result=structuredClone(board);result.version=RULES_VERSION;result.deck.file='game/race-foundation/rules.js';
 for(const number of PANDORA_ADDITIONS){if(result.tiles.some(t=>t.number===number))throw Error(`Pandora overlaps section ${number}.`);result.tiles.push({number,type:'pandora',effect:'pandora',name:'PANDORA BOX'});}
 for(const [type,numbers] of Object.entries(FINAL_SUPPLY))for(const number of numbers){if(result.tiles.some(t=>t.number===number))throw Error(`Supply overlaps section ${number}.`);result.tiles.push({number,type,effect:type,name:type==='draw'?'FOUND IT!':'POCKET SHOP'});}
 result.tiles.sort((a,b)=>a.number-b.number);
 result.resources.collectBelow=COLLECT_BELOW;
 result.shopMilestones=[...SHOP_MILESTONES];
 result.eventDecks={file:'game/race-foundation/rules.js',pandora:9,resolve:'weighted-independent',lateFrom:LATE_PANDORA_START,early:'45-45-10',late:'40-40-20'};
 result.turn.order=['normal-die','normal-move','landing-effect-or-throne-trial','optional-checkpoint-shop','one-optional-card-or-low-balance-collect','pass'];
 result.turn.choose='middle-phase';
 result.turn.movementPhases=[{from:0,to:67,mode:'sum',dice:2},{from:68,to:107,mode:'choose',dice:2,choose:1},{from:108,to:143,mode:'single',dice:1}];
 return freeze(result);
}
export const BOARD=upgrade(PREVIOUS_BOARD);
const boards=new Map();
export function boardForProfile(id='baseline'){if(!boards.has(id))boards.set(id,upgrade(oldBoardForProfile(id)));return boards.get(id);}
