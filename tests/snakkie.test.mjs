import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,mkdirSync,copyFileSync,readdirSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createCompanion,normalize,oneTypo,shouldSend,KNOWLEDGE_FILES,loadKnowledge} from '../assets/snakkie/engine.mjs';
import {weatherReply,zonedTimestamp,createWeatherReader,WEATHER_URL} from '../assets/snakkie/weather.mjs';
import {wordAt,dailyWordIndex,loadWords} from '../assets/snakkie/words.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const data=Object.fromEntries(KNOWLEDGE_FILES.map(k=>[k,JSON.parse(read(`assets/snakkie/knowledge/${k}.json`)).entries]));
const engine=()=>createCompanion(data,{random:()=>0.4,weather:async options=>({kind:'weather',text:'fixture-'+options.kind,sources:[]})});
const now=Date.parse('2026-10-30T18:30:00Z');
function weatherFixture(){return {observer:'wiesmoor-weather',data_status:'ok',collected_at_utc:'2026-10-30T18:00:06Z',location:{name:'Wiesmoor',latitude:53.4167,longitude:7.7333,timezone:'Europe/Berlin'},current:{time:'2026-10-30T19:00',temperature_2m:9.3,rain:0,wind_speed_10m:4.3},daily:{time:['2026-10-30','2026-10-31'],temperature_2m_min:[5.8,6.8],temperature_2m_max:[10.6,11.7]}};}

test('bilingual direct routes preserve noindex, cousin story and existing local assets',()=>{
 for(const [i,path] of ['snakkie/index.html','de/snakkie/index.html'].entries()){
  const html=read(path);assert.match(html,new RegExp(`<html lang="${i?'de':'en'}">`));assert.match(html,/<meta name="robots" content="noindex,follow">/);
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
 for(const fact of data.facts){assert.ok(fact.sources.length);for(const s of fact.sources)if(s.url.startsWith('/'))assert.ok(existsSync(new URL(s.url.slice(1)+(s.url.endsWith('/')?'index.html':''),root)),s.url);}
});

test('all requested German inputs resolve appropriately, including follow-up and honest unknown',async()=>{
 const ai=engine();
 for(const [q,kind,id] of [['Moin!','greeting'],['Hallo Snakkie!','greeting'],['Erzähl mir einen Ostfriesenwitz.','joke'],['Noch einen!','joke'],['Kannst du Platt?','knowledge','platt-ability'],['Was bedeutet Moin?','knowledge','word-moin'],['Wo liegt Wiesmoor?','knowledge','wiesmoor-location'],['Wie ist das Wetter in Wiesmoor?','weather'],['Wer ist dein Cousin?','knowledge','nebby'],['Was ist Linux?','knowledge','linux'],['Kannst du mir Python erklären?','knowledge','python'],['Was weißt du nicht?','knowledge','limits'],['Wer hat 1832 in München einen Regenschirm gekauft?','unknown']]){const r=await ai.reply(q,'de');assert.equal(r.kind,kind,q);if(id)assert.equal(r.id,id,q);}
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

test('Enter sends, Shift+Enter/IME do not; frontend has no LLM, chat persistence or HTML injection',()=>{
 assert.equal(shouldSend({key:'Enter'}),true);for(const e of [{key:'Enter',shiftKey:true},{key:'Enter',isComposing:true},{key:'Enter',keyCode:229},{key:'a'}])assert.equal(shouldSend(e),false);
 for(const file of ['ui.mjs','engine.mjs','weather.mjs','words.mjs'])assert.doesNotMatch(read('assets/snakkie/'+file),/innerHTML|localStorage|sessionStorage|indexedDB|sendBeacon|new Worker|\.wasm|\.gguf|navigator\.gpu|wllama|Qwen|https:\/\/api\./);
 for(const file of ['inference.mjs','inference-worker.mjs','model-config.mjs','model-storage.mjs'])assert.equal(existsSync(new URL('assets/snakkie/'+file,root)),false);
 assert.equal(existsSync(new URL('scripts/prepare-snakkie-assets.py',root)),false);
});

test('no other public page, sitemap or RSS feed advertises Snakkie',()=>{
 const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0');
 for(const p of tracked.filter(p=>/\.(html|xml|json|js)$/.test(p)&&!/^(de\/)?snakkie\//.test(p)&&!p.startsWith('assets/snakkie/')&&!p.startsWith('docs/snakkie/'))){assert.doesNotMatch(read(p),/(?:href|url|loc)[^\n]{0,12}["'>]?(?:https:\/\/www\.dennishilk\.com)?\/(?:de\/)?snakkie\//i,p);}
});

test('sitemap regeneration excludes both noindex routes',t=>{
 const fixture=mkdtempSync(join(tmpdir(),'snakkie-sitemap-'));t.after(()=>rmSync(fixture,{recursive:true,force:true}));
 for(const p of ['snakkie/index.html','de/snakkie/index.html','scripts/sync-seo.mjs','scripts/hardware-integration.mjs','scripts/gaming-integration.mjs']){mkdirSync(join(fixture,p,'..'),{recursive:true});copyFileSync(new URL(p,root),join(fixture,p));}
 execFileSync(process.execPath,['scripts/sync-seo.mjs','--sitemaps-only'],{cwd:fixture});for(const name of readdirSync(fixture).filter(n=>/^sitemap.*\.xml$/.test(n)))assert.doesNotMatch(readFileSync(join(fixture,name),'utf8'),/\/(?:de\/)?snakkie\//);
});
