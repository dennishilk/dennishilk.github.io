import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { assistants, LAUNCH_OPTIONS, buildLaunchOptions, diagnosticsFor, inspectGraphics, diagnosePerformance } from '../assets/linux-gaming-repair/diagnostics.js';
import { loadProblems } from '../scripts/build-linux-fix-lab.mjs';
import { catalog as hardwareCatalog } from '../assets/linux-hardware-explorer/catalog.js';

const articleIds = new Set(['proton-startup', 'vulkan-initialization', 'dxvk-no-device', 'vulkan-32-bit', 'wrong-gpu', 'amdgpu-ring-timeout', 'nvidia-mismatch', 'vkd3d-startup', 'shader-stutter', 'movement-freezes', 'controller-input', 'steam-deck-startup', 'proton-audio']);
const fixedIds = new Set(loadProblems().map(p => p.id));
const hardwareIds = new Set(hardwareCatalog.profiles.map(p => p.id));
const bilingual = value => {
  assert.equal(typeof value?.en, 'string');
  assert.equal(typeof value?.de, 'string');
  assert.ok(value.en.trim().length > 0);
  assert.ok(value.de.trim().length > 0);
};
const nodeAt = (assistantId, path) => {
  const assistant = assistants.find(item => item.id === assistantId);
  assert.ok(assistant, `Assistant ${assistantId} exists`);
  let node = assistant.nodes[assistant.start];
  for (const id of path) {
    const selection = node.choices?.find(item => item.id === id);
    assert.ok(selection, `Choice ${id} exists on path ${path.join(' → ')}`);
    node = assistant.nodes[selection.next];
  }
  return node;
};
const allNodes = assistants.flatMap(item => Object.values(item.nodes));
const reading = report => report.observations.find(item => item.stage === 'rendering')?.title.en;
const hasGraphicsFailure = text => inspectGraphics(text).observations.some(item => item.stage === 'error');

test('six distinct assistants have complete, reachable, bilingual decision graphs', () => {
  assert.equal(assistants.length, 6);
  assert.equal(new Set(assistants.map(item => item.id)).size, 6);
  for (const assistant of assistants) {
    bilingual(assistant.title);
    assert.ok(assistant.nodes[assistant.start]);
    const visiting = new Set();
    const reached = new Set();
    const walk = id => {
      assert.ok(!visiting.has(id), `No cycle in ${assistant.id}/${id}`);
      if (reached.has(id)) return;
      reached.add(id);
      visiting.add(id);
      const node = assistant.nodes[id];
      assert.ok(node, `Every transition exists in ${assistant.id}/${id}`);
      if (node.question) {
        bilingual(node.question);
        bilingual(node.why);
        assert.ok(node.choices.length >= 2);
        assert.equal(new Set(node.choices.map(item => item.id)).size, node.choices.length);
        for (const item of node.choices) { bilingual(item.label); walk(item.next); }
      } else {
        bilingual(node.heading);
        bilingual(node.body);
        assert.ok(node.body.en.length > 120, 'Terminal routes give concrete next steps');
      }
      for (const command of node.commands || []) {
        assert.ok(['read-only', 'temporary', 'declarative'].includes(command.kind));
        bilingual(command.interpretation);
        bilingual(command.requirements);
        if (command.kind !== 'read-only') bilingual(command.rollback);
      }
      visiting.delete(id);
    };
    walk(assistant.start);
    assert.equal(reached.size, Object.keys(assistant.nodes).length, `No unreachable nodes in ${assistant.id}`);
    assert.ok(Object.values(assistant.nodes).filter(node => node.choices).length >= 3, 'Each assistant branches beyond its first question');
    assert.ok(Object.values(assistant.nodes).some(node => node.choices?.some(c => /unknown|missing/.test(c.id))));
    assert.ok(Object.values(assistant.nodes).some(node => node.articleIds?.length));
    assert.ok(Object.values(assistant.nodes).some(node => node.fixLab?.length));
    assert.ok(Object.values(assistant.nodes).some(node => node.hardware?.length));
  }
});

