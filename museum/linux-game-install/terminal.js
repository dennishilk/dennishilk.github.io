(function(root, factory) {
  const academy = typeof module !== 'undefined' && module.exports ? require('../linux-terminal-academy/assets/virtual-system.js') : root.LinuxAcademy;
  const api = factory(academy);
  if (typeof module !== 'undefined') module.exports = api;
  if (root) root.LinuxGameTerminal = api;
})(typeof window !== 'undefined' ? window : globalThis, function(Academy) {
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
  const academyCommands = Academy.commandProfiles.lab08;
  const node = (type, children, content, mode) => type === 'directory'
    ? { type, children: children || {}, owner: 'visitor', group: 'visitor', mode: mode || 'rwxr-xr-x' }
    : { type, content: content || '', owner: 'visitor', group: 'visitor', mode: mode || 'rw-r--r--' };
  function gameSystem() {
    const system = new Academy.VirtualSystem();
    system.currentUser = 'visitor'; system.homeDirectory = '/home/visitor'; system.cwd = system.homeDirectory;
    system.fileSystem.root.children = {
      bin: node('directory'), etc: node('directory', { hostname: node('file', null, 'nebunix\n'), museum: node('directory', { 'gallery.conf': node('file', null, 'PORT=8080\nCONTENT_PATH=/srv/museum\n') }) }),
      home: node('directory', { visitor: node('directory', {
        Desktop: node('directory'), Documents: node('directory'), Downloads: node('directory'),
        'README-museum.txt': node('file', null, 'Welcome to the Nebunix game-install exhibit.\n')
      }) }),
      srv: node('directory', { museum: node('directory') }), tmp: node('directory'), usr: node('directory', { games: node('directory') }), var: node('directory', { log: node('directory') })
    };
    ['createDirectory', 'createFile'].forEach(method => {
      const original = system.fileSystem[method].bind(system.fileSystem);
      system.fileSystem[method] = (...args) => {
        const result = original(...args);
        if (result.node) { result.node.owner = 'visitor'; result.node.group = 'visitor'; }
        return result;
      };
    });
    return system;
  }
  const freshState = () => ({ updated: false, installed: false, awaitingConfirmation: false, launched: false, system: gameSystem() });
  const clean = value => String(value || '').trim().replace(/\s+/g, ' ');
  const linesForPackages = names => names.map(name => `${name}\n  ${packages[name].description}`).join('\n\n');
  const addOpenTTD = state => { state.system.fileSystem.root.children.usr.children.games.children.openttd = node('file', null, '#!/bin/sh\n# Browser-only OpenTTD launch adapter\n', 'rwxr-xr-x'); };
  const removeOpenTTD = state => { delete state.system.fileSystem.root.children.usr.children.games.children.openttd; };
  const help = () => [
    'NAVIGATION: pwd, ls [-l] [PATH], cd [PATH]',
    'FILES: cat, touch, mkdir, cp, mv, rm',
    'PERMISSIONS: chmod, chown, id, sudo',
    'SYSTEM: whoami, uname, date, ps, top, kill, systemctl, journalctl, config-set',
    'TEXT: echo, grep, wc, head, tail; use | between supported text commands',
    'HELP: help, man COMMAND, clear',
    'PACKAGES: apt search, apt show, sudo apt update, sudo apt install openttd, which openttd, dpkg -l | grep openttd, openttd, reset',
    '', 'All commands are locally simulated in browser memory; no host shell, sudo, filesystem, package manager, or network is used.'
  ].join('\n');
  function academyResult(command, state) {
    const shell = new Academy.Shell(state.system, { allowedCommands: academyCommands });
    const result = shell.execute(command);
    return { output: result.output.join('\n'), action: result.clear ? 'clear' : '' };
  }
  function execute(input, state) {
    const command = clean(input); const next = { ...state }; let output = ''; let action = '';
    if (next.awaitingConfirmation) {
      if (/^(y|yes)$/i.test(command)) { next.awaitingConfirmation = false; next.installed = true; addOpenTTD(next); output = 'Selecting previously unselected package openttd.\nPreparing to unpack ...\nUnpacking openttd ...\nUnpacking openttd-opengfx ...\nUnpacking openttd-opensfx ...\nUnpacking openttd-openmsx ...\nSetting up openttd-opengfx ...\nSetting up openttd-opensfx ...\nSetting up openttd-openmsx ...\nSetting up openttd ...\nProcessing triggers for man-db ...\n\nOpenTTD and its free base sets are installed in this browser-only virtual environment.'; return { state: next, output, action: 'installed' }; }
      next.awaitingConfirmation = false; return { state: next, output: 'Installation cancelled.', action };
    }
    if (!command) return { state: next, output, action };
    if (command === 'help') output = help();
    else if (command === 'reset') { const reset = freshState(); removeOpenTTD(reset); return { state: reset, output: 'Virtual environment reset. No real system state was changed.', action: 'reset' }; }
    else if (command === 'sudo apt update') { next.updated = true; output = 'Hit:1 museum://nebunix stable InRelease\nGet:2 museum://nebunix stable/main Packages [4,096 B]\nFetched 4,096 B in 0s (local educational catalog)\nReading package lists... Done\n\nPackage information updated from the fixed local exhibit catalog. No Debian mirror was contacted.'; action = 'updated'; }
    else if (/^apt search\s+openttd$/i.test(command)) { output = linesForPackages(installSet) + '\n\nThese names mirror Debian/OpenTTD ecosystem concepts; this browser catalog is local and educational.'; action = 'searched'; }
    else if (/^apt search\s+games$/i.test(command)) output = linesForPackages(['openttd', 'freeciv', 'nethack']) + '\n\nFuture catalog entries are shown for discovery only and cannot be installed here.';
    else if (/^apt show\s+openttd$/i.test(command)) output = 'Package: openttd\nDescription: Open source transport simulation game\nBase sets: openttd-opengfx, openttd-opensfx, openttd-openmsx\nRepository: nebunix local educational catalog\nNetwork: disabled';
    else if (/^sudo apt install\s+openttd$/i.test(command)) { next.awaitingConfirmation = true; output = 'Reading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done\nThe following NEW packages will be installed:\n  openttd\n  openttd-opengfx\n  openttd-opensfx\n  openttd-openmsx\n0 upgraded, 4 newly installed, 0 to remove.\nNeed to get 18.4 MB of archives.\nAfter this operation, 52.1 MB of additional disk space will be used.\n\nDo you want to continue? [Y/n]'; action = 'confirm'; }
    else if (command === 'which openttd') output = next.installed ? '/usr/games/openttd' : '';
    else if (command === 'dpkg -l | grep openttd') output = next.installed ? installSet.map(name => `ii  ${name.padEnd(18)} 13.4-1  all  ${packages[name].description}`).join('\n') : '';
    else if (command === 'openttd') { if (!next.installed) output = 'openttd: command not found\n\nTry: apt search openttd'; else { next.launched = true; output = 'STARTING OPENTTD...\nDISPLAY :0 READY\nLaunching OpenTTD...'; action = 'launch'; } }
    else ({ output, action } = academyResult(command, next));
    return { state: next, output, action };
  }
  return { freshState, execute, packages, installSet, academyCommands };
});
