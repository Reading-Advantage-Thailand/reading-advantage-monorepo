# Mastery Advantage Engine — Reading Advantage Integration Plan

> **Status:** Scoping / planning — not yet decomposed into Measure tracks
> **Date:** 2026-05-22
> **Scope:** Porting the Mastery Advantage (MA) KST+SRS engine into `reading-advantage-monorepo`, starting with the Reading Advantage app
> **Source spec:** `~/Desktop/mastery-advantage/SPECIFICATION.md` (`kst-srs.v2`)

## 1. Strategic context

Mastery Advantage is a marketing-led push to make one adaptive KST+SRS engine the
foundation for the whole Advantage suite. The legacy apps — **Reading Advantage and
Primary Advantage first** — are being retooled to run on it as their primary practice
engine. More apps follow.

**CEFR is the universal anchor.** Everything reconciles at CEFR:

- Reading Advantage ships **18 levels, 3 per CEFR band**.
- GSE (Pearson Global Scale of English) is a CEFR extension — the comprehension skill graph.
- Cambridge YLE / English for Schools wordlists (vocabulary source) are CEFR-aligned.

No framework maps directly to another; they all map to CEFR. Design accordingly.

## 2. Current state

**Reading Advantage today:** students do activities → earn XP → progress along 18
CEFR-correlated levels. A student's entire knowledge state is one string
(`users.cefrLevel`, e.g. `"A1-"`). Practice content is leveled articles +
comprehension questions (`multiple_choice_questions`, `short_answer_questions`) +
a legacy flashcard system (`flashcard_*`, `userWordRecords`, `userSentenceRecords`)
that tracks only correct/incorrect counters. **None of it is tagged to GSE objectives.**

**The MA engine** lives in `~/Desktop/ra-math-advantage` as four framework-agnostic
packages — `knowledge-space-core`, `knowledge-space-practice`, `srs-engine`,
`practice-core` (~8,500 src LOC, dependencies only `zod` + `ts-fsrs`). They implement
spec **v1**; the v2 delta is planned in that repo (8-track program) but unbuilt. The
packages have zero React/Next/Convex/Drizzle coupling and lift into this monorepo's
pnpm workspace nearly as-is.

**The GSE graph already exists:** `mastery-advantage/english/gse-knowledge-space.json`,
2,172 nodes (2,083 skills) / 28,489 edges, schema-valid — but `draft` status,
`difficulty` unpopulated, prerequisite edges heuristic/uncalibrated, and **zero
blueprints, generators, or worked examples**. It is a skill taxonomy, not yet
practice-ready content.

## 3. Architecture decisions (ratified this session)

1. **One engine, multi-domain.** The spec data model is multi-domain natively
   (`domain` field per node, cross-domain `transfers_to`). Run a single engine
   instance over both knowledge domains below — one card store, one merged SRS
   queue, one unified student knowledge state. Do **not** stand up separate engines.

2. **Two knowledge domains:**
   - `english.gse` — reading comprehension. A real KST+SRS prerequisite graph.
   - `english.vocab` — vocabulary. A **parallel domain**, SRS-primary / KST-light
     (see §5).

3. **Article-first integration** for phase 1 (see §4). Precise outer-fringe-targeted
   progression is deferred to phase 2 (objective-first article generation).

4. **Migration produces two distinct artifacts, not one** (see §4.1).

## 4. Phase 1 — Reading Advantage comprehension integration

The smallest viable integration: the MA engine drives **which questions** a student
gets, the article stays the delivery vehicle.

### 4.1 Student migration (two artifacts)

- **Artifact 1 — GSE range (do first, trivial):** derive `gseRangeLow/High` per
  student from current RA level → CEFR → GSE range. Backend-only shadow field, for
  correlation/reporting. Not user-facing yet.
- **Artifact 2 — seeded knowledge state (the engine cold-start):** the range only
  says *where the outer fringe starts*. Seed below-range objectives as `inProgress`
  with `confidence: low` — **never as `mastered`**. A seeded-`mastered` objective
  gets no SRS card, is never verified, and a wrong guess becomes permanent. The
  student earns `mastered` through real evidence.

### 4.2 Per-article question selection

When a student opens article A:

