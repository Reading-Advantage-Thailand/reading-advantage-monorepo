# Phase 5 — Embeddable Runtime, i18n, and Shared Package (Frozen 2026-07-05)

> **Track:** `wave3_product_alignment_20260628`
> **Baseline SHA:** `c915e7fd` (HEAD at strategy authoring; Phases 0/1/2/3/4 complete
> and accepted — see `audit/phase-4-acceptance.json`).
> **Owner:** `measure-strategy` (this cycle) — decisions recorded from audit evidence
> (`advantage-games_20260626/`) and current source reality at HEAD `c915e7fd`.
> **Spec gate:** `spec.md` §Acceptance Criteria — "At least one representative game
> proves embeddable navigation, i18n, and host progress integration in a test harness
> before any product import."
> **Import policy gate:** `phase-0-decisions.md` Decision 3 — Phase 5 must close D-07
> (English-only + hardcoded `/en/`), D-09 (hardcoded SPA navigation /
> `window.location.href`), and D-11 (duplicated runtime primitives) AND deliver a
> passing import-harness test for the representative game before the
> `haunted-library` pilot-import gate (successor track) may proceed.
> **Phase 4 handoff:** `phase-4-decisions.md` Decision 4.7 §5 explicitly deferred
> host-app wiring to Phase 5; Phase 4 delivered the domain query + shared schema, the
> standalone `rankingRoute.ts` remains mock but validates via the real schema.

This document freezes the product/technical decisions for Phase 5. It is the
embeddable-runtime shape Jr-Green implements and the falsifiability anchor Mid-Red
writes tests against. Tier 1 items are evidence-grounded and `[x]`-actable; Tier 2
items are `[b] deferred:po` or `[b] deferred:infra` with a precise owner question.

---

## Decision framework

Phase 3 was the **contract** phase (shared Zod schema, server-side XP formula,
fire-once logic proven with a mock DB). Phase 4 was the **tenant-safe persistence**
phase (`gameCompletions` FLAT table, `xpLogs` unique constraint,
`leaderboards.schoolId` notNull, server-backed leaderboard, host-mutation Zod).
Phase 5 is the **embeddable runtime** phase. The split is honest:

- **Phase 3 (complete):** the shared Zod contract, the server-side XP formula, the
  idempotent domain function signature and logic. Proven at the unit level with a
  mock DB.
- **Phase 4 (complete):** the `gameCompletions` table migration (FLAT, `schoolId`),
  the `xpLogs` unique constraint for race-safe fire-once, the
  `leaderboards.schoolId` notNull migration, the `gameRankings` deprecation, the
  server-backed leaderboard domain query, the host-mutation Zod (D-06 Tier 1), and
  the PGlite live-DB proof of tenant isolation.
- **Phase 5 (this phase):** the embeddable navigation contract (D-09), the i18n
  message source (D-07), the shared games runtime module (D-11), and the
  `haunted-library` import-harness proof. Proven at the unit + harness level with
  mock host navigation/locale/progress. No new schema migration. No host production
  wiring. No real th/zh translation content.
- **Successor track (deferred):** the remaining 24 games migrate to the shared
  runtime + embeddable navigation + i18n one batch at a time, gated by their
  `game-readiness-matrix.md` per-game blockers being closed. Then `packages/games-runtime`
  workspace extraction + the `haunted-library` production pilot import in Reading
  Advantage.

This split keeps Phase 5 falsifiable without entangling it with a 26-game migration
or a production import. The embeddable-runtime contract + the harness proof is the
load-bearing artifact; the production import is downstream.

---

## Decision 5.1 — Embeddable navigation contract (D-09, B27-010, B29-004, B31-001, B21-039)

**Question:** How does a game exit/navigate without breaking host embedding?

**Source reality at HEAD `c915e7fd`:**

