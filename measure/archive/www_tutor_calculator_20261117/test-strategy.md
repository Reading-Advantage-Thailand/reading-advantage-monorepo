# Test strategy: www Tutor Advantage screens and commission calculator

> **Track:** `www_tutor_calculator_20261117` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Written:** 2026-11-17 at role base `6c47d7fe49398ac91b3703e47b15249d226294cf` (branch `feat/a63-tutor-calculator`).
> **Route:** opencode-go/deepseek-v4.1-flash. **Scope:** both phases and the closeout. Package: `apps/www-reading-advantage` only.
> **Money facts:** the six rates, the three presets, the two conservation sums, and the 1e9 case were recomputed with exact integer arithmetic at the role base. They reproduce the spec.
> This file embeds no `phase_base_sha`. A value from before the commit of this file is not valid. Section 8 names the capture point.

## 1. Risk list, ranked

Severity is the cost of a silent escape. Likelihood is the chance that a Green change passes the gate while carrying the defect.

| # | Risk | Severity | Likelihood | Phase | Gate that catches it |
|---|---|---|---|---|---|
| R1 | Money determinism under D-3 breaks: a float product, a rounded product, or a different truncation point. The output then differs from the settlement rule by satang. | high | medium | 1 | Module pins to the satang; the 1e9 case; the satang conservation equality |
| R2 | Float leakage into the money path: `Math.round(rate * GV * 100)` in place of the BigInt product. At GV = 1e9 the BigInt path gives 71,422,027,600 satang and the float path 71,422,027,583, a 17-satang gap. | high | medium | 1 | The 1e9 rate case plus a satang pin at 1e9 |
| R3 | The conservation identity fails: leg payouts plus payout do not equal gross, because the payout is computed independently instead of as `max(0, gross − sum)`. | high | medium | 1 | Integer satang equality for presets 2 and 3 (`801,000 + 464,569 = 1,265,569`, `1,656,000 + 827,345 = 2,483,345`) |
| R4 | Zero and negative edges: `(0,0)`, `(100,150)`, a negative volume, a non-finite volume, and a zero payout that still shows a tax. | medium | medium | 1 | `payoutAfterDeduction` floor test; the zero result test; the clamped-input cases |
| R5 | The 71.4286 % ceiling: the rate passes the asymptote, or the huge-volume case is not exercised at all. | medium | low | 1 | `rate < 0.714286` at 1e9 and at `Number.MAX_SAFE_INTEGER` volume |
| R6 | The two changed live lines (task 2.3): the page keeps "We do not publish income figures" beside a calculator that shows examples, so the page contradicts itself on the live site. | high | medium | 2 | Locale absence of both old lines; exact new strings; `grep` over the locale file |
| R7 | i18n drift across en/th/zh: a missing key path, a Thai value that is English, or a zh value that is translated instead of held English by D-10. | medium | medium | 2 | Key-path set equality across three dictionaries; zh equals en on every new key; th exact strings |
| R8 | The claims gate fails: a D-16 claim (`annual`, `per year`, `hour`, `VAT`, `Tawi`, `no earning cap`, `salary`) or a public date reaches the new strings. | high | low | 1, 2 | The D-16 scan with one positive control per token |
| R9 | A used screen shows "Reading 3.1", an admin surface, a price, or an error state. No vitest reads pixels (D-14). | high | medium | 2 | The blur review, one line per file, and one full-size look per saved copy; the PM page-check |
| R10 | Layout at 390, 980, and 1280 px: horizontal scroll, a graph row that does not add up on the page, an unreadable breakdown. | medium | medium | 1, 2 | The hand capture of task 1.8 and the PM page-check (2.5) |
| R11 | The shadcn ratchet moves (`lintWarnings: 241`, `copies: 36`), or a touched file adds a new `shadcn/*` error. | low | medium | 1, 2 | `git diff --exit-code scripts/ci/shadcn-ratchet-baseline.json` plus lint |
| R12 | The push starts the CD deploy (D-13, open question 5): a push after Phase 2 is a deploy, and a push before the page-check is a deploy of unchecked claims. | high impact | low | 2 | One push after 2.5, www-only, proven by the app selector; the PM and Daniel own the word |

Two ordering rules come from this list. The money pins land before any component work (task 1.1 precedes 1.5). The copy absence checks land in the same commit as the copy change (task 2.3), not after it.

## 2. Test layers and what each proves

### 2.1 The layers

