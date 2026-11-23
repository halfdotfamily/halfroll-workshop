import * as THREE from 'three';
import {worldHourAt,WORLD_CYCLE_MS} from './world-cycle.js';

// Time of day. Six authored moods blend continuously by hour; fixed moods
// remain selectable, 'auto' follows the device clock and 'cycle' plays a
// compressed day. Night stays soft blue so sections and numbers stay readable.
const K=(hour,o)=>({hour,...o});
export const DAY_KEYS=[
 K(0,{"name":"night","sun":13359601,"intensity":1.25,"el":48,"az":210,"sky":9676489,"ground":4079707,"ambient":0.86,"fill":11452126,"fillIntensity":0.28,"exposure":0.98,"sea":1914191,"water":3234160,"light":7376550,"foam":11978457,"night":1}),
 K(5.2,{"name":"night","sun":13359601,"intensity":1.25,"el":48,"az":210,"sky":9676489,"ground":4079707,"ambient":0.86,"fill":11452126,"fillIntensity":0.28,"exposure":0.98,"sea":1914191,"water":3234160,"light":7376550,"foam":11978457,"night":1}),
 K(6.4,{"name":"dawn","sun":16764052,"intensity":2.55,"el":21,"az":-35,"sky":12898013,"ground":7956819,"ambient":0.93,"fill":13162473,"fillIntensity":0.32,"exposure":0.98,"sea":4353920,"water":5807006,"light":11653052,"foam":16770757,"night":0.3}),
 K(9.5,{"name":"day","sun":16769968,"intensity":2.65,"el":42,"az":-40,"sky":13359583,"ground":8418132,"ambient":0.94,"fill":13228778,"fillIntensity":0.32,"exposure":0.98,"sea":3505809,"water":4564127,"light":10408893,"foam":16445653,"night":0}),
 K(13,{"name":"noon","sun":16768936,"intensity":2.85,"el":57,"az":-15,"sky":14146776,"ground":9993045,"ambient":0.94,"fill":13688036,"fillIntensity":0.27,"exposure":0.96,"sea":3965838,"water":4958882,"light":11655359,"foam":16773074,"night":0}),
 K(18.2,{"name":"sunset","sun":16759408,"intensity":3.05,"el":19,"az":55,"sky":12895708,"ground":9530706,"ambient":0.95,"fill":12963302,"fillIntensity":0.55,"exposure":1,"sea":5009531,"water":6854031,"light":13813666,"foam":16767404,"night":0.16}),
 K(19.6,{"name":"dusk","sun":16101797,"intensity":1.55,"el":12,"az":168,"sky":11056081,"ground":6640490,"ambient":0.9,"fill":11847394,"fillIntensity":0.32,"exposure":1,"sea":3623785,"water":5010826,"light":10201534,"foam":14734815,"night":0.72}),
 K(21.4,{"name":"night","sun":13359601,"intensity":1.25,"el":48,"az":210,"sky":9676489,"ground":4079707,"ambient":0.86,"fill":11452126,"fillIntensity":0.28,"exposure":0.98,"sea":1914191,"water":3234160,"light":7376550,"foam":11978457,"night":1}),
 K(24,{"name":"night","sun":13359601,"intensity":1.25,"el":48,"az":210,"sky":9676489,"ground":4079707,"ambient":0.86,"fill":11452126,"fillIntensity":0.28,"exposure":0.98,"sea":1914191,"water":3234160,"light":7376550,"foam":11978457,"night":1}),
];
const MOODS=['dawn','day','noon','sunset','dusk','night'];
export const LIGHTING_MODES=['auto','cycle',...MOODS];
// Earlier presets kept for the pending HUD study, which still asks for them.
export const LIGHT_PRESETS=Object.freeze(Object.fromEntries(MOODS.map(n=>[n,DAY_KEYS.find(k=>k.name===n)])));
const ca=new THREE.Color(),cb=new THREE.Color();
function mix(a,b,t){const o={};for(const k of Object.keys(a)){if(k==='name'||k==='hour')continue;if(['sun','sky','ground','fill','sea','water','light','foam'].includes(k))o[k]=ca.setHex(a[k]).lerp(cb.setHex(b[k]),t).getHex();else if(k==='az'){let d=((b.az-a.az+540)%360)-180;o.az=a.az+d*t;}else o[k]=a[k]+(b[k]-a[k])*t;}o.name=t<.5?a.name:b.name;return o;}
export function moodAt(hour){hour=((hour%24)+24)%24;for(let i=0;i<DAY_KEYS.length-1;i++){const a=DAY_KEYS[i],b=DAY_KEYS[i+1];if(hour>=a.hour&&hour<=b.hour){const t=(hour-a.hour)/((b.hour-a.hour)||1);return mix(a,b,t*t*(3-2*t));}}return mix(DAY_KEYS[0],DAY_KEYS[0],0);}