- `apps/advantage-games/src/components/games/vocabulary/archers-revenge/ArchersRevengeGame.tsx:331`,
  `paladins-twin-soul/PaladinsTwinSoulGame.tsx:350`,
  `enchanted-library/EnchantedLibraryGame.tsx:923`,
  `village-guardian/VillageGuardianGame.tsx:509`,
  `rune-forge-chamber/RuneForgeChamberGame.tsx:447`,
  `labyrinth-goblin-king/LabyrinthGoblinKingGame.tsx:396`,
  `dungeon-liberator/DungeonLiberatorGame.tsx:620`,
  `realm-carver/RealmCarverGame.tsx:344`,
  `shadow-gate-dungeon/ShadowGateDungeonGame.tsx:476`,
  `spellweavers-run/SpellweaversRunGame.tsx:432` — **10** `window.location.href =
  "/student/games"` or `"/"` exits. These full-page exits break host embedding
  (D-09, B27-010/B29-004/B31-001/B21-039).
- `apps/advantage-games/src/components/games/sentence/potion-rush/PotionRushGame.tsx:6,40,350`
  — `useRouter().push("/")` SPA navigation (Next.js router); also breaks host
  embedding because the host's router is not the games app's router.
- `apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-rider/page.tsx:99,113`
  — hardcoded `<Link href="/en/student/games">` (locale-pinned absolute path; also
  D-07).
- `apps/advantage-games/src/lib/gameCards.ts:18-242` — **28** hardcoded
  `/en/student/games/...` hrefs (B36-001/002, also D-07).
- Positive: `apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/haunted-library/page.tsx:168`
  — `<Link href="/">Back to Dashboard</Link>` is already host-relative (no
  `/en/` prefix, no `window.location`). The `HauntedLibraryGame.tsx` component
  itself contains **zero** `window.location.href`/`router.push` calls (grep
  confirms). This is why `haunted-library` is the best-behaved representative
  per `game-readiness-matrix.md`.

### Decision 5.1 (`[x]` — fully evidence-grounded, no PO gate)

**Contract frozen:**

1. **Host-injected `onNavigate` callback.** The representative-game page accepts
   an optional `onNavigate?: (target: "back" | "exit" | "games") => void` prop.
   When provided (host context), navigation calls invoke `onNavigate` and do NOT
   mutate `window.location` or call `router.push`. When absent (standalone
   advantage-games), navigation falls back to the existing `Link`/`router.push`
   behavior so the standalone app keeps working (Decision 3.7 honest
   standalone/host split, carried forward).
2. **No `window.location.href` mutations in representative-game components.** The
   `HauntedLibraryGame.tsx` component already has none; the `DragonRiderGame.tsx`
   page-level `Link href="/en/student/games"` is rewritten to call `onNavigate`
   (or fall back to `<Link href="/student/games">` — locale-agnostic, host-resolved).
3. **`gameCards.ts` hrefs become locale-agnostic.** The 28 `/en/student/games/...`
   hrefs are rewritten to `/student/games/...` (the `[locale]` segment is resolved
   by the host router, not pinned in the href). This is the D-07 fix for the
   gallery; per-game page-level `/en/` hrefs migrate as each game migrates
   (Phase 5 does `dragon-rider` as the representative; remaining 24 are successor
   track).
4. **Import-harness proof.** The harness renders `HauntedLibraryGame` inside a
   `HostShell` mock that provides `onNavigate`. The test asserts: (a) completing
   the game does NOT mutate `window.location.href` (spy assertion); (b) the
   `onNavigate("exit")` callback fires when the user clicks the exit control
   (event-spy assertion); (c) the standalone fallback (no `onNavigate`) still
   renders `<Link>` (positive control — the standalone path is not broken).

**Tier 2 `[b] deferred:infra`:** migrate the remaining 24 games' `window.location`
exits + `useRouter().push` to the `onNavigate` contract. Phase 5 migrates only
`haunted-library` (already clean) and `dragon-rider` (representative navigation-fix
sample). The 10 `window.location.href` exits in archers-revenge/paladins-twin-soul/
enchanted-library/village-guardian/rune-forge-chamber/labyrinth-goblin-king/
dungeon-liberator/realm-carver/shadow-gate-dungeon/spellweavers-run remain until
their per-game migration in the successor track. A conscious non-test comment in
the import-harness test records this deferral so it is not silently skipped (A11).

