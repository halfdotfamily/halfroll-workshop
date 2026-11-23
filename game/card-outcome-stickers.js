import {CARD_TIMELINES as PANDORA16_TIMELINES} from './courier-rules/motion-v3.js';
import {CARD_TIMELINES as PANDORA15_TIMELINES} from './race-rules/motion-v3.js';
import * as THREE from 'three';
import {CARD_TIMELINES} from './card-library/motion-v2.js';
import {CARD_TIMELINES as CURRENT_TIMELINES} from './card-effects/motion-v3.js';
import {walkDurationMs} from './presentation-timing.js';
import {STICKER_ART,stickerFrame} from './card-sticker-art.js';
import {headStickerPlan} from './card-sticker-scenes.js';
import {cardResultSticker,createCardResultSticker,outcomeResultTiming} from './card-result-sticker.js';
import {boardOutcomeStickers} from './board-income-sticker.js';
import {placeHeadFeedback,RESULT_WIDTH,overlaps} from './head-feedback-layout.js';

const VERSIONS=['local-cards-v7','local-cards-v8','local-cards-v9','local-cards-v10','local-cards-v11','local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'];
const areaArt=new Set();
const signed=n=>(n>0?'+':'−')+Math.abs(n);
const coinText=n=>`${signed(n)} Coin${Math.abs(n)===1?'':'s'}`;
const events={'stonks':'STONKS!','free-mint':'FREE MINT','wormhole':'WORMHOLE','jackpot':'DIAMOND HAND','not-stonks':'NOT STONKS','mimic':'MIMIC!','paper-hands':'PAPER HANDS','rekt':'REKT!'};

/** Outcomes only: no random choice, hidden card identities, or match writes. */
export function cardOutcomeStickers(effect,tracks=[]){
 if(!effect||effect.pending)return [];
 const result=[],actor=effect.actorId,target=effect.targetId??actor,kind=effect.cardId||effect.kind;
 const delta=id=>{const t=tracks.find(t=>String(t.playerId)===String(id));return t?Number(t.to)-Number(t.landing??t.from):0;};
 const add=(id,icon,title,detail='',tone='good')=>{const art=icon==='shield'?'gigachad':icon==='reverse'?'reverse':STICKER_ART[effect.artId]?effect.artId:effect.eventId||(STICKER_ART[kind]?kind:kind==='draw'?'free-mint':null);if(id!==undefined&&id!==null)result.push({playerId:id,icon,title,detail,tone,...(art?{art}:{})});};
 const movement=(id,icon,title)=>{const n=delta(id);add(id,icon,title,n?signed(n):'',n<0?'bad':'good');};
 if(effect.blocked){add(target,'shield','BLOCKED','','good');return result;}
 if(effect.reflected)add(actor,'reverse','REVERSE!');
 if(['bombardiro','pandora-box'].includes(effect.eventId)){const box=effect.eventId==='pandora-box';for(const id of new Set((effect.targets||tracks).map(t=>t.playerId)))movement(id,box?'pandora':'bomb',box?'PANDORA BOX!':'BOOM!');return result;}
 if(effect.eventId){
  const detail=[delta(target)?signed(delta(target)):'',effect.coins?coinText(effect.coins):''].filter(Boolean).join(' · ');
  add(target,'pandora',events[effect.eventId]||'PANDORA',detail||(effect.eventId==='free-mint'?(effect.cardsDelta===0?'COINS FULL':'+CARD'):effect.eventId==='paper-hands'?(effect.cardsDelta===0?'No Coins':'−CARD'):['stonks','jackpot'].includes(effect.eventId)?'COINS FULL':'NO CHANGE'),effect.polarity==='bad'||['not-stonks','mimic','paper-hands','rekt'].includes(effect.eventId)?'bad':'good');return result;
 }
 switch(kind){
  case 'bonk':movement(target,'bonk','BONK!');break;
  case 'hook':movement(actor,'hook','ZIPPED!');break;
  case 'swap':movement(actor,'swap','SWAP!');movement(target,'swap','SWAP!');break;
  case 'pump':movement(actor,'pump','PUMP!');break;
  case 'to-the-moon':movement(actor,'moon','TO THE MOON');break;
  case 'pocket-rocket':movement(target,'moon',effect.artId==='nuke-it'?'NUKE IT!':'POCKET ROCKET');break;
  case 'gigachad':add(actor,'shield','SHIELDED');break;
  case 'bombardiro':movement(actor,'bomb','BOOST!');for(const hit of effect.targets||[]){if(hit.blocked)add(hit.playerId,'shield','BLOCKED');else movement(hit.playerId,'bomb','BOOM!');}break;
  case 'rug-pull':{const n=Math.max(0,-Number(effect.coins||0));add(target,'coins','RUGGED',n?coinText(-n):'No Coins','bad');add(actor,'coins',effect.reflected?'REVERSE!':'YOINK!',n?coinText(n):'');break;}
  case 'trade-offer':add(actor,'card',effect.reflected?'REVERSE!':'+CARD',effect.reflected?'+CARD':'');add(target,'card','−CARD',effect.coins>0?coinText(effect.coins):'','bad');break;
  case 'network-down':add(target,'bolt','NETWORK DOWN!','SKIP NEXT TURN','bad');break;
  case 'gamba':movement(actor,'slot',delta(actor)<0?'BAD ROLL':'GAMBA!');break;
  case 'send-it':movement(actor,'skate',delta(actor)<0?'OOPS!':'SENT IT!');break;
  case 'reverse':add(actor,'reverse','REVERSE!');break;
  case 'airdrop':add(target,'airdrop','AIRDROP',effect.coins?coinText(effect.coins):'COINS FULL');if(result.length)result.at(-1).sourceCaption='AIRDROP';break;
  case 'draw':add(target,'card',effect.cardsDelta===0?'FOUND IT!':'+CARD',effect.cardsDelta===0&&effect.coins===undefined?'DECK EMPTY':'');break;
  case 'well':if(effect.coins)add(target,'coins','WELL',coinText(effect.coins),effect.coins<0?'bad':'good');break;
 }
 return result;
}

