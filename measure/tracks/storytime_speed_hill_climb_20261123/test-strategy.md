# Test strategy: Storytime sign-in LCP art

> **Track:** `storytime_speed_hill_climb_20261123` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Written:** 2026-11-23, light lane, one task in one phase. Package: `apps/storytime` only.
> **Evidence source:** `/home/daniebo/Desktop/advantage-pr/measure/reports/storytime-speed-baseline-2026-11-23.md` (read only).
> This file holds no `phase_base_sha`. Section 7 names the capture point.

## 1. Risk list, ranked

Severity is the cost of a silent escape. Likelihood is the chance that the Green change passes the gate while it carries the defect.

| # | Risk | Severity | Likelihood | Gate that catches it |
|---|------|----------|------------|----------------------|
| R1 | The img stays lazy, or it loses `fetchpriority="high"`. The LCP then keeps the 1730.048 ms resource load delay. | high | medium | Red case 1 on the rendered markup |
| R2 | The browser keeps the 1920w candidate on the phone, so the page still ships 145508 bytes of art. A phone at DPR 2 then picks 1920w, not 1280w. | high | medium | Red case 2 (three descriptors), Red case 3, Red case 5, and the Lighthouse transfer median |
| R3 | A candidate is too heavy, for example an encode at quality 95. The saving then misses the 123 KiB estimate. | medium | medium | Red case 5 (30000-byte and 75000-byte bounds) |
| R4 | A new file breaks `look-assets.test.ts` A1 or A2: a wrong pixel size, a missing file, or a replaced original. | high | low | A1 pins the ten originals; Red case 4 pins the four new sizes; the app suite gate |
| R5 | The art changes its visible result: another crop, a stretched picture, a lost corner radius, or a new layout shift. | high | low | The browser look at 390, 980, and 1280 px; the CLS value of the Lighthouse median |
| R6 | The desktop source loses its own candidate set, so a desktop gets the phone strip or the 1920w portrait. | medium | medium | Red case 3 |
| R7 | The `/st` redirect changes, and the visitor lands on another page. | high | low | Red case 6 and `login-proxy.test.ts` |
| R8 | A new dependency or a lockfile entry enters with the change, for example `next/image` or `sharp` as a dependency. | medium | low | `git diff --exit-code pnpm-lock.yaml`; Review A over `package.json` |
| R9 | The track records a TTFB fix, or a cause without a file and a line. | medium | medium | Review A reads the line; spec AC-9 |
| R10 | A deploy or a traffic task enters the plan or the range. | high | low | The plan holds no such task; the commit range holds no workflow or Cloud Run file |

## 2. Test layers and what each proves

| Layer | File | Class | What it proves | What it does not prove |
|-------|------|-------|----------------|------------------------|
| Rendered markup | `apps/storytime/__tests__/entry-art-lcp.test.tsx` | live render in `renderToStaticMarkup` | The img is eager and priority-hinted; the `srcset` and `sizes` values; the desktop `source` set; the redirect target holds the same art | The browser pick, the real bytes on the wire |
| Asset and bytes | same file, `node:fs` | artifact | The four files exist, are WebP, hold their pixel sizes, and both landscape files meet their byte bounds | The picture quality at a real viewport |
| Redirect | same file, proxy call | live logic | `/th/st` answers 307 to `/th/sign-in?next=%2Fth%2Fst` | The signed-in path |
| Inherited guard | `look-assets.test.ts` A1, A2 | artifact | The ten originals keep their names, sizes, and CSS drawings | Nothing new; it constrains the file set |
| Inherited guard | `entry-signin-layout.test.tsx` S2 | live render | The picture holds `path-p` and `path-d` and stays decorative | Nothing new |
| Inherited guard | `login-proxy.test.ts` | live logic | The protected redirect rule holds | Nothing new |
| Product measure | Lighthouse 13.6.0, mobile preset, 3 runs | measurement | The median LCP is under 2500 ms on `/th/sign-in`; the transfer and the breakdown move as predicted | A real phone on a school network |
| Look | `entry-browser-gate.sh` captures, 390, 980, 1280 px | person-checked | The same picture, crop, radius, and shadow; no horizontal scroll | Contrast and Thai reading quality of a new string (none ships) |

### 2.1 Assertions that must not be weakened

1. **Eager and priority are exact attributes.** The test reads `loading="eager"` and `fetchpriority="high"` on the img. A test that accepts `loading` absent passes a lazy browser default.
2. **The full candidate set is exact.** The img holds the descriptors `720w`, `1280w`, and `1920w`, and the source holds `720w`, `960w`, and `1080w`. The last descriptor is the original. A set with one small file upscales at DPR 2 or more.
3. **The byte bounds are numbers.** `bytes <= 30000` for `path-d-720.webp` and `bytes <= 75000` for `path-d-1280.webp`, printed as `path_d_720_bytes=<n>` and `path_d_1280_bytes=<n>`. No test asserts "smaller" without a bound.
4. **The pixel sizes are pinned.** 720×405, 1280×720, 720×1280, and 960×1707, read from the WebP header. The originals stay 1920×1080 and 1080×1920.
5. **The redirect is exact.** Status 307 and `Location` `/th/sign-in?next=%2Fth%2Fst`. A test that accepts any 3xx hides a changed target.

### 2.2 Fixtures and live proof

- The page render uses the mocks of `entry-signin-layout.test.tsx`. The fake content module answers `null` for `firstOpenWeek`, so the render takes the plain path.
- The proxy case builds a request with no cookie, as `login-proxy.test.ts` does.
- The asset cases read the real files under `apps/storytime/app/look/places/`. The test holds no copy of the files.
- The browser pick is proven by the Lighthouse transfer and by the `srcset` values together. No unit test reads the browser's choice.

