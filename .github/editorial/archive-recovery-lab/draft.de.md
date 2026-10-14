# ZIP-, RAR-, 7Z- oder PDF-Passwort vergessen? Dateien lokal wiederherstellen

> **REDAKTIONELLER ENTWURF · NICHT VERÖFFENTLICHEN · [FREIGABE DURCH DEN AUTOR AUSSTEHEND]**
>
> Technischer Stand: Repository-Review vom 14.10.2026. Für RAR4/RAR5/7Z/PDF fehlen noch die endgültigen Praxistests von Dennis. Das gilt auch für Download-Ergebnisse dieser Varianten.

Altes Backup gefunden, aber das Passwort ist weg? Vielleicht ist es eine ZIP-Datei mit Urlaubsfotos, ein RAR-Archiv aus WinRAR, ein 7z-Backup oder ein PDF, das du selbst vor Jahren verschlüsselt hast. Dann landet man schnell bei zwei wenig attraktiven Vorschlägen: irgendeine ausführbare Datei herunterladen oder das private Dokument bei einem fremden Online-Dienst hochladen.

Das muss für unterstützte Dateien nicht der erste Schritt sein. Im [Archive Recovery Lab](/de/museum/archive-recovery-lab/) kannst du eine Datei **lokal im Browser** auswählen und dein Gerät echte Passwortkandidaten prüfen lassen. Kein unbekanntes Recovery-Programm installieren, kein privates Archiv an einen Entsperrdienst übertragen. Das Lab macht keine Wunder: Es errät ein Passwort nicht automatisch, sondern durchsucht von dir gewählte Kandidaten. Ist das Passwort sehr lang und zufällig oder die Verschlüsselungsvariante nicht implementiert, kann die Suche erfolglos bleiben.

## 1. Zuerst die wichtigste Frage: Darfst du die Datei öffnen? {#berechtigung}

Nutze die Wiederherstellung ausschließlich für eigene Archive oder Dateien, für die du ausdrücklich berechtigt bist. Deshalb verlangt das Lab vor der Dateiauswahl eine Bestätigung. Sie schaltet die Dateiauswahl frei – ersetzt aber selbstverständlich keine rechtliche Berechtigung. Es gibt keinen Grund, fremde vertrauliche Unterlagen zu knacken.

Anders als eine Passwort-Reset-Funktion eines Online-Kontos kontaktiert das Lab keine Login-Server. Die Suche ist ein Offline-Versuch gegen **deine ausgewählte verschlüsselte Datei**. Das ist auch der Grund, warum jede Datei und jede Verschlüsselungsmethode ihren eigenen Rechenaufwand besitzt.

## 2. Was passiert im Browser tatsächlich? {#funktionsweise}

Dein Browser erhält die Anwendung als statische Dateien von dennishilk.com: HTML, JavaScript, gemeinsame Wörterbücher und bei Bedarf WebAssembly-Bibliotheken. Danach stellst du der Anwendung über den Datei-Dialog oder Drag & Drop gezielt eine Datei bereit. Die Browser-File- und Blob-APIs erlauben es dem Code, diese lokale Auswahl zu untersuchen, ohne sie automatisch auf einen Server zu senden.

Die Anwendung erkennt zunächst das Archivformat und die vorliegende Verschlüsselung. Sie baut anschließend Kandidaten aus Wörterbüchern, Schreibvarianten, Jahreszahlen, Ziffernanhängen oder einem begrenzten Brute-Force-Suchraum. Ein bis vier **CPU-Web-Worker** prüfen die Vorschläge direkt gegen verschlüsselte Daten beziehungsweise formatspezifische Prüfwerte. Das ist echtes Rechnen, keine dekorative Animation.

Bei einem vielversprechenden Kandidaten endet die Prüfung nicht mit einem grünen Häkchen. Die Datei wird unabhängig erneut verarbeitet. Entschlüsselung, Extraktion und verfügbare Integritätsprüfungen müssen bestehen. Erst dann zeigt die Oberfläche ein wiederhergestelltes Passwort und – bei unterstützten Ergebnissen – lokale Downloadmöglichkeiten an.

**Wichtig:** Der Browser lädt den Anwendungscode und seine Abhängigkeiten von der Website. »Kein Datei-Upload« ist etwas anderes als »keine Netzwerkanfrage«. Die ausgewählte Datei und die getesteten Passwortkandidaten werden laut geprüftem Anwendungspfad nicht an den Server gesendet. Browser-Code bleibt grundsätzlich eine Vertrauensentscheidung; lokale Ausführung ist kein absoluter Sicherheitsbeweis.

