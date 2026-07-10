# Codecamp Mastery Learning Platform Program

> **Status:** Approved for planning; implementation not started
> **Created:** 2026-07-10
> **First production proof:** Codecamp Advantage
> **Normative engine specification:** `~/Desktop/mastery-advantage/SPECIFICATION.md` (`kst-srs.v3.2`)
> **Implementation source:** `~/Desktop/ra-math-advantage/packages/{knowledge-space-core,knowledge-space-practice,srs-engine,practice-core}` (v2 baseline)

## Outcome

Make Codecamp Advantage the first end-to-end proof that one shared Advantage learning
engine can select ready objectives, deliver tutorial-style gradual release, record
scaffold-aware evidence, schedule retrieval practice, and evaluate authentic student
work. The resulting packages must be reusable by Reading, Primary, Science, Math,
Chinese, Sales, and future LMS-style applications.

## Ratified decisions

1. The four domain-neutral engine packages are imported into this monorepo, migrated
   from their implemented v2 baseline to the normative v3.2 contract, and become the
   canonical runtime source. `mastery-advantage` remains the normative specification
   and graph authority; `ra-math-advantage` becomes a consumer after extraction.
2. Codecamp receives a real prerequisite graph rather than treating modules as skill
   nodes. Existing lessons, quizzes, tutorial steps, repository checks, and PR rubrics
   bind to objective IDs and practice variants.
3. A new game-creation unit teaches Phaser 4, Advantage Play Kit cartridges, stable
   educational I/O, React hosts, tests, accessibility, and delivery through an
   I Do -> We Do -> You Do sequence.
4. I Do uses tutorial video, diagrams, annotated code, prediction questions, and
   timestamped replay. We Do uses cloned tutorial repositories, step manifests,
   deterministic checks, fading hints, and targeted intervention. You Do culminates in
   independent repository work and an LLM-reviewed PR.
5. Build an internal React activity system with framework-neutral core contracts and
   Next/Vinext adapters. H5P, Edpuzzle, and PlayPosit are UX references, not runtime or
   evidence dependencies.
6. YouTube questions may pause or accompany playback but must not block ordinary player
   access. Hard answer-before-continuing gates are limited to self-hosted/licensed media.
7. The tutor uses OpenRouter `xiaomi/mimo-v2.5`. It returns structured intervention
   actions and selects curated resource IDs; it does not invent file locations or video
   timestamps and does not declare correctness.
8. PR review uses OpenRouter `~x-ai/grok-latest` behind an explicit task-level model
   policy. Every result records requested alias, resolved model, prompt, rubric, schema,
   and graph versions.
9. AI SDK structured output remains behind `@reading-advantage/ai`. The public adapter
   keeps `generateObject`; an eventual AI SDK 6 migration may implement it internally
   with `generateText` plus `Output.object` without changing consumers.
10. Watching, opening a diagram, asking for help, or replaying a segment is engagement
    and evidence context, not proof of mastery. Deterministic checks, checkpoint answers,
    and structured PR evidence establish correctness; hints/reveals/interventions modify
    confidence and rating according to v3.2.

## Shared architecture

```text
Domain graph + activity blueprints
              |
              v
   KST readiness / next-skill planner
              |
              v
 I Do video -> We Do tutorial repo -> You Do independent PR
      |                |                       |
 checkpoints      deterministic checks    tests + LLM rubric
      \____________________|___________________/
                           v
               practice.v1 evidence envelope
                           |
                  +--------+--------+
                  |                 |
             KST state          SRS cards
                  |                 |
                  +--------+--------+
                           v
            next activity / remediation
```

## Program tracks and dependencies

| Order | Track | Depends on | Proof delivered |
|---|---|---|---|
| 1 | `mastery_engine_v32_import_20260710` | Parent v3.2 spec, ra-math v2 packages | Shared, tested KST+SRS runtime and Drizzle adapters |
| 2A | `codecamp_knowledge_graph_apk_unit_20260710` | Track 1 contracts; APK track for game unit | Versioned Codecamp graph and graph-bound unit blueprint |
| 2B | `shared_video_tutorial_runtime_20260710` | Track 1 practice/evidence contracts; existing media track as input | Reusable I Do/We Do runtime and tutorial-repo protocol |
| 3A | `codecamp_intervention_tutor_20260710` | Tracks 1, 2A, 2B | Objective-aware, timestamp-aware intervention support |
| 3B | `codecamp_pr_mastery_evaluation_20260710` | Tracks 1 and 2A | Authentic You Do evidence feeding KST+SRS |

