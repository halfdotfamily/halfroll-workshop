import {Critter} from '../assets/critters.js';

// Identity is cosmetic. Match rules and starting resources never read this data.
export const CHARACTERS = Object.freeze([
  {id:0, name:'Pebble', title:'The patient one', note:'Never seems to be in a hurry.', accent:'#a9d7be', motto:'One good move.'},
  {id:1, name:'Sprout', title:'The optimist', note:'Always takes a look around.', accent:'#d3e6c4', motto:'Take the scenic route.'},
  {id:2, name:'Zip', title:'The restless one', note:'Already thinking about the finish line.', accent:'#b9c6e6', motto:'See you at the finish.'},
  {id:3, name:'Moss', title:'The quiet rival', note:'Quiet until the last stretch.', accent:'#d6cdbb', motto:'Still in the race.'},
  {id:4, name:'Pip', title:'The wildcard', note:'Probably knows who moved your cards.', accent:'#d9eee2', motto:'Your move. My shortcut.'},
  {id:5, name:'Loop', title:'The rematch regular', note:'Already asking for a rematch.', accent:'#dfe5f3', motto:'Again? Again.'},
  {id:6, name:'Ralf', title:'The blue-hat original', note:'The familiar face at the dock.', accent:'#b9c6e6', motto:'Come on, everyone.', look:{body:'egg',color:'mint',eyes:'lids',mouth:'flat',head:'beanie',holding:'half coin',blush:false}},
  {id:7, name:'Sunny', title:'The late arrival', note:'Brought a party hat. Forgot the time.', accent:'#d3e6c4', motto:'Did I miss anything?', look:{body:'bean',color:'sand',eyes:'wide',mouth:'smirk',head:'party hat',holding:'flag',blush:true}},
  {id:8, name:'Fern', title:'The forest regular', note:'Knows which way the river runs.', accent:'#d9eee2', motto:'This way, I think.', look:{body:'capsule',color:'sage',eyes:'dots',mouth:'wavy',head:'sprout',holding:'eth',blush:false}},
  {id:9, name:'Echo', title:'The music lover', note:'Keeps a little rhythm while waiting.', accent:'#dfe5f3', motto:'One more track.', look:{body:'drop',color:'pale',eyes:'sleepy',mouth:'smirk',head:'headphones',holding:'none',blush:true}},
  {id:10, name:'Halo', title:'The innocent one', note:'Insists that shortcut was an accident.', accent:'#e6dfcf', motto:'Who, me?', look:{body:'capsule',color:'navy',eyes:'glasses',mouth:'smirk',head:'halo',holding:'token',blush:false}},
  {id:11, name:'Nori', title:'The small surprise', note:'Keeps a candle for the last stretch.', accent:'#d3e6c4', motto:'Not over yet.', look:{body:'box',color:'leaf',eyes:'side-eye',mouth:'tooth',head:'tuft',holding:'candle',blush:false}},
].map(character => Object.freeze({...character, key:`roll-race-player-${character.id}`, seed:`roll-race-player-${character.id}`})));

// Lead with Ralf and the familiar six; all twelve stable IDs remain selectable.
export const SELECTABLE_CHARACTERS=Object.freeze([...CHARACTERS.slice(6),...CHARACTERS.slice(0,6)]);

export function characterSvg(id) {
  const c=CHARACTERS[id]??CHARACTERS[0];return Critter.full(c.seed,c.look);
}

/** Cached renders of the actual island models; no extra live WebGL contexts. */
export function characterPortrait(id) {
 const c=CHARACTERS[Number(id)]??CHARACTERS[0],src=new URL(`../assets/critters-3d/critter-${c.id}.png?v=${c.id===9?'20261104-echo-fit-v1':'20261104-face-hands-v1'}`,import.meta.url).href;
 return `<img class="critter-portrait" data-critter-id="${c.id}" src="${src}" alt="${c.name}" width="512" height="512" draggable="false" decoding="async">`;
}

export function characterTraits(id){const c=CHARACTERS[id]??CHARACTERS[0];return Critter.describe(c.seed,c.look);}

export function mountCharacters(container, {onSelect = () => {}, selected = 6} = {}) {
  if (!container) throw new TypeError('A character selection container is required.');
  let current = CHARACTERS.some(c => c.id === selected) ? selected : 6;
  container.innerHTML = `<section class="character-select" aria-label="Choose your Critter">
    <div class="character-select__heading"><h2>Who's coming along?</h2><span class="ui-eyebrow">12 FACES · SAME CHANCES</span></div>
    <div class="character-select__grid" role="group" aria-label="Player character">
      ${SELECTABLE_CHARACTERS.map(c => `<button type="button" class="character-card" data-character="${c.id}" style="--character-accent:${c.accent}" aria-pressed="${c.id === current}" aria-label="Select ${c.name}"><span class="character-card__portrait" aria-hidden="true">${characterPortrait(c.id)}</span><span class="character-card__name">${c.name}</span><span class="character-card__picked" aria-hidden="true">✓</span></button>`).join('')}
    </div><p class="character-select__status" role="status" aria-live="polite"></p>
    <p class="ui-note">Same chances. Your own little character.</p>
  </section>`;
  const buttons = [...container.querySelectorAll('[data-character]')];
  const status = container.querySelector('.character-select__status');
  function setSelected(id, notify = true) {
    if (!CHARACTERS.some(c => c.id === id)) return;
    current = id;
    for (const button of buttons) button.setAttribute('aria-pressed', String(Number(button.dataset.character) === id));
    status.textContent = `${CHARACTERS[id].name} is your racer.`;
    if (notify) onSelect(id);
  }
  function click(event) {
    const button = event.target.closest('[data-character]');
    if (button && container.contains(button)) setSelected(Number(button.dataset.character));
  }
  function keydown(event) {
    const button = event.target.closest('[data-character]');
    if (!button || !container.contains(button)) return;
    let target = SELECTABLE_CHARACTERS.findIndex(c=>c.id===Number(button.dataset.character));
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (target + 1) % buttons.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (target + buttons.length - 1) % buttons.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[target].focus();
    setSelected(SELECTABLE_CHARACTERS[target].id);
  }
  container.addEventListener('click', click);
  container.addEventListener('keydown', keydown);
  setSelected(current, false);
  return {
    getSelected: () => current,
    setSelected,
    destroy() {
      container.removeEventListener('click', click);
      container.removeEventListener('keydown', keydown);
      container.replaceChildren();
    },
  };
}
