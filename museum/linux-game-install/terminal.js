(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined') module.exports = api;
  if (root) root.LinuxGameTerminal = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';
  const packages = {
    openttd: { description: 'Open source transport simulation game', installed: true },
    'openttd-opengfx': { description: 'Free graphics base set', installed: true },
    'openttd-opensfx': { description: 'Free sound effects base set', installed: true },
    'openttd-openmsx': { description: 'Free music base set', installed: true },
    freeciv: { description: 'Turn-based strategy game (future catalog entry; unavailable in this exhibit)', unavailable: true },
    nethack: { description: 'Dungeon exploration game (future catalog entry; unavailable in this exhibit)', unavailable: true }
  };
  const installSet = ['openttd', 'openttd-opengfx', 'openttd-opensfx', 'openttd-openmsx'];
  const freshState = () => ({ updated: false, installed: false, awaitingConfirmation: false, launched: false });
  const clean = value => String(value || '').trim().replace(/\s+/g, ' ');
  const linesForPackages = names => names.map(name => `${name}\n  ${packages[name].description}`).join('\n\n');
  function execute(input, state) {
    const command = clean(input); const next = { ...state }; let output = ''; let action = '';
    if (next.awaitingConfirmation) {
      if (/^(y|yes)$/i.test(command)) { next.awaitingConfirmation = false; next.installed = true; output = 'Selecting previously unselected package openttd.\nPreparing to unpack ...\nUnpacking openttd ...\nUnpacking openttd-opengfx ...\nUnpacking openttd-opensfx ...\nUnpacking openttd-openmsx ...\nSetting up openttd-opengfx ...\nSetting up openttd-opensfx ...\nSetting up openttd-openmsx ...\nSetting up openttd ...\nProcessing triggers for man-db ...\n\nOpenTTD and its free base sets are installed in this browser-only virtual environment.'; return { state: next, output, action: 'installed' }; }
      next.awaitingConfirmation = false; return { state: next, output: 'Installation cancelled.', action };
    }
    if (!command) return { state: next, output, action };
    if (command === 'help') output = 'Available commands: help, clear, pwd, whoami, ls, apt search, apt show, sudo apt update, sudo apt install openttd, which openttd, dpkg -l | grep openttd, openttd, reset\n\nAll commands are locally simulated; no host shell, sudo, filesystem, package manager, or network is used.';
    else if (command === 'pwd') output = '/home/visitor';
    else if (command === 'whoami') output = 'visitor';
    else if (command === 'ls') output = 'Desktop  Documents  Downloads  README-museum.txt';
    else if (command === 'clear') action = 'clear';
    else if (command === 'reset') { return { state: freshState(), output: 'Virtual environment reset. No real system state was changed.', action: 'reset' }; }
    else if (command === 'sudo apt update') { next.updated = true; output = 'Hit:1 museum://nebunix stable InRelease\nGet:2 museum://nebunix stable/main Packages [4,096 B]\nFetched 4,096 B in 0s (local educational catalog)\nReading package lists... Done\n\nPackage information updated from the fixed local exhibit catalog. No Debian mirror was contacted.'; action = 'updated'; }
    else if (/^apt search\s+openttd$/i.test(command)) { output = linesForPackages(installSet) + '\n\nThese names mirror Debian/OpenTTD ecosystem concepts; this browser catalog is local and educational.'; action = 'searched'; }
    else if (/^apt search\s+games$/i.test(command)) { output = linesForPackages(['openttd', 'freeciv', 'nethack']) + '\n\nFuture catalog entries are shown for discovery only and cannot be installed here.'; }
    else if (/^apt show\s+openttd$/i.test(command)) output = 'Package: openttd\nDescription: Open source transport simulation game\nBase sets: openttd-opengfx, openttd-opensfx, openttd-openmsx\nRepository: nebunix local educational catalog\nNetwork: disabled';
    else if (/^sudo apt install\s+openttd$/i.test(command)) { next.awaitingConfirmation = true; output = 'Reading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\nThe following NEW packages will be installed:\n  openttd\n  openttd-opengfx\n  openttd-opensfx\n  openttd-openmsx\n0 upgraded, 4 newly installed, 0 to remove.\nNeed to get 18.4 MB of archives.\nAfter this operation, 52.1 MB of additional disk space will be used.\n\nDo you want to continue? [Y/n]'; action = 'confirm'; }
    else if (command === 'which openttd') output = next.installed ? '/usr/games/openttd' : '';
    else if (command === 'dpkg -l | grep openttd') output = next.installed ? installSet.map(name => `ii  ${name.padEnd(18)} 13.4-1  all  ${packages[name].description}`).join('\n') : '';
    else if (command === 'openttd') { if (!next.installed) output = 'openttd: command not found\n\nTry: apt search openttd'; else { next.launched = true; output = 'STARTING OPENTTD...\nDISPLAY :0 READY\nLaunching OpenTTD...'; action = 'launch'; } }
    else output = `${command.split(' ')[0]}: command not found`;
    return { state: next, output, action };
  }
  return { freshState, execute, packages, installSet };
});
