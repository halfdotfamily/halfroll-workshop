import {BOARD,CARDS,FINISH,movementMode,cardsForRules,boardForRules,isNewRules} from './game-rules.js';
export function publicLine(text=''){for(const c of CARDS)for(const price of new Set([5,c.purchaseCost].filter(Number.isFinite)))text=text.replace(' buys '+c.name+' for '+price+' Coins.',' buys an item for '+price+' Coins.');return text;}
export function feedbackFor(m){
 const event=m.lastEvent?.turn===m.turn?m.lastEvent:null,well=m.lastWell?.turn===m.turn?m.lastWell:null;
 let text=publicLine(m.log[0]||'');const motion=m.presentationMotion,track=motion?.turn===m.turn?motion.tracks.find(t=>t.from!==t.landing&&t.landing!==t.to):null;
 if(track)text=m.players[track.playerId].name+' · '+track.landing+(track.type==='portal'?' → '+track.to:track.to<track.landing?' · back '+(track.landing-track.to):' · forward '+(track.to-track.landing));
 if(['roll','choose'].includes(m.phase))text='';
 return {key:m.turn+':'+m.turnCount+':'+publicLine(m.log[0]||''),text,event:event?{id:event.id,name:event.name,text:event.text,deck:event.deck,playerId:event.playerId}:null,well:well?{die:well.die,coins:well.coins}:null};
}
export function motionDuration(motion){return motion?.durationMs??1250;}
export function landingOptions(m,selected=0){
 if(m.phase!=='choose'||!m.dice)return [];
 const board=boardForRules(m.rulesVersion,m.boardProfile),p=m.players[m.activePlayer],mode=m.movementMode??movementMode(p.pos,m.rulesVersion);
 return (mode==='choose'?m.dice:[mode==='sum'?m.dice.reduce((a,b)=>a+b,0):m.dice[0]]).map((distance,i)=>{
 const section=Math.min(FINISH,p.pos+distance),tile=board.tiles.find(t=>t.number===section),link=board.links.find(l=>l.from===section);
 return {section,dieIndex:i,selected:mode!=='choose'||i===selected,type:tile?.type??'trail',destination:link?.to??null};
 });
}
export function sectionDetail(index,rulesVersion=BOARD.version,boardProfile){
 const board=boardForRules(rulesVersion,boardProfile),tile=board.tiles.find(t=>t.number===index)||{type:'trail',name:'Open trail'},link=board.links.find(l=>l.from===index);
 let text;
 if(isNewRules(rulesVersion)){const copy={airdrop:'AIRDROP: gain 3 Coins, up to 30.',pandora:['local-cards-v9','local-cards-v10','local-cards-v11','local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'].includes(rulesVersion)?'Open PANDORA BOX. A surprise awaits. Things get wilder near the throne.':'Open PANDORA BOX. One random event: 45% good, 45% bad, 10% chaos. It resolves immediately.',market:'See two cards at their shown prices. Buy one or pass. Keep up to three cards.',draw:'Find one random card for free. Keep up to three cards.',trail:['local-cards-v14','local-cards-v15','local-cards-v16'].includes(rulesVersion)?'Play one card per turn. With fewer than 5 Coins, collect +2 once after landing as a separate action.':['local-cards-v10','local-cards-v11','local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'].includes(rulesVersion)?'One card per turn: before rolling or after landing. With fewer than 5 Coins, collect +2 after landing instead.':['local-cards-v9','local-cards-v10','local-cards-v11','local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'].includes(rulesVersion)?'Land here, then play one card or end your turn. With fewer than 5 Coins, collect +2 instead.':'Land here, then play one single-use card, collect 2 Coins, or end your turn.',finish:'Reach or pass 144 and complete the Throne Trial. The race ends after the penultimate finisher; the remaining racer takes last place.'};if(copy[tile.type])return {name:tile.name||tile.type,text:copy[tile.type]+(['local-cards-v9','local-cards-v10','local-cards-v11','local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'].includes(rulesVersion)&&board.shopMilestones?.includes(index)?' On your first normal move to or past this mark, an optional shop opens after the landing effect.':'')};}
 if(link)text=link.type==='portal'?'Portal to '+link.to+(link.to<index?' · back '+(index-link.to):' · forward '+(link.to-index))+'. Shields and reactions do not stop portals. The destination does not activate.':link.name+': back '+(index-link.to)+' to section '+link.to+'. An armed shield or Leaf Umbrella can protect you. The destination does not activate.';
 else if(tile.type==='trap')text=(tile.sequence==='six-seven'?'Six Seven plays first. Then back 6 to section 61. ':'Back '+(tile.amount??board.effects.trap.amount)+' sections. ')+'An armed shield or Leaf Umbrella can protect you. The destination does not activate.';
 else if(tile.type==='finish')text=(rulesVersion==='match-coins-v6'?'Secure your place by finishing the Throne Trial. The race ends after the penultimate finisher; the remaining racer takes last place. ':'')+'Reach or pass 144. With a Crown Seal, you finish. Otherwise roll 4–6. On 1–3, take a seal and return to '+(rulesVersion==='match-coins-v1'?142:140)+', or risk one more roll. A failed risk sends you to 136.';
 else text=({trail:'An open section. Land here, then use one item or end your turn.',good:'Draw and resolve a Lucky event.',bad:'Draw a Jinx event. An armed shield goes first; otherwise an eligible Leaf Umbrella can protect you.',market:'See two items. Buy one for 5 Coins or skip. A full hand needs a discard; duplicate items share their use limits.',spark:'Gain '+(tile.amount??3)+' Coins, up to 30.',draw:['match-coins-v3','match-coins-v4','match-coins-v5','match-coins-v6'].includes(rulesVersion)?'Choose one of up to three different items for free, or leave the offer. Return to three cards if your hand overflows.':'Draw an item. Return to three cards if your hand overflows.',well:'Take 1 Coin, or roll: 1–2 lose up to 2; 3–4 gain 1; 5–6 gain up to 4. Coins stay between 0 and 30.'})[tile.type]||'Resolve this section, then use one item or end your turn.';
 return {name:tile.name||tile.type,text:isNewRules(rulesVersion)?text.replaceAll('An armed shield or Leaf Umbrella','PEEK SHIELD'):text};
}

