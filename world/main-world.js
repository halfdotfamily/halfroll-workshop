import {buildMapSurfaces} from './map-surfaces.js';
import {createCourierScene} from './courier-scene.js';
import {mountCardOutcomeStickers} from '../game/card-outcome-stickers.js';
import {createPawnCrowd} from './pawn-crowd.js';
import {retirePawn,disposeSceneResources} from './pawn-resources.js';
import {animateCritterFace} from '../game/critter-face-motion.js';
import {trialPlaybackProgress} from '../game/dice/trial-playback.js';
import {buildWorldEffects} from './world-effects.js';
import {buildFinaleDirector} from '../game/finale-director.js';
import {mountWorldEmotes} from './world-emotes.js';
import {buildWorldShips} from './world-ships.js';
import {applyChillPop} from './world-style.js';
import {buildZoneFlora} from './zone-flora.js';
import {buildCrownSanctuary} from './crown-sanctuary.js';
import {MOSSFALL} from './biome-layout.js';
import {sampleMotion} from '../game/game-feedback.js';
import {mountPawnLabels} from './pawn-labels.js';
import {mountMapCardTargets} from './map-card-targets.js';
import {BOARD as LIVE_BOARD,boardForRules} from '../game/game-rules.js';
import {buildVersionedCardVfx} from '../game/card-presentation.js';
import * as THREE from 'three';
import {constrainMapCamera,batchStaticScenery} from './mobile-world.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {buildTerrain,heightAt,routeDistance,routeHeight,routePoints,ARENA_Y} from './terrain.js';
import {buildMossfallWater} from './water.js';
import {buildRiverRocks} from './river-rocks.js';
import {buildMossfallCoast} from './coast.js';
import {buildWorldEdge} from './world-edge.js';
import {buildEmberCoast} from './ember-coast.js';
import {buildWoodsCoast} from './woods-coast.js';
import {buildGardenSlopes} from './garden-slopes.js';
import {buildMossfallFoliage} from './foliage.js';
import {buildMossfallLandmarks} from './landmarks.js';
import {buildHarbor} from './harbor.js';
import {buildEmber} from './ember.js';
import {buildPocket} from './pocket.js';
import {buildCrown} from './crown.js';
import {buildTransitions} from './transitions.js';
import {buildDockRelief} from './dock-relief.js';
import {buildTrail} from './trail.js';
import {makeOceanWater} from './water-material.js';
import {waterHeightAt,riverDistance,riverSample} from './biome-layout.js';
import {courtSeat} from './harbor-layout.js';
import {createCritter3D,createDie3D,orientDie} from '../game/dice/pieces3d.js';
import {buildRollPit} from './world-arena.js';
import {buildWorldAtmosphere} from './world-atmosphere.js';
import {buildWorldWeather} from './world-weather.js';
import {buildRouteLamps} from './route-lamps.js';
import {buildWorldLighting} from './world-lighting.js';
import {stabilizeMapFog} from './world-camera.js';
import {createCameraDepthCache} from './camera-depth-cache.js';
import {collectWorldRenderDiagnostics} from './world-render-diagnostics.js';
import {batchHarborScenery} from './world-rigid-batching.js';
import {createDiceToss,createDiceTossAsync,hydrateDiceToss,DICE_ROLL_MS} from '../game/dice/dice-motion.js';
import {recordedToss} from '../game/dice/dice-recorded.js';
import {createDicePlayback} from '../game/dice/dice-playback.js';
import {createQuickDiceToss} from '../game/dice/dice-quick-motion.js';
import {createDicePreparer} from '../game/dice/dice-preparation.js';

const FINISH=144,SEA_Y=-3.75;
export function routePoint(section){
 const pos=Math.max(0,THREE.MathUtils.clamp(section,0,FINISH)-.5),at=pos/FINISH*(routePoints.length-1),i=Math.min(routePoints.length-2,Math.floor(at)),a=routePoints[i],b=routePoints[i+1],t=at-i;
 return new THREE.Vector3(a.x+(b.x-a.x)*t,routeHeight(pos/FINISH)+.15,a.z+(b.z-a.z)*t);
}

