# Встроенный lapki-flasher

Бинарники `resources/modules/linux/lapki-flasher` (x86_64) и
`resources/modules/win32/lapki-flasher.exe` (amd64) собраны из
`lapki-flasher` **1ef827978ef1fe3584a5ee96e36a518f13d6bf3d**, ветка
`feat/manual-serial-board-selection`, Go 1.25.10.

Они поддерживают перечисление неизвестных последовательных портов и ручное
назначение профиля платы. При запуске клиент передаёт расположенный здесь
`device_list.JSON`, поэтому список доступных профилей берётся из ресурсов клиента.

Бинарник macOS пока прежний: для ручного выбора платы необходимо собрать новую
версию загрузчика на macOS и заменить `resources/modules/darwin/lapki-flasher`.
Для обеих архитектур и создания universal-бинарника используются команды из
`.github/workflows/go.yml` репозитория загрузчика.

## Сборка

Все команды выполняются из корня `lapki-flasher` на указанном коммите.

Windows:

```sh
GOOS=windows GOARCH=amd64 go build -C src -trimpath -ldflags='-s -w' -o lapki-flasher.exe .
```

Встроенная Linux-сборка статически скомпонована с musl и libusb, чтобы не зависеть
от динамического загрузчика и путей библиотек машины сборки. Для воспроизведения
с Nix:

```sh
nix-shell --extra-experimental-features 'nix-command flakes' \
  -p go pkg-config pkgsStatic.stdenv.cc pkgsStatic.libusb1 \
  --run 'cd src && CC=x86_64-unknown-linux-musl-gcc CGO_ENABLED=1 go build -trimpath -ldflags="-s -w -linkmode external -extldflags -static" -o lapki-flasher .'
```

Для стандартной Linux-сборки с системной libusb можно использовать `go build -C src`.
В обоих случаях сохраняются внешние зависимости существующего загрузчика:
`udevadm`, `avrdude` и загрузчик КиберМишки для соответствующих плат.
