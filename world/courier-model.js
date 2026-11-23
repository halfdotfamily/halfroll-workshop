import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createCourierBase } from '../game/critter-models.js';

const colors = {
  blue: 0x435fa8, navy: 0x303953, ink: 0x2a2c31, mint: 0x91cbb2,
  cream: 0xffefcf, kraft: 0xe5b774, coral: 0xdb7863, leather: 0xa37150,
};
const materials = Object.fromEntries(Object.entries(colors).map(([key, color]) =>
  [key, new T.MeshStandardMaterial({color, roughness: .9})]));
const vec = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);

function mesh(parent, geometry, color, x, y, z) {
  const object = new T.Mesh(geometry, materials[color]);
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}
function box(parent, color, x, y, z, w, h, d, radius = .025) {
  return mesh(parent, new RoundedBoxGeometry(w, h, d, 2, radius), color, x, y, z);
}
function curve(parent, points, radius, color) {
  const path = new T.CatmullRomCurve3(points.map(p => vec(...p)));
  return mesh(parent, new T.TubeGeometry(path, 16, radius, 8, false), color, 0, 0, 0);
}

function addCap(model) {
  const cap = new T.Group();
  model.add(cap);
  cap.position.set(0, 2.44, .008);
  cap.rotation.z = .025;
  // One turned crown with a rolled edge. Its brim is rooted inside the dark band.
  const profile = [[.01,-.052],[.62,-.052],[.715,-.04],[.72,.048],[.77,.075],
    [.79,.125],[.78,.17],[.74,.235],[.63,.30],[.46,.345],[.22,.375],[0,.383]];
  const crown = new T.LatheGeometry(profile.map(([r,h]) => new T.Vector2(r,h)), 48);
  const bandSteps = 3, steps = profile.length - 1;
  const band = [], fabric = [], indices = crown.index.array;
  for (let i = 0; i < 48; i++) {
    const start = i * steps * 6, split = start + bandSteps * 6;
    band.push(...indices.subarray(start, split));
    fabric.push(...indices.subarray(split, start + steps * 6));
  }
  crown.setIndex(band.concat(fabric));
  crown.addGroup(0, band.length, 0);
  crown.addGroup(band.length, fabric.length, 1);
  const top = new T.Mesh(crown, [materials.navy, materials.blue]);
  top.scale.z = .76;
  cap.add(top);
  // Wrap the visor root inside the elliptical band over its entire arc.
  const visorShape = new T.Shape();
  const span = 1.26, sections = 36;
  for (let i = 0; i <= sections; i++) {
    const angle = span * (2 * i / sections - 1);
    const bill = .29 * Math.cos(angle / span * Math.PI / 2) ** 1.5;
    const x = (.711 + bill * .22) * Math.sin(angle);
    const z = .542 * Math.cos(angle) + bill;
    if (i === 0) visorShape.moveTo(x, z);
    else visorShape.lineTo(x, z);
  }
  for (let i = sections; i >= 0; i--) {
    const angle = span * (2 * i / sections - 1);
    visorShape.lineTo(.67 * Math.sin(angle), .50 * Math.cos(angle));
  }
  visorShape.closePath();
  const visorGeometry = new T.ExtrudeGeometry(visorShape, {
    depth: .027, bevelEnabled: true, bevelThickness: .009, bevelSize: .009, bevelSegments: 2,
  });
  visorGeometry.rotateX(Math.PI / 2);
  const visor = mesh(cap, visorGeometry, 'navy', 0, .037, 0);
  visor.rotation.x = .045;
  const badge = box(cap,'cream',0,.181,.587,.29,.169,.045,.023);
  badge.rotation.x = -.19;
  curve(badge,[[-.113,.045,.03],[0,-.022,.03],[.113,.045,.03]],.011,'navy');
}

