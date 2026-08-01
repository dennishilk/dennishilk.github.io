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
test('mail shell command enters mode and shell help advertises it',()=>{const e=new ShellEngine(defaultWorkstationState());assert.equal(e.execute('mail').enterMail,true);assert.match(text(e.execute('help')),/mail    Open the company mail client/);});
test('live mailbox is honestly empty and has the approved account configuration',()=>{assert.deepEqual(MAIL_MESSAGES,[]);assert.equal(MAIL_ACCOUNT.address,'michael.weber@chesapeakesignaltech.com');const c=new MailClient(defaultWorkstationState());assert.match(text(c.start()),/No messages in INBOX/);});
test('listing retains stable IDs and opening marks a message read',()=>{const c=client();assert.match(text(c.start()),/T-200.*N.*Routine update/);assert.match(text(c.execute('search alpha')),/T-200/);assert.match(text(c.execute('open T-200')),/MESSAGE 1 OF 1/);assert.equal(c.state.mail.read['T-200'],true);assert.match(text(c.execute('attachments')),/sample.txt  12 B/);assert.match(text(c.execute('back')),/T-200/);});
test('navigation, folders, search, attachments and errors are deterministic',()=>{const c=client();c.start();c.execute('open T-200');assert.match(text(c.execute('next')),/Earlier note/);assert.match(text(c.execute('next')),/end of the list/);assert.match(text(c.execute('previous')),/Routine update/);assert.match(text(c.execute('previous')),/beginning/);assert.match(text(c.execute('folder sent')),/T-300/);assert.match(text(c.execute('folder nowhere')),/unknown folder/);c.execute('folder inbox');assert.match(text(c.execute('search fixture beta')),/T-100/);assert.match(text(c.execute('search from:second')),/T-100/);assert.match(text(c.execute('search absent')),/No messages matched/);assert.match(text(c.execute('attachments')),/open a message/);assert.match(text(c.execute('nonesuch')),/unknown command/);assert.equal(c.execute('q').quitMail,true);});
test('default state reset restores canonical unread status',()=>{const c=client();c.start();c.execute('open T-200');assert.equal(c.isUnread(fixture[0]),false);const reset=client();assert.equal(reset.isUnread(fixture[0]),true);});
test('test fixture prose cannot leak into live mailbox data',()=>{const live=JSON.stringify(MAIL_MESSAGES);for(const m of fixture)assert.equal(live.includes(m.subject),false);});
