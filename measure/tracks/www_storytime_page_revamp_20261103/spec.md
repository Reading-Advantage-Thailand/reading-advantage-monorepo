# Spec — www Storytime Advantage page revamp

**Track ID:** `www_storytime_page_revamp_20261103`
**Type:** feature (classic FR list with acceptance checks)
**Status:** new. Track files only. Opened 2026-11-03.
**Owner chain:** Daniel (owner; Thai check; look check; deploy gate) → Monorepo orchestrator (track owner: tests, crops, page build, merge to local master) → PM orchestrator (assignment A-45; takes questions back to PR).
**PM assignment:** A-45, 2026-11-03 16:43 ICT. The PR session sends the refreshed brief, the real-image list, and the Thai file by 2026-11-04.

## 1. Request

Daniel asked for the Storytime Advantage page next (Google Tasks, 2026-11-03 16:38 ICT, word for word): "Primary page is updated and live. Next is the storytime page".

PM assignment A-45, 2026-11-03 16:43 ICT, gives the work to the Monorepo orchestrator and asks for one Measure track. This opening writes only the track files. It builds no page, crops no image, and writes no test.

## 2. Sources and versions

| Source | Version | Date | Kept by |
| --- | --- | --- | --- |
| `09-sales-enablement/storytime-release-1/www-page-copy.md` (page copy: English and facts) | 0.4 | 2026-11-03 | PR session |
| `09-sales-enablement/storytime-release-1/www-page-copy-th.md` (Thai copy and alt text) | 0.1 | 2026-11-03 | PR session |
| `09-sales-enablement/storytime-release-1/www-page-images.md` (real-image list) | 0.2 (commit `84b07643`) | 2026-11-03 | PM hand-off |
| `09-sales-enablement/storytime-release-1/README.md` (sales pack index and release 1 facts) | 0.10 | 2026-11-02 | PR session |
| `03-products/storytime-advantage.md` (live-feature authority) | 1.16 | 2026-11-03 | PR session |
| `01-company/contact-and-locations.md` (contact page authority) | 2.1 | 2026-10-07 | PR session |
| `apps/www-reading-advantage/src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx` (live page) | HEAD `3b182491c` | 2026-11-03 | Monorepo |
| `apps/www-reading-advantage/src/locales/pages/products/storytime-advantage.ts` (live strings) | HEAD `3b182491c` | 2026-11-03 | Monorepo |

The PM hand-off closed task 1.0 at 19:06 ICT on 2026-11-03. It supplied 10 PNG files and `MANIFEST.txt` in `/home/daniebo/Desktop/handoff/a45-storytime-www-images/`. The PM checked each SHA-256 at the source and in the copied folder.

The build uses copy v0.4 from commit `9b5e1743` and Thai copy v0.1 from commit `4f8fcbde`, word for word. The fixture uses those source files.

The copy v0.4 reflects product file v1.16. The image list v0.2 from commit `84b07643` is the image authority. The classroomAlt slot remains a gap. Do not use or add a cast sheet or classroom image.

## 3. Handoff rules from the brief (quoted exactly)

From PM assignment A-45, 2026-11-03 16:43 ICT:

1. "Revamp the www Storytime Advantage page (apps/www-reading-advantage, route /products/storytime-advantage, en and th), with the same pipeline as the Primary page track."
2. "Done when: the branch passes its gates and Daniel approves the captures. The deploy is Daniel's push of master."
3. "Rules: no date, no price, no outcome claim on the page; real product files only."

From `www-page-copy.md` v0.4:

4. "Draft for Daniel's check of the content, Thai, and look. The app work is not deployed. The Monorepo session builds on a branch after Daniel accepts the brief. Daniel deploys."
5. "The copy has no public date, price, or outcome promise. It names CEFR only and does not name a reference program. It does not call an app part live or available, and it does not say "in production". The hand-off statement is word for word."
6. "The page gives no date."
7. "Pictures: use only the approved real files in `www-page-images.md`. The list gives source paths, hashes, pixel sizes, target names, bilingual alt text, and approval records. The PM moves the files. The print proof is not approved, so the list does not include a photo of a printed book."

From `README.md` v0.10:

8. "Draft for Daniel's review. Not for use with schools yet. No public date."
9. "PR makes the pack from real files only."

