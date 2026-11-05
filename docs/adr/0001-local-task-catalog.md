# ADR-0001: Local task catalog

## Status

Accepted

## Context

Lapki needs a task catalog that can be extended without registering tasks in application code. Each task includes presentation content, a target platform, immutable verification inputs, and hidden expected outcomes. Tasks must remain usable without a network service, including in packaged Windows builds. Descriptions may contain local illustrations.

The main alternatives were a remote catalog service, a compiled TypeScript catalog, one manifest referencing task files, and independent task files discovered from application resources.

## Decision

The client discovers independent `*.task.json` files recursively under `resources/tasks` once during application startup. Adding, changing, or removing a task therefore takes effect on the next application launch and requires no manifest or code registration.

Task schemas are strict and require a globally unique task identifier, an independent content version, title, summary, Markdown description, target platform, and verification tests. Both supported schema versions accept exactly one description source: inline `description` or `descriptionFile` pointing to a UTF-8 `.md` file relative to the JSON file. The client resolves external descriptions before passing tasks to the renderer and interpreter; the runtime protocol continues to carry a description string. Markdown images use paths relative to the description file (or the JSON file for inline descriptions), and resolved description files and images must remain inside the task-catalog root. Invalid files and duplicate identifiers do not prevent valid tasks from loading; the task catalog presents diagnostics for the rejected files.

Expected outcomes are hidden by the client UI but are not treated as secrets from a user who can inspect local resources. The client validates task files for presentation, while the State Machine Interpreter performs authoritative validation and determines every test verdict.

The current task-solving session is in-memory and is not restored after application restart. It is independent of the documentation panel and Simulator window lifetimes.

## Consequences

An educator can add a self-contained task with one file or add a task directory containing one task file and adjacent images. Packaged applications work offline and do not depend on catalog availability.

Runtime catalog updates require an application restart. Local expected outcomes cannot provide adversarial secrecy. Both TypeScript and Python sides must implement compatible strict validation for the supported schema, and malformed task resources need user-visible diagnostics.
