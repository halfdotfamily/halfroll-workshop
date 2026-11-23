// Rendering-only work. Engine dice/RNG are committed by the caller after success.
export function createDicePreparer({makeWorker,computeFallback,timeoutMs=12000}={}){
 const cache=new Map();let active=null,queued=null,worker=null,destroyed=false;
 function stop(){worker?.terminate();worker=null;}
 function finish(task,error,result){
  if(active!==task)return;clearTimeout(task.timer);active=null;
  if(error)task.reject(error);else{cache.set(task.job.key,result);while(cache.size>3)cache.delete(cache.keys().next().value);task.resolve(result);}
  if(queued&&!destroyed){const job=queued;queued=null;warm(job);}
 }
 function armDeadline(task){
  clearTimeout(task.timer);task.timer=setTimeout(()=>{if(active!==task)return;stop();task.abort.abort(Error('Dice preparation timed out'));finish(task,Error('Dice preparation timed out'));},timeoutMs);
 }
 function start(job,foreground){
  const task={job,foreground,abort:new AbortController()};task.promise=new Promise((resolve,reject)=>Object.assign(task,{resolve,reject}));active=task;
  armDeadline(task);
  try{
   worker??=makeWorker?.();
   if(worker){worker.onmessage=({data})=>{if(active!==task||data.key!==job.key)return;finish(task,data.error?Error(data.error):null,data.plan);};worker.onerror=event=>{event.preventDefault?.();if(active!==task)return;stop();fallback(task);};worker.postMessage(job);}
   else fallback(task);
  }catch{stop();fallback(task);}
  return task.promise;
 }
 function fallback(task){Promise.resolve().then(()=>computeFallback(task.job,task.abort.signal)).then(plan=>finish(task,null,plan),error=>finish(task,error));}
 function cancelPending(){queued=null;const task=active;if(task){stop();task.abort.abort(Error('Dice preparation cancelled'));finish(task,Error('Dice preparation cancelled'));}}
 function cancel(){cancelPending();cache.clear();}
 function prepare(job){
  if(destroyed)return Promise.reject(Error('Dice scene is closed'));
  if(cache.has(job.key))return Promise.resolve(cache.get(job.key));
  if(active?.job.key===job.key){if(!active.foreground){active.foreground=true;armDeadline(active);}return active.promise;}
  if(active){queued=null;const old=active;stop();old.abort.abort(Error('Dice preparation superseded'));finish(old,Error('Dice preparation superseded'));}
  return start(job,true);
 }
 function warm(job){if(destroyed||cache.has(job.key)||active?.job.key===job.key)return;if(active){if(!active.foreground)queued=job;return;}void start(job,false).catch(()=>{});}
 return{warm,prepare,peek:key=>cache.get(key),cancelPending,cancel,debug:()=>({pending:active?.foreground||false,working:!!active,cached:cache.size}),destroy(){destroyed=true;cancel();}};
}
