import {WORLD_COAST} from './coast-layout.js';
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
function random(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function seaPointInsideLand(x,z){let inside=false;for(let i=0,j=WORLD_COAST.length-1;i<WORLD_COAST.length;j=i++){const a=WORLD_COAST[i],b=WORLD_COAST[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;}
export function seaObstacleClearance(p,o){return Math.hypot(Math.max(o.minX-p.x,0,p.x-o.maxX),Math.max(o.minZ-p.z,0,p.z-o.maxZ));}
const bend=v=>v*((v*v+.0025)/1.0025)**(-.13);
// Equal distance along the rounded loop, rather than racing past its cardinal axes.
const orbitLengths=[0];let orbitLength=0,orbitPrevious={x:bend(1),z:0};
for(let i=1;i<=512;i++){const a=i/512*TAU,p={x:bend(Math.cos(a)),z:bend(Math.sin(a))};orbitLength+=Math.hypot(p.x-orbitPrevious.x,p.z-orbitPrevious.z);orbitLengths.push(orbitLength);orbitPrevious=p;}
function orbitAngle(turn){const d=((turn%1+1)%1)*orbitLength;let lo=0,hi=512;while(hi-lo>1){const mid=(lo+hi)>>1;if(orbitLengths[mid]<=d)lo=mid;else hi=mid;}return(lo+(d-orbitLengths[lo])/(orbitLengths[hi]-orbitLengths[lo]))/512*TAU;}
/** A smooth closed offshore lane. Never project a moving point between coast edges. */
export function seaLifeRoute(turn,lane=0,obstacles=[]){
 const a=orbitAngle(turn),c=Math.cos(a),s=Math.sin(a),l=clamp(lane);
 // These radii clear every authored coast segment by22+14*lane metres.
 // Reserve obstacles for the whole orbit, rather than ejecting animals mid-swim.
 const rx=74+l*14,rz=72+l*13,obstacleRadius=obstacles.reduce((r,o)=>Math.max(r,...[o.minX,o.maxX].flatMap(x=>[o.minZ,o.maxZ].map(z=>Math.hypot(x,z-4)))),0),padding=Math.max(0,obstacleRadius+11-Math.min(rx,rz));
 return{x:bend(c)*(rx+padding),z:4+bend(s)*(rz+padding)};
}
const kinds=['whale','dolphin','shark','ray','fish'];
/** Orbit continuously; surfacing windows never freeze or relocate the animal. */
export function seaEncounter(kind,time,seed=71431,{preview=false}={}){
 const index=Math.max(0,kinds.indexOf(kind)),period=kind==='fish'?110:kind==='dolphin'?130:180,clock=Math.max(0,time)+73,cycle=Math.floor(clock/period),rnd=random((seed^Math.imul(cycle+11,2654435761)^Math.imul(index+3,2246822519))>>>0);
 const start=kind==='fish'?rnd()*35:kind==='dolphin'?12+rnd()*35:12+rnd()*92,duration=kind==='fish'?40+rnd()*25:kind==='dolphin'?55+rnd()*20:22+rnd()*24,age=clock-cycle*period-start;
 const orbit=random((seed^Math.imul(index+9,1597334677))>>>0),offset=orbit(),baseLane=.12+orbit()*.7,direction=orbit()<.5?-1:1,phase=orbit()*TAU;
 const speed=({whale:.0012,dolphin:.0036,shark:.0011,ray:.00095,fish:.0016}[kind]??.0012)*(.85+orbit()*.3),t=Math.max(0,time);
 const turn=offset+direction*(speed*t+.003*(Math.sin(t*.035+phase)-Math.sin(phase))),lane=baseLane+Math.sin(t*.007+phase)*.06;
 const progress=preview?.28:clamp(age/duration),surface=smooth(age/3)*(1-smooth((age-duration+4)/4)),visibility=preview||kind==='fish'?1:kind==='ray'?.88+.12*surface:surface;
 return{kind,cycle,age,duration,turn,lane,direction,speed,visibility,progress,animationOffset:phase};
}
export function seaLifeSchedule(time,seed=71431){return Object.fromEntries(kinds.map(kind=>[kind,seaEncounter(kind,time,seed).visibility]));}

/** Model centers relative to the waterline. Swimming is the default, not an aerial arc. */
export function seaSwimPose(kind,time,index=0,seed=71431,{height=1,visibility=1,reducedMotion=false}={}){
 const rnd=random((seed^Math.imul(index+17,1597334677))>>>0),phase=rnd()*TAU,t=reducedMotion?0:Math.max(0,time),h=Math.max(.05,height),wave=reducedMotion?0:Math.sin(t*.7+phase);
 let y=-h*.38+wave*.012,pitch=reducedMotion?0:Math.sin(t*.6+phase)*.012,roll=reducedMotion?0:Math.sin(t*.42+phase)*.018,breaching=false;
 if(kind==='whale')y=-h*.5+.16+wave*.03-(1-visibility)*2.7;
 if(kind==='shark')y=-h*.4+wave*.025-(1-visibility)*1.8;
 if(kind==='ray')y=-h*.5+.008+wave*.01-(1-visibility)*.8;
 if(kind==='dolphin'){
  const period=18+rnd()*8,duration=1.05+rnd()*.2,age=(t+rnd()*period)%period,u=age/duration;
  y=-h*.4-.02+wave*.035-(1-visibility)*2;
  if(!reducedMotion&&age<duration){
   const lift=1.2*smooth(visibility),arc=4*u*(1-u),envelope=smooth(u/.16)*smooth((1-u)/.16);
   y+=lift*arc;pitch=-Math.max(-.65,Math.min(.65,Math.atan2(lift*4*(1-2*u)/duration,2.2)))*envelope;
   breaching=y>0;
  }
 }
 return{y,pitch,roll,breaching};
}

/** Independent flight plans; a couple of gulls escort and perch on nearby boats. */
export function seaGullFlight(index,time,seed=71431,ship=null){
 const rnd=random((seed^Math.imul(index+31,2246822519))>>>0),offset=rnd(),phase=rnd()*TAU,direction=rnd()<.5?-1:1,speed=.0014+rnd()*.0012;
 const escort=index%3===0&&Number.isFinite(ship?.turn),turn=escort?ship.turn+.012+Math.sin(time*.045+phase)*.018:offset+direction*speed*time+Math.sin(time*.035+phase)*.012;
 const lane=.12+rnd()*.65,height=6+rnd()*5+Math.sin(time*.5+phase)*.4,cycle=(time+index*13+7)%76;
 const landing=escort?smooth((cycle-17)/7)*(1-smooth((cycle-38)/7)):0;
 return{turn,lane,height,direction:escort?Math.sign(ship.speed||1):direction,landing,flap:Math.sin(time*(2.6+rnd())+phase)*.23,bank:Math.sin(time*.22+phase)*.13};
}
