import * as THREE from 'three';
import {ROUTE} from './route/board-art.js';
import {edgeHeight,heightAt} from './terrain.js';

// Cobalt-and-gold Wish Throne, on a supported grassy dais beside the finish.
// The short approach begins beyond section144; numbered spaces stay unchanged.
const world=p=>({x:(p.x-800)*.065,z:(p.y-655)*.065});
export function buildWishThroneV2(root){
 const last=world(ROUTE.edges[144].center),throne=new THREE.Group();throne.name='Wish Throne';const tx=last.x-2.9,tz=last.z,ty=heightAt(tx,tz)??edgeHeight(144)-.6;throne.position.set(tx,ty,tz);
 // The throne faces the arriving racers on the final straight.
 throne.rotation.y=Math.PI/2;root.add(throne);
 const royal=new THREE.MeshStandardMaterial({color:'#3f5ba8',roughness:.75}),brass=new THREE.MeshStandardMaterial({color:'#f1c75b',roughness:.4,metalness:.12}),marble=new THREE.MeshStandardMaterial({color:'#f6efe1',roughness:.6}),cushion=new THREE.MeshStandardMaterial({color:'#5b78d6',roughness:.9});
 const gem=c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.35,roughness:.25,flatShading:true});
 function part(geo,mat,x,y,z,rx=0,ry=0,rz=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;throne.add(m);return m;}
 const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d),cyl=(a,b,h,n=24)=>new THREE.CylinderGeometry(a,b,h,n);
 // A small grassy knoll with stone terraces lifts the throne above the
 // finish; a straight marble approach continues beyond section 144.
 const grass=new THREE.MeshStandardMaterial({color:'#6fbf4f',roughness:1,flatShading:true}),stone=new THREE.MeshStandardMaterial({color:'#e8dcc4',roughness:.8});
 const edgeZ=Math.hypot(last.x-tx,last.z-tz),hill=Math.max(.12,edgeHeight(144)+.12-ty),knoll=1.9;
 // Ground-following skirt: a continuous solid knoll, not floating rings.
 const vertices=[],indices=[],N=48,rings=[{r:knoll+.9,h:null},{r:knoll+.55,h:hill-.32},{r:knoll+.12,h:hill-.12},{r:knoll,h:hill-.04}];
 for(const ring of rings)for(let i=0;i<N;i++){
  const a=i/N*Math.PI*2,x=Math.cos(a)*ring.r,z=Math.sin(a)*ring.r,rot=throne.rotation.y;
  const wx=tx+x*Math.cos(rot)+z*Math.sin(rot),wz=tz-x*Math.sin(rot)+z*Math.cos(rot);
  vertices.push(x,ring.h??((heightAt(wx,wz)??ty)-ty-.025),z);
 }
 for(let k=0;k<rings.length-1;k++)for(let i=0;i<N;i++){const j=(i+1)%N,a=k*N+i,b=k*N+j,c=(k+1)*N+i,d=(k+1)*N+j;indices.push(a,b,c,b,d,c);}
 const skirtGeo=new THREE.BufferGeometry();skirtGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));skirtGeo.setIndex(indices);skirtGeo.computeVertexNormals();
 stone.side=THREE.DoubleSide;const skirt=part(skirtGeo,stone,0,0,0);skirt.castShadow=false;
 part(cyl(knoll+.12,knoll+.3,.2,48),stone,0,hill-.14,0).castShadow=false;
 part(cyl(knoll,knoll+.1,.12,48),grass,0,hill-.06,0).castShadow=false;
 part(cyl(knoll+.13,knoll+.13,.05,48),brass,0,hill-.15,0).castShadow=false;
 // A level approach joins the dais to the end edge, outside all numbered tiles.
 const approachLength=edgeZ-knoll+.18,approachZ=(edgeZ+knoll-.18)/2;
 part(box(1.2,.12,approachLength),stone,0,hill-.07,approachZ);
 part(box(1.08,.025,edgeZ),brass,0,hill+.006,edgeZ/2);
 part(box(.96,.035,edgeZ),royal,0,hill+.024,edgeZ/2);
 const S=.86,y0=hill;
 // Seat block, cushions and armrests.
 part(box(1.9*S,.55*S,1.45*S),brass,0,y0+.28*S,-.05*S);part(box(1.7*S,.22*S,1.3*S),cushion,0,y0+.66*S,0);
 for(const s of [-1,1]){part(box(.26*S,.55*S,1.35*S),brass,s*.98*S,y0+.95*S,-.02*S);part(new THREE.SphereGeometry(.2*S,14,10),brass,s*.98*S,y0+1.3*S,.62*S);}
 // Tall back with an arched top, inset cobalt panel and cushion.
 const backH=2.05*S,backZ=-.62*S;part(box(1.9*S,backH,.3*S),brass,0,y0+.55*S+backH/2,backZ);
 part(cyl(.95*S,.95*S,.3*S,32),brass,0,y0+.55*S+backH,backZ,Math.PI/2);
 part(box(1.45*S,backH*.8,.12*S),royal,0,y0+.55*S+backH*.5,backZ+.18*S);part(cyl(.72*S,.72*S,.12*S,32),royal,0,y0+.55*S+backH*.9,backZ+.18*S,Math.PI/2);
 part(box(1.3*S,1.1*S,.22*S),cushion,0,y0+1.35*S,backZ+.3*S,-.12);
 // Golden fan wings behind the back.
 for(const s of [-1,1])for(let k=0;k<4;k++){const a=.35+k*.28;part(box(.18*S,1.55*S-k*.18*S,.07*S),brass,s*(1.05*S+Math.sin(a)*.55*S),y0+1.6*S+Math.cos(a)*.5*S,backZ-.12*S,0,0,-s*a);}
 // Crown crest with gems on top of the arch.
 const crestY=y0+.55*S+backH+.95*S;part(cyl(.75*S,.82*S,.3*S,8),brass,0,crestY,backZ);
 const gems=['#7fe0c0','#ff7fa8','#7fe0c0','#ff7fa8','#7fe0c0'];
 for(let j=-2;j<=2;j++){part(new THREE.ConeGeometry(.16*S,j===0?.75*S:.5*S,4),brass,j*.3*S,crestY+.35*S+(j===0?.12*S:0),backZ);part(new THREE.OctahedronGeometry(.11*S),gem(gems[j+2]),j*.3*S,crestY+(j===0?.85*S:.65*S),backZ+.02);}
 part(new THREE.OctahedronGeometry(.22*S),gem('#ff7fa8'),0,y0+.55*S+backH,backZ+.2*S);
 // Two low braziers flank the dais front with soft flames.
 const flame=new THREE.MeshStandardMaterial({color:'#ffb347',emissive:'#ff8a2a',emissiveIntensity:1.4,roughness:1,flatShading:true});
 for(const s of [-1,1]){const x=s*1.35,z=1.15,b=hill;part(cyl(.11,.16,.6,10),brass,x,b+.3,z);part(cyl(.3,.14,.24,12),brass,x,b+.7,z);part(new THREE.ConeGeometry(.21,.46,7),flame,x,b+1.02,z);part(new THREE.ConeGeometry(.11,.3,6),flame,x+.06,b+1.15,z+.04);}
 const crownLight=new THREE.Mesh(new THREE.TorusGeometry(1.15*S,.06,8,48),new THREE.MeshBasicMaterial({color:'#ffe18a'}));crownLight.position.set(0,crestY+1.3*S,backZ);crownLight.rotation.x=Math.PI/2;crownLight.visible=false;throne.add(crownLight);

 function setThroneMood(mood){crownLight.visible=mood==='ready'||mood==='won';royal.emissive.set(mood==='won'?'#9b772d':'#000000');royal.emissiveIntensity=.35;}
 return{throne,setThroneMood,footprint:{x:tx,z:tz,radius:knoll+.9,rotationY:throne.rotation.y,level:ty+hill,finish:{x:last.x,z:last.z}}};
}
