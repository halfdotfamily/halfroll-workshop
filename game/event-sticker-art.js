import {characterSvg} from './characters.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const STICKER_FONT="'Dela Gothic One',Dela,sans-serif";
/** Keep short receipts large; compound results get two balanced readable lines. */
export function stickerCaptionLayout(value,{compact=false}={}){
 const text=String(value),parts=text.split(' · ');let lines=[text];
 if(text.length>15){
  if(parts.length===2)lines=parts;
  else {const spaces=[...text.matchAll(/\s+/g)].map(m=>m.index),at=spaces.sort((a,b)=>Math.abs(a-text.length/2)-Math.abs(b-text.length/2))[0];if(at!==undefined)lines=[text.slice(0,at),text.slice(at).trim()];}
 }
 const longest=Math.max(...lines.map(s=>s.length));
 return {lines,size:Math.min(lines.length>1?12.5:14,(compact?100:112)/Math.max(1,longest*.9)),y:compact?(lines.length>1?74:72):(lines.length>1?82:98)};
}
export function setStickerCaption(node,title){
 if(node.getAttribute('aria-label')===title)return;
 const layout=stickerCaptionLayout(title);node.setAttribute('aria-label',title);node.setAttribute('data-lines',layout.lines.length);node.setAttribute('font-size',layout.size);node.setAttribute('y',layout.y);
 node.innerHTML=layout.lines.length===1?escape(title):layout.lines.map((line,i)=>`<tspan x="70" y="${82+i*18}">${escape(line)}</tspan>`).join(' ');
}
const labels={'spring-step':'BOING!','magic-carpet':'WHOOSH!','paper-glider':'AIR MAIL!','catch-up-kite':'UP WE GO!','pocket-rocket':'BOOM!','rocket-hit':'BOOM!',shield:'BLOCKED!','bubble-coat':'SHIELDS UP!',portal:'POOF!',trap:'OOPS!',setback:'OOPS!','nope-stamp':'NOPE!','leaf-umbrella':'NOT TODAY!','rug-tug':'YOINK!','pocket-audit':'COIN CHECK!','six-seven':'SIX SEVEN!','coins-gain':'KA-CHING!','coins-loss':'OH, COINS!',draw:'PICK ONE!',market:'LITTLE SHOP',well:'MAKE A WISH',good:'NICE!',bad:'UH-OH!',landing:'TA-DA!'};
/** Tiny illustrated action vignettes. Text supplements the actual Critter art. */
export function eventStickerArt(kind,characterId=6,label){
 const title=label||labels[kind]||'LET’S ROLL!',critter=characterSvg(characterId),flying=['magic-carpet','paper-glider','catch-up-kite'].includes(kind),bad=['trap','setback','pocket-rocket','rocket-hit','coins-loss','bad','rug-tug'].includes(kind);
 let prop='';
 if(flying)prop='<path d="m25 69 69-9 23 13-68 12z" fill="#a9d7be"/><path d="m32 72 58-7 16 8-56 8z" fill="#3f5ba8"/><path d="m25 74-8 5m18-1-8 5m77-8 9 3m-18 0 8 4"/>';
 else if(kind==='spring-step')prop='<path d="M47 79q-16-6 1-9l33-5q17-3 0-7l-27-4q-12-3 1-6" fill="none"/><ellipse cx="65" cy="82" rx="25" ry="5" fill="#3f5ba8"/>';
 else if(kind.includes('rocket')||kind==='bad')prop='<path d="m68 22 9 14 17-6-4 17 19 6-17 10 3 17-18-5-9 14-9-16-18 4 3-18-15-9 18-6-1-16 15 7z" fill="#eedb94"/><path d="m107 29 5-7m-79 8-7-4m83 48 8 4"/>';
 else if(['shield','bubble-coat','leaf-umbrella','nope-stamp'].includes(kind))prop='<path d="M68 22q20 10 32 8v24q-3 22-32 32-29-10-32-32V30q12 2 32-8z" fill="#a9d7be"/><path d="m81 43 6 6-16 16-10-9" fill="none"/>';
 else if(kind==='portal')prop='<ellipse cx="68" cy="64" rx="42" ry="18" fill="#3f5ba8"/><ellipse cx="68" cy="64" rx="32" ry="11" fill="#b9c6e6"/><path d="m27 32-5-6m86 4 7-5"/>';
 else if(kind.startsWith('coins')||kind==='pocket-audit'||kind==='well')prop='<g fill="#eedb94"><ellipse cx="32" cy="50" rx="8" ry="10" transform="rotate(-24 32 50)"/><ellipse cx="104" cy="40" rx="8" ry="10" transform="rotate(25 104 40)"/><ellipse cx="101" cy="74" rx="8" ry="10"/></g><path d="m31 45 2 10m71-20v10m-3 24v10"/>';
 else if(kind==='six-seven')prop='<path d="M17 67q-6-11 1-13l8 9-2-18q2-6 6-1l5 17 1-13q3-6 6 0l2 16 6-6q6-2 5 5L43 81H24zm102 0q6-11-1-13l-8 9 2-18q-2-6-6-1l-5 17-1-13q-3-6-6 0l-2 16-6-6q-6-2-5 5l12 18h19z" fill="#a9d7be"/>';
 else if(kind==='draw'||kind==='market')prop='<rect x="25" y="36" width="36" height="46" rx="5" fill="#eedb94" transform="rotate(-16 43 59)"/><rect x="76" y="35" width="36" height="46" rx="5" fill="#a9d7be" transform="rotate(16 94 58)"/>';
 else prop='<path d="m26 78 12-8m62 0 12 8m-17-43 8-7"/><path d="m32 40 5-8 5 8-5 7z" fill="#eedb94"/>';
 const hero=`<g data-critter="${characterId}" transform="translate(${bad?45:46} ${flying?12:kind==='spring-step'?3:10}) rotate(${bad?-15:flying?-9:4} 22 32)"><svg width="48" height="65" viewBox="0 0 100 120">${critter.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'')}</svg></g>`;
 return eventStickerFrame(kind.includes('rocket')||['portal','shield','bubble-coat','six-seven'].includes(kind)?prop+hero:hero+prop,title,{bad});
}

