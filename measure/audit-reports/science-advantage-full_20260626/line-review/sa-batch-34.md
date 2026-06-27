# Line-by-Line Review: sa-batch-34

**Track:** `science_advantage_review_20260626`
**Batch:** 34 (20 files — curriculum seed data: 10 lesson JSON + 10 question JSON, no app code)
**Review Date:** 2026-06-27
**Reviewer:** automated audit agent (`ark-code-latest`)
**Scope:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline/golden-path patterns
**Constraint:** No app code edits; review only. This batch is static seed content (JSON). There is no executable logic, no request handling, and no tenant boundary inside these files. Findings therefore concern content correctness, i18n accuracy, data-shape conformance to the seed Zod contracts, curriculum consistency, and golden-path data quality — not runtime behavior. To ground the review I also read the consumers of these files: `scripts/seed/seed-lessons.ts`, `scripts/seed/seed-questions.ts`, `lib/schemas/seed-validation.ts`, and `lib/schemas/lesson-content.schema.ts`.

---

## Files Reviewed

| # | File | Type |
|---|------|------|
| 1 | `apps/science-advantage/scripts/seed-data/lessons/thai-g3-unit-6.json` | Lesson seed (G3 U6, 11 lessons) |
| 2 | `apps/science-advantage/scripts/seed-data/lessons/thai-g3-unit-7.json` | Lesson seed (G3 U7, 12 lessons) |
| 3 | `apps/science-advantage/scripts/seed-data/lessons/thai-g3-unit-8.json` | Lesson seed (G3 U8, 11 lessons) |
| 4 | `apps/science-advantage/scripts/seed-data/lessons/thai-g3-unit-9.json` | Lesson seed (G3 U9, 8 lessons) |
| 5 | `apps/science-advantage/scripts/seed-data/lessons/thai-g4-unit-1.json` | Lesson seed (G4 U1, 4 lessons) |
| 6 | `apps/science-advantage/scripts/seed-data/lessons/thai-g4-unit-2.json` | Lesson seed (G4 U2, 3 lessons) |
| 7 | `apps/science-advantage/scripts/seed-data/lessons/thai-g4-unit-3.json` | Lesson seed (G4 U3, 2 lessons) |
| 8 | `apps/science-advantage/scripts/seed-data/lessons/thai-g4-unit-4.json` | Lesson seed (G4 U4, 3 lessons) |
| 9 | `apps/science-advantage/scripts/seed-data/lessons/thai-g4-unit-5.json` | Lesson seed (G4 U5, 3 lessons) |
| 10 | `apps/science-advantage/scripts/seed-data/lessons/thai-g4-unit-6.json` | Lesson seed (G4 U6, 2 lessons) |
| 11 | `apps/science-advantage/scripts/seed-data/questions/g3-being-a-scientist-questions.json` | Question seed (36 Q) |
| 12 | `apps/science-advantage/scripts/seed-data/questions/g3-comparing-living-things-questions.json` | Question seed (36 Q) |
| 13 | `apps/science-advantage/scripts/seed-data/questions/g3-diversity-living-things-questions.json` | Question seed (36 Q) |
| 14 | `apps/science-advantage/scripts/seed-data/questions/g3-life-processes-growth-questions.json` | Question seed (36 Q) |
| 15 | `apps/science-advantage/scripts/seed-data/questions/g3-life-processes-reproduction-questions.json` | Question seed (36 Q) |
| 16 | `apps/science-advantage/scripts/seed-data/questions/g3-making-observations-questions.json` | Question seed (36 Q) |
| 17 | `apps/science-advantage/scripts/seed-data/questions/g3-observing-living-things-lab-questions.json` | Question seed (36 Q) |
| 18 | `apps/science-advantage/scripts/seed-data/questions/g3-science-safety-tools-questions.json` | Question seed (36 Q) |
| 19 | `apps/science-advantage/scripts/seed-data/questions/g3-what-makes-alive-questions.json` | Question seed (36 Q) |
| 20 | `apps/science-advantage/scripts/seed-data/questions/g4-classifying-materials-questions.json` | Question seed (5 Q) |

