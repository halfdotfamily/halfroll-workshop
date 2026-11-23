// New v12+ tables reserve each seat's physical cards up front. Saved sequential
// drafts retain their original rules; offers are never regenerated on reads.
export const parallelPreparation=s=>s?.starterDraft?.mode==='parallel';
export const preparationActor=s=>parallelPreparation(s)?s.starterDraft.order.find(id=>!s.players[id].starterPurchased)??null:null;
export const starterOfferFor=(s,id)=>parallelPreparation(s)?s.starterDraft.offers[id]??[]:s.starterOffer??[];
const random=s=>{let value;if(typeof s.randomSource==='function')value=s.randomSource();else{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;value=s.seed/4294967296;}if(!Number.isFinite(value)||value<0||value>=1)throw RangeError('Random source must return [0, 1).');return value;};
const shuffle=(s,list)=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};
export function prepareParallel(s,items){
 if(!['local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'].includes(s.rulesVersion)||parallelPreparation(s))return s;
 s.decks.hand.draw.push(...s.starterOffer);s.starterOffer=[];
 const offers={};
 for(const id of s.starterDraft.order){const pool=shuffle(s,items.filter(card=>s.decks.hand.draw.includes(card)));if(pool.length<3)throw Error('Not enough starter cards.');offers[id]=pool.slice(0,3);for(const card of offers[id])s.decks.hand.draw.splice(s.decks.hand.draw.indexOf(card),1);}
 Object.assign(s.starterDraft,{mode:'parallel',offers});
 s.log[0]='Each racer starts with 5 Coins and chooses one free card.';
 return s;
}
function waiting(s,id){if(s.mode!=='waiting'||s.phase!=='waiting')throw Error('The race has already started.');if(!Number.isInteger(id)||!s.players[id])throw RangeError('Unknown player.');}
export function chooseParallelStarter(s,{playerId,choice}={}){
 waiting(s,playerId);const p=s.players[playerId],offer=starterOfferFor(s,playerId);
 if(p.ready||p.starterPurchased||p.hand.length)throw Error('Your starter has already been selected.');
 if(!Number.isInteger(choice)||choice<0||choice>=offer.length)throw RangeError('Choose one of your three starter cards.');
 // Complete entropy-dependent work before committing any part of the choice.
 const entropy={seed:s.seed,randomSource:s.randomSource},draw=shuffle(entropy,[...s.decks.hand.draw,...offer.filter((_,i)=>i!==choice)]);
 const card=offer[choice];p.hand.push(card);Object.assign(p,{starterAssigned:card,starterPurchased:true,starterChoice:choice});
 s.decks.hand.draw=draw;s.seed=entropy.seed;
 s.starterDraft.offers[playerId]=[];s.starterDraft.chosen.push(card);s.starterDraft.cursor++;
 s.starterDraft.complete=s.players.every(player=>player.starterPurchased);return s;
}
export function chooseParallelDefault(s,id=preparationActor(s)){
 const priority=['to-the-moon','pump','gigachad','gamba','hook','swap','bonk','pocket-rocket','rug-pull','trade-offer'];
 const choice=starterOfferFor(s,id).map((card,index)=>({index,rank:priority.indexOf(card)})).sort((a,b)=>a.rank-b.rank||a.index-b.index)[0]?.index;
 return chooseParallelStarter(s,{playerId:id,choice});
}
export function setParallelReady(s,id,ready=true){waiting(s,id);if(typeof ready!=='boolean')throw TypeError('Ready must be true or false.');if(ready&&!s.players[id].starterPurchased)throw Error('Choose your starter first.');s.players[id].ready=ready;return s;}
