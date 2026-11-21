# Blog-Audit – 21. November 2026

**67 Themen / 134 Sprachseiten geprüft. 17 Artikelpaare geändert, 50 Artikelpaare ohne Änderung am Artikel-HTML.** Zusätzlich wurde die Herkunft eines bereits vorhandenen eigenen WoW-Bildes im Gaming-Bildmanifest nachgetragen. Keine neue persönliche Erfahrung ohne Autorenbestätigung.

Ausgangsstand: `6734072908ad1bd0288773b9f66e4094db92e891`. Lokal geprüfter Inhaltsstand: `7eec2fae5923103284a21c8511c1922778582c2f`. Direkt auf `main`, keine Branches/PRs, keine Löschung, kein Force-Push. Worldnode wurde nicht deployt. Alle Veröffentlichungstage, Artikelpfade und vorhandenen `img src`-Verweise bleiben erhalten.

## Inhaltliche Ergebnisse

- **Epic:** sichtbares Update oben zu Preview 0.120.0 vom 20. November; offizielle AppImage-/DEB-Formate und unterstützte Distributionen einschließlich Fedora ≥43. Ursprünglicher Arch-/dwm-Praxistest bleibt datiert; Fortnite bleibt ohne offizielle Linux-Unterstützung.
- **Plasma:** 6.8.3 vom 10. November ergänzt; konkrete Fehlerkorrekturen statt einer pauschalen Aussage, alle Probleme seien behoben. X11-Sitzung und XWayland sind weiterhin getrennte Begriffe.
- **Ubuntu/OpenSSH:** Fixstatus, Changelog, `postrm` und tatsächliche Security-/Updates-Publikationen von Quelle und amd64-Client/Server geprüft. `1:10.5p1-1ubuntu3.1` ist veröffentlicht. Alte entfernte Pakete können noch alte `postrm`-Skripte besitzen; deshalb keine pauschale Freigabe zum Purgen aller `rc`-Einträge.
- **RX 9060 XT:** Dennis bestätigt unverändert −500 MHz, zwischenzeitliche Systemupdates, ungefähr zehn Stunden War Thunder bei maximalen Einstellungen, 15 Stunden WoW Forever und mehrere Kdenlive-Renderläufe ohne weiteren Hardlock. OBS funktioniert inzwischen ebenfalls. Vorläufiger Abschluss; künftige NixOS-/Gentoo-/XMonad-Vergleiche ausdrücklich noch nicht durchgeführt. Keine erfundene aktuelle Kernel-/Mesa-Version, kein neuer Test ohne Offset. Mesa 26.2.6/26.2.7/26.3.1 als getrennte Upstream-Entwicklung eingeordnet.
- **WoW:** Level 34 nach etwa 25 Minuten AoE-/OBS-Stream bestätigt. Sechs Dungeon-Aufnahmen und der Stream anhand der offiziellen YouTube-oEmbed-Titel zugeordnet. Bibliothek ist geplant, nicht schon erfolgreich abgeschlossen. Chronik, Bilder und Observer bleiben erhalten.
- **Longbow:** ein 8-GB-FAT32-Stick funktioniert; aktuell Windows-Schutzfehler. Frisches Win98 SE und erneuter Onboard-Sound-Test stehen noch aus. Kein funktionierender Longbow-Digitalton oder UniSound-Erfolg erfunden.
- **Linux-Ratgeber:** fish/XDG-Syntax konkretisiert; Fastfetch mit aktuellem Kitty-Bild verbunden; Gaming mit Epic/GOG/WoW verknüpft; Wine-Runner und Prefix getrennt; Migration mit Distro-Finder/Dual-Boot/Updates verbunden; historischer SPDIF-Fix mit aktuellem Audio-Guide verknüpft.
- **Historischer Kontext:** Cthulhu- und Nebu-Berichte erhalten einen datierten Hinweis auf Arch/dwm, während ursprüngliche NixOS-Aufnahmen und Geschichten erhalten bleiben. Oktober-nginx-Bericht mit November-Folgeartikel verbunden.

Die direkten Autorenangaben und die sieben verifizierten Videotitel stehen in [author-update-2026-11-21.json](../../content/behind-projects/author-update-2026-11-21.json). Der vollständige Quellenbestand je Sprachseite steht in [inventory.json](inventory.json).

## Technische und SEO-Korrekturen

1. Sitemap übernimmt nun auch bei bereits bekannten Artikeln deren wirkliches `dateModified`. Keine Datierung aus bloßer Ausführungszeit; Regressionstest und wiederholter Neubau geprüft.
2. WoW-Quellfragmente enthielten zuvor mehrere bereits veröffentlichte Chronikeinträge nicht. Sie sind mit dem tatsächlichen Artikel abgeglichen; Gallery-/Observer-Skripte und Styles werden beim Neubau erhalten. Neue Autorenänderung: 21. November. Der alte Widerspruch „Chronik bis 19., Metadaten vom 15.“ ist damit behoben.
3. Behind-Projects-/Longbow-Generatoren unterstützen eigene Änderungsdaten; Museumsgenerator setzt auch Open-Graph-Änderungsdaten korrekt. Speichermedien behalten das tatsächliche Datum 20. November. Dessen Wortzählung wurde beim Neubau korrigiert.
4. Audio-Generator aktualisiert bestehende Spezifikationen an ihrer Position. Museumsintegrationen bewahren Standardkarten ohne Zusatz-Badges; die Speichermedien-Integration verschiebt ihren bestehenden RSS-Quelleneintrag nicht mehr bei jedem Build nach ganz oben. Eigener Fixture-Test prüft beide Archive und zwei Wiederholungen.
5. Archive enthalten je 67 Karten/ItemList-Einträge. Falsche Navigationszahlen korrigiert: Desktop/Terminal 15 statt 12, System/Diagnose 06 statt 05. Beide RSS-Feeds enthalten 67 Artikel.
6. Der tatsächlich abgelaufene Arch-debuginfod-Link (HTTP 404) im RX-Bericht wurde als Link entfernt; die historische Build-ID bleibt erhalten. Ein gepinnter Khronos-Upstream-Quelltext ist als zusätzliche Referenz gekennzeichnet und ersetzt nicht den ursprünglichen Arch-Buildbeleg. Die nicht abrufbare dyn.manpages-Adresse im Oktober-nginx-Bericht wurde durch die normale Debian-Manpage ersetzt.
7. Ein nginx-Screenshot war mit 1587×886 statt tatsächlich 1587×1027 ausgezeichnet. Beide Sprachseiten sind korrigiert; 22 bisher unbemaßte lokale Bildverweise in bereits bearbeiteten Berichten erhielten ihre tatsächlichen Abmessungen. Der abschließende Header-Abgleich prüfte 490 Bildverweise auf 250 lokale Rasterdateien ohne verbliebene Abweichung über 3 %; [Bildprüfung](image-checks.json). Bilder selbst unverändert.

