# Specification: Monorepo Feature Review Masterplan

## Overview

Create a complete, graph-backed review program for every product feature, shared package, integration boundary, and cross-app workflow in the Reading Advantage monorepo. This track does not perform the reviews. It defines the review protocol, inventory model, child-track structure, evidence format, prioritization rules, and closeout criteria that make a full-monorepo review feasible without collapsing into unstructured notes.

The repository is large enough that a single review track would be ineffective. The latest graph refresh produced 22,185 nodes, 46,017 edges, and 2,715 TypeScript graph files across 8 apps and 13 package workspaces. The repo contains 2,188,598 tracked lines. The review program must therefore divide work by product lineage, shared-platform risk, and user-facing feature boundaries.

## Product Lineage Context

| Surface | Age / lineage | Review implication |
|---|---|---|
| `apps/reading-advantage` | Oldest app, about 3 years old | Treat as legacy source-of-truth and highest-risk refactor/migration target. |
| `apps/primary-advantage` | About 1.5 years old, forked/adapted from Reading Advantage | Review by fork divergence and primary-student adaptations, not only file-by-file. |
| `apps/advantage-games` | About 6 months old | Review as reusable game inventory intended for import into Reading and Primary. |
| `apps/www-reading-advantage` | About 2 years old, company website | Review separately from product apps, focusing on public claims, SEO, accessibility, i18n, and conversion. |
| `apps/science-advantage` | New app developed mostly inside the monorepo | Review as architecture baseline and verify recent remediation tracks held. |
| `apps/codecamp-advantage` | New intern-training app | Review curriculum, GitHub/AI workflow reliability, authz, and production readiness. |
| `apps/marketing` | New marketing-material generation app | Review AI content generation, persistence, media/project workflows, and app-local AI seams. |
| `apps/sales-advantage` | New sales-coaching app | Review audio roleplay, AI evaluation, curriculum progression, storage, and sales-domain contracts. |

## Graph Baseline

The master plan starts from this graph-backed inventory:

| Metric | Count |
|---|---:|
| Graph nodes | 22,185 |
| Graph edges | 46,017 |
| TypeScript graph files | 2,715 |
| Tracked repository lines | 2,188,598 |
| Functions | 5,479 |
| Interfaces | 1,634 |
| Type aliases | 1,264 |
| Route nodes | 623 |
| Schema nodes | 544 |
| Classes | 113 |

Largest graph package/file surfaces:

| Surface | TS files | Graph nodes | Functions |
|---|---:|---:|---:|
| `reading-advantage` | 971 | 4,348 | 1,597 |
| `science-advantage` | 417 | 1,865 | 738 |
| `primary-advantage` | 394 | 1,834 | 718 |
| `advantage-games` | 289 | 1,700 | 600 |
| `www-reading-advantage` | 143 | 1,129 | 78 |
| `domain` | 134 | 619 | 165 |
| `db` | 61 | 170 | 37 |
| `codecamp-advantage` | 47 | 137 | 65 |
| `sales-advantage` | 40 | 152 | 45 |
| `marketing` | 39 | 105 | 52 |

## Functional Requirements

### FR-1: Review Protocol

Define one protocol shared by every child review track. The protocol must require:

- Graph-backed feature inventory before review findings are written.
- Explicit scope statement for each app/package/workflow.
- Evidence-based findings with file paths, line references when applicable, severity, impact, and remediation owner.
- Separation of implementation findings from product-fit and migration-roadmap findings.
- No broad claims such as "fully reviewed" unless the inventory coverage proves it.

### FR-2: Feature Taxonomy

Classify review units into a consistent taxonomy:

- Product page or route.
- API route or route handler.
- tRPC router/procedure.
- Domain module or backend function.
- Database schema/migration/seed surface.
- Auth/session/permission boundary.
- Tenant/school-scoped data flow.
- AI prompt/model/tool boundary.
- Storage/upload/download boundary.
- External integration or webhook.
- Game, game shell, or embeddable runtime.
- Marketing/public website claim or conversion path.
- Test, build, CI, deployment, or observability surface.

### FR-3: Child Track Set

Create complete child review tracks for:

- Shared foundation packages.
- Reading Advantage.
- Primary Advantage.
- Advantage Games.
- Science Advantage.
- CodeCamp Advantage.
- Marketing app.
- Sales Advantage.
- Company website.
- Cross-app workflows.
- Final roadmap and prioritization.

### FR-4: Review Order

Prioritize review execution in this order unless a production incident overrides it:

1. Shared foundation packages.
2. Reading Advantage.
3. Primary Advantage.
4. Science Advantage.
5. CodeCamp Advantage.
6. Sales Advantage.
7. Marketing app.
8. Advantage Games.
9. Company website.
10. Cross-app workflows.
11. Final roadmap.

This order front-loads shared security/tenancy risks and the oldest migration surfaces before newer, more isolated applications.

### FR-5: Evidence Artifacts

Every child review track must produce a review artifact directory under `measure/audit-reports/<track-scope>_<date>/` with at least:

- `00-inventory.md`
- `checklist.md`
- `findings.md`
- `migration-tracks.md`
- `test-gaps.md`
- `executive-summary.md`

When the child track reviews a user-facing app, it must also produce `workflow-map.md` and the review scope must explicitly cover:

- **User-role coverage:** Map every user role (student, teacher, admin, intern, sales rep, etc.) to workflows, permissions, and access boundaries.
- **API/route/contract boundaries:** Review API contracts, error responses, route-handler patterns, and validation at external boundaries where the app has API routes or route handlers.
- **Accessibility, responsive design, and i18n/localization:** Review accessibility (ARIA, keyboard navigation, screen readers), responsive behavior, and internationalization where the app has a user-facing UI.

### FR-6: Measure Orchestrator Readiness

The master plan must be compatible with the Measure Orchestrator. Before any child review runs, project-level `measure/anti-patterns.md` must exist from the orchestrator starter catalog and be extended with project-specific entries as needed. The masterplan readiness strategy lives in `test-strategy.md` and treats the project-local A1-A10 catalog as mandatory falsifiability coverage.

### FR-7: Stop Conditions

The review program must stop and create a remediation track instead of continuing blind review when it finds:

- A Critical auth bypass or tenant data leak.
- A consent or anonymization gap that would allow publishing named student/school/person data without verified consent artifacts (A2 defense).
- A route or shared package pattern that invalidates large portions of the review checklist.
- A build/type/test gate so broken that review evidence cannot be trusted.
- A false registry claim that would cause child-track scope to be wrong.

## Non-Goals

- Do not fix findings inside review tracks unless the fix is necessary to continue evidence gathering.
- Do not merge child tracks into one mega-review artifact.
- Do not use file count alone as evidence of feature coverage.
- Do not review generated lockfiles, migration snapshots, or bulk content line-by-line unless they are directly relevant to a finding.
- Do not archive any child review track based only on a summary artifact.

## Acceptance Criteria

- All child track directories exist with `metadata.json`, `spec.md`, and `plan.md`.
- The master protocol defines inventory, checklist, evidence, severity, and artifact requirements.
- `measure/tracks.md` lists the master review program and all child review tracks.
- The plan explicitly says no actual feature review has started until a child track enters its review phases.
- Project-level `measure/anti-patterns.md` is tracked as a child-review execution prerequisite.
- `test-strategy.md` defines planning-only falsification gates, artifact-vs-live-behavior boundaries, and A1-A10 anti-pattern defenses.
- Every child track has a clear scope, non-goals, artifact list, and phase plan.
