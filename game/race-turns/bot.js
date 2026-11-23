// Policy only: legal engine actions own all mutations and gameplay randomness.
// A rival's card identities, deck order and mutable random seed are never read.
import {EVENTS,LATE_EVENTS,LATE_PANDORA_START} from './rules.js';
export function botPersonality(seed=0,seat=0){
 let n=(Math.imul((seed>>>0)^0x9e3779b9,1664525)+Math.imul(seat+1,1013904223))>>>0;
 n=(n^(n>>>16))>>>0;
 const index=n%3;
 return {name:['careful','balanced','bold'][index],risk:[.1,.45,.8][index]};
}
function view(api,s,id=s.activePlayer){
 const owner=s.players.find(p=>p.id===id);
 const players=s.players.map(p=>({id:p.id,pos:p.pos,coins:p.coins,shield:!!p.shield,finished:!!p.finished,crownSeal:!!p.crownSeal,handCount:p.hand.length,prankReceived:!!p.prankReceived}));
 const me=players.find(p=>p.id===id);
 return {me,players,hand:[...owner.hand],board:api.boardForProfile?.(s.boardProfile??'baseline')??api.BOARD,cards:new Map(api.CARDS.map(c=>[c.id,c])),personality:botPersonality(s.botPersonalitySeed??0,id)};
}
const rivals=v=>v.players.filter(p=>p.id!==v.me.id&&!p.finished);
const coinWorth=v=>v.me.coins<3?1.05:v.me.coins<7?.75:v.me.coins<12?.45:.2;
function threat(v,q){
 const leader=Math.max(v.me.pos,...rivals(v).map(p=>p.pos));
 return .35+(q.pos>=v.me.pos?.7:.15)+(q.pos===leader?.45:0)+(q.pos>=135?.6:0)+(q.crownSeal?.25:0);
}
function targetScore(v,c,q){
 const e=c.effect,d=q.pos-v.me.pos;
 if(e.kind==='hook')return Math.max(0,d);
 if(e.kind==='swap')return d>0?d+(q.pos>=135?1:0):d-2;
 if(q.shield)return -.5;
 if(e.kind==='rivalMove')return Math.min(q.pos,Math.abs(e.amount))*threat(v,q);
 if(e.kind==='rivalTransferSparks')return Math.min(e.amount,q.coins,30-v.me.coins)*coinWorth(v)+.3*threat(v,q);
 if(e.kind==='trade-offer')return v.hand.length>=3?.1:2.3+(v.hand.length===0?1:0)+.25*threat(v,q);
 return 0;
}
function futureTargets(v,c,pos=v.me.pos){
 const e=c.effect;
 return rivals(v).filter(q=>Math.abs(q.pos-pos)<=(e.range??0)&&(!e.aheadOnly||q.pos>pos)&&(!q.prankReceived||e.kind==='hook'));
}
function cardWorth(v,c){
 if(!c)return -100;
 const e=c.effect,remaining=v.board.finish-v.me.pos,near=rivals(v).filter(q=>Math.abs(q.pos-v.me.pos)<=12);
 if(e.kind==='move')return remaining<=6?.1:Math.min(e.amount,Math.max(0,remaining-1))*.7+1.1;
 if(e.kind==='gamba')return remaining<=9?7:3+v.personality.risk*.5;
 if(e.kind==='shield')return v.me.shield?.25:2.8+(near.length?1:0);
 if(e.kind==='reflect')return .9+Math.min(2.5,near.length*.75)+(remaining<=12?.6:0);
 const candidates=futureTargets(v,c);
 const best=Math.max(0,...candidates.map(q=>targetScore(v,c,q)));
 if(e.kind==='hook')return remaining<=6?.1:1.2+best*.75;
 if(e.kind==='swap')return 1+best*.65;
 if(e.kind==='rivalMove')return 1.1+best*.7;
 if(e.kind==='rivalTransferSparks')return .5+best;
 if(e.kind==='trade-offer')return v.hand.length>=3?.6:1.4+best*.55;
 return .5;
}
function pandoraValue(v,pos){
 // Expected actual (clamped) public outcomes; risk is a small variance preference,
 // not a blanket avoidance of all boxes. The late pool has more motion/chaos.
 const c=coinWorth(v),room=v.board.resources.cap-v.me.coins;
 const outcomes={stonks:Math.min(room,5)*c,'free-mint':v.hand.length<3?2.7:Math.min(room,2)*c,wormhole:Math.min(5,143-pos),jackpot:Math.min(room,10)*c,'not-stonks':-Math.min(v.me.coins,4)*c,mimic:-Math.min(pos,5),'paper-hands':v.hand.length?-2.4:-Math.min(v.me.coins,2)*c,rekt:-Math.min(v.me.coins,5)*c-Math.min(pos,3),bombardiro:0};
 const events=(pos>=LATE_PANDORA_START?LATE_EVENTS:EVENTS).pandora;
 const expected=events.reduce((sum,event)=>sum+(outcomes[event.id]??0)*event.weight/100,0);
 const behind=Math.max(0,Math.max(v.me.pos,...rivals(v).map(q=>q.pos))-v.me.pos);
 return expected+(v.personality.risk-.4)*.65+(behind>=12?.3:0);
}
function landingScore(v,distance){
 const pos=Math.min(v.board.finish,v.me.pos+distance);
 if(pos===v.board.finish)return distance+18+(v.me.crownSeal?12:0);
 const tile=v.board.tiles.find(t=>t.number===pos),type=tile?.type??'trail';
 let score=distance;
 if(type==='trap')score-=v.me.shield?.35:Math.min(pos,tile.amount??3);
 if(type==='setback'||type==='portal'){
  const delta=(v.board.links.find(l=>l.from===pos)?.to??pos)-pos;
  score+=delta<0&&v.me.shield?-.35:delta;
 }
 if(type==='airdrop')score+=Math.min(3,v.board.resources.cap-v.me.coins)*coinWorth(v);
 if(type==='draw')score+=v.hand.length<3?3.2:1;
 if(type==='market')score+=v.me.coins>=2?(v.hand.length<2?2.7:v.hand.length<3?1.2:.15):.1;
 if(type==='well')score+=coinWorth(v);
 if(type==='pandora')score+=pandoraValue(v,pos);
 // Prefer useful firing/pulling positions when two dice otherwise tie.
 for(const id of v.hand){const c=v.cards.get(id);if(!c?.effect.range)continue;
  score+=Math.min(2,Math.max(0,...futureTargets(v,c,pos).map(q=>targetScore({...v,me:{...v.me,pos}},c,q))))*.15;
 }
 return score;
}
export function botTurnChoice(api,s,playerId=s.activePlayer){
 const v=view(api,s,playerId);
 let dieIndex=0;
 if(s.movementMode==='choose'&&s.dice?.length>1&&landingScore(v,s.dice[1])>landingScore(v,s.dice[0])+1e-9)dieIndex=1;
 return {playerId,dieIndex,item:'none'};
}
function bestCard(api,s,v){
 const choices=[];
 for(const a of api.cardAvailability(s,v.me.id)){
  if(a.reason||a.card?.timing==='Reaction')continue;
  const c=a.card??v.cards.get(a.id),e=c.effect;
  let score=0,targetId;
  const targets=api.cardTargets(s,v.me.id,c.id).map(id=>v.players.find(p=>p.id===id)).filter(Boolean);
  if(targets.length){
   targets.sort((a,b)=>targetScore(v,c,b)-targetScore(v,c,a)||a.id-b.id);
   targetId=targets[0].id;score=targetScore(v,c,targets[0]);
  }else if(e.kind==='move')score=Math.min(e.amount,Math.max(0,v.board.finish-1-v.me.pos));
  else if(e.kind==='shield')score=1.75+Math.min(1.5,rivals(v).filter(q=>Math.abs(q.pos-v.me.pos)<=10).length*.5);
  else if(e.kind==='gamba'){
   const forward=Math.min(9,v.board.finish-v.me.pos),backward=Math.min(5,v.me.pos);
   const gap=Math.max(0,Math.max(v.me.pos,...rivals(v).map(q=>q.pos))-v.me.pos);
   score=(forward-backward)/2+(v.me.pos+9>=v.board.finish?10:0)+(gap>=10?1:0)+(v.personality.risk-.45)*1.3;
  }
  // Retain weak situational cards for a later shot instead of burning them.
  if(score>.25)choices.push({kind:'playCard',args:{playerId:v.me.id,cardIndex:a.index,...(targetId===undefined?{}:{targetId})},score});
 }
 choices.sort((a,b)=>b.score-a.score||a.args.cardIndex-b.args.cardIndex);
 return choices[0];
}
export function botDecision(api,s){
 if(s.mode!=='playing')return null;
 const id=s.phase==='reaction'?s.pendingEffect?.playerId:s.phase==='discard'?s.pendingDiscard?.playerId:s.activePlayer;
 if(!Number.isInteger(id)||!s.players.some(p=>p.id===id))return null;
 const v=view(api,s,id),args={playerId:id};
 switch(s.phase){
  case 'roll':{
   // Take a useful shot while rivals are close; otherwise retain the action
   // for the actual landing. Never inspect hidden rival hands or deck order.
   const play=bestCard(api,s,v);
   return play&&play.score>1?{kind:play.kind,args:play.args}:{kind:'roll',args};
  }
  case 'trial-roll':return {kind:'roll',args};
  case 'choose':return {kind:'resolveTurn',args:botTurnChoice(api,s,id)};
  case 'trial-result':return {kind:'resolveTrial',args};
  case 'trial-choice':{
   const imminent=rivals(v).some(q=>q.pos>=138||(q.crownSeal&&q.pos>=135));
   return {kind:'chooseTrial',args:{...args,choice:imminent||(v.personality.risk>.7&&rivals(v).some(q=>q.pos>=133))?'risk':'seal'}};
  }
  case 'well':{
   const well=v.board.effects.well,cap=v.board.resources.cap;
   const expected=well.outcomes.reduce((n,o)=>n+o.faces.length/6*(Math.max(0,Math.min(cap,v.me.coins+o.sparks))-v.me.coins),0);
   const safe=Math.min(cap-v.me.coins,well.safeGain);
   return {kind:'chooseWell',args:{...args,choice:expected+(v.personality.risk-.45)*.7>safe?'roll':'safe'}};
  }
  case 'reaction':{
   const legal=api.reactionCards(s),index=v.hand.findIndex(card=>legal.includes(card));
   const e=s.pendingEffect,ops=e.operations??[];
   const loss=ops.reduce((n,op)=>n+(op.kind==='move'?Math.min(v.me.pos,Math.abs(Math.min(0,op.amount))):op.kind==='rivalTransferSparks'?Math.min(v.me.coins,op.amount)*coinWorth(v):op.kind==='trade'?v.hand.length>1?2.7:1.5:0),0);
   return {kind:'react',args:{...args,cardIndex:index>=0&&loss>.75?index:null}};
  }
  case 'shop':{
   const offer=s.pendingShop.offer,handValues=v.hand.map(id=>cardWorth(v,v.cards.get(id))),worst=handValues.length?Math.min(...handValues):0;
   const options=offer.map((id,choice)=>{const c=v.cards.get(id),price=c?.purchaseCost??Infinity;
    let value=cardWorth(v,c)-(v.hand.includes(id)?1.6:0)-(v.hand.length>=3?worst+.8:0)-price*(v.me.coins<5?.35:.16);
    if(v.hand.length>=2&&v.me.coins-price<2)value-=.7;
    return {choice,value,price};
   }).filter(o=>o.price<=v.me.coins).sort((a,b)=>b.value-a.value||a.choice-b.choice);
   return {kind:'chooseShop',args:{...args,choice:options[0]?.value>.6?options[0].choice:null}};
  }
  case 'discard':{
   const choices=v.hand.map((id,cardIndex)=>({cardIndex,value:cardWorth(v,v.cards.get(id))-(v.hand.filter(other=>other===id).length>1?1:0)})).sort((a,b)=>a.value-b.value||b.cardIndex-a.cardIndex);
   return {kind:'discardCard',args:{...args,cardIndex:choices[0].cardIndex}};
  }
  case 'cards':{
   const play=bestCard(api,s,v),recovery=api.canForage(s,id)?Math.min(2,v.board.resources.cap-v.me.coins)*coinWorth(v):0;
   if(play&&play.score>Math.max(.5,recovery))return {kind:play.kind,args:play.args};
   if(recovery)return {kind:'forage',args};
   return {kind:'endTurn',args};
  }
  default:return null;
 }
}
