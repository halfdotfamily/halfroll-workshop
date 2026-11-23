import * as THREE from 'three';
// Screen-facing light, not a lit physical prop. Shape follows the supplied logo.
function logoTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const c=canvas.getContext('2d'),s=.93,ox=48,oy=36;
 const p=(x,y)=>[ox+x*s,oy+y*s];
 function shape(color,blur){
  c.save();c.filter=`blur(${blur}px)`;c.fillStyle=c.strokeStyle=color;c.lineWidth=21*s;c.lineCap='round';
  for(const [x,y] of [[188.5,110],[320,90.5],[300.5,356]]){c.beginPath();c.moveTo(...p(189,265));c.lineTo(...p(x,y));c.stroke();}
  for(const [x,y,r] of [[189,265,91.5],[188.5,110,27.5],[320,90.5,32],[300.5,356,27.8]]){c.beginPath();c.arc(...p(x,y),r*s,0,Math.PI*2);c.fill();}c.restore();
 }
 shape('rgba(255,112,0,.75)',26);shape('#ffad27',11);shape('#fffbe5',0);
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function trailTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');
 const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,248,180,1)');g.addColorStop(.2,'rgba(255,177,30,.8)');g.addColorStop(.5,'rgba(255,91,0,.3)');g.addColorStop(1,'rgba(255,70,0,0)');c.fillStyle=g;c.fillRect(0,0,64,64);
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const material=map=>new THREE.SpriteMaterial({map,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,blending:THREE.AdditiveBlending});
export function createLogoMeteor(parent){
 const core=new THREE.Sprite(material(logoTexture()));core.name='Logo light silhouette';parent.add(core);
 const trailMap=trailTexture(),trail=Array.from({length:9},()=>{const p=new THREE.Sprite(material(trailMap));parent.add(p);return p;});
 const flare=new THREE.Sprite(material(core.material.map));flare.visible=false;parent.add(flare);
 core.material.addEventListener('dispose',()=>core.material.map.dispose());
 trail[0].material.addEventListener('dispose',()=>trailMap.dispose());
 return{core,trail,flare};
}
export function meteorFrame(f){
 const t=Math.max(0,Math.min(1,f)),approach=.08*t+.92*Math.pow(t,2.5);
 return{x:-5.5*(1-approach),y:.5+16*(1-approach),size:.65+5.8*Math.pow(t,2.4),tail:1+5.5*t*t};
}
export function animateLogoMeteor(v,fall,after,impactAge){
 const p=meteorFrame(fall);v.core.visible=!after;v.core.position.set(p.x,p.y,0);v.core.scale.setScalar(p.size);v.core.material.rotation=-.08+.18*fall;
 for(const [i,s] of v.trail.entries()){
  const t=(i+1)/v.trail.length;s.visible=!after;s.position.set(p.x-.325*p.tail*t,p.y+.946*p.tail*t,-.03);
  s.scale.setScalar(p.size*(.36*(1-t)+.04));s.material.opacity=(1-t)*(.3+.6*fall);
 }
 v.flare.visible=after&&impactAge<.20;
 if(v.flare.visible){v.flare.position.set(0,1.2,0);v.flare.scale.setScalar(6.45+impactAge*19);v.flare.material.opacity=Math.max(0,1-impactAge/.20);}
}
