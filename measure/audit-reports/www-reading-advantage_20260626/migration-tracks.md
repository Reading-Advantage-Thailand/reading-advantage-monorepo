# Migration / Remediation Tracks: www-reading-advantage

> Track: `www_reading_advantage_review_20260626`
> Generated: 2026-06-27
> Updated: 2026-06-27 (line-review synthesis)
>
> **Review-only output.** These are *proposed* follow-up tracks derived from line-review findings. No remediation was performed in this review track. Each proposal references the LRF findings it would resolve (see `findings.md` / `line-review/line-review-findings.md`).

---

## Proposed Remediation Tracks

| # | Proposed Title | Category | Severity | Resolves | Dependencies |
|---|----------------|----------|----------|----------|--------------|
| T1 | Fix broken lead-capture forms (waitlist + contact) | Conversion | Critical | LRF-008, LRF-009 | Backend submission endpoint / adapter |
| T2 | Remove or implement empty layout components | Code Quality | Critical | LRF-010 | Import-usage audit |
| T3 | Add SEO metadata to all pages; fix client-render SEO | SEO/Architecture | Critical | LRF-005, LRF-006, LRF-007, LRF-036 | Decide server-shell split for RA page |
| T4 | Reconcile product launch datelines (single source of truth) | Claims | Critical/High | LRF-002, LRF-003, LRF-004 | PO confirmation of statuses |
| T5 | Correct "nine products" narrative across site | Claims | High | LRF-001, LRF-029, LRF-034 | PO decision on product set |
| T6 | Restore missing static assets (grid-pattern.svg, og-image.jpg) | Assets | High | LRF-011 | Design assets |
| T7 | Replace placeholder case-study content or hide page | Claims | High | LRF-012 | Real data from PO |
| T8 | i18n completeness pass (hardcoded strings, zh fallback, Thai typos) | i18n | High | LRF-021, LRF-022, LRF-023, LRF-024, LRF-016 | Native-speaker proofreading |
| T9 | Blog security hardening (HTML sanitization + Zod frontmatter) | Security | High | LRF-028 | — |
| T10 | Verify & correct AI-model and efficacy-stat claims | Claims | High/Medium | LRF-013, LRF-014, LRF-015 | PO + research citations |
| T11 | Accessibility remediation (graph ARIA, UI component a11y) | Accessibility | High/Medium | LRF-020, LRF-025 | — |
| T12 | Refresh stale comparison/pricing data & timestamps | Claims | High/Medium | LRF-017, LRF-018 | Competitive/pricing data |
| T13 | Add Services to primary navigation | Conversion | Medium | LRF-030 | — |
| T14 | Centralize contact details; unify support email | Code Quality | Medium | LRF-026 | — |
| T15 | Replace fragile locale keys / `as never` casts; typed accessors | Code Quality | Medium | LRF-027 | — |
| T16 | Test hygiene: unskip homepage test, dedupe Primary test, deepen product tests | Code Quality | Medium | LRF-043 | — |
| T17 | Legal copy review ("ZERO RISK" → measured language) | Legal | Medium | LRF-019 | Legal/PO |
| T18 | Minor cleanup (dead code, WIP comments, button hover, FAQ animation, HTML entity, asset naming, MarketingSvg) | Code Quality/Perf | Low | LRF-031, LRF-032, LRF-033, LRF-035, LRF-038, LRF-039, LRF-040, LRF-041, LRF-042, LRF-044, LRF-037 | — |

---

## Common Remediation Categories

- **Claims correction**: align product descriptions, launch dates, stats, and product count with reality.
- **i18n completion**: localize hardcoded strings, add zh variants, fix Thai typos.
- **SEO metadata**: add/repair metadata exports, OG image, hreflang, canonical, locale-aware titles.
- **Accessibility fixes**: ARIA labels, panel associations, accessible icon text.
- **Conversion**: functional forms with backend capture and analytics.
- **Security**: sanitize blog HTML; Zod validation.
- **Test coverage**: see `test-gaps.md`.

> Track IDs are illustrative (T1..T18); real Measure track IDs should be assigned when each remediation is scheduled.
