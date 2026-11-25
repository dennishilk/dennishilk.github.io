# WoW Forever: Level 40 und Paladin-Talentrechner

Stand: 25. November 2026.

## Ergebnis

Beide Tagebuchversionen enthalten weit oben das Level-40-Kapitel mit erstem
Reittier, abgeschlossener Arena-Quest, dem zu zweit besiegten letzten Arenagegner,
Ogerhornring, Charakter-Momentaufnahme, persönlicher Ausrüstungsempfehlung,
Dual-Spec-Entscheidung, Linux-Setup und Just20Minutes-Verweis.

Der eigenständige Rechner und die Blogeinbettung verwenden dieselben Dateien.
Er enthält ausschließlich Paladin mit Heilig, Schutz und Vergeltung.

| Inhalt | Deutsch | Englisch |
| --- | --- | --- |
| Tagebuch | https://www.dennishilk.com/de/blog/wow-forever-nebukatneza-dennis-hilk/ | https://www.dennishilk.com/blog/wow-forever-nebukatneza-dennis-hilk/ |
| Rechner | https://www.dennishilk.com/de/tools/wow-forever-paladin-talentrechner/ | https://www.dennishilk.com/tools/wow-forever-paladin-talent-calculator/ |

## Funktionen

- Standardvorlage Schutz 0/35/16 und jederzeit ladbare Vergeltung-Vorlage 12/8/31.
  Beide entsprechen jedem Punkt der privaten Referenzbilder. Beide werden als
  geplante Level-60-Builds gekennzeichnet; der Charakter ist aktuell Level 40.
- 51-Punkte-Limit, Restpunkte, Punkte pro Baum und benötigtes Level.
- Linksklick, Rechtsklick, Umschalt-Klick, Enter, Umschalt-Enter, Plus/Minus,
  Pfeiltasten sowie Touch-Bedienung mit eigenen Plus-/Minus-Tasten.
- Aktueller/nächster Rang, alle Ränge, Voraussetzungen, Kosten der aktiven
  Talente und Verbindungspfeile.
- Gesamte Skillung wird bei jedem Hinzufügen oder Entfernen validiert.
- Eigene leere Skillung, Reset pro Baum und Gesamtreset.
- Tatsächlich teilbare, versionierte URL-Builds, Zwischenablage und ein
  auswählbares URL-Feld als Ausweichmöglichkeit.
- Sichere Behandlung manipulierten oder inkompatiblen URL-Inhalts.
- Drei Bäume nebeneinander bei ausreichender Breite; Baumauswahl auf Smartphones.
- Alle Talente und 139 Ränge sind als statische HTML-Referenz auch ohne JavaScript
  lesbar. Zwei eigene statische Vorschauen ergänzen den JavaScript-Fallback.
- Keine Datenbank, zusätzlichen Dienste oder externen JavaScript-Frameworks.
  Browsermodule werden als `.js` ausgeliefert, damit nginx seine normalen
  JavaScript-MIME-Einstellungen verwenden kann.

## Dateien

Geändert:

- `de/blog/wow-forever-nebukatneza-dennis-hilk/index.html`
- `blog/wow-forever-nebukatneza-dennis-hilk/index.html`
- `de/blog/index.html`, `blog/index.html`
- `de/index.html`, `index.html`: neue Tool-Karten.
- `de/blog/feed.xml`, `blog/feed.xml`
- `sitemap.xml`, `sitemap-de.xml`, `sitemap-blog.xml`
- `assets/blog/wow-forever/gallery.js`: ausdrücklich nicht verfügbare Alt-Einträge
  werden übersprungen, ohne einen fehlgeschlagenen Bildabruf auszulösen.

Neu:

- `de/tools/wow-forever-paladin-talentrechner/index.html`
- `tools/wow-forever-paladin-talent-calculator/index.html`
- `assets/wow-forever-paladin/{calculator.js,logic.js,calculator.css,lightbox.js,data.json,package.json,SOURCES.md,paladin-social.png}`
- `assets/wow-forever-paladin/icons/`: 51 lokale Spielsymbole.
- `assets/blog/wow-forever/wow-forever-level-40-character*`
- `assets/blog/wow-forever/wow-forever-level-40-first-mount*`
- `assets/blog/wow-forever/wow-forever-world-update-notification*`
- `assets/blog/wow-forever/wow-forever-level-40-social.jpg`
- `assets/blog/wow-forever/wow-forever-dennis-hilk-protection-build.webp`
- `assets/blog/wow-forever/wow-forever-dennis-hilk-retribution-build.webp`
- `tests/wow-forever-paladin.test.mjs`
- `scripts/test-wow-forever-paladin-browser.mjs`
- Dieser Abschlussbericht.

Die drei freigegebenen PNG-Originale bleiben bytegenau erhalten. WebP-, Vorschau-
und Thumbnail-Dateien kommen zusätzlich hinzu. Die beiden fremden Talentbilder
befinden sich nicht im Repository und nicht in der öffentlichen Galerie.

