# ADR-0004: Shared Reader and Gardener simulation session

## Status

Accepted

## Context

Reader output must drive a Gardener in the same document. Independent runs cannot
coordinate completion or isolate their communication. An idle Gardener must wait
while the Reader can produce more impulses.

## Decision

Protocol v2 advertises `run.session`. A `run.start` may select exactly two distinct
`machines`, one Reader and one Gardener, with separate initial parameters and one
shared XML document, mode, timeout, run identifier and cancellation lifecycle.
Existing single-machine requests remain valid.

Both machines are concurrently active. A cooperative scheduler dispatches one
event per participant per round, preserving each machine's run-to-completion
actions. This avoids threads racing over platform state. A session-local data bus
immediately delivers Reader output to every Gardener Receiver, updates
`received_impulse`, and posts `impulse_received`. Constants `impulseA`, `impulseB`,
`impulseC` are 1, 2, 3; the initial received value is 0. Each posted event retains
its value so a burst cannot change which impulse a handler observes. There is no
readiness handshake: an unhandled event is discarded under normal state-machine
semantics, never held for a future ready state.

Empty queues are passive. Finite execution succeeds at global quiescence (no
pending events or active timers), or when both machines explicitly finish.
A finished machine ignores subsequent impulses. Endless execution continues until
cancellation, failure or both machines explicitly finish. Timeout, cancellation,
crash or execution error ends the whole session.

Live `run.state` messages use `platform: session` and `machines` keyed by machine
identifier. The server batches each participant separately, preserving Reader
impulses and Gardener history, and flushes before the terminal response. The
terminal response carries per-machine results and final field, without repeating
live history.

## Consequences

Tabs can switch without affecting execution. One shared impulse feed and common
controls describe one operation. Compatibility is capability-gated. Long actions
remain atomic and can delay dispatch in the other machine; true CPU parallelism
is not promised. Ordinary task verification remains a single-machine operation.
