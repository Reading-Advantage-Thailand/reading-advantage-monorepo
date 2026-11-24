# Spec: Storytime sign-in LCP art

Track: `storytime_speed_hill_climb_20261123` (light lane, chore, one task in one phase).
Source: PM decision 2026-11-23.
Owner words: Daniel, 2026-11-23: "Sounds good".
Priority: P1. Storytime is the critical path for the 30 Nov launch.

Evidence source: `/home/daniebo/Desktop/advantage-pr/measure/reports/storytime-speed-baseline-2026-11-23.md`.
This repository reads that report only. No file of the advantage-pr repository changes.

## 1. The measurement

The report measures the live host `https://storytime.reading-advantage.com` with Lighthouse
13.6.0, mobile preset, 3 runs per page. Each value below is the median of 3 runs.

| Page | Performance | LCP | Transfer |
|------|-------------|-----|----------|
| Sign-in TH `/th/sign-in` | 0.77 (0.77, 0.76, 0.78) | 4015 ms (4230, 4000, 4015) | 402912 bytes |
| Sign-in EN `/en/sign-in` | 0.74 (0.74, 0.75, 0.72) | 4290 ms (4261, 4290, 4578) | 402565 bytes |
| At-home home TH signed out `/th/st` | 0.74 (0.74, 0.75, 0.73) | 4217 ms (4217, 4133, 4323) | 403041 bytes |

The signed-out `/th/st` request answers 307 to `/th/sign-in?next=%2Fth%2Fst`, so the visitor sees
the sign-in page. The report measures that render.

The PM brief of 2026-11-23 states the same finding: performance 0.77 / 0.74, LCP 4.0 / 4.3 s,
the LCP art `path-d.*.webp` at 146 KB, `loading="lazy"`, no `fetchpriority`, and TTFB 1.19 s.

### 1.1 The LCP element

The LCP element on every sign-in render is `main > div > picture > img`, the place art.

- Report, largest resource of the median TH run: `path-d.3gpv0eti3rr02.webp` image 145933 bytes.
- `lcp-discovery-insight`: `eagerlyLoaded: false`, `priorityHinted: false`, `requestDiscoverable: true`.
- `lcp-discovery-insight` node snippet: `<img src="/_next/static/media/path-d.3gpv0eti3rr02.webp" alt="" loading="lazy" width="1920" height="1080">`.
- `lcp-discovery-insight` node box at the 412 px viewport: width 372, height 176.
- `lcp-breakdown-insight` of `th-sign-in-1`: timeToFirstByte 1258.964 ms, resourceLoadDelay 1730.048 ms, resourceLoadDuration 1779.402 ms, elementRenderDelay 30.759 ms.
- Report: "time-to-first-byte in the LCP breakdown runs 1250–2540 ms (server response about 500 ms)". The raw JSON of the runs reads `server-response-time` 478–504 ms.

### 1.2 The image size

`image-delivery-insight` holds one row:

- resource size 145508 bytes, est savings 125643 bytes, display value "Est Savings of 123 KiB".
- reason: "This image file is larger than it needs to be (1920x909) for its displayed dimensions (651x366). Use responsive images to reduce the image download size."

### 1.3 Where the art lives

`apps/storytime/app/[locale]/entry/entry-art.tsx` holds `EntryArt`. The sign-in page renders it
inside `div[data-entry-art-column]` (`app/[locale]/sign-in/page.tsx`).

- The picture has two static imports: `path-p.webp` (1080×1920) in `source media="(min-width: 980px)"`, and `path-d.webp` (1920×1080) in the img.
- The img carries `loading="lazy"`, `width={1920}`, `height={1080}`, and `alt=""`.
- `app/entry.css` gives the art column a full width and an img height of 176 px on a phone. From 980 px the img height is 540 px. Both rules use `object-fit: cover`.
- The referenced LCP file is `path-d.webp`: 145508 bytes on disk.

## 2. Scope

1. The LCP art on `/sign-in` and on the signed-out `/st` redirect, in `apps/storytime`. The art
   gets eager loading, `fetchpriority="high"`, responsive `srcset` and `sizes`, and smaller image
   variants (about 123 KB less).
2. One line on TTFB. The line names the cause, a cold start or a server fetch. This track makes
   no fix for it.

## 3. Functional requirements

- FR-1: `EntryArt` marks the landscape img as the LCP candidate. The img holds `loading="eager"`,
  `fetchpriority="high"`, a `srcSet` with three candidates (720w, 1280w, and the 1920w original),
  and a `sizes` value. The desktop `source` holds its own `srcSet` with three candidates (720w,
  960w, and the 1080w original), and its own `sizes`.
- FR-2: The art keeps two orientations and one picture per orientation. The decoration (`alt=""`),
  the two crop heights of `entry.css`, the `object-fit` value, the corner radius, and the shadow
  stay unchanged.
- FR-3: The small candidates are committed WebP files in `apps/storytime/app/look/places/`:
  `path-d-720.webp` (720×405), `path-d-1280.webp` (1280×720), `path-p-720.webp` (720×1280), and
  `path-p-960.webp` (960×1707). Each file is a static import beside its original, so the
  standalone Docker image carries it. The encoder command is the ffmpeg command of plan task
  1.1.2, which is on the machine at `/usr/bin/ffmpeg`. The sharp route through the worktree
  `node_modules` is the fallback. Neither route adds a dependency.
- FR-4: The landscape candidates are light. `path-d-720.webp` is 30000 bytes or less, against
  145508 bytes, so the saving is 115508 bytes or more. `path-d-1280.webp` is 75000 bytes or less,
  so the saving is 70508 bytes or more. The Lighthouse estimate for the phone art is 125643
  bytes.