## 3. Red and Green mapping

| Task | Red file | The failing assertion at the base | Red command | Green gate |
|------|----------|-----------------------------------|-------------|------------|
| 1.1.1 → 1.1.2 | `__tests__/entry-art-lcp.test.tsx` | The img holds `loading="lazy"` and no `fetchpriority`; the `srcset`, the `sizes`, and the four candidates are absent | `vitest run __tests__/entry-art-lcp.test.tsx` | The same command exits 0 |
| 1.1.3 | none | — | A read-only source look | The line holds a file and a line number |
| 1.1.4 | inherited suite | — | The app suite, types, lint, and build | Every command exits 0 |
| 1.1.5 | none | — | Lighthouse, 3 runs, median | Median LCP under 2500 ms |
| 1.1.6 | none | — | Role `measure-review-a-correctness` | `status: pass`, no Blocker, no Major |
| 1.1.7 | none | — | Role `measure-ux-browser-review` | Pass on the 3 widths |

**Red discipline.** The Red commit holds the test file only. Each failing case fails on an assertion of the page or the files, not on a missing module or a syntax error. Case 6 holds a passing part (the redirect) and a failing part (the art), so the case is not a copy error.

**Green discipline.** Green does not edit a Red assertion. A wrong bound or a wrong size returns to the spec as a question.

## 4. Review gates

| Gate | Applies | Reason |
|------|---------|--------|
| Review A (correctness) | yes | The task changes the LCP markup, the candidate set, and the byte budget. |
| Review B (security) | no | No auth, data, input, session, or dependency change. The form action, the hidden fields, and the sign-in handler stay. |
| Review C (UX/API contract) | no | No API, route, locale key, or exported contract changes. The UX review reads the browser evidence. |
| Adversarial testing | no | Light lane. The byte bound, the pixel pins, and the markup cases are the falsifiers. |
| Phase acceptance | no | Light lane. Tasks 1.1.6 and 1.1.7 are the gates of record. |

## 5. Gate commands

`HEAVY` means `HEAVY_PRIORITY=p1 HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.

### 5.0 Pre-gate: install the workspace, once per worktree

The worktree holds no `node_modules`, and `heavy-run.sh` installs nothing. Run the install after the capture of the phase base and before the first Red run.

```bash
HEAVY 'cd /home/daniebo/Desktop/rama-worktrees/storytime-speed && pnpm install --frozen-lockfile'
git diff --exit-code pnpm-lock.yaml
```

A lockfile change is a stop: this track adds no dependency.

### 5.1 Red, Green, and the app gates

```bash
# Red, then Green
HEAVY 'cd /home/daniebo/Desktop/rama-worktrees/storytime-speed/apps/storytime && CI=true ../../node_modules/.bin/vitest run __tests__/entry-art-lcp.test.tsx'

# Whole app suite, types, lint, build
HEAVY 'cd /home/daniebo/Desktop/rama-worktrees/storytime-speed/apps/storytime && CI=true ../../node_modules/.bin/vitest run'
HEAVY 'cd /home/daniebo/Desktop/rama-worktrees/storytime-speed && pnpm --filter storytime check-types'
HEAVY 'cd /home/daniebo/Desktop/rama-worktrees/storytime-speed && pnpm --filter storytime lint'
HEAVY 'cd /home/daniebo/Desktop/rama-worktrees/storytime-speed && pnpm --filter storytime build'

# The lockfile must not move
git diff --exit-code pnpm-lock.yaml
```

### 5.2 The Lighthouse median

1. `HEAVY` the build, then start the app on a free port with `PORT=3111 pnpm --filter storytime start`.
2. Run `/tmp/storytime-speed/node_modules/.bin/lighthouse` 3 times on `http://127.0.0.1:3111/th/sign-in`.
3. The flags match the baseline report: `--form-factor=mobile --only-categories=performance --chrome-flags="--headless --no-sandbox" --output=json --output-path=/tmp/storytime-lcp-<n>.json`.
4. Read `audits.largest-contentful-paint.numericValue` and the transfer of `audits.total-byte-weight`. Sort each set of 3 and take the middle value.
5. Stop the server. The JSON files stay in `/tmp`, outside the repository.

A local server needs no database for a signed-out render, because `getCurrentUser()` returns at `lib/auth/index.ts:119` before the first store read. If the server refuses to start, the operator names the missing environment value in the evidence and adds no secret to the repository.

## 6. Human checks

| Check | Owner | Evidence | What a test cannot do |
|-------|-------|----------|-----------------------|
| The picture looks the same at 390, 980, and 1280 px | The UX review role, and the PM on request | The captures of `entry-browser-gate.sh` | Judge the crop and the art quality by eye |
| The Lighthouse median on the local build | The track owner | The 3 JSON files and the middle values | Run a real phone on the school network |
| The launch-day deploy word | Daniel, through the PM | The PM batch list | Decide when the batch ships |

## 7. Capture point and residual risks

- **Capture point.** The orchestrator runs `git rev-parse HEAD` after the track commit and before the Red role writes the test file. That full SHA is the phase base of task 1.1.1. It is not in this file.
- **Residual risks.**
  1. A phone box wider than 440 CSS px at DPR 3 needs more than 1280 device px, so it keeps the 1920w original. It loses no sharpness and gains no saving (spec D-2).
  2. The local Lighthouse server has a much lower TTFB than the live host, so the local median is easier than the live one. The live number comes after the launch-day deploy, which this track does not run.
  3. A later edit can return the img to lazy without a failing test only if the suite does not run. The Red case holds the attribute, so the suite catches the return.
  4. The `sizes` values are an estimate of the CSS box. A CSS change to the shell padding or the column width makes them stale, and no test reads the computed width.
