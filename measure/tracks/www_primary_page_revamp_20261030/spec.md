# Spec — www Primary Advantage page revamp

**Track ID:** `www_primary_page_revamp_20261030`
**Type:** feature (classic FR list with acceptance checks)
**Status:** in_progress. Track files only. Opened 2026-10-30.
**Owner chain:** Daniel (owner; Thai check; look check; deploy gate) → Monorepo orchestrator (track owner: tests, crops, page build, merge to local master) → PM orchestrator (assignment A-34; takes questions back to PR).
**PM assignment:** A-34, needed by 2026-11-02.

## 1. Request

Daniel asked for a new Primary Advantage page on www (Google Tasks, 2026-10-29 13:15 ICT): "the entire page needs to be revamped".

PM assignment A-34, 2026-10-29 22:40 ICT, sends the brief and the image list to Monorepo and asks for one Measure track that builds the page. This opening writes only the track files. It builds no page, crops no image, and writes no test.

## 2. Sources and versions

| Source | Version | Date | Kept by |
| --- | --- | --- | --- |
| `11-content/www-primary-advantage-page-brief.md` (page brief: purpose, copy, handoff) | 0.2 | 2026-10-29 | PR session (Daniel Bo) |
| `11-content/www-primary-advantage-page-images.md` (16 images, SHA-256, crops, alt text) | 0.2 | 2026-10-29 | PR session (Daniel Bo) |
| `01-company/contact-and-locations.md` (LINE Official account for the QR check) | 2.1 | 2026-10-07 | PR session |
| `03-products/primary-advantage.md` (live-feature authority) | v1.23 | — | PR session |

The prompt cited brief v0.1. The file on disk says Version 0.2. The copy below follows v0.2. The v0.2 change touched section 4 only: "a story with a picture on every page" became "a story with pictures", and the Thai lost "ทุกหน้า" (revision history, task T1.37 of A-37).

## 3. Handoff rules from the brief (quoted exactly)

1. Build the page on a branch of `reading-advantage-monorepo`. Send preview captures (desktop and phone, English and Thai) to the PR session. Daniel checks the Thai and the look. Daniel does the deploy. Do not deploy.
2. Make the crops as the image list gives them (source path, SHA-256, crop box, output size). Check each SHA-256 before you crop. Change no pixel of a screen. Crop and scale only.
3. Use the copy as it stands. Send a copy change to the PR session. Do not write new copy on the page.
4. Show no price and no date on the page, except the one approved date line in section 3.
5. Decode the QR code of image 16. Check that it opens the LINE Official account in `01-company/contact-and-locations.md`.
6. Keep the Reading Advantage screens and the four old images off the new page.
7. The link of the text link in the closing section is the Tutor Advantage page. Use the path the site already has.

## 4. Page order (quoted exactly)

Hero, sections 1 to 8, the closing call to action, and the meta text. Section 8 is optional; the closing section stays if Daniel drops it.

## 5. Page copy in English and in Thai (quoted exactly from the brief)

### Hero

**Purpose:** Say in one look what Primary Advantage is and who it serves.
**Images (target names under `public/images/primary-advantage/`):** none (see the open question in the handoff)

| Element | English | Thai |
|---|---|---|
| Headline | Primary Advantage: English reading for grades 3 to 6 | Primary Advantage: การอ่านภาษาอังกฤษสำหรับ ป.3 ถึง ป.6 |
| Body | A printed workbook and an app, with the same 14 lessons in each. Thai teachers teach from a scripted lesson plan, and students read, listen, play, and write. | แบบฝึกหัดฉบับพิมพ์และแอปที่มี 14 บทเรียนเหมือนกัน ครูไทยสอนจากแผนการสอนที่เตรียมไว้ให้ ส่วนนักเรียนอ่าน ฟัง เล่นเกม และเขียน |
| Button 1 (to `/pricing`) | See pricing | ดูราคา |
| Button 2 (to the contact page) | Contact us | ติดต่อเรา |

### 1. Workbook and digital twin

