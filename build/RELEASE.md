# Сборка релиза через Docker

```bash
git submodule update --init --checkout --recursive
npm run release:docker
```

Команда создаёт содержимое `dist/` и `outputs/` так же, как Linux/Windows-часть
ручных release-workflow. Она не публикует артефакты и не собирает macOS-версию.

Docker Compose сохраняет скачанные архивы зависимостей в именованном volume
`release-download-cache`. При повторном запуске они не загружаются заново.
Также кешируются Electron и electron-builder, а `node_modules`, `out`, `dist` и
`outputs` создаются внутри Linux volume. По окончании успешной сборки готовые
`dist/` и `outputs/` копируются в рабочую папку Windows.
Образ не получает исходники через build context, а рабочая папка монтируется
один раз; это исключает повторное сканирование большого дерева файлов Docker
Desktop перед запуском контейнера.
Windows NSIS также собирается во временном native Linux staging-каталоге, а не
на Windows bind mount. Это особенно существенно для electron-builder, который
обходит большое число небольших файлов.
Каждый Linux-артефакт копируется в `dist/` сразу после успешной проверки своего
формата: AppImage не ожидает окончания сборки Snap и DEB.
DEB появляется только после завершения `fpm`: в фазе создания архива он может
несколько минут не выводить сообщений, особенно при медленном диске или высокой
нагрузке Docker Desktop.
Удалить кеш можно командой:

```bash
docker volume ls --filter name=release-download-cache
docker volume rm <имя_тома_из_предыдущей_команды>
```

По умолчанию Linux-форматы собираются последовательно: AppImage, Snap и DEB.
Это снижает пиковое потребление памяти. Для локальной проверки только DEB:

```bash
$env:RELEASE_LINUX_TARGETS = 'deb' # PowerShell
npm run release:docker
```

Чтобы собрать только Linux-пакеты и не подготавливать Windows-зависимости,
задайте `RELEASE_SKIP_WINDOWS=1`:

```powershell
$env:RELEASE_SKIP_WINDOWS = '1'
$env:RELEASE_LINUX_TARGETS = 'AppImage snap deb'
npm run release:docker
```

Чтобы после успешной Linux-сборки повторить только Windows-часть, задайте
`RELEASE_SKIP_LINUX=1`. Уже скопированные на хост Linux-артефакты в `dist/`
не затрагиваются:

```powershell
$env:RELEASE_SKIP_LINUX = '1'
npm run release:docker
```

DEB сжимается `gzip`, а не `xz`: пакет получается немного больше, но сборка
требует значительно меньше памяти Docker Desktop.

DEB указывает `gcc-arm-none-eabi`, `libusb-1.0-0` и `avrdude` как обязательные
системные зависимости. `arduino-cli` включён в пакет, поскольку Ubuntu 20.04
не предоставляет его в стандартных репозиториях. Перед запуском
`lapki-compiler` клиент восстанавливает системный PATH и добавляет каталог
встроенного Arduino CLI.

В Linux- и Windows-пакет включается соответствующий платформе Arduino AVR core
`arduino:avr@1.8.8`. При первом старте он копируется из ресурсов в
`<userData>/arduino-cli/arduino_avr_1.8.8`; клиент передаёт этот путь через
`ARDUINO_DIRECTORIES_DATA` процессу `lapki-compiler`. Для подготовки Linux core
на машине со системным `arduino-cli` используйте:

```bash
npm run prepare:arduino-core:linux
```

Windows NSIS — самодостаточный установщик: ARM GCC, Arduino CLI с AVR core,
данные `lapki-compiler` и IRPCB (включая требуемые MSYS DLL) находятся в его
`resources`, распакованных рядом с `app.asar`. Внешняя папка `setup_data` и
изменение пользовательского `PATH` не требуются: клиент добавляет эти каталоги
только в окружение собственных дочерних процессов.

Проверка установки и компиляции AVR core в Ubuntu 20.04 x64:

