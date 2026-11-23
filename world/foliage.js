import * as THREE from '../assets/vendor/three/three.module.js';
import { GLTFLoader } from '../assets/nature-mossfall/vendor/GLTFLoader.js';

// Imported CC0 geometry, authored composition, and a seeded understory.
// Every instance uses the actual terrain sampler; the board corridor stays empty.
const ASSET_ROOT = new URL('../assets/nature-mossfall/', import.meta.url);
const GROUPS = {
  trees: ['tree_oak', 'tree_detailed', 'tree_plateau', 'tree_palmDetailedTall', 'tree_palmBend'],
  shrubs: ['plant_bushDetailed', 'plant_bushLarge'],
  ferns: ['plant_flatTall', 'plant_flatShort', 'grass_leafsLarge'],
  grass: ['grass_large', 'grass'],
  rocks: ['rock_largeA', 'rock_largeC', 'rock_tallA', 'rock_smallA', 'rock_smallC'],
  mushrooms: ['mushroom_tanGroup', 'mushroom_redGroup'],
  flowers: ['flower_purpleA', 'flower_yellowC'],
};
const LEAF = ['#759d77', '#43866e', '#a5c898', '#6aab8d', '#91bca4'];

export async function buildMossfallFoliage(scene, { heightAt, routeDistance, waterHeightAt = () => null, riverDistance = () => Infinity, riverSample = null }) {
  const root = new THREE.Group(); root.name = 'Mossfall — imported CC0 botanical layers';
  const stats = { importedModels: 0, trees: 0, shrubs: 0, ferns: 0, grass: 0, rocks: 0, mushrooms: 0, flowers: 0, instances: 0, drawCalls: 0, source: 'Kenney Nature Kit 2.1 / CC0', minRouteClearance: Infinity };
  const loader = new GLTFLoader(), assets = new Map(), materialCache = new Map(), time = { value: 0 };
  let seed = 10202026;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const lerp = (a, b) => a + (b - a) * random();
  function material(name, kind, variant) {
    const key = `${name}:${kind}:${variant}`;
    if (materialCache.has(key)) return materialCache.get(key);
    const leaf = /leaf|grass/i.test(name), wood = /wood|bark/i.test(name);
    let color = leaf ? LEAF[variant % LEAF.length] : wood ? '#76664f' : '#9bafa4';
    if (/dirt/i.test(name)) color = kind === 'rocks' ? '#82998e' : '#84755e';
    if (/red/i.test(name)) color = '#3f5ba8';
    if (/tan|beige|white/i.test(name)) color = '#efe9dc';
    if (/yellow/i.test(name)) color = '#e4ca82';
    if (/purple/i.test(name)) color = '#b9a8cc';
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, flatShading: true });
    if (leaf && kind !== 'rocks') {
      mat.onBeforeCompile = shader => {
        shader.uniforms.mossfallTime = time;
        shader.vertexShader = 'uniform float mossfallTime;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float swayPhase = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.43;
          float swayTip = smoothstep(0.25, 1.0, position.y);
          transformed.x += sin(mossfallTime * 0.8 + swayPhase) * 0.014 * swayTip;
          transformed.z += cos(mossfallTime * 0.62 + swayPhase) * 0.009 * swayTip;`);
      };
      mat.customProgramCacheKey = () => 'mossfall-leaf-breeze-v1';
    }
    materialCache.set(key, mat); return mat;
  }
  await Promise.all(Object.entries(GROUPS).flatMap(([kind, names]) => names.map(async (name, variant) => {
    const gltf = await loader.loadAsync(new URL(`${name}.glb`, ASSET_ROOT).href);
    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const norm = new THREE.Matrix4().makeScale(1 / size.y, 1 / size.y, 1 / size.y).multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
    const parts = [];
    gltf.scene.traverse(node => {
      if (!node.isMesh) return;
      const geometry = node.geometry.clone().applyMatrix4(norm.clone().multiply(node.matrixWorld));
      const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
      const materials = sourceMaterials.map(m => material(m.name, kind, variant));
      parts.push({ geometry, material: materials.length === 1 ? materials[0] : materials, matrices: [] });
    });
    assets.set(name, { name, kind, radius: Math.max(size.x, size.z) / size.y / 2, parts }); stats.importedModels++;
  })));

  const occupied = [], dummy = new THREE.Object3D(), placements = [];
  // Tree roots and crowns respect the whole route, not just tile centers.
  function allowed(x, z, radius, kind) {
    if (x < -38 + radius * .3 || x > -16.8 || z < -27 + radius * .2 || z > 27 - radius * .2 || Math.hypot(x, z) < 9 + radius) return false;
    if (routeDistance(x, z) < 1.65 + radius) return false;
    if (Math.hypot(x + 20, z - 9) < 2.9 + radius) return false;
    if (Math.abs(x + 36.6) < 2.1 + radius && Math.abs(z - 11.9) < 5 + radius) return false;
    const y = heightAt(x, z); if (!Number.isFinite(y)) return false;
    const water = waterHeightAt(x, z);
    if (Number.isFinite(water) && water > y - .12) return false;
    const river = riverSample?.(x, z);
    const bankMargin = kind === 'trees' ? .7 : .15;
    if (river ? river.distance < river.width / 2 + radius + bankMargin : riverDistance(x, z) < 2.8 + radius) return false;
    const rootRadius = Math.min(radius * .34, .55);
    const support = [[rootRadius, 0], [-rootRadius, 0], [0, rootRadius], [0, -rootRadius]].map(([dx, dz]) => heightAt(x + dx, z + dz));
    if (support.some(v => !Number.isFinite(v) || Math.abs(v - y) > (kind === 'rocks' ? 1.2 : .65))) return false;
    if (kind === 'trees' && occupied.some(p => Math.hypot(p.x - x, p.z - z) < (p.radius + radius) * .72)) return false;
    return true;
  }
  function place(kind, x, z, h, choice = null) {
    const names = GROUPS[kind], asset = assets.get(choice || names[Math.floor(random() * names.length)]);
    const stretch = lerp(.88, 1.12), radius = asset.radius * h * stretch;
    if (!allowed(x, z, radius, kind)) return false;
    const y = heightAt(x, z);
    dummy.position.set(x, y - Math.min(.07, h * .025), z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0); dummy.scale.set(h * stretch, h, h * stretch); dummy.updateMatrix();
    for (const part of asset.parts) part.matrices.push(dummy.matrix.clone());
    if (kind === 'trees') occupied.push({ x, z, radius });
    placements.push({ kind, model: asset.name, x, y, z, height: h, radius });
    stats[kind]++; stats.minRouteClearance = Math.min(stats.minRouteClearance, routeDistance(x, z) - radius); return true;
  }
  // Layer 1: staggered big silhouettes, deliberately taller behind the falls.
  const groves = [ [-35, -19], [-23, -20], [-35, -7], [-22, -5], [-35, 10], [-23, 18], [-21, 2], [-33, 22] ];
  const jungleTrees = ['tree_detailed', 'tree_detailed', 'tree_detailed', 'tree_palmBend', 'tree_palmBend', 'tree_plateau', 'tree_palmDetailedTall'];
  // The taller rear group frames the falls; no canopy is allowed above the channel.
  for (const [x,z,h,model] of [[-35,-16,6.5,'tree_detailed'],[-35.5,-9,6,'tree_palmBend'],[-24.2,-15,5.7,'tree_palmDetailedTall'],[-35,-23,5.8,'tree_plateau']]) {
    place('trees',x,z,h,model);
  }
  for (let attempt = 0; attempt < 750 && stats.trees < 48; attempt++) {
    const anchor = groves[Math.floor(random() * groves.length)], angle = random() * Math.PI * 2, r = Math.sqrt(random()) * 5.3;
    place('trees', anchor[0] + Math.cos(angle) * r, anchor[1] + Math.sin(angle) * r, lerp(3.8, 6.5), jungleTrees[Math.floor(random()*jungleTrees.length)]);
  }
  // Layer 3: an authored waterside fringe. Small rooted fans and mossy stones
  // track both actual banks, rather than leaving a uniform empty corridor.
  stats.bankFerns = 0; stats.bankRocks = 0;
  if (riverSample) for (const [kind,target,countKey] of [['ferns',40,'bankFerns'],['rocks',20,'bankRocks']]) {
    for(let attempt=0;attempt<target*40 && stats[countKey]<target;attempt++) {
      const z=lerp(-20,12), sample=riverSample(-30,z), side=attempt%2===0?-1:1;
      const names=kind==='ferns'?['plant_flatShort','grass_leafsLarge','plant_flatTall']:['rock_smallA','rock_smallC','rock_largeA'];
      const name=names[Math.floor(random()*names.length)], height=kind==='ferns'?lerp(.48,.85):lerp(.3,.65);
      const radius=assets.get(name).radius*height*1.12;
      const x=sample.x+side*(sample.width/2+radius+lerp(.22,.85));
      if(place(kind,x,z,height,name))stats[countKey]++;
    }
  }
  // Layer 2: clustered leaf fans, broad bushes and mossy stones between trunks.
  const layers = [ ['shrubs', 90, .7, 1.55], ['ferns', 155, .45, 1.25], ['rocks', 70, .35, 1.35], ['mushrooms', 42, .22, .46], ['flowers', 65, .24, .55], ['grass', 180, .2, .48] ];
  for (const [kind, target, low, high] of layers) {
    for (let attempt = 0; attempt < target * 22 && stats[kind] < target; attempt++) {
      let x, z;
      if (random() < .68) {
        const anchor = groves[Math.floor(random() * groves.length)], angle = random() * Math.PI * 2, r = Math.sqrt(random()) * 6;
        x = anchor[0] + Math.cos(angle) * r; z = anchor[1] + Math.sin(angle) * r;
      } else { x = lerp(-37, -18); z = lerp(-25, 25); }
      place(kind, x, z, lerp(low, high));
    }
  }
  for (const asset of assets.values()) for (const part of asset.parts) {
    if (!part.matrices.length) { part.geometry.dispose(); continue; }
    const batch = new THREE.InstancedMesh(part.geometry, part.material, part.matrices.length);
    batch.name = `CC0 ${asset.name}`;
    part.matrices.forEach((matrix, i) => batch.setMatrixAt(i, matrix));
    batch.instanceMatrix.needsUpdate = true; batch.castShadow = asset.kind === 'trees' || asset.kind === 'rocks'; batch.receiveShadow = true;
    batch.computeBoundingSphere(); root.add(batch);
    stats.instances += part.matrices.length; stats.drawCalls += Array.isArray(part.material) ? part.material.length : 1;
  }
  stats.minRouteClearance = Math.round(stats.minRouteClearance * 100) / 100;
  root.userData.placements = placements; scene.add(root);
  return { root, stats, placements, update: seconds => { time.value = seconds; } };
}