| Layer | File | Class | What it proves | What it does not prove |
|---|---|---|---|---|
| Pure module | `src/lib/tutor-commission.test.ts` | live logic (runs production code) | The rate formula; satang truncation under D-3; the one-level deduction; the conservation identity; the input clamps; `resizeLegs`; `explainVariant` | That the page calls the module, and that the browser shows the figures |
| Locale contract | `src/__tests__/www-tutor-calculator.locale.test.ts` | artifact (executes the production dictionary module) | Every new string word for word in en and th; key-path parity across en/th/zh; zh holds English (D-10); the D-16 claim scan; the two live lines and the absence of the old two | That the strings render, and that a translator later keeps them |
| Component | `src/components/marketing/tutor-commission-calculator.test.tsx` | live UI in jsdom | Default zero paint; leg rows 0→4; preset figures, setup, and result text; `aria-pressed`; the D-7 clear; the D-5 price reset; the result live region; labelled inputs with `min="0"`; one graph row per leg | Pixels, breakpoint layout, focus ring, 44 px targets, the real bar length |
| Page order and wiring | `src/app/[locale]/(marketing)/products/tutor-advantage/page.test.tsx` | live render in jsdom | DOM order `tutorRole` → `tutor-screens` → `tutor-calculator` → `commitments` → `faq`; the section testids; the three cards in copy order with their alt text; the zh render shows the English placeholder | The built route, the CDN, and the real viewport |
| Assets and manifest | `src/lib/__tests__/tutor-screens.test.ts` | artifact (reads `node:fs`) | The three `tutorScreens` keys in slot order; `src`/`width`/`height`/`portrait: false`; the `/images/products/tutor-advantage/` prefix; each file exists under `public/` | That the webp is sharp, unblurred where it must be legible, and free of "Reading 3.1" |
| Inherited guard | `src/__tests__/products-page-pictures.red.test.tsx` | artifact | Every `productPictures` value has a real file at 1 MB or less. It iterates values and calls `statSync(join(APP_ROOT, "public", picture.src))` (line 59). | Nothing new; it is the reason the manifest shape is constrained |

### 2.2 Assertions that must not be weakened

1. **Rates are strings, not approximations.** `(commissionRate(V) * 100).toFixed(4)` equals `"40.5000"`, `"42.5000"`, `"45.0000"`, `"50.0000"`, `"55.6065"`, `"60.6315"`. String equality only. `toBeCloseTo` hides a rate change in the third decimal.
2. **Money is a baht number, compared to four decimals of satang.** Every money pin is a literal (`12655.69`), and the same value is re-derived as satang integers (`1265569`) for the conservation equality. A baht-Number sum fails in float (`8010 + 4645.69 !== 12655.69`), so the sum check uses satang.
3. **The large-volume case is observable from the output.** GV 1e9 gives rate `71.422028 %`, gross satang `71422027600`, and payout `71422027600` (one tutor, no legs). The float product gives `71422027583`. Assert the satang value, not a percentage.
4. **Preset 2 is the D-3 fingerprint.** Gross 12,655.69, payout 4,645.69, net 4,506.32. The rejected raw-float rounding is 12,655.70 / 4,645.70 / 4,506.33. A Regression that changes the truncation point moves these three values and nothing else, so the pin is precise.
5. **Preset 3 is the one-level fingerprint.** Leg payouts 16,560.00, payout 8,273.45, tax 248.20, net 8,025.25. The module test pins the conservation sum in satang: `1,656,000 + 827,345 = 2,483,345`. The superseded two-level figures (5,884.44 / 5,707.91, and 22,714.44 / 9,889) are absent strings in the copy block, so a copy paste cannot reintroduce them.

### 2.3 Fixtures, mocks, and live-behavior proof

