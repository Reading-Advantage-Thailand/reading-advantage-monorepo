# Plan: Storytime sign-in LCP art

> **Track ID:** `storytime_speed_hill_climb_20261123` · **Spec:** [spec.md](./spec.md)
> **Strategy:** [test-strategy.md](./test-strategy.md)
> **Source:** PM decision 2026-11-23. Owner words: Daniel, 2026-11-23: "Sounds good".
> **Priority:** P1. Storytime is the critical path for the 30 Nov launch.
> **Branch:** `storytime/speed-20261123` in `/home/daniebo/Desktop/rama-worktrees/storytime-speed`.

## Rules for this plan

1. Markers: `[ ]` pending, `[~]` in progress, `[x]` done, `[b] … deferred:<owner>` at a human gate.
2. Each completed step names its commit and its evidence class: automated, person-checked, or owner-passed.
3. Red comes first. The Red test fails at the base, and the failure is an assertion on the page or the files.
4. Green makes the Red test pass with the smallest change. Green does not edit a Red assertion.
5. Commit with a pathspec over named files. Each header carries `(track_id: storytime_speed_hill_climb_20261123)` and stays at 100 characters or less.
6. Every heavy command runs through `/home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh` with `HEAVY_PRIORITY=p1`.
7. Lighthouse runs only through `heavy-run.sh`, with the same binary and profile as the baseline report: `/tmp/storytime-speed/node_modules/.bin/lighthouse`, mobile preset, 3 runs, median.
8. Allowed write paths: `apps/storytime/app/[locale]/entry/entry-art.tsx`, `apps/storytime/app/look/places/path-d-720.webp`, `apps/storytime/app/look/places/path-d-1280.webp`, `apps/storytime/app/look/places/path-p-720.webp`, `apps/storytime/app/look/places/path-p-960.webp`, `apps/storytime/__tests__/entry-art-lcp.test.tsx`, and this track folder.
9. No deploy, no traffic move, no Cloud Run setting, no new dependency, no lockfile change, and no hash field.
10. The change joins the launch-day deploy batch. That batch needs Daniel's word. This plan holds no deploy task and no traffic task.

## Phase 1: The sign-in LCP art

Scope: `EntryArt` on `/sign-in` and on the signed-out `/st` redirect, plus the WebP candidates and the TTFB line.

