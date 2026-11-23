// Authored shoreline: preserve the entire western jungle and southern harbour.
// Coordinates are scene metres; these recesses change the land silhouette itself.
export const WORLD_COAST=[
 [-40.95,-32.825],[-26,-34.125],[-14.3,-32.5],[-9,-33.8],[-4,-34],
 [1,-32.8],[4.5,-31.9],[7.5,-32.5],[12,-34.7],[17,-35.2],[21,-33.7],
 [25,-33],[29.5,-35.2],[35,-37],[40,-36],[44,-33],[44.5,-29],
 [43,-25],[41,-23],[41.5,-20.2],[40.2,-17.5],[39.2,-15.5],
 [39.8,-13.7],[42.5,-12],[43,-8.5],[42,-4],[43,1],[44,5],
 [42.5,9],[41,12],[39.7,16],[39.7,19],[41.2,23],[43,27],
 [42,31],[42.25,36.075],[37,39.2],[32,42],[27,42.5],[22,40.5],
 [18,40],[13,41.5],[8,42],[3.5,41.9],[1.95,41.925],
 [-11.7,40.3],[-26,41.925],[-40.3,38.675],[-43.225,28.275],
 [-41.6,15.275],[-43.225,.975],[-41.6,-12.025],[-43.55,-23.075],
].map(([x,z])=>{const ease=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};return{x:x>35?x+3*ease(-9,-3,z)*(1-ease(28,35,z)):x,z};});
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function nearestCoast(x,z){
 let best={distance:Infinity};
 WORLD_COAST.forEach((a,i)=>{const b=WORLD_COAST[(i+1)%WORLD_COAST.length],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/len2)),px=a.x+t*dx,pz=a.z+t*dz,d=Math.hypot(x-px,z-pz);if(d<best.distance)best={distance:d,x:px,z:pz,nx:dz/Math.sqrt(len2),nz:-dx/Math.sqrt(len2),edge:i};});return best;
}
export function coastDistrict(x,z){
 if(z<-26&&x>-17)return'ember';
 if(x>36&&z>=-26&&z<-9)return'cove';
 if(x>35&&z>=-9&&z<34)return'woods';
 if(x>5&&z>=34)return'woods';
 return'preserved';
}
export function coastalElevation(x,z,ground,routeDistance){
 const district=coastDistrict(x,z);if(district==='preserved'||routeDistance<2.85)return ground;
 const edge=nearestCoast(x,z),d=edge.distance;
 if(d>6)return ground;
 const routeSafe=smooth(2.85,5.6,routeDistance);
 let low,reach;
 if(district==='ember'){
  // Two collapsed inlets separate tall basalt headlands; the volcano keeps its seat.
  const inlet=Math.max(Math.exp(-Math.pow((x-4)/4.6,2)),Math.exp(-Math.pow((x-23)/3.8,2)));
  const headland=Math.exp(-Math.pow((x-38)/6,2));
  low=2.0-4.5*inlet+headland*.9+.4*Math.sin(x*.63);
  reach=3.1;
 }else if(district==='cove'){
  const inlet=Math.exp(-Math.pow((z+15.6)/3.1,2));
  low=2.5-5.3*inlet;reach=3.2;
 }else{
  // Meadow shelves descend into shingle. A small low bluff carries the cave.
  const beach=Math.max(Math.exp(-Math.pow((z-3)/6,2)),Math.exp(-Math.pow((z-26)/5,2)));
  const cave=Math.exp(-Math.pow((z-18)/3.6,2));
  low=z>34?-.4-2.3*Math.exp(-Math.pow((x-18)/6,2))+.7*Math.exp(-Math.pow((x-32)/4,2)):-.65-2.1*beach+.95*cave;reach=z>34?5.2:6.8;
 }
 const rim=1-smooth(0,reach,d),weight=rim*routeSafe;
 // A broad middle shelf, then a lower rim: no narrow horizontal grass stripes.
 const terrace=d<1.15?low:low+1.1*smooth(1.15,2.4,d);
 return ground+(Math.min(ground,terrace)-ground)*weight;
}
export function coastWallProfile(point,t,nx,nz){
 const district=coastDistrict(point.x,point.z);
 if(district==='preserved')return null;
 const rugged=.7+.3*Math.sin(point.x*.87+point.z*.59),s=Math.sin(t*Math.PI);
 const width=district==='woods'?2.1:district==='ember'?1.25:1.6;
 // The low apron widens toward the sea, with asymmetrical shoulders above it.
 const out=width*(t*.7+s*.55)*rugged;
 return{x:point.x+nx*out,y:point.y+(-3.8-point.y)*t,z:point.z+nz*out};
}