**Purpose:** Show that the printed book and the app are one product with the same lessons.
**Images (target names under `public/images/primary-advantage/`):** `workbook-and-app-series`, `workbook-qr-link-landing`

| Element | English | Thai |
|---|---|---|
| Headline | One book. One app. The same lessons. | หนึ่งเล่ม หนึ่งแอป บทเรียนเดียวกัน |
| Body | Each Primary Advantage workbook has 14 lessons, and the app has the same 14. A QR code in the workbook opens the lesson on a phone or a tablet. Students sign in with the class code. | แบบฝึกหัด Primary Advantage แต่ละเล่มมี 14 บทเรียน และแอปมี 14 บทเรียนเดียวกัน คิวอาร์โค้ดในแบบฝึกหัดเปิดบทเรียนนั้นบนโทรศัพท์หรือแท็บเล็ต นักเรียนเข้าสู่ระบบด้วยรหัสชั้นเรียน |

### 2. Blended Learning

**Purpose:** Explain Blended Learning for a director: printed workbooks plus the app in one classroom.
**Images (target names under `public/images/primary-advantage/`):** `blended-student-class-book`, `blended-teacher-class-book`

| Element | English | Thai |
|---|---|---|
| Headline | Blended Learning: workbooks and the app in one classroom | Blended Learning: แบบฝึกหัดและแอปในห้องเรียนเดียวกัน |
| Body | In Blended Learning, the class works in the printed workbook and in the app. The teacher assigns a book to the class and opens each lesson as the class reaches it. Students see the class book on their home page. | ใน Blended Learning ห้องเรียนใช้ทั้งแบบฝึกหัดฉบับพิมพ์และแอป ครูมอบหมายหนังสือให้ชั้นเรียนและเปิดแต่ละบทเรียนเมื่อชั้นเรียนเรียนถึง นักเรียนเห็นหนังสือเรียนของชั้นบนหน้าแรกของตนเอง |
| Button (to `/pricing`) | See pricing | ดูราคา |

### 3. CEFR levels

**Purpose:** Show the book series and the CEFR levels they follow.
**Images (target names under `public/images/primary-advantage/`):** `cefr-book-series`

| Element | English | Thai |
|---|---|---|
| Headline | Books that follow the CEFR levels | หนังสือที่เรียงตามระดับ CEFR |
| Body | Three series lead students from Pre-A1 to A2: Origins, Quest, and Adventure. Primary Advantage is CEFR-aligned. Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027. | หนังสือสามชุด ได้แก่ Origins, Quest และ Adventure พานักเรียนจากระดับ Pre-A1 ถึง A2 Primary Advantage สอดคล้องกับ CEFR Primary Advantage Origins 3.2 และ Primary Advantage Quest 4 จะถึงโรงเรียนในเดือนพฤษภาคม 2027 |

The approved date line is the last sentence of the section 3 body: "Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027." No other date appears on the page.

### 4. What students do (Chibi Quest look)

**Purpose:** Show a student's lesson: read, listen, ask, write. Carries the confirmed copy of the 2026-10-27 `platformFeatures` row.
**Images (target names under `public/images/primary-advantage/`):** `student-story-listen`, `student-language-questions-ai`, `student-long-answer-feedback`, `student-home-thai`

| Element | English | Thai |
|---|---|---|
| Headline | Students read, listen, ask, and write | นักเรียนอ่าน ฟัง ถาม และเขียน |
| Body | Each lesson follows the workbook. Students read a story with pictures, and they can listen and read along. | แต่ละบทเรียนเดินตามแบบฝึกหัด นักเรียนอ่านเรื่องที่มีภาพประกอบ และฟังเสียงพร้อมอ่านตามได้ |
| Features block (confirmed 2026-10-27; use the words as they stand) | Students can ask the Primary Advantage lesson chatbot questions about their passage. They also get AI feedback on their short and long written answers. The app interface is available in English, Thai, Vietnamese, Simplified Chinese, and Traditional Chinese. | นักเรียนสามารถถามคำถามเกี่ยวกับเนื้อเรื่องที่กำลังอ่านกับแชตบอตประจำบทเรียนของ Primary Advantage ได้ นักเรียนยังได้รับคำติชมจาก AI สำหรับคำตอบเขียนแบบสั้นและแบบยาว ส่วนหน้าจอของแอปรองรับภาษาอังกฤษ ไทย เวียดนาม จีนตัวย่อ และจีนตัวเต็ม |

