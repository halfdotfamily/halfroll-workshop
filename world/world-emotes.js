import {characterPortrait} from '../game/characters.js';
import {EMOTE_CHOICES} from '../game/emote-catalog.js';
import {emoteIcon} from '../game/emote-icons.js';
export {emoteIcon} from '../game/emote-icons.js';
/** Only dispatches an intent. Online seats and cooldowns stay server-validated. */
function sectorMarkup(id,label,index,count){
 // The same annular outline paints and clips each real button: gaps and the
 // central portrait never send an emote, including on touch screens.
 const angle=-Math.PI/2+index*Math.PI*2/count,half=Math.PI/count;
 const point=(r,a)=>[50+r*Math.cos(a),50+r*Math.sin(a)];
 const points=[];for(let n=0;n<=24;n++)points.push(point(49.4,angle-half+n*half/12));
 for(let n=24;n>=0;n--)points.push(point(19,angle-half+n*half/12));
 const outline=points.map(p=>p.map(v=>v.toFixed(3)).join(',')).join(' '),position=point(35,angle);
 return `<button type="button" class="emote-wheel__choice" data-emote="${id}" aria-label="${label}" style="clip-path:polygon(${outline.split(' ').map(p=>p.split(',').join('% ')+'%').join(',')});--emote-x:${position[0]}%;--emote-y:${position[1]}%"><svg class="emote-wheel__sector" viewBox="0 0 100 100" aria-hidden="true"><polygon points="${outline}"/></svg><span class="emote-wheel__art">${emoteIcon(id)}<small>${label}</small></span></button>`;
}
// All coordinates use the fixed-overlay viewport. Obstacles come from the real
// header, weather/camera controls and HUD, including mobile toolbar resizing.
export function placeEmoteWheel(point,{left=0,top=0,width,height,headerBottom=top,hudTop=top+height,blocked=[],maxSize=256}={}){
 const minX=left+8,maxRight=left+width-8,minY=Math.max(top+8,headerBottom+8),maxBottom=Math.min(top+height-8,hudTop-8);
 const max=Math.floor(Math.min(maxSize,maxRight-minX,maxBottom-minY));
 if(max<144)return null;
 const sizes=[...new Set([max,...[256,240,224,216,200,192,184,176,168,160,152,144].filter(n=>n<max)])];
 const overlap=(a,b)=>a.x<b.x+b.width+8&&a.x+a.width+8>b.x&&a.y<b.y+b.height+8&&a.y+a.height+8>b.y;
 for(const size of sizes){
  const candidates=[],add=(x,y)=>{const box={x:Math.max(minX,Math.min(maxRight-size,x)),y:Math.max(minY,Math.min(maxBottom-size,y)),width:size,height:size};if(blocked.some(r=>overlap(box,r)))return;const dx=box.x+size/2-point.x,dy=box.y+size/2-point.y,d=Math.hypot(dx,dy),covers=d<size/2+8;candidates.push({...box,size,cost:d+Math.abs(dx)*.05+(covers?10000:0)});};
  add(point.x-size/2,point.y-size-12);add(point.x-size/2,point.y+12);add(point.x+12,point.y-size/2);add(point.x-size-12,point.y-size/2);
  for(const r of blocked){add(point.x-size/2,r.y+r.height+8);add(point.x-size/2,r.y-size-8);add(r.x+r.width+8,point.y-size/2);add(r.x-size-8,point.y-size/2);}
  if(candidates.length){candidates.sort((a,b)=>a.cost-b.cost);return candidates[0];}
 }
 return null;
}
export function mountWorldEmotes({onChoose=()=>{}}={}){
 const host=document.createElement('section');host.className='world-emotes emote-wheel';host.hidden=true;host.setAttribute('role','dialog');host.setAttribute('aria-label','Your Critter’s emotes');
 host.innerHTML=`<div class="emote-wheel__choices" role="group" aria-label="Choose an emote">${EMOTE_CHOICES.map(([id,label],i)=>sectorMarkup(id,label,i,EMOTE_CHOICES.length)).join('')}</div><button type="button" class="emote-wheel__center" aria-label="Close emotes"><span></span><small>Emotes</small></button><span class="emote-wheel__status" role="status" aria-live="polite"></span>`;
 document.body.append(host);const center=host.querySelector('.emote-wheel__center'),buttons=[...host.querySelectorAll('[data-emote]')],status=host.querySelector('.emote-wheel__status');
 let available=false,anchor=null,returnFocus=null,until=0,raf=0,lastSeconds=-1;const events=new AbortController();
 function close(restore=false){host.hidden=true;cancelAnimationFrame(raf);raf=0;const target=typeof returnFocus==='function'?returnFocus():returnFocus;if(restore&&target?.isConnected)target.focus({preventScroll:true});}
 function fit(){
  if(host.hidden)return;const point=typeof anchor==='function'?anchor():anchor;
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>innerWidth||point.y<0||point.y>innerHeight){close();return;}
  const visible=e=>{if(!e||e.hidden||!e.getClientRects().length)return null;const r=e.getBoundingClientRect();return r.width&&r.height?{x:r.left,y:r.top,width:r.width,height:r.height}:null;};
  const header=visible(document.querySelector('body>header')),hud=visible(document.getElementById('race-hud')),blocked=['#atmosphere-hud','#camera-controls'].map(s=>visible(document.querySelector(s))).filter(Boolean),v=window.visualViewport;
  if(point.avoid)blocked.push(point.avoid);
  const box=placeEmoteWheel(point,{left:v?.offsetLeft||0,top:v?.offsetTop||0,width:v?.width||innerWidth,height:v?.height||innerHeight,headerBottom:header?header.y+header.height:0,hudTop:hud?.y??innerHeight,blocked,maxSize:innerWidth<=600?224:256});
  if(!box){close();return;}host.style.setProperty('--wheel-size',box.size+'px');host.style.left=box.x+'px';host.style.top=box.y+'px';
  const seconds=Math.max(0,Math.ceil((until-Date.now())/1000));if(seconds!==lastSeconds){lastSeconds=seconds;status.textContent=seconds?`Ready in ${seconds}s`:'';center.querySelector('small').textContent=seconds?`${seconds}s`:'Emotes';host.dataset.cooling=String(seconds>0);buttons.forEach(b=>b.disabled=seconds>0);}
 }
 function tick(){fit();if(!host.hidden)raf=requestAnimationFrame(tick);}
 function open({anchor:next,characterId=6,returnFocus:focus}={}){
  if(!available)return false;anchor=next;returnFocus=focus||document.activeElement;center.querySelector('span').innerHTML=characterPortrait(characterId);host.hidden=false;lastSeconds=-1;fit();
  if(host.hidden)return false;cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);buttons.find(b=>!b.disabled)?.focus({preventScroll:true});return true;
 }
 host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b===center){close(true);return;}if(b.dataset.emote&&Date.now()>=until){until=Date.now()+6000;onChoose(b.dataset.emote);close(true);}},{signal:events.signal});
 function caption(e){const b=e.target.closest('[data-emote]');if(b&&Date.now()>=until)center.querySelector('small').textContent=b.getAttribute('aria-label');}
 host.addEventListener('pointerover',caption,{signal:events.signal});host.addEventListener('focusin',caption,{signal:events.signal});
 host.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return;}const index=buttons.indexOf(document.activeElement);if(index<0)return;let next=index;if(['ArrowRight','ArrowDown'].includes(e.key))next=(index+1)%buttons.length;else if(['ArrowLeft','ArrowUp'].includes(e.key))next=(index+buttons.length-1)%buttons.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=buttons.length-1;else return;e.preventDefault();buttons[next].focus({preventScroll:true});},{signal:events.signal});
 document.addEventListener('pointerdown',e=>{if(!host.contains(e.target))close();},{capture:true,signal:events.signal});window.addEventListener('blur',()=>close(),{signal:events.signal});window.addEventListener('resize',fit,{signal:events.signal});window.visualViewport?.addEventListener('resize',fit,{signal:events.signal});window.visualViewport?.addEventListener('scroll',fit,{signal:events.signal});
 for(const name of ['pointerdown','pointerup','dblclick'])host.addEventListener(name,e=>e.stopPropagation(),{signal:events.signal});
 return{open,close,update({visible,cooldownUntil}={}){available=!!visible;if(Number.isFinite(cooldownUntil))until=Math.max(until,cooldownUntil);if(!available)close();},debug:()=>({available,open:!host.hidden,cooldownMs:Math.max(0,until-Date.now()),choices:EMOTE_CHOICES.map(c=>c[0])}),destroy(){events.abort();close();host.remove();}};
}
