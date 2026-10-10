import assert from 'node:assert/strict';
import test from 'node:test';
import { LIMITS, PATTERNS, parseLog, redactSensitive, buildSummary } from '../assets/linux-gaming-repair/core.js';
import { acceptanceFixture, isolatedGpuFixture, isolatedStorageFixture, mixedFailureFixture } from '../assets/linux-gaming-repair/fixtures.js';

// Independent synthetic event examples exercise semantics, not hardware compatibility.
// Every shipped signature has positive and negative cases; counts are checked below.
const cases = {
  'vulkan-initialization': {
    positive: ['err: DxvkInstance::createInstance: Failed to create Vulkan instance', '0024:err:vulkan:__wine_create_vk_instance Failed to create instance', 'err: vkCreateInstance returned VK_ERROR_INITIALIZATION_FAILED'],
    negative: ['info: Vulkan instance created successfully', 'warning: Optional Vulkan validation layer is not installed'],
  },
  'vulkan-no-drivers': {
    positive: ['ERROR: Vulkan loader: vkCreateInstance: Found no drivers!', 'DXVK: Failed to load vulkan-1 library.'],
    negative: ['Vulkan loader: found driver libvulkan_radeon.so', 'Vulkan loader diagnostic option: list drivers'],
  },
  'vulkan-missing-extension': {
    positive: ['err: vkCreateDevice returned VK_ERROR_FEATURE_NOT_PRESENT', 'Vulkan error: VK_ERROR_EXTENSION_NOT_PRESENT'],
    negative: ['warn: DXVK: optional extension VK_EXT_debug_utils not supported', 'info: Vulkan: VK_KHR_surface supported'],
  },
  'vulkan-wrong-architecture': {
    positive: ['ERROR: Vulkan ICD /usr/lib/libvulkan_radeon.so: wrong ELF class: ELFCLASS32', 'libGL.so.1: wrong ELF class: ELFCLASS64'],
    negative: ['libvulkan_radeon.so is ELFCLASS64', 'wine: wrong ELF class: ELFCLASS64'],
  },
  'dxvk-no-adapters': {
    positive: ['warn: DXVK: No adapters found.', 'err: DxvkInstance::enumAdapters: Failed to enumerate adapters'],
    negative: ['info: DXVK: v2.7.1', 'warn: DXVK: Skipping Vulkan adapter without optional support'],
  },
  'dxvk-device-create': {
    positive: ['err: DxvkAdapter: Failed to create device', 'err: DxvkDevice::createDevice: Failed to create Vulkan device'],
    negative: ['info: DxvkAdapter: Created device', 'VKD3D-Proton: Failed to create Vulkan device'],
  },
  'vkd3d-device-create': {
    positive: ['err:vkd3d-proton:vkd3d_create_vk_device Failed to create Vulkan device, vr -3.', 'err: vkd3d: D3D12CreateDevice failed'],
    negative: ['fixme:vkd3d-proton:hresult_from_vk_result Unhandled VkResult -3.', 'info:vkd3d-proton:vkd3d_create_vk_device Created Vulkan device'],
  },
  'vulkan-device-lost': {
    positive: ['err: DxvkDevice: vkQueueSubmit returned VK_ERROR_DEVICE_LOST', 'RADV error: VK_ERROR_DEVICE_LOST'],
    negative: ['info: Supported errors: VK_ERROR_DEVICE_LOST', 'VK_ERROR_DEVICE_LOST is an enum name'],
  },
  'vulkan-device-memory': {
    positive: ['err: vkAllocateMemory returned VK_ERROR_OUT_OF_DEVICE_MEMORY'],
    negative: ['info: possible errors: VK_ERROR_OUT_OF_DEVICE_MEMORY', 'info: GPU memory allocation succeeded'],
  },
  'vulkan-host-memory': {
    positive: ['Vulkan error: vkCreateInstance returned VK_ERROR_OUT_OF_HOST_MEMORY'],
    negative: ['VK_ERROR_OUT_OF_HOST_MEMORY definition', 'info: Vulkan host memory: 64 MiB'],
  },
  'kernel-oom-kill': {
    positive: ['kernel: Out of memory: Killed process 123 (game) total-vm:123456kB', 'kernel: oom-kill:constraint=CONSTRAINT_MEMCG'],
    negative: ['kernel: oom_reaper initialized', 'Out of memory handling is enabled'],
  },
  'amdgpu-ring-timeout': {
    positive: ['kernel: amdgpu 0000:55:00.0: amdgpu: ring gfx_0.0.0 timeout, signaled seq=12, emitted seq=13', '[drm:amdgpu_job_timedout [amdgpu]] *ERROR* ring sdma0 timeout'],
    negative: ['amdgpu: ring gfx_0.0.0 timeout=10000', 'amdgpu: lockup_timeout=10000'],
  },
  'amdgpu-reset': {
    positive: ['amdgpu 0000:55:00.0: amdgpu: GPU reset begin!', 'amdgpu: Starting gfx_0.0.0 ring reset'],
    negative: ['amdgpu: GPU reset succeeded!', 'amdgpu.gpu_recovery=1'],
  },
  'amdgpu-reset-failed': {
    positive: ['amdgpu: GPU reset failed', 'amdgpu: Ring gfx_0.0.0 reset failed'],
    negative: ['amdgpu: GPU recovery completed', 'amdgpu: reset method list: mode1 mode2'],
  },
  'gpu-lost-bus': {
    positive: ['amdgpu: device lost from bus', 'NVRM: GPU has fallen off the bus.'],
    negative: ['55:00.0 VGA compatible controller [0300]: AMD Navi 44 [1002:7590]', 'amdgpu: device initialized on PCI bus'],
  },
  'pcie-aer-uncorrected': {
    positive: ['pcieport 0000:00:03.1: PCIe Bus Error: severity=Uncorrected (Fatal), type=Data Link Layer', 'pcieport: AER: Uncorrected (Non-Fatal) error received'],
    negative: ['pcieport: PCIe Bus Error: severity=Corrected, type=Data Link Layer', 'PCIe AER uncorrectable error mask configured'],
  },
  'pcie-aer-corrected': {
    positive: ['pcieport: PCIe Bus Error: severity=Corrected, type=Data Link Layer', 'pcieport: AER: Corrected error received: 0000:55:00.0'],
    negative: ['AER: Correctable error reporting enabled', 'PCIe link: 8 GT/s x8 (downgraded)'],
  },
  'sata-interface': {
    positive: ['ata2: SError: { UnrecovData 10B8B BadCRC Handshk }', 'ata2.00: irq_stat 0x08000000, interface fatal error'],
    negative: ['ata2.00: model: Samsung 860 EVO', 'ata2.00: cmd READ FPDMA QUEUED'],
  },
  'sata-link-reset': {
    positive: ['ata2: hard resetting link', 'ata2: softreset failed (device not ready)'],
    negative: ['ata2: SATA link up 6.0 Gbps', 'SATA link reset diagnostics'],
  },
  'ata-command-failed': {
    positive: ['ata2.00: failed command: READ FPDMA QUEUED', 'ata2.00: failed command: WRITE DMA EXT'],
    negative: ['ata2.00: READ FPDMA QUEUED', 'ata2.00: NCQ read completed'],
  },
  'storage-io-error': {
    positive: ['kernel: I/O error, dev sdb, sector 120 op 0x0:(READ)', 'Buffer I/O error on dev sdb1, logical block 42', 'nvme0: I/O 12 QID 3 timeout, aborting'],
    negative: ['nvme0: I/O queues initialized', 'disk I/O throughput: 200 MB/s'],
  },
  'amdgpu-firmware-load': {
    positive: ['Direct firmware load for amdgpu/gc_12_0_0_pfp.bin failed with error -2', 'amdgpu: failed to load firmware "amdgpu/example.bin"'],
    negative: ['amdgpu: firmware loaded successfully', 'Direct firmware load for unrelated/example.bin failed with error -2'],
  },
  'nvidia-mismatch': {
    positive: ['NVRM: API mismatch: the client has the version 555.58, but this kernel module has the version 550.54.', 'Failed to initialize NVML: Driver/library version mismatch'],
    negative: ['NVRM: loading NVIDIA UNIX x86_64 Kernel Module 555.58', 'nvidia-smi version: 555.58'],
  },
  'nvidia-xid': {
    positive: ['NVRM: Xid (PCI:0000:01:00): 79, GPU has fallen off the bus.', 'kernel: NVRM: Xid (PCI:0000:01:00): 13, Graphics Exception'],
    negative: ['NVIDIA Xid documentation', 'NVRM: Xid tracing enabled'],
  },
  'wine-missing-dll': {
    positive: ['0024:err:module:import_dll Library VCRUNTIME140.dll (which is needed by L"Z:\\home\\Alice\\game.exe") not found', '0024:err:module:LdrInitializeThunk Importing dlls for game.exe failed, status c0000135'],
    negative: ['fixme:module:import_dll stub', 'trace:module:import_dll loaded kernel32.dll'],
  },
  'wine-bad-executable': {
    positive: ['wine: Bad EXE format for C:\\Games\\game.exe', '0024:err:module:import_dll Loading library example.dll failed (error c000007b).'],
    negative: ['wine: PE executable architecture: x86_64', 'wine: EXE file loaded successfully'],
  },
  'wine-prefix-permission': {
    positive: ['wine: /home/Alice/.wine is not owned by you', 'wine: cannot access prefix: Permission denied'],
    negative: ['wine: prefix initialized', 'wine: file access rights were inspected'],
  },
  'wine-prefix-architecture': {
    positive: ['wine: WINEARCH set to win32 but /home/Alice/.wine is a 64-bit installation.', 'wine: prefix architecture mismatch'],
    negative: ['WINEARCH=win64', 'wine: prefix architecture: win64'],
  },
  'wine-unhandled-exception': {
    positive: ['wine: Unhandled page fault on read access to 00000000 at address 00000000.', 'wine: Unhandled exception 0xc0000005 in thread 024'],
    negative: ['trace:seh: exception handled', 'wine: installed exception handler'],
  },
  'wine-display-unavailable': {
    positive: ['0024:err:winediag:nodrv_CreateWindow Application tried to create a window, but no driver could be loaded.', 'wine: cannot open display :0'],
    negative: ['wine: display connected', 'Wayland session: display :0'],
  },
  'gamescope-startup': {
    positive: ['gamescope: Failed to initialize Vulkan', 'gamescope: failed to create backend'],
    negative: ['gamescope: enabling Vulkan backend', 'gamescope: warning: optional extension unavailable'],
  },
  'proton-launch-failed': {
    positive: ['Proton: No compat data path?', 'Proton: failed to execute command'],
    negative: ['Proton: 9.0-4', 'Proton: upgrading prefix'],
  },
  'steam-runtime-failed': {
    positive: ['pressure-vessel-wrap[120]: E: Failed to create new namespace', 'Steam Linux Runtime: failed to initialize'],
    negative: ['pressure-vessel: W: using fallback library path', 'Steam Linux Runtime: initialized'],
  },
  'controller-permission': {
    positive: ['SDL: cannot open /dev/input/event12: Permission denied', 'winebus: /dev/hidraw2: Operation not permitted'],
    negative: ['SDL: opened /dev/input/event12', 'USB controller: HID detected'],
  },
  'audio-backend-failed': {
    positive: ['err: winepulse: failed to connect to PulseAudio: Connection refused', 'PipeWire: failed to connect to server', 'ALSA: snd_pcm_open failed'],
    negative: ['PipeWire: connected to audio server', 'fixme:xaudio2: unsupported optional property'],
  },
  'filesystem-no-space': {
    positive: ['wine: prefix write failed: No space left on device', 'Proton: error: ENOSPC while writing cache', 'shader cache: Disk quota exceeded'],
    negative: ['disk space available: 100 GB', 'ENOSPC handling is enabled'],
  },
  'software-renderer': {
    positive: ['deviceName = llvmpipe (LLVM 20.1.1, 256 bits)', 'OpenGL renderer string: lavapipe', 'Selected device: SwiftShader'],
    negative: ['The system has lavapipe installed', 'DXVK: skipped llvmpipe adapter'],
  },
  'shader-activity': {
    positive: ['DXVK: Compiling shaders', 'info: vkd3d-proton: Compiled 120 pipelines', 'Fossilize: Compiling pipelines'],
    negative: ['info: DXVK: shader cache loaded', 'shader compilation may cause first-pass stutter'],
  },
  'anti-cheat-startup': {
    positive: ['EasyAntiCheat: Failed to initialize', 'BattlEye: initialization failed'],
    negative: ['EasyAntiCheat runtime initialized', 'BattlEye support needs publisher enablement'],
  },
  'native-process-crash': {
    positive: ['game[234]: segfault at 0 ip 0000 sp 0000 error 4 in game[0000]', 'systemd-coredump: Process 234 (game) of user 1000 dumped core.'],
    negative: ['systemd-coredump: core dump storage enabled', 'game process started'],
  },
  'steam-disk-write': {
    positive: ["Steam: Disk write error while updating game"],
    negative: ["Steam: disk write operations succeeded","Steam: disk space sufficient"],
  },
  'steam-corrupt-update': {
    positive: ["Steam: Corrupt update files while patching"],
    negative: ["Steam: Update files verified successfully","Steam: cache contains update files"],
  },
  'steam-library-noexec': {
    positive: ["steamapps/common/game: execve: Permission denied"],
    negative: ["steamapps/common/game: execution finished successfully","Permission denied opening a browser profile"],
  },
  'steam-library-readonly': {
    positive: ["steamapps/common: write failed: Read-only file system","compatdata/42: write error: EROFS"],
    negative: ["steamapps library mounted read-write","compatdata/42 is a read-only test fixture"],
  },
  'flatpak-steam-access': {
    positive: ["flatpak: Steam: permission denied accessing library"],
    negative: ["flatpak Steam filesystem access enabled","flatpak Steam permissions documented"],
  },
  'pressure-vessel-namespace': {
    positive: ["pressure-vessel-wrap[123]: E: Failed to create new namespace"],
    negative: ["pressure-vessel: namespace created successfully","pressure-vessel: namespace support enabled"],
  },
  'pressure-vessel-runtime-missing': {
    positive: ["Steam Linux Runtime: error: required runtime not found"],
    negative: ["Steam Linux Runtime: runtime located","Steam Linux Runtime: runtime is not missing"],
  },
  'legendary-authentication': {
    positive: ["Legendary: ERROR: Authentication failed"],
    negative: ["Legendary: Authentication successful","Legendary login token refresh is enabled"],
  },
  'heroic-legendary-start': {
    positive: ["Heroic: failed to start Legendary process"],
    negative: ["Heroic: started Legendary process","Heroic: Legendary runner selected"],
  },
  'wine-loader-status-c0000135': {
    positive: ["wine: loader error c0000135: STATUS_DLL_NOT_FOUND"],
    negative: ["wine: status c0000135 is a documented possible code","Proton: DLL load completed"],
  },
  'wine-loader-status-c000007b': {
    positive: ["wine: loader error c000007b: STATUS_INVALID_IMAGE_FORMAT"],
    negative: ["Wine: c000007b documentation only","Wine: game executable loaded"],
  },
  'dxvk-shader-cache-write': {
    positive: ["DXVK: Failed to write shader cache"],
    negative: ["DXVK: Loaded shader cache successfully","DXVK: Shader cache disabled by configuration"],
  },
};

