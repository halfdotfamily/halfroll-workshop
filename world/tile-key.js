// One visual vocabulary for the board print, number tabs and the on-screen key.
// This is presentation metadata only; room rules remain the source of effects.
export const TILE_KEY=Object.freeze([
 {type:'airdrop',aliases:['spark'],label:'Coins',detail:'Collect Coins',color:'#f2d77f',shape:'circle',path:'M25 16a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 11v10m-5-5h10'},
 {type:'draw',label:'Free card',detail:'Find a card',color:'#bed8f4',shape:'square',path:'M9 7H6v17h13v-3M11 5h15v18H11ZM15 10h7m-7 4h7m-7 4h4'},
 {type:'market',label:'Shop tile',detail:'Land here to buy a card or pass',color:'#b9dfc5',shape:'roof',path:'M6 15v11h20V15M4 12l4-7h16l4 7ZM4 12v4h6v-4m0 0v4h6v-4m0 0v4h6v-4m0 0v4h6v-4M12 26v-7h8v7'},
 {type:'checkpoint',label:'Passing shop',detail:'48 · 72 · 96 · 120 — first pass unlocks a stop',color:'#dce6f3',shape:'roof',path:'M6 15v11h20V15M4 12l4-7h16l4 7ZM4 12v4h6v-4m0 0v4h6v-4m0 0v4h6v-4m0 0v4h6v-4M11 21h10m-3-3 3 3-3 3'},
 {type:'pandora',label:'Mystery',detail:'Open a surprise box',color:'#d4c4ec',shape:'diamond',path:'M8 12v14h16V12ZM6 8h20v5H6ZM13 6a3 3 0 1 1 5 2l-2 2m0 7v2m0 4v.1'},
 {type:'portal',label:'Portal',detail:'Travel to a linked tile',color:'#bce5e2',shape:'circle',path:'M7 13a9 9 0 0 1 17-2m-4-2 4 2 2-4M25 19a9 9 0 0 1-17 2m4 2-4-2-2 4M12 16h8'},
 {type:'well',label:'Well',detail:'Take a Coin or roll',color:'#f2dfb1',shape:'arch',path:'M5 12l11-7 11 7M8 12v13m16-13v13M6 24c5-4 15-4 20 0v4H6ZM16 10v8m-3 0h6l-1 6h-4Z'},
 {type:'trap',aliases:['setback'],label:'Backwards',detail:'Moves you back',color:'#efb09b',shape:'warning',path:'M11 8 4 15l7 7M5 15h14a7 7 0 0 1 0 14M23 5v6m0 3v.1'},
 {type:'good',label:'Lucky',detail:'A helpful event',color:'#c8e5b3',shape:'circle',path:'m16 5 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z'},
 {type:'bad',label:'Trouble',detail:'An adverse event',color:'#efb09b',shape:'warning',path:'m19 4-12 14h8l-2 10 12-15h-8ZM6 6l2 2m18 16 2 2'},
 {type:'finish',label:'Throne',detail:'Complete the Throne Trial',color:'#f2d77f',shape:'arch',path:'M5 9 11 15l5-9 5 9 6-6-3 16H8ZM9 28h14'}
].map(item=>Object.freeze({...item,aliases:Object.freeze(item.aliases||[])})));

const byType=new Map(TILE_KEY.flatMap(item=>[item.type,...item.aliases].map(type=>[type,item])));
export const tileKey=type=>byType.get(type)??null;

const outline={circle:'M16 1a15 15 0 1 1 0 30 15 15 0 1 1 0-30Z',square:'M5 1h22a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4Z',roof:'M1 11 7 1h18l6 10v20H1Z',diamond:'M16 0 32 16 16 32 0 16Z',warning:'M8 1h16l7 7v16l-7 7H8l-7-7V8Z',arch:'M1 16a15 15 0 0 1 30 0v15H1Z'};

export function tileKeySvg(type){
 const item=tileKey(type);if(!item)return '';
 return `<svg viewBox="-2 -2 36 36" aria-hidden="true" focusable="false"><path d="${outline[item.shape]}" fill="${item.color}" stroke="#2a2c31" stroke-width="1.8"/><path d="${item.path}" transform="translate(4 4) scale(.75)" fill="none" stroke="#2a2c31" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function paintTileKey(ctx,type,{x=0,y=0,size=32}={}){
 const item=tileKey(type);if(!item)return;
 ctx.save();ctx.translate(x,y);ctx.scale(size/32,size/32);
 ctx.fillStyle=item.color;ctx.strokeStyle='#2a2c31';ctx.lineWidth=1.8;
 const plate=new Path2D(outline[item.shape]);ctx.fill(plate);ctx.stroke(plate);
 ctx.translate(4,4);ctx.scale(.75,.75);ctx.lineWidth=2.4;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(new Path2D(item.path));ctx.restore();
}

export function mountMapKey(parent){
 if(!parent||parent.querySelector('.map-key'))return;
 const details=document.createElement('details');details.className='map-key';
 details.innerHTML='<summary>Tile key</summary><div class="map-key__items">'+TILE_KEY.map(item=>`<div class="map-key__item"><span class="map-key__icon">${tileKeySvg(item.type)}</span><span><strong>${item.label}</strong><small>${item.detail}</small></span></div>`).join('')+'<p>Striped roadside signs mark passing shops. Finish your normal move and its landing effect, then buy one card or keep going. You do not have to land on the marked tile. Tap a tile or sign to inspect it.</p></div>';
 parent.append(details);return details;
}
