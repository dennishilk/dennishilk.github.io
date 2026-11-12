import { questions,distros,desktops,rank,words } from './catalog.js';
import { defaultKeys,keyOptions,wmSettings,palettes,generate } from './config.js';
import { plan } from './packages.js';

const lang=document.documentElement.lang==='de'?'de':'en';
const ix=lang==='de'?0:1;
const tr=(de,en)=>ix?en:de;
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
function node(tag,text,attributes={}) {
 const element=document.createElement(tag);
 if (text!=null) element.textContent=text;
 for (const [key,value] of Object.entries(attributes)) element.setAttribute(key,value);
 return element;
}
const link=(label,href)=>node('a',label,{href});

function quiz(root) {
 const questionBox=$('[data-question]',root),results=$('[data-results]',root);
 const previous=$('[data-previous]',root),next=$('[data-next]',root);
 const progress=$('progress',root),counter=$('[data-progress]',root);
 const answers=Array(questions.length).fill(null);
 let position=0;
 function addClear() {
  const clear=node('button',tr('Antwort entfernen','Clear answer'),{type:'button',class:'quiet'});
  clear.addEventListener('click',()=>{answers[position]=null;show(true);});
  questionBox.append(clear);
 }
 function show(focus=false) {
  const last=position===questions.length;
  previous.disabled=position===0;
  next.hidden=last;
  questionBox.hidden=last;
  results.hidden=!last;
  progress.value=last?questions.length:position+1;
  counter.textContent=last?tr('Auswertung','Results'):tr('Frage ','Question ')+(position+1)+' / '+questions.length;
  next.textContent=answers[position]==null?tr('Überspringen','Skip'):tr('Weiter','Next');
  if (last) {
   renderResults(results,answers);
   if (focus) $('h3',results).focus();
   return;
  }
  const [,,question,choices]=questions[position];
  const legend=node('legend',question[ix],{tabindex:'-1'});
  questionBox.replaceChildren(legend);
  choices[ix].split('|').forEach((choice,value)=>{
   const input=node('input',null,{type:'radio',name:'quiz-answer',value});
   input.checked=answers[position]===value;
   const label=node('label');
   label.append(input,node('span',choice));
   questionBox.append(label);
  });
  if (answers[position]!=null) addClear();
  if (focus) legend.focus();
 }
 questionBox.addEventListener('change',event=>{
  if (event.target.name!=='quiz-answer') return;
  answers[position]=Number(event.target.value);
  next.textContent=tr('Weiter','Next');
  if (!$('button',questionBox)) addClear();
 });
 root.addEventListener('submit',event=>{event.preventDefault();if(position<questions.length){position++;show(true);}});
 previous.addEventListener('click',()=>{position--;show(true);});
 $('[data-restart]',root).addEventListener('click',()=>{answers.fill(null);position=0;show(true);});
 show();
 root.hidden=false;
}

