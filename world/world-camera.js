import * as THREE from '../assets/vendor/three/three.module.js';

// Orthographic depth protection moves the eye, without changing the picture.
// Move atmospheric depth with it so a safe pan cannot fog out the island.
export function stabilizeMapFog(fog,radius,{base=134,near=220,far=600}={}){
 const shift=Math.max(0,radius-base);fog.near=near+shift;fog.far=far+shift;
}

/** Orthographic magnification is independent of camera distance. Move the eye
 * backward only when necessary; preserve the user's target, framing and angle. */
export function protectCameraView(camera,target,bounds,seaY=-3.04){
 camera.updateMatrixWorld(true);
 const back=camera.position.clone().sub(target).normalize();
 const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
 const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
 const cx=(camera.left+camera.right)/2,cy=(camera.top+camera.bottom)/2;
 const hw=(camera.right-camera.left)/(2*camera.zoom),hh=(camera.top-camera.bottom)/(2*camera.zoom);
 const offsets=[];for(const x of [cx-hw,cx+hw])for(const y of [cy-hh,cy+hh])offsets.push(right.clone().multiplyScalar(x).addScaledVector(up,y));
 const corners=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z));
 const margin=16,elevation=Math.max(.05,back.y);
 const before=camera.position.distanceTo(target);
 const radius=Math.max(before,...corners.map(p=>p.clone().sub(target).dot(back)+margin),...offsets.map(p=>margin+(seaY-target.y-p.y)/elevation));
 if(radius>before+.00001){camera.position.copy(target).addScaledVector(back,radius);camera.updateMatrixWorld(true);}
 const depths=corners.map(p=>camera.position.clone().sub(p).dot(back));
 const seaCorners=offsets.map(offset=>{const origin=camera.position.clone().add(offset),depth=(origin.y-seaY)/elevation;depths.push(depth);return origin.addScaledVector(back,-depth);});
 const far=Math.max(650,Math.max(...depths)+32);
 if(Math.abs(camera.far-far)>.01){camera.far=far;camera.updateProjectionMatrix();}
 return{radius,minDepth:Math.min(...depths),maxDepth:Math.max(...depths),seaBounds:{minX:Math.min(...seaCorners.map(p=>p.x))-24,maxX:Math.max(...seaCorners.map(p=>p.x))+24,minZ:Math.min(...seaCorners.map(p=>p.z))-24,maxZ:Math.max(...seaCorners.map(p=>p.z))+24}};
}
