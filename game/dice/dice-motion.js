import * as THREE from '../../assets/vendor/three/three.module.js';
import * as CANNON from '../../assets/vendor/cannon-es/cannon-es.js';

import {DICE_ROLL_MS,DICE_PHASE_MS} from './dice-timing.js';
export {DICE_ROLL_MS,DICE_PHASE_MS};
export const PRESS_SECONDS=.24;
const HALF=.945,STEP=1/120;
const UP=new THREE.Vector3(0,1,0);
const normals=[null,UP,new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,0,-1),new THREE.Vector3(0,-1,0)];
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function supportHeight(q){const m=new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w)).elements;return HALF*(Math.abs(m[1])+Math.abs(m[5])+Math.abs(m[9]));}
export function springOffset(seconds){if(seconds<0)return 0;if(seconds<PRESS_SECONDS)return -.19*Math.sin(Math.PI*seconds/PRESS_SECONDS);const t=seconds-PRESS_SECONDS;return .13*Math.sin(t*18)*Math.exp(-t*5);}
export function topFace(q){let best=1,height=-1;for(let i=1;i<=6;i++){const y=normals[i].clone().applyQuaternion(q).y;if(y>height){height=y;best=i;}}return{value:best,alignment:height};}

/** Replay an entire rigid-body throw. Rejection sampling finds engine-specified faces;
 * no poses, pips, or results are corrected once the visible throw begins. */
