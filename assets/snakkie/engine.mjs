// Curated retrieval, not generation. All response text comes from reviewed records.
import {createWeatherReader} from './weather.mjs?v=3';
import {SMALL_TALK, TOPICAL_SMALL_TALK} from './small-talk.mjs?v=8';
import {clarification,followUpKind} from './conversation.mjs';
import {asksAboutPrivateLife,privateLifeReply} from './private-questions.mjs?v=1';
export const KNOWLEDGE_FILES=['facts','personality','jokes','fallback-responses','platt-words','platt-phrases','utterances'];
export async function loadKnowledge(fetcher=fetch) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try {
  const responses=await Promise.all(KNOWLEDGE_FILES.map(async name=>{
    const r=await fetcher(new URL(`./knowledge/${name}.json${name==='facts'?'?v=11':name==='utterances'?'?v=7':name==='personality'?'?v=3':''}`,import.meta.url),{signal:controller.signal});
    if (name === 'utterances' && !r.ok) return [name, {}];
    if(!r.ok)throw new Error('KNOWLEDGE_UNAVAILABLE');
    return [name,(await r.json()).entries];
  }));
  return Object.fromEntries(responses);
  }finally{clearTimeout(timer);controller.abort();}
}
export function normalize(text) {return String(text).toLowerCase().replaceAll('ß','ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ae/g,'a').replace(/oe/g,'o').replace(/ue/g,'u').replace(/[^a-z0-9]+/g,' ').trim();}
const smallTalk = new Map(SMALL_TALK.map(([id, phrases, replies]) => [id, {phrases, replies}]));
const contextEcho = new Set(['mir auch','bei mir auch','mir gehts auch','mir geht s auch','jo auch','jo auch gut','me too','same here','same','likewise','i am too','i m too']);
const rephrasePhrases = new Set(['kurz bitte','fass dich kurz','kurz und knapp','keep it short','short answer please','be brief']);
const repeatPhrases = new Set(['wiederhol das','wiederhole das','kannst du das wiederholen','sag das nochmal','sag das noch mal','was hast du gerade gesagt','repeat that','can you repeat that','say that again','what did you just say']);
const clockKinds = new Map([['clock-time','time'],['clock-date','date'],['clock-both','both']]);
const clockPhrases = new Map(Object.entries({
  'wie spät ist es':'time', 'wie viel uhr ist es':'time', 'wieviel uhr ist es':'time',
  'weißt du wie spät es ist':'time', 'weißt du wie viel uhr es ist':'time',
  'weisst du wieviel uhr es ist':'time', 'weißt du wie spät es gerade ist':'time',
  'kannst du mir sagen wie spät es ist':'time', 'sag mir bitte wie spät es ist':'time',
  'kannst du mir die uhrzeit sagen':'time', 'sag mir die uhrzeit':'time',
  'wie spät ist es in wiesmoor':'time', 'uhrzeit in wiesmoor':'time',
  'wie spät ist es bei dir':'time', 'was ist die uhrzeit in wiesmoor':'time',
  'welches datum haben wir heute':'date', 'datum und uhrzeit':'both',
  'what time is it':'time', 'what time is it now':'time',
  'do you know what time it is':'time', 'can you tell me what time it is':'time',
  'could you tell me the time':'time', 'can you tell me the time':'time',
  'tell me the time please':'time',
  'what time is it in wiesmoor':'time', 'what is the time in wiesmoor':'time',
  'what time is it where you are':'time', 'date and time':'both', 'today s date':'date'
}).map(([text, kind]) => [normalize(text),kind]));

const relativeDays = new Map([
  ['vorgestern',-2],['the day before yesterday',-2],
  ['gestern',-1],['yesterday',-1],
  ['heute',0],['today',0],
  ['morgen',1],['tomorrow',1],
  ['ubermorgen',2],['the day after tomorrow',2]
]);
const dayPhrase = [...relativeDays.keys()].join('|');
const dateQuestions = [
  new RegExp(`^(?:welcher (?:tag|wochentag) (?:ist|war)|welches datum (?:ist|war|haben wir)|was fur ein (?:tag|wochentag) (?:ist|war)) (${dayPhrase})(?: gewesen)?$`),
  new RegExp(`^was (?:ist|war) (${dayPhrase}) fur ein (?:tag|wochentag)$`),
  new RegExp(`^what (?:day|date) (?:is|was|will) (?:it (?:be )?)?(${dayPhrase})$`),
  new RegExp(`^what(?: is| s) (?:the (?:date|day) (${dayPhrase})|(${dayPhrase}) s date)$`),
  new RegExp(`^what (?:will the date be|day it will be|day will it be) (${dayPhrase})$`)
];
const dateFollowUp = new RegExp(`^(?:und |and |what about |wie sieht es mit )?(${dayPhrase})(?: aus)?$`);
const plainDateQuestion = /^(?:welcher (?:tag|wochentag) ist es|welchen (?:tag|wochentag) haben wir(?: heute)?|welches datum haben wir|what (?:day|date) is it|what(?: is| s) the date)$/;

function relativeDateOffset(query, followsDate) {
  const question = query.replace(/^(?:guten morgen|good morning|guten abend|good evening) /,'')
    .replace(/^(?:weisst du|kannst du mir sagen|do you know|can you tell me) /,'')
    .replace(/ in wiesmoor$/,'');
  if (plainDateQuestion.test(question)) return 0;
  for (const pattern of dateQuestions) {
    const match = pattern.exec(question);
    if (match) return relativeDays.get(match[1] ?? match[2]);
  }
  if (followsDate) return relativeDays.get(dateFollowUp.exec(question)?.[1]);
}

// Use UTC to represent a Berlin calendar day, so offsets cross DST safely.
function wiesmoorCalendarDay(now) {
  const parts = new Intl.DateTimeFormat('en-GB',{
    timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(now);
  const {year,month,day} = Object.fromEntries(parts.map(({type,value})=>[type,Number(value)]));
  return new Date(Date.UTC(year,month-1,day));
}

const eventSources = [
  {label:'Stadt Wiesmoor · Veranstaltungen',url:'https://www.wiesmoor.de/Veranstaltungen'},
  {label:'Wiesmoor Touristik · Veranstaltungssuche',url:'https://www.tourismus-wiesmoor.de/veranstaltungen-1'}
];
const eventPeriod = /\b(?:heute|morgen|samstag|sonntag|wochenende|today|tonight|tomorrow|saturday|sunday|weekend)\b/;
const eventTopic = /\b(?:veranstaltungen|events|termine|konzerte|markte)\b/;
const attractionTopic = /\b(?:sehenswurdigkeiten|ausflugsziele|attraktionen|attractions|sights|places to visit)\b/;
const activityQuestion = /\b(?:unternehmen|things to do|what can (?:i|we|you|one) do)\b/;
const outingQuestion = /^(?:was (?:ist|geht|passiert|gibt es|kann)|welche|was fur|gibt es|veranstaltungen|termine|konzerte|markte|sehenswurdigkeiten|ausflugsziele|attraktionen|what|any|are there|events|things to do|attractions|sights|places to visit)\b/;
const eventFollowUpPrefix = /^(?:ja |yes )?(?:sag mir (?:bitte )?|(?:please )?tell me )?(?:was (?:ist |geht )?|und |what (?:about|is on|s on) |and )?/;
const eventFollowUp = /^(?:am |on )?(?:heute(?: abend)?|morgen(?: am (?:samstag|sonntag))?|samstag|sonntag|(?:dieses )?wochenende|today|tonight|tomorrow(?: (?:on )?(?:saturday|sunday))?|saturday|sunday|(?:this )?weekend)(?: (?:bitte|please|los|ist|stattfindet))?$/;
const outingTerms = new Set(
  ('in wiesmoor events veranstaltungen termine konzerte markte los heute morgen abend am samstag sonntag dieses kommenden wochenende was ist geht passiert gibt es welche fur finden statt sind what s is on happening going are there things to do for today tonight tomorrow saturday sunday weekend this coming the ' +
   'sehenswurdigkeiten ausflugsziele attraktionen attractions sights places visit see and or und oder auch any vielleicht tips tipps bitte please kann man ich wir unternehmen sehen besuchen anschauen can i we you one some').split(' ')
);

function wiesmoorOuting(query, followsEvents) {
  if (followsEvents && eventFollowUp.test(query.replace(eventFollowUpPrefix,''))) return 'events';
  if (!/\bwiesmoor\b/.test(query)) return null;
  if (/^(?:veranstaltungskalender (?:fur |in )?wiesmoor|wiesmoor veranstaltungskalender|wiesmoor events calendar|event calendar (?:for |in )?wiesmoor)$/.test(query)) return 'events';
  if (!outingQuestion.test(query.replace(/^wiesmoor /,'')) || !query.split(' ').every(word=>outingTerms.has(word))) return null;

  const dated = eventPeriod.test(query);
  const events = eventTopic.test(query);
  const attractions = attractionTopic.test(query);
  if ((events && attractions) || (dated && activityQuestion.test(query))) return 'both';
  if (attractions) return 'attractions';
  if (events || dated || /\blos\b/.test(query)) return 'events';
  return null;
}

function eventCalendarSources(query, now) {
  if (!eventPeriod.test(query)) return eventSources;
  const day = wiesmoorCalendarDay(now);
  const weekday = day.getUTCDay();
  let start = 0;
  let end = 0;
  if (/\b(?:morgen|tomorrow)\b/.test(query)) start = end = 1;
  else if (/\b(?:samstag|saturday)\b/.test(query)) start = end = (6 - weekday + 7) % 7;
  else if (/\b(?:sonntag|sunday)\b/.test(query)) start = end = (7 - weekday) % 7;
  else if (/\b(?:wochenende|weekend)\b/.test(query)) {
    start = weekday === 0 ? 0 : 6 - weekday;
    end = weekday === 0 ? 0 : start + 1;
  }
  const date = offset => new Date(day.getTime() + offset * 86_400_000).toISOString().slice(0,10);
  const url = new URL(eventSources[1].url);
  url.search = new URLSearchParams({start:date(start),end:date(end)});
  return [eventSources[0],{...eventSources[1],url:url.href}];
}
const weatherKinds = new Map([['weather-current','current'],['weather-rain','rain'],['weather-tomorrow','tomorrow']]);
const greetingPrefix = /^(?:moin|hallo|hi|hello|hey)(?: snakkie)? /;
const languageRequest = /(?:^|[.!?,;:]\s*|\s+(?=(?:bitte|please)\s))(?:bitte\s+|please\s+)?(?:antworte|sprich|answer|reply|switch)(?:\s+(?:bitte|please))?\s+(?:auf|in|to)\s+(englisch|deutsch|english|german)\b\s*[.!?,;:]*/giu;

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
export function createCompanion(data,{random=Math.random,weather=createWeatherReader(),now=Date.now}={}) {
  const records=[...(data.facts||[]),...(data.personality||[])];
  const wiesmoorAttractions = records.find(record=>record.id==='wiesmoor-attractions');
  const words=(data['platt-words']||[]).map(w=>({id:'word-'+w.id,anchors:[[w.word]],queries:[`was bedeutet ${w.word}`,`what does ${w.word} mean`,`${w.word} auf deutsch englisch`,w.word],de:`${w.word}: ${w.de}. Englisch: ${w.en}.\nBeispiel: ${w.example} — ${w.exampleDe}\n${w.noteDe}`,en:`${w.word}: ${w.en}. German: ${w.de}.\nExample: ${w.example} — ${w.exampleEn}\n${w.noteEn}`,sources:[{label:w.sourceLabel,url:w.source}]}));
  const phrases=(data['platt-phrases']||[]).map(p=>({id:'phrase-'+p.id,anchors:[tokens(p.phrase)],queries:[p.phrase],de:`${p.phrase} — ${p.de}. Englisch: ${p.en}.\n${p.noteDe}`,en:`${p.phrase} — ${p.en}. German: ${p.de}.\n${p.noteEn}`,sources:[{label:p.sourceLabel,url:p.source}]}));
  const index=[...records,...words,...phrases].map(record => record.exactOnly ? record : {
    ...record, queryTokens:record.queries.map(tokens), groups:record.anchors.map(group=>group.flatMap(tokens))
  });
  const exactIndex = new Map();
  for (const record of index) {
    for (const alias of record.queries.map(normalize)) {
      const previous = exactIndex.get(alias);
      exactIndex.set(alias, previous === undefined || previous === record ? record : null);
    }
  }
  const fuzzyIndex=index.filter(record=>!record.exactOnly);
  const routes = new Map();
  for (const [id, record] of smallTalk) {
    for (const phrase of record.phrases) routes.set(normalize(phrase), id);
  }
  for (const [id, sources] of Object.entries(data.utterances || {})) {
    if (!smallTalk.has(id) && !weatherKinds.has(id) && !clockKinds.has(id) && !['joke','repeat','rephrase'].includes(id)) continue;
    for (const phrase of Object.values(sources).flat()) {
      const key = normalize(phrase);
      if (!routes.has(key)) routes.set(key, id);
    }
  }
  const vocabulary=new Set([...index.filter(r=>r.anchors).flatMap(r=>r.queries.flatMap(tokens)),...Object.keys(aliases).map(k=>aliases[k]),'joke','weather','temperature','rain','wind','wiesmoor','morgen','tomorrow','forecast','vorhersage']);
  const rotation=new Rotation(random);
  let lastIntent='';
  let lastReply;
  let lastTopic;
  function correct(q){return q.map(w=>{if(vocabulary.has(w))return w;const near=[...vocabulary].filter(v=>oneTypo(w,v));return near.length===1?near[0]:w;});}
  function search(q,raw){
    if (exactIndex.has(raw)) return exactIndex.get(raw);
    if (!q.length) return null;
    const ranked=fuzzyIndex.map(r=>{
      if(!r.groups.every(group=>group.some(a=>q.includes(a))))return {...r,score:0};
      let score=0;
      for(const phrase of r.queryTokens){const shared=q.filter(w=>phrase.includes(w)).length;const precision=shared/Math.max(1,q.length),recall=shared/Math.max(1,phrase.length);if(precision>=0.78)score=Math.max(score,0.8*precision+0.2*recall);}
      return {...r,score};
    }).filter(r=>r.score>=0.86).sort((a,b)=>b.score-a.score||b.groups.length-a.groups.length||a.id.localeCompare(b.id));
    if(!ranked.length || ranked[1] && Math.abs(ranked[0].score-ranked[1].score)<0.035)return null;
    return ranked[0];
  }
  return {
    reset(){lastIntent='';lastReply=undefined;lastTopic=undefined;rotation.reset();},
    rememberModel(reply, language) {
      lastReply = {text:reply.text, sources:reply.sources || [], language};
      lastTopic = undefined;
    },
    async reply(input,language='de',{hasContext=false}={}){
      if(typeof input!=='string'||!input.trim())return null;
      if(input.length>800)return {kind:'limit',language,text:language==='de'?'Bitte kürze deine Nachricht auf höchstens 800 Zeichen.':'Please shorten your message to at most 800 characters.',sources:[]};
      const selectLanguage = (_, requested) => {
        language = /^(englisch|english)$/i.test(requested) ? 'en' : 'de';
        return ' ';
      };
      const cleaned = input.replace(languageRequest, selectLanguage)
        .replace(/(?:^|[.!?,;:]\s*)(?:bitte |please )?(?:auf|in) (englisch|deutsch|english|german)(?: bitte| please)?[.!?]*$/iu, selectLanguage)
        .trim();
      const raw = normalize(input);
      const languageChanged = cleaned !== input.trim();
      const query = normalize(cleaned);
      const t=(g,e)=>language==='de'?g:e;
      const response = (kind, text, extra={}) => {
        lastIntent = extra.social ? extra.id : kind;
        const {topic, ...details} = extra;
        const reply = {kind,text,language,sources:[],...details};
        if (['unknown','serious','limit'].includes(kind) || extra.clearContext) {
          lastReply = undefined;
          lastTopic = undefined;
        } else if (kind !== 'clarification' && kind !== 'repeat') {
          lastReply = reply;
          if (!extra.social) lastTopic = topic;
        }
        return reply;
      };
      // Serious/urgent topics get a neutral boundary before humour, even if a joke is requested.
      if(/\b(notfall|emergency|suizid|suicide|selbstmord|umbringen|vergiftet|poisoned|brustschmerz|chest pain|atemnot|sterben|vergewaltigt|missbraucht|traurig|depressed|trauer|tot|stirbt|died|krebs|cancer|dringend|urgent|panik|gestorben|krank|schmerzen|arzt|hilfe hilfe)\b|suizidgedanken|selbstmordgedanken|panikattacke/.test(raw))return response('serious',t('Das klingt ernst. Ich bin ein kleines Wissensangebot und kann dir hier keine verlässliche persönliche Hilfe geben. Bitte wende dich an einen geeigneten Menschen oder Fachdienst; bei unmittelbarer Gefahr an den örtlichen Notruf. Hier mache ich keine Witze.','That sounds serious. I’m a small knowledge companion and cannot provide reliable personal help here. Please contact a suitable person or professional service; in immediate danger, contact local emergency services. No jokes here.'));
      if (!query && languageChanged) return response('small-talk', t('Klar, ich antworte auf Deutsch.', 'Sure, I’ll reply in English.'), {id:'language', social:true});
      const withoutGreeting = query.replace(greetingPrefix, '');
      const authorInContext = lastTopic?.id === 'dennis-hilk' || lastTopic?.id === 'project-lost-administrator';
      if (asksAboutPrivateLife(cleaned,authorInContext,lastIntent === 'private-life')) {
        return response('private-life',privateLifeReply(language),{id:'private-life',social:true});
      }
      const route = routes.get(query) || routes.get(query.replace(/ snakkie$/, '')) ||
        routes.get(withoutGreeting) || routes.get(withoutGreeting.replace(/ snakkie$/, ''));
      const askedHow = lastIntent === 'how-are-you' || lastIntent === 'doing-well';
      if (contextEcho.has(query)) {
        if (askedHow) {
          const [german, english] = smallTalk.get('doing-well').replies;
          return response('small-talk', t(german,english), {id:'doing-well',social:true});
        }
        return response('clarification', clarification('reference',language), {social:true});
      }
      if (smallTalk.has(route)) {
        const {replies:[german, english]} = smallTalk.get(route);
        if (route === 'also-thanks' && !askedHow) {
          return response('thanks', t('Gern geschehen!', 'You’re welcome!'), {id:route,social:true});
        }
        const kind = ['greeting','thanks','bye'].includes(route) ? route : 'small-talk';
        return response(kind,t(german,english),{
          id:route, social:!TOPICAL_SMALL_TALK.has(route), clearContext:route==='new-topic'||route==='no-need'
        });
      }
      if (route === 'repeat' || repeatPhrases.has(query)) {
        if (lastReply?.language === language) {
          return response('repeat',lastReply.text,{sources:lastReply.sources,social:true});
        }
        return response('clarification',t('Was soll ich wiederholen?','What would you like me to repeat?'),{social:true});
      }
      const outing = wiesmoorOuting(withoutGreeting,lastIntent === 'events');
      const checkHours = t('Schau vor dem Besuch auf die Öffnungszeiten der jeweiligen Ausflugsziele.',
        'Check each attraction’s listing for opening hours on the day of your visit.');
      if (outing === 'attractions' && wiesmoorAttractions) {
        const text = eventPeriod.test(withoutGreeting) ? `${wiesmoorAttractions[language]} ${checkHours}` : wiesmoorAttractions[language];
        return response('knowledge',text,{id:wiesmoorAttractions.id,sources:wiesmoorAttractions.sources,topic:wiesmoorAttractions});
      }
      if (outing === 'events' || outing === 'both') {
        const sources = eventCalendarSources(withoutGreeting,now());
        const text = eventPeriod.test(withoutGreeting)
          ? t('Hier findest du die Wiesmoorer Termine für den gewünschten Zeitraum. Der Link zur Wiesmoor Touristik öffnet die Suche mit passenden Daten.',
              'Here are the Wiesmoor event calendars. The tourist office link opens the listings filtered to the requested dates.')
          : t('Aktuelle Termine für Wiesmoor findest du bei der Stadt und der Wiesmoor Touristik.',
              'You can find upcoming Wiesmoor events in the city calendar and the tourist office’s listings.');
        if (outing === 'both' && wiesmoorAttractions) {
          return response('events',`${wiesmoorAttractions.short[language]} ${checkHours}\n\n${text}`,{
            sources:[...sources,...wiesmoorAttractions.sources]
          });
        }
        return response('events',text,{sources});
      }
      const clockQuestion = withoutGreeting.replace(/^(?:bitte|please) | (?:bitte|please|snakkie)$/g,'');
      const dateOffset = relativeDateOffset(clockQuestion,lastIntent === 'date');
      if (dateOffset !== undefined) {
        const day = wiesmoorCalendarDay(now());
        day.setUTCDate(day.getUTCDate()+dateOffset);
        const date = new Intl.DateTimeFormat(t('de-DE','en-GB'),{timeZone:'UTC',dateStyle:'full'}).format(day);
        const verb = dateOffset < 0 ? t('war','was') : t('ist','is');
        const labels = t(['Vorgestern','Gestern','Heute','Morgen','Übermorgen'],
          ['The day before yesterday','Yesterday','Today','Tomorrow','The day after tomorrow']);
        return response('clock',`${labels[dateOffset+2]} ${verb} ${date}.`,{id:'date',social:true});
      }
      const followUp = route === 'rephrase' || rephrasePhrases.has(query) ? 'rephrase' : followUpKind(cleaned);
      if (followUp) {
        if (followUp === 'rephrase' && lastTopic?.short && !/(?:ausführlich|genauer|detail|elaborate|näher)/iu.test(cleaned)) {
          const topic = lastTopic;
          return response('knowledge',topic.short[language],{id:topic.id,sources:topic.sources,topic});
        }
        if (!hasContext) return response('clarification', clarification(followUp, language), {social:true});
        return response('unknown', '', {modelMessage:cleaned, followUp:true});
      }
      const clock = clockKinds.get(route) || clockPhrases.get(clockQuestion);
      if (clock) {
        const options = {timeZone:'Europe/Berlin'};
        if (clock !== 'time') options.dateStyle = 'full';
        if (clock !== 'date') options.timeStyle = 'short';
        const localTime = new Intl.DateTimeFormat(t('de-DE','en-GB'),options).format(now());
        const place = /\b(?:berlin|dresden|hamburg|koln|munchen)\b/.test(query) ? t('Deutschland','Germany') : 'Wiesmoor';
        const clockText = clock === 'date' ? t(`In ${place} ist heute ${localTime}.`,`In ${place}, today is ${localTime}.`)
          : clock === 'time' ? t(`In ${place} ist es ${localTime} Uhr.`,`In ${place}, it’s ${localTime}.`)
          : `${place} · ${localTime}`;
        return response('clock',clockText,{id:clock,social:true});
      }
      if (weatherKinds.has(route)) {
        const answer = await weather({kind:weatherKinds.get(route),language});
        return response('weather',answer.text,answer);
      }
      if (route === 'joke') {
        const joke = rotation.pick('jokes', data.jokes || []);
        if (joke) return response('joke',joke[language],{id:joke.id});
      }
      const authorFollowUp = authorInContext
        ? withoutGreeting.replace(/^(?:und |and )?/,'').replace(/^(hat|did) (?:er|he) /,'$1 dennis hilk ')
        : withoutGreeting;
      const exact = exactIndex.get(query) || exactIndex.get(withoutGreeting) || exactIndex.get(authorFollowUp);
      if (exact) return response('knowledge',exact[language],{id:exact.id,sources:exact.sources,topic:exact});
      const q=correct(tokens(query));
      if(q.includes('weather')||q.includes('rain')||q.includes('wind')||q.includes('temperature')){
        const allowed=new Set(['weather','rain','wind','temperature','wiesmoor','heute','today','gerade','now','bei','hier','there','like','morgen','tomorrow','forecast','vorhersage','wird','wirds','regnen','raining','rains','es','bei','dir','is','ist','heiss','warm','cold','kalt','viel','stark','windy','it','the','out','outside']);
        if(q.some(w=>!allowed.has(w)))return response('weather-scope',t('Mein Wetterbericht gilt nur für Wiesmoor. Für andere Orte oder andere Wetterfragen habe ich hier keine passende Datenquelle.','My weather report covers Wiesmoor only. I have no suitable source here for other places or weather questions.'));
        const kind=q.some(w=>['morgen','tomorrow','forecast','vorhersage'].includes(w))?'tomorrow':q.includes('rain')?'rain':q.includes('wind')?'wind':q.includes('temperature')?'temperature':'current';
        const answer=await weather({kind,language});return response('weather',answer.text,answer);
      }
      const follow=/^(noch (einen|ein|mehr)( bitte)?|another( one)?( please)?|one more( please)?)$/.test(raw);
      if((q.includes('joke')&&!/\b(kein|keinen|keine|dont|not|no)\b/.test(raw))||follow&&lastIntent==='joke'){
        const allowed=new Set(['joke','erzahl','erzahlst','erzahlen','tell','give','einen','noch','norddeutschen','ostfriesland','ostfriesen','kurzen','kurzer','short','funny','lustigen','northern','eastfrisia','bitte']);
        if(follow || /^(?:noch (?:einen|ein) witz|(?:another|one more) joke)(?: bitte| please)?$/.test(query) || q.every(w=>allowed.has(w))){const j=rotation.pick('jokes',data.jokes||[]);if(j)return response('joke',j[language],{id:j.id});}
      }
      const found=search(q,query);
      if(found)return response('knowledge',found[language],{id:found.id,sources:found.sources,topic:found});
      const fallback=rotation.pick('unknown',data['fallback-responses']||[]);
      return response('unknown',fallback?.[language]||t('Dazu habe ich keinen passenden geprüften Eintrag.','I don’t have a matching checked entry for that.'), {modelMessage:cleaned||input});
    }
  };
}