Alle 134 Seiten besitzen die geprüfte Canonical-/hreflang-Paarigkeit, individuelle Titel/Beschreibungen und eine H1. Der lokale Inventurcheck meldet **0 Fehler**. Der repositoryweite SEO-Check meldet **0 Validierungsfehler**, keine kaputten crawlbaren internen Links und keine fehlenden Alt-Attribute. Optionale Schema-Felder wie `publisher`/`image` wurden dort, wo sie fehlen, protokolliert und nicht bloß für SEO künstlich ergänzt. Dies ist kein vollständiger Nu-/W3C-HTML-Konformitätsnachweis.

## Bilder im Spielearchiv

| Einträge pro Sprache | Anzahl |
| --- | ---: |
| Insgesamt | 99 |
| Mit Bildzuordnung | 79 |
| Spielaufnahmen | 30 |
| Cover | 1 |
| Offizielles Motiv | 1 |
| Logos | 39 |
| Referenzbilder | 8 |
| Ohne eingebundenes Bild | 20 |

79 bebilderte Titel bedeutet nicht 79 authentische Gameplay-Screenshots. Die bestehenden Bezeichnungen als Logo, Referenz, Verpackungsfoto oder Aufnahme bleiben erhalten. Die 20 fehlenden Titel wurden nicht durch Stockbilder ersetzt:

- Lotus Turbo Challenge
- Wings (Cinemaware)
- Archer Maclean's Pool
- Super Turrican
- The Ren & Stimpy Show: Veediots!
- Microsoft Flight Simulator 3.0
- Test Drive
- International Karate+ (IK+)
- Rick Dangerous
- Wings of Fury
- Duke Nukem II
- Wolfenstein 3D
- Hexen: Beyond Heretic
- Raptor: Call of the Shadows
- Primal Rage
- Mad TV
- Turok: Dinosaur Hunter
- Aces of the Deep
- Silent Hunter / Silent Hunter III
- Assetto Corsa Competizione

## Links und Primärquellen

**835 unterschiedliche externe Artikel-URLs** per HTTP-GET geprüft: 812×200, 17×403, 3×429, 2×503 und 1 Timeout. Im finalen Bestand wurde kein HTTP-404-Link mehr gefunden. 403/429/503 und Timeouts beweisen keinen toten Link; diese 23 Fälle bleiben im [HTTP-Protokoll](external-links.json) ausdrücklich als eingeschränkt prüfbar erfasst. Die Prüfung folgt Weiterleitungen, ist auf die ersten 2 MB begrenzt und innerhalb dieses Audits zwischengespeichert. Erreichbarkeit beweist keine inhaltliche Richtigkeit oder umfassende Bildnutzungsrechte.

Wichtige inhaltlich geprüfte Primärbelege:

