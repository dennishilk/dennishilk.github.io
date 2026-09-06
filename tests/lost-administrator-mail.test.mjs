import test from 'node:test';
import assert from 'node:assert/strict';
import { MailClient } from '../assets/js/lost-administrator/mail-client.js';
import { MAIL_MESSAGES, MAIL_ACCOUNT } from '../assets/js/lost-administrator/mail-data.js';
import { defaultWorkstationState } from '../assets/js/lost-administrator/workstation-state.js';
import { ShellEngine } from '../assets/js/debian-server/shell-engine.js';

const fixture=[
 {id:'T-200',folder:'INBOX',from:{name:'Example Sender',address:'sender@example.test'},to:{name:'Example Recipient',address:'recipient@example.test'},date:'2026-01-02T10:00:00Z',subject:'Routine update',body:'Generic fixture alpha.',unread:true,attachments:[{name:'sample.txt',size:'12 B'}]},
 {id:'T-100',folder:'INBOX',from:{name:'Second Sender',address:'second@example.test'},to:{name:'Example Recipient',address:'recipient@example.test'},date:'2026-01-01T10:00:00Z',subject:'Earlier note',body:'Generic fixture beta.',unread:false,attachments:[]},
 {id:'T-300',folder:'SENT',from:{name:'Example Recipient',address:'recipient@example.test'},to:{name:'Outside Recipient',address:'outside@example.test'},date:'2025-12-31T10:00:00Z',subject:'Sent fixture',body:'Generic sent text.',unread:false,attachments:[]}
];
const client=()=>new MailClient(defaultWorkstationState(),structuredClone(fixture),{account:{name:'Test Account',address:'test@example.test'},folders:['INBOX','SENT']});
const text=r=>[...r.stdout,...r.stderr].join('\n');
test('mail shell command enters mode and shell help advertises it',()=>{const e=new ShellEngine(defaultWorkstationState());assert.equal(e.execute('mail').enterMail,true);assert.match(text(e.execute('help')),/^Mail:$/m);assert.match(text(e.execute('help')),/^  mail$/m);});
test('live mailbox contains the Day Zero mail canon',()=>{
  assert.equal(MAIL_ACCOUNT.address,'michael.weber@chesapeakesignaltech.com');
  const [original,michael,emmaReply]=MAIL_MESSAGES;
  assert.equal(MAIL_MESSAGES.length,3);
  assert.equal(original.from.address,'emma@michamailgate.com');
  assert.equal(original.to.address,'robodad@michamailgate.com');
  assert.equal(original.date,'2026-07-31T10:42:00-04:00');
  assert.doesNotMatch(JSON.stringify([original,michael,emmaReply]),/2026-07-29/);
  assert.deepEqual([original.threadOrder,michael.threadOrder,emmaReply.threadOrder],[1,2,3]);
  const c=new MailClient(defaultWorkstationState());
  assert.match(text(c.execute('folders')),/EMMA\s+hundreds of messages, approximately 4.8 GB/);
  c.execute('folder emma');
  assert.match(text(c.execute('open EMMA0731')),/THREAD 1 OF 3[\s\S]*From: Emma Weber <emma@michamailgate.com>[\s\S]*To: Michael Weber <robodad@michamailgate.com>[\s\S]*Date: 2026-07-31T10:42:00-04:00[\s\S]*THREAD 2 OF 3[\s\S]*Office cabinet, top shelf[\s\S]*THREAD 3 OF 3[\s\S]*Major Tom reports/);
  c.execute('folder inbox');
  assert.match(text(c.execute('list')),/No messages in INBOX/);
  assert.doesNotMatch(JSON.stringify(MAIL_MESSAGES),/Steve|preview deck|\.pptx/i);
});
test('listing retains stable IDs and opening marks a message read',()=>{const c=client();assert.match(text(c.start()),/T-200.*N.*Routine update/);assert.match(text(c.execute('search alpha')),/T-200/);assert.match(text(c.execute('open T-200')),/MESSAGE 1 OF 1/);assert.equal(c.state.mail.read['T-200'],true);assert.match(text(c.execute('attachments')),/sample.txt  12 B/);assert.match(text(c.execute('back')),/T-200/);});
test('navigation, folders, search, attachments and errors are deterministic',()=>{const c=client();c.start();c.execute('open T-200');assert.match(text(c.execute('next')),/Earlier note/);assert.match(text(c.execute('next')),/end of the list/);assert.match(text(c.execute('previous')),/Routine update/);assert.match(text(c.execute('previous')),/beginning/);assert.match(text(c.execute('folder sent')),/T-300/);assert.match(text(c.execute('folder nowhere')),/unknown folder/);c.execute('folder inbox');assert.match(text(c.execute('search fixture beta')),/T-100/);assert.match(text(c.execute('search from:second')),/T-100/);assert.match(text(c.execute('search absent')),/No messages matched/);assert.match(text(c.execute('attachments')),/open a message/);assert.match(text(c.execute('nonesuch')),/unknown command/);assert.equal(c.execute('q').quitMail,true);});
test('default state reset restores canonical unread status',()=>{const c=client();c.start();c.execute('open T-200');assert.equal(c.isUnread(fixture[0]),false);const reset=client();assert.equal(reset.isUnread(fixture[0]),true);});
test('opening the canonical Emma thread marks all replies read and reset restores defaults',()=>{const c=new MailClient(defaultWorkstationState());c.execute('folder emma');assert.equal(c.isUnread(MAIL_MESSAGES[2]),true);c.execute('open EMMA0731');assert.ok(MAIL_MESSAGES.slice(0,3).every(message=>!c.isUnread(message)));const reset=new MailClient(defaultWorkstationState());assert.equal(reset.isUnread(MAIL_MESSAGES[2]),true);});
test('test fixture prose cannot leak into live mailbox data',()=>{const live=JSON.stringify(MAIL_MESSAGES);for(const m of fixture)assert.equal(live.includes(m.subject),false);});
