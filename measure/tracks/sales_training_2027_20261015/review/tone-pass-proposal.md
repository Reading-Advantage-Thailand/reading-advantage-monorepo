# Tone pass: teach the strong answer, keep the claims gate

**Status:** Proposal for PR's claims check, 2026-10-16. No seed change before PR's check.
**Source:** `apps/sales-advantage/scripts/static-seed.ts` at `048090037` (line numbers below).
**Rule (Daniel, 2026-10-16):** the claims rule is a gate, not a theme. It stays in the claims
criterion of each rubric and in the trainer material. Lessons, videos, and model answers teach
the strong positive answer and are named for the skill. Daniel: "We are not promising any specific
level, but that doesn't mean we have to sound like we are scamming someone".

**Count today:** 86 "promise", "guarantee", or "do not say" phrases in the trainee text of 26
lessons, plus 13 "Claims guardrail" lines.

## What does not change

- The claims criterion of each rubric (`claimsCriterion(...)`, `CLAIMS_*`) and the scorer prompt.
- `prospectContext` of each scenario (scorer context, not lesson text).
- R5 "Can You Guarantee My Child Will Pass?": the parent asks for a guarantee, so the honest answer
  "We do not promise test scores. What we give is ..." is the skill (lesson, scenario, criteria).
  Only its guardrail line goes (row G9).
- The M5.3 objection row "Will my child get better test scores?" (the same direct question).
- "Promise a LINE message when the book is ready" (R4): a positive promise.
- "Rather than promise a specific number, we commit to transparent per-school reporting" (M2.3,
  M7.2, M7.3): a PR source line, word for word, and a positive commitment.
- Quiz questions that test the claims rule (M4 and M7 quizzes), except the rows below.

## A. "Claims guardrail" lines at the end of the roleplay lessons

Each roleplay lesson ends with a line of things not to say. The rubric already scores them.
Proposal: replace each line with one positive "Words to use" line for that roleplay, or remove it.

| # | Line | Lesson | Now | Proposed |
|---|---|---|---|---|
| G1 | 448 | M1.4 Discovery Roleplay | `**Claims guardrail:** Make no promise of an outcome and no false urgency. Discovery has no price talk and no product claims.` | `**Focus:** questions first. Talk about the product only after the buyer has told you what they need.` |
| G2 | 686 | M2.4 Value-Framing Roleplay | `**Claims guardrail:** Do not promise a score, a percentage, or a result. If evidence comes up, use only an approved Aka (2019) form.` | `**Evidence:** if research comes up, use the approved Aka (2019) form, word for word.` |
| G3 | 866 | M3.3 Objection Roleplay | `**Adoption guardrail:** Do not say that software alone solves the problem. Promise no result and no response time.` | `**Words to use:** "Your own teachers teach from the printed workbook, and the app supports them."` |
| G4 | 1074 | M4.3 "What Exactly Do You Sell?" | `**Claims guardrail:** Promise nothing that is not live and printed today. Give no date for a planned line.` | `**Words to use:** "A local tutor teaches a small group from a printed book." "Reedy voice practice after each completed lesson." For a planned line: "a coming program".` |
| G5 | 1395 | R1 First Conversation | `**Claims guardrail:** no promise of an outcome, no false urgency, no AI-tutor claim, and no book name without its product name.` | `**Words to use:** the full book name ("Primary Advantage Origins 2"), "a local tutor teaches a small group from a printed book", and a day and a time for the placement trial.` |
| G6 | 1452 | R2 "It Is Too Expensive" | `**Claims guardrail:** no promise, no false urgency, and no price other than the approved price.` | `**Words to use:** "from 3,000 baht for a package of about 25 hours, with the printed book and the app".` |
| G7 | 1512 | R3 "Already Goes to a Tutor School" | `**Claims guardrail:** no promise of grades, nothing negative about the tutor school, and no false urgency.` | `**Words to use:** "Your child can do it together with their current classes."` |
| G8 | 1575 | R4 Which Book Next? | `**Claims guardrail:** no promise of an outcome, and no book that is not printed offered as available.` | `**Words to use:** "The next book is Primary Advantage Origins 3.2. I will send you a LINE message when it is ready."` |
| G9 | 1638 | R5 "Can You Guarantee …?" | `**Claims guardrail:** no guarantee in any form ("รับประกัน", "แน่นอน"), no percentage, and no false urgency.` | Remove (the Method and "The line" above it teach the answer). |
| G10 | 1951 | RR1 "How Does the Money Work?" | `**Claims guardrail:** "นี่เป็นตัวอย่างจากสูตร ไม่ใช่การสัญญาว่าจะได้ค่ะ" (That is an example from the formula, not a promise.) No false urgency.` | `**The line:** "นี่เป็นตัวอย่างจากสูตรค่ะ" (That is an example from the formula.)` |
| G11 | 2007 | RR2 "Pyramid Scheme?" | `**Claims guardrail:** no income promise, no "get rich" framing, and no pressure to recruit.` | `**The facts:** the pay comes from teaching. A month with no students of your own gives no payout.` |
| G12 | 2062 | RR3 "Bring In Friends?" | `**Claims guardrail:** no income promise, and no figure that is not from the formula.` | `**Label the example one time:** "That is an example from the formula."` |
| G13 | 2444 | M7.6 15-Minute Discovery Call | `**Claims guardrail:** Blended Learning is "physical workbooks + digital app", never "AI + human teacher". No banned terms, no result promise, no discount, no free period, and no response time.` | `**Words to use:** Blended Learning is "physical workbooks + the digital app"; the two standard prices.` |