const icons={
 bonk:'<path d="m12 21 10-10M12 7l6-5 9 9-6 5z"/>',
 hook:'<path d="m4 24 20-18-8 22zM9 20l9 2M13 15l7 2M19 10l3 2"/>',
 swap:'<path d="M5 10h22l-6-6M27 22H5l6 6"/>',
 pump:'<path d="m9 27 14-5-14-5 14-5-14-5M16 8V2m-4 4 4-4 4 4"/>',
 moon:'<path d="M12 23 8 18C11 8 18 5 25 4c-1 7-4 14-14 17zM9 23l-4 4m4-9H4l5-7m8 12v5l7-7"/><circle cx="19" cy="11" r="2"/>',
 shield:'<path d="m16 3 11 4-2 13-9 9-9-9L5 7zM9 14q7-9 14 0-7 9-14 0z"/><circle cx="16" cy="14" r="2"/>',
 bomb:'<circle cx="15" cy="19" r="9"/><path d="m20 11 3-4 4 1m-3-5v2m4-1-1 2M9 18l3-3"/>',
 coins:'<ellipse cx="16" cy="16" rx="11" ry="13"/><path d="M18 9h-4l-3 4 3 4h4l3 4-3 3h-4m2-18v20"/>',
 reverse:'<rect x="6" y="3" width="20" height="26" rx="3"/><path d="M10 12h11l-3-3m4 11H11l3 3"/>',
 card:'<rect x="7" y="4" width="18" height="24" rx="2"/><path d="m16 9 5 6-5 6-5-6z"/>',
 skate:'<path d="m4 18 3 3h18l3-3M13 6l6 4-5 7m-4-5 4-4"/><circle cx="10" cy="26" r="2"/><circle cx="23" cy="26" r="2"/>',
 bolt:'<path d="m19 3-13 16h9l-2 10 13-17h-9z"/>',
 pandora:'<path d="M4 15h24v13H4zM4 15V9q12-10 24 0v6M10 7v21m12-21v21"/><rect x="13" y="14" width="6" height="6"/>',
 airdrop:'<path d="M3 12a13 11 0 0 1 26 0zM4 12l9 12m15-12-9 12M16 2v21"/><rect x="11" y="23" width="10" height="7"/>',
};
const iconSvg=id=>`<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icons[id]||icons.card}</svg>`;

