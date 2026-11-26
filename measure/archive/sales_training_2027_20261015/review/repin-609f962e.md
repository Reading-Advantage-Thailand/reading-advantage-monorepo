# Re-pin review: advantage-pr 609f962e

Track: `sales_training_2027_20261015` · Review date: 2026-11-15 · Scope: seed and text-check impact of the source re-pin

## The hand-off

- Previous pin: `7eff8c106c7265b41d584c4ea997d65ea30dadfb` (the current value in `apps/sales-advantage/curriculum/release-candidate.json`).
- New pin: `609f962e` ("pr-guidance: Review A 0c2ad2d remediation (sales dates, versions, links)"). It is a descendant of `7eff8c10`.
- The new pin replaces `7eff8c10` (PM hand-off, 2026-11-15).
- Hand-off file: `~/Desktop/handoff/sales-training-scope-609f962e/sales-training-scope-2027.md`. Its sha256 is `33278ca7ec3ac159225116bc8dcf27e711d363c8adf2e8496fe355862c0435e9`. It equals the MANIFEST and `git show 609f962e:09-sales-enablement/sales-training-scope-2027.md`.
- Why the change: Daniel decided on 2026-11-15 (Google Tasks, 09:11, and the word of 08:15) that three dates are public. The 2027 school year is public for Science, Math, and Zhongwen Advantage. Storytime Advantage goes live in November 2026, with no exact day. A new Advantage app aims to open every month.

## What the diff holds

The candidate names 20 source documents. Ten changed between the two pins. Ten did not change. No pinned document was deleted or moved.

The `--stat` of `09-sales-enablement/` shows 18 changed files. Seven of them are pinned. Eleven are not pinned (see the scope note). One of the eleven, `one-pagers/managed-service-one-pager.md`, was deleted. It is not pinned and the scope doc at 609f962e does not list it.

The seed file is `apps/sales-advantage/scripts/static-seed.ts`. The release file is `apps/sales-advantage/scripts/curriculum-release.ts`. The text checks are `curriculum-content-2027.test.ts`, `curriculum-release.test.ts`, and `curriculum-repin-adversarial.test.ts`.

| Pinned document | Result | Rows | Rows with a seed change |
|---|---|---|---|
| `sales-training-scope-2027.md` | changed (v1.9 → 1.12) | 9 | 6 |
| `tutor-family-sales-playbook.md` | unchanged | 0 | 0 |
| `line-trial-facilitator-script.md` | unchanged | 0 | 0 |
| `facilitator-recruitment-kit.md` | unchanged | 0 | 0 |
| `demo-scripts.md` | changed (v2.12 → 2.13) | 5 | 4 |
| `demo-scripts-checklist.md` | changed (v2.11 → 2.12) | 2 | 0 |
| `distributor-rep-onboarding/README.md` | unchanged | 0 | 0 |
| `distributor-rep-onboarding/faq.md` | changed (v1.11 → 1.13) | 4 | 2 |
| `distributor-rep-onboarding/objection-handling-guide.md` | unchanged | 0 | 0 |
| `distributor-rep-onboarding/rep-certification-checklist.md` | unchanged | 0 | 0 |
| `distributor-rep-onboarding/role-play-scenarios.md` | unchanged | 0 | 0 |
| `distributor-rep-onboarding/weekly-touchpoint-tracker.md` | unchanged | 0 | 0 |
| `distributor-launch-kit.md` | unchanged | 0 | 0 |
| `roi-calculator.md` | changed (v1.9 → 1.10) | 2 | 0 |
| `battle-cards/vs-tutor.md` | changed (v1.9 → 1.10) | 2 | 0 |
| `advantage-suite-at-a-glance.md` | changed (v1.14 → 1.16) | 4 | 3 |
| `04-services/pricing.md` | changed (v1.10 → 1.11) | 2 | 0 |
| `02-brand/messaging-house.md` | changed (v1.4 → 1.6) | 2 | 0 |
| `06-research-and-evidence/outcome-claims-policy.md` | changed (v1.3 → 1.6) | 3 | 0 |
| `15-business-applications/sales-advantage.md` | unchanged | 0 | 0 |