export function buildWorldLighting(scene,renderer,{onApply=()=>{},now=()=>new Date(),compact=innerWidth<700}={}){
  const hemi=new THREE.HemisphereLight(),sun=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight();
  sun.name='Half Hollow sun';sun.castShadow=true;sun.shadow.mapSize.set(compact?1024:2048,compact?1024:2048);
  Object.assign(sun.shadow.camera,{left:-62,right:62,top:62,bottom:-62,near:1,far:240});
  sun.shadow.normalBias=.12;sun.shadow.bias=-.00015;sun.shadow.radius=3;
  fill.position.set(45,25,55);scene.add(hemi,sun,fill);
  let mode='day',current=null,lastApplied=-1,gloom=0,chill=0,elapsedNow=0,applications=0,transition=null;
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  const waterMaterials=new Set();scene.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])if(m.uniforms?.uMode)waterMaterials.add(m);});
  const grey=new THREE.Color(0xb3c4d2),cold=new THREE.Color(0xe0e7ed),tc=new THREE.Color();
  // Weather dims and cools the mood: overcast skies, a greyer sea, softer sun.
  function weathered(p){if(!gloom)return p;const q={...p},g=gloom;
    q.intensity*=1-.62*g;q.ambient*=1+.22*g;q.fillIntensity*=1-.18*g;
    q.ground=tc.setHex(q.ground).lerp(cold,.12*chill).getHex();
    for(const k of ['sky','sea','water','sun']){tc.setHex(q[k]).lerp(grey,(k==='sun'?.65:k==='sky'?.38:.06)*g);if(chill)tc.lerp(cold,(k==='sea'||k==='water'?.015:.10)*chill);q[k]=tc.getHex();}return q;}
  function apply(base){
    current=base;applications++;const p=weathered(base);const el=THREE.MathUtils.degToRad(p.el),az=THREE.MathUtils.degToRad(p.az);
    sun.color.setHex(p.sun);sun.intensity=p.intensity;sun.position.set(Math.cos(az)*Math.cos(el)*86,Math.sin(el)*86+8,Math.sin(az)*Math.cos(el)*86);
    hemi.color.setHex(p.sky);hemi.groundColor.setHex(p.ground);hemi.intensity=p.ambient;
    fill.position.set(-sun.position.x,42,-sun.position.z);fill.color.setHex(p.fill);fill.intensity=p.fillIntensity;
    renderer.shadowMap.needsUpdate=true;renderer.toneMappingExposure=p.exposure;renderer.setClearColor(p.sea);
    scene.fog.color.setHex(p.sea);
    for(const m of waterMaterials){const waterMode=m.uniforms.uMode.value;m.uniforms.uDeep.value.setHex(waterMode===1?p.sea:p.water);m.uniforms.uLight.value.setHex(p.light);m.uniforms.uFoam.value.setHex(p.foam);if(m.uniforms.uSunset)m.uniforms.uSunset.value=Math.max(0,1-Math.abs(p.el-12)/18)*(p.night<.8?1:0);}
    onApply(p);
  }
  const hourNow=()=>mode==='cycle'?worldHourAt(now()):(()=>{const d=now();return d.getHours()+d.getMinutes()/60;})();
  function setPreset(name){
    if(!LIGHTING_MODES.includes(name))return false;
    mode=name;lastApplied=elapsedNow;
    const next=name==='auto'||name==='cycle'?moodAt(hourNow()):{...LIGHT_PRESETS[name]};
    if(current&&!reduced)transition={from:{...current},to:next,start:elapsedNow};else apply(next);
    return true;
  }
  // Live modes re-blend a few times per second; fixed moods never change.
  function update(elapsed){
    elapsedNow=elapsed;
    if(transition){if(elapsed<=lastApplied)return false;lastApplied=elapsed;const t=Math.min(1,Math.max(0,(elapsed-transition.start)/1.4));apply(mix(transition.from,transition.to,t*t*(3-2*t)));if(t>=1)transition=null;return true;}
    if(mode!=='auto'&&mode!=='cycle')return false;
    if(lastApplied>=0&&elapsed-lastApplied<(mode==='cycle'?.25:20))return false;
    lastApplied=elapsed;apply(moodAt(hourNow()));return true;
  }
  function setWeather(g,c=0){g=THREE.MathUtils.clamp(g,0,1);c=THREE.MathUtils.clamp(c,0,1);if(g===gloom&&c===chill)return;gloom=g;chill=c;if(current)apply(current);}
  return{setPreset,update,setWeather,getPreset:()=>mode,mood:()=>current,hour:()=>mode==='auto'||mode==='cycle'?hourNow():LIGHT_PRESETS[mode].hour,debug:()=>({applications,waterMaterials:waterMaterials.size,preset:mode,hour:mode==='auto'||mode==='cycle'?hourNow():LIGHT_PRESETS[mode].hour,cycleDurationMs:mode==='cycle'?WORLD_CYCLE_MS:null,mood:current?.name,night:current?.night,sunPosition:sun.position.toArray(),sunIntensity:sun.intensity,ambientIntensity:hemi.intensity,exposure:renderer.toneMappingExposure,transitioning:!!transition,fillIntensity:fill.intensity})};
}
