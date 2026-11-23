import * as THREE from 'three';
import {COAST,heightAt} from './terrain.js';
import {START_COURT} from './harbor-layout.js';
import {coastDistrict} from './coast-layout.js';
export function buildWorldEdge(scene){
 const root=new THREE.Group();root.name='Island coastal geology';const geo=new THREE.IcosahedronGeometry(1,0),mat=new THREE.MeshStandardMaterial({color:'white',roughness:1,flatShading:true}),list=[],colors=[],dummy=new THREE.Object3D();
 let seed=782;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 function put(x,y,z,sx,sy,sz,color,yaw){dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(.05,yaw,.05);dummy.updateMatrix();list.push(dummy.matrix.clone());colors.push(new THREE.Color(color));}
 for(let i=0;i<COAST.length;i++){
  const a=COAST[i],b=COAST[(i+1)%COAST.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len;
  for(let d=1.2;d<len;d+=2.2+rand()*2.3){const t=d/len,x=a.x+dx*t,z=a.z+dz*t;if(x<-38&&z<35)continue;if(Math.abs(x+18.8)<3.1&&z>38)continue;
   if(Math.hypot(x-START_COURT.x,z-START_COURT.z)<START_COURT.radius+1.3)continue;
   if(coastDistrict(x,z)!=='preserved')continue;
   const top=heightAt(x-nx*.22,z-nz*.22);if(top===null)continue;
   const volcanic=z<-24&&x>-16,stone=volcanic?'#5b626c':z>34?'#adac8b':'#81978a',r=.65+rand()*1.1,h=(top+4.3)/1.65*(.72+rand()*.28);
   // Leave the masonry relief at Drift Dock visible; keep its tidal footing.
   if(!(x>-30&&x<-22&&z>38))put(x+nx*.18,-4.3+h*.8,z+nz*.18,r,h,r*(.9+rand()*.5),stone,rand()*2);
   for(let j=0;j<2;j++){const s=.4+rand()*.75;put(x+nx*(r*.7+.4+j*.5),-3.85+s*.3,z+nz*(r*.7+.4+j*.5),s*1.3,s,s,volcanic?'#73737a':'#9da991',rand()*4);}
  }
 }
 const mesh=new THREE.InstancedMesh(geo,mat,list.length);list.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,colors[i]);});mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 // Three separated flat-headed sea stacks mark the narrow ecological inlet.
 // Ring offsets produce fractured faces, not a row of identical pointed stones.
 const positions=[],indices=[],sides=7,rings=[0,.16,.52,.86,1],radii=[.78,1,.91,.63,.67];
 for(let k=0;k<rings.length;k++)for(let i=0;i<sides;i++){const a=i*Math.PI*2/sides,r=radii[k]*(1+.12*Math.sin(i*2.3+k*.7));positions.push(Math.cos(a)*r+k*.025,rings[k],Math.sin(a)*r);}
 for(let k=0;k<rings.length-1;k++)for(let i=0;i<sides;i++){const a=k*sides+i,b=k*sides+(i+1)%sides,c=b+sides,d=a+sides;indices.push(a,c,b,a,d,c);}
 positions.push(.1,1,0);const top=positions.length/3-1;for(let i=0;i<sides;i++)indices.push(top,4*sides+(i+1)%sides,4*sides+i);
 const stackGeo=new THREE.BufferGeometry();stackGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));stackGeo.setIndex(indices);stackGeo.computeVertexNormals();
 const stacks=[{x:43.7,z:-16.1,h:7.6,r:1.2,a:.3},{x:46.2,z:-12.5,h:4.1,r:.95,a:1.3},{x:44.1,z:-20.2,h:2.55,r:1.55,a:2.1}];
 const stackMesh=new THREE.InstancedMesh(stackGeo,new THREE.MeshStandardMaterial({color:'#73877f',roughness:1,flatShading:true}),stacks.length);
 stacks.forEach((p,i)=>{dummy.position.set(p.x,-4.45,p.z);dummy.scale.set(p.r,p.h,p.r*.8);dummy.rotation.set(0,p.a,0);dummy.updateMatrix();stackMesh.setMatrixAt(i,dummy.matrix);});stackMesh.castShadow=stackMesh.receiveShadow=true;stackMesh.name='Three freestanding tidal stacks';root.add(stackMesh);
 scene.add(root);return{root,stats:{rocks:list.length,seaStacks:3,authoredCoast:true}};
}