**Evidence refs:** `advantage-games_20260626/findings.md` §A4, §D D-09
(B27-010/B29-004/B31-001/B21-039); `migration-tracks.md` T3; `phase-0-decisions.md`
Decision 3 (Phase 5 pilot-import gate); `game-readiness-matrix.md` haunted-library
row ("Warning link to `/` (B21-009). Positive: sends real counts (B21-235)").

---

## Decision 5.2 — i18n message source (D-07, B22-001, B36-001, B36-002, B42-242)

**Question:** How does a game read its locale + messages without pinning `/en/`?

**Source reality at HEAD `c915e7fd`:**

- `apps/advantage-games/src/locales/client.ts:39-41` — `useCurrentLocale()` returns
  the literal `'en'` (hardcoded). Every page that calls `useCurrentLocale()` gets
  `'en'` regardless of the URL `[locale]` segment.
- `apps/advantage-games/src/app/[locale]/layout.tsx:3-5` —
  `generateStaticParams()` returns only `[{ locale: "en" }]`. The static export
  cannot produce non-`en` routes.
- `apps/advantage-games/src/locales/en.ts` — 4168-line comprehensive translation
  tree (B42-242 positive). The tree exists but is not wired to a real locale
  source; `useScopedI18n` reads from this single `en` catalog.
- `apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/haunted-library/page.tsx:7,37,38,135`
  — page already imports `useCurrentLocale` + `useScopedI18n` and calls `t('loading')`
  with fallback. The wiring is correct; the locale source is fake.
- `apps/advantage-games/package.json` — no `next-intl`/`next-international`
  dependency. The custom `client.ts` is the entire i18n layer.

### Decision 5.2 (`[x]` — fully evidence-grounded, no PO gate)

**Contract frozen:**

1. **`useCurrentLocale` reads from a host-injectable source.** The function is
   rewritten to read the locale from a React context (`GamesLocaleContext`) that
   defaults to `'en'` in standalone mode and is provided by the host shell in
   import mode. The context value is a single `locale: string` — no
   `next-intl`/`next-international` migration (the existing `en.ts` tree is the
   seed catalog; the host provides the locale string, the games app provides the
   message catalog for that locale).
2. **`generateStaticParams` returns `['en', 'th', 'zh']`.** The standalone export
   produces all three locale routes. The `[locale]` segment is no longer pinned to
   `en`. (The standalone app still only ships `en.ts` content; `th`/`zh` routes
   fall back to `en` keys via the existing `translations[fullKey] || key`
   fallback in `client.ts:27`. This is honest: the fallback is explicit, not
   silent.)
3. **`useScopedI18n` accepts a locale-aware catalog.** The `client.ts`
   `translations` map is rebuilt per-locale: `en.ts` for `en`; for `th`/`zh`, the
   map is empty (or a future `th.ts`/`zh.ts` if provided), and `useScopedI18n`
   returns the key itself as the fallback. This is the existing behavior, made
   locale-aware.
4. **Representative-game page wiring.** The `haunted-library` page already calls
   `useScopedI18n('pages.student.gamesPage')` and `useCurrentLocale()`. Phase 5
   ensures the `locale` value flows into the `fetch(`/api/v1/games/haunted-library/sentences?locale=${locale}`)`
   call (already wired at `page.tsx:46`). The `dragon-rider` page is rewritten
   to drop the hardcoded `/en/` and use the same locale flow.
5. **Import-harness proof.** The harness renders `HauntedLibraryGame` inside a
   `HostShell` that provides `locale="th"`. The test asserts: (a) the page's
   `fetch` call includes `?locale=th` (mock-fetch spy); (b) the
   `useCurrentLocale()` hook returns `"th"` (context assertion); (c) the
   `useScopedI18n` fallback returns the key when no `th` translation exists
   (positive control — the fallback is reachable, not a crash).

**Tier 2 `[b] deferred:po`:** real `th.ts`/`zh.ts` translation content for the
`pages.student.gamesPage` scope. Phase 5 wires the locale source + fallback; it
does not invent Thai/Chinese translations. Tier 2 is PO-gated because translation
content is a product decision (which strings, which register).

**Tier 2 `[b] deferred:infra`:** migrate to `next-intl` (or the host app's i18n
adapter) so the games app shares the host's message catalog. Phase 5 keeps the
custom `client.ts` to avoid a framework migration entangled with the
embeddable-runtime work; the host shell provides only the `locale` string, not
the message catalog.

