// Results are gameplay data. A celebration, disconnect or client message cannot
// create a finish or authorize a payout.
export const FULL_RACE_VERSION='match-coins-v6';
export const FULL_RACE_POLICY='throne-finish-order-until-penultimate-v1';
export const FINISH_CELEBRATION_MS=2800;
export const isFullRace=value=>(typeof value==='string'?value:value?.rulesVersion)===FULL_RACE_VERSION;
export function rankedPlayers(players,winnerId){
 return [...players].sort((a,b)=>(a.finishPlace??Infinity)-(b.finishPlace??Infinity)||(b.id===winnerId)-(a.id===winnerId)||b.pos-a.pos||a.id-b.id);
}
export function completeFinishRanks(match){
 const n=match.count,order=match.finishOrder,players=match.players;
 if(!isFullRace(match)||match.mode!=='finished'||match.finishReason!=='full-race'||!Number.isInteger(n)||n<2||n>6||players.length!==n||!Array.isArray(order)||order.length!==n-1||new Set(order).size!==order.length||match.winnerId!==order[0])throw Error('The full race is not complete.');
 const ranks=Array(n),ids=new Set(players.map(p=>p.id));
 if(ids.size!==n||players.some(p=>!Number.isInteger(p.id)||p.id<0||p.id>=n))throw Error('Invalid finish seats.');
 for(let i=0;i<order.length;i++){
  const p=players.find(p=>p.id===order[i]);
  if(!p||p.pos!==144||p.finished!==true||p.finishPlace!==i+1||p.lastPlace)throw Error('Invalid throne finish order.');
  ranks[p.id]=i;
 }
 const last=players.filter(p=>!order.includes(p.id));
 if(last.length!==1||last[0].finished||last[0].finishPlace!==n||last[0].lastPlace!==true)throw Error('The last place is not fixed.');
 ranks[last[0].id]=n-1;return ranks;
}
