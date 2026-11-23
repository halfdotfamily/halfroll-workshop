import * as THREE from 'three';
import {CARD_TIMELINES,clamp,BOMBARDIRO_PLAYBACK_RATE} from './motion-v3.js';
import {createReverseCard,createDiamondFist,createPortal,readableWorldProp,faceWorldProp} from './world-props.js';

const EVENTS=new Set(['stonks','free-mint','wormhole','jackpot','not-stonks','mimic','paper-hands','rekt','bombardiro']);
const OWN=new Set([...EVENTS].filter(id=>id!=='bombardiro').concat(['bonk','swap','reverse','airdrop','pump','trade-offer','draw','well','network-down']));
export const CINEMA_DIRECTION=Object.freeze({
 bonk:['BONK!','smug','happy','shocked','dizzy'],hook:['UNI HOOK','focused','relieved','shocked','angry'],
 swap:['SWAP!','smug','shocked','shocked','shocked'],pump:['PUMP!','focused','happy'],
 'to-the-moon':['TO THE MOON!','shocked','relieved'],'pocket-rocket':['NUKE IT!','smug','happy','shocked','dizzy'],
 gigachad:['PEEK SHIELD','focused','relieved'],'rug-pull':['RUG PULL!','smug','happy','shocked','sad'],
 reverse:['REVERSE!','smug','relieved','shocked','dizzy'],gamba:['GAMBA!','focused','happy'],
 'trade-offer':['TRADE OFFER','smug','happy','focused','angry'],
 'network-down':['NETWORK DOWN!','focused','smug','shocked','dizzy'],
 stonks:['STONKS!','focused','happy'],'free-mint':['FREE MINT!','focused','happy'],wormhole:['WORMHOLE!','focused','shocked'],
 jackpot:['DIAMOND HAND','focused','happy'],'not-stonks':['NOT STONKS!','focused','sad'],
 mimic:['MIMIC!','focused','shocked'],'paper-hands':['PAPER HANDS!','focused','sad'],rekt:['REKT!','focused','dizzy'],
 bombardiro:['BOMBARDIRO!','shocked','dizzy','shocked','dizzy'],airdrop:['AIRDROP','focused','happy'],draw:['FOUND IT!','focused','happy'],well:['WISHING WELL','focused','happy'],
});
const UP=new THREE.Vector3(0,1,0);
const rel=(point,group)=>point.clone().sub(group.position);
const pulse=n=>Math.sin(clamp(n)*Math.PI);

// Strike the real body's outward tangent plane, not the pawn origin. The whole
// mallet stays on the outside of this plane, including its curled-back handle.
export function bonkSurfaceContact(body,{fallback=new THREE.Vector3(),right=new THREE.Vector3(1,0,.2)}={}){
 if(!body)return{point:fallback.clone().add(new THREE.Vector3(.4,2.25,0)),normal:new THREE.Vector3(.6,.8,0)};
 body.updateWorldMatrix(true,true);const core=body.getObjectByName('Critter body'),hat=body.getObjectByName('Headwear'),objects=[core,hat].filter(Boolean),bounds=new THREE.Box3();
 for(const part of objects)bounds.union(new THREE.Box3().setFromObject(part,true));
 if(bounds.isEmpty())bounds.setFromObject(body,true);
 if(bounds.isEmpty())return{point:fallback.clone().add(new THREE.Vector3(.4,2.25,0)),normal:new THREE.Vector3(.6,.8,0)};
 const center=bounds.getCenter(new THREE.Vector3()),normal=right.clone().setY(0).normalize().multiplyScalar(.65).addScaledVector(UP,1).normalize(),radius=bounds.getSize(new THREE.Vector3()).length()+2;
 const ray=new THREE.Raycaster(center.clone().addScaledVector(normal,radius),normal.clone().negate(),0,radius*2),hit=ray.intersectObjects(objects.length?objects:[body],true).find(h=>h.object.isMesh);
 if(hit){const n=hit.face?.normal?.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize()||normal;if(n.dot(normal)<0)n.negate();return{point:hit.point.clone(),normal:n,source:hit.object.name||'body-mesh'};}
 return{point:new THREE.Vector3(center.x,bounds.max.y,center.z),normal:UP.clone(),source:'body-bounds'};
}

/** Keep the physical action readable around the real players. Decorations are
 * restored before the next sample, while all coordinates stay in game space.
 * The result presenter owns the separate sticker after this action completes.
 */
export function cleanWorldAction(job){
 const {kind,parts,effect}=job,t=CARD_TIMELINES[kind],ms=job.frame?.reduced?t.durationMs*.68:(job.frame?.age??0)*1000,hit=t?.impactMs??t?.catchMs??0,after=ms>=hit;
 const hidden=job.actionHidden??=new Map();
 const hide=node=>{if(!node)return;if(!hidden.has(node))hidden.set(node,node.visible);node.visible=false;};
 const names=(...ids)=>ids.forEach(id=>hide(parts[id]));
 const limit=(nodes,count)=>nodes.slice(count).forEach(hide);
 names('cinema-dust','cinema-glints','cinema-seam','impact');
 job.group.traverse(o=>{if(o.name==='Ink outline'&&o.parent?.geometry?.type!=='BoxGeometry')hide(o);});
 // Keep functional portals and one Bomb impact ring, rather than a stack of
 // decorative circles. None of these marks is a screen-space overlay.
 for(const [i,ring]of (job.rings||[]).entries())if(ring.name!=='Well water ripple'&&!['wormhole-0','wormhole-1','portal-a','portal-b'].includes(ring.parent?.name)&&!(kind==='bombardiro'&&i===0&&ms>=hit&&ms<hit+350/BOMBARDIRO_PLAYBACK_RATE))hide(ring);
 limit(job.coins||[],Number.isFinite(Number(effect.coins))?Math.min(3,Math.abs(Number(effect.coins))):3);
 if(EVENTS.has(kind)&&kind!=='mimic'&&(['bombardiro','wormhole'].includes(kind)?ms>=t.releaseMs:after))hide(parts.chest);
 switch(kind){
  case 'bonk':limit(parts['bonk-stars']?.children||[],3);break;
  case 'swap':for(const id of ['portal-a-rays','portal-b-rays'])limit(parts[id]?.children||[],3);break;
  case 'pump':names('candle','pump-spring','pump-pad');break;
  case 'to-the-moon':limit(parts['rocket-trail']?.children||[],3);names('moon');break;
  case 'pocket-rocket':
   names('rocket-hit');limit(parts['rocket-trail']?.children||[],3);
   for(const puff of parts.rocket?.children||[])if(puff.geometry?.type==='SphereGeometry'&&puff.position.y<-1.1)hide(puff);
   if(!after)names('nuke-mushroom');else names('rocket','rocket-trail');
   break;
  case 'gigachad':names('shield-halo');break;
  case 'rug-pull':limit(job.coins||[],2);break;
  case 'gamba':break; // One real machine: three reels, its lever and result.
  case 'trade-offer':names('deal-desk','deal-stamp','deal-seal');limit(job.coins||[],1);break;
  case 'free-mint':
   if(after&&(effect.cardsDelta>0||Number(effect.coins)!==0))names('mint-press');
   if(effect.cardsDelta===0)names('mint-card');
   break;
  case 'wormhole':for(const id of ['wormhole-0','wormhole-1'])limit(parts[id]?.children||[],2);break;
  case 'jackpot':break;
  case 'mimic':limit(job.coins||[],2);break;
  case 'rekt':for(const coin of job.coins||[])hide(coin);break;
  case 'bombardiro':
   names('warning-shadow','explosion-flash','blast-smoke','blast-dust','blast-debris');
   if(ms<t.releaseMs)names('croc-plane','bomb','explosion-bloom');
   else if(ms<t.dropMs)names('bomb','explosion-bloom');
   else if(!after)names('explosion-bloom');
   else names('croc-plane','bomb');
   break;
  case 'airdrop':
   if(!after)for(const coin of job.coins||[])hide(coin);
   if(ms>t.arriveMs&&Number(effect.coins)!==0)names('drop');
   break;
  case 'draw':if(effect.cardsDelta===0)names('found-card');break;
 }
 job.actionComposition={kind,phase:job.frame?.stage??'action'};
}
function restoreWorldAction(job){
 for(const [node,visible]of job.actionHidden||[])node.visible=visible;
 job.actionHidden?.clear();
}

