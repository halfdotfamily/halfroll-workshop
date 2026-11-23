const hashOf = w => { let h=2166136261; for (const c of w) {h^=c.charCodeAt(0);h=Math.imul(h,16777619);} return h>>>0; };
const Critter = (function(){
const C = {ink:'#2a2c31', paper:'#f8f5ee', cream:'#efe9dc', mint:'#a9d7be', leaf:'#d3e6c4', cobalt:'#3f5ba8', navy:'#2f3a56', sand:'#d6cdbb', pale:'#b9c6e6', sage:'#7fb79a', peach:'#f2b8a8'};
const line = (width=3) => `stroke="${C.ink}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;
const LN = line();

// ---- trait tables. each body knows where its face sits (fy) and where its head starts (t)
const BODIES = [
  {n:'egg', rx:82, hw:33,     fy:58, t:28, d:'M50 28 C77 27 84 50 82 70 C80 92 69 106 50 106 C30 106 19 92 18 69 C16 49 24 29 50 28Z'},
  {n:'bean', rx:85, hw:36,    fy:60, t:32, d:'M50 32 C80 30 88 52 86 74 C84 96 70 108 50 108 C30 108 14 96 14 74 C14 52 20 34 50 32Z'},
  {n:'drop', rx:81, hw:31,    fy:62, t:28, d:'M50 26 C62 40 84 52 82 74 C80 96 68 108 50 108 C32 108 20 96 18 74 C16 52 38 40 50 26Z'},
  {n:'box', rx:77, hw:27,     fy:56, t:28, d:'M24 34 Q24 28 30 28 H70 Q76 28 76 34 L78 108 H22 Z'},
  {n:'pear', rx:84, hw:22,    fy:52, t:30, d:'M50 30 C66 30 70 44 70 54 C70 62 86 72 86 88 C86 102 70 110 50 110 C30 110 14 102 14 88 C14 72 30 62 30 54 C30 44 34 30 50 30Z'},
  {n:'capsule', rx:72, hw:23, fy:52, t:26, d:'M50 26 C66 26 72 36 72 50 V108 H28 V50 C28 36 34 26 50 26Z'},
];
const COLS = [
  {n:'mint',f:C.mint},{n:'leaf',f:C.leaf},{n:'cobalt',f:C.cobalt,dark:1},{n:'navy',f:C.navy,dark:1},
  {n:'paper',f:C.paper},{n:'sand',f:C.sand},{n:'pale',f:C.pale},{n:'sage',f:C.sage},
];
const BGS = [{n:'cream',f:C.cream},{n:'leaf',f:'#e3eedb'},{n:'paper',f:C.paper},{n:'sand',f:'#e6dfcf'},{n:'sky',f:'#dfe5f3'},{n:'mist',f:'#d9eee2'}];

const EYES = [
  {n:'lids',   s:(y,e)=>`<circle cx="39" cy="${y+3}" r="3.2" fill="${e}"/><circle cx="61" cy="${y+3}" r="3.2" fill="${e}"/><path d="M32 ${y-2} h14 M54 ${y-2} h14" stroke="${e}" stroke-width="3.5" stroke-linecap="round"/>`},
  {n:'dots',   s:(y,e)=>`<circle cx="40" cy="${y}" r="3.4" fill="${e}"/><circle cx="60" cy="${y}" r="3.4" fill="${e}"/>`},
  {n:'sleepy', s:(y,e)=>`<path d="M33 ${y} q6 5 12 0 M55 ${y} q6 5 12 0" fill="none" stroke="${e}" stroke-width="3" stroke-linecap="round"/>`},
  {n:'wide',   s:(y,e)=>`<circle cx="39" cy="${y}" r="6" fill="${C.paper}" ${line(2.5)}/><circle cx="61" cy="${y}" r="6" fill="${C.paper}" ${line(2.5)}/><circle cx="39" cy="${y}" r="2.4" fill="${C.ink}"/><circle cx="61" cy="${y}" r="2.4" fill="${C.ink}"/>`},
  {n:'side-eye',s:(y,e)=>`<circle cx="39" cy="${y}" r="6" fill="${C.paper}" ${line(2.5)}/><circle cx="61" cy="${y}" r="6" fill="${C.paper}" ${line(2.5)}/><circle cx="42" cy="${y+1}" r="2.4" fill="${C.ink}"/><circle cx="64" cy="${y+1}" r="2.4" fill="${C.ink}"/><path d="M32 ${y-5} h14 M54 ${y-5} h14" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`},
  {n:'visor',  s:(y,e)=>`<rect x="26" y="${y-6}" width="48" height="12" rx="3" fill="${C.ink}" ${LN}/><path d="M32 ${y} h12" stroke="${C.mint}" stroke-width="3" stroke-linecap="round"/>`},
  {n:'glasses',s:(y,e)=>`<circle cx="39" cy="${y}" r="7" fill="none" stroke="${e}" stroke-width="2.6"/><circle cx="61" cy="${y}" r="7" fill="none" stroke="${e}" stroke-width="2.6"/><path d="M46 ${y} h8" stroke="${e}" stroke-width="2.6"/><circle cx="39" cy="${y+1}" r="2.2" fill="${e}"/><circle cx="61" cy="${y+1}" r="2.2" fill="${e}"/>`},
  {n:'tired',  s:(y,e)=>`<circle cx="40" cy="${y}" r="3" fill="${e}"/><circle cx="60" cy="${y}" r="3" fill="${e}"/><path d="M34 ${y+7} q5 3 11 0 M55 ${y+7} q5 3 11 0" fill="none" stroke="${e}" stroke-width="2" stroke-linecap="round"/>`},
];
const MOUTHS = [
  {n:'flat',  s:(y,e)=>`<path d="M45 ${y} h10" stroke="${e}" stroke-width="2.6" stroke-linecap="round"/>`},
  {n:'o',     s:(y,e)=>`<circle cx="50" cy="${y}" r="2.6" fill="${e}"/>`},
  {n:'wavy',  s:(y,e)=>`<path d="M43 ${y} q3.5-3 7 0 q3.5 3 7 0" fill="none" stroke="${e}" stroke-width="2.4" stroke-linecap="round"/>`},
  {n:'smirk', s:(y,e)=>`<path d="M45 ${y} q6 3 11-3" fill="none" stroke="${e}" stroke-width="2.6" stroke-linecap="round"/>`},
  {n:'tooth', s:(y,e)=>`<path d="M44 ${y} h12" stroke="${e}" stroke-width="2.6" stroke-linecap="round"/><rect x="48" y="${y}" width="4.5" height="4.5" fill="${C.paper}" stroke="${e}" stroke-width="1.5"/>`},
  {n:'none',  w:.25, s:()=>''},
];
const HATS = [
  {n:'none',      s:()=>''},
  {n:'antenna',   s:(t)=>`<path d="M50 ${t+1} L44 ${t-14}" ${LN} fill="none"/><circle cx="43" cy="${t-16}" r="4" fill="${C.ink}" ${LN}/>`},
  {n:'bowler',    s:(t)=>`<path d="M38 ${t+4} Q38 ${t-14} 50 ${t-14} Q62 ${t-14} 62 ${t+4} Z" fill="${C.ink}" ${LN}/><path d="M31 ${t+4} H69" ${line(4)}/>`},
  {n:'sprout',    s:(t)=>`<path d="M50 ${t+1} V${t-8}" ${LN} fill="none"/><path d="M50 ${t-8} q-2-10 8-14 q2 10-8 14Z" fill="${C.mint}" ${LN}/><path d="M50 ${t-6} q-10-6-14-1 q8 7 14 1Z" fill="${C.leaf}" ${LN}/>`},
  {n:'horns',     s:(t)=>`<path d="M36 ${t+8} l-7-16 l14 9Z M64 ${t+8} l7-16 l-14 9Z" fill="${C.paper}" ${LN}/>`},
  {n:'halo',      s:(t)=>`<ellipse cx="50" cy="${t-9}" rx="17" ry="4.5" fill="none" stroke="${C.cobalt}" stroke-width="3"/>`},
  {n:'paper crown',s:(t)=>`<path d="M36 ${t+5} L36 ${t-8} L43 ${t-2} L50 ${t-11} L57 ${t-2} L64 ${t-8} L64 ${t+5} Z" fill="${C.paper}" ${LN}/>`},
  {n:'beanie',    s:(t)=>`<path d="M33 ${t+7} Q33 ${t-12} 50 ${t-12} Q67 ${t-12} 67 ${t+7} Z" fill="${C.cobalt}" ${LN}/><path d="M32 ${t+7} H68" ${line(4)}/><circle cx="50" cy="${t-14}" r="4" fill="${C.paper}" ${LN}/>`},
  {n:'bucket hat',s:(t)=>`<path d="M27 ${t+7} L73 ${t+7} L65 ${t-2} Q65 ${t-12} 50 ${t-12} Q35 ${t-12} 35 ${t-2} Z" fill="${C.leaf}" ${LN}/>`},
  {n:'party hat', s:(t)=>`<path d="M42 ${t+4} L50 ${t-20} L58 ${t+4} Z" fill="${C.mint}" ${LN}/><circle cx="50" cy="${t-21}" r="3" fill="${C.cobalt}" ${LN}/>`},
  {n:'tuft',      s:(t)=>`<path d="M46 ${t+2} q-2-10-8-12 M50 ${t+1} q0-10 2-14 M54 ${t+2} q4-8 10-9" fill="none" ${LN}/>`},
  {n:'headphones',s:(t,y,hw)=>{ const l = 50-hw-1, r = 50+hw+1;
    return `<path d="M${l} ${y-2} Q${l} ${t-10} 50 ${t-10} Q${r} ${t-10} ${r} ${y-2}" fill="none" ${line(4)}/><rect x="${l-6}" y="${y-9}" width="11" height="17" rx="4" fill="${C.navy}" ${LN}/><rect x="${r-5}" y="${y-9}" width="11" height="17" rx="4" fill="${C.navy}" ${LN}/>`; }},
];
const ITEMS = [
  {n:'none',  w:1.2, s:()=>''},
  {n:'half coin', px:71, py:96, s:()=>`<path d="M64 98 A15 15 0 0 1 94 98 Z" fill="${C.mint}" ${LN}/><path d="M73 98 A6 6 0 0 1 85 98" fill="none" ${line(2.2)}/>`},
  {n:'token', px:72, py:93, s:()=>`<circle cx="80" cy="86" r="11" fill="${C.cobalt}" ${LN}/><circle cx="80" cy="86" r="5" fill="none" stroke="${C.paper}" stroke-width="2"/>`},
  {n:'eth',   px:73, py:93, s:()=>`<path d="M80 70 L89 85 L80 100 L71 85 Z" fill="${C.leaf}" ${LN}/><path d="M71 85 L80 89 L89 85" fill="none" ${line(2)}/>`},
  {n:'candle',px:75, py:95, s:()=>`<rect x="74" y="80" width="11" height="22" rx="2" fill="${C.paper}" ${LN}/><path d="M79.5 78 q-5-6 0-12 q5 6 0 12Z" fill="${C.peach}" ${line(2.4)}/>`},
  {n:'flag',  px:75, py:90, s:()=>`<path d="M75 102 V68" fill="none" ${LN}/><path d="M75 68 L93 74 L75 80 Z" fill="${C.mint}" ${LN}/>`},
];
// a mitten paw in the body colour, wrapped over the front of the item
const paw = (x, y, f) => `<path d="M${x-6} ${y+1} q0-6 6-6 q6 0 6 6 q0 5-6 5 q-6 0-6-5Z" fill="${f}" ${line(2.6)}/><path d="M${x-1} ${y-4} v4 M${x+3} ${y-3} v3" fill="none" ${line(1.8)}/>`;
const TRAITS = [['body',BODIES],['color',COLS],['background',BGS],['eyes',EYES],['mouth',MOUTHS],['head',HATS],['holding',ITEMS]];
const total = TRAITS.reduce((a,[,t])=>a*t.length,1);

// ---- seeded RNG so a sheet can be reproduced from its seed
function mulberry32(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a>>>15, 1|a); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14) >>> 0) / 4294967296; }; }
const pick = (r, arr) => { const tot = arr.reduce((a,x)=>a+(x.w??1),0); let v = r()*tot; for (const x of arr){ v -= (x.w??1); if (v<0) return x; } return arr[arr.length-1]; };
// body/background pairs that read as one blob
const CLASH = {navy:['sky'], cobalt:['sky'], pale:['sky','paper'], mint:['mist','leaf'], leaf:['leaf','mist','cream'], sage:['mist','leaf'], paper:['paper','cream','sand'], sand:['sand','cream','paper']};
const lum = h => { const c = [1,3,5].map(i => { const v = parseInt(h.substr(i,2),16)/255; return v<=.03928 ? v/12.92 : ((v+.055)/1.055)**2.4; }); return .2126*c[0]+.7152*c[1]+.0722*c[2]; };
const contrast = (a,b) => { const [x,y] = [lum(a),lum(b)].sort((p,q)=>q-p); return (x+.05)/(y+.05); };
const clashes = (col, bg) => (CLASH[col.n]||[]).includes(bg.n) || contrast(col.f, bg.f) < 1.12;

function critter(r, full, overrides={}){
  let b = pick(r,BODIES), col = pick(r,COLS);
  let bg = pick(r,BGS); while (clashes(col,bg)) bg = pick(r,BGS);
  let eyes = pick(r,EYES), hat = pick(r,HATS), item = pick(r,ITEMS);
  let mouth = pick(r,MOUTHS); while (mouth.n==='none' && (eyes.n==='dots' || eyes.n==='tired')) mouth = pick(r,MOUTHS); // no blank faces
  let blush = r() < .3;
  const trait=(table,key,current)=>table.find(t=>t.n===overrides[key])||current;
  b=trait(BODIES,'body',b);col=trait(COLS,'color',col);eyes=trait(EYES,'eyes',eyes);
  hat=trait(HATS,'head',hat);item=trait(ITEMS,'holding',item);mouth=trait(MOUTHS,'mouth',mouth);
  blush=overrides.blush??blush;
  const e = col.dark ? C.paper : C.ink;
  // eyes that bring their own whites or band stay ink-on-paper on any body
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${full ? '0 -2 100 126' : '0 0 100 100'}" role="img" aria-label="${b.n} ${col.n} critter, ${eyes.n} eyes, ${hat.n}">
    ${full ? '' : `<rect width="100" height="100" fill="${bg.f}"/>`}
    <g>
      ${full ? `<path d="M40 100 L37 120 M60 100 L63 120" fill="none" ${LN}/>` : ''}
      <path d="${b.d}" fill="${col.f}" ${LN}/>
      ${blush ? `<ellipse cx="32" cy="${b.fy+11}" rx="5" ry="2.6" fill="${C.peach}" opacity=".85"/><ellipse cx="68" cy="${b.fy+11}" rx="5" ry="2.6" fill="${C.peach}" opacity=".85"/>` : ''}
      ${eyes.s(b.fy, e)}
      ${mouth.s(b.fy+17, e)}
      ${hat.s(b.t, b.fy, b.hw)}
      ${item.n==='none' ? '' : `<g transform="translate(${b.rx-82} 0)">${item.s()}${paw(item.px, item.py, col.f)}</g>`}
    </g></svg>`;
  return {svg, traits:{body:b.n,color:col.n,background:bg.n,eyes:eyes.n,mouth:mouth.n,head:hat.n,holding:item.n,blush}};
}


return {make: critter, rng: mulberry32, full: (key,overrides={}) => critter(mulberry32(hashOf(key)), true,overrides).svg,
  describe: (key,overrides={}) => critter(mulberry32(hashOf(key)),true,overrides).traits};
})();

export {Critter};
