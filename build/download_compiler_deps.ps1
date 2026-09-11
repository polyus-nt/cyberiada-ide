param(
    [Parameter(Mandatory = $true)]
    [string]$BasePath
)

$ErrorActionPreference = 'Stop'
$BasePath = [System.IO.Path]::GetFullPath($BasePath)
$ProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $BasePath '..\..\..'))

function Download-File([string]$Url, [string]$Path) {
    Invoke-WebRequest -Uri $Url -OutFile $Path -UserAgent 'Mozilla/5.0'
}

New-Item -ItemType Directory -Force -Path $BasePath | Out-Null

Write-Host 'Downloading avrdude...'
$avrdudeArchive = Join-Path $BasePath 'avrdude.zip'
Download-File 'https://github.com/avrdudes/avrdude/releases/download/v8.0/avrdude-v8.0-windows-x86.zip' $avrdudeArchive
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue (Join-Path $BasePath 'avrdude')
Expand-Archive -Path $avrdudeArchive -Force -DestinationPath $BasePath
Remove-Item -Force $avrdudeArchive

Write-Host 'Downloading Arduino CLI...'
$cliArchive = Join-Path $BasePath 'arduino-cli.zip'
$cliPath = Join-Path $BasePath 'arduino-cli'
Download-File 'https://github.com/arduino/arduino-cli/releases/download/v1.5.1/arduino-cli_1.5.1_Windows_64bit.zip' $cliArchive
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $cliPath
New-Item -ItemType Directory -Force -Path $cliPath | Out-Null
Expand-Archive -Path $cliArchive -Force -DestinationPath $cliPath
Remove-Item -Force $cliArchive

Write-Host 'Downloading ARM GCC...'
$gccArchive = Join-Path $BasePath 'gcc-arm-none-eabi.zip'
$gccPath = Join-Path $BasePath 'gcc-arm-none-eabi'
$gccTempPath = Join-Path $env:TEMP ('lapki-gcc-' + [guid]::NewGuid())
Download-File 'https://seafile.polyus-nt.ru/f/83d0be836d1c491fa3b3/?dl=1' $gccArchive
New-Item -ItemType Directory -Force -Path $gccTempPath | Out-Null
try {
    Expand-Archive -Path $gccArchive -Force -DestinationPath $gccTempPath
    $gccExecutable = Get-ChildItem -Path $gccTempPath -Recurse -File -Filter 'arm-none-eabi-gcc.exe' | Select-Object -First 1
    if ($null -eq $gccExecutable) {
        throw 'ARM GCC archive does not contain arm-none-eabi-gcc.exe.'
    }
    $gccRoot = Split-Path -Parent (Split-Path -Parent $gccExecutable.FullName)
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $gccPath
    Copy-Item -Recurse -Force $gccRoot $gccPath
} finally {
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $gccTempPath
    Remove-Item -Force -ErrorAction SilentlyContinue $gccArchive
}

Write-Host 'Downloading IRPCB build tools...'
$irpcbArchive = Join-Path $BasePath 'irpcb.zip'
$irpcbPath = Join-Path $BasePath 'irpcb'
$irpcbTempPath = Join-Path $env:TEMP ('lapki-irpcb-' + [guid]::NewGuid())
Download-File 'https://seafile.polyus-nt.ru/f/6377a640bc344e31bd6d/?dl=1' $irpcbArchive
New-Item -ItemType Directory -Force -Path $irpcbTempPath | Out-Null
try {
    Expand-Archive -Path $irpcbArchive -Force -DestinationPath $irpcbTempPath
    $makeExecutable = Get-ChildItem -Path $irpcbTempPath -Recurse -File -Filter 'make.exe' | Select-Object -First 1
    if ($null -eq $makeExecutable) {
        throw 'IRPCB archive does not contain make.exe.'
    }
    $irpcbBin = Split-Path -Parent $makeExecutable.FullName
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $irpcbPath
    New-Item -ItemType Directory -Force -Path $irpcbPath | Out-Null
    Copy-Item -Recurse -Force $irpcbBin (Join-Path $irpcbPath 'bin')
} finally {
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $irpcbTempPath
    Remove-Item -Force -ErrorAction SilentlyContinue $irpcbArchive
}

# Keep the AVR core in the resources which the packaged application copies to
# userData. The process-local PATH is configured by ModuleManager at runtime.
$core = 'arduino:avr@1.8.8'
$coreMarkerContent = "$core`:4"
$coreDataPath = Join-Path $ProjectRoot 'resources\arduino-cli-data\win32'
$coreMarker = Join-Path $coreDataPath '.lapki-arduino-avr-core-version'
if (-not ((Test-Path $coreMarker) -and ((Get-Content -Raw $coreMarker).Trim() -eq $coreMarkerContent))) {
    Write-Host 'Installing Arduino AVR core...'
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $coreDataPath
    New-Item -ItemType Directory -Force -Path $coreDataPath | Out-Null
    $packageIndexUrl = if ($env:ARDUINO_PACKAGE_INDEX_URL) { $env:ARDUINO_PACKAGE_INDEX_URL } else { 'https://arduino-downloads.amperka.ru/p/packages/package_index.json' }
    Download-File $packageIndexUrl (Join-Path $coreDataPath 'package_index.json')
    [System.IO.File]::WriteAllText((Join-Path $coreDataPath 'library_index.json'), '{"libraries":[]}')
    $env:ARDUINO_DIRECTORIES_DATA = $coreDataPath
    & (Join-Path $cliPath 'arduino-cli.exe') core install $core
    if ($LASTEXITCODE -ne 0) {
        throw "Arduino CLI failed to install $core."
    }
    [System.IO.File]::WriteAllText($coreMarker, $coreMarkerContent)
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue (Join-Path $coreDataPath 'staging')
}

Write-Host 'Windows compiler dependencies are ready.'
