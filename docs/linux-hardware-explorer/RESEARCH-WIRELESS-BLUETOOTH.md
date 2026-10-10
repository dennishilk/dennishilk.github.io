# Wireless and Bluetooth evidence review

Reviewed 2026-10-10. Scope: **28 Wi-Fi + 12 Bluetooth profiles**, comprising **34 numeric-ID profiles** and **6 explicitly generic transport/class contexts**. Source review only: no hardware tests, support scores, minimum kernel versions, distribution package advice or automatic driver changes.

All Linux source URLs in the JSON are pinned to [torvalds/linux `3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0`](https://github.com/torvalds/linux/tree/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0). The corresponding raw files were retrieved successfully over HTTPS and the relevant table, selector, firmware declaration or loader was checked. 75 distinct pinned Linux files and 3 additional primary documentation resources are referenced. Source links with line anchors refer to this same immutable snapshot.

The JSON is original bilingual editorial prose with a small curated identifier set, not a copied hardware database. Source table membership creates a **driver/family candidate**. Runtime binding, installed module presence, firmware loading, a registered wireless/controller interface, successful association and application functionality remain separate evidence.

## Coverage and interpretation

- Intel Wi-Fi: 7265 revision differences; 8265/8275 subsystem naming; 9260 RF selection; discrete AX200 and AX210; a constrained BE200-class interpretation.
- Realtek Wi-Fi: older rtlwifi PCIe, rtw88 PCIe and USB, rtw89 B/C firmware-format branches. Makefiles establish names such as `rtw88_8821ce`, rather than deriving module names from C filenames.
- Atheros/Qualcomm Wi-Fi: register-driven ath9k, firmware-driven ath9k_htc USB, ath10k board data, ath11k hardware revisions and the snapshot’s ath12k Wi-Fi 7 device/core split.
- MediaTek Wi-Fi: MT7601U, MT76x2 USB, MT7921 PCIe/USB, MT7922 through mt7921e and MT7925. Shared module names do not establish chip identity.
- Broadcom Wi-Fi: BCMA + brcmsmac versus bus-specific brcmfmac FullMAC. NVRAM/CLM selection and optional requests are kept separate from essential firmware.
- Bluetooth: generic USB HCI class; Intel, Realtek, MediaTek and Broadcom USB setup; two Atheros loading stages; H4/H5/QCA/Broadcom UART contexts; generic SDIO context. UART and SDIO contexts have no invented PCI/USB IDs.

Important selectors preserved:

1. The curated Intel 7265 match includes **subdevice 5010**; 8265/8275 includes **subdevice 0010**. The source macro accepts any subvendor, so none is invented. Other source-table subsystem combinations are outside these numeric matches.
2. BE200-class name resolution requires RF type and discrete-device selectors beyond `8086:272b`. Those conditions appear in identity/limitations; an OEM or unique marketed card is never inferred.
3. `17cb:1109` is QCN9274; `17cb:1107` is WCN7850. In this snapshot the reviewed Wi-Fi 7 device module is **ath12k_wifi7**, with a shared ath12k core. An installed older kernel can legitimately differ.
4. `14e4:4727` binds a BCMA PCI host; brcmsmac matches BCMA wireless-core revisions. The driver notes do not present brcmsmac as a direct PCI binding.
5. `0cf3:3004` is the checked AR3012 loader route. `0cf3:e300` is a QCA ROME route and was excluded rather than mislabeled AR3012.
6. USB ff/ff/ff interface selectors remain explicit limitations for the selected Realtek/MediaTek Wi-Fi routes. The Bluetooth standard class context retains the complete **e0:01:01** triplet; it is not an exact product match.
7. Realtek 8761B UART and 8761BU USB firmware branches are distinct. The USB product table does not replace btrtl’s LMP/HCI revision checks.

## Per-profile evidence and uncertainty

Every profile contains at least two actually checked primary resources. The table below records the short per-profile provenance; full pinned URLs, claims and locators are in `content/linux-hardware-explorer/research/wireless-bluetooth.json`.

| Profile ID | Curated match | Evidence checked and uncertainty |
|---|---|---|
| `wifi-intel-7265` | `8086:095a/subdevice 5010` | pcie/drv.c: 095A/5010 PCI entry and DEVICE(095A) family names; cfg/7000.c: both prefixes and different API bounds. Curated subdevice avoids treating all 095A combinations as equally covered. |
| `wifi-intel-8265` | `8086:24fd/subdevice 0010` | pcie/drv.c: 24FD/0010 entry; DEVICE(24FD) default 8265 and subsystem-specific 8275/Killer selections. cfg/8000.c supplies 8265 firmware prefix. |
| `wifi-intel-9260` | `8086:2526` | pcie/drv.c:2526 -> iwl9000_mac_cfg; cfg/9000.c:9260 firmware prefix; RF_TYPE(JF2) name resolution is not reduced to PCI pair. |
| `wifi-intel-ax200` | `8086:2723` | pcie/drv.c:2723 -> iwl_ax200_mac_cfg and DEVICE(2723) -> iwl_ax200_name; cfg/22000.c:cc-a0 prefix; cfg/rf-hr.c name. Firmware pattern is an example branch, not a present-file assertion. |
| `wifi-intel-ax210` | `8086:2725` | pcie/drv.c:2725 -> iwl_ty_mac_cfg and DEVICE(2725) -> iwl_ax210_name; cfg/ax210.c supplies ty-a0-gf-a0; cfg/rf-gf.c supplies AX210 name and UHB field. |
| `wifi-intel-be200` | `8086:272b` | pcie/drv.c:272b GL entry; DEVICE(272B),RF_TYPE(FM),DISCRETE name selection; cfg/bz.c GL/FM prefixes and cfg/rf-fm.c BE200 name. No minimum-version claim. |
| `wifi-realtek-rtl8723be` | `10ec:b723` | sw.c:RTL_PCI_DEVICE REALTEK/B723; primary/alt firmware names and MODULE_FIRMWARE. Original prose makes no antenna-workaround recommendation. |
| `wifi-realtek-rtl8821ce` | `10ec:c821` | rtw8821ce.c:REALTEK/C821 -> rtw8821c_hw_spec; rtw8821c.c:fw_name; rtw88 Makefile:rtw88_8821ce.o. |
| `wifi-realtek-rtl8822ce` | `10ec:c822` | rtw8822ce.c:C822 -> rtw8822c_hw_spec; chip normal/wow names checked; rtw88 Makefile establishes underscore module name. |
| `wifi-realtek-rtl8852be` | `10ec:b852` | rtw8852be.c:B852; rtw8852b.c:FW_BASENAME/FORMAT_MAX; core.h:RTW89_GEN_MODULE_FWNAME format suffix; Makefile module. |
| `wifi-realtek-rtl8852ce` | `10ec:c852` | rtw8852ce.c:C852; rtw8852c.c:C basename/format2; core.h filename generation; Makefile module. |
| `wifi-realtek-rtl8822bu` | `0bda:b812` | rtw8822bu.c:REALTEK/B812 with ff/ff/ff; usb.h confirms vendor0bda; rtw8822b.c firmware; Makefile module. |
| `wifi-atheros-ath9k-002b` | `168c:002b` | pci.c contains ATHEROS/002B; Kconfig identifies ath9k PCI/PCIe path. Naming remains family+ID because a broad pair must not imply a retail product. |
| `wifi-atheros-ar9271-usb` | `0cf3:9271` | hif_usb.c 0cf3:9271 and firmware loader; hif_usb.h htc_9271 version constants and old fallback. No retail model is inferred. |
| `wifi-qualcomm-qca6174` | `168c:003e` | pci.c PCI_VDEVICE(ATHEROS,QCA6174_2_1_DEVICE_ID); hw.h resolves003e and firmware dirs; PCI implementation separately validates chip revision. |
| `wifi-qualcomm-qca6390` | `17cb:1101` | pci.c QCA6390_DEVICE_ID1101 + QCOM macro, supported SoC revision checks; core.c QCA6390/hw2.0 directory. |
| `wifi-qualcomm-wcn6855` | `17cb:1103` | pci.c WCN6855_DEVICE_ID1103; runtime distinguishes hw2.0/hw2.1; core.c maps both directories. Board marketing aliases deliberately omitted. |
| `wifi-qualcomm-qcn9274` | `17cb:1109` | wifi7/pci.c QCN9274_DEVICE_ID1109, separate WCN7850_DEVICE_ID1107; wifi7/hw.c hw1.0/hw2.0 directories; wifi7/Makefile ath12k_wifi7.o. |
| `wifi-mediatek-mt7601u` | `148f:7601` | usb.c148f:7601 + ASIC7601 check; mcu.c ordered firmware path array; usb.h MT7601U_FIRMWARE. |
| `wifi-mediatek-mt7612u` | `0e8d:7612` | mt76x2/usb.c0e8d7612; mt76x2.h mt7662.bin and rom_patch constants; usb_mcu.c requests both. No adapter brand copied into profile name. |
| `wifi-mediatek-mt7921-pcie` | `14c3:7961` | pci.c14c3:7961->MT7921_FIRMWARE_WM; mt792x.h defines RAM and patch paths; PCI vendor macro verified. |
| `wifi-mediatek-mt7922-pcie` | `14c3:0616` | pci.c14c3:0616 -> MT7922_FIRMWARE_WM; mt792x.h MT7922-specific RAM/patch names. Marketing aliases deliberately not inferred. |
| `wifi-mediatek-mt7925-pcie` | `14c3:7925` | mt7925/pci.c14c3:7925 -> MT7925_FIRMWARE_WM; mt792x.h named mt7925 directory and patch; no minimum-release claim. |
| `wifi-mediatek-mt7921-usb` | `0e8d:7961` | mt7921/usb.c0e8d:7961+ff/ff/ff -> MT7921_FIRMWARE_WM; mt792x.h firmware names; separate USB transport. |
| `wifi-broadcom-bcm4313` | `14e4:4727` | bcma/host_pci.c14e4:4727; brcm_hw_ids.h BCM4313_D11N2G_ID; brcmsmac/mac80211_if.c BCMA core table and both firmware names. Driver evidence labels reflect indirect binding. |
| `wifi-broadcom-bcm43602` | `14e4:43ba` | pcie.c BCM43602 table/mapping and BIN/NVRAM items; brcm_hw_ids.h43ba; firmware.h constructs brcm path. Optional/platform NVRAM remains conditional. |
| `wifi-broadcom-bcm4356` | `14e4:43ec` | pcie.c table4356 and BRCMF_FW_CLM_DEF; brcm_hw_ids.h43ec; firmware.h .bin/.clm_blob declarations. NVRAM path varies by board. |
| `wifi-broadcom-bcm43236-usb` | `0a5c:bd17` | usb.c BRCM_USB_43236_DEVICE_ID + revision bitmap8 ->43236B; brcm_hw_ids.h0a5c/bd17; firmware.h source-backed brcm prefix/.bin. |
| `bluetooth-usb-hci-class` | `context only` | btusb.c USB_INTERFACE_INFO(e0,01,01); Kconfig USB transport with optional vendor helpers. Empty numeric IDs and class evidence are intentional. |
| `bluetooth-intel-usb-0032` | `8087:0032` | btusb.c8087:0032 combined Intel flag; btintel.c controller-version filename builders. No AX210/AX211 product inference from the USB pair. |
| `bluetooth-realtek-rtl8761bu-usb` | `0bda:8771` | btusb.c0bda8771 Realtek8761BUV group; btrtl.c IC_INFO LMP/revision/HCI_USB and config_needed=false. The B UART filename is deliberately excluded. |
| `bluetooth-mediatek-usb-0608` | `0e8d:0608` | btusb.c0e8d0608 MediaTek flag; btmtk.c name constructor and controller-reading setup. No unverified MT7921/RZ608 retail identification. |
| `bluetooth-broadcom-bcm20702b0-usb` | `19ff:0239` | btusb.c19ff0239 explicit BCM20702B0 comment. btbcm.c dynamically chooses hardware name, product postfix and board suffix. Pattern deliberately does not assert a specific VID/PID HCD exists. |
| `bluetooth-atheros-ar3011-loader` | `0cf3:3000` | ath3k.c0cf33000 AR3011 and ATH3K_FIRMWARE ath3k-1.fw; kernel Wireless ath3k docs explain re-enumeration. btusb HCI stage is context, not exact3000 binding. |
| `bluetooth-atheros-ar3012-loader` | `0cf3:3004` | ath3k.c0cf33004 AR3012 table and blist flag; snprintf ar3k/AthrBT and ramps filenames. btusb marks ATH3012; 0cf3:e300 would be QCA ROME and is deliberately not used. |
| `bluetooth-uart-h4-context` | `context only` | Kconfig H4 serial protocol; hci_h4.c framing; Makefile builds into hci_uart. No PCI/USB IDs or claim of runtime H4 selection. |
| `bluetooth-uart-h5-context` | `context only` | Kconfig three-wire; hci_h5.c sequence/link negotiation; Makefile hci_uart component. Generic context deliberately shares module with H4; protocol match is not an exact identity. |
| `bluetooth-qualcomm-uart-context` | `context only` | hci_qca.c UART+ACPI/OF matching; btqca.c version-specific patch and NVM branches; hci_qca is an hci_uart component, not a separate loadable module. Context only. |
| `bluetooth-broadcom-uart-context` | `context only` | hci_bcm.c ACPI/OF, reset/clock/power and setup; btbcm.c board HCD choices. No marketed board inference; hci_bcm is not a separate module in this snapshot. |
| `bluetooth-sdio-hci-context` | `context only` | btsdio.c SDIO_CLASS_BT_A/BT_B; Kconfig generic vs Marvell/MediaTek SDIO alternatives. bus=class because contract has no SDIO numeric bus; context only. |

## Firmware treatment

The patterns are short source-backed names or examples of documented construction. A wildcard is not an exhaustive list or proof a file exists locally. Dynamic Bluetooth naming deliberately retains unknown exact filenames where USB identity alone cannot resolve controller/ROM/board versions.

- Intel Wi-Fi patterns come from the relevant MAC-generation declarations; actual API requests must be read from the running kernel. 7265 and 7265D remain distinct branches.
- rtw89 basenames plus the `RTW89_GEN_MODULE_FWNAME` macro substantiate a format-suffix pattern, rather than promising one fixed file for every kernel.
- ath10k/11k/12k directories are tied to detected revisions; both the table and directory/root macros were checked. Board data is not chosen from marketing labels.
- MT76x2 requests RAM firmware and ROM patch separately; MT7601U’s prefixed/unprefixed filenames are search alternatives, not two required files.
- brcmfmac `.txt` NVRAM and `.clm_blob` examples can be optional/platform-dependent. The essential `.bin` request and the actual loader result remain separate.
- ath9k PCIe is `none-documented`: no host firmware filename is established for the reviewed register-driven path. This does **not** assert that the hardware has no onboard code or calibration.
- Bluetooth HCI framing classes cannot establish firmware filenames. Vendor-specific patterns are examples backed by helper naming/requests and still require initialization evidence.

## Diagnostics and Fix Lab links

All checkpoints are read-only. PCI: `lspci -nnk -s BDF`; USB: `lsusb -t`; firmware metadata: `modinfo -F firmware MODULE`; existing association: `iw dev INTERFACE link`; Bluetooth visibility: `bluetoothctl list`; serial/SDIO parent: `readlink -f /sys/class/bluetooth/CONTROLLER/device`; initialization: `journalctl -k -b --no-pager`. Placeholder and privilege explanations are localized in every checkpoint. No scan, attachment, pairing, module loading, power change, unbind, restart or firmware upload command is proposed. Journal visibility depends on permissions; an unreadable journal does not prove absence of errors.

Cross-links were checked against current Fix Lab problem IDs: `network-wifi-rfkill`, `network-wifi-firmware-missing`, `network-wifi-authentication`, `audio-bluetooth-headset-profile`. The non-firmware ath9k profile omits the missing-firmware link. Bluetooth audio links are optional follow-on diagnostics and do not imply every USB/UART initialization failure is an audio-profile issue.

## Verification and release limits

The authoring validation checked 40 unique IDs, bilingual required fields, numeric identifier syntax, two or more checkpoints, primary-source counts, immutable Linux code references, locally retrieved source files and existing Fix Lab target IDs. All passed. Module build names were checked where filename-to-module conversion could be misleading.

This curated scope does not cover arbitrary PCI/USB hardware, every subsystem/revision, USB rebrands, vendor-specific Bluetooth SDIO implementations or every ACPI/device-tree controller. Exact recognition can therefore remain unknown. No commands were executed on Dennis’s hardware and no compatibility/performance claims were inferred from the source table.

Only the assigned research JSON and this document were authored in the repository. Publication, sitemap activation, live navigation changes and Git pushes remain outside this research task.
