# Line Review Protocol: www-reading-advantage

> Track: `www_reading_advantage_review_20260626`
> Generated: 2026-06-27

---

## Purpose

This protocol defines how each batch in the line review is executed. Line review means reading every source line of the files in a batch and recording findings.

---

## Scope

- **In scope**: All `.ts` and `.tsx` files in `src/` (130 files, 20,033 lines)
- **Out of scope**: Blog markdown posts, JSON segment files, public assets, config files (covered by other review phases)

---

## Preparation

1. Identify the batch from `batch-manifest.md`
2. Locate the files in `file-inventory.tsv`
3. Open each file for reading

---

## Review Checklist Per File

### 1. Hardcoded Strings
- [ ] Is there hardcoded UI text that should be using i18n?
- [ ] Are fallback strings provided?
- [ ] Are locale keys descriptive and consistent?

### 2. Claims Accuracy
- [ ] Does the file make claims about product capabilities?
- [ ] Can the claim be verified against actual app code?
- [ ] Is the claim dated or potentially stale?

### 3. SEO Metadata
- [ ] Does the file export `metadata` or `generateMetadata`?
- [ ] Are title and description meaningful and unique?
- [ ] Are Open Graph tags present? (`og:title`, `og:description`, `og:image`)
- [ ] Are hreflang/canonical tags present?

### 4. Accessibility
- [ ] Are images using next/image with alt text?
- [ ] Are interactive elements using semantic HTML?
- [ ] Are ARIA labels present where needed?
- [ ] Is heading hierarchy logical (h1 → h2 → h3)?

### 5. i18n
- [ ] Are all user-facing strings wrapped in locale function calls?
- [ ] Are locale keys referenced correctly?

### 6. Links & Navigation
- [ ] Do internal links use the locale-aware helper?
- [ ] Do external links open with `target="_blank"` and `rel="noopener noreferrer"`?

### 7. Code Quality
- [ ] Are there commented-out code blocks?
- [ ] Are there console.log statements?
- [ ] Are there TypeScript `any` types that could be stricter?
- [ ] Are imports clean and organized?

---

## Finding Recording

Each finding must be recorded in `findings.md` with:

```markdown
### F-NNN: Brief Title

**Severity**: [Critical/High/Medium/Low]
**Category**: [Claims/SEO/Accessibility/Performance/i18n/Conversion/Code Quality]
**Batch**: batch-NN
**File**: `path/to/file.tsx`
**Line(s)**: XX-YY

**Description**:
...

**Recommendation**:
...
```

---

## Batch Completion

A batch is complete when:

1. All files in the batch have been read
2. All findings are recorded in `findings.md`
3. Any evidence screenshots are saved to `evidence/batch-NN/`
4. The batch is marked `[x]` in `line-review-coverage.tsv`

---

## Evidence Storage

- Screenshots: `line-review/evidence/batch-NN/screenshot-001.png`
- Diffs: `line-review/evidence/batch-NN/diff-001.diff`
- Coverage patches: `line-review/coverage-patches/` (test patches to improve coverage)
