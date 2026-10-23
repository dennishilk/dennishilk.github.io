# cthulhu-cs-watch.py — mein Messablauf vom 23. Oktober 2026

**Aktueller Stand, 23. Oktober 2026:** Meine wiederholten Spieltests sind vorerst abgeschlossen. Die folgenden Befehle dokumentieren meinen bisherigen Messablauf. Ich plane weitere Reproduktion erst für eine konkrete offene Frage oder gezielte Rückfrage. Die vorhandenen Belege reichen für einen präzisen Entwicklerbericht; Verursacher und Fix sind noch offen.


Ich habe dieses Werkzeug auf Cthulhu mit Arch Linux, Kernel 7.2.11-arch1-1 und einer RX 9060 XT verwendet, um den Rückgabewert ENOENT während einer abgewiesenen GPU-Submission einzugrenzen. Es ist ein Diagnosewerkzeug für diesen geprüften Kernelstand, kein Spiele-Fix.

## Unveränderte Quelle und aktueller Prüfstand

Die Python-Datei ist die unveränderte hier bereitgestellte Version. SHA-256: `a14217220cb3e78616d9002f13be108581ef02c6f098d1b4b4b3d273ae59bfad`. Ein Hash der Datei auf meinem Rechner wurde nicht separat mitgemessen. Die Kopf-Dokumentation entstand vor der ersten echten Messung und bezeichnete die Live-Registrierung deshalb noch als ungeprüft. Inzwischen habe ich die Registrierung auf Cthulhu erfolgreich ausgeführt; der im Blog beschriebene Durchlauf enthält 0 verpasste Proben, 0 Pufferverluste und einen fehlerfreien Abbau. Das validiert diesen Durchlauf auf diesem System. Die acht zuvor ausgeführten lokalen Tests simulieren Tracefs und ersetzen keinen Kerneltest auf anderer Hardware oder anderen Builds.

## Was ich ausgeführt habe

Nach dem Speichern und Lesen der Quelldatei in meinem Home-Verzeichnis habe ich zunächst geprüft:

```sh
sudo python3 -B "$HOME/cthulhu-cs-watch.py" --check
```

Der Prüflauf liest Voraussetzungen; er registriert keine Probe und erstellt keine Messdatei. Erst nach dessen erfolgreichem Abschluss habe ich die zeitlich begrenzte Messung gestartet:

```sh
sudo python3 -B "$HOME/cthulhu-cs-watch.py" --arm
```

Ich ließ das Terminal während der gewohnten Nutzung offen. Strg+C beendet die Messung; standardmäßig endet sie nach 30 Minuten automatisch. Das Werkzeug legt im Home des aufrufenden sudo-Nutzers eine exklusive Logdatei mit Modus 0600 an. Die Ausgabe nennt den tatsächlichen Dateinamen. Es installiert keine Pakete, mountet kein Tracefs und verändert keine Spieleinstellungen oder Bootkonfiguration.

## Die drei Messpunkte

| Kürzel | Funktion | Aufgezeichnet |
|---|---|---|
| bo | amdgpu_bo_list_create | Nur Rückgaben `-2` |
| sync | drm_syncobj_find_fence | Nur Rückgaben `-2` |
| cs | amdgpu_cs_ioctl | Nur Rückgaben `-2` |

Ich verwende kretprobes mit MAXACTIVE 256, signierten 32-Bit-Rückgabewerten, einer eigenen dynamischen Gruppe und einer privaten Trace-Instanz mit `mono`-Zeitgeber und 64 KiB Puffer pro CPU. Das Werkzeug zeichnet außerdem die native Task-Zuordnung sowie Probe- und Pufferstatistiken auf. Es setzt den globalen Tracer oder fremde Proben nicht zurück. Ein Schreibzugriff auf Tracefs erfolgt erst mit `--arm`; es handelt sich um echte temporäre Instrumentierung mit möglichem Einfluss auf das Timing.

## Aussagegrenzen

Die Messung gilt systemweit. Proben-Treffer sind keine ausschließlich dem Spiel zugeordneten Aufrufe. Native Linux-PIDs und Wine-PIDs sind nicht dieselben Nummern. Meine Zahlenwerte aus Wine und Tracefs sind ohne Kalibrierung keine gemeinsame Zeitachse. Die fest auf `-2` gefilterte Aufnahme erfasst andere Fehlercodes nicht.

Das Werkzeug identifiziert weder den fehlenden GEM-Handle noch eine D3D12-Ressource, GPU-Adresse, Release-Sequenz oder einen GPU-Befehlszähler. Es beweist keine gemeinsame Ursache mit meinem GPUVM-Fault vom 21. Oktober. Bei gewöhnlichem Ende sowie SIGINT/SIGTERM/SIGHUP versucht es, ausschließlich seine eigenen Messobjekte zu entfernen. SIGKILL und ein vollständiger Hardlock verhindern dieses Aufräumen; ein Neustart verwirft die flüchtigen Proben. Fehlermeldungen zum Aufräumen gehören zur Auswertung. Eine leere Aufnahme ist kein Beleg für Fehlerfreiheit.

Die Version ist auf die 7.2.11-Releasefamilie begrenzt und prüft Symbole, Module und den Rückgabetyp. Ein gleich benannter, lokal gepatchter Kernel kann trotzdem abweichen. Ich empfehle dieses Werkzeug nicht ungeprüft für andere Kernelstände.

## Primärquellen

- [Kernel: kprobe/kretprobe, Rückgabewerte, Filter und Trefferstatistik](https://docs.kernel.org/trace/kprobetrace.html)
- [Kernel: private Trace-Instanzen](https://docs.kernel.org/trace/ftrace.html#instances)
- [Linux 7.2.11: BO-Listen-Erstellung](https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/amd/amdgpu/amdgpu_bo_list.c)
- [Linux 7.2.11: CS-Einreichung](https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/amd/amdgpu/amdgpu_cs.c)
- [Linux 7.2.11: Syncobj-Fence-Suche](https://github.com/gregkh/linux/blob/v7.2.11/drivers/gpu/drm/drm_syncobj.c)