**Evidence refs:** `advantage-games_20260626/findings.md` §A4, §D D-07
(B22-001/B36-001/B36-002/B42-242); `migration-tracks.md` T3; `phase-0-decisions.md`
Decision 3.

---

## Decision 5.3 — Shared games runtime module (D-11, B00-014, B00-015, B29-001, B33-011)

**Question:** Where does the single canonical `VirtualDPad` / `withBasePath` /
client-side `calculateXP` live?

**Source reality at HEAD `c915e7fd`:**

- **Two duplicate `VirtualDPad` implementations:**
  - `apps/advantage-games/src/components/ui/VirtualDPad.tsx` (115 lines, `memo`-wrapped,
    polished styling — consumed by `haunted-library`, `realm-carver`,
    `wizard-vs-zombie`, `enchanted-library`, `paladins-twin-soul`, `dungeon-liberator`).
  - `apps/advantage-games/src/components/games/ui/VirtualDPad.tsx` (113 lines, NOT
    memoized, divergent styling — consumed by `shadow-gate-dungeon`,
    `labyrinth-goblin-king`, `village-guardian`, `castle-defense`).
  - Same `onInput: (input: { dx: number; dy: number }) => void` interface; same
    angle/distance math; divergent `memo`/styling. This is the B29-001/B33-011
    divergent-primitive finding.
- **Two duplicate `basePath.ts` files:**
  - `apps/advantage-games/src/lib/basePath.ts` (8 lines, `withBasePath`).
  - `apps/advantage-games/src/lib/games/basePath.ts` (8 lines, identical `withBasePath`).
  - `gameCards.ts` imports from `'./basePath'`; per-game modules import from both
    `'@/lib/basePath'` and `'@/lib/games/basePath'` (grep confirms 30+ import
    sites split across the two). This is the B00-014/-015 finding.
- **Two duplicate `xp.ts` files:**
  - `apps/advantage-games/src/lib/xp.ts` (8 lines, `calculateXP(score, correctAnswers, totalAttempts)`).
  - `apps/advantage-games/src/lib/games/xp.ts` (13 lines, identical signature + an
    extra comment line).
  - Plus **8 per-game `calculateXP` functions** with game-state-shaped inputs:
    `hauntedLibrary.ts:171`, `realmCarver.ts:300`, `paladinsTwinSoul.ts:282`,
    `griffinSkyJoust.ts:267`, `gryphonPatrol.ts:298`, `griffinRidersEscape.ts:220`,
    `shadowGateDungeon.ts:361`, `runeForgeChamber.ts:263`. These are NOT duplicates
    of the 3-arg `calculateXP` — they take game-state objects and apply per-game
    bonuses. They are correctly per-game; only the two 3-arg `xp.ts` files are
    redundant duplicates.
- **Server-side `calculateGameXP` (Phase 3) is the source of truth.** The
  client-side `calculateXP` is a display preview only (Phase 3 Decision 3.3,
  `phase-3-decisions.md`). Phase 5 does NOT merge the per-game `calculateXP`
  functions into the shared runtime — they are game-specific state→XP mappers,
  not runtime primitives. The shared runtime exports only the 3-arg
  `calculateClientXP` for games that use the simple score/accuracy model.

### Decision 5.3 (`[x]` — fully evidence-grounded, no PO gate)

**Contract frozen:**

1. **New canonical module: `apps/advantage-games/src/lib/games-runtime/`.** This
   module is the single source of truth for the three duplicated primitives:
   - `VirtualDPad` — re-exported from `games-runtime/index.ts`. The memoized,
     polished implementation (current `components/ui/VirtualDPad.tsx`) wins. The
     non-memoized `components/games/ui/VirtualDPad.tsx` becomes a re-export of
     the canonical one (preserving the import path so unmigrated games don't
     break) — Tier 2 drop is deferred.
   - `withBasePath` — re-exported from `games-runtime/index.ts`. The
     `lib/basePath.ts` and `lib/games/basePath.ts` files become re-exports of
     the canonical implementation. Tier 2 drop is deferred until all 26 games
     migrate.
   - `calculateClientXP` — the 3-arg `calculateXP(score, correctAnswers, totalAttempts)`
     is renamed `calculateClientXP` (to distinguish from the server-side
     `calculateGameXP` from Phase 3) and lives in `games-runtime/xp.ts`. The
     `lib/xp.ts` and `lib/games/xp.ts` files become re-exports.
