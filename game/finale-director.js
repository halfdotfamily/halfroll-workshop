import {isFullRace,FINISH_CELEBRATION_MS} from './race-results.js';
import {CELL_STEP_MS} from './presentation-timing.js';
import * as THREE from 'three';
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
/** Optional camera theatre. Outcomes, clocks and funds remain engine-owned. */
export function buildFinaleDirector(scene,{camera,controls,throne,footprint,arenaY,reduced=false,compact=false,onCue=()=>{},onCameraBegin=()=>{}}){
 let raceContinues=false,wasComplete=false;
 let identity='',trial=false,winner=null,start=0,saved=null,shot=null,manual=false,mode='idle',clock=0,winCued=false;
 const particles=new THREE.InstancedMesh(new THREE.PlaneGeometry(.12,.26),new THREE.MeshBasicMaterial({color:'#eedb94',side:THREE.DoubleSide}),compact?80:160);particles.name='Throne confetti';particles.visible=false;particles.frustumCulled=false;scene.add(particles);
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(1,1,1),point=new THREE.Vector3(),palette=['#eedb94','#a9d7be','#3f5ba8','#f8f5ee','#e9a08c'];
 for(let i=0;i<particles.count;i++)particles.setColorAt(i,new THREE.Color(palette[i%palette.length]));
 const capture=()=>({position:camera.position.clone(),target:controls.target.clone(),zoom:camera.zoom});
 function aim(target,zoom,t){if(manual||reduced)return;onCameraBegin();saved??=capture();shot={from:capture(),target:target.clone(),zoom,start:t};}
 function restore(t){if(!saved||manual)return;shot={from:capture(),target:saved.target.clone(),position:saved.position.clone(),zoom:saved.zoom,start:t};saved=null;}
 function cancel(){if(mode==='idle'&&!shot)return;manual=true;shot=null;saved=null;window.dispatchEvent(new CustomEvent('halfroll:skip-finale'));}
 controls.addEventListener('start',cancel);
 function sync(state,pawns,t){clock=t;raceContinues=state.phase!=='finished';
  if(state.matchId!==identity){identity=state.matchId;wasComplete=false;trial=false;winner=null;winCued=false;saved=null;shot=null;manual=false;mode='idle';particles.visible=false;}
  const isTrial=!!state.trial||String(state.phase||'').startsWith('trial-');
  if(isTrial&&!trial&&state.layout==='play'){manual=false;mode='trial';onCue('trial');aim(new THREE.Vector3(0,arenaY+1.2,0),compact?2.6:3.7,t);}
  if(trial&&!isTrial&&(state.winnerId==null||raceContinues&&state.winnerId===winner)){restore(t);mode='idle';}
  trial=isTrial;
  if(state.winnerId!=null&&(winner!==state.winnerId||state.phase==='finished'&&!wasComplete)){winner=state.winnerId;winCued=false;manual=false;const p=pawns.get(String(winner));const wait=p?.motion?(isFullRace(state)?Math.abs(p.motion.track.landing-p.motion.track.from)*CELL_STEP_MS/1000:p.motion.duration/1000):0;start=t+Math.max(0,wait-(p?.motion?.age??0));mode='won';if(p)p.victoryFrom=null;aim(new THREE.Vector3(footprint.x,footprint.level+2,footprint.z),compact?3:4.1,t);}
  wasComplete=state.phase==='finished';
 }
 function update(t,pawns){clock=t;
  if(shot){const u=ease((t-shot.start)/1.25),offset=shot.from.position.clone().sub(shot.from.target),dest=shot.position||shot.target.clone().add(offset);camera.position.lerpVectors(shot.from.position,dest,u);controls.target.lerpVectors(shot.from.target,shot.target,u);camera.zoom=shot.from.zoom+(shot.zoom-shot.from.zoom)*u;camera.updateProjectionMatrix();if(u>=1)shot=null;}
  if(!manual&&!reduced&&(mode==='trial'||mode==='won')){
   const target=mode==='won'?new THREE.Vector3(footprint.x,footprint.level+1.4,footprint.z):new THREE.Vector3(0,arenaY+1.2,0),header=document.querySelector('body>header')?.getBoundingClientRect(),tools=document.getElementById('camera-controls')?.getBoundingClientRect(),ticket=document.querySelector('.finale-ticket:not([hidden])')?.getBoundingClientRect(),hud=document.getElementById('race-hud'),hudBox=hud&&!hud.hidden?hud.getBoundingClientRect():null;
   const top=Math.max(12,header?.bottom||0,tools&&tools.left<innerWidth*.75&&tools.right>innerWidth*.25?tools.bottom:0)+18,bottom=mode==='won'?(ticket?.top||innerHeight*.55):(hudBox?.top||innerHeight-24),wanted=1-2*(top+Math.max(80,bottom-top)/2)/innerHeight;
   camera.updateMatrixWorld(true);const ndc=target.clone().project(camera),right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),shift=right.multiplyScalar(ndc.x*(camera.right-camera.left)/camera.zoom/2).add(up.multiplyScalar((ndc.y-wanted)*(camera.top-camera.bottom)/camera.zoom/2));camera.position.add(shift);controls.target.add(shift);
  }
  if(winner==null){particles.visible=false;return;}
  const age=t-start,p=pawns.get(String(winner));if(raceContinues&&mode==='won'&&age>=FINISH_CELEBRATION_MS/1000){restore(t);mode='idle';}if(age<0)return;if(!winCued){winCued=true;onCue('win');}if(p){p.victoryFrom??=p.body.position.clone();
   const seat=new THREE.Vector3(0,.14,.12).applyAxisAngle(new THREE.Vector3(0,1,0),throne.rotation.y);seat.x+=footprint.x;seat.z+=footprint.z;seat.y+=footprint.level;
   p.body.position.lerpVectors(p.victoryFrom||seat,seat,reduced?1:ease(age/1.6));p.body.rotation.set(0,throne.rotation.y,0);
   const limbs=p.body.getObjectByName('Fine ink limbs');if(limbs){limbs.rotation.z=0;for(const leg of limbs.children.filter(o=>/leg/.test(o.name)))leg.rotation.x=-1.35*ease(age/1.6);}
  }
  particles.visible=!reduced&&age>.8&&age<5.5;
  if(particles.visible){for(let i=0;i<particles.count;i++){const k=i*2.399,a=Math.max(0,age-.8),life=(a+i*.037)%3;point.set(footprint.x+Math.cos(k)*(1+life*1.8),footprint.level+2+life*3.4-life*life*1.3,footprint.z+Math.sin(k)*(1+life*1.8));q.setFromEuler(new THREE.Euler(life*3+k,k,life*2));matrix.compose(point,q,scale);particles.setMatrixAt(i,matrix);}particles.instanceMatrix.needsUpdate=true;}
 }
 return{sync,update,cancel,debug:()=>({mode,manual,winner,age:winner===null?0:clock-start}),destroy(){controls.removeEventListener('start',cancel);particles.removeFromParent();particles.geometry.dispose();particles.material.dispose();}};
}
