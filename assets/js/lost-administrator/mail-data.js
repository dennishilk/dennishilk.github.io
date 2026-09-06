export const MAIL_ACCOUNT = Object.freeze({ name:'Michael Weber', address:'michael.weber@chesapeakesignaltech.com' });
export const MAIL_FOLDERS = Object.freeze(['INBOX','EMMA','SENT']);
export const MAIL_FOLDER_METADATA = Object.freeze({
 EMMA:Object.freeze({countLabel:'hundreds of messages',size:'approximately 4.8 GB',description:'Drawings, questions, Byte photographs, technical-help requests, and everyday messages.'})
});

const emma=Object.freeze({name:'Emma Weber',address:'emma@michamailgate.com'});
const robodad=Object.freeze({name:'Michael Weber',address:'robodad@michamailgate.com'});
const printerThread='EMMA-PRINTER-20260731';

// A date without a time means the source material does not establish an exact
// time. Emma's original message has the canonical Day Zero morning timestamp.
export const MAIL_MESSAGES = Object.freeze([
 Object.freeze({
  id:'EMMA0731',folder:'EMMA',threadId:printerThread,threadOrder:1,
  from:emma,to:robodad,date:'2026-07-31T10:42:00-04:00',subject:'New printer cartridge?',
  body:"Hey Robodad,\n\nChloe and I were just about to print the new Major Tom pages, but the cartridge in her parents’ printer is empty.\n\nDo you still have one of the same kind in the cabinet in your office at home?\n\nI didn’t want to ride over and start looking through your things without asking. :)\n\nEmma",
  unread:false,attachments:Object.freeze([]),
  delivery:Object.freeze({type:'forwarding-alias',forwardedTo:MAIL_ACCOUNT})
 }),
 Object.freeze({
  id:'EMMA0731R1',folder:'EMMA',threadId:printerThread,threadOrder:2,replyTo:'EMMA0731',
  from:MAIL_ACCOUNT,to:emma,date:'2026-07-31',subject:'Re: New printer cartridge?',
  body:"Yes.\n\nOffice cabinet, top shelf. Gray box marked PRINTER. Take the unopened cartridge on the left.\n\nHelmet. Lock the door behind you.\n\nI’ll pick you up at 3:05.\n\nDad",
  unread:false,attachments:Object.freeze([])
 }),
 Object.freeze({
  id:'EMMA0731R2',folder:'EMMA',threadId:printerThread,threadOrder:3,replyTo:'EMMA0731R1',
  from:emma,to:robodad,date:'2026-07-31',subject:'Re: New printer cartridge?',
  body:"Thanks, Dad.\n\nChloe says thank you too.\n\nMajor Tom reports that the printing systems may still be recoverable.",
  unread:true,attachments:Object.freeze([]),delivery:Object.freeze({type:'forwarding-alias',forwardedTo:MAIL_ACCOUNT})
 })
]);
