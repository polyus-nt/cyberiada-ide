# Этот скрипт переносит зависимости, внешние данные
# из папки установки рядом с exe (setup_dir)
# и устанавливает их в PATH через внешний скрипт

param(
    # Путь к директории установленного приложения
    [Parameter(Mandatory = $true)]
    [string]$InstallDir,

    # Путь к директории setup_data,
    # содержащей необходимые payload-файлы и зависимости
    [Parameter(Mandatory = $true)]
    [string]$SetupDataDir
)

# Включает строгий режим:
# запрещает использование необъявленных переменных и другие потенциально опасные конструкции
Set-StrictMode -Version Latest

# Любая ошибка завершает выполнение скрипта
$ErrorActionPreference = "Stop"

# Проверка существования файла или директории
function Assert-PathExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        # Тип объекта:
        # Leaf      -> файл
        # Container -> папка
        [Parameter(Mandatory = $true)]
        [ValidateSet("Leaf", "Container")]
        [string]$Type
    )

    # Проверяем существование пути
    $exists = Test-Path -LiteralPath $Path -PathType $Type

    # Если объект не найден — выбрасываем ошибку
    if (-not $exists) {
        throw "Required $Type not found: $Path"
    }
}

# Создание директории, если она отсутствует
function Ensure-Directory {
    param([Parameter(Mandatory = $true)][string]$Path)

    # Проверяем наличие папки
    if (-not (Test-Path -LiteralPath $Path)) {

        # Создаём папку
        New-Item -ItemType Directory -Path $Path | Out-Null
    }
}

# Копирование содержимого директории со всеми вложенными файлами
function Copy-PayloadTree {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Source,

        [Parameter(Mandatory = $true)]
        [string]$Destination
    )

    # Проверяем существование исходной папки
    Assert-PathExists -Path $Source -Type Container

    # Гарантируем наличие папки назначения
    Ensure-Directory -Path $Destination

    # Копируем всё содержимое рекурсивно
    Get-ChildItem -LiteralPath $Source -Force |
        Copy-Item -Destination $Destination -Recurse -Force
}

function Expand-ArchivePayload {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ArchivePath,

        [Parameter(Mandatory = $true)]
        [string]$Destination
    )

    Assert-PathExists -Path $ArchivePath -Type Leaf

    # Удаляем старую временную папку если существует
    if (Test-Path -LiteralPath $Destination) {
        Remove-Item -LiteralPath $Destination -Recurse -Force
    }

    # Создаём папку распаковки
    New-Item -ItemType Directory -Path $Destination | Out-Null

    # Распаковываем архив
    Expand-Archive `
        -LiteralPath $ArchivePath `
        -DestinationPath $Destination `
        -Force
}

# Список обязательных директорий,
# которые должны присутствовать внутри setup_data
$requiredItems = @(
    @{ Path = "gcc-arm-none-eabi.zip"; Type = "Leaf" }
    @{ Path = "irpcb\bin"; Type = "Container" }
    @{ Path = "lapki-compiler\library"; Type = "Container" }
    @{ Path = "lapki-compiler\platforms"; Type = "Container" }
    @{ Path = "lapki-compiler\fullgraphmlparser\templates"; Type = "Container" }
)



# Массив для хранения отсутствующих путей
$missing = @()

# Проверяем наличие всех обязательных директорий
foreach ($item in $requiredItems) {

    # Формируем полный путь
    $fullPath = Join-Path $SetupDataDir $item.Path

    # Если путь отсутствует — добавляем в список missing
    if (-not (Test-Path -LiteralPath $fullPath -PathType $item.Type)) {
        $missing += $fullPath
    }
}

# Если чего-то не хватает — выводим ошибку и завершаем работу
if ($missing.Count -gt 0) {
    $message = "Missing setup_data items:`n - " + ($missing -join "`n - ")
    Write-Error $message
    exit 2
}

# Будем разархивировать gcc в TEMP директории, копировать в INSTDIR, 
# и затем очищать TEMP директорию
$tempDir = Join-Path $env:TEMP "lapki_setup_tmp"
$gccTempDir = Join-Path $tempDir "gcc-arm-none-eabi"
# путь до gcc
$gccArchive = Join-Path $SetupDataDir "gcc-arm-none-eabi.zip"

Expand-ArchivePayload $gccArchive $gccTempDir

# Корневая папка compiler-модуля внутри установленного приложения
$compilerRoot = Join-Path $InstallDir "resources\app.asar.unpacked\resources\modules\win32\lapki-compiler"

# План копирования:
# откуда -> куда
$copyPlan = @(
    # ARM GCC toolchain
    @{
        Source = $gccTempDir
        Destination = (Join-Path $InstallDir "gcc-arm-none-eabi")
    }
    # irpcb binaries
    @{
        Source = (Join-Path $SetupDataDir "irpcb\bin")
        Destination = (Join-Path $InstallDir "irpcb\bin")
    }
    # Библиотеки компилятора
    @{
        Source = (Join-Path $SetupDataDir "lapki-compiler\library")
        Destination = (Join-Path $compilerRoot "library")
    }
    # Платформы компилятора
    @{
        Source = (Join-Path $SetupDataDir "lapki-compiler\platforms")
        Destination = (Join-Path $compilerRoot "platforms")
    }
    # Шаблоны fullgraphmlparser
    @{
        Source = (Join-Path $SetupDataDir "lapki-compiler\fullgraphmlparser\templates")
        Destination = (Join-Path $compilerRoot "fullgraphmlparser\templates")
    }
)

# Выполняем копирование всех payload-данных
foreach ($step in $copyPlan) {
    Copy-PayloadTree `
        -Source $step.Source `
        -Destination $step.Destination
}

# Очистка временной распаковки (пока только gcc)
if (Test-Path -LiteralPath $tempDir) {
    Remove-Item -LiteralPath $tempDir -Recurse -Force
}

# Путь к вспомогательному скрипту установки зависимостей в PATH
$installCompilerDepsScript =
    Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "install_compiler_deps.ps1"

# Проверяем существование скрипта
Assert-PathExists -Path $installCompilerDepsScript -Type Leaf

# Запускаем install_compiler_deps.ps1
& powershell.exe `
    -NoProfile `
    -ExecutionPolicy Bypass `
    -File $installCompilerDepsScript `
    $InstallDir

# Проверяем код завершения
if ($LASTEXITCODE -ne 0) {
    throw "install_compiler_deps.ps1 failed with exit code $LASTEXITCODE"
}

# Путь к arduino-cli
$arduinoCliPath =
    Join-Path $InstallDir "resources\app.asar.unpacked\resources\modules\win32\arduino-cli\arduino-cli.exe"

# Проверяем наличие arduino-cli.exe
Assert-PathExists -Path $arduinoCliPath -Type Leaf

# Устанавливаем Arduino AVR core
# (например, поддержку Arduino Uno/Nano/Mega)
& $arduinoCliPath core install arduino:avr

# Проверяем успешность установки
if ($LASTEXITCODE -ne 0) {
    throw "arduino-cli core install arduino:avr failed with exit code $LASTEXITCODE"
}