test('assistant article, Fix Lab and hardware links use existing IDs', () => {
  const usedArticles = new Set();
  for (const node of allNodes) {
    for (const id of node.articleIds || []) { assert.ok(articleIds.has(id), `Known gaming article ${id}`); usedArticles.add(id); }
    for (const id of node.fixLab || []) assert.ok(fixedIds.has(id), `Existing Fix Lab article ${id}`);
    for (const id of node.hardware || []) assert.ok(hardwareIds.has(id), `Existing hardware profile ${id}`);
  }
  assert.deepEqual(usedArticles, articleIds);
});

test('startup decisions distinguish plain Wine, native games, policy and rendering APIs', () => {
  const wine = nodeAt('proton-startup', ['wine']);
  assert.match(wine.body.en, /PROTON_LOG is not a plain-Wine/);
  assert.match(wine.body.en, /configured|actual|host wine --version/i);
  const native = nodeAt('proton-startup', ['native']);
  assert.match(native.body.en, /without adding Proton flags/);
  const policy = nodeAt('proton-startup', ['proton', 'anti-cheat']);
  assert.match(policy.body.en, /publisher/);
  assert.match(policy.body.en, /Do not disable or bypass/);
  const dx12 = nodeAt('proton-startup', ['proton', 'no-launch', 'dx12']);
  assert.ok(dx12.articleIds.includes('vkd3d-startup'));
  assert.match(dx12.body.en, /cannot replace this Direct3D 12/);
  assert.match(nodeAt('proton-startup', ['proton', 'no-launch', 'dependency']).body.en, /backup|Prefix|prefix/);
  assert.ok(nodeAt('proton-startup', ['proton', 'no-launch', 'oom']).fixLab.includes('cgroup-memory-oom-kill'));
  const black = nodeAt('proton-startup', ['proton', 'black', 'desktop']);
  assert.match(black.body.en, /black window alone does not establish device loss/);
});

test('Vulkan decisions keep host success, architecture, selected GPU and feature failure separate', () => {
  const arch = nodeAt('vulkan-stack', ['hardware', 'arch']);
  assert.match(arch.body.en, /64-bit host probe does not establish 32-bit/);
  assert.match(arch.body.en, /WoW64/);
  const wrong = nodeAt('vulkan-stack', ['hardware', 'wrong', 'mesa']);
  assert.match(wrong.body.en, /ordering is not proof/);
  const features = nodeAt('vulkan-stack', ['hardware', 'dx12']);
  assert.match(features.body.en, /bundled DXVK or VKD3D-Proton version/);
  assert.match(features.body.en, /requirements change by release/);
  const nvidia = nodeAt('vulkan-stack', ['failed', 'nvidia']);
  assert.match(nvidia.body.en, /running old module/);
  assert.match(nvidia.body.en, /PRIME variables cannot repair a mismatch/);
  assert.match(nodeAt('vulkan-stack', ['failed', 'bound']).body.en, /RADV and AMDVLK can both use amdgpu/);
});

test('crash symptom routes preserve the Cthulhu no-final-error and mixed-evidence cases', () => {
  const noFinal = nodeAt('gpu-crash', ['hardlock', 'unknown']);
  assert.match(noFinal.heading.en, /cause open/);
  assert.match(noFinal.body.en, /does not confirm or exclude GPU, PCIe, kernel\/firmware, graphics userspace, storage or power/);
  assert.match(noFinal.body.en, /remains unresolved/);
  assert.ok(noFinal.hardware.includes('amd-navi44'));
  const audio = nodeAt('gpu-crash', ['audio', 'unknown']);
  assert.equal(audio, noFinal, 'Continuing audio without final evidence shares an open evidence route, not a fabricated timeout');
  const reset = nodeAt('gpu-crash', ['reset', 'ring']);
  assert.match(reset.body.en, /not a specific defective chip/);
  const bus = nodeAt('gpu-crash', ['hardlock', 'gpu', 'bus']);
  assert.match(bus.body.en, /downgrade alone does not prove/);
  const mixed = nodeAt('gpu-crash', ['hardlock', 'mixed']);
  assert.match(mixed.body.en, /different causes/);
  assert.match(mixed.body.en, /power cap/);
  assert.match(mixed.body.en, /NVMe move did not eliminate/);
  const system = nodeAt('gpu-crash', ['hardlock', 'watchdog']);
  assert.ok(system.fixLab.includes('kernel-machine-check'));
  const delayed = nodeAt('gpu-crash', ['game', 'minutes', 'thermal']);
  assert.match(delayed.body.en, /not proof of overheating/);
});

