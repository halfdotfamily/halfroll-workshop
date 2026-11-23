import * as THREE from 'three';
import {batchStaticScenery} from './mobile-world.js';
import {buildSeaLife} from './world-sea-life.js';
import {buildPierLayout} from './harbor-layout.js';

export function staticSeaObstacles(scene){
 const pier=buildPierLayout(()=>null),out=[{minX:pier.x-1.9,maxX:pier.x+1.9,minZ:pier.approach[0].z-.2,maxZ:pier.descent.at(-1).z+2.9}];
 const boat=scene.getObjectByName('OpenSea-inspired white sailing boat');
 if(boat){const b=new THREE.Box3().setFromObject(boat);out.push({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z});}
 return out;
}

// Rounded sea lanes go around the actual island, with room for the cliff foot,
// offshore rocks and the whole hull. They never cut across a concave inlet.
export function shipRoute(turn,lane=0){
 const a=turn*Math.PI*2,c=Math.cos(a),s=Math.sin(a),p=.66;
 return{x:Math.sign(c)*Math.abs(c)**p*(62+lane*7),z:4+Math.sign(s)*Math.abs(s)**p*(58+lane*6)};
}
const palette={ink:'#2f3a56',paper:'#f8f5ee',mint:'#a9d7be',blue:'#3f5ba8',wood:'#a7794e',sun:'#eedb94',coral:'#db8b74',glass:'#add5db'};
export function buildWorldShips(scene,{seaY=-3.75,compact=false,reducedMotion=false}={}){
 const root=new THREE.Group();root.name='Passing sea traffic';
 const materials=Object.fromEntries(Object.entries(palette).map(([key,color])=>[key,new THREE.MeshStandardMaterial({color,roughness:.82,flatShading:true})]));
 const parts=(parent,geo,colour,p=[0,0,0])=>{const o=new THREE.Mesh(geo,materials[colour]);o.position.set(...p);o.castShadow=false;o.receiveShadow=true;parent.add(o);return o;};
 const box=(parent,w,h,d,colour,p)=>parts(parent,new THREE.BoxGeometry(w,h,d),colour,p);
 function hull(parent,colour){
  const ring=[[-.76,-1.65],[.76,-1.65],[1,1.04],[0,2.24],[-1,1.04]],pos=[],idx=[];
  for(const [y,k] of [[-.28,.65],[.42,1]])for(const [x,z]of ring)pos.push(x*k,y,z*k);
  for(let i=0;i<5;i++){const j=(i+1)%5;idx.push(i,j+5,j,i,i+5,j+5);}for(let i=1;i<4;i++)idx.push(5,5+i+1,5+i);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();parts(parent,g,colour);
  const rail=ring.map(([x,z])=>new THREE.Vector3(x,.51,z));rail.push(rail[0].clone());
  parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rail),new THREE.LineBasicMaterial({color:palette.ink})));
  box(parent,1.18,.05,1.92,'wood',[0,.46,-.38]);
 }
 function sail(parent,x,y,z,w,h,colour,reverse=false){
  const g=new THREE.BufferGeometry(),dir=reverse?-1:1;
  g.setAttribute('position',new THREE.Float32BufferAttribute([x,y,z,x,y+h,z,x+dir*w,y+.08,z+.18],3));g.computeVertexNormals();
  const mat=materials[colour].clone();mat.side=THREE.DoubleSide;const o=new THREE.Mesh(g,mat);parent.add(o);return o;
 }
 function lifering(parent,x,z){const o=parts(parent,new THREE.TorusGeometry(.24,.065,6,16),'paper',[x,.75,z]);o.rotation.y=Math.PI/2;}
 const count=compact?2:3,ships=[];
 const wakeMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float uTime;varying vec2 vUv;void main(){float e=abs(vUv.x-.5)*2.;float a=pow(1.-vUv.y,1.6)*smoothstep(.3,.65,e)*(1.-smoothstep(.7,1.,e));a*=.65+.35*sin(vUv.y*32.-uTime*2.);gl_FragColor=vec4(.88,.98,1.,a*.2);}'});
 for(let i=0;i<count;i++){
  const g=new THREE.Group();g.name=['Paper-sail dayboat','Little cargo tug','Sun-roof cruiser'][i];root.add(g);hull(g,i===1?'blue':'paper');
  if(i===0){
   parts(g,new THREE.CylinderGeometry(.035,.05,3.8,7),'wood',[0,2.2,0]);
   sail(g,0,.83,.05,1.56,3,'paper');sail(g,0,1.06,-.1,.9,2.2,'mint',true);
   box(g,.86,.42,.72,'blue',[0,.72,-.83]);box(g,.56,.18,.04,'glass',[0,.8,-.45]);
   const flag=sail(g,0,3.8,0,.57,.25,'blue');flag.name='Cobalt pennant';
  }else if(i===1){
   box(g,1.03,.88,1,'paper',[0,.94,-.85]);box(g,1.12,.12,1.13,'blue',[0,1.42,-.85]);
   box(g,.74,.27,.045,'glass',[0,1.07,-.32]);
   parts(g,new THREE.CylinderGeometry(.13,.16,.58,8),'ink',[.3,1.77,-1.06]);
   for(const [x,z,col]of [[-.4,.62,'sun'],[.4,.62,'mint'],[0,1.17,'coral']]){box(g,.58,.47,.52,col,[x,.73,z]);box(g,.6,.045,.55,'wood',[x,.98,z]);}
   lifering(g,1,-.7);
  }else{
   box(g,.95,.62,1.4,'mint',[0,.82,-.21]);box(g,.87,.24,.055,'glass',[0,1.01,.52]);
   for(const x of [-.62,.62])for(const z of [-.98,.62])parts(g,new THREE.CylinderGeometry(.025,.025,1.17,5),'wood',[x,1.03,z]);
   box(g,1.5,.12,1.95,'sun',[0,1.66,-.2]);box(g,.6,.17,.7,'paper',[0,.65,1.04]);lifering(g,1,-.65);
  }
  // Merge repeated rigid parts inside each moving ship, not into the island.
  batchStaticScenery([g]);
  const wake=new THREE.Mesh(new THREE.PlaneGeometry(3.9,7.5),wakeMat);wake.name='Soft boat wake';wake.rotation.x=-Math.PI/2;wake.position.set(0,-.13,-5);g.add(wake);
  const scale=i===1?1.08:.94;g.scale.setScalar(scale);
  ships.push({g,lane:i===1?.45:i===2?1:0,offset:[.1,.59,.83][i],speed:[.0016,-.0012,.001][i]});
 }
 const life=buildSeaLife({seaY,compact,reducedMotion,staticObstacles:staticSeaObstacles(scene)});root.add(life.root);
 scene.add(root);
 function update(t){
  const time=reducedMotion?0:t;wakeMat.uniforms.uTime.value=time;
  for(const [i,ship]of ships.entries()){
   const u=ship.offset+time*ship.speed,p=shipRoute(u,ship.lane),next=shipRoute(u+Math.sign(ship.speed)*.0002,ship.lane);
   ship.g.position.set(p.x,seaY+.1+Math.sin(time*.7+i*2.2)*.075,p.z);
   ship.g.rotation.set(Math.sin(time*.48+i)*.018,Math.atan2(next.x-p.x,next.z-p.z),Math.sin(time*.6+i*1.7)*.027);
  }
  life.update(time,ships.map((s,i)=>({x:s.g.position.x,y:s.g.position.y,z:s.g.position.z,rotationY:s.g.rotation.y,turn:s.offset+time*s.speed,speed:s.speed,perchY:[4.05,1.6,1.8][i]*s.g.scale.x})));
 }
 update(0);return{root,ready:life.ready,update,preview:life.preview,focusPoint:life.focusPoint,stats:{ships:count,types:ships.map(s=>s.g.name),seaLanes:'rounded-offshore',reducedMotion,life:life.stats}};
}
