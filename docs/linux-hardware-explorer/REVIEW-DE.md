# Linux Hardware & Driver Explorer — Abnahmebericht

**Reviewfassung vom 10. Oktober 2026. Nicht veröffentlicht.**

Phase 2 ist als vollständige, überprüfbare Implementierung im bestehenden
Repository vorbereitet. Die neue Oberfläche, Parser, Geräteprofile,
Diagnosewege, Fix-Lab-Verknüpfungen und Sitemap-Integration sind gebaut und
automatisiert geprüft. Eine echte Browser-Abnahme fehlt noch. Deshalb ist diese
Fassung **bereit für das Review, aber noch nicht als launchbereit eingestuft**.

Es wurde nichts gepusht, keine Sitemap aktiviert und keine bestehende
Seitennavigation geändert. Homepage, Featured-Projects-Karten, World Observer,
Blog und die veröffentlichten Fix-Lab-Seiten bleiben unverändert.

## Umfang

| Bestandteil | Ergebnis |
| --- | ---: |
| Redaktionell anhand von Quellen geprüfte Profile | 154 |
| Profile mit kuratierten PCI-/USB-Kennungen | 122 |
| Ausdrückliche Klassen-, Transport- oder Treiberkontextprofile | 32 |
| Kuratierte numerische Kennungspaare | 125 |
| Gerätespezifische Seiten auf Deutsch und Englisch | 308 |
| Grundlagen- und Firmwareseiten auf Deutsch und Englisch | 20 |
| Einstiegsseiten | 2 |
| Insgesamt vorbereitete Seiten | 330 |
| Hardwarebereiche | 12 |
| Geführte Diagnosewege | 18 |
| Lesende Prüfschritte in Geräteprofilen | 508 |
| Quellenverweise in Geräteprofilen | 560 |
| Erfolgreich abgerufene unterschiedliche Primärressourcen, einschließlich Grundlagen | 267 |

Die 154 Profile erfüllen die gewünschte Größenordnung. „Geprüft“ bezeichnet
eine redaktionelle Quellenprüfung und **keinen Test mit dem physischen Gerät**.
32 allgemeine Profile werden ausdrücklich als Kontext beschrieben; sie werden
nicht als exakt erkannte Produkte gezählt. Es gibt keine Kompatibilitätsnoten,
erfundenen Mindestkernel, Leistungsversprechen oder behaupteten Hardwaretests.

| Bereich | Profile |
| --- | ---: |
| AMD-Grafik | 8 |
| NVIDIA-Grafik | 8 |
| Intel-Grafik | 8 |
| WLAN | 28 |
| Ethernet und Netzwerk | 22 |
| Audio | 10 |
| Speichercontroller | 18 |
| USB | 10 |
| Bluetooth | 12 |
| Chipsätze und PCIe | 12 |
| Eingabe und weitere Geräte | 8 |
| Virtuelle und ungewöhnliche Hardware | 10 |

## Erkennung und Oberfläche

Unterstützt werden `lspci`, `lspci -nnk`, numerische und VMM-Varianten,
`lsusb`, relevante Deskriptoren aus `lsusb -v`, umgebrochene `inxi`-Geräteblöcke,
numerisches `lshw`, `lshw -json` sowie ausgewählte sysfs-Kennungen und konkrete
PCI-/USB-Modaliase. Zusätzlich ist eine direkte Suche mit Kennungen wie
`pci:8086:2723` möglich. Die automatische Auswahl erkennt unterstützte Formate
auch in gemischten Textberichten.

Mehrere Geräte erhalten getrennte Karten mit **Überblick, Treiber, Firmware,
Diagnose, Fehlerhilfen und Quellen**. Tastaturbedienbare Tabs, Suche,
Bereichsfilter, Sortierung und schrittweises Anzeigen größerer Ergebnislisten
sind umgesetzt. Das Erscheinungsbild verwendet Blog- und Fix-Lab-Stile mit
dunklen Flächen, Cyan-Akzenten, sichtbarem Fokus und mobilen Layoutregeln.