Totals: 10 changed documents, 10 unchanged documents, 0 deleted, 0 moved. Rows: 35. Rows that need a seed change: 15. Thai rows: 0.

## Scope note on the changed files that are not pinned

Eleven changed files in `09-sales-enablement/` are not in the candidate: `MANIFEST.txt`, `README.md`, `README-th.md`, `advantage-suite-at-a-glance-th.md`, `distributor-launch-kit-th.md`, `battle-cards/vs-math.md`, `battle-cards/vs-science.md`, `battle-cards/vs-zhongwen.md`, `storytime-release-1/README.md`, `storytime-release-1/battle-card.md`, and the deleted `one-pagers/managed-service-one-pager.md`. The scope doc section 9 pin list (v1.12) names the Thai mirrors, `README.md`, `storytime-release-1/`, and `battle-cards/`. The candidate keeps its own list of 20 documents, as in the 7eff8c10 review. The list stays as it is. The PM decides whether a later re-pin adds those files.

## How to read this file

Each row names one changed source line. The seed column gives the path and the current line of the seed. The current column quotes the seed text today. The change column names the seed edit, or it says "no seed change".

Line numbers of the source are the lines at `609f962e`. Line numbers of the seed are the lines at the current head of the track.

Marks in the change column: **[expiring]** is a fact that changes with time (a date, a version, a price, a count). **[claim]** is a line that the claims guard or the claims criterion reads.

Shared seed lines: several rows name one seed line with different document wordings. The common phrases are "2027 school year" and "no other date" for Science, Math, and Zhongwen Advantage. They are "November 2026" and "no exact day" for Storytime Advantage. Compare these phrases without regard to the case of the first letter. One correct seed edit then satisfies every row.

## 1. sales-training-scope-2027.md

Version 1.9 becomes 1.12. The date becomes 2026-11-15.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| S1.1 Section 2 row (line 32): "Yes, as K–6 demo products for the school visits. The module waits for the app audit. Name the 2027 school year; give no other date." | `static-seed.ts:984`, `:1091`, `:2233` | "...Show them at the visit. No date." (984); "...Give no date (Q-PR-24)." (1091, 2233) | Replace "No date" and "Give no date (Q-PR-24)" with "Name the 2027 school year; give no other date." **[expiring]** **[claim]** |
| S1.2 Section 2 row (line 34): "Storytime Advantage goes live in November 2026 (Daniel, 2026-11-15 09:11); give no exact day." | `static-seed.ts:985` | "- **K–6 offer, no date:** Storytime Advantage for Anuban 2 to P2 is part of the K–6 offer shown at the visits." | Replace the line. It states "goes live in November 2026" and "no exact day". **[expiring]** **[claim]** |
| S1.3 Section 4 Dates paragraph (line 64): a trainee may say the May 2027 line, may name the 2027 school year for Science, Math, and Zhongwen Advantage, may say that Storytime Advantage goes live in November 2026, and may say that a new Advantage app aims to open every month | none | none | no seed change. The seed has no Dates paragraph. The claims criterion row S1.6 holds the rule. The monthly app aim has no seed line, and the source gives no wording for a lesson. **[expiring]** **[claim]** |
| S1.4 Section 4 Science bullet (line 66): "say each subject is its own app, built from the Primary Advantage base app, and is demo-ready. Name the 2027 school year. Give no other date and no print date." | `static-seed.ts:984`, `:1091`, `:2233` | the lines of row S1.1 | Replace. This is the same edit as row S1.1. **[expiring]** **[claim]** |
| S1.5 Section 4 Storytime bullet (line 67): "show the sample unit and offer a presales conversation. Say that Storytime Advantage goes live in November 2026. Give no exact day." | `static-seed.ts:985` | the line of row S1.2 | Replace. This is the same edit as row S1.2. **[expiring]** **[claim]** |
| S1.6 Section 7 criterion 8 (line 112): "A Managed Service sale, an exact day or any other date for Science, Math, Zhongwen, or Storytime Advantage, a date for a new edition, or a date for a pilot start. A trainee may say only the dates of the Dates paragraph in section 4: the May 2027 line, the 2027 school year for Science, Math, and Zhongwen Advantage, and November 2026 for Storytime Advantage." | `static-seed.ts:1071` | "8. A Managed Service sale, or a date for Science, Math, Zhongwen, or Storytime Advantage, for a new edition, or for a pilot start. The May 2027 line in section 4 is the only date that a trainee may say." | Replace the line with the exact source text. **[claim]** **[expiring]** |
| S1.7 Section 8 expiry row (line 126): "Storytime Advantage release 1 (internal) \| Delivery 2026-12-01 (internal). Presales soon. Goes live in November 2026 (public; no exact day)" | none | none | no seed change. This row is internal. The 7eff8c10 review left the internal rows out of the seed. **[expiring]** |
| S1.8 Section 8 expiry row (line 130): "Public date for Science, Math, Zhongwen Advantage \| The 2027 school year; no other date \| Q-PR-24 (resolved 2026-11-15)" | `static-seed.ts:74` and `:75` (`SALES_CURRICULUM_EXPIRING_FACTS`) | fact "Public date for Science, Math, and Zhongwen Advantage (Q-PR-24)"; text "Science, Math, and Zhongwen Advantage (Q-PR-24)" | Replace the `text` with a phrase that the lessons hold after row S1.1, for example "Name the 2027 school year; give no other date". Keep the fact name. The lesson text at `:1023` ("the planned Science, Math, and Zhongwen apps") stays. **[expiring]** |
| S1.9 Version, date, and revision history for v1.10 through v1.12 | none | none | no seed change |

