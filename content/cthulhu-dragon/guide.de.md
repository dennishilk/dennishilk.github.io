# NixOS mit XMonad: Mein kompletter Kanagawa-Dragon-Desktop zum Nachbauen

Cthulhu ist mein Linux-Arbeitsrechner: Ryzen 7 5800X3D, Radeon RX 9060 XT und zwei ziemlich unterschiedliche Monitore. Bei diesem Neuaufbau bin ich zu XMonad zurückgekehrt. Ich wollte einen Desktop, bei dem ich Fensteranordnung, Launcher, Benachrichtigungen und Startvorgang anhand weniger Dateien nachvollziehen kann. Kanagawa Dragon verbindet diese Teile: fast schwarze Flächen, warme Schriftfarben und zurückhaltende grüne Akzente.

Ein Tiling Window Manager ordnet Fenster an, statt mich jede neue Anwendung von Hand platzieren zu lassen. Auf die Maus verzichte ich deshalb nicht. Diese Konfiguration aktiviert den Monitor unter dem Zeiger, erlaubt das Verändern von Kachelgrenzen mit der Maus und lässt Fenster nach dem Ziehen auf einen anderen Monitor wieder einrasten. Diese Anleitung dokumentiert den daraus entstandenen Desktop anhand meiner funktionierenden Dateien vom 19. Oktober 2026.

Mit Plasma verschwindet dessen vollständige Desktop-Sitzung aus diesem Startweg; XMonad, Xmobar, Dunst und Picom übernehmen konkrete Aufgaben. Das ist eine Entscheidung für einen nachvollziehbaren Arbeitsablauf. RAM-Ersparnis oder bessere Spieleleistung habe ich nicht gemessen. Grundlage bleibt X11, auch für OBS und Steam. Eine Kompatibilitätszusage für jedes Spiel, jede GPU oder jede Aufnahmemethode lässt sich daraus nicht ableiten.

## Den Installationsweg wählen

Beide Wege beginnen mit einem bereits installierten, startfähigen NixOS und führen zum selben Desktop-Modul und denselben Benutzerdateien. Das ist keine Partitionierungsanleitung. Bootloader, Netzwerk, vorhandenes Benutzerkonto, Hostname, Sprache, Laufwerkseinbindungen, hardware-configuration.nix und system.stateVersion bleiben diejenigen der eigenen Installation. Das Desktop-Modul enthält bewusst weder meine Laufwerksbezeichnungen noch meine Kernel-Auswahl.

| Weg | Ausgangspunkt | Erster grafischer Test | Endzustand |
| --- | --- | --- | --- |
| A — Empfehlung für Einsteiger | Grafische NixOS-Installation mit Plasma und funktionierendem Browser | XMonad in SDDM wählen, anschließend startx gesondert aus einer TTY prüfen | TTY-Anmeldung → startx → XMonad |
| B — für Erfahrene | Erfolgreich installiertes NixOS Minimal mit Netzwerk und TTY-Anmeldung | startx direkt an der lokalen TTY | TTY-Anmeldung → startx → XMonad |

Die Beispiele verwenden die Optionsstruktur von NixOS 26.05. CI wertet eine festgehaltene nixpkgs-Revision aus; das prüft diese Beispiele und pinnt nicht die eigene Installation. Der vorhandene Channel beziehungsweise die eigenen Flake-Inputs bleiben erhalten. Neuere Revisionen können Anpassungen erfordern. Bei Flakes müssen neu importierte Dateien im getrackten Konfigurationsverzeichnis liegen, bevor mit dem bisherigen --flake-Ziel gebaut wird.

## Weg A: in Plasma vorbereiten

NixOS mit dem grafischen Installer installieren und Plasma auswählen. In die installierte Umgebung neu starten, Netzwerk prüfen und diese Anleitung in Firefox öffnen. Daneben Konsole starten. Die folgenden Befehle funktionieren in Bash und Fish; die Blöcke der Reihe nach einzeln ausführen. Vorhandene Verzeichnisse werden nicht als entbehrlich vorausgesetzt.

Git vorübergehend bereitstellen und das echte Repository klonen. Falls ~/cthulhu schon existiert, den vorhandenen Checkout prüfen, statt darüber zu klonen.

```sh
nix-shell -p git
```

```sh
git clone --single-branch --branch main https://github.com/dennishilk/cthulhu.git "$HOME/cthulhu"
```

```sh
cd "$HOME/cthulhu/WM/xmonad/nixos-kanagawa-dragon"
```

Plasma und SDDM während der Vorbereitung aktiviert lassen. standalone noch nicht auf true setzen. Mit der gemeinsamen Installation fortfahren und nach dem ersten Rebuild zum Abschnitt über den Wechsel zurückkehren.

## Weg B: aus NixOS Minimal vorbereiten

Die Minimal-Installation muss bereits von der Festplatte starten, Netzwerkzugriff haben und eine Anmeldung mit dem normalen Benutzer an einer lokalen TTY erlauben. Das Konto benötigt sudo-Rechte. Eine SSH-Verbindung kann beim Bearbeiten helfen; startx gehört an die lokale virtuelle Konsole. Für diesen Weg muss Plasma zu keinem Zeitpunkt installiert werden.

Die temporäre Shell stellt Git und Nano auch auf einer kleinen Installation bereit. Wer bereits Fish verwendet, landet mit nix-shell normalerweise in einer Bash-Untershell; exit führt zurück zu Fish.

```sh
nix-shell -p git nano
```

```sh
git clone --single-branch --branch main https://github.com/dennishilk/cthulhu.git "$HOME/cthulhu"
```

```sh
cd "$HOME/cthulhu/WM/xmonad/nixos-kanagawa-dragon"
```

Danach dieselben Dateien und Befehle verwenden. In cthulhu-local.nix standalone sofort auf true setzen: Auf diesem Weg ist keine Plasma-Installation zu erhalten. Nach dem ersten erfolgreichen Rebuild neu starten, damit Fish, Gruppen und Sitzungsvariablen aus einer frischen Anmeldung stammen. Anschließend startx als normaler Benutzer ausführen.

## Gemeinsame Installation: System- und Benutzerdateien

Vor dem Bearbeiten /etc/nixos sichern. Das datierte Ziel darf noch nicht existieren; bei einer Wiederholung einen anderen Zusatz wählen. Es entstehen Kopien, keine Ersatzdateien für die generierte Hardwarekonfiguration.

```sh
sudo cp -a /etc/nixos "/etc/nixos.before-cthulhu-$(date +%Y%m%d-%H%M%S)"
```

Zunächst prüfen, ob die beiden Zieldateien bereits existieren. Falls ja, vergleichen und einen neuen Namen wählen oder die Inhalte bewusst zusammenführen. GNU cp -n überspringt vorhandene Ziele, statt sie zu überschreiben; anschließend prüfen, welche Dateien tatsächlich installiert wurden.

```sh
ls -l /etc/nixos/desktop.nix /etc/nixos/cthulhu-local.nix
```

Auf einer frischen Installation sind Fehlermeldungen über fehlende Dateien an dieser Stelle erwartbar. Module kopieren und die lokalen Optionen öffnen:

```sh
sudo cp -n nixos/desktop.nix nixos/cthulhu-local.nix /etc/nixos/
```

```sh
sudo nano /etc/nixos/cthulhu-local.nix
```

YOUR_LOGIN durch den vorhandenen Benutzernamen ersetzen; whoami zeigt ihn an. Das eigene X11-Tastaturlayout wählen. Weg A behält standalone=false, Weg B verwendet true. personalApps=true installiert Chrome, VS Code, OBS und Kdenlive für die entsprechenden Tastenkürzel. Bei false bleiben Firefox und die wesentlichen Desktop-Werkzeuge verfügbar; M-b/M-o/M-v benötigen dann entweder die optionalen Pakete oder eigene Ersatzbefehle. gaming=true ergänzt Steam, Lutris und 32-Bit-Grafik-/Audiounterstützung. Beide optionalen Schalter erlauben unfreie Pakete. Virtualisierung, Ledger-Unterstützung, Druckdienste und meine persönlichen Laufwerke sind keine Voraussetzung.

```sh
whoami
```