function renderResults(result,answers) {
 const list=node('ol',null,{class:'result-list'});
 const count=answers.filter(answer=>answer!=null).length;
 result.replaceChildren(node('h3',tr('Deine Rangfolge','Your ranking'),{tabindex:'-1'}),
  node('p',count?tr('Die Reihenfolge beruht auf '+count+' Antworten. Weniger Abweichungspunkte bedeuten eine engere Übereinstimmung.','The ranking uses '+count+' answers. Fewer mismatch points indicate a closer fit.'):
   tr('Du hast alle Fragen übersprungen. Alle Profile teilen sich den ersten Rang und stehen alphabetisch.','You skipped every question. All profiles share first place and appear alphabetically.')));
 let displayedRank=1,lastScore=null;
 rank(answers).forEach((d,index)=>{
  if (lastScore!==null && d.score!==lastScore) displayedRank=index+1;
  lastScore=d.score;
  const item=node('li'),panel=node('details');
  panel.open=index<3;
  panel.append(node('summary',displayedRank+'. '+d.name+' · '+d.score+' '+tr('Abweichungspunkte','mismatch points')));
  const matches=d.compared.filter(x=>x.cost===0).sort((a,b)=>b.question[1]-a.question[1]);
  const tradeoffs=d.compared.filter(x=>x.cost>0).sort((a,b)=>b.cost-a.cost);
  function points(items,drawback) {
   const heading=drawback?tr('Mögliche Abweichungen','Potential trade-offs'):tr('Passt zu deinen Antworten','Matches your answers');
   panel.append(node('h4',heading));
   if (!items.length) {
    panel.append(node('p',drawback?tr('Keine Abweichung bei den gegebenen Antworten.','No mismatches on the answered questions.'):tr('Keine exakte Übereinstimmung bei den gegebenen Antworten.','No exact matches on the answered questions.')));
    return;
   }
   const group=node('ul');
   for (const {question,answer,expected,cost} of items.slice(0,3)) {
    const options=question[3][ix].split('|');
    const reason=drawback?tr('Deine Wahl „'+options[answer]+'“. Profil „'+options[expected]+'“. +'+cost+' Punkte.',
     'You chose “'+options[answer]+'”. Profile “'+options[expected]+'”. +'+cost+' points.'):options[answer];
    const row=node('li');
    row.append(node('strong',question[2][ix]+' '),document.createTextNode(reason));
    group.append(row);
   }
   panel.append(group);
  }
  if (count) {
   panel.append(node('p',tr(matches.length+' exakte Übereinstimmungen, '+tradeoffs.length+' Abweichungen. Punkte werden über alle beantworteten Fragen addiert.',
    matches.length+' exact matches, '+tradeoffs.length+' mismatches. Points are summed across all answered questions.')));
   points(matches,false);
   points(tradeoffs,true);
  }
  const links=node('p',null,{class:'inline-links'});
  links.append(link(tr('Zum Porträt','Read profile'),'#distro-'+d.id),link(tr('Offizielle Website','Official website'),d.site));
  panel.append(links);
  const choices=node('p',tr('Desktop-Optionen','Desktop options'),{class:'inline-links'});
  for (const id of d.desktops) choices.append(link(desktops.find(x=>x.id===id).name,'#desktop-'+id));
  panel.append(choices);
  item.append(panel);list.append(item);
 });
 result.append(list);
}

function explorer(root) {
 const controls=$('[data-filters]',root),cards=$$('[data-desktop]',root),count=$('[data-filter-count]',root);
 function apply() {
  const selected=[...new FormData(controls)];
  let visible=0;
  for (const card of cards) {
   card.hidden=selected.some(([key,value])=>value&&!card.dataset[key].split(' ').includes(value));
   if (!card.hidden) visible++;
  }
  count.textContent=tr(visible+' von '+cards.length+' Profilen',visible+' of '+cards.length+' profiles');
 }
 controls.addEventListener('change',apply);
 controls.addEventListener('reset',()=>queueMicrotask(apply));
 function revealAnchor() {
  if (!location.hash.startsWith('#desktop-')) return;
  const target=document.getElementById(location.hash.slice(1));
  if (target?.hidden) {
   controls.reset();
   apply();
   target.scrollIntoView();
  }
 }
 window.addEventListener('hashchange',revealAnchor);
 controls.hidden=false;
 apply();
}