- **Module test:** no mocks and no fixtures on disk. The preset inputs come from `NETWORK_PRESETS` (the production export) for the preset cases, and from inline literals for the edge cases. The test asserts `NETWORK_PRESETS` length 3 and each preset's price 3,000, so a preset cannot drift away from the spec table.
- **Locale test:** imports `en`, `th`, and `zh` from `@/locales/pages/products/tutor-advantage`. No hand-made copy object. The only fixture is the forbidden-claim probe list, and each probe is injected into a shallow copy so the scan is proven to fail on it.
- **Component test:** `@testing-library/react` with `userEvent`, `cleanup` in `afterEach`, and the en dictionary as props. The component takes copy by props (spec 5.3), so no `next-intl` provider is needed; the test therefore fails if Green adds a provider dependency or reads a dictionary inside the component. A source assertion reads the component file and fails on `from "next-intl"` and on `from "@/locales`. The test drives the real module, so a component that re-implements the arithmetic fails the money pins.
- **Page test:** calls the async server component with `params: Promise.resolve({ locale: "en" })`, as the existing `page.test.tsx` does at line 12. A second case uses `locale: "zh"` and asserts the English placeholder inside `tutor-calculator`.
- **Manifest test:** `node:fs` only, relative to the package root. It asserts a wrong path built by the same helper resolves to no file, so the existence check is proven able to fail.
- **Live behavior proof of the client arithmetic:** there is none inside a test. Task 1.8 and the PM page-check read the built page. The tests prove the function and the render tree; the browser proves the page.
- **Read rule:** every test reads only repository paths. The blur script of task 2.1 is a build tool, not a test, and it is the only code that reads the handoff folder. Tests compute no hash (AGENTS.md hashing policy).

### 2.4 Architecture guardrails and changed contracts

1. **`productPictures` shape is a live contract.** It is `as const satisfies Record<string, ProductPictureFile>`, and `products-page-pictures.red.test.tsx:59` iterates every value and stats `public/<src>`. A nested `productPictures.tutorScreens.studentHome` breaks the type and passes `undefined` to `join`. **Default: a sibling `export const tutorScreens` in the same file, typed `as const satisfies Record<string, ProductPictureFile>`.** See Q1.
2. **The two live lines are a public claim contract.** `tutorRole.points[3]` and `faq.items[5].answer` change meaning, and the old lines must not survive anywhere in the file, including zh.
3. **The server/client split is a contract.** The page reads copy with `getScopedI18n`; the calculator is `"use client"` and takes strings by props (D-12). No locale module import inside the client component.
4. **The inline-style contract.** `shadcn/no-inline-styles` allows a CSS custom property for the run-time bar width (D-9). Review A reads every `style={{` in the component and accepts only the custom-property form.
5. **The testid contract.** `tutor-screens` and `tutor-calculator` are the order handles. The `commitments` section has no testid today; task 1.7 adds `data-testid="tutor-commitments"` to that existing section, because the order test needs an anchor after the calculator.
6. **The ratchet contract.** No new `shadcn/*` error in a touched file; the baseline file is byte-unchanged.

## 3. Red/Green mapping per plan task

Every Red command runs in `apps/www-reading-advantage` with the package filter. `HEAVY` means `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'`.