Die Erkennung trennt numerische Identität, ungeprüfte Eingabebezeichnung,
Kandidaten aus dem Katalog und tatsächlich in der Eingabe gemeldete
Treiberbindung. `Kernel modules` ist kein Nachweis eines geladenen Treibers.
Eine fehlende Treiberzeile bedeutet „nicht berichtet“, nicht „ungebunden“.
Widersprüchliche ausdrückliche Bindungsbefunde werden nicht überschrieben.

Subsystem-, Revisions- und Klassenbedingungen werden berücksichtigt. Beispiel:
Intel `8086:095a` benötigt im kuratierten 7265-Eintrag zusätzlich Subdevice
`5010`; ASIX `0b95:1790` die USB-Schnittstellenklasse `ff:ff:00`; Marvell
`1b4b:9123` die AHCI-Klasse `010601`. Fehlende Zusatzdaten bleiben unbestätigt,
widersprüchliche vollständige Bedingungen schließen die betreffende ID-Regel
aus. USB-Verbundgeräte können mehrere unterschiedliche Schnittstellen haben.

Bei unbekannten IDs gibt es eine ehrliche Unbekannt-Anzeige. Modul- und
Klassenhinweise liefern nur Kandidatenkontext. Ein Gerätefund beweist weder
erfolgreiche Initialisierung noch nutzbare Ausgabe, Netzwerkverbindung oder
Datenträgergesundheit.

## Treiber, Firmware und Diagnosewege

Die zehn Grundlagen behandeln Bindung, eingebaute und ladbare Module,
Modaliase, Firmwareladung, Grafikstapel, USB-Schnittstellen, PCIe-Topologie,
Beleggrenzen, Distributionspakete sowie Datenschutz und Teilen.

Debian, Ubuntu, Fedora, Arch Linux, NixOS und Gentoo besitzen überprüfte,
lesende Einstiege. Das sind Paket-, Versions- und Konfigurationsprüfungen,
keine pauschalen Installationsrezepte. Platzhalter, mögliche erhöhte Rechte und
private Angaben in Ausgaben werden erklärt. Die Website führt keine Befehle
aus und empfiehlt in den neuen Werkzeugen keine automatischen Treiberwechsel,
Flashvorgänge, Rescans, Unbind-Vorgänge oder destruktiven Speicheroperationen.

Die 18 Diagnosewege behandeln GPU-Bindung, AMD-Firmware, NVIDIA-Module,
Intel-Initialisierung, WLAN, Ethernet, PCIe-Link, USB-Trennungen, NVMe,
SATA-CRC, Bluetooth, Audio, fehlende Module, Suspend, Firmwareanfragen,
Windows/Linux-Vergleiche, rfkill und IOMMU/AER. Jeder Weg besitzt eine konkrete
Ausgangsfrage, eine zusätzliche Befundfrage und getrennte Endzustände mit
passenden Fix-Lab-Anleitungen. Beobachtungen werden von Hypothesen getrennt;
kein Frageweg verspricht eine bestätigte Ursache oder sichere Lösung.

Firmwareprofile unterscheiden „erforderlich“, „bedingt“, „geräteabhängig“ und
„hier keine Host-Datei belegt“. Letzteres bedeutet nicht, dass Hardware ohne
Firmware arbeitet. Geprüfte Dateinamen sind Beispiele oder Versionszweige,
keine vollständige Paketliste. Ein Firmwarefehlerzähler wird keinem Gerät und
keinem fehlenden Paket automatisch zugeordnet.

## Datenschutz und Teilen

Die gesamte Verarbeitung eingefügter Berichte findet in einem lokalen
Modul-Worker statt. Es gibt keine Uploads, KI-Aufrufe, Konten, Tracking-Widgets
oder persistente Speicherung von Berichten. Der bestehende Sprachschalter
behält ausschließlich seine bisherige Spracheinstellung.

Grenzen: 2 Millionen Zeichen, 20.000 Zeilen, 4.096 Zeichen pro Zeile, 512 Geräte
und begrenzte JSON-Verschachtelung. Lange Zeilen erhalten einen Kürzungshinweis.
Alte Worker werden beendet; Anfragen werden über IDs geprüft und nach
15 Sekunden abgebrochen. Änderungen der Eingabe, Leeren, Sprachwechsel,
Seitenwechsel und BFcache-Rückkehr verwerfen private Felder. Verspätete
Datei- oder Clipboard-Antworten können sie nicht wieder befüllen.