const descriptions = {
 source:['Lade das originale dwm-6.8-Archiv und entpacke es in einen eigenen Ordner. Sichere eine vorhandene config.h, lege die heruntergeladene Datei im Quellordner ab und führe dort die Build-Befehle aus. Starte die neue Binärdatei erst nach Abmelden aus einer freien Textkonsole. Wenn du xinitrc.dwm erzeugt hast, übernimm die beiden Zeilen nach Prüfung in deine eigene X-Startdatei oder nutze startx /absoluter/pfad/xinitrc.dwm nach chmod u+x auf dieser Datei.','Download and extract the original dwm 6.8 archive in its own directory. Back up any existing config.h, put the downloaded header in the source tree and run the build commands there. Sign out before starting the new binary from a free text console. If you enabled xinitrc.dwm, review and merge its two commands into your own X startup file or use startx /absolute/path/xinitrc.dwm after running chmod u+x on that file.'],
 deb:['Lade von Google das 64-Bit-DEB. Öffne einen Terminal im Downloadordner und installiere es mit sudo apt install ./google-chrome-stable_current_amd64.deb, sofern der Dateiname übereinstimmt. Prüfe die zusätzlich eingerichtete Paketquelle.','Download Google’s 64-bit DEB. In the download directory run sudo apt install ./google-chrome-stable_current_amd64.deb if that matches the filename. Review the extra repository it configures.'],
 rpm:['Lade das 64-Bit-RPM von Google. Installiere die lokale Datei mit sudo dnf install ./google-chrome-stable_current_x86_64.rpm auf Fedora oder sudo zypper install ./google-chrome-stable_current_x86_64.rpm auf Tumbleweed, sofern der Dateiname übereinstimmt. Prüfe die zusätzlich eingerichtete Quelle.','Download Google’s 64-bit RPM. Install the local file with sudo dnf install ./google-chrome-stable_current_x86_64.rpm on Fedora or sudo zypper install ./google-chrome-stable_current_x86_64.rpm on Tumbleweed, if the filename matches. Review the extra repository.'],
 aur:['Chrome kommt über das Community-Paket google-chrome im AUR. Prüfe PKGBUILD und Quellen, bevor du als normaler Nutzer makepkg -si in einem Checkout des AUR-Pakets aufrufst. base-devel und git müssen vorhanden sein.','Chrome is available via the community google-chrome AUR package. Review the PKGBUILD and sources before running makepkg -si as a normal user in an AUR package checkout. Install base-devel and git first.'],
 emerge:['Chrome hat ein eigenes Portage-Paket. Prüfe Architektur, Keyword und Lizenzmeldung, bevor du die Installation bestätigst.','Chrome has its own Portage package. Check architecture, keyword and licensing prompts before confirming.'],
 nix:['Die Chrome-Zeile erlaubt gezielt ein unfreies Paket. Falls du bereits eine allowUnfreePredicate definiert hast, ergänze sie an der bestehenden Stelle.','The Chrome line allows one unfree package. If you already define allowUnfreePredicate, extend your existing predicate.'],
 snap:['Ubuntu verwendet für Firefox und Chromium Snap-Übergangspakete. Prüfe, ob snapd läuft und der Startbefehl in deiner aktuellen Sitzung verfügbar ist.','Ubuntu uses transitional Snap packages for Firefox and Chromium. Check that snapd is running and the launcher is available in your session.'],
 mint:['Prüfe die Paketverfügbarkeit deiner Mint-Version. Diese Anleitung setzt die Ubuntu-basierte Ausgabe voraus.','Check package availability for your Mint version. This path targets the Ubuntu-based edition.'],
 ubuntu:['Prüfe die Paketverfügbarkeit in deiner Ubuntu-Version und ob Universe aktiviert ist.','Check package availability for your Ubuntu release and whether Universe is enabled.'],
 zorin:['Prüfe die Paketverfügbarkeit in deiner Zorin-Version. Die Pakete für das WM-Setup hängen von der Ubuntu-Basis ab.','Check package availability for your Zorin release. WM setup packages depend on its Ubuntu base.'],
 cachyos:['Prüfe die CachyOS-Reihenfolge der Repositories und den installierten Versionsstand. Die Befehle verwenden Pacman mit den eingerichteten Paketquellen.','Check the CachyOS repository order and installed versions. Commands use Pacman with your configured repositories.'],
 fedora:['Diese Anleitung gilt für klassische RPM-Installationen. Fedora Atomic verwendet andere Systemwerkzeuge.','This path targets traditional RPM installations. Fedora Atomic uses different system tools.'],
 gentoo:['Prüfe aktive Profile, USE-Flags, Keywords und Architektur vor der Bestätigung. GCC baut C-Quellcode. Für einen manuellen xmonad-Aufbau brauchst du separat GHC und passende Haskell-Bibliotheken.','Review profiles, USE flags, keywords and architecture before accepting. GCC builds C source. A manual xmonad setup separately requires GHC and matching Haskell libraries.'],
 slackware:['Voraussetzung ist eine vollständige Slackware-15.0-Installation mit GCC, make und Xorg samt Entwicklungsdateien. Führe die slackpkg-Befehle als root mit dem passenden Stable-Spiegel aus, wenn xterm oder Firefox fehlen. Baue und installiere dmenu anhand der verlinkten SlackBuild-Anleitung. Führe die dwm-Build-Schritte anschließend als normaler Nutzer aus.','This requires a full Slackware 15.0 install with GCC, make and Xorg including development files. Run the slackpkg commands as root with the matching stable mirror if xterm or Firefox is missing. Build and install dmenu with the linked SlackBuild instructions. Then build dwm as your normal user.'],
 opensuse:['Prüfe die Paketauflösung gegen die Tumbleweed-Quellen und den aktuellen Snapshot.','Check resolution against the configured Tumbleweed repositories and current snapshot.'],
 nixos:['Importiere die erzeugte Nix-Datei über imports in configuration.nix oder in den Modulen deiner Flake. Bei einer Flake ergänze --flake .#hostname aus dem Projektordner und nimm die neue Datei bei einem Git-Flake in den Index auf. Eine Home-Manager-Konfiguration kann dieselben Dotfiles verwalten. Übertrage sie in diesem Fall dorthin.','Import the generated Nix file through imports in configuration.nix or through your flake modules. With a flake, add --flake .#hostname from its project and stage the new file for a Git-backed flake. Home Manager can own the same dotfiles. If it does, put them there.']
};

