// Answer options and profiles share the same three-point scale. Weights express
// how strongly a mismatch on each question should affect the ranking.
export const questions = [
  ['experience', 3, ['Wie viel Linux-Erfahrung bringst du mit?', 'How much Linux experience do you have?'], ['Keine oder kaum|Schon ausprobiert|Selbst installiert und repariert', 'Little or none|Tried Linux before|Installed and repaired it myself']],
  ['diagnostics', 2, ['Was machst du, wenn etwas ausfällt?', 'What do you do when something breaks?'], ['Ich brauche geführte Hilfe|Ich lese Anleitungen|Ich untersuche Logs und Abhängigkeiten', 'I need guided help|I follow documentation|I inspect logs and dependencies']],
  ['purpose', 2, ['Wofür ist der Rechner hauptsächlich da?', 'What is this machine mainly for?'], ['Alltag und Familie|Arbeit oder Entwicklung|Ein System zum Experimentieren', 'Everyday and family use|Work or development|A system to experiment with']],
  ['gaming', 2, ['Wie wichtig ist dir Gaming?', 'How important is gaming to you?'], ['Kaum|Gelegentlich, gern einfach eingerichtet|Oft, mit Interesse an frischem Grafikstack', 'Hardly at all|Occasional, with easy setup|Often, with interest in a fresh graphics stack']],
  ['office', 1, ['Wie willst du Alltagsprogramme einrichten?', 'How do you want to set up everyday applications?'], ['Über einen App-Store|Store und Paketmanager sind okay|Ich stelle den Bestand selbst zusammen', 'Through an app store|Store or package manager is fine|I assemble the software myself']],
  ['freshness', 3, ['Wie frisch sollen die Systempakete sein?', 'How recent should system packages be?'], ['Lange dieselbe Basis|Neuere Pakete in festen Releases|Laufend aktuelle Pakete', 'A long-lived base|Newer packages in scheduled releases|Continuously updated packages']],
  ['experiments', 2, ['Wie gern probierst du am System etwas aus?', 'How much do you enjoy experimenting with the system?'], ['Selten|Ab und zu|Das ist Teil meines Hobbys', 'Rarely|Now and then|It is part of the hobby']],
  ['maintenance', 3, ['Wie viel Zeit darf Pflege kosten?', 'How much time can maintenance take?'], ['Möglichst wenig|Regelmäßige Updates mit etwas Lesen|Auch längere Wartung ist okay', 'As little as possible|Regular updates and some reading|Longer maintenance is fine']],
  ['terminal', 2, ['Wie willst du Software und Updates verwalten?', 'How do you want to manage software and updates?'], ['Vorwiegend grafisch|Grafisch oder im Terminal|Vorwiegend im Terminal', 'Mostly graphical|Graphical or terminal|Mostly in the terminal']],
  ['hardware', 2, ['Was braucht deine Hardware?', 'What does your hardware need?'], ['Ein älteres Gerät soll schlank bleiben|Normale, gut unterstützte Hardware|Sehr neue Komponenten brauchen frische Treiber', 'A lean setup for an older machine|Typical, well-supported hardware|Very recent parts need newer drivers']],
  ['drivers', 2, ['Wie willst du zusätzliche Treiber einrichten?', 'How do you want to set up extra drivers?'], ['Möglichst per Assistent|Anleitung und Paketinstallation sind okay|Ich prüfe Kernelmodule und Firmware selbst', 'Through a setup tool if possible|Instructions and package installation are fine|I can inspect kernel modules and firmware']],
  ['desktop', 2, ['Wie viel willst du an der Oberfläche ändern?', 'How much do you want to change the desktop?'], ['Ein fertiges Layout reicht|Ich ändere Themen und Tastenkürzel|Ich setze Oberfläche und Programme selbst zusammen', 'A ready-made layout|I change themes and shortcuts|I build my desktop from components']],
  ['software', 2, ['Woher soll deine Software kommen?', 'Where should software come from?'], ['Offizielle Quellen und grafische Suche|Auch Flatpak oder Herstellerpakete|Auch Community-Rezepte oder eigene Builds', 'Official sources and graphical discovery|Also Flatpak or vendor packages|Also community recipes or my own builds']],
  ['control', 3, ['Wie wichtig ist dir ein wiederaufbaubares System?', 'How important is a reproducible system setup?'], ['Backups meiner Dateien reichen|Ich dokumentiere Pakete und Einstellungen|Ich möchte Systemoptionen versionieren', 'File backups are enough|I document packages and settings|I want to version system options']],
  ['learning', 2, ['Wie tief möchtest du Linux kennenlernen?', 'How deeply do you want to learn Linux?'], ['Erst einmal sicher benutzen|Nach und nach mehr verstehen|Mit Build-Optionen oder Systemmodulen arbeiten', 'Use it confidently first|Understand more over time|Work with build options or system modules']]
];