2. **Representative-game consumers migrate to the canonical module.** The
   `haunted-library` page + component import `VirtualDPad` from
   `@/lib/games-runtime`; the `dragon-rider` page imports `withBasePath` (if
   needed) from `@/lib/games-runtime`. The 8 per-game `calculateXP` functions
   are NOT touched (they are correctly game-specific).
3. **Import-harness proof.** The harness imports `VirtualDPad` + `withBasePath`
   + `calculateClientXP` from `@/lib/games-runtime` and renders
   `HauntedLibraryGame` (which uses `VirtualDPad`). The test asserts: (a) only
   one canonical `VirtualDPad` implementation exists (static guard: a labeled
   count `Canonical VirtualDPad source count: 1` parsed from a grep of the
   `games-runtime/index.ts` re-export — A3 defense); (b) the rendered
   `VirtualDPad` is the memoized one (a `data-testid` or `memo`-identity
   assertion); (c) `calculateClientXP(100, 10, 10)` returns `10` (labeled
   integer — A3 defense).
4. **No `packages/games-runtime` workspace extraction in Phase 5.** Only 2 of 26
   games migrate to the canonical module in Phase 5. Extracting a workspace
   package prematurely would leave 24 games importing from a workspace package
   they haven't migrated to. The in-app canonical module is the honest single
   source of truth for the harness proof; the workspace extraction is the
   successor-track Tier 2 item.

**Tier 2 `[b] deferred:infra`:** (a) extract `apps/advantage-games/src/lib/games-runtime/`
into a `packages/games-runtime` workspace package; (b) drop the duplicate
`components/games/ui/VirtualDPad.tsx`, `lib/basePath.ts`, `lib/games/basePath.ts`,
`lib/xp.ts`, `lib/games/xp.ts` re-export shims once all 26 games migrate. Phase 5
keeps the re-export shims so unmigrated games don't break (no `window.location`
exit is silently introduced by a broken import path).

**Evidence refs:** `advantage-games_20260626/findings.md` §A6, §D D-11
(B00-014/-015/B29-001/B33-011); `migration-tracks.md` T4; `phase-3-decisions.md`
Decision 3.3 (server-side `calculateGameXP` is the source of truth;
client-side `calculateXP` is display preview only).

---

## Decision 5.4 — Representative game scope

**Question:** Which games migrate in Phase 5?

**Source reality at HEAD `c915e7fd`:**

- `game-readiness-matrix.md` — `haunted-library` is the only AT-RISK
  best-behaved game (sends real counts B21-235, single warning link to `/`
  B21-009, no `window.location.href` exit, already uses the memoized `VirtualDPad`,
  already wired to `useScopedI18n` + `useCurrentLocale`).
- `dragon-rider` — has hardcoded `<Link href="/en/student/games">` (D-07 + D-09
  representative sample). Migrating it proves the navigation contract works on a
  game that is NOT already clean (unlike `haunted-library`).
- The remaining 24 games have one or more of: `window.location.href` exits (10
  games), duplicate completion payloads, NOT-READY readiness, missing tests,
  per-game `calculateXP` divergence. They migrate in the successor track.

### Decision 5.4 (`[x]` — fully evidence-grounded, no PO gate)

**Scope frozen:**

1. **`haunted-library`** — the import-harness representative. Already clean on
   navigation (no `window.location.href`, host-relative `<Link href="/">`). Phase 5
   work: (a) wire `onNavigate` callback (already host-relative, just needs the
   callback path); (b) wire `GamesLocaleContext` (already calls
   `useCurrentLocale`); (c) migrate `VirtualDPad` import to
   `@/lib/games-runtime`. The game component itself is largely unchanged; the
   page-level wiring is the work.
