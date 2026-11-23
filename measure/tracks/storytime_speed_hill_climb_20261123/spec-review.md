# Spec Review: storytime_speed_hill_climb_20261123

Author model: opencode-go/deepseek-v4.1-flash

## Round 1

Date: 2026-11-23
Reviewer: measure-spec-review, model route not recorded by the guard (the review ran on the session default)

### What this track proposes
This track makes the sign-in place art the LCP candidate in `apps/storytime`. `EntryArt` gains `loading="eager"`, `fetchpriority="high"`, and `srcset`/`sizes` on the landscape img and on the desktop `source`. Two 720 px wide WebP files (`path-d-720.webp`, `path-p-720.webp`) join the originals in `app/look/places/`, with a 30000-byte bound on the landscape file. The track records one line on the TTFB cause and changes no CSS, redirect, dependency, lockfile, deploy task, or hash field.

### How the current system works, per this spec
`/sign-in` renders `EntryArt` inside `div[data-entry-art-column]`: a `picture` with the portrait `path-p.webp` for 980 px and up, and the landscape `path-d.webp` img below that. The img carries `loading="lazy"`, no fetch priority, `width={1920}`, `height={1080}`, and `alt=""`, and it is the LCP element in the report runs. `entry.css` gives it the column width, 176 px high on a phone and 540 px high from 980 px, with `object-fit: cover`, a 20 px radius, and the shell shadow. `getCurrentUser()` returns `null` at `lib/auth/index.ts:119` before the first store read when the request holds no cookie, and `apps/storytime/cloudbuild.yaml` sets no `--min-instances`.

### Findings
- F1 [Major] plan.md Phase 1 task 1.1.1 (Red command): The worktree holds no `node_modules` at the root or in `apps/storytime` at HEAD `251d7d4`, and no plan step installs it, so `../../node_modules/.bin/vitest` cannot start; `scripts/jobs/heavy-run.sh` sets `pnpm_config_verify_deps_before_run=false`, so the job installs nothing either. Rationale: the Red run cannot show the named assertion failure, so task 1.1.1 has no evidence until an install step exists.
- F2 [Major] spec.md D-2, FR-1, FR-3: The landscape candidates are 720w and 1920w only, so a DPR 2 phone needs 744 device px for the 372 CSS px box, misses the 720w file by 3 percent, and keeps the 1920w original at 145508 bytes; D-2 explains DPR 1.75 and DPR 3 but not DPR 2, and the portrait set has the same edge at `sizes="480px"`, where DPR above 1.5 picks the 1080w original. Rationale: the byte half of the fix reaches no DPR 2 phone or tablet, and the DPR 1.75 Lighthouse run does not show the gap.
- F3 [Nit] plan.md task 1.1.1: The plan says the new test takes the same mocks as `entry-signin-layout.test.tsx`, including `../lib/content` and `../lib/teacher`, but that file mocks only `next/navigation`, `next-intl/server`, `../lib/auth`, and `next/headers` (lines 25 to 45). Rationale: name the mocks to add, or name only the four that the file holds.
- F4 [Nit] spec.md FR-3, plan.md 1.1.2 step 5: FR-3 names "the repo's image tooling", but no repository file makes a WebP file, and `sharp` is not a dependency of `apps/storytime`. Rationale: name the one command for the 720w files, so the 30000-byte bound is reproducible.

### Author Response
- F1: FIX. Plan task 1.1.1 now opens with a pre-gate: `pnpm install --frozen-lockfile` through heavy-run, then `git diff --exit-code pnpm-lock.yaml`. Test strategy section 5.0 adds the same pre-gate and its capture point.
- F2: FIX. The candidate sets are now three per orientation: landscape `720w`, `1280w`, `1920w`, and portrait `720w`, `960w`, `1080w`. Four files replace two: `path-d-720.webp`, `path-d-1280.webp`, `path-p-720.webp`, and `path-p-960.webp`. Spec D-2 now names DPR 1.75, 2, and 3, and the portrait ratios. AC-2, AC-3, the plan cases 2 to 5, and test strategy sections 2.1 and 5 follow.
- F3: FIX. The plan names only the four mocks of `entry-signin-layout.test.tsx`.
- F4: FIX. Spec FR-3 and plan task 1.1.2 name the ffmpeg command with libwebp at quality 80. The plan also names the sharp route through the worktree `node_modules` as the fallback.

Note on the process: this track was created by a build role session that no person watches. The step that asks a user to pick findings could not run. The author fixed both Major findings and both Nit findings, and no finding is declined or contested.
