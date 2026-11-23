import {STICKER_ART,RESULT_ART_BOUNDS} from './card-sticker-art.js';
import {eventStickerFrame,stickerCaptionLayout} from './event-sticker-art.js';
import {RESULT_READ_MS} from './head-feedback-layout.js';

export const RESULT_STICKER_MS=RESULT_READ_MS;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const movement=new Set(['bonk','hook','swap','pump','to-the-moon','pocket-rocket','gamba','wormhole','mimic','rekt','bombardiro','pandora-box']);
const labels={bonk:'BONK',hook:'UNI HOOK',swap:'SWAP',pump:'PUMP','to-the-moon':'TO THE MOON','pocket-rocket':'NUKE IT',gigachad:'PEEK SHIELD','rug-pull':'RUG PULL',reverse:'REVERSE',gamba:'GAMBA','trade-offer':'TRADE OFFER','network-down':'NETWORK DOWN',stonks:'STONKS','free-mint':'FREE MINT',wormhole:'WORMHOLE',jackpot:'DIAMOND HANDS','not-stonks':'NOT STONKS',mimic:'MIMIC','paper-hands':'PAPER HANDS',rekt:'REKT',bombardiro:'BOMBARDIRO','pandora-box':'BOX',airdrop:'AIRDROP',draw:'FREE CARD',market:'SHOP','shop-purchase':'SHOP',collect:'COLLECT',well:'WELL',portal:'PORTAL',trap:'SETBACK',setback:'SETBACK',trail:'INCOME'};
const pandora=new Set(['stonks','free-mint','wormhole','jackpot','not-stonks','mimic','paper-hands','rekt','bombardiro','pandora-box']);
const board=new Set(['airdrop','draw','market','shop-purchase','collect','well','portal','trap','setback','trail','coins-gain','coins-loss']);
const units=text=>text.replace(/\b(\d+)\s+COINS?\b/g,(_,n)=>`${n} ${Number(n)===1?'COIN':'COINS'}`).replace(/\b(\d+)\s+TILES?\b/g,(_,n)=>`${n} ${Number(n)===1?'TILE':'TILES'}`);
function receiptLayout(value){const layout=stickerCaptionLayout(value,{compact:true});if(layout.lines.length===1&&value.length>12){const spaces=[...value.matchAll(/\s+/g)].map(m=>m.index).sort((a,b)=>Math.abs(a-value.length/2)-Math.abs(b-value.length/2));if(spaces.length)layout.lines=[value.slice(0,spaces[0]),value.slice(spaces[0]).trim()];}return layout;}

/** The result begins after the committed action, never at contact or release. */
export function outcomeResultTiming(motion,{reduced=false}={}){
 const duration=Number(motion?.durationMs??motion)||0,startMs=reduced?0:Math.max(0,duration);
 return {startMs,endMs:startMs+RESULT_STICKER_MS,lifeMs:RESULT_STICKER_MS};
}

/** One finished meme image and factual result. No repeated scene or outcome RNG. */
export function cardResultSticker(item){
 const kind=item.storyKind||item.art,detail=String(item.detail||'').trim().replace(/^Coin cap$/i,'COINS FULL');
 // The action already shows the launch. A second source explosion suggests self damage.
 if(kind==='pocket-rocket'&&item.role==='source')return null;
 const numeric=/^[+−-]\d+$/.test(detail),delta=numeric?Number(detail.replace('−','-')):0;
 let art=STICKER_ART[item.art]?item.art:STICKER_ART[kind]?kind:'free-mint';
 if(kind==='pocket-rocket')art='nuke-blast';
 // Keep GAMBA's own identity; a capped roll still shows its committed ticket,
 // while the caption below reports the actual displacement (including zero).
 if(kind==='gamba')art=(delta||Number(item.amount))<0?'gamba-loss':'gamba-win';
 if(kind==='draw'&&item.cardsDelta!==0)art='free-mint';
 if(kind==='well')art=/^[−-]/.test(detail)?'not-stonks':'stonks';
 if((['free-mint','paper-hands'].includes(kind)||kind==='draw'&&item.coins!==undefined)&&item.cardsDelta===0)art=/^[−-]/.test(detail)?'not-stonks':'stonks';
 let caption;
 if(kind==='gamba'&&delta===0)caption='NO CHANGE';
 else if(numeric)caption=`${detail} TILES`;
 else if(item.title==='+CARD'||item.title==='−CARD')caption=[item.title.replace('CARD','1 CARD'),detail&&detail!==item.title?detail.toUpperCase().replace(/(\d+\s+)COIN\b/g,'$1COINS'):''].filter(Boolean).join(' · ');
 else if(detail)caption=detail.replace(/([+−-]\d+)(?=\s*·)/g,'$1 TILES').toUpperCase().replace(/(\d+\s+)COIN\b/g,'$1COINS').replace(/([+−-])CARD\b/g,(_,sign)=>sign+'1 CARD');
 else if(kind==='gamba')caption='NO CHANGE';
 else if(movement.has(kind))caption='NO MOVE';
 else caption=String(item.title||'DONE!').toUpperCase();
 const sourceCaption=String(item.sourceCaption||(labels[kind]||item.title||'RESULT')).toUpperCase();
 return {art,src:STICKER_ART[art],caption:units(caption),tone:item.tone==='bad'?'bad':'good',sourceCaption,category:item.pandora===true||item.pandora!==false&&pandora.has(kind)?'PANDORA':board.has(kind)?'TILE':'CARD',playerName:String(item.playerName||'').slice(0,24)};
}

