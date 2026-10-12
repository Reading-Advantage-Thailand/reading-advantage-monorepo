# Plan — Primary parity cleanup

Work on `primary-parity-integration` (or a lane branch from it). Before a write to integration, tell
the monorepo session. App root: `apps/primary-advantage` (paths below are relative to it unless they
start with `packages/`, `docs/`, `measure/`, or `~`). Tests: `pnpm --filter primary-advantage test`,
`pnpm --filter @reading-advantage/ai test`, `pnpm --filter @reading-advantage/advantage-play-kit test`;
run one file with `npx vitest run <file>` in the package. Commit subjects:
`chore(primary): <subject> (track_id: primary_parity_cleanup_20261011)`, 100 characters or less,
lower case. Machine rules: one heavy job at a time (tsc, build, browser run); no run with 25 students.

Phase order. The owner decision of 2026-10-11 puts the asset copy first, so Phase 1 is the copy. The
copy changes no repository file. Phase 2 is the design, before every build phase. The removal phases
follow the spec groups (B to G). Each FR task keeps the Contract-First order inside it: the contract
(when the FR has one), then the failing test (red), then the change (green). Each removal phase ends
with a grep check that must give no output. The last phase holds the records, the acceptance, and the
docs and doctor steps.

The guard test. `lib/__tests__/removed-surfaces.test.ts` gets one `describe` block for each removal
phase. Each block reads the file system: the removed paths do not exist, and no source file under
`app`, `components`, `lib`, `server`, `actions`, `configs`, and `public` names a removed path or export.
The grep checks exclude this file: `':!apps/primary-advantage/lib/__tests__/removed-surfaces.test.ts'`
(written `<guard>` below).

## Phase 1: ElvGames asset copy [checkpoint: 0dd85cc9e]

- [x] Task: Take the ElvGames inventory again (spec FR-1)
    - [x] For each source of the spec FR-1 table, run `git ls-files <source> | wc -l` and `du -sb <source>`; write the numbers in `measure/tracks/primary_parity_cleanup_20261011/asset-copy.md`
    - [x] Run `git grep -l -i elvgames` and `git ls-files | grep -E 'standard-pack|assets/standard|assets/review|play-maps'`; add each new ElvGames location to the table
    - [x] Run `df -h ~/Desktop`; stop if less than 2 GB is free
- [x] Task: Copy the files and write the manifest
    - [x] Make the folder `~/Desktop/Asset Packs/monorepo-elvgames-20261011/`
    - [x] From the repository root, copy each source with its path: `git ls-files -z <source> | xargs -0 cp --parents -t "$HOME/Desktop/Asset Packs/monorepo-elvgames-20261011"` (one source at a time)
    - [x] Write `MANIFEST.tsv` in the target folder: `git ls-files -z <sources> | xargs -0 stat -c '%n%t%s'` (path, size in bytes); add a header line `path	size`
- [x] Task: Check the copy before any deletion
    - [x] For each folder: `diff -rq <source> "<target>/<source>"` gives no output
    - [x] For each single file: `cmp <file> "<target>/<file>"` gives no output
    - [x] The manifest has one line for each source file (plus the header), and its size sum equals the `du -sb` sums of the sources
    - [x] Write the result in `asset-copy.md` (folder path, counts, sizes, the compare result, the date); tell the owner the folder path
    - [x] No hash and no checksum (spec R-4)
- [x] Task: Measure - User Manual Verification 'Phase 1: ElvGames asset copy' (Protocol in workflow.md)
    - Manual verification: run `ls "$HOME/Desktop/Asset Packs/monorepo-elvgames-20261011"`; check `MANIFEST.tsv` has 73,053 lines; read `asset-copy.md`. Look check pending (owner, async).

## Phase 2: Design [checkpoint: d27f71116]

