#!/usr/bin/env bash
set -euo pipefail

cli_version="1.5.1"
core="arduino:avr@1.8.8"
package_index_url="${ARDUINO_PACKAGE_INDEX_URL:-https://arduino-downloads.amperka.ru/p/packages/package_index.json}"
test_root="$(mktemp -d)"
trap 'rm -rf -- "$test_root"' EXIT

apt-get update
apt-get install --no-install-recommends -y ca-certificates tar wget
wget --https-only --no-verbose \
  "https://github.com/arduino/arduino-cli/releases/download/v${cli_version}/arduino-cli_${cli_version}_Linux_64bit.tar.gz" \
  -O "$test_root/arduino-cli.tar.gz"
tar -xzf "$test_root/arduino-cli.tar.gz" -C "$test_root"

mkdir -p "$test_root/data"
wget --https-only --no-verbose --user-agent='Mozilla/5.0' \
  "$package_index_url" \
  -O "$test_root/data/package_index.json"
printf '{"libraries":[]}\n' > "$test_root/data/library_index.json"
ARDUINO_DIRECTORIES_DATA="$test_root/data" "$test_root/arduino-cli" core install "$core"
sketch="$(find "$test_root/data/packages/arduino/hardware/avr/1.8.8/libraries" -name '*.ino' -print -quit)"
if [[ -z "$sketch" ]]; then
  echo 'Arduino AVR core does not contain a sample sketch.' >&2
  exit 1
fi
ARDUINO_DIRECTORIES_DATA="$test_root/data" "$test_root/arduino-cli" compile --fqbn arduino:avr:uno "$(dirname "$sketch")"
