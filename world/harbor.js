import * as THREE from 'three';
import {createCritter3D} from '../game/dice/pieces3d.js';
import {createOpenSeaBoat} from './opensea-boat.js';
import {buildPierLayout} from './harbor-layout.js';
import {buildStartCourt} from './start-court.js';

export async function buildHarbor(scene,{heightAt,routeDistance}){
 const root=new THREE.Group();root.name='Drift Dock — arrival market';scene.add(root);
 const P={wood:'#a48258',light:'#c5a36f',dark:'#67533e',ink:'#334052',cream:'#eee2c4',blue:'#4262a6',mint:'#8fba98',stone:'#aaa58d',gold:'#deb365',rope:'#dbca9c'};
 const geometries={box:new THREE.BoxGeometry(1,1,1),post:new THREE.CylinderGeometry(1,1,1,8),sphere:new THREE.IcosahedronGeometry(1,1)};
 const materials=Object.fromEntries(Object.entries(P).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:.88,flatShading:true})]));
 const batches=new Map(),dummy=new THREE.Object3D(),placements=[];
 function part(shape,color,x,y,z,sx,sy,sz,ry=0,rz=0){const key=shape+':'+color;if(!batches.has(key))batches.set(key,[]);dummy.position.set(x,y,z);dummy.rotation.set(0,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();batches.get(key).push(dummy.matrix.clone());}
 function beam(a,b,width=.07,color='rope'){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),key='post:'+color;if(!batches.has(key))batches.set(key,[]);dummy.position.copy(va).add(vb).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.clone().sub(va).normalize());dummy.scale.set(width,va.distanceTo(vb),width);dummy.updateMatrix();batches.get(key).push(dummy.matrix.clone());}
 function floor(x,z,w,d){const samples=[];for(const dx of [-w/2,0,w/2])for(const dz of [-d/2,0,d/2]){const y=heightAt(x+dx,z+dz);if(y!==null)samples.push(y);}return Math.max(...samples)+.13;}
 function deck(x,z,w,d,y){
  for(let i=0;i<Math.ceil(d/.28);i++){const zz=z-d/2+i*.28;part('box',i%3?'wood':'light',x,y,zz,w,.13,.255);for(const dx of [-w/2+.12,w/2-.12])part('post','ink',x+dx,y+.071,zz,.025,.012,.025);}
  for(const dx of [-w/2+.16,w/2-.16])for(const dz of [-d/2+.15,d/2-.15]){const ground=heightAt(x+dx,z+dz)??-4.5;part('post','dark',x+dx,(ground+y)/2,z+dz,.105,y-ground+.3,.105);}
 }
 function crate(x,y,z,size=.65){part('box','wood',x,y+size/2,z,size,size,size);for(const h of [.08,size-.08])part('box','light',x,y+h,z,size+.04,.07,size+.04);for(const dx of [-size/2,size/2])part('box','dark',x+dx,y+size/2,z,.04,size,.06);}
 function barrel(x,y,z,s=.55){part('post','wood',x,y+s*.65,z,s*.55,s*1.3,s*.55);for(const dy of [.18,.95])part('post','ink',x,y+s*dy,z,s*.565,.065,s*.565);part('post','light',x,y+s*1.31,z,s*.52,.045,s*.52);}
 function stall(x,z,color){
  const y=floor(x,z,3,2.3);placements.push({kind:'market stall',x,z,y,radius:1.9});deck(x,z,3.2,2.6,y);
  for(const dx of [-1.35,1.35])for(const dz of [-.9,.9])part('post','dark',x+dx,y+1.3,z+dz,.07,2.6,.07);
  for(let i=0;i<9;i++)for(const side of [-1,1]){const panel=new THREE.Mesh(new THREE.BoxGeometry(.35,.045,1.18),materials[i%2?color:'cream']);panel.position.set(x-1.4+i*.35,y+2.65,z+side*.51);panel.rotation.x=side*.22;root.add(panel);panel.castShadow=true;}
  part('box','dark',x,y+2.8,z,3.1,.1,.1);part('box','wood',x,y+.95,z+.45,2.7,.14,.8);
  for(let i=0;i<5;i++){crate(x-1+i*.47,y+1.03,z+.45,.4);for(let k=0;k<3;k++)part('sphere',i%2?'gold':'mint',x-1+i*.47+(k-1)*.1,y+1.48,z+.45,.09,.09,.1);}
  barrel(x+1.75,heightAt(x+1.75,z)??y,z,.55);crate(x-1.8,heightAt(x-1.8,z+.4)??y,z+.4,.6);
 }
 stall(-19,33.6,'blue');stall(-14,34.4,'mint');stall(-22.6,36.8,'gold');
 for(const [i,x,z] of [[1,-19,33],[2,-14,33.8],[5,-22.6,36.2]]){const critter=createCritter3D(i,{scale:.65});critter.position.set(x,floor(x,z,2,1)+.08,z);root.add(critter);}
 // A small cargo yard tells the arrival story beside the stalls.
 for(const [x,z,s] of [[-26,36,.9],[-26.8,37,.7],[-25.7,37.2,.7]])crate(x,heightAt(x,z),z,s);
 crate(-26,heightAt(-26,36)+.9,36,.6);
 for(const [x,z] of [[-25.8,34.6],[-24.8,34.4]])barrel(x,heightAt(x,z),z,.7);
 const cartY=floor(-25,32.4,2,1.5);part('box','wood',-25,cartY+.4,32.4,1.9,.16,1.25);
 for(const dx of [-.7,.7])for(const dz of [-.74,.74]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.33,.06,5,12),materials.dark);wheel.position.set(-25+dx,cartY+.16,32.4+dz);root.add(wheel);for(let i=0;i<6;i++)beam([-25+dx,cartY+.16,32.4+dz],[-25+dx+Math.cos(i*Math.PI/3)*.3,cartY+.16+Math.sin(i*Math.PI/3)*.3,32.4+dz],.025,'light');}
 crate(-25,cartY+.49,32.4,.7);
 // Boardwalk from the market to a real stair down the coastal shelf.
 const pier=buildPierLayout(heightAt),pierX=pier.x,steps=pier.descent.length;
 deck(pierX,pier.landing.z,pier.width,pier.landing.depth,pier.landing.y);
 for(const flight of [pier.approach,pier.descent]){
  for(const [i,p] of flight.entries()){
   part('box',i%4?'wood':'light',pierX,p.y,p.z,pier.width,.18,p.depth);
   for(const side of [-1,1]){
    const x=pierX+side*1.02;
    if(i%3===0||i===flight.length-1)part('post','dark',x,p.y+.45,p.z,.065,1.06,.065);
    if(i<flight.length-1){const next=flight[i+1];beam([x,p.y+.94,p.z],[x,next.y+.94,next.z],.045,'rope');beam([x,p.y-.18,p.z],[x,next.y-.18,next.z],.09,'dark');}
   }
  }
 }
 // Landing guards and real braced piles carry the cliff-side change of direction.
 for(const side of [-1,1]){
  const x=pierX+side*1.02,top=pier.landing.y;
  beam([x,pier.approach.at(-1).y+.94,pier.approach.at(-1).z],[x,top+.94,42.02],.045,'rope');
  beam([x,-4.45,41.9],[x,top-.12,41.9],.13,'dark');
  beam([x,-3.9,41.9],[x,top-1.5,43.5],.1,'wood');
 }
 deck(pierX,49,3.5,2.8,-2.4);for(const dx of [-1.5,1.5]){part('post','wood',pierX+dx,-3.1,49,.14,2.4,.14);part('post','rope',pierX+dx,-2.11,49,.18,.14,.18);}
 // Market-to-start stepping stones leave the road's own footprint intact.
 for(let i=0;i<8;i++){const x=-17+i*.83,z=36.4+Math.sin(i*.5)*.3;if(routeDistance(x,z)<1.9)continue;part('box','stone',x,heightAt(x,z)+.04,z,.64,.09,.65,i*.13);}
 // A framed arrival board in a clear pocket near START.
 const signX=-11.7,signZ=37.4,signY=heightAt(signX,signZ);
 for(const dx of [-.92,.92])part('post','dark',signX+dx,signY+1.12,signZ,.065,2.24,.065);
 await document.fonts.load('600 36px "Martian Mono"');
 const startCourt=buildStartCourt(root);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle=P.ink;ctx.fillRect(0,0,512,256);ctx.fillStyle=P.cream;ctx.fillRect(9,9,494,238);ctx.fillStyle=P.ink;ctx.textAlign='center';ctx.font='600 42px "Martian Mono"';ctx.fillText('DRIFT DOCK',256,108);ctx.font='500 23px "Martian Mono"';ctx.fillText('ARRIVE · TRADE · ROLL',256,165);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Mesh(new THREE.BoxGeometry(2.25,1.12,.14),[materials.dark,materials.dark,materials.dark,materials.dark,new THREE.MeshStandardMaterial({map:tex,roughness:1}),materials.dark]);sign.position.set(signX,signY+1.85,signZ);root.add(sign);
 // Suspended festival pennants and warm lanterns, placed above the market lane.
 for(const [x,z] of [[-22.9,31.6],[-11.6,32.4]])part('post','dark',x,heightAt(x,z)+1.7,z,.075,3.4,.075);
 const pa=[-22.9,heightAt(-22.9,31.6)+3.4,31.6],pb=[-11.6,heightAt(-11.6,32.4)+3.4,32.4];
 for(let i=0;i<12;i++){const t=i/11,t2=(i+.9)/11,x=pa[0]+(pb[0]-pa[0])*t,z=pa[2]+(pb[2]-pa[2])*t,y=pa[1]+(pb[1]-pa[1])*t-Math.sin(t*Math.PI)*.5;const x2=pa[0]+(pb[0]-pa[0])*t2,z2=pa[2]+(pb[2]-pa[2])*t2,y2=pa[1]+(pb[1]-pa[1])*t2-Math.sin(t2*Math.PI)*.5;beam([x,y,z],[x2,y2,z2],.025);if(i<11){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([x,y,z,x+.44,y-.03,z,(x+x+.44)/2,y-.47,z],3));geo.computeVertexNormals();const flag=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:i%2?P.mint:P.blue,side:THREE.DoubleSide,roughness:1}));root.add(flag);}}
 for(const [x,z] of [[-24,33],[-12,38],[-20,39]]){const y=heightAt(x,z);barrel(x,y,z);part('box','ink',x,y+1.3,z,.28,.4,.28);part('box','gold',x,y+1.3,z,.21,.28,.21);}
 // The moored boat itself carries the OpenSea-inspired silhouette.
 const boat=createOpenSeaBoat();root.add(boat);boat.position.set(-22.5,-3.42,48.6);boat.rotation.y=-.2;
 for(const [key,list] of batches){const [shape,color]=key.split(':'),mesh=new THREE.InstancedMesh(geometries[shape],materials[color],list.length);list.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 return{root,placements,startCourt,dynamicRoots:[boat],stats:{stalls:3,boats:1,boatSails:2,boatStyle:'OpenSea-inspired',boatLogoDecals:0,pierSteps:steps,pierApproachSteps:pier.approach.length,pierDescentStart:pier.descent[0].z,startCourt:startCourt.stats,instancedBatches:batches.size},update:t=>{if(reduced)return;boat.position.y=-3.42+Math.sin(t*.85)*.07;boat.rotation.z=Math.sin(t*.7)*.025;}};
}
