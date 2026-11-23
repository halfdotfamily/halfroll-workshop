import * as THREE from 'three';
import {WORLD_COAST,coastWallProfile} from './coast-layout.js';
import {EMBER_POOLS} from './ember-layout.js';
import {buildLanternHeads} from './world-lanterns.js';

// Ambient life that never touches rules: planted foliage sways in the wind,
// surf rolls toward the coast, sparks rise from the lava and chimneys smoke.
// Everything is driven by the renderer's clock, so reduced motion freezes it.
const PROPS=/barrel|crate|chest|flag|statue|obelisk|bench|cart|lantern|stump|log|rock|patch|pumpkin|crop|lily|mushroom/i;
export function buildWorldAtmosphere(scene,{heightAt,seaY=-3.75,compact=false}={}){
 const time={value:0},root=new THREE.Group();root.name='World life';
 // 1. Wind: bend every planted tree, bush and plant from its base.
 const swayed=new Set();
 scene.getObjectByName('Zone flora')?.traverse(o=>{
  if(!o.isInstancedMesh||PROPS.test(o.name))return;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(swayed.has(m))continue;swayed.add(m);
   const previousCompile=m.onBeforeCompile,previousKey=m.customProgramCacheKey();
   m.onBeforeCompile=(shader,renderer)=>{previousCompile.call(m,shader,renderer);shader.uniforms.lifeTime=time;
    shader.vertexShader='uniform float lifeTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     float lifePhase=instanceMatrix[3].x*.31+instanceMatrix[3].z*.23;
     float lifeBend=position.y*position.y;
     float lifeGust=.6+.4*sin(lifeTime*.37+instanceMatrix[3].x*.05);
     transformed.x+=sin(lifeTime*1.25+lifePhase)*.045*lifeBend*lifeGust;
     transformed.z+=cos(lifeTime*.97+lifePhase*1.3)*.03*lifeBend*lifeGust;`);};
   m.customProgramCacheKey=()=> previousKey+'-world-life-sway-v1';m.needsUpdate=true;
  }
 });
 // 2. Surf: foam bands that roll in toward the shore on a ring outside the coast.
 {
  const n=WORLD_COAST.length,pos=[],uv=[],idx=[];let along=0;
  for(let i=0;i<=n;i++){
   const p=WORLD_COAST[i%n],a=WORLD_COAST[(i+n-1)%n],b=WORLD_COAST[(i+1)%n];
   let nx=(b.z-a.z),nz=-(b.x-a.x);const len=Math.hypot(nx,nz)||1;nx/=len;nz/=len;
   // Outward normal: away from the island centre.
   if(nx*p.x+nz*p.z<0){nx=-nx;nz=-nz;}
   if(i)along+=Math.hypot(p.x-WORLD_COAST[(i-1)%n].x,p.z-WORLD_COAST[(i-1)%n].z);
   // Start at the real waterline: the foot of the coastal wall, not the clifftop.
   const foot=coastWallProfile({x:p.x,y:0,z:p.z},1,nx,nz),bx=foot?foot.x:p.x,bz=foot?foot.z:p.z,out=Math.max(0,(bx-p.x)*nx+(bz-p.z)*nz);
   for(const [k,d] of [[0,out-.2],[1,out+4.5]]){pos.push(p.x+nx*d,seaY+.05,p.z+nz*d);uv.push(along*.2,k);}
   if(i<n){const q=i*2;idx.push(q,q+1,q+3,q,q+3,q+2);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{lifeTime:time},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:`varying vec2 vUv;uniform float lifeTime;
    float h(float x){return fract(sin(x*91.7)*43758.5);}
    float n(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(h(i),h(i+1.),f);}
    void main(){
     float d=vUv.y,wob=n(vUv.x*1.7+lifeTime*.15)*.5+n(vUv.x*4.1-lifeTime*.2)*.25;
     // Three crests roll in toward the shore and fade as they travel outward.
     float roll=fract(d*2.2+wob*.4+lifeTime*.18);
     float band=smoothstep(.0,.1,roll)*(1.-smoothstep(.1,.42,roll))*pow(1.-d,1.4);
     float shore=1.-smoothstep(.0,.22,d+wob*.06);
     float a=clamp(band*.9+shore,0.,1.)*(.65+.35*n(vUv.x*6.+lifeTime*.3));
     gl_FragColor=vec4(vec3(.97,1.,1.),a*.85);
    }`});
  const surf=new THREE.Mesh(geo,mat);surf.name='Rolling surf';surf.renderOrder=2;root.add(surf);
 }
 // 3. Lava sparks: small glowing embers rise and fade above every basin.
 const sparks=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.07),new THREE.MeshBasicMaterial({color:'#ffb347'}),EMBER_POOLS.length*26);
 sparks.name='Lava sparks';sparks.frustumCulled=false;root.add(sparks);
 const spark=[];EMBER_POOLS.forEach((p,k)=>{for(let i=0;i<26;i++)spark.push({x:p.x,z:p.z,y:p.level,r:p.r*.7,seed:k*26+i});});
 // 4. Chimney smoke: soft puffs above chimneys (or cottage roofs when unnamed).
 const vents=[];const tmp=new THREE.Box3();
 scene.traverse(o=>{if(!o.isMesh&&!o.isGroup)return;if(/chimney/i.test(o.name)){tmp.setFromObject(o);if(!tmp.isEmpty())vents.push(new THREE.Vector3((tmp.min.x+tmp.max.x)/2,tmp.max.y,(tmp.min.z+tmp.max.z)/2));}});
 // Pocket cottages are instanced; the chimney is the tallest part of the stone mesh.
 if(!vents.length)scene.traverse(o=>{if(!o.isInstancedMesh||!/^cottage/.test(o.name)||o.material?.name!=='stone')return;
  const p=o.geometry.attributes.position;let top=-Infinity,bottom=Infinity;for(let i=0;i<p.count;i++){top=Math.max(top,p.getY(i));bottom=Math.min(bottom,p.getY(i));}
  let cx=0,cz=0,c=0;for(let i=0;i<p.count;i++)if(p.getY(i)>top-(top-bottom)*.08){cx+=p.getX(i);cz+=p.getZ(i);c++;}
  const local=new THREE.Vector3(cx/c,top,cz/c),im=new THREE.Matrix4();
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,im);vents.push(local.clone().applyMatrix4(im).applyMatrix4(o.matrixWorld));}});
 const PUFFS=7,smoke=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.32,1),new THREE.MeshStandardMaterial({color:'#f4f1ea',transparent:true,opacity:.5,roughness:1,depthWrite:false,flatShading:true}),Math.max(1,vents.length*PUFFS));
 smoke.name='Chimney smoke';smoke.frustumCulled=false;smoke.count=vents.length*PUFFS;root.add(smoke);
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),s=new THREE.Vector3();
 const hash=x=>{const t=Math.sin(x*127.1)*43758.5453;return t-Math.floor(t);};
 // 5. Night: warm cottage windows, glowing lanterns and drifting fireflies.
 const windows=[];scene.traverse(o=>{if(o.isInstancedMesh&&/^cottage/.test(o.name)&&o.material?.name==='glass'&&!windows.includes(o.material))windows.push(o.material);});
 const lamps=[],lm=new THREE.Matrix4(),lp=new THREE.Vector3(),ls=new THREE.Vector3(),lq=new THREE.Quaternion();
 scene.traverse(o=>{if(!o.isInstancedMesh)return;const flora=/Zone flora .*lantern/.test(o.name),ring=o.name==='Sanctuary lantern';if(!flora&&!ring)return;
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,lm);lm.premultiply(o.matrixWorld);lm.decompose(lp,lq,ls);lamps.push(flora?lp.clone().add(new THREE.Vector3(0,ls.y*.86,0)):lp.clone());}});
 const lanternHeads=buildLanternHeads(lamps,{scale:.8});root.add(lanternHeads.root);
 // Village and garden lamps also softly tint the terrain below them. Sample
 // the ground per vertex so a lamp on a slope cannot leave a floating disc.
 const lightPos=[],lightRing=[],lightIdx=[],segs=20,rings=5;
 lamps.forEach(p=>{const base=lightPos.length/3;for(let r=0;r<=rings;r++)for(let k=0;k<(r?segs:1);k++){
  const a=k/segs*Math.PI*2,d=r/rings*2.3,x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d,y=heightAt?.(x,z);
  lightPos.push(x,Number.isFinite(y)?y+.075:p.y-1.3,z);lightRing.push(r/rings);
 }for(let k=0;k<segs;k++)lightIdx.push(base,base+1+k,base+1+(k+1)%segs);
 for(let r=1;r<rings;r++)for(let k=0;k<segs;k++){const a=base+1+(r-1)*segs+k,b=base+1+(r-1)*segs+(k+1)%segs;lightIdx.push(a,a+segs,b+segs,a,b+segs,b);}});
 const groundGeo=new THREE.BufferGeometry();groundGeo.setAttribute('position',new THREE.Float32BufferAttribute(lightPos,3));groundGeo.setAttribute('ring',new THREE.Float32BufferAttribute(lightRing,1));groundGeo.setIndex(lightIdx);
 const groundMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{uNight:{value:0}},vertexShader:'attribute float ring;varying float vR;void main(){vR=ring;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float uNight;varying float vR;void main(){float a=exp(-vR*vR*4.)*(1.-smoothstep(.65,1.,vR));gl_FragColor=vec4(1.,.82,.55,a*.19*uNight);}'});
 const groundLight=new THREE.Mesh(groundGeo,groundMat);groundLight.name='Garden warm ground light';groundLight.visible=false;root.add(groundLight);
 const flies=[],box=new THREE.Box3().setFromObject(scene.getObjectByName('Zone flora')||scene);
 for(let i=0;flies.length<(compact?55:110)&&i<4000;i++){const x=box.min.x+hash(i*3.1)*(box.max.x-box.min.x),z=box.min.z+hash(i*7.7)*(box.max.z-box.min.z),y=heightAt?.(x,z);if(!Number.isFinite(y)||Math.hypot(x,z)<11||(z<-14&&x>-17))continue;flies.push({x,y,z,seed:i});}
 const flyMat=new THREE.MeshBasicMaterial({color:'#eaff8f',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
 const fireflies=new THREE.InstancedMesh(new THREE.SphereGeometry(.06,6,4),flyMat,flies.length);fireflies.name='Fireflies';fireflies.frustumCulled=false;root.add(fireflies);
 let night=0;
 function setNight(n){night=Math.max(0,Math.min(1,n));for(const w of windows){w.emissive.set('#ffcf6a');w.emissiveIntensity=night*1.5;}
  lanternHeads.setNight(night);groundMat.uniforms.uNight.value=night;groundLight.visible=night>.05;flyMat.opacity=Math.max(0,(night-.35)/.65);fireflies.visible=flyMat.opacity>0;}
 // 6. Fauna. Woodland animals idle in place (grazing, hopping, pacing);
 // gulls circle the harbour, butterflies flutter in the garden, fish leap.
 const herd=[];scene.traverse(o=>{const kind=/^Pocket wildlife \/ (\w+)/.exec(o.name)?.[1];if(kind)herd.push({o,kind,head:o.children[0],x:o.position.x,z:o.position.z,y:o.position.y,ry:o.rotation.y,hy:o.children[0]?.rotation.x??0,seed:herd.length*1.7});});
 const white=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.8,flatShading:true}),grey=new THREE.MeshStandardMaterial({color:'#9aa6b4',roughness:.8,flatShading:true});
 const gulls=[];for(let i=0;i<(compact?4:7);i++){const g=new THREE.Group(),body=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),white);body.scale.set(.75,.6,1.6);g.add(body);
  const wings=[-1,1].map(s=>{const w=new THREE.Mesh(new THREE.BoxGeometry(.9,.03,.32),s<0?white:white);w.geometry.translate(s*.45,0,0);const tip=new THREE.Mesh(new THREE.BoxGeometry(.25,.035,.2),grey);tip.position.set(s*.85,0,-.02);w.add(tip);g.add(w);return w;});
  g.name='Gull';root.add(g);gulls.push({g,wings,cx:-18+hash(i)*14,cz:40+hash(i+9)*8,r:4+hash(i+3)*5,h:5+hash(i+5)*4,speed:.25+hash(i+7)*.2,seed:i});}
 const wingCols=['#ff86b0','#ffd84d','#9fd8ff','#c49bff','#ffffff'],flutter=[];
 for(let i=0;i<(compact?6:16);i++){const c=new THREE.MeshBasicMaterial({color:wingCols[i%wingCols.length],side:THREE.DoubleSide}),g=new THREE.Group();
  const ws=[-1,1].map(s=>{const w=new THREE.Mesh(new THREE.PlaneGeometry(.22,.18),c);w.geometry.translate(s*.11,0,0);w.rotation.x=-Math.PI/2;g.add(w);return w;});
  const a=hash(i*5)*6.283,r=10.8+hash(i*3)*3.5;g.name='Butterfly';root.add(g);flutter.push({g,ws,a,r,seed:i});}
 const fishMat=new THREE.MeshStandardMaterial({color:'#ff9f5a',roughness:.6,flatShading:true}),fish=[];
 for(let i=0;i<(compact?2:4);i++){const f=new THREE.Mesh(new THREE.ConeGeometry(.16,.6,6),fishMat);f.rotation.z=Math.PI/2;const g=new THREE.Group();g.add(f);g.name='Leaping fish';g.visible=false;root.add(g);
  const k=Math.floor(hash(i*11)*WORLD_COAST.length),p=WORLD_COAST[k];const len=Math.hypot(p.x,p.z)||1;fish.push({g,x:p.x+p.x/len*7,z:p.z+p.z/len*7,period:7+hash(i)*6,offset:hash(i+2)*10,dir:hash(i+4)*6.283});}
 function fauna(t){
  for(const a of herd){const k=a.seed;
   if(a.kind==='rabbit'||a.kind==='bunny'){const hop=Math.max(0,Math.sin(t*3.2+k)),ang=t*.35+k;a.o.position.set(a.x+Math.cos(ang)*.45,(heightAt?.(a.x+Math.cos(ang)*.45,a.z+Math.sin(ang)*.45)??a.y)+hop*.28,a.z+Math.sin(ang)*.45);a.o.rotation.y=-ang;}
   else if(a.kind==='fox'){const pace=Math.sin(t*.45+k),x=a.x+Math.sin(a.ry)*pace*.7,z=a.z+Math.cos(a.ry)*pace*.7;a.o.position.set(x,(heightAt?.(x,z)??a.y)+Math.abs(Math.sin(t*5+k))*.04,z);a.o.rotation.y=a.ry+(Math.cos(t*.45+k)<0?Math.PI:0);}
   else{const graze=.5+.5*Math.sin(t*.5+k);if(a.head)a.head.rotation.x=a.hy+graze*.7;a.o.rotation.y=a.ry+Math.sin(t*.2+k)*.25;}
  }
  for(const s of gulls){const ang=t*s.speed+s.seed*.9,x=s.cx+Math.cos(ang)*s.r,z=s.cz+Math.sin(ang)*s.r;s.g.position.set(x,s.h+Math.sin(t*.7+s.seed)*.4,z);s.g.rotation.set(0,-ang+Math.PI,Math.sin(ang)*.15);const flap=Math.sin(t*6+s.seed)*.45;s.wings[0].rotation.z=flap;s.wings[1].rotation.z=-flap;}
  for(const f of flutter){const a=f.a+t*.18*(f.seed%2?1:-1),r=f.r+Math.sin(t*.5+f.seed)*.6,x=Math.cos(a)*r,z=Math.sin(a)*r;f.g.position.set(x,(heightAt?.(x,z)??12)+.6+Math.sin(t*2.3+f.seed)*.25,z);f.g.rotation.y=-a;const w=Math.sin(t*14+f.seed)*1.1;f.ws[0].rotation.y=w;f.ws[1].rotation.y=-w;}
  for(const f of fish){const u=((t+f.offset)%f.period)/1.1;f.g.visible=u<1;if(u<1){f.g.position.set(f.x+Math.cos(f.dir)*(u-.5)*1.6,seaY+Math.sin(u*Math.PI)*1.3,f.z+Math.sin(f.dir)*(u-.5)*1.6);f.g.rotation.set(0,-f.dir,(u-.5)*2.4);}}
 }
 let previousTime=NaN;
 function update(t){
  if(t===previousTime)return;previousTime=t;time.value=t;
  fauna(t);
  if(fireflies.visible){flies.forEach((f,i)=>{const k=f.seed;v.set(f.x+Math.sin(t*.5+k)*.8,f.y+.7+Math.sin(t*.9+k*1.7)*.45,f.z+Math.cos(t*.43+k*.6)*.8);s.setScalar(.6+.6*Math.max(0,Math.sin(t*3.1+k*2.3)));m.compose(v,q,s);fireflies.setMatrixAt(i,m);});fireflies.instanceMatrix.needsUpdate=true;}
  spark.forEach((e,i)=>{const life=2.6+hash(e.seed)*1.8,age=((t+hash(e.seed+7)*life)%life)/life,ang=hash(e.seed+3)*6.283,rr=Math.sqrt(hash(e.seed+5))*e.r;
   v.set(e.x+Math.cos(ang)*rr+Math.sin(t*1.3+e.seed)*.25*age,e.y+.2+age*3.2,e.z+Math.sin(ang)*rr);const k=(1-age)*(age<.1?age*10:1);s.setScalar(.4+k*.9);m.compose(v,q,s);sparks.setMatrixAt(i,m);});
  sparks.instanceMatrix.needsUpdate=true;
  vents.forEach((p,j)=>{for(let k=0;k<PUFFS;k++){const age=((t*.22+k/PUFFS+hash(j)*.7)%1);
   v.set(p.x+Math.sin(t*.4+j)*.4*age+age*.8,p.y+.2+age*2.6,p.z+Math.cos(t*.3+j)*.25*age);s.setScalar((.35+age*1.15)*(age>.8?(1-age)*5:1));m.compose(v,q,s);smoke.setMatrixAt(j*PUFFS+k,m);}});
  if(vents.length)smoke.instanceMatrix.needsUpdate=true;
 }
 scene.add(root);update(0);
 return{root,update,setNight,stats:{swayMaterials:swayed.size,vents:vents.length,sparks:spark.length,windows:windows.length,lamps:lamps.length,fireflies:flies.length,herd:herd.length,gulls:gulls.length,butterflies:flutter.length}};
}
