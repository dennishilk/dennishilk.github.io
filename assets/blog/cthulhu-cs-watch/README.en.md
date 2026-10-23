# cthulhu-cs-watch.py — my capture on 23 October 2026

I used this tool on Cthulhu with Arch Linux, kernel 7.2.11-arch1-1 and an RX 9060 XT to locate ENOENT in a rejected GPU submission. It is a diagnostic tool for the inspected kernel version, not a game fix.

## Unchanged source and validation status

The Python file is the unchanged version supplied for this investigation. SHA-256: `a14217220cb3e78616d9002f13be108581ef02c6f098d1b4b4b3d273ae59bfad`. A separate hash of the copy on my machine was not recorded. Its header was written before the first live capture and therefore still describes registration as untested. I have since successfully registered the probes on Cthulhu. The capture documented in the article reports zero missed probes, zero buffer losses and clean removal. This validates that run on that machine. Eight earlier local tests simulate Tracefs; they do not validate another kernel or machine.

## What I ran

After saving and reading the source in my home directory, I first checked prerequisites:

```sh
sudo python3 -B "$HOME/cthulhu-cs-watch.py" --check
```

This check reads prerequisites; it creates neither probes nor a capture file. After it succeeded, I armed the time-limited capture:

```sh
sudo python3 -B "$HOME/cthulhu-cs-watch.py" --arm
```

I kept the terminal open during ordinary use. Ctrl+C stops the capture, and the default timeout is 30 minutes. The tool exclusively creates a mode-0600 log in the invoking sudo user's home directory; its output identifies the actual filename. It installs no packages, mounts no Tracefs and changes no game settings or boot configuration.

## The three probes

| Key | Function | Recorded |
|---|---|---|
| bo | amdgpu_bo_list_create | Only returns of `-2` |
| sync | drm_syncobj_find_fence | Only returns of `-2` |
| cs | amdgpu_cs_ioctl | Only returns of `-2` |

I use kretprobes with MAXACTIVE 256, signed 32-bit return values, a unique dynamic group and a private trace instance with the `mono` clock and a 64 KiB per-CPU buffer. The tool also records native task identity and probe/buffer statistics. It does not reset the global tracer or unrelated probes. Only `--arm` writes to Tracefs; this is real temporary instrumentation that can affect timing.

## Limits

Capture is system-wide; probe hits do not exclusively count game calls. Native Linux PIDs and Wine IDs are different identifiers. The Wine and Tracefs numbers in my capture are not a shared timeline without calibration. Other error codes are outside the fixed `-2` filter.

The tool does not identify the missing GEM handle, a D3D12 resource, GPU address, Release sequence or GPU instruction position. It does not establish a common cause with my 21 October GPUVM fault. Ordinary termination and SIGINT/SIGTERM/SIGHUP attempt to remove only this capture's objects. SIGKILL and a complete hardlock prevent cleanup; reboot discards the volatile probes. Cleanup errors must be included in the analysis. An empty capture does not prove stability.

This version is restricted to the 7.2.11 release family and checks symbols, module assignments and return-value format. A locally patched kernel can differ despite a matching release string. I have not validated this tool for other kernel versions.

## Primary sources

- [Kernel: kprobe/kretprobe, return values, filtering and probe statistics](https://docs.kernel.org/trace/kprobetrace.html)
- [Kernel: private trace instances](https://docs.kernel.org/trace/ftrace.html#instances)
- [Linux 7.2.11: BO-list construction](https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/amd/amdgpu/amdgpu_bo_list.c)
- [Linux 7.2.11: CS submission](https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/amd/amdgpu/amdgpu_cs.c)
- [Linux 7.2.11: syncobj fence lookup](https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/drm_syncobj.c)
