import { BOARD, CARDS } from './rules.js';

const startTiles = [26, 28, 30, 30, 32];
const pranks = CARDS.filter(card => card.type === 'prank').map(card => card.id);

// A permutation on uint32. Exact half of all possible seeds select a chase.
function mix(seed) {
  let x = Math.imul(seed ^ seed >>> 16, 0x21f0aaad);
  x = Math.imul(x ^ x >>> 15, 0x735a2d97);
  return (x ^ x >>> 15) >>> 0;
}

export function prepareCourier(match, seed) {
  if (mix(seed ^ 0x504f5354) >= 0x80000000) {
    match.courier = { schema: 1, status: 'absent' };
    return;
  }
  const startingTile = startTiles[match.count - 2];
  match.courier = {
    schema: 1, status: 'staged', initialPlayerCount: match.count, startingTile,
    position: startingTile, stepTiles: 6, escapeTile: 67, lastProcessedRound: 0,
    eventSerial: 0, caughtBy: null, rewardIssued: false, bonusCardsCreated: 0, events: []
  };
  match.courierRewardPrivate = { rngState: mix(seed ^ 0x5041434b), awardedCardId: null };
}

function record(courier, kind, data) {
  courier.events.push({ serial: ++courier.eventSerial, kind, ...data });
}

export function startCourier(match) {
  const courier = match.courier;
  if (courier.status !== 'staged') return;
  courier.status = 'running';
  record(courier, 'spawn', { to: courier.position });
}

export function advanceCourier(match) {
  const courier = match.courier;
  const rounds = Math.floor((match.turn - 1) / match.count);
  while (courier.status === 'running' && courier.lastProcessedRound < rounds) {
    const from = courier.position;
    courier.lastProcessedRound++;
    courier.position = Math.min(courier.escapeTile, from + courier.stepTiles);
    if (courier.position === courier.escapeTile) courier.status = 'escaped';
    if (courier.status === 'escaped') record(courier, 'escape', { from, to: courier.position });
    else {
      const previous = courier.events.at(-1)?.emote;
      const options = ['HEY!', 'BOING!', 'LOL!', 'WHEE!'].filter(word => word !== previous);
      const emote = options[mix(match.botPersonalitySeed ^ Math.imul(courier.lastProcessedRound, 0x9e3779b1)) % options.length];
      record(courier, 'run', { from, to: courier.position, emote });
    }
  }
}

function drawParcelCard(state) {
  const limit = 0x100000000 - (0x100000000 % pranks.length);
  do {
    state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  } while (state.rngState >= limit);
  return pranks[state.rngState % pranks.length];
}

export function checkCourierSegments(match, segments, cause) {
  const courier = match.courier;
  if (courier.status !== 'running') return;
  const candidates = segments.filter(({ playerId, from, to }) =>
    !match.players[playerId].finished && from < courier.position && to >= courier.position);
  if (!candidates.length) return;
  const order = id => id === match.activePlayer ? -1 : (id - match.startingPlayer + match.count) % match.count;
  candidates.sort((a, b) => order(a.playerId) - order(b.playerId));
  const segment = candidates[0];
  const player = match.players[segment.playerId];
  const coins = Math.min(5, BOARD.resources.cap - player.coins);
  const card = drawParcelCard(match.courierRewardPrivate);
  player.coins += coins;
  player.sparks = player.points = player.coins;
  player.hand.push(card);
  match.courierRewardPrivate.awardedCardId = card;
  courier.status = 'caught';
  courier.caughtBy = player.id;
  courier.rewardIssued = true;
  courier.bonusCardsCreated = 1;
  record(courier, 'catch', { ...segment, cause, position: courier.position, coins, cards: 1 });
}
