# Meine Cthulhu-Messwerkzeuge vom 23. Oktober 2026

Ich habe die Werkzeuge schrittweise eingesetzt, um den reproduzierbaren S.T.A.L.K.E.R.-Reload-Absturz genauer einzugrenzen. Ich bewahre jede bereitgestellte Skriptversion unverändert auf. Sie sind auf x86_64 Linux 7.2.11 und die im Quelltext geprüften Builds begrenzt; Instrumentierung kann Timing verändern.

| Datei | Gemessen bzw. vorbereitet | Tatsächlicher Status dieses Tages |
|---|---|---|
| [cthulhu-cs-watch.py](../cthulhu-cs-watch/cthulhu-cs-watch.py) | Drei Kernel-Rückkehrproben für BO-Liste, Syncobj und CS | Live benutzt; ENOENT auf BO-/CS-Pfad, kein erfasstes Syncobj-ENOENT |
| [cthulhu-gem-watch.py](cthulhu-gem-watch.py) | Sieben Kernel-Proben für Handles und Dateikontext | Live benutzt; Handle 7558, letzter Close 3,643 ms vor NULL-Lookup |
| [cthulhu-gem-stack-watch.py](cthulhu-gem-stack-watch.py) | Sieben Kernel-Proben, zwei private Instanzen und begrenzte native Stacks | Live benutzt; Handle 6233, letzter Close 5,227 ms vorher; spätere Symbolauflösung belegt Pool-Abbau |
| [cthulhu-pool-caller-watch.py](cthulhu-pool-caller-watch.py) | Sieben Kernel-Proben und zwei PE-Uprobes, eine private Instanz | Registrierung erfolgreich; zwei Live-Aufnahmen, aber beide PE-Proben jeweils ohne Treffer |
| [cthulhu-native-pool-watch.py](cthulhu-native-pool-watch.py) | Sieben Kernel-Proben und zwei native ELF-Uprobes | 26 lokale Simulationstests; Registrierung und regulärer Kontrolllauf bestätigt: 90 Paare, 36 erfolgreiche Handle-Closes |

## Mein Ablauf und abgeschlossene Abdeckungsprüfung

Ich starte den Sammler immer vor dem Vollbildspiel. Die folgenden 10–15 Minuten Shader-Kompilierung zählen zur standardmäßigen maximalen Gesamtlaufzeit von 30 Minuten. Nach dem Messende gehören Ereignisse, Zuordnung zum nativen Prozess, Proben-/Pufferstatistiken und Aufräumergebnis zusammen zur Auswertung. Die nativen Linux-IDs sind nicht die hexadezimalen Wine-IDs.

Bei den späteren Versionen habe ich vor der Messung die deaktivierte Probenregistrierung mit `--probe-check` geprüft. Für die neue native Version ist diese Prüfung inzwischen erfolgreich abgeschlossen. Danach lieferte der reguläre Kontrolllauf 90 unabhängig bestätigte native Ein-/Austrittspaare und 36 erfolgreiche Handle-Schließungen innerhalb solcher Aufrufe. Zur Reproduktion des bereits abgeschlossenen Registrierungsschritts lautete mein Befehl:

```sh
sudo python3 -B "$HOME/cthulhu-native-pool-watch.py" --probe-check
```

Dieser Modus aktiviert keine Messung, liest keinen Ereignisstrom und erzeugt keine Messdatei. Er registriert neun deaktivierte Proben, prüft Felder/Filter und entfernt seine eigenen Objekte. Ich muss dafür das Spiel nicht starten. Ein erfolgreicher Test beweist noch keine späteren Treffer oder gültigen Rücksprung-Slots. `--arm` ist der getrennte aktive Modus. Ich habe damit anschließend vor dem Vollbildspiel den Kontrolllauf gestartet und normal beendet; sein Original-Hash und die ausgewählten Befunde sind in der Faktenübersicht enthalten.

## Exakte native Messstelle und Geltungsgrenzen

V4 prüft vor Registrierung Größen, Hashes und Maschinenbytes der drei im Quelltext benannten Module. In der bekannten `winevulkan.so` liegen die zwei normalen Uprobes bei Dateioffset `0x2ee80` (Wrapper-Eintritt) und `0x2eea9` (unmittelbar nach dem Host-Aufruf); es sind keine Uretprobes. Der Parameterblock steht am Eintritt in RDI, danach weiterhin in RBX. Die konkrete Windows-Wrapper-Sequenz macht `params+40` zum Kandidaten für den API-Aufrufer und `params-56` zum Gegenprüf-Slot. Letzterer muss im passenden Wine-PE-Mapping auf Dateioffset `0x12a7a` zeigen. Das ist eine Ableitung für diese Binärdateien, kein allgemeines Wine-ABI-Versprechen.

