import * as THREE from 'three';
import {ROUTE} from './route/board-art.js';
import {MOSSFALL,riverSample,mossfallWeight,isOutlet,onRiverBridge} from './biome-layout.js';
import {zoneTint,coastBandColor} from './zones.js';
import {carveEmberPools} from './ember-layout.js';
import {carveArrivalCourt} from './harbor-layout.js';
import {WORLD_COAST,coastalElevation,coastDistrict,coastWallProfile} from './coast-layout.js';
import {carveEmberCoast} from './ember-coast-layout.js';
export {MOSSFALL,riverSample,riverDistance,waterHeightAt,mossfallWeight} from './biome-layout.js';

export const ROUTE_RISE=13,ARENA_Y=12.3;
const SCALE=.065,SEA_Y=-3.8,STEP=.62;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const world=p=>({x:(p.x-800)*SCALE,z:(p.y-655)*SCALE});
// The slope eases into six long shelves, but never reverses toward the finish.
export function routeHeight(t){t=clamp(t);return .6+ROUTE_RISE*(t-.055*Math.sin(t*Math.PI*6)/(Math.PI*6));}
export const edgeHeight=i=>routeHeight(clamp(i,0,144)/144);
export const routePoints=ROUTE.points.map((p,i)=>({...world(p),y:routeHeight(i/(ROUTE.points.length-1))}));
export const COAST=WORLD_COAST;
const MIN_X=Math.min(...COAST.map(p=>p.x)),MAX_X=Math.max(...COAST.map(p=>p.x));
// Preserve the old grid lattice when extending the northern headland; unchanged
// regions must keep identical interpolation, foundations and route clearances.
const MIN_Z=-34.775-Math.ceil(Math.max(0,-34.775-Math.min(...COAST.map(p=>p.z)))/STEP)*STEP,MAX_Z=Math.max(...COAST.map(p=>p.z));
const NX=Math.ceil((MAX_X-MIN_X)/STEP),NZ=Math.ceil((MAX_Z-MIN_Z)/STEP);

function nearestRoute(x,z){
 let best=Infinity,result;
 for(let i=0;i<routePoints.length-1;i++){
  const a=routePoints[i],b=routePoints[i+1],dx=b.x-a.x,dz=b.z-a.z;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));
  const d=(x-a.x-t*dx)**2+(z-a.z-t*dz)**2;
  if(d<best){best=d;result={distance:Math.sqrt(d),y:a.y+(b.y-a.y)*t,index:i};}
 }
 return result;
}
export const routeDistance=(x,z)=>nearestRoute(x,z).distance;