test('every public signature has an independently authored positive/negative pair and bilingual metadata', () => {
  assert.equal(PATTERNS.length, 52);
  assert.equal(new Set(PATTERNS.map(pattern => pattern.id)).size, PATTERNS.length);
  assert.equal(new Set(PATTERNS.map(pattern => pattern.category)).size, PATTERNS.length);
  assert.deepEqual(Object.keys(cases).sort(), PATTERNS.map(pattern => pattern.id).sort());
  for (const pattern of PATTERNS) {
    assert.ok(cases[pattern.id].positive.length && cases[pattern.id].negative.length);
    assert.ok(['info', 'warning', 'error'].includes(pattern.severity));
    for (const field of ['title', 'explanation', 'next']) for (const lang of ['en', 'de']) assert.ok(pattern[field][lang].length > 10);
    assert.ok(pattern.articleIds.length);
    assert.equal('match' in pattern, false);
  }
});

for (const [id, examples] of Object.entries(cases)) {
  test(`positive event signature: ${id}`, () => {
    for (const example of examples.positive) {
      const report = parseLog(example);
      assert.equal(report.error, null);
      const finding = report.findings.find(finding => finding.id === id);
      assert.ok(finding, `missing ${id} for ${example}`);
      assert.equal(finding.count, 1);
      assert.equal(finding.evidence[0].line, 1);
    }
  });
  test(`negative event signature: ${id}`, () => {
    for (const example of examples.negative) assert.ok(!parseLog(example).findings.some(finding => finding.id === id), `false positive ${id} for ${example}`);
  });
}

