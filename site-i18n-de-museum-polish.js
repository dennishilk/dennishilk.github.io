(() => {
  const bundle = window.DennisSiteI18nDE || (window.DennisSiteI18nDE = { common: {}, prefixes: {}, pages: {} });
  bundle.pages ||= {};

  const route = "/museum/linux-game-install/lab.html";
  const page = bundle.pages[route] || (bundle.pages[route] = {});
  page.text = Object.assign({}, page.text || {}, {
    "ENTER CALLSIGN": "RUFZEICHEN EINGEBEN",
  });
})();

(() => {
  const bundle = window.DennisSiteI18nDE || (window.DennisSiteI18nDE = { common: {}, prefixes: {}, pages: {} });
  bundle.common ||= {};
  bundle.prefixes ||= {};
  bundle.pages ||= {};
  bundle.audit ||= {};

  const mergeSpec = (target, extra) => {
    target ||= {};
    for (const key of ["text", "attributes", "html"]) target[key] = Object.assign({}, target[key] || {}, extra[key] || {});
    target.phrases = [...(target.phrases || []), ...(extra.phrases || [])];
    if (extra.title) target.title = extra.title;
    if (extra.description) target.description = extra.description;
    return target;
  };
  const addPage = (routeName, spec) => { bundle.pages[routeName] = mergeSpec(bundle.pages[routeName], spec); };

  bundle.common = mergeSpec(bundle.common, {
    text: {
      "Page not found": "Seite nicht gefunden",
      "Current status: still thinking": "Aktueller Status: denkt noch nach",
      "Back to home": "Zurück zur Startseite",
      "Computer museum": "Computer Museum",
      "World observer": "World Observer",
      "← Return Home": "← Zurück zur Startseite",
      "Diagnostic output": "Diagnoseausgabe",
      "Automated scanner status: confused": "Status des automatischen Scanners: verwirrt",
      "Conclusion: this website does not use WordPress.": "Fazit: Diese Website verwendet kein WordPress.",
      "Back to dennishilk.com": "Zurück zu dennishilk.com",
      "Visit the computer museum": "Computer Museum besuchen"
    },
    attributes: {
      "Terminal output": "Terminalausgabe",
      "Terminal transcript": "Terminalprotokoll",
      "Leave this page": "Diese Seite verlassen"
    },
    phrases: [
      ["Hmm. I could have sworn there was a page here...", "Hm. Ich hätte schwören können, dass hier eine Seite war …"],
      ["Emanuel Kant cannot find WordPress.", "Emanuel Kant kann WordPress nicht finden."],
      ["Emanuel Hochkant also cannot find WordPress.", "Emanuel Hochkant kann WordPress ebenfalls nicht finden."],
      ["means portrait / vertical orientation in German.", "bedeutet im Deutschen Hochformat beziehungsweise vertikale Ausrichtung."],
      ["Yes. This joke has been hanging in the hallway for years.", "Ja. Dieser Witz hängt seit Jahren im Flur."],
      ["The joke works only in German.", "Der Witz funktioniert nur auf Deutsch."],
      ["The WordPress installation works in neither language.", "Die WordPress-Installation funktioniert in keiner der beiden Sprachen."]
    ]
  });

  addPage("/blog/post.html", {
    title: "Warum ich ein „perfektes“ Setup zurückgerollt habe – Dennis Hilk",
    description: "Notizen aus echten Linux-Systemen. Eine Lektion aus einem Setup, das perfekt funktionierte – und trotzdem gehen musste.",
    text: {
      "Why I Rolled Back a “Perfect” Setup": "Warum ich ein „perfektes“ Setup zurückgerollt habe",
      "Notes, Fails & System Philosophy · January 2026": "Notizen, Fails & Systemphilosophie · Januar 2026",
      "At some point, the system was perfect.": "Irgendwann war das System perfekt.",
      "And still — it had to go.": "Und trotzdem — es musste weg.",
      "That was the real bug.": "Das war der eigentliche Fehler.",
      "Fewer tweaks. Fewer decisions. Fewer moving parts.": "Weniger Tweaks. Weniger Entscheidungen. Weniger bewegliche Teile.",
      "That lesson stuck.": "Diese Lektion ist geblieben."
    },
    phrases: [
      ["XMonad tuned. Polybar polished. Shortcuts memorized. Workflows optimized. Everything worked. Nothing was broken.", "XMonad abgestimmt. Polybar poliert. Tastenkürzel verinnerlicht. Workflows optimiert. Alles funktionierte. Nichts war kaputt."],
      ["Not because it failed technically. But because it failed mentally.", "Nicht weil es technisch versagte. Sondern weil es mental nicht mehr funktionierte."],
      ["Every small change required thought. Every adjustment pulled me back into configuration mode. The system demanded attention instead of disappearing into the background.", "Jede kleine Änderung verlangte Aufmerksamkeit. Jede Anpassung zog mich wieder in den Konfigurationsmodus. Das System forderte Aufmerksamkeit, statt im Hintergrund zu verschwinden."],
      ["I realized I was maintaining a setup instead of using a computer. The mental overhead outweighed the gains. So I did the unthinkable: I rolled everything back.", "Mir wurde klar, dass ich ein Setup pflegte, statt einen Computer zu benutzen. Der mentale Aufwand war größer als der Nutzen. Also tat ich das Undenkbare: Ich rollte alles zurück."],
      ["The result wasn’t as elegant. But it was quieter. And that made it better.", "Das Ergebnis war nicht mehr ganz so elegant. Aber es war ruhiger. Und genau dadurch wurde es besser."],
      ["This is something screenshots never show: the cost of perfection.", "Das ist etwas, das Screenshots nie zeigen: der Preis der Perfektion."],
      ["A system that survives daily use is more valuable than one that impresses once.", "Ein System, das den Alltag übersteht, ist wertvoller als eines, das einmal beeindruckt."],
      ["Status: rolled back quietly", "Status: still zurückgerollt"],
      ["Reason: reduced mental noise", "Grund: weniger mentaler Lärm"],
      ["Outcome: system survived", "Ergebnis: System überlebt"]
    ]
  });

  addPage("/lost-administrator/extras/", {
    title: "The Lost Administrator — Extras",
    description: "Extras zu The Lost Administrator von Dennis Hilk, einschließlich Grafiken und Material aus dem Personalarchiv.",
    text: { "[open]": "[offen]" },
    attributes: { "Book cover of The Lost Administrator by Dennis Hilk": "Buchcover von The Lost Administrator von Dennis Hilk" }
  });

  addPage("/lost-administrator/extras/graphics/", {
    title: "The Lost Administrator — Grafikarchiv",
    description: "Grafiken und visuelles Material zu The Lost Administrator von Dennis Hilk.",
    text: {
      "Visual archive · artwork, wallpaper and selected book material.": "Visuelles Archiv · Artwork, Wallpaper und ausgewähltes Buchmaterial.",
      "01 · Workstation Wallpaper": "01 · Workstation-Wallpaper",
      "The atmospheric office background used by the novel landing page.": "Der atmosphärische Büro-Hintergrund der Roman-Startseite.",
      "02 · Book Cover": "02 · Buchcover",
      "Current cover artwork for The Lost Administrator.": "Aktuelles Cover-Artwork für The Lost Administrator.",
      "[spoiler]": "[Spoiler]",
      "The image-only final page of the novel. Best viewed after finishing Chapter 24.": "Die ausschließlich aus einem Bild bestehende letzte Seite des Romans. Am besten erst nach Kapitel 24 ansehen.",
      "download .webp": ".webp herunterladen"
    },
    attributes: {
      "Extras navigation": "Extras-Navigation",
      "Graphics archive": "Grafikarchiv",
      "Dark office wallpaper created for The Lost Administrator": "Dunkles Büro-Wallpaper für The Lost Administrator",
      "Book cover of The Lost Administrator by Dennis Hilk": "Buchcover von The Lost Administrator von Dennis Hilk"
    }
  });

  addPage("/nothing.html", {
    title: "Nichts.",
    text: { "Nothing": "Nichts" },
    phrases: [
      ["nothing: ASCII text", "nothing: ASCII-Text"],
      ["Opening...", "Öffne …"],
      ["Nothing.", "Nichts."],
      ["Congratulations.", "Glückwunsch."],
      ["Most people never click \"Nothing\".", "Die meisten Menschen klicken nie auf „Nichts“."],
      ["Turns out...", "Wie sich herausstellt …"],
      ["there was something after all.", "gab es am Ende doch etwas."],
      ["You found one of the hidden corners of dennishilk.com.", "Du hast eine der versteckten Ecken von dennishilk.com gefunden."],
      ["No achievement unlocked.", "Kein Achievement freigeschaltet."],
      ["Just curiosity.", "Nur Neugier."],
      ["That's better.", "Das ist besser."]
    ]
  });

  addPage("/wordpress-nope.html", {
    title: "WordPress-Administration — Suche läuft noch | Dennis Hilk",
    description: "Eine kleine statische Antwort für automatisierte WordPress-Scanner: Hier gibt es kein WordPress.",
    text: {
      "WordPress administration": "WordPress-Administration",
      "Still searching…": "Suche läuft noch …",
      "NOT FOUND": "NICHT GEFUNDEN",
      "FOUND": "GEFUNDEN",
      "Deeper analysis: Kant / Hochkant": "Tiefere Analyse: Kant / Hochkant"
    },
    attributes: {
      "Dennis Hilk looking suspiciously toward two hallway portraits, the setting for the Kant and Hochkant joke.": "Dennis Hilk blickt misstrauisch zu zwei Porträts im Flur – der Kulisse für den Kant/Hochkant-Witz."
    }
  });

  addPage("/world-observer/", {
    title: "World Observer – Übersicht",
    description: "World-Observer-Übersicht und Navigation durch die Beobachtungskategorien.",
    text: {
      "Observe. Don't speculate.": "Beobachten. Nicht spekulieren.",
      "Static observation dashboard preview for public, non-tracking data exports.": "Statische Vorschau eines Beobachtungs-Dashboards für öffentliche Datenexporte ohne Tracking.",
      "World Observer shows observational data only. It does not make causal claims, does not claim manipulation, and should not be read as proof of intent.": "World Observer zeigt ausschließlich Beobachtungsdaten. Er stellt keine Kausalbehauptungen auf, behauptet keine Manipulation und darf nicht als Beweis für Absichten verstanden werden.",
      "observers total": "Observer gesamt",
      "dashboard version": "Dashboard-Version",
      "Observer categories": "Observer-Kategorien"
    },
    attributes: {
      "World Observer data policy": "Datenrichtlinie des World Observer",
      "World Observer status metrics": "Statusmetriken des World Observer"
    }
  });

  addPage("/world-observer/east-frisia-water-observer.html", {
    title: "Ostfriesland-Wasser-Observer – World Observer",
    description: "Detailseite des Ostfriesland-Wasser-Observers im World Observer.",
    text: {
      "East Frisia Water Observer": "Ostfriesland-Wasser-Observer",
      "Internet observer detail page using the existing public static World Observer exports.": "Observer-Detailseite auf Basis der bestehenden öffentlichen statischen World-Observer-Exporte.",
      "← Back to Internet Observers": "← Zurück zu den Internet-Observern",
      "Loading observer data…": "Observer-Daten werden geladen …",
      "Current Observation": "Aktuelle Beobachtung",
      "Primary metric": "Primäre Metrik",
      "Last observation/update: —": "Letzte Beobachtung/Aktualisierung: —",
      "History": "Historie",
      "Loading published history…": "Veröffentlichte Historie wird geladen …",
      "Date": "Datum",
      "Value": "Wert",
      "Data status": "Datenstatus",
      "Observed": "Beobachtet",
      "Derived": "Abgeleitet",
      "Unknown": "Unbekannt",
      "Methodology": "Methodik",
      "Sources": "Quellen",
      "Detailed interpretation will be added in a later observer-specific pass.": "Eine detaillierte Einordnung wird in einem späteren observer-spezifischen Durchgang ergänzt."
    },
    attributes: { "Observer status": "Observer-Status" }
  });

  bundle.audit.linuxAcademyInteractiveLabs = {
    version: "2026-08-16-1",
    routes: [
      "/museum/linux-terminal-academy/break-it-recover/lab.html",
      "/museum/linux-terminal-academy/files-directories/lab.html",
      "/museum/linux-terminal-academy/filesystem-explorer/lab.html",
      "/museum/linux-terminal-academy/permissions-users/lab.html",
      "/museum/linux-terminal-academy/pipes-shell-power/lab.html",
      "/museum/linux-terminal-academy/process-control/lab.html",
      "/museum/linux-terminal-academy/system-admin-crash-lab/lab.html",
      "/museum/linux-terminal-academy/terminal-first-steps/lab.html"
    ]
  };
})();