# Re-pin review: advantage-pr 7eff8c10

Track: `sales_training_2027_20261015` · Review date: 2026-11-11 · Scope: seed and text-check impact of the source re-pin

## The hand-off

- Previous pin: `a3c4df082a82a7eeaec497ed6aa8ca4cc433b2d9` (the current value in `apps/sales-advantage/curriculum/release-candidate.json`).
- New pin: `7eff8c106c7265b41d584c4ea997d65ea30dadfb`. It is an ancestor of the new pin.
- The new pin replaces `e7ee72b682504073654a0b8386819dbc63f50aeb` (PM hand-off, 2026-11-11).
- Why the change: the tone fix of 2026-11-11. A count answers a direct question only. No limit is volunteered. The approved Managed Service line replaces the old condition. The team size leaves the pitch.
- Done when: the Sales Advantage source pin names `7eff8c10` and its text check passes. Date: 2026-11-13 18:00 ICT.

## What the diff holds

The candidate names 16 source documents in `09-sales-enablement/`. Fourteen changed between the two pins. Two did not change: `distributor-rep-onboarding/objection-handling-guide.md` and `distributor-rep-onboarding/weekly-touchpoint-tracker.md`.

The seed file is `apps/sales-advantage/scripts/static-seed.ts`. The text checks are `apps/sales-advantage/scripts/curriculum-content-2027.test.ts` and `apps/sales-advantage/scripts/curriculum-release.test.ts`.

## Scope note on the other pinned documents

Three pinned documents outside `09-sales-enablement/` also changed in this range: `04-services/pricing.md`, `02-brand/messaging-house.md`, and `06-research-and-evidence/outcome-claims-policy.md`. Their hashes change in the regenerated candidate. The seed reads the outcome-claims-policy for two facts: the approved Aka forms and the scale facts. The policy keeps the long Aka form, so the long form in the seed stays. The policy adds the rule that the scale facts answer a direct question only, and it names three approved progress phrases. The new seed text uses these phrases.

## How to read this file

Each row names one changed source line. The seed column gives the path and the line. The current column quotes the seed text today. The change column names the seed edit, or it says "no seed change".

Where the seed text is a table row, the column separators appear as "—".

A row marked "Thai: Daniel check" holds Thai text. Those rows go to the PM for the owner's check.

## 1. advantage-suite-at-a-glance.md

Version 1.2 becomes 1.14. The date becomes 2026-11-11.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| "## One catalogue. Two channels." (the tier count leaves the heading) | `apps/sales-advantage/scripts/static-seed.ts:956` | "One Catalogue, Two Channels" | no seed change |
| Channel row for Blended Learning: "Live" (the school name leaves the cell) | `apps/sales-advantage/scripts/static-seed.ts:970` | "**Blended Learning** — Schools — Workbooks + app + teacher training + Big 4 fidelity observations" | no seed change |
| Channel row for Tutor Advantage: "One class package per workbook, about 22–23 hours; taught by a local tutor in a small group; from 3,000 ฿" | `apps/sales-advantage/scripts/static-seed.ts:971` | "**Tutor Advantage** — Families — One class package per workbook, taught by a local tutor in a small group" | no seed change. The seed carries the hours and the price at lines 990 and 1214. |
| "Tutor Advantage is the company focus through May 2027." | `apps/sales-advantage/scripts/static-seed.ts:973` | "The direct-to-family channel is the 2027 focus." | Replace the line with the new wording. |
| Product row for Reading Advantage: "Live platform. Its books are now in Tutor Advantage classes." | `apps/sales-advantage/scripts/static-seed.ts:978` | "- **Reading Advantage:** no school uses it; work on the app is deferred. Its books sell through Tutor Advantage." | Replace the line. Use the approved phrase "now in Tutor Advantage classes". |
| Product rows for Science, Math, Zhongwen, Storytime, and STEM Advantage: each line names its own app and the K–6 map | `apps/sales-advantage/scripts/static-seed.ts:979` and `:980` | "- **Coming programs, no date:** Science, Math, and Zhongwen Advantage (Q-PR-24)." and "- **Planned, no date:** Storytime and STEM Advantage." | Replace both lines. Name each app, its base app, the K–6 offer, and no date. |
| "Printed workbooks today: ... Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027." | `apps/sales-advantage/scripts/static-seed.ts:2289` | "Printed today: Primary Advantage Origins 2 and Primary Advantage Origins 3.1. Primary Advantage Origins 3.2 and Quest 4 are in schools from May 2027." | Replace the line. Use the full product name and the edition rule. |
| Service tier table: the Managed Service row leaves the table, and the heading becomes "## The service tiers" | `apps/sales-advantage/scripts/static-seed.ts:998` | "**Managed Service** — Not sold today. It launches in 2027 only if 1–2 more schools sign. Never pre-sell it. — No price" | Replace the cell with the approved line. Keep the row. |
| Research bullet: "Research shows extensive reading outperforms traditional grammar instruction (Aka, 2019)." | `apps/sales-advantage/scripts/static-seed.ts:1034` and `:2344` | the approved long Aka form with "~+9.5 points" | no seed change. The long form comes from the outcome-claims-policy, which keeps it. |
| CEFR bullet: "the active Primary Advantage program covers Pre-A1 to A2" | `apps/sales-advantage/scripts/static-seed.ts:1041` | "The active program stops at A2, so never offer a level above A2." | no seed change |
| The case-study bullet leaves the file | none | none | no seed change. The seed keeps the rule against turning a planned case study into evidence at line 1075. |
| The foreign-teacher salary row and the pitch line leave the file | none | none | no seed change. The seed names no salary and no pitch. |
| Revision history for v1.2 through v1.14 | none | none | no seed change |

