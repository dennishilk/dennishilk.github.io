import { legacyHyprlandSettings, wmSettings } from './config.js?v=20261112-wm-packages';

const archWms = {
 xmonad:'xmonad xmonad-contrib ghc',dwm:'base-devel libx11 libxft libxinerama fontconfig freetype2',i3:'i3-wm',
 sway:'sway',hyprland:'hyprland',niri:'niri xwayland-satellite',labwc:'labwc',awesome:'awesome'
};
const aptWms = {
 xmonad:'xmonad ghc libghc-xmonad-dev libghc-xmonad-contrib-dev',
 dwm:'build-essential libx11-dev libxft-dev libxinerama-dev libfontconfig-dev libfreetype-dev',
 i3:'i3-wm',sway:'sway',niri:'',labwc:'labwc',awesome:'awesome'
};
const rpmDwm = 'gcc make libX11-devel libXft-devel libXinerama-devel fontconfig-devel';
const fedoraWms = {
 xmonad:'xmonad ghc',dwm:rpmDwm+' freetype-devel',i3:'i3',sway:'sway',
 niri:'niri xwayland-satellite',labwc:'labwc',awesome:'awesome'
};
const gentooWms = {
 xmonad:'x11-wm/xmonad x11-wm/xmonad-contrib dev-lang/ghc',
 dwm:'sys-devel/gcc dev-build/make x11-libs/libX11 x11-libs/libXft x11-libs/libXinerama media-libs/fontconfig media-libs/freetype',
 i3:'x11-wm/i3',awesome:'x11-wm/awesome',sway:'gui-wm/sway',labwc:'gui-wm/labwc',
 hyprland:"'>=gui-wm/hyprland-0.57::hyproverlay'",niri:'gui-wm/niri::guru'
};
const suseWms = {
 xmonad:'xmonad ghc ghc-xmonad-devel ghc-xmonad-contrib-devel',dwm:rpmDwm+' freetype2-devel',
 i3:'i3',sway:'sway',hyprland:'hyprland',niri:'niri xwayland-satellite',labwc:'labwc',awesome:'awesome'
};
const nixWms = {
 xmonad:'services.xserver.windowManager.xmonad = { enable = true; enableContribAndExtras = true; };',
 dwm:'services.xserver.windowManager.dwm.enable = true;\n  services.xserver.windowManager.dwm.package = pkgs.dwm.override { conf = ./config.h; };',
 i3:'services.xserver.windowManager.i3.enable = true;',
 awesome:'services.xserver.windowManager.awesome.enable = true;',
 sway:'programs.sway.enable = true;',hyprland:'programs.hyprland.enable = true;',
 niri:'programs.niri.enable = true;',labwc:'programs.labwc.enable = true;'
};
const slackBuild = (name,category='desktop')=>['SlackBuild · '+name,'https://slackbuilds.org/repository/15.0/'+category+'/'+name+'/'];
const slackWms = {
 xmonad:[slackBuild('xmonad'),slackBuild('xmonad-contrib','haskell')],dwm:[],i3:[slackBuild('i3')],
 sway:[slackBuild('sway')],labwc:[slackBuild('labwc')],awesome:[slackBuild('awesome')]
};
const browsers = (firefox,chromium)=>({firefox,chromium});
const aptBase = {system:'apt',x:'xserver-xorg xinit suckless-tools',w:'wofi xwayland'};
const archBase = {system:'arch',wms:archWms,browsers:browsers('firefox','chromium'),x:'xorg-server xorg-xinit dmenu',w:'wofi xorg-xwayland'};
const distroPackages = {
 debian:{...aptBase,wms:{...aptWms,hyprland:''},browsers:browsers('firefox-esr','chromium'),official:'https://packages.debian.org/trixie/'},
 arch:{...archBase,official:'https://archlinux.org/packages/'},
 cachyos:{...archBase,official:'https://wiki.cachyos.org/',extra:true},
 fedora:{system:'fedora',wms:fedoraWms,browsers:browsers('firefox','chromium'),x:'xorg-x11-server-Xorg xorg-x11-xinit dmenu',w:'wofi xorg-x11-server-Xwayland',official:'https://packages.fedoraproject.org/',extra:true},
 mint:{...aptBase,wms:aptWms,browsers:browsers('firefox','chromium'),official:'https://packages.linuxmint.com/',extra:true},
 ubuntu:{...aptBase,wms:{...aptWms,hyprland:'hyprland'},browsers:browsers('firefox','chromium-browser'),official:'https://packages.ubuntu.com/',extra:true},
 zorin:{...aptBase,wms:aptWms,browsers:browsers('firefox','chromium-browser'),official:'https://help.zorin.com/',extra:true},
 gentoo:{system:'gentoo',wms:gentooWms,browsers:browsers('www-client/firefox','www-client/chromium'),x:'x11-base/xorg-server x11-apps/xinit x11-misc/dmenu',w:'gui-apps/wofi x11-base/xwayland',official:'https://packages.gentoo.org/',extra:true},
 opensuse:{system:'suse',wms:suseWms,browsers:browsers('MozillaFirefox','chromium'),x:'xorg-x11-server xinit dmenu',w:'wofi xwayland',official:'https://software.opensuse.org/',extra:true},
 nixos:{system:'nix',wms:nixWms,browsers:browsers('firefox','chromium'),x:'dmenu',w:'wofi',official:'https://search.nixos.org/options',extra:true},
 slackware:{system:'slack',wms:slackWms,browsers:browsers('mozilla-firefox',null),official:'https://slackbuilds.org/howto/',extra:true}
};
const install = {
 apt:p=>['sudo apt update','sudo apt install '+p],
 arch:p=>['sudo pacman -Syu '+p],
 fedora:p=>['sudo dnf install '+p],
 gentoo:p=>['sudo emerge --ask '+p],
 suse:p=>['sudo zypper install '+p]
};
const gentooTerms = {kitty:'x11-terms/kitty',alacritty:'x11-terms/alacritty',foot:'gui-apps/foot',xterm:'x11-terms/xterm'};
const chrome = {
 apt:['google-chrome-stable','https://www.google.com/chrome/','deb'],
 fedora:['google-chrome-stable','https://www.google.com/chrome/','rpm'],
 suse:['google-chrome-stable','https://www.google.com/chrome/','rpm'],
 arch:['google-chrome-stable','https://aur.archlinux.org/packages/google-chrome','aur'],
 gentoo:['google-chrome-stable','https://packages.gentoo.org/packages/www-client/google-chrome','emerge'],
 nix:['google-chrome-stable','https://search.nixos.org/packages?query=google-chrome','nix'],
 slack:['google-chrome-stable','https://mirrors.slackware.com/slackware/slackware64-15.0/extra/google-chrome/','slackChrome']
};
const startX = {xmonad:'startx /usr/bin/xmonad',i3:'startx /usr/bin/i3',awesome:'startx /usr/bin/awesome',dwm:'startx "$HOME/.local/bin/dwm"'};
const startWayland = {sway:'sway',hyprland:'start-hyprland',niri:'niri-session',labwc:'labwc'};
const portals = {
 hyprland:'xdg-desktop-portal-hyprland',niri:'xdg-desktop-portal-gnome',sway:'xdg-desktop-portal-wlr',labwc:'xdg-desktop-portal-wlr'
};
const niriDocs = 'https://github.com/niri-wm/niri/wiki/Getting-Started';
const aptNiriBuild = 'gcc clang pkg-config libudev-dev libgbm-dev libxkbcommon-dev libegl1-mesa-dev libwayland-dev libinput-dev libdbus-1-dev libsystemd-dev libseat-dev libpipewire-0.3-dev libpango1.0-dev libdisplay-info-dev';
const hyprlangDistros = new Set(['debian','ubuntu','nixos']);