---

## Schema-conformance baseline (applies to all 20 files)

All 20 files were checked against the consuming Zod contracts:

- **Lesson files** (`SeedLessonsFileSchema` + per-lesson `LessonContentSchema`): each requires `framework`, `gradeLevel` (positive int), `unit` (positive int), and `lessons[]`; each lesson requires `id`, `title`, `description`, `content`, positive-int `order`, `standards[]`, optional `structuredContent` with `version: 1` and `blocks[]`. **All 10 lesson files conform.** Every `vocabulary` block term carries `term`/`thai`/`definition` (all non-empty), satisfying `VocabularyTermSchema`. `text` blocks all carry non-empty `content`. No `image` blocks (so the 10-char `alt` accessibility rule is not exercised here).
- **Question files** (`SeedQuizQuestionsFileSchema`): each requires `lessonId` and `questions[]` (≥1); each question requires non-empty `type`/`text`, positive-int `points`, `standards[]` (≥1), with `options` either `string[]` or `{terms,definitions}` and `correctAnswer` a string/number/bool/array/record. **All 10 question files conform.** `MULTIPLE_CHOICE`/`MULTIPLE_SELECT` use string-array options; `TRUE_FALSE`/`FILL_IN_BLANK` correctly omit `options`; `VOCABULARY_MATCH` uses the `{terms,definitions}` object with a record `correctAnswer`. Spot-checks confirm every `correctAnswer` value (and each member of `MULTIPLE_SELECT` arrays) is present in the corresponding `options` set — no orphaned answer keys found.

This is a clean baseline; the findings below are content/consistency issues the schema cannot catch.

---

## File 1: `thai-g3-unit-6.json` (493 lines, 11 lessons — "Our Changing Earth")

### L133–135 vs L148–150 — "Weather" and "Climate" share the same Thai term
**F-SA-B34-001 | medium | i18n/content-correctness**
`Weather` is glossed `สภาพอากาศ` (L134) and `Climate` is *also* glossed `สภาพอากาศ` (L149). These are distinct scientific concepts and must not collide: "climate" should be `ภูมิอากาศ`. A Thai-reading student sees two different English terms mapped to the identical Thai word, defeating the bilingual vocabulary affordance. Translation bug; correctable in content.

### L12 vs L17–57 — `content` markdown is richer than `structuredContent`
**F-SA-B34-002 | medium | data-quality / golden-path**
The markdown `content` field (L12) contains a substantive "Main Content" section (land features, mountains, plains, valleys, deserts), but `structuredContent.blocks` (the rich-render path) carries only an `intro` text block + a `vocabulary` block — the teaching body is dropped. This divergence repeats across every lesson in files 1–4 (G3 units 6–9): the structured path renders strictly less instructional content than the markdown path. Whichever surface the UI prefers, the two representations disagree on lesson substance. Recommend the structured `blocks` mirror the markdown body (the G4 files 5–10 do this better — they include multiple body `text` blocks). Cross-ref F-SA-B34-003.

### L342–406 — REVIEW (order 8) and ASSESSMENT (order 9) precede LESSON entries order 10–11
**F-SA-B34-008 | low | pedagogical-ordering**
`unit-6-review` (order 8) and `unit-6-summative-assessment` (order 9) are ordered *before* `weather-week` (order 10, `LESSON`) and `science-journal-earth` (order 11, `LESSON`). A summative assessment sequenced ahead of regular lessons is unusual; if the UI renders strictly by `order`, students hit the end-of-unit test before two lessons. Same pattern recurs in files 2 and 3. Non-blocking; confirm intended sequencing.

---

## File 2: `thai-g3-unit-7.json` (549 lines, 12 lessons — "The Sky Above")

