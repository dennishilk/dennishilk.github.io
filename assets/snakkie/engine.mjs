// Curated retrieval, not generation. All response text comes from reviewed records.
import {createWeatherReader} from './weather.mjs?v=3';
export const KNOWLEDGE_FILES=['facts','personality','jokes','fallback-responses','platt-words','platt-phrases'];
export async function loadKnowledge(fetcher=fetch) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try {
  const responses=await Promise.all(KNOWLEDGE_FILES.map(async name=>{
    const r=await fetcher(new URL(`./knowledge/${name}.json`,import.meta.url),{signal:controller.signal});
    if(!r.ok)throw new Error('KNOWLEDGE_UNAVAILABLE');
    return [name,(await r.json()).entries];
  }));
  return Object.fromEntries(responses);
  }finally{clearTimeout(timer);controller.abort();}
}
export function normalize(text) {return String(text).toLowerCase().replaceAll('ß','ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ae/g,'a').replace(/oe/g,'o').replace(/ue/g,'u').replace(/[^a-z0-9]+/g,' ').trim();}
const stop=new Set(normalize('der die das den dem des ein eine einer einem einen eines ich du er sie es wir ihr mir mich dir dich dein deine meinen mein uns sich ist sind bist bin was wie wo wer wann why what how where who is are am do does did a an the to of for on about please bitte erkläre erklären erklär explain tell me help kannst kann could can you would gerne gern etwas einfache einfachen einfach simple simply worten words in mit von über aus und oder and or at etwas mal doch denn jetzt eigentlich snakkie liegt liegen located ligt erzahle').split(' '));
const aliases={east:'east',frisia:'eastfrisia',ostfriesisch:'ostfriesland',ostfriesischen:'ostfriesland',ostfriesischer:'ostfriesland',ostfriesische:'ostfriesland',ostfriesland:'ostfriesland',low:'low',german:'german',betriebssysteme:'betriebssystem',operating:'betriebssystem',system:'betriebssystem',systems:'betriebssystem',gegrundet:'geschichte',entstand:'geschichte',historie:'geschichte',heisst:'bedeutet',heisstes:'bedeutet',means:'bedeutet',mean:'bedeutet',meaning:'bedeutet',translate:'bedeutet',translation:'bedeutet',ubersetze:'bedeutet',ubersetzung:'bedeutet',witz:'joke',witze:'joke',ostfriesenwitz:'joke',ostfriesenwitze:'joke',jokes:'joke',gag:'joke',wetter:'weather',regnet:'rain',regen:'rain',windig:'wind',windy:'wind',raining:'rain',rainy:'rain',eastfrisian:'ostfriesland',warm:'temperature',temperatur:'temperature',plattdeutsch:'platt',lowgerman:'platt',kapitansmutze:'mutze',moin:'moin',hallo:'hello',hi:'hello',hey:'hello',tschuss:'bye',tschusschen:'bye',tschus:'bye',danke:'thanks',thank:'thanks'};
function tokens(s){s=normalize(s).replace(/east frisia/g,'eastfrisia').replace(/low german/g,'platt').replace(/operating system/g,'betriebssystem');return [...new Set(s.split(' ').filter(w=>w&&!stop.has(w)).map(w=>aliases[w]||w))];}
// One substitution, insertion, deletion or adjacent transposition, only for long terms.
export function oneTypo(a,b){if(a===b)return true;if(a.length<5||b.length<5||Math.abs(a.length-b.length)>1)return false;if(a.length===b.length){const diff=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])diff.push(i);return diff.length===1 || diff.length===2&&diff[1]===diff[0]+1&&a[diff[0]]===b[diff[1]]&&a[diff[1]]===b[diff[0]];}const [small,big]=a.length<b.length?[a,b]:[b,a];for(let i=0;i<big.length;i++)if(big.slice(0,i)+big.slice(i+1)===small)return true;return false;}
export function shouldSend(e){return e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229;}
class Rotation {
  constructor(random){this.random=random;this.bags=new Map();this.last=new Map();}
  pick(key,items){if(!items.length)return null;let bag=this.bags.get(key);if(!bag?.length){bag=[...items];for(let i=bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag.length>1&&bag.at(-1).id===this.last.get(key))[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]];this.bags.set(key,bag);}const item=bag.pop();this.last.set(key,item.id);return item;}
  reset(){this.bags.clear();this.last.clear();}
}
export function createCompanion(data,{random=Math.random,weather=createWeatherReader()}={}) {
  const records=[...(data.facts||[]),...(data.personality||[])];
  const words=(data['platt-words']||[]).map(w=>({id:'word-'+w.id,anchors:[[w.word]],queries:[`was bedeutet ${w.word}`,`what does ${w.word} mean`,`${w.word} auf deutsch englisch`,w.word],de:`${w.word}: ${w.de}. Englisch: ${w.en}.\nBeispiel: ${w.example} — ${w.exampleDe}\n${w.noteDe}`,en:`${w.word}: ${w.en}. German: ${w.de}.\nExample: ${w.example} — ${w.exampleEn}\n${w.noteEn}`,sources:[{label:w.sourceLabel,url:w.source}]}));
  const phrases=(data['platt-phrases']||[]).map(p=>({id:'phrase-'+p.id,anchors:[tokens(p.phrase)],queries:[p.phrase],de:`${p.phrase} — ${p.de}. Englisch: ${p.en}.\n${p.noteDe}`,en:`${p.phrase} — ${p.en}. German: ${p.de}.\n${p.noteEn}`,sources:[{label:p.sourceLabel,url:p.source}]}));
  const index=[...records,...words,...phrases].map(r=>({...r,queryTokens:r.queries.map(tokens),groups:r.anchors.map(group=>group.flatMap(tokens))}));
  const vocabulary=new Set([...index.flatMap(r=>r.queryTokens.flat()),...Object.keys(aliases).map(k=>aliases[k]),'joke','weather','temperature','rain','wind','wiesmoor','morgen','tomorrow','forecast','vorhersage']);
  const rotation=new Rotation(random);let lastIntent='';
  function correct(q){return q.map(w=>{if(vocabulary.has(w))return w;const near=[...vocabulary].filter(v=>oneTypo(w,v));return near.length===1?near[0]:w;});}
  function search(q,raw){
    const exact=index.filter(r=>r.queries.some(query=>normalize(query)===raw));
    if(exact.length===1)return exact[0];
    if(!q.length)return null;
    const ranked=index.map(r=>{
      if(!r.groups.every(group=>group.some(a=>q.includes(a))))return {...r,score:0};
      let score=0;
      for(const phrase of r.queryTokens){const shared=q.filter(w=>phrase.includes(w)).length;const precision=shared/Math.max(1,q.length),recall=shared/Math.max(1,phrase.length);if(precision>=0.78)score=Math.max(score,0.8*precision+0.2*recall);}
      return {...r,score};
    }).filter(r=>r.score>=0.86).sort((a,b)=>b.score-a.score||b.groups.length-a.groups.length||a.id.localeCompare(b.id));
    if(!ranked.length || ranked[1] && Math.abs(ranked[0].score-ranked[1].score)<0.035)return null;
    return ranked[0];
  }
  return {
    reset(){lastIntent='';rotation.reset();},
    async reply(input,language='de'){
      if(typeof input!=='string'||!input.trim())return null;
      if(input.length>800)return {kind:'limit',language,text:language==='de'?'Bitte kürze deine Nachricht auf höchstens 800 Zeichen.':'Please shorten your message to at most 800 characters.',sources:[]};
      const raw=normalize(input);
      if(/\b(auf englisch|in english|switch to english)\b/.test(raw))language='en';
      if(/\b(auf deutsch|in german|switch to german)\b/.test(raw))language='de';
      const query=raw.replace(/\b(?:bitte )?(?:antworte|sprich|answer|reply)(?: bitte)? (?:auf englisch|auf deutsch|in english|in german)\b/g,'').replace(/\b(?:auf englisch|auf deutsch|in english|in german)\b/g,'').trim();
      const q=correct(tokens(query));
      const t=(g,e)=>language==='de'?g:e;
      const response=(kind,text,extra={})=>{lastIntent=kind;return {kind,text,language,sources:[],...extra};};
      // Serious/urgent topics get a neutral boundary before humour, even if a joke is requested.
      if(/\b(notfall|emergency|suizid|suicide|selbstmord|umbringen|vergiftet|poisoned|brustschmerz|chest pain|atemnot|sterben|vergewaltigt|missbraucht|traurig|depressed|trauer|tot|stirbt|died|krebs|cancer|dringend|urgent|panik|gestorben|krank|schmerzen|arzt|hilfe hilfe)\b|suizidgedanken|selbstmordgedanken|panikattacke/.test(raw))return response('serious',t('Das klingt ernst. Ich bin ein kleines Wissensangebot und kann dir hier keine verlässliche persönliche Hilfe geben. Bitte wende dich an einen geeigneten Menschen oder Fachdienst; bei unmittelbarer Gefahr an den örtlichen Notruf. Hier mache ich keine Witze.','That sounds serious. I’m a small knowledge companion and cannot provide reliable personal help here. Please contact a suitable person or professional service; in immediate danger, contact local emergency services. No jokes here.'));
      if(q.includes('weather')||q.includes('rain')||q.includes('wind')||q.includes('temperature')){
        const allowed=new Set(['weather','rain','wind','temperature','wiesmoor','heute','today','gerade','now','bei','hier','there','like','morgen','tomorrow','forecast','vorhersage','wird','wirds','regnen','raining','rains','es','bei','dir','is','ist','heiss','warm','cold','kalt','viel','stark','windy','it','the','out','outside']);
        if(q.some(w=>!allowed.has(w)))return response('weather-scope',t('Mein Wetterbericht gilt nur für Wiesmoor. Für andere Orte oder andere Wetterfragen habe ich hier keine passende Datenquelle.','My weather report covers Wiesmoor only. I have no suitable source here for other places or weather questions.'));
        const kind=q.some(w=>['morgen','tomorrow','forecast','vorhersage'].includes(w))?'tomorrow':q.includes('rain')?'rain':q.includes('wind')?'wind':q.includes('temperature')?'temperature':'current';
        const answer=await weather({kind,language});return response('weather',answer.text,answer);
      }
      const follow=/^(noch (einen|ein|mehr)( bitte)?|another( one)?( please)?|one more( please)?)$/.test(raw);
      if((q.includes('joke')&&!/\b(kein|keinen|keine|dont|not|no)\b/.test(raw))||follow&&lastIntent==='joke'){
        const allowed=new Set(['joke','erzahl','erzahlst','erzahlen','tell','give','einen','noch','norddeutschen','ostfriesland','ostfriesen','kurzen','kurzer','short','funny','lustigen','northern','eastfrisia','bitte']);
        if(follow || q.every(w=>allowed.has(w))){const j=rotation.pick('jokes',data.jokes||[]);if(j)return response('joke',j[language],{id:j.id});}
      }
      if(/^(moin|hallo|hello|hi|hey)( snakkie)?$/.test(raw))return response('greeting',t('Moin! Schön, dass du da bist. Frag mich nach Wiesmoor, einem Platt-Wort oder einem Witz. Die Mütze sitzt, wir können loslegen.','Moin! Good to see you. Ask me about Wiesmoor, a Platt word or a joke. The hat fits; let’s get started.'));
      if(/^(tschuss|tschus|auf wiedersehen|bye|goodbye|bis bald|see you)( snakkie)?$/.test(raw))return response('bye',t('Bis bald! Ich halte hier die Mütze fest.','See you! I’ll stay here holding on to my hat.'));
      if(/^(danke|dankeschon|vielen dank|thanks|thank you|thank you very much)( snakkie)?$/.test(raw))return response('thanks',t('Gern. Dafür bin ich hier. Und für die Teepausen.','You’re welcome. That’s what I’m here for. And the tea breaks.'));
      const found=search(q,query);
      if(found)return response('knowledge',found[language],{id:found.id,sources:found.sources});
      const fallback=rotation.pick('unknown',data['fallback-responses']||[]);
      return response('unknown',fallback?.[language]||t('Dazu habe ich keinen passenden geprüften Eintrag.','I don’t have a matching checked entry for that.'));
    }
  };
}
