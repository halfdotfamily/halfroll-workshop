import * as THREE from 'three';

// Dark cooling plates separated by slow, irregular hot seams. Only hot areas emit.
export function makeLavaMaterial(clock){
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',emissive:'#ffffff',roughness:.92,metalness:0,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.uniforms.emberTime=clock;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 moltenPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nmoltenPosition=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 moltenPosition; uniform float emberTime;
   vec2 emberHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
   float emberNoise(vec2 p){vec2 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(emberHash(a).x,emberHash(a+vec2(1.,0.)).x,f.x),mix(emberHash(a+vec2(0.,1.)).x,emberHash(a+vec2(1.)).x,f.x),f.y);}
   vec2 emberCells(vec2 p){vec2 g=floor(p),f=fract(p);float first=8.,second=8.;
    for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(float(i),float(j)),h=emberHash(g+o);vec2 r=o+h-f;float d=dot(r,r);if(d<first){second=first;first=d;}else second=min(second,d);}
    return vec2(sqrt(first),sqrt(second)-sqrt(first));
   }
   float emberHeat=0.; float emberCore=0.;
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 flow=moltenPosition.xz*1.28;
   flow+=vec2(emberTime*.07,emberTime*.035);
   flow+=vec2(emberNoise(flow*1.1+vec2(0.,emberTime*.09)),emberNoise(flow*.9+vec2(4.,-emberTime*.07)))*1.15;
   vec2 cell=emberCells(flow);
   emberHeat=1.-smoothstep(.02,.33,cell.y);
   emberCore=(1.-smoothstep(.01,.065,cell.y))*(.25+.75*emberNoise(flow*.73));
   float grain=fract(sin(dot(floor(flow*19.),vec2(12.9898,78.233)))*43758.5453);
   diffuseColor.rgb=mix(vec3(.065,.035,.032)+grain*.025,vec3(.43,.065,.012),emberHeat);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float emberPulse=.85+.25*sin(emberTime*1.7+moltenPosition.x*.9+moltenPosition.z*.6);
   totalEmissiveRadiance=(vec3(1.,.12,.01)*emberHeat*.85+vec3(1.,.45,.06)*emberCore*.8)*emberPulse;
  `);
 };
 material.customProgramCacheKey=()=> 'ember-cooled-plates-v5';return material;
}
