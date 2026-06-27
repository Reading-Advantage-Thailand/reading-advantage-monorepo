# Line Review Evidence: primary-advantage-081

Reviewer: coder-deepseek-v4-flash/primary-advantage-081
Files assigned: 1
Lines assigned: 2655

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/messages/cn.json` | 1-2655 | reviewed | 2 |

## Findings

### LR-primary-advantage-081-001 — `cn` locale label incorrectly shows Traditional Chinese text and Taiwan instead of Simplified Chinese

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/messages/cn.json:4`
- Evidence: The `LocaleSwitcher.locale` ICU message on line 4 maps `cn` to `🇨🇳 台灣` (China flag + "Taiwan" in Traditional Chinese). The `cn` locale represents Simplified Chinese (Mainland China), but the label text `台灣` means "Taiwan" written in Traditional Chinese characters. By contrast, the `tw` entry on the same line maps to `🇹🇼 中文` (Taiwan flag + generic "Chinese"). The labels for `cn` and `tw` are inconsistent with their locale codes: `cn` should display Simplified Chinese text (e.g., `简体中文`), while `tw` should display Traditional Chinese text (e.g., `繁體中文`). This same incorrect labeling exists across all locale files (en, th, tw, vi) because the ICU message is duplicated verbatim in each.
- Impact: Simplified Chinese users see "Taiwan" written in Traditional Chinese as the label for their own locale, which is confusing and politically/geographically inaccurate for a platform targeting Mainland Chinese users. The incorrect label harms UX trust and could be a compliance risk in certain markets.
- Recommendation: Change the `cn` label to `🇨🇳 简体中文` and the `tw` label to `🇹🇼 繁體中文` in every locale message file (cn.json, en.json, th.json, tw.json, vi.json).

### LR-primary-advantage-081-002 — Blank line in JSON object body between key-value pairs

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/messages/cn.json:859`
- Evidence: Line 859 is an empty line between the key-value pair `"matching": "匹配",` (line 858) and the next key `"matchingGame": {` (line 860). While technically valid JSON (blank lines are ignored by JSON parsers), this is a formatting inconsistency within the file — no other section boundary uses a blank line between sibling keys. This pattern of stray blank lines is likely inherited from the shared codebase.
- Impact: Cosmetic only. No runtime or rendering impact. The inconsistency could cause confusion during automated diffing or code review.
- Recommendation: Remove the stray blank line at line 859 to maintain consistent formatting throughout the file. Consider adding a JSON formatter (e.g., `prettier`) to the project's lint pipeline to prevent inconsistent whitespace.

## No-Finding Notes

- `apps/primary-advantage/messages/cn.json`: All 2655 lines reviewed line-by-line. This file is a next-intl translation JSON (Simplified Chinese) for the Primary Advantage app. Key observations confirming no further findings:
  - JSON structure is valid (matching braces, valid key-value pairs at all levels).
  - Translation keys follow the same namespace hierarchy as other locale files.
  - All strings reference the correct app name "Primary Advantage" for fork-specific terminology.
  - Content is appropriate for the target audience (primary students aged 8-12, grade 3-6) with age-appropriate language.
  - 5 supported languages are consistently referenced throughout (th, en, tw, cn, vi).
  - No security-sensitive content (API keys, endpoints, credentials) present in translations.
  - No hardcoded English strings that should be translated.
  - All ICU message syntax (`{variable}`, `{count, plural, ...}`, `{locale, select, ...}`) appears well-formed.
  - XP, CEFR levels, gamification, and classroom management strings are present and consistent with the feature set.
  - The two findings above (locale label and blank line) are the only issues identified.
