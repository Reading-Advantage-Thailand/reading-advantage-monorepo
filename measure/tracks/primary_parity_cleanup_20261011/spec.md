# Spec — Primary parity cleanup

Track ID: `primary_parity_cleanup_20261011`
Type: chore (Classic FR list)
Triage rows: SYS-04, ADM-11, STU-09, CNT-02, and the follow-up decision `old_game_host_M4`
(`~/Desktop/primary-parity-triage/triage-decisions-20261011-214840.json`,
`followup-decisions-20261011.json`, 2026-10-11).
Tech-debt rows: "ElvGames art still ships in the monorepo games" (`measure/tech-debt.md:11`) and
"Primary `/system/test` page ships destructive dev tools" (`measure/tech-debt.md:65`).

## Overview

The new Primary build still ships tools that the owner removed on 2026-10-11. The System Testing page
has a "Delete All Articles" button with no confirmation. Admin Article Creation and a bulk route make
articles with old AI models. The old 2D game host, its proof pages, and the ElvGames files are still in
the app. Old game bookmarks give 404. The two AI features that stay use hard-coded models.

This track removes these tools and the server code that only they use. It sends the five old game URLs
to the new 3D games. It moves the AI model names of the SAQ/LAQ feedback and the lesson chatbot into the
AI adapter configuration, with the legacy models. Before any deletion of an ElvGames file, the track
copies every ElvGames file, with the slicing data, to `~/Desktop/Asset Packs/`.

The removal of the old game host (M4) has a safe scope. Reading Advantage and Advantage Games still
import `packages/game-cartridges`. So this track removes the Primary part only. The package and the
ElvGames files of the other apps stay until M3 (see "What stays, and why").

## Track Set

This track is member 2 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_acceptance_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Rules for this track

- R-1. No schema change, no Drizzle migration, no ETL change, and no change to the cutover runbook or
  command sheet. The track deletes no database row. If a task finds that it needs one of these changes,
  stop and ask the owner. `primary_parity_rehearsal3_20261011` gets one note only (FR-14).
- R-2. The removal rule. At the start of each removal phase, run `git grep` for every file and export
  on the removal list. Delete a file or an export only when every caller is also on the removal list.
  Keep each item that another caller uses, and write it under the task. The lists in this spec are the
  state of `primary-parity-integration` at `ca8869cea`.
- R-3. Each removal phase ends with a `git grep` check (plan) that gives no output. `git grep` reads
  tracked files only, so it skips `node_modules`, `.next`, and `dist`.
- R-4. The asset copy check uses a byte compare (`cmp`, `diff -rq`), the file count, and the size. It
  adds no hash or checksum (`AGENTS.md`, "Hashing and Provenance Policy").
- R-5. New or changed Primary server code logs with `apps/primary-advantage/lib/observability/logger.ts`,
  never with `console.error`.
- R-6. Tests: Vitest. App tests are in `apps/primary-advantage/**/__tests__/` and `lib/**`
  (`apps/primary-advantage/vitest.config.ts:15`). Package tests run with the package runner.
  Every exported function, type, and schema has JSDoc (`AGENTS.md`).
- R-7. One heavy job at a time: tsc, a build, or a browser run. Tell the Forge session before a build.
- R-8. Message keys: when a removal makes a key unused, remove it from all five locales
  (`apps/primary-advantage/messages/{en,th,cn,tw,vi}.json`).

## Functional Requirements

### A. ElvGames asset copy (first, before any deletion)