The build uses these rules:

- Build the page on a branch. Send preview captures in `en` and in `th`, desktop and phone. Daniel checks the look and the Thai. Daniel pushes and deploys. Do not push. Do not deploy.
- Make each crop as the image list gives it. Check each source file first. Change no pixel of a screen. Crop and scale only.
- Use the copy as it stands. Send a copy change to the PR session. Do not write new copy on the page.
- Show no date value and no price on the page.
- Make no claim about learning results, scores, or the time to a result.
- Offer no free trial and no free term.
- Use real product files only. Use no stock picture, no mock-up, and no generated picture.
- Keep every live stock image off the new page.

## 4. Page sections

The live page has seven sections. This table records them at HEAD `3b182491c`.

| # | Live section | Live content | Live image |
| --- | --- | --- | --- |
| 1 | Hero | `hero.title`, `hero.subtitle`, `hero.description`, the roadmap badge, and one button to `/contact` | `/images/hero-storytime-advantage.jpg`, `/storytime-advantage.png` |
| 2 | Adaptive Learning Path | `adaptiveEngine.eyebrow`, `adaptiveEngine.heading`, `adaptiveEngine.description` | `/marketing/ra-marketing-storytime-advantage.svg` and its `-th` file |
| 3 | Key Features | `keyFeatures.heading` and two lists of four points | none |
| 4 | K-3 Curriculum | `coreValue.heading` and three features | `/images/storytime-advantage-hero.jpg` |
| 5 | Teacher Resources | `teacherTools.heading` and three cards | none |
| 6 | FAQ | `faq.heading` and five questions | none |
| 7 | Final call to action | `cta.heading`, `cta.description`, and two buttons to `/contact` | none |

The new page keeps the seven purposes: hero, skill map, what release 1 includes, curriculum scope, teacher tools, FAQ, and the closing call to action. The refreshed brief sets the final order and must keep the seven purposes. A brief that drops or merges a section stops the track for a spec amendment before Red. The build does not choose a section set.

The live page has no games section and no demo section. The new page keeps none. If Daniel asks for a games section or a demo section, the track takes a new owner decision and a new spec section, as the Primary track did in its section 7a.

## 5. Page copy in English and in Thai (quoted exactly from brief v0.4 and Thai file v0.1)

The build copies the listed sources word for word. Daniel checks the Thai and the look.

### Hero

**Purpose:** Say in one look what Storytime Advantage is, who it serves, and that the first unit is in preparation.
**Images (target names under `public/images/storytime-advantage/`):** `week-01-hello-pip.png`

| Element | English | Thai |
|---|---|---|
| Headline | Stories, Songs, and First Sounds | นิทาน เพลง และเสียงแรกของภาษาอังกฤษ |
| Subtitle | English for Anuban 2 to P2 (ages 4 to 8) | ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 (อายุประมาณ 4 ถึง 8 ปี) |
| Body | Storytime Advantage is an English program for kindergarten and early primary. Each week has one sound, one song, and two books, and every lesson is printed in full for the class teacher. The first unit is being prepared. | Storytime Advantage เป็นหลักสูตรภาษาอังกฤษสำหรับชั้นอนุบาลและประถมต้น ทุกสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม ทุกคาบมีแผนการสอนครบ กำลังจัดเตรียมหน่วยการเรียนรู้แรก พร้อมหนังสือนักเรียนฉบับพิมพ์และส่วนดิจิทัลที่เชื่อมด้วยคิวอาร์โค้ด |
| Badge (`comingSoon`) | In Preparation | กำลังจัดเตรียม |
| Hero alt text (`heroAlt`) | Pip in a Storytime Advantage week 1 story picture | Pip ในภาพประกอบเรื่องประจำสัปดาห์ที่ 1 ของ Storytime Advantage |

### 1. Skill map (Mastery Advantage)

**Purpose:** Show a director the print and QR parts of the first unit.
**Images (target names under `public/images/storytime-advantage/`):** `level-2-unit-1-cover-art.png`

