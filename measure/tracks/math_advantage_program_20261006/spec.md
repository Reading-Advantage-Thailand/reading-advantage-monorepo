# Specification: Math Advantage Program

**Track ID:** `math_advantage_program_20261006`
**Type:** feature (classic FR list)
**Status:** proposed — M9 cleared by Science D1 and D2 (approved 2026-10-06); M1 to M8 open (see `measure/subject-programs-open-decisions.md`). No code changes before approval.
**Pattern:** the second-subject pattern in `../science_advantage_relaunch_20261006/spec.md`. Science D1 (program of the shared platform) and D2 (one database) are approved.
**Capacity:** see `../../subject-programs-2027-capacity.md`. The scope is P3 and P4, one book each, with a stop rule on P3.

## 1. Review of what exists (2026-10-06, read-only)

**Repo `~/Desktop/ra-math-advantage`** (last commit `f19620f8`, 2026-10 housekeeping; last engineering commit 2026-07-13). It is an npm workspace with five apps and 20 packages under the `@math-platform` scope.

| Item | What it is | Verdict for primary Math |
|---|---|---|
| `apps/integrated-math-3`, `-2`, `-1`, `pre-calculus`, `bus-math-v2` | Convex-backed Next.js course apps for US high-school courses (Integrated Math 3 is the built one, with 833-line Convex schema; the others are scaffolds). Custom JWT auth. | **Do not reuse.** Secondary content, Convex backend, own auth. The strategy puts all programs on the monorepo platform. |
| `packages/math-content` | Algebra solvers (quadratic, polynomial, rational, systems), `problem-families/{im1,im2,im3,precalc}`, a generator registry with 6 keys (`quadratic-graph-analysis`, `average-rate-of-change`, `solve-quadratic-by-graphing`, `algebraic-step-solver`, `graphing-explorer`, `statistics`), alignment to Common Core codes (`HSA-SSE.B.3` style). | **Reuse the pattern, not the content.** Seeded generators with grading rules and a QA sweep are the right design for primary arithmetic. Not one generator covers grades 3 to 6. |
| `packages/knowledge-space-core`, `knowledge-space-practice`, `srs-engine`, `practice-core`, `activity-runtime` | The v2 engine. | **Already replaced.** The monorepo holds the canonical copies under `@reading-advantage/*` (v3.2; `packages/knowledge-space-core/README.md` lines 85 to 103 say the ra-math repo keeps only the retained v2 specification). `practice-core/src/generator-qa` in the monorepo is the ported generator harness. |
| `packages/graphing-core`, `activity-components`, `lesson-renderer`, `teacher-reporting-core`, `study-hub-core` | Canvas graphing, quiz and blank components, gradebook. | **Salvage selectively.** Number-line and bar-model components do not exist; graphing is secondary-level. The gradebook and competency heatmap ideas map to the Primary class grid. |
| `kst-srs.v2/SPECIFICATION.md` | The v2 spec. | Superseded by `mastery-advantage/SPECIFICATION.md` v3.2. |
| Other math repos on the desktop (`bus-math-v2`, `ka-math-companion`, last commit 2025-10-13) | Business math and a Khan Academy companion. | Not relevant. |

**Graph.** `~/Desktop/mastery-advantage/math/README.md` is a placeholder ("Status: Planning"). The graphs session (lane-h) owns only the English graph and will not build a Math graph. This track owns the Math objective set, its export, and its domain adapter.

**Product file.** `advantage-pr/03-products/math-advantage.md` v1.2 names grades 3 to 12 and "Thai national math curriculum + Common Core". The 2027 target is primary schools, so this track covers one primary grade first.

**Conclusion.** Math Advantage starts from zero content and zero app. Its advantage over Science is the engine: generated practice with immediate feedback is the one place where the Mastery Advantage runtime (`activity-runtime` practice.v1 envelope, `practice-core` generator gate, FSRS) gives a product no textbook has. Its cost is content in Thai: Thai schools teach math in Thai, so every instruction line is Thai text that Daniel checks.

## 2. Overview

Build Math Advantage as a program of the shared K-12 platform for P3 and P4, with a printed workbook of 14 lessons per grade, generated practice tagged to a Math knowledge graph, and Mastery Advantage in shadow mode at launch. The build reuses the program dimension, the lesson player shell, the engagement layer, and the deployment from the Science track.