```sh
sudo nano /etc/nixos/configuration.nix
```

./cthulhu-local.nix zur VORHANDENEN imports-Liste hinzufügen. Wenn bisher ausschließlich die generierte Hardwaredatei importiert wird, sieht die Liste anschließend so aus. Weitere Imports und alle sonstigen Einstellungen der eigenen Datei erhalten:

```nix
imports = [ ./hardware-configuration.nix ./cthulhu-local.nix ];
```

Keine neue system.stateVersion aus diesem Artikel übernehmen. Der für die eigene Installation erzeugte Wert bleibt stehen. Auch die eigene Treiberkonfiguration bleibt erhalten: Das Modul aktiviert den Grafikunterbau, ersetzt aber keine NVIDIA-Einrichtung und wählt keinen neuen Kernel. Bei kollidierenden Optionen die in der Fehlermeldung genannten Dateien lesen und genau diese Einstellung zusammenführen. Nicht die vollständige Konfiguration eines fremden Rechners darüberkopieren.

Das Benutzer-Installationsskript vor dem Ausführen lesen und ohne sudo starten:

```sh
less scripts/install-user.sh
```

```sh
bash scripts/install-user.sh
```

Es kopiert ausschließlich die veröffentlichten home/-Dateien, macht die Helfer ausführbar und erstellt einmalig die eigene Fastfetch-Altersmarkierung. Vorher prüft es den gesamten Satz und verweigert abweichende vorhandene Dateien, Symlinks an Zielpfaden und ein vorhandenes ~/.config/xmonad, das Vorrang vor ~/.xmonad hätte. Es entfernt weder Plasma noch bearbeitet es /etc/nixos. Bei einem Konflikt die genannte Datei sichern, vergleichen und bewusst beiseitelegen. Ein identischer erneuter Lauf verändert weder Inhalte noch den Zeitstempel der Markierung. Nach eigenen Anpassungen meldet ein erneuter Lauf den Unterschied, statt die Änderungen zurückzusetzen.

Das System zunächst bauen und erst danach aktivieren. Für eine Channel-basierte Installation:

```sh
sudo nixos-rebuild build
```

```sh
sudo nixos-rebuild switch
```

Bei einer Flake-Konfiguration den eigenen bisherigen --flake-Parameter verwenden. Änderungen an NixOS-Diensten und Paketen benötigen einen Rebuild. Das Bearbeiten einer Benutzerdatei benötigt keinen NixOS-Rebuild.

## Kanagawa Dragon: GTK-Theme installieren

