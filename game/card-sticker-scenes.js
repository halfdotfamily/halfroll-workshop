import {emotionStickerArt,emotionStickerMotion,emotionStickerCaption} from './emotion-sticker-art.js';
import {CARD_TIMELINES} from './card-effects/motion-v3.js';
import {setStickerCaption} from './event-sticker-art.js';

const clamp=n=>Math.max(0,Math.min(1,n));
const span=(n,a,b)=>clamp((n-a)/Math.max(1,b-a));
const pulse=n=>Math.sin(clamp(n)*Math.PI);
const names={bonk:'BONK!',hook:'UNI HOOK',swap:'SWAP!',pump:'PUMP!','to-the-moon':'TO THE MOON!','pocket-rocket':'NUKE IT!',gigachad:'PEEK SHIELD','rug-pull':'RUG PULL!',reverse:'REVERSE!',gamba:'GAMBA!','trade-offer':'TRADE OFFER',bombardiro:'BOMBARDIRO!'};
const signed=n=>(n>0?'+':'−')+Math.abs(n);
/** Per-racer story roles. Public names, count deltas and selected endpoints only. */
export function headStickerPlan(effect,tracks,results){
 const kind=effect.blocked?'gigachad':effect.reflected?'reverse':effect.eventId||effect.cardId||effect.kind;
 const byPlayer=new Map();
 for(const item of results){const own=String(item.playerId)===String(effect.actorId);byPlayer.set(String(item.playerId),{...item,storyKind:effect.reflected&&own?'reverse':effect.blocked?'gigachad':effect.eventId||effect.cardId||effect.kind,role:'result',otherId:own?effect.targetId:effect.actorId});}
 if(kind==='well'&&!byPlayer.size)byPlayer.set(String(effect.targetId??effect.actorId),{playerId:effect.targetId??effect.actorId,storyKind:'well',role:'result',icon:'coins',title:'WELL',detail:'No change',tone:'good'});
 if(effect.reflected){const key=String(effect.actorId),existing=byPlayer.get(key)||{playerId:effect.actorId};byPlayer.set(key,{...existing,art:'reverse',storyKind:'reverse',title:'REVERSE!',role:'result',otherId:effect.targetId});}
 if(effect.cardId==='pocket-rocket'){
  const targetTrack=tracks.find(t=>String(t.playerId)===String(effect.targetId)),delta=targetTrack?targetTrack.to-(targetTrack.landing??targetTrack.from):0;
  if(String(effect.actorId)!==String(effect.targetId))byPlayer.set(String(effect.actorId),{playerId:effect.actorId,storyKind:effect.blocked?'gigachad':'pocket-rocket',art:effect.blocked?'gigachad':'nuke-it',role:'source',otherId:effect.targetId,title:effect.blocked?'BLOCKED':'NUKE IT!',detail:delta?signed(delta):'',tone:effect.blocked?'bad':'good'});
  const target=byPlayer.get(String(effect.targetId));if(target&&!effect.blocked)Object.assign(target,{art:'nuke-it',role:'target',storyKind:'pocket-rocket'});
 }
 return [...byPlayer.values()].map(item=>({...item,timelineKind:kind,pandora:!!effect.eventId,pandoraOpener:String(item.playerId)===String(effect.actorId),amount:effect.amount,coins:effect.coins,cardsDelta:effect.cardsDelta}));
}