## 2. battle-cards/vs-tutor.md

Version 1.2 becomes 1.9. The date becomes 2026-11-11.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| "One class package equals one printed workbook, about 22–23 hours." | `apps/sales-advantage/scripts/static-seed.ts:990`, `:1214`, `:1794`, `:595` | "about 22–23 hours" | no seed change |
| "Primary Advantage Origins 3.2 and Primary Advantage Quest 4 go on sale after delivery, about 2026-11-23 to 2026-11-30." | `apps/sales-advantage/scripts/static-seed.ts:1218` and `:1819` | "on sale from about 2026-11-22" | Replace the date in both lines. Use the full product name. |
| Cross-sell line: "Science, Math, and Zhongwen Advantage — each its own app, built from the Primary Advantage base app; app development starts in November 2026; no public date" | `apps/sales-advantage/scripts/static-seed.ts:2222` | "- **Science, Math, and Zhongwen Advantage:** "coming programs" with no date (Q-PR-24)." | Replace the line. |
| Status line: the 2027 target of 10 active tutors and 300 students leaves the file | none | none | no seed change. The seed names no tutor or student target. |
| Revision history for v1.3 through v1.9 | none | none | no seed change |

## 3. demo-scripts-checklist.md

Version 2.1 becomes 2.11. The date becomes 2026-11-11.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| "Pack printed workbooks: Primary Advantage Origins 2 and Primary Advantage Origins 3.1. Bring the iPad with the sample pages of the Primary Advantage books that are not printed yet." | `apps/sales-advantage/scripts/static-seed.ts:2293` | "**Workbook samples (5 minutes):** printed pages from Primary Advantage Origins 2 and Primary Advantage Origins 3.1." | Add the iPad line. Give no date. |
| "Learn the key facts: CEFR-aligned levels, printed workbooks of 14 lessons, scripted lessons, quarterly observations. Learn the scale facts too, and give them only to answer a direct question." | `apps/sales-advantage/scripts/static-seed.ts:2273`, `:2247`, `:2513` | "- One active school today (Kalasin, on Primary Advantage); under 500 students." | Replace the scale line. The scale facts answer a direct question only. |
| "Print the school sale deck (PDF) in the school's language. The school sale deck is the leave-behind. The old one-pagers are archived." | `apps/sales-advantage/scripts/static-seed.ts:2281` | "**Next step:** ... Leave behind the school sale deck (PDF)." | no seed change |
| "Before you leave, agree the pilot grade only. Daniel agrees the start with the school." | `apps/sales-advantage/scripts/static-seed.ts:2220` and `:1000` | "The pilot is **one grade level for one semester**. Whether the pilot is paid or free is not decided (Q-SV-05)." | Replace the pilot rules in both lines. The pilot has no free term and no discount. |
| "Managed Service: one line only. Science, Math, Zhongwen Advantage: each its own app, built from the Primary Advantage base app, shown at the visit, no date." | `apps/sales-advantage/scripts/static-seed.ts:2221` and `:2222` | the old Managed Service line and the "coming programs" line | Replace both lines. |
| "End with a pilot grade and a date for the agreement review. Daniel agrees the pilot start with the school." | `apps/sales-advantage/scripts/static-seed.ts:2299` and `:2578` | the demo close and the price-close next steps | no seed change. The seed names no pilot start date. |
| The pointer to demo-scripts v2.12 and the revision history | none | none | no seed change |

## 4. demo-scripts.md

