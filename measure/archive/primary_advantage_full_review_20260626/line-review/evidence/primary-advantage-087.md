# Line Review Evidence: primary-advantage-087

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-087
Files assigned: 1
Lines assigned: 11589

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/public/login-image.png` | 1-11589 | reviewed | 3 |

## Findings

### LR-087-001 — Oversized login background image (1.7 MB)

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/public/login-image.png`
- Evidence: PNG image data, 1024x1024, 8-bit/color RGB, non-interlaced. File size: 1,744,795 bytes (1.7 MB). Contains 26 IDAT chunks totaling ~1.7 MB of compressed pixel data plus a 14 KB `caBX` chunk (Adobe C2PA content-credentials metadata).
- Impact: A 1.7 MB image on the login page increases initial page load time, especially for primary students on low-bandwidth school networks. This is a public/asset shipped in the repo, not fetched from CDN. The commented-out original source (`storage.googleapis.com`) in `auth/layout.tsx:18` suggests this was copied from Reading Advantage without optimization.
- Recommendation: Compress or convert to WebP/AVIF. A 1024x1024 decorative background should be under 200 KB. Track as shared asset optimization work.

### LR-087-002 — Generic alt text "Image" on login background

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/app/[locale]/auth/layout.tsx:20`
- Evidence: The `<Image>` component uses `alt="Image"` — a non-descriptive alt attribute. The image is decorative (background behind auth form content) and should use `alt=""` or be marked `aria-hidden` for proper accessibility.
- Impact: Screen readers will announce "Image" without context, which is unhelpful for primary students using assistive technology. For a decorative background image, the correct pattern is empty alt text.
- Recommendation: Change `alt="Image"` to `alt=""` in `auth/layout.tsx:20`. This is a one-line fix.

### LR-087-003 — Manifest line count mismatch for binary file

- Severity: Low
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/public/login-image.png`
- Evidence: `file-inventory.tsv` and `batch-manifest.json` record `line_count=11589` for this PNG file. Actual `wc -l` yields 6012 newlines. The binary contains 1,744,795 bytes. The inventory count appears to be computed by a different method than `wc -l`, creating a coverage tracking discrepancy for binary assets.
- Impact: Coverage verification tools that cross-check `reviewed_ranges` against actual line counts will flag a mismatch. This does not affect the review itself but indicates the inventory tooling may handle binary files inconsistently.
- Recommendation: Normalize binary file line-counting in the inventory tooling. For binary assets, consider using byte count or marking as `type=binary` in the inventory.

## No-Finding Notes

- `apps/primary-advantage/public/login-image.png`: Valid PNG signature, well-formed chunk structure (IHDR, caBX, 26x IDAT, IEND). The `caBX` chunk contains Adobe C2PA content-credentials metadata (14 KB) — this is standard provenance data, not a security concern. No embedded scripts, executables, or suspicious payload. The image is a 1024x1024 RGB photograph used as a decorative login background in `app/[locale]/auth/layout.tsx:17-24`. No other references found in the codebase.
