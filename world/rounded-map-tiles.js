import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ROUTE} from './route/board-art.js';
import {edgeHeight} from './terrain.js';
import {tileKey,paintTileKey} from './tile-key.js';

// All 144 real bevelled tiles, following the original route and its uphill grade.
// Uses the active room board; appearance never changes authoritative rules.
export function buildRoundedTiles(scene,parent,rules){
 const count=144,root=new THREE.Group();root.name='Rounded whole-map tiles';parent.add(root);
 const types=new Map(rules.tiles.map(t=>[t.number,t.type]));
 // Keep the original indexed road as the raycast target: its face indices
 // identify cells. Hiding its render does not change picking or game rules.
 scene.traverse(o=>{if(o.userData.sectionTriangles)o.visible=false;});
 const oldNumbers=scene.getObjectByName('Adaptive section numbers');if(oldNumbers)oldNumbers.visible=false;
 const toWorld=p=>new THREE.Vector3((p.x-800)*.065,0,(p.y-655)*.065);
 const widths=[],tops=[],sides=[],prints=[],plainPrints=[],atlas=document.createElement('canvas'),printAtlas=document.createElement('canvas');
 atlas.width=printAtlas.width=2048;atlas.height=printAtlas.height=1152;
 const atlasCtx=atlas.getContext('2d'),printCtx=printAtlas.getContext('2d');
 function atlasUV(geo,n){const uv=geo.attributes.uv;for(let k=0;k<uv.count;k++)uv.setXY(k,(n%16+uv.getX(k))/16,1-(Math.floor(n/16)+1-uv.getY(k))/9);}
 function part(geo,group,color){const g=new THREE.BufferGeometry();for(const name of ['position','normal','uv']){const a=geo.attributes[name];g.setAttribute(name,new THREE.BufferAttribute(a.array.slice(group.start*a.itemSize,(group.start+group.count)*a.itemSize),a.itemSize));}if(color){const c=new THREE.Color(color).multiplyScalar(.70),rgb=[];for(let k=0;k<g.attributes.position.count;k++)rgb.push(c.r,c.g,c.b);g.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));}return g;}

 for(let n=0;n<count;n++){
  const strip=ROUTE.cells[n].strip,steps=strip.length-1;
  const length=strip.slice(1).reduce((s,f,j)=>s+toWorld(f.center).distanceTo(toWorld(strip[j].center)),0);
  const width=toWorld(strip[0].left).distanceTo(toWorld(strip[0].right)),inset=.12,w=width-2*inset,h=length-.24,r=.22;
  widths.push({number:n+1,width:w,length:h,gap:.24});
  const shape=new THREE.Shape();shape.moveTo(r,0);shape.lineTo(w-r,0);shape.quadraticCurveTo(w,0,w,r);shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(r,h);shape.quadraticCurveTo(0,h,0,h-r);shape.lineTo(0,r);shape.quadraticCurveTo(0,0,r,0);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:true,bevelThickness:.06,bevelSize:.055,bevelSegments:3,steps:1,curveSegments:7});
  const positions=geo.attributes.position,uv=geo.attributes.uv;
  for(let j=0;j<positions.count;j++){
   const x=positions.getX(j),s=positions.getY(j),z=positions.getZ(j),t=THREE.MathUtils.clamp((s+.12)/length,0,1),f=t*steps,k=Math.min(steps-1,Math.floor(f)),mix=f-k;
   const left=toWorld(strip[k].left).lerp(toWorld(strip[k+1].left),mix),right=toWorld(strip[k].right).lerp(toWorld(strip[k+1].right),mix),p=right.lerp(left,(x+inset)/width);
   positions.setXYZ(j,p.x,edgeHeight(n+t)-.11+z,p.z);uv.setXY(j,x/w,s/h);
  }
  geo.computeVertexNormals();
  const type=types.get(n+1),key=tileKey(type),base=key?.color??['#eee3c8','#f3e9d3'][n%2];
  const art=document.createElement('canvas');art.width=art.height=512;const c=art.getContext('2d');
  c.fillStyle=base;c.fillRect(0,0,512,512);
  // Recessed inner face: broad, quiet edge treatment, legible at game zoom.
  c.strokeStyle='rgba(78,64,47,.25)';c.lineWidth=4;c.beginPath();c.roundRect(28,28,456,456,34);c.stroke();
  c.strokeStyle='rgba(255,255,245,.65)';c.lineWidth=3;c.beginPath();c.moveTo(55,34);c.lineTo(455,34);c.stroke();
  // Four small inset corner marks are part of the tile face, not loose props.
  c.fillStyle='rgba(87,76,55,.32)';for(const [x,y]of[[55,55],[457,55],[55,457],[457,457]]){c.beginPath();c.arc(x,y,3.5,0,7);c.fill();}
  atlasCtx.drawImage(art,(n%16)*128,Math.floor(n/16)*128,128,128);
  for(const group of geo.groups){const g=part(geo,group,group.materialIndex===1?base:null);if(group.materialIndex===0){atlasUV(g,n);tops.push(g);}else sides.push(g);}geo.dispose();
  // Print gets its own rigid tangent plane. Curved road UVs must not shear digits.
  const print=document.createElement('canvas');print.width=print.height=512;const ink=print.getContext('2d');
  ink.fillStyle='#34374a';ink.textAlign='center';ink.textBaseline='middle';
  if(key){paintTileKey(ink,type,{x:171,y:74,size:170});ink.font='600 112px "Martian Mono", monospace';ink.fillText(String(n+1),256,359);}
  else{ink.font='600 112px "Martian Mono", monospace';ink.fillText(String(n+1),256,268);}
  printCtx.drawImage(print,(n%16)*128,Math.floor(n/16)*128,128,128);
  const mid=steps/2,center=toWorld(strip[mid].center),forward=toWorld(strip[mid+1].center).sub(toWorld(strip[mid-1].center)),run=forward.length();forward.normalize();
  forward.y=(edgeHeight(n+(mid+1)/steps)-edgeHeight(n+(mid-1)/steps))/run;
  const across=new THREE.Vector3(-forward.z,0,forward.x);center.y=edgeHeight(n+.5)+.175;
  const p=[];for(const [x,y]of[[-1,-1],[1,-1],[1,1],[-1,1]])p.push(...center.clone().addScaledVector(across,x*w/2).addScaledVector(forward,y*w/2).toArray());
  const flat=new THREE.BufferGeometry();flat.setAttribute('position',new THREE.Float32BufferAttribute(p,3));flat.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));flat.setIndex([0,1,2,0,2,3]);flat.computeVertexNormals();
  atlasUV(flat,n);const unindexed=flat.toNonIndexed();(key?prints:plainPrints).push(unindexed);flat.dispose();
 }
 const texture=canvas=>{const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;};
 function batch(list,material,name,cast){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=cast;mesh.receiveShadow=true;root.add(mesh);return mesh;}
 batch(tops,new THREE.MeshStandardMaterial({map:texture(atlas),roughness:.96}),'144 rounded tile faces',true);
 batch(sides,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),'144 tile bevels',true);
 const inkTexture=texture(printAtlas),inkOptions={map:inkTexture,transparent:true,alphaTest:.01,roughness:1,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1};
 batch(prints,new THREE.MeshStandardMaterial(inkOptions),'Special tile symbols and numbers',false);
 const normalMaterial=new THREE.MeshStandardMaterial({...inkOptions,opacity:0});
 const normal=batch(plainPrints,normalMaterial,'Ordinary tile numbers — close view only',false);
 const stats={count,rigidPrint:true,uniformNumberFont:112,uniformPrintWidth:2.62,ordinaryNumberOpacity:0,ordinaryNumberPixels:0,drawCalls:4,types:Object.fromEntries(types),specialCount:prints.length,atlasSize:[2048,1152],tiles:widths};
 normal.onBeforeRender=(renderer,scene,camera)=>{
  // Screen size tracks both wheel zoom and responsive orthographic framing.
  const px=2.62*renderer.domElement.clientHeight*camera.zoom/(camera.top-camera.bottom);
  // Production camera is capped at 5x, with a viewport-dependent fit span.
  // Reveal only in its closest range, including phones with a wider fit span.
  normalMaterial.opacity=THREE.MathUtils.smoothstep(camera.zoom,3.8,4.9);
  stats.ordinaryNumberOpacity=+normalMaterial.opacity.toFixed(3);stats.ordinaryNumberPixels=+px.toFixed(1);
 };
 return{root,stats,destroy(){
  const maps=new Set();root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(o.material.map)maps.add(o.material.map);o.material.dispose();}});maps.forEach(t=>t.dispose());root.removeFromParent();
 }};
}
