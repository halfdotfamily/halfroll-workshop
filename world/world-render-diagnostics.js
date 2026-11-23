// Read-only profiling, requested explicitly by QA; never traversed per frame.
export function collectWorldRenderDiagnostics(scene,renderer){
 const roots=[];
 for(const root of scene.children){
  const row={name:root.name||root.type,meshes:0,materialGroups:0,shadowCasters:0,instances:0};
  function visit(node){
   if(!node.visible)return;
   if(node.isMesh){row.meshes++;row.materialGroups+=Array.isArray(node.material)?Math.max(1,node.geometry.groups.length):1;if(node.castShadow)row.shadowCasters++;if(node.isInstancedMesh)row.instances+=node.count;}
   for(const child of node.children)visit(child);
  }
  visit(root);if(row.meshes)roots.push(row);
 }
 roots.sort((a,b)=>b.materialGroups-a.materialGroups);
 return{scope:'visible scene-tree mesh/material groups, before camera frustum and shadow-pass culling',renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},roots};
}
