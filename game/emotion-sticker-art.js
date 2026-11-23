import {characterSvg} from './characters.js';
import {eventStickerFrame} from './event-sticker-art.js';
import {CARD_TIMELINES} from './card-effects/motion-v3.js';

const clamp=n=>Math.max(0,Math.min(1,n)),span=(n,a,b)=>clamp((n-a)/Math.max(1,b-a));
const coin='<g fill="#eedb94"><ellipse cx="86" cy="37" rx="7" ry="9" transform="rotate(-17 86 37)"/><ellipse cx="109" cy="49" rx="7" ry="9" transform="rotate(18 109 49)"/><ellipse cx="96" cy="70" rx="7" ry="9"/></g><path d="m85 33 2 8m22 4v8m-13 13v8"/>';
const centeredCoins=`<g transform="translate(-24 0)">${coin}</g>`;
const cards='<g fill="#f8f5ee"><rect x="24" y="35" width="30" height="42" rx="4" transform="rotate(-15 39 56)"/><rect x="87" y="30" width="29" height="41" rx="4" transform="rotate(15 101 51)"/></g><path d="m39 44 7 10-7 10-7-10z" fill="#3f5ba8"/><path d="m100 39 7 10-7 10-7-10z" fill="#a9d7be"/>';
const chest='<rect x="42" y="48" width="56" height="31" rx="4" fill="#d7cbb4"/><path d="M42 48V37Q70 20 98 37v11Z" fill="#3f5ba8"/><path d="M52 32v47m35-47v47" stroke="#eedb94" stroke-width="5"/><rect x="65" y="44" width="10" height="14" rx="2" fill="#eedb94"/>';
const burst='<path d="m71 27 9 14 17-5-4 17 18 7-18 10 3 16-17-6-10 12-8-16-18 3 4-18-13-8 17-6-1-16 15 7z" fill="#eedb94"/><path d="m107 29 5-7m-79 8-7-4m83 48 8 4"/>';
const rocket='<path d="m45 63 14-15 18 17-16 12Z" fill="#3f5ba8"/><path d="m55 55 27-24q13-8 24-7-1 12-9 23L72 70Z" fill="#f8f5ee"/><path d="m83 31 14 16q8-12 9-23-11-1-23 7Z" fill="#3f5ba8"/><circle cx="81" cy="49" r="6" fill="#a9d7be"/><path d="m54 64-16 8 6-15-11 19 20-2" fill="#e98e7c"/>';
const plane='<path d="m24 30 27-3 10-15 12 1-5 16 28 3 13 6-12 7-29-1 4 14-12 1-12-16-25-1Z" fill="#a9d7be"/><path d="m44 29 28 3-10 11-23-2Z" fill="#3f5ba8"/><circle cx="94" cy="30" r="4" fill="#f8f5ee"/><circle cx="95" cy="30" r="1"/><path d="M96 40h17m-12-7v14"/>';
const bomb='<path d="m65 49-6-8 10 3 8-3-4 9" fill="#e98e7c"/><ellipse cx="69" cy="60" rx="7" ry="11" fill="#303b59"/>';
const hitConfirmation='<g data-hit-confirmation><circle cx="70" cy="48" r="22" fill="#d3e6c4"/><path d="m59 48 8 9 18-21" stroke="#3f5ba8" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>';
const moonRocket='<g transform="rotate(-14 77 59)"><path d="m54 63-8 14 20-8 15 1" fill="#3f5ba8"/><path d="M51 47h39q14 1 22 12-10 10-24 10H51Z" fill="#f8f5ee"/><path d="M91 48q13 2 21 11-10 10-24 10Z" fill="#3f5ba8"/><circle cx="83" cy="58" r="5" fill="#a9d7be"/><path d="m48 52-19 5 11 4-10 6 18-3Z" fill="#e98e7c"/></g>';
const fullVolume=Object.freeze({x:.13,y:.17,width:.74,height:.57});
const rightVolume=Object.freeze({x:.51,y:.18,width:.36,height:.55});
const composition=(actors,hero,volume=fullVolume,secondary=[91,23,32])=>Object.freeze({actors,hero:Object.freeze(hero),secondary:Object.freeze(secondary),volume});
const single=composition('single',[23,20,39],rightVolume),subject=composition('none',[46,10,48]);
const compositions=Object.freeze({
 bonk:single,hook:composition('pair',[18,23,32],fullVolume,[86,23,31]),swap:composition('pair',[18,23,32],Object.freeze({x:.40,y:.19,width:.22,height:.42})),pump:single,
 'to-the-moon':composition('rider',[51,17,34]),'pocket-rocket':subject,
 gigachad:subject,'rug-pull':composition('single',[43,18,39],Object.freeze({x:.14,y:.54,width:.72,height:.20})),
 reverse:subject,gamba:composition('single',[25,16,41],rightVolume),
 'trade-offer':composition('pair',[18,23,32],Object.freeze({x:.39,y:.38,width:.25,height:.34})),
 stonks:single,'free-mint':subject,wormhole:composition('single',[35,20,31]),jackpot:subject,
 'not-stonks':single,mimic:subject,'paper-hands':subject,rekt:subject,bombardiro:subject,
 airdrop:subject,draw:subject,well:single,
});

