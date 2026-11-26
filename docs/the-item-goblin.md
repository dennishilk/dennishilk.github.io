# The Item Goblin

WoW Item & Meme Generator · Create. Roll. Laugh. Share.

100% Loot. 0% Quality Control. Made with humor in East Frisia.

- Deutsch: https://www.dennishilk.com/de/tools/the-item-goblin/
- English: https://www.dennishilk.com/tools/the-item-goblin/

Independent fan project for the entire WoW community. Fictional items cannot be imported into a game. No Blizzard artwork, game database, AI service, account, cookies, tracking, backend, extra ports or third-party runtime dependencies are used by this tool.

## Was ist enthalten? / Features

Vollständiger DE/EN-Editor: Name, neun Qualitäten mit eigener Goblin-Farbe, Item- und Charakterstufe, Bindung, Einzigartig, Slot, Typ, Rüstung, Schaden, Tempo und berechnete DPS, Haltbarkeit, Berufs- und Klassenanforderungen, eigene Attribute, Anlegen/Benutzen/Trefferchance, Abklingzeit, Setboni, Beschreibung, Hersteller und Verkaufspreis. Leere optionale Felder erscheinen nicht im Tooltip; `null` blendet Zahlen aus. Zahlenwert 0 bleibt sichtbar.

Kombinatorisches `/roll 1337` mit 18 Auswahloptionen (Alles + 17 Kategorien), vier Absurditätsgraden, passenden Grundwerten, individuellen Feldsperren und einzelnen Feldwürfen. Die drei Waffenwerte werden gemeinsam gesperrt bzw. gewürfelt, damit minimaler und maximaler Schaden zusammenpassen. Ein ausdrücklicher Einzelwurf ersetzt das gewählte Feld auch dann, wenn es gegen globale Würfe gesperrt ist.

Undo/Redo speichert bis zu 80 Zustände; Texteingaben werden nach 450 ms zu einem Schritt zusammengefasst. „Vorheriger Wurf“ wechselt zwischen dem letzten globalen Wurf und seinem Vorgänger. „Leeres Item“ ist rückgängig machbar.

125 handgeschriebene Originalitems, jeweils vollständig auf Deutsch und Englisch. Zufallsdaten: 60 Präfixe + 102 Suffixe = 162 Namensbausteine, 251 Attribute, 127 Effekte, 125 Beschreibungen, 34 Voraussetzungen. Die Beispielsammlung ist unabhängig vom Generator: Neue Beispiele werden nicht automatisch in die Zufallspools übernommen.

17 eigene SVG-Symbole und lokaler Bildimport. Symbol links, innen oder ausgeblendet. PNG-Kopieren und Download, Textkopieren, vollständiger Datenlink im URL-Fragment, JSON-Import/-Export und Datenbank-Datensatzexport. Transparenter Hintergrund, klassischer Tooltip oder Goblin-Werkstatt, optionales Branding und 1×/2×/3×. Vorschau und Export verwenden dieselbe Canvas-Layoutfunktion; lange Wörter und Namen werden umgebrochen und die Bildhöhe wächst mit.

Favoriten und eigene Items werden nur durch die Speichern-Schaltflächen in `localStorage` unter `the-item-goblin.collection.v1` abgelegt. Kein automatisches Speichern der laufenden Unterhaltung bzw. des Editors. Frischer Besuch startet mit „Alte Latschen“; ein geteilter Link lädt dessen Item. „Meine Sammlung“ bietet Einzellöschung und vollständiges Löschen. Auch Bilder bleiben lokal, bis du selbst einen Link oder eine Exportdatei teilst.

## Dateien / File layout

| Datei | Zweck |
| --- | --- |
| `assets/item-goblin/data/items.json` | Permanente zweisprachige Fundstücke mit stabiler ID |
| `assets/item-goblin/data/generator.json` | Thematische Zufallspools, ohne Programmcode |
| `assets/item-goblin/data/icons.json` | Symbol-IDs, Namen und eigene SVG-Dateien |
| `assets/item-goblin/data/item.schema.json` | JSON Schema für ein einzelnes Item |
| `assets/item-goblin/data/LICENSE` | MIT-Lizenz für eigenen Code, Texte und Grafiken |
| `assets/item-goblin/core.mjs` | Vertrag, Validierung, Generator, Undo/Redo, URL-Daten |
| `assets/item-goblin/render.mjs` | Gemeinsame Zeilen-, Umbruch- und Canvas-Logik |
| `assets/item-goblin/app.mjs` | Zweisprachige Bedienung, Browser-Speicher und Exporte |
| `assets/item-goblin/style.css` | Goblin-Werkstatt und responsive Bedienung |
| `assets/item-goblin/icons/*.svg` | 17 Originalsymbole |
| `assets/item-goblin/mascot.svg` | Eigenes Goblin-Maskottchen |
| `assets/item-goblin/social.svg`, `social.png` | Original-Vorschaubild, 1200 × 630 |
| `scripts/build-item-goblin.mjs` | Beide Tool-Seiten und Tool-Übersichten erzeugen |
| `scripts/build-item-goblin-social.mjs` | Social-PNG aus eigenen Vektoren erzeugen (Sharp) |
| `tests/item-goblin.test.mjs` | Daten, Zufallsgenerator, Sicherheit, Historie, Layout und Links |