test('benign initialization, IDs, version reports, warnings, ordinary NCQ and fixme messages produce no findings', () => {
  const report = parseLog([
    '55:00.0 VGA compatible controller [0300]: AMD Navi 44 [1002:7590] (rev c0)',
    'Kernel driver in use: amdgpu', 'Kernel: 7.2.8', 'Mesa: 26.1.8', 'Vulkan API: 1.4.x',
    'info: DXVK: v2.7.1', 'Proton: 9.0-4', 'VKD3D-Proton: 2.14',
    'warn: OpenVR: Failed to locate module', 'fixme:ntdll:NtQuerySystemInformation stub',
    'warn: DXVK: Optional extension unsupported', 'ata2.00: READ FPDMA QUEUED',
    'amdgpu: ring gfx_0.0.0 timeout=10000', 'PCIe link: 8 GT/s x8 (downgraded)',
  ].join('\n'));
  assert.deepEqual(report.findings, []);
  assert.equal(report.versions.kernel, '7.2.8'); assert.equal(report.versions.mesa, '26.1.8');
  assert.equal(report.versions.proton, '9.0-4'); assert.equal(report.versions.dxvk, '2.7.1');
  assert.equal(report.versions.vkd3d, '2.14'); assert.equal(report.versions.vulkan, '1.4.x');
});

