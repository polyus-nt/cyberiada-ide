#!/usr/bin/env bash
set -euo pipefail

# Keep Windows compiler data next to the executable, just as on Linux.  Do not
# copy transient builds or an access-token file into the installer.
source_root="build/lapki-compiler/compiler"
target_root="resources/modules/win32/lapki-compiler"

for required_path in \
  "$target_root/lapki-compiler.exe" \
  "$source_root/library" \
  "$source_root/platforms" \
  "$source_root/fullgraphmlparser/templates"; do
  if [[ ! -e "$required_path" ]]; then
    echo "Required Windows compiler resource is missing: $required_path" >&2
    exit 1
  fi
done

rm -rf -- \
  "$target_root/build" \
  "$target_root/library" \
  "$target_root/platforms" \
  "$target_root/fullgraphmlparser/templates" \
  "$target_root/ACCESS_TOKENS.txt"
install -d "$target_root/fullgraphmlparser"
cp -a "$source_root/library" "$target_root/library"
cp -a "$source_root/platforms" "$target_root/platforms"
cp -a "$source_root/fullgraphmlparser/templates" "$target_root/fullgraphmlparser/templates"
