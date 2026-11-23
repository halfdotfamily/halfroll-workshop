import * as THREE from 'three';

const intersects=(a,b)=>a.x<b.x+b.width+5&&a.x+a.width+5>b.x&&a.y<b.y+b.height+5&&a.y+a.height+5>b.y;
/** Stable priority and deterministic slots keep crowded seats readable. */
export function layoutPawnLabels(items,{width,height,blocked=[]}){
 const occupied=[...blocked],result=[];
 for(const item of [...items].sort((a,b)=>Number(b.active)-Number(a.active)||a.index-b.index)){
  if(item.x<0||item.x>width||item.y<0||item.y>height||item.depth<-1||item.depth>1){result.push({...item,hidden:true});continue;}
  let chosen=null;
  for(let row=0;row<15&&!chosen;row++)for(const shift of [0,-1,1,-2,2]){
   const offset=row===0?0:(row%2?-1:1)*Math.ceil(row/2)*(item.height+9);
   const x=Math.max(8,Math.min(width-item.width-8,item.x-item.width/2+shift*(item.width+9))),y=Math.max(8,Math.min(height-item.height-8,item.y-item.height-12+offset));
   const box={x,y,width:item.width,height:item.height};
   if(!occupied.some(r=>intersects(box,r))){chosen=box;break;}
  }
  if(chosen){occupied.push(chosen);result.push({...item,box:chosen,hidden:false});}else result.push({...item,hidden:true});
 }
 return result;
}

/** Keep every on-map racer named. A small local fan resolves crowding;
 * it never grows into remote HUD-edge slots or hides a name on collision. */
export function layoutAnchoredPawnLabels(items,{width,height,blocked=[],previous=[]}){
 const result=[],visible=[],history=new Map(previous.map(p=>[p.key,p]));
 for(const item of [...items].sort((a,b)=>a.index-b.index)){
  const natural={x:item.x-item.width/2,y:item.y-item.height-6};
  const hidden=item.depth<-1||item.depth>1||item.x<0||item.x>width||item.y<0||item.y>height||blocked.some(r=>item.x>=r.x&&item.x<=r.x+r.width&&item.y>=r.y&&item.y<=r.y+r.height);
  if(hidden){result.push({...item,hidden:true,displaced:false});continue;}
  const slots=[];
  const add=(dx,dy,preferred=false)=>{const box={x:Math.max(4,Math.min(width-item.width-4,natural.x+dx)),y:Math.max(4,natural.y+dy),width:item.width,height:item.height};slots.push({box,preferred,cost:(box.x-natural.x)**2+(box.y-natural.y)**2});};
  const old=history.get(item.key);
  if(old?.box&&!old.hidden){const dx=old.box.x-(old.x-old.width/2),dy=old.box.y-(old.y-old.height-6);if(Math.abs(dx)<=item.width+6&&dy<=.01&&dy>=-2*(item.height+6))add(dx,dy,true);}
  for(let row=0;row<3;row++)for(const col of [0,-.5,.5,-1,1])add(col*(item.width+6),-row*(item.height+6));
  slots.sort((a,b)=>Number(b.preferred)-Number(a.preferred)||a.cost-b.cost);
  visible.push({item,natural,slots});
 }
 // Resolve the whole crowd together. Backtracking lets an earlier bubble move
 // a little when its first choice would trap another one. Reuse nearby offsets
 // between frames, and cap work even for impossible HUD-edge configurations.
 const placed=[];let budget=12000;
 function arrange(i){if(i===visible.length)return true;const {slots}=visible[i];for(const {box}of slots){if(--budget<0)return false;if(blocked.some(r=>intersects(box,r))||placed.some(r=>intersects(box,r)))continue;placed.push(box);if(arrange(i+1))return true;placed.pop();}return false;}
 if(!arrange(0)){
  placed.length=0;
  for(const {slots}of visible){let best=null,score=Infinity;for(const candidate of slots){const b=candidate.box,overlap=[...blocked,...placed].reduce((sum,r)=>sum+Math.max(0,Math.min(b.x+b.width+5,r.x+r.width+5)-Math.max(b.x,r.x))*Math.max(0,Math.min(b.y+b.height+5,r.y+r.height+5)-Math.max(b.y,r.y)),0),cost=overlap*10000+candidate.cost;if(cost<score){best=b;score=cost;}}placed.push(best);}
 }
 for(let i=0;i<visible.length;i++){const {item,natural}=visible[i],box=placed[i];result.push({...item,box,hidden:false,displaced:Math.abs(box.x-natural.x)>.5||Math.abs(box.y-natural.y)>.5});}
 return result.sort((a,b)=>a.index-b.index);
}