| Element | English | Thai |
|---|---|---|
| Eyebrow | Mastery Advantage | Mastery Advantage |
| Headline | Print and QR for the First Unit | หนังสือฉบับพิมพ์และคิวอาร์โค้ดสำหรับหน่วยแรก |
| Body | The first unit pairs a printed student book and a Thai-only teacher book with QR-linked digital parts. The app build is being prepared and is not deployed. | หน่วยการเรียนรู้แรกมีหนังสือนักเรียนฉบับพิมพ์ คู่มือครูภาษาไทย และส่วนดิจิทัลที่เชื่อมด้วยคิวอาร์โค้ด กำลังจัดเตรียมแอปและยังไม่ได้ติดตั้งใช้งาน |
| Image alt text (`adaptiveEngine.alt`) | The approved Level 2 cover artwork for Storytime Advantage | ภาพปก Level 2 ของ Storytime Advantage ที่ได้รับอนุมัติ |

### 2. What release 1 includes

**Purpose:** Show the print form and the QR parts of the first unit.
**Images (target names under `public/images/storytime-advantage/`):** `week-01-reader-hello-cover.png`, `week-01-reader-nan-can-nod-cover.png`

| Element | English | Thai |
|---|---|---|
| Headline | What Release 1 Includes | สิ่งที่มีในหน่วยการเรียนรู้แรก |
| Group 1 title | In Print | ฉบับพิมพ์ |
| Group 1 point 1 | One A4 Storytime Advantage, Level 2, Unit 1, Student Book for weeks 1 to 8, with tear-out readers of about A5 inside the bound book. Children fold, nest, and staple each reader; no scissors are needed | หนังสือนักเรียน Storytime Advantage, Level 2, Unit 1, Student Book ขนาด A4 หนึ่งเล่ม สำหรับสัปดาห์ที่ 1 ถึง 8 พร้อมหนังสือฝึกอ่านฉีกออกได้ขนาดประมาณ A5 อยู่ในเล่ม เด็กพับ ซ้อน และเย็บเล่มย่อยแต่ละเล่ม โดยไม่ต้องใช้กรรไกร |
| Group 1 point 2 | A Thai-only teacher book, with five lesson scripts a week | คู่มือครูภาษาไทย พร้อมแผนการสอนสัปดาห์ละ 5 คาบ |
| Group 1 point 3 | Color reader files for the teacher to print on A3 and lead the class | ไฟล์หนังสือฝึกอ่านสีสำหรับครูพิมพ์ลงกระดาษ A3 เพื่อใช้สอนในชั้นเรียน |
| Group 1 point 4 | A review strip for each day | แถบทบทวนประจำวัน |
| Group 2 title | By QR Code, With No Login | ส่วนดิจิทัลผ่านคิวอาร์โค้ด |
| Group 2 point 1 | QR-linked digital parts, being prepared with the app | ส่วนดิจิทัลที่เชื่อมด้วยคิวอาร์โค้ดกำลังจัดเตรียมพร้อมกับแอป |
| Group 2 point 2 | The app build contains lesson text for all eight weeks; it is not deployed | ในแอปมีข้อความบทเรียนครบทั้ง 8 สัปดาห์ แต่ยังไม่ได้ติดตั้งใช้งาน |

### 3. Curriculum scope (Anuban 2 to P2)

**Purpose:** Show the weekly rhythm and the link to home.
**Images (target names under `public/images/storytime-advantage/`):** the week 2 to week 7 story pages (`week-02-how-many-cakes.png` to `week-07-top-on-a-pot.png`)

| Element | English | Thai |
|---|---|---|
| Headline | One Sound, One Song, Two Books a Week | หนึ่งเสียง หนึ่งเพลง หนังสือสองเล่ม ทุกสัปดาห์ |
| Feature 1 title | Lessons Printed in Full | แผนการสอนครบทุกขั้นตอน |
| Feature 1 body | Five 30-minute lessons a week in Anuban. Each step gives what the teacher does and the English the teacher says, with the Thai beside it. | หนังสือนักเรียนและคู่มือครูจัดเนื้อหาสำหรับการสอนแต่ละสัปดาห์ |
| Feature 2 title | One Sound a Week | ฝึกอ่านจากหนังสือ |
| Feature 2 body | Each week teaches one letter sound, with a recorded pure sound, a hand action, and words that start with the sound. | หนังสือหนึ่งเล่มมีเรื่องอ่านตามและหนังสือฝึกอ่านที่ใช้เสียงและคำตามบทเรียน |
| Feature 3 title | A Link to Home | เชื่อมต่อกับบ้านด้วยคิวอาร์โค้ด |
| Feature 3 body | A Thai home card each week, with QR codes for the song and books being prepared with the app. | บัตรกิจกรรมที่บ้านภาษาไทยมีคิวอาร์โค้ดสำหรับเพลงและหนังสือที่กำลังจัดเตรียมพร้อมกับแอป |

