# Mastery Advantage — Workbook Series Plan (Objective-First Content)

> **Status:** Scoping / planning — companion to the integration plan
> **Date:** 2026-05-22
> **Scope:** Using the GSE knowledge space to design the Reading Advantage workbook
> series intentionally — articles, vocabulary, and questions authored *for* GSE
> coverage rather than curated after the fact
> **Companion document:** [`mastery-advantage-integration-plan.md`](./mastery-advantage-integration-plan.md)
> (referred to below as **the integration plan**)

## 1. Purpose and relationship to the integration plan

The integration plan covers the **live Reading Advantage app**: an *article-first*
model (Phase 1) where the engine picks questions for whatever article a student is
reading, and a deferred *objective-first* model (Phase 2, plan §6) where articles are
generated from clusters of GSE objectives.

This document covers the **workbook series**, and it makes one central claim:

> **The workbook is where objective-first content should be built first.** It refines
> and effectively supersedes Phase 2 of the integration plan (plan §6) — Phase 2
> should be done *workbook-first*, not live-first.

The two efforts are not parallel tracks producing separate content. They are two
**projections of one knowledge space**, and they feed each other. Section 6 details
the interaction; it is the core of this document.

## 2. Current state — the workbook process

Today a workbook is **post-hoc curation**: take the 14 best-performing articles from
a given RA level, bind them with apparatus into an ~300-page workbook, used in class
with a teacher (blended learning). The workbook is a *byproduct* of the app's article
corpus. Quality control is "pick the best 14." GSE coverage is incidental.

## 3. Thesis — three reframes

1. **The workbook is the natural pilot for objective-first generation.** Print removes
   every reason objective-first was parked as risky (see §4).
2. **The workbook is a projection of the knowledge space, not a content silo.** It is
   generated *from* the same graph and content corpus the app uses — same article
   records, same `assessment_items`, same two domains (`english.gse`, `english.vocab`).
3. **The workbook is the shared instructional spine; the app is per-student
   adaptivity.** This resolves a real tension in KST (see §5.4).

## 4. Why print is the low-risk venue for objective-first generation

