// Correlate read-only lsusb and lsusb -t observations. No USB ID => no inferred identity.
const HEX2=/^[0-9a-f]{2}$/i;
const CLASS={
 'human interface device':'03',hid:'03',hub:'09','mass storage':'08',massstorage:'08',audio:'01',
 'communications':'02','communications and cdc control':'02',cdc:'02',data:'0a',
 'wireless':'e0','wireless controller':'e0','vendor specific class':'ff','vendor specific':'ff',
 'per interface':'00'
};
const cleanDriver=x=>/^[a-z0-9_.-]{1,64}$/i.test(x)&&!['none','unbound','unknown'].includes(x.toLowerCase())?x:null;
function blank(bus,dev){
 return {bus:'usb',vendor:null,device:null,classCode:null,subsystemVendor:null,subsystemDevice:null,revision:null,bdf:null,
 usbAddress:`${bus}:${dev}`,reportedLabel:'',boundDriver:null,binding:'unreported',reportedModules:[],usbInterfaceClasses:[],usbInterfaceTriplets:[],
 usbDeviceClassTriplet:null,programmingInterface:null,origins:['lsusb-t'],usbInterfaces:[]};
}
function appendInterface(d,number){
 d.usbInterfaces||=[];
 let target=d.usbInterfaces.find(i=>i.number===number);
 if(!target){target={number,classCode:null,subClass:null,protocol:null,binding:'unreported',driver:null};d.usbInterfaces.push(target);}
 return target;
}
function addClass(i,label){
 const code=CLASS[label.trim().toLowerCase()];
 if(code&&!i.classCode)i.classCode=code;
}
const setNumeric=(i,key,str)=>{
 const decimal=/^(?:0x[0-9a-f]+|\d+)$/i.test(str)?(/^0x/i.test(str)?Number.parseInt(str.slice(2),16):Number(str)):NaN;
 if(Number.isInteger(decimal)&&decimal>=0&&decimal<=255)i[key]=decimal.toString(16).padStart(2,'0');
};

export function correlateUsbReports(parsed,raw){
 if(!parsed||!Array.isArray(parsed.devices)||typeof raw!=='string')return parsed;
 const lines=raw.split(/\r\n|\n|\r/).slice(0,20000).map(s=>s.slice(0,4096));
 const byAddr=new Map();
 for(const d of parsed.devices)if(d.bus==='usb'&&/^\d{3}:\d{3}$/.test(d.usbAddress||'')){
  const arr=byAddr.get(d.usbAddress)||[];arr.push(d);byAddr.set(d.usbAddress,arr);
 }
 const ensure=(bus,dev)=>{
  const addr=`${bus}:${dev}`;const available=byAddr.get(addr)||[];
  if(available.length>1)return null; // ambiguous duplicate records must not inherit another binding
  if(available.length===1)return available[0];
  if(parsed.devices.length>=512)return null;
  const created=blank(bus,dev);parsed.devices.push(created);byAddr.set(addr,[created]);return created;
 };
 // Additional numbered descriptor data from `lsusb -v` without serial or string retention.
 let current=null,activeInterface=null;
 for(const line of lines){
  const header=line.match(/^Bus\s+(\d{3})\s+Device\s+(\d{3}):\s+ID\s+[0-9a-f]{4}:[0-9a-f]{4}/i);
  if(header){current=byAddr.get(`${header[1]}:${header[2]}`)?.length===1?byAddr.get(`${header[1]}:${header[2]}`)[0]:null;activeInterface=null;continue;}
  if(!current)continue;
  let m=line.match(/^\s*bInterfaceNumber\s+(\d{1,3})\b/);
  if(m){const num=Number(m[1]);activeInterface=num<=255?appendInterface(current,num):null;continue;}
  m=line.match(/^\s*(bInterfaceClass|bInterfaceSubClass|bInterfaceProtocol)\s+(0x[0-9a-f]+|\d+)\b/i);
  if(!m||!activeInterface)continue;
  setNumeric(activeInterface,({binterfaceclass:'classCode',binterfacesubclass:'subClass',binterfaceprotocol:'protocol'})[m[1].toLowerCase()],m[2]);
 }
 let bus=null;
 for(const line of lines){
  const root=line.match(/^\s*\/:\s*Bus\s+(\d{3})\.Port\s+\d{1,3}:\s+Dev\s+(\d{1,3}),\s*Class=root_hub,\s*Driver=([^,\s]+)/i);
  if(root){
   bus=root[1];const d=ensure(bus,root[2].padStart(3,'0'));if(!d)continue;
   d.rootHub=true;
   const name=root[3].replace(/\/\d+p?$/,'');const driver=cleanDriver(name);
   if(driver){d.hostControllerDriver=driver;d.hostControllerEvidence='lsusb -t';}
   if(!d.origins.includes('lsusb-t'))d.origins.push('lsusb-t');
   continue;
  }
  // Never borrow the previous root bus across a new root line with unknown syntax.
  if(/^\s*\/:/.test(line)){bus=null;continue;}
  if(!bus)continue;
  const m=line.match(/\bDev\s+(\d{1,3}),\s*If\s+(\d{1,3}),\s*Class=([^,]{1,80}),\s*Driver=([^,\s]{1,80})/i);
  if(!m)continue;
  const num=Number(m[2]);if(num>255)continue;
  const d=ensure(bus,m[1].padStart(3,'0'));if(!d)continue;
  const item=appendInterface(d,num);addClass(item,m[3]);
  const rawDriver=m[4].replace(/\/\d+p?$/,''); const driver=cleanDriver(rawDriver);
  if(driver){
   if(item.binding==='reported-bound'&&item.driver!==driver){item.binding='conflicting';item.driver=null;}
   else if(item.binding!=='conflicting'){item.binding='reported-bound';item.driver=driver;}
  }else if(/^(\(none\)|none|unbound)$/i.test(rawDriver)){
   if(item.binding==='reported-bound'){item.binding='conflicting';item.driver=null;}
   else if(item.binding!=='conflicting'){item.binding='reported-unbound';item.driver=null;}
  }
  item.evidence='lsusb -t';
  if(!d.origins.includes('lsusb-t'))d.origins.push('lsusb-t');
 }
 for(const d of parsed.devices){
  if(d.bus!=='usb')continue;
  d.usbInterfaces?.sort((a,b)=>a.number-b.number);
  d.interfaceBindings=(d.usbInterfaces||[]).filter(i=>i.binding!=='unreported').map(i=>({number:i.number,driver:i.driver,binding:i.binding,evidence:i.evidence||'lsusb -t'}));
  d.usbInterfaceClasses=[...new Set([...(d.usbInterfaceClasses||[]),...(d.usbInterfaces||[]).map(i=>i.classCode).filter(Boolean)])];
  // Do not fake USB interface subclasses or numbers; only add complete observed triplets.
  d.usbInterfaceTriplets=[...new Set([...(d.usbInterfaceTriplets||[]),...(d.usbInterfaces||[]).filter(i=>i.classCode&&i.subClass&&i.protocol).map(i=>[i.classCode,i.subClass,i.protocol].join(':'))])];
 }
 if(parsed.devices.some(d=>d.origins?.includes('lsusb-t'))){
  parsed.formats=[...new Set([...(parsed.formats||[]),'lsusb-t'])];
  parsed.warnings=(parsed.warnings||[]).filter(w=>w!=='no-devices-recognized');
 }
 parsed.devices.forEach((d,i)=>d.index=i);
 return parsed;
}