## 3. ZIP, RAR, 7Z und PDF: Was unterstützt das Lab? {#formate}

| Format und Verschlüsselung | Dokumentierter Implementierungsumfang | Stand |
| --- | --- | --- |
| ZIP / ZipCrypto | Klassische ZIP-Verschlüsselung, reale Kandidatenprüfung und Integritätskontrolle | **Praxistest mit Erfolg belegt** |
| ZIP / WinZip AES-128, AES-192, AES-256 | AE-1/AE-2, Stored und Deflate | **Beispielerfolg in EN-Screenshot; weitere Akzeptanzprüfung ausstehend** |
| RAR4 | Erprobte Varianten mit verschlüsselten Headern | **[VORLÄUFIG – Praxistest ausstehend]** |
| RAR5 | Erprobte Varianten mit verschlüsselten Headern | **[VORLÄUFIG – Praxistest ausstehend]** |
| 7Z / AES-256 | Verschlüsselte Header und LZMA2 | **[VORLÄUFIG – Praxistest ausstehend]** |
| PDF / ältere Verfahren | Standard-Security-Handler R2/RC4-40, R3/RC4-128, R4/AES-128 | **[VORLÄUFIG – Praxistest ausstehend]** |
| PDF / AES-256 | Dokumentierter Standard-Security-Handler R6/AES-256 | **[VORLÄUFIG – Praxistest ausstehend]** |

Unterstützt heißt **nicht**, dass sämtliche denkbaren RAR-, 7z-, ZIP- und PDF-Varianten funktionieren. Mehrteilige Archive, exotische Kompressionsverfahren, andere Verschlüsselungen und nicht getestete PDF-Revisionen können abgewiesen werden. Das Lab unterscheidet zudem das **PDF-Öffnungspasswort** von bloßen Eigentümer-, Druck- oder Kopierbeschränkungen. Ein Dokument, das sich ohne Öffnungspasswort lesen lässt, benötigt keine solche Passwortwiederherstellung.

Die konkreten Grenzen der aktuellen Version: ZIP-Eingaben bis 32 MiB, RAR/7Z/PDF bis 8 MiB; höchstens 256 Einträge, 16 MiB pro entpackter Datei und insgesamt 32 MiB Ausgabe. Ein Kompressionsverhältnis über 200:1, unsichere Pfade, doppelte Ausgabe-Dateinamen oder symbolische Links können aus Sicherheitsgründen blockiert werden. Der Kandidatenraum ist derzeit ASCII-basiert. Weitere Grenzen erklärt das Lab selbst.

## 4. Anleitung: Verschlüsseltes Archiv Schritt für Schritt öffnen {#anleitung}

1. Öffne das [Archive Recovery Lab](/de/museum/archive-recovery-lab/). Du musst keine zusätzliche EXE installieren.
2. Bestätige, dass du auf die Datei rechtmäßig zugreifen darfst. Erst dadurch wird die Dateiauswahl aktiv.
3. Wähle **eine** verschlüsselte ZIP-, RAR-, 7z- oder PDF-Datei oder ziehe sie in den markierten Bereich. Prüfe Format- und Verschlüsselungsanzeige.
4. Aktiviere Suchmethoden. Ein Wörterbuch ist oft der vernünftigste Anfang, wenn du ein menschlich ausgedachtes Passwort vermutest. Für vollständig zufällige Zeichenketten hilft ein Wörterbuch meist wenig.
5. Nutze **Optionales Vorwissen**, falls du Teile erinnerst: z. B. Länge, bekannte Zeichen oder ein Muster, sofern die Oberfläche diese Eingrenzung anbietet. Blindes Durchprobieren über alle 95 druckbaren ASCII-Zeichen und 1–24 Stellen wird sehr schnell praktisch unbezahlbar.
6. Lege einen bis vier CPU-Worker fest. Mehr Worker können beschleunigen, binden aber auch Ressourcen.
7. Starte die lokale Wiederherstellung und beobachte aktive Phase, bestätigte Versuche und die gemessene Rate. Pause und Fortsetzen sind möglich.
8. Bei einem Treffer überprüfe die Bestätigung, lasse dir das Passwort anzeigen oder kopiere es. Lade die einzeln extrahierten Dateien beziehungsweise, für unterstützte Archive, eine neu erstellte ZIP-Datei herunter.

