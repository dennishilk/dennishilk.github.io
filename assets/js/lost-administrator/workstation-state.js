import { createWorkstationFilesystem } from './workstation-filesystem.js';
import { createProcesses } from '../debian-server/process-model.js';
import { createServices } from '../debian-server/service-model.js';
import { createPackages, WORKSTATION_PACKAGE_TOTAL } from '../debian-server/package-model.js';
import { MICHAEL_FROZEN_SYSTEM } from '../debian-server/system-model.js';

export const WORKSTATION_STORAGE_KEY = 'lost-administrator:m.weber-workstation:phase-5';
// Persisted state includes the filesystem. Bump this after Canon removals so an old
// browser snapshot cannot restore files absent from createWorkstationFilesystem().
export const WORKSTATION_SCHEMA_VERSION = 10;
function createWorkstationServices(){const services=createServices();delete services['nginx.service'];delete services['monitor.service'];return services;}
export function defaultWorkstationState() {
  const started = new Date().toISOString(), home='/home/m.weber';
  return { schemaVersion:WORKSTATION_SCHEMA_VERSION, currentDirectory:home, filesystem:createWorkstationFilesystem(), commandHistory:[], sessionStartedAt:started,
    environment:{HOME:home,USER:'m.weber',LOGNAME:'m.weber',SHELL:'/bin/bash',HOSTNAME:'workstation',PWD:home,PATH:'/home/m.weber/Scripts:/home/m.weber/.local/bin:/usr/local/bin:/usr/bin:/bin',LANG:'en_GB.UTF-8',TERM:'xterm-256color'},
    aliases:{ll:'ls -alF',la:'ls -A',l:'ls -CF'}, mail:{read:{},currentFolder:'INBOX'}, processes:createProcesses('m.weber'), services:createWorkstationServices(), packages:createPackages(), packageSummary:{totalInstalled:WORKSTATION_PACKAGE_TOTAL,curatedVisible:Object.values(createPackages()).filter(p=>!p.virtual).length}, journal:[], machine:{power:'running'}, system:{kernel:'6.12.38+deb13-amd64',...MICHAEL_FROZEN_SYSTEM} , lastExitCode:0 };
}
export function loadWorkstationState(storage=localStorage) { try { const state=JSON.parse(storage.getItem(WORKSTATION_STORAGE_KEY)); if(state?.schemaVersion===WORKSTATION_SCHEMA_VERSION&&state.filesystem?.type==='directory'&&state.environment?.USER==='m.weber')return state; } catch (_) { /* start with a clean fictional workstation */ } const state=defaultWorkstationState();saveWorkstationState(state,storage);return state; }
export function saveWorkstationState(state,storage=localStorage){storage.setItem(WORKSTATION_STORAGE_KEY,JSON.stringify(state));}
export function resetWorkstationState(storage=localStorage){storage.removeItem(WORKSTATION_STORAGE_KEY);}
