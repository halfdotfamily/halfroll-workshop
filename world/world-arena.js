import * as THREE from 'three';
import {springOffset} from '../game/dice/dice-motion.js';
import {ARENA} from './world-layout.js';

/** A static landmark. Dice and player figures are owned by the scene controller. */
export function buildRollPit(scene,options={}){
  const config={...ARENA,...options};
  const {x=-4,z=1,radius=6.4,floorY=.42,rimY=1.2}=config;
  const innerRadius=5.35,root=new THREE.Group();root.name='Roll Pit';root.position.set(x,0,z);scene.add(root);
  const make=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.95,metalness:0,...extra});
  const mats={stone:make('#efe9dc'),light:make('#f8f5ee'),shade:make('#d6cdbb'),joint:make('#888674'),felt:make('#3f5ba8'),edge:make('#2f3a56'),wood:make('#977553'),ink:make('#2a2c31'),leaf:make('#7fb79a'),mint:make('#a9d7be'),gold:make('#d8b97c'),glow:make('#f5d492',{emissive:'#efb95f',emissiveIntensity:.3})};
  function mesh(geo,material,xyz=[0,0,0],parent=root){const m=new THREE.Mesh(geo,mats[material]);m.position.set(...xyz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function cylinder(r,height,y,material,xx=0,zz=0,segments=40){return mesh(new THREE.CylinderGeometry(r,r,height,segments),material,[xx,y,zz]);}
  function annulus(inner,outer,height,y,material,start=0,end=Math.PI*2){
    const shape=new THREE.Shape();shape.moveTo(Math.cos(start)*outer,Math.sin(start)*outer);shape.absarc(0,0,outer,start,end,false);shape.lineTo(Math.cos(end)*inner,Math.sin(end)*inner);shape.absarc(0,0,inner,end,start,true);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:1,steps:1,curveSegments:5});geo.rotateX(-Math.PI/2);return mesh(geo,material,[0,y,0]);
  }
  // Grounded plinth, dark inset and a soft, unobstructed felt rolling surface.
  cylinder(radius+.14,.20,.1,'shade');
  cylinder(innerRadius+.1,.08,floorY-.35,'edge');
  const membrane=mesh(new THREE.RingGeometry(0,innerRadius,80,12).rotateX(-Math.PI/2),'felt',[0,floorY,0]);membrane.name='Spring felt membrane';membrane.castShadow=false;
  annulus(innerRadius-.025,innerRadius+.07,.035,floorY-.02,'edge');
  // Fine rings are printed flat, rather than raised obstacles in the dice area.
  function floorRing(inner,outer,material,thetaStart=0,thetaLength=Math.PI*2,xx=0,zz=0){const ring=mesh(new THREE.RingGeometry(inner,outer,80,1,thetaStart,thetaLength),material,[xx,floorY+.006,zz]);ring.rotation.x=-Math.PI/2;ring.castShadow=false;return ring;}
  floorRing(4.93,4.96,'mint');
  const brandTexture=new THREE.TextureLoader().load(new URL('../assets/half-family-complete.png',import.meta.url).href);
  brandTexture.colorSpace=THREE.SRGBColorSpace;brandTexture.anisotropy=8;
  const brand=new THREE.Mesh(new THREE.PlaneGeometry(8.5,8.5*295/1440,40,10),new THREE.MeshBasicMaterial({map:brandTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  brand.name='Full half.family wordmark';brand.position.set(0,floorY+.014,0);brand.rotation.x=-Math.PI/2;brand.rotateZ(Math.atan2(72,94));root.add(brand);brand.updateMatrix();brand.geometry.applyMatrix4(brand.matrix);brand.position.set(0,0,0);brand.rotation.set(0,0,0);
  // Print the prompt on the felt: it shares the arena's perspective and spring.
  const hintCanvas=document.createElement('canvas');hintCanvas.width=1024;hintCanvas.height=144;
  const hintContext=hintCanvas.getContext('2d');
  hintContext.font='72px "Dela Gothic One"';hintContext.textAlign='center';hintContext.textBaseline='middle';
  hintContext.fillStyle='#d3e6c4';hintContext.fillText('HOLD AND ROLL',512,72);
  const hintTexture=new THREE.CanvasTexture(hintCanvas);hintTexture.colorSpace=THREE.SRGBColorSpace;hintTexture.anisotropy=8;
  const hint=new THREE.Mesh(new THREE.PlaneGeometry(6.2,.87,32,6),new THREE.MeshBasicMaterial({map:hintTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  const facing=Math.atan2(72,94);
  hint.name='HOLD AND ROLL felt print';hint.position.set(Math.sin(facing)*2.9,floorY+.025,Math.cos(facing)*2.9);
  hint.rotation.x=-Math.PI/2;hint.rotateZ(facing);root.add(hint);hint.updateMatrix();hint.geometry.applyMatrix4(hint.matrix);hint.position.set(0,0,0);hint.rotation.set(0,0,0);
  // Recessed mortar joints give the wall an inked masonry silhouette without shells.
  annulus(innerRadius+.01,radius,.16,.23,'joint');
  const count=28,gap=.013;
  for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2,b=(i+1)/count*Math.PI*2;
    annulus(innerRadius+.04,radius-.04,rimY-.76,.39,i%5===0?'shade':'stone',a+gap,b-gap);
    const shifted=a+Math.PI/count;
    annulus(innerRadius+.005,radius,.37,rimY-.37,i%4===0?'light':'stone',shifted+gap,shifted+(b-a)-gap);
  }
  const landmarks=[];
  // Six empty seats make the social circle legible. Real Critters are added elsewhere.
  for(let i=0;i<6;i++){
    const a=(i/6)*Math.PI*2+Math.PI/6,rr=radius+.70,xx=Math.sin(a)*rr,zz=Math.cos(a)*rr;
    const perch=mesh(new THREE.CylinderGeometry(.49,.55,.48,8),'shade',[xx,.25,zz]);
    const seat=mesh(new THREE.CylinderGeometry(.61,.58,.17,12),'light',[xx,.575,zz]);
    seat.rotation.y=a;perch.rotation.y=a;
    landmarks.push({name:`Spectator perch ${i+1}`,x:x+xx,z:z+zz,y:.66});
    // A single small engraved pip distinguishes each perch without implying powers.
    const pip=mesh(new THREE.CircleGeometry(.065,12),'edge',[xx,.666,zz]);pip.rotation.x=-Math.PI/2;pip.castShadow=false;
  }
  // Low entrance steps remain outside the bowl and below its cap stones.
  for(let i=0;i<3;i++){
    const depth=.52,stepZ=radius+.22+i*.44;
    mesh(new THREE.BoxGeometry(2.15-i*.12,.26-i*.045,depth),'stone',[0,.13-i*.0225,stepZ]);
    mesh(new THREE.BoxGeometry(2.17-i*.12,.035,depth+.015),'light',[0,.275-i*.045,stepZ]);
  }
  function lantern(xx,zz){
    cylinder(.27,.13,.15,'shade',xx,zz,12);
    cylinder(.13,.70,.56,'wood',xx,zz,10);
    cylinder(.25,.09,.94,'ink',xx,zz,12);
    mesh(new THREE.CylinderGeometry(.17,.17,.35,10),'glow',[xx,1.13,zz]);
    for(const [dx,dz] of [[-.14,-.14],[.14,-.14],[-.14,.14],[.14,.14]])mesh(new THREE.BoxGeometry(.035,.38,.035),'ink',[xx+dx,1.13,zz+dz]);
    mesh(new THREE.ConeGeometry(.32,.19,12),'wood',[xx,1.39,zz]);
    cylinder(.06,.08,1.52,'gold',xx,zz,10);
  }
  lantern(-1.9,7.0);lantern(1.9,-7.0);
  function fern(xx,zz,rotation){
    const fernRoot=new THREE.Group();fernRoot.position.set(xx,.12,zz);fernRoot.rotation.y=rotation;root.add(fernRoot);
    for(let i=0;i<5;i++){
      const a=(i-2)*.6,leaf=mesh(new THREE.SphereGeometry(1,8,6),i%2?'mint':'leaf',[Math.sin(a)*.19,.12+Math.cos(a)*.13,Math.cos(a)*.17],fernRoot);
      leaf.scale.set(.065,.29,.12);leaf.rotation.set(.4,a,-Math.sin(a)*.6);
    }
  }
  fern(-5.95,-3.7,.3);fern(5.95,3.5,2.1);
  // One little forgotten token on the entrance stone, outside the playable surface.
  const token=cylinder(.15,.045,.31,'gold',.58,radius+.3,20);token.rotation.z=.08;
  landmarks.unshift({name:'Roll Pit',x,z,y:floorY,radius,innerRadius});
  root.userData={landmark:'Roll Pit',static:true,floorY,innerRadius,collisionRadius:innerRadius-.25};
  const flexible=[membrane,brand,hint],rest=flexible.map(m=>m.geometry.attributes.position.array.slice());let bend=NaN;
  function update(seconds,reduced=false,manual=0){const next=reduced?0:(manual||springOffset(seconds));if(Math.abs(next-bend)<.0001)return;bend=next;flexible.forEach((m,j)=>{const pos=m.geometry.attributes.position,base=rest[j];for(let i=0;i<pos.count;i++){const x=base[i*3],z=base[i*3+2],weight=Math.max(0,1-(x*x+z*z)/(innerRadius*innerRadius))**2;pos.setY(i,base[i*3+1]+next*weight);}pos.needsUpdate=true;m.geometry.computeVertexNormals();});}
  return {update,setHintVisible:value=>{hint.visible=value;},hintVisible:()=>hint.visible,getBend:()=>Number.isFinite(bend)?bend:0,root,center:new THREE.Vector3(x,floorY,z),floorY,radius,innerRadius,landmarks,brandReady:()=>Boolean(brandTexture.image?.width),dynamicRoots:flexible,debug:{outerExtent:7.85,diceCenterRadius:innerRadius-.90,wallInnerRadius:innerRadius,floorClear:true,staticOnly:false}};
}