## 3. Functional Requirements

### FR-1 Math knowledge graph and package
- `mastery-advantage/math/math-knowledge-space.json` with nodes for the Thai Basic Education Core Curriculum B.E. 2551 (rev. 2560) mathematics indicators of P3 and P4 (three strands: Number and Algebra; Measurement and Geometry; Statistics and Probability), skill nodes under each indicator, and bilingual math vocabulary nodes. Prerequisite edges within and across strands, defined by hand from the scope and sequence. Common Core codes as `aligned_to_standard` metadata.
- `packages/math-knowledge` with the domain adapter, built from the `primary-mastery` objective-key pattern (`packages/domain/src/primary-mastery/objective-key.ts`, `contracts.ts`, `backfill.ts`, `evidence-policy.ts`, `record-evidence.ts`).
- Validation gate: no cycles, no dangling edges, every skill has at least one generator or item family.

### FR-2 Math lesson shape (Q-WB-10a for Math)
- 12 printed steps (D3 in `decisions.md`), fixed once decided. The printed page has a fixed item count per practice step. The digital twin adds unlimited generated practice and a game around the printed steps; it removes or reorders nothing.

### FR-3 Content
- Two books of 14 lessons (P4 first, then P3), authored graph-first in the Workbooks repo under the Primary production rules (Claude makes every asset; bank first, then the print subset; pictures by meta/muse-image through OpenRouter in the picture-book style with race-unmarked prompts; audio by mmx with the standard Thai voices; game names in English).
- Every worked example, practice item, word problem, and vocabulary item carries node IDs. The Workbooks injector, extended for the math shape, writes the canonical store.

### FR-4 Generated practice
- Seeded generators per skill node in `packages/math-knowledge` (arithmetic, place value, fractions, measurement, simple geometry, data tables), parametrized by grade range so P3 and P4 share code, each with a grading rule and a worked solution, registered in the `practice-core` generator gate.
- Practice runs through `activity-runtime` with the practice.v1 envelope; `activity-react` renders the items. Evidence follows a `math-evidence.v1` policy as data on the Primary pattern (`evidence-policy.ts`) and a durable job `math.mastery.evidence`; no new evidence code.
- Number line, bar model, and place-value chart components are new; no graphing canvas.

### FR-5 Program in the platform
- `program = math` on books, lessons, licenses, and evidence provenance (from Science FR-1).
- Math lesson player: the 12 steps in the Primary player shell with the Chibi Quest skin (Science D12), Thai-first text with English math vocabulary.
- Teacher views: class grid per book and step; skill heatmap per class; intervention alerts per skill (ported from the Science interventions module).

### FR-6 Engagement
- Five Play Kit cartridges with math item lists (number match, sorting, ordering, quick-fire facts, estimation). Completions award reward pieces and count toward Class Quest.
- Math facts enter the FSRS flashcard flow.

### FR-7 Milestones
- Demo build on 2027-03-08 with one full lesson, generated practice for three skills, one game, and the teacher grid.
- Final print order for both books by 2027-04-02 (in hand by 2027-04-30). Stop rule: if P4 Book 1 is not fully authored by 2027-02-19, P3 Book 1 prints in the March break.

## 4. Non-Functional Requirements

Same as Science: tenant scoping, domain modules with Zod contracts and tests, additive migrations only, AI and storage through the adapters, no new hashing, no public dates, no change to shared packages before the cutover and the freeze lift.

## 5. Non-Goals

- Secondary math, the Integrated Math apps, and the Convex backend.
- Adaptive recommendation at launch.
- Reedy.

## 6. Acceptance Criteria

1. The Math graph passes the validation gate; every P3 and P4 skill has one generator or item family.
2. Two books of 14 lessons are in the canonical store with node IDs on every row; the injector rejects untagged rows.
3. A student runs a lesson through all 12 steps and gets generated practice with immediate feedback and a worked solution.
4. Each practice submission commits a mastery evidence record with the Math graph version.
5. Five cartridges run with math item lists and award reward pieces.
6. The demo checklist passes on 2027-03-08.
7. Type check, lint, and tests pass in CI.