Die GTK-Quelle ist [Fausto-Korpsvart/Kanagawa-GKT-Theme](https://github.com/Fausto-Korpsvart/Kanagawa-GKT-Theme). Das Projekt wurde am 3. Oktober 2026 archiviert und steht unter GPL-3.0. Der Installer benötigt sassc; Upstream nennt zusätzlich Murrine und gnome-themes-extra für ältere GTK-Darstellung. Das Desktop-Modul stellt diese Pakete bereit. Die Theme-Dateien werden aus der Upstream-Quelle bezogen und nicht in dieses Repository eingebettet.

```sh
mkdir -p "$HOME/.local/share"
```

```sh
git clone https://github.com/Fausto-Korpsvart/Kanagawa-GKT-Theme.git "$HOME/.local/share/kanagawa-gtk-source"
```

Für diesen Nachbau die geprüfte Upstream-Revision verwenden. Einen vorhandenen Quell-Checkout vor dem Wechsel der Revision prüfen.

```sh
git -C "$HOME/.local/share/kanagawa-gtk-source" checkout --detach 55ca4ba249eba21f861b9866b71ab41bb8930318
```

Als normaler Benutzer ausführen. Der Upstream-Installer ersetzt vorhandene Theme-Verzeichnisse gleichen Namens; ein selbst angepasstes Kanagawa-Theme vorher sichern. Diesen Befehl habe ich für meinen Desktop verwendet:

```sh
nix-shell -p sassc --run 'bash ~/.local/share/kanagawa-gtk-source/themes/install.sh -n Kanagawa -t green -c dark --tweaks dragon'
```

Das ausdrückliche -n Kanagawa legt den Theme-Namen fest. Beim Einrichten entstand ohne diesen Parameter durch die Nix-Shell-Umgebung ein unerwünschter Name. Prüfen, dass ~/.themes/Kanagawa-Green-Dark-Dragon existiert. GTK-3-Anwendungen wie Thunar und Mousepad lesen settings.ini beim Start; nach Theme-Änderungen schließen und neu öffnen. Ein Einstellungsdialog aus Plasma oder GNOME ist nicht erforderlich.

Die GTK-4-Datei verwendet jetzt ebenfalls Bibata-Modern-Classic; im privaten Snapshot stand noch breeze_cursors. Das ist eine bewusste Korrektur für die Veröffentlichung. Ein Theme-Name allein garantiert keine GTK-4- oder libadwaita-Darstellung. Upstream bietet gtk-4.0-CSS/Assets und den Schalter -l an; dieser ersetzt allerdings vorhandene GTK-4-CSS-Verknüpfungen. Wir aktivieren ihn nicht automatisch. Anwendungen mit libadwaita oder eigenen Sandbox-Laufzeitumgebungen können ihre eigene Darstellung behalten. GTK-3-Thunar und Mousepad bilden den verlässlichen Kern dieses Nachbaus; globale GTK_THEME-Overrides sind dafür unnötig.

Die Palette verteilt konkrete Aufgaben: #181616 ist die dunkle Basis, #c5c9c5 die Schrift, #87a987 der Fokus-/Auswahlakzent, #393836 der inaktive Rahmen und #c4746e die kritische Benachrichtigung. Kitty verwendet eine echte, mit Herkunft versehene Kanagawa-Dragon-Palettendatei. GTK, Rofi, Dunst, Xmobar und XMonad erhalten passende Einstellungen; keine einzelne Anwendung färbt automatisch die anderen mit ein.

## Monitore, Wallpaper und Mauszeiger

In der ersten grafischen XMonad-Sitzung die eigenen Ausgänge prüfen:

```sh
xrandr
```

Mein erster Monitor hängt an DP-2, mit 3440×1440 bei 144 Hz. Rechts daneben steht HDMI-1 mit 1920×1080 bei 60 Hz. Anschlussnamen und Modi hängen von der Hardware ab. Die veröffentlichte monitors.sh startet mit configure_layout=false und erhält die vorhandene Anordnung. Namen, unterstützte Modi und Positionen anpassen, bevor der Schalter auf true gesetzt wird. Mit nur einem Monitor kann false erhalten bleiben, um Xorgs funktionierende Anordnung zu verwenden; alternativ den Zwei-Ausgänge-Befehl durch einen Befehl für den eigenen einzelnen Ausgang ersetzen.

```sh
nano "$HOME/.config/cthulhu/monitors.sh"
```

Eigene Bilder verwenden. 1.png ist das Wallpaper meines ersten Monitors, 2.png das meines zweiten. Bei einem einzigen Monitor reicht 1.png. Der Helfer übergibt nur vorhandene Dateien; ohne Bilder setzt er einen einfarbigen Dragon-Hintergrund. feh verwendet die Xinerama-Monitorreihenfolge. Falls die Bilder vertauscht erscheinen, diese mit feh --list-xinerama prüfen und die Dateireihenfolge tauschen. --primary definiert fehs Reihenfolge nicht auf jeder Konfiguration neu.

```sh
mkdir -p "$HOME/Bilder/wallpaper"
```

Die gewählten PNGs mit Thunar oder cp dorthin kopieren und diese Dateinamen verwenden. Beispiel für ein zuvor unter ~/Pictures/my-wallpaper.png abgelegtes Bild:

```sh
cp -n "$HOME/Pictures/my-wallpaper.png" "$HOME/Bilder/wallpaper/1.png"
```

Direkt aus einem X11-Terminal anwenden:

```sh
bash "$HOME/.config/cthulhu/monitors.sh"
```

feh --bg-max skaliert das Bild vollständig hinein, ohne es zuzuschneiden; dabei können Ränder entstehen. --bg-fill füllt den Bildschirm und schneidet überstehende Bereiche bei abweichendem Seitenverhältnis ab. Mein Start verwendet --bg-max. Der Verzeichnisname Bilder ist lediglich die Konvention dieser Konfiguration und setzt keine deutsche Locale voraus. Wer einen anderen Pfad bevorzugt, passt den Helfer an.

Bibata-Modern-Classic ist der schwarze Mauszeiger. NixOS exportiert XCURSOR_THEME und XCURSOR_SIZE=24 bei der Anmeldung. Beide GTK-Einstellungsdateien stimmen damit überein; xsetroot -cursor_name left_ptr initialisiert den Zeiger auf dem Root-Fenster. Das Paket stellt das Cursor-Theme bereit. Geänderte Sitzungsvariablen benötigen eine frische Anmeldung mit neuer startx-Sitzung; ein XMonad-Neustart allein ersetzt dessen geerbte Umgebung nicht.

## Weg A: testen, dann Plasma entfernen

Nach der Vorbereitung aus Plasma abmelden und in SDDM die XMonad-Sitzung wählen. Kitty (Super+Return), Rofi, Thunar, Dialogfenster, Vollbild und Monitoranordnung testen. Damit wird der Window Manager geprüft, während die grafische Anmeldung weiter einen Rückweg anbietet.

Anschließend aus XMonad abmelden. Mit Strg+Alt+F3 zu einer TTY wechseln und als normaler Benutzer anmelden. Von dort SDDM vorübergehend stoppen, nachdem alle Arbeiten in der grafischen Sitzung gespeichert wurden:

```sh
sudo systemctl stop display-manager
```

Die generierte systemweite xinitrc wird nur verwendet, wenn ~/.xinitrc fehlt und XINITRC nicht gesetzt ist. Eine vorhandene Datei prüfen und bei gewünschter Nutzung des generierten Skripts in eine eigene Sicherung verschieben. Keine zusätzliche minimale Datei mit exec xmonad anlegen: Sie umgeht die verwaltete Sitzungsinitialisierung.

Bash, falls XINITRC gesetzt war:

```bash
unset XINITRC
```

Fish, falls XINITRC gesetzt war:

```fish
set -e XINITRC
```

```sh
startx
```

Weder sudo startx verwenden noch innerhalb eines bereits laufenden Desktop-Terminals starten. Polkit-Agent, USB-Einbindung, Benachrichtigungen, Audio und das Öffnen von Dateien prüfen. In einem XMonad-Terminal:

```sh
systemctl --user status nixos-fake-graphical-session.target cthulhu-polkit.service
```

Falls dieser Test scheitert, XMonad mit Super+Shift+Q verlassen und den Loginmanager von der TTY aus wieder starten:

```sh
sudo systemctl start display-manager
```

Erst nach dem erfolgreichen Standalone-Test /etc/nixos/cthulhu-local.nix bearbeiten und standalone=true setzen. Arbeit speichern, XMonad verlassen, von der TTY neu bauen und neu starten. Dieser ausdrückliche Schalter überschreibt die Aktivierung von Plasma/SDDM und wählt multi-user.target. Er löscht keine Plasma-Dateien oder Benutzerdaten.

```sh
sudo nano /etc/nixos/cthulhu-local.nix
```

```sh
sudo nixos-rebuild build
```

```sh
sudo nixos-rebuild switch
```

```sh
sudo reboot
```

An der Konsole anmelden und startx ausführen. Weg B kommt nach seinem ersten Rebuild und Neustart genau hier an; die SDDM-Test- und Entfernungsschritte entfallen dort vollständig.

## Was startx verwaltet

NixOS erzeugt /etc/X11/xinit/xinitrc aus der aktivierten XMonad-Sitzung. Unsere extraCommands kennzeichnen die Sitzung als XMonad und importieren Display-/Desktop-Variablen in D-Bus und systemd. Das erzeugte Skript importiert DISPLAY und XDG_SESSION_ID, startet nixos-fake-graphical-session.target, führt die XMonad-Sitzung aus, wartet auf deren Ende und stoppt anschließend das Target. Der Polkit-Agent folgt diesem Target. UDisks2, GVfs und das GTK-Portal stellen die ergänzenden Desktop-Dienste bereit.

Der Target-Name ist ein Implementierungsdetail von NixOS, kein zusätzlich zu installierender Desktop. Keine unabhängige weitere D-Bus-Sitzung und keinen zweiten Picom-/Polkit-Prozess darüber starten. Das vollständige Modul weiter unten enthält unsere Anpassung; die erzeugte xinitrc bleibt unter NixOS-Verwaltung. Das tatsächliche Ergebnis der eigenen Installation lässt sich so ansehen:

```sh
cat /etc/X11/xinit/xinitrc
```

Das GTK-Portal übernimmt unterstützte Desktop-Anfragen wie Dateidialoge. Es liefert keinen Wayland-Screencast-Backend. OBS-Aufnahmen müssen in diesem X11-Setup mit den verfügbaren X11-Quellen, etwa XSHM, und den tatsächlichen Anwendungsberechtigungen geprüft werden.

## XMonad: Maus, Tiling und Vollbild

Die vollständige Haskell-Konfiguration steht in der Dateisammlung weiter unten. Super/Windows ist Mod4. focusFollowsMouse behandelt Fenster; focusOnMouseMove aus xmonad-contrib aktualisiert den Fokus beim Bewegen des Zeigers. Der eigene MotionEvent-Hook für das Root-Fenster prüft außerdem Bildschirmrechtecke, wenn der Zeiger über leerer Desktop-Fläche liegt. Er aktiviert den Workspace, der auf diesem Monitor gerade sichtbar ist. Deshalb hängt der Monitorfokus nicht von einem Klick auf ein Fenster ab.

Mit Super und linkem Ziehen lässt mouseMoveWindow das Fenster vorübergehend schweben. afterDrag plant die abschließende Aktion nach dem Loslassen ein. queryPointer und pointScreen ermitteln den Zielmonitor; W.shiftWin verschiebt das Fenster auf dessen sichtbaren Workspace und W.sink fügt es wieder ins Tiling ein. Diese Logik bleibt aus meiner funktionierenden Konfiguration erhalten. Auch ein vorher bewusst schwebendes Fenster wird mit dieser Geste beim Ablegen eingekachelt. Super mit rechtem Ziehen verwendet dagegen das gewöhnliche freie Größenändern; Super+F bringt das Fenster wieder ins Tiling zurück.

MouseResizableTile und seine gespiegelte Variante stellen verschiebbare Kacheltrenner bereit. An den Griffen zwischen den gekachelten Fenstern ziehen, um deren Proportionen zu verändern. Ein frei schwebendes Rechteck zu skalieren ist ein anderer Vorgang. spacingRaw ergänzt außen 8 Pixel und um Fenster 6 Pixel Abstand; avoidStruts reserviert Xmobar Platz. Navigation2D liefert den richtungsbezogenen Fenstertausch. Dialoge schweben durch isDialog. ewmh und ewmhFullscreen unterstützen Vollbildanforderungen von Anwendungen. Das mit Super+Space erreichbare Full-Layout behält dagegen Abstände und Bar-Reservierung dieser Konfiguration; es ist nicht dasselbe wie Anwendungs-Vollbild.

Die Workspaces 1–9 bilden einen gemeinsamen Satz. Jeder Monitor zeigt einen anderen Workspace; es sind keine zwei unabhängigen Neunergruppen. Super+Ziffer verwendet das geerbte Greedy-View-Verhalten. Wird ein schon auf dem anderen Monitor sichtbarer Workspace gewählt, können die angezeigten Workspaces die Monitore tauschen. Super+Shift+Ziffer verschiebt das aktive Fenster dorthin. Die Bildschirmkürzel beziehen sich auf XMonad-Indizes, nicht zwingend auf die Anschlussnummerierung.

| Tastenkürzel | Aktion |
| --- | --- |
| Super+Return / Super+Shift+Return | Kitty (ausdrücklich gesetzt / geerbter Standard) |
| Super+T / Super+M | Thunar / Mousepad |
| Super+B / Super+O / Super+V | Chrome / OBS / VS Code (personalApps) |
| Super+D | Rofi-Anwendungsstarter |
| Super+Q | Aktives Fenster schließen; ersetzt das ursprüngliche Neustartkürzel |
| Super+F | Zentriertes schwebendes Fenster mit 70% Größe / zurück ins Tiling |
| Super+Links / Super+Rechts | Fokus unter den Zeiger setzen, Fenster nach links/rechts tauschen |
| Super+linke Maustaste | Ziehen; auf dem Zielmonitor loslassen und einkacheln |
| Super+mittlere Maustaste | Aktives Fenster zum Master machen |
| Super+rechte Maustaste | Als schwebendes Fenster skalieren |
| Super+Space | MouseResizableTile, gespiegelte Variante und Full durchschalten |
| Super+J / Super+K | Geerbter nächster/vorheriger Fokus |
| Super+1…9 / Super+Shift+1…9 | Workspace anzeigen / Fenster verschieben |
| Super+W / Super+E / Super+R | Bildschirm 0 / 1 / 2 aktivieren, sofern vorhanden |
| Super+Shift+W / E / R | Fenster auf den Workspace von Bildschirm 0 / 1 / 2 senden |
| Druck | Screenshot-Bereich wählen; unter ~/Bilder/Screenshots speichern |
| Lauter/leiser, stumm, Mikrofon stumm | PipeWire-Helfer mit Dunst-Rückmeldung |
| Super+Strg+R | Neu kompilieren, nur bei Erfolg neu starten |
| Super+Shift+Q | XMonad-Sitzung beenden (geerbter Standard) |

Nach Änderungen an xmonad.hs Super+Strg+R oder den folgenden Befehl innerhalb von XMonad verwenden. Bei Compilerfehlern wird die laufende Konfiguration nicht absichtlich ersetzt. Beim Testen ein Terminal geöffnet lassen.

```sh
xmonad --recompile && xmonad --restart
```

spawnOnce merkt sich Befehle über normale XMonad-Neustarts hinweg. Der Monitoraufbau wird dadurch nicht erneut ausgeführt; auch bereits gestartete Xmobar-, Dunst- und Picom-Prozesse werden nicht ausgetauscht. Für Wallpaper-Änderungen den Monitorhelfer direkt ausführen. Nach Konfigurationsänderungen an einem Hintergrundprozess diesen bewusst beenden und neu starten oder die X-Sitzung verlassen und startx erneut ausführen. Änderungen der Sitzungsumgebung benötigen eine neue Anmeldung.

## Kitty, Xmobar, Benachrichtigungen und Audio

Kitty bindet current-theme.conf ein und verwendet background_opacity 0.8. Unter X11 benötigt Transparenz einen Compositor. Dieser Desktop startet picom --backend xrender --daemon aus XMonad. In der Quellübergabe existiert keine separate funktionierende picom.conf. XRender ist die dokumentierte Wahl und keine Aussage über den besten Backend für jede GPU. Vorhandene ~/.config/picom.conf oder ~/.config/picom/picom.conf kann Picom trotzdem einlesen. Bei abweichendem Verhalten eine alte Konfiguration prüfen und nicht parallel einen zweiten Compositor starten.

Xmobar liegt auf Bildschirmindex 0, mit 28 Pixel Höhe, Hack-Schrift, Uhr und Lautstärke. Ein Linksklick auf die Uhr öffnet gsimplecal; ein Rechtsklick auf die Lautstärke pavucontrol. Der kleine Shell-Formatierer aus der Quelle zeigte 0.05 als 05% und ignorierte Stummschaltung. Die veröffentlichte Fassung fragt den gemeinsamen Audiohelfer lesend ab und zeigt korrekt 5% beziehungsweise MUTE. Das Intervall von 10 Ticks aktualisiert ungefähr einmal pro Sekunde. Dunst verwendet denselben Dragon-Hintergrund, grüne Rahmen und rote kritische Meldungen.

cthulhu-audio steuert über wpctl den aktuellen WirePlumber-Standardausgang beziehungsweise -eingang. Die Lautstärke ändert sich in Fünf-Prozent-Schritten; Erhöhungen sind auf 1.0, also 100%, begrenzt. Ausgangs- und Mikrofon-Stummschaltung nutzen verschiedene Ersetzungs-IDs für Benachrichtigungen, damit keine lange Warteschlange von Lautstärkehinweisen entsteht. LC_ALL=C stabilisiert die Dezimalauswertung. Die sichtbaren Meldungen bleiben wie in meinen Dateien deutsch; bei Bedarf die Texte ändern. wpctl status und pavucontrol helfen bei der Gerätewahl, wenn plötzlich HDMI-Audio Standard wird.

```sh
wpctl status
```

Hack wird ausdrücklich für Xmobar, Dunst, Rofi und VS Code installiert. Nerd-Font-Pakete liefern die Fastfetch-Symbole. Fehlende Zeichen deuten auf Schrift oder Fallback hin und nicht automatisch auf ein fehlerhaftes Systeminformationsmodul.

## Fastfetch: Bild, Module und eigenes Systemalter

Die vollständige JSONC erhält das eingerahmte Layout mit Benutzer/Hostname, Laufzeit, System, Kernel, WM, Terminal, Shell, CPU, Root-Laufwerk, RAM/Swap, Rechner, GPU, Displays, Alter und Farben. Die persönlichen Zeilen Games.Vol1/Games.Vol2/Homelab fehlen im portablen Standard. Bei Bedarf Disk-Module mit den eigenen eingehängten Pfaden ergänzen; das Root-Modul benötigt meine Laufwerke nicht. Nummerierte Platzhalter im GPU-Format stammen aus der Quelle und können leere Felder liefern, wenn ein Treiber die Information nicht meldet.

Ein eigenes beziehungsweise zur Nutzung erlaubtes Bild unter ~/.config/fastfetch/1.png ablegen. Dieser Dateiname ist unabhängig vom Wallpaper-Verzeichnis. kitty-icat überträgt es über Kittys Bildprotokoll, mit 30 Zeichenbreite und 15 Zeichenhöhe, oben 1, links 2 und rechts 4 Zeichen Abstand. Dafür sind ein geeignetes grafisches Kitty-Terminal und dessen kitten-Helfer nötig. Die reine Linux-Konsole, ungeeignete Terminals oder manche Multiplexer-Sitzungen stellen das nicht identisch dar. Ohne Bild zunächst die Informationen mit fastfetch --logo none prüfen.

```sh
fastfetch --logo none
```

Nach dem Einfügen des Bildes fastfetch in Kitty starten. Der Installer erzeugt ~/.config/fastfetch/cthulhu-born nur, wenn die Datei fehlt. Das Command-Modul zieht ihre Änderungszeit von der aktuellen Zeit ab und zeigt ganze Tage. Das ist eine selbst verwaltete Installationsmarkierung, nicht automatisch das Alter von Mainboard oder Nix Store. Die private Markierung reichte bis Juli 2022 zurück; neue Benutzer übernehmen dieses Datum nicht. Bei manueller Anlage einmalig zur Installation touch verwenden und später nur dann erneut berühren, wenn der Zähler bewusst zurückgesetzt werden soll.

## VS Code und optionale Anwendungen

settings.json wählt Kanagawa Dragon, Material Icon Theme und Hack. Nach dem Aktivieren von personalApps die Erweiterungen der tatsächlichen Herausgeber installieren. Die Quellübergabe enthielt keine Erweiterungsliste; das folgende überprüfte Theme-Paket liefert den benötigten Theme-Namen:

```sh
code --install-extension metaphore.kanagawa-vscode-color-theme
```

```sh
code --install-extension PKief.material-icon-theme
```

Falls die Darstellung nicht sofort übernommen wird, VS Code neu starten. Seine Einstellungen sind keine NixOS-Module. Steam und Lutris bleiben optional. Vorhandene Proton-Präfixe, Bibliothekslaufwerke, Spielekompatibilität und meine laufende Radeon-Fehlersuche sind getrennte Themen. OBS und Kdenlive werden über den Schalter für persönliche Anwendungen installiert, ohne erfundene Leistungsversprechen.

## Vollständige Konfigurationssammlung

Hier stehen die vollständigen veröffentlichten Dateien, keine Ausschnitte. GitHub- und Raw-Links verweisen auf den zugehörigen Setup-Baum. Dieses wiederverwendbare Desktop-Modul ist die sichere Alternative dazu, meine vollständige rechnerspezifische configuration.nix als Installer zu veröffentlichen. Die eigene ursprüngliche configuration.nix importiert das Modul und behält alle installationsbezogenen Entscheidungen.

### nixos/desktop.nix

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/nixos/desktop.nix) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/nixos/desktop.nix)

