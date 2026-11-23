import * as THREE from 'three';
import {MOSSFALL,riverSample} from './biome-layout.js';

// Low, wide, interlocking strata, never vertically stretched pointed crystals.
// Every piece intersects the sampled terrain over its actual footprint.
export function buildRiverRocks(scene,{heightAt,routeDistance}){
 const geometry=new THREE.DodecahedronGeometry(1,0),mat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true});
 const matrices=[],colors=[],stamp=new THREE.Object3D(),placements=[];let seed=192;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 function rock(x,z,rx,rz,h,layer=0){
  if(routeDistance(x,z)<1.67+Math.max(rx,rz))return;
  const water=riverSample(x,z);
  if(water.distance<water.width/2+Math.min(rx,rz)*.55)return;
  const samples=[[0,0],[rx*.7,0],[-rx*.7,0],[0,rz*.7],[0,-rz*.7]].map(([dx,dz])=>heightAt(x+dx,z+dz));
  if(samples.some(v=>v===null))return;
  // Bury the lower half in the slope. On a steep face a wide slab emerges
  // horizontally, while its uphill half remains embedded in the continuous hill.
  const floor=Math.min(...samples)-.18;
  const y=floor+h*.22;
  stamp.position.set(x,y,z);stamp.scale.set(rx,h,rz);stamp.rotation.set((rand()-.5)*.13,rand()*Math.PI,(rand()-.5)*.1);stamp.updateMatrix();matrices.push(stamp.matrix.clone());
  colors.push(new THREE.Color('#627d79').lerp(new THREE.Color(layer?'#b3b69d':'#9ba991'),rand()*.8));
  placements.push({x,z,y,floor,rx,rz,h});
 }
 for(let i=0;i<MOSSFALL.river.length-2;i++){
  const a=MOSSFALL.river[i],b=MOSSFALL.river[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  const count=Math.max(2,Math.ceil(len/1.2));
  for(let step=0;step<count;step++)for(const side of [-1,1]){
   if(rand()<.2)continue;
   const t=(step+.15+rand()*.7)/count,w=a.width+(b.width-a.width)*t;
   const r=.55+rand()*.55,offset=w/2+r*.8+.38;
   const x=a.x+dx*t+dz/len*offset*side,z=a.z+dz*t-dx/len*offset*side;
   rock(x,z,r*(1.05+rand()*.45),r*(.75+rand()*.4),.34+rand()*.43);
   if(rand()<.55){const outward=1.05+rand()*.65;rock(x+dz/len*outward*side,z-dx/len*outward*side,r*1.3,r*.95,.4+rand()*.4,1);}
  }
 }
 // Staggered horizontal buttresses flank the cascades, leaving their apron open.
 for(const fall of MOSSFALL.falls.slice(0,2))for(const side of [-1,1])for(let j=0;j<4;j++){
  const t=(j+.4)/4,z=THREE.MathUtils.lerp(fall.from.z,fall.to.z,t),x=THREE.MathUtils.lerp(fall.from.x,fall.to.x,t)+side*(fall.width/2+1.05+rand()*.45);
  rock(x,z,.9+rand()*.45,.62+rand()*.45,.38+rand()*.35,1);
 }
 const mesh=new THREE.InstancedMesh(geometry,mat,matrices.length);matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,colors[i]);});mesh.name='Embedded horizontal river strata';mesh.castShadow=mesh.receiveShadow=true;
 mesh.userData.grounding=placements;mesh.userData.maximumVerticalRadius=Math.max(...placements.map(p=>p.h));
 // Restore the lower gorge's substantial rock buttresses near the bridge only.
 // Their lower ends reach into the riverbank, while their backs embed in the hill.
 const lower=[],lowerColors=[];
 for(const [z,extra,r] of [[-1.2,1.35,1.0],[.5,1.65,1.15],[2.2,1.32,.95],[4.15,1.6,1.15],[6.15,1.45,1.1],[7.9,1.75,1.05]]){
  const s=riverSample(-30,z),x=s.x+s.width/2+extra,ground=heightAt(x,z);
  if(ground===null||routeDistance(x,z)<1.7+r||s.distance>s.width)continue;
  const bottom=s.y-.55,crest=Math.max(bottom+2.3,ground+.55),h=(crest-bottom)/2;
  stamp.position.set(x,bottom+h,z);stamp.scale.set(r,h,r*.83);stamp.rotation.set(.025,rand()*.8,.025);stamp.updateMatrix();
  lower.push(stamp.matrix.clone());lowerColors.push(new THREE.Color('#85978f').lerp(new THREE.Color('#b4b9a3'),rand()*.6));
 }
 const buttresses=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),mat,lower.length);lower.forEach((m,i)=>{buttresses.setMatrixAt(i,m);buttresses.setColorAt(i,lowerColors[i]);});buttresses.name='Restored lower gorge buttresses';buttresses.castShadow=buttresses.receiveShadow=true;mesh.add(buttresses);mesh.userData.lowerGorgeButtresses=lower.length;
 scene.add(mesh);return mesh;
}