- [x] Task: Design the class challenge panels without ElvGames frames (spec FR-6)
    - [x] Student catalog `/student/games` (inside `.cq-world`): the panel and its buttons with the parchment frame that `styles/rpg.css:32-35` gives; decide the panel surface (today navy `#0f172a`, `student-challenge-catalog-panel.tsx:180`)
        - Design: the panel surface is the parchment gradient with ink text. Add two variables to the first `.cq-world` rule in `styles/rpg.css`: `--apk-arcade-panel-surface: linear-gradient(180deg, var(--cq-parchment), var(--cq-parchment-2))` and `--apk-arcade-panel-text: var(--cq-ink)`. The border (3 px, `--cq-parchment-edge`, radius 14 px) and the buttons (gold primary, iron secondary, wood-dark edge) come from the variables that already exist.
    - [x] Teacher page `/teacher/game-challenges` (staff shell, outside `.cq-world`): the panel frame and the buttons with the staff tokens; the fields of `FIELD_FRAME` stay readable (`app/[locale]/teacher/game-challenges/page.tsx:10-19`)
        - Design: the frame wrapper gets a `style` object (testable in Phase 6) with these values: `--apk-arcade-panel-image`, `--apk-arcade-button-primary-image`, `--apk-arcade-button-secondary-image`: `none`; panel border width `2px`, radius `16px`, fallback `var(--border)`, surface `var(--card)`, text `var(--card-foreground)`; button border width and inline width `2px`, radius `10px`, fallback `var(--border)`; primary `var(--primary)` with `var(--primary-foreground)`; secondary `var(--secondary)` with `var(--secondary-foreground)`. The values follow the staff cards (`TEACHER_CARD`) and work in day and night.
        - Add `[&_fieldset]:border-border` to `FIELD_FRAME`: in night mode the fieldset edge of "Word 1" is white (browser default) in the capture.
    - [x] Reuse `components/rpg/*` and the `cq-` tokens; draw no new frame (`docs/primary-rpg-skin.md` rule 2). No new asset and no ElvGames file: the design uses CSS variables only.
    - [x] Make a prototype capture of each panel at 375 px and 1280 px (student page: day and night); captures are outside the repository (brief). Paths: `captures/design/captures.md`. The prototype also covers the teacher page at night.
    - Play-kit change for Phase 6 (tested in the prototype): `design-playkit.patch` in this folder. The panel reads `--apk-arcade-panel-image`, the two button images, `--apk-arcade-panel-surface` (fallback `#0f172a`), and `--apk-arcade-panel-text` (fallback `#f8fafc`), each with the current value as the fallback. Reading Advantage and Advantage Games set none of these variables, so they keep the same look.
- [x] Task: Owner look check of the design
    - [x] Look check pending (owner, async). Default used: the design above stands. Phase 6 builds it. If the owner asks for a change, only the variable values change.
- [x] Task: Measure - User Manual Verification 'Phase 2: Design' (Protocol in workflow.md)
    - Look check pending (owner, async). Manual verification: open the eight PNG files of `captures/design/captures.md`. Check that no panel shows a pixel-art frame or a navy fill on the student page, that the teacher panel looks like a staff card, and that the text is readable in day and night.

## Phase 3: Remove the System Testing page (SYS-04) [checkpoint: b034a3da8]

- [x] Task: FR-2 (SYS-04) — remove the System Testing page and `deleteAllArticles`
    - [x] Check the callers: `git grep -n -E 'actions/test"|system/test' -- apps/primary-advantage`; each hit is on the spec FR-2 list; record any other hit here and keep it (spec R-2)
    - [x] Red: new `lib/__tests__/removed-surfaces.test.ts`, block "SYS-04": `app/[locale]/system/test` and `actions/test.ts` do not exist; no source names `deleteAllArticles` or `@/actions/test`; no source matches `/\.delete\(articles\)\s*(\.returning|;)/` (a delete of all rows)
    - [x] Red: `components/nav/__tests__/app-nav.test.tsx:74-79` expects the SYSTEM list `["systemdashboard", "schools", "licenses"]`
    - [x] Green: delete `app/[locale]/system/test/` (7 files) and `actions/test.ts`; remove the item at `configs/system-page-config.ts:26-30`; remove `Sidebar.testing` from `messages/{en,th,cn,tw,vi}.json`; delete `actions/__tests__/test-actions.authorization.test.ts`
    - [x] Keep `canRunContentTooling` and `CONTENT_TOOLING_ROLES` (`lib/authorization.ts`); `app/api/upload/csv/cleanup/route.ts` uses them
