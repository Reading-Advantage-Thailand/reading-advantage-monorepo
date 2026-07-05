# Site-Closure Checklist — www T9 (Blog security hardening: HTML sanitize + Zod frontmatter)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 8
> **Source evidence:** `measure/audit-reports/www-reading-advantage_20260626/migration-tracks.md` T9
> **Resolves:** LRF-028 (blog HTML not sanitized; frontmatter not Zod-validated)
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts + baseline grep)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/www-reading-advantage/src/lib/blog.ts` (blog render path) | renders blog HTML without sanitization; no Zod frontmatter parse | sanitize HTML (strip script/event handlers); parse frontmatter with a Zod schema | 🔴 open |
| 2 | `apps/www-reading-advantage/src/types/blog.ts` (blog types) | no Zod frontmatter schema | add `BlogFrontmatterSchema` (Zod) | 🔴 open |
| 3 | `apps/www-reading-advantage/src/app/[locale]/(marketing)/blog/page.tsx` (blog page) | consumes unsanitized HTML / untyped frontmatter | consume sanitized HTML + parsed frontmatter; `dangerouslySetInnerHTML` only from `sanitize()` | 🔴 open |
| 4 | Blog content source (markdown/MDX files) | tbd | ensure frontmatter conforms to schema; reject malformed | 🔴 open |
| 5 | www-T9 sanitize guard (new) | absent | artifact guard: no `dangerouslySetInnerHTML` without `sanitize()` call site (defense A7: allow the single sanitized site) | 🔴 open |
| 6 | www-T9 sanitize live test (new) | absent | `<script>` / `<img onerror>` stripped; safe fragment survives (defense A4) | 🔴 open |
| 7 | www-T9 frontmatter live test (new) | absent | malformed frontmatter rejected by Zod parse | 🔴 open |

## Closeout requirement
Rows 1–4 🟢. Rows 5–7 🟢 — artifact guard + two live tests exist and pass. www depends only on
`@reading-advantage/config` (baseline) — no domain import needed; sanitization stays app-local in
`src/lib/blog.ts`. See `test-strategy.md` Phase 8.
