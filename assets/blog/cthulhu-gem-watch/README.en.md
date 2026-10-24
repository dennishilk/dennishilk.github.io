# My Cthulhu capture tools, 23–24 October 2026

**Current status, 24 October 2026:** I have captured actual failures with native v4 and v5, including the release caller for the latest generation of one missing handle. I keep these host submission failures separate from the older GPUVM fault, the validation-instrumented run and Arma's PCI access loss. A culprit and fix remain unresolved. The commands below document completed work; further game starts are paused without a specific question.


I used these tools incrementally to narrow down the repeatable S.T.A.L.K.E.R. reload failure. I preserve each supplied script version unchanged. They are limited to x86_64 Linux 7.2.11 and the exact builds checked in their source; instrumentation can change timing.

| File | Measured or prepared | Actual status through 24 October |
|---|---|---|
| [cthulhu-cs-watch.py](../cthulhu-cs-watch/cthulhu-cs-watch.py) | Three kernel return probes for BO lists, syncobj and CS | Used live; ENOENT on BO/CS path, no captured syncobj ENOENT |
| [cthulhu-gem-watch.py](cthulhu-gem-watch.py) | Seven kernel probes for handles and file context | Used live; handle 7558, latest close 3.643 ms before NULL lookup |
| [cthulhu-gem-stack-watch.py](cthulhu-gem-stack-watch.py) | Seven kernel probes, two private instances and bounded native stacks | Used live; handle 6233, latest close 5.227 ms earlier; later symbolization establishes pool destruction |
| [cthulhu-pool-caller-watch.py](cthulhu-pool-caller-watch.py) | Seven kernel probes and two PE uprobes, one private instance | Registration succeeded; two live captures, but both PE probes had zero hits in each |
| [cthulhu-native-pool-watch.py](cthulhu-native-pool-watch.py) | Seven kernel probes and two native ELF uprobes | 26 local simulation tests; registration and 23 October normal-exit control: 90 pairs, 36 closes; 24 October startup/reload failures with handles 299/8842 |
| [cthulhu-heap-release-watch.py](cthulhu-heap-release-watch.py) | Same nine probes plus four bounded stack/heap candidates | 33 local offline tests documented; registration and actual reload capture confirmed: 39 checked pairs, handle 3229 closed 6.887 ms before failed lookup |

## My workflow and completed coverage check

I always start the collector before the fullscreen game. The subsequent 10–15 minute shader compilation counts toward its default maximum total duration of 30 minutes. Events, native task attribution, probe/buffer statistics and cleanup results must be interpreted together. Native Linux IDs are not hexadecimal Wine IDs.

For later versions I checked disabled probe registration with `--probe-check` before capture. That check has now succeeded for the native version. The subsequent normal-exit control delivered 90 independently validated native entry/exit pairs and 36 successful handle closes within those calls. To reproduce the completed registration step, my command was:

```sh
sudo python3 -B "$HOME/cthulhu-native-pool-watch.py" --probe-check
```

This mode enables no capture, reads no event stream and creates no capture file. It registers nine disabled probes, checks fields/filters and removes its own objects. No game launch is needed. Successful registration would not establish later hits or valid return-address slots. `--arm` is the separate active mode. I subsequently used it before the fullscreen game and quit normally; the original hash and selected control results are in the evidence summary.

## Exact native probe point and limits

V4 checks sizes, hashes and machine instructions for the three modules named in its source before registration. In the known `winevulkan.so`, its two ordinary uprobes target file offset `0x2ee80` (wrapper entry) and `0x2eea9` (immediately after the host call); these are not uretprobes. RDI holds the parameter block on entry, and RBX retains it afterward. The exact Windows wrapper makes `params+40` a candidate API-caller slot and `params-56` a verification slot. The latter must resolve to file offset `0x12a7a` in the matching Wine PE mapping. This is derived for these binaries, not a general Wine ABI guarantee.

Attribution requires complete same-native-thread spans, matching arguments/addresses, entry RSP equal to exit RSP plus 24, matching mapping identities and reviewed loss statistics. Invalid or zero candidates do not identify a caller; kernel capture can continue without that attribution. Fresh file hashes require matching device/inode identities. They still hash file bytes, not private COW runtime pages.

A successful GEM handle close does not establish the end of all object/GPU references. Because handles are reused, the generation intended by the BO list remains unknown. I have not captured the full D3D12 Release/fence sequence or established a common cause with the older GPUVM fault.


## Confirmed normal-exit control, 23 October

I quit the game normally. Both native probes report 90 hits; all 90 pairs were independently checked using the same native TID, arguments and RSP delta of 24. Thirty-six pairs each enclose a successful GEM handle close. All candidate callers resolve in the complete early mapping snapshot to `d3d12core.dll+0x386ce4`, and all verification slots to Wine PE file offset `0x12a7a`. The mapped replacement D3D12-DLL inode was opened with matching identity and confirmed against the known hash. There was no captured NULL lookup or BO/CS ENOENT, no reported kernel-probe/buffer losses and no cleanup errors. Some late process metadata was unavailable by read time; the early matching snapshot/file-hash attribution is present. This control alone did not establish a failed-reload callsite or a complete Release/fence sequence. The next day's failures are separate captures below.

