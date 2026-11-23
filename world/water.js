import * as THREE from 'three';
import {MOSSFALL} from './biome-layout.js';
import {WATER_NOISE,impactFoam} from './water-material.js';

export function buildMossfallWater(scene){
 const root=new THREE.Group();root.name='Mossfall living water';scene.add(root);
 const clock={value:0},positions=[],uv=[],cascades=[],indices=[];let travel=0;
 const river=MOSSFALL.river;
 const normals=river.map((p,i)=>{const a=river[Math.max(0,i-1)],b=river[Math.min(river.length-1,i+1)],len=Math.hypot(b.x-a.x,b.z-a.z);return{x:(b.z-a.z)/len,z:-(b.x-a.x)/len};});
 for(let i=0;i<river.length-1;i++){
  const a=river[i],b=river[i+1],length=Math.hypot(b.x-a.x,b.z-a.z,b.y-a.y),steps=12;
  for(let j=0;j<=steps;j++){const t=j/steps,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t),y=THREE.MathUtils.lerp(a.y,b.y,t)+.055,w=THREE.MathUtils.lerp(a.width,b.width,t);
   const nx=THREE.MathUtils.lerp(normals[i].x,normals[i+1].x,t),nz=THREE.MathUtils.lerp(normals[i].z,normals[i+1].z,t);
   for(let k=0;k<=6;k++){positions.push(x+(k/6-.5)*w*nx,y,z+(k/6-.5)*w*nz);uv.push(k/6,travel+t*length);cascades.push(Math.abs(b.y-a.y)/Math.hypot(b.x-a.x,b.z-a.z)>.5?1:0);}
   if(j<steps){const base=positions.length/3-7;for(let k=0;k<6;k++)indices.push(base+k,base+k+7,base+k+8,base+k,base+k+8,base+k+1);}
  }travel+=length;
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('cascade',new THREE.Float32BufferAttribute(cascades,1));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:'#328e96',roughness:.48,metalness:0,side:THREE.DoubleSide,transparent:true,depthWrite:false});
 material.onBeforeCompile=shader=>{shader.uniforms.waterTime=clock;shader.vertexShader='attribute float cascade; varying float flowFall; varying vec2 flowUv;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nflowUv=uv;flowFall=cascade;');shader.fragmentShader='uniform float waterTime; varying float flowFall; varying vec2 flowUv;\n'+WATER_NOISE+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float bank=abs(flowUv.x-.5)*2.;
 vec2 current=vec2(flowUv.x*6.,flowUv.y*.8-waterTime*.75);
 float eddy=wfbm(current),fine=wnoise(current*3.+vec2(eddy*2.,-waterTime*.35));
 float edge=smoothstep(.68,1.,bank);
 float ripple=smoothstep(.68,.86,fine)*.11;
 diffuseColor.rgb=mix(vec3(.014,.115,.15),vec3(.08,.34,.30),edge*.8+eddy*.2)+ripple*vec3(.32,.43,.40);
 float thread=wfbm(vec2(flowUv.x*22.,flowUv.y*1.8-waterTime*3.8));
 float air=smoothstep(.28,.78,thread);
 diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.16,.43,.46),vec3(.72,.87,.87),air),flowFall);
 float bankFoam=smoothstep(.84,.98,bank)*smoothstep(.42,.72,eddy);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.58,.77,.70),bankFoam*.5);
 diffuseColor.a=mix(.94,.58,edge)*(1.-smoothstep(.96,1.,bank));
 diffuseColor.a=mix(diffuseColor.a,.76+air*.2,flowFall);
 if(flowFall>.5&&bank>.94+wnoise(current*5.)*.06)discard;
`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
 normal=normalize(normal+vec3(sin(flowUv.y*3.-waterTime*1.5),cos(flowUv.x*19.+waterTime),0.)*.025*(1.-flowFall));`);
 };
 const stream=new THREE.Mesh(geometry,material);stream.name='Continuous flowing river and two cascades';stream.receiveShadow=true;root.add(stream);
 const spriteCanvas=document.createElement('canvas');spriteCanvas.width=spriteCanvas.height=64;const ctx=spriteCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(235,255,242,.7)');gradient.addColorStop(1,'rgba(235,255,242,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);const sprite=new THREE.CanvasTexture(spriteCanvas);
 let seed=338;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const drops=[],mistPos=[],foamRings=[];
 for(const fall of MOSSFALL.falls){
  for(let i=0;i<65;i++){const p={x:fall.to.x+(random()-.5)*3.2,y:fall.to.y+.2,z:fall.to.z+random()*1.1,s:random(),speed:.25+random()*.3};drops.push(p);mistPos.push(p.x,p.y,p.z);}
  const foam=new THREE.Mesh(new THREE.PlaneGeometry(4.6,3.6),impactFoam(clock));foam.rotation.x=-Math.PI/2;foam.position.set(fall.to.x,fall.to.y+.09,fall.to.z+.25);root.add(foam);
 }
 const mistGeo=new THREE.BufferGeometry();mistGeo.setAttribute('position',new THREE.Float32BufferAttribute(mistPos,3));const mist=new THREE.Points(mistGeo,new THREE.PointsMaterial({map:sprite,color:'#d8f0db',size:1.4,transparent:true,opacity:.38,depthWrite:false,sizeAttenuation:true}));root.add(mist);
 const insects=[];for(let i=0;i<9;i++){const group=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:i%2?'#e7c86f':'#578dd2',side:THREE.DoubleSide}),wingGeometry=new THREE.CircleGeometry(.13,6),wings=[];for(const side of [-1,1]){const wing=new THREE.Mesh(wingGeometry,mat);wing.position.x=side*.12;wing.rotation.x=-Math.PI/2;group.add(wing);wings.push(wing);}const base={x:-30+(i%2?3:-3),y:4.8+random()*1.3,z:-1+random()*10};root.add(group);insects.push({group,wings,base,phase:random()*8});}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function update(time){const t=reduced?0:time;clock.value=t;const p=mistGeo.attributes.position;drops.forEach((d,i)=>{const age=(d.s+t*d.speed)%1;p.setXYZ(i,d.x+Math.sin(age*3+i)*age*.55,d.y+age*1.7,d.z+age*.7);});p.needsUpdate=true;foamRings.forEach(({ring,phase})=>{const age=(phase+t*.36)%1;ring.scale.setScalar(.5+age*1.1);ring.material.opacity=(1-age)*.28;});insects.forEach(({group,wings,base,phase})=>{group.position.set(base.x+Math.sin(t*.5+phase)*.7,base.y+Math.sin(t*.8+phase)*.2,base.z+Math.cos(t*.4+phase)*.8);wings.forEach((w,i)=>w.rotation.y=Math.sin(t*11+phase)*(i?1:-1)*.6);});}
 update(0);return{root,update,stats:{falls:MOSSFALL.falls.length,coastalOutlet:true,riverLength:travel,mistParticles:drops.length,butterflies:insects.length}};
}