- [x] 1.1 Red and Green: the eager sign-in art, the WebP candidates, and the TTFB line. Test: AC-1 to AC-5 and AC-9. Evidence class: automated (commands and review reports), person-checked (the browser look of task 1.1.7). Commits: 4865f0273 (Green).
  - [x] 1.1.1 Red: write `apps/storytime/__tests__/entry-art-lcp.test.tsx` and show it fail at the base. Test: AC-1, AC-2, AC-3, AC-4. Evidence class: automated.
    Pre-gate: the worktree holds no `node_modules`, and `heavy-run.sh` installs nothing. Before the first run, install the workspace dependencies through heavy-run with `pnpm install --frozen-lockfile`, then confirm `git diff --exit-code pnpm-lock.yaml`. A lockfile change stops the task.
    The file renders the sign-in page through `renderToStaticMarkup`, as `entry-signin-layout.test.tsx` does, with the same mocks: `next/navigation`, `next-intl/server`, `next/headers`, and `../lib/auth`. It holds these cases:
    1. `picture[data-entry-art]` exists, and its img holds `loading="eager"` and `fetchpriority="high"`. At the base the img holds `loading="lazy"` and no `fetchpriority`.
    2. The img `srcset` holds three candidates with the width descriptors `720w`, `1280w`, and `1920w`, it names `path-d-720.webp` and `path-d-1280.webp`, and the last descriptor is `1920w`. The img holds a `sizes` value that names `100vw`.
    3. The `source` with `media="(min-width: 980px)"` holds a `srcset` with the descriptors `720w`, `960w`, and `1080w`, it names `path-p-720.webp` and `path-p-960.webp`, and it holds a `sizes` value.
    4. The four candidates exist under `apps/storytime/app/look/places/`, start with the WebP signature, and hold their pinned size: `path-d-720.webp` 720×405, `path-d-1280.webp` 1280×720, `path-p-720.webp` 720×1280, and `path-p-960.webp` 960×1707. The file check reads the WebP header with its own reader, as `look-assets.test.ts` does. It adds no dependency.
    5. `path-d-720.webp` is 30000 bytes or less, and `path-d-1280.webp` is 75000 bytes or less. The case prints `path_d_720_bytes=<n>`, `path_d_1280_bytes=<n>`, `saving_720_bytes=<n>`, and `saving_1280_bytes=<n>`.
    6. `proxy(request("/th/st"))` answers 307 to `/th/sign-in?next=%2Fth%2Fst`, and the render of that target holds the art of case 1. The case builds the proxy request and reads the redirect target, as `login-proxy.test.ts` does.
    - Red command: `HEAVY_PRIORITY=p1 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/storytime-speed/apps/storytime && CI=true ../../node_modules/.bin/vitest run __tests__/entry-art-lcp.test.tsx'`
    - Expected at the base: exit 1. Cases 1 to 5 fail on the lazy img or a missing file. Case 6 passes the redirect and fails the art assertion.
    - Commit: `test(storytime): pin the eager sign-in art (track_id: storytime_speed_hill_climb_20261123)`, with the test file only.
    - Red evidence 2026-11-23: the install pre-gate passed with no lockfile change. The Red command exits 1 with 6 failed cases. L1 fails on loading="lazy", L2 on srcset count 0, L3 on source srcset count 1, L4 and L5 on the missing path-d-720.webp, and L6 passes the 307 redirect and fails the art. The app suite shows 23 failed files and 234 failed tests; the new file holds 6 of them and the other 22 fail without it (unbuilt backend dist, missing run artifacts). tsc shows 14 base errors in untouched files; the new file adds none. Commits: 25a5a3abf319748d315085c8d266a4527a115efa.
  - [x] 1.1.2 Green: make the art eager and add the four WebP candidates. Test: AC-1, AC-2, AC-3. Evidence class: automated. Commits: 4865f0273562306225bbbc311e8cbd5c8b7b077d.
    1. In `apps/storytime/app/[locale]/entry/entry-art.tsx`, import `path-d-720.webp`, `path-d-1280.webp`, `path-p-720.webp`, and `path-p-960.webp` as static assets beside the two originals.
    2. Give the img `loading="eager"`, `fetchpriority="high"`, `srcSet={`${landscape720Src} 720w, ${landscape1280Src} 1280w, ${landscapeSrc} 1920w`}`, and `sizes="calc(100vw - 40px)"`.
    3. Give the `source` `srcSet={`${portrait720Src} 720w, ${portrait960Src} 960w, ${portraitSrc} 1080w`}` and `sizes="480px"`.
    4. Keep `alt=""`, `width={1920}`, `height={1080}`, the two `data-entry-art` hooks, and every rule of `entry.css`. Change no other page and no other component.
    5. Make the four files from the originals with ffmpeg, for example `ffmpeg -y -i path-d.webp -vf scale=720:405 -c:v libwebp -quality 80 path-d-720.webp`. Name both numbers in `scale`, so the pinned size is exact: 1280:720, 720:1280, and 960:1707. Use sharp from the worktree `node_modules` only when ffmpeg holds no libwebp. No dependency enters `package.json`. Record the four byte counts.
    - Green command: the Red command above exits 0, with every case green.
    - Commit: `perf(storytime): load the sign-in art eagerly (track_id: storytime_speed_hill_climb_20261123)`.
  - [x] 1.1.3 Green: the TTFB line. Test: AC-9. Evidence class: automated (read-only source look). Commits: 4865f0273562306225bbbc311e8cbd5c8b7b077d.
    Read the sign-in route read only: `apps/storytime/app/[locale]/sign-in/page.tsx`, `apps/storytime/lib/auth/index.ts`, `apps/storytime/cloudbuild.yaml`, and the deploy runbook `docs/runbooks/storytime-deploy.md`. Record one line in this plan: the cause, a cold start or a server fetch, with the file and the line number. Make no fix. The starting evidence is D-4 of the spec. `getCurrentUser()` returns `null` at `lib/auth/index.ts:119`, before the first store read at line 121. The deploy config sets no `--min-instances`.
    TTFB cause: cold start. `apps/storytime/cloudbuild.yaml:44-51` deploys without `--min-instances`, so the service scales to zero; a signed-out render reads no store because `getCurrentUser()` returns `null` at `apps/storytime/lib/auth/index.ts:119` before the first store read at line 121. The baseline records TTFB 1250–2540 ms against a server response of about 500 ms. No fix in this track.
    - Commit: the plan record joins the next plan commit. No source file changes in this step.
  - [x] 1.1.4 Gate: the app tests, types, lint, and the build. Test: AC-5. Evidence class: automated. Commits: 4865f0273562306225bbbc311e8cbd5c8b7b077d.
    - `... heavy-run.sh -c 'cd <worktree>/apps/storytime && CI=true ../../node_modules/.bin/vitest run'` exits 1 with 2 failed files and 10 failed tests. All failures come from the absent gitignored `measure/runs/storytime_app_rebuild_20261025/media-list-w01.md`, which `phase5-media-list.test.ts:38` and `phase5-adversarial.test.ts:51` read. The phase base `e3b93ca33` shows the same failures, and this track touches neither test.
    - `... heavy-run.sh -c 'cd <worktree> && pnpm --filter storytime check-types'` exits 0.
    - `... heavy-run.sh -c 'cd <worktree> && pnpm --filter storytime lint'` exits 0.
    - `... heavy-run.sh -c 'cd <worktree> && pnpm --filter storytime build'` exits 0.
    - Record the baseline of the suite at the base before task 1.1.1. The gate must show the same failure set or better, and no larger one.
  - [x] 1.1.5 Gate: the local Lighthouse median. Test: AC-6. Evidence class: automated (command output). Commits: 4865f0273562306225bbbc311e8cbd5c8b7b077d.
    Run the build and a local server, then 3 Lighthouse mobile runs on `/th/sign-in` through `heavy-run.sh`. Read the median LCP and the median transfer of the 3 JSON files. Record the 3 LCP values, the median, the 3 transfer values, the median, the server-response time, and the LCP breakdown. The median LCP must be under 2500 ms. The raw JSON files stay in a scratch folder outside the repository.
    Note 2026-11-23: the median LCP is 2815.5 ms, above the 2500 ms limit. The task stayed [~] until the PM decision below. The three LCP values are 2822.2, 2815.5, and 2345.7 ms. The art change cuts 1199.5 ms from the 4015 ms baseline but does not reach the limit. The remaining time sits in the simulated throttling and render path; the render-blocking CSS, the unused JavaScript, and the layout shift stay out of scope (spec D-7).
    PM decision 2026-11-24: "A. Accept 2.8 s as the first step: LCP 4.0 to 2.8 s and score 0.77 to 0.95 is a clear gain. Close 1.1.5 with the gap recorded, after Review A r2 and the browser look 1.1.7 pass. The art change joins the launch-day batch."
    Closed with the gap recorded by PM decision 2026-11-24 (A): local Lighthouse mobile median LCP 2815.5 ms (runs 2822.2, 2815.5, 2345.7) against the 2500 ms done-when; baseline LCP 4.0 s, score 0.77 to 0.95; the gap to 2.5 s sits in the render path (render-blocking CSS, unused JavaScript, layout shift: spec D-7), outside this art-only track.
  - [x] 1.1.6 Review A (correctness), read-only. Test: AC-8. Evidence class: automated (review report).
    Evidence 2026-11-24: pass. File `measure/runs/storytime_speed_hill_climb_20261123/review-a-p1-r2-cb1bdef8e.json`, audited head `cb1bdef8e`. Finding F1 is withdrawn after the spec D-2 correction at `cb1bdef8e`.
    Run the role `measure-review-a-correctness` over the task range. The role checks the markup, the file set, the sizes and the `srcSet` values, the Red test meaning, the byte bound, and the TTFB line. A Blocker or a Major finding stops the task and returns to 1.1.2. The result file goes to `measure/runs/storytime_speed_hill_climb_20261123/`.
  - [x] 1.1.7 Browser look (UX), 390, 980, and 1280 px. Test: AC-7. Evidence class: person-checked (captures of the gate script).
    Evidence 2026-11-24: pass. File `measure/runs/storytime_speed_hill_climb_20261123/ux-browser-p1-cb1bdef8e.json`, audited head `cb1bdef8e`; 192/192 browser checks and 9/9 gate checks, and no visible art change.
    Run the role `measure-ux-browser-review` on the sign-in page. It reads the screenshots of `apps/storytime/__tests__/entry-browser-gate.sh` and the Lighthouse median of task 1.1.5. It checks the same picture, the same crop, the same corner radius and shadow, no horizontal scroll, and no new layout shift. A failing check returns to 1.1.2.
    The sign-in gate is the look gate of this track. No Storytime page-check sheet exists in the repository (spec FR-6).

