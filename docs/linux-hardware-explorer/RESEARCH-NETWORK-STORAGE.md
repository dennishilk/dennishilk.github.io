# Ethernet and storage research

Editorial/source review: 2026-10-10. This is a source-supported catalog, not a hardware certification, a minimum-kernel table or a reproduced compatibility matrix.

All Linux source links refer to immutable snapshot `3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0`. Sources were retrieved over HTTPS from the corresponding raw.githubusercontent.com paths and inspected as text. The public web-open tool returned DisabledError, so no unavailable web pages are represented as read. No PCI/USB database was imported.

The JSON contains 40 substantial bilingual profiles: 22 Ethernet and 18 storage. There are 37 curated exact primary ID pairs and three context-only profiles (generic AHCI, generic PCI NVMe and virtio block). An exact primary pair establishes a candidate family; source class/interface qualifications, subsystem ambiguity and runtime binding remain explicit.

## Review boundaries

- Marvell 1b4b:9123 has an upstream 88se9128 comment; the user-facing name remains 88SE912x. Its upstream ID-table entry additionally requires AHCI class 010601.
- ASMedia 1b21:0612 is annotated ASM1061/1062; no exact retail card is inferred.
- Intel 8086:1572 uses the source symbol SFP_XL710. The profile retains a 700-series family label instead of claiming an exact X710 retail product.
- ASIX 0b95:1790 additionally requires interface class/subclass/protocol ff/ff/00 in the upstream table. The simple USB pair matcher is family evidence and not a reproduction of that full interface-qualified binding.
- Adaptec 9005:0285 has a broad catch-all and many subsystem-specific cards. It remains a family profile. No exact SCSI/SATA/SAS card is derived from its primary pair.
- The current source builds mpt3sas.ko for SAS2008 as well as newer controllers. Legacy MPT2SAS Kconfig selects MPT3SAS; internal/log/proc naming can still be mpt2sas. Historical labels are not module-presence evidence.
- Realtek PCI/USB primary pairs can span silicon revisions. All firmware patterns are inspected examples, not a universal selection. bnx2x current/fallback filenames were resolved from pinned version constants; ice DDP is separate from adapter NVM.
- SATA host-controller identity never identifies the attached SSD. Generic NVMe establishes protocol context and uses an explicit NVMe Identify command for controller model/serial/firmware. RAID logical volumes can hide physical-member identity.
- ethtool supported/advertised modes differ from current Speed/Link detected; neither is a measured throughput result. PCIe LnkCap differs from LnkSta and both differ from Ethernet or SATA transport speed.
- Every checkpoint reads state. No flash, firmware update, SMART self-test, formatting, RAID assembly, discard, benchmark write, module unload or persistent setting change is offered.
- Commands were checked for read-only intent, not executed against all 40 devices. Root is explicit for kernel journal, full PCI detail and NVMe Identify. Placeholder names must be replaced by the actual device/interface.
- Fix Lab references were checked against the existing 150-problem content IDs. Generic RAID/SAS paths link to I/O pressure/PCIe evidence instead of falsely promising a SATA cable diagnosis for every SCSI target.

## Per-profile ID and source locators

### intel-82540em

Name: Intel 82540EM. Candidate(s): e1000.

Verified primary pair: `pci 8086:100e`.

