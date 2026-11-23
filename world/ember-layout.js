// Shared basin outlines: the terrain and lava renderer use identical footprints.
export const EMBER_POOLS=[
 {x:26,z:-22,r:3.25,stretch:.86,level:6.45,phase:.4,surfaceRadius:.72},
 {x:12,z:-25,r:2.1,stretch:.83,level:4.5,phase:1.9,surfaceRadius:.68},
 {x:-11,z:-25,r:1.65,stretch:.86,level:3.85,phase:3.1,surfaceRadius:.57},
];
export function emberRadius(angle,p){return 1+.085*Math.sin(angle*3+p.phase)+.045*Math.sin(angle*5-p.phase);}
export function emberPoolPoint(p,angle,radius){const r=p.r*emberRadius(angle,p)*radius;return{x:p.x+Math.cos(angle)*r,z:p.z+Math.sin(angle)*r*p.stretch};}
export function emberPoolDistance(x,z,p){const dx=x-p.x,dz=(z-p.z)/p.stretch,a=Math.atan2(dz,dx);return Math.hypot(dx,dz)/(p.r*emberRadius(a,p));}
export function carveEmberPools(x,z,ground,routeDistance){
 if(routeDistance<2.5)return ground;
 for(const p of EMBER_POOLS){const d=emberPoolDistance(x,z,p);if(d>=1.35)continue;const t=Math.max(0,Math.min(1,(d-.86)/.49)),blend=t*t*(3-2*t);ground=Math.min(ground,(p.level-.48)*(1-blend)+ground*blend);}
 return ground;
}
