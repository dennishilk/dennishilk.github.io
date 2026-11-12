const finderSections = new Set(['quiz', 'distros', 'desktops', 'credits']);
const wmSections = new Set(['builder', 'display', 'install', 'first-login']);

export function legacyDestination(hash) {
 const section=hash.slice(1);
 if (wmSections.has(section)) return {guide:'wm',hash};
 if (section==='updates' || /^update-[a-z0-9]+$/.test(section)) return {guide:'updates',hash};
 if (finderSections.has(section) || /^(distro|desktop)-[a-z0-9]+$/.test(section)) return {guide:'finder',hash};
 return {guide:'finder',hash:''};
}

if (typeof document!=='undefined') {
 const {guide,hash}=legacyDestination(location.hash);
 const link=document.querySelector(`[data-guide="${guide}"]`);
 if (link) location.replace(link.href+hash);
}
