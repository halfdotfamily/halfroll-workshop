import * as THREE from 'three';

export const WATER_NOISE=`
float whash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float wnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(whash(i),whash(i+vec2(1.,0.)),f.x),mix(whash(i+vec2(0.,1.)),whash(i+vec2(1.,1.)),f.x),f.y);}
float wfbm(vec2 p){return wnoise(p)*.58+wnoise(p*2.03+3.7)*.28+wnoise(p*4.1)*.14;}
`;

export function makeOceanWater(){
 const time={value:0},material=new THREE.MeshBasicMaterial({color:'#4d9b9f'});
 material.onBeforeCompile=shader=>{
  shader.uniforms.oceanTime=time;
  shader.vertexShader='varying vec3 waterWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterWorld=(modelMatrix*vec4(position,1.)).xyz;');
  shader.fragmentShader='uniform float oceanTime; varying vec3 waterWorld;\n'+WATER_NOISE+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=waterWorld.xz;
   float swell=wfbm(p*.105+vec2(oceanTime*.025,-oceanTime*.035));
   float waves=sin(p.x*.65+p.y*1.2+wfbm(p*.3)*5.-oceanTime*.65);
   float crest=smoothstep(.86,.99,waves)*(.15+.85*wnoise(p*.35+oceanTime*.02));
   diffuseColor.rgb=mix(diffuseColor.rgb*.67,diffuseColor.rgb*1.13,swell);
   diffuseColor.rgb+=vec3(.08,.13,.13)*crest*.25;
  `);
 };
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 return{material,update:t=>{time.value=reduced?0:t;}};
}

export function impactFoam(clock){
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{waterTime:clock},
 vertexShader:'varying vec2 foamUv;void main(){foamUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec2 foamUv;uniform float waterTime;${WATER_NOISE}
 void main(){vec2 p=(foamUv-.5)*2.;float r=length(p);float n=wfbm(p*5.-vec2(0.,waterTime*.4));
 float edge=1.-smoothstep(.38,.95,r+n*.18);
 float lace=smoothstep(.44,.62,n+.12*sin(r*28.-waterTime*2.4));
 gl_FragColor=vec4(vec3(.65,.88,.84),edge*(.12+lace*.48));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
}