export function createDiceToss(values,options){const steps=diceTossSteps(values,options);let step;do{step=steps.next();}while(!step.done);return step.value;}
// The no-Worker path uses the identical solver in short cooperative slices.
export async function createDiceTossAsync(values,options={},signal){
 const steps=diceTossSteps(values,options);let last=performance.now();
 for(;;){if(signal?.aborted)throw signal.reason||Error('Dice preparation cancelled');const step=steps.next();if(step.done)return step.value;if(performance.now()-last>=8){await new Promise(resolve=>setTimeout(resolve,0));last=performance.now();}}
}
function* diceTossSteps(values,{seed=globalThis.crypto.getRandomValues(new Uint32Array(1))[0],innerRadius=5.35,initial,launchHeight=1}={}){
 if(![1,2].includes(values.length)||values.some(v=>!Number.isInteger(v)||v<1||v>6))throw Error('One or two D6 results are required');
 if(initial&&initial.length!==values.length)throw Error('Initial poses must match the dice count');
 if(!Number.isFinite(launchHeight)||launchHeight<1||launchHeight>8)throw Error('Launch height must be between 1 and 8');
 const durationMs=DICE_ROLL_MS+Math.max(0,launchHeight-2)*400;
 const random=rng(seed),start=initial?.map(p=>({p:p.p.clone(),q:p.q.clone()}))||(values.length===1?[0]:[-1,1]).map(side=>({p:new THREE.Vector3(side*2,HALF,0),q:new THREE.Quaternion()}));
 const guided=launchHeight>1&&start.some(p=>Math.hypot(p.p.x,p.p.z)>innerRadius-1.85);
 const closePair=start.length===2&&Math.hypot(start[0].p.x-start[1].p.x,start[0].p.z-start[1].p.z)<HALF*2+.15;
 const world=new CANNON.World({gravity:new CANNON.Vec3(0,-22,0),allowSleep:true});world.solver.iterations=14;world.solver.tolerance=.00001;
 world.defaultContactMaterial.friction=.38;world.defaultContactMaterial.restitution=.28;world.defaultContactMaterial.contactEquationStiffness=1e8;
 const ground=new CANNON.Body({mass:0,shape:new CANNON.Plane()});ground.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(ground);
 const wallMaterial=new CANNON.Material();world.addContactMaterial(new CANNON.ContactMaterial(wallMaterial,world.defaultMaterial,{friction:.25,restitution:.42}));
 for(let i=0;i<24;i++){const a=i*Math.PI/12,b=new CANNON.Body({mass:0,material:wallMaterial,shape:new CANNON.Box(new CANNON.Vec3(.5,3,innerRadius*Math.tan(Math.PI/24)+.04))});b.position.set(Math.cos(a)*(innerRadius+.5),2,Math.sin(a)*(innerRadius+.5));b.quaternion.setFromEuler(0,-a,0);world.addBody(b);}
 const bodies=start.map(p=>{const b=new CANNON.Body({mass:1,material:world.defaultMaterial,shape:new CANNON.Box(new CANNON.Vec3(HALF,HALF,HALF)),linearDamping:.16,angularDamping:.3,sleepSpeedLimit:.18,sleepTimeLimit:.22});world.addBody(b);return b;});
 let events,frames,time=0,lastHit,attempt=0;
 bodies.forEach((b,i)=>b.addEventListener('collide',e=>{const speed=Math.abs(e.contact.getImpactVelocityAlongNormal());if(speed>.65&&time-lastHit[i]>.07){events.push({time:time+PRESS_SECONDS,strength:Math.min(1,speed/8),pan:b.position.x/innerRadius*.6,kind:e.body===ground?'felt':bodies.includes(e.body)?'dice':'rim'});lastHit[i]=time;}}));
 const snapshot=()=>bodies.map(b=>({p:new THREE.Vector3(b.position.x,Math.max(supportHeight(b.quaternion),b.position.y),b.position.z),q:new THREE.Quaternion(b.quaternion.x,b.quaternion.y,b.quaternion.z,b.quaternion.w)}));
 for(;attempt<1600;attempt++){
  events=[];frames=[];lastHit=[-1,-1];world.time=0;world.stepnumber=0;
  bodies.forEach((b,i)=>{
   const p=start[i],nearRim=launchHeight>1&&Math.hypot(p.p.x,p.p.z)>innerRadius-1.85;
   // A resting corner at the wall can turn the upward impulse into wall friction.
   // Aim inward, reduce the first spin and give that real launch more lift. Every
   // candidate still starts at the exact previous pose and obeys the same face,
   // height, settling and containment checks; no in-flight correction is applied.
   const inward=nearRim?1.2:.85,spin=nearRim?.22:closePair?.4:1;
   b.position.copy(p.p);b.position.y=Math.max(HALF,p.p.y)+.008;b.quaternion.copy(p.q);
   b.velocity.set((random()-.5)*4-p.p.x*inward+(closePair?(i?3.5:-3.5):0),(10.2+random()*1.4)*Math.sqrt(launchHeight)*(nearRim?1.6:closePair?1.35:1),(random()-.5)*4-p.p.z*inward);
   b.velocity.x/=Math.sqrt(Math.max(1,launchHeight/2));b.velocity.z/=Math.sqrt(Math.max(1,launchHeight/2));
   b.angularVelocity.set((random()-.5)*20*spin,(random()-.5)*14*spin,(random()-.5)*20*spin);
   b.force.setZero();b.torque.setZero();b.wakeUp();b.aabbNeedsUpdate=true;
  });
  frames.push(snapshot());
  for(let f=1;f<=Math.ceil((durationMs/1000-PRESS_SECONDS)/STEP);f++){
   time=f*STEP;
   // The trampoline's gentle lateral spring/damping keeps a strong edge launch
   // over the felt. These are ordinary simulated forces, independent of the
   // requested faces; both translation and rotation remain the solver's result.
   if(guided)for(const b of bodies){b.force.x+=-5*b.position.x-3*b.velocity.x;b.force.z+=-5*b.position.z-3*b.velocity.z;}
   world.step(STEP);frames.push(snapshot());
   if(f%32===0)yield;
  }
  const end=frames.at(-1);
  // A near-rim collision can smother the launch. Choose another complete throw
  // before playback so both dice visibly rise, without altering motion in flight.
  if(end.every((p,i)=>{const top=topFace(p.q);return p.p.y<HALF+.03&&top.value===values[i]&&top.alignment>.9999&&bodies[i].sleepState===CANNON.Body.SLEEPING&&frames.some(frame=>frame[i].p.y>HALF+(3.1-HALF)*launchHeight)&&(launchHeight===1||frames.every(frame=>Math.hypot(frame[i].p.x,frame[i].p.z)<innerRadius));}))break;
 }
 if(attempt===1600)throw Error('Unable to prepare a settled dice throw: '+JSON.stringify({seed,values,start:start.map(p=>({p:p.p.toArray(),q:p.q.toArray()}))}));
 return hydrateDiceToss({seed,values:[...values],duration:durationMs/1000,attempts:attempt+1,limit:innerRadius,launchHeight,events,frames,start});
}
export function hydrateDiceToss(data){
 const pose=p=>({p:p.p.isVector3?p.p:new THREE.Vector3().fromArray(p.p),q:p.q.isQuaternion?p.q:new THREE.Quaternion().fromArray(p.q)});
 const frames=data.frames.map(frame=>frame.map(pose)),start=data.start.map(pose),innerRadius=data.limit;
 return{...data,frames,start,sample(seconds){
  if(data.windup && seconds<PRESS_SECONDS){
   const fraction=Math.max(0,seconds/PRESS_SECONDS),t=fraction*fraction*(3-2*fraction);
   return start.map((s,i)=>{const q=s.q.clone().slerp(frames[0][i].q,t),p=s.p.clone().lerp(frames[0][i].p,t);p.y=supportHeight(q)+springOffset(seconds);return {p,q};});
  }
  if(seconds<PRESS_SECONDS)return start.map(p=>({p:p.p.clone().add(new THREE.Vector3(0,springOffset(Math.max(0,seconds))*Math.max(0,1-(p.p.x*p.p.x+p.p.z*p.p.z)/(innerRadius*innerRadius))**2,0)),q:p.q.clone()}));
  const at=THREE.MathUtils.clamp((seconds-PRESS_SECONDS)/(data.frameStep??STEP),0,frames.length-1),i=Math.floor(at),t=at-i,a=frames[i],b=frames[Math.min(i+1,frames.length-1)];
  return a.map((pose,j)=>{const q=pose.q.clone().slerp(b[j].q,t),p=pose.p.clone().lerp(b[j].p,t);p.y=Math.max(p.y,supportHeight(q));return{p,q};});
 }};
}