## B. TL;DR lines, module descriptions, and objectives

| # | Line | Where | Now (the part that changes) | Proposed |
|---|---|---|---|---|
| T1 | 1764 | M6 module description | `Talk openly about money, and promise no income.` | `Talk openly about money, and show how the pay is calculated.` |
| T2 | 1832 | M6.2 TL;DR | `… Every baht figure is arithmetic from that formula. It is not a promise of income.` | `… Every baht figure is arithmetic from that formula.` |
| T3 | 1891 | M6.3 TL;DR | `Answer directly, show the formula, and promise no income.` | `Answer directly, and show the formula with one example.` |
| T4 | 2200 | M7.1 TL;DR | `Quote the two standard prices only, and promise no result.` | `Quote the two standard prices, and show the per-school reporting.` |
| T5 | 2214 | M7.1 rules list | `- Promise no response time and no result.` | Remove (G13 and the claims criterion cover it). |
| T6 | 2312 | M7.3 TL;DR | `Never make a specific outcome promise.` | `Then commit to transparent per-school reporting.` |
| T7 | 700 / 699 | M2.4 scenario objective (EN / TH) | `Do not promise scores or results.` / `ห้ามสัญญาเรื่องคะแนนหรือผลลัพธ์` | Remove the sentence in both languages. |
| T8 | 712 | M2.4 school scenario objective | `Do not promise a score or a percentage. Do not offer a discount.` | Remove both sentences. |
| T9 | 880 / 879 | M3.3 scenario objective (EN / TH) | `Do not promise a result.` / `ห้ามสัญญาผลลัพธ์` | Remove the sentence in both languages. |
| T10 | 2566 | M7.8 Price-Conversation Close roleplay, next steps | `Promise no response time.` | Remove. |

## C. Model answers and lesson text

| # | Line | Where | Now | Proposed |
|---|---|---|---|---|
| M1 | 567 | M2.1 | `The last layer must stay honest and measurable. It does not allow a promise of a score.` | `The outcome layer names what the buyer can see and check: the book level, the lessons completed, and the progress in the app.` |
| M2 | 573 | M2.1 example | `✅ "We do not promise test scores. What we give is a book at your child's level, …"` | `✅ "What your child gets is a book at their level, a tutor who follows the lesson plan in every lesson, and progress that you can see in your child's app."` |
| M3 | 583 | M2.1 practice | `Never turn a planned feature into a promise.` | `Describe only features that are live today.` |
| M4 | 668 | M2.3 reframe | `"We do not promise grades. The class starts with a placement trial. …"` | `"The class starts with a placement trial. …"` (the rest stays) |
| M5 | 672 | M2.3 reframe | `"We do not promise a score. A school can give every class …"` | `"A school can give every class …"` (the rest stays) |
| M6 | 1879–1883 | M6.2 | `Say each baht figure as an example from the formula, and say that it is not a promise:` / `"นี่เป็นตัวอย่างจากสูตร ไม่ใช่การสัญญาว่าจะได้ค่ะ"` / `"That is an example from the formula, not a promise."` | `Say each baht figure as an example from the formula:` / `"นี่เป็นตัวอย่างจากสูตรค่ะ"` / `"That is an example from the formula."` |
| M7 | 1905 / 1907 | M6.3 model answer (TH / EN) | `… นี่เป็นตัวอย่างจากสูตร ไม่ใช่การสัญญาว่าจะได้ค่ะ` / `… That is an example from the formula, not a promise.` | `… นี่เป็นตัวอย่างจากสูตรค่ะ` / `… That is an example from the formula.` |
| M8 | 2350 | M7.3 Objection 7 | `Do not promise a free pilot, a free trial, or a discount for an early signature.` | Remove (the answer above it gives the prices and the pilot). |
| M9 | 1355 | M5.3 words table, "Why" cell | `No promise of an outcome` | `It describes what the class gives` |