/** Pure phase sampler, shared by every replay, seek and reduced-motion frame. */
export function headStickerPose(item,age,{durationMs,reduced=false}={}){
 const t=CARD_TIMELINES[item.timelineKind]||CARD_TIMELINES[item.storyKind]||CARD_TIMELINES.draw,kind=item.storyKind;
 const ms=reduced?t.durationMs:Math.max(0,age*1000)*t.durationMs/(durationMs||t.durationMs),hit=t.impactMs??t.catchMs,after=reduced||ms>=hit;
 const p=span(ms,hit,t.arriveMs),a=span(ms,t.releaseMs,hit),tail=span(ms,t.arriveMs,t.durationMs),w=pulse(p);
 const base={x:0,y:0,r:0,sx:1,sy:1,opacity:1},main={...base},rider={...base},extra={...base,opacity:0},accent={...base,opacity:0};
 const intro=item.pandora&&item.pandoraOpener&&!reduced&&ms<(kind==='bombardiro'?t.releaseMs:hit),resourceCoins=(kind==='free-mint'||kind==='paper-hands')&&item.cardsDelta===0;
 const out={main,rider,extra,accent,intro,resourceCoins,after,phase:intro?'closed':after?'result':'action',mainArt:item.art||kind,riderVisible:false,extraKind:null,reels:[0,0,0],win:Number(item.amount)>0,visible:true};
 if(item.role==='target'&&kind==='pocket-rocket')out.visible=reduced||ms>=t.releaseMs;
 if(item.pandora&&!item.pandoraOpener)out.visible=reduced||ms>=hit;
 if(reduced){if(kind==='pocket-rocket')out.mainArt='nuke-blast';out.riderVisible=kind==='to-the-moon';if(out.riderVisible){rider.x=8;rider.y=-20;}return out;}
 switch(kind){
  case 'bonk':main.r=-38+65*a-18*p;main.x=-9+14*a;main.y=-12+20*a;out.riderVisible=true;rider.x=20;rider.y=24;rider.sx=1+.18*w;rider.sy=1-.18*w;accent.opacity=after?1-tail:0;break;
  case 'hook':main.x=-8+6*a;main.r=-5*pulse(a);out.riderVisible=true;rider.x=25-18*p;rider.y=12;rider.r=12*w;extra.opacity=ms>=t.catchMs?1-tail:0;out.extraKind='tether';break;
  case 'swap':out.riderVisible=true;main.opacity=0;rider.x=-24+48*(after?1:0);rider.y=13;rider.sx=rider.sy=after?.25+.75*p:1-.75*a;extra.x=24-48*(after?1:0);extra.y=13;extra.opacity=1;extra.sx=extra.sy=rider.sx;out.extraKind='other';accent.opacity=1-tail;break;
  case 'pump':main.y=9-13*a-7*w;main.sy=.3+.7*Math.max(a,p);accent.opacity=after?1-tail:0;break;
  case 'to-the-moon':main.x=after?12*p:0;main.y=after?-12*p:4*pulse(a);main.r=-8*w;out.riderVisible=true;rider.x=main.x+8;rider.y=main.y-20;rider.r=main.r;accent.opacity=after?1-tail:0;break;
  case 'pocket-rocket':
   if(item.role==='source'){main.x=-13+24*a;main.y=12-24*a;main.r=-5;main.opacity=after?.5:1;out.riderVisible=true;rider.x=24;rider.y=20;}
   else{out.mainArt=after?'nuke-blast':'nuke-it';main.x=after?0:-18+20*a;main.y=after?0:-12+10*a;main.sx=main.sy=after?1+.14*w:.8;out.riderVisible=true;rider.x=15;rider.y=26;rider.r=after?12*w:0;accent.opacity=after?1-tail:0;}break;
  case 'gigachad':main.sx=1+.12*Math.sin(a*Math.PI);main.r=5*w;accent.opacity=after?1-tail:0;break;
  case 'rug-pull':main.x=-15*p;main.r=-12*w;extra.x=28-45*p;extra.y=14-17*w;extra.opacity=after&&item.coins?1-tail:0;out.extraKind='coin';break;
  case 'reverse':main.sx=ms<hit?Math.max(.2,Math.abs(Math.cos(a*Math.PI))):1;main.r=-8*pulse(a);accent.opacity=after?1-tail:0;accent.r=18*p;break;
  case 'gamba':main.r=after?item.amount<0?-5:0:Math.sin(ms*.04)*2;out.reels=[0,1,2].map(i=>ms<hit-240+i*120?Math.sin(ms*(.035+i*.004))*9:0);accent.opacity=after&&item.amount>0?1-tail:0;break;
  case 'trade-offer':main.y=-3*w;extra.x=-26+52*p;extra.y=16-12*w;extra.opacity=after?1-tail:0;out.extraKind='card';accent.opacity=tail>0?1-tail:0;break;
  case 'stonks':case 'jackpot':main.y=-8*w;main.sx=main.sy=1+.08*w;extra.x=23;extra.y=25-14*p;extra.opacity=after&&item.coins>0?1-tail:0;out.extraKind='coin';break;
  case 'free-mint':main.y=-8*w;extra.x=-18+36*p;extra.y=20-18*w;extra.opacity=after&&(!resourceCoins||item.coins)?1-tail:0;out.extraKind=resourceCoins?'coin':'card';break;
  case 'wormhole':main.r=20*p;main.sx=1-.1*w;out.riderVisible=true;rider.x=-23+46*p;rider.y=10;rider.sx=rider.sy=Math.max(.15,Math.abs(p-.5)*2);break;
  case 'not-stonks':main.y=9*p;main.r=12*w;break;
  case 'mimic':main.sy=1+.12*Math.sin(p*Math.PI*3)*(1-p);main.y=-5*w;accent.opacity=after?1-tail:0;break;
  case 'paper-hands':main.x=14*p;main.y=-7*p;main.r=15*w;main.opacity=1-tail*.65;break;
  case 'rekt':main.sy=1-.18*w;main.sx=1+.14*w;main.y=7*w;accent.opacity=after?1-tail:0;break;
  case 'bombardiro':{const flight=span(ms,t.releaseMs,t.durationMs),fall=span(ms,t.dropMs,t.impactMs);main.x=-12+24*flight;main.y=-18;main.r=-3;main.opacity=item.pandoraOpener&&ms>=t.releaseMs?1:0;extra.y=-12+50*fall;extra.opacity=item.pandoraOpener&&ms>=t.dropMs&&ms<hit?1:0;out.extraKind='bomb';accent.opacity=ms>=hit?1-tail:0;accent.sx=accent.sy=.8+w*.35;break;}
  case 'airdrop':main.y=-8+15*a;main.r=5*pulse(a);extra.opacity=after&&item.coins>0?1-tail:0;extra.y=24-14*p;out.extraKind='coin';break;
  case 'well':main.y=(item.coins<0?7:-7)*w;main.r=(item.coins<0?12:-12)*w;accent.opacity=after&&item.coins>0?1-tail:0;break;
  default:main.y=-5*w;
 }
 return out;
}