Vorhandene Chroniküberschriften, Bilder und Live-Kartenfunktion bleiben erhalten.
Der bisherige Layering-Abschnitt wurde um das Originalbild ergänzt, statt den
bereits vorhandenen Text noch einmal einzufügen. Eine ältere Dungeon-Tabelle
erhielt einen horizontal scrollbareren Container für kleine Displays.

Der Alt-Eintrag `wow-forever-ostfriesen-raid-gruendung-gromgol-2026-11-17.png` war
weder im Repository noch unter seiner bisherigen Live-URL verfügbar (HTTP 404).
Sein Galerie-Datensatz ist erhalten und mit `unavailable: true` gekennzeichnet;
die Galerie ruft ihn nicht mehr ab. Kein vorhandenes Bild wurde dafür gelöscht.

## Datenquellen und Rechte

Talentstruktur und alle Ränge:
[Paladin-Export von Talents Forever](https://talentsforever.com/export/paladin.json),
Exportdatum 10. November 2026; Forever-Client 1.60.1.70755 plus dokumentierte
November-Hotfixes. Der aktuelle Paladin-Datensatz des Anbieters wurde am
25. November mit dem Export verglichen und stimmt überein.

Datenlizenz: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Deutsche Namen/Beschreibungen stammen aus dem veröffentlichten deutschen
Datensatz; sechs noch englische Beschreibungen und ein Name wurden für die
Website übersetzt und entsprechend gekennzeichnet. Spieltexte und Symbole
bleiben © Blizzard Entertainment und werden nicht als CC-Grafiken ausgegeben.
Die 51 Symboldateinamen stammen aus dem Talentdatensatz; die Dateien wurden vom
WoW-Icon-CDN `wow.zamimg.com` bezogen. Hintergründe und Oberfläche sind eigenständig.

Alle Quellen, Hashes, Änderungen und Lizenzabgrenzungen sind in
[`SOURCES.md`](../assets/wow-forever-paladin/SOURCES.md) dokumentiert.

## Tests

- 11 Talenttests: Vollständigkeit, punktgenaue Vorlagen, legale Aufbaureihenfolge,
  sämtliche direkten Abhängigkeiten, Ebenen, 51-Punkte-Limit, Ränge, Reset,
  URL-Roundtrip und manipulierte Links. Zusätzlich 3.000 deterministische
  Zufallsänderungen mit fortlaufender Gültigkeits- und URL-Prüfung.
- Zusammen mit bestehenden RSS- und Sitemaptests: **29 bestanden**.
- Chromium: **20 Ansichtsprüfungen** für Blog und Tool auf Deutsch und Englisch,
  jeweils 320, 390, 768, 1024 und 1440 Pixel breit. Kein Seitenüberlauf.
- Browseraktionen: beide Vorlagen, gesperrtes Entfernen eines Elterntalents,
  Maus/Rechtsklick, Tastatur, Clipboard mit erneutem Öffnen des Links, ungültige
  URL, Baumreset, Blogeinbettung, Lightbox und echtes Touch-Testprofil.
- JavaScript-freie Seite: alle 51 Talente und Ränge lesbar.
- Keine JavaScript- oder Konsolenfehler während der geprüften Abläufe.
- Der auf Worldnode generierte Observer-JSON-Endpunkt wird im lokalen Test
  mit einer leeren Antwort simuliert; dabei bleibt die manuelle Level-40-Karte
  sichtbar. Der tatsächliche Live-Endpunkt antwortete separat mit HTTP 200.
- Originalbilder per Hash abgeglichen, lokale Links und Bilder geprüft,
  historische Artikelüberschriften und Bildreferenzen erhalten.
- Sitemap-Index geprüft: enthält weiterhin die bestehenden Sitemap-Dateien,
  über die beide neuen Tools und die aktualisierten Artikel erreichbar sind.

Prüfbefehle:

```sh
node --test tests/wow-forever-paladin.test.mjs tests/sitemaps.test.mjs tests/seo-sitemap-generator.test.mjs tests/blog-rss.test.mjs
node scripts/test-wow-forever-paladin-browser.mjs
node scripts/generate-blog-rss.mjs --check
```

## Grenzen

Der benannte Datenstand enthält keine automatische Übernahme späterer
Live-Anpassungen, keine Legacy-Zusatzpunkte und keine ausrüstungsabhängige
Schadenssimulation. Die eigenen deutschen Übersetzungen können vom späteren
offiziellen Wortlaut abweichen. Innerhalb des Datensatzes fehlen keine Rangtexte.

Nach Übernahme auf GitHub muss Worldnode wie üblich den neuen Stand von `main`
holen. Es ist keine Änderung an nginx, kein Build auf dem Server und kein
zusätzlicher Dienst nötig.
