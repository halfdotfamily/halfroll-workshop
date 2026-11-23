// One small sticker language: canonical Pebble, paper edge, flat ink and clear poses.
const ink='#2a2c31',paper='#f8f5ee',navy='#383f58',mint='#d3e6c4',blue='#3f5ba8',coral='#e9a08c',sun='#eedb94';
export function emoteIcon(kind){
 const body='M24 24Q21 28 19 37C7 56 20 62 35 62S61 54 52 39Q49 30 47 24Z';
 const eyes={yell:'<path d="m24 35 6-3m9 0 6 3"/>',hurry:'<path d="m24 32 7 3m8 0 7-3"/>',facepalm:'<path d="m24 35 6 1m9 0 6-1"/>',taunt:'<path d="m24 35 6 1m9 0 6-3"/>','six-seven':'<path d="m24 35 6-2m9 0 6 2"/>'}[kind]||'<path d="M25 35h4m11 0h4"/>';
 const mouth=kind==='yell'?`<ellipse cx="35" cy="46" rx="5" ry="8" fill="${ink}"/>`:kind==='hurry'?`<path d="M30 43h10v7H30z" fill="${paper}"/>`:kind==='bubble'?'<ellipse cx="37" cy="44" rx="3" ry="3"/>':kind==='facepalm'?'<path d="M31 48h9"/>':'<path d="M31 45h8"/>';
 const head=`<path d="${body}" fill="${navy}" stroke="${paper}" stroke-width="6"/><path d="${body}" fill="${navy}"/><g stroke="${paper}" stroke-width="2.5" fill="none">${eyes}${mouth}</g><path d="M23 42h4m16 0h4" stroke="${coral}" stroke-width="3"/><path d="m23 25 4-12q8-5 15 0l5 12z" fill="${mint}"/><path d="M20 25q15-7 31 0l-2 5q-14-4-28 0z" fill="${mint}"/>`;
 const hand=(x,y,rot=0)=>`<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M-6 7V-5q0-3 2-3t2 3v-7q0-3 2-3t2 3v7-6q0-3 2-3t2 3v7q4-5 6-2t-5 10q-3 5-8 3Z" fill="${mint}"/></g>`;
 const art={
  hop:`<ellipse cx="36" cy="66" rx="17" ry="2" fill="${blue}" stroke="none"/><g transform="translate(0 -8)">${head}<path d="m24 60-7 4m25-4 7 4M18 43l-9-6m43 6 10-6" fill="none"/></g><path d="m8 27 4-6 4 6m44 0 4-6 4 6" stroke="${blue}" fill="none"/>`,
  yell:`${head}<path d="m20 44-9-8m42 8 9-8M6 24l7 4m-10 9h9m48-9 7-4m-5 13h7" stroke="${coral}" fill="none"/>`,
  taunt:`${head}<path d="M26 66V52q0-3 4-3h1V34q0-4 4-4t4 4v15q4-3 7 1l4 1v10q-3 8-11 7Z" fill="${mint}"/><path d="m17 41-6-3m42 5 6-3" stroke="${blue}"/>`,
  wave:`${head}<path d="m23 48-9-7"/>${hand(13,35,-12)}<path d="M9 13Q0 20 4 28M5 10Q-3 15-2 24" fill="none" stroke="${blue}"/>`,
  lol:`${head}<path d="m23 31 6-4-6-4m22 0-6 4 6 4" fill="${mint}" stroke-width="3"/><path d="M26 40q9 15 18 0Z" fill="${ink}"/><path d="M19 32q-10 8-7 13 8 3 7-13Zm31 0q10 8 7 13-8 3-7-13Z" fill="#87c6de" stroke="${blue}"/><path d="m9 15-3-6m51 6 5-5" stroke="${blue}"/>`,
  facepalm:`${head}<path d="m24 48-6-17q-1-4 2-4t5 7V19q0-3 3-3t3 3v12l2-15q0-3 3-3t3 3v17l4-8q2-3 5-1t0 7l-6 18Z" fill="${mint}"/><path d="M7 47h6m43 0h7" stroke="${blue}"/>`,
  plane:`<g transform="translate(-5 6) scale(.8)">${head}</g><path d="m28 30 39-16-12 35-10-12-9 9 3-13z" fill="${paper}"/><path d="m39 33 28-19-22 23M8 58q-6 12 8 10t12-9" fill="none" stroke="${blue}"/>`,
  bubble:`${head}<circle cx="53" cy="23" r="15" fill="#c3ddd5" fill-opacity=".85"/><path d="M43 22q1-8 10-9" stroke="${paper}" stroke-width="3" fill="none"/><circle cx="10" cy="48" r="6" fill="${mint}"/><path d="m41 44 4-7"/>`,
  'six-seven':`<g transform="translate(8 1) scale(.8)">${head}</g><path d="m6 51 7-4 9 5 7-2 1 7-12 6-12-5zm36-1 7 2 9-5 7 4v7l-12 5-12-6z" fill="${mint}"/><text x="7" y="24" fill="${blue}" stroke="none" font-family="monospace" font-size="17" font-weight="bold">6</text><text x="57" y="24" fill="${blue}" stroke="none" font-family="monospace" font-size="17" font-weight="bold">7</text>`,
  hurry:`<g transform="translate(-7 0) scale(.92 1)">${head}</g><path d="M56 10q3-2 4 1l-2 49h-5z" fill="#b88a56"/><path d="m43 43 10-6 7 3-2 6-5-1-7 4" fill="${mint}"/><path d="M46 64h18m-21-7 4 3m17-4-3 4" stroke="${blue}" fill="none"/><path d="m59 64 6-1m-13 4-4 1" stroke="${coral}"/>`,
 };
 return `<svg class="emote-sticker-icon" data-emote-icon="${kind}" viewBox="-4 -3 80 78" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${art[kind]||''}</g></svg>`;
}
