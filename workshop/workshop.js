import * as game from '../game/race-rules/engine.js';
import {LATE_EVENTS, LATE_PANDORA_START, pandoraEventAt} from '../game/race-rules/rules.js';
import {prepareParallel, starterOfferFor, chooseParallelStarter, chooseParallelDefault, setParallelReady} from '../game/parallel-preparation.js';
import {SELECTABLE_CHARACTERS, characterPortrait} from '../game/characters.js';
import {renderCardArt} from '../game/card-presentation.js';
import {mountMainWorld} from '../world/main-world.js';
import {tileKey, tileKeySvg} from '../world/tile-key.js';

const $=selector=>document.querySelector(selector);
const content=$('#panel');
const scene=$('#scene'),marker=$('#tile-marker'),sourceDialog=$('#source-dialog');
const headings={island:'Island',tiles:'Tiles',dice:'Dice',cards:'Cards',pandora:'Pandora',rules:'Rules',race:'Practice'};
const scenePanels=new Set(['island','tiles','dice','race']);
const board=game.boardForProfile('dense');
const tiles=new Map(board.tiles.map(tile=>[tile.number,tile]));
const cards=new Map(game.CARDS.map(card=>[card.id,card]));
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const label=text=>String(text??'').replaceAll('-',' ');
const action=(kind,title,value='')=>`<button type="button" data-action="${kind}" data-value="${value}">${esc(title)}</button>`;
const cardFace=card=>`${renderCardArt(card)??''}<h3>${esc(card.name)}</h3><p>${esc(card.text)}</p>`;
const heading=(title,body)=>`<h2>${esc(title)}</h2><p class="panel-description">${esc(body)}</p>`;
let section='island', match=null, gameNumber=0, world=null, botTimer, selectedTile=10, late=false, event=null, pendingCard=null;
let diceValues=[3,5],demoStage=null,practiceRoll=null,rollTicket=0,markerFrame=0,sourceAreas=[],landmark=null;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let settings={count:4,character:SELECTABLE_CHARACTERS[0].id,seed:''};

function saveSettings(){
  if(!$('#race-players'))return;
  settings={count:Number($('#race-players').value),character:Number($('#race-character').value),seed:$('#race-seed').value};
}
function createRace(automatic=false){
  saveSettings();
  const seed=settings.seed===''?crypto.getRandomValues(new Uint32Array(1))[0]:Number(settings.seed);
  if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw RangeError('Choose a seed from 0 to 4294967295.');
  clearTimeout(botTimer);pendingCard=null;
  match=prepareParallel(game.createAdventure({count:settings.count,seed,boardProfile:'dense'}),game.STARTER_ITEMS);
  match.players[0].characterId=settings.character;
  if(!automatic){
    const taken=new Set([settings.character]);
    for(const player of match.players.slice(1)){
      const critter=SELECTABLE_CHARACTERS.find(c=>c.id===player.characterId&&!taken.has(c.id))??SELECTABLE_CHARACTERS.find(c=>!taken.has(c.id));
      Object.assign(player,{characterId:critter.id,name:critter.name});taken.add(critter.id);
      chooseParallelDefault(match,player.id);setParallelReady(match,player.id);
    }
  }else{
    for(const player of match.players){chooseParallelDefault(match,player.id);setParallelReady(match,player.id);}
    game.startAdventure(match);
    for(let i=0;i<5000&&match.mode==='playing';i++)game.advanceBot(match);
    if(match.mode!=='finished')throw Error('The race did not finish within the simulation limit.');
  }
  gameNumber++;
}