test('fixme and error-enum documentation do not create observed failures', () => {
  const report = parseLog([
    'fixme:vkd3d-proton:hresult_from_vk_result Unhandled VkResult -3',
    'fixme:vulkan:vkCreateDevice Failed to create Vulkan device',
    'example error: vkQueueSubmit returned VK_ERROR_DEVICE_LOST',
    'Vulkan can return VK_ERROR_OUT_OF_DEVICE_MEMORY on failed allocation',
  ].join('\n'));
  assert.deepEqual(report.findings, []);
});

test('negated and expected-output event descriptions do not become observed failures or rendering', () => {
  for (const line of [
    'VK_ERROR_DEVICE_LOST is not an error we have observed',
    'No amdgpu: GPU reset failed',
    'amdgpu: ring gfx timeout was not observed',
    'expected output: amdgpu: GPU reset failed',
    'No GPU errors were observed: VK_ERROR_DEVICE_LOST',
    'vkQueuePresentKHR has not returned VK_SUCCESS',
    'vkQueuePresentKHR was never called; result: VK_SUCCESS expected',
    'trace: vkQueuePresentKHR returned VK_SUCCESS expected',
  ]) {
    const report = parseLog(line); assert.deepEqual(report.findings, [], line);
    assert.equal(report.layers.rendering, 'unreported', line);
  }
  assert.ok(parseLog('warn: DXVK: No adapters found.').findings.some(finding => finding.id === 'dxvk-no-adapters'));
  assert.ok(parseLog('ERROR: Vulkan loader: Found no drivers!').findings.some(finding => finding.id === 'vulkan-no-drivers'));
});

test('the Cthulhu no-final-error acceptance fixture does not invent a GPU crash', () => {
  const report = parseLog(acceptanceFixture.log);
  assert.equal(report.error, null);
  assert.deepEqual(report.findings.map(finding => finding.id).sort(), ['ata-command-failed', 'sata-interface', 'sata-link-reset']);
  assert.deepEqual(report.layers, { gpuIdentification: 'observed', driverBinding: 'observed', vulkanEnumeration: 'unreported', rendering: 'unreported' });
  assert.ok(report.notices.some(notice => /hard-lock/i.test(notice.en)));
  assert.match(acceptanceFixture.label.en, /synthetic/i); assert.match(acceptanceFixture.label.de, /synthetisch/i);
  assert.match(acceptanceFixture.limitations.en, /unresolved/);
  assert.ok(acceptanceFixture.observations.some(observation => /NVMe/.test(observation.en)));
  assert.ok(acceptanceFixture.observations.some(observation => /112 W/.test(observation.en)));
  assert.ok(acceptanceFixture.observations.some(observation => /separate|independently|distinct/.test(observation.en)));
});

test('GPU-only and SATA-only fixtures remain independent', () => {
  const gpu = parseLog(isolatedGpuFixture.log);
  assert.deepEqual(gpu.findings.map(finding => finding.id), ['gpu-lost-bus']);
  const storage = parseLog(isolatedStorageFixture.log);
  assert.deepEqual(storage.findings.map(finding => finding.id).sort(), ['ata-command-failed', 'sata-interface', 'sata-link-reset']);
  for (const report of [gpu, storage]) assert.ok(!report.notices.some(notice => /both observed/.test(notice.en)));
});

