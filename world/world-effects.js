import * as THREE from 'three';
import {boardOutcomeStickers} from '../game/board-income-sticker.js';
import {STICKER_ART} from '../game/card-sticker-art.js';
import {eventStickerArt} from '../game/event-sticker-art.js';
import {walkDurationMs,sampleCellWalk,sampleSpringStep,sampleSixSeven,SIX_SEVEN_MS} from '../game/presentation-timing.js';
import {sampleSixSevenImpact,sampleSixSevenTransfer,sixSevenHandStrike,SIX_SEVEN_FINAL_POP_HEIGHT} from '../game/owner-presentation-motion.js';
import {EMOTE_IDS} from '../game/emote-catalog.js';
import {buildEmoteMotion} from './world-emote-motion.js';

const C={ink:'#2a2c31',paper:'#f8f5ee',cobalt:'#3f5ba8',mint:'#a9d7be',sun:'#eedb94',coral:'#e9a08c'};
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export const EMOTES=EMOTE_IDS;
// Keep every part of the palm/fingers outside the body's outward support plane.
// This moves only the disposable hand; the character and match are untouched.
export function keepSixSevenPalmOutside(hand,body,direction){
 const normal=direction.clone();normal.y=0;if(normal.lengthSq()<1e-10)return;normal.normalize();body.updateWorldMatrix(true,true);hand.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3();for(const name of ['Critter body','Headwear']){const part=body.getObjectByName(name);if(part)bounds.union(new THREE.Box3().setFromObject(part));}if(bounds.isEmpty())bounds.setFromObject(body);
 const palm=new THREE.Box3().setFromObject(hand),support=(b,maximum)=>['x','y','z'].reduce((n,k)=>n+normal[k]*b[(normal[k]>=0)===maximum?'max':'min'][k],0),plane=support(bounds,true),front=support(palm,false),shift=Math.max(0,plane+.025-front);
 if(shift){const position=hand.getWorldPosition(new THREE.Vector3()).addScaledVector(normal,shift);hand.position.copy(hand.parent?hand.parent.worldToLocal(position):position);hand.updateWorldMatrix(true,true);}
 hand.userData.sixSevenContact={clearance:front+shift-plane,shift};return hand.userData.sixSevenContact;
}
/** Presentation only. Every destination and played item comes from the engine. */
export function buildWorldEffects(scene,container,{routePoint,reduced=false,compact=false,onCue=()=>{},camera:sceneCamera=null}){
 const root=new THREE.Group();root.name='Played pocket items';scene.add(root);
 const jobs=new Map(),shields=new Map(),seen=new Set(),stickers=[],materials=new Map(),shieldBounds=new WeakMap();let identity='',lastMotion='',now=0;
 const emoteFX=buildEmoteMotion(root,{reduced,onCue,routePoint});
 const layer=document.createElement('div');layer.className='world-stickers';layer.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden';container.append(layer);
 const mat=(name,extra={})=>{const key=name+JSON.stringify(extra);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:C[name]||name,roughness:.8,...extra}));return materials.get(key);};
 function mesh(g,geo,color,p=[0,0,0],s=[1,1,1]){const o=new THREE.Mesh(geo,mat(color));o.position.fromArray(p);o.scale.fromArray(s);o.castShadow=true;g.add(o);return o;}
 function sticker(kind,playerId,start=now,life=1.4,label){const el=document.createElement('span');el.className='world-sticker';const characterId=jobs.get(String(playerId))?.characterId??6;el.innerHTML=eventStickerArt(kind,characterId,label);layer.append(el);stickers.push({el,playerId,start,life,label:label||kind});if(stickers.length>4)stickers.shift().el.remove();}
 function coil(g,x){const pts=Array.from({length:81},(_,i)=>{const t=i/80;return new THREE.Vector3(x+Math.cos(t*Math.PI*12)*.16,t*.65,Math.sin(t*Math.PI*12)*.16);});mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),80,.035,5,false),'ink');mesh(g,new THREE.CylinderGeometry(.24,.26,.08,14),'cobalt',[x,0,0]);}
 function props(kind){const g=new THREE.Group();g.userData.kind=kind;root.add(g);
  if(kind==='spring-step'){coil(g,-.25);coil(g,.25);}
  else if(kind==='catch-up-kite'){
   const kite=mesh(g,new THREE.PlaneGeometry(1.1,1.1),'cobalt',[0,3.4,1]);kite.rotation.z=Math.PI/4;kite.material=mat('cobalt',{side:THREE.DoubleSide});
   const rope=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.8,0),new THREE.Vector3(.25,1.9,.4),new THREE.Vector3(0,3.4,1)]);mesh(g,new THREE.TubeGeometry(rope,16,.02,4,false),'ink');
   for(let i=0;i<3;i++){const tail=mesh(g,new THREE.PlaneGeometry(.25,.12),'sun',[0,2.5-i*.22,1]);tail.rotation.z=i%2?.4:-.4;}
  }else if(['magic-carpet','paper-glider','rug-tug'].includes(kind)){
   mesh(g,new THREE.BoxGeometry(1.8,.08,2.2),'cobalt',[0,0,0]);mesh(g,new THREE.BoxGeometry(1.52,.02,1.88),'mint',[0,.06,0]);
   for(const z of [-1.05,1.05])for(let i=0;i<7;i++)mesh(g,new THREE.CylinderGeometry(.018,.018,.32,4),'sun',[-.7+i*.23,.01,z+(z>0?.14:-.14)]).rotation.x=Math.PI/2;
   const diamond=new THREE.Mesh(new THREE.PlaneGeometry(.65,.65),mat('sun',{side:THREE.DoubleSide}));diamond.rotation.set(-Math.PI/2,0,Math.PI/4);diamond.position.y=.08;g.add(diamond);
   if(kind==='paper-glider'){g.scale.x=.8;const wing=mesh(g,new THREE.ConeGeometry(1.35,2.2,3),'paper',[0,.12,0]);wing.rotation.x=Math.PI/2;wing.scale.z=.12;}
  }else if(kind==='pocket-rocket'){
   mesh(g,new THREE.CylinderGeometry(.24,.3,1.1,12),'coral');mesh(g,new THREE.ConeGeometry(.25,.48,12),'cobalt',[0,.79,0]);
   for(let i=0;i<3;i++){const a=i*Math.PI*2/3,f=mesh(g,new THREE.BoxGeometry(.1,.5,.48),'cobalt',[Math.cos(a)*.3,-.42,Math.sin(a)*.3]);f.rotation.y=-a;}
   const flame=mesh(g,new THREE.ConeGeometry(.18,.7,8),'sun',[0,-.83,0]);flame.rotation.x=Math.PI;flame.name='Rocket flame';
   for(let i=0;i<5;i++){const puff=mesh(g,new THREE.IcosahedronGeometry(.16,1),'paper',[0,-1-i*.2,0]);puff.name='Rocket smoke';puff.userData.seed=i;}
   g.rotation.z=-Math.PI/2;
  }else if(kind==='six-seven'){
   for(const side of [-1,1]){const hand=new THREE.Group();hand.name=side>0?'Six seven striking hand':'Six seven supporting hand';hand.position.set(side*1.45,.5,0);hand.rotation.z=-side*.16;g.add(hand);
    mesh(hand,new THREE.CapsuleGeometry(.25,.30,5,12),'mint',[0,-.3,-.28],[1,.7,1]);
    mesh(hand,new THREE.SphereGeometry(.42,16,12),'mint',[0,0,0],[1,.48,1.1]);
    mesh(hand,new THREE.SphereGeometry(.27,12,8),'mint',[side*.22,.035,-.13],[1,.7,.9]);
    for(let i=0;i<4;i++){const finger=new THREE.Group();finger.position.set(-.29+i*.19,.015,.28);finger.rotation.y=(i-1.5)*-.09;hand.add(finger);const length=[.29,.4,.37,.25][i];
     mesh(finger,new THREE.CapsuleGeometry(.075,length*.55,4,8),'mint',[0,.015,length*.27]).rotation.x=Math.PI/2;
     mesh(finger,new THREE.CapsuleGeometry(.068,length*.5,4,8),'mint',[0,.08,length*.72]).rotation.x=Math.PI*.36;
     mesh(finger,new THREE.SphereGeometry(.075,8,6),'mint',[0,.12,length*.98]);
     mesh(finger,new THREE.CapsuleGeometry(.046,.095,3,6),'paper',[0,.18,length*.79],[1,.12,1]).rotation.x=Math.PI/2;
    }
    const thumb=mesh(hand,new THREE.CapsuleGeometry(.11,.28,4,10),'mint',[side*.42,.12,.01]);thumb.rotation.set(.6,0,side*-.85);
    for(const x of [-.17,.12]){const line=new THREE.CatmullRomCurve3([new THREE.Vector3(x,.195,-.13),new THREE.Vector3(x+.06,.21,.02),new THREE.Vector3(x,.185,.16)]);mesh(hand,new THREE.TubeGeometry(line,8,.012,4,false),'ink');}
   }
  }else if(kind==='leaf-umbrella'){
   mesh(g,new THREE.CylinderGeometry(.035,.035,1.7,6),'ink',[0,.9,0]);mesh(g,new THREE.SphereGeometry(.95,16,8,0,Math.PI*2,0,Math.PI/2),'mint',[0,1.65,0],[1,.4,1]);
  }else if(kind==='nope-stamp'){
   mesh(g,new THREE.BoxGeometry(1.4,.2,.9),'cobalt');mesh(g,new THREE.CylinderGeometry(.19,.26,.8,12),'sun',[0,.5,0]);mesh(g,new THREE.SphereGeometry(.28,12,8),'sun',[0,.95,0]);
  }else if(kind==='pocket-audit'){
   mesh(g,new THREE.BoxGeometry(1.2,.9,.4),'sun',[0,.6,0]);mesh(g,new THREE.TorusGeometry(.24,.05,6,16),'ink',[0,1.2,0]);
  }else if(kind==='portal'){
   const ring=mesh(g,new THREE.TorusGeometry(1,.08,8,40),'cobalt');ring.rotation.x=Math.PI/2;
   for(let i=0;i<8;i++){const mote=mesh(g,new THREE.OctahedronGeometry(.075),'sun',[Math.cos(i)*1.4,.3,Math.sin(i)*1.4]);mote.userData.seed=i;}
  }else if(kind==='trap'||kind==='setback'){
   for(let i=0;i<6;i++){const p=mesh(g,new THREE.IcosahedronGeometry(.23,0),'paper',[Math.cos(i)*.7,.15,Math.sin(i)*.7]);p.userData.seed=i;}
  }else if(kind==='shield'||kind==='bubble-coat'){
   const bubble=mesh(g,new THREE.SphereGeometry(1.05,20,14),'mint',[0,1.1,0]);bubble.material=mat('mint',{transparent:true,opacity:.18,depthWrite:false,metalness:.15,roughness:.1});
   const ring=mesh(g,new THREE.TorusGeometry(.83,.025,5,40),'paper',[0,1.2,.45]);ring.rotation.x=.3;
  }else if(['coins-gain','coins-loss','spark','well','good','bad','goodEvent','badEvent'].includes(kind)){
   for(let i=0;i<7;i++){const coin=mesh(g,new THREE.CylinderGeometry(.16,.16,.05,12),'sun',[0,.25,0]);coin.rotation.x=Math.PI/2;coin.userData.seed=i;}
  }
  return g;
 }
 function shieldStatus(){
  const g=new THREE.Group();g.name='Armed PEEK SHIELD';g.userData.presentation='shield-badge';root.add(g);
  if(!materials.has('shield-status')){const texture=new THREE.TextureLoader().load(STICKER_ART.gigachad);texture.colorSpace=THREE.SRGBColorSpace;materials.set('shield-status',new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,toneMapped:false}));}
  const icon=new THREE.Sprite(materials.get('shield-status'));icon.name='PEEK SHIELD status';icon.renderOrder=12;icon.scale.set(.8,.8,1);g.add(icon);return g;
 }
 function shieldBadge(g,count){g.userData.turns=Number.isInteger(count)&&count>0?count:null;let badge=g.getObjectByName('Shield turns');if(!Number.isInteger(count)||count<1){if(badge)badge.visible=false;return;}
  const key='shield-count:'+count;if(!materials.has(key)){const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const c=canvas.getContext('2d');c.fillStyle=C.paper;c.strokeStyle=C.ink;c.lineWidth=5;c.beginPath();c.arc(48,48,42,0,Math.PI*2);c.fill();c.stroke();c.font='48px "Dela Gothic One",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=C.cobalt;c.fillText(String(count),48,50);materials.set(key,new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthWrite:false}));}
  if(!badge){badge=new THREE.Sprite(materials.get(key));badge.name='Shield turns';badge.renderOrder=13;badge.position.set(.24,-.24,.02);badge.scale.set(.26,.26,1);g.add(badge);}badge.visible=true;badge.material=materials.get(key);badge.material.depthTest=false;badge.material.toneMapped=false;
 }
 function remove(g){if(!g)return;g.removeFromParent();g.traverse(o=>{if(!o.isSprite)o.geometry?.dispose();});}
 function clear(){for(const j of jobs.values()){remove(j.prop);if(j.stepRing){j.stepRing.material.dispose();remove(j.stepRing);}}for(const g of shields.values())remove(g);shields.clear();emoteFX.clear();jobs.clear();stickers.splice(0).forEach(s=>s.el.remove());seen.clear();lastMotion='';}
 function sync(state,pawns,t){now=t;if(identity!==state.matchId){clear();identity=state.matchId;}
  const motion=state.motion,key=identity+':'+motion?.serial;
  if(motion&&lastMotion!==key){lastMotion=key;const age=(state.motionAge||0)/1000;
   if(!state.snapMotion&&age<(motion.durationMs||1250)/1000)for(const track of motion.tracks||[]){
    const cardId=track.cardId||motion.effect?.cardId||motion.cardId,effect=motion.effect||{},current=['local-cards-v8','local-cards-v9','local-cards-v10','local-cards-v11','local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'].includes(state.rulesVersion),kind=track.sixSeven?'six-seven':effect.pending?'trail':effect.blocked?(effect.kind==='shield'?'shield':'nope-stamp'):cardId||((track.landing===67&&track.from!==track.landing)?'six-seven':current&&['market','portal','trap','setback'].includes(effect.kind)?effect.kind:effect.coins?(effect.coins>0?'coins-gain':'coins-loss'):track.type),start=t-age;
    const old=jobs.get(String(track.playerId));if(old){remove(old.prop);remove(old.stepRing);}
    const walk=motion.timingVersion===2?walkDurationMs({...track,cardId})/1000:0,duration=(motion.durationMs||1250)/1000;
    const j={...track,legacy:motion.timingVersion!==2,characterId:pawns.get(String(track.playerId))?.characterId??6,actorFrom:pawns.get(String(effect.actorId))?.pos,cardId,kind,start,duration,walk,tail:Math.max(.12,duration-walk),prop:null,cues:0,steps:Math.floor(Math.min(age,walk)/.2),schedule:[],initialAge:age,coins:effect.coins};
    j.prelude=track.sixSeven?SIX_SEVEN_MS/1000:j.tail;
    if(kind==='six-seven'){sceneCamera?.updateWorldMatrix(true,false);j.handoffRight=sceneCamera?new THREE.Vector3().setFromMatrixColumn(sceneCamera.matrixWorld,0):new THREE.Vector3(1,0,0);j.handoffRight.y=0;j.handoffRight.normalize();j.handoffYaw=Math.atan2(-j.handoffRight.z,j.handoffRight.x);}
    if(!['trail','finish','effect'].includes(kind))j.prop=props(kind);
    if(walk&&!reduced){j.stepRing=new THREE.Mesh(new THREE.RingGeometry(.58,.7,24),new THREE.MeshBasicMaterial({color:C.sun,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));j.stepRing.rotation.x=-Math.PI/2;root.add(j.stepRing);}
    const eventAt=kind==='pocket-rocket'?j.tail*.38:kind==='spring-step'?.28:0;
    const soundKind={'bubble-coat':'shield',setback:'trap',goodEvent:'coins-gain',badEvent:'trap',spark:'coins-gain',effect:'landing'}[kind]||kind;
    if(kind==='spring-step')for(let i=0,n=Math.abs(track.to-track.from);i<n;i++){
     const span=j.tail/n,start=walk+i*span;
     j.schedule.push({at:start,kind:'spring-compress'},{at:start+span*.16,kind:'spring-step'},{at:start+span*.86,kind:'step'});
    }
    if(!['trail','finish','six-seven','spring-step'].includes(kind))j.schedule.push({at:walk+eventAt,kind:soundKind});
    if(kind==='pocket-rocket')j.schedule.push({at:walk+j.tail*.39,kind:'rocket-hit'});
    if(kind==='six-seven')j.schedule.push({at:walk+.06,kind:'six-seven'});
    if(['magic-carpet','paper-glider','catch-up-kite'].includes(kind))j.schedule.push({at:duration-.16,kind:'landing'});
    if(track.sixSeven&&!effect.pending){const after=effect.blocked?'shield':track.to!==track.landing?'trap':null;if(after){j.schedule.push({at:walk+j.prelude+.04,kind:after});if(!current)sticker(after,track.playerId,start+walk+j.prelude,.95,effect.blocked?'BLOCKED':'−6');}if(track.to!==track.landing)j.schedule.push({at:duration-.06,kind:'landing'});}
    j.stickerAt=walk+(kind==='pocket-rocket'?j.tail*.38:kind==='spring-step'?.2:kind==='six-seven'?.04:0);
    jobs.set(String(track.playerId),j);
    const generatedBoard=current&&boardOutcomeStickers(effect,motion.tracks).length>0;
    if(!(current&&track.sixSeven)&&!generatedBoard&&!(['local-cards-v7','local-cards-v8','local-cards-v9','local-cards-v10','local-cards-v11','local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'].includes(state.rulesVersion)&&(effect.cardId||effect.eventId||['airdrop','draw','well'].includes(effect.kind)||current&&effect.blocked))&&!['trail','finish','effect'].includes(kind))sticker(kind,track.playerId,start+j.stickerAt,kind==='six-seven'?2:1.4,effect.coins?(effect.coins>0?'+':'')+effect.coins+' COINS':undefined);
   }
  }
  for(const [id,p]of pawns){if(p.player.shield&&!shields.has(id))shields.set(id,shieldStatus());if(!p.player.shield&&shields.has(id)){remove(shields.get(id));shields.delete(id);}const shield=shields.get(id);if(shield)shieldBadge(shield,p.player.shieldTurnsLeft??(Number.isInteger(p.player.shieldExpiresAtOwnTurn)?p.player.shieldExpiresAtOwnTurn-(p.player.ownTurns??0):null));}
  const e=state.emote;if(e&&Date.now()<e.expiresAt&&!seen.has('emote:'+e.serial)){seen.add('emote:'+e.serial);playEmote(e,t);}
 }
 function sample(track,age,durationMs,fallback){
  const j=jobs.get(String(track.playerId));if(!j)return fallback;
  const done=age>=durationMs/1000;
  if(reduced)return{pos:track.to,done,age,walking:false};
  if(j.legacy&&!j.cardId&&j.kind!=='six-seven')return fallback;
  if(age<j.walk)return{...sampleCellWalk(track,age),...(reduced?{dy:0}:{}),age,done:false};
  const a=Math.max(0,age-j.walk),u=clamp(a/j.tail),origin=j.walk?track.landing:track.from,base={age,done,walking:false,step:Math.abs(track.landing-track.from)};
  if(j.kind==='six-seven')return{...base,...(j.sixSeven&&j.to!==j.landing?sampleSixSevenImpact(track,a,j.tail*1000):sampleSixSeven(track,a,j.tail*1000))};
  if(j.cardId==='spring-step')return{...base,...sampleSpringStep({from:origin,to:track.to},a,j.tail*1000),...(reduced?{dy:0,roll:0}:{})};
  if(['magic-carpet','paper-glider','catch-up-kite'].includes(j.cardId)){const v=ease((u-.14)/.74);return{...base,pos:origin+(track.to-origin)*v,dy:reduced?0:Math.sin(v*Math.PI)*2.3,roll:reduced?0:Math.sin(v*Math.PI*2)*.08};}
  if(j.cardId==='pocket-rocket'){const v=ease((u-.38)/.62);return{...base,pos:origin+(track.to-origin)*v,dy:reduced?0:Math.sin(v*Math.PI)*1.5,roll:Math.sin(v*Math.PI)*.7};}
  if(j.kind==='portal'&&track.landing!==track.to)return{...base,pos:u<1?track.landing:track.to,portal:u,from:track.landing,to:track.to};
  if(['trap','setback','rug-tug'].includes(j.kind)){const v=ease((u-.12)/.8);return{...base,pos:origin+(track.to-origin)*v,dy:reduced?0:Math.abs(Math.sin(v*Math.PI*3))*.45,roll:reduced?0:Math.sin(v*Math.PI*3)*.22};}
  return{...base,pos:origin+(track.to-origin)*ease(u)};
 }
 function playEmote(e,t=now){return emoteFX.play(e,t);}
 function decorate(pawn,sample,t){const j=jobs.get(String(pawn.player.id)),age=j?t-j.start:0,u=j?clamp((age-j.walk)/j.tail):1;
  if(j){
   const count=Math.min(Math.abs(j.landing-j.from),Math.floor(Math.max(0,Math.min(age,j.walk))/.2+1e-6));
   if(count>j.steps){if(!reduced&&(age-j.initialAge<.35||count-j.steps===1))onCue('step');j.steps=count;j.lastStep=t;if(j.stepRing){j.stepRing.position.copy(routePoint(j.from+Math.sign(j.landing-j.from)*count));j.stepRing.position.y+=.06;}}
   if(j.stepRing){const f=clamp((t-(j.lastStep??-9))/.22);j.stepRing.material.opacity=(1-f)*.45;j.stepRing.scale.setScalar(1+f*.25);}
   for(const cue of j.schedule)if(!cue.done&&age>=cue.at){cue.done=true;if(cue.at>=j.initialAge-.08&&age-cue.at<.3)onCue(cue.kind);}
   if(sample?.walking&&!reduced){const f=sample.stepPhase||0;pawn.body.rotation.z=Math.sin(f*Math.PI)*.055*(j.steps%2?-1:1);const limbs=pawn.body.getObjectByName('Fine ink limbs');for(const [i,leg]of (limbs?.children.filter(o=>/leg/.test(o.name))||[]).entries())leg.rotation.x=Math.sin(f*Math.PI)*.32*(i%2?-1:1);}
  }
  if(sample?.dy)pawn.body.position.y+=sample.dy;if(sample?.roll)pawn.body.rotation.z=sample.roll;
  if(j?.handoffRight&&sample?.handoffSide)pawn.body.position.addScaledVector(j.handoffRight,sample.handoffSide);
  if(sample?.impactScaleX){pawn.body.scale.x*=sample.impactScaleX;pawn.body.scale.y*=sample.impactScaleY;}
  if(j?.kind==='portal'&&sample?.portal!==undefined){const f=sample.portal;pawn.body.position.copy(routePoint(f<.5?j.landing:j.to));const s=reduced?1:Math.max(.08,Math.abs(f-.5)*2);pawn.body.scale.multiplyScalar(s);}
  if(j?.prop){j.prop.visible=!reduced&&age>=j.walk&&age<j.duration;j.prop.position.copy(pawn.body.position);j.prop.rotation.y=pawn.body.rotation.y;
   if(j.kind==='spring-step'){const f=sample?.springPhase??u;j.prop.position.y-=.1;j.prop.scale.y=f<.16?1-f/.16*.7:f<.3?.3+(f-.16)/.14*.9:.9+Math.sin(f*Math.PI*10)*(1-f)*.1;j.prop.rotation.z=Math.sin(f*Math.PI*8)*(1-f)*.04;}
   if(['magic-carpet','paper-glider','catch-up-kite'].includes(j.kind)){j.prop.position.y-=.12;const opening=Math.min(1,u/.14,(1-u)/.12);j.prop.scale.set(1,1,Math.max(.12,opening));j.prop.rotation.z=Math.sin(u*Math.PI*6)*.045;}
   if(j.kind==='rug-tug'){j.prop.position.y-=.05;j.prop.position.x+=Math.sin(u*Math.PI/2)*3;j.prop.rotation.z=-u*.4;}
   if(j.kind==='pocket-rocket'){for(const o of j.prop.children){if(o.name==='Rocket flame')o.scale.set(.85+Math.sin(t*33)*.15,1+Math.sin(t*37)*.25,.85);if(o.name==='Rocket smoke'){const f=((u*4+o.userData.seed*.17)%1);o.position.set(Math.sin(o.userData.seed*4)*f*.3,-1-f*2.2,Math.cos(o.userData.seed*4)*f*.3);o.scale.setScalar((1-f)*1.8);}}const from=routePoint(j.actorFrom??Math.max(0,j.from-4)),to=routePoint(j.from);from.y+=1.2;to.y+=1;const dir=to.clone().sub(from).normalize();j.prop.position.copy(from.lerp(to,clamp(u/.38)));j.prop.visible=!reduced&&u<.4;j.prop.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);}
   if(j.kind==='leaf-umbrella')j.prop.position.y+=.3;
   if(j.kind==='nope-stamp'){j.prop.position.y+=Math.max(0,1-u*3)*2.5;j.prop.rotation.z=-.2;}
   if(j.kind==='portal'){j.prop.position.copy(routePoint(u<.6?j.landing:j.to));j.prop.position.y+=.25;j.prop.scale.setScalar(.8+Math.sin(u*Math.PI)*.5);for(const o of j.prop.children)if(o.userData.seed!==undefined){const a=o.userData.seed+t*2,r=1.5*(1-u)+.1;o.position.set(Math.cos(a)*r,.2+Math.sin(u*Math.PI)*.7,Math.sin(a)*r);}}
   if(j.kind==='trap'||j.kind==='setback'){j.prop.scale.setScalar(1+u);j.prop.children.forEach((o,i)=>o.position.y=.15+Math.abs(Math.sin(u*5+i))*.3);}
   if(j.kind==='six-seven'){
    const a=age-j.walk,hit=sixSevenHandStrike(a),strikes=j.sixSeven&&j.to!==j.landing;
    j.prop.visible=j.prop.visible&&(!j.sixSeven||a<j.prelude+(strikes?.67:0));j.prop.position.copy(routePoint(j.landing));const tossU=clamp(a/j.prelude);
    j.prop.children.forEach((h,i)=>{const f=(tossU*4)%1;h.visible=true;h.position.set((i?1:-1)*1.45,.4+Math.max(0,Math.cos(f*Math.PI*2+i*Math.PI))*.55,0);h.rotation.set(0,0,(i?-.14:.14)+Math.sin(tossU*Math.PI*8+i*Math.PI)*.22);h.scale.setScalar(1);});
    if(strikes){
     j.prop.rotation.y=j.handoffYaw;const pass=sampleSixSevenTransfer(a);
     j.prop.children.forEach((h,i)=>{const scoop=i===pass.fromHand?Math.sin(clamp(pass.phase/.2)*Math.PI):Math.sin(clamp((pass.phase-.8)/.2)*Math.PI),pop=i===0?Math.min(Math.sin(pass.pop*Math.PI)*.5,(SIX_SEVEN_FINAL_POP_HEIGHT-.4)*pass.pop):0;h.position.set((i?1:-1)*1.25,.2+scoop*.28+pop,0);h.rotation.set(-scoop*.15-(i===0?pass.pop*.35:0),0,(i?-.1:.1)+scoop*(i?-.18:.18));});
     const right=j.prop.children[1];right.scale.setScalar(1-ease((a-(pass.finalPopStart-.08))/.08));right.visible=right.scale.x>.001;
    }
    if(strikes&&hit.active){
     const normal=routePoint(j.landing+1).sub(routePoint(j.landing-1));normal.y=0;normal.normalize();const tangent=normal.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-j.handoffYaw);
     const hand=j.prop.children[1],other=j.prop.children[0],after=a>=j.prelude,size=hit.appear*(1+hit.windup*.45)*(1-hit.fade),along=2.9-.3*hit.windup-2.05*hit.strike-.8*hit.follow+hit.recoil*.7;
     hand.position.set(-1.25+along*tangent.x,after?SIX_SEVEN_FINAL_POP_HEIGHT+.95+hit.recoil*.35:.95+Math.max(0,sample?.dy||0),along*tangent.z);
     hand.rotation.set(-Math.PI/2+hit.recoil*.65,Math.atan2(tangent.x,tangent.z),hit.recoil*.14,'YXZ');hand.scale.set(size*(1+hit.compression*.12),size*(1-hit.compression*.3),size*(1+hit.compression*.18));hand.visible=size>.001;other.scale.setScalar(1-hit.appear);other.visible=other.scale.x>.001;if(after)other.position.y-=hit.follow*.2;
     if(j.prop.visible&&hand.visible)keepSixSevenPalmOutside(hand,pawn.body,normal);
    }
   }
   if(['shield','bubble-coat'].includes(j.kind)){const bounce=Math.sin(u*Math.PI*4)*Math.exp(-u*4);j.prop.scale.set(1+bounce*.2,1-bounce*.13,1+bounce*.2);}
   if(['coins-gain','coins-loss','spark','well','good','bad','goodEvent','badEvent'].includes(j.kind))j.prop.children.forEach((o,i)=>{const a=i*2.4,r=j.kind==='coins-loss'?u*2.3:Math.sin(u*Math.PI)*1.4;o.position.set(Math.cos(a)*r,.2+Math.sin(u*Math.PI)*1.5+i*.08,Math.sin(a)*r);o.rotation.y=u*9+i;o.scale.setScalar(Math.min(1,u*8,(1-u)*6));});
  }
  emoteFX.decorate(pawn,t,!!j);
 }
 function update(t,camera,viewport,pawns){now=t;emoteFX.update(t,camera,pawns);
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
  for(const [id,shield]of shields){const pawn=pawns.get(id);if(!pawn)continue;
   let bounds=shieldBounds.get(pawn.body);if(!bounds){pawn.body.updateWorldMatrix(true,true);const inverse=pawn.body.matrixWorld.clone().invert(),box=new THREE.Box3(),matrix=new THREE.Matrix4();pawn.body.traverse(n=>{if(!n.isMesh||!n.geometry)return;n.geometry.computeBoundingBox();matrix.multiplyMatrices(inverse,n.matrixWorld);box.union(n.geometry.boundingBox.clone().applyMatrix4(matrix));});bounds={height:Number.isFinite(box.max.y)?box.max.y:2,halfWidth:Math.max(box.max.x-box.min.x,box.max.z-box.min.z)/2};shieldBounds.set(pawn.body,bounds);}
   const scale=pawn.body.getWorldScale(new THREE.Vector3());shield.position.copy(pawn.body.localToWorld(new THREE.Vector3(0,bounds.height*.58,0))).addScaledVector(right,bounds.halfWidth*Math.max(scale.x,scale.z)+.28);shield.quaternion.copy(camera.quaternion);
  }
  for(const [id,j]of jobs)if(t>j.start+j.duration+.2){remove(j.prop);if(j.stepRing){j.stepRing.material.dispose();remove(j.stepRing);}jobs.delete(id);}
  const labels=stickers.length?[...container.querySelectorAll('.pawn-nameplate')].filter(e=>!e.hidden).map(e=>e.getBoundingClientRect()):[];
  for(let i=stickers.length-1;i>=0;i--){const s=stickers[i],age=t-s.start,p=pawns.get(String(s.playerId));if(age>s.life||!p){s.el.remove();stickers.splice(i,1);continue;}s.el.hidden=age<0;if(age<0)continue;const v=p.body.position.clone();v.y+=3.7;v.project(camera);const x=(v.x+1)*viewport.width/2;let y=(1-v.y)*viewport.height/2-18;const half=Math.max(45,s.el.offsetWidth/2);for(const r of labels)if(x+half>r.left-8&&x-half<r.right+8&&y>r.top-8&&y-s.el.offsetHeight<r.bottom+8)y=Math.min(y,r.top-12);const hudEl=document.getElementById('race-hud'),hud=hudEl&&!hudEl.hidden?hudEl.getBoundingClientRect():null,header=document.querySelector('body>header'),headerBottom=header?header.getBoundingClientRect().bottom:0;s.el.hidden=v.z< -1||v.z>1||x<half||x>viewport.width-half||y-s.el.offsetHeight<headerBottom+10||hud&&y>hud.top-40;s.el.style.left=x+'px';s.el.style.top=y+'px';s.el.style.opacity=String(Math.min(1,age*8,(s.life-age)*5));const pop=reduced?1:age<.18?.72+Math.sin(Math.min(1,age/.18)*Math.PI/2)*.36:1+Math.sin(age*8)*.025*Math.max(0,1-age);s.el.style.transform='translate(-50%,-100%) rotate(-4deg) scale('+pop+')';}
 }
 return{sync,sample,decorate,update,layoutEmotes:camera=>emoteFX.layoutCaptions(camera),playEmote,clear,offsetPawn(pawn,delta){const id=String(pawn.player.id),j=jobs.get(id);if(j?.prop&&j.kind!=='pocket-rocket')j.prop.position.add(delta);shields.get(id)?.position.add(delta);emoteFX.offset(pawn,delta);},debug:()=>({jobs:[...jobs.values()].map(j=>({playerId:j.playerId,kind:j.kind,cardId:j.cardId})),shields:[...shields].map(([id,g])=>({playerId:id,style:g.userData.presentation,position:g.position.toArray(),quaternion:g.quaternion.toArray(),turns:g.userData.turns,meshCount:g.children.filter(n=>n.isMesh).length})),emotes:emoteFX.debug().map(e=>e.name),emoteDetails:emoteFX.debug(),stickers:stickers.map(s=>s.label),steps:[...jobs.values()].map(j=>({playerId:j.playerId,steps:j.steps,walk:j.walk})),illustrated:true}),destroy(){clear();emoteFX.destroy();root.removeFromParent();for(const m of materials.values()){m.map?.dispose();m.dispose();}layer.remove();}};
}