function playerInControl(){
  const id=match?.phase==='reaction'?match.pendingEffect?.playerId:match?.phase==='discard'?match.pendingDiscard?.playerId:match?.activePlayer;
  return match?.players[id];
}
function syncMap(){
  const race=section==='race'?match:null;
  world?.setState({matchId:section==='race'?gameNumber:'workshop',rulesVersion:game.RULES_VERSION,boardProfile:'dense',layout:'play',phase:race?.phase??'waiting',
    players:race?.players??[],activePlayer:race?.activePlayer??0,localPlayerId:race?0:null,winnerId:race?.winnerId??null,
    motion:race?.presentationMotion,cue:race?.presentationCue,trial:race?.players[race.activePlayer]?.pos===game.FINISH,canRoll:false});
}
function renderRace(){
  if(!match){
    return heading('A race on the island','Choose a starter, play against bots and see how a rules change affects the race.')+
      `<div class="setup"><label>Racers<select id="race-players">${[2,3,4,5,6].map(n=>`<option value="${n}" ${n===settings.count?'selected':''}>${n}</option>`).join('')}</select></label>
      <label>Critter<select id="race-character">${SELECTABLE_CHARACTERS.map(c=>`<option value="${c.id}" ${c.id===settings.character?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label>Seed (optional)<input id="race-seed" type="number" min="0" max="4294967295" value="${esc(settings.seed)}" placeholder="Random"></label></div>
      <div class="actions"><button class="primary" data-action="create">Choose a starter</button>${action('simulate','Simulate full race')}</div>`;
  }
  const actor=playerInControl();
  const racers=`<div class="racers">${match.players.map(p=>`<div class="racer ${actor?.id===p.id&&match.mode==='playing'?'active':''}">${characterPortrait(p.characterId)}<strong>${esc(p.name)}</strong><span>${p.finishPlace?'#'+p.finishPlace:'Tile '+p.pos}</span></div>`).join('')}</div>`;
  let title='',controls='';
  const hand=ids=>ids.map((id,index)=>`<button type="button" class="game-card" data-action="starter" data-value="${index}">${cardFace(cards.get(id))}</button>`).join('');
  if(match.mode==='waiting'){
    const offer=starterOfferFor(match,0);
    title=offer.length?'Pick your starter':'Your pocket is ready';
    controls=offer.length?`<div class="cards">${hand(offer)}</div>`:`${esc(cards.get(match.players[0].hand[0]).name)}<div class="actions"><button class="primary" data-action="ready">Ready</button></div>`;
  }else if(match.mode==='finished'){
    title='Finish order';
    controls=`<ol>${[...match.players].sort((a,b)=>a.finishPlace-b.finishPlace).map(p=>`<li>${esc(p.name)}</li>`).join('')}</ol>`;
  }else if(practiceRoll){
    title=practiceRoll==='prepare'?'Preparing dice…':'Rolling…';
  }else if(actor?.bot){
    title=`${actor.name} is playing`;
  }else{
    title=`Your turn · ${match.players[0].coins} Coins`;
    const p=match.players[0],phase=match.phase;
    if(phase==='roll'||phase==='trial-roll')controls=action('roll',phase==='roll'?'Roll dice':'Roll at the throne');
    if(phase==='choose'){
      const values=match.dice;
      controls=match.movementMode==='choose'?values.map((die,index)=>action('move','Move '+die,index)).join(' '):action('move','Move '+values.reduce((sum,n)=>sum+n,0),0);
    }
    if(phase==='cards')controls=action('end','End turn')+(game.canForage(match)?' '+action('collect','Collect 2 Coins'):'');
    if(phase==='trial-result')controls=action('trial-result','Resolve '+match.dice[0]);
    if(phase==='trial-choice')controls=action('trial-choice','Take the seal','seal')+' '+action('trial-choice','Risk another roll','risk');
    if(phase==='well')controls=action('well','Take Coins','safe')+' '+action('well','Roll at the well','roll');
    if(phase==='shop')controls=match.pendingShop.offer.map((id,index)=>{const card=cards.get(id);return `<button data-action="shop" data-value="${index}" ${p.coins<card.purchaseCost?'disabled':''}>${esc(card.name)} · ${card.purchaseCost} Coins</button>`;}).join(' ')+ ' '+action('shop','Pass shop','pass');
    if(phase==='discard')controls=p.hand.map((id,index)=>action('discard','Discard '+cards.get(id).name,index)).join(' ');
    if(phase==='reaction')controls=p.hand.flatMap((id,index)=>game.reactionCards(match).includes(id)?[action('reaction','Play '+cards.get(id).name,index)]:[]).join(' ')+' '+action('reaction','Skip reaction','pass');
    if(['roll','cards'].includes(phase)){
      const available=game.cardAvailability(match,0);
      if(available.length)controls+=`<div class="actions">${available.map(({card,index,reason})=>`<button data-action="card" data-value="${index}" ${reason?'disabled':''} title="${esc(reason??card.text)}">${esc(card.name)}</button>`).join('')}</div>`;
      if(pendingCard!==null){
        const id=p.hand[pendingCard];
        controls+=`<div class="actions">${game.cardTargets(match,0,id).map(target=>action('target',match.players[target].name,target)).join(' ')}</div>`;
      }
    }
  }
  const log=`<div class="log"><strong>Race log</strong><ol>${match.log.slice(-5).reverse().map(line=>`<li>${esc(line)}</li>`).join('')}</ol></div>`;
  return `${racers}<div class="turn-actions"><h2>${esc(title)}</h2>${controls}</div>${log}<div class="actions">${action('reset','New race')}</div>`;
}

function renderIsland(){
  const entries=[
    {key:'0',title:'Starting dock',detail:'Tile 0',art:'<img src="./assets/illustrations/flag.svg" alt="">'},
    {key:'dice',title:'Dice arena',detail:'Center of the island',art:'<img src="./assets/halfroll-dice-v1.svg" alt="">'},
    {key:String(game.FINISH),title:'Throne',detail:`Tile ${game.FINISH}`,art:tileKeySvg('finish')},
  ];
  return `<div class="landmarks" aria-label="Island landmarks">${entries.map(({key,title,detail,art})=>
    `<button data-action="landmark" data-value="${key}" aria-pressed="${landmark===key}" class="landmark"><span class="landmark-art">${art}</span><span><strong>${title}</strong><small>${detail}</small></span></button>`).join('')}</div>
    <button class="primary explore-tiles" data-action="open-tiles">Explore tiles</button>`;
}
function renderTiles(){
  const tile=tiles.get(selectedTile),type=selectedTile===0?'start':selectedTile===game.FINISH?'finish':tile?.type??'trail';
  const key=tileKey(type),base=key?.color??'#eee3c8';
  const description=type==='start'?'Every racer starts here.':type==='trail'?'A plain stretch of the trail.':
    type==='airdrop'&&tile?.amount?`Collect ${tile.amount} Coins.`:tile?.text??tile?.description??key?.detail??label(type);
  return `<div class="tile-detail"><div class="tile-face" style="--tile:${esc(base)}" aria-hidden="true">${tileKeySvg(type)}<strong>${selectedTile}</strong></div>
    <div><small>Tile ${selectedTile}</small><h2>${esc(tile?.name??key?.label??(type==='start'?'Start':'Trail'))}</h2><p>${esc(description)}</p></div></div>
    <div class="route" role="group" aria-label="Route tiles">${Array.from({length:game.FINISH+1},(_,n)=>{
      const tileType=n===game.FINISH?'finish':tiles.get(n)?.type??'trail',color=tileKey(tileType)?.color??'var(--sand)';
      return `<button data-action="tile" data-value="${n}" style="--tile:${esc(color)}" aria-pressed="${n===selectedTile}" aria-label="Tile ${n}">${n}</button>`;
    }).join('')}</div>`;
}
function renderDice(){
  const disabled=demoStage?'disabled':'';
  return `<div class="dice-choice" role="group" aria-label="Number of dice">
    <button data-action="dice-count" data-value="1" aria-pressed="${diceValues.length===1}" ${disabled}>One die</button>
    <button data-action="dice-count" data-value="2" aria-pressed="${diceValues.length===2}" ${disabled}>Two dice</button>
    </div><div class="dice-result" role="status" aria-label="Dice result">${demoStage?`<strong>${demoStage==='prepare'?'Preparing dice…':'Rolling…'}</strong>`:diceValues.map(value=>`<span>${value}</span>`).join('')}</div>
    <div class="actions"><button class="primary" data-action="demo-roll" ${disabled}>Roll dice</button></div>`;
}
function renderCards(){return `<div class="cards">${game.CARDS.map(card=>`<article class="game-card">${cardFace(card)}<p>${esc(card.type??card.timing)} · ${card.copies} ${card.copies===1?'copy':'copies'}</p></article>`).join('')}</div>`;}
function renderPandora(){
  const outcomes=(late?LATE_EVENTS:game.EVENTS).pandora;
  return `${heading('Open the box','Preview the outcomes a racer can draw from a Pandora tile.')}
    <div class="actions"><button data-action="pool" data-value="early" aria-pressed="${!late}">Early game</button><button data-action="pool" data-value="late" aria-pressed="${late}">Late game</button><button class="primary" data-action="pandora">Draw an event</button></div>
    ${event?`<div class="event" data-pandora-result><h2>${esc(event.name)}</h2><p>${esc(event.text)}</p></div>`:''}
    <ul class="event-list">${outcomes.map(item=>`<li><strong>${esc(item.name)}</strong> · ${item.weight}%<br>${esc(item.text)}</li>`).join('')}</ul>`;
}
function renderRules(){return `${heading('From the start to the throne','Roll, use cards and race to finish. The order at the throne sets the places.')}
  <ol class="rule-list"><li>Choose a free starter card and ready up. Each racer begins with 5 Coins.</li>
  <li>From tiles 0–67, add both dice. From 68–107, choose one of two. From 108, roll one die.</li>
  <li>The tile you land on applies its effect. Use one proactive card before your roll or after landing. REVERSE is a separate reaction.</li>
  <li>Shop cards cost Coins. A free find goes to your pocket. If you have four cards, discard one.</li>
  <li>Reach the throne to take the final trial. Your place locks when you finish. The last remaining racer takes the final place.</li></ol>`;}
const renderers={island:renderIsland,tiles:renderTiles,dice:renderDice,cards:renderCards,pandora:renderPandora,rules:renderRules,race:renderRace};

function render(){
  $('#panel-title').textContent=headings[section];
  content.innerHTML=renderers[section]();
}
function presentScene({showDice=false}={}){
  if(!world||scene.hidden)return;
  world.refreshViewport();world.inspectSection(section==='tiles'?selectedTile:null);
  if(section==='tiles')world.focusSection(selectedTile);
  else if(section==='dice'){world.focusArena();if(showDice&&!demoStage)world.showDiceResult(diceValues);}
  else world.resetCamera();
}
function trackTile(){
  if(section!=='tiles'||!world){marker.hidden=true;markerFrame=0;return;}
  const point=world.projectSection(selectedTile),bounds=scene.getBoundingClientRect();
  const x=point.x-bounds.left,y=point.y-bounds.top;
  marker.hidden=x<12||y<32||x>bounds.width-12||y>bounds.height-8;
  marker.style.left=`${x}px`;marker.style.top=`${y}px`;
  markerFrame=requestAnimationFrame(trackTile);
}
function revealSelectedTile(){
  const route=$('.route'),selected=route.querySelector('[aria-pressed=true]');
  const y=selected.offsetTop;
  if(y<route.scrollTop||y+selected.offsetHeight>route.scrollTop+route.clientHeight)route.scrollTop=y;
}
function show(next){
  if(next===section)return;
  saveSettings();rollTicket++;if(demoStage||practiceRoll)world?.cancelRollPreparation();
  demoStage=null;practiceRoll=null;landmark=null;section=next;
  cancelAnimationFrame(markerFrame);markerFrame=0;marker.hidden=true;
  scene.hidden=!scenePanels.has(section);scene.setAttribute('aria-label',section==='dice'?'3D dice preview':'Interactive Halfroll island');
  document.querySelector('.workspace').dataset.view=section;
  document.querySelectorAll('[data-panel]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.panel===section)));
  $('#map-reset').textContent=section==='tiles'?'Center tile':section==='dice'?'Center dice':'Fit island';
  syncMap();renderSources();
  render();content.scrollTop=0;$('#feedback').textContent='';
  if(section==='tiles')revealSelectedTile();
  presentScene({showDice:true});if(!markerFrame)trackTile();
}
function changed(){
  if(section==='race'){syncMap();render();}clearTimeout(botTimer);
  if(match?.mode==='playing'&&playerInControl()?.bot){
    botTimer=setTimeout(()=>attempt(()=>{game.advanceBot(match);changed();}),250);
  }
}
function attempt(fn){try{fn();$('#feedback').textContent='';}catch(error){$('#feedback').textContent=error.message;}}
function selectTile(number,fromButton=false){
  if(!Number.isInteger(number)||number<0||number>game.FINISH)return;
  selectedTile=number;marker.textContent=String(number);
  if(section!=='tiles'){show('tiles');return;}
  const position=$('.route').scrollTop;render();$('.route').scrollTop=position;
  const selected=$('.route [aria-pressed=true]');
  if(fromButton)selected?.focus({preventScroll:true});
  else revealSelectedTile();
  presentScene();
}
async function playPracticeToss(values,isCurrent,onStart){
  if(!world){onStart();return;}
  const prepared=await world.prepareRoll(values,.35);
  if(!isCurrent())return;
  const {plan}=world.playPreparedRoll(prepared);
  onStart(plan.duration);
  if(!reduceMotion.matches)await new Promise(resolve=>setTimeout(resolve,plan.duration*1000+100));
  if(isCurrent())world.finishDice();
}
async function rollPreview(){
  if(demoStage)return;
  const ticket=++rollTicket,isCurrent=()=>section==='dice'&&ticket===rollTicket;
  const values=diceValues.map(()=>1+Math.floor(Math.random()*6));
  demoStage='prepare';render();
  try{
    await playPracticeToss(values,isCurrent,()=>{diceValues=values;demoStage='rolling';render();});
  }catch{if(isCurrent())$('#feedback').textContent='The dice could not launch. Try again.';}
  finally{if(isCurrent()){demoStage=null;render();content.querySelector('[data-action=demo-roll]').focus({preventScroll:true});}}
}
async function rollPractice(){
  if(practiceRoll)return;
  const ticket=++rollTicket,isCurrent=()=>section==='race'&&ticket===rollTicket;
  practiceRoll='prepare';render();
  try{
    const next=structuredClone(match),values=game.rollDice(next,0);
    await playPracticeToss(values,isCurrent,()=>{match=next;practiceRoll='rolling';render();});
  }catch{if(isCurrent())$('#feedback').textContent='The dice could not launch. Try again.';}
  finally{if(isCurrent()){practiceRoll=null;changed();}}
}
function command(type,value){
  const index=Number(value);
  if(type==='tile')return selectTile(index,true);
  if(type==='open-tiles')return show('tiles');
  if(type==='landmark'){
    landmark=value;
    content.querySelectorAll('[data-action=landmark]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===value)));
    return value==='dice'?world?.focusArena():world?.focusSection(index);
  }
  if(type==='dice-count'){
    if(demoStage)return;
    diceValues=index===1?[diceValues[0]]:[diceValues[0],diceValues[1]??5];
    world?.showDiceResult(diceValues);render();content.querySelector('[data-action=dice-count][aria-pressed=true]').focus({preventScroll:true});return;
  }
  if(type==='demo-roll')return rollPreview();
  if(type==='roll')return rollPractice();
  if(type==='pool'){late=value==='late';event=null;return render();}
  if(type==='pandora'){event=pandoraEventAt(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296,late?LATE_PANDORA_START:0);return render();}
  if(type==='create')createRace();
  else if(type==='simulate')createRace(true);
  else if(type==='reset'){rollTicket++;if(practiceRoll)world?.cancelRollPreparation();practiceRoll=null;match=null;pendingCard=null;gameNumber++;}
  else{
    const args={playerId:0};
    if(type==='starter')chooseParallelStarter(match,{...args,choice:index});
    if(type==='ready'){setParallelReady(match,0);game.startAdventure(match);}
    if(type==='move')game.resolveTurn(match,{...args,dieIndex:index});
    if(type==='end')game.endTurn(match,0);
    if(type==='collect')game.forage(match,0);
    if(type==='trial-choice')game.chooseTrialOutcome(match,{...args,choice:value});
    if(type==='trial-result')game.resolveTrial(match,args);
    if(type==='well')game.chooseWell(match,{...args,choice:value});
    if(type==='shop')game.chooseShop(match,{...args,choice:value==='pass'?null:index});
    if(type==='discard')game.discardCard(match,{...args,cardIndex:index});
    if(type==='reaction')game.useReaction(match,{...args,cardIndex:value==='pass'?null:index});
    if(type==='card'){
      const targets=game.cardTargets(match,0,match.players[0].hand[index]);
      if(targets.length>1){pendingCard=index;return render();}
      game.playCard(match,{...args,cardIndex:index,targetId:targets[0]});
    }
    if(type==='target')game.playCard(match,{...args,cardIndex:pendingCard,targetId:index});
    pendingCard=null;
  }
  changed();
}

document.querySelector('nav').addEventListener('click',event=>{const panel=event.target.closest('[data-panel]')?.dataset.panel;if(panel)show(panel);});
content.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button)attempt(()=>command(button.dataset.action,button.dataset.value));});
$('#map-reset').onclick=()=>{
  if(section==='island'&&landmark!==null){landmark=null;render();}
  presentScene();
};
$('#map-rotate').onclick=event=>{const on=event.currentTarget.getAttribute('aria-pressed')!=='true';world?.setTouchMode(on?'rotate':'pan');event.currentTarget.setAttribute('aria-pressed',String(on));};
window.advanceTime=ms=>{if(!scene.hidden)world?.advanceTime(ms);};
window.render_game_to_text=()=>JSON.stringify({panel:section,rendererReady:!!world,selection:selectedTile,landmark,dice:section==='dice'?diceValues:null,
  diceStage:demoStage??practiceRoll,diceMotion:(section==='dice'||section==='race'&&practiceRoll)&&world?world.getDebugState().dice:null,
  source:sourceDialog.open?$('#source-path').textContent:null,race:match?{mode:match.mode,phase:match.phase,players:match.players.map(p=>({name:p.name,pos:p.pos,place:p.finishPlace,hand:p.hand}))}:null});
marker.textContent=String(selectedTile);
render();

mountMainWorld($('#island-view'),{onCell:number=>{if(section!=='dice')selectTile(number);},initialBoard:board,persistAtmosphere:false}).then(renderer=>{
  world=renderer;syncMap();presentScene({showDice:true});if(!markerFrame)trackTile();
  $('#map-status').textContent='';$('#map-reset').disabled=false;$('#map-rotate').disabled=false;
}).catch(()=>{$('#island-view').replaceChildren();$('#map-status').textContent='3D preview unavailable. The route and race are still playable.';});

function renderSources(){
  $('#sources').replaceChildren(...sourceAreas.filter(area=>area.panels.includes(section)).map(area=>{
    const button=document.createElement('button'),label=document.createElement('strong'),file=document.createElement('code');
    button.type='button';label.textContent=area.label;file.textContent=area.path;
    button.append(label,file);button.addEventListener('click',()=>openSource(area));return button;
  }));
}
async function openSource({label,path}){
  const code=$('#source-code');
  $('#source-title').textContent=label;$('#source-path').textContent=path;
  code.textContent='Loading…';sourceDialog.showModal();sourceDialog.querySelector('pre').scrollTo(0,0);
  try{
    const response=await fetch('./'+path);
    if(!response.ok)throw Error('Source file could not be loaded.');
    const text=await response.text();
    if(sourceDialog.open&&$('#source-path').textContent===path)code.textContent=text;
  }catch{if(sourceDialog.open&&$('#source-path').textContent===path)code.textContent='Source file could not be loaded.';}
}
fetch('./workshop/source-index.json').then(response=>response.json()).then(({areas})=>{
  sourceAreas=areas;renderSources();
}).catch(()=>{$('#sources').textContent='See README.md for the source layout.';});
