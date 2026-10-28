# Acceptance: primary_parity_qr_path_20261011

- Date: batch 2
- Legacy revision: bfea121
- New commit: batch 2
- Copies: primary_legacy_20261011, primary_parity_20261011

Prepared files in this folder: `acceptance-pairs.json` (9 pairs, QR-A1 to QR-A5b),
`acceptance-steps-qr-path.ts`, `behavior-contract.md`, and `qr-path-data-checks.sql`.

## Notes for the batch run

- The catalogue must be loaded on the `_run_` clone (class books track, `browser-check/README.md`). Run the
  class book browser check first, so that Origins 3.2 is assigned to the demo class (pair QR-A3).
- The pair paths need a locale, so the pair QR-A4 uses `/th/b/o3-2/1`. Check the printed form with no locale
  with curl on the running build (batch 2), then write the result in the table:
  `curl -sI http://localhost:3005/b/o3-2/1?x=1 | head -5` expects one redirect (307) to `/th/b/o3-2/1?x=1`.
  `curl -sI http://localhost:3005/th/b/o3-2/1 | head -1` expects no redirect.
- The legacy path of each pair is the raw legacy article id `cmtyina5w000ps601n6htj9g3` (Origins 3.2 lesson 1).
  The new path needs no `{map:...}` placeholder: it uses the book key and the number.
- The legacy app has no `/b/` route and no `/writing` route. Where the table says "difference on purpose",
  the legacy page is the reference for the old printed code only.
- The full sign-in from the landing (class code, card, password, staff form, forced password change) is the
  browser check `browser-check/README.md` (block "QR path" of `cutover-check.mjs`). It is not a pair.
- Use 2 or 3 students only.

## Data checks

SQL file: `qr-path-data-checks.sql` (read only, counts and keys). Run on the `_run_` clone after the catalogue load.

| Check | Expect | Result |
| --- | --- | --- |
| 1: five book keys, 14 lessons each | o1, o2, o3-1, o3-2, q4 | batch 2 |
| 2: o3-2 lesson 1 approved and linked | cmtyina5w000ps601n6htj9g3 | batch 2 |
| 3: id map row for the printed article | 1 | batch 2 |
| 4: o3-2 lesson 999 | 0 | batch 2 |
| 5: book `zz` | 0 | batch 2 |
| 6: classes with o3-2 | 1 or more | batch 2 |

## Pairs

| Pair | Check | Result (pass, fail, difference on purpose) | Note |
| --- | --- | --- | --- |
| QR-A1 | QR-A1-a | batch 2 | |
| QR-A1b | QR-A1b-a | batch 2 | |
| QR-A1c | QR-A1c-a | batch 2 | |
| QR-A2 | QR-A2-a | batch 2 | |
| QR-A2b | QR-A2b-a | batch 2 | |
| QR-A3 | QR-A3-a | batch 2 | |
| QR-A4 | QR-A4-a, plus curl | batch 2 | |
| QR-A5a | QR-A5a-a | batch 2 | |
| QR-A5b | QR-A5b-a | batch 2 | |

Owner look check: pending (owner, async). Design captures of Phase D: `design/captures.md`.
