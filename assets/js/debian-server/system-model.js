export const SYSTEM = Object.freeze({
  hostname:'lab-node', user:'visitor', uid:1000, gid:1000, home:'/home/visitor', shell:'/bin/bash',
  os:'Debian GNU/Linux 13 (trixie)', version:'13', codename:'trixie', arch:'x86_64',
  kernel:'6.12.38+deb13-amd64', kernelBuild:'#1 SMP PREEMPT_DYNAMIC Debian 6.12.38-1 (2026-07-20)',
  cpu:'Intel(R) Xeon(R) CPU E3-1270 v6 @ 3.80GHz', cores:4, threads:8, memoryMiB:2048,
  diskBytes:20*1024**3, interface:'ens18', address:'192.0.2.25/24', gateway:'192.0.2.1', dns:'192.0.2.53'
});
export const NETWORK_HOSTS=Object.freeze({'gateway.lab':'192.0.2.1','mirror.lab':'192.0.2.10','status.lab':'192.0.2.20','backup.lab':'192.0.2.30','lab-node':'192.0.2.25','localhost':'127.0.0.1'});
export const MICHAEL_FROZEN_SYSTEM = Object.freeze({
  frozenLocal:'Fri Jul 31 15:18:43 EDT 2026', frozenUtc:'Fri Jul 31 19:18:43 UTC 2026',
  frozenClock:'15:18:43', frozenEpochMs:Date.UTC(2026,6,31,19,18,43),
  login:{user:'m.weber',tty:'tty1',local:'Jul 31 13:41',utc:'Fri Jul 31 17:41:26 UTC 2026'}
});
export function isMichaelWorkstation(state){return state?.environment?.USER==='m.weber'&&state?.environment?.HOSTNAME==='workstation';}
export function uptimeSeconds(state){return isMichaelWorkstation(state)?null:Math.max(1,Math.floor((Date.now()-new Date(state.sessionStartedAt).getTime())/1000)+7420);}
export function humanUptime(state){const s=uptimeSeconds(state);if(s===null)return 'not recorded';const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return `${d?`${d} day${d===1?'':'s'}, `:''}${h}:${String(m).padStart(2,'0')}`;}
export function humanUptimeWords(state){const s=uptimeSeconds(state);if(s===null)return 'not recorded';const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),parts=[];if(d)parts.push(`${d} day${d===1?'':'s'}`);if(h)parts.push(`${h} hour${h===1?'':'s'}`);parts.push(`${m} minute${m===1?'':'s'}`);return parts.join(', ');}
