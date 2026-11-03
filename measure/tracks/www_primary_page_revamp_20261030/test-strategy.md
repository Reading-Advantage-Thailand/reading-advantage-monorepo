# Test Strategy: www Primary Advantage page revamp

> **Track:** `www_primary_page_revamp_20261030` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Strategy for revision:** spec review PASS at `f32c2c728` (5 Major, 3 Nit). This file records the decisions for F1 to F5.
> **Worktree:** `/home/daniebo/Desktop/rama-worktrees/www-primary-page`, branch `www/primary-page-revamp`. The orchestrator and the owner chose this worktree. Anti-pattern A16 says "one shared tree". This track deviates from A16 with that approval. No push.

Shorthand used below:

- `APP` = `/home/daniebo/Desktop/rama-worktrees/www-primary-page/apps/www-reading-advantage`
- `HR` = `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c`
- `SRC` = `/home/daniebo/Desktop/advantage-pr` (read only)
- `PG` = `src/app/[locale]/(marketing)/products/primary-advantage`

## 1. Decisions for the five spec review Majors

| ID | Decision |
| --- | --- |
| F1 | The source root is `SRC`. The paths of the image list are relative to it. The crop script and test T3 check the SHA-256 of all 15 source files before the first crop. One mismatch stops the run with zero files written. The tests parse the hashes from the image list at run time. No hash is copied into the repository. |
| F2 | Red updates three existing tests in the Red commit: `PG/page.test.tsx` (5 old assertions go), `src/__tests__/phase-2-seo-assets.red.test.ts` (the primary row reads `meta.title` and `meta.description`), and `src/lib/__tests__/phase-w3-claims.test.ts` (positive control 1F counts the Reading page stats only, because Primary has no stats). Green must not weaken or delete an assertion. |
| F3 | Format: lossless WebP, extension `.webp`, at the output size of the image list. The 15 unscaled crops are `extract` only. Image 12 is `extract` plus a `lanczos3` resize to 1280×912. |
| F4 | The hero keeps the site hero gradient only and has no hero image. The page must not reference: `/images/hero-primary-advantage.jpg`, `/images/primary-advantage-hero.jpg`, `/images/primary-advantage-classroom-teacher-and-students.png`, `/images/primary-advantage-student-workbook-mockup.png`, `/primary-advantage logo.png`, the `ra-marketing-primary-advantage` SVG, and the six `/images/reading-advantage/*.png` screens of spec section 6. |
| F5 | The old sections go from the page and from the three locale files: `keyFeatures`, `platformFeatures`, `aiTechnology`, `resultsSection`, `adaptiveEngine`, `experience`, `cefrLevels`, `eyebrows`, `support`, `cefrSection`, and `cta.buttons.freeTrial` and `cta.buttons.signUp`. `ExperienceDemo` and `MarketingSvg` leave this page. The components and the old files in `public/` stay (other pages can use them). |

Contract the tests pin (Green must follow it):

- `data-testid` values: `pa-hero`, `pa-section-1` to `pa-section-8`, `pa-closing`.
- Locale scope `pages.products.primaryAdvantage` has the keys `meta.title` and `meta.description`.
- Internal links: `/pricing`, `/contact`, `/products/tutor-advantage`. The page has no other `href`. It has no `mailto:` and no external URL.
- Link counts per container: `/pricing` is 1 in hero, 1 in section 2, 1 in section 8, 1 in closing. `/contact` is 1 in hero, 1 in section 8, 1 in closing. `/products/tutor-advantage` is 1, in closing only.

## 2. Risk and review applicability

| Item | Value |
| --- | --- |
| Risk | `medium`. It is a public page with no auth, no data, and no new runtime dependency. The risk is a wrong claim, a wrong Thai line, a changed pixel, or a wrong QR target. |
| Security review | Not applicable. No auth, no input, no secret, and no new dependency. The URL and QR checks sit in Review B. |
| UX/API review | UX applies through the browser review. API does not apply. |
| Review A (Haiku) | Applies. Scope and plan compliance. See section 5. |
| Review B (Opus) | Applies. Links, external URLs, QR target, image files. |
| Review C (Sonnet) | Applies. Copy, Thai, zh, locale files. |
| Adversarial testing | Applies, one pass, after Green. Attack the scanners of section 4. |
| Browser review | Yes. The captures of C11 are the evidence. Daniel's look check and Thai check (task 1.8) stay a human gate. |
| Role-table deviation | The Claude-only order of Daniel (until 14:59 ICT, 2026-11-03) sets the models: Strategy Sonnet 5.5, Red Sonnet, Green Opus, Review A Haiku, Review B Opus, Review C Sonnet, acceptance Haiku. Opus, Sonnet, and Haiku count as three families. This differs from the usual role table. The orchestrator records the deviation. |