const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
function barycentric(a,b,c,x,z){
 const p={x,z},den=cross(a,b,c),u=cross(p,b,c)/den,v=cross(a,p,c)/den;
 return [u,v,1-u-v];
}
export const sectionTriangles=ROUTE.cells.map((cell,i)=>cell.strip.slice(0,-1).flatMap((a,j)=>{
 const b=cell.strip[j+1],n=cell.strip.length-1;
 const pts=[a.left,b.left,b.right,a.right].map((p,k)=>({...world(p),y:edgeHeight(i+(j+(k===1||k===2?1:0))/n)}));
 return [[pts[0],pts[1],pts[2]],[pts[0],pts[2],pts[3]]];
}));
function edgeDistance(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);}
function triangleDistance(x,z,t,w){return Math.min(...w)>=0?0:Math.min(edgeDistance(x,z,t[0],t[1]),edgeDistance(x,z,t[1],t[2]),edgeDistance(x,z,t[2],t[0]));}
function analyticHeight(x,z){
 const nearest=nearestRoute(x,z);
 let weighted=0,total=0;
 for(let i=0;i<routePoints.length;i+=2){const p=routePoints[i],w=1/(1+(x-p.x)**2+(z-p.z)**2)**1.65;weighted+=p.y*w;total+=w;}
 const hills=2.3*Math.sin(x*.18+z*.08)*Math.cos(z*.16)+.85*Math.sin(x*.37-z*.23);
 const ridge=7.5*Math.exp(-((x-20)**2/80+(z+24)**2/34))+4.5*Math.exp(-((x+18)**2/52+(z+13)**2/90));
 let y=nearest.y-.11+(weighted/total+hills+ridge-nearest.y)*smooth(1.65,5.4,nearest.distance);
 // Mossfall is a sculpted canyon inside the existing route corridor. Broad
 // banks rise above the pools; two genuine bed drops support the waterfalls.
 const river=riverSample(x,z),bank=river.distance-river.width/2;
 const biome=Math.max(mossfallWeight(x,z),isOutlet(x,z)?1:0),routeSafe=isOutlet(x,z)?1:smooth(1.85,3.1,nearest.distance);
 if(biome>0){
  const headRidge=4.6*Math.exp(-((x+27.9)**2/24+(z+20)**2/48));
  const rearRidge=2.7*Math.exp(-((x+34)**2/8+(z+12)**2/80));
  const rockShoulder=(headRidge+rearRidge)*biome*routeSafe;
  y+=rockShoulder;
  // Raised lips retain the high pools; exposed outside faces form substantial
  // canyon walls rather than a water plane hovering over the original hillside.
  // A pool is cut INTO a broad rock terrace. The old sub-unit lip left a
  // narrow vertical shelf hanging above the low foreground route. Carry its
  // mass several units into the hillside, then ease down to the existing land.
  // The route safety mask still reserves the unchanged numbered path planes.
  const shoulderWidth=4.8+.65*Math.sin(z*.57+x*.31);
  const lip=(1-smooth(.65,shoulderWidth,Math.max(0,bank)))*routeSafe;
  const rockyLip=river.y+.55+.16*Math.sin(z*.83+x*.6)*Math.cos(x*.9);
  y=Math.max(y,y+(rockyLip-y)*lip);
  // Keep an extra half grid cell of submerged bed beyond each water edge,
  // avoiding water intersecting triangles at the coarser terrain resolution.
  const channel=1-smooth(.5,1.2,bank);
  // Submerged gravel shallows rise toward the edge; the deep centre remains
  // visibly beneath the translucent water, without a thick exposed green slab.
  const shallows=smooth(-river.width*.32,.55,bank);
  const bed=river.y-.95+shallows*.32+.055*Math.sin(x*1.3+z*.8);
  y=y*(1-channel*routeSafe)+bed*channel*routeSafe;
 }
 y=carveEmberPools(x,z,y,nearest.distance);
 y=carveArrivalCourt(x,z,y);
 y=coastalElevation(x,z,y,nearest.distance);
 y=carveEmberCoast(x,z,y,nearest.distance);
 // A broad, level bowl foundation blends into the last hillside, away from the path.
 const pad=1-smooth(6.95,9.1,Math.hypot(x,z));y=y*(1-pad)+ARENA_Y*pad;
 // Protect entire tile footprints, not only their centreline. Extend their planes
 // one mesh diagonal beyond the footprint so interpolation cannot swallow corners.
 if(nearest.distance<3&&!onRiverBridge(x,z)){
  const index=Math.floor(nearest.index/2);
  for(let i=Math.max(0,index-2);i<=Math.min(143,index+2);i++)for(const triangle of sectionTriangles[i]){
   const w=barycentric(...triangle,x,z);
   if(triangleDistance(x,z,triangle,w)<STEP*1.45)y=Math.min(y,w.reduce((s,v,j)=>s+v*triangle[j].y,0)-.09);
  }
 }
 return y;
}

function clip(poly,axis,value,greater){
 const out=[];for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],ain=greater?a[axis]>=value:a[axis]<=value,bin=greater?b[axis]>=value:b[axis]<=value;
  if(ain)out.push(a);
  if(ain!==bin){const t=(value-a[axis])/(b[axis]-a[axis]);out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
 }return out;
}
let surface;
function makeSurface(){
 if(surface)return surface;
 const positions=[],triangles=[],buckets=new Map(),cache=new Map();
 const vertex=p=>{const key=`${p.x.toFixed(6)},${p.z.toFixed(6)}`;if(cache.has(key))return cache.get(key);const i=positions.length;positions.push({x:p.x,y:analyticHeight(p.x,p.z),z:p.z});cache.set(key,i);return i;};
 for(let iz=0;iz<NZ;iz++)for(let ix=0;ix<NX;ix++){
  const x=MIN_X+ix*STEP,z=MIN_Z+iz*STEP;
  let poly=clip(COAST,'x',x,true);poly=clip(poly,'x',x+STEP,false);poly=clip(poly,'z',z,true);poly=clip(poly,'z',z+STEP,false);
  if(poly.length<3)continue;
  const list=[],faces=THREE.ShapeUtils.triangulateShape(poly.map(p=>new THREE.Vector2(p.x,p.z)),[]);
  for(const face of faces){
   const [a,b,c]=face.map(i=>poly[i]),area=cross(a,b,c);
   if(Math.abs(area)<1e-6)continue;
   const tri=(area>0?[a,c,b]:[a,b,c]).map(vertex);triangles.push(tri);list.push(tri);
  }
  buckets.set(iz*NX+ix,list);
 }
 surface={positions,triangles,buckets};return surface;
}
/** Exact barycentric sample of the rendered triangles; null outside the coast. */
export function heightAt(x,z){
 const s=makeSurface(),ix=Math.floor((x-MIN_X)/STEP),iz=Math.floor((z-MIN_Z)/STEP);
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)for(const tri of s.buckets.get((iz+dz)*NX+ix+dx)||[]){
  const pts=tri.map(i=>s.positions[i]),w=barycentric(...pts,x,z);
  if(Math.min(...w)>=-1e-7)return w.reduce((sum,v,i)=>sum+v*pts[i].y,0);
 }
 return null;
}