Version 2.1 becomes 2.12. The date becomes 2026-11-11.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| "The pilot is **one grade level for one semester**. It has no free term and no discount. Daniel agrees the pilot start with each school." | `apps/sales-advantage/scripts/static-seed.ts:2219`, `:2220`, `:1000`, `:64` and `:65` | "Offer no discount and no free period. Discount policy is Daniel's decision (Q-SV-05)." and "Whether the pilot is paid or free is not decided (Q-SV-05)" | Replace the pilot rules. The pilot has no free term and no discount. |
| "**Managed Service:** one line only, and only if the school asks: "Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready." Never pre-sell it, and never name a school count." | `apps/sales-advantage/scripts/static-seed.ts:2221`, `:1085`, `:1111`, `:1129`, `:1134`, `:1136`, `:2515`, `:998`, `:115` | "Not sold today. It launches in 2027 only if 1–2 more schools sign." | Replace every occurrence with the approved line. |
| "**Science, Math, and Zhongwen Advantage:** each is its own app, built from the Primary Advantage base app. Show them at the visit. Give no date (Q-PR-24)." | `apps/sales-advantage/scripts/static-seed.ts:2222`, `:979`, `:2306`, `:1085`, `:70` | "coming programs" wording | Replace every occurrence. |
| "The new build is live since the cutover of 2026-10-20." | `apps/sales-advantage/scripts/static-seed.ts:2224`, `:2225`, `:80`, `:85` | "Primary Advantage cutover: target weekend of Oct 17/18, last date Oct 20" and "Reedy Preview in Primary Advantage: only after the cutover passes" | Replace the cutover and Reedy texts in the rules and in the expiring facts list. |
| Key facts: "CEFR-aligned: the active Primary Advantage program covers Pre-A1 to A2." | `apps/sales-advantage/scripts/static-seed.ts:2269` and `:1041` | "- CEFR-aligned: the active program covers Pre-A1 to A2." | no seed change |
| Key facts: the school count line leaves the file | `apps/sales-advantage/scripts/static-seed.ts:2273`, `:2247`, `:2513`, `:2540` | "- One active school today (Kalasin, on Primary Advantage); under 500 students." | Replace the line. The scale facts answer a direct question only. |
| Close pitch: "We are based in Khon Kaen and self-funded." (the team size leaves the pitch) | none | none | no seed change. The seed has no "small team" line. |
| Leave-behind: "The school sale deck is the leave-behind. The old one-pagers are archived." | `apps/sales-advantage/scripts/static-seed.ts:2281` | "Leave behind the school sale deck (PDF)." | no seed change |
| "Printed today: Primary Advantage Origins 2 and Primary Advantage Origins 3.1. Both stay on sale until their stock is gone. Then the new editions replace them. Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027." | `apps/sales-advantage/scripts/static-seed.ts:2289` | "Printed today: Primary Advantage Origins 2 and Primary Advantage Origins 3.1. Primary Advantage Origins 3.2 and Quest 4 are in schools from May 2027." | Replace the line. Use the full product name and the edition rule. |
| "For the Primary Advantage books that are not printed yet, show sample pages on the iPad. Say: "These are sample pages of the next books." There is no proof print. Give no date." | `apps/sales-advantage/scripts/static-seed.ts:2293` | "**Workbook samples (5 minutes):** printed pages from Primary Advantage Origins 2 and Primary Advantage Origins 3.1." | Add the iPad line. Give no date. |
| Part 2 for Primary Advantage: "CEFR-aligned levels; the active program covers Pre-A1 to A2." and the school count leaves the line | `apps/sales-advantage/scripts/static-seed.ts:2306` and `:2273` | "2. **The catalogue and the channels (15 minutes):** Primary Advantage for schools; the same books reach families through Tutor Advantage; the coming programs have no date." | Replace the line. Name no school count. |
| Part 2 for Managed Service: "if the school asks, say: "Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready."" | `apps/sales-advantage/scripts/static-seed.ts:2221` and the other Managed Service lines | the old Managed Service line | Replace. This is the same edit as the Managed Service row above. |
| Part 3 for Mastery Advantage: "Mastery Advantage is rolling out to all of our products." | `apps/sales-advantage/scripts/static-seed.ts:2307` | "Today, Primary Advantage uses FSRS flashcard scheduling; the knowledge-graph layer is not yet in the Primary Advantage app." | Replace the limit sentence with the approved progress phrase. |
| Close: the "small company: one active school and under 500 students" line leaves the file | none | none | no seed change. The seed has no such close line. |
| "**"You are very small":** "We are self-funded, with no outside investors, and we have one active school today. Our complete curriculum is being brought to market. Your school gets our full attention."" | `apps/sales-advantage/scripts/static-seed.ts:2316` | "**"You are very small":** "We are: one active school, under 500 students, self-funded. That is why your school matters to us."" | Replace the rebuttal with the full source text. It holds the approved progress phrase. |
| Trainer note: "Agree the pilot grade only. Give no start date. Daniel agrees the start with the school." | `apps/sales-advantage/scripts/static-seed.ts:2299` and `:2578` | the demo close and the price-close next steps | no seed change. The seed names no pilot start date. |
| Leave-behind lists: the rep manual leaves the school | none | none | no seed change |