**Note:** Chinese names an interface language, not a course. The page claims no teacher-presentation mode here. Image 7 shows only the way in to the chatbot, and image 8 shows the Get feedback button without the AI text.

### 5. The games

**Purpose:** Show that vocabulary practice is a game.
**Images (target names under `public/images/primary-advantage/`):** `games-vocabulary-picker`, `game-enchanted-library`

| Element | English | Thai |
|---|---|---|
| Headline | Games that practise the words of the lesson | เกมที่ฝึกคำศัพท์ของบทเรียน |
| Body | Each lesson has vocabulary games: RPG Battle, Rune Match, Dragon Rider, and Enchanted Library. Students play with the words of the lesson. The teacher can show a game on the projector for the whole class. | แต่ละบทเรียนมีเกมคำศัพท์ ได้แก่ RPG Battle, Rune Match, Dragon Rider และ Enchanted Library นักเรียนเล่นกับคำศัพท์ของบทเรียน ครูแสดงเกมบนโปรเจกเตอร์ให้ทั้งห้องดูได้ |

**Note:** Game names stay in English in Thai copy. No Forge-rebuild game is named.

### 6. Reedy Preview

**Purpose:** Show Reedy, the voice coach, with the Preview label.
**Images (target names under `public/images/primary-advantage/`):** `reedy-preview`

| Element | English | Thai |
|---|---|---|
| Headline | Reedy Preview: a voice coach for speaking | Reedy Preview: โค้ชฝึกพูด |
| Badge | Preview | ทดลอง |
| Body | Reedy is a voice coach. A student talks about the story in English or in Thai, and Reedy answers. We keep no recording. The voice goes to an AI service only so that Reedy can answer. | รีดี้เป็นโค้ชฝึกพูด นักเรียนเล่าเรื่องที่อ่านเป็นภาษาอังกฤษหรือภาษาไทย แล้วรีดี้ตอบกลับ เราไม่เก็บเสียงบันทึก เสียงถูกส่งไปยังบริการ AI เพียงเพื่อให้รีดี้ตอบได้เท่านั้น |

**Note:** The page quotes no meter. The privacy sentence is the only approved text. Reedy is not a Read Along feature.

### 7. Teacher tools

**Purpose:** Show a teacher that the lesson is ready to teach.
**Images (target names under `public/images/primary-advantage/`):** `teacher-live-guide`, `teacher-projector-games`, `teacher-print-lesson`

| Element | English | Thai |
|---|---|---|
| Headline | Tools for the teacher | เครื่องมือสำหรับครู |
| Body | The live guide takes the teacher through each step of the lesson, with the words to say. The teacher can show the lesson and the games on the projector, rehearse before class, and print a lesson from the class book. The teacher sees the progress of each student in each lesson. | คู่มือสอนสดพาครูผ่านแต่ละขั้นตอนของบทเรียน พร้อมคำพูดที่ใช้สอน ครูแสดงบทเรียนและเกมบนโปรเจกเตอร์ ซ้อมสอนก่อนเข้าชั้นเรียน และพิมพ์บทเรียนจากหนังสือเรียนของชั้นได้ ครูดูความก้าวหน้าของนักเรียนแต่ละคนในแต่ละบทเรียนได้ |

### 8. The next step for a school

**Purpose:** Give a school director a simple next step.
**Images (target names under `public/images/primary-advantage/`):** `contact-channels`

| Element | English | Thai |
|---|---|---|
| Headline | Bring Primary Advantage to your school | นำ Primary Advantage ไปใช้ในโรงเรียนของคุณ |
| Body | Tell us about your classes. We will talk with you about the books, the app, and how a Thai teacher teaches the lessons. | บอกเราเกี่ยวกับชั้นเรียนของคุณ เราจะคุยกับคุณเรื่องหนังสือ แอป และวิธีที่ครูไทยสอนบทเรียน |
| Button 1 (to the contact page) | Contact us | ติดต่อเรา |
| Button 2 (to `/pricing`) | See pricing | ดูราคา |

