# Advantage Games — Review Checklist (`checklist.md`)

> **Track:** `advantage_games_review_20260626`
> **Source:** Synthesis of 47 line-review batches. **Status:** Review input. No remediation performed. Phase acceptance/closeout **PENDING**.

This checklist records, per spec acceptance criterion and per review surface, what the
line-by-line review covered and the verdict observed. A checked box (`[x]`) means the review
**covered** that surface and recorded findings — it does **not** mean the surface passed or was
remediated. Open concerns point to `findings.md` clusters and source batch IDs.

---

## Spec Acceptance Criteria (from track spec)

- [x] Every implemented game has a readiness row with status, blockers, test coverage,
      mobile/accessibility notes, and import readiness — see `game-readiness-matrix.md`
      (26 implemented games + 3 placeholders).
- [x] Shared-runtime findings are separated from per-game findings — `findings.md` §A vs §B,
      `line-review-synthesis.md` §2 vs §3.
- [x] Import-contract gaps for Reading and Primary are explicitly documented — `findings.md` §D
      (D-01 … D-11).
- [x] Coverage metrics recorded — 929 files, 47 batches, 47 reports, 11,231 report lines,
      1,749 distinct findings (`00-inventory.md` §1).
- [ ] **Phase acceptance** — PENDING (deferred to Measure workflow owner).
- [ ] **Closeout** — PENDING.

---

## Phase Coverage (track plan)

- [x] Phase 0 — Setup & inventory (`00-inventory.md`) — covered by review; acceptance PENDING.
- [x] Phase 1 — Shared runtime review (`findings.md` §A, `workflow-map.md`) — covered; PENDING.
- [x] Phase 2 — Per-game review (`game-readiness-matrix.md`, `findings.md` §B) — covered; PENDING.
- [x] Phase 3 — Embeddability review (`findings.md` §D, `migration-tracks.md`) — covered; PENDING.
- [~] Phase 4 — Gates & reporting — artifacts produced; **gates NOT run in this synthesis**
      (only B46 ran one targeted `tenant-coverage` test → red). Phase acceptance PENDING.

---

## Per-Surface Review Coverage

### Game shell / routing
- [x] Gallery catalog (`gameCards.ts`) reviewed — hardcoded `/en/` (B36-001/-002).
- [x] Page shells reviewed — fabricated counts, i18n, navigation (B20–B22).
- [x] Shared shell components reviewed (B25–B27).
- [ ] Concern: hardcoded SPA navigation blocks embedding (D-09; B27-010, B31-001).

### Scoring / XP
- [x] `calculateXP` implementations reviewed — duplicated + inconsistent (B20-039, B00-009).
- [x] `/complete` payloads reviewed — 5+ shapes, client-trusted (B25-001, B21-002).
- [ ] Concern: no single Zod contract; fabricated counts (D-01/D-02).

### Leaderboard / progress / persistence
- [x] Ranking routes reviewed — empty/frozen mock (B23-004, B24-004).
- [x] Host schema + tenant registry reviewed (B46).
- [ ] Concern: no `schoolId` on ranking tables; tenant-coverage CI red (D-04; B46-026/-036).

### Difficulty
- [x] Canonical `difficulty.ts` + per-game configs reviewed (B38).
- [ ] Concern: fractured enums; guardrail unused; dead selectors (A2; B38-004, B31-002).

### Assets / audio / performance / mobile / browser
- [x] Performance patterns reviewed statically (B00, B02, B28, B29).
- [x] CI/export + e2e browser matrix reviewed (B00, B20).
- [ ] Concern: not device-tested; chromium-only e2e; ~0.1 FPS precedent (A7).

### Accessibility / age-appropriate UX
- [x] Canvas/Konva a11y reviewed (B00-017); input a11y (B29-007/-030).
- [ ] Concern: no SR/ARIA/contrast/reduced-motion; unguaranteed mute; 9px text (A8).

### i18n
- [x] Locale tree (`en.ts`) and page literals reviewed (B42, B20–B22).
- [ ] Concern: English-only + mixed Thai literals; hardcoded `/en/` (D-07; A4).

### Tests / E2E
- [x] Unit/component test shape reviewed (B21, B22, B28, B43).
- [x] E2E specs + helpers reviewed (B44–B46).
- [ ] Concern: over-mocked, scoring not asserted; e2e smoke-only (see `test-gaps.md`).

### Multiplayer
- [x] WS server/room/scoring + hooks + UI reviewed (B33–B34, B42).
- [ ] Concern: reconnect counter defeats maxRetries; XP scale non-comparable (A2/A6).

### Templates / scaffolding
- [x] Game templates reviewed (B43–B44).
- [ ] Concern: canonical template won't compile (C-15; B43-060).

### Agent skills / docs / process
- [x] `.agents/skills` + Measure track artifacts reviewed (B00–B19).
- [ ] Concern: off-architecture skills, dead refs, `/conductor/` drift, audit over-claims (C-01…C-12).

---

## Verification Performed (explicit)

- [x] Roster confirmed via working-tree directory listing (26 implemented + 3 placeholders).
- [x] One targeted test run recorded by a batch: `pnpm --filter @reading-advantage/domain test
      -- tenant-coverage` → **3 failing assertions (red)** (B46-026/-036).
- [ ] Full build / lint / typecheck / e2e — **NOT run** in this review (static reading + targeted
      read-only checks only, per each batch's Limitations).

---

## Not Asserted

- No surface above is certified as passing or remediated.
- No acceptance, sign-off, or closeout is claimed. **Acceptance and closeout are PENDING.**