## 5. distributor-launch-kit.md

Version 2.0 becomes 2.8. The date becomes 2026-11-11.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| Status line: "The distributor motion continues at low intensity." leaves the line | none | none | no seed change |
| "**Managed Service:** not quoted. If a school asks, say: "Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready." Never pre-sell it." | `apps/sales-advantage/scripts/static-seed.ts:2221` and the other Managed Service lines | "Not sold today. It launches in 2027 only if 1–2 more schools sign." | Replace every occurrence with the approved line. |
| "CEFR-aligned: the active Primary Advantage program covers Pre-A1 to A2." | `apps/sales-advantage/scripts/static-seed.ts:2269` and `:1041` | "- CEFR-aligned: the active program covers Pre-A1 to A2." | no seed change |
| "Printed today: Primary Advantage Origins 2 and Primary Advantage Origins 3.1. Both stay on sale until their stock is gone. Then the new editions replace them. Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027." | `apps/sales-advantage/scripts/static-seed.ts:2289` | "Printed today: Primary Advantage Origins 2 and Primary Advantage Origins 3.1. Primary Advantage Origins 3.2 and Quest 4 are in schools from May 2027." | Replace the line. Use the full product name and the edition rule. |
| Step 2: "Pitch Blended Learning first. It is live today." (the school count leaves the line) | `apps/sales-advantage/scripts/static-seed.ts:2273`, `:2247` | "- One active school today (Kalasin, on Primary Advantage); under 500 students." | Replace the scale line. The scale facts answer a direct question only. |
| Step 3: "Do not pre-sell Managed Service. If a school asks, give only the approved line in the Managed Service entry above, and never name a school count." | `apps/sales-advantage/scripts/static-seed.ts:2221` and `:2515` | the old Managed Service line | Replace with the approved line. |
| Step 4: "The pilot has no free term and no discount. Daniel agrees the start with the school." | `apps/sales-advantage/scripts/static-seed.ts:2219`, `:2220`, `:1000`, `:64` and `:65` | "Whether the pilot is paid or free is not decided (Q-SV-05)" and "Offer no discount and no free period. Discount policy is Daniel's decision (Q-SV-05)." | Replace the pilot rules in the rules lesson and in the expiring facts list. |
| The target audience line, the pointer to demo-scripts v2.12, and the revision history | none | none | no seed change |

## 6. distributor-rep-onboarding/README.md

Version 1.3 becomes 1.4. The date becomes 2026-11-11.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| Status line: "The distributor motion continues at low intensity." leaves the line | none | none | no seed change |
| Revision history for v1.4 | none | none | no seed change |

This document has no seed effect.

## 7. distributor-rep-onboarding/faq.md