### L282–284 — "Celestial" Thai gloss is imprecise
**F-SA-B34-003 | low | i18n-precision**
`Celestial` → `ท้องฟ้า` (which means "sky"), with English definition "Related to the sky or outer space." The Thai gloss narrows the term to "sky" and loses the outer-space sense. Minor translation-precision issue. (Also note `Daylight` → `แสงสว่าง` on L50–52 is a generic "brightness" gloss rather than "daylight," but acceptable for G3.)

### Structured-vs-markdown divergence
Same as F-SA-B34-002 — every lesson here ships only `intro` + `vocabulary` blocks while the markdown `content` holds the "Main Content" body. Covered by F-SA-B34-002 (batch-wide).

### Ordering
`unit-7-review` (order 8) / `unit-7-summative-assessment` (order 9) precede `moon-calendar` (10) and others — covered by F-SA-B34-008.

### Content correctness — clean
Sun/Moon/Earth, rotation, moon phases, tides all scientifically accurate for grade level. No factual finding.

---

## File 3: `thai-g3-unit-8.json` (488 lines, 11 lessons — "Integrated Science Applications")

### L266 — Five-step scientific method ("ask, predict, test, record, conclude")
**F-SA-B34-004 | medium | curriculum-consistency**
This unit defines the scientific method as five steps **ask → predict → test → record → conclude** (L266; review lesson). However the question file `g3-being-a-scientist-questions.json` (file 11, L135) teaches the five steps as **observe, question, predict, test, conclude**, and `g4-unit-6.json` (file 10, L12/L28) teaches a **seven-step** method (ask, research, hypothesize, test, analyze, conclude, communicate). Three different canonical formulations of "the scientific method" coexist across the G3/G4 corpus. Students/teachers moving between lessons will encounter contradictory step lists and answer keys. Recommend a single canonical taxonomy (grade-banded if intentional) and align question keys to it. See also file 11 finding.

### Ordering
`scientific-method-review` (REVIEW, order 6) and `unit-8-summative-assessment` (ASSESSMENT, order 7) precede `science-tool-mastery` (LAB, order 8) and lessons order 9–11 — covered by F-SA-B34-008.

### Content — clean
Question/prediction/experiment/results/conclusion content is accurate.

---

## File 4: `thai-g3-unit-9.json` (353 lines, 8 lessons — "Integrated Projects")

### General — clean content
Project-process lessons (choose → research → conduct → analyze → display → present → review → assessment) are coherent and correctly ordered (1–8, with review/assessment last). Vocabulary Thai glosses are accurate. Structured-vs-markdown divergence applies (F-SA-B34-002). No new findings.

---

## File 5: `thai-g4-unit-1.json` (244 lines, 4 lessons — "Living Things & Ecosystems")

### L71 — Chicken and frog labeled "(Complete Metamorphosis)"
**F-SA-B34-005 | medium | factual/science-correctness**
The markdown `content` of `g4-life-cycles` presents:
- "**Life Cycle of a Frog (Complete Metamorphosis)**" and
- "**Life Cycle of a Chicken (Complete Metamorphosis)**".

Both labels are biologically incorrect. "Complete metamorphosis" (egg→larva→pupa→adult) is an *insect* classification — correct for the butterfly above it, but a **frog** undergoes amphibian metamorphosis (not the insect "complete metamorphosis" category), and a **chicken does not undergo metamorphosis at all** (birds develop directly; egg→chick→adult is growth, not metamorphosis). This is a factual error in instructional content. The `structuredContent` block (L90–93) only mentions butterfly + frog and avoids the chicken claim, but the markdown `content` (the authored source) carries the error and would be rendered/seeded. Recommend removing the "(Complete Metamorphosis)" labels from frog and chicken.

### Content otherwise — strong
Organ systems, photosynthesis, food chains, producers/consumers/decomposers, adaptations all accurate. Multiple body `text` blocks present (better structured fidelity than files 1–4).

