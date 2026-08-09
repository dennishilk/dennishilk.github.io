(() => {
  const bundle = window.DennisSiteI18nDE || (window.DennisSiteI18nDE = { common: {}, prefixes: {}, pages: {} });
  bundle.common ||= {};
  bundle.prefixes ||= {};
  bundle.pages ||= {};

  const mergeSpec = (target, extra) => {
    target ||= {};
    for (const key of ["text", "attributes", "html"]) target[key] = Object.assign({}, target[key] || {}, extra[key] || {});
    target.phrases = [...(target.phrases || []), ...(extra.phrases || [])];
    if (extra.title) target.title = extra.title;
    if (extra.description) target.description = extra.description;
    return target;
  };
  const addPage = (path, spec) => { bundle.pages[path] = mergeSpec(bundle.pages[path], spec); };
  const addPrefix = (path, spec) => { bundle.prefixes[path] = mergeSpec(bundle.prefixes[path], spec); };

  addPrefix("/museum/linux-terminal-academy/", {
    phrases: [
      ["TRY:", "PROBIERE:"],
      ["MISSION:", "MISSION:"],
      ["SOURCE", "QUELLE"],
      ["OWNER", "EIGENTÜMER"],
      ["GROUP", "GRUPPE"],
      ["OTHERS", "ANDERE"],
      ["no access", "kein Zugriff"],
      ["read · w = write · x = execute", "lesen · w = schreiben · x = ausführen"],
      ["running · S = sleeping · ENDED = stopped", "laufend · S = schlafend · ENDED = beendet"],
      ["INACTIVE", "INAKTIV"],
      ["SERVICES:", "DIENSTE:"],
      ["FILESYSTEM:", "DATEISYSTEM:"],
      ["OVERALL:", "GESAMT:"],
      ["PROCESS", "PROZESS"],
      ["SERVICE", "DIENST"],
      ["PERMISSIONS", "BERECHTIGUNGEN"],
      ["The high-CPU museum-render-worker is non-essential. Request a safe stop with: kill 733", "Der museum-render-worker mit hoher CPU-Last ist nicht essenziell. Fordere eine sichere Beendigung an mit: kill 733"],
      ["Observe the fictional process table first: ps aux. Find the process consuming unusual CPU before stopping it.", "Untersuche zuerst die fiktive Prozesstabelle mit: ps aux. Finde den Prozess mit ungewöhnlich hoher CPU-Last, bevor du ihn stoppst."],
      ["Inspect the failed fictional service: systemctl status museum-exhibit.service", "Prüfe den ausgefallenen fiktiven Dienst: systemctl status museum-exhibit.service"],
      ["Read its fictional journal for the failure detail: journalctl -u museum-exhibit.service", "Lies das fiktive Journal für Details zum Fehler: journalctl -u museum-exhibit.service"],
      ["The required file is currently missing. This Academy can recreate it with: touch /srv/museum/exhibit-index.txt, then set its required mode with chmod 600 /srv/museum/exhibit-index.txt. RESET LAB also restores the original fictional file.", "Die benötigte Datei fehlt derzeit. Die Academy kann sie mit touch /srv/museum/exhibit-index.txt neu erstellen; setze danach die benötigten Rechte mit chmod 600 /srv/museum/exhibit-index.txt. LABOR ZURÜCKSETZEN stellt ebenfalls die ursprüngliche fiktive Datei wieder her."],
      ["Inspect the mode with: ls -l /srv/museum/exhibit-index.txt. The owner needs read permission; the final recovery requires the exact minimum mode rw------- (600).", "Prüfe die Rechte mit: ls -l /srv/museum/exhibit-index.txt. Der Eigentümer braucht Leserecht; für die finale Wiederherstellung ist exakt der minimale Modus rw------- (600) erforderlich."],
      ["The file is readable, but this mission requires the minimum necessary mode, not extra execute or group/other access. Repair it with: chmod 600 /srv/museum/exhibit-index.txt", "Die Datei ist lesbar, aber diese Mission verlangt die minimal notwendigen Rechte — keine zusätzlichen Ausführrechte und keinen Gruppen-/Anderen-Zugriff. Repariere sie mit: chmod 600 /srv/museum/exhibit-index.txt"],
      ["The file now has the exact minimum mode. Restart the fictional service: systemctl restart museum-exhibit.service", "Die Datei hat jetzt exakt die minimalen Rechte. Starte den fiktiven Dienst neu: systemctl restart museum-exhibit.service"],
      ["Verify the recovery with: systemctl status museum-exhibit.service", "Überprüfe die Wiederherstellung mit: systemctl status museum-exhibit.service"],
      ["All recovery conditions are satisfied. Review the mission checklist and system health panel.", "Alle Bedingungen für die Wiederherstellung sind erfüllt. Prüfe die Missionsliste und das Systemzustandsfeld."]
    ]
  });

  addPage("/museum/linux-terminal-academy/", {
    html: {
      ".linux-academy-reassurance p": "Jede Übung läuft ausschließlich in einer fiktiven Browser-Umgebung. Kein Zugriff auf eine echte Shell, Dateien, Prozesse, Dienste, Netzwerk oder <code>sudo</code>.",
      ".linux-academy-graduation > div p": "Schließe die finale Recovery-Challenge in Lab 08 ab und du kannst ein druckbares Zertifikat der Linux Terminal Academy erhalten. Übe frei, nutze beim Lernen Hinweise und probiere es so oft du möchtest.",
      ".linux-academy-graduation ul li:nth-child(1)": "Hinweise in den Laboren 01–07 sind völlig in Ordnung.",
      ".linux-academy-graduation ul li:nth-child(2)": "Fehler und Experimentieren sind ausdrücklich in Ordnung.",
      ".linux-academy-graduation ul li:nth-child(3)": "Ein erfolgreicher Lab-08-Durchlauf ohne Hinweis verdient das Zertifikat.",
      ".linux-academy-lead": "Alle acht Labore laufen in einem konsistenten fiktiven Linux-System. Lab 08 bietet zusätzlich eine optionale Zertifikats-Challenge.",
      ".linux-lab-card:nth-child(1) p": "Lerne die Kommandozeile als eine weitere Oberfläche des Betriebssystems kennen — Linux-Vorkenntnisse sind nicht erforderlich.",
      ".linux-lab-card:nth-child(2) p": "Navigiere durch den Linux-Verzeichnisbaum, verstehe Pfade und sieh, warum alles bei <code>/</code> beginnt.",
      ".linux-lab-card:nth-child(3) p": "Erstelle, verschiebe, prüfe, lösche und rekonstruiere Dateien in einem fiktiven Dateisystem.",
      ".linux-lab-card:nth-child(4) p": "Lerne, warum Zugriff verweigert wird — und wie du die kleinstmögliche passende Korrektur vornimmst.",
      ".linux-lab-card:nth-child(5) p": "Finde heraus, was Programme während der Ausführung tun, und diagnostiziere anschließend ein langsames System.",
      ".linux-lab-card:nth-child(6) p": "Verbinde einfache Werkzeuge zu nützlichen Abläufen und verfolge Daten durch eine Pipeline.",
      ".linux-lab-card:nth-child(7) p": "Lies Hinweise, diagnostiziere einen ausgefallenen fiktiven Dienst und stelle ihn sorgfältig wieder her.",
      ".linux-lab-card:nth-child(8) p": "Führe alle bisherigen Ideen in einer zurücksetzbaren, zusammenhängenden Recovery-Challenge zusammen.",
      ".linux-academy-note p:nth-of-type(1)": "Ein echter Debian-Server hinter diesem Museum stellt derzeit 1.071 unterschiedliche Terminalbefehle bereit. Du musst sie nicht auswendig lernen.",
      ".linux-academy-note p:nth-of-type(2)": "Bei Linux geht es darum, navigieren und prüfen zu lernen, kleine Werkzeuge zu kombinieren, Handbücher zu lesen und Fehler zu suchen. Genau das vermitteln diese acht Labore.",
      ".linux-academy-command-stats": "8 LABORE · ~40 KERNBEFEHLE · 1.071 BEFEHLE AUF EINEM ECHTEN DEBIAN-SERVER"
    }
  });

  addPage("/museum/linux-terminal-academy/terminal-first-steps/", {
    html: {
      ".detail-card:first-child ul": "<li>Nutze <code>pwd</code>, <code>whoami</code>, <code>uname</code> und <code>date</code>, um dem System grundlegende Fragen zu stellen.</li><li>Liste Verzeichnisse mit <code>ls</code> auf und wechsle mit <code>cd</code> den Ort; nutze <code>clear</code>, wenn du den Bildschirm aufräumen möchtest.</li><li>Verstehe, dass <code>help</code> und <code>man</code> Möglichkeiten sind, einen Befehl nachzuschlagen — keine Zauberwörter, die du auswendig lernen musst.</li>",
      ".detail-card:nth-of-type(3) p:first-of-type": "Das fiktive Terminal reagiert auf deine eingegebenen Befehle. Beginne mit <code>pwd</code>; nichts davon kann deinen echten Computer beeinflussen.",
      ".linux-lab-safety p": "Dieses interaktive Labor nutzt ausschließlich ein fiktives System im Browserspeicher. Es führt niemals echte Shell-Befehle aus und greift nicht auf deine Dateien, dein Betriebssystem, Prozesse, Dienste oder dein Netzwerk zu."
    }
  });

  addPage("/museum/linux-terminal-academy/filesystem-explorer/", {
    html: {
      ".detail-card:first-child ul": "<li>Erkenne typische Orte: <code>/home</code>, <code>/etc</code>, <code>/var</code> und <code>/tmp</code>.</li><li>Lies absolute Pfade, die bei <code>/</code> beginnen, und relative Pfade, die am aktuellen Ort beginnen.</li><li>Nutze <code>.</code> für das aktuelle Verzeichnis und <code>..</code> für dessen übergeordnetes Verzeichnis.</li>",
      ".linux-lab-mission p": "Navigiere auf demselben fiktiven Linux-Computer wie in Lab 01. Terminal und Dateisystembaum bleiben synchron.",
      ".detail-card:nth-of-type(3) p": "Nutze <code>cd</code>, <code>pwd</code>, <code>ls</code> und <code>cat</code>, um Pfade in einem Dateisystem zu erkunden, das ausschließlich im Browserspeicher existiert.",
      ".linux-lab-safety p": "Dieses interaktive Labor nutzt ausschließlich ein fiktives System im Browserspeicher. Es führt niemals echte Shell-Befehle aus und greift nicht auf deine Dateien, Prozesse, Dienste oder dein Betriebssystem zu."
    }
  });

  addPage("/museum/linux-terminal-academy/files-directories/", {
    html: {
      ".detail-card:first-child ul": "<li>Erstelle Verzeichnisse und Dateien mit <code>mkdir</code> und <code>touch</code>.</li><li>Kopiere, benenne um und entferne mit <code>cp</code>, <code>mv</code> und <code>rm</code>.</li><li>Lies Dateiinhalte mit <code>cat</code> und überprüfe Änderungen mit <code>ls</code>.</li>",
      ".detail-card:nth-of-type(3) p": "Befehle verändern ausschließlich das fiktive Dateisystem des Labors. Beobachte jede Auswirkung im Live-Baum und setze die virtuelle Maschine zurück, wann immer du möchtest.",
      ".linux-lab-safety p": "Dieses interaktive Labor läuft nur im Browserspeicher. Es führt niemals echte Shell-Befehle aus und greift nicht auf deine Dateien, Prozesse, Dienste oder dein Betriebssystem zu."
    }
  });

  addPage("/museum/linux-terminal-academy/permissions-users/", {
    html: {
      ".detail-card:first-child ul": "<li>Prüfe die fiktive Identität mit <code>whoami</code> und <code>id</code>.</li><li>Lies <code>ls -l</code>: Eigentümer, Gruppe, Andere und das <code>rwx</code>-Berechtigungsmodell.</li><li>Verstehe die Konzepte hinter <code>chmod</code>, root und <code>sudo</code>.</li>",
      ".detail-card:nth-of-type(3) p": "Übe Eigentümer und Berechtigungen in einem zurücksetzbaren fiktiven System im Browserspeicher. Keine echte Rechteausweitung, kein <code>sudo</code>-Zugriff und keine Änderungen an deinem Computer.",
      ".linux-lab-safety p": "Dieses interaktive Labor läuft ausschließlich in einem fiktiven System im Browserspeicher. Es führt niemals echte Shell-Befehle aus und greift nicht auf deine Dateien, Prozesse, Dienste oder dein Betriebssystem zu."
    }
  });

  addPage("/museum/linux-terminal-academy/process-control/", {
    html: {
      ".detail-card:first-child ul": "<li>Lerne Prozess- und PID-Konzepte mit <code>ps</code> und einer top-ähnlichen Ansicht kennen.</li><li>Unterscheide Vordergrund- und Hintergrundarbeit und lerne anschließend Signale sowie das <code>kill</code>-Konzept kennen.</li><li>Erst prüfen, dann handeln: Eine hohe CPU-Zahl ist ein Hinweis, aber noch keine vollständige Diagnose.</li>",
      ".detail-card:nth-of-type(3) p": "Untersuche eine deterministische fiktive Prozesstabelle, setze Signale bewusst ein und setze das Labor jederzeit sicher zurück.",
      ".linux-lab-safety p": "Dieses interaktive Labor läuft ausschließlich in einem fiktiven System im Browserspeicher. Es führt niemals echte Shell-Befehle aus und greift nicht auf deine Dateien, Prozesse, Dienste oder dein Betriebssystem zu."
    }
  });

  addPage("/museum/linux-terminal-academy/pipes-shell-power/", {
    html: {
      ".detail-card:first-child ul": "<li>Verfolge Textausgabe durch den Pipe-Operator <code>|</code>.</li><li>Finde konkrete Logeinträge mit <code>grep</code>, zähle mit <code>wc -l</code> und zeige Ausschnitte mit <code>head</code> oder <code>tail</code>.</li><li>Lies eine Pipeline von links nach rechts, ohne eine echte Shell auszuführen.</li>",
      ".detail-card:nth-of-type(3) p": "Nutze ein deterministisches Log im Browserspeicher und sieh die tatsächliche Ausgabe jeder Pipeline-Stufe.",
      ".linux-lab-safety p": "Dieses Labor modelliert ausdrücklich nur eine kleine Menge fiktiver Befehle. Es führt niemals echte Shell-Befehle aus und greift nicht auf deine Dateien, Prozesse, Dienste oder dein Betriebssystem zu."
    }
  });

  addPage("/museum/linux-terminal-academy/system-admin-crash-lab/", {
    html: {
      ".detail-card:first-child ul": "<li>Prüfe den Zustand eines Dienstes, bevor du eine Reparatur versuchst.</li><li>Lies ein gezieltes fiktives Journal und untersuche die Konfiguration als Beweismittel.</li><li>Behebe die Ursache, starte bewusst neu und überprüfe das Ergebnis.</li>",
      ".detail-card:nth-of-type(3) p": "Alle Dienste, Dateien und Journale sind deterministische Fiktion im Browserspeicher.",
      ".linux-lab-safety p": "Dieses Labor führt niemals echtes systemd, Shell-Befehle, Logs oder Netzwerkanfragen aus. Es modelliert ausschließlich ein kleines fiktives System in deinem Browser."
    }
  });

  addPage("/museum/linux-terminal-academy/break-it-recover/", {
    html: {
      ".detail-card:first-child ul": "<li>Finde mit <code>ps</code> oder <code>top</code> einen außer Kontrolle geratenen fiktiven Prozess.</li><li>Lies Dienststatus und Journale und verfolge anschließend einen ausgefallenen Dienst bis zu einer nicht lesbaren Inhaltsdatei.</li><li>Führe die kleinstmögliche Berechtigungsreparatur aus, starte neu und überprüfe das Ergebnis.</li>",
      ".detail-card:nth-of-type(3) p:first-of-type": "Dieses finale Labor ist fiktiv, läuft nur im Browser und lässt sich zurücksetzen. Es verbindet sich niemals mit deinem Computer.",
      ".linux-lab-safety p": "Das interaktive Terminal nutzt ausschließlich Browserspeicher. Es führt niemals echte Shell-Befehle aus und greift nicht auf deine Dateien, Prozesse, Dienste oder dein Betriebssystem zu."
    }
  });

  addPage("/museum/linux-terminal-academy/certificate.html", {
    title: "Zertifikat – Linux Terminal Academy",
    description: "Optionales browserlokales Abschlusszertifikat der Linux Terminal Academy nach erfolgreicher Lab-08-Recovery ohne Hinweis.",
    text: {
      "PRINT / SAVE AS PDF": "DRUCKEN / ALS PDF SPEICHERN",
      "START FRESH FOR ANOTHER VISITOR": "FÜR EINEN ANDEREN BESUCHER ZURÜCKSETZEN",
      "CERTIFICATE LOCKED": "ZERTIFIKAT GESPERRT",
      "Complete Lab 08 recovery without using NEED A HINT? during that attempt to unlock this optional Computer Museum educational certificate.": "Schließe die Wiederherstellung in Lab 08 ab, ohne in diesem Versuch BRAUCHST DU EINEN HINWEIS? zu verwenden, um dieses optionale Lernzertifikat des Computer Museums freizuschalten.",
      "RETURN TO LAB 08": "ZURÜCK ZU LAB 08",
      "LOCAL GRADUATION STATE CLEARED.": "LOKALER ABSCHLUSSSTATUS GELÖSCHT.",
      "This browser is ready for another visitor.": "Dieser Browser ist bereit für einen anderen Besucher.",
      "BACK TO ACADEMY": "ZURÜCK ZUR ACADEMY",
      "START LAB 08": "LAB 08 STARTEN",
      "CERTIFICATE OF COMPLETION": "ABSCHLUSSZERTIFIKAT",
      "This certifies that": "Hiermit wird bestätigt, dass",
      "Your display name (stored only in this browser)": "Dein Anzeigename (nur in diesem Browser gespeichert)",
      "VISITOR NAME": "NAME DES BESUCHERS",
      "has successfully demonstrated the skills covered by the Linux Terminal Academy and completed the final fictional Linux system recovery challenge without assistance from the built-in hint system.": "die in der Linux Terminal Academy vermittelten Fähigkeiten erfolgreich gezeigt und die finale fiktive Linux-System-Recovery-Challenge ohne Unterstützung des eingebauten Hinweissystems abgeschlossen hat.",
      "8-LAB CURRICULUM": "8-LABOR-CURRICULUM",
      "ACADEMY PROGRAM": "ACADEMY-PROGRAMM",
      "FINAL RECOVERY: SUCCESSFUL": "FINALE RECOVERY: ERFOLGREICH",
      "CUMULATIVE CHALLENGE": "GESAMT-CHALLENGE",
      "HINTS USED: 0": "GENUTZTE HINWEISE: 0",
      "SUCCESSFUL ATTEMPT": "ERFOLGREICHER VERSUCH",
      "ISSUED BY": "AUSGESTELLT VON",
      "ISSUED": "AUSGESTELLT",
      "CERTIFICATE ID": "ZERTIFIKATS-ID",
      "A browser-local educational museum achievement; not a professional certification.": "Eine browserlokale Lern-Auszeichnung des Museums; keine berufliche Zertifizierung.",
      "Start fresh for another visitor?": "Für einen anderen Besucher zurücksetzen?",
      "This removes the locally stored Linux Terminal Academy graduation/certificate state and saved display name from this browser only.": "Dadurch werden ausschließlich in diesem Browser der lokal gespeicherte Abschluss-/Zertifikatsstatus der Linux Terminal Academy und der gespeicherte Anzeigename gelöscht.",
      "Downloaded or printed certificates are not affected.": "Heruntergeladene oder gedruckte Zertifikate sind davon nicht betroffen.",
      "CLEAR LOCAL STATE": "LOKALEN STATUS LÖSCHEN",
      "CANCEL": "ABBRECHEN"
    },
    attributes: {
      "Computer Museum Linux Terminal Academy 8 Labs seal": "Siegel: Computer Museum Linux Terminal Academy – 8 Labore"
    }
  });

  addPage("/news.html", {
    title: "Linux News – Aktuelle Meldungen – Dennis Hilk",
    description: "Aktuelle Linux-Meldungen aus Phoronix und OMG!Ubuntu in einem automatisch aktualisierten News-Feed.",
    text: {
      "Linux News": "Linux News",
      "Latest Linux updates automatically fetched from Phoronix & OMG!Ubuntu": "Aktuelle Linux-Meldungen, automatisch von Phoronix & OMG!Ubuntu geladen",
      "Fresh from the Penguin World 🐧": "Frisch aus der Pinguin-Welt 🐧",
      "Fetching latest Linux News": "Aktuelle Linux-News werden geladen"
    },
    phrases: [["Feed Error", "Feed-Fehler"]]
  });

  addPage("/blog/", {
    title: "Blog – Dennis Hilk",
    description: "Notizen aus echten Linux-Systemen: gebaut, kaputtgemacht, repariert und im Alltag benutzt.",
    text: {
      "Notes from real systems. Built, broken, fixed, and lived with.": "Notizen aus echten Systemen. Gebaut, kaputtgemacht, repariert und im Alltag benutzt.",
      "Clusters": "Themenbereiche",
      "What Actually Works": "Was tatsächlich funktioniert",
      "Systems, tools, and decisions that survived real usage. No hype cycles — only setups that kept working after weeks and months.": "Systeme, Werkzeuge und Entscheidungen, die echten Alltag überstanden haben. Keine Hype-Zyklen — nur Setups, die auch nach Wochen und Monaten noch funktionierten.",
      "Window Managers in the Real World": "Window Manager in der echten Welt",
      "Beyond screenshots and dotfile worship. What stayed, what broke, and what quietly did its job.": "Jenseits von Screenshots und Dotfile-Kult. Was blieb, was kaputtging und was einfach still seinen Job erledigte.",
      "Linux Gaming & OBS — No Marketing Edition": "Linux Gaming & OBS — ohne Marketing",
      "How gaming and recording actually behave. NVIDIA, NVENC, OBS — without promises or slides.": "Wie Gaming und Aufnahmen sich tatsächlich verhalten. NVIDIA, NVENC, OBS — ohne Versprechen und Präsentationsfolien.",
      "Hardware Notes": "Hardware-Notizen",
      "Hardware as part of the system, not an afterthought. Why some components disappear from thought — and others never do.": "Hardware als Teil des Systems, nicht als nachträglicher Gedanke. Warum manche Komponenten aus dem Bewusstsein verschwinden — und andere niemals.",
      "Tools, Automation & Small Leverage": "Werkzeuge, Automatisierung & kleine Hebel",
      "Small tools that remove repeated mental effort. Built because something was annoying more than once.": "Kleine Werkzeuge, die wiederkehrende Denkarbeit beseitigen. Gebaut, weil etwas mehr als einmal genervt hat.",
      "Notes, Fails & System Philosophy": "Notizen, Fails & Systemphilosophie",
      "Reflections on paths taken and paths abandoned. Lessons extracted from systems that were actually used.": "Gedanken über eingeschlagene und aufgegebene Wege. Lektionen aus Systemen, die tatsächlich benutzt wurden.",
      "Why I Rolled Back a “Perfect” Setup": "Warum ich ein „perfektes“ Setup zurückgerollt habe",
      "When Tinkering Becomes Noise": "Wenn Basteln zu Rauschen wird",
      "January 2026": "Januar 2026"
    }
  });

  addPage("/blog/posts/why-i-rolled-back-a-perfect-setup.html", {
    title: "Warum ich ein „perfektes“ Setup zurückgerollt habe – Dennis Hilk",
    description: "Warum ein technisch perfektes Linux-Setup mental scheiterte und der Rollback es besser machte.",
    text: {
      "Why I Rolled Back a “Perfect” Setup": "Warum ich ein „perfektes“ Setup zurückgerollt habe",
      "Notes, Fails & System Philosophy · January 2026": "Notizen, Fails & Systemphilosophie · Januar 2026",
      "At some point, the system was perfect.": "Irgendwann war das System perfekt.",
      "XMonad tuned. Polybar polished. Shortcuts memorized. Everything worked. Nothing was broken.": "XMonad abgestimmt. Polybar poliert. Shortcuts auswendig gelernt. Alles funktionierte. Nichts war kaputt.",
      "And still — it had to go.": "Und trotzdem — es musste weg.",
      "Not because it failed technically. But because it failed mentally.": "Nicht weil es technisch versagte. Sondern weil es mental versagte.",
      "Every small change required thought. Every adjustment pulled me back into configuration mode.": "Jede kleine Änderung erforderte Aufmerksamkeit. Jede Anpassung zog mich zurück in den Konfigurationsmodus.",
      "The system demanded attention instead of disappearing into the background.": "Das System verlangte Aufmerksamkeit, statt im Hintergrund zu verschwinden.",
      "I realized I was maintaining a setup instead of using a computer. The mental overhead outweighed the gains.": "Mir wurde klar, dass ich ein Setup wartete, statt einen Computer zu benutzen. Der mentale Aufwand war größer als der Gewinn.",
      "So I rolled everything back.": "Also rollte ich alles zurück.",
      "Fewer tweaks. Fewer decisions. Fewer moving parts.": "Weniger Tweaks. Weniger Entscheidungen. Weniger bewegliche Teile.",
      "The result wasn’t as elegant. But it was quieter.": "Das Ergebnis war nicht so elegant. Aber es war ruhiger.",
      "And that made it better.": "Und genau das machte es besser.",
      "Screenshots don’t show the cost of perfection. A system that survives daily use is worth more than one that impresses once.": "Screenshots zeigen nicht den Preis von Perfektion. Ein System, das den Alltag übersteht, ist mehr wert als eines, das einmal beeindruckt.",
      "rolled back quietly": "still zurückgerollt",
      "reduced mental noise": "weniger mentales Rauschen",
      "system survived": "System überlebt"
    },
    phrases: [["Reason:", "Grund:"], ["Outcome:", "Ergebnis:"]]
  });

  addPage("/blog/posts/when-tinkering-becomes-noise.html", {
    title: "Wenn Basteln zu Rauschen wird – Dennis Hilk",
    description: "Eine kurze Notiz über Wayland, OBS und den richtigen Zeitpunkt aufzuhören — über Kontext, Timing und mentales Rauschen auf Produktivsystemen.",
    text: {
      "When Tinkering Becomes Noise": "Wenn Basteln zu Rauschen wird",
      "Notes, Fails & System Philosophy · January 2026": "Notizen, Fails & Systemphilosophie · Januar 2026",
      "A short note on Wayland, OBS, and knowing when to stop": "Eine kurze Notiz über Wayland, OBS und darüber, wann man aufhören sollte",
      "Context": "Kontext",
      "What I wanted": "Was ich wollte",
      "What actually happened": "Was tatsächlich passierte",
      "The real mistake": "Der eigentliche Fehler",
      "The moment of clarity": "Der Moment der Klarheit",
      "The rollback": "Der Rollback",
      "The lesson": "Die Lektion",
      "Closing note": "Abschließende Notiz",
      "This is not a “Wayland is bad” article. It’s a note about timing, context, and misplaced effort.": "Das ist kein „Wayland ist schlecht“-Artikel. Es ist eine Notiz über Timing, Kontext und Aufwand an der falschen Stelle.",
      "At some point, I decided that my main workstation should move to Wayland. Not because something was broken — but because it felt like the “correct” next step.": "Irgendwann entschied ich, dass meine Haupt-Workstation auf Wayland wechseln sollte. Nicht weil etwas kaputt war — sondern weil es sich wie der „richtige“ nächste Schritt anfühlte.",
      "New protocol. Modern graphics stack. Everyone talking about it.": "Neues Protokoll. Moderner Grafik-Stack. Alle reden darüber.",
      "So I did what many of us do: I started migrating before I had a reason to.": "Also tat ich, was viele von uns tun: Ich begann mit der Migration, bevor ich überhaupt einen Grund dafür hatte.",
      "daily desktop": "täglicher Desktop",
      "NVIDIA GPU": "NVIDIA-GPU",
      "OBS recording": "OBS-Aufnahmen",
      "NVENC encoding": "NVENC-Encoding",
      "gaming + capture": "Gaming + Capture",
      "no surprises": "keine Überraschungen",
      "On paper, this should have worked. In practice, it didn’t — not in the way I needed it to.": "Auf dem Papier hätte das funktionieren sollen. In der Praxis tat es das nicht — jedenfalls nicht so, wie ich es brauchte.",
      "Nothing catastrophic broke. That was the problem.": "Nichts ging katastrophal kaputt. Genau das war das Problem.",
      "Instead, I got:": "Stattdessen bekam ich:",
      "inconsistent OBS behavior": "inkonsistentes OBS-Verhalten",
      "capture sources behaving differently per compositor": "Capture-Quellen, die sich je nach Compositor anders verhielten",
      "odd focus issues": "seltsame Fokusprobleme",
      "small latency quirks": "kleine Latenz-Eigenheiten",
      "things that almost worked": "Dinge, die fast funktionierten",
      "Every single issue was:": "Jedes einzelne Problem war:",
      "explainable": "erklärbar",
      "debuggable": "debuggbar",
      "“probably fixable with more time”": "„mit mehr Zeit wahrscheinlich lösbar“",
      "And that’s where the real failure began.": "Und genau dort begann das eigentliche Scheitern.",
      "The mistake was not using Wayland.": "Der Fehler war nicht, Wayland zu benutzen.",
      "The mistake was this assumption:": "Der Fehler war diese Annahme:",
      "“If I just push through this, it will become my new normal.”": "„Wenn ich mich da einfach durchbeiße, wird es irgendwann mein neuer Normalzustand.“",
      "But this machine was not a playground. It was a production system.": "Aber diese Maschine war kein Spielplatz. Sie war ein Produktivsystem.",
      "I record on it. I test on it. I rely on it.": "Ich nehme darauf auf. Ich teste darauf. Ich verlasse mich darauf.",
      "Every hour spent debugging was an hour of mental noise added to a system that previously had none.": "Jede Stunde Debugging fügte einem System, das vorher keines hatte, eine weitere Stunde mentales Rauschen hinzu.",
      "Nothing was on fire — but everything required attention.": "Nichts stand in Flammen — aber alles verlangte Aufmerksamkeit.",
      "At some point I realized:": "Irgendwann wurde mir klar:",
      "Plasma X11 already did everything I needed": "Plasma X11 tat bereits alles, was ich brauchte",
      "OBS + NVENC were rock solid": "OBS + NVENC liefen absolut stabil",
      "Games behaved predictably": "Spiele verhielten sich vorhersehbar",
      "I stopped thinking about the graphics stack entirely": "Ich dachte überhaupt nicht mehr über den Grafik-Stack nach",
      "And that last point mattered the most.": "Und der letzte Punkt war der wichtigste.",
      "The system disappeared from my thoughts. That’s usually a sign it’s doing its job.": "Das System verschwand aus meinen Gedanken. Das ist meistens ein Zeichen dafür, dass es seinen Job erledigt.",
      "I went back. Calmly.": "Ich ging zurück. Ganz ruhig.",
      "No rage. No blog post titled “Why Wayland Is Broken”. Just a quiet rollback to what worked.": "Keine Wut. Kein Blogpost mit dem Titel „Warum Wayland kaputt ist“. Einfach ein stiller Rollback zu dem, was funktionierte.",
      "And something interesting happened:": "Und etwas Interessantes passierte:",
      "The urge to “fix” things vanished. The machine became boring again.": "Der Drang, Dinge zu „reparieren“, verschwand. Die Maschine wurde wieder langweilig.",
      "In the best possible way.": "Auf die bestmögliche Art.",
      "Not every improvement is an upgrade. Not every new technology belongs in every system.": "Nicht jede Verbesserung ist ein Upgrade. Nicht jede neue Technologie gehört in jedes System.",
      "Wayland isn’t the problem. Using it without a concrete need was.": "Wayland ist nicht das Problem. Es ohne konkreten Bedarf einzusetzen war es.",
      "For experimental setups, side systems, show machines — absolutely. For a workstation that must behave the same every day?": "Für experimentelle Setups, Nebensysteme und Show-Maschinen — absolut. Für eine Workstation, die sich jeden Tag gleich verhalten muss?",
      "Not yet. Not for me.": "Noch nicht. Nicht für mich.",
      "This wasn’t a failure of software. It was a failure of context awareness.": "Das war kein Versagen der Software. Es war ein Versagen beim Einschätzen des Kontexts.",
      "Sometimes the most technical decision you can make is to stop.": "Manchmal ist die technischste Entscheidung, die man treffen kann, aufzuhören."
    }
  });

  addPage("/traffic.html", {
    title: "Site Traffic Observer – worldnode / nginx",
    description: "Datenschutzfreundliches Beobachtungs-Dashboard für Website-Traffic aus worldnode/nginx-Logs: Menschen, Crawler, Seitenaufrufe und Request-Muster.",
    text: {
      "SITE TRAFFIC OBSERVER": "SITE TRAFFIC OBSERVER",
      "Watching this website from worldnode / nginx Humans, crawlers, pageviews and request patterns.": "Beobachtung dieser Website über worldnode / nginx: Menschen, Crawler, Seitenaufrufe und Request-Muster.",
      "OBSERVING LIVE": "LIVE-BEOBACHTUNG",
      "last observation": "Letzte Beobachtung",
      "offline / unavailable": "offline / nicht verfügbar",
      "HUMAN REQUESTS TODAY": "MENSCHLICHE REQUESTS HEUTE",
      "PAGEVIEWS TODAY": "SEITENAUFRUFE HEUTE",
      "TOTAL PAGEVIEWS": "SEITENAUFRUFE GESAMT",
      "ESTIMATED UNIQUE VISITORS": "GESCHÄTZTE EINDEUTIGE BESUCHER",
      "BOT / SCANNER REQUESTS": "BOT-/SCANNER-REQUESTS",
      "REQUESTS 24H": "REQUESTS 24H",
      "observed humans": "beobachtete Menschen",
      "today": "heute",
      "all time": "gesamt",
      "country-level only": "nur Länderebene",
      "of all requests": "aller Requests",
      "all requests": "alle Requests",
      "TRAFFIC PULSE": "TRAFFIC-PULS",
      "Humans": "Menschen",
      "Bots / Scanners": "Bots / Scanner",
      "LIVE REQUEST STREAM": "LIVE-REQUEST-STREAM",
      "No recent public request stream available.": "Kein aktueller öffentlicher Request-Stream verfügbar.",
      "GLOBAL SIGNAL MAP": "GLOBALE SIGNALKARTE",
      "TOP COUNTRIES (24H)": "TOP-LÄNDER (24H)",
      "no IP addresses shown country level only": "keine IP-Adressen sichtbar · nur Länderebene",
      "HUMAN / MACHINE RATIO": "MENSCH-/MASCHINE-VERHÄLTNIS",
      "observed requests": "beobachtete Requests",
      "MOST OBSERVED PAGES": "MEISTBEOBACHTETE SEITEN",
      "CRAWLER SPECIES": "CRAWLER-ARTEN",
      "SIGNAL ACTIVITY MATRIX": "SIGNAL-AKTIVITÄTSMATRIX",
      "Bots / Crawlers": "Bots / Crawler",
      "Scanners": "Scanner",
      "NOVEL READER SIGNAL": "ROMAN-LESER-SIGNAL",
      "(FIRST-PARTY LOGS)": "(EIGENE LOGS)",
      "novel signal unavailable": "Roman-Signal nicht verfügbar",
      "Chapter opens are successful page requests, not evidence of completion, reading time, or progress. Only aggregate counts are published.": "Kapitelaufrufe sind erfolgreiche Seiten-Requests und kein Nachweis für Abschluss, Lesezeit oder Fortschritt. Veröffentlicht werden ausschließlich aggregierte Zahlen.",
      "BOOK DOWNLOAD SIGNAL": "BUCH-DOWNLOAD-SIGNAL",
      "download signal unavailable": "Download-Signal nicht verfügbar",
      "PDF + EPUB download events by language. Counts are not unique readers.": "PDF- und EPUB-Download-Ereignisse nach Sprache. Die Zahlen entsprechen nicht eindeutigen Lesern.",
      "OBSERVATION METHOD": "BEOBACHTUNGSMETHODE",
      "Source": "Quelle",
      "Human classification": "Klassifizierung Mensch",
      "Privacy": "Datenschutz",
      "Retention": "Aufbewahrung",
      "request-pattern and user-agent heuristics": "Heuristiken aus Request-Mustern und User-Agent",
      "no raw visitor IP addresses exposed": "keine rohen Besucher-IP-Adressen veröffentlicht",
      "aggregated observational data": "aggregierte Beobachtungsdaten"
    },
    phrases: [
      ["traffic data unavailable", "Traffic-Daten nicht verfügbar"],
      ["hourly signal data unavailable", "stündliche Signaldaten nicht verfügbar"],
      ["ratio unavailable", "Verhältnis nicht verfügbar"],
      ["unavailable", "nicht verfügbar"]
    ]
  });

  addPage("/transmissions/", {
    title: "Gästebuch / Public Signal Uplink – Dennis Hilk",
    description: "Öffentliches Gästebuch von dennishilk.com. Hinterlasse eine Nachricht, die vor der öffentlichen Anzeige geprüft wird.",
    text: {
      "← MAIN NODE": "← HAUPTKNOTEN",
      "GUESTBOOK INTERFACE v1.0": "GÄSTEBUCH-INTERFACE v1.0",
      "SYSTEM READY": "SYSTEM BEREIT",
      "WORLDNODE / VISITOR LOG INTERFACE": "WORLDNODE / BESUCHERLOG-INTERFACE",
      "WORLDNODE GUESTBOOK": "WORLDNODE GÄSTEBUCH",
      "WELCOME TO THE 90s": "WILLKOMMEN IN DEN 90ERN",
      "PUBLIC MESSAGE TERMINAL": "ÖFFENTLICHES NACHRICHTENTERMINAL",
      "ARCHIVE ONLINE": "ARCHIV ONLINE",
      "Sign the public visitor log. Approved messages are assigned a permanent signal number and broadcast below.": "Trag dich in das öffentliche Besucherlog ein. Freigegebene Nachrichten erhalten eine dauerhafte Signalnummer und erscheinen anschließend unten.",
      "INPUT MODULE / NEW ENTRY": "EINGABEMODUL / NEUER EINTRAG",
      "CHANNEL 01 · RECEIVING": "KANAL 01 · EMPFANG",
      "SIGN THE GUESTBOOK": "INS GÄSTEBUCH EINTRAGEN",
      "IDENTIFY YOUR SIGNAL · ENTER A MESSAGE · TRANSMIT FOR REVIEW": "SIGNAL IDENTIFIZIEREN · NACHRICHT EINGEBEN · ZUR PRÜFUNG SENDEN",
      "CALLSIGN": "RUFZEICHEN",
      "ORIGIN": "HERKUNFT",
      "MESSAGE": "NACHRICHT",
      "CONTACT CHANNEL (OPTIONAL)": "KONTAKTKANAL (OPTIONAL)",
      "CONTACT CHANNEL": "KONTAKTKANAL",
      "TRANSMIT ENTRY": "EINTRAG SENDEN",
      "PENDING SIGNAL INPUT.": "WARTE AUF SIGNALEINGABE.",
      "VISITOR LOG / NEWEST SIGNALS FIRST": "BESUCHERLOG / NEUESTE SIGNALE ZUERST",
      "PUBLIC SIGNAL ARCHIVE": "ÖFFENTLICHES SIGNALARCHIV",
      "SIGNAL / IDENTITY / ORIGIN": "SIGNAL / IDENTITÄT / HERKUNFT",
      "RECEIVED UTC": "EMPFANGEN UTC",
      "SCANNING APPROVED SIGNALS…": "FREIGEGEBENE SIGNALE WERDEN GESCANNT…",
      "LOAD MORE SIGNALS": "WEITERE SIGNALE LADEN"
    },
    attributes: {
      "Callsign": "Rufzeichen",
      "Origin": "Herkunft",
      "Message": "Nachricht",
      "Contact channel optional": "Optionaler Kontaktkanal"
    },
    phrases: [
      ["e.g. Berlin / Earth orbit", "z. B. Berlin / Erdorbit"],
      ["Type your transmission...", "Schreibe deine Nachricht..."],
      ["Not shown publicly", "Wird nicht öffentlich angezeigt"],
      ["SIGNALS", "SIGNALE"],
      ["RX: LISTENING", "RX: HÖRT ZU"]
    ]
  });
})();