```nix
{ config, lib, pkgs, ... }:
let cfg = config.cthulhu.desktop;
in {
  options.cthulhu.desktop = {
    enable = lib.mkEnableOption "the Cthulhu Kanagawa Dragon X11 desktop";
    user = lib.mkOption {
      type = lib.types.str;
      description = "An existing normal login account; this module does not create accounts.";
    };
    keyboardLayout = lib.mkOption { type = lib.types.str; default = "de"; };
    standalone = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Explicitly disable Plasma/SDDM after testing startx from a TTY.";
    };
    personalApps = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Install Chrome, VS Code, OBS, Kdenlive and media tools; allows unfree software.";
    };
    gaming = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Install Steam/Lutris and 32-bit graphics/audio support; allows unfree software.";
    };
  };
  config = lib.mkIf cfg.enable (lib.mkMerge [ {
    assertions = [ {
      assertion = cfg.user != "YOUR_LOGIN" && config.users.users.${cfg.user}.isNormalUser;
      message = "Set cthulhu.desktop.user to an existing normal account from your installation.";
    } ];
    services.xserver = {
      enable = true;
      xkb.layout = cfg.keyboardLayout;
      desktopManager.xterm.enable = false;
      windowManager.xmonad = {
        enable = true;
        enableContribAndExtras = true;
      };
      displayManager.startx = {
        enable = true;
        generateScript = true;
        extraCommands = ''
          export XDG_CURRENT_DESKTOP=XMonad
          export XDG_SESSION_DESKTOP=xmonad
          export XDG_SESSION_TYPE=x11
          dbus-update-activation-environment --systemd DISPLAY XAUTHORITY \
            XDG_CURRENT_DESKTOP XDG_SESSION_DESKTOP XDG_SESSION_TYPE
        '';
      };
    };
    programs.fish.enable = true;
    users.users.${cfg.user}.shell = pkgs.fish;
    environment.sessionVariables = {
      XCURSOR_THEME = "Bibata-Modern-Classic";
      XCURSOR_SIZE = "24";
    };
    hardware.graphics.enable = true;
    services.pipewire = {
      enable = true;
      alsa.enable = true;
      pulse.enable = true;
      wireplumber.enable = true;
    };
    services.pulseaudio.enable = lib.mkForce false;
    security.rtkit.enable = true;
    services.dbus.enable = true;
    services.udisks2.enable = true;
    services.gvfs.enable = true;
    security.polkit.enable = true;
    systemd.user.services.cthulhu-polkit = {
      description = "Polkit agent for the generated startx session";
      wantedBy = [ "nixos-fake-graphical-session.target" ];
      partOf = [ "nixos-fake-graphical-session.target" ];
      serviceConfig = {
        ExecStart = "${pkgs.polkit_gnome}/libexec/polkit-gnome-authentication-agent-1";
        Restart = "on-failure";
      };
    };
    programs.thunar.enable = true;
    services.tumbler.enable = true;
    xdg.portal = {
      enable = true;
      extraPortals = [ pkgs.xdg-desktop-portal-gtk ];
      config.xmonad.default = [ "gtk" ];
    };
    fonts.fontconfig.enable = true;
    fonts.packages = with pkgs; [
      hack-font nerd-fonts.jetbrains-mono nerd-fonts.fira-code
      noto-fonts noto-fonts-color-emoji
    ];
    environment.systemPackages = with pkgs; [
      bash git curl nano kitty xterm firefox mousepad rofi xmobar dunst
      picom feh xrandr xsetroot maim gsimplecal pavucontrol
      wireplumber libnotify fastfetch bibata-cursors kdePackages.breeze-icons
      sassc gtk-engine-murrine gnome-themes-extra
    ];
  }
  (lib.mkIf cfg.personalApps {
    nixpkgs.config.allowUnfree = true;
    environment.systemPackages = with pkgs; [
      google-chrome vscode obs-studio kdePackages.kdenlive vlc ffmpeg-full
    ];
  })
  (lib.mkIf cfg.gaming {
    nixpkgs.config.allowUnfree = true;
    programs.steam.enable = true;
    hardware.graphics.enable32Bit = true;
    services.pipewire.alsa.support32Bit = true;
    environment.systemPackages = [ pkgs.lutris pkgs.vulkan-tools pkgs.libva-utils ];
  })
  (lib.mkIf cfg.standalone {
    services.desktopManager.plasma6.enable = lib.mkForce false;
    services.displayManager.sddm.enable = lib.mkForce false;
    systemd.defaultUnit = "multi-user.target";
  }) ]);
}
```

