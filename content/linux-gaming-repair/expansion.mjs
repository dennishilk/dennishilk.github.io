// Reviewed bilingual extension. All commands are displayed, never executed.
const specs = [
  {
    "id": "steam-runtime-pressure-vessel",
    "name": [
      "Steam Linux Runtime or pressure-vessel fails",
      "Steam Linux Runtime oder Pressure Vessel scheitert"
    ],
    "summary": [
      "Investigate container startup separately from Proton and Vulkan errors.",
      "Containerstart getrennt von Proton- und Vulkan-Fehlern untersuchen."
    ],
    "sections": [
      [
        "Steam Linux Runtime can put a game or Proton inside pressure-vessel isolation. A failed container setup is not the same as a Windows game executable crashing. Record whether the same game runs outside the affected runtime, which Steam Linux Runtime branch was chosen, and whether the game is a native build or uses Proton. Do not treat a generic missing-file message from inside the container as evidence that the file is absent on the host.",
        "Steam Linux Runtime kann ein Spiel oder Proton in die Pressure-Vessel-Isolierung legen. Scheitert der Containerstart, ist das nicht dasselbe wie ein Absturz der Windows-Spiel-EXE. Erfasst werden müssen die verwendete Steam-Linux-Runtime, nativer Build oder Proton und ob der Fehler nur in dieser Umgebung auftritt. Eine Meldung über fehlende Dateien innerhalb des Containers beweist nicht, dass sie auf dem Host fehlen."
      ],
      [
        "Valve documents separate verbose runtime diagnostics. First inspect the current Steam Linux Runtime and its VERSION files where available; capture the exact error before a game window appears. If Steam itself is the Flatpak edition, distinguish Flatpak's outer sandbox from pressure-vessel's inner container. A log showing a runtime setup failure is more informative than blindly changing Vulkan ICD paths, replacing system libraries or installing a second Wine runner.",
        "Valve beschreibt eigene ausführliche Diagnosen für die Laufzeitumgebung. Zuerst Steam-Linux-Runtime und verfügbare Versionsdateien prüfen; die genaue Meldung vor Erscheinen des Spielfensters sichern. Bei Steam als Flatpak sind die äußere Flatpak-Sandbox und der innere Pressure-Vessel-Container getrennt zu untersuchen. Ein Fehler beim Einrichten der Runtime rechtfertigt weder willkürliche Vulkan-ICD-Pfade noch den Austausch von Systembibliotheken."
      ],
      [
        "Compare the same game, filesystem and hardware under one supported Steam compatibility selection at a time. Keep a record of branch choices and remove temporary verbose flags after collecting evidence. A historical workaround that switched an old Soldier or Sniper runtime is not a universal recommendation for current Steam releases. If a runtime downgrade changes the outcome, report both version identifiers and the isolated difference rather than calling the game itself fixed.",
        "Vergleiche dasselbe Spiel auf demselben Dateisystem und derselben Hardware mit jeweils nur einer unterstützten Steam-Kompatibilitätsauswahl. Runtime-Versionen dokumentieren und temporäre Debug-Variablen anschließend entfernen. Historische Workarounds für Soldier oder Sniper gelten nicht automatisch für aktuelle Steam-Ausgaben. Ändert eine andere Runtime das Ergebnis, beide Versionsstände und den isolierten Unterschied melden, statt das Spiel als endgültig repariert zu bezeichnen."
      ]
    ],
    "diagnostics": [
      [
        "steam --version",
        "Shows a client-reported build only; does not identify the container revision.",
        "Zeigt nur eine vom Client gemeldete Ausgabe, nicht die Containerrevision."
      ],
      [
        "env | grep -E '^(STEAM|PRESSURE_VESSEL|FLATPAK)'",
        "Check inherited runtime overrides without exporting credentials or paths publicly.",
        "Geerbte Runtime-Overrides prüfen; Zugangsdaten und Pfade nicht veröffentlichen."
      ]
    ],
    "test": [
      "Save launch options; rerun Steam once with STEAM_LINUX_RUNTIME_VERBOSE=1 from a terminal and reproduce one startup.",
      "Startoptionen sichern; Steam einmal mit STEAM_LINUX_RUNTIME_VERBOSE=1 im Terminal starten und den Fehler reproduzieren.",
      "Remove the environment override and restore the selected compatibility tool.",
      "Umgebungsvariable entfernen und die gewählte Kompatibilitätslaufzeit wiederherstellen.",
      "Verbose output can contain personal paths and does not identify a defective GPU.",
      "Ausführliche Logs können persönliche Pfade enthalten und beweisen keinen GPU-Defekt."
    ],
    "sources": [
      "runtime",
      "proton"
    ]
  },
  {
    "id": "steam-flatpak-permissions",
    "name": [
      "Steam Flatpak cannot see the game library",
      "Steam als Flatpak sieht die Spielebibliothek nicht"
    ],
    "summary": [
      "Trace sandbox filesystem visibility without globally disabling isolation.",
      "Dateisystemzugriff der Sandbox prüfen, ohne die Isolation global abzuschalten."
    ],
    "sections": [
      [
        "A Steam Flatpak application sees a different filesystem namespace from an unsandboxed Steam installation. An externally mounted Steam library can be present and writable in the host shell yet invisible within Flatpak. Distinguish a portal-mediated file chooser, an explicit filesystem grant and a mount that is not active when Steam starts. Do not infer missing game files merely because the Flatpak process cannot reach the host path.",
        "Steam als Flatpak sieht einen anderen Dateisystem-Namensraum als eine regulär installierte Steam-Version. Eine externe Bibliothek kann im Host-Terminal vorhanden und beschreibbar, für Flatpak aber unsichtbar sein. Dateiauswahldialog über ein Portal, explizite Dateisystemfreigabe und beim Start fehlendes Mount sind getrennte Fälle. Unsichtbare Host-Pfade beweisen nicht, dass Spieledateien fehlen."
      ],
      [
        "Inspect the exact Flatpak app identity, active overrides and library path; do not paste a blanket access grant from an unrelated distribution. Mounts under /run/media and custom directories can have different behavior. Even after permission is corrected, a second problem may remain in the library's ownership or execution policy. Steam's own download errors and Proton prefix errors need their own evidence rather than being attributed automatically to Flatpak.",
        "App-ID, aktive Flatpak-Overrides und den exakten Bibliothekspfad prüfen; keine pauschale Freigabe aus einer fremden Distribution übernehmen. Mounts unter /run/media und eigene Verzeichnisse können verschieden behandelt werden. Nach erfolgreicher Freigabe können Eigentümerrechte oder Ausführungsverbote weiterhin stören. Steam-Downloads und Proton-Prefixfehler erfordern eigene Belege und sind nicht automatisch Flatpak-Probleme."
      ],
      [
        "For a controlled comparison, inspect visibility from the host and inside the Flatpak environment before changing permissions. If a narrow path-specific override is needed, document precisely which library is shared, and test one game. Avoid filesystem=host and disabling the sandbox as default advice; those greatly expand access and can hide a separate mount problem. Revert any trial override before deciding whether the permission was causal.",
        "Für einen kontrollierten Vergleich die Sichtbarkeit auf dem Host und innerhalb von Flatpak feststellen, bevor Rechte geändert werden. Falls eine eng begrenzte pfadspezifische Freigabe nötig ist, den freigegebenen Bibliothekspfad dokumentieren und ein Spiel testen. filesystem=host und pauschales Abschalten der Sandbox sind keine Standardlösung: Sie erweitern den Zugriff erheblich und können Mount-Probleme verdecken. Test-Overrides bei Bedarf wieder zurücknehmen."
      ]
    ],
    "diagnostics": [
      [
        "flatpak list --app",
        "Identify the actual Steam Flatpak app ID; this is not a permissions test.",
        "Tatsächliche Flatpak-App-ID bestimmen; das ist noch kein Rechttest."
      ],
      [
        "flatpak override --user --show com.valvesoftware.Steam",
        "Read user-level overrides; system-level permissions may differ.",
        "Benutzer-Overrides anzeigen; systemweite Berechtigungen können abweichen."
      ]
    ],
    "test": [
      "Compare the same library path in the host and the Flatpak file chooser, then try one narrowly scoped permission via normal Flatpak settings.",
      "Denselben Bibliothekspfad auf dem Host und in der Flatpak-Dateiauswahl vergleichen und eine eng begrenzte Freigabe testen.",
      "Remove only the specific test override and restore the original Steam library setting.",
      "Nur die testweise Freigabe entfernen und den ursprünglichen Bibliothekseintrag wiederherstellen.",
      "An absent override does not prove the sandbox lacks portal-based access.",
      "Ein fehlender Override beweist nicht, dass Portal-Zugriff ausgeschlossen ist."
    ],
    "sources": [
      "flatpak",
      "runtime"
    ]
  },
  {
    "id": "steam-library-mount",
    "name": [
      "Steam library fails on noexec or permissions",
      "Steam-Bibliothek scheitert an noexec oder Rechten"
    ],
    "summary": [
      "Separate mount flags, ownership, download failure and executable launch errors.",
      "Mount-Flags, Eigentümerrechte, Download- und Startfehler trennen."
    ],
    "sections": [
      [
        "A game library is both data storage and an execution environment for game binaries and runtime helpers. A filesystem mounted noexec can allow reads while preventing execution of files placed there; EACCES can also come from directory traversal permissions or a sandbox. Record the real mount containing the selected library before changing anything. A noexec flag on one unrelated partition tells you nothing about the mount where Steam actually put the game.",
        "Eine Spielebibliothek enthält Daten und ausführbare Spiel- sowie Hilfsprogramme. Ein mit noexec eingehängtes Dateisystem kann Dateien lesen lassen und gleichzeitig den Start dort liegender Programme verhindern. EACCES kann ebenso an Verzeichnisrechten oder einer Sandbox liegen. Vor Änderungen das tatsächliche Mount der betroffenen Bibliothek bestimmen. Ein noexec auf einer anderen Partition sagt über das Spiel nichts aus."
      ],
      [
        "Compare effective mount options with ownership for the game directory and its Steam library parent. Steam may distribute files across multiple libraries, while Proton compatibility data resides elsewhere. A read-only mount, exhausted storage or filesystem I/O errors can masquerade as permission problems. Avoid chmod -R 777, changing ownership over the whole disk or making mount flags insecure without understanding their existing protection purpose.",
        "Effektive Mount-Optionen mit Eigentümerrechten des Spieleverzeichnisses und des übergeordneten Steam-Bibliothekspfads vergleichen. Steam kann Inhalte auf verschiedene Datenträger verteilen; Proton-Kompatibilitätsdaten können andernorts liegen. Schreibgeschützte Mounts, voller Speicher oder E/A-Fehler sehen mitunter wie Rechteprobleme aus. Weder chmod -R 777 noch pauschaler Eigentümerwechsel oder unsichere Mount-Optionen sind sinnvolle Diagnoseschritte."
      ],
      [
        "Use Steam's verify-files function only after establishing that the filesystem is stable and writable. A controlled copy of one affected game to a known good native Linux filesystem can distinguish a path problem from a shared GPU or Proton failure. Save relevant launch options and the library location first. If the error follows the game to a second disk, revisit runtime logs rather than assuming the original filesystem was responsible.",
        "Steams Dateiprüfung erst nutzen, wenn das Dateisystem stabil und beschreibbar ist. Eine kontrollierte Kopie eines betroffenen Spiels auf ein nachweislich funktionierendes natives Linux-Dateisystem kann Pfadprobleme von gemeinsamen GPU- oder Proton-Fehlern unterscheiden. Zuvor Startoptionen und Bibliotheksort sichern. Wandert der Fehler mit, Runtime-Logs neu auswerten statt den ursprünglichen Datenträger vorschnell verantwortlich zu machen."
      ]
    ],
    "diagnostics": [
      [
        "findmnt -T \"$HOME\" -o TARGET,SOURCE,FSTYPE,OPTIONS",
        "Example for the home mount; rerun with the actual game library path.",
        "Beispiel für das Home-Mount; mit echtem Bibliothekspfad erneut prüfen."
      ],
      [
        "df -h",
        "Compare free space on the actual library mount, not merely on root.",
        "Freien Platz auf dem echten Bibliotheks-Mount statt nur auf / prüfen."
      ]
    ],
    "test": [
      "Record the library mount and verify whether a native Linux filesystem hosts one known-working game; change one variable at a time.",
      "Bibliotheks-Mount erfassen und ein funktionierendes Spiel auf einem nativen Linux-Dateisystem vergleichen; nur eine Variable ändern.",
      "Restore the prior library location and retain the original mount policy.",
      "Vorherigen Bibliothekspfad und bestehende Mount-Schutzregeln wiederherstellen.",
      "Moving a game also changes its installation state and is not proof of a specific kernel bug.",
      "Verschieben verändert auch den Installationszustand und beweist keinen bestimmten Kernel-Bug."
    ],
    "sources": [
      "proton",
      "runtime"
    ]
  },
  {
    "id": "steam-ntfs-proton-prefix",
    "name": [
      "Proton game on NTFS fails to create its prefix",
      "Proton-Spiel auf NTFS kann Prefix nicht erstellen"
    ],
    "summary": [
      "Identify unsupported shared-library layouts and protect saves before migrating.",
      "Nicht empfohlene gemeinsame Bibliotheken erkennen und Spielstände vor Migration schützen."
    ],
    "sections": [
      [
        "Sharing one NTFS Steam library between Windows and Linux is not an equivalent replacement for a native Linux filesystem. Valve's Proton wiki prominently warns that its NTFS instructions are community-maintained, not an official recommendation, and can be associated with data loss. Compatibility prefixes have Unix filesystem expectations, including links and naming behavior. A game download completing on NTFS does not establish that its Wine prefix can be created there safely.",
        "Eine gemeinsame NTFS-Steam-Bibliothek für Windows und Linux ist kein gleichwertiger Ersatz für ein natives Linux-Dateisystem. Valves Proton-Wiki warnt ausdrücklich: Die NTFS-Anleitung ist von Nutzern gepflegt, keine offizielle Empfehlung, und es gab Hinweise auf Datenverlust. Kompatibilitäts-Prefixe erwarten Unix-Dateisystem-Eigenschaften, darunter Links und Dateinamen. Ein abgeschlossener Download auf NTFS garantiert keine sichere Wine-Prefix-Erstellung."
      ],
      [
        "Determine which partition holds the game files, steamapps/compatdata and shadercache. An external drive might be writable but use different case-handling or mount options, and Windows Fast Startup can leave a shared volume in an unsuitable state. Capture the Proton log and the exact failed path before considering relocation. Never delete compatdata or make blind symlinks: those directories may contain local saves, configuration, credentials and launcher state.",
        "Ermitteln, auf welcher Partition Spieledateien, steamapps/compatdata und shadercache liegen. Ein externer Datenträger kann beschreibbar sein, aber andere Groß-/Kleinschreibungsregeln oder Mount-Optionen besitzen; Windows-Schnellstart kann ein gemeinsames Volume problematisch zurücklassen. Vor einer Verlagerung Proton-Log und Fehlerpfad sichern. compatdata niemals unbesehen löschen oder verlinken: Dort können Spielstände, Einstellungen und Launcher-Daten liegen."
      ],
      [
        "The conservative comparison is a backed-up installation or test game on a native Linux filesystem, with compatibility data stored there. Keep the original disk untouched while testing the alternative and retain a record of Steam's library selection. If the error disappears, that supports a filesystem- or layout-sensitive failure but cannot identify which NTFS feature failed. Forcing world-writable mount options does not repair missing Unix semantics or establish data safety.",
        "Für einen vorsichtigen Vergleich eine gesicherte Installation oder ein Testspiel auf einem nativen Linux-Dateisystem verwenden und Kompatibilitätsdaten dort ablegen. Originaldatenträger unangetastet lassen und Steams Bibliotheksauswahl protokollieren. Verschwindet der Fehler, spricht das für eine dateisystem- oder pfadabhängige Ursache, ohne die problematische NTFS-Eigenschaft zu bestimmen. Global beschreibbare Mounts reparieren weder fehlende Unix-Semantik noch garantieren sie Datensicherheit."
      ]
    ],
    "diagnostics": [
      [
        "lsblk -f",
        "Identify the filesystem types; volume labels alone do not prove the game location.",
        "Dateisystemtypen ermitteln; Labels beweisen nicht den Spielort."
      ],
      [
        "findmnt -t ntfs,ntfs3,exfat",
        "List mounted shared filesystems and compare with Steam's actual library path.",
        "Eingehängte gemeinsame Dateisysteme anzeigen und mit Steams Pfad vergleichen."
      ]
    ],
    "test": [
      "Back up saves and prefix first; compare one affected game installed on an ext4 or btrfs library without modifying the shared NTFS original.",
      "Zuerst Spielstände und Prefix sichern; dasselbe Spiel auf ext4 oder btrfs testen, ohne das NTFS-Original anzutasten.",
      "Switch back to the prior Steam library; do not remove either prefix without checking saves.",
      "Zur vorherigen Steam-Bibliothek zurückkehren; keinen Prefix ohne Spielstandprüfung löschen.",
      "A successful Linux-filesystem test narrows hypotheses but does not imply every NTFS deployment fails.",
      "Ein erfolgreicher Linux-Dateisystemtest grenzt Ursachen ein, beweist aber nicht, dass jede NTFS-Installation scheitert."
    ],
    "sources": [
      "ntfs",
      "proton"
    ]
  },
  {
    "id": "proton-prefix-recovery",
    "name": [
      "A Proton prefix stops working after an update",
      "Ein Proton-Prefix funktioniert nach einem Update nicht mehr"
    ],
    "summary": [
      "Protect local saves and distinguish prefix migration from renderer and launcher failures.",
      "Spielstände sichern und Prefix-Migration von Grafik- und Launcherfehlern unterscheiden."
    ],
    "sections": [
      [
        "Proton stores game-specific Windows-like state in compatibility prefixes. An update of a game, compatibility tool or launcher can change files inside that state, so changing Proton back is not necessarily a complete rollback. Start by establishing whether the same executable ran before the change and whether the failure occurs before a game window, during launcher authentication, or at Vulkan device creation. A missing Windows DLL message is not sufficient evidence that the prefix is corrupt.",
        "Proton speichert Windows-ähnlichen Zustand in spielbezogenen Kompatibilitäts-Prefixen. Spiel-, Proton- oder Launcher-Updates können Dateien dort verändern; auf eine frühere Proton-Ausgabe zurückzustellen ist daher kein vollständiger Rollback. Zuerst prüfen, wann das Spiel zuletzt lief und ob der Fehler beim Launcher-Login, noch vor dem Spielfenster oder erst beim Vulkan-Gerät auftritt. Eine Meldung über eine fehlende Windows-DLL beweist keinen defekten Prefix."
      ],
      [
        "Capture PROTON_LOG for exactly one reproducible startup, then locate the game-specific AppID, Steam library and compatdata directory. Check whether a second account or an external installation has another prefix. Before Winetricks, Protontricks or manual DLL changes, save the entire relevant prefix and check for unsynchronized local saves. Do not recommend deleting compatdata as a routine first step; recreating it can silently lose per-game settings and launch credentials.",
        "Für genau einen reproduzierbaren Start PROTON_LOG erfassen; danach AppID, Steam-Bibliothek und passendes compatdata-Verzeichnis bestimmen. Ein anderer Account oder eine externe Installation kann einen zweiten Prefix besitzen. Vor Winetricks, Protontricks oder manuellen DLL-Änderungen den betroffenen Prefix sichern und lokale, nicht synchronisierte Spielstände prüfen. compatdata nicht routinemäßig löschen: Einstellungen und Anmeldedaten können sonst unbemerkt verschwinden."
      ],
      [
        "A controlled trial changes only the selected compatibility-tool version while preserving the prefix backup. If the issue persists across versions, compare launcher logs, graphics initialization and filesystem writes rather than treating all failures as migrations. A new clean prefix can eventually be diagnostic, but only after confirming backup and recovery of personal game data. Keep the backup outside the Steam library and record the application identity to avoid restoring it into the wrong game.",
        "Ein kontrollierter Versuch ändert nur die gewählte Proton-Version; die Prefix-Sicherung bleibt erhalten. Tritt der Fehler in mehreren Versionen auf, Launcher-Logs, Grafikinitialisierung und Dateisystem-Schreibvorgänge vergleichen, statt jede Störung auf eine Migration zu schieben. Ein neuer leerer Prefix kann später als Test dienen, aber erst nach geprüfter Sicherung und Wiederherstellbarkeit persönlicher Spieldaten. Backup außerhalb der Steam-Bibliothek ablegen und die AppID dokumentieren."
      ]
    ],
    "diagnostics": [
      [
        "df -h",
        "Check whether the filesystem holding compatdata can accept further writes.",
        "Prüfen, ob das Dateisystem mit compatdata noch Schreibplatz bietet."
      ],
      [
        "PROTON_LOG=1 %command%",
        "Steam launch option to capture one Proton run; not a repair by itself.",
        "Steam-Startoption für genau einen Proton-Log; keine eigentliche Reparatur.",
        "temporary"
      ]
    ],
    "test": [
      "Record Proton version, back up compatdata and saves, then compare one supported compatibility version with the same game files.",
      "Proton-Version erfassen, compatdata und Spielstände sichern, dann eine unterstützte Version bei identischen Spieldateien vergleichen.",
      "Restore the original tool selection; separately restore backed-up prefix only if necessary and after verifying its identity.",
      "Original-Proton-Auswahl wiederherstellen; gesicherten Prefix nur bei Bedarf und nach Identitätsprüfung zurückspielen.",
      "Re-selecting an older Proton may not reverse prefix migrations; Steam Cloud is not a universal backup.",
      "Älteres Proton hebt Prefix-Migrationen nicht zwingend auf; Steam Cloud ist kein universelles Backup."
    ],
    "sources": [
      "proton",
      "runtime"
    ]
  },
  {
    "id": "lutris-game-launch",
    "name": [
      "Lutris game refuses to launch through Wine",
      "Lutris-Spiel startet nicht über Wine"
    ],
    "summary": [
      "Distinguish Lutris frontend, runner, Wine prefix and Vulkan from one another.",
      "Lutris-Oberfläche, Runner, Wine-Prefix und Vulkan voneinander trennen."
    ],
    "sections": [
      [
        "Lutris manages installers and runners but is not itself the Wine loader or the game's Vulkan implementation. A blank game window after clicking Play can arise from runner selection, an incomplete installer, an external launcher, missing 32-bit graphics support or a hardware problem. Identify the selected runner and the exact installed game path before changing versions. A system wine --version output does not necessarily describe the Wine build actually selected inside Lutris.",
        "Lutris verwaltet Installationsskripte und Runner, ist aber weder selbst der Wine-Loader noch die Vulkan-Implementierung des Spiels. Ein schwarzes Fenster nach Play kann an Runner-Auswahl, unvollständigem Installer, externem Launcher, fehlenden 32-Bit-Grafikbibliotheken oder Hardware liegen. Runner und tatsächlichen Installationspfad erfassen, bevor Versionen geändert werden. wine --version auf dem Host benennt nicht unbedingt das von Lutris gestartete Wine."
      ],
      [
        "The project documents launching Lutris with lutris -d for installer debugging and enabling game-specific runner debug output before reproducing a failure. Collect the last game's log, note the selected prefix, and separate installer output from execution output. Lines marked fixme by Wine often indicate unimplemented behavior without proving a crash. Correlate actual err lines and exit behavior with nearby kernel messages only if there was also a system-level stall.",
        "Das Projekt dokumentiert lutris -d für die Installationsdiagnose und das gezielte Einschalten des Runner-Debug-Outputs vor einer Reproduktion. Letztes Spiellog sichern, Prefix notieren und Installations- von Ausführungslogs trennen. Wine-Zeilen mit fixme melden oft nicht implementiertes Verhalten, ohne damit einen Absturz zu belegen. Nur bei gleichzeitigem Systemstillstand passende Kernel-Meldungen zeitlich zuordnen."
      ],
      [
        "Test one change at a time, such as reverting the runner selection or temporarily disabling one injected overlay. For games using a modern Proton runner outside Steam, verify the external-client runtime path including umu instead of copying Steam launch flags blindly. Reinstalling the whole game or prefix erases useful before-and-after evidence and risks saves; it is not a first diagnostic step. Be explicit when Battle.net, Ubisoft Connect or EA App adds its own failure boundary.",
        "Jeweils nur eine Änderung testen, etwa eine frühere Runner-Auswahl oder vorübergehend ein zusätzliches Overlay deaktivieren. Für externe Clients mit Proton muss auch die umu-Laufzeit geklärt werden; Steam-Startoptionen lassen sich nicht blind übertragen. Neuinstallation von Spiel oder Prefix vernichtet Vergleichsdaten und gefährdet Spielstände und ist kein erster Diagnoseschritt. Battle.net, Ubisoft Connect oder EA App bilden zusätzliche mögliche Fehlergrenzen."
      ]
    ],
    "diagnostics": [
      [
        "lutris -d",
        "Launch Lutris with debug output in a terminal; inspect credentials before sharing.",
        "Lutris mit Debug-Ausgabe im Terminal starten; Logs vor Weitergabe auf Geheimnisse prüfen.",
        "temporary"
      ],
      [
        "vulkaninfo --summary",
        "Only describes host-side Vulkan unless run in the same environment as the game.",
        "Beschreibt nur Host-Vulkan, sofern es nicht in der Spielumgebung läuft."
      ]
    ],
    "test": [
      "Save the runner and prefix path, capture the last game log, and compare one compatible runner without deleting any user data.",
      "Runner und Prefixpfad sichern, letztes Spiellog erfassen und einen kompatiblen Runner ohne Löschung testen.",
      "Restore the previous runner and per-game environment overrides.",
      "Vorherigen Runner und spielbezogene Umgebungsvariablen wiederherstellen.",
      "Lutris and launchers change frequently; no runner choice guarantees title-specific support.",
      "Lutris und Launcher ändern sich häufig; keine Runner-Auswahl garantiert Unterstützung eines konkreten Spiels."
    ],
    "sources": [
      "lutris",
      "umu"
    ]
  },
  {
    "id": "heroic-login-failures",
    "name": [
      "Heroic cannot authenticate or launch an Epic/GOG game",
      "Heroic kann Epic-/GOG-Spiel nicht anmelden oder starten"
    ],
    "summary": [
      "Diagnose account, Legendary, store metadata and sandbox problems separately.",
      "Anmeldung, Legendary, Store-Metadaten und Sandbox getrennt prüfen."
    ],
    "sections": [
      [
        "Heroic is a front end to multiple store and launcher components; Epic-related authentication can involve Legendary, embedded web views and token state. GOG downloads and DLC metadata follow other paths. A login loop does not by itself identify a Wine graphics problem and should not be 'fixed' by clearing the game prefix. First record the store, Heroic package type, authentication stage and whether the game actually reaches its Windows launcher.",
        "Heroic ist eine Oberfläche für mehrere Store- und Launcher-Komponenten. Epic-Anmeldung kann Legendary, eingebettete Webansichten und Token-Zustand betreffen. GOG-Downloads und DLC-Metadaten laufen andere Wege. Eine Anmeldeschleife beweist kein Wine-Grafikproblem; das Spiele-Prefix zu löschen ist dafür keine sinnvolle Standardreaktion. Zuerst Store, Installationsart von Heroic, Anmeldephase und den tatsächlichen Start der Windows-Anwendung dokumentieren."
      ],
      [
        "Heroic's project troubleshooting guide documents separate configuration and Legendary paths, including different locations for Flatpak. Read the built-in launcher log rather than publishing token files or the entire configuration directory. Compare a store login failure against a game-only launch failure and identify recent Heroic, Legendary or provider changes. When a game requires an additional Ubisoft or EA login, each provider has independent online state and can fail after Heroic succeeds.",
        "Heroics Projektdokumentation beschreibt getrennte Konfigurations- und Legendary-Pfade, auch für Flatpak. Das integrierte Launcher-Log lesen, aber keine Token-Dateien oder komplette Konfigurationsordner veröffentlichen. Store-Anmeldefehler von reinen Spielstartfehlern unterscheiden und Änderungen an Heroic, Legendary oder beim Anbieter notieren. Verlangt ein Spiel zusätzlich Ubisoft- oder EA-Anmeldung, hat jeder Anbieter einen eigenen Online-Zustand und kann nach erfolgreichem Heroic-Login scheitern."
      ],
      [
        "Use the same account and game with only one change to package version, network context or selected runner if supported. Do not disable TLS verification, paste authentication codes into unknown helper scripts or rename folders containing credentials as a first step. For games using Proton outside Steam, check whether Heroic is using an appropriate umu-backed path. A successful store sign-in proves only the authentication step, not DXVK compatibility, anti-cheat access or server-side game availability.",
        "Dasselbe Konto und Spiel mit jeweils nur einer Änderung an unterstützter Paketversion, Netzwerkumgebung oder Runner testen. TLS-Prüfung nicht deaktivieren, keine Codes in unbekannte Helferskripte eingeben und keine Token-Verzeichnisse als ersten Schritt umbenennen. Nutzt Heroic Proton außerhalb von Steam, die passende umu-Anbindung prüfen. Erfolgreiche Store-Anmeldung belegt lediglich Authentifizierung, nicht DXVK-Kompatibilität, Anti-Cheat-Zugang oder serverseitige Spielverfügbarkeit."
      ]
    ],
    "diagnostics": [
      [
        "flatpak list --app",
        "Identify whether a Flatpak Heroic sandbox is in use before comparing config locations.",
        "Vor einem Pfadvergleich prüfen, ob Heroic als Flatpak läuft."
      ],
      [
        "date -Is",
        "Record host time for correlating login error timestamps; never expose authentication tokens.",
        "Host-Zeit für Login-Zeitstempel erfassen; niemals Authentifizierungs-Token zeigen."
      ]
    ],
    "test": [
      "Preserve launcher logs with tokens redacted; compare one official Heroic login flow with the same store account before changing the Wine prefix.",
      "Launcher-Logs mit geschwärzten Token sichern; denselben Store-Account im offiziellen Heroic-Anmeldeweg vergleichen, bevor das Wine-Prefix verändert wird.",
      "Revert only the package or runner change; retain existing account configuration.",
      "Nur Paket- oder Runner-Änderung zurücknehmen; bestehende Kontokonfiguration behalten.",
      "Provider authentication can change server-side; a historical success is not a current guarantee.",
      "Anmeldedienste können sich serverseitig ändern; frühere Erfolge garantieren heute nichts."
    ],
    "sources": [
      "heroic",
      "umu"
    ]
  },
  {
    "id": "multiplayer-anticheat-limit",
    "name": [
      "Multiplayer fails because anti-cheat is unsupported",
      "Multiplayer scheitert an nicht unterstütztem Anti-Cheat"
    ],
    "summary": [
      "Check title-specific developer support without recommending anti-cheat bypasses.",
      "Spielspezifische Herstellerfreigaben prüfen statt Anti-Cheat-Umgehungen."
    ],
    "sections": [
      [
        "Proton can support selected anti-cheat middleware, but EAC or BattlEye middleware availability is not equivalent to a particular game's developer enabling Linux or Steam Deck play. Server-side enforcement can reject a game even when its graphics and launcher work. The failure may be reported as a generic kick, connection rejection or missing service, and one successful local single-player launch says nothing about multiplayer admission. Treat the precise title, game branch, mode and update date as required facts.",
        "Proton kann bestimmte Anti-Cheat-Middleware unterstützen. EAC- oder BattlEye-Unterstützung bedeutet aber nicht, dass ein bestimmter Entwickler Linux oder Steam Deck für sein Spiel freigeschaltet hat. Serverseitige Prüfungen können den Zugang verweigern, obwohl Grafik und Launcher funktionieren. Ein Kick, Verbindungsabbruch oder fehlender Dienst muss nicht auf Vulkan hindeuten. Erfolgreicher Einzelspielerstart sagt nichts über Multiplayer-Zugang. Spielversion, Modus und Datum dokumentieren."
      ],
      [
        "Consult the game's current official support status and Valve's developer guidance, then compare an official notice against recent user reports. ProtonDB or a forum post is community evidence tied to a time and game version, not a permanent compatibility verdict. Keep account authentication, firewall, packet loss, server maintenance and anti-cheat authorization as separate branches. A network timeout alone does not prove that anti-cheat rejected the session.",
        "Den aktuellen offiziellen Supportstatus des Spiels und Valves Entwicklerhinweise prüfen; Berichte aus der Community nach Datum und Version einordnen. ProtonDB oder Forenbeiträge sind zeitgebundene Erfahrungen, keine dauerhafte Kompatibilitätsgarantie. Kontoanmeldung, Firewall, Paketverlust, Serverwartung und Anti-Cheat-Zulassung bleiben getrennte Diagnosezweige. Ein Netzwerk-Timeout beweist keine Ablehnung durch Anti-Cheat."
      ],
      [
        "Do not install unofficial kernel modules, bypass services, modify protected game binaries or disable security checks to force access. Those actions can violate terms, compromise the account or defeat intended safeguards. If the developer has not enabled Proton anti-cheat support, changing Proton versions, enabling a different GPU or using a VPN cannot create that permission. Check official status again after updates and retain dated evidence rather than publishing an invented working rating.",
        "Keine inoffiziellen Kernelmodule, Umgehungsdienste oder manipulierten geschützten Spieldateien installieren und keine Sicherheitsprüfungen abschalten. Solche Eingriffe können Nutzungsbedingungen verletzen, Konten gefährden und Schutzfunktionen aushebeln. Ohne Entwicklerfreigabe erzeugen eine andere Proton-Version, GPU oder ein VPN keinen Anti-Cheat-Zugang. Nach Updates offizielle Aussagen erneut prüfen und datierte Belege sammeln, statt unbelegte Kompatibilitätsbewertungen zu veröffentlichen."
      ]
    ],
    "diagnostics": [
      [
        "date -Is",
        "Record the local timestamp for comparing server or game-update changes.",
        "Lokalen Zeitpunkt für Server- und Spielupdates dokumentieren."
      ],
      [
        "ip route",
        "Inspect the default network route; this cannot determine anti-cheat authorization.",
        "Standardroute prüfen; sie sagt nichts über Anti-Cheat-Zulassung aus."
      ]
    ],
    "test": [
      "Test a supported offline or single-player mode and the official online mode separately with unchanged game files.",
      "Einen unterstützten Offline- oder Einzelspielermodus und den offiziellen Onlinemodus getrennt mit unveränderten Spieldateien testen.",
      "Return to the game's standard launch options; do not alter anti-cheat installation files.",
      "Zu normalen Startoptionen zurückkehren; Anti-Cheat-Dateien unangetastet lassen.",
      "Game availability changes by developer decision, region, patch and mode; no bypass is provided.",
      "Spielzugang variiert nach Entwicklerentscheidung, Region, Update und Modus; es wird keine Umgehung angeboten."
    ],
    "sources": [
      "anticheat",
      "proton"
    ]
  },
  {
    "id": "gamescope-wayland-output",
    "name": [
      "Gamescope shows a black window or wrong refresh rate",
      "Gamescope zeigt schwarzes Fenster oder falsche Bildrate"
    ],
    "summary": [
      "Inspect nested compositor setup separately from game Vulkan device failures.",
      "Verschachtelte Compositor-Umgebung getrennt von Vulkan-Gerätefehlern prüfen."
    ],
    "sections": [
      [
        "Gamescope can run nested under a desktop session or as a separate compositor; those modes have different display and device requirements. An application that starts normally without gamescope but shows a blank window inside it suggests a presentation-path difference, not necessarily an unsupported game. Record the session type, monitor topology, gamescope version, chosen output mode and actual Vulkan device. A display reporting 144 Hz does not establish that the game is presenting at that rate.",
        "Gamescope kann verschachtelt innerhalb einer Desktop-Sitzung oder als eigener Compositor laufen; beide Betriebsarten haben verschiedene Display- und Geräteanforderungen. Startet ein Spiel ohne gamescope, bleibt darin aber schwarz, spricht das für einen Unterschied im Präsentationspfad, nicht zwingend gegen das Spiel. Sitzungstyp, Monitore, gamescope-Version, Ausgabeoptionen und Vulkan-Gerät erfassen. Ein 144-Hz-Monitor beweist keine Frame-Präsentation mit 144 Hz."
      ],
      [
        "Distinguish X11, Wayland, Xwayland, gamescope nested output and Steam Deck integrated sessions. Check whether the compositor itself exits, whether a window exists but stays black, and whether game audio continues. Multi-monitor routing, resolution, refresh and VRR behavior can interact with compositor or driver versions. HDR also requires a compatible entire output path; simply enabling a flag does not prove display HDR support. Keep logs from gamescope and game process separate.",
        "X11, Wayland, Xwayland, verschachtelte gamescope-Ausgabe und integrierte Steam-Deck-Sitzungen unterscheiden. Prüfen, ob der Compositor beendet wird, ein schwarzes Fenster bestehen bleibt oder Audio weiterläuft. Mehrere Monitore, Auflösung, Bildrate und VRR können mit Compositor- oder Treiberversionen zusammenhängen. HDR benötigt eine durchgehend kompatible Ausgabekette; eine Flag allein belegt das nicht. Gamescope- und Spiellogs getrennt halten."
      ],
      [
        "Run one baseline test without gamescope using otherwise identical game settings, then change only one compositor display option in a second controlled test. Remove guessed combinations of experimental HDR and VRR flags from the first comparison. If the game fails in both paths, inspect Vulkan and kernel events rather than attributing the issue to gamescope. Never assume a workaround measured on an embedded Steam Deck session transfers unchanged to a desktop NVIDIA, AMD or Intel Wayland session.",
        "Zuerst einen Basistest ohne gamescope bei sonst gleichen Spieleinstellungen durchführen. Danach genau eine Compositor-Ausgabeoption ändern. Vermutete Kombinationen experimenteller HDR- und VRR-Flags aus dem ersten Vergleich entfernen. Scheitert das Spiel in beiden Umgebungen, Vulkan- und Kernelereignisse statt einer voreiligen gamescope-Zuschreibung untersuchen. Ein Workaround aus einer eingebetteten Steam-Deck-Sitzung gilt nicht automatisch für einen Desktop mit NVIDIA, AMD oder Intel unter Wayland."
      ]
    ],
    "diagnostics": [
      [
        "echo \"$XDG_SESSION_TYPE\"",
        "Shows the reported desktop session; does not prove the game's output protocol.",
        "Zeigt den gemeldeten Sitzungstyp; nicht zwingend das Ausgabeprotokoll des Spiels."
      ],
      [
        "gamescope --version",
        "Identify the installed binary version, not the bundled SteamOS revision.",
        "Installierte Binärversion bestimmen, nicht die SteamOS-Version des Bundles."
      ]
    ],
    "test": [
      "Save compositor flags; run the game once without gamescope and compare a single nested output setting.",
      "Compositor-Flags sichern; Spiel einmal ohne gamescope und danach mit genau einer verschachtelten Ausgabeoption vergleichen.",
      "Restore previous launch options and refresh-rate configuration.",
      "Vorherige Startoptionen und Bildratenkonfiguration wiederherstellen.",
      "A black window cannot alone identify DRM/KMS, Vulkan or display pipeline failure.",
      "Ein schwarzes Fenster unterscheidet DRM/KMS-, Vulkan- und Display-Probleme nicht allein."
    ],
    "sources": [
      "gamescope",
      "dxvk"
    ]
  },
  {
    "id": "steam-update-download",
    "name": [
      "Steam download, update or file verification loops",
      "Steam-Download, Update oder Dateiprüfung in Schleife"
    ],
    "summary": [
      "Separate download transport, disk writes, filesystem space and content validation.",
      "Netzwerktransport, Schreibzugriffe, Speicherplatz und Inhaltsprüfung unterscheiden."
    ],
    "sections": [
      [
        "Steam may display a stalled download, an update loop or repeated file verification for very different reasons. A bad network transfer differs from a write failure on a particular filesystem, insufficient free space during unpacking, or a game that legitimately rewrites files after launch. Record the selected download region and library, whether bytes arrive but disk usage stalls, and if another Steam title updates normally. Do not treat a low instantaneous download speed as proof of a server outage.",
        "Steam kann einen stockenden Download, eine Update-Schleife oder wiederholte Dateiprüfungen aus unterschiedlichen Gründen zeigen. Fehlerhafte Übertragung, Schreibfehler auf einem Dateisystem, zu wenig Platz beim Entpacken und vom Spiel veränderte Dateien sind getrennte Fälle. Downloadregion und Bibliothek erfassen, prüfen ob Netzverkehr anliegt während der Datenträger wartet, und ein zweites Spiel vergleichen. Eine momentane niedrige Transferrate beweist keine Serverstörung."
      ],
      [
        "Check actual storage capacity on the mount holding steamapps, then inspect relevant file and journal errors before erasing download cache data. Steam can temporarily need more free space than the published download size when patching compressed content. Read-only mounts, permissions and I/O resets can surface as 'corrupt update files' even though the original cause is outside Steam. If the library resides on an external disk, correlate its USB/SATA health separately from Vulkan and game startup events.",
        "Den freien Platz auf dem Mount mit steamapps prüfen und vor dem Löschen von Downloadcache Daten- und Journalfehler untersuchen. Beim Entpacken komprimierter Patches kann zeitweise mehr Platz als die angezeigte Downloadgröße nötig sein. Read-only-Mounts, Rechte oder E/A-Resets können sich als beschädigte Update-Dateien zeigen, obwohl Steam nicht die Ursache ist. Bei externen Datenträgern USB-/SATA-Zustand getrennt von Vulkan- und Spielstartmeldungen betrachten."
      ],
      [
        "Perform a single Steam-provided verification after storage is confirmed healthy. Record whether the same files fail again and whether failure follows the library when moved to a stable native Linux filesystem. Clearing caches or redownloading the entire game erases useful evidence and is usually premature. Preserve the failing manifest information and free-space measurements so another investigator can distinguish delivery, patching and filesystem causes rather than guessing from an error banner.",
        "Nach Bestätigung eines stabilen Speichers genau eine Steam-Dateiprüfung durchführen. Festhalten, ob dieselben Dateien erneut scheitern und ob der Fehler der Bibliothek beim Wechsel auf ein stabiles natives Linux-Dateisystem folgt. Cache-Löschung und vollständiger Neudownload vernichten oft wertvolle Belege und sind zu früh. Manifestinformationen und Speicherwerte sichern, damit Übertragung, Patchen und Dateisystemfehler anhand von Daten statt Bannertext getrennt werden können."
      ]
    ],
    "diagnostics": [
      [
        "df -h",
        "Check free space on the filesystem that actually contains the Steam library.",
        "Freien Platz auf dem Dateisystem der tatsächlichen Steam-Bibliothek prüfen."
      ],
      [
        "journalctl -k -b --no-pager -n 100",
        "Review recent kernel I/O events; restrict and redact logs before sharing.",
        "Letzte Kernel-E/A-Meldungen prüfen; Logs vor Weitergabe eingrenzen und anonymisieren."
      ]
    ],
    "test": [
      "Record error text and filesystem free space; use Steam's built-in verification once after checking disk stability.",
      "Fehlertext und freien Speicher erfassen; nach Prüfung des Datenträgers eine Steam-Dateiprüfung durchführen.",
      "Do not discard caches or game data solely because a verification run failed.",
      "Caches und Spieldaten nicht allein wegen einer fehlgeschlagenen Prüfung verwerfen.",
      "Steam content servers and update details change; this evidence does not assign fault to a provider.",
      "Steam-Inhaltsserver und Updates ändern sich; die Belege weisen keinem Anbieter automatisch Schuld zu."
    ],
    "sources": [
      "proton",
      "runtime"
    ]
  }
];
const references = {
  "proton": [
    "Valve Proton runtime and logging",
    "https://github.com/ValveSoftware/Proton",
    "Valve documents per-game Proton logging and runtime options.",
    "Valve dokumentiert spielbezogene Proton-Logs und Laufzeitoptionen."
  ],
  "runtime": [
    "Steam Linux Runtime bug-report guidance",
    "https://github.com/ValveSoftware/steam-runtime/blob/master/doc/reporting-steamlinuxruntime-bugs.md",
    "Valve separates pressure-vessel logging from game-level failures.",
    "Valve unterscheidet Pressure-Vessel-Logs von Spielfehlern."
  ],
  "ntfs": [
    "Proton wiki: shared NTFS library caution",
    "https://github.com/ValveSoftware/Proton/wiki/Using-a-NTFS-disk-with-Linux-and-Windows",
    "The user-contributed page explicitly cautions that Steam NTFS libraries are not recommended and may lose data.",
    "Die von Nutzern gepflegte Seite warnt ausdrücklich vor NTFS-Steam-Bibliotheken und möglichem Datenverlust."
  ],
  "flatpak": [
    "Flatpak sandbox permissions",
    "https://docs.flatpak.org/en/latest/sandbox-permissions.html",
    "Sandboxed apps only see resources granted through their permissions or portals.",
    "Sandbox-Anwendungen sehen nur über Berechtigungen oder Portale freigegebene Ressourcen."
  ],
  "lutris": [
    "Lutris official logging instructions",
    "https://github.com/lutris/lutris/wiki/Getting-Help:-Providing-logs-&-System-Info",
    "Lutris describes launcher debug mode and the last-game log.",
    "Lutris beschreibt den Debug-Modus und das Log des zuletzt gestarteten Spiels."
  ],
  "heroic": [
    "Heroic official troubleshooting",
    "https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki/Troubleshooting",
    "Heroic separates launcher configuration from Legendary and its authentication state.",
    "Heroic trennt Launcher-Konfiguration von Legendary und dessen Anmeldestatus."
  ],
  "umu": [
    "umu-launcher documented workflow",
    "https://github.com/Open-Wine-Components/umu-launcher",
    "umu supplies an external-client Proton runtime rather than implying Steam compatibility.",
    "umu stellt eine Proton-Laufzeit für externe Clients bereit, ohne Steam-Kompatibilität zu garantieren."
  ],
  "anticheat": [
    "Valve Steamworks Proton anti-cheat guidance",
    "https://partner.steamgames.com/doc/steamhardware/proton",
    "Anti-cheat support depends on individual game-developer enablement.",
    "Anti-Cheat-Unterstützung erfordert die Freischaltung durch den jeweiligen Spieleentwickler."
  ],
  "gamescope": [
    "Valve gamescope documentation",
    "https://github.com/ValveSoftware/gamescope",
    "gamescope distinguishes nested operation from a dedicated session and exposes output controls.",
    "gamescope unterscheidet verschachtelten Betrieb von einer eigenen Sitzung und bietet Ausgabeoptionen."
  ],
  "dxvk": [
    "DXVK official logging documentation",
    "https://github.com/doitsujin/dxvk",
    "DXVK documents logging and device selection without establishing game compatibility.",
    "DXVK dokumentiert Logs und Geräteauswahl, ohne die Spielkompatibilität zu garantieren."
  ],
  "wine": [
    "WineHQ Wine repository and developer resources",
    "https://gitlab.winehq.org/wine/wine",
    "Wine functionality depends on the selected prefix and runtime architecture.",
    "Wine-Funktionalität hängt vom ausgewählten Prefix und der Laufzeitarchitektur ab."
  ]
};
const tr = (en,de) => ({en,de});
const reviewed = '2026-10-10';
const titles = [['Identify the failing layer','Fehlerhafte Ebene ermitteln'],['Collect discriminating evidence','Unterscheidende Befunde sammeln'],['Compare safely and record limitations','Sicher vergleichen und Grenzen beachten']];
export const expansionArticles = specs.map(s => ({
 id:s.id, title:tr(...s.name), summary:tr(...s.summary), reviewed,
 sections:s.sections.map((pair,i)=>({id:['identify','evidence','reversible-test'][i],title:tr(...titles[i]),body:tr(...pair)})),
 diagnostics:s.diagnostics.map(([command,en,de,kind])=>({command,interpretation:tr(en,de),kind:kind||'read-only',requirements:tr('Run in the relevant host/session; compare with the actual game environment and redact private paths before sharing.','In der passenden Host-/Spielumgebung ausführen; tatsächlichen Laufzeitkontext vergleichen und private Pfade vor dem Teilen entfernen.')})),
 test:{action:tr(s.test[0],s.test[1]),rollback:tr(s.test[2],s.test[3]),limitations:tr(s.test[4],s.test[5])},
 sources:s.sources.map(k=>{const [title,url,en,de]=references[k];return {title,url,claim:tr(en,de),reviewed};}),
 fixLab:[],hardware:[],
}));
