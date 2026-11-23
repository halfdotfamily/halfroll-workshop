import * as THREE from 'three';

// One soft lantern treatment for route, village and garden. The bright source
// stays inside the glass; its halo is a feathered glow, never a solid sphere.
export function buildLanternHeads(points,{scale=1}={}){
 const root=new THREE.Group();root.name='Soft lantern heads';
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uNight:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;vec4 c=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);c.xy+=position.xy;gl_Position=projectionMatrix*c;}',
  fragmentShader:'uniform float uNight;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float haze=exp(-r*r*5.)*(1.-smoothstep(.5,1.,r));float source=exp(-r*r*220.);float a=(haze*.13+source*.62)*uNight;gl_FragColor=vec4(vec3(1.,.82,.55),a);}'});
 const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(2.25*scale,2.25*scale),mat,Math.max(1,points.length)),matrix=new THREE.Matrix4();
 mesh.count=points.length;mesh.frustumCulled=false;mesh.name='Feathered lantern glow';
 points.forEach((p,i)=>{matrix.makeTranslation(p.x,p.y,p.z);mesh.setMatrixAt(i,matrix);});root.add(mesh);root.visible=false;
 return{root,setNight(n){mat.uniforms.uNight.value=Math.max(0,Math.min(1,n));root.visible=n>.02;}};
}
