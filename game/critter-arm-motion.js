import * as THREE from 'three';

// Cosmetic, allocation-free after the first sample. Props belong to the wrist,
// so a breathing/walking hand never leaves its item behind on the body.
const UP=new THREE.Vector3(0,1,0),cache=new WeakMap();
const a=new THREE.Vector3(),b=new THREE.Vector3(),direction=new THREE.Vector3();
export function setInkArmPose(rig,end,elbow){
 const posed=rig.getObjectByName('Posed ink arm');if(!posed)return;
 posed.visible=true;rig.getObjectByName(rig.name.startsWith('Left')?'Left thin arm':'Right thin arm').visible=false;
 for(let i=0;i<2;i++){
  if(i===0){a.set(0,0,0);b.copy(elbow);}else{a.copy(elbow);b.copy(end);}
  const segment=posed.children[i];direction.subVectors(b,a);segment.position.copy(a).add(b).multiplyScalar(.5);
  segment.quaternion.setFromUnitVectors(UP,direction.normalize());segment.scale.y=a.distanceTo(b);
 }
 posed.getObjectByName('Soft elbow').position.copy(elbow);
 rig.getObjectByName(rig.name.startsWith('Left')?'Left wrist':'Right wrist').position.copy(end);
}
function nodes(body){
 let value=cache.get(body);if(value)return value;
 value=['Left','Right'].map((side,index)=>{
  const rig=body.getObjectByName(side+' gesture arm');if(!rig)return null;
  return{rig,wrist:rig.getObjectByName(side+' wrist'),sign:index?1:-1,end:new THREE.Vector3(),elbow:new THREE.Vector3()};
 }).filter(Boolean);cache.set(body,value);return value;
}
export function animateCritterArms(body,time,{walking=false,reduced=false,phase=0}={}){
 if(reduced)return;
 const identity=Number(body.userData.characterId)||0,t=time+phase+identity*.19;
 for(const n of nodes(body)){
  const {rig,wrist,sign,end,elbow}=n,held=rig.userData.held;
  end.fromArray(rig.userData.restHand);elbow.fromArray(rig.userData.restElbow);
  const breath=Math.sin(t*1.9+sign*.45),stride=Math.sin(t*8.2+sign*Math.PI*.5);
  if(held){
   end.x+=sign*.007*breath;end.y+=.012*breath+(walking?.020*Math.cos(t*8.2):0);end.z+=.008*Math.cos(t*1.6)+(walking?.025*stride:0);
   elbow.x+=sign*.009*breath;elbow.y+=.006*breath;elbow.z+=walking?.014*stride:0;
   wrist.rotation.set((walking?.025*stride:0)+.012*breath,0,.017*breath);
  }else{
   end.x+=sign*.014*breath;end.y+=.016*breath+(walking?.045*Math.cos(t*8.2+sign):0);end.z+=.018*Math.cos(t*1.5)+(walking?.14*stride:0);
   elbow.x+=sign*.011*breath;elbow.z+=walking?.06*stride:0;
   wrist.rotation.set(walking?.12*stride:.035*breath,sign*.025*breath,.045*breath);
  }
  setInkArmPose(rig,end,elbow);
 }
}
