#!/usr/bin/env bash
set -euo pipefail

# Creates the Arduino CLI data directory which is bundled with one platform's
# application. The target's CLI downloads host-specific AVR tools, therefore
# Linux and Windows data must be prepared separately.
platform="${1:?Usage: $0 <linux|win32> [arduino-cli command...] }"
shift
if [[ "$#" -eq 0 ]]; then
  cli=(arduino-cli)
else
  cli=("$@")
fi
core="arduino:avr@1.8.8"
# Increment when the layout or required files of the packaged core change.
# It also makes existing user data from incomplete early packages refresh once.
marker_content="${core}:4"
data_root="resources/arduino-cli-data/$platform"
marker="$data_root/.lapki-arduino-avr-core-version"
cli_data_dir="${ARDUINO_CLI_DATA_DIR:-$PWD/$data_root}"
# This mirror rewrites archive URLs too, so Arduino CLI never contacts
# downloads.arduino.cc while installing the core. Set this to an internal
# mirror's package index when it becomes available.
package_index_url="${ARDUINO_PACKAGE_INDEX_URL:-https://arduino-downloads.amperka.ru/p/packages/package_index.json}"

case "$platform" in
  linux|win32) ;;
  *) echo "Unsupported Arduino core platform: $platform" >&2; exit 1 ;;
esac

if [[ -f "$marker" ]] && [[ "$(<"$marker")" == "$marker_content" ]]; then
  exit 0
fi

rm -rf -- "$data_root"
mkdir -p "$data_root"
# Arduino CLI 1.5.1 tries to initialize Library Manager even for `core
# install`, but the library index endpoint may reject its HTTP client. AVR
# core needs only Boards Manager data, so seed that index from the configured
# mirror and keep an intentionally empty Library Manager index.
wget --https-only --no-verbose --user-agent='Mozilla/5.0' \
  "$package_index_url" \
  -O "$data_root/package_index.json"
printf '{"libraries":[]}\n' > "$data_root/library_index.json"

# The Windows Arduino CLI runs under Wine in the release container. The base
# image contains a Wine prefix created before the current Linux CA bundle, so
# create a short-lived prefix here. Wine imports the Linux CA roots while
# initialising it, which keeps TLS verification enabled for the CLI.
cli_environment=("ARDUINO_DIRECTORIES_DATA=$cli_data_dir")
if [[ "$platform" == 'win32' ]] && command -v winepath >/dev/null; then
  wine_ca_bundle="${WINE_SSL_CERT_FILE:-/etc/ssl/certs/ca-certificates.crt}"
  if [[ -f "$wine_ca_bundle" ]]; then
    wine_prefix="$(mktemp -d)"
    trap 'rm -rf -- "${wine_prefix:-}"' EXIT
    WINEPREFIX="$wine_prefix" wineboot --init
    cli_environment+=(
      "WINEPREFIX=$wine_prefix"
      "SSL_CERT_FILE=$(WINEPREFIX="$wine_prefix" winepath -w "$wine_ca_bundle")"
    )
  else
    echo "Wine CA bundle not found: $wine_ca_bundle" >&2
    exit 1
  fi
fi
env "${cli_environment[@]}" "${cli[@]}" core install "$core"
printf '%s\n' "$marker_content" > "$marker"
# Download archives are not needed by the installed core and inflate releases.
rm -rf -- "$data_root/staging"