Die normale Zusammenfassung verwendet eine Positivliste: öffentliche
Profilnamen, Quellenkontext, Links und bekannte Treibernamen. Rohzeilen,
private Bezeichnungen, Busadressen, Seriennummern, MACs und Hostnamen werden
ausgelassen. Numerische Chip-IDs sind nur nach ausdrücklicher Auswahl im
lokalen Export enthalten. Optionale Schwärzung bleibt eine Hilfestellung;
ein geschwärzter Auszug muss vor jeder Weitergabe geprüft werden.

Mastodon/Fediverse, X/Twitter, Facebook, native Browserfreigabe und Direktlink
sind umgesetzt. Geteilt wird eine ausgewählte öffentliche Profil- oder
Grundlagenseite. Berichte und lokale Ergebnisse werden nicht in öffentliche
URLs oder automatisch in Nachrichten übernommen. Soziale Schaltflächen öffnen
erst nach einem Klick einen bearbeitbaren Entwurf beim gewählten Dienst.

Beim Sprachwechsel bleiben nur bekannte öffentliche Profil-, Bereichs-,
Sortier-, Diagnoseweg- und Knotenkennungen erhalten. Freie Suchbegriffe,
Chip-IDs, Berichte und beliebige URL-Parameter werden nicht weitergereicht.

## Quellen und Integration