---

## File 6: `thai-g4-unit-2.json` (164 lines, 3 lessons — "Matter & Materials")

### L94–96 vs L104–106 — "Melting" and "Dissolving" share the same Thai term
**F-SA-B34-006 | medium | i18n/content-correctness**
`Melting` is glossed `การละลาย` (L95) and `Dissolving` is *also* glossed `การละลาย` (L105). `การละลาย` corresponds to dissolving; **melting** should be `การหลอมเหลว`. Two physically distinct processes (state change by heat vs. solute mixing into solvent) are mapped to one identical Thai word — the same collision class as F-SA-B34-001. Compounded by the English definitions correctly distinguishing them (L96 "A solid changing to a liquid when heated" vs L106 "a substance mixes into a liquid"), so the Thai gloss is internally inconsistent with its own definition. Translation bug.

### Content — clean
States of matter, physical/reversible vs irreversible changes, density/floating all accurate.

---

## File 7: `thai-g4-unit-3.json` (115 lines, 2 lessons — "Forces & Machines")

### General — clean
Six simple machines, forces, balanced/unbalanced forces, Newtons all correct. Thai glosses accurate (`คันโยก` lever, `รอก` pulley, `จุดหมุน` fulcrum, `แรงเสียดทาน` friction). No findings.

---

## File 8: `thai-g4-unit-4.json` (159 lines, 3 lessons — "Energy")

### General — clean
Forms of energy, transformations, conservation, renewable/non-renewable sources all scientifically accurate; energy-transformation examples (light bulb, car engine, solar panel, speaker) correct. Conservation-of-energy statement (L94–97) correct. No findings.

---

## File 9: `thai-g4-unit-5.json` (179 lines, 3 lessons — "Earth & Space")

### General — clean
Solar system facts are accurate: "1.3 million Earths could fit inside" the Sun (volume ratio, correct), Venus "spins backwards" (retrograde, correct), Pluto as dwarf planet beyond Neptune (correct), axial tilt 23.5° (correct), Thailand's three seasons (correct local framing). Note `Star` is glossed `ดาวฤกษ์` here (correct, "fixed star") vs `ดาว` in g3-unit-7 L36 (generic "star/celestial body") — a minor cross-file gloss drift, not worth a separate finding given both are defensible at their grade levels. No findings.

---

## File 10: `thai-g4-unit-6.json` (116 lines, 2 lessons — "Scientific Inquiry")

### L12 / L28 — Seven-step scientific method
Contributes to the cross-file scientific-method inconsistency documented in **F-SA-B34-004**. The G4 seven-step model (ask/research/hypothesize/test/analyze/conclude/communicate) is itself accurate and well-formed; the issue is only cross-grade reconciliation with the G3 five-step variants. Data/Graphs lesson content (tables, bar/line/pie) is accurate. No new finding.

---

## File 11: `g3-being-a-scientist-questions.json` (322 lines, 36 questions)

### L135 — "five steps … observe, question, predict, test, and ___" → "conclude"
**Contributes to F-SA-B34-004.** This file's five-step formulation (observe/question/predict/test/conclude) conflicts with `thai-g3-unit-8.json` (ask/predict/test/record/conclude). An item keyed to one taxonomy will mismark students taught the other.

### Narrative-dependent items reference a passage not in this batch
**F-SA-B34-007 | low | verifiability / content-coupling**
Many items depend on a reading passage about a girl "Mai" (L30–34 sunny garden, L114 "opened after two hours", L149 "Chiang Mai", L290 "shade under the mango tree", L317 "rain falls and why ants walk in lines"). The narrative is not present in this batch and the lesson `g3-being-a-scientist` is not among the 10 lesson files reviewed. The internal answer keys are self-consistent (e.g. L238–240 "Two hours" matches L114), but factual correctness against the actual passage **cannot be verified within this batch**. Recorded as a limitation, not a defect. Also note `lessonId: "g3-being-a-scientist"` (L2) must resolve to a lesson `slug` of the same value (seed-questions.ts L119–124 matches by slug); that lesson is out-of-batch, so the linkage is unverified here.

