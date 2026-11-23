import * as THREE from 'three';

// Low sanctuary ring around the dice arena: a marble halo with a gold rim,
// sectioned flower beds, clipped topiary, small lanterns and two lotus pools.
// Everything stays below a Critter's shoulder so the arena and route stay open.
export function buildCrownSanctuary(scene,{heightAt,routeDistance,inner=8.05}={}){
 const root=new THREE.Group();root.name='Crown sanctuary ring';
 const mat=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:.7,...o});
 const marble=mat('#f6efe1'),gold=mat('#f1c75b',{roughness:.4,metalness:.12}),water=mat('#5fd0e6',{roughness:.15}),leaf=mat('#4fae4a',{flatShading:true}),glow=mat('#fff3c4',{emissive:'#ffd36b',emissiveIntensity:.9});
 const petals=['#ff86b0','#ffffff','#ffd84d','#c49bff'].map(c=>mat(c,{flatShading:true}));
 const clear=(x,z,m)=>routeDistance(x,z)>1.43+m;
 const ground=(x,z)=>heightAt(x,z)??null;
 const batches=new Map();let seed=144;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 function put(key,geo,material,x,y,z,s=[1,1,1],ry=0){if(!batches.has(key))batches.set(key,{geo,material,list:[]});batches.get(key).list.push(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ry),new THREE.Vector3(...s)));}
 const box=new THREE.BoxGeometry(1,1,1),ball=new THREE.IcosahedronGeometry(1,1),bud=new THREE.SphereGeometry(1,6,4),post=new THREE.CylinderGeometry(.05,.07,1,8);
 // Marble halo: short curb segments that follow the slope, with a gold rim.
 const N=120,width=.42;
 for(let i=0;i<N;i++){
  const a=(i+.5)/N*Math.PI*2,r=inner+width/2,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!clear(x,z,.35))continue;
  const y=ground(x,z);if(y===null)continue;const len=2*Math.PI*r/N+.02;
  put('halo',box,marble,x,y+.09,z,[width,.22,len],-a);
  put('rim',box,gold,Math.cos(a)*(r+width/2),y+.2,Math.sin(a)*(r+width/2),[.07,.06,len],-a);
 }
 // Beds: alternating colour sectors, low clipped balls between them.
 const sectors=16;
 for(let k=0;k<sectors;k++){
  const color=petals[k%petals.length];
  for(let j=0;j<46;j++){
   const a=(k+rnd()*.86+.07)/sectors*Math.PI*2,r=inner+width+.25+rnd()*1.05,x=Math.cos(a)*r,z=Math.sin(a)*r;
   if(!clear(x,z,.3))continue;const y=ground(x,z);if(y===null)continue;
   put('stem',bud,leaf,x,y+.06,z,[.07,.1,.07]);put('petal'+(k%petals.length),bud,color,x,y+.17,z,[.12,.08,.12]);
  }
  const a=(k/sectors)*Math.PI*2,r=inner+width+.75,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(clear(x,z,.45)){const y=ground(x,z);if(y!==null){put('topiary',ball,leaf,x,y+.3,z,[.34,.32,.34]);put('pot',box,marble,x,y+.06,z,[.42,.14,.42],a);}}
 }
 // Eight small lanterns on the halo.
 for(let k=0;k<8;k++){
  const a=(k+.5)/8*Math.PI*2,r=inner+width/2,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!clear(x,z,.35))continue;const y=ground(x,z);if(y===null)continue;
  put('lanternPost',post,gold,x,y+.42,z,[1,.62,1]);put('lantern',box,glow,x,y+.8,z,[.2,.22,.2],a);put('lanternCap',new THREE.ConeGeometry(.17,.14,4),gold,x,y+.98,z,[1,1,1],a+Math.PI/4);
 }
 // Two lotus pools where the lawn between arena and route is widest.
 for(const deg of [45,215]){
  const a=deg*Math.PI/180,r=inner+width+1.15,x=Math.cos(a)*r,z=Math.sin(a)*r;if(!clear(x,z,1.05))continue;const y=ground(x,z);if(y===null)continue;
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(.92,.98,.2,28),marble);rim.position.set(x,y+.08,z);rim.receiveShadow=true;root.add(rim);
  const pool=new THREE.Mesh(new THREE.CylinderGeometry(.76,.76,.04,28),water);pool.position.set(x,y+.19,z);root.add(pool);
  for(let j=0;j<3;j++){const b=j*2.1+deg,lx=x+Math.cos(b)*.38,lz=z+Math.sin(b)*.38;put('pad',new THREE.CylinderGeometry(.2,.2,.02,10),leaf,lx,y+.22,lz);put('lotus',bud,petals[0],lx,y+.28,lz,[.1,.07,.1]);}
 }
 for(const [key,{geo,material,list}] of batches){const mesh=new THREE.InstancedMesh(geo,material,list.length);mesh.name='Sanctuary '+key;list.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=!/petal|stem|rim/.test(key);mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();root.add(mesh);}
 scene.add(root);return{root};
}
