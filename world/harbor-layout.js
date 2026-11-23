// One footprint shared by the terrain, paved arrival court and coastal props.
export const START_COURT={x:-7.8,z:39.3,y:.6,radius:3.55,seatRadius:2.4};
export function courtSeat(id){const a=id*Math.PI/3;return{x:START_COURT.x+Math.sin(a)*START_COURT.seatRadius,y:START_COURT.y+.03,z:START_COURT.z-Math.cos(a)*START_COURT.seatRadius,rotation:-a};}
export function carveArrivalCourt(x,z,y){
 const d=Math.hypot(x-START_COURT.x,z-START_COURT.z),t=Math.max(0,Math.min(1,(d-3.95)/1.45)),blend=t*t*(3-2*t);
 return Math.min(y,.41+(y-.41)*blend);
}
export function buildPierLayout(heightAt){
 const x=-18.8,width=2.3,approach=[];
 // Sample the entire tread, including its underside and all four corners.
 const support=(z,depth)=>{let top=-4.5;for(let dx=-width/2;dx<=width/2+.001;dx+=width/8)for(let dz=-depth/2;dz<=depth/2+.001;dz+=depth/4){const y=heightAt(x+dx,z+dz);if(y!==null)top=Math.max(top,y);}return top;};
 for(let i=0;i<17;i++){const z=36.9+i*.28;approach.push({x,z,y:Math.max(i?approach[i-1].y:-4.5,support(z,.30)+.2),depth:.30});}
 const landY=approach.at(-1).y,landing={x,z:41.65,y:landY,width,depth:.8};
 const descent=Array.from({length:22},(_,i)=>({x,z:42.02+i*(47.7-42.02)/21,y:landY+(-2.45-landY)*i/21,depth:.30}));
 return{x,width,approach,landing,descent,treads:[...approach,...descent]};
}