### Closing call to action

**Purpose:** End the page with the two ways in, for schools and for families.
**Images (target names under `public/images/primary-advantage/`):** none

| Element | English | Thai |
|---|---|---|
| Headline | Start with a conversation | เริ่มต้นด้วยการพูดคุยกับเรา |
| Body | Schools use the books in Blended Learning. Families can reach the same books through Tutor Advantage. | โรงเรียนใช้หนังสือผ่าน Blended Learning ครอบครัวเข้าถึงหนังสือเล่มเดียวกันได้ผ่าน Tutor Advantage |
| Button 1 (to the contact page) | Contact us | ติดต่อเรา |
| Button 2 (to `/pricing`) | See pricing | ดูราคา |
| Text link (to the Tutor Advantage page) | Tutor Advantage for families | Tutor Advantage สำหรับครอบครัว |

### Page title and description (meta)

**Purpose:** Search and share text for the page.
**Images (target names under `public/images/primary-advantage/`):** none

| Element | English | Thai |
|---|---|---|
| Title | Primary Advantage | Reading Advantage | Primary Advantage | Reading Advantage |
| Description | Primary Advantage is a printed English workbook for grades 3 to 6 and an app with the same lessons. Schools use it in Blended Learning. | Primary Advantage คือแบบฝึกหัดภาษาอังกฤษฉบับพิมพ์สำหรับ ป.3 ถึง ป.6 และแอปที่มีบทเรียนเดียวกัน โรงเรียนใช้ผ่าน Blended Learning |

## 6. Images: 16 crops from 15 sources (quoted exactly from the image list)

The crop box is in source pixels: x, y, width, height. Target names are under `public/images/primary-advantage/`. The Monorepo session picks WebP or PNG. "Out" is the output size in pixels.