The integration plan deferred objective-first generation (plan §6) because, done live,
it is hard: LLM generation is non-deterministic, latency-bound, and ships unreviewed
content (the plan's draft / discounted-evidence middle ground, plan §4.4). A workbook
removes all three problems:

- **Static.** A workbook is generated once. No determinism-vs-LLM tension, no latency,
  no "generate on the spot." The cache-as-determinism-layer reconciliation (plan §4.3)
  is not even needed.
- **Fully reviewed before it ships.** A workbook gets full editorial review by
  definition. There is no need to serve unreviewed `draft` content or discount its
  evidence — workbook content is `reviewStatus: approved` from day one.
- **Bounded.** One RA level = one CEFR third = one defined GSE sub-band. That is
  exactly the "cluster of GSE skills" objective-first generation operates on — a
  tractable, finite unit.

So objective-first generation should be **built and proven in the workbook pipeline
first**, then turned on live in the app once the pipeline is trusted. The workbook
de-risks Phase 2 rather than waiting on it.

## 5. The workbook as a projection of the knowledge space

The spec's projection system (SPECIFICATION.md §9) turns the graph into role-specific
artifacts — student visualization, SRS queue, teacher evidence. **A workbook is
another projection target.** Treat it as one.

### 5.1 Projection inputs

- The `english.gse` knowledge graph (objectives, prerequisite/supports edges).
- The `english.vocab` graph (Cambridge YLE / English for Schools wordlists — see
  integration plan §5).
- The existing article + `assessment_items` corpus.
- The RA-level → CEFR → GSE range mapping (integration plan §4.1).

### 5.2 The workbook blueprint (coverage matrix)

Where the integration plan's WS-D defines blueprints at the *node* grain, a workbook
needs a blueprint at the *collection* grain — a coverage matrix. For RA Level X:

| Dimension | Rule |
|-----------|------|
| GSE band | `[lo, hi]` derived from RA Level X → CEFR → GSE |
| Target objectives | the GSE reading objectives in band, weighted by priority (`essential` / `supporting` / `extension`) |
| Coverage depth | each `essential` objective assessed ≥ N times across the 14 articles (deliberate repeated exposure) |
| Vocabulary | drawn from the Cambridge band matching that CEFR level; M target words, pre-taught and recycled across articles |
| Question mix | MCQ / short / long per article, each tagged to a GSE descriptor |
| Strand coverage | reading (primary) + listening / speaking / writing extension activities tagged to GSE descriptors in those strands (see §5.3) |
| Article sequence | topologically ordered by `prerequisite_for` edges (see §5.4) |

### 5.3 The workbook carries all four GSE strands

The app (Reading Advantage) is reading-primary; the integration plan scopes it to
reading objectives and treats listening / speaking / writing as graph-structure-only
(plan open question #6). The **workbook is where the non-reading strands get
exercised** — it has the apparatus and the teacher that the app lacks: discussion
activities (speaking), writing extensions, listening tasks. The workbook is the
venue that makes the full four-skill GSE graph productive.

### 5.4 Sequencing — the workbook is a linearization of a path through the graph

Pure KST gives every student a unique path; a *classroom* needs a shared path the
teacher can teach to. The workbook **is** that shared path — a deliberate
linearization of one traversal of the graph's sub-band, the 14 articles ordered so
that prerequisite objectives are established before the articles that depend on them.

This resolves the KST collective-vs-individual tension: the **workbook provides the
shared instructional spine** the whole class moves through together, while the **app
provides the per-student divergence** — individual review schedules, remediation,
acceleration. Blended learning gets classroom coherence *and* individual adaptivity
because it has two artifacts, one for each.

## 6. How the two efforts interact (the core section)

The workbook and the app are not separate content programs. Six concrete couplings:

### 6.1 Shared substrate

Both project from one knowledge space. A workbook article is the *same* article
record the app uses; a workbook question is the *same* `assessment_items` row
(integration plan §4.5), carrying the same `objectiveId` / `variantKey`. Consequences:

- An item answered in the workbook and the same item in the app are the same object.
  The engine's item-exposure tracking (`replayPolicy`, "don't re-serve a seen item")
  **must span print and digital** — if a student did question Q on paper, the app
  must not re-serve Q as a fresh assessment.
- There is one content corpus, version-tracked, not a print silo that drifts from
  the app.

### 6.2 Content flow: workbook → app (the quality upgrade)

App Phase-1 content is generated live and enters as `draft` with discounted evidence
(integration plan §4.4). Workbook content is editorially reviewed before print, so it
enters the shared corpus as **`reviewStatus: approved`, full-confidence**. The
workbook is therefore a *high-quality content source for the app* — every workbook
shipped upgrades the app corpus. The editorial review also human-confirms each
question's objective tag, which means:

- The workbook process produces high-confidence `(article, objective)` bindings —
  the same **article-capability map** the app builds slowly and low-confidence from
  generator refusals (integration plan §4.3). The workbook builds it deliberately
  and fast. The two converge on one map.

### 6.3 Content flow: app → workbook (empirical curation)

The app feeds the workbook back:

- The accreting article-capability map tells the workbook pipeline which existing
  articles afford which objectives — the candidate pool for selection.
- App usage and performance data (engagement, item difficulty, learning gains)
  tells the workbook pipeline which articles actually *work* — the empirical signal
  behind today's "14 best." Intentional GSE design **plus** empirical curation, not
  one instead of the other.

### 6.4 Shared pipeline

The objective-first generation pipeline — "given a cluster of GSE objectives, produce
articles + vocabulary + questions that cover them" — is **built once, for the
workbook**, then turned on live in the app as integration plan Phase 2. The
generator-as-compatibility-judge (plan §4.3) is reused: when the workbook pipeline
assembles or generates a candidate article, the same judge verifies it affords the
target objectives. Build it in the low-risk print venue; deploy it live later.

### 6.5 One knowledge state — workbook as instruction-and-card-creation, app as assessment-and-review

A student using the workbook in class and the app at home must have **one knowledge
state**. The clean model — which avoids paper-grading / OCR rabbit holes — is a
**division of evidence roles**:

- The **workbook is an instruction and card-creation event.** Completing a workbook
  unit tells the engine "objectives `{set}` were instructed for this class / student"
  → the engine **creates the SRS cards** and moves those objectives from
  `untouched` → `inProgress`. The fidelity bar is low: a coarse, even class-level,
  "we covered unit N" signal from the teacher is enough to seed cards.
- The **app is the assessment and review system.** Once cards exist, the app's SRS
  schedules and delivers the spaced reviews that produce fine-grained evidence and
  drive mastery (plan §4).

This means the workbook does **not** need fine-grained per-question paper grading to
keep the knowledge state coherent — it needs only to tell the engine instruction
happened. Vocabulary recycling in print (a word pre-taught in unit 2, recycled in
units 5 and 9 — spaced exposure on paper) folds into the same coarse signal: unit
completion applies a light stability bump to the exposed vocab cards.

**Decision needed** — how rich the workbook→engine signal should be, given classroom
connectivity:
- *Floor:* teacher marks unit N complete for a class → cards seeded. Low-tech.
- *Better:* a "digital twin" — students answer some workbook questions in the app
  (read on paper, answer digitally); shared `assessment_items` feed the engine
  directly.
- *Avoid:* bubble-sheet OCR / paper answer capture — high effort, low payoff given
  the division of roles above.

### 6.6 Blended division of labor maps onto the two halves of the engine

Teacher + workbook handle **instruction / new learning** — the KST "what to learn
next" half. The app handles **spaced review** — the SRS half. The two halves of the
engine (SPECIFICATION.md: KST decides *what*, SRS decides *when to review*) map
exactly onto the two halves of blended learning. Placement (integration plan WS-G):
in blended mode the teacher does much of the cold-start diagnostic, so the formal
adaptive-tree-walk placement is needed mainly for app-only / self-study students.

### 6.7 Shared mappings

Both efforts use the same RA-level → CEFR → GSE range correlation (integration plan
§4.1) and the same Cambridge → CEFR vocabulary bands (plan §5). The workbook is
organized by RA level, so that one mapping defines both the workbook's GSE band and
the app's per-student range. CEFR is the shared anchor throughout.

### 6.8 Workstream interactions

Relative to the integration plan's workstreams (plan §7):

| Plan WS | Interaction with the workbook effort |
|---------|--------------------------------------|
| WS-C (GSE graph hardening) | **Pulled forward.** Intentional coverage is impossible while the graph is `draft`, `difficulty` is unpopulated, and prerequisite edges are uncalibrated. The workbook needs WS-C first. |
| WS-D (practice-model design) | **Shared.** The node-grain blueprint and the workbook coverage matrix (§5.2) must be designed together. |
| WS-E (content binding) | **Shared corpus.** Workbook content lands in the same `assessment_items` / article records. |
| WS-B, WS-F, WS-H (SRS runtime, app UI, migration) | **Not needed for the print artifact.** Needed only for the workbook→engine signal (§6.5) — card creation reuses WS-B. |
| WS-V (vocabulary domain) | **Shared.** The workbook's vocabulary sections project from the same `english.vocab` graph. |
| **WS-W (new — workbook projection)** | The workbook coverage matrix, the objective-first generation pipeline, the print projection, and the workbook→engine signal. |

## 7. Build pipeline for one workbook

1. **Resolve the band.** RA Level X → CEFR → GSE sub-band; pull the target objective
   set from the (hardened, WS-C) graph, weighted by priority.
2. **Author the coverage matrix** (§5.2) — objectives × required exposures,
   vocabulary list, question mix, strand coverage.
3. **Select candidate articles** from the existing corpus using the article-capability
   map + app performance data (§6.3).
4. **Identify coverage gaps** — objectives the candidate set under-covers.
5. **Generate to fill gaps** — objective-first article generation for the gap
   clusters; the compatibility judge verifies coverage.
6. **Sequence** the 14 articles by prerequisite order (§5.4).
7. **Generate apparatus** — vocabulary pre-teaching / recycling, questions
   (`assessment_items`, tagged), strand extension activities.
8. **Editorial review** — the whole workbook; on approval, content enters the shared
   corpus as `approved` (§6.2).
9. **Render the print projection** — ~300-page layout.
10. **Register the workbook→engine signal** — map workbook units to objective sets
    so unit completion seeds cards (§6.5).

## 8. Risks and cautions

- **Coverage-checklisting must not degrade the writing.** Articles must be engaging,
  coherent texts first and GSE-mapped second — coverage is a constraint *verified*
  against good articles, never a template that contorts them. Same discipline as the
  app's compatibility judge (integration plan §4.3).
- **Print is unpatchable.** A printed workbook cannot be hot-fixed. Pilot the full
  pipeline on **one workbook** before committing a series to print.
- **The workbook→engine signal is the integration risk.** Without §6.5 resolved, the
  workbook and app drift into two knowledge states. Settle the signal model early.
- **Two awarding bodies.** GSE (Pearson) and Cambridge wordlists reconcile only at
  CEFR (integration plan §5). The workbook's reading band and vocabulary band are
  both CEFR-pegged, not directly cross-referenced — name this so nobody expects a
  tighter mapping than exists.

## 9. Open questions

1. **Workbook→engine signal fidelity** (§6.5) — floor (teacher class-level), digital
   twin, or hybrid? Depends on classroom connectivity. Blocks WS-W design.
2. **Workbook scope** — Reading Advantage levels only first, or RA + Primary
   Advantage workbooks together? (Primary uses the Young Learner GSE + YLE wordlists.)
3. **Coverage depth `N`** — how many times should an `essential` objective be
   assessed across one workbook? Ties to the §13 proficiency thresholds.
4. **Non-reading strands** — how far to take listening / speaking / writing apparatus
   in the workbook, given those objectives are not assessed by the app.
5. **Existing workbooks** — retro-map the current workbook series to GSE coverage
   (to find gaps), or only design forward?

## 10. Next steps

1. **Resolve open question #1** (the workbook→engine signal) — it gates WS-W design
   and the single-knowledge-state guarantee.
2. **Sequence WS-C (GSE graph hardening) early** — both the workbook and the app
   depend on it; the workbook cannot start without it.
3. **Co-design WS-D** — node-grain blueprint and the workbook coverage matrix
   together (§6.8).
4. **Pilot one workbook end-to-end** — one RA level, the full §7 pipeline — before
   any series goes to print. This pilot doubles as the proof of the objective-first
   pipeline that integration plan Phase 2 will later deploy live.
5. **Revise integration plan §6** — Phase 2 should reference this document and be
   reframed as "objective-first, workbook-first."
6. Decompose into a Measure track (WS-W) and register in `tracks.md`.