- [x] Task: Grep check 'SYS-04'
    - [x] `git grep -n -E 'system/test|actions/test"|deleteAllArticles|ArticleTestGenerate|AudioTestWord|RolesManagement' -- apps/primary-advantage <guard>` gives no output
    - [x] `python3 -c "import json; print([l for l in ('en','th','cn','tw','vi') if 'testing' in json.load(open(f'apps/primary-advantage/messages/{l}.json'))['Sidebar']])"` prints `[]`
- [x] Task: Measure - User Manual Verification 'Phase 3: Remove the System Testing page (SYS-04)' (Protocol in workflow.md)
    - Look check pending (owner, async). Steps: log in as SYSTEM; the nav shows System Dashboard, Schools, Licenses and no Testing; `/en/system/test` gives the not-found page.
    - Callers check: no hit outside the FR-2 list. App tsc passed. Vitest: removed-surfaces (3) and app-nav pass.

## Phase 4: Remove Admin Article Creation (ADM-11) [checkpoint: 665477b49]

- [x] Task: FR-3 (ADM-11) — remove the page, the component, the routes, and their server code
    - [x] Check the callers of each export of spec FR-3: `git grep -n -w <name> -- apps/primary-advantage`; record any caller that is not on the list and keep that export
    - [x] Red: `removed-surfaces.test.ts`, block "ADM-11": `app/[locale]/admin/article-creation`, `components/admin/article-creation.tsx`, and `app/api/articles/generate/custom-generate` do not exist; no source names `/admin/article-creation`, `custom-generate`, or a removed export
    - [x] Red: `components/nav/__tests__/app-nav.test.tsx:67-73` expects the admin list without `"articlecreation"`; if `components/admin/admin-quick-actions.tsx` still exists, `components/__tests__/broken-ux-behavior.test.tsx:104-115` adds `/admin/article-creation` to the dead links
    - [x] Green: delete the page, the component, and the three route files; remove the exports of spec FR-3 from `server/controllers/articleController.ts`, `server/models/articleModel.ts` (and the imports that become unused, for example `deleteFile` at `:50`), and `actions/article.ts`
    - [x] Green: remove the item at `configs/admin-page-config.ts:113-118` and the entry at `components/admin/admin-quick-actions.tsx:36-42` (skip if the file is gone); remove the keys `Sidebar.articlecreation`, `AdminArticleCreationPage`, `Components.AdminArticleCreation`, `AdminDashboard.quickActions.createArticle`, and `AdminDashboard.quickActions.createArticleDesc` from the five locales
- [x] Task: Grep check 'ADM-11'
    - [x] `git grep -n -w -E 'article-creation|articlecreation|custom-generate|AdminArticleCreation|AdminArticleCreationPage|quickActions\.createArticle|createArticleDesc|generateCustomArticle|saveArticleAndPublish|saveArticleAsDraft|saveArticleAsDraftModel|fetchCustomArticleController|createdArticleCustom|updateAprovedCustomArticle|getCustomArticle|checkExistingArticle|getDeleteArticleById|deleteArticleById|deleteArticleByIdModel' -- apps/primary-advantage <guard>` gives no output
    - Deviation: the dead-link entry for `/admin/article-creation` in `broken-ux-behavior.test.tsx` was not added. The grep check and the ADM-11 guard forbid the string in sources, and the quick action is gone.
    - [x] Run the FR-3 data check of the spec table "Migrated data" on the rehearsal copy (read-only); if the count is more than 0, ask Q2 and record the answer here
        - Result on `primary_rehearsal2_20261010`: 0 custom drafts (626 articles in total). Q2 not asked.
- [x] Task: Measure - User Manual Verification 'Phase 4: Remove Admin Article Creation (ADM-11)' (Protocol in workflow.md)
    - Look check pending (owner, async). Steps: log in as ADMIN; the nav shows Dashboard, Teachers, Students and Classes, Import Data and no Article Creation; `/en/admin/article-creation` gives the not-found page; `POST /api/articles/generate/custom-generate` gives 404.
    - Callers check: no caller outside the FR-3 list. App tsc passed. Vitest: removed-surfaces (7), app-nav, broken-ux-behavior, and article-actions authorization pass.

## Phase 5: Remove the content generation code [checkpoint: 8490f9279]