| Task | Red file | The failing assertion the Red step writes | Red command (targeted) | Green gate | Closeout gate (phase) |
|---|---|---|---|---|---|
| 1.1 → 1.2 | `src/lib/tutor-commission.test.ts` | imports `commissionRate`, `calculateNetwork`, `payoutAfterDeduction`, `explainVariant`, `resizeLegs`, `NETWORK_PRESETS` from a module that does not exist; the six rate strings; the three preset money pins; the satang equalities; the 1e9 satang pin; the clamp cases; the floor cases; the three `explainVariant` states; `resizeLegs` add/keep/drop with 3 | `pnpm --filter www-reading-advantage exec vitest run src/lib/tutor-commission.test.ts --silent=true` | The same command exits 0 | 1.8 block |
| 1.3 → 1.4 | `src/__tests__/www-tutor-calculator.locale.test.ts` | `en.calculator` is `undefined`, so the first key-path read throws; then every string, the key parity, the zh identity, the D-16 scan, the absence of `inputs.secondLevel`, `inputs.studentsSecondLevel`, `explain.twoLevels`, and the absence of `5,884`, `5,707`, `22,714`, `9,889` | `... vitest run src/__tests__/www-tutor-calculator.locale.test.ts --silent=true` | The same command exits 0 | 1.8 block |
| 1.5 → 1.6 | `src/components/marketing/tutor-commission-calculator.test.tsx` | the component module does not exist; then: `zero` line and `0` values on first paint; leg rows at 0/1/2/3/4 with a new leg at 3 students; preset 1 shows `5,520` and `5,354.40`; preset 3 shows the network volume `42,000`, the rate `59.1%`, the gross `24,833.45`, the downline `16,560`, the payout before tax `8,273.45`, the tax `248.20`, and the hero net `8,025.25`, with three leg rows of `12,000` at `5,520` each; one `aria-pressed="true"`; setup/result text; D-7 clear on edit; D-5 price reset to 3,000 after a typed 5,000; `aria-live="polite"`; labelled inputs with `min="0"`; no `next-intl` or `@/locales` import in the source | `... vitest run src/components/marketing/tutor-commission-calculator.test.tsx --silent=true` | The same command exits 0 | 1.8 block |
| 1.7 | `page.test.tsx` | `[data-testid='tutor-calculator']` is null; the order index of `tutorRole` < `tutor-calculator` < `tutor-commitments` fails; the anchor `#commission-calculator` is absent | `... vitest run "src/app/\[locale\]/(marketing)/products/tutor-advantage/page.test.tsx" --silent=true` | The same command exits 0; the existing four cases in that file still pass | 1.8 block |
| 1.8 | none (gate task) | — | The gate block of section 5.1 | Every command exits 0; the hand captures show `gross − downline − tax = net` | The 1.8 block is the Phase 1 closeout gate |
| 2.1 | `src/lib/__tests__/tutor-screens.test.ts` | importing `tutorScreens` fails or `Object.keys` is not `["studentHome","shortAnswer","classList"]`; the three `src` values are not `/images/products/tutor-advantage/<folder>/<file>.webp`; width/height are not 520×1125, 520×1125, 1440×900; `portrait` is not `false`; the files do not exist | `... vitest run src/lib/__tests__/tutor-screens.test.ts --silent=true` | The same command exits 0, and the inherited `products-page-pictures.red.test.tsx` still exits 0 (it iterates the new values) | 2.4 block |
| 2.2 | `page.test.tsx` + locale test | three `[data-testid='tutor-screens']` cards are absent; the order `tutorRole` < `tutor-screens` < `tutor-calculator` fails; each card's `img` alt is not the slot alt; the captions are absent; the nine `screens.*` strings are missing in en and th and the zh values are not equal to en | `... vitest run src/__tests__/www-tutor-calculator.locale.test.ts "src/app/\[locale\]/(marketing)/products/tutor-advantage/page.test.tsx" --silent=true` | The same command exits 0 | 2.4 block |
| 2.3 | locale test | the new `tutorRole.points[3]` and `faq.items[5].answer` strings are not found in en or th; the zh values are not the new English; the old lines are still in the file | `... vitest run src/__tests__/www-tutor-calculator.locale.test.ts --silent=true`, then `rg -n "We do not publish income figures" src/locales/pages/products/tutor-advantage.ts` (exit 1 expected) | The test exits 0 and the `rg` exits 1 with no line | 2.4 block |
| 2.4 | none (gate task) | — | Section 5.2 block, including the full-SHA selector | Every command exits 0; the selector prints `["www-reading-advantage"]` | The 2.4 block is the Phase 2 closeout gate |
| 2.5 | none (human gate) | — | The PM page-check | The PM report shows the sections in order, no horizontal scroll, and Daniel's Thai pass | Track closeout |
| 2.6 | none (push gate) | — | One www-only push after 2.5 | Three URLs answer 200 and show both sections | Closeout C.1 |

**Red discipline.** One Red commit per row. Each Red file must fail on the assertion named in the row, and the commit note quotes the failing assertion text and the exit code (A4, A5). A Red file that exits 0, or that fails on a missing test dependency, is not a Red step: fix the environment and run again.

**Green discipline.** No Green change edits a Red assertion to make it pass. A wrong assertion goes back to the orchestrator as a spec question, not to Green as a shortcut.

## 4. Review gates

| Gate | Phase 1 | Phase 2 | Reason |
|---|---|---|---|
| Review A (correctness) | apply | apply | P1 carries the money algorithm, the BigInt truncation, the keyboard-reachable inputs, and the copy fidelity. P2 carries the manifest shape, the asset paths, the DOM order, and the absence of the old lines. |
| Review B (security) | does not apply as a separate role; probes folded into Review A | same | Judge from the real surface: a static public page, client-side arithmetic over local state, no auth, no session, no persistence, no server input, no new dependency, no external fetch. The probes below cover the new surface. |
| Review C (UX/API contract) | apply | apply | New public contract: the `calculator.*` and `screens.*` key paths, the `tutorScreens` export, the two testids, the DOM order, the accessibility states, and the two live lines. Review C reads the browser evidence. |
| Adversarial testing | apply (focused) | apply (focused) | Section 4.2. |
| Browser review (UX) | apply | apply | Section 4.3. |

### 4.1 Review B probes (folded into Review A)

