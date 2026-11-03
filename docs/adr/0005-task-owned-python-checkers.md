# ADR-0005: Task-owned Python checkers and virtual observation time

## Status

Accepted

## Context

CyberBear exercises compare periodic and input-driven behavior, including random
choices and intentionally endless programs. New checking rules must ship with a
task without rebuilding the interpreter. Existing Gardener and Reader tasks must
continue working. The course checks behavior, not diagram structure.

## Decision

Schema version 2 adds CyberBear tasks with a self-contained `checker.py` and checker
API version 1. The desktop catalog resolves the file inside the task directory and
sends its source to the interpreter. Existing schema version 1 remains supported.
Scenario inputs and Random controls remain declarative in each test; the checker
implements `check(case, execution)` using the full, unbatched journal. Built-in
helpers expose snapshots at a time, palette-aware eye comparison and canonical
matrix pictures. The compiler's seven pictures are preserved exactly; question,
triangle, empty and filled patterns extend the simulator collection.

The observation duration is virtual time, independent of the wall-clock timeout.
An idle observation advances to the next timer or input, up to the inclusive end
of the observation window. Timer restart retains the existing one-shot semantics.
Internal reactions settle before advancing time. Ordinary simulation keeps real
time. Each Random component has independent state and can receive a seeded or
scripted source; scripts are raw nonnegative values mapped into a requested range.
Unconnected byte channels cannot block delivery on connected channels.

Each checker runs in a separate process with a five-second wall limit, bounded
response, and CPU/memory limits where supported. Cancellation terminates this
process. The frozen server also supplies a worker entry point, so users do not
need a separate Python installation. An authored checker is trusted executable
code: a process boundary and resource limits are not a filesystem/network sandbox.
Importing untrusted task packages would require a separate trust/sandbox design.

Checker errors have reason code `CHECKER_ERROR`, distinct from incorrect student
behavior. Trial results retain history for playback. Submission verdict outcomes
omit the journal to avoid duplicate transfers. Hidden inputs are hidden by the
UI; offline task files and client memory are not secret storage.

## Consequences

Task authors can add checkers and scenarios without code registration or a new
application build, within the versioned API. Checkers cannot depend on arbitrary
host-installed Python packages or sibling modules. Existing task discovery still
takes effect on application restart. Adding interpreter capabilities or changing
the checker API still requires an interpreter/client upgrade.