test('stutter branches distinguish compilation, repeated streaming, storage and pacing', () => {
  const shader = nodeAt('frame-stutter', ['first', 'compiler']);
  assert.match(shader.body.en, /Keep caches/);
  const firstUnknown = nodeAt('frame-stutter', ['first', 'unknown']);
  assert.match(firstUnknown.body.en, /does not distinguish shader compilation from asset caching/);
  const mixed = nodeAt('frame-stutter', ['movement', 'mixed']);
  assert.match(mixed.body.en, /112 W/);
  assert.match(mixed.body.en, /not wattage advice/);
  assert.match(mixed.body.en, /no common cause is established/);
  assert.ok(mixed.fixLab.includes('storage-sata-crc-errors'));
  const storage = nodeAt('frame-stutter', ['movement', 'storage']);
  assert.match(storage.body.en, /BadCRC is distinct from an uncorrectable sector/);
  const pacing = nodeAt('frame-stutter', ['steady', 'pacing']);
  assert.match(pacing.body.en, /mangoapp/);
  assert.match(pacing.body.en, /restore/);
});

test('controller and audio/Deck assistants distinguish transport, session and game paths', () => {
  const game = nodeAt('controller-input', ['usb', 'present', 'events']);
  assert.match(game.body.en, /not to the game/);
  assert.match(game.body.en, /Restore the original override/);
  assert.match(nodeAt('controller-input', ['usb', 'absent']).body.en, /cannot be repaired by a per-game mapping/);
  assert.match(nodeAt('controller-input', ['usb', 'present', 'steam']).body.en, /rather than chmod 777/);
  assert.match(nodeAt('controller-input', ['bluetooth']).body.en, /paired record alone does not prove/);
  const routing = nodeAt('audio-deck', ['game-audio', 'stream']);
  const backend = nodeAt('audio-deck', ['game-audio', 'backend']);
  assert.notEqual(routing, backend);
  assert.match(routing.body.en, /restore/);
  assert.match(backend.body.en, /actual Wine\/Proton build/);
  const deckMode = nodeAt('audio-deck', ['deck', 'gaming']);
  assert.match(deckMode.body.en, /mangoapp/);
  const deckAll = nodeAt('audio-deck', ['deck', 'all']);
  assert.match(deckAll.body.en, /Arch package-installation advice is not interchangeable with SteamOS/);
});

test('insufficient-evidence routes request observations without naming a confirmed cause', () => {
  for (const assistant of assistants) {
    const route = Object.values(assistant.nodes).find(node => node.heading && /Collect|Establish|Find|Record|No final GPU message/.test(node.heading.en));
    assert.ok(route, `${assistant.id} has an evidence route`);
    assert.match(route.body.en, /record|collect|check|capture|test|observe|missing|unknown|unproven|unresolved|retain|stage/i);
    assert.doesNotMatch(route.body.en, /the root cause is|definitely caused|problem is solved/i);
  }
});

test('launch options default to unchanged Steam command and metadata covers requirements/rollback', () => {
  assert.deepEqual(buildLaunchOptions(), { command: '%command%', activeOptions: [], warnings: [], errors: [] });
  assert.equal(LAUNCH_OPTIONS.length, 7);
  for (const option of LAUNCH_OPTIONS) {
    for (const field of ['title', 'explanation', 'requirements', 'sideEffects', 'rollback']) bilingual(option[field]);
  }
  assert.match(LAUNCH_OPTIONS.find(o => o.id === 'mangoHud').requirements.en, /Vulkan only/);
  assert.match(LAUNCH_OPTIONS.find(o => o.id === 'wineD3D').requirements.en, /not a Direct3D 12 fallback/);
  assert.match(LAUNCH_OPTIONS.find(o => o.id === 'nvidiaPrime').sideEffects.en, /semantics vary/);
});

