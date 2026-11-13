(()=>{
'use strict';const root=document.querySelector('[data-db-wizard]');if(!root)return;
const de=root.dataset.lang==='de',t=(a,b)=>de?a:b;
const distros={mint:'Linux Mint',ubuntu:'Ubuntu',zorin:'Zorin OS',debian:'Debian',fedora:'Fedora',opensuse:'openSUSE',cachyos:'CachyOS',arch:'Arch Linux'};
const links={mint:'https://linuxmint-installation-guide.readthedocs.io/en/latest/',ubuntu:'https://ubuntu.com/desktop/docs/en/26.04/tutorial/install-ubuntu-desktop/',zorin:'https://help.zorin.com/docs/getting-started/install-zorin-os/',debian:'https://www.debian.org/releases/stable/installmanual',fedora:'https://docs.fedoraproject.org/',opensuse:'https://doc.opensuse.org/',cachyos:'https://wiki.cachyos.org/',arch:'https://wiki.archlinux.org/title/Installation_guide'};
const data=[
['distro',t('Distribution','Distribution'),Object.entries(distros).map(([k,v])=>[k,v])],
['drives',t('Laufwerksaufbau','Drive layout'),[['one',t('Eine SSD für beide Systeme','One shared SSD')],['two',t('Zwei getrennte SSDs','Two separate SSDs')]]],
['fresh',t('Installationssituation','Current setup'),[['already',t('Windows ist installiert','Windows is already installed')],['new',t('Beide Systeme komplett neu','Fresh installation of both')]]],
['encrypt',t('BitLocker / Geräteverschlüsselung','BitLocker / Device Encryption'),[['unknown',t('Noch nicht geprüft','Not checked')],['on',t('Aktiviert','Enabled')],['off',t('Ausgeschaltet','Disabled')]]],
['uefi',t('BIOS-Modus in msinfo32','BIOS mode in msinfo32'),[['unknown',t('Noch nicht geprüft','Not checked')],['uefi','UEFI'],['legacy','Legacy / CSM']]],
['secure','Secure Boot',[['unknown',t('Noch nicht geprüft','Not checked')],['on',t('Aktiviert','Enabled')],['off',t('Deaktiviert','Disabled')]]]
];
let mode='install';const form=root.querySelector('.db-grid'),tabs=root.querySelector('.db-modes');
for(const [key,label,choices]of data){const field=document.createElement('label');field.textContent=label;const el=document.createElement('select');el.name=key;for(const [v,txt]of choices){const op=document.createElement('option');op.value=v;op.textContent=txt;el.appendChild(op)}el.addEventListener('change',render);field.appendChild(el);form.appendChild(field)}
const modes=[['install',t('Linux installieren','Install Linux')],['remove-linux',t('Linux entfernen','Remove Linux')],['remove-windows',t('Windows entfernen','Remove Windows')]];
for(const[k,label]of modes){const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.action=k;button.addEventListener('click',()=>{mode=k;render()});tabs.appendChild(button)}
const add=(arr,txt)=>arr.push(txt);
function render(){
const v=Object.fromEntries([...form.querySelectorAll('select')].map(el=>[el.name,el.value])),d=distros[v.distro],steps=[],warnings=[],one=v.drives==='one',advanced=['arch','cachyos'].includes(v.distro);
tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.action===mode)));
form.querySelector('[name=fresh]').parentElement.hidden=mode!=='install';
if(v.uefi==='unknown')add(warnings,t('Win+R → msinfo32: UEFI-Startmodus zuerst prüfen. Vorher keine Partitionen ändern.','Check UEFI boot mode in Win+R → msinfo32 before changing partitions.'));
if(v.uefi==='legacy')add(warnings,t('STOPP: Legacy/CSM ist für den normalen Windows-11-UEFI/GPT-Weg ungeeignet. Erst die Konfiguration klären.','STOP: Legacy/CSM does not match normal Windows 11 UEFI/GPT. Investigate before proceeding.'));
if(v.encrypt==='unknown')add(warnings,t('BitLocker/Geräteverschlüsselung prüfen und Recovery-Key extern sichern.','Check BitLocker/device encryption and save the recovery key externally.'));
if(v.encrypt==='on')add(warnings,t('BitLocker ist aktiv: Schlüssel vor Boot-/Firmware-Änderungen sichern. Schutz aussetzen ist keine Entschlüsselung.','BitLocker is on: save recovery key before firmware or boot changes. Suspending is not decryption.'));
if(v.secure==='unknown')add(warnings,t('Secure-Boot-Status prüfen, keine Schlüssel auf Verdacht löschen.','Check Secure Boot; do not delete signing keys without a plan.'));
if(v.secure==='on'&&advanced)add(warnings,t('Arch/CachyOS: signierten Bootpfad anhand der offiziellen Anleitung planen.','Arch/CachyOS: plan a supported signed boot chain using official documentation.'));
if(mode==='install'){
add(steps,t('Backup und Windows-Recovery-Medium erstellen und testen.','Create and test backup and Windows recovery media.'));
if(v.fresh==='new')add(steps,t('Windows 11 zuerst auf dem richtigen Laufwerk installieren; Platz für Linux freilassen.','Install Windows 11 first on the correct drive; leave room for Linux.'));
else add(steps,t('In Windows msinfo32 und Datenträgerverwaltung öffnen; SSD-Modell, Kapazität und Partitionen notieren.','Inspect msinfo32 and Disk Management; record SSD model, capacity and partitions.'));
if(one)add(steps,t('C: in Windows verkleinern und 80–120 GB oder mehr NICHT zugeordnet lassen. EFI/MSR/Recovery nicht ändern.','Shrink C: in Windows and leave 80–120 GB or more UNALLOCATED. Preserve EFI/MSR/Recovery.'));
else add(steps,t('Linux-Ziel-SSD anhand von Modell und Größe identifizieren. Getrennten EFI-Bootpfad prüfen.','Identify Linux SSD by model and capacity. Check whether it will have an independent EFI boot path.'));
add(steps,t('Offizielle '+d+'-ISO prüfen, USB-Stick schreiben, im UEFI-Modus Live-System starten und Hardware testen.','Verify official '+d+' ISO, write USB, boot live system in UEFI mode and test hardware.'));
if(advanced)add(steps,t(d+': EFI, Mountpunkte und Bootloader laut offizieller Anleitung planen. Windows-EFI nicht formatieren; archinstall/GUI ersetzt die Kontrolle nicht.',d+': Plan EFI, mount points and bootloader using official docs. Do not format Windows EFI; installer UI cannot replace checking.'));
else if(['mint','ubuntu','zorin'].includes(v.distro))add(steps,t(d+': „neben Windows“ nur wählen, wenn die richtige SSD und freier Bereich angezeigt werden. Nicht „Datenträger löschen“ wählen.',d+': Use “install alongside” only with verified drive/free space. Do not choose “erase disk”.'));
else add(steps,t(d+': Nur bestätigten freien Bereich oder die zweite SSD nutzen. EFI/Windows/Recovery nicht formatieren.',d+': Use only verified free space or second SSD. Do not format EFI/Windows/Recovery.'));
add(steps,t('Installation abschließen, Linux UND Windows jeweils starten, danach den Bootpfad erneut prüfen.','Complete installation, boot BOTH Linux and Windows and recheck boot paths.'));
if(advanced)add(warnings,t(d+' ist nicht der einfachste Weg für Anfänger. Linux Mint bietet einen leichteren Einstieg.',d+' is not the simplest beginner path. Linux Mint is easier.'));
}else if(mode==='remove-linux'){
add(steps,t('Linux-Daten sichern, Partitionen anhand Modell und Größe dokumentieren.','Back up Linux data, identify partitions by drive model and size.'));
add(steps,t('Windows Boot Manager direkt im UEFI-Menü wählen und Windows unabhängig starten.','Boot Windows independently via Windows Boot Manager in UEFI.'));
if(!one)add(steps,t('Prüfen, ob Windows ohne Linux-SSD startet, bevor die Linux-SSD gelöscht wird.','Verify Windows boots without Linux SSD before erasing it.'));
add(steps,t('NUR eindeutig identifizierte Linux-Partitionen über Windows-Datenträgerverwaltung löschen.','Delete ONLY verified Linux partitions using Windows Disk Management.'));
add(steps,t('Gemeinsame EFI-Partition erhalten. C: nur erweitern, wenn Windows es sicher anbietet.','Keep shared EFI partition. Extend C: only if Windows safely permits it.'));
add(steps,t('Windows mehrfach neu starten; Bootmenüeinträge erst danach aufräumen.','Restart Windows several times; only then clean up old boot entries.'));
}else{
add(steps,t('Windows- und Linux-Dateien extern sichern.','Back up Windows and Linux files externally.'));
add(steps,t('Mit lsblk -f, findmnt / und efibootmgr -v EFI- und Root-Pfade nur lesend prüfen.','Inspect EFI and root paths read-only with lsblk -f, findmnt / and efibootmgr -v.'));
add(steps,t('Linux muss ohne Windows-Bootdateien starten. Falls Linux die gemeinsame EFI nutzt, erst unabhängigen Bootpfad schaffen und testen.','Linux must boot without Windows boot files. If using shared EFI, establish and test an independent boot path first.'));
if(!one)add(steps,t('Linux bei ausgeschaltetem Gerät testweise ohne Windows-SSD starten; falls es scheitert, STOPP.','Test booting Linux without Windows SSD with PC fully powered off during disk changes. STOP if it fails.'));
add(steps,t('NUR eindeutig identifizierte Windows-Partitionen entfernen; gemeinsame EFI nicht blind löschen.','Delete ONLY verified Windows partitions; do not blindly delete shared EFI.'));
add(steps,t('Freien Platz erst danach neu zuordnen und erneut Boot und Backup testen.','Reallocate space only afterward and recheck boot and backup.'));
}
if(one&&v.encrypt==='on'&&mode==='install')warnings.unshift(t('STOPP: Keine verschlüsselte Windows-Partition im Linux-Installer verkleinern. Zuerst vollständige Entschlüsselung und offizielle Anweisungen prüfen.','STOP: Do not resize encrypted Windows in Linux installer. Check full decryption guidance first.'));
const stop=(v.uefi==='legacy')||(mode==='install'&&one&&v.encrypt==='on');
root.querySelector('.db-plan-title').textContent=mode==='install'?t('Dein Plan für ','Your plan for ')+d:mode==='remove-linux'?t('Linux sicher entfernen','Remove Linux safely'):t('Windows sicher entfernen','Remove Windows safely');
const note=root.querySelector('.db-warning');note.textContent=(stop?t('STOPP – zuerst klären: ','STOP – investigate first: '):t('Vor dem Fortfahren prüfen: ','Check before proceeding: '))+(warnings.join(' · ')||t('Backup und alle Partitionen selbst kontrollieren.','Verify backup and every partition yourself.'));
const ol=root.querySelector('.db-plan');ol.replaceChildren();steps.forEach(s=>{const li=document.createElement('li');li.textContent=s;ol.appendChild(li)});
const doc=root.querySelector('.db-doc');doc.href=links[v.distro];doc.textContent=t('Offizielle Anleitung für ','Official guide for ')+d;
root.querySelector('.db-copy').onclick=()=>{const msg=[root.querySelector('.db-plan-title').textContent,...warnings.map(x=>'! '+x),...steps.map((x,i)=>(i+1)+'. '+x)].join('\n');if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(msg).then(()=>root.querySelector('.db-copy').textContent=t('Kopiert ✓','Copied ✓')).catch(()=>window.prompt(t('Plan kopieren','Copy plan'),msg));else window.prompt(t('Plan kopieren','Copy plan'),msg)};
root.querySelector('.db-copy').textContent=t('Plan kopieren','Copy plan');
}
render();
})();