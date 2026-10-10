// Fixed public URLs are fetched regardless of pasted hardware IDs or bus selection.
// No dynamic index paths, query strings, report uploads or identification API calls.
import { matchKernelAliases, usbClassContext } from './kernel-alias-matcher.js';
const directory=new URL('./kernel-index/',import.meta.url);
const fixedPaths=['manifest.json','pci.json','usb.json','hid.json'];
let cache=null;
async function getStaticJson(name,maxLength,fetcher){
 const response=await fetcher(new URL(name,directory),{mode:'same-origin',credentials:'same-origin',cache:'force-cache'});
 if(!response.ok)throw Error('index-unavailable');
 const data=await response.text();
 if(data.length>maxLength)throw Error('index-oversize');
 return JSON.parse(data);
}
export async function loadKernelIndex(fetcher=fetch){
 if(!cache){
  cache=Promise.all(fixedPaths.map((name,i)=>getStaticJson(name,i===0?50000:1250000,fetcher))).then(([manifest,pci,usb,hid])=>{
   if(manifest.schema!==2||!/^\d+\.\d+/.test(manifest.kernelRelease||''))throw Error('invalid-manifest');
   const indexes={pci,usb,hid};
   for(const bus of ['pci','usb','hid'])if(indexes[bus]?.schema!==2||indexes[bus]?.bus!==bus||manifest.files?.[bus]?.name!==bus+'.json')throw Error('invalid-partition');
   return {manifest,indexes};
  }).catch(e=>{cache=null;throw e;});
 }
 return cache;
}
export async function enrichKernelResults(results,{snapshot=null,fetcher=fetch}={}){
 let data;
 try{data=snapshot||await loadKernelIndex(fetcher);}catch{
  return results.map(r=>({...r,kernelEvidence:{state:'index-unavailable'},usbClassContext:usbClassContext(r.device)}));
 }
 return results.map(r=>{
  const {device:d}=r;
  const evidence=({pci:'pci',usb:'usb'})[d.bus];
  const aliases=evidence?matchKernelAliases(d,data.indexes[evidence]):{candidates:[],truncated:false,total:0};
  const hid=d.bus==='usb'&&d.hidModalias?matchKernelAliases(d,data.indexes.hid,{bus:'hid'}):{candidates:[],truncated:false,total:0};
  const candidates=[...aliases.candidates,...hid.candidates];
  return {...r,kernelEvidence:{state:'checked',kernelRelease:data.manifest.kernelRelease,
   candidates:candidates.slice(0,16),total:aliases.total+hid.total,truncated:aliases.truncated||hid.truncated||candidates.length>16},
   usbClassContext:usbClassContext(d)};
 });
}
export const INDEX_STATIC_REQUEST_PATHS=Object.freeze([...fixedPaths]);