```bash
docker compose -f compose.release.yml run --rm arduino-avr-smoke
```

AppImage и Snap содержат собственные `arduino-cli`, GNU Arm Embedded Toolchain,
`make` и `avrdude` с конфигурацией и необходимыми библиотеками: эти форматы не
могут надёжно использовать инструменты хоста. DEB
содержит `arduino-cli`, но перед его сборкой из staging-копии удаляются GNU Arm
Embedded Toolchain и `make`: оба устанавливаются как обязательные зависимости
пакета.

Snap использует `core20`, так как PyInstaller-модулям требуется GLIBC не ниже
2.29. `lapki-flasher` получает совместимую с Ubuntu 20.04 копию `libusb` из
ресурсов приложения.

Snap работает в strict confinement. После установки администратор должен
разрешить прямой USB-доступ:

```bash
sudo snap connect lapki-ide:raw-usb
```

Для последовательного порта нужно подключить конкретный slot, доступный в
системе:

```bash
snap interface serial-port
sudo snap connect lapki-ide:serial-port <snap-or-system-slot>
```

`raw-usb` не отменяет обычные права Linux на устройство. DEB устанавливает
правила автоматически; для Snap и AppImage запустите один раз на хосте:

```bash
sudo sh resources/udev/install-udev-rules.sh
```

Скрипт устанавливает [`99-mb1.rules`](../resources/udev/99-mb1.rules),
перезагружает правила и запускает обработку USB. Затем переподключите
устройство. На системах без serial-port slot может требоваться поддержка
hotplug в snapd; Snap не может обходить это ограничение.

Перед сборкой очищается внутренний Docker volume с `dist`: финальные артефакты
предыдущего запуска не могут попасть во входные файлы следующей упаковки.

По умолчанию используется Arduino CLI 1.5.1. Для полностью воспроизводимой
сборки перед запуском Compose укажите в `ARDUINO_CLI_URL`, `AVRDUDE_URL`,
`ARM_GCC_URL`, `ARM_GCC_LINUX_URL` и `IRPCB_URL` неизменяемые URL
версионированных артефактов. Linux-архив GNU Arm Embedded Toolchain
`10-2020-q4` берётся с зеркала ArduPilot, поскольку `developer.arm.com` может
быть недоступен из сети сборки.

Индекс и архивы Arduino AVR берутся с зеркала Amperka, так как
`downloads.arduino.cc` может отвечать `403` из сети сборки. Зеркало
переписывает URL архивов внутри индекса, поэтому Arduino CLI не обращается к
официальному CDN. Его можно заменить внутренним зеркалом, передав URL его
`package_index.json` в `ARDUINO_PACKAGE_INDEX_URL`:

```powershell
$env:ARDUINO_PACKAGE_INDEX_URL = 'https://mirror.example/p/packages/package_index.json'
npm run release:docker
```

Windows Arduino CLI запускается под Wine. При подготовке Windows AVR core
создаётся временный Wine-префикс: при инициализации Wine импортирует в него
системный набор CA контейнера. Поэтому сертификат зеркала проверяется без
отключения TLS; после подготовки префикс удаляется. При необходимости другой
набор CA задаётся переменной `WINE_SSL_CERT_FILE`.

`dist/` — единственное место для DEB, AppImage и Snap. В обычной локальной
сборке `outputs/` содержит только Windows ZIP. Папка `outputs/seafile-upload`
создаётся только в workflow загрузки в Seafile, поскольку этому action нужен
один общий каталог для отправки файлов.

Linux-пакеты собираются из временной staging-копии проекта без
`resources/modules/win32`, `resources/modules/darwin` и ARM GCC. Это исключает
чужие платформенные модули из Linux-артефактов независимо от glob-правил
`electron-builder`.

В `resources/modules/linux` должны находиться исполняемые файлы
`lapki-compiler/lapki-compiler` и `sm-interpreter`. Скрипт подготовки назначает
им права на выполнение и проверяет наличие `sm-interpreter` в каждом
собранном Linux-пакете.
