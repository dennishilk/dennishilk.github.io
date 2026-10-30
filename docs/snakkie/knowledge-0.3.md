# Snakkie 0.3 — Wissens- und Kulturbegleiter

Stand: 30. Oktober 2026. Direkte Seiten: `/de/snakkie/` und `/snakkie/`.
Beide bleiben `noindex,follow`, ohne neue eingehende Navigation, Projektkarten,
Startseiten-, Wiesmoor-, Observer-, Sitemap- oder RSS-Verlinkung.

Snakkie ist Nebbys Cousin. Das bestehende Maskottchen und die Originalgrafiken
sind unverändert. Der Einstieg ist deutlich kompakter, das Chat-Eingabefeld auf
dem geprüften Desktop ohne Scrollen erreichbar. Die neue Beschreibung lautet
„Your friendly companion from East Frisia.“

## Was jetzt funktioniert

Der Chat antwortet aus versionierten Texten, mit transparenter Begriffssuche.
Es gibt kein generatives Sprachmodell, keine KI-API und keinen Download von
Modellen oder Inferenz-Runtimes. Sprache und Quellen sind sichtbar. Enter sendet,
Shift+Enter fügt einen Zeilenumbruch ein. Leere Nachrichten werden verworfen,
IME-Komposition wird respektiert und eine laufende Anfrage blockiert doppelte
Sendungen. Wetterabrufe dürfen kurz dauern; normale Antworten brauchen keinen
Modellstart und haben keine künstliche Denkpause.

Es gibt vier dezente Gesprächseinstiege, DE/EN-Antwortauswahl, manuelles Leeren
und einen auf 60 Nachrichten begrenzten Verlauf im Arbeitsspeicher. Chattexte
werden weder persistiert noch in Requests oder Telemetrie übertragen. Antworten
und Fragen landen ausschließlich als `textContent` im DOM; Quellenlinks werden
nur aus gepflegten Datensätzen übernommen. Wetter wird von einem festen Pfad
abgerufen, niemals mit angehängter Besucherfrage.

## Datenmodell und tatsächlicher Umfang

Alle sechs Datenquellen liegen in `assets/snakkie/knowledge/`. Jeder Datensatz
hat eine stabile ID. DE/EN stehen nebeneinander, damit keine Übersetzung ohne
sichtbares Gegenstück verschwindet.

| Datei | Einträge | Inhalt / Status |
|---|---:|---|
| `jokes.json` | 100 | Eigenständig formulierte trockene, norddeutsche und maritime Witze; 100 englische Bearbeitungen |
| `fallback-responses.json` | 20 | Unterschiedliche ehrliche, freundliche Ausweichantworten in DE/EN |
| `facts.json` | 12 | Wiesmoor, Ostfriesland, Fehnkultur, Moor, Tee, Geschichte, Linux, Debian/Arch, Python, Betriebssystem, Website, Observer |
| `personality.json` | 6 | Identität, Cousin Nebby, Cthulhu, Grenzen, Platt-Fähigkeit und Kleidung |
| `platt-words.json` | 2 | Moin und snacken, mit Übersetzungen, Beispielen, Quelle und Prüfstatus |
| `platt-phrases.json` | 1 | „Van snacken kummt snacken.“ mit DE/EN und regionaler Einordnung |

Das sind **141 strukturierte Datensätze**, darunter **100 verschiedene Witze**,
nicht 200 durch doppelte Zählung der Übersetzungen. Die Humorbeiträge sind eine
neue redaktionelle Snakkie-Sammlung, keine kopierte Witzanthologie und keine
Behauptung, es handle sich um 100 überlieferte ostfriesische Volkswitze. Sie
brauchen weiterhin menschliches Geschmackslektorat; regionale Klischees über
dumme Bewohner oder beleidigende Antworten sind nicht das Konzept.

Die Quellenfelder für Fakten enthalten Bezeichnung, URL, Prüftag und Status.
Persönlichkeit und Familiengeschichte stammen aus dem Projektkanon des Nutzers.
Es werden keine privaten System- oder Familiendaten des Betreibers ergänzt.

## Quellen und Grenzen der Recherche

