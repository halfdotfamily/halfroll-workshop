// Cosmetic body contacts only. Never writes a player's numbered section.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function extent(p,nx,nz){const c=Math.cos(p.heading),s=Math.sin(p.heading);return Math.abs(nx*c-nz*s)*p.rx+Math.abs(nx*s+nz*c)*p.rz;}
export function createPawnCrowd(){
 const bodies=new Map();
 function update(items,seconds=0,{snap=false,reduced=false}={}){
  const alive=new Set(items.map(p=>String(p.id)));for(const id of bodies.keys())if(!alive.has(id))bodies.delete(id);
  const list=[...items].sort((a,b)=>String(a.id).localeCompare(String(b.id),'en',{numeric:true})).map(p=>{
   const id=String(p.id);let b=bodies.get(id);if(!b||snap){const hash=[...id].reduce((n,c)=>n*31+c.charCodeAt(0),0),a=hash*2.399963;b={id,ox:Math.cos(a)*.012,oz:Math.sin(a)*.012,seedX:Math.cos(a)*.012,seedZ:Math.sin(a)*.012,vx:0,vz:0};bodies.set(id,b);}return Object.assign(b,{anchor:p,rx:p.rx,rz:p.rz,heading:p.heading});
  });
  const dt=clamp(seconds,0,2),steps=reduced?1:Math.max(1,Math.ceil(dt*60)),h=dt/steps;let contacts=0;
  for(let step=0;step<steps;step++){
   for(const b of list){if(reduced){b.vx=b.vz=0;const near=list.some(o=>o!==b&&o.anchor.solid!==false&&Math.abs(o.anchor.y-b.anchor.y)<=1.9&&Math.hypot(o.anchor.x-b.anchor.x,o.anchor.z-b.anchor.z)<b.rx+o.rx+b.rz+o.rz);b.ox=near?b.seedX:0;b.oz=near?b.seedZ:0;}else{const damp=Math.exp(-12*h),c=Math.cos(b.heading),s=Math.sin(b.heading),across=b.ox*c-b.oz*s;b.vx=(b.vx-(b.ox*28+across*c*65)*h)*damp;b.vz=(b.vz-(b.oz*28-across*s*65)*h)*damp;b.ox+=b.vx*h;b.oz+=b.vz*h;}b.x=b.anchor.x+b.ox;b.z=b.anchor.z+b.oz;}
   // Projected contacts prevent penetration even on a slow frame or a snapped replay.
   for(let pass=0;pass<24;pass++){
    let deepest=0;
    for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
     const a=list[i],b=list[j];if(a.anchor.solid===false||b.anchor.solid===false||Math.abs(a.anchor.y-b.anchor.y)>1.9)continue;
     let dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
     if(d<1e-7){const angle=a.heading+(i+j)%2*Math.PI/2;dx=Math.sin(angle);dz=Math.cos(angle);d=1;}
     const nx=dx/d,nz=dz/d,gap=extent(a,nx,nz)+extent(b,nx,nz)+.045,actual=Math.hypot(b.x-a.x,b.z-a.z),depth=gap-actual;
     if(depth<=.0001)continue;deepest=Math.max(deepest,depth);contacts++;
     const push=(depth+.0001)/2;a.x-=nx*push;a.z-=nz*push;b.x+=nx*push;b.z+=nz*push;
    }
    if(deepest<.0005)break;
   }
   for(const b of list){b.ox=b.x-b.anchor.x;b.oz=b.z-b.anchor.z;}
  }
  return{contacts,positions:new Map(list.map(b=>[b.id,{x:b.x,z:b.z,offsetX:b.ox,offsetZ:b.oz,rx:b.rx,rz:b.rz}]))};
 }
 return{update,clear:()=>bodies.clear()};
}
