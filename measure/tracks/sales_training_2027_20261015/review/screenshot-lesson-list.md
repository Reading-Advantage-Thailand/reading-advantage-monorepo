# Screenshot → lesson list

**Status:** Checked by PR, 2026-10-15 (version 2). S11 uses it after the freeze.
**Screens:** advantage-pr `assets/screenshots/tutor-advantage/dev-2026-10-15/`, README v1.1 (pin `c211d1c`).
**Lessons:** commit `048090037` (lesson titles as in `apps/sales-advantage/scripts/static-seed.ts`).
**Rules:** spec.md S11 and the folder README v1.1 (rule 6 is new: do not use `student-mobile/51-progress`).

A lesson shows a screen as an image with English alt text. The S11 media key is
`training-media/v1/en/screens/<folder>-<file>`. A crop keeps the source pixel rows that are named
below (from the top, row 0). Do not zoom on a dev class name ("Reading Advantage Level 1 · A1",
"คลาส Reading Advantage 2"), and keep these names out of the alt text (rule 5).

## Core modules (1–3)

No screens. These lessons teach sales methods, not the product.

## S4 — Product Knowledge 2027

| Lesson | Section | Screen | Crop | Alt text |
|---|---|---|---|---|
| One Catalogue, Two Channels | Tutor Advantage: what the family buys | `student-mobile/04-dashboard.png` | — | The LINE student app home screen of a student with a class package |
| One Catalogue, Two Channels | Tutor Advantage: what the family buys | `student-mobile/18-lesson-lobby.png` | — | The lesson lobby before a live class |
| One Catalogue, Two Channels | Tutor Advantage: what the family buys | `student-mobile/24-live-p03-read-article.png` | — | A student reads the lesson article in the app: the digital twin of the printed book |
| One Catalogue, Two Channels | Tutor Advantage: what the family buys | `student-mobile/22-live-p02-flashcards.png` | — | Flashcards in a live lesson |
| One Catalogue, Two Channels | Tutor Advantage: what the family buys | `student-mobile/17-voice-practice.png` | rows 0–1211 (ends at the "ตรวจไมค์ก่อนเริ่ม" button) | Reedy voice practice on a completed lesson |

`17-voice-practice`: the full screen says "ระบบกำลังเตรียมเปิดให้บริการ" under the mic button (the dev build has no voice connection). Use it only cropped. The caption says that Read Along with Reedy is not available (rule 7 of the spec).

## S5 — Family Sale

| Lesson | Section | Screen | Crop | Alt text |
|---|---|---|---|---|
| What the Parent Buys and the Five-Step Family Sale | What the parent buys (Reedy line) | `student-mobile/17-voice-practice.png` | rows 0–1211 | Reedy voice practice on a completed lesson |
| What the Parent Buys and the Five-Step Family Sale | If the parent says yes, step 1 | `student-mobile/02-login.png` | — | The parent signs in to the LINE student app |
| What the Parent Buys and the Five-Step Family Sale | If the parent says yes, step 1 | `student-mobile/03-consent-gate.png` | — | The consent screen before the app opens |
| What the Parent Buys and the Five-Step Family Sale | If the parent says yes, step 2 | `student-mobile/10-payment-age-check.png` | — | The age check: a student under 18 needs the guardian's name and relationship |
| What the Parent Buys and the Five-Step Family Sale | If the parent says yes, step 4 | `student-mobile/12-schedule.png` | — | The class schedule in the student app |
| The Parent Conversation, the Close, and Objections | Objections: "Will my child get better test scores?" | `student-mobile/04-dashboard.png` | — | Class progress in the child's app |

The caption of the last screen uses no outcome word. Not used in S5:
- `51-progress` (README v1.1 rule 6: "เรียนแล้ว 0 จาก 20 บท", and every value is zero);
- the checkout and payment screens `05`–`09` and `11` (they show ฿2,500).

Step 3 ("the parent pays in the app") has text only. The placement lesson has no app screen (rule 8); it uses the infographic `placement-to-book-map-{th,en}`.

## S6 — Tutor Recruitment (tutor-mobile copies: tutors work on a phone)

| Lesson | Section | Screen | Crop | Alt text |
|---|---|---|---|---|
| What a Tutor Does, and What Is Ready | What a Tutor Advantage tutor does | `tutor-mobile/02-dashboard.png` | — | The tutor app dashboard |
| What a Tutor Does, and What Is Ready | What a Tutor Advantage tutor does (Teach) | `tutor-mobile/19-lesson-rehearsal.png` | the same content as the desktop crop (desktop rows 0–850); PR gives the mobile rows | The tutor rehearses a lesson in the tutor app before the class |
| What a Tutor Does, and What Is Ready | What a Tutor Advantage tutor does (Teach) | `tutor-mobile/22-live-p01-launch.png` | rows 0–1450 (above the DEV toolbar) | The tutor starts a live lesson: phase 1 of 18 |
| What a Tutor Does, and What Is Ready | A week as a tutor (example) | `tutor-mobile/09-schedule-week.png` | — | The tutor's week in the tutor app |
| The Commission Scale | How the rate works | `tutor-mobile/11-earnings.png` | — | The earnings screen: the rate, the group volume for the month, and the 3% withholding tax |
| The Commission Scale | The differential: when you bring in a tutor | `tutor-mobile/12-network.png` | — | The network screen in the tutor app (development build, test data) |

`02-dashboard` shows the rate and ฿2,125, like the earnings screen: recruitment lessons only (rule 7 of the README). `11-earnings` shows 42.50% at ฿5,000 GV, the same example as the lesson. Not used in S6:
- `16-lesson-hub`: "สอนแล้ว 5 จาก 20 บท" and "19 ขั้นตอน (4 คาบ)" conflict with 14 lessons and 18 phases;
- the class screens `03`–`06`:
  - `03`: a "ลบ (DEV)" button;
  - `04`: "ดูทั้งหมด (20 บท)", a mock LINE link, and a DEV box;
  - `05`: a free-class coupon field and "0 / 22 ชม.";
  - `06`: a network bonus that the commission lesson does not describe.

PR reports `05` and `06` to Daniel.

## S7 — School Sale

No Tutor Advantage screens (rule 9). The school lessons can use the Primary Advantage set `assets/screenshots/primary-advantage/rpg-skin-2026-10-06/` only after the Primary cutover, and only for features that are live in production on that day. Claude picks those screens after the cutover, and PR checks them.

## Revision history

- **v2** — 2026-10-15 — PR's check: crop `17-voice-practice`; `04-dashboard` replaces `51-progress`; `19-lesson-rehearsal` replaces `16-lesson-hub`; crop `22-live-p01-launch` above the DEV toolbar; S6 uses the tutor-mobile copies; class screens `03`–`06` not used.
- **v1** — 2026-10-15 — Draft (`421f152fa`).
