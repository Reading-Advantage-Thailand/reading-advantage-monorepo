# Plan — Reading Phase 1 (board mirror)

The real track is `reading_standard_base_20261126` on branch `reading/standard-base` in worktree `/home/daniebo/Desktop/rama-worktrees/reading-standard-base`. That branch is unpushed. Do not copy product code to master. This card mirrors the four phases of that track as board tasks.

## Phase 1

- [x] P1: Surface list, decisions, and four gate baselines. Evidence: phase acceptance at 1682daf0b (1682daf)
  - [ ] D3 objective set: continue with the recommended answer from plan section 6.1; confirm after Mastery delivers
- [x] P2: Build path, local image, and QA closeouts. Evidence: phase acceptance at 8711c047f, Reading app tests 1181 passed, live seed check exit 0
- [ ] P3: Server-owned XP: five remediation rounds used; Review B passed at 8aa05d6f8; Review A round 6 has F1 (history shows 10 XP for a 15 XP story LAQ), F21 (two activity types sharing a raw article id lose an award), F22 (cross-route game replay returns an error, not HTTP 200 duplicate), domain test 5D.4 fails against migration 0076; the branch is not mergeable and goes to no deploy until fixed (after TypeScript and tooling upgrades, Daniel, 2026-11-27)
  - [ ] R3.11: Red tests for review-a-8aa05d6f8 F1, F21, F22 and the domain 5D.4 failure (classes I1 to I4)
  - [ ] R3.12: Green fixes for review-a-8aa05d6f8 F1, F21, F22 and the domain 5D.4 failure (classes I1 to I4)
- [ ] P4: Proxy, final gates, final review-service deploy (PM approved the review-service deploy 2026-11-27)