Version 1.3 becomes 1.11. The date becomes 2026-11-11.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| Q1: "It is CEFR-aligned; the active program covers Pre-A1 to A2." | `apps/sales-advantage/scripts/static-seed.ts:1041` and `:2269` | "The active program stops at A2, so never offer a level above A2." | no seed change |
| Q1: "Reading Advantage is not offered to schools now. Its printed books are now in Tutor Advantage classes, for secondary students." | `apps/sales-advantage/scripts/static-seed.ts:978` | "- **Reading Advantage:** no school uses it; work on the app is deferred. Its books sell through Tutor Advantage." | Replace the line. |
| Q1: "Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027." | `apps/sales-advantage/scripts/static-seed.ts:2289` | "Primary Advantage Origins 3.2 and Quest 4 are in schools from May 2027." | Replace the line. Use the full product name. |
| Q3 status list: "Live: Primary Advantage, Tutor Advantage, and CodeCamp Advantage", "Reading Advantage: not offered to schools now; its books are now in Tutor Advantage classes", "Each its own app, built from the Primary Advantage base app, no date: Science, Math, and Zhongwen Advantage", "K–6 offer, no date: Storytime Advantage for Anuban 2 to P2", "Planned, no date: STEM Advantage" | `apps/sales-advantage/scripts/static-seed.ts:977` through `:980` | the four status lines of the lesson "What is live (as of October 2026)" | Replace the list. |
| Q3: "Do not give a date for any of these lines." | `apps/sales-advantage/scripts/static-seed.ts:982` | "Do not give a launch date for any planned line." | Replace the line. |
| Q4 heading "What can I say about Managed Service?" and the line "Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready." | `apps/sales-advantage/scripts/static-seed.ts:2221`, `:1085`, `:1111`, `:1129`, `:1134`, `:1136`, `:2515`, `:998`, `:115` | "Not sold today. It launches in 2027 only if 1–2 more schools sign." | Replace every occurrence with the approved line. |
| Q7: "Today we have one active school in Thailand, in Kalasin, on Primary Advantage. We are a Khon Kaen company, self-funded, and our complete curriculum is being brought to market." | `apps/sales-advantage/scripts/static-seed.ts:2247` and `:2513` | "Today we have one active school in Thailand, in Kalasin, on Primary Advantage, with under 500 active students. We are a Khon Kaen company, self-funded. We build the right product before we grow." | Replace both lines. Use the approved progress phrase. |
| Q7: "Give this number only when a director asks, and never inflate it." | `apps/sales-advantage/scripts/static-seed.ts:2249`, `:2528`, `:2540` | "Never inflate this number." and "state the company size honestly" | Replace the rules. The scale facts answer a direct question only. |
| Q8: the trainer note no longer says "We are a 1-school, 5-person company." | none | none | no seed change. The seed names no team size. |
| Q9: "The school sale deck is the leave-behind. The old one-pagers are archived." | `apps/sales-advantage/scripts/static-seed.ts:2281` | "Leave behind the school sale deck (PDF)." | no seed change |
| Q13: "The pilot has no free term and no discount, and Daniel agrees the start with the school." | `apps/sales-advantage/scripts/static-seed.ts:2219`, `:2220`, `:1000`, `:64` and `:65` | "Whether the pilot is paid or free is not decided (Q-SV-05)" | Replace the pilot rules in the rules lesson and in the expiring facts list. |
| Revision history for v1.4 through v1.11 | none | none | no seed change |

## 8. distributor-rep-onboarding/rep-certification-checklist.md

Version 1.2 becomes 1.7. The date becomes 2026-11-11.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| Item 1.1: "names Science, Math, and Zhongwen Advantage, each its own app, built from the Primary Advantage base app, shown at the visit, with no date" | `apps/sales-advantage/scripts/static-seed.ts:2222` and `:979` | "- **Science, Math, and Zhongwen Advantage:** "coming programs" with no date (Q-PR-24)." | Replace the line. |
| Item 1.2: "Managed Service in one line only ("Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready.")" | `apps/sales-advantage/scripts/static-seed.ts:2221` and the other Managed Service lines | "Not sold today. It launches in 2027 only if 1–2 more schools sign." | Replace every occurrence with the approved line. |
| Item 1.3: "Answer a direct question about scale with the true count, and never volunteers it" | `apps/sales-advantage/scripts/static-seed.ts:2273`, `:2540`, `:2528` | "- One active school today (Kalasin, on Primary Advantage); under 500 students." | Replace the scale line and the criterion text. |
| Item 2.1: "does not pre-sell Managed Service" (the condition leaves the line) | `apps/sales-advantage/scripts/static-seed.ts:2221` and `:2515` | the old Managed Service line | Replace with the approved line. |
| Item 2.3: "Gives only the approved line ("Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready.") — never pre-sells, never names a school count" | `apps/sales-advantage/scripts/static-seed.ts:2515` and `:2560` | "**If Managed Service comes up:** "Not sold today. It launches in 2027 only if 1–2 more schools sign."" | Replace the line. The claims criterion text stays. |
| Item 2.5: "One grade level for one semester; promises no free period, no 30-day trial, and no early-signature discount (no free term and no discount; Daniel agrees the start with the school)" | `apps/sales-advantage/scripts/static-seed.ts:2219`, `:2220` | the open pilot terms | Replace the pilot rules. |
| Revision history for v1.3 through v1.7 | none | none | no seed change |

## 9. distributor-rep-onboarding/role-play-scenarios.md

