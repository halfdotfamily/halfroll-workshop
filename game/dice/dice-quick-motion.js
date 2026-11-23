import * as THREE from '../../assets/vendor/three/three.module.js';
import {DICE_ROLL_MS,PRESS_SECONDS,supportHeight} from './dice-motion.js';

const UP=new THREE.Vector3(0,1,0);
const NORMALS=[null,UP,new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,-1),new THREE.Vector3(0,-1,0)];
const ease=t=>t*t*(3-2*t),STEP=1/120;
const HALF=.945;
const corners=[];for(const x of [-HALF,HALF])for(const y of [-HALF,HALF])for(const z of [-HALF,HALF])corners.push(new THREE.Vector3(x,y,z));
function contain(p,q,limit){
 const offsets=corners.map(v=>v.clone().applyQuaternion(q));
 const fits=scale=>offsets.every(v=>Math.hypot(p.x*scale+v.x,p.z*scale+v.z)<=limit);
 if(fits(1))return;let lo=0,hi=1;for(let n=0;n<16;n++){const mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid;}p.x*=lo;p.z*=lo;
}

// A bounded cosmetic path for a result that the server has already committed.
// It is deliberately not another physics/RNG attempt. Poses are continuous from
// the current dice through the whole throw; the trajectory is never swapped out
// once visible. Normal prepared physics remains preferred when already ready.
export function createQuickDiceToss(values,{initial,launchHeight=2,innerRadius=5.35}={}){
 if(![1,2].includes(values?.length)||values.some(v=>!Number.isInteger(v)||v<1||v>6))throw Error('One or two D6 results are required');
 if(!initial||initial.length!==values.length)throw Error('Initial poses must match the dice count');
 if(!Number.isFinite(launchHeight)||launchHeight<1||launchHeight>8)throw Error('Launch height must be between 1 and 8');
 const start=initial.map(a=>({p:Array.isArray(a.p)?new THREE.Vector3().fromArray(a.p):a.p.clone(),q:Array.isArray(a.q)?new THREE.Quaternion().fromArray(a.q):a.q.clone()}));
 const duration=(DICE_ROLL_MS+Math.max(0,launchHeight-2)*400)/1000;
 const xDirection=start.length===2?Math.sign(start[1].p.x-start[0].p.x)||1:1,zDirection=start.length===2?Math.sign(start[1].p.z-start[0].p.z)||1:1;
 const finish=values.map((value,i)=>{
  const yaw=new THREE.Quaternion().setFromAxisAngle(UP,(i?-.35:.3)+value*.07);
  const q=yaw.multiply(new THREE.Quaternion().setFromUnitVectors(NORMALS[value],UP));
  return{p:new THREE.Vector3(values.length===1?0:(i?1.7:-1.7)*xDirection,supportHeight(q),values.length===1?0:(i?.85:-.85)*zDirection),q};
 });
 let closePair=false;
 if(start.length===2){
  const from=start[1].p.clone().sub(start[0].p);from.y=0;const to=finish[1].p.clone().sub(finish[0].p);to.y=0;const delta=to.clone().sub(from),at=delta.lengthSq()?THREE.MathUtils.clamp(-from.dot(delta)/delta.lengthSq(),0,1):0;
  closePair=from.addScaledVector(delta,at).length()<3.4;
 }
 const pack=p=>({p:p.p.toArray(),q:p.q.toArray()}),frames=[];
 const count=Math.ceil((duration-PRESS_SECONDS)/STEP);
 for(let f=0;f<=count;f++){
  // Hydration samples at fixed 120Hz; hold the last two frames so a fractional
  // duration cannot leave a die a fraction of a rotation above its final face.
  const u=Math.min(1,f/(count-2)),travel=ease(u),rotationAge=closePair?Math.max(0,(u-.12)/.88):u,spin=ease(Math.min(1,rotationAge/.86));
  const frame=start.map((a,i)=>{
   if(f===0)return{p:a.p.clone(),q:a.q.clone()};if(u===1)return{p:finish[i].p.clone(),q:finish[i].q.clone()};
   const p=a.p.clone().lerp(finish[i].p,travel);
   const axis=new THREE.Vector3(i?1:-1,.35,.2).normalize(),rotation=new THREE.Quaternion().setFromAxisAngle(axis,Math.PI*2*(3+i)*spin);
   const q=a.q.clone().slerp(finish[i].q,ease(rotationAge)).premultiply(rotation);
   const arc=u<.62?Math.sin(Math.PI*u/.62)*launchHeight*2.2:Math.abs(Math.sin((u-.62)/.38*Math.PI*3))*.5*(1-u)/.38;
   // A close/stacked pair peels vertically apart before it starts spinning.
   // This smooth lane separation avoids collision correction or a pose pop.
   p.y=Math.max(supportHeight(q),p.y+arc+(closePair&&i?Math.sin(Math.PI*u)*5:0));
   contain(p,q,innerRadius-.002);return{p,q};
  });
  frames.push(frame.map(pack));
 }
 return{values:[...values],duration,attempts:0,limit:innerRadius,launchHeight,events:[{time:PRESS_SECONDS+(duration-PRESS_SECONDS)*.62,strength:.65,pan:0,kind:'felt'}],frames,start:start.map(pack),fallback:'bounded-arc'};
}