/** Shared SVG/3D staging: one subject, separated actor/object, or an intentional interaction. */
const rugReceipt=item=>item?.storyKind==='rug-pull'&&/^\+[1-9]\d*\s+Coins?\b/.test(item.detail||'');
export function emotionStickerComposition(kindOrItem){
 const kind=typeof kindOrItem==='string'?kindOrItem:kindOrItem?.storyKind;
 if(rugReceipt(kindOrItem))return single;
 return compositions[kind]||subject;
}
const props={
 bonk:'<g transform="rotate(-25 93 43)"><rect x="90" y="39" width="6" height="37" rx="2" fill="#d7cbb4"/><rect x="74" y="24" width="38" height="21" rx="5" fill="#e98e7c"/><path d="M80 27v15m25-15v15"/></g>',
 hook:'<path d="M29 61Q57 72 103 49" fill="none" stroke="#e98e7c"/><path d="m91 44 19-11-9 22Z" fill="#f8f5ee"/><path d="m97 43 7 5m-12 0 8 3" stroke="#e98e7c"/><rect x="19" y="52" width="26" height="15" rx="4" fill="#3f5ba8"/><path d="m28 66-3 12h8l6-12" fill="#d7cbb4"/>',
 swap:'<path d="M56 39h29l-7-6m6 28H55l7 6" fill="none" stroke="#3f5ba8" stroke-width="3"/>',
 pump:'<path d="M103 21v55"/><rect x="91" y="35" width="23" height="34" rx="2" fill="#319d78"/><path d="m103 17-12 12h24Z" fill="#a9d7be"/>',
 'to-the-moon':moonRocket,'pocket-rocket':rocket,
 gigachad:'<path d="M70 24q16 8 27 7v20q-3 19-27 28-24-9-27-28V31q11 1 27-7Z" fill="#a9d7be"/><path d="M52 49q18-19 36 0-18 19-36 0Z" fill="#f8f5ee"/><circle cx="70" cy="49" r="7" fill="#3f5ba8"/>',
 'rug-pull':'<path d="m22 72 80-11 14 15-79 9Z" fill="#e98e7c"/><ellipse cx="110" cy="71" rx="8" ry="9" fill="#d7cbb4"/><path d="m39 82-3 6m12-8-2 6m12-8-1 6"/>',
 reverse:'<g transform="rotate(10 70 49)"><rect x="50" y="22" width="40" height="55" rx="5" fill="#e98e7c"/><path d="m58 44 21-14-2 9-16 11m20 7-21 14 2-9 16-11" fill="#f8f5ee"/></g>',
 gamba:'<rect x="78" y="27" width="40" height="47" rx="5" fill="#3f5ba8"/><rect x="82" y="38" width="32" height="21" rx="3" fill="#f8f5ee"/><path d="M118 49h8V31" fill="none"/><circle cx="126" cy="28" r="4" fill="#e98e7c"/><path d="M86 66h25" stroke="#eedb94"/>',
 'trade-offer':'<rect x="54" y="43" width="30" height="36" rx="4" fill="#f8f5ee"/><path d="m69 51 7 9-7 9-7-9Z" fill="#3f5ba8"/>',stonks:coin,'free-mint':cards,wormhole:'<ellipse cx="28" cy="57" rx="12" ry="22" fill="#3f5ba8"/><ellipse cx="28" cy="57" rx="7" ry="15" fill="#b9c6e6"/><ellipse cx="111" cy="57" rx="12" ry="22" fill="#a9d7be"/><ellipse cx="111" cy="57" rx="7" ry="15" fill="#f8f5ee"/>',
 jackpot:'<g transform="translate(-26 0) scale(1.1)"><path d="m86 50 3-15 9-4 8 3 8 10 4 15-11 13-18-6-8-12Z" fill="#a9d7be"/><path d="m89 35 9 14 8-15m-20 16 12-1 16-5m-16 5 9 23m-9-23-9 17" fill="none"/></g>',
 'not-stonks':coin,mimic:chest,'paper-hands':cards,rekt:'<path d="M44 29h55l-12 15H67v14H53V45l-16-6Z" fill="#303b59"/><path d="M56 58h28v10H56Z" fill="#3f5ba8"/>',bombardiro:plane,
 airdrop:'<path d="M43 42q3-27 27-27t27 27Z" fill="#a9d7be"/><path d="M43 42 61 66m36-24L80 66M70 17v25m-27 0q13-8 27 0 14-8 27 0" fill="none"/><rect x="58" y="64" width="25" height="18" rx="3" fill="#d7cbb4"/><path d="M67 65v16m8-16v16" stroke="#3f5ba8"/>',draw:cards,well:coin,
};
function hero(id,x=46,y=10,width=48){const svg=characterSvg(id).replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'');return`<g data-critter="${id}" transform="translate(${x} ${y})"><svg style="width:${width}px;height:${width*65/48}px" width="${width}" height="${width*65/48}" viewBox="0 0 100 120">${svg}</svg></g>`;}

