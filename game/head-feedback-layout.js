// Screen-space layout only. No game outcomes, timers or authority live here.
export const RESULT_READ_MS=2400;
export const RESULT_WIDTH=100;
export const overlaps=(a,b,gap=5)=>a.x<b.x+b.width+gap&&a.x+a.width>b.x-gap&&a.y<b.y+b.height+gap&&a.y+a.height>b.y-gap;
export function placeHeadFeedback({x,y,width,height,viewport,obstacles=[],placed=[],aboveOnly=false,nearOnly=false}){
 const margin=8,candidates=[];
 // Never detach a head bubble to a remote screen shelf. Wait at its owner.
 if(nearOnly){for(const dx of [0,-8,8,-width*.32,width*.32]){const box={x:Math.max(margin,Math.min(viewport.width-margin-width,x-width/2+dx)),y:y-height-8,width,height};if(Math.abs(box.x+width/2-x)<=width*.32+1e-6&&box.x>=margin&&box.x+width<=viewport.width-margin&&box.y>=margin&&box.y+height<=viewport.height-margin&&![...obstacles,...placed].some(o=>overlaps(box,o)))return box;}return null;}

 for(let row=0;row<7;row++)for(const shift of [0,-.6,.6,-1.15,1.15,-1.7,1.7]){
  const box={x:Math.max(margin,Math.min(viewport.width-width-margin,x-width/2+shift*width)),y:y-height-10-row*(height+8),width,height};
  if(box.y>=margin&&box.y+height<=viewport.height-margin&&![...obstacles,...placed].some(o=>overlaps(box,o)))candidates.push({...box,score:Math.abs(box.x+width/2-x)+row*(height+8)*1.2});
 }
 // If a head is under the header, a side shelf is still clearly associated.
 if(!aboveOnly)for(const sign of [-1,1])for(let row=0;row<7;row++){
  const box={x:Math.max(margin,Math.min(viewport.width-width-margin,x+sign*(width/2+16)-width/2)),y:Math.max(margin,y-height/2)+row*(height+8),width,height};
  if(box.y+height<=viewport.height-margin&&![...obstacles,...placed].some(o=>overlaps(box,o)))candidates.push({...box,score:Math.abs(box.x+width/2-x)+Math.abs(box.y+height-y)+100});
 }
 if(!candidates.length&&!aboveOnly){
  // Dense phone layouts leave narrow shelves between names and the HUD.
  // Use their actual edges rather than skipping over them with a whole-card step.
  const blockers=[...obstacles,...placed],ys=[margin,viewport.height-height-margin,...blockers.flatMap(o=>[o.y+o.height+8,o.y-height-8])],xs=[margin,viewport.width-width-margin,x-width/2,x-width-16,x+16];
  for(const top of ys)for(const left of xs){const box={x:Math.max(margin,Math.min(viewport.width-width-margin,left)),y:top,width,height};if(box.y>=margin&&box.y+height<=viewport.height-margin&&!blockers.some(o=>overlaps(box,o)))candidates.push({...box,score:Math.abs(box.x+width/2-x)+Math.abs(box.y+height-y)+150});}
 }
 return candidates.sort((a,b)=>a.score-b.score)[0]??null;
}
