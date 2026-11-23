import * as THREE from 'three';
import {PALETTE} from './route/board-art.js';
import {paintTileKey,tileKey} from './tile-key.js';

// Original half.family field illustrations. Numbers are always in the lower lane.
const C={ink:'#2a2c31',navy:'#2f3a56',paper:'#f8f5ee',cream:'#efe9dc',mint:'#a9d7be',leaf:'#d3e6c4',blue:'#3f5ba8',gold:'#e6ca80',peach:'#e8ad97',moss:'#7f9d76',lilac:'#b8aed5'};
const pairs={mint:{color:'#72b6a1',letter:'A'},blue:{color:'#91b4df',letter:'B'},violet:{color:'#b5a1d5',letter:'C'}};
const pairFor=name=>pairs[name]||{color:C.lilac,letter:'C'};

export function paintTile(ctx,{x=0,y=0,size=128,number,type='trail',tile={},link,phase,drawNumber=true}={}){
 ctx.save();ctx.translate(x,y);ctx.scale(size/128,size/128);ctx.lineJoin='round';ctx.lineCap='round';
 const rounded=(x,y,w,h,r,fill,stroke=C.ink,width=3)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}};
 const path=(points,stroke=C.ink,width=3,fill)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}};
 const ellipse=(x,y,rx,ry,fill,stroke=C.ink,width=2)=>{ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}};
 const text=(value,x,y,size=18,color=C.ink)=>{ctx.fillStyle=color;ctx.font=`600 ${size}px "Martian Mono", monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(value),x,y);};
 const fill=tileKey(type)?.color??(PALETTE[type]||PALETTE.trail);
 ctx.fillStyle=fill;ctx.fillRect(0,0,128,128);
 // Soft uneven ink shoulders, rather than a separate rectangular tile outline.
 path([[7,7],[6,31],[8,58],[6,87],[8,121]],'#616453',2);path([[120,6],[122,34],[120,65],[122,96],[120,122]],'#616453',2);
 if(type==='trail'){
  ellipse(30,31,2.3,1.7,'#b7bea5',null);ellipse(97,79,2,1.4,'#b7bea5',null);
  path([[58,17],[64,12],[70,17]],'#9ca78d',2);if(drawNumber)text(number,64,65,36,C.navy);
 }else{
  if(tileKey(type)){
   // A large, flat symbol stays readable beneath the physical field props.
   // Its silhouette also identifies the effect when colors are hard to tell apart.
   paintTileKey(ctx,type,type==='portal'?{x:32,y:2,size:64}:{x:24,y:4,size:80});
   if(type==='portal'){const pair=pairFor(tile.pairColor);text(link?`${pair.letter} > ${link.to}`:pair.letter,64,77,14);}
  }
  // A quiet cream footer keeps numbers legible underneath the physical props.
  if(drawNumber){rounded(36,85,56,31,10,C.paper,null);text(number,64,102,27,C.navy);}
 }
 ctx.restore();
}

export function buildFieldProps(scene,{rules,ROUTE,edgeHeight,heightAt}){
 const root=new THREE.Group();root.name='Half family illustrated field props';scene.add(root);
 const stats={chests:0,rottenChests:0,pandoraChests:0,airdrops:0,portals:0,shops:0,backwardSigns:0,drawCalls:0,instances:0,groundSamples:[]};
 const world=p=>({x:(p.x-800)*.065,z:(p.y-655)*.065});
 const geometries={box:new THREE.BoxGeometry(1,1,1),ball:new THREE.SphereGeometry(.5,10,7),cylinder:new THREE.CylinderGeometry(.5,.5,1,10),arch:new THREE.TorusGeometry(.34,.065,6,20,Math.PI),canopy:new THREE.SphereGeometry(.5,10,6,0,Math.PI*2,0,Math.PI/2)};
 const materials=new Map(),batches=new Map();
 const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:1}));return materials.get(color);};
 function add(shape,color,pos,scale,quat=new THREE.Quaternion()){
  const key=shape+'|'+color;if(!batches.has(key))batches.set(key,{shape,color,matrices:[]});
  batches.get(key).matrices.push(new THREE.Matrix4().compose(pos,quat,new THREE.Vector3(...scale)));stats.instances++;
 }
 for(const tile of rules.tiles){
  if(!['good','bad','airdrop','pandora','portal','market','trap','setback'].includes(tile.type))continue;
  const i=tile.number-1,cell=ROUTE.cells[i],a=world(ROUTE.edges[i].center),b=world(ROUTE.edges[i+1].center),dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),tx=dx/len,tz=dz/len;
  // Props sit in the outer lane, leaving the cell center free for a Critter. The rear of every section remains a clear number lane.
  const offset=Math.min(.48,len*.20),fraction=.5+offset/len,c=world(cell.center),cx=c.x+tx*offset+tz*.85,cz=c.z+tz*offset-tx*.85,yaw=Math.atan2(tx,tz),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
  const ground=(x,z)=>edgeHeight(i+Math.max(0,Math.min(1,fraction+z/len)))+.122;
  const base=ground(0,0),point=(x,y,z)=>new THREE.Vector3(cx+tz*x+tx*z,base+y,cz-tx*x+tz*z);
  const part=(shape,color,x,y,z,sx,sy,sz,rotation)=>add(shape,color,point(x,y,z),[sx,sy,sz],rotation?q.clone().multiply(rotation):q);
  const foot=(x,z,top=.15,width=.07)=>{const gy=ground(x,z),h=Math.max(.025,base+top-gy);part('cylinder',C.navy,x,gy-base+h/2,z,width,h,width);stats.groundSamples.push({section:tile.number,x:cx+tz*x+tx*z,z:cz-tx*x+tz*z,y:gy,expected:gy});};
  if(tile.type==='good'||tile.type==='bad'){
   const rotten=tile.type==='bad';rotten?stats.rottenChests++:stats.chests++;
   for(const x of [-.31,.31])for(const z of [-.17,.17])foot(x,z);
   part('box',C.navy,0,.28,0,.84,.30,.52);
   part('box',rotten?C.peach:C.mint,0,.29,-.018,.78,.25,.52);
   part('ball',rotten?C.peach:C.leaf,0,.44,0,.83,.35,.53);
   part('box',C.navy,0,.42,-.275,.82,.035,.028);
   for(const x of [-.27,.27])part('box',rotten?C.moss:C.gold,x,.36,-.286,.065,.27,.025);
   if(rotten){for(const x of [-.115,.115]){part('ball',C.paper,x,.30,-.292,.08,.10,.025);part('ball',C.navy,x,.30,-.31,.03,.047,.018);}for(const [x,z]of[[-.3,.08],[.3,.05],[.24,-.13]])part('ball',C.moss,x,.55,z,.16,.065,.13);part('cylinder',C.cream,.25,.61,.12,.025,.18,.025);part('ball',C.peach,.25,.70,.12,.14,.06,.12);}
   else{part('box',C.gold,0,.34,-.294,.14,.17,.035);part('ball',C.navy,0,.37,-.319,.032,.04,.015);}
  }else if(tile.type==='pandora'){
   stats.pandoraChests++;stats.chests++;
   for(const x of [-.31,.31])for(const z of [-.17,.17])foot(x,z);
   part('box',C.navy,0,.28,0,.84,.30,.52);part('box',C.lilac,0,.29,-.018,.78,.25,.52);
   part('ball',C.lilac,0,.44,0,.83,.35,.53);part('box',C.navy,0,.42,-.275,.82,.035,.028);
   for(const x of [-.27,.27])part('box',C.gold,x,.36,-.286,.065,.27,.025);
   part('box',C.gold,0,.34,-.294,.14,.17,.035);part('ball',C.navy,0,.37,-.319,.032,.04,.015);
  }else if(tile.type==='airdrop'){
   stats.airdrops++;
   for(const x of [-.20,.20])for(const z of [-.15,.15])foot(x,z,.14,.045);
   part('box',C.navy,0,.27,0,.57,.34,.44);part('box',C.gold,0,.28,-.012,.52,.29,.43);
   part('box',C.paper,0,.28,-.238,.06,.28,.018);
   part('canopy',C.navy,0,.98,0,.96,.47,.78);part('canopy',C.mint,0,.995,0,.91,.44,.74);
   for(const x of [-1,1])for(const z of [-1,1]){
    const start=point(x*.21,.42,z*.15),end=point(x*.43,.99,z*.32),delta=end.clone().sub(start);
    add('cylinder',C.navy,start.clone().add(end).multiplyScalar(.5),[.014,delta.length(),.014],new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
   }
  }else if(tile.type==='portal'){
   stats.portals++;const p=pairFor(tile.pairColor);
   for(const x of [-.34,.34]){foot(x,0,.24,.105);part('box',p.color,x,.20,0,.10,.28,.15);}
   part('arch',C.navy,0,.32,0,1.12,1.12,1.12);part('arch',p.color,0,.32,-.02,1,1,1);
   part('box',C.navy,0,.10,0,.91,.08,.32);part('box',p.color,0,.15,0,.82,.04,.28);
   // The open half arch is a walkable brand landmark, not a solid gate across the route.
  }else if(tile.type==='market'){
   stats.shops++;for(const x of [-.33,.33])for(const z of [-.15,.15])foot(x,z,.18);
   part('box',C.navy,0,.29,0,.82,.29,.43);part('box',C.mint,0,.30,-.025,.77,.25,.44);
   for(const x of [-.35,.35])part('cylinder',C.navy,x,.45,.13,.035,.60,.035);
   part('box',C.navy,0,.73,0,.94,.075,.63);
   for(let j=0;j<6;j++){part('box',j%2?C.mint:C.paper,-.375+j*.15,.78,0,.145,.055,.62);part('ball',j%2?C.mint:C.paper,-.375+j*.15,.72,-.31,.15,.15,.07);}
   part('ball',C.gold,-.17,.47,-.08,.13,.10,.12);part('ball',C.leaf,.15,.46,-.08,.15,.12,.13);
  }else{
   stats.backwardSigns++;foot(.20,.04,.30,.07);part('box',C.navy,.20,.38,.04,.035,.52,.035);
   part('box',C.navy,.10,.55,.04,.60,.28,.07);part('box',C.peach,.10,.55,-.006,.55,.23,.03);
   // Rounded arrow relief, with exact displacement printed on the tile below.
   part('arch',C.navy,.09,.55,-.034,.43,.43,.25);
   part('ball',C.navy,-.06,.55,-.038,.10,.10,.025);
  }
 }
 for(const {shape,color,matrices}of batches.values()){
  const mesh=new THREE.InstancedMesh(geometries[shape],mat(color),matrices.length);mesh.name=`Field detail ${shape} ${color}`;
  matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);stats.drawCalls++;
 }
 root.userData.stats=stats;return{root,stats};
}
