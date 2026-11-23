import { Group, Vector3, MeshBasicMaterial, GreaterDepth } from 'three';
import { batchStaticScenery } from './mobile-world.js';
import { courierMarker } from './courier-marker.js';
import { createPosty } from './courier-model.js';

// The match owns position and rewards. This layer only plays new public events.
export function createCourierScene({scene, container, routePoint, screen, reduced, onCue=()=>{}, getPawn}) {
  let rig, body, ghost, parcel, marker, badge, matchId, serial = 0, phase = 'hidden';
  let tile = 0, origin = 0, target = 0, age = 0, time = 0, event;
  const markerAnchor = new Vector3(), point = new Vector3(), giftStart = new Vector3();
  const up = new Vector3(0, 1, 0);

  function mount() {
    if (rig) return;
    rig = createPosty();
    body = new Group();
    body.add(rig.model);
    // Share the racer's occlusion convention. One baked silhouette draw is enough
    // to locate the NPC through scenery, even at the smallest camera scale.
    ghost = rig.model.clone(true);
    const ink = new MeshBasicMaterial({color:0xffdfa5, transparent:true, opacity:.7,
      depthWrite:false, depthFunc:GreaterDepth, polygonOffset:true, polygonOffsetFactor:-4, polygonOffsetUnits:-4});
    ghost.traverse(o=>{if(o.isMesh){o.material=ink;o.renderOrder=9;}});
    batchStaticScenery([ghost]); ghost.visible=false; body.add(ghost);
    body.scale.setScalar(.78); scene.add(body);
    parcel = rig.parcel;
    marker = courierMarker(container); badge = marker.badge;
  }
  function hide() {
    phase = 'hidden';
    if (!body) return;
    body.visible = false;
    badge.hidden = true; marker.close(); marker.say('');
  }
  function place(section) {
    const pos = routePoint(section), next = routePoint(section + .1);
    const direction = next.sub(pos).normalize();
    // Run just inside the edge so a racer on this tile can stand alongside POSTY.
    body.position.copy(pos).addScaledVector(point.crossVectors(up,direction), .9);
    body.rotation.y = Math.atan2(direction.x,direction.z);
  }
  function at(section) {
    mount(); body.visible = true; body.scale.setScalar(.78);
    parcel.visible = true; badge.hidden = false;
    tile = target = origin = section; place(tile);
  }
  function sync(state, id, snap = false) {
    const changed = matchId !== id || snap;
    if (changed) { hide(); matchId = id; serial = 0; event = null; }
    if (!state || state.status === 'absent') { hide(); return; }
    if (changed && (state.status === 'caught' || state.status === 'escaped')) {
      serial = state.eventSerial; return;
    }
    if (state.status === 'staged' || state.status === 'running') {
      if (phase === 'hidden') { at(state.position); phase = 'idle'; }
    }
    if (marker && (serial !== state.eventSerial || changed)) marker.track(state.position);
    if (state.eventSerial === serial) return;
    serial = state.eventSerial;
    event = state.events.at(-1);
    if (!event || !body) return;
    age = 0;
    if (changed && state.status==='running') return;
    if (event.kind === 'catch') {
      at(event.position); phase = 'approach';
    } else if (event.kind === 'run' || event.kind === 'escape') {
      origin = tile; target = event.to; phase = event.kind;
    } else if (event.kind === 'spawn' && !changed) { phase = 'spawn'; onCue('posty-start'); }
  }
  function update(dt) {
    if (phase === 'hidden') return;
    age += dt; time += dt;
    let label = '';
    let pose = 'Idle', anchor = body.position, height = 2.6;
    if (phase === 'spawn') {
      label = 'CATCH ME!'; pose = 'Run'; if (!reduced) place(age < .72 ? 1 + age*2 : tile); if (age >= 1.3) {place(tile);phase = 'idle';}
    } else if (phase === 'run' || phase === 'escape') {
      const duration = Math.max(.32, Math.abs(target-origin)*.2);
      const t = reduced ? 1 : Math.min(1,age/duration);
      tile = origin + (target-origin)*t*t*(3-2*t); place(tile); pose = 'Run';
      if (t === 1) { phase = phase === 'escape' ? 'bye' : 'emote'; if(phase==='bye')onCue('posty-bye');else label=event.emote||''; age = 0; }
    } else if (phase === 'emote') {
      label = event.emote || ''; if(age>=1.5)phase='idle';
    } else if (phase === 'bye') {
      label = 'BYE!'; pose = 'Run';
      if (!reduced) body.scale.setScalar(.78*Math.max(.02,1-age/.75));
      if (age >= .75) {hide();return;}
    } else if (phase === 'approach' || phase === 'delivery') {
      const pawn = getPawn(event.playerId);
      if (phase === 'approach' && (reduced || !pawn || pawn.pos >= event.position-.15 ||
          (!pawn.motion && Math.abs(pawn.pos-pawn.target)<.05) || age >= 8)) {
        phase = 'delivery'; age = 0; onCue('posty-gift');
      }
      if (phase === 'delivery') {
        pose = 'Delivery'; label = 'YOURS!';
        if (pawn) body.lookAt(pawn.body.position.x,body.position.y,pawn.body.position.z);
        if (age >= .48 || reduced) {
          anchor = pawn?.body.position ?? body.position;
          label = (event.coins ? '+'+event.coins+' Coins · ' : '')+'+1 Prank';
        }
        if (age >= 2.1) {hide();return;}
      }
    }
    rig.pose(pose,reduced?0:pose==='Delivery'?Math.min(age*2.2,1.55):time);
    if (phase==='emote' && !reduced) {
      const t=Math.min(1,age/1.25), beat=Math.sin(t*Math.PI);
      if(label==='BOING!'||label==='WHEE!')rig.model.position.y+=Math.abs(Math.sin(t*Math.PI*2))*beat*.5;
      else rig.model.rotation.z+=Math.sin(t*Math.PI*(label==='LOL!'?8:3))*beat*.14;
    }
    if (phase==='delivery' && age>=.48) {
      const pawn = getPawn(event.playerId);
      if (pawn && !reduced) {
        parcel.getWorldPosition(giftStart);
        const t=Math.min(1,(age-.48)/.48);
        point.copy(pawn.body.position);point.y+=1.25;
        giftStart.lerp(point,t);giftStart.y+=Math.sin(t*Math.PI)*.65;
        parcel.position.copy(rig.model.worldToLocal(giftStart));
      }
      parcel.visible=age<.96;
    }
    markerAnchor.copy(anchor);markerAnchor.y+=height;marker.say(label);
  }
  function projectMarker(){
    if(phase==='hidden')return;
    const pixel=screen(markerAnchor);marker.position(pixel.x,pixel.y);
  }
  function destroy(){marker?.destroy(); /* scene disposal owns the attached model */ }
  const occlusionAnchor=()=>body?.visible ? point.copy(body.position).addScaledVector(up,1.05) : null;
  const setOccluded=value=>{if(ghost)ghost.visible=value;};
  const debug=()=>({phase,tile,visible:!!body?.visible,label:badge?.hidden?null:(badge?.textContent||'POSTY')});
  return {sync,update,projectMarker,destroy,debug,occlusionAnchor,setOccluded};
}

