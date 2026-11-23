// A board-space badge, with a viewport-space card so it stays usable near an edge.
export function courierMarker(container) {
  const badge=document.createElement('button'), help=document.createElement('aside');
  badge.type='button'; badge.className='posty-badge'; badge.setAttribute('aria-label','POSTY · Courier info');
  badge.innerHTML='<svg aria-hidden="true" viewBox="0 0 38 38"><path d="m3 10 17-6 15 7v16l-16 8L3 27Z" fill="#292d39" stroke="#292d39" stroke-width="2" stroke-linejoin="round"/><path d="m4 9 16-5 14 6-15 7Z" fill="#ffdf97"/><path d="m4 11 14 7v13L4 25Z" fill="#edbd73"/><path d="m20 18 14-6v13l-14 7Z" fill="#dba758"/><path d="m11 6 4-1 14 7-4 2Z M25 15l4-2v7l-4 2Z" fill="#a4d5b9"/><circle cx="11" cy="22" r="4" fill="#ba5242"/><path d="m9 22 1.4 1.3 2.1-2.6" fill="none" stroke="#ffe6bb" stroke-linecap="round"/></svg><span hidden></span>';
  const bubble=badge.lastElementChild;
  help.id='posty-courier-info'; help.className='posty-help';help.hidden=true;
  help.setAttribute('role','dialog'); help.setAttribute('aria-label','About POSTY');
  help.innerHTML='<header><strong>Posty</strong><small class="posty-route"></small><button type="button" aria-label="Close courier info">×</button></header><p>Catch or pass Posty for <b>1 random Prank</b> and <b>up to 5 Coins</b>.</p><footer>Runs 6 tiles per round. Leaves at 67.</footer>';
  badge.setAttribute('aria-haspopup','dialog');badge.setAttribute('aria-controls',help.id);badge.setAttribute('aria-expanded','false');
  container.append(badge,help);const closeBtn=help.querySelector('button');
  const route=help.querySelector('.posty-route');
  let lastX=0,lastY=0;
  function close(focus=false){const wasOpen=!help.hidden;help.hidden=true;badge.setAttribute('aria-expanded','false');if(wasOpen&&focus&&!badge.hidden)badge.focus({preventScroll:true});}
  function position(x,y){
    lastX=x;lastY=y;badge.style.transform='translate3d('+x+'px,'+y+'px,0) translate(-50%,-100%)';
    if(help.hidden)return;
    const w=container.clientWidth,h=container.clientHeight,hw=help.offsetWidth,hh=help.offsetHeight;
    const floor=Math.min(h,(document.getElementById('race-hud')?.getBoundingClientRect().top||h)-container.getBoundingClientRect().top);
    help.style.left=Math.max(6,Math.min(x-hw/2,w-hw-6))+'px';
    help.style.top=Math.max(6,Math.min(y-48-hh>=6?y-48-hh:y+6,floor-hh-6))+'px';
  }
  badge.onclick=()=>{if(!help.hidden)return close(true);help.hidden=false;badge.setAttribute('aria-expanded','true');position(lastX,lastY);closeBtn.focus({preventScroll:true});};
  closeBtn.onclick=()=>close(true);
  function outside(e){if(!help.hidden&&!badge.contains(e.target)&&!help.contains(e.target))close();}
  function key(e){if(!help.hidden&&e.key==='Escape'){e.stopPropagation();close(true);}}
  document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',key,true);
  return {badge,close,position,track(tile){route.textContent='Tile '+tile+'  →  '+Math.min(67,tile+6);},say(word){bubble.hidden=!word;if(bubble.textContent!==word)bubble.textContent=word;},
    destroy(){document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',key,true);help.remove();badge.remove();}};
}
