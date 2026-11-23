import * as THREE from 'three';
import {GLTFLoader} from '../assets/nature-mossfall/vendor/GLTFLoader.js';
import {ROUTE} from './route/board-art.js';
import {edgeHeight} from './terrain.js';
export async function buildMossfallLandmarks(scene,{heightAt}){
 const root=new THREE.Group();root.name='Blender authored Mossfall landmarks';scene.add(root);
 const loader=new GLTFLoader(),base=new URL('../assets/mossfall-landmarks/',import.meta.url);
 const [shrine,bridge]=await Promise.all(['mossfall-half-arch-shrine.glb','mossfall-rope-footbridge.glb'].map(name=>loader.loadAsync(new URL(name,base).href).then(g=>g.scene)));
 for(const item of [shrine,bridge])item.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 const sx=-20,sz=9,sy=Math.max(...[[-1.95,-1.4],[1.95,-1.4],[-1.95,1.4],[1.95,1.4]].map(([x,z])=>heightAt(sx+x,sz+z)))+.08;
 shrine.position.set(sx,sy,sz);root.add(shrine);
 const foundation=new THREE.Mesh(new THREE.BoxGeometry(4.15,1.3,3.05),new THREE.MeshStandardMaterial({color:'#aaa88a',roughness:1}));foundation.position.set(sx,sy-.65,sz);foundation.castShadow=true;foundation.receiveShadow=true;root.add(foundation);
 // Follow the actual curved, uphill road through cells 16–18. Widen the
 // rail footprint so it clears both bevelled tile edges; the deck stays below.
 bridge.updateMatrixWorld(true);
 const vertex=new THREE.Vector3();
 bridge.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
   vertex.fromBufferAttribute(position,i);
   const along=15+(vertex.x+3.14)/6.28*3;
   const cell=Math.min(17,Math.floor(along)),fraction=along-cell,strip=ROUTE.cells[cell].strip;
   const f=fraction*(strip.length-1),k=Math.min(strip.length-2,Math.floor(f)),mix=f-k;
   const a=strip[k],b=strip[k+1];
   const cx=THREE.MathUtils.lerp(a.center.x,b.center.x,mix),cz=THREE.MathUtils.lerp(a.center.y,b.center.y,mix);
   const rx=THREE.MathUtils.lerp(a.right.x,b.right.x,mix)-cx,rz=THREE.MathUtils.lerp(a.right.y,b.right.y,mix)-cz;
   const length=Math.hypot(rx,rz),across=vertex.z*1.25;
   position.setXYZ(i,(cx-800)*.065+rx/length*across,edgeHeight(along)-.10+vertex.y,(cz-655)*.065+rz/length*across);
  }
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  mesh.geometry=geometry;mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);mesh.updateMatrix();
 });
 bridge.name='Road-aligned Mossfall bridge';root.add(bridge);
 return{root,stats:{importedGLBs:2,shrine:{x:sx,y:sy,z:sz},bridge:{sections:[16,17,18],routeAligned:true,railWidthScale:1.25,deckOffset:-.10},triangles:32940}};
}
