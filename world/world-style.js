import * as THREE from 'three';

// "Chill pop" art pass: one shared grade for every authored scenery colour, so
// all regions move together toward a saturated, sunny, toy-like palette.
// Textured materials (tiles, wordmark), Critters and dice are never graded.
const hsl={h:0,s:0,l:0};
export function gradeColor(color){
 color.getHSL(hsl);
 let {h,s,l}=hsl;
 // Olive and sage greens become fresh grass; blue-greens stay leafy.
 if(h>.12&&h<.45&&s>.06){const pull=1-Math.abs(h-.29)/.18;h+=(.30-h)*Math.max(0,pull)*.45;s=Math.min(.72,s*1.45+.1);l=Math.min(.78,l*.97);}
 // Teals and blues read as clear water and sky.
 else if(h>=.45&&h<.7&&s>.06){s=Math.min(.8,s*1.4+.06);l=Math.min(.85,l*1.02);}
 // Warm earth, wood, roofs and flowers keep their hue with a cheerful lift.
 else if(s>.06){s=Math.min(1,s*1.45+.06);l=Math.min(.86,l*1.03);}
 // Neutral greys get a faint warm cast instead of looking like concrete.
 else{h=.09;s=.12;l=Math.min(.9,l*1.04);}
 return color.setHSL(h,s,l);
}
function gradeAttribute(attribute){
 const c=new THREE.Color();
 for(let i=0;i<attribute.count;i++){c.setRGB(attribute.getX(i),attribute.getY(i),attribute.getZ(i));gradeColor(c);attribute.setXYZ(i,c.r,c.g,c.b);}
 attribute.needsUpdate=true;
}
export function applyChillPop(scene,{exclude=[]}={}){
 const skip=new Set(),materials=new Set(),geometries=new Set(),stats={materials:0,vertexColors:0,instances:0};
 scene.traverse(o=>{if(o.userData.characterId!==undefined)exclude=[...exclude,o];});
 for(const root of exclude)root?.traverse(o=>skip.add(o));
 scene.traverse(o=>{
  if(skip.has(o))return;
  if(o.isInstancedMesh&&o.instanceColor&&!geometries.has(o.instanceColor)){geometries.add(o.instanceColor);gradeAttribute(o.instanceColor);stats.instances++;}
  const color=o.geometry?.attributes?.color;
  if(color&&!geometries.has(color)){geometries.add(color);gradeAttribute(color);stats.vertexColors++;}
  for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){
   if(materials.has(m)||m.map||m.vertexColors||m.isShaderMaterial||!m.color)continue;
   materials.add(m);gradeColor(m.color);stats.materials++;
  }
 });
 return stats;
}
