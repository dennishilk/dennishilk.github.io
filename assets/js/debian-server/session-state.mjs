import { createFilesystem, LIMITS, VirtualFilesystem } from './virtual-filesystem.mjs';
import { HOME } from './path-utils.mjs';
export const STORAGE_KEY = 'debian-server-experiment-session';
export const SCHEMA_VERSION = 1;
export const defaultState = () => ({ schemaVersion: SCHEMA_VERSION, currentDirectory: HOME, filesystem: createFilesystem(), commandHistory: [], sessionStartedAt: new Date().toISOString() });
export function validState(s) {
  if (!s || s.schemaVersion !== SCHEMA_VERSION || typeof s.currentDirectory !== 'string' || !Array.isArray(s.commandHistory) || s.commandHistory.some(x=>typeof x!=='string' || x.length>512) || s.filesystem?.type !== 'directory') return false;
  const stack=[[s.filesystem,0]]; let count=0;
  while(stack.length){const [node,depth]=stack.pop();if(++count>LIMITS.objects||depth>LIMITS.depth||typeof node.name!=='string'||!['directory','file'].includes(node.type)||typeof node.owner!=='string'||typeof node.group!=='string'||typeof node.mode!=='string')return false;if(node.type==='file'){if(typeof node.content!=='string'||node.content.length>LIMITS.fileSize)return false;}else{if(!node.children||Array.isArray(node.children)||typeof node.children!=='object')return false;for(const [name,child] of Object.entries(node.children)){if(!name||name.includes('/')||child?.name!==name)return false;stack.push([child,depth+1]);}}}
  return new VirtualFilesystem(s.filesystem).get(s.currentDirectory)?.type === 'directory';
}
export function loadState(storage = sessionStorage) { try { const state = JSON.parse(storage.getItem(STORAGE_KEY)); if (validState(state)) return state; } catch (_) { /* reset malformed state */ } const state = defaultState(); saveState(state, storage); return state; }
export function saveState(state, storage = sessionStorage) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function clearState(storage = sessionStorage) { storage.removeItem(STORAGE_KEY); }
