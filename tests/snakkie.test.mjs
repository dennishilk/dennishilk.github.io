import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createCompanion,normalize,oneTypo,shouldSend,KNOWLEDGE_FILES,loadKnowledge} from '../assets/snakkie/engine.mjs';
import {weatherReply,zonedTimestamp,createWeatherReader,WEATHER_URL} from '../assets/snakkie/weather.mjs';
import {followUpKind,relevantHistory} from '../assets/snakkie/conversation.mjs';
import {SMALL_TALK} from '../assets/snakkie/small-talk.mjs';
import {wordAt,dailyWordIndex,loadWords} from '../assets/snakkie/words.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const data=Object.fromEntries(KNOWLEDGE_FILES.map(k=>[k,JSON.parse(read(`assets/snakkie/knowledge/${k}.json`)).entries]));
const engine=()=>createCompanion(data,{random:()=>0.4,weather:async options=>({kind:'weather',text:'fixture-'+options.kind,sources:[]})});
const now=Date.parse('2026-10-30T18:30:00Z');
function weatherFixture(){return {observer:'wiesmoor-weather',data_status:'ok',collected_at_utc:'2026-10-30T18:00:06Z',location:{name:'Wiesmoor',latitude:53.4167,longitude:7.7333,timezone:'Europe/Berlin'},current:{time:'2026-10-30T19:00',temperature_2m:9.3,rain:0,wind_speed_10m:4.3},daily:{time:['2026-10-30','2026-10-31'],temperature_2m_min:[5.8,6.8],temperature_2m_max:[10.6,11.7]}};}