Die Websuche lieferte in dieser Umgebung Fehler. Stattdessen wurden öffentliche
Primärquellen direkt per HTTPS gelesen, nicht über den Browser gescrapt:

- [Ostfriesland Tourismus: Wiesmoor](https://www.ostfriesland.travel/orte/landkreis-aurich/wiesmoor)
  und [Fehn-/Dollartgebiet](https://www.ostfriesland.travel/orte/regionen-und-orte/fehn-und-dollartgebiet).
- [NLWKN: Wiesmoor-Klinge](https://www.nlwkn.niedersachsen.de/naturschutzgebiete/naturschutzgebiet-wiesmoor-klinge-42116.html).
  Wiedervernässung wird als Gebietskontext beschrieben, nicht als aktuelle
  Messung eines Moorwasserstands.
- [Deutsche UNESCO-Kommission: Ostfriesische Teekultur](https://www.unesco.de/staette/ostfriesische-teekultur/).
  Aufnahme 2016 ins **Bundesweite Verzeichnis**, nicht als UNESCO-Welterbestätte.
- [Wörterbuch für Ostfriesland: Moin](https://www.platt-wb.de/platt-hoch/?term=Moin)
  und [snacken](https://www.platt-wb.de/platt-hoch/?term=snacken).
  Schreibweisen bleiben erhalten. „snacken“ und die Redewendung sind dort als
  östliches Ostfriesland qualifiziert. Exakter Wiesmoorer Gebrauch ist noch nicht
  durch lokale Sprecher geprüft. Englische Übersetzungen sind redaktionell.
- [Linux Kernel Archives](https://www.kernel.org/linux.html),
  [Python-Tutorial](https://docs.python.org/3/tutorial/appetite.html),
  [ArchWiki: Arch Linux](https://wiki.archlinux.org/title/Arch_Linux),
  [Debian Stable](https://www.debian.org/releases/stable/).
- Bestehende lokale Website-Seiten für das Museum, World Observer und den
  allgemeinen historischen Wiesmoor-Kontext. Der städtische Geschichtslink
  lieferte beim Abruf keinen nutzbaren Inhalt. Deshalb wurden keine neuen
  konkreten Gründungs-/Kraftwerksjahre übernommen oder als frisch geprüft
  ausgegeben. Der historische Eintrag ist entsprechend gekennzeichnet.

Branding wie „Moin! Ik bün Snakkie.“ wird nicht stillschweigend zum geprüften
Sprachlehrmaterial. Es gibt keinen freien Platt-Dialog und kein Aussprache-Audio.
Vor einer größeren Sammlung: lokale Sprecherprüfung sowie Nutzungsrechte für
weiteres Quellenmaterial klären. Es wurden nur minimale belegte Beispiele
übernommen, keine Wörterbuchsammlung vervielfältigt.

## Suche und Wiederholungen

`engine.mjs` lädt lokale JSON-Dateien. Es normalisiert Groß-/Kleinschreibung,
Satzzeichen, Umlaute, ß und übliche Umschriften. Gepflegte Synonyme verbinden
z. B. „heißt“, „bedeutet“ und „mean“. Längere Begriffe erlauben eine einzelne
Einfügung, Löschung, Ersetzung oder benachbarte Vertauschung. Nur ein eindeutig
passender Wortschatzkandidat wird korrigiert; kurze Wörter werden nicht unsicher
umgedeutet.

Fakten nutzen mehrere Beispielfragen und verpflichtende Themenanker. Exakte
Fragen werden zuerst berücksichtigt. Sonst zählt die Abdeckung der bedeutenden
Fragebegriffe stärker als die der hinterlegten Beispielfrage. Mindestabdeckung
78 %, Gesamtscore mindestens 0,86; zwei fast gleich gute Ergebnisse mit weniger
als 0,035 Abstand werden verworfen. Ein Fachwort allein legitimiert daher keine
Antwort auf eine andere Fachfrage: „Was ist Linux?“ klappt, „Wie installiere ich
Linux?“ hat noch keinen passenden Eintrag und erhält einen ehrlichen Fallback.

Das ist nachvollziehbare begrenzte Suche, kein Sprachverständnis wie bei einem
LLM. Sie kann echte Fragen übersehen. Sie beweist auch nicht automatisch die
Richtigkeit redaktioneller Inhalte. Neues Wissen braucht Quellenprüfung sowie
positive und negative Suchtests. Komplexe Mehrfachfragen werden konservativ
behandelt. Es gibt kein Internet-Nachschlagen beliebiger Fragen.

Witze und Fallbacks verwenden getrennte Shuffle-Bags. Erst nach allen Einträgen
wird neu gemischt; eine unmittelbare Wiederholung an der Zyklusgrenze wird
vermieden. „Noch einen!“ bezieht sich nur auf den unmittelbar vorherigen
Witz-Intent. Es gibt keine allgemeine Gesprächslogik. Ein Reset startet eine
neue Sitzung. Ernste/dringende Themen durchlaufen vor dem Humor einen neutralen
Hinweis; dies ist kein vollständiger Notfallerkennungs- oder Beratungsdienst.

## Wetter: vorhandener World Observer

Snakkie liest ausschließlich:

`/world-observer/dashboard/latest/wiesmoor-weather.json`

Der bestehende Sync ist in `scripts/sync-world-observer-dashboard.sh`
dokumentiert. Die Rohdatei ist absichtlich Git-ignoriert und wird auf Worldnode
vom bestehenden Observer veröffentlicht. Im Checkout fehlt sie regulär. Es wird
kein eingefrorener Wetterbericht als Produktionsersatz committed und kein neuer
API-Aufruf installiert. Der bereits vorhandene Collector verwendet Open-Meteo;
Snakkie kontaktiert Open-Meteo nicht selbst.

Die reale öffentliche JSON-Struktur wurde gelesen: `observer`, `data_status`,
`collected_at_utc`, `location.timezone`, `current.time`, `temperature_2m`, `rain`,
`wind_speed_10m` sowie datierte `daily`-Arrays. Beim untersuchten Export vom
30.10.2026, 18:00:06 UTC entsprach `current.time=2026-10-30T19:00` der Ortszeit
Europe/Berlin. Die Werte 9,3 °C / 0 mm / 4,3 km/h dienten einem überprüfbaren
Testbeispiel, **nicht einer dauerhaft aktuellen Wetterbehauptung**.

Regeln in `weather.mjs`:

- Ohne passenden Observer, Datenstatus oder Zeitzone keine Werte.
- Erfassungszeit und Gültigkeitszeit getrennt prüfen; aktuelle Werte dürfen
  höchstens drei Stunden alt sein. Zukunftsangaben über zehn Minuten werden
  verworfen. Fehlende Werte werden niemals in Null umgewandelt.
- Zeitstempel ohne Offset werden explizit in Europe/Berlin interpretiert,
  unabhängig von der Besucher-Zeitzone. Ungültige oder mehrdeutige DST-Zeiten
  werden verworfen, statt eine Stunde zu raten.
- Aktuelles Wetter wird als **modellbasierter Bericht** mit Zeitstempel gezeigt,
  nicht als eigene Live-Wetterstation oder unmittelbare Regenbeobachtung.
- Morgen wird über das Berliner Kalenderdatum in `daily.time` gesucht, nie über
  eine feste Arrayposition. Nur eine passende vorhandene Prognose mit gültigem
  Minimum/Maximum wird ausgegeben; eine vorhandene Tagesniederschlagssumme wird
  ausdrücklich als erwarteter Niederschlag bezeichnet. Bericht höchstens
  26 Stunden alt. Keine aktuelle Messung oder Wettergarantie vortäuschen.
- Temperaturen, Regen und Wind werden auf endliche Zahlen und plausible Grenzen
  geprüft. Die inspizierte Collector-Schnittstelle liefert °C, mm und km/h;
  explizit abweichende aktuelle Einheiten werden zurückgewiesen.
- Ein festes JSON-GET, maximal sechs Sekunden, kurzer Arbeitsspeicher-Cache von
  60 Sekunden. Datenalter wird bei jeder Antwort neu bewertet. Keine Frage oder
  Chatnachricht im Request. Bei Fehlern oder alten Daten ein ehrlicher Hinweis
  mit Link zur passenden DE/EN-Wetterseite.
- Wetter für andere Orte, nicht vorhandene Prognosetage und amtliche Warnungen
  sind nicht Teil dieser Funktion. Keine neue Datenquelle wird geraten.

## Platt van Dag

Die Lernkomponente nutzt ihren eigenen Loader. Sie funktioniert unabhängig von
Chat-Initialisierung und Wetter. Ohne JavaScript bleibt das statische Beispiel
lesbar. Die Tagesauswahl nutzt das lokale Kalenderdatum und eine nach stabilen
IDs sortierte Wortliste; Sommerzeitwechsel verändern den Tag nicht über
verstrichene Stunden. Beim nächsten lokalen Tag, auch nach Rückkehr in den Tab,
wird neu gewählt. Manuelles Weiterblättern ist zusätzlich möglich.

Die Oberfläche sagt ausdrücklich: **zwei belegte Wörter, täglicher Wechsel**.
Es wird keine große tägliche Vielfalt behauptet. Bei Ladefehler bleibt das
statische Beispiel mit ehrlichem Status sichtbar.

## Gemessene Dateigrößen

Exakte Einzelgrößen stehen in [sizes-0.3.json](sizes-0.3.json).

| Bestandteil | Unkomprimiert |
|---|---:|
| Sechs Wissens-JSON-Dateien zusammen | 60.264 Bytes |
| Vier Snakkie-JavaScript-Module zusammen | 24.063 Bytes |
| Snakkie-CSS | 9.765 Bytes |
| Deutsche / englische HTML-Seite | 7.327 / 7.177 Bytes |

Das sind Größen der Dateien, keine Behauptung gemessener WAN-Ladezeit. Gzip-
Vergleichswerte sind ebenfalls erfasst; ob die Produktion komprimiert, hängt vom
bestehenden Server ab. Die lokalen gemeinsamen Sprachumschalter, Schriftdateien,
Favicon sowie die bestehenden WebP-Grafiken kommen hinzu. Die große PNG-
Referenzgrafik und historische Benchmarkdateien werden vom Frontend nicht geladen.
Die Datenstruktur kann 1.000 Witze aufnehmen, ohne die Faktenindizierung mit
jedem Witz zu vergrößern. Auf echter schwacher Mobilhardware wurde kein
Leistungsbenchmark durchgeführt.

## Tests und sichtbare Prüfung

- Build `node scripts/build-snakkie.mjs`: beide Seiten erzeugt.
- **51/51 Tests bestanden**: 17 Snakkie-Tests sowie vorhandene Sitemap-,
  SEO-Generator-, Lokalisierungs-, RSS-, Startseiten- und Museum-Katalogtests.
- Zusätzliche Observer-Prüfung: **21/25 bestanden**. Die vier Fehler betreffen
  bestehende Moor-Layout-Erwartungen: Desktop-Raster, sichtbare Labels,
  Observation-Limits-Anordnung und Kontext-Kompaktheit. Ein isolierter Testlauf
  der unveränderten `HEAD`-Dateien reproduziert exakt dieselben vier Fehler
  (17/21 Moor-Tests bestanden). `style.css` und Observer-Dateien wurden in dieser
  Mission nicht geändert. Diese Fehler sind keine neuen Snakkie-Regressionen.
- Sitemap-Regeneration und SEO-Audit: **0 Validierungsfehler**, 1.059 indexierbare
  Seiten und 1.059 eindeutige Sitemap-URLs. Beide Snakkie-Routen bleiben draußen.
- Syntaxprüfung der neuen JavaScript-Module und `git diff --check` bestanden.
- Alle 13 geforderten Chat-Beispiele in echten Engine-Aufrufen geprüft;
  zusätzliche Negativfälle, Umlaute/Umschriften, Tippfehler, DE/EN, expliziter
  Sprachwechsel, 100 Witze ohne Wiederholung, 20 verschiedene Fallbacks, ernste
  Fragen, leere/lange Eingaben und sichere Textausgabe.
- Wetter mit festen Testdaten: frisch, alt, fehlend, falscher Ort, Zukunft,
  ungültige Zahlen/Einheiten, Nullwerte, falsche Arrayreihenfolge, fehlender
  Prognosetag, DST-Lücke und mehrdeutige Herbststunde. Netzwerk-/HTML-Fehler
  ergeben keine erfundenen Zahlen.
- Chrome-Browser: DE/EN-Wechsel, Cousin-Antwort, Linux/Python/Wiesmoor,
  Moin-Übersetzung mit Quellenlink, Wetter mit realem inspiziertem Export,
  Witze und „Noch einen!“, Reset, Enter, Shift+Enter und doppelt gedrücktes Enter
  geprüft. Die gespeicherte Wetterkopie lag nur in der separaten QA-Vorschau.
- Desktop bei 1.348 × 936 CSS-Pixeln: Eingabe ohne Scrollen vollständig sichtbar;
  Unterkante anfänglich bei ca. 776 Pixeln. Responsive Iframes bei 320, 390 und
  768 Pixeln ohne horizontales Überlaufen geprüft (nutzbare Breite nach
  Scrollleiste 305 / 375 / 753 Pixel). Die kompaktere mobile Eingabe endet im
  390-Pixel-Test bei ca. 776 Pixeln. Iframes ersetzen keine echten Smartphones.
- Reale IME-Software, Firefox, Safari und physische Mobilgeräte wurden nicht
  getestet. Der IME-Ereignisschutz ist per Unit-Test geprüft. Sanftes Nachscrollen
  wird durch den Abstand zum unteren Rand gesteuert; ein Browser-Versuch mit der
  Home-Taste bestätigte keinen echten Wechsel der Scrollposition und wird daher
  nicht als erfolgreicher Test des Lesens älterer Nachrichten ausgegeben.

[Browseransicht](snakkie-03-overview.jpg) der kompakten fertigen Seite.

## Aufgeräumt / erhalten

Entfernt: `assets/snakkie/inference.mjs`, `inference-worker.mjs`,
`model-config.mjs`, `model-storage.mjs`, `scripts/prepare-snakkie-assets.py` sowie
die alten modellbezogenen Tests und alle Modell-/Backend-/Cache-Steuerelemente.

Nach `docs/snakkie/history-0.2/` verschoben: Artifact-Manifest und zwei Lizenzen.
Die Forschung und Rohantworten aus 0.2 bleiben historischer Nachweis; der alte
Bericht ist deutlich als überholt gekennzeichnet. Vorhandene Dateien außerhalb
Git, Browser-Modellcaches und Dateien auf Worldnode wurden nicht gelöscht oder
verändert. Der alte Modellpfad bleibt ignoriert. Ein normales Git-Pull reicht
für die neue Seite; es gibt keine zusätzliche Modellbereitstellung mehr.

Unveränderte Grafikreferenz: `assets/snakkie/snakkie-captain-source.png` mit
SHA-256 `a0b7a6c4c18478be09ee1b17a903621b09a6dd57317ce7d9469ed86a1cf93b02`.
Die drei vorhandenen WebP-Varianten bleiben erhalten.

## Geänderte Dateien

- `.gitignore`
- `scripts/build-snakkie.mjs`, `snakkie/index.html`, `de/snakkie/index.html`
- `assets/snakkie/{AGENTS.md,README.md,snakkie.css,ui.mjs,words.mjs}`
- Neu: `assets/snakkie/{engine.mjs,weather.mjs}` und die sechs oben aufgeführten
  Dateien unter `assets/snakkie/knowledge/`
- Entfernte/verschobene 0.2-Dateien wie oben
- `tests/snakkie.test.mjs`
- `docs/snakkie/{local-ai-0.2.md,knowledge-0.3.md,sizes-0.3.json,snakkie-03-overview.jpg}`

Kein Deployment auf Worldnode. Veröffentlichung ausschließlich als Commit auf
`origin/main`. Noch offen: mehr geprüftes Regionalwissen, lokale Sprecherprüfung,
Aussprache-Audio, breitere Fragensammlung und echte Mobil-/Browser-Vergleiche.
