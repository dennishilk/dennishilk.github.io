import test from 'node:test';
import assert from 'node:assert/strict';
import { articles } from '../content/linux-gaming-repair/articles.mjs';
import { loadProblems } from '../scripts/build-linux-fix-lab.mjs';
import { catalog } from '../assets/linux-hardware-explorer/catalog.js';

const expectedIds = [
  'proton-startup', 'vulkan-initialization', 'dxvk-no-device', 'vulkan-32-bit',
  'wrong-gpu', 'amdgpu-ring-timeout', 'nvidia-mismatch', 'vkd3d-startup',
  'shader-stutter', 'movement-freezes', 'controller-input', 'steam-deck-startup', 'proton-audio',
  'steam-runtime-pressure-vessel', 'steam-flatpak-permissions', 'steam-library-mount', 'steam-ntfs-proton-prefix', 'proton-prefix-recovery', 'lutris-game-launch', 'heroic-login-failures', 'multiplayer-anticheat-limit', 'gamescope-wayland-output', 'steam-update-download',
];
const article = id => articles.find(item => item.id === id);
const prose = (id, lang) => article(id).sections.map(item => item.body[lang]).join('\n');
const bilingual = (value, label) => {
  assert.ok(value && typeof value === 'object', label);
  for (const lang of ['en', 'de']) {
    assert.equal(typeof value[lang], 'string', `${label}.${lang}`);
    assert.ok(value[lang].trim().length >= 12, `${label}.${lang} is meaningful text`);
    assert.doesNotMatch(value[lang], /\b(?:TODO|TBD|lorem ipsum)\b/i, `${label}.${lang} is finished`);
    assert.doesNotMatch(value[lang], /<\/?(?:script|p|div|section|iframe)\b/i, `${label}.${lang} is plain prose`);
  }
};

test('knowledge base preserves original IDs and includes distinct reviewed expansion guides', () => {
  assert.deepEqual(articles.map(item => item.id), expectedIds);
  assert.equal(new Set(articles.map(item => item.id)).size, articles.length);
});

for (const item of articles) {
  test(`${item.id}: complete bilingual evidence, diagnostics and reversible test`, () => {
    bilingual(item.title, 'title');
    bilingual(item.summary, 'summary');
    assert.equal(item.reviewed, '2026-10-10');
    assert.ok(item.sections.length >= 3);
    assert.equal(new Set(item.sections.map(section => section.id)).size, item.sections.length);
    for (const section of item.sections) {
      assert.match(section.id, /^[a-z][a-z0-9-]*$/);
      bilingual(section.title, 'section title');
      bilingual(section.body, 'section body');
      for (const lang of ['en', 'de']) assert.ok(section.body[lang].length >= 300, 'section explains its evidence');
    }
    assert.ok(item.diagnostics.length >= 2);
    for (const diagnostic of item.diagnostics) {
      assert.ok(diagnostic.command.trim().length > 0);
      assert.ok(['read-only', 'temporary', 'declarative'].includes(diagnostic.kind));
      bilingual(diagnostic.interpretation, 'diagnostic interpretation');
      bilingual(diagnostic.requirements, 'diagnostic requirements');
    }
    for (const key of ['action', 'rollback', 'limitations']) bilingual(item.test[key], `test ${key}`);
    assert.ok(item.sources.length >= 2);
    for (const source of item.sources) {
      assert.ok(source.title.length > 5);
      assert.equal(source.reviewed, item.reviewed);
      bilingual(source.claim, 'source claim');
      assert.equal(new URL(source.url).protocol, 'https:');
    }
    assert.ok(Array.isArray(item.fixLab));
    assert.ok(Array.isArray(item.hardware));
  });
}

