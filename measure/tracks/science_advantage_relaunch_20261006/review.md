# Science Advantage Review (2026-10-06)

**Track:** `science_advantage_relaunch_20261006`
**Scope:** `apps/science-advantage` at commit `0b93daeb2` (branch `apk3d-port`), compared with `apps/primary-advantage` on `primary-parity-integration` (head `9951ee1f8`), `apps/codecamp-advantage`, and the shared packages.
**Method:** read-only review of code, seed data, logs, and git history. No code changed. The machine was under load (462 MB free, load average 9 to 13), so the type check and the test suite were not re-run. The health section uses the logs from the last work day (2026-09-08).
**Strategy source:** `advantage-pr/08-strategy/product-strategy-2026-2027.md` v1.4, sections 1, 3.3, 4, and 8. Open question Q-WB-10.

## 1. Verdict table

| Area | Verdict | One-line reason |
|---|---|---|
| App shell, routing, layouts | **Rewrite** | A separate app with its own look, its own navigation, and no RPG skin. Build Science as a program of the shared K-12 platform. |
| Data model and database | **Rework** | Tables already live in the shared Drizzle schema, but the app targets a separate `science_advantage` database and copies classrooms, gamification, and standards. |
| Lesson content (seeds) | **Rework** | 132 bilingual lessons for P3 and P4 exist. They do not follow a workbook lesson shape, they use a superseded standards structure, and they have no graph tags. |
| Lesson player and content blocks | **Keep, then port** | The block renderer (text, vocabulary, reading passage, materials, procedure, image, quiz) is sound and maps to a science lesson shape. |
| Quiz engine | **Rework** | Five closed question types. No written response, no claim-evidence-reasoning, no data table. Scoring is simple and testable. |
| Mastery (own model) | **Delete** | A per-standard average in `lib/ai/mastery-calculator.ts`. Replace with Mastery Advantage evidence commits. |
| AI recommendation and image generation | **Delete** | Rules engine plus OpenAI and Gemini calls that bypass the AI adapter. The graph's outer fringe replaces the recommender. |
| Gamification (XP, badges, streak) | **Delete** | Primary Advantage has the avatar shop, Class Quest, and reward pieces. Reuse those. |
| Games | **Rewrite** | The app has no games. Primary has about 30 Advantage Play Kit cartridges wired in. |
| Teacher views (classes, roster, analytics, intervention alerts) | **Keep the logic, port the views** | The intervention alert detection and the lesson analytics are useful. The screens must move to the shared look. |
| Auth, sessions, tenancy | **Keep** | Uses `@reading-advantage/auth` sessions, `createTenantDB`, and FLAT tables with `schoolId`. |
| Observability (OTel, Sentry) | **Keep** | Wired and tested. |
| Local UI copies (`components/ui`) | **Delete** | 19 shadcn files copied; zero imports of `@reading-advantage/ui`. |
| Repo-inspection tests (`lib/ci-gates`, `lib/__tests__`) | **Delete** | 40 of 163 test files check file layout and past audit phases, not behavior. |
| Docs (`README`, PRD, TODO, sprint files) | **Delete** | The README describes Prisma and port 5433. The PRD describes NGSS and a 180-day plan. Both are false today. |
| Deploy config | **Rewrite** | `vercel.json` only. Every other app has a Dockerfile for Cloud Run. |

**Headline.** The app is a complete, separately conceived product from October 2025. It was then patched for ten months to pass architecture audits. The audits made it safe. They did not make it fit the company model. The company model is one platform, one content store, one knowledge graph, and printed workbooks with digital twins. The least work and the most reuse is to build Science as a **program** of the Primary Advantage platform, and to salvage the Science content and a few modules from the current app.

## 2. Mastery Advantage

**Finding 2.1 — The app has no connection to the Mastery Advantage graph.** The only evidence writer is `lib/services/mastery/standard-mastery.ts`, which upserts a `masteryLevel` decimal per `(student, standard)` in `science_standard_mastery`. The level is a weighted correct ratio from `lib/ai/mastery-calculator.ts`. There is no node ID, no graph version, no evidence event, no FSRS state. `packages/domain/src/mastery` (`commitMasteryEvidence`, the Drizzle persistence adapter) has zero callers in the app (`grep -rl mastery packages/domain` versus `apps/science-advantage`: no import of `@reading-advantage/domain/mastery`).

