import BASE_BOARD from '../../world/route/board-rules.json' with {type:'json'};

export const RULES_VERSION='local-cards-v7';
export const STARTER_ITEMS=Object.freeze(['pump','bonk','hook','gigachad','rug-pull','swap']);
const card=(id,name,purchaseCost,type,kind,text,extra={})=>({id,name,purchaseCost,type,cost:0,copies:6,oneShot:true,persistent:false,timing:kind==='reflect'?'Reaction':'After landing',text,effect:{kind,...extra}});
export const CARDS=Object.freeze([
 card('bonk','BONK!',2,'prank','rivalMove','Send a rival within 5 tiles back 3.',{amount:-3,range:5}),
 card('hook','UNI HOOK',3,'mobility','hook','Pull yourself to a rival ahead, within 10 tiles.',{range:10,aheadOnly:true}),
 card('swap','SWAP!',4,'prank','swap','Swap places with a rival within 5 tiles.',{range:5}),
 card('pump','PUMP!',2,'mobility','move','Move forward 3.',{amount:3}),
 card('to-the-moon','TO THE MOON!',4,'mobility','move','Move forward 6.',{amount:6}),
 card('pocket-rocket','Pocket Rocket',5,'prank','rivalMove','Send a rival ahead, within 6 tiles, back 5. Shields block it.',{amount:-5,range:6,aheadOnly:true}),
 card('gigachad','PEEK SHIELD',1,'defense','shield','Block the next attack or trap. Pandora ignores shields.'),
 card('rug-pull','RUG PULL!',1,'prank','rivalTransferSparks','Steal up to 2 Coins from a rival within 5 tiles.',{amount:2,range:5}),
 card('reverse','REVERSE!',3,'defense','reflect','Reflect BONK!, RUG PULL! or TRADE OFFER back to its sender.'),
 card('send-it','SEND IT!',2,'mobility','send-it','50/50: move forward 9 or back 5.'),
 card('trade-offer','TRADE OFFER',3,'prank','trade-offer','Take a random card from a rival within 5 tiles. Give them 1 Coin.',{range:5}),
]);
const event=(id,name,polarity,weight,text,ops)=>({id,name,polarity,deck:polarity,weight,probability:weight/100,text,effects:ops});
const pandora=[
 event('stonks','STONKS!','good',13.5,'Gain 5 Coins.',[{kind:'sparks',amount:5}]),
 event('free-mint','FREE MINT!','good',13.5,'Get a random card. Full hand: gain 2 Coins instead.',[{kind:'freeMint'}]),
 event('wormhole','WORMHOLE!','good',13.5,'Move forward 5.',[{kind:'move',amount:5}]),
 event('jackpot','DIAMOND HAND','good',4.5,'Gain 10 Coins.',[{kind:'sparks',amount:10}]),
 event('not-stonks','NOT STONKS!','bad',13.5,'Lose 4 Coins.',[{kind:'sparks',amount:-4}]),
 event('mimic','MIMIC!','bad',13.5,'Move back 5.',[{kind:'move',amount:-5}]),
 event('paper-hands','PAPER HANDS!','bad',13.5,'Lose a random card. Empty hand: lose 2 Coins instead.',[{kind:'paperHands'}]),
 event('rekt','REKT!','bad',4.5,'Lose 5 Coins and move back 3.',[{kind:'sparks',amount:-5},{kind:'move',amount:-3}]),
 event('bombardiro','BOMBARDIRO!','chaos',10,'Everyone within 10 tiles, including you, moves 1–5 forward or back. Each result is random.',[{kind:'bombardiro',range:10}]),
];
export const EVENTS=Object.freeze({pandora,good:pandora.filter(e=>e.polarity==='good'),bad:pandora.filter(e=>e.polarity==='bad'),chaos:pandora.filter(e=>e.polarity==='chaos')});
export function pandoraEventAt(value){if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('Random value must be in [0, 1).');let boundary=0;return pandora.find(e=>(boundary+=e.weight)>value*100);}
export const BOARD=structuredClone(BASE_BOARD);
BOARD.version=RULES_VERSION;
Object.assign(BOARD.resources,{name:'Match Coins',initial:5,cap:30,turnIncome:0});
Object.assign(BOARD.deck,{file:'game/card-library/rules.js',copiesPerDesign:6,designCount:CARDS.length,totalCards:CARDS.length*6,initialHand:1,handLimit:3,refreshEveryOwnTurns:0,marketSize:2,marketCost:null,starterPack:{automatic:true,unique:true,cost:0}});
BOARD.throneTrial.failurePosition=140;
// Preserve every original reward position: both chest colors become the same
// closed Pandora box, and only original coin cells become AIRDROP.
BOARD.tiles=BOARD.tiles.map(tile=>['good','bad'].includes(tile.type)
 ?{number:tile.number,type:'pandora',effect:'pandora',name:'PANDORA BOX'}
 :tile.type==='spark'?{number:tile.number,type:'airdrop',effect:'airdrop',name:'AIRDROP!',amount:3}:tile);
