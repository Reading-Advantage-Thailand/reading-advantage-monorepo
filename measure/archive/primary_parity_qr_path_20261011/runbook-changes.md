# Runbook changes: QR path (Story S6)

Status: proposed text. `primary_parity_rehearsal3_20261011` copies it into the new command sheet
(row C13) and into `docs/deployment/primary-cutover-migration-spec.md` (§8, §10). This file edits neither.

## Command sheet, row C13 (agent step)

The agent runs the go/no-go script on the tag URL (the same command as row C10):
`BASE=<tag url> node scripts/primary-parity/cutover-check.mjs <handout> <teacher> <admin> <system or -> <class>`.
The block "qr" opens one `/b/` address and checks these things. Each check name starts with `qr`.

1. `/b/o3-2/1`, signed out: the landing shows the book name and the school choice (status below 500).
2. The agent selects the school choice and signs in with the open class code. The page ends on the lesson flow (`/student/lesson/<article>`).
3. `/b/o3-2/1/writing`, signed out: the landing shows the writing task line.
4. `/b/o3-2/1/writing`, signed in: the page ends on `/student/read/<articleId>`.
5. `/b/zz/1` shows the unknown book page. `/b/o3-2/999` shows the no lesson page. `/b/o3-2/5/other` shows the unknown address page. Each status is below 500.

Any failed check prints `STOP <name>` and the script exits with code 1. This result is a no-go.
`QR_CHECK=off` skips the block. The block needs the book Origins 3.2 on the class (the class book block assigns it) and the catalogue import (row C7b).

## Command sheet, row C13 (owner step)

Before the go, the owner scans one printed `/b/` code from a book of the hand-out (when the books exist).
Use a phone that has no Primary session. Check three things:

1. The landing shows the book name and the lesson line.
2. The school choice opens the sign-in page. Sign in with the class code of the open class. The phone shows the lesson.
3. The Tutor choice shows only when the owner set `TUTOR_LESSON_URL_TEMPLATE` (see the next section).

The owner also scans the writing code of the same book. It must open the article page after sign-in.

## Owner setting before C9

Set `TUTOR_LESSON_URL_TEMPLATE` on the Primary service before the image deploy (row C9 or an earlier row for env values).
The value is `https://<Tutor host and path with {book} and {n}>`, for example `https://liff.line.me/<id>/b/{book}/{n}`.
The value must start with `https://`. The app fills `{book}` and `{n}` only. With no value, the landing shows the school choice only
and the QR check still passes. Tutor must have the matching route first (spec F-9, Tutor spec T8).

## Proposed text for `docs/deployment/primary-cutover-migration-spec.md` §10

Add this item to "Content and data", after the writing QR code item:

- One printed `/b/` address works at the tag URL. The script block "qr" (run by row C13) opens `/b/o3-2/1` signed out, signs in with the class
  code, and ends on the lesson. It opens `/b/o3-2/1/writing` and ends on an article page. `/b/zz/1`, `/b/o3-2/999`, and `/b/o3-2/5/other` each
  show a case page with a status below 500. The owner scans one printed `/b/` code on a phone before the go.

Add one sentence to §8 (environment values): "Set `TUTOR_LESSON_URL_TEMPLATE` when Tutor has the `/b/` route. The value is optional."
