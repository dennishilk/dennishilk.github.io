// Browser-local composite USB presentation: observed bindings are not alias matches.
const names={ '01':'Audio','03':'HID','08':'Mass storage','09':'Hub','0e':'Video',
 '02':'CDC communications','0a':'CDC data','e0':'Wireless','ff':'Vendor-specific',
 '07':'Printer','06':'Imaging'};
const german={ '08':'Massenspeicher','02':'CDC-Kommunikation','0a':'CDC-Daten',
 'e0':'Funk','ff':'Herstellerspezifisch','07':'Drucker','06':'Bildverarbeitung'};
// One source for visible USB class labels and explanations. Unknown or incomplete
// descriptor values must never render as `undefined` or be guessed from a driver.
const CLASS_EXPLANATIONS={
 '03': ['HID transport only; a specialized HID driver is not established.',
        'Nur HID-Transport; kein bestimmter HID-Spezialtreiber belegt.'],
 '09': ['Hub-class behavior via the USB core, not a generated module alias.',
        'Hub-Klassenverhalten durch den USB-Kern, kein generierter Modulalias.'],
 '08': ['Mass storage; precise driver matching may require subclass and protocol.',
        'Massenspeicher; genaue Treibersuche benötigt ggf. Unterklasse und Protokoll.'],
 '01': ['USB audio; exact driver may depend on interface qualifiers.',
        'USB-Audio; genauer Treiber kann von Schnittstellenmerkmalen abhängen.'],
 '0e': ['USB video; UVC alias matching may require interface subclass and protocol.',
        'USB-Video; ein UVC-Alias-Treffer kann Schnittstellenunterklasse und Protokoll erfordern.'],
 '02': ['CDC communications; subclass and protocol matter.',
        'CDC-Kommunikation; Unterklasse und Protokoll sind wichtig.'],
 '0a': ['CDC data interface; a paired control interface may be required.',
        'CDC-Datenschnittstelle; eine passende Steuerschnittstelle kann nötig sein.'],
 'e0': ['Wireless controller; qualifiers and runtime matter.',
        'Funkcontroller; Zusatzmerkmale und Laufzeitbefund sind wichtig.'],
 'ff': ['Vendor-specific; specialized RGB, LCD, fan and other features are not established.',
        'Herstellerspezifisch; RGB, LCD, Lüfter und andere Sonderfunktionen sind nicht bestätigt.']
};
export function usbClassContextLine(item,language='en'){
 const de=language==='de';
 const code=typeof item?.classCode==='string'&&/^[0-9a-f]{2}$/i.test(item.classCode)
  ? item.classCode.toLowerCase() : null;
 const number=Number.isInteger(item?.number)&&item.number>=0&&item.number<=255
  ? String(item.number) : '?';
 const prefix=(de?'Schnittstelle ':'Interface ')+number+' · ';
 if(!code)return prefix+(de?'Unbekannte USB-Klasse (ungültiger oder fehlender Code)':'Unknown USB class (invalid or missing code)');
 const label=(de&&german[code])||names[code];
 if(!label)return prefix+(de?'Unbekannte USB-Klasse':'Unknown USB class')+' (0x'+code.toUpperCase()+')';
 const detail=CLASS_EXPLANATIONS[code]?.[de?1:0]||
  (de?'Die Klasse allein belegt keinen bestimmten Treiber.':'Class alone does not establish a specific driver.');
 return prefix+label+' (0x'+code.toUpperCase()+'): '+detail;
}
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
