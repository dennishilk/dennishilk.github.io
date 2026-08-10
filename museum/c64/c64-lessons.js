(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.C64Lessons = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  function program(lines) {
    return lines.join("\n");
  }

  const ROCKET_DATA = [
    0, 24, 0, 0, 60, 0, 0, 126, 0, 0, 255, 0, 1, 255, 128,
    3, 255, 192, 7, 231, 224, 7, 231, 224, 15, 255, 240,
    15, 255, 240, 15, 255, 240, 7, 255, 224, 3, 255, 192,
    1, 255, 128, 0, 255, 0, 1, 255, 128, 3, 231, 192,
    7, 195, 224, 6, 129, 96, 4, 0, 32, 0, 0, 0
  ];

  const ROCKET_DATA_LINES = [
    "300 DATA 0,24,0,0,60,0,0,126,0",
    "310 DATA 0,255,0,1,255,128,3,255,192",
    "320 DATA 7,231,224,7,231,224,15,255,240",
    "330 DATA 15,255,240,15,255,240,7,255,224",
    "340 DATA 3,255,192,1,255,128,0,255,0",
    "350 DATA 1,255,128,3,231,192,7,195,224",
    "360 DATA 6,129,96,4,0,32,0,0,0"
  ];

  const spriteSolution = program([
    "10 FOR I=0 TO 62:READ B:POKE 832+I,B:NEXT I",
    "20 POKE 2040,13",
    "30 POKE 53269,1",
    "40 POKE 53248,120:POKE 53249,120",
    "50 POKE 53287,7",
    "60 END"
  ].concat(ROCKET_DATA_LINES));

  const starRunner = program([
    "10 PRINT CHR$(147):POKE 53280,0:POKE 53281,0",
    "20 FOR I=0 TO 39",
    "30 P=1024+INT(RND(1)*1000)",
    "40 POKE P,42:POKE 55296+P-1024,1+INT(RND(1)*15)",
    "50 NEXT I",
    "60 FOR I=0 TO 62:READ B:POKE 832+I,B:NEXT I",
    "70 POKE 2040,13:POKE 53269,1:POKE 53287,7",
    "80 X=24:D=2:Y=120",
    "90 POKE 53248,X:POKE 53249,Y",
    "100 X=X+D",
    "110 IF X>240 THEN D=-2:GOSUB 200",
    "120 IF X<24 THEN D=2:GOSUB 200",
    "130 FOR W=1 TO 200:NEXT W",
    "140 GOTO 90",
    "200 POKE 53280,6",
    "210 POKE 54296,15:POKE 54272,30:POKE 54273,20",
    "220 POKE 54277,9:POKE 54278,240:POKE 54276,17",
    "230 FOR T=1 TO 40:NEXT T",
    "240 POKE 54276,16:POKE 53280,0",
    "250 RETURN"
  ].concat(ROCKET_DATA_LINES));

  function eventsOf(context, type) {
    return (context.events || []).filter(function (event) { return event.type === type; });
  }

  function outputOf(context) {
    return eventsOf(context, "output").map(function (event) {
      return event.text + (event.newline ? "\n" : "");
    }).join("");
  }

  function memoryEvents(context, address) {
    return eventsOf(context, "memory").filter(function (event) { return event.address === address; });
  }

  function countScreenCode(context, code) {
    return (context.machine && context.machine.screen || []).filter(function (value) {
      return (value & 127) === code;
    }).length;
  }

  function directionChanged(values) {
    let positive = false;
    let negative = false;
    for (let index = 1; index < values.length; index += 1) {
      if (values[index] > values[index - 1]) positive = true;
      if (values[index] < values[index - 1]) negative = true;
    }
    return positive && negative;
  }

  const lessons = [
    {
      id: "ready",
      number: 1,
      command: "PRINT \"HELLO\"",
      starter: "",
      solution: "",
      copy: {
        en: {
          title: "READY: Immediate Mode",
          objective: "Type one command and make the machine answer immediately.",
          history: "A C64 opened directly into BASIC. At READY. a command ran as soon as RETURN was pressed.",
          challenge: "Type PRINT \"HELLO\" and press RETURN.",
          hints: ["PRINT sends text to the screen.", "Keep the quotation marks around HELLO."],
          success: "Immediate mode worked: nothing was stored as a program yet."
        },
        de: {
          title: "READY: Direktmodus",
          objective: "Gib einen Befehl ein und lass die Maschine sofort antworten.",
          history: "Ein C64 startete direkt in BASIC. Bei READY. lief ein Befehl nach RETURN sofort.",
          challenge: "Gib PRINT \"HELLO\" ein und drücke RETURN.",
          hints: ["PRINT schreibt Text auf den Bildschirm.", "Lass die Anführungszeichen um HELLO stehen."],
          success: "Der Direktmodus funktioniert: Als Programm wurde noch nichts gespeichert."
        }
      },
      validate: function (context) { return /\bHELLO\b/.test(outputOf(context)); }
    },
    {
      id: "first-program",
      number: 2,
      starter: program(["10 PRINT \"HELLO\"", "20 PRINT \"FROM 1982\""]),
      solution: program(["10 PRINT \"HELLO\"", "20 PRINT \"FROM 1982\"", "30 END"]),
      copy: {
        en: {
          title: "Your First Program",
          objective: "Store numbered lines, inspect them with LIST, then execute them with RUN.",
          history: "Entering the same line number replaced that line. Entering only the number deleted it.",
          challenge: "Add line 30 END, use LIST, and RUN the program.",
          hints: ["Type 30 END as a new line.", "LIST shows stored lines; RUN starts at the lowest number."],
          success: "You edited and ran a line-numbered BASIC program."
        },
        de: {
          title: "Dein erstes Programm",
          objective: "Speichere nummerierte Zeilen, prüfe sie mit LIST und starte sie mit RUN.",
          history: "Dieselbe Zeilennummer ersetzte eine Zeile. Nur die Nummer zu tippen löschte sie.",
          challenge: "Ergänze 30 END, nutze LIST und starte das Programm mit RUN.",
          hints: ["Gib 30 END als neue Zeile ein.", "LIST zeigt das Programm; RUN startet bei der kleinsten Nummer."],
          success: "Du hast ein BASIC-Programm mit Zeilennummern bearbeitet und ausgeführt."
        }
      },
      validate: function (context) {
        return /10 PRINT "HELLO"/.test(context.source || "") &&
          /30 END/.test(context.source || "") &&
          /HELLO[\s\S]*FROM 1982/.test(outputOf(context));
      }
    },
    {
      id: "variables",
      number: 3,
      starter: program(["10 N=64", "20 NAME$=\"COMMODORE\"", "30 REM PRINT BOTH VALUES"]),
      solution: program(["10 N=64", "20 NAME$=\"COMMODORE\"", "30 PRINT NAME$;\" HAS\";N;\"K\"", "40 END"]),
      copy: {
        en: {
          title: "Variables",
          objective: "Keep a number and a string, then combine them in one PRINT.",
          history: "BASIC V2 only treats the first two characters of a variable name as significant. NAME$ and NATION$ therefore share NA$.",
          challenge: "Print COMMODORE HAS 64K using NAME$ and N.",
          hints: ["String variables end in $.", "A semicolon keeps PRINT items on the same line."],
          success: "The runtime stored numeric and string state with Commodore-style names."
        },
        de: {
          title: "Variablen",
          objective: "Speichere eine Zahl und eine Zeichenkette und verbinde beide in PRINT.",
          history: "BASIC V2 beachtet nur die ersten zwei Zeichen eines Variablennamens. NAME$ und NATION$ teilen daher NA$.",
          challenge: "Gib COMMODORE HAS 64K mit NAME$ und N aus.",
          hints: ["String-Variablen enden mit $.", "Ein Semikolon hält PRINT-Teile in derselben Zeile."],
          success: "Die Laufzeit hat Zahlen und Texte mit Commodore-typischen Namen gespeichert."
        }
      },
      validate: function (context) {
        const variables = context.runtime && context.runtime.variables || {};
        return variables.N === 64 && variables["NA$"] === "COMMODORE" && /COMMODORE HAS\s+64\s*K/.test(outputOf(context));
      }
    },
    {
      id: "loops",
      number: 4,
      starter: program(["10 FOR I=1 TO 8", "20 REM PRINT A STAR", "30 NEXT I", "40 PRINT"]),
      solution: program(["10 FOR I=1 TO 8", "20 PRINT \"*\";", "30 NEXT I", "40 PRINT", "50 END"]),
      copy: {
        en: {
          title: "Loops",
          objective: "Repeat one statement with FOR, NEXT, and an optional STEP.",
          history: "Loops made compact BASIC listings possible even though the interpreter was slow by modern standards.",
          challenge: "Print eight stars on one line.",
          hints: ["Replace the REM line with PRINT \"*\";.", "NEXT I returns to the statement after FOR."],
          success: "One small loop produced a repeated pattern."
        },
        de: {
          title: "Schleifen",
          objective: "Wiederhole eine Anweisung mit FOR, NEXT und optional STEP.",
          history: "Schleifen ermöglichten kompakte BASIC-Programme, auch wenn der Interpreter aus heutiger Sicht langsam war.",
          challenge: "Gib acht Sterne in einer Zeile aus.",
          hints: ["Ersetze die REM-Zeile durch PRINT \"*\";.", "NEXT I springt zur Anweisung hinter FOR zurück."],
          success: "Eine kleine Schleife hat ein wiederholtes Muster erzeugt."
        }
      },
      validate: function (context) { return /\*{8}/.test(outputOf(context).replace(/\s/g, "")); }
    },
    {
      id: "decisions",
      number: 5,
      starter: program(["10 X=3", "20 GOSUB 100", "30 REM TEST X HERE", "40 END", "100 X=X*2", "110 RETURN"]),
      solution: program(["10 X=3", "20 GOSUB 100", "30 IF X=6 THEN PRINT \"BRANCH TAKEN\"", "40 END", "100 X=X*2", "110 RETURN"]),
      copy: {
        en: {
          title: "Decisions and Subroutines",
          objective: "Choose a path with IF and reuse code with GOSUB/RETURN.",
          history: "Line numbers were both editing labels and jump destinations. Structured blocks were not part of BASIC V2.",
          challenge: "After the subroutine doubles X, print BRANCH TAKEN only when X equals 6.",
          hints: ["Use IF X=6 THEN PRINT ... on line 30.", "GOSUB remembers where RETURN must continue."],
          success: "A condition and a returning subroutine both changed program flow."
        },
        de: {
          title: "Entscheidungen und Unterprogramme",
          objective: "Wähle mit IF einen Weg und nutze Code mit GOSUB/RETURN erneut.",
          history: "Zeilennummern waren zugleich Bearbeitungsmarken und Sprungziele. Strukturierte Blöcke kannte BASIC V2 nicht.",
          challenge: "Gib nach dem Verdoppeln von X nur bei X=6 BRANCH TAKEN aus.",
          hints: ["Nutze in Zeile 30 IF X=6 THEN PRINT ....", "GOSUB merkt sich, wo RETURN fortsetzen muss."],
          success: "Eine Bedingung und ein zurückkehrendes Unterprogramm steuern den Ablauf."
        }
      },
      validate: function (context) {
        const metrics = context.runtime && context.runtime.metrics || {};
        return metrics.branches > 0 && metrics.returns > 0 && /BRANCH TAKEN/.test(outputOf(context));
      }
    },
    {
      id: "screen-colors",
      number: 6,
      starter: program(["10 PRINT CHR$(147);", "20 REM CHANGE BORDER AND BACKGROUND", "30 REM WRITE A TO THE SECOND ROW"]),
      solution: program([
        "10 PRINT CHR$(147);",
        "20 POKE 53280,2:POKE 53281,6",
        "30 POKE 1064,1:POKE 55336,7",
        "40 B=PEEK(53280):PRINT B",
        "50 END"
      ]),
      copy: {
        en: {
          title: "Screen and Colors",
          objective: "Change visible hardware state through POKE and read it back with PEEK.",
          history: "BASIC V2 had no named color command. Address 53280 controls the border, 53281 the background, screen RAM starts at 1024, and color RAM at 55296.",
          challenge: "Make a red border, blue background, and a yellow A on the second row.",
          hints: ["POKE 53280,2 and POKE 53281,6 set the two colors.", "Screen cell 1064 pairs with color cell 55336."],
          success: "Your BASIC wrote directly into the C64 teaching memory map."
        },
        de: {
          title: "Bildschirm und Farben",
          objective: "Ändere sichtbare Hardwarezustände mit POKE und lies sie mit PEEK zurück.",
          history: "BASIC V2 hatte keinen Farbbefehl. 53280 steuert den Rand, 53281 den Hintergrund, Bildschirmspeicher beginnt bei 1024 und Farbspeicher bei 55296.",
          challenge: "Erzeuge einen roten Rand, blauen Hintergrund und ein gelbes A in Zeile zwei.",
          hints: ["POKE 53280,2 und POKE 53281,6 setzen die Farben.", "Bildschirmzelle 1064 gehört zur Farbzelle 55336."],
          success: "Dein BASIC hat direkt in das C64-Lehrspeichermodell geschrieben."
        }
      },
      validate: function (context) {
        return context.machine && context.machine.border === 2 && context.machine.background === 6 &&
          (context.machine.screen[40] & 127) === 1 && context.machine.colors[40] === 7 &&
          memoryEvents(context, 53280).length > 0;
      }
    },
    {
      id: "petscii",
      number: 7,
      starter: program(["10 PRINT CHR$(147)", "20 FOR I=0 TO 39", "30 REM PUT STARS INTO SCREEN MEMORY", "40 NEXT I"]),
      solution: program([
        "10 PRINT CHR$(147)",
        "20 FOR I=0 TO 39",
        "30 POKE 1024+I*2,42",
        "40 POKE 55296+I*2,1+INT(RND(1)*15)",
        "50 NEXT I",
        "60 END"
      ]),
      copy: {
        en: {
          title: "PETSCII and Character Graphics",
          objective: "Draw with characters while distinguishing input codes from screen codes.",
          history: "PETSCII carries keyboard and control values; screen RAM stores screen codes. They overlap, but they are not the same table.",
          challenge: "Place at least twenty colored star characters directly into screen memory.",
          hints: ["Screen code 42 is the star used here.", "The matching color address is 55296 plus the same cell offset."],
          success: "You made character graphics by changing screen codes and color RAM."
        },
        de: {
          title: "PETSCII und Zeichengrafik",
          objective: "Zeichne mit Zeichen und unterscheide Eingabecodes von Bildschirmcodes.",
          history: "PETSCII enthält Tastatur- und Steuerwerte; im Bildschirmspeicher liegen Screen-Codes. Die Tabellen überschneiden sich, sind aber nicht identisch.",
          challenge: "Schreibe mindestens zwanzig farbige Sterne direkt in den Bildschirmspeicher.",
          hints: ["Screen-Code 42 ist hier der Stern.", "Die passende Farbadresse ist 55296 plus derselbe Zellversatz."],
          success: "Du hast Zeichengrafik über Screen-Codes und Farbspeicher erzeugt."
        }
      },
      validate: function (context) { return countScreenCode(context, 42) >= 20; }
    },
    {
      id: "sprite",
      number: 8,
      starter: program([
        "10 FOR I=0 TO 62:READ B:POKE 832+I,B:NEXT I",
        "20 POKE 2040,13",
        "30 REM ENABLE SPRITE 0 AND SET POSITION/COLOR",
        "60 END"
      ].concat(ROCKET_DATA_LINES)),
      solution: spriteSolution,
      copy: {
        en: {
          title: "A Sprite from 63 Bytes",
          objective: "Turn 63 visible data bytes into one 24×21 monochrome sprite.",
          history: "A sprite pointer selects a 64-byte-aligned block; 63 bytes hold the 24×21 bitmap. The pointer table begins at 2040.",
          challenge: "Enable sprite 0, place it at 120/120, and make it yellow.",
          hints: ["POKE 53269,1 enables sprite 0.", "Use 53248/53249 for X/Y and 53287 for its color."],
          success: "The rocket is rendered from the bytes your BASIC placed in memory."
        },
        de: {
          title: "Ein Sprite aus 63 Bytes",
          objective: "Erzeuge aus 63 sichtbaren Datenbytes ein 24×21-Pixel-Sprite.",
          history: "Ein Sprite-Zeiger wählt einen 64-Byte-Block; 63 Bytes enthalten das 24×21-Bild. Die Zeigertabelle beginnt bei 2040.",
          challenge: "Aktiviere Sprite 0, setze es auf 120/120 und färbe es gelb.",
          hints: ["POKE 53269,1 aktiviert Sprite 0.", "53248/53249 setzen X/Y, 53287 die Farbe."],
          success: "Die Rakete entsteht aus den Bytes, die dein BASIC in den Speicher geschrieben hat."
        }
      },
      validate: function (context) {
        const sprite = context.machine && context.machine.sprites && context.machine.sprites[0];
        return Boolean(sprite && sprite.enabled && sprite.pointer === 13 && sprite.x === 120 &&
          sprite.y === 120 && sprite.color === 7 && sprite.data.some(function (value) { return value !== 0; }));
      }
    },
    {
      id: "sound",
      number: 9,
      starter: program(["10 REM SOUND IS MUTED UNTIL YOU ENABLE IT", "20 POKE 54296,15", "30 REM SET VOICE 1 AND GATE IT ON/OFF"]),
      solution: program([
        "10 POKE 54296,15",
        "20 POKE 54272,30:POKE 54273,20",
        "30 POKE 54277,9:POKE 54278,240",
        "40 POKE 54276,17",
        "50 FOR T=1 TO 100:NEXT T",
        "60 POKE 54276,16",
        "70 END"
      ]),
      copy: {
        en: {
          title: "Sound by Memory Address",
          objective: "Gate one browser voice by writing selected SID register addresses.",
          history: "The SID block starts at 54272. This lab translates a small register subset into Web Audio; it is not SID emulation.",
          challenge: "Set a frequency and envelope, gate voice 1 on, wait, then gate it off.",
          hints: ["54296 controls master volume in this subset.", "Control value 17 selects triangle plus gate; 16 closes the gate."],
          success: "The register sequence was correct. The lesson also passes while audio remains muted."
        },
        de: {
          title: "Klang über Speicheradressen",
          objective: "Schalte eine Browser-Stimme über ausgewählte SID-Registeradressen.",
          history: "Der SID-Bereich beginnt bei 54272. Das Labor übersetzt einen kleinen Teil in Web Audio; es ist keine SID-Emulation.",
          challenge: "Setze Frequenz und Hüllkurve, öffne Voice 1, warte und schließe sie wieder.",
          hints: ["54296 steuert in diesem Modell die Gesamtlautstärke.", "Kontrollwert 17 wählt Dreieck plus Gate; 16 schließt das Gate."],
          success: "Die Registerfolge stimmt. Die Lektion funktioniert auch bei stummem Ton."
        }
      },
      validate: function (context) {
        const controls = memoryEvents(context, 54276).map(function (event) { return event.value; });
        return controls.includes(17) && controls.includes(16);
      }
    },
    {
      id: "star-runner",
      number: 10,
      starter: program([
        "10 PRINT CHR$(147):POKE 53280,0:POKE 53281,0",
        "20 REM BUILD A STARFIELD, ROCKET, MOTION AND CHIRP",
        "30 REM EVERY EFFECT MUST COME FROM BASIC AND POKE"
      ]),
      solution: starRunner,
      copy: {
        en: {
          title: "Final: STAR RUNNER",
          objective: "Combine every concept into a moving rocket over a colored starfield.",
          history: "The final effect is still ordinary BASIC: loops, DATA, subroutines, and memory-mapped hardware registers.",
          challenge: "Create the starfield, enable the rocket, move and reverse it, flash the border, and issue an optional chirp.",
          hints: ["Reuse the sprite data and register setup from lesson 8.", "Move X in a loop; call a subroutine when X crosses either boundary."],
          success: "You programmed the visible animation in BASIC. No hidden JavaScript supplied the result."
        },
        de: {
          title: "Finale: STAR RUNNER",
          objective: "Verbinde alle Konzepte zu einer bewegten Rakete über einem farbigen Sternenfeld.",
          history: "Auch der finale Effekt bleibt gewöhnliches BASIC: Schleifen, DATA, Unterprogramme und speicherabgebildete Register.",
          challenge: "Baue Sternenfeld und Rakete, bewege und wende sie, lass den Rand blitzen und löse optional einen Ton aus.",
          hints: ["Nutze Sprite-Daten und Register aus Lektion 8 erneut.", "Ändere X in einer Schleife und rufe an den Grenzen ein Unterprogramm auf."],
          success: "Du hast die sichtbare Animation in BASIC programmiert. Kein verstecktes JavaScript erzeugt das Ergebnis."
        }
      },
      validate: function (context) {
        const sprite = context.machine && context.machine.sprites && context.machine.sprites[0];
        const positions = memoryEvents(context, 53248).map(function (event) { return event.value; });
        const metrics = context.runtime && context.runtime.metrics || {};
        const soundControls = memoryEvents(context, 54276).map(function (event) { return event.value; });
        return countScreenCode(context, 42) >= 20 &&
          Boolean(sprite && sprite.enabled && sprite.pointer === 13 && sprite.data.some(function (value) { return value !== 0; })) &&
          new Set(positions).size >= 3 && directionChanged(positions) &&
          metrics.returns > 0 && memoryEvents(context, 53280).length > 1 &&
          soundControls.includes(17) && soundControls.includes(16);
      }
    }
  ];

  function byId(id) {
    return lessons.find(function (lesson) { return lesson.id === id; }) || lessons[0];
  }

  function validateLesson(id, context) {
    try {
      return Boolean(byId(id).validate(context || {}));
    } catch (error) {
      return false;
    }
  }

  return {
    lessons: lessons,
    byId: byId,
    validateLesson: validateLesson,
    ROCKET_DATA: ROCKET_DATA.slice(),
    STAR_RUNNER: starRunner
  };
});
