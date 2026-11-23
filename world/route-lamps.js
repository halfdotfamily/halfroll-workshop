import * as THREE from 'three';
import {routePoints,edgeHeight} from './terrain.js';
import {ROUTE} from './route/board-art.js';
import {buildLanternHeads} from './world-lanterns.js';

// Iron street lamps beside the trail. By day they are scenery; at night their
// lanterns glow and paint a warm pool of light over the path beside them.
// The light is faked (glow, halo and a terrain-hugging pool), never real
// lights, so dozens of lamps cost only a few draw calls.
function nearestRouteY(x,z){let best=Infinity,y=0;for(let i=0;i<routePoints.length-1;i++){const a=routePoints[i],b=routePoints[i+1],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz))),d=(x-a.x-t*dx)**2+(z-a.z-t*dz)**2;if(d<best){best=d;y=a.y+(b.y-a.y)*t;}}return y;}
export function buildRouteLamps(scene,{heightAt,routeDistance,waterHeightAt=()=>null,every=4,avoid=[],arenaRadius=9.4}={}){
 const root=new THREE.Group();root.name='Route lamps';
 const lamps=[],n=routePoints.length-1;
 for(let section=3;section<=143;section+=every){
  const at=(section-.5)/144*n,i=Math.min(n-1,Math.floor(at)),a=routePoints[i],b=routePoints[i+1],tx=b.x-a.x,tz=b.z-a.z,len=Math.hypot(tx,tz)||1,cx=a.x+(b.x-a.x)*(at-i),cz=a.z+(b.z-a.z)*(at-i);
  // Try the outer side first, then the inner side; keep clear of other sections.
  for(const side of Math.floor(section/every)%2?[1,-1]:[-1,1]){
   const x=cx-tz/len*2.05*side,z=cz+tx/len*2.05*side,y=heightAt(x,z),w=waterHeightAt(x,z);
   if(!Number.isFinite(y)||routeDistance(x,z)<1.85||Math.hypot(x,z)<arenaRadius||(Number.isFinite(w)&&w>y-.3)||avoid.some(q=>Math.hypot(x-q.x,z-q.z)<q.r))continue;
   lamps.push({x,y,z,px:cx,py:a.y+(b.y-a.y)*(at-i),pz:cz,section});break;
  }
 }
 const iron=new THREE.MeshStandardMaterial({color:'#2f3a56',roughness:.6,metalness:.2}),brass=new THREE.MeshStandardMaterial({color:'#e1bf72',roughness:.5});
 const glass=new THREE.MeshStandardMaterial({color:'#fff4d6',emissive:'#ffcf6a',emissiveIntensity:0,roughness:.3});
 const parts=[[new THREE.CylinderGeometry(.06,.085,1.55,8),iron,.78],[new THREE.CylinderGeometry(.16,.2,.12,10),iron,.06],[new THREE.CylinderGeometry(.11,.11,.06,8),brass,1.56],[new THREE.BoxGeometry(.24,.3,.24),glass,1.74],[new THREE.ConeGeometry(.22,.2,4),iron,1.99],[new THREE.SphereGeometry(.05,6,4),brass,2.12]];
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(1,1,1),v=new THREE.Vector3();
 for(const [geo,mat,h] of parts){const mesh=new THREE.InstancedMesh(geo,mat,lamps.length);mesh.name='Route lamp';lamps.forEach((l,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4);mesh.setMatrixAt(i,m.compose(v.set(l.x,l.y+h,l.z),q,s));});mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
 const heads=buildLanternHeads(lamps.map(l=>new THREE.Vector3(l.x,l.y+1.74,l.z)));root.add(heads.root);
 // Light pools: a disc that follows the ground and the trail surface.
 const pos=[],alpha=[],idx=[],R=3.6,rings=7,segs=28;
 lamps.forEach(l=>{const ox=l.x+(l.px-l.x)*.35,oz=l.z+(l.pz-l.z)*.35,base=pos.length/3;
  for(let r=0;r<=rings;r++)for(let k=0;k<(r?segs:1);k++){const rr=r/rings*R,ang=k/segs*6.283,x=ox+Math.cos(ang)*rr,z=oz+Math.sin(ang)*rr;
   const onRoute=routeDistance(x,z)<1.5,y=onRoute?nearestRouteY(x,z)+.16:(heightAt(x,z)??l.y)+.07;pos.push(x,y,z);alpha.push(r/rings);}
  for(let k=0;k<segs;k++)idx.push(base,base+1+k,base+1+(k+1)%segs);
  for(let r=1;r<rings;r++)for(let k=0;k<segs;k++){const a0=base+1+(r-1)*segs+k,a1=base+1+(r-1)*segs+(k+1)%segs,b0=a0+segs,b1=a1+segs;idx.push(a0,b0,b1,a0,b1,a1);}
 });
 const poolGeo=new THREE.BufferGeometry();poolGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));poolGeo.setAttribute('ring',new THREE.Float32BufferAttribute(alpha,1));poolGeo.setIndex(idx);
 const poolMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-2,uniforms:{uNight:{value:0}},
  vertexShader:'attribute float ring;varying float vR;void main(){vR=ring;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float uNight;varying float vR;void main(){float a=exp(-vR*vR*3.8)*(1.-smoothstep(.65,1.,vR));gl_FragColor=vec4(vec3(1.,.82,.55),a*.29*uNight);}'});
 const pools=new THREE.Mesh(poolGeo,poolMat);pools.name='Route lamp light pools';pools.renderOrder=1;pools.visible=false;root.add(pools);
 // Copy the authored tile strips, not a nearest-centre approximation. Their
 // changing planes are what the player sees; light must sit on those planes.
 const pathPos=[],pathStrength=[],pathIdx=[];
 ROUTE.cells.forEach((cell,i)=>{
  const base=pathPos.length/3,n=cell.strip.length-1;
  cell.strip.forEach((frame,j)=>{for(const p of [frame.left,frame.right]){
   const x=(p.x-800)*.065,z=(p.y-655)*.065,y=edgeHeight(i+j/n)+.145;
   let strength=0;for(const l of lamps){const dy=Math.abs(l.py+.145-y);if(dy>1.6)continue;const d=Math.hypot(x-l.px,z-l.pz);strength=Math.max(strength,Math.exp(-d*d/11)*(1-smoothEdge(3.2,5.8,d))*(1-dy/1.6));}
   pathPos.push(x,y,z);pathStrength.push(strength);
  }});
  for(let j=0;j<n;j++){const a=base+j*2;pathIdx.push(a,a+2,a+3,a,a+3,a+1);}
 });
 const pathGeo=new THREE.BufferGeometry();pathGeo.setAttribute('position',new THREE.Float32BufferAttribute(pathPos,3));pathGeo.setAttribute('strength',new THREE.Float32BufferAttribute(pathStrength,1));pathGeo.setIndex(pathIdx);
 const pathMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-1,uniforms:{uNight:{value:0}},
  vertexShader:'attribute float strength;varying float vLight;void main(){vLight=strength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float uNight;varying float vLight;void main(){gl_FragColor=vec4(1.,.65,.25,vLight*.40*uNight);}'});
 const pathLight=new THREE.Mesh(pathGeo,pathMat);pathLight.name='Warm light on authored tile planes';pathLight.renderOrder=2;pathLight.visible=false;root.add(pathLight);
 scene.add(root);
 function setNight(n){const k=Math.max(0,Math.min(1,(n-.15)/.6));glass.emissiveIntensity=k*1.65;heads.setNight(k);poolMat.uniforms.uNight.value=k;pools.visible=k>.02;pathMat.uniforms.uNight.value=k;pathLight.visible=k>.02;}
 return{root,setNight,count:lamps.length};
}
function smoothEdge(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
