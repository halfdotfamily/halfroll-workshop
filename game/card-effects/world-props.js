import * as THREE from 'three';
import {FIST_PATH} from './fist-shape.js';

const C={ink:'#2a2c31',paper:'#f8f5ee',mint:'#a9d7be',cobalt:'#3f5ba8',navy:'#303b59',sun:'#eedb94',lilac:'#e4ddeb',coral:'#e98e7c'};
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color:C[color]||color,roughness:.62,metalness:0,...extra});
function add(parent,geometry,color,pos=[0,0,0],extra={}){const node=new THREE.Mesh(geometry,material(color,extra));node.position.fromArray(pos);parent.add(node);return node;}
function rounded(width,height,radius){const x=-width/2,y=-height/2,s=new THREE.Shape();s.moveTo(x+radius,y);s.lineTo(x+width-radius,y);s.quadraticCurveTo(x+width,y,x+width,y+radius);s.lineTo(x+width,y+height-radius);s.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);s.lineTo(x+radius,y+height);s.quadraticCurveTo(x,y+height,x,y+height-radius);s.lineTo(x,y+radius);s.quadraticCurveTo(x,y,x+radius,y);return s;}
function plaque(parent,w,h,r,color,z=0,depth=.045){return add(parent,new THREE.ExtrudeGeometry(rounded(w,h,r),{depth,bevelEnabled:false,curveSegments:10}),color,[0,0,z]);}
function curvedArrow(parent,sign){const g=new THREE.Group();parent.add(g);g.position.set(sign*.13,0,.15);g.rotation.z=sign<0?Math.PI:0;add(g,new THREE.TorusGeometry(.43,.085,6,32,Math.PI*1.46),'paper');const shape=new THREE.Shape();shape.moveTo(-.2,-.1);shape.lineTo(.2,-.1);shape.lineTo(0,.23);shape.closePath();const tip=add(g,new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false}),'paper',[-.06,-.43,.01]);tip.rotation.z=-Math.PI/2;return g;}

export function createReverseCard(parent){
 const card=new THREE.Group();card.name='Reverse rounded card';parent.add(card);
 plaque(card,1.46,2.04,.18,'ink',-.05,.1);plaque(card,1.38,1.96,.15,'paper',.025,.07);plaque(card,1.2,1.76,.11,'coral',.101,.025);
 const oval=add(card,new THREE.CircleGeometry(.59,48),'paper',[0,0,.133]);oval.scale.set(.84,1.28,1);oval.rotation.z=-.45;
 const inner=add(card,new THREE.CircleGeometry(.54,48),'cobalt',[0,0,.139]);inner.scale.copy(oval.scale);inner.rotation.z=oval.rotation.z;
 for(const sign of [-1,1]){const arrows=new THREE.Group();card.add(arrows);arrows.position.set(sign*.44,sign*.72,.14);arrows.scale.setScalar(.24);curvedArrow(arrows,1);curvedArrow(arrows,-1);}
 const center=new THREE.Group();card.add(center);center.position.z=.03;center.scale.setScalar(.8);curvedArrow(center,1);curvedArrow(center,-1);
 // A cobalt reverse face makes the single physical flip readable as a card.
 plaque(card,1.28,1.85,.12,'cobalt',-.061,.005);
 return card;
}

export function createDiamondFist(parent){
 const fist=new THREE.Group();fist.name='Diamond hand · Twemoji raised fist';parent.add(fist);
 for(const [index,commands]of FIST_PATH.entries()){
  const path=new THREE.ShapePath();for(const [op,points]of commands){if(op==='moveTo')path.moveTo(...points[0]);else if(op==='lineTo')path.lineTo(...points[0]);else if(op==='curveTo')path.bezierCurveTo(...points.flat());else if(op==='qCurveTo')path.quadraticCurveTo(...points.flat());else if(op==='closePath')path.currentPath.closePath();}
  const shapes=path.toShapes(false),geometry=new THREE.ExtrudeGeometry(shapes,{depth:.12,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.008,bevelThickness:.025,curveSegments:4});
  const edge=add(fist,geometry,'ink',[0,0,-.05+index*.025]);edge.scale.set(1.7,1.7,1);
  const face=add(fist,geometry.clone(),index===0?'cobalt':'mint',[0,0,.015+index*.11],{roughness:.18,metalness:.2});face.scale.set(1.61,1.61,1);
 }
 // Large, restrained crystal facets: the wrapped thumb and curved knuckle
 // seams belong to the ready Twemoji fist, rather than invented finger cubes.
 for(const [points,color]of [
  [[[-.5,-.22],[.35,-.18],[.08,-.7]],'cobalt'],
  [[[-.5,-.22],[-.2,-.5],[.08,-.7]],'#82b8c0'],
  [[[-.5,-.22],[.35,-.18],[.02,-.02]],'paper'],
  [[[.35,-.18],[.08,-.7],[.56,-.38]],'#6f9fc2'],
 ]){const facet=new THREE.Shape();facet.moveTo(...points[0]);for(const point of points.slice(1))facet.lineTo(...point);facet.closePath();add(fist,new THREE.ShapeGeometry(facet),color,[0,0,.3],{side:THREE.DoubleSide});}
 fist.userData.source='Twemoji v14.0.2 / raised fist U+270A / CC BY 4.0';return fist;
}

/** A single coherent entrance: dark core, broad ink rim and two turning ribbons. */
export function createPortal(parent,{color='cobalt',wormhole=false}={}){
 const portal=new THREE.Group();parent.add(portal);portal.userData.portal=true;
 add(portal,new THREE.TorusGeometry(.96,.13,8,56),'ink');add(portal,new THREE.TorusGeometry(.95,.075,8,56),color,[0,0,.075],{emissive:C[color],emissiveIntensity:.15});
 const core=add(portal,new THREE.CircleGeometry(.88,48),'navy',[0,0,-.015],{side:THREE.DoubleSide});core.name='Portal dark center';
 const swirl=new THREE.Group();swirl.name='Portal live swirl';portal.add(swirl);
 for(let arm=0;arm<2;arm++){const points=[];for(let i=0;i<=48;i++){const p=i/48,a=p*Math.PI*2.25+arm*Math.PI,r=.08+p*.73;points.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,.055));}add(swirl,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,wormhole?.042:.06,5,false),arm?'mint':'lilac');}
 const lip=add(portal,new THREE.TorusGeometry(.81,.022,4,48,Math.PI*.55),'paper',[0,0,.09]);lip.rotation.z=.2;
 portal.scale.set(1,1.3,1);if(wormhole)readableWorldProp(portal,84,node=>node.name!=='Portal dark center');return portal;
}

/** Tiny world-space props may remain legible through foliage, like the slot. */
export function readableWorldProp(node,order=90,filter=()=>true){node.traverse(o=>{if((!o.isMesh&&!o.isLine)||!filter(o))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m)continue;const clone=m.clone();clone.depthTest=false;clone.depthWrite=false;o.material=clone;}o.renderOrder=order++;});return node;}

export function faceWorldProp(node,camera,{roll=0,tilt=0}={}){if(!node||!camera)return;const parent=node.parent;parent?.updateWorldMatrix(true,false);node.quaternion.copy(parent?parent.getWorldQuaternion(new THREE.Quaternion()).invert():new THREE.Quaternion()).multiply(camera.getWorldQuaternion(new THREE.Quaternion()));node.rotateZ(roll);node.rotateY(tilt);}