export const distros = [
  ['mint','Linux Mint','https://linuxmint.com/download.php','https://linuxmint.com/documentation.php',['cinnamon','xfce'],[0,0,0,1,0,0,0,0,0,0,0,0,0,0,0]],
  ['debian','Debian 13','https://www.debian.org/distrib/','https://www.debian.org/releases/trixie/',['plasma','gnome','xfce','xmonad'],[1,1,1,1,1,0,1,0,1,0,1,1,1,1,1]],
  ['arch','Arch Linux','https://archlinux.org/download/','https://wiki.archlinux.org/title/Installation_guide',['plasma','sway','dwm','xmonad','niri'],[2,2,2,2,2,2,2,2,2,2,2,2,2,1,2]],
  ['gentoo','Gentoo Linux','https://www.gentoo.org/downloads/','https://wiki.gentoo.org/wiki/Handbook:Main_Page',['plasma','xfce','xmonad','dwm'],[2,2,2,1,2,2,2,2,2,1,2,2,2,1,2]],
  ['fedora','Fedora Linux','https://fedoraproject.org/','https://docs.fedoraproject.org/en-US/',['gnome','plasma','sway','i3'],[1,1,1,2,1,1,1,1,1,2,1,1,1,1,1]],
  ['nixos','NixOS','https://nixos.org/download/','https://nixos.org/manual/nixos/stable/',['plasma','gnome','sway','xmonad'],[2,2,2,1,2,1,2,1,2,1,2,2,1,2,2]],
  ['cachyos','CachyOS','https://cachyos.org/download/','https://wiki.cachyos.org/',['plasma','sway','hyprland'],[1,1,1,2,1,2,1,1,1,2,1,1,2,1,1]],
  ['zorin','Zorin OS','https://zorin.com/os/download/','https://help.zorin.com/',['gnome'],[0,0,0,1,0,0,0,0,0,1,0,0,0,0,0]],
  ['ubuntu','Ubuntu','https://ubuntu.com/download/desktop','https://documentation.ubuntu.com/desktop/',['gnome','plasma','xfce'],[0,0,1,1,0,1,0,0,0,1,0,0,1,0,0]],
  ['opensuse','openSUSE Tumbleweed','https://get.opensuse.org/tumbleweed/','https://doc.opensuse.org/documentation/tumbleweed/',['plasma','gnome','xfce'],[1,1,1,2,1,2,1,1,1,2,1,1,1,1,1]],
  ['slackware','Slackware Linux','https://mirrors.slackware.com/mirrorlist/','https://docs.slackware.com/slackware:beginners_guide',['xfce','plasma'],[2,2,2,0,2,0,2,2,2,0,2,2,2,1,2]]
].map(([id,name,site,docs,desktops,profile]) => ({id,name,site,docs,desktops,profile}));

export const desktops = [
  ['plasma','KDE Plasma',['wayland','x11'],'floating','beginner','low','mouse','https://kde.org/plasma-desktop/'],
  ['gnome','GNOME',['wayland','x11'],'floating','beginner','low','mouse','https://help.gnome.org/'],
  ['cinnamon','Cinnamon',['x11','wayland'],'floating','beginner','low','mouse','https://github.com/linuxmint/cinnamon'],
  ['xfce','Xfce',['x11','wayland'],'floating','beginner','low','mouse','https://docs.xfce.org/'],
  ['hyprland','Hyprland',['wayland'],'dynamic','intermediate','high','keyboard','https://wiki.hypr.land/'],
  ['sway','Sway',['wayland'],'manual','intermediate','medium','keyboard','https://github.com/swaywm/sway/wiki'],
  ['niri','niri',['wayland'],'scrolling','intermediate','medium','keyboard','https://niri-wm.github.io/niri/index.html'],
  ['labwc','labwc',['wayland'],'floating','intermediate','medium','mouse','https://labwc.github.io/'],
  ['i3','i3',['x11'],'manual','intermediate','medium','keyboard','https://i3wm.org/docs/userguide.html'],
  ['dwm','dwm',['x11'],'dynamic','advanced','high','keyboard','https://dwm.suckless.org/tutorial/'],
  ['xmonad','xmonad',['x11'],'dynamic','advanced','high','keyboard','https://xmonad.org/TUTORIAL.html'],
  ['awesome','awesomewm',['x11'],'dynamic','advanced','high','keyboard','https://awesomewm.org/doc/api/']
].map(([id,name,protocol,layout,level,effort,input,docs],index) => ({id,name,protocol,layout,level,effort,input,docs,environment:index<4}));

export function rank(answers) {
  return distros.map(distro => {
    const compared = questions.flatMap((question, index) => {
      const answer = answers[index];
      if (![0,1,2].includes(answer)) return [];
      const expected = distro.profile[index];
      return [{question, answer, expected, cost: Math.abs(answer-expected)*question[1]}];
    });
    return {...distro, compared, score: compared.reduce((total, item) => total+item.cost, 0)};
  }).sort((a,b) => a.score-b.score || a.name.localeCompare(b.name, 'en'));
}

export const words = {
  de:{wayland:'Wayland',x11:'X11',floating:'Überlappend',dynamic:'Dynamisches Tiling',manual:'Manuelles Tiling',scrolling:'Scrollendes Tiling',beginner:'Einstieg',intermediate:'Fortgeschritten',advanced:'Erfahren',low:'Gering',medium:'Mittel',high:'Hoch',mouse:'Maus',keyboard:'Tastatur'},
  en:{wayland:'Wayland',x11:'X11',floating:'Floating',dynamic:'Dynamic tiling',manual:'Manual tiling',scrolling:'Scrolling tiling',beginner:'Beginner',intermediate:'Intermediate',advanced:'Advanced',low:'Low',medium:'Medium',high:'High',mouse:'Mouse',keyboard:'Keyboard'}
};