The active `advantage_play_kit_20260710` track is an external prerequisite for the
game-creation unit implementation, but graph authoring may begin before all APK
cartridges are complete. The partially completed
`codecamp_interactive_media_diagrams_20260709` track supplies initial media assets; it
does not own tracking, checkpoints, or evidence. The
`codecamp_measure_curriculum_unit_20260709` track supplies curriculum documents but
must not expand the old linear completion contract.

## Cross-track contracts

All tracks must converge on these versioned identifiers:

- `graphVersion`, `objectiveId`, `variantKey`
- `activityId`, `activityVersion`, `practiceMode`, `stepId`
- `submissionId`, `attemptNumber`, `evidenceConfidence`
- `misconceptionTags`, `hintsUsed`, `revealsUsed`, `interventionLevel`
- `modelAlias`, `resolvedModel`, `promptVersion`, `rubricVersion`, `schemaVersion`

Resource remediation uses curated references:

```ts
type ResourceRef =
  | { kind: "video_segment"; segmentId: string }
  | { kind: "diagram"; diagramId: string }
  | { kind: "lesson_section"; sectionId: string }
  | { kind: "repository_location"; filePath: string; symbol: string | null };
```

The model returns a resource ID. Trusted activity data resolves labels, paths, and
timestamps. This prevents hallucinated citations and lets the UI record whether the
student used the remediation.

## Rollout gates

### Gate 0: Baseline and governance

- Freeze v2 source provenance and v3.2 acceptance examples.
- Decide package ownership/versioning and cross-repo consumption.
- Freeze shared identifiers and evidence envelope before app schema work.

### Gate 1: Engine correctness

- Imported packages pass original tests unchanged.
- v3, v3.1, and v3.2 correctness examples pass.
- Drizzle adapters pass tenant, idempotency, transaction, and replay tests.
- No app-specific table or framework import enters engine packages.

### Gate 2: One complete Codecamp vertical slice

- One existing objective sequence has graph nodes and prerequisites.
- One I Do video has checkpoints and timestamped remediation.
- One We Do tutorial repository reports deterministic step evidence.
- The targeted tutor escalates help and records scaffold usage.
- One You Do PR emits structured objective evidence and schedules follow-up review.

### Gate 3: Game-creation proof

- APK objectives and prerequisites are approved.
- Students complete a worked cartridge, a guided tutorial cartridge, and an
  independent game PR using distinct variants.
- Teacher and student projections explain readiness, support used, demonstrated
  evidence, and scheduled review.

### Gate 4: Shared-platform proof

- At least one second Advantage app consumes the engine and activity contracts without
  copying Codecamp-specific code.
- Efficacy reporting can compare time-to-mastery, retention, and transfer without
  app-specific event translation.

## Program-level acceptance criteria

- Codecamp progression is objective/readiness driven rather than click-completion driven.
- The complete I Do -> We Do -> You Do chain emits one coherent evidence history.
- Scaffold usage affects confidence without punishing help-seeking or fabricating failure.
- One approved PR never creates permanent mastery by itself.
- Model or provider failure never mutates mastery and is retried/dead-lettered visibly.
- Shared packages remain React/Next/Drizzle/provider neutral at their documented layers.
- All public contracts are Zod validated, versioned, tested, and documented.

## Explicitly out of scope

- Migrating every Advantage app in this program.
- Rewriting all 19 Codecamp modules before the vertical slice is validated.
- Treating video watch percentage as mastery.
- Allowing an LLM to execute untrusted student code or inspect local secrets.
- Blocking GitHub merge based solely on LLM judgment.
- Building a general-purpose H5P-compatible authoring platform.