/** Small head-anchored result bubbles. Never intercept map gestures. */
const artCache=new Map();
function warmStickerArt(){
 for(const src of Object.values(STICKER_ART)){
  if(artCache.has(src))continue;
  const image=new Image();image.src=src;artCache.set(src,image);
  if(src===STICKER_ART.mimic)image.decode?.().catch(()=>{});
 }
}
export function mountCardOutcomeStickers(container,{reduced=false}={}){
 const layer=document.createElement('div');layer.className='card-outcome-layer';layer.setAttribute('aria-hidden','true');container.append(layer);
 warmStickerArt();
 let lastTurn,matchId=null,lastMotion=null,lastCue=null,lastSkipSerial=0,jobs=[],bounds=new WeakMap();
 const restoreNames=()=>{for(const el of container.querySelectorAll('.pawn-nameplate.has-outcome'))el.classList.remove('has-outcome');};
 function clear(){for(const j of jobs)j.el.remove();jobs=[];lastMotion=lastCue=null;restoreNames();}
 function addSkipFeedback(state,pawns,time){
  const latest=Number(state.networkDownSkipSerial)||0;
  if(state.snapMotion){lastSkipSerial=latest;return;}
  const skipped=(state.skippedTurns||[]).filter(item=>item.serial>lastSkipSerial);lastSkipSerial=Math.max(lastSkipSerial,latest);
  for(const {playerId}of skipped){
   if(!pawns.has(String(playerId)))continue;
   for(const old of jobs.filter(j=>String(j.playerId)===String(playerId)))old.el.remove();jobs=jobs.filter(j=>String(j.playerId)!==String(playerId));
   const item={playerId,icon:'bolt',title:'TURN SKIPPED',detail:'',art:'network-down',storyKind:'network-down',sourceCaption:'NETWORK DOWN!',tone:'bad',role:'result',playerName:pawns.get(String(playerId)).player?.name},scene=createCardResultSticker(item),el=document.createElement('div');
   el.className='card-outcome bad card-outcome--art card-outcome--story card-outcome--result';el.dataset.playerId=String(playerId);el.hidden=true;el.append(scene.el);
   const text=document.createElement('span'),title=document.createElement('b'),name=document.createElement('small');text.className='card-outcome__copy';name.className='card-outcome__name';text.append(name,title);el.append(text);layer.append(el);
   jobs.push({...item,el,scene,start:time,life:outcomeResultTiming(0).lifeMs/1000,readMs:0,gateMs:0,titleEl:title,nameEl:name,otherName:'Rival'});
  }
 }
 function sync(state,pawns,time){
  const fresh=matchId!==state.matchId;
  if(fresh){clear();matchId=state.matchId;lastSkipSerial=Number(state.networkDownSkipSerial)||0;}
  if(!VERSIONS.includes(state.rulesVersion)){clear();return;}
  if(!fresh && state.turnCount!==undefined && lastTurn!==state.turnCount){
   jobs=jobs.filter(job=>{
    if(!job.scene || job.wasVisible)return true;
    job.el.remove();return false;
   });
  }
  lastTurn=state.turnCount;
  if(!fresh)addSkipFeedback(state,pawns,time);
  if(fresh&&state.sharedExhibition&&!state.motion){lastCue=state.presentationCue?.serial??null;return;}
  const motion=state.motion,cue=state.presentationCue||state.cue;let effect,tracks=[],age=0,delay=0,fromMotion=false;
  if(motion?.serial!==undefined&&motion.serial!==lastMotion){fromMotion=true;lastMotion=motion.serial;effect=motion.effect;tracks=motion.tracks||[];age=Math.max(0,Number(state.motionAge)||0)/1000;if(effect?.serial!==undefined)lastCue=effect.serial;delay=Math.max(0,...tracks.filter(t=>t.from!==t.landing).map(t=>walkDurationMs(t)))/1000;}
  else if(cue?.serial!==undefined&&cue.serial!==lastCue){lastCue=cue.serial;effect=cue;age=Math.max(0,Number(state.cueAge)||0)/1000;}
  else return;
  if(state.snapMotion){lastCue=cue?.serial??lastCue;return;}if(!effect||effect.pending)return;
  const nuke=['local-cards-v8','local-cards-v9','local-cards-v10','local-cards-v11','local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'].includes(state.rulesVersion)&&effect.cardId==='pocket-rocket'&&!effect.blocked;
  if(nuke)effect={...effect,artId:'nuke-it'};
  const current=['local-cards-v8','local-cards-v9','local-cards-v10','local-cards-v11','local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'].includes(state.rulesVersion);
  const kind=effect.blocked?'gigachad':effect.reflected?'reverse':effect.eventId||effect.cardId||(current?effect.kind:undefined),timeline=state.rulesVersion==='local-cards-v16'?PANDORA16_TIMELINES[kind]:['local-cards-v15','local-cards-v16'].includes(state.rulesVersion)?PANDORA15_TIMELINES[kind]:(current?CURRENT_TIMELINES:CARD_TIMELINES)[kind];
  // A new resolved action replaces the previous result as one visual batch.
  // Its six Bombardiro recipients are then appended together below.
  // Finished receipts retain their reading window across the next action.
  const immediate=current&&!fromMotion&&['collect','shop-purchase'].includes(effect.kind);
  const landingFind=current&&fromMotion&&effect.kind==='draw'&&effect.cardsDelta>0&&!effect.cardId;
  const gateMs=effect.eventId&&Number.isFinite(timeline?.impactMs)?timeline.impactMs:immediate||landingFind?0:Math.max(120,((!current||fromMotion?motion?.durationMs:undefined)??timeline?.durationMs??1100)-delay*1000);
  if(!current)delay+=reduced?0:(nuke?timeline.releaseMs:timeline?.impactMs??timeline?.catchMs??(effect.eventId?450:180))/1000;
  const flightSeconds=nuke?(timeline.impactMs-timeline.releaseMs)/1000:.7;
  const timing=current?outcomeResultTiming({durationMs:delay*1000+gateMs},{reduced}):null;
  const multiTargetBlast=['pandora-box','bombardiro'].includes(effect.eventId) && (effect.targets||tracks).length>1;
  const life=current?timing.lifeMs/1000:reduced?1.7:2.1,start=time-age+(current?timing.startMs/1000:delay);if((current?time+1e-9:time)>=start+life)return;
  const outcomes=cardOutcomeStickers(effect,tracks);
  if(current)outcomes.push(...boardOutcomeStickers(effect,tracks));
  if(current&&(effect.cardId||effect.kind)==='draw'&&effect.cardsDelta===0&&effect.coins!==undefined)for(const item of outcomes){item.title='FOUND IT!';item.detail=effect.coins?coinText(effect.coins):'COINS FULL';item.art=effect.coins<0?'not-stonks':'stonks';}
  // The planner only deduplicates public outcomes and prioritizes shield/reflection.
  // Current results never instantiate or replay an action scene.
  const items=current?headStickerPlan(effect,tracks,outcomes).filter(item=>cardResultSticker(item)):outcomes;
  for(const item of items){
   if(!pawns.has(String(item.playerId)))continue;
   if(!current){for(const old of jobs.filter(j=>String(j.playerId)===String(item.playerId)))old.el.remove();jobs=jobs.filter(j=>String(j.playerId)!==String(item.playerId));}
   const el=document.createElement('div');el.className='card-outcome '+item.tone;el.dataset.playerId=String(item.playerId);
   let scene=null;
   const pawn=pawns.get(String(item.playerId)),other=pawns.get(String(item.otherId)),otherName=String(other?.player?.name||'Rival').slice(0,24);
   if(current){el.classList.add('card-outcome--art','card-outcome--story','card-outcome--result');scene=createCardResultSticker({...item,playerName:pawn.player?.name});el.append(scene.el);el.hidden=true;}
   else if(item.art){el.classList.add('card-outcome--art');el.dataset.art=item.art;const img=new Image();img.src=STICKER_ART[item.art];img.alt='';img.draggable=false;el.append(img);}else el.innerHTML=iconSvg(item.icon);
   const text=document.createElement('span'),title=document.createElement('b'),name=document.createElement('small');text.className='card-outcome__copy';title.textContent=[item.title,item.detail].filter(Boolean).join(' ');name.textContent=String(pawn.player?.name||'Racer').slice(0,24);name.className='card-outcome__name';text.append(name,title);el.append(text);layer.append(el);jobs.push({...item,el,start,life,maxWait:multiTargetBlast?life*Math.min(6,(effect.targets||tracks).length)+.5:life,readMs:0,flightSeconds,expressive:current,scene,gateMs,titleEl:title,nameEl:name,otherName});
  }
 }
 function updateLegacy(time,camera,viewport,pawns,labelBoxes=[]){
  restoreNames();for(const j of jobs)if(j.scene)delete j.scene.el.dataset.volume;if(!jobs.length)return;
  const parent=container.getBoundingClientRect(),placed=[],obstacles=[...document.querySelectorAll('body>header,#race-hud,#camera-controls,#atmosphere-hud,.stage-caption,.study-tools,.study-feedback')].filter(el=>el.closest?.('details')?.open!==false&&!el.hidden&&getComputedStyle(el).display!=='none').map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height).map(r=>({x:r.left-parent.left,y:r.top-parent.top,width:r.width,height:r.height}));
  const overlaps=(a,b)=>a.x<b.x+b.width+4&&a.x+a.width>b.x-4&&a.y<b.y+b.height+4&&a.y+a.height>b.y-4;
  const pending=[];
  for(let i=jobs.length-1;i>=0;i--){const j=jobs[i],age=time-j.start,pawn=pawns.get(String(j.playerId));if((j.scene?time+1e-9>=j.start+j.life:age>j.life)||!pawn){j.el.remove();jobs.splice(i,1);continue;}j.el.hidden=age<0;if(age<0)continue;
   let head=bounds.get(pawn.body);if(head===undefined){pawn.body.updateWorldMatrix(true,true);const inv=pawn.body.matrixWorld.clone().invert(),box=new THREE.Box3(),matrix=new THREE.Matrix4();pawn.body.traverseVisible(n=>{if(!n.isMesh||!n.geometry)return;n.geometry.computeBoundingBox();matrix.multiplyMatrices(inv,n.matrixWorld);box.union(n.geometry.boundingBox.clone().applyMatrix4(matrix));});head=Number.isFinite(box.max.y)?box.max.y:2;bounds.set(pawn.body,head);}
   const p=pawn.body.localToWorld(new THREE.Vector3(0,head+.12,0)).project(camera),x=(p.x+1)*viewport.width/2,y=(1-p.y)*viewport.height/2;
   let anchorY=y;
   j.el.dataset.headY=String(y);
   if(j.scene){
    const pose=j.scene.update(age,{reduced});j.el.dataset.phase=pose.phase;j.el.dataset.resultVisible='true';
    j.titleEl.textContent=[j.scene.result.sourceCaption,j.scene.result.caption].filter(Boolean).join(' · ');j.nameEl.textContent=String(pawn.player?.name||'Racer').slice(0,24);
    j.el.classList.toggle('card-outcome--crowd',jobs.length>3);j.scene.el.style.width=j.scene.el.style.height='';j.scene.el.style.removeProperty('--head-unit');
    const localLabels=areaArt.has(j.scene.result.art)?labelBoxes.filter(b=>String(b.key)===String(j.playerId)):labelBoxes;
    const ratio=110/140,base=j.scene.el.offsetWidth,nearby=localLabels.filter(b=>!b.hidden&&b.box&&Math.abs(b.box.x+b.box.width/2-x)<(base+b.box.width)/2+12);anchorY=Math.min(y,...nearby.map(b=>b.box.y-5));
    const size=Math.min(base,Math.max(56,Math.floor((anchorY-16)/ratio)));j.scene.el.style.width=size+'px';j.scene.el.style.height=size*ratio+'px';j.scene.el.style.setProperty('--head-unit',size/100+'px');
    if(!pose.visible){j.el.hidden=true;continue;}
   }
   const w=j.el.offsetWidth||90,h=j.el.offsetHeight||40;
   j.el.hidden=true;if(p.z>=-1&&p.z<=1&&x>=0&&x<=viewport.width&&y>=0&&y<=viewport.height)pending.push({j,age,x,y:anchorY,headY:y,w,h});
  }
  const replacing=new Set(pending.filter(({j})=>!j.scene).map(({j})=>String(j.playerId)));
  const blockers=[...obstacles,...labelBoxes.filter(b=>!b.hidden&&!replacing.has(String(b.key))).map(b=>b.box).filter(Boolean),...(pending.some(p=>p.j.scene)?labelBoxes.map(b=>b.bodyBox).filter(Boolean):[])];
  const clustered=new Map();
  if(pending.length>1&&pending.every(p=>p.j.scene)){
   const maxW=Math.max(...pending.map(p=>p.w)),maxH=Math.max(...pending.map(p=>p.h)),cols=Math.min(3,pending.length,Math.max(1,Math.floor((viewport.width-10)/(maxW+5)))),rows=Math.ceil(pending.length/cols),gridW=cols*(maxW+5)-5;
   const left=Math.max(5,Math.min(viewport.width-gridW-5,pending.reduce((n,p)=>n+p.x,0)/pending.length-gridW/2)),top=Math.min(...pending.map(p=>p.y))-10-rows*(maxH+5)+5;
   const boxes=pending.slice().sort((a,b)=>a.x-b.x).map((p,i)=>({j:p.j,x:left+(i%cols)*(maxW+5),y:top+Math.floor(i/cols)*(maxH+5),width:p.w,height:p.h}));
   const nearby=Math.max(...pending.map(p=>p.x))-Math.min(...pending.map(p=>p.x))<gridW;
   if(nearby&&top>=5&&boxes.every(b=>!blockers.some(o=>overlaps(b,o))))for(const b of boxes)clustered.set(b.j,b);
  }
  // Pack the highest heads first, so lower results cannot steal their only
  // available space. Current stories stay above heads; legacy bubbles can use
  // a lower slot beside the head when the camera HUD covers the upper slots.
  for(const {j,age,x,y,headY,w,h}of pending.sort((a,b)=>a.y-b.y||a.x-b.x)){
   const candidates=[];
   const anchorOffset=j.scene?(j.scene.el.offsetWidth||64)/2:w/2;
   for(let row=0;row<5;row++)for(const dx of [0,-w*.65,w*.65,-w*1.25,w*1.25])for(const below of (j.scene?[false]:[false,true])){
    const candidateX=Math.max(5,Math.min(viewport.width-w-5,x-anchorOffset+dx));
    // A tall neighbour only lowers the shelf when this actual candidate is
    // above its name. Otherwise it can needlessly hide a clear side slot.
    const shelfLabels=areaArt.has(j.scene?.result.art)?labelBoxes.filter(b=>String(b.key)===String(j.playerId)):labelBoxes;
    const shelf=j.scene?Math.min(headY,...shelfLabels.filter(b=>!b.hidden&&b.box&&candidateX<b.box.x+b.box.width+4&&candidateX+w>b.box.x-4).map(b=>b.box.y-5)):y;
    const candidate={x:candidateX,y:below?y+12+row*(h+5):shelf-h-(j.scene?10:24)-row*(h+5),width:w,height:h};
    candidate.score=Math.abs(candidate.x+anchorOffset-x)+Math.abs(candidate.y+h-y)+(below?45:0);
    if(candidate.y>=5&&candidate.y+h<=viewport.height-5&&![...blockers,...placed].some(b=>overlaps(candidate,b)))candidates.push(candidate);
   }
   const box=clustered.get(j)||candidates.sort((a,b)=>a.score-b.score)[0];j.el.hidden=!box;if(!box)continue;placed.push(box);j.el.style.left=box.x+'px';j.el.style.top=box.y+'px';j.el.style.opacity=String(j.scene&&reduced?1:Math.min(1,age*10,(j.life-age)*5));const pop=reduced?1:age<.15?.84+Math.sin(age/.15*Math.PI/2)*.16:1;j.el.style.transform=`scale(${pop})`;
   if(j.art&&!j.scene){const frame=stickerFrame(j.art,age,reduced,j.flightSeconds,j.expressive),img=j.el.querySelector('img');if(j.el.dataset.frame!==frame.art){img.src=STICKER_ART[frame.art];j.el.dataset.frame=frame.art;}img.style.transform=frame.transform;}
   for(const name of container.querySelectorAll('.pawn-nameplate'))if(!j.scene&&name.dataset.playerId===String(j.playerId))name.classList.add('has-outcome');
  }
 }
 function updateResults(time,camera,viewport,pawns,labelBoxes){
  restoreNames();const parent=container.getBoundingClientRect(),placed=[],capacity=6;
  const obstacles=[...document.querySelectorAll('body>header,#race-hud,#race-hud .rh-feedback,.world-dice-prompt,#map-view-panel,#tile-key-panel,#atmosphere-hud,#tile-key-controls,.stage-caption,.study-tools')].filter(el=>el.closest?.('details')?.open!==false&&!el.hidden&&getComputedStyle(el).display!=='none').map(el=>el.getBoundingClientRect()).filter(b=>b.width&&b.height).map(b=>({x:b.left-parent.left,y:b.top-parent.top,width:b.width,height:b.height}));
  const blockers=[...obstacles,...labelBoxes.flatMap(b=>b.emote?[b.box]:[b.bodyBox]).filter(Boolean)];
  for(const j of [...jobs].sort((a,b)=>b.start-a.start)){
   const pawn=pawns.get(String(j.playerId)),delta=Math.min(.25,Math.max(0,time-(j.lastUpdate??time)));j.lastUpdate=time;
   if(j.wasVisible)j.readMs+=delta*1000;
   j.wasVisible=false;j.el.hidden=true;
   if(!pawn||j.readMs>=j.life*1000||time-j.start>(j.maxWait??j.life)){j.el.remove();jobs.splice(jobs.indexOf(j),1);continue;}
   if(time<j.start||placed.length>=capacity)continue;
   let head=bounds.get(pawn.body);if(head===undefined){pawn.body.updateWorldMatrix(true,true);const inv=pawn.body.matrixWorld.clone().invert(),box=new THREE.Box3(),matrix=new THREE.Matrix4();pawn.body.traverseVisible(n=>{if(!n.isMesh||!n.geometry)return;n.geometry.computeBoundingBox();matrix.multiplyMatrices(inv,n.matrixWorld);box.union(n.geometry.boundingBox.clone().applyMatrix4(matrix));});head=Number.isFinite(box.max.y)?box.max.y:2;bounds.set(pawn.body,head);}
   const point=pawn.body.localToWorld(new THREE.Vector3(0,head+.12,0)).project(camera),x=(point.x+1)*viewport.width/2,y=(1-point.y)*viewport.height/2;
   j.anchor={x,y,z:point.z};
   if(point.z< -1||point.z>1||x<0||x>viewport.width||y<0||y>viewport.height)continue;
   const w=viewport.width<=600?92:RESULT_WIDTH,h=w*110/120;
   j.scene.el.style.width=w+'px';j.scene.el.style.height='auto';j.el.style.maxWidth=w+'px';j.el.dataset.headY=String(y);j.el.classList.toggle('card-outcome--crowd',false);
   const own=labelBoxes.find(b=>String(b.key)===String(j.playerId)&&b.bodyBox),headY=own?Math.min(y,own.bodyBox.y):y;
   const box=placeHeadFeedback({x,y:headY,width:w,height:h,viewport,obstacles:blockers,placed,nearOnly:true});
   if(!box)continue;
   const age=j.readMs/1000;j.scene.update(age,{reduced});j.el.dataset.phase='result';j.el.dataset.resultVisible='true';j.el.hidden=false;j.wasVisible=true;placed.push(box);
   for(const label of labelBoxes){if(String(label.key)===String(j.playerId)||label.box&&overlaps(box,label.box,0)){for(const name of container.querySelectorAll('.pawn-nameplate'))if(name.dataset.playerId===String(label.key))name.classList.add('has-outcome');}}
   j.el.style.left=box.x+'px';j.el.style.top=box.y+'px';j.el.style.opacity=String(reduced?1:Math.min(1,age*10+.15,(j.life-age)*5));j.el.style.transform=`scale(${reduced?1:Math.min(1,.94+age*.5)})`;
  }
 }
 function update(time,camera,viewport,pawns,labelBoxes=[]){if(!jobs.length)return;if(jobs.some(j=>j.scene))updateResults(time,camera,viewport,pawns,labelBoxes);else updateLegacy(time,camera,viewport,pawns,labelBoxes);}
 // Result frames are DOM-only and must never receive projected action geometry.
 function layout(){return [];}
 return{sync,update,clear,layout,debug:()=>jobs.map(({playerId,icon,title,detail,el,start,life,role,scene,readMs,anchor})=>({playerId,icon,title,detail,role,art:scene?.result.art,sourceCaption:scene?.result.sourceCaption,category:scene?.result.category,caption:scene?.result.caption,phase:el.dataset.phase,volume:scene?.el.dataset.volume==='true',visible:!el.hidden,start,life,readMs,anchor,queued:!!scene&&el.hidden})),destroy(){clear();layer.remove();bounds=new WeakMap();}};
}