**Bild zur Vorbereitung:** [Screenshot deutsch_2.webp – Original von Dennis Hilk; Datei liegt im separaten Bildpaket]. Alt-Text: »Archive Recovery Lab: Berechtigungsbestätigung, Dateiauswahl, Wörterbuchmethoden, Suchmodus und CPU-Worker«.

**Bild zur laufenden Suche:** [Screenshot deutsch_1.webp – Original von Dennis Hilk]. Alt-Text: »Laufende lokale ZipCrypto-Passwortsuche mit 4.034.718 bestätigten Versuchen, rund 94.262 Versuchen pro Sekunde und Suchphasen«.

**Bild zum bestätigten Treffer:** [Screenshot deutsch_find.webp – Original von Dennis Hilk]. Alt-Text: »Unabhängig bestätigtes ZIP-Passwort test9; 11.220.531 bestätigte Versuche und lokale Downloadschaltflächen«.

## 5. Ein echter ZIP-Test auf Cthulhu {#praxistest}

Beim dokumentierten Versuch mit der Datei `test-zipcrypto-test9.zip` kam ein eigenes verschlüsseltes ZIP mit **ZipCrypto** zum Einsatz. Das zu findende Passwort war **`test9`**. Getestet wurde auf dem NixOS-Rechner **Cthulhu** mit **Ryzen 7 5800X3D**. Die Suche lief mit vier CPU-Workern; der Treffer fiel in die Strategie **»Häufig & IT · Ziffernanhang 1«**.

| Messgröße | Beobachteter Wert |
| --- | ---: |
| Bestätigte Versuche | 11.220.531 |
| Aktive Suchzeit | 127,2 s |
| Angezeigte durchschnittliche Rate | 88.219 Versuche/s |
| Unabhängige Bestätigung | 24 ms |
| Treffer-Worker | CPU-Worker 3 |
| Ergebnis | Passwort wiederhergestellt, Download verfügbar |

Das sind **beobachtete Werte dieser einen Suche**, keine Garantie für andere Dateien. Schon ein anderer Kandidatenrang, eine andere Kompression, ein anderes Verschlüsselungsverfahren oder Hintergrundlast verändern die Zahlen. Die Suchanzeige zählt bestätigte Arbeit; Initialisierung und die abschließende Verifikation sind nicht einfach identisch mit der ausgewiesenen Suchzeit.

**[REDAKTIONELLER VORBEHALT – Dennis bestätigt den finalen Benchmarktext vor der Freigabe.]**

Die englische Erfolgsabbildung zeigt **einen anderen Lauf**: `local-demo.zip`, ZIP-AES-256 AE-2, das sichtbare Testpasswort `test`, 208 bestätigte Versuche, 106 ms aktive Zeit, 2.416 angezeigte durchschnittliche Versuche/s und zwei wiederherstellbare Dateien. Diese Ergebnisse dürfen **nicht** zu einem einzigen Benchmark mit dem ZipCrypto-Test vermischt werden. **[VORLÄUFIG – EN-Test noch nicht final für Veröffentlichung freigegeben.]**

Für RAR4, RAR5, 7Z und verschlüsselte PDFs fehlen die von Dennis ausdrücklich freigegebenen Messwerte. **[PENDING BENCHMARK] [PENDING DOWNLOAD VALIDATION]**

## 6. Warum nicht jedes Format gleich schnell geprüft werden kann {#verschluesselung}

Ein Passwort ist nicht selbst der Verschlüsselungsschlüssel. Häufig erzeugt eine **Schlüsselableitung** aus Passwort und Salt erst die eigentlichen Schlüssel. Zusätzliche Berechnung pro Kandidat erschwert automatisiertes Raten. Entscheidend ist also nicht nur die Zahl der möglichen Passwörter, sondern auch, wie teuer **eine einzige Überprüfung** ist.

**ZipCrypto** arbeitet mit einem vergleichsweise günstigen historischen Verfahren. Das Lab kann verdächtige Header-Treffer testen, akzeptiert sie aber nicht ohne richtige Entschlüsselung und CRC-Prüfung. **WinZip AES** benutzt unter anderem PBKDF2-HMAC-SHA-1 zur Schlüsselableitung und prüft weitere Authentisierungsdaten. **RAR5** definiert beispielsweise eine AES-256-Verschlüsselung und eine PBKDF2-basierte Ableitung mit einstellbarem Arbeitsfaktor. **7Z** und moderne **PDF**-Varianten besitzen wiederum eigene Ableitungs- und Verifikationsabläufe.

