# Graphics and PCIe research provenance

Reviewed on 2026-10-10. This bounded collection contains 36 original bilingual profiles: 8 AMD graphics, 8 NVIDIA graphics, 8 Intel graphics and 12 PCIe/motherboard-controller contexts. There are 33 curated exact PCI pairs and 6 context-only profiles. It is not an imported hardware database or a completeness claim.

## Source method

Linux implementation claims use the immutable torvalds/linux snapshot `3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0`. Each URL in the profile collection was retrieved over HTTPS; raw.githubusercontent.com was used to inspect bytes for the equivalent immutable GitHub blob URLs. The browser search adapter returned DisabledError for GitHub pages, so source verification used direct HTTPS rather than claiming a successful search result. The NVIDIA identifiers are selected from the manufacturer's versioned 580.95.05 README, not a third-party PCI name database; each name/ID pair was parsed and checked in the same table row. Numeric facts and short constants are curated; explanatory prose is original.

This is source/editorial verification, not execution on the identified hardware. No device support rating, minimum kernel, benchmark, reproduced failure, or compatibility guarantee is inferred. The Linux snapshot and NVIDIA README are explicit reference versions, not a recommendation to install those versions. No repository publication or external write was performed by this research task.

## Identity boundaries

- Linux AMD rows identify a CHIP family; the mobility/APU flags are recorded as table flags, not exact retail models. The GC 12.0 page has no exact PCI ID. AMD's IP-discovery fallback requires later probe/IP evidence before a modern GPU can be identified.
- Intel entries are checked in the shared ID header and in the consuming i915 table. TGL, ADLP and DG2 also occur in the Xe table. Shared table inclusion does not establish current/default binding; runtime ownership requires the pasted driver observation.
- NVIDIA reference matches use only unqualified device-ID rows. OEM rows with additional subsystem constraints were not silently broadened. Nouveau's Linux table is a vendor/display-class wildcard, so the Nouveau candidate is class evidence, not exact product verification. The proprietary/open module-flavor and GSP statements are vendor-documentation claims. No GPU-specific GSP filename is guessed from the generic Turing example.
- Root-port and switch pages share a generic bridge class and explicitly require capability-type/topology confirmation. RCEC and CXL use narrower checked classes. `pcieport` is the observed built-in driver name, not a promised loadable module or installable package; the candidate metadata records builtIn/loadable accordingly. AMD PMC is a platform/ACPI context: its internal PCI root-device lookup is deliberately not exposed as an exact PCI product match.
- VMD is a controller and PCI-domain layer, not an NVMe model. SMBus host IDs are not sensor-client IDs. MEI binding is not proof of AMT provisioning. CCP binding is not proof of SEV, TPM or crypto acceleration.

## Firmware and diagnostics

All 22 literal AMD and Intel firmware examples were checked against MODULE_FIRMWARE strings or the source's exact DMC path macros. These are examples, not complete package manifests. Intel DMC concerns display power management; GuC/HuC are separate components. A platform firmware requirement and an externally loaded blob filename are different claims. `none-documented` means no filename established in the profile evidence, not firmware-free hardware.

Commands are passive: PCI summaries, driver symlinks, existing sysfs objects, current-boot journal, NVIDIA's read-only query and registered crypto metadata. Full BDF placeholders are explained. `sudo lspci -vv` is used only where restricted PCI capability detail is needed. No unbind, rescan, firmware flash, active SMBus address probe, sleep trigger or parameter modification is proposed. Permission failures are not device failures. Reports remain observations; no command was executed on an affected device here. Fix Lab IDs were checked against the current JSON collection.

## Curated exact ID evidence

