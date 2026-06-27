# Line Review Evidence: primary-advantage-083

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-083
Files assigned: 1
Lines assigned: 2659

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/messages/th.json | 1-2659 | reviewed | 4 |

## Findings

### LR-083-001 — Incorrect translation for "grammar" key

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/th.json:104`
- Evidence: Line 104 contains `"grammar": "กระบวนการของระบบ"` which translates to "system process" — this is semantically incorrect for the English key "grammar". The correct Thai translation should be "ไวยากรณ์". This appears to be a copy-paste error from line 42 where `"systemdashboard": "กระบวนการของระบบ"` uses the same string.
- Impact: Users will see "system process" instead of "grammar" in the LA question feedback modal, causing confusion in the language feedback UI.
- Recommendation: Fix the translation to `"ไวยากรณ์"`.

### LR-083-002 — Literal mistranslation of "heatmap"

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/messages/th.json:704`
- Evidence: Line 704 contains `"activityheatmap": "ความก้าวหน้ากิจกรรมที่ร้อน"`. The phrase "ที่ร้อน" literally means "that is hot" — a naive literal translation of "heatmap" that does not make sense in Thai. Should be something like "แผนภาพความถี่กิจกรรม" (activity frequency chart) or "กราฟความร้อนของกิจกรรม" (activity heat graph).
- Impact: Users will see a nonsensical label on the activity heatmap section of reports. Functional but confusing.
- Recommendation: Update to `"แผนภาพความถี่กิจกรรม"` or similar natural Thai term.

### LR-083-003 — Duplicate word in session complete message

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/th.json:1093`
- Evidence: Line 1093 contains `"studySessionComplete": "การเรียนรู้การเรียนรู้เสร็จสิ้น!"`. The word "การเรียนรู้" (learning) appears twice redundantly. Should be `"การฝึกฝนเสร็จสิ้น!"` (practice complete) or `"เซสชันการเรียนรู้เสร็จสิ้น!"` (learning session complete).
- Impact: Grammatically awkward Thai text displayed after completing a study session. Not blocking but unprofessional.
- Recommendation: Fix to `"เซสชันการเรียนรู้เสร็จสิ้น!"`.

### LR-083-004 — Garbled/truncated Thai text

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/th.json:1186`
- Evidence: Line 1186 contains `"perfectCorrectOrder": "ยอดเยี่ยม! การเรียงประโยคที่ถูกต้ออีกครั้ง!"`. The phrase "ถูกต้ออีกครั้ง" is not valid Thai — it appears to be a truncation or copy error. Should be `"ยอดเยี่ยม! การเรียงประโยคถูกต้อง!"` (Excellent! Sentence ordering correct!).
- Impact: Users will see garbled text when they correctly order sentences, degrading the experience.
- Recommendation: Fix to `"ยอดเยี่ยม! การเรียงประโยคถูกต้อง!"`.

## No-Finding Notes

The remaining 2655 lines of `apps/primary-advantage/messages/th.json` were reviewed line-by-line. The file is a well-structured JSON translation bundle covering all app features: navigation, admin, teacher, student, lesson, flashcard, assignment, settings, auth, and system sections. The JSON structure is syntactically valid. Interpolation placeholders (e.g., `{count}`, `{name}`, `{score}`) are consistently formatted. ICU message format selectors (e.g., `{locale, select, ...}`) appear correct. No other translation quality issues, missing keys, or structural anomalies were identified in the remaining content.

Coverage ranges: 1-2659 (full file).