- FR-1. **Copy every ElvGames file to `~/Desktop/Asset Packs/`.** The owner decision of 2026-10-11 puts
  this step first.
  - Target folder: `~/Desktop/Asset Packs/monorepo-elvgames-20261011/`. Keep the repository path of
    each file under it. Do not change the original zips that the folder already holds.
  - Source list (tracked files at `ca8869cea`; check it again at the start, R-2):

    | Source | Files | Size | Content |
    | --- | --- | --- | --- |
    | `packages/advantage-play-kit/assets/standard/` | 72,613 | 451 MB | The licensed library with `LICENSE-ELVGAMES.txt`, `IMPORT-RECEIPT.tsv`, `licenses/` |
    | `packages/advantage-play-kit/assets/review/` | 183 | 108 MB | The slicing data: cut lists, `cut-editor.html`, `crop-cutlist.py`, cut lines |
    | `packages/advantage-play-kit/assets/play-maps/` | 10 | 456 KB | Maps made from ElvGames tiles |
    | `apps/primary-advantage/public/assets/apk/standard-pack-qc/` | 77 | 804 KB | The sliced sprites that the apps serve |
    | `apps/reading-advantage/public/assets/apk/standard-pack-qc/` | 77 | 804 KB | Same pack in Reading Advantage |
    | `apps/advantage-games/public/assets/apk/standard-pack-qc/` | 77 | 804 KB | Same pack in Advantage Games |
    | `packages/advantage-play-kit/scripts/import_elvgames_assets.py` and `scripts/__tests__/test_import_elvgames_assets.py` | 2 | — | The import script |
    | `packages/game-cartridges/scripts/{materialize-catalog-world-art.py,build-asset-review-pages.py,compose-play-map.py,export-play-map.ts}` | 4 | — | The slicing and map scripts |
    | `packages/game-cartridges/src/*standard-art*.ts` | 7 | — | The frame data of the sliced sprites |
    | `apps/advantage-games/scripts/generate-standard-pack-qc-preview.mjs`, `apps/advantage-games/src/lib/apk/standard-pack-qc-preview.json` | 2 | — | The preview pack builder |

  - Write `MANIFEST.tsv` in the target folder: one line for each file, with the repository path and the
    size in bytes.
  - Check the copy before any deletion: `diff -rq` of each folder gives no output, `cmp` of each single
    file gives no output, the manifest line count is the source file count, and the size sums agree.
  - Free disk space at the start: 13 GB. The copy needs about 561 MB. Stop if less than 2 GB is free.
  - Write the result (paths, counts, sizes, the compare result) in
    `measure/tracks/primary_parity_cleanup_20261011/asset-copy.md`. Tell the owner the folder path.
  - No other location holds ElvGames work: the other checkouts (`reading-advantage-monorepo`,
    `reading-advantage-monorepo-3d`, `rama-worktrees/lane-h`) have only build output
    (`packages/game-cartridges/dist`, `coverage`) as untracked files there.

### B. System Testing page (SYS-04)

- FR-2. **Remove the System Testing page and `deleteAllArticles` completely.** Nobody, SYSTEM included,
  can delete all articles (owner note, SYS-04).
  - Routes that go: `/[locale]/system/test`.
  - Files that go: `app/[locale]/system/test/{page.tsx,article-test-genarate.tsx,audio-test.tsx,audio-test-word.tsx,generate-images.tsx,upload-test.tsx,roles-management.tsx}`
    and `actions/test.ts` (all six exports: `generateAudios`, `generateWordAudios`,
    `uploadArticleImages`, `deleteArticleFile`, `deleteAllArticles`, `generateImages`). Their only
    callers are the page files and the test below.
  - Tests that go: `actions/__tests__/test-actions.authorization.test.ts`.
  - Nav item that goes: `configs/system-page-config.ts:26-30` (`title: "testing"`, `href: "/system/test"`).
  - Message key that goes: `Sidebar.testing`.
  - Test that changes: `components/nav/__tests__/app-nav.test.tsx:74-79` (the SYSTEM list has no
    "testing").
  - Stays: `canRunContentTooling` and `CONTENT_TOOLING_ROLES` (`lib/authorization.ts:11`, `:98-103`),
    because `app/api/upload/csv/cleanup/route.ts:6` uses them. `utils/storage.ts` stays.
  - After the removal, no Primary code deletes all rows of `articles`. The only article delete is
    `deleteArticleByIdModel` (`server/models/articleModel.ts:581-598`), and FR-3 removes it.

### C. Admin Article Creation (ADM-11)

- FR-3. **Remove Admin Article Creation and the server code that only it uses.** The owner follow-up
  decision replaces the triage choice "keep": Workbooks and mastery-advantage make all content.
  - Routes that go: `/[locale]/admin/article-creation`;
    `GET` and `POST /api/articles/generate/custom-generate`;
    `POST /api/articles/generate/custom-generate/save`;
    `POST /api/articles/generate/custom-generate/approve`.
  - Files that go: `app/[locale]/admin/article-creation/page.tsx`, `components/admin/article-creation.tsx`,
    `app/api/articles/generate/custom-generate/{route.ts,save/route.ts,approve/route.ts}`.
  - Server exports that go: in `server/controllers/articleController.ts`, `generateCustomArticle`
    (`:166`), `saveArticleAndPublish` (`:204`), `saveArticleAsDraft` (`:236`),
    `fetchCustomArticleController` (`:260`), and the dead `deleteArticleById` (`:133`). In
    `server/models/articleModel.ts`, `saveArticleAsDraftModel` (`:687`), `getCustomArticle` (`:727`),
    `createdArticleCustom` (`:737`), `updateAprovedCustomArticle` (`:793`), `deleteArticleByIdModel`
    (`:581`), and the dead `checkExistingArticle` (`:879`). In `actions/article.ts`,
    `getDeleteArticleById` (`:66-70`).
  - Nav item that goes: `configs/admin-page-config.ts:113-118` (`title: "articlecreation"`).
  - Quick action that goes: the `createArticle` entry of `components/admin/admin-quick-actions.tsx:36-42`,
    with the keys `AdminDashboard.quickActions.createArticle` and `createArticleDesc`. No page renders
    this component (`app/[locale]/admin/page.tsx:22` imports it only). If
    `primary_parity_admin_dashboard_20261011` deleted the file first (its FR-17), skip this item.
  - Message keys that go: `Sidebar.articlecreation`, `AdminArticleCreationPage`,
    `Components.AdminArticleCreation`.
  - Tests that change: `components/nav/__tests__/app-nav.test.tsx:67-73` (the admin list has no
    "articlecreation"); `components/__tests__/broken-ux-behavior.test.tsx:104-115` (add
    `/admin/article-creation` to the list of dead links), if the quick actions file still exists.
  - Stays: `data/genres.json` (`app/[locale]/(student)/student/read/page.tsx:2` reads it);
    `fetchArticles` and `fetchArticleById` (`articleController.ts:92`, `:112`); `actions/article.ts`
    `fetchArticleActivity` (`:77`) and `getLessonSummaryData` (`:96`).
  - The removal leaves no way to publish or delete an article in Primary. This agrees with the shared
    decision "The app has no content generation".