| Profile | Pair(s) | Checked upstream locator |
| --- | --- | --- |
| `amd-tahiti` | `1002:6798` | [Linux amdgpu PCI table](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/amdgpu_drv.c); pciidlist, line 1848 |
| `amd-bonaire` | `1002:6640` | [Linux amdgpu PCI table](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/amdgpu_drv.c); pciidlist, line 1937 |
| `amd-polaris10` | `1002:67df` | [Linux amdgpu PCI table](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/amdgpu_drv.c); pciidlist, line 2042 |
| `amd-vega10` | `1002:687f` | [Linux amdgpu PCI table](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/amdgpu_drv.c); pciidlist, line 2078 |
| `amd-navi10` | `1002:731f` | [Linux amdgpu PCI table](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/amdgpu_drv.c); pciidlist, line 2109 |
| `amd-sienna-cichlid` | `1002:73bf` | [Linux amdgpu PCI table](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/amdgpu_drv.c); pciidlist, line 2139 |
| `amd-renoir` | `1002:1636` | [Linux amdgpu PCI table](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/amdgpu_drv.c); pciidlist, line 2118 |
| `nvidia-gtx-750-ti` | `10de:1380` | [NVIDIA 580.95.05 supported GPU table](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/supportedchips.html); Checked the unqualified 1380 row labelled NVIDIA GeForce GTX 750 Ti; NVIDIA vendor number 10de is independently defined in Linux pci_ids.h. |
| `nvidia-gtx-980` | `10de:13c0` | [NVIDIA 580.95.05 supported GPU table](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/supportedchips.html); Checked the unqualified 13C0 row labelled NVIDIA GeForce GTX 980; NVIDIA vendor number 10de is independently defined in Linux pci_ids.h. |
| `nvidia-gtx-1080` | `10de:1b80` | [NVIDIA 580.95.05 supported GPU table](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/supportedchips.html); Checked the unqualified 1B80 row labelled NVIDIA GeForce GTX 1080; NVIDIA vendor number 10de is independently defined in Linux pci_ids.h. |
| `nvidia-gt-1030` | `10de:1d01` | [NVIDIA 580.95.05 supported GPU table](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/supportedchips.html); Checked the unqualified 1D01 row labelled NVIDIA GeForce GT 1030; NVIDIA vendor number 10de is independently defined in Linux pci_ids.h. |
| `nvidia-rtx-2080` | `10de:1e82` | [NVIDIA 580.95.05 supported GPU table](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/supportedchips.html); Checked the unqualified 1E82 row labelled NVIDIA GeForce RTX 2080; NVIDIA vendor number 10de is independently defined in Linux pci_ids.h. |
| `nvidia-rtx-3080` | `10de:2206` | [NVIDIA 580.95.05 supported GPU table](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/supportedchips.html); Checked the unqualified 2206 row labelled NVIDIA GeForce RTX 3080; NVIDIA vendor number 10de is independently defined in Linux pci_ids.h. |
| `nvidia-rtx-4090` | `10de:2684` | [NVIDIA 580.95.05 supported GPU table](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/supportedchips.html); Checked the unqualified 2684 row labelled NVIDIA GeForce RTX 4090; NVIDIA vendor number 10de is independently defined in Linux pci_ids.h. |
| `nvidia-rtx-5090` | `10de:2b85` | [NVIDIA 580.95.05 supported GPU table](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/supportedchips.html); Checked the unqualified 2B85 row labelled NVIDIA GeForce RTX 5090; NVIDIA vendor number 10de is independently defined in Linux pci_ids.h. |
| `intel-ivy-bridge-gt2-mobile` | `8086:0166` | [Linux Intel graphics family ID header](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/drm/intel/pciids.h); INTEL_IVB_M_GT2_IDS, line 160 |
| `intel-haswell-gt2-desktop` | `8086:0412` | [Linux Intel graphics family ID header](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/drm/intel/pciids.h); INTEL_HSW_GT2_IDS, line 225 |
| `intel-broadwell-gt2-ult` | `8086:1616` | [Linux Intel graphics family ID header](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/drm/intel/pciids.h); INTEL_BDW_GT2_IDS, line 292 |
| `intel-skylake-gt2-desktop` | `8086:1912` | [Linux Intel graphics family ID header](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/drm/intel/pciids.h); INTEL_SKL_GT2_IDS, line 371 |
| `intel-ice-lake-graphics` | `8086:8a52` | [Linux Intel graphics family ID header](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/drm/intel/pciids.h); INTEL_ICL_IDS, line 585 |
| `intel-tiger-lake-graphics` | `8086:9a49` | [Linux Intel graphics family ID header](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/drm/intel/pciids.h); INTEL_TGL_IDS, line 628 |
| `intel-alder-lake-p-graphics` | `8086:46a6` | [Linux Intel graphics family ID header](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/drm/intel/pciids.h); INTEL_ADLP_IDS, line 674 |
| `intel-dg2-g10-desktop` | `8086:56a0` | [Linux Intel graphics family ID header](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/drm/intel/pciids.h); INTEL_DG2_G10_D_IDS, line 726 |
| `intel-vmd-server-domain` | `8086:201d, 8086:28c0` | [Linux VMD controller ID and feature table](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/pci/controller/vmd.c); vmd_ids, lines 1235–1257 |
| `intel-vmd-client-domain` | `8086:9a0b, 8086:467f` | [Linux VMD controller ID and feature table](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/pci/controller/vmd.c); vmd_ids, lines 1235–1257 |
| `intel-ich9-smbus` | `8086:2930` | [Linux SMBus controller source](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/i2c/busses/i2c-i801.c); i801_ids / piix4_ids and numeric constants |
| `intel-kaby-lake-pch-h-smbus` | `8086:a2a3` | [Linux SMBus controller source](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/i2c/busses/i2c-i801.c); i801_ids / piix4_ids and numeric constants |
| `amd-kerncz-smbus` | `1022:790b` | [Linux SMBus controller source](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/i2c/busses/i2c-piix4.c); i801_ids / piix4_ids and numeric constants |
| `intel-sunrise-point-mei` | `8086:9d3a` | [Linux MEI family ID constants](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/misc/mei/hw-me-regs.h); line 62 |
| `amd-secure-processor-pci` | `1022:1456, 1022:1486` | [Linux AMD Secure Processor PCI table](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/crypto/ccp/sp-pci.c); lines 555–558 |