async function copy(text) {
 if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
 const input=node('textarea',null,{readonly:'',class:'clipboard-temp'});
 input.value=text;document.body.append(input);
 input.select();
 const ok=document.execCommand('copy');input.remove();
 if (!ok) throw new Error('clipboard');
}
function fileActions(name,content) {
 const box=node('div',null,{class:'file'});
 const title=node('h4',name);
 const bar=node('div',null,{class:'button-row'});
 const copyButton=node('button',tr('Kopieren','Copy'),{type:'button'});
 const download=node('button',tr('Herunterladen','Download'),{type:'button'});
 const status=node('span',null,{role:'status'});
 copyButton.addEventListener('click',async()=>{
  try {await copy(content);status.textContent=tr('Kopiert','Copied');}
  catch {status.textContent=tr('Markiere den Text zum Kopieren.','Select the text to copy it.');}
  copyButton.focus();
 });
 download.addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));
  const a=node('a',null,{href:url,download:name});
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 });
 bar.append(copyButton,download,status);
 const pre=node('pre');pre.append(node('code',content));
 box.append(title,bar,pre);
 return box;
}

function builder(root) {
 const output=$('[data-build-output]'),error=$('[data-build-error]',root);
 const design=$('[data-design]',root),shortcut=$('[data-keys]',root),panel=$('[data-advanced]',root);
 function select(name,label,values,chosen) {
  const labelNode=node('label',label);
  const input=node('select',null,{name});
  for (const [value,title] of values) {
   const option=node('option',title,{value});option.selected=value===chosen;input.append(option);
  }
  labelNode.append(input);
  return labelNode;
 }
 const keyLabels={browser:tr('Browser öffnen','Open browser'),terminal:tr('Terminal öffnen','Open terminal'),close:tr('Aktives Fenster schließen','Close focused window'),launcher:tr('Programmstarter öffnen','Open launcher')};
 for (const [name,key] of Object.entries(defaultKeys)) shortcut.append(select(name+'Key',keyLabels[name],keyOptions.map(k=>[k,k.toUpperCase()==='RETURN'?tr('Eingabe','Return'):k.toUpperCase()]),key));
 const featureState=new Map();
 function field(name,control) {
  featureState.set(name,control);
  design.append(control);
  return control;
 }
 function numeric(name,label,value,max,min=0) {
  const box=node('label',label);
  box.append(node('input',null,{type:'number',name,value,min,max}));
  return box;
 }
 const preset=select('preset',tr('Palette','Palette'),[['dark',tr('Dunkel','Dark')],['light',tr('Hell','Light')],['nord','Nord'],['gruvbox','Gruvbox'],['custom',tr('Eigene Farben','Custom colors')]],'dark');
 design.append(preset);
 const colors=['background','foreground','active','inactive'].map((name,i)=>{
  const label=[tr('Hintergrund','Background'),tr('Text','Text'),tr('Aktiv','Active border'),tr('Inaktiv','Inactive border')][i];
  const box=node('label',label);
  box.append(node('input',null,{type:'color',name,value:palettes.dark[i]}));design.append(box);
  return box;
 });
 field('border',numeric('border',tr('Rahmenbreite','Border width'),2,8));
 field('gaps',numeric('gaps',tr('Fensterabstand','Window gaps'),6,32));
 field('font',select('font',tr('Schrift','Font'),['monospace','sans-serif','DejaVu Sans','DejaVu Sans Mono','JetBrains Mono'].map(f=>[f,f]),'monospace'));
 const fontSize=numeric('fontSize',tr('Schriftgröße','Font size'),10,28,6);
 design.append(fontSize);
 field('bar',select('bar',tr('Leiste','Bar'),[['top',tr('Oben','Top')],['bottom',tr('Unten','Bottom')],['off',tr('Aus','Off')]],'top'));
 const animation=node('label',tr('Animationen','Animations'));
 animation.append(node('input',null,{name:'animations',type:'checkbox'}));
 field('animation',animation);
 function refreshControls() {
  const wm=root.elements.wm.value,features=wmSettings[wm].features;
  for (const [feature,element] of featureState) element.hidden=!features.includes(feature);
  fontSize.hidden=!features.includes('font');
  const custom=root.elements.preset.value==='custom';
  colors.forEach((box,i)=>{box.hidden=!custom||(i<2&&!['i3','sway','awesome','dwm'].includes(wm));});
 }
 root.addEventListener('change',()=>{
  refreshControls();
  if (!output.hidden) $('[data-stale]',output).hidden=false;
 });
 function build(focus=false) {
  const values=Object.fromEntries(new FormData(root));
  error.textContent='';
  let packagePlan, files;
  const {distro,wm,terminal,browser}=values;
  const wallpaper=values.wallpaper==='on';
  const settings=wmSettings[wm];
  const shortcuts=Object.fromEntries(Object.keys(defaultKeys).map(k=>[k,values[k+'Key']]));
  try {
   packagePlan=plan({distro,wm,terminal,browser,wallpaper});
   if (packagePlan.status!=='unverified') files=generate({
    ...values,shortcuts,wallpaper,terminal:packagePlan.term,browser:packagePlan.launchBrowser,
    colors:['background','foreground','active','inactive'].map(x=>values[x]),animations:values.animations==='on'
   });
  } catch (problem) {
   error.textContent=problem.message==='duplicate'?tr('Wähle für jede Aktion eine andere Taste.','Choose a different key for each action.'):tr('Prüfe die gewählten Optionen.','Check the selected options.');
   panel.open=true;error.focus();
   return;
  }
  const distroName=distros.find(d=>d.id===distro).name;
  const wmProfile=desktops.find(d=>d.id===wm);
  const title=node('h3',distroName+' · '+wmProfile.name,{tabindex:'-1'});
  const stale=node('p',tr('Auswahl geändert. Erzeuge die Ausgabe erneut.','Selection changed. Generate the output again.'),{'data-stale':'',role:'status'});
  stale.hidden=true;
  output.replaceChildren(title,stale);
  const statusLabels={
   direct:tr('Paketweg anhand offizieller Quellen geprüft','Package path verified against official sources'),
   extra:tr('Zusätzliche Einrichtung erforderlich','Additional setup required'),
   unverified:tr('Für diese Kombination fehlt ein geprüfter Installationsweg','This combination lacks a verified installation path')
  };
  output.append(node('p',statusLabels[packagePlan.status],{class:'compatibility '+packagePlan.status}));
  const sources=node('p',null,{class:'inline-links'});
  sources.append(link(tr('Paketquelle der Distribution','Distribution package source'),packagePlan.official),link(wmProfile.name+' '+tr('Dokumentation','documentation'),wmProfile.docs));
  if (packagePlan.source) sources.append(link(tr('Chrome-Paketquelle','Chrome package source'),packagePlan.source));
  if (packagePlan.launcherSource) sources.append(link('dmenu · SlackBuild',packagePlan.launcherSource));
  if (packagePlan.dwmSource) sources.append(link('dwm 6.8 · tar.gz',packagePlan.dwmSource));
  output.append(sources);
  if (!files) {
   output.append(node('p',tr('Prüfe die Paketquelle, die Version des Window-Managers und die ausführbaren Befehle. Alternativ kannst du eine andere Kombination wählen.','Check package availability, the WM version and the executables. You can also select a different combination.')));
   output.hidden=false;if(focus)title.focus();return;
  }
  output.append(node('h4',tr('1. Pakete und Programme einrichten','1. Set up packages and applications')));
  const code=text=>{const pre=node('pre');pre.append(node('code',text));output.append(pre);};
  for (const id of packagePlan.setup) if (descriptions[id]) output.append(node('p',descriptions[id][ix]));
  code(packagePlan.command.join('\n'));
  if (packagePlan.module) output.append(fileActions('linux-companion.nix',packagePlan.module));
  if (wm==='hyprland') output.append(node('p',tr('Das Profil verwendet die Lua-API von Hyprland 0.57. Prüfe Hyprland --version vor dem Einrichten.','This profile uses the Hyprland 0.57 Lua API. Check Hyprland --version before setting it up.')));
  if (wm==='niri') output.append(node('p',tr('Das Profil setzt niri 25.11 oder neuer voraus.','This profile targets niri 25.11 or newer.')));
  if (settings.protocol==='wayland') output.append(node('p',tr('Der klassische Terminal ist hier foot. Kitty und Alacritty sind ebenfalls Wayland-fähig. Für Bildschirmfreigabe und Dateiauswahl prüfe die D-Bus-Sitzung, PipeWire und passende Portale wie ','The classic terminal here is foot. Kitty and Alacritty also support Wayland. For sharing and file pickers, check the D-Bus session, PipeWire and suitable portals such as ')+packagePlan.portal+'.'));
  const launchers=node('dl',null,{class:'spec'});
  for (const [label,value] of [[tr('Browser','Browser'),packagePlan.launchBrowser],[tr('Terminal','Terminal'),packagePlan.term],[tr('Starter','Launcher'),packagePlan.launcher]]) {
   const dd=node('dd');dd.append(node('code',value));launchers.append(node('dt',label),dd);
  }
  output.append(launchers,node('p',tr('Führe in deiner bisherigen Sitzung command -v für jeden Programmnamen aus und öffne Browser und Terminal einmal. Prüfe auch den Programmstarter.','Run command -v for each executable in your current session, then open the browser and terminal once. Check the launcher too.')));
  output.append(node('h4',tr('2. Konfiguration sichern und prüfen','2. Back up and validate configuration')),
   node('p',tr('Zielordner ','Destination ')+settings.dir+'. '+tr('Falls XDG_CONFIG_HOME gesetzt ist, verwende diesen Pfad statt ~/.config. Sichere bestehende Dateien unter einem eigenen Namen, bevor du etwas ersetzt.','If XDG_CONFIG_HOME is set, use it instead of ~/.config. Save existing files under a separate name before replacing anything.')));
  if (wm==='dwm') output.append(node('p',tr('Sichere auch eine vorhandene Datei ~/.local/bin/dwm vor make install. Der Build verwendet unmodifiziertes dwm 6.8.','Back up any existing ~/.local/bin/dwm before make install. This build uses unpatched dwm 6.8.')));
  if (wm==='xmonad') output.append(node('p',tr('Ein älteres ~/.xmonad oder XMONAD_CONFIG_DIR kann den Pfad beeinflussen. GHC und xmonad-contrib werden beim Recompile gebraucht. Bei Fehlern prüfe die Ausgabe, bevor du die Sitzung neu startest.','An older ~/.xmonad or XMONAD_CONFIG_DIR can affect lookup. GHC and xmonad-contrib are needed to recompile. Review build output before restarting the session.')));
  if (wm==='labwc') output.append(node('p',tr('xmllint prüft nur die XML-Struktur und ist optional. Achte beim Labwc-Start auf Hinweise zu unbekannten Aktionen.','xmllint is optional and checks XML structure. Check labwc startup output for unknown actions.')));
  if (wallpaper) output.append(node('p',tr('Lege für den Hintergrund ein Bild unter ~/Pictures/wallpaper.jpg ab. Es ist optional und hat keinen Einfluss auf die Tastaturbelegung.','Place your wallpaper at ~/Pictures/wallpaper.jpg. It is optional and has no effect on the keyboard bindings.')));
  code([settings.check,settings.reload].filter(Boolean).join('\n'));
  for (const [name,text] of Object.entries(files)) output.append(fileActions(name,text));
  output.append(node('h4',tr('3. Erste Anmeldung und Tastenkürzel','3. First login and shortcuts')));
  if (wm!=='dwm') output.append(node('p',tr('Melde dich ab und wähle die Sitzung im Sitzungsmenü deines Display Managers. Behalte die bisherige Sitzung für den Rückweg.','Sign out and choose the session in your display manager’s session menu. Keep the existing session available as a fallback.')));
  if (packagePlan.startup) {
   output.append(node('p',tr('Alternativ kannst du diese Sitzung von einer freien lokalen Textkonsole als normaler Nutzer starten.','Alternatively, start this session as a normal user from a free local text console.')));
   code(packagePlan.startup);
  }
  const mod=values.mod==='alt'?'Alt':'Super';
  const shortcutsList=node('ul',null,{class:'shortcuts'});
  const bind=(key,label)=>{const li=node('li');li.append(node('kbd',mod+'+'+key),' '+label);shortcutsList.append(li);};
  for (const [action,key] of Object.entries(shortcuts)) bind(key==='Return'?'Enter':key.toUpperCase(),keyLabels[action]);
  bind('1–9',tr('Arbeitsfläche wechseln','Switch workspace'));
  if (wm!=='labwc') bind('Shift+1–9',tr('Fenster auf Arbeitsfläche verschieben','Move window to workspace'));
  if (!['dwm','niri'].includes(wm)) bind('Shift+R',tr('Konfiguration neu laden oder WM neu starten','Reload configuration or restart WM'));
  bind(wm==='xmonad'?'Shift+Q':'Shift+E',tr('Sitzung verlassen','Exit session'));
  output.append(shortcutsList,node('p',tr('Die Konfiguration verbindet Startbefehle, Fensteraktionen und Arbeitsflächen. Farben, Rahmen und optionale Programme stehen in eigenen Einstellungen. Bei Problemen prüfe zuerst den Startbefehl aus deinem bisherigen Desktop.','The configuration maps launch commands, window actions and workspaces. Colors, borders and optional helpers have separate settings. For problems, test the launch command from your existing desktop first.')));
  const recovery=node('p');
  recovery.append(link(tr('Rückweg über TTY und Backup','Recover using a TTY and backup'),'#first-login'));
  output.append(recovery);
  output.hidden=false;if(focus)title.focus();
 }
 root.addEventListener('submit',event=>{event.preventDefault();build(true);});
 refreshControls();
 root.hidden=false;
}

function gallery() {
 const dialog=$('[data-lightbox]');
 if (typeof dialog?.showModal!=='function') return;
 const close=$('button',dialog), image=$('img',dialog),caption=$('figcaption',dialog);
 let trigger=null;
 document.addEventListener('click',event=>{
  const anchor=event.target.closest('[data-enlarge]');
  if (!anchor||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey) return;
  event.preventDefault();
  trigger=anchor;
  const thumb=$('img',anchor);
  const sourceCaption=anchor.closest('figure')?.querySelector('figcaption');
  image.src=anchor.href;image.alt=thumb.alt;
  caption.textContent=sourceCaption?.textContent||thumb.alt;
  caption.hidden=!sourceCaption;
  dialog.showModal();close.focus();
 });
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>trigger?.focus());
}

if ($('[data-quiz]')) quiz($('[data-quiz]'));
if ($('[data-explorer]')) explorer($('[data-explorer]'));
if ($('[data-builder]')) builder($('[data-builder]'));
gallery();