/** The approved five-region world, mounted inside the playable site's own HUD. */
export async function mountMainWorld(container,{onCell=()=>{},onReady=()=>{},onProgress=()=>{},onDiceImpact=()=>{},onDiceRoll=()=>{},onDiceTap=()=>{},onSceneCue=()=>{},persistAtmosphere=true,initialBoard=LIVE_BOARD,resolveBoard=boardForRules,extraEffectsFactory=buildVersionedCardVfx}={}){
 const paintProgress=async(value,label)=>{onProgress(value,label);await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));};
 await paintProgress(.04,'Saving you a seat…');
 container.classList.add('world3d');
 const touchDevice=matchMedia('(pointer:coarse)').matches,compact=()=>innerWidth<=800||touchDevice;
 const renderer=new THREE.WebGLRenderer({antialias:!touchDevice,alpha:false,powerPreference:'high-performance'}),canvas=renderer.domElement;
 canvas.className='world3d__canvas';canvas.setAttribute('aria-label','HALFROLL board. One finger moves the map; two fingers rotate; pinch to zoom. With a mouse, drag to move, right-drag or Shift-drag to rotate, and scroll to zoom. Tap a section to inspect it.');container.append(canvas);
 renderer.setPixelRatio(Math.min(devicePixelRatio,compact()?1.25:1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.NeutralToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.fog=new THREE.Fog('#3d9fd6',220,600);
 const camera=new THREE.OrthographicCamera(-60,60,45,-45,.1,1500),controls=new OrbitControls(camera,canvas);
 controls.enableDamping=true;controls.dampingFactor=.12;controls.minZoom=1.275;controls.maxZoom=5;controls.minPolarAngle=.22;controls.maxPolarAngle=Math.PI*80/180;controls.screenSpacePanning=true;controls.panSpeed=.8;controls.rotateSpeed=.55;controls.zoomToCursor=true;
 controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
 const pawnCrowd=createPawnCrowd();let crowdDebug={contacts:0};
 let seaPreview=null,seaCameraBounds=null;
 let userView=false,state={},viewport={width:1,height:1},elapsed=0,lastTime=performance.now(),raf=0,destroyed=false,cameraSafety=null,fitMargins={};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 controls.addEventListener('start',()=>{userView=true;autoFollow=false;});
 await paintProgress(.12,'Unfolding the island…');
 const terrain=buildTerrain(scene),water=buildMossfallWater(scene),riverRocks=buildRiverRocks(scene,{heightAt,routeDistance}),coast=buildMossfallCoast(scene),edge=buildWorldEdge(scene);
 const emberCoast=buildEmberCoast(scene,{heightAt,routeDistance}),woodsCoast=buildWoodsCoast(scene,{heightAt,routeDistance}),garden=buildGardenSlopes(scene,{heightAt,routeDistance});
 let loadedRegions=0;
 const [foliage,landmarks,harbor,ember,pocket,crown,transitions,rules]=await Promise.all([
  buildMossfallFoliage(scene,{heightAt,routeDistance,waterHeightAt,riverDistance,riverSample}),buildMossfallLandmarks(scene,{heightAt}),buildHarbor(scene,{heightAt,routeDistance}),buildEmber(scene,{heightAt,routeDistance}),buildPocket(scene,{heightAt,routeDistance}),buildCrown(scene,{heightAt,routeDistance}),buildTransitions(scene,{heightAt,routeDistance,riverSample}),Promise.resolve(initialBoard)
 ].map(task=>Promise.resolve(task).then(value=>{onProgress(.12+(++loadedRegions)/8*.36,'Filling the little corners…');return value;}))).catch(error=>{renderer.dispose();controls.dispose();canvas.remove();throw new Error('The new world could not load. '+error.message,{cause:error});});
 const dockRelief=buildDockRelief(scene,{heightAt});
 // The court is populated by actual match participants, not the study's five extras.
 harbor.startCourt.root.traverse(o=>{if(o.userData.characterId!==undefined)o.visible=false;});
 await paintProgress(.5,'Drawing the trail…');
 await Promise.all([document.fonts.load('600 56px "Martian Mono"'),document.fonts.load('48px "Dela Gothic One"')]);
 const trail=buildTrail(scene,rules),arena=buildRollPit(scene,{x:0,z:0});arena.root.position.y=ARENA_Y;
 const foundation=new THREE.Mesh(new THREE.CylinderGeometry(7.8,7.9,1.4,64),new THREE.MeshStandardMaterial({color:'#b2b499',roughness:1}));foundation.position.set(0,ARENA_Y-.7,0);foundation.receiveShadow=true;scene.add(foundation);
 const ocean=makeOceanWater(),sea=new THREE.Mesh(new THREE.PlaneGeometry(1,1),ocean.material);sea.rotation.x=-Math.PI/2;sea.position.y=SEA_Y;scene.add(sea);
 const batching=batchStaticScenery([trail.root,landmarks.root,garden.root,woodsCoast.root,arena.root,crown.root,transitions.root],[trail.top,trail.throne,trail.numberLabels,...arena.dynamicRoots]);
 const harborBatching=batchHarborScenery(harbor,dockRelief);
 for(const key of ['before','after','merged'])batching[key]+=harborBatching[key];
 let nightHook=()=>{};
 const lighting=buildWorldLighting(scene,renderer,{compact:compact(),onApply:p=>{sea.material.color.setHex(p.sea);nightHook(p.night);}});
 renderer.shadowMap.autoUpdate=!compact();let shadowTime=-1,contextLost=false,lastRender=0;
 const onLost=e=>{e.preventDefault();contextLost=true;};const onRestored=()=>{contextLost=false;renderer.shadowMap.needsUpdate=true;lastTime=performance.now();};
 canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
 function setLightingPreset(name){if(!lighting.setPreset(name))return false;renderer.shadowMap.needsUpdate=true;try{if(persistAtmosphere)localStorage.setItem('roll-race-light',name);}catch{}return true;}
 let savedLight='cycle',savedWeather='auto';try{if(persistAtmosphere){if(localStorage.getItem('roll-race-world-cycle')==='3h-v1'){savedLight=localStorage.getItem('roll-race-light')||'cycle';savedWeather=localStorage.getItem('roll-race-weather')||'auto';}else{localStorage.setItem('roll-race-light','cycle');localStorage.setItem('roll-race-weather','auto');localStorage.setItem('roll-race-world-cycle','3h-v1');}}}catch{}if(!setLightingPreset(savedLight))setLightingPreset('cycle');
 const bounds=terrain.bounds.clone();for(const item of [harbor,ember,pocket,crown,foliage,landmarks,emberCoast,woodsCoast,edge])bounds.union(new THREE.Box3().setFromObject(item.root));
 const fitPoints=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])fitPoints.push(new THREE.Vector3(x,y,z));
 const clippingBounds=bounds.clone().expandByScalar(12);clippingBounds.max.y+=18;
 const cameraDepth=createCameraDepthCache(camera,controls.target,clippingBounds,SEA_Y);
 const chillPop=applyChillPop(scene,{exclude:[arena.root,trail.numberLabels]});
 const sanctuary=buildCrownSanctuary(scene,{heightAt,routeDistance});
 await paintProgress(.6,'Planting tiny trees…');
 const floraGround=scene.getObjectByName('Continuous sculpted hills'),zoneFlora=floraGround?await buildZoneFlora(scene,{heightAt,routeDistance,waterHeightAt,river:MOSSFALL.river,ground:floraGround,onProgress:(done,total)=>onProgress(.6+.2*done/total,'Planting tiny trees…'),avoid:[{x:trail.throne.position.x,z:trail.throne.position.z,r:4.4}]}):null;
 scene.updateMatrixWorld(true);
 await paintProgress(.82,'Lighting the way…');
 const routeLamps=buildRouteLamps(scene,{heightAt,routeDistance,waterHeightAt,avoid:[{x:trail.throne.position.x,z:trail.throne.position.z,r:4.4}]});
 const ships=buildWorldShips(scene,{seaY:SEA_Y,compact:compact(),reducedMotion:reduced});
 const atmosphere=buildWorldAtmosphere(scene,{heightAt,seaY:SEA_Y,compact:compact()});
 nightHook=n=>{atmosphere.setNight(n);routeLamps.setNight(n);};nightHook(lighting.mood()?.night||0);
 const weather=buildWorldWeather(scene,{bounds,heightAt,compact:compact(),reducedMotion:reduced,onGloom:(g,c)=>lighting.setWeather(g,c)});
 function setWeather(name){if(!weather.set(name))return false;try{if(persistAtmosphere)localStorage.setItem('roll-race-weather',name);}catch{}return true;}
 if(!setWeather(savedWeather))setWeather('auto');
 const pawnLabels=mountPawnLabels(container,scene,{anchored:true});
 const occlusionRay=new THREE.Raycaster(),occluders=[zoneFlora?.root,foliage.root,pocket.root,harbor.root,crown.root].filter(Boolean);let lastOcclusion=-Infinity;
 const pawns=new Map(),diceGroup=new THREE.Group();diceGroup.position.set(0,ARENA_Y+arena.floorY,0);scene.add(diceGroup);
 const mapTargets=mountMapCardTargets(scene,pawnLabels,canvas,{reduced});
 const dice=[createDie3D(),createDie3D()];const diceBatches=batchStaticScenery(dice);for(const key of ["before","after","merged"])batching[key]+=diceBatches[key];dice.forEach((die,i)=>{die.scale.setScalar(1.35);die.position.set(i?2:-2,.945,0);orientDie(die,3);diceGroup.add(die);});
 const courierScene=createCourierScene({scene,container,routePoint,screen,reduced,onCue:onSceneCue,getPawn:id=>pawns.get(String(id))});
 const effects=buildWorldEffects(scene,container,{routePoint,reduced,compact:compact(),onCue:onSceneCue,camera});
 const extraEffects=extraEffectsFactory?.(scene,{routePoint,reduced,onCue:onSceneCue});
 const mapSurfaces=buildMapSurfaces(scene,{rules,zoneAt:zoneFlora?.zoneAt});
 const cardStickers=mountCardOutcomeStickers(container,{reduced});
 const director=buildFinaleDirector(scene,{camera,controls,throne:trail.throne,footprint:trail.stats.throneFootprint,arenaY:ARENA_Y,reduced,compact:compact(),onCue:onSceneCue,onCameraBegin:()=>{userView=true;}});
 let emoteHandler=null;
 const emoteUI=mountWorldEmotes({onChoose:name=>{if(emoteHandler)emoteHandler(name);else{const player=[...pawns.values()].find(p=>String(p.player.id)===String(state.localPlayerId??state.activePlayer));if(player&&!player.player.bot)effects.playEmote({name,playerId:player.player.id},elapsed);}}});
 let heldCharge=0,heldDice=null,launchPower=2,lastMotionKey='',previewKey='',autoFollow=false;
 let diceCount=2,diceAnim=null,workerURL=null,preparingDice=false;
 const activeRing=new THREE.Mesh(new THREE.RingGeometry(.62,.72,40),new THREE.MeshBasicMaterial({color:'#3f5ba8',side:THREE.DoubleSide,transparent:true,opacity:.7,depthWrite:false}));activeRing.rotation.x=-Math.PI/2;scene.add(activeRing);activeRing.visible=false;
 const mintTrail=new THREE.Mesh(new THREE.RingGeometry(.74,.88,36),new THREE.MeshBasicMaterial({color:'#a9d7be',side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false}));mintTrail.rotation.x=-Math.PI/2;scene.add(mintTrail);mintTrail.visible=false;
 const cobaltFrame=new THREE.Mesh(new THREE.TorusGeometry(.95,.035,6,40),new THREE.MeshBasicMaterial({color:'#3f5ba8',transparent:true,opacity:.75}));scene.add(cobaltFrame);cobaltFrame.visible=false;
 const rollPrompt=document.createElement('button');rollPrompt.id='dice-roll';rollPrompt.type='button';rollPrompt.className='world-dice-prompt';rollPrompt.textContent='Tap dice to roll';rollPrompt.hidden=true;rollPrompt.onclick=()=>{if(state.canRoll)onDiceTap();};container.append(rollPrompt);
 function diceAge(){return diceAnim?Math.max(elapsed-diceAnim.start,(performance.now()-diceAnim.startWall)/1000)*(diceAnim.rate??1):0;}
 function setDiceCount(count){count=count===1?1:2;if(count===diceCount)return;diceAnim=null;heldDice=null;cancelRollPreparation();diceCount=count;dice.forEach((die,i)=>{die.visible=i<count;die.position.set(count===1?0:i?2:-2,.945,0);orientDie(die,3);});}
 function finishDice(){if(!diceAnim)return;diceAnim.plan.sample(diceAnim.plan.duration).forEach((pose,i)=>{dice[i].position.copy(pose.p);dice[i].quaternion.copy(pose.q);});diceAnim.startWall=performance.now()-diceAnim.plan.duration*1000;diceAnim.start=elapsed-diceAnim.plan.duration;arena.update(-1);}
 const initialDice=()=>diceAnim?diceAnim.plan.sample(diceAnim.plan.duration):dice.slice(0,diceCount).map(d=>({p:d.position.clone(),q:d.quaternion.clone()}));
 const planKey=(values,initial,height)=>JSON.stringify([values,height,arena.innerRadius,initial.map(p=>[...p.p.toArray(),...p.q.toArray()].map(n=>Number(n.toFixed(5))))]);
 // A dedicated worker keeps the high-arc physical rejection sampler off the render thread.
 const dicePreparer=createDicePreparer({makeWorker(){
  if(!workerURL){const source=`import * as THREE from ${JSON.stringify(new URL('../assets/vendor/three/three.module.js',import.meta.url).href)};import {createDiceToss} from ${JSON.stringify(new URL('../game/dice/dice-motion.js',import.meta.url).href)};self.onmessage=({data:{key,values,initial,launchHeight,innerRadius}})=>{try{const p=createDiceToss(values,{launchHeight,innerRadius,initial:initial.map(a=>({p:new THREE.Vector3().fromArray(a.p),q:new THREE.Quaternion().fromArray(a.q)}))});const pack=a=>({p:a.p.toArray(),q:a.q.toArray()});self.postMessage({key,plan:{seed:p.seed,values:p.values,duration:p.duration,attempts:p.attempts,limit:p.limit,launchHeight:p.launchHeight,events:p.events,frames:p.frames.map(f=>f.map(pack)),start:p.start.map(pack)}});}catch(e){self.postMessage({key,error:e.message});}};`;workerURL=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));}return new Worker(workerURL,{type:'module'});
 },computeFallback(job,signal){return createDiceTossAsync(job.values,{launchHeight:job.launchHeight,innerRadius:job.innerRadius,initial:job.initial.map(a=>({p:new THREE.Vector3().fromArray(a.p),q:new THREE.Quaternion().fromArray(a.q)}))},signal);}});
 function diceJob(values,power=.35){setDiceCount(values.length);const initial=initialDice(),height=power<=.35?2:1+7*Math.max(0,Math.min(1,power))**2;return{key:planKey(values,initial,height),values:[...values],initial:initial.map(p=>({p:p.p.toArray(),q:p.q.toArray()})),launchHeight:height,innerRadius:arena.innerRadius};}
 function prepareDice(values){if(values?.length){dicePreparer.warm(diceJob(values));dicePreparer.warm(diceJob(values,1));}}
 function prepareRoll(values,power=.35){return dicePreparer.prepare(diceJob(values,power));}
 function playPreparedRoll(prepared){
  const values=prepared.values;if(![1,2].includes(values?.length)||values.some(v=>!Number.isInteger(v)||v<1||v>6))throw Error('One or two prepared D6 results are required');
  setDiceCount(values.length);const plan=hydrateDiceToss(prepared);launchPower=prepared.launchHeight;
  diceAnim={start:elapsed,startWall:performance.now(),values:[...values],plan,lastSample:-.001};
  plan.sample(0).forEach((pose,i)=>{dice[i].position.copy(pose.p);dice[i].quaternion.copy(pose.q);dice[i].userData.value=values[i];});onDiceRoll();return{plan,values:[...values],startWall:diceAnim.startWall};
 }
 // A failed cosmetic worker must not strand an autonomous turn. Show the
 // already rolled engine faces at rest; this is explicitly not a replacement throw.
 function showDiceResult(values){
  if(![1,2].includes(values?.length)||values.some(v=>!Number.isInteger(v)||v<1||v>6))throw Error('One or two settled D6 results are required');
  cancelRollPreparation();setCharge(0);setDiceCount(values.length);diceAnim=null;launchPower=1;
  const poses=values.map((value,i)=>{const die=dice[i];die.position.set(values.length===1?0:i?2:-2,.945,0);orientDie(die,value);return{p:die.position.clone(),q:die.quaternion.clone()};});
  const plan={values:[...values],duration:.6,attempts:0,limit:arena.innerRadius,launchHeight:1,events:[],fallback:true,sample:()=>poses.map(p=>({p:p.p.clone(),q:p.q.clone()}))};
  const saved={plan,values:[...values],startWall:performance.now()};restoreDice(saved,true);arena.update(-1);return saved;
 }
 function restoreDice(saved,settled=false){if(!saved)return;setDiceCount(saved.values.length);diceAnim={...saved,start:elapsed-(performance.now()-saved.startWall)/1000,lastSample:Infinity};if(settled)finishDice();else update(0);}
 const dicePlayback=createDicePlayback({prepare:prepareRoll,play:playPreparedRoll,restore:restoreDice,onPending:value=>{preparingDice=value;},fallback:(values,power,live)=>live?recordedToss(values,diceJob(values,power)):createQuickDiceToss(values,diceJob(values,power)),cancelPrepare:()=>dicePreparer.cancelPending()});
 function rollDiceAsync(values,power=.35,options){setDiceCount(values.length);return dicePlayback.launch(values,power,options);}
 function cancelRollPreparation(){dicePlayback.cancel();dicePreparer.cancel();}
 function setCharge(value){if(value&&!heldCharge){heldDice=initialDice();diceAnim=null;heldDice.forEach((pose,i)=>{dice[i].position.copy(pose.p);dice[i].quaternion.copy(pose.q);});}heldCharge=value;controls.enabled=!value;if(!value&&heldDice){heldDice.forEach((pose,i)=>{dice[i].position.copy(pose.p);dice[i].quaternion.copy(pose.q);});heldDice=null;}}
 function rollDice(values=[1],power=.35){if(![1,2].includes(values.length)||values.some(v=>!Number.isInteger(v)||v<1||v>6))throw Error('One or two D6 results are required');const job=diceJob(values,power),cached=dicePreparer.peek(job.key),initial=job.initial.map(a=>({p:new THREE.Vector3().fromArray(a.p),q:new THREE.Quaternion().fromArray(a.q)})),plan=cached?hydrateDiceToss(cached):createDiceToss(values,{innerRadius:arena.innerRadius,initial,launchHeight:job.launchHeight});launchPower=job.launchHeight;diceAnim={start:elapsed,startWall:performance.now(),values:[...values],plan,lastSample:-.001};plan.sample(0).forEach((pose,i)=>{dice[i].position.copy(pose.p);dice[i].quaternion.copy(pose.q);dice[i].userData.value=values[i];});onDiceRoll();return{plan,values:[...values],startWall:diceAnim.startWall};}
 function stopCameraMotion(){controls.enableDamping=false;controls.update();controls.enableDamping=true;}
 let observedHud=null;
 function measureMargins(){
  const {width,height}=viewport,mobile=width<=800||touchDevice;fitMargins=state.layout==='play'?(mobile?{top:200,bottom:230,left:14,right:14}:{top:105,bottom:195,left:20,right:width>=1100?300:20}):(mobile?{top:145,bottom:185,left:12,right:12}:{top:100,bottom:126,left:16,right:16});
  if(state.layout==='play')fitMargins={top:mobile?140:110,bottom:Math.min(height*.46,((document.getElementById('race-hud')?.hidden===false?document.getElementById('race-hud'):document.getElementById(state.network?'controls':'play-dock'))?.getBoundingClientRect().height||190)+24),left:mobile?12:72,right:18};
  if(mobile&&width>height)fitMargins={top:80,bottom:state.layout==='play'?Math.min(height*.46,((document.getElementById('race-hud')?.hidden===false?document.getElementById('race-hud'):document.getElementById(state.network?'controls':'play-dock'))?.getBoundingClientRect().height||130)+24):110,left:12,right:80};
  const hud=document.getElementById('race-hud');
  if(hud&&hud!==observedHud){hudObserver.observe(hud);observedHud=hud;}
  const bottomPanel=hud&&!hud.hidden?hud:state.layout==='play'?document.getElementById('play-dock'):null;
  if(bottomPanel){const r=bottomPanel.getBoundingClientRect();if(r.height)fitMargins.bottom=Math.min(height*.55,height-r.top+14);}
  const header=document.querySelector('body>header')?.getBoundingClientRect(),tools=document.querySelector('#camera-controls .map-tools')?.getBoundingClientRect();
  if(header?.height)fitMargins.top=header.bottom+12;
  if(tools?.height&&tools.top<height*.25)fitMargins.top=Math.max(fitMargins.top,tools.bottom+12);
 }
 function fitToBoard(){
  measureMargins();const {width,height}=viewport;
  camera.updateMatrixWorld(true);const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),xy=fitPoints.map(p=>{const d=p.clone().sub(controls.target);return{x:d.dot(right),y:d.dot(up)};});
  const minX=Math.min(...xy.map(p=>p.x)),maxX=Math.max(...xy.map(p=>p.x)),minY=Math.min(...xy.map(p=>p.y)),maxY=Math.max(...xy.map(p=>p.y)),usableH=Math.max(height*.35,height-fitMargins.top-fitMargins.bottom),usableW=Math.max(width*.4,width-fitMargins.left-fitMargins.right),worldH=Math.max((maxY-minY)*height/usableH,(maxX-minX)*height/usableW)*1.025,worldW=worldH*width/height,cx=(state.layout==='play'?(minX+maxX)/2:0)+worldW*(fitMargins.right-fitMargins.left)/(2*width),cy=(minY+maxY)/2-worldH*(fitMargins.bottom-fitMargins.top)/(2*height);
  camera.left=cx-worldW/2;camera.right=cx+worldW/2;camera.top=cy+worldH/2;camera.bottom=cy-worldH/2;camera.updateProjectionMatrix();
 }
 function overviewZoom(){return Math.max(controls.minZoom,compact()?1.12:1.7); }
 function resetCamera(options={}){if(!options.preserveSea){seaPreview=null;ships.preview(null);}emoteUI.close?.();director.cancel('toolbar');autoFollow=false;stopCameraMotion();controls.disconnect();controls.connect(canvas);userView=false;controls.target.set(0,3.5,0);camera.position.set(72,83.5,94);camera.zoom=overviewZoom();camera.lookAt(controls.target);controls.update();fitToBoard();}
 function resize(){const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight||650);if(width===viewport.width&&height===viewport.height)return;viewport={width,height};renderer.setPixelRatio(Math.min(devicePixelRatio,compact()?1.25:1.65));renderer.shadowMap.autoUpdate=!compact();renderer.setSize(width,height,false);if(userView){const cx=(camera.left+camera.right)/2,half=(camera.top-camera.bottom)*width/height/2;camera.left=cx-half;camera.right=cx+half;camera.updateProjectionMatrix();}else{camera.zoom=overviewZoom();fitToBoard();}renderer.shadowMap.needsUpdate=true;update(0);}
 const previewRoot=new THREE.Group();scene.add(previewRoot);
 function setPreviews(options=[]){
 const key=JSON.stringify(options);if(key===previewKey)return;previewKey=key;
 previewRoot.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});previewRoot.clear();
 // Group equal throws so their labels do not sit on top of each other.
 const sections=[...new Set(options.map(o=>o.section))];
 for(const section of sections){
  const choices=options.filter(o=>o.section===section),selected=choices.some(o=>o.selected),color=selected?'#3f5ba8':'#a9d7be',p=routePoint(section);
  const outline=new THREE.Mesh(new THREE.RingGeometry(1.01,1.42,48),new THREE.MeshBasicMaterial({color:'#f8f5ee',side:THREE.DoubleSide,depthWrite:false}));outline.rotation.x=-Math.PI/2;outline.position.copy(p);outline.position.y+=.23;previewRoot.add(outline);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.08,1.35,48),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.copy(p);ring.position.y+=.25;previewRoot.add(ring);
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=112;const ctx=canvas.getContext('2d');
  ctx.fillStyle=selected?'#3f5ba8':'#f8f5ee';ctx.beginPath();ctx.roundRect(3,3,378,106,24);ctx.fill();ctx.strokeStyle=selected?'#f8f5ee':'#3f5ba8';ctx.lineWidth=6;ctx.stroke();ctx.fillStyle=selected?'#f8f5ee':'#2a2c31';ctx.font='600 37px "Martian Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(`${choices.map(o=>o.dieIndex+1).join('/')} → ${section}`,192,57);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));label.position.copy(p);label.position.y+=1.55;label.scale.set(3.65,1.06,1);label.renderOrder=14;label.userData={landingSection:section,selected};previewRoot.add(label);
  if(selected){const arrow=new THREE.Mesh(new THREE.ConeGeometry(.22,.5,3),new THREE.MeshBasicMaterial({color:'#3f5ba8',depthTest:false}));arrow.rotation.z=Math.PI;arrow.position.copy(p);arrow.position.y+=.74;arrow.renderOrder=13;previewRoot.add(arrow);}
 }
 // Die previews mark the landing only; linked routes belong to explicit tile inspection.
 }
 function setState(next){if(destroyed)return;const previous=state;if(mapTargets.active&&(next.matchId!==state.matchId||next.layout!=='play'||!(next.phase==='cards'||next.phase==='roll'&&['local-cards-v10','local-cards-v11','local-cards-v12','local-cards-v14','local-cards-v15','local-cards-v16'].includes(next.rulesVersion))))mapTargets.clear();if(previous.rulesVersion!==next.rulesVersion||previous.boardProfile!==next.boardProfile){const board=resolveBoard(next.rulesVersion,next.boardProfile);trail.setRules(board);mapSurfaces.setRules(board);renderer.shadowMap.needsUpdate=true;}if(next.snapMotion||previous.matchId!==next.matchId)pawnCrowd.clear();if(previous.matchId!==next.matchId){cancelRollPreparation();setCharge(0);}if(previous.matchId!==next.matchId||previous.localPlayerId!==next.localPlayerId)emoteUI.close?.();const layoutChanged=next.layout!==state.layout;state={...(previous.matchId!==next.matchId?{trial:false,motionAge:0,emote:null,snapMotion:false,network:false,localPlayerId:null,winnerId:null}:state),...next};courierScene.sync(next.courier,next.matchId,next.snapMotion);if(!state.canRoll&&heldCharge)setCharge(0);arena.setHintVisible(!!state.canRoll);const alive=new Set();(state.players||[]).forEach((player,index)=>{const key=String(player.id??index),characterId=Number(player.characterId??player.character??index);alive.add(key);let pawn=pawns.get(key);if(pawn&&pawn.characterId!==characterId){retirePawn(pawn);renderer.shadowMap.needsUpdate=true;pawns.delete(key);pawn=null;}if(!pawn){const body=createCritter3D(characterId,{scale:.8});const packed=batchStaticScenery([body],['Fine ink limbs','Blink lids','Resting mouth','Emote mouth','Resting eyes','Reaction face','Headwear',body.userData.traits?.holding].map(name=>body.getObjectByName(name)).filter(Boolean));for(const key of ["before","after","merged"])batching[key]+=packed[key];scene.add(body);const silhouette=body.clone(true);const silhouetteMat=new THREE.MeshBasicMaterial({color:'#d3e6c4',transparent:true,opacity:.72,depthTest:true,depthWrite:false,depthFunc:THREE.GreaterDepth,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});silhouette.traverse(o=>{if(o.isMesh){o.material=silhouetteMat;o.castShadow=false;o.receiveShadow=false;o.renderOrder=9;}});batchStaticScenery([silhouette]);scene.add(silhouette);pawn={body,silhouette,baseScale:body.scale.clone(),characterId,pos:Number(player.pos)||0,target:Number(player.pos)||0,index};pawns.set(key,pawn);}const newTarget=THREE.MathUtils.clamp(Number(player.pos)||0,0,FINISH);if(next.snapMotion||previous.matchId!==state.matchId||(next.sharedExhibition&&!next.motion?.tracks?.some(t=>String(t.playerId)===key))){pawn.motion=null;pawn.pos=newTarget;}if(newTarget!==pawn.target)pawn.speed=Math.max(7,Math.abs(newTarget-pawn.pos)/.9);pawn.target=newTarget;pawn.player=player;pawn.index=index;});for(const [key,pawn]of pawns)if(!alive.has(key)){retirePawn(pawn);renderer.shadowMap.needsUpdate=true;pawns.delete(key);}const motion=next.motion,motionKey=next.matchId+':'+motion?.serial;
 if(motion&&motionKey!==lastMotionKey){lastMotionKey=motionKey;if(!next.snapMotion&&(!layoutChanged||next.sharedExhibition))for(const track of motion.tracks){const p=pawns.get(String(track.playerId));if(p){p.motion={track,age:(next.motionAge??0)/1000,duration:motion.durationMs,startWall:performance.now()-(next.motionAge??0)};p.pos=track.from;}}}
 setPreviews(next.previews||[]);
 if(compact()&&state.layout==='play'&&((previous.phase==='waiting'&&state.phase==='roll')||(autoFollow&&previous.activePlayer!==state.activePlayer))){const p=activePawn();if(p){focus(routePoint(p.target),14);autoFollow=true;}}
 if(next.sharedExhibition&&motion)for(const p of pawns.values())if(p.motion)p.motion.startWall=performance.now()-(next.motionAge??0);
 if(layoutChanged&&!userView){camera.zoom=overviewZoom();fitToBoard();}effects.sync(extraEffects?.legacyState?.(state)??state,pawns,elapsed);extraEffects?.sync?.(state,pawns,elapsed);cardStickers.sync(state,pawns,performance.now()/1000);director.sync(state,pawns,elapsed);trail.setThroneMood(state.trial||String(state.phase).startsWith('trial-')?'ready':state.winnerId!=null?'won':'idle');if(previous.matchId!==state.matchId&&state.layout==='play'&&state.phase==='waiting')resetCamera();emoteUI.update({visible:state.layout==='play'&&!['waiting','finished','cancelled'].includes(state.phase)&&state.localPlayerId!==null&&Number(state.localPlayerId)>=0});pawnLabels.sync(pawns,state);rollPrompt.hidden=!state.canRoll;}
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
 const onDown=e=>{down=e.button===0&&e.isPrimary?{id:e.pointerId,x:e.clientX,y:e.clientY}:null;};
 const onMove=e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down=null;};
 const onCancel=()=>{down=null;};
 // Cancel before OrbitControls releases an already-ended pointer; reconnect clears its gesture state.
 const onPointerCancel=e=>{e.stopImmediatePropagation();down=null;queueMicrotask(()=>recoverInput());};
 const preventGesture=e=>e.preventDefault();
 const recoverInput=()=>{down=null;controls.disconnect();controls.connect(canvas);stopCameraMotion();lastTime=performance.now();};
 const onVisibility=()=>{if(!document.hidden)recoverInput();};
 window.addEventListener('blur',recoverInput);window.addEventListener('pageshow',recoverInput);document.addEventListener('visibilitychange',onVisibility);
 canvas.addEventListener('lostpointercapture',onCancel);
 for(const event of ['gesturestart','gesturechange','gestureend','selectstart','contextmenu'])canvas.addEventListener(event,preventGesture,{passive:false});
 const onUp=e=>{const tap=down;down=null;if(!tap||tap.id!==e.pointerId||e.button!==0||Math.hypot(e.clientX-tap.x,e.clientY-tap.y)>6)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);ray.setFromCamera(pointer,camera);if(mapTargets.active){const hits=[...pawns.values()].map(p=>({pawn:p,hit:ray.intersectObject(p.body,true)[0]})).filter(p=>p.hit).sort((a,b)=>a.hit.distance-b.hit.distance);if(hits.length)mapTargets.choose(hits[0].pawn.player.id);else mapTargets.clear();return;}if(state.canRoll&&ray.intersectObjects(dice.filter(d=>d.visible),true).length){onDiceTap();return;}const own=[...pawns.values()].find(p=>String(p.player.id)===String(state.localPlayerId));if(own&&!own.player.bot&&ray.intersectObject(own.body,true).length&&openEmotes())return;const checkpoint=trail.checkpointAtRay(ray);if(checkpoint!==null){onCell(checkpoint,rules.tiles.find(t=>t.number===checkpoint)||{index:checkpoint,type:'trail',name:'Shop stop'});return;}const hit=ray.intersectObject(trail.top)[0];if(hit){const index=Math.floor(hit.faceIndex/trail.top.userData.sectionTriangles)+1;onCell(index,rules.tiles.find(t=>t.number===index)||{index,type:index===144?'finish':'trail',name:index===144?'Crown Gate':'Trail'});}};
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointercancel',onPointerCancel,true);canvas.addEventListener('pointerup',onUp);
 let resizeFrame=0;const observer=new ResizeObserver(()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});});observer.observe(container);
 let hudFitFrame=0;
 const hudObserver=new ResizeObserver(()=>{if(hudFitFrame)return;hudFitFrame=requestAnimationFrame(()=>{hudFitFrame=0;measureMargins();if(!userView)fitToBoard();});});
 for(const id of ['play-dock','controls']){const element=document.getElementById(id);if(element)hudObserver.observe(element);}
 await paintProgress(.88,'Watching the open sea…');await ships.ready;
 await paintProgress(.9,'Polishing the dice…');
 resize();resetCamera();
 function activePawn(){return [...pawns.values()].find(p=>String(p.player.id)===String(state.activePlayer))||[...pawns.values()][Number(state.activePlayer)]||[...pawns.values()][0];}
 function update(dt){
  elapsed+=dt;const time=reduced?0:elapsed;mapSurfaces.update(time,reduced);water.update(time);coast.update(time);ocean.update(time);foliage.update(time);harbor.update(time);ember.update(time);emberCoast.update(time);pocket.update(time);crown.update(time);atmosphere.update(time);ships.update(time);weather.update(elapsed,dt);lighting.update(elapsed);
  for(const pawn of pawns.values()){
   pawn.body.scale.copy(pawn.baseScale);pawn.body.rotation.x=0;pawn.body.rotation.z=0;animateCritterFace(pawn.body,elapsed,{reduced});const limbs=pawn.body.getObjectByName('Fine ink limbs');if(limbs){limbs.rotation.z=0;for(const leg of limbs.children.filter(o=>/leg/.test(o.name)))leg.rotation.x=0;}
   let sample=null;if(pawn.motion){pawn.motion.age=state.sharedExhibition?Math.max(0,(performance.now()-pawn.motion.startWall)/1000):state.network?Math.max(pawn.motion.age+dt,(performance.now()-pawn.motion.startWall)/1000):pawn.motion.age+dt;const fallback=effects.sample(pawn.motion.track,pawn.motion.age,pawn.motion.duration,sampleMotion(pawn.motion.track,pawn.motion.age,pawn.motion.duration));sample=extraEffects?.sample?.(pawn.motion.track,pawn.motion.age,pawn.motion.duration,fallback)??fallback;}pawn.presentationSample=sample;if(sample?.done)pawn.motion=null;const diff=pawn.target-pawn.pos;pawn.pos=reduced?pawn.target:sample?sample.pos:pawn.pos+Math.sign(diff)*Math.min(Math.abs(diff),dt*(pawn.speed||7));const p=routePoint(pawn.pos),next=routePoint(Math.min(FINISH,pawn.pos+.15));
   if(pawn.pos<1){const seat=courtSeat(pawn.index%6);p.lerp(new THREE.Vector3(seat.x,seat.y,seat.z),1-pawn.pos);pawn.body.rotation.y=pawn.pos===0?seat.rotation:Math.atan2(next.x-p.x,next.z-p.z);}
   else{if(next.distanceTo(p)>.001)pawn.body.rotation.y=Math.atan2(next.x-p.x,next.z-p.z);}
   if(sample?.portal!==undefined){p.copy(routePoint(pawn.motion?.track.landing??pawn.pos).lerp(routePoint(sample.to),sample.portal));p.y+=Math.sin(sample.portal*Math.PI)*2;}
   if(Math.abs(diff)>.03&&!reduced&&!sample)p.y+=Math.abs(Math.sin(elapsed*14))*.2;
   if(!reduced&&!sample&&Math.abs(diff)<.03){const personality=pawn.body.userData.walkProfile||{},breath=Math.sin(elapsed*2+pawn.index*1.7);pawn.body.scale.y*=1+breath*.008;pawn.body.rotation.z=breath*(personality.sway||.035)*.22;}
   if(sample?.walking&&!reduced)p.y+=(sample.dy||0)*((pawn.body.userData.walkProfile?.bounce||1)-1);pawn.body.position.copy(p);effects.decorate(pawn,sample,elapsed);extraEffects?.decorate?.(pawn,sample,elapsed);
  }
  courierScene.update(dt);
  const crowdItems=[...pawns.values()].map(p=>({id:p.player.id,x:p.body.position.x,y:p.body.position.y,z:p.body.position.z,heading:p.body.rotation.y,rx:p.body.userData.bodyFootprint?.rx??.86,rz:p.body.userData.bodyFootprint?.rz??.46,solid:String(p.player.id)!==String(state.winnerId)}));
  const packed=pawnCrowd.update(crowdItems,dt,{reduced});crowdDebug={contacts:packed.contacts};
  for(const pawn of pawns.values()){
   const body=pawn.body.position,placed=packed.positions.get(String(pawn.player.id)),dx=placed.x-body.x,dz=placed.z-body.z;
   pawn.crowd={offsetX:dx,offsetZ:dz,rx:placed.rx,rz:placed.rz};
   if(Math.abs(dx)+Math.abs(dz)>.00001){const oldY=heightAt(body.x,body.z),newY=heightAt(placed.x,placed.z),dy=pawn.pos<1||oldY==null||newY==null?0:THREE.MathUtils.clamp(newY-oldY,-.35,.6);body.add(new THREE.Vector3(dx,dy,dz));effects.offsetPawn(pawn,new THREE.Vector3(dx,dy,dz));}
  }
  const active=activePawn();activeRing.visible=!!active&&!['waiting','finished'].includes(state.phase);if(active){activeRing.position.copy(active.body.position);activeRing.position.y+=.035;activeRing.material.opacity=.6+Math.sin(time*4)*.15;}
  const human=[...pawns.values()].find(p=>String(p.player.id)==='0'),owned=state.owned||[];mintTrail.visible=!!human&&owned.includes('mint-trail');cobaltFrame.visible=!!human&&owned.includes('cobalt-frame');if(human){mintTrail.position.copy(human.body.position);mintTrail.position.y+=.04;cobaltFrame.position.copy(human.body.position);cobaltFrame.position.y+=1.2;cobaltFrame.rotation.y=human.body.rotation.y;}
  if(diceAnim){const rawAge=Math.max(0,diceAge()),f=Math.min(1,rawAge/diceAnim.plan.duration),warped=trialPlaybackProgress(f);const age=reduced?diceAnim.plan.duration:state.trial?warped*diceAnim.plan.duration:rawAge;diceAnim.plan.sample(age).forEach((pose,i)=>{dice[i].position.copy(pose.p);dice[i].quaternion.copy(pose.q);});if(!reduced&&dt<.2)for(const impact of diceAnim.plan.events)if(impact.time>diceAnim.lastSample&&impact.time<=age&&age-impact.time<.15)onDiceImpact(impact);diceAnim.lastSample=age;}
  trail.numberLabels?.setDetail(camera.zoom>1.9);arena.update(diceAnim?diceAge():-1,reduced,heldCharge?-.18*heldCharge:0);if(heldCharge&&heldDice)dice.slice(0,diceCount).forEach((d,i)=>d.position.y=heldDice[i].p.y-.16*heldCharge);controls.update();director.update(elapsed,pawns);constrainMapCamera(camera,controls.target,seaPreview?seaCameraBounds:bounds);cameraSafety=cameraDepth.update();stabilizeMapFog(scene.fog,cameraSafety.radius);const s=cameraSafety.seaBounds;sea.position.x=(s.minX+s.maxX)/2;sea.position.z=(s.minZ+s.maxZ)/2;sea.scale.set(s.maxX-s.minX,s.maxZ-s.minZ,1);
  if(elapsed-lastOcclusion>.25){lastOcclusion=elapsed;
   const post=courierScene.occlusionAnchor();
   if(post){const ndc=post.clone().project(camera);occlusionRay.setFromCamera(ndc,camera);
    occlusionRay.far=Math.max(.1,post.distanceTo(occlusionRay.ray.origin)-.7);
    courierScene.setOccluded(occlusionRay.intersectObjects(occluders,true).length>0);}
   for(const pawn of pawns.values()){const relevant=state.layout==='play'&&(String(pawn.player.id)===String(state.localPlayerId)||String(pawn.player.id)===String(state.activePlayer));pawn.occluded=false;if(relevant){const anchor=pawn.body.position.clone().add(new THREE.Vector3(0,1.1,0)),ndc=anchor.clone().project(camera);occlusionRay.setFromCamera(new THREE.Vector2(ndc.x,ndc.y),camera);occlusionRay.far=Math.max(.1,anchor.distanceTo(occlusionRay.ray.origin)-.7);pawn.occluded=occlusionRay.intersectObjects(occluders,true).length>0;}}}for(const pawn of pawns.values()){if(pawn.silhouette){pawn.silhouette.visible=!!pawn.occluded;pawn.silhouette.position.copy(pawn.body.position);pawn.silhouette.rotation.copy(pawn.body.rotation);pawn.silhouette.scale.copy(pawn.body.scale);}}effects.update(elapsed,camera,viewport,pawns);extraEffects?.update?.(elapsed);mapTargets.update(pawns,elapsed);pawnLabels.update(pawns,['waiting','finished'].includes(state.phase)?null:active,camera,viewport,elapsed,reduced);const emoteBoxes=effects.layoutEmotes?.(camera)||[];cardStickers.update(performance.now()/1000,camera,viewport,pawns,[...pawnLabels.debug().plates,...emoteBoxes.map(box=>({box,hidden:false,emote:true}))]);extraEffects?.placeHeadScenes?.(camera,viewport,cardStickers.layout());
  const diceBusy=preparingDice||dicePreparer.debug().pending;rollPrompt.hidden=!state.canRoll&&!diceBusy;rollPrompt.disabled=diceBusy;rollPrompt.textContent=diceBusy?'Preparing dice…':'Tap dice to roll';if(state.canRoll||diceBusy){const p=new THREE.Vector3(0,ARENA_Y+4,0).project(camera);rollPrompt.style.left=((p.x+1)*viewport.width/2)+'px';rollPrompt.style.top=((1-p.y)*viewport.height/2)+'px';}if(!contextLost){if(!renderer.shadowMap.autoUpdate&&elapsed-shadowTime>.2){renderer.shadowMap.needsUpdate=true;shadowTime=elapsed;}renderer.render(scene,camera);courierScene.projectMarker();}
 }
 function frame(now){if(destroyed)return;raf=requestAnimationFrame(frame);if(document.hidden||contextLost){lastTime=now;return;}if(now-lastRender<(compact()?1000/30:1000/60)-1)return;lastRender=now;const dt=Math.min(.1,Math.max(0,(now-lastTime)/1000));lastTime=now;update(dt);}lastTime=performance.now();raf=requestAnimationFrame(frame);onProgress(.94,'Gathering your Critters…');onReady();
 function focus(point,size,{preserveSea=false}={}){resetCamera({preserveSea});userView=true;const offset=camera.position.clone().sub(controls.target);controls.target.copy(point);camera.position.copy(point).add(offset);camera.zoom=THREE.MathUtils.clamp((camera.top-camera.bottom)/(size*2),controls.minZoom,controls.maxZoom);const w=camera.right-camera.left,h=camera.top-camera.bottom,cx=w/camera.zoom*(fitMargins.right-fitMargins.left)/(2*viewport.width),cy=h/camera.zoom*(fitMargins.top-fitMargins.bottom)/(2*viewport.height);camera.left=cx-w/2;camera.right=cx+w/2;camera.top=cy+h/2;camera.bottom=cy-h/2;camera.updateProjectionMatrix();controls.update();}
 function screen(point){const p=point.clone().project(camera);return{x:(p.x+1)*viewport.width/2,y:(1-p.y)*viewport.height/2};}
 // Read-only viewport anchor for section information. Never pans the camera or
 // changes the selected destination, and remains attached while the map rotates.
 function projectSection(index){const n=Number(index);if(!Number.isFinite(n)||n<0||n>FINISH)return null;const point=screen(routePoint(n)),rect=canvas.getBoundingClientRect();return{x:rect.left+point.x*rect.width/viewport.width,y:rect.top+point.y*rect.height/viewport.height};}
 function openEmotes(anchor){
  const pawn=[...pawns.values()].find(p=>String(p.player.id)===String(state.localPlayerId));
  if(!pawn||pawn.player.bot||state.layout!=='play'||['waiting','finished','cancelled'].includes(state.phase))return false;
  const button=anchor?.getBoundingClientRect?anchor:null;
  const liveButton=()=>button?.isConnected?button:[...document.querySelectorAll('#race-hud [data-follow]')].find(el=>el.dataset.follow===String(pawn.player.id));
  const point=()=>{
   if(button){const el=liveButton();if(!el)return null;const r=el.getBoundingClientRect();return r.width&&r.height?{x:r.left+r.width/2,y:r.top+r.height/2}:null;}
   if(anchor)return typeof anchor==='function'?anchor():anchor;
   const head=pawnLabels.debug().plates.find(p=>p.key===String(pawn.player.id)),r=canvas.getBoundingClientRect(),p=head||screen(pawn.body.position.clone().add(new THREE.Vector3(0,1.5,0)));return{x:p.x+r.left,y:p.y+r.top,...(head?.bodyBox?{avoid:{...head.bodyBox,x:head.bodyBox.x+r.left,y:head.bodyBox.y+r.top}}:{})};
  };
  return emoteUI.open({anchor:point,characterId:pawn.characterId,returnFocus:button?liveButton:canvas});
 }
 function previewSea(kind){
  if(kind===null){resetCamera();return true;}if(!ships.preview(kind))return false;
  seaPreview=kind;seaCameraBounds??={min:bounds.min.clone().addScalar(-70),max:bounds.max.clone().addScalar(70)};
  focus(ships.focusPoint(kind),kind==='sea'?26:kind==='harbor'?15:10,{preserveSea:true});return true;
 }
 function getDebugState(){const sp=fitPoints.map(screen);return{cardTargeting:mapTargets.debug(),previews:state.previews||[],crowd:crowdDebug,labels:pawnLabels.debug(),arenaScreen:screen(new THREE.Vector3(0,ARENA_Y,0)),effects:effects.debug(),cardStickers:cardStickers.debug(),...(extraEffects?{extraEffects:extraEffects.debug?.()}:{}),emoteWheel:emoteUI.debug?.(),seaPreview,finale:director.debug(),ships:ships.stats,renderer:'three-webgl',world:'five-regions-v6',spaces:144,tileCount:144,finish:144,lighting:lighting.debug(),terrain:terrain.stats,trail:trail.stats,mapSurfaces:mapSurfaces.stats,atmosphere:atmosphere.stats,weather:weather.debug(),routeLamps:routeLamps.count,style:{name:'chill-pop-zones',grade:chillPop,flora:zoneFlora?.stats,floraAssets:zoneFlora?.assetStats,sanctuary:!!sanctuary},regions:{harbor:harbor.stats,ember:ember.stats,pocket:pocket.stats,crown:crown.stats,transitions:transitions.stats},coastline:{edge:edge.stats,volcano:emberCoast.stats,woods:woodsCoast.stats,garden:garden.stats},water:water.stats,courier:courierScene.debug(),players:pawns.size,characterIds:[...pawns.values()].map(p=>p.characterId),pawnPositions:[...pawns.values()].map(p=>({id:p.player.id,model:{characterId:p.body.userData.characterId,name:p.body.name,color:p.body.userData.traits?.color},pos:p.pos,crowd:p.crowd,motion:p.motion?.track??null,...(extraEffects?{presentation:p.presentationSample?{cardId:p.presentationSample.cardId,stage:p.presentationSample.stage,pos:p.presentationSample.pos,dy:p.presentationSample.dy,progress:p.presentationSample.progress,age:p.presentationSample.age}:null}:{}),world:p.body.position.toArray()})),startCourtOccupants:[...pawns.values()].filter(p=>p.pos===0).length,cosmetics:{mintTrail:mintTrail.visible,cobaltFrame:cobaltFrame.visible,landingMarkers:previewRoot.children.filter(o=>o.isSprite).map(o=>({...o.userData,...screen(o.position)}))},arena:{x:0,z:0,y:ARENA_Y,brand:'half.family',innerRadius:arena.innerRadius,spring:arena.getBend(),brandReady:arena.brandReady()},dice:{mode:diceAnim?.plan.fallback||'physics',preparation:{...dicePreparer.debug(),playingRequest:preparingDice},canRoll:!!state.canRoll,count:diceCount,values:diceAnim?.values||dice.slice(0,diceCount).map(d=>d.userData.value),rolling:!!diceAnim&&!reduced&&diceAge()<diceAnim.plan.duration,durationMs:(diceAnim?.plan.duration||4.2)*1000,launchHeight:launchPower,attempts:diceAnim?.plan.attempts,impactCount:diceAnim?.plan.events.length||0,positions:dice.slice(0,diceCount).map(d=>d.position.toArray()),quaternions:dice.slice(0,diceCount).map(d=>d.quaternion.toArray()),screenPositions:dice.slice(0,diceCount).map(d=>screen(d.getWorldPosition(new THREE.Vector3()))),center:diceGroup.position.toArray()},sampleTileScreens:[0,30,60,90,120,144].map(index=>({index,...screen(routePoint(index))})),performance:{pixelRatio:renderer.getPixelRatio(),targetFps:compact()?30:60,batching,contextLost,cameraDepth:cameraDepth.debug()},touchMode:controls.touches.ONE===THREE.TOUCH.PAN?'pan':'rotate',mouseMode:controls.mouseButtons.LEFT===THREE.MOUSE.PAN?'pan':'rotate',drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,cameraMode:userView?'free':'fit',fog:{near:scene.fog.near,far:scene.fog.far},polarAngle:controls.getPolarAngle(),camera:camera.position.toArray(),target:controls.target.toArray(),boardScreenBounds:{left:Math.min(...sp.map(p=>p.x)),right:Math.max(...sp.map(p=>p.x)),top:Math.min(...sp.map(p=>p.y)),bottom:Math.max(...sp.map(p=>p.y))},projection:{type:camera.type,near:camera.near,far:camera.far,depthSafety:cameraSafety,left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,zoom:camera.zoom,margins:fitMargins,viewport},motionTime:elapsed,reducedMotion:reduced};}
 return{isMovementPending:()=>!reduced&&[...pawns.values()].some(p=>!!p.motion),isPresentationPending:()=>preparingDice||!!diceAnim&&!reduced&&diceAge()<diceAnim.plan.duration,chooseCardTarget:request=>{emoteUI.close?.();mapTargets.arm(request);},clearCardTargets:()=>mapTargets.clear(),openEmotes,previewSea,setEmoteHandler(fn){emoteHandler=fn;},playEmote(event){return effects.playEmote(event,elapsed);},inspectSection:index=>trail.inspectSection(index),projectSection,focusSection:index=>focus(routePoint(index),8),refreshViewport:resize,setCharge,prepareRoll,playPreparedRoll,showDiceResult,rollDiceAsync,cancelRollPreparation,getArenaScreen:()=>screen(new THREE.Vector3(0,ARENA_Y,0)),arenaContains(x,y){const r=canvas.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(pointer,camera);return ray.intersectObject(arena.dynamicRoots[0]).length>0;},getDicePoses(){return dice.slice(0,diceCount).map(d=>({p:d.position.toArray(),q:d.quaternion.toArray()}));},setDiceCount,focusPlayers({padding=4,minimumRadius=9}={}){const points=[...pawns.values()].map(p=>p.body.position.clone());for(const t of state.motion?.tracks||[]){const lo=Math.min(t.from,t.to),hi=Math.max(t.from,t.to);for(let n=lo;n<=hi;n++)points.push(routePoint(n));}if(!points.length)return;const box=new THREE.Box3().setFromPoints(points),center=box.getCenter(new THREE.Vector3());center.y+=2;const radius=Math.max(minimumRadius,...points.map(p=>p.distanceTo(center)+padding)),aspect=viewport.width/viewport.height;focus(center,radius/Math.min(1,aspect));},focusPlayer(id){const p=[...pawns.values()].find(p=>String(p.player.id)===String(id));if(p)focus(p.body.position,17);},setState,prepareDice,rollDice,finishDice,restoreDice,resize,setTouchMode(mode){recoverInput();controls.mouseButtons.LEFT=mode==='rotate'?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN;},setWeather,getWeather:weather.get,getAtmosphere(){const w=weather.get();return{hour:lighting.hour(),light:lighting.getPreset(),weather:w==='auto'?weather.debug().auto:w,weatherMode:w,night:lighting.mood()?.night||0};},setLightingPreset,getLightingPreset:lighting.getPreset,resetCamera,zoomBy(factor){director.cancel('toolbar');autoFollow=false;userView=true;camera.zoom=THREE.MathUtils.clamp(camera.zoom/(Number(factor)||1),controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();controls.update();},focusArena(){focus(new THREE.Vector3(0,ARENA_Y+1,0),14);},focusActive(){const pawn=activePawn();if(pawn)focus(pawn.body.position,17);},advanceTime(ms){const delta=Math.max(0,Number(ms)||0);if(diceAnim)diceAnim.startWall-=delta;update(delta/1000);},getDebugState,getRenderDiagnostics:()=>collectWorldRenderDiagnostics(scene,renderer),destroy(){if(destroyed)return;destroyed=true;courierScene.destroy();mapTargets.destroy();cardStickers.destroy();extraEffects?.destroy?.();effects.destroy();director.destroy();emoteUI.destroy();pawnLabels.destroy();destroyed=true;cancelAnimationFrame(raf);window.removeEventListener('blur',recoverInput);window.removeEventListener('pageshow',recoverInput);document.removeEventListener('visibilitychange',onVisibility);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);canvas.removeEventListener('lostpointercapture',onCancel);for(const event of ['gesturestart','gesturechange','gestureend','selectstart','contextmenu'])canvas.removeEventListener(event,preventGesture);observer.disconnect();cancelAnimationFrame(resizeFrame);hudObserver.disconnect();cancelAnimationFrame(hudFitFrame);controls.dispose();dicePlayback.cancel();dicePreparer.destroy();if(workerURL)URL.revokeObjectURL(workerURL);canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointercancel',onPointerCancel,true);canvas.removeEventListener('pointerup',onUp);for(const pawn of pawns.values())retirePawn(pawn);pawns.clear();mapSurfaces.destroy();disposeSceneResources(scene);renderer.dispose();rollPrompt.remove();canvas.remove();}};
}