test('all Fix Lab and Hardware links resolve against existing canonical catalogs', () => {
  const problemIds = new Set(loadProblems().map(item => item.id));
  const hardwareIds = new Set(catalog.profiles.map(item => item.id));
  for (const item of articles) {
    for (const id of item.fixLab) assert.ok(problemIds.has(id), `${item.id}: missing Fix Lab ID ${id}`);
    for (const id of item.hardware) assert.ok(hardwareIds.has(id), `${item.id}: missing hardware ID ${id}`);
  }
  assert.ok(article('movement-freezes').hardware.includes('amd-navi44'));
  assert.ok(article('movement-freezes').fixLab.includes('storage-sata-crc-errors'));
  assert.ok(article('controller-input').hardware.includes('input-xbox360-wired-028e'));
});

test('references identify primary projects or their official documentation', () => {
  const officialHosts = new Set([
    'docs.flatpak.org', 'docs.kernel.org', 'docs.mesa3d.org', 'download.nvidia.com', 'wiki.nixos.org',
    'partner.steamgames.com', 'help.steampowered.com', 'pipewire.pages.freedesktop.org', 'docs.pipewire.org',
  ]);
  const projectOwners = new Set([
    'lutris', 'Heroic-Games-Launcher', 'Open-Wine-Components', 'ValveSoftware', 'GloriousEggroll', 'KhronosGroup', 'doitsujin', 'HansKristian-Work',
    'GPUOpen-Drivers', 'NVIDIA', 'sysstat', 'flightlessmango',
  ]);
  for (const item of articles) for (const source of item.sources) {
    const url = new URL(source.url);
    if (url.hostname === 'github.com') assert.ok(projectOwners.has(url.pathname.split('/')[1]), source.url);
    else assert.ok(officialHosts.has(url.hostname), source.url);
  }
});

test('release-sensitive DXVK and VKD3D guidance keeps bundled revisions distinct', () => {
  const dxvk = prose('dxvk-no-device', 'en');
  assert.match(dxvk, /DXVK 3\.x[\s\S]*Vulkan 1\.4/);
  assert.match(dxvk, /DXVK 2\.0[\s\S]*Vulkan 1\.3/);
  assert.match(dxvk, /Proton bundles its own component revisions/);
  assert.match(dxvk, /API version alone does not establish/);
  assert.match(prose('vkd3d-startup', 'en'), /descriptor-indexing/);
  assert.match(prose('vkd3d-startup', 'en'), /different revision/);
  for (const lang of ['en', 'de']) {
    assert.match(article('vkd3d-startup').test.limitations[lang], /PROTON_USE_WINED3D/);
    assert.match(article('dxvk-no-device').test.action[lang], /Direct3D 9–11/);
  }
});

test('architecture guidance includes WoW64 and ignores no warning solely by its keyword', () => {
  const en = prose('vulkan-32-bit', 'en');
  assert.match(en, /WoW64/);
  assert.match(en, /does not by itself prove/);
  assert.match(en, /gameoverlayrenderer\.so/);
  assert.match(en, /whether device creation subsequently succeeded/);
  assert.match(en, /hardware\.graphics\.enable32Bit/);
  assert.match(en, /temporarily provides vulkaninfo does not enable/);
  assert.match(article('vulkan-32-bit').test.limitations.en, /no universal vulkaninfo32/);
  const tool = article('vulkan-32-bit').diagnostics.find(item => item.command.startsWith('nix-shell'));
  assert.equal(tool.kind, 'temporary');
  assert.match(tool.requirements.en, /not a declarative graphics change/);
});

test('runtime identity and unsupported anti-cheat remain explicit', () => {
  const en = prose('proton-startup', 'en');
  assert.match(en, /wine --version output does not identify Steam/);
  assert.match(en, /Wine-GE project is archived/);
  assert.match(en, /configuration by the game developer/);
  assert.match(en, /cannot guarantee access/);
  assert.match(article('proton-startup').test.rollback.en, /does not undo prefix migrations/);
});

test('loaded NVIDIA, on-disk NVIDIA and actual Vulkan success remain different evidence', () => {
  const nvidia = article('nvidia-mismatch');
  assert.ok(nvidia.diagnostics.some(item => item.command === 'cat /proc/driver/nvidia/version'));
  const onDisk = nvidia.diagnostics.find(item => item.command === 'modinfo -F version nvidia');
  assert.match(onDisk.interpretation.en, /can differ from the loaded module/);
  assert.match(prose('nvidia-mismatch', 'en'), /GSP firmware/);
  assert.match(prose('nvidia-mismatch', 'en'), /signature rejection/);
  assert.match(nvidia.test.limitations.en, /Do not unload/);
});