The Thai feature lines are Daniel's draft. They are not a literal translation of the English. Daniel checks them.

### 4. For the teacher

**Purpose:** Show a generalist teacher that the lesson is ready to teach.
**Images:** none. The `classroomAlt` slot stays a gap. Do not fill it.

| Element | English | Thai |
|---|---|---|
| Headline | For the Teacher | สำหรับครู |
| Tool 1 title | Printed Scripts | คู่มือครูฉบับพิมพ์ |
| Tool 1 body | The teacher reads the script. There is no lesson planning. | ครูอ่านตามแผนการสอนที่จัดเตรียมไว้ |
| Tool 2 title | Review Strips | แถบทบทวน |
| Tool 2 body | Each sound and word comes back on a fixed schedule, in 4 minutes or less a day. | แถบทบทวนช่วยให้ครูนำเสียงและคำกลับมาทบทวนตามแผน |
| Tool 3 title | Friday Check | การตรวจประจำสัปดาห์ |
| Tool 3 body | A 3-minute picture check tells the teacher which sounds and words to bring back. | การตรวจด้วยภาพช่วยให้ครูเห็นเสียงและคำที่ควรนำมาทบทวน |
| `classroomAlt` | No image or alt text. The image slot stays empty. | ไม่มีภาพหรือข้อความแทนภาพ ช่องภาพนี้เว้นว่างไว้ |

### 5. Frequently asked questions

**Purpose:** Answer the five questions a school asks first.
**Images (target names under `public/images/storytime-advantage/`):** none.

| Element | English | Thai |
|---|---|---|
| Headline | Frequently Asked Questions | คำถามที่พบบ่อย |
| Q1 | What does Storytime Advantage release 1 include? | Storytime Advantage release 1 มีอะไรบ้าง |
| A1 | The first unit is being prepared. It has one A4 student book for weeks 1 to 8, a Thai-only teacher book, and QR-linked digital parts. The app work is not deployed. Contact us to discuss the first unit. | กำลังจัดเตรียมหน่วยการเรียนรู้แรก ประกอบด้วยหนังสือนักเรียน A4 หนึ่งเล่มสำหรับสัปดาห์ที่ 1 ถึง 8 คู่มือครูภาษาไทย และส่วนดิจิทัลที่เชื่อมด้วยคิวอาร์โค้ด งานแอปยังไม่ได้ติดตั้งใช้งาน ติดต่อเราเพื่อพูดคุยเกี่ยวกับหน่วยการเรียนรู้แรก |
| Q2 | How do the QR links work? | คิวอาร์โค้ดเชื่อมไปยังส่วนใด |
| A2 | The QR code links to the digital parts being prepared with the app. The app work is not deployed yet. | คิวอาร์โค้ดเชื่อมไปยังส่วนดิจิทัลที่กำลังจัดเตรียมพร้อมกับแอป งานแอปยังไม่ได้ติดตั้งใช้งาน |
| Q3 | Our kindergarten teachers are not English teachers. Can they teach it? | ครูอนุบาลที่ไม่ใช่ครูภาษาอังกฤษสอนได้ไหม |
| A3 | Yes. Every lesson is printed in full: what the teacher does, the English the teacher says with the Thai beside it, what the children do, and what to watch. | ได้ คู่มือครูมีแผนการสอนและข้อความภาษาอังกฤษที่ใช้สอน พร้อมความหมายภาษาไทยและสิ่งที่เด็กทำในแต่ละขั้นตอน |
| Q4 | Who is Storytime Advantage for? | Storytime Advantage เหมาะกับใคร |
| A4 | Children from Anuban 2 to P2, about ages 4 to 8, and their class teachers. Parents join through the weekly home card. | เด็กอนุบาล 2 ถึง ป.2 อายุประมาณ 4 ถึง 8 ปี และครูประจำชั้น ผู้ปกครองร่วมกิจกรรมที่บ้านได้ผ่านบัตรประจำสัปดาห์ |
| Q5 | What happens after P2? | หลังจาก ป.2 แล้วเรียนอะไรต่อ |
| A5 | Storytime Advantage: Anuban 2 to P2. Primary Advantage from P3. A P3 class without phonics runs the Primary catch-up module. | Storytime Advantage: Anuban 2 to P2. Primary Advantage from P3. A P3 class without phonics runs the Primary catch-up module. |