export function emotionStickerArt(item,characterId=6,otherId=0){
 const kind=item.storyKind,layout=emotionStickerComposition(item),paired=layout.actors==='pair';
 const own=hero(characterId,...layout.hero),second=paired?hero(otherId,...layout.secondary):'';
 const coins=layout.actors==='single'?coin:centeredCoins,mainProp=rugReceipt(item)?'<g data-resource-receipt>'+coin+'</g>':props[kind]||centeredCoins;
 const extra=kind==='bombardiro'?'<g data-bomb-drop>'+bomb+'</g><g data-bomb-blast>'+burst+'</g>':kind==='pocket-rocket'?(item.role==='source'?hitConfirmation:'<g data-nuke-impact>'+burst+'</g>'):kind==='mimic'?'<path d="M45 53h49v8H45Z" fill="#2a2c31"/><path d="m49 53 4 7 4-7m13 0 4 7 4-7m8 0 4 7 4-7" fill="#f8f5ee"/>':kind==='gamba'?'<g data-reel="0"><circle cx="88" cy="48" r="4" fill="#eedb94"/></g><g data-reel="1"><circle cx="98" cy="48" r="4" fill="#a9d7be"/></g><g data-reel="2"><circle cx="108" cy="48" r="4" fill="#e98e7c"/></g>':coins;
 const contents=`<defs><clipPath id="emotion-interior-${characterId}-${kind}-${item.role}"><rect x="16" y="17" width="111" height="67" rx="2"/></clipPath></defs><g class="emotion-sticker__scene" data-composition="${layout.actors}" clip-path="url(#emotion-interior-${characterId}-${kind}-${item.role})"><g data-layer="hero"${layout.actors==='none'?' style="display:none"':''}>${own}</g><g data-layer="secondary">${second}</g><g data-layer="prop">${mainProp}</g><g data-layer="extra">${extra}</g><g data-layer="accent"><path d="m68 24 3 5 6 1-5 4 1 6-5-4-5 4 1-6-5-4 6-1Z" fill="#eedb94"/></g><g data-layer="intro">${chest}</g></g>`;
 return eventStickerFrame(contents,item.title||'LET’S ROLL!',{bad:item.tone==='bad'});
}

