import {getCritterSharedResources} from '../game/critter-models.js';

const retiredPawns=new WeakSet();

// A pawn body and its occlusion silhouette share geometries. Retire the pair
// together, once. Module-owned primitives/materials outlive every pawn/world.
export function retirePawn(pawn){
 if(!pawn||retiredPawns.has(pawn))return;
 retiredPawns.add(pawn);
 const branches=[pawn.body,pawn.silhouette].filter(Boolean);
 for(const branch of branches)branch.removeFromParent();
 disposeResources(branches);
}

export function disposeSceneResources(scene){disposeResources([scene]);}

function disposeResources(roots){
 const shared=getCritterSharedResources(),geometries=new Set(),materials=new Set(),textures=new Set(),shadows=new Set();
 for(const root of roots)root.traverse(object=>{
  if(object.geometry&&!shared.geometries.has(object.geometry))geometries.add(object.geometry);
  for(const material of [object.material,object.customDepthMaterial,object.customDistanceMaterial].flat().filter(Boolean)){
   if(shared.materials.has(material))continue;
   materials.add(material);
   for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  }
  if(object.shadow)shadows.add(object.shadow);
 });
 for(const shadow of shadows)shadow.dispose();
 for(const geometry of geometries)geometry.dispose();
 for(const texture of textures)texture.dispose();
 for(const material of materials)material.dispose();
}
