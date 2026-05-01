# Migration Report — Spec-Driven Workflow

- **Project**: Reading Advantage Platform
- **Date**: 2025-10-22
- **Issue**: [#8](https://github.com/Reading-Advantage-Thailand/www-reading-advantage/issues/8)
- **Branch**: `feat/8-git-workflow-migration`

## Discovery Summary

### Documentation Inventory
- Legacy `README.md` documented both static HTML assets and the newer Next.js implementation but served as a kitchen-sink guide.
- `todo.md` contained extensive backlog checklists (blogging, auth, i18n, SEO, testing, DevOps).
- `cline_docs/` directory held assistant-facing notes: project roadmap, tech stack, current task summaries.
- No existing `docs/` directory, specifications, or sprint planning structure prior to this migration.
- `.github/workflows/ci.yaml` and `cd.yaml` already exist; no issue or PR templates were configured.

### GitHub State
- Issues: 1 open (migration issue #8); no milestones or labels defined yet.
- Branching: Using default `main`; structured feature branch (`feat/8-git-workflow-migration`) created for migration.
- Conventional commits not enforced historically; future work will align with issue/spec references.

### Workflow Observations
- Backlog tracked informally via `todo.md` with no linkage to specs or issues.
- Important implementation context (tech stack, roadmap) lived outside discoverable docs (`cline_docs/`).
- Reusable Next.js foundation already in place (React 19 RC, Tailwind, shadcn/ui, Framer Motion, Firebase).

## Migration Actions
- Created `docs/` hierarchy:
  - `docs/project-brief.md` — product vision, goals, stakeholders, success metrics, open questions.
  - `docs/prd.md` — product requirements covering marketing experience, blogging, auth, i18n, design system, performance, and operations.
  - `docs/specs/README.md` — instructions for capability-based specs.
  - `docs/sprint/S0.md` — initial sprint planning scaffold with candidate stories.
  - `docs/appendix/tech-stack.md` & `docs/appendix/roadmap.md` — consolidated legacy `cline_docs/` content.
  - `docs/migration/2025-10-22-migration.md` — this report.
- Added collaboration guardrails:
  - `CLAUDE.md` and `AGENTS.md` outlining workflow expectations and command usage.
- Introduced GitHub templates:
  - `.github/ISSUE_TEMPLATE/story.yml`, `bug.yml`, and `config.yml` to steer spec references.
  - `.github/pull_request_template.md` enforcing issue/spec linkage, testing, and docs updates.
- Refreshed root references:
  - `README.md` slimmed down with workflow entry points and tech highlights.
  - `todo.md` converted into an interim backlog aligned to capability buckets pending formal specs.

## Outstanding Gaps / Risks
- Detailed specs still needed for each capability (blogging, authentication, internationalization, theming, SEO, performance, testing, operations).
- GitHub labels/milestones to be defined to support sprint tracking.
- CI/CD scripts exist but require alignment with new workflow (ensure lint/test commands in pipeline, document usage).
- Legacy static HTML assets remain; clarify long-term ownership or archival plan.
- Need to confirm downstream integrations (CRM for contact form, analytics tooling) before finalizing PRD sections.

## Recommended Next Actions
1. Author specs (`init-spec`) for the highest priority capabilities (content/blogging, identity/authentication, experience/internationalization).
2. Finalize Sprint S0 scope, then run `seed-sprint docs/sprint/S0.md` to generate issues once specs are merged.
3. Define standard GitHub labels (e.g., `capability:blogging`, `capability:auth`, `workflow`) and milestones.
4. Audit existing CI/CD workflows (`ci.yaml`, `cd.yaml`) to ensure they run lint/tests and reference new docs in PR checks.
5. Plan archival strategy for static HTML artifacts or document their purpose in specs if they remain supported.