**Finding 2.2 — The standards are not graph nodes.** `scripts/seed-data/standards/thai-grade-3.json` holds 21 codes (`Sc1.1-G3` to `Sc8.3-G3`) and `thai-grade-4.json` holds 20. They are English paraphrases with no Thai text, no official indicator number, and no prerequisite edges. Lessons and questions reference them by code (`"standards": ["Sc8.1-G3"]`). This is a flat tag list, not a knowledge space.

**Finding 2.3 — No Science domain exists in the graph repo.** `~/Desktop/mastery-advantage/science/README.md` says "Status: Planning — This domain is not yet implemented". The shared schema (`SPECIFICATION.md` section 3) and the domain pattern (`packages/codecamp-knowledge`) exist and are proven in CodeCamp.

**What is missing to reach each stage:**

| Stage | Needs |
|---|---|
| Tag | A `science-knowledge-space.json` with concept, skill, and vocabulary nodes for the chosen grades; a `@reading-advantage/science-knowledge` package with the domain adapter; node IDs on every article, question, vocabulary item, and game word list. |
| Shadow | Quiz, vocabulary, and game completions commit evidence through `commitMasteryEvidence()` with the Science graph version; a nightly evidence report; nothing adapts. |
| Adaptive | Calibrated edges from shadow data; outer-fringe recommendation on the student home; FSRS review queue for science vocabulary. FSRS needs no calibration and can start with the shadow stage. |

## 3. Pedagogy

**Finding 3.1 — The lesson is a scrolling document with a quiz at the end.** The app's own track spec says this (`apps/science-advantage/measure/tracks/lesson_type_differentiation_20260428/spec.md`, Overview). `lesson-player.tsx` renders blocks in order; `quiz-player.tsx` follows. There is no step sequence, no printed-book contract, and no place for the student to write.

**Finding 3.2 — Content is thin and uneven.** Across 132 lessons the median lesson has 84 words of content (first quartile 65, maximum 1,973). 86 lessons are type `LESSON`, 12 `LAB`, 14 `REVIEW`, 10 `ASSESSMENT`. Only 20 image blocks exist. The 12 labs are the strongest part: they have materials, safety notes, an 8-step procedure, an observation table, and conclusion questions (example: `thai-g3-unit-1.json`, `observing-living-things-lab`).

**Finding 3.3 — Assessment is closed-response only.** 536 questions: 319 multiple choice, 76 true/false, 75 fill in the blank, 48 multiple select, 18 vocabulary match. There is no written response, no claim-evidence-reasoning prompt, no data interpretation, and no drawing task. Science inquiry needs at least prediction, observation record, and explanation.

**Finding 3.4 — Standards use the superseded Thai structure.** The codes `Sc1` to `Sc8` follow the eight strands of the Basic Education Core Curriculum B.E. 2551. The B.E. 2560 revision (in force from 2018) uses four strands: Science of Life (ว 1.1 to 1.3), Physical Science (ว 2.1 to 2.3), Earth and Space Science (ว 3.1 to 3.2), and Technology (ว 4.1 to 4.2). The grade 3 set puts process skills under `Sc8`; the grade 4 set puts them under `Sc7`. The descriptions are English paraphrases, not the official indicators (ตัวชี้วัด). Alignment to the current Thai curriculum is therefore **not met**. (Confidence: high on the strand change; the exact indicator text must be checked against the IPST source by the workbooks or graphs session.)

**Finding 3.5 — Age fit is acceptable in tone, weak in form.** The seed text uses short sentences, Thai characters, and local settings (Chiang Mai, mango trees). But there are no sentence frames, no word banks, no picture support beyond 20 images, and the UI text is English only (no `next-intl`, no message files; only `i18n/ai-recommendation.*.json`).

**Finding 3.6 — Language of instruction is undecided in the code.** `lib/bilingual.ts` splits "English / Thai" strings. `titleThai` exists on all 132 lessons. Block-level Thai is partial. The `bilingual_architecture_20260428` track planned side-by-side rendering and was not completed.