### D. Content generation code

- FR-4. **Remove the bulk article generation and the generators.** After FR-2 and FR-3, only the bulk
  route still calls the generators. The shared decision "The app has no content generation" covers it.
  - Routes that go: `POST /api/articles/generate` (`app/api/articles/generate/route.ts`).
  - Exports that go: `actions/article.ts` `generateArticle` (`:42`), `generateArticleNew` (`:54`), and
    `requireToolingAccess` (`:30`, no caller after the removal); `articleController.ts`
    `generateAllArticleNew` (`:29`) and `generateAllArticle` (`:53`); `articleModel.ts`
    `saveArticleContent` (`:186`), `generateQuestions` (`:269`), and `generateArticles` (`:306`), with
    the generator imports (`:21-40`); `lib/authorization.ts` `amountPerGenreSchema` (`:295`);
    `lib/zod.ts` `articleGeneratorSchema` (`:168`) and `storyGeneratorSchema` (`:283`).
  - Files that go: all of `server/utils/generators/` (16 files: `article-generator`,
    `audio-flashcard-generator`, `audio-generator`, `audio-word-generator`, `evaluate-rating-generator`,
    `image-generator`, `la-question-generator`, `mc-question-generator`, `new-generator`,
    `question-generator`, `random-select-genre`, `sa-question-generator`, `sentence-translator`,
    `story-generator`, `topic-generator`, `wordlist-generator`); `server/utils/constants.ts` and
    `server/utils/logging.ts` (only generators import them).
  - Data files that go (only the generators read them): `data/cefr-article-prompts.json`,
    `data/new-article-prompts.json`, `data/new-level-evaluation-prompts.json`,
    `data/prompts-combined-{LA,MC,SA}.json`, `data/title-a0.json`, `data/title-a1.json`,
    `data/title-a2.json`, and the scratch files `data/audios/{articles,sentences,words}/temp.mp3` and
    `data/images/temp.jpg`. Check each name with `git grep` first (R-2); `question-generator.ts:39`
    builds the file name at run time.
  - Tests that go: `app/api/articles/generate/__tests__/route.test.ts`,
    `server/utils/generators/__tests__/new-generator.test.ts`,
    `server/utils/generators/__tests__/new-generator.caller.test.ts`, `server/__tests__/writer-contracts.test.ts`.
  - Tests that change: `actions/__tests__/article-actions.authorization.test.ts` (keep the case at `:66`
    for `fetchArticleActivity`; remove the case at `:46` and the mocks of removed exports);
    `server/models/__tests__/writerModels.behavior.test.ts` (remove the `saveArticleContent` cases at
    `:115-130`; keep the lesson progress and user cases); `server/models/__tests__/articleModel.questions.test.ts`
    (remove the generator mocks at `:25-26`); `components/__tests__/component-deduplication-behavior.test.tsx:612`
    (remove the path of `article-generator.ts`); `lib/__tests__/authorization.test.ts:16`, `:112-117`
    (remove the `amountPerGenreSchema` case).
  - Stays: `data/prompts-ai.ts` and `data/prompts-feedback-user-{SA,LA}.json` (the SAQ/LAQ feedback reads
    them, `server/utils/assistant.ts:1`, `:53`, `:120`); `data/genres.json`.

### E. Old game host (M4, safe scope)

