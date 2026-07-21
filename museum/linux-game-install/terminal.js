(function(root, factory) {
  const academy = typeof module !== 'undefined' && module.exports ? require('../linux-terminal-academy/assets/virtual-system.js') : root.LinuxAcademy;
  const api = factory(academy);
  if (typeof module !== 'undefined') module.exports = api;
  if (root) root.LinuxGameTerminal = api;
})(typeof window !== 'undefined' ? window : globalThis, function(Academy) {
  'use strict';
  const packages = {
    nebustrike: { description: 'Computer Museum Interactive Repository\n  Deep-space vector combat arcade game\n  Runtime: Browser-native Canvas / Web Audio\n  Status: PLAYABLE', museum: true },
    freeciv: { description: 'Turn-based strategy game (future catalog entry; unavailable in this exhibit)', unavailable: true },
    nethack: { description: 'Dungeon exploration game (future catalog entry; unavailable in this exhibit)', unavailable: true }
  };
  // Keep this search intentionally finite. It is rendered directly in the browser
  // terminal, so package discovery must never delegate to a general shell/catalog scan.
  const gameSearchResults = Object.freeze(['nebustrike']);
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
  const addNebuStrike = state => { state.system.fileSystem.root.children.usr.children.games.children.nebustrike = node('file', null, '#!/bin/sh\n# Computer Museum Interactive Repository browser game\n', 'rwxr-xr-x'); };
  const removeNebuStrike = state => { delete state.system.fileSystem.root.children.usr.children.games.children.nebustrike; };
  const help = () => [
    'COMMAND HELP — type only after visitor@nebunix:~$ (do not type the prompt).',
    'apt update — refresh the virtual package catalog; it does not install the game.',
    'apt search nebustrike — search the virtual catalog for NEBU STRIKE.',
    'apt install nebustrike — install it in this browser-only virtual Linux environment.',
    'which nebustrike — show where the installed command is found.',
    'cd = change directory: cd /usr, then cd games; or use cd /usr/games.',
    'A path beginning with / starts at the virtual filesystem root. ls = list directory contents.',
    'nebustrike — start the installed game.',
    '', 'All commands are locally simulated in browser memory; no host shell, sudo, filesystem, package manager, or network is used.'
  ].join('\n');
  function academyResult(command, state) {
    const shell = new Academy.Shell(state.system, { allowedCommands: academyCommands });
    const result = shell.execute(command);
    return { handled: true, output: result.output.join('\n'), action: result.clear ? 'clear' : '' };
  }
  function execute(input, state) {
    const command = clean(input); const next = { ...state }; let output = ''; let action = '';
    const done = () => ({ handled: true, state: next, output, action });
    if (next.awaitingConfirmation) {
      if (/^(y|yes)$/i.test(command)) { next.awaitingConfirmation = false; next.installed = true; addNebuStrike(next); output = 'Selecting previously unselected package nebustrike.\nPreparing to unpack ...\nUnpacking nebustrike ...\nSetting up nebustrike ... done\n\nSOURCE: Computer Museum Interactive Repository\nNebu Strike is installed in this browser-only virtual environment.'; action = 'installed'; return done(); }
      next.awaitingConfirmation = false; output = 'Installation cancelled.'; return done();
    }
    if (!command) return done();
    if (command === 'help') output = help();
    else if (command === 'reset') { const reset = freshState(); removeNebuStrike(reset); return { handled: true, state: reset, output: 'Virtual environment reset. No real system state was changed.', action: 'reset' }; }
    else if (/^(?:sudo )?apt update$/i.test(command)) { next.updated = true; output = 'Hit:1 museum://nebunix stable InRelease\nGet:2 museum://nebunix stable/main Packages [4,096 B]\nFetched 4,096 B in 0s (local educational catalog)\nReading package lists... Done\n\nPackage information updated from the fixed local exhibit catalog. No Debian mirror was contacted.'; action = 'updated'; }
    else if (/^apt search\s+nebustrike$/i.test(command)) { output = linesForPackages(['nebustrike']); action = 'searched'; }
    else if (/^apt search\s+games$/i.test(command)) { output = linesForPackages(gameSearchResults); action = 'searched'; }
    else if (/^(?:sudo )?apt install\s+nebustrike$/i.test(command)) { next.awaitingConfirmation = true; output = 'Reading package lists... Done\nBuilding dependency tree... Done\nSOURCE: Computer Museum Interactive Repository\nThe following NEW packages will be installed:\n  nebustrike\n0 upgraded, 1 newly installed, 0 to remove.\nNeed to get 0 B of archives.\n\nDo you want to continue? [Y/n]'; action = 'confirm'; }
    else if (command === 'which nebustrike') output = next.installed ? '/usr/games/nebustrike' : '';
    else if (command === 'nebustrike' || command === '/usr/games/nebustrike') { if (!next.installed) output = 'nebustrike: command not found\n\nTry: apt search games'; else { next.launched = true; output = 'STARTING NEBU STRIKE...\nINITIALIZING DISPLAY :0...\nLOADING LOCAL GAME DATA...\n\nMISSION COMPLETE\nYOU INSTALLED AND LAUNCHED A REAL GAME FROM THE TERMINAL.'; action = 'launch'; } }
    else ({ output, action } = academyResult(command, next));
    return done();
  }
  return { freshState, execute, packages, gameSearchResults, academyCommands };
});
