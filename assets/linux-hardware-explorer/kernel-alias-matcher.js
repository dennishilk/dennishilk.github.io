// Pure kernel-generated alias lookup. Do not treat candidate, binding and operation as synonyms.
// Parsing rules use the exact buses and field sequence emitted by Linux file2alias.c.
const MODULE=/^[a-zA-Z0-9_.-]{1,100}$/;
const PATTERN=/^(?:pci|usb|hid):[A-Za-z0-9*?\[\]-]{1,240}$/;
const HEX={two:/^[0-9a-f]{2}$/i,four:/^[0-9a-f]{4}$/i,eight:/^[0-9a-f]{8}$/i};
const patterns=new Map();
const fieldFormats={
 pci:[['v',8],['d',8],['sv',8],['sd',8],['bc',2],['sc',2],['i',2]],
 usb:[['v',4],['p',4],['d',4],['dc',2],['dsc',2],['dp',2],['ic',2],['isc',2],['ip',2],['in',2]],
 hid:[['b',4],['g',4],['v',8],['p',8]]
};
const validHex=(v,n)=>typeof v==='string'&&new RegExp(`^[0-9a-f]{${n}}$`,'i').test(v)?v.toUpperCase():null;
const mark=(v,n)=>({value:validHex(v,n),known:Boolean(validHex(v,n))});
const unknown=n=>({value:'0'.repeat(n),known:false});
function compiled(glob){
 if(!PATTERN.test(glob))return null;
 if(patterns.has(glob))return patterns.get(glob);
 let result=null;
 try{
  // Linux shell glob: '*' '?' and bracket groups; no executable regex input.
  const regexp='^'+glob.replace(/[\\.^$+{}()|]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$';
  result=new RegExp(regexp,'i');
 }catch{} if(patterns.size>24000)patterns.clear();patterns.set(glob,result);return result;
}
// Source-field segmentation prevents missing information being replaced by plausible zeroes.
export function aliasFields(pattern,bus){
 const tokens=fieldFormats[bus]; if(!tokens||typeof pattern!=='string'||!pattern.startsWith(bus+':'))return null;
 const prefix=bus+':';let cursor=prefix.length;const values={};
 for(let i=0;i<tokens.length;i++){
  const marker=tokens[i][0],needle=i+1<tokens.length?tokens[i+1][0]:null;
  if(pattern.slice(cursor,cursor+marker.length)!==marker)return null;
  cursor+=marker.length;
  let end=needle?pattern.indexOf(needle,cursor):pattern.length;
  if(end<cursor)return null;
  const value=pattern.slice(cursor,end);
  if(!value||!/^[A-Za-z0-9*?\[\]-]+$/.test(value))return null;
  values[marker]=value;cursor=end;
 }
 return cursor===pattern.length?values:null;
}
function pciFields(d){
 if(!HEX.four.test(d?.vendor||'')||!HEX.four.test(d?.device||''))return null;
 const c=/^[a-f0-9]{4,6}$/i.test(d.classCode||'')?d.classCode:'';
 const subvendor=validHex(d.subsystemVendor,4),subdevice=validHex(d.subsystemDevice,4);
 const pi=validHex(d.programmingInterface,2)||validHex(c.slice(4,6),2);
 return {v:mark('0000'+d.vendor,8),d:mark('0000'+d.device,8),
  sv:subvendor?mark('0000'+subvendor,8):unknown(8),sd:subdevice?mark('0000'+subdevice,8):unknown(8),
  bc:c.length>=2?mark(c.slice(0,2),2):unknown(2),sc:c.length>=4?mark(c.slice(2,4),2):unknown(2),
  i:pi?mark(pi,2):unknown(2)};
}
function usbFields(d,iface){
 if(!HEX.four.test(d?.vendor||'')||!HEX.four.test(d?.device||''))return null;
 const dc=(d.usbDeviceClassTriplet||'').split(':');
 const t=(iface?.triplet||'').split(':');
 const fallbackClass=validHex(d.classCode,2);
 const number=typeof iface?.number==='number'&&Number.isInteger(iface.number)&&iface.number>=0&&iface.number<=255?iface.number.toString(16).padStart(2,'0'):null;
 return {v:mark(d.vendor,4),p:mark(d.device,4),d:validHex(d.revision,4)?mark(d.revision,4):unknown(4),
  dc:validHex(dc[0],2)?mark(dc[0],2):fallbackClass?mark(fallbackClass,2):unknown(2),
  dsc:validHex(dc[1],2)?mark(dc[1],2):unknown(2),dp:validHex(dc[2],2)?mark(dc[2],2):unknown(2),
  ic:validHex(t[0],2)?mark(t[0],2):validHex(iface?.classCode,2)?mark(iface.classCode,2):unknown(2),
  isc:validHex(t[1],2)?mark(t[1],2):validHex(iface?.subClass,2)?mark(iface.subClass,2):unknown(2),
  ip:validHex(t[2],2)?mark(t[2],2):validHex(iface?.protocol,2)?mark(iface.protocol,2):unknown(2),in:number?mark(number,2):unknown(2)};
}
function fieldsValue(fields,spec){return spec.map(([key])=>key+(fields[key]?.value||'')).join('');}
function validFullModalias(modalias,bus){
 if(typeof modalias!=='string'||modalias.length>260||!modalias.startsWith(bus+':'))return false;
 // Complete exact observed modalias only; never accept user wildcard aliases.
 const format=bus==='pci'?/^pci:v[0-9a-f]{8}d[0-9a-f]{8}sv[0-9a-f]{8}sd[0-9a-f]{8}bc[0-9a-f]{2}sc[0-9a-f]{2}i[0-9a-f]{2}$/i:
  bus==='usb'?/^usb:v[0-9a-f]{4}p[0-9a-f]{4}d[0-9a-f]{4}dc[0-9a-f]{2}dsc[0-9a-f]{2}dp[0-9a-f]{2}ic[0-9a-f]{2}isc[0-9a-f]{2}ip[0-9a-f]{2}in[0-9a-f]{2}$/i:
  /^hid:b[0-9a-f]{4}g[0-9a-f]{4}v[0-9a-f]{8}p[0-9a-f]{8}$/i;
 return format.test(modalias);
}
const fullValue=(d,bus,iface)=>{
 const modalias=bus==='hid'?(iface?.hidModalias || d?.hidModalias):bus==='usb'?(iface?.modalias||d?.modalias):d?.modalias;
 return validFullModalias(modalias,bus)?modalias:null;
};
function matching(pattern,observation,bus){
 const re=compiled(pattern),parts=aliasFields(pattern,bus);if(!re||!parts)return false;
 if(observation.full){
  // USB core excludes class-only matching of vendor-specific bDeviceClass FF interfaces.
  // Check even when a full valid modalias exists.
  if(bus==='usb'&&/^usb:.*dcFF/i.test(observation.full)&&parts.v==='*'&&['ic','isc','ip','in'].some(k=>parts[k]!=='*'))return false;
  return re.test(observation.full);
 }
 const fs=observation.fields;if(!fs)return false;
 for(const [name,v]of Object.entries(fs))if(!v.known&&parts[name]!=='*')return false;
 if(bus==='usb'&&fs.dc.known&&fs.dc.value==='FF'&&parts.v==='*'&&['ic','isc','ip','in'].some(k=>parts[k]!=='*'))return false;
 return re.test(bus+':'+fieldsValue(fs,fieldFormats[bus]));
}
function safeInterfaces(d){
 if(d.bus!=='usb')return [null];
 const entries=[];
 for(const i of d.usbInterfaces||[]){
  if(!Number.isInteger(i.number)||i.number<0||i.number>255)continue;
  const cls=validHex(i.classCode,2),sub=validHex(i.subClass,2),proto=validHex(i.protocol,2);
  entries.push({number:i.number,triplet:cls&&sub&&proto?`${cls}:${sub}:${proto}`:null,classCode:cls,subClass:sub,protocol:proto,modalias:i.modalias});
 }
 if(entries.length)return entries;
 // Unnumbered USB descriptor triplets can support a class match, never an interface number.
 for(const t of d.usbInterfaceTriplets||[])if(/^[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}$/i.test(t))entries.push({triplet:t});
 return entries.length?entries:[null];
}
function collected(index,bus,d){
 const generic=index.generic||[],vendors=index.vendor||{};
 let v=null,p=null;
 if(bus==='pci'&&HEX.four.test(d.vendor||'')&&HEX.four.test(d.device||'')){v=d.vendor.toLowerCase();p='0000'+d.device.toLowerCase();}
 if(bus==='usb'&&HEX.four.test(d.vendor||'')&&HEX.four.test(d.device||'')){v=d.vendor.toLowerCase();p=d.device.toLowerCase();}
 if(bus==='hid'){
  const m=(d.hidModalias||'').match(/^hid:b[0-9a-f]{4}g[0-9a-f]{4}v([0-9a-f]{8})p([0-9a-f]{8})$/i);
  if(m){v=m[1].toLowerCase();p=m[2].toLowerCase();}
 }
 const group=v?vendors[v]:null;
 return [...(group?.exact?.[p]||[]),...(group?.broad||[]),...generic];
}
export function matchKernelAliases(d,index,{bus=d?.bus,maxCandidates=16}={}){
 if(!index||index.schema!==2||index.bus!==bus||!['pci','usb','hid'].includes(bus))return {candidates:[],total:0,truncated:false};
 if(bus==='hid'&&!validFullModalias(d.hidModalias,'hid'))return {candidates:[],total:0,truncated:false,reason:'hid-modalias-needed'};
 if(bus!=='hid'&&(!HEX.four.test(d?.vendor||'')||!HEX.four.test(d?.device||'')))return {candidates:[],total:0,truncated:false,reason:'ids-needed'};
 const candidates=new Map();const seenPatterns=new Set();
 const interfaces=bus==='usb'?safeInterfaces(d):[null];
 for(const entry of collected(index,bus,d)){
  if(!Array.isArray(entry)||entry.length!==3)continue;
  const [pattern,module,kind]=entry;
  if(typeof pattern!=='string'||!MODULE.test(module)||!['module','builtin'].includes(kind)||seenPatterns.has(JSON.stringify(entry)))continue;
  seenPatterns.add(JSON.stringify(entry));
  for(const iface of interfaces){
   const full=fullValue(d,bus,iface);
   let fields=bus==='pci'?pciFields(d):bus==='usb'?usbFields(d,iface):null;
   const obs={full,fields};if(!matching(pattern,obs,bus))continue;
   const number=iface?.number??null;
   const key=module+'\0'+kind+'\0'+number+'\0'+bus;
   if(!candidates.has(key))candidates.set(key,{module,kind,bus,scope:bus==='usb'?'usb-interface-candidate':bus==='hid'?'hid-device-candidate':'pci-device-candidate',interfaceNumber:number,pattern,evidence:'kernel-build-alias'});
  }
 }
 const sorted=[...candidates.values()].sort((a,b)=>a.module.localeCompare(b.module)||a.kind.localeCompare(b.kind)||(a.interfaceNumber??-1)-(b.interfaceNumber??-1));
 return {candidates:sorted.slice(0,maxCandidates),total:sorted.length,truncated:sorted.length>maxCandidates};
}

// Kernel USB *core* behavior context; not a fabricated modules.alias candidate.
export function usbClassContext(d){
 if(d.bus!=='usb')return [];
 const interfaces=d.usbInterfaces||[];
 const list=[];
 const groups=new Map();
 for(const i of interfaces){
  if(!validHex(i.classCode,2))continue;
  const cls=i.classCode.toLowerCase();
  const name=({ '03':'USB HID interface (HID transport; HID subdriver not identified)',
   '09':'USB hub class (USB core behavior; not an alias-derived module candidate)',
   '08':'USB mass-storage class (protocol/subclass still required for precise matching)',
   '01':'USB audio class (interface subclass/protocol may select a different driver)',
   '0e':'USB video class (subclass and protocol needed for a precise UVC alias match)',
   '02':'USB CDC communications interface (subclass/protocol needed)',
   '0a':'USB CDC data interface (paired control interface may be required)',
   'e0':'USB wireless-controller class (subclass/protocol needed)',
   'ff':'Vendor-specific interface (class does not identify features)' })[cls];
  // Preserve unknown but valid USB class codes for explicit UI fallback.
  if(!groups.has(i.number)){groups.set(i.number,true);list.push({number:i.number,classCode:cls,explanation:name||'Unrecognized USB class; no driver inferred'});}
 }
 return list;
}
