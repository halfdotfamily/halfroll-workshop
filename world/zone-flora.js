import * as THREE from 'three';
import {GLTFLoader} from '../assets/nature-mossfall/vendor/GLTFLoader.js';
import {ZONE_FLORA} from './zone-flora-plan.js';

// Region-specific planting. A zone's territory is learned from the authored
// district groups themselves (nearest authored object wins), so each district
// is filled only with its own plants and props. Decorative only.
const DISTRICTS={
 dock:['Drift Dock — arrival market','Unbranded quay masonry'],
 mossfall:['Mossfall — imported CC0 botanical layers','Blender authored Mossfall landmarks','Mossfall living water'],
 ember:['Ember Hollow — the old mint','Ember coast — the broken lantern volcano'],
 woods:['Pocket Woods / the lantern village','Pocket Woods / rooted coves'],
 crown:['Crown Garden — the quiet ruins','Crown Garden — weathered hillside terraces'],
};
const ASSETS=new URL('../assets/zone-flora/',import.meta.url);
export async function buildZoneFlora(scene,{heightAt,routeDistance,waterHeightAt=()=>null,riverSample=null,river=[],ground,arenaRadius=10.6,seed=20261020,onProgress=()=>{},avoid=[]}={}){
 const root=new THREE.Group();root.name='Zone flora';
 let s=seed>>>0;const rnd=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296),lerp=(a,b)=>a+(b-a)*rnd();
 scene.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(ground),CELL=.4;
 const gx=x=>Math.floor((x-box.min.x)/CELL),gz=z=>Math.floor((z-box.min.z)/CELL),NX=gx(box.max.x)+1,NZ=gz(box.max.z)+1,at=(x,z)=>{const X=gx(x),Z=gz(z);return X>=0&&Z>=0&&X<NX&&Z<NZ?Z*NX+X:-1;};
 const v=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()],m=new THREE.Matrix4(),im=new THREE.Matrix4();
 // 1. Territories: vote authored object positions into a coarse grid, then grow.
 const ZC=1.2,zx=x=>Math.floor((x-box.min.x)/ZC),zz=z=>Math.floor((z-box.min.z)/ZC),ZX=zx(box.max.x)+1,ZZ=zz(box.max.z)+1,keys=Object.keys(DISTRICTS);
 const votes=new Float32Array(ZX*ZZ*keys.length);
 const vote=(k,x,z,w=1)=>{const X=zx(x),Z=zz(z);if(X>=0&&Z>=0&&X<ZX&&Z<ZZ)votes[(Z*ZX+X)*keys.length+k]+=w;};
 for(const top of scene.children){const k=keys.findIndex(key=>DISTRICTS[key].includes(top.name));if(k<0)continue;
  top.traverse(o=>{if(!o.isMesh)return;
   if(o.isInstancedMesh){for(let i=0;i<o.count;i++){o.getMatrixAt(i,im);v[0].setFromMatrixPosition(im).applyMatrix4(o.matrixWorld);vote(k,v[0].x,v[0].z);}return;}
   const p=o.geometry.attributes.position,step=Math.max(1,Math.floor(p.count/600));for(let i=0;i<p.count;i+=step){v[0].fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);vote(k,v[0].x,v[0].z,step/40);}});}
 const zone=new Int8Array(ZX*ZZ).fill(-1);let frontier=[];
 for(let c=0;c<ZX*ZZ;c++){let best=-1,bw=0;for(let k=0;k<keys.length;k++){const w=votes[c*keys.length+k];if(w>bw){bw=w;best=k;}}if(best>=0&&bw>=1){zone[c]=best;frontier.push(c);}}
 while(frontier.length){const next=[];for(const c of frontier){const X=c%ZX,Z=(c-X)/ZX;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=X+dx,nz=Z+dz;if(nx<0||nz<0||nx>=ZX||nz>=ZZ)continue;const n=nz*ZX+nx;if(zone[n]<0){zone[n]=zone[c];next.push(n);}}}frontier=next;}
 const zoneAt=(x,z)=>{const X=zx(x),Z=zz(z);return X>=0&&Z>=0&&X<ZX&&Z<ZZ?keys[zone[Z*ZX+X]]:null;};
 // 2. Occupancy: footprints of every existing solid prop; lawn colour from terrain.
 const blocked=new Uint8Array(NX*NZ);
 const groundLike=o=>o===ground||/sea|ocean|water|river|fall|foam|strata|cliff|terrain|hills|sections|road bed|curb|halo|rim/i.test(o.name)||o.material?.transparent;
 function mark(a,b,c){const x0=Math.max(0,gx(Math.min(a.x,b.x,c.x))),x1=Math.min(NX-1,gx(Math.max(a.x,b.x,c.x))),z0=Math.max(0,gz(Math.min(a.z,b.z,c.z))),z1=Math.min(NZ-1,gz(Math.max(a.z,b.z,c.z)));if((x1-x0)*(z1-z0)>400)return;for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)blocked[z*NX+x]=1;}
 scene.traverse(o=>{if(!o.isMesh||!o.visible||groundLike(o)||!o.geometry?.attributes?.position)return;const pos=o.geometry.attributes.position,idx=o.geometry.index,count=idx?idx.count:pos.count,n=o.isInstancedMesh?o.count:1;
  for(let k=0;k<n;k++){if(o.isInstancedMesh){o.getMatrixAt(k,im);m.multiplyMatrices(o.matrixWorld,im);}else m.copy(o.matrixWorld);for(let t=0;t+2<count;t+=3){for(let j=0;j<3;j++)v[j].fromBufferAttribute(pos,idx?idx.getX(t+j):t+j).applyMatrix4(m);mark(v[0],v[1],v[2]);}}});
 const gpos=ground.geometry.attributes.position,gcol=ground.geometry.attributes.color,lawn=new Uint8Array(NX*NZ),c=new THREE.Color();
 if(gcol)for(let i=0;i<gpos.count;i++){c.setRGB(gcol.getX(i),gcol.getY(i),gcol.getZ(i));if(c.g>c.r*1.12&&c.g>c.b*1.25){const x=gx(gpos.getX(i)),z=gz(gpos.getZ(i));for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const X=x+dx,Z=z+dz;if(X>=0&&Z>=0&&X<NX&&Z<NZ)lawn[Z*NX+X]=1;}}}
 const taken=[];
 function open(x,z,r,it){
  if(avoid.some(q=>Math.hypot(x-q.x,z-q.z)<q.r+r))return null;
  if(Math.hypot(x,z)<arenaRadius+r||routeDistance(x,z)<(it.clear??2)+r)return null;
  const y=heightAt(x,z);if(!Number.isFinite(y))return null;
  const water=waterHeightAt(x,z);if(Number.isFinite(water)&&water>y-.2)return null;
  for(const [dx,dz] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]){const i=at(x+dx,z+dz);if(i<0||blocked[i])return null;if(zoneAt(x+dx,z+dz)!==it.zone)return null;if(it.ground==='green'&&!lawn[i])return null;}
  const e=.45,hx=(heightAt(x+e,z)??y)-(heightAt(x-e,z)??y),hz=(heightAt(x,z+e)??y)-(heightAt(x,z-e)??y);
  if(1/Math.hypot(hx/(2*e),hz/(2*e),1)<(it.flat??.66))return null;
  if(taken.some(t=>Math.hypot(t.x-x,t.z-z)<t.r+r))return null;
  return y;
 }
 // 3. Models, normalised to unit height with their base at y=0.
 const loader=new GLTFLoader(),models=new Map(),failedAssets=[];
 let completed=0;
 const files=[...new Set(Object.values(ZONE_FLORA).flatMap(z=>z.items.map(i=>i.file)))];
 await Promise.all(files.map(async file=>{
  try{const g=await loader.loadAsync(new URL(file,ASSETS).href);g.scene.updateMatrixWorld(true);
   const b=new THREE.Box3().setFromObject(g.scene),size=b.getSize(new THREE.Vector3()),ctr=b.getCenter(new THREE.Vector3());
   const norm=new THREE.Matrix4().makeScale(1/size.y,1/size.y,1/size.y).multiply(new THREE.Matrix4().makeTranslation(-ctr.x,-b.min.y,-ctr.z)),parts=[];
   g.scene.traverse(o=>{if(o.isMesh)parts.push({geometry:o.geometry.clone().applyMatrix4(norm.clone().multiply(o.matrixWorld)),material:o.material});});
   models.set(file,{parts,radius:Math.max(size.x,size.z)/size.y/2});}catch(error){failedAssets.push(file);console.warn('zone flora: '+file+' — '+error.message);}finally{onProgress(++completed,files.length);}
 }));
 // 4. Planting per zone, item by item, with small clusters.
 const stats={};const matrices=new Map();const zoneCells={};
 for(let Z=0;Z<ZZ;Z++)for(let X=0;X<ZX;X++){const k=keys[zone[Z*ZX+X]];(zoneCells[k]??=[]).push([box.min.x+(X+.5)*ZC,box.min.z+(Z+.5)*ZC]);}
 const riverPts=[];for(let i=0;i<river.length-1;i++)for(let t=0;t<1;t+=.1){const a=river[i],b=river[i+1];riverPts.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,w:(a.width+(b.width-a.width)*t)});}
 function plant(it,x,z,y){const model=models.get(it.file),h=lerp(...it.h),r=model.radius*h;
  const mt=new THREE.Matrix4().compose(new THREE.Vector3(x,y-.02,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rnd()*Math.PI*2),new THREE.Vector3(h,h,h));
  if(!matrices.has(it))matrices.set(it,[]);matrices.get(it).push(mt);taken.push({x,z,r:Math.max(.25,r*.8)});stats[it.zone]=(stats[it.zone]||0)+1;}
 for(const [key,z] of Object.entries(ZONE_FLORA)){const cells=zoneCells[key]||[];for(const raw of z.items){const it={...raw,zone:key,ground:raw.ground??z.ground};const model=models.get(it.file);if(!model)continue;
  let placed=0;
  if(it.water){for(let a=0;a<it.count*30&&placed<it.count&&riverPts.length;a++){const p=riverPts[Math.floor(rnd()*riverPts.length)];if(zoneAt(p.x,p.z)!==key)continue;const x=p.x+lerp(-.35,.35)*p.w,zz2=p.z+lerp(-.35,.35)*p.w,w=waterHeightAt(x,zz2);if(!Number.isFinite(w)||taken.some(t=>Math.hypot(t.x-x,t.z-zz2)<.35))continue;plant(it,x,zz2,w+.03);placed++;}continue;}
  for(let a=0;a<it.count*60&&placed<it.count&&cells.length;a++){
   const [cx,cz]=cells[Math.floor(rnd()*cells.length)],x=cx+lerp(-.6,.6),zz2=cz+lerp(-.6,.6),r=model.radius*it.h[1],y=open(x,zz2,r,it);if(y===null)continue;
   plant(it,x,zz2,y);placed++;
   for(let k=1;k<(it.cluster||1)&&placed<it.count;k++){const ang=rnd()*6.28,d=lerp(r*1.6+.3,r*2.6+.8),nx=x+Math.cos(ang)*d,nz=zz2+Math.sin(ang)*d,ny=open(nx,nz,r,it);if(ny!==null){plant(it,nx,nz,ny);placed++;}}
  }}}
 for(const [it,list] of matrices){const model=models.get(it.file);for(const part of model.parts){
  let material=part.material;if(it.tint||it.glow){material=(Array.isArray(material)?material:[material]).map(mm=>{const q=mm.clone();if(it.tint)q.color.set(it.tint);if(it.glow){q.emissive=new THREE.Color(it.glow);q.emissiveIntensity=.55;}return q;});if(material.length===1)material=material[0];}
  const mesh=new THREE.InstancedMesh(part.geometry,material,list.length);mesh.name='Zone flora '+it.zone+' '+it.file;list.forEach((mt,i)=>mesh.setMatrixAt(i,mt));mesh.castShadow=it.h[1]>.5;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);}}
 scene.add(root);
 return{root,zoneAt,stats,assetStats:{requested:files.length,loaded:models.size,failed:failedAssets}};
}
