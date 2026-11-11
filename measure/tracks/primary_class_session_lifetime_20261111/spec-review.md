# Spec Review — primary_class_session_lifetime_20261111

Author model: claude-code/claude-sonnet-5-5

Review kind: author self-check. No independent `measure-spec-review` subagent ran in this session. The orchestrator can run one before Red starts.

## What this track proposes

The teacher picks the class sign-in session lifetime when class sign-in starts: 3 hours (default), until 17:00 today (Asia/Bangkok), or 7 days. The `lifetime` field is an enum in the Zod contract. The domain computes `expiresAt` on the server and refuses a late `until_17`. The audit line records the choice. The class code and the QR cards share one session row, so both get the chosen time. No migration is needed.

## Zero-decision check

- Every value is fixed: the three enum values, the default, the 17:00 Bangkok rule, the 7-day maximum, the error code `invalid_input` with HTTP 400, and the audit field `lifetime`.
- The plan names the files, the test cases with fixed clock values, and the exact test commands (Vitest in both packages).
- The strings list in task 1.9 holds each new key and its `en` text. The Thai text goes to the PM for Daniel's check.

## Facts verified against the code (read only, at 172c52364)

- `class-session.ts:28` (constant), `:124` (expiresAt), `:136` (audit line), `:152` (`endClassSession`), `:86-95` (restart closes the old session).
- `card-token.ts:65-70` (card works only while a session of its class is open and unexpired).
- `findOpenSession` and the collision check use the same row, so the code gets the same time (`class-session.ts:101-111`, `:181-198`).
- `packages/db/src/schema/primary.ts:276` (`expires_at` exists, so no migration).
- `contracts.ts:38` and `:44-48` (start input and output), `handlers.ts:6-8`, `http.ts:11-19` and `:63-69`.
- The constant has one use only (`class-session.ts:124`).

## Findings

- None blocking.
- F1 [Note] OQ-1: for a class with the picture password off, the class code alone gives a `code_only` session. With `7d`, that entry stays open for 7 days. The PM request keeps the picture password and the rate limits as they are. The default makes no change. Review B reads this point.
- F2 [Note] The PM request says the validation error for a late `until_17`. The domain has no validation error code. The spec adds `invalid_input` (D-2) and a `STATUS` entry in the app handler. This is a small additive change.
- F3 [Note] The panel hides `until_17` by the browser clock (OQ-2). The server stays the authority.
- F4 [Note] The existing text shows hour and minute only. For 7 days the text must show the date (D-6, OQ-3).
- F5 [Note] The PM request cites `card-token.ts:70`. The card join and the two conditions are at `:65-70`. The meaning is the same.

Verdict: pass for the author self-check. Retry recommendation: run an independent spec review before Red.

Dispositions: F1 KEEP (open question, default no change), F2 KEEP, F3 KEEP, F4 KEEP, F5 KEEP.
