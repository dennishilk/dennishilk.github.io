// Browser-local composite USB presentation: observed bindings are not alias matches.
const names={ '01':'Audio','03':'HID','08':'Mass storage','09':'Hub','0e':'Video',
 '02':'CDC communications','0a':'CDC data','e0':'Wireless','ff':'Vendor-specific',
 '07':'Printer','06':'Imaging'};
const german={ '08':'Massenspeicher','02':'CDC-Kommunikation','0a':'CDC-Daten',
 'e0':'Funk','ff':'Herstellerspezifisch','07':'Drucker','06':'Bildverarbeitung'};
const safeDriver=d=>typeof d==='string'&&/^[a-z0-9_.-]{1,64}$/i.test(d)?d:null;
function displayRange(numbers){
 if(numbers.length===1)return String(numbers[0]);
 if(numbers.every((n,i)=>i===0||n===numbers[i-1]+1))return numbers[0]+'–'+numbers.at(-1);
 return numbers.join(', ');
}
export function usbInterfacePresentation(device,language='en'){
 const de=language==='de';
 const list=(Array.isArray(device?.usbInterfaces)?device.usbInterfaces:[])
  .filter(i=>Number.isInteger(i?.number)&&i.number>=0&&i.number<=255)
  .sort((a,b)=>a.number-b.number).slice(0,256);
 if(!list.length)return null;
 const bound=list.filter(i=>i.binding==='reported-bound'&&safeDriver(i.driver));
 const unbound=list.filter(i=>i.binding==='reported-unbound');
 const conflicting=list.filter(i=>i.binding==='conflicting'||i.classConflict);
 const missing=list.filter(i=>i.binding==='unreported'||(i.binding==='reported-bound'&&!safeDriver(i.driver)));
 const drivers=[...new Set(bound.map(i=>i.driver))];
 const groups=[];
 for(const i of list){
  const code=i.classCode?.toLowerCase();
  const label=(de&&german[code])||names[code]||
   (i.reportedClassLabel?i.reportedClassLabel+' ('+(de?'gemeldet':'reported')+')':(de?'Klasse unbekannt':'Unknown class'));
  const driver=i.binding==='reported-bound'?safeDriver(i.driver):null;
  const last=groups.at(-1);
  if(last&&last.label===label&&last.driver===driver&&last.binding===i.binding&&last.numbers.at(-1)===i.number-1)last.numbers.push(i.number);
  else groups.push({numbers:[i.number],label,driver,binding:i.binding,evidence:i.reportedClassEvidence||null});
 }
 const total=list.length,n=bound.length;
 let kind,status;
 if(conflicting.length){kind='conflicting';status=de?'Widersprüchliche USB-Schnittstellenbefunde':'Conflicting USB interface observations';}
 else if(n===total){kind='all-bound';status=n+' '+(de?(n===1?'USB-Schnittstelle mit gemeldeter Treiberbindung':'USB-Schnittstellen mit gemeldeter Treiberbindung'):(n===1?'USB interface with reported driver binding':'USB interfaces with reported driver bindings'));}
 else if(n){kind='partial';status=de?n+' von '+total+' USB-Schnittstellen mit gemeldeter Treiberbindung (teilweise)':n+' of '+total+' USB interfaces with reported driver bindings (partial)';}
 else if(unbound.length===total){kind='unbound';status=total+(de?' USB-Schnittstellen ausdrücklich ohne Treiber gemeldet':' USB interfaces explicitly reported without drivers');}
 else if(unbound.length){kind='partial-unbound';status=de?'Keine gemeldete Treiberbindung; '+unbound.length+' von '+total+' Schnittstellen ausdrücklich ohne Treiber':'No reported driver bindings; '+unbound.length+' of '+total+' interfaces explicitly unbound';}
 else{kind='incomplete';status=de?'USB-Schnittstellenbindungen nicht gemeldet':'USB interface bindings not reported';}
 return {kind,status,total,bound:n,unbound:unbound.length,conflicting:conflicting.length,missing:missing.length,distinctDrivers:drivers.length,
  headline:total+' '+(de?(total===1?'Schnittstelle':'Schnittstellen'):(total===1?'interface':'interfaces'))+' · '+drivers.length+' '+(de?(drivers.length===1?'gemeldeter Treiber':'gemeldete Treiber'):('reported '+(drivers.length===1?'driver':'drivers'))),
  groups:groups.map(g=>({...g,range:displayRange(g.numbers)}))};
}