### nixos/cthulhu-local.nix

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/nixos/cthulhu-local.nix) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/nixos/cthulhu-local.nix)

```nix
{ ... }: {
  imports = [ ./desktop.nix ];
  cthulhu.desktop = {
    enable = true;
    user = "YOUR_LOGIN"; # Your existing account; do not create a second user.
    keyboardLayout = "de"; # e.g. "us"; keep locale/timezone in configuration.nix.
    standalone = false; # Path A: keep Plasma/SDDM until startx has been tested.
    personalApps = false; # true enables Chrome/Code/OBS/Kdenlive shortcuts.
    gaming = false; # true adds Steam/Lutris and 32-bit support.
  };
}
```

### home/.xmonad/xmonad.hs

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.xmonad/xmonad.hs) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.xmonad/xmonad.hs)

```haskell

import XMonad
import Data.List (find)
import Data.Monoid (All(..))
import qualified Data.Map as M
import qualified XMonad.StackSet as W

import XMonad.Actions.AfterDrag (afterDrag)
import XMonad.Actions.Navigation2D (withNavigation2DConfig, windowSwap, Direction2D(..))
import XMonad.Actions.UpdateFocus (focusOnMouseMove, focusUnderPointer)
import XMonad.Hooks.EwmhDesktops (ewmh, ewmhFullscreen)
import XMonad.Hooks.ManageDocks (avoidStruts, docks)
import XMonad.Hooks.ManageHelpers (isDialog)
import XMonad.Layout.MouseResizableTile (mouseResizableTile, mouseResizableTileMirrored)
import XMonad.Layout.Spacing (spacingRaw, Border(..))
import XMonad.Util.EZConfig (additionalKeysP)
import XMonad.Util.SpawnOnce (spawnOnce)

myStartupHook :: X ()
myStartupHook = do
  spawnOnce "bash \"$HOME/.config/cthulhu/monitors.sh\""
  spawnOnce "picom --backend xrender --daemon"
  spawnOnce "dunst"
  spawnOnce "xsetroot -cursor_name left_ptr"
  spawnOnce "xmobar ~/.xmobarrc"

mouseScreenHook :: Event -> X All
mouseScreenHook MotionEvent { ev_x = x, ev_y = y, ev_window = w } = do
  root <- asks theRoot
  if w /= root then pure (All True) else do
    ws <- gets windowset
    let screens = W.current ws : W.visible ws
        inside sc =
          let r = screenRect (W.screenDetail sc)
              px = fromIntegral x :: Int
              py = fromIntegral y :: Int
              left = fromIntegral (rect_x r) :: Int
              top = fromIntegral (rect_y r) :: Int
              right = left + fromIntegral (rect_width r)
              bottom = top + fromIntegral (rect_height r)
          in px >= left && px < right && py >= top && py < bottom
    case find inside screens of
      Just sc | W.screen sc /= W.screen (W.current ws) ->
        windows (W.view (W.tag (W.workspace sc)))
      _ -> pure ()
    pure (All True)
mouseScreenHook _ = pure (All True)

moveToScreenAndTile :: Window -> X ()
moveToScreenAndTile w = do
  d <- asks display
  root <- asks theRoot
  (_, _, _, px, py, _, _, _) <- io $ queryPointer d root
  destination <- pointScreen (fromIntegral px) (fromIntegral py)
  case destination of
    Just sc -> windows (W.sink w . W.shiftWin (W.tag (W.workspace sc)) w)
    Nothing -> windows (W.sink w)

myMouseBindings (XConfig { modMask = modm }) = M.fromList
  [ ((modm, button1), \w -> focus w >> mouseMoveWindow w >> afterDrag (moveToScreenAndTile w))
  , ((modm, button2), \w -> focus w >> windows W.shiftMaster)
  , ((modm, button3), \w -> focus w >> mouseResizeWindow w >> windows W.shiftMaster)
  ]

toggleFloat :: Window -> X ()
toggleFloat w = do
  floating <- gets (W.floating . windowset)
  if M.member w floating
    then windows (W.sink w)
    else windows (W.float w (W.RationalRect 0.15 0.15 0.7 0.7))

main :: IO ()
main = xmonad $ ewmhFullscreen $ ewmh $ withNavigation2DConfig def $ docks $ def
  { modMask     = mod4Mask
  , terminal    = "kitty"
  , borderWidth = 2
  , normalBorderColor = "#393836"
  , focusedBorderColor = "#87a987"
  , startupHook = myStartupHook
  , focusFollowsMouse = True
  , mouseBindings = myMouseBindings
  , rootMask = rootMask def .|. pointerMotionMask
  , handleEventHook = handleEventHook def <+> focusOnMouseMove <+> mouseScreenHook
  , manageHook = manageHook def <+> (isDialog --> doFloat)
  , layoutHook = avoidStruts $ spacingRaw False (Border 8 8 8 8) True (Border 6 6 6 6) True $ (mouseResizableTile ||| mouseResizableTileMirrored ||| Full)
  }
  `additionalKeysP`
  [ ("M-t",        spawn "thunar")
  , ("M-m",        spawn "mousepad")
  , ("M-f", withFocused toggleFloat)
  , ("M-<Left>", focusUnderPointer >> windowSwap L False)
  , ("M-<Right>", focusUnderPointer >> windowSwap R False)
  , ("M-<Return>", spawn "kitty")
  , ("M-q",        kill)
  , ("M-b",        spawn "google-chrome-stable")
  , ("M-o",        spawn "obs")
  , ("M-v",        spawn "code")
  , ("M-d",        spawn "rofi -show drun")
  , ("<Print>", spawn "mkdir -p ~/Bilder/Screenshots && maim -s ~/Bilder/Screenshots/$(date +%Y-%m-%d_%H-%M-%S).png")

  , ("<XF86AudioRaiseVolume>", spawn "$HOME/.local/bin/cthulhu-audio up")
  , ("<XF86AudioLowerVolume>", spawn "$HOME/.local/bin/cthulhu-audio down")
  , ("<XF86AudioMute>",        spawn "$HOME/.local/bin/cthulhu-audio mute")
  , ("<XF86AudioMicMute>",     spawn "$HOME/.local/bin/cthulhu-audio mic")

  , ("M-C-r", spawn "xmonad --recompile && xmonad --restart")
  ]
```

