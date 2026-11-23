import {FULL_RACE_VERSION,isFullRace,completeFinishRanks,FINISH_CELEBRATION_MS} from './race-results.js';
import AUTHORED_BOARD from '../world/route/board-rules.json' with {type:'json'};
import AUTHORED_CARDS from '../world/route/cards.json' with {type:'json'};
import AUTHORED_EVENTS from '../world/route/events.json' with {type:'json'};
import {economics,COLORS,settle,ECONOMY_VERSION} from './engine.js';
import {CHARACTERS,SELECTABLE_CHARACTERS} from './characters.js';
import {movementMode} from '../world/route/rules-engine.js';
import {presentationDurationMs,CELL_STEP_MS} from './presentation-timing.js';

// Versioned live rules; historical board studies keep their authored economy.
// Match Coins are temporary game resources, never wallet balances or payouts.
export const RULES_VERSION=FULL_RACE_VERSION;
export const STARTER_ITEMS=Object.freeze(['spring-step','magic-carpet','bubble-coat','catch-up-kite']);
const persistentIds=new Set(['spring-step','paper-glider','catch-up-kite','bubble-coat','leaf-umbrella','nope-stamp','rug-tug','pocket-audit']);
function liveCopy(value){return JSON.parse(JSON.stringify(value).replace(/\bSparks\b/g,'Coins').replace(/\bSpark\b/g,'Coin').replaceAll('up to 15','up to 30'));}
const BOARD=liveCopy(AUTHORED_BOARD),EVENTS=liveCopy(AUTHORED_EVENTS);
const CARDS=liveCopy(AUTHORED_CARDS).filter(c=>persistentIds.has(c.id)).map(c=>({...c,cost:Math.max(1,c.cost-1),copies:6,persistent:true,purchaseCost:5}));
CARDS.find(c=>c.id==='spring-step').cooldownTurns=2;
CARDS.find(c=>c.id==='spring-step').text='Move forward 3. Stop before the throne; no new landing effect. This item rests during your next personal turn.';
CARDS.find(c=>c.id==='paper-glider').text='Hop 5 after a normal move of 1–2, or a two-dice sum of 2–4. Stop before the throne; no new landing effect.';
CARDS.find(c=>c.id==='nope-stamp').text='Cancel one rival item targeting you. Their Coins and item action are still spent; they keep the item.';
CARDS.find(c=>c.id==='bubble-coat').text='Arm one shield. It blocks a harmful effect before paid reactions, then disappears. Portals ignore shields.';
export const LEGACY_CARDS=Object.freeze(JSON.parse(JSON.stringify(CARDS)));
CARDS.push({id:'pocket-rocket',name:'Pocket Rocket',type:'prank',timing:'After landing',cost:2,copies:6,persistent:true,purchaseCost:5,icon:'rocket',character:4,text:'Send a rival ahead of you, within 6 sections, back 5. Shields and eligible reactions can stop it. No new landing effect.',effect:{kind:'rivalMove',amount:-5,range:6,aheadOnly:true}},
 {id:'magic-carpet',name:'Magic Carpet',type:'mobility',timing:'After landing',cost:2,copies:6,persistent:true,purchaseCost:5,icon:'carpet',character:1,text:'Fly forward 5 after a normal move of 1–2, or a two-dice sum of 2–4. Stop before the throne; no new landing effect.',effect:{kind:'move',amount:5,condition:'normalDieAtMost2'}});
