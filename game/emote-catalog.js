// Cosmetics only. Importable by both browser and server without Three or DOM.
export const EMOTE_CHOICES=Object.freeze([['hop','BOING'],['lol','LOL'],['yell','AAAH'],['taunt','STFU'],['wave','HEY'],['facepalm','BRUH'],['plane','YEET'],['bubble','POP'],['six-seven','67'],['hurry',"C’MON"]].map(c=>Object.freeze(c)));
export const EMOTE_IDS=Object.freeze(EMOTE_CHOICES.map(c=>c[0]));
export const EMOTE_TIMING=Object.freeze(Object.fromEntries(Object.entries({hop:[2.75,.12],lol:[3.2,.2],yell:[2.8,.32],taunt:[2.5,.4],wave:[1.9,.26],facepalm:[2.6,.65],plane:[2.8,.48],bubble:[2.9,.36],'six-seven':[2.6,.42],hurry:[4.2,.24]}).map(([id,[duration,cue]])=>[id,Object.freeze({duration,cue})])));
