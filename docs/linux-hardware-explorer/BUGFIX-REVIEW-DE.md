# Hardware Explorer — Cthulhu-Relevanzkorrektur

Korrektur vom 10.10.2026. **Push auf main ausdrücklich von Dennis freigegeben; Server-Abgleich durch Dennis.**
Basis: `6c9161e30ecd52ed464df47f6be14883e76fe985`, Branch `main`.

## Ursache und Korrektur

Ohne numerischen ID-Treffer behandelte `identifyDevices` jedes Profil mit dem
gebundenen Modul als Kontextkandidat. `deviceCard` verwendete diese Kandidaten
anschließend für Treiber, Firmware, Befehle und Fehlerhilfen. So wurde amdgpu
fälschlich zur Generationserkennung und eine fehlende Navi-44-Kennung führte
zur Radeon-Generationenliste.

Jetzt gilt: erfüllte exakte ID-Regeln vor belegten Familienregeln; unvollständige
ID-Bedingungen bleiben ausdrücklich unbestätigt. Allgemeine Klassenkontexte
stehen in einem getrennten Ergebnisfeld und begründen keine Produktidentität.
Module, Hersteller allein und Klartextbezeichnungen identifizieren keine Generation.
Erforderliche Subsystem-, Revisions-, Klassen- und USB-Schnittstellenbedingungen
bleiben erhalten. Verkürzte Klassen werden nicht als vollständige ProgIf-Belege
behandelt. Bestimmte IP-/Port-/USB-Protokollprofile erfordern zusätzliche Evidenz
und werden nicht allein aufgrund eines Moduls oder einer breiten Klasse angeboten.
Alle bisherigen 154 Profile bleiben manuell verfügbar; Navi 44 ergänzt Profil 155.

Nur eine eindeutig belegte Identität liefert automatisch generationenspezifische
Tab-Inhalte. Bei mehreren belegten Profilen wird kein beliebiger Gewinner
aufgeklappt. Unbekannte IDs bleiben unbekannt und erhalten allgemeine lesende
Diagnosehinweise. Breiter Kontext ist geschlossen und verlinkt Grundlagen statt
unpassender Generationen. Der gebundene Treiber bleibt separat sichtbar.

## Navi 44: Evidenz und Grenzen

Der PCI-ID-Project-Snapshot
`3452638d16a34aa3d6e427d21e4cd0bae0fb884e`, `pci.ids`, Zeilen 4258–4262,
ordnet **1002:7590** der Familie **Navi 44 [Radeon RX 9050 / 9060 XT]** zu:
https://github.com/pciutils/pciids/blob/3452638d16a34aa3d6e427d21e4cd0bae0fb884e/pci.ids

Die Kennung ist daher ein **Familientreffer**, kein exklusiver RX-9060-XT-Nachweis.
`148c:2437` ist in diesem Eintrag nicht als konkrete Platine belegt; `c0` wird
nur als gemeldete Revision dargestellt. Fehlende oder andere Subsystemdaten
ändern den Chipfamilienbefund nicht. Eine erforderliche Subsystembedingung wird
nicht erfunden. Speichergröße, Leistungsgrenze und PowerColor-Modell werden
nicht abgeleitet. Die vom Benutzer berichtete RX-Bezeichnung bleibt als
ungeprüfte Eingabebezeichnung separat sichtbar.

AMD ROCm 6.4.2 dokumentiert RX 9060 XT als RDNA4/gfx1200:
https://rocm.docs.amd.com/en/docs-6.4.2/reference/gpu-arch-specs.html
Das ist Architekturkontext, keine Bestätigung der konkreten Subsystem-ID.

Der unveränderliche Linux-Snapshot
`3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0` besitzt im geprüften
`amdgpu_drv.c` keinen wörtlichen 7590-Produkteintrag. Er verwendet
AMD-Displayklassen-Fallbacks mit CHIP_IP_DISCOVERY. Die Quellen aus
`amdgpu_discovery.c` und `gfx_v12_0.c` erklären IP-Auswahl und Firmwaredeklarationen;
sie werden nicht als feste Navi-44-Platinen-Dateiliste interpretiert.

Das Profil empfiehlt keine SI-/CIK-Parameter oder radeon-Treiberwahl. Es bietet
Identität/Bindung, sysfs-Treiberlink, PCIe-Linkstatus und Kernelmeldungen zu
Initialisierung, Firmware, AMDGPU und AER. Validierte PCI-Adressen ersetzen
BDF-Platzhalter in Gerätekarten; ausgeführt wird nichts. Die Firmwareliste bleibt
bewusst ohne pauschale Dateinamen. Konkrete Ladeanforderungen des laufenden
Kernels entscheiden über benötigte Dateien.

## Karten, Quellen und Datenschutz

