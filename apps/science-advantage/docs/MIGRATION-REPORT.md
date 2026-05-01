---
title: Git Workflow Migration Report
type: report
status: final
created_at: 2025-10-22
tags: [migration, git-workflow, documentation, legacy]
description: A report detailing the migration to a spec-first git workflow, including status of legacy docs and completed actions.
---

# Git Workflow Migration Report

**Date:** 2025-10-22  
**Branch:** `git-workflow-migration`  
**Prepared by:** Codex (AI assistant)

## Current Status

- ✅ Legacy documentation archived under `docs/archive/` with index
- ✅ Core specs rewritten with explicit requirements (`docs/specs/*/spec.md`)
- ✅ GitHub templates updated for spec-first workflow
- ✅ `CLAUDE.md` aligned with issue/PR conventions
- ⏳ README refactor in progress to highlight new documentation sources
- ⏳ Sprint docs unaffected pending future review

## Completed Actions

1. Created `docs/archive/` to preserve legacy docs, competitor research, and
   other historical references without polluting the new spec canon.
2. Moved legacy directories (`architecture/`, `front-end-spec/`, `curriculum/`,
   etc.) and added `docs/archive/README.md` describing available materials.
3. Reworked key specs:
   - `docs/specs/core-science-curriculum-content-management/spec.md`
   - `docs/specs/foundation-ecosystem-integration/spec.md`
   - `docs/specs/assignment-management/spec.md`
4. Normalized spec naming by relocating the Assignment API draft into an
   `assignment-management` capability folder.
5. Removed legacy agent workflow documentation to complete the transition away
   from BMAD-specific processes.

## Outstanding Tasks

- Update the root `README.md` and `docs/README.md` to reflect the streamlined
  spec-driven documentation structure.
- Audit remaining specs to ensure every active capability has requirements,
  scenarios, and PRD cross-references.
- Review sprint files (`docs/sprint/`) to confirm story status aligns with the new
  workflow terminology.
- Decide whether additional automation (scripts/seed-issues.sh, etc.) needs edits
  for the new templates.

## Next Steps & Owners

| Task | Owner | Target |
| ---- | ----- | ------ |
| Refresh README files with migration summary and navigation | Docs / Dev | Oct 24 |
| Conduct spec gap analysis and identify missing capabilities | Product | Oct 28 |
| Validate sprint backlog against updated TODO.md | PM / SM | Oct 28 |
| Introduce migration checklist to onboarding docs (optional) | Enablement | Nov 1 |

## Risks & Notes

- Specs currently focus on three capabilities; more areas (analytics, mobile,
  personalization) still rely on PRD alone. Prioritize writing specs before
  creating new work items.
- Archived docs include valuable design detail—ensure contributors know how to
  extract the relevant information into specs rather than linking back directly.
