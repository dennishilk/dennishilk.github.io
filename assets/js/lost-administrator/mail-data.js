export const MAIL_ACCOUNT = Object.freeze({ name:'Michael Weber', address:'michael.weber@chesapeakesignaltech.com' });
export const MAIL_FOLDERS = Object.freeze(['INBOX','SENT']);
// Messages support id, folder, from/to, date, subject, body, unread, attachments,
// and optional threadId, replyTo, and delivery metadata.
export const MAIL_MESSAGES = Object.freeze([Object.freeze({
 id:'EMMA0729',
 folder:'INBOX',
 from:Object.freeze({name:'Emma Weber',address:'robodad@michamailgate.com'}),
 to:MAIL_ACCOUNT,
 date:'2026-07-29T12:00:00-04:00',
 subject:'New printer cartridge?',
 body:"Hey Robodad,\n\nChloe and I were just about to print the new Major Tom pages, but the printer cartridge is empty. Do you know if there's a new one somewhere at home?\n\nI didn't want to just go to your desk and start looking through your things. :)\n\nEmma",
 unread:true,
 attachments:Object.freeze([]),
 delivery:Object.freeze({type:'forwarding-alias'})
})]);
