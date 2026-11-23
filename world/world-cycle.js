// One shared island day per three real hours. Epoch-based time survives reloads
// and background tabs; clients see the same procedural weather without a server.
export const WORLD_CYCLE_MS=3*60*60*1000;
export const WEATHER_SLOT_MS=15*60*1000;
export const CYCLE_WEATHER=Object.freeze(['clear','mist','rain','snow']);
const cache=new Map();
const milliseconds=time=>{const ms=Number(time);if(!Number.isFinite(ms))throw new TypeError('A valid world timestamp is required.');return ms;};
export function worldHourAt(time=Date.now()){const ms=milliseconds(time);return ((ms%WORLD_CYCLE_MS+WORLD_CYCLE_MS)%WORLD_CYCLE_MS)/WORLD_CYCLE_MS*24;}
function rawOrder(cycle){
 let seed=(Math.imul(cycle,0x45d9f3b)^0x6d2b79f5)>>>0;
 const random=()=>{seed=(seed+0x6d2b79f5)>>>0;let x=seed;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return ((x^x>>>14)>>>0)/4294967296;};
 const order=[];
 for(let round=0;round<3;round++){
  const group=[...CYCLE_WEATHER];for(let i=3;i>0;i--){const j=Math.floor(random()*(i+1));[group[i],group[j]]=[group[j],group[i]];}
  if(group[0]===order.at(-1))[group[0],group[1]]=[group[1],group[0]];
  order.push(...group);
 }
 return order;
}
export function weatherOrder(cycle){
 if(!Number.isSafeInteger(cycle))throw new TypeError('A valid cycle number is required.');
 if(!cache.has(cycle)){
  const order=rawOrder(cycle);
  // Swapping only the first pair preserves each round's last slot, so this
  // also avoids repeats across cycle boundaries without recursive generation.
  if(order[0]===rawOrder(cycle-1).at(-1))[order[0],order[1]]=[order[1],order[0]];
  cache.set(cycle,Object.freeze(order));if(cache.size>3)cache.delete(cache.keys().next().value);
 }
 return cache.get(cycle);
}
export function weatherAt(time=Date.now()){
 const ms=milliseconds(time),cycle=Math.floor(ms/WORLD_CYCLE_MS),slot=Math.floor((ms-cycle*WORLD_CYCLE_MS)/WEATHER_SLOT_MS);
 return weatherOrder(cycle)[slot];
}