| # | Page section | Source file | SHA-256 of the source | Target name | Crop (x, y, w, h) and reason | Out | Alt text EN | Alt text TH |
|---|---|---|---|---|---|---|---|---|
| 1 | 1. Workbook and digital twin | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/public/books-desktop.png` | `57130d9f4c2b98a4e31f11dfd4d29d1dcfb1352a2bc25c2cc288edc5d28a29e2` | `workbook-and-app-series` | (32, 188, 1216, 350). Removes the site header and the lower book cards. | 1216×350 | The Primary Advantage Origins 3.2 workbook next to the text that says each book has 14 lessons and the app has the same lessons. | แบบฝึกหัด Primary Advantage Origins 3.2 พร้อมข้อความที่บอกว่าแต่ละเล่มมี 14 บทเรียน และแอปมีบทเรียนชุดเดียวกัน |
| 2 | 1. Workbook and digital twin | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/public/book-link-landing-desktop.png` | `06654228b70ca07ef2d1fac0550ff51bc66df9ea360881e71d9d081742d14cc7` | `workbook-qr-link-landing` | none | 1279×846 | The page that opens when a student scans the QR code in the workbook: the book name, Lesson 1, and a button to sign in with the class code. | หน้าที่เปิดขึ้นเมื่อนักเรียนสแกนคิวอาร์โค้ดในแบบฝึกหัด แสดงชื่อหนังสือ บทที่ 1 และปุ่มเข้าสู่ระบบด้วยรหัสชั้นเรียน |
| 3 | 2. Blended Learning (workbook + app) | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/student/home-desktop.png` | `bebacf4bd318f1a530ca9cd4d29263bb61b4dea6c77e697755da9c3cc845f9e9` | `blended-student-class-book` | (294, 598, 954, 236). Removes the greeting with the QA username and the "QA2 temp assignment" card. | 954×236 | The student home shows the class book, Primary Advantage Origins 3.2, Lesson 1, and the story to keep reading. | หน้าแรกของนักเรียนแสดงหนังสือเรียนของชั้น Primary Advantage Origins 3.2 บทที่ 1 และเรื่องที่อ่านต่อ |
| 4 | 2. Blended Learning (workbook + app) | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/teacher/class-book-desktop.png` | `8dce25ba349ab2c90bf6c67c7eef506c761dca3f33e6e582bdbf220d709aad83` | `blended-teacher-class-book` | (290, 120, 960, 640). Removes the app header and the side menu. | 960×640 | The teacher's class book page for Primary Advantage Origins 3.2 lists the 13 steps of Lesson 1 and the next step to teach. | หน้าหนังสือเรียนของชั้นสำหรับครู Primary Advantage Origins 3.2 แสดง 13 ขั้นตอนของบทที่ 1 และขั้นตอนถัดไปที่ต้องสอน |
| 5 | 3. CEFR levels | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/public/books-desktop.png` | `57130d9f4c2b98a4e31f11dfd4d29d1dcfb1352a2bc25c2cc288edc5d28a29e2` | `cefr-book-series` | (32, 566, 1216, 184). Keeps the three series cards. Cuts the cover thumbnails, which the page edge cuts in half. | 1216×184 | The three book series follow the CEFR levels: Origins at Pre-A1 (A0), Quest at A1, and Adventure at A2. | หนังสือสามชุดตามระดับ CEFR: Origins ระดับ Pre-A1 (A0), Quest ระดับ A1 และ Adventure ระดับ A2 |
| 6 | 4. What students do in the app (Chibi Quest look) | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/student/article-page-desktop.png` | `3b3278a939f812339cd6a789807afcecc5537ea518eb2a4b7ac4dc6fb241a2cd` | `student-story-listen` | none | 1279×846 | A reading page in the app shows the story "Pip is Happy" with its picture and a button to listen and read along. | หน้าอ่านในแอปแสดงเรื่อง Pip is Happy พร้อมภาพประกอบ และปุ่มฟังเสียงพร้อมอ่านตาม |
| 7 | 4. What students do in the app (Chibi Quest look) | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/student/lesson-step13-language-questions-desktop.png` | `33ade919731ac9b270f9c72ecef13bef7345dec25c5a1c926e4d6bf5d21508ad` | `student-language-questions-ai` | (314, 318, 672, 190). Removes the "Student preview" banner and the line "Ready to help QA2 with questions". | 672×190 | The Language Questions step of a lesson, marked AI Powered, Interactive, and Ask Questions. | ขั้นตอนคำถามด้านภาษาในบทเรียน มีป้าย AI Powered, Interactive และ Ask Questions |
| 8 | 4. What students do in the app (Chibi Quest look) | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/student/story-chapter-long-answer-feedback-desktop.png` | `4994fa091ee47ce7fcee51b7055b50a748c41656fc47261dd7c325e34ca23cf6` | `student-long-answer-feedback` | (313, 305, 915, 424). Removes the side menu and the top of the chapter page. | 915×424 | The questions of a story chapter: a short answer marked done and a long-answer box with the Get feedback and Submit answer buttons. | คำถามท้ายตอนของเรื่อง: คำตอบสั้นที่ทำเสร็จแล้ว และช่องคำตอบยาวพร้อมปุ่มขอคำติชมและปุ่มส่งคำตอบ |
| 9 | 4. What students do in the app (Chibi Quest look) | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/student/home-desktop-th.png` | `29f625c26d9b776e566d33b256276a8de1745ab10004cc1da33e954e48dbedfb` | `student-home-thai` | (295, 398, 953, 448). Removes the Thai greeting with the QA username. | 953×448 | The student home in Thai shows the class book, the story to continue, the games, and Reedy with a trial label. | หน้าแรกของนักเรียนเป็นภาษาไทย แสดงหนังสือเรียนของชั้น เรื่องที่อ่านต่อ เกม และรีดี้ที่มีป้ายทดลอง |
| 10 | 5. The games | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/student/lesson-step10-vocabulary-matching-desktop.png` | `a535a41ede293f34145bc8c97f6f13db94046c05a0dd1f15cac96b8ba22451c0` | `games-vocabulary-picker` | (294, 322, 712, 480). Removes the "Student preview" banner, the lesson header, and the progress panel. | 712×480 | A lesson step offers four vocabulary games: RPG Battle, Rune Match, Dragon Rider, and Enchanted Library. | ขั้นตอนของบทเรียนให้เลือกเกมคำศัพท์สี่เกม ได้แก่ RPG Battle, Rune Match, Dragon Rider และ Enchanted Library |
| 11 | 5. The games | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/games/enchanted-library-round1-desktop.png` | `c160c3578521630ea559a2fa10f0d7c46ee8160bb364da3b0db38f79e4f2d3f9` | `game-enchanted-library` | none | 1279×846 | In the Enchanted Library game, a student walks a hero between word books and picks the book that matches the Thai prompt. | ในเกม Enchanted Library นักเรียนบังคับฮีโร่ไปยังหนังสือคำศัพท์ และเลือกเล่มที่ตรงกับคำภาษาไทย |
| 12 | 6. Reedy Preview | `assets/screenshots/primary-advantage/rpg-skin-2026-10-06/captures/p4-reedy-desktop.png` | `70eb97e687e73b262743cfd08086b309dfc391799b70531fc99339082494a39d` | `reedy-preview` | (572, 150, 1924, 1370). The source is 2x. The crop removes the app header and the side menu. Scale to 1280×912. | 1280×912 | Reedy, the speaking coach, is marked Preview. A wizard avatar stands in a forest next to a Start talking button. | รีดี้ โค้ชฝึกพูด มีป้ายทดลอง ตัวละครพ่อมดยืนอยู่ในป่าข้างปุ่มเริ่มพูดคุย |
| 13 | 7. Teacher tools | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/teacher/lesson-live-guide-desktop.png` | `e69f93eaee51282d5e13692acc05fb397986c305911d33f72f309317c71f5ec7` | `teacher-live-guide` | (292, 100, 956, 560). Removes the app header and the side menu. | 956×560 | The teacher's live guide for Lesson 1, Step 1, with the buttons Projector, Rehearsal, and Print this lesson. | คู่มือสอนสดของครูสำหรับบทที่ 1 ขั้นตอนที่ 1 พร้อมปุ่มโปรเจกเตอร์ ซ้อมสอน และพิมพ์บทเรียน |
| 14 | 7. Teacher tools | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/teacher/lesson-projector-games-desktop.png` | `fe9cb38eb177d3399ae310ec99fb843b0c34e801d7955590855d222f34d2b8cf` | `teacher-projector-games` | (292, 160, 964, 500). Removes the app header, the side menu, and the sentence games, which include Castle Defense. | 964×500 | The teacher chooses a vocabulary game to show on the projector for the whole class. | ครูเลือกเกมคำศัพท์เพื่อแสดงบนโปรเจกเตอร์ให้ทั้งห้อง |
| 15 | 7. Teacher tools | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/teacher/lesson-print-view-desktop.png` | `14e92a705425b7f2eea9ce5d58dca2d90d244eaf026de1045970739b3d10d6ed` | `teacher-print-lesson` | (322, 184, 898, 505). Removes the app header and the library backdrop at the left. Ends above the vocabulary table, which the screen edge cuts. | 898×505 | The print view of Lesson 5, At the Market, in Primary Advantage Origins 3.2, with the first two steps of the lesson. | หน้าพิมพ์บทเรียนที่ 5 At the Market ของ Primary Advantage Origins 3.2 พร้อมสองขั้นตอนแรกของบทเรียน |
| 16 | 8. The next step for a school (optional) | `assets/screenshots/primary-advantage/parity-run2-2026-10-19/public/contact-desktop.png` | `bca2fe1944686fb0b24ef842e9524ff295be2e2e93ec0f07ae8d447de94ae3ec` | `contact-channels` | (60, 288, 712, 248). Keeps the four channels and the LINE QR code. Removes the sentence "Schools can ask for a free trial or a demo". | 712×248 | The ways to contact Reading Advantage (Thailand): LINE Official Account, Facebook, phone, and e-mail, with the LINE QR code. | ช่องทางติดต่อ: LINE Official Account, Facebook, โทรศัพท์ และอีเมล พร้อมคิวอาร์โค้ด LINE |