## 3. Tests for task 1.1 (Red writes them)

| ID | File (under `APP`) | Checks |
| --- | --- | --- |
| T1 | `PG/page.content.test.tsx` (new) | Renders `PrimaryAdvantage` and `generateMetadata` with the REAL message objects for `en`, `th`, and `zh`. It does not use the key-echo mock. Every brief string is found with `within(testid).getByText(exact)`. `th` uses the Thai column. `zh` uses the English column. Link counts per container (section 1 contract). Images are read from `img` `src` (decode the `url` parameter of the `/_next/image` URL) and from `alt`: 16 images, each in the right section with the alt text of the list (section counts 2, 2, 1, 4, 2, 1, 3, 1). `metadata.title` and `metadata.description` equal the brief meta text. Game names in `th` are the English names. Old keys of F5 are absent in all 3 locales. |
| T1b | same file, `control:` tests | The scanner self-tests (section 4). They must pass in Red. |
| T2 | `PG/page.test.tsx` (rewritten) | Key-echo mock stays. It checks the 10 `data-testid` containers (`pa-hero`, `pa-section-1..8`, `pa-closing`) and that no old `data-testid` (`cefr-timeline`, `reversed-split`, `overlapping-section`, `stat-card`) exists. |
| T3 | `src/lib/__tests__/primary-page-images.test.ts` (new, `@vitest-environment node`) | Parses the image list. Asserts 16 rows and 15 distinct sources. Checks the SHA-256 of each source. Checks that each `public/images/primary-advantage/<name>.webp` exists, has the list size, and is lossless (`VP8L` chunk). Pixel check with `sharp`: the 15 unscaled files equal the source crop byte for byte in raw RGBA; image 12 has a mean absolute difference of 2.0 or less (0 to 255) from a `lanczos3` resize of the crop. The folder holds exactly 16 files. Adds no hash to the repository: `git diff master...HEAD -- apps/ | grep -E '^\+.*[0-9a-f]{64}'` has 0 hits. |
| T3b | same file | Drift guard: every English and Thai string of the T1 fixture appears in `www-primary-advantage-page-brief.md` and the alt texts appear in the image list. `A34_REQUIRE_SOURCES=1` turns a missing source file into a FAIL. Without it the test skips and says so. |
| T4 | `src/__tests__/phase-2-seo-assets.red.test.ts` | Primary row reads `meta.title` and `meta.description`. |
| T5 | `src/lib/__tests__/phase-w3-claims.test.ts` | Positive control 1F counts the Reading stats only. All other tests stay unchanged. |
| Fixture | `src/test/fixtures/primary-page-expected.ts` (new) | Literal EN and TH strings, copied from brief v0.2. T3b keeps it honest. |

Live behavior versus artifact: T1, T2, T4 render the real page or the real metadata function. T3 reads real files and real pixels. The QR decode (C5) and the captures (C11) are live checks on the shipped files and the built server. A text scan of source files is a documentation-level check. It never replaces T1.

## 4. Anti-pattern coverage (every test has a falsification condition)

