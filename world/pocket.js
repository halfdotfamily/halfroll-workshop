import * as THREE from '../assets/vendor/three/three.module.js';
import { GLTFLoader } from '../assets/nature-mossfall/vendor/GLTFLoader.js';
import { mergeGeometries } from '../assets/vendor/three/addons/utils/BufferGeometryUtils.js';

// Pocket Woods: a village built out of real roof shingles, timber and imported
// CC0 botanical meshes. All placement is deterministic and sampled on terrain.
export async function buildPocket(scene,{heightAt,routeDistance}) {
 const root=new THREE.Group();root.name='Pocket Woods / the lantern village';scene.add(root);
 const stats={cottages:0,trees:0,plants:0,props:0,instances:0,drawCalls:0,minRouteClearance:Infinity,grounded:[],communalScenes:0,animals:0,animalSpecies:[],refuges:0,source:'Original Blender cottage + Kenney Nature Kit CC0 + original faceted wildlife'};
 const loader=new GLTFLoader(),dummy=new THREE.Object3D(),batches=new Map(),occupied=[],time={value:0};
 let seed=6418;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),range=(a,b)=>a+(b-a)*rand();
 const colors={wood:'#80684d',plank:'#b89c71',stone:'#b7b9a2',stoneLight:'#bfc1ac',stoneDark:'#acb09b',iron:'#2f3a56',gold:'#e6c77f',mint:'#a9d7be',moss:'#78966e',cream:'#efe9dc',cobalt:'#3f5ba8',fox:'#be7047',deer:'#ab8861',rabbit:'#c4bba5'};
 const materials=Object.fromEntries(Object.entries(colors).map(([k,c])=>[k,new THREE.MeshStandardMaterial({color:c,roughness:.92,flatShading:true})]));
 const geo={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(1,1,1,12),ring:new THREE.TorusGeometry(1,.12,5,16),rock:new THREE.IcosahedronGeometry(1,0)};
 function add(key,geometry,material,x,y,z,sx=1,sy=1,sz=1,rotation=0,rx=0){
  if(!batches.has(key))batches.set(key,{geometry,material,matrices:[]});
  dummy.position.set(x,y,z);dummy.rotation.set(rx,rotation,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();batches.get(key).matrices.push(dummy.matrix.clone());stats.instances++;
 }
 function prop(shape,mat,x,y,z,sx,sy,sz,rotation=0,rx=0){add(shape+mat,geo[shape],materials[mat],x,y,z,sx,sy,sz,rotation,rx);stats.props++;}
 function region(x,z,r=0){return ((x>=19+r*.2&&x<=39-r&&z>=-11+r&&z<=27)||(x>=4+r&&x<=38-r&&z>=25+r&&z<=37-r))&&Math.hypot(x,z)>10+r;}
 function valid(x,z,r,{house=false}={}){
  if(!region(x,z,r)||routeDistance(x,z)<1.65+r)return false;
  if(!house&&occupied.some(p=>Math.hypot(p.x-x,p.z-z)<p.r+r+.3))return false;
  return Number.isFinite(heightAt(x,z));
 }
 function record(kind,x,y,z,r){stats.grounded.push({kind,x,y,z,radius:r,terrainY:heightAt(x,z)});stats.minRouteClearance=Math.min(stats.minRouteClearance,routeDistance(x,z)-r);}
 const cottage=await loader.loadAsync(new URL('../assets/pocket-world/pocket-cottage.glb',import.meta.url).href);
 cottage.scene.updateMatrixWorld(true);const houseParts=[];
 cottage.scene.traverse(n=>{if(n.isMesh){const geometry=n.geometry.clone().applyMatrix4(n.matrixWorld);houseParts.push({geometry,material:n.material});}});
 const houses=[{x:26,z:-2,s:1.04,a:.18,variant:0,stretch:1.08},{x:27,z:12,s:1,a:-.52,variant:1,stretch:.95},{x:24.5,z:23,s:.95,a:.63,variant:2,stretch:1},{x:10.5,z:34,s:1.06,a:-.22,variant:1,stretch:1.06},{x:34,z:33,s:.86,a:.89,variant:0,stretch:.93}];
 const houseMaterials=new Map(),houseBases=[];
 for(const h of houses){
  // Select the nearest gentler plot: short stepped foundations beat tall plinths.
  let chosen=null;
  for(let dx=-1.5;dx<=1.5;dx+=.5)for(let dz=-1.5;dz<=1.5;dz+=.5){
   const x=h.x+dx,z=h.z+dz;if(!valid(x,z,2.4*h.s,{house:true}))continue;
   const sample=[[-1.65,-1.7],[1.65,-1.7],[-1.65,1.7],[1.65,1.7]].map(([u,v])=>heightAt(x+(u*Math.cos(h.a)+v*Math.sin(h.a))*h.s,z+(-u*Math.sin(h.a)+v*Math.cos(h.a))*h.s));
   const cost=Math.max(...sample)-Math.min(...sample)+Math.hypot(dx,dz)*.17;
   if(!chosen||cost<chosen.cost)chosen={x,z,cost};
  }
  if(chosen){h.x=chosen.x;h.z=chosen.z;}
  const radius=2.4*h.s;if(!valid(h.x,h.z,radius,{house:true}))continue;
  const transform=(dx,dz)=>({x:h.x+(dx*Math.cos(h.a)+dz*Math.sin(h.a))*h.s,z:h.z+(-dx*Math.sin(h.a)+dz*Math.cos(h.a))*h.s});
  const ground=[[-1.65,-1.7],[1.65,-1.7],[-1.65,1.7],[1.65,1.7],[0,0],[0,-1.7],[0,1.7],[-1.65,0],[1.65,0]].map(([dx,dz])=>{const p=transform(dx,dz);return heightAt(p.x,p.z);});
  const base=Math.max(...ground)+.04,low=Math.min(...ground)-.12,depth=base-low;
  // Split masonry foundation into courses, burying its foot rather than levitating.
  const courses=Math.max(2,Math.ceil(depth/.26));
  prop('box','stoneDark',h.x,low+depth/2,h.z,3.29*h.s,depth,3.39*h.s,h.a);
  for(let k=0;k<courses;k++)for(let j=0;j<6;j++)for(const side of [-1,1]){
   const dx=-1.37+j*.55,front=transform(dx,side*1.7),edge=transform(side*1.65,dx);
   const mat=(j+k)%4===0?'stoneLight':'stone';
   prop('box',mat,front.x,low+depth*(k+.5)/courses,front.z,.54*h.s,depth/courses-.012,.08,h.a);
   prop('box',mat,edge.x,low+depth*(k+.5)/courses,edge.z,.08,depth/courses-.012,.54*h.s,h.a);
  }
  for(let i=0;i<houseParts.length;i++){
   const p=houseParts[i],name=p.material.name||'',variant=/roof|plaster/i.test(name)?h.variant:0,key='cottage'+i+'v'+variant;
   if(!houseMaterials.has(key)){
    const m=p.material.clone();if(variant===1&&/roof/i.test(name))m.color.set(/Light/.test(name)?'#8caa87':'#607d70');
    if(variant===2&&/roof/i.test(name))m.color.set(/Light/.test(name)?'#c39777':'#aa795f');
    if(variant===2&&/plaster/i.test(name))m.color.set('#d1dfc1');houseMaterials.set(key,m);
   }
   add(key,p.geometry,houseMaterials.get(key),h.x,base,h.z,h.s,h.s*h.stretch,h.s,h.a);
  }
  houseBases.push({...h,base,low,transform});
  occupied.push({x:h.x,z:h.z,r:radius+.3});record('cottage',h.x,base,h.z,radius);stats.cottages++;
  // A usable stepped stoop descends from the raised cottage to its garden.
  const end=transform(0,3.7),endY=heightAt(end.x,end.z);
  for(let k=0;k<8;k++){
   const t=k/7,p=transform(0,1.95+t*1.75);if(!valid(p.x,p.z,.58,{house:true}))continue;
   const floor=heightAt(p.x,p.z),top=Math.max(floor+.055,base*(1-t)+endY*t+.08),depth=Math.max(.12,top-floor+.09);
   prop('box','stoneLight',p.x,top-depth/2,p.z,1.02*h.s,depth,.31*h.s,h.a);record('porch stair',p.x,floor,p.z,.58);
  }
  // Small stone path leading from each front porch, following the slope.
  for(let k=0;k<5;k++){
   const d=2.4+k*.53,x=h.x+Math.sin(h.a)*d,z=h.z+Math.cos(h.a)*d;
   if(!valid(x,z,.25))continue;const y=heightAt(x,z);
   prop('box','stone',x,y+.035,z,.62,.11,.39,h.a+.08*Math.sin(k));record('garden step',x,y,z,.25);
  }
 }
 // Boulders, rooted vines and low terraces tie masonry into the hillside.
 for(const h of houseBases)for(const [dx,dz] of [[-1.9,-.9],[1.95,-.8],[-1.9,.95],[1.95,1.2],[-.8,-1.95],[.8,-1.95]]){
  const p=h.transform(dx,dz),r=.57;if(!valid(p.x,p.z,r,{house:true}))continue;const y=heightAt(p.x,p.z);
  prop('rock','stoneDark',p.x,y+.23,p.z,.56,.46,.47,range(0,6));record('terrace boulder',p.x,y,p.z,r);
  if(h.base-y>.5){
   const height=Math.min(h.base-y+.35,2.4),v=h.transform(dx*.86,dz*.86);
   prop('box','moss',v.x,y+height/2,v.z,.035,height,.035);
   for(let k=0;k<Math.ceil(height/.17);k++)prop('rock','moss',v.x+Math.sin(k*1.9)*.11,y+.14+k*.17,v.z+Math.cos(k*1.9)*.07,.12,.11,.045,h.a);
  }
 }
 // Village details are shared instanced geometry, each on a sampled ground point.
 function barrel(x,z,r=.3){if(!valid(x,z,r))return;const y=heightAt(x,z);prop('cyl','plank',x,y+.35,z,r,.7,r);for(const dy of [.12,.58])prop('cyl','iron',x,y+dy,z,r+.015,.045,r+.015);prop('cyl','wood',x,y+.71,z,r*.86,.035,r*.86);record('barrel',x,y,z,r);}
 function lantern(x,z){if(!valid(x,z,.53))return;const y=heightAt(x,z);prop('box','wood',x,y+.9,z,.1,1.8,.1);prop('box','wood',x+.2,y+1.74,z,.5,.08,.08);prop('box','gold',x+.35,y+1.5,z,.19,.28,.19);for(const dy of [1.33,1.66])prop('box','iron',x+.35,y+dy,z,.27,.055,.27);record('lantern',x,y,z,.53);}
 function bee(x,z){if(!valid(x,z,.45))return;const y=heightAt(x,z);for(let k=0;k<5;k++)prop('cyl','gold',x,y+.14+k*.11,z,.4-k*.045,.13,.4-k*.045);prop('box','wood',x,y+.05,z,.9,.1,.8);prop('cyl','iron',x,y+.23,z+.32,.08,.04,.08,0,Math.PI/2);record('beehive',x,y,z,.45);}
 for(const [x,z] of [[24,-5.7],[29,15.5],[22,26.5],[14.4,34],[30.2,33.6]])barrel(x,z);
 for(const [x,z] of [[25,-6.5],[29,8.2],[22.2,19],[20.5,25],[6.3,34],[29,34]])lantern(x,z);
 for(const [x,z] of [[25,6],[25.8,6.2],[18.2,34],[19.3,34]])bee(x,z);
 // A shared kitchen garden and handcart give the houses a small village story.
 for(const [cx,cz] of [[26,18.8],[17,33.7]]){
  if(!valid(cx,cz,1.05))continue;
  for(let row=0;row<3;row++)for(let col=0;col<5;col++){
   const x=cx+(col-2)*.33,z=cz+(row-1)*.45;if(!valid(x,z,.16))continue;const y=heightAt(x,z);
   prop('box','wood',x,y+.015,z,.3,.055,.36);
   for(let leaf=0;leaf<3;leaf++)prop('rock',leaf===0?'mint':'moss',x+Math.sin(leaf*2.1)*.055,y+.14,z+Math.cos(leaf*2.1)*.055,.13,.12,.16,leaf*2.1);
   record('vegetable patch',x,y,z,.16);
  }stats.communalScenes++;
 }
 function cart(cx,cz){
  if(!valid(cx,cz,1.6))return;const y=heightAt(cx,cz);
  prop('box','plank',cx,y+.49,cz,1.2,.12,.72);
  for(const side of [-1,1]){
   prop('box','wood',cx,y+.7,cz+side*.39,1.28,.18,.06);
   prop('cyl','iron',cx,y+.31,cz+side*.48,.29,.08,.29,0,Math.PI/2);
   prop('cyl','plank',cx,y+.31,cz+side*.53,.21,.025,.21,0,Math.PI/2);
   prop('box','wood',cx+1,y+.42,cz+side*.24,1.1,.07,.07);
  }
  for(let i=0;i<4;i++)prop('cyl','wood',cx-.35+i*.22,y+.64,cz,.115,.6,.115,0,Math.PI/2);
  record('village handcart',cx,y,cz,1.6);stats.communalScenes++;
 }
 cart(28,18);cart(27.5,25.5);
 for(const [cx,cz] of [[21.5,23],[29.5,14],[14.5,33.5]]){
  if(!valid(cx,cz,.65))continue;const y=heightAt(cx,cz);
  for(let row=0;row<3;row++)for(let col=0;col<3-row;col++){
   const x=cx+(col-(2-row)/2)*.24;prop('cyl','wood',x,y+.12+row*.2,cz,.13,.85,.13,0,Math.PI/2);
   prop('cyl','plank',x,y+.12+row*.2,cz+.43,.105,.02,.105,0,Math.PI/2);
  }record('stacked firewood',cx,y,cz,.65);
 }
 // Picket fences have individually grounded posts and short rails.
 for(const [cx,cz,length,angle] of [[25,18.3,4.2,.2],[21,24.8,3.8,-.2],[12,31.8,3.8,0],[32,35,4,.2]]){
  let prev=null;
  for(let i=0;i<=Math.floor(length/.5);i++){
   const t=i*.5-length/2,x=cx+Math.cos(angle)*t,z=cz+Math.sin(angle)*t;
   if(!valid(x,z,.12)){prev=null;continue;}const y=heightAt(x,z);
   prop('box','plank',x,y+.4,z,.1,.8,.11,angle);record('fence',x,y,z,.12);
   if(prev){const dx=x-prev.x,dz=z-prev.z,dy=y-prev.y;for(const h of [.26,.57]){
    const v=new THREE.Vector3(dx,dy,dz),mid=new THREE.Vector3((x+prev.x)/2,(y+prev.y)/2+h,(z+prev.z)/2);
    dummy.position.copy(mid);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),v.clone().normalize());dummy.scale.set(v.length()+.08,.065,.07);dummy.updateMatrix();
    const key='fenceRails';if(!batches.has(key))batches.set(key,{geometry:geo.box,material:materials.wood,matrices:[]});batches.get(key).matrices.push(dummy.matrix.clone());stats.instances++;}}
   prev={x,y,z};
  }
 }
 // Quiet woodland encounters: sculpted angular silhouettes, hooves, muzzles,
 // antlers and pointed ears. Merge each material so wildlife stays inexpensive.
 const wildlife=[];
 function nearestPlot(cx,cz,r,maxSlope=.34){
  let best=null;
  for(let dx=-2;dx<=2;dx+=.4)for(let dz=-2;dz<=2;dz+=.4){
   const x=cx+dx,z=cz+dz;if(!valid(x,z,r))continue;
   const y=heightAt(x,z),spread=Math.max(...[[r*.65,0],[-r*.65,0],[0,r*.65],[0,-r*.65]].map(([u,v])=>Math.abs(heightAt(x+u,z+v)-y)));
   if(spread>maxSlope)continue;const cost=spread*5+Math.hypot(dx,dz)*.2;
   if(!best||cost<best.cost)best={x,z,y,cost};
  }return best;
 }
 function animal(kind,cx,cz,scale,angle){
  const r=kind==='deer'?1.2*scale:kind==='fox'?1.6*scale:.7*scale,p=nearestPlot(cx,cz,r);if(!p)return;
  const group=new THREE.Group(),head=new THREE.Group(),pieces=new Map();
  group.name='Pocket wildlife / '+kind;group.position.set(p.x,p.y,p.z);group.rotation.y=angle;group.scale.setScalar(scale);root.add(group);group.add(head);
  function part(parent,shape,mat,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){
   const source=shape==='cone'?new THREE.ConeGeometry(1,1,4):shape==='facet'?geo.rock:geo[shape];
   const g=source.index?source.toNonIndexed():source.clone();
   dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();g.applyMatrix4(dummy.matrix);
   const key=(parent===head?'head':'body')+mat;if(!pieces.has(key))pieces.set(key,{parent,mat,gs:[]});pieces.get(key).gs.push(g);
  }
  if(kind==='deer'){
   part(group,'facet','deer',0,1.02,0,.44,.49,.82);
   for(const x of [-.26,.26])for(const z of [-.48,.48]){
    const footY=(heightAt(p.x+(x*Math.cos(angle)+z*Math.sin(angle))*scale,p.z+(-x*Math.sin(angle)+z*Math.cos(angle))*scale)-p.y)/scale;
    part(group,'cyl','deer',x,(.82+footY)/2,z,.06,.82-footY,.06);part(group,'box','iron',x,footY+.065,z+.025,.105,.13,.17);
   }
   part(group,'facet','deer',0,1.47,.52,.23,.58,.27, .23);
   head.position.set(0,1.89,.65);part(head,'facet','deer',0,.03,.08,.24,.27,.36);part(head,'facet','cream',0,-.09,.32,.16,.14,.21);
   part(head,'box','iron',0,-.07,.51,.17,.1,.08);
   for(const s of [-1,1]){
    part(head,'facet','deer',s*.29,.2,.02,.23,.1,.14,0,0,s*.4);part(head,'box','iron',s*.215,.07,.24,.037,.055,.045);
    part(head,'cyl','wood',s*.2,.53,-.04,.028,.58,.028,0,0,-s*.22);
    part(head,'cyl','plank',s*.27,.63,.05,.023,.32,.023,.65,0,-s*.75);
    part(head,'cyl','plank',s*.32,.78,-.04,.022,.26,.022,0,0,s*.6);
   }
   part(group,'facet','cream',0,1.13,-.76,.13,.21,.17,-.5);
  }else if(kind==='fox'){
   part(group,'facet','fox',0,.48,0,.28,.29,.62);
   for(const x of [-.18,.18])for(const z of [-.35,.35]){
    const footY=(heightAt(p.x+(x*Math.cos(angle)+z*Math.sin(angle))*scale,p.z+(-x*Math.sin(angle)+z*Math.cos(angle))*scale)-p.y)/scale;
    part(group,'box','fox',x,(.43+footY)/2,z,.09,.43-footY,.105);part(group,'box','iron',x,footY+.065,z+.035,.1,.13,.15);
   }
   part(group,'facet','fox',.16,.44,-.89,.27,.26,.58,0,-.35,-.15);part(group,'facet','cream',.31,.43,-1.3,.19,.19,.25,0,-.35);
   head.position.set(0,.67,.5);part(head,'facet','fox',0,0,0,.27,.27,.31);part(head,'cone','cream',0,-.09,.29,.18,.43,.16,Math.PI/2);part(head,'box','iron',0,-.09,.49,.09,.07,.07);
   for(const s of [-1,1]){part(head,'cone','fox',s*.17,.26,-.05,.115,.31,.13,0,0,-s*.15);part(head,'cone','iron',s*.17,.27,.035,.059,.16,.025);part(head,'box','iron',s*.165,.05,.21,.045,.055,.03);}
  }else{
   part(group,'facet','rabbit',0,.3,-.04,.28,.32,.4);part(group,'facet','cream',0,.31,-.39,.14,.14,.14);
   for(const s of [-1,1]){part(group,'facet','rabbit',s*.19,.1,.2,.12,.12,.24);part(group,'facet','rabbit',s*.2,.18,-.16,.19,.2,.2);}
   head.position.set(0,.52,.21);part(head,'facet','rabbit',0,0,0,.24,.22,.25);part(head,'facet','cream',0,-.09,.18,.14,.12,.13);part(head,'box','fox',0,-.03,.26,.06,.045,.03);
   for(const s of [-1,1]){part(head,'facet','rabbit',s*.11,.38,-.04,.08,.38,.09,.12,0,-s*.16);part(head,'facet','cream',s*.11,.39,.025,.035,.26,.025,.12,0,-s*.16);part(head,'box','iron',s*.18,.06,.12,.037,.055,.04);}
  }
  for(const b of pieces.values()){const mesh=new THREE.Mesh(mergeGeometries(b.gs),materials[b.mat]);mesh.castShadow=true;mesh.receiveShadow=true;b.parent.add(mesh);b.gs.forEach(g=>g.dispose());stats.drawCalls++;}
  wildlife.push({head,phase:range(0,6.28),kind});occupied.push({x:p.x,z:p.z,r:r+.25});record(kind,p.x,p.y,p.z,r);stats.animals++;if(!stats.animalSpecies.includes(kind))stats.animalSpecies.push(kind);
 }
 animal('deer',36,12,.95,-.8);animal('deer',34,20,.75,-1.9);
 animal('fox',25,7,.9,2.1);animal('fox',19,33,.85,-.7);
 animal('rabbit',28,16,1.1,1.3);animal('rabbit',14,34,.95,-1.5);
 // A private woodland refuge: weathered timber, copper Z seal and a quiet bench.
 // A single environmental Zcash nod, never a gameplay or financial benefit.
 const refuge=[[35,2],[35,8],[30,28],[21,33]].map(([x,z])=>nearestPlot(x,z,1.2,.7)).find(Boolean);
 if(refuge){
  const {x,z,y}=refuge;for(const s of [-1,1]){
   const floor=heightAt(x+s*.72,z);prop('box','wood',x+s*.72,(floor+y+1.8)/2,z,.15,y+1.8-floor,.15);
  }
  for(let i=0;i<5;i++)prop('box','plank',x,y+1.05+i*.18,z,1.6,.17,.12);
  prop('box','wood',x,y+1.9,z,1.88,.16,.22);
  prop('cyl','gold',x,y+1.46,z+.105,.29,.055,.29,0,Math.PI/2);
  for(const dy of [-.12,.12])prop('box','iron',x,y+1.46+dy,z+.145,.25,.033,.02);
  // Diagonal is a physically inset dark copper stroke, with two currency ticks.
  const stroke=new THREE.Mesh(geo.box,materials.iron);stroke.position.set(x,y+1.46,z+.145);stroke.scale.set(.033,.32,.02);stroke.rotation.z=-.69;root.add(stroke);stats.drawCalls++;
  for(const dy of [-.19,.19])prop('box','iron',x,y+1.46+dy,z+.145,.033,.075,.02);
  for(const dx of [-.45,.45]){const by=heightAt(x+dx,z+.57);prop('box','wood',x+dx,by+.22,z+.57,.12,.44,.14);}
  prop('box','plank',x,y+.47,z+.57,1.3,.12,.4);
  occupied.push({x,z,r:1.25});record('Zcash woodland refuge',x,y,z,1.2);stats.refuges++;
 }
 const floraNames=['tree_detailed','tree_plateau','tree_oak','plant_bushDetailed','grass_large','mushroom_tanGroup','flower_yellowC','flower_purpleA','rock_smallC'];
 const assets=[];
 for(const name of floraNames){
  const gltf=await loader.loadAsync(new URL('../assets/nature-mossfall/'+name+'.glb',import.meta.url).href);gltf.scene.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const norm=new THREE.Matrix4().makeScale(1/size.y,1/size.y,1/size.y).multiply(new THREE.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z)),parts=[];
  gltf.scene.traverse(n=>{if(!n.isMesh)return;const original=Array.isArray(n.material)?n.material:[n.material];
   const mats=original.map(m=>{const leaf=/leaf|grass/i.test(m.name),wood=/wood|bark/i.test(m.name);let c=leaf?'#64896d':wood?'#77614b':'#b7baa4';if(/yellow/i.test(m.name))c='#e5c77e';if(/purple/i.test(m.name))c='#b7a8ca';if(/tan|white|beige/i.test(m.name))c='#efe9dc';const mat=new THREE.MeshStandardMaterial({color:c,roughness:1,flatShading:true});return mat;});
   parts.push({geometry:n.geometry.clone().applyMatrix4(norm.clone().multiply(n.matrixWorld)),material:mats.length===1?mats[0]:mats});
  });assets.push({name,radius:Math.max(size.x,size.z)/size.y/2,parts});
 }
 const trees=[];
 function flora(asset,x,z,h,nearHouse=false){
  const r=asset.radius*h;if(!valid(x,z,r,{house:nearHouse}))return false;
  const isTree=asset.name.startsWith('tree');if(isTree&&trees.some(p=>Math.hypot(p.x-x,p.z-z)<(p.r+r)*.8))return false;
  const y=heightAt(x,z),support=Math.min(r*.3,.5);
  if([[support,0],[-support,0],[0,support],[0,-support]].some(([dx,dz])=>Math.abs(heightAt(x+dx,z+dz)-y)>.8))return false;
  const a=rand()*Math.PI*2;
  asset.parts.forEach((p,i)=>add(asset.name+i,p.geometry,p.material,x,y-.025,z,h,h,h,a));
  record(asset.name,x,y,z,r);if(isTree){trees.push({x,z,r});stats.trees++;}else stats.plants++;return true;
 }
 // Purposeful garden drifts are big enough to read in the overview.
 for(const h of houseBases)for(let i=0;i<16;i++){
  const a=range(0,Math.PI*2),d=range(2.1,3.3),x=h.x+Math.cos(a)*d,z=h.z+Math.sin(a)*d;
  // Keep the front staircase open; plant against side and rear masonry.
  const forward=Math.sin(h.a)*(x-h.x)+Math.cos(h.a)*(z-h.z);if(forward>1.4)continue;
  flora(assets[3],x,z,range(.65,1.15),true);
  flora(assets[i%2?6:7],x+.28,z-.12,range(.35,.5),true);
 }
 for(const [cx,cz] of [[25,17],[29,7],[21,27],[17,34],[36,24]])for(let i=0;i<14;i++){
  const a=range(0,6.28),r=range(.3,2.2);flora(assets[i%3===0?3:i%2?6:7],cx+Math.cos(a)*r,cz+Math.sin(a)*r,i%3===0?range(.7,1.1):range(.3,.5));
 }
 // Authored groves frame gaps between the route's turns, then a seeded scatter
 // fills their edges with small plants rather than making an opaque canopy.
 const groves=[[37,-6],[37,6],[37,19],[36,28],[30,1],[30,21],[22,28],[19,34],[6,34],[23,-8],[24,3],[34,10],[29,30],[24,35],[11,35]];
 for(let i=0;i<5200&&stats.trees<72;i++){
  const c=groves[Math.floor(rand()*groves.length)],a=range(0,Math.PI*2),r=range(0,3.3);
  flora(assets[Math.floor(rand()*3)],c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r,range(2.6,4.8));
 }
 // Close understory belongs to groves; leave house fronts and encounters open.
 for(const tree of trees)for(let i=0;i<5;i++){
  const a=range(0,6.28),d=range(.25,tree.r+1);flora(assets[i%3===0?5:3],tree.x+Math.cos(a)*d,tree.z+Math.sin(a)*d,i%3===0?range(.22,.4):range(.5,.9));
 }
 for(let i=0;i<3600&&stats.plants<560;i++){
  const x=range(5,39),z=range(-10,37),asset=assets[3+Math.floor(rand()*6)];
  flora(asset,x,z,asset.name.includes('bush')?range(.5,1):asset.name.includes('rock')?range(.2,.55):range(.15,.4));
 }
 for(const [name,b] of batches){if(!b.matrices.length)continue;const mesh=new THREE.InstancedMesh(b.geometry,b.material,b.matrices.length);mesh.name=name;b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);stats.drawCalls+=Array.isArray(b.material)?b.material.length:1;}
 stats.importedModels=floraNames.length+1;stats.cottageSource='assets/pocket-world/pocket-cottage.blend';
 return {root,stats,update(t){time.value=t;for(const a of wildlife){a.head.rotation.y=t?Math.sin(t*.32+a.phase)*.16:0;a.head.rotation.x=t?Math.sin(t*.43+a.phase)*.055:0;}}};
}