/** Drawn motion stays inside the same cream/ink frame as the on-map emotes. */
export function emotionStickerMotion(item,age,pose,{durationMs,reduced=false}={}){
 const t=CARD_TIMELINES[item.timelineKind]||CARD_TIMELINES[item.storyKind]||CARD_TIMELINES.draw,ms=reduced?t.durationMs:Math.max(0,age*1000)*t.durationMs/(durationMs||t.durationMs),hit=t.impactMs??t.catchMs,p=span(ms,hit,t.arriveMs),a=span(ms,t.releaseMs,hit),w=Math.sin(p*Math.PI),kind=item.storyKind;
 const transform=(x=0,y=0,r=0,sx=1,sy=sx)=>({x,y,r,sx,sy,visible:true}),hero=transform(0,pose.after?-3*w:0,item.tone==='bad'?-7*w:3*w),prop=transform(),extra=transform(),secondary=transform(),accent=transform(0,-2*w,8*w),intro=transform(0,0,pose.intro&&!reduced?Math.sin(ms*.045)*2:0);
 const layout=emotionStickerComposition(item);
 extra.visible=false;accent.visible=false;intro.visible=pose.intro;hero.visible=!pose.intro&&layout.actors!=='none';secondary.visible=!pose.intro&&layout.actors==='pair';prop.visible=!pose.intro;
 switch(kind){
  case 'bonk':prop.r=-22+45*a-10*p;hero.r=pose.after?-9*w:0;hero.sy=1-.12*w;accent.visible=pose.after&&p<.7;break;
  case 'hook':prop.sx=.45+.55*a;secondary.x=pose.after?-10*p:0;secondary.r=6*w;break;
  case 'swap':{const size=Math.max(.22,Math.abs(p-.5)*2);hero.x=73*p+(1-size)*(-36);secondary.x=-73*p+(1-size)*37;hero.sx=hero.sy=secondary.sx=secondary.sy=size;prop.y=-2*w;break;}
  case 'pump':prop.sy=.5+.5*a;hero.y=-4*w;break;
  case 'to-the-moon':hero.x=prop.x=4*p;hero.y=prop.y=-4*p;hero.r=prop.r=-3*w;break;
  case 'pocket-rocket':prop.x=-8+12*a;prop.y=4-6*a;prop.visible=!pose.after;extra.visible=pose.after;extra.sx=extra.sy=item.role==='source'?1:.85+.15*w;break;
  case 'gigachad':prop.sx=.5+.5*a;prop.r=-12*(1-a);break;
  case 'rug-pull':if(rugReceipt(item)){prop.y=-4*w;hero.y=-2*w;hero.r=0;}else{prop.x=-10*p;hero.y=3*w;hero.r=-10*w;}break;
  case 'reverse':prop.sx=pose.after?1:Math.max(.2,Math.abs(Math.cos(a*Math.PI)));prop.r=-8*Math.sin(a*Math.PI);break;
  case 'gamba':extra.visible=true;hero.r=!pose.after?2*Math.sin(ms*.015):0;prop.r=pose.after&&item.amount<0?-3*w:0;break;
  case 'trade-offer':prop.x=6*Math.sin(p*Math.PI*2);secondary.y=-2*w;break;
  case 'stonks':case 'jackpot':case 'well':prop.y=(item.coins<0?7:-7)*w;break;
  case 'free-mint':case 'draw':prop.y=-7*w;prop.r=8*w;break;
  case 'wormhole':hero.x=-7+51*p;hero.sx=hero.sy=Math.max(.18,Math.abs(p-.5)*2);break;
  case 'not-stonks':prop.y=9*p;hero.r=-8*w;break;
  case 'mimic':prop.y=-3*w;extra.visible=pose.after;extra.y=-3*w;break;
  case 'paper-hands':prop.x=6*p;prop.r=-7*w;break;
  case 'rekt':prop.y=-8+14*a;break;
  case 'bombardiro':prop.visible=item.pandoraOpener&&!pose.after;prop.x=-7+14*span(ms,t.releaseMs,t.impactMs);prop.y=-2;extra.visible=pose.after||item.pandoraOpener&&ms>=t.dropMs&&ms<hit;extra.y=pose.after?0:-18+25*span(ms,t.dropMs,hit);break;
  case 'airdrop':prop.y=-4+6*a;prop.visible=!pose.after;extra.visible=pose.after;extra.y=-4*w;break;
 }
 if(pose.resourceCoins){prop.visible=false;extra.visible=true;extra.y=item.coins<0?7*w:-7*w;}
 // A closed Pandora never leaks a face, teeth, coins or the eventual outcome.
 if(pose.intro)for(const layer of [hero,secondary,prop,extra,accent])layer.visible=false;
 if(reduced)for(const layer of [hero,prop,extra,secondary,accent,intro])Object.assign(layer,{x:0,y:0,r:0,sx:1,sy:1});
 for(const layer of [hero,prop,extra,secondary,accent,intro])layer.visible=!!layer.visible;
 return{hero,prop,extra,secondary,accent,intro,reels:reduced?[0,0,0]:[0,1,2].map(i=>ms<hit-200+i*100?Math.sin(ms*(.035+i*.004))*5:0)};
}

export function emotionStickerCaption(item,pose,fallback){
 if(pose.intro)return'PANDORA BOX';
 if(!pose.after)return fallback;
 if(item.role==='source')return item.title==='BLOCKED'?'BLOCKED!':`HIT! ${item.detail||''}`.trim();
 if(/[+−-]\d+\s+Coins?\b/.test(item.detail||''))return item.detail.toUpperCase().replace(/\bCOIN\b/g,'COINS');
 if(/^[+−-]\d+$/.test(item.detail||''))return item.storyKind==='gamba'?`GAMBA! ${item.detail}`:`${item.detail} TILES`;
 return(item.detail||item.title||fallback).toUpperCase();
}
