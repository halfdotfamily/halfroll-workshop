import * as THREE from 'three';
import {createCritter3D} from '../game/dice/pieces3d.js';
import {START_COURT as C,courtSeat} from './harbor-layout.js';

export function buildStartCourt(parent){
 const root=new THREE.Group();root.name='Drift Dock — six-seat arrival court';parent.add(root);
 const mats={};const material=color=>mats[color]??=new THREE.MeshStandardMaterial({color,roughness:.93});
 function mesh(geo,color,x,y,z){const m=new THREE.Mesh(geo,material(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;root.add(m);return m;}
 // Masonry continues down to the seabed wherever the round quay overhangs land.
 mesh(new THREE.CylinderGeometry(C.radius-.06,C.radius+.12,5.05,64),'#8f9681',C.x,C.y-2.705,C.z);
 const stoneGeo=new THREE.CylinderGeometry(C.radius+.025,C.radius+.025,.55,3,1,true,.009,Math.PI*2/28-.018),stoneBatches=[[],[],[]],dummy=new THREE.Object3D();
 for(let course=0;course<8;course++)for(let i=0;i<28;i++){
  const a=(i+course%2*.5)*Math.PI*2/28;
  dummy.position.set(C.x,C.y-.45-course*.61,C.z);dummy.rotation.y=a;dummy.updateMatrix();stoneBatches[(i+course)%3].push(dummy.matrix.clone());
 }
 stoneBatches.forEach((list,i)=>{const m=new THREE.InstancedMesh(stoneGeo,material(['#adb297','#a0aa91','#b5b79b'][i]),list.length);list.forEach((matrix,j)=>m.setMatrixAt(j,matrix));m.castShadow=m.receiveShadow=true;root.add(m);});
 mesh(new THREE.CylinderGeometry(C.radius,C.radius,.17,72),'#e6dec4',C.x,C.y-.085,C.z);
 // Inlaid compass, a quiet central meeting point, and six colored waiting bays.
 const ring=(r,tube,color,y=C.y+.012)=>{const m=mesh(new THREE.TorusGeometry(r,tube,4,72),color,C.x,y,C.z);m.rotation.x=Math.PI/2;return m;};
 ring(3.12,.035,'#8e987f');ring(1.13,.022,'#8e987f');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,512,512);ctx.strokeStyle='#34424c';ctx.fillStyle='#34424c';ctx.lineWidth=5;
 ctx.beginPath();ctx.arc(256,225,54,Math.PI,0);ctx.lineTo(310,239);ctx.lineTo(202,239);ctx.closePath();ctx.fillStyle='#9ac6aa';ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(256,225,28,Math.PI,0);ctx.stroke();ctx.fillStyle='#34424c';ctx.textAlign='center';ctx.font='600 29px "Martian Mono"';ctx.fillText('ALL ABOARD',256,291);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const print=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),new THREE.MeshStandardMaterial({map:tex,transparent:true,depthWrite:false,roughness:1}));print.rotation.x=-Math.PI/2;print.position.set(C.x,C.y+.018,C.z);root.add(print);
 const colors=['#4262a6','#809cca','#8fbd9b','#bad2a0','#e5d7ac','#9c9db8'];
 for(let id=0;id<6;id++){
  const s=courtSeat(id),a=id*Math.PI/3;
  const arc=mesh(new THREE.TorusGeometry(2.83,.07,5,16,Math.PI/5),colors[id],C.x,C.y+.025,C.z);arc.rotation.set(Math.PI/2,0,a-Math.PI/2-Math.PI/10);
  if(id){const c=createCritter3D(id,{scale:.8});c.position.set(s.x,s.y,s.z);c.rotation.y=s.rotation;root.add(c);}
 }
 // Low nautical rail on the sea side; the northern entry remains fully open.
 const railPoints=[];
 for(let i=0;i<=8;i++){
  const a=Math.PI*.43+i*Math.PI*1.14/8,x=C.x+Math.sin(a)*3.36,z=C.z-Math.cos(a)*3.36;
  mesh(new THREE.CylinderGeometry(.065,.085,.87,8),'#79674b',x,C.y+.435,z);
  mesh(new THREE.SphereGeometry(.09,8,6),'#d3bb86',x,C.y+.9,z);railPoints.push(new THREE.Vector3(x,C.y+.72,z));
 }
 for(let i=0;i<railPoints.length-1;i++){const a=railPoints[i],b=railPoints[i+1],mid=a.clone().lerp(b,.5);mid.y-=.12;mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a,mid,b]),8,.035,5,false),'#dac69f',0,0,0);}
 return{root,seat:courtSeat(0),stats:{seats:6,waitingCritters:5,center:{x:C.x,y:C.y,z:C.z},radius:C.radius}};
}
