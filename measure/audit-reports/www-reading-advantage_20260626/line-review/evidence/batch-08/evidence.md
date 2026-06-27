# Batch-08 Evidence: Feature/Service/Product Locales

> Track: `www_reading_advantage_review_20260626`
> Reviewed: 2026-06-27
> Files: 9 | Lines: 2,169 (actual; batch-manifest estimated 1,430)

---

## Coverage

| File | Reviewed ranges | Status | Finding count |
|---|---|---|---:|
| src/locales/pages/feature.ts | 1-149 | reviewed | 1 |
| src/locales/pages/pricing.ts | 1-89 | reviewed | 0 |
| src/locales/pages/services.ts | 1-248 | reviewed | 3 |
| src/locales/pages/blended-learning.ts | 1-242 | reviewed | 0 |
| src/locales/pages/managed-service.ts | 1-194 | reviewed | 3 |
| src/locales/pages/case-studies.ts | 1-362 | reviewed | 1 |
| src/locales/pages/mastery-advantage.ts | 1-218 | reviewed | 0 |
| src/locales/pages/products/overview.ts | 1-89 | reviewed | 0 |
| src/locales/pages/products/reading-advantage.ts | 1-578 | reviewed | 4 |

---

## Findings

### LR-B08-001 — "Nine products" claim repeated in product/service locales

- **Severity**: High
- **Category**: Claims
- **File**: `src/locales/pages/products/reading-advantage.ts:63`, `src/locales/pages/mastery-advantage.ts:62`, `mastery-advantage.ts:134`, `mastery-advantage.ts:207`
- **Evidence**: `"One engine, nine products."` / `"เครื่องยนต์เดียว เก้าผลิตภัณฑ์"` / `"一个引擎，九个产品"` across reading-advantage.ts and mastery-advantage.ts. Only 4 product app directories exist on disk (reading-advantage, primary-advantage, science-advantage, codecamp-advantage). Math, STEM, Storytime, Tutor, Zhongwen have no app directories.
- **Cross-reference**: Same finding as LR-B07-001 (home.ts). This pattern is systemic across all locales.
- **Impact**: See LR-B07-001. Systemic overstatement across all marketing content.
- **Recommendation**: Audit all locale files for "nine products" / "9 products" / "เก้าผลิตภัณฑ์" / "九个产品" references and update to reflect actual product count.

### LR-B08-002 — Blended Learning "Starting May 2026" — now past due

- **Severity**: High
- **Category**: Claims/Dateline
- **File**: `src/locales/pages/products/reading-advantage.ts:5-6`, `services.ts:12`, `blended-learning.ts:6`
- **Evidence**: Reading-advantage.ts line 5: `"Starting May 2026, Reading Advantage will also offer a comprehensive Blended Learning model"`. Services.ts line 12: `status: "Launching May 2026"`. Blended-learning.ts line 6: `badge: "LAUNCHING MAY 2026"`. Current date is June 2026. May 2026 is past.
- **Impact**: Outdated messaging harms credibility. Visitors in June 2026 seeing "Launching May 2026" will know the content is stale.
- **Recommendation**: Update to "Now Available" or "Launched May 2026" with appropriate messaging about current availability status. Change badge from "LAUNCHING MAY 2026" / "COMING SOON" to reflect go-live status.

### LR-B08-003 — "NEW IN MAY 2026" badge now outdated

- **Severity**: Medium
- **Category**: Claims/Dateline
- **File**: `src/locales/pages/products/reading-advantage.ts:9`
- **Evidence**: `newBadge: "NEW IN MAY 2026"` and in Thai `newBadge: "มาใหม่ เดือนพฤษภาคม 2026"` and Chinese `newBadge: "2026年5月全新推出"`. Current date is June 2026.
- **Impact**: "NEW" badge referencing a past month indicates stale content.
- **Recommendation**: Update badge to reflect current status or remove date-specific "NEW" labeling. If the feature is live, use "NOW AVAILABLE".

### LR-B08-004 — Thai translation typos in services.ts

- **Severity**: Medium
- **Category**: i18n/Translation Quality
- **File**: `src/locales/pages/services.ts:88`, `services.ts:114`, `services.ts:116`, `services.ts:119`
- **Evidence**:
  - Line 88: `"ยืดหยบ่ท์"` — should be `"ยืดหยุ่น"` (flexible). Contains garbled characters "หยบ่ท์" instead of "หยุ่น".
  - Lines 114, 116: `"แผนกวาน"` — should be `"แผนก"` (department). Has extra "วาน".
  - Line 119: `"วัสดุปครบถ้วน"` — should be `"วัสดุครบถ้วน"` (materials complete). Has extra "ป".
- **Impact**: Thai-speaking visitors encounter spelling errors that undermine professionalism. These are likely AI-generated translations not manually proofread.
- **Recommendation**: Review and correct Thai translations for services.ts. Consider adding Thai native-speaker proofreading to the translation pipeline.

### LR-B08-005 — Thai translation typos in managed-service.ts

- **Severity**: Medium
- **Category**: i18n/Translation Quality
- **File**: `src/locales/pages/managed-service.ts:106-109`
- **Evidence**:
  - Line 106: `"แดชบอร์ดีตาลละเอียด"` — should be `"แดชบอร์ดที่ละเอียด"` (detailed dashboard). "ดีตาล" should be "ดที่".
  - Line 107: `"อย่างสม่ำเสมออย่างสม่ำเสมอ"` — duplicated phrase "regularly regularly".
  - Line 109: `"ผู้ปกคุม/นักเรียน"` — should be `"ผู้ปกครอง"` (parent/guardian). "ปกคุม" should be "ปกครอง".
