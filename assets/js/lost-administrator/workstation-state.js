import { createWorkstationFilesystem } from './workstation-filesystem.js';
import { createProcesses } from '../debian-server/process-model.js';
import { createServices } from '../debian-server/service-model.js';
import { createWorkstationPackages } from '../debian-server/package-model.js';
import { LIMITS, VirtualFilesystem } from '../debian-server/virtual-filesystem.js';
import { MICHAEL_FROZEN_SYSTEM } from '../debian-server/system-model.js';

export const WORKSTATION_STORAGE_KEY = 'lost-administrator:m.weber-workstation:phase-5';
export const WORKSTATION_SCHEMA_VERSION = 12;
const MAX_PERSISTED_BYTES=2*1024*1024;
const IMMUTABLE_ENV=Object.freeze({HOME:'/home/m.weber',USER:'m.weber',LOGNAME:'m.weber',SHELL:'/bin/bash',HOSTNAME:'workstation'});

function createWorkstationServices(){
  const services=createServices();
  return Object.fromEntries(['cron.service','systemd-journald.service','dbus.service'].map(name=>[name,services[name]]));
}
export function defaultWorkstationState() {
  const home=IMMUTABLE_ENV.HOME,packages=createWorkstationPackages();
  return {schemaVersion:WORKSTATION_SCHEMA_VERSION,currentDirectory:home,filesystem:createWorkstationFilesystem(),commandHistory:[],sessionStartedAt:'2026-07-31T19:18:43.000Z',
    environment:{...IMMUTABLE_ENV,PWD:home,PATH:'/home/m.weber/Scripts:/home/m.weber/.local/bin:/usr/local/bin:/usr/bin:/bin',LANG:'en_GB.UTF-8',TERM:'xterm-256color'},
    immutableIdentity:{...IMMUTABLE_ENV},aliases:{ll:'ls -alF',la:'ls -A',l:'ls -CF'},mail:{read:{},currentFolder:'INBOX'},processes:createProcesses('m.weber'),services:createWorkstationServices(),packages,journal:[],machine:{power:'running'},system:{kernel:'6.12.38+deb13-amd64',...MICHAEL_FROZEN_SYSTEM},lastExitCode:0};
}

const validStamp=value=>typeof value==='string'&&(/^\d{4}$/.test(value)||(/^\d{4}-\d{2}-\d{2}T/.test(value)&&!Number.isNaN(Date.parse(value))));
function validFilesystem(root){
  if(root?.type!=='directory')return false;
  const canonical=createWorkstationFilesystem(),canon=new Map(),stack=[['/',canonical]];
  while(stack.length){const [path,node]=stack.pop();canon.set(path,node);if(node.type==='directory')for(const child of Object.values(node.children))stack.push([path==='/'?`/${child.name}`:`${path}/${child.name}`,child]);}
  let count=0,bytes=0;const seen=[['/',root,0]];
  while(seen.length){const [path,node,depth]=seen.pop(),seed=canon.get(path);if(++count>LIMITS.objects||depth>LIMITS.depth||!node||!['file','directory'].includes(node.type)||typeof node.name!=='string'||typeof node.owner!=='string'||typeof node.group!=='string'||typeof node.mode!=='string'||!validStamp(node.created)||!validStamp(node.modified))return false;
    if(seed){if(node.type!==seed.type||node.name!==seed.name||node.owner!==seed.owner||node.group!==seed.group||node.mode!==seed.mode||node.protected!==true)return false;if(node.type==='file'&&(node.content!==seed.content||node.created!==seed.created||node.modified!==seed.modified))return false;}
    else if(!(path.startsWith('/home/m.weber/')||path.startsWith('/tmp/'))||node.owner!=='m.weber'||node.group!=='m.weber'||node.protected!==false)return false;
    if(node.type==='file'){if(typeof node.content!=='string'||new TextEncoder().encode(node.content).length>LIMITS.fileSize)return false;bytes+=new TextEncoder().encode(node.content).length;}
    else {if(!node.children||Array.isArray(node.children)||typeof node.children!=='object')return false;for(const [name,child] of Object.entries(node.children)){if(!name||name.includes('/')||child?.name!==name)return false;seen.push([path==='/'?`/${name}`:`${path}/${name}`,child,depth+1]);}}
  }
  return bytes<=LIMITS.totalBytes&&[...canon.keys()].every(path=>new VirtualFilesystem(root,{home:IMMUTABLE_ENV.HOME}).get(path));
}
export function validWorkstationState(state){
  if(!state||state.schemaVersion!==WORKSTATION_SCHEMA_VERSION||!validFilesystem(state.filesystem)||!Array.isArray(state.commandHistory)||state.commandHistory.length>200||state.commandHistory.some(x=>typeof x!=='string'||x.length>2048)||!state.environment||Object.entries(IMMUTABLE_ENV).some(([key,value])=>state.environment[key]!==value)||state.currentDirectory!==state.environment.PWD||!new VirtualFilesystem(state.filesystem,{home:IMMUTABLE_ENV.HOME}).get(state.currentDirectory)||!state.mail||!['INBOX','EMMA','SENT'].includes(state.mail.currentFolder)||!state.mail.read||Array.isArray(state.mail.read)||Object.values(state.mail.read).some(value=>typeof value!=='boolean'))return false;
  return true;
}
export function loadWorkstationState(storage=localStorage){try{const raw=storage.getItem(WORKSTATION_STORAGE_KEY);if(raw&&new TextEncoder().encode(raw).length<=MAX_PERSISTED_BYTES){const state=JSON.parse(raw);if(validWorkstationState(state))return state;}}catch(_){/* reset malformed workstation state */}const state=defaultWorkstationState();saveWorkstationState(state,storage);return state;}
export function saveWorkstationState(state,storage=localStorage){try{const raw=JSON.stringify(state);if(new TextEncoder().encode(raw).length<=MAX_PERSISTED_BYTES)storage.setItem(WORKSTATION_STORAGE_KEY,raw);}catch(_){/* storage may be unavailable or full */}}
export function resetWorkstationState(storage=localStorage){try{storage.removeItem(WORKSTATION_STORAGE_KEY);}catch(_){/* reset remains safe when storage is unavailable */}}
