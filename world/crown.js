import * as THREE from '../assets/vendor/three/three.module.js';

// Original, constructed masonry and botanical details; no floating primitive trees.
// Architecture sits in surveyed pockets outside the arena and numbered road.
export function buildCrown(scene, { heightAt, routeDistance }) {
  const root = new THREE.Group(); root.name = 'Crown Garden — the quiet ruins';
  const palette = { limestone:'#e2ddc5', chalk:'#f3ebd9', shadow:'#a5b19c', moss:'#729477', leaf:'#496e61', mint:'#a9d7be', blush:'#d0a7bc', iris:'#8475aa', gold:'#d5bd7e', ink:'#2f3a56', bronze:'#827c62', bark:'#c7b9a1', barkShade:'#847b67', sage:'#91ad8a', sageLight:'#bdcba1', willow:'#6c937d', plum:'#b19cb7', plumLight:'#d2bed0', parchment:'#ded7b7', timber:'#9c795b' };
  const materials = Object.fromEntries(Object.entries(palette).map(([n,color])=>[n,new THREE.MeshStandardMaterial({color,roughness:.94,metalness:0})]));
  for(const name of ['leaf','moss','sage','sageLight','willow','plum','plumLight','parchment'])materials[name].side=THREE.DoubleSide;
  const geometries = {
    drum:new THREE.CylinderGeometry(1,1,1,24),
    stem:new THREE.CylinderGeometry(1,1,1,6),
    taper:new THREE.CylinderGeometry(.86,1,1,16),
    block:new THREE.BoxGeometry(1,1,1),
    torus:new THREE.TorusGeometry(1,.065,5,32),
    petal:new THREE.SphereGeometry(1,6,4,0,Math.PI*2,0,Math.PI/2),
    leaf:leafGeometry(), gardenLeaf:gardenLeafGeometry(), branch:new THREE.CylinderGeometry(.65,1,1,7),
  };
  const buckets=new Map(), dummy=new THREE.Object3D(), occupied=[], placements=[];
  const stats={arches:0,columns:0,reflectingBasins:0,flowerBeds:0,flowers:0,ivyLeaves:0,mosaicStones:0,ghostLanterns:0,fernClumps:0,hedgeClumps:0,mosaicFragments:0,gardenTrees:0,treeBranches:0,treeLeaves:0,treeBenches:0,instances:0,drawCalls:0,minRouteClearance:Infinity};
  let seed=450262; const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function part(shape,mat,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0){
    const key=shape+':'+mat;if(!buckets.has(key))buckets.set(key,[]);
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();buckets.get(key).push(dummy.matrix.clone());stats.instances++;
  }
  function valid(x,z,r){return x>=-17.3+r*.2&&x<=17-r*.2&&z>=-16+r*.15&&z<=23.5-r&&Math.hypot(x,z)>=9.1+r&&Math.hypot(x+3.9,z-12.025)>=5+r&&routeDistance(x,z)>=1.65+r&&Number.isFinite(heightAt(x,z));}
  function claim(type,ax,az,r,search=2.8){
    let best=null,score=Infinity;
    for(let z=az-search;z<=az+search;z+=.25)for(let x=ax-search;x<=ax+search;x+=.25){
      if(!valid(x,z,r)||occupied.some(p=>Math.hypot(p.x-x,p.z-z)<p.radius+r+.25))continue;
      const samples=Array.from({length:16},(_,i)=>heightAt(x+Math.cos(i*Math.PI/8)*r,z+Math.sin(i*Math.PI/8)*r));
      if(samples.some(y=>!Number.isFinite(y))||Math.max(...samples)-Math.min(...samples)>1.8)continue;
      const d=Math.hypot(x-ax,z-az);if(d<score){score=d;best={type,x,z,radius:r,y:Math.max(heightAt(x,z),...samples)+.04,groundMin:Math.min(...samples)};}
    }
    if(best){occupied.push(best);placements.push(best);stats.minRouteClearance=Math.min(stats.minRouteClearance,routeDistance(best.x,best.z)-r);}return best;
  }
  // Deep bottom drum sinks into the real hill; successively inset courses form steps.
  function base(p,r){
    const depth=p.y-p.groundMin+.25;part('drum','shadow',p.x,p.y-depth/2,p.z,r*.89,depth,r*.89);
    // Retaining masonry follows the slope instead of an exposed smooth pedestal.
    for(let j=0;j<Math.ceil(depth/.27);j++)for(let k=0;k<16;k++){
      const a=(k+(j%2)*.5)*Math.PI/8,x=p.x+Math.cos(a)*r*.92,z=p.z+Math.sin(a)*r*.92,y=p.y-.14-j*.27;
      if(y+.14<heightAt(x,z)-.04)continue;
      part('block',j%3?'limestone':'shadow',x,y,z,r*.38,.25,r*.11,-a+Math.PI/2);
    }
    part('drum','limestone',p.x,p.y+.07,p.z,r,.14,r);part('drum','chalk',p.x,p.y+.19,p.z,r*.91,.1,r*.91);
  }
  function column(x,z,y,h,r=.32,broken=false){
    part('drum','shadow',x,y+.1,z,r*1.45,.2,r*1.45);
    part('drum','chalk',x,y+.25,z,r*1.28,.12,r*1.28);
    const courses=broken?3:5;
    for(let j=0;j<courses;j++)part('taper',j%2?'limestone':'chalk',x,y+.34+(j+.5)*(h-.6)/courses,z,r,(h-.6)/courses-.025,r,j*.13);
    // Fluted shafts carry thin vertical ribs; hand-cut stone rings stay visible in sun.
    for(let j=0;j<12;j++){const a=j/12*Math.PI*2;part('drum','limestone',x+Math.cos(a)*r*.9,y+h*.5+.1,z+Math.sin(a)*r*.9,.027,h-.68,.027);}
    part('drum',broken?'shadow':'chalk',x,y+h-.13,z,r*(broken?1:1.35),.2,r*(broken?1:1.35));stats.columns++;
  }
  function arch(ax,az,rotate=0){
    const p=claim('broken half arch',ax,az,1.5);if(!p)return;
    base(p,1.48);const y=p.y+.26,local=(x,z)=>({x:p.x+x*Math.cos(rotate)-z*Math.sin(rotate),z:p.z+x*Math.sin(rotate)+z*Math.cos(rotate)});
    for(const x of [-1,1]){const q=local(x,0);column(q.x,q.z,y,2.2,.25);}
    // Individually beveled voussoirs form a real open arch rather than a torus ornament.
    for(let i=0;i<11;i++){
      if(i===8)continue;const shape='arch'+i;if(!geometries[shape])geometries[shape]=archStone(i*Math.PI/11+.025,(i+1)*Math.PI/11-.025);
      part(shape,i%3===0?'chalk':'limestone',p.x,y+2.1,p.z,1,1,1,rotate);
    }
    const q=local(.86,.05);ivy(q.x,y+3.1,q.z,2.5,rotate);
    // Fallen keystone lies within its terrace, still grounded.
    const q2=local(.65,.7);part('block','chalk',q2.x,y+.16,q2.z,.35,.3,.38,rotate+.36,0,.14);
    for(let k=0;k<16;k++){const a=k/16*Math.PI*2;part('block',k%4?'shadow':'gold',p.x+Math.cos(a)*1.25,p.y+.25,p.z+Math.sin(a)*1.25,.11,.035,.2,-a);stats.mosaicStones++;}
    stats.arches++;
  }
  function ivy(x,y,z,length,yaw=0){
    for(let i=0;i<22;i++){const t=i/21,xx=x+Math.sin(t*8)*.11,zz=z+Math.cos(t*5)*.09,yy=y-t*length;
      part('leaf',i%4?'leaf':'moss',xx,yy,zz,.16,.21,.07,yaw+(i%2?-.6:.6),.2,i%2?.7:-.7);stats.ivyLeaves++;}
  }
  function basin(ax,az){
    const p=claim('moon reflecting basin',ax,az,1.2);if(!p)return;base(p,1.18);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(1.01,1.09,.32,40,1,true),materials.limestone);rim.position.set(p.x,p.y+.4,p.z);root.add(rim);
    part('drum','ink',p.x,p.y+.31,p.z,.99,.04,.99);
    part('torus','chalk',p.x,p.y+.56,p.z,1.04,1.04,1.04,0,Math.PI/2);
    const wm=new THREE.MeshStandardMaterial({color:'#78aaa0',roughness:.45,metalness:0,transparent:true,opacity:.82});
    const water=new THREE.Mesh(new THREE.CircleGeometry(.99,40),wm);water.rotation.x=-Math.PI/2;water.position.set(p.x,p.y+.43,p.z);root.add(water);
    for(let i=0;i<3;i++){const a=i*2.1;part('leaf','mint',p.x+Math.cos(a)*.5,p.y+.45,p.z+Math.sin(a)*.5,.23,.03,.31,a,Math.PI/2);}
    // Shallow contained water never intersects the land; slow ripples remain subtle.
    const waves=[];for(let i=0;i<2;i++){const wave=new THREE.Mesh(new THREE.RingGeometry(.45+i*.19,.46+i*.19,40),new THREE.MeshBasicMaterial({color:'#e9efce',transparent:true,opacity:.19,depthWrite:false}));wave.rotation.x=-Math.PI/2;wave.position.set(p.x,p.y+.448+i*.001,p.z);root.add(wave);waves.push(wave);}p.waves=waves;stats.reflectingBasins++;
  }
  function flower(x,z,y,color,scale=.5){
    const h=scale*(.7+random()*.4);part('stem','leaf',x,y+h*.5,z,.015,h,.015);
    for(let j=0;j<2;j++)part('leaf','leaf',x,y+h*.4,z,.1*scale,.27*scale,.06,j*2.7,.4,j?-.9:.9);
    for(let j=0;j<5;j++){const a=j/5*Math.PI*2;part('petal',color,x+Math.cos(a)*scale*.1,y+h,z+Math.sin(a)*scale*.1,.13*scale,.05*scale,.21*scale,-a);}
    part('drum','gold',x,y+h+.035*scale,z,.045*scale,.06*scale,.045*scale);stats.flowers++;
  }
  function bed(ax,az,r=.7){
    const p=claim('grounded iris garden',ax,az,r+.18,1.3);if(!p)return;
    // A garden grows from the hill, not from disconnected tall flowerpots.
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=p.x+Math.cos(a)*r*.88,z=p.z+Math.sin(a)*r*.88;part('block',i%3?'limestone':'chalk',x,heightAt(x,z)+.07,z,r*.32,.16,.13,-a);}
    for(let i=0;i<17;i++){const a=random()*Math.PI*2,d=Math.sqrt(random())*r*.62,x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;flower(x,z,heightAt(x,z)+.03,i%3?'iris':'blush',.85+random()*.35);}stats.flowerBeds++;
  }
  function fern(x,z,scale=1){
    if(!valid(x,z,.8*scale)||occupied.some(p=>Math.hypot(p.x-x,p.z-z)<(p.groundedRoots ? .62 : p.radius*.9+.3)))return;
    const y=heightAt(x,z);
    for(let f=0;f<7;f++){const a=f*Math.PI*2/7+random()*.2;
      for(let i=0;i<6;i++){const t=(i+1)/7,reach=t*.6*scale,yy=y+Math.sin(t*Math.PI*.8)*.65*scale;
        for(const side of [-1,1])part('leaf',f%3?'moss':'mint',x+Math.cos(a)*reach,yy,z+Math.sin(a)*reach,.19*(1-t*.6)*scale,.32*(1-t*.5)*scale,.12*scale,a+side*.65,-.7,side*.5);
      }
    }stats.fernClumps++;
  }
  function hedge(x,z,scale=1){
    const radius=.75*scale;if(!valid(x,z,radius)||occupied.some(p=>Math.hypot(p.x-x,p.z-z)<(p.groundedRoots ? .65 : p.radius+.15)))return;
    const y=heightAt(x,z);
    // Cut-leaf evergreen clusters, each with visible individual leaves and stems.
    for(let j=0;j<22;j++){const a=j*2.4,h=(.3+random()*.55)*scale,d=Math.sqrt(random())*.37*scale;
      part('stem','bronze',x+Math.cos(a)*d,y+h*.45,z+Math.sin(a)*d,.018*scale,h,.018*scale);
      for(let k=0;k<3;k++)part('leaf',j%4?'leaf':'moss',x+Math.cos(a)*d,y+h*(.5+k*.22),z+Math.sin(a)*d,.25*scale,.36*scale,.13*scale,a+k*1.8,-.7,k%2?.4:-.4);
    }stats.hedgeClumps++;
  }
  // Mature ornamental trees have visible branching skeletons and layered sprays of
  // individually folded leaves. No spheres, cones or inflated solid canopy blobs.
  function branch(a,b,r,mat='bark'){
    const v=new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z),key='branch:'+mat;
    if(!buckets.has(key))buckets.set(key,[]);
    dummy.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);dummy.scale.set(r,v.length(),r);
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());dummy.updateMatrix();
    buckets.get(key).push(dummy.matrix.clone());stats.instances++;stats.treeBranches++;
  }
  function gardenTree(ax,az,kind='sage',size=1){
    const radius=2.5*size;let p=null,best=Infinity;
    for(let z=az-2;z<=az+2;z+=.35)for(let x=ax-2;x<=ax+2;x+=.35){
      if(!valid(x,z,radius)||occupied.some(o=>Math.hypot(o.x-x,o.z-z)<o.radius+radius+.12))continue;
      const y=heightAt(x,z),score=Math.hypot(x-ax,z-az);
      if(!Number.isFinite(y)||score>=best)continue;
      best=score;p={type:kind+' ornamental tree',x,z,radius,y:y+.04,groundMin:y,groundedRoots:true};
    }
    if(!p)return;
    placements.push(p);occupied.push(p);stats.minRouteClearance=Math.min(stats.minRouteClearance,routeDistance(p.x,p.z)-radius);
    const h=(kind==='plum'?5.8:6.7)*size,origin={x:p.x,y:p.y-.12,z:p.z};
    const fork={x:p.x+.16*size,y:p.y+h*.42,z:p.z-.16*size};
    branch(origin,{x:p.x-.12*size,y:p.y+h*.23,z:p.z+.08*size},.30*size);
    branch({x:p.x-.12*size,y:p.y+h*.23,z:p.z+.08*size},fork,.24*size);
    // Short exposed roots follow the local hillside in small segments; a single
    // straight span over uneven ground reads as tripod legs rather than a tree.
    part('branch','bark',p.x,p.y+.11*size,p.z,.34*size,.34*size,.34*size);
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7+.13;
      let previous=null;
      for(let j=0;j<=5;j++){
        const d=(.13+j*.105)*size,aa=a+Math.sin(j*.6)*.12;
        const x=p.x+Math.cos(aa)*d,z=p.z+Math.sin(aa)*d;
        const point={x,y:heightAt(x,z)+(.09-j*.01)*size,z};
        if(previous)branch(previous,point,(.13-j*.018)*size,i%3?'bark':'barkShade');
        previous=point;
      }
    }
    const contain=(point,maxRadius)=>{const dx=point.x-p.x,dz=point.z-p.z,d=Math.hypot(dx,dz);if(d>maxRadius){point.x=p.x+dx/d*maxRadius;point.z=p.z+dz/d*maxRadius;}return point;};
    const colors=kind==='plum'?['plum','plumLight','parchment']:['willow','sage','sageLight'];
    for(let b=0;b<7;b++){
      const a=b*2.399+.23,reach=(b===6?.35:1.2+(b%3)*.24)*size;
      const tip={x:p.x+Math.cos(a)*reach,y:p.y+h*(.71+(b%3)*.11),z:p.z+Math.sin(a)*reach};
      const joint={x:p.x+Math.cos(a)*reach*.57,y:p.y+h*(.59+(b%3)*.08),z:p.z+Math.sin(a)*reach*.57};
      branch(fork,joint,.13*size);branch(joint,tip,.075*size);
      for(let c=0;c<6;c++){
        const ac=c*2.4+a,d=(.25+random()*.34)*size;
        const end=contain({x:tip.x+Math.cos(ac)*d,y:tip.y+(.12+random()*.36)*size,z:tip.z+Math.sin(ac)*d},1.9*size);
        branch(tip,end,.025*size,'barkShade');
        for(let l=0;l<14;l++){
          const al=l*2.4,d2=Math.sqrt(random())*.46*size;
          const leafPoint=contain({x:end.x+Math.cos(al)*d2,z:end.z+Math.sin(al)*d2},1.95*size),x=leafPoint.x,z=leafPoint.z,y=end.y+(random()-.5)*.35*size;
          part('gardenLeaf',colors[(c+l)%3],x,y,z,(.28+random()*.16)*size,.48*size,.30*size,al,-.9+random()*.8,(random()-.5)*.8);stats.treeLeaves++;
        }
        // Fine pendant sprays soften the silhouette without solid hanging lumps.
        if(c%2===0){
          const length=(kind==='plum'?.5:.95)*size;
          branch(end,{x:end.x+.08,y:end.y-length,z:end.z+.06},.012*size,'barkShade');
          for(let l=0;l<5;l++){const yy=end.y-l/5*length;
            part('gardenLeaf',colors[(l+1)%3],end.x+.08,yy,end.z+.06,.17*size,.31*size,.15*size,l*2.4,.3,.45);stats.treeLeaves++;
          }
        }
      }
    }
    // A quiet half-ring of timber seating rests on small individually grounded legs.
    if(stats.gardenTrees%2===0){
      for(let i=0;i<5;i++){
        const a=.25+i*.22,x=p.x+Math.cos(a)*1.1*size,z=p.z+Math.sin(a)*1.1*size,y=heightAt(x,z);
        part('block','timber',x,y+.43,z,.46*size,.10,.31*size,-a+Math.PI/2);
        for(const side of [-1,1]){const lx=x+Math.cos(a)*side*.10,lz=z+Math.sin(a)*side*.10;part('block','barkShade',lx,heightAt(lx,lz)+.20,lz,.06,.40,.06);}
      }stats.treeBenches++;
    }
    for(let i=0;i<22;i++){
      const a=i*2.4,d=(.4+random()*.8)*size,x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;
      part('gardenLeaf',colors[i%3],x,heightAt(x,z)+.03,z,.13,.025,.18,a,-Math.PI/2);stats.treeLeaves++;
      if(i%3===0)flower(x,z,heightAt(x,z)+.04,i%2?'chalk':'blush',.38);
    }
    stats.gardenTrees++;
  }
  function lantern(ax,az){
    const p=claim('Aave-inspired keeper lantern',ax,az,.57,2);if(!p)return;base(p,.54);column(p.x,p.z,p.y+.24,1,.18);
    const shape=new THREE.Shape();shape.moveTo(-.34,0);shape.lineTo(-.34,.44);shape.bezierCurveTo(-.34,.9,.34,.9,.34,.44);shape.lineTo(.34,0);shape.lineTo(.17,.12);shape.lineTo(0,0);shape.lineTo(-.17,.12);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,steps:1,curveSegments:16});
    const m=new THREE.Mesh(geo,materials.chalk);m.position.set(p.x,p.y+1.23,p.z);root.add(m);
    for(const dx of [-.12,.12])part('drum','ink',p.x+dx,p.y+1.72,p.z+.195,.04,.027,.065,0,Math.PI/2);
    part('torus','gold',p.x,p.y+2.11,p.z+.08,.1,.1,.1);stats.ghostLanterns++;
  }
  arch(-16,-6,.1);arch(14.8,-11,-.4);
  basin(-5,-15.7);basin(14.8,6);
  gardenTree(-8,20,'plum',1.12);gardenTree(-14,20,'sage',.94);gardenTree(1,19,'sage',.87);
  gardenTree(-16,-12,'plum',.88);gardenTree(15,-7,'sage',.90);gardenTree(-16,3,'sage',.95);gardenTree(14,14,'plum',.85);gardenTree(10,-15,'sage',.84);
  for(const [x,z]of [[-16,3],[-15.7,-12.5],[4,-15.5],[10,-15.4],[15,1],[14.7,13],[5.5,16.5],[10,16.2]])bed(x,z,.68);
  lantern(-13,-15.3);lantern(15.2,-3);
  // Low surviving column stumps and a fallen capital establish the ruin's history.
  for(const [ax,az] of [[-16.3,7],[1,-15.5],[14,16.5]]){const p=claim('broken column',ax,az,.64,1.8);if(!p)continue;base(p,.62);column(p.x,p.z,p.y+.24,.95,.3,true);ivy(p.x+.25,p.y+1.18,p.z,.72);}
  // Connected southern parterre: curved fragments of an old mosaic promenade,
  // low evergreen borders and generous openings toward the throne and dice bowl.
  for(let i=0;i<34;i++){
    const t=i/33,a=t*Math.PI*1.35+.15,x=-6+Math.cos(a)*6.8,z=20+Math.sin(a)*2.4;
    if(valid(x,z,.38)&&!occupied.some(p=>Math.hypot(p.x-x,p.z-z)<p.radius+.6)){
      const y=heightAt(x,z);part('block',i%4?'limestone':'chalk',x,y+.045,z,.65,.09,.4,-a+.2);
      for(let j=0;j<3;j++)part('block',j%2?'gold':'mint',x+(j-1)*.16,y+.095,z,.105,.016,.14,-a);stats.mosaicFragments++;
    }
    if(i%2===0){hedge(x-1.15,z+.85,.95);fern(x+.85,z-.65,1.1);}
  }
  // Plant architectural edges in overlapping botanical pockets, while leaving the
  // central ring's sightseeing gaps clear and keeping all foliage off the road.
  const groves=[[-15,-3],[-16,3],[-14,-14],[0,-15],[9,-15],[15,-7],[15,5],[13,14],[-12,18],[-10,22],[-3,21],[1,18]];
  for(const [ax,az]of groves){
    for(let j=0;j<8;j++){const a=j*2.4,d=.8+random()*1.7,x=ax+Math.cos(a)*d,z=az+Math.sin(a)*d;if(j%2)fern(x,z,.8+random()*.45);else hedge(x,z,.7+random()*.3);}
    for(let j=0;j<15;j++){const a=random()*Math.PI*2,d=Math.sqrt(random())*2.1,x=ax+Math.cos(a)*d,z=az+Math.sin(a)*d;
      if(!valid(x,z,.4)||occupied.some(p=>Math.hypot(p.x-x,p.z-z)<p.radius+.12))continue;
      flower(x,z,heightAt(x,z)+.025,j%4?'chalk':'blush',.65+random()*.4);
    }
  }
  // Connected groundcover drifts on the southern/eastern slopes bridge the
  // ornamental groves. Ground plants may live below a canopy, but not its trunk.
  for(const [ax,az]of [[12,8],[12,11],[15,5],[-8,18],[-6,21],[-11,18],[-14,17],[3,18],[9,17]]){
    for(let j=0;j<11;j++){
      const a=j*2.399,d=.4+Math.sqrt(j/11)*1.5,x=ax+Math.cos(a)*d,z=az+Math.sin(a)*d;
      if(j%3===0)hedge(x,z,.68+random()*.22);else fern(x,z,.62+random()*.33);
    }
  }
  for(const [key,list] of buckets){const [shape,mat]=key.split(':');const mesh=new THREE.InstancedMesh(geometries[shape],materials[mat],list.length);mesh.name='Garden '+key;list.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);stats.drawCalls++;}
  scene?.add(root);
  return{root,stats,placements:placements.map(({waves,...p})=>p),update(t){for(const p of placements)if(p.waves)p.waves.forEach((w,i)=>{const phase=(t*.12+i*.45)%1;w.scale.setScalar(.7+phase*.45);w.material.opacity=.16*Math.sin(phase*Math.PI);});}};
}