const V3_CARDS=JSON.parse(JSON.stringify(CARDS));
CARDS.find(c=>c.id==='bubble-coat').text='Arm one shield for two personal turns. It blocks one harmful effect, then disappears. Expires at the start of your turn two rounds later. Portals ignore shields.';
BOARD.version=RULES_VERSION;BOARD.throneTrial.failurePosition=140;
Object.assign(BOARD.resources,{name:'Match Coins',initial:10,cap:30,turnIncome:0,transferable:false,purchasable:false});
Object.assign(BOARD.deck,{copiesPerDesign:6,designCount:CARDS.length,totalCards:CARDS.length*6,initialHand:0,refreshEveryOwnTurns:0,marketCost:5,starterPack:{item:'spring-step',cost:5}});
BOARD.deck.starterPack={choose:1,offer:3,cost:5};BOARD.deck.drawOffer=3;
BOARD.deck.marketSize=2;
BOARD.deck.file='halfroll-engine.js#CARDS';
BOARD.turn.order=['normal-die','normal-move','landing-effect-or-throne-trial','one-optional-item-or-forage-unless-trial-or-win','pass'];
Object.assign(BOARD.effects.market,{action:'buy-one-of-two',cost:5});
const LEGACY_BOARD=structuredClone(BOARD);LEGACY_BOARD.version='match-coins-v4';
const sixSevenTrap=BOARD.tiles.find(t=>t.number===68);Object.assign(sixSevenTrap,{number:67,name:'Six Seven',amount:6,sequence:'six-seven'});
const V5_BOARD=structuredClone(BOARD);V5_BOARD.version='match-coins-v5';
export const boardForRules=version=>['match-coins-v1','match-coins-v2','match-coins-v3','match-coins-v4'].includes(version)?LEGACY_BOARD:version==='match-coins-v5'?V5_BOARD:BOARD;
export {BOARD,CARDS,EVENTS,movementMode};
export const FINISH=BOARD.finish, TURN_LIMIT=3000;
export const ITEMS=Object.freeze({none:{name:'No card',cost:0}});
export const ITEM_COSTS=Object.freeze({none:0});
const cardById=new Map(CARDS.map(c=>[c.id,c]));
export const cardsForRules=version=>[RULES_VERSION,'match-coins-v5','match-coins-v4'].includes(version)?CARDS:version==='match-coins-v3'?V3_CARDS:LEGACY_CARDS;
const currentRules=s=>[RULES_VERSION,'match-coins-v5','match-coins-v4','match-coins-v3'].includes(s.rulesVersion);
const sixSevenRules=s=>[RULES_VERSION,'match-coins-v5'].includes(s.rulesVersion);
const timedShields=s=>[RULES_VERSION,'match-coins-v5','match-coins-v4'].includes(s.rulesVersion);
function armShield(s,p){p.shield=true;if(timedShields(s))p.shieldExpiresAtOwnTurn=p.ownTurns+2;}
function clearShield(p){p.shield=false;delete p.shieldExpiresAtOwnTurn;}
function expireShield(s,p,nextOwnTurn){if(timedShields(s)&&p.shield&&Number.isInteger(p.shieldExpiresAtOwnTurn)&&nextOwnTurn>=p.shieldExpiresAtOwnTurn){clearShield(p);note(s,`${p.name}’s shield expires.`);}}
export function shieldTurnsLeft(s,p){if(!p.shield)return 0;if(!timedShields(s)||!Number.isInteger(p.shieldExpiresAtOwnTurn))return null;return Math.max(0,p.shieldExpiresAtOwnTurn-p.ownTurns-(s.activePlayer===p.id&&s.phase==='roll'?1:0));}
const tiles=new Map(BOARD.tiles.map(t=>[t.number,t])),oldTiles=new Map(LEGACY_BOARD.tiles.map(t=>[t.number,t]));
const tileAt=(n,version=RULES_VERSION)=>(boardForRules(version)===LEGACY_BOARD?oldTiles:tiles).get(n);
const eventById=new Map([...EVENTS.good,...EVENTS.bad].map(e=>[e.id,e]));
export const TRAPS=BOARD.tiles.filter(t=>['trap','setback','bad'].includes(t.type)).map(t=>t.number);
export const BONUSES=BOARD.tiles.filter(t=>['good','spark','market','draw'].includes(t.type)).map(t=>t.number);
export function cellEffect(n,version=RULES_VERSION){return n>=FINISH?'finish':n===0?'start':tileAt(n,version)?.type??'trail';}
function random(s){if(typeof s.randomSource==='function')return s.randomSource();s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
const d6=s=>1+Math.floor(random(s)*6);
function shuffle(s,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function take(s,key){const d=s.decks[key];if(!d.draw.length&&d.discard.length){d.draw=shuffle(s,d.discard);d.discard=[];}return d.draw.pop()??null;}
function draw(s,p,n=1){for(let i=0;i<n;i++){const id=take(s,'hand');if(id)p.hand.push(id);}}
// Reserve actual copies while keeping duplicates in the deck. A reload cannot reroll an offer.
function distinctOffer(s,n=3){const offer=[],held=[],limit=s.decks.hand.draw.length+s.decks.hand.discard.length;for(let i=0;i<limit&&offer.length<n;i++){const id=take(s,'hand');if(id===null)break;if(offer.includes(id))held.push(id);else offer.push(id);}s.decks.hand.draw.unshift(...held);return offer;}
function drawOffer(s,p){const offer=distinctOffer(s);if(!offer.length){cardsWindow(s);return;}s.pendingDraw={playerId:p.id,offer};s.phase='draw';}
function gain(p,n){p.coins=Math.max(0,Math.min(BOARD.resources.cap,p.coins+n));p.sparks=p.points=p.coins;}
function move(p,n){p.pos=Math.max(0,Math.min(FINISH-1,p.pos+n));}
function note(s,text){s.log.unshift(text);s.log=s.log.slice(0,60);if(s.lastTurn)s.lastTurn.notes.push(text);}
function cue(s,data){s.presentationCue={serial:(s.presentationCue?.serial??0)+1,...data};}
function active(s,id,phase){if(s.mode!=='playing'||s.phase!==phase)throw new Error(`This action is not available during ${s.phase}.`);if(isFullRace(s)&&s.players[id]?.finished)throw new Error('Your finish place is already locked.');if(!Number.isInteger(id)||id!==s.activePlayer)throw new Error('Only the active player can act.');}
function sync(s){if(s.lastTurn){s.lastTurn.to=s.players[s.lastTurn.playerId].pos;s.lastTurn.after=s.players.map(p=>p.pos);}for(const p of s.players)p.sparks=p.points=p.coins;return s;}
function cardsWindow(s){const p=s.players[s.activePlayer];if(s.pendingDraw){s.phase='draw';return sync(s);}if(p.hand.length>BOARD.deck.handLimit){s.pendingDiscard={playerId:p.id,reason:'overflow',count:p.hand.length-BOARD.deck.handLimit};s.phase='discard';}else s.phase='cards';sync(s);}
function end(s){sync(s);do{s.activePlayer=(s.activePlayer+1)%s.count;}while(isFullRace(s)&&s.players[s.activePlayer].finished);s.activeId=s.activePlayer;s.turn++;s.round=Math.floor(s.turnCount/s.count)+1;s.phase='roll';s.dice=null;s.pendingEffect=null;s.pendingTrial=null;s.pendingShop=null;s.pendingDraw=null;s.pendingDiscard=null;s.pendingLanding=null;expireShield(s,s.players[s.activePlayer],s.players[s.activePlayer].ownTurns+1);return s;}
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
export function createAdventure({count=4,buyIn=10,seed=42,mode='bots',rulesVersion=RULES_VERSION}={}){
  if(![RULES_VERSION,'match-coins-v5','match-coins-v4','match-coins-v3','match-coins-v2','match-coins-v1'].includes(rulesVersion))throw new RangeError('Unknown rules version.');
  economics(count,buyIn);if(!['bots','hotseat'].includes(mode))throw new RangeError('Choose bots or hotseat.');
  const s={version:4,rulesVersion,economyVersion:ECONOMY_VERSION,count,buyIn,seed:seed>>>0,playMode:mode,mode:'waiting',phase:'waiting',activePlayer:0,activeId:0,turn:1,turnCount:0,round:1,dice:null,finish:FINISH,players:Array.from({length:count},(_,id)=>({id,name:id===0?'You':SELECTABLE_CHARACTERS[id].name,characterId:SELECTABLE_CHARACTERS[id].id,color:COLORS[id],pos:0,coins:10,points:10,sparks:10,hand:[],starterPurchased:false,ownTurns:0,ready:false,shield:false,crownSeal:false,reactionUsed:false,proactiveUsed:false,prankReceived:false,bot:mode==='bots'&&id!==0})),payouts:[],lastActions:[],lastTurn:null,pendingTrial:null,pendingEffect:null,pendingShop:null,pendingDiscard:null,log:['Ready when you are. Everyone must be ready to start.'],decks:{}};
  if(isFullRace(s)){s.finishOrder=[];for(const p of s.players){p.finished=false;p.finishPlace=null;}}
  for(const [key,list] of Object.entries({hand:cardsForRules(rulesVersion),good:EVENTS.good,bad:EVENTS.bad}))s.decks[key]={draw:shuffle(s,list.flatMap(c=>Array(c.copies??1).fill(c.id))),discard:[]};
  if(currentRules(s)){
    s.starterOffer=shuffle(s,[...STARTER_ITEMS]).slice(0,3);s.pendingDraw=null;
    for(const p of s.players){p.starterChoice=null;p.itemReadyAt={};}
    s.log.unshift('Choose one of three starter items for 5 Coins, then ready up.');return s;
  }
  // Everyone receives the same paid starter pack; seat order cannot change it.
  for(const p of s.players){
    const index=s.decks.hand.draw.indexOf('spring-step');
    s.decks.hand.draw.splice(index,1);p.hand.push('spring-step');
    gain(p,-BOARD.deck.marketCost);p.starterPurchased=true;p.itemReadyAt={};
  }
  s.log.unshift('Everyone starts with Spring Step and 5 Coins: 10 Coins minus the 5-Coin starter pack.');
  return s;
}
export function buyStarter(){throw new Error('Every player already has the same starter pack.');}
export function chooseStarter(s,{playerId,choice}={}){
 if(!currentRules(s)||s.phase!=='waiting'||s.mode!=='waiting')throw new Error('Starter selection is not available.');
 const p=s.players[playerId];if(!Number.isInteger(playerId)||!p)throw new RangeError('Unknown player.');if(p.ready)throw new Error('Unready before changing your starter.');
 if(!Number.isInteger(choice)||choice<0||choice>=s.starterOffer.length)throw new RangeError('Choose a starter from this table.');
 if(p.starterChoice===choice)return s;const id=s.starterOffer[choice],deck=s.decks.hand,index=deck.draw.indexOf(id);
 if(index<0)throw new Error('That starter is unavailable.');if(!p.starterPurchased&&p.coins<5)throw new Error('Not enough Match Coins.');
 const old=p.starterChoice===null?null:s.starterOffer[p.starterChoice];if(old){const at=p.hand.indexOf(old);if(at<0)throw new Error('Your starter changed.');p.hand.splice(at,1);}
 deck.draw.splice(index,1);if(old)deck.draw.unshift(old);p.hand.push(id);if(!p.starterPurchased)gain(p,-5);p.starterPurchased=true;p.starterChoice=choice;return sync(s);
}
export function setReady(s,id,ready=true){if(s.phase!=='waiting')throw new Error('The race has already started.');if(!Number.isInteger(id)||!s.players[id])throw new RangeError('Unknown player.');if(typeof ready!=='boolean')throw new TypeError('Ready must be true or false.');if(currentRules(s)&&ready&&s.players[id].starterChoice===null){if(s.players[id].bot)chooseStarter(s,{playerId:id,choice:0});else throw new Error('Choose your starter item before readying.');}s.players[id].ready=ready;return s;}
export function startAdventure(s){if(s.phase!=='waiting')throw new Error('The race has already started.');if(!s.players.every(p=>p.ready))throw new Error('Every player must be ready.');s.activePlayer=Math.floor(random(s)*s.count);s.activeId=s.activePlayer;s.startingPlayer=s.activePlayer;s.mode='playing';s.phase='roll';note(s,`${s.players[s.activePlayer].name} starts the race. Let’s roll.`);return s;}
export function rollDice(s,id){
  if(s.phase==='trial-roll'){active(s,id,'trial-roll');s.dice=[d6(s)];s.phase='trial-result';return [...s.dice];}
  active(s,id,'roll');const p=s.players[id];expireShield(s,p,p.ownTurns+1);p.ownTurns++;s.lastEvent=null;s.lastWell=null;p.reactionUsed=false;p.proactiveUsed=false;p.prankReceived=false;gain(p,BOARD.resources.turnIncome);
  if(BOARD.deck.refreshEveryOwnTurns>0&&p.ownTurns%BOARD.deck.refreshEveryOwnTurns===0)draw(s,p);
  s.movementMode=movementMode(p.pos);s.dice=s.movementMode==='single'?[d6(s)]:[d6(s),d6(s)];s.phase='choose';return [...s.dice];
}
function harmful(p,op){return (op.kind==='move'&&op.amount<0&&p.pos>0)||(op.kind==='sparks'&&op.amount<0&&p.coins>0)||(op.kind==='discard'&&p.hand.length>0)||['rivalTransferSparks','rivalDiscard'].includes(op.kind);}
function canReact(s,p,c,pending){return !!(c&&c.timing==='Reaction'&&!p.reactionUsed&&p.coins>=c.cost&&c.effect.kind==='cancel'&&c.effect.sources.includes(pending.source));}
export function reactionCards(s){if(!s.pendingEffect)return [];const p=s.players[s.pendingEffect.playerId];return p.hand.filter(id=>canReact(s,p,cardById.get(id),s.pendingEffect));}
function operations(s,p,ops){for(const op of ops){switch(op.kind){
  case 'move':move(p,op.amount);break;
  case 'sparks':gain(p,op.amount);break;
  case 'draw':if(currentRules(s))drawOffer(s,p);else draw(s,p,op.amount??1);break;
  case 'shield':armShield(s,p);break;
  case 'discard':if(p.hand.length)s.pendingDiscard={playerId:p.id,reason:'event',count:1};break;
  case 'rivalTransferSparks':{const actor=s.players[op.actorId],n=Math.min(op.amount,p.coins,BOARD.resources.cap-actor.coins);gain(p,-n);gain(actor,n);break;}
  case 'rivalDiscard':if(p.hand.length)s.decks.hand.discard.push(...p.hand.splice(Math.floor(random(s)*p.hand.length),1));break;
  default:throw new Error(`Unsupported card effect: ${op.kind}`);
}}}
function finishEffect(s){const e=s.pendingEffect,p=s.players[e.playerId],before=p.coins;s.pendingEffect=null;operations(s,p,e.operations);cue(s,{kind:e.cardId?'card':e.source,source:e.source,cardId:e.cardId,eventId:e.eventId,...(e.section!==undefined?{section:e.section}:{}),actorId:e.actorId??s.activePlayer,targetId:p.id,coins:p.coins-before});if(s.pendingDiscard){s.phase='discard';sync(s);}else cardsWindow(s);}
function effect(s,playerId,source,ops,label,visual={}){
  const p=s.players[playerId];s.pendingEffect={playerId,source,operations:ops,label,...visual};
  if(ops.some(op=>harmful(p,op))){if(p.shield){clearShield(p);s.pendingEffect=null;cue(s,{kind:'shield',source,actorId:visual.actorId??s.activePlayer,targetId:playerId,cardId:visual.cardId,blocked:true});note(s,`${p.name}’s shield blocks ${label}.`);cardsWindow(s);return;}
    if(reactionCards(s).length){s.phase='reaction';return;}}
  finishEffect(s);
}
function shop(s){const offer=[take(s,'hand'),take(s,'hand')].filter(Boolean);if(offer.length){s.pendingShop={playerId:s.activePlayer,offer};s.phase='shop';}else cardsWindow(s);}
function landing(s,p){const t=tileAt(p.pos,s.rulesVersion),type=t?.type??'trail',e={...BOARD.effects[type],...t};
  switch(type){
    case 'spark':gain(p,e.amount??3);cardsWindow(s);break;
    case 'draw':if(currentRules(s))drawOffer(s,p);else{draw(s,p);cardsWindow(s);}break;
    case 'market':shop(s);break;
    case 'well':s.phase='well';break;
    case 'trap':effect(s,p.id,'trap',[{kind:'move',amount:-(e.amount??3)}],e.sequence==='six-seven'?'Six Seven · back 6':'the trap',{section:p.pos});break;
    case 'setback':case 'portal':{const link=BOARD.links.find(l=>l.from===p.pos);if(!link)throw new Error('Missing board crossing.');if(type==='portal'){move(p,link.to-p.pos);note(s,`${p.name} takes the portal to ${p.pos}.`);cardsWindow(s);}else effect(s,p.id,'setback',[{kind:'move',amount:link.to-p.pos}],link.name);break;}
    case 'good':case 'bad':{const id=take(s,type);if(!id){cardsWindow(s);break;}const ev=eventById.get(id);s.decks[type].discard.push(id);s.lastEvent={...ev,deck:type,playerId:p.id,turn:s.turn};note(s,`${ev.name}: ${ev.text}`);effect(s,p.id,type==='bad'?'badEvent':'goodEvent',ev.effects??[ev.effect],ev.name,{eventId:ev.id,actorId:p.id});break;}
    default:cardsWindow(s);
  }
}
function recordMotion(s,before,landing=null,effect=null){
 // Reach the printed cell before asking for a defensive reaction. The harmful
 // effect gets its own confirmed presentation after the reaction is resolved.
 const pending=!!(landing&&(s.pendingEffect||s.pendingLanding));
 if(pending)effect={kind:'trail',pending:true,targetId:landing.playerId};
 const tracks=s.players.flatMap((p,i)=>p.pos!==before[i]||landing&&landing.playerId===p.id||effect&&effect.targetId===p.id?[{playerId:p.id,from:before[i],landing:landing?.playerId===p.id?landing.section:before[i],to:p.pos,type:landing?.playerId===p.id?cellEffect(landing.section,s.rulesVersion):'effect',...(effect?.cardId?{cardId:effect.cardId,sourceId:effect.actorId}:{})}]:[]);
 if(sixSevenRules(s)&&!landing&&effect?.section===67&&effect.kind==='trap')for(const track of tracks)track.type='trap';
 for(const track of tracks)if(sixSevenRules(s)&&landing?.playerId===track.playerId&&landing.section===67)track.sixSeven=true;
 if(pending)for(const track of tracks)track.type='trail';
 if(tracks.length){let durationMs=presentationDurationMs(tracks,effect??{});if(isFullRace(s)&&effect?.kind==='finish')durationMs=Math.max(durationMs,Math.max(...tracks.map(t=>Math.abs(t.landing-t.from)*CELL_STEP_MS))+FINISH_CELEBRATION_MS);
  if(!timedShields(s)){
   durationMs=tracks.some(t=>t.landing!==t.to&&t.from!==t.landing)?2100:1250;
   if(effect?.cardId==='spring-step')durationMs=1800;
   if(['pocket-rocket','magic-carpet','paper-glider'].includes(effect?.cardId))durationMs=2100;
   if(landing?.section===67&&currentRules(s))durationMs=Math.max(durationMs,3300);
  }
  s.presentationMotion={serial:(s.presentationMotion?.serial??0)+1,turn:s.turn,tracks,durationMs,...(timedShields(s)?{timingVersion:2}:{}),...(effect?{effect}:{} )};
 }
}
function presented(s,action){const before=s.players.map(p=>p.pos),previous=s.presentationCue?.serial;const result=action();recordMotion(s,before,null,s.presentationCue?.serial!==previous?s.presentationCue:null);return result;}
function resolveArrival(s){const p=s.players[s.activePlayer];s.pendingLanding=null;if(p.pos===FINISH){if(p.crownSeal)return win(s,p.id);s.pendingTrial={player:p.id,stage:'roll'};s.phase='trial-roll';}else landing(s,p);return sync(s);}
export function resolveTurn(s,{playerId=s.activePlayer,dieIndex=0,item='none'}={}){
  active(s,playerId,'choose');if(item!=='none')throw new Error('Use a hand card after landing.');if(!Number.isInteger(dieIndex)||dieIndex<0||dieIndex>=s.dice.length)throw new RangeError('Choose an available die.');
  const p=s.players[playerId],mode=s.movementMode??movementMode(p.pos),distance=mode==='sum'?s.dice.reduce((a,b)=>a+b,0):s.dice[mode==='single'?0:dieIndex],before=s.players.map(p=>p.pos),destination=Math.min(FINISH,p.pos+distance);
  const coinsBefore=p.coins;p.pos=destination;s.turnCount++;p.stats??={};p.stats.moves=(p.stats.moves??0)+1;s.lastTurn={playerId,dieIndex,die:distance,dice:[...s.dice],item:'none',from:before[playerId],landing:destination,to:destination,before,after:s.players.map(p=>p.pos),effect:cellEffect(destination,s.rulesVersion),coinsBefore,notes:[]};s.lastActions=[{id:playerId,playerId,dieIndex,die:distance,card:distance,item:'none'}];
  note(s,`${p.name} moves ${distance} to section ${destination}.`);
  // Resolve the refresh overflow before the landing can draw another card or
  // start a trial. A player can never carry a fourth card into the next turn.
  if(p.hand.length>BOARD.deck.handLimit){s.pendingLanding={playerId};s.pendingDiscard={playerId,reason:'overflow-before-landing',count:p.hand.length-BOARD.deck.handLimit};s.phase='discard';recordMotion(s,before,{playerId,section:destination});return sync(s);}
  const previous=s.presentationCue?.serial,result=resolveArrival(s);recordMotion(s,before,{playerId,section:destination},s.presentationCue?.serial!==previous?s.presentationCue:{kind:cellEffect(destination,s.rulesVersion),actorId:playerId,targetId:playerId,section:destination,coins:s.players[playerId].coins-(s.lastTurn.coinsBefore??s.players[playerId].coins)});return result;
}
export function chooseShop(s,{playerId=s.activePlayer,choice=0}={}){
  active(s,playerId,'shop');const offer=s.pendingShop.offer,p=s.players[playerId];
  if(choice!==null&&(!Number.isInteger(choice)||choice<0||choice>=offer.length))throw new RangeError('Choose a card from the shop or decline.');
  if(choice!==null&&p.coins<BOARD.deck.marketCost)throw new Error('Not enough Match Coins.');
  if(choice!==null){gain(p,-BOARD.deck.marketCost);p.hand.push(offer[choice]);note(s,`${p.name} buys ${cardById.get(offer[choice]).name} for 5 Coins.`);}
  else note(s,`${p.name} passes the shop.`);
  s.decks.hand.discard.push(...offer.filter((_,i)=>i!==choice));s.pendingShop=null;cardsWindow(s);return s;
}
export function chooseDraw(s,{playerId=s.activePlayer,choice}={}){
 active(s,playerId,'draw');const offer=s.pendingDraw?.offer,p=s.players[playerId];
 if(!currentRules(s)||s.pendingDraw?.playerId!==playerId||!offer)throw new Error('No item offer is due.');
 if(choice!==null&&(!Number.isInteger(choice)||choice<0||choice>=offer.length))throw new RangeError('Choose an item from this offer or skip.');
 if(choice!==null)p.hand.push(offer[choice]);s.decks.hand.discard.push(...offer.filter((_,i)=>i!==choice));s.pendingDraw=null;
 note(s,`${p.name} ${choice===null?'leaves the item offer':'chooses an item'}.`);cardsWindow(s);return s;
}
export function discardCard(s,{playerId,cardIndex}={}){if(s.phase!=='discard'||!s.pendingDiscard)throw new Error('No discard is due.');const owner=s.pendingDiscard.playerId;if(playerId!==owner)throw new Error('Only the card owner may discard.');const p=s.players[owner];if(!Number.isInteger(cardIndex)||cardIndex<0||cardIndex>=p.hand.length)throw new RangeError('Choose a card to discard.');s.decks.hand.discard.push(...p.hand.splice(cardIndex,1));if(--s.pendingDiscard.count<=0){s.pendingDiscard=null;if(s.pendingLanding){const wasSixSeven=sixSevenRules(s)&&s.players[s.activePlayer].pos===67,wasFinish=isFullRace(s)&&s.players[s.activePlayer].pos===FINISH,before=s.players.map(p=>p.pos),cueBefore=s.presentationCue?.serial;resolveArrival(s);if((wasSixSeven||wasFinish)&&s.presentationCue?.serial!==cueBefore)recordMotion(s,before,null,s.presentationCue);}else cardsWindow(s);}return s;}
function chooseWellAction(s,{playerId=s.activePlayer,choice='safe'}={}){active(s,playerId,'well');if(!['safe','roll'].includes(choice))throw new RangeError('Choose safe or roll.');const die=choice==='roll'?d6(s):null,n=die?BOARD.effects.well.outcomes.find(o=>o.faces.includes(die)).sparks:BOARD.effects.well.safeGain;const before=s.players[playerId].coins;gain(s.players[playerId],n);const actual=s.players[playerId].coins-before;s.lastWell={die,coins:actual,sparks:actual,nominal:n,turn:s.turn,playerId};cue(s,{kind:'well',actorId:playerId,targetId:playerId,coins:actual,die});note(s,`${s.players[playerId].name} ${actual<0?'loses':'gains'} ${Math.abs(actual)} Coin${Math.abs(actual)===1?'':'s'} at the well${die?' (rolled '+die+')':''}.`);cardsWindow(s);return s;}
function useReactionAction(s,{playerId,cardIndex=null}={}){if(s.phase!=='reaction'||s.pendingEffect?.playerId!==playerId)throw new Error('Only the affected player may react.');const p=s.players[playerId];if(cardIndex===null){finishEffect(s);return s;}if(!Number.isInteger(cardIndex)||cardIndex<0||cardIndex>=p.hand.length)throw new RangeError('Choose a reaction card.');const c=cardById.get(p.hand[cardIndex]);if(!canReact(s,p,c,s.pendingEffect))throw new Error('This reaction does not apply.');gain(p,-c.cost);p.reactionUsed=true;p.stats??={};p.stats.itemsUsed=(p.stats.itemsUsed??0)+1;note(s,`${p.name} uses ${c.name}.`);
  if(c.effect.kind==='cancel'){const stopped=s.pendingEffect;cue(s,{kind:'cancel',cardId:c.id,actorId:playerId,targetId:playerId,blocked:true,stoppedCardId:stopped.cardId});s.pendingEffect=null;cardsWindow(s);}else{s.pendingEffect.operations=s.pendingEffect.operations.map(op=>op.kind==='move'&&op.amount<0?{...op,amount:Math.min(0,op.amount+c.effect.amount)}:op);finishEffect(s);}return sync(s);
}
function cardError(s,p,c,options={}){
  if(!c||!cardsForRules(s.rulesVersion).some(x=>x.id===c.id))return 'Unknown card.';if(c.timing==='Reaction')return 'Use this card when a harmful effect targets you.';if(p.proactiveUsed)return 'You have already played a card this turn.';if(p.coins<c.cost)return 'Not enough Match Coins.';
  const e=c.effect;
  if(p.ownTurns<(p.itemReadyAt?.[c.id]??0))return 'This item is resting. Skip one personal turn between uses.';
  if(e.kind==='shield'&&p.shield)return 'Your shield is already armed.';
  if(e.condition==='normalDieAtMost2'&&s.lastTurn?.die>(s.rulesVersion!=='match-coins-v1'&&s.movementMode==='sum'?4:2))return s.rulesVersion==='match-coins-v1'?'Your normal move must be 1 or 2.':'Needs a normal move of 1–2, or a two-dice sum of 2–4.';
  if(e.condition==='uniqueLastAndGap10'){const racers=s.players.filter(q=>!isFullRace(s)||!q.finished),min=Math.min(...racers.map(q=>q.pos)),max=Math.max(...racers.map(q=>q.pos));if(p.pos!==min||racers.filter(q=>q.pos===min).length!==1||max-min<10)return 'You must be alone in last place, at least 10 behind.';}
  if(e.kind==='nextPortal'&&!BOARD.tiles.some(t=>t.type==='portal'&&t.number>p.pos&&t.number<=p.pos+e.range))return 'There is no portal within 6 sections.';
  if(['salvage','exchange'].includes(e.kind)&&p.hand.length<2)return 'You need another card in your hand.';
  if(e.kind.startsWith('rival')){const targets=cardTargets(s,p.id,c.id);if(!targets.length)return 'There is no eligible rival in range.';if(options.targetId!==undefined&&!targets.includes(options.targetId))return 'That rival cannot be targeted.';}
  return null;
}
export function cardTargets(s,playerId,cardId){const p=s.players[playerId],e=cardById.get(cardId)?.effect;if(!p||!cardsForRules(s.rulesVersion).some(c=>c.id===cardId)||!e?.kind.startsWith('rival'))return [];return s.players.filter(q=>q.id!==p.id&&(!isFullRace(s)||!q.finished)&&!q.prankReceived&&Math.abs(q.pos-p.pos)<=e.range&&(!e.aheadOnly||q.pos>p.pos)&&(e.kind!=='rivalTransferSparks'||q.coins>0)&&(e.kind!=='rivalDiscard'||q.hand.length>0)).map(q=>q.id);}
export function cardAvailability(s,playerId=s.activePlayer){const p=s.players[playerId];return p.hand.map((id,index)=>({id,index,card:cardById.get(id),reason:s.phase!=='cards'||playerId!==s.activePlayer?'Wait for your card window.':cardError(s,p,cardById.get(id))}));}
function playCardAction(s,{playerId=s.activePlayer,cardIndex,targetId}={}){
  active(s,playerId,'cards');const p=s.players[playerId];if(!Number.isInteger(cardIndex)||cardIndex<0||cardIndex>=p.hand.length)throw new RangeError('Choose a card from your hand.');const c=cardById.get(p.hand[cardIndex]),error=cardError(s,p,c,{targetId});if(error)throw new Error(error);const e=c.effect;
  if(e.kind.startsWith('rival')&&!Number.isInteger(targetId))throw new Error('Choose a rival.');
  // Validate before paying. Persistent equipment stays in its owner's hand.
  gain(p,-c.cost);p.proactiveUsed=true;if(c.cooldownTurns){p.itemReadyAt??={};p.itemReadyAt[c.id]=p.ownTurns+c.cooldownTurns;}note(s,`${p.name} uses ${c.name}.`);
  p.stats??={};p.stats.itemsUsed=(p.stats.itemsUsed??0)+1;
  if(!e.kind.startsWith('rival'))cue(s,{kind:'card',cardId:c.id,actorId:playerId,targetId:playerId});
  switch(e.kind){
    case 'move':move(p,e.amount);break;
    case 'shield':armShield(s,p);break;
    case 'rivalMove':case 'rivalTransferSparks':case 'rivalDiscard':{
      const q=s.players[targetId];q.prankReceived=true;
      const op=e.kind==='rivalMove'?{kind:'move',amount:e.amount}:{kind:e.kind,amount:e.amount,actorId:playerId};effect(s,targetId,'rivalCard',[op],c.name,{cardId:c.id,actorId:playerId});break;
    }
    default:throw new Error(`Unsupported card: ${c.id}`);
  }
  if(s.phase==='cards')cardsWindow(s);return sync(s);
}
export function canForage(s,playerId=s.activePlayer){const p=s.players[playerId];return !!(s.mode==='playing'&&s.phase==='cards'&&playerId===s.activePlayer&&p&&!p.proactiveUsed&&p.coins<3);}
export function forage(s,playerId=s.activePlayer){
  active(s,playerId,'cards');if(!canForage(s,playerId))throw new Error('Forage needs fewer than 3 Coins and your unused item action.');
  const p=s.players[playerId];gain(p,3);p.proactiveUsed=true;note(s,`${p.name} forages for 3 Coins instead of using an item.`);return sync(s);
}
export function endTurn(s,playerId=s.activePlayer){active(s,playerId,'cards');return end(s);}
function resolveTrialAction(s,{playerId=s.activePlayer}={}){active(s,playerId,'trial-result');const die=s.dice[0],risk=s.pendingTrial.stage==='reroll';note(s,`${s.players[playerId].name} rolls ${die} at the throne.`);if(die>=BOARD.throneTrial.successMin)return win(s,playerId);if(risk){s.players[playerId].pos=BOARD.throneTrial.riskFailurePosition;s.players[playerId].crownSeal=false;note(s,'The risky roll failed. Back to section 136.');return end(s);}s.pendingTrial.stage='choice';s.phase='trial-choice';return sync(s);}
function chooseTrialOutcomeAction(s,{playerId=s.activePlayer,choice}={}){active(s,playerId,'trial-choice');if(!['seal','risk'].includes(choice))throw new RangeError('Choose seal or risk.');if(choice==='seal'){s.players[playerId].crownSeal=true;s.players[playerId].pos=s.rulesVersion==='match-coins-v1'?142:BOARD.throneTrial.failurePosition;note(s,`${s.players[playerId].name} takes the Crown Seal and returns to ${s.players[playerId].pos}.`);return end(s);}s.pendingTrial.stage='reroll';s.phase='trial-roll';s.dice=null;return s;}
export const chooseWell=(s,options)=>presented(s,()=>chooseWellAction(s,options));
export const useReaction=(s,options)=>presented(s,()=>useReactionAction(s,options));
export const playCard=(s,options)=>presented(s,()=>playCardAction(s,options));
export const resolveTrial=(s,options)=>presented(s,()=>resolveTrialAction(s,options));
export const chooseTrialOutcome=(s,options)=>presented(s,()=>chooseTrialOutcomeAction(s,options));
export function botTurnChoice(s,playerId=s.activePlayer){active(s,playerId,'choose');const score=d=>{const n=Math.min(FINISH,s.players[playerId].pos+d),type=cellEffect(n,s.rulesVersion);if(type==='setback'||type==='portal')return BOARD.links.find(l=>l.from===n)?.to??n;return n-(type==='trap'?(tileAt(n,s.rulesVersion)?.amount??3):type==='bad'?2:0);};return {playerId,dieIndex:s.movementMode==='choose'&&score(s.dice[1])>score(s.dice[0])?1:0,item:'none'};}
// One state transition only: callers can animate a roll before resolving it.
export function advanceBot(s){const id=s.activePlayer;switch(s.phase){
  case 'roll':case 'trial-roll':rollDice(s,id);break;
  case 'choose':resolveTurn(s,botTurnChoice(s));break;
  case 'trial-result':resolveTrial(s,{playerId:id});break;
  case 'trial-choice':chooseTrialOutcome(s,{playerId:id,choice:s.players.some(p=>p.id!==id&&(!isFullRace(s)||!p.finished)&&p.pos>=138)?'risk':'seal'});break;
  case 'shop':{const p=s.players[id],choice=p.coins>=BOARD.deck.marketCost&&p.hand.length<BOARD.deck.handLimit?s.pendingShop.offer.findIndex(item=>!p.hand.includes(item)):-1;chooseShop(s,{playerId:id,choice:choice<0?null:choice});break;}
  case 'draw':{const p=s.players[id],choice=s.pendingDraw.offer.findIndex(item=>!p.hand.includes(item));chooseDraw(s,{playerId:id,choice:p.hand.length>=BOARD.deck.handLimit?null:choice<0?0:choice});break;}
  case 'well':chooseWell(s,{playerId:id,choice:'safe'});break;
  case 'discard':discardCard(s,{playerId:s.pendingDiscard.playerId,cardIndex:s.players[s.pendingDiscard.playerId].hand.length-1});break;
  case 'reaction':{const p=s.players[s.pendingEffect.playerId],reactions=reactionCards(s);useReaction(s,{playerId:p.id,cardIndex:reactions.length?p.hand.indexOf(reactions[0]):null});break;}
  case 'cards':{if(canForage(s,id)){forage(s,id);break;}const playable=cardAvailability(s).find(a=>!a.reason);if(playable){const targetId=cardTargets(s,id,playable.id)[0];playCard(s,{playerId:id,cardIndex:playable.index,targetId});}else endTurn(s,id);break;}
}return s;}
export const createMatch=createAdventure,startMatch=startAdventure,resolveMove=resolveTurn;