- FR-5. **Tell the Forge session before the removal.** Send the message in plan Phase 6, and wait for
  the answer. The message names: the Primary files that go (FR-7, FR-8, FR-9), the two shared play-kit
  files that change (FR-6), and the one Primary build of Phase 6. It asks two questions: does a Forge
  sync or check read or write one of these paths, and does Forge need the Primary `standard-pack-qc`
  files. Facts for the message: `advantage-forge/scripts/monorepo-sync.ts` writes
  `packages/advantage-play-kit-3d`, `packages/game-cartridges-3d`, `apps/primary-advantage/public/rpg/`,
  `apps/primary-advantage/public/packs/avatar/`, and `packages/advantage-play-kit/src/responsive/renderer.ts`
  (`:20-23`, `:76`, `:204`). None of these paths changes in this track.
- FR-6. **Show the class challenge panels without ElvGames frames.** Today the two shared panels set
  the ElvGames frame URL inline. The inline value wins over the skin variables of `.cq-world`
  (`apps/primary-advantage/styles/rpg.css:32-35`). So `/student/games` and `/teacher/game-challenges`
  load `/assets/apk/standard-pack-qc/apk-ui-*.png` today.
  - Evidence: `packages/advantage-play-kit/src/react/student-challenge-catalog-panel.tsx:54-58` (button)
    and `:180` (panel); `packages/advantage-play-kit/src/react/teacher-challenge-panel.tsx:47-51` and
    `:215`. The shared theme already reads the variables (`presentation/retro-arcade-theme.ts:19`,
    `:42-43`).
  - Change: the two panels read `--apk-arcade-panel-image`, `--apk-arcade-button-primary-image`, and
    `--apk-arcade-button-secondary-image`, with the current URL as the fallback, as
    `retro-arcade-theme.ts` does. Only Primary sets these variables (`git grep` at `ca8869cea`), so
    Reading Advantage and Advantage Games keep the same look.
  - Primary sets the variables on the teacher page too. The teacher area is outside `.cq-world`
    (`components/shared/app-layout.tsx:54` wraps the student shell only). The frame of the teacher page
    is `FIELD_FRAME` in `app/[locale]/teacher/game-challenges/page.tsx:15-19`.
  - The design (Phase 2) decides the panel surface. If the design changes the navy surface
    (`background: "#0f172a"`), add one variable with the current value as the fallback.
- FR-7. **Remove the host-proof surface.**
  - Routes that go: `/[locale]/student/host-proof/games`; `POST /api/host-proof/games/completions`.
  - Files that go: `app/[locale]/(host-proof)/layout.tsx`, `app/[locale]/(host-proof)/student/host-proof/games/page.tsx`,
    `app/api/host-proof/games/completions/route.ts`, `components/host-proof/HostProofGameClient.tsx`,
    `lib/host-proof-config.ts`.
  - Tests that go: `components/host-proof/__tests__/HostProofGameClient.test.tsx`,
    `lib/__tests__/api/host-proof-games-completions.test.ts`, `lib/__tests__/host-proof-config.test.ts`,
    `lib/__tests__/host-proof-bundle-isolation.test.ts`, `tests/e2e/host-proof-games.spec.ts`.
  - Tests and config that change: `host-proof-test-config.ts:44-46` (the web server command drops
    `HOST_PROOF_ENABLED=true`) and `lib/__tests__/host-proof-test-config.test.ts:27-31`;
    `lib/__tests__/api-no-direct-db.test.ts:32` and `:76` (remove the `"host-proof"` segment).
  - Stays: the e2e fixture (`host-proof-test-config.ts`, `scripts/seed-host-proof-session.ts`,
    `tests/e2e/host-proof-auth.setup.ts`, `playwright.config.ts`, `lib/__tests__/host-proof-playwright-config.test.ts`),
    because `tests/e2e/authenticated-apk-lifecycle.spec.ts` uses the seeded student session. The domain
    module `packages/domain/src/games/host-proof.ts` stays, because
    `apps/reading-advantage/app/api/host-proof/games/completions/route.ts:14` uses it.
  - Primary has no other QC page. The host-proof client is the only Primary user of
    `@reading-advantage/game-cartridges/qc` (`HostProofGameClient.tsx:18`, `:125`).
