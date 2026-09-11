#!/bin/sh
set -eu

tool_dir="${0%/*}"
exec "$tool_dir/avrdude.real" -C "$tool_dir/avrdude.conf" "$@"