1. The client component makes no network call: no `fetch`, no `XMLHttpRequest`, no `next/dynamic` of a remote module.
2. No `dangerouslySetInnerHTML` in the calculator or the gallery.
3. No new dependency in `apps/www-reading-advantage/package.json` and no `pnpm-lock.yaml` change.
4. The only inline style sets a CSS custom property whose value is a satang ratio, so no user string reaches a style attribute.
5. The push is www-only: the app selector prints one app id.
6. The calculator renders no personal data and stores nothing.

A phase that adds an endpoint, a form post, a third-party script, or a stored value stops and opens Review B for that change.

### 4.2 Adversarial testing

The adversarial role mutates the Green work and records a kill for each mutant. A surviving mutant is a finding.

| # | Mutant | Expected kill |
|---|---|---|
| M1 | Replace the BigInt product with `Math.round(rate * gvSatang)` | The 1e9 satang pin (`71422027600`) fails; the float value is `71422027583` |
| M2 | Round the product instead of truncating it | Preset 2 gross moves to 12,655.70, payout 4,645.70, net 4,506.33 |
| M3 | Compute `payout` independently of the leg sum | The satang equality `801,000 + 464,569 = 1,265,569` fails |
| M4 | Use the June per-child override `(r − r_child) * GV_child` | Preset 3 leg payout moves off 5,520.00 |
| M5 | Pay a second level, or subtract a direct tutor's net | Preset 2 and 3 payouts move; the 22,714-class figures reappear |
| M6 | Remove the `max(0, …)` floor | `payoutAfterDeduction(100, 150)` returns −50 |
| M7 | Let a preset keep a typed price (D-5) | The component preset test reads 5,000 in the price input after preset 1 |
| M8 | Keep the preset selected after an edit (D-7) | The `aria-pressed` count is 1 where 0 is required, and the setup line is still shown |
| M9 | Append 0 students for a new leg | `resizeLegs([], 1)` gives `[0]`, not `[3]` |
| M10 | Translate the zh block | `zh.calculator.heading` is not equal to `en.calculator.heading` |
| M11 | Keep one old live line | The absence assertion and the `rg` both fail |
| M12 | Nest `tutorScreens` inside `productPictures` | `tsc` fails on the satisfies clause, and the inherited picture test throws on `statSync(undefined)` |
| M13 | Point a manifest `src` at a missing file | The `existsSync` assertion fails |
| M14 | Drop one graph row, or keep the leg rows after the leg count drops | The graph row count assertion fails |
| M15 | Remove `aria-live` or a label | The role and label queries fail |
| M16 | Swap the gallery and calculator order | The order index assertion fails |
| M17 | Change one word of an en string | Exact string equality fails |
| M18 | Inject a D-16 token into the en block | The claim scan fails on that token; the positive control already proves the predicate fires |

Adversarial attack inputs, run against the module: `0`, `−1`, `NaN`, `Infinity`, `−0`, `1e9`, `Number.MAX_SAFE_INTEGER` as volume; price `0`, `−5`, `0.5`; a leg array of 1,000 entries; a leg count of `2.5` and `−1`; a `studentsPerLeg` entry of `NaN`. Every case must return finite, non-negative money, and the conservation identity must still hold.

**Copy claims (D-16).** The scan covers the whole `calculator` block and the two live lines. It fails on `annual`, `per year`, `hour`, `hourly`, `VAT`, `Tawi`, `no earning cap`, `salary`, `teacher`, a second percentage outside the rate formula, and any 4-digit year used as a date. Each token is a positive control in a copy object, so a scan that cannot fire is a finding.

**Locale drift.** Attack the parity from both sides: remove one key from th (fails), add an extra key to zh (fails), replace one zh value with a Chinese translation of the en line (fails on the D-10 identity), and replace one th value with its en string (fails on exact match).

### 4.3 UX browser review

- Viewports: 390, 980, 1280 px, and 768 px as a fourth look for the `md` grid switch. Locales: en, th, zh. Capture of the whole page and of each new section.
- Checks: no horizontal scroll at 390 px; the two sections in order; the hero figure readable; the breakdown rows legible; `gross − downline − tax = net` on screen; the graph bars sum to the whole; the preset row wraps without clipping; 44 px targets on the preset buttons and the leg controls; keyboard path through price, own students, leg count, each leg, and each preset; the focus ring visible; the rate curve hidden from assistive tech.
- Evidence: captures under the track folder, named by viewport and locale. The PM page-check repeats the three required widths.

## 5. Gate commands per phase

### 5.0 Pre-gate: install, once per worktree

The worktree has no `node_modules`, so the first `pnpm --filter www-reading-advantage exec vitest` fails with `EACCES` before any test runs (measured).

