# Reading Advantage refactor proposal

Status: Draft for owner review. Implementation has not started.

Date: 2026-09-09.

## Outcome

Reading Advantage will use the monorepo packages for backend capabilities and shared infrastructure.
Pages and components will express clear user tasks and responsibilities.
The refactor will preserve supported learning outcomes, account access, school isolation, and stored progress.

## Initial evidence

The working tree contains concurrent changes, including Reading Advantage changes.
The initial inventory excludes dependency folders, build output, and test results.
Counts describe source files, not verified production usage.

| Observation | Initial result |
|---|---|
| API route files | 213 |
| Page files | 59 |
| TypeScript files under components | 376, including tests and models |
| Files importing the database package or local database module | 110 |
| API routes with those database imports | 15 |
| Files directly importing the domain package | 9 |
| API routes directly importing the domain package | 4 |
| Files directly importing the UI package | 0 |

The import scan uses static `from` statements. It does not establish transitive ownership or runtime behavior.
The existing audit stub reports older counts. The full audit must replace those counts with verified findings.

- `apps/reading-advantage/server/controllers/article-controller.ts` combines HTTP handling, database queries, translation, and AI access.
- `apps/reading-advantage/components/admin/article-creation.tsx` contains 1,658 lines and local response types.
- `apps/reading-advantage/components/lesson/lesson-cloze-test.tsx` contains 1,283 lines and manages exercise state, scoring state, and presentation.
- `packages/domain/src/articles/queries.ts` already provides article queries with authorization checks.
- `packages/ui/src/index.ts` already exports common controls used through local copies in the app.

File size identifies review candidates. Responsibility and behavior determine whether a component needs replacement.

## Proposed specification

### FR-1: Complete ownership inventory

Classify every route, page, controller, model, provider, hook, and component.
Record its user task, consumers, data owner, permissions, tests, and migration decision.
Use these decisions: retain, adapt, consolidate, replace, or remove.
Verify consumers before removal.
Reconcile the existing Reading Advantage audit track and overlapping game, authentication, and storage work.

### FR-2: Backend ownership

Reuse existing domain capabilities after checking their contracts and behavior.
Place new backend capabilities in `packages/backend/modules` when an existing domain module does not own them.
Document each capability owner before implementation.
Keep one implementation for each business rule.
Use `packages/db` for schema definitions, migrations, and database infrastructure.
Use shared authentication, authorization, AI, storage, and integration interfaces.
Keep HTTP routes and server actions limited to request adaptation and capability calls.
Move long operations into the existing worker infrastructure.

### FR-3: Contracts and data safety

Define Zod input and output contracts at external boundaries.
Resolve school access from authenticated context.
Enforce resource access in permission modules.
Preserve the explicit distinction between global content and school-owned data.
Define transaction, retry, and duplicate-submission behavior for progress and reward writes.
Preserve stored identifiers and progress during migration.

### FR-4: Pages and components

Organize app features around user tasks: reading, practice, assignments, classrooms, reporting, and content administration.
Let route pages compose feature screens and resolve navigation context.
Use server rendering for initial data where the interaction permits it.
Use client components for browser interaction and local state.
Separate remote data, form state, exercise state, and presentation.
Represent derived values as derived values instead of synchronized state copies.
Use explicit transitions for exercises when several related states control completion.
Keep authoritative scoring and completion rules in the owning backend capability.
Reuse shared UI controls after checking behavior, accessibility, and styling compatibility.
Keep product-specific components in the app unless another consumer needs them.

### FR-5: Product review

Review each screen against its primary user task.
Review navigation, information order, loading, empty results, errors, recovery, accessibility, and mobile use.
Preserve supported workflows while improving component and page structure.
Record proposed workflow removals or material navigation changes for owner review.
Preserve locale coverage and existing public links until an explicit replacement exists.

### FR-6: Controlled migration

Migrate complete user journeys in bounded changes.
Include the contract, backend capability, transport, screen, and tests in each journey.
Remove replaced code after consumer verification.
Add architecture checks through the existing enforcement package.
Keep framework upgrades outside this refactor.

