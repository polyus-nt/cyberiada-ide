param(
  [Parameter(Mandatory = $true)]
  [string]$ArchivePath,
  [Parameter(Mandatory = $true)]
  [string]$Destination
)

$ErrorActionPreference = 'Stop'
$markerName = '.lapki-arduino-avr-core-version'
$parent = Split-Path -Parent $Destination
$temporary = Join-Path $parent ".arduino-avr-$PID"

Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $parent -Force | Out-Null

try {
  Expand-Archive -LiteralPath $ArchivePath -DestinationPath $temporary -Force
  if (-not (Test-Path -LiteralPath (Join-Path $temporary $markerName) -PathType Leaf)) {
    throw "The Arduino AVR archive does not contain $markerName."
  }

  Remove-Item -LiteralPath $Destination -Recurse -Force -ErrorAction SilentlyContinue
  Move-Item -LiteralPath $temporary -Destination $Destination
} catch {
  Remove-Item -LiteralPath $temporary -Recurse -Force -ErrorAction SilentlyContinue
  throw
}
