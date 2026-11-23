import * as THREE from 'three';

// Authored coastal vignettes. All upper planting follows the final triangulated
// terraces; the small sea cave is a volumetric tunnel embedded in the bluff.
export function buildWoodsCoast(scene,{heightAt,routeDistance}){
 const root=new THREE.Group();root.name='Pocket Woods / rooted coves';
 const stats={caves:0,fallenTrees:0,rootSystems:0,southernClusters:0,shorePebbles:0,ferns:0,grasses:0,shrubs:0,drawCalls:0,instances:0,minRouteClearance:Infinity,grounded:[]};
 const palette={stone:'#969e87',pale:'#b9b9a1',wet:'#6c817b',dark:'#657267',wood:'#82725b',bark:'#655d4e',end:'#b5a583',moss:'#6f9275',leaf:'#779d7c',leafLight:'#a0b991',grass:'#a9bb86',reed:'#d4c395',inner:'#3c4948'};
 const material=new THREE.MeshStandardMaterial({color:'white',roughness:1,flatShading:true});
 const geometry={rock:new THREE.IcosahedronGeometry(1,1),rough:new THREE.IcosahedronGeometry(1,0),branch:new THREE.CylinderGeometry(.72,1,1,7),canopy:new THREE.CylinderGeometry(.73,1,1,7),disc:new THREE.CylinderGeometry(1,1,1,12)};
 const leaf=new THREE.BufferGeometry();leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.34,.32,.035,0,.88,0,0,0,0,0,.88,0,.34,.32,.035],3));leaf.computeVertexNormals();geometry.leaf=leaf;
 const batches=new Map(),dummy=new THREE.Object3D();let seed=8734;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),range=(a,b)=>a+(b-a)*rand();
 function stamp(shape,color,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0){
  if(!batches.has(shape))batches.set(shape,{matrices:[],colors:[]});
  dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
  const batch=batches.get(shape);batch.matrices.push(dummy.matrix.clone());batch.colors.push(new THREE.Color(palette[color]||color));stats.instances++;
 }
 function limb(a,b,r,color='bark'){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A);if(delta.length()<.01)return;
  if(!batches.has('branch'))batches.set('branch',{matrices:[],colors:[]});
  dummy.position.copy(A).add(B).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());dummy.scale.set(r,delta.length(),r);dummy.updateMatrix();
  batches.get('branch').matrices.push(dummy.matrix.clone());batches.get('branch').colors.push(new THREE.Color(palette[color]));stats.instances++;
 }
 // A geometric query, not a guessed old coastline: returns the outermost land.
 function shore(z){let x=48;for(;x>32;x-=.12)if(heightAt(x,z)!==null)return x;return null;}
 function ground(x,z,r=.15){const y=heightAt(x,z),clearance=routeDistance(x,z)-r;if(y===null||y<-3.45||clearance<2.05)return null;stats.minRouteClearance=Math.min(stats.minRouteClearance,clearance);return y;}
 function fern(x,z,scale=1){const y=ground(x,z,.45*scale);if(y===null)return;
  for(let j=0;j<7;j++){const angle=j*Math.PI*2/7+rand()*.3;stamp('leaf',j%2?'leaf':'leafLight',x,y+.025,z,.42*scale,.66*scale,.7*scale,angle,.62);}
  stats.ferns++;stats.grounded.push({kind:'fern',x,z,y});
 }
 function grass(x,z,scale=1){const y=ground(x,z,.18*scale);if(y===null)return;
  for(let j=0;j<4;j++)stamp('leaf',j%3?'grass':'reed',x+range(-.05,.05),y,z+range(-.05,.05),.08*scale,range(.32,.64)*scale,.4,j*1.8,.2);
  stats.grasses++;
 }
 function bush(x,z,scale=1){const y=ground(x,z,.6*scale);if(y===null)return;
  for(let j=0;j<5;j++){const a=j*2.4,r=j?.35*scale:0;stamp('rough',j%2?'leaf':'leafLight',x+Math.cos(a)*r,y+.26*scale,z+Math.sin(a)*r,.4*scale,.37*scale,.35*scale,a);}
  stats.shrubs++;
 }
 function shingle(z,length,width){const edge=shore(z);if(edge===null)return;
  // A submerged, closed sand bank supports every pebble. The upper crown
  // breaks the waterline only near the cliff, merging into the low terraces.
  const cx=edge+.45,segments=18,verts=[],index=[];
  verts.push(cx,-3.46,z);
  for(let j=0;j<segments;j++){const a=j/segments*Math.PI*2,r=.88+rand()*.18;verts.push(cx+Math.cos(a)*width*r,-4.05,z+Math.sin(a)*length*r);}
  const bottom=verts.length/3;verts.push(cx,-4.65,z);
  for(let j=0;j<segments;j++){index.push(0,1+(j+1)%segments,1+j);index.push(bottom,1+j,1+(j+1)%segments);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(index);g.computeVertexNormals();
  const bank=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:palette.wet,roughness:1,flatShading:true}));bank.name='Submerged shingle bank';bank.receiveShadow=true;root.add(bank);
  for(let j=0;j<75;j++){const a=range(0,Math.PI*2),r=Math.sqrt(rand())*.74,x=cx+Math.cos(a)*width*r,zz=z+Math.sin(a)*length*r,s=range(.07,.24),floor=heightAt(x,zz);if(routeDistance(x,zz)<2.4)continue;
   const support=floor===null?-3.46-r*.59:Math.max(-3.46-r*.59,floor);
   stamp('rock',['pale','stone','wet'][j%3],x,support+.055,zz,s*1.25,s*.45,s*.85,rand()*6);stats.shorePebbles++;
  }
 }
 shingle(3.4,4.5,1.8);shingle(24.8,4.1,2.2);

 // Real three-dimensional cave: separate front/rear arch rings, an inner
 // vaulted ceiling, solid flank piers and a deep recessed rear wall.
 const caveZ=18,edge=shore(caveZ);
 if(edge!==null){
  // Coastal strata flare outward below the sampled land edge. Put the entire
  // hollow beyond that solid apron, then embed its back in a broad rock hood.
  const back=edge+1.95,front=edge+4.52,floor=-3.25,spring=floor+.85,innerR=1.12,outerR=1.67,n=11;
  const coords=[],indices=[],colors=[];
  function quad(a,b,c,d,color){const base=coords.length/3;coords.push(...a,...b,...c,...d);indices.push(base,base+1,base+2,base,base+2,base+3);const col=new THREE.Color(palette[color]);for(let j=0;j<4;j++)colors.push(col.r,col.g,col.b);}
  for(let j=0;j<n;j++){
   const a=j/n*Math.PI,b=(j+1)/n*Math.PI;
   const point=(x,r,t)=>{const rr=r===outerR?r+.09*Math.sin(t*7):r;return[x,spring+Math.sin(t)*rr,caveZ+Math.cos(t)*rr];};
   quad(point(front,innerR,a),point(front,outerR,a),point(front,outerR,b),point(front,innerR,b),j%3?'stone':'pale');
   quad(point(front,innerR,b),point(back,innerR,b),point(back,innerR,a),point(front,innerR,a),'inner');
   quad(point(front,outerR,a),point(back,outerR,a),point(back,outerR,b),point(front,outerR,b),'stone');
  }
  for(const sign of [-1,1]){
   const zi=caveZ+innerR*sign,zo=caveZ+outerR*sign;
   quad([front,floor,zi],[back,floor,zi],[back,spring,zi],[front,spring,zi],'inner');
   quad([front,floor,zo],[front,floor,zi],[front,spring,zi],[front,spring,zo],'stone');
   quad([front,spring,zo],[back,spring,zo],[back,floor,zo],[front,floor,zo],'stone');
  }
  quad([front,floor,caveZ-innerR],[front,floor,caveZ+innerR],[back,floor,caveZ+innerR],[back,floor,caveZ-innerR],'wet');
  // The dark end lies well behind the mouth. It is enclosed by vaulted volume.
  for(let j=0;j<n;j++){const a=j/n*Math.PI,b=(j+1)/n*Math.PI;quad([back,floor,caveZ+Math.cos(a)*innerR],[back,spring+Math.sin(a)*innerR,caveZ+Math.cos(a)*innerR],[back,spring+Math.sin(b)*innerR,caveZ+Math.cos(b)*innerR],[back,floor,caveZ+Math.cos(b)*innerR],'inner');}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  const tunnel=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:THREE.DoubleSide}));tunnel.name='Recessed vaulted sea cave';tunnel.castShadow=tunnel.receiveShadow=true;root.add(tunnel);
  // The floor is carried by a tide-worn sill continuing below the water.
  stamp('rock','wet',edge+2.9,-3.87,caveZ,2.25,.85,1.55,.1);
  // Rounded buttresses conceal the junction with the cliff and provide feet.
  for(const sign of [-1,1])for(let j=0;j<5;j++)stamp('rough',j%2?'stone':'wet',edge+.45+j*.8,-2.9+j*.08,caveZ+sign*(1.53+j*.04),1.1,1.2,.8,sign*.25+j*.7);
  for(let j=0;j<11;j++){const x=edge+range(-.25,4.1),zz=caveZ+range(-1.45,1.45),roof=Math.max(-.15,heightAt(x,zz)??-.15);stamp('rough',j%3?'stone':'moss',x,roof-.23,zz,.95,.63,.8,rand()*6);}
  stats.caves=1;stats.cave={x:edge,z:caveZ,front,back,floor,innerRadius:innerR,crown:spring+innerR};
 }

 // Root fans emerge from small living stumps, then hug the stepped soil.
 for(const site of [{z:-1.4,inset:1.6},{z:8.8,inset:1.1},{z:13.6,inset:.9},{z:22.8,inset:1.4}]){
  const e=shore(site.z);if(e===null)continue;const x=e-site.inset,z=site.z,y=ground(x,z,.7);if(y===null)continue;
  limb([x,y-.2,z],[x-.23,y+2.6,z+.1],.22);limb([x-.13,y+1.3,z],[x-.85,y+2.8,z-.3],.13);limb([x-.15,y+1.8,z],[x+.5,y+3.1,z+.4],.11);
  for(const [dx,dy,dz,s]of [[-.75,2.65,-.25,.9],[.45,3.05,.35,.8],[-.2,3.55,.1,1],[-.7,3.35,.45,.65]]){
   stamp('canopy','leaf',x+dx,y+dy,z+dz,s,.72,s*.88,.4+dx);
   stamp('canopy','leafLight',x+dx-.08,y+dy+.35,z+dz-.05,s*.78,.22,s*.7,.4+dx);
  }
  for(let j=0;j<4;j++){const a=(j-1.5)*.75,reach=.65+rand()*.4;let last=[x,y+.055,z];
   for(let k=1;k<=7;k++){const t=k/7,xx=x+Math.cos(a)*reach*t,zz=z+Math.sin(a)*reach*t+Math.sin(t*Math.PI)*.12,gy=heightAt(xx,zz);if(gy===null||Math.abs(gy-last[1])>.24)break;const next=[xx,gy+.035,zz];limb(last,next,.075*(1-t*.78));last=next;}
  }
  for(const [dx,dz,s]of [[-.6,.65,1.4],[.4,-.85,1.1],[-1.05,-.4,1.25],[-1.35,.95,.85]])bush(x+dx,z+dz,s);
  fern(x-.9,z-.4,1.2);fern(x+.45,z+.65,1.1);stats.rootSystems++;
 }

 // A stranded, split branch is nestled into the southern cove, with pale cut
 // wood, jagged broken twigs and a root tangle rather than a straight capsule.
 {
  const z=25,e=shore(z);if(e!==null){
   const A=[e-.35,0,z-1.7],B=[e+.08,0,z+1.9];
   A[1]=Math.max(-3.23,heightAt(A[0],A[2])??-3.4)+.23;B[1]=Math.max(-3.23,heightAt(B[0],B[2])??-3.4)+.23;
   limb(A,B,.32,'wood');limb([A[0]-.12,A[1]+.2,A[2]],[B[0]-.1,B[1]+.2,B[2]],.07,'bark');
   for(let j=0;j<5;j++){const t=.15+j*.14,P=A.map((v,k)=>v+(B[k]-v)*t),sign=j%2?1:-1;limb(P,[P[0]+sign*(.5+rand()*.35),P[1]+.22,P[2]-.37],.09);}
   for(let j=0;j<6;j++){const a=j*Math.PI/3;limb(A,[A[0]+Math.cos(a)*.62,A[1]+Math.sin(a)*.45,A[2]-.4],.08);}
   stats.fallenTrees=1;
  }
 }
 // Plant in uneven pockets: mostly bare shingle, rich soil around root fans,
 // sparse grass on salt-exposed toes. The route always keeps a clear shoulder.
 for(const patch of [{z:-3,n:18},{z:5.6,n:28},{z:10.2,n:19},{z:15,n:23},{z:23,n:20},{z:28,n:18}]){
  for(let j=0;j<patch.n;j++){const zz=patch.z+range(-1.7,1.7),e=shore(zz);if(e===null)continue;const x=e-range(.35,2.8);if(j%7===0)bush(x,zz,range(.5,.85));else if(j%3===0)fern(x,zz,range(.65,1));else grass(x,zz,range(.7,1.15));}
 }
 // Two southern vignettes carry the woodland identity around the headland.
 // The harbour remains untouched west of x3. These follow the final lowered
 // terrace mesh and leave generous empty shingle between the small groups.
 for(const [index,site]of [{x:15,z:38.5},{x:28,z:39.8}].entries()){
  const {x,z}=site,y=ground(x,z,1.2);if(y===null||routeDistance(x,z)<4)continue;
  stats.southernClusters++;
  for(const [dx,dz,s]of [[-.75,-.25,1.05],[.48,-.8,.9],[.85,.15,.75]]){
   if(routeDistance(x+dx,z+dz)>3.8)bush(x+dx,z+dz,s);
  }
  for(const [dx,dz]of [[-.4,.55],[.75,-.5],[-1.15,-.6]])if(routeDistance(x+dx,z+dz)>3.5)fern(x+dx,z+dz,.9);
  if(index===0){
   // A short bleached branch settles into the bank at every joint.
   let last=null;
   for(let j=0;j<5;j++){const xx=x-1+j*.42,zz=z+.35+j*.08,gy=ground(xx,zz,.2);if(gy===null)continue;const next=[xx,gy+.12,zz];if(last)limb(last,next,.13,'wood');last=next;}
   for(const dx of [-.6,.2]){const gy=ground(x+dx,z+.55,.25);if(gy!==null)limb([x+dx,gy+.12,z+.55],[x+dx+.25,gy+.28,z+.85],.055,'bark');}
  }else{
   // A compact bent shore tree frames the high point without making a wall.
   limb([x,y-.1,z],[x-.35,y+1.5,z-.14],.17);limb([x-.35,y+1.5,z-.14],[x-.8,y+2.6,z-.35],.11);
   for(const [dx,dy,dz,s]of [[-.7,2.55,-.35,.8],[-.25,2.1,.05,.65],[-1.1,2.95,-.2,.65]]){
    stamp('canopy','leaf',x+dx,y+dy,z+dz,s,.62,s*.85,.5);
    stamp('canopy','leafLight',x+dx-.07,y+dy+.29,z+dz,s*.75,.16,s*.63,.5);
   }
  }
 }
 for(const [shape,batch]of batches){const mat=material.clone();if(shape==='leaf')mat.side=THREE.DoubleSide;const mesh=new THREE.InstancedMesh(geometry[shape],mat,batch.matrices.length);batch.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,batch.colors[i]);});mesh.name=`Coastal ${shape}`;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);stats.drawCalls++;}
 root.traverse(n=>{if(n.isMesh&&!n.isInstancedMesh)stats.drawCalls++;});scene.add(root);
 return{root,stats};
}