### Content — otherwise clean
Scientific-method MCQ/select/true-false/fill/vocab items are internally consistent; distractors ("Magic powers," "Give up," "Knowing all answers already") are appropriate. `points: 1` and at least one standard on every item.

---

## File 12: `g3-comparing-living-things-questions.json` (405 lines, 36 questions)

### General — clean
Adaptations, camouflage, gills, vertebrate/invertebrate comparisons all accurate. `correctAnswer` values verified present in `options`. VOCABULARY_MATCH records well-formed. L287–289 "All insects have six legs → True" is acceptable at grade level. No findings.

---

## File 13: `g3-diversity-living-things-questions.json` (354 lines, 36 questions)

### General — clean
Vertebrate/invertebrate classification, mammal characteristics, "insects have the most species" (L241–243, correct), "spiders are insects → False" (L294–296, correct) all accurate. MULTIPLE_SELECT answer arrays are subsets of their option arrays. No findings.

---

## File 14: `g3-life-processes-growth-questions.json` (379 lines, 36 questions)

### General — clean
Photosynthesis, chlorophyll, germination, growth factors accurate. L138–140 "All living things grow throughout their entire lives → False" (correct — most stop at maturity). L325–327 plants produce oxygen → True (correct). No findings.

---

## File 15: `g3-life-processes-reproduction-questions.json` (356 lines, 36 questions)

### L180–184 — "young … not yet become an adult" keyed as "offspring"
**F-SA-B34-009 | low | precision**
FILL_IN_BLANK: "A young plant or animal that has not yet become an adult is called ___" → `offspring`. "Offspring" denotes the young *produced by reproduction* generically, not specifically "a young that has not yet reached adulthood" (that is juvenile/immature). The prompt and key are loosely matched; a precise student answer ("juvenile") would be marked wrong. Minor wording issue.

### Content — otherwise clean
Pollination, seeds/spores/runners, live birth vs egg-laying, seed dispersal accurate. L301–307 dispersal select (with "Magic" distractor) correct. Stamen/pistil/ovule matches correct.

---

## File 16: `g3-making-observations-questions.json` (384 lines, 36 questions)

### General — clean / strong
Clear, correct separation of observation vs inference (L251–275, L370–381), qualitative vs quantitative, five senses, and a good safety item ("Taste without permission" as the never-do, L60–68). Answer keys consistent. No findings.

---

## File 17: `g3-observing-living-things-lab-questions.json` (405 lines, 36 questions)

### General — clean / strong
Lab-ethics items are sound: handle gently, return organisms to habitat, wash hands, report injured animals to teacher, never take organisms home without permission (all keyed correctly). Tool/term matches correct. No findings.

---

## File 18: `g3-science-safety-tools-questions.json` (358 lines, 36 questions)

### Narrative-dependent items
**Contributes to F-SA-B34-007.** Items reference a story (Teacher Niran, "Kai's pencil … 15 centimeters" L46–48, "warm water … 35 degrees" L190, "rock … 45 grams" L278–280). The passage is not in this batch; internal consistency holds (L312 "warm water had a higher temperature than cold water → True"), but external factual correctness is unverifiable here.

### Content — strong
Tool/unit matching (ruler→length, thermometer→temperature, balance→mass, measuring cup→volume) correct; meniscus item "look at graduated cylinder from above → False" (L305–308, correct); goggles-over-eyes item correct. No defects.

---

## File 19: `g3-what-makes-alive-questions.json` (363 lines, 36 questions)

