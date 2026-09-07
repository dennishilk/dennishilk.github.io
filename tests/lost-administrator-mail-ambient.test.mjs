import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MailClient } from '../assets/js/lost-administrator/mail-client.js';
import { AMBIENT_MAIL_MESSAGES } from '../assets/js/lost-administrator/mail-ambient-data.js';
import { CANON_MAIL_IDS, MAIL_MESSAGES, MAIL_ACCOUNT } from '../assets/js/lost-administrator/mail-data.js';
import { defaultWorkstationState } from '../assets/js/lost-administrator/workstation-state.js';

const text=r=>[...r.stdout,...r.stderr].join('\n');
const freeze=Date.parse('2026-07-31T15:18:43-04:00');
const forbidden=/\bSteve\b|\bpolice\b|\bHenry\b|\bSarah\b|\bCalver\b|Signal evidence|C\.M\.T\.A\.|\bT43\b|T480|\bvehicles?\b|\bUSB\b|\bforensic\b|later chapters?|\bdisappearance\b|\bcustomers?\b|\bticket numbers?\b|\bhostnames?\b|\bIP addresses?\b|\bswitch ports?\b|\bhardware serials?\b|\bmanufacturers?\b|secret infrastructure|lab-node|visitor@|192\.0\.2\./i;

const byClass=classification=>AMBIENT_MAIL_MESSAGES.filter(message=>message.classification===classification);

test('ambient mailbox has exact approved counts and populated normal folders',()=>{
  assert.equal(AMBIENT_MAIL_MESSAGES.length,64);
  assert.equal(byClass('ambient-spam').length,26);
  assert.equal(byClass('ambient-it').length,37);
  assert.equal(byClass('ambient-human').length,1);
  assert.equal(MAIL_MESSAGES.length,67);
  assert.deepEqual(MAIL_MESSAGES.filter(message=>CANON_MAIL_IDS.includes(message.id)).map(message=>message.id),CANON_MAIL_IDS);
  assert.equal(MAIL_MESSAGES.filter(message=>message.folder==='INBOX').length,54);
  assert.equal(MAIL_MESSAGES.filter(message=>message.folder==='SENT').length,10);
  assert.equal(MAIL_MESSAGES.filter(message=>message.folder==='EMMA').length,3);
  const c=new MailClient(defaultWorkstationState());
  const folders=text(c.execute('folders'));
  assert.match(folders,/INBOX\s+54 messages/);
  assert.match(folders,/SENT\s+10 messages/);
  assert.match(folders,/EMMA\s+hundreds of messages, approximately 4.8 GB/);
});

test('ambient IDs and classification are deterministic',()=>{
  const ids=AMBIENT_MAIL_MESSAGES.map(message=>message.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ids.every(id=>id.length<=8));
  assert.deepEqual(byClass('ambient-spam').map(message=>message.id),Array.from({length:26},(_,index)=>`SPAM${String(index+1).padStart(3,'0')}`));
  assert.deepEqual(byClass('ambient-it').map(message=>message.id),Array.from({length:37},(_,index)=>`OPS${String(index+1).padStart(3,'0')}`));
  assert.deepEqual(byClass('ambient-human').map(message=>message.id),['BRENDA01']);
});

test('Brenda is one dry office-texture message with no added biography',()=>{
  const [brenda]=byClass('ambient-human');
  assert.deepEqual(brenda.from,{name:'Brenda',address:'brenda@chesapeakesignaltech.com'});
  assert.equal(brenda.to.address,MAIL_ACCOUNT.address);
  assert.equal(brenda.date,'2026-07-30T14:07:00-04:00');
  assert.equal(brenda.subject,'Coffee');
  assert.equal(brenda.body,'Michael,\n\nyour coffee is getting cold.\n\nBrenda');
  assert.equal(brenda.unread,false);
  assert.doesNotMatch(JSON.stringify(brenda),/surname|department|manager|engineer|wife|girlfriend|romance|history|family|investigation|clue/i);
});

test('ambient content stays before the freeze and outside story canon',()=>{
  const serialized=JSON.stringify(AMBIENT_MAIL_MESSAGES);
  assert.ok(AMBIENT_MAIL_MESSAGES.every(message=>Date.parse(message.date)<=freeze));
  assert.doesNotMatch(serialized,forbidden);
  assert.doesNotMatch(serialized,/https?:\/\/|\.pptx|example\.com/i);
  assert.equal(new Set(AMBIENT_MAIL_MESSAGES.map(message=>message.body)).size,AMBIENT_MAIL_MESSAGES.length);
});

test('ambient search, sent mail, threads, read state, and reset remain functional',()=>{
  const state=defaultWorkstationState(),c=new MailClient(state);
  assert.match(text(c.execute('search coffee')),/BRENDA01/);
  c.execute('folder sent');
  assert.match(text(c.execute('list')),/OPS002/);
  c.execute('folder inbox');
  assert.match(text(c.execute('search subject:certificate')),/OPS028/);
  c.execute('folder inbox');
  assert.equal(c.isUnread(MAIL_MESSAGES.find(message=>message.id==='OPS001')),true);
  assert.match(text(c.execute('open OPS001')),/THREAD 1 OF 3[\s\S]*queue looks stuck[\s\S]*THREAD 2 OF 3[\s\S]*Queue was wedged[\s\S]*THREAD 3 OF 3[\s\S]*Working again/);
  assert.ok(['OPS001','OPS002','OPS003'].every(id=>state.mail.read[id]===true));
  const reset=new MailClient(defaultWorkstationState());
  assert.equal(reset.isUnread(MAIL_MESSAGES.find(message=>message.id==='OPS001')),true);
});

test('mail sources introduce no analytics, remote loading, or unsafe rendering',async()=>{
  for(const file of ['mail-client.js','mail-data.js','mail-ambient-data.js']){
    const source=await readFile(new URL(`../assets/js/lost-administrator/${file}`,import.meta.url),'utf8');
    assert.doesNotMatch(source,/innerHTML|outerHTML|eval\s*\(|navigator\.sendBeacon|gtag\s*\(|fetch\s*\(|XMLHttpRequest|WebSocket/i,file);
  }
});