test('mixed GPU and SATA evidence yields separate observations and no causal ordering', () => {
  const report = parseLog(mixedFailureFixture.log);
  assert.deepEqual(report.findings.map(finding => finding.id).sort(), ['amdgpu-reset', 'amdgpu-ring-timeout', 'sata-interface', 'sata-link-reset']);
  const notice = report.notices.find(notice => /both observed/.test(notice.en));
  assert.ok(notice); assert.match(notice.en, /independently/); assert.match(notice.en, /does not establish causal ordering/);
});

test('all fixtures are explicitly synthetic and contain no personal usernames, hosts or paths', () => {
  for (const fixture of [acceptanceFixture, isolatedGpuFixture, isolatedStorageFixture, mixedFailureFixture]) {
    assert.match(fixture.label.en, /synthetic/i); assert.match(fixture.log, /synthetic/i);
    assert.doesNotMatch(fixture.log, /dennis|nebu|cthulhu|\/home\/|@/i);
  }
});

test('GPU identification does not imply driver binding, Vulkan enumeration or rendering', () => {
  const report = parseLog('55:00.0 VGA compatible controller [0300]: AMD Navi 44 [1002:7590]\n    Kernel modules: amdgpu');
  assert.equal(report.layers.gpuIdentification, 'observed');
  for (const layer of ['driverBinding', 'vulkanEnumeration', 'rendering']) assert.equal(report.layers[layer], 'unreported');
});

test('an unrelated PCI driver field does not become GPU binding', () => {
  const report = parseLog('55:00.0 VGA compatible controller [0300]: AMD [1002:7590]\n    Kernel modules: amdgpu\n56:00.0 Ethernet controller [0200]: NIC\n    Kernel driver in use: nvidia');
  assert.equal(report.layers.driverBinding, 'unreported');
  assert.equal(parseLog('55:00.0 VGA compatible controller [0300]: AMD\n' + 'unrelated line\n'.repeat(20) + 'Kernel driver in use: nvidia').layers.driverBinding, 'unreported');
});

test('Vulkan enumeration does not imply game rendering or kernel binding', () => {
  const report = parseLog('Devices:\nGPU0:\n    apiVersion = 1.3.280\n    deviceName = AMD Radeon\n    driverName = radv');
  assert.equal(report.layers.gpuIdentification, 'observed'); assert.equal(report.layers.vulkanEnumeration, 'observed');
  assert.equal(report.layers.driverBinding, 'unreported'); assert.equal(report.layers.rendering, 'unreported');
});

test('a non-graphics deviceName field and a stale Vulkan block are insufficient enumeration evidence', () => {
  assert.equal(parseLog('deviceName = USB Controller').layers.vulkanEnumeration, 'unreported');
  assert.equal(parseLog('GPU0:\n' + 'unrelated line\n'.repeat(32) + 'deviceName = USB Controller').layers.vulkanEnumeration, 'unreported');
});

test('only explicit successful frame presentation marks the rendering layer', () => {
  for (const line of ['trace:vulkan:vkQueuePresentKHR returned VK_SUCCESS', 'trace:vulkan:vkQueuePresentKHR result=VK_SUCCESS']) assert.equal(parseLog(line).layers.rendering, 'observed');
  for (const line of ['Vulkan instance created successfully', 'DXVK: selected device: AMD Radeon', 'err: vkQueuePresentKHR returned VK_ERROR_DEVICE_LOST', 'info: vkQueuePresentKHR called']) assert.equal(parseLog(line).layers.rendering, 'unreported');
});

test('a software device is an informational enumeration observation, not a selected-device certainty', () => {
  const report = parseLog('GPU0:\ndeviceName = llvmpipe (LLVM 20.1.1, 256 bits)');
  const finding = report.findings[0]; assert.equal(finding.id, 'software-renderer'); assert.equal(finding.severity, 'info');
  assert.match(finding.explanation.en, /not proof that the game selected/); assert.equal(report.layers.rendering, 'unreported');
});

test('shader compilation is informational and does not assert a stutter cause', () => {
  const finding = parseLog('DXVK: Compiling shaders').findings[0];
  assert.equal(finding.id, 'shader-activity'); assert.equal(finding.severity, 'info');
  assert.match(finding.explanation.en, /not an error or proof/);
});

test('versions are bounded reported strings and multiple sessions generate a notice', () => {
  const report = parseLog('Kernel: 6.12.1-private-user\nKernel: 6.13.0\nMesa: 25.1.0\nProton: Experimental\nGE-Proton9-27');
  assert.equal(report.versions.kernel, '6.12.1'); assert.equal(report.versions.proton, 'Experimental');
  assert.ok(report.notices.some(notice => /Multiple versions/.test(notice.en)));
  assert.doesNotMatch(buildSummary(report), /private-user/);
  const hostile = parseLog('Mesa: private-user\nDXVK: token=SECRET\nKernel: <img src=secret>');
  assert.ok(Object.values(hostile.versions).every(value => value === null));
});

test('repeat observations coalesce and evidence is capped without truncating input analysis', () => {
  const report = parseLog('amdgpu: GPU reset begin!\n'.repeat(25));
  assert.equal(report.findings.length, 1); assert.equal(report.findings[0].count, 25);
  assert.equal(report.findings[0].evidence.length, LIMITS.evidencePerFinding);
  assert.deepEqual(report.findings[0].evidence.map(item => item.line), [1, 2, 3]);
});

