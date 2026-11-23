// Shared presentation timing, never a source of game outcomes.
export const EFFECT_TIME_SCALE=1.3;
export const effectTimeMs=ms=>Math.round(ms*EFFECT_TIME_SCALE);
export const CELL_STEP_MS=200;
export const SIX_SEVEN_MS=effectTimeMs(2800);
export const SIX_SEVEN_KNOCKBACK_MS=effectTimeMs(1000);
export function walkDurationMs(track){return track.cardId?0:Math.abs((track.landing??track.from)-track.from)*CELL_STEP_MS;}
export function effectDurationMs(track,effect={}){
 if(track.sixSeven)return SIX_SEVEN_MS+(effect.pending?120:effect.blocked?effectTimeMs(900):track.to!==track.landing?SIX_SEVEN_KNOCKBACK_MS:effectTimeMs(120));
 if(effect.pending)return 120;
 const card=track.cardId||effect.cardId;
 if(effect.blocked)return effectTimeMs(900);
 if(card==='spring-step')return effectTimeMs(1800);
 if(['magic-carpet','paper-glider','catch-up-kite','pocket-rocket'].includes(card))return effectTimeMs(2100);
 if(card)return effectTimeMs(1250);
 if(track.landing===67&&track.from!==track.landing)return SIX_SEVEN_MS;
 return effectTimeMs(track.landing!==track.to?1250:effect.coins||!['trail','finish'].includes(track.type)?900:120);
}
export function presentationDurationMs(tracks,effect={}){return Math.max(120,...tracks.map(t=>walkDurationMs(t)+effectDurationMs(t,effect)));}
export function sampleSixSeven(track,age,durationMs=SIX_SEVEN_MS){
 const prelude=track.sixSeven?SIX_SEVEN_MS/1000:durationMs/1000;
 if(age<prelude){const cycle=Math.min(3.99999,Math.max(0,age)/prelude*4),f=cycle%1;return{pos:track.landing,dy:Math.sin(f*Math.PI)*2.6,roll:Math.sin(cycle*Math.PI*2)*.17,toss:Math.floor(cycle),stage:'six-seven'};}
 const u=Math.max(0,Math.min(1,(age-prelude)/Math.max(.001,durationMs/1000-prelude))),v=u*u*(3-2*u),moves=track.to!==track.landing;
 return{pos:track.landing+(track.to-track.landing)*v,dy:moves?Math.sin(u*Math.PI)*.9:0,roll:moves?Math.sin(u*Math.PI)*.45:0,stage:moves&&u<1?'knockback':'settled'};
}
export function sampleCellWalk(track,age){
 const count=Math.abs(track.landing-track.from),direction=Math.sign(track.landing-track.from),step=age/(CELL_STEP_MS/1000)+1e-9,index=Math.min(count,Math.floor(Math.max(0,step))),f=step-index<1e-7?0:Math.max(0,step-index);
 if(!count||index>=count)return{pos:track.landing,dy:0,step:count,walking:false};
 const travel=Math.min(1,f/.86),ease=travel*travel*(3-2*travel);
 return{pos:track.from+direction*(index+ease),dy:travel<1?Math.sin(travel*Math.PI)*.34:0,step:index,stepPhase:travel,walking:true};
}

// Spring Step visits each intervening section; landing effects remain engine
// owned and do not activate on this item movement.
export function sampleSpringStep(track,age,durationMs=1800){
 const count=Math.abs(track.to-track.from),direction=Math.sign(track.to-track.from),u=Math.max(0,Math.min(1,age*1000/durationMs));
 if(!count||u>=1)return{pos:track.to,dy:0,roll:0,springPhase:1,completedSteps:count,done:u>=1};
 const cycle=u*count,index=Math.min(count-1,Math.floor(cycle)),phase=cycle-index;
 const flight=Math.max(0,Math.min(1,(phase-.16)/.70)),travel=flight*flight*(3-2*flight);
 return{pos:track.from+direction*(index+travel),dy:phase<.16?-.16*Math.sin(phase/.16*Math.PI):flight<1?Math.sin(flight*Math.PI)*1.35:0,roll:Math.sin(flight*Math.PI)*.08,springPhase:phase,completedSteps:index+(phase>=.86?1:0),done:false};
}