Version 1.2 becomes 1.4. The date becomes 2026-11-11.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| Scenario 2: "If the director asks about scale, the rep answers with the true count and never volunteers it." | `apps/sales-advantage/scripts/static-seed.ts:2509`, `:2513`, `:2528`, `:2540` | "State the company size honestly." and "**Our size:** "We are a Khon Kaen company with one active school and under 500 students today."" | Replace the method line, the size line, and the criterion text. |
| Success criteria: "Rep answers a direct question about scale with the true count, and never volunteers it." | `apps/sales-advantage/scripts/static-seed.ts:2540` | "Uses the approved Aka (2019) short form word for word, and states the current scale honestly (1 school, under 500 students)" | Replace the criterion text. |
| "If Managed Service comes up, rep says one line only: "Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready."" | `apps/sales-advantage/scripts/static-seed.ts:2515` and `:2221` | the old Managed Service line | Replace every occurrence with the approved line. |
| Pricing anchors: "Managed Service, if asked: "Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready."" | `apps/sales-advantage/scripts/static-seed.ts:2515` | the old Managed Service line | Replace the line. |
| Revision history for v1.3 and v1.4 | none | none | no seed change |

## 10. facilitator-recruitment-kit.md

Version 1.4 becomes 1.6. The date becomes 2026-10-27.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| "Printed books on sale: Primary Advantage Origins 2, Primary Advantage Origins 3.1, Reading Advantage Origins 2. After delivery, about 2026-11-23 to 2026-11-30: Primary Advantage Origins 3.2 and Primary Advantage Quest 4" | `apps/sales-advantage/scripts/static-seed.ts:1819` and `:54` and `:55` | "Primary Advantage Origins 3.2 and Quest 4: on sale from about 2026-11-22" | Replace the date in both places. Use the full product name. |
| Version, date, status, and revision history | none | none | no seed change |

## 11. line-trial-facilitator-script.md

Version 1.6 becomes 2.0. The date becomes 2026-10-30.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| Placement table row 3: "Primary Advantage Origins 3.2: on sale after delivery, about 2026-11-23 to 2026-11-30" | `apps/sales-advantage/scripts/static-seed.ts:1010` and `:1270` | "Primary Advantage Origins 3.2: on sale from about 2026-11-22" | Replace the date in both tables. |
| Placement table row 4: "Primary Advantage Quest 4: on sale after delivery, about 2026-11-23 to 2026-11-30. Until then → offer **Primary Advantage Origins 3.1**" and "Reading Advantage Quest 4 (A2)" | `apps/sales-advantage/scripts/static-seed.ts:1011` and `:1271` | "Primary Advantage Quest 4: on sale from about 2026-11-22. Until then → offer **Primary Advantage Origins 3.1**" | Replace the date in both tables. Use the full product name. |
| Trainer-only edition rule: the rule text is the text of section 13 of this file, from `09-sales-enablement/sales-training-scope-2027.md:62`. The variant in `09-sales-enablement/line-trial-facilitator-script.md:94` has no sentence about Reading Advantage Origins 2. | `apps/sales-advantage/scripts/static-seed.ts:1272` | none | Add the rule once as trainer-only text in the placement lesson, after `static-seed.ts:1272`. Give no cutover date. |
| Heading "Primary Advantage Quest 4 (A1, after delivery, about 2026-11-23 to 2026-11-30)" with the Thai sales line under it | none | none | no seed change. The Thai sales line did not change, and the seed carries no Thai line for Quest 4. |

## 12. roi-calculator.md

Version 1.6 becomes 1.9. The date becomes 2026-11-11.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| "**Managed Service:** not quoted. If a school asks, say: "Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready." Never pre-sell it." | `apps/sales-advantage/scripts/static-seed.ts:998` and `:2384` | "**Managed Service** — Not sold today. It launches in 2027 only if 1–2 more schools sign. Never pre-sell it. — No price" and "Managed Service is not quoted in sales conversations." | Replace the tier cell with the approved line. The line at 2384 stays. |
| Worked example 2: App-Only at 1,000 THB, 200 students at 200,000 THB, about 83 THB per student per month, tutoring comparison of 5–13 students | `apps/sales-advantage/scripts/static-seed.ts:2382` and `:2386` | "- App-Only: approximately **1,000 THB/student/year**." and the 500-student Blended example | no seed change. The seed quotes no figure of the 200-student example. |
| Comparison table: "~1,000 ฿" (the range leaves the cell) | `apps/sales-advantage/scripts/static-seed.ts:2382` | "- App-Only: approximately **1,000 THB/student/year**." | no seed change |
| Multi-subject bundle: "Math, Science, and Zhongwen Advantage: each is its own app, built from the Primary Advantage base app, with no public date. This section stays paused." | `apps/sales-advantage/scripts/static-seed.ts:2222`, `:979`, `:2306` | "coming programs" wording | Replace the wording in the rules lesson. |
| Version, date, status, and revision history | none | none | no seed change |

## 13. sales-training-scope-2027.md

