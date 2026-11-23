import {characterSvg} from '../../game/characters.js';
export const PALETTE={trail:'#efe9dc',spark:'#eed17b',draw:'#a6b8e0',market:'#e8c56f',good:'#92c782',bad:'#e98e7c',portal:'#b5a1d5',trap:'#df927e',shortcut:'#7fb79a',setback:'#ce7b69',well:'#83becb',finish:'#e9bd54'};
export const LABELS={trail:'Trail',spark:'Spark cache',draw:'Pocket crate',market:'Pocket Shop',good:'Lucky chest',bad:'Jinx chest',portal:'Twin portal',trap:'Bramble trap',setback:'Root slide',well:'Wishing well',finish:'Wish Throne'};
export const PORTAL_COLORS={mint:'#72b6a1',blue:'#91b4df',violet:'#b5a1d5'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const fmt=n=>n.toFixed(2),pt=p=>`${fmt(p.x)},${fmt(p.y)}`;
const C={ink:'#2a2c31',paper:'#f8f5ee',mint:'#a9d7be',leaf:'#d3e6c4',blue:'#3f5ba8'};
export const TRAIL_WIDTH=44,SECTION_STEPS=12;
const CX=800,CY=655,W=TRAIL_WIDTH;
// Deliberately authored as a journey: climb, crooked outside loop, long inner
// traverses, switchbacks and a final curl. Never derive this from a polar spiral.
export const ROUTE_KNOTS=[[680,1210],[680,1050],[440,1050],[385,1140],[230,1100],[230,800],[275,720],[220,570],[220,250],[300,190],[640,190],[780,240],[1010,180],[1320,230],[1360,420],[1290,550],[1350,710],[1290,920],[1330,1110],[1090,1130],[960,1070],[850,1130],[840,950],[1080,950],[1130,820],[1110,610],[1180,420],[1050,340],[850,370],[650,330],[420,360],[400,550],[480,640],[390,800],[490,900],[620,870],[640,700],[590,580],[630,480],[800,470],[960,480],[1000,640],[1000,840],[740,840]].map(([x,y])=>({x,y}));
function authoredPath(){
 const out=[ROUTE_KNOTS[0]],lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 function line(to){const from=out.at(-1),steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/4));for(let i=1;i<=steps;i++)out.push(lerp(from,to,i/steps));}
 for(let i=1;i<ROUTE_KNOTS.length-1;i++){const prev=ROUTE_KNOTS[i-1],p=ROUTE_KNOTS[i],next=ROUTE_KNOTS[i+1],before=Math.hypot(p.x-prev.x,p.y-prev.y),after=Math.hypot(next.x-p.x,next.y-p.y),trim=Math.min(130,before*.46,after*.46),entry=lerp(p,prev,trim/before),exit=lerp(p,next,trim/after);const incoming={x:(p.x-prev.x)/before,y:(p.y-prev.y)/before},outgoing={x:(next.x-p.x)/after,y:(next.y-p.y)/after},angle=Math.acos(Math.max(-1,Math.min(1,incoming.x*outgoing.x+incoming.y*outgoing.y))),handle=angle<.00001?2*trim/3:4/3*Math.tan(angle/4)*trim/Math.tan(angle/2),c1={x:entry.x+incoming.x*handle,y:entry.y+incoming.y*handle},c2={x:exit.x-outgoing.x*handle,y:exit.y-outgoing.y*handle};line(entry);for(let j=1;j<=64;j++){const t=j/64,u=1-t;out.push({x:u**3*entry.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t**3*exit.x,y:u**3*entry.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t**3*exit.y});}}
 line(ROUTE_KNOTS.at(-1));return out;
}
export function makeRoute(){
 const dense=authoredPath(),lengths=[0];for(let i=1;i<dense.length;i++)lengths.push(lengths.at(-1)+Math.hypot(dense[i].x-dense[i-1].x,dense[i].y-dense[i-1].y));
 let at=1;const smoothPoints=[],count=144*SECTION_STEPS;for(let i=0;i<=count;i++){const d=lengths.at(-1)*i/count;while(at<lengths.length-1&&lengths[at]<d)at++;const f=(d-lengths[at-1])/(lengths[at]-lengths[at-1]);smoothPoints.push({x:dense[at-1].x+(dense[at].x-dense[at-1].x)*f,y:dense[at-1].y+(dense[at].y-dense[at-1].y)*f});}
 // Local C2-smooth bypass beside the Wish Throne. Retain section identity,
 // the shared frame lattice and the complete route outside sections118–124.
 for(let i=0;i<smoothPoints.length;i++){
  const section=i/SECTION_STEPS,t=(section-117.5)/6;
  if(t>0&&t<1)smoothPoints[i].x-=2.2/.065*Math.sin(Math.PI*t)**4;
 }
 const frames=smoothPoints.map((p,i)=>{const a=smoothPoints[Math.max(0,i-1)],b=smoothPoints[Math.min(count,i+1)],len=Math.hypot(b.x-a.x,b.y-a.y),n={x:-(b.y-a.y)/len,y:(b.x-a.x)/len};return{left:{x:p.x+n.x*W/2,y:p.y+n.y*W/2},right:{x:p.x-n.x*W/2,y:p.y-n.y*W/2},center:p};});
 const edges=frames.filter((_,i)=>i%SECTION_STEPS===0),samples=smoothPoints.filter((_,i)=>i%(SECTION_STEPS/2)===0);
 const cells=Array.from({length:144},(_,i)=>{const strip=frames.slice(i*SECTION_STEPS,(i+1)*SECTION_STEPS+1);return{number:i+1,center:samples[i*2+1],strip,outline:[...strip.map(f=>f.left),...strip.map(f=>f.right).reverse()],polygon:[edges[i].left,edges[i+1].left,edges[i+1].right,edges[i].right]};});
 return{points:samples,smoothPoints,frames,edges,cells};
}
export const ROUTE=makeRoute();
export function linkCurve(link,index){
 const a=ROUTE.cells[link.from-1].center,b=ROUTE.cells[link.to-1].center,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len,m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
 const t=Math.max(0,Math.min(1,((CX-a.x)*dx+(CY-a.y)*dy)/(len*len))),distance=Math.hypot(a.x+t*dx-CX,a.y+t*dy-CY);
 const offset=distance<140?350*(Math.sign((m.x-CX)*nx+(m.y-CY)*ny)||1):(index%2?22:-22),c={x:m.x+nx*offset,y:m.y+ny*offset};
 const at=t=>({x:(1-t)**2*a.x+2*t*(1-t)*c.x+t*t*b.x,y:(1-t)**2*a.y+2*t*(1-t)*c.y+t*t*b.y});
 return{a,b,c,mid:at(.5),points:Array.from({length:51},(_,i)=>at(i/50)),start:{x:a.x+dx/len*14,y:a.y+dy/len*14},end:{x:b.x-dx/len*14,y:b.y-dy/len*14}};
}
function rand(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function clear(x,y){return Math.min(...ROUTE.points.map(p=>Math.hypot(p.x-x,p.y-y)));}
const icon={
 good:'<path d="M-10-3q0-9 10-9t10 9v12h-20Z"/><path d="M-10-3h20M0-7v14M-4 0h8" fill="none"/>',
 bad:'<path d="M-10-3q0-9 10-9t10 9v12h-20Z"/><path d="M-10-3h20M0-7v8M0 4v2" fill="none"/>',
 portal:'<ellipse rx="10" ry="13" fill="none"/><ellipse rx="6" ry="9" fill="none"/><path d="M-3 0h6M0-3v6"/>',
 spark:'<path d="m0-9 2.5 6.5L10 0 2.5 2.5 0 10-2.5 2.5-10 0-2.5-2.5Z"/>',
 draw:'<rect x="-7" y="-8" width="12" height="16" rx="2" transform="rotate(-12)"/><path d="M-1-5 6-6 8 8 3 9" fill="none"/>',
 market:'<path d="M-9-3h18v10H-9Z M-10-3l3-7H7l3 7Z"/><path d="M-5-9v6M0-9v6M5-9v6M-2 7V1h4v6" fill="none"/>',
 trap:'<path d="m-9 7 4-15 5 7 5-7 4 15Z"/><path d="M0 3v2"/>',
 shortcut:'<path d="M-9 4H8M2-2l6 6-6 6 M-9-5H4" fill="none"/>',
 setback:'<path d="M9-4H-8M-2-10l-6 6 6 6 M9 5H-4" fill="none"/>',
 well:'<ellipse rx="9" ry="5"/><path d="M-9 0v7q9 7 18 0V0" fill="none"/>',
 finish:'<path d="m-10 7-2-15 7 5 5-8 5 8 7-5-2 15Z"/>',trail:''};
function iconSvg(type,x,y,scale=1){return`<g transform="translate(${x} ${y}) scale(${scale})" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${icon[type]||''}</g>`;}
const tree=(x,y,s=1,pine=false)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="12" rx="20" ry="7" fill="#789578" opacity=".25"/><path d="M0 7v-28" stroke="#665d4b" stroke-width="6"/>${pine?'<path d="m0-61-23 39h10L-27-4H27L13-22h10Z" fill="#73a88c" stroke="#537b68" stroke-width="2"/>':'<path d="M-24-19Q-37-43-14-48Q-4-70 14-49Q39-44 25-20Q15-4-3-14Q-17-2-24-19Z" fill="#a9d7be" stroke="#628e74" stroke-width="2"/><path d="M-14-38q9-8 16-1M5-24q9 2 12-6" fill="none" stroke="#d3e6c4" stroke-width="3"/>'}</g>`;
const mushroom=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="8" rx="24" ry="7" fill="#799177" opacity=".23"/><path d="M-7 0-4-30H6L9 0Q0 9-7 0" fill="#efe9dc" stroke="#6f7772" stroke-width="2"/><path d="M-31-27Q-32-64 0-66Q32-63 33-27Q1-12-31-27Z" fill="#3f5ba8" stroke="#2f3a56" stroke-width="2"/><path d="M-20-42q12-15 27-12" fill="none" stroke="#b9c6e6" stroke-width="3"/><circle cx="14" cy="-36" r="4" fill="#dfe5f3"/></g>`;
const mountain=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-53 8 0-91 54 8Z" fill="#7f9397" stroke="#52656d" stroke-width="2"/><path d="M0-91 11-9 54 8Z" fill="#3e5368"/><path d="m-15-63 15-28 17 32-13-5-8 10Z" fill="#f8f5ee"/><path d="m-53 8 17-31 8 21 19-16 20 26Z" fill="#96b5a0"/></g>`;
const flowers=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" stroke="#73926c" stroke-width="2"><path d="M0 5v-15M-3 1l-8-8M3 0l9-8"/><g fill="#e9cd7a" stroke="none"><circle cy="-12" r="4"/><circle cx="-12" cy="-8" r="4"/><circle cx="13" cy="-9" r="4"/></g></g>`;
function label(x,y,title,subtitle){return`<g transform="translate(${x} ${y})"><rect x="-99" y="-18" width="198" height="45" rx="14" fill="#f8f5ee" fill-opacity=".94" stroke="#647969" stroke-width="1.5"/><text text-anchor="middle" y="1" font-family="Dela Gothic One,sans-serif" font-size="13" fill="#2f3a56">${title}</text><text text-anchor="middle" y="17" font-size="8" letter-spacing="1">${subtitle}</text></g>`;}
function critter(id,x,y,size=66){return`<g transform="translate(${x} ${y})">${characterSvg(id).replace('<svg ',`<svg x="${-size/2}" y="${-size}" width="${size}" height="${size}" `)}</g>`;}
function scenery(links){
 const random=rand(9416),parts=[];for(let i=0;i<1200;i++){const x=180+random()*1240,y=160+random()*1070,r=Math.hypot(x-CX,y-CY);if(x<195||x>1400||y<205||y>1200||r<126||clear(x,y)<54)continue;
  const t=random();if(t<.18)parts.push(tree(x,y,.45+random()*.27,x>940));else if(t<.24)parts.push(mushroom(x,y,.4+random()*.2));else if(t<.33)parts.push(flowers(x,y,.5+random()*.4));else if(t<.52)parts.push(`<ellipse cx="${x}" cy="${y}" rx="${4+random()*7}" ry="3" fill="#bdc7ac" stroke="#93a18b" stroke-width="1"/>`);else parts.push(`<path d="M${x-4} ${y}q1-7 4-8v8q5-6 8-5" fill="none" stroke="#9cb784" stroke-width="1.6"/>`);
 }
 // Place each landmark in a route-free pocket, including its full silhouette.
 const linkSamples=links.flatMap((l,i)=>linkCurve(l,i).points);
 const linkClear=(x,y)=>linkSamples.every(p=>Math.hypot(x-p.x,y-p.y)>75);
 const pockets=[];for(let y=255;y<1150;y+=15)for(let x=290;x<1330;x+=15){const r=Math.hypot(x-CX,y-CY);if(r<180||Math.hypot(x-750,y-900)<100||clear(x,y)<58||!linkClear(x,y))continue;const fits=[-50,0,50].every(dx=>[-48,0,45].every(dy=>clear(x+dx,y+dy)>23));if(fits)pockets.push({x,y});}
 const anchors=[[400,900],[410,450],[800,280],[1160,490],[1110,930],[720,990]],names=[['Mushroom market','POCKETS FULL OF MAYBE'],['Mintwood','FOLLOW THE LITTLE FEET'],['Cloud ridge','A LONG WAY DOWN'],['Whispering well','MAKE A SMALL WISH'],['Paper harbor','CATCH A FRIENDLY GUST'],['The old shortcut','BRIDGES BETWEEN TURNS']];
 const taken=[];anchors.forEach(([ax,ay],i)=>{const p=pockets.filter(p=>taken.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>160)).sort((a,b)=>Math.hypot(a.x-ax,a.y-ay)-Math.hypot(b.x-ax,b.y-ay))[0];if(!p)return;taken.push(p);const{x,y}=p;let art='';
  if(i===0)art=`<g transform="translate(${x} ${y-25})"><path d="M-45 8h90v37h-90Z" fill="#d6cdbb" stroke="#2a2c31" stroke-width="2"/><path d="m-53 7 13-35h80L53 7Z" fill="#a9d7be" stroke="#2a2c31" stroke-width="2"/><path d="M-26-28v35M0-28v35M26-28v35" stroke="#f8f5ee" stroke-width="13"/><path d="M-53 7H53" stroke="#2a2c31" stroke-width="2"/><rect x="-29" y="20" width="20" height="13" fill="#e9cd7a"/><rect x="12" y="17" width="13" height="18" fill="#3f5ba8"/></g>${critter(5,x+45,y+16,43)}`;
  if(i===1)art=tree(x-30,y-15,1.3)+tree(x+28,y-17,1)+critter(0,x,y+10,52);
  if(i===2)art=mountain(x-33,y-3,.9)+mountain(x+27,y-8,1.2);
  if(i===3)art=`<g transform="translate(${x} ${y-15})"><ellipse cy="17" rx="46" ry="22" fill="#a9d7be"/><path d="M-27-4v30q27 14 54 0V-4" fill="#d6cdbb" stroke="#2a2c31" stroke-width="2"/><ellipse cy="-4" rx="27" ry="12" fill="#82bdcd" stroke="#2a2c31" stroke-width="2"/><path d="M-33 10v-57h66v57M-44-47l44-23 44 23Z" fill="#3f5ba8" stroke="#2a2c31" stroke-width="3"/><path d="M0-46v30" stroke="#f8f5ee" stroke-width="2"/></g>`;
  if(i===4)art=`<g transform="translate(${x} ${y})"><ellipse rx="65" ry="29" fill="#98c9d7"/><path d="m-47-5 87 0-15 17h-55Z" fill="#d6cdbb" stroke="#2a2c31" stroke-width="2"/><path d="M-3-5v-62L31-9H-3Z" fill="#f8f5ee" stroke="#2a2c31" stroke-width="2"/><path d="m-9-55-27 43h27Z" fill="#a9d7be" stroke="#2a2c31" stroke-width="2"/></g>`;
  if(i===5)art=`<g transform="translate(${x} ${y-17})"><path d="M-43 31v-53q0-55 43-55t43 55v53H25V-20q0-35-25-35t-25 35v51Z" fill="#d6cdbb" stroke="#6c7a70" stroke-width="3"/><path d="M-43-15h18M-35-48l13 9M-6-77v23M28-62l-12 16M27-13h15" stroke="#879888" stroke-width="2"/><path d="M-48 29q18-25 29 0M25 28q17-24 25 0" fill="#7fb79a"/></g>`;
  parts.push(`<g class="landmark" transform="translate(${x} ${y}) scale(.5) translate(${-x} ${-y})">${art}${label(x,y+61,...names[i])}</g>`);
 });return parts.join('');
}
export function renderBoard(rules){
 const specials=new Map(rules.tiles.map(t=>[t.number,t]));
 const outline=[[170,150],[400,130],[580,155],[780,120],[1020,140],[1250,130],[1420,180],[1450,380],[1420,570],[1460,790],[1420,1000],[1450,1210],[1280,1290],[1060,1260],[830,1300],[620,1275],[400,1300],[180,1250],[135,1090],[160,890],[135,670],[160,470],[130,300]].map(([x,y])=>({x,y}));
 const path=`M${ROUTE.points.map(pt).join('L')}`,coast=`M${outline.map(pt).join('L')}Z`;
 const cells=ROUTE.cells.map(c=>{const type=specials.get(c.number)?.type||'trail';return`<g class="board-cell" role="button" tabindex="0" data-cell="${c.number}" aria-label="Section ${c.number}: ${LABELS[type]}"><title>${c.number} · ${LABELS[type]}</title><polygon points="${c.outline.map(pt).join(' ')}" fill="${type==='portal'?PORTAL_COLORS[specials.get(c.number).pairColor]:PALETTE[type]}" stroke="#60746a" stroke-width="1.2"/>${type==='trail'?`<text x="${c.center.x}" y="${c.center.y+3.8}" text-anchor="middle" font-size="10" fill="#49594d">${c.number}</text>`:`${iconSvg(type,c.center.x,c.center.y-3,.65)}<text x="${c.center.x}" y="${c.center.y+13}" text-anchor="middle" font-size="8.5" font-weight="600">${c.number}</text>`}</g>`;}).join('');
 const linkParts=rules.links.map((l,i)=>{const {start,end,c,mid}=linkCurve(l,i),color=l.type==='portal'?PORTAL_COLORS[l.pairColor]:'#a45d4e';return{path:`<g class="board-link" data-inspect="${l.from}"><path d="M${pt(start)}Q${pt(c)} ${pt(end)}" fill="none" stroke="#f8f5ee" stroke-width="9"/><path d="M${pt(start)}Q${pt(c)} ${pt(end)}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="7 5" marker-end="url(#arrow-${l.type})"/></g>`,label:`<g class="board-link" data-link="${l.from}" role="button" tabindex="0" aria-label="${esc(l.name)}: ${l.from} to ${l.to}"><rect x="${mid.x-36}" y="${mid.y-11}" width="72" height="22" rx="11" fill="#f8f5ee" stroke="${color}" stroke-width="1.5"/><text x="${mid.x}" y="${mid.y+3.5}" text-anchor="middle" font-size="9" fill="${color}" font-weight="600">${l.from} → ${l.to}</text></g>`};});
 const links=linkParts.map(l=>l.path).join('')+linkParts.map(l=>l.label).join('');
 const arrows=[12,38,64,90,116,140].map(n=>{const a=ROUTE.cells[n-1].center,b=ROUTE.cells[n].center,angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;return`<g class="route-arrow" transform="translate(${a.x} ${a.y}) rotate(${angle})"><path d="M-7-27H9M3-32l6 5-6 5" fill="none" stroke="#3f5ba8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>`;}).join('');
 return`<svg xmlns="http://www.w3.org/2000/svg" class="spiral-board" viewBox="0 0 1600 1370" role="group" aria-label="Half Hollow winding board, 144 connected sections from the bottom entrance through climbs, zigzags and loops to the Wish Throne" style="font-family:'Martian Mono',monospace;color:#2a2c31"><defs><pattern id="sea-stitches" width="115" height="80" patternUnits="userSpaceOnUse"><path d="M7 25q13 7 27 0M68 62q14 7 27 0" fill="none" stroke="#c8e2da" stroke-width="2" opacity=".6"/></pattern><marker id="arrow-portal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="m0 0 10 5-10 5Z" fill="#426f5b"/></marker><marker id="arrow-setback" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="m0 0 10 5-10 5Z" fill="#a45d4e"/></marker></defs>
 <rect width="1600" height="1370" rx="32" fill="#90bfc0"/><rect width="1600" height="1370" rx="32" fill="url(#sea-stitches)"/>
 <path d="${coast}" transform="translate(0 17)" fill="#819f99" stroke="#526e69" stroke-width="3"/><path d="${coast}" fill="#d3dfbd" stroke="#edf0d8" stroke-width="10"/>
 <path d="${coast}" fill="none" stroke="#6e8d79" stroke-width="2"/>
 <g opacity=".36" fill="#b2cda7"><ellipse cx="430" cy="620" rx="185" ry="310"/><ellipse cx="1000" cy="380" rx="280" ry="120"/><ellipse cx="1030" cy="930" rx="260" ry="190"/></g>
 <path d="${path}" fill="none" stroke="#9cb186" stroke-width="64" stroke-linecap="round"/><path d="${path}" fill="none" stroke="#e7e5cc" stroke-width="53" stroke-linecap="round"/>
 <g id="scenery-layer">${scenery(rules.links)}</g><g id="sections-layer">${cells}${arrows}</g><g id="links-layer">${links}</g>
 <g transform="translate(${CX} ${CY})"><circle r="101" fill="#b9c5a8"/><circle r="88" fill="#d6cdbb" stroke="#667566" stroke-width="3"/><circle r="76" fill="#3f5ba8" stroke="#2f3a56" stroke-width="4"/>${Array.from({length:20},(_,i)=>{const a=i*Math.PI/10;return`<path d="M${Math.cos(a)*77} ${Math.sin(a)*77}L${Math.cos(a)*88} ${Math.sin(a)*88}" stroke="#8f9a87" stroke-width="2"/>`;}).join('')}<image href="../../assets/half-family-complete.png" x="-57" y="14" width="114" height="24"/><g transform="translate(-25 -22) rotate(-13)"><rect x="-17" y="-17" width="34" height="34" rx="6" fill="#f8f5ee" stroke="#2a2c31" stroke-width="2"/><circle cx="-7" cy="-7" r="2.5"/><circle cx="7" cy="7" r="2.5"/><circle r="2.5"/></g><text text-anchor="middle" y="58" font-size="8" fill="#f8f5ee">THE ROLL PIT</text></g>
 <g transform="translate(750 900)"><path d="M-28 15v-35h56v35M-35-35h70" fill="none" stroke="#2a2c31" stroke-width="4"/><path d="m-16-38-4-17 13 7 7-15 7 15 13-7-4 17Z" fill="#e9cd7a" stroke="#2a2c31" stroke-width="2"/><text y="35" text-anchor="middle" font-family="Dela Gothic One,sans-serif" font-size="10">WISH THRONE</text><text y="50" text-anchor="middle" font-size="8">144 · FINISH ↗</text></g>
 <g transform="translate(680 1220)"><path d="M-48 0h96v35h-96Z" fill="#f8f5ee" stroke="#2a2c31" stroke-width="2"/><text text-anchor="middle" y="23" font-size="13" font-family="Dela Gothic One,sans-serif">START ↑</text><text text-anchor="middle" y="53" font-size="10">SMALL FEET. A VERY LONG WAY HOME.</text></g>${critter(0,565,1254,70)}${critter(1,613,1264,60)}${critter(4,776,1266,66)}
 <g transform="translate(165 85)"><text font-family="Dela Gothic One,sans-serif" font-size="29" fill="#2f3a56">Half Hollow</text><text y="25" font-size="11" letter-spacing="2">THE LONG WAY HOME</text></g><g transform="translate(1520 1180)"><circle r="28" fill="#f8f5ee" stroke="#2a2c31" stroke-width="2"/><path d="m0-22 7 22-7 22-7-22Z" fill="#3f5ba8"/><text y="-38" text-anchor="middle" font-size="10">N</text><text y="51" text-anchor="middle" font-size="8">STUDY 02</text></g>
 </svg>`;
}