function slackPlan({wm,term,browser,x11,wallpaper}) {
 const basePackages=[term==='xterm'?'xterm':'',browser==='firefox'?'mozilla-firefox':''].filter(Boolean);
 const packageSources=[...slackWms[wm],slackBuild(x11?'dmenu':'wofi')];
 if (term!=='xterm') packageSources.push(slackBuild(term,term==='foot'?'desktop':'system'));
 if (wallpaper) packageSources.push(x11?slackBuild('feh','graphics'):slackBuild('swaybg'));
 if (browser==='chromium') packageSources.push(['Chromium · Alien BOB','https://slackware.nl/people/alien/slackbuilds/chromium/pkg64/15.0/']);
 return {command:basePackages.length?['slackpkg update','slackpkg install '+basePackages.join(' ')]:[],packageSources};
}

export function plan({distro,wm,terminal,browser,wallpaper}) {
 if (!Object.hasOwn(distroPackages,distro) || !Object.hasOwn(wmSettings,wm)) throw new Error('selection');
 if (!['classic','kitty','alacritty'].includes(terminal) || !['firefox','chromium','chrome'].includes(browser)) throw new Error('selection');
 const d=distroPackages[distro], {system,official}=d, x11=wmSettings[wm].protocol==='x11';
 const term=terminal==='classic'?(x11?'xterm':'foot'):terminal;
 const altBrowser=browser==='chrome'?chrome[system]:null;
 const pkgBrowser=d.browsers[browser];
 const launchBrowser=altBrowser?.[0] || (distro==='debian' && browser==='firefox' ? 'firefox-esr'
  : ['fedora','ubuntu','zorin'].includes(distro) && browser==='chromium' ? 'chromium-browser' : browser);
 const source=altBrowser?.[1];
 const launcher=x11?'dmenu_run':'wofi --show drun';
 if (!Object.hasOwn(d.wms,wm)) {
  const reason=system==='slack'?'slackWayland'
   :distro==='fedora'?'fedoraHyprland':'nobleHyprland';
  return {status:'unverified',reason,official,source,term,launchBrowser,launcher};
 }
 const nixDwm=system==='nix' && wm==='dwm';
 const sourceDwm=wm==='dwm' && !nixDwm;
 const sourceNiri=wm==='niri' && system==='apt';
 const legacyHyprland=wm==='hyprland' && hyprlangDistros.has(distro);
 const legacyLabwc=wm==='labwc' && system==='slack';
 const setup=[];
 const beforePackages=[];
 let packageSources=[];
 if (d.extra) setup.push(distro);
 if (sourceDwm) setup.push('source');
 if (nixDwm) setup.push('nixDwm');
 if (altBrowser) setup.push(altBrowser[2]);
 if ((distro==='ubuntu' && browser!=='chrome') || (distro==='zorin' && browser==='chromium')) setup.push('snap');
 if (sourceNiri) {
  setup.push('niriSource');
  packageSources.push(['niri · Build / Installation',niriDocs+'#building'],['niri · v26.04','https://github.com/niri-wm/niri/releases/tag/v26.04']);
 }
 if (wm==='hyprland') {
  if (distro==='debian') {
   setup.push('backports');
   packageSources.push(['Debian Backports','https://backports.debian.org/Instructions/']);
  }
  if (distro==='ubuntu') setup.push('ubuntuHyprland');
  if (distro==='gentoo') {
   setup.push('hyproverlay');
   beforePackages.push('sudo eselect repository enable hyproverlay','sudo emaint sync -r hyproverlay');
   packageSources.push(['Hyprland · hyproverlay','https://codeberg.org/hyproverlay/hyproverlay']);
  }
 }
 if (wm==='niri' && distro==='gentoo') {
  setup.push('guruNiri');
  beforePackages.push('sudo eselect repository enable guru','sudo emaint sync -r guru');
  packageSources.push(['niri · GURU','https://gitweb.gentoo.org/repo/proj/guru.git/tree/gui-wm/niri']);
 }
 const termPackage=system==='gentoo'?gentooTerms[term]:term;
 const wall=wallpaper?(x11?'feh':'swaybg'):'';
 const wallPackage=system==='gentoo'&&wall?(x11?'media-gfx/feh':'gui-apps/swaybg'):wall;
 const extraBrowser=altBrowser?.[2]==='emerge'?'www-client/google-chrome':'';
 const aurTools=altBrowser?.[2]==='aur'?(sourceDwm?'git':'base-devel git'):'';
 const normalPackages=[d.wms[wm],x11?d.x:d.w,termPackage,pkgBrowser,wallPackage,extraBrowser,aurTools,sourceNiri?aptNiriBuild:''].filter(Boolean);
 let command;
 if (system==='slack') {
  ({command,packageSources}=slackPlan({wm,term,browser,x11,wallpaper}));
  if (browser==='chromium') setup.push('slackChromium');
 } else if (system==='nix') {
  command=['sudo nixos-rebuild test','sudo nixos-rebuild switch'];
 } else {
  command=[...beforePackages,...install[system](normalPackages.join(' '))];
  if (distro==='debian' && wm==='hyprland') command.push('sudo apt install -t trixie-backports hyprland');
 }
 const module=system==='nix'? [
  '{ pkgs, ... }:',
  '{',
  ...(x11 ? ['  services.xserver.enable = true;'] : []),
  '  '+d.wms[wm],
  ...(nixDwm && wallpaper ? ['  services.xserver.windowManager.dwm.extraSessionCommands = \'\'','    feh --bg-fill "$HOME/Pictures/wallpaper.jpg"','  \'\';'] : []),
  ...(altBrowser ? ['  nixpkgs.config.allowUnfreePredicate = pkg: pkgs.lib.getName pkg == "google-chrome";'] : []),
  '  environment.systemPackages = with pkgs; [ '+[d[x11?'x':'w'],term,pkgBrowser||'google-chrome',wall,wm==='niri'?'xwayland-satellite':''].filter(Boolean).join(' ')+' ];',
  '}',''
 ].join('\n') : null;
 const startup=system==='nix'?null:sourceNiri || (wm==='niri' && distro==='gentoo')?'niri --session'
  :(x11?startX:startWayland)[wm];
 return {
  status:setup.length?'extra':'direct',official,source,setup,term,launchBrowser,launcher,command,module,
  startup,portal:portals[wm],packageSources,nixDwm,legacyHyprland,legacyLabwc,
  settings:legacyHyprland?legacyHyprlandSettings:legacyLabwc?{...wmSettings.labwc,reload:''}:wmSettings[wm],
  dwmSource:sourceDwm?'https://dl.suckless.org/dwm/dwm-6.8.tar.gz':null
 };
}