| A-class | Defense |
| --- | --- |
| A1 substring as structured signal | Links are checked by the `href` attribute of `a` elements, scoped by container. Images are checked by the decoded `url` parameter, never by `innerHTML.includes`. Metadata is read from the returned object. |
| A3 digit as labeled count | Counts are labeled integers: `images: 16`, `sources: 15`, `containers: 10`, and the per-container link counts. A bare digit match never passes. |
| A4 vacuous pass | Every loop asserts its own length first (16 rows, 3 locales, 10 containers). The Green gate fails on `numPendingTests > 0`. T3b skips only without `A34_REQUIRE_SOURCES=1`, and the gates set it. |
| A5 false claim versus test reality | Plan text, commit text, and logs say "pass" only with the exit code and the JSON counts of the cited command. Red states the exact failing tests. |
| A7 over-broad filter | The forbidden-term scanner exempts only the exact approved date sentence (EN and TH), and it never exempts a bare word. It flags: any `20\d\d`, month names (case-sensitive), `฿`, `THB`, `baht`, `บาท`, `$`, `USD`, `free`, `discount`, `ส่วนลด`, `ฟรี`, `ทดลองใช้`. It does NOT flag the bare Thai badge `ทดลอง` or the English `trial label` of the alt text. `control:` tests inject `Free trial`, `Starting 2026`, `5,000 บาท`, and `ทดลองใช้ฟรี` (each must be flagged) and the approved sentence plus the `ทดลอง` badge (must pass). |
| A15 stale receipts | No receipt carries file hashes in this track. `phase_base_sha` is captured after the strategy commit (section 7). Each later role works on its own HEAD. |

## 5. Commands

Red (tasks 1.1 and 1.2):

- **C1** `HR 'cd APP && A34_REQUIRE_SOURCES=1 pnpm exec vitest run --maxWorkers=1 --reporter=json --outputFile=/tmp/a34-red.json primary-advantage/page primary-page-images phase-2-seo-assets phase-w3-claims'`
  Red gate: exit code is not 0. T1, T2, T3 fail. The primary row of T4 fails. T5 and all `control:` tests pass.
- **C2** `node -e` on `/tmp/a34-red.json`: count the failed tests whose first message matches `Cannot find module|SyntaxError|ReferenceError|TypeError`. The count must be 0. A failure for a missing module is a wrong-reason Red (A4).
- **C3** `HR 'cd APP && pnpm exec vitest run --maxWorkers=1 -t "control:" primary-advantage/page'` exits 0. It proves the scanners work before Green.

Green (tasks 1.3 to 1.5):

- **C4** `HR 'cd APP && pnpm exec tsx scripts/crop-primary-page-images.ts --source-root SRC --list 11-content/www-primary-advantage-page-images.md'`. Green writes the script. It verifies 15 SHA-256 values first and then writes 16 files with `sharp` (`lossless: true`, `exact: true`). `--verify-only` runs the SHA check alone (Review B uses it).
- **C5** QR decode in `/tmp/a34-qr` (outside the repository, no repository dependency): `cd /tmp/a34-qr && npm i --no-save jsqr && NODE_PATH=<worktree>/node_modules node decode.cjs APP/public/images/primary-advantage/contact-channels.webp`. The output must equal `https://line.me/ti/p/Pf7_EF98Pv`. Cross-check: `grep -c "https://line.me/ti/p/Pf7_EF98Pv" SRC/01-company/contact-and-locations.md` is 1 or more. Green may upscale inside the decoder only, never in the shipped file. If the QR does not decode, the result is `blocked`, not a pass. The decoded value goes into the plan (AC-5).
- **C6** `i18n:verify`: `HR 'cd APP && pnpm exec tsx scripts/i18n-verify.ts'`. A failure also present at the base is recorded as pre-existing.

Phase check (task 1.6):

- **C7** Lint, changed files: `HR 'cd APP && pnpm exec eslint --max-warnings=0 $(git diff --name-only master...HEAD -- . | sed "s#^apps/www-reading-advantage/##" | grep -E "\.(ts|tsx|mjs)$")'`
- **C8** `HR 'cd APP && pnpm exec tsc --noEmit'`
- **C9** The changed tests = `GREEN_TEST_COMMAND` (section 8). It exits 0 with 0 failed and 0 pending.
- **C10** `HR 'cd APP && pnpm exec next build'`. Then `find APP/.next/server/app -path "*primary-advantage*" \( -name "*.html" -o -name "*.rsc" \)` must list 3 or more files for `en`, `th`, `zh` (labeled count), and `grep -lE "hero-primary-advantage|primary-advantage-hero|primary-advantage logo|ra-marketing-primary-advantage|reading-advantage/(choose-your|language-selector|read-article|order-sentence|order-words|SRS-flashcard)|classroom-teacher-and-students|student-workbook-mockup|freeTrial|ExperienceDemo"` on those files must list 0 files. If the build writes no static page, use the `next start` fetch of C11.