test('launch builder emits supported environment diagnostics in stable order', () => {
  const build = buildLaunchOptions({ protonLog: true, mangoHud: true, dxvkHud: true, loaderDebug: true, api: 'dx9-11', gpu: 'mesa-discrete', driver: 'mesa' });
  assert.equal(build.command, 'PROTON_LOG=1 MANGOHUD=1 DXVK_HUD=devinfo,fps,frametimes,compiler VK_LOADER_DEBUG=error,warn,info DRI_PRIME=1 %command%');
  assert.equal(build.errors.length, 0);
  assert.deepEqual(build.activeOptions, ['protonLog', 'mangoHud', 'dxvkHud', 'loaderDebug', 'mesaDiscrete']);
  assert.ok(build.warnings.length >= 3);
  const nvidia = buildLaunchOptions({ gpu: 'nvidia-prime', driver: 'nvidia' });
  assert.match(nvidia.command, /__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia __VK_LAYER_NV_optimus=NVIDIA_only/);
  assert.deepEqual(nvidia.activeOptions, ['nvidiaPrime']);
  assert.match(nvidia.warnings[0].en, /do not guarantee/);
});

test('runtime/API/driver conflicts produce explanations and no copyable misleading command', () => {
  for (const selection of [
    { protonLog: true, runtime: 'wine' }, { protonLog: true, runtime: 'native' },
    { wineD3D: true, api: 'dx12' }, { wineD3D: true }, { wineD3D: true, api: 'native-vulkan' },
    { wineD3D: true, api: 'dx9-11', runtime: 'wine' },
    { wineD3D: true, api: 'dx9-11', mangoHud: true }, { wineD3D: true, api: 'dx9-11', dxvkHud: true },
    { wineD3D: true, api: 'dx9-11', loaderDebug: true },
    { dxvkHud: true, api: 'dx12' }, { dxvkHud: true }, { dxvkHud: true, api: 'dx9-11', runtime: 'native' },
    { gpu: 'mesa-discrete', driver: 'nvidia' }, { gpu: 'mesa-discrete' },
    { gpu: 'nvidia-prime', driver: 'mesa' }, { gpu: 'nvidia-prime' }
  ]) {
    const output = buildLaunchOptions(selection);
    assert.ok(output.errors.length, JSON.stringify(selection));
    assert.equal(output.command, '');
    assert.deepEqual(output.activeOptions, []);
    for (const error of output.errors) bilingual(error);
  }
  assert.equal(buildLaunchOptions({ wineD3D: true, api: 'dx9-11' }).command, 'PROTON_USE_WINED3D=1 %command%');
  assert.equal(buildLaunchOptions({ dxvkHud: true, api: 'dx9-11', runtime: 'wine' }).errors.length, 0);
});

test('untrusted builder values cannot inject commands or silently activate boolean settings', () => {
  const attacks = [null, [], 'PROTON_LOG=1; touch /tmp/example', { gpu: '$(touch /tmp/example)' }, { api: 'dx9-11; env' }, { driver: 'mesa`env`' }, { runtime: 'native\nwhoami' }, { protonLog: 'false' }, { mangoHud: 1 }, { extra: 'LD_PRELOAD=anything' }, { command: 'rm -rf /' }];
  for (const attack of attacks) {
    const output = buildLaunchOptions(attack);
    assert.equal(output.command, '');
    assert.ok(output.errors.length);
  }
  const inherited = Object.create({ protonLog: true, command: 'unsafe' });
  assert.equal(buildLaunchOptions(inherited).command, '%command%');
  assert.equal(buildLaunchOptions(JSON.parse('{"__proto__":{"protonLog":true}}')).command, '');
});