Aus all dem folgt keine universelle Rangliste »Format X ist immer N-mal langsamer«. Für belastbare Vergleiche bräuchte man gleiche Hardware, vergleichbare Testpasswörter, identische Suchstrategie und eigens gemessene Dateien. Genau deshalb bleibt die zusätzliche Benchmarktabelle noch leer.

## 7. Warum Wörterbücher und Reihenfolgen wichtig sind {#woerterbuecher}

Das Lab teilt sich mit dem Password Cracking Lab **488.971 Basiseinträge**: 26.652 häufige/IT-orientierte Passwörter sowie 213.096 deutsche und 249.223 englische Wörterbucheinträge. Das sind Basiseinträge, **keine** 488.971 garantierten unterschiedlichen Passwortversuche. Aus ihnen entstehen Schreibvarianten, Groß-/Kleinschreibung, Leetspeak, Jahreszahlen und Ziffernanhänge; die endgültige Zahl der geprüften Kandidaten kann viel größer sein.

Wer sich an einen Begriff wie `urlaub` oder `backup` erinnert, sollte zuerst einen passenden Wort- und Variantenraum prüfen. `backup9` erscheint bei einer systematischen Ziffernanhangsuche deutlich früher als bei einer vollständigen Suche durch unzählige Zeichenkombinationen – sofern das Basiswort überhaupt in der gewählten Liste steht. Im Beispiel wurde `test9` über genau eine solche Ziffernanhang-Strategie gefunden.

Ein langes, zufälliges Passwort bleibt trotz guter Wörterbücher schwierig. Keine noch so hübsche Fortschrittsanzeige kann den tatsächlich durchsuchten Raum größer machen.

## 8. Was »lokal« beim Datenschutz wirklich bedeutet {#datenschutz}

Beim Archiv-Upload an einen fremden Dienst müsste man vertrauliche Daten herausgeben und den Datenschutzbehauptungen dieses Dienstes vertrauen. Hier verbleibt die ausgewählte Datei im Browser. Die Anwendung lädt zwar Skripte, Bibliotheken und Wörterbücher von der Website, aber ihre vorgesehenen Verifikations- und Downloadpfade arbeiten ohne privaten Datei-Upload. Ist der Code samt benötigter Dateien geladen, kann die lokale Suche nach Angaben der Anwendung auch offline weiterarbeiten.

Trotzdem gilt: Vertraue nur Websites und Browser-Erweiterungen, deren Verhalten du einschätzen kannst. Browser-Sicherheitslücken, kompromittierter ausgelieferter Code oder Erweiterungen lassen sich nicht durch das Wort »lokal« wegzaubern. Bei besonders sensiblen Daten lohnt sich eine isolierte Umgebung und eine zusätzliche eigene Prüfung.

Das Lab verarbeitet Archive mit strikten Größen- und Entpacklimits. Es öffnet darin enthaltene Programme nicht automatisch. Beim Zurücksetzen werden Worker beendet und Download-URLs freigegeben; das ist **kein** Versprechen, sämtliche Speicherreste sicher zu überschreiben.

## 9. Ein echtes Test-ZIP direkt im Browser erzeugen {#testzip}

Du möchtest zuerst wissen, ob das Ganze funktioniert? Im Abschnitt **»Echte Test-ZIP erstellen«** vergibst du ein bekanntes Demopasswort und wählst eine ZIP-Verschlüsselung – beispielsweise ZipCrypto oder ZIP-AES-256. Danach erstellt der Browser ein tatsächlich verschlüsseltes Beispielarchiv. Das Lab kann dieses Beispiel direkt übernehmen oder als ZIP herunterladen.

Wichtig: Das bekannte Passwort wird **nicht** heimlich an die eigentliche Suchmaschine übergeben. Sie muss die Zeichenfolge aus den aktivierten Suchmethoden finden. Beginne zum Nachvollziehen mit einem kurzen, bewusst einfachen Testpasswort. Ein zufälliger 24-Zeichen-Test ist kein sinnvoller erster Funktionstest.

**Bild:** [Screenshot deutsch_3.webp – Original von Dennis Hilk]. Alt-Text: »Integrierter Generator für wirklich verschlüsselte ZIP-Testdateien mit ZIP-AES-256 und technischen Erklärungen«.