2. **`dragon-rider`** — the navigation-fix representative. Phase 5 work: (a)
   rewrite `<Link href="/en/student/games">` to call `onNavigate("games")` (or
   fall back to `<Link href="/student/games">`); (b) drop the hardcoded `/en/`
   prefix. The game component is not the focus; the page-level navigation is.
3. **No other game migrates in Phase 5.** The remaining 24 games are
   `[b] deferred:infra` for the successor track. A conscious non-test comment in
   the import-harness test records this deferral (A11 defense).

**Evidence refs:** `game-readiness-matrix.md` haunted-library row; `phase-0-decisions.md`
Decision 3 (pilot-import gate names `haunted-library`); `phase-3-decisions.md`
Decision 3.5 (`haunted-library` is the Phase 3 representative; Phase 5 continues
with the same game for continuity).

---

## Decision 5.5 — Import-harness proof (spec §Acceptance Criteria)

**Question:** How does Phase 5 prove "one representative game can run in an import
harness with host progress integration"?

**Source reality at HEAD `c915e7fd`:**

- There is no import-harness test today (grep confirms no `import-harness` directory
  under `apps/advantage-games/src/__tests__/`).
- The Phase 3 `HauntedLibraryGame.test.tsx` renders the component in isolation
  with mock sentences + mock `onComplete`. It does NOT render a host shell, does
  NOT assert on `window.location`, does NOT assert on locale context, does NOT
  assert on `recordGameCompletion` delegation.
- The Phase 3 `completeRoute.test.ts` tests the standalone route handler (mock
  response). It does NOT test host progress integration.
- The Phase 4 `games-live.test.ts` (PGlite) tests `recordGameCompletion` against
  a real DB. It does NOT test the host-shell wiring.

### Decision 5.5 (`[x]` — fully evidence-grounded, no PO gate)

**Contract frozen:**

1. **New test file:**
   `apps/advantage-games/src/__tests__/import-harness/haunted-library-import.test.tsx`.
   This is the load-bearing proof for the spec's "test harness before any product
   import" criterion.
