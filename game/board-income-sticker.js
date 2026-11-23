import {BOARD} from './card-effects/rules.js';

/** A normal trail landing can include income from an earlier crossed section.
 * Read the committed delta and route, never infer a reward from the destination.
 * Special landings retain their own card/Pandora/AIRDROP result.
 */
export function boardIncomeSticker(effect,tracks=[]){
 if(!effect||effect.pending||effect.cardId||effect.eventId||effect.kind!=='trail'||!(effect.coins>0))return null;
 const playerId=effect.targetId??effect.actorId,track=tracks.find(t=>String(t.playerId)===String(playerId));
 if(!track)return null;
 const passed=BOARD.incomeMilestones.filter(n=>track.from<n&&track.landing>=n);
 if(!passed.length)return null;
 const n=effect.coins;
 return {playerId,icon:'coins',title:'START INCOME',detail:`+${n} Coin${n===1?'':'s'}`,tone:'good',art:'stonks',sourceCaption:`PASSED ${passed.join(' / ')}`};
}

/** Confirmed board outcomes share the generated paper tickets with cards.
 * Routes supply displacement; coin values are committed deltas, never nominal rewards.
 */
export function boardOutcomeStickers(effect,tracks=[]){
 if(!effect||effect.pending||effect.blocked||effect.cardId||effect.eventId)return [];
 const playerId=effect.targetId??effect.actorId;
 if(playerId===undefined||playerId===null)return [];
 const track=tracks.find(t=>String(t.playerId)===String(playerId));
 const delta=track?Number(track.to)-Number(track.landing??track.from):0;
 const coins=Number(effect.coins)||0,signed=n=>(n>0?'+':'−')+Math.abs(n);
 const item={playerId,icon:'card',tone:'good'};
 const income=boardIncomeSticker(effect,tracks);
 if(income)return [income];
 switch(effect.kind){
  case 'market':return [{...item,art:'market',title:'POCKET SHOP',detail:'',...(coins?{detail:`${signed(coins)} Coins`,sourceCaption:'POCKET SHOP'}:{})}];
  case 'shop-purchase':return [{...item,art:'market',title:'BOUGHT A CARD',sourceCaption:'SHOP',detail:`+1 CARD · ${signed(coins)} Coins`}];
  case 'collect':return [{...item,art:'stonks',title:'COLLECT',sourceCaption:'COLLECT',detail:`+${coins} Coins`}];
  case 'portal':return [{...item,art:'wormhole',title:'PORTAL',sourceCaption:'PORTAL',detail:delta?`${signed(delta)} Tiles`:'NO MOVE'}];
  case 'trap':case 'setback':return [{...item,art:'setback',tone:delta<0?'bad':'good',title:'KNOCKED BACK',sourceCaption:track?.sixSeven||effect.section===67?'SIX SEVEN!':'KNOCKED BACK',detail:delta?`${signed(delta)} Tiles`:'NO MOVE'}];
  case 'trail':case 'coins-gain':case 'coins-loss':
   return coins?[{...item,icon:'coins',art:coins<0?'not-stonks':'stonks',title:'COINS',detail:`${signed(coins)} Coins`,tone:coins<0?'bad':'good'}]:[];
  default:return [];
 }
}