- **Impact**: Same as LR-B08-004. Multiple typos in close proximity suggest bulk AI translation without review.
- **Recommendation**: Proofread Thai managed-service.ts translations. Check all Thai locale files for similar errors.

### LR-B08-006 — Multi-language support claim mentions Vietnamese specifically

- **Severity**: Medium
- **Category**: Claims
- **File**: `src/locales/pages/products/reading-advantage.ts:59`, `reading-advantage.ts:252`, `reading-advantage.ts:445`
- **Evidence**: `"Switch between English, Thai, Chinese, Vietnamese, and more languages seamlessly"` and Thai equivalent `"สลับระหว่างภาษาอังกฤษ ไทย จีน เวียดนาม และภาษาอื่นๆ"`. This specifically names Vietnamese (`เวียดนาม`) as a supported language.
- **Impact**: If Vietnamese is not actually supported in the app, this is a specific false claim. Vietnamese was not listed in the supported locales (en, th, zh only).
- **Recommendation**: Verify actual app language support. If Vietnamese is not supported, remove the specific mention or qualify as "more languages coming soon".

### LR-B08-007 — Case studies all use placeholder data

- **Severity**: Medium
- **Category**: Claims/Content
- **File**: `src/locales/pages/case-studies.ts:23-92`, `case-studies.ts:142-212`, `case-studies.ts:263-333`
- **Evidence**: All three locales contain placeholder values: "School A (Coming Soon)" / "โรงเรียน A (เร็วๆ นี้)" / "学校 A（即将推出）", "+X points over Y months" / "+X คะแนนในช่วง Y เดือน" / "Y个月内提升X分", "X articles per student" / "X บทความต่อนักเรียน" / "X篇文章/学生", "Teacher Name" / "ชื่อครู" / "教师姓名". No actual data exists in any locale.
- **Impact**: Same as batch-01 finding on the page component. Localized placeholders confirm no real case study data exists.
- **Cross-reference**: Already flagged in batch-01 evidence. Locale review confirms the pattern extends to all three languages.
- **Recommendation**: Either populate with actual case study data or hide the page until real data is available.

### LR-B08-008 — Feature locale "Global Community" claim is aspirational

- **Severity**: Low
- **Category**: Claims
- **File**: `src/locales/pages/feature.ts:32-34`, `feature.ts:82-84`, `feature.ts:132-134`
- **Evidence**: Feature #6 describes "Global Community": `"Connect with learners worldwide, share experiences, and participate in collaborative learning opportunities."` This is the only feature that describes social/community functionality, which is not evident from the product pages or app code.
- **Impact**: Minor — community features are common marketing claims. But if no social/community feature exists, this could be misleading.
- **Recommendation**: Verify whether Reading Advantage has any community/social features. If not, replace with a genuine differentiator.

### LR-B08-009 — Games "NEW!" badge is time-ambiguous

- **Severity**: Low
- **Category**: Claims
- **File**: `src/locales/pages/products/reading-advantage.ts:132`, `reading-advantage.ts:324`, `reading-advantage.ts:517`
- **Evidence**: `newBadge: "NEW!"` in all three locales. No date context for when the games were added. "NEW!" without context becomes stale quickly.
- **Impact**: Minor — but contributes to the pattern of time-sensitive badges not being maintained.
- **Recommendation**: Either remove "NEW!" badge or tie it to a date-based system that automatically deprecates after a configurable period.

### LR-B08-010 — Managed Service "Zero implementation risk" absolute claim

- **Severity**: Medium
- **Category**: Claims/Legal
- **File**: `src/locales/pages/managed-service.ts:15-16`, `managed-service.ts:76-77`, `managed-service.ts:140-141`
- **Evidence**: `strong: "The only thing you need to manage:"` / `strongText: "Student enrollment and scheduling. We handle the rest."` and `badge: "ZERO RISK"` in English (line 11). Thai: `badge: "ความเสี่ยงเป็นศูนย์"` (line 76). Chinese: `badge: "零风险"` (line 140).
- **Impact**: "Zero risk" is an absolute claim that could be legally problematic if any implementation issue arises. Absolute risk elimination is generally not achievable in educational technology deployments.
- **Recommendation**: Replace "ZERO RISK" / "ความเสี่ยงเป็นศูนย์" / "零风险" with more measured language like "MINIMAL RISK" or "RISK-MITIGATED".

---

## No-Finding Notes

- `src/locales/pages/pricing.ts`: No actual pricing figures — only generic trust signals and CTA. Consistent across all 3 locales. Good practice for a lead-gen pricing page.
- `src/locales/pages/blended-learning.ts`: Launch dates (May 2026, Jan 2026 for samples) are past due same as LR-B08-002 but already captured there. Content and structure consistent across all 3 locales.
- `src/locales/pages/mastery-advantage.ts`: Deep technical description of KST/FSRS/edge-calibration/adaptive placement. Well-translated across all 3 locales. Claims are detailed and consistent. The "nine products" claim is already flagged in LR-B08-001.
- `src/locales/pages/products/overview.ts`: Grade band descriptions consistent across all 3 locales. No specific product claims beyond grade ranges.

---

## Summary

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 0 | — |
| High | 2 | Claims (nine products overstated, May 2026 dateline slip) |
| Medium | 6 | Translation typos (services, managed-service), Vietnamese claim, case study placeholders, "NEW" badge stale, "Zero risk" legal, multi-language detail |
| Low | 2 | Global Community claim, Games NEW badge timer |
