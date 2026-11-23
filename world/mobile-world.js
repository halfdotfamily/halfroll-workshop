import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Keep a freely movable camera over the island, including after a cancelled swipe.
export function constrainMapCamera(camera,target,bounds){
 const next=target.clone();
 next.x=THREE.MathUtils.clamp(next.x,bounds.min.x+8,bounds.max.x-8);
 next.z=THREE.MathUtils.clamp(next.z,bounds.min.z+8,bounds.max.z-8);
 // Screen-space dragging needs room below the shoreline and above the crown.
 // Keep a finite envelope, translating the eye with the target without a snap.
 next.y=THREE.MathUtils.clamp(next.y,-8,32);
 camera.position.add(next.clone().sub(target));target.copy(next);
}

// Only explicitly static scenery is eligible. Keep material identity, shadows,
// transparency, animated objects and the raycastable trail surface intact.
export function batchStaticScenery(roots,excluded=[]){
 const stats={before:0,after:0,merged:0},skip=new Set(excluded);
 for(const root of roots){
  root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),groups=new Map();
  function visit(o){
   if(skip.has(o)||!o.visible)return;
   if(o.isMesh&&!o.isInstancedMesh&&!o.isSkinnedMesh&&!Array.isArray(o.material)&&!o.material.transparent&&!o.material.isShaderMaterial&&!o.geometry.morphAttributes.position){
    const key=[o.material.uuid,o.castShadow,o.receiveShadow,o.renderOrder,...Object.keys(o.geometry.attributes).sort().map(k=>k+o.geometry.attributes[k].itemSize)].join(':');
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
   }
   o.children.forEach(visit);
  }
  visit(root);
  for(const meshes of groups.values()){
   stats.before+=meshes.length;
   if(meshes.length<3){stats.after+=meshes.length;continue;}
   const copies=meshes.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));return g;});
   const geometry=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());
   if(!geometry){stats.after+=meshes.length;continue;}
   geometry.computeBoundingSphere();const first=meshes[0],batch=new THREE.Mesh(geometry,first.material);
   batch.name='Static scenery batch';batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.renderOrder=first.renderOrder;
   meshes.forEach(o=>{while(o.children.length)root.attach(o.children[0]);o.visible=false;});root.add(batch);stats.after++;stats.merged+=meshes.length-1;
  }
 }
 return stats;
}
