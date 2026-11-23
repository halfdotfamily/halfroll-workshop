import * as THREE from 'three';
import {ROUTE} from './route/board-art.js';
import {heightAt,edgeHeight,routeDistance,riverSample} from './terrain.js';
import {EMBER_POOLS,emberPoolDistance} from './ember-layout.js';

// Shared low-poly meshes, individual placement colours, no lights or scene grade.
export function buildRegionalEdges(parent,{zoneAt=()=>null}={}){
 const root=new THREE.Group();root.name='Regional roadside borders';parent.add(root);
 const buckets=new Map(),stats={regions:{},drawCalls:0,instances:0,minRoadClearance:Infinity,rejected:0};
 let seed=88421;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const world=p=>new THREE.Vector3((p.x-800)*.065,0,(p.y-655)*.065);
 const rock=new THREE.DodecahedronGeometry(1,0),leaf=new THREE.IcosahedronGeometry(1,0),box=new THREE.BoxGeometry(1,1,1),stem=new THREE.CylinderGeometry(.025,.035,1,5);
 // Radial fern silhouette, with pointed leaflets, combined into one geometry.
 const fp=[];
 for(let f=0;f<7;f++){const a=f*Math.PI*2/7,dx=Math.cos(a),dz=Math.sin(a);for(let j=1;j<5;j++){const t=j/5,L=.60*t,y=.48*Math.sin(t*1.8),w=.15*(1-t*.65);for(const side of [-1,1])fp.push(dx*(L-.13),y-.09,dz*(L-.13),dx*L-dz*w*side,y,dz*L+dx*w*side,dx*(L+.14),y+.035,dz*(L+.14));}}
 const fern=new THREE.BufferGeometry();fern.setAttribute('position',new THREE.Float32BufferAttribute(fp,3));fern.computeVertexNormals();
 const geo={rock,leaf,box,stem,fern};
 const colors={dock:['#b9aa8c','#d0c09b','#a99d80'],mossfall:['#7a8871','#a2aa8a','#66765b'],woods:['#8f9272','#b7b18a','#6e815a'],ember:['#55424c','#6b4c55','#3c3943'],crown:['#d4c9aa','#e5d8b9','#b5c09d'],seam:['#71645d','#b6ac90','#919b79']};
 function put(kind,p,s,color,angle=0,glow=false){const key=kind+(glow?'-glow':'');if(!buckets.has(key))buckets.set(key,{kind,glow,items:[]});buckets.get(key).items.push({p:p.clone(),s,angle,color});stats.instances++;}
 function region(x,z){const z0=zoneAt(x,z)|| (z<-17?'ember':x<-18?'mossfall':x>18?'woods':z>24?'dock':'crown');
  // Narrow cool-ash transition along the inner edge of Ember, not a hard colour cut.
  return (z0==='ember'||z0==='crown')&&z>-20&&z<-13&&x>-15&&x<19?'seam':z0;}
 function supported(p,r){const y=heightAt(p.x,p.z),d=routeDistance(p.x,p.z),water=riverSample(p.x,p.z);
  if(!Number.isFinite(y)||d<1.49+r||Math.hypot(p.x,p.z)<10.7+r||water.distance<water.width/2+r+.2||EMBER_POOLS.some(pool=>emberPoolDistance(p.x,p.z,pool)<1.1)){stats.rejected++;return null;}
  const samples=[[r,0],[-r,0],[0,r],[0,-r]].map(([x,z])=>heightAt(p.x+x,p.z+z));
  if(samples.some(h=>!Number.isFinite(h)||Math.abs(h-y)>.32)){stats.rejected++;return null;}
  stats.minRoadClearance=Math.min(stats.minRoadClearance,d-r);return y;
 }
 function flower(p,zone){const h=.20+rand()*.15;put('stem',p.clone().add(new THREE.Vector3(0,h/2,0)),[1,h,1],'#59754a');
  const top=p.clone().add(new THREE.Vector3(0,h,0)),color=zone==='seam'?'#eedbb0':['#f3df9b','#e6b5ca','#d0c3e6','#f4edcf'][Math.floor(rand()*4)];
  for(let k=0;k<5;k++){const a=k*Math.PI*2/5;put('leaf',top.clone().add(new THREE.Vector3(Math.cos(a)*.095,0,Math.sin(a)*.095)),[.105,.045,.075],color,a);}
  put('leaf',top,[.07,.055,.07],'#d7a74e');
 }
 for(let n=0;n<144;n++){
  const strip=ROUTE.cells[n].strip;
  for(let side=0;side<2;side++)for(let j=1;j<strip.length-1;j+=2){
   const a=world(side?strip[j].right:strip[j].left),b=world(side?strip[j].left:strip[j].right),out=a.clone().sub(b).normalize(),p=a.clone().addScaledVector(out,.27+rand()*.07),zone=region(p.x,p.z),palette=colors[zone]||colors.crown;
   const zstats=stats.regions[zone]??={stones:0,ferns:0,bushes:0,flowers:0,embers:0};
   const radius=.19,y=supported(p,radius);if(y===null)continue;
   p.y=y+.075;const angle=Math.atan2(out.x,out.z),sc=.85+rand()*.3;
   // Stone backbone returns everywhere; planting breaks it up in the green districts.
   if(zone==='dock'||zone==='mossfall'||zone==='ember'||zone==='seam'||rand()<.40){put('rock',p,[.20*sc,.13*sc,.29*sc],palette[Math.floor(rand()*palette.length)],angle);zstats.stones++;}
   if(zone==='ember'&&j%4===1&&rand()<.65){const q=p.clone().addScaledVector(out,.08);q.y+=.12;put('box',q,[.045,.018,.22],'#f29550',angle+.35,true);zstats.embers++;}
   // Leaves and flower clusters sit outside the stones and never on the play face.
   if(rand()>.46)continue;const q=a.clone().addScaledVector(out,.68+rand()*.36),ground=supported(q,.34);if(ground===null)continue;q.y=ground;
   if(zone==='mossfall'){put('fern',q,[.65,.75,.65],rand()<.5?'#5c884e':'#88a65d',rand()*6.28);zstats.ferns++;}
   else if(zone==='woods'){for(let k=0;k<3;k++){const v=q.clone().add(new THREE.Vector3((k-1)*.17,.18+(k===1?.08:0),0));put('leaf',v,[.27,.23,.26],['#708b4c','#93a867','#597943'][k],rand()*6.28);}zstats.bushes++;}
   else if(zone==='crown'||zone==='seam'){for(let k=0;k<3;k++)flower(q.clone().add(new THREE.Vector3((k-1)*.13,0,(rand()-.5)*.20)),zone);zstats.flowers+=3;}
   else if(zone==='dock'&&rand()<.4){put('fern',q,[.42,.48,.42],'#a0ab65',rand()*6.28);zstats.ferns++;}
  }
 }
 // Keep planting deterministic, but remove all experimental roadside rocks and their seams.
 for(const key of ['rock','box-glow']){stats.instances-=buckets.get(key)?.items.length||0;buckets.delete(key);}
 for(const r of Object.values(stats.regions)){r.stones=0;r.embers=0;}
 const dummy=new THREE.Object3D();
 for(const {kind,glow,items}of buckets.values()){
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true,side:kind==='fern'?THREE.DoubleSide:THREE.FrontSide,...(glow?{emissive:'#f17c36',emissiveIntensity:.35}:{})});
  const mesh=new THREE.InstancedMesh(geo[kind],material,items.length);mesh.name='Regional edges '+kind+(glow?' ember seams':'');
  items.forEach((v,i)=>{dummy.position.copy(v.p);dummy.scale.fromArray(v.s);dummy.rotation.set(0,v.angle,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(v.color));});mesh.castShadow=kind==='rock'||kind==='leaf';mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);stats.drawCalls++;
 }
 return{root,stats};
}
