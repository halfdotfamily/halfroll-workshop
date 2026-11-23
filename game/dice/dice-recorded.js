import * as THREE from '../../assets/vendor/three/three.module.js';
import {clips} from './dice-recordings.js';

const up = new THREE.Vector3(0, 1, 0);
const faces = [null, up, new THREE.Vector3(0,0,1), new THREE.Vector3(1,0,0),
 new THREE.Vector3(-1,0,0), new THREE.Vector3(0,0,-1), new THREE.Vector3(0,-1,0)];

// Sampled Practice simulations for a cold or overloaded worker. A cube symmetry
// assigns the server faces before launch. Every bounce and contact stays recorded.
export function recordedToss(values, job) {
 const choices = clips.filter(clip => clip.count === values.length);
 const clip = choices.reduce((a,b) => Math.abs(a.height-job.launchHeight) <= Math.abs(b.height-job.launchHeight) ? a : b);
 const bytes = Uint8Array.from(atob(clip.data), c => c.charCodeAt(0));
 const numbers = new Int16Array(bytes.buffer);
 const turns = values.map((value,i) => new THREE.Quaternion().setFromUnitVectors(faces[value],faces[clip.faces[i]]));
 const [first,second] = job.initial;
 const angle = second ? Math.atan2(first.p[2]-second.p[2],second.p[0]-first.p[0]) : Math.random()*2*Math.PI;
 const yaw = new THREE.Quaternion().setFromAxisAngle(up,angle);
 const frames = [];
 let cursor = 0;
 const next = () => numbers[cursor++]/1024;
 while(cursor < numbers.length) frames.push(values.map((_,i) => ({
  p:new THREE.Vector3(next(),next(),next()).applyQuaternion(yaw),
  q:new THREE.Quaternion(next(),next(),next(),next()).normalize().premultiply(yaw).multiply(turns[i])
 })));
 return {values:[...values],duration:clip.duration,launchHeight:clip.height,limit:job.innerRadius,attempts:0,
  events:clip.events,frames,start:job.initial,windup:frames[0],frameStep:1/30,fallback:'practice-replay'};
}
