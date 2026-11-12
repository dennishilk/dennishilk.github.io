import { wmSettings } from './config.js';

const archWms = {
 xmonad:'xmonad xmonad-contrib ghc',dwm:'base-devel libx11 libxft libxinerama fontconfig freetype2',i3:'i3-wm',
 sway:'sway',hyprland:'hyprland',niri:'niri xwayland-satellite',labwc:'labwc',awesome:'awesome'
};
const debianWms = {
 xmonad:'xmonad ghc libghc-xmonad-dev libghc-xmonad-contrib-dev',
 dwm:'build-essential libx11-dev libxft-dev libxinerama-dev libfontconfig-dev libfreetype-dev',
 i3:'i3-wm',sway:'sway',labwc:'labwc',awesome:'awesome'
};
const aptDesktop = {i3:'i3-wm',sway:'sway',awesome:'awesome'};
const fedoraWms = {xmonad:'xmonad',i3:'i3',sway:'sway',labwc:'labwc',awesome:'awesome'};
const gentooWms = {
 xmonad:'x11-wm/xmonad x11-wm/xmonad-contrib dev-lang/ghc',
 dwm:'sys-devel/gcc dev-build/make x11-libs/libX11 x11-libs/libXft x11-libs/libXinerama media-libs/fontconfig media-libs/freetype',
 i3:'x11-wm/i3',awesome:'x11-wm/awesome',sway:'gui-wm/sway',labwc:'gui-wm/labwc'};
const nixWms = {
 xmonad:'services.xserver.windowManager.xmonad = { enable = true; enableContribAndExtras = true; };',
 i3:'services.xserver.windowManager.i3.enable = true;',
 awesome:'services.xserver.windowManager.awesome.enable = true;',
 sway:'programs.sway.enable = true;',niri:'programs.niri.enable = true;',labwc:'programs.labwc.enable = true;'
};
const f=(firefox,chromium)=>({firefox,chromium});
const distroPackages = {
 debian:{system:'apt',wms:debianWms,browsers:f('firefox-esr','chromium'),x:'xserver-xorg xinit suckless-tools',w:'wofi xwayland',official:'https://packages.debian.org/trixie/'},
 arch:{system:'arch',wms:archWms,browsers:f('firefox','chromium'),x:'xorg-server xorg-xinit dmenu',w:'wofi xorg-xwayland',official:'https://archlinux.org/packages/'},
 cachyos:{system:'arch',wms:archWms,browsers:f('firefox','chromium'),x:'xorg-server xorg-xinit dmenu',w:'wofi xorg-xwayland',official:'https://wiki.cachyos.org/',extra:true},
 fedora:{system:'fedora',wms:fedoraWms,browsers:f('firefox','chromium'),x:'xorg-x11-server-Xorg xorg-x11-xinit dmenu',w:'wofi xorg-x11-server-Xwayland',official:'https://packages.fedoraproject.org/',extra:true},
 mint:{system:'apt',wms:aptDesktop,browsers:f('firefox','chromium'),x:'xserver-xorg xinit suckless-tools',w:'wofi xwayland',official:'https://packages.linuxmint.com/',extra:true},
 ubuntu:{system:'apt',wms:aptDesktop,browsers:f('firefox','chromium-browser'),x:'xserver-xorg xinit suckless-tools',w:'wofi xwayland',official:'https://packages.ubuntu.com/',extra:true},
 zorin:{system:'apt',wms:aptDesktop,browsers:f('firefox',null),x:'xserver-xorg xinit suckless-tools',w:'wofi xwayland',official:'https://help.zorin.com/',extra:true},
 gentoo:{system:'gentoo',wms:gentooWms,browsers:f('www-client/firefox','www-client/chromium'),x:'x11-base/xorg-server x11-apps/xinit x11-misc/dmenu',w:'gui-apps/wofi x11-base/xwayland',official:'https://packages.gentoo.org/',extra:true},
 opensuse:{system:'suse',wms:{i3:'i3',sway:'sway'},browsers:f('MozillaFirefox','chromium'),x:'xorg-x11-server xinit dmenu',w:'wofi xwayland',official:'https://software.opensuse.org/',extra:true},
 nixos:{system:'nix',wms:nixWms,browsers:f('firefox','chromium'),x:'dmenu',w:'wofi',official:'https://search.nixos.org/options',extra:true},
 slackware:{system:'slack',wms:{dwm:'dwm'},browsers:f('mozilla-firefox',null),official:'https://docs.slackware.com/slackware:slackbuild_scripts',extra:true}
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
 nix:['google-chrome-stable','https://search.nixos.org/packages?query=google-chrome','nix']
};
const startX = {xmonad:'startx /usr/bin/xmonad',i3:'startx /usr/bin/i3',awesome:'startx /usr/bin/awesome',dwm:'startx "$HOME/.local/bin/dwm"'};
const startWayland = {sway:'sway',hyprland:'start-hyprland',niri:'niri-session',labwc:'labwc'};
const portals = {
 hyprland:'xdg-desktop-portal-hyprland',niri:'xdg-desktop-portal-gnome',sway:'xdg-desktop-portal-wlr',labwc:'xdg-desktop-portal-wlr'
};

