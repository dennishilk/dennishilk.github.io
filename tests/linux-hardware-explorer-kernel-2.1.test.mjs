import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchKernelAliases, aliasFields, usbClassContext } from '../assets/linux-hardware-explorer/kernel-alias-matcher.js';
import { correlateUsbReports } from '../assets/linux-hardware-explorer/usb-topology.js';
import { enrichKernelResults, INDEX_STATIC_REQUEST_PATHS, loadKernelIndex } from '../assets/linux-hardware-explorer/kernel-index-loader.js';
const location=new URL('../assets/linux-hardware-explorer/kernel-index/',import.meta.url);
const json=name=>JSON.parse(readFileSync(new URL(name,location),'utf8'));
const manifest=json('manifest.json'),indexes=Object.fromEntries(['pci','usb','hid'].map(k=>[k,json(k+'.json')]));
const snapshot={manifest,indexes};
const dev=(vendor,device,extra={})=>({bus:'usb',vendor,device,usbInterfaceTriplets:[],usbInterfaces:[],origins:['lsusb'],...extra});
const parse=(input,devices)=>correlateUsbReports({devices,formats:['lsusb'],warnings:[]},input);
const match=(d,bus=d.bus)=>matchKernelAliases(d,indexes[bus],{bus});
const candidates=d=>match(d).candidates.map(c=>c.module);

test('real Debian kernel-build provenance and deterministic schema-2 partitions',()=>{
 assert.equal(manifest.kernelRelease,'6.12.107+deb13-amd64');
 assert.equal(manifest.source.modulesAlias.sha256,'73e4a296d0d2b1c90d45fc73a7a29585ab367157da6f843aec2156c67d4164ff');
 assert.equal(manifest.counts.total,19056);
 assert.equal(Object.values(manifest.counts.byBus).reduce((a,b)=>a+b,0),19056);
 assert.equal(manifest.counts.builtinRows,0); // Kernel artifact provides no built-in bus aliases.
 assert.deepEqual(INDEX_STATIC_REQUEST_PATHS,['manifest.json','pci.json','usb.json','hid.json']);
 for(const bus of ['pci','usb','hid'])assert.equal(indexes[bus].schema,2);
});

test('CH340 true kernel alias is a candidate, binding requires topology report',()=>{
 const d=dev('1a86','7523',{usbAddress:'001:009',reportedLabel:'QinHeng CH340'});
 assert.ok(candidates(d).includes('ch341'));assert.equal(d.boundDriver,undefined);
 parse('/:  Bus 001.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/10p, 480M\n |__ Port 004: Dev 009, If 0, Class=Vendor Specific Class, Driver=ch341, 12M',[d]);
 assert.deepEqual(d.interfaceBindings,[{number:0,driver:'ch341',binding:'reported-bound',evidence:'lsusb -t'}]);
 assert.equal(d.usbInterfaces[0].classCode,'ff');assert.equal(d.boundDriver,undefined);assert.equal(JSON.stringify(d).includes('ttyUSB0'),false);
});

test('global class aliases: usbhid, mass storage, USB audio, Bluetooth and CDC Ethernet',()=>{
 const checks=[['03',null,null,'usbhid'],['08','06','50','usb_storage'],['01','01','00','snd_usb_audio'],['e0','01','01','btusb'],['02','06','00','cdc_ether']];
 for(const [cls,sub,proto,mod]of checks){
  const d=dev('ffff','0001',{usbInterfaces:[{number:0,classCode:cls,subClass:sub,protocol:proto}]});
  assert.ok(candidates(d).includes(mod),`${cls}/${sub}/${proto}: ${mod}`);
 }
});

test('class constraints cannot match when only the class is known and subclass/protocol are required',()=>{
 const d=dev('ffff','0001',{usbInterfaces:[{number:0,classCode:'02'}]});
 assert.ok(!candidates(d).includes('cdc_ether'));
 d.usbInterfaces[0].subClass='06';d.usbInterfaces[0].protocol='00';
 assert.ok(candidates(d).includes('cdc_ether'));
});

test('vendor-specific device class rejects class-only aliases even with interface descriptors',()=>{
 const d=dev('ffff','0001',{usbDeviceClassTriplet:'ff:00:00',usbInterfaces:[{number:0,classCode:'03',subClass:'00',protocol:'00'}]});
 assert.ok(!candidates(d).includes('usbhid'));
 // A real reported usbhid remains observed independently of alias candidates.
 parse('/:  Bus 001.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/4p, 480M\n |__ Port 001: Dev 002, If 0, Class=Human Interface Device, Driver=usbhid, 12M',[]);
});