The Thai page keeps the English hand-off statement word for word. The PM asks Daniel about it during the look check.

### 6. Closing call to action

**Purpose:** End the page with one next step.
**Images (target names under `public/images/storytime-advantage/`):** none.

| Element | English | Thai |
|---|---|---|
| Headline | Interested in Storytime Advantage? | สนใจ Storytime Advantage ไหม |
| Body | The first unit is being prepared. Contact us to discuss Storytime Advantage. | กำลังจัดเตรียมหน่วยการเรียนรู้แรก ติดต่อเราเพื่อพูดคุยเกี่ยวกับ Storytime Advantage |
| Button 1 | Contact Us | ติดต่อเรา |
| Button 2 | Learn More | ดูข้อมูลเพิ่มเติม |

### Page title and description (meta)

**Purpose:** Search and share text for the page.
**Images (target names under `public/images/storytime-advantage/`):** none.

| Element | English | Thai |
|---|---|---|
| Title | `Storytime Advantage - English for Anuban 2 to P2 \| Reading Advantage Thailand` | `Storytime Advantage - ภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 \| Reading Advantage Thailand` |
| Description | Storytime Advantage is an English program for Anuban 2 to P2: one sound, one song, and two books each week. The first unit is being prepared, with a printed student book and QR-linked digital parts. | Storytime Advantage คือหลักสูตรภาษาอังกฤษสำหรับอนุบาล 2 ถึง ป.2 ทุกสัปดาห์มีหนึ่งเสียง หนึ่งเพลง และหนังสือสองเล่ม กำลังจัดเตรียมหน่วยการเรียนรู้แรก พร้อมหนังสือนักเรียนฉบับพิมพ์และส่วนดิจิทัลที่เชื่อมด้วยคิวอาร์โค้ด |

The `\|` in each title is a markdown table escape. Each title holds one `|` character.

### Section labels (`eyebrows`)

| Key | English | Thai |
|---|---|---|
| `keyFeatures` | WHAT IS IN THE PROGRAM | สิ่งที่มีในหลักสูตร |
| `k3Curriculum` | ANUBAN 2 TO P2 | อนุบาล 2 ถึง ป.2 |
| `teacherResources` | FOR THE TEACHER | สำหรับครู |
| `frequentlyAskedQuestions` | FREQUENTLY ASKED QUESTIONS | คำถามที่พบบ่อย |

### Old roadmap strings that leave the page

The old strings that claim a roadmap, a plan, or no release date leave all three locale files. The keys are: `metadata.title`, `metadata.description`, `hero.title`, `hero.subtitle`, `hero.description`, `hero.comingSoon`, `coreValue.heading`, `keyFeatures.heading`, `teacherTools.heading`, `adaptiveEngine.eyebrow`, `adaptiveEngine.heading`, `adaptiveEngine.description`, `faq.questions[0..4]`, and `cta.description`. The test checks the exact English and Thai values of these keys.

The new copy keeps these headings: `faq.heading`, `cta.heading`, `cta.buttons.learnMore`, and `eyebrows.teacherResources`. They are not old roadmap strings.

`heroAlt` stays as a key and takes the new hero alt text. Remove `classroomAlt` because its image slot stays empty. `adaptiveEngine.alt` takes the cover alt text. Each other image gets a key under `images`, in camelCase from the list target name.

## 6. Images: 10 files from the real-image list v0.2

The source paths and SHA-256 values are in `MANIFEST.txt`. The build checks all 10 hashes before use. Crop boxes and output sizes are selected from the page image slots and recorded in `plan.md`.