## Ein eigenes Item ergänzen

1. Im Tool das Item erstellen. Normales „JSON exportieren“ erzeugt ein direkt wieder importierbares Einzelitem.
2. Für die permanente Sammlung unter „Für deine Item-Datenbank“ den Datensatz exportieren. Er enthält ID, gewählte Kategorie und die aktuelle Sprache. Diese Datei ist ein **Redaktionsentwurf**, kein direkt importierbares Einzelitem. Füge die zweite Sprachfassung hinzu und prüfe beide Texte.
3. Den fertigen Eintrag an das Array `items` in `assets/item-goblin/data/items.json` anhängen. Vorheriges Objekt durch Komma trennen. ID einmal vergeben und anschließend beibehalten.
4. `node --test tests/item-goblin.test.mjs` ausführen. Für neue Items sind keine HTML-, CSS- oder Logikänderungen notwendig. Eine aktualisierte Anzahl in Beschreibungen kann separat angepasst werden.

Minimales vollständiges Beispiel (nicht noch einmal mit derselben ID eintragen):

```json
{
  "id": "teacup-of-delayed-pulling",
  "category": "raid",
  "de": {
    "version": 1,
    "name": "Teetasse des verschobenen Pulls",
    "quality": "rare",
    "icon": "food",
    "slot": "Nebenhand",
    "stats": ["+3 Ziehzeit", "−1 hektischer Raidleiter"],
    "use": ["Verschiebt den Pull bis nach dem dritten Aufguss."],
    "flavor": "Erst der Tee. Dann die Aggro."
  },
  "en": {
    "version": 1,
    "name": "Teacup of the Delayed Pull",
    "quality": "rare",
    "icon": "food",
    "slot": "Off Hand",
    "stats": ["+3 steeping time", "−1 impatient raid leader"],
    "use": ["Delays the pull until the third infusion."],
    "flavor": "Tea first. Aggro second."
  }
}
```

Nicht angegebene optionale Felder erhalten harmlose Standardwerte. Ein einzelnes Item muss `version: 1`, einen String `name` und eine gültige `quality` haben. Namen dürfen leer sein, aber für lokale Sammlungen ist ein Name nötig. Alle Strings sind Klartext, kein HTML. Eigene Attribute und Effekte sind Arrays aus Strings. Ein Zeilenumbruch im Editor beginnt einen weiteren Eintrag.

**Qualität:** `poor`, `common`, `uncommon`, `rare`, `epic`, `legendary`, `artifact`, `heirloom`, `goblin`. Nur Goblin verwendet `color` (Hex-Farbe, etwa `#b6f54a`).

**Kategorien:** `weapon`, `armor`, `jewelry`, `consumable`, `mount`, `quest`, `junk`, `legendary`, `tank`, `healer`, `damage`, `raid`, `pvp`, `profession`, `life`, `it`, `goblin`. `all` ist die Generator-Auswahl für alle Kategorien.

**Symbole:** `sword`, `axe`, `mace`, `shield`, `staff`, `ring`, `boots`, `helmet`, `potion`, `bag`, `stone`, `tool`, `food`, `computer`, `keyboard`, `mount`, `scroll`.

**Zahlen:** `itemLevel`, `requiredLevel`, `armor`, `damageMin`, `damageMax`, `speed`, `gold`, `silver`, `copper`; leere Werte als `null`. DPS wird aus `(damageMin + damageMax) / 2 / speed` berechnet. `speed` muss positiv und maximaler Schaden mindestens minimaler Schaden sein. Preise sind unabhängig bearbeitbar; keine automatische Münzumrechnung.

**Zeilenlisten:** `stats`, `equip`, `use`, `hit`, `setBonus`. **Weitere Felder:** `binding`, `unique` (Boolean), `slot`, `type`, `durability`, `profession`, `classes`, `cooldown`, `flavor`, `maker`, `customIcon`, `iconPosition` (`outside`, `inside`, `none`).

## Zufallsdaten erweitern

`generator.json` enthält Arrays `adjectives`, `suffixes`, `stats`, `effects`, `flavors`, `requirements`. Jeder Baustein enthält `de`, `en`, `themes` und `minAbsurdity` (0 bis 3). Effekte enthalten zusätzlich `kind: "equip"`, `"use"` oder `"hit"`.