- [x] Task: FR-4 — remove the bulk route and the generation actions
    - [x] Check the callers of `generateAllArticle`, `generateAllArticleNew`, `generateArticle`, `generateArticleNew`, and `amountPerGenreSchema` with `git grep -n -w`
    - [x] Red: `removed-surfaces.test.ts`, block "content generation": `app/api/articles/generate` does not exist; no source names `/api/articles/generate`, `generateAllArticle`, `generateArticleNew`, or `amountPerGenreSchema`
    - [x] Green: delete `app/api/articles/generate/route.ts` and `app/api/articles/generate/__tests__/route.test.ts`; remove `generateArticle`, `generateArticleNew`, and `requireToolingAccess` from `actions/article.ts:30-64` (and the unused imports); remove `amountPerGenreSchema` (`lib/authorization.ts:295`)
    - [x] Tests: in `actions/__tests__/article-actions.authorization.test.ts`, remove the case at `:46` and the mocks of removed exports, and keep the case at `:66`; in `lib/__tests__/authorization.test.ts`, remove the `amountPerGenreSchema` import (`:16`) and its case (`:112-117`)
- [x] Task: FR-4 — remove the generators, their model code, and their data files
    - [x] Red: `removed-surfaces.test.ts`, same block: `server/utils/generators`, `server/utils/constants.ts`, and `server/utils/logging.ts` do not exist; no source names `utils/generators`, `saveArticleContent`, `generateQuestions`, `generateArticles`, `articleGeneratorSchema`, or `storyGeneratorSchema`
    - [x] Green: delete `server/utils/generators/` (16 files and `__tests__/`), `server/utils/constants.ts`, and `server/utils/logging.ts`; remove `generateAllArticleNew` and `generateAllArticle` (`articleController.ts:29-90`); remove `saveArticleContent`, `generateQuestions`, and `generateArticles` with the generator imports (`articleModel.ts:21-40`, `:186-362`); remove `articleGeneratorSchema` and `storyGeneratorSchema` from `lib/zod.ts` (and each schema that only they use)
    - [x] Green: `git grep -n` each data file name of spec FR-4; delete each file that has no other reader
    - [x] Tests: delete `server/__tests__/writer-contracts.test.ts`; in `server/models/__tests__/writerModels.behavior.test.ts`, remove the `saveArticleContent` cases (`:45`, `:115-130`) and keep the others; remove the mocks at `server/models/__tests__/articleModel.questions.test.ts:25-26`; remove the path at `components/__tests__/component-deduplication-behavior.test.tsx:612`
- [x] Task: Grep check 'content generation'
    - [x] `git grep -n -w -E 'utils/generators|generateAllArticle|generateAllArticleNew|generateArticle|generateArticleNew|generateArticles|generateQuestions|saveArticleContent|amountPerGenreSchema|articleGeneratorSchema|storyGeneratorSchema|api/articles/generate|new-article-prompts|prompts-combined|cefr-article-prompts|new-level-evaluation-prompts|title-a0|title-a1|title-a2' -- apps/primary-advantage <guard>` gives no output
    - [x] Run `pnpm --filter primary-advantage test` once
- [x] Task: Measure - User Manual Verification 'Phase 5: Remove the content generation code' (Protocol in workflow.md)
    - Look check pending (owner, async). Steps: log in as ADMIN; `POST /api/articles/generate` gives 404; student read pages still list and open articles.
    - Callers check: no caller outside the FR-4 list. Extra items removed (their only readers were the generators): `MCQuestionSchema`, `LAQuestionSchema`, `SAQuestionSchema`, `VocabularySchema` in `lib/zod.ts`, and the unused file `data/story-schema.ts` (it held copies of the two generator schemas and had no importer). `canRunContentTooling` stays for `app/api/upload/csv/cleanup/route.ts`. App tsc passed. Full app test run: 219 files, 1328 tests pass.

## Phase 6: Old game host (M4, safe scope) [checkpoint: 222516a67]