test('USB modalias full field matching includes revision, interface number and character ranges',()=>{
 const d=dev('1234','5678',{revision:'1204',usbDeviceClassTriplet:'00:00:00',usbInterfaces:[{number:1,classCode:'03',subClass:'01',protocol:'01'}]});
 const pattern='usb:v1234p5678d12[0-9]4dc00dsc00dp00ic03isc01ip01in01';
 const fixture={schema:2,bus:'usb',vendor:{'1234':{exact:{'5678':[[pattern,'demo','module']]},broad:[]}},generic:[]};
 assert.equal(matchKernelAliases(d,fixture).candidates[0]?.module,'demo');
 assert.deepEqual(matchKernelAliases({...d,usbInterfaces:[{number:0,classCode:'03',subClass:'01',protocol:'01'}]},fixture).candidates,[]);
 assert.deepEqual(matchKernelAliases({...d,revision:null},fixture).candidates,[]);
 assert.deepEqual(matchKernelAliases({...d,revision:'1304'},fixture).candidates,[]);
 assert.equal(aliasFields(pattern,'usb').in,'01');
});

test('HID aliases are not inferred from USB VID/PID alone; explicit HID modalias is needed',()=>{
 const known=dev('1b1c','0c39');
 assert.equal(matchKernelAliases(known,indexes.hid,{bus:'hid'}).candidates.length,0);
 const d={...known,hidModalias:'hid:b0003g0001v00001B1Cp00000C39'};
 // Kernel HID index is searched with exact HID modalias. Match may be generic only.
 const result=matchKernelAliases(d,indexes.hid,{bus:'hid'});
 assert.ok(result.candidates.some(c=>c.module==='hid_generic'));
 assert.ok(result.candidates.every(c=>c.bus==='hid'));
});

test('two buses reuse USB device number without merging interfaces',()=>{
 const a=dev('1a86','7523',{usbAddress:'001:009'}),b=dev('04d9','a09c',{usbAddress:'002:009'});
 parse('/:  Bus 001.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/4p, 480M\n |__ Port 003: Dev 009, If 0, Class=Vendor Specific Class, Driver=ch341, 12M\n/:  Bus 002.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/4p, 480M\n |__ Port 001: Dev 009, If 0, Class=Human Interface Device, Driver=usbhid, 12M',[a,b]);
 assert.deepEqual(a.interfaceBindings.map(x=>x.driver),['ch341']);assert.deepEqual(b.interfaceBindings.map(x=>x.driver),['usbhid']);
});

test('USB composite interfaces keep independent binding and unknown state',()=>{
 const d=dev('abcd','0123',{usbAddress:'001:004'});
 parse('/:  Bus 001.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/4p, 480M\n |__ Port 001: Dev 004, If 0, Class=Audio, Driver=snd_usb_audio, 480M\n |__ Port 001: Dev 004, If 1, Class=HID, Driver=usbhid, 480M\n |__ Port 001: Dev 004, If 2, Class=Mass Storage, Driver=(none), 480M',[d]);
 assert.deepEqual(d.interfaceBindings.map(x=>x.driver),['snd_usb_audio','usbhid',null]);
 assert.equal(d.interfaceBindings[2].binding,'reported-unbound');
 assert.equal(d.binding,undefined);assert.equal(d.usbInterfaces[2].classCode,'08');
});

test('root hubs are host-controller context, not regular external USB interfaces',()=>{
 const d=dev('1d6b','0002',{usbAddress:'001:001'});
 const parsed=parse('/:  Bus 001.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/10p, 480M',[d]);
 assert.equal(d.rootHub,true);assert.equal(d.hostControllerDriver,'xhci_hcd');assert.deepEqual(d.interfaceBindings,[]);
 assert.deepEqual(parsed.formats,['lsusb','lsusb-t']);
});

test('only topology input yields useful anonymous devices without made-up numeric identity',()=>{
 const parsed=parse('/:  Bus 001.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/4p, 480M\n |__ Port 001: Dev 006, If 0, Class=Human Interface Device, Driver=usbhid, 12M',[]);
 const mouse=parsed.devices.find(d=>d.usbAddress==='001:006');
 assert.equal(mouse.vendor,null);assert.equal(mouse.device,null);assert.equal(mouse.interfaceBindings[0].driver,'usbhid');
 assert.equal(match(mouse).candidates.length,0);
});

test('Cthulhu complete USB zoo: reported bindings and no invented RGB/LCD/fan support',()=>{
 const inputs=[['1a86','7523','ch341','Vendor Specific Class'],['04d9','a09c','usbhid','Human Interface Device'],
 ['05e3','0608','hub','Hub'],['048d','5702','usbhid','Human Interface Device'],
 ['1e7d','2e24','usbhid','Human Interface Device'],['1b1c','0c39','usbhid','Human Interface Device'],
 ['1b1c','0c1c','usbhid','Human Interface Device']];
 const devices=inputs.map(([v,p],i)=>dev(v,p,{usbAddress:`001:${String(i+2).padStart(3,'0')}`}));
 const raw='/:  Bus 001.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/10p, 480M\n'+inputs.map(([, ,driver,cls],i)=>` |__ Port ${i+2}: Dev ${i+2}, If 0, Class=${cls}, Driver=${driver}, 12M`).join('\n');
 parse(raw,devices);
 for(let i=0;i<inputs.length;i++)assert.equal(devices[i].interfaceBindings[0].driver,inputs[i][2]);
 for(const d of devices)assert.equal(JSON.stringify(d).includes('featureWorking'),false);
 assert.equal(candidates(devices[0]).includes('ch341'),true);
 assert.equal(usbClassContext(devices[1])[0].classCode,'03');
 assert.equal(usbClassContext(devices[2])[0].classCode,'09');
});

