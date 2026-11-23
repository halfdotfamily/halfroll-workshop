// Cosmetic choreography only. No game RNG, position, turn or card mutations.
export const EMOTE_DURATION=2.8;
// Additive laughter; the caller keeps game movement authoritative.
export function sampleLaugh(t){
 const mix=envelope(t,.05,2.65),beat=Math.max(0,Math.sin(Math.max(0,t-.2)*Math.PI*7));
 return{mix,bounce:beat*.065*mix,lean:-.1*mix,roll:Math.sin(t*13)*.035*mix,mouth:.75+beat*.45,tear:Math.max(0,(t-.45)% .58)/.58};
}
export const HURRY_HITS=Object.freeze([1.42,3.38]);
export function sampleHurry(t){
 let lift=0,contact=0;
 for(const hit of HURRY_HITS){
  const start=hit-.56,peak=hit-.15;
  if(t>=start&&t<peak)lift=.64*smooth((t-start)/(peak-start));
  if(t>=peak&&t<hit)lift=.64*(1-smooth((t-peak)/(hit-peak)));
  if(t>=hit&&t<hit+.18){lift=.07*Math.sin((t-hit)/.18*Math.PI);contact=Math.sin((t-hit)/.18*Math.PI);}
 }
 return{lift,contact,visible:t>=.2&&t<3.98};
}
export const HOP_BEATS=Object.freeze([{start:.12,flight:.44,height:1.05},{start:.88,flight:.36,height:.74},{start:1.54,flight:.30,height:.43}]);
const clamp=x=>Math.max(0,Math.min(1,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const envelope=(t,inAt=0,outAt=2.2)=>smooth((t-inAt)/.22)*(1-smooth((t-outAt)/.4));
export function sampleBoing(t){
 let y=0,squash=0,stretch=0,landings=0;
 for(const b of HOP_BEATS){const takeoff=b.start+.16,land=takeoff+b.flight;
  if(t>=land)landings++;
  if(t>=b.start&&t<takeoff)squash=Math.sin((t-b.start)/.16*Math.PI)*.14;
  if(t>=takeoff&&t<land){const u=(t-takeoff)/b.flight;y=4*b.height*u*(1-u);stretch=Math.sin(u*Math.PI)*.07;}
  if(t>=land&&t<land+.18)squash=Math.sin((t-land)/.18*Math.PI)*.12*(b.height/.9);
 }
 return{y,scaleY:1-squash+stretch,scaleXZ:1+squash*.48-stretch*.35,landings};
}
export function playerAhead(actor,pawns){
 return [...pawns.values()].filter(p=>String(p.player.id)!==String(actor.player.id)&&p.pos>actor.pos+.001)
  .sort((a,b)=>a.pos-b.pos||String(a.player.id).localeCompare(String(b.player.id)))[0]??null;
}
export function bubbleSample(t,index){
 const age=t-(.24+index*.17),u=clamp(age/1.65);
 return{visible:age>=0&&age<1.65,x:Math.sin(age*2.4+index*1.8)*(.13+u*.23),y:Math.max(0,age)*1.65,z:.22+Math.max(0,age)*.28+Math.cos(index*2)*.13,scale:smooth(age/.14)*(1-smooth((age-1.47)/.18))};
}