## 4. Visual design

**Finding 4.1 — Three design systems collide.** `DESIGN.md` specifies DM Serif Display, DM Sans, forest green, and cream. `app/globals.css` sets those tokens. `app/layout.tsx` loads Geist fonts instead. `app/(student)/layout.tsx` and `app/page.tsx` use raw Tailwind colors (`bg-gray-50`, `text-rose-800`, `bg-rose-600`). The result is a generic white dashboard with a rose logo.

**Finding 4.2 — No RPG skin, no scene, no sprite.** Primary Advantage on `primary-parity-integration` ships `components/rpg/{chrome,hud,scene,sprite,toolbar}.tsx`, `lib/rpg/renderer.ts`, and `public/rpg/skin.json` (version 1.2.0) with 26 backdrops, 142 item icons, 75 kit files, and 604 avatar pack files from advantage-forge. Science has none of this and no path to it.

**Finding 4.3 — Shared UI is bypassed.** `components/ui/` holds 19 copied shadcn files; the app has 130 imports from `@/components/ui` and 0 from `@reading-advantage/ui`, which exports the same primitives.

**Finding 4.4 — Stale marketing copy in the product.** `app/page.tsx` lines 90 to 237 and `app/layout.tsx` line 22 claim "NGSS alignment" and "180 days of structured instruction". Neither is true for the Thai product.

## 5. Engagement

| Feature | Primary Advantage (integration branch) | Science Advantage |
|---|---|---|
| Games | About 30 Play Kit cartridges, `StudentCartridgeHost`, story games, game catalog | None |
| Avatar | Avatar home, picker, shop, poses, portrait canvas, forge packs | None |
| Class features | Class Quest with boss battle, live dashboard, quest meter | None |
| Rewards | Reward pieces become avatar pieces (`b1c32c3b2`) | XP, 1 level name table, badges, streak (`lib/gamification`) |
| Leaderboard | Yes | None |
| Lesson games | Flashcards, matching, sentence cloze, sentence order | Vocabulary flashcards only |

The Science gamification tables (`gamification_profiles`, `achievements`) duplicate what `student_rpg_profiles`, `student_cosmetic_unlocks`, and `game_completions` already provide. Delete them after the port.

## 6. Monorepo packages

**Used:** `db` (110 imports in 55 files), `auth` (49), `domain` (42 in 39 files), `types` (5), `auth-client` (3), `ai` (1). `createTenantDB` or `unscoped()` appear 30 times outside tests. All 17 science tables are registered FLAT in `packages/domain/src/tenant-registry.ts` lines 108 to 122.

**Not used, with a local copy instead:**

| Shared package | Local duplicate |
|---|---|
| `@reading-advantage/ui` | `components/ui/*` (19 files) |
| `@reading-advantage/ai` adapter | `lib/ai/image-generator.ts` (direct OpenAI and Gemini model IDs), `lib/ai/recommendation-service.ts` |
| `@reading-advantage/storage` | Generated lesson images committed to `public/images/lessons` (72 files) |
| `@reading-advantage/domain/mastery` | `lib/ai/mastery-calculator.ts`, `lib/services/mastery/*` |
| `packages/domain/src/gamification` and `rpg` | `lib/gamification/*` |
| `packages/domain/src/classes` | `science_classes`, `science_class_students`, join codes |
| `@reading-advantage/api` (tRPC) | 29 Next.js route handlers under `app/api` |
| `advantage-play-kit`, `game-cartridges`, `game-contracts` | nothing |
| `activity-runtime`, `activity-react`, `knowledge-space-core`, `srs-engine`, `practice-core` | nothing |

**Route handlers.** 25 of 29 route handlers no longer import `db` directly; the June audit's "F-305" gap was closed. The three that still do (`admin/dsar/export`, `ai/recommendations`, `student/classes`) are documented exemptions or leftovers. Business logic now sits in `packages/domain` modules (`curriculum`, `quiz`, `gamification`, `interventions`) and in `lib/services`. That logic is portable.

## 7. Data model and database