/** One illustrated emotion frame, sharing the exact existing on-map shell. */
export function createHeadStickerScene(item,{characterId=6,otherCharacterId=0}={}){
 const el=document.createElement('div');el.className='head-scene head-scene--emotion';el.dataset.kind=item.storyKind;el.dataset.role=item.role;el.dataset.format='emotion';el.innerHTML=emotionStickerArt(item,characterId,otherCharacterId);
 const layers=Object.fromEntries(['hero','secondary','prop','extra','accent','intro'].map(id=>[id,el.querySelector(`[data-layer="${id}"]`)])),reels=[...el.querySelectorAll('[data-reel]')],result=el.querySelector('.emotion-sticker__result');let pose=null;
 function setCaption(text){if(!pose)return;const caption=emotionStickerCaption(item,pose,text);setStickerCaption(result,caption);result.setAttribute('fill',pose.after&&item.tone==='bad'?'#a64435':'#3f5ba8');el.firstElementChild.setAttribute('aria-label',text);}
 function update(age,options){
  pose=headStickerPose(item,age,options);const frame=emotionStickerMotion(item,age,pose,options);el.hidden=!pose.visible;
  for(const [key,node]of Object.entries(layers)){const v=frame[key];node.style.display=v.visible?'':'none';node.style.visibility='';node.setAttribute('transform',`translate(${v.x} ${v.y}) translate(70 48) rotate(${v.r}) scale(${v.sx} ${v.sy}) translate(-70 -48)`);}
  for(const node of el.querySelectorAll('[data-bomb-drop]'))node.style.display=pose.after?'none':'';for(const node of el.querySelectorAll('[data-bomb-blast]'))node.style.display=pose.after?'':'none';
  for(let i=0;i<reels.length;i++)reels[i].setAttribute('transform',`translate(0 ${frame.reels[i]})`);
  el.dataset.phase=pose.phase;el.dataset.art=pose.mainArt;setCaption(item.title||'');return pose;
 }
 return{el,update,setCaption};
}
export const headStickerTitle=(kind,fallback)=>names[kind]||fallback;
