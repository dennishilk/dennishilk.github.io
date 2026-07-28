import { createFilesystem, LIMITS, VirtualFilesystem } from './virtual-filesystem.js';
import { HOME } from './path-utils.js';
import { createProcesses } from './process-model.js';
import { createServices } from './service-model.js';
import { createPackages } from './package-model.js';
export const STORAGE_KEY = 'computer-museum:debian-server-experiment:session';
export const SCHEMA_VERSION = 3;
export const defaultState = () => { const started = new Date().toISOString(); return ({ schemaVersion: SCHEMA_VERSION, currentDirectory: HOME, filesystem: createFilesystem(), commandHistory: [], sessionStartedAt: started, session:{status:'active',startedAt:started,completedAt:null,durationMs:null,commands:[],directoriesVisited:[HOME]}, environment:{HOME,USER:'visitor',LOGNAME:'visitor',SHELL:'/bin/bash',HOSTNAME:'lab-node',PWD:HOME,OLDPWD:HOME,PATH:'/home/visitor/bin:/usr/local/bin:/usr/bin:/bin',LANG:'C.UTF-8',TERM:'xterm-256color'},aliases:{ll:'ls -alF',la:'ls -A',l:'ls -CF'},processes:createProcesses(),services:createServices(),packages:createPackages(),journal:[],machine:{power:'running'} }); };
export function validState(s) {
  if (!s || s.schemaVersion !== SCHEMA_VERSION || typeof s.currentDirectory !== 'string' || !Array.isArray(s.commandHistory) || !s.session || !['active','completed'].includes(s.session.status) || !Array.isArray(s.session.commands) || !Array.isArray(s.session.directoriesVisited) || !s.environment || !s.aliases || !Array.isArray(s.processes) || !s.services || !s.packages || !Array.isArray(s.journal) || s.commandHistory.some(x=>typeof x!=='string' || x.length>2048) || s.session.commands.some(x=>!x||typeof x.text!=='string'||x.text.length>2048) || s.filesystem?.type !== 'directory') return false;
  const stack=[[s.filesystem,0]]; let count=0;
  while(stack.length){const [node,depth]=stack.pop();if(++count>LIMITS.objects||depth>LIMITS.depth||typeof node.name!=='string'||!['directory','file'].includes(node.type)||typeof node.owner!=='string'||typeof node.group!=='string'||typeof node.mode!=='string')return false;if(node.type==='file'){if(typeof node.content!=='string'||node.content.length>LIMITS.fileSize)return false;}else{if(!node.children||Array.isArray(node.children)||typeof node.children!=='object')return false;for(const [name,child] of Object.entries(node.children)){if(!name||name.includes('/')||child?.name!==name)return false;stack.push([child,depth+1]);}}}
  return new VirtualFilesystem(s.filesystem).get(s.currentDirectory)?.type === 'directory';
}
export function loadState(storage = localStorage) { try { const state = JSON.parse(storage.getItem(STORAGE_KEY)); if (validState(state)) return state; } catch (_) { /* reset malformed state */ } const state = defaultState(); saveState(state, storage); return state; }
export function saveState(state, storage = localStorage) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function clearState(storage = localStorage) { storage.removeItem(STORAGE_KEY); }
