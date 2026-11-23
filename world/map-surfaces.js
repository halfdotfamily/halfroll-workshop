import * as THREE from 'three';
import {buildRoundedTiles} from './rounded-map-tiles.js';
import {buildRegionalEdges} from './regional-edges.js';
import {ROUTE} from './route/board-art.js';
import {heightAt,edgeHeight,routeDistance} from './terrain.js';
import {gradeColor} from './world-style.js';

// Approved map material/geometry detail. No lights, exposure or weather edits.
export function buildMapSurfaces(scene,options={}){
 const root=new THREE.Group();root.name='Map surface detail';scene.add(root);
 let seed=11047;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const changes=[],enabled={value:1},stats={grassTufts:0,edgeStones:0,looseStones:0,woodMaterials:0,treeMaterials:0,tileCount:144};
 const gradedSet=colors=>new Set(colors.map(c=>gradeColor(new THREE.Color('#'+c)).getHexString()));
 const coord=p=>new THREE.Vector3((p.x-800)*.065,0,(p.y-655)*.065);
 const texture=canvas=>{const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;};
 const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 function swap(mesh,material){changes.push({mesh,before:mesh.material,after:material});mesh.material=material;}

 let activeRules=options.rules,tiles=buildRoundedTiles(scene,root,activeRules);stats.tileCount=tiles.stats.count;stats.tileGeometry=tiles.stats;const regional=buildRegionalEdges(root,options);stats.regional=regional.stats;

 // Broad continuous grain, not high-frequency screen noise. Compose with the
 // original terrain shader so its canyon treatment is preserved verbatim.
 function mineral(mesh,kind){
  if(!mesh?.material||Array.isArray(mesh.material))return;
  const old=mesh.material,m=old.clone(),previous=old.onBeforeCompile.bind(old),key=old.customProgramCacheKey();
  m.onBeforeCompile=shader=>{
   previous(shader);shader.uniforms.startDetail=enabled;
   shader.vertexShader='varying vec3 startWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 startP=vec4(transformed,1.);
    #ifdef USE_INSTANCING
     startP=instanceMatrix*startP;
    #endif
    startWorld=(modelMatrix*startP).xyz;
    #include <project_vertex>`);
   shader.fragmentShader=`varying vec3 startWorld;uniform float startDetail;
    float shash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float snoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(shash(i),shash(i+vec2(1,0)),f.x),mix(shash(i+vec2(0,1)),shash(i+vec2(1,1)),f.x),f.y);}
    `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float area=(1.-smoothstep(12.,17.,abs(startWorld.x+10.)))*(1.-smoothstep(7.,11.,abs(startWorld.z-35.)))*startDetail;
    float startMottle=snoise(startWorld.xz*2.8+startWorld.yy*.4);
    float fine=snoise(startWorld.xz*18.+startWorld.yy*3.);
    ${kind==='grass'?`float turfPatch=snoise(startWorld.xz*.85);
     diffuseColor.rgb*=mix(1.,.86+turfPatch*.18+startMottle*.10,area);
     diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.11,1.015,.83),area*smoothstep(.57,.83,turfPatch)*.5);`:
     kind==='bark'?`float fibre=snoise(startWorld.xz*24.+vec2(startWorld.y*.7));
      diffuseColor.rgb*=mix(1.,.72+fibre*.32+startMottle*.12,area);`:
     kind==='leaf'?`diffuseColor.rgb*=mix(1.,.91+startMottle*.16,area);`:
     `float mineralCloud=snoise(vec2(startWorld.x*1.43+startWorld.y*.76,startWorld.z*1.37-startWorld.y*.49));
      float layer=sin(startWorld.y*3.1+mineralCloud*3.);
      diffuseColor.rgb*=mix(1.,.89+mineralCloud*.16+fine*.025+layer*.025,area);`}
   `);
  };
  m.customProgramCacheKey=()=>key+'-start-surface-'+kind;swap(mesh,m);
 }
 mineral(scene.getObjectByName('Continuous sculpted hills'),'grass');
 const coast=scene.getObjectByName('Mossfall weathered coast');coast?.traverse(o=>{if(o.isMesh&&/stone/i.test(o.name))mineral(o,'stone');});
 scene.getObjectByName('Island coastal geology')?.traverse(o=>{if(o.isMesh)mineral(o,'stone');});
 for(const name of ['Zone flora','Mossfall — imported CC0 botanical layers'])scene.getObjectByName(name)?.traverse(o=>{
  if(!o.isMesh||Array.isArray(o.material)||!o.material.color)return;
  const hsl={};o.material.color.getHSL(hsl);if(hsl.s<.1)return;
  if(hsl.h<.16){mineral(o,'bark');stats.treeMaterials++;}
  else if(hsl.h<.46){mineral(o,'leaf');stats.treeMaterials++;}
 });

 // Existing plank geometry, nails and seams remain. Grain follows each plank's
 // UVs, with knots and shallow fibres rather than a new brown colour grade.
 const grain=canvas(256,256),g=grain.getContext('2d');g.fillStyle='#eee9dd';g.fillRect(0,0,256,256);
 for(let j=0;j<90;j++){const y=rand()*256;g.strokeStyle=`rgba(78,49,22,${.06+rand()*.16})`;g.lineWidth=.5+rand()*1.3;g.beginPath();for(let x=0;x<=256;x+=8){const yy=y+Math.sin(x*.025+j)*2+Math.sin(x*.08+j)*.6;x?g.lineTo(x,yy):g.moveTo(x,yy);}g.stroke();}
 for(let j=0;j<3;j++){const x=25+rand()*206,y=25+rand()*206;for(let r=2;r<9;r+=2){g.strokeStyle='rgba(76,46,22,.15)';g.lineWidth=.8;g.beginPath();g.ellipse(x,y,r*2.4,r*.5,.02,0,7);g.stroke();}}
 const woodMap=texture(grain),woodHeight=woodMap.clone();woodHeight.colorSpace=THREE.NoColorSpace;
 const harbor=scene.getObjectByName('Drift Dock — arrival market'),woodColors=gradedSet(['a48258','c5a36f','67533e','79674b']);
 harbor?.traverse(o=>{if(!o.isMesh||Array.isArray(o.material)||!woodColors.has(o.material.color?.getHexString()))return;const m=o.material.clone();m.map=woodMap;m.bumpMap=woodHeight;m.bumpScale=.035;m.roughness=.94;swap(o,m);stats.woodMaterials++;});
 const courtStone=gradedSet(['adb297','a0aa91','b5b79b','e6dec4']);
 harbor?.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&courtStone.has(o.material.color?.getHexString()))mineral(o,'stone');});

 // Low, hand-laid stones replace the perfectly smooth shoulder silhouette.
 // The walking/icon lane is never covered; blocks sit just outside each edge.
 const stoneGeo=new THREE.DodecahedronGeometry(1,0),rockMat=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true});
 const stones=[],loose=[],tufts=[],dummy=new THREE.Object3D();
 const stoneColors=['#b8aa8d','#c6b998','#d1c3a3','#a99f86'];
 function grassAt(x,z,size=1){const y=heightAt(x,z);if(y==null||routeDistance(x,z)<1.75||Math.hypot(x+7.8,z-39.3)<3.78)return;tufts.push({x,y:y-.025,z,s:size*(.7+rand()*.5),a:rand()*6.28});}
 for(let n=0;n<10;n++){
  const strip=ROUTE.cells[n].strip;
  for(let side=0;side<2;side++){
   let last=null;
   for(let j=0;j<strip.length;j++){
    const a=coord(side?strip[j].right:strip[j].left),b=coord(side?strip[j].left:strip[j].right),out=a.clone().sub(b).normalize();
    if(last&&last.distanceTo(a)<.34)continue;last=a;
    const y=edgeHeight(n+j/(strip.length-1));
    stones.push({p:a.clone().addScaledVector(out,.20).setY(y+.075),s:[.21+rand()*.05,.115+rand()*.035,.26+rand()*.07],a:Math.atan2(out.x,out.z),c:stoneColors[Math.floor(rand()*4)]});
    if(rand()<.52){const p=a.clone().addScaledVector(out,.55+rand()*.5),gy=heightAt(p.x,p.z);if(gy!=null)loose.push({p:p.setY(gy+.04),s:[.05+rand()*.10,.045,.08+rand()*.1],a:rand()*6.28,c:stoneColors[0]});}
    if(rand()<.68)for(let k=0;k<3;k++){const p=a.clone().addScaledVector(out,.65+rand()*.8);grassAt(p.x+(rand()-.5)*.5,p.z+(rand()-.5)*.5);}
   }
  }
 }
 // Patch clusters, with breathing space between them, around the start and the
 // market's stepping-stone path; clear of the court and shop counters.
 for(const [x,z,r]of[[-3,38,1.5],[-3,33,1.1],[-6,32,1.2],[-11.7,39.4,.65],[-12,36.4,.7],[-9.2,31,1.1],[-1.2,29,1.2]]){
  for(let k=0;k<28;k++){const a=rand()*6.28,d=Math.sqrt(rand())*r;grassAt(x+Math.cos(a)*d,z+Math.sin(a)*d,.8);}
  const y=heightAt(x,z);if(y!=null&&routeDistance(x,z)>2.1)for(let k=0;k<3;k++)loose.push({p:new THREE.Vector3(x+k*.15,y+.06,z+k*.13),s:[.17+rand()*.2,.12+rand()*.1,.2],a:rand()*6.28,c:stoneColors[k]});
 }
 function instances(list,name){const m=new THREE.InstancedMesh(stoneGeo,rockMat,list.length);m.name=name;list.forEach((v,i)=>{dummy.position.copy(v.p);dummy.scale.fromArray(v.s);dummy.rotation.set(.03,v.a,.08);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);m.setColorAt(i,new THREE.Color(v.c));});m.castShadow=m.receiveShadow=true;root.add(m);return m;}
 stoneGeo.dispose();rockMat.dispose();
 // Experimental roadside and scattered stones removed at user request.
 stats.edgeStones=0;stats.looseStones=0;
 // Five curved tapered blades per tuft; one instanced draw for the whole patch.
 const pos=[],colors=[];
 for(let j=0;j<5;j++){
  const a=j*2.399,dx=Math.cos(a),dz=Math.sin(a),h=.22+j*.042,w=.035,lean=.08+j*.012;
  const points=[[dx*w,0,dz*w],[-dx*w,0,-dz*w],[dx*lean-dz*w*.45,h*.58,dz*lean+dx*w*.45],[dx*w,0,dz*w],[dx*lean-dz*w*.45,h*.58,dz*lean+dx*w*.45],[dx*lean*1.6,h,dz*lean*1.6]];
  for(const [x,y,z]of points){pos.push(x,y,z);const c=new THREE.Color(y>h*.8?'#a1b551':y>0?'#74953e':'#486b30');colors.push(c.r,c.g,c.b);}
 }
 const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));blade.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));blade.computeVertexNormals();
 const gm=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});
 const grass=new THREE.InstancedMesh(blade,gm,tufts.length);grass.name='Layered roadside grass tufts';
 tufts.forEach((v,i)=>{dummy.position.set(v.x,v.y,v.z);dummy.scale.setScalar(v.s);dummy.rotation.set(0,v.a,0);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);});grass.receiveShadow=true;root.add(grass);stats.grassTufts=tufts.length;
 const time={value:0};gm.onBeforeCompile=shader=>{shader.uniforms.startTime=time;shader.vertexShader='uniform float startTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(startTime*1.25+instanceMatrix[3].x*.7+instanceMatrix[3].z)*position.y*position.y*.16;');};gm.customProgramCacheKey=()=> 'start-grass-breeze-v1';
 return{root,stats,update(t,reduced){time.value=reduced?0:t;},setRules(rules){
  const labels=scene.getObjectByName('Adaptive section numbers');if(labels)labels.visible=false;
  if(rules===activeRules)return;
  activeRules=rules;tiles.destroy();tiles=buildRoundedTiles(scene,root,rules);stats.tileGeometry=tiles.stats;
 },destroy(){
  tiles.destroy();for(const c of changes){c.mesh.material=c.before;c.after.dispose();}woodMap.dispose();woodHeight.dispose();
 }};
}