## Target responsibility map

| Layer | Responsibility |
|---|---|
| App routes and layouts | Navigation, request adaptation, screen composition |
| App features | Product presentation, forms, interaction state |
| Shared UI | Reusable controls and accessibility behavior |
| Domain or backend module | Contracts, permissions, business rules, orchestration |
| Shared adapters | Authentication, AI, storage, external integrations |
| Database package | Schema, migrations, database infrastructure |
| Worker service | Durable execution of long operations |

The refactor will use existing package names and public entry points where they fit.
It will not create a second backend framework or move unrelated applications.

## Proposed execution plan

### Stage 1: Baseline and contracts

- [ ] Complete the ownership inventory and reconcile existing tracks.
- [ ] Trace supported student, teacher, administrator, and system journeys.
- [ ] Establish lint, type, test, build, and browser baselines.
- [ ] Record existing failures separately from migration regressions.
- [ ] Map each capability to an existing or new module.
- [ ] Define compatibility requirements and acceptance tests.

### Stage 2: Reading journey

- [ ] Define article discovery, article access, and progress contracts.
- [ ] Add behavioral and permission tests before implementation.
- [ ] Migrate article access through the owning backend capabilities.
- [ ] Recompose discovery and reading screens around their user tasks.
- [ ] Verify school access, pagination, locale behavior, loading, and recovery.
- [ ] Review the complete journey before extending the pattern.

### Stage 3: Learning and practice

- [ ] Define lesson, assessment, vocabulary, sentence, and completion contracts.
- [ ] Test retries, duplicate completion, scoring, and saved progress.
- [ ] Migrate backend rules and simplify exercise state.
- [ ] Consolidate equivalent practice components after behavior comparison.
- [ ] Integrate existing game packages and coordinate active game work.
- [ ] Verify the student journeys across supported screen sizes.

### Stage 4: Teaching and administration

- [ ] Define classroom, roster, assignment, report, and administration contracts.
- [ ] Test ownership, school isolation, and restricted actions.
- [ ] Migrate capabilities and recompose the related screens.
- [ ] Separate content forms, generation jobs, review, and publication.
- [ ] Verify teacher, administrator, and system journeys.

### Stage 5: Remaining surfaces and consolidation

- [ ] Migrate remaining authentication, profile, story, goal, and public surfaces.
- [ ] Consolidate shared controls, providers, hooks, and request handling.
- [ ] Remove unused local infrastructure and dependencies after consumer checks.
- [ ] Enforce the final package boundaries.
- [ ] Update generated documentation and the code graph.

### Stage 6: Final verification

- [ ] Run affected package checks and the required monorepo test gate.
- [ ] Verify all supported journeys in the browser.
- [ ] Verify localization, accessibility, mobile layouts, and error recovery.
- [ ] Review database compatibility and deployment procedures.
- [ ] Complete an independent review and resolve blocking findings.
- [ ] Record owner acceptance under the Measure workflow.

Every implementation stage follows contracts, failing tests, implementation, review, and verification.
Implementation uses bounded subagents under the primary agent's review.
Tests use a separate subagent when meaningful test design is required.

## Completion criteria

- Every inventoried surface has a verified final decision.
- App components and routes contain no business rules or direct provider access outside approved adapters.
- Backend capabilities validate contracts and enforce resource access.
- Shared UI controls replace equivalent local copies.
- Supported journeys preserve account access, learning outcomes, and stored progress.
- Tests cover permissions, cross-school access, completion retries, and failure recovery.
- Required checks pass, with any external blockers explicitly recorded.
- Removed code has no supported consumer.

## Review decision

The proposed scope includes backend migration and page architecture across all Reading Advantage roles.
The proposed default preserves supported workflows while allowing component and screen restructuring.
Material workflow changes require a concrete design for owner review.
This document is a proposal, not a completed audit or an implementation completion report.
