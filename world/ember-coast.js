import * as THREE from 'three';
import {COAST_VOLCANO as V,LAVA_COAST_PATH} from './ember-coast-layout.js';
import {makeLavaMaterial} from './lava-material.js';

// One authored coastal landmark: breached crater, continuous supported lava
// chute and collapsed cooling aprons. The numbered route stays untouched.
export function buildEmberCoast(scene,{heightAt,routeDistance}){
 const root=new THREE.Group();root.name='Ember coast — the broken lantern volcano';
 const stats={volcanoes:1,splitLandmarks:1,channelSamples:0,cooledTalus:0,thermalVents:0,drawCalls:0,instances:0,minDetailClearance:Infinity,craterLevel:V.craterLevel,flowDirection:'downhill to the eastern sea',supportViolations:0,minLavaBedClearance:Infinity};
 const clock={value:0},bucket=new Map(),stamp=new THREE.Object3D();let seed=62073;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const colors=['#5c4258','#6e4c62','#85596c','#a06b78','#c08a86'];
 const mats=colors.map(color=>new THREE.MeshStandardMaterial({color,roughness:1,flatShading:true}));
 const rock=new THREE.IcosahedronGeometry(1,0),rp=rock.attributes.position;
 for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i);rp.setXYZ(i,x*(1+.12*Math.sin(z*8)),y+.18*x,z*(1+.13*Math.cos(x*9)));}rock.computeVertexNormals();
 const geoMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide});
 function mesh(geometry,material,name){const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=m.receiveShadow=true;root.add(m);stats.drawCalls++;return m;}
 function surface(vertices,faces,tints,uv){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));if(tints)g.setAttribute('color',new THREE.Float32BufferAttribute(tints,3));if(uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(faces);g.computeVertexNormals();return g;}
 function stone(x,y,z,sx,sy,sz,color=1,yaw=0,tilt=0){
  const clearance=routeDistance(x,z)-Math.hypot(sx,sz);if(clearance<2.8)return;
  stats.minDetailClearance=Math.min(stats.minDetailClearance,clearance);
  if(!bucket.has(color))bucket.set(color,[]);stamp.position.set(x,y,z);stamp.scale.set(sx,sy,sz);stamp.rotation.set(tilt,yaw,tilt*.4);stamp.updateMatrix();bucket.get(color).push(stamp.matrix.clone());stats.instances++;
 }
 const N=28,verts=[],faces=[],tints=[];
 const breachAngle=Math.atan2(.3,1.2);
 function craterPoint(i,k){
  const a=i/N*Math.PI*2,irregular=1+.09*Math.sin(a*3+.4)+.045*Math.cos(a*7),rr=[1.18,1.67,2.03,3.10,V.radius][k]*irregular;
  const x=V.x+Math.cos(a)*rr,z=V.z+Math.sin(a)*rr*.88;
  const angular=Math.abs(Math.atan2(Math.sin(a-breachAngle),Math.cos(a-breachAngle))),cut=Math.exp(-((angular/.33)**4));
  const ground=heightAt(x,z)??1.8;
  let y=[V.craterLevel-.32,V.peak-.2,V.peak,6.25,ground-.06][k];
  if(k===1||k===2)y+=.30*Math.sin(a*3+1)+.14*Math.cos(a*7);
  if(k===3)y=Math.max(ground+.10,y+.26*Math.sin(a*2));
  if(k>0&&k<4)y=y*(1-cut)+(V.craterLevel-.02-(k===3?1.2:0))*cut;
  return{x,y,z};
 }
 for(let k=0;k<5;k++)for(let i=0;i<N;i++){
  const p=craterPoint(i,k);verts.push(p.x,p.y,p.z);
  const c=new THREE.Color(colors[k===0?0:k===1?1:k===2?2:3]);c.multiplyScalar(.84+.21*Math.sin(i*2.1+k*.7)**2);tints.push(c.r,c.g,c.b);
  if(k<4){const a=k*N+i,b=k*N+(i+1)%N,c=(k+1)*N+i,d=(k+1)*N+(i+1)%N;faces.push(a,c,b,b,c,d);}
 }
 mesh(surface(verts,faces,tints),geoMaterial,'Asymmetric fractured basalt flank and breached crater');
 // Small recessed molten heart. It joins the chute at the broken east lip.
 const lake=[V.x,V.craterLevel,V.z],lf=[];
 for(let i=0;i<N;i++){const a=i/N*Math.PI*2,r=1.28*(1+.06*Math.sin(a*5));lake.push(V.x+Math.cos(a)*r,V.craterLevel,V.z+Math.sin(a)*r*.88);lf.push(0,i+1,(i+1)%N+1);}
 mesh(surface(lake,lf),makeLavaMaterial(clock),'Glowing crater heart');

 // Subdivide the authored path, preserving monotone height. Every lava edge
 // has a solid channel bed and raised cooling banks; the underside reaches
 // actual land or the seabed, including the short terminal coastal apron.
 const samples=[];
 for(let j=0;j<LAVA_COAST_PATH.length-1;j++)for(let k=0;k<7;k++){
  const a=LAVA_COAST_PATH[j],b=LAVA_COAST_PATH[j+1],t=k/7;
  samples.push({x:THREE.MathUtils.lerp(a.x,b.x,t),z:THREE.MathUtils.lerp(a.z,b.z,t),y:THREE.MathUtils.lerp(a.y,b.y,t),width:THREE.MathUtils.lerp(a.width,b.width,t)});
 }samples.push({...LAVA_COAST_PATH.at(-1)});stats.channelSamples=samples.length;
 const bedV=[],bedC=[],lavaV=[],lavaF=[],uv=[];let distance=0;
 samples.forEach((p,i)=>{
  const before=samples[Math.max(0,i-1)],after=samples[Math.min(samples.length-1,i+1)],dx=after.x-before.x,dz=after.z-before.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
  if(i)distance+=Math.hypot(p.x-before.x,p.y-before.y,p.z-before.z);
  const outer=p.width+1.35+.48*Math.sin(i*.23)**2,bank=.035+.045*Math.sin(i*.87)**2;
  for(let j=0;j<6;j++){
   const side=[-outer,-p.width-.09,-p.width,p.width,p.width+.09,outer][j],x=p.x+nx*side,z=p.z+nz*side;
   const ground=heightAt(x,z)??-4.2;
   const y=j===0||j===5?Math.min(p.y-.03,ground-.045):p.y+[0,bank,-.055,-.055,bank,0][j]-.07;bedV.push(x,y,z);
   const c=new THREE.Color(colors[j===2||j===3?0:j===0||j===5?2:1]);bedC.push(...c);
  }
  for(const side of [-1,1]){lavaV.push(p.x+nx*p.width*side,p.y-.035,p.z+nz*p.width*side);uv.push(side*.5+.5,distance*.5);}
  for(const side of [-.95,0,.95]){const ground=heightAt(p.x+nx*p.width*side,p.z+nz*p.width*side);if(ground!==null){const clearance=p.y-.035-ground;stats.minLavaBedClearance=Math.min(stats.minLavaBedClearance,clearance);if(clearance<-.02)stats.supportViolations++;}}
  if(i<samples.length-1){const a=i*2;lavaF.push(a,a+2,a+1,a+1,a+2,a+3);}
  // Side walls are irregular dark rock attached all the way down to ground.
  if(i){for(const side of [-1,1]){
   const old=samples[i-1],oldOuter=old.width+1.35+.48*Math.sin((i-1)*.23)**2,x=p.x+nx*outer*side,z=p.z+nz*outer*side,ox=old.x+nx*oldOuter*side,oz=old.z+nz*oldOuter*side;
   const bottom=Math.min(p.y-.2,heightAt(x,z)??-4.55),oldBottom=Math.min(old.y-.2,heightAt(ox,oz)??-4.55);
   const top=Math.min(p.y-.03,(heightAt(x,z)??-4.2)-.045),oldTop=Math.min(old.y-.03,(heightAt(ox,oz)??-4.2)-.045);
   bedV.push(ox,oldTop,oz,x,top,z,ox,Math.min(oldTop-.12,oldBottom-.12),oz,x,Math.min(top-.12,bottom-.12),z);
   const c=new THREE.Color(colors[i%3===0?2:0]);for(let j=0;j<4;j++)bedC.push(...c);
  }}
 });
 // Each row has six top vertices and (except row zero) eight wall vertices.
 // Explicit offsets keep the channel strip separate from its vertical support.
 const fixedBedF=[];
 let rowOffset=0;const rowOffsets=[];for(let i=0;i<samples.length;i++){rowOffsets.push(rowOffset);rowOffset+=6+(i?8:0);}
 for(let i=0;i<samples.length-1;i++)for(let j=0;j<5;j++){const a=rowOffsets[i]+j,b=rowOffsets[i+1]+j;fixedBedF.push(a,b,a+1,a+1,b,b+1);}
 for(let i=1;i<samples.length;i++){const a=rowOffsets[i]+6;for(const base of [a,a+4])fixedBedF.push(base,base+2,base+1,base+1,base+2,base+3);}
 mesh(surface(bedV,fixedBedF,bedC),geoMaterial,'Solid eroded basalt chute with cooling banks');
 const flowMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',emissive:'#ffffff',roughness:.91,side:THREE.DoubleSide});
 flowMaterial.onBeforeCompile=s=>{
  s.uniforms.flowTime=clock;
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 coastUV;').replace('#include <begin_vertex>','#include <begin_vertex>\ncoastUV=uv;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
   varying vec2 coastUV;uniform float flowTime;
   float hashC(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noiseC(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hashC(i),hashC(i+vec2(1,0)),f.x),mix(hashC(i+vec2(0,1)),hashC(i+1.),f.x),f.y);}
   float coastHeat=0.;float coastCore=0.;
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 f=vec2(coastUV.x*3.4,coastUV.y-flowTime*.24);
   float n=noiseC(f*2.1+noiseC(f*.7)*1.3);
   float edge=pow(abs(coastUV.x-.5)*2.,3.);
   coastHeat=smoothstep(.29,.67,n-edge*.42);
   coastCore=smoothstep(.70,.86,n)*(1.-edge);
   diffuseColor.rgb=mix(vec3(.075,.035,.035),vec3(.56,.09,.012),coastHeat);
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   totalEmissiveRadiance=vec3(1.,.12,.007)*coastHeat*.85+vec3(1.,.40,.045)*coastCore*.32;
  `);
 };flowMaterial.customProgramCacheKey=()=> 'ember-coast-flow-v6';
 const stream=mesh(surface(lavaV,lavaF,null,uv),flowMaterial,'Slow moving magma under a cooling skin');stream.userData.samples=samples;
 // Cooled islands split the molten surface into little tongues. Angular shelves
 // at unequal heights bury its edges in the broader apron, rather than rails.
 for(const [index,side] of [[14,-.25],[23,.30],[31,-.18],[39,.28]]){
  const p=samples[index],next=samples[index+1],a=Math.atan2(next.z-p.z,next.x-p.x);
  stone(p.x-Math.sin(a)*side,p.y+.015,p.z+Math.cos(a)*side,.28,.12,.37,index%3,a,.10);stats.cooledTalus++;
 }
 for(const [index,side,size] of [[13,-1,1.0],[21,1,.95],[29,-1,1.10],[35,1,.8],[41,-1,.8]]){
  const p=samples[index],next=samples[index+1],a=Math.atan2(next.z-p.z,next.x-p.x),offset=p.width+.65;
  const x=p.x-Math.sin(a)*offset*side,z=p.z+Math.cos(a)*offset*side,ground=heightAt(x,z)??-4.15;
  stone(x,Math.min(p.y-.13,ground+.19),z,size,.32,size*.69,2,a,.12);stats.cooledTalus++;
 }
 // Collapsed flank: unequal plate clusters, not a repeating cliff fence.
 for(let i=0;i<66;i++){
  const a=1.1+rand()*4.8,r=2.8+rand()*2.7,x=V.x+Math.cos(a)*r,z=V.z+Math.sin(a)*r*.85,g=heightAt(x,z);
  if(g===null)continue;const s=.22+rand()*.56,h=.18+rand()*.45;
  stone(x,g+h*.25,z,s,h,s*.7,i%4,rand()*6.28,(rand()-.5)*.35);stats.cooledTalus++;
 }
 // Broken landmark block: visibly separate slabs with an open jagged cleft.
 for(const s of [-1,1]){
  const x=34.8+s*.65,z=-35.0+s*.12,g=heightAt(x,z)??-.7;
  stone(x,g+1.40,z,.73,2.15,1.1,s<0?1:2,.23+s*.06,s*.10);
  for(let j=0;j<6;j++){const a=rand()*6.28,r=1.0+rand()*.9,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r,ground=heightAt(xx,zz);if(ground!==null)stone(xx,ground+.15,zz,.28+rand()*.22,.22,.3,j%3,a);}
 }
 // Cooling tongue meets water; subdued basalt pillows visibly enter the sea.
 for(let i=0;i<17;i++){const a=i*2.399,r=.25+rand()*1.8,x=46.25+Math.cos(a)*r,z=-28.95+Math.sin(a)*r*.8;stone(x,-3.98+rand()*.14,z,.34+rand()*.45,.34+rand()*.2,.36+rand()*.42,i%3,a);}
 for(const [color,matrices] of bucket){const m=new THREE.InstancedMesh(rock,mats[color],matrices.length);matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));m.castShadow=m.receiveShadow=true;m.name='Batched fractured volcanic debris';root.add(m);stats.drawCalls++;}
 // Low-contrast soft vapor, never glossy spheres or bright flashing particles.
 const smokeCount=15,smokePositions=new Float32Array(smokeCount*3),smokeSeeds=Array.from({length:smokeCount},()=>rand());
 const smokeGeometry=new THREE.BufferGeometry();smokeGeometry.setAttribute('position',new THREE.BufferAttribute(smokePositions,3));
 const smokeMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=25.;}',fragmentShader:'void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.05,1.,r))*.11;gl_FragColor=vec4(.48,.47,.48,a);}'});
 const smoke=new THREE.Points(smokeGeometry,smokeMaterial);smoke.name='Gentle warm vent vapor';smoke.frustumCulled=false;root.add(smoke);stats.thermalVents=1;stats.drawCalls++;
 function update(t){clock.value=t;for(let i=0;i<smokeCount;i++){const p=(smokeSeeds[i]+t*.035)%1;smokePositions[i*3]=V.x+.4+p*1.2+Math.sin(i*2.3+p*4)*.26;smokePositions[i*3+1]=V.craterLevel+.2+p*3.7;smokePositions[i*3+2]=V.z-.3+Math.cos(i*1.7)*.25+p*.35;}smokeGeometry.attributes.position.needsUpdate=true;}
 update(0);scene.add(root);return{root,stats,update};
}
