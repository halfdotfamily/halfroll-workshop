import {protectCameraView} from './world-camera.js';

// Only the root camera, its target and the authored bounds affect depth safety.
// Scenery animation does not. Keep the exact calculation while the view moves,
// then reuse it once damping settles instead of rebuilding vectors every frame.
export function createCameraDepthCache(camera,target,bounds,seaY){
 const previous=new Float64Array(29);let ready=false,result,calls=0,recomputes=0;
 function read(out){
  out[0]=camera.position.x;out[1]=camera.position.y;out[2]=camera.position.z;
  out[3]=camera.quaternion.x;out[4]=camera.quaternion.y;out[5]=camera.quaternion.z;out[6]=camera.quaternion.w;
  out[7]=camera.scale.x;out[8]=camera.scale.y;out[9]=camera.scale.z;
  out[10]=target.x;out[11]=target.y;out[12]=target.z;
  out[13]=camera.left;out[14]=camera.right;out[15]=camera.top;out[16]=camera.bottom;
  out[17]=camera.zoom;out[18]=camera.near;out[19]=camera.far;
  out[20]=bounds.min.x;out[21]=bounds.min.y;out[22]=bounds.min.z;
  out[23]=bounds.max.x;out[24]=bounds.max.y;out[25]=bounds.max.z;
  out[26]=seaY;out[27]=camera.matrixAutoUpdate?1:0;out[28]=camera.parent?1:0;
 }
 const current=new Float64Array(previous.length);
 return{
  update(){
   calls++;read(current);
   // The world camera has no parent. A parented/manual camera is kept correct
   // without guessing whether an ancestor's matrix has changed.
   let changed=!ready||camera.parent||!camera.matrixAutoUpdate;
   for(let i=0;!changed&&i<current.length;i++)changed=current[i]!==previous[i];
   if(changed){
    result=protectCameraView(camera,target,bounds,seaY);recomputes++;read(previous);ready=true;
   }
   return result;
  },
  debug:()=>({calls,recomputes,reused:calls-recomputes})
 };
}
