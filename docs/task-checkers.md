# CyberBear task packages

A task package is a directory containing `name.task.json`, `checker.py`, and any
local illustrations. Task files are discovered at application startup. A new
package or checker revision needs an application restart, not a rebuild. The
catalog loads only checker files inside their own task directory, including after
resolving symlinks. Checker source is limited to 256 KB.

Schema version 1 Gardener and Reader tasks retain their existing format. For a
CyberBear task use schema version 2 and platform `blg-mb-junior`:

```json
{
  "schemaVersion": 2,
  "id": "my-bear-task",
  "version": 1,
  "title": "Example",
  "summary": "Show green after an acoustic byte",
  "description": "The complete task statement.",
  "platformId": "blg-mb-junior",
  "checker": { "apiVersion": 1, "file": "checker.py" },
  "tests": [
    {
      "id": "first",
      "title": "One byte",
      "input": {
        "durationMs": 3000,
        "inputs": [{ "timeMs": 1000, "channel": "ears", "byte": 42 }],
        "random": { "seed": 7, "values": [0, 5, 1] }
      },
      "parameters": {},
      "checks": [{ "type": "python" }],
      "hideInputs": false
    }
  ]
}
```

`durationMs` is between 1 and 300000 and includes its final instant. It is virtual
observation time; `timeoutSeconds` (optional, default 10, range 1–30) remains a real
execution guard. A periodic program is successful when its observation completes;
it need not enter a final state. Inputs at the same timestamp keep their list
order. Bytes on unconnected channels are ignored. A test can have no input bytes.

`random` is optional. Its `seed` is an unsigned 32-bit integer. `values` is a
cyclic stream of raw unsigned 32-bit numbers; a range draw `[begin, end)` maps the
next number as `begin + raw % (end - begin)`. `streams` can override this list per
Random component identifier, e.g. `{"streams": {"red": [0, 255]}}`. Each component
has its own cursor and generator. `setSeed()` changes a generator's seed but does
not override a scripted test stream. Repeated values are legitimate random
outcomes. Extra random draws and implementation choices must not be rejected
unless the task statement makes them relevant to observable behavior.

`parameters` is an optional author-defined object passed through in `case`.
`hideInputs` only controls the student interface. Local files and client memory
remain inspectable. Do not put the decoded answer in the task description or in
`codeWord` for a two-level task. The existing optional `codeWord` can be used for
other exercises once the course's confirmation words are assigned.

## Checker API version 1

The checker is a self-contained Python module with this entry point:

```python
def check(case, execution):
    state = state_at(execution, 1500)
    if not eyes_are(state, "green"):
        return {"passed": False, "message": "The eyes must be green", "timeMs": 1500}
    return {"passed": True}
```

`case` contains the normalized test, including `input` and optional `parameters`.
`execution` contains `status` and `result`, whose `cyberBear` is the final state and
`trace` is the full ordered journal. A trace event contains `timeMs` and `kind`:

- `state`: `state` contains both RGBK eyes and a seven-row/five-column matrix.
- `action`: component identifier, method and resolved argument list.
- `random`: component, requested `begin`/`end`, returned `value`/`uValue`.
- `input`: receiving component, channel and byte.
- `eyes.set`, `matrix.set`, `matrix.clear`: output commands, including repeats.

`state_at(execution, timeMs)` returns the last state at or before that time, after
all zero-time reactions at that timestamp. It can inspect unchanged intervals.
`eyes_are(state, "red")` compares both eyes with a named palette color, accepting
proportional RGBK timings and equivalent off values. Available names match the
palette (`red`, `green`, `blue`, `cyan`, `white`, `black`, etc.). A four-value RGBK
list is also accepted. `picture_is(state, "heart")` compares the exact matrix.
`PICTURES` and `COLORS` are provided to the module. Available pictures are `heart`,
`smile`, `sadness`, `cross`, `note`, `rhombus`, `square`, `question`, `triangle`,
`empty`, and `filled`. Drawing pixels manually is as valid as MatrixPicture.draw.

The first three packages demonstrate periodic timing, random output consistency,
and independent channels. They check behavior rather than state/component counts.
An author can add tests or change checker logic without registering code in the
application. Example checkers use both regular observations and all output change
times, so brief extra flashes are not missed.

The return value must be a dictionary with boolean `passed`, optional string
`message`, and optional integer `timeMs`. Checker exceptions, invalid returns and
resource limit violations produce `CHECKER_ERROR`, shown as an error in the task,
not a student's wrong answer. Checker output is limited to 16000 characters;
printed output is discarded. Execution is capped at 100000 events and the journal
at 20000 events; limits cause explicit errors rather than silently incomplete
checking. Individual trials keep the journal for playback; submission verdicts
carry final state and diagnostics without repeating history.

Checkers run in a separate process with a five-second wall limit and CPU/memory
limits where the OS supports them. These are **trusted authored task packages**:
process/resource isolation is not a filesystem or network security sandbox.
The packaged interpreter supplies Python; no external installation is needed.
Use the provided API, builtins and self-contained code, not host-installed packages.