## Actual native failures and the v5 extension, 24 October

The v4 startup capture records missing handle 299 in a 20-entry BO list, 3.377 ms after its last successful close. The later gameplay/death/reload capture records handle 8842 in a 21-entry list, 6.923 ms after close. The first capture has one pre-failure generation; reuse after the failed lookup is not the generation used by the rejected list. The second records three pre-failure generations. Their original hashes and selected statistics are in `updates_20261024.stalker_failures` in the JSON summary.

V5 adds `caller2` at `params+104`, `caller3` at `params+200`, `heap_hint` at `params+88` and `heap_pool` at `heap_hint+176`. These are bounded candidates for the exact checked code path, not a general ABI or arbitrary stack unwind. Attribution requires the expected `d3d12core.dll` RVAs `0x386ce4` and `0x386afa`, verified binary/mapping identities and a matching non-null pool. The upscaler's runtime inode/hash is not among the three guarded modules; the separately supplied DLL matched the official AMD binary afterward.

My completed registration and capture commands were, in sequence:

```sh
sudo python3 -B "$HOME/cthulhu-heap-release-watch.py" --probe-check
sudo python3 -B "$HOME/cthulhu-heap-release-watch.py" --arm
```

The original v5 source header preserves its pre-capture validation status. The later live capture passed all 39 additional-field checks, with 16 successful scoped closes, 44,848 parsed/read events, zero reported kernel misses/buffer losses and successful cleanup. Ordinary uprobe hit statistics do not expose a separate missed-instance counter. Private instances and the unchanged global stack options remain part of the method.

The latest generation of handle 3229 was closed inside the observed pool destruction; 6.887 ms later its lookup failed, then BO/CS returned `-2`. The higher captured return is `amd_fidelityfx_upscaler_dx12.dll+0x3bea`. Exact official SDK binary comparison and source/disassembly identify `DestroyBackendContextDX12` releasing `descRingBuffer` at call RVA `0x3be7`. This is source/binary attribution, not PDB recovery. It does not establish premature release, the intended handle generation, the complete fence chronology or the responsible component. That rejected submission never reached GPU execution.

## Other findings are not equivalent captures

The same evidence summary now records the validation run, its build-matched CPU reporting-path faults, two Arma D3D11/DXVK runs with confirmed Descriptor buffer/Legacy binding models, the saved Blackbox sessions and the post-reboot PCI snapshot. Both Arma runs lost PCI configuration access before the first ring-reset attempt. Only the first preserved session proves a completed GPU recovery failure (`-19`); the second lacks a completed outcome. Neither is the old valid-address GPUVM fault or the host BO-list ENOENT sequence. Raw private logs, dumps, debug data and third-party DLLs are not published here.

## Originals and reproducible summary

[evidence-summary.json](evidence-summary.json) contains selected derived facts, original filenames and SHA-256 hashes. It is not a raw log. Original complete Proton and trace files remain authoritative. I include no private raw logs, GPU dumps or third-party ELF/PE libraries. Some historical source headers describe their validation status before later live captures; the table above records the current status documented here.

## Unchanged supplied script files

| File | Bytes | SHA-256 |
|---|---:|---|
| cthulhu-cs-watch.py | 16490 | `a14217220cb3e78616d9002f13be108581ef02c6f098d1b4b4b3d273ae59bfad` |
| cthulhu-gem-watch.py | 24386 | `432058cdb6d5e20b2821b8f8c24cf264110f47d730a7ae4503572abc60410af3` |
| cthulhu-gem-stack-watch.py | 38738 | `89fb0b03b695d21c80d334bee6105f76de2dbd0096c3451ca026353ce80e44fd` |
| cthulhu-pool-caller-watch.py | 40078 | `cd7f5d170e6c3a724a7619b221ca22f0de748050d01e8eaa38c969719b28ae4a` |
| cthulhu-native-pool-watch.py | 45467 | `d4b844a6cb5598a84807ebeede08e630d6a48ddfd8fa03ed435545951205f073` |
| cthulhu-heap-release-watch.py | 48494 | `1d22520eeafeb757feac5ef89ec95dd92505ad45aa5a0eb8f0e8c7fa502bb5b5` |

## Primary sources

- [Linux 7.2.11: BO-list creation](https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/amd/amdgpu/amdgpu_bo_list.c)
- [Kernel kprobe/kretprobe documentation](https://docs.kernel.org/trace/kprobetrace.html)
- [Kernel uprobe documentation](https://docs.kernel.org/trace/uprobetracer.html)
- [Pinned Wine Unix dispatcher](https://github.com/ValveSoftware/wine/blob/e60892cc2398b0a83c332a2078c7b85e47bdb42b/dlls/ntdll/unix/signal_x86_64.c)
- [AMD's matching FidelityFX backend source](https://github.com/GPUOpen-LibrariesAndSDKs/FidelityFX-SDK/blob/f4c1da8e92f3fe563b5c28c44e6267ce6b6b8eb2/Kits/FidelityFX/backend/dx12/ffx_dx12.cpp)
- [Linux 7.2.11 PCI bus-access check](https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/amd/amdgpu/amdgpu.h)
- [Linux 7.2.11 devcoredump formatter](https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/amd/amdgpu/amdgpu_dev_coredump.c)