Image count for each section: section 1 has 2, section 2 has 2, section 3 has 1, section 4 has 4, section 5 has 2, section 6 has 1, section 7 has 3, and section 8 has 1. The total is 16 images from 15 source files.

The page keeps no Reading Advantage screen and no old image. The live page uses six Reading Advantage screens (`/images/reading-advantage/choose-your-article.png`, `/images/reading-advantage/language-selector-en-th-zh-vn.png`, `/images/reading-advantage/read-article-and-chat-with-ai.png`, `/images/reading-advantage/order-sentence-activity.png`, `/images/reading-advantage/order-words-activity.png`, `/images/reading-advantage/SRS-flashcard-activity.png`) and four old images (the Primary Advantage logo, the two hero images, and the marketing SVG). None of these paths appears on the new page.

## 7. Rules for the build

- The page shows no price.
- The page shows no date except the approved section 3 line: "Primary Advantage Origins 3.2 and Primary Advantage Quest 4 reach schools in May 2027."
- The page offers no free trial, no free term, and no discount.
- The page names only features that `03-products/primary-advantage.md` (v1.23) calls live.
- Game names stay in English in the Thai copy: RPG Battle, Rune Match, Dragon Rider, Enchanted Library.
- Every string lives in the locale message files (`apps/www-reading-advantage/src/locales/`). The page reads them through `getScopedI18n("pages.products.primaryAdvantage")`. The Thai year stays "2027" as the brief writes it.
- Each crop changes no pixel of a screen. Crop and scale only. Output is lossless (lossless WebP or PNG) at the output size the list gives.
- The build verifies each source SHA-256 before the crop. It adds no hash field to any file. The typed manifest `apps/www-reading-advantage/src/lib/site-assets.ts` holds no hash field today, and the track keeps it that way.
- The build decodes the QR code of image 16 and checks that it opens the LINE Official account in `01-company/contact-and-locations.md` v2.1: **ReadingAdvantage**, `https://line.me/ti/p/Pf7_EF98Pv`.
- The page quotes no meter from the Reedy crop or the Thai student home crop.
- Section 8 stays on the page. The hero keeps the site hero background and takes no new image.

