# Line Review Evidence: primary-advantage-084

Reviewer: coder-vocengine-ark-code-latest/primary-advantage-084
Files assigned: 1
Lines assigned: 2655

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/messages/tw.json | 1-2655 | reviewed | 2 |

## Findings

### LR-primary-advantage-084-001 — Simplified Chinese strings inside the Traditional Chinese (`tw`) message catalog

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/messages/tw.json:376`, `apps/primary-advantage/messages/tw.json:400`, `apps/primary-advantage/messages/tw.json:721-737`, `apps/primary-advantage/messages/tw.json:787`, `apps/primary-advantage/messages/tw.json:1076-1100`, `apps/primary-advantage/messages/tw.json:1455-1456`, `apps/primary-advantage/messages/tw.json:1506-1510`
- Evidence: This file is the Traditional Chinese (`tw`) locale, and the overwhelming majority of values use Traditional characters (e.g. `儀表板`, `學生`, `課程`). However, several blocks are written in Simplified Chinese and were never converted:
  - Line 376: `"empty": "沒有最近的活动要显示"` and line 377 `"viewAll": "查看所有活动"` use simplified `活动`/`显示` (Traditional: `活動`/`顯示`).
  - Line 400: `"title": "分析概览"` uses simplified `概览` (Traditional: `概覽`).
  - Lines 721-737: the entire `Reports.level.description` CEFR block (A0 through C2) is fully Simplified Chinese — e.g. line 721 `"您可以识别您以前见过的单词和名称…"` (simplified `识别/见过/单词`), line 737 `"您可以阅读和理解几乎任何事情…"` (simplified `阅读/几乎`).
  - Line 787: `"selectPeriod": "选择时间段"` (simplified `选择/时间段`).
  - Lines 1076-1100: large portion of `SentencesPage.sentencesCard` is Simplified Chinese — line 1076 `"current": "当前"`, line 1079 `"studySessionProgress": "学习会话进度"`, line 1085 `"translation": "翻译"`, line 1094 `"studySessionComplete": "学习会话完成！"`, line 1098 `"greatWork": "做得很好！你已经成功完成了这个学习会话…"` (simplified `当前/学习会话/翻译/进度/已经/这个`).
  - Lines 1455-1456: `"license": "许可证"`, `"licenseDescription": "输入新的许可证用户"` (simplified `许可证/输入`).
  - Lines 1506-1510: `"addsAdmins": "添加管理员"`, `"addsAdminsDescription": "搜索用户并添加为学校管理员。"`, `"searchUsers": "搜索用户"`, `"searchUsersPlaceholder": "输入名称或电子邮件..."` (simplified `添加/管理员/搜索/用户/输入`).
- Impact: Taiwanese (`tw`) users see mixed Traditional/Simplified text. For a primary-student audience (8-12 year olds learning to read), inconsistent character forms are confusing and visually jarring, and the CEFR self-assessment descriptions — which students/teachers rely on to understand reading levels — are entirely in the wrong script. This indicates the `tw` catalog was partially copied/translated from the `cn` (Simplified) catalog without conversion.
- Recommendation: In a separate remediation track, convert the listed ranges to Traditional Chinese (e.g. via an OpenCC `s2twp` pass over the offending keys) and add a lint/CI check that flags Simplified-only codepoints in `tw.json`. No source edit performed in this review track.

### LR-primary-advantage-084-002 — LocaleSwitcher `cn` option mislabeled as "台灣" (Taiwan)

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/messages/tw.json:4`
- Evidence: `"locale": "{locale, select, th {🇹🇭 ไทย} en {🇺🇸 English} tw {🇹🇼 中文} cn {🇨🇳 台灣} vi {🇻🇳 Tiếng Việt} other {Unknown}}"`. The `cn` branch (Simplified Chinese / mainland) is labeled `🇨🇳 台灣` ("Taiwan"), while the `tw` branch (Traditional/Taiwan) is labeled `🇹🇼 中文`. The `cn` label/flag pairing is semantically wrong (a PRC flag paired with the word "Taiwan"). The same `cn {🇨🇳 ... 台灣}` label appears identically across the sibling catalogs (`en.json`, `th.json`, `cn.json`, `vi.json`), confirming a copied/shared origin rather than a tw-only typo.
- Impact: The language selector presents a contradictory flag/label for the Simplified Chinese option in every locale; the `cn` entry should read something like `🇨🇳 简体中文` and `tw` should carry the `台灣`/`繁體中文` label. Beyond confusion, a PRC-flag-with-"Taiwan" label is a politically sensitive mislabel for a school-facing product.
- Recommendation: In a shared-i18n remediation track, correct the `cn`/`tw` label/flag pairings consistently across all primary-advantage message catalogs (and verify against the upstream Reading Advantage source, since the defect appears inherited). No source edit performed in this review track.

## No-Finding Notes

- `apps/primary-advantage/messages/tw.json`: reviewed line-by-line (1-2655). All other keys outside the two findings above are valid JSON, use consistent Traditional Chinese, and preserve ICU placeholder tokens (`{count}`, `{name}`, `{score}`, plural/select forms) matching their usage; no further findings.
