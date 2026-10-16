# Video checks (script and scorer)

For each new video of `video-list-for-pr.md`: a script check against the lesson text, and a scorer
check of the seller lines on the roleplay rubric. A model answer in a video must pass its own
roleplay (PR, 2026-10-16).

**Scorer check method:** the seller lines of the named beats, synthesized with the house voice
(Thai `Thai_Optimistic_girl`, English `English_Graceful_Lady`), scored by `google/gemini-3.8-flash`
with low reasoning, with the production prompt and the rubric rows of the current seed.

**Thai check (Daniel, 2026-10-16):** N4, N5, N9, N14, and N15: "Videos checked and cleared."

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

## N14 `school-objections` (advantage-pr `5e551bd`, script before the build)

Explainer for M7.3: the director says each objection (beat 2n), Khun Ploy answers (beat 2n+1). No
roleplay tests one objection alone. Claims check: the 8 answers together (beats 3–17) on "Roleplay:
The 30-Minute Demo".

| Clip | Big 4 | Aka + size | Objections | Pilot | Claims |
|---|---|---|---|---|---|
| N14 TH | 25 | 45 | 90 | 95 | 100 |
| N14 EN | 20 | 50 | 95 | 100 | 100 |

The low criteria are demo steps that the video does not have (naming the Big 4, the company size).
The answers pass the claims criterion and the objection criterion.

| # | Beat | Finding | Fix |
|---|---|---|---|
| 1 | 3 | The Thai answer has "และแอปมีเสียงอ่านบทความ"; the English answer does not. | EN: "… and the teacher follows them, and the app reads each article aloud. …" (M7.3 objection 3: "audio for every article"). |
| 2 | 5 | EN "and we fix it with you" is stronger than the Thai "วางแผนแก้ไขร่วมกับโรงเรียน" (plan the fix with the school), and stronger than M7.3 ("the app data and the observations show it"). | EN: "… the data shows it, and we plan the fix with you." |
| 3 | 9 | PR's question: the start and end reading checks. M4.2 and M7.3 include them ("benchmark deltas"); M7.5 adds "if the school agreed them at the start". Also, a start and end check is not "every quarter". | EN: "For your school, we report how much each student reads and the Big 4 scores every quarter, and the reading checks at the start and the end that we agree with you." TH: "สำหรับโรงเรียน เรารายงานทุกไตรมาสว่านักเรียนแต่ละคนอ่านมากแค่ไหน และคะแนน Big 4 รวมถึงผลการวัดการอ่านตอนเริ่มและตอนจบที่ตกลงกับโรงเรียนไว้ค่ะ" |
| 4 | 11 | "You can pilot one grade next to your foreign-teacher program" has no length; M7.3: "one grade level for one semester as a pilot". | EN: "You can pilot one grade for one semester, next to your foreign-teacher program." TH: "โรงเรียนนำร่องหนึ่งระดับชั้น หนึ่งภาคเรียน ควบคู่กับโปรแกรมครูต่างชาติได้ค่ะ" |

