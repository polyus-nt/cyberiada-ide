!macro customInstall
  SetOutPath "$PLUGINSDIR"
  File /oname=$PLUGINSDIR\arduino-cli-data-win32.zip "${BUILD_RESOURCES_DIR}\arduino-cli-data-win32.zip"
  File /oname=$PLUGINSDIR\extract-arduino-cli-data.ps1 "${BUILD_RESOURCES_DIR}\extract-arduino-cli-data.ps1"

  StrCpy $0 "$LOCALAPPDATA\CyberiadaIDE\avr-1.8.8"
  DetailPrint "Installing Arduino AVR core..."
  ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\extract-arduino-cli-data.ps1" -ArchivePath "$PLUGINSDIR\arduino-cli-data-win32.zip" -Destination "$0"' $1
  StrCmp $1 0 core_installed

  MessageBox MB_ICONSTOP|MB_OK "Unable to install the Arduino AVR core."
  Abort

  core_installed:
  CreateDirectory "$INSTDIR\resources\arduino-cli-data"
  FileOpen $1 "$INSTDIR\resources\arduino-cli-data\win32.path" w
  FileWrite $1 "$0"
  FileClose $1
!macroend
