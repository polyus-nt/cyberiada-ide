# ADR 0003: Common live state stream and client-owned playback history

Status: Accepted

## Context

Waiting for terminal execution results prevents users from observing running
programs, particularly endless CyberBear programs. Gardener, Reader and
CyberBear need the same run lifecycle and update mechanism. Gardener additionally
needs ordered playback history, which must survive batching of visual updates.

## Decision

All supported platforms stream `run.state` during ordinary runs and individual
test runs. Messages carry the active run identifier and platform-specific data.
The renderer accumulates Gardener history and Reader output impulses; CyberBear
displays its most recent complete visual state. The server batches updates at
up to 30 Hz and flushes pending data before the terminal response. It preserves
ordered Gardener steps and Reader impulses while coalescing CyberBear snapshots.

Gardener history retains the first 5,000 steps. Current environment updates
continue independently of this cap. The server holds only unsent history within
the cap; terminal responses carry final state without repeating history.
Submission verification keeps its existing per-test verdict progress.

The extension retains protocol version 2 and advertises `run.live` and
`cyberbear.live` capabilities. The new client requests `live: true`; older clients
that omit this flag retain terminal-only results with server-generated history.
The new client can still read old terminal
responses with history. CyberBear requires the advertised capability.

## Consequences

History belongs to the client's current operation and is cleared at each start.
Late updates from other runs are discarded. Disconnect cannot recover missing
history, and marks a running result as interrupted. This trades server history
retention for consistent live behavior and avoids transferring history twice.