```bash
HEAVY 'pnpm install --frozen-lockfile'
git diff --exit-code pnpm-lock.yaml
```

Run it after the capture of `phase_base_sha` and before the first Red command. A lockfile change is a stop: this track adds no dependency.

### 5.1 Phase 1

```bash
# targeted Red/Green commands, per task, section 3
HEAVY 'pnpm --filter www-reading-advantage exec vitest run src/lib/tutor-commission.test.ts --silent=true'
HEAVY 'pnpm --filter www-reading-advantage exec vitest run src/__tests__/www-tutor-calculator.locale.test.ts --silent=true'
HEAVY 'pnpm --filter www-reading-advantage exec vitest run src/components/marketing/tutor-commission-calculator.test.tsx --silent=true'
HEAVY 'pnpm --filter www-reading-advantage exec vitest run "src/app/\[locale\]/(marketing)/products/tutor-advantage/page.test.tsx" --silent=true'

# closeout gate
HEAVY 'pnpm --filter www-reading-advantage test --reporter=dot --silent=true'
HEAVY 'pnpm turbo run check-types --filter=www-reading-advantage'
HEAVY 'pnpm --filter www-reading-advantage lint'
git diff --exit-code scripts/ci/shadcn-ratchet-baseline.json
HEAVY 'pnpm --filter www-reading-advantage build'
```

### 5.2 Phase 2

```bash
HEAVY 'pnpm --filter www-reading-advantage exec vitest run src/lib/__tests__/tutor-screens.test.ts --silent=true'
HEAVY 'pnpm --filter www-reading-advantage exec vitest run src/__tests__/www-tutor-calculator.locale.test.ts --silent=true'
HEAVY 'pnpm --filter www-reading-advantage exec vitest run "src/app/\[locale\]/(marketing)/products/tutor-advantage/page.test.tsx" --silent=true'

# closeout gate: the five Phase 1 commands again, then
node scripts/ci/affected-apps.mjs --base ff028a7105ccd5de0c3e9534dd8536b7667e22de --head <HEAD>
```

**Selector rule.** `scripts/ci/affected-apps.mjs` exits 2 unless both ids are 40 characters. `ff028a710` is 9 characters and a measure-only range prints `[]`. Use the full base `ff028a7105ccd5de0c3e9534dd8536b7667e22de` and the full head from `git rev-parse HEAD`. A measure-only range is not evidence for this gate.

### 5.3 Aggregate-suite handling (intentionally-red tests)

- The whole-package gate is `pnpm --filter www-reading-advantage test`. It runs the legacy `.red.test.ts` files, which are green at the base. This track adds no always-red file, so the gate must exit 0.
- Before the first Red commit, run the whole suite once at `phase_base_sha` and record the baseline: `Test Files N passed`, `Tests N passed`, and the name of every failing file. The phase gate must show the same failure set or better, never a larger one, and the note quotes both counts as labeled integers (A3).
- Never read a `--silent=true` run with no output as a pass. The exit code and the summary line are the evidence.
- The root suite (`pnpm turbo run test`) is not a gate of this track: it covers other apps that this track does not touch.

### 5.4 Human gate and push order (D-13)

1. Task 2.4 exits 0.
2. Task 2.5: the PM captures `/en/`, `/th/`, and `/zh/products/tutor-advantage` at 390, 980, and 1280 px, into `~/Desktop/handoff/page-check/<stamp>/`. Daniel reads the Thai on the built page.
3. Only after 2.5, and only with the standing approval read as "push after the page-check": one www-only push. The selector proves the range touches one app. No deploy command runs from this session.
4. Task 2.6 records the CD run and the HTTP status of the three URLs.
5. Phase 1 never pushes alone (D-13). If the PM asks to ship the calculator first, task 2.5 moves into Phase 1 word for word and no other task moves.

## 6. Anti-pattern coverage per phase

Catalog: `measure/anti-patterns.md`. A1, A2, A8, and A11 are not phase risks of this track: A1 is supervisor code, A2 is a publish gate, A8 is the plan marker vocabulary, and A11 is a review track.

### 6.1 Phase 1