## 2. demo-scripts.md

Version 2.12 becomes 2.13. The date becomes 2026-11-15.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| S2.1 Rules (line 25): "**Science, Math, and Zhongwen Advantage:** each is its own app, built from the Primary Advantage base app. Show them at the visit. Name the 2027 school year; give no other date." | `static-seed.ts:2233` | "- **Science, Math, and Zhongwen Advantage:** each is its own app, built from the Primary Advantage base app. Show them at the visit. Give no date (Q-PR-24)." | Replace the last sentence. **[expiring]** **[claim]** |
| S2.2 Rules (line 26): "**K–6 scope for the school visits:** ... Name the 2027 school year for Science, Math, and Zhongwen Advantage. Give no other date for any product." | `static-seed.ts:2234` | "...each its own app, built from the Primary Advantage base app. Give no date for any of them." | Replace the last sentence with the two source sentences. **[expiring]** **[claim]** |
| S2.3 Part 2 (line 208): "**Science, Math, and Zhongwen Advantage:** each is its own app, built from the Primary Advantage base app. Show them at the visit. Name the 2027 school year; give no other date." | `static-seed.ts:1091` | "...Science, Math, and Zhongwen Advantage: each is its own app, built from the Primary Advantage base app. Show them at the visit. Give no date (Q-PR-24)." (School facts, lesson text) | Replace the last sentence. This is the same edit as row S2.1. The Part 2 line at `:2318` holds no such sentence and stays. **[expiring]** **[claim]** |
| S2.4 Derived from lines 25 and 66 and from scope section 4 line 66: the allowed wording is "Name the 2027 school year; give no other date." | `static-seed.ts:1117` | "...Give no date for Math Advantage. Then return to her primary-section need." | Replace "Give no date for Math Advantage." with "Name the 2027 school year; give no other date." No pinned document holds a more specific line. Green reads the scenario first: the director asks about Math Advantage. **[claim]** |
| S2.5 Version, date, and revision history for v2.13 | none | none | no seed change |

## 3. demo-scripts-checklist.md

Version 2.11 becomes 2.12. The date becomes 2026-11-15.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| S3.1 Line 56: "Managed Service: one line only. Science, Math, Zhongwen Advantage: each its own app, built from the Primary Advantage base app, shown at the visit; name the 2027 school year, no other date." | none | none | no seed change. The seed carries no checklist item. The rows S1.1 and S2.1 cover the same fact. |
| S3.2 Version, date, pointer to demo-scripts v2.13, and revision history | none | none | no seed change |

## 4. distributor-rep-onboarding/faq.md