- [x] Task: FR-5 — send the message to the Forge session
    - [x] Send the message of spec FR-5: the Primary files that go (FR-7 to FR-9), the two play-kit files that change (FR-6), the one Primary build of this phase, and the two questions (the orchestrator sent it)
    - [x] Record the answer and the date here; delete no file before the answer
        - Forge answer, 2026-10-12: "no open Forge work imports packages/game-cartridges, so the M4 cleanup does not block Forge. scripts/monorepo-sync.ts writes only packages/advantage-play-kit-3d, packages/game-cartridges-3d, and apps/primary-advantage/public/ (rpg/, packs/avatar/); it does not read game-cartridges. game-cartridges-3d and advantage-play-kit-3d have no dependency on @reading-advantage/game-cartridges. Forge has no ElvGames or host-proof references. Forge will update its doc pointers after the cleanup merges. Cartridge changes go through Forge first. Forge uses the heavy lock."
        - The shared heavy lock (`~/Desktop/primary-parity-progress/heavy.lock`) replaces the "build start" and "build done" messages to Forge, because Forge wraps its heavy jobs with the same lock.
- [x] Task: FR-6 — the challenge panels read the frame variables
    - [x] Red: in `packages/advantage-play-kit/src/react/student-challenge-catalog-panel.test.tsx` and `teacher-challenge-panel.test.tsx`, assert that the panel `borderImageSource` is `var(--apk-arcade-panel-image, url("<base path>/assets/apk/standard-pack-qc/apk-ui-panel-square.png"))` and that each button reads its button variable with the same fallback rule
    - [x] Green: `packages/advantage-play-kit/src/react/student-challenge-catalog-panel.tsx:54-58`, `:180`, and `teacher-challenge-panel.tsx:47-51`, `:215`; keep the base path; if the design needs it, one surface variable with `#0f172a` as the fallback
    - [x] Red: in `app/[locale]/teacher/game-challenges/__tests__/page.test.tsx`, the frame around the panel sets `--apk-arcade-panel-image: none`, `--apk-arcade-button-primary-image: none`, and `--apk-arcade-button-secondary-image: none`
    - [x] Green: `app/[locale]/teacher/game-challenges/page.tsx:15-19` with the values of the Phase 2 design; the student catalog needs no change (`.cq-world` sets the variables)
    - [x] Run the play-kit tests; the Reading Advantage and Advantage Games panel tests pass with no change of the expected values (spec NFR-2)
        - Play-kit suite: 79 files, 751 tests pass. The patch of Phase 2 applied unchanged. Extras (plan-review L-1, L-2, orchestrator): the class select has the class `apk-challenge-select`; the row divider reads `--apk-arcade-panel-divider` (fallback `#475569`); the status line has the class `apk-challenge-status` and `data-status`. `styles/rpg.css` styles all three with the existing wood, parchment, and gold tokens, so the status shows as a wood badge (the `cq-sign` look). No new asset.
- [x] Task: FR-7 — remove the host-proof surface
    - [x] Check the callers: `git grep -n -E 'host-proof|HostProof' -- apps/primary-advantage`; each hit is on the spec FR-7 list ("go" or "stays")
    - [x] Red: `removed-surfaces.test.ts`, block "M4": the files of spec FR-7 do not exist; no source names `HostProofGameClient`, `isHostProofEnabled`, `HOST_PROOF_ENABLED`, `student/host-proof`, or `api/host-proof`
    - [x] Red: `lib/__tests__/host-proof-test-config.test.ts:27-31` expects `pnpm exec tsx scripts/seed-host-proof-session.ts && PORT=3001 npm run dev`
    - [x] Green: delete the files and the tests of spec FR-7; change `host-proof-test-config.ts:44-46`; remove the `"host-proof"` segment at `lib/__tests__/api-no-direct-db.test.ts:32` and change its case at `:76`