- FR-8. **Remove the old student host and the package dependency.**
  - Files that go: `components/apk/StudentCartridgeHost.tsx`, `components/apk/apk-host-layout.ts`,
    `lib/apk/realm-carver-input.ts` (only the old host uses them).
  - Tests that go: `components/apk/__tests__/StudentCartridgeHost.test.tsx`,
    `lib/apk/__tests__/realm-carver-input.test.ts`.
  - Tests that change: `components/__tests__/structural-alignment-i18n.test.tsx` (remove the mock at
    `:127`, the import at `:169`, and the cases that render the old host at `:233-326`);
    `components/__tests__/loading-state-content.behavior.test.tsx` (remove the mock at `:110`, the import
    at `:147`, and the block at `:189-220`); `app/api/v1/apk/__tests__/challenge-routes.test.ts:26-29`
    (remove the stale mock). If `components/games/__tests__/game-host.test.tsx` has no case for the
    translated `ApkHost.readMode`, `listenMode`, and `signInToPlayChallenge` labels, move the removed
    label checks there.
  - Config that changes: `apps/primary-advantage/package.json:59` (remove
    `@reading-advantage/game-cartridges`), `apps/primary-advantage/next.config.ts:18` (remove it from
    `transpilePackages`), and `pnpm-lock.yaml` (the Primary importer). The Dockerfile installs with
    `--frozen-lockfile` (`apps/primary-advantage/Dockerfile:14`), so the lockfile change is required.
  - Message keys: none go. `components/games/game-host.tsx:66` uses every `ApkHost` key.
- FR-9. **Ship no ElvGames file in Primary.**
  - Files that go: `apps/primary-advantage/public/assets/apk/standard-pack-qc/` (77 files).
  - The build output must hold no ElvGames file. A local build of 2026-10-08 holds 233
    `standard-pack-qc` files of three apps in `.next/standalone` (77 for each app). The standalone
    folder also holds the files of 12 apps (for example `apps/advantage-games` 435 MB and
    `apps/www-reading-advantage` 507 MB). The Dockerfile copies this folder into the image
    (`Dockerfile:30`). 62 trace files (`.next/server/**/*.nft.json`) name `standard-pack-qc`.
  - After FR-4, FR-7, and FR-8, build once and check the standalone folder. If ElvGames files are still
    in it, add `outputFileTracingExcludes` in `apps/primary-advantage/next.config.ts` for
    `**/assets/apk/standard-pack-qc/**` and `**/advantage-play-kit/assets/**`. Do not try to fix the
    full trace of the other apps in this track (Out of Scope; record it, FR-14).

### F. Old game URLs (STU-09)

- FR-10. **Send the five old game URLs to the new 3D game with the same id.**
  - Legacy routes (`bfea121`): `app/[locale]/(student)/student/games/vocabulary/{dragon-rider,enchanted-library,rpg-battle,rune-match}/page.tsx`
    and `app/[locale]/(student)/student/games/sentences/potion-rush/page.tsx`.
  - Targets: `/[locale]/student/games/apk/<id>` with the same id. Each id is a playable 3D game
    (`packages/game-cartridges-3d/src/registry.ts:80`, `:98`, `:143`, `:233`, `:287`, each with
    `manifest` and `load`).
  - Place: the app has no redirect list in `next.config.ts` or `proxy.ts`. It uses page-level redirects
    from `@/i18n/navigation` (`app/[locale]/(student)/student/games/apk/[cartridgeId]/page.tsx:45`). New
    pages `app/[locale]/(student)/student/games/vocabulary/[gameId]/page.tsx` and
    `app/[locale]/(student)/student/games/sentences/[gameId]/page.tsx` call `permanentRedirect` (HTTP 308)
    with the locale. An id that is not in the old list gives `notFound()`.
  - The map of old paths lives next to `LEGACY_GAME_IDS` in `lib/games/catalog.ts:12-15`.
  - `i18n/navigation.ts:6` exports no `permanentRedirect` today. Add it with the same line that branch
    `primary/public-pages` uses (`export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } =`),
    so the merge gives no conflict.
  - A signed-out visitor gets the sign-in page first, because `/student` is a protected route
    (`proxy.ts:58-71`, `lib/route-policies.ts:17`).

### G. AI models in the adapter configuration (CNT-02)

- FR-11. **Extend the AI adapter (`packages/ai`).**
  - Add the provider `vertex` (Google Vertex AI with a service account). Use `createVertex` from
    `@ai-sdk/google-vertex` (already a dependency, `packages/ai/package.json:31`). The installed v3.0.143
    supports the location `global` (`dist/index.js:350`). The config gives the project, the location,
    and the credentials; the defaults read `VERTEX_CLIENT_EMAIL` and `VERTEX_PRIVATE_KEY`. A missing
    value throws `ProviderNotConfiguredError("vertex", ...)`.
  - Add the optional `system` field to `GenerateObjectInput` (`packages/ai/src/types.ts:7-18`). Every
    provider passes it to the model call. `StreamTextInput` already has `system` (`types.ts:164`).
  - Add `vertex` to the allowlist pattern of `src/__tests__/wave2-provider-architecture-guard.test.ts:81`.