2. **`HostShell` mock component.** A minimal host shell that provides:
   - `GamesLocaleContext` value (`locale: "th"` for the i18n proof).
   - `onNavigate` callback (jest spy).
   - Mock `recordGameCompletion` from `@reading-advantage/domain/games` (jest
     mock — the host's progress integration point).
3. **Test assertions (one per spec criterion):**
   - **Embeddable navigation (D-09):** render `HauntedLibraryGame` inside
     `HostShell`; simulate game-over; assert `window.location.href` is unchanged
     (spy on the setter); assert `onNavigate` was called with the expected
     target when the user clicks the exit control. **A4 positive control:**
     without `HostShell` (standalone mode), the game still renders and the
     `<Link>` fallback is present (the standalone path is not broken).
   - **i18n message source (D-07):** render with `locale="th"`; assert the page's
     `fetch` call includes `?locale=th`; assert `useCurrentLocale()` returns
     `"th"`. **A4 positive control:** render with `locale="en"`; assert the
     `en.ts` translation key `pages.student.gamesPage.loading` is returned (the
     catalog is reachable, not empty).
   - **Host progress integration:** simulate game-over; assert the
     `onComplete` payload (Phase 3 shape, no `xp` field) reaches the mocked
     `recordGameCompletion`; assert the mock was called exactly once with the
     `gameType: "haunted-library"` + `idempotencyKey` UUID. **A4 positive
     control:** a second game-over with the same `idempotencyKey` calls
     `recordGameCompletion` and the mock returns `duplicate: true` (the
     fire-once contract from Phase 3/4 is preserved in the host path).
   - **Shared runtime (D-11):** assert the rendered `VirtualDPad` is the
     canonical memoized one (import from `@/lib/games-runtime`); assert
     `calculateClientXP(100, 10, 10)` returns `10` (labeled integer — A3).
4. **No real Postgres, no real AI, no real network.** The harness mocks
   `recordGameCompletion`, `fetch`, and `window.location`. This is the honest
   tier for an import-harness proof: the contract is proven at the wiring level;
   the live-DB proof (Phase 4 `games-live.test.ts`) and the route-level proof
   (Phase 3 `completeRoute.test.ts`) already cover the lower tiers.
5. **Test runner: jest.** The harness lives in `apps/advantage-games` (jest), not
   `packages/domain` (vitest), because it renders a React component. The mock
   for `@reading-advantage/domain/games` uses the existing
   `moduleNameMapper: '^@reading-advantage/domain(/.*)?$'` mapping in
   `jest.config.ts:18`.

**Evidence refs:** `spec.md` §Acceptance Criteria; `phase-3-decisions.md`
Decision 3.4 (fire-once contract); `phase-4-decisions.md` Decision 4.5
(race-safe fire-once via unique constraint); `phase-0-decisions.md` Decision 3
(import-harness test is the Phase 5 gate).

---

## Decision 5.6 — Gate commands

**Question:** What commands gate Phase 5 Red / Green / closeout?

**Contract frozen:**

- **RED_TEST_COMMAND:** `pnpm --filter vocabulary-games test --testPathPatterns=import-harness`
  (jest, bounded to the new harness file). Mid-Red may also run
  `pnpm --filter vocabulary-games test --testPathPatterns=HauntedLibraryGame` to
  prove the extended component test fails for the intended reason (onNavigate
  assertion + locale context assertion).
- **GREEN_TEST_COMMAND:**
  `pnpm --filter vocabulary-games test --testPathPatterns=import-harness`
  AND `pnpm --filter vocabulary-games test --testPathPatterns=HauntedLibraryGame`
  (jest green). Jr-Green also runs
  `pnpm --filter vocabulary-games test --testPathPatterns=DragonRider` (the
  navigation-fix representative).
- **PROJECT_LINT:** `pnpm --filter vocabulary-games lint`
- **PROJECT_CHECKS:** `pnpm --filter vocabulary-games check-types`
- **NO_DOMAIN_GATE:** Phase 5 does NOT modify `packages/domain` (Phase 3/4
  delivered the contract + persistence; Phase 5 wires the host shell). The
  existing `pnpm --filter @reading-advantage/domain test -- games-live` and
  `pnpm --filter @reading-advantage/domain test -- games` gates remain green
  from Phase 4 (no regression expected — a regression check is run at
  acceptance but is not a Phase 5 Red gate).
- **TENANT_COVERAGE_GATE:** `pnpm --filter @reading-advantage/domain test -- tenant-coverage`
  must remain green (no schema change in Phase 5; the gate is a regression check
  only).

---

## Decision 5.7 — Non-goals (explicit)

Phase 5 does NOT:

1. **Migrate the remaining 24 games.** Only `haunted-library` (harness) and
   `dragon-rider` (navigation-fix sample) migrate. The 10 `window.location.href`
   exits in archers-revenge/paladins-twin-soul/enchanted-library/village-guardian/
   rune-forge-chamber/labyrinth-goblin-king/dungeon-liberator/realm-carver/
   shadow-gate-dungeon/spellweavers-run remain until the successor track.
   `[b] deferred:infra`.
2. **Extract `packages/games-runtime` workspace package.** The canonical module
   lives at `apps/advantage-games/src/lib/games-runtime/`. Workspace extraction
   is the successor-track Tier 2 item. `[b] deferred:infra`.
3. **Drop the duplicate `VirtualDPad`/`basePath`/`xp` files.** They become
   re-exports of the canonical module so unmigrated games don't break. Dropping
   the shims is the successor-track Tier 2 item. `[b] deferred:infra`.
4. **Migrate to `next-intl` or `next-international`.** The custom `client.ts`
   is kept; only the locale source is made host-injectable. Framework migration
   is `[b] deferred:infra`.
5. **Provide real `th.ts`/`zh.ts` translation content.** Phase 5 wires the
   locale source + fallback; translation content is `[b] deferred:po`.
6. **Wire the host production import.** Phase 5 delivers the harness proof, not
   a production import. The `haunted-library` production pilot in Reading
   Advantage is the successor track. `[b] deferred:infra`.
7. **Modify `packages/domain/src/games/`** (Phase 3 contract) or
   `packages/db/src/schema/analytics.ts` (Phase 4 persistence). Phase 5 is a
   wiring + harness phase; the contract + persistence layers are frozen.
8. **Touch the 8 per-game `calculateXP` functions** in `hauntedLibrary.ts`,
   `realmCarver.ts`, etc. They are correctly game-specific state→XP mappers,
   not runtime primitives. Only the two duplicate 3-arg `xp.ts` files are
   consolidated.

---

## Anti-pattern defense summary (Phase 5)

| Anti-pattern | Where it applies in Phase 5 | Defense |
|---|---|---|
| **A4** Vacuous-pass on nothing-done | Every harness assertion (5.5) | Positive + negative control pairing: the `onNavigate` assertion pairs a "no `window.location` mutation" (negative) with "`onNavigate` called" (positive); the locale assertion pairs a `th` render (positive control) with an `en` catalog-reachable assertion (positive control); the progress assertion pairs a first-call insert with a second-call `duplicate: true` (fire-once). A harness that passes only because nothing renders fails the positive control. |
| **A5** False-claim text vs test reality | `plan.md` Phase 5 task text | Do not write "embeddable navigation" / "i18n wired" / "import-ready" in `plan.md` unless `pnpm --filter vocabulary-games test --testPathPatterns=import-harness` exits 0. The cited command is the source of truth. |
| **A6** Registry-note overstatement | `measure/tracks.md` Wave 3 row; `product-risk-register.md` | Do **not** claim D-07/D-09/D-11 or CA-013 / MR-H05 is "resolved" until Phase 5 acceptance passes. The findings stay "open" in `product-risk-register.md` until the successor-track production pilot import is green. Phase 5 closes the **harness** gate, not the production-import gate. |
| **A3** Digit-only as labeled count | Shared-runtime canonical-source count (5.3); `calculateClientXP` integer assertions | Use labeled-integer assertions: `expect(calculateClientXP(100, 10, 10)).toBe(10)` with a comment `// Client XP preview: 10 = floor(10 * 1.0)`; emit `Canonical VirtualDPad source count: 1` and parse the integer. Never `rg -q '[0-9]+'` or a bare-digit match. |
| **A7** Over-broad filter swallowing hits | `window.location.href` exit scans (5.1) | Match exact exit literals (`window.location.href = "/student/games"`, `window.location.href = "/"`), not bare words like "location"/"navigation" (which appear legitimately in the `onNavigate` contract). |
| **A9** Pre-existing test references archived track paths | New `import-harness` test, extended `HauntedLibraryGame.test.tsx`, rewritten `dragon-rider` page test | Tests reference `apps/advantage-games/src/` and `@reading-advantage/domain/games` only — never a `measure/tracks/<id>/` path. Provenance comments may cite `phase-5-decisions.md` but no runtime dependency on a track path. If the track later archives, tests must not break. |
| **A2** Consent-blind publish gate | N/A — no publish flow in Phase 5. | Consciously not applicable. |
| **A10** Generated-facts drift | N/A — Phase 5 does not regenerate `measure/generated/`. | Consciously not applicable. |
| **A11** Executed review track left fully blocked | Phase 5 deferred items (24 games, workspace extraction, real translations) | Every Tier 2 deferral is recorded with a precise `[b] deferred:<owner>` marker and a conscious non-test comment in the import-harness test. The deferred items are not silently skipped. |
| **A1, A8, A12, A13** | Orchestrator-internal, plan-marker, catalog, or closeout classes. | Consciously not applicable to Phase 5 product tests. |

---

## Cross-references

- `phase-0-decisions.md` Decision 3 — Phase 5 pilot-import gate (D-07/D-09/D-11 +
  harness test).
- `phase-3-decisions.md` Decision 3.3 — server-side `calculateGameXP` is the
  source of truth; client-side `calculateXP` is display preview only (carried
  forward as `calculateClientXP` in 5.3).
- `phase-3-decisions.md` Decision 3.5 — `haunted-library` is the representative
  game (carried forward in 5.4).
- `phase-4-decisions.md` Decision 4.7 §5 — host-app wiring deferred to Phase 5
  (closed by 5.5).
- `advantage-games_20260626/findings.md` §A4, §A6, §D D-07/D-09/D-11.
- `advantage-games_20260626/migration-tracks.md` T3 (i18n + embeddable nav) +
  T4 (shared games package).
- `advantage-games_20260626/game-readiness-matrix.md` haunted-library row.
