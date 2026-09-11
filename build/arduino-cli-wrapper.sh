#!/bin/sh
# The frozen lapki-compiler may export PyInstaller's private library path.
# Arduino CLI propagates it to avr-gcc/binutils, which breaks LTO plugin lookup.
unset LD_LIBRARY_PATH LD_LIBRARY_PATH_ORIG LD_PRELOAD
tool_dir="${0%/*}"
exec "$tool_dir/arduino-cli.real" "$@"
