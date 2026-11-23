import {isFullRace,completeFinishRanks,FINISH_CELEBRATION_MS,settle} from './race-results.js';
import {economics,COLORS,ECONOMY_VERSION} from '../engine.js';
import {SELECTABLE_CHARACTERS} from '../characters.js';
import {botDecision,botTurnChoice as chooseBotDie} from './bot.js';
const movementMode=position=>position>=108?'single':position>=68?'choose':'sum';
import {presentationDurationMs,CELL_STEP_MS} from '../presentation-timing.js';
import {BOARD,CARDS,EVENTS,LATE_EVENTS,RULES_VERSION,STARTER_ITEMS,BOARD_PROFILES,boardForProfile,pandoraEventAt,FINISH_CARD_ZONE,COLLECT_BELOW,SHOP_MILESTONES} from './rules.js';
export {BOARD,CARDS,EVENTS,RULES_VERSION,STARTER_ITEMS,BOARD_PROFILES,boardForProfile,movementMode};
export const FINISH=BOARD.finish,TURN_LIMIT=3000;
export const ITEMS=Object.freeze({none:{name:'No card',cost:0}}),ITEM_COSTS=Object.freeze({none:0});
const cardById=new Map(CARDS.map(c=>[c.id,c]));
export const boardForRules=(version,profile='baseline')=>{if(version!==RULES_VERSION)throw Error('Unknown local rules.');return boardForProfile(profile);};
const profileId=s=>Object.hasOwn(s,'boardProfile')?s.boardProfile:'baseline';
const matchBoard=s=>boardForRules(s.rulesVersion,profileId(s));
function pinProfile(s,id){boardForProfile(id);Object.defineProperty(s,'boardProfile',{value:id,enumerable:true,writable:false,configurable:true});return s;}
export const cardsForRules=version=>{if(version!==RULES_VERSION)throw Error('Unknown local rules.');return CARDS;};
const sixSevenRules=()=>true,timedShields=()=>true;
function armShield(s,p){p.shield=true;}
function clearShield(p){p.shield=false;}
function expireShield(){}
export function shieldTurnsLeft(s,p){return p.shield?null:0;}
const tilesByProfile=new Map(BOARD_PROFILES.map(p=>[p.id,new Map(boardForProfile(p.id).tiles.map(t=>[t.number,t]))]));
const tileAt=(n,version=RULES_VERSION,profile='baseline')=>{boardForRules(version,profile);return tilesByProfile.get(profile).get(n);};
export const TRAPS=BOARD.tiles.filter(t=>['trap','setback'].includes(t.type)).map(t=>t.number);
export const BONUSES=BOARD.tiles.filter(t=>['airdrop','market','draw'].includes(t.type)).map(t=>t.number);
export function cellEffect(n,version=RULES_VERSION,profile='baseline'){if(!Number.isInteger(n)||n<0||n>FINISH)throw RangeError('Invalid section.');boardForRules(version,profile);return n>=FINISH?'finish':n===0?'start':tileAt(n,version,profile)?.type??'trail';}
function random(s){let value;if(typeof s.randomSource==='function')value=s.randomSource();else{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;value=s.seed/4294967296;}if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('Random source must return [0, 1).');return value;}
const d6=s=>1+Math.floor(random(s)*6);
function shuffle(s,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function take(s,key){const d=s.decks[key];if(!d.draw.length&&d.discard.length){d.draw=shuffle(s,d.discard);d.discard=[];}return d.draw.pop()??null;}
function draw(s,p,n=1){for(let i=0;i<n;i++){const id=take(s,'hand');if(id)p.hand.push(id);}}
function gain(p,n){p.coins=Math.max(0,Math.min(BOARD.resources.cap,p.coins+n));p.sparks=p.points=p.coins;}
function move(p,n){p.pos=Math.max(0,Math.min(FINISH-1,p.pos+n));}
function note(s,text){s.log.unshift(text);s.log=s.log.slice(0,60);if(s.lastTurn)s.lastTurn.notes.push(text);}
function cue(s,data){s.presentationCue={serial:(s.presentationCue?.serial??0)+1,...data};}
function active(s,id,phase){matchBoard(s);if(s.mode!=='playing'||s.phase!==phase)throw new Error(`This action is not available during ${s.phase}.`);if(isFullRace(s)&&s.players[id]?.finished)throw new Error('Your finish place is already locked.');if(!Number.isInteger(id)||id!==s.activePlayer)throw new Error('Only the active player can act.');}
function sync(s){if(s.lastTurn){s.lastTurn.to=s.players[s.lastTurn.playerId].pos;s.lastTurn.after=s.players.map(p=>p.pos);}for(const p of s.players)p.sparks=p.points=p.coins;return s;}
function beginTurn(s){
 const p=s.players[s.activePlayer];s.turnStartPosition=p.pos;s.movementMode=movementMode(p.pos);s.turnRolled=false;
 p.reactionUsed=false;p.proactiveUsed=false;p.collectUsed=false;p.prankReceived=false;s.lastEvent=null;s.lastWell=null;
}
function cardsWindow(s){
 const p=s.players[s.activePlayer];
 if(p.hand.length>BOARD.deck.handLimit){s.pendingDiscard={playerId:p.id,reason:'overflow',count:p.hand.length-BOARD.deck.handLimit};s.phase='discard';}
 else if(s.pendingCheckpointShop?.playerId===p.id&&!s.normalShopUsed)shop(s,'checkpoint');
 else s.phase=s.turnRolled===false?'roll':'cards';sync(s);
}
function end(s){
 sync(s);
 // Recovery ends only after this racer completes a real turn. Consuming a skip
 // below must not immediately remove that racer's protection from another stun.
 s.players[s.activePlayer].networkDownImmune=false;
 const skipped=[];
 // Each racer can lose at most one pending turn. Even if everybody was stunned,
 // one complete pass consumes all flags and the next eligible slot is live.
 for(let inspected=0;inspected<=s.count*2;inspected++){
  s.activePlayer=(s.activePlayer+1)%s.count;
  const next=s.players[s.activePlayer];
  if(isFullRace(s)&&next.finished)continue;
  s.turn++;
  if(next.networkDownTurns>0){
   next.networkDownTurns=0;next.networkDownImmune=true;s.turnCount++;
   next.stats??={};next.stats.turnsSkipped=(next.stats.turnsSkipped??0)+1;
   const serial=s.networkDownSkipSerial=(s.networkDownSkipSerial??0)+1;
   skipped.push({playerId:next.id,serial,turn:s.turn});note(s,`${next.name}: TURN SKIPPED — NETWORK DOWN!`);
   continue;
  }
  s.activeId=s.activePlayer;s.round=Math.floor(s.turnCount/s.count)+1;
  s.phase='roll';s.dice=null;s.pendingEffect=null;s.pendingTrial=null;s.pendingShop=null;s.pendingDraw=null;s.pendingDiscard=null;s.pendingLanding=null;s.pendingCheckpointShop=null;s.normalShopUsed=false;
  if(skipped.length)s.skippedTurns=skipped;
  expireShield(s,next,next.ownTurns+1);beginTurn(s);return s;
 }
 throw Error('No racer can take the next turn.');
}
function win(s,id){
 if(!isFullRace(s)){s.winnerId=id;s.finishReason='throne';settle(s);s.phase='finished';note(s,`${s.players[id].name} wins the Throne Trial.`);return sync(s);}
 const p=s.players[id];if(p.finished||s.finishOrder.includes(id))throw new Error('Your finish place is already locked.');
 p.finished=true;p.finishPlace=s.finishOrder.length+1;p.finishedAtTurn=s.turnCount;clearShield(p);s.finishOrder.push(id);
 cue(s,{kind:'finish',actorId:id,targetId:id,place:p.finishPlace});
 s.winnerId??=id;s.lastFinish={serial:(s.lastFinish?.serial??0)+1,playerId:id,place:p.finishPlace,turn:s.turn};
 note(s,`${p.name} finishes #${p.finishPlace}. ${s.count-s.finishOrder.length} still racing.`);
 if(s.finishOrder.length===s.count-1){
  const last=s.players.find(q=>!q.finished);last.finishPlace=s.count;last.lastPlace=true;
  s.finishReason='full-race';s.mode='finished';s.phase='finished';s.pendingTrial=null;
  completeFinishRanks(s);settle(s);note(s,`Race complete. ${last.name} takes #${s.count}.`);return sync(s);
 }
 return end(s);
}
export function createAdventure({count=4,buyIn=10,seed=42,mode='bots',rulesVersion=RULES_VERSION,boardProfile='dense',randomSource}={}){
 if(rulesVersion!==RULES_VERSION)throw new RangeError('Unknown local rules version.');
 boardForProfile(boardProfile);
 economics(count,buyIn);if(!['bots','hotseat'].includes(mode))throw new RangeError('Choose bots or hotseat.');
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)throw new RangeError('Seed must be a uint32.');
 if(randomSource!==undefined&&typeof randomSource!=='function')throw new TypeError('Invalid random source.');
 const s={version:14,networkDownSkipSerial:0,skippedTurns:[],botPersonalitySeed:seed,rulesVersion,economyVersion:ECONOMY_VERSION,count,buyIn,seed,playMode:mode,mode:'waiting',phase:'waiting',activePlayer:0,activeId:0,turn:1,turnCount:0,round:1,dice:null,finish:FINISH,players:Array.from({length:count},(_,id)=>({id,name:id===0?'You':SELECTABLE_CHARACTERS[id].name,characterId:SELECTABLE_CHARACTERS[id].id,color:COLORS[id],pos:0,coins:5,points:5,sparks:5,hand:[],starterPurchased:false,starterChoice:null,ownTurns:0,ready:false,shield:false,crownSeal:false,reactionUsed:false,proactiveUsed:false,collectUsed:false,prankReceived:false,networkDownTurns:0,networkDownImmune:false,incomeMilestones:[],shopMilestones:[],bot:mode==='bots'&&id!==0})),payouts:[],lastActions:[],lastTurn:null,pendingTrial:null,pendingEffect:null,pendingShop:null,pendingDraw:null,pendingDiscard:null,log:['Each racer starts with 5 Coins and a different free card.'],decks:{},finishOrder:[],starterOffer:[]};
 if(randomSource)Object.defineProperty(s,'randomSource',{value:randomSource,configurable:true});
 for(const p of s.players){p.finished=false;p.finishPlace=null;}
 s.decks.hand={draw:shuffle(s,CARDS.flatMap(c=>Array(c.copies).fill(c.id))),discard:[]};
 s.starterDraft={order:shuffle(s,s.players.map(p=>p.id)),cursor:0,chosen:[],complete:false};
 reserveStarterOffer(s);
 return pinProfile(s,boardProfile);
}
// One physical copy per offered design is reserved outside the draw pile.
// Only one offer exists at a time; persisted offers never change on read/reload.
export const draftActor=s=>s.starterDraft&&!s.starterDraft.complete?s.starterDraft.order[s.starterDraft.cursor]:null;
function reserveStarterOffer(s){
 const excluded=new Set(s.starterDraft.chosen),pool=shuffle(s,STARTER_ITEMS.filter(id=>!excluded.has(id)&&s.decks.hand.draw.includes(id)));
 if(pool.length<3)throw Error('Not enough distinct starter designs.');
 s.starterOffer=pool.slice(0,3);
 for(const id of s.starterOffer)s.decks.hand.draw.splice(s.decks.hand.draw.indexOf(id),1);
}
export function buyStarter(){throw Error('Choose one free starter from your offer.');}
export function chooseStarter(s,{playerId,choice}={}){return atomic(s,()=>{
 if(s.mode!=='waiting'||s.phase!=='waiting')throw Error('The race has already started.');
 if(!Number.isInteger(playerId)||draftActor(s)!==playerId)throw Error('Wait for your starter selection.');
 if(!Number.isInteger(choice)||choice<0||choice>=s.starterOffer.length)throw RangeError('Choose one of your three starter cards.');
 const p=s.players[playerId],offer=s.starterOffer,id=offer[choice];
 if(p.starterPurchased||p.hand.length||s.starterDraft.chosen.includes(id))throw Error('Your starter has already been selected.');
 p.hand.push(id);p.starterAssigned=id;p.starterPurchased=true;p.starterChoice=choice;
 s.decks.hand.draw.push(...offer.filter((_,i)=>i!==choice));shuffle(s,s.decks.hand.draw);
 s.starterDraft.chosen.push(id);s.starterDraft.cursor++;s.starterOffer=[];
 if(s.starterDraft.cursor===s.count)s.starterDraft.complete=true;else reserveStarterOffer(s);
 return s;
});}
export function chooseStarterDefault(s,playerId=draftActor(s)){
 // At the start, guaranteed movement/defence is preferable to a speculative hit.
 const priority=['to-the-moon','pump','gigachad','gamba','hook','swap','bonk','pocket-rocket','rug-pull','trade-offer'];
 const choice=s.starterOffer.map((id,index)=>({index,rank:priority.indexOf(id)})).sort((a,b)=>a.rank-b.rank||a.index-b.index)[0]?.index;
 return chooseStarter(s,{playerId,choice});
}
export function setReady(s,id,ready=true){matchBoard(s);if(s.mode!=='waiting'||s.phase!=='waiting')throw Error('The race has already started.');if(!Number.isInteger(id)||!s.players[id])throw RangeError('Unknown player.');if(typeof ready!=='boolean')throw TypeError('Ready must be true or false.');if(ready&&!s.starterDraft.complete)throw Error('Every racer must choose a starter first.');s.players[id].ready=ready;return s;}
export function startAdventure(s){matchBoard(s);if(s.mode!=='waiting'||s.phase!=='waiting')throw new Error('The race has already started.');if(!s.starterDraft.complete)throw Error('Every racer must choose a starter first.');if(!s.players.every(p=>p.ready))throw new Error('Every player must be ready.');s.activePlayer=Math.floor(random(s)*s.count);s.activeId=s.activePlayer;s.startingPlayer=s.activePlayer;s.mode='playing';s.phase='roll';beginTurn(s);note(s,`${s.players[s.activePlayer].name} starts the race. Let’s roll.`);return s;}
function rollDiceAction(s,id){
  if(s.phase==='trial-roll'){active(s,id,'trial-roll');s.dice=[d6(s)];s.phase='trial-result';return [...s.dice];}
  active(s,id,'roll');const p=s.players[id];expireShield(s,p,p.ownTurns+1);p.ownTurns++;s.normalShopUsed=false;s.pendingCheckpointShop=null;gain(p,BOARD.resources.turnIncome);
  if(BOARD.deck.refreshEveryOwnTurns>0&&p.ownTurns%BOARD.deck.refreshEveryOwnTurns===0)draw(s,p);
  s.movementMode??=movementMode(s.turnStartPosition??p.pos);s.turnRolled=true;s.dice=s.movementMode==='single'?[d6(s)]:[d6(s),d6(s)];s.phase='choose';return [...s.dice];
}
function harmful(p,op){return (op.kind==='move'&&op.amount<0&&p.pos>0)||(op.kind==='sparks'&&op.amount<0&&p.coins>0)||['rivalTransferSparks','trade','swap','networkDown'].includes(op.kind);}
function canReact(s,p,c,pending){return !!(c?.id==='reverse'&&!p.reactionUsed&&!pending.reflected&&pending.source==='rivalCard'&&['bonk','rug-pull','trade-offer','network-down'].includes(pending.cardId));}
export function reactionCards(s){if(!s.pendingEffect)return [];const p=s.players[s.pendingEffect.playerId];return p.hand.filter(id=>canReact(s,p,cardById.get(id),s.pendingEffect));}
function operations(s,p,ops){let visual={};for(const op of ops){switch(op.kind){
 case 'move':move(p,op.amount);break;
 case 'sparks':gain(p,op.amount);break;
 case 'draw':draw(s,p,op.amount??1);break;
 case 'shield':armShield(s,p);break;
 case 'networkDown':p.networkDownTurns=1;break;
 case 'rivalTransferSparks':{const actor=s.players[op.actorId],n=Math.min(op.amount,p.coins,BOARD.resources.cap-actor.coins);gain(p,-n);gain(actor,n);break;}
 case 'freeMint':{const n=p.hand.length;if(n>=BOARD.deck.handLimit)gain(p,2);else draw(s,p);visual.cardsDelta=p.hand.length-n;break;}
 case 'paperHands':{const n=p.hand.length;if(n)s.decks.hand.discard.push(...p.hand.splice(Math.floor(random(s)*n),1));else gain(p,-2);visual.cardsDelta=p.hand.length-n;break;}
 case 'trade':{const actor=s.players[op.actorId];if(p.hand.length){actor.hand.push(...p.hand.splice(Math.floor(random(s)*p.hand.length),1));gain(p,1);}break;}
 case 'swap':{const actor=s.players[op.actorId],at=p.pos;p.pos=actor.pos;actor.pos=at;break;}
 case 'bombardiro':{const origin=p.pos,targets=s.players.filter(q=>!q.finished&&Math.abs(q.pos-origin)<=op.range);const hits=[];for(const q of targets){const from=q.pos,roll=Math.floor(random(s)*10),amount=roll<5?-(roll+1):roll-4;move(q,amount);hits.push({playerId:q.id,from,to:q.pos,amount,delta:q.pos-from,blocked:false});}visual={origin,targets:hits};break;}
 default:throw Error(`Unsupported card effect: ${op.kind}`);
}}return visual;}
function finishEffect(s){const e=s.pendingEffect,p=s.players[e.playerId],before={coins:p.coins,pos:p.pos,hand:p.hand.length,networkDownTurns:p.networkDownTurns??0};s.pendingEffect=null;operations(s,p,e.operations);if(e.source==='rivalCard'&&(before.coins!==p.coins||before.pos!==p.pos||before.hand!==p.hand.length||before.networkDownTurns!==(p.networkDownTurns??0)))p.prankReceived=true;cue(s,{kind:e.cardId?'card':e.source,source:e.source,cardId:e.cardId,eventId:e.eventId,...(e.section!==undefined?{section:e.section}:{}),actorId:e.actorId??s.activePlayer,targetId:p.id,reflected:!!e.reflected,coins:p.coins-before.coins,...(e.cardId==='network-down'?{networkDownTurns:p.networkDownTurns??0}:{})});cardsWindow(s);}
function effect(s,playerId,source,ops,label,visual={}){
 const p=s.players[playerId];s.pendingEffect={playerId,source,operations:ops,label,...visual};
 if(ops.some(op=>harmful(p,op))){if(p.shield){clearShield(p);s.pendingEffect=null;cue(s,{kind:'shield',source,actorId:visual.actorId??s.activePlayer,targetId:playerId,cardId:visual.cardId,blocked:true});note(s,`${p.name}’s shield blocks ${label}.`);cardsWindow(s);return;}
 if(reactionCards(s).length){s.phase='reaction';return;}}
 finishEffect(s);
}
function shop(s,source='landing'){
 const p=s.players[s.activePlayer],marks=s.pendingCheckpointShop?.playerId===p.id?s.pendingCheckpointShop.marks:[];
 p.shopMilestones??=[];for(const mark of marks)if(!p.shopMilestones.includes(mark))p.shopMilestones.push(mark);
 s.pendingCheckpointShop=null;s.normalShopUsed=true;
 const offer=[take(s,'hand'),take(s,'hand')].filter(Boolean);
 if(offer.length){s.pendingShop={playerId:s.activePlayer,offer,source,...(marks.length?{milestones:[...marks]}:{})};s.phase='shop';}else cardsWindow(s);
}
function landing(s,p){const board=matchBoard(s),t=tileAt(p.pos,s.rulesVersion,profileId(s)),type=t?.type??'trail',e={...board.effects[type],...t};
  switch(type){
    case 'airdrop':{const before=p.coins;gain(p,3);cue(s,{kind:'airdrop',actorId:p.id,targetId:p.id,coins:p.coins-before});cardsWindow(s);break;}
    case 'draw':{const before=p.hand.length;draw(s,p);cue(s,{kind:'draw',actorId:p.id,targetId:p.id,cardsDelta:p.hand.length-before});cardsWindow(s);break;}
    case 'market':shop(s);break;
    case 'well':s.phase='well';break;
    case 'trap':effect(s,p.id,'trap',[{kind:'move',amount:-(e.amount??3)}],e.sequence==='six-seven'?'Six Seven · back 6':'the trap',{section:p.pos});break;
    case 'setback':case 'portal':{const link=board.links.find(l=>l.from===p.pos);if(!link)throw new Error('Missing board crossing.');if(type==='portal'){move(p,link.to-p.pos);note(s,`${p.name} takes the portal to ${p.pos}.`);cardsWindow(s);}else effect(s,p.id,'setback',[{kind:'move',amount:link.to-p.pos}],link.name);break;}
    case 'pandora':{const ev=pandoraEventAt(random(s),p.pos),before=p.coins;s.lastEvent={...ev,deck:'pandora',playerId:p.id,turn:s.turn};const visual=operations(s,p,ev.effects);cue(s,{kind:'pandora',eventId:ev.id,polarity:ev.polarity,actorId:p.id,targetId:p.id,coins:p.coins-before,...visual});note(s,`${ev.name}: ${ev.text}`);cardsWindow(s);break;}
    default:cardsWindow(s);
  }
}
function recordMotion(s,before,landing=null,effect=null){
 // Reach the printed cell before asking for a defensive reaction. The harmful
 // effect gets its own confirmed presentation after the reaction is resolved.
 const pending=!!(s.pendingEffect||s.pendingLanding);
 if(pending)effect=landing?{kind:'trail',pending:true,targetId:landing.playerId}:{...effect,pending:true,targetId:s.pendingEffect?.playerId??effect?.targetId};
 const tracks=s.players.flatMap((p,i)=>p.pos!==before[i]||landing&&landing.playerId===p.id||effect&&(effect.targetId===p.id||effect.targets?.some(hit=>hit.playerId===p.id))?[{playerId:p.id,from:before[i],landing:landing?.playerId===p.id?landing.section:before[i],to:p.pos,type:landing?.playerId===p.id?cellEffect(landing.section,s.rulesVersion,profileId(s)):'effect',...(effect?.cardId?{cardId:effect.cardId,sourceId:effect.actorId}:{})}]:[]);
 if(sixSevenRules(s)&&!landing&&effect?.section===67&&effect.kind==='trap')for(const track of tracks)track.type='trap';
 for(const track of tracks)if(sixSevenRules(s)&&landing?.playerId===track.playerId&&landing.section===67)track.sixSeven=true;
 if(pending)for(const track of tracks)track.type='trail';
 if(tracks.length){let durationMs=presentationDurationMs(tracks,effect??{});if(isFullRace(s)&&effect?.kind==='finish')durationMs=Math.max(durationMs,Math.max(...tracks.map(t=>Math.abs(t.landing-t.from)*CELL_STEP_MS))+FINISH_CELEBRATION_MS);
  s.presentationMotion={serial:(s.presentationMotion?.serial??0)+1,turn:s.turn,tracks,durationMs,...(timedShields(s)?{timingVersion:2}:{}),...(effect?{effect}:{} )};
 }
}
function atomic(s,action){matchBoard(s);const id=profileId(s),hadProfile=Object.hasOwn(s,'boardProfile'),before=structuredClone(s);try{const value=action();pinProfile(s,id);return value;}catch(error){for(const key of Object.keys(s))delete s[key];Object.assign(s,before);if(hadProfile)pinProfile(s,id);throw error;}}
function presented(s,action){return atomic(s,()=>{const before=s.players.map(p=>p.pos),previous=s.presentationCue?.serial;const result=action();recordMotion(s,before,null,s.presentationCue?.serial!==previous?s.presentationCue:null);return result;});}
function resolveArrival(s){const p=s.players[s.activePlayer];s.pendingLanding=null;if(p.pos===FINISH){if(p.crownSeal)return win(s,p.id);s.pendingTrial={player:p.id,stage:'roll'};s.phase='trial-roll';}else landing(s,p);return sync(s);}
function resolveTurnAction(s,{playerId=s.activePlayer,dieIndex=0,item='none'}={}){
  active(s,playerId,'choose');if(item!=='none')throw new Error('Use a hand card before rolling or after landing.');if(!Array.isArray(s.dice)||!s.dice.length||!s.dice.every(d=>Number.isInteger(d)&&d>=1&&d<=6))throw Error('Invalid dice.');if(!Number.isInteger(dieIndex)||dieIndex<0||dieIndex>=s.dice.length)throw new RangeError('Choose an available die.');
  const p=s.players[playerId],mode=s.movementMode??movementMode(p.pos),distance=mode==='sum'?s.dice.reduce((a,b)=>a+b,0):s.dice[mode==='single'?0:dieIndex],before=s.players.map(p=>p.pos),destination=Math.min(FINISH,p.pos+distance);
  const coinsBefore=p.coins;for(const milestone of BOARD.incomeMilestones)if(p.pos<milestone&&destination>=milestone&&!p.incomeMilestones.includes(milestone)){p.incomeMilestones.push(milestone);gain(p,3);note(s,`${p.name} crosses ${milestone}: +3 Coins.`);}p.pos=destination;s.turnCount++;p.stats??={};p.stats.moves=(p.stats.moves??0)+1;s.lastTurn={playerId,dieIndex,die:distance,dice:[...s.dice],item:'none',from:before[playerId],landing:destination,to:destination,before,after:s.players.map(p=>p.pos),effect:cellEffect(destination,s.rulesVersion,profileId(s)),coinsBefore,notes:[]};s.lastActions=[{id:playerId,playerId,dieIndex,die:distance,card:distance,item:'none'}];
  const marks=SHOP_MILESTONES.filter(mark=>destination>=mark&&!(p.shopMilestones??[]).includes(mark));
  s.pendingCheckpointShop=destination<FINISH&&marks.length?{playerId,marks}:null;
  note(s,`${p.name} moves ${distance} to section ${destination}.`);
  // Resolve the refresh overflow before the landing can draw another card or
  // start a trial. A player can never carry a fourth card into the next turn.
  if(p.hand.length>BOARD.deck.handLimit){s.pendingLanding={playerId};s.pendingDiscard={playerId,reason:'overflow-before-landing',count:p.hand.length-BOARD.deck.handLimit};s.phase='discard';recordMotion(s,before,{playerId,section:destination});return sync(s);}
  const previous=s.presentationCue?.serial,result=resolveArrival(s);recordMotion(s,before,{playerId,section:destination},s.presentationCue?.serial!==previous?s.presentationCue:{kind:cellEffect(destination,s.rulesVersion,profileId(s)),actorId:playerId,targetId:playerId,section:destination,coins:s.players[playerId].coins-(s.lastTurn.coinsBefore??s.players[playerId].coins)});return result;
}
export function chooseShop(s,{playerId=s.activePlayer,choice=0}={}){
  active(s,playerId,'shop');if(s.pendingShop?.playerId!==playerId)throw Error('No shop offer is due.');const offer=s.pendingShop.offer,p=s.players[playerId];
  if(choice!==null&&(!Number.isInteger(choice)||choice<0||choice>=offer.length))throw new RangeError('Choose a card from the shop or decline.');
  if(choice!==null&&p.coins<(cardById.get(offer[choice])?.purchaseCost??Infinity))throw new Error('Not enough Match Coins.');
  if(choice!==null){const price=cardById.get(offer[choice]).purchaseCost;gain(p,-price);p.hand.push(offer[choice]);cue(s,{kind:'shop-purchase',actorId:p.id,targetId:p.id,coins:-price,cardsDelta:1});note(s,`${p.name} buys ${cardById.get(offer[choice]).name} for ${price} Coins.`);}
  else note(s,`${p.name} passes the shop.`);
  s.decks.hand.discard.push(...offer.filter((_,i)=>i!==choice));s.pendingShop=null;cardsWindow(s);return s;
}
export function chooseDraw(){throw Error('Free finds go straight to your hand.');}
export function discardCard(s,{playerId,cardIndex}={}){matchBoard(s);if(s.mode!=='playing'||s.phase!=='discard'||!s.pendingDiscard)throw new Error('No discard is due.');const owner=s.pendingDiscard.playerId;if(!Number.isInteger(playerId)||playerId!==owner||s.players[playerId]?.finished)throw new Error('Only the card owner may discard.');const p=s.players[owner];if(!Number.isInteger(cardIndex)||cardIndex<0||cardIndex>=p.hand.length)throw new RangeError('Choose a card to discard.');s.decks.hand.discard.push(...p.hand.splice(cardIndex,1));if(--s.pendingDiscard.count<=0){s.pendingDiscard=null;if(s.pendingLanding){const wasSixSeven=sixSevenRules(s)&&s.players[s.activePlayer].pos===67,wasFinish=isFullRace(s)&&s.players[s.activePlayer].pos===FINISH,before=s.players.map(p=>p.pos),cueBefore=s.presentationCue?.serial;resolveArrival(s);if((wasSixSeven||wasFinish||s.presentationCue?.eventId==='bombardiro')&&s.presentationCue?.serial!==cueBefore)recordMotion(s,before,null,s.presentationCue);}else cardsWindow(s);}return s;}
function chooseWellAction(s,{playerId=s.activePlayer,choice='safe'}={}){active(s,playerId,'well');if(!['safe','roll'].includes(choice))throw new RangeError('Choose safe or roll.');const die=choice==='roll'?d6(s):null,n=die?BOARD.effects.well.outcomes.find(o=>o.faces.includes(die)).sparks:BOARD.effects.well.safeGain;const before=s.players[playerId].coins;gain(s.players[playerId],n);const actual=s.players[playerId].coins-before;s.lastWell={die,coins:actual,sparks:actual,nominal:n,turn:s.turn,playerId};cue(s,{kind:'well',actorId:playerId,targetId:playerId,coins:actual,die});note(s,`${s.players[playerId].name} ${actual<0?'loses':'gains'} ${Math.abs(actual)} Coin${Math.abs(actual)===1?'':'s'} at the well${die?' (rolled '+die+')':''}.`);cardsWindow(s);return s;}
function useReactionAction(s,{playerId,cardIndex=null}={}){
 if(s.mode!=='playing'||s.phase!=='reaction'||!Number.isInteger(playerId)||s.pendingEffect?.playerId!==playerId||s.players[playerId]?.finished)throw Error('Only the affected player may react.');
 const p=s.players[playerId];if(cardIndex===null){finishEffect(s);return sync(s);}
 if(!Number.isInteger(cardIndex)||cardIndex<0||cardIndex>=p.hand.length)throw RangeError('Choose a reaction card.');
 const c=cardById.get(p.hand[cardIndex]);if(!canReact(s,p,c,s.pendingEffect))throw Error('This reaction does not apply.');
 const incoming=s.pendingEffect,oldActor=incoming.actorId,target=s.players[oldActor];
 p.hand.splice(cardIndex,1);s.decks.hand.discard.push(c.id);p.reactionUsed=true;p.stats??={};p.stats.itemsUsed=(p.stats.itemsUsed??0)+1;
 note(s,`${p.name} reflects ${incoming.label}.`);s.pendingEffect=null;
 // Reflection changes the victim once. No second REVERSE window can open.
 if(target.finished||target.prankReceived||incoming.cardId==='network-down'&&(target.networkDownTurns>0||target.networkDownImmune)){cue(s,{kind:'cancel',cardId:c.id,actorId:playerId,targetId:oldActor,blocked:true});cardsWindow(s);return sync(s);}
 effect(s,oldActor,'rivalCard',incoming.operations.map(op=>({...op,...(['rivalTransferSparks','trade'].includes(op.kind)?{actorId:playerId}:{})})),incoming.label,{cardId:incoming.cardId,actorId:playerId,reflected:true});
 return sync(s);
}
const targeted=e=>['rivalMove','rivalTransferSparks','hook','swap','trade-offer','networkDown'].includes(e.kind);
function cardError(s,p,c,options={}){
 if(!c)return 'Unknown card.';if(c.timing==='Reaction')return 'Use REVERSE when an attack targets you.';
 if(p.finished)return 'Your finish place is already locked.';if(p.proactiveUsed)return 'You already used your card action this turn.';
 const e=c.effect;if(e.kind==='shield'&&p.shield)return 'Your shield is already armed.';
 if(FINISH-p.pos<=FINISH_CARD_ZONE&&((e.kind==='move'&&e.amount>0)||e.kind==='hook'))return 'Only GAMBA! can move you forward in the last 6 tiles.';
 if(targeted(e)){const targets=cardTargets(s,p.id,c.id);if(!targets.length)return 'There is no eligible rival in range.';if(options.targetId!==undefined&&!targets.includes(options.targetId))return 'That rival cannot be targeted.';}
 return null;
}
export function cardTargets(s,playerId,cardId){
 const p=Number.isInteger(playerId)?s.players[playerId]:null,e=cardById.get(cardId)?.effect;if(!p||p.finished||!e||!targeted(e))return [];
 return s.players.filter(q=>q.id!==p.id&&!q.finished&&(e.kind==='hook'||!q.prankReceived)&&Math.abs(q.pos-p.pos)<=e.range&&(!e.aheadOnly||q.pos>p.pos)&&(e.kind!=='networkDown'||!(q.networkDownTurns>0||q.networkDownImmune))&&(e.kind!=='rivalTransferSparks'||q.coins>0&&p.coins<BOARD.resources.cap)&&(e.kind!=='trade-offer'||q.hand.length>0)&&(e.kind!=='swap'||q.pos!==p.pos&&(FINISH-p.pos>FINISH_CARD_ZONE||q.pos<p.pos))).map(q=>q.id);
}
export function cardAvailability(s,playerId=s.activePlayer){const p=Number.isInteger(playerId)?s.players[playerId]:null;if(!p)return [];return p.hand.map((id,index)=>({id,index,card:cardById.get(id),reason:s.mode!=='playing'||!['roll','cards'].includes(s.phase)||playerId!==s.activePlayer?'Use a card before rolling or after landing.':cardError(s,p,cardById.get(id))}));}
function playCardAction(s,{playerId=s.activePlayer,cardIndex,targetId}={}){
 if(!['roll','cards'].includes(s.phase))throw Error('Use a card before rolling or after landing.');active(s,playerId,s.phase);const p=s.players[playerId];if(!Number.isInteger(cardIndex)||cardIndex<0||cardIndex>=p.hand.length)throw RangeError('Choose a card from your hand.');
 const c=cardById.get(p.hand[cardIndex]),error=cardError(s,p,c,{targetId});if(error)throw Error(error);const e=c.effect;
 if(targeted(e)&&!Number.isInteger(targetId))throw Error('Choose a rival.');
 // Preserve a just-finished normal throw for its host's movement snapshot, but
 // never append the next racer's pre-roll card to that previous turn record.
 if(s.phase==='roll')s.lastTurn=null;
 const origin=p.pos;
 p.hand.splice(cardIndex,1);s.decks.hand.discard.push(c.id);p.proactiveUsed=true;p.stats??={};p.stats.itemsUsed=(p.stats.itemsUsed??0)+1;note(s,`${p.name} uses ${c.name}.`);
 cue(s,{kind:'card',cardId:c.id,actorId:playerId,targetId:targetId??playerId,origin});
 switch(e.kind){
  case 'move':move(p,e.amount);break;
  case 'shield':armShield(s,p);break;
  case 'hook':move(p,s.players[targetId].pos-p.pos);break;
  case 'gamba':{
   const amount=random(s)<.5?9:-5;
   p.pos=Math.max(0,Math.min(FINISH,p.pos+amount));s.presentationCue.amount=amount;
   if(p.pos===FINISH){const cardCue={...s.presentationCue};resolveArrival(s);s.presentationCue={...cardCue,reachedFinish:true,...(p.finished?{place:p.finishPlace}:{})};}
   break;
  }
  case 'rivalMove':case 'rivalTransferSparks':case 'swap':case 'trade-offer':case 'networkDown':{
   const op=e.kind==='rivalMove'?{kind:'move',amount:e.amount}:e.kind==='trade-offer'?{kind:'trade',actorId:playerId}:{kind:e.kind,amount:e.amount,actorId:playerId};
   effect(s,targetId,'rivalCard',[op],c.name,{cardId:c.id,actorId:playerId});break;
  }
  default:throw Error(`Unsupported card: ${c.id}`);
 }
 if(['roll','cards'].includes(s.phase))cardsWindow(s);return sync(s);
}
export function canForage(s,playerId=s.activePlayer){const p=Number.isInteger(playerId)?s.players[playerId]:null;return !!(s.mode==='playing'&&s.phase==='cards'&&playerId===s.activePlayer&&p&&!p.finished&&!p.collectUsed&&p.coins<COLLECT_BELOW);}
export function forage(s,playerId=s.activePlayer){active(s,playerId,'cards');if(!canForage(s,playerId))throw Error('Collect +2 is available once per turn with fewer than 5 Coins.');const p=s.players[playerId],before=p.coins;gain(p,2);cue(s,{kind:'collect',actorId:p.id,targetId:p.id,coins:p.coins-before});p.collectUsed=true;note(s,`${p.name} collects 2 Coins.`);return sync(s);}
export function endTurn(s,playerId=s.activePlayer){active(s,playerId,'cards');return end(s);}
function resolveTrialAction(s,{playerId=s.activePlayer}={}){active(s,playerId,'trial-result');if(!s.pendingTrial||s.pendingTrial.player!==playerId||!['roll','reroll'].includes(s.pendingTrial.stage)||!Array.isArray(s.dice)||s.dice.length!==1||!Number.isInteger(s.dice[0])||s.dice[0]<1||s.dice[0]>6)throw Error('Invalid throne trial.');const die=s.dice[0],risk=s.pendingTrial.stage==='reroll';note(s,`${s.players[playerId].name} rolls ${die} at the throne.`);if(die>=BOARD.throneTrial.successMin)return win(s,playerId);if(risk){s.players[playerId].pos=BOARD.throneTrial.riskFailurePosition;s.players[playerId].crownSeal=false;note(s,'The risky roll failed. Back to section 136.');return end(s);}s.pendingTrial.stage='choice';s.phase='trial-choice';return sync(s);}
function chooseTrialOutcomeAction(s,{playerId=s.activePlayer,choice}={}){active(s,playerId,'trial-choice');if(s.pendingTrial?.player!==playerId||s.pendingTrial.stage!=='choice')throw Error('Invalid throne choice.');if(!['seal','risk'].includes(choice))throw new RangeError('Choose seal or risk.');if(choice==='seal'){s.players[playerId].crownSeal=true;s.players[playerId].pos=s.rulesVersion==='match-coins-v1'?142:BOARD.throneTrial.failurePosition;note(s,`${s.players[playerId].name} takes the Crown Seal and returns to ${s.players[playerId].pos}.`);return end(s);}s.pendingTrial.stage='reroll';s.phase='trial-roll';s.dice=null;return s;}
export const chooseWell=(s,options)=>presented(s,()=>chooseWellAction(s,options));
export const useReaction=(s,options)=>presented(s,()=>useReactionAction(s,options));
export const playCard=(s,options)=>presented(s,()=>playCardAction(s,options));
export const resolveTrial=(s,options)=>presented(s,()=>resolveTrialAction(s,options));
export const chooseTrialOutcome=(s,options)=>presented(s,()=>chooseTrialOutcomeAction(s,options));
const botApi={BOARD,CARDS,EVENTS,LATE_EVENTS,boardForProfile,cellEffect,movementMode,cardAvailability,cardTargets,reactionCards,canForage};
export const chooseBotAction=s=>s.mode==='waiting'&&!s.starterDraft.complete?{kind:'chooseStarter',args:{playerId:draftActor(s)}}:botDecision(botApi,s);
export function botTurnChoice(s,playerId=s.activePlayer){active(s,playerId,'choose');return chooseBotDie(botApi,s,playerId);}
// The policy only chooses; authoritative transitions remain in this engine.
export function advanceBot(s){
 if(s.mode==='waiting'&&!s.starterDraft.complete)return chooseStarterDefault(s);
 const decision=botDecision(botApi,s);if(!decision)return s;const args=decision.args??{},id=s.activePlayer;
 switch(decision.kind){
  case 'roll':rollDice(s,args.playerId??id);break;
  case 'resolveTurn':resolveTurn(s,args);break;
  case 'resolveTrial':resolveTrial(s,args);break;
  case 'chooseTrial':chooseTrialOutcome(s,args);break;
  case 'chooseShop':chooseShop(s,args);break;
  case 'chooseWell':chooseWell(s,args);break;
  case 'discardCard':discardCard(s,args);break;
  case 'react':useReaction(s,args);break;
  case 'playCard':playCard(s,args);break;
  case 'forage':forage(s,args.playerId??id);break;
  case 'endTurn':endTurn(s,args.playerId??id);break;
  default:throw Error(`Unknown bot decision: ${decision.kind}`);
 }return s;
}


export const rollDice=(s,id)=>atomic(s,()=>rollDiceAction(s,id));
export const resolveTurn=(s,options)=>atomic(s,()=>resolveTurnAction(s,options));
export const createMatch=createAdventure,startMatch=startAdventure,resolveMove=resolveTurn;