```
onArticleOpen(student, articleA):
  state   = getKnowledgeState(student, now)
  due     = SRS due-set for student                         // review demand
  fringe  = nextSkillPlanner(getOuterFringe(state)).topN    // new-learning demand
  budget  = 5–8 items (split across reading objectives + vocab, see §5)

  reviewTargets = due ∩ objectivesKnownAssessableOn(A)
  newTargets    = fringe objectives, attempted speculatively on A
  for each target without a cached question:
      q = generateQuestion(objective, A, variant)   // background; see §4.3
      persist q (reviewStatus: draft)
  return mixed, capped queue (reviews prioritized, 1–2 new)
```

**Article-first means the split behaves differently per job:**
- *Review (SRS due)* works well — most GSE reading skills (main idea, inference,
  vocab-in-context) are general enough for almost any article.
- *New learning (outer fringe)* is **opportunistic** — the engine can only pick
  fringe objectives the article actually supports. This is accepted for phase 1.

### 4.3 Select-or-generate-and-cache

If a question for `(objectiveId, articleId, variantKey)` does not exist, the engine
LLM-generates it in the background, persists it, and reuses it thereafter.

- **The cache is the determinism layer.** This reconciles live LLM generation with
  the spec's `DeterministicGenerator` contract: every call after the first returns
  the stored, immutable item.
- **Background warming:** generate when the article is opened/assigned, so items are
  ready before the student finishes reading. (Confirmed with lead programmer.)
- **The generator doubles as the article↔objective compatibility judge.** The prompt
  is "generate an item for objective O grounded in this passage; refuse if the
  passage does not support O." A refusal tags `(A, O)` unsupported. **These tags
  accrete an article-capability map for free** — and that map is the input phase 2
  (objective-first generation) and a future "best articles for what you're Ready to
  Learn" suggestion engine need.

### 4.4 Question validation — the middle ground

Full human validation is impossible at the data volumes needed, and students must
progress before validation exists. Therefore:

- Generated questions land `reviewStatus: 'draft'`, are **served immediately**, but
  their **evidence is discounted** (lower `confidence`) until human-reviewed.