## D. M6.3 "Recruitment Objections and Compliance"

| # | Line | Now | Proposed |
|---|---|---|---|
| R1 | 1887, 1889 | Title `Recruitment Objections and Compliance` | `Answering a Future Tutor's Questions` (the same name as video N11) |
| R2 | 1927–1935 | `## Compliance notes` with 5 "❌ Do NOT" items and 2 "✅ DO" items | `## Good practice` with: "Say each baht figure as an example from the formula." "Talk about commission only with future tutors, not with parents." "Say 'CEFR-aligned' and name the CEFR level of the book." "Use the approved Aka (2019) form for research." "Collect parental consent for all named students, photos, and videos." The "Do NOT" list moves to the trainer deck (PR). |
| R3 | 1937–1939 | `## The claims criterion in recruitment roleplays` (3 sentences) | One sentence: `In the recruitment roleplays, commission talk is allowed: say each baht figure as an example from the formula (see "The Words We Use", M4.2).` |

## E. M4.2 "Honest Claims: The Rules for Every Conversation"

This lesson is the one place where a trainee learns the claims gate, so the 9 items stay here.

| # | Line | Now | Proposed |
|---|---|---|---|
| H1 | 1017, 1019 | Title and H1 `Honest Claims: The Rules for Every Conversation` | `The Words We Use` |
| H2 | 1023–1039 | The approved lines: the research forms, CEFR names, full book names | Keep them first. Add 3 approved lines: "A local tutor teaches a small group from a printed book." "Reedy voice practice after each completed lesson." "From 3,000 baht for a class package" (family); "App-Only ~1,000 ฿ and Blended Learning ~1,500 ฿ for each student each year" (school). |
| H3 | 1041 | `## The claims criterion in every roleplay` (the 9 items, 1043–1055) | `## What fails a roleplay` (the 9 items stay word for word) |
| H4 | 1057 | `## When the buyer asks for a stronger promise` | `## When the buyer asks for a guarantee` |

## F. Quiz texts

| # | Line | Now | Proposed |
|---|---|---|---|
| Q1 | 2148, 2153 | Option and correct answer end with `That is an example from the formula, not a promise.` | End with `That is an example from the formula.` (both strings stay the same as each other) |
| Q2 | 2155 | `Every baht figure is arithmetic from the formula, labeled as an example. A promise of income fails the claims criterion.` | `Every baht figure is arithmetic from the formula, labeled as an example.` |
| Q3 | 1716 (M5 quiz) | `… Read Along with Reedy is not available, and we promise no level.` | `… Read Along with Reedy is not available.` |
| Q4 | 2633 | `…, so the seller promises no free period and no discount.` | `…, so the seller quotes the standard prices and asks Daniel about the pilot terms.` |

## G. Rubric criteria that are not the claims criterion

Two school criteria put a "no" into a skill criterion. The claims criterion of the same rubric
still scores discounts, free periods, and response times. A change here changes the scoring text,
so PR decides.

| # | Line | Now | Proposed |
|---|---|---|---|
| C1 | 2541 (M7.7 30-Minute Demo) | `Proposes the pilot (one grade level, one semester) and promises no free period and no discount` | `Proposes the pilot (one grade level, one semester) at the standard prices` |
| C2 | 2603 (M7.8 Price-Conversation Close) | `Moves to concrete next steps (the implementation contact, the training plan) and promises no response time` | `Moves to concrete next steps (the implementation contact, the training plan)` |

## After the change

- `apps/sales-advantage/scripts/curriculum-content-2027.test.ts`: update each test that checks a
  changed string; add one test: no lesson text outside M4.2 and R5 has "promise no" or "Claims
  guardrail".
- Daniel's Thai check list (`thai-lines-for-daniel.md`): add the changed Thai lines (T7, T9, M6,
  M7, G10). `curriculum-content-2027.test.ts:195` finds M4.2 by its title, so H1 changes that test.
- The scorer clips: no new run is necessary, because the claims criteria and the prompt do not
  change. The R1–R5 and RR1–RR3 rubric criteria do not change, except C1 and C2 (school).
