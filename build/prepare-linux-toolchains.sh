#!/usr/bin/env bash
set -euo pipefail

# Assemble relocatable tools for AppImage. Runtime DEB uses distribution
# packages instead, and Snap stages GCC/make through snapcraft.
arduino_cli="${1:?Usage: $0 <arduino-cli> <arm-gcc archive>}"
arm_gcc_archive="${2:?Usage: $0 <arduino-cli> <arm-gcc archive>}"
target_root="resources/toolchains/linux"
temporary_root="$(mktemp -d)"
trap 'rm -rf -- "$temporary_root"' EXIT

rm -rf -- "$target_root"
mkdir -p "$target_root/arduino-cli" "$target_root/make"
install -m 755 "$arduino_cli" "$target_root/arduino-cli/arduino-cli.real"
install -m 755 build/arduino-cli-wrapper.sh "$target_root/arduino-cli/arduino-cli"
install -m 755 "$(command -v make)" "$target_root/make/make"

tar -xf "$arm_gcc_archive" -C "$temporary_root"
arm_gcc_directory="$(find "$temporary_root" -mindepth 1 -maxdepth 1 -type d -print -quit)"
if [[ -z "$arm_gcc_directory" ]] || [[ ! -x "$arm_gcc_directory/bin/arm-none-eabi-gcc" ]]; then
  echo "ARM GCC archive does not contain an executable toolchain." >&2
  exit 1
fi
mv "$arm_gcc_directory" "$target_root/gcc-arm-none-eabi"