test('Navi44 no unrelated GPU family and preserves source snapshot boundary',async()=>{
 const gpu={bus:'pci',vendor:'1002',device:'7590',subsystemVendor:'148c',subsystemDevice:'2437',classCode:'0300'};
 const r=match(gpu);assert.equal(r.candidates.length,0);
 const enriched=await enrichKernelResults([{device:gpu,boundDriver:'amdgpu',matches:[{profileId:'amd-navi44',reason:'family-id'}]}],{snapshot});
 assert.equal(enriched[0].kernelEvidence.kernelRelease,'6.12.107+deb13-amd64');
 assert.equal(enriched[0].boundDriver,'amdgpu');assert.equal(enriched[0].matches[0].profileId,'amd-navi44');
});

test('no hardware-dependent path selection or network payloads',async()=>{
 const requests=[];
 const fetcher=async(url,options)=>{
  requests.push({url:String(url),options});
  const name=String(url).split('/').at(-1);
  return {ok:true,text:async()=>readFileSync(new URL(name,location),'utf8')};
 };
 // First call always requests the same index URLs, without serials or pasted vendor IDs.
 const data=await loadKernelIndex(fetcher);
 assert.equal(data.manifest.kernelRelease,manifest.kernelRelease);
 assert.deepEqual(requests.map(x=>x.url.split('/').at(-1)),INDEX_STATIC_REQUEST_PATHS);
 assert.equal(JSON.stringify(requests).includes('1a86'),false);
 assert.equal(JSON.stringify(requests).includes('7523'),false);
 assert.ok(requests.every(x=>!x.url.includes('?')&&!x.options.body));
});

test('oversized and malformed report data remains bounded; aggressive alias patterns rejected',()=>{
 const d=dev('1234','5678',{usbInterfaces:[{number:0,classCode:'03'}]});
 const fixture={schema:2,bus:'usb',vendor:{'1234':{exact:{'5678':[['usb:v1234p5678d*dc*dsc*dp*ic*isc*ip*in*(?:evil)','bad','module']]},broad:[]}},generic:[]};
 assert.equal(matchKernelAliases(d,fixture).candidates.length,0);
 const long='/:  Bus 001.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/4p, 480M\n'+Array.from({length:3000},(_,i)=>` |__ Port ${i}: Dev 002, If ${i}, Class=HID, Driver=usbhid, 12M`).join('\n');
 const parsed=parse(long,[]);
 assert.ok(parsed.devices.length<=512);assert.ok((parsed.devices.find(d=>d.usbAddress==='001:002')?.usbInterfaces.length||0)<=256);
});

test('512-device report alias matching has bounded runtime',()=>{
 const all=Array.from({length:512},(_,i)=>dev('1a86',i%2?'7523':'5523',{usbInterfaces:[{number:0,classCode:'ff'}]}));
 const start=performance.now();for(const d of all)match(d);
 const elapsed=performance.now()-start;
 assert.ok(elapsed<5000,`512 devices took ${elapsed.toFixed(0)} ms`);
});

test('contradictory repeated interface bindings remain conflicting instead of picking a winner',()=>{
 const d=dev('1234','5678',{usbAddress:'003:005'});
 const report='/:  Bus 003.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/4p, 480M\n'+
  ' |__ Port 003: Dev 005, If 0, Class=HID, Driver=usbhid, 12M\n'+
  ' |__ Port 003: Dev 005, If 0, Class=HID, Driver=otherdriver, 12M';
 parse(report,[d]);
 assert.equal(d.interfaceBindings[0].binding,'conflicting');assert.equal(d.interfaceBindings[0].driver,null);
});

test('kernel index unavailability does not destroy observed binding and curated identity',async()=>{
 const d=dev('1a86','7523',{interfaceBindings:[{number:0,driver:'ch341',binding:'reported-bound',evidence:'lsusb -t'}]});
 const original={device:d,coverage:'curated-family',matches:[{profileId:'example',reason:'family-id'}],binding:'unreported'};
 const isolated=await import('../assets/linux-hardware-explorer/kernel-index-loader.js?isolated-offline-test');
 const result=await isolated.enrichKernelResults([original],{fetcher:async()=>{throw Error('offline');}});
 assert.equal(result[0].kernelEvidence.state,'index-unavailable');
 assert.deepEqual(result[0].matches,original.matches);
 assert.equal(result[0].device.interfaceBindings[0].driver,'ch341');
});

test('both Linux 2.0 and 3.0 root hub IDs retain their separate host-controller contexts',()=>{
 const a=dev('1d6b','0002',{usbAddress:'001:001'}),b=dev('1d6b','0003',{usbAddress:'002:001'});
 parse('/:  Bus 001.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/10p, 480M\n/:  Bus 002.Port 001: Dev 001, Class=root_hub, Driver=xhci_hcd/4p, 5000M',[a,b]);
 for(const d of [a,b]){assert.equal(d.rootHub,true);assert.equal(d.hostControllerDriver,'xhci_hcd');assert.deepEqual(d.interfaceBindings,[]);}
});
