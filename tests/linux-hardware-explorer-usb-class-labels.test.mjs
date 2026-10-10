import test from 'node:test';
import assert from 'node:assert/strict';
import {usbClassContextLine,usbInterfacePresentation} from '../assets/linux-hardware-explorer/usb-presentation.js';
import {usbClassContext,matchKernelAliases} from '../assets/linux-hardware-explorer/kernel-alias-matcher.js';
import {correlateUsbReports} from '../assets/linux-hardware-explorer/usb-topology.js';

const brioReport=[
 'Bus 006 Device 003: ID 046d:085e Logitech, Inc. BRIO Ultra HD Webcam',
 '/:  Bus 006.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/4p, 10000M',
 ...[0,1,2].map(n=>` |__ Port 001: Dev 003, If ${n}, Class=Video, Driver=uvcvideo, 5000M`),
 ...[3,4].map(n=>` |__ Port 001: Dev 003, If ${n}, Class=Audio, Driver=snd-usb-audio, 5000M`),
 ' |__ Port 001: Dev 003, If 5, Class=Human Interface Device, Driver=usbhid, 5000M'
].join('\n');
const makeDevice=()=>({bus:'usb',vendor:'046d',device:'085e',usbAddress:'006:003',origins:['lsusb'],usbInterfaceClasses:[],usbInterfaceTriplets:[],binding:'unreported',boundDriver:null});
const brio=()=>{const d=makeDevice();correlateUsbReports({devices:[d],formats:[],warnings:[]},brioReport);return d;};

test('USB Video class 0e has a meaningful English and German explanation',()=>{
 const item={number:0,classCode:'0e'};
 assert.match(usbClassContextLine(item,'de'),/^Schnittstelle 0 · Video \(0x0E\): USB-Video/);
 assert.match(usbClassContextLine(item,'en'),/^Interface 0 · Video \(0x0E\): USB video/);
});
test('USB Audio 01 and HID 03 have localized context',()=>{
 for (const language of ['de','en']) {
  assert.match(usbClassContextLine({number:3,classCode:'01'},language),/Audio/);
  assert.match(usbClassContextLine({number:5,classCode:'03'},language),/HID/);
 }
});
test('unrecognized two-digit class codes always have explicit localized fallbacks',()=>{
 assert.equal(usbClassContextLine({number:2,classCode:'FE'},'de'),'Schnittstelle 2 · Unbekannte USB-Klasse (0xFE)');
 assert.equal(usbClassContextLine({number:2,classCode:'fe'},'en'),'Interface 2 · Unknown USB class (0xFE)');
});
test('missing and malformed class/number inputs never produce undefined or null',()=>{
 for(const lang of ['de','en'])for(const item of [null,{}, {number:0},{number:3,classCode:null},{number:2,classCode:'?'},{number:5,classCode:12},{number:255,classCode:'0e<script>'},{number:NaN,classCode:'0e'}]){
  const text=usbClassContextLine(item,lang);
  assert.ok(!/undefined|null|<script>/i.test(text),text);
  assert.match(text,/Interface|Schnittstelle/);
 }
});
test('all 256 valid USB class code values render without undefined, null, or exceptions',()=>{
 for(const language of ['de','en'])for(let n=0;n<256;n++){
  const text=usbClassContextLine({number:0,classCode:n.toString(16).padStart(2,'0')},language);
  assert.ok(!/undefined|null/i.test(text),text);
 }
});
test('BRIO six interface contexts and class-code order match observed topology',()=>{
 const d=brio(), contexts=usbClassContext(d);
 assert.deepEqual(contexts.map(c=>c.classCode),['0e','0e','0e','01','01','03']);
 for(const language of ['en','de'])assert.ok(contexts.every(c=>!usbClassContextLine(c,language).includes('undefined')));
 assert.deepEqual(d.usbInterfaces.map(i=>[i.subClass,i.protocol]),Array(6).fill([null,null]));
 const view=usbInterfacePresentation(d,'de');
 assert.equal(view.status,'6 USB-Schnittstellen mit gemeldeter Treiberbindung');
 assert.equal(view.distinctDrivers,3);
 assert.deepEqual(view.groups.map(g=>g.range),['0–2','3–4','5']);
});
test('valid unknown class is retained by class context without generating a candidate',()=>{
 const d={bus:'usb',vendor:'f00d',device:'00ff',usbInterfaces:[{number:1,classCode:'fe'}]};
 const contexts=usbClassContext(d);
 assert.equal(contexts.length,1);
 assert.match(usbClassContextLine(contexts[0],'de'),/Unbekannte USB-Klasse \(0xFE\)/);
 assert.deepEqual(matchKernelAliases(d,{schema:2,bus:'usb',generic:[],vendor:{}}).candidates,[]);
});
test('non-USB AMD Navi44 reports do not acquire USB class context',()=>{
 assert.deepEqual(usbClassContext({bus:'pci',vendor:'1002',device:'7590',boundDriver:'amdgpu'}),[]);
});