### Green evidence (P1, tasks 1.1.2 to 1.1.5)

2026-11-23. Phase base `e3b93ca3382c648d61a4a84ae590d9980224711f`. Role base `96031a1839f26f6669a09865d90392c915117bd2`. Red commit 25a5a3abf stays unchanged. The targeted Red command exits 0 with 6 passed cases after the change.

- 1.1.2: `EntryArt` imports four new WebP files as static assets. The img holds `loading="eager"`, `fetchPriority="high"`, `srcSet` 720w, 1280w, 1920w, and `sizes="calc(100vw - 40px)"`. The desktop source holds `srcSet` 720w, 960w, 1080w and `sizes="480px"`. `alt`, `width`, `height`, `data-entry-art`, the CSS crop, and `JoinArt` stay unchanged. ffmpeg libwebp at compression level 6 makes the four files: `path-d-720.webp` 29070 bytes at q50, `path-d-1280.webp` 71910 bytes at q70, `path-p-720.webp` 102418 bytes at q80, `path-p-960.webp` 141266 bytes at q80. The scale pairs are 720:405, 1280:720, 720:1280, and 960:1707. Both byte bounds pass. Four `@ts-ignore` comments cover the new asset imports; tsc exits 0 with 0 errors in this worktree, where `next build` generated `next-env.d.ts`. A fresh checkout keeps the 14 base errors and adds none.
- 1.1.3: the TTFB line above names a cold start at `apps/storytime/cloudbuild.yaml:44-51` and `apps/storytime/lib/auth/index.ts:119`. No fix ships.
- 1.1.4: the whole-suite, check-types, lint, and build results sit in `measure/runs/storytime_speed_hill_climb_20261123/phase-acceptance-p1-dcc136c1f.log`. At dcc136c1f the suite exits 1 with 2 failed files and 10 failed tests from the absent gitignored `measure/runs/storytime_app_rebuild_20261025/media-list-w01.md`, a subset of the phase base failure set. `check-types` exits 0 with 0 errors after the build generates the asset types. `pnpm --filter storytime lint` exits 0 with warnings; ESLint on the changed file exits 0 with warnings. `pnpm --filter storytime... build` exits 0 after one retry of the known Next.js security notice. The build prints an upgrade reminder for `next upgrade --agent=security`; this track runs no upgrade and adds no dependency or lockfile change.
- 1.1.5: a local production build serves `/th/sign-in` on `127.0.0.1:3111` with the fake environment of `entry-browser-gate.sh`; no real secret or real database is used. Lighthouse 13.6.0 runs the mobile preset 3 times through `heavy-run.sh` with `HEAVY_PRIORITY=p1`. LCP: 2822.2, 2815.5, 2345.7 ms; median 2815.5 ms. Performance: 0.95, 0.95, 0.97; median 0.95. Transfer: 291519, 291517, 291517 bytes; median 291517 bytes. Server response: 9, 8, 8 ms. The `lcp-discovery-insight` reads `priorityHinted: true`, `eagerlyLoaded: true`, and `requestDiscoverable: true` on each run. The `lcp-breakdown-insight` of the median run reads timeToFirstByte 9.2 ms, resourceLoadDelay 23.4 ms, resourceLoadDuration 11.9 ms, and elementRenderDelay 35.2 ms; these observed subparts are far below the simulated 2815.5 ms LCP metric. The median misses the 2500 ms limit. Task 1.1.5 closes with the gap recorded by PM decision 2026-11-24 (A). Raw JSON stays under `/tmp/storytime-lcp-*.json`, outside the repository.