test('Cthulhu guide preserves unresolved mixed failures and supplied-version provenance', () => {
  const item = article('movement-freezes');
  const en = prose(item.id, 'en');
  const de = prose(item.id, 'de');
  for (const marker of ['7.2.8', '26.1.8', '112 W', 'BadCRC', 'READ FPDMA QUEUED', 'NVMe']) {
    assert.ok(en.includes(marker), marker);
    assert.ok(de.includes(marker), marker);
  }
  assert.match(en, /supplied case details, not a verified recommendation/);
  assert.match(en, /GPU execution, PCIe transport, kernel\/firmware and graphics userspace alongside storage/);
  assert.match(en, /potentially independent/);
  assert.match(en, /correlation, not proof/);
  assert.match(en, /avoided some hard crashes while pauses remained/);
  assert.match(item.test.limitations.en, /remains unresolved/);
  assert.match(item.test.limitations.en, /do not add a GPU timeout/);
  assert.match(item.test.action.en, /Do not copy/);
});

test('overlay and selection instructions remain API- and driver-specific', () => {
  const metrics = article('shader-stutter').diagnostics.find(item => item.command.startsWith('MANGOHUD'));
  assert.match(metrics.requirements.en, /Vulkan runtime/);
  assert.match(metrics.requirements.en, /OpenGL needs its wrapper/);
  assert.match(metrics.requirements.en, /gamescope uses mangoapp/);
  assert.match(prose('wrong-gpu', 'en'), /verify the game’s final selection/);
  assert.match(prose('vulkan-initialization', 'en'), /AMDVLK[\s\S]*discontinued/);
  assert.match(prose('shader-stutter', 'en'), /Deleting caches before every test destroys/);
});

test('SteamOS guidance keeps the image workflow and native/Proton distinction', () => {
  const en = prose('steam-deck-startup', 'en');
  assert.match(en, /native Linux build and a Windows build through Proton are different/);
  assert.match(en, /read-only system image/);
  assert.match(en, /not a gaming repair recipe/);
  assert.match(en, /configuration|compatibility selection/);
  assert.ok(article('steam-deck-startup').diagnostics.every(item => !item.command.includes('pacman')));
});

test('controller and audio routes use actual transport and session evidence', () => {
  const controller = prose('controller-input', 'en');
  assert.match(controller, /does not prove that the kernel created an input device/);
  assert.match(controller, /Running Steam as root is not/);
  assert.match(controller, /two active mapping layers/);
  const audio = article('proton-audio');
  assert.match(prose(audio.id, 'en'), /pipewire-pulse/);
  assert.match(prose(audio.id, 'en'), /xrun supports a missed audio deadline/);
  assert.ok(audio.diagnostics.some(item => item.command === 'wpctl status'));
  assert.match(audio.test.rollback.en, /No system-wide sample-rate/);
  assert.match(audio.test.limitations.en, /does not prove that the GPU is healthy/);
});

test('copyable diagnostics contain no destructive repair and mark temporary runtime controls', () => {
  const dangerous = /\brm\s|\bmkfs\b|\bdd\s|chmod\s+777|\bmodprobe\s+-r|\bpacman\s+-Syu|steamos-readonly\s+disable|\b(?:curl|wget)\b[^\n]*\|\s*(?:sh|bash)/;
  for (const item of articles) for (const diagnostic of item.diagnostics) {
    assert.doesNotMatch(diagnostic.command, dangerous, `${item.id}: unsafe copyable default`);
    if (/%command%|^nix-shell\b|^VK_LOADER_DEBUG=/.test(diagnostic.command)) {
      assert.equal(diagnostic.kind, 'temporary', `${item.id}: command changes runtime context`);
    }
  }
});
