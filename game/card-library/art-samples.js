// Complete local illustrated set. Card frames and typography stay native UI.
const root=new URL('../../assets/card-art/',import.meta.url);
export const ART_SAMPLES=Object.freeze({
 'network-down':Object.freeze({name:'NETWORK DOWN!',src:new URL('../../assets/illustrations/network-down-card-v2-1200.webp',import.meta.url).href,alt:'A mint Critter zaps a startled Pebble with a small blue toy taser; Pebble’s bucket hat jumps above a crackling electric arc.',width:1200,height:800}),
 'nuke-it':Object.freeze({name:'NUKE IT!',src:new URL('nuke-it-v2.png',root).href,alt:'An unmanned rocket flies directly at a frightened Pebble on the island path.'}),
 gamba:Object.freeze({name:'GAMBA!',src:new URL('gamba-v1.png',root).href,alt:'Ralf pulls the lever of a cream-and-cobalt slot machine on the island.'}),
 'bonk':Object.freeze({name:"BONK!",src:new URL('bonk-v2.png',root).href,alt:"Half bonks Pebble backward with a soft coral mallet."}),
 'swap':Object.freeze({name:"SWAP!",src:new URL('swap-v3.png',root).href,alt:"A smug Half swaps places with a startled Pebble through linked portals."}),
 'pump':Object.freeze({name:"PUMP!",src:new URL('pump-v2.png',root).href,alt:"A spring launches Half forward along the island path."}),
 'to-the-moon':Object.freeze({name:"TO THE MOON!",src:new URL('to-the-moon-v2.png',root).href,alt:"Half rides a cobalt toy rocket above the island."}),
 'gigachad':Object.freeze({name:"PEEK SHIELD",src:new URL('peek-shield-v1.png',root).href,alt:"Half peeks around an emerald scanner shield as a projectile bounces off it."}),
 'rug-pull':Object.freeze({name:"RUG PULL!",src:new URL('rug-pull-v2.png',root).href,alt:"Half pulls a rug and takes two Coins from Pebble."}),
 'reverse':Object.freeze({name:"REVERSE!",src:new URL('reverse-v3.png',root).href,alt:"Half smugly presents a red card with two reverse arrows."}),
 'send-it':Object.freeze({name:"SEND IT!",src:new URL('send-it-v2.png',root).href,alt:"Half attempts a risky skateboard jump across an island gap."}),
 'trade-offer':Object.freeze({name:"TRADE OFFER",src:new URL('trade-offer-v3.png',root).href,alt:"Half steeples both hands over a Coin and a card in a sly negotiating pose."}),
 bombardiro:Object.freeze({name:'BOMBARDIRO!',src:new URL('bombardiro-v2.png',root).href,alt:'Crocodile airplane releases a bomb above the Halfroll racers.'}),
 hook:Object.freeze({name:'UNI HOOK',src:new URL('uni-hook-v1.png',root).href,alt:'Half fires a tethered unicorn horn that attaches to Pebble and pulls Half forward.'}),
 pandora:Object.freeze({name:'PANDORA BOX',src:new URL('pandora-v2.png',root).href,alt:'Half cautiously reaches toward a mysterious closed chest.'}),
});
export function generatedCardArt(id){const art=ART_SAMPLES[id];return art?`<img data-generated-card="${id}" src="${art.src}" alt="${art.alt}" width="${art.width||1536}" height="${art.height||1024}" decoding="async">`:null;}
