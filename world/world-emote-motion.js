import * as THREE from 'three';
import {GLTFLoader} from '../assets/nature-mossfall/vendor/GLTFLoader.js';
import {EMOTE_IDS,EMOTE_TIMING,EMOTE_CHOICES} from '../game/emote-catalog.js';
import {setInkArmPose,animateCritterArms} from '../game/critter-arm-motion.js';
import {EMOTE_DURATION,HOP_BEATS,HURRY_HITS,sampleLaugh,sampleHurry,sampleBoing,bubbleSample,playerAhead,envelope,smooth} from '../game/emote-motion.js';
import {placeHeadFeedback} from '../game/head-feedback-layout.js';

const UP=new THREE.Vector3(0,1,0),FORWARD=new THREE.Vector3(0,0,1),INK='#2a2c31',PAPER='#f8f5ee';
let planeModel;
const faceStates=new WeakMap(),heldStates=new WeakMap(),hatStates=new WeakMap();
function loadPlane(){return planeModel??=new GLTFLoader().loadAsync(new URL('../assets/emotes/paper-plane.glb',import.meta.url).href).then(g=>g.scene).catch(()=>null);}
export function resetEmoteRig(body){
 const hat=hatStates.get(body);if(hat){hat.node.position.y=hat.y;hat.node.rotation.z=hat.z;hatStates.delete(body);}
 const face=faceStates.get(body);if(face){for(const [node,visible]of face)node.visible=visible;faceStates.delete(body);}
 const held=heldStates.get(body);if(held){held.item.visible=held.visible;heldStates.delete(body);}
 const mouth=body.getObjectByName('Resting mouth'),open=body.getObjectByName('Emote mouth');if(mouth)mouth.visible=true;if(open)open.visible=false;
 for(const side of ['Left','Right']){const rig=body.getObjectByName(side+' gesture arm');if(!rig)continue;
  rig.getObjectByName(side+' thin arm').visible=true;rig.getObjectByName('Posed ink arm').visible=false;
  const wrist=rig.getObjectByName(side+' wrist');wrist.position.fromArray(rig.userData.restHand);wrist.quaternion.identity();wrist.getObjectByName('Resting palm').visible=true;wrist.getObjectByName('Gesture palm').visible=false;wrist.getObjectByName('Gesture palm').scale.setScalar(1);
 }
}
function poseArm(body,side,target,mix,{taunt=false,roll=0,palmUp=false,allowHeld=false,size=1.32,grip=false,bodySpace=false}={}){
 const rig=body.getObjectByName(side+' gesture arm');if(!rig||mix<=0||rig.userData.held&&!allowHeld)return;
 if(rig.userData.held&&allowHeld){const item=body.getObjectByName(body.userData.traits?.holding);if(item){if(!heldStates.has(body))heldStates.set(body,{item,visible:item.visible});item.visible=false;}}
 const wrist=rig.getObjectByName(side+' wrist'),rest=new THREE.Vector3().fromArray(rig.userData.restHand),end=new THREE.Vector3(...target);if(bodySpace){body.localToWorld(end);rig.parent.worldToLocal(end);}end.sub(rig.position);end.lerpVectors(rest,end,mix);
 // Bent elbow: no stretching a billboard hand away from its shoulder.
 const elbow=end.clone().multiplyScalar(.52);elbow.x+=(side==='Left'?-.16:.16)*mix;elbow.z-=.10*mix;
 setInkArmPose(rig,end,elbow);wrist.rotation.set(palmUp?-Math.PI/2:-.12,side==='Left'?-.12:.12,roll);
 wrist.getObjectByName('Resting palm').visible=false;const palm=wrist.getObjectByName('Gesture palm');palm.visible=true;palm.scale.setScalar(size);
 for(let i=0;i<4;i++){const f=palm.getObjectByName('Gesture finger '+i),open=!grip&&(!taunt||i===1);f.position.set(grip?.065:-.078+i*.052,grip?.08-i*.05:open?.18:.07,grip?.085:.015);f.scale.set(grip?.045:.027,grip?.029:open?.12:.036,grip?.043:.037);}
}
function expression(body,mood,{open=false}={}){
 const eyes=body.getObjectByName('Resting eyes'),mouth=body.getObjectByName('Resting mouth'),reactions=body.getObjectByName('Reaction face'),wide=body.getObjectByName('Emote mouth');if(!reactions)return;
 const nodes=[eyes,mouth,reactions,wide,...reactions.children,...reactions.children.flatMap(g=>g.children)].filter(Boolean);faceStates.set(body,nodes.map(node=>[node,node.visible]));
 if(eyes)eyes.visible=false;if(mouth)mouth.visible=false;reactions.visible=true;for(const g of reactions.children)g.visible=g.name==='Reaction '+mood;
 if(open){const mouthPart=reactions.getObjectByName('Reaction '+mood)?.children.at(-1);if(mouthPart)mouthPart.visible=false;if(wide)wide.visible=true;}
}
export function buildEmoteMotion(root,{reduced=false,onCue=()=>{},routePoint}){
 const jobs=new Map(),materials=new Set();let pawns=new Map(),cameraPosition=new THREE.Vector3(0,10,20);
 const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});materials.add(m);return m;};
 const paper=material(PAPER,{side:THREE.DoubleSide}),ink=material(INK),wood=material('#b88a56'),woodEnd=material('#eedb94'),rayMaterial=material('#e9a08c'),bubbleMat=material('#b7ded7',{transparent:true,opacity:.23,depthWrite:false,roughness:.12,metalness:.1}),glint=material(PAPER,{transparent:true,opacity:.86,depthWrite:false});
 const tearMaterial=material('#87c6de',{transparent:true,opacity:.9,roughness:.25});
 function mesh(parent,geometry,mat){const m=new THREE.Mesh(geometry,mat);parent.add(m);return m;}
 function remove(e){if(e?.prop){e.prop.userData.disposed=true;e.prop.removeFromParent();e.prop.traverse(o=>o.geometry?.dispose());}if(e?.caption){clearPlate(e.caption);e.caption.removeFromParent();e.caption.material.map?.dispose();e.caption.material.dispose();}}
 function caption(name){
  // A separate speech layer preserves the card's walking transform and pose.
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=128;const c=canvas.getContext('2d');
  c.fillStyle=PAPER;c.strokeStyle=INK;c.lineWidth=5;c.beginPath();c.roundRect(4,4,312,108,22);c.fill();c.stroke();c.beginPath();c.moveTo(142,110);c.lineTo(153,124);c.lineTo(169,110);c.fill();c.stroke();
  c.fillStyle=INK;c.textAlign='center';c.textBaseline='middle';c.font='bold 44px "Dela Gothic One",sans-serif';c.fillText(EMOTE_CHOICES.find(x=>x[0]===name)?.[1]||name,160,57,276);
  if(name==='lol'){c.fillStyle='#87c6de';for(const x of [25,295]){c.beginPath();c.ellipse(x,68,7,15,x<160?.4:-.4,0,Math.PI*2);c.fill();}}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));sprite.userData.word=EMOTE_CHOICES.find(c=>c[0]===name)?.[1]||name;sprite.name='Parallel emote '+name;sprite.renderOrder=55;sprite.scale.set(3.8,1.52,1);root.add(sprite);return sprite;
 }
 function clearPlate(sprite){const plate=sprite.userData.fallbackPlate;if(plate){delete plate.dataset.emoteWord;delete sprite.userData.fallbackPlate;}}
 function placeCaption(sprite,pawn,camera,id,placed){
  sprite.position.copy(pawn.body.position).add(new THREE.Vector3(0,3.1,0));
  if(typeof document==='undefined')return;
  clearPlate(sprite);delete sprite.userData.captionBounds;
  const label=document.querySelector(`.pawn-nameplate[data-player-id="${id}"]`),canvas=document.querySelector('#world3d canvas');if(!canvas){sprite.visible=false;return;}
  const view=canvas.getBoundingClientRect(),name=label?.getClientRects().length?label.getBoundingClientRect():null;if(!view.height){sprite.visible=false;return;}
  const up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),center=sprite.position.clone().project(camera),above=sprite.position.clone().add(up).project(camera),pixels=Math.abs(above.y-center.y)*view.height/2;
  if(pixels<.01)return;
  const width=80,height=width*.4,anchor={x:(center.x+1)*view.width/2,y:name?name.top-view.top:(1-center.y)*view.height/2+24};
  if(center.z< -1||center.z>1||anchor.x<0||anchor.x>view.width){sprite.visible=false;delete sprite.userData.captionBounds;return;}
  const obstacles=[...document.querySelectorAll('body>header,#race-hud,#race-hud .rh-feedback,.world-dice-prompt,#map-view-panel,#tile-key-panel,#atmosphere-hud,#tile-key-controls,.pawn-nameplate')].filter(n=>n.closest?.('details')?.open!==false&&!n.hidden&&n.getClientRects().length&&getComputedStyle(n).display!=='none').map(n=>n.getBoundingClientRect()).map(b=>({x:b.left-view.left,y:b.top-view.top,width:b.width,height:b.height}));
  const box=placeHeadFeedback({...anchor,width,height,viewport:view,obstacles,placed,nearOnly:true});sprite.visible=!!box;sprite.userData.captionBounds=box;if(!box){
    // In a pack, use the racer's existing name slot instead of dropping the word.
    if(name){label.dataset.emoteWord=sprite.userData.word;sprite.userData.fallbackPlate=label;}
    return;
  }
  sprite.scale.set(width/pixels,height/pixels,1);
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),centerY=(1-center.y)*view.height/2;
  sprite.position.addScaledVector(up,(centerY-box.y-height/2)/pixels).addScaledVector(right,(box.x+width/2-anchor.x)/pixels);placed.push(box);
 }
 function prop(name){const g=new THREE.Group();g.name='Emote '+name;g.userData.kind=name;root.add(g);
  if(name==='plane'){
   // Folded paper fallback also works offline / during the optional model load.
   const vertices=[0,.02,.85,-.52,.04,-.65,-.06,.14,-.4,0,.02,.85,-.06,.14,-.4,0,-.09,-.65,0,.02,.85,.06,.14,-.4,.52,.04,-.65,0,.02,.85,0,-.09,-.65,.06,.14,-.4];
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();const fallback=mesh(g,geo,paper);
   loadPlane().then(model=>{if(!model||g.userData.disposed)return;g.remove(fallback);fallback.geometry.dispose();const clone=model.clone(true);clone.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=paper;o.castShadow=true;}});g.add(clone);g.userData.model='Clint Bellanger CC0';});
  }else if(name==='bubble'){
   for(let i=0;i<6;i++){const b=new THREE.Group();b.userData.index=i;g.add(b);const radius=i===0?.34:.13+(i%3)*.045;mesh(b,new THREE.SphereGeometry(radius,14,10),bubbleMat);const arc=mesh(b,new THREE.TorusGeometry(radius*.76,.012,4,14,Math.PI*.55),glint);arc.position.set(-radius*.08,radius*.12,radius*.58);arc.rotation.z=.6;}
   const wand=mesh(g,new THREE.TorusGeometry(.12,.02,5,16),ink);wand.name='Bubble wand';wand.position.set(-.55,0,.12);mesh(wand,new THREE.CylinderGeometry(.014,.014,.35,5),ink).position.y=-.25;
  }else if(name==='lol'){
   for(const sign of [-1,1])for(let i=0;i<2;i++){const tear=mesh(g,new THREE.SphereGeometry(1,8,6),tearMaterial);tear.name='Laugh tear';tear.userData={sign,index:i};tear.scale.set(.085,.16,.06);}
  }else if(name==='yell')for(let i=0;i<3;i++){const ray=mesh(g,new THREE.TorusGeometry(.36+i*.22,.037,5,20,Math.PI*.7),rayMaterial);ray.rotation.z=-Math.PI*.3;ray.position.x=.5;}
  else if(name==='hurry'){
   const shaft=mesh(g,new THREE.CylinderGeometry(.065,.085,2.2,9),wood);shaft.position.y=1.1;shaft.castShadow=true;shaft.name='Wooden staff';
   for(const y of [.04,2.16]){const end=mesh(g,new THREE.CylinderGeometry(.087,.087,.08,9),woodEnd);end.position.y=y;}
   for(const y of [.7,1.45,1.9]){const grain=mesh(g,new THREE.TorusGeometry(.067,.007,3,9),ink);grain.rotation.x=Math.PI/2;grain.position.y=y;}
   // The zero-height bottom is the actual contact point; no hidden extension through the floor.
   const marks=new THREE.Group();marks.name='Staff contact marks';g.add(marks);
   for(let i=0;i<3;i++){const m=mesh(marks,new THREE.CylinderGeometry(.015,.015,.23,5),woodEnd);m.position.set((i-1)*.18,.12,.1);m.rotation.z=(i-1)*.7;}
   g.userData.gripHeight=1;g.userData.contact=[0,0,0];
  }
  return g;
 }
 function play(e,t){if(!EMOTE_IDS.includes(e.name))return false;const id=String(e.playerId);remove(jobs.get(id));jobs.set(id,{...e,start:t,duration:EMOTE_TIMING[e.name]?.duration??EMOTE_DURATION,prop:(['plane','bubble','yell','lol'].includes(e.name)||e.name==='hurry'&&!reduced)?prop(e.name):null,cued:false,landings:0,pops:new Set()});return true;}
 function decorate(pawn,t,blocked=false){
  resetEmoteRig(pawn.body);const e=jobs.get(String(pawn.player.id));if(e)e.blocked=!!blocked||!!pawn.motion;
  if(e&&!e.cued&&t-e.start>=(EMOTE_TIMING[e.name]?.cue??0)){e.cued=true;if(t-e.start-(EMOTE_TIMING[e.name]?.cue??0)<.45)onCue('emote-'+e.name);}
  if(!e||e.blocked||t>e.start+e.duration){const walking=!!pawn.presentationSample?.walking;if(!blocked||walking)animateCritterArms(pawn.body,t,{walking,reduced,phase:pawn.phase??0});return;}
  const age=t-e.start,v=Math.max(0,age)/e.duration,mix=envelope(age,0,e.duration-.45),body=pawn.body;
  const cueAt=EMOTE_TIMING[e.name]?.cue??0;
  if(!e.cued&&age>=cueAt){e.cued=true;if(age-cueAt<.45)onCue('emote-'+e.name);}
  if(e.name==='hurry')for(let n=0;n<HURRY_HITS.length;n++)if(age>=HURRY_HITS[n]&&!e.pops.has(n)){e.pops.add(n);if(age-HURRY_HITS[n]<.18)onCue('emote-hurry-hit');}
  if(e.name==='plane'&&!e.folded&&age>=.12){e.folded=true;if(age<.4)onCue('emote-fold');}
  if(reduced)return;
  let facing=Math.atan2(cameraPosition.x-body.position.x,cameraPosition.z-body.position.z);
  if(e.name==='taunt'){
   const target=[...pawns.values()].filter(p=>p!==pawn).sort((a,b)=>a.body.position.distanceToSquared(body.position)-b.body.position.distanceToSquared(body.position))[0];
   if(target){e.targetId=String(target.player.id);const towards=Math.atan2(target.body.position.x-body.position.x,target.body.position.z-body.position.z),delta=Math.atan2(Math.sin(towards-facing),Math.cos(towards-facing));facing+=Math.max(-.9,Math.min(.9,delta))*(1-smooth((age-1.1)/.6));}
  }
  if(e.name==='plane'){
   if(!e.launch){const target=playerAhead(pawn,pawns);e.targetId=target?String(target.player.id):null;e.launch={from:body.position.clone(),to:target?.body.position.clone()??routePoint(Math.min(144,(pawn.pos||0)+5))};if(!target&&e.launch.to.distanceTo(body.position)<2)e.launch.to.copy(body.position).add(new THREE.Vector3(0,0,6).applyAxisAngle(UP,body.rotation.y));e.launch.from.y+=1.25;e.launch.to.y+=1.3;}
   facing=Math.atan2(e.launch.to.x-body.position.x,e.launch.to.z-body.position.z);
  }
  if(e.name!=='hop'){const delta=Math.atan2(Math.sin(facing-body.rotation.y),Math.cos(facing-body.rotation.y));body.rotation.y+=delta*mix;}
  const shoulder=Math.abs(body.getObjectByName('Left gesture arm')?.position.x??.8),faceY=(120-({egg:58,bean:60,drop:62,box:56,pear:52,capsule:52}[body.userData.traits?.body]??58))*.026;
  if(mix>.2){const moods={hop:'happy',lol:'happy',wave:'happy',facepalm:'sad',taunt:'smug',plane:'smug',bubble:'happy',yell:'shocked','six-seven':'happy',hurry:'angry'};expression(body,moods[e.name],{open:['lol','yell','bubble','six-seven','hurry'].includes(e.name)});const open=body.getObjectByName('Emote mouth');if(open?.visible)open.scale.set(e.name==='lol'?.85:e.name==='yell'?1.1:.6,e.name==='lol'?sampleLaugh(age).mouth:e.name==='bubble'?.48:e.name==='six-seven'?.64:e.name==='hurry'?.65+Math.abs(Math.sin(age*17))*.2:1.15+Math.sin(age*24)*.1,1);}
  if(e.name==='hop'){
   const hop=sampleBoing(age);body.position.y+=hop.y;body.scale.y*=hop.scaleY;body.scale.x*=hop.scaleXZ;body.scale.z*=hop.scaleXZ;
   for(let n=e.landings;n<hop.landings;n++){const b=HOP_BEATS[n];if(age-(b.start+.16+b.flight)<.18)onCue('landing');}e.landings=hop.landings;
   const hat=body.getObjectByName('Headwear');if(hat){hatStates.set(body,{node:hat,y:hat.position.y,z:hat.rotation.z});hat.position.y+=Math.sin(age*15)*hop.y*.045;hat.rotation.z+=Math.sin(age*12)*hop.y*.055;}
   for(const side of ['Left','Right'])poseArm(body,side,[(side==='Left'?-1:1)*(shoulder+.27),1.15+hop.y*.18,.12],mix);
  }else if(e.name==='wave'){poseArm(body,'Left',[-shoulder-.12,2.03,.24],mix,{roll:Math.sin(age*16)*.5,size:1.5});body.position.y+=Math.sin(v*Math.PI)*.12;body.rotation.z+=Math.sin(age*8)*.045*mix;}
  else if(e.name==='facepalm'){const press=envelope(age,.24,2.08);poseArm(body,'Left',[-.07,faceY+.12,.73],press,{roll:-.24,size:1.55});body.rotation.x=press*.22;body.rotation.y+=Math.sin((age-.85)*3)*.13*envelope(age,.85,1.9);}
  else if(e.name==='taunt'){const beats=Math.exp(-(((age-.55)/.17)**2))+Math.exp(-(((age-1.4)/.22)**2));poseArm(body,'Left',[-shoulder-.02,1.82+beats*.13,.5],mix,{taunt:true,roll:-.16,size:1.48});body.rotation.z=-beats*.075;body.rotation.x-=mix*.07;}
  else if(e.name==='yell'){const breath=envelope(age,0,.24),shout=envelope(age,.28,2.32);for(const side of ['Left','Right'])poseArm(body,side,[(side==='Left'?-1:1)*(shoulder+.12),1.78+shout*.22,.28],mix,{roll:side==='Left'?-.45:.45,allowHeld:true});body.scale.y*=1-breath*.07+shout*.1;body.scale.x*=1+breath*.04-shout*.025;body.rotation.z=Math.sin(age*32)*.028*shout;}
  else if(e.name==='six-seven'){const rhythm=(Math.exp(-(((age-.7)/.2)**2))-Math.exp(-(((age-1.3)/.22)**2)))*envelope(age,.22,1.96);for(const side of ['Left','Right']){const sign=side==='Left'?-1:1;poseArm(body,side,[sign*(shoulder+.15),1.24+sign*rhythm*.28,.55],mix,{palmUp:true,allowHeld:true,roll:sign*.08,size:1.5});}body.rotation.z+=rhythm*.07;body.position.y+=Math.abs(rhythm)*.055;}
  else if(e.name==='lol'){const laugh=sampleLaugh(age);body.position.y+=laugh.bounce;body.rotation.x+=laugh.lean;body.rotation.z+=laugh.roll;body.scale.y*=1-laugh.bounce*.35;poseArm(body,'Left',[-shoulder*.55,1.12,.68],mix,{roll:-.25});poseArm(body,'Right',[shoulder*.55,1.12,.68],mix,{roll:.25});}
  else if(e.name==='hurry'){
   const s=sampleHurry(age);body.rotation.x*=1-mix;body.rotation.z*=1-mix;
   poseArm(body,'Right',[shoulder+.34,1+s.lift,.44],mix,{allowHeld:true,roll:.06,size:1.25,grip:true,bodySpace:true});
   poseArm(body,'Left',[-shoulder-.08,1.02,.2],mix,{allowHeld:true,roll:-.35,size:1.2,bodySpace:true});
  }
  else if(e.name==='plane'){const release=smooth((age-.25)/.35);poseArm(body,'Left',[-.18-(shoulder-.08)*release,1.38+.07*release,.7+.15*release],envelope(age,0,.8),{roll:-.5});poseArm(body,'Right',[.14,1.4,.72],envelope(age,0,.32),{allowHeld:true,roll:.35});}
  else if(e.name==='bubble')poseArm(body,'Left',[-.4,1.25,.73],envelope(age,0,1.65),{roll:-.6});
 }
 function update(t,camera,nextPawns){pawns=nextPawns;camera.getWorldPosition(cameraPosition);
  for(const [id,e]of jobs){const pawn=pawns.get(id);if(!pawn||t>e.start+e.duration){if(pawn)resetEmoteRig(pawn.body);remove(e);jobs.delete(id);continue;}
   const parallel=!!e.blocked||!!pawn.motion;e.caption??=caption(e.name);if(e.caption){e.caption.visible=true;e.caption.position.copy(pawn.body.position).add(new THREE.Vector3(0,3.1,0));}
   if(!e.prop)continue;const age=t-e.start;e.prop.visible=!reduced&&!parallel;
   if(e.name==='lol'){
    const body=pawn.body,faceY=(120-({egg:58,bean:60,drop:62,box:56,pear:52,capsule:52}[body.userData.traits?.body]??58))*.026;
    body.updateWorldMatrix(true,false);e.prop.position.copy(body.position);e.prop.quaternion.copy(body.quaternion);e.prop.scale.copy(body.scale);
    for(const tear of e.prop.children){const u=((Math.max(0,age-.45)/.58+tear.userData.index*.5)%1);tear.visible=age>.45&&age<2.85;tear.position.set(tear.userData.sign*(.43+u*.18),faceY-.06-u*.55,.74+u*.13);tear.scale.set(.075,.13*(1-u*.4),.055);tear.rotation.z=-tear.userData.sign*.3;}
   }

   else if(e.name==='plane'&&e.launch){const u=Math.max(0,Math.min(1,(age-.48)/1.5));const from=e.launch.from,to=e.launch.to;
    // Lock the nearest racer ahead at release; follow their moving presentation.
    if(!e.released){const wrist=pawn.body.getObjectByName('Left wrist');if(wrist)wrist.getWorldPosition(from);else{from.copy(pawn.body.position);from.y+=1.25;}if(age>=.48)e.released=true;}
    const recipient=pawns.get(e.targetId);if(recipient){to.copy(recipient.body.position);to.y+=1.3;}
    e.prop.position.copy(from).lerp(to,u);e.prop.position.y+=Math.sin(u*Math.PI)*Math.min(2,from.distanceTo(to)*.16+.5);
    const lateral=Math.sin(u*Math.PI*2)*Math.sin(u*Math.PI)*.4;e.prop.position.x+=lateral;
    const d=to.clone().sub(from);d.y+=Math.cos(u*Math.PI)*Math.PI*Math.min(2,from.distanceTo(to)*.16+.5);if(d.lengthSq()>.001)e.prop.quaternion.setFromUnitVectors(FORWARD,d.normalize());e.prop.rotateZ(Math.sin(u*Math.PI*2)*.16);
    e.prop.visible=!reduced&&!e.blocked&&!pawn.motion&&age>.16&&u<1;e.prop.scale.set(.72*smooth(age/.18),.72*(.25+.75*smooth((age-.12)/.25)),.72*smooth(age/.18));
    if(u===1&&!e.hit){e.hit=true;const target=pawns.get(e.targetId);if(target&&!target.motion){e.reactAt=t;onCue('emote-plane-hit');}}
   }else if(e.name==='bubble'){
    e.prop.position.copy(pawn.body.position);e.prop.position.y+=1.25;const forward=new THREE.Vector3(0,0,.6).applyAxisAngle(UP,pawn.body.rotation.y);e.prop.position.add(forward);
    e.prop.updateMatrixWorld(true);
    for(const b of e.prop.children){if(b.userData.index===undefined){b.visible=age<1.5;const wrist=pawn.body.getObjectByName('Left wrist');if(wrist){const point=wrist.getWorldPosition(new THREE.Vector3());point.y+=.25;e.prop.worldToLocal(point);b.position.copy(point);}b.quaternion.copy(pawn.body.quaternion);continue;}const s=bubbleSample(age,b.userData.index);b.visible=s.visible;b.position.set(s.x,s.y,s.z);b.scale.setScalar(s.scale);b.quaternion.copy(camera.quaternion);const popAt=.24+b.userData.index*.17+1.47;if(age>=popAt&&!e.pops.has(b.userData.index)){e.pops.add(b.userData.index);if([0,3].includes(b.userData.index)&&age<popAt+.25&&!e.blocked)onCue('emote-pop');}}
   }else if(e.name==='yell'){e.prop.position.copy(pawn.body.position);e.prop.position.add(new THREE.Vector3(0,1.55,.72).applyAxisAngle(UP,pawn.body.rotation.y));e.prop.quaternion.copy(pawn.body.quaternion);e.prop.scale.setScalar(.8+Math.sin(age*14)*.08);e.prop.visible=!reduced&&!e.blocked&&age>.3&&age<2.3;e.prop.scale.multiplyScalar(envelope(age,.25,2.1));}
   else if(e.name==='hurry'){
    const body=pawn.body,s=sampleHurry(age),shoulder=Math.abs(body.getObjectByName('Right gesture arm')?.position.x??.8);
    body.updateWorldMatrix(true,false);e.prop.position.copy(body.localToWorld(new THREE.Vector3(shoulder+.34,s.lift,.44)));body.getWorldQuaternion(e.prop.quaternion);body.getWorldScale(e.prop.scale);
    e.prop.visible=!reduced&&!e.blocked&&!pawn.motion&&s.visible;e.prop.getObjectByName('Staff contact marks').visible=s.contact>.1;
   }
   const target=e.targetId&&pawns.get(e.targetId);if(e.reactAt&&target&&!target.motion&&!reduced){const u=(t-e.reactAt)/.32;if(u<1)target.body.rotation.z+=Math.sin(u*Math.PI)*.1;}
  }
 }
 function clear(){for(const e of jobs.values())remove(e);for(const p of pawns.values())resetEmoteRig(p.body);jobs.clear();}
 return{play,decorate,update,clear,layoutCaptions(camera){const boxes=[];for(const [id,e]of jobs){const pawn=pawns.get(id);if(pawn&&e.caption?.visible)placeCaption(e.caption,pawn,camera,id,boxes);}return boxes;},offset(pawn,delta){const e=jobs.get(String(pawn.player.id));if(e?.prop&&e.name!=='plane')e.prop.position.add(delta);},debug:()=>[...jobs.values()].map(e=>({name:e.name,start:e.start,duration:e.duration,targetId:e.targetId??null,landings:e.landings,model:e.prop?.userData.model??null,prop:e.prop?.position.toArray(),caption:e.caption?{visible:e.caption.visible,bounds:e.caption.userData.captionBounds,label:EMOTE_CHOICES.find(c=>c[0]===e.name)?.[1]}:null})),destroy(){clear();for(const m of materials)m.dispose();}};
}