test('public bilingual routes are indexable and preserve the cousin story and local assets',()=>{
 for(const [i,path] of ['snakkie/index.html','de/snakkie/index.html'].entries()){
  const html=read(path);assert.match(html,new RegExp(`<html lang="${i?'de':'en'}">`));assert.match(html,/<meta name="robots" content="index,follow,max-image-preview:large">/);
  for(const lang of ['en','de'])assert.ok(html.includes(`hreflang="${lang}" href="https://www.dennishilk.com/${lang==='de'?'de/':''}snakkie/"`));
  assert.match(html,i?/Nebbys Cousin/:/Nebby’s cousin/);assert.doesNotMatch(html,/Nebby becomes Snakkie|model-select|backend-select|start-model|clear-cache/);
  for(const [,target] of html.matchAll(/\b(?:src|href)="(\/[^"#?]*)(?:\?[^"#]*)?(?:#[^"]*)?"/g))assert.ok(existsSync(new URL(target.slice(1)+(target.endsWith('/')?'index.html':''),root)),target);
  assert.match(html,/<textarea[^>]+maxlength="800"/);assert.ok(html.indexOf('id="platt"')>html.indexOf('id="chat"'));
 }
 assert.equal(createHash('sha256').update(readFileSync(new URL('assets/snakkie/snakkie-captain-source.png',root))).digest('hex'),'a0b7a6c4c18478be09ee1b17a903621b09a6dd57317ce7d9469ed86a1cf93b02');
});

test('content has 100 distinct bilingual original jokes, 20 fallbacks and source-bearing language records',()=>{
 assert.equal(data.jokes.length,100);assert.equal(new Set(data.jokes.map(j=>j.id)).size,100);
 for(const lang of ['de','en'])assert.equal(new Set(data.jokes.map(j=>normalize(j[lang]))).size,100);
 assert.equal(data['fallback-responses'].length,20);assert.equal(data['platt-words'].length,2);assert.equal(data['platt-phrases'].length,1);
 for(const entry of [...data.jokes,...data['fallback-responses'],...data.facts,...data.personality]){assert.ok(entry.id);assert.ok(entry.de);assert.ok(entry.en);}
 for(const w of [...data['platt-words'],...data['platt-phrases']]){assert.equal(new URL(w.source).hostname,'www.platt-wb.de');assert.ok(w.checked);assert.match(w.status,/Wiesmoor-speaker-review-pending/);}
 for(const fact of data.facts){assert.ok(fact.sources.length);for(const s of fact.sources)if(s.url.startsWith('/'))assert.ok(existsSync(new URL(s.url.split('#')[0].slice(1)+(s.url.endsWith('/')?'index.html':''),root)),s.url);}
});

test('all requested German inputs resolve appropriately, including follow-up and honest unknown',async()=>{
 const ai=engine();
 for(const [q,kind,id] of [['Moin!','greeting'],['Hallo Snakkie!','greeting'],['Erzähl mir einen Ostfriesenwitz.','joke'],['Noch einen!','joke'],['Kannst du Platt?','knowledge','platt-ability'],['Was bedeutet Moin?','knowledge','word-moin'],['Wo liegt Wiesmoor?','knowledge','wiesmoor-location'],['Wie ist das Wetter in Wiesmoor?','weather'],['Wer ist dein Cousin?','knowledge','nebby'],['Was ist Linux?','knowledge','linux'],['Kannst du mir Python erklären?','knowledge','python'],['Was weißt du nicht?','knowledge','limits'],['Wer hat 1832 in München einen Regenschirm gekauft?','unknown']]){const r=await ai.reply(q,'de');assert.equal(r.kind,kind,q);if(id)assert.equal(r.id,id,q);}
});

test('small talk and the new local facts resolve with natural bilingual copy', async () => {
 const ai=engine();
 for(const [question,lang,kind,id,text] of [
  ['wie gehts dir','de','small-talk','how-are-you',/Mir geht’s gut/],
  ['mir geht es auch gut','de','small-talk','doing-well',/dass es dir gut geht/],
  ['How are you doing?','en','small-talk','how-are-you',/I’m doing well/],
  ['I’m good too','en','small-talk','doing-well',/Glad to hear/],
  ['kennst du dennis hilk ? was macht der so','de','knowledge','dennis-hilk',/World Observer.*BoringOS/],
  ['Who is Dennis Hilk?','en','knowledge','dennis-hilk',/open-source projects/],
  ['was führ sehenswürdigkeiten gibt es in wiesmoor','de','knowledge','wiesmoor-attractions',/Blumenreich.*Torf- und Siedlungsmuseum/],
  ['What is there to see in Wiesmoor?','en','knowledge','wiesmoor-attractions',/Peat and Settlement Museum/]
 ]){
  const reply=await ai.reply(question,lang);
  assert.equal(reply.kind,kind,question);
  assert.equal(reply.id,id,question);
  assert.match(reply.text,text,question);
  if(kind==='knowledge')assert.ok(reply.sources.length,question);
 }
 for(const question of ['Was hat Dennis Hilk gestern veröffentlicht?', 'Was macht Dennis Hilk mit Debian?',
  'Welche Sehenswürdigkeiten in Wiesmoor haben heute offen?', 'What is there to see in Leer?',
  'Wie geht es dir bei der Fehlersuche?']){
  assert.equal((await ai.reply(question)).kind,'unknown',question);
 }
});

test('small talk uses exact bilingual replies and leaves substantive questions open', async () => {
 const ai=engine();
 assert.ok(SMALL_TALK.length>=60);
 for (const [id, aliases] of SMALL_TALK) {
  for (const alias of aliases) assert.equal((await ai.reply(alias)).id,id,alias);
 }
 assert.equal((await ai.reply('hallo wie geht es dir')).text,'Mir geht’s gut, danke. Und dir?');
 assert.equal((await ai.reply('auch danke,')).text,'Freut mich zu hören!');
 assert.equal((await ai.reply('Hello, how are you?','en')).text,'I’m doing well, thanks. How are you?');
 assert.equal((await ai.reply('Fine, thanks!','en')).text,'Glad to hear it!');
 assert.match((await ai.reply('Wer bist du?')).text,/Nebbys Cousin.*Sprachmodell/);
 assert.match((await ai.reply('Wer ist Nebby?')).text,/mein Cousin/);
 assert.match((await ai.reply('Was kannst du?')).text,/Sprachmodell/);
 assert.equal((await ai.reply('Noch einen Witz.')).kind,'joke');
 assert.equal((await ai.reply('Another joke.','en')).kind,'joke');
 assert.equal((await ai.reply('Hallo, kannst du mir erklären, wie ich Debian installiere?')).kind,'unknown');
 assert.equal((await ai.reply('Hello, can you explain how to install Debian?','en')).kind,'unknown');
 assert.equal((await ai.reply('Erkläre mir kurz den Unterschied zwischen Arch Linux und Debian.')).id,'arch-debian');
 assert.equal((await ai.reply('Was ist neu bei Arch Linux und Debian heute?')).kind,'unknown');
});

test('every reviewed corpus phrase and knowledge alias reaches its intended local response', async () => {
 const ai=engine();
 const sources=new Set();
 const clockReply={'clock-time':'time','clock-date':'date','clock-both':'both'};
 for(const [route, groups] of Object.entries(data.utterances)){
  for(const [source, phrases] of Object.entries(groups)){
   sources.add(source);
   for(const phrase of phrases){
    ai.reset();
    const reply=await ai.reply(phrase);
    if(route==='joke')assert.equal(reply.kind,'joke',phrase);
    else if(route.startsWith('weather-'))assert.equal(reply.text,'fixture-'+route.slice(8),phrase);
    else if(route in clockReply)assert.equal(reply.id,clockReply[route],phrase);
    else if(['repeat','rephrase'].includes(route))assert.equal(reply.kind,'clarification',phrase);
    else assert.equal(reply.id,route,phrase);
   }
  }
 }
 assert.deepEqual([...sources].sort(),['chatterbot','massive','telekom']);
 for(const entry of [...data.facts,...data.personality]){
  for(const phrase of entry.queries){
   ai.reset();
   assert.equal((await ai.reply(phrase)).id,entry.id,phrase);
  }
 }
});

test('short replies use immediate context and repeat or simplify locally where possible', async () => {
 const ai=engine();
 assert.equal((await ai.reply('mir auch')).kind,'clarification');
 assert.equal((await ai.reply('wie gehts dir')).id,'how-are-you');
 assert.equal((await ai.reply('mir auch')).id,'doing-well');
 assert.equal((await ai.reply('Mir geht es nicht gut')).id,'not-good');
 assert.equal((await ai.reply('How are you?','en')).id,'how-are-you');
 assert.match((await ai.reply('same here','en')).text,/Glad to hear/);
 assert.equal((await ai.reply('Gute Nacht')).id,'good-night');
 assert.equal((await ai.reply('mir auch')).kind,'clarification');
 const original=await ai.reply('Was ist DNS?');
 const simpler=await ai.reply('Erklär es einfacher.');
 assert.equal(simpler.id,original.id);
 assert.ok(simpler.text.length<original.text.length);
 assert.deepEqual(simpler.sources,original.sources);
 assert.equal((await ai.reply('Kurz bitte.')).text,simpler.text);
 const repeated=await ai.reply('Bitte sagen Sie mir das noch einmal.');
 assert.equal(repeated.text,simpler.text);
 assert.deepEqual(repeated.sources,original.sources);
 assert.equal((await ai.reply('Erklär es ausführlicher.','de',{hasContext:true})).kind,'unknown');
 ai.rememberModel({text:'Fixture reply.',sources:original.sources},'en');
 assert.equal((await ai.reply('Say that again.','en')).text,'Fixture reply.');
 assert.equal((await ai.reply('Anderes Thema.')).clearContext,true);
 assert.equal((await ai.reply('Wiederhol das.')).kind,'clarification');
 ai.reset();
 assert.equal((await ai.reply('mir auch')).kind,'clarification');
});

test('book questions use the author’s book page and private-life questions stay local', async () => {
 const ai=engine();
 assert.equal((await ai.reply('Hat er ein Buch geschrieben?')).kind,'unknown');
 for (const [language,author,family,book,followUp] of [
  ['de','Wer ist Dennis Hilk?','Wer ist seine Frau?','hat dennis hilk ein buch geschrieben ?', 'Und hat er einen Roman geschrieben?'],
  ['en','Who is Dennis Hilk?','Who is his wife?','Did Dennis Hilk write a book?', 'Did he write a book?']
 ]) {
  assert.equal((await ai.reply(author,language)).id,'dennis-hilk');
  const privateReply=await ai.reply(family,language);
  assert.equal(privateReply.kind,'private-life');
  assert.deepEqual(privateReply.sources,[]);
  assert.match(privateReply.text,language==='de'?/keine verlässlichen öffentlichen Informationen/:/reliable public information/);
  assert.equal((await ai.reply(language==='de'?'Was macht sie beruflich?':'What does she do for a living?',language)).kind,'private-life');
  for (const question of [followUp,book]) {
   const reply=await ai.reply(question,language);
   assert.equal(reply.id,'project-lost-administrator');
   assert.match(reply.text,/The Lost Administrator.*PDF.*EPUB/);
   assert.equal(reply.sources[0].url,'/lost-administrator/');
  }
  ai.reset();
 }
 assert.equal((await ai.reply('Ist Dennis Hilk verheiratet?')).kind,'private-life');
 assert.equal((await ai.reply('Wer ist Anna Hilk?')).kind,'private-life');
 assert.equal((await ai.reply('Was macht Dennis Hilk?')).id,'dennis-hilk');
 assert.equal((await ai.reply('Wie viele Bücher hat Dennis Hilk geschrieben?')).kind,'unknown');
});

test('public cat facts and author follow-ups link to the cat pages', async () => {
 const ai=engine();
 for (const [language,question,author,followUp,why] of [
  ['de','kennst du die katzen von dennis hilk ?', 'Wer ist Dennis Hilk?', 'wie heißen seine katzen hat er welche ?', 'Woher haben sie ihre Namen?'],
  ['en','Do you know Dennis Hilk’s cats?', 'Who is Dennis Hilk?', 'What are his cats called? Does he have any?', 'Why are they called that?']
 ]) {
  const direct=await ai.reply(question,language);
  assert.equal(direct.id,'dennis-cats');
  assert.match(direct.text,/BigMac.*Berta/);
  assert.ok(direct.sources.some(source=>source.url===(language==='de'?'/de':'')+'/about/cats/'));
  ai.reset();
  assert.equal((await ai.reply(followUp,language)).kind,'unknown');
  await ai.reply(author,language);
  assert.equal((await ai.reply(followUp,language)).id,'dennis-cats');
  const names=await ai.reply(why,language);
  assert.equal(names.id,'dennis-cat-names');
  assert.match(names.text,/BigMac.*Two and a Half Men/);
  ai.reset();
 }
 assert.equal((await ai.reply('Hast du eine Katze?')).id,'pets');
 assert.equal((await ai.reply('Was ist ein Big Mac?')).kind,'unknown');
 assert.equal((await ai.reply('Hat Dennis Hilk Kinder?')).kind,'private-life');
});

test('the clock formats Wiesmoor time locally and leaves other time zones alone', async () => {
 const ai=createCompanion(data,{now:()=>now});
 assert.match((await ai.reply('Wie spät ist es in Wiesmoor?')).text,/Wiesmoor.*19:30 Uhr/);
 assert.match((await ai.reply('What is the time in Wiesmoor?','en')).text,/Wiesmoor.*19:30/);
  assert.match((await ai.reply('weißt du wie spät es ist')).text,/Wiesmoor.*19:30 Uhr/);
  assert.equal((await ai.reply('ja gerne')).text,'Alles klar.');
  assert.match((await ai.reply('Do you know what time it is?','en')).text,/Wiesmoor.*19:30/);
  assert.equal((await ai.reply('yes please','en')).text,'All right.');
  assert.match((await ai.reply('Moin Snakkie, wieviel Uhr ist es bitte?')).text,/19:30 Uhr/);
 assert.match((await ai.reply('Welches Datum ist heute?')).text,/30. Oktober 2026/);
  for (const question of ['What time is it in Tokyo?', 'Wie spät ist es in Berlin und New York?',
    'Weißt du, wie spät es ist und ob die Blumenhalle noch offen hat?']) {
    assert.equal((await ai.reply(question)).kind,'unknown',question);
  }
});

test('relative dates use the Wiesmoor calendar and handle short date follow-ups locally', async () => {
 const ai=createCompanion(data,{now:()=>Date.parse('2026-11-13T19:29:00Z')});
 for (const [question,language,text] of [
  ['hey, welcher tag ist morgen','de','Morgen ist Samstag, 14. November 2026.'],
  ['Und übermorgen?','de','Übermorgen ist Sonntag, 15. November 2026.'],
  ['Welcher Wochentag war gestern?','de','Gestern war Donnerstag, 12. November 2026.'],
  ['Was ist heute für ein Tag?','de','Heute ist Freitag, 13. November 2026.'],
  ['Welches Datum ist vorgestern gewesen?', 'de', 'Vorgestern war Mittwoch, 11. November 2026.'],
  ['Hey, what day is tomorrow?', 'en', 'Tomorrow is Saturday, 14 November 2026.'],
  ['What about yesterday?', 'en', 'Yesterday was Thursday, 12 November 2026.'],
  ['What will the date be in Tokyo tomorrow?', 'en', null],
  ['What will the date be tomorrow?', 'en', 'Tomorrow is Saturday, 14 November 2026.'],
  ['Do you know what day it will be tomorrow?', 'en', 'Tomorrow is Saturday, 14 November 2026.'],
  ['What’s the date the day after tomorrow?', 'en', 'The day after tomorrow is Sunday, 15 November 2026.'],
 ]) {
  const reply=await ai.reply(question,language);
  if (text === null) assert.equal(reply.kind,'unknown',question);
  else {
   assert.equal(reply.kind,'clock',question);
   assert.equal(reply.text,text,question);
   assert.deepEqual(reply.sources,[],question);
  }
 }
 ai.reset();
 assert.notEqual((await ai.reply('Und morgen?')).kind,'clock');
 const yearEnd=createCompanion(data,{now:()=>Date.parse('2026-12-31T23:05:00Z')});
 assert.equal((await yearEnd.reply('Welcher Tag ist heute?')).text,'Heute ist Freitag, 1. Januar 2027.');
 assert.equal((await yearEnd.reply('Und gestern?')).text,'Gestern war Donnerstag, 31. Dezember 2026.');
 const dst=createCompanion(data,{now:()=>Date.parse('2026-03-28T23:30:00Z')});
 assert.equal((await dst.reply('Welcher Tag ist morgen?')).text,'Morgen ist Montag, 30. März 2026.');
});

test('WoW introductions and Wiesmoor calendar follow-ups stay in the requested language', async () => {
 const ai=createCompanion(data,{now:()=>Date.parse('2026-11-13T19:20:00Z')});
 for (const [language,wow,events,followUp] of [
  ['de','kennst du world of warcraft ?', 'was ist dieses wochenende in wiesmoor los ?', 'ja sag mir bitte was morgen am samstag ist'],
  ['en','Do you know World of Warcraft?', 'What’s on in Wiesmoor this weekend?', 'And on Saturday?']
 ]) {
  const intro=await ai.reply(wow,language);
  assert.equal(intro.id,'world-of-warcraft');
  assert.match(intro.text,language==='de'?/Online-Rollenspiel.*Azeroth/:/role-playing game.*Azeroth/);
  assert.match(intro.sources[0].url,/^https:\/\/worldofwarcraft\.blizzard\.com\//);
  const calendar=await ai.reply(events,language);
  assert.equal(calendar.kind,'events');
  assert.match(calendar.text,language==='de'?/gewünschten Zeitraum/:/requested dates/);
  assert.match(calendar.sources[1].url,/\?start=2026-11-14&end=2026-11-15$/);
  const details=await ai.reply(followUp,language,{hasContext:true});
  assert.equal(details.kind,'events',followUp);
  assert.deepEqual(details.sources.map(source=>source.url),[
   'https://www.wiesmoor.de/Veranstaltungen',
   'https://www.tourismus-wiesmoor.de/veranstaltungen-1?start=2026-11-14&end=2026-11-14'
  ]);
  assert.equal((await ai.reply('Was ist DNS?',language)).id,'net-dns');
  assert.notEqual((await ai.reply(followUp,language,{hasContext:true})).kind,'events');
  ai.reset();
  assert.notEqual((await ai.reply(followUp,language)).kind,'events');
 }
 for (const question of ['Was ist dieses Wochenende in Aurich los?', 'Was ist heute in Wiesmoor geöffnet?',
  'What’s the best restaurant in Wiesmoor this weekend?', 'When is the next WoW patch?']) {
  assert.equal((await ai.reply(question)).kind,'unknown',question);
 }
 assert.equal((await ai.reply('Was gibt es morgen in Wiesmoor für Veranstaltungen?')).kind,'events');
 assert.equal((await ai.reply('Events in Wiesmoor this weekend','en')).kind,'events');
 const nextDay=createCompanion(data,{now:()=>Date.parse('2026-03-28T23:30:00Z')});
 assert.match((await nextDay.reply('Veranstaltungen heute in Wiesmoor')).sources[1].url,
  /\?start=2026-03-29&end=2026-03-29$/);
});

test('Wiesmoor outings combine reviewed attractions with a date-filtered event calendar', async () => {
 const ai=createCompanion(data,{now:()=>Date.parse('2026-11-13T19:34:00Z')});
 for (const [language,question,tip,hours] of [
  ['de','was ist morgen in wiesmoor los ? sehenswürdigkeiten oder veranstaltungen', /Gartenpark/,/Öffnungszeiten/],
  ['de','Was kann man morgen in Wiesmoor unternehmen?', /Gartenpark/,/Öffnungszeiten/],
  ['en','What’s on in Wiesmoor tomorrow? Attractions or events?',/garden park/,/opening hours/],
  ['en','Any events or places to visit in Wiesmoor tomorrow?',/garden park/,/opening hours/]
 ]) {
  const reply=await ai.reply(question,language);
  assert.equal(reply.kind,'events',question);
  assert.match(reply.text,tip);
  assert.match(reply.text,hours);
  assert.match(reply.sources[1].url,/\?start=2026-11-14&end=2026-11-14$/);
  assert.ok(reply.sources.some(source=>source.url.endsWith('/sehenswuerdigkeiten')));
 }
 assert.equal((await ai.reply('Welche Sehenswürdigkeiten gibt es morgen in Wiesmoor?')).id,'wiesmoor-attractions');
 assert.equal((await ai.reply('Und am Sonntag?')).kind,'unknown');
 for (const question of ['Was ist morgen in Aurich und Wiesmoor los?', 'Welche Sehenswürdigkeiten in Wiesmoor haben morgen offen?',
  'What events are free in Wiesmoor tomorrow?', 'Was ist das Wetter morgen in Wiesmoor?']) {
  assert.ok(['unknown','weather'].includes((await ai.reply(question)).kind),question);
 }
});

test('follow-ups use the last topic and reset to a short clarification', async () => {
 const ai=engine();
 const pair=(user,assistant)=>[{role:'user',content:user},{role:'assistant',content:assistant}];
 const arch=pair('Ich benutze Arch Linux.','Arch Linux also. Was möchtest du dazu wissen?');
 const opinion=pair('Was hältst du davon?','Arch liefert Pakete fortlaufend.');
 const comparison=pair('Und wie sieht es mit Debian aus?','Debian Stable veröffentlicht feste Versionen.');
 assert.equal((await ai.reply(arch[0].content)).social,false);
 for (const question of ['Was hältst du davon?','Und wie sieht es mit Debian aus?',
  'Erklär es einfacher.','Das verstehe ich nicht.','Can you explain that more simply?']) {
  assert.ok(followUpKind(question),question);
  assert.equal((await ai.reply(question,'de',{hasContext:true})).kind,'unknown',question);
 }
 assert.deepEqual(relevantHistory(opinion[0].content,arch),arch);
 assert.deepEqual(relevantHistory(comparison[0].content,[...arch,...opinion]),[...arch,...opinion]);
 assert.deepEqual(relevantHistory('Erklär es einfacher.',[...arch,...opinion,...comparison]),[...arch,...comparison]);
 assert.deepEqual(relevantHistory('Was ist JavaScript?',[...arch,...opinion]),[]);
 assert.deepEqual(relevantHistory('Can you give an example of that?',arch),arch);
 ai.reset();
 assert.equal((await ai.reply('Was hältst du davon?')).kind,'clarification');
 assert.equal((await ai.reply('Das verstehe ich nicht.')).kind,'clarification');
 assert.deepEqual(relevantHistory('What do you think?',[]),[]);
});

test('retrieval handles umlauts, transliteration, simple typos and synonyms without forced matches',async()=>{
 const ai=engine();assert.equal(normalize('GRÜSSE Grüße'),'grusse grusse');assert.equal(normalize('MÜTZE'),normalize('Muetze'));assert.ok(oneTypo('wiesmor','wiesmoor'));assert.ok(oneTypo('linxu','linux'));assert.equal(oneTypo('hat','hot'),false);
 for(const q of ['Wo liegt WIESMOR?','Wo liegt Wiesmooor?','Wo ligt Wiesmoor?'])assert.equal((await ai.reply(q)).id,'wiesmoor-location',q);
 assert.equal((await ai.reply('Was ist Linix?')).id,'linux');assert.equal((await ai.reply('Was heißt Moin?')).id,'word-moin');assert.equal((await ai.reply('ERZÄHLE mir einen Witz')).kind,'joke');
 for(const q of ['Wie installiere ich Linux?','Was ist Linux Quantenbanane?','Was ist Linux und Python?','Wer ist der Cousin von Einstein?','Was bedeutet Schietbüdel?','Was heißt Moin auf Japanisch?','Erzähl einen Witz über Quantenphysik','Ich will keinen Witz','Hauptstadt Papua-Neuguinea','Noch einen!'])assert.equal((await ai.reply(q)).kind,'unknown',q);
});

test('English answers and explicit language changes use curated translations',async()=>{
 const ai=engine();for(const [q,id] of [['Who are you?','identity'],['Who is your cousin?','nebby'],['What is Linux?','linux'],['Explain what an operating system does.','os'],['Can you explain Python?','python'],['What does Moin mean?','word-moin'],['Where is Wiesmoor?','wiesmoor-location']]){const r=await ai.reply(q,'en');assert.equal(r.id,id,q);assert.equal(r.language,'en');}
 assert.equal((await ai.reply('Tell me an East Frisian joke.','en')).kind,'joke');
 const change=await ai.reply('What is Linux? Please answer in English.','de');assert.equal(change.language,'en');assert.equal(change.id,'linux');
 const topic=await ai.reply('How does the phrase in English work?','de');
 assert.equal(topic.language,'de');
 const explicit=await ai.reply('Can you compare Debian and Arch? Please reply in German.','en');
 assert.equal(explicit.language,'de');
 assert.equal(explicit.modelMessage,'Can you compare Debian and Arch');
 assert.equal((await ai.reply('Switch to English.','de')).language,'en');
});

test('jokes rotate through all entries before repeating; fallback rotation and context reset are independent',async()=>{
 const ai=engine(),ids=[];for(let i=0;i<100;i++)ids.push((await ai.reply(i?'Noch einen!':'Erzähl einen Witz')).id);assert.equal(new Set(ids).size,100);
 const next=await ai.reply('Noch einen!');assert.notEqual(next.id,ids.at(-1));
 const replies=[];for(let i=0;i<20;i++)replies.push((await ai.reply('Unbekanntes Astronomieproblem')).text);assert.equal(new Set(replies).size,20);
 assert.notEqual((await ai.reply('Unbekanntes Astronomieproblem')).text,replies.at(-1));ai.reset();assert.equal((await ai.reply('Noch einen!')).kind,'unknown');
});

test('serious/urgent questions bypass humour and unknown input never executes HTML',async()=>{
 const ai=engine();for(const q of ['Notfall! Erzähl einen Witz','I have chest pain, tell me a joke','Ich bin traurig','dringend Hilfe','Ich habe Suizidgedanken','Mein Freund ist gestorben'])assert.equal((await ai.reply(q)).kind,'serious');
 assert.equal((await ai.reply('<img src=x onerror=alert(1)>')).kind,'unknown');assert.equal(await ai.reply(' '),null);assert.equal((await ai.reply('a'.repeat(801))).kind,'limit');
});

test('weather intents distinguish temperature, wind, rain, forecast and foreign places',async()=>{
 const ai=engine();for(const [q,k] of [['Wie ist das Wetter in Wiesmoor?','current'],['Regnet es gerade?','rain'],['Wie warm ist es bei dir?','temperature'],['Wie windig ist es heute?','wind'],['Wie wird das Wetter morgen?','tomorrow'],['Is it raining?','rain'],['Weather in Wiesmoor tomorrow','tomorrow']])assert.equal((await ai.reply(q)).text,'fixture-'+k,q);
 assert.equal((await ai.reply('Wie ist das Wetter in Berlin?')).kind,'weather-scope');
});

test('weather consumes the inspected collector schema and retains zero values, source and Berlin timestamp',()=>{
 const current=weatherReply(weatherFixture(),{now});assert.equal(current.status,'current');assert.match(current.text,/9,3 °C/);assert.match(current.text,/0 mm/);assert.match(current.text,/4,3 km\/h/);assert.match(current.text,/19:00/);assert.match(current.text,/Europe\/Berlin/);assert.match(current.sources[0].url,/wiesmoor-weather.html/);
 assert.match(weatherReply(weatherFixture(),{now,language:'en'}).text,/9.3 °C/);
 const rain=weatherReply(weatherFixture(),{now,kind:'rain'});assert.doesNotMatch(rain.text,/9,3 °C/);assert.match(rain.text,/0 mm/);
});

test('weather rejects stale, missing, future, malformed and non-Wiesmoor snapshots',()=>{
 for(const value of [null,{}, {...weatherFixture(),observer:'other'}, {...weatherFixture(),data_status:'unavailable'}, {...weatherFixture(),collected_at_utc:'2026-10-31T12:00:00Z'}, {...weatherFixture(),current:{time:'invalid'}}])assert.equal(weatherReply(value,{now}).status,'unavailable');
 assert.equal(weatherReply(weatherFixture(),{now:now+4*3600000}).status,'stale');
 const r=weatherFixture();r.current.time='2026-10-29T19:00';assert.equal(weatherReply(r,{now}).status,'stale');
 r.current={time:'2026-10-30T19:00',temperature_2m:null,rain:null,wind_speed_10m:null};assert.equal(weatherReply(r,{now}).status,'unavailable');
 r.current.temperature_2m=9;r.current_units={temperature_2m:'°F'};assert.equal(weatherReply(r,{now}).status,'unavailable');
});

test('forecast selects tomorrow by Berlin calendar date, never by fixed array position',()=>{
 const r=weatherFixture();r.daily.time=['2026-10-31','2026-10-30'];r.daily.temperature_2m_min=[6.8,5.8];r.daily.temperature_2m_max=[11.7,10.6];
 const reply=weatherReply(r,{now,kind:'tomorrow'});assert.equal(reply.status,'forecast');assert.match(reply.text,/2026-10-31/);assert.match(reply.text,/6,8 bis 11,7/);assert.match(reply.text,/keine aktuelle Messung/);
 r.daily.time=['2026-10-30'];assert.equal(weatherReply(r,{now,kind:'tomorrow'}).status,'unavailable');r.daily.time={};assert.equal(weatherReply(r,{now,kind:'tomorrow'}).status,'unavailable');
 assert.equal(weatherReply(weatherFixture(),{now:now+27*3600000,kind:'tomorrow'}).status,'stale');
});

test('timezone parsing is independent of client timezone and handles DST gaps/ambiguity honestly',()=>{
 assert.equal(zonedTimestamp('2026-10-30T19:00'),Date.parse('2026-10-30T18:00Z'));
 assert.equal(zonedTimestamp('2026-07-15T19:00'),Date.parse('2026-07-15T17:00Z'));
 assert.equal(zonedTimestamp('2026-03-29T02:30'),null);assert.equal(zonedTimestamp('2026-10-25T02:30'),null);assert.equal(zonedTimestamp('2026-02-30T10:00'),null);
});

test('weather reader fetches only the existing fixed JSON URL, caches briefly and handles network errors',async()=>{
 const urls=[],reader=createWeatherReader(async(url)=>{urls.push(url);return new Response(JSON.stringify(weatherFixture()));});
 assert.equal((await reader({now})).status,'current');await reader({now});assert.deepEqual(urls,[WEATHER_URL]);
 assert.equal((await createWeatherReader(async()=>{throw Error('offline');})({now})).status,'unavailable');
 assert.equal((await createWeatherReader(async()=>new Response('<html>missing</html>'))({now})).status,'unavailable');
});

test('daily word uses stable sorted IDs and local calendar days; learning does not require the chat engine',async()=>{
 const words=[...data['platt-words']].sort((a,b)=>a.id.localeCompare(b.id));const date=new Date(2026,9,30,1),late=new Date(2026,9,30,23);assert.equal(dailyWordIndex(words,date),dailyWordIndex(words,late));assert.notEqual(dailyWordIndex(words,date),dailyWordIndex(words,new Date(2026,9,31,1)));assert.equal(wordAt(words,-1),words.at(-1));
 const list=await loadWords(async()=>new Response(JSON.stringify({entries:words})));assert.deepEqual(list,words);
 await assert.rejects(loadKnowledge(async()=>new Response('',{status:404})),/KNOWLEDGE_UNAVAILABLE/);
});

test('Enter sends, Shift+Enter/IME do not; frontend uses the same-origin API without storing or interpreting chat text',()=>{
 assert.equal(shouldSend({key:'Enter'}),true);for(const e of [{key:'Enter',shiftKey:true},{key:'Enter',isComposing:true},{key:'Enter',keyCode:229},{key:'a'}])assert.equal(shouldSend(e),false);
 for(const file of ['ui.mjs','engine.mjs','weather.mjs','words.mjs'])assert.doesNotMatch(read('assets/snakkie/'+file),/innerHTML|localStorage|sessionStorage|indexedDB|sendBeacon|new Worker|\.wasm|\.gguf|navigator\.gpu|wllama|Qwen|https:\/\/api\./);
 for(const file of ['inference.mjs','inference-worker.mjs','model-config.mjs','model-storage.mjs'])assert.equal(existsSync(new URL('assets/snakkie/'+file,root)),false);
 assert.equal(existsSync(new URL('scripts/prepare-snakkie-assets.py',root)),false);
 assert.match(read('assets/snakkie/ui.mjs'), /fetch\('\/api\/snakkie\/chat'/);
});

test('both start pages and blog stories link to their localized Snakkie page', () => {
  for (const [prefix, slug] of [['', 'local-ai-without-gpu-snakkie'], ['de/', 'lokale-ki-ohne-gpu-snakkie']]) {
    const route = '/' + prefix + 'snakkie/';
    const homepage = read(prefix + 'index.html');
    assert.ok(homepage.includes('href="' + route + '"'));
    assert.match(homepage, /World of Warcraft<\/a>/);
    assert.doesNotMatch(homepage, /World of Warcraft ❤️|raymosaic-feature|museum-highlights-title/);
    assert.match(homepage, /href="\/museum\/"/);
    const article = read(prefix + 'blog/' + slug + '/index.html');
    assert.ok(article.includes('href="' + route + '"'));
    assert.ok(read(prefix + 'blog/feed.xml').includes('/' + prefix + 'blog/' + slug + '/'));
  }
});

test('sitemap regeneration includes both localized Snakkie routes', t => {
  const fixture = mkdtempSync(join(tmpdir(), 'snakkie-sitemap-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  for (const path of ['snakkie/index.html', 'de/snakkie/index.html', 'scripts/sync-seo.mjs',
    'scripts/hardware-integration.mjs', 'scripts/gaming-integration.mjs']) {
    mkdirSync(join(fixture, path, '..'), { recursive: true });
    copyFileSync(new URL(path, root), join(fixture, path));
  }
  execFileSync(process.execPath, ['scripts/sync-seo.mjs', '--sitemaps-only'], { cwd: fixture });
  for (const [name, prefix] of [['sitemap.xml', ''], ['sitemap-de.xml', 'de/']]) {
    const xml = readFileSync(join(fixture, name), 'utf8');
    assert.ok(xml.includes('<loc>https://www.dennishilk.com/' + prefix + 'snakkie/</loc>'));
  }
});
