import * as THREE from 'three';
import {loadSeaModels} from './world-sea-models.js';
import {seaEncounter,seaSwimPose,seaGullFlight,seaLifeRoute,seaPointInsideLand,seaObstacleClearance} from './sea-encounters.js';
import {nearestCoast} from './coast-layout.js';
export {seaLifeRoute,seaPointInsideLand,seaObstacleClearance,seaLifeSchedule} from './sea-encounters.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function buildSeaLife({seaY=-3.75,compact=false,reducedMotion=false,staticObstacles=[],seed=(globalThis.crypto?.getRandomValues(new Uint32Array(1))[0]??Date.now())>>>0,modelLoader=typeof window==='undefined'?async()=>null:loadSeaModels}={}){
 const root=new THREE.Group();root.name='Open ocean encounters';
 const specs=[['whale','whale',7.8],['dolphin','dolphin',3.7],['shark','shark',5.4],['ray','manta',5.8]];
 const animals=new Map(specs.map(([kind,asset,length])=>{const g=new THREE.Group();g.name={whale:'Quiet passing whale',dolphin:'Dolphins crossing open water',shark:'A distant shark fin',ray:'Ray beneath the surface'}[kind];g.visible=false;root.add(g);return[kind,{g,asset,length,models:[]}];}));
 const schools=Array.from({length:compact?1:2},(_,index)=>{const g=new THREE.Group();g.name='Roaming fish school';root.add(g);g.visible=false;return{g,index,models:[]};});
 const waterMaterial=new THREE.MeshBasicMaterial({color:'#d8f1ed',transparent:true,opacity:.55,depthWrite:false});
 const spout=new THREE.InstancedMesh(new THREE.SphereGeometry(.065,5,4),waterMaterial,compact?9:16);spout.name='Whale breath droplets';spout.visible=false;spout.frustumCulled=false;animals.get('whale').g.add(spout);
 const rippleMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:{value:0},uOpacity:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float uTime;uniform float uOpacity;void main(){float r=length(vUv-.5)*2.;float a=exp(-pow((r-.78)/.035,2.))*.08+exp(-pow((r-.93)/.025,2.))*.04;gl_FragColor=vec4(.79,.94,.91,a*uOpacity*(.8+.2*sin(uTime)));}'});
 const ripple=new THREE.Mesh(new THREE.PlaneGeometry(10,10),rippleMaterial);ripple.rotation.x=-Math.PI/2;ripple.name='Whale surface wake';ripple.visible=false;root.add(ripple);
 const dolphinWakes=Array.from({length:compact?1:2},()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(4,4),rippleMaterial.clone());m.name='Dolphin surface rings';m.rotation.x=-Math.PI/2;m.visible=false;root.add(m);return m;});
 // Small distant birds remain a quiet accent; the aquatic animals are imported rigs.
 const gulls=[];const birdMaterial=new THREE.MeshStandardMaterial({color:'#f1ede2',roughness:.9,side:THREE.DoubleSide}),tipMaterial=new THREE.MeshStandardMaterial({color:'#394457',roughness:.9,side:THREE.DoubleSide}),beakMaterial=new THREE.MeshStandardMaterial({color:'#eedb94',roughness:.9});
 for(let i=0;i<(compact?3:6);i++){const g=new THREE.Group();g.name='Offshore gliding gull';root.add(g);g.scale.setScalar(1.1+i%3*.1);const body=new THREE.Mesh(new THREE.SphereGeometry(1,8,5),birdMaterial);body.scale.set(.12,.10,.35);g.add(body);const wings=[];
  const head=new THREE.Mesh(new THREE.SphereGeometry(.12,7,5),birdMaterial);head.position.set(0,.06,.31);g.add(head);const beak=new THREE.Mesh(new THREE.ConeGeometry(.045,.18,5),beakMaterial);beak.rotation.x=Math.PI/2;beak.position.set(0,.04,.48);g.add(beak);
  const tail=new THREE.BufferGeometry();tail.setAttribute('position',new THREE.Float32BufferAttribute([-.15,0,-.27,.15,0,-.27,0,.02,-.55],3));tail.computeVertexNormals();g.add(new THREE.Mesh(tail,birdMaterial));
  for(const side of [-1,1]){const wing=new THREE.Group();g.add(wing);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.14,side*.38,.04,.18,side*.73,.01,0,side*1.02,-.07,-.28,side*.62,-.02,-.22,side*.12,0,-.12],3));geo.setIndex([0,1,5,1,4,5,1,2,4,2,3,4]);geo.addGroup(0,9,0);geo.addGroup(9,3,1);geo.computeVertexNormals();wing.add(new THREE.Mesh(geo,[birdMaterial,tipMaterial]));wings.push(wing);}gulls.push({g,wings});
 }
 const stats={models:{state:'loading',author:'Quaternius',license:'CC0-1.0',loaded:0,instances:0,clips:[]},seed,whale:true,dolphin:true,shark:true,ray:true,gulls:gulls.length,fishShoals:schools.length,fish:compact?3:8,motion:'continuous-orbits',active:{},preview:null,reducedMotion,encounters:{},gullTracks:[]};
 let previewKind=null,lastTime=0,lastTraffic=[],loaded=false;const allowed=['sea','whale','dolphin','shark','ray','fish','gulls'];
 const route=(turn,lane)=>seaLifeRoute(turn,lane,staticObstacles),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),scale=new THREE.Vector3();
 function safe(p,r,traffic){return !seaPointInsideLand(p.x,p.z)&&nearestCoast(p.x,p.z).distance>r+16&&staticObstacles.every(o=>seaObstacleClearance(p,o)>r+5)&&!traffic.some(s=>Math.hypot(p.x-s.x,p.z-s.z)<r+5);}
 function encounter(kind,t){const forced=previewKind===kind||previewKind==='sea'&&kind==='whale';return{...seaEncounter(kind,t,seed,{preview:forced}),forced};}
 function update(t,traffic=[]){lastTime=t;lastTraffic=traffic;const time=reducedMotion?0:t;stats.encounters={};
  for(const [kind,a]of animals){const e=encounter(kind,time),radius=Math.max(a.length*.5+.5,kind==='dolphin'&&!compact?3+a.length*.5+.5:0);let turn=e.turn,p=route(turn,e.lane);if(e.forced)for(let i=0;i<24&&!safe(p,radius,traffic);i++){turn+=e.direction*.015;p=route(turn,e.lane);}const n=route(turn+e.direction*.0001,e.lane),yaw=Math.atan2(n.x-p.x,n.z-p.z),clear=safe(p,radius,traffic);
   const trafficFade=traffic.reduce((f,s)=>Math.min(f,smooth(radius+5,radius+13,Math.hypot(p.x-s.x,p.z-s.z))),1),visibility=reducedMotion?(kind==='ray'?.5:0):e.visibility*(e.forced?1:trafficFade),visible=loaded&&clear&&visibility>.05;
   a.g.visible=visible;a.g.rotation.set(0,yaw,0);a.g.position.set(p.x,seaY,p.z);
   const swimmers=[];
   for(const [i,m]of a.models.entries()){
    const pose=seaSwimPose(kind,time,i,seed,{height:m.height,visibility,reducedMotion});
    if(visible||reducedMotion)m.animate(time*(kind==='whale'?.65:1)+e.animationOffset+i*.6);
    m.root.position.set(kind==='dolphin'?i*1.8:0,pose.y,kind==='dolphin'?-i*2.4:0);m.root.rotation.set(pose.pitch,0,pose.roll);
    if(kind==='dolphin'){const wake=dolphinWakes[i];wake.visible=visible&&!reducedMotion&&pose.y<.16;wake.position.set(p.x+Math.cos(yaw)*m.root.position.x+Math.sin(yaw)*m.root.position.z,seaY+.025,p.z-Math.sin(yaw)*m.root.position.x+Math.cos(yaw)*m.root.position.z);wake.material.uniforms.uTime.value=time;wake.material.uniforms.uOpacity.value=.5*(1-smooth(-.05,.16,pose.y));}
    swimmers.push({position:[p.x+Math.cos(yaw)*m.root.position.x+Math.sin(yaw)*m.root.position.z,seaY+pose.y,p.z-Math.sin(yaw)*m.root.position.x+Math.cos(yaw)*m.root.position.z],height:m.height,breaching:pose.breaching});
   }
   stats.encounters[kind]={cycle:e.cycle,turn:e.turn,lane:e.lane,progress:e.progress,position:a.g.position.toArray(),coastDistance:nearestCoast(p.x,p.z).distance,swimmers};
  }
  const whale=animals.get('whale'),e=encounter('whale',time),breathPhase=e.forced?(time%5)/5:(e.progress-.35)/.10;
  spout.visible=whale.g.visible&&!reducedMotion&&breathPhase>=0&&breathPhase<1;
  if(spout.visible)for(let i=0;i<spout.count;i++){const a=i*2.4,life=breathPhase,d=life*(.12+(i%4)*.1);v.set(Math.cos(a)*d,.72+Math.sin(life*Math.PI)*(1.5+i%3*.3),2.1+Math.sin(a)*d);scale.setScalar((1-life)*(.7+i%3*.12));matrix.compose(v,q,scale);spout.setMatrixAt(i,matrix);}spout.instanceMatrix.needsUpdate=spout.visible;
  ripple.visible=whale.g.visible&&!reducedMotion;ripple.position.set(whale.g.position.x,seaY+.035,whale.g.position.z);rippleMaterial.uniforms.uTime.value=time;
  for(const school of schools){
   const e=seaEncounter('fish',time,seed+school.index*311,{preview:previewKind==='fish'}),p=route(e.turn,e.lane);school.g.position.set(p.x,seaY,p.z);
   const n=route(e.turn+e.direction*.0001,e.lane);school.g.rotation.y=Math.atan2(n.x-p.x,n.z-p.z);school.g.visible=loaded&&safe(p,3.4,traffic);
   for(const [i,m]of school.models.entries()){
    const pose=seaSwimPose('fish',time,i,seed+school.index*311,{height:m.height,reducedMotion});
    m.root.position.set((i%2?1:-1)*(.5+i*.15)+(reducedMotion?0:Math.sin(time*.6+i)*.1),pose.y,-i*.7);m.root.rotation.set(pose.pitch,0,pose.roll);
    if(school.g.visible||reducedMotion)m.animate(time*1.2+i*.41);
   }
  }
  stats.gullTracks=[];
  for(const [i,b]of gulls.entries()){
   const ship=traffic[(i%3===0?Math.floor(i/3):i)%Math.max(1,traffic.length)],f=seaGullFlight(i,time,seed,ship),p=route(f.turn,f.lane),n=route(f.turn+f.direction*.0001,f.lane),landing=reducedMotion?0:f.landing;
   b.g.position.set(p.x,seaY+f.height,p.z);b.g.rotation.set(reducedMotion?0:Math.sin(time*.35+i)*.04,Math.atan2(n.x-p.x,n.z-p.z),reducedMotion?0:f.bank);
   if(landing&&ship?.perchY!==undefined){const perch=new THREE.Vector3(.25,ship.perchY,-.4).applyAxisAngle(new THREE.Vector3(0,1,0),ship.rotationY||0).add(new THREE.Vector3(ship.x,ship.y,ship.z));b.g.position.lerp(perch,landing);const delta=(ship.rotationY||0)-b.g.rotation.y;b.g.rotation.y+=Math.atan2(Math.sin(delta),Math.cos(delta))*landing;b.g.rotation.z*=1-landing;}
   for(const [j,w]of b.wings.entries()){w.rotation.z=(j?1:-1)*(reducedMotion?.1:f.flap*(1-landing));w.rotation.y=(j?1:-1)*landing*1.2;w.scale.x=1-.55*landing;}
   stats.gullTracks.push({position:b.g.position.toArray(),turn:f.turn,perched:landing>.95,flap:b.wings[0].rotation.z});
  }

  stats.active={whale:animals.get('whale').g.visible,dolphin:animals.get('dolphin').g.visible,shark:animals.get('shark').g.visible,ray:animals.get('ray').g.visible,fish:schools.filter(s=>s.g.visible).length,spout:spout.visible,perchedGulls:stats.gullTracks.filter(b=>b.perched).length};stats.preview=previewKind;
 }
 const ready=Promise.resolve().then(modelLoader).then(library=>{
  if(!library){stats.models.state='not-requested';return;}
  for(const [kind,a]of animals)for(let i=0;i<(kind==='dolphin'&&!compact?2:1);i++){const m=library.create(a.asset,a.length);a.g.add(m.root);a.models.push(m);if(kind==='ray')m.root.traverse(o=>{if(o.isMesh)for(const mat of Array.isArray(o.material)?o.material:[o.material]){mat.transparent=true;mat.opacity=.4;mat.depthWrite=false;mat.color.lerp(new THREE.Color('#286e91'),.65);}});}
  for(const school of schools)for(let i=0;i<(compact?3:4);i++){const m=library.create(school.index?'fish-striped':'fish-blue',.65+(i%3)*.12);school.models.push(m);school.g.add(m.root);}
  loaded=true;stats.models.state='ready';stats.models.loaded=library.count;stats.models.instances=[...animals.values()].reduce((n,a)=>n+a.models.length,0)+schools.reduce((n,s)=>n+s.models.length,0);stats.models.clips=[...new Set([...animals.values()].flatMap(a=>a.models.flatMap(m=>m.clips)))];update(lastTime,lastTraffic);
 }).catch(error=>{stats.models.state='unavailable';stats.models.error=String(error.message).slice(0,160);});
 function preview(kind=null){if(kind!==null&&!allowed.includes(kind))return false;previewKind=kind;update(lastTime,lastTraffic);return true;}
 function focusPoint(kind='sea'){const o=kind==='fish'?schools[0].g:kind==='gulls'?gulls[0].g:animals.get(kind==='sea'?'whale':kind)?.g||animals.get('whale').g;root.updateWorldMatrix(true,true);return o.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.6,0));}
 update(0);return{root,ready,update,stats,preview,focusPoint};
}