- [drivers/net/ethernet/intel/e1000/e1000_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/e1000/e1000_main.c#L30): The PCI match table accepts device 100e for e1000. Locator: `INTEL_E1000_ETHERNET_DEVICE(0x100E); line 30`.
- [drivers/net/ethernet/intel/e1000/e1000_hw.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/e1000/e1000_hw.h#L389): The device-name constant maps 100e to 82540EM. Locator: `E1000_DEV_ID_82540EM ; line 389`.
- [Documentation/networking/device_drivers/ethernet/intel/e1000.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/networking/device_drivers/ethernet/intel/e1000.rst#L434): Driver diagnostics use the ethtool interface. Locator: `ethtool interface; line 434`.

Scope/limit: Guest-reported gigabit capability can reflect an emulated adapter and says nothing about host uplink throughput. A live link also does not establish DHCP, routing or DNS operation.

### intel-82574l

Name: Intel 82574L. Candidate(s): e1000e.

Verified primary pair: `pci 8086:10d3`.

- [drivers/net/ethernet/intel/e1000e/hw.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/e1000e/hw.h#L28): The constant identifies 10d3 as 82574L. Locator: `E1000_DEV_ID_82574L; line 28`.
- [drivers/net/ethernet/intel/e1000e/netdev.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/e1000e/netdev.c#L7877): The PCI table binds the 82574L entry to board_82574. Locator: `PCI_VDEVICE(INTEL, E1000_DEV_ID_82574L); line 7877`.
- [Documentation/networking/device_drivers/ethernet/intel/e1000e.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/networking/device_drivers/ethernet/intel/e1000e.rst#L7): This is the upstream Intel gigabit e1000e driver guide. Locator: `Intel Gigabit Linux driver; line 7`.

Scope/limit: A link flap, a transmit watchdog and a PCIe error are different observations. Compare their timestamps and the switch port before attributing every interruption to the controller model.

### intel-i217-lm

Name: Intel I217-LM. Candidate(s): e1000e.

Verified primary pair: `pci 8086:153a`.

- [drivers/net/ethernet/intel/e1000e/hw.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/e1000e/hw.h#L64): The constant maps 153a to PCH LPT I217-LM. Locator: `E1000_DEV_ID_PCH_LPT_I217_LM; line 64`.
- [drivers/net/ethernet/intel/e1000e/netdev.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/e1000e/netdev.c#L8001): The e1000e table includes this PCH LAN identifier. Locator: `PCI_VDEVICE(INTEL, E1000_DEV_ID_PCH_LPT_I217_LM); line 8001`.
- [Documentation/networking/device_drivers/ethernet/intel/e1000e.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/networking/device_drivers/ethernet/intel/e1000e.rst#L21): The driver guide distinguishes adapter identification from driver setup. Locator: `identify your adapter; line 21`.

Scope/limit: Suspend/resume or wake-on-LAN observations need the motherboard and firmware context. The LM suffix is not proof that a management service is active or reachable.

### intel-i210-copper

Name: Intel I210 copper. Candidate(s): igb.

Verified primary pair: `pci 8086:1533`.

- [drivers/net/ethernet/intel/igb/e1000_hw.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/igb/e1000_hw.h#L42): 1533 is the I210 copper identifier; other media have different identifiers. Locator: `E1000_DEV_ID_I210_COPPER	; line 42`.
- [drivers/net/ethernet/intel/igb/igb_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/igb/igb_main.c#L67): igb contains the exact I210 copper entry. Locator: `PCI_VDEVICE(INTEL, E1000_DEV_ID_I210_COPPER); line 67`.
- [Documentation/networking/device_drivers/ethernet/intel/igb.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/networking/device_drivers/ethernet/intel/igb.rst#L198): The driver guide documents an I210-specific shaping feature. Locator: `exclusive to i210; line 198`.

Scope/limit: An application missing a latency target can involve queue configuration and the wider network. A capability in the guide is not a measured timing guarantee for this installed adapter.

### intel-i350-copper

Name: Intel I350 copper. Candidate(s): igb.

Verified primary pair: `pci 8086:1521`.

- [drivers/net/ethernet/intel/igb/e1000_hw.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/igb/e1000_hw.h#L38): The header maps 1521 to I350 copper. Locator: `E1000_DEV_ID_I350_COPPER; line 38`.
- [drivers/net/ethernet/intel/igb/igb_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/igb/igb_main.c#L73): The exact I350 copper entry and I350 RSS/SR-IOV handling are present. Locator: `PCI_VDEVICE(INTEL, E1000_DEV_ID_I350_COPPER); line 73`.
- [Documentation/networking/device_drivers/ethernet/intel/igb.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/networking/device_drivers/ethernet/intel/igb.rst#L49): The driver guide distinguishes SR-IOV mode from ordinary interfaces. Locator: `support for SR-IOV; line 49`.

Scope/limit: Inspect each port and its interface independently. A virtual function can inherit link information from its physical function, and physical-card features do not automatically apply to a guest.

### intel-i225-lm

Name: Intel I225-LM. Candidate(s): igc.

Verified primary pair: `pci 8086:15f2`.

- [drivers/net/ethernet/intel/igc/igc_hw.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/igc/igc_hw.h#L19): The I225-LM constant resolves to 15f2. Locator: `IGC_DEV_ID_I225_LM	; line 19`.
- [drivers/net/ethernet/intel/igc/igc_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/igc/igc_main.c#L50): igc has an exact PCI entry for I225-LM. Locator: `PCI_VDEVICE(INTEL, IGC_DEV_ID_I225_LM); line 50`.

Scope/limit: Link-mode capability is not the rate actually negotiated with the switch. This profile does not label all I225 revisions as faulty or recommend a universal firmware or EEE change.

### intel-82599-sfp

Name: Intel 82599 SFP family. Candidate(s): ixgbe.

Verified primary pair: `pci 8086:10fb`.

- [drivers/net/ethernet/intel/ixgbe/ixgbe_type.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/ixgbe/ixgbe_type.h#L31): The 82599 SFP identifier is 10fb. Locator: `IXGBE_DEV_ID_82599_SFP ; line 31`.
- [drivers/net/ethernet/intel/ixgbe/ixgbe_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/ixgbe/ixgbe_main.c#L106): The ixgbe table maps this ID to board_82599. Locator: `PCI_VDEVICE(INTEL, IXGBE_DEV_ID_82599_SFP); line 106`.
- [Documentation/networking/device_drivers/ethernet/intel/ixgbe.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/networking/device_drivers/ethernet/intel/ixgbe.rst#L38): The guide discusses 82599-based adapters and supported pluggable optics. Locator: `82599-BASED ADAPTERS; line 38`.

Scope/limit: A supported PCI ID does not guarantee that arbitrary optical modules or DAC cables are accepted. PCIe LnkSta describes the host-side connection and must not be read as the Ethernet link rate.

### intel-x550-t

Name: Intel X550-T. Candidate(s): ixgbe.

Verified primary pair: `pci 8086:1563`.

- [drivers/net/ethernet/intel/ixgbe/ixgbe_type.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/ixgbe/ixgbe_type.h#L58): The X550T device constant is 1563. Locator: `IXGBE_DEV_ID_X550T	; line 58`.
- [drivers/net/ethernet/intel/ixgbe/ixgbe_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/ixgbe/ixgbe_main.c#L121): The X550T table entry selects board_X550. Locator: `PCI_VDEVICE(INTEL, IXGBE_DEV_ID_X550T); line 121`.
- [Documentation/networking/device_drivers/ethernet/intel/ixgbe.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/networking/device_drivers/ethernet/intel/ixgbe.rst#L27): The driver guide lists the X550 controller family. Locator: `Controller x550; line 27`.

Scope/limit: The module name does not imply identical media behavior across all ixgbe devices. Supported rates, cable conditions and switch advertisements can differ from the currently reported Speed.

### intel-700-sfp-1572

Name: Intel 700-series SFP function (1572). Candidate(s): i40e.

Verified primary pair: `pci 8086:1572`.

- [drivers/net/ethernet/intel/i40e/i40e_devids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/i40e/i40e_devids.h#L10): 1572 is the SFP_XL710 symbol; the family naming is retained. Locator: `I40E_DEV_ID_SFP_XL710; line 10`.
- [drivers/net/ethernet/intel/i40e/i40e_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/i40e/i40e_main.c#L66): The physical-function i40e table includes that symbol. Locator: `PCI_VDEVICE(INTEL, I40E_DEV_ID_SFP_XL710); line 66`.
- [Documentation/networking/device_drivers/ethernet/intel/i40e.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/networking/device_drivers/ethernet/intel/i40e.rst#L39): The guide discusses 700-series NVM/FW and SFP/QSFP context. Locator: `latest NVM/FW; line 39`.

Scope/limit: A physical-function match does not imply a guest uses i40e; virtual functions have separate identities and drivers. This source review is not a tested driver/NVM compatibility matrix.

### intel-e810-c-qsfp

Name: Intel E810-C QSFP function. Candidate(s): ice.

Verified primary pair: `pci 8086:1592`.

- [drivers/net/ethernet/intel/ice/ice_devids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/ice/ice_devids.h#L60): The E810-C QSFP constant is 1592. Locator: `ICE_DEV_ID_E810C_QSFP; line 60`.
- [drivers/net/ethernet/intel/ice/ice_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/intel/ice/ice_main.c#L5786): ice includes the exact E810-C QSFP table entry. Locator: `PCI_VDEVICE(INTEL, ICE_DEV_ID_E810C_QSFP); line 5786`.
- [Documentation/networking/device_drivers/ethernet/intel/ice.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/networking/device_drivers/ethernet/intel/ice.rst#L156): The guide documents the default DDP path and Safe Mode behavior. Locator: `intel/ice/ddp/ice.pkg; line 156`.

Scope/limit: Basic networking in Safe Mode does not prove advanced offload or performance features are available. A successful PCI match also does not validate a fitted QSFP module or switch configuration.

### realtek-rtl8168-family

Name: Realtek RTL8168 family. Candidate(s): r8169.

Verified primary pair: `pci 10ec:8168`.

- [drivers/net/ethernet/realtek/r8169_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/realtek/r8169_main.c#L236): The table accepts 10ec:8168 and the implementation contains revision-specific firmware selections. Locator: `0x8168) },; line 236`.
- [drivers/net/ethernet/realtek/r8169_firmware.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/realtek/r8169_firmware.c#L214): Firmware is requested and validated by the Realtek firmware helper. Locator: `request_firmware; line 214`.
- [drivers/net/ethernet/realtek/Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/realtek/Kconfig#L100): The in-tree module is called r8169 and includes RTL8168. Locator: `will be called r8169; line 100`.

Scope/limit: A family-wide ID cannot prove that an EEE, ASPM or firmware symptom applies to every chip revision. Use the current kernel log to obtain the selected chip description and requested firmware.

### realtek-rtl8125-family

Name: Realtek RTL8125 family. Candidate(s): r8169.

Verified primary pair: `pci 10ec:8125`.

- [drivers/net/ethernet/realtek/r8169_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/realtek/r8169_main.c#L245): The exact 8125 table entry and MAC/firmware examples are present. Locator: `0x8125) },; line 245`.
- [drivers/net/ethernet/realtek/Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/realtek/Kconfig#L97): The config documents RTL8125 2.5-gigabit support in r8169. Locator: `RTL8125 2.5GBit; line 97`.
- [drivers/net/ethernet/realtek/r8169_firmware.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/realtek/r8169_firmware.c#L214): The helper handles requested firmware blobs. Locator: `request_firmware; line 214`.

Scope/limit: The family label does not establish a tested kernel/firmware combination. A 1-gigabit link can be the correct negotiated result on a slower partner rather than a driver failure.

### realtek-rtl8126-family

Name: Realtek RTL8126 family. Candidate(s): r8169.

Verified primary pair: `pci 10ec:8126`.

- [drivers/net/ethernet/realtek/r8169_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/realtek/r8169_main.c#L246): The table includes 8126 and names RTL8126A firmware variants. Locator: `0x8126) },; line 246`.
- [drivers/net/ethernet/realtek/r8169_firmware.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/realtek/r8169_firmware.c#L214): The firmware helper requests and validates a selected blob. Locator: `request_firmware; line 214`.
- [drivers/net/ethernet/realtek/Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/realtek/Kconfig#L100): The shared configuration builds the r8169 module. Locator: `will be called r8169; line 100`.

Scope/limit: The source entry is not a release-date guarantee for every distribution. PCIe transport width, advertised Ethernet modes and actual carrier remain separate observations.

### broadcom-bcm5720

Name: Broadcom BCM5720. Candidate(s): tg3.

Verified primary pair: `pci 14e4:165f`.

- [drivers/net/ethernet/broadcom/tg3.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/broadcom/tg3.h#L67): TG3PCI_DEVICE_TIGON3_5720 is 165f. Locator: `TG3PCI_DEVICE_TIGON3_5720; line 67`.
- [drivers/net/ethernet/broadcom/tg3.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/broadcom/tg3.c#L337): tg3 matches this device and firmware selection depends on ASIC/revision. Locator: `{PCI_DEVICE(PCI_VENDOR_ID_BROADCOM, TG3PCI_DEVICE_TIGON3_5720)}; line 337`.

Scope/limit: A firmware filename printed by modinfo describes the module family, not necessarily a request made for this device. Board NVM and firmware-provided management can remain relevant even without a host-loaded file.

### broadcom-bcm57711

Name: Broadcom/QLogic BCM57711. Candidate(s): bnx2x.

Verified primary pair: `pci 14e4:164f`.

- [drivers/net/ethernet/broadcom/bnx2x/bnx2x.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/broadcom/bnx2x/bnx2x.h#L855): The BCM57711 device constant is 164f and belongs to E1H. Locator: `CHIP_NUM_57711	; line 855`.
- [drivers/net/ethernet/broadcom/bnx2x/bnx2x_main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/broadcom/bnx2x/bnx2x_main.c#L263): The exact ID table entry and E1H current/fallback firmware requests are present. Locator: `PCI_VDEVICE(BROADCOM, PCI_DEVICE_ID_NX2_57711); line 263`.
- [drivers/net/ethernet/broadcom/bnx2x/bnx2x_hsi.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/broadcom/bnx2x/bnx2x_hsi.h#L3025): The pinned version constants resolve the current firmware filename to 7.13.21.0. Locator: `BCM_5710_FW_MAJOR_VERSION; line 3025`.

Scope/limit: Board partitioning, offload settings and adapter firmware remain additional context. An available bnx2x module without successfully loaded initialization firmware is not proof of an operational network interface.

### broadcom-bcm57414

Name: Broadcom BCM57414 NetXtreme-E. Candidate(s): bnxt_en.

Verified primary pair: `pci 14e4:16d7`.

- [drivers/net/ethernet/broadcom/bnxt/bnxt.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/broadcom/bnxt/bnxt.c#L168): The 16d7 ID maps to the BCM57414 board description, with separate NPAR entries. Locator: `PCI_VDEVICE(BROADCOM, 0x16d7); line 168`.
- [drivers/net/ethernet/broadcom/Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/broadcom/Kconfig#L207): The Broadcom NetXtreme-E driver configuration builds bnxt_en. Locator: `config BNXT; line 207`.

Scope/limit: Do not map every Broadcom link failure to tg3 firmware advice. Firmware/API negotiation, port partitions and the media path need the exact bnxt_en startup messages and adapter context.

### mellanox-connectx3

Name: Mellanox ConnectX-3 / MT27500 family. Candidate(s): mlx4_core, mlx4_en.

Verified primary pair: `pci 15b3:1003`.

- [drivers/net/ethernet/mellanox/mlx4/main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/mellanox/mlx4/main.c#L4304): The core PCI table labels ConnectX-3 and uses its exact identifier. Locator: `MLX_GN(PCI_DEVICE_ID_MELLANOX_CONNECTX3); line 4304`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L2297): The ConnectX-3 constant is 1003. Locator: `PCI_DEVICE_ID_MELLANOX_CONNECTX3	; line 2297`.
- [drivers/net/ethernet/mellanox/mlx4/Makefile](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/mellanox/mlx4/Makefile#L8): mlx4_en is a separate Ethernet module. Locator: `CONFIG_MLX4_EN; line 8`.

Scope/limit: Port mode, adapter firmware and cable/transceiver identity can determine whether an Ethernet interface appears. Neither this PCI pair nor a loaded RDMA module proves Ethernet carrier.

### mellanox-connectx4

Name: Mellanox ConnectX-4 family. Candidate(s): mlx5_core.

Verified primary pair: `pci 15b3:1013`.

- [drivers/net/ethernet/mellanox/mlx5/core/main.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/mellanox/mlx5/core/main.c#L2227): The core table distinguishes ConnectX-4 physical and virtual functions. Locator: `PCI_VDEVICE(MELLANOX, PCI_DEVICE_ID_MELLANOX_CONNECTX4); line 2227`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L2300): The ConnectX-4 physical-function identifier resolves to 1013. Locator: `PCI_DEVICE_ID_MELLANOX_CONNECTX4	; line 2300`.

Scope/limit: A PCI ID does not fix port count, Ethernet/InfiniBand mode or a particular maximum speed for every board. A core probe failure and a media-side link failure require different evidence.

### aquantia-aqc107

Name: Aquantia/Marvell AQC107. Candidate(s): atlantic.

Verified primary pair: `pci 1d6a:07b1`.

- [drivers/net/ethernet/aquantia/atlantic/aq_common.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/aquantia/atlantic/aq_common.h#L28): Driver-local constants establish vendor 1d6a and device 07b1 for AQC107. Locator: `AQ_DEVICE_ID_AQC107	; line 28`.
- [drivers/net/ethernet/aquantia/atlantic/aq_pci_func.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/aquantia/atlantic/aq_pci_func.c#L33): atlantic contains the exact AQC107 table entry and hardware operations mapping. Locator: `PCI_VDEVICE(AQUANTIA, AQ_DEVICE_ID_AQC107); line 33`.
- [Documentation/networking/device_drivers/ethernet/aquantia/atlantic.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/networking/device_drivers/ethernet/aquantia/atlantic.rst#L127): The guide shows firmware reporting and link-mode/current-speed distinctions. Locator: `firmware-version:; line 127`.

Scope/limit: The example output in a guide is not a benchmark or a firmware prescription for this board. Cable quality, switch negotiation and PCIe LnkSta all require actual observations.

### marvell-88e8056

Name: Marvell Yukon 88E8056. Candidate(s): sky2.

Verified primary pair: `pci 11ab:4364`.

- [drivers/net/ethernet/marvell/sky2.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/marvell/sky2.c#L122): The exact table entry is annotated as 88E8056. Locator: `0x4364; line 122`.
- [drivers/net/ethernet/marvell/Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/ethernet/marvell/Kconfig#L153): The configuration identifies the Yukon 2 sky2 driver. Locator: `config SKY2; line 153`.

Scope/limit: Older PCIe platform power behavior and the copper link are separate from IP configuration. A working interface without an address is not sufficient evidence to replace the driver.

### realtek-rtl8153-usb

Name: Realtek RTL8153 USB Ethernet family. Candidate(s): r8152.

Verified primary pair: `usb 0bda:8153`.

- [drivers/net/usb/r8152.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/usb/r8152.c#L10401): The r8152 USB table matches product 8153 and declares revision-specific firmware. Locator: `USB_DEVICE(VENDOR_ID_REALTEK, 0x8153); line 10401`.
- [include/linux/usb/r8152.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/usb/r8152.h#L25): The Realtek USB vendor constant resolves to 0bda. Locator: `VENDOR_ID_REALTEK; line 25`.
- [drivers/net/usb/Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/usb/Kconfig#L99): The config documents RTL8153 USB Ethernet and ECM fallback. Locator: `config USB_RTL8152; line 99`.

Scope/limit: A 480M USB path can constrain transfers even while Ethernet reports a gigabit link. Suspend-related USB detach/reset messages need the hub and USB power context, not just the Ethernet carrier log.

### asix-ax88179-usb

Name: ASIX AX88179 USB Ethernet. Candidate(s): ax88179_178a.

Verified primary pair: `usb 0b95:1790`.

- [drivers/net/usb/ax88179_178a.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/usb/ax88179_178a.c#L1884): The exact USB pair is qualified by vendor-specific interface ff/ff/00. Locator: `USB_DEVICE_AND_INTERFACE_INFO(0x0b95, 0x1790; line 1884`.
- [drivers/net/usb/Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/net/usb/Kconfig#L198): The ASIX configuration describes the AX88179/178A driver family. Locator: `config USB_NET_AX88179_178A; line 198`.

Scope/limit: USB resets and Ethernet link drops can have different causes. Inspect the USB tree, interface binding and ethtool output together; a controller’s gigabit description is not a throughput measurement.

### generic-pci-ahci

Name: Generic PCI AHCI SATA controller. Candidate(s): ahci.

No exact vendor/device pair is asserted. Context: 010601.

- [drivers/ata/ahci.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/ata/ahci.c#L1585): The generic PCI match is AHCI with a full 24-bit class mask. Locator: `PCI_DEVICE_CLASS(PCI_CLASS_STORAGE_SATA_AHCI; line 1585`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L25): The full AHCI class constant is 010601. Locator: `PCI_CLASS_STORAGE_SATA_AHCI; line 25`.
- [Documentation/driver-api/libata.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/libata.rst#L12): libata provides ATA transports and SCSI-to-ATA translation; a controller and its attached device are separate identities. Locator: `SCSI<->ATA translation; line 12`.

Scope/limit: The controller class does not identify Samsung, Crucial or any other attached drive. RAID/IDE firmware modes can expose different classes and drivers; this profile is not evidence that switching modes is safe.

### generic-pci-nvme

Name: Generic PCI NVMe controller. Candidate(s): nvme.

No exact vendor/device pair is asserted. Context: 010802.

- [drivers/nvme/host/pci.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/nvme/host/pci.c#L4307): The NVMe PCI table includes the full-class generic NVMe match. Locator: `PCI_DEVICE_CLASS(PCI_CLASS_STORAGE_EXPRESS; line 4307`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L27): The NVMe PCI class constant is 010802. Locator: `PCI_CLASS_STORAGE_EXPRESS; line 27`.
- [Documentation/nvme/feature-and-quirk-policy.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/nvme/feature-and-quirk-policy.rst#L63): The upstream policy distinguishes identifier-based quirks from standard features. Locator: `identifier-based quirks; line 63`.

Scope/limit: An Identify model string and a healthy namespace do not guarantee every firmware power-state transition works. Idle/resume failures, I/O resets and filesystem errors must remain separate observations.

### intel-cpt-ahci

Name: Intel CPT AHCI function (1c02). Candidate(s): ahci.

Verified primary pair: `pci 8086:1c02`.

- [drivers/ata/ahci.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/ata/ahci.c#L528): The exact Intel 1c02 entry is labelled CPT AHCI and selects the PCS quirk. Locator: `PCI_VDEVICE(INTEL, 0x1c02); line 528`.
- [Documentation/driver-api/libata.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/libata.rst#L12): libata provides ATA transports and SCSI-to-ATA translation; a controller and its attached device are separate identities. Locator: `SCSI<->ATA translation; line 12`.

Scope/limit: An ataN error identifies a libata port/device context that still needs mapping to the physical disk. A CRC/link-reset pattern must not be treated as proof of worn flash or filesystem corruption.

### amd-sb700-sb800-ahci

Name: AMD/ATI SB700/SB800 AHCI family. Candidate(s): ahci.

Verified primary pair: `pci 1002:4391`.

- [drivers/ata/ahci.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/ata/ahci.c#L996): The exact ATI 4391 entry has the SB700/800 comment and SB700 board implementation. Locator: `PCI_VDEVICE(ATI, 0x4391); line 996`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L248): The ATI vendor constant is 1002. Locator: `PCI_VENDOR_ID_ATI	; line 248`.
- [Documentation/driver-api/libata.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/libata.rst#L12): libata provides ATA transports and SCSI-to-ATA translation; a controller and its attached device are separate identities. Locator: `SCSI<->ATA translation; line 12`.

Scope/limit: Source support does not identify the installed BIOS storage mode or every SATA port’s routing. Link negotiation, drive I/O failures and filesystem recovery should be diagnosed as different layers.

### jmicron-jmb362

Name: JMicron JMB362 SATA function. Candidate(s): ahci.

Verified primary pair: `pci 197b:2362`.

- [drivers/ata/ahci.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/ata/ahci.c#L975): The exact JMicron 2362 entry selects the ignore-interface-error board variant. Locator: `PCI_VDEVICE(JMICRON, 0x2362); line 975`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L2549): The PCI constants identify the JMicron vendor and JMB362 device. Locator: `PCI_DEVICE_ID_JMICRON_JMB362; line 2549`.
- [Documentation/driver-api/libata.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/libata.rst#L12): libata provides ATA transports and SCSI-to-ATA translation; a controller and its attached device are separate identities. Locator: `SCSI<->ATA translation; line 12`.

Scope/limit: Do not combine messages from adjacent SATA/PATA functions without checking their BDFs. A legacy BIOS RAID label does not establish how Linux exposes the attached disks or any array metadata.

### silicon-image-sii3112

Name: Silicon Image SiI3112 family. Candidate(s): sata_sil.

Verified primary pair: `pci 1095:3112`.

- [drivers/ata/sata_sil.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/ata/sata_sil.c#L115): The exact CMD-vendor 3112 table entry selects sil_3112. Locator: `PCI_VDEVICE(CMD, 0x3112); line 115`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L1099): The historical CMD vendor constant is 1095. Locator: `PCI_VENDOR_ID_CMD	; line 1099`.
- [Documentation/driver-api/libata.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/libata.rst#L12): libata provides ATA transports and SCSI-to-ATA translation; a controller and its attached device are separate identities. Locator: `SCSI<->ATA translation; line 12`.

Scope/limit: A legacy controller’s source support is not a statement about modern drive-feature compatibility or measured throughput. The controller, PCI bus and each SATA link can impose independent limits.

### silicon-image-sii3132

Name: Silicon Image SiI3132. Candidate(s): sata_sil24.

Verified primary pair: `pci 1095:3132`.

- [drivers/ata/sata_sil24.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/ata/sata_sil24.c#L356): The exact 3132 entry selects BID_SIL3132 and the source describes this controller family. Locator: `PCI_VDEVICE(CMD, 0x3132); line 356`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L1099): The CMD/Silicon Image vendor constant resolves to 1095. Locator: `PCI_VENDOR_ID_CMD	; line 1099`.
- [Documentation/driver-api/libata.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/libata.rst#L12): libata provides ATA transports and SCSI-to-ATA translation; a controller and its attached device are separate identities. Locator: `SCSI<->ATA translation; line 12`.

Scope/limit: Port-multiplier or external-cable arrangements add topology beyond the PCI controller. A PCI match and a SATA link-up message do not prove every downstream disk is reachable.

### marvell-88se912x-ahci

Name: Marvell 88SE912x AHCI function (9123). Candidate(s): ahci.

Verified primary pair: `pci 1b4b:9123`.

- [drivers/ata/ahci.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/ata/ahci.c#L1443): The 9123 entry has an 88se9128 comment and full AHCI class qualification. Locator: `PCI_DEVICE(PCI_VENDOR_ID_MARVELL_EXT, 0x9123); line 1443`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L1692): The extended Marvell PCI vendor constant is 1b4b. Locator: `PCI_VENDOR_ID_MARVELL_EXT; line 1692`.
- [Documentation/driver-api/libata.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/libata.rst#L12): libata provides ATA transports and SCSI-to-ATA translation; a controller and its attached device are separate identities. Locator: `SCSI<->ATA translation; line 12`.

Scope/limit: PCIe slot sharing and downstream SATA links are different possible bottlenecks. This profile neither proves a bandwidth result nor identifies a retail SATA expansion card from the controller pair.

### asmedia-asm1061-1062

Name: ASMedia ASM1061/ASM1062 family. Candidate(s): ahci.

Verified primary pair: `pci 1b21:0612`.

- [drivers/ata/ahci.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/ata/ahci.c#L1529): The 0612 entry is annotated ASM1061/1062 and selects the 43-bit DMA variant. Locator: `PCI_VDEVICE(ASMEDIA, 0x0612); line 1529`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L2595): ASMedia vendor constant is 1b21. Locator: `PCI_VENDOR_ID_ASMEDIA; line 2595`.
- [Documentation/driver-api/libata.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/libata.rst#L12): libata provides ATA transports and SCSI-to-ATA translation; a controller and its attached device are separate identities. Locator: `SCSI<->ATA translation; line 12`.

Scope/limit: A controller’s PCIe lane path can limit aggregate transfers across SATA ports. Individual drive model and negotiated SATA speed remain separate evidence from the host-controller identity.

### via-vt6421

Name: VIA VT6421. Candidate(s): sata_via.

Verified primary pair: `pci 1106:3249`.

- [drivers/ata/sata_via.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/ata/sata_via.c#L101): The exact 3249 table entry names vt6421 and its SATA/PATA channel arrangement. Locator: `PCI_VDEVICE(VIA, 0x3249); line 101`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L1438): The VIA PCI vendor constant is 1106. Locator: `PCI_VENDOR_ID_VIA	; line 1438`.
- [Documentation/driver-api/libata.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/libata.rst#L12): libata provides ATA transports and SCSI-to-ATA translation; a controller and its attached device are separate identities. Locator: `SCSI<->ATA translation; line 12`.

Scope/limit: The shared controller can produce ATA messages for different port types. Match each ataN path to its device before applying a SATA-only interpretation to a PATA cable or drive.

### nvidia-mcp55-sata2

Name: NVIDIA MCP55 SATA function (037f). Candidate(s): sata_nv.

Verified primary pair: `pci 10de:037f`.

- [drivers/ata/sata_nv.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/ata/sata_nv.c#L378): The MCP55 SATA2 identifier is matched by sata_nv as MCP5x. Locator: `PCI_VDEVICE(NVIDIA, PCI_DEVICE_ID_NVIDIA_NFORCE_MCP55_SATA2); line 378`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L1319): The exact NVIDIA MCP55 SATA2 device constant is 037f. Locator: `PCI_DEVICE_ID_NVIDIA_NFORCE_MCP55_SATA2; line 1319`.
- [Documentation/driver-api/libata.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/libata.rst#L12): libata provides ATA transports and SCSI-to-ATA translation; a controller and its attached device are separate identities. Locator: `SCSI<->ATA translation; line 12`.

Scope/limit: Firmware storage modes and legacy RAID metadata can change what the operating system sees. This profile offers read-only identification and is not evidence that changing a boot-critical mode is safe.

### promise-pdc2037x-3376

Name: Promise PDC2037x family (3376). Candidate(s): sata_promise.

Verified primary pair: `pci 105a:3376`.

- [drivers/ata/sata_promise.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/ata/sata_promise.c#L287): The exact 3376 entry selects the PDC2037x board family. Locator: `PCI_VDEVICE(PROMISE, 0x3376); line 287`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L949): The Promise vendor constant resolves to 105a. Locator: `PCI_VENDOR_ID_PROMISE; line 949`.
- [Documentation/driver-api/libata.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/driver-api/libata.rst#L12): libata provides ATA transports and SCSI-to-ATA translation; a controller and its attached device are separate identities. Locator: `SCSI<->ATA translation; line 12`.

Scope/limit: Controller detection does not establish a complete legacy array or a safe import procedure. Keep this profile’s read-only controller identification separate from any RAID assembly or filesystem repair.

### lsi-sas2008

Name: LSI SAS2008. Candidate(s): mpt3sas.

Verified primary pair: `pci 1000:0072`.

- [drivers/scsi/mpt3sas/mpi/mpi2_cnfg.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/mpi/mpi2_cnfg.h#L542): The numeric device constant resolves MPI2_MFGPAGE_DEVID_SAS2008 to 0072; the same header defines the LSI vendor. Locator: `MPI2_MFGPAGE_DEVID_SAS2008 ; line 542`.
- [drivers/scsi/mpt3sas/mpt3sas_scsih.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/mpt3sas_scsih.c#L13870): The PCI table includes the exact MPI2_MFGPAGE_DEVID_SAS2008 physical-function entry. Locator: `MPI2_MFGPAGE_VENDORID_LSI, MPI2_MFGPAGE_DEVID_SAS2008; line 13870`.
- [drivers/scsi/mpt3sas/Makefile](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/Makefile#L3): The driver object is built as mpt3sas.o. Locator: `CONFIG_SCSI_MPT3SAS; line 3`.
- [drivers/scsi/mpt3sas/Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/Kconfig#L77): The MPT2SAS compatibility configuration selects the MPT3SAS implementation. Locator: `Legacy MPT2SAS; line 77`.

Scope/limit: OEM subsystem and resident firmware are needed before discussing a specific HBA. This profile does not recommend cross-flashing, wiping RAID metadata or assigning every SCSI timeout to the controller.

### lsi-sas3008

Name: LSI/Broadcom SAS3008. Candidate(s): mpt3sas.

Verified primary pair: `pci 1000:0097`.

- [drivers/scsi/mpt3sas/mpi/mpi2_cnfg.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/mpi/mpi2_cnfg.h#L565): The numeric device constant resolves MPI25_MFGPAGE_DEVID_SAS3008 to 0097; the same header defines the LSI vendor. Locator: `MPI25_MFGPAGE_DEVID_SAS3008 ; line 565`.
- [drivers/scsi/mpt3sas/mpt3sas_scsih.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/mpt3sas_scsih.c#L13914): The PCI table includes the exact MPI25_MFGPAGE_DEVID_SAS3008 physical-function entry. Locator: `MPI2_MFGPAGE_VENDORID_LSI, MPI25_MFGPAGE_DEVID_SAS3008; line 13914`.
- [drivers/scsi/mpt3sas/Makefile](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/Makefile#L3): The driver object is built as mpt3sas.o. Locator: `CONFIG_SCSI_MPT3SAS; line 3`.
- [drivers/scsi/mpt3sas/Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/Kconfig#L77): The MPT2SAS compatibility configuration selects the MPT3SAS implementation. Locator: `Legacy MPT2SAS; line 77`.

Scope/limit: A visible block device can be an individual disk or a firmware-presented volume, depending on configuration. The source ID does not prove drive health, redundancy or a safe firmware migration.

### broadcom-sas3416

Name: Broadcom/LSI SAS3416. Candidate(s): mpt3sas.

Verified primary pair: `pci 1000:00ac`.

- [drivers/scsi/mpt3sas/mpi/mpi2_cnfg.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/mpi/mpi2_cnfg.h#L585): The numeric device constant resolves MPI26_MFGPAGE_DEVID_SAS3416 to 00ac; the same header defines the LSI vendor. Locator: `MPI26_MFGPAGE_DEVID_SAS3416 ; line 585`.
- [drivers/scsi/mpt3sas/mpt3sas_scsih.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/mpt3sas_scsih.c#L13958): The PCI table includes the exact MPI26_MFGPAGE_DEVID_SAS3416 physical-function entry. Locator: `MPI2_MFGPAGE_VENDORID_LSI, MPI26_MFGPAGE_DEVID_SAS3416; line 13958`.
- [drivers/scsi/mpt3sas/Makefile](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/Makefile#L3): The driver object is built as mpt3sas.o. Locator: `CONFIG_SCSI_MPT3SAS; line 3`.
- [drivers/scsi/mpt3sas/Kconfig](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/mpt3sas/Kconfig#L77): The MPT2SAS compatibility configuration selects the MPT3SAS implementation. Locator: `Legacy MPT2SAS; line 77`.

Scope/limit: Interface generation does not establish the speed of every target or the layout of RAID volumes. A controller-wide reset can affect several disks without proving simultaneous independent disk failures.

### lsi-megaraid-fusion-005b

Name: LSI/Broadcom MegaRAID Fusion function (005b). Candidate(s): megaraid_sas.

Verified primary pair: `pci 1000:005b`.

- [drivers/scsi/megaraid/megaraid_sas.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/megaraid/megaraid_sas.h#L41): The Fusion device constant is 005b. Locator: `PCI_DEVICE_ID_LSI_FUSION; line 41`.
- [drivers/scsi/megaraid/megaraid_sas_base.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/megaraid/megaraid_sas_base.c#L169): The exact Fusion PCI entry and logical/physical device reporting are present. Locator: `PCI_DEVICE(PCI_VENDOR_ID_LSI_LOGIC, PCI_DEVICE_ID_LSI_FUSION); line 169`.
- [include/linux/pci_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/linux/pci_ids.h#L204): The LSI Logic PCI vendor constant is 1000. Locator: `PCI_VENDOR_ID_LSI_LOGIC; line 204`.

Scope/limit: lsblk alone is insufficient for a full RAID inventory. Controller firmware, cache state and member health need appropriate read-only controller evidence; this profile does not offer array creation, initialization or repair commands.

### adaptec-aac-0285-family

Name: Adaptec AAC RAID family (0285). Candidate(s): aacraid.

Verified primary pair: `pci 9005:0285`.

- [drivers/scsi/aacraid/linit.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/scsi/aacraid/linit.c#L144): The broad 9005:0285 catch-all coexists with many subsystem-specific board entries. Locator: `{ 0x9005, 0x0285, PCI_ANY_ID, PCI_ANY_ID; line 144`.
- [Documentation/scsi/aacraid.rst](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/Documentation/scsi/aacraid.rst#L21): The card list shows multiple subsystem-specific boards sharing the same primary pair. Locator: `9005:0285:9005:0285; line 21`.

Scope/limit: Do not collapse this shared PCI pair into a modern SATA-only card profile. Array health and firmware behavior need the actual board context; reading generic block-device inventory cannot establish redundancy.

### virtio-block-context

Name: Virtio block device context. Candidate(s): virtio_blk.

No exact vendor/device pair is asserted. Context: virtio block driver/protocol.

- [drivers/block/virtio_blk.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/block/virtio_blk.c#L1658): The virtio block device table matches VIRTIO_ID_BLOCK independently of PCI vendor/device pairs. Locator: `{ VIRTIO_ID_BLOCK, VIRTIO_DEV_ANY_ID }; line 1658`.
- [include/uapi/linux/virtio_ids.h](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/include/uapi/linux/virtio_ids.h#L33): The virtio block protocol/device identifier is defined by the upstream header. Locator: `VIRTIO_ID_BLOCK; line 33`.
- [drivers/virtio/virtio_pci_common.c](https://github.com/torvalds/linux/blob/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0/drivers/virtio/virtio_pci_common.c#L683): The PCI transport is implemented separately from the block driver. Locator: `virtio_pci_probe; line 683`.

Scope/limit: The guest cannot deduce host cable errors, SSD firmware or array member health from a virtio block ID. Guest I/O delays can originate in scheduling, quotas or the backing storage and need host evidence.

## Inspected source hashes

SHA-256 hashes below identify the retrieved text used during this review. They are evidence bookkeeping, not browser payload or imported ID tables.

| Pinned source path | SHA-256 |
| --- | --- |
| `Documentation/driver-api/libata.rst` | `be626e4354f8b1b8af864f14297920b4eac7966d735806ff0b91ec4bc5f9380e` |
| `Documentation/networking/device_drivers/ethernet/aquantia/atlantic.rst` | `7f42ce6ed3e58312716bd1936e982fbfcc4123c00d30dc88c973dda37b587f4f` |
| `Documentation/networking/device_drivers/ethernet/intel/e1000.rst` | `4c6c9ddac0413101dadbcda65c424f63a4d44d1335bd45dd202259bab2cf3313` |
| `Documentation/networking/device_drivers/ethernet/intel/e1000e.rst` | `f4a315f302bd22f9b89b2cfad4b90fdc1eab94fa77b77ba5e5a4048e29ac862f` |
| `Documentation/networking/device_drivers/ethernet/intel/i40e.rst` | `4dba6885bd7d89a0e4c4c2ca9093fd77a15e09919746fdc101a55550c4fdcdab` |
| `Documentation/networking/device_drivers/ethernet/intel/ice.rst` | `76c329506c0c172fedcce188d6c69c15d7a2ddd3d5ba5d3a8d905b5230fbe018` |
| `Documentation/networking/device_drivers/ethernet/intel/igb.rst` | `a3817252be049b385e64e7a19c6bc6ba174251311912437e8e8fde2b0108ed1b` |
| `Documentation/networking/device_drivers/ethernet/intel/ixgbe.rst` | `22be7a2631ec86a3d3799527d1e2a2225ce9ea10f74e8efde6fb5812758da1fb` |
| `Documentation/nvme/feature-and-quirk-policy.rst` | `b2d6f77ab7670f81fc6dfd5b63512e9b47b7595cac79b45b24efb0524dd06410` |
| `Documentation/scsi/aacraid.rst` | `16f1852b0c068a97e640a5ef58ce6453bf515adb54ad9c6bfefd62463fd11c16` |
| `drivers/ata/ahci.c` | `bd0a2a7faf387e0f26ca1b936dee7a032b137dd353c3b91e80f4d01532bee444` |
| `drivers/ata/sata_nv.c` | `d58298100511d549f4a605bf670b80101b7ab86c265a2acb29ca9c2410974bf4` |
| `drivers/ata/sata_promise.c` | `361425284f3c6319058ca64a60d6946dfe2f62174a8878b318624d512856ebfd` |
| `drivers/ata/sata_sil.c` | `0212a96e7a11466c28d1c655bb93e6698708d3982a25437e27ce45fef191b120` |
| `drivers/ata/sata_sil24.c` | `cfeb4683b66fe9232ad483247e1a68ab778fba863213f8b2fbb49e4e8a3dda19` |
| `drivers/ata/sata_via.c` | `4e727db472668f5dda11557dbc284bdb125f2f8790a77c7334c58dda52c9286a` |
| `drivers/block/virtio_blk.c` | `fa72f3e6497faf05f38ea57c1018a0add48e81f739351e5173693891ef611be9` |
| `drivers/net/ethernet/aquantia/atlantic/aq_common.h` | `15611f4b753bc82bcb095800b0e7507b4b3e834481ced4f6d875c631fdebb9a6` |
| `drivers/net/ethernet/aquantia/atlantic/aq_pci_func.c` | `8f86c033291d66034d354f8838a28471c526a58646baba636357f7c4a4b3fb99` |
| `drivers/net/ethernet/broadcom/Kconfig` | `54b758a1b72dfaf5cb04e397b4100b094e52e3a12ac0d64cbba681b05b3c7d49` |
| `drivers/net/ethernet/broadcom/bnx2x/bnx2x.h` | `e0ea6da141a183b4de1a0f5acbe757f81864309e81c327718fc3dd24aa94e2f7` |
| `drivers/net/ethernet/broadcom/bnx2x/bnx2x_hsi.h` | `2971f91c45592ae52f8d707acbf21e63a4557f406ac21974ac449859ee718b9a` |
| `drivers/net/ethernet/broadcom/bnx2x/bnx2x_main.c` | `92604f9c4eeebf3af32737021938c2d7443a3328d33b012f2073e096883285c3` |
| `drivers/net/ethernet/broadcom/bnxt/bnxt.c` | `b86a2a37d30049db234527c9176f11d8a7d8b8e38981c900494201338a7c6f84` |
| `drivers/net/ethernet/broadcom/tg3.c` | `a794b7d4616c9e919ff8577d3975532c7661fe7a304e8d4d888ec2eb2089a38e` |
| `drivers/net/ethernet/broadcom/tg3.h` | `898d1c54fe7b63c197a95f7b830ac92e315b41f15f1b8955e7c7e29710aaa460` |
| `drivers/net/ethernet/intel/e1000/e1000_hw.h` | `e3c8b99f42b640c98560341017474978ca0c23452dc0754eb63fc67009380ea3` |
| `drivers/net/ethernet/intel/e1000/e1000_main.c` | `c4d30549844a5476fa5a91f5a14267d597c909b10d927361b1fefd8b1f8a06c2` |
| `drivers/net/ethernet/intel/e1000e/hw.h` | `f6eb7a08efd4b1dfa760fb8945c0e4d4fc9fc9af84b543129ab499115af7b4d0` |
| `drivers/net/ethernet/intel/e1000e/netdev.c` | `771cc6e1d44d40d3cd6204ba4800c3289e145ea4ca97455f341007c3aaf76827` |
| `drivers/net/ethernet/intel/i40e/i40e_devids.h` | `cc07c67a12d8a582b62e4b756021fe7d31115a3d4f782989e5ed029b9a842ae6` |
| `drivers/net/ethernet/intel/i40e/i40e_main.c` | `a5f3d34b7640e147966505dda6f4457e5e1e65244aa4a19313e9a7bbf6181c33` |
| `drivers/net/ethernet/intel/ice/ice_devids.h` | `eda52e9c506e16e5e8af0618d79b69438e54709221b2b88dbfdf5e15270ff332` |
| `drivers/net/ethernet/intel/ice/ice_main.c` | `5e885ef6477f848b10090f4c6fa597a32bde1e572a8486d35df8f97a257ae625` |
| `drivers/net/ethernet/intel/igb/e1000_hw.h` | `addee814ac22664a4eeacbfd37ae3ab86d2575e91f59fd25332f81e0a9e1d43c` |
| `drivers/net/ethernet/intel/igb/igb_main.c` | `b8833f12c4cd1d4059170a36621c938bb826a14a9faa50f432a778b7e833b7ea` |
| `drivers/net/ethernet/intel/igc/igc_hw.h` | `e491d7dc4d1cf9017510484c262f266837a30d833998a0e0e27ed8be3fddb7e5` |
| `drivers/net/ethernet/intel/igc/igc_main.c` | `37b2b92b39c7acb09ae1702cfb975c2f76e35192db1165612584fe4aa5d909cd` |
| `drivers/net/ethernet/intel/ixgbe/ixgbe_main.c` | `073b11bd2fbb69a0b0e11d294b33ae6147d8e78770c85242038662541d5edf66` |
| `drivers/net/ethernet/intel/ixgbe/ixgbe_type.h` | `014e392a1bdc1076a7d1535cf7e6124b5b91a9ae725083af1b0dcb711d5ffdba` |
| `drivers/net/ethernet/marvell/Kconfig` | `cd44f755cd968806c9d6f47995244c0b5a593fb1b8375cc41afbea6a9c87c011` |
| `drivers/net/ethernet/marvell/sky2.c` | `b439173f6e84880af9eecd86146e62b696ccf4f16bca8ce8a766b174b12523db` |
| `drivers/net/ethernet/mellanox/mlx4/Makefile` | `591013a5eb5360bc5f3dcd9b4ecfad62bd3d7c17b53ae7e9606a4b56aabaafa3` |
| `drivers/net/ethernet/mellanox/mlx4/main.c` | `e8c0f2fef63b62f430b87c728138adafd138110313f777035c8beff9d525942a` |
| `drivers/net/ethernet/mellanox/mlx5/core/main.c` | `7de0b4bec9e84350d419e7ce93399fcdf909b0c787450ac75d4f038596c55a3e` |
| `drivers/net/ethernet/realtek/Kconfig` | `d5c8d10202baa2964fcf0d8c93f766123e1298a07b83c2d2e9f78bce8f092115` |
| `drivers/net/ethernet/realtek/r8169_firmware.c` | `24f9397bab187dbdcf20918e86740081e2c44934b0427ca7902fa7ac773fa1b9` |
| `drivers/net/ethernet/realtek/r8169_main.c` | `318a06c27e43a1da82db01a3ff203a09f2d1790d2ffd1852833a1777568b284c` |
| `drivers/net/usb/Kconfig` | `70d5c60c8c2dc9eb62ee0358b82f8f1f4d081c4f55025ee307d8e179fc18e899` |
| `drivers/net/usb/ax88179_178a.c` | `fa49b818e1051cf13e765792a8a386aa828e4ac9bd516f16c2b134c6edf6a6c8` |
| `drivers/net/usb/r8152.c` | `9d766f203c7fdabe6449e8dd2b9e5dd4fccfa20a62aa5dbf00d64c0c475c5a9f` |
| `drivers/nvme/host/pci.c` | `bacc1c60ed7159a67bc2c530cad1fe0c69b8c9fbee6bddd56469df0bab6e6e9d` |
| `drivers/scsi/aacraid/linit.c` | `d6a56db00957358b8ec94f2db28f86bcd3ea730f5891b1be4695be6bd05c2990` |
| `drivers/scsi/megaraid/megaraid_sas.h` | `a81db66e7394f197e37ccc9de3be2412481b6335b5942a7f3749475f6c3882c1` |
| `drivers/scsi/megaraid/megaraid_sas_base.c` | `4f72954a12d0be3359c5550adfef310e6c7c9e8aecd80a23d23ab07cc8af6d99` |
| `drivers/scsi/mpt3sas/Kconfig` | `dca5110022b96c24f069a4fd3d148fbe81ed6fb93dd8549c9a8d8539398efd0d` |
| `drivers/scsi/mpt3sas/Makefile` | `ece2343290e886fabbcc267b21c9d3e6fc0086319159084b57f0564686b5f1d2` |
| `drivers/scsi/mpt3sas/mpi/mpi2_cnfg.h` | `4e184f79f5691b72b3f421cb0a486a6b0d91049c0f429d4ff1366b17aab10321` |
| `drivers/scsi/mpt3sas/mpt3sas_scsih.c` | `939e85a516d30081ca0dedbd27d781d004a0f95150ba1cddb867c0e4bbc2464d` |
| `drivers/virtio/virtio_pci_common.c` | `de48d1c1c37bcc062624c400489bf91917f4c1740806034ccedd1eb48e712ec7` |
| `include/linux/pci_ids.h` | `020fac001871c0f8441c1294f787231fb6cfbf2c55915ca8f918262e2db4487c` |
| `include/linux/usb/r8152.h` | `2d171ccd1779082dfcb4e2663e0127844acd1d67b0358ef1ed2eadb6510f06e0` |
| `include/uapi/linux/virtio_ids.h` | `1e93d93cec19c79ee1ab77b377cafda051dd9f4ae9920523c5c39ad5ec16bb26` |

No working-tree files outside the owned JSON and this companion document were authored by this research task. Upstream source downloads and the reproducible authoring helper stay in scratch.