## Context-only evidence

- **amd-gc12-ip-discovery**: classes none; module/platform context only. This is a context profile without a curated PCI product ID. The snapshot has AMD display-class fallback entries marked CHIP_IP_DISCOVERY, and the discovery implementation selects gfx_v12_0 for GC IP versions 12.0.0 and 12.0.1. An amdgpu module or AMD display class alone does not prove GC 12.0; the device initialization report must actually identify the IP block.
- **pcie-root-port-context**: classes 060400, 060401. This profile has no exact vendor/device match. The reviewed driver accepts PCI bridge classes but then requires a PCIe root, upstream, downstream or RCEC type. A root port is the platform-facing parent of a link; distinguish it from the GPU or storage endpoint whose error appears later in the report.
- **pcie-switch-port-context**: classes 060400, 060401. This is a generic PCIe bridge/driver context, not an exact switch-vendor ID. The kernel port probe includes upstream and downstream PCIe types. A multi-hop tree can contain separate links with different speeds and widths; a switch function and the downstream GPU are distinct PCI functions.
- **pcie-rcec-context**: classes 080700. The reviewed class table includes PCI_CLASS_SYSTEM_RCEC with programming interface 00, corresponding to class 080700. The probe recognizes the PCIe RC_EC type and links RCEC associations. This function is an event collector, not a conventional external slot root port or an exact platform model.
- **cxl-type3-memory-context**: classes 050210. No manufacturer or exact memory appliance is inferred. The checked cxl_pci table matches PCI_CLASS_MEMORY_CXL with CXL_MEMORY_PROGIF 0x10, yielding class 050210. That class identifies a management path for a CXL memory function, not a promise that a CXL region is configured or its memory is online.
- **amd-pmc-platform-context**: classes none; module/platform context only. This generic profile deliberately has no curated PCI match. amd_pmc is a platform driver with ACPI matching and CPU/root-device context in its implementation. A PCI root-device table used internally is not the same thing as a PCI driver binding table for an independent PMC endpoint.

## Retrieved primary sources

All bytes below were retrieved on 2026-10-10. SHA-256 records the checked source response, without embedding an external source corpus in browser assets.

