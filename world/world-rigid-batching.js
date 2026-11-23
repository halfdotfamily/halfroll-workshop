import {batchStaticScenery} from './mobile-world.js';

export function batchHarborScenery(harbor,dockRelief){
 const stats={before:0,after:0,merged:0};
 // Pack rigid parts in the boat's own coordinate system first. Island meshes
 // must skip the moving root so its bobbing and rocking remain independent.
 for(const packed of [batchStaticScenery(harbor.dynamicRoots),batchStaticScenery([harbor.root,dockRelief.root],harbor.dynamicRoots)]){
  for(const key of ['before','after','merged'])stats[key]+=packed[key];
 }
 return stats;
}