## 10. Häufige Fragen {#faq}

### Kann ich eine ZIP-Datei ohne Passwort öffnen?

Bei einer verschlüsselten ZIP-Datei muss das richtige Passwort beziehungsweise der passende Schlüssel ermittelt werden. Das Lab probiert Kandidaten lokal und verifiziert sie; es umgeht keine beliebig starke Verschlüsselung.

### Ist die ZIP-Passwortwiederherstellung kostenlos?

Das Archive Recovery Lab ist kostenlos nutzbar. Es verwendet Rechenleistung deines eigenen Computers und ist auf die dokumentierten Dateigrößen und Formate begrenzt.

### Muss ich für WinRAR, RAR5 oder 7-Zip etwas installieren?

Für die **vom Lab unterstützten Varianten** ist kein zusätzliches lokales Recovery-Programm erforderlich. RAR- und 7Z-Wiederherstellung nutzen lokal geladene WebAssembly-Komponenten; inkompatible Varianten können abgewiesen werden.

### Kann ich ein PDF mit vergessenem Öffnungspasswort wiederherstellen?

Bei dokumentierten PDF-Standard-Security-Handler-Varianten kann das Lab Kandidaten ausprobieren. Reine Druck- und Kopiersperren sind ein anderer Fall und kein vergessenes Öffnungspasswort.

### Warum steht die Restzeit auf »über 10 Jahre«?

Eine Schätzung beschreibt die aktuelle Suchraumgröße bei einer gemessenen Rate. Sie ist **kein** Zeitversprechen: Ein Treffer kann sofort, sehr spät oder gar nicht innerhalb der ausgewählten Suche liegen.

### Kann die Suche meinen PC verlangsamen?

Ja. Die CPU-Worker prüfen echte Kandidaten. Wähle weniger Worker, pausiere oder beende die Suche, wenn du Ressourcen für andere Anwendungen brauchst.

### Wie bekomme ich die entschlüsselten Dateien?

Erst nach unabhängiger Bestätigung erscheinen verfügbare Download-Schaltflächen. Bei unterstützten Archiven kannst du einzelne Dateien oder eine neu erzeugte ZIP herunterladen; PDFs werden entsprechend ihrem unterstützten Ergebnis angeboten. Das Original wird nicht verändert.

### Was ist, wenn kein Passwort gefunden wird?

Dann wurde es innerhalb des gewählten Suchraums nicht bestätigt. Das beweist **weder**, dass ein Passwort unmöglich zu finden ist, **noch**, dass dein Archiv defekt sein muss. Prüfe dein Vorwissen, Kandidatenmuster und die genaue Verschlüsselungsvariante.

## 11. Selbst ausprobieren {#ausprobieren}

Wenn du eine eigene Datei mit vergessenem Passwort besitzt, beginne mit einem kleinen, gut eingrenzbaren Suchraum: **[Zum Archive Recovery Lab](/de/museum/archive-recovery-lab/)**. Für das Grundlagenexperiment mit CPU, GPU und einem künstlichen SHA-256-Ziel lohnt sich daneben das [Password Cracking Lab](/de/museum/password-cracking-lab/) und mein Artikel [Wie schnell knackt dein Computer ein Passwort?](/de/blog/how-fast-can-your-computer-crack-a-password/). Das sind zwei unterschiedliche Experimente, die sich gegenseitig gut erklären.

**Nur eigene oder ausdrücklich freigegebene Dateien verwenden.**

## Quellen und technische Dokumentation {#quellen}

- [MDN: File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API)
- [PKWARE: ZIP Application Note](https://support.pkware.com/home/pkzip/developer-tools/appnote)
- [WinZip: AES-Spezifikation AE-1/AE-2](https://www.winzip.com/en/support/aes-encryption/)
- [RARLAB: RAR-5-Formatbeschreibung](https://www.rarlab.com/technote.htm)
- [7-Zip: LZMA SDK](https://www.7-zip.org/sdk.html)
- [qpdf: Verschlüsselung und Passwortvarianten](https://github.com/qpdf/qpdf/blob/main/manual/encryption.rst)
- [Implementierung: Archive Recovery Lab](https://github.com/dennishilk/dennishilk.github.io/tree/main/assets/archive-recovery-lab)
- [Quellen und Lizenzen der Wörterbücher](/assets/password-cracking-lab/wordlists/sources.json)