function leafGeometry(){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.7,.45,0,0,1,.15,0,0,0,0,1,.15,.7,.45,0],3));geo.computeVertexNormals();return geo;}
function archStone(a,b){const shape=new THREE.Shape(),r=.87,R=1.2;shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);shape.lineTo(Math.cos(a)*R,Math.sin(a)*R);for(let j=1;j<=3;j++){const t=a+(b-a)*j/3;shape.lineTo(Math.cos(t)*R,Math.sin(t)*R);}shape.lineTo(Math.cos(b)*r,Math.sin(b)*r);for(let j=2;j>=0;j--){const t=a+(b-a)*j/3;shape.lineTo(Math.cos(t)*r,Math.sin(t)*r);}shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:.42,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1});geo.translate(0,0,-.21);return geo;}

function gardenLeafGeometry(){
  // A six-lobed folded leaf fan, deliberately open, angular and thin like foliage.
  const points=[[0,0,0],[-.46,.25,.02],[-.56,.55,0],[-.27,.8,.04],[0,1,.08],[.31,.79,.035],[.57,.51,0],[.43,.25,.01]];
  const center=[0,.48,.13],vertices=[];
  for(let i=0;i<points.length;i++)vertices.push(...center,...points[i],...points[(i+1)%points.length]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();return geo;
}