export function buildTerrain(scene){
 const s=makeSurface(),root=new THREE.Group();root.name='Mossfall sculpted winding terrain';
 const geometry=new THREE.BufferGeometry(),positions=[],colors=[];
 for(const p of s.positions){
  positions.push(p.x,p.y,p.z);
  const distance=routeDistance(p.x,p.z),trail=1-smooth(1.4,3.2,distance),noise=.5+.5*Math.sin(p.x*.38+Math.sin(p.z*.29))*Math.cos(p.z*.32);
  const patch=.5+.5*Math.sin(p.x*.11+1.7)*Math.sin(p.z*.13-.6),bed=1-smooth(1.25,2.05,distance);
  // Chill-pop meadow: soft lawn patches, and a sandy road bed that outlines every section.
  const color=new THREE.Color('#5f9f45').lerp(new THREE.Color('#93c95c'),noise*.55).lerp(new THREE.Color('#4c8a3f'),smooth(.62,.95,patch)*.45).lerp(new THREE.Color('#a8d36a'),trail*.25).lerp(new THREE.Color('#e9cf95'),bed*.92);
  const biome=mossfallWeight(p.x,p.z),river=riverSample(p.x,p.z),bank=river.distance-river.width/2;
  const forest=new THREE.Color('#53856d').lerp(new THREE.Color('#a9c581'),noise*.55);
  color.lerp(forest,biome*(1-trail*.8)*.9);
  if(bank<2.2){
   const stone=new THREE.Color('#8d7462').lerp(new THREE.Color('#c9ad8a'),.5+.5*Math.sin(p.y*2.6));
   color.lerp(stone,biome*(1-smooth(.5,2.2,bank))*(1-trail));
  }
  zoneTint(color,p,noise);
  if(p.x>35&&p.z>-10&&p.z<34&&p.y<1.5)color.lerp(new THREE.Color('#b9b89a'),1-smooth(-1.5,1.5,p.y));
  color.multiplyScalar(1+clamp((p.y-8)/6)*.06);colors.push(color.r,color.g,color.b);
 }
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(s.triangles.flat());geometry.computeVertexNormals();
 // Exposed steep canyon faces are rock, not stretched vertical lawn.
 const normals=geometry.attributes.normal,tints=geometry.attributes.color;
 s.positions.forEach((p,i)=>{const weight=mossfallWeight(p.x,p.z),steep=1-smooth(.25,.75,normals.getY(i));if(weight*steep<.01)return;const band=.5+.5*Math.sin(p.y*1.45+p.z*.57+p.x*.8),stone=new THREE.Color('#9a6646').lerp(new THREE.Color('#d9a571'),band*.65);const color=new THREE.Color(tints.getX(i),tints.getY(i),tints.getZ(i)).lerp(stone,weight*steep);tints.setXYZ(i,color.r,color.g,color.b);});
 const groundMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,flatShading:true});
 // Vertex colours alone stretched grassy olive over tall canyon triangles.
 // Exposed faces instead receive world-height sediment bands, continuous across
 // triangle boundaries. Horizontal seams follow geology, never vertical posts.
 groundMaterial.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 canyonPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncanyonPosition=position;');
  shader.fragmentShader='varying vec3 canyonPosition;\n'+shader.fragmentShader;
  const stoneA=new THREE.Color('#9b5f3d').toArray().join(','),stoneB=new THREE.Color('#e0a56c').toArray().join(','),seam=new THREE.Color('#6e3d29').toArray().join(',');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 cliffNormal=normalize(cross(dFdx(canyonPosition),dFdy(canyonPosition)));
   float cliffSlope=1.-smoothstep(.38,.84,abs(cliffNormal.y));
   float canyonEllipse=pow((canyonPosition.x+30.)/15.,2.)+pow((canyonPosition.z+4.)/29.,2.);
   float canyonWeight=clamp((1.2-canyonEllipse)/.7,0.,1.);
   float sedimentHeight=canyonPosition.y+.31*sin(canyonPosition.z*.68)+.19*sin(canyonPosition.x*1.1);
   float sediment=.5+.5*sin(sedimentHeight*4.7);
   vec3 exposedRock=mix(vec3(${stoneA}),vec3(${stoneB}),.43+sediment*.23);
   float seamPhase=fract(sedimentHeight*.78);
   float seamWidth=max(fwidth(sedimentHeight)*.6,.025);
   float seamLine=1.-smoothstep(.035,.035+seamWidth,min(seamPhase,1.-seamPhase));
   exposedRock=mix(exposedRock,vec3(${seam}),seamLine*.18);
   float mottling=sin(canyonPosition.x*7.1+canyonPosition.z*3.7)*sin(canyonPosition.y*9.7-canyonPosition.z*5.3);
   exposedRock*=1.+mottling*.06;
   diffuseColor.rgb=mix(diffuseColor.rgb,exposedRock,cliffSlope*canyonWeight*.95);
  `);
 };
 groundMaterial.customProgramCacheKey=()=> 'mossfall-horizontal-sediment-v2';
 const ground=new THREE.Mesh(geometry,groundMaterial);ground.name='Continuous sculpted hills';ground.receiveShadow=true;ground.castShadow=true;root.add(ground);
 const cliffPositions=[],cliffColors=[];
 const coastNormals=COAST.map((p,i)=>{const before=COAST[(i+COAST.length-1)%COAST.length],after=COAST[(i+1)%COAST.length],la=Math.hypot(p.x-before.x,p.z-before.z),lb=Math.hypot(after.x-p.x,after.z-p.z),x=(p.z-before.z)/la+(after.z-p.z)/lb,z=-(p.x-before.x)/la-(after.x-p.x)/lb,len=Math.hypot(x,z);return{x:x/len,z:z/len};});
 function cliffTri(a,b,c,band){for(const p of [a,b,c]){
  // Sample each vertex, not the whole segment: shared endpoints get identical
  // colour and the same ecological fringe continues down the cliff face.
  const color=coastBandColor(p.x,p.z,band).multiplyScalar(.97+.03*Math.sin(p.x*.73+p.z*.41));
  cliffPositions.push(p.x,p.y,p.z);cliffColors.push(color.r,color.g,color.b);
 }}
 for(let i=0;i<COAST.length;i++){
  const a=COAST[i],b=COAST[(i+1)%COAST.length],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/STEP);
  for(let j=0;j<steps;j++){
   const p={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps},q={x:a.x+(b.x-a.x)*(j+1)/steps,z:a.z+(b.z-a.z)*(j+1)/steps};
   p.y=heightAt(p.x,p.z)??analyticHeight(p.x,p.z);q.y=heightAt(q.x,q.z)??analyticHeight(q.x,q.z);
   const len=Math.hypot(b.x-a.x,b.z-a.z);
   const bands=[0,.12,.38,.72,1];
   for(let k=0;k<4;k++){
    const v=(point,t)=>{const along=Math.hypot(point.x-a.x,point.z-a.z)/len,n0=coastNormals[i],n1=coastNormals[(i+1)%COAST.length],normalX=n0.x+(n1.x-n0.x)*along,normalZ=n0.z+(n1.z-n0.z)*along,normalLength=Math.hypot(normalX,normalZ),authored=coastWallProfile(point,t,normalX/normalLength,normalZ/normalLength);if(authored)return authored;const west=point.x<-38?smooth(-18,-10,point.z)*(1-smooth(30,39,point.z)):0;
     const outlet=1-Math.exp(-(((point.z-11.4)/2.4)**4));
     const ledge=west*outlet*Math.sin(t*Math.PI)*(.65+.55*Math.sin(point.z*1.9)+.6*Math.sin(point.z*.61)**2);
     return{x:point.x-ledge,y:point.y+(SEA_Y-point.y)*t+west*Math.sin(t*Math.PI)*.18*Math.sin(point.z*2.7),z:point.z};},v0=v(p,bands[k]),v1=v(q,bands[k]),v2=v(q,bands[k+1]),v3=v(p,bands[k+1]);
    cliffTri(v0,v1,v2,k);cliffTri(v0,v2,v3,k);
   }
  }
 }
 const cliffs=new THREE.BufferGeometry();cliffs.setAttribute('position',new THREE.Float32BufferAttribute(cliffPositions,3));cliffs.setAttribute('color',new THREE.Float32BufferAttribute(cliffColors,3));cliffs.computeVertexNormals();
 const cliffMesh=new THREE.Mesh(cliffs,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));cliffMesh.name='Grounded coastal strata';cliffMesh.castShadow=true;cliffMesh.receiveShadow=true;root.add(cliffMesh);
 scene?.add(root);
 return{root,heightAt,routeDistance,bounds:new THREE.Box3().setFromObject(root),stats:{vertices:s.positions.length,triangles:s.triangles.length,routeRise:ROUTE_RISE,sections:144,coastVertices:COAST.length,biome:'Mossfall',waterfalls:MOSSFALL.falls.length}};
}