export function mountPawnLabels(container,scene,{anchored=false}={}){
 const layer=document.createElement('div');layer.className='pawn-label-layer';layer.setAttribute('aria-label','Racers on the map');container.append(layer);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('pawn-label-leaders');svg.setAttribute('aria-hidden','true');layer.append(svg);
 const entries=new Map(),marker=new THREE.Group();marker.name='Active racer half.family marker';scene.add(marker);
 const remeasure=()=>{for(const entry of entries.values())entry.measureKey=null;};
 document.fonts?.addEventListener('loadingdone',remeasure);
 const shape=new THREE.Shape();shape.moveTo(-.55,0);shape.absarc(0,0,.55,Math.PI,0,true);shape.lineTo(.22,0);shape.absarc(0,0,.22,0,Math.PI,false);shape.lineTo(-.55,0);
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,curveSegments:16});geometry.translate(0,0,-.09);
 const solid=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0xa9d7be,roughness:.65,metalness:.05}));marker.add(solid);
 const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,35),new THREE.LineBasicMaterial({color:0x2a2c31}));marker.add(edge);marker.visible=false;
 let blocked=[],lastMeasure=-Infinity,debug=[],targetIds=new Set(),targetAction=null;
 function applyTarget(entry,key){
  const eligible=targetIds.has(String(key));entry.el.classList.toggle('is-card-target',eligible);entry.el.tabIndex=eligible?0:-1;
  if(eligible){entry.el.setAttribute('role','button');entry.el.setAttribute('aria-label',`Apply ${targetAction.card} to ${entry.name.textContent}`);}else{entry.el.removeAttribute('role');entry.el.setAttribute('aria-label',entry.name.textContent+(entry.own?', your racer':'')+(entry.offline?', network down: skips next turn':''));}
 }
 function setTargets(ids,action){targetIds=new Set(ids.map(String));targetAction=action;for(const [key,entry]of entries)applyTarget(entry,key);lastMeasure=-Infinity;}
 layer.addEventListener('click',e=>{const plate=e.target.closest('.is-card-target');if(plate&&targetIds.has(plate.dataset.playerId)){e.stopPropagation();targetAction?.onChoose(plate.dataset.playerId);}});
 layer.addEventListener('keydown',e=>{const plate=e.target.closest('.is-card-target');if(plate&&['Enter',' '].includes(e.key)){e.preventDefault();targetAction?.onChoose(plate.dataset.playerId);}});
 function sync(pawns,state){
  const alive=new Set();for(const [key,pawn] of pawns){alive.add(key);let entry=entries.get(key);
   if(!entry){const el=document.createElement('div');el.className='pawn-nameplate';const star=document.createElement('span');star.className='pawn-owner-star';star.textContent='✦';star.setAttribute('aria-hidden','true');const bolt=document.createElement('span');bolt.className='pawn-network-bolt';bolt.textContent='ϟ';bolt.setAttribute('aria-hidden','true');bolt.hidden=true;const name=document.createElement('span');el.append(star,bolt,name);layer.append(el);const line=document.createElementNS(svg.namespaceURI,'line');svg.append(line);entry={el,name,star,bolt,line};entries.set(key,entry);}
   entry.el.dataset.playerId=String(key);
   if(!entry.bolt.firstElementChild)entry.bolt.innerHTML='<svg width="8" height="10" viewBox="0 0 12 16" aria-hidden="true"><path d="M7 1 1 9h4l-1 6 7-9H7z" fill="currentColor"/></svg>';
   const text=String(pawn.player.name||pawn.body.name).slice(0,24),own=state.layout==='play'&&pawn.player.id===(state.localPlayerId??0)&&!pawn.player.bot;entry.name.textContent=text;entry.el.title=text;entry.own=own;entry.star.hidden=!own;entry.el.setAttribute('aria-label',text+(own?', your racer':''));
   entry.offline=Number(pawn.player.networkDownTurns)>0;entry.bolt.hidden=!entry.offline;entry.el.classList.toggle('is-network-down',entry.offline);if(entry.offline)entry.el.title=text+' · Network down: skips next turn';
   applyTarget(entry,key);
  }for(const [key,e] of entries)if(!alive.has(key)){e.el.remove();e.line.remove();entries.delete(key);}
  lastMeasure=-Infinity;
 }
 function update(pawns,active,camera,viewport,time,reduced){
  const {width,height}=viewport,small=width<=600,font=small?9:10,h=small?18:20,now=performance.now();
  if(now-lastMeasure>250){const parent=container.getBoundingClientRect();blocked=[...document.querySelectorAll('body > header,#atmosphere-hud,#camera-controls,#spectator-dock,#game-hud #controls,#hand-dock,#dice-roll,#play-dock,#race-hud')].filter(e=>!e.hidden&&getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height).map(r=>({x:r.left-parent.left-5,y:r.top-parent.top-5,width:r.width+10,height:r.height+10}));lastMeasure=now;}
 camera.updateMatrixWorld(true);
 const items=[];for(const [key,pawn] of pawns){const entry=entries.get(key);if(!entry)continue;
   if(anchored&&entry.body!==pawn.body){
    pawn.body.updateWorldMatrix(true,true);
    // Measure in the model's own axes. Inverting a world-aligned box inflates
    // it after a turn, sending labels unnecessarily far from their Critter.
    const inverse=pawn.body.matrixWorld.clone().invert(),bounds=new THREE.Box3(),matrix=new THREE.Matrix4();
    pawn.body.traverseVisible(node=>{if(!node.isMesh||!node.geometry)return;if(!node.geometry.boundingBox)node.geometry.computeBoundingBox();matrix.multiplyMatrices(inverse,node.matrixWorld);bounds.union(node.geometry.boundingBox.clone().applyMatrix4(matrix));});
    entry.headY=bounds.max.y;entry.localBounds=bounds;
    entry.body=pawn.body;
   }
   const isActive=pawn===active,world=anchored?pawn.body.localToWorld(new THREE.Vector3(0,entry.headY,0)):pawn.body.position.clone().add(new THREE.Vector3(0,isActive?5.5:3.1,0)),p=world.project(camera);
   const eligible=targetIds.has(key),labelFont=eligible?11:font,labelHeight=eligible?44:h;
   const measureKey=[labelFont,entry.name.textContent,entry.own,entry.offline,eligible].join('|');
   if(entry.measureKey!==measureKey){entry.el.hidden=false;entry.el.style.fontSize=labelFont+'px';entry.el.style.width='max-content';const measured=entry.el.getBoundingClientRect().width;entry.width=Math.min(eligible?132:small?94:116,Math.max(eligible?60:30,Math.ceil(measured||entry.name.textContent.length*labelFont*.65+(entry.own?26:14))));if(measured)entry.measureKey=measureKey;}
   let bodyBox;
   if(anchored&&entry.localBounds){
    const {min,max}=entry.localBounds,points=[];
    for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){
     const point=new THREE.Vector3(x,y,z).applyMatrix4(pawn.body.matrixWorld).project(camera);
     points.push({x:(point.x+1)*width/2,y:(1-point.y)*height/2});
    }
    const left=Math.min(...points.map(v=>v.x)),top=Math.min(...points.map(v=>v.y));
    bodyBox={x:left,y:top,width:Math.max(...points.map(v=>v.x))-left,height:Math.max(...points.map(v=>v.y))-top};
   }
   items.push({key,index:pawn.index,x:(p.x+1)*width/2,y:anchored?Math.min((1-p.y)*height/2,bodyBox?.y??Infinity):(1-p.y)*height/2,depth:p.z,width:entry.width,height:labelHeight,font:labelFont,bodyBox,own:entry.own,active:isActive});
  }
  debug=(anchored?layoutAnchoredPawnLabels:layoutPawnLabels)(items,{width,height,blocked,previous:debug});for(const item of debug){const e=entries.get(item.key);e.el.hidden=item.hidden;e.el.classList.toggle('is-active',item.active);e.el.classList.toggle('is-displaced',anchored&&!!item.displaced);e.el.dataset.active=String(item.active);e.line.dataset.active=String(item.active);e.line.style.display=item.hidden||anchored?'none':'';if(item.hidden)continue;
   const b={...item.box,x:Math.round(item.box.x),y:Math.round(item.box.y)};e.el.style.transform=`translate3d(${b.x}px,${b.y}px,0)`;e.el.style.width=b.width+'px';e.el.style.setProperty('--bubble-tip',Math.max(7,Math.min(b.width-7,item.x-b.x))+'px');e.el.style.height=item.height+'px';e.el.style.fontSize=item.font+'px';
   e.line.setAttribute('x1',anchored?Math.max(b.x+6,Math.min(b.x+b.width-6,item.x)):b.x+b.width/2);e.line.setAttribute('y1',anchored?Math.max(b.y,Math.min(b.y+b.height,item.y)):b.y+b.height);e.line.setAttribute('x2',item.x);e.line.setAttribute('y2',item.y+(anchored?0:6));
  }
  marker.visible=!!active&&!anchored;if(active){const scale=THREE.MathUtils.clamp((camera.top-camera.bottom)/camera.zoom/height*17,.75,2.6);marker.scale.setScalar(scale);marker.position.copy(active.body.position).add(new THREE.Vector3(0,3.5+(reduced?0:Math.sin(time*2)*.14),0));marker.rotation.set(0,Math.atan2(camera.position.x-marker.position.x,camera.position.z-marker.position.z)+(reduced?0:Math.sin(time*.8)*.16),0);}
 }
 return{sync,update,setTargets,debug:()=>({plates:debug,activeMarker:marker.visible,markerPosition:marker.position.toArray()}),destroy(){document.fonts?.removeEventListener('loadingdone',remeasure);layer.remove();marker.removeFromParent();geometry.dispose();edge.geometry.dispose();solid.material.dispose();edge.material.dispose();}};
}
