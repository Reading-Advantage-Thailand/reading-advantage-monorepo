---
title: Documentation Index
type: index
status: active
created_at: 2025-10-25
tags: [index, documentation, navigation, overview]
description: The central entry point for Science Advantage documentation, indexing core references, specs, sprint plans, and legacy archives.
---

# Science Advantage Docs

Documentation follows the spec-first workflow. Use this index to locate the source
of truth for product context, requirements, and delivery planning.

## Core References

- **Project Brief:** `project-brief/` (and summary `project-brief.md`)
- **Product Requirements:** `prd/` (and overview `prd.md`)
- **Capability Specs:** `specs/`
- **Sprint Plans & History:** `sprint/`
- **Migration Report:** `MIGRATION-REPORT.md`

## Working with Specs

- Add or update specs in `docs/specs/<capability>/spec.md`.
- Each spec should capture requirements, scenarios, and PRD references.
- Architecture notes or historical context should be promoted into specs when
  relevant; otherwise keep them in the archive.

## Legacy Archive

Earlier documentation, legacy workflow notes, and research artifacts live in
`docs/archive/`. Consult the archive when migrating information, but avoid linking
to it directly from new specs—bring the important details forward instead.

## Related Assets

- Root workflow guidance: `../CLAUDE.md`
- TODO / roadmap snapshot: `../TODO.md`
- Tests and implementation specifics: see repo directories referenced in
  the root `README.md`.
