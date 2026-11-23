import * as game from '../game/race-rules/engine.js';
import {LATE_EVENTS, LATE_PANDORA_START, SHOP_MILESTONES} from '../game/race-rules/rules.js';
import {SELECTABLE_CHARACTERS} from '../game/characters.js';

const boardProfile='dense',board=game.boardForProfile(boardProfile);

function createScene(positions){
  const scene=game.createAdventure({count:positions.length,mode:'hotseat',boardProfile});
  Object.assign(scene,{mode:'playing',phase:'roll',turnRolled:false});
  positions.forEach((pos,index)=>{
    const player=scene.players[index],critter=SELECTABLE_CHARACTERS[index];
    Object.assign(player,{pos,name:critter.name,characterId:critter.id,hand:['pump'],shopMilestones:[...SHOP_MILESTONES]});
  });
  return scene;
}

function outcome(scene,before){
  return {before,players:scene.players,motion:scene.presentationMotion,cue:scene.presentationCue};
}

export function previewCard(card){
  const scene=createScene([10,14]),[actor,rival]=scene.players;
  actor.hand=[card.id];
  const before=structuredClone(scene.players);
  if(card.timing==='Reaction'){
    scene.activePlayer=scene.activeId=rival.id;
    rival.hand=['bonk'];
    game.playCard(scene,{playerId:rival.id,cardIndex:0,targetId:actor.id});
    game.useReaction(scene,{playerId:actor.id,cardIndex:0});
  }else{
    const [targetId]=game.cardTargets(scene,actor.id,card.id);
    game.playCard(scene,{playerId:actor.id,cardIndex:0,targetId});
  }
  return outcome(scene,before);
}

export function previewPandora(event,late){
  const pool=(late?LATE_EVENTS:game.EVENTS).pandora;
  const index=pool.findIndex(item=>item.id===event.id);
  const tile=board.tiles.find(tile=>tile.type==='pandora'&&(tile.number>=LATE_PANDORA_START)===late);
  const scene=createScene([tile.number-1,tile.number+3,tile.number-4]);
  // Sample the chosen outcome at the middle of its real probability interval.
  const weightBefore=pool.slice(0,index).reduce((sum,item)=>sum+item.weight,0);
  const first=(weightBefore+event.weight/2)/100;
  let firstDraw=true;
  Object.defineProperty(scene,'randomSource',{value:()=>{
    if(firstDraw){firstDraw=false;return first;}
    return .5;
  }});
  Object.assign(scene,{phase:'choose',dice:[1],turnRolled:true});
  const before=structuredClone(scene.players);
  game.resolveTurn(scene,{playerId:0});
  return outcome(scene,before);
}
