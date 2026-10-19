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
