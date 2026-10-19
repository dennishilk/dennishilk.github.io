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