- [x] Task: FR-8 — remove the old student host and the package dependency
    - [x] Red: `removed-surfaces.test.ts`, block "M4": `components/apk/StudentCartridgeHost.tsx`, `components/apk/apk-host-layout.ts`, and `lib/apk/realm-carver-input.ts` do not exist; `package.json` and `next.config.ts` do not name `@reading-advantage/game-cartridges` (the `-3d` package stays)
    - [x] Green: delete the files and the tests of spec FR-8; change `components/__tests__/structural-alignment-i18n.test.tsx` (`:127`, `:169`, `:233-326`), `components/__tests__/loading-state-content.behavior.test.tsx` (`:110`, `:147`, `:189-221`), and `app/api/v1/apk/__tests__/challenge-routes.test.ts:26-29`
    - [x] If `components/games/__tests__/game-host.test.tsx` has no case for the translated `ApkHost.readMode`, `listenMode`, and `signInToPlayChallenge` labels, add one there
    - [x] Green: remove the dependency at `package.json:59` and the entry at `next.config.ts:18`; run `pnpm install --lockfile-only`; `git diff --stat pnpm-lock.yaml` shows a change in the Primary importer only
        - Deviation: `pnpm install --lockfile-only` also re-resolved peer suffixes in other importers (38 insertions, 16 deletions). It was reverted and the three lines of the Primary importer were removed by hand (3 deletions). `pnpm install --frozen-lockfile --lockfile-only` accepts the result.
- [x] Task: FR-9 — remove the Primary ElvGames files and check the build output
    - [x] Check that `asset-copy.md` records a complete copy (Phase 1); stop if it does not
        - Phase 1 section: diff and cmp clean, manifest 73,052 lines, sizes equal.
    - [x] Red: `removed-surfaces.test.ts`, block "M4": `public/assets/apk/standard-pack-qc` does not exist; no source names `standard-pack-qc`
    - [x] Green: `git rm -r apps/primary-advantage/public/assets/apk/standard-pack-qc`
    - [x] Run `pnpm turbo run build --filter=primary-advantage` (the one heavy job) under the heavy lock; the lock replaces the "build start" and "build done" messages to Forge
    - [~] `find apps/primary-advantage/.next/standalone \( -path '*standard-pack-qc*' -o -path '*advantage-play-kit/assets*' \) -type f | wc -l` prints 0; if not, add `outputFileTracingExcludes` to `next.config.ts` (spec FR-9) and build again
        - Result: 0 files in `standalone/apps/primary-advantage`; 156 files in the folders of other apps. `outputFileTracingExcludes` has no effect in a Turbopack build (tried with two route keys, two extra builds, then reverted). See `asset-copy.md`, section "Build output check". Owner decision: a Dockerfile `rm` line, or a later fix of the full trace (spec E-7).
    - [x] Record `du -sh apps/primary-advantage/.next/standalone/apps/*` in `asset-copy.md` for the owner (spec E-7)
- [x] Task: Grep check 'M4'
    - [x] `git grep -n -E '@reading-advantage/game-cartridges($|[^-])|StudentCartridgeHost|HostProofGameClient|host-proof-config"|isHostProofEnabled|HOST_PROOF_ENABLED|student/host-proof|api/host-proof|standard-pack-qc|apk-host-layout|realm-carver-input' -- apps/primary-advantage <guard>` gives no output
    - [x] `git grep -n 'link:../../packages/game-cartridges$' -- pnpm-lock.yaml` shows the Reading Advantage and Advantage Games importers only
- [x] Task: Measure - User Manual Verification 'Phase 6: Old game host (M4, safe scope)' (Protocol in workflow.md)
    - Look check pending (owner, async). Steps: open `/en/student/games` as a student (day and night): the challenge panel shows parchment, ink text, a gold Play button, and no pixel-art frame. Open `/en/teacher/game-challenges` as a teacher: the panel looks like a staff card. Open the network log: no request to `/assets/apk/standard-pack-qc/`. `/en/student/host-proof/games` and `POST /api/host-proof/games/completions` give 404. `/assets/apk/standard-pack-qc/apk-ui-panel-square.png` gives 404.
    - Captures: none for this phase (the build was not served; Phase 9 makes the captures of the built pages).
    - Defaults used for member questions: none asked in this phase (Q1 default stands: the package `game-cartridges` stays for Reading Advantage and Advantage Games).

## Phase 7: Old game URLs (STU-09) [checkpoint: 20e74660c]