### L311–313 — "MRS ___" → "GREN"
**Clean.** MRS GREN (Movement, Respiration, Sensitivity, Growth, Reproduction, Excretion, Nutrition) is the standard seven-characteristics mnemonic; the keyed answer is correct.

### L317–321 — "breathe out carbon dioxide … ___" → "excretion"
**Clean (defensible).** Removal of metabolic CO₂ is conventionally classed as excretion at this level; internally consistent with L42–46 ("get rid of waste → Excretion") and distinct from L129–131 ("Respiration … get energy from food → True"). No finding.

### Content — clean
"Virus has all seven characteristics → False" (L296–298, correct), "car not alive because lacks all seven characteristics" (L351–358, correct), cells/nutrition/response items accurate.

---

## File 20: `g4-classifying-materials-questions.json` (43 lines, 5 questions)

### L3–41 — Only 5 questions vs 30–36 in sibling files
**F-SA-B34-010 | low | coverage / data-consistency**
This is the only question file in the batch with a *full lesson* counterpart present in-batch (`g4-classifying-materials` in `thai-g4-unit-2.json`, file 6, L7 — `lessonId` linkage **verified** for this file). However it ships only 5 questions while every G3 sibling ships 36. The lesson covers solids/liquids/gases plus four material properties (hardness, transparency, conductivity, magnetism) and reversible/irreversible context; the quiz exercises only states-of-matter. Per AGENTS.md test-quality expectations and for assessment parity across units, G4 question coverage is materially thinner than G3. The five items present are correct (`Solid` definite shape; `Liquid` takes container shape; gas no-definite-shape/volume select; "solid has no definite shape → False"; "liquid has definite volume" fill). Recommend expanding G4 question banks to match G3 depth.

### Linkage — clean
`lessonId: "g4-classifying-materials"` (L2) matches lesson `id` `g4-classifying-materials` (file 6 L7); since seed-lessons derives `slug` from `id` (seed-lessons.ts L117) and seed-questions resolves by `slug` (seed-questions.ts L119–124), this link will resolve correctly.

---

## Security / Tenancy / Auth

No security or tenancy surface exists inside these static data files. For completeness, the consuming seeders were inspected:

- `seed-lessons.ts` (L134) and `seed-questions.ts` (L182/L195) inject a fixed `schoolId = '00000000-0000-0000-0000-000000000099'` on every row, and seed both `science_lesson_standards` / `science_question_standards` junction rows with the same `schoolId`. The seed data files correctly carry **no** tenant identifiers — tenant scoping is the seeder's responsibility, which is the right separation. No client-supplied tenant data is involved. **No tenancy finding.**
- Seeding is idempotent (lessons upsert on `slug`; questions skip on `(lessonId, order, text)` — seed-questions.ts L140–155), and inputs pass Zod validation before insert (seed-*.ts call `validate*SeedFile`). This is good golden-path hygiene; the data files honor those contracts.

---

## Cross-Cutting Observations

1. **i18n term collisions (F-SA-B34-001, F-SA-B34-006).** Two independent cases of distinct English scientific terms mapped to one identical Thai gloss (Weather/Climate → `สภาพอากาศ`; Melting/Dissolving → `การละลาย`). These defeat the bilingual vocabulary feature and, in the melting case, contradict the item's own English definition. A glossary-level uniqueness check (term→thai) during validation would catch this class of bug.

2. **Structured-content fidelity gap (F-SA-B34-002).** G3 unit files 1–4 ship `structuredContent` with only intro + vocabulary, omitting the markdown "Main Content" body; G4 files 5–10 include body text blocks. The rich-render path therefore shows less material than the markdown path for G3. Recommend parity, and consider a validation rule that flags structured content materially shorter than `content`.

3. **Scientific-method taxonomy drift (F-SA-B34-004).** Three different canonical step lists across the corpus (two G3 five-step variants + one G4 seven-step). Answer keys are pinned to specific variants, creating mismarking risk for students who learn a different variant. Reconcile to a single grade-banded taxonomy.

