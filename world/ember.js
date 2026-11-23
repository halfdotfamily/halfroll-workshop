import * as THREE from 'three';
import {EMBER_POOLS,emberPoolPoint} from './ember-layout.js';
import {makeLavaMaterial} from './lava-material.js';

// Ember Hollow: sculpted igneous rock, a contained caldera and a little foundry.
// Every broad footprint is checked against the canonical game route.
export function buildEmber(scene, {heightAt, routeDistance}) {
  const root = new THREE.Group(); root.name = 'Ember Hollow — the old mint';
  const stats = {craters:0, basaltColumns:0, cooledCrust:0, oreClusters:0, fissures:0, foundries:0, instances:0, drawCalls:0, placements:[]};
  let seed=87201;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const mats={};
  for(const [name,color] of Object.entries({basalt:'#6b4a66',basaltLight:'#9a6a7a',ash:'#c99d88',charcoal:'#4a3346',iron:'#3d3550',copper:'#b17b4d',gold:'#e4bd68',cream:'#efe9dc',cobalt:'#3f5ba8',wood:'#655b51',moss:'#7b8371'})) mats[name]=new THREE.MeshStandardMaterial({color,roughness:.94,metalness:name==='iron'?.22:0,flatShading:true});
  const clock={value:0},lava=makeLavaMaterial(clock);
  const geos={box:new THREE.BoxGeometry(1,1,1),beam:new THREE.CylinderGeometry(1,1,1,6),ring:new THREE.TorusGeometry(1,.11,5,18),nail:new THREE.CylinderGeometry(1,1,1,6),crystal:new THREE.ConeGeometry(1,1,5)};
  // A non-regular basalt column, split into unequal planes with a slanted cap.
  const basalt=new THREE.CylinderGeometry(.72,1,1,6,1); const pos=basalt.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);pos.setXYZ(i,x*(1+.1*Math.sin(z*8+x)),y+.11*x-.05*z,z*(1+.1*Math.cos(x*5)));}basalt.computeVertexNormals(); geos.rock=basalt;
  const bucket=new Map(),stamp=new THREE.Object3D();
  function part(geo,mat,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){const key=geo+':'+mat;if(!bucket.has(key))bucket.set(key,[]);stamp.position.set(x,y,z);stamp.scale.set(sx,sy,sz);stamp.rotation.set(rx,ry,rz);stamp.updateMatrix();bucket.get(key).push(stamp.matrix.clone());stats.instances++;}
  const allowed=(x,z,r)=>Number.isFinite(heightAt(x,z))&&routeDistance(x,z)>1.65+r&&Math.hypot(x,z)>9.5+r&&x>-18+r&&x<38-r&&z>-32+r&&z<-13-r;
  const occupied=[];
  const free=(x,z,r)=>allowed(x,z,r)&&!occupied.some(p=>Math.hypot(p.x-x,p.z-z)<p.r+r+.15);
  function reserve(name,x,z,r){occupied.push({x,z,r});stats.placements.push({name,x,z,r,clearance:routeDistance(x,z)-r});}
  function mesh(geo,mat,name){const o=new THREE.Mesh(geo,mat);o.name=name;o.castShadow=true;o.receiveShadow=true;root.add(o);stats.drawCalls++;return o;}
  function caldera(p){
    const {x,z,r,level}=p;if(!free(x,z,r*1.13))return false;
    reserve('Caldera',x,z,r*1.13);const n=48,vertices=[],indices=[],colors=[];
    // A broken, low rim follows the excavated ground instead of a raised cone.
    for(let ring=0;ring<4;ring++)for(let i=0;i<n;i++){
      const a=i/n*Math.PI*2,q=emberPoolPoint(p,a,[p.surfaceRadius-.02,p.surfaceRadius+.15,1.08,1.24][ring]),g=heightAt(q.x,q.z);
      const y=ring===0?level-.12:ring===1?Math.max(g+.17,level+.12+.06*Math.sin(i*.7)):g+(ring===2?.06:-.035);
      vertices.push(q.x,y,q.z);const c=new THREE.Color(ring===0?'#3a2838':ring===1?'#5a3a52':'#8a5a6e').multiplyScalar(.92+.1*Math.sin(i*1.7));colors.push(...c);
    }
    for(let k=0;k<3;k++)for(let i=0;i<n;i++){const j=(i+1)%n,a=k*n+i,b=k*n+j,c=(k+1)*n+i,d=(k+1)*n+j;indices.push(a,c,b,b,c,d);}
    const rim=new THREE.BufferGeometry();rim.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));rim.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));rim.setIndex(indices);rim.computeVertexNormals();mesh(rim,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}),'Excavated irregular basin rim');
    const surface=[x,level,z],faces=[];
    for(let i=0;i<n;i++){const q=emberPoolPoint(p,i/n*Math.PI*2,p.surfaceRadius);surface.push(q.x,level,q.z);faces.push(0,i+1,(i+1)%n+1);}
    const pool=new THREE.BufferGeometry();pool.setAttribute('position',new THREE.Float32BufferAttribute(surface,3));pool.setIndex(faces);pool.computeVertexNormals();const liquid=mesh(pool,lava,'Recessed molten basin');liquid.userData.pool=p;
    // Low fractured plates grow out of the lip, with gaps rather than a bead ring.
    for(let i=0;i<14;i++){if(i%4===0)continue;const a=i*2.399,q=emberPoolPoint(p,a,.98+rand()*.12),g=heightAt(q.x,q.z);part('rock',i%3?'charcoal':'basalt',q.x,g+.04,q.z,.25+rand()*.4,.12+rand()*.18,.22+rand()*.35,.03,a,.08);stats.cooledCrust++;}
    stats.craters++;return true;
  }
  EMBER_POOLS.forEach(caldera);

  // Narrow, terrain-following incandescent seams. Black cooled margins retain
  // each stream and keep the bright material away from the numbered tiles.
  function fissure(x,z,length,angle){
    const half=.34,points=[];for(let i=0;i<=12;i++){const u=i/12-.5,side=Math.sin(i*.65)*.15,px=x+Math.cos(angle)*u*length-Math.sin(angle)*side,pz=z+Math.sin(angle)*u*length+Math.cos(angle)*side;if(!free(px,pz,.55))return;points.push({x:px,z:pz,y:heightAt(px,pz)+.06});}
    const verts=[],idx=[];points.forEach((p,i)=>{const before=points[Math.max(0,i-1)],after=points[Math.min(12,i+1)],a=Math.atan2(after.z-before.z,after.x-before.x),w=half*(.45+Math.sin(Math.PI*i/12)*.55);for(const s of [-1,1]){const xx=p.x-Math.sin(a)*w*s,zz=p.z+Math.cos(a)*w*s;verts.push(xx,heightAt(xx,zz)+.055,zz);}if(i<12)idx.push(i*2,i*2+2,i*2+1,i*2+1,i*2+2,i*2+3);if(i%3===0){for(const s of [-1,1])part('rock','charcoal',p.x-Math.sin(a)*(w+.13)*s,p.y-.025,p.z+Math.cos(a)*(w+.13)*s,.24,.12,.26,0,a);stats.cooledCrust+=2;}});
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(geo,lava,'Warm fault line');reserve('Contained fissure',x,z,length*.5+.2);stats.fissures++;
  }
  fissure(3,-24,3.2,.25);fissure(-4,-24.5,2.3,0);fissure(19,-24.5,2.4,.1);fissure(30,-17,2.2,1.3);

  // A handmade mining forge; beams, masonry, arch blocks, vents, wheel, ore cart.
  const fx=-16,fz=-15.8,fr=1.45;
  if(free(fx,fz,fr)){
    reserve('Old Bitcoin mint',fx,fz,fr);const y=Math.max(...[[-1,-1],[1,-1],[-1,1],[1,1]].map(([a,b])=>heightAt(fx+a,fz+b)));
    for(let j=0;j<3;j++)for(let row=0;row<2;row++){const px=fx-.8+j*.8,pz=fz-.42+row*.84,ground=Math.min(heightAt(px-.4,pz-.42),heightAt(px+.4,pz+.42))-.15;part('box','basalt',px,(ground+y)/2,pz,.79,y-ground,.83);}
    for(let k=0;k<2;k++)for(let j=0;j<3;j++)part('box',k%2?'basaltLight':'basalt',fx-.8+j*.8,y-.07+k*.16,fz,.77,.15,1.65,0,0);
    for(const dx of [-.79,.79])for(const dz of [-.62,.62]){const ground=heightAt(fx+dx,fz+dz);part('box','wood',fx+dx,(ground+y+2)/2,fz+dz,.12,y+2-ground,.12);}
    for(let i=0;i<7;i++)part('box',i%2?'copper':'charcoal',fx-.99+i*.33,y+2.04,fz,.34,.15,1.87,0,0,.03);
    part('box','basaltLight',fx,y+.6,fz,1.05,1.2,.9);part('box','charcoal',fx,y+.51,fz+.466,.64,.61,.03);
    const embers=new THREE.PlaneGeometry(.5,.37);embers.translate(fx,y+.43,fz+.488);mesh(embers,lava,'Forge fire');
    part('box','iron',fx+.2,y+1.95,fz-.15,.42,1.4,.4);
    for(let k=0;k<4;k++)part('box','copper',fx+.2,y+1.4+k*.29,fz-.15,.49,.055,.47);
    part('ring','iron',fx-.98,y+1.05,fz+.65,.45,.45,.45,0,0,.25);
    for(let k=0;k<6;k++)part('box','copper',fx-.98,y+1.05,fz+.67,.81,.045,.045,0,0,k*Math.PI/3);
    // Gold coin seal: a geometric B and paired stems, legible without a font.
    part('nail','gold',fx+.67,y+1.42,fz+.69,.3,.05,.3,Math.PI/2);
    part('box','charcoal',fx+.59,y+1.42,fz+.726,.035,.38,.03);
    for(const dz of [-.085,.085]){part('ring','charcoal',fx+.68,y+1.42+dz,fz+.73,.09,.08,.03);}
    for(const dx of [.62,.7])part('box','charcoal',fx+dx,y+1.42,fz+.73,.018,.45,.025);
    for(const dx of [-.65,.65])for(const dz of [-.48,.48])part('nail','copper',fx+dx,y+1.96,fz+dz,.035,.06,.035);
    stats.foundries++;
  }
  // No bright ribbon over the ridge: four local thermal seams remain in the rock.
  stats.lavaStyle='recessed-basins-and-cooling-crust';
  // Geological clusters follow three broken ridges; avoid uniform scatter.
  const ridges=[{x:-5,z:-24.3,l:10},{x:16,z:-25,l:11},{x:29,z:-19,l:8}];
  for(let i=0;i<620;i++){
    const ridge=ridges[i%3],x=ridge.x+(rand()-.5)*ridge.l,z=ridge.z+(rand()-.5)*4.8,r=.35+rand()*.48;
    if(!free(x,z,r))continue;const y=heightAt(x,z),h=.2+rand()*.66;
    reserve('Basalt outcrop',x,z,r);part('rock',i%3?'basalt':'basaltLight',x,y+h*.36,z,r,h,r*.8,0,rand()*6.3,(rand()-.5)*.18);stats.basaltColumns++;
    if(i%4===0){for(let j=0;j<3;j++){const a=j*2.1,xx=x+Math.cos(a)*r*.45,zz=z+Math.sin(a)*r*.45;part('crystal',j===0?'gold':'copper',xx,y+.25+j*.08,zz,.11,.5,.12,.2,a,.3);}stats.oreClusters++;}
    if(stats.basaltColumns>110)break;
  }
  // Shallow fracture fans and oxidised fragments make the empty ground read as
  // cooled lava rather than a bare brown hill. Their low silhouette is deliberate.
  for(let i=0;i<150;i++){
    const x=-15+rand()*48,z=-27.7+rand()*12.3,r=.15+rand()*.16;
    if(!free(x,z,r))continue;const y=heightAt(x,z),yaw=rand()*6.28;
    if(i%3===0){
      const len=.45+rand()*.35;
      if(!allowed(x,z,len*.8+.08))continue;
      for(let j=0;j<3;j++){const a=yaw+j*.43,xx=x+Math.cos(a)*len*.22,zz=z+Math.sin(a)*len*.22;part('box','charcoal',xx,heightAt(xx,zz)+.015,zz,len,.025,.025,0,-a);}
    } else {
      part('rock',i%2?'ash':'copper',x,y+.025,z,r,.08,r*.64,0,yaw);
      part('rock','charcoal',x+.09,y+.035,z+.06,r*.45,.09,r*.36,0,yaw+.7);
    }
  }
  for(const [key,matrices]of bucket){const [geo,material]=key.split(':');const inst=new THREE.InstancedMesh(geos[geo],mats[material],matrices.length);inst.name='Ember '+key;matrices.forEach((m,i)=>inst.setMatrixAt(i,m));inst.castShadow=true;inst.receiveShadow=true;inst.instanceMatrix.needsUpdate=true;root.add(inst);stats.drawCalls++;}
  stats.minimumRouteClearance=Math.min(...stats.placements.map(p=>p.clearance));
  scene.add(root);
  return {root,stats,update(t){clock.value=t;}};
}
