import * as THREE from 'three';

// Original volumetric sailboat adaptation of OpenSea's main-sail/jib silhouette.
// Reference: https://docs.opensea.io/docs/logos — no logo decal is used.
export function createOpenSeaBoat(){
 const root=new THREE.Group();root.name='OpenSea-inspired white sailing boat';
 const colors={white:'#eee9dc',blue:'#2081e2',deep:'#1868b7',wood:'#b69b70',gold:'#cbb477',rope:'#d7cbb0'};
 const mats=Object.fromEntries(Object.entries(colors).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:.84,side:THREE.DoubleSide})]));
 function beam(a,b,r,material){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),m=new THREE.Mesh(new THREE.CylinderGeometry(r*.82,r,va.distanceTo(vb),7),mats[material]);m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());root.add(m);m.castShadow=true;return m;}
 const hull=[],tints=[],col=[new THREE.Color(colors.deep),new THREE.Color(colors.blue),new THREE.Color(colors.white),new THREE.Color(colors.white)];
 const point=(t,side,band)=>{const z=-3.35+t*6.7,w=.08+Math.sin(Math.PI*t)**.7*1.22;return [side*w*band/4,-.69+band*.24+.17*Math.abs(t-.5)*2,z];};
 for(let i=0;i<24;i++)for(const side of [-1,1])for(let b=0;b<4;b++){
  const a=point(i/24,side,b),c=point((i+1)/24,side,b+1),d=point(i/24,side,b+1),bb=point((i+1)/24,side,b);
  for(const p of [a,bb,c,a,c,d]){hull.push(...p);tints.push(...col[b]);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(hull,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(tints,3));geo.computeVertexNormals();const body=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.8}));body.castShadow=body.receiveShadow=true;root.add(body);
 for(let i=1;i<22;i++){const t=i/22,w=(.08+Math.sin(Math.PI*t)**.7*1.22)*1.88,plank=new THREE.Mesh(new THREE.BoxGeometry(w,.07,.275),mats.wood);plank.position.set(0,.16,-3.35+t*6.7);root.add(plank);}
 for(const side of [-1,1])for(let i=0;i<24;i++)beam(point(i/24,side,4),point((i+1)/24,side,4),.055,'white');
 beam([0,.15,-.5],[0,5.8,-.5],.065,'white');
 beam([0,.82,-.45],[0,.82,2.65],.055,'gold');
 // Curved broad mainsail aft and triangular jib forward, separated by the mast.
 function sail(points){const v=[],uv=[];const center=[.22,points.reduce((s,p)=>s+p[0],0)/points.length,points.reduce((s,p)=>s+p[1],0)/points.length];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];v.push(...center,0,a[0],a[1],0,b[0],b[1]);uv.push(.5,.5,0,0,1,1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();const m=new THREE.Mesh(g,mats.white);m.castShadow=true;root.add(m);
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];beam([0,a[0],a[1]],[0,b[0],b[1]],.019,'blue');}
 }
 sail([[5.48,-.34],[4.82,.48],[3.95,1.28],[2.85,2.01],[1.7,2.48],[.98,2.62],[.98,-.34]]);
 sail([[4.65,-.72],[1.04,-3.08],[1.04,-.72]]);
 for(const [a,b] of [[[0,5.65,-.5],[0,.36,-3.24]],[[0,5.65,-.5],[0,.4,3.1]],[[-1.05,.3,.5],[0,5.5,-.5]],[[1.05,.3,.5],[0,5.5,-.5]]])beam(a,b,.018,'rope');
 const flagGeo=new THREE.BufferGeometry();flagGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,5.78,-.5,0,5.78,.5,0,5.45,-.5],3));flagGeo.computeVertexNormals();root.add(new THREE.Mesh(flagGeo,mats.blue));
 for(const z of [1.35,2.4]){const seat=new THREE.Mesh(new THREE.BoxGeometry(1.5,.12,.32),mats.white);seat.position.set(0,.48,z);root.add(seat);}
 const hatch=new THREE.Mesh(new THREE.BoxGeometry(.72,.17,.8),mats.deep);hatch.position.set(0,.28,.3);root.add(hatch);
 for(const side of [-1,1])for(const z of [.9,1.7]){const port=new THREE.Mesh(new THREE.TorusGeometry(.12,.026,5,16),mats.gold);port.rotation.y=Math.PI/2;port.position.set(side*1.13,.04,z);root.add(port);}
 root.userData={sails:2,reference:'https://docs.opensea.io/docs/logos',logoDecals:0};return root;
}