/** Shared cream/ink frame used by the existing on-map emotion stickers. */
export function eventStickerFrame(contents,title,{bad=false,source='',compact=false}={}){
 const layout=stickerCaptionLayout(title,{compact}),width=compact?120:140,height=compact?(layout.lines.length>1?98:82):110,x=width/2;
 const style=`font-family:${STICKER_FONT};font-synthesis:none;letter-spacing:0;stroke:none;stroke-width:0`,sourceSize=Math.min(compact?10.5:11.5,(compact?100:112)/Math.max(1,source.length*.9)),sourceText=source?`<text class="emotion-sticker__source" data-result-source="true" x="${x}" y="${compact?19:23}" text-anchor="middle" font-family="${STICKER_FONT}" font-size="${sourceSize}" font-weight="400" stroke="none" stroke-width="0" style="${style}" fill="#2a2c31">${escape(source)}</text>`:'';
 const caption=layout.lines.length===1?escape(title):layout.lines.map((line,i)=>`<tspan x="${x}" y="${layout.y+i*(compact?16:18)}">${escape(line)}</tspan>`).join(' '),paperTransform=compact?` transform="scale(${width/140} ${height/110})"`:'';
 return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(title)}" xmlns="http://www.w3.org/2000/svg"><g${paperTransform}><path class="emotion-sticker__shadow" d="M12 17Q4 12 15 9L119 5q13-2 13 12l2 74q0 12-13 11l-105 3Q4 105 7 92z" transform="translate(2 3)" fill="#2a2c31" opacity=".24"/><path class="emotion-sticker__paper" d="M12 17Q4 12 15 9L119 5q13-2 13 12l2 74q0 12-13 11l-105 3Q4 105 7 92z" fill="#f8f5ee" stroke="#2a2c31" stroke-width="2.5"/></g><g stroke="#2a2c31" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${contents}</g>${sourceText}<text class="emotion-sticker__result" data-lines="${layout.lines.length}" x="${x}" y="${layout.y}" text-anchor="middle" aria-label="${escape(title)}" fill="${bad?'#a64435':'#3f5ba8'}" font-family="${STICKER_FONT}" font-weight="400" stroke="none" stroke-width="0" style="${style}" font-size="${layout.size}">${caption}</text></svg>`;
}