Für eine Zuordnung brauche ich vollständige Klammern im selben nativen Thread, übereinstimmende Argumente/Adressen, Eintritts-RSP gleich Austritts-RSP plus 24, passende Mapping-Identitäten und ausgewertete Verluststatistiken. Ungültige oder null Kandidaten sind kein Aufrufernachweis; die Kernel-Aufnahme kann ohne eine solche Zuordnung weiterlaufen. Die erneute Datei-Hashprüfung verlangt passende Geräte-/Inode-Identität. Auch dann werden Dateibytes geprüft, keine privaten COW-Laufzeitseiten.

Ein erfolgreicher GEM-Handle-Close ist nicht gleichbedeutend mit dem Ende aller Objekt-/GPU-Referenzen. Wegen der Handle-Wiederverwendung ist die ursprünglich von der BO-Liste beabsichtigte Generation weiterhin unbekannt. Ich habe keine vollständige D3D12-Release-/Fence-Kette erfasst und keinen Zusammenhang mit dem älteren GPUVM-Fault bewiesen.


## Bestätigter regulärer Kontrolllauf

Ich habe das Spiel regulär beendet. Beide nativen Proben melden 90 Treffer; alle 90 Paare wurden unabhängig anhand gleicher nativer TID, Argumente und RSP-Differenz 24 bestätigt. 36 Paare umschließen je einen erfolgreichen GEM-Handle-Close. Alle Kandidaten-Caller ergeben in der frühen vollständigen Mappingaufnahme `d3d12core.dll+0x386ce4`, alle Gegenprüf-Slots Wine-PE-Dateioffset `0x12a7a`. Der gemappte Ersatz-Inode der D3D12-DLL wurde diesmal passend geöffnet und mit dem bekannten Hash bestätigt. Es gab kein erfasstes NULL-Lookup-/BO-/CS-ENOENT, keine gemeldeten Kernel-Probe- oder Pufferverluste und keine Aufräumfehler. Späte Prozessmetadaten waren beim Nachlesen teilweise nicht mehr verfügbar; die frühe passende Snapshot-/Dateihash-Zuordnung liegt vor. Daraus folgt noch keine Zuordnung eines tatsächlich fehlgeschlagenen Reloads zu dieser Aufrufstelle und keine vollständige Release-/Fence-Kette.

## Originale und nachvollziehbare Zusammenfassung

[evidence-summary.json](evidence-summary.json) enthält ausgewählte abgeleitete Fakten, originale Dateinamen und SHA-256. Es ist kein Rohlog. Die ursprünglichen vollständigen Proton-/Trace-Dateien bleiben die maßgeblichen Quellen. Ich stelle hier keine privaten Rohlogs, GPU-Dumps oder fremden ELF-/PE-Bibliotheken bereit. Einige historische Quellkopftexte beschreiben ihren Prüfstand vor den späteren Live-Aufnahmen; die Tabelle oben nennt den hier dokumentierten aktuellen Status.

## Unveränderte bereitgestellte Skriptdateien

| File | Bytes | SHA-256 |
|---|---:|---|
| cthulhu-cs-watch.py | 16490 | `a14217220cb3e78616d9002f13be108581ef02c6f098d1b4b4b3d273ae59bfad` |
| cthulhu-gem-watch.py | 24386 | `432058cdb6d5e20b2821b8f8c24cf264110f47d730a7ae4503572abc60410af3` |
| cthulhu-gem-stack-watch.py | 38738 | `89fb0b03b695d21c80d334bee6105f76de2dbd0096c3451ca026353ce80e44fd` |
| cthulhu-pool-caller-watch.py | 40078 | `cd7f5d170e6c3a724a7619b221ca22f0de748050d01e8eaa38c969719b28ae4a` |
| cthulhu-native-pool-watch.py | 45467 | `d4b844a6cb5598a84807ebeede08e630d6a48ddfd8fa03ed435545951205f073` |

## Primärquellen

- [Linux 7.2.11: BO-list creation](https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/amd/amdgpu/amdgpu_bo_list.c)
- [Kernel kprobe/kretprobe documentation](https://docs.kernel.org/trace/kprobetrace.html)
- [Kernel uprobe documentation](https://docs.kernel.org/trace/uprobetracer.html)
- [Pinned Wine Unix dispatcher](https://github.com/ValveSoftware/wine/blob/e60892cc2398b0a83c332a2078c7b85e47bdb42b/dlls/ntdll/unix/signal_x86_64.c)