| # | Slot | Target name under `public/images/storytime-advantage/` | Pixels | Alt text EN | Alt text TH |
|---|---|---|---|---|---|
| 1 | Hero | `week-01-hello-pip.png` | 4000×3000 | Pip appears in the week 1 story page, “Hello, I Am Pip.” | Pip ปรากฏในหน้าหนังสือเรื่องประจำสัปดาห์ที่ 1 “Hello, I Am Pip” |
| 2 | Story section: week 2 | `week-02-how-many-cakes.png` | 4000×3000 | The week 2 story page shows seven cakes. | หน้าหนังสือเรื่องประจำสัปดาห์ที่ 2 แสดงเค้กเจ็ดชิ้น |
| 3 | Story section: week 3 | `week-03-it-is-red.png` | 4000×3000 | A week 3 story page shows an object that is red. | หน้าหนังสือเรื่องประจำสัปดาห์ที่ 3 แสดงสิ่งของสีแดง |
| 4 | Story section: week 4 | `week-04-nan-and-pam-nap.png` | 4000×3000 | Nan and Pam appear in a week 4 story page. | Nan และ Pam ปรากฏในหน้าหนังสือเรื่องประจำสัปดาห์ที่ 4 |
| 5 | Story section: week 5 | `week-05-two-ears.png` | 4000×3000 | A week 5 story page shows two ears. | หน้าหนังสือเรื่องประจำสัปดาห์ที่ 5 แสดงหูสองข้าง |
| 6 | Story section: week 6 | `week-06-i-see-a-cat.png` | 4000×3000 | A cat appears in a week 6 story page. | แมวปรากฏในหน้าหนังสือเรื่องประจำสัปดาห์ที่ 6 |
| 7 | Story section: week 7 | `week-07-top-on-a-pot.png` | 4000×3000 | A top sits on a pot in a week 7 story page. | ลูกข่างวางอยู่บนหม้อในหน้าหนังสือเรื่องประจำสัปดาห์ที่ 7 |
| 8 | Product cover | `level-2-unit-1-cover-art.png` | 4000×3000 | The cover picture of Storytime Advantage Level 2. | ภาพปกของ Storytime Advantage Level 2 |
| 9 | Reader cover | `week-01-reader-hello-cover.png` | 4000×3000 | The cover of the week 1 reader, “Hello!” | ปกหนังสือฝึกอ่านประจำสัปดาห์ที่ 1 “Hello!” |
| 10 | Reader cover | `week-01-reader-nan-can-nod-cover.png` | 4000×3000 | The cover of the week 1 reader, “Nan Can Nod.” | ปกหนังสือฝึกอ่านประจำสัปดาห์ที่ 1 “Nan Can Nod” |

No real photo of the printed student book exists. No classroom photo or approved cast sheet is in the list. The `classroomAlt` slot stays empty. Do not use a mock-up or a print-page composite.

The maker selects crop boxes and output sizes from the page slots. The plan records each source, crop box, and output size.

Rules for each image:

- Read the absolute source path from the list. The source folders are read only. The Monorepo session never writes there.
- Check the SHA-256 of each source file against the list before the first crop. One mismatch stops the run with zero files written.
- Use the crop box recorded in the plan, in source pixels: x, y, width, height. Crop and scale only. Change no pixel of a screen.
- Write each file under `apps/www-reading-advantage/public/images/storytime-advantage/` at the output size the list gives.
- Use lossless WebP. Do not use a lossy setting.
- Use the alt text from list v0.2, in English and in Thai.
- Add no hash field to any file. The typed manifest `apps/www-reading-advantage/src/lib/site-assets.ts` holds no hash field today, and the track keeps it that way.
- Use real product files only. Use no stock picture, no mock-up, and no generated picture.

The new page removes every live stock image: `/images/hero-storytime-advantage.jpg`, `/storytime-advantage.png`, `/images/storytime-advantage-hero.jpg`, `/marketing/ra-marketing-storytime-advantage.svg`, and `/marketing/ra-marketing-storytime-advantage-th.svg`. None of these paths appears on the new page.

## 7. Rules for the build