| A | Defense in this phase | Falsification condition |
|---|---|---|
| A3 | Every money value is a literal with a label in the evidence (`rate_30k=55.6065`, `gross_satang=1265569`). No assertion uses a bare `\d+` regex. The suite baseline is recorded as `test_files=N`, `tests=N`. | A line with a date or a commit number passes a count or a rate check. |
| A4 | Each Red file fails at the base for the named reason. The locale test imports the production dictionary, so it fails on the missing key, not on a fixture. The module test has a passing positive control at base (the six-rate table is computed from a formula written in the test) so a typo in the test cannot masquerade as a Red signal. | A Red file exits 0, or it fails on a missing dependency or a syntax error, or the control case also fails. |
| A5 | The plan note for 1.1, 1.3, 1.5, and 1.8 quotes the exit code and the summary line of the command it ran. "All checks pass" appears only after the command exits 0. | The note says pass and the cited command exits non-zero; or the note quotes one exit code for a different command. |
| A6 | The registry row and the 1.9 checkpoint say Phase 1 is local and unpushed (D-13). No note says the calculator is live. | The registry claims the calculator is deployed or viewable on the site. |
| A7 | Absence checks name exact literals: `5,884`, `5,707`, `22,714`, `9,889`, `inputs.secondLevel`, `inputs.studentsSecondLevel`, `explain.twoLevels`. No English word is an exclusion token. | A near-miss literal is dropped, or a line is excluded because it contains "never" or "do not". |
| A10 | After the module, the component, and the CSS rule land, the phase checkpoint runs `build-graph update ./graph.db` over the changed source files. | New exports exist and the graph stays stale. |
| A15 | No role writes a hash or a receipt with a file hash. The strategy, the Red notes, and the Green notes hold commit ids and command output only. A detector over the new test files fails on `createHash` or `sha256`. | A new test or note carries a file hash. |

### 6.2 Phase 2

| A | Defense in this phase | Falsification condition |
|---|---|---|
| A3 | Manifest facts are labeled integers (`width=520`, `height=1125`, `bytes_max=1000000`), and the selector output is quoted as the exact array. | A size or count is asserted as `> 0` or matched by a digit regex. |
| A4 | The asset test proves it can fail: a wrong path built by the same helper resolves to no file, and the assertion on it is expected true. The three real files exist before the order assertions run. | The asset test passes with a missing file, or it fails on an unrelated reason. |
| A5 | The 2.4 note quotes the exit code of each gate, the exact selector array, and the file counts. The 2.1 note names `blur_rectangles` per file and the review result per file. | The plan says "all pass" while a gate command exits non-zero, or the selector evidence is a 9-character base. |
| A6 | The 2.6 note names the CD run and the live HTTP status only after the run finishes. A "pushed" note without the run id is not accepted. | The registry says live before the CD run and the 200s are recorded. |
| A7 | The two old live lines are exact strings in an absence list; the replaced figures are exact literals. No filter token is a bare word. | An old line survives because the filter excluded its line. |
| A9 | No test of this track reads a `measure/tracks/`, `measure/runs/`, or `measure/archive/` path. A detector fails on those strings in the new test files. | A new test holds a measure path. |
| A10 | The manifest export and the page wiring change at 2.1 and 2.2; the checkpoint runs `build-graph update` over the changed files. | `tutorScreens` exists and the graph does not hold it. |
| A12 | The manifest test reads `tutorScreens` from `src/lib/product-pictures.ts` and compares `Object.keys` with the three named slots. It holds no second copy of the entries (no `src`/`width` literals of its own beyond the expected values of AC-13, which are the contract). | The check holds its own manifest that drifts from the module. |
| A13 | The closeout moves the track folder to `measure/archive/www_tutor_calculator_20261117` and removes the stale `measure/tracks/` copy. | Both paths exist after closeout. |
| A14 | Every shell detector uses `rg -n '<regex>'`. An exit code of 2 is a failure and never a "no hit" result. | A detector exits 2 and the evidence reads clean. |
| A16 | One worktree (`/home/daniebo/Desktop/rama-worktrees/a63-tutor-calculator`). `git worktree list --porcelain` is the evidence. | A second worktree appears for this track. |

## 7. Human checks and who does them

