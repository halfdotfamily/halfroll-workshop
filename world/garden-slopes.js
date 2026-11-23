import * as THREE from '../assets/vendor/three/three.module.js';

// Three small pieces of the old garden, surveyed against the rendered ground.
// Keeping these fragments low preserves the route and the ornamental tree crowns.
export function buildGardenSlopes(scene, {heightAt, routeDistance}) {
  const root = new THREE.Group();
  root.name = 'Crown Garden — weathered hillside terraces';
  const colors = {stone:'#c9c7ae', light:'#e0dbc1', shade:'#a1aa91', moss:'#738f6e', leaf:'#486f59', pale:'#a9ba88', stem:'#716f4c', gold:'#c6b480'};
  const materials = Object.fromEntries(Object.entries(colors).map(([key,color]) => [key,new THREE.MeshStandardMaterial({color,roughness:.97})]));
  for (const key of ['leaf','moss','pale']) materials[key].side = THREE.DoubleSide;
  const cut = new THREE.Shape();
  cut.moveTo(-.47,-.47); cut.lineTo(.47,-.47); cut.lineTo(.47,.47); cut.lineTo(-.47,.47); cut.closePath();
  const block = new THREE.ExtrudeGeometry(cut,{depth:.94,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:1,steps:1});
  block.translate(0,0,-.47);
  const leaf = new THREE.BufferGeometry();
  leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.48,.42,.04,0,.82,.13, 0,0,0,0,.82,.13,.48,.42,.04],3)); leaf.computeVertexNormals();
  const geometries={block,leaf,stem:new THREE.CylinderGeometry(1,1,1,5)};
  const batches = new Map(), dummy = new THREE.Object3D(), placements=[];
  const stats={retainingFragments:0,masonryBlocks:0,ruinedStairs:0,stairTreads:0,overlooks:0,vines:0,ivyLeaves:0,instances:0,drawCalls:0,minRouteClearance:Infinity};

  function add(shape,mat,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0) {
    const key=shape+':'+mat;
    if(!batches.has(key)) batches.set(key,[]);
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();
    batches.get(key).push(dummy.matrix.clone());stats.instances++;
    if(shape==='block')stats.masonryBlocks++;
  }
  function survey(x,z,w,d,angle=0) {
    const points=[];
    for(const a of [-.5,0,.5]) for(const b of [-.5,0,.5]){
      const xx=x+a*w*Math.cos(angle)+b*d*Math.sin(angle),zz=z-a*w*Math.sin(angle)+b*d*Math.cos(angle),y=heightAt(xx,zz);
      if(!Number.isFinite(y)||routeDistance(xx,zz)<1.92||Math.hypot(xx,zz)<9.7||Math.hypot(xx+3.9,zz-12.025)<5.5)return null;
      points.push({x:xx,z:zz,y});
    }
    return {x,z,w,d,angle,groundMin:Math.min(...points.map(p=>p.y)),groundMax:Math.max(...points.map(p=>p.y)),points};
  }
  function record(type,p,bottom,top) {
    const clearance=Math.min(...p.points.map(q=>routeDistance(q.x,q.z)));
    stats.minRouteClearance=Math.min(stats.minRouteClearance,clearance);
    placements.push({type,...p,bottom,top,clearance});
  }
  function vine(x,z,top,length,phase=0) {
    const ground=heightAt(x,z);
    if(!Number.isFinite(ground)||routeDistance(x,z)<2.12)return;
    const end=Math.max(ground+.08,top-length),n=Math.max(4,Math.ceil((top-end)/.13));
    add('stem','stem',x,(top+end)/2,z,.014,top-end,.014);
    for(let i=0;i<=n;i++){
      const t=i/n,y=top+(end-top)*t,xx=x+Math.sin(t*5+phase)*.045;
      for(const side of [-1,1])add('leaf',i%4?'leaf':'pale',xx+side*.045,y,z+.025,.19,.24,.23,side*.7+phase,.16,side*.9);
      stats.ivyLeaves+=2;
    }
    stats.vines++;
  }
  function fragment(points) {
    let count=0;
    for(let i=0;i<points.length;i++) {
      if(i===4)continue; // An eroded gap interrupts the long masonry line.
      const [x,z,angle]=points[i],p=survey(x,z,.75,.46,angle);
      if(!p)continue;
      const top=p.groundMax+.24+(i%3===0?.14:0),bottom=p.groundMin-.14;
      const rows=Math.max(2,Math.ceil((top-bottom)/.29)),rh=(top-bottom)/rows;
      for(let r=0;r<rows;r++) {
        // Individual partly buried courses, with alternating vertical joints.
        const half=r%2===0;
        if(half)for(const side of [-1,1])add('block',(r+i)%4?'stone':'shade',x+Math.cos(angle)*side*.19,bottom+(r+.5)*rh,z-Math.sin(angle)*side*.19,.36,rh-.015,.46,angle);
        else add('block',(r+i)%4?'stone':'shade',x,bottom+(r+.5)*rh,z,.74,rh-.015,.46,angle);
      }
      if(i%5!==2)add('block',i%3?'light':'moss',x,top+.055,z,.79,.13,.52,angle);
      record('retaining masonry',p,bottom,top+.12);count++;
      if(i%2===0){
        const vx=x+Math.sin(angle)*.29,vz=z+Math.cos(angle)*.29;
        vine(vx,vz,top+.1,1.25,i*.37);
        // Root rosette grows from a joint in the cap, then trails down the face.
        for(let k=0;k<5;k++)add('leaf',k%2?'leaf':'moss',x,top+.12,z,.23,.32,.24,k*1.26,-1,.4);
      }
    }
    if(count)stats.retainingFragments++;
  }

  // East flank faces the woodland; the south fragment sits below the plum trees.
  fragment(Array.from({length:12},(_,i)=>[17.58+.08*Math.sin(i*.44),.1+i*.72,Math.PI/2-.04*Math.cos(i*.44)]));
  fragment(Array.from({length:11},(_,i)=>[-11.1+i*.72,21.8+.16*Math.sin(i*.48),-.1*Math.cos(i*.48)]));

  // The worn stair reaches a small overlook beside the existing western arch.
  // Solid individual risers meet surveyed terrain; no floating slab staircase.
  const stairX=-18.8,startZ=1.05,treads=11,run=.38;
  let lastTop=-Infinity;
  for(let i=0;i<treads;i++) {
    const z=startZ-i*run,p=survey(stairX,z,1.28,.39);
    if(!p)continue;
    const top=Math.max(p.groundMax+.09,lastTop+.07),bottom=p.groundMin-.12;
    // The fifth slab has a narrow diagonal-looking fracture, not a missing tread.
    const halves=i===4||i===8;
    for(const side of halves?[-1,1]:[0])add('block',i%4?'light':'stone',stairX+side*.325,(top+bottom)/2,z,halves?.62:1.28,top-bottom,.385,halves?side*.015:0);
    record('supported stair tread',p,bottom,top);stats.stairTreads++;lastTop=top;
    if(i===0||i===3||i===7){
      const x=stairX-.77,q=survey(x,z,.23,.32);
      if(q){const bottom=q.groundMin-.08,top=q.groundMax+.3;add('block','shade',x,(top+bottom)/2,z,.23,top-bottom,.32);record('broken stair edging',q,bottom,top);}
    }
  }
  stats.ruinedStairs=stats.stairTreads===treads?1:0;
  const overlook=survey(stairX,-3.13,1.28,.38);
  if(overlook){
    const top=Math.max(overlook.groundMax+.1,lastTop+.08),bottom=overlook.groundMin-.14;
    for(let i=0;i<3;i++)add('block',i===1?'light':'stone',stairX+(i-1)*.425,(top+bottom)/2,-3.13,.415,top-bottom,.38);
    record('overlook terrace',overlook,bottom,top);stats.overlooks++;
    for(const [dx,h] of [[-.48,.61],[.48,.32]]){
      add('block','shade',stairX+dx,top+.09,-3.18,.27,.18,.28);
      add('block','light',stairX+dx,top+.18+h/2,-3.18,.21,h,.23);
      vine(stairX+dx-.12,-3.1,top+.25+h,.85,dx);
    }
    // A weathered half-moon inlay marks the destination without adding text.
    for(let i=0;i<7;i++){
      const a=i/6*Math.PI;
      add('block','gold',stairX+Math.cos(a)*.23,top+.013,-3.18+Math.sin(a)*.14,.068,.018,.065,-a);
    }
  }

  for(const [key,matrices] of batches){
    const [shape,mat]=key.split(':'),mesh=new THREE.InstancedMesh(geometries[shape],materials[mat],matrices.length);
    matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;
    mesh.name='Garden slope '+key;root.add(mesh);stats.drawCalls++;
  }
  root.userData.placements=placements;scene?.add(root);
  return {root,stats,placements};
}