Version 1.1 becomes 1.9. The date becomes 2026-11-11.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| Section 1 team row: "Daniel, Phikul (the President), and one staff member" | none | none | no seed change. The seed names no team size. |
| Section 1 training dates: the Sales training runs 2026-12-07 to 2026-12-18, and the refresh is done by 2027-01-21 | none | none | no seed change. The dates stay internal. |
| Section 2 Managed Service row: "One line only, if asked: "Today we offer App-Only and Blended Learning. A fuller service is in planning; we will share it when it is ready." Never pre-sell it." | `apps/sales-advantage/scripts/static-seed.ts:2221` and the other Managed Service lines | "Not sold today. It launches in 2027 only if 1–2 more schools sign." | Replace every occurrence with the approved line. |
| Section 2 row: "Science, Math, and Zhongwen Advantage — Yes, as K–6 demo products for the school visits. The module waits for the app audit. No date (Q-PR-24)." | `apps/sales-advantage/scripts/static-seed.ts:2222`, `:979`, `:2306` | "coming programs" wording | Replace the wording in the rules lesson. |
| Section 2 rows: "Storytime Advantage — Yes, as a K–6 demo product (Anuban 2 to P2) for the school visits. The module waits for the app audit. No date (Q-PR-24)." and "CodeCamp Advantage, STEM Advantage — No." | `apps/sales-advantage/scripts/static-seed.ts:980` | "- **Planned, no date:** Storytime and STEM Advantage." | Replace the line. |
| Section 4: "The scale facts answer a direct question only, and a trainee never volunteers them: one active school (Boonyathat, Kalasin, on Primary Advantage); under 500 active students." | `apps/sales-advantage/scripts/static-seed.ts:986`, `:2247`, `:2513`, `:2540` | "**Our size:** one active school (in Kalasin, on Primary Advantage) and under 500 active students. Say this honestly." | Replace the scale lines. The scale facts answer a direct question only. |
| Section 4 placement rows 3 and 4: "on sale after delivery, about 2026-11-23 to 2026-11-30" | `apps/sales-advantage/scripts/static-seed.ts:1010`, `:1011`, `:1270`, `:1271`, `:54` and `:55` | "on sale from about 2026-11-22" | Replace the date in both tables and in the expiring facts list. Use the full product name. |
| Section 4 edition rule (trainer only), the exact source text: "**Edition rule (strategy §3.1; trainer only).** Every book gets a graph-first rewrite, except Primary Advantage Origins 3.2 and Primary Advantage Quest 4, which need no rewrite. The printed Primary Advantage Origins 2 and Primary Advantage Origins 3.1 stay on sale until their stock is gone. Daniel confirms when the old stock is gone; there is no automatic cut-over date. Then Tutor Advantage and Primary Advantage cut over to the new editions. A trainee may say the rule and gives no cutover date. Reading Advantage Origins 2 follows the same edition handling. Keep this sentence trainer-only; do not put it in a line that a trainee says." The source is `09-sales-enablement/sales-training-scope-2027.md:62` at `7eff8c10`. | `apps/sales-advantage/scripts/static-seed.ts:1272` | none | Copy the rule text word for word as trainer-only text in the placement lesson, after `static-seed.ts:1272`. The scope document governs the training, so its text wins over the line-trial script and the playbook. This is the same edit as the rows in sections 11 and 14. |
| Section 4 dates: a trainee may say one date, the May 2027 line; every other date is "no date yet" | `apps/sales-advantage/scripts/static-seed.ts:1065` and `:115` | "8. A Managed Service sale, or a date for Science, Math, or Zhongwen Advantage." | Replace the claims rule. It covers Storytime, a new edition, and a pilot start. |
| Section 4 school pilot: "The pilot has no free term and no discount. The rep quotes App-Only ~1,000 ฿ and Blended Learning ~1,500 ฿, and Daniel agrees the pilot start with each school." | `apps/sales-advantage/scripts/static-seed.ts:2219`, `:2220`, `:1000`, `:64` and `:65` | "Whether the pilot is paid or free is not decided (Q-SV-05)" and "Offer no discount and no free period. Discount policy is Daniel's decision (Q-SV-05)." | Replace the pilot rules in the rules lesson and in the expiring facts list. |
| Section 7 criterion 8: "A Managed Service sale, or a date for Science, Math, Zhongwen, or Storytime Advantage, for a new edition, or for a pilot start. The May 2027 line in section 4 is the only date that a trainee may say." | `apps/sales-advantage/scripts/static-seed.ts:1065` and `:115` | the old criterion 8 text | Replace. This is the same edit as the dates row above. |
| Section 8 expiry table: the cutover is live since 2026-10-20; Reedy Preview is in the live build; Origins 3.2 and Quest 4 are on sale after delivery; the pilot has no free term and no discount | `apps/sales-advantage/scripts/static-seed.ts:79` through `:86`, `:64` through `:71`, `:54` and `:55` | the seven entries of `SALES_CURRICULUM_EXPIRING_FACTS` | Replace the four texts. The new internal rows stay out of the seed. |
| Section 9 pin list: the Thai mirrors, `README.md`, `storytime-release-1/`, and `battle-cards/` join the list | none | none | no seed change for this re-pin. The candidate keeps its own document list. |
| Version, date, status, and revision history | none | none | no seed change |