- FR-5: The signed-out `/th/st` request still answers 307 to `/th/sign-in?next=%2Fth%2Fst`. The
  render at that target holds the eager art of FR-1. No redirect rule changes.
- FR-6: The look gate. No Storytime page-check sheet exists in the repository. The command
  `rg -n 'page-check|page check' apps/storytime measure/tracks/storytime*` returns no sheet. The
  browser evidence is the sign-in screenshots of `apps/storytime/__tests__/entry-browser-gate.sh`.
  That gate captures the sign-in page and the join page signed out at 390, 980, and 1280 px.
- FR-7: The existing tests stay green. `look-assets.test.ts` A1 and A2 pin the ten original place
  files and their sizes. `entry-signin-layout.test.tsx` S2 matches `/path-p/` and `/path-d/`
  inside the picture. The new names keep both matches, and the original files do not change.

## 4. Decisions

- D-1: No `next/image`. No page of the app uses it. The change keeps the `picture` and plain `img`
  markup with static imports. No new dependency enters `package.json` or the lockfile.
- D-2: Four small candidates, two for each orientation. The choice follows the device pixel
  ratio of the phone. The landscape box is 372 CSS px wide:
  - DPR 1.75 needs 651 device px, and picks 720w.
  - DPR 2 needs 744 device px, and picks 1280w.
  - DPR 3 needs 1116 device px, and picks 1280w.
  Every phone picks a smaller file than the 1920w original. The 1920w original stays the last
  candidate for a wide box at a high ratio. The desktop column is 480 CSS px or less at 980 px:
  DPR 1.5 picks 720w, DPR 2 picks 960w, and DPR 3 keeps the 1080w original. The desktop
  portrait art is capped by the 1080 px original. At DPR 3 it delivers about 2.4 source pixels
  for each CSS pixel, the same as before the change. The change loses no sharpness against the
  old code. A larger desktop file needs a new original from the art owner, and that is out of
  scope.
- D-3: The `sizes` values follow the CSS of `entry.css`. The phone img reads
  `calc(100vw - 40px)`, because the shell holds 20 px of inline padding on each side. The desktop
  source reads `480px`, which is above the measured column width at 980 px.
- D-4: TTFB stays a recorded line, with no fix. A signed-out request reads no database:
  `getCurrentUser()` returns `null` at `apps/storytime/lib/auth/index.ts:119` when the request holds
  no session cookie, before the first store read at line 121. The deploy config
  `apps/storytime/cloudbuild.yaml` sets no `--min-instances`, so the service scales to zero. The
  named cause is therefore a cold start. Green confirms the cause and records one line with the
  file and the line. If the evidence names a server fetch instead, the line names that fetch.
- D-5: Launch day. The change joins the launch-day deploy batch. That batch needs Daniel's word.
  The plan holds no deploy task and no traffic task.
- D-6: No hash field. The evidence holds Lighthouse numbers, byte counts, and pixel sizes. The
  AGENTS.md Hashing and Provenance Policy applies.
- D-7: The report's other candidates stay out: the render-blocking CSS, the unused JavaScript, and
  the 0.073 layout shift.

## 5. Acceptance

- AC-1: The rendered sign-in page holds one `picture[data-entry-art]`. Its img holds
  `loading="eager"`, `fetchpriority="high"`, a `srcSet` of three candidates with the descriptors
  `720w`, `1280w`, and `1920w`, and a `sizes` value. Its desktop `source` holds a `srcSet` with
  the descriptors `720w`, `960w`, and `1080w`, and a `sizes` value.
- AC-2: The four new files exist, are WebP files, and hold the pinned pixel sizes: `path-d-720.webp`
  720×405, `path-d-1280.webp` 1280×720, `path-p-720.webp` 720×1280, and `path-p-960.webp`
  960×1707. The ten original place files keep their names and sizes.
- AC-3: `path-d-720.webp` is 30000 bytes or less, and `path-d-1280.webp` is 75000 bytes or less.
- AC-4: The signed-out `/th/st` request answers 307 to `/th/sign-in?next=%2Fth%2Fst`, and the page
  at that target holds the art of AC-1.
- AC-5: The app suite passes, including `look-assets.test.ts`, `entry-signin-layout.test.tsx`, and
  `login-proxy.test.ts`.
- AC-6: A local Lighthouse mobile run on `/th/sign-in`, 3 runs, shows a median LCP under 2500 ms.
  Each run goes through `heavy-run.sh` with `HEAVY_PRIORITY=p1`.
  PM decision 2026-11-24: "A. Accept 2.8 s as the first step: LCP 4.0 to 2.8 s and score 0.77 to 0.95 is a clear gain. Close 1.1.5 with the gap recorded, after Review A r2 and the browser look 1.1.7 pass. The art change joins the launch-day batch." The recorded median is 2815.5 ms. The gap to 2500 ms is accepted and recorded in the track plan.
- AC-7: The browser look passes at 390, 980, and 1280 px. The art shows the same picture, crop,
  corner radius, and shadow. The page holds no horizontal scroll and no new layout shift.
- AC-8: Review A (correctness) passes with no open Blocker or Major finding.
- AC-9: The Green evidence holds one line on the TTFB cause, with its file and line, and no fix.
- AC-10: The range holds no new dependency, no lockfile change, no hash field, no deploy task, and
  no traffic task.

## 6. Out of scope

- The join page art, `JoinArt`, and the join page.
- Any other page of the app.
- The render-blocking CSS, the unused JavaScript, and the layout shift candidates of the report.
- Any TTFB fix, any `--min-instances` change, and any Cloud Run setting.
- Any deploy, traffic move, or live host change.
- Any new dependency or lockfile entry.
- Any hash or checksum field.