Version 1.11 becomes 1.13. The date becomes 2026-11-15.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| S4.1 Q3 (line 43): "**Each its own app, built from the Primary Advantage base app, aimed at primary schools in the 2027 school year:** Science, Math, and Zhongwen Advantage. Show them at the visit. Give no other date." | `static-seed.ts:984` and `curriculum-release.ts:237` (`canonicalProductListClaims`) | "- **Science, Math, and Zhongwen Advantage (Q-PR-24):** each is its own app, built from the Primary Advantage base app. Show them at the visit. No date." | Replace the line in the seed and in the claim list, with the exact source line. **[expiring]** **[claim]** |
| S4.2 Q3 (line 44): "**K–6 offer:** Storytime Advantage for Anuban 2 to P2 is part of the K–6 offer shown at the visits. It goes live in November 2026; give no exact day." | `static-seed.ts:985` and `curriculum-release.ts:238` | "- **K–6 offer, no date:** Storytime Advantage for Anuban 2 to P2 is part of the K–6 offer shown at the visits." | Replace the line in the seed and in the claim list, with the exact source line. **[expiring]** **[claim]** |
| S4.3 Q3 (lines 45 and 47, unchanged): "**Planned, no date:** STEM Advantage." and "Do not give a date for any of these lines." | `static-seed.ts:986`, `:988`, `curriculum-release.ts:239`, `:240` | the same two lines | no seed change. The source keeps both lines. See open item O1: line 47 now conflicts with lines 43 and 44. |
| S4.4 Version, date, and revision history for v1.12 and v1.13 | none | none | no seed change |

## 5. roi-calculator.md

Version 1.9 becomes 1.10. The date becomes 2026-11-15.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| S5.1 Line 218: "Math, Science, and Zhongwen Advantage: each is its own app, built from the Primary Advantage base app, with the 2027 school year as the public aim. This section stays paused." | none | none | no seed change. The seed has no paused-bundle line. |
| S5.2 Version, date, and revision history for v1.10 | none | none | no seed change |

## 6. battle-cards/vs-tutor.md

Version 1.9 becomes 1.10. The date becomes 2026-11-15.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| S6.1 Cross-sell line 40: "Science, Math, and Zhongwen Advantage — each its own app, built from the Primary Advantage base app; app development starts in November 2026; the aim is primary schools in the 2027 school year, with no other public date" | none | none | no seed change. The seed has no cross-sell line. The edit of the 7eff8c10 re-pin removed it. |
| S6.2 Version, date, and revision history for v1.10 | none | none | no seed change |

## 7. advantage-suite-at-a-glance.md

Version 1.14 becomes 1.16. The date becomes 2026-11-15.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| S7.1 Table row, Science Advantage (line 41): "...App development starts in November 2026. Name the 2027 school year; give no other date." | `static-seed.ts:984` | the line of row S1.1 | Replace. This is the same edit as rows S1.1 and S4.1. The seed holds no table row of this kind. **[expiring]** **[claim]** |
| S7.2 Table row, Math and Zhongwen Advantage (line 42): "...App development starts in November 2026. Name the 2027 school year; give no other date." | `static-seed.ts:984` | the line of row S1.1 | Replace. This is the same edit as row S7.1. **[expiring]** **[claim]** |
| S7.3 Table row, Storytime Advantage (line 43): "A new version is in development. Goes live in November 2026; give no exact day." | `static-seed.ts:985` | the line of row S1.2 | Replace. This is the same edit as rows S1.2 and S4.2. **[expiring]** **[claim]** |
| S7.4 Version, date, and revision history for v1.15 and v1.16 | none | none | no seed change |

## 8. 04-services/pricing.md

Version 1.10 becomes 1.11. The date becomes 2026-11-12.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| S8.1 App-Only row (line 17): "Digital extensive-reading platform only." The USD tiers become "Old USD website tiers (history)" (line 27). "The Thai baht prices above are the prices to quote." (line 37) | `static-seed.ts` (tier lines, `curriculum-release.ts:244` and `:245`) | "~1,000 THB/student/year" and "~1,500 THB/student/year" | no seed change. The seed names no USD tier. The Thai baht prices did not change. **[expiring]** |
| S8.2 Version, date, and revision history for v1.11 | none | none | no seed change |

## 9. 02-brand/messaging-house.md