test('evidence is redacted before display-length clipping', () => {
  const report = parseLog('err: vkQueueSubmit returned VK_ERROR_DEVICE_LOST ' + 'x '.repeat(245) + 'token=SECRET-AT-CLIP-BOUNDARY');
  assert.equal(report.findings[0].evidence[0].text.length, LIMITS.evidenceLength + 1);
  assert.doesNotMatch(JSON.stringify(report), /SECRET-AT-CLIP-BOUNDARY/);
});

const privacyCases = [
  ['authorization header', 'Authorization: Bearer SECRET_BEARER_123', 'SECRET_BEARER_123'],
  ['basic credentials', 'Authorization: Basic U0VDUkVUX0JBU0lD', 'U0VDUkVUX0JBU0lD'],
  ['cookie header', 'Cookie: session=SECRET_COOKIE; SteamLoginSecure=SECRET_LOGIN', 'SECRET_COOKIE|SECRET_LOGIN'],
  ['quoted JSON token', '{"access_token":"SECRET_JSON_TOKEN", "refresh_token":"SECRET_REFRESH"}', 'SECRET_JSON_TOKEN|SECRET_REFRESH'],
  ['multiple token prefixes', 'oauth_access_token=SECRET_MULTI_PART', 'SECRET_MULTI_PART'],
  ['quoted spaced password', 'password="SECRET WITH SPACES"', 'SECRET WITH SPACES'],
  ['single quoted secret', "client_secret='SECRET WITH MORE SPACES'", 'SECRET WITH MORE SPACES'],
  ['steam username label', 'Steam username: PrivateSteamPerson', 'PrivateSteamPerson'],
  ['spaced unquoted Steam identity', 'amdgpu: GPU reset failed steam username: Alice Smith', 'Alice|Smith'],
  ['steam user label', 'Steam user: PrivateSteamPerson', 'PrivateSteamPerson'],
  ['account label', 'Account name: "Private Account Person"', 'Private Account Person'],
  ['login sentence', 'Logged in as PrivateSteamPerson', 'PrivateSteamPerson'],
  ['steam credentials option', '-login PrivateSteamPerson PrivatePassword', 'PrivateSteamPerson|PrivatePassword'],
  ['home directory', 'log path=/home/PrivatePerson/games/test.log', 'PrivatePerson'],
  ['quoted spaced home directory', 'wine: "/home/Private Person/My Games/test.log" failed', 'Private Person|My Games'],
  ['unquoted spaced home directory', 'wine: /home/Private Person/My Games/test.log failed', 'Private Person|My Games'],
  ['Windows path', 'wine: "C:\\users\\Private Person\\My Games\\test.exe" failed', 'Private Person|My Games'],
  ['unquoted spaced Windows path', 'wine: C:\\users\\Private Person\\My Games\\test.exe failed', 'Private Person|My Games'],
  ['UNC path', 'wine: \\\\PrivateServer\\PrivateShare\\game.exe failed', 'PrivateServer|PrivateShare'],
  ['relative private path', 'prefix=PrivatePerson/PrivateGame/cache.log', 'PrivatePerson|PrivateGame'],
  ['encoded private path', 'file=%2Fhome%2FPrivatePerson%2FMy%20Games%2Fcache.log', 'PrivatePerson|My'],
  ['review encoded private path', 'path=%2Fhome%2FAlice%2Fprivate.txt', 'Alice|private'],
  ['encoded credentials', 'access_token%3DSECRET_ENCODED_TOKEN', 'SECRET_ENCODED_TOKEN'],
  ['URL account credentials', 'https://PrivateUser:PrivatePassword@PrivateHost.local/game?token=SECRET_QUERY', 'PrivateUser|PrivatePassword|PrivateHost|SECRET_QUERY'],
  ['private URL host', 'https://PrivateHost.example.net/game?player=PrivatePerson', 'PrivateHost|PrivatePerson'],
  ['email address', 'PrivatePerson@PrivateMail.example.org', 'PrivatePerson|PrivateMail'],
  ['unicode email address', 'PrívatePérson@privat.example.org', 'PrívatePérson|privat'],
  ['user host prompt', 'PrivateUser@PrivateHost:~/games$ echo test', 'PrivateUser|PrivateHost'],
  ['journal hostname', 'Oct 10 17:56:39 PrivateHost kernel: amdgpu: GPU reset begin!', 'PrivateHost'],
  ['ISO journal hostname', '2026-10-10T17:56:39+02:00 PrivateHost kernel: amdgpu: GPU reset begin!', 'PrivateHost'],
  ['hostname label', 'HOSTNAME=PrivateHost', 'PrivateHost'],
  ['private hostname', 'connected to PrivateHost.home.arpa', 'PrivateHost'],
  ['IPv4 address', 'peer 192.168.88.99', '192\\.168\\.88\\.99'],
  ['IPv6 address', 'peer [fd23:1234::5678]', 'fd23:1234::5678'],
  ['MAC address', 'mac=aa:bb:cc:dd:ee:ff', 'aa:bb:cc:dd:ee:ff'],
  ['UUID', 'uuid 12345678-abcd-1234-5678-123456789abc', '12345678-abcd'],
  ['Steam numeric identity', 'SteamID 76561198000000000', '76561198000000000'],
  ['GitHub token', 'ghp_SECRETGITHUBTOKENSAMPLE1234', 'SECRETGITHUB'],
  ['OpenAI token', 'sk-proj-SECRETOPENAITOKEN1234', 'SECRETOPENAI'],
  ['JWT token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJTQUNSRVQifQ.SECRETSIGNATURE', 'eyJhbGci|SECRETSIGNATURE'],
  ['escaped quoted JSON secret', '{"access_token":"SECRET_ESCAPED\\" MORE_SECRET"}', 'SECRET_ESCAPED|MORE_SECRET'],
  ['escaped quoted Steam identity', 'Steam username: "Alice\\" Smith"', 'Alice|Smith'],
  ['escaped quoted account identity', 'Account name: "Alice\\" Smith"', 'Alice|Smith'],
];
for (const [label, value, secret] of privacyCases) test(`privacy redaction: ${label}`, () => {
  const redacted = redactSensitive(value); assert.doesNotMatch(redacted, new RegExp(secret, 'i'), redacted);
  const report = parseLog(`err: vkQueueSubmit returned VK_ERROR_DEVICE_LOST ${value}`);
  assert.equal(report.findings[0].id, 'vulkan-device-lost');
  // Journal host-prefix forms are checked as prefixes rather than as mid-line fields.
  if (!/journal hostname/.test(label)) assert.doesNotMatch(JSON.stringify(report), new RegExp(secret, 'i'));
  assert.doesNotMatch(buildSummary(report, { notes: value, username: value }), new RegExp(secret, 'i'));
});