const trap=BOARD.tiles.find(t=>t.number===68);Object.assign(trap,{number:67,name:'Six Seven',amount:6,sequence:'six-seven'});
BOARD.tiles.sort((a,b)=>a.number-b.number);
BOARD.effects.airdrop={action:'gain-coins',amount:3};BOARD.effects.pandora={action:'random-event',triggerDestination:false,defendable:false};
// This board has one Pandora event pool and individually priced one-use cards.
// Do not retain the old chest/coin actions or advertise the original free shop.
for(const type of ['good','bad','spark'])delete BOARD.effects[type];
BOARD.effects.market={action:'buy-one-of-two',draw:2,keep:1,priceSource:'card.purchaseCost',remainder:'discard',oncePerNormalLanding:true};
delete BOARD.turn.positionTies;
BOARD.eventDecks={file:'game/card-library/rules.js',pandora:9,resolve:'weighted-independent-45-45-10'};
BOARD.incomeMilestones=[12,24,36];
BOARD.turn.order=['normal-die','normal-move','landing-effect-or-throne-trial','one-optional-card-or-collect-two-coins','pass'];

// Profile changes add supply only. Existing special cells, income and card
// rules are identical, and every race stores its chosen profile independently
// of whichever option is currently selected in the local setup UI.
function freezeDeep(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeDeep(child);Object.freeze(value);}return value;}
export const BOARD_PROFILES=freezeDeep([
 {id:'baseline',label:'Original supply',counts:{market:9,draw:6},additions:{market:[],draw:[]}},
 {id:'moderate',label:'More pockets',counts:{market:12,draw:12},additions:{market:[57,72,110],draw:[23,49,60,80,96,134]}},
 {id:'dense',label:'Full pockets',counts:{market:15,draw:18},additions:{market:[27,57,72,87,110,130],draw:[23,46,49,60,68,80,91,96,105,117,134,137]}},
]);
const profiles=new Map();
for(const profile of BOARD_PROFILES){
 const board=profile.id==='baseline'?BOARD:structuredClone(BOARD),occupied=new Set(BOARD.tiles.map(t=>t.number));
 for(const [type,numbers]of Object.entries(profile.additions))for(const number of numbers){
  if(!Number.isInteger(number)||number<=0||number>=BOARD.finish||occupied.has(number))throw Error(`Supply profile overlaps section ${number}.`);
  occupied.add(number);board.tiles.push({number,type,effect:type,name:type==='market'?'Pocket Shop':'A free find'});
 }
 board.tiles.sort((a,b)=>a.number-b.number);
 for(const [type,expected]of Object.entries(profile.counts))if(board.tiles.filter(t=>t.type===type).length!==expected)throw Error(`Wrong ${profile.id} ${type} count.`);
 board.boardProfile=profile.id;profiles.set(profile.id,freezeDeep(board));
}
export function boardForProfile(id='baseline'){if(typeof id!=='string'||!profiles.has(id))throw new RangeError('Unknown local board profile.');return profiles.get(id);}
