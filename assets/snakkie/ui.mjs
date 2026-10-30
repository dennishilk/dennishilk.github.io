import {createCompanion,loadKnowledge,shouldSend} from './engine.mjs?v=3';
import {loadWords,wordAt,dailyWordIndex} from './words.mjs?v=3';
const de=document.documentElement.lang==='de',t=(en,german)=>de?german:en,$=id=>document.getElementById(id);
const form=$('chat-form'),input=$('chat-input'),send=$('send'),log=$('chat-messages'),language=$('reply-language'),reset=$('reset-chat');
let busy=false,pinned=true,session=0;
const ready=loadKnowledge().then(data=>createCompanion(data)).catch(()=>null);
function controls(){send.disabled=busy;reset.disabled=busy;language.disabled=busy;document.querySelectorAll('.suggestion').forEach(b=>b.disabled=busy);}
function grow(){input.style.height='auto';input.style.height=Math.min(130,Math.max(46,input.scrollHeight))+'px';}
function scroll(){if(pinned)log.scrollTop=log.scrollHeight;}
log.addEventListener('scroll',()=>{pinned=log.scrollHeight-log.scrollTop-log.clientHeight<65;$('latest-message').hidden=pinned;});
$('latest-message').addEventListener('click',()=>{pinned=true;scroll();$('latest-message').hidden=true;});
input.addEventListener('input',grow);
input.addEventListener('keydown',e=>{if(shouldSend(e)){e.preventDefault();if(!busy)form.requestSubmit();}});
function message(role,text,sources=[]){
 const article=document.createElement('article');article.className=`message ${role==='user'?'user-message':'assistant-message'}`;article.dataset.chatTurn='';
 const content=document.createElement('div'),author=document.createElement('p'),body=document.createElement('p');
 author.className='message-author';author.textContent=role==='user'?t('You','Du'):'Snakkie';body.className='message-body';body.textContent=text;content.append(author,body);
 if(role!=='user'){const avatar=document.createElement('img');avatar.src='/assets/snakkie/snakkie-avatar.webp';avatar.width=40;avatar.height=40;avatar.alt='';article.append(avatar);}
 if(sources.length){const links=document.createElement('div');links.className='message-sources';for(const source of sources){
  // Only curated local/HTTPS destinations. Model/user text never becomes markup or a URL.
  if(typeof source.url!=='string'||!(source.url.startsWith('/')&&!source.url.startsWith('//')||source.url.startsWith('https://')))continue;
  const a=document.createElement('a');a.href=source.url;a.textContent=source.label+' ↗';a.rel='noreferrer';links.append(a);
 }content.append(links);}
 article.append(content);log.append(article);
 if(log.querySelectorAll('[data-chat-turn]').length>60){const first=log.querySelector('[data-chat-turn]'),h=first.offsetHeight;first.remove();if(!pinned)log.scrollTop-=h;}
 scroll();return article;
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;const text=input.value.trim();if(!text)return;
 if(text.length>800)return;
 busy=true;controls();const version=session;
 message('user',text);input.value='';grow();input.focus();$('chat-status').textContent=t('Looking in my knowledge book…','Ich schaue ins Wissensbuch …');
 try{
  const engine=await ready;
  const reply=engine?await engine.reply(text,language.value):{text:t('My knowledge book could not be loaded. Please reload this page; the Platt example below remains available.','Mein Wissensbuch konnte nicht geladen werden. Lade die Seite bitte neu; das Platt-Beispiel darunter bleibt verfügbar.'),sources:[]};
  if(version!==session)return;
  if(reply){language.value=reply.language||language.value;message('assistant',reply.text,reply.sources);$('chat-status').textContent=t('Snakkie has replied.','Snakkie hat geantwortet.');}
 }catch{message('assistant',t('I couldn’t look that up just now. Please try again.','Das konnte ich gerade nicht nachschlagen. Versuch es bitte noch einmal.'));}
 finally{busy=false;controls();}
});
reset.addEventListener('click',async()=>{if(busy)return;session++;log.querySelectorAll('[data-chat-turn]').forEach(n=>n.remove());(await ready)?.reset();input.value='';grow();pinned=true;scroll();$('latest-message').hidden=true;input.focus();$('chat-status').textContent=t('New conversation.','Neues Gespräch.');});
document.querySelectorAll('.suggestion').forEach(button=>button.addEventListener('click',()=>{if(busy)return;input.value=button.dataset.question;form.requestSubmit();input.focus();}));
input.disabled=false;send.disabled=false;reset.disabled=false;document.querySelector('.suggestions').hidden=false;
// Learning has its own dataset/request and works even if the chat collection fails.
loadWords().then(list=>{
 const words=[...list].sort((a,b)=>a.id.localeCompare(b.id));let index=dailyWordIndex(words),dayKey=new Date().toDateString();
 function show(i){index=((i%words.length)+words.length)%words.length;const w=wordAt(words,index);$('word').textContent=w.word;$('word-de').textContent=w.de;$('word-en').textContent=w.en;$('word-example').textContent=w.example;$('word-example-translation').textContent=de?w.exampleDe:w.exampleEn;$('word-note').textContent=de?w.noteDe:w.noteEn;$('word-source').href=w.source;$('word-source').textContent=w.sourceLabel+' ↗';$('word-count').textContent=`${index+1} / ${words.length}`;}
 show(index);document.querySelector('.word-controls').hidden=false;
 $('previous-word').addEventListener('click',()=>show(index-1));$('next-word').addEventListener('click',()=>show(index+1));
 function checkDay(){const now=new Date(),key=now.toDateString();if(key!==dayKey){dayKey=key;show(dailyWordIndex(words,now));}}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDay();});setInterval(checkDay,60000);
}).catch(()=>{$('daily-note').textContent=t('Static word example · daily selection unavailable','Statisches Wortbeispiel · Tagesauswahl nicht verfügbar');});
