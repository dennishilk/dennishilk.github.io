# Hardware search intent — editorial review, 2026-10-10

The catalog is organized around identity, binding, firmware and failed layers.
Searches were checked against upstream documentation and distribution support
topics. The intents below are editorial inferences from those sources, not
measured search volumes, ranking promises or device compatibility ratings.

| Likely question | Evidence and relevant intent | Implemented entry |
| --- | --- | --- |
| Which Linux driver handles this PCI or USB ID? | The [pciutils manual](https://manpages.debian.org/trixie/pciutils/lspci.8.en.html) distinguishes numeric identity, current driver and possible modules. | Numeric matching, subsystem/class qualifiers, six result sections |
| Why is an Intel Wi-Fi adapter detected but unusable? | [iwlwifi Bugs and support](https://wireless.docs.kernel.org/en/latest/en/users/drivers/iwlwifi/debugging.html) separates firmware crashes, version evidence and debugging records. | AX200/7265 and other family profiles; Wi-Fi, firmware and rfkill workflows |
| What does an AMD GPU initialization or firmware error mean? | [AMDGPU display debugging](https://docs.kernel.org/gpu/amdgpu/display/dc-debug.html) describes successive driver components and kernel-log evidence. | AMD profiles; binding, firmware and initialization paths into Fix Lab |
| Is a NVIDIA kernel module the same thing as the complete graphics stack? | The [NVIDIA module guide](https://docs.nvidia.com/datacenter/tesla/driver-installation-guide/kernel-modules.html) documents separate module components and distribution packaging. | Source-backed NVIDIA identities, driver-stack knowledge and module checks |
| Is a detected USB device operational? | The [usbutils manual](https://manpages.debian.org/trixie/usbutils/lsusb.8.en.html) documents device and interface descriptor inspection. | Composite-interface parsing; USB, Bluetooth, audio and input profiles |
| Does a class match identify a retail model? | Pinned Linux PCI/USB tables, virtio function IDs and HDA codec tables expose different identity layers. | Explicit generic profiles; ambiguous-context labels and source links |

Queries used: `amdgpu firmware loading initialization`, `iwlwifi firmware
debugging`, `Linux driver secure boot module loading`, `PCIe link speed hardware
troubleshooting`, together with official-source domain restrictions. Coverage of
the search engines was uneven. Unrelated results were discarded; one Fedora
support result was rate-limited on opening and was not used as technical
evidence. Driver advice comes from the inspected primary sources recorded in
the catalog, not from an unverified search snippet.

Each device page has its own reviewed identity boundaries, firmware explanation,
passive checkpoints and related guides. Titles describe the actual family or
class. There are no minimum-kernel guesses, star ratings, fabricated test
results, popularity counts or forced exact-model names.