Version 1.4 becomes 1.6. The date becomes 2026-11-15.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| S9.1 Lines 128 to 150: the section "Marketing voice: the story of the future" with five story seeds. The three approved progress phrases (line 150) did not change. | none | none | no seed change. The seed quotes no heading of this section and no story seed. The seed uses the three progress phrases word for word, and they stay. |
| S9.2 Version, date, and revision history for v1.5 and v1.6 | none | none | no seed change |

## 10. 06-research-and-evidence/outcome-claims-policy.md

Version 1.3 becomes 1.6. The date becomes 2026-11-15.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| S10.1 Boundary (line 114): "the 2027 school year may be named for Science, Math, and Zhongwen Advantage (PM decision, 2026-11-15; Daniel, 08:15; Q-PR-24 resolved). Storytime Advantage and STEM Advantage keep no public date." | `static-seed.ts:1071` | the claims criterion of row S1.6 | no seed change of its own. Row S1.6 holds the edit. See open item O2: this line conflicts with scope doc lines 34 and 67. **[claim]** |
| S10.2 Headings and new text: "Marketing voice: the story of the future" (line 75), "Forward-looking statements" (line 89), "What we CANNOT say (final check)" (line 118). The rubric anchor `#how-to-handle-outcome-questions-in-sales-press-conversations` (line 172) did not change. | `curriculum-release.ts:195` | the anchor of the rubric source ref | no seed change. The anchor still exists at 609f962e. The approved phrases and the bans did not change. |
| S10.3 Version, date, and revision history for v1.4 through v1.6 | none | none | no seed change |

## Open items for the PM

- **O1. A source conflict in faq.md Q3.** Line 47 says "Do not give a date for any of these lines." Lines 43 and 44 now give a date (the 2027 school year, November 2026). The seed and `canonicalProductListClaims` quote line 47 word for word. Default: keep line 47 as the source states it, and ask the PM to remove it from faq.md or to word it as "no other date".
- **O2. A source conflict between two pinned documents.** The policy (line 114) says Storytime Advantage keeps no public date. The scope doc (lines 34 and 67), the faq (line 44), and the glance (line 43) say it goes live in November 2026. Default: the scope doc governs the training, so Green follows it. The PM confirms.
- **O3. The guard in `curriculum-release.ts` blocks the new text.** `hasConflictingProductStatus` (line 520 and after) rejects a planned-line statement with a year (`/\b20\d\d\b/`) or with the words "live" or "launch". The new lines hold "2027", "2026", and "goes live". Green must allow exactly the three public dates of the scope doc Dates paragraph. The guard comment at line 508 ("have no date") changes with it. The adversarial case "rejects a planned program given a year" (`curriculum-repin-adversarial.test.ts:135`) must keep the other years banned: the Red role writes that case. The guard must still reject a year other than 2027 and a month other than November 2026 on a planned line.
- **O4. The claims rubric line at `static-seed.ts:278`.** It says "gives no date for a planned line". Criterion 8 of the source (row S1.6) now allows three dates. No pinned document holds a one-line form for the rubric. Default: leave the line unchanged and let the PM decide. The Review role may raise it.
- **O5. The monthly app aim.** The scope doc line 64 lets a trainee say that a new Advantage app aims to open every month. No lesson needs the line. Default: no seed change.

## Counts

- Rows: 35
- Rows that need a seed change: 15 (S1.1, S1.2, S1.4, S1.5, S1.6, S1.8, S2.1, S2.2, S2.3, S2.4, S4.1, S4.2, S7.1, S7.2, S7.3)
- Rows that also change `curriculum-release.ts`: 2 (S4.1 and S4.2, the product-list claims), plus the guard of open item O3
- Thai rows: 0 (no Thai text changed in the 20 pinned documents)
- Documents with a seed edit: 4 (scope doc, demo-scripts, faq, glance)
- Documents with no seed effect: 16 (10 unchanged; 6 changed: demo-scripts-checklist, roi-calculator, vs-tutor, pricing, messaging-house, outcome-claims-policy)
- Expiring-fact rows: S1.1 to S1.8, S2.1 to S2.3, S4.1, S4.2, S7.1 to S7.3, and S8.1

The Science fact sits in four seed lines: `:984`, `:1091`, `:2233`, and the expiring fact at `:75`. The Storytime fact sits in `:985` and `:2234`. Row S4.1 and row S4.2 also change the product-list claims in `curriculum-release.ts`.