Die Karte besitzt sechs Tabs und ein Navi-44-Familienheading, PCI-ID,
berichtete Subsystem-/Revisionsdaten, getrennte Modulkandidaten und tatsächliche
Treiberbindung. Bindung bestätigt weder Initialisierung noch Betriebsstabilität.
„Allgemeine AMDGPU-Informationen“ ist optional eingeklappt.
Quellen werden innerhalb des Ergebnisses nach normalisierter Ressourcen-URL
entdoppelt, einschließlich Zeilenfragmenten und Trackingparametern. Verschiedene
URLs mit demselben Titel bleiben erhalten. Quelltypen werden lokalisiert angezeigt.
Originalquellen und SHA-256-Nachweise bleiben im Quellen-Audit erhalten; zwei neue
Ressourcen ergänzen die 267 bisherigen Belege. Keine Rohberichte werden gespeichert,
hochgeladen, automatisch geteilt oder ausgeführt.

## Geänderte Dateien

- `assets/linux-hardware-explorer/core.js`: Evidenzhierarchie, getrennte Kontexte,
  Familiengründe, Ressourcen-Deduplizierung.
- `assets/linux-hardware-explorer/app.js`: fokussierte Karten, geschlossener Kontext,
  Bindung/Stabilität, passende Befehle und lokalisierte Quellenarten.
- Forschungsdaten: neues `amd-navi44`; konservative Freigabe allgemeiner
  IP-/Port-/USB-Protokollkontexte. Keine bestehenden Profile entfernt.
- `scripts/build-linux-hardware-explorer.mjs`: Validierung der neuen Identitätsebene.
- Generierte Katalog-/Integrations-/Manifestdaten, DE/EN-Einstiegsseiten, zwei neue
  Navi-44-Seiten, zwei neue Sitemap-URLs und acht passende Fix-Lab-Gegenlinkseiten.
- Quellen-Audit, Attribution und dieser Bericht.
- Parser-/Seiten-/Laufzeit-/Quellentests; neue Relevanztests und Preservation-Fixture.

Homepage, Blog, World Observer, robots.txt und Sitemap-Index sind unverändert.
Die bestehende Launchkonfiguration wurde beibehalten.

## Prüfung

| Prüfung | Ergebnis |
| --- | --- |
| Explorer | 250 bestanden, 0 Fehler; zuvor 229 |
| Fix Lab | 655 bestanden, 0 Fehler |
| Isolierte Integration/Freigabeprobe | 837 bestanden, 0 Fehler |
| SEO | 943 eindeutige Sitemap-URLs, 0 Fehler |
| Vollständiges `node --test` auf unveränderter Basis | 1470 Tests, 1442 bestanden, 28 Altfehler |
| Vollständiges `node --test` mit Korrektur | 1491 Tests, 1463 bestanden, dieselben 28 Altfehler |
| Neue Regressionen | 0 |

Die 21 zusätzlichen Tests umfassen Navi 44 mit gemeldetem, fehlendem und
abweichendem Subsystem, Tahiti/Bonaire, unbekannte AMD-IDs, unbekannte IDs mit
NVIDIA-/Intel-/Realtek-/Broadcom-Modulen, getrennte Geräte mit gleichem Treiber,
Modulkandidaten versus Bindung, exakte Regeln vor Familienregeln und widersprochene
Pflichtbedingungen, Quellen-Deduplizierung, keine alten Firmware/Befehle,
154 erhaltene Profilkennungen, private/feindliche Eingaben sowie DE/EN-Karten,
Tabs und funktionierende Fix-Lab-Lösungsanker. Das DOM-Modell ist kein Browser.

Die ursprünglichen Screenshots `Bildschirmfoto_20261010_133342.png` und
`Bildschirmfoto_20261010_133512(1).png` wurden visuell geprüft. Sie belegen die
Generationenliste und das echte 1002:7590-/148c:2437-/amdgpu-Ergebnis mit neun
geparsten Geräten. Die Regression verwendet den bereitgestellten PCI-Auszug;
der gesamte Originalbericht mit neun Geräten lag nicht als Textfixture vor.

## Offene Grenzen

Keine unterstützte Browsersteuerung vorhanden: keine visuelle Abnahme der
korrigierten Karte und keine neuen Browser-Screenshots behauptet. Vor Freigabe
sollte der PCI-Auszug in DE/EN im echten Browser geprüft werden. Der kuratierte
Katalog bleibt unvollständig. PCI-IDs können mehrere Verkaufsmodelle umfassen;
Board und Betriebsstabilität werden nicht aus Identität abgeleitet. Allgemeine
Klassenprofile werden bewusst konservativ angeboten. Weitere IP-/Transportbelege
können später zusätzliche quellenbelegte Familienregeln ermöglichen.

**Push auf main freigegeben.** Der aktuelle Main-Abgleich erfolgt vor dem Push. Der Server-Abgleich und die echte Browser-Abnahme folgen durch Dennis.