test('every allowlisted launch combination retains renderer and driver invariants', () => {
  const enabledIds = new Set(LAUNCH_OPTIONS.map(option => option.id));
  for (const runtime of ['proton', 'wine', 'native']) for (const api of ['unknown', 'dx9-11', 'dx12', 'native-vulkan']) for (const driver of ['unknown', 'mesa', 'nvidia']) for (const gpu of ['default', 'mesa-discrete', 'nvidia-prime']) for (let mask = 0; mask < 32; mask++) {
    const output = buildLaunchOptions({ runtime, api, driver, gpu, protonLog: !!(mask & 1), mangoHud: !!(mask & 2), dxvkHud: !!(mask & 4), wineD3D: !!(mask & 8), loaderDebug: !!(mask & 16) });
    if (output.errors.length) { assert.equal(output.command, ''); continue; }
    assert.equal(output.command.split('%command%').length, 2);
    assert.ok(output.command.endsWith('%command%'));
    assert.doesNotMatch(output.command, /;|\$|`|\n|LD_PRELOAD|DXVK_ASYNC|RADV_PERFTEST|PROTON_NO_ESYNC/);
    for (const id of output.activeOptions) assert.ok(enabledIds.has(id));
    if (output.command.includes('PROTON_LOG=')) assert.equal(runtime, 'proton');
    if (output.command.includes('PROTON_USE_WINED3D=')) {
      assert.equal(runtime, 'proton'); assert.equal(api, 'dx9-11');
      assert.doesNotMatch(output.command, /MANGOHUD=|DXVK_HUD=|VK_LOADER_DEBUG=/);
    }
    if (output.command.includes('DXVK_HUD=')) { assert.equal(api, 'dx9-11'); assert.notEqual(runtime, 'native'); }
    if (output.command.includes('DRI_PRIME=')) assert.equal(driver, 'mesa');
    if (output.command.includes('__NV_PRIME_RENDER_OFFLOAD=')) assert.equal(driver, 'nvidia');
    assert.ok(!(output.command.includes('DRI_PRIME=') && output.command.includes('__NV_PRIME_RENDER_OFFLOAD=')));
  }
});

test('distro checks are read-only first, package-aware, and never a universal install recipe', () => {
  for (const distro of ['arch', 'nixos', 'debian', 'ubuntu', 'fedora', 'mint', 'steamos', 'other', 'unrecognized']) {
    const checks = diagnosticsFor(distro);
    assert.ok(checks.length >= 4);
    assert.equal(checks[0].kind, 'read-only');
    for (const check of checks) {
      assert.equal(typeof check.command, 'string');
      bilingual(check.interpretation); bilingual(check.requirements);
      assert.doesNotMatch(check.command, /sudo|apt(?:-get)?\s+install|pacman\s+-S|dnf\s+install|steamos-readonly\s+disable|chmod\s+777|rm\s+-rf/);
      if (check.kind !== 'read-only') bilingual(check.rollback);
    }
  }
  assert.ok(diagnosticsFor('arch').some(check => check.command.startsWith('pacman -Q')));
  for (const distro of ['debian', 'ubuntu', 'mint']) assert.ok(diagnosticsFor(distro).some(check => check.command.startsWith('dpkg-query')));
  assert.ok(diagnosticsFor('fedora').some(check => check.command.startsWith('rpm -q')));
  const deck = diagnosticsFor('steamos').find(check => check.command.startsWith('pacman'));
  assert.match(deck.requirements.en, /no filesystem unlock/);
  assert.equal(diagnosticsFor('other').some(check => /pacman|dpkg|rpm|nix-shell/.test(check.command)), false);
});

test('NixOS temporary tools, declarative support and active generation stay distinct', () => {
  const checks = diagnosticsFor('nixos');
  const shell = checks.find(check => check.command.startsWith('nix-shell'));
  assert.equal(shell.kind, 'temporary');
  assert.match(shell.interpretation.en, /neither repairs driver configuration nor supplies a 32-bit game runtime/);
  assert.match(shell.requirements.en, /pinned nixpkgs/);
  assert.match(shell.rollback.en, /No system configuration is activated/);
  const module = checks.find(check => check.kind === 'declarative');
  assert.match(module.command, /hardware\.graphics\.enable32Bit/);
  assert.match(module.requirements.en, /Only after evidence/);
  assert.match(module.rollback.en, /previous generation/);
  assert.match(checks.find(check => check.command.startsWith('nixos-option')).interpretation.en, /may not reflect the running system/);
});

test('graphics identification is weaker than binding, enumeration and rendering', () => {
  const pci = inspectGraphics('55:00.0 VGA compatible controller [0300]: AMD Navi 44 [1002:7590]\n\tKernel modules: amdgpu');
  assert.equal(pci.observations.find(item => item.stage === 'identification').title.en, 'PCI graphics adapter reported');
  assert.equal(pci.observations.find(item => item.stage === 'binding').title.en, 'Kernel binding not established');
  assert.equal(pci.observations.find(item => item.stage === 'vulkan').title.en, 'Vulkan enumeration not established');
  assert.equal(reading(pci), 'Game rendering not established');
  const bound = inspectGraphics('55:00.0 VGA compatible controller [0300]: AMD\n\tKernel driver in use: amdgpu');
  assert.equal(bound.observations.find(item => item.stage === 'binding').title.en, 'Kernel binding reported');
  assert.equal(reading(bound), 'Game rendering not established');
  const enumeration = inspectGraphics('GPU0:\n deviceName = AMD Radeon\n driverName = radv\n apiVersion = 1.4.0');
  assert.equal(enumeration.observations.find(item => item.stage === 'vulkan').title.en, 'A device was enumerated');
  assert.equal(reading(enumeration), 'Game rendering not established');
  assert.ok(enumeration.observations.some(item => item.stage === 'stack'));
  assert.match(enumeration.limitations.en, /32-bit\/container/);
});

test('graphics stack and CPU renderer evidence remains contextual', () => {
  for (const name of ['radv', 'AMDVLK', 'Intel open-source Mesa driver', 'NVIDIA']) assert.ok(inspectGraphics(`driverName = ${name}`).observations.some(item => item.stage === 'stack'));
  assert.equal(inspectGraphics('Kernel driver in use: amdgpu\nRADV is an option').observations.some(item => item.stage === 'stack'), false);
  const cpu = inspectGraphics('deviceName = llvmpipe (LLVM)\ndeviceName = AMD Radeon');
  assert.ok(cpu.observations.some(item => item.stage === 'software'));
  assert.match(cpu.observations.find(item => item.stage === 'software').body.en, /coexist with hardware/);
  assert.equal(inspectGraphics('The documentation mentions llvmpipe.').observations.some(item => item.stage === 'software'), false);
  const elf = inspectGraphics('ERROR: unable to load layer libMangoHud.so: wrong ELF class: ELFCLASS32');
  assert.match(elf.observations.find(item => item.stage === 'architecture').body.en, /optional overlay/);
});

test('graphics failures and successful presentation require event evidence, including negation negatives', () => {
  for (const line of ['vkCreateInstance failed with VK_ERROR_INITIALIZATION_FAILED', 'vkCreateDevice returned -3', 'err:vulkan: VK_ERROR_DEVICE_LOST']) assert.equal(hasGraphicsFailure(line), true, line);
  for (const line of ['vkCreateInstance has not failed', 'vkCreateDevice never failed', 'no VK_ERROR_DEVICE_LOST observed', 'without any VK_ERROR_INITIALIZATION_FAILED', 'VK_ERROR_DEVICE_LOST did not occur', 'example: vkCreateInstance failed with VK_ERROR_INITIALIZATION_FAILED', 'expected VK_ERROR_INCOMPATIBLE_DRIVER in test fixture', 'vkCreateDevice succeeded']) assert.equal(hasGraphicsFailure(line), false, line);
  for (const line of ['vkQueuePresentKHR returned VK_SUCCESS', 'vkQueuePresentKHR result = 0', 'vkQueuePresentKHR(queue, info) -> VK_SUCCESS']) assert.equal(reading(inspectGraphics(line)), 'Successful presentation reported', line);
  for (const line of ['vkQueuePresentKHR was not called; expected VK_SUCCESS', 'vkQueuePresentKHR never called VK_SUCCESS', 'example: vkQueuePresentKHR returned VK_SUCCESS', 'vkQueuePresentKHR failed with VK_ERROR_DEVICE_LOST', 'Expected vkQueuePresentKHR result = 0', 'VK_SUCCESS is a possible return value for vkQueuePresentKHR', 'DXVK initialized successfully', 'OpenGL renderer string: AMD Radeon']) assert.equal(reading(inspectGraphics(line)), 'Game rendering not established', line);
});

test('graphics inspector bounds input, avoids raw private text and rejects partial results', () => {
  for (const input of [null, {}, 'x'.repeat(1_048_577), 'x'.repeat(16_385), '\n'.repeat(12_001)]) {
    const report = inspectGraphics(input);
    assert.equal(report.observations.length, 1);
    assert.equal(report.observations[0].stage, 'error');
  }
  const text = 'deviceName = <img src=x onerror=alert(1)> /home/private-user/Steam\nKernel driver in use: amdgpu\nvkCreateInstance failed';
  const output = JSON.stringify(inspectGraphics(text));
  assert.doesNotMatch(output, /<img|onerror|private-user/);
  const start = performance.now();
  inspectGraphics('a '.repeat(8192));
  assert.ok(performance.now() - start < 2000, 'Bounded line is handled without expensive regex backtracking');
});

test('empty and invalid performance data never invents a bottleneck', () => {
  for (const input of [{}, null, [], 'high FPS']) {
    const result = diagnosePerformance(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'insufficient-evidence');
  }
  for (const input of [{ gpuUsage: 101 }, { gpuUsage: -1 }, { gpuUsage: '99' }, { cpuCoreUsage: NaN }, { ioWait: Infinity }, { vramUsed: 16, vramTotal: 8 }, { vramTotal: 0 }, { frameTimeMs: 0 }, { frameTimeMs: -2 }]) {
    const result = diagnosePerformance(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'invalid-input');
    assert.match(result[0].body.en, /No bottleneck assessment/);
  }
  assert.equal(diagnosePerformance({ gpuUsage: 0, cpuCoreUsage: 0, vramUsed: 0, vramTotal: 16 })[0].id, 'insufficient-evidence');
});

test('performance routes retain uncertainty for GPU load, CPU core load and VRAM/I/O pressure', () => {
  const gpu = diagnosePerformance({ gpuUsage: 99, cpuCoreUsage: 50, frameTimeMs: 22 });
  assert.ok(gpu.some(item => item.id === 'gpu-load'));
  assert.match(gpu.find(item => item.id === 'gpu-load').body.en, /single percentage cannot exclude/);
  const cpu = diagnosePerformance({ gpuUsage: 40, cpuCoreUsage: 97, frameTimeMs: 45 });
  assert.ok(cpu.some(item => item.id === 'cpu-path'));
  assert.match(cpu.find(item => item.id === 'cpu-path').body.en, /total CPU average can hide/);
  const pressure = diagnosePerformance({ vramUsed: 15, vramTotal: 16, ioWait: 30, frameTimeMs: 120 });
  assert.ok(pressure.some(item => item.id === 'vram-pressure'));
  assert.match(pressure.find(item => item.id === 'vram-pressure').body.en, /consequence of device loss/);
  assert.match(pressure.find(item => item.id === 'io-wait').body.en, /not proof that the game disk/);
  assert.match(pressure.find(item => item.id === 'frame-time').body.en, /cannot establish spike frequency/);
});

test('performance shader, movement and waiting routes avoid conflating the acceptance case', () => {
  const result = diagnosePerformance({ firstPassOnly: true, movementStalls: true, gpuUsage: 10, cpuCoreUsage: 25, frameTimeMs: 1400 });
  assert.ok(result.some(item => item.id === 'first-pass'));
  assert.ok(result.some(item => item.id === 'movement'));
  assert.ok(result.some(item => item.id === 'wait-path'));
  assert.match(result.find(item => item.id === 'first-pass').body.en, /or asset caching/);
  assert.match(result.find(item => item.id === 'movement').body.en, /does not collapse these into one fault/);
  assert.match(result.find(item => item.id === 'wait-path').next.en, /rather than forcing maximum clocks/);
  assert.equal(diagnosePerformance({ firstPassOnly: 'false', movementStalls: 'yes' })[0].id, 'insufficient-evidence');
  for (const item of result) for (const field of ['title', 'body', 'next']) bilingual(item[field]);
});