- FR-12. **Set the legacy models in one Primary configuration module.**
  - New module `apps/primary-advantage/lib/ai/models.ts`. It holds two task settings and makes the
    adapter clients with `createAIClient`:
    - `qa.feedback`: provider `vertex`, location `global`, model from the live legacy row (seed value
      `gemini-3-flash-preview`, legacy `prisma/seed/aiProviderRegistry.ts:136-138`).
    - `chatbot.stream`: provider `openai`, model from the live legacy row (seed value `gpt-4o-mini`,
      `:143-145`).
  - The live values: read the rows of `ai_task_configs` and `ai_providers` from the C4 backup
    `gs://backupsqldatabase/Backup_Primary_2026-10-11.sql.gz` with `zcat` and `grep`, read-only. The
    legacy seed uses `update: {}` (`aiProviderRegistry.ts:14`, `:190`), so a SYSTEM user could change a
    row after the seed. Use the live model id and the live temperature, if the row has one (legacy
    `server/ai/modelResolver.ts:127-159` passes it). If the live provider is not Vertex or OpenAI, stop
    and ask the owner.
  - Overrides: `PRIMARY_AI_FEEDBACK_MODEL` and `PRIMARY_AI_CHATBOT_MODEL` replace the default model ids.
    A Zod schema checks each value (letters, digits, `.`, `_`, `:`, `/`, `-`). A bad value throws at the
    first use. This follows `resolveCodecampTutorModel` (`packages/domain/src/__tests__/codecamp-tutor.test.ts:69-70`).
    The overrides let the owner replace a retired preview model with no code change.
  - The project comes from `PROJECT_ID`. Production already sets `OPENAI_API_KEY`,
    `VERTEX_CLIENT_EMAIL`, `VERTEX_PRIVATE_KEY`, and `PROJECT_ID`
    (`apps/primary-advantage/cloudbuild.yaml:74-77`, `:83`). No deploy change is necessary.
- FR-13. **Move the two AI callers to the adapter.**
  - `server/utils/assistant.ts` (`getSaqFeedback` `:23`, `getLaqFeedback` `:91`) calls the feedback
    client `generateObject` with `system`, `schema`, and `prompt`, as today (`:76-81`, `:141-146`).
  - `app/api/assistant/lesson-chatbot/route.ts:114-117` calls the chatbot client `streamText` with
    `system` and the messages. The route keeps its JSON response (`:130-136`). Its `console.error`
    calls (`:140`, `:144`) change to `logger.error`.
  - Each call logs `logger.info("ai_call", { task, provider, model, durationMs })`, as legacy logs the
    task and the model (`formatTaskLog`, legacy `server/utils/assistant.ts:73-77`).
  - Files that go: `utils/google.ts`, `utils/openai.ts`. After FR-4 and this FR, no Primary file imports
    `@reading-advantage/ai/internal-sdk`.

### H. Records

- FR-14. **Update the records.**
  - `measure/tech-debt.md:65` ("/system/test"): set the status to `Resolved`, with this track ID.
  - `measure/tech-debt.md:11` ("ElvGames art still ships"): keep it `Open`. Change the text: Primary
    ships no ElvGames file; the play-kit library (`assets/standard`, `review`, `play-maps`), the Reading
    Advantage and Advantage Games preview packs, and `packages/game-cartridges` stay until M3 and
    `apk_elvgames_audit_20261006`.
  - `docs/primary-games-integration.md:87-90` ("Legacy host"): the old host and the host-proof pages
    are removed; the package stays for the other apps until M3.
  - `docs/primary-whats-moved.md:83` and `:91`: mark `/admin/article-creation` and `/system/test` as
    removed (after the change of `primary_parity_records_20261011`).
  - `docs/primary-rpg-skin.md:17`: the rule "No ElvGames asset anywhere in the app" is now true; add
    the play-kit frame variables of FR-6.
  - Tell `primary_parity_rehearsal3_20261011`: the five public files of R7 stay the same; add one check
    that `/assets/apk/standard-pack-qc/apk-ui-panel-square.png` returns 404.
  - Tell `primary_parity_lesson_games_20261011` that this track is complete.

## What stays, and why (M4 safe scope)

