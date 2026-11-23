import * as THREE from 'three';
import {COAST,heightAt,routeDistance} from './terrain.js';

// Coastal dressing is rooted into the existing shore, leaving the road and outlet open.
export function buildMossfallCoast(scene){
 const root=new THREE.Group();root.name='Mossfall weathered coast';scene.add(root);
 let seed=803;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const stone=new THREE.IcosahedronGeometry(1,0),leaf=new THREE.IcosahedronGeometry(1,1),twig=new THREE.CylinderGeometry(1,1,1,5);
 const material=new THREE.MeshStandardMaterial({color:'white',roughness:1,flatShading:true});
 const groups=new Map(),dummy=new THREE.Object3D();
 const stats={crags:0,shoreRocks:0,mossShelves:0,vines:0,foamArcs:0};
 function stamp(type,geometry,x,y,z,sx,sy,sz,color,yaw=0){
  if(!groups.has(type))groups.set(type,{geometry,matrices:[],colors:[]});
  dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,yaw,0);dummy.updateMatrix();
  const batch=groups.get(type);batch.matrices.push(dummy.matrix.clone());batch.colors.push(new THREE.Color(color));
 }
 function coastAt(z){for(let i=0;i<COAST.length;i++){const a=COAST[i],b=COAST[(i+1)%COAST.length];if(a.x>-38||b.x>-38||z<Math.min(a.z,b.z)||z>Math.max(a.z,b.z))continue;return a.x+(b.x-a.x)*(z-a.z)/(b.z-a.z);}return null;}
 for(let z=-12;z<34;z+=1.1+rand()*2.9){
  const edge=coastAt(z);if(edge===null||Math.abs(z-11.4)<2.6)continue;
  const top=heightAt(edge+.18,z);if(top===null)continue;
  const r=.75+rand()*1.1,crest=top-.15-rand()*1.8,base=-4.2;
  // Embedded columns break the formerly straight outer silhouette.
  stamp('stone',stone,edge-.18,(crest+base)/2,z,r,(crest-base)*.62,.75+rand()*1.2,['#7c9187','#9aaa94','#657d78'][Math.floor(rand()*3)],rand()*.9);
  stats.crags++;
  // Broad interlocking tidal boulders, partially submerged rather than floating.
  for(let j=0;j<2;j++){
   const s=.55+rand()*.85;
   stamp('stone',stone,edge-.7-rand()*1.7,-3.8+s*.28,z+(rand()-.5)*1.7,s*1.3,s,s,['#6e8981','#90a99b','#b5bc9f'][j%3],rand()*6.28);stats.shoreRocks++;
  }
  const shelfY=crest-.25,reach=r*.85;
  stamp('stone',stone,edge-.15,shelfY-.4,z,reach,.65,.75+rand()*.4,'#9aaa90',rand());
  if(rand()<.65){stamp('moss',leaf,edge-.1,shelfY+.04,z,reach*.8,.16+rand()*.15,.45+rand()*.4,'#72a989',rand());stats.mossShelves++;}
  // The small upper plants stay on sampled land, away from numbered sections.
  if(rand()<.35&&routeDistance(edge+.55,z)>2.1){
   const ground=heightAt(edge+.55,z);
   for(let j=0;j<4;j++){const h=.12+rand()*.3;stamp('moss',leaf,edge+.6+(rand()-.5)*.4,ground+h*.6,z+(rand()-.5)*1.1,.21+rand()*.2,h,.17+rand()*.2,j%2?'#9bc49a':'#6b9c7b',rand()*6.28);}
  }
  if(rand()<.82){
   const length=Math.min(shelfY+3.1,1.1+rand()*2.4),x=edge-.18-r*.9;
   stamp('vine',twig,x,shelfY-length/2,z,.035,length,.035,'#537b62');
   for(let k=0;k<length;k+=.27){const side=Math.round(k/.27)%2?1:-1;stamp('moss',leaf,x-.07,shelfY-k,z+side*.12,.1,.21,.18,k%1>.5?'#94bd8d':'#588d71',side*.6);}
   stats.vines++;
  }
 }
 for(const [name,batch] of groups){const mesh=new THREE.InstancedMesh(batch.geometry,material,batch.matrices.length);batch.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,batch.colors[i]);});mesh.name=`Coastal ${name}`;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
 // Broken surf strokes follow the visible rock foot; no billboard rings or glare.
 const foamPositions=[];
 for(let z=-12;z<34;z+=1.7+rand()*1.5){
  const edge=coastAt(z);if(edge===null||Math.abs(z-11.4)<2.5)continue;
  const radius=1.1+rand()*.8,cx=edge-2.2;
  for(let i=0;i<14;i++){
   const a=Math.PI*.57+i/14*Math.PI*.86,b=Math.PI*.57+(i+1)/14*Math.PI*.86;
   const p=t=>[cx+Math.cos(t)*radius,-3.72,z+Math.sin(t)*radius*.8];
   const q=t=>[cx+Math.cos(t)*(radius+.07),-3.72,z+Math.sin(t)*(radius+.07)*.8];
   foamPositions.push(...p(a),...p(b),...q(b),...p(a),...q(b),...q(a));
  }stats.foamArcs++;
 }
 const foamGeo=new THREE.BufferGeometry();foamGeo.setAttribute('position',new THREE.Float32BufferAttribute(foamPositions,3));
 const foam=new THREE.Mesh(foamGeo,new THREE.MeshBasicMaterial({color:'#d0e5cf',transparent:true,opacity:.36,depthWrite:false,side:THREE.DoubleSide}));root.add(foam);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 return{root,stats,update:t=>{foam.material.opacity=reduced ? .36 : .31+Math.sin(t*.7)*.06;}};
}
