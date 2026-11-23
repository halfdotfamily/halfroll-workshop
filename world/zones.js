import * as THREE from 'three';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// One continuous biome boundary for the lawn AND every coastal sediment band.
// Low-frequency bends read as a natural fringe rather than an axis-aligned cut.
export function emberWeight(x,z){
 const west=x+1.15*Math.sin(z*.24)+.45*Math.sin(z*.61);
 const south=z+.95*Math.sin(x*.21)+.4*Math.cos(x*.53);
 return smooth(-23,-11,west)*(1-smooth(-23,-11,south));
}
const coastBands={
 meadow:['#6fae47','#c98a52','#a66a3f','#77482f'].map(c=>new THREE.Color(c)),
 woods:['#6fae47','#b98252','#97663f','#6c4733'].map(c=>new THREE.Color(c)),
 ember:['#5f5560','#6c4a50','#523b42','#3e2e35'].map(c=>new THREE.Color(c)),
};
export function coastBandColor(x,z,band){
 const woodland=smooth(29,40,x)*smooth(-17,-5,z);
 return coastBands.meadow[band].clone().lerp(coastBands.woods[band],woodland).lerp(coastBands.ember[band],emberWeight(x,z));
}
export function zoneTint(color,p,noise){
 const north=emberWeight(p.x,p.z);
 const basalt=new THREE.Color('#6a4a63').lerp(new THREE.Color('#a06b6f'),noise*.6);
 color.lerp(basalt,north*.91);
 const dock=smooth(22,28,p.z)*(1-smooth(-3,2,p.x))*smooth(-29,-24,p.x);
 color.lerp(new THREE.Color('#c6b58b').lerp(new THREE.Color('#98ab7c'),noise*.45),dock*.8);
 const wood=smooth(15,22,p.x)*smooth(-17,-10,p.z);
 color.lerp(new THREE.Color('#739469').lerp(new THREE.Color('#c0c48c'),noise*.7),wood*.75);
 const garden=(1-smooth(14,19,Math.abs(p.x)))*(1-smooth(14,19,Math.abs(p.z)));
 color.lerp(new THREE.Color('#b8c7a0').lerp(new THREE.Color('#d8d4b7'),noise*.55),garden*.65);
 return color;
}
export const REGIONS={
 volcano:{label:'Ember coast',target:[36,3,-29],eye:[30,28,-28],zoom:3.7},
 shore:{label:'Woodland coves',target:[39,1,15],eye:[48,24,14],zoom:3.0},
 inlet:{label:'Tidal passage',target:[40,1,-15],eye:[45,27,25],zoom:4.2},
 gardenwall:{label:'Garden terraces',target:[13,10,4],eye:[45,30,24],zoom:3.7},
 harbor:{label:'Drift Dock',target:[-14,1,38],eye:[24,29,44],zoom:3.6},
 mossfall:{label:'Mossfall',target:[-28,6,-4],eye:[26,36,48],zoom:2.6},
 ember:{label:'Ember Hollow',target:[12,7,-23],eye:[16,58,18],zoom:2.7},
 pocket:{label:'Pocket Woods',target:[27,7,10],eye:[37,32,36],zoom:2.7},
 crown:{label:'Crown Garden',target:[0,12,0],eye:[26,36,46],zoom:3.2}
};
