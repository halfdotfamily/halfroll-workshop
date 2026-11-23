import * as THREE from 'three';
import {weatherAt} from './world-cycle.js';
import {WORLD_COAST} from './coast-layout.js';

// Weather layers over the island: valley mist, rain and snow. Particles are
// animated in the vertex shader, so the CPU cost stays flat. 'auto' drifts
// through balanced 15-minute slots: clear, mist, rain and snow each get
// 45 minutes per three-hour cycle. The schedule survives reloads.
export const WEATHER_MODES=['clear','auto','mist','rain','snow'];
export const WEATHER_MARGIN=22;
export function weatherFootprint(bounds){return{center:new THREE.Vector2((bounds.min.x+bounds.max.x)/2,(bounds.min.z+bounds.max.z)/2),halfSize:new THREE.Vector2((bounds.max.x-bounds.min.x)/2+WEATHER_MARGIN,(bounds.max.z-bounds.min.z)/2+WEATHER_MARGIN)};}
export function mistBankLayout(heightAt,{compact=false}={}){
 const banks=[];
 function add(x,z,rx,ry,rz){const terrain=heightAt?.(x,z),ground=Number.isFinite(terrain)?terrain:-4.2;banks.push({x,z,y:ground+ry*.45,rx,ry,rz});}
 for(let i=0;i<WORLD_COAST.length;i+=compact?7:4){const p=WORLD_COAST[i],k=banks.length;add(p.x*.94,p.z*.94,21+(k%3)*2,2.5+(k%3)*.35,15+(k%2)*3);}
 for(const [x,z]of [[-24,4],[26,16],[-13,-19],[15,30]])add(x,z,21,3.2,15);
 return banks;
}
export function buildWorldWeather(scene,{bounds,heightAt,compact=false,reducedMotion=false,random=Math.random,now=Date.now,onGloom=()=>{}}={}){
 const root=new THREE.Group();root.name='Weather';scene.add(root);
 const time={value:0},min=bounds.min,max=bounds.max,size=new THREE.Vector3().subVectors(max,min);
 const base=min.y-2,H=Math.max(28,size.y+14),footprint=weatherFootprint(bounds);
 // Sample terrain once. Drifting particles fade at the surface instead of
 // continuing through hills. Shared GPU lookup; no per-frame terrain queries.
 const GRID=compact?64:96,low=Math.min(base,-4.5),range=Math.max(1,max.y+3-low),pixels=new Uint8Array(GRID*GRID*4);
 for(let z=0;z<GRID;z++)for(let x=0;x<GRID;x++){
  const px=footprint.center.x+((x+.5)/GRID*2-1)*footprint.halfSize.x,pz=footprint.center.y+((z+.5)/GRID*2-1)*footprint.halfSize.y;
  const h=heightAt?.(px,pz),v=Math.round(255*THREE.MathUtils.clamp(((Number.isFinite(h)?h:-4.2)-low)/range,0,1)),i=(z*GRID+x)*4;
  pixels[i]=pixels[i+1]=pixels[i+2]=v;pixels[i+3]=255;
 }
 const terrain=new THREE.DataTexture(pixels,GRID,GRID,THREE.RGBAFormat);terrain.minFilter=terrain.magFilter=THREE.LinearFilter;terrain.needsUpdate=true;
 let terrainUsers=2;
 function fall(count,snowfall){
  const geo=new THREE.PlaneGeometry(1,1),variation=new Float32Array(count*4);
  const u={lifeTime:time,uH:{value:H},uBase:{value:base},uCenter:{value:footprint.center},uHalfSize:{value:footprint.halfSize},uTerrain:{value:terrain},uLow:{value:low},uRange:{value:range},uOpacity:{value:0},uColor:{value:new THREE.Color('#eef5ff')}};
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:u,
   vertexShader:`uniform float lifeTime,uH,uBase,uLow,uRange;uniform vec2 uCenter,uHalfSize;uniform sampler2D uTerrain;
    attribute vec4 variation;varying float vFade;varying vec2 vUv;
    void main(){vec3 o=instanceMatrix[3].xyz;float phase=variation.x*6.28318;
     float speed=${snowfall?'mix(.85,2.0,variation.y)':'mix(16.,24.,variation.y)'};
     float travel=mod(o.y+lifeTime*speed,uH),y=uH-travel;
     vec2 wind=vec2(1.25,.42)+vec2(sin(lifeTime*.34),cos(lifeTime*.27))*.32;
     vec2 drift=wind*travel/speed;
     ${snowfall?'drift+=vec2(sin(lifeTime*1.3+phase),cos(lifeTime*.87+phase))*.65;':''}
     vec3 p=vec3(o.x+drift.x,uBase+y,o.z+drift.y);
     vec2 terrainUv=(p.xz-uCenter)/(uHalfSize*2.)+.5;
     float ground=uLow+texture2D(uTerrain,terrainUv).r*uRange;
     float edge=1.-smoothstep(.72,1.,length((p.xz-uCenter)/uHalfSize));
     vFade=smoothstep(.12,${snowfall?'1.0':'1.6'},p.y-ground)*(1.-smoothstep(uH-3.,uH,y))*edge*mix(.6,1.,variation.w);
     vec4 eye=viewMatrix*vec4(p,1.);
     ${snowfall?`float radius=mix(.156,.359,variation.z);float angle=lifeTime*.5+phase;mat2 spin=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
     vec2 offset=spin*position.xy*radius;offset.x*=.75+.25*sin(lifeTime*2.+phase);eye.xy+=offset;`:
     `vec2 velocity=(viewMatrix*vec4(wind.x,-speed,wind.y,0.)).xy;vec2 axis=normalize(velocity);vec2 side=vec2(axis.y,-axis.x);
     eye.xy+=side*position.x*mix(.0375,.078,variation.z)+axis*position.y*mix(.759,1.794,variation.y);`}
     vUv=uv;gl_Position=projectionMatrix*eye;}`,
   fragmentShader:`uniform float uOpacity;uniform vec3 uColor;varying float vFade;varying vec2 vUv;
    void main(){vec2 p=(vUv-.5)*2.;
     float shape=${snowfall?'exp(-dot(p,p)*2.5)*(1.-smoothstep(.65,1.,length(p)))':'pow(max(0.,1.-abs(p.x)),1.4)*(1.-smoothstep(.45,1.,abs(p.y)))'};
     float alpha=uOpacity*vFade*shape;if(alpha<.003)discard;gl_FragColor=vec4(uColor,alpha);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
    }`});
  mat.addEventListener('dispose',()=>{if(--terrainUsers===0)terrain.dispose();});
  const mesh=new THREE.InstancedMesh(geo,mat,count),m=new THREE.Matrix4();
  for(let i=0;i<count;i++){const a=random()*Math.PI*2,r=Math.sqrt(random());m.makeTranslation(footprint.center.x+Math.cos(a)*r*footprint.halfSize.x,random()*H,footprint.center.y+Math.sin(a)*r*footprint.halfSize.y);mesh.setMatrixAt(i,m);for(let j=0;j<4;j++)variation[i*4+j]=random();}
  geo.setAttribute('variation',new THREE.InstancedBufferAttribute(variation,4));mesh.name=snowfall?'Wind-drifting soft snow':'Wind-slanted rain streaks';mesh.frustumCulled=false;mesh.visible=false;root.add(mesh);return{mesh,u};
 }
 const rain=fall(compact?850:1900,false),snow=fall(compact?1080:2325,true);
 // Restrained impacts on terrain. No additional lights or particle objects.
 const hits=[],hitLimit=compact?90:220;
 for(let i=0;i<hitLimit*5&&hits.length<hitLimit;i++){
  const x=footprint.center.x+(random()*2-1)*footprint.halfSize.x,z=footprint.center.y+(random()*2-1)*footprint.halfSize.y,h=heightAt?.(x,z);
  if(Number.isFinite(h)&&h>-3.7)hits.push([x,h+.06,z]);
 }
 const splashGeo=new THREE.PlaneGeometry(1,1);splashGeo.rotateX(-Math.PI/2);
 const splashPhases=new Float32Array(Math.max(1,hits.length));for(let i=0;i<hits.length;i++)splashPhases[i]=random();
 splashGeo.setAttribute('phase',new THREE.InstancedBufferAttribute(splashPhases,1));
 const splashMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{lifeTime:time,uOpacity:{value:0}},
  vertexShader:`uniform float lifeTime;attribute float phase;varying vec2 vUv;varying float age;
   void main(){age=fract(lifeTime*.85+phase);vUv=uv;vec3 p=position*mix(.12,.7,age);gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}`,
  fragmentShader:`uniform float uOpacity;varying vec2 vUv;varying float age;
   void main(){float r=length((vUv-.5)*2.);float ring=smoothstep(.60,.78,r)*(1.-smoothstep(.80,1.,r));float a=ring*(1.-age)*(1.-age)*uOpacity;if(a<.003)discard;gl_FragColor=vec4(.78,.84,.86,a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const splashes=new THREE.InstancedMesh(splashGeo,splashMat,Math.max(1,hits.length)),hitMatrix=new THREE.Matrix4();splashes.count=hits.length;
 hits.forEach((p,i)=>splashes.setMatrixAt(i,hitMatrix.makeTranslation(...p)));splashes.name='Rain ground ripples';splashes.frustumCulled=false;splashes.visible=false;root.add(splashes);
 // Broad, shallow overlapping banks form a restrained ground haze. Integrate
 // actual thickness so low camera angles never reveal flat fog sheets.
 const mistMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{lifeTime:time,uOpacity:{value:0},uTint:{value:new THREE.Color(0xc2d0d4)}},
  vertexShader:`varying vec3 vW,vUnit,vRadius;void main(){mat4 m=modelMatrix*instanceMatrix;vec4 w=m*vec4(position,1.);vW=w.xyz;vUnit=position;vRadius=vec3(length(m[0].xyz),length(m[1].xyz),length(m[2].xyz));gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform float lifeTime,uOpacity;uniform vec3 uTint;varying vec3 vW,vUnit,vRadius;
   float h(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
   void main(){
    vec3 towardEye=isOrthographic?normalize(vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2])):normalize(cameraPosition-vW);
    vec3 d=towardEye/vRadius;float distance=max(0.,2.*dot(vUnit,d)/dot(d,d));
    float density=0.;const int STEPS=${compact?4:6};
    for(int i=0;i<STEPS;i++){float t=distance*(float(i)+.5)/float(STEPS);vec3 local=vUnit-d*t;vec3 world=vW-towardEye*t;
     float shape=pow(max(0.,1.-dot(local,local)),1.8);vec3 flow=world*vec3(.09,.22,.09)-vec3(lifeTime*.035,0.,lifeTime*.014);
     float noise=n(flow)*.72+n(flow*2.1+vec3(0.,lifeTime*.012,0.))*.28;
     float wisps=smoothstep(.24,.72,noise);density+=shape*mix(.06,1.05,wisps);
    }
    float a=1.-exp(-density/float(STEPS)*distance*.070*uOpacity);if(a<.001)discard;
    gl_FragColor=vec4(uTint,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
   }`});
 // Sample the actual bank center without the old8m ceiling: higher terrain
 // otherwise hides whole volumes underneath its surface.
 const banks=mistBankLayout(heightAt,{compact});
 const mist=new THREE.InstancedMesh(new THREE.SphereGeometry(1,compact?12:16,compact?8:10),mistMat,banks.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
 mist.name='Valley mist volumes';mist.frustumCulled=false;mist.visible=false;
 banks.forEach((b,i)=>mist.setMatrixAt(i,matrix.compose(new THREE.Vector3(b.x,b.y,b.z),q,new THREE.Vector3(b.rx,b.ry,b.rz))));root.add(mist);
 const targets={clear:{rain:0,snow:0,mist:0,gloom:0},mist:{rain:0,snow:0,mist:.8,gloom:.25},rain:{rain:1,snow:0,mist:.12,gloom:.7},snow:{rain:0,snow:1,mist:.1,gloom:.45}};
 const neutral=new THREE.Color(0xdce5e9);
 let mode='clear',state={...targets.clear},goal={...targets.clear},autoKind='clear',lastGloom=-Infinity,notifiedGloom=-1,notifiedSnow=-1,gloomUpdates=0;
 function set(name){if(!WEATHER_MODES.includes(name))return false;mode=name;if(name==='auto')autoKind=weatherAt(now());goal={...targets[name==='auto'?autoKind:name]};return true;}
 function update(t,dt=1/60){
  time.value=reducedMotion?0:t;
  if(mode==='auto'){const kind=weatherAt(now());if(kind!==autoKind){autoKind=kind;goal={...targets[kind]};}}
  // Weather eases in and out over a few seconds instead of popping.
  const k=reducedMotion?1:1-Math.exp(-Math.max(0,dt)*.5);for(const key of Object.keys(state)){const d=goal[key]-state[key];if(Math.abs(d)>.001){state[key]+=d*k;}else state[key]=goal[key];}
  rain.u.uColor.value.copy(scene.fog.color).lerp(neutral,.70);snow.u.uColor.value.copy(scene.fog.color).lerp(neutral,.84);mistMat.uniforms.uTint.value.copy(scene.fog.color).lerp(neutral,.48);
  rain.u.uOpacity.value=.58*state.rain;rain.mesh.visible=state.rain>.01;
  snow.u.uOpacity.value=.88*state.snow;snow.mesh.visible=state.snow>.01;
  splashes.material.uniforms.uOpacity.value=.23*state.rain;splashes.visible=state.rain>.01;
  mistMat.uniforms.uOpacity.value=state.mist;mist.visible=state.mist>.01;
  if(t-lastGloom>=.5&&(Math.abs(state.gloom-notifiedGloom)>.001||Math.abs(state.snow-notifiedSnow)>.001)){lastGloom=t;notifiedGloom=state.gloom;notifiedSnow=state.snow;gloomUpdates++;onGloom(state.gloom,state.snow);}
 }
 return{root,set,update,get:()=>mode,debug:()=>({mode,auto:autoKind,gloomUpdates,particles:{rain:rain.mesh.count,snow:snow.mesh.count},splashes:splashes.count,terrainGrid:GRID,volumeBanks:banks.length,footprint:{center:footprint.center.toArray(),halfSize:footprint.halfSize.toArray(),margin:WEATHER_MARGIN,edge:'elliptical-feather'},...state})};
}
