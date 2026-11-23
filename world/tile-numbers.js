import * as THREE from 'three';
import {paintTileKey,tileKey} from './tile-key.js';
/** Separate flat print quads prevent bending/shearing the font with the road. */
export function buildTileNumbers(scene,{ROUTE,edgeHeight,rules}){
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=864;const ctx=canvas.getContext('2d'),pos=[],uv=[],idx=[],specials=new Set(rules.tiles.map(t=>t.number)),types=new Map(rules.tiles.map(t=>[t.number,t.type]));
 for(const [i,cell] of ROUTE.cells.entries()){
  const x=(i%16)*128,y=Math.floor(i/16)*96,type=types.get(i+1),key=tileKey(type);ctx.fillStyle='#2a2c31';ctx.beginPath();ctx.roundRect(x+7,y+13,114,76,23);ctx.fill();ctx.fillStyle=key?.color??'#f8f5ee';ctx.strokeStyle='#2a2c31';ctx.lineWidth=3.5;ctx.beginPath();ctx.roundRect(x+5,y+8,114,76,23);ctx.fill();ctx.stroke();
  if(key)paintTileKey(ctx,type,{x:x+13,y:y+29,size:32});
  ctx.font=`600 ${key?(i>=99?36:46):56}px "Martian Mono", monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=i===143?'#3f5ba8':'#2f3a56';ctx.fillText(String(i+1),x+(key?82:62),y+48,key?68:106);
  const fraction=specials.has(i+1)?.28:.5,j=Math.round(fraction*(cell.strip.length-1)),frame=cell.strip[j],before=cell.strip[Math.max(0,j-1)].center,after=cell.strip[Math.min(cell.strip.length-1,j+1)].center;
  const forward=new THREE.Vector3(after.x-before.x,0,after.y-before.y).normalize(),right=new THREE.Vector3(-forward.z,0,forward.x),center=new THREE.Vector3((frame.center.x-800)*.065,edgeHeight(i+j/(cell.strip.length-1))+.18,(frame.center.y-655)*.065);
  const length=Math.hypot(after.x-before.x,after.y-before.y)*.065,slope=(edgeHeight(i+Math.min(12,j+1)/12)-edgeHeight(i+Math.max(0,j-1)/12))/length;forward.y=slope;
  const base=pos.length/3;for(const [r,f] of [[1,-1],[1,1],[-1,1],[-1,-1]]){const p=center.clone().addScaledVector(right,r*1.05).addScaledVector(forward,f*.7875);pos.push(...p.toArray());}idx.push(base,base+1,base+2,base,base+2,base+3);
  const u=(i%16)/16,v=1-Math.floor(i/16)/9;uv.push(u+1/16,v-1/9,u+1/16,v,u,v,u,v-1/9);
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(idx);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.3,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}),group=new THREE.Group(),major=[],minor=[];
 for(let i=0;i<144;i++)(specials.has(i+1)||(i+1)%6===0?major:minor).push(...idx.slice(i*6,i*6+6));
 const meshes=[major,minor].map(indices=>{const g=geometry.clone();g.setIndex(indices);const m=new THREE.Mesh(g,material);m.receiveShadow=true;group.add(m);return m;});geometry.dispose();group.name='Adaptive section numbers';group.setDetail=value=>meshes[1].visible=value;scene.add(group);return group;
}
