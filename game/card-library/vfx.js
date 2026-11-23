import * as THREE from 'three';
import {walkDurationMs} from '../presentation-timing.js';
import * as originalMotion from './motion-v2.js';

// Presentation only: positions, outcomes and hit targets come from the engine.
// This module never moves pawns, reads randomness, or writes to match state.
const C={emerald:'#319d78',ink:'#2a2c31',paper:'#f8f5ee',mint:'#a9d7be',leaf:'#d3e6c4',cobalt:'#3f5ba8',navy:'#303b59',sun:'#eedb94',coral:'#e98e7c',lilac:'#e4ddeb',sand:'#d7cbb4'};
const TYPES=new Set(['gamba','bonk','hook','swap','pump','to-the-moon','pocket-rocket','gigachad','bombardiro','rug-pull','reverse','send-it','trade-offer','airdrop','pandora','stonks','free-mint','wormhole','jackpot','not-stonks','mimic','paper-hands','rekt']);
const BAD=new Set(['not-stonks','mimic','paper-hands','rekt']);
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const easeOut=x=>1-(1-clamp(x))**3;
const vec=p=>p?.isVector3?p.clone():new THREE.Vector3(Number(p?.x)||0,Number(p?.y)||0,Number(p?.z)||0);

export function buildCardVfx(scene,{routePoint,reduced=false,onCue=()=>{},motionApi=originalMotion,enhancements=null,presentationTimeScale=1}={}){
 const {CARD_TIMELINES,cardMotionFrame,sampleCardMotion}=motionApi;
 const authoredTimelines=Object.fromEntries(Object.entries(CARD_TIMELINES).map(([kind,t])=>[kind,Object.fromEntries(Object.entries(t).map(([key,value])=>[key,value/presentationTimeScale]))]));
 const root=new THREE.Group();root.name='Halfroll one-shot card props';scene.add(root);
 const jobs=[];let matchId=null,lastMotion=null,lastCue=null,destroyed=false,now=0;
 const totals={spawned:0,disposed:0,peak:0,geometriesDisposed:0,materialsDisposed:0,skippedOld:0};
 function dispose(job){
  job.group.removeFromParent();const geometries=new Set(),materials=new Set();
  job.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});
  for(const geo of geometries){geo.dispose();totals.geometriesDisposed++;}
  for(const material of materials){material.dispose();totals.materialsDisposed++;}
  totals.disposed++;
 }
 function clear(){while(jobs.length)dispose(jobs.pop());}
 function hornAnchor(job){
  const body=job.targetBody;if(!body)return job.target.clone().add(new THREE.Vector3(0,.95,0));
  body.updateWorldMatrix(true,false);
  // Fix the attachment to a local patch of the chosen character's lower torso.
  // This follows crowd packing, breathing and body rotation, never a tile centre.
  if(!job.targetLocalAnchor||['anticipation','cast'].includes(job.frame?.stage)){
   const localSource=body.worldToLocal(job.cast.clone()),d=new THREE.Vector2(localSource.x,localSource.z);if(d.lengthSq()<.0001)d.set(0,1);d.normalize();
   const footprint=body.userData.bodyFootprint||{},rx=(footprint.rx||.65)/Math.max(.001,body.scale.x),rz=(footprint.rz||.44)/Math.max(.001,body.scale.z);
   const radius=1/Math.sqrt((d.x/rx)**2+(d.y/rz)**2);
   job.targetLocalAnchor=new THREE.Vector3(d.x*radius,.95,d.y*radius);
  }
  return body.localToWorld(job.targetLocalAnchor.clone());
 }
 function point(track,id,pawns,fallback){
  if(Number.isFinite(track)&&typeof routePoint==='function')return vec(routePoint(track));
  const pawn=pawns?.get?.(String(id));return pawn?.body?.position?pawn.body.position.clone():fallback?.clone?.()||new THREE.Vector3();
 }
 function makeJob(kind,effect,tracks,pawns,start,delay=0,durationOverride){
  const actorTrack=tracks.find(t=>String(t.playerId)===String(effect.actorId)),targetTrack=tracks.find(t=>String(t.playerId)===String(effect.targetId));
  const cast=point(effect.origin??actorTrack?.from,effect.actorId,pawns),target=point(kind==='hook'?actorTrack?.to:targetTrack?.landing??targetTrack?.from,effect.targetId,pawns,cast);
  const group=new THREE.Group();group.name=`Card ${kind}`;group.position.copy(['bonk','gigachad','reverse','pandora','airdrop'].includes(kind)?target:cast);root.add(group);
  const job={kind,effect:{...effect},tracks:tracks.map(t=>({...t})),pawnBody:pawns?.get?.(String(effect.actorId))?.body,targetBody:pawns?.get?.(String(effect.targetId))?.body,start:start+delay,duration:durationOverride??(!reduced&&CARD_TIMELINES[kind]?CARD_TIMELINES[kind].durationMs/1000:kind==='pandora'?1.4:1.1),group,cast,target,parts:{},materials:new Map(),rings:[],coins:[],home:new Map(),cues:new Set()};
  const material=(color,opacity=1)=>{const key=color+':'+opacity;if(!job.materials.has(key)){const m=new THREE.MeshStandardMaterial({color:C[color]||color,flatShading:true,roughness:.86,transparent:opacity<1,opacity,depthWrite:opacity===1});m.userData.baseOpacity=opacity;job.materials.set(key,m);}return job.materials.get(key);};
  const outline=new THREE.LineBasicMaterial({color:C.ink,transparent:true,opacity:.8});outline.userData.baseOpacity=.8;
  const mesh=(geo,color,parent=group,pos=[0,0,0],scale=[1,1,1],edges=true)=>{const m=new THREE.Mesh(geo,material(color));m.position.fromArray(pos);m.scale.fromArray(scale);m.castShadow=false;m.receiveShadow=false;parent.add(m);if(edges){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo,30),outline);edge.name='Ink outline';m.add(edge);}return m;};
  const box=(x,y,z,color,parent=group,pos=[0,0,0])=>mesh(new THREE.BoxGeometry(x,y,z),color,parent,pos);
  const ball=(rad,color,parent=group,pos=[0,0,0],scale=[1,1,1])=>mesh(new THREE.IcosahedronGeometry(rad,0),color,parent,pos,scale);
  const cyl=(r1,r2,height,color,parent=group,pos=[0,0,0],edges=true)=>mesh(new THREE.CylinderGeometry(r1,r2,height,10),color,parent,pos,[1,1,1],edges);
  const cone=(rad,height,color,parent=group,pos=[0,0,0])=>mesh(new THREE.ConeGeometry(rad,height,8),color,parent,pos);
  const ring=(color,rad=1,parent=group,pos=[0,.1,0])=>{const m=mesh(new THREE.TorusGeometry(rad,.045,5,28),color,parent,pos);m.rotation.x=Math.PI/2;job.rings.push(m);return m;};
  const subgroup=(name,parent=group,pos=[0,0,0])=>{const g=new THREE.Group();g.name=name;g.position.fromArray(pos);parent.add(g);job.parts[name]=g;return g;};
  const beam=(a,b,color='ink',radius=.025,parent=group)=>{const av=vec(a),bv=vec(b),delta=bv.clone().sub(av),m=cyl(radius,radius,Math.max(.001,delta.length()),color,parent);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;};
  const coin=(parent=group,pos=[0,1,0],size=.17)=>{const m=cyl(size,size,.065,'sun',parent,pos);m.rotation.x=Math.PI/2;const mark=box(.035,size*.95,.012,'ink',m,[0,.038,0]);mark.rotation.x=Math.PI/2;job.coins.push(m);return m;};
  const card=(parent=group,pos=[0,1.4,0],color='mint')=>{const g=subgroup('card-'+parent.children.length,parent,pos);box(.78,1.08,.08,'paper',g);box(.63,.63,.025,color,g,[0,.14,.055]);const gem=ball(.16,'sun',g,[0,.14,.11]);gem.scale.z=.28;box(.5,.035,.026,'ink',g,[0,-.3,.055]);return g;};
  const arrows=(parent=group,color='cobalt')=>{for(const sign of [-1,1]){const arc=mesh(new THREE.TorusGeometry(.66,.085,6,20,Math.PI*1.45),color,parent,[0,0,0]);arc.rotation.z=sign<0?Math.PI:0;const tip=cone(.22,.38,color,parent,[-.11*sign,-.65*sign,0]);tip.rotation.z=sign<0?-Math.PI/2:Math.PI/2;}};
  const shield=()=>{const shape=new THREE.Shape();shape.moveTo(0,-.94);shape.lineTo(-.77,-.28);shape.lineTo(-.88,.72);shape.lineTo(0,1);shape.lineTo(.88,.72);shape.lineTo(.77,-.28);shape.closePath();const g=subgroup('shield',group,[0,1.3,.52]);mesh(new THREE.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:false}),'emerald',g);const eye=subgroup('scanner-eye',g,[0,.15,.16]);mesh(new THREE.SphereGeometry(.46,16,8),'paper',eye,[0,0,0],[1,.5,.16],false);mesh(new THREE.SphereGeometry(.21,12,8),'ink',eye,[0,0,.08],[1,1,.25],false);mesh(new THREE.SphereGeometry(.08,8,6),'mint',eye,[.05,.05,.14],[1,1,.2],false);const scan=subgroup('scanner-line',g,[0,.65,.22]);box(1.3,.035,.025,'mint',scan);const halo=subgroup('shield-halo',group,[0,.08,0]);ring('emerald',1.05,halo);};
  const chest=(mimic=false)=>{const g=subgroup('chest',group,[0,.48,0]);box(1.34,.66,.86,'sand',g);const lid=subgroup('lid',g,[0,.33,-.43]);box(1.35,.36,.88,'cobalt',lid,[0,.13,.43]);for(const x of [-.45,.45]){box(.1,.72,.89,'sun',g,[x,.02,0]);box(.1,.37,.9,'sun',lid,[x,.13,.43]);}box(.25,.33,.12,'sun',g,[0,.17,.49]);box(.055,.11,.02,'ink',g,[0,.16,.56]);if(mimic){const mouth=subgroup('mimic-mouth',g),eyes=subgroup('mimic-eyes',lid);box(1.2,.15,.07,'ink',mouth,[0,.27,.46]);for(let i=0;i<6;i++){const tooth=cone(.07,.18,'paper',mouth,[-.48+i*.19,.3,.52]);tooth.rotation.z=Math.PI;}for(const x of [-.28,.28]){ball(.11,'paper',eyes,[x,.34,.79]);ball(.045,'ink',eyes,[x,.36,.89]);}mouth.visible=eyes.visible=false;}return g;};
  const candle=(color='mint')=>{const g=subgroup('candle');box(.68,2,.66,color,g,[0,1.2,0]);cyl(.025,.025,2.9,'ink',g,[0,1.3,0]);const head=cone(.54,.58,color,g,[0,2.67,0]);head.scale.z=.55;return g;};
  const coins=(count=3,parent=group)=>{for(let i=0;i<count;i++)coin(parent,[Math.cos(i*2.4)*.7,1+i*.2,Math.sin(i*2.4)*.5]);};
  const burst=subgroup('impact');for(let i=0;i<6;i++){const a=i*Math.PI/3;ball(.1,'sun',burst,[Math.cos(a)*.85,.14,Math.sin(a)*.85]);}burst.visible=false;
  if(!enhancements?.ownsKind(kind))switch(kind){
   case 'gamba':{
    const machine=subgroup('slot-machine',group,[0,3.3,.35]);
    box(1.65,1.75,.7,'cobalt',machine,[0,.95,0]);box(1.8,.16,.85,'paper',machine,[0,.1,0]);
    box(1.5,.9,.12,'ink',machine,[0,1.1,.4]);
    for(let i=0;i<3;i++){
     const reel=subgroup('slot-reel-'+i,machine,[-.48+i*.48,1.1,.45]);
     const drum=cyl(.32,.32,.4,'paper',reel,[0,0,0],false);drum.rotation.z=Math.PI/2;
     for(let j=0;j<4;j++){
      const a=j*Math.PI/2,color=j===0?'sun':j===1?'coral':j===2?'mint':'cobalt';
      const symbol=mesh(new THREE.SphereGeometry(.105,12,8),color,reel,[0,Math.sin(a)*.32,Math.cos(a)*.32],[1,1,.45],false);symbol.userData.slotAngle=a;
     }
    }
    const lever=subgroup('slot-lever',machine,[.94,.82,0]);cyl(.045,.045,.8,'ink',lever,[0,.4,0]);ball(.16,'coral',lever,[0,.85,0]);
    const result=subgroup('slot-result',machine,[0,1.95,.15]);for(const x of [-.4,0,.4])ball(.1,Number(effect.amount)<0?'coral':'sun',result,[x,0,0]);
    // This small floating vignette must stay legible through island foliage.
    for(const m of job.materials.values()){m.depthTest=false;m.depthWrite=false;}
    outline.depthTest=false;outline.depthWrite=false;
    let order=80;machine.traverse(o=>{if(o.isMesh||o.isLineSegments)o.renderOrder=order++;});
    result.visible=false;break;
   }
   case 'bonk':{const h=subgroup('hammer',group,[0,2.2,0]);box(.16,1.65,.18,'sand',h,[0,-.3,0]);box(1.5,.58,.65,'coral',h,[0,.45,0]);box(.25,.6,.68,'sun',h,[-.65,.45,0]);const stars=subgroup('bonk-stars',group,[0,1.5,0]);for(let i=0;i<5;i++){const star=subgroup('bonk-star-'+i,stars);const spike=cone(.17,.47,'sun',star);spike.rotation.z=Math.PI/2;cone(.17,.47,'sun',star).rotation.z=-Math.PI/2;}stars.visible=false;break;}
   case 'hook':{
    const rope=subgroup('rope'),sleeve=material('paper').clone();sleeve.side=THREE.BackSide;
    for(let i=0;i<16;i++){const cable=cyl(.10,.10,1,'paper',rope,[0,0,0],false);cable.material=sleeve;cyl(.065,.065,1,'coral',cable,[0,0,0],false);}
    // A toy horn with a soft suction nose: its origin is the contact point.
    // The horn stays outside the target's body rather than piercing it.
    const h=subgroup('hook',group,[0,1.1,0]);h.userData.projectile='unicorn-horn';
    const horn=cone(.24,.9,'paper',h,[0,0,-.48]);horn.rotation.x=Math.PI/2;
    const spiral=[];for(let i=0;i<=72;i++){const p=i/72,a=p*Math.PI*7,r=.23*(1-p)+.015;spiral.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,-.9+p*.83));}
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral),72,.035,5,false),'coral',h);
    const suction=cyl(.13,.08,.08,'mint',h,[0,0,-.025]);suction.rotation.x=Math.PI/2;
    const base=cyl(.25,.25,.12,'cobalt',h,[0,0,-.94]);base.rotation.x=Math.PI/2;
    const gun=subgroup('uni-launcher');box(.4,.31,.63,'lilac',gun,[0,0,.04]);box(.18,.35,.19,'cobalt',gun,[0,-.26,-.08]);
    const barrel=cyl(.22,.22,.31,'coral',gun,[0,0,.47]);barrel.rotation.x=Math.PI/2;
    const muzzle=cyl(.16,.16,.015,'ink',gun,[0,0,.635]);muzzle.rotation.x=Math.PI/2;
    for(const side of [-1,1]){const ear=cone(.10,.27,'paper',gun,[side*.15,.23,-.1]);ear.rotation.z=-side*.25;ball(.055,'ink',gun,[side*.215,.03,.15]);}
    const catchHalo=subgroup('horn-catch');mesh(new THREE.TorusGeometry(.29,.035,5,20),'sun',catchHalo);catchHalo.visible=false;
    break;
   }
   case 'swap':{for(const [name,color,at]of [['portal-a','cobalt',new THREE.Vector3()],['portal-b','mint',target.clone().sub(cast)]]){const portal=subgroup(name,group,at.toArray());ring(color,.95,portal);const column=subgroup(name+'-rays',portal);for(let i=0;i<6;i++){const a=i*Math.PI/3;box(.035,1.7,.035,color,column,[Math.cos(a)*.8,.9,Math.sin(a)*.8]);}}const a=subgroup('swap-arrows',group,target.clone().sub(cast).multiplyScalar(.5).add(new THREE.Vector3(0,2,0)).toArray());arrows(a);break;}
   case 'pump':{const spring=subgroup('pump-spring');const path=[];for(let i=0;i<=96;i++){const t=i/96,a=t*Math.PI*10;path.push(new THREE.Vector3(Math.cos(a)*.42,.1+t*1.35,Math.sin(a)*.42));}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),96,.055,5,false),'cobalt',spring);const pad=subgroup('pump-pad');cyl(.62,.62,.12,'mint',pad,[0,.12,0]);candle();ring('mint',.8);break;}
   case 'stonks':candle();coins(5);break;
   case 'to-the-moon':case 'pocket-rocket':{const r=subgroup('rocket',group,[0,1.6,0]);cyl(.27,.29,1.35,'paper',r);cone(.29,.52,'cobalt',r,[0,.92,0]);for(const side of [-1,1]){const fin=box(.15,.6,.57,'cobalt',r,[side*.32,-.5,0]);fin.rotation.z=-side*.3;}ball(.15,'mint',r,[0,.15,.29],[1,1,.3]);cone(.22,.7,'coral',r,[0,-.97,0]).rotation.z=Math.PI;cone(.11,.42,'sun',r,[0,-.9,0]).rotation.z=Math.PI;for(let i=0;i<4;i++)ball(.17,'paper',r,[i%2*.16,-1.15-i*.22,0]);if(kind==='to-the-moon'){const moon=subgroup('moon',group,[1.3,2.7,0]);ball(.31,'sun',moon,[0,0,0],[1,1,.35]);}else{const hit=subgroup('rocket-hit');for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ball(.2,i%2?'sun':'coral',hit,[Math.cos(a)*.4,Math.sin(a)*.4,0]);}hit.visible=false;}const trail=subgroup('rocket-trail');for(let i=0;i<8;i++)ball(.22,i%2?'paper':'sun',trail);break;}
   case 'gigachad':shield();break;
   case 'bombardiro':{
    const plane=subgroup('croc-plane',group,[0,6.4,0]);plane.scale.setScalar(1.28);const fuselage=ball(1,'mint',plane,[-.25,0,0],[1.8,.36,.5]);fuselage.material.emissive.set(C.mint);fuselage.material.emissiveIntensity=.09;box(1.3,.32,.84,'mint',plane,[1.4,-.06,0]);box(1.27,.08,.87,'paper',plane,[1.42,-.2,0]);const tail=cone(.4,1.9,'mint',plane,[-2.1,.08,0]);tail.rotation.z=Math.PI/2;tail.scale.z=.6;
    for(const z of [-.46,.46]){ball(.2,'paper',plane,[.95,.36,z]);ball(.09,'ink',plane,[1.07,.4,z*1.12]);for(let i=0;i<5;i++){const tooth=cone(.075,.16,'paper',plane,[.96+i*.24,-.14,z]);tooth.rotation.z=Math.PI;}}
    for(let i=0;i<5;i++){const scale=cone(.12,.26,'leaf',plane,[-1.15+i*.36,.38,0]);scale.rotation.z=-.15;}
    for(const sign of [-1,1]){const wing=box(1.5,.13,1.9,'cobalt',plane,[-.45,.05,sign*1.1]);wing.rotation.y=sign*.22;box(.11,.025,1.65,'sun',wing,[.22,.085,0]);const fin=box(.8,.11,.9,'mint',plane,[-1.9,.13,sign*.55]);fin.rotation.y=sign*.32;const engine=cyl(.18,.18,.65,'cobalt',plane,[.12,0,sign*1.1]);engine.rotation.z=Math.PI/2;const prop=subgroup('propeller-'+sign,plane,[.5,0,sign*1.1]);box(.07,.8,.08,'ink',prop);box(.07,.08,.8,'ink',prop);ball(.11,'sun',prop);}
    const tailFin=box(.65,.75,.12,'cobalt',plane,[-1.95,.5,0]);tailFin.rotation.z=-.22;
    const b=subgroup('bomb',group,[0,6,0]);ball(.28,'navy',b,[0,0,0],[.8,1.2,.8]);for(const z of [-1,1])box(.3,.08,.32,'coral',b,[0,.31,z*.12]);
    const shadow=subgroup('warning-shadow');const shade=new THREE.Mesh(new THREE.CircleGeometry(1,20),new THREE.MeshBasicMaterial({color:C.ink,transparent:true,opacity:.16,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));shade.rotation.x=-Math.PI/2;shade.scale.set(2.3,1,1);shade.position.y=.06;shadow.add(shade);
    const shock=ring('sun',.8);shock.visible=false;shock.name='Blast ring';const innerRing=ring('coral',.67);innerRing.visible=false;
    const fireMaterials={};const puff=(radius,color,parent,pos,scale=[1,1,1],lit=false)=>{const m=mesh(new THREE.IcosahedronGeometry(radius,1),color,parent,pos,scale,false);if(lit){fireMaterials[color]??=new THREE.MeshStandardMaterial({color:C[color],emissive:C[color],emissiveIntensity:.6,roughness:1,flatShading:true});m.material=fireMaterials[color];}return m;};
    const flash=subgroup('explosion-flash',group,[0,.65,0]);puff(.9,'sun',flash,[0,0,0],[1,.75,1],true);puff(.65,'paper',flash,[0,.15,0],[1,1,1],true);flash.visible=false;
    const bloom=subgroup('explosion-bloom',group,[0,.7,0]);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;puff(.46,i%2?'sun':'coral',bloom,[Math.cos(a)*.64,.15+Math.sin(i*1.7)*.15,Math.sin(a)*.64],[1.15,.9,1.15],true);}puff(.6,'sun',bloom,[0,.15,0],[1,1,1],true);bloom.visible=false;
    const smoke=subgroup('blast-smoke');for(let i=0;i<6;i++){const a=i*Math.PI/3;puff(.43,i%2?'paper':'sand',smoke,[Math.cos(a)*.5,.8,Math.sin(a)*.5]);}smoke.visible=false;
    const dust=subgroup('blast-dust'),debris=subgroup('blast-debris');for(let i=0;i<8;i++){const a=i*Math.PI/4;puff(.3,i%2?'paper':'sand',dust,[Math.cos(a)*.3,.15,Math.sin(a)*.3]);const shard=box(.13,.16,.1,i%2?'sand':'coral',debris,[0,.1,0]);shard.userData.angle=a;}dust.visible=debris.visible=false;break;
   }
   case 'rug-pull':{const rug=subgroup('rug',group,target.clone().sub(cast).toArray());box(1.55,.08,1.95,'coral',rug,[0,.08,0]);box(1.3,.02,1.65,'paper',rug,[0,.135,0]);box(.7,.02,.8,'cobalt',rug,[0,.16,0]).rotation.y=Math.PI/4;for(let i=0;i<5;i++)box(.045,.04,.25,'sun',rug,[-.6+i*.3,.1,1.08]);const roll=subgroup('rug-roll',rug,[0,.22,-.85]);const tube=cyl(.23,.23,1.58,'coral',roll);tube.rotation.z=Math.PI/2;const count=Math.max(0,Math.min(2,Math.abs(Number(effect.coins)||0)));for(let i=0;i<count;i++)coin(group,[0,1,0]);break;}
   case 'reverse':{const r=subgroup('reverse',group,[0,1.7,0]);box(1.45,1.95,.1,'coral',r);arrows(r,'paper');const returnArrow=subgroup('return-arrow');const shaft=cyl(.07,.07,.75,'coral',returnArrow);shaft.rotation.x=Math.PI/2;const tip=cone(.23,.4,'paper',returnArrow,[0,0,.5]);tip.rotation.x=Math.PI/2;returnArrow.visible=false;break;}
   case 'send-it':{const board=subgroup('skateboard',group,[0,.1,0]);box(.72,.12,1.4,'cobalt',board);box(.56,.025,1.15,'sun',board,[0,.08,0]);for(const x of [-.42,.42])for(const z of [-.46,.46]){const wheel=cyl(.14,.14,.13,'ink',board,[x,-.12,z]);wheel.rotation.z=Math.PI/2;}const sparks=subgroup('skate-sparks');for(let i=0;i<6;i++)ball(.09,Number(effect.amount)<0?'coral':'mint',sparks);sparks.visible=false;break;}
   case 'trade-offer':{const contract=card(group,[0,1.65,0],'lilac');contract.name='Trade contract';job.parts['trade-card']=contract;const payment=subgroup('trade-payment');coin(payment,[0,0,0],.23);break;}
   case 'airdrop':{const drop=subgroup('drop',group,[0,2,0]);box(.65,.57,.62,'sand',drop);box(.1,.59,.64,'sun',drop);const canopy=mesh(new THREE.SphereGeometry(.86,12,6,0,Math.PI*2,0,Math.PI/2),'mint',drop,[0,1.2,0],[1,.65,1]);canopy.material.side=THREE.DoubleSide;for(const x of [-.55,.55])for(const z of [-.5,.5])beam({x,y:1.2,z},{x:x*.45,y:.25,z:z*.45},'ink',.015,drop);coins(3);break;}
   case 'pandora':case 'mimic':{chest(kind==='mimic'||effect.eventId==='mimic');const glow=ring(effect.polarity==='bad'||BAD.has(effect.eventId)?'coral':'mint',1.05);glow.visible=false;if(['stonks','jackpot','not-stonks','rekt'].includes(effect.eventId))coins(effect.eventId==='jackpot'?7:3);if(effect.eventId==='free-mint')card(group,[0,1.8,0]);if(effect.eventId==='wormhole')ring('cobalt',1.2);if(['stonks','not-stonks','rekt'].includes(effect.eventId)){const ch=candle(effect.eventId==='stonks'?'mint':'coral');ch.scale.setScalar(.58);ch.position.set(0,effect.eventId==='stonks'?.9:2.6,0);if(effect.eventId!=='stonks')ch.rotation.z=Math.PI;ch.visible=false;}if(effect.eventId==='paper-hands'){const a=card(group,[-.2,1.7,0]);a.rotation.z=-.2;const b=card(group,[.2,1.7,0]);b.rotation.z=.2;}for(const coin of job.coins)coin.visible=false;for(const [key,p]of Object.entries(job.parts))if(key.startsWith('card-'))p.visible=false;break;}
   case 'free-mint':card(group,[0,1.8,0]);break;
   case 'wormhole':ring('lilac',1.2);ring('cobalt',.85);break;
   case 'jackpot':{const slot=subgroup('slot',group,[0,1,0]);box(1.7,1.7,.7,'sun',slot);box(1.42,.56,.04,'paper',slot,[0,.1,.38]);for(let i=0;i<3;i++){box(.25,.06,.03,'ink',slot,[-.45+i*.45,.24,.42]);beam({x:-.32+i*.45,y:.24,z:.42},{x:-.47+i*.45,y:-.1,z:.42},'ink',.035,slot);}coins(7);break;}
   case 'not-stonks':case 'rekt':{const c=candle('coral');c.rotation.z=Math.PI; c.position.y=2.7;coins(kind==='rekt'?5:4);break;}
   case 'paper-hands':{const a=card(group,[-.28,1.5,0]);a.rotation.z=-.3;const b=card(group,[.28,1.5,0]);b.rotation.z=.3;for(const side of [-1,1]){const h=box(.35,.48,.12,'paper',group,[side*.85,1.5,.12]);h.rotation.z=side*.45;for(let i=0;i<3;i++)box(.07,.3,.1,'paper',group,[side*.75+i*.07,1.8,.12]);}break;}
  }
  enhancements?.create(job,{subgroup,mesh,box,ball,cyl,cone,ring,beam,card,coin,coins,chest,candle,material,outline,routePoint});
  if(enhancements&&kind==='pocket-rocket'){
   const bodyOrigin=job.targetBody?.getWorldPosition(new THREE.Vector3())||job.target;
   job.rocketHitAnchor=hornAnchor(job).sub(bodyOrigin).add(job.target).sub(group.position);
  }
  group.traverse(o=>{job.home.set(o,{position:o.position.clone(),rotation:o.rotation.clone(),scale:o.scale.clone()});});
  while(jobs.length>=10)dispose(jobs.shift());jobs.push(job);totals.spawned++;totals.peak=Math.max(totals.peak,jobs.length);return job;
 }
 function animate(job,time){
  enhancements?.beforeAnimate?.(job);
  const t=clamp((time-job.start)/job.duration),u=reduced?.55:t,{parts,group,kind,effect}=job;
  group.visible=time>=job.start;if(!group.visible)return;
  const cinema=!!CARD_TIMELINES[kind],actualAge=Math.max(0,time-job.start),age=actualAge/presentationTimeScale,timeline=authoredTimelines[kind],frameAge=cinema?actualAge*CARD_TIMELINES[kind].durationMs/(job.duration*1000):actualAge;job.frame=cinema?cardMotionFrame(kind,frameAge,{reduced}):null;job.presentationTimeScale=presentationTimeScale;
  const ms=reduced?(timeline?.durationMs||1000)*.68:frameAge*1000/presentationTimeScale;
  const phase=(a,b)=>smooth(clamp((ms-a)/Math.max(1,b-a)));
  const action=timeline?phase(timeline.releaseMs,timeline.impactMs):u,travel=timeline?phase(timeline.impactMs,timeline.arriveMs):u,recover=timeline?phase(timeline.arriveMs,timeline.durationMs):u;
  const relative=(body,fallback)=>{const p=!reduced&&body?body.getWorldPosition(new THREE.Vector3()):fallback.clone();return p.sub(group.position);};
  const actor=()=>relative(job.pawnBody,job.cast),victim=()=>relative(job.targetBody,job.target);
  const actorTrack=job.tracks.find(track=>String(track.playerId)===String(effect.actorId));
  const trailPoint=lag=>{if(!actorTrack||typeof routePoint!=='function')return actor();const sample=sampleCardMotion(actorTrack,Math.max(0,frameAge-lag*presentationTimeScale),{effect},{reduced});if(!sample)return actor();const p=vec(routePoint(sample.pos));p.y+=sample.dy||0;return p.sub(group.position);};
  const pop=reduced||cinema?reduced?1:clamp((1-t)/.055):Math.min(easeOut(t/.14),clamp((1-t)/.2));group.scale.setScalar(pop);
  for(const [o,home]of job.home){if(o===group)continue;o.position.copy(home.position);o.rotation.copy(home.rotation);o.scale.copy(home.scale);}
  const burst=parts.impact;if(burst){burst.visible=!reduced&&!cinema&&u>.38&&u<.75;burst.scale.setScalar(.45+smooth((u-.38)/.37)*1.4);}
  const emit=(name,at)=>{if(cinema)at*=job.duration*1000/timeline.durationMs;if(!reduced&&actualAge>=at&&!job.cues.has(name)){job.cues.add(name);const late=actualAge-at,continuous=name==='pandora-bitconnect';if(late<(continuous?3.62:.22))onCue(name,{cardId:kind,actorId:effect.actorId,targetId:effect.targetId,...(continuous?{offsetMs:late*1000}:{}),...(enhancements?{coins:effect.coins,cardsDelta:effect.cardsDelta,amount:effect.amount,blocked:effect.blocked}:{} )});}};
  const orbitCoins=(mode='gain')=>{job.coins.forEach((o,i)=>{const a=i*2.4,phase=clamp((u-.28)/.65);if(reduced){o.position.set(Math.cos(a)*.8,1+i*.13,Math.sin(a)*.5);return;}o.position.set(Math.cos(a)*Math.sin(phase*Math.PI)*1.2,(mode==='loss'?1-phase:Math.sin(phase*Math.PI))*1.7+.3,Math.sin(a)*Math.sin(phase*Math.PI)*1.2);o.rotation.y=phase*Math.PI*2;});};
  if(!enhancements?.ownsKind(kind))switch(kind){
   case 'bonk':{const wind=phase(0,timeline.releaseMs),hit=ms>=timeline.impactMs;parts.hammer.position.copy(victim()).add(new THREE.Vector3(.45,2.35+wind*.35-action*.85+recover*.8,0));parts.hammer.rotation.z=reduced?.5:-.8-wind*.65+action*2.2-recover*.8;parts.hammer.visible=reduced||recover<.9;parts['bonk-stars'].position.copy(victim()).y+=1.55;parts['bonk-stars'].visible=!reduced&&hit&&recover<.9;for(const [i,star]of parts['bonk-stars'].children.entries()){const a=i*Math.PI*2/5+travel*1.8,r=.45+travel*.8;star.position.set(Math.cos(a)*r,.2+Math.sin(travel*Math.PI)*.6,Math.sin(a)*r);star.rotation.z=a;}burst.visible=!reduced&&hit&&ms<timeline.impactMs+220;burst.position.copy(victim()).y+=1.3;burst.scale.setScalar(.4+phase(timeline.impactMs,timeline.impactMs+220)*1.1);emit('bonk-hit',timeline.impactMs/1000);break;}
   case 'hook':{
    const frame=job.frame,track=job.tracks.find(t=>String(t.playerId)===String(effect.actorId)),from=job.cast.clone(),anchor=hornAnchor(job),end=anchor.clone().sub(from);job.attachmentWorld=anchor;
    const wrist=job.pawnBody?.getObjectByName?.('Left wrist'),actor=wrist?wrist.getWorldPosition(new THREE.Vector3()).sub(from):track&&typeof routePoint==='function'?vec(routePoint(track.from+(track.to-track.from)*frame.progress)).sub(from).add(new THREE.Vector3(0,1.08,0)):new THREE.Vector3(0,1.08,0);
    const direction=end.clone().sub(actor).normalize();parts['uni-launcher'].position.copy(actor);parts['uni-launcher'].quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);
    const muzzle=actor.clone().addScaledVector(direction,.66),start=job.launchOrigin||(job.launchOrigin=muzzle.clone()),f=reduced?1:smooth(frame.cast??1),hook=start.clone().lerp(end,f);if(!reduced&&frame.stage==='cast')hook.y+=Math.sin(f*Math.PI)*Math.min(1.8,Math.max(1.15,end.length()*.16));
    if(!reduced&&frame.stage==='anticipation')hook.copy(muzzle).addScaledVector(direction,.9);
    if(reduced||['tension','pull','brake','retract','settled'].includes(frame.stage))hook.copy(end);
    if(!reduced&&['brake','retract'].includes(frame.stage))hook.lerp(muzzle,smooth(frame.retract));
    parts.hook.position.copy(hook);parts.hook.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),end.clone().sub(muzzle).normalize());
    parts['horn-catch'].position.copy(end);parts['horn-catch'].quaternion.copy(parts.hook.quaternion);parts['horn-catch'].visible=!reduced&&frame.stage==='tension';parts['horn-catch'].scale.setScalar(.8+Math.sin((frame.tension||0)*Math.PI)*.5);
    parts.rope.visible=reduced||age>=CARD_TIMELINES.hook.releaseMs/1000;parts.hook.visible=reduced||age<CARD_TIMELINES.hook.retractMs/1000;
    const tension=reduced||['tension','pull'].includes(frame.stage),sag=reduced?.08:frame.stage==='cast'?.28:tension?.035:(1-frame.retract)*.16;
    const tail=hook.clone().add(new THREE.Vector3(0,0,-.97).applyQuaternion(parts.hook.quaternion));
    const count=parts.rope.children.length;for(let i=0;i<count;i++){const a=i/count,b=(i+1)/count,pa=muzzle.clone().lerp(tail,a),pb=muzzle.clone().lerp(tail,b);pa.y-=Math.sin(a*Math.PI)*sag;pb.y-=Math.sin(b*Math.PI)*sag;const segment=parts.rope.children[i],delta=pb.clone().sub(pa);segment.position.copy(pa).add(pb).multiplyScalar(.5);segment.scale.y=Math.max(.001,delta.length());segment.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}
    emit('hook-cast',CARD_TIMELINES.hook.releaseMs/1000);emit('hook-catch',CARD_TIMELINES.hook.catchMs/1000);emit('hook-pull',CARD_TIMELINES.hook.pullMs/1000);break;
   }
   case 'swap':{for(const name of ['portal-a','portal-b']){const p=parts[name],open=reduced?1:phase(0,timeline.releaseMs)*(1-recover);p.scale.setScalar(Math.max(.01,open));p.children[0].rotation.z=reduced?0:frameAge*(name==='portal-a'?2:-2);const rays=parts[name+'-rays'];rays.scale.y=.25+Math.sin(action*Math.PI)*1.4; rays.visible=reduced||recover<.8;}parts['swap-arrows'].rotation.z=reduced?0:action*Math.PI;parts['swap-arrows'].scale.setScalar(reduced?1:.5+Math.sin(action*Math.PI)*.5);emit('swap-transfer',timeline.impactMs/1000);break;}
   case 'pump':{const launched=ms>=timeline.impactMs;parts['pump-spring'].scale.y=reduced?.6:launched?Math.max(.03,(1-travel)*1.35):1-action*.82;parts['pump-pad'].position.copy(launched?actor():new THREE.Vector3(0,.7-action*.55,0));parts.candle.position.set(-.95,0,0);parts.candle.scale.set(.4,reduced?.7:launched?.15+travel*.8:.1,.4);job.rings[0].scale.setScalar(.4+travel*1.5);job.rings[0].visible=!reduced&&launched&&recover<.2;emit('pump-launch',timeline.impactMs/1000);break;}
   case 'stonks':parts.candle.scale.y=reduced?1:.05+easeOut(u/.45)*.95;orbitCoins();break;
   case 'to-the-moon':{const flying=ms>=timeline.impactMs&&ms<timeline.arriveMs;parts.rocket.position.copy(actor()).add(new THREE.Vector3(.45,.5,.65));parts.rocket.scale.setScalar(.82);parts.rocket.rotation.z=reduced?-.12:-.15+Math.sin(travel*Math.PI)*.25;parts.rocket.visible=reduced||recover<.65;parts.moon.position.copy(actor()).add(new THREE.Vector3(1.1,2.2,0));parts['rocket-trail'].visible=!reduced&&flying;for(const [i,puff]of parts['rocket-trail'].children.entries()){puff.position.copy(trailPoint((i+1)*.045)).add(new THREE.Vector3(.45,-.65-i*.06,.65));puff.scale.setScalar((1-i/10)*(reduced?.7:.7+Math.sin(frameAge*21+i)*.15));}emit('moon-ignite',timeline.releaseMs/1000);emit('moon-land',timeline.arriveMs/1000);break;}
   case 'pocket-rocket':{
    const start=actor().add(new THREE.Vector3(.35,1.05,.35)),liveTarget=hornAnchor(job).sub(group.position);
    if(!job.rocketHitAnchor||ms<timeline.impactMs)job.rocketHitAnchor=liveTarget.clone();
    const end=job.rocketHitAnchor,flight=reduced?1:phase(timeline.releaseMs,timeline.impactMs),flying=!reduced&&ms>=timeline.releaseMs&&ms<timeline.impactMs,hit=ms>=timeline.impactMs;
    parts.rocket.position.copy(start).lerp(end,flight);parts.rocket.position.y+=Math.sin(flight*Math.PI)*1.25;parts.rocket.scale.setScalar(.72);parts.rocket.visible=reduced||!hit;
    const direction=end.clone().sub(start);direction.y+=Math.cos(flight*Math.PI)*1.25*Math.PI;if(direction.lengthSq()>.001)parts.rocket.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    parts['rocket-trail'].visible=flying;for(const [i,puff]of parts['rocket-trail'].children.entries()){const f=Math.max(0,flight-(i+1)*.055);puff.position.copy(start).lerp(end,f);puff.position.y+=Math.sin(f*Math.PI)*1.25;puff.scale.setScalar((1-i/10)*.55);}
    const hitAge=clamp((ms-timeline.impactMs)/360);parts['rocket-hit'].visible=!reduced&&hit&&hitAge<1;parts['rocket-hit'].position.copy(end);parts['rocket-hit'].scale.setScalar(Math.max(.01,Math.sin(hitAge*Math.PI)*1.8));
    burst.visible=!reduced&&hit&&ms<timeline.impactMs+450;burst.position.copy(end);burst.scale.setScalar(.4+phase(timeline.impactMs,timeline.impactMs+450)*1.1);
    emit('pocket-rocket-launch',timeline.releaseMs/1000);emit('pocket-rocket-impact',timeline.impactMs/1000);break;
   }
   case 'gigachad':{const owner=effect.blocked?victim():actor(),deploy=reduced?1:phase(0,timeline.impactMs);parts.shield.position.copy(owner).add(new THREE.Vector3(0,1.25,.6));parts.shield.scale.setScalar(Math.max(.03,deploy*(1-recover*.3)));parts.shield.rotation.y=reduced?0:-.7*(1-deploy);parts['scanner-line'].position.y=reduced?0:.65-travel*1.25;parts['scanner-eye'].scale.y=reduced?1:.35+deploy*.65;parts['shield-halo'].position.copy(owner);parts['shield-halo'].scale.setScalar(reduced?1:.8+Math.sin(travel*Math.PI)*.35);emit('shield-deploy',timeline.impactMs/1000);break;}
   case 'bombardiro':{
    const rate=motionApi.BOMBARDIRO_PLAYBACK_RATE??1,frame=job.frame,plane=parts['croc-plane'],drop=frame.drop??1,impact=timeline.impactMs/1000,after=Math.max(0,age-impact)*rate,impactU=clamp(after/.8);
    plane.position.set(reduced?0:-4.6+t*9.2,6.4+(reduced?0:Math.sin(t*Math.PI)*.3),0);plane.rotation.x=reduced?-.08:Math.sin(t*Math.PI*2)*.12;plane.rotation.z=reduced?-.025:-.035+Math.sin(t*Math.PI)*.035;
    for(const sign of [-1,1])parts['propeller-'+sign].rotation.x=reduced?Math.PI/4:age*rate*35;
    const releaseX=-4.6+CARD_TIMELINES.bombardiro.dropMs/CARD_TIMELINES.bombardiro.durationMs*9.2;
    parts.bomb.visible=!reduced&&age<impact;parts.bomb.position.set(age<CARD_TIMELINES.bombardiro.dropMs/1000?plane.position.x:releaseX*(1-drop),age<CARD_TIMELINES.bombardiro.dropMs/1000?plane.position.y-.45:6.15-drop*drop*5.9,0);parts.bomb.rotation.z=reduced?0:drop*.24;
    parts['warning-shadow'].position.x=reduced?0:plane.position.x;parts['warning-shadow'].scale.setScalar(reduced?1:.75+Math.sin(t*Math.PI)*.25);parts['warning-shadow'].visible=reduced||age<impact+.1;
    parts['explosion-flash'].visible=!reduced&&after>0&&after<.13;parts['explosion-flash'].scale.setScalar(.6+clamp(after/.13)*1.4);
    parts['explosion-bloom'].visible=!reduced&&after>0&&after<.54;parts['explosion-bloom'].scale.setScalar(Math.max(.01,Math.sin(clamp(after/.54)*Math.PI)*1.6));
    parts['blast-smoke'].visible=!reduced&&after>.07&&after<.95;parts['blast-smoke'].children.forEach((o,i)=>{const a=i*Math.PI/3,phase=clamp(after/.95),r=.45+phase*1.6;o.position.set(Math.cos(a)*r,.65+phase*1.25+Math.sin(i)*.13,Math.sin(a)*r);o.scale.setScalar(Math.max(.01,Math.sin(phase*Math.PI)*1.4));});
    for(const [i,r]of job.rings.entries()){r.visible=reduced||after>0;r.scale.setScalar(reduced?1:.6+smooth(impactU)*(i?2.35:3.05));}
    parts['blast-dust'].visible=parts['blast-debris'].visible=!reduced&&after>0&&after<1.05;
    parts['blast-dust'].children.forEach((o,i)=>{const a=i*Math.PI/4,r=.5+impactU*2.1;o.position.set(Math.cos(a)*r,.2+Math.sin(impactU*Math.PI)*.5,Math.sin(a)*r);o.scale.setScalar(Math.max(.01,Math.sin(impactU*Math.PI)*1.45));});
    parts['blast-debris'].children.forEach((o,i)=>{const a=i*Math.PI/4,r=after*(1.8+i%3*.25);o.position.set(Math.cos(a)*r,Math.max(.12,.15+after*(2.5+i%2*.4)-after*after*3.4),Math.sin(a)*r);o.rotation.set(after*3+i,after*4,after*2);o.scale.setScalar(Math.max(.01,1-after));});
    emit('bombardiro-warning',.05/rate);emit('bombardiro-drop',CARD_TIMELINES.bombardiro.dropMs/1000);emit('bombardiro-impact',impact);break;
   }
   case 'rug-pull':{const from=victim(),to=actor();parts.rug.position.copy(from).lerp(to,reduced?.35:travel*.75);parts.rug.scale.z=reduced?.7:ms<timeline.impactMs?.12+action*.88:Math.max(.15,1-travel*.8);parts.rug.position.y+=Math.sin(travel*Math.PI)*.3;parts['rug-roll'].rotation.x=travel*Math.PI*3;for(const [i,coin]of job.coins.entries()){const p=reduced?.5:clamp((travel-i*.07)/.85);coin.visible=reduced||ms>=timeline.impactMs;coin.position.copy(from).lerp(to,p);coin.position.y+=.7+Math.sin(p*Math.PI)*1.2;coin.position.z+=(i-.5)*.25;coin.rotation.y=p*Math.PI*2;}emit('rug-pull',timeline.impactMs/1000);break;}
   case 'reverse':{parts.reverse.position.copy(actor()).add(new THREE.Vector3(0,1.6,.4));parts.reverse.rotation.y=reduced?0:Math.PI*(1-action);parts.reverse.rotation.z=reduced?-.12:Math.sin(action*Math.PI)*.2;const arrow=parts['return-arrow'],from=actor().add(new THREE.Vector3(0,1.1,0)),to=victim().add(new THREE.Vector3(0,1.1,0));arrow.visible=reduced||ms>=timeline.impactMs;arrow.position.copy(from).lerp(to,reduced?.5:travel);arrow.position.y+=Math.sin(travel*Math.PI)*.7;const dir=to.sub(from);if(dir.lengthSq()>.001)arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir.normalize());emit('reverse-return',timeline.impactMs/1000);break;}
   case 'gamba':{
    const win=Number(effect.amount)>0,stopped=ms>=timeline.impactMs;
    parts['slot-lever'].rotation.x=reduced?0:-Math.sin(Math.min(1,ms/600)*Math.PI)*.85;
    for(let i=0;i<3;i++){
     const reel=parts['slot-reel-'+i],stopAt=timeline.impactMs-320+i*160;
     const spin=phase(timeline.releaseMs,stopAt),settled=win?0:(i+1)*Math.PI/2;
     reel.rotation.x=reduced?settled:(1-(1-spin)**3)*(Math.PI*2*(5+i)+settled);
     for(const symbol of reel.children)if(symbol.userData.slotAngle!==undefined)symbol.visible=Math.cos(symbol.userData.slotAngle-reel.rotation.x)>.5;
    }
    parts['slot-result'].visible=reduced||stopped;
    parts['slot-result'].scale.setScalar(reduced?1:1+Math.sin(Math.max(0,ms-timeline.impactMs)/100)*.08);
    emit('gamba-spin',timeline.releaseMs/1000);emit(win?'gamba-win':'gamba-loss',timeline.impactMs/1000);
    break;
   }
   case 'send-it':{const failed=Number(effect.amount)<0,board=parts.skateboard;board.position.copy(actor());board.position.y+=.05;board.rotation.z=reduced?0:travel>0&&travel<1?Math.sin(travel*Math.PI)*(failed?Math.PI*2:-Math.PI*2):recover*(failed?.4:0);board.rotation.y=reduced?0:Math.sin(travel*Math.PI)*.5;parts['skate-sparks'].visible=!reduced&&ms>=timeline.arriveMs;parts['skate-sparks'].position.copy(actor());for(const [i,puff]of parts['skate-sparks'].children.entries()){const a=i*Math.PI/3;puff.position.set(Math.cos(a)*(.3+recover*.8),.15+Math.sin(recover*Math.PI)*.35,Math.sin(a)*(.3+recover*.8));puff.scale.setScalar(Math.max(.02,1-recover));}emit('send-it-jump',timeline.impactMs/1000);emit(failed?'send-it-fail':'send-it-land',timeline.arriveMs/1000);break;}
   case 'trade-offer':{const from=victim(),to=actor(),p=reduced?.5:travel,contract=parts['trade-card'];contract.position.copy(from).lerp(to,p);contract.position.y+=1.35+Math.sin(p*Math.PI)*.6;contract.rotation.y=reduced?.2:p*Math.PI*2;contract.scale.setScalar(.8);const payment=parts['trade-payment'];payment.visible=(Number(effect.coins)>0)&&(reduced||ms>=timeline.impactMs);payment.position.copy(from);payment.position.y+=reduced?1.2:2.6-p*1.8;payment.rotation.y=reduced?0:p*Math.PI*2;emit('trade-receive',timeline.arriveMs/1000);break;}
   case 'airdrop':parts.drop.position.y=reduced?1.4:3-smooth(u/.65)*2.5;orbitCoins();break;
   case 'pandora':case 'mimic':{const reveal=reduced||u>.36,opening=reduced?.55:smooth((u-.2)/.25);parts.lid.rotation.x=-opening*1.05;parts.chest.rotation.z=reduced?0:u<.2?Math.sin(u*50)*.025:0;for(const key of ['mimic-mouth','mimic-eyes'])if(parts[key])parts[key].visible=reveal;const lidMat=parts.lid.children.find(o=>o.isMesh)?.material;lidMat?.color.set(reveal&&(kind==='mimic'||effect.eventId==='mimic')?C.coral:C.cobalt);for(const r of job.rings){r.visible=reveal;r.scale.setScalar(reduced?1:.7+smooth((u-.35)/.5)*.6);}for(const [key,p]of Object.entries(parts))if(key.startsWith('card-')){p.visible=reveal;p.position.y+=reduced?0:smooth((u-.35)/.5)*.5;}if(parts.candle){parts.candle.visible=reveal;parts.candle.scale.multiplyScalar(reduced?1:.4+smooth((u-.35)/.5)*.6);}for(const coin of job.coins)coin.visible=reveal;orbitCoins(BAD.has(effect.eventId)?'loss':'gain');break;}
   case 'free-mint':for(const [key,p]of Object.entries(parts))if(key.startsWith('card-')){p.rotation.y=reduced?0:u*Math.PI*1.5;p.position.y=reduced?1.5:1+Math.sin(u*Math.PI)*.9;}break;
   case 'wormhole':for(let i=0;i<job.rings.length;i++){job.rings[i].rotation.z=reduced?0:u*Math.PI*(i?1:-1);job.rings[i].scale.setScalar(reduced?1:.7+Math.sin(u*Math.PI)*.4);}break;
   case 'jackpot':orbitCoins();break;
   case 'not-stonks':case 'rekt':parts.candle.position.y=reduced?2.7:3.5-smooth(u/.6)*1.3;orbitCoins('loss');break;
   case 'paper-hands':for(const [key,p]of Object.entries(parts))if(key.startsWith('card-'))p.position.x*=reduced?1:1+smooth(u)*2;break;
  }
  enhancements?.animate(job,{age,ms,t,u,frame:job.frame,timeline,actor:actor(),victim:victim(),phase,emit,reduced,routePoint});
 }
 function sync(state,pawns,elapsed=now){
  if(destroyed)return;now=Number.isFinite(elapsed)?elapsed:now;
  if(matchId!==state.matchId){clear();matchId=state.matchId;lastMotion=null;lastCue=null;}
  if(state.rulesVersion&&!['local-cards-v7','local-cards-v8','local-cards-v9','local-cards-v10','local-cards-v11','local-cards-v12'].includes(state.rulesVersion)){clear();return;}
  const motion=state.motion,ownCue=state.cue||state.presentationCue;
  let effect,tracks=[],age=0,delay=0;
  if(motion?.serial!==undefined&&motion.serial!==lastMotion){lastMotion=motion.serial;effect=motion.effect;tracks=motion.tracks||[];age=Math.max(0,Number(state.motionAge)||0)/1000;if(ownCue?.serial!==undefined)lastCue=ownCue.serial;else if(effect?.serial!==undefined)lastCue=effect.serial;delay=Math.max(0,...tracks.map(track=>walkDurationMs(track)))/1000;}
  else if(ownCue?.serial!==undefined&&ownCue.serial!==lastCue){effect=ownCue;lastCue=ownCue.serial;}
  else return;
  if(!effect||effect.pending||state.snapMotion)return;
  if(enhancements&&!effect.cardId)effect={...effect,origin:effect.origin??tracks.find(t=>String(t.playerId)===String(effect.actorId))?.landing};
  const kind=enhancements?motionApi.kindOf({effect}):effect.blocked?'gigachad':effect.reflected?'reverse':effect.eventId==='bombardiro'?'bombardiro':effect.cardId||(effect.eventId?'pandora':effect.kind);
  if(!TYPES.has(kind)&&!enhancements?.ownsKind(kind))return;
  const duration=!reduced&&(effect.blocked||effect.reflected)?Math.max(.12,(Number(motion?.durationMs)||(effect.blocked?900:1250))/1000-delay):!reduced&&CARD_TIMELINES[kind]?CARD_TIMELINES[kind].durationMs/1000:kind==='pandora'?1.4:1.1;
  if(age>delay+duration){totals.skippedOld++;return;}
  const job=makeJob(kind,effect,tracks,pawns,now-age,delay,duration);animate(job,now);
 }
 function update(elapsed){if(destroyed)return;now=Number.isFinite(elapsed)?elapsed:now;for(let i=jobs.length-1;i>=0;i--){const job=jobs[i];if(now>=job.start+job.duration){jobs.splice(i,1);dispose(job);}else animate(job,now);}}
 function sample(track,age,duration,fallback){
  if(destroyed)return fallback;
  const kind=track.localCardId||track.cardId;if(!CARD_TIMELINES[kind])return fallback;
  const job=[...jobs].reverse().find(j=>j.kind===kind&&j.tracks.some(t=>String(t.playerId)===String(track.playerId)&&t.from===track.from&&t.to===track.to));
  if(!job)return fallback;
  return sampleCardMotion(track,age,{effect:job.effect,tracks:job.tracks,durationMs:duration},{reduced})??fallback;
 }
 function decorate(pawn,sample,time=now){
  enhancements?.decorate(pawn,sample,[...jobs].reverse(),time,reduced);
  if(reduced||!sample?.cardId||!CARD_TIMELINES[sample.cardId])return;
  const body=pawn.body;body.rotation.x+=sample.lean||0;body.scale.x*=sample.scaleX||1;body.scale.y*=sample.scaleY||1;
  const limbs=body.getObjectByName('Fine ink limbs');for(const leg of limbs?.children.filter(o=>/leg/.test(o.name))||[])leg.rotation.x=-(sample.feet||0);
  if(sample.cardId!=='hook'||Math.abs(sample.arm||0)<.01)return;
  const job=[...jobs].reverse().find(j=>j.kind==='hook'&&String(j.effect.actorId)===String(pawn.player.id));
  if(job){const delta=job.target.clone().sub(body.position);if(delta.x*delta.x+delta.z*delta.z>.05){const facing=Math.atan2(delta.x,delta.z),turn=Math.atan2(Math.sin(facing-body.rotation.y),Math.cos(facing-body.rotation.y)),mix=sample.stage==='pull'?1-sample.progress:['anticipation','cast','tension'].includes(sample.stage)?1:0;body.rotation.y+=turn*mix;}}
  const side='Left',rig=body.getObjectByName(side+' gesture arm');if(!rig||rig.userData.held)return;
  const wrist=rig.getObjectByName(side+' wrist'),posed=rig.getObjectByName('Posed ink arm');if(!wrist||!posed)return;
  const mix=clamp(Math.abs(sample.arm)),rest=new THREE.Vector3().fromArray(rig.userData.restHand),end=rest.clone().lerp(new THREE.Vector3(-.18,.05,sample.arm<0?-.46:.68),mix),elbow=end.clone().multiplyScalar(.5);elbow.x-=.13*mix;elbow.z-=.08*mix;
  posed.visible=true;rig.getObjectByName(side+' thin arm').visible=false;
  for(const [i,a,b]of [[0,new THREE.Vector3(),elbow],[1,elbow,end]]){const segment=posed.getObjectByName('Arm segment '+i),delta=b.clone().sub(a);segment.position.copy(a).add(b).multiplyScalar(.5);segment.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());segment.scale.y=delta.length();}
  posed.getObjectByName('Soft elbow').position.copy(elbow);wrist.position.copy(end);wrist.rotation.set(-.18,-.1,-.12*mix);wrist.getObjectByName('Resting palm').visible=false;const palm=wrist.getObjectByName('Gesture palm');palm.visible=true;
  for(let i=0;i<4;i++){const finger=palm.getObjectByName('Gesture finger '+i);finger.position.y=.06;finger.scale.y=.035;}
 }
 function legacyState(state){
  const effect=state.motion?.effect;
  if(enhancements&&effect&&!effect.pending&&CARD_TIMELINES[motionApi.kindOf({effect})])return {...state,motion:state.motion?{...state.motion,effect:{kind:'trail',pending:true},tracks:state.motion.tracks.map(t=>({...t,type:'trail',to:t.landing??t.from,cardId:null}))}:null};
  return CARD_TIMELINES[effect?.cardId]&&!effect.pending&&!effect.blocked&&!effect.reflected?{...state,motion:null}:state;
 }
 function destroy(){if(destroyed)return;clear();enhancements?.destroy?.();root.removeFromParent();destroyed=true;}
 function debug(){return {presentationOnly:true,reduced,destroyed,...totals,active:jobs.length,jobs:jobs.map(j=>({kind:j.kind,projectedHead:j.projectedHead??null,start:j.start,duration:j.duration,age:Math.max(0,now-j.start),stage:j.frame?.stage??null,progress:j.frame?.progress??null,visible:j.group.visible,cast:j.cast.toArray(),target:j.target.toArray(),...(j.kind==='hook'?{attachment:{playerId:j.effect.targetId,source:j.targetBody?'character-torso':'missing-character-fallback',world:j.attachmentWorld?.toArray()??null,local:j.targetLocalAnchor?.toArray()??null}}:{}),cues:[...j.cues],parts:Object.fromEntries(Object.entries(j.parts).map(([name,g])=>[name,{world:g.getWorldPosition(new THREE.Vector3()).toArray(),rotation:g.rotation.toArray().slice(0,3),scale:g.scale.toArray(),visible:g.visible}])),...(j.kind==='bombardiro'?{impactMs:CARD_TIMELINES.bombardiro.impactMs}:{} )}))};}
 return {sync,update,sample,decorate,legacyState,destroy,debug,placeHeadScenes(camera,viewport,slots){enhancements?.placeHeadScenes?.(jobs,camera,viewport,slots);}};
}