## 14. tutor-family-sales-playbook.md

Version 1.3 becomes 1.7. The date becomes 2026-10-30.

| New source line | Seed | Current seed text | Change |
|---|---|---|---|
| "The books on sale: Primary Advantage Origins 2, Primary Advantage Origins 3.1, Reading Advantage Origins 2. Daniel ordered Primary Advantage Origins 3.2 and Primary Advantage Quest 4 on the night of 2026-10-26. Delivery is about 2026-11-23 to 2026-11-30. Both books go on sale after delivery." | `apps/sales-advantage/scripts/static-seed.ts:1218` | "The books on sale: Primary Advantage Origins 2, Primary Advantage Origins 3.1, Reading Advantage Origins 2. Primary Advantage Origins 3.2 and Quest 4 go on sale from about 2026-11-22." | Replace the line. Use the full product name and the delivery window. |
| "The new editions:" trainer-only edition rule, the same text as section 13 of this file, from `09-sales-enablement/sales-training-scope-2027.md:62` | `apps/sales-advantage/scripts/static-seed.ts:1272` | none | The seed holds the rule once, as trainer-only text in the placement lesson, after `static-seed.ts:1272`. The next-book lesson gets no copy. This is the same edit as the rows in sections 11 and 13. |
| Claims table: the Thai row keeps its text, and the file adds the marker `<!-- claims-example -->` | `apps/sales-advantage/scripts/static-seed.ts:1376` | the Thai use-and-avoid row of the claims table | no seed change |
| Section 5 next-book table: "Primary Advantage Origins 3.2 (after delivery, about 2026-11-23 to 2026-11-30)" and "Primary Advantage Quest 4 (after delivery, about 2026-11-23 to 2026-11-30)", and the cell of the Origins 3.1 row: "Before delivery: tell the parent you will send a LINE message when it is ready" | `apps/sales-advantage/scripts/static-seed.ts:1397` and `:1398` | "Primary Advantage Origins 3.2 (on sale from about 2026-11-22)" and "Primary Advantage Quest 4 (on sale from about 2026-11-22)", and the cell "Before that date: tell the parent that you will send a LINE message when it is ready" | Replace the date in both rows. Copy the new cell wording too: "Before delivery: tell the parent you will send a LINE message when it is ready". |
| Section 5 next-book table: "Primary Advantage Quest 5: not printed, and no print date" with the cell "Tell the parent the next book is not printed yet. Give no date. Promise no notice." | `apps/sales-advantage/scripts/static-seed.ts:1399` | "Primary Advantage Quest 5: not printed" and "Tell the parent that you will send a LINE message when it is ready" | Replace the row and the cell. Give no date. |
| Section 5 new Thai line: "เล่มต่อไปของชุดนี้ยังไม่ได้พิมพ์ค่ะ ตอนนี้ยังไม่มีกำหนดค่ะ" and "The next book in this series is not printed yet. There is no date yet." | `apps/sales-advantage/scripts/static-seed.ts:1399` | the next-book table has no line for the Quest 4 row | Add the Thai line and its English line after the table. Thai: Daniel check |
| Section 7 facts that expire: the delivery window and the Quest 5 hold | `apps/sales-advantage/scripts/static-seed.ts:1017` | "the books on sale from about 2026-11-22" | Replace the date in the expiring lesson. |
| Version, date, status, and revision history | none | none | no seed change |

## Counts

- Rows: 109
- Rows that need a seed change: 67
- Thai rows: 1 (section 14, the next-book line for the Primary Advantage Quest 4 row)
- Documents with no seed effect: 1 (`distributor-rep-onboarding/README.md`)

Three rows name one seed edit: the trainer-only edition rule in sections 11, 13, and 14. The seed holds it once, as trainer-only text in the placement lesson, after `apps/sales-advantage/scripts/static-seed.ts:1272`. The next-book lesson gets no copy.

The rows count one source line each. Several rows point at the same seed line. The Managed Service line alone sits in nine seed lines, and the pilot rules sit in four lessons plus the expiring facts list.