No finding: objection 3 (the total cost, the Blended Learning contents), objection 4 (the Aka short
form only), objection 6 (no MOE comment), objection 7 (both prices, no discount, the pilot, "I'll
ask Daniel about the pilot terms"), objection 8 (no date; the first sentence says what schools get).

**My seed changes (Q-SV-05 open: a paid or a free pilot):** the 30-minute demo criterion "Proposes
the pilot (one grade level, one semester) at the standard prices" says "with no free period and no
discount", the same as its success standard. In the next seed update, with the price-close change.

## N4 `objection-pattern` (advantage-pr `9c1743c`, script before the build)

Model conversation for M3.1–M3.3, on `Objection Roleplay: "We Tried Something Like This and It Failed"`.
Part 1 (Phum's mother, scenario 1): seller beats 4, 5, 7, 9. Part 2 (Director Pranom, scenario 2):
seller beats 13, 14, 16, 18. No price part (Q-SE-14), no feel-felt-found.

| Clip | Scenario | Score | Criteria |
|---|---|---|---|
| N4 TH part 1 | 1 (parent) | 99 pass | 100, 100, 95, 100, 100 |
| N4 EN part 1 | 1 (parent) | 99 pass | 100, 100, 95, 100, 100 |
| N4 TH part 2 | 2 (director) | 95 pass | 95, 95, 90, 95, 100 |
| N4 EN part 2 | 2 (director) | 100 pass | all 100 |
| N4 TH part 2, beat 18 in the M7.2 wording | 2 | 95 pass | 95, 95, 90, 95, 100 |
| N4 EN part 2, beat 18 in the M7.2 wording | 2 | 99 pass | 100, 100, 95, 100, 100 |

PR's two questions: (a) "so they do no lesson planning" is the M7.2 key fact ("Scripted lessons: no
lesson planning for your teachers"): no change. (b) A teacher try-out lesson is not in M7.2. The
approved next step is "45 minutes next week with your academic team … bring printed workbooks", and
the 45-minute demo shows the 13 printed steps of a lesson. Recommended beat 18 end, as scored: EN "Can
we have 45 minutes next week with you and your English teachers? I'll bring the printed workbooks and
go through one lesson with them, step by step." TH "สัปดาห์หน้า ขอเวลาสี่สิบห้านาทีกับท่านผู้อำนวยการและครูภาษาอังกฤษได้ไหมคะ ดิฉันจะนำหนังสือฉบับพิมพ์มา แล้วดูบทเรียนหนึ่งบทกับครูทีละขั้นตอนค่ะ"

No other finding: the opening lines are the seed situations word for word; beat 9 uses only the
allowed parent facts; beat 18 uses the director's own words ("one more thing to do").

N14 and N15 built at advantage-pr `dde4472` (N15 = the scored script; N14 with the 4 fixes).
N4 built at advantage-pr `7b8265b` (TH 3:18, EN 3:53) with the beat 18 wording above, word for word.

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

**Decision (Daniel, 2026-10-16):** "You should tell PB [PR] to blur them, maybe." PR blurs the
development class names; N6 and N10 can start. The "Do not use" lists below stay.

**Status before the decision (PR, 2026-10-16):** N6 and N10 wait for Q-SE-13. Most of these screens show the development class names ("Reading Advantage Level 1 - A1", "คลาส Reading Advantage 1 / 2"), and a crop leaves little of the screen. PR makes both videos from a new screenshot set when the strings are fixed, or when Daniel says to go ahead with crops.

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

## N9 part 2: the price (R2), script not committed (PR message, 2026-10-16)

Seller beats 9, 10, 11 of `parent-questions-next-book`. Ton's mother, after the trial, hears an
offer of Reading Advantage Origins 2 (R2 has a father and Primary Advantage Origins 2; R2 has no
book criterion, so one family for the whole video is accepted). Rows: seed at `e2f2aa36b`
(about 22–23 hours, about 135 baht per hour, 130–136 passes).

| Clip | Roleplay | As written | Criteria | With the fix | Criteria with the fix |
|---|---|---|---|---|---|
| N9 price TH | R2 | 100 pass | 100, 100, 100, 100, 100 | 100 pass | 100, 100, 100, 100, 100 |
| N9 price EN | R2 | 100 pass | 100, 100, 100, 100, 100 | 100 pass | 100, 100, 100, 100, 100 |

| # | Beat | Finding | Fix |
|---|---|---|---|
| 1 | 10 | "speaking practice with Reedy" / "ฝึกพูดกับ Reedy" has no "after each completed lesson". The approved line (lessons M5.3, N5) gives Reedy practice after each completed lesson. | "… and speaking practice with Reedy after each completed lesson." / "… และฝึกพูดกับ Reedy หลังเรียนจบแต่ละบทค่ะ" |

No finding: the acknowledgement (beat 9), the hours and the per-hour figure (beat 10; Thai
"ชั่วโมงละ 135 บาท" is the spoken form of the lesson's "135 บาทต่อชั่วโมง"), no discount and no
competitor in answer to "Other places are cheaper", the start question with the LINE offer (beat 11),
and the start book (Reading Advantage Origins 2 for a Grade 7 student, Daniel's rule of 2026-10-16).
For Daniel's Thai check: beats 7–12 and the summary line (beat 22).

## N7 `placement-trial` (script in the PR working tree, not committed; 2026-10-16)

Explainer, one voice, no app screen; source `line-trial-facilitator-script.md` v1.6 (`a3c4df0`).
Lesson: M5.2 at `e2f2aa36b`. No roleplay scores the trial itself, so this is a script check only. The
result line (beat 10) is the same as the M5.3 close line, with Primary Advantage Origins 2 and Pre-A1.

| # | Beat | Finding | Fix |
|---|---|---|---|
| 1 | 1, 2, title, on-screen | The Thai name of the trial is "ทดลองจัดระดับ". The lessons use "ทดลองอ่าน" (6 times, 0 times "ทดลองจัดระดับ"), and so do the setup line in beat 4, N8, and N9. Two words for one thing; "จัดระดับ" can also sound like a test to a parent. | "ทดลองอ่าน" in every beat and frame (for example the title "ทดลองอ่าน: หาหนังสือเล่มแรก"). For Daniel's Thai check. |
| 2 | 9 (map frame) | Primary Advantage Origins 3.2 and Quest 4 show "Not printed yet". The sources say "on sale from about 2026-11-08" (scope §4, M5.2); they do not say that the books are not printed. | "Not on sale yet" / "ยังไม่วางขาย" for those two cells. The rule "offer the nearest printed book below" does not change. |

No finding: the program by school grade (beat 2) and the covers with Pre-A1 and A1; Daniel's start
rule (beat 3); setup 2 minutes and the setup line in full (beat 4); steps 2–5 (beats 5–8) the same
as M5.2; the notes on confidence, reading speed, and engagement (beat 6); up to book level 4 and the
nearest printed book below (beat 9); "the parent hears the book, not a score" (beat 10); the link to
N8 (beat 11). The "lowest printed book" fallback is not in the video: accepted, because beat 3 covers
its only case (book level 1). Fact that expires: "Reading Advantage has no higher printed book yet"
(beat 7) changes when Reading Advantage Origins 3.1 is printed (Q-WB-11), with R4 and N9.

## N6 `app-for-a-family` and N10 `a-week-as-a-tutor` (scripts in the PR working tree; 2026-10-16)

App tours, one voice. Screens from `source/decks/prep.py` (`TOUR`): the development class names and
the test user names are blurred (Q-SE-13, Daniel 2026-10-16); crops as in the list above; footer
"Screens: development build, test data". Lessons: M4.1, M5.1, M6.1 at `e2f2aa36b`. No model answer
to a roleplay, so this is a script check only. I compared each beat with the screen it names
(`student-mobile/02`, `04`, `24`).

| # | Video, beat | Finding | Fix |
|---|---|---|---|
| 1 | N6, 7 | English "In step two of eighteen". The lessons (M6.1) and N10 say "18 phases built on the 13 printed workbook steps": "step" names a printed step. | "In phase two of eighteen". Thai: the app screen says "ขั้นที่ 3/18" for a phase, and N10 says "สิบแปดช่วง … สิบสามขั้นตอน". For Daniel's Thai check: one Thai word for the 18 phases. |

No finding, N6: sign-in with LINE and the under-18 consent line (the same as the login screen); the
policy and terms (03); the home screen (04); the schedule; the lobby; "the tutor leads every lesson,
and the lesson follows the printed book" (7); "tap a sentence" (8; the screen says
"แตะประโยคที่อยากให้คุณครูช่วยออกเสียง"); the Reedy line in the approved form (9). No Read Along line:
accepted, because N6 shows only live features.

No finding, N10: beats 2, 4, 5, 6, 7, and 8 are the same as M6.1 (what a tutor does, the example week,
prepare and rehearse, 18 phases on 13 printed steps, ready and not ready, the 6 start steps with
Phikul and Daniel); the Thai uses "ทดลองอ่าน". Beat 3: the screen shows ฿2,125 and 42.5% (test data, the
same 5,000 baht GV example as the commission lesson; the voice does not read them; rule 7).

PR questions: (1) the tag "Non-fiction · CEFR A2" on tutor screens 19 and 22 stays unblurred: A2 is
inside the active scope, and the voice does not read it. (2) The decks and the infographics change
"ทดลองจัดระดับ" to "ทดลองอ่าน" (not uploaded yet). The YouTube video `family-sale-flow` (V2) says
"ทดลองจัดระดับ"; it stays unless Daniel says otherwise.

**Built (PR, 2026-10-16):** N7 and N9 at advantage-pr `17519be` (my fixes in); N6 and N10 at `9732ada`
(N6 "In phase two of eighteen", frame "Phase 2 of 18"). The Thai trial term is "ทดลองอ่าน" in every
file except `family-sale-flow` (V2, on YouTube): Thai N8 and N11, the Thai recruitment and trainer
decks, and the Thai family sale steps infographic were made again. Only the trial term changed in N8
and N11 (it is now the lessons' own word), so I did not score them again. Media README v0.17 lists all
files. Not uploaded yet: N4, N5, N6, N7, N8, N9, N10, N11, N14, N15, and V1 (catalogue). PR sends all
links in one message after Daniel uploads them.