| Source | Result / bytes | Checked response SHA-256 |
| --- | --- | --- |
| [gsp.html](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/gsp.html) | 200 / 4089 | `409f9b81d0ee5bd698186d2c8e1cd58bca658c889ca703094a2ef9981cb8989c` |
| [kernel_open.html](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/kernel_open.html) | 200 / 7717 | `3d624451ba663e6bfee5e09a9daa2b4c566a57815736ca02b068e332e9aebd0c` |
| [supportedchips.html](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/supportedchips.html) | 200 / 221147 | `ae4f87a4984120e8478b5c4c14dd9d2cdfdfc0e5508c2d92e217cf4a84f4fed3` |
| [pci.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/PCI/pci.rst) | 200 / 23372 | `089b6b90b78f63951b000c9e74653fc209e965f441dac1bdf3246690d358f3d0` |
| [pcieaer-howto.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/PCI/pcieaer-howto.rst) | 200 / 10308 | `726923833b82d118a90abca2318cb1aef6af39c124159acfcb27d629c314ba0c` |
| [mei.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/mei/mei.rst) | 200 / 6030 | `e0adc6863fdbae680071b35b7e57f2de6864e1250b1ae9796e48c8713fc6524c` |
| [i2c-i801.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/i2c/busses/i2c-i801.rst) | 200 / 6886 | `cbe1305fd41232899dcf612922e09ec655421f1d28e6465f742b9c49a652c266` |
| [i2c-piix4.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/i2c/busses/i2c-piix4.rst) | 200 / 6744 | `5f464ac2b43fbc09ee404372a630befe8df14ccbdca8c3e3fc3687dc7d3042f1` |
| [basic-pm-debugging.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/power/basic-pm-debugging.rst) | 200 / 12551 | `5d0575bb9bd126c4b5c81e94820ec14811f1fbb67eaf26d5a5df4753306fddc2` |
| [Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/crypto/ccp/Kconfig) | 200 / 1815 | `4fc4c4ac40765f09eab9c2d92e0aee66330b124fdc6c1d6366e9e785437c2f8b` |
| [Makefile](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/crypto/ccp/Makefile) | 200 / 1017 | `dbc3001d2c9ebd44ab195759d19073053e1e4bd19dc5bf78309af5b7918ee520` |
| [sp-pci.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/crypto/ccp/sp-pci.c) | 200 / 14920 | `58b1b12be5ccd2702bc26fa9a52a717a2446f1889c272da913fa530b9acd3bea` |
| [cxlpci.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/cxl/cxlpci.h) | 200 / 2568 | `d0deacd820b274fecdfd582908570f149693b90fb1414c5afbaed87aa111d5b5` |
| [pci.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/cxl/pci.c) | 200 / 30681 | `b5fd424d2d3b4046957399cf0b18971bba9f6c79f353b65e2741018f90cfeae7` |
| [amdgpu_discovery.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/amdgpu_discovery.c) | 200 / 109354 | `453490aaca40862b021102a19deab78c3647fbac09828713470170b4798763f9` |
| [amdgpu_drv.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/amdgpu_drv.c) | 200 / 105293 | `eb8f18a3abbe50f51d43acc9aac61da44cd1da1dcf26e6994c15f3c1b5abfe3f` |
| [gfx_v10_0.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/gfx_v10_0.c) | 200 / 462750 | `3b2013dcb603845c3785fe02fc9aeee848b391f10d462e9384a1e4f370a4fb1b` |
| [gfx_v12_0.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/gfx_v12_0.c) | 200 / 177045 | `d5591bf7276270768c746aec4d89fa93c8f51277571733b736bf613f73fa39fc` |
| [gfx_v6_0.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/gfx_v6_0.c) | 200 / 125579 | `bfb3a74f91154a1fadb351cb38d3667a6912a4733b054aa33e56e19483cad281` |
| [gfx_v7_0.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/gfx_v7_0.c) | 200 / 157740 | `b4ce868a68939f968231c8ebdd9c52579bdd7bab187035029b0c82219adba265` |
| [gfx_v8_0.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/gfx_v8_0.c) | 200 / 244863 | `861a8fdd98745ae8b9bf4d500322b82306d4e10e98bf1d356bc8ba7e8870a37e` |
| [gfx_v9_0.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/amd/amdgpu/gfx_v9_0.c) | 200 / 273627 | `68fbc35dc164777d9c5d20f45c0b8d54651acda6bce34dd5d9daec83bc26a5f9` |
| [intel_dmc.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/i915/display/intel_dmc.c) | 200 / 50025 | `feda9de1f6834207c706d54443249af9fe8c65047b881209427699d59409222a` |
| [intel_uc_fw.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/i915/gt/uc/intel_uc_fw.c) | 200 / 41770 | `4ef7c51f6d694c798f8b5beeb522e9ea5cdfb0cac4f04d59b1123efc84bcd79e` |
| [i915_pci.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/i915/i915_pci.c) | 200 / 26723 | `faf891f17e233c24c183338e798c8867a4e0f7afced17c7f342e988fbc38dbf1` |
| [nouveau_drm.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/nouveau/nouveau_drm.c) | 200 / 40449 | `288261cfcef0c9a2b32cd03cffde5d1946c4b206d8686a454be1718d13b2d108` |
| [xe_pci.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/gpu/drm/xe/xe_pci.c) | 200 / 39345 | `061f949a3c7859c5813ed22bb4306b7b6af3492ed344f44fb128b4ee160dd19a` |
| [i2c-i801.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/i2c/busses/i2c-i801.c) | 200 / 55161 | `752d89228a166ec26ee11ccebe094896b8ded3600df9da3b998b825bf98b80d0` |
| [i2c-piix4.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/i2c/busses/i2c-piix4.c) | 200 / 31701 | `4090404533b3a372acd1809e25d2c525edf00295e5e4c319bb096a33bfadbbba` |
| [hw-me-regs.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/misc/mei/hw-me-regs.h) | 200 / 10453 | `3dfecb6679c788dd39749520e38ecee759c7a31205ef4e0af20d383b72e74e28` |
| [pci-me.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/misc/mei/pci-me.c) | 200 / 14844 | `fe63bf33b0ec17d54cdd24adbef065e1e34a967fea892ad0e1ab5bae1d002872` |
| [vmd.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/pci/controller/vmd.c) | 200 / 34625 | `3ad24b14ec6158cc03a2505ef05ae1066d94f4ba79542ee2984276132331c7d4` |
| [Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/pci/pcie/Kconfig) | 200 / 4190 | `23ef332505e4d55b2e24d5ad68c03ba37141277dfc676868388bba098dddf995` |
| [portdrv.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/pci/pcie/portdrv.c) | 200 / 23041 | `1ae9f36a2b3d3ec10f21b4db18602048180d6bd30fa583746493fc723103c4ba` |
| [Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/platform/x86/amd/pmc/Kconfig) | 200 / 1235 | `1fe34bdb25a808f1d8004ca2cb98e93ea7aad06f6f8ef8ce8359a4f8229f9340` |
| [pmc.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/platform/x86/amd/pmc/pmc.c) | 200 / 27562 | `18c37a4df0b52da04d3f6dead6127c510e8404ec3f5bb7a7f1f6746b84475c85` |
| [pciids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/drm/intel/pciids.h) | 200 / 31897 | `102d8f821c9464ad17c0160535a4e3811f49609f199f1b6d7268050d71d8e8f0` |
| [pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h) | 200 / 129781 | `020fac001871c0f8441c1294f787231fb6cfbf2c55915ca8f918262e2db4487c` |

## Review gaps and limits

This collection intentionally does not identify arbitrary new GPUs, every NVIDIA/OEM subsystem, every bridge vendor, every chipset, every sensor client or all firmware variants. Exact ID checks do not verify board wiring, electrical health, power delivery, application selection, BIOS modes or local package contents. No hardware, graphical browser, suspend, gaming or compute workload was exercised. The diagnostic interpretation is a guide to collecting relevant read-only evidence. Further curation needs independent source checks rather than a mass ID import.