### home/.xmobarrc

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.xmobarrc) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.xmobarrc)

```haskell
Config
  { font = "xft:Hack:size=11"
  , bgColor = "#181616"
  , fgColor = "#c5c9c5"
  , position = OnScreen 0 (TopSize C 100 28)
  , lowerOnStart = False
  , hideOnStart = False
  , overrideRedirect = True
  , allDesktops = True
  , persistent = True
  , sepChar = "%"
  , alignSep = "}{"
  , template = " }<action=`gsimplecal` button=1><fc=#c4b28a>%date%</fc></action>{  <action=`pavucontrol` button=3><fc=#87a987>VOL</fc> %volume%</action>   "
  , commands =
      [ Run Date "%H:%M" "date" 100
      , Run Com "sh" ["-c", "\"$HOME/.local/bin/cthulhu-audio\" status"] "volume" 10
      ]
  }
```

### home/.config/kitty/kitty.conf

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/kitty/kitty.conf) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/kitty/kitty.conf)

```ini
# Transparenz

# Schriftgröße (falls du sie anpassen willst)
font_size 11.0

# Scrollback-Puffer (wie weit du hochscrollen kannst)
scrollback_lines 10000

# Klickbare Links aktivieren
detect_urls yes

background_opacity 0.8


# BEGIN_KITTY_THEME
# Kanagawa_dragon
include current-theme.conf
# END_KITTY_THEME
```

### home/.config/kitty/current-theme.conf

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/kitty/current-theme.conf) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/kitty/current-theme.conf)

```ini
# vim:ft=kitty

## name: Kanagawa_dragon
## license: MIT
## author: Tommaso Laurenzi
## upstream: https://github.com/rebelot/kanagawa.nvim/
## blurb: NeoVim dark colorscheme inspired by the colors of the famous painting
## by Katsushika Hokusai. Dragon version.

#: The basic colors

foreground                      #c5c9c5
background                      #181616
selection_foreground            #c8c093
selection_background            #2d4f67

#: Cursor colors

cursor                          #c8c093

#: URL underline color when overing with mouse

url_color                       #72a7bc

#: Tab bar colors

active_tab_foreground           #c8c093
active_tab_background           #12120f
inactive_tab_foreground         #a6a69c
inactive_tab_background         #12120f

#: The basic 16 colors

#: black
color0  #0d0c0c
color8  #a6a69c

#: red
color1  #c4746e
color9  #e46876

#: green
color2  #8a9a7b
color10 #87a987

#: yellow
color3  #c4b28a
color11 #e6c384

#: blue
color4  #8ba4b0
color12 #7fb4ca

#: magenta
color5  #a292a3
color13 #938aa9

#: cyan
color6  #8ea4a2
color14 #7aa89f

#: white
color7  #c8c093
color15 #c5c9c5


#: You can set the remaining 240 colors as color16 to color255.

color16 #b6927b
color17 #b98d7b
```

### home/.config/dunst/dunstrc

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/dunst/dunstrc) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/dunst/dunstrc)

```ini
[global]
    monitor = 0
    follow = none
    origin = top-right
    offset = (16, 44)
    width = 320
    height = (0, 180)
    notification_limit = 3

    font = Hack 10
    corner_radius = 10
    frame_width = 2
    separator_height = 4
    padding = 12
    horizontal_padding = 14
    gap_size = 6

    transparency = 5
    progress_bar = true
    progress_bar_height = 7
    progress_bar_frame_width = 0
    progress_bar_corner_radius = 3
    highlight = "#87a987"

[urgency_low]
    background = "#181616"
    foreground = "#c5c9c5"
    frame_color = "#737c73"
    timeout = 3

[urgency_normal]
    background = "#181616"
    foreground = "#c5c9c5"
    frame_color = "#87a987"
    timeout = 4

[urgency_critical]
    background = "#181616"
    foreground = "#c4746e"
    frame_color = "#c4746e"
    timeout = 0
```

### home/.config/rofi/config.rasi

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/rofi/config.rasi) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/rofi/config.rasi)

```ini
configuration {
    modi: "drun,run";
    show-icons: true;
    font: "Hack 11";
    drun-display-format: "{name}";
}

* {
    bg: #181616;
    bg-alt: #282727;
    fg: #c5c9c5;
    green: #87a987;
    muted: #737c73;
    selected: #393836;
}

window {
    width: 650px;
    location: center;
    anchor: center;
    background-color: @bg;
    border: 2px;
    border-color: @green;
    border-radius: 12px;
    padding: 16px;
}

mainbox {
    spacing: 12px;
    children: [ inputbar, listview ];
}

inputbar {
    background-color: @bg-alt;
    border-radius: 8px;
    padding: 12px;
    spacing: 10px;
    children: [ prompt, entry ];
}

prompt {
    text-color: @green;
}

entry {
    text-color: @fg;
    placeholder: "Anwendung suchen...";
    placeholder-color: @muted;
}

listview {
    lines: 8;
    columns: 1;
    spacing: 5px;
    scrollbar: false;
}

element {
    padding: 9px;
    spacing: 12px;
    border-radius: 7px;
}

element normal.active {
    background-color: @bg;
    text-color: @green;
}

element selected.normal {
    background-color: @selected;
    text-color: @green;
}

element-icon {
    size: 22px;
}

element-text {
    text-color: @fg;
}
```

