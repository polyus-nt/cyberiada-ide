# Задачи модулей 8–9

Все 21 задача из документа «Задачи модулей 8–9 в симуляторе Кибериады» перенесены в локальный каталог. В карточках нет разделения на теорию и практику: каждая содержит самостоятельную легенду, точное условие и отдельную иллюстрацию. Обозначения исходного документа приведены только в этой таблице для сверки.

| Исходный номер | Задача                                                                                                      | Идентификатор                    |
| -------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 8.1-Т1         | [Привет, Мишка](../resources/tasks/bear-hello/bear-hello.md)                                                | bear-hello                       |
| 8.1-Т2         | [Настроение Мишки](../resources/tasks/bear-mood/bear-mood.md)                                               | bear-mood                        |
| 8.1-A          | [Позывной станции](../resources/tasks/bear-station-callsign/bear-station-callsign.md)                       | bear-station-callsign            |
| 8.1-B          | [Светомузыка](../resources/tasks/bear-light-music/bear-light-music.md)                                      | bear-light-music                 |
| 8.1-C          | [Кубик](../resources/tasks/bear-dice/bear-dice.md)                                                          | bear-dice                        |
| 8.2-Т1         | [Тихий час](../resources/tasks/bear-quiet-hour/bear-quiet-hour.md)                                          | bear-quiet-hour                  |
| 8.2-Т2         | [Строчник на приёме](../resources/tasks/reader-reception/reader-reception.md)                               | reader-reception                 |
| 8.2-Т3         | [Посадка по радио](../resources/tasks/reader-gardener-radio-planting.md)                                    | reader-gardener-radio-planting   |
| 8.2-A          | [Светофор шлюза](../resources/tasks/bear-airlock-traffic/bear-airlock-traffic.md)                           | bear-airlock-traffic             |
| 8.2-B          | [Двойная подпись](../resources/tasks/reader-double-signature/reader-double-signature.md)                    | reader-double-signature          |
| 8.2-C          | [Посадка с орбиты](../resources/tasks/reader-gardener-orbital-planting/reader-gardener-orbital-planting.md) | reader-gardener-orbital-planting |
| 9.1-Т1         | [Каждый байт](../resources/tasks/bear-every-byte/bear-every-byte.md)                                        | bear-every-byte                  |
| 9.1-Т2         | [Кодовый замок](../resources/tasks/bear-code-lock/bear-code-lock.md)                                        | bear-code-lock                   |
| 9.1-Т3         | [Сортировка грузов](../resources/tasks/bear-cargo-sorting/bear-cargo-sorting.md)                            | bear-cargo-sorting               |
| 9.1-A          | [Калибровка уха](../resources/tasks/bear-ear-calibration/bear-ear-calibration.md)                           | bear-ear-calibration             |
| 9.1-B          | [Тайник в замерах](../resources/tasks/bear-hidden-measurements/bear-hidden-measurements.md)                 | bear-hidden-measurements         |
| 9.1-C          | [Целая посылка](../resources/tasks/bear-whole-parcel/bear-whole-parcel.md)                                  | bear-whole-parcel                |
| 9.2-Т1         | [ИК-пульт](../resources/tasks/bear-ir-remote/bear-ir-remote.md)                                             | bear-ir-remote                   |
| 9.2-Т2         | [Два канала сразу](../resources/tasks/bear-two-channels/bear-two-channels.md)                               | bear-two-channels                |
| 9.2-A          | [Пульт станции](../resources/tasks/bear-station-remote/bear-station-remote.md)                              | bear-station-remote              |
| 9.2-B          | [Две половинки](../resources/tasks/bear-two-halves/bear-two-halves.md)                                      | bear-two-halves                  |

«Посадка по радио» обновлена на прежнем месте, без дублирования. Существующие идентификаторы «Позывного станции», «Кубика» и «Двух половинок» сохранены. После изменения каталога приложение нужно перезапустить.

В 17 задачах КиберМишки используются локальные Python-чекеры schema v2. Две задачи Строчника и две совместные задачи используют существующие проверки schema v1. Проверяется наблюдаемое поведение; конкретное число состояний и способ построения диаграммы не навязываются. Голубой цвет соответствует голубому цвету палитры (ColorCyan).

В «Тайнике в замерах» есть два различных скрытых потока с одинаковым сообщением. «Две половинки» содержит скрытый запуск на 21 байт и открытые диагностические запуски. В описаниях и codeWord этих двух задач нет ответа; расшифрованное слово вводится на курсе. Для «Посадки с орбиты» три основных испытания рисуют цветочные знаки, а дополнительное проверяет отсутствие команд при обрыве.

Иллюстрации созданы встроенным image_gen; исходные запросы сохранены в [module-task-image-prompts.json](module-task-image-prompts.json). Каждая готовая картинка хранится рядом с задачей как illustration.webp и доступна без сети.

Проверки авторских правил:

```sh
python3 -m unittest discover -s tests -p test_module_task_checkers.py
npx vitest run src/main/tasks.test.ts src/common/tasks.test.ts
npm run typecheck
```

Python-тесты проверяют временные границы, паузы между одинаковыми знаками, границы пар, сохранение незавершённой ИК-посылки после акустического нуля, полный сброс двух половинок и повторные случайные выборы. Они не требуют установленного интерпретатора или сторонних Python-библиотек.