export function sampleMotion(track,age,durationMs=1250){
 const t=Math.max(0,age),duration=durationMs/1000;
 if(t>=duration)return {pos:track.to,done:true};
 const two=track.from!==track.landing&&track.landing!==track.to;
 if(two&&t<.9)return {pos:track.from+(track.landing-track.from)*Math.min(1,t/.9)};
 if(two&&t<1.1)return {pos:track.landing};
 const from=two?track.landing:track.from,travel=track.cardId&&!two?duration:.9,f=Math.min(1,(t-(two?1.1:0))/travel);
 return track.type==='portal'&&track.landing!==track.to?{pos:f<1?track.landing:track.to,portal:f,from,to:track.to}:{pos:from+(track.to-from)*f};
}

export function cardForRules(card,version){return card.id==='paper-glider'&&version==='match-coins-v1'?{...card,text:'If your normal move was 1 or 2, hop 5. Stop before the throne; no new landing effect.'}:card.id==='bubble-coat'&&version?cardsForRules(version).find(c=>c.id===card.id)||card:card;}

/** Short visual copy for inspection only. Full rule explanations stay in the guide. */
export function sectionCardDetail(index,rulesVersion=BOARD.version,boardProfile){
 const detail=sectionDetail(index,rulesVersion,boardProfile),board=boardForRules(rulesVersion,boardProfile),tile=board.tiles.find(t=>t.number===index)||{type:'trail'},link=board.links.find(l=>l.from===index);
 const type=index===0?'start':link?.type==='portal'?'portal':link?'trap':tile.type;
 const labels={start:'START',trail:'ON THE TRAIL',airdrop:'SUPPLIES',spark:'SUPPLIES',pandora:'MYSTERY',market:'SHOP',draw:'FREE FIND',well:'MAKE A WISH',trap:'WATCH YOUR STEP',portal:'SHORTCUT',finish:'THE THRONE',good:'LUCKY',bad:'TROUBLE'};
 const art={start:'flag',trail:'dash',airdrop:'airdrop',spark:'roll-coin',pandora:'chest',market:'market',draw:'free-mint',well:'roll-coin',trap:'setback',portal:'wormhole',finish:'flag',good:'chest',bad:'trap'}[type]||'dash';
 const tone={airdrop:'gold',spark:'gold',pandora:'lilac',market:'mint',draw:'blue',well:'gold',trap:'coral',portal:'lilac',finish:'gold',good:'mint',bad:'coral'}[type]||'mint';
 let text=detail.text,name=detail.name;
 if(index===0){name='Base camp';text='Your race starts here. See you at the throne.';}
 else if(isNewRules(rulesVersion)){
  const copy={airdrop:'+3 Coins on landing. Wallet limit: 30.',pandora:'A sealed box. A strange surprise. Open it on landing.',market:'Two cards at their shown prices. Buy one or pass.',draw:'Find one random card for free. Keep up to three.',trail:'A quiet stretch. Plan your next trick.',finish:'Reach 144, then complete the Throne Trial.',well:'Take 1 Coin, or roll for a little more… or less.'};
  text=copy[type]||text;
  if(link)text=link.type==='portal'?`Jump to section ${link.to} (${link.to<index?'−':'+'}${Math.abs(link.to-index)} tiles).`:`Back ${index-link.to} tiles to section ${link.to}. PEEK SHIELD can block it.`;
  else if(type==='trap')text=(tile.sequence==='six-seven'?'Six Seven, then ':'' )+`back ${tile.amount??board.effects.trap.amount} tiles. PEEK SHIELD can block it.`;
  if(board.shopMilestones?.includes(index))text+=` Your first normal move to or past ${index} unlocks an optional shop after the landing effect. You do not have to stop here.`;
 }
 return {name,text,type,tag:labels[type]||'ON THE TRAIL',art,tone};
}