| Item | Reason |
| --- | --- |
| `packages/game-cartridges` | Reading Advantage (19 files) and Advantage Games (21 files) import it. It goes with M3 (set overview, "Later Work"). |
| `packages/advantage-play-kit/assets/{standard,review,play-maps}` | The source library of the old cartridges and the play-kit scripts. It goes with M3 and `apk_elvgames_audit_20261006`. The copy of FR-1 keeps it outside the repository. |
| `apps/reading-advantage/public/assets/apk/standard-pack-qc/`, `apps/advantage-games/public/assets/apk/standard-pack-qc/` | Those apps still render the old host. |
| `apps/advantage-games/src/app/qc/` and its tests | The QC pages of Advantage Games (M3). |
| The play-kit defaults `RETRO_ARCADE_UI_ASSETS` (`retro-arcade-theme.ts:3-10`) and `rpg-reward-assets.ts:6` | The fallback for the other apps. Primary sets the variables and passes its own reward icons (`lib/rpg/places.ts:77`). |
| `packages/domain/src/games/host-proof.ts` and its tests | The Reading Advantage host-proof route uses it. |
| The tables `standard_pack_successor_*` (`packages/db/src/schema/standard-pack-successor-*.ts`) | Shared schema. A drop is a destructive migration (R-1). |
| The Primary e2e fixture with "host-proof" in its names | `authenticated-apk-lifecycle.spec.ts` uses the seeded student. A rename is not necessary. |
| `apps/primary-advantage/public/assets/apk/primary-chibi-2d/` | A Forge pack (git-ignored, synced by `sync-assets.mjs`), not ElvGames. |

## Migrated data: checks on the rehearsal copy

No FR changes or deletes a database row. Run these read-only checks on the matched copy of the
acceptance kit (2 or 3 students, never 25):

| FR | Read-only check | Expected |
| --- | --- | --- |
| FR-3 | Count the articles with `author_id IS NOT NULL AND is_public = false` (custom drafts). | Record the count. The rows stay. If the count is more than 0, ask Q2. |
| FR-6, FR-8 | Count `game_challenges` and the game completions with a legacy game id (`wizard-vs-zombie`, `labyrinth-goblin-king`). | The rows stay. `gameFor` still maps them (`lib/games/catalog.ts:12-27`). |
| FR-12 | Read `ai_task_configs` and `ai_providers` for `qa.feedback` and `chatbot.stream` from the C4 dump. | The values in `lib/ai/models.ts` agree with the live rows. |

## Evidence corrections

- E-1. SYS-04: the evidence is correct (`configs/system-page-config.ts:27`, `system/test/page.tsx:23`,
  ADMIN in `CONTENT_TOOLING_ROLES`, `lib/authorization.ts:11`). Legacy hides the item with a comment
  (legacy `configs/system-page-config.ts:53-54`). One more fact: `deleteAllArticles` also deletes the
  storage file of each article (`actions/test.ts:114-117`). The owner decision (remove) replaces the
  triage advice (hide, SYSTEM only, confirm).
- E-2. ADM-11: the triage says "SAME, keep". The owner follow-up decision removes it. The page also
  needs `actions/article.ts:66-70` and three `custom-generate` routes, not only
  `articleController.ts:166-275`.
- E-3. CNT-02: "article creation, CEFR rating, images" belong to the generators that FR-4 removes.
  After the removal, only the SAQ/LAQ feedback and the lesson chatbot use AI. The chatbot already uses
  the legacy seed model `gpt-4o-mini` (`utils/openai.ts:7`). Only the feedback differs: `gemini-2.5-flash`
  at `us-central1` (`utils/google.ts:8-20`) against the seed `gemini-3-flash-preview` at `global` (legacy
  `utils/google.ts:6`). `withAiRetry` and the CEFR band check belong to the legacy generator, not to
  the feedback, so nothing of them remains to port. The seed values can differ from the live rows (FR-12).
- E-4. STU-09: the evidence is correct. The app has no redirect list. It uses page-level redirects
  (FR-10). The five ids have the same names in the 3D registry, so no id map is necessary.
- E-5. M4 follow-up: "Remove packages/game-cartridges ... before the cutover" is not possible in one
  step. Reading Advantage and Advantage Games import the package (Q1).
- E-6. `docs/primary-rpg-skin.md:17` and the comment at `lib/rpg/places.ts:77` say that Primary shows
  no ElvGames picture. The class challenge panels load ElvGames frames on `/student/games` and
  `/teacher/game-challenges` (FR-6). The tech-debt row does not list them.
- E-7. Removing `public/assets/apk/standard-pack-qc/` alone does not remove ElvGames files from the
  Primary image. The file trace copies the packs of three apps, and the files of other apps, into
  `.next/standalone` (FR-9).
- E-8. The M4 text names "QC pages". Primary has no QC page. The QC pages are in Advantage Games
  (`apps/advantage-games/src/app/qc/`); the Primary host-proof client loads the QC loader (FR-7).

## Member questions (for the owner)

- Q1. M4 scope. The follow-up decision removes `packages/game-cartridges` before the cutover. Reading
  Advantage and Advantage Games still import it. Default: this track removes the Primary part only;
  the package, the play-kit library, and the other preview packs go with M3 after the cutover. The
  other choice moves M3 before the Primary cutover (a large port of two apps).
- Q2. Custom drafts (only if the FR-3 data check finds rows). After FR-3, nobody can publish or delete a
  custom draft in Primary. Default: leave the rows; students do not see them.