export function plan({distro,wm,terminal,browser,wallpaper}) {
 if (!Object.hasOwn(distroPackages,distro) || !Object.hasOwn(wmSettings,wm)) throw new Error('selection');
 const d=distroPackages[distro], {system,official}=d, setting=wmSettings[wm], x11=setting.protocol==='x11';
 const term=terminal==='classic'?(x11?'xterm':'foot'):terminal;
 if (!['classic','kitty','alacritty'].includes(terminal) || !['firefox','chromium','chrome'].includes(browser)) throw new Error('selection');
 const altBrowser=browser==='chrome' ? chrome[system] : null;
 const pkgBrowser=d.browsers[browser];
 const launchBrowser=altBrowser?.[0] || (distro==='debian' && browser==='firefox' ? 'firefox-esr' : distro==='ubuntu' && browser==='chromium' ? 'chromium-browser' : browser);
 const setup=[];
 if (d.extra) setup.push(distro);
 if (wm==='dwm') setup.push('source');
 if (altBrowser) setup.push(altBrowser[2]);
 if (distro==='ubuntu' && browser!=='chrome') setup.push('snap');
 const source=altBrowser?.[1];
 const supported=Boolean(d.wms[wm] && (pkgBrowser || altBrowser) && (system!=='slack' || terminal==='classic'));
 const launcher=x11?'dmenu_run':'wofi --show drun';
 const startup=(x11?startX:startWayland)[wm];
 if (!supported) return {status:'unverified',official,source,term,launchBrowser,launcher};
 const termPackage=system==='gentoo'?gentooTerms[term]:term;
 const wall=wallpaper?(x11?'feh':'swaybg'):'';
 const wallPackage=system==='gentoo'&&wall?(x11?'media-gfx/feh':'gui-apps/swaybg'):wall;
 const extraBrowser=altBrowser?.[2]==='emerge'?'www-client/google-chrome':'';
 const normalPackages=[d.wms[wm],x11?d.x:d.w,termPackage,pkgBrowser,wallPackage,extraBrowser].filter(Boolean);
 const command=system==='nix' ? ['sudo nixos-rebuild test','sudo nixos-rebuild switch']
  : system==='slack' ? ['slackpkg update','slackpkg install xterm','slackpkg install mozilla-firefox']
  : install[system](normalPackages.join(' '));
 const module=system==='nix'? [
  '{ pkgs, ... }:',
  '{',
  ...(x11 ? ['  services.xserver.enable = true;'] : []),
  '  '+d.wms[wm],
  ...(altBrowser ? ['  nixpkgs.config.allowUnfreePredicate = pkg: pkgs.lib.getName pkg == "google-chrome";'] : []),
  '  environment.systemPackages = with pkgs; [ '+[d[x11?'x':'w'],term,pkgBrowser||'google-chrome',wall,wm==='niri'?'xwayland-satellite':''].filter(Boolean).join(' ')+' ];',
  '}',''
 ].join('\n') : null;
 return {
  status:setup.length?'extra':'direct',official,source,setup,term,launchBrowser,launcher,command,module,
  startup:system==='nix'?null:startup,portal:portals[wm],
  launcherSource:system==='slack'?'https://slackbuilds.org/repository/15.0/desktop/dmenu/':null,
  dwmSource:wm==='dwm'?'https://dl.suckless.org/dwm/dwm-6.8.tar.gz':null
 };
}
