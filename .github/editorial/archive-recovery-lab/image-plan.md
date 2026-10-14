# Real screenshot inventory and placement

All screenshots © Dennis Hilk. Real original browser captures, **not generated UI**. Do not alter the measurements. File dimensions are original pixel dimensions and preserved in the WebP conversions. No cropping.

| File | Width × height | Alt text and evidence | Article section |
| --- | ---: | --- | --- |
| `deutsch_1.webp` | 1242×930 | DE laufende lokale Suche: 4.034.718 Versuche und 94.262/s | tutorial running |
| `deutsch_2.webp` | 1236×998 | DE Berechtigung, Dateiauswahl und Methoden | tutorial setup |
| `deutsch_3.webp` | 1308×739 | DE integrierter ZIP-Testgenerator mit AES-Auswahl | demo |
| `deutsch_find.webp` | 1319×1096 | DE bestätigter ZIP-ZipCrypto-Treffer test9 und Download | benchmark lead |
| `english_1.webp` | 1311×973 | EN ready dashboard before selecting file | tutorial ready |
| `english_2.webp` | 1300×1024 | EN authorization checkbox, file chooser and search settings | tutorial setup |
| `english_3.webp` | 1342×739 | EN actual encrypted ZIP sample generator | demo |
| `english_find.webp` | 1293×1159 | EN separate ZIP-AES-256 AE-2 success test and downloads | verified result |

## Figure and encoding conventions

At approved publication move assets under a stable URL such as `/assets/blog/archive-recovery-lab/`, e.g.:

```html
<figure class="article-figure">
  <a href="/assets/blog/archive-recovery-lab/deutsch_find.webp">
    <img src="/assets/blog/archive-recovery-lab/deutsch_find.webp"
      width="1319" height="1096" loading="lazy" decoding="async"
      alt="Unabhängig bestätigte ZipCrypto-Wiederherstellung des Passworts test9, mit lokalen Downloads">
  </a>
  <figcaption>ZipCrypto-Test auf Cthulhu: 11.220.531 bestätigte Versuche, 127,2 Sekunden aktive Suche. Screenshot: Dennis Hilk.</figcaption>
</figure>
```

Keep images readable: display at native column width or link originals for detailed UI text. Do **not** hardcode a narrower screenshot. Use explicit dimensions to prevent layout shift. For the most prominent first/hero figure, consider eager loading and high fetch priority only if it is truly above the fold. Else lazy-load. The user provided exact original PNGs; optimized WebPs are distributed separately with a SHA-256 manifest. The English ready-state screenshot **must not be mislabeled as an active benchmark**.

## Place and captions

- German: `deutsch_2` with tutorial setup, `deutsch_1` with live search, `deutsch_find` prominent beside ZipCrypto result, `deutsch_3` beside create test ZIP.
- English: `english_2` beside tutorial setup, `english_1` beside live dashboard *ready state*, `english_find` prominent beside its independent AES recovery example, `english_3` beside demo ZIP creator.
- Captions (DE): Suche in Echtzeit: Passwortkandidaten werden auf der CPU geprüft. / Datei und Suchmethoden auswählen – mit ausdrücklicher Berechtigung. / Ein verschlüsseltes Beispiel-ZIP selbst erstellen. / Echter Erfolg auf Cthulhu: Passwort test9 unabhängig bestätigt.
- Captions (EN): The live dashboard before a recovery starts. / Set up local recovery with the correct file and candidate methods. / Create a genuinely encrypted test ZIP in your browser. / A separate verified AES example with two recovered files.

**GitHub binary integration still outstanding; images were NOT committed in this textual staging batch.**
