# Storytime sources (Phase 0, 2026-10-21)

Read-only research behind [`design.md`](./design.md). The full list with notes is design §13. Reference programs are references only: no text, word list, song, game, or picture is copied.

## Reference programs (Daniel's Drive folder "Phonics and pronunciation", id 1Mb3f8jO-hRlftFvglG73-7Zw73zzQ48H)

- Reading A-Z phonics lessons 1 to 68, each with a lesson plan, cards, worksheets, and a decodable book (© Learning A-Z). The lesson shape: phonemic awareness, sound and symbol, blend, cumulative review, spell with letter cards, high-frequency words, read words and phrases, the decodable book, worksheet. No timing, handwriting, assessment, or home step.
- Reading A-Z Decodable Passages Packs scope and sequence: 20 sets, 203 lessons.
- Reading A-Z nonsense-word assessments: a 2-minute timed grid per element group.
- Reading A-Z Phonological Awareness sequence, 32 lessons (Daniel's document "RAZ sequence", id 18J3bzCWsS_pEv0tt7V5jgRby8B3HzIh39JD_Ug2kBjU); Learning A-Z "Teaching the Foundations": https://www.learninga-z.com/user_area/content_media/raw/teaching-the-foundations-readers.pdf
- Jolly Phonics word bank and workbooks 1 to 6 (© Jolly Learning); 42 sounds in 7 groups: https://rainbowresource.com/027183.html
- Daniel's s-a-t-i-p-n deck and the 2020 tutoring Curriculum.xlsx (the Reading A-Z order with high-frequency words per element; not a Storytime plan).
- National Reading Panel report (2000), report.pdf.

## Phonemic awareness

- Developing Sound Sense (sightwords.com), 110 games in 12 modules, ages 3 to 5: https://sightwords.com/phonemic-awareness/curriculum/ ; pacing and assessment https://sightwords.com/phonemic-awareness/pacing-assessment/ ; Fast Track https://sightwords.com/phonemic-awareness/pacing-assessment/fast-track/ ; teaching tips https://sightwords.com/phonemic-awareness/teaching-tips/ . Free to print, copyrighted.

## Phonics frameworks and criteria

- Letters and Sounds phases: https://home.oxfordowl.co.uk/reading/what-is-letters-and-sounds/ ; https://www.twinkl.jp/teaching-wiki/order-of-phonics-teaching
- Little Wandle progression and tricky words: https://www.st-norberts.lincs.sch.uk/wp-content/uploads/sites/40/2024/05/English-Whole-School-Reading-Progression-Little-Wandle.pdf ; https://www.ewanrigg.cumbria.sch.uk/curriculum/english/little-wandle/send-programme-progression.pdf
- DfE core criteria for systematic synthetic phonics programmes (2021): https://www.gov.uk/government/publications/phonics-teaching-materials-core-criteria-and-self-assessment/validation-of-systematic-synthetic-phonics-programmes-supporting-documentation
- England Phonics Screening Check technical report: https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/368311/Phonics_screening_check-2012_technical_report.pdf
- DIBELS 8: https://dibels.uoregon.edu/sites/default/files/2026-06/dibels_benchmark_administration_timeline.pdf
- Decodable text criteria: https://pioneervalleybooks.com/blogs/news/teaching-tip-what-makes-a-good-decodable-book ; https://www.readingrockets.org/classroom/choosing-and-using-classroom-texts/using-decodable-books

## Curricula and objective sets

- Thai Basic Education Core Curriculum B.E. 2551, Foreign Languages (F1.1 Gr1/2: "Specify the alphabet and sounds; accurately pronounce and spell simple words by observing principles of reading"): https://pls.edu.iwate-u.ac.jp/wp-content/uploads/2018/10/ThaiEnglish.pdf
- Thai Early Childhood Curriculum B.E. 2560 (no English outcome; a school copy): https://www.abss.ac.th/pdf/cirpdf/curriKinABSS2564.pdf
- Pearson GSE Young Learners objectives (GSE 10 to 21 band includes letters, sounds, tracing): https://www.pearson.com/content/dam/pearson-sites/shared/gse-learning-objectives-young-learners.pdf
- Cambridge Pre A1 Starters handbook and word list: https://www.cambridgeenglish.org/Images/handbook-for-teachers-pre-a1-starters-a1-movers-and-a2-flyers.pdf ; https://www.cambridgeenglish.org/images/351849-pre-a1-starters-word-list-2018.pdf
- Thai L1 interference: https://ajaclibrary.wu.ac.th/index.php/ajac/article/view/77 ; https://so05.tci-thaijo.org/index.php/tgt/article/view/273223

## Competitors (pricing pages)

- https://readingeggs.com/pricing/ ; https://www.oup.es/en/oxfordreadingclub ; https://learninga-z.com/site/lp2/back-to-school-savings-extended ; https://help.lingokids.com/hc/en-us/articles/115005120505 . None found with a Thai caregiver interface.

## Internal

- Workbooks: `docs/content-plans/primary-origins-1-plan.md`, `content/primary/origins-1/l01.json` (the exit profile source), `docs/content-plans/data/a0-objective-key.json`, `docs/content-plans/primary-origins-series-bible.md`, `dashboard/lib/lesson-package/schema.ts`, `dashboard/lib/inject/`, `dashboard/lib/teacher-manual/`, `Teacher guide/` (trainers guide, observation forms, training slides).
- mastery-advantage: `SPECIFICATION.md` §3 and §4; `english/gse-knowledge-space.json` (107 nodes at GSE 10 to 21; Graph session list 2026-10-21); `english/gse-md/young-learners/`; `english/cefr-vocabulary/` (the Vocabulary in Use unit-group overlay); `storytime/README.md`.
- Monorepo (primary-parity-integration): `packages/domain/src/primary-mastery/contracts.ts`, `evidence-policy.ts`, `record-evidence.ts`; `packages/game-cartridges/src/catalog.ts`; `apps/primary-advantage/components/read-along/`; `measure/tracks/science_advantage_relaunch_20261006/`, `zhongwen_advantage_program_20261006/`; `measure/subject-programs-2027-capacity.md`.
- advantage-pr: `03-products/storytime-advantage.md` v1.1, `primary-advantage.md` v1.18 (line 80, no alphabet or phonics in Primary), `08-strategy/product-strategy-2026-2027.md` v1.11, `04-services/onboarding-and-training.md`, `12-operations/primary-teacher-training-plan.md`, `05-methodology/big-4-protocol.md`, `AGENTS.md` claims rules.