- They flow into a content-review queue (reuse the spec's `reviewStatus` machinery).
- Anomalous response stats (everyone misses / everyone aces a draft item)
  auto-quarantine it.

### 4.5 Schema change — unified `assessment_items`

Replace the three near-identical question tables (MCQ / short / long — "long" is new)
with **one `assessment_items` table**: a `type` discriminator + `jsonb payload`,
plus `objectiveId`, `variantKey`, `reviewStatus`, `generatedBy`. This is the real
phase-1 binding work — and note it is **question-level** tagging, much lighter than
article-level tagging. `studentAnswers` already uses this polymorphic pattern.

### 4.6 Retro-tag the existing corpus

One LLM batch job classifies each existing question ("which GSE reading descriptor
does this assess?") so the cache is not empty on day one and the phase-2 dataset is
front-loaded.

## 5. Phase 1 (parallel) — Vocabulary domain

GSE is a can-do *descriptor* framework; individual words are not GSE nodes. So
vocabulary is a separate domain — but **parallel domain, shared engine** (§3.1).

- **Source:** Cambridge YLE (Starters/Movers/Flyers) + Cambridge English for Schools
  wordlists. CEFR-aligned, finite, curated. A script converts each wordlist entry to
  a node.
- **Shape: SRS-primary, KST-light.** Vocabulary has no real prerequisite DAG. The
  graph is shallow: `domain → CEFR/level-band content_groups (contains) → word nodes`,
  with almost no `prerequisite_for` (a few morphological-family edges at most).
  "Readiness" for a word collapses to **level-band gating**, not the §2.5 weighted
  formula. Let it be SRS; do not over-build a prerequisite graph that is not there.
- **Node unit:** lemma + part of speech (split senses only where polysemy is
  pedagogically real).
- **Coupling to reading:** articles are the shared substrate. Vocab level-bands
  `supports` reading objectives at the matching CEFR level; the reading engine's
  article selection drives vocab exposure; vocab cards can be **auto-seeded from
  article text** (lemmatize the article, match the wordlist) instead of relying on
  manual saves. The per-article item budget (§4.2) splits across reading + vocab.

### 5.1 What happens to the legacy flashcard system

**Swap the data model, keep the surface.** The flashcard UI becomes the vocab-SRS
review channel and the fallback review surface for due cards with no near-term article.

- Free-text `flashcard_cards` decks → wordlist-node-backed FSRS cards.
- Student "saving" survives with new meaning: saving an on-list word = a priority
  boost; saving an off-list word = a personal card **outside** the knowledge space
  (reviewed, but not part of leveled progression).
- Migration: lemmatize `userWordRecords` / `flashcard_cards`, match to Cambridge
  nodes, seed FSRS stability from existing correct/incorrect counts. Off-list →
  personal deck.

## 6. Phase 2 (deferred) — objective-first article generation

Once the article-capability map (§4.3) has accumulated, generate articles from
clusters of a student's Ready-to-Learn + due GSE objectives — flipping article-first
to objective-first and enabling precise fringe-targeted progression. Out of scope now.

## 7. Workstreams

From the port scope; D and E are the near-term focus.

| WS | Work | Size | Depends on |
|----|------|------|-----------|
| A | Engine import: lift 4 packages into the workspace, neutral scope rename, shared-package governance | S–M | v1/v2 fork |
| B | Storage layer: Drizzle tables (SRS cards, review log, knowledge state/proficiency, placement, edge calibration); `CardStore`/`ReviewLogStore` adapters; tRPC procedures | M | A |
| C | GSE graph hardening: `draft`→`approved`, populate `difficulty`, review heuristic `prerequisite_for` edges | M–L | — |
| **D** | **Reading practice-model design:** blueprint shape, generator-as-selector, practice-variant semantics, `english.gse` adapter, `assessment_items` schema | **L** | spec + A |
| **E** | **Content binding:** `assessment_items` migration, retro-tag existing corpus, select-or-generate-and-cache pipeline, background warming | **XL** | C, D |
| F | App integration: projections into Reading Advantage; knowledge-map UI; flashcard UI retooled as vocab-SRS surface | L | B, E |
| G | Placement: GSE adaptive tree-walk chatbot (spec §11.3) | M | A |
| H | Production migration: legacy progress → FSRS cards + knowledge state; `level` column → projection | M–L, risk-heavy | F |
| V | Vocabulary domain: build `english.vocab` graph from Cambridge lists, vocab generators, flashcard data migration | M–L | A, B |

## 8. Open questions — resolve before the WS-D spec

1. **Sentence-saving (UNRESOLVED).** "Saved sentences" don't fit a vocabulary space.
   Options: (a) reframe as context-example attachments on vocab cards; (b) map to a
   GSE *grammar* strand; (c) drop. Need the original intent of the feature.
2. **v1-now vs v2-after-math.** Porting v1 now means doing the v2 delta twice.
   Recommendation: wait for the math v2 program to stabilize the contract unless
   reading is urgent.
3. **Practice variant = question type?** MCQ / short / long as three variants
   satisfies the §13 `essential` objective threshold (`minVariants: 3`) and gives
   real triangulation — but §13.2 averages retention across variants, so noisy
   short/long grades drag a clean MCQ score. Leaning: type-as-variant, with
   short/long evidence weight-discounted.
4. **Shared-package governance.** One engine consumed by two monorepos
   (`ra-math-advantage` + here) needs a publish/version story, or the v1/v2 drift
   problem recurs. S-sized to decide, XL to retrofit — settle before any code.
5. **First-encounter scaffolding.** Does a brand-new fringe objective get a cold
   question, or a light strategy/hint scaffold (guided vs. independent practice)?
6. **Assessable-objective filter.** Scope the RA engine to *reading* objectives;
   listening/speaking/writing stay as graph structure, assessed by other apps later.
7. **Speculative-generation aggressiveness:** test fringe objectives on every
   article, or only when accumulated tags already suggest support?
8. **Scope: Reading Advantage only first, or RA + Primary together?**

## 9. Recommended next steps

1. **Resolve the §8 open questions** — at minimum #1 (sentences), #2 (v1/v2), and
   #4 (shared-package governance), which gate everything else.
2. **Settle shared-package governance** and decide the v1/v2 sequencing.
3. **Write the WS-D spec** — the reading practice-model design. It gates WS-E (the
   mountain) and the vocabulary domain.
4. **Build a thin vertical slice first** — one CEFR band, Reading Advantage only,
   the full pipeline end-to-end (mirrors how `ra-math-advantage` proved its pipeline
   on the "IM3 Module 1 pilot" before rollout). Prove the generator/blueprint model
   on ~30 objectives before committing to mass content binding.
5. Once the slice is validated, decompose §7 into Measure tracks and register them
   in `tracks.md`.