Preview captures (task 1.7):

- **C11** `cd APP && (pnpm exec next start -p 3107 &)` then `node /home/daniebo/Desktop/a34-www-primary-captures/capture.mjs` (a throwaway script outside the repository, uses the `playwright` of `APP`). For `en` and `th` at 1280×800 and 390×844 it checks: `scrollWidth <= innerWidth`, every `img` has `complete && naturalWidth > 0`, and there are 16 `img` in the `pa-` containers. It saves full-page PNG files `en-desktop.png`, `en-phone.png`, `th-desktop.png`, `th-phone.png`, plus `zh-desktop.png`, in `/home/daniebo/Desktop/a34-www-primary-captures/`. It stops the server by the PID from `ss -ltnp` for port 3107. If Playwright has no browser, use the OpenChamber browser tool (`browser.resize`, `browser.capture`) for the same five views and record the missing checks.

Review gates:

- **C12** (Review A) `git diff --name-status master...HEAD`: only these paths change: `PG/*`, the 3 locale files, `src/locales/pages/products/primary-advantage.ts`, the named tests, `src/test/fixtures/primary-page-expected.ts`, `scripts/crop-primary-page-images.ts`, `public/images/primary-advantage/*.webp`, and `measure/` track files. Review A reruns C1's file set (expected exit 0 after Green) and checks that no assertion count dropped in T4 and T5 (`git diff` of those two files shows only the F2 edits).
- **C13** (Review B) Reruns C4 `--verify-only`, C5, and a link audit: collect every `href` from the built `en`, `th`, and `zh` pages. The set must equal `{/pricing, /contact, /products/tutor-advantage}` plus the site header and footer links. A `mailto:` or `http` link inside `pa-` containers is a finding. The folder `public/images/primary-advantage/` holds exactly 16 files.
- **C14** (Review C) Compares each `en` and `th` string with `www-primary-advantage-page-brief.md` v0.2 and with the Thai check file named in the spec. Checks `zh` equals the English copy. Checks the old keys of F5 are gone in all 3 locale files. Checks the Thai year is `2027`.
- **C15** (Adversarial, report-only plus new tests) Attacks the scanners: `Free trial` in an alt text, a price in the Thai meta, `2026` in the `zh` copy, an old image in a CSS `background-image` or an `aria-label`, a non-breaking space in a brief string. It may commit tests in `PG/page.adversarial.test.tsx`.

## 6. Phase 1 gates

| Gate | Pass condition |
| --- | --- |
| Red (1.1, 1.2) | C1 fails for assertion reasons only (C2 = 0). C3 passes. One Red commit holds T1 to T5 and the fixture. |
| Green (1.3 to 1.5) | C4, C5, C6, and C9 pass. `public/images/primary-advantage/` holds 16 files. The plan holds the decoded QR value. |
| Phase check (1.6) | C7, C8, C9, and C10 pass. The log lists each exit code. Any failure outside the diff is shown to also fail at the base commit. |
| Captures (1.7) | C11 exits 0. The 5 PNG files exist and are not empty. |
| Closeout | Review A, B, and C pass. The adversarial pass has no open Blocker. Tasks 1.8 and 1.9 stay `[b]` with Daniel. No push. |

Intentionally red: only the Red commit state. No aggregate suite (`pnpm test`, `turbo run test`) runs in this track, because of the machine load limits. The Green gate runs the five changed files only.

## 7. `phase_base_sha`

The orchestrator captures `phase_base_sha` with `git rev-parse HEAD` in the worktree right after the strategy commit. `git log -1 --stat` must show `test-strategy.md` as the only file. The orchestrator hands that value to Red. This file embeds no SHA.

## 8. `GREEN_TEST_COMMAND`

```bash
bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/rama-worktrees/www-primary-page/apps/www-reading-advantage && A34_REQUIRE_SOURCES=1 pnpm exec vitest run --maxWorkers=1 primary-advantage/page primary-page-images phase-2-seo-assets phase-w3-claims'
```

If `phase-w3-claims` fails on the approved date line ("May 2027") or on the provider-neutral AI copy control, Green reports it as a finding and does not loosen a filter. The orchestrator decides.
