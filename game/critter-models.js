import * as THREE from 'three';
import {CHARACTERS,characterTraits} from './characters.js';

// These silhouettes and proportions follow assets/critters.js. SVG units map
// to world units; the feet touch y=0 and every face looks along +Z.
const U=.026, Z=.435;
const COLORS={ink:0x2a2c31,paper:0xf8f5ee,cream:0xefe9dc,mint:0xa9d7be,leaf:0xd3e6c4,cobalt:0x3f5ba8,navy:0x2f3a56,sand:0xd6cdbb,pale:0xb9c6e6,sage:0x7fb79a,peach:0xf2b8a8};
const materials=Object.fromEntries(Object.entries(COLORS).map(([key,color])=>[key,new THREE.MeshStandardMaterial({color,roughness:.86,metalness:0})]));
const faceMaterials=Object.fromEntries(['ink','paper','peach'].map(key=>[key,new THREE.MeshBasicMaterial({color:COLORS[key]})]));
const outline=new THREE.MeshBasicMaterial({color:COLORS.ink,side:THREE.BackSide});
const sphere=new THREE.SphereGeometry(1,16,12);
const armSegment=new THREE.CylinderGeometry(.030,.030,1,8);
const GRIPS={
 'token':{point:[-.21,-.10,.06],style:'pinch'},
 'half coin':{point:[-.29,.055,.065],style:'pinch'},
 'eth':{point:[0,-.35,.015],style:'support'},
 'candle':{point:[-.11,-.20,.035],style:'wrap'},
 'flag':{point:[0,-.18,0],style:'wrap'},
};
const P=(x,y,z=Z)=>new THREE.Vector3((x-50)*U,(120-y)*U,z);
const BODY={egg:{fy:58,t:28,hw:33,rx:82},bean:{fy:60,t:32,hw:36,rx:85},drop:{fy:62,t:26,hw:31,rx:81},box:{fy:56,t:28,hw:27,rx:77},pear:{fy:52,t:30,hw:22,rx:84},capsule:{fy:52,t:26,hw:23,rx:72}};
function mesh(parent,geo,color,position=[0,0,0],scale=[1,1,1],edge=false){
 const m=new THREE.Mesh(geo,typeof color==='string'?materials[color]:color);m.position.set(...position);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);
 if(edge){const o=new THREE.Mesh(geo,outline);o.scale.setScalar(1.023);m.add(o);}return m;
}
function ball(parent,x,y,z,sx,sy,sz,color,edge=false){return mesh(parent,sphere,color,[x,y,z],[sx,sy,sz],edge);}
function stroke(parent,points,color='ink',radius=.031){
 const path=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?new THREE.Vector3(...p):p));
 return mesh(parent,new THREE.TubeGeometry(path,Math.max(8,points.length*5),radius,6,false),color);
}
function ink(parent,points,color='ink',width=2.6,z=Z+.015){
 const material=faceMaterials[color]||color,radius=width*U/2,path=stroke(parent,points.map(([x,y])=>P(x,y,z)),material,radius);
 // Close the tubes with round ends; open ends looked chipped from the side.
 for(const [x,y]of [points[0],points.at(-1)]){const p=P(x,y,z),cap=ball(path,p.x,p.y,p.z,radius,radius,radius,material);cap.castShadow=cap.receiveShadow=false;}
 path.castShadow=path.receiveShadow=false;return path;
}
function dot(parent,x,y,r,color='ink',z=Z+.02){const v=P(x,y,z),m=ball(parent,v.x,v.y,v.z,r*U,r*U,.025,faceMaterials[color]||color);m.castShadow=m.receiveShadow=false;return m;}
function ring(parent,x,y,r,color='ink',tube=1.3,z=Z+.025){const m=mesh(parent,new THREE.TorusGeometry(r*U,tube*U,6,28),faceMaterials[color]||color,P(x,y,z).toArray());m.castShadow=m.receiveShadow=false;return m;}
function shapeFor(kind){
 const s=new THREE.Shape(),m=(x,y)=>s.moveTo((x-50)*U,(120-y)*U),l=(x,y)=>s.lineTo((x-50)*U,(120-y)*U);
 const c=(a,b,d,e,x,y)=>s.bezierCurveTo((a-50)*U,(120-b)*U,(d-50)*U,(120-e)*U,(x-50)*U,(120-y)*U);
 const q=(a,b,x,y)=>s.quadraticCurveTo((a-50)*U,(120-b)*U,(x-50)*U,(120-y)*U);
 if(kind==='egg'){m(50,28);c(77,27,84,50,82,70);c(80,92,69,106,50,106);c(30,106,19,92,18,69);c(16,49,24,29,50,28);}
 if(kind==='bean'){m(50,32);c(80,30,88,52,86,74);c(84,96,70,108,50,108);c(30,108,14,96,14,74);c(14,52,20,34,50,32);}
 if(kind==='drop'){m(50,26);c(62,40,84,52,82,74);c(80,96,68,108,50,108);c(32,108,20,96,18,74);c(16,52,38,40,50,26);}
 if(kind==='box'){m(24,34);q(24,28,30,28);l(70,28);q(76,28,76,34);l(78,108);q(50,110,22,108);l(24,34);}
 if(kind==='pear'){m(50,30);c(66,30,70,44,70,54);c(70,62,86,72,86,88);c(86,102,70,110,50,110);c(30,110,14,102,14,88);c(14,72,30,62,30,54);c(30,44,34,30,50,30);}
 if(kind==='capsule'){m(50,26);c(66,26,72,36,72,50);l(72,106);q(50,110,28,106);l(28,50);c(28,36,34,26,50,26);}
 s.closePath();return s;
}
const bodyGeometries=new Map();
// Module-owned caches are also used by scenery and other live model instances.
// Return snapshots so callers can free instance resources without owning these.
export function getCritterSharedResources(){
 return{geometries:new Set([sphere,armSegment,...bodyGeometries.values()]),materials:new Set([...Object.values(materials),...Object.values(faceMaterials),outline])};
}
function body(parent,kind,color){
 if(!bodyGeometries.has(kind)){const geo=new THREE.ExtrudeGeometry(shapeFor(kind),{depth:.62,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.075,bevelThickness:.12,curveSegments:16});geo.translate(0,0,-.31);bodyGeometries.set(kind,geo);}
 mesh(parent,bodyGeometries.get(kind),color,[0,0,0],[1,1,1],true).name='Critter body';
}
function face(parent,b,t){
 const y=b.fy,e=['navy','cobalt'].includes(t.color)?'paper':'ink';
 const faceParent=parent,eyes=new THREE.Group();eyes.name='Resting eyes';parent.add(eyes);parent=eyes;
 for(const [index,x]of [39,61].entries()){
  const side=index?'Right':'Left',origin=P(x,y,0),eye=new THREE.Group(),aperture=new THREE.Group(),frame=new THREE.Group();
  eye.name=side+' eye';eye.position.copy(origin);eyes.add(eye);aperture.name=side+' eye aperture';frame.name=side+' eye frame';eye.add(aperture,frame);parent=aperture;
  if(['wide','side-eye'].includes(t.eyes)){
   dot(parent,x,y,6,'paper');ring(parent,x,y,6,'ink',1);
   dot(parent,x+(t.eyes==='side-eye'?3:0),y+(t.eyes==='side-eye'?1:0),2.4,'ink',Z+.05).name=side+' pupil';
  }
  if(['dots','tired','lids'].includes(t.eyes))dot(parent,x,y+(t.eyes==='lids'?3:0),t.eyes==='dots'?3.4:3.1,e).name=side+' pupil';
  if(t.eyes==='glasses'){ring(frame,x,y,7,e);dot(parent,x,y+1,2.2,e).name=side+' pupil';}
  if(t.eyes==='sleepy')ink(parent,[[x-6,y],[x,y+3],[x+6,y]],e,3);
  if(['lids','side-eye'].includes(t.eyes))ink(t.eyes==='lids'?parent:frame,[[x-7,y-(t.eyes==='lids'?2:5)],[x+7,y-(t.eyes==='lids'?2:5)]],t.eyes==='lids'?e:'ink',3);
  if(t.eyes==='tired')ink(parent,[[x-5,y+7],[x,y+9],[x+6,y+7]],e,2);
  for(const group of [aperture,frame])for(const child of group.children)child.position.sub(origin);
  const closed=ink(eye,[[x-4,y],[x,y+.8],[x+4,y]],e,2.5,Z+.06);closed.name=side+' closed eye';closed.position.sub(origin);closed.visible=false;
 }
 parent=eyes;
 if(t.eyes==='glasses')ink(parent,[[46,y],[54,y]],e);
 if(t.eyes==='visor'){
  const p=P(50,y);ball(parent,p.x,p.y,Z+.02,.63,.17,.055,'ink');ink(parent,[[32,y],[44,y]],'mint',3,Z+.09);
 }
 // Graphic face parts must not shadow their own skin or each other.
 eyes.traverse(node=>{if(node.isMesh){node.castShadow=false;node.receiveShadow=false;}});
 parent=faceParent;const my=y+17;
 const mouth=new THREE.Group();mouth.name='Resting mouth';parent.add(mouth);
 if(t.mouth==='flat'||t.mouth==='tooth')ink(mouth,[[44,my],[56,my]],e);
 if(t.mouth==='o')dot(mouth,50,my,2.6,e);
 if(t.mouth==='wavy')ink(mouth,[[43,my],[46.5,my-1.8],[50,my],[53.5,my+1.8],[57,my]],e,2.4);
 if(t.mouth==='smirk')ink(mouth,[[45,my],[51,my+1],[56,my-3]],e);
 if(t.mouth==='tooth')mesh(mouth,new THREE.BoxGeometry(.115,.115,.025),'paper',P(50,my+2.25,Z+.045).toArray());
 const open=new THREE.Group();open.name='Emote mouth';open.position.copy(P(50,my,Z+.06));open.visible=false;parent.add(open);ball(open,0,0,0,.12,.2,.025,'ink').name='Open mouth';ball(open,0,-.1,.03,.074,.05,.017,'peach').name='Emote tongue';if(e==='paper')mesh(open,new THREE.TorusGeometry(.14,.014,6,24),faceMaterials.paper,[0,0,.025],[.88,1.43,1]);
 if(t.blush)for(const x of [32,68]){const p=P(x,y+11);ball(parent,p.x,p.y,Z+.01,.12,.054,.018,faceMaterials.peach);}
 const reactions=new THREE.Group();reactions.name='Reaction face';reactions.visible=false;parent.add(reactions);
 for(const mood of ['happy','smug','shocked','dizzy','angry','sad','relieved']){
  const g=new THREE.Group();g.name='Reaction '+mood;g.visible=false;reactions.add(g);
  for(const x of [39,61]){
   if(mood==='dizzy'){ink(g,[[x-4,y-4],[x+4,y+4]],e,2.7,Z+.18);ink(g,[[x-4,y+4],[x+4,y-4]],e,2.7,Z+.18);}
   else if(mood==='happy'||mood==='relieved')ink(g,[[x-5,y+2],[x,y-2],[x+5,y+2]],e,2.7,Z+.18);
   else{dot(g,x,y,mood==='shocked'?4:3,e,Z+.18);if(mood==='angry'||mood==='smug')ink(g,[[x-5,y-7+(x<50?-2:2)],[x+5,y-7+(x<50?2:-2)]],e,2.5,Z+.18);}
  }
  if(mood==='shocked')ring(g,50,my,4,e,1.5,Z+.18);
  else ink(g,mood==='sad'||mood==='angry'?[[44,my+2],[50,my],[56,my+2]]:mood==='smug'?[[44,my],[51,my+1],[57,my-4]]:[[43,my-2],[50,my+2],[57,my-2]],e,2.5,Z+.18);
 }
}
function mitten(parent,color,side,style){
 // One continuous glove contour, rather than individually outlined beads.
 const s=new THREE.Shape(),mirror=style==='relaxed'?-side:1;
 const m=(x,y)=>s.moveTo(x*mirror,y),l=(x,y)=>s.lineTo(x*mirror,y),q=(a,b,x,y)=>s.quadraticCurveTo(a*mirror,b,x*mirror,y);
 if(style==='relaxed'){
  m(-.035,.065);q(-.07,.06,-.07,.02);l(-.073,-.063);q(-.073,-.105,-.045,-.108);q(-.025,-.126,-.008,-.108);q(.013,-.126,.029,-.108);q(.061,-.115,.066,-.079);l(.064,-.01);q(.108,.012,.09,.039);q(.076,.055,.049,.023);l(.044,.055);q(.01,.075,-.035,.065);
 }else{
  m(-.04,.067);q(-.08,.063,-.081,.02);l(-.076,-.057);q(-.07,-.094,-.035,-.097);l(.042,-.087);q(.083,-.083,.089,-.041);l(.087,.006);q(.121,.025,.099,.05);q(.087,.063,.062,.041);q(.052,.072,-.04,.067);
 }
 const depth=style==='wrap'?.12:style==='pinch'?.075:.052,z=style==='wrap'?0:style==='pinch'?-.01:-.026;
 s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.015,bevelSize:.012,bevelSegments:3,steps:1,curveSegments:8});geo.translate(0,0,z);
 const palm=mesh(parent,geo,color,[0,0,0],[1,1,1],true);
 const marks=style==='wrap'?[[[.018,.028],[.059,.025],[.083,.03]],[[.016,-.012],[.057,-.015],[.084,-.01]],[[.013,-.05],[.052,-.054],[.075,-.049]]]:[[[-.023,-.068],[-.021,-.085]],[ [.022,-.068],[.023,-.086]]];
 for(const points of marks)stroke(parent,points.map(([x,y])=>[x*mirror,y,z+depth+.022]),faceMaterials.ink,.0035);
 return palm;
}
function cylinder(parent,x,y,z,rTop,rBottom,h,color,edge=true){return mesh(parent,new THREE.CylinderGeometry(rTop,rBottom,h,28),color,[x,y,z],[1,1,1],edge);}
function seatHeadwear(hat,brim,depth){
 // Both meshes share the upper-body coordinate system: +Y is up, +Z faces out.
 // Include the drawn outline in the measured crown, then deliberately sink
 // the brim below it. Only the whole child group moves; views stay unchanged.
 const body=hat.parent.getObjectByName('Critter body');
 body.geometry.computeBoundingBox();brim.geometry.computeBoundingBox();
 const crownY=body.geometry.boundingBox.max.y*1.023;
 const brimBottom=brim.position.y+brim.geometry.boundingBox.min.y*brim.scale.y*1.023;
 hat.position.y=crownY-brimBottom-depth;
 hat.userData.bodyTop=crownY;hat.userData.seatDepth=depth;
}
function head(parent,b,t){
 const top=(120-b.t)*U;
 const hat=new THREE.Group();hat.name='Headwear';hat.userData={kind:t.head,crownY:top};parent.add(hat);parent=hat;
 // A worn hat is centered on the skull's depth, rather than pushed onto its face.
 if(['beanie','bucket hat','bowler','paper crown','horns'].includes(t.head))hat.position.z=.025;
 if(t.head==='beanie'){
  // Owner's reference: knit cuff seated on the crown, spanning front AND back.
  hat.position.z=0;
  mesh(parent,new THREE.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2),'cobalt',[0,top+.005,0],[.61,.37,.51],true);
  const cuff=cylinder(parent,0,top-.085,0,.65,.67,.18,'cobalt');cuff.scale.z=.85;
  cuff.name='Beanie cuff';
  // Keep the original beanie silhouette. Lower it only slightly onto the crown.
  seatHeadwear(hat,cuff,.19);
  for(let i=0;i<40;i++){
   const a=i*Math.PI*2/40,s=Math.sin(a),c=Math.cos(a);
   stroke(parent,[[s*.659,top-.165,c*.561],[s*.68,top-.12,c*.579],[s*.67,top-.05,c*.57],[s*.65,top-.005,c*.553]],'cobalt',.016);
  }
  for(let i=0;i<36;i++){
   const a=i*Math.PI*2/36;
   stroke(parent,Array.from({length:7},(_,j)=>{const p=.19+j*(Math.PI/2-.19)/6;return[Math.sin(a)*Math.sin(p)*.617,top+.005+Math.cos(p)*.376,Math.cos(a)*Math.sin(p)*.517];}),'cobalt',.012);
  }
  const pom=ball(parent,0,top+.41,0,.115,.11,.115,'paper',true);
  pom.name='Beanie pom';
 }
 if(t.head==='bucket hat'){
  cylinder(parent,0,top-.08,0,.58,.70,.10,'leaf');cylinder(parent,0,top+.11,0,.40,.54,.35,'leaf');
  cylinder(parent,0,top-.005,0,.52,.54,.06,'mint');
 }
 if(t.head==='bowler'){
  hat.position.z=0;
  const brim=cylinder(parent,0,top-.06,0,.56,.56,.06,'ink');brim.name='Bowler brim';
  seatHeadwear(hat,brim,.14);
  // Only the upper dome belongs above the brim; no black ball below the hat.
  mesh(parent,new THREE.SphereGeometry(1,28,16,0,Math.PI*2,0,Math.PI/2),'ink',[0,top-.03,0],[.37,.34,.43],true);
  const band=cylinder(parent,0,top-.015,0,.37,.37,.045,'navy');band.scale.z=.43/.37;
 }
 if(t.head==='horns')for(const side of [-1,1]){const m=mesh(parent,new THREE.ConeGeometry(.17,.41,4),'paper',[side*.39,top+.1,0],[1,1,1],true);m.rotation.z=-side*.43;m.rotation.y=Math.PI/4;}
 if(t.head==='antenna'){stroke(parent,[[0,top-.04,0],[-.12,top+.27,0],[-.18,top+.39,0]],'ink',.032);ball(parent,-.18,top+.43,0,.105,.105,.105,'ink');}
 if(t.head==='halo'){const halo=mesh(parent,new THREE.TorusGeometry(.44,.037,8,36),'cobalt',[0,top+.27,0]);halo.rotation.x=Math.PI/2;}
 if(t.head==='paper crown'){
  const s=new THREE.Shape();s.moveTo(-.4,-.08);s.lineTo(-.4,.24);s.lineTo(-.2,.08);s.lineTo(0,.32);s.lineTo(.2,.08);s.lineTo(.4,.24);s.lineTo(.4,-.08);s.closePath();
  mesh(parent,new THREE.ExtrudeGeometry(s,{depth:.14,bevelEnabled:false}),'paper',[0,top+.015,.45],[1,1,1],true);
 }
 if(t.head==='party hat'){mesh(parent,new THREE.ConeGeometry(.28,.65,24),'mint',[0,top+.19,0],[1,1,1],true);ball(parent,0,top+.55,0,.085,.085,.085,'cobalt');}
 if(t.head==='tuft')for(const [x,dx,h] of [[-.1,-.22,.28],[0,.04,.36],[.1,.24,.23]])stroke(parent,[[x,top-.06,0],[x+dx*.4,top+h*.6,0],[x+dx,top+h,0]],'ink',.028);
 if(t.head==='sprout'){
  stroke(parent,[[0,top-.05,0],[0,top+.27,0]],'ink',.025);
  const a=ball(parent,.115,top+.3,0,.12,.24,.05,'mint',true);a.rotation.z=-.55;
  const b=ball(parent,-.14,top+.16,0,.20,.085,.05,'leaf',true);b.rotation.z=-.3;
 }
 if(t.head==='headphones'){
  // Lift the complete set so the band clears the beveled crown.
  hat.position.y=.08;
  const w=(b.hw+1)*U,y=(120-b.fy)*U;
  stroke(parent,[[-w,y,0],[-w*.93,top-.12,0],[-w*.55,top+.05,0],[0,top+.09,0],[w*.55,top+.05,0],[w*.93,top-.12,0],[w,y,0]],'ink',.045);
  for(const side of [-1,1]){ball(parent,side*w,y,0,.16,.25,.25,'navy',true);ball(parent,side*(w+.12),y,.015,.065,.16,.17,'cobalt');}
 }
}
function limbs(parent,b,t){
 const rig=new THREE.Group();rig.name='Fine ink limbs';parent.add(rig);
 for(const side of [-1,1]){
  const leg=stroke(rig,[[side*.26,.66,0],[side*.28,.30,.015],[side*.34,.045,.06]],'ink',.035);leg.name=side<0?'Left thin leg':'Right thin leg';
  // Pivot at the hip; the grounded little foot follows its own leg.
  leg.geometry.translate(0,-.66,0);leg.position.y=.66;
  const foot=ball(leg,side*.35,-.623,.105,.085,.037,.14,'ink');foot.name='Soft rounded foot';
  ball(leg,side*.35,-.612,.18,.065,.012,.045,'cream');
 }
 const arms=new THREE.Group();arms.position.y=.18;rig.add(arms);
 const shoulder={egg:.82,bean:.95,drop:.84,box:.75,pear:.88,capsule:.64}[t.body];
 for(const side of [-1,1]){
  const held=side===1&&t.holding!=='none';
  const hand=held?new THREE.Vector3(shoulder+(t.holding==='eth'?.31:.27),t.holding==='half coin'?.72:.88,.58):new THREE.Vector3(side*(shoulder+.18),.65,.16);
  const elbow=new THREE.Vector3(side*(shoulder+.17),held?.79:.87,held?.22:.08);
  const label=side<0?'Left':'Right',pivot=new THREE.Vector3(side*shoulder,1.10,.04),armRig=new THREE.Group();armRig.name=label+' gesture arm';armRig.position.copy(pivot);armRig.userData={restHand:hand.clone().sub(pivot).toArray(),restElbow:elbow.clone().sub(pivot).toArray(),held};arms.add(armRig);
  const arm=stroke(armRig,[pivot,elbow,hand].map(p=>p.clone().sub(pivot)),'ink',.030);arm.name=label+' thin arm';
  const posed=new THREE.Group();posed.name='Posed ink arm';posed.visible=false;armRig.add(posed);
  for(let joint=0;joint<2;joint++){const segment=mesh(posed,armSegment,'ink');segment.name='Arm segment '+joint;}
  ball(posed,0,0,0,.032,.032,.032,'ink').name='Soft elbow';
  const wrist=new THREE.Group();wrist.name=label+' wrist';wrist.position.copy(hand).sub(pivot);armRig.add(wrist);
  const rest=new THREE.Group();rest.name='Resting palm';wrist.add(rest);
  const style=held?GRIPS[t.holding].style:'relaxed';rest.userData.gripStyle=style;
  mitten(rest,t.color,side,style).name=label+' little palm';
  if(style==='support')rest.rotation.x=-.65;
  // A real wrist and shoulder, in Critter coordinates (+Z is the face).
  // Gesture fingers stay attached to this hand rather than facing the camera.
  const gesture=new THREE.Group();gesture.name='Gesture palm';gesture.visible=false;wrist.add(gesture);
  ball(gesture,0,0,0,.105,.108,.070,t.color,true);
  for(let finger=0;finger<4;finger++){const f=ball(gesture,-.078+finger*.052,.16,.015,.027,.105,.037,t.color);f.name='Gesture finger '+finger;}
  const thumb=ball(gesture,-side*.12,.015,.035,.041,.072,.047,t.color);thumb.rotation.z=side*.65;
 }
}
function heldItem(parent,b,t){
 if(t.holding==='none')return;
 const item=new THREE.Group();item.name=t.holding;item.userData.handGrip={point:[...GRIPS[t.holding].point],style:GRIPS[t.holding].style};parent.add(item);
 const p=P(80+b.rx-82,86,Z+.11);item.position.copy(p);
 if(t.holding==='token'){
  const disk=cylinder(item,0,0,0,.28,.28,.075,'cobalt');disk.rotation.x=Math.PI/2;
  mesh(item,new THREE.TorusGeometry(.13,.023,6,24),'paper',[0,0,.045]);
 }
 if(t.holding==='half coin'){
  item.position.copy(P(79+b.rx-82,98,Z+.10));const s=new THREE.Shape();s.moveTo(-.39,0);s.absarc(0,0,.39,Math.PI,0,true);s.lineTo(-.39,0);
  mesh(item,new THREE.ExtrudeGeometry(s,{depth:.06,bevelEnabled:false}),'mint',[0,0,0],[1,1,1],true);
  stroke(item,Array.from({length:13},(_,i)=>{const a=Math.PI-i*Math.PI/12;return[Math.cos(a)*.16,Math.sin(a)*.16,.075];}),'ink',.027);
 }
 if(t.holding==='eth'){
  const geo=new THREE.OctahedronGeometry(.35);mesh(item,geo,'leaf',[0,0,0],[.68,1.15,.50],true);
  stroke(item,[[-.23,0,.02],[0,-.09,.19],[.23,0,.02]],'ink',.02);
 }
 if(t.holding==='candle'){
  cylinder(item,0,-.12,0,.14,.14,.52,'paper');stroke(item,[[0,.15,0],[0,.23,0]],'ink',.015);
  ball(item,0,.32,0,.10,.17,.06,'peach');cylinder(item,0,-.40,0,.23,.23,.045,'sand');
 }
 if(t.holding==='flag'){
  item.position.copy(P(75+b.rx-82,85,Z+.10));stroke(item,[[0,-.44,0],[0,.44,0]],'ink',.029);
  const s=new THREE.Shape();s.moveTo(0,.44);s.lineTo(.46,.28);s.lineTo(0,.12);s.closePath();mesh(item,new THREE.ExtrudeGeometry(s,{depth:.035,bevelEnabled:false}),'mint',[0,0,0],[1,1,1],true);
 }
}
export function createCritterModel(id,{scale=1}={}){
 if(!Number.isFinite(scale)||scale<=0)throw Error('Critter scale must be positive');
 const index=Number(id),c=CHARACTERS[index]??CHARACTERS[0],t=characterTraits(c.id),b=BODY[t.body];
 const group=new THREE.Group();group.name=c.name;group.userData={characterId:c.id,cosmeticOnly:true,traits:t,modelVersion:4,limbRadius:.035,walkProfile:{bounce:[.97,1.08,.86,.93,.78,.9][Math.max(0,c.id-6)%6],sway:[.038,.07,.035,.055,.03,.045][Math.max(0,c.id-6)%6]},riggedFeet:true};
 const upper=new THREE.Group();upper.position.y=.18;group.add(upper);
 body(upper,t.body,t.color);const geometry=bodyGeometries.get(t.body);geometry.computeBoundingBox();const size=geometry.boundingBox.getSize(new THREE.Vector3());group.userData.bodyFootprint={rx:size.x*scale*.515,rz:Math.max(.44,size.z*scale*.515)};face(upper,b,t);
 // Compatibility anchor only. Blinks now close the actual eye apertures;
 // a flattened skin-colored box used to leave a line across every pupil.
 const lids=new THREE.Group();lids.name='Blink lids';lids.visible=false;upper.add(lids);
 head(upper,b,t);heldItem(upper,b,t);limbs(group,b,t);
 if(t.holding!=='none'){
  const item=group.getObjectByName(t.holding),wrist=group.getObjectByName('Right wrist');wrist.add(item);
  item.position.fromArray(item.userData.handGrip.point).multiplyScalar(-1);item.userData.wristMounted=true;
 }
 group.scale.setScalar(scale);return group;
}

export function createCourierBase(){
 const traits={body:'bean',color:'peach',eyes:'dots',mouth:'smirk',holding:'none',blush:false};
 const group=new THREE.Group(), upper=new THREE.Group();
 upper.position.y=.18;
 group.add(upper);
 body(upper,traits.body,traits.color);
 face(upper,BODY.bean,traits);
 limbs(group,BODY.bean,traits);
 return group;
}