test('privacy removes controls and zero-width credential obfuscation', () => {
  const value = '\u001b[31maccess_to\u200bken=SECRET_CONTROL_TOKEN\u001b[0m\u202e';
  const result = redactSensitive(value);
  assert.doesNotMatch(result, /SECRET_CONTROL_TOKEN|\u001b|\u200b|\u202e/);
  assert.ok(parseLog('\u001b[31mamdgpu: GPU reset begin!\u001b[0m').findings.some(finding => finding.id === 'amdgpu-reset'));
});

test('summary uses trusted metadata and context allowlists, never evidence or user fields', () => {
  const report = parseLog('amdgpu: GPU reset begin!');
  report.findings[0].title = { en: 'SECRET_TITLE', de: 'SECRET_TITLE' };
  report.findings[0].explanation = { en: 'SECRET_EXPLANATION', de: 'SECRET_EXPLANATION' };
  report.findings[0].next = { en: 'SECRET_NEXT', de: 'SECRET_NEXT' };
  report.findings[0].evidence = [{ line: 1, text: 'SECRET_RAW_LINE' }];
  report.findings.push({ id: 'SECRET_ID', count: 9, title: { en: 'SECRET_UNKNOWN_TITLE' } });
  report.notices = [{ en: 'SECRET_NOTICE' }];
  report.layers.rendering = 'SECRET_LAYER'; report.versions.kernel = '7.2.8-SECRET_VERSION';
  const summary = buildSummary(report, { distro: 'nixos', runtime: 'proton', api: 'dx12', assistantId: 'gpu-crash', username: 'SECRET_USERNAME', notes: 'SECRET_NOTES' });
  assert.match(summary, /NixOS|Proton|Direct3D 12|GPU crash/); assert.doesNotMatch(summary, /SECRET/);
  assert.match(summary, /AMDGPU began GPU recovery/); assert.doesNotMatch(summary, /7\.2\.8-SECRET/);
  assert.doesNotMatch(buildSummary(report, { distro: '__proto__', assistantId: 'SECRET_WORKFLOW' }), /__proto__|SECRET_WORKFLOW/);
});

test('German summary is complete and unknown language safely falls back to English', () => {
  const report = parseLog('ata2: hard resetting link');
  const german = buildSummary(report, { distro: 'debian' }, 'de');
  assert.match(german, /lokale Befundzusammenfassung|SATA-Wiederherstellung/);
  assert.match(german, /keine bestätigten Ursachen/);
  assert.match(buildSummary(report, {}, 'invalid'), /local evidence summary/);
});

test('summary rejects injected error details and malicious reported versions', () => {
  assert.doesNotMatch(buildSummary({ error: { message: { en: 'SECRET' } } }), /SECRET/);
  assert.doesNotMatch(buildSummary(null, { notes: 'SECRET' }), /SECRET/);
  const report = parseLog('Proton: Experimental\nMesa: 25.1.1');
  report.versions = { kernel: 'secret/path', mesa: '<script>', proton: 'Experimental;TOKEN=SECRET', dxvk: 'PRIVATE_USER', vulkan: 'http://private.example' };
  assert.doesNotMatch(buildSummary(report), /script|TOKEN|PRIVATE_USER|private\.example|secret\/path/);
});

test('HTML and command strings remain inert text and are omitted from summary', () => {
  const input = 'err: vkQueueSubmit returned VK_ERROR_DEVICE_LOST <img src=x onerror="globalThis.PWNED=true"> $(touch /tmp/pwned); curl https://private.example';
  globalThis.PWNED = false;
  const report = parseLog(input); assert.equal(globalThis.PWNED, false);
  assert.equal(report.findings[0].id, 'vulkan-device-lost');
  assert.doesNotMatch(buildSummary(report), /<img|onerror|touch|curl|private\.example/);
  delete globalThis.PWNED;
});

test('invalid type and empty input return explicit errors with no partial results', () => {
  for (const value of [undefined, null, 42, {}, [], true]) assert.equal(parseLog(value).error.code, 'input-type');
  for (const value of ['', '   ', '\n\t']) assert.equal(parseLog(value).error.code, 'empty-input');
  for (const value of [null, '']) assert.deepEqual(parseLog(value).findings, []);
});