| Thema | Primärbeleg und Ergebnis |
| --- | --- |
| Epic | [Linux-Launcher](https://launcher.epicgames.com/), [Release Notes](https://launcher.epicgames.com/release-notes), offizielle Fortnite-FAQ; genaue im Artikel verwendete URLs zusätzlich im Inventar |
| KDE | [Plasma 6.8.3](https://kde.org/announcements/plasma/6/6.8.3/) und [Changelog](https://kde.org/announcements/changelogs/plasma/6/6.8.2-6.8.3/) |
| Ubuntu | [Bug-Aufgaben](https://api.launchpad.net/1.0/bugs/2169738/bug_tasks), offizielle Source-/Binary-Publishing-APIs und Paket-Changelog/`postrm`; konkrete IDs und Grenzen in [ubuntu-openssh.evidence.json](../../content/linux-news/ubuntu-openssh.evidence.json) |
| nginx | [Offizielle Advisories](https://nginx.org/en/security_advisories.html), [Debian DSA-6642-1](https://www.debian.org/security/2026/dsa-6642), [Debian-Tracker](https://security-tracker.debian.org/tracker/source-package/nginx) |
| APT | [Debian-Tracker CVE-2026-109518](https://security-tracker.debian.org/tracker/CVE-2026-109518) |
| Radeon/Mesa | [26.2.6](https://docs.mesa3d.org/relnotes/26.2.6.html), [26.2.7](https://docs.mesa3d.org/relnotes/26.2.7.html), [26.3.1](https://docs.mesa3d.org/relnotes/26.3.1.html); kein daraus abgeleiteter Beweis für Dennis’ konkreten Busverlust |
| NVIDIA | [Trixie-Paket](https://packages.debian.org/trixie/nvidia-driver), 550.163.01-2; Upstream-Version und Distro-Paket nicht verwechselt |
| Microsoft ESU | Deutsche/EEA-Consumer-ESU-Dokumentation und verlinkter KB5126256; Konto-/Regionbedingungen statt weltweiter Pauschalaussage |
| Kernel-KI | OpenAI-Originalveröffentlichung „A thousand fewer paths to root“, 4. November; unterschiedliche Forschungszählungen und Offenlegungsgrenzen |
| GOG | Offizielle Linux-/Galaxy-Ankündigung und Jubiläumsbeitrag; kein belegter genauer Tag oder fertiges Linux-Paket |
| IBM | IBM-Newsroom-Ankündigung vom 24. August zum Dual-ISA-Prozessor; Konzeptmerkmale gegenüber Verfügbarkeit getrennt |
| Eigene Projekte | Aktuelle README/PROJECT_STATE von BoringOS, Source2Reel und Windows Telemetry Inspector im Autoren-Repository geprüft |
| Historische Technik | Bereits belegte Intel-/NASA-/INSAG-7-/SGI-Quellen, originale Programme und ausdrücklich begrenzte Museumsmodelle erhalten |
| Persönliche Ergebnisse | Direkte Bestätigung von Dennis am 21. November; sieben Video-Metadaten über YouTube-oEmbed |

Die Tabelle ist eine Auswahl; vollständige tatsächlich vorhandene Quell-URLs stehen pro Artikel im Inventar. HTTP-200 allein wurde nicht als Faktenprüfung aller Aussagen einer Quelle behandelt.

## Tests und Grenzen

- **195 gezielte Blog-/SEO-/Generator-Tests bestanden, 0 fehlgeschlagen.** Auswahl: Linux News, Deep Dives, Audio, RSS, Sitemaps/Sitemapgenerator, persönliche Chroniken, Museums-Blog-Integration, Gaming Journey, Museumsartikel, Jurassic-Blog, Cthulhu-Konfiguration, Distro-Finder, Konverter-SEO, Tor-Guide, BoringOS-SEO, SEO-Lokalisierung.
- **8 Apollo-Integrationstests separat im echten Git-Checkout bestanden.** Der breite Archivkopie-Lauf besitzt keine `.git`-Historie; sein Git-abhängiger Apollo-Test war dadurch nicht ausführbar.
- Breiter MJS-Lauf auf `40ab19b3bcd37e426301e06dda2302814d848cfc`: **2124 Tests, 2114 bestanden, 10 fehlgeschlagen**. Identischer Lauf des unveränderten Ausgangsstands: 2122 Tests, 2106 bestanden, 16 fehlgeschlagen. Sechs zuvor fehlschlagende Prüfungen wurden behoben. Das ist keine vollständig grüne Repository-Gesamtsuite. Details und Fundstellen: [verification.json](verification.json).
- Die zehn Befunde dieses breiten Laufs: ein Git-Kontextproblem (oben separat erfolgreich nachgeprüft), ein fehlendes Python-Modul `py7zr`, Museums-/BBS-/SGI-Katalogerwartungen, Museums-Neubau mit veränderter Katalog-Metadatenreihenfolge, drei Roman-Landingpage-Erwartungen sowie zwei veraltete Cable-Observer-Testdaten (26. Juli/105 Punkte gegenüber 21. November/195 Punkten). Diese nicht durch den Blog-Audit eingeführten Inhalte wurden nicht umgeschrieben, um den Lauf künstlich grün zu machen.
- Nach dem breiten Lauf ergänzte kleine Karten-/Bildkorrekturen sind durch die finale gezielte Suite geprüft. Der breite Lauf wurde danach nicht als erfolgreicher Lauf des letzten Commits ausgegeben.
- **134 öffentliche Sprachseiten im Desktop-Browser besucht**, beide Archive vollständig. Quiz, WM-Konfigurator, Dual-Boot-Stopp, Gaming-Suche/-Filter/-Modal, WoW-Galerie/Observer und echter Konverterexport geprüft. Diese Live-Prüfung betrifft den Worldnode-Stand vor dem noch ausstehenden Pull. Die neuen Dateien wurden lokal statisch und mit Node geprüft.
- Mobile Darstellung statisch auf responsive Regeln geprüft; **keine mobile Browser-Laufzeitprüfung** möglich. Lokaler Chromium-Start scheiterte an Sandbox-Sockets, Cloud-Chrome erreicht das Workspace-Localhost nicht. Kein angeblicher Erfolg auf einer nicht gestarteten Vorschau.
- Keine tatsächliche Linux-Neuinstallation, Nix-/GHC-Kompilierung, Hardware- oder Gaming-Messung durch den Worker. Persönliche Messwerte stammen aus belegten früheren Resultaten oder der neuen Autorenbestätigung.

Live-Details: [browser-checks.json](browser-checks.json). Reproduzierbare lokale Inventur:

```sh
python docs/blog-audit-2026-11-21/collect_inventory.py
node scripts/audit-seo.mjs
node scripts/generate-blog-rss.mjs --check
```

Tests mit Generator-Seiteneffekten nacheinander (`--test-concurrency=1`) und breite Läufe in einer separaten Kopie ausführen. Der Collector liest Artikel und lokale Referenzen; er führt keine Diagnosebefehle aus den Artikeln aus.

## Begründet offene Punkte

- Longbow: Schutzfehler noch nicht diagnostiziert; Neuinstallation, erneuter Onboard-Sound-Versuch und funktionierender Digitalton warten auf echte Resultate. Keine weitere Rückfrage nötig, bevor diese Arbeiten passiert sind.
- RX: vorläufig abgeschlossen. Kein genaues Einbaudatum oder vollständiges Kernel-/Mesa-Verlaufsprotokoll nachgereicht; deshalb keine erfundene Gesamtbetriebsdauer. Spätere NixOS-/Gentoo-/XMonad-Vergleiche erst nach tatsächlichem Test ergänzen.
- WoW: Bibliothek noch nicht gelaufen; kein Ergebnis vorweggenommen. Neue Drops/Berufefortschritte wurden nicht erfunden.
- Snakkie: v0.4 und die vorhandenen Benchmarkdaten stehen bereits im Artikel; keine neue Messung/Implementierungsänderung bestätigt, daher kein künstliches Update.
- Spielebilder: 20 fehlende Titel; zahlreiche vorhandene Bilder sind Logos/Referenzen. Dieser Audit zählt und dokumentiert die Lücken, er beschafft nicht ohne Freigabe beliebiges Ersatzmaterial.
- NixOS 26.11 nach tatsächlicher Veröffentlichung erneut prüfen; am Stichtag keine Veröffentlichung vorweggenommen. Für GOG fehlt weiterhin ein genauer offizieller Verfügbarkeitstermin.
- notice-facile: Gegenartikel für 28. November angekündigt; keine bereits erfolgte Gegenverlinkung behauptet.
- 23 externe HTTP-Prüfungen eingeschränkt; mobile Laufzeitprüfung und vollständig grüne Repository-Suite bleiben offen.

## Commits und Veröffentlichung

Die geprüften Änderungen wurden über die GitHub-Schnittstelle in zusammengehörigen Commits auf Basis der vorhandenen Historie bereitgestellt. Die jüngsten World-Observer-Commits bleiben erhalten. Lokale Prüf-Hashes und veröffentlichte Hashes unterscheiden sich wegen der neuen Basis und der GitHub-Commit-Erstellung; ihre Zuordnung steht in [publication.json](publication.json).

- [`9356b04d7`](https://github.com/dennishilk/dennishilk.github.io/commit/9356b04d766a4d344efa6784c80410bad2df6783) blog: refresh Epic Plasma and Ubuntu status with primary evidence
- [`6adbd6376`](https://github.com/dennishilk/dennishilk.github.io/commit/6adbd637613bed329dfda51d39b3084c9aa8b34c) blog: document confirmed RX WoW and Longbow progress without losing history
- [`0533dc337`](https://github.com/dennishilk/dennishilk.github.io/commit/0533dc337620cca54b5ceb0d85c51a4cbf8b091e) blog: connect Linux guides and keep rebuild metadata and archive cards consistent
- [`c4043d360`](https://github.com/dennishilk/dennishilk.github.io/commit/c4043d360603980e6bc944d2d07b799695667e46) blog: preserve archive order and shared cards across museum rebuilds
- [`bedcc378c`](https://github.com/dennishilk/dennishilk.github.io/commit/bedcc378c7348f4a23394259ac2b9ee9f1eda499) blog: correct screenshot dimensions and reserve image layout space
- [`6ae6b2b68`](https://github.com/dennishilk/dennishilk.github.io/commit/6ae6b2b68f3db89044c0e02dd8a10e5cec9032d5) blog: align nginx social modification dates with corrected screenshots

Die abschließende Dokumentation integriert diese Commits mit dem World-Observer-Stand `71392ec232a29251a6ace976272668df6ac25e28` auf `main`. Der Dokumentations-/Integrationscommit ist über die Git-Historie dieses Ordners nachvollziehbar; die Abschlussantwort nennt den verifizierten Remote-Hash. Worldnode wurde nicht deployt.

Vor dem Live-Pull zuerst auf Worldnode prüfen:

```sh
git -C /srv/www/dennishilk.github.io status --short --branch
```

Anschließend Remote aktualisieren und Commitdifferenzen prüfen. Nur bei passendem Zustand `git pull --ff-only origin main`; bei lokalen World-Observer-Commits diese erhalten und die Divergenz nachvollziehbar lösen. Keine History verwerfen.

## Vollständiges Protokoll aller 67 Artikelpaare

P1 = zuerst geprüfte zeitabhängige oder persönliche Hauptartikel; P2 = technische Ratgeber; P3 = historische/persönliche Bestandsprüfung. Alle Zeilen enthalten dieselben Grundprüfungen zu Metadaten, Paarigkeit, lokalen Pfaden, Bildverweisen und Quellen. Veröffentlichung/Änderungsdaten sowie vollständige Pfade und Metadaten stehen im Inventar.

| # | Deutsch / English | Priorität / Ergebnis | Artikelbezogene Prüfung |
| ---: | --- | --- | --- |
| 1 | [apollo-11-computer-mondlandung](https://www.dennishilk.com/de/blog/apollo-11-computer-mondlandung/) · [EN](https://www.dennishilk.com/blog/apollo-11-guidance-computer-moon-landing/) | P3 · Geprüft, HTML unverändert | AGC/DSKY, 1201/1202 und Quellen gegenüber dem ausdrücklich vereinfachten Museumsmodell abgegrenzt; echte Bildschirmaufnahmen bleiben erhalten. |
| 2 | [apt-cve-2026-109518](https://www.dennishilk.com/de/blog/apt-cve-2026-109518/) · [EN](https://www.dennishilk.com/blog/apt-cve-2026-109518/) | P1 · Geprüft, HTML unverändert | Debian-Tracker bestätigt Trixie-Fix 3.0.4 und Bookworm-Fix 2.6.2; keine pauschale Entwarnung für andere Paketstände. |
| 3 | [arch-linux-dwm-cthulhu](https://www.dennishilk.com/de/blog/arch-linux-dwm-cthulhu/) · [EN](https://www.dennishilk.com/blog/arch-linux-dwm-cthulhu/) | P2 · Geprüft, HTML unverändert | Arch/dwm/X11 entspricht dem belegten aktuellen Setup; benutzerspezifische Installation und Rückweg bleiben beschrieben. |
| 4 | [bilder-ohne-upload-konvertieren](https://www.dennishilk.com/de/blog/bilder-ohne-upload-konvertieren/) · [EN](https://www.dennishilk.com/blog/convert-images-without-upload/) | P3 · Geprüft, HTML unverändert | JPG/PNG/WebP-Ausgabe, AVIF nur als browserabhängige Eingabe; Live-WebP→PNG mit Resize und Download erfolgreich. |
| 5 | [cthulhu-linux-geschichte](https://www.dennishilk.com/de/blog/cthulhu-linux-geschichte/) · [EN](https://www.dennishilk.com/blog/cthulhu-linux-journey/) | P2 · DE/EN aktualisiert | Datierter Hinweis trennt die ursprüngliche NixOS-/Plasma-Etappe vom heutigen Arch/dwm; historische Bilder und Erinnerungen erhalten. |
| 6 | [darknet-tor-onion-services](https://www.dennishilk.com/de/blog/darknet-tor-onion-services/) · [EN](https://www.dennishilk.com/blog/darknet-tor-onion-services/) | P3 · Geprüft, HTML unverändert | Guard/Middle/Exit und Onion-Rendezvous getrennt, HTTPS-/Korrelationsgrenzen korrekt; historische Länderberichte werden nicht als Live-Messung ausgegeben. Mehrere Tor-Quellen im HTTP-Checker 403. |
| 7 | [dateien-linux-loeschen-hdd-ssd](https://www.dennishilk.com/de/blog/dateien-linux-loeschen-hdd-ssd/) · [EN](https://www.dennishilk.com/blog/delete-files-linux-hdd-ssd/) | P2 · Geprüft, HTML unverändert | HDD-Überschreiben nur unter passenden Bedingungen, SSD-Wear-Leveling/TRIM ohne Löschgarantie; keine falsche Secure-Erase-Funktion zugesagt. |
| 8 | [debian-13-nginx-sicherheitsluecken](https://www.dennishilk.com/de/blog/debian-13-nginx-sicherheitsluecken/) · [EN](https://www.dennishilk.com/blog/debian-13-nginx-security-update/) | P1 · DE/EN aktualisiert | Oktoberbericht bleibt historisch; sichtbarer Anschluss an November/DSA-6642-1 und bestätigte TLS-Reaktivierung. Nicht abrufbare dyn.manpages-Adresse durch Debian-Handbuch ersetzt. |
| 9 | [diskette-zip-cd-usb-speichermedien](https://www.dennishilk.com/de/blog/diskette-zip-cd-usb-speichermedien/) · [EN](https://www.dennishilk.com/blog/floppy-disk-zip-cd-usb-storage-history/) | P3 · DE/EN aktualisiert | Geschichte und notice-facile-Link erhalten; Gegenartikel am 28. November weiterhin nur angekündigt. Wortzählung beim Neubau korrigiert und vorhandenes Änderungsdatum 20. November bewahrt. |
| 10 | [dunst-konfigurieren](https://www.dennishilk.com/de/blog/dunst-konfigurieren/) · [EN](https://www.dennishilk.com/blog/configure-dunst/) | P2 · Geprüft, HTML unverändert | Dunstrc-Beispiele, Theme, Benachrichtigungstest und Paketweg geprüft; keine bestätigte relevante neue Syntaxänderung. |
| 11 | [eigenes-betriebssystem-boringos](https://www.dennishilk.com/de/blog/eigenes-betriebssystem-boringos/) · [EN](https://www.dennishilk.com/blog/build-your-own-os-boringos/) | P3 · Geprüft, HTML unverändert | README auf main bestätigt 0.0.62-dev/M68, unabhängigen Kernel, USB/HID und physische 1080p-Abnahme; Artikel trennt spätere Optimierungen von physischer Bestätigung. |
| 12 | [epic-games-launcher-linux-fortnite](https://www.dennishilk.com/de/blog/epic-games-launcher-linux-fortnite/) · [EN](https://www.dennishilk.com/blog/epic-games-launcher-linux-fortnite/) | P1 · DE/EN aktualisiert | Update oben: Preview 0.120.0 vom 20. November, AppImage/.deb und Fedora ≥43; Chronik ergänzt, originaler Arch-Test bleibt datiert. Fortnite weiter nicht Linux-freigegeben. |
| 13 | [fastfetch-konfigurieren](https://www.dennishilk.com/de/blog/fastfetch-konfigurieren/) · [EN](https://www.dennishilk.com/blog/configure-fastfetch/) | P2 · DE/EN aktualisiert | Aktueller Arch-/dwm-Kontext über den Kitty-Screenshot verknüpft; ältere NixOS-Aufnahmen nicht umetikettiert. |
| 14 | [fish-shell-einstieg](https://www.dennishilk.com/de/blog/fish-shell-einstieg/) · [EN](https://www.dennishilk.com/blog/fish-shell-beginners/) | P3 · DE/EN aktualisiert | Konkretes fish-Beispiel für XDG_DATA_HOME ergänzt; Bash-Parameterexpansion ausdrücklich unterschieden und Epic-Runtime-Bezug hergestellt. |
| 15 | [git-pull-divergierende-branches](https://www.dennishilk.com/de/blog/git-pull-divergierende-branches/) · [EN](https://www.dennishilk.com/blog/git-pull-diverging-branches/) | P3 · Geprüft, HTML unverändert | Status/Commitvergleich vor Rebase, ff-only-Grenzen und Commit-Erhalt geprüft; kein pauschaler Reset oder Force-Push empfohlen. |
| 16 | [gog-galaxy-linux-wing-commander-prophecy](https://www.dennishilk.com/de/blog/gog-galaxy-linux-wing-commander-prophecy/) · [EN](https://www.dennishilk.com/blog/gog-galaxy-linux-wing-commander-prophecy/) | P2 · Geprüft, HTML unverändert | GOG-Ankündigung bestätigt Linux-Pläne/2027, ohne exakten Downloadtermin; vorhandenen Wing-Commander-Test erhalten, kein unbestätigtes Galaxy-Paket behauptet. |
| 17 | [gruvnode-x1-carbon-xmonad](https://www.dennishilk.com/de/blog/gruvnode-x1-carbon-xmonad/) · [EN](https://www.dennishilk.com/blog/gruvnode-x1-carbon-xmonad/) | P2 · Geprüft, HTML unverändert | Historisches X1-Carbon-/XMonad-Setup ist vom X1 Yoga und Cthulhu getrennt; keine nachträgliche Umdeutung des Geräts. |
| 18 | [how-fast-can-your-computer-crack-a-password](https://www.dennishilk.com/de/blog/how-fast-can-your-computer-crack-a-password/) · [EN](https://www.dennishilk.com/blog/how-fast-can-your-computer-crack-a-password/) | P2 · Geprüft, HTML unverändert | SHA-256-Lernhash, Kandidatenzahlen, CPU/GPU/Hybrid und echte Messung gegenüber Argon2/passwortgeschützten Dateien abgegrenzt; keine erfundenen Raten. |
| 19 | [i-built-my-own-cryptocurrency](https://www.dennishilk.com/de/blog/i-built-my-own-cryptocurrency/) · [EN](https://www.dennishilk.com/blog/i-built-my-own-cryptocurrency/) | P3 · Geprüft, HTML unverändert | Nebucoin bleibt abgeschaltetes Experiment 2018/19; didaktische Rekonstruktion, unsichere Parameter und Wallet/Node/Pool korrekt getrennt. |
| 20 | [ibm-z-arm-dual-isa-prozessor](https://www.dennishilk.com/de/blog/ibm-z-arm-dual-isa-prozessor/) · [EN](https://www.dennishilk.com/blog/ibm-z-arm-dual-isa-processor/) | P3 · Geprüft, HTML unverändert | IBM-Primärmeldung bestätigt Konzept: elf Dual-ISA-Kerne/2 nm, beide ISAs nativ; keine Kaufverfügbarkeit oder eigene Hardwaremessung behauptet. |
| 21 | [imsai-8080-wargames-computer](https://www.dennishilk.com/de/blog/imsai-8080-wargames-computer/) · [EN](https://www.dennishilk.com/blog/imsai-8080-wargames-computer/) | P3 · Geprüft, HTML unverändert | Intel-8080-Beispiel 3E 2A 32 00 02 76 ausgeführt: schreibt 42 nach 0200 und hält; Filmtechnik vom separaten WarGames-Modell abgegrenzt. |
| 22 | [janes-ah64d-longbow-1996-big-box-retro-pc](https://www.dennishilk.com/de/blog/janes-ah64d-longbow-1996-big-box-retro-pc/) · [EN](https://www.dennishilk.com/blog/janes-ah64d-longbow-1996-retro-pc/) | P1 · DE/EN aktualisiert | Autor bestätigt 8-GB-FAT32-Stick und aktuellen Windows-Schutzfehler; frisches Win98 SE/Onboard-Sound nur geplant. Originalfotos/20.-November-Stand erhalten; UniSound/Digitalton weiterhin unbestätigt. |
| 23 | [journalctl-linux-fehler-finden](https://www.dennishilk.com/de/blog/journalctl-linux-fehler-finden/) · [EN](https://www.dennishilk.com/blog/journalctl-linux-troubleshooting/) | P2 · Geprüft, HTML unverändert | Boot-/Unit-Filter, vorige Boots, Berechtigungen und flüchtige/persistente Journale nachvollziehbar; Diagnosebeispiele sind keine Garantie einer konkreten Ursache. |
| 24 | [jurassic-park-unix-system-sgi-fsn](https://www.dennishilk.com/de/blog/jurassic-park-unix-system-sgi-fsn/) · [EN](https://www.dennishilk.com/blog/jurassic-park-unix-sgi-fsn/) | P3 · Geprüft, HTML unverändert | fsn/IRIX/SGI-Fakten und echte Museumsaufnahmen erhalten; Rekonstruktion nicht als Filmsoftware ausgegeben. Karten-Generator an bestehenden Standardstil angeglichen. |
| 25 | [kde-plasma-6-8-wayland-x11-xwayland](https://www.dennishilk.com/de/blog/kde-plasma-6-8-wayland-x11-xwayland/) · [EN](https://www.dennishilk.com/blog/kde-plasma-6-8-wayland-x11-xwayland/) | P1 · DE/EN aktualisiert | Update oben: Plasma 6.8.3 vom 10. November mit relevanten Fehlerkorrekturen; X11-Sitzung und XWayland getrennt. Historische Distro-Tabelle bleibt datiert. |
| 26 | [ki-linux-kernel-948-schwachstellen](https://www.dennishilk.com/de/blog/ki-linux-kernel-948-schwachstellen/) · [EN](https://www.dennishilk.com/blog/ai-linux-kernel-948-vulnerabilities/) | P2 · Geprüft, HTML unverändert | OpenAI-Primärbericht bestätigt Forschung und Zählweisen; Kandidaten, dynamisch validierte Fälle und LPEs nicht vermischt. Kein unbelegter vollständiger Patchstatus ergänzt. |
| 27 | [ki-prompt-google-search-console](https://www.dennishilk.com/de/blog/ki-prompt-google-search-console/) · [EN](https://www.dennishilk.com/blog/ai-prompt-google-search-console/) | P3 · Geprüft, HTML unverändert | Originaler Screenshot, null Klicks und Unterschied zwischen Impression und Besuch erhalten; keine Identität oder Absicht aus Suchanfrage erfunden. |
| 28 | [kitty-konfigurieren](https://www.dennishilk.com/de/blog/kitty-konfigurieren/) · [EN](https://www.dennishilk.com/blog/configure-kitty/) | P2 · Geprüft, HTML unverändert | Bereits vorhandenes oberes Update mit Cthulhu-Bild vom 21. November und Fastfetch-Link erhalten; keine unnötige neue Datierung. |
| 29 | [linux-audio-fehler-beheben](https://www.dennishilk.com/de/blog/linux-audio-fehler-beheben/) · [EN](https://www.dennishilk.com/blog/linux-audio-troubleshooting/) | P2 · Geprüft, HTML unverändert | PipeWire/WirePlumber/ALSA und historisches SPDIF-Skript getrennt; Tests prüfen alle 14 Einstiege/496 Pfade. Generator behält Artikelpositionen statt Umordnung. |
| 30 | [linux-framebuffer-cisco-telefon-doom](https://www.dennishilk.com/de/blog/linux-framebuffer-cisco-telefon-doom/) · [EN](https://www.dennishilk.com/blog/linux-framebuffer-cisco-phone-doom/) | P2 · Geprüft, HTML unverändert | Firmware-Framebuffer, USB-Stick/Terminal und echte Aufnahme geprüft; kein nativer allgemeiner GPU-Treiber oder frei installierbares Telefon-OS versprochen. |
| 31 | [linux-gaming-steam-proton-lutris](https://www.dennishilk.com/de/blog/linux-gaming-steam-proton-lutris/) · [EN](https://www.dennishilk.com/blog/linux-gaming-steam-proton-lutris/) | P2 · DE/EN aktualisiert | Gezielte Verweise auf Epic, GOG und WoW ergänzt; Launcher-Unterstützung, Wine/Proton und Anti-Cheat-Grenzen getrennt. Keine allgemeinen Spieltests aus Einzelberichten abgeleitet. |
| 32 | [linux-konfiguration-sichern](https://www.dennishilk.com/de/blog/linux-konfiguration-sichern/) · [EN](https://www.dennishilk.com/blog/backup-linux-configuration/) | P2 · Geprüft, HTML unverändert | Archivumfang, Restore-Rückweg und Grenzen des persönlichen Cthulhu-Skripts geprüft; kein vollständiges Systembackup behauptet. |
| 33 | [linux-laufwerke-uuid-mount-rechte](https://www.dennishilk.com/de/blog/linux-laufwerke-uuid-mount-rechte/) · [EN](https://www.dennishilk.com/blog/linux-drives-uuid-mount-permissions/) | P2 · Geprüft, HTML unverändert | UUID/fstab/Rechte und Nur-Lesen-Prüfung einschließlich ext4-Journalwiederholung unterschieden; keine erfundenen Gerätekennungen empfohlen. |
| 34 | [linux-neben-windows-11-installieren](https://www.dennishilk.com/de/blog/linux-neben-windows-11-installieren/) · [EN](https://www.dennishilk.com/blog/linux-windows-dual-boot-guide/) | P2 · Geprüft, HTML unverändert | UEFI/EFI, BitLocker, Backups und Entfernungsszenarien geprüft; Live-Assistent stoppt bei Legacy/CSM-Konflikt. Keine echten Datenträger verändert. |
| 35 | [linux-updates-verstehen](https://www.dennishilk.com/de/blog/linux-updates-verstehen/) · [EN](https://www.dennishilk.com/blog/linux-updates-explained/) | P2 · Geprüft, HTML unverändert | APT update/upgrade, pacman -Syu, DNF und NixOS-Generationen getrennt; vollständige Rolling-Updates, Sicherheitsupdates und Rückwege passend erklärt. |
| 36 | [linux-virtuelle-maschine-kvm-virt-manager](https://www.dennishilk.com/de/blog/linux-virtuelle-maschine-kvm-virt-manager/) · [EN](https://www.dennishilk.com/blog/linux-virtual-machine-kvm-virt-manager/) | P2 · Geprüft, HTML unverändert | KVM/libvirt/virt-manager-Pakete, Benutzerrechte und virtualisierte Umgebung getrennt; Beispiele geprüft, keine komplette Gastinstallation auf dieser Umgebung behauptet. |
| 37 | [linux-wm-konfigurator](https://www.dennishilk.com/de/blog/linux-wm-konfigurator/) · [EN](https://www.dennishilk.com/blog/linux-window-manager-config-generator/) | P2 · Geprüft, HTML unverändert | Live Arch+dwm erzeugt Paketplan/config.h; doppelte Taste liefert Fehlermeldung. Codebeispiele und grundlegende Startbindungen geprüft; keine lokale Haskell-/WM-Sitzung ausgeführt. |
| 38 | [lokale-ki-ohne-gpu-snakkie](https://www.dennishilk.com/de/blog/lokale-ki-ohne-gpu-snakkie/) · [EN](https://www.dennishilk.com/blog/local-ai-without-gpu-snakkie/) | P3 · Geprüft, HTML unverändert | v0.4 und vorhandene Qwen3-0.6B/1.7B-CPU-Messungen bereits enthalten; Modell, Wissensbestand, Websuche und Fallback getrennt. Keine neuen Autorenmessungen geliefert. |
| 39 | [mediatek-mt7612u-linux-treiber-probleme](https://www.dennishilk.com/de/blog/mediatek-mt7612u-linux-treiber-probleme/) · [EN](https://www.dennishilk.com/blog/mediatek-mt7612u-linux-driver-troubleshooting/) | P2 · Geprüft, HTML unverändert | mt76/mt76x2u, Firmware, USB-ID, Distributionen und Diagnosebefehle geprüft; kein pauschaler externer Realtek-Treiber und keine generische Hardware-Erfolgsgarantie. |
| 40 | [meine-spiele-von-damals-bis-heute](https://www.dennishilk.com/de/blog/meine-spiele-von-damals-bis-heute/) · [EN](https://www.dennishilk.com/blog/my-gaming-journey-1984-2026/) | P3 · Geprüft, HTML unverändert; Bildmanifest ergänzt | 99 Titel pro Sprache, 79 bebildert: 30 Spielaufnahmen, 1 Cover, 1 Motiv, 39 Logos, 8 Referenzbilder; 20 fehlen. Provenienz eines vorhandenen WoW-Originalbilds ergänzt. Suche/Filter/Modal live geprüft. |
| 41 | [nebuverse-gotosocial-selbst-hosten](https://www.dennishilk.com/de/blog/nebuverse-gotosocial-selbst-hosten/) · [EN](https://www.dennishilk.com/blog/nebuverse-self-hosting-gotosocial/) | P3 · Geprüft, HTML unverändert | Host-/Account-Domain, nginx, systemd, SQLite und Backup-/Upgrade-Abgrenzung geprüft. Historische Instanzversion nicht durch unbekannten heutigen Runtime-Stand ersetzt; kein neues Backup-Erfolgserlebnis erfunden. |
| 42 | [nginx-sicherheitsluecken-november-2026-debian-13](https://www.dennishilk.com/de/blog/nginx-sicherheitsluecken-november-2026-debian-13/) · [EN](https://www.dennishilk.com/blog/nginx-security-november-2026-debian-13/) | P1 · DE/EN aktualisiert | nginx-Advisories und DSA-6642-1 bestätigen Trixie 1.26.3-3+deb13u11; bestätigte lokale Installation, TLS-Reaktivierung und vier HTTP-200-Tests vom 19. November erhalten. |
| 43 | [nixos-configuration-nix-verstehen](https://www.dennishilk.com/de/blog/nixos-configuration-nix-verstehen/) · [EN](https://www.dennishilk.com/blog/nixos-configuration-nix-explained/) | P3 · Geprüft, HTML unverändert | Module, Dienste, Pakete und rebuild-Beispiele geprüft; 26.11 am Stichtag nicht als fertige Veröffentlichung behandelt. Nach tatsächlicher Veröffentlichung erneut prüfen. |
| 44 | [nixos-generationen-rollback](https://www.dennishilk.com/de/blog/nixos-generationen-rollback/) · [EN](https://www.dennishilk.com/blog/nixos-generations-rollback/) | P3 · Geprüft, HTML unverändert | switch/boot/Rollback und Garbage Collection unterscheiden aktuelle, vorhandene und gelöschte Generationen; keine Wiederherstellung gelöschter Daten versprochen. |
| 45 | [nixos-xmonad-kanagawa-dragon](https://www.dennishilk.com/de/blog/nixos-xmonad-kanagawa-dragon/) · [EN](https://www.dennishilk.com/blog/nixos-xmonad-kanagawa-dragon/) | P2 · Geprüft, HTML unverändert | Gepinnte Modul-/Dateigrundlage, Abhängigkeiten und Installation geprüft; gezielte Cthulhu-Konfigurationssuite erfolgreich, keine echte NixOS-Neuinstallation ausgeführt. |
| 46 | [nvidia-treiber-debian-installieren](https://www.dennishilk.com/de/blog/nvidia-treiber-debian-installieren/) · [EN](https://www.dennishilk.com/blog/install-nvidia-drivers-debian/) | P3 · Geprüft, HTML unverändert | Offizielles Trixie-Paket 550.163.01-2, DKMS/Header, GPU-Auswahl und Secure-Boot-Hinweise geprüft. Nicht mit aktueller NVIDIA-Upstream-Version gleichgesetzt. |
| 47 | [picom-x11-konfigurieren](https://www.dennishilk.com/de/blog/picom-x11-konfigurieren/) · [EN](https://www.dennishilk.com/blog/configure-picom-x11/) | P2 · Geprüft, HTML unverändert | X11-Kontext, Backend/Regeln, Teststart und Rollback geprüft; nicht als Wayland-Compositor dargestellt. |
| 48 | [raymosaic-spiegel-licht-kunst](https://www.dennishilk.com/de/blog/raymosaic-spiegel-licht-kunst/) · [EN](https://www.dennishilk.com/blog/raymosaic-reflected-light-mirror-art/) | P3 · Geprüft, HTML unverändert | Reales Projekt/Dateigrundlage, Spiegelprinzip und eigene Illustrationen geprüft; keine neuen Messwerte, Fertigstellung oder Käuferdaten erfunden. |
| 49 | [rofi-konfigurieren](https://www.dennishilk.com/de/blog/rofi-konfigurieren/) · [EN](https://www.dennishilk.com/blog/configure-rofi/) | P2 · Geprüft, HTML unverändert | Rasi-Beispiele und X11-Startwege geprüft; Launcher nicht als alleinige Desktopumgebung oder pauschal native Wayland-Lösung dargestellt. |
| 50 | [rx-9060-xt-linux-abstuerze](https://www.dennishilk.com/de/blog/rx-9060-xt-linux-abstuerze/) · [EN](https://www.dennishilk.com/blog/rx-9060-xt-linux-crashes/) | P1 · DE/EN aktualisiert | Autorabschluss: −500 MHz bleibt, ca. 10 h War Thunder maximal/15 h WoW/mehre Kdenlive-Renders ohne Hardlock, OBS funktioniert. Mesa 26.2.6/26.2.7/26.3.1 getrennt eingeordnet; alte Messung bis 3016 MHz und abgelaufener Quelllink korrigiert. |
| 51 | [source2reel-github-erklaervideo-lokal](https://www.dennishilk.com/de/blog/source2reel-github-erklaervideo-lokal/) · [EN](https://www.dennishilk.com/blog/source2reel-github-local-explainer-video/) | P3 · Geprüft, HTML unverändert | Aktueller PROJECT_STATE-Abgleich: lokale Pipeline/evidenzbasierte Szenen, CPU-Kokoro und physische Abnahmen gegenüber späterem Planer-Code getrennt; keine unbestätigte neue Abnahme behauptet. |
| 52 | [spdif-tonverzoegerung-linux](https://www.dennishilk.com/de/blog/spdif-tonverzoegerung-linux/) · [EN](https://www.dennishilk.com/blog/fix-spdif-audio-delay-linux/) | P2 · DE/EN aktualisiert | Historisches Skript erhalten; gezielter Verweis zum aktuellen Audio-Guide mit getrennten PipeWire-/WirePlumber-Diagnosen und Rückweg ergänzt. |
| 53 | [ssh-schluessel-linux-server](https://www.dennishilk.com/de/blog/ssh-schluessel-linux-server/) · [EN](https://www.dennishilk.com/blog/ssh-keys-linux-server/) | P2 · Geprüft, HTML unverändert | Ed25519-Schlüssel, öffentliche/private Hälfte, Hostschlüssel, Agent und Zugangserhalt geprüft; keine Passwortanmeldung ohne getesteten Rückweg pauschal abgeschaltet. |
| 54 | [sway-konfiguration-verstehen](https://www.dennishilk.com/de/blog/sway-konfiguration-verstehen/) · [EN](https://www.dennishilk.com/blog/sway-configuration-explained/) | P2 · Geprüft, HTML unverändert | Config-Grundsyntax, Outputs, Terminal/Launcher/Leiste und Diagnose geprüft; X11-Programme via XWayland getrennt vom nativen Wayland-Sitzungsmodell. |
| 55 | [tschernobyl-rbmk-skala-kontrollraum](https://www.dennishilk.com/de/blog/tschernobyl-rbmk-skala-kontrollraum/) · [EN](https://www.dennishilk.com/blog/chernobyl-rbmk-skala-control-room/) | P3 · Geprüft, HTML unverändert | INSAG-7-Bezug, SKALA/DREG/PRIZMA und spätere Rekonstruktion gegenüber damaliger Anzeige getrennt; keine erfundenen Telemetriekurven oder bedienbare Kraftwerksanlage. |
| 56 | [ubuntu-26-10-openssh-fehler](https://www.dennishilk.com/de/blog/ubuntu-26-10-openssh-fehler/) · [EN](https://www.dennishilk.com/blog/ubuntu-26-10-openssh-bug/) | P1 · DE/EN aktualisiert | Bug 2169738 Fix Released und Quell-/amd64-Binärpublikationen 1:10.5p1-1ubuntu3.1 in Security/Updates geprüft; postrm-Schutz und alte rc-Skripte erklärt, Lösungsabschnitt oben ergänzt. |
| 57 | [von-windows-zu-linux-wechseln](https://www.dennishilk.com/de/blog/von-windows-zu-linux-wechseln/) · [EN](https://www.dennishilk.com/blog/windows-to-linux-migration-checklist/) | P2 · DE/EN aktualisiert | Konkrete Reihenfolge und Links zu Distro-Finder, Dual Boot und Linux-Updates ergänzt; Live-Test vor Datenträgeränderungen. |
| 58 | [warum-ich-nebu-heisse](https://www.dennishilk.com/de/blog/warum-ich-nebu-heisse/) · [EN](https://www.dennishilk.com/blog/why-im-called-nebu/) | P3 · DE/EN aktualisiert | Datierter Kontext trennt NixOS-/NEBUVERSE-Bericht vom 8. Oktober vom aktuellen Arch/dwm; persönliche Namens-/Motorrad-/WoW-Geschichte bleibt unverändert. |
| 59 | [waybar-konfigurieren](https://www.dennishilk.com/de/blog/waybar-konfigurieren/) · [EN](https://www.dennishilk.com/blog/configure-waybar/) | P2 · Geprüft, HTML unverändert | JSONC/CSS, Module und getrennte Sway-/XMonad-Kontexte geprüft; keine unbelegte aktuelle eigene Konfiguration hineingeschrieben. |
| 60 | [welche-linux-distribution-passt-zu-mir-2026](https://www.dennishilk.com/de/blog/welche-linux-distribution-passt-zu-mir-2026/) · [EN](https://www.dennishilk.com/blog/which-linux-distro-2026/) | P2 · Geprüft, HTML unverändert | 15-Fragen-Quiz live abgeschlossen, elf Ergebnisse und Neustart geprüft; 11 Distro-/12 Desktopprofile differenzieren Erfahrung, Sitzung und Wartung. Testergebnisse sind keine neuen Präferenzen des Autors. |
| 61 | [what-happens-when-you-open-a-website](https://www.dennishilk.com/de/blog/what-happens-when-you-open-a-website/) · [EN](https://www.dennishilk.com/blog/what-happens-when-you-open-a-website/) | P3 · Geprüft, HTML unverändert | DNS/Cache, TCP+TLS versus QUIC/UDP/TLS1.3, HTTP2/3 und Browserdarstellung technisch getrennt; reservierte IP und Lernsimulation klar gekennzeichnet. |
| 62 | [windows-10-esu-2027](https://www.dennishilk.com/de/blog/windows-10-esu-2027/) · [EN](https://www.dennishilk.com/blog/windows-10-esu-2027/) | P1 · Geprüft, HTML unverändert | Microsoft-Primärseiten/KB bestätigen Consumer-ESU-Zeitraum, Konto-/EEA-Voraussetzungen und 60-Tage-Regel; keine pauschale kommerzielle oder unbegrenzte Verlängerung behauptet. |
| 63 | [windows-netzwerkverkehr-analysieren](https://www.dennishilk.com/de/blog/windows-netzwerkverkehr-analysieren/) · [EN](https://www.dennishilk.com/blog/inspect-windows-network-traffic/) | P3 · Geprüft, HTML unverändert | Aktuelles Projekt-README bestätigt ETW, Windows11x64/.NET8, passiven Capture und Grenzen von DNS/Task-Korrelation; keine TLS-Entschlüsselung oder Blockierfunktion behauptet. |
| 64 | [wine-prefix-linux-spiele](https://www.dennishilk.com/de/blog/wine-prefix-linux-spiele/) · [EN](https://www.dennishilk.com/blog/wine-prefix-linux-games/) | P2 · DE/EN aktualisiert | Prefix-/Runner-Verantwortung und Verweis auf Launcher-Runtime ergänzt; Versionsdatei identifiziert Runtime, nicht beliebigen Prefixpfad. |
| 65 | [wow-forever-nebukatneza-dennis-hilk](https://www.dennishilk.com/de/blog/wow-forever-nebukatneza-dennis-hilk/) · [EN](https://www.dennishilk.com/blog/wow-forever-nebukatneza-dennis-hilk/) | P1 · DE/EN aktualisiert | Neue bestätigte Chronik: Level34 nach ca.25-min-AoE/OBS-Test, sechs Dungeon-Videos plus Stream; Bibliothek nur geplant. Alte Chronik/Galerie/Observer im Quellgenerator gesichert, dateModified21.November. |
| 66 | [xmonad-hs-verstehen](https://www.dennishilk.com/de/blog/xmonad-hs-verstehen/) · [EN](https://www.dennishilk.com/blog/xmonad-hs-explained/) | P2 · Geprüft, HTML unverändert | Haskell-Konfiguration, Terminal/Launcher und Bibliotheks-/Recompile-Anforderungen geprüft; historische Cthulhu-Beispiele nicht als heutiges dwm-Setup ausgegeben. |
| 67 | [zip-rar-7z-pdf-passwort-wiederherstellen](https://www.dennishilk.com/de/blog/zip-rar-7z-pdf-passwort-wiederherstellen/) · [EN](https://www.dennishilk.com/blog/recover-zip-rar-7z-pdf-password-without-upload/) | P2 · Geprüft, HTML unverändert | Implementierungsgrenzen, lokale File-APIs, Formatvarianten und unabhängige Bestätigung mit Quellcode/Tests abgeglichen; echte Cthulhu-Läufe erhalten, kein neuer GPU-Benchmark erfunden. |