### home/.local/bin/cthulhu-audio

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.local/bin/cthulhu-audio) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.local/bin/cthulhu-audio)

```bash
#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

case "${1:-}" in
  up)   wpctl set-volume -l 1.0 @DEFAULT_AUDIO_SINK@ 5%+ ;;
  down) wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%- ;;
  mute) wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle ;;
  mic)  wpctl set-mute @DEFAULT_AUDIO_SOURCE@ toggle ;;
  status) ;; # Read-only mode used by Xmobar; no notification.
  *) printf 'Usage: cthulhu-audio {up|down|mute|mic|status}\n' >&2; exit 2 ;;
esac

if [[ "$1" == mic ]]; then
  state="$(wpctl get-volume @DEFAULT_AUDIO_SOURCE@)"
  if [[ "$state" == *"[MUTED]"* ]]; then
    dunstify -a Cthulhu -r 41002 -t 1800 "Mikrofon" "Stummgeschaltet"
  else
    dunstify -a Cthulhu -r 41002 -t 1800 "Mikrofon" "Aktiv"
  fi
else
  state="$(wpctl get-volume @DEFAULT_AUDIO_SINK@)"
  percent="$(awk '{printf "%.0f", $2 * 100}' <<< "$state")"
  if [[ "$1" == status ]]; then
    if [[ "$state" == *"[MUTED]"* ]]; then printf 'MUTE\n'; else printf '%s%%\n' "$percent"; fi
  elif [[ "$state" == *"[MUTED]"* ]]; then
    dunstify -a Cthulhu -r 41001 -t 1800 -h int:value:0 "Audio" "Stummgeschaltet"
  else
    dunstify -a Cthulhu -r 41001 -t 1800 -h "int:value:$percent" "Lautstärke" "$percent%"
  fi
fi
```

### home/.config/gtk-3.0/settings.ini

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/gtk-3.0/settings.ini) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/gtk-3.0/settings.ini)

```ini
[Settings]
gtk-theme-name=Kanagawa-Green-Dark-Dragon
gtk-application-prefer-dark-theme=true
gtk-button-images=true
gtk-cursor-blink=true
gtk-cursor-blink-time=1000
gtk-cursor-theme-name=Bibata-Modern-Classic
gtk-cursor-theme-size=24
gtk-decoration-layout=icon:minimize,maximize,close
gtk-enable-animations=true
gtk-font-name=Noto Sans,  10
gtk-icon-theme-name=breeze-dark
gtk-menu-images=true
gtk-primary-button-warps-slider=true
gtk-sound-theme-name=ocean
gtk-toolbar-style=3
gtk-xft-dpi=98304
```

### home/.config/gtk-4.0/settings.ini

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/gtk-4.0/settings.ini) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/gtk-4.0/settings.ini)

```ini
[Settings]
gtk-application-prefer-dark-theme=true
gtk-cursor-blink=true
gtk-cursor-blink-time=1000
gtk-cursor-theme-name=Bibata-Modern-Classic
gtk-cursor-theme-size=24
gtk-decoration-layout=icon:minimize,maximize,close
gtk-enable-animations=true
gtk-font-name=Noto Sans,  10
gtk-icon-theme-name=breeze-dark
gtk-primary-button-warps-slider=true
gtk-sound-theme-name=ocean
gtk-xft-dpi=98304
```

### home/.config/fastfetch/config.jsonc

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/fastfetch/config.jsonc) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/fastfetch/config.jsonc)

```json
{
  "$schema": "https://github.com/fastfetch-cli/fastfetch/raw/dev/doc/json_schema.json",
  "logo": "~/.config/fastfetch/1.png",
  "logoType": "kitty-icat",
  "logoWidth": 30,
  "logoHeight": 15,
  "logoPadding": {
    "top": 1,
    "left": 2,
    "right": 4
  },
  "display": {
    "separator": " "
  },
  "modules": [
    {
      "key": "╭───────────╮",
      "type": "custom"
    },
    {
      "key": "│  user    │",
      "type": "title",
      "format": "{user-name}"
    },
    {
      "key": "│ 󰇅 hname   │",
      "type": "title",
      "format": "{host-name}"
    },
    {
      "key": "│ 󰅐 uptime  │",
      "type": "uptime"
    },
    {
      "key": "│  distro  │",
      "type": "os",
      "format": "I use NixOS btw"
    },
    {
      "key": "│  kernel  │",
      "type": "kernel"
    },
    {
      "key": "│  wm      │",
      "type": "wm"
    },
    {
      "key": "│  term    │",
      "type": "terminal"
    },
    {
      "key": "│  shell   │",
      "type": "shell"
    },
    {
      "key": "│ 󰍛 cpu     │",
      "type": "cpu",
      "showPeCoreCount": true
    },
    {
      "key": "│ 󰉉 root    │",
      "type": "disk",
      "folders": "/"
    },
    {
      "key": "│  memory  │",
      "type": "memory"
    },
    {
      "key": "│ 󰓡 swap    │",
      "type": "swap"
    },
    {
      "key": "├───────────┤",
      "type": "custom"
    },
    {
      "key": "│ PC        │",
      "type": "host",
      "format": "{5} {1} ({2})"
    },
    {
      "key": "│ ├ 󰢮 gpu   │",
      "type": "gpu",
      "format": "{1} {2} @ {12}"
    },
    {
      "key": "│ ├  disp  │",
      "type": "display",
      "order": "desc",
      "format": "{1}x{2} @ {3} Hz"
    },
    {
      "key": "│ └  age   │",
      "type": "command",
      "text": "marker=\"$HOME/.config/fastfetch/cthulhu-born\"; if [ -f \"$marker\" ]; then birth_install=$(stat -c %Y \"$marker\"); current=$(date +%s); echo $(((current - birth_install) / 86400)) days; else printf \"marker missing\\n\"; fi"
    },
    {
      "key": "│  colors  │",
      "type": "colors",
      "symbol": "circle"
    },
    {
      "key": "╰───────────╯",
      "type": "custom"
    }
  ]
}
```

### home/.config/Code/User/settings.json

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/Code/User/settings.json) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/Code/User/settings.json)

```json
{
    "workbench.colorTheme": "Kanagawa Dragon",
    "workbench.iconTheme": "material-icon-theme",
    "editor.fontFamily": "'Hack', monospace"
}
```

### home/.config/cthulhu/monitors.sh

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/cthulhu/monitors.sh) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/home/.config/cthulhu/monitors.sh)

```bash
#!/usr/bin/env bash
set -euo pipefail

# Run xrandr, adapt outputs/modes, then opt in. False preserves your layout.
configure_layout=false
primary=DP-2
secondary=HDMI-1
if "$configure_layout"; then
  if ! xrandr --output "$primary" --primary --mode 3440x1440 --rate 144 --pos 0x0 \
      --output "$secondary" --mode 1920x1080 --rate 60 --pos 3440x0; then
    printf 'Monitor layout failed; check xrandr output and supported modes.\n' >&2
  fi
fi

# Supply your own artwork. feh's Xinerama monitor order decides assignment.
wallpaper_dir="${1:-$HOME/Bilder/wallpaper}"
images=()
for image in "$wallpaper_dir/1.png" "$wallpaper_dir/2.png"; do
  [[ ! -f "$image" ]] || images+=("$image")
done
if ((${#images[@]})); then
  feh --bg-max "${images[@]}"
else
  xsetroot -solid '#181616'
fi
```

### scripts/install-user.sh

