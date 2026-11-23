// Shared authored volcano and its downhill, sea-bound lava channel.
export const COAST_VOLCANO={x:38,z:-32,radius:4.2,craterLevel:7.40,peak:8.20};
export const LAVA_COAST_PATH=[
 {x:38,z:-32,y:7.40,width:1.27},
 {x:39.8,z:-31.55,y:7.40,width:.88},
 {x:40.9,z:-30.95,y:6.10,width:.63},
 {x:42.1,z:-31.15,y:4.60,width:.78},
 {x:43.25,z:-30.50,y:2.90,width:.61},
 {x:44.25,z:-29.65,y:.75,width:.87},
 {x:45.35,z:-29.15,y:-1.55,width:.72},
 {x:46.5,z:-29,y:-3.72,width:1.14},
];
const clamp=x=>Math.max(0,Math.min(1,x));
export function sampleEmberCoastChannel(x,z){
 let best=null;
 for(let i=0;i<LAVA_COAST_PATH.length-1;i++){
  const a=LAVA_COAST_PATH[i],b=LAVA_COAST_PATH[i+1],dx=b.x-a.x,dz=b.z-a.z;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));
  const distance=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
  if(!best||distance<best.distance)best={distance,y:a.y+(b.y-a.y)*t,width:a.width+(b.width-a.width)*t,index:i,t};
 }
 return best;
}
export function carveEmberCoast(x,z,y,routeDistance){
 if(routeDistance<2.8||x<39.7||x>47.5||z<-34||z>-26.5)return y;
 const c=sampleEmberCoastChannel(x,z),blend=clamp((c.width+1.05-c.distance)/.7);
 return Math.min(y,y+(c.y-.26-y)*blend);
}