## 8. Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-1 | Content tests read the page in `en` and in `th`. They check each brief string word for word, the links to `/pricing`, the contact page, and the Tutor Advantage page, the meta title and description, and the 16 image paths with their alt text. |
| AC-2 | The Red run of the content tests against the live page fails. |
| AC-3 | The SHA-256 of each of the 15 source files matches the image list before any crop. |
| AC-4 | All 16 crops land under `apps/www-reading-advantage/public/images/primary-advantage/` at the output size the list gives, lossless, crop and scale only. |
| AC-5 | The QR code of image 16 decodes to the LINE Official account of `contact-and-locations.md` v2.1. The decoded value is recorded in the plan. |
| AC-6 | The built page shows the brief copy word for word in `en` and in `th`, with the right links and the exact meta text. |
| AC-7 | The page shows no price, no date except the approved section 3 line, no free trial, no free term, and no discount. The Thai copy keeps the game names in English. All strings live in the locale message files. No hash field is added to any file. |
| AC-8 | None of the six Reading Advantage screens and none of the four old images appears on the new page. |
| AC-9 | Lint, typecheck, the changed-file tests, and the www build pass, each through the heavy-run script. |
| AC-10 | Preview captures show desktop and phone, in `en` and in `th`, under `/home/daniebo/Desktop/a34-www-primary-captures/`. |
| AC-11 | Daniel passes the look check and the Thai check. |
| AC-12 | The branch merges into local `master` only after Daniel's pass. Daniel pushes and deploys. |

## 9. Out of scope

- Push to `origin/master` and deploy. Both stay with Daniel.
- New copy. A copy change goes back to the PR session.
- A real workbook photo. The brief records this gap. Image 1 stays a screenshot.
- The Thai check itself. Daniel checks every Thai line.
