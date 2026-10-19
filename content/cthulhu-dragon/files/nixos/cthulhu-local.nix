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