/** Additional props and reusable acting. All parameters come from a resolved cue. */
export function createCinemaEnhancements(){
 const acted=new Set();
 function create(job,h){
  job.cinema=h;job.event=EVENTS.has(job.kind);job.reactions={};
  if(job.pawnBody){job.pawnBody.updateWorldMatrix(true,true);const top=job.pawnBody.getObjectByName('Headwear')||job.pawnBody.getObjectByName('Critter body');job.headHeight=top?new THREE.Box3().setFromObject(top).max.y-job.pawnBody.getWorldPosition(new THREE.Vector3()).y:2.4;}
  const track=job.tracks.find(t=>String(t.playerId)===String(job.effect.actorId));
  if(job.kind==='to-the-moon'&&track&&h.routePoint){const d=h.routePoint(track.to).clone().sub(h.routePoint(track.from));job.travelHeading=Math.atan2(d.x,d.z);}
  const {kind,parts,group,effect}=job,{subgroup,box,ball,cyl,cone,ring,card,coin,mesh}=h;
  job.billboards=[];
  const billboard=(node,extra={})=>{job.billboards.push({node,...extra});return node;};
  if(kind==='network-down'){
   const taser=subgroup('network-taser');box(.48,.68,.22,'cobalt',taser);box(.22,.36,.2,'ink',taser,[0,-.42,0]);box(.24,.1,.24,'sun',taser,[0,.21,0]);
   for(const x of [-.18,.18])cyl(.045,.045,.25,'paper',taser,[x,.44,0]);billboard(taser);readableWorldProp(taser);
   const arc=subgroup('network-arc');for(let i=0;i<9;i++){const segment=cyl(.1,.1,1,i%2?'paper':'cobalt',arc);segment.name='Electric segment '+i;segment.material=new THREE.MeshBasicMaterial({color:i%2?'#ecfbff':'#3871df',transparent:true,opacity:.96,depthTest:false,depthWrite:false});segment.renderOrder=30;}
   const sparks=subgroup('network-static'),sparkMaterial=new THREE.MeshBasicMaterial({color:'#e4f6ff',depthTest:false,depthWrite:false});for(let i=0;i<4;i++){const bolt=subgroup('static-bolt-'+i,sparks);for(const mark of [box(.065,.42,.065,'sun',bolt),box(.28,.065,.065,'paper',bolt,[.07,.02,0])]){mark.material=sparkMaterial;mark.renderOrder=31;}}arc.visible=sparks.visible=false;
  }
  // A single instanced draw for the small material-coloured dust puffs.
  const dust=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.15,1),new THREE.MeshStandardMaterial({color:'#efe9dc',roughness:1,transparent:true,opacity:.85,depthWrite:false}),8);
  dust.name='cinema-dust';dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);dust.frustumCulled=false;group.add(dust);parts['cinema-dust']=dust;dust.visible=false;
  if(kind==='bonk'){
   const hammer=subgroup('hammer');box(.15,1.45,.17,'sand',hammer,[0,-.28,0]);const grip=cyl(.13,.13,.33,'cobalt',hammer,[0,-.9,0]);
   box(1.48,.62,.67,'coral',hammer,[0,.45,0]);for(const x of [-.66,.66]){const cap=cyl(.36,.36,.18,'sun',hammer,[x,.45,0]);cap.rotation.z=Math.PI/2;}
   const stars=subgroup('bonk-stars');for(let i=0;i<3;i++){const star=subgroup('bonk-star-'+i,stars);box(.04,.3,.04,'sun',star);box(.3,.04,.04,'sun',star);}stars.visible=false;
   grip.userData.role='handle';
  }
  if(kind==='reverse'){
   const cardRoot=subgroup('reverse');createReverseCard(cardRoot);billboard(cardRoot);
   const arrow=subgroup('return-arrow');const shaft=cyl(.07,.07,.65,'cobalt',arrow);shaft.rotation.x=Math.PI/2;const tip=cone(.2,.4,'coral',arrow,[0,0,.43]);tip.rotation.x=Math.PI/2;arrow.visible=false;
  }
  if(kind==='swap'){
   for(const [i,name,color]of [[0,'portal-a','cobalt'],[1,'portal-b','mint']]){
    const portal=subgroup(name);createPortal(portal,{color});billboard(portal);portal.userData.role=i?'destination':'source';
   }
  }
  if(kind==='airdrop'){
   const drop=subgroup('drop');box(.78,.65,.72,'sand',drop);box(.12,.67,.74,'sun',drop);box(.8,.12,.74,'sun',drop);
   const canopy=subgroup('drop-canopy',drop);const sail=mesh(new THREE.SphereGeometry(1.08,20,8,0,Math.PI*2,0,Math.PI/2),'mint',canopy,[0,1.7,0],[1,.64,1],false);sail.material.side=THREE.DoubleSide;
   for(const x of [-.74,.74])for(const z of [-.64,.64])h.beam({x,y:1.7,z},{x:x*.35,y:.33,z:z*.35},'ink',.018,canopy);
   const stripe=mesh(new THREE.SphereGeometry(1.09,20,8,0,Math.PI/4,0,Math.PI/2),'paper',canopy,[0,1.7,0],[1,.64,1],false);stripe.rotation.y=.3;
   for(let i=0;i<Math.min(3,Math.abs(Number(effect.coins)||0));i++)coin(group,[0,1,0],.23);
  }
  if(job.event){
   if(kind!=='bombardiro')h.chest(kind==='mimic');else h.chest(false);
   parts.chest.position.set(1.1,.48,.35);
   const lock=subgroup('cinema-lock',parts.chest,[0,.19,.53]);box(.23,.28,.09,'sun',lock);
   const seam=ring('sun',.7,group,[1.1,.3,.35]);parts['cinema-seam']=seam;seam.visible=false;
  }
  if(kind==='pump'){
   const candle=subgroup('pump-candle');box(.42,1.7,.38,'emerald',candle,[0,1,0]);cyl(.025,.025,2.8,'ink',candle,[0,1.35,0]);
   parts['pump-candle'].visible=false;
  }
  if(kind==='trade-offer'){
   const desk=subgroup('deal-desk');box(1.9,.12,1,'lilac',desk,[0,1,0]);for(const x of [-.7,.7])box(.1,.8,.1,'cobalt',desk,[x,.55,0]);
   const contract=card(group,[0,1.4,0],'mint');parts['deal-card']=contract;
   const payment=subgroup('deal-payment');coin(payment,[0,0,0],.2);
   const stamp=subgroup('deal-stamp');cyl(.19,.19,.23,'coral',stamp);box(.58,.12,.4,'cobalt',stamp,[0,-.18,0]);
   const seal=subgroup('deal-seal');box(.42,.05,.32,'emerald',seal);seal.visible=false;
  }
  if(kind==='pocket-rocket'){
   const mushroom=subgroup('nuke-mushroom');cyl(.2,.3,.9,'coral',mushroom,[0,.45,0]);
   for(const [x,y,z,r,color]of [[-.42,1.05,0,.53,'coral'],[.42,1.05,0,.53,'coral'],[0,1.18,.1,.62,'sun']])mesh(new THREE.SphereGeometry(r,16,10),color,mushroom,[x,y,z],[1,.75,.8],false);
   mushroom.visible=false;
  }
  if(kind==='swap'||kind==='bonk'||kind==='gigachad'){
   const glints=subgroup('cinema-glints');for(let i=0;i<3;i++){const star=subgroup('cinema-glint-'+i,glints);box(.06,.35,.06,'sun',star);box(.3,.06,.06,'sun',star);}glints.visible=false;
  }
  if(job.event&&kind!=='bombardiro'){
   const result=subgroup('pandora-result');parts['pandora-result'].visible=false;
   const n=Math.min(10,Math.abs(Number(effect.coins)||0));for(let i=0;i<n;i++)coin(result,[0,0,0]);
   switch(kind){
    case 'stonks':case 'not-stonks':{
     const arrow=subgroup('event-arrow',result);box(.28,1.05,.28,kind==='stonks'?'emerald':'coral',arrow,[0,.55,0]);cone(.38,.5,kind==='stonks'?'mint':'coral',arrow,[0,1.3,0]);break;
    }
    case 'free-mint':{
     const press=subgroup('mint-press',result);box(.9,.16,.65,'cobalt',press);for(const x of [-.36,.36])box(.08,.9,.12,'mint',press,[x,.5,0]);
     box(1,.13,.7,'cobalt',press,[0,1,0]);const plunger=subgroup('mint-plunger',press,[0,.75,0]);box(.55,.16,.5,'sun',plunger);
     const c=card(result,[0,.5,.4]);parts['mint-card']=c;c.visible=effect.cardsDelta!==0&&(effect.cardsDelta>0||!effect.coins);break;
    }
    case 'wormhole':{
     const destination=job.tracks.find(t=>String(t.playerId)===String(effect.actorId))?.to;
     const end=typeof h.routePoint==='function'?h.routePoint(destination).clone().sub(job.cast):job.target.clone().sub(job.cast);
     for(const [i,pos]of [new THREE.Vector3(0,1.25,-.14),end.add(new THREE.Vector3(0,1.25,-.14))].entries()){
      const p=subgroup('wormhole-'+i,result,pos.toArray());createPortal(p,{color:i?'mint':'cobalt',wormhole:true});billboard(p);
     }
     const tunnel=subgroup('wormhole-tunnel',result);const points=[];const destinationLocal=end.clone().setY(1.4);for(let i=0;i<=32;i++){const q=i/32;points.push(new THREE.Vector3().lerpVectors(new THREE.Vector3(0,1.4,0),destinationLocal,q).add(new THREE.Vector3(0,Math.sin(q*Math.PI)*.65,0)));}
     const path=new THREE.CatmullRomCurve3(points);for(let i=0;i<3;i++){const bead=ball(.1,'mint',tunnel);bead.userData.trailIndex=i;}job.wormholePath=path;tunnel.visible=false;break;
    }
    case 'jackpot':{
     const fist=subgroup('diamond-fist',result);createDiamondFist(fist);billboard(fist);readableWorldProp(fist);
     const glints=subgroup('diamond-glints',fist);for(let i=0;i<2;i++){const g=subgroup('diamond-glint-'+i,glints,[(i?-.68:.68),.12+i*.3,.4]),s=new THREE.Shape();s.moveTo(0,.17);s.lineTo(.04,.04);s.lineTo(.17,0);s.lineTo(.04,-.04);s.lineTo(0,-.17);s.lineTo(-.04,-.04);s.lineTo(-.17,0);s.lineTo(-.04,.04);s.closePath();mesh(new THREE.ShapeGeometry(s),'paper',g,[0,0,0],[1,1,1],false);}readableWorldProp(glints,120);break;
    }
    case 'paper-hands':{
     const planes=subgroup('paper-planes',result);for(let i=0;i<4;i++){
      const plane=subgroup('paper-plane-'+i,planes);if(i===0)parts['paper-plane']=plane;const shape=new THREE.Shape();shape.moveTo(0,.68);shape.lineTo(-.43,-.34);shape.lineTo(0,-.12);shape.lineTo(.43,-.34);shape.closePath();
      const p=mesh(new THREE.ShapeGeometry(shape),'cobalt',plane);p.name='Paper plane silhouette';p.material.side=THREE.DoubleSide;
      const half=new THREE.Shape();half.moveTo(0,.68);half.lineTo(0,-.12);half.lineTo(.43,-.34);half.closePath();const wing=mesh(new THREE.ShapeGeometry(half),'paper',plane,[0,0,.012],[1,1,1],false);wing.name='Paper plane fold';wing.material.side=THREE.DoubleSide;
      plane.userData.flightIndex=i;billboard(plane);readableWorldProp(plane);
     }
     const c=card(result,[0,0,0]);parts['paper-card']=c;break;
    }
    case 'rekt':{
     const anvil=subgroup('rekt-anvil',result);box(.9,.3,.55,'navy',anvil);box(.35,.3,.35,'cobalt',anvil,[0,-.3,0]);box(.7,.12,.5,'ink',anvil,[0,-.5,0]);cone(.28,.6,'navy',anvil,[.65,.05,0]).rotation.z=-Math.PI/2;break;
    }
   }
  }
  if(kind==='draw'){
   parts['found-card']=card(group,[0,1,0]);billboard(parts['found-card']);readableWorldProp(parts['found-card']);
   const sparks=subgroup('found-sparks');for(const x of [-.65,.65]){const star=subgroup('found-star-'+x,sparks,[x,0,0]);box(.05,.3,.04,'sun',star);box(.28,.05,.04,'sun',star);}readableWorldProp(sparks);
   if(effect.cardsDelta===0)for(let i=0;i<Math.min(3,Math.abs(effect.coins||0));i++)coin(group,[0,1,0],.23);
   for(const token of job.coins)readableWorldProp(token);
  }
  if(kind==='well'){
   const pool=subgroup('well-water');const rim=mesh(new THREE.TorusGeometry(.62,.11,8,40),'paper',pool);rim.rotation.x=Math.PI/2;
   const water=mesh(new THREE.CircleGeometry(.55,40),'cobalt',pool,[0,.015,0],[1,1,1],false);water.rotation.x=-Math.PI/2;
   const splash=subgroup('well-splash',pool);for(let i=0;i<5;i++){const drop=ball(.075,'mint',splash);drop.userData.splashIndex=i;}
   for(let i=0;i<2;i++){const ripple=ring('mint',.28,pool,[0,.04,0]);ripple.name='Well water ripple';ripple.userData.wellRipple=i;}
   const offering=subgroup('well-offering');const token=cyl(.18,.18,.07,'sun',offering);token.rotation.x=Math.PI/2;billboard(offering);readableWorldProp(offering);readableWorldProp(pool);
   for(let i=0;i<Math.min(5,Math.abs(effect.coins||0));i++)coin(group,[0,1,0],.23);
   for(const token of job.coins)readableWorldProp(token);
  }
 }
 function animate(job,a){
  const {kind,parts,effect,group}=job,{age,ms,timeline,phase,actor,victim,reduced,emit}=a;
  const sideOffset=(job.viewRight||new THREE.Vector3(1,0,0)).clone().multiplyScalar(2.55).addScaledVector(job.viewToward||new THREE.Vector3(0,0,1),.85),beside=(point,height=1.35)=>point.clone().add(sideOffset).addScaledVector(UP,height);job.sideBasis=sideOffset.clone();
  job.lastPresentation={actor:actor.clone(),victim:victim.clone(),ms};
  const hit=timeline?.impactMs??timeline?.catchMs??350,arrive=timeline?.arriveMs??750;
  const before=ms<hit,p=phase(hit,arrive),tail=phase(arrive,timeline?.durationMs??job.duration*1000);
  if(kind==='network-down'){
   const taser=parts['network-taser'],arc=parts['network-arc'],sparks=parts['network-static'],right=job.viewRight||new THREE.Vector3(1,0,0),toward=job.viewToward||new THREE.Vector3(0,0,1);
   const source=actor.clone().addScaledVector(right,.9).addScaledVector(toward,.25).addScaledVector(UP,1.45),target=victim.clone().addScaledVector(UP,1.55);
   taser.position.copy(source);taser.userData.billboardRoll=-.32+phase(0,timeline.releaseMs)*.2;taser.visible=!reduced&&ms<arrive;
   const cast=phase(timeline.releaseMs,hit),arcStart=source.clone().addScaledVector(UP,.38),end=arcStart.clone().lerp(target,cast),edge=end.clone().sub(arcStart),screenUp=job.viewScreenUp||UP,perp=right.clone().multiplyScalar(edge.dot(screenUp)).addScaledVector(screenUp,-edge.dot(right)).normalize();
   if(perp.lengthSq()<.01)perp.copy(right);
   const points=Array.from({length:10},(_,i)=>arcStart.clone().lerp(end,i/9).addScaledVector(perp,i===0||i===9?0:(i%2?1:-1)*.42*(.8+.2*Math.sin(i*1.4+age*11))));
   arc.visible=!reduced&&ms>=timeline.releaseMs&&ms<hit+200;
   for(let i=0;i<9;i++){const segment=arc.children[i],delta=points[i+1].clone().sub(points[i]);segment.position.copy(points[i]).add(points[i+1]).multiplyScalar(.5);segment.quaternion.setFromUnitVectors(UP,delta.clone().normalize());segment.scale.y=Math.max(.001,delta.length());}
   sparks.position.copy(target);sparks.visible=!reduced&&!before&&ms<hit+370;
   for(const [i,bolt]of sparks.children.entries()){const a=i*Math.PI/2;bolt.position.copy(right).multiplyScalar(Math.cos(a)*(.58+p*.2)).addScaledVector(UP,Math.sin(a)*(.75+p*.2));bolt.rotation.z=a+.3;bolt.scale.setScalar(Math.max(.01,1-p));}
   emit('network-charge',timeline.releaseMs/1000);emit('network-zap',hit/1000);emit('network-offline',(hit+200)/1000);
  }
  const dust=parts['cinema-dust'],dustPhase=clamp((ms-(kind==='hook'?arrive:hit))/260),matrix=new THREE.Object3D();
  dust.visible=!reduced&&dustPhase>0&&dustPhase<1;
  const dustAt=['bonk','pocket-rocket'].includes(kind)?victim:actor;
  for(let i=0;i<8;i++){const angle=i*Math.PI/4,r=.3+dustPhase*.8;matrix.position.copy(dustAt).add(new THREE.Vector3(Math.cos(angle)*r,.1+pulse(dustPhase)*.25,Math.sin(angle)*r));matrix.scale.setScalar(.3+pulse(dustPhase));matrix.updateMatrix();dust.setMatrixAt(i,matrix.matrix);}dust.instanceMatrix.needsUpdate=true;
  if(kind==='bonk'){
   const hammer=parts.hammer;
   if(before||!job.bonkContact){job.bonkContact=bonkSurfaceContact(job.targetBody,{fallback:job.target,right:job.viewRight});if(!before&&job.targetBody){const bodyOrigin=job.targetBody.getWorldPosition(new THREE.Vector3());job.bonkContact.point.add(job.target.clone().sub(bodyOrigin));}}
   const {point,normal}=job.bonkContact,wind=phase(0,timeline.releaseMs),strike=phase(timeline.releaseMs,hit),recoil=phase(hit,hit+230),end=phase(arrive,timeline.durationMs);
   const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),normal);q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),before?-.85*(1-strike):.18*pulse(recoil)));
   hammer.quaternion.copy(q);hammer.position.set(0,0,0);hammer.updateWorldMatrix(true,true);
   // Project the complete mallet onto the contact normal: no part can penetrate
   // the tangent plane, even during a rounded cap's rotation or a hat contact.
   let min=Infinity;hammer.traverse(node=>{if(!node.isMesh||!node.geometry)return;node.geometry.computeBoundingBox();const b=node.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=node.localToWorld(new THREE.Vector3(x,y,z)).sub(group.position);min=Math.min(min,v.dot(normal));}});
   const gap=.045+(before?(.65+.3*wind)*(1-strike):pulse(recoil)*.32+end*.7);
   hammer.position.copy(point).sub(group.position).addScaledVector(normal,gap-(Number.isFinite(min)?min:0));hammer.visible=!reduced&&end<.9;
   hammer.userData.contact={point:point.toArray(),normal:normal.toArray(),clearance:gap,source:job.bonkContact.source};
   const stars=parts['bonk-stars'];stars.position.copy(point).sub(group.position).addScaledVector(normal,.1);stars.visible=!reduced&&!before&&ms<hit+340;
   for(const [i,star]of stars.children.entries()){const q=phase(hit,hit+340),angle=i*2.1;star.position.set(Math.cos(angle)*(.12+q*.52),.1+Math.sin(q*Math.PI)*.4,Math.sin(angle)*(.12+q*.4));star.rotation.z=q*2+i;star.scale.setScalar(1-q*.6);}
   emit('bonk-swing',timeline.releaseMs/1000);emit('bonk-hit',hit/1000);
  }
  if(kind==='reverse'){
   const card=parts.reverse,flip=phase(timeline.releaseMs,hit),out=phase(arrive,timeline.durationMs);card.position.copy(beside(actor,1.65));card.scale.setScalar(Math.max(.01,phase(0,timeline.releaseMs)*(1-out*.65)));card.userData.billboardTilt=(1-flip)*Math.PI;card.userData.billboardRoll=-.12+pulse(flip)*.18;
   const arrow=parts['return-arrow'],from=actor.clone().add(new THREE.Vector3(0,1.4,0)),to=victim.clone().add(new THREE.Vector3(0,1.4,0));arrow.visible=!reduced&&!before&&p<1;arrow.position.copy(from).lerp(to,p);arrow.position.y+=pulse(p)*.65;const direction=to.sub(from);if(direction.lengthSq()>.001)arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction.normalize());
   emit('reverse-flick',timeline.releaseMs/1000);emit('reverse-return',hit/1000);
  }
  if(kind==='swap'){
   for(const [i,name]of ['portal-a','portal-b'].entries()){
    const portal=parts[name],at=i?job.target:job.cast,open=phase(0,timeline.releaseMs)*(1-phase(arrive,timeline.durationMs));portal.position.copy(at).sub(group.position).y+=1.25;portal.scale.setScalar(Math.max(.001,open));
    const swirl=portal.getObjectByName('Portal live swirl');swirl.rotation.z=age*(i?-3.4:3.4);portal.userData.billboardRoll=(i?-1:1)*.035*Math.sin(age*8);
   }
   emit('swap-open',timeline.releaseMs/1000);emit('swap-transfer',hit/1000);
  }
  if(job.event){
   const opening=reduced?1:phase(120,hit),reveal=reduced||ms>=hit;
   parts.chest.rotation.z=reduced?0:ms<120?Math.sin(ms*.07)*.04:0;
   parts.lid.rotation.x=-opening*1.25;
   parts['cinema-lock'].position.y=.19+pulse(phase(60,hit))*.28;parts['cinema-lock'].visible=!reveal;
   parts['cinema-seam'].visible=!reduced&&ms>150&&ms<hit+100;parts['cinema-seam'].scale.setScalar(.8+opening*.5);
   if(parts['mimic-eyes'])parts['mimic-eyes'].visible=reveal;
   if(parts['mimic-mouth'])parts['mimic-mouth'].visible=reveal;
   if(kind==='mimic'&&!before){parts.lid.rotation.x=-.2-pulse(clamp((ms-hit)/220))*.9;parts.chest.position.y+=pulse(clamp((ms-hit)/250))*.7;}
   if(kind==='bombardiro')parts.chest.scale.setScalar(reduced?1:Math.max(.01,1-phase(300/BOMBARDIRO_PLAYBACK_RATE,600/BOMBARDIRO_PLAYBACK_RATE)));
   else{
    const result=parts['pandora-result'];result.visible=reveal||kind==='rekt'&&ms>200||kind==='wormhole'&&ms>=timeline.releaseMs;
    const start=beside(actor,1.45),end=beside(actor,1.2),wallet=actor.clone().add(new THREE.Vector3(0,1.1,.25));
    job.coins.forEach((coin,i)=>{
     const q=reduced?1:clamp((p-i*.022)/Math.max(.1,1-i*.022)),loss=Number(effect.coins)<0;
     const spread=new THREE.Vector3(Math.cos(i*2.4)*.28,.12*i,Math.sin(i*2.4)*.15);
     coin.position.copy(loss?wallet:start).lerp(loss?end.clone().add(spread):end,loss?clamp(q/.3):q);
     if(!loss&&q>.84)coin.position.lerp(wallet,(q-.84)/.16);
     coin.position.y+=pulse(q)*(.4+i*.025);coin.rotation.y=.2+Math.sin(q*Math.PI)*.45;coin.scale.setScalar(reduced?1:Math.max(.01,pulse(q)*.8));
    });
    switch(kind){
     case 'stonks':case 'not-stonks':{
      const arrow=parts['event-arrow'];arrow.position.copy(start);arrow.scale.y=kind==='stonks'?.1+p*.9:Math.max(.03,1-p*.97);arrow.rotation.z=kind==='stonks'?0:Math.PI;arrow.position.y+=kind==='stonks'?p*.4:-p*.5;break;
     }
     case 'free-mint':{
      parts['mint-press'].position.copy(start);parts['mint-plunger'].position.y=.75-pulse(p)*.5;
      const card=parts['mint-card'];card.position.copy(start).lerp(end,p);card.position.y+=pulse(p)*.45;card.rotation.y=.2+Math.sin(p*Math.PI)*.45;card.scale.setScalar(Math.max(.02,1-tail));break;
     }
     case 'wormhole':{
      const entry=parts['wormhole-0'],exit=parts['wormhole-1'];
      entry.visible=ms<arrive-100;exit.visible=ms>hit+100;
      entry.scale.setScalar(Math.max(.001,phase(timeline.releaseMs,hit)*(1-phase(hit+100,arrive-100))));exit.scale.setScalar(Math.max(.001,phase(hit+100,arrive-180)*(1-tail)));
      entry.getObjectByName('Portal live swirl').rotation.z=-age*5;exit.getObjectByName('Portal live swirl').rotation.z=age*4;
      const tunnel=parts['wormhole-tunnel'];tunnel.visible=ms>hit&&ms<arrive;for(const [i,bead]of tunnel.children.entries()){const q=clamp((p-i*.07)/.82);bead.position.copy(job.wormholePath.getPoint(q));bead.scale.setScalar(Math.max(.01,pulse(q)));}
      emit('wormhole-open',timeline.releaseMs/1000);emit('wormhole-exit',arrive/1000);break;
     }
     case 'jackpot':{
      const fist=parts['diamond-fist'];fist.position.copy(beside(actor,1.8+p*.4));fist.userData.billboardRoll=-.14+pulse(p)*.2;fist.userData.billboardTilt=-.2;fist.scale.setScalar(1.05+Math.sin(Math.min(1,p*2)*Math.PI/2)*.45);parts['diamond-glints'].scale.setScalar(.55+pulse(p)*.45);emit('diamond-rise',timeline.releaseMs/1000);break;
     }
     case 'paper-hands':{
      const lostCard=effect.cardsDelta===-1||effect.cardsDelta===undefined&&!effect.coins;
      const card=parts['paper-card'];card.visible=lostCard&&p<.2;card.position.copy(beside(actor,1.8));card.scale.x=Math.max(.03,1-p*5);parts['paper-planes'].visible=lostCard;
      const right=job.viewRight||new THREE.Vector3(1,0,0),forward=job.viewToward||new THREE.Vector3(0,0,1);
      for(const [i,plane]of parts['paper-planes'].children.entries()){
       const q=clamp((ms-hit-95-i*65)/(timeline.durationMs-hit-150-i*30)),dx=[2.7,-2.5,1.3,-1.7][i],dy=[1.1,.6,2.1,1.6][i],bend=Math.sin(q*Math.PI)*[.8,-.5,-.8,.9][i];
       plane.visible=lostCard&&q>0&&q<1;plane.position.copy(beside(actor,1.8)).addScaledVector(right,q*dx+bend).addScaledVector(forward,Math.sin(q*Math.PI*1.5+i)*q*.4);plane.position.y+=q*dy+Math.sin(q*Math.PI)*.5;
       plane.userData.billboardRoll=-Math.atan2(dx+bend,dy)+Math.sin(q*6+i)*.22;plane.scale.setScalar((.64+i*.035)*Math.max(.01,1-phase(timeline.durationMs-120,timeline.durationMs)));
      }
      emit('paper-fold',hit/1000);emit('paper-flutter',(hit+160)/1000);break;
     }
     case 'rekt':parts['rekt-anvil'].position.copy(actor).y+=(job.headHeight||2.4)+.4+(before?3*(1-phase(200,hit))**2:0);parts['rekt-anvil'].rotation.z=-.12+pulse(p)*.2;break;
    }
   }
   emit('pandora-rattle',.02);emit('pandora-open',.15);
   if(kind!=='bombardiro')emit('event-'+kind,hit/1000);
  }
  if(kind==='pump'){
   const candle=parts['pump-candle'];candle.visible=true;candle.position.copy(rel(job.cast,group)).add(new THREE.Vector3(1.3,0,.35));candle.scale.set(1,reduced?1:before?.35+phase(140,hit)*.65:1+pulse(p)*.18,1);
   for(const ring of job.rings){ring.visible=!reduced&&!before&&tail<.1;ring.scale.setScalar(.4+p*1.4);}emit('pump-launch',hit/1000);
  }
  if(kind==='trade-offer'){
   const center=rel(job.cast,group).lerp(rel(job.target,group),.5),desk=parts['deal-desk'];desk.position.copy(center);desk.scale.setScalar(reduced?1:Math.max(.03,phase(0,180)*(1-tail)));
   const card=parts['deal-card'];card.position.copy(victim).lerp(actor,p);card.position.y+=1.35+pulse(p)*.5;card.rotation.y=p*Math.PI*2;card.visible=true;
   const payment=parts['deal-payment'];payment.visible=Number(effect.coins)>0&&(reduced||ms>=hit);payment.position.copy(center).lerp(victim,p);payment.position.y+=1.2+pulse(p)*.45;
   parts['deal-stamp'].position.copy(center).add(new THREE.Vector3(0,2.5-phase(arrive-100,arrive)*1.25,0));parts['deal-stamp'].visible=ms>arrive-160&&tail<.7;
   parts['deal-seal'].position.copy(center).y+=1.12;parts['deal-seal'].visible=reduced||ms>=arrive;emit('trade-offer',.1);emit('trade-receive',arrive/1000);
  }
  if(kind==='pocket-rocket'){
   const mushroom=parts['nuke-mushroom'];mushroom.visible=!reduced&&ms>=hit&&tail<.85;mushroom.position.copy(job.rocketHitAnchor||victim);mushroom.scale.setScalar(Math.max(.01,pulse(clamp((ms-hit)/800))*.8));
  }
  if(kind==='hook'){
   const gun=parts['uni-launcher'];if(!reduced){gun.position.addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(gun.quaternion),pulse(phase(timeline.releaseMs,timeline.releaseMs+100))*.18);}
  }
  if(kind==='gigachad'&&effect.blocked&&!reduced){parts.shield.scale.x*=1+pulse(phase(hit,hit+180))*.15;parts.shield.scale.z*=1-pulse(phase(hit,hit+180))*.25;}
  if(parts['cinema-glints']){
   const glints=parts['cinema-glints'];glints.visible=!reduced&&!before&&tail<.6;glints.position.copy(kind==='bonk'?victim:actor).y+=2;
   for(let i=0;i<glints.children.length;i++){const angle=i*2.4+p*.7;glints.children[i].position.set(Math.cos(angle)*.75,.2+Math.sin(angle)*.2,Math.sin(angle)*.75);glints.children[i].rotation.z=p*Math.PI;}
  }
  if(kind==='gamba'){
   const stop=timeline.impactMs;
   parts['slot-machine'].position.copy(rel(job.cast,group)).add(new THREE.Vector3(1.5,.2,.55));
   // Three audible reel stops; the resolved amount determines the symbols.
   for(let i=0;i<3;i++)emit('gamba-tick-'+i,(stop-240+i*120)/1000);
   parts['slot-lever'].rotation.x=reduced?0:-pulse(phase(0,350))*.95;
  }
  if(kind==='draw'){
   const rise=phase(timeline.releaseMs,hit+120),card=parts['found-card'];card.position.copy(beside(actor,1.05+rise*1.35));card.userData.billboardRoll=-.16+pulse(rise)*.22;card.userData.billboardTilt=(1-rise)*.8;card.scale.setScalar(Math.max(.01,(.7+rise*.55)*(1-tail)));
   const sparks=parts['found-sparks'];sparks.position.copy(card.position);sparks.visible=effect.cardsDelta!==0&&ms>=hit&&ms<arrive;sparks.rotation.z=rise*.25;sparks.scale.setScalar(.65+pulse(p)*.35);emit('found-reveal',hit/1000);
   for(const [i,coin]of job.coins.entries()){coin.position.copy(beside(actor,1.7+pulse(p)*.55)).add(new THREE.Vector3((i-1)*.3,.1*i,0));coin.rotation.y=.2;coin.visible=ms>=hit&&tail<.9;}
  }
  if(kind==='well'){
   const toss=phase(180,500),reward=phase(780,arrive),pool=parts['well-water'];pool.position.copy(beside(actor,.82));pool.scale.setScalar(Math.max(.01,phase(0,180)*(1-tail*.85)));
   const offering=parts['well-offering'];offering.visible=ms>=120&&ms<500;offering.position.copy(beside(actor,2.7-toss*1.84));offering.position.x+=Math.sin(toss*Math.PI)*.32;offering.userData.billboardRoll=toss*Math.PI*2;
   const splash=parts['well-splash'],splashPhase=phase(500,800);splash.visible=ms>=500&&ms<800;for(const [i,drop]of splash.children.entries()){const angle=i*Math.PI*2/5;drop.position.set(Math.cos(angle)*splashPhase*.45,.08+pulse(splashPhase)*.48,Math.sin(angle)*splashPhase*.45);drop.scale.setScalar(Math.max(.01,1-splashPhase));}
   for(const ripple of job.rings.filter(r=>r.name==='Well water ripple')){const q=clamp((ms-500-ripple.userData.wellRipple*100)/430);ripple.visible=q>0&&q<1;ripple.scale.setScalar(.4+q*1.7);}
   for(const [i,coin]of job.coins.entries()){coin.visible=ms>=780&&tail<.9;coin.position.copy(beside(actor,.95+reward*1.15+pulse(reward)*.6)).add(new THREE.Vector3(Math.cos(i*2.4)*.38,.12*i,Math.sin(i*2.4)*.15));coin.rotation.y=.2;coin.scale.setScalar(Math.max(.01,phase(780,850)*(1-tail)));}
   emit('well-toss',.18);emit('well-plop',.5);emit(effect.coins<0?'well-loss':effect.coins>0?'well-reward':'well-empty',.8);
  }
  if(kind==='airdrop'){
   const fall=phase(timeline.releaseMs,hit),drop=parts.drop,start=(job.headHeight||2.4)+3.7;drop.position.copy(beside(actor,.42+(1-fall)*start));drop.position.x+=Math.sin(fall*Math.PI*2)*.22*(1-fall);drop.rotation.z=Math.sin(fall*Math.PI*2)*.12*(1-fall);drop.scale.setScalar(1.15);drop.visible=ms<arrive;
   const canopy=parts['drop-canopy'];canopy.scale.setScalar(Math.max(.01,1-phase(hit+20,hit+230)));canopy.rotation.z=Math.sin(age*5)*.08;
   for(const [i,coin]of job.coins.entries()){coin.visible=ms>=hit+100;coin.position.copy(beside(actor,1.2+pulse(p)*.85)).add(new THREE.Vector3(Math.cos(i*2.4)*.38,.15*i,Math.sin(i*2.4)*.2));coin.rotation.y=.2;coin.scale.setScalar(Math.max(.01,phase(hit+100,hit+180)*(1-tail)));}
   emit('airdrop-fall',timeline.releaseMs/1000);emit('airdrop-land',hit/1000);emit(Number(effect.coins)>0?'airdrop-reward':'airdrop-empty',(hit+100)/1000);
  }
  if(kind==='to-the-moon'){
   const direction=new THREE.Vector3(0,.12,1).applyAxisAngle(UP,job.travelHeading??0).normalize();
   parts.rocket.position.copy(actor).y-=.29;parts.rocket.scale.setScalar(1);parts.rocket.quaternion.setFromUnitVectors(UP,direction);parts.rocket.visible=!reduced&&ms>=timeline.releaseMs&&ms<timeline.arriveMs;parts.moon.visible=false;parts.impact.visible=false;
   for(const [i,puff]of parts['rocket-trail'].children.entries()){puff.position.copy(parts.rocket.position).addScaledVector(direction,-.95-i*.19);puff.visible=i<3;}
  }
  if(kind==='bombardiro'){
   const plane=parts['croc-plane'],drop=job.frame.drop??1,flight=clamp(ms/timeline.durationMs),released=ms>=timeline.dropMs;
   plane.position.set(-3.6+flight*7.2,7.6+(reduced?0:Math.sin(flight*Math.PI)*.25),0);
   const releaseX=-3.6+timeline.dropMs/timeline.durationMs*7.2;
   parts.bomb.position.set(released?releaseX*(1-drop):plane.position.x,released?7.15-drop*drop*6.9:plane.position.y-.45,0);
  }
  if(!job.event&&!['pump','trade-offer','draw','well'].includes(kind))emit('cinema-prep',.02);
  cleanWorldAction(job);
  if(reduced)group.visible=false;
 }
 function decorate(pawn,sample,jobs,time,reduced){
  const body=pawn.body,face=body.getObjectByName('Reaction face'),eyes=body.getObjectByName('Resting eyes');
  if(acted.has(body)){if(face)face.visible=false;if(eyes)eyes.visible=true;const mouth=body.getObjectByName('Resting mouth'),open=body.getObjectByName('Emote mouth');if(mouth&&!open?.visible)mouth.visible=true;acted.delete(body);delete body.userData.cinemaReaction;}
  if(reduced)return;
  const id=String(pawn.player.id),job=jobs.find(j=>time>=j.start&&time<j.start+j.duration&&(String(j.effect.actorId)===id||String(j.effect.targetId)===id||j.effect.targets?.some(t=>String(t.playerId)===id)));
  if(!job)return;
  const scale=job.presentationTimeScale||1,t=Object.fromEntries(Object.entries(CARD_TIMELINES[job.kind]).map(([key,value])=>[key,value/scale])),ms=(time-job.start)*1000*t.durationMs/(job.duration*1000),hit=t.impactMs??t.catchMs,isActor=id===String(job.effect.actorId),direction=CINEMA_DIRECTION[job.kind],after=ms>=hit;
  let mood=direction?.[isActor?(after?2:1):(after?4:3)]||'shocked';
  if(job.kind==='gamba'&&after)mood=Number(job.effect.amount)>0?'happy':'sad';
  if(job.kind==='well'&&after&&job.effect.coins<0)mood='sad';
  if(job.effect.blocked)mood=after?'relieved':'shocked';
  if(job.event&&!after)mood='focused';
  if(mood==='focused')mood='smug';
  if(face&&eyes){face.visible=true;eyes.visible=false;for(const child of face.children)child.visible=child.name==='Reaction '+mood;const mouth=body.getObjectByName('Resting mouth'),open=body.getObjectByName('Emote mouth');if(mouth)mouth.visible=false;if(open)open.visible=false;}
  body.userData.cinemaReaction=mood;acted.add(body);job.reactions[id]=mood;
  const rec=clamp((ms-t.arriveMs)/(t.durationMs-t.arriveMs)),gesture=pulse(rec);
  if(job.kind==='swap'&&after)body.rotation.y+=Math.sin(rec*Math.PI*2)*.32;
  if(job.kind==='hook'&&!isActor&&ms>t.releaseMs&&ms<t.pullMs)body.rotation.y+=pulse(clamp((ms-t.releaseMs)/(t.pullMs-t.releaseMs)))*.45;
  if(['sad','dizzy'].includes(mood))body.rotation.x+=after?.1:0;
  if(mood==='happy'&&after)body.rotation.z+=Math.sin(rec*Math.PI*2)*.07;
  if(job.kind==='to-the-moon'&&isActor){if(Number.isFinite(job.travelHeading))body.rotation.y=job.travelHeading;if(rec>0)poseArm(body,'Right',[.48,2.55,.2],gesture);}
  if(job.kind==='trade-offer'&&isActor){poseArm(body,'Left',[-.13,1.43,.65],pulse(clamp(ms/t.durationMs)));poseArm(body,'Right',[.13,1.43,.65],pulse(clamp(ms/t.durationMs)));}
  if(job.kind==='gigachad'){body.rotation.y+=pulse(clamp(ms/t.durationMs))*.25;poseArm(body,'Left',[-.4,1.6,.65],pulse(clamp(ms/t.durationMs)));}
  if(job.kind==='gamba'&&isActor&&!after)poseArm(body,'Right',[.65,1.8,.4],pulse(clamp(ms/450)));
 }
 function poseArm(body,side,target,mix){
  const rig=body.getObjectByName(side+' gesture arm');if(!rig||rig.userData.held||mix<=0)return;
  const wrist=rig.getObjectByName(side+' wrist'),posed=rig.getObjectByName('Posed ink arm');if(!wrist||!posed)return;
  const end=new THREE.Vector3().fromArray(rig.userData.restHand).lerp(new THREE.Vector3(...target).sub(rig.position),mix),elbow=end.clone().multiplyScalar(.5);elbow.x+=(side==='Left'?-.14:.14)*mix;
  posed.visible=true;rig.getObjectByName(side+' thin arm').visible=false;
  for(const [i,a,b]of [[0,new THREE.Vector3(),elbow],[1,elbow,end]]){const segment=posed.getObjectByName('Arm segment '+i),d=b.clone().sub(a);segment.position.copy(a).add(b).multiplyScalar(.5);segment.quaternion.setFromUnitVectors(UP,d.clone().normalize());segment.scale.y=d.length();}
  posed.getObjectByName('Soft elbow').position.copy(elbow);wrist.position.copy(end);wrist.getObjectByName('Resting palm').visible=true;
 }
 function destroy(){for(const body of acted){const f=body.getObjectByName('Reaction face'),e=body.getObjectByName('Resting eyes'),m=body.getObjectByName('Resting mouth');if(f)f.visible=false;if(e)e.visible=true;if(m)m.visible=true;delete body.userData.cinemaReaction;}acted.clear();}
 function beforeAnimate(job){restoreWorldAction(job);job.projectedHead=null;}
 // Retained as a bridge for existing callers. World actions do not depend on
 // packed result stickers, visibility of a name cloud, or screen-space slots.
 function placeHeadScenes(jobs,camera){
  if(!camera)return;camera.updateWorldMatrix(true,false);const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));right.y=0;right.normalize();const toward=new THREE.Vector3(0,0,1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));toward.y=0;toward.normalize();
  for(const job of jobs){
   const offset=right.clone().multiplyScalar(2.55).addScaledVector(toward,.85),delta=offset.clone().sub(job.sideBasis||offset),parts=job.parts;
   // Keep readable actions beside the silhouette as the view rotates. Only
   // disposable props move; the player, map, camera and outcome stay untouched.
   for(const key of ['reverse','diamond-fist','found-card','found-sparks','well-water','well-offering','drop','event-arrow','mint-press','mint-card','paper-card'])if(parts[key])parts[key].position.add(delta);
   for(const plane of parts['paper-planes']?.children||[])plane.position.add(delta);
   if(['draw','well','airdrop'].includes(job.kind))for(const coin of job.coins)coin.position.add(delta);
   job.sideBasis=offset;job.viewRight=right.clone();job.viewToward=toward.clone();job.viewScreenUp=new THREE.Vector3(0,1,0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
   for(const {node}of job.billboards||[])faceWorldProp(node,camera,{roll:node.userData.billboardRoll||0,tilt:node.userData.billboardTilt||0});
  }
 }
 return {ownsKind:kind=>OWN.has(kind),create,beforeAnimate,animate,decorate,placeHeadScenes,destroy};
}
