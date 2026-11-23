import * as THREE from 'three';
import {createCinemaEnhancements} from './card-effects/cinema-vfx.js';
import {PANDORA_BOOM_OFFSET_MS} from './owner-sound-timing.js';
import * as defaultMotion from './owner-presentation-motion.js';

// This replaces the Pandora blast's plane prop only. The existing motion API
// still owns every phase, recipient and resolved destination, including replay.
export function createPandoraEnhancements({motionApi=defaultMotion,boxKind='bombardiro'}={}){
 const {pandoraOriginalAge}=motionApi;
 const base=createCinemaEnhancements(),clamp=x=>Math.max(0,Math.min(1,x));
 const smooth=x=>{x=clamp(x);return x*x*(3-2*x);},displaced=new Map();
 function restore(body){const old=displaced.get(body);if(!old)return;if(body.position.distanceToSquared(old.rendered)<1e-12){body.position.copy(old.position);if(Math.abs(body.rotation.z-old.roll)<1e-9)body.rotation.z-=old.tilt;body.updateWorldMatrix(true,true);}displaced.delete(body);}
 return {...base,
  ownsKind:kind=>kind===boxKind||base.ownsKind(kind),
  create(job,h){
   if(job.kind!==boxKind){base.create(job,h);return;}const kind=job.kind;try{job.kind='bombardiro';base.create(job,h);}finally{job.kind=kind;}
   const drop=h.subgroup('pandora-drop');drop.add(job.parts.chest);job.parts.chest.position.set(0,.46,0);
   const canopy=h.subgroup('pandora-canopy',drop);
   for(let i=0;i<6;i++){
    const sail=h.mesh(new THREE.SphereGeometry(1.45,8,6,i*Math.PI/3,Math.PI/3,0,Math.PI/2),i%2?'paper':'mint',canopy,[0,2.25,0],[1,.65,1],false);sail.material.side=THREE.DoubleSide;
    const a=i*Math.PI/3;h.beam({x:Math.cos(a)*1.4,y:2.25,z:Math.sin(a)*1.4},{x:Math.cos(a)*.48,y:.8,z:Math.sin(a)*.36},'ink',.018,canopy);
   }
   const flash=h.subgroup('pandora-flash');
   h.mesh(new THREE.IcosahedronGeometry(1.05,1),'sun',flash,[0,.95,0],[1,.9,1],false);
   h.mesh(new THREE.IcosahedronGeometry(.65,1),'paper',flash,[0,1.1,0],[1,1,1],false);
   const smoke=h.subgroup('pandora-smoke'),puffGeometry=new THREE.IcosahedronGeometry(.55,1),smokeMaterials=new Map();
   for(let i=0;i<24;i++){const color=i%3===0?'coral':i%3===1?'sun':'sand',puff=h.mesh(puffGeometry,{coral:'#e98e7c',sun:'#eedb94',sand:'#d7cbb4'}[color],smoke,[0,.6,0],[1,1,1],false);if(!smokeMaterials.has(color)){puff.material.transparent=true;puff.material.depthWrite=false;smokeMaterials.set(color,puff.material);}puff.userData.index=i;}
   job.pandoraSmokeMaterials=smokeMaterials;job.pandoraContacts=new Map();
   const debris=h.subgroup('pandora-debris'),shardGeometry=new THREE.BoxGeometry(.21,.18,.16);
   for(let i=0;i<14;i++)h.mesh(shardGeometry,i%2?'sand':'cobalt',debris,[0,.5,0],[1,1,1],false);
   const wave=h.ring('sun',1,job.group,[0,.12,0]);wave.name='Pandora pressure wave';job.parts['pandora-wave']=wave;
   flash.visible=smoke.visible=debris.visible=wave.visible=false;
  },
  animate(job,ctx){
   if(job.kind!==boxKind){base.animate(job,ctx);return;}
   const {parts,group}=job,{ms,timeline,emit,reduced}=ctx,hit=timeline.impactMs;
   if(reduced){group.visible=false;return;}
   job.pandoraMs=ms;job.pandoraHit=hit;
   const fall=clamp(ms/hit),after=ms>=hit,age=clamp((ms-hit)/Math.max(1,timeline.durationMs-hit)),fade=1-clamp((age-.55)/.45);
   const drop=parts['pandora-drop'],canopy=parts['pandora-canopy'];
   drop.visible=!after;drop.position.set(Math.sin(fall*Math.PI*2)*.3*(1-fall),.15+(1-fall)*(1-fall)*8,0);drop.rotation.z=Math.sin(fall*Math.PI*4)*.1*(1-fall);drop.scale.setScalar(1.25);
   canopy.rotation.z=Math.sin(fall*Math.PI*4)*.08;parts.lid.rotation.x=0;
   const flash=parts['pandora-flash'],smoke=parts['pandora-smoke'],debris=parts['pandora-debris'],wave=parts['pandora-wave'];
   flash.visible=after&&age<.29;flash.scale.setScalar(.5+Math.sin(clamp(age/.29)*Math.PI)*2.8);
   smoke.visible=debris.visible=wave.visible=after&&age<1;
   for(const [i,puff]of smoke.children.entries()){
    const a=i*2.39996,layer=i%3,r=(.2+Math.sqrt(age)*4.8)*(layer===0?.45:layer===1?.75:1);puff.position.set(Math.cos(a)*r,.5+Math.sin(clamp(age)*Math.PI)*(1.8+layer*.7)+age*.6,Math.sin(a)*r);puff.scale.setScalar(Math.max(.001,(.8+Math.sin(age*Math.PI)*1.1)*(1+layer*.13)*fade));
   }
   for(const [color,m]of job.pandoraSmokeMaterials){m.color.set(color==='coral'?'#e98e7c':color==='sun'?'#eedb94':'#d7cbb4').lerp(new THREE.Color('#807c77'),smooth((age-.12)/.7));m.opacity=fade*.93;}
   for(const [i,shard]of debris.children.entries()){
    const a=i*2.39996,r=age*(3.5+(i%3)*.9);shard.position.set(Math.cos(a)*r,.4+Math.sin(clamp(age)*Math.PI)*(2+(i%2)*.7),Math.sin(a)*r);shard.rotation.set(age*8+i,age*6,age*9);shard.scale.setScalar(Math.max(.001,fade));
   }
   wave.scale.setScalar(1+age*8.5);wave.scale.z=Math.max(.01,fade);wave.visible&&=age<.65;
   // emit() maps authored time to the unchanged actual presentation gate.
   const scale=job.duration*1000/timeline.durationMs;
   // Start on the very first sync frame. A delayed first render must not miss
   // this continuous sound through the one-shot cue's 220ms lateness guard.
   emit(job.duration>5?'pandora-fall-long':'pandora-fall',0);
   emit('pandora-abracadabra',Math.max(0,hit-PANDORA_BOOM_OFFSET_MS/scale)/1000);
  },
  decorate(pawn,sample,jobs,time,reduced){
   const body=pawn.body;restore(body);const blast=jobs.find(j=>j.kind===boxKind&&time>=j.start&&time<j.start+j.duration);base.decorate(pawn,sample,jobs.map(j=>j.kind===boxKind?{...j,kind:'bombardiro'}:j),blast?blast.start+pandoraOriginalAge(time-blast.start):time,reduced);if(reduced)return;
   const job=jobs.find(j=>j.kind===boxKind&&time>=j.start&&time<j.start+j.duration);if(!job)return;
   const ms=job.pandoraMs,hit=job.pandoraHit;let offset;
   if(ms<hit){
    // A swept clearance starts just above the head, so the descending solid
    // crate pushes the silhouette aside instead of passing through it.
    body.updateWorldMatrix(true,true);job.parts.chest.updateWorldMatrix(true,true);
    const crate=new THREE.Box3().setFromObject(job.parts.chest,true),bounds=new THREE.Box3().setFromObject(body.getObjectByName('Critter body')||body,true),center=crate.getCenter(new THREE.Vector3()),point=body.getWorldPosition(new THREE.Vector3());
    const hat=body.getObjectByName('Headwear');if(hat)bounds.union(new THREE.Box3().setFromObject(hat,true));
    const radius=Math.max(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z)*.5+.12,clearance=Math.max(crate.max.x-crate.min.x,crate.max.z-crate.min.z)*.5+radius;
    const direction=point.clone().sub(center);direction.y=0;const distance=direction.length();
    const touch=smooth((bounds.max.y+.95-crate.min.y)/.8);
    if(distance>=clearance||!touch)return;
    if(distance<.2)direction.copy(job.viewToward||new THREE.Vector3(.2,0,1));direction.y=0;direction.normalize();
    offset=direction.multiplyScalar((clearance-distance)*touch);job.pandoraContacts.set(body,offset.clone());
   }else{const contact=job.pandoraContacts.get(body),recover=1-smooth((ms-hit)/320);if(!contact||recover<=0)return;offset=contact.clone().multiplyScalar(recover);}
   const position=body.position.clone(),world=body.getWorldPosition(new THREE.Vector3()).add(offset);body.position.copy(body.parent?body.parent.worldToLocal(world):world);
   const tilt=-offset.x*.08;body.rotation.z+=tilt;body.updateWorldMatrix(true,true);displaced.set(body,{position,rendered:body.position.clone(),tilt,roll:body.rotation.z});
  },
  destroy(){for(const body of displaced.keys())restore(body);base.destroy();},
 };
}