// Fit both edges of the ribbon directly to the rounded silhouette. A flat strip
// placed in front of the mesh floats off the cheek when viewed from the side.
function addSatchel(model) {
  const body = model.getObjectByName('Critter body');
  body.updateWorldMatrix(true, false);
  const center = vec(0,1.48,0), ray = new T.Raycaster();
  const path = new T.CatmullRomCurve3([
    // From the front of the bag, below the smile and over the far shoulder.
    [-.91,.94,.19],[-.72,.82,.43],[-.27,.78,.43],[.18,.81,.43],
    [.59,.95,.43],[.84,1.17,.42],[.96,1.46,.36],[.97,1.66,.22],
    [.95,1.77,.03],[.90,1.81,-.24],
    // Return diagonally across the back to the rear attachment.
    [.63,1.75,-.43],[-.05,1.44,-.43],[-.72,1.10,-.43],[-.92,.97,-.27],
  ].map(p => vec(...p)), true);
  function onSkin(point) {
    const radial = point.clone().sub(center).normalize();
    ray.set(center.clone().addScaledVector(radial,4), radial.clone().negate());
    const hit = ray.intersectObject(body,false)[0];
    return hit.point.addScaledVector(radial,.027).addScaledVector(hit.face.normal,.012);
  }
  const vertices=[], indices=[];
  const steps=120;
  for (let i=0; i<=steps; i++) {
    const t=i/steps, p=path.getPointAt(t);
    const across=path.getTangentAt(t).cross(p.clone().sub(center)).normalize();
    for (const sign of [-1,0,1]) vertices.push(...onSkin(p.clone().addScaledVector(across,sign*.050)).toArray());
    if (i<steps) for(let j=0;j<2;j++){
      const a=3*i+j;
      indices.push(a,a+1,a+3,a+1,a+4,a+3);
    }
  }
  const geom=new T.BufferGeometry();
  geom.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  const strapMaterial=materials.leather.clone();
  strapMaterial.side=T.DoubleSide;
  model.add(new T.Mesh(geom,strapMaterial));
  const bag=new T.Group();
  bag.position.set(-.93,.97,-.075);
  bag.rotation.z=-.07;
  model.add(bag);
  box(bag,'leather',0,0,0,.34,.55,.57,.075);
  box(bag,'blue',-.039,.102,0,.32,.30,.59,.052);
  box(bag,'kraft',-.207,.011,0,.028,.09,.095,.018);
}
function makeParcel() {
  const parcel=new T.Group();
  box(parcel,'kraft',0,0,0,.94,.50,.49,.04);
  box(parcel,'cream',0,.192,0,.96,.133,.505,.032);
  box(parcel,'mint',-.13,.005,0,.125,.526,.516,.012);
  const seal=mesh(parcel,new T.CylinderGeometry(.087,.087,.023,24),'coral',-.13,.026,.268);
  seal.rotation.x=Math.PI/2;
  box(parcel,'cream',-.13,.027,.283,.055,.055,.009,.005).rotation.z=Math.PI/4;
  return parcel;
}

// The wrist follows a grip on the parcel. The bent arm follows a smooth
// centreline, including at the furthest point of the handoff.
function carryingArm(group, label, side) {
  const arm=group.getObjectByName(label+' gesture arm');
  arm.getObjectByName(label+' thin arm').visible=false;
  const wrist=arm.getObjectByName(label+' wrist');
  wrist.rotation.z=side*.50;
  const segments=10, sides=8;
  const positions=new Float32Array((segments+1)*sides*3);
  const normals=new Float32Array(positions.length);
  const geom=new T.BufferGeometry(), triangles=[];
  for (let i=0;i<segments;i++) for(let j=0;j<sides;j++) {
    const a=i*sides+j,b=i*sides+(j+1)%sides;
    triangles.push(a,b,a+sides,b,b+sides,a+sides);
  }
  const attribute = array => new T.BufferAttribute(array,3).setUsage(T.DynamicDrawUsage);
  geom.setIndex(triangles);
  geom.setAttribute('position',attribute(positions));
  geom.setAttribute('normal',attribute(normals));
  mesh(arm,geom,'ink',0,0,0).frustumCulled=false;
  const start=vec(), bend=vec(), end=vec(), pt=vec(), tangent=vec(), n=vec(), b=vec();
  const path=new T.QuadraticBezierCurve3(start,bend,end), up=vec(0,1,0);
  return (parcel,give)=>{
    // Convert box-local grip to arm-local coordinates, including the box tilt.
    end.set(side*.491,-.073,.202).applyMatrix4(parcel.matrix).sub(arm.position);
    end.y-=arm.parent.position.y;
    wrist.position.copy(end);
    bend.set(side*.088,-.68+give*.12,.35+give*.14);
    for(let i=0;i<=segments;i++) {
      const t=i/segments;
      path.getPoint(t,pt);
      tangent.copy(bend).multiplyScalar(1-2*t).addScaledVector(end,t).normalize();
      n.crossVectors(up,tangent).normalize();b.crossVectors(tangent,n);
      for(let j=0;j<sides;j++) {
        const a=2*Math.PI*j/sides,k=(i*sides+j)*3;
        const c=Math.cos(a),s=Math.sin(a);
        normals[k]=n.x*c+b.x*s;normals[k+1]=n.y*c+b.y*s;normals[k+2]=n.z*c+b.z*s;
        positions[k]=pt.x+.031*normals[k];positions[k+1]=pt.y+.031*normals[k+1];positions[k+2]=pt.z+.031*normals[k+2];
      }
    }
    geom.attributes.position.needsUpdate=true;
    geom.attributes.normal.needsUpdate=true;
  };
}

export function createPosty() {
  const model=createCourierBase();
  model.name='POSTY';
  addCap(model);
  addSatchel(model);
  const parcel=makeParcel();
  model.add(parcel);
  const legs=['Left','Right'].map(label=>model.getObjectByName(label+' thin leg'));
  const arms=[carryingArm(model,'Left',-1),carryingArm(model,'Right',1)];
  function pose(mode,time) {
    const run=mode==='Run', give=mode==='Delivery'?(1-Math.cos(time*2))*.5:0;
    const stride=run?Math.sin(time*10):0;
    model.position.y=run?.10*stride*stride:.01*(1+Math.sin(time*2));
    model.rotation.z=stride*.027;
    legs.forEach((leg,i)=>{leg.rotation.x=(i?1:-1)*stride*.85;});
    parcel.position.set(.015,.91+give*.17,.711+give*.40);
    parcel.rotation.z=stride*.033;
    parcel.rotation.x=-.055-give*.08;
    parcel.updateMatrix();
    for(const arm of arms) arm(parcel,give);
  }
  pose('Idle',0);
  return {model,pose,parcel};
}