4. **Factual error in instructional content (F-SA-B34-005).** Chicken/frog "complete metamorphosis" labels are biologically wrong (chickens do not metamorphose; "complete metamorphosis" is an insect category). This is the single hard correctness defect in the batch and should be fixed in source.

5. **Assessment coverage asymmetry (F-SA-B34-010) and ordering (F-SA-B34-008).** G4 question banks (5 items) are far thinner than G3 (36 items); and G3 units 6–8 sequence review/summative before later lessons. Both are quality/consistency issues, not correctness.

6. **Positive baseline.** All 20 files conform to their Zod seed contracts; every quiz `correctAnswer` resolves to a valid option; every lesson and question carries standards alignment; seeding is idempotent and tenant-injection is centralized. The science content is accurate in 8 of 10 lesson files and all 10 question files except the items noted.

---

## Findings Summary

| ID | Severity | Category | Location |
|----|----------|----------|----------|
| F-SA-B34-001 | medium | i18n/content-correctness | thai-g3-unit-6.json L134 & L149 (Weather/Climate → same Thai) |
| F-SA-B34-002 | medium | data-quality / golden-path | thai-g3-unit-6/7/8/9.json (structuredContent omits Main Content body) |
| F-SA-B34-003 | low | i18n-precision | thai-g3-unit-7.json L282–284 ("Celestial" → "ท้องฟ้า") |
| F-SA-B34-004 | medium | curriculum-consistency | thai-g3-unit-8 L266 vs being-a-scientist L135 vs g4-unit-6 L12/L28 (3 scientific-method variants) |
| F-SA-B34-005 | medium | factual/science-correctness | thai-g4-unit-1.json L71 (chicken/frog "complete metamorphosis") |
| F-SA-B34-006 | medium | i18n/content-correctness | thai-g4-unit-2.json L95 & L105 (Melting/Dissolving → same Thai) |
| F-SA-B34-007 | low | verifiability / content-coupling | g3-being-a-scientist & g3-science-safety-tools (passage not in batch) |
| F-SA-B34-008 | low | pedagogical-ordering | thai-g3-unit-6 L342–406 (and units 7, 8): review/assessment before later lessons |
| F-SA-B34-009 | low | precision | g3-life-processes-reproduction L180–184 ("offspring" vs "juvenile") |
| F-SA-B34-010 | low | coverage / data-consistency | g4-classifying-materials-questions.json (5 Q vs 36 in G3 siblings) |

**Severity counts:** high 0 · medium 5 · low 5 · total 10

---

## Limitations

- **Data-only batch.** All 20 files are static curriculum seed JSON. No executable code, request handling, auth, or tenant boundary is present in the file list; findings are content/i18n/consistency/data-shape only. Seed loader and Zod schema files were read for context but are **not** part of this batch's file list and were not line-reviewed.
- **Out-of-batch lesson↔question linkage.** Nine of ten question files reference lessons (`g3-being-a-scientist`, `g3-what-makes-alive`, `g3-comparing-living-things`, etc.) whose lesson JSON is **not** in this batch; those `lessonId`→`slug` resolutions and any passage-dependent answer keys could not be verified here. Only `g4-classifying-materials` links to an in-batch lesson (verified). Narrative-dependent items (Mai story; Teacher Niran story) were checked for internal consistency only.
- **Thai translation review is non-native.** i18n findings (F-SA-B34-001, -003, -006) flag term collisions and gloss/definition mismatches detectable from context; they are not a comprehensive professional Thai linguistic audit.
- **No app code was edited** (per task constraint); this review is read-only.
- **No seed execution or tests were run**; assessment is static review of the JSON against the Zod contracts and curriculum content.
- **No acceptance or closeout determination is made** by this report. It is a line-review artifact for track `science_advantage_review_20260626` and makes no claim that any track is accepted, complete, or ready to close.
