import * as THREE from 'three';

const C = { ink:0x2a2c31,navy:0x2f3a56,cobalt:0x3f5ba8,mint:0xa9d7be,sage:0x7fb79a,leaf:0xd3e6c4,cream:0xf8f5ee,gold:0xe8be68,pink:0xe5b5a6 };
const clay = color => new THREE.MeshStandardMaterial({ color, roughness:.9, metalness:0 });
const materials = Object.fromEntries(Object.entries(C).map(([key,color])=>[key,clay(color)]));
// Graphic face details stay readable when the toy turns away from the sun.
materials.faceCream=new THREE.MeshBasicMaterial({color:C.cream});
materials.faceInk=new THREE.MeshBasicMaterial({color:C.ink});
const outline = new THREE.MeshBasicMaterial({color:C.ink,side:THREE.BackSide});
function piece(geometry, material, parent, xyz=[0,0,0], scale=[1,1,1], ink=true) {
  const mesh = new THREE.Mesh(geometry,typeof material==='string'?materials[material]:material);
  mesh.position.set(...xyz);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;
  if(ink){const edge=new THREE.Mesh(geometry,outline);edge.scale.setScalar(1.025);mesh.add(edge);}
  parent.add(mesh);return mesh;
}
function roundedBox(width,height,depth,radius=.12){
  const geo=new THREE.BoxGeometry(width,height,depth,5,5,5),p=geo.attributes.position;
  const core=new THREE.Vector3(width/2-radius,height/2-radius,depth/2-radius),v=new THREE.Vector3(),nearest=new THREE.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);nearest.set(Math.max(-core.x,Math.min(core.x,v.x)),Math.max(-core.y,Math.min(core.y,v.y)),Math.max(-core.z,Math.min(core.z,v.z)));v.sub(nearest).normalize().multiplyScalar(radius).add(nearest);p.setXYZ(i,v.x,v.y,v.z);}
  geo.computeVertexNormals();return geo;
}

export {createCritterModel as createCritter3D} from '../critter-models.js';

const FACE_NORMALS={1:new THREE.Vector3(0,1,0),2:new THREE.Vector3(0,0,1),3:new THREE.Vector3(1,0,0),4:new THREE.Vector3(-1,0,0),5:new THREE.Vector3(0,0,-1),6:new THREE.Vector3(0,-1,0)};
const DOTS={1:[[0,0]],2:[[-1,1],[1,-1]],3:[[-1,1],[0,0],[1,-1]],4:[[-1,-1],[-1,1],[1,-1],[1,1]],5:[[-1,-1],[-1,1],[0,0],[1,-1],[1,1]],6:[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]};
function targetQuaternion(value){if(!FACE_NORMALS[value])throw Error('Die value must be 1–6');return new THREE.Quaternion().setFromUnitVectors(FACE_NORMALS[value],new THREE.Vector3(0,1,0));}
/** 1.4-unit rounded ivory die, with true geometric pips on all six faces. */
export function createDie3D(){
  const die=new THREE.Group();die.name='Adventure die';
  piece(roundedBox(1.4,1.4,1.4,.14),'cream',die);
  for(const [value,normal] of Object.entries(FACE_NORMALS)){
    const face=new THREE.Group();face.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);face.position.copy(normal).multiplyScalar(.704);die.add(face);
    for(const [x,y] of DOTS[value]){
      const dot=new THREE.Mesh(new THREE.CircleGeometry(.082,24),Number(value)===1?materials.cobalt:materials.ink);dot.position.set(x*.29,y*.29,.002);face.add(dot);
    }
  }
  die.userData.landY=.72;die.userData.value=1;return die;
}
export function orientDie(die,value){die.quaternion.copy(targetQuaternion(value));die.userData.value=value;return die;}

/** progress in [0,1]. Visual-only toss; caller supplies the final displayed values. */
export function animateDice(diceGroups,progress,values){
  const p=Math.max(0,Math.min(1,Number(progress)||0));
  // Validate every result before moving any scene object.
  const targets=diceGroups.map((_,i)=>targetQuaternion(values[i]));
  diceGroups.forEach((die,i)=>{
    if(!die.userData.tossBase||p<(die.userData.lastTossProgress??0))die.userData.tossBase={x:die.position.x,z:die.position.z};
    const base=die.userData.tossBase,landY=die.userData.landY??.72;
    const flight=Math.sin(Math.PI*p),bounce=p>.74?Math.abs(Math.sin((p-.74)/.26*Math.PI*2))*(1-p)*1.8:0;
    die.position.set(base.x+Math.sin(p*Math.PI*2+i)*flight*.75,landY+flight*(3.6+i*.7)+bounce,base.z+Math.sin(p*Math.PI+i*.6)*flight*.5);
    const spin=new THREE.Quaternion().setFromEuler(new THREE.Euler(p*Math.PI*(7+i),p*Math.PI*(5+i*.5),p*Math.PI*(6-i*.3)));
    const landing=THREE.MathUtils.smoothstep(p,.69,1);die.quaternion.copy(spin).slerp(targets[i],landing);
    die.userData.lastTossProgress=p;
    if(p===1){die.quaternion.copy(targets[i]);die.position.set(base.x,landY,base.z);die.userData.value=values[i];}
  });
}