export function cardResultStickerSvg(item){
 const result=cardResultSticker(item);if(!result)return '';
 const bounds=RESULT_ART_BOUNDS[result.art]||[0,0,100,100],source=receiptLayout(result.sourceCaption),detail=receiptLayout(result.caption),lines=source.lines.slice(0,2),two=lines.length>1;
 const centered=result.art!=='rekt',dense=centered&&detail.lines.length>1,offset=centered&&!dense?7:0;
 const text=(value,y,size,cls,color='#2a2c31')=>'<text x="60" y="'+y+'" text-anchor="middle" font-family="Dela Gothic One,sans-serif" font-size="'+size+'" fill="'+color+'" class="'+cls+'" '+(value.length>10?'textLength="'+(cls==='emotion-sticker__source'?88:100)+'" lengthAdjust="spacingAndGlyphs"':'')+'>'+escape(value)+'</text>';
 const contour=eventStickerFrame('','',{compact:true}).match(/class="emotion-sticker__paper" d="([^"]+)"/)[1];
 return '<svg viewBox="0 0 120 110" role="img" aria-label="'+escape([result.playerName,result.category,result.sourceCaption,result.caption].filter(Boolean).join(' · '))+'" xmlns="http://www.w3.org/2000/svg"><g transform="scale(.85714 1)"><path d="'+contour+'" transform="translate(2 3)" fill="#2a2c31" opacity=".22"/><path class="emotion-sticker__paper" d="'+contour+'" fill="#f8f5ee" stroke="#2a2c31" stroke-width="2.5"/></g>'+(offset?'<g transform="translate(0 7)">':'')+lines.map((l,i)=>text(l,18+i*12+(dense?6:0),10.5,'emotion-sticker__source')).join('')+'<svg data-result-viewport="true" x="23" y="'+((two?34:23)+(dense?6:0))+'" width="74" height="'+((two?37:48)-(dense?6:0))+'" style="width:74px;height:'+((two?37:48)-(dense?6:0))+'px" viewBox="'+bounds.join(' ')+'" preserveAspectRatio="xMidYMid meet"><image data-result-art="'+escape(result.art)+'" href="'+escape(result.src)+'" width="100" height="100"/></svg>'+detail.lines.slice(0,2).map((l,i)=>text(l,dense?(i?97:86):85+i*13,12.5,'emotion-sticker__result',result.tone==='bad'?'#a64435':'#3f5ba8')).join('')+(offset?'</g>':'')+'</svg>';
}

export function createCardResultSticker(item){
 const result=cardResultSticker(item);if(!result)return null;
 const el=document.createElement('div');el.className='head-scene head-scene--emotion card-result-sticker';el.dataset.format='result';el.dataset.art=result.art;el.dataset.phase='result';if(['liquidation-cascade','bear-market','rug-the-island'].includes(result.art))el.classList.add('card-result-sticker--area');el.innerHTML=cardResultStickerSvg(item);el.style.aspectRatio='120 / 110';
 return {el,result,setWide(){},update(age){el.hidden=age<0;return {visible:age>=0,after:true,intro:false,phase:'result'};}};
}
