# Implementation Plan: www bare-domain redirect to 0.0.0.0

## Phase 1: Repair the redirect origin
_Story ref: spec.md#story-s1_

- [x] Task: Confirm the defect on the live site with curl (307 to https://0.0.0.0/en).
- [x] Task: Rewrite the redirect Location in `src/proxy.ts` from the forwarded host and protocol.
- [x] Task: Add `src/__tests__/proxy-redirect.test.ts` for the bare domain, forwarded host, query string, missing host, and prefixed path cases.
- [x] Task: Owner merges to master; GitHub Actions deploys www; curl the bare domain again. (PR #8, d1caf393b, run 39793376902, live check passed 2026-10-22)