| Check | Owner | Evidence | What a test cannot do |
|---|---|---|---|
| The Thai lines on the built page | Daniel | The PM page-check report, task 2.5 | Judge idiom, tone, and the commission wording in Thai |
| The page-check at 390, 980, and 1280 px, three locales | The PM | `~/Desktop/handoff/page-check/<stamp>/` | See a real viewport, a real font fallback, and a wrapped preset row |
| The screenshot use rules, one line per file | The Green role of 2.1, confirmed by the PM | One line per used screen against the six rules of spec 6.1, plus one full-size look per saved copy | Read pixels and judge a blur at 100 % |
| The zh placeholder acceptance (D-10) | The PM, with the track owner | The 2.5 report states that English is expected inside the two new sections | Decide that a placeholder is acceptable on the live page |
| The push word | Daniel, with the PM | Task 2.6 note | Decide that a push at this moment may start the CD deploy |
| The blur review per file | The Green role of 2.1 | `student-mobile/070` holds "Reading 3.1" in four places and `tutor-desktop/062` in four places (header, subtitle, lesson dropdown, progress card); `student-mobile/002` holds none. The script's rectangle list must match, and `blur_rectangles=0` for 002 is the expected line. | Prove that no occurrence remains after the blur |

Dismissed nit, recorded so no role reopens it: spec-review round 2 F7 claimed `student-mobile/002` reads a different label word than the spec quote. The file was opened at the role base: it shows "ขั้นที่ 8/18", the spec's quote. F7 is dismissed as a wording nit with no build effect.

## 8. Residual risks and the `phase_base_sha` capture point

### 8.1 Residual risks no gate in this track covers

1. A translator edits a zh value after the track and the D-10 identity breaks silently. The locale test catches it only when it runs.
2. The live CD deploy can fail for a reason outside this range (the shared pipeline, another app's build). The 2.6 note records the run, and the fix is a new track.
3. `student-mobile` files are 520 px wide, so at 1280 px the phone cards are upscaled. The PM accepted the 11 % upscale on 2026-11-17 (open question 6, resolved). No test asserts sharpness.
4. The rate curve draws the formula from the same numbers as the text, so a curve that is wrong in shape and right at the dot is not caught. It is `aria-hidden` and decorative by D-11.
5. The 3 % withholding tax is a business rule copied from the spec and the settlement service. No test compares the module to `finance-mlm-service`; the pins come from the spec. A drift in the service is invisible here.
6. JavaScript disabled: the calculator is a client component, so it shows its default paint only. The page must remain readable; no test asserts the no-JS state.
7. `graph.db` freshness is maintained by one checkpoint command. A later role that edits exports and skips the command leaves the graph stale (A10).

### 8.2 Capture of `phase_base_sha`

- This file holds no `phase_base_sha`, and no SHA in this file is a `phase_base_sha`.
- **Phase 1:** the orchestrator runs `git rev-parse HEAD` in `/home/daniebo/Desktop/rama-worktrees/a63-tutor-calculator` **immediately after the commit that adds this strategy and its two run files, and before the first Red role writes any test file**. The full 40-character value is the Phase 1 base. It is recorded in the Red evidence of task 1.1.
- **Phase 2:** the orchestrator captures a second value the same way **after the Phase 1 checkpoint commit (task 1.9) and before task 2.1 runs**. The Phase 2 base does not move afterwards.
- The current HEAD, `6c47d7fe49398ac91b3703e47b15249d226294cf`, is the role base of this file. It is an ancestor of the strategy commit, so it is not a valid base.
- Other sessions commit on the shared branch, so `phase_base_sha..HEAD` can hold unrelated commits. Every scope check uses the named paths and the track commits matched by `--grep='track_id: www_tutor_calculator_20261117'`.
- The install pre-gate of section 5.0 runs after the capture and before the first Red command.

## 9. Open questions for the PM

| # | Question | Default if no answer |
|---|---|---|
| Q1 | Spec 6.2 says the entries go "into `productPictures`". `productPictures` is `as const satisfies Record<string, ProductPictureFile>`, so a nested `tutorScreens` object breaks the type, and `products-page-pictures.red.test.tsx:59` stats each value and throws on a nested object. Sibling export, or a different file? | A sibling `export const tutorScreens` in `src/lib/product-pictures.ts`, same type shape, slot order, `portrait: false` |
| Q2 | The `commitments` section has no `data-testid`. May task 1.7 add `data-testid="tutor-commitments"` to that existing section so the order test has an anchor after the calculator? | Yes, add the testid only; no visual change |
| Q3 | The D-5 price reset and the D-7 clear are spec decisions with no acceptance criterion. Are the two component assertions of task 1.5 required, or should the strategy drop them? | Keep both assertions; they are the only falsifiers for D-5 and D-7 |
| Q4 | Does the Phase 1 checkpoint commit count as the Phase 1 base for the Phase 2 capture, or does the orchestrator capture Phase 2 only after the install pre-gate? | Capture after the Phase 1 checkpoint commit and before task 2.1; the install pre-gate does not move the base |
