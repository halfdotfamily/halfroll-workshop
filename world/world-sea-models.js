import * as THREE from 'three';
import {GLTFLoader} from '../assets/nature-mossfall/vendor/GLTFLoader.js';
import {clone} from '../assets/nature-mossfall/vendor/SkeletonUtils.js';
let assets;
export async function loadSeaModels(){
 assets??=Promise.all(['whale','dolphin','shark','manta','fish-blue','fish-striped'].map(async id=>{
  const gltf=await new GLTFLoader().loadAsync(new URL(`../assets/sea-life/${id}.glb`,import.meta.url).href);
  gltf.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  return[id,{...gltf,size,center}];
 })).then(entries=>new Map(entries)).catch(e=>{assets=null;throw e;});
 const library=await assets;
 return{create(id,length){
  const data=library.get(id),root=new THREE.Group(),model=clone(data.scene),s=length/Math.max(data.size.x,data.size.z);
  root.name=`Quaternius ${id}`;model.scale.setScalar(s);model.position.copy(data.center).multiplyScalar(-s);root.add(model);
  model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const m of Array.isArray(o.material)?o.material:[o.material]){m.roughness=.88;m.metalness=0;m.flatShading=true;const palette={whale:['#405b79','#b9ccc6'],dolphin:['#7497a5','#c2d8d3'],shark:['#557989','#c9d8d1'],manta:['#315d76','#8eadae']}[id];if(palette)m.color.set(palette[/bottom/i.test(m.name)?1:0]);}}});
  const mixer=new THREE.AnimationMixer(model);for(const clip of data.animations)mixer.clipAction(clip).play();
  return{root,height:data.size.y*s,mixer,clips:data.animations.map(a=>a.name),animate:t=>mixer.setTime(t)};
 },count:library.size};
}