[GitHub](https://github.com/dennishilk/cthulhu/blob/main/WM/xmonad/nixos-kanagawa-dragon/scripts/install-user.sh) · [Raw](https://raw.githubusercontent.com/dennishilk/cthulhu/main/WM/xmonad/nixos-kanagawa-dragon/scripts/install-user.sh)

```bash
#!/usr/bin/env bash
# Installs home/ only. No sudo, package management or display-manager changes.
set -euo pipefail
source_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
target="${1:-$HOME}"
[[ $# -le 1 && "$target" = /* && "$target" != / && -d "$target" ]] || {
  printf 'Usage: bash install-user.sh [existing-absolute-home-directory]\n' >&2; exit 2;
}
target="$(realpath -- "$target")"
[[ "$target" != / ]] || { printf 'Refusing filesystem root.\n' >&2; exit 2; }
[[ ! -d "$target/.config/xmonad" ]] || {
  printf 'Existing .config/xmonad takes precedence. Review it before installing .xmonad.\n' >&2; exit 1;
}
mapfile -d '' files < <(find "$source_root/home" -type f -print0 | sort -z)
# Check all conflicts before creating files. Never traverse destination symlinks.
for file in "${files[@]}"; do
  relative="${file#"$source_root/home/"}"
  destination="$target/$relative"
  parent="$destination"
  while [[ "$parent" != "$target" ]]; do
    [[ ! -L "$parent" ]] || { printf 'Refusing symlink: %s\n' "$parent" >&2; exit 1; }
    parent="$(dirname -- "$parent")"
    [[ ! -e "$parent" || -d "$parent" ]] || {
      printf 'Not a directory: %s\n' "$parent" >&2; exit 1;
    }
  done
  if [[ -e "$destination" ]] && ! cmp -s -- "$file" "$destination"; then
    printf 'Conflict: %s\nBack it up and move it aside, then rerun. No files installed.\n' "$destination" >&2
    exit 1
  fi
done
for file in "${files[@]}"; do
  destination="$target/${file#"$source_root/home/"}"
  mkdir -p -- "$(dirname -- "$destination")"
  if [[ ! -e "$destination" ]]; then
    (set -o noclobber; cat -- "$file" > "$destination")
    printf 'Installed %s\n' "$destination"
  fi
done
chmod +x -- "$target/.local/bin/cthulhu-audio" "$target/.config/cthulhu/monitors.sh"
marker="$target/.config/fastfetch/cthulhu-born"
if [[ ! -e "$marker" && ! -L "$marker" ]]; then
  (set -o noclobber; : > "$marker")
fi
printf 'Done. Add your own artwork; edit monitors.sh and review the installation guide.\n'
```

## Fehlersuche und Rückweg

| Symptom | Prüfung und Rückweg |
| --- | --- |
| Nix-Auswertung scheitert | Genannte Option und Datei lesen. YOUR_LOGIN ersetzen, vorhandenes Konto bestätigen, neue Imports bei Flakes tracken und Optionsunterstützung der eigenen Revision prüfen. Fehlgeschlagenen Build nicht aktivieren. |
| startx nutzt eine alte Sitzung | ~/.xinitrc und XINITRC prüfen; beide haben Vorrang vor dem erzeugten Skript. Auch ~/.config/xmonad neben ~/.xmonad prüfen. |
| Schwarzer Bildschirm oder X-Fehler | Mit Strg+Alt+F3 zur TTY wechseln. ~/.local/share/xorg/Xorg.0.log und journalctl -b ansehen. Lokale Anmeldung, eigene Treiber und unterstützte xrandr-Modi prüfen. |
| Kein Authentifizierungsdialog oder Portal | systemctl --user status cthulhu-polkit.service und journalctl --user -b prüfen. Über die generierte startx-Sitzung starten und doppelte Agenten vermeiden. |
| Wallpaper oder Bar nach Neustart unverändert | spawnOnce wiederholt Befehle beim normalen XMonad-Neustart nicht. monitors.sh direkt ausführen oder eine neue X-Sitzung starten. |
| Cursor bleibt Breeze oder ist winzig | Beide GTK-Dateien und XCURSOR_THEME/XCURSOR_SIZE nach einer frischen Anmeldung prüfen. Anwendungen können eigenes Cursorverhalten haben. |
| Kitty bleibt undurchsichtig | Picom einmalig starten, dessen Terminalfehler und alte Konfigurationsdateien prüfen; anschließend ein neues Kitty-Fenster öffnen. |
| Fastfetch-Bild fehlt | Eigenes PNG im richtigen Verzeichnis ablegen und Kitty verwenden. Text mit --logo none unabhängig prüfen. |
| Lautstärke steuert das falsche Gerät | wpctl status und pavucontrol verwenden; der Helfer verwendet bewusst den aktuellen Standardausgang/-eingang. |

Von einer TTY zur vorherigen Systemgeneration zurückkehren:

```sh
sudo nixos-rebuild switch --rollback
```

Falls das aktuelle System nicht bedienbar ist, im Bootmenü eine frühere NixOS-Generation auswählen. Diese Generationen während des Umbaus behalten; den Rückweg nicht mitten in der Installation durch Garbage Collection beseitigen. Für eine dauerhafte Rückkehr zu Plasma standalone wieder auf false setzen, die ursprünglichen Plasma-/SDDM-Deklarationen erhalten oder wiederherstellen und neu bauen. Der Schalter erzwingt deren Abschaltung nur bei true. Er installiert auf dem Minimal-Weg nicht automatisch Plasma. Benutzerdateien gesondert aus ihren Sicherungen zurückholen: NixOS-Rollback setzt manuell kopierte Dotfiles nicht zurück.

## Nachweise, Bildnachweise und Quellen

Die Konfiguration stammt aus meinen tatsächlich verwendeten Dateien. Funktionierendes Ziehen, Größenändern und die Sitzung nach dem Neustart habe ich selbst bestätigt. Automatisierte Quell- und Konfigurationsprüfungen stehen im Validierungsprotokoll des Repositorys. Sie testen weder meine Radeon und die zwei physischen Displays noch eine vollständige grafische Sitzung auf einem frisch installierten Rechner. Diese Eigenschaften müssen Leser weiterhin auf ihrer eigenen Hardware prüfen.

Den aktuellen Screenshot mit Waldhintergrund hat Dennis Hilk am 19. Oktober 2026 ausdrücklich für diese Dokumentation bereitgestellt. Er zeigt den echten Desktop mit Kitty und Fastfetch. Frühere Fuji-Screenshots gehören zu einem früheren Stand und werden nicht als Beleg für diese Version verwendet. Die Aufnahme dokumentiert den Desktop und ist kein separat lizenziertes Wallpaper- oder Fastfetch-Bildpaket. Sichtbare fremde Kunst behält ihre ursprünglichen Rechte. Das herunterladbare Setup enthält keine herausgelösten Bilder. Für 1.png und 2.png eigene Bilder verwenden. ATTRIBUTION.md erläutert die getrennten Theme-Lizenzen und Veröffentlichungskorrekturen.

Technische Primärquellen:

- [NixOS-startx-Modul und erzeugte Sitzung](https://github.com/NixOS/nixpkgs/blob/nixos-26.05/nixos/modules/services/x11/display-managers/startx.nix)
- [NixOS-XMonad-Modul und Contrib-Pakete](https://github.com/NixOS/nixpkgs/blob/nixos-26.05/nixos/modules/services/x11/window-managers/xmonad.nix)
- [XMonad AfterDrag](https://xmonad.github.io/xmonad-docs/xmonad-contrib/XMonad-Actions-AfterDrag.html)
- [XMonad UpdateFocus](https://xmonad.github.io/xmonad-docs/xmonad-contrib/XMonad-Actions-UpdateFocus.html)
- [XMonad MouseResizableTile](https://xmonad.github.io/xmonad-docs/xmonad-contrib/XMonad-Layout-MouseResizableTile.html)
- [Kitty-Konfiguration](https://sw.kovidgoyal.net/kitty/conf/)
- [feh-Handbuch, Wallpaper-Modi und Xinerama](https://man.finalrewind.org/1/feh/)
- [Fastfetch-JSON-Schema](https://github.com/fastfetch-cli/fastfetch/wiki/Json-Schema)
- [Kanagawa-GTK-Quelle und Lizenz](https://github.com/Fausto-Korpsvart/Kanagawa-GKT-Theme)
- [Ursprüngliche Kanagawa-Palette](https://github.com/rebelot/kanagawa.nvim)
- [Kanagawa-Theme für VS Code](https://github.com/paccodes/kanagawa-vscode-theme)
- [Material Icon Theme](https://github.com/material-extensions/vscode-material-icon-theme)
- [GTK 4 Settings](https://docs.gtk.org/gtk4/class.Settings.html)
