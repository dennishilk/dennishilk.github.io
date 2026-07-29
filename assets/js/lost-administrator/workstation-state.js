import { createWorkstationFilesystem } from './workstation-filesystem.js';
import { createProcesses } from '../debian-server/process-model.js';
import { createServices } from '../debian-server/service-model.js';
import { createPackages } from '../debian-server/package-model.js';

export const WORKSTATION_STORAGE_KEY = 'lost-administrator:michael-workstation:phase-3';
export const WORKSTATION_SCHEMA_VERSION = 1;
export function defaultWorkstationState() {
  const started = new Date().toISOString(), home='/home/michael';
  return { schemaVersion:WORKSTATION_SCHEMA_VERSION, currentDirectory:home, filesystem:createWorkstationFilesystem(), commandHistory:[], sessionStartedAt:started,
    environment:{HOME:home,USER:'michael',LOGNAME:'michael',SHELL:'/bin/bash',HOSTNAME:'workstation',PWD:home,OLDPWD:home,PATH:'/home/michael/Scripts:/home/michael/.local/bin:/usr/local/bin:/usr/bin:/bin',LANG:'en_GB.UTF-8',TERM:'xterm-256color'},
    aliases:{ll:'ls -alF',la:'ls -A',l:'ls -CF'}, processes:createProcesses(), services:createServices(), packages:createPackages(), journal:[], machine:{power:'running'}, system:{kernel:'6.12.38+deb13-amd64'} };
}
export function loadWorkstationState(storage=localStorage) { try { const state=JSON.parse(storage.getItem(WORKSTATION_STORAGE_KEY)); if(state?.schemaVersion===WORKSTATION_SCHEMA_VERSION&&state.filesystem?.type==='directory'&&state.environment?.USER==='michael')return state; } catch (_) { /* start with a clean fictional workstation */ } const state=defaultWorkstationState();saveWorkstationState(state,storage);return state; }
export function saveWorkstationState(state,storage=localStorage){storage.setItem(WORKSTATION_STORAGE_KEY,JSON.stringify(state));}
export function resetWorkstationState(storage=localStorage){storage.removeItem(WORKSTATION_STORAGE_KEY);}