- The page shows no date value. It may say that there is no public date. It shows no price.
- The page makes no claim about learning results, scores, or the time to a result.
- The page offers no free trial, no free term, and no discount.
- The page does not call an app part live or available. It promises no scheduler.
- If the page names a framework, it names CEFR only. It names no reference program. A reference program is a named competitor or a named outside curriculum, for example Raz-Kids or Khan Academy Kids.
- The page does not say "in production".
- The hand-off statement is word for word: "Storytime Advantage: Anuban 2 to P2. Primary Advantage from P3. A P3 class without phonics runs the Primary catch-up module."
- Every string lives in the locale message files under `apps/www-reading-advantage/src/locales/`. The page reads them through `getScopedI18n("pages.products.storytimeAdvantage")`.
- The `zh` locale file holds the English copy of the new page strings. The `zh` page shows the English copy, unless Daniel says otherwise. The `zh` page shows no old roadmap string and no old image.
- The two call-to-action buttons go to `/contact`. The page holds no other internal link, no `mailto:` link, and no external URL, unless the refreshed brief names another target.
- Each crop changes no pixel of a screen. Crop and scale only. The output is lossless at the output size the list gives.
- The content test fixture lives under `apps/www-reading-advantage/src/__tests__/fixtures/`. The fixture holds the expected English and Thai strings.
- The build never commits `graph.db`.
- The refreshed brief is the copy authority. A copy change goes back to the PR session.
- The claims scanner flags these terms: any four-digit year (`20\d\d`), English month names, `พ.ศ.`, `฿`, `THB`, `baht`, `บาท`, `$`, `USD`, `price`, `ราคา`, `free` (whole word), `ฟรี`, `ทดลองใช้`, `discount`, `ส่วนลด`, `results`, `score`, `guarantee`, `guaranteed`, `fluent`, `fluency`, `grade level`, `ผลลัพธ์`, and `รับประกัน`. It does not flag the words "date" or "no public date". It does not flag the durations "30-minute", "5-minute", "3-minute", and "4 minutes".

## 8. Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-1 | Content tests read the page in `en` and in `th`. They check each brief string word for word, the two `/contact` links, the meta title and description, and each image path with its alt text in both languages. They check that the old roadmap strings of section 5 are absent. They read the page in `zh` too, where they check the English copy. |
| AC-2 | The Red run of the content tests against the live page fails for assertion reasons only. No failure comes from a missing module, a syntax error, or a type error. |
| AC-3 | The SHA-256 of each source file matches the real-image list before any crop. |
| AC-4 | Every crop lands under `apps/www-reading-advantage/public/images/storytime-advantage/` at the output size the list gives. Each file is lossless. The build changes no pixel of a screen. |
| AC-5 | The built page shows the brief copy word for word in `en` and in `th`, with the two `/contact` links and the exact meta text. |
| AC-6 | The page shows no date value, no price, no outcome claim, no free trial, no free term, and no discount. The claims scanner of section 7 runs with `control:` tests that inject each term class and expect a flag. All strings live in the locale message files. The build adds no hash field to any file. |
| AC-7 | No live stock image appears on the new page. Every image is a real product file from the list. |
| AC-8 | Lint, typecheck, the changed-file tests, and the www build pass, each through the heavy-run script. |
| AC-9 | Preview captures show desktop and phone, in `en` and in `th`, under `/home/daniebo/Desktop/a45-www-storytime-captures/`. |
| AC-10 | Daniel passes the look check and the Thai check. |
| AC-11 | The branch merges into local `master` only after Daniel's pass. Daniel pushes and deploys. |
| AC-12 | The `zh` page shows the English copy of the new strings. It shows none of the old roadmap strings of section 5 and no old image. |
| AC-13 | The page keeps the seven section purposes of section 4 and has seven containers: `st-hero`, `st-section-1` to `st-section-5`, and `st-cta`. It has no games container and no demo container. |
| AC-14 | The content test fixture sits under `src/__tests__/fixtures/`. The branch commits no `graph.db`. |
| AC-15 | The page does not call an app part live or available. It promises no scheduler. It names no reference program and does not say "in production". The content test flags the strings "app is live", "app is available", "now available", "scheduler", "in production", "Raz-Kids", and "Khan Academy Kids". |

## 9. Out of scope

- Push to `origin/master` and deploy. Both stay with Daniel.
- New copy. A copy change goes back to the PR session.
- A printed-book photo and a classroom photo. The list records both gaps.
- The Thai check itself. Daniel checks every Thai line.
- A games section or a demo section. The live page has none. A new owner decision is necessary.
- The Storytime app build. The app has its own track.
