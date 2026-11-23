import * as THREE from 'three';
import {GLTFLoader} from '../assets/nature-mossfall/vendor/GLTFLoader.js';

// Short ecological seams connect districts without spreading props uniformly.
export async function buildTransitions(scene,{heightAt,routeDistance,riverSample}){
 const root=new THREE.Group();root.name='Ecological seams between districts';scene.add(root);
 const stats={trees:0,understory:0,rocks:0,drawCalls:0,minRouteClearance:Infinity};
 const loader=new GLTFLoader(),assets=[],dummy=new THREE.Object3D(),occupied=[];
 let seed=76214;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const names=['tree_detailed','tree_oak','plant_bushDetailed','grass_leafsLarge','rock_largeC','flower_yellowC'];
 for(const name of names){
  const {scene:model}=await loader.loadAsync(new URL('../assets/nature-mossfall/'+name+'.glb',import.meta.url).href);model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const transform=new THREE.Matrix4().makeScale(1/size.y,1/size.y,1/size.y).multiply(new THREE.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z));
  const parts=[];model.traverse(n=>{if(!n.isMesh)return;const source=Array.isArray(n.material)?n.material:[n.material];const mats=source.map(m=>new THREE.MeshStandardMaterial({color:/leaf|grass/i.test(m.name)?'#68927a':/wood|bark/i.test(m.name)?'#766651':/yellow/i.test(m.name)?'#d9bb6c':'#a5af96',roughness:1,flatShading:true}));parts.push({geo:n.geometry.clone().applyMatrix4(transform.clone().multiply(n.matrixWorld)),mat:mats.length===1?mats[0]:mats,matrices:[]});});
  assets.push({parts,r:Math.max(size.x,size.z)/size.y/2});
 }
 // Meandering belts between port/garden, grove/village and jungle/volcano.
 const belts=[{x:-5,z:28,rx:12,rz:3.5},{x:12,z:24,rx:6,rz:3},{x:30,z:-11.5,rx:7,rz:3.5},{x:-17,z:-24,rx:5,rz:4}];
 for(let b=0;b<belts.length;b++)for(let i=0;i<155;i++){
  const belt=belts[b],angle=rand()*6.28,r=Math.sqrt(rand()),x=belt.x+Math.cos(angle)*r*belt.rx,z=belt.z+Math.sin(angle)*r*belt.rz;
  const kind=i<20?i%2:2+Math.floor(rand()*4),h=kind<2?2.1+rand()*1.6:kind===4?.45+rand()*.8:.25+rand()*.65,asset=assets[kind],radius=asset.r*h;
  const y=heightAt(x,z),river=riverSample(x,z);
  if(y===null||routeDistance(x,z)<1.75+radius||Math.hypot(x,z)<11+radius||river.distance<river.width/2+radius+.5)continue;
  if(x<-10&&z>30||Math.hypot(x-10.5,z-34)<4.5||Math.hypot(x-26,z+2)<4.5)continue;
  const support=[[-radius*.45,0],[radius*.45,0],[0,radius*.45],[0,-radius*.45]].map(([dx,dz])=>heightAt(x+dx,z+dz));
  if(support.some(v=>v===null||Math.abs(v-y)>(kind<2?.7:1)))continue;
  if(occupied.some(p=>Math.hypot(p.x-x,p.z-z)<(p.r+radius)*.85))continue;
  if(kind<2)occupied.push({x,z,r:radius});
  dummy.position.set(x,y-.04,z);dummy.rotation.set(0,rand()*6.28,0);dummy.scale.setScalar(h);dummy.updateMatrix();asset.parts.forEach(p=>p.matrices.push(dummy.matrix.clone()));
  stats[kind<2?'trees':kind===4?'rocks':'understory']++;stats.minRouteClearance=Math.min(stats.minRouteClearance,routeDistance(x,z)-radius);
 }
 for(const a of assets)for(const p of a.parts){if(!p.matrices.length)continue;const mesh=new THREE.InstancedMesh(p.geo,p.mat,p.matrices.length);p.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);stats.drawCalls++;}
 return{root,stats};
}
