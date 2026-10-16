// Pure capacity arithmetic and archive state machine, shared by UI and tests.
export const units={B:1n,MB:1000000n,MiB:1048576n,GB:1000000000n,GiB:1073741824n};
export function parseBytes(raw,unit='GB'){
 const s=String(raw).trim().replace(',','.');
 if(s.length>64)return null;
 if(!/^\d+(?:\.\d{1,9})?$/.test(s)||!units[unit])return null;
 const [whole,fraction='']=s.split('.'),scale=10n**BigInt(fraction.length);
 const numerator=(BigInt(whole)*scale+BigInt(fraction||0))*units[unit];
 const n=(numerator+scale-1n)/scale;
 return n<=1000000000000000000n?n:null;
}
export function countMedia(bytes,capacity){
 bytes=BigInt(bytes);capacity=BigInt(capacity);
 if(bytes<0n||capacity<=0n)throw RangeError('Invalid capacity');
 return (bytes+capacity-1n)/capacity;
}
export const comparisons=[
 {id:'floppy',name:['1.44 MB floppy','1,44-MB-Diskette'],bytes:1474560n},
 {id:'zip',name:['ZIP-100 (nominal)','ZIP-100 (nominal)'],bytes:100000000n},
 {id:'cd74',name:['650 MB / 74 min CD · Mode 1','650 MB / 74-Min.-CD · Mode 1'],bytes:681984000n},
 {id:'cd80',name:['700 MB / 80 min CD · Mode 1','700 MB / 80-Min.-CD · Mode 1'],bytes:737280000n},
 {id:'dvd',name:['DVD · single layer ≈','DVD · eine Schicht ≈'],bytes:4700000000n},
 {id:'bluray',name:['Blu-ray · single layer','Blu-ray · eine Schicht'],bytes:25000000000n},
 {id:'usb',name:['128 GB USB · nominal','128-GB-USB · nominal'],bytes:128000000000n}
];
export const examples=[
 {name:'DOOM Eternal',bytes:80000000000n,source:'doom'},
 {name:'Cyberpunk 2077',bytes:70000000000n,source:'cyberpunk'},
 {name:"Baldur’s Gate 3",bytes:150000000000n,source:'bg3'},
 {name:'128 GB · Ventoy',bytes:128000000000n,source:'ventoy'},
 {name:'25 MB · demo',bytes:25000000n},
];
export function createArchive(bytes=25000000n,fault='read'){
 bytes=BigInt(bytes);
 if(bytes<=15n*1474560n||bytes>60n*1474560n)throw RangeError('Demo needs 16–60 volumes');
 if(!['read','checksum','missing'].includes(fault))throw RangeError('Unknown fault');
 return {bytes,total:Number(countMedia(bytes,1474560n)),current:1,loaded:null,verified:0n,fault,replaced:false,status:'ready',message:'ready',attempts:0};
}
export function archiveAction(state,action){
 const s={...state};
 if(action.type==='reset')return createArchive(action.bytes??s.bytes,action.fault??s.fault);
 if(s.status==='done')return s;
 if(action.type==='insert'){
  if(!Number.isInteger(action.volume)||action.volume<1||action.volume>s.total)return s;
  s.loaded=action.volume;s.status='loaded';s.message='loaded';
 }else if(action.type==='replace'){
  // Recovery requires reaching and inspecting the failed sixteenth volume.
  if(s.current===16&&s.status==='error') {s.replaced=true;s.loaded=16;s.status='loaded';s.message='replaced';}
 }else if(action.type==='inspect'){
  s.message=s.status==='error'?s.message:'inspect';
 }else if(action.type==='read'||action.type==='retry'){
  s.attempts++;
  if(s.loaded!==s.current){s.status='error';s.message=s.loaded===null?'insert':'wrong';return s;}
  if(s.current===16&&!s.replaced){s.status='error';s.message=s.fault;return s;}
  s.verified=s.current===s.total?s.bytes:BigInt(s.current)*1474560n;
  s.current++;s.loaded=null;s.status=s.current>s.total?'done':'ready';s.message=s.status==='done'?'done':'next';
 }else if(action.type==='fast'){
  while(s.status!=='done'){
   const next=archiveAction(archiveAction(s,{type:'insert',volume:s.current}),{type:'read'});
   Object.assign(s,next);if(s.status==='error')break;
  }
 }
 return s;
}