Implementierungsbelege verwenden den unveränderlichen Linux-Stand
[`3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0`](https://github.com/torvalds/linux/tree/3857c2fe5449541e24afc5efdb0f81a8a8f9a3a0).
NVIDIA-Identitäten stammen aus ausgewählten Zeilen des offiziellen,
versionierten [580.95.05-README](https://download.nvidia.com/XFree86/Linux-x86_64/580.95.05/README/supportedchips.html).
Die Profile nennen genaue Dateien, Tabellenstellen und Beleggrenzen. Weitere
Erklärungen verwenden offizielle Kernel-, Werkzeug- und
Distributionsdokumentation. Quellenstand ist kein empfohlener Installationsstand.

Die vier Forschungsberichte, `SOURCE-AUDIT.json`, `ATTRIBUTION.md` und
16 repräsentative Quellenfixtures dokumentieren Herkunft und Prüfsummen.
Es wurde keine fremde PCI-/USB-Datenbank massenhaft kopiert; die Erläuterungen
sind eigenständig. Recherche zu Suchabsichten ist als redaktionelle Ableitung
dokumentiert, ohne erfundene Suchvolumina oder Rankingversprechen.

Neue Seiten verlinken bereits die richtigen lokalisierten Fix-Lab-Anleitungen
und deren vorhandene Lösungsanker. Der lokale Inspector verwendet bestehende
Fix-Lab-Textsignaturen, gibt aber nur Signaturkennungen und Zähler zurück und
ordnet Log-Hinweise keinem Gerät automatisch zu.

Nach Aktivierung ergänzen der Lab-Builder und das vorbereitete Mapping
Gegenlinks auf **46 passende Probleme, also 92 Artikelseiten**. Die
Fix-Lab-Einstiegsseiten bekommen einen Hardware-Einstieg und die eigene
Navigation einen Kontextlink. Verweise zu Blog und Linux Migration Companion
sind in den neuen Seiten vorhanden. Die Featured-Projects-Karte bleibt
Linux Fix Lab. Der Review-Modus verändert keine bestehenden HTML-Seiten.

Die Architektur hält Hardwarebeobachtungen und Fehlerhilfen getrennt und bietet
einen passenden Ansatzpunkt für Phase 3. Eine Gaming-Funktion oder neue
Serverkomponente wurde nicht vorweggenommen.

## SEO und Prüfergebnisse

Alle 330 Seiten besitzen lesbares statisches HTML, eindeutige Titel und
Beschreibungen, kanonische End-URLs, reziproke DE/EN-Alternativen, Breadcrumbs,
passende strukturierte Daten und Open-Graph-Metadaten. JavaScript ist nur für
die lokalen Werkzeuge, Filter, Fragewege und erweiterte Freigabe nötig.

Der Sitemap-Entwurf enthält genau 330 kanonische URLs mit Sprachalternativen
und aus tatsächlichen HTML-Änderungen abgeleiteten Datumsangaben. Er liegt
derzeit unter `content/linux-hardware-explorer/prepared-launch-sitemap.xml`.
Die aktive Datei `sitemap-linux-hardware-explorer.xml`, ihr Eintrag im
Sitemap-Index und ihre robots.txt-Werbung bleiben deaktiviert. Alle neuen
HTML-Seiten besitzen `noindex,follow`.

| Prüfung | Ergebnis |
| --- | --- |
| Eigene Explorer-Prüfungen | **228 bestanden, 0 Fehler** |
| Davon Parser | 28 |
| Davon Laufzeit, Worker und DOM-Ereignisse | 17 |
| Davon Quellenfixtures und Beleggrenzen | 18 |
| Davon Katalog, Seiten, Diagnosegraphen, Links, SEO und Sicherheitsregeln | 165 |
| Primärressourcen | 267 erfolgreich abgerufen, Prüfsummen dokumentiert |
| SEO im Review-Zustand | 611 bestehende öffentliche URLs, 0 Validierungsfehler |
| Freigabeprobe in isolierter Kopie | 836 Prüfungen bestanden, 0 Fehler |
| Aktive Sitemap in dieser Kopie | 330 neue URLs; alle 302 Fix-Lab-URLs erhalten |
| Gegenlinks in dieser Kopie | 92 Artikelseiten korrekt integriert |
| Wiederholter Build und Deaktivierung | deterministisch; Rücknahme von Indexierung, Links und Sitemap geprüft |
| Gesamte Repository-Suite | 1.463 Tests: 1.435 bestanden, 28 bereits bestehende Fehler |
| Neue Regressionen gegenüber der Ausgangssuite | 0 |
| Echter Browserdurchlauf | **hier nicht durchgeführt** |

Die bestehende Ausgangssuite hatte bereits 28 Fehler. Die gleichen Fehlertitel
bleiben bestehen; sie betreffen andere Projekte und sind in
`REGRESSION-BASELINE.md` aufgelistet. Diese Fehler werden nicht als bestanden
ausgegeben und wurden nicht durch Änderungen an fremden Projekten verdeckt.

Die Laufzeitprüfungen führen den tatsächlichen Modul-Worker unter Node aus.
Die Oberflächenprüfungen führen die echten Ereignishandler in einem kleinen
DOM-Testmodell aus. Das bestätigt unter anderem Tabs, Workflow-Übergänge,
Text statt HTML bei schädlichen Eingaben, Filter, Clipboard-Fallback,
Sprachkontext, Worker-Ausfall sowie das Verwerfen verspäteter Antworten.
Das Testmodell rendert keine CSS-Layouts und ersetzt keinen echten Browser.

## Offene Abnahme und bekannte Grenzen

Es steht keine unterstützte Browsersteuerung zur Verfügung. Es wurde deshalb
kein Browser installiert, keine separate Preview gestartet und kein Browsertest
behauptet. Vor dem offiziellen Launch fehlen noch tatsächliche Desktop- und
Mobilansicht, Tastatur-/Screenreader-Durchlauf sowie reale Clipboard-,
Dateidownload-, native Freigabe- und Mastodon-Dialog-Prüfungen.

Für diese Browser-Abnahme sollten beide Sprachen, eine erkannte Intel-/AMD-ID,
fehlende Subsystemdaten, ein unbekanntes Gerät, zusammengesetzte USB-Deskriptoren,
mehrere Geräte, ein schädliches Textlabel, Leeren während Dateilesen, Rückkehr
über die Browserhistorie und ein Workflow mit Sprachwechsel geprüft werden.
Die finalen HTTP-URLs und JavaScript-MIME-Typen sind erst nach einer genehmigten
Bereitstellung zu prüfen; der Explorer wurde noch nicht auf der Website geprüft.

Der Katalog ist bewusst keine vollständige PCI-/USB-Datenbank. Manche Tool-
Varianten und lokalisierte Klartextausgaben brauchen weitere Fixtures.
HDA-Codecs, Plattform-/ACPI-Geräte und UART-/SDIO-Transporte werden nicht
aus einer beliebigen PCI-Kennung als exaktes Produkt erfunden. Firmware- und
Treibernamen können je nach installiertem Kernel vom geprüften Snapshot
abweichen. Erfolgreiche Hardwarefunktion bleibt außerhalb der Quellenprüfung.

## Repository-Stand und Deployment

Gearbeitet wurde ausschließlich auf `main`. Die Ausgangsbasis war
`7e12199f847bf9e17acdd94044b8d23bd2cf978d`. Vor dem Review wurde der aktuelle
Upstream-Stand **`d6abd3cbeada49502ff3194a6599749b9a22ce6d`** übernommen,
einschließlich des inzwischen veröffentlichten World-Observer-Dashboard-Updates.
Der Patch im Reviewpaket basiert auf diesem aktuellen Commit. Kein Commit der
Implementierung wurde gepusht.

Die finalen Zielpfade sind `/linux-hardware-explorer/` und
`/de/linux-hardware-explorer/`. Es wird der vorhandene statische
Website-Workflow verwendet. Nginx, Worldnode und GoToSocial benötigen keine
Änderungen.

**Die folgenden Veröffentlichungsschritte sind erst nach Dennis' ausdrücklicher
Freigabe und der offenen Browser-Abnahme vorgesehen.** Das Reviewpaket allein
aktiviert nichts. Bei einer genehmigten ersten Bereitstellung zum Testen kann
die Review-Konfiguration vollständig erhalten bleiben.

1. Den neuesten `main` abrufen und den Patch damit abgleichen. Vorhandene lokale
   Änderungen und Dashboard-Commits erhalten; bei Abweichungen mergen und
   Konflikte gezielt lösen. Keine erzwungenen Resets oder Force-Pushes.

   ```bash
   git fetch origin main
   ```

2. Für den offiziellen Launch die einzige neue Freigabedatei
   `content/linux-hardware-explorer/publication.json` auf folgenden Inhalt setzen:

   ```json
   {
     "schemaVersion": 1,
     "phase": "public-launch",
     "allowIndexing": true,
     "activateSitemap": true,
     "activateIntegration": true
   }
   ```

3. Hardwareseiten, Gegenlinks und aktive Sitemaps zusammen bauen:

   ```bash
   npm run build:hardware-explorer
   ```

4. Die Explorer-Prüfungen ausführen:

   ```bash
   npm run test:hardware-explorer
   ```

5. Die bestehenden Lab-Prüfungen ausführen:

   ```bash
   npm run test:fix-lab
   ```

6. SEO prüfen:

   ```bash
   npm run test:seo
   ```

7. Änderungen einschließlich der erzeugten Lab-Gegenlinks und Sitemaps prüfen,
   auf `main` committen und nach erteilter Freigabe über den bestehenden Workflow
   pushen. Die Homepage bleibt auch beim Launch unverändert.

8. Nach dem genehmigten Push auf Worldnode zunächst den Git-Stand prüfen:

   ```bash
   git -C /srv/www/dennishilk.github.io status --short --branch
   ```

   Anschließend den neuen Stand abrufen:

   ```bash
   git -C /srv/www/dennishilk.github.io fetch origin main
   ```

   Bei sauberem Arbeitsbaum lokale Dashboard-Commits durch einen Merge erhalten:

   ```bash
   git -C /srv/www/dennishilk.github.io merge --no-edit origin/main
   ```

9. Danach die beiden tatsächlichen Einstiegs-URLs, repräsentative DE/EN-Profile,
   Sprachwechsel, Worker und Lösungen im Browser prüfen. Für den offiziellen
   Launch müssen zusätzlich Sitemap, robots.txt, Canonicals und `index,follow`
   auf den ausgelieferten Seiten bestätigt werden.

Die endgültige Google-Sitemap ist nach Aktivierung:
[https://www.dennishilk.com/sitemap-linux-hardware-explorer.xml](https://www.dennishilk.com/sitemap-linux-hardware-explorer.xml).
Der bestehende Sitemap-Index bleibt der gemeinsame Einstieg.

Zur Rücknahme der Suchmaschinen- und Linkfreigabe die vier Werte auf
`phase: "review"` und die drei Booleschen Werte auf `false` zurücksetzen und
erneut bauen. Die Rücknahme wurde in der isolierten Kopie geprüft; die neuen
Seiten bleiben dann lesbar und erhalten wieder `noindex,follow`.
