const STILL_EYES=new Set(['sleepy','lids','tired','visor']);
const cache=new WeakMap();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export function sampleCritterFace(time,eyes,id=0,{reduced=false,lookX=null,lookY=null}={}){
 const period=4.7+(id%4)*.63,t=Math.max(0,time)+id*.83,phase=t%period;
 const blinking=!reduced&&!STILL_EYES.has(eyes),blink=blinking&&phase>period-.18?Math.sin((phase-period+.18)/.18*Math.PI)**2:0;
 // Brief, staggered glances; resting/closed expressions retain their identity.
 const glance=STILL_EYES.has(eyes)&&eyes!=='lids'?0:Math.max(0,Math.sin(t*.47))**6;
 const x=reduced?0:lookX===null?Math.sin(t*.71+id)*glance*.018:clamp(lookX,-1,1)*.024;
 const y=reduced?0:lookY===null?Math.sin(t*.53)*glance*.006:clamp(lookY,-1,1)*.012;
 return {blink,closed:blink>.87,aperture:Math.max(.02,1-blink*.98),x,y,canBlink:blinking};
}
function nodes(body){
 let rig=cache.get(body);if(rig)return rig;
 rig=['Left','Right'].map(side=>{const pupil=body.getObjectByName(side+' pupil');return {aperture:body.getObjectByName(side+' eye aperture'),closed:body.getObjectByName(side+' closed eye'),pupil,base:pupil?.position.clone()};});cache.set(body,rig);return rig;
}
export function animateCritterFace(body,time,options={}){
 const sample=sampleCritterFace(time,body.userData.traits?.eyes,body.userData.characterId,options);
 for(const eye of nodes(body)){
  if(eye.aperture){eye.aperture.scale.y=sample.aperture;eye.aperture.visible=!sample.closed;}
  if(eye.closed)eye.closed.visible=sample.closed;
  if(eye.pupil){eye.pupil.position.x=eye.base.x+sample.x;eye.pupil.position.y=eye.base.y+sample.y;}
 }
 return sample;
}