```json
{
  "de": "+25 Geduld bis zum nächsten Pull",
  "en": "+25 patience until the next pull",
  "themes": ["raid", "healer"],
  "minAbsurdity": 0
}
```

Die Sprache folgt der Seite. `themes: ["all"]` ist für wirklich allgemeine Texte gedacht. Stiefel sollten eher nach Füßen, Laufen und Geruch klingen. Waffen erhalten Schaden und Tempo; Verbrauchsgegenstände, Reittiere und Questitems erhalten Benutzen-Effekte. Trefferchance-Effekte werden bei Nichtwaffen zu Anlegen-Effekten. Auf niedrigen Stufen werden nur freigegebene Bausteine berücksichtigt. Ab Stufe 2 kommen zusätzliche Präfixe hinzu, höhere Stufen erlauben mehr Effekte und höhere Preise.

Deutsche Präfixe als eigenständige Etiketten formulieren („Prototyp:“), damit alle Substantive grammatisch passen. Suffixe inklusive Präposition schreiben („der vergessenen Pause“ / „of the Forgotten Break“). Neue Pools mit demselben Testbefehl prüfen.

## English authoring quick start

Edit the independent JSON files; no application code changes are needed to add catalog entries or random components. `items.json` wraps an `items` array. Each record has a unique stable slug `id`, one `category`, and complete `de` and `en` item objects. An item requires `version: 1`, `name`, and `quality`; optional numeric fields use `null` to stay hidden. Attribute/effect lists accept invented plain-text strings. The editor's JSON export is directly importable; its catalog-record export is an editorial draft with **only the current language**, so add the other language before including it in `items.json`.

`generator.json` keeps independent bilingual themed pools. Each row has `de`, `en`, `themes` and `minAbsurdity` from 0 to 3; effects additionally have `kind`. The catalog is not automatically harvested into the random generator. Add random components explicitly when desired. Run `node --test tests/item-goblin.test.mjs` after data edits.

## Build, validation and publication

The application is static and needs no bundler or installation at runtime. Serve over HTTP(S), not `file://`. HTTP localhost supports testing; image clipboard normally requires HTTPS and browser permission on public hosts.

```sh
node scripts/build-item-goblin.mjs
node --test tests/item-goblin.test.mjs
node scripts/sync-seo.mjs --sitemaps-only
```

The social PNG is already committed. To regenerate it, install `sharp` in your development environment and run `node scripts/build-item-goblin-social.mjs`; the script also supports the Codex runtime dependency path. It rasterizes the editable original SVG and does not call an image or AI service. The SVG mascot and icons were drawn for this tool, rather than copied from any game.

The existing sitemap index already includes `sitemap.xml` and `sitemap-de.xml`, which now include the tool and overview URLs with language alternates. Both home pages, tool overviews, the diaries, talent calculators and Just20Minutes articles link to the tool. Existing diary text, images, talent widgets and addon features are preserved.

## Practical limits

- PNG clipboard behavior depends on the browser, secure context and permission. If unavailable or denied, the same PNG downloads. A successful copy cannot force a destination messenger to accept images.
- Browser QA was performed in Chromium; Safari/Firefox and physical mobile touch have not been independently certified.
- Uploads: PNG/JPEG/WebP only, 2 MiB maximum, 4096 px per edge maximum. Images are rasterized locally into a 128 × 128 WebP icon, preserving transparency where supported. SVG uploads and remote URLs are rejected. Browser-local data icons from JSON have a 120,000-character limit.
- Name: 200 characters. Other scalar text: 2,000. Per list: 100 rows, 1,000 characters per row. The editor textarea accepts 12,000 characters per list. All numeric fields: finite, 0–10,000,000; speed strictly positive. Imported JSON: at most 200,000 characters / 200 kB file. Item JSON: 180,000 characters maximum. These bounds keep untrusted imports and canvas allocation manageable.
- Export: at most 64 million pixels and 30,000 pixels high. Oversized items produce a visible message; reducing resolution or text enables export. Images grow with content and are not silently cropped.
- Share fragments: at most 64,000 characters. Large uploaded icons or very long items may require JSON instead. Messaging services can impose smaller URL limits. Fragments keep data out of normal HTTP requests but are visible to anyone you send the link to. Shared item text is preserved when switching UI language; custom content is not translated automatically.
- Collections: up to 100 favorites plus 100 custom items, subject to browser storage quota. Failure to persist is reported and JSON export remains available. Clearing browser data also clears these items. There is no automatic cross-device sync.
- Transparent mode exports text and icon without a tooltip fill or border; classic mode has the dark tooltip, with transparent space around it. Workshop mode fills the image background.

See [the QA record](the-item-goblin-qa.md) for release checks.
