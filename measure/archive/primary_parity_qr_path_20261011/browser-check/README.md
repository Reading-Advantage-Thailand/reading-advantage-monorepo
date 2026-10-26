# QR path browser check (Story S6)

Status: the check is written. It has NOT run. The run is a batch step of the orchestrator.
Reason: it needs a build with S1 to S4 and the book Origins 3.2 on the class (class book block).

## The checks

Script: `scripts/primary-parity/cutover-check.mjs` (block "QR path (spec S6)"). Pure judges:
`scripts/primary-parity/qr-path-checks.mjs` (tests in `__tests__/qr-path-checks.test.mjs`).
The block runs by default after the class book block, while the class is open (it uses the first class code).
`QR_CHECK=off` skips it. It reads no extra password and prints no code or name.

| # | Check name (as the script prints it) | Story S6 criterion |
|---|---|---|
| 1 | `qr read: signed-out landing shows (status below 500)` | `/b/o3-2/1` signed out shows `[data-landing]` |
| 2 | `qr read: landing names the book` | book name |
| 3 | `qr read: landing has the school choice` | school choice link |
| 4 | `qr read: class code sign-in lands on the lesson flow` | ends on `/student/lesson/<article>` |
| 5 | `qr writing: writing code opens the article page` | signed in, `/b/o3-2/1/writing` ends on `/student/read/<id>` |
| 6-9 | `qr writing: signed-out landing shows ...`, `names the book`, `has the school choice`, `shows the writing task` | writing landing |
| 10 | `qr unknown book: shows the unknown-book page (status below 500)` | `/b/zz/1`, `[data-case]` |
| 11 | `qr no lesson: shows the no-lesson page (status below 500)` | `/b/o3-2/999` |
| 12 | `qr unknown address: shows the unknown-address page (status below 500)` | `/b/o3-2/5/other` |

A failed check prints `FAIL <name>`. At the end the script prints `STOP <name>` for each failed check and exits 1.
A thrown error prints `FAIL qr: block error` or `FAIL qr: case page block error`.
Captures in `$SHOTS`: `qr-landing.png`, `qr-lesson-after-sign-in.png`, `qr-writing-article.png`,
`qr-unknown-book.png`, `qr-no-lesson.png`, `qr-unknown-address.png`.

## Run steps (orchestrator)

Use the run steps of `../../primary_parity_class_books_20261011/browser-check/README.md` (steps 1 to 6), with the same
command. The QR block is part of that run: one run checks both blocks. Run it a second time; all checks must pass again.
Copy the result list and the PNG paths into `browser-check/result.md` (no PNG in git).
Selector risk (no browser run yet): the landing link `[data-landing] a[href*="/auth/signin"]`, the label "Class code",
the "Next" button, the name list `li button`, and `[data-case]`.
