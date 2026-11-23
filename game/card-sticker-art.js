// Generated square icons; shared by the game and the local motion review.
export const STICKER_IDS=Object.freeze(['bonk','hook','swap','pump','to-the-moon','pocket-rocket','gigachad','rug-pull','reverse','send-it','trade-offer','stonks','free-mint','wormhole','jackpot','not-stonks','mimic','paper-hands','rekt','bombardiro','airdrop','gamba','gamba-win','gamba-loss']);
export const STICKER_VERSIONS=Object.freeze({'send-it':2,jackpot:2});
const NUKE_FILES=['nuke-it','nuke-blast'].map(id=>`assets/card-stickers/${id}-v1.png`);
const BOARD_FILES=['market','setback'].map(id=>`assets/board-stickers/${id}-v1-192.webp`);
const PANDORA_BOX_FILE='assets/illustrations/pandora-box-sticker-v1-192.webp';
const NETWORK_FILE='assets/illustrations/network-down-sticker-v1-192.webp';
export const STICKER_FILES=Object.freeze([...STICKER_IDS.map(id=>`assets/card-stickers/${id}-v${STICKER_VERSIONS[id]||1}${id==='gamba'?'':'-192'}.png`),PANDORA_BOX_FILE,...NUKE_FILES,...BOARD_FILES,NETWORK_FILE]);
export const STICKER_ART=Object.freeze({'pandora-box':new URL('./../'+PANDORA_BOX_FILE,import.meta.url).href,...Object.fromEntries(STICKER_IDS.map((id,i)=>[id,new URL('./../'+STICKER_FILES[i],import.meta.url).href])),...Object.fromEntries(['nuke-it','nuke-blast'].map((id,i)=>[id,new URL('./../'+NUKE_FILES[i],import.meta.url).href])),...Object.fromEntries(['market','setback'].map((id,i)=>[id,new URL('./../'+BOARD_FILES[i],import.meta.url).href])), 'network-down':new URL('./../'+NETWORK_FILE,import.meta.url).href});
// Visible alpha bounds plus a safety inset, expressed in a 100-unit image.
// Only result layout uses these viewports; source images/action scale stay intact.
export const RESULT_ART_BOUNDS=Object.freeze({'pandora-box':[23,9,58,80],
 bonk:[18.23,22.92,69.27,52.08],hook:[18.23,25,71.88,52.08],swap:[22.4,28.65,56.77,46.35],pump:[27.6,23.44,48.44,56.77],
 'to-the-moon':[27.6,25.52,44.79,51.04],'pocket-rocket':[11.98,34.9,76.56,31.25],gigachad:[25,23.44,50,54.17],'rug-pull':[18.23,28.13,64.58,45.83],
 reverse:[24.48,20.83,52.08,61.46],'send-it':[27.6,21.35,44.27,57.81],'trade-offer':[27.08,25.52,45.83,51.56],stonks:[25,28.13,57.81,47.92],
 'free-mint':[25.52,23.96,53.13,53.13],wormhole:[22.4,21.88,58.33,57.81],jackpot:[22.92,22.4,54.69,59.38],'not-stonks':[22.92,31.77,57.29,44.79],
 mimic:[25.52,26.56,49.48,49.48],'paper-hands':[20.83,23.44,58.33,54.69],rekt:[22.92,25,56.25,54.17],bombardiro:[17.19,29.69,65.63,50.52],airdrop:[28.65,22.92,42.71,55.73],
 gamba:[16.99,1.99,73.76,86.52],'gamba-win':[1.04,16.67,98.44,67.19],'gamba-loss':[1.56,19.79,97.92,63.02],'nuke-it':[5.02,4.39,83.25,90.67],'nuke-blast':[6.3,12.76,81.98,73.92],
 market:[16.15,16.67,67.71,67.19],setback:[2.6,22.92,97.4,57.81],'network-down':[4,12,93,76]
});
/** Two committed cosmetic frames: rocket flight, then a small mushroom blast. */
export function stickerFrame(id,age,reduced=false,flightSeconds=.7,expressive=false){
 if(id!=='nuke-it')return {art:id,transform:expressive?expressiveStickerTransform(id,age,reduced):stickerTransform(id,age,reduced)};
 if(!reduced&&age<flightSeconds){const t=Math.max(0,age)/flightSeconds;return {art:'nuke-it',transform:`translate(${(-8+16*t).toFixed(2)}px,${(6-12*t).toFixed(2)}px) scale(${(.88+.12*t).toFixed(3)})`};}
 const t=Math.min(1,Math.max(0,(age-flightSeconds)/.35));
 return {art:'nuke-blast',transform:reduced?'none':`scale(${(1+.18*Math.sin(t*Math.PI)).toFixed(3)})`};
}
/** One small, distinct gesture per event. Always returns to its square at .55 s. */
export function expressiveStickerTransform(id,age,reduced=false){
 if(reduced||age<0||age>=.55)return 'none';
 const t=age/.55,w=Math.sin(t*Math.PI),snap=Math.sin(t*Math.PI*2)*(1-t),settle=1-.08*(1-t);
 let x=0,y=0,r=0,sx=settle,sy=settle;
 switch(id){
  case 'bonk':r=-18*snap;y=5*w;sy-=.12*w;sx+=.08*w;break;
  case 'hook':x=8*snap;r=-5*w;break;
  case 'swap':x=4*snap;r=9*snap;sx-=.18*w;break;
  case 'pump':y=-9*w;sy+=.1*w;break;
  case 'to-the-moon':x=5*w;y=-9*w;r=-8*w;break;
  case 'gigachad':sx+=.12*w;sy-=.05*w;r=4*snap;break;
  case 'rug-pull':x=-8*w;r=-5*snap;break;
  case 'reverse':sx=Math.max(.15,Math.abs(Math.cos(t*Math.PI)));r=5*snap;break;
  case 'gamba':r=5*Math.sin(t*Math.PI*6)*(1-t);y=-2*w;break;
  case 'trade-offer':x=5*snap;sy+=.04*w;break;
  case 'network-down':r=5*snap;x=2*snap;break;
  case 'stonks':y=-7*w;r=-4*w;break;
  case 'free-mint':y=5*snap;sy-=.07*w;break;
  case 'wormhole':r=28*w;sx-=.25*w;sy-=.12*w;break;
  case 'jackpot':y=-6*w;sx+=.13*w;sy+=.13*w;break;
  case 'not-stonks':y=7*w;r=9*w;break;
  case 'mimic':sy+=.14*snap;r=-7*snap;break;
  case 'paper-hands':x=7*w;y=-3*w;r=12*snap;break;
  case 'rekt':y=5*w;sx+=.14*w;sy-=.18*w;break;
  case 'bombardiro':x=7*w;y=2*snap;r=-4*w;break;
  case 'airdrop':y=6*w;r=6*snap;break;
  default:return stickerTransform(id,age,reduced);
 }
 return `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
}
// One small gesture, then still. Purely cosmetic: no random numbers or timers.
export function stickerTransform(id,age,reduced=false){
 if(reduced||age<0||age>=.55)return 'none';
 const t=Math.min(1,age/.55),wave=Math.sin(t*Math.PI)*(1-t),pop=1-.08*(1-t),tilt=['bonk','mimic','paper-hands','rekt'].includes(id)?-10: ['swap','wormhole','reverse'].includes(id)?8:3;
 const rise=['pump','to-the-moon','stonks','free-mint','jackpot'].includes(id)?-3:['airdrop','not-stonks','bombardiro'].includes(id)?3:0;
 return `translateY(${rise*wave}px) rotate(${tilt*wave}deg) scale(${pop})`;
}
