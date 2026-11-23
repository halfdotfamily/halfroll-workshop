// Presentation time only: sample the existing physical throw, never alter poses
// or its engine-selected result. Slow the lift, rather than waiting for descent.
const X=[0,.08,.48,.78,1],Y=[0,.06,.22,.60,1];
const slopes=X.slice(1).map((x,i)=>(Y[i+1]-Y[i])/(x-X[i]));
const tangents=[slopes[0],...slopes.slice(1).map((d,i)=>2*slopes[i]*d/(slopes[i]+d)),slopes.at(-1)];
export const TRIAL_SLOW_START=.08;
export function trialPlaybackProgress(progress){
 const f=Math.max(0,Math.min(1,Number(progress)||0));
 if(f===1)return 1;
 const i=Math.max(0,X.findIndex((x,j)=>j<X.length-1&&f>=x&&f<X[j+1]));
 const h=X[i+1]-X[i],t=(f-X[i])/h,t2=t*t,t3=t2*t;
 return (2*t3-3*t2+1)*Y[i]+(t3-2*t2+t)*h*tangents[i]+(-2*t3+3*t2)*Y[i+1]+(t3-t2)*h*tangents[i+1];
}
