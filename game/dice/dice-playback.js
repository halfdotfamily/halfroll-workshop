// Presentation only: preparing a trajectory must never block or commit game state.
export function createDicePlayback({prepare,play,restore,onPending=()=>{},fallback,cancelPrepare=()=>{},prepareBudgetMs=80}){
 let serial=0;
 function cancel(){serial++;onPending(false);}
 async function launch(values,power=.35,{ageMs=()=>0,settled=false,liveWindowMs=0,isCurrent=()=>true}={}){
  const ticket=++serial;onPending(true);
  try{
   // Build only the cheap alternative up front. A late or reconnect snapshot
   // does not need a worker at all; an open live throw gets a bounded wait.
   const live=liveWindowMs>0;
   let recorded;
   const alternative=()=>recorded??=fallback?.(values,power,live);
   const initialAge=Math.max(0,Number(ageMs())||0);
   let prepared;
   if(fallback&&(settled||initialAge>=(live?liveWindowMs:alternative().duration*1000))){cancelPrepare();prepared=alternative();}
   else if(!fallback)prepared=await prepare(values,power);
   else{
    let timer;
    const bounded=new Promise(resolve=>{timer=setTimeout(()=>{
     if(ticket!==serial||!isCurrent()){resolve(null);return;}
     cancelPrepare();resolve(alternative());
    },live?Math.min(450,Math.max(0,liveWindowMs-initialAge)):prepareBudgetMs);});
    try{prepared=await Promise.race([Promise.resolve(prepare(values,power)).catch(error=>{
     if(ticket!==serial||!isCurrent())return null;
     cancelPrepare();return alternative();
    }),bounded]);}finally{clearTimeout(timer);}
   }
   if(!prepared||ticket!==serial||!isCurrent())return null;
   const saved=play(prepared),age=Math.max(0,Number(ageMs())||0);
   const duration=saved.plan.duration*1000;
   const remaining=liveWindowMs-age;
   if(live && remaining>0 && !settled){
    // Normal network/preparation latency should not skip the lift-off.
    // An old snapshot seeks forward so it still lands on the server clock.
    saved.rate=Math.min(1.35,Math.max(1,duration/remaining));
    saved.startWall-=Math.max(0,duration/saved.rate-remaining);
   }else saved.startWall-=age;
   restore(saved,settled||(live?remaining<=0:age>=duration));
   return saved;
  }finally{if(ticket===serial)onPending(false);}
 }
 return{launch,cancel};
}
