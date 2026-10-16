# Video checks (script and scorer)

For each new video of `video-list-for-pr.md`: a script check against the lesson text, and a scorer
check of the seller lines on the roleplay rubric. A model answer in a video must pass its own
roleplay (PR, 2026-10-16).

**Scorer check method:** the seller lines of the named beats, synthesized with the house voice
(Thai `Thai_Optimistic_girl`, English `English_Graceful_Lady`), scored by `google/gemini-3.8-flash`
with low reasoning, with the production prompt and the rubric rows of the current seed.

## N8 `parent-conversation-close` (advantage-pr `163a412`) and N11 `future-tutor-questions` (`0a64331`)

Script source: `assets/sales-training/2027/source/videos/scripts.md` 1.1 at `0a64331`. Lessons:
seed at `724061afe`.

### Scorer check (2026-10-16)

| Clip | Beats | Roleplay | As made | Criteria as made | With the fix | Criteria with the fix |
|---|---|---|---|---|---|---|
| N8 TH | 4, 6, 8, 9 | R1 | 88 pass | 65, 95, 100, 100 | 98 pass | 100, 90, 100, 100 |
| N8 EN | 4, 6, 8, 9 | R1 | 84 **fail** | 50, 95, 100, 100 | 96 pass | 100, 85, 100, 100 |
| N11 TH | 9, 11 | RR1 | 85 pass | 75, 100, 60, 100 | 100 pass | 100, 100, 100, 100 |
| N11 EN | 9, 11 | RR1 | 85 **fail** | 90, 100, 40, 100 | 100 pass | 100, 100, 100, 100 |
| N11 TH | 14 | RR2 | 80 **fail** | 100, 100, 0, 100 | 100 pass | 100, 100, 100, 100 |
| N11 EN | 14 | RR2 | 80 **fail** | 100, 100, 0, 100 | 100 pass | 100, 100, 100, 100 |
| N11 TH | 16 | RR3 | 61 **fail** | 60, 0, 100, 100 | 100 pass | 100, 100, 100, 100 |
| N11 EN | 16 | RR3 | 66 **fail** | 75, 0, 100, 100 | 100 pass | 100, 100, 100, 100 |

The claims criterion was 100 on all 16 clips. Cost: $0.0041–0.0057 for each score.

### Findings

