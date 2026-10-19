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
