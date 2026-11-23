import * as THREE from 'three';

/** Cosmetic target markers; eligibility and committing the card belong to the caller. */
export function mountMapCardTargets(scene,labels,canvas,{reduced=false}={}){
 const root=new THREE.Group();root.name='Eligible card targets';scene.add(root);
 const ink=new THREE.MeshBasicMaterial({color:'#3f5ba8',side:THREE.DoubleSide,depthTest:false,depthWrite:false,transparent:true,opacity:.95});
 const mint=new THREE.MeshBasicMaterial({color:'#d3e6c4',side:THREE.DoubleSide,depthTest:false,depthWrite:false,transparent:true,opacity:.95});
 const outer=new THREE.RingGeometry(.94,1.22,40),inner=new THREE.RingGeometry(1,1.15,40),rings=new Map();
 let request=null,ids=new Set();
 function clear(notify=true){const previous=request;request=null;ids.clear();root.clear();rings.clear();labels.setTargets([],null);canvas.style.cursor='';if(notify)previous?.onCancel?.();}
 function choose(id){if(!request||!ids.has(String(id)))return false;const previous=request;clear(false);previous.onChoose(id);return true;}
 function arm(next){clear();if(!next?.targets?.length)return;request=next;ids=new Set(next.targets.map(String));labels.setTargets(next.targets,{card:next.label,onChoose:choose});canvas.style.cursor='crosshair';}
 function update(pawns,time){
  if(!request)return;
  for(const id of ids){const pawn=pawns.get(id);if(!pawn)continue;let ring=rings.get(id);
   if(!ring){ring=new THREE.Group();for(const [geometry,material]of [[outer,ink],[inner,mint]]){const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.renderOrder=25;ring.add(mesh);}rings.set(id,ring);root.add(ring);}
   ring.position.copy(pawn.body.position);ring.position.y+=.12;ring.scale.setScalar(reduced?1:1+Math.sin(time*3)*.04);
  }
 }
 const key=e=>{if(e.key==='Escape'&&request){e.preventDefault();clear();}};
 document.addEventListener('keydown',key);
 return{arm,clear,choose,update,get active(){return !!request;},debug:()=>({cardId:request?.cardId??null,targets:[...ids]}),destroy(){clear();document.removeEventListener('keydown',key);root.removeFromParent();outer.dispose();inner.dispose();ink.dispose();mint.dispose();}};
}
