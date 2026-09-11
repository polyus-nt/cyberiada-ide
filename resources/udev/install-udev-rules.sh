#!/usr/bin/env sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root: sudo sh $0" >&2
  exit 1
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_rules="$script_dir/99-mb1.rules"
target_rules='/etc/udev/rules.d/99-mb1.rules'

if [ ! -f "$source_rules" ]; then
  echo "Rules file is missing: $source_rules" >&2
  exit 1
fi
if ! command -v udevadm >/dev/null 2>&1; then
  echo 'udevadm is not installed on this system.' >&2
  exit 1
fi

install -D -m 644 "$source_rules" "$target_rules"
udevadm control --reload-rules
udevadm trigger --subsystem-match=usb

echo "Installed $target_rules. Reconnect the device if it is already attached."