| # | Beat | Finding | Fix (tested above where marked) |
|---|---|---|---|
| 1 | N8 4–9 | R1 needs at least 3 discovery questions; the tutor asks 2 (where she learns English now; what the parent wants). R1 Discovery 50 (EN). | Tested: a third question before the trial, the free time from the playbook list. New beat after 7: **ครูแพร:** "น้องว่างช่วงไหนบ้างคะ วันธรรมดาหรือเสาร์อาทิตย์" / **Teacher Prae:** "When is she free: on weekdays or at the weekend?"; **คุณแม่น้องมิว:** "เสาร์อาทิตย์ค่ะ" / **Mew's mother:** "At the weekend." Then beat 8 and beat 9 (Saturday at ten) follow from her answer. On-screen note for the new beat: "ถามเวลาว่างของน้อง" / "Ask when the child is free". |
| 2 | N8 15 | "ทุกคาบน้องได้พูดเป็นคู่กับเพื่อนในกลุ่ม" / "In every class, the children talk in pairs" is not in the lessons or in the pinned PR sources. | "ทุกคาบน้องได้อ่านและพูดในกลุ่มเล็ก" / "In every class, the children read and speak in the small group" (M5.3: reading, vocabulary, and speaking in a small group). |
| 3 | N8 16 | "แพ็กเกจละสามพันบาท" / "It is 3,000 baht" gives a fixed price. The lessons and the spec use "from 3,000 baht" ("ราคาเริ่มต้น 3,000 บาท"), and it is a fact that expires. | The M5.3 close line without the hours (the PR videos give no hours until Q-SE-14): "หนึ่งแพ็กเกจคลาสคือหนังสือหนึ่งเล่ม ราคาเริ่มต้นสามพันบาท รวมหนังสือและแอปแล้วค่ะ" / "One class package is one book, from 3,000 baht, with the printed book and the app." |
| 4 | N8 18 | The "maybe" answer leaves the next contact to the parent ("Message me when you're ready"). M5.1 "If the parent says maybe": send the parent info deck, and send one follow-up message after 3 days. | "เดี๋ยวครูส่งเอกสารข้อมูลสำหรับผู้ปกครองให้ทาง LINE นะคะ คุณพ่อจะได้ดูด้วยกัน แล้วอีกสามวันครูทักไปอีกครั้งนะคะ" / "I'll send you our parent information on LINE, so you can look at it together, and I'll message you again in three days." On-screen note: "ส่งข้อมูล แล้วนัดทักอีกครั้งในสามวัน" / "Send the parent information, and message again in three days". |
| 5 | N11 9 | Fern asks "Is it per hour?"; the answer does not say "not per hour". RR1 Correct model 75 (TH). | Tested: start beat 9 with "ไม่ใช่รายชั่วโมงค่ะ" / "Not per hour." |
| 6 | N11 11 | RR1 needs at least 2 of the rules (own students, verification, 3% withholding tax, monthly settlement). RR1 Rules 40 (EN). | Tested: "… ก่อนหักภาษี ณ ที่จ่ายสามเปอร์เซ็นต์ นี่เป็นตัวอย่างจากสูตรค่ะ บริษัทจ่ายเดือนละครั้ง และเรทของเราดูได้ในแอปทุกเดือนค่ะ" / "… before the 3 percent withholding tax. That is an example from the formula. The company pays once a month, and your rate is in the app every month." |
| 7 | N11 14 | RR2 needs the offer to show the formula, the differential, and the earnings screen. RR2 Transparency 0. | Tested: add "ถ้าน้องเฟิร์นสนใจ เดี๋ยวพี่เปิดสูตร ส่วนต่าง และหน้าจอรายได้ในแอปให้ดูเลยค่ะ" / "If you like, I can show you the formula, the differential, and my earnings screen in the app." |
| 8 | N11 16 | RR3 needs a worked differential example, labeled. RR3 Worked example 0. | Tested: the Tutor A and Tutor B example of the RR3 lesson, labeled once: "… เราได้เรทของเราคูณยอดกลุ่มทั้งหมด แล้วลบเงินที่เพื่อนได้รับ เช่น เรามีนักเรียนของตัวเองสี่คน ยอดหนึ่งหมื่นสองพันบาท เพื่อนมีนักเรียนหกคน ยอดหนึ่งหมื่นแปดพันบาท ยอดกลุ่มของเราคือสามหมื่นบาท เรทห้าสิบห้าจุดหกเปอร์เซ็นต์ ได้หนึ่งหมื่นหกพันหกร้อยแปดสิบสองบาท ลบที่เพื่อนได้แปดพันแปดร้อยยี่สิบบาท เหลือเจ็ดพันแปดร้อยหกสิบสองบาท นี่เป็นตัวอย่างจากสูตรค่ะ …" / "… You get your rate on the whole group volume, minus what your friend receives. For example, you have four students of your own, 12,000 baht, and your friend has six students, 18,000 baht. Your group volume is 30,000 baht at 55.6 percent: 16,682 baht, minus your friend's 8,820 baht, so 7,862 baht. That is an example from the formula. …" Each example (beat 11, beat 16) has its own one label. |
| 9 | N11 19 | With finding 8, the video has two examples. The summary says "give one example, labeled one time" ("ยกตัวอย่างหนึ่งครั้ง และบอกครั้งเดียวว่าเป็นตัวอย่าง"). Beat 7 stays: part two has one example. | "… เปิดสูตรให้ดู ยกตัวอย่าง และบอกครั้งเดียวว่าเป็นตัวอย่าง …" / "… Show the formula, give an example, and label it one time. …" |
| 10 | N11 9, 11, 14, 16 | The on-screen bubbles with digits (beat 9 and beat 11 in the on-screen Thai list) show the old lines. | Each bubble follows its new voice line. Beat 16 gets a digits bubble: "เรามีนักเรียนของตัวเอง 4 คน ยอด 12,000 บาท เพื่อนมีนักเรียน 6 คน ยอด 18,000 บาท ยอดกลุ่ม 30,000 บาท เรท 55.6% ได้ 16,682 บาท ลบที่เพื่อนได้ 8,820 บาท เหลือ 7,862 บาท นี่เป็นตัวอย่างจากสูตรค่ะ". |

No finding: N8 book and level (Primary Advantage Origins 2, Pre-A1), 14 lessons, Reedy practice
after each completed lesson, the trial with a day and a time, no hours; N11 the work (recruitment kit
§1), what the company provides (M6.1), the rate scale, the pyramid answer, the steps to start
(M6.1 "How a new tutor starts"), no "I am not a teacher".