**Finding 7.1 — The README is wrong.** `README.md` describes a Prisma schema, `docker-compose`, and port 5433. `AGENTS.md` (line 3) says the `prisma/` directory must not exist. The app runs on Drizzle through `@reading-advantage/db` and reads `DATABASE_URL` for a `science_advantage` database on the shared Postgres (port 5432, PgBouncer 6432).

**Finding 7.2 — Science is a separate database with a copied school model.** The monorepo runs three local databases (`reading_advantage`, `primary_advantage`, `science_advantage`). The strategy says the Primary Advantage database is the canonical content store for all programs, and Tutor Advantage reads from it. A school that buys Primary plus Science would have two user tables, two classroom tables, two avatar states, and two logins. The science tables also copy `scienceStandards` per school (FLAT with `schoolId`), so the same national standard is stored once per tenant.

**Finding 7.3 — The content tables do not match a workbook.** `science_lessons` has `content` (markdown) plus `structuredContent` (jsonb blocks). `science_curriculum_units` groups lessons. There is no book, no lesson number inside a book, no step, no vocabulary table, and no article table. The Workbooks schema (`Workbooks/dashboard/lib/workbook-schema.ts`, `WorkbookLessonSchema`) is the real contract and has none of these science fields.

**Migration path.** Keep the Drizzle schema file `packages/db/src/schema/science.ts` as the source of the content import only. New science content tables carry a `program` dimension and live in the canonical store. Drop the `science_advantage` database after the import.

## 8. Build, test, and deploy health

| Gate | Last evidence | Result |
|---|---|---|
| `tsc --noEmit` | `.turbo/verify-check-types.log` 2026-09-08 | Clean (`ignoreBuildErrors: false` in `next.config.ts`) |
| `next build` | `.turbo/turbo-build.log` 2026-09-08 | Clean, 58 routes |
| `eslint` | `.turbo/turbo-lint.log` 2026-09-07 | 0 errors, 19 warnings |
| Unit and integration tests | 163 test files; CI runs `pnpm verify:science` (`.github/workflows/ci.yml` line 129) against a `science_advantage_test` database | Not re-run today (machine load) |
| E2E | `e2e/smoke.spec.ts` only | Thin |
| Deploy | `vercel.json` only; no Dockerfile, no Cloud Run config | Not deployable like the other apps |
| Last commit | `6e890c307`, 2026-09-12 | Work stopped |

Of the 163 test files, 23 in `lib/__tests__` and 17 in `lib/ci-gates` read the file system to check past audit phases (21 of them call `readFileSync`, `existsSync`, or `execSync`). They slow the suite and protect nothing a user sees.

## 9. What to salvage from `apps/science-advantage`

1. **Seed content** (`scripts/seed-data/lessons`, `questions`, `grade-4`): 132 lessons and 536 questions, bilingual titles, 12 good labs. Re-shape, re-tag, and re-edit; do not start from zero.
2. **Block renderer** (`components/features/lesson/blocks/*`): materials, procedure, reading passage, vocabulary, image, quiz, review. Port into the science lesson player.
3. **Intervention alerts** (`lib/interventions`, `packages/domain/src/interventions`): weak-standard detection per class. Re-point at graph nodes.
4. **Lesson analytics queries** (`packages/domain/src/curriculum`, `quiz`): question-level and standard-level breakdowns.
5. **Quiz scoring** (`lib/quiz/scoring.ts`): small, tested.
6. **Observability wiring** (`lib/observability`, `instrumentation.ts`, Sentry config): copy the pattern if the platform app lacks it.

Everything else is replaced by the platform.

## 10. Risks

- **Primary freeze.** Any schema change for the program dimension touches `packages/db`. It must wait for the cutover (Oct 11, last date Oct 20) and go in as an additive migration behind a program flag.
- **Content authoring is the long pole.** Two books of 14 lessons, graph-first, bilingual, with labs, is more than the app work. The workbooks session owns it and needs the lesson shape (Q-WB-10) in October.
- **Graph quality.** A science graph built in four weeks will have weak prerequisite edges. Shadow mode is the correct launch stage; adaptive waits for calibration.
- **Daniel's time.** Eleven decisions are batched in `decisions.md`, each with a recommendation, so one sitting resolves them.