Commits: 4865f0273562306225bbbc311e8cbd5c8b7b077d.

### Gates this track assigns

| Gate | Status | Reason |
|------|--------|--------|
| Review A (correctness) | apply | The task changes the LCP markup, the candidate set, and the byte budget. |
| UX browser review | apply | The page is public and the art is the largest element. |
| Review B (security) | does not apply | The task changes no auth, no session, no data path, and no input handling. The form action, the hidden fields, the handler, and the redirect rule stay unchanged. |
| Review C (UX/API contract) | does not apply | The task adds no API, no route, no locale key, and no exported contract. The one page keeps its markup contract, and the UX review reads the browser evidence. |
| Adversarial testing | not assigned | Light lane. The byte bound, the pixel sizes, and the markup cases are the falsifiers, and Review A reads them. |
| Phase acceptance | passed at dcc136c1f (phase-acceptance-p1-dcc136c1f, role gate passed); final acceptance passed at b1a954eda (final-acceptance-track-b1a954eda, role gate passed) | Light lane. Task 1.1.6 and task 1.1.7 are the phase gates of record. |

## Open question

- Q1: The deploy gate. The change joins the launch-day deploy batch. Does Daniel want the batch to hold this change alone, or with the other Storytime changes of the day? Default: the PM holds the batch list, and this track adds its two commits and no deploy task.

## Closeout notes

Follow-up B (PM 2026-11-24): a later track for render-blocking CSS and unused JavaScript on sign-in, trigger: 2026-12-01. No new track before then.

Launch batch note entry (Storytime deploy of 2026-11-30, one deploy word from Daniel, one page check): commit 4865f0273 (art), track storytime_speed_hill_climb_20261123, user effect: the sign-in picture loads sooner on a phone (LCP 4.0 to 2.8 s, score 0.77 to 0.95). Also the plan, spec and test commits of this track; the product change is only apps/storytime entry-art.tsx and four WebP files.

Separate option for the batch note: TTFB 1.2 s cold start (apps/storytime/cloudbuild.yaml:44-51 sets no --min-instances); --min-instances=1 costs money; needs Daniel's word; the PM asks with the deploy word on 11-30. This track makes no change.

Note: the Next.js security upgrade reminder printed by next build (next upgrade --agent=security) is owned by security_upgrade_20261026, not by this track.

Evidence limits: no base browser run (install hang), no accessibility snapshot.