- [x] Task: FR-10 (STU-09) — redirect the five old game URLs
    - [x] Contract: in `lib/games/catalog.ts`, add `OLD_GAME_PATHS` (`vocabulary`: `dragon-rider`, `enchanted-library`, `rpg-battle`, `rune-match`; `sentences`: `potion-rush`) and `oldGameTarget(group, id)`, with JSDoc; it returns `/student/games/apk/<id>` or `undefined`
    - [x] Red: in `lib/games/__tests__/catalog.test.ts`, each of the five paths gives its target; `gameFor` finds a playable game for each target; an unknown id and a wrong group give `undefined`
    - [x] Red: new `app/[locale]/(student)/student/games/vocabulary/[gameId]/__tests__/page.test.tsx` and `app/[locale]/(student)/student/games/sentences/[gameId]/__tests__/page.test.tsx` (pattern: `games/apk/[cartridgeId]/__tests__/page.test.tsx`): the page calls `permanentRedirect` with `{ href: "/student/games/apk/<id>", locale }`; an unknown id calls `notFound`
    - [x] Green: change `i18n/navigation.ts:6` to the line of branch `primary/public-pages` (`export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } =`); write the two pages
- [x] Task: Measure - User Manual Verification 'Phase 7: Old game URLs (STU-09)' (Protocol in workflow.md)
    - Look check pending (owner, async). Steps: sign in as a student. Open `/en/student/games/vocabulary/rune-match`, `/en/student/games/vocabulary/dragon-rider`, and `/en/student/games/sentences/potion-rush`: each opens the 3D game with the same name at `/en/student/games/apk/<id>`. Open `/en/student/games/vocabulary/unknown`: the not-found page shows. `curl -I` on an old URL with a session cookie shows HTTP 308.
    - Captures: none (the build was not served in this phase; Phase 9 makes the captures).
    - Defaults used for member questions: none asked in this phase.

## Phase 8: AI models in the adapter configuration (CNT-02)

- [ ] Task: Read the live legacy model rows (spec FR-12)
    - [ ] Copy the C4 dump to the session scratch folder: `gsutil cp gs://backupsqldatabase/Backup_Primary_2026-10-11.sql.gz <scratch>/`
    - [ ] Read the rows with `zcat` and `grep` only (no database command): the `COPY` blocks of `ai_task_configs` (`qa.feedback`, `chatbot.stream`) and `ai_providers`
    - [ ] Record the provider, the model id, and the temperature of each task here; stop and ask the owner if a provider is not Vertex or OpenAI
    - [ ] Delete the local dump after the read (it holds personal data)
- [ ] Task: FR-11 — the adapter gets the Vertex provider and the `system` field
    - [ ] Contract: `packages/ai/src/types.ts` — `AIProvider` adds `"vertex"`; `GenerateObjectInput` gets `system?`; `AIConfig` gets the Vertex fields (project, location, client email, private key); JSDoc for each
    - [ ] Red: new `packages/ai/src/providers/vertex.test.ts` (pattern: `google.test.ts`): the provider makes the Vertex factory with the project, the location `global`, and the credentials; `generateObject` passes `system`; a missing credential throws `ProviderNotConfiguredError`
    - [ ] Red: `packages/ai/src/__tests__/phase-5-provider-selector.test.ts`: `createAIClient({ provider: "vertex", ... })` gives the Vertex client; `src/__tests__/contract-suite.ts`: `system` reaches the model call
    - [ ] Green: new `packages/ai/src/providers/vertex.ts` (reuse the Google provider methods; only the model factory differs); `packages/ai/src/client.ts:9-14` and `:25-78`; pass `system` in `providers/{openai,google,openrouter,mock}.ts`; add `vertex` to `src/__tests__/wave2-provider-architecture-guard.test.ts:81`
- [ ] Task: FR-12 — the Primary model configuration
    - [ ] Contract: new `lib/ai/models.ts` — the two task settings with the live values, the Zod schema of the overrides `PRIMARY_AI_FEEDBACK_MODEL` and `PRIMARY_AI_CHATBOT_MODEL`, and the lazy clients `feedbackClient()` and `chatbotClient()` (with `createAIClient`), with JSDoc
    - [ ] Red: new `lib/ai/__tests__/models.test.ts`: the defaults equal the live values; an override replaces its model; a value with a space throws with the variable name; the feedback client gets provider `vertex`, location `global`, and project `PROJECT_ID`; the chatbot client gets provider `openai`
    - [ ] Green: `lib/ai/models.ts`