## Non-Functional Requirements

- NFR-1. No new dependency. `pnpm-lock.yaml` changes only for the removed Primary dependency.
- NFR-2. Reading Advantage and Advantage Games show the same challenge panels as before. Their play-kit
  tests pass with no change of the expected values.
- NFR-3. No new hash, checksum, or manifest hash (R-4).
- NFR-4. One heavy job at a time on this machine (R-7).

## Acceptance Criteria

The acceptance kit writes these rows into
`measure/tracks/primary_parity_cleanup_20261011/acceptance-pairs.json`. Each row names the legacy page,
the new page, the role, and the observable behavior.

| Row | Legacy page (`bfea121`) | New page | Role | Observable behavior |
| --- | --- | --- | --- | --- |
| AC-1 (FR-2) | `/en/system/test` (no nav item) | `/en/system/test` | SYSTEM | The new app gives the not-found page. The SYSTEM nav has no "Testing". |
| AC-2 (FR-3) | `/en/admin/article-creation` | `/en/admin/article-creation` | ADMIN | The new app gives the not-found page. The admin nav has no "Article Creation". |
| AC-3 (FR-3, FR-4) | `POST /api/articles/generate`, `/api/articles/generate/custom-generate{,/save,/approve}` | same | ADMIN, SYSTEM | Each new route gives 404. No AI call starts. |
| AC-4 (FR-6) | — (no class challenges in legacy) | `/en/student/games` | STUDENT | The challenge panel shows the skin frame. The network log has no request to `/assets/apk/standard-pack-qc/`. |
| AC-5 (FR-6) | — | `/en/teacher/game-challenges` | TEACHER | The panel shows the staff frame of the design. The network log has no request to `/assets/apk/standard-pack-qc/`. |
| AC-6 (FR-7) | — | `/en/student/host-proof/games`, `POST /api/host-proof/games/completions` | STUDENT | Both give 404. |
| AC-7 (FR-9) | — | `/assets/apk/standard-pack-qc/apk-ui-panel-square.png` | PUBLIC | 404. The build output check finds no ElvGames file. |
| AC-8 (FR-10) | `/en/student/games/vocabulary/rune-match` (and the other four) | same URLs | STUDENT | Each URL redirects (308) to `/en/student/games/apk/<id>`, and the 3D game loads. `/th/...` keeps `th`. An unknown id gives 404. |
| AC-9 (FR-12, FR-13) | `/en/student/lesson/<articleId>`, SAQ and LAQ tasks | same | STUDENT | The feedback and the score show. The server log line `ai_call` names the provider and the model of the live legacy row. |
| AC-10 (FR-13) | the lesson chatbot | same | STUDENT | The chatbot answers. The log line names `openai` and the live model. |

Track-level gates:

- AC-11. Each grep check of the plan gives no output. `pnpm --filter primary-advantage test`,
  `pnpm --filter @reading-advantage/ai test`, and `pnpm --filter @reading-advantage/advantage-play-kit test`
  pass. tsc and ESLint pass on the changed packages (one at a time).
- AC-12. `asset-copy.md` shows a complete copy (FR-1) before the first deletion commit.
- AC-13. The owner accepts the design captures (Phase 2) and the side-by-side report.

## Out of Scope

- M3: the removal of `packages/game-cartridges`, the play-kit ElvGames library, the Advantage Games QC
  pages, and the ElvGames files of Reading Advantage and Advantage Games (set overview, "Later Work").
- The interim credit line, the CI gate for ElvGames paths, and the cartridge art swap of the other apps
  (`apk_elvgames_audit_20261006`).
- A fix of the full file trace of `.next/standalone` (other apps in the Primary image). FR-9 removes only
  the ElvGames files from it. Record the finding for the owner (FR-14).
- An AI model registry page (SYS-06), the AI insights (SYS-02), and the voice feature model
  (`server/controllers/voiceController.ts:43` uses `getAIClient()`).
- Data files that no code reads today: `data/A0-story-example.json`, `A1-story-example.json`,
  `A2-story-example.json`, `cefr-level-evaluation-prompts.json`, `level-test.json`, `story-prompts.json`,
  `story-schema.ts`, `whats-my-level-mean.json`. The dead flashcard exports `fetchAllFlashcards` and
  `deleteFlashcardByIdAction` (`articleController.ts:137`, `:152`).
- The stale old paths (`genaretors`) in `packages/architecture-enforcement/src/config/baselines/provider.v{1,2}.json`
  and `analyzer-reconciliation.v1.json`, and the history documents `packages/api/docs/route-audit.md`
  (2026-05-02) and `docs/primary-advantage-ux-refactor-plan.md`.
- Any change to the cutover runbook, the ETL, or the database schema (R-1).
