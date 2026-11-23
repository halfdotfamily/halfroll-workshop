// Shared authored geography. World units; water width is the full ribbon width.
// Two inner drops feed an outlet beneath the numbered bridge and a coastal fall.
export const MOSSFALL=Object.freeze({
 name:'Mossfall',center:{x:-30,z:-5},bounds:{minX:-42,maxX:-18,minZ:-28,maxZ:20},
 upperPool:{x:-30,z:-19,y:10.8,radius:2.8},
 lowerPool:{x:-31.5,z:8,y:.9,radius:1.35},
 footbridge:{left:{x:-36.05,z:7.3},right:{x:-37.05,z:16.5},deckY:1.88,width:3.3},
 river:[
  {x:-30,z:-22,y:10.85,width:.2},
  {x:-30,z:-20,y:10.82,width:4.8},
  {x:-30,z:-18,y:10.78,width:5.6},
  {x:-30.4,z:-15,y:10.7,width:3.1},
  {x:-30.5,z:-11,y:10.6,width:2.7},
  {x:-30.5,z:-9,y:7.1,width:2.7},
  {x:-30.7,z:-7.5,y:7.02,width:3.5},
  {x:-30.6,z:-6.5,y:6.9,width:2.8},
  {x:-30.5,z:-4.5,y:3.5,width:3.0},
  {x:-30.3,z:-2,y:3.3,width:2.8},
  {x:-30.5,z:1,y:2.8,width:3.2},
  {x:-30.9,z:5,y:1.8,width:2.2},
  {x:-31.5,z:8,y:.9,width:2.7},
  {x:-33,z:10.4,y:.55,width:3.0},
  {x:-35,z:11.4,y:.5,width:2.6},
  {x:-39.5,z:11.4,y:.4,width:2.6},
  {x:-42.25,z:11.4,y:.3,width:2.8},
  {x:-43.8,z:11.4,y:-3.65,width:3.2},
 ],
 falls:[
  {from:{x:-30.5,z:-11,y:10.6},to:{x:-30.5,z:-9,y:7.1},width:2.7},
  {from:{x:-30.6,z:-6.5,y:6.9},to:{x:-30.5,z:-4.5,y:3.5},width:2.8},
  {from:{x:-42.25,z:11.4,y:.3},to:{x:-43.8,z:11.4,y:-3.65},width:2.8},
 ],
});
// Only this short road span is carried by the bridge above the outlet channel.
export const onRiverBridge=(x,z)=>x>-39&&x<-34.5&&z>7&&z<16.8;
export const isOutlet=(x,z)=>x<-33&&Math.abs(z-11.4)<3.3;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function riverSample(x,z){
 let best=Infinity,result;
 for(let i=0;i<MOSSFALL.river.length-1;i++){
  const a=MOSSFALL.river[i],b=MOSSFALL.river[i+1],dx=b.x-a.x,dz=b.z-a.z;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz));
  const distance=Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
  if(distance<best){best=distance;result={distance,x:a.x+t*dx,z:a.z+t*dz,y:a.y+(b.y-a.y)*t,width:a.width+(b.width-a.width)*t,segment:i,t};}
 }
 return result;
}
export const riverDistance=(x,z)=>riverSample(x,z).distance;
export function waterHeightAt(x,z){const sample=riverSample(x,z);return sample.distance<=sample.width/2?sample.y:null;}
export function mossfallWeight(x,z){
 const ellipse=((x+30)/15)**2+((z+4)/29)**2;
 return Math.max(0,Math.min(1,(1.2-ellipse)/.7));
}