test('character, line and per-line limits reject the entire input', () => {
  const inputs = [
    ['character-limit', 'x'.repeat(LIMITS.characters + 1)],
    ['line-limit', 'amdgpu: GPU reset begin!\n' + '\n'.repeat(LIMITS.lines)],
    ['line-length-limit', 'amdgpu: GPU reset begin!\n' + 'x'.repeat(LIMITS.lineLength + 1)],
  ];
  for (const [code, input] of inputs) {
    const report = parseLog(input); assert.equal(report.error.code, code); assert.deepEqual(report.findings, []);
    assert.ok(Object.values(report.versions).every(value => value === null));
    assert.ok(Object.values(report.layers).every(value => value === 'unreported'));
    assert.doesNotMatch(buildSummary(report), /GPU recovery/);
  }
});

test('exact input boundaries and original line numbers are honored', () => {
  const exactLines = '\n'.repeat(LIMITS.lines - 1) + 'amdgpu: GPU reset begin!';
  const report = parseLog(exactLines); assert.equal(report.error, null); assert.equal(report.stats.lines, LIMITS.lines);
  assert.equal(report.findings[0].evidence[0].line, LIMITS.lines);
  assert.equal(parseLog('x'.repeat(LIMITS.lineLength)).error, null);
  const crlf = parseLog('\r\namdgpu: GPU reset begin!\r\n'); assert.equal(crlf.findings[0].evidence[0].line, 2);
});

test('public redaction limits do not silently return a raw partial input', () => {
  assert.equal(redactSensitive(null), '');
  assert.equal(redactSensitive('SECRET'.repeat(LIMITS.characters)), '[text exceeds redaction limit]');
  assert.equal(redactSensitive('\n'.repeat(LIMITS.lines)), '[text exceeds redaction line limit]');
  assert.equal(redactSensitive('SECRET'.repeat(LIMITS.lineLength)), '[line exceeds redaction limit]');
});

test('adversarial near-limit logs remain bounded and preserve a final genuine event', { timeout: 5000 }, () => {
  const prefix = ('vkCreateInstance ' + 'a'.repeat(7600) + ' timeout=10000\n').repeat(135);
  assert.ok(prefix.length < LIMITS.characters);
  const started = performance.now();
  const report = parseLog(prefix + 'amdgpu: GPU reset begin!');
  assert.equal(report.error, null); assert.deepEqual(report.findings.map(finding => finding.id), ['amdgpu-reset']);
  assert.ok(performance.now() - started < 4000, 'near-limit parse exceeded bounded acceptance budget');
});

test('adversarial redaction handles near-limit repeated separators without runaway matching', { timeout: 5000 }, () => {
  const log = ('token' + ': '.repeat(4000) + '\n').repeat(125);
  assert.ok(log.length < LIMITS.characters);
  const started = performance.now(); redactSensitive(log);
  assert.ok(performance.now() - started < 4000, 'redaction exceeded bounded acceptance budget');
});

test('near-limit long ordinary words and hyphenated words redact without quadratic retry', { timeout: 5000 }, () => {
  const log = ('a'.repeat(8100) + '\n').repeat(60) + (('a-'.repeat(4048)) + '\n').repeat(60);
  assert.ok(log.length < LIMITS.characters);
  const started = performance.now(); const redacted = redactSensitive(log);
  assert.equal(redacted, log);
  assert.ok(performance.now() - started < 4000, 'ordinary-word redaction exceeded bounded acceptance budget');
});

test('many long matching lines are fully counted with bounded cached evidence', { timeout: 5000 }, () => {
  const log = ('err: vkQueueSubmit returned VK_ERROR_DEVICE_LOST ' + 'a'.repeat(8000) + '\n').repeat(125);
  assert.ok(log.length < LIMITS.characters);
  const started = performance.now(); const report = parseLog(log);
  assert.equal(report.error, null); assert.equal(report.findings[0].count, 125);
  assert.equal(report.findings[0].evidence.length, LIMITS.evidencePerFinding);
  assert.ok(performance.now() - started < 4000, 'matching long-word parse exceeded bounded acceptance budget');
});

test('dedicated worker replies with bounded, redacted reports and echoes only valid job IDs', async () => {
  const previous = globalThis.self; const replies = [];
  globalThis.self = { postMessage: message => replies.push(message) };
  try {
    await import('../assets/linux-gaming-repair/inspector-worker.js');
    self.onmessage({ data: { id: 7, input: 'err: vkQueueSubmit returned VK_ERROR_DEVICE_LOST token=SECRET_WORKER', extra: 'SECRET_EXTRA' } });
    assert.equal(replies[0].id, 7); assert.equal(replies[0].report.findings[0].id, 'vulkan-device-lost');
    assert.doesNotMatch(JSON.stringify(replies), /SECRET/);
    self.onmessage({ data: { id: { secret: 'SECRET_ID' }, input: null } });
    assert.equal(replies[1].id, null); assert.equal(replies[1].report.error.code, 'input-type');
    self.onmessage({ data: null }); assert.equal(replies[2].report.error.code, 'input-type');
    self.onmessage({ data: { id: 'job-9', input: 'x'.repeat(LIMITS.characters + 1) } });
    assert.equal(replies[3].id, 'job-9'); assert.equal(replies[3].report.error.code, 'character-limit');
  } finally { if (previous === undefined) delete globalThis.self; else globalThis.self = previous; }
});