- [ ] Task: FR-13 — move the feedback and the chatbot to the adapter
    - [ ] Red: new `server/utils/__tests__/assistant-feedback.test.ts`: `getSaqFeedback` and `getLaqFeedback` call `feedbackClient().generateObject` with the system prompt, the schema, and the filled prompt, and log `ai_call` with the task, the provider, and the model
    - [ ] Red: in `app/api/assistant/lesson-chatbot/__tests__/route.test.ts`, the route calls `chatbotClient().streamText` with `system` and the messages, returns the same JSON, logs `ai_call`, and logs errors with `logger.error`; no mock of `@/utils/openai` remains
    - [ ] Green: `server/utils/assistant.ts:13-14`, `:76-81`, `:141-146`; `app/api/assistant/lesson-chatbot/route.ts:4-5`, `:49-103`, `:114-117`, `:138-145`; delete `utils/google.ts` and `utils/openai.ts`
- [ ] Task: Grep check 'CNT-02'
    - [ ] `git grep -n -E '@/utils/google|@/utils/openai|ai/internal-sdk|gemini-2\.|gpt-5|dall-e|imagen-' -- apps/primary-advantage` gives no output
- [ ] Task: Measure - User Manual Verification 'Phase 8: AI models in the adapter configuration (CNT-02)' (Protocol in workflow.md)

## Phase 9: Records, Acceptance, Docs & Doctor

- [ ] Task: Run the gates, one at a time
    - [ ] `pnpm --filter primary-advantage test`, `pnpm --filter @reading-advantage/ai test`, `pnpm --filter @reading-advantage/advantage-play-kit test`
    - [ ] `pnpm --filter primary-advantage check-types`, then the same for `@reading-advantage/ai` and `@reading-advantage/advantage-play-kit`
    - [ ] `pnpm --filter primary-advantage lint` and the package lint on the changed files
    - [ ] Run the grep checks of Phases 3 to 8 again; each gives no output
- [ ] Task: Side-by-side acceptance on the rehearsal copy
    - [ ] Write `measure/tracks/primary_parity_cleanup_20261011/acceptance-pairs.json` with the rows AC-1 to AC-10 of the spec (the pair list contract of `primary_parity_acceptance_20261011`)
    - [ ] Fill the behavior contract template (`docs/runbooks/primary-behavior-contract-template.md`) for FR-10 and FR-13
    - [ ] Run the kit on the matched copies with a production build of each app (one app at a time); run the data checks of the spec table "Migrated data"
    - [ ] Write `measure/tracks/primary_parity_cleanup_20261011/acceptance.md` (the kit template); keep the captures in the private folder
- [ ] Task: Owner look check of the built pages
    - [ ] Send the report and the captures of `/student/games`, `/teacher/game-challenges`, the SYSTEM nav, and the admin nav (375 px and 1280 px; the student page day and night); record the answer here
- [ ] Task: FR-14 — update the records
    - [ ] `measure/tech-debt.md`: the `/system/test` row becomes `Resolved`; the ElvGames row stays `Open` with the new text of spec FR-14 (the file has more than 50 lines, so ask the owner to prune it first, `measure/workflow.md`)
    - [ ] `docs/primary-games-integration.md:87-90`, `docs/primary-whats-moved.md:83` and `:91` (after `primary_parity_records_20261011`), `docs/primary-rpg-skin.md:17`
    - [ ] Show the owner spec E-7 (other apps in the Primary image); on a yes, add a tech-debt row
    - [ ] Tell `primary_parity_rehearsal3_20261011` (the 404 check of spec FR-14), `primary_parity_lesson_games_20261011` (the dependency is complete), `primary_parity_admin_dashboard_20261011` (the quick action entry), and the Forge session (the removal is complete)
- [ ] Task: Generate Docs & Doctor
    - [ ] Run `measure/generate.sh`; stage the files that it changes
    - [ ] Run `measure/doctor.sh`; fix each failure that names a file of this track
    - [ ] If `graph.db` is fresh, run `build-graph update ./graph.db <changed files>`
- [ ] Task: Measure - User Manual Verification 'Phase 9: Records, Acceptance, Docs & Doctor' (Protocol in workflow.md)
