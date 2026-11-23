import * as THREE from 'three';
import {COAST} from './terrain.js';

// Plain port masonry and mooring hardware; the tribute lives on the boat.
export function buildDockRelief(scene,{heightAt}){
 const root=new THREE.Group();root.name='Unbranded quay masonry';scene.add(root);
 const x=-26;let edge;
 for(let i=0;i<COAST.length;i++){const a=COAST[i],b=COAST[(i+1)%COAST.length];if(a.z<35||b.z<35||x<Math.min(a.x,b.x)||x>Math.max(a.x,b.x))continue;const t=(x-a.x)/(b.x-a.x);edge={z:a.z+(b.z-a.z)*t,angle:Math.atan2(-(b.z-a.z),b.x-a.x)};break;}
 if(!edge)return{root,stats:{quayReliefs:0}};
 // This coast segment runs westward; keep local +z facing the ocean.
 const tangentAngle=Math.atan2(Math.sin(edge.angle),Math.cos(edge.angle));
 const yaw=Math.abs(tangentAngle)>Math.PI/2?tangentAngle-Math.sign(tangentAngle)*Math.PI:tangentAngle;
 const top=heightAt(x,edge.z-.35),base=-3.65,h=Math.min(3.6,top-base-.2),center=base+h/2;
 const wall=new THREE.Group();wall.position.set(x,center,edge.z+.07);wall.rotation.y=yaw;root.add(wall);
 const materials=Object.fromEntries(Object.entries({stone:'#c1b99c',dark:'#737c70',blue:'#3f669e',cream:'#eee6d1',metal:'#354956',moss:'#638f74',gold:'#d4b46c'}).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:.95,flatShading:true})]));
 function block(x,y,z,w,h,d,color='stone'){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materials[color]);m.position.set(x,y,z);wall.add(m);m.castShadow=m.receiveShadow=true;return m;}
 for(let row=0;row<5;row++)for(let col=0;col<8;col++){const xx=-3.05+col*.86+(row%2?.17:0);block(xx,-h/2+(row+.5)*h/5,-.06,.82,h/5-.045,.46,row%3?'stone':'dark');}
 for(const side of [-1,1]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.29,.055,6,20),materials.metal);ring.position.set(side*2.3,-.4,.32);wall.add(ring);for(let i=0;i<7;i++){const link=new THREE.Mesh(new THREE.TorusGeometry(.1,.022,4,10),materials.metal);link.position.set(side*2.3+.04*Math.sin(i),-.6-i*.14,.34);link.rotation.y=i%2*Math.PI/2;wall.add(link);}}
 // Hanging ivy and tide-weathered details visually join the relief to the cliff.
 const leaves=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0),materials.moss,90),d=new THREE.Object3D();
 for(let i=0;i<90;i++){const col=i%6,j=Math.floor(i/6),xx=-3.1+col*1.22+.11*Math.sin(j*1.5+col);d.position.set(xx,h/2-j*.13,.23);d.scale.set(.14,.09,.045);d.rotation.set(0,0,Math.sin(i)*.5);d.updateMatrix();leaves.setMatrixAt(i,d.matrix);}wall.add(leaves);
 return{root,stats:{quayReliefs:0,quayMasonry:true,anchoredToCoast:true}};
}
