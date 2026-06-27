# Batch-07 Evidence: Locale Roots + Core Page Locales

> Track: `www_reading_advantage_review_20260626`
> Reviewed: 2026-06-27
> Files: 10 | Lines: 1,252 (actual; batch-manifest estimated 2,140)
> Note: batch-manifest.json says 12 files but file-inventory.tsv lists 10 — difference is by design (2 infra files moved to batch-10).

---

## Coverage

| File | Reviewed ranges | Status | Finding count |
|---|---|---|---:|
| src/locales/en.ts | 1-79 | reviewed | 0 |
| src/locales/th.ts | 1-79 | reviewed | 0 |
| src/locales/zh.ts | 1-79 | reviewed | 0 |
| src/locales/navigation.ts | 1-27 | reviewed | 2 |
| src/locales/client.ts | 1-5 | reviewed | 0 |
| src/locales/server.ts | 1-2 | reviewed | 0 |
| src/locales/pages/home.ts | 1-477 | reviewed | 3 |
| src/locales/pages/about.ts | 1-362 | reviewed | 1 |
| src/locales/pages/contact.ts | 1-122 | reviewed | 0 |
| src/locales/pages/blog.ts | 1-20 | reviewed | 0 |

---

## Findings

### LR-B07-001 — "Nine products" claim overstated; only 4 have app directories

- **Severity**: High
- **Category**: Claims
- **File**: `src/locales/pages/home.ts:6`, `home.ts:40`, `home.ts:200`, `home.ts:360`
- **Evidence**: Value `"One engine. Nine products."` and `"เครื่องยนต์เดียว เก้าผลิตภัณฑ์"` and `"一个引擎，九个产品"` repeated across all three locale sections. Verified against filesystem: only 4 product app directories exist (`apps/reading-advantage`, `apps/primary-advantage`, `apps/science-advantage`, `apps/codecamp-advantage`). Missing: math-advantage, stem-advantage, storytime-advantage, tutor-advantage, zhongwen-advantage.
- **Impact**: Potential customers may be misled about available products. Reduces trust when some products have no actual implementation.
- **Recommendation**: Either (1) build the missing 5 product apps, or (2) update locale strings to reference only existing products with a "Coming Soon" qualifier for future ones.

### LR-B07-002 — "Google Gemini & GPT-5 AI" claim unverifiable

- **Severity**: Medium
- **Category**: Claims
- **File**: `src/locales/pages/home.ts:143`, `home.ts:303`, `home.ts:461`
- **Evidence**: Lines read `technology: "Google Gemini & GPT-5 AI"` in all three locale sections. "GPT-5" branding — OpenAI has not branded a major release as "GPT-5" in any confirmed public documentation. This claim cannot be verified against the actual AI adapter (`packages/ai`), which abstracts provider selection.
- **Impact**: If inaccurate, constitutes product misrepresentation. GPT-5 naming may be aspirational or refer to an internal versioning that doesn't match public understanding.
- **Recommendation**: Verify with product owner what AI models are actually powering content generation. Use adapter-layer abstraction description (e.g., "AI-powered by leading language models") rather than specific model names.

### LR-B07-003 — About page technology claims: GCP and enterprise security

- **Severity**: Low
- **Category**: Claims
- **File**: `src/locales/pages/about.ts:40`, `about.ts:159`, `about.ts:280`
- **Evidence**: Lines describe "Cloud-based infrastructure on Google Cloud Platform" and "Enterprise-grade security and privacy" in all three locales. These are standard marketing claims that are likely true but not verifiable from the marketing site code alone.
- **Impact**: Low risk individually, but part of a pattern of hard-to-verify infrastructure claims.
- **Recommendation**: No immediate action needed. These are reasonable claims for a modern edtech platform.

### LR-B07-004 — navigation.ts `useCurrentLocale()` fragile pathname splitting

- **Severity**: Low
- **Category**: Code Quality
- **File**: `src/locales/navigation.ts:13`
- **Evidence**: `const locale = pathname.split("/")[1]` — derives locale by splitting the pathname on "/" and taking index 1. This works for `/[locale]/...` paths but would break if: (a) the root locale
- **Recommendation**: Use next-intl's locale detection hooks or a more robust mechanism for deriving the current locale.

### LR-B07-005 — navigation.ts `useChangeLocale()` no error handling

- **Severity**: Low
- **Category**: Code Quality
- **File**: `src/locales/navigation.ts:24-26`
- **Evidence**: `useChangeLocale` calls `router.replace(pathname, { locale })` with no guard for unrecognized locale values. If an invalid locale string is passed, the behavior is undefined.
- **Recommendation**: Validate the locale against `routing.locales` before calling `router.replace`.

---

## No-Finding Notes

- `src/locales/en.ts`: Pure aggregation module. All 33 imports resolve to valid locale file exports. Structure consistent across en/th/zh.
- `src/locales/th.ts`: Mirror of en.ts. All imports resolve. No structural deviations.
- `src/locales/zh.ts`: Mirror of en.ts. All imports resolve. No structural deviations.
- `src/locales/client.ts`: Thin re-export wrapper (5 lines). Correct usage of next-intl client hooks.
- `src/locales/server.ts`: Thin re-export wrapper (2 lines). Correct usage of next-intl server functions.
- `src/locales/pages/contact.ts`: All 3 locales present. Phone, email, location consistent. Social media handles consistent.
- `src/locales/pages/blog.ts`: Minimal locale (6/6/5 lines per locale). All 3 locales present with consistent keys. Reading time template uses interpolation correctly.

---

## Summary

| Severity | Count | Categories |
|----------|-------|------------|
| Critical | 0 | — |
| High | 1 | Claims (9 products overstated) |
| Medium | 1 | Claims (GPT-5 unverifiable) |
| Low | 3 | Claims (GCP standard), Code Quality (navigation locale) |