### Re-score after the fixes (advantage-pr `36572ca`, 2026-10-16)

New beat numbers: N8 R1 = beats 4, 6, 8, 10, 11; N11 RR1 = 9, 11; RR2 = 14; RR3 = 16 and 18 (Fern's
"Can you give me an example?" between them).

| Clip | Roleplay | Score | Criteria |
|---|---|---|---|
| N8 TH | R1 | 100 pass | 100, 100, 100, 100 |
| N8 EN | R1 | 96 pass | 100, 85, 100, 100 |
| N11 TH / EN | RR1 | 100 / 100 pass | all 100 |
| N11 TH / EN | RR2 | 100 / 100 pass | all 100 |
| N11 TH / EN | RR3 | 100 / 100 pass | all 100 |

PR did not apply two rows, and both reasons are correct: row 2 (pair conversation is one of the 18
lesson phases; M6.1 already says so: "flashcards, two games, pair conversation, and a wrap-up"),
row 3 ("For this class, it is 3,000 baht": the tutor's own price, no hours).

## N9 `parent-questions-next-book` (advantage-pr `36572ca`)

R3 = beats 4 and 5; R4 = beats 12 and 14; beat 9 (progress) has no rubric.

| Clip | Roleplay | As made | Criteria | With the fix | Criteria with the fix |
|---|---|---|---|---|---|
| N9 TH | R3 | 70 **fail** | 100, 80, 0, 55, 100 | 99 pass | 100, 95, 100, 100, 100 |
| N9 EN | R3 | 66 **fail** | 100, 70, 0, 50, 100 | 100 pass | all 100 |
| N9 TH | R4 | 20 **fail** | 0, 100, 0, 0, **0** | 100 pass (R4 test case) | all 100 |
| N9 EN | R4 | 40 **fail** | 0, 100, 0, 0, 100 | 100 pass (R4 test case) | all 100 |

| # | Beat | Finding | Fix |
|---|---|---|---|
| 1 | 3–5 | R3 is a secondary student: "Right book: names Reading Advantage Origins 2". N9 part one is Mew (Grade 3), so Right book is 0. Beat 5 asks for a class time; R3 "Choice" asks for a trial or information, with no pressure (50–55). | Tested: the child is a Grade 7 student. TH: "ดีเลยค่ะ คลาสของครูต่างออกไปนิดหนึ่ง เราเรียนตามหนังสือที่จัดลำดับบทไว้แล้ว เน้นการอ่าน คำศัพท์ และการพูดในกลุ่มเล็ก น้อง ม.1 เริ่มที่หนังสือ Reading Advantage Origins 2 ค่ะ น้องเรียนควบคู่กับคลาสวันอาทิตย์ได้ ถ้าคุณแม่สนใจ ครูขอทดลองอ่านกับน้องสักสิบนาทีนะคะ หรือจะให้ครูส่งข้อมูลทาง LINE ไปก่อนก็ได้ค่ะ คุณแม่สะดวกแบบไหนคะ" EN: "That's good. My class is a little different. We follow a book with a fixed order of lessons, and we focus on reading, vocabulary, and speaking in a small group. A Grade 7 student starts with Reading Advantage Origins 2. He can do it together with his Sunday class. If you like, I can do a ten-minute reading trial with him, or I can send you the information on LINE first. Which do you prefer?" |
| 2 | 12–14 | R4 is the case where the next book is not printed: name it, no date, a LINE message when it is ready, praise, keep the place. N9 part three is the printed case (Origins 2 → Origins 3.1, the M5.4 model line): correct for its own story, but in the R4 situation, "I can start a new group right after this one" offers a book that is not on sale (Thai claims 0). | See row 3. |
| 3 | R4 itself | The R4 case (Primary Advantage Origins 3.1 → 3.2, "not on sale yet") stops being true at about 2026-11-08. After that date, the Primary Advantage path has no next book that is not printed and that a seller may name (claims item 4: no level above book level 4). | Tested with a test copy of the rows (`rows-v4-r4.json`): R4 becomes Reading Advantage Origins 2 → Reading Advantage Origins 3.1, not printed (Q-WB-11; M5.4 table). TH: "คุณแม่คะ น้องต้นเรียนเล่มนี้ใกล้จบแล้วค่ะ น้องทำเกมคำศัพท์ได้ดีมากเลย เล่มต่อไปคือ Reading Advantage Origins 3.1 ต่อจากบทที่น้องเรียนมา ตอนนี้เล่มนี้ยังไม่พร้อมค่ะ พอหนังสือพร้อม ครูจะส่งข้อความทาง LINE บอกคุณแม่นะคะ ครูขอจองที่ในกลุ่มต่อไปให้น้องต้นไว้เลยไหมคะ" EN: "Ton is near the end of this book, and he did very well in the vocabulary games. The next book is Reading Advantage Origins 3.1. It continues from the lessons he has done. It is not ready yet. When it is ready, I'll send you a LINE message. Shall I keep his place in the next group?" The seed and the PR playbook (`#r4-which-book-next`) change together. The line is a fact that expires when Reading Advantage Origins 3.1 is printed. |

### N9 after the fix (advantage-pr `b3b9cae`, PR playbook v1.2)

The story is Ton (Grade 7) and his mother. R4 in the seed and in the playbook now uses Reading
Advantage Origins 2 → Reading Advantage Origins 3.1 (not printed, Q-WB-11). Scored on the rows of the
changed seed:

| Clip | Roleplay | Score | Criteria |
|---|---|---|---|
| N9 TH (beats 4, 5) | R3 | 99 pass | 100, 95, 100, 100, 100 |
| N9 EN (beats 4, 5) | R3 | 96 pass | 100, 85, 100, 100, 100 |
| N9 TH (beats 12, 14) | R4 | 100 pass | all 100 |
| N9 EN (beats 12, 14) | R4 | 100 pass | all 100 |

## N15 `total-cost-of-english` (advantage-pr `c597282`, script before the build)

Model conversation for M7.4 and "Roleplay: The Price-Conversation Close". Seller beats 4, 6, 8, 9,
13, 15, 17, 19 (Khun Ploy); the director (Director Wanida) gives her own numbers in beat 5.

| Clip | Roleplay | Score | Criteria |
|---|---|---|---|
| N15 TH | Price-Conversation Close | 100 pass | all 100 |
| N15 EN | Price-Conversation Close | 100 pass | all 100 |

No finding: 150,000 + 450,000 = 600,000 (the director's numbers); 350 × ~1,500 = ~525,000, labeled a
rough figure; no saving stated; the Blended Learning contents of the S7 tier table; the discount
answer of the roleplay text; no response time (school claims item 7); next steps = grade, semester,
pilot agreement "when Daniel confirms the pilot terms" (Q-SV-05), implementation contact, training.
My change: the roleplay success standard "with the standard price" becomes "with no price
concession", because Q-SV-05 (a paid or a free pilot) is open. In the next seed update.

N9 at `c597282`: the beat 9 Reedy screen is now a text card. The voice did not change.

## N5 `the-words-we-use` (advantage-pr `2dd9e42`)

Script: `scripts.md` section `the-words-we-use`, data `WORDS` in `make.py`. Lesson: M4.2 "The Words We
Use" and the claims criterion (`claimsCriterion`, `CHANNEL_CLAIMS` in `static-seed.ts`). An explainer
for trainers, so there is no scorer check.

| # | Beat | Finding | Fix |
|---|---|---|---|
| 1 | 3 | "The books we sell today go up to A2" / "หนังสือที่เราขายตอนนี้ไปถึงระดับ A2". No A2 book is printed today: the printed books are Pre-A1 and A1 (book-level table; Reading Advantage Quest 4 (A2) is not printed; S7 phased plan: "further levels up to A2 as their books are printed"). Claims item 4 fails a book that is not printed. | The approved line (S7, PR deck slide 6): "The active program covers Pre-A1 to A2. Name the CEFR level of the printed book that you offer." / "โปรแกรมของเราครอบคลุมระดับ Pre-A1 ถึง A2 ให้บอกระดับ CEFR ของหนังสือฉบับพิมพ์ที่เราเสนอค่ะ" |
| 2 | 7 | "Results … the book level, the lessons completed, and the progress in the app" is the answer for a parent. For a school, M4.2 gives the per-school report ("We measure and report outcomes per school …"; guarantee step 3: "per-school reports for a school, or progress in the child's app for a parent"). | "For a parent: the book level, the lessons completed, and the progress in the child's app. For a school: the per-school report." / "กับผู้ปกครอง คือระดับหนังสือ บทที่เรียนจบแล้ว และความคืบหน้าในแอปของน้อง กับโรงเรียน คือรายงานผลของแต่ละโรงเรียน" |
| 3 | 10 | The list item 7 "Commission talk with a parent" is the family form only. In a school sale, item 7 is "a discount, a free period, or a response time" (`CHANNEL_CLAIMS.school`). A trainer listens for it in the school roleplays. | Item 7: "Commission talk with a parent; with a school, a discount, a free period, or a response time" / "การพูดเรื่องค่าคอมมิชชันกับผู้ปกครอง หรือส่วนลด ช่วงฟรี หรือการสัญญาเวลาตอบกลับกับโรงเรียน" |
| 4 | 8 | The seed has no Thai form of the Managed Service line. PR's Thai "จะเปิดในปี 2570 ถ้ามีโรงเรียนลงนามเพิ่มอีก 1–2 แห่ง" has no word for "only" ("It launches in 2027 only if 1–2 more schools sign"), so it can sound like a date. | "Managed Service: ยังไม่เปิดขายตอนนี้ จะเปิดในปี 2570 ก็ต่อเมื่อมีโรงเรียนลงนามเพิ่มอีก 1–2 แห่ง"; voice "… จะเปิดในปีสองพันห้าร้อยเจ็ดสิบ ก็ต่อเมื่อมีโรงเรียนลงนามเพิ่มอีกหนึ่งหรือสองแห่งค่ะ". For Daniel's Thai check. |

No finding: the book names (beat 2; Origins 2 is Pre-A1 in Primary Advantage and A1 in Reading
Advantage), what a family buys and Read Along with Reedy in development (beat 4), Blended Learning
and App-Only (beat 5), the prices (beat 6), the Thai Aka (2019) short form (the same words as the seed answer to
"เรียนภาษาอังกฤษที่โรงเรียนก็พอแล้ว"), the commission beat (9), and the fail list once at the end. List item 5 "a level
framework other than CEFR" in place of the three names: accepted (PR: the video goes on YouTube).

## N6 and N10: screens and crops (from `screenshot-lesson-list.md` v2)

**Status (PR, 2026-10-16):** N6 and N10 wait for Q-SE-13. Most of these screens show the development class names ("Reading Advantage Level 1 - A1", "คลาส Reading Advantage 1 / 2"), and a crop leaves little of the screen. PR makes both videos from a new screenshot set when the strings are fixed, or when Daniel says to go ahead with crops.

Base: advantage-pr `assets/screenshots/tutor-advantage/dev-2026-10-15/`. A crop keeps the source
pixel rows named (row 0 = top). Captions name what the screen shows, in the positive.

**N6 The Tutor Advantage app for a family** (student-mobile, in this order):

| Screen | Crop | Caption |
|---|---|---|
| `02-login.png` | — | The parent signs in to the LINE student app |
| `03-consent-gate.png` | — | The consent screen before the app opens |
| `04-dashboard.png` | — | The student app home screen with a class package |
| `12-schedule.png` | — | The class schedule |
| `18-lesson-lobby.png` | — | The lesson lobby before a live class |
| `22-live-p02-flashcards.png` | — | Flashcards in a live lesson |
| `24-live-p03-read-article.png` | — | The lesson article in the app: the digital twin of the printed book |
| `17-voice-practice.png` | rows 0–1211 | Reedy voice practice on a completed lesson |

Do not use: `51-progress` (all values zero), `05`–`09` and `11` (they show ฿2,500), `01-landing`
(stats strip and hero line), `31-live-p08-ai-feedback`, `58-study`. For `17`, the caption names the
live feature (Reedy voice practice); it does not need a "not available" line.

**N10 A week as a Tutor Advantage tutor** (tutor-mobile, in this order):

| Screen | Crop | Caption |
|---|---|---|
| `02-dashboard.png` | — | The tutor app dashboard |
| `09-schedule-week.png` | — | The tutor's week |
| `19-lesson-rehearsal.png` | rows 0–1470 | The tutor rehearses a lesson before the class |
| `22-live-p01-launch.png` | rows 0–1450 | The tutor starts a live lesson: phase 1 of 18 |

Optional for the pay part: `11-earnings.png` (42.50% at ฿5,000 GV, 3% withholding tax; the same
example as the commission lesson) and `12-network.png` (development build, test data). Do not use:
`16-lesson-hub` ("สอนแล้ว 5 จาก 20 บท", "19 ขั้นตอน (4 คาบ)"), the class screens `03`–`06`.
