// Executable design study. This module does not replace adventure-engine.js.
// Transitions clone inputs; nextRandom intentionally advances its supplied seed.
// Board-only turns auto-pass after landing: no proactive or reaction hand cards.
// Wells select safe income; event discards select the last card in hand.
export function compileRules(board, cards = [], events = []) {
  const eventList = Array.isArray(events) ? events : (events.good || events.bad)
    ? ['good','bad'].flatMap(deck => (events[deck] ?? []).map(e => ({ ...e, deck })))
    : (events.cards ?? events.events ?? []);
  return { board, cards, events: eventList,
    tileByNumber: new Map(board.tiles.map(t => [t.number, t])),
    cardById: new Map(cards.map(c => [c.id, c])),
    eventById: new Map(eventList.map(e => [e.id, e])) };
}
export function nextRandom(state) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
function shuffle(list, state) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(state) * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
function copyState(state) {
  return { ...state, pendingTrial: state.pendingTrial ? { ...state.pendingTrial } : null,
    players: state.players.map(p => ({ ...p, hand: [...p.hand] })),
    decks: Object.fromEntries(Object.entries(state.decks).map(([k,v]) => [k,{ draw: [...v.draw], discard: [...v.discard] }])),
    log: [], stats: { ...state.stats } };
}
function take(state, name) {
  const pile = state.decks[name];
  if (!pile.draw.length && pile.discard.length) {
    pile.draw = shuffle(pile.discard, state); pile.discard = [];
  }
  return pile.draw.pop() ?? null;
}
function keepCard(state, rules, player, id, discardIndex) {
  if (id === null) return;
  player.hand.push(id);
  if (player.hand.length > rules.board.deck.handLimit) {
    const i = Number.isInteger(discardIndex) ? discardIndex : player.hand.length - 1;
    if (i < 0 || i >= player.hand.length) throw new RangeError('Invalid overflow choice');
    state.decks.hand.discard.push(...player.hand.splice(i, 1));
  }
}
function gain(player, rules, amount) {
  player.sparks = Math.max(rules.board.resources.minimum ?? 0,
    Math.min(rules.board.resources.cap, player.sparks + amount));
}
export function uniqueExtrema(players) {
  const positions = players.map(p => p.position), high = Math.max(...positions), low = Math.min(...positions);
  return { first: positions.filter(x => x === high).length === 1 ? positions.indexOf(high) : null,
    last: positions.filter(x => x === low).length === 1 ? positions.indexOf(low) : null };
}
export function createGame(rules, seats = 2, seed = 1) {
  if (!Number.isInteger(seats) || seats < 2 || seats > 6) throw new RangeError('Use 2–6 seats');
  const state = { seed: seed >>> 0, active: 0, winner: null, pendingTrial: null, turns: 0, log: [],
    stats: { overshoots: 0, hazards: 0, lateHazards: 0, portals: 0, events: 0, markets: 0,
      throneTrials: 0, throneFailures: 0, sealWins: 0, sealChoices: 0, riskChoices: 0, riskFailures: 0 },
    players: Array.from({ length: seats }, () => ({ position: rules.board.start, sparks: rules.board.resources.initial,
      hand: [], ownTurns: 0, shield: false, crownSeal: false, reactionUsed: false, proactiveUsed: false })),
    decks: { hand: { draw: rules.cards.flatMap(c => Array(c.copies ?? 1).fill(c.id)), discard: [] },
      good: { draw: rules.events.filter(e => (e.deck ?? e.type) === 'good').flatMap(e => Array(e.copies ?? 1).fill(e.id)), discard: [] },
      bad: { draw: rules.events.filter(e => (e.deck ?? e.type) === 'bad').flatMap(e => Array(e.copies ?? 1).fill(e.id)), discard: [] } } };
  for (const pile of Object.values(state.decks)) shuffle(pile.draw, state);
  for (let n = 0; n < rules.board.deck.initialHand; n++) for (const p of state.players) keepCard(state, rules, p, take(state, 'hand'));
  return state;
}
// Secondary motion never wins and never resolves a destination cell.
export function moveSecondary(state, rules, playerIndex, destination, { harmful = false } = {}) {
  if (state.winner !== null) throw new Error('Game already finished');
  if (state.pendingTrial) throw new Error('Resolve the Throne Trial before any other action');
  const next = copyState(state); secondary(next, rules, playerIndex, destination, harmful); return next;
}
function secondary(state, rules, index, destination, harmful = false) {
  const p = state.players[index];
  const target = Math.max(rules.board.start, Math.min(rules.board.finish - 1, destination));
  if (harmful && target !== p.position && p.shield) { p.shield = false; state.log.push({ action: 'shield-block', player: index }); return; }
  p.position = target;
  state.log.push({ action: 'secondary-move', player: index, position: p.position });
}
function market(state, rules, p, choice = 0, discardIndex) {
  // Both candidates are held out until the draw completes: an empty deck
  // cannot immediately redraw the rejected candidate from this same offer.
  const offer = [take(state, 'hand'), take(state, 'hand')].filter(x => x !== null);
  if (!offer.length) return;
  const selected = Math.min(Math.max(0, choice), offer.length - 1);
  keepCard(state, rules, p, offer[selected], discardIndex);
  state.decks.hand.discard.push(...offer.filter((_, i) => i !== selected));
  state.log.push({ action: 'market', offer, kept: offer[selected] });
}
function eventEffect(state, rules, index, effect) {
  const p = state.players[index], amount = effect.amount ?? 0;
  switch (effect.action ?? effect.kind ?? effect.type) {
    case 'gain-sparks': case 'sparks': gain(p, rules, amount); break;
    case 'lose-sparks': gain(p, rules, -amount); break;
    case 'move': secondary(state, rules, index, p.position + amount, amount < 0); break;
    case 'move-forward': secondary(state, rules, index, p.position + amount); break;
    case 'move-back': secondary(state, rules, index, p.position - amount, true); break;
    case 'draw': case 'draw-card': for (let n=0;n<(amount || 1);n++) keepCard(state,rules,p,take(state,'hand')); break;
    case 'discard': case 'discard-card': if (p.hand.length) state.decks.hand.discard.push(...p.hand.splice(p.hand.length - 1,1)); break;
    case 'shield': p.shield = true; break;
    case 'none': break;
    default: throw new Error(`Unsupported event effect: ${JSON.stringify(effect)}`);
  }
}
function eventCanHarm(player, rules, operation) {
  const kind = operation.kind ?? operation.action ?? operation.type, amount = operation.amount ?? 0;
  if (kind === 'move') return amount < 0 && player.position > rules.board.start;
  if (kind === 'move-back') return amount > 0 && player.position > rules.board.start;
  if (kind === 'sparks') return amount < 0 && player.sparks > (rules.board.resources.minimum ?? 0);
  if (kind === 'lose-sparks') return amount > 0 && player.sparks > (rules.board.resources.minimum ?? 0);
  if (kind === 'discard' || kind === 'discard-card') return player.hand.length > 0;
  return false;
}
function resolveLanding(state, rules, index, options) {
  const p = state.players[index], tile = rules.tileByNumber.get(p.position);
  if (!tile) return;
  const effect = { ...rules.board.effects[tile.type], ...tile };
  state.log.push({ action: 'landing', number: p.position, type: tile.type });
  const hazard = () => { state.stats.hazards++; if (p.position >= 97) state.stats.lateHazards++; };
  switch (tile.type) {
    case 'spark': gain(p, rules, effect.amount ?? 3); break;
    case 'draw': keepCard(state, rules, p, take(state, 'hand'), options.discardIndex); break;
    case 'market': state.stats.markets++; market(state, rules, p, options.marketChoice, options.discardIndex); break;
    case 'trap': hazard(); secondary(state, rules, index, p.position - (effect.amount ?? 3), true); break;
    case 'portal': case 'setback': {
      const link = rules.board.links.find(l => l.from === p.position);
      if (!link) throw new Error(`Missing link at ${p.position}`);
      if (tile.type === 'setback') hazard(); else state.stats.portals++;
      secondary(state, rules, index, link.to, tile.type === 'setback'); break;
    }
    case 'well': gain(p, rules, effect.safeGain ?? 1); break;
    case 'good': case 'bad': {
      if (tile.type === 'bad') hazard();
      const id = take(state, tile.type); if (id === null) break;
      const event = rules.eventById.get(id); state.stats.events++;
      const operations = event.effects ?? [event.effect];
      if (tile.type === 'bad' && p.shield && operations.some(op => eventCanHarm(p,rules,op))) { p.shield = false; state.log.push({ action: 'shield-block', player: index }); }
      else for (const operation of operations) eventEffect(state, rules, index, operation);
      state.decks[tile.type].discard.push(id); state.log.push({ action: 'event', id }); break;
    }
    case 'trail': case 'finish': break;
    default: throw new Error(`Unsupported tile: ${tile.type}`);
  }
}
export function movementMode(position) {
  if (!Number.isInteger(position) || position < 0 || position > 144) throw new RangeError('Invalid section');
  return position <= 48 ? 'single' : position <= 96 ? 'choose' : 'sum';
}
const isDie = die => Number.isInteger(die) && die >= 1 && die <= 6;
export function resolveRoll(state, rules, dice, options = {}) {
  if (state.winner !== null) throw new Error('Game already finished');
  if (state.pendingTrial) throw new Error('Resolve the Throne Trial before another normal roll');
  const mode = movementMode(state.players[state.active].position);
  let distance;
  if (mode === 'single') {
    if (!isDie(dice)) throw new RangeError('Expected one D6 result');
    distance = dice;
  } else {
    if (!Array.isArray(dice) || dice.length !== 2 || !dice.every(isDie)) throw new RangeError('Expected two D6 results');
    if (mode === 'choose' && options.dieIndex !== 0 && options.dieIndex !== 1) throw new RangeError('Choose dieIndex 0 or 1');
    distance = mode === 'choose' ? dice[options.dieIndex] : dice[0] + dice[1];
  }
  const next = copyState(state), index = next.active, p = next.players[index];
  p.ownTurns++; p.reactionUsed = false; p.proactiveUsed = false;
  gain(p, rules, rules.board.resources.turnIncome);
  if (p.ownTurns % rules.board.deck.refreshEveryOwnTurns === 0) keepCard(next, rules, p, take(next, 'hand'), options.discardIndex);
  next.turns++;
  next.log.push({ action: 'normal-roll', player: index, mode, dice: Array.isArray(dice) ? [...dice] : [dice], distance });
  const destination = p.position + distance;
  if (destination >= rules.board.finish) {
    p.position = rules.board.finish;
    if (p.crownSeal) {
      next.winner = index; next.stats.sealWins++;
      next.log.push({ action: 'win', player: index, reason: 'crown-seal' });
    } else {
      next.pendingTrial = { player: index, stage: 'roll' };
      next.log.push({ action: 'throne-trial-pending', player: index });
    }
  } else { p.position = destination; resolveLanding(next, rules, index, options); }
  if (next.winner === null && !next.pendingTrial) next.active = (index + 1) % next.players.length;
  return next;
}
// A distinct, unmodified D6 within the same turn. No card/defense window,
// income, refresh, secondary-arrival effect or extra normal turn is created.
export function resolveThroneTrial(state, rules, die) {
  if (state.winner !== null) throw new Error('Game already finished');
  if (!state.pendingTrial) throw new Error('No Throne Trial is pending');
  if (!['roll', 'reroll'].includes(state.pendingTrial.stage)) throw new Error('Choose seal or risk before rolling again');
  if (!Number.isInteger(die) || die < 1 || die > 6) throw new RangeError('Expected one D6 result');
  const index = state.pendingTrial.player;
  if (index !== state.active || state.players[index]?.position !== rules.board.finish)
    throw new Error('Invalid Throne Trial owner or position');
  const next = copyState(state), p = next.players[index];
  const trial = rules.board.throneTrial;
  const isReroll = state.pendingTrial.stage === 'reroll';
  next.pendingTrial = null; next.stats.throneTrials++;
  next.log.push({ action: 'throne-trial-roll', player: index, die, reroll: isReroll });
  if (die >= trial.successMin) {
    next.winner = index;
    next.log.push({ action: 'win', player: index, reason: 'throne-trial' });
  } else {
    next.stats.throneFailures++;
    if (isReroll) {
      p.position = trial.riskFailurePosition; p.crownSeal = false;
      next.stats.riskFailures++;
      next.log.push({ action: 'throne-risk-failed', player: index, position: p.position, crownSeal: false });
      next.active = (index + 1) % next.players.length;
    } else {
      next.pendingTrial = { player: index, stage: 'choice' };
      next.log.push({ action: 'throne-choice-pending', player: index });
    }
  }
  return next;
}
export function chooseThroneOutcome(state, rules, choice) {
  if (state.winner !== null) throw new Error('Game already finished');
  if (state.pendingTrial?.stage !== 'choice') throw new Error('No Throne Trial choice is pending');
  if (!['seal','risk'].includes(choice)) throw new RangeError('Choose seal or risk');
  const index = state.pendingTrial.player;
  if (index !== state.active || state.players[index]?.position !== rules.board.finish)
    throw new Error('Invalid Throne Trial owner or position');
  const next = copyState(state), p = next.players[index];
  if (choice === 'seal') {
    p.position = rules.board.throneTrial.failurePosition; p.crownSeal = true;
    next.stats.sealChoices++; next.pendingTrial = null;
    next.active = (index + 1) % next.players.length;
    next.log.push({ action: 'throne-seal-taken', player: index, position: p.position, crownSeal: true });
  } else {
    next.stats.riskChoices++; next.pendingTrial.stage = 'reroll';
    next.log.push({ action: 'throne-risk-chosen', player: index });
  }
  return next;
}
export function deckCounts(state) {
  return { hand: state.decks.hand.draw.length + state.decks.hand.discard.length + state.players.reduce((n,p)=>n+p.hand.length,0),
    good: state.decks.good.draw.length + state.decks.good.discard.length,
    bad: state.decks.bad.draw.length + state.decks.bad.discard.length };
}
