# Sales Advantage shared Mastery consumer

## Objective

Make Sales Advantage a first-class consumer of the shared Mastery Advantage
KST/SRS runtime while preserving its existing purpose: a course that teaches
employees and distributor representatives how to sell the company's products.
Sales Advantage remains a learning application and must not become a CRM.

## Current baseline

Sales Advantage already has a reviewed deterministic curriculum, sequential
theory, roleplay, and quiz experiences, Company Identity SSO, deployment
artifacts, and a live Cloud Run service. The reviewed graph contains 6 modules,
27 lessons, 8 rubrics, 8 roleplay scenarios, and 14 quiz questions. The current
application records linear progress but does not consume the shared Mastery
Advantage KST/SRS packages or persist graph-linked mastery evidence.

The existing `sales_advantage_golive_20260701` track continues to own deployed
service QA and release closeout. This track owns only the new shared-mastery
consumer capability and the production verification required by that change.

## Product boundary

Sales Advantage owns:

- immutable bindings from the approved Sales curriculum to stable objectives,
  activity variants, rubrics, and graph-release provenance;
- validated learning evidence from quizzes and approved-rubric roleplays;
- learner knowledge-state, spaced-review, due-review, and recommended-practice
  projections through the shared runtime;
- Sales-specific learner and administrator views of that evidence; and
- replay-safe projection and audit evidence for every mastery mutation.

Sales Advantage does not own leads, customers, contacts, school sites,
subscriptions, licenses, provisioning, invoices, revenue attribution, or
commissions. Those remain Company Operations, CRM, licensing, Tutor, or Finance
Operations responsibilities.

## Evidence authority

- Theory completion is course progress, not mastery evidence.
- Chat is tutoring support and can never create mastery evidence.
- Quiz attempts may emit validated `practice.v1` evidence for their bound
  objectives, including incorrect evidence needed for misconception and review
  planning.
- Roleplay evaluation may emit mastery evidence only when the scenario,
  objective, rubric version, evaluation contract, evaluator provenance, and
  immutable attempt are all release-bound and validated.
- A single pass or approval never establishes permanent mastery. Knowledge state
  and spaced review remain outputs of the shared KST/SRS engine.
- Every projection is durable, idempotent, replay-safe, and append-only; failed
  delivery must be retryable without duplicating evidence.

## Tenant and identity boundary

Sales company users do not carry a product-school identifier. The integration
must therefore create a durable, fail-closed mapping from the verified Company
Identity tuple `(applicationKey=sales, organizationId, organizationKey)` to one
dedicated Mastery tenant namespace. It must not reuse Codecamp's reserved
namespace, derive a school from frontend input, or share knowledge state across
organizations.

The mapping and every mastery command must preserve the authenticated company
organization, Sales-local learner principal, source application, graph release,
and idempotency identity. Cross-organization reads, writes, replay, and evidence
reuse must be rejected and tested.

## Shared-runtime constraints

- Consume the existing `knowledge-space-core`, `knowledge-space-practice`,
  Mastery persistence, activity evidence, and runtime-compat contracts; do not
  fork or recreate the engine.
- Add Sales as an explicitly admitted runtime consumer with an exact descriptor
  and package set only after its own reviewed graph release exists. A descriptor
  must never reuse the synthetic Codecamp graph merely to pass admission.
- Validate a versioned Sales knowledge graph and immutable curriculum bindings
  rather than inferring objectives from lesson prose at runtime.
- Keep provider, database, transport, storage, and AI details behind the
  repository's existing internal adapters.
- Use PostgreSQL/Drizzle migrations for durable schema changes and apply them
  before dependent application code.

## Security and operations requirements

- Company Identity authorization and organization scope are required for every
  learner and administrator operation.
- Curriculum approval is release-owner controlled and immutably audited; a
  generic Sales administrator must not silently mutate globally shared
  curriculum or graph bindings.
- Roleplay audio remains private and is accessed only through authorized signed
  reads. Failed attempts must not orphan evidence or storage objects.
- Rate limits that protect AI or mutation boundaries must be durable across
  Cloud Run instances.
- Audit records must bind actor, organization, learner, operation, source
  attempt, graph/rubric versions, request/correlation identity, outcome, and
  projection receipt without retaining secrets or raw audio.

## Acceptance criteria

- Sales passes the shared runtime consumer checker and packed-consumer test.
- Every approved curriculum activity used for mastery has a stable,
  release-verified objective/variant/rubric binding.
- A verified company organization maps to one isolated Mastery tenant and an
  ordinary caller cannot select or cross that mapping.
- Quiz and eligible roleplay attempts project once into shared KST/SRS; replay
  returns the original receipt and conflicting payloads fail closed.
- Theory completion and chat cannot mutate mastery.
- Learners can see due review and recommended practice derived from the shared
  engine; administrators can inspect organization-scoped learning evidence
  without cross-organization leakage.
- Automated tests cover authorization, malformed evidence, graph/rubric drift,
  idempotency, retry, concurrency, and cross-organization counterexamples.
- Authenticated production QA covers Accounts provisioning/SSO, the complete
  course loop, mastery/SRS updates, audio privacy, i18n, and durable rate limits.

## Non-goals

- No CRM, customer, licensing, invoicing, payroll, revenue, or commission
  behavior.
- No rewrite of the approved Sales curriculum merely to add mastery metadata.
- No new KST/SRS engine, provider-specific shortcut, or Codecamp-specific
  namespace reuse.
- No APK work and no changes to the separate APK worktree.
- No claim that the existing production deployment is fully accepted until the
  authenticated browser and operational gates pass.
