import {buildWishThroneV2} from './wish-throne-v2.js';
import {paintTile,buildFieldProps} from './tile-style.js';
import {buildTileNumbers} from './tile-numbers.js';
import * as THREE from 'three';
import {ROUTE,PALETTE,PORTAL_COLORS,linkCurve} from './route/board-art.js';
import {edgeHeight,heightAt,routeDistance} from './terrain.js';
const world=p=>({x:(p.x-800)*.065,z:(p.y-655)*.065});
// Separate instanced branch: scene batching must never flatten version-specific
// markers into the permanent road. No tile artwork or number lane is replaced.
export function buildCheckpointShopSigns(scene,rules){
 const root=new THREE.Group();root.name='Checkpoint pocket shop signs';scene.add(root);
 const stats={count:0,sections:[],drawCalls:0,instances:0,placements:[]},batches=new Map(),signScale=1.28;let currentSection=null;
 const add=(shape,color,position,scale,q)=>{const key=shape+color;if(!batches.has(key))batches.set(key,{shape,color,matrices:[],sections:[]});const batch=batches.get(key);batch.matrices.push(new THREE.Matrix4().compose(position,q,new THREE.Vector3(...scale)));batch.sections.push(currentSection);stats.instances++;};
 for(const number of rules.shopMilestones??[]){
  if(!Number.isInteger(number)||number<1||number>ROUTE.cells.length)continue;
  currentSection=number;
  const i=number-1,cell=ROUTE.cells[i],fraction=.65,j=Math.round(fraction*(cell.strip.length-1)),frame=cell.strip[j],a=world(ROUTE.edges[i].center),b=world(ROUTE.edges[i+1].center),len=Math.hypot(b.x-a.x,b.z-a.z),tx=(b.x-a.x)/len,tz=(b.z-a.z)/len,c=world(frame.center),left=world(frame.left),right=world(frame.right),halfWidth=Math.hypot(left.x-right.x,left.z-right.z)/2;
  // Enlarge the roadside marker while keeping its complete awning off the road.
  const offset=halfWidth+.80*signScale,cx=c.x-tz*offset,cz=c.z+tx*offset,base=heightAt(cx,cz)??edgeHeight(i+fraction),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.atan2(tx,tz));
  const point=(x,y,z)=>new THREE.Vector3(cx+(tz*x+tx*z)*signScale,base+y*signScale,cz+(-tx*x+tz*z)*signScale),part=(color,x,y,z,sx,sy,sz)=>add('box',color,point(x,y,z),[sx,sy,sz].map(n=>n*signScale),q);
  const blue='#3f5ba8',paper='#f8f5ee';
  part(blue,0,.57,0,.10,1.14,.10);part(blue,0,.045,0,.38,.09,.30);
  part(blue,0,1.08,0,.98,.65,.14);part(paper,0,1.08,-.085,.88,.55,.045);
  // Striped awning and a gold coin read as a shop without microscopic type.
  part(blue,0,1.42,-.025,1.08,.12,.40);
  for(const x of [-.36,0,.36])part(paper,x,1.43,-.035,.16,.13,.40);
  add('ball','#e6ca80',point(0,1.08,-.15),[.31,.31,.065].map(n=>n*signScale),q);
  part(blue,0,1.08,-.19,.045,.19,.025);
  stats.count++;stats.sections.push(number);stats.placements.push({section:number,tileType:rules.tiles.find(t=>t.number===number)?.type??'trail',x:cx,y:base,z:cz,roadClearance:offset-halfWidth-.54*signScale,scale:signScale});
 }
 if(batches.size){const geometries={box:new THREE.BoxGeometry(1,1,1),ball:new THREE.SphereGeometry(.5,10,7)};
  for(const {shape,color,matrices,sections}of batches.values()){
   const mesh=new THREE.InstancedMesh(geometries[shape],new THREE.MeshStandardMaterial({color,roughness:1}),matrices.length);mesh.name=`Checkpoint sign ${shape} ${color}`;mesh.userData.checkpointSections=sections;matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);stats.drawCalls++;
  }
 }
 root.userData.stats=stats;return{root,stats,pick(ray){const hit=ray.intersectObjects(root.children,false)[0];return hit?.object.userData.checkpointSections?.[hit.instanceId]??null;}};
}
export function changedRuleSections(previous,next){const oldTiles=new Map(previous.tiles.map(t=>[t.number,t])),newTiles=new Map(next.tiles.map(t=>[t.number,t])),oldLinks=new Map(previous.links.map(l=>[l.from,l])),newLinks=new Map(next.links.map(l=>[l.from,l]));return Array.from({length:144},(_,i)=>i+1).filter(n=>JSON.stringify([oldTiles.get(n),oldLinks.get(n)])!==JSON.stringify([newTiles.get(n),newLinks.get(n)]));}
export function buildTrail(scene,rules){
 const root=new THREE.Group(),crossings=new THREE.Group();root.name='144 connected uphill sections';crossings.name='Proposed cross-field links';scene.add(root,crossings);
 const atlas=document.createElement('canvas');atlas.width=2048;atlas.height=1152;const ctx=atlas.getContext('2d');
 const tiles=new Map(rules.tiles.map(t=>[t.number,t]));
 const positions=[],uvs=[],indices=[],sides=[],seams=[];
 ROUTE.cells.forEach((cell,i)=>{
  const tile=tiles.get(i+1),type=tile?.type||'trail',cx=(i%16)*128,cy=Math.floor(i/16)*128;
  paintTile(ctx,{x:cx,y:cy,size:128,number:i+1,type,tile,link:rules.links.find(l=>l.from===i+1),drawNumber:false});
  const u=(i%16)/16,v=1-Math.floor(i/16)/9,base=positions.length/3,n=cell.strip.length-1;
  const strip=cell.strip.map((frame,j)=>[frame.left,frame.right].map((p,k)=>{const w=world(p),point=new THREE.Vector3(w.x,edgeHeight(i+j/n)+.12,w.z);positions.push(...point.toArray());uvs.push(u+(k===0?1/16:0),v-1/9+j/n/9);return point;}));
  const wall=(a,b)=>{const loA=a.clone(),loB=b.clone();loA.y-=.20;loB.y-=.20;sides.push(...a.toArray(),...b.toArray(),...loB.toArray(),...a.toArray(),...loB.toArray(),...loA.toArray());};
  for(let j=0;j<n;j++){const a=base+j*2;indices.push(a,a+2,a+3,a,a+3,a+1);wall(strip[j][0],strip[j+1][0]);wall(strip[j+1][1],strip[j][1]);}
  wall(...strip[0]);wall(strip[n][1],strip[n][0]);
  const a=strip[0][0].clone(),b=strip[0][1].clone();a.y+=.008;b.y+=.008;seams.push(...a.toArray(),...b.toArray());
 });
 // Chill-pop road bed: a sandy shoulder and a soft earth curb frame every
 // section, so the route reads at overview zoom against busy grass.
 {
  const bed=[],bedIdx=[],curb=[];
  ROUTE.cells.forEach((cell,i)=>{
   const n=cell.strip.length-1;
   const rows=cell.strip.map((frame,j)=>{const l=world(frame.left),r=world(frame.right),dx=l.x-r.x,dz=l.z-r.z,len=Math.hypot(dx,dz)||1,ox=dx/len*.48,oz=dz/len*.48,y=edgeHeight(i+j/n)+.035;
    return [new THREE.Vector3(l.x+ox,y,l.z+oz),new THREE.Vector3(l.x,y,l.z),new THREE.Vector3(r.x,y,r.z),new THREE.Vector3(r.x-ox,y,r.z-oz)];});
   for(let j=0;j<n;j++)for(const [p,q] of [[0,1],[2,3]]){
    const base=bed.length/3;for(const v of [rows[j][p],rows[j][q],rows[j+1][q],rows[j+1][p]])bed.push(...v.toArray());bedIdx.push(base,base+1,base+2,base,base+2,base+3);
    const o=p===0?0:3,a=rows[j][o],b=rows[j+1][o],la=a.clone(),lb=b.clone();la.y-=.22;lb.y-=.22;curb.push(...a.toArray(),...b.toArray(),...lb.toArray(),...a.toArray(),...lb.toArray(),...la.toArray());
   }
  });
  const bedGeo=new THREE.BufferGeometry();bedGeo.setAttribute('position',new THREE.Float32BufferAttribute(bed,3));bedGeo.setIndex(bedIdx);bedGeo.computeVertexNormals();
  const bedMesh=new THREE.Mesh(bedGeo,new THREE.MeshStandardMaterial({color:'#f0d59a',roughness:1,side:THREE.DoubleSide}));bedMesh.name='Sandy road bed';bedMesh.receiveShadow=true;root.add(bedMesh);
  const curbGeo=new THREE.BufferGeometry();curbGeo.setAttribute('position',new THREE.Float32BufferAttribute(curb,3));curbGeo.computeVertexNormals();
  const curbMesh=new THREE.Mesh(curbGeo,new THREE.MeshStandardMaterial({color:'#c08a55',roughness:1,side:THREE.DoubleSide}));curbMesh.name='Road bed curb';curbMesh.receiveShadow=true;root.add(curbMesh);
 }
 const texture=new THREE.CanvasTexture(atlas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
 const top=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:texture,roughness:1,side:THREE.DoubleSide}));top.receiveShadow=true;root.add(top);
 top.userData.sectionTriangles=ROUTE.cells[0].strip.length*2-2;
 const sideGeo=new THREE.BufferGeometry();sideGeo.setAttribute('position',new THREE.Float32BufferAttribute(sides,3));sideGeo.computeVertexNormals();const sideMesh=new THREE.Mesh(sideGeo,new THREE.MeshStandardMaterial({color:'#a8744a',roughness:1,side:THREE.DoubleSide}));sideMesh.receiveShadow=true;root.add(sideMesh);
 const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(seams,3));root.add(new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({color:'#9a7350',transparent:true,opacity:.55})));
 // Entrance pennants and the crown gate sit beside the first/last shared edge.
 for(const finish of [false,true]){
  const edge=ROUTE.edges[finish?144:0],center=world(edge.center),left=world(edge.left),right=world(edge.right),side=new THREE.Vector3(right.x-left.x,0,right.z-left.z).normalize();
  const timber=new THREE.MeshStandardMaterial({color:'#716f58',roughness:1}),gold=new THREE.MeshStandardMaterial({color:'#e1bf72',roughness:1});
  const y=edgeHeight(finish?144:0),h=finish?3.8:2.8;
  for(const sign of [-1,1]){const x=center.x+side.x*1.65*sign,z=center.z+side.z*1.65*sign,base=heightAt(x,z)??y;const post=new THREE.Mesh(new THREE.CylinderGeometry(.10,.14,y+h-base,8),timber);post.position.set(x,(base+y+h)/2,z);post.castShadow=true;root.add(post);const flag=new THREE.Mesh(new THREE.BoxGeometry(.9,.55,.035),finish?gold:new THREE.MeshStandardMaterial({color:'#3f5ba8',roughness:1}));flag.position.set(x+side.x*.4,y+h-.35,z+side.z*.4);flag.rotation.y=-Math.atan2(side.z,side.x);root.add(flag);}
  if(finish){const lintel=new THREE.Mesh(new THREE.BoxGeometry(3.6,.26,.33),timber);lintel.position.set(center.x,y+h,center.z);lintel.rotation.y=-Math.atan2(side.z,side.x);lintel.castShadow=true;root.add(lintel);for(let j=-1;j<=1;j++){const crown=new THREE.Mesh(new THREE.ConeGeometry(.23,j===0?.7:.5,4),gold);crown.position.set(center.x+side.x*j*.38,y+h+.35,center.z+side.z*j*.38);root.add(crown);}}
 }
 const {throne,setThroneMood,footprint:throneFootprint}=buildWishThroneV2(root);
 let field=buildFieldProps(root,{rules,ROUTE,edgeHeight,heightAt});
 let numberLabels=buildTileNumbers(root,{ROUTE,edgeHeight,rules});
 let checkpointShops=buildCheckpointShopSigns(root,rules);
 const bridgeStats=[],linkGroups=new Map();
 for(const [i,link] of rules.links.entries()){
  const group=linkGroups.get(link.from)||new THREE.Group();group.visible=false;if(!group.parent)crossings.add(group);linkGroups.set(link.from,group);
  const curve=linkCurve(link,i),a=edgeHeight(link.from-.5)+.22,b=edgeHeight(link.to-.5)+.22;
  if(link.type==='portal'){if(link.from<link.to){const points=curve.points.map((p,j)=>{const w=world(p),t=j/(curve.points.length-1);return new THREE.Vector3(w.x,Math.max(a+(b-a)*t,heightAt(w.x,w.z)??0)+.7+Math.sin(t*Math.PI)*2,w.z);});const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:PORTAL_COLORS[link.pairColor],dashSize:.45,gapSize:.3}));line.computeLineDistances();group.add(line);const reverse=rules.links.find(l=>l.from===link.to&&l.to===link.from);if(reverse)linkGroups.set(reverse.from,group);}continue;}
  let lift=1.4;const samples=curve.points.map(world);
  samples.forEach((p,j)=>{const t=j/(samples.length-1),s=Math.sin(Math.PI*t);if(s>.12)lift=Math.max(lift,((heightAt(p.x,p.z)??-3)+1.8-(a+(b-a)*t))/s);});
  const pts=samples.map((p,j)=>{const t=j/(samples.length-1);return new THREE.Vector3(p.x,a+(b-a)*t+Math.sin(Math.PI*t)*lift,p.z);});
  const mat=new THREE.MeshStandardMaterial({color:link.to>link.from?'#b49a72':'#b78f77',roughness:1});
  const rails=[[],[]];
  for(let j=0;j<pts.length-1;j++){
   const p=pts[j],q=pts[j+1],mid=p.clone().add(q).multiplyScalar(.5),dir=q.clone().sub(p),side=new THREE.Vector3(-dir.z,0,dir.x).normalize();
   const plank=new THREE.Mesh(new THREE.BoxGeometry(.85,.12,dir.length()+.02),mat);plank.position.copy(mid);plank.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir.normalize());plank.castShadow=true;group.add(plank);
   rails.forEach((r,k)=>r.push(p.clone().addScaledVector(side,k?.44:-.44).add(new THREE.Vector3(0,.65,0))));
   if(j%8===0){for(const k of [-1,1]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,.76,5),mat);post.position.copy(p).addScaledVector(side,k*.43);post.position.y+=.3;group.add(post);}if(j>0&&routeDistance(p.x,p.z)>2){const ground=heightAt(p.x,p.z);if(ground!==null){const column=new THREE.Mesh(new THREE.CylinderGeometry(.17,.25,p.y-ground,7),mat);column.position.set(p.x,(p.y+ground)/2,p.z);column.castShadow=true;group.add(column);}}}
  }
  rails.forEach(r=>group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r),48,.035,5,false),mat)));
  bridgeStats.push({from:link.from,to:link.to,arch:lift});
 }
 crossings.visible=true;
 function inspectSection(index){for(const group of new Set(linkGroups.values()))group.visible=group===linkGroups.get(index);}
 function disposeBranch(branch){const geometries=new Set(),materials=new Set();branch.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m);});branch.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});}
 function fieldRules(){return Object.fromEntries([67,68].map(n=>[n,{type:tiles.get(n)?.type||'trail',amount:tiles.get(n)?.amount||0}]));}
 function setRules(next){if(next===rules)return;const changed=changedRuleSections(rules,next);rules=next;tiles.clear();rules.tiles.forEach(t=>tiles.set(t.number,t));for(const n of changed){const i=n-1,x=(i%16)*128,y=Math.floor(i/16)*128,tile=tiles.get(n);ctx.clearRect(x,y,128,128);paintTile(ctx,{x,y,size:128,number:n,type:tile?.type||'trail',tile,link:rules.links.find(l=>l.from===n),drawNumber:false});}if(changed.length){texture.needsUpdate=true;api.stats.atlasRevision=(api.stats.atlasRevision||0)+1;}disposeBranch(field.root);disposeBranch(numberLabels);disposeBranch(checkpointShops.root);field=buildFieldProps(root,{rules,ROUTE,edgeHeight,heightAt});numberLabels=buildTileNumbers(root,{ROUTE,edgeHeight,rules});checkpointShops=buildCheckpointShopSigns(root,rules);api.stats.fieldProps=field.stats;api.stats.checkpointShops=checkpointShops.stats;api.stats.fieldRules=fieldRules();api.stats.lastPaintedCells=changed;}
 const api={root,top,get numberLabels(){return numberLabels;},checkpointAtRay:ray=>checkpointShops.pick(ray),setRules,inspectSection,crossings,throne,setThroneMood,stats:{throneFootprint,sections:144,portalPairs:3,fieldProps:field.stats,checkpointShops:checkpointShops.stats,fieldRules:fieldRules(),numberFont:'Martian Mono 600',bridges:bridgeStats}};return api;
}